import multer from "multer";
import type { Request } from "express";
import { AppError } from "../utils/AppError.js";

// memoryStorage, not diskStorage. Three things follow from that:
//
//  1. Nothing is ever written to a local filesystem, which is the entire point of Phase 7 — Render
//     and Railway wipe the disk on every redeploy.
//  2. persistUpload gets a Buffer, so it can verify what the file *actually is* rather than
//     trusting the client's Content-Type header.
//  3. There is no orphaned-file problem left to clean up: a rejected request drops the buffer when
//     the request ends. discardUpload survives only as a no-op for that reason.
//
// The destination folder used to be inferred from the field name here. It is now an explicit
// argument to persistUpload, so renaming a field can no longer silently file an image in the wrong
// place.
const storage = multer.memoryStorage();

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]);

// A cheap first pass on the client's claim, purely to reject the obvious before buffering 5 MB.
// It is NOT the real check — file.mimetype is whatever the browser said it was. persistUpload
// sniffs the buffer's magic bytes, and that is what actually decides.
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
        cb(null, true);
    } else {
        // An AppError (not a bare Error) so the central error handler renders a 400 JSON body
        // instead of Express's default HTML 500 page.
        cb(new AppError(400, "Invalid file type. Only JPEG, PNG, GIF and WebP are allowed."));
    }
};

// 5 MB for both. Blog covers used to allow 10 MB, which is more user-uploaded JPEG than is worth
// paying to transform and store.
const MAX_BYTES = 5 * 1024 * 1024;

export const uploadProfilePicture = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_BYTES, files: 1 },
}).single("profilePicture");

export const uploadBlogImage = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_BYTES, files: 1 },
}).single("blogImage");
