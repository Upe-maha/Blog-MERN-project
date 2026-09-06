import rateLimit, { type Options } from "express-rate-limit";
import { env } from "../env.js";

// The body must keep the { message } shape — the client's getErrorMessage() reads it.
const shared: Partial<Options> = {
    standardHeaders: "draft-7",
    legacyHeaders: false,
};

export const globalLimiter = rateLimit({
    ...shared,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    message: { message: "Too many requests. Please slow down." },
});

// Brute-force protection for the credential endpoints. skipSuccessfulRequests means a legitimate
// user signing in repeatedly is never locked out — only failures count.
//
// Two instances, not one shared `authLimiter`: each rateLimit() call owns its own store, so
// mounting a single instance on both routes would put login and signup in the same bucket and let
// ten fumbled passwords block account creation from that IP too. Different abuse, different bucket.
const credentialLimiter = (max: number) =>
    rateLimit({
        ...shared,
        windowMs: 15 * 60_000,
        limit: max,
        skipSuccessfulRequests: true,
        message: { message: "Too many attempts. Try again in 15 minutes." },
    });

export const loginLimiter = credentialLimiter(10);

// Register writes an upload to disk before validation can reject it (multer has to parse the
// multipart body first), so this bucket is the main thing standing between an anonymous caller
// and a disk-fill. Phase 7's memoryStorage removes the disk hop entirely.
export const registerLimiter = credentialLimiter(10);

// Changing a password means proving you know the current one, so this route is a credential
// endpoint like the two above and gets its own bucket for the same reason they do — a stolen token
// used to guess the current password must not be able to spend the owner's login attempts, and a
// fumbled change must not lock them out of signing in.
export const passwordChangeLimiter = credentialLimiter(10);

export const writeLimiter = rateLimit({
    ...shared,
    windowMs: 60_000,
    limit: 30,
    message: { message: "You're doing that too often. Try again shortly." },
});
