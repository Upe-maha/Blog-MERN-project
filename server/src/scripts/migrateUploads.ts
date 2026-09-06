import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { env } from "../env.js";
import Blog from "../models/blog.js";
import User from "../models/user.js";
import { cloudinary } from "../config/cloudinary.js";

// One-shot bridge from disk-backed uploads to Cloudinary.
//
// MUST BE RUN LOCALLY, while server/uploads/ still holds the files — the whole point of Phase 7 is
// that the deployed filesystem does not have them.
//
// Idempotent: it only touches rows whose image field still starts with "/uploads/", so re-running
// it after a partial failure resumes rather than duplicating. A row whose file is missing from disk
// is reported and left alone, so the run can be repeated once the file is restored.

const uploadsRoot = path.resolve(process.cwd(), "uploads");

type Result = "migrated" | "missing" | "failed";

async function upload(url: string, folder: "blogs" | "profiles"): Promise<{ url: string; publicId: string } | Result> {
    // Containment check: the value comes from the database, and path.join would happily walk out of
    // uploads/ given a crafted "../.." — the same guard the old removeStored carried.
    const target = path.resolve(process.cwd(), "." + url);
    if (!target.startsWith(uploadsRoot + path.sep)) return "failed";

    let buffer: Buffer;
    try {
        buffer = await fs.readFile(target);
    } catch {
        return "missing";
    }

    try {
        const result = await cloudinary.uploader.upload(
            `data:application/octet-stream;base64,${buffer.toString("base64")}`,
            {
                folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
                resource_type: "image",
                transformation: [
                    { quality: "auto", fetch_format: "auto" },
                    folder === "profiles"
                        ? { width: 512, height: 512, crop: "fill", gravity: "face" }
                        : { width: 1600, crop: "limit" },
                ],
            }
        );
        return { url: result.secure_url, publicId: result.public_id };
    } catch (err) {
        console.error(`  upload failed for ${url}:`, (err as Error).message);
        return "failed";
    }
}

async function run() {
    await mongoose.connect(env.MONGODB_URI);

    const tally = { migrated: 0, missing: 0, failed: 0 };

    const blogs = await Blog.find({ imageUrl: { $regex: "^/uploads/" } }).select("_id imageUrl");
    console.log(`blogs with local images: ${blogs.length}`);
    for (const blog of blogs) {
        const out = await upload(blog.imageUrl!, "blogs");
        if (typeof out === "string") {
            tally[out]++;
            console.warn(`  ${out}: blog ${String(blog._id)} -> ${blog.imageUrl}`);
            continue;
        }
        await Blog.updateOne({ _id: blog._id }, { imageUrl: out.url, imagePublicId: out.publicId });
        tally.migrated++;
        console.log(`  blog ${String(blog._id)} -> ${out.publicId}`);
    }

    const users = await User.find({ profilePicture: { $regex: "^/uploads/" } }).select(
        "_id profilePicture"
    );
    console.log(`users with local avatars: ${users.length}`);
    for (const user of users) {
        const out = await upload(user.profilePicture, "profiles");
        if (typeof out === "string") {
            tally[out]++;
            console.warn(`  ${out}: user ${String(user._id)} -> ${user.profilePicture}`);
            continue;
        }
        await User.updateOne(
            { _id: user._id },
            { profilePicture: out.url, profilePicturePublicId: out.publicId }
        );
        tally.migrated++;
        console.log(`  user ${String(user._id)} -> ${out.publicId}`);
    }

    console.log(`\nmigrated ${tally.migrated}, missing ${tally.missing}, failed ${tally.failed}`);
    if (tally.missing || tally.failed) {
        console.log("Re-run after fixing those; rows already migrated are skipped.");
    } else {
        console.log("Clean. Safe to remove server/uploads/.");
    }

    await mongoose.disconnect();
}

await run();
