import type { RequestHandler } from "express";
import type { ZodType } from "zod";

declare global {
    namespace Express {
        // Non-optional on purpose: every route that reads req.valid runs validate() first, and
        // declaring it optional would force a `!` at every read site. The middleware assigns it
        // unconditionally below, so the only way to observe it undefined is to read it on a route
        // that never validated — which is a routing bug, not a type-safety one.
        interface Request {
            valid: { body?: unknown; params?: unknown; query?: unknown };
        }
    }
}

// Parsed output goes to req.valid, never back onto req.*. In Express 5 `req.query` is a lazy
// getter with no setter, so assigning to it throws — which is also why express-mongo-sanitize
// cannot be used here. Zod parsing is the defense against operator injection instead: a schema
// that expects a string rejects `{ $ne: null }` outright.
export const validate =
    (schemas: { body?: ZodType; params?: ZodType; query?: ZodType }): RequestHandler =>
    (req, _res, next) => {
        try {
            const valid: Express.Request["valid"] = {};
            if (schemas.params) valid.params = schemas.params.parse(req.params);
            if (schemas.query) valid.query = schemas.query.parse(req.query);
            if (schemas.body) valid.body = schemas.body.parse(req.body);

            // MERGED, never replaced. A route may call validate() more than once — the blog PUT
            // validates :id, proves ownership, then validates the multipart body after multer has
            // parsed it. Assigning a fresh object on the second call would drop the params the
            // controller then reads, which fails at runtime as a 500 rather than at compile time.
            req.valid = { ...req.valid, ...valid };
            next();
        } catch (err) {
            // The central error handler renders ZodError as a 400 with { message, details }.
            next(err);
        }
    };
