import type { ErrorRequestHandler, RequestHandler } from "express";
import { MulterError } from "multer";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { discardUpload } from "../config/imageStorage.js";
import { logger } from "../utils/logger.js";

export const notFoundHandler: RequestHandler = (req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
};

// Single place that turns a thrown error into a response. The `{ message }` key is a contract the
// client's getErrorMessage() depends on — `details` is additive, never a replacement.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    // multer writes the upload to disk before any handler runs, so every rejected multipart
    // request — including one rejected by validate() before the controller is even reached —
    // leaves a file behind. Cleaning up here means no route has to remember to. A controller that
    // already committed the file to a row calls keepUpload() to opt out.
    if (!req.uploadCommitted) void discardUpload(req.file);

    let status = 500;
    let message = "Internal server error";
    let details: unknown;

    if (err instanceof AppError) {
        status = err.statusCode;
        message = err.message;
        details = err.details;
    } else if (err instanceof ZodError) {
        status = 400;
        message = "Validation failed";
        details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    } else if (err instanceof MulterError) {
        status = 400;
        message =
            err.code === "LIMIT_FILE_SIZE" ? "File is too large" : `Upload failed (${err.code})`;
    } else if (err instanceof mongoose.Error.CastError) {
        status = 400;
        message = "Invalid identifier";
    } else if (err instanceof mongoose.Error.ValidationError) {
        status = 400;
        message = "Validation failed";
        details = Object.values(err.errors).map((e) => e.message);
    } else if ((err as { code?: number }).code === 11000) {
        status = 409;
        message = "That value is already in use";
    }

    if (status >= 500) {
        logger.error({ err, method: req.method, url: req.originalUrl }, "unhandled error");
    } else {
        logger.warn({ msg: message, method: req.method, url: req.originalUrl }, "request failed");
    }

    res.status(status).json({ message, ...(details !== undefined ? { details } : {}) });
};
