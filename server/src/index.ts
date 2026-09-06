import "./env.js"; // must be first: loads .env before any module reads process.env at import time
import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { env } from "./env.js";
import { logger } from "./utils/logger.js";

const start = async (): Promise<void> => {
    // Awaited: the old code called this without awaiting, so the server accepted requests before
    // the database was reachable.
    await connectDB();

    const server = app.listen(env.PORT, () => {
        logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
    });

    const shutdown = (signal: string) => {
        logger.info({ signal }, "shutting down");
        server.close(() => {
            void mongoose.connection.close(false).then(() => process.exit(0));
        });
        // Don't hang forever on a stuck connection.
        setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "unhandledRejection"));
    process.on("uncaughtException", (err) => {
        logger.fatal({ err }, "uncaughtException");
        process.exit(1);
    });
};

start().catch((err) => {
    logger.fatal({ err }, "failed to start server");
    process.exit(1);
});
