import mongoose from "mongoose";
import { env } from "../env.js";
import Blog from "../models/blog.js";

// One-shot backfill for the `titleLower` column the suggest endpoint's prefix index is built on.
//
// The Mongoose hooks in models/blog.ts populate it on every write from here on, but they only fire
// on writes — a post that already existed when the field was added has no titleLower at all, and a
// document missing the indexed field simply never matches the prefix query. The symptom is a search
// box that suggests recent posts and silently ignores older ones, which is worse than one that
// suggests nothing, because it looks like it works.
//
// An aggregation-pipeline update so the lowercasing happens inside Mongo: pulling every title into
// Node to lowercase it and write it back would be a round trip per post for a pure string
// transform. Idempotent — running it twice writes the same values.
await mongoose.connect(env.MONGODB_URI);

const result = await Blog.collection.updateMany({}, [
    { $set: { titleLower: { $toLower: "$title" } } },
]);

console.log(`titleLower backfilled: ${result.modifiedCount} of ${result.matchedCount} posts`);
console.log("Run `npm run indexes` if the titleLower index is not yet built.");

await mongoose.disconnect();
