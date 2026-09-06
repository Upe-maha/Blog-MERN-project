import mongoose from "mongoose";
import { env } from "../env.js";
import Blog from "../models/blog.js";
import Comment from "../models/comment.js";
import Like from "../models/like.js";
import User from "../models/user.js";

// `mongoose.set("autoIndex", ...)` is off in production (see config/db.ts), because building an
// index on boot is a silent, unbounded write against a live collection — on a large one it can lock
// out reads, and every replica does it at once during a rolling deploy.
//
// So production index changes are a deliberate step: deploy, then run this.
//
// syncIndexes() also DROPS indexes that no longer appear in the schema, which is the point — an
// index nobody declared is one nobody maintains — but it means running this against a database
// carrying hand-made indexes will remove them.
const models = { User, Blog, Comment, Like };

await mongoose.connect(env.MONGODB_URI);

for (const [name, model] of Object.entries(models)) {
    const dropped = await model.syncIndexes();
    const current = await model.collection.indexes();
    console.log(`${name}:`);
    for (const ix of current) console.log(`  ${JSON.stringify(ix.key)}${ix.unique ? "  unique" : ""}`);
    if (dropped.length) console.log(`  dropped: ${dropped.join(", ")}`);
}

await mongoose.disconnect();
