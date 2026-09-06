import express from "express";
import {
    registerUser,
    getBootstrapStatus,
    loginUser,
    getMe,
    getMyStats,
    updateMe,
    changePassword,
    deleteMe,
    getPublicUserById,
} from "../controllers/user.controller.js";
import { uploadProfilePicture } from "../config/multer.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { loginLimiter, passwordChangeLimiter, registerLimiter } from "../middleware/rateLimit.js";
import { validate } from "../middleware/validate.js";
import {
    changePasswordSchema,
    loginSchema,
    objectIdParam,
    registerSchema,
    updateMeSchema,
} from "../schemas/user.schema.js";

const userRouter = express.Router();

// Register is the one route that cannot have auth in front of it, so the rate limiter carries
// the load.
// uploadProfilePicture must still precede validate: with multipart/form-data req.body is empty
// until multer has parsed it. That means an invalid signup writes a file before being rejected —
// the error middleware discards it, and Phase 7's memoryStorage removes the disk hop entirely.
// First-run setup: is there an administrator yet? Behind the register limiter so it cannot be
// polled, and it answers a single boolean.
userRouter.get("/bootstrap-status", registerLimiter, getBootstrapStatus);

userRouter.post("/", registerLimiter, uploadProfilePicture, validate({ body: registerSchema }), registerUser);
userRouter.post("/login", loginLimiter, validate({ body: loginSchema }), loginUser);

// Identity comes from the verified token, never from the URL — which is why there is no :id form
// of these three.
userRouter.get("/me", authenticate, getMe);
userRouter.get("/me/stats", authenticate, getMyStats);
userRouter.patch(
    "/me",
    authenticate,
    uploadProfilePicture,
    validate({ body: updateMeSchema }),
    updateMe
);
// authenticate *before* the limiter, deliberately. The bucket is keyed by IP and only counts
// failures, so letting unauthenticated requests reach it would let a stranger fill the bucket and
// lock the actual account holder out of changing their password from that network.
userRouter.patch(
    "/me/password",
    authenticate,
    passwordChangeLimiter,
    validate({ body: changePasswordSchema }),
    changePassword
);
userRouter.delete("/me", authenticate, deleteMe);

// Must stay last: "/me" would otherwise be swallowed by "/:id".
userRouter.get("/:id", validate({ params: objectIdParam }), getPublicUserById);

// DELETED in Phase 1:
//   GET    /check-admin  → admin now comes from `npm run seed:admin`, not self-service signup
//   GET    /             → dumped every user incl. emails, unauthenticated and unpaginated
//   PUT    /:id          → no auth, no ownership check: anyone could edit anyone
//   DELETE /:id          → same, and it orphaned every blog, comment and like the user owned

export default userRouter;
