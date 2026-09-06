// Errors thrown anywhere in a handler land in error.middleware.ts, which reads statusCode/details.
export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly details?: unknown
    ) {
        super(message);
        this.name = "AppError";
        Error.captureStackTrace?.(this, AppError);
    }
}

export const badRequest = (message: string, details?: unknown) =>
    new AppError(400, message, details);
export const unauthorized = (message = "Authentication required") => new AppError(401, message);
export const forbidden = (message = "You don't have permission to do that") =>
    new AppError(403, message);
export const notFound = (message = "Not found") => new AppError(404, message);
export const conflict = (message: string) => new AppError(409, message);

// 503, not 500: the request was fine and the caller can retry — it is an upstream this server
// depends on that is refusing or unreachable. Rendering that as "Internal server error" tells a
// user nothing and tells whoever is on call even less.
export const serviceUnavailable = (message: string) => new AppError(503, message);
