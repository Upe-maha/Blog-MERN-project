import express from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import mongoose from "mongoose";
import type { RequestHandler } from "express";

import { env } from "./env.js";
import { logger } from "./utils/logger.js";
import { AppError } from "./utils/AppError.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { globalLimiter } from "./middleware/rateLimit.js";

import userRouter from "./routers/userRouter.js";
import blogRouter from "./routers/blogRouter.js";
import commentRouter from "./routers/commentRouter.js";
import likeRouter from "./routers/likeRouter.js";
import adminRouter from "./routers/adminRouter.js";

const app = express();

// Render/Railway put a proxy in front of us. Without this, express-rate-limit keys every request
// to the proxy's IP (one shared bucket for all users) and refuses to start.
app.set("trust proxy", 1);

// An explicit allow-list. `cors({ origin: undefined })` reflects ANY origin, which combined with
// credentials:true is the classic misconfiguration — so an unset CLIENT_URL must not silently
// become "allow everything". env.ts already guarantees CLIENT_URL is a valid URL.
const allowedOrigins = new Set(
    [env.CLIENT_URL, ...(env.CORS_ORIGINS?.split(",") ?? [])].map((o) => o.trim()).filter(Boolean)
);
const vercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;

const corsOptions: CorsOptions = {
    origin(origin, cb) {
        if (!origin) return cb(null, true); // curl, server-to-server, same-origin
        if (allowedOrigins.has(origin)) return cb(null, true);
        if (env.ALLOW_VERCEL_PREVIEWS && vercelPreview.test(origin)) return cb(null, true);
        cb(new AppError(403, "Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
};

// Full helmet defaults. The cross-origin resource policy used to be relaxed so the client on
// another origin could read /uploads from this one; images now come from Cloudinary, so the
// exception is gone with the static mount that needed it.
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use("/api", globalLimiter);

// The /uploads static mount is gone. Nothing is written to this filesystem any more — Render and
// Railway wipe it on every redeploy, which is what made a disk-backed upload a broken image waiting
// to happen. Rows still holding a "/uploads/..." path are converted by `npm run migrate:uploads`.

app.use("/api/users", userRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/comments", commentRouter);
app.use("/api/likes", likeRouter);
app.use("/api/admin", adminRouter);

// An honest health check: a static "OK" would let a deploy go green while Mongo is unreachable.
// Not a tuple: readyState is also 99 ("uninitialized"), which an array of 4 cannot index.
const READY_STATE: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
};
const healthHandler: RequestHandler = (_req, res) => {
    const state = mongoose.connection.readyState;
    res.status(state === 1 ? 200 : 503).json({
        status: state === 1 ? "ok" : "degraded",
        db: READY_STATE[state] ?? "unknown",
        uptime: process.uptime(),
    });
};
app.get("/api/health", healthHandler);

app.use(notFoundHandler);
app.use(errorHandler); // must be last

export default app;
