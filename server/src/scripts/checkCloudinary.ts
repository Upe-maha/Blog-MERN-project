import { cloudinary } from "../config/cloudinary.js";
import { env } from "../env.js";

// Answers one question: can this API key actually upload?
//
// It exists because the failure mode is genuinely misleading — a scoped, read-only Cloudinary key
// authenticates perfectly (api.ping() returns {"status":"ok"}) and then rejects every upload with a
// 403. Without a check like this you only find out when a user tries to publish a cover image.

const line = (label: string, value: string) => console.log(`  ${label.padEnd(14)} ${value}`);
const mask = (s: string) => (s.length <= 6 ? "***" : `${s.slice(0, 4)}…${s.slice(-2)}`);

console.log("\nCloudinary preflight\n");
line("cloud name", env.CLOUDINARY_CLOUD_NAME);
line("api key", mask(env.CLOUDINARY_API_KEY));
line("api secret", mask(env.CLOUDINARY_API_SECRET));
line("folder", env.CLOUDINARY_FOLDER);
console.log();

let failed = false;

// 1. Credentials. A wrong cloud name or key/secret pair fails here.
try {
    const ping = await cloudinary.api.ping();
    console.log(`  [ok]   credentials accepted (${ping.status})`);
} catch (err) {
    const e = err as { message?: string; http_code?: number };
    console.log(`  [FAIL] credentials rejected — ${e.message ?? err}`);
    console.log("\n  Fix: check CLOUDINARY_CLOUD_NAME, _API_KEY and _API_SECRET in server/.env.");
    console.log("  They are on the Cloudinary dashboard home, under API Keys.\n");
    process.exit(1);
}

// 2. Write permission. This is the one that catches a read-only key.
let publicId: string | undefined;
try {
    const res = await cloudinary.uploader.upload(
        // A 1x1 transparent GIF, as a data URI — nothing is left behind.
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        { folder: `${env.CLOUDINARY_FOLDER}/_preflight` }
    );
    publicId = res.public_id;
    console.log(`  [ok]   upload permitted   (${publicId})`);
} catch (err) {
    const e = err as { message?: string; http_code?: number };
    failed = true;
    console.log(`  [FAIL] upload refused — HTTP ${e.http_code ?? "?"}: ${e.message ?? err}`);
}

// 3. Delete permission — needed so removing a post also removes its image.
if (publicId) {
    try {
        const res = await cloudinary.uploader.destroy(publicId);
        console.log(`  [ok]   delete permitted   (${res.result})`);
    } catch (err) {
        failed = true;
        console.log(`  [FAIL] delete refused — ${(err as { message?: string }).message ?? err}`);
        console.log(`         Left behind: ${publicId} (remove it from the Media Library.)`);
    }
}

if (failed) {
    console.log(`
  This key can read but not write.

  Cloudinary's newer console can issue API keys scoped to specific permissions, and a read-only
  one behaves exactly like this: it authenticates, then 403s every upload.

  To fix it, in the Cloudinary console:
    1. Open Settings (the gear icon) -> API Keys.
    2. Either copy the default/master key pair, which has full permissions,
       or edit this key and grant it write access to the product environment.
    3. Put the key and secret in server/.env as CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.
    4. Re-run:  npm run check:cloudinary
`);
    process.exit(1);
}

console.log("\n  All good — uploads and deletes will work.\n");
