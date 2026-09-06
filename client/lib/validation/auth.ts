import { z } from "zod";

// Deliberately mirrors server/src/schemas/user.schema.ts. Keeping the two literally identical is
// what stops the client accepting a value the server then rejects — the client copy exists for
// instant feedback, never as the enforcement point.
const email = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address"))
    .pipe(z.string().max(254, "Email is too long"));

const username = z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters");

export const loginSchema = z.object({
    email,
    password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
    .object({
        username,
        email,
        // 8, matching the server. The old form allowed 6, so the server was the first thing to
        // tell you the password was too short — after a full round trip.
        password: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password must be at most 128 characters"),
        confirmPassword: z.string().min(1, "Confirm your password"),
    })
    .refine((d) => d.password === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords don't match",
    });

// Mirrors server/src/schemas/user.schema.ts, with confirmPassword added — the server has one value
// to store and drops the extra key, so the confirmation is purely this side's typo guard.
//
// currentPassword is min 1, not min 8, for the same reason the login form is: an account made under
// an older rule still has to be able to prove who it is in order to fix that.
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Enter your current password"),
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .max(128, "Password must be at most 128 characters"),
        confirmPassword: z.string().min(1, "Confirm your new password"),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords don't match",
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
        path: ["newPassword"],
        message: "Choose a password different from your current one",
    });

export const updateProfileSchema = z.object({
    username,
    email,
});

export type LoginValues = z.input<typeof loginSchema>;
export type RegisterValues = z.input<typeof registerSchema>;
export type UpdateProfileValues = z.input<typeof updateProfileSchema>;
export type ChangePasswordValues = z.input<typeof changePasswordSchema>;

// Matches multer's limits and fileFilter on the server, so an oversized or wrong-typed file is
// rejected before it is uploaded rather than after.
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
];

export const validateAvatar = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        return "Choose a JPEG, PNG, GIF or WebP image";
    }
    if (file.size > MAX_AVATAR_BYTES) return "Image must be smaller than 5 MB";
    return null;
};
