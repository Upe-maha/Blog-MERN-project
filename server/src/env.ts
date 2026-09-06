import dotenv from "dotenv";
import { z } from "zod";

// Loaded via a side-effect-free module that every entrypoint imports FIRST, so the file is read
// before any other module evaluates process.env at import time (e.g. the CORS origin in app.ts).
dotenv.config({ quiet: true });

// Env vars arrive as strings. `z.coerce.boolean()` is NOT usable here: it is Boolean(value), and
// Boolean("false") === true, so a var explicitly set to "false" would parse as true.
const boolFromEnv = (fallback: "true" | "false") =>
    z.enum(["true", "false"]).default(fallback).transform((v) => v === "true");

const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),

    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    JWT_EXPIRES_IN: z.string().default("7d"),

    CLIENT_URL: z.url("CLIENT_URL must be a full URL, e.g. http://localhost:3000"),
    CORS_ORIGINS: z.string().optional(), // comma-separated extras
    ALLOW_VERCEL_PREVIEWS: boolFromEnv("false"),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

    // Multi-document transactions need a replica set (Atlas has one; a standalone local mongod
    // does not). Off by default so `npm run dev` works against a plain mongod; turn it on in
    // production, where the cascade delete in user.service.ts should be atomic.
    ENABLE_TRANSACTIONS: boolFromEnv("false"),

    // Required, with no fallback: uploads must never land on a local disk again. Render and
    // Railway both wipe the filesystem on every redeploy, so a disk-backed upload is a file that
    // 404s the next time you deploy.
    CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
    CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
    CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),
    CLOUDINARY_FOLDER: z.string().default("blog-mern"),

    // Only read by scripts/seedAdmin.ts, which fails loudly if they are unset — the server itself
    // must start without them.
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_USERNAME: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
        console.error(`  ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
