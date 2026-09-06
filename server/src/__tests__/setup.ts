import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose";

// One connection per test file, and a clean database between tests. Dropping collections rather
// than the database keeps the indexes that syncIndexes/autoIndex built on first connect.
beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
});

afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
    await mongoose.disconnect();
});
