import pino from "pino";
import { env } from "../env.js";

export const logger = pino({
    level: env.LOG_LEVEL,
    redact: {
        paths: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
        censor: "[redacted]",
    },
    ...(env.NODE_ENV === "development"
        ? { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } } }
        : {}),
});
