import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { env } from "../env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { forbidden, unauthorized } from "../utils/AppError.js";

interface JwtPayload {
    userId: string;
    email: string;
    role: string;
    // The password generation this token was minted for: passwordChangedAt in milliseconds, or 0
    // for an account that has never changed one. Optional because tokens issued before this claim
    // existed do not carry it — and they should keep working, not log everyone out on deploy.
    pwd?: number;
}

// Extend Express Request so downstream handlers can read req.user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

const readBearerToken = (req: Request): string => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return "";
    return header.slice("Bearer ".length).trim();
};

const verify = (token: string): JwtPayload =>
    jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;

// Does this token still belong to the password the account currently has? Changing a password is
// the one thing a user does specifically because they believe a session is in the wrong hands, so
// the sessions that existed at that moment have to stop working — and a JWT cannot be withdrawn,
// only out-voted by a fact in the database. The check is free: `authenticate` already reads the row.
//
// An equality test on the stamp, not `iat < changedAt`. `iat` is floored to whole seconds, so a
// token minted in the same second as the change — which is exactly what changePassword hands back —
// is indistinguishable from one minted just before it, and any comparison that retires the second
// also retires the first. Matching generations has no window at all.
//
// A token with no `pwd` claim against an account with no timestamp is 0 === 0: sessions predating
// this feature stay valid, and nobody is signed out by the deploy that adds it.
const matchesCurrentPassword = (decoded: JwtPayload, changedAt?: Date | null): boolean =>
    (decoded.pwd ?? 0) === (changedAt ? changedAt.getTime() : 0);

// Verify JWT and ensure the account still exists and is not blocked.
export const authenticate = asyncHandler(async (req, _res, next) => {
    const token = readBearerToken(req);
    if (!token) throw unauthorized();

    let decoded: JwtPayload;
    try {
        decoded = verify(token);
    } catch {
        throw unauthorized("Invalid or expired token");
    }

    // Re-check from the DB on every request — the JWT alone cannot reflect a block applied after
    // the token was issued, and the role in the token is never trusted.
    const user = await User.findById(decoded.userId).select("isBlocked role passwordChangedAt");
    if (!user) throw unauthorized("User not found");
    // 401 on purpose, unlike the login form's 400: the client reads it as an expired session and
    // signs this browser out, which is exactly the intent — the password behind it no longer exists.
    if (!matchesCurrentPassword(decoded, user.passwordChangedAt)) {
        throw unauthorized("Your password was changed. Please sign in again.");
    }
    if (user.isBlocked) {
        throw forbidden(
            "Your account has been blocked by an administrator. Please contact support."
        );
    }

    req.user = { userId: decoded.userId, email: decoded.email, role: user.role };
    next();
});

// Same as authenticate, but anonymous requests proceed with req.user undefined. Used by public
// read routes that still want to personalise the response (e.g. likedByMe).
export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
    const token = readBearerToken(req);
    if (!token) return next();

    try {
        const decoded = verify(token);
        const user = await User.findById(decoded.userId).select("isBlocked role passwordChangedAt");
        if (user && !user.isBlocked && matchesCurrentPassword(decoded, user.passwordChangedAt)) {
            req.user = { userId: decoded.userId, email: decoded.email, role: user.role };
        }
    } catch {
        // A bad token on a public route is simply an anonymous request.
    }
    next();
});

// Restrict route to admin role only — must follow authenticate middleware.
export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") throw forbidden("Admin access required");
    next();
};
