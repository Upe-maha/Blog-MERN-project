"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Eye, EyeOff, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuthStore } from "@/stores";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errorHandler";
import { registerSchema, validateAvatar, type RegisterValues } from "@/lib/validation/auth";

export default function RegisterPage() {
    const router = useRouter();
    const setUser = useAuthStore((s) => s.setUser);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formError, setFormError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarError, setAvatarError] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const previewUrlRef = useRef("");

    // The preview URL is created in the event handler rather than derived in an effect: an effect
    // would have to setState on every file change, which cascades an extra render. createObjectURL
    // pins the blob in memory until revoked, so the previous one is released on every swap.
    const chooseAvatar = (file: File | null) => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = file ? URL.createObjectURL(file) : "";
        previewUrlRef.current = url;
        setAvatar(file);
        setPreviewUrl(url);
    };

    // Leaving the page mid-signup would otherwise leak the last preview.
    useEffect(
        () => () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        },
        []
    );

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegisterValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
    });

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Checked here as well as on the server, so an oversized file fails instantly instead of
        // after a 5 MB upload.
        const problem = validateAvatar(file);
        if (problem) {
            setAvatarError(problem);
            chooseAvatar(null);
            e.target.value = "";
            return;
        }
        setAvatarError("");
        chooseAvatar(file);
    };

    // First-run setup. Undefined until the answer arrives, so the option never flashes in and
    // then disappears — and a failed check simply means the option is not offered.
    const [needsAdmin, setNeedsAdmin] = useState<boolean | undefined>(undefined);
    const [claimAdmin, setClaimAdmin] = useState(false);

    useEffect(() => {
        let cancelled = false;
        authService
            .getBootstrapStatus()
            .then(({ adminExists }) => {
                if (!cancelled) setNeedsAdmin(!adminExists);
            })
            .catch(() => {
                if (!cancelled) setNeedsAdmin(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const clearAvatar = () => {
        chooseAvatar(null);
        setAvatarError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const onSubmit = handleSubmit(async (values) => {
        setFormError("");
        try {
            const payload = new FormData();
            payload.append("username", values.username);
            payload.append("email", values.email);
            payload.append("password", values.password);
            if (avatar) payload.append("profilePicture", avatar);
            // Still no `role` field — the API strips it. `claimAdmin` only *asks*; the server
            // grants it solely when no administrator exists yet, and a unique index makes the
            // first-run claim atomic under concurrent signups.
            if (needsAdmin && claimAdmin) payload.append("claimAdmin", "true");

            const created = await authService.register(payload);
            if (!created.user) {
                setFormError(created.message || "Registration failed. Please try again.");
                return;
            }

            // Sign in with the credentials just accepted, so the new account lands logged in.
            const session = await authService.login({
                email: values.email,
                password: values.password,
            });
            if (session.user && session.token) {
                setUser(session.user, session.token);
                router.replace("/blogs");
            } else {
                router.replace("/login");
            }
        } catch (err) {
            setFormError(getErrorMessage(err, "Could not create your account. Please try again."));
        }
    });

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-[1.75rem] leading-tight">
                    {needsAdmin ? "Set up Marginalia" : "Create your account"}
                </h1>
                <p className="font-serif text-muted-foreground mt-2 leading-relaxed">
                    {needsAdmin
                        ? "This publication has no administrator yet. The first account can claim it."
                        : "Start publishing in under a minute."}
                </p>
            </header>

            <form onSubmit={onSubmit} noValidate>
                <FieldGroup>
                    {/* A rule, not a filled box. A bordered panel inside the auth card
                        reads as a card inside a card — see The Hairline Rule. */}
                    {formError && (
                        <p
                            role="alert"
                            className="border-destructive text-destructive border-l-2 py-0.5 pl-3 text-sm"
                        >
                            {formError}
                        </p>
                    )}

                    {/* A real <label for> wrapping a visually-hidden file input. The previous
                        <div onClick> could not be reached by keyboard or announced at all. */}
                    <Field className="items-center">
                        <FieldLabel
                            htmlFor="profilePicture"
                            className="group border-border bg-muted/40 hover:bg-surface-hover relative size-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed transition-colors focus-within:ring-3 focus-within:ring-ring/50"
                        >
                            {previewUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element -- a blob:
                                   preview has no remote host for next/image to optimise. */
                                <img
                                    src={previewUrl}
                                    alt=""
                                    className="size-full object-cover"
                                />
                            ) : (
                                <span className="text-muted-foreground grid size-full place-items-center">
                                    <Camera className="size-6" aria-hidden="true" />
                                </span>
                            )}
                            <span className="sr-only">Choose a profile picture</span>
                        </FieldLabel>

                        <input
                            ref={fileInputRef}
                            id="profilePicture"
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleAvatarChange}
                            className="sr-only"
                        />

                        {avatar ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                onClick={clearAvatar}
                                className="w-auto"
                            >
                                <X />
                                Remove photo
                            </Button>
                        ) : (
                            <FieldDescription className="text-center">
                                Profile picture — optional, up to 5 MB
                            </FieldDescription>
                        )}
                        {avatarError && (
                            <FieldError className="text-center">{avatarError}</FieldError>
                        )}
                    </Field>

                    <Field data-invalid={!!errors.username}>
                        <FieldLabel htmlFor="username">Username</FieldLabel>
                        <Input
                            id="username"
                            autoComplete="username"
                            placeholder="janedoe"
                            aria-invalid={!!errors.username}
                            className="h-10"
                            {...register("username")}
                        />
                        <FieldError errors={[errors.username]} />
                    </Field>

                    <Field data-invalid={!!errors.email}>
                        <FieldLabel htmlFor="email">Email address</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            aria-invalid={!!errors.email}
                            className="h-10"
                            {...register("email")}
                        />
                        <FieldError errors={[errors.email]} />
                    </Field>

                    <Field data-invalid={!!errors.password}>
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                aria-invalid={!!errors.password}
                                className="h-10 pr-10"
                                {...register("password")}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                            >
                                {showPassword ? <EyeOff /> : <Eye />}
                            </Button>
                        </div>
                        <FieldError errors={[errors.password]} />
                    </Field>

                    <Field data-invalid={!!errors.confirmPassword}>
                        <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Re-enter your password"
                            aria-invalid={!!errors.confirmPassword}
                            className="h-10"
                            {...register("confirmPassword")}
                        />
                        <FieldError errors={[errors.confirmPassword]} />
                    </Field>

                    {/* Only while the application genuinely has no administrator. Once one exists
                        this disappears for good — the server stops granting the claim at the same
                        moment, so the UI and the rule cannot drift apart. A rule and a checkbox
                        rather than a tinted panel: DESIGN.md §2.3. */}
                    {needsAdmin ? (
                        <Field
                            orientation="horizontal"
                            className="border-border items-start gap-3 border-t pt-5"
                        >
                            <input
                                id="claimAdmin"
                                type="checkbox"
                                checked={claimAdmin}
                                onChange={(e) => setClaimAdmin(e.target.checked)}
                                className="accent-primary mt-0.5 size-4 shrink-0"
                            />
                            <div className="min-w-0">
                                <FieldLabel htmlFor="claimAdmin" className="font-medium">
                                    Make this the administrator account
                                </FieldLabel>
                                <FieldDescription>
                                    Available only because no administrator exists yet. Whoever
                                    claims it can manage every account and post, so do this before
                                    sharing the address.
                                </FieldDescription>
                            </div>
                        </Field>
                    ) : null}

                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="animate-spin" />}
                        {isSubmitting ? "Creating account…" : "Create account"}
                    </Button>
                </FieldGroup>
            </form>

            <p className="text-muted-foreground mt-6 text-center text-sm">
                Already have an account?{" "}
                <Link
                    href="/login"
                    className="text-foreground rounded-sm font-medium underline underline-offset-4"
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}
