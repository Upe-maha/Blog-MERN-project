import mongoose from "mongoose";
import { env } from "../env.js";
import { logger } from "../utils/logger.js";

const connectDB = async (): Promise<void> => {
    // Indexes are built deliberately in production via `npm run indexes`, not on every boot.
    mongoose.set("autoIndex", env.NODE_ENV !== "production");
    await mongoose.connect(env.MONGODB_URI);
    logger.info("MongoDB connected");
};

export default connectDB;
