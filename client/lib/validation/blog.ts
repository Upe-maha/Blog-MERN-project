import { z } from "zod";

// Mirrors server/src/schemas/blog.schema.ts. Kept literally identical so a client-side error says
// exactly what the server would have said.
export const blogSchema = z.object({
    title: z
        .string()
        .trim()
        .min(3, "Title must be at least 3 characters")
        .max(200, "Title must be at most 200 characters"),
    description: z
        .string()
        .trim()
        .min(10, "Body must be at least 10 characters")
        .max(20_000, "Body must be at most 20,000 characters"),
});

export type BlogValues = z.input<typeof blogSchema>;

// multer's blogImage limit is 5 MB and its fileFilter accepts these five types; checking here
// means an oversized file fails instantly instead of after the upload.
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export const validateCover = (file: File): string | null => {
    if (!ACCEPTED.includes(file.type)) return "Choose a JPEG, PNG, GIF or WebP image";
    if (file.size > MAX_COVER_BYTES) return "Image must be smaller than 5 MB";
    return null;
};
