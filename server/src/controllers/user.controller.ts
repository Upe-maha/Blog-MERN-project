import User from "../models/user.js";
import Blog from "../models/blog.js";
import Comment from "../models/comment.js";
import Like from "../models/like.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../utils/AppError.js";
import { persistUpload, removeStored, keepUpload } from "../config/imageStorage.js";
import { deleteUserAndContent, isLastAdmin } from "../services/user.service.js";
import { logger } from "../utils/logger.js";
import type {
    ChangePasswordInput,
    LoginInput,
    ObjectIdParam,
    RegisterInput,
    UpdateMeInput,
} from "../schemas/user.schema.js";

// The shape returned for the account's *own* user. Never used for another user's profile — see
// getPublicUserById, which must not leak email/role/isBlocked to anonymous callers.
const privateUser = (user: {
    _id: unknown;
    username: string;
    email: string;
    profilePicture: string;
    role: string;
    isBlocked: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}) => ({
    _id: user._id,
    username: user.username,
    email: user.email,
    profilePicture: user.profilePicture,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

// `pwd` stamps the token with the password generation it belongs to, which is what lets
// authenticate retire every session that existed before a password change. Zero for an account that
// has never changed one — see the middleware for why this is an equality test and not a comparison.
const signToken = (user: {
    _id: unknown;
    email: string;
    role: string;
    passwordChangedAt?: Date | null;
}) =>
    jwt.sign(
        {
            userId: user._id,
            email: user.email,
            role: user.role,
            pwd: user.passwordChangedAt ? user.passwordChangedAt.getTime() : 0,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
    );

// POST /api/users
// GET /api/users/bootstrap-status
//
// Whether the application still has no administrator. The register form uses it to decide whether
// to offer first-run setup. It exposes one boolean and nothing else — not who, not how many.
export const getBootstrapStatus = asyncHandler(async (_req, res) => {
    const adminExists = !!(await User.exists({ role: "admin" }));
    // Never cached: the answer flips exactly once, and a cached "false" would keep offering setup
    // after somebody had already claimed it.
    res.set("Cache-Control", "private, no-store");
    res.status(200).json({ adminExists });
});

// POST /api/users
export const registerUser = asyncHandler(async (req, res) => {
    // Still no `role` key in the schema. `claimAdmin` is a *request* to become the first admin;
    // whether that is granted is decided here, not by the caller.
    const { username, email, password, claimAdmin } = req.valid.body as RegisterInput;

    if (await User.exists({ email })) throw conflict("An account with that email already exists");

    const stored = req.file ? await persistUpload(req.file, "profiles") : null;

    // Cheap pre-check: closes the ordinary case, including an admin created by `npm run seed:admin`,
    // which leaves bootstrapAdmin unset and so is invisible to the unique index below.
    const wantsAdmin = claimAdmin === true && !(await User.exists({ role: "admin" }));

    let newUser;
    try {
        newUser = await User.create({
            username,
            email,
            password: await hashPassword(password),
            profilePicture: stored?.url ?? "",
            profilePicturePublicId: stored?.publicId,
            // The unique sparse index on bootstrapAdmin is the actual guarantee. The check above
            // has a window; this does not — two simultaneous claims both insert, and Mongo rejects
            // the loser with E11000.
            ...(wantsAdmin ? { role: "admin", bootstrapAdmin: 1 } : {}),
        });
    } catch (err) {
        const duplicate = (err as { code?: number }).code === 11000;
        const onBootstrap = JSON.stringify((err as { keyPattern?: unknown }).keyPattern ?? {}).includes(
            "bootstrapAdmin"
        );
        if (!duplicate || !onBootstrap) throw err;

        // Someone claimed it microseconds earlier. Their account is not affected; this one is
        // simply created as an ordinary user rather than failing the signup outright.
        logger.warn({ email }, "bootstrap admin already claimed; registering as a normal user");
        newUser = await User.create({
            username,
            email,
            password: await hashPassword(password),
            profilePicture: stored?.url ?? "",
            profilePicturePublicId: stored?.publicId,
        });
    }
    keepUpload(req);

    if (newUser.role === "admin") {
        logger.info({ userId: String(newUser._id), email }, "first administrator claimed via setup");
    }

    res.status(201).json({
        message:
            newUser.role === "admin"
                ? "Administrator account created"
                : "User registered successfully",
        user: privateUser(newUser),
    });
});

// POST /api/users/login
export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.valid.body as LoginInput;

    // +password because the schema marks it select:false, so it is excluded by default. lean() is
    // safe here: nothing calls a document method on the result.
    // passwordChangedAt is selected for signToken, not for the response — privateUser copies named
    // keys, so nothing extra reaches the client.
    const user = await User.findOne({ email })
        .select(`${PRIVATE_USER_FIELDS} passwordChangedAt +password`)
        .lean();

    // One message for "no such account" and "wrong password" alike: distinguishing them turns the
    // login form into an account-enumeration oracle.
    //
    // 400 rather than the semantically-nicer 401: the client's response interceptor treats *every*
    // 401 as an expired session and fires auth:unauthorized, which logs the user out and toasts
    // "your session has expired" — nonsense on a login form that was never authenticated.
    const invalid = badRequest("Invalid email or password");
    if (!user) throw invalid;
    if (!(await comparePassword(password, user.password))) throw invalid;

    // After the password check, so a blocked account cannot be identified without its credentials.
    if (user.isBlocked) {
        throw forbidden(
            "Your account has been blocked by an administrator. Please contact support."
        );
    }

    res.status(200).json({
        message: "Login successful",
        user: privateUser(user),
        token: signToken(user),
    });
});

const PRIVATE_USER_FIELDS = "username email profilePicture role isBlocked createdAt updatedAt";

// GET /api/users/me
export const getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.userId).select(PRIVATE_USER_FIELDS).lean();
    if (!user) throw unauthorized("User not found");

    res.status(200).json({ user: privateUser(user) });
});

// PATCH /api/users/me
export const updateMe = asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { username, email } = req.valid.body as UpdateMeInput;

    const user = await User.findById(userId)
        .select("profilePicture profilePicturePublicId")
        .lean();
    if (!user) throw unauthorized("User not found");

    // Checked before the write so a duplicate surfaces as a clear 409 rather than a raw E11000.
    if (email && (await User.exists({ email, _id: { $ne: userId } }))) {
        throw conflict("An account with that email already exists");
    }

    const previousImage = { url: user.profilePicture, publicId: user.profilePicturePublicId };
    const stored = req.file ? await persistUpload(req.file, "profiles") : null;

    const updateData: Record<string, unknown> = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (stored) {
        updateData.profilePicture = stored.url;
        updateData.profilePicturePublicId = stored.publicId;
    }

    // Here rather than in the schema, because only this point can see both the body and the file.
    if (Object.keys(updateData).length === 0) throw badRequest("Nothing to update");

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        returnDocument: "after",
        runValidators: true,
    })
        .select(PRIVATE_USER_FIELDS)
        .lean();
    if (!updatedUser) throw unauthorized("User not found");
    keepUpload(req);

    // Only after the write succeeded, so a failed update never destroys the current avatar.
    if (stored) await removeStored(previousImage);

    res.status(200).json({
        message: "Profile updated successfully",
        user: privateUser(updatedUser),
    });
});

// PATCH /api/users/me/password
export const changePassword = asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.valid.body as ChangePasswordInput;

    // +password because the schema marks it select:false. The rest of the default projection comes
    // along with it, which is what signToken below needs.
    const user = await User.findById(userId).select("+password").lean();
    if (!user) throw unauthorized("User not found");

    // 400, not 401, for the same reason the login form answers 400: the client treats every 401 as
    // an expired session and signs the browser out — here that would throw away a half-filled form
    // because one field was mistyped. The current password is being *proved*, not *presented*.
    if (!(await comparePassword(currentPassword, user.password))) {
        throw badRequest("Your current password is incorrect");
    }

    const passwordChangedAt = new Date();

    await User.updateOne(
        { _id: userId },
        { password: await hashPassword(newPassword), passwordChangedAt }
    );

    logger.info({ userId }, "password changed");

    // Every token issued before now is dead, including the one that authorised this request, so a
    // replacement has to come back with the response or the caller logs themselves out by changing
    // their own password. Other browsers signed in as this account are signed out — the point of
    // the exercise, since "change my password" usually means "somebody else may be in here".
    res.status(200).json({
        message: "Password changed successfully",
        // Signed against the *new* stamp, so it is the one token that survives the change.
        token: signToken({ ...user, passwordChangedAt }),
    });
});

// GET /api/users/me/stats
//
// Deliberately three index-backed counts rather than one $facet: $facet runs on a single
// collection, and blogs, comments and likes are three. A $lookup pulling every like document into
// memory to size the array would be the expensive way to write this.
//
// The profile header previously derived its "Blogs" number from `userBlogs.length` — the length of
// one fetched page — so it silently capped at the page size and was wrong for anyone prolific.
export const getMyStats = asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Two steps rather than a join: every like on my posts means every like whose blog is one of
    // mine, and the { blog, user } index answers that $in directly.
    const blogIds = await Blog.find({ author: userId }).select("_id").lean();
    const ids = blogIds.map((b) => b._id);

    const [comments, likesReceived] = await Promise.all([
        Comment.countDocuments({ user: userId }),
        ids.length ? Like.countDocuments({ blog: { $in: ids } }) : Promise.resolve(0),
    ]);

    res.set("Cache-Control", "private, no-store");
    res.status(200).json({ blogs: ids.length, comments, likesReceived });
});

// DELETE /api/users/me
export const deleteMe = asyncHandler(async (req, res) => {
    // The admin dashboard has no other way back: once the final admin removes their own account,
    // nobody can reach /admin again without running the seed script on the server.
    if (await isLastAdmin(req.user!.userId)) {
        throw badRequest(
            "You are the only admin. Promote someone else before deleting your account."
        );
    }

    const deleted = await deleteUserAndContent(req.user!.userId);
    if (!deleted) throw unauthorized("User not found");

    res.status(200).json({ message: "Your account and all its content have been deleted" });
});

// GET /api/users/:id — public profile. The old getUserById used .select("-password"), which still
// handed email, role and isBlocked to anonymous callers; this is an allow-list instead.
export const getPublicUserById = asyncHandler(async (req, res) => {
    const { id } = req.valid.params as ObjectIdParam;

    const user = await User.findById(id).select("username profilePicture createdAt").lean();
    if (!user) throw notFound("User not found");

    res.status(200).json({ user });
});
