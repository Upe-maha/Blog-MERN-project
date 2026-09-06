import type { Request, Response, NextFunction, RequestHandler } from "express";

// Express 5 already forwards rejected promises to the error middleware; this exists so every
// handler has one consistent signature and no handler needs its own try/catch.
export const asyncHandler =
    (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
    (req, res, next) => {
        void Promise.resolve(fn(req, res, next)).catch(next);
    };
