import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { env } from "../env.js";

// Multi-document transactions require a replica set. Atlas is one; a plain local `mongod` is not,
// and starting a session against a standalone fails with "Transaction numbers are only allowed on
// a replica set member or mongos". Rather than crash in development, transactions are opt-in:
// ENABLE_TRANSACTIONS=true wherever the deployment supports them (do enable it in production).
//
// Without a session the callback still runs — the writes are simply not atomic, which is the same
// guarantee the code had before.
export async function withTransaction<T>(
    fn: (session?: ClientSession) => Promise<T>
): Promise<T> {
    if (!env.ENABLE_TRANSACTIONS) return fn(undefined);

    const session = await mongoose.startSession();
    try {
        let result: T;
        // withTransaction may retry the callback on a transient error, so nothing inside it may
        // have side effects outside the session (file deletes, HTTP responses).
        await session.withTransaction(async () => {
            result = await fn(session);
        });
        return result!;
    } finally {
        await session.endSession();
    }
}
