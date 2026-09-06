import { z } from "zod";

// Normalise before validating: z.email() on an untrimmed string rejects " a@x.com " outright,
// so trim/lowercase have to run first and the format check second.
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

// bcrypt only hashes the first 72 *bytes*; anything past that is silently ignored rather than
// rejected, so the max is a UX bound, not a security one.
const password = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters");

// z.object strips unknown keys rather than rejecting them, which is exactly what closes the
// privilege escalation: a `role` field in the body is dropped here and never reaches the model.
// Do NOT switch this to z.strictObject — a stray field should not 400 a legitimate signup.
// `claimAdmin` is a request, not an assertion. There is still no `role` key: a client can ask to
// become the first admin, and the server decides whether that is true. Comes over multipart as a
// string, so it is parsed the same careful way env booleans are — Boolean("false") is true.
export const registerSchema = z.object({
    username,
    email,
    password,
    claimAdmin: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => v === "true"),
});

export const loginSchema = z.object({
    email,
    // Deliberately not `password` above: an existing account created under an older rule must
    // still be able to log in, and a length hint on a login form leaks policy for free.
    password: z.string().min(1, "Password is required"),
});

// No .refine() demanding at least one key. The avatar arrives as req.file, not in the body, so a
// body-only "is anything here?" check rejected a photo-only update as "Nothing to update" — you
// could not change your picture without also editing your username or email. The controller makes
// that call instead, where it can see the file too.
export const updateMeSchema = z.object({
    username: username.optional(),
    email: email.optional(),
});

// currentPassword deliberately uses the login rule (min 1) rather than the policy rule above: an
// account created under an older, shorter minimum still has to be able to prove who it is in order
// to fix that. newPassword is the policy — this is the moment it is being set.
//
// There is no confirmPassword key. Confirming a typo is a client-side affordance; the server has
// one value to store, and z.object drops the extra field the form sends.
export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Enter your current password"),
        newPassword: password,
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
        path: ["newPassword"],
        message: "Choose a password different from your current one",
    });

export const objectIdParam = z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id"),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
export type UpdateMeInput = z.output<typeof updateMeSchema>;
export type ChangePasswordInput = z.output<typeof changePasswordSchema>;
export type ObjectIdParam = z.output<typeof objectIdParam>;
