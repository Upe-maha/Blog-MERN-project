# Phase 7 — Cloudinary migration

**Size:** M · **Coupling:** ship together (only because of `next.config` remotePatterns — the API
shape is unchanged)

**Goal:** get uploads off local disk before deploying.

← [6 — Admin](06-admin.md) · [Index](README.md) · Next: [8 — SEO](08-seo.md)

---

> ⚠️ **Do not deploy before this phase.** Render and Railway both have ephemeral filesystems — every
> redeploy wipes `uploads/` and every image 404s.

## Dependencies

```bash
cd server && npm i cloudinary file-type
```

No `multer-storage-cloudinary` — it's a thin, sporadically-maintained wrapper. `memoryStorage` +
`upload_stream` is ~15 lines and gives you the buffer for magic-byte validation.

---

## Steps

### 1. Environment

- [ ] Add to `server/src/env.ts`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
      `CLOUDINARY_API_SECRET` (all required now), `CLOUDINARY_FOLDER` (default `blog-mern`).

### 2. `server/src/config/cloudinary.ts` (new)

```ts
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});
```

### 3. Switch multer to memory storage

- [ ] `server/src/config/multer.ts` — swap `diskStorage` for `multer.memoryStorage()`
- [ ] Delete `createUploadDirs()` and its import-time side effect (lines 6-16)
- [ ] Drop the size limit to 5 MB for blog images — 10 MB of user-uploaded JPEG is not something you
      want to pay to transform

### 4. Magic-byte validation

The current `fileFilter` trusts `file.mimetype`, which is whatever the client's `Content-Type` header
claimed — trivially spoofed. With `memoryStorage` you have the buffer, so verify for real.

```ts
import { fileTypeFromBuffer } from "file-type";   // ESM-only — fine, this project is ESM

const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const sniffed = await fileTypeFromBuffer(file.buffer);
if (!sniffed || !ALLOWED.has(sniffed.mime)) throw badRequest("That file isn't a supported image.");
```

### 5. Replace the `imageStorage.ts` stub body

**This is the only file whose body changes** — because Phase 0A already routed every controller
through `persistUpload` / `removeStored`.

```ts
export async function persistUpload(file: Express.Multer.File, folder: "blogs" | "profiles"): Promise<StoredImage> {
  const sniffed = await fileTypeFromBuffer(file.buffer);
  if (!sniffed || !ALLOWED.has(sniffed.mime)) throw badRequest("That file isn't a supported image.");

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
        resource_type: "image",
        transformation: [
          { quality: "auto", fetch_format: "auto" },
          folder === "profiles"
            ? { width: 512, height: 512, crop: "fill", gravity: "face" }
            : { width: 1600, crop: "limit" },
        ],
      },
      (err, result) =>
        err || !result
          ? reject(err ?? new Error("Upload failed"))
          : resolve({ url: result.secure_url, publicId: result.public_id }),
    );
    stream.end(file.buffer);
  });
}

export async function removeStored(img?: { publicId?: string }) {
  if (img?.publicId) await cloudinary.uploader.destroy(img.publicId).catch(() => {});
}
```

### 6. Models

- [ ] Add `imagePublicId?: string` to `blog.ts` and `profilePicturePublicId?: string` to `user.ts`
- [ ] **Keep the existing `imageUrl` / `profilePicture` field names** so `types/index.tsx` and every
      client component are untouched. They just now hold absolute `https://res.cloudinary.com/...`
      URLs, which [`getImageUrl` at lib/api.ts:11](../../client/lib/api.ts) already passes through
      unchanged.

### 7. Migration script

- [ ] `server/src/scripts/migrateUploads.ts` (new) — one-shot, idempotent: find docs whose image
      field starts with `/uploads/`, upload the corresponding local file, update the doc with
      `{url, publicId}`, log anything missing.
- [ ] `"migrate:uploads": "tsx src/scripts/migrateUploads.ts"` in `package.json`

> ⚠️ **Must be run locally, where the files still exist.**

### 8. Remove the static mount

- [ ] Delete `app.use("/uploads", express.static(...))` from
      [app.ts:21](../../server/src/app.ts) — but **only after** the migration script has run clean
- [ ] Then drop the `crossOriginResourcePolicy` relaxation you added to helmet in 0A

### 9. Client

- [ ] Swap every remaining `<img>` for `next/image` now that all sources are Cloudinary (already in
      `remotePatterns` from 0B step 9)
- [ ] Optionally add a `blurDataURL` via Cloudinary's transformation API for the hero image, or use
      `placeholder="empty"` with a `bg-surface-muted` wrapper

### 10. Worth mentioning (not doing now)

Signed direct-to-Cloudinary uploads from the browser — the server issues a signature and the file
never touches your API. Halves egress and dodges Render's request body limits. More moving parts; a
good "if I had more time" note for the README.

---

## Verification

```bash
npm run migrate:uploads          # run locally, files present

curl -s localhost:5000/api/blogs?limit=50 | jq -r '.blogs[].imageUrl' | grep -c '^/uploads/'
# must be 0

curl -s -X POST localhost:5000/api/blogs -H "Authorization: Bearer $T" \
  -F title=Test -F description=Testing -F blogImage=@photo.jpg | jq -r '.blog.imageUrl'
# → https://res.cloudinary.com/...

# a text file renamed to .jpg with a spoofed Content-Type
curl -i -X POST localhost:5000/api/blogs -H "Authorization: Bearer $T" \
  -F title=x -F description=xxxxxxxxxx -F 'blogImage=@evil.jpg;type=image/jpeg'
# → 400 magic-byte rejection

curl -i localhost:5000/uploads/blogs/anything.jpg      # 404, static mount gone
```

- [ ] Cloudinary console shows the `blogs/` and `profiles/` folders
- [ ] Delete a blog → its asset disappears from Cloudinary
- [ ] `ls server/uploads` stays empty forever
