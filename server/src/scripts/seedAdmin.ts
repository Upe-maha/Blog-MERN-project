import "../env.js"; // must be first: loads .env before anything reads process.env
import mongoose from "mongoose";
import { env } from "../env.js";
import connectDB from "../config/db.js";
import User from "../models/user.js";
import { hashPassword } from "../utils/hashPassword.js";
import { registerSchema } from "../schemas/user.schema.js";
import { logger } from "../utils/logger.js";

// Replaces the self-service admin checkbox on the register page, where the first POST carrying
// role=admin won — and two concurrent ones both won.
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run seed:admin
//
// Idempotent: re-running promotes the account and leaves its existing password alone. Only the
// insert path sets a password, so this can never be used to reset one.
const seed = async (): Promise<void> => {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME } = env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must both be set to seed an admin");
    }

    // Same rules the signup route enforces, so a seeded admin can never be weaker than a user.
    const { email, password, username } = registerSchema.parse({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        username: ADMIN_USERNAME || ADMIN_EMAIL.split("@")[0],
    });

    await connectDB();

    const existing = await User.findOne({ email }).select("_id role");

    const admin = await User.findOneAndUpdate(
        { email },
        {
            // $set on every run: the whole point is to guarantee this account is an admin.
            $set: { role: "admin", isBlocked: false },
            // $setOnInsert so an existing account keeps its password and username.
            $setOnInsert: { username, password: await hashPassword(password) },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true }
    ).select("_id username email role");

    logger.info(
        { id: admin._id, email: admin.email, username: admin.username },
        existing ? "existing account promoted to admin" : "admin account created"
    );
};

seed()
    .then(() => mongoose.connection.close())
    .then(() => process.exit(0))
    .catch(async (err) => {
        logger.fatal({ err }, "failed to seed admin");
        await mongoose.connection.close().catch(() => {});
        process.exit(1);
    });
