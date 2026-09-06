import { fileTypeFromBuffer } from "file-type";
import { cloudinary } from "./cloudinary.js";
import { env } from "../env.js";
import { badRequest, serviceUnavailable } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export type StoredImage = { url: string; publicId?: string };

declare global {
    namespace Express {
        interface Request {
            // Kept for source compatibility with the controllers. With memoryStorage there is no
            // file on disk to orphan, so nothing depends on it any more.
            uploadCommitted?: boolean;
        }
    }
}

export const keepUpload = (req: { uploadCommitted?: boolean }): void => {
    req.uploadCommitted = true;
};

// The real check. multer's fileFilter only sees `file.mimetype`, which is the Content-Type the
// client chose to send — a text file renamed to .jpg and posted as image/jpeg sails straight
// through it. Magic bytes are the file itself.
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

async function assertRealImage(buffer: Buffer): Promise<void> {
    const sniffed = await fileTypeFromBuffer(buffer);
    if (!sniffed || !ALLOWED.has(sniffed.mime)) {
        throw badRequest("That file isn't a supported image.");
    }
}

// Cloudinary rejects with a plain object carrying http_code, not an Error subclass — so without
// this every upload failure fell through the error middleware as an opaque 500 "Internal server
// error". A publish that fails because of a misconfigured API key should say so.
function uploadFailure(err: unknown): Error {
    const e = (err ?? {}) as { http_code?: number; message?: string };
    const code = e.http_code;

    // 401/403 mean the credentials are wrong or the key lacks write ("create") permission. That is
    // a deployment problem, never something the person publishing can fix — so it is logged loudly
    // with the real reason, and they get a message that does not blame their file.
    if (code === 401 || code === 403) {
        logger.error(
            { err, http_code: code },
            "Cloudinary rejected the upload — the API key is invalid or lacks write permission. " +
                "Check CLOUDINARY_API_KEY/SECRET, and that the key has 'create' on the product environment."
        );
        return serviceUnavailable(
            "Image uploads aren't available right now. Your post wasn't saved — try again without a cover image."
        );
    }

    // The file itself was the problem.
    if (code === 400 || code === 420) return badRequest(e.message || "That image couldn't be processed.");
    if (code === 413) return badRequest("That image is too large.");

    logger.error({ err, http_code: code }, "Cloudinary upload failed");
    return serviceUnavailable("The image service is unavailable. Please try again shortly.");
}

// The seam every controller goes through. Phase 0A routed them all through here precisely so this
// body could be swapped without touching a single controller — which is what happened.
export async function persistUpload(
    file: Express.Multer.File,
    folder: "blogs" | "profiles"
): Promise<StoredImage> {
    await assertRealImage(file.buffer);

    return new Promise<StoredImage>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
                resource_type: "image",
                transformation: [
                    // Cloudinary picks the codec and quality per requesting browser, so an AVIF
                    // goes to Chrome and a JPEG to whatever cannot read it.
                    { quality: "auto", fetch_format: "auto" },
                    folder === "profiles"
                        ? { width: 512, height: 512, crop: "fill", gravity: "face" }
                        : { width: 1600, crop: "limit" },
                ],
            },
            (err, result) =>
                err || !result
                    ? reject(uploadFailure(err))
                    : resolve({ url: result.secure_url, publicId: result.public_id })
        );
        stream.on("error", (err) => reject(uploadFailure(err)));
        stream.end(file.buffer);
    });
}

// Deletion is by publicId, never by URL — a Cloudinary URL carries transformation segments and a
// version, so it cannot be turned back into an id reliably.
export async function removeStored(img?: {
    url?: string | null;
    publicId?: string | null;
}): Promise<void> {
    if (img?.publicId) {
        try {
            await cloudinary.uploader.destroy(img.publicId);
        } catch (err) {
            // A failed destroy must not fail the request that triggered it: the row is already
            // gone, and an orphaned asset is recoverable where a half-deleted post is not.
            logger.warn({ err, publicId: img.publicId }, "failed to remove Cloudinary asset");
        }
        return;
    }

    // A row still holding a "/uploads/..." path predates the migration. There is no local file to
    // unlink any more — the static mount is gone — so this is a prompt to run the script, not a
    // failure.
    if (img?.url?.startsWith("/uploads/")) {
        logger.warn({ url: img.url }, "legacy /uploads/ image; run `npm run migrate:uploads`");
    }
}

// A no-op now, kept so the error middleware needs no conditional. With memoryStorage a rejected
// request leaves nothing behind: the buffer is garbage-collected when the request ends.
export async function discardUpload(_file?: Express.Multer.File): Promise<void> {}
