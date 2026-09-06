"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuthStore } from "@/stores";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errorHandler";
import { loginSchema, type LoginValues } from "@/lib/validation/auth";

// Only same-origin relative paths are honoured, so ?next=https://evil.example can't turn the
// login form into an open redirect. "//evil.com" is protocol-relative, hence the second check.
const safeNext = (next: string | null): string =>
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/blogs";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setUser = useAuthStore((s) => s.setUser);
    const { isAuthenticated, isHydrated } = useAuthStore();

    const next = searchParams.get("next");

    // Being sent here with ?next= means proxy.ts or RequireAuth turned this visitor away. Both
    // decide before the store has rehydrated — the proxy reads a hint cookie that expires on its
    // own schedule (and that privacy settings can drop) while the session in localStorage is
    // still perfectly good. That lands a signed-in writer on a login form for a page they can
    // already open. Rehydration has since re-asserted the cookie, so send them on their way.
    //
    // Only with ?next=. Someone who typed /login deliberately may be signing in as a different
    // account, and bouncing them off the form would make that impossible.
    const bouncedWhileSignedIn = isHydrated && isAuthenticated && !!next;
    useEffect(() => {
        if (bouncedWhileSignedIn) router.replace(safeNext(next));
    }, [bouncedWhileSignedIn, next, router]);

    const [formError, setFormError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = handleSubmit(async (values) => {
        setFormError("");
        try {
            const response = await authService.login(values);
            if (!response.user || !response.token) {
                setFormError(response.message || "Login failed. Please try again.");
                return;
            }

            // setUser writes the session-hint cookie itself.
            setUser(response.user, response.token);
            router.replace(safeNext(next));
        } catch (err) {
            // The old code swallowed every failure as "Invalid email or password" — a 500, a
            // timeout and a CORS rejection all read as a typo in your password.
            setFormError(getErrorMessage(err, "Could not sign you in. Please try again."));
        }
    });

    return (
        <div>
            <header className="mb-8">
                <h1 className="text-[1.75rem] leading-tight">Welcome back</h1>
                <p className="font-serif text-muted-foreground mt-2 leading-relaxed">
                    Sign in to your account to keep writing.
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
                                autoComplete="current-password"
                                placeholder="Enter your password"
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

                    <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                        {isSubmitting && <Loader2 className="animate-spin" />}
                        {isSubmitting ? "Signing in…" : "Sign in"}
                    </Button>
                </FieldGroup>
            </form>

            <p className="text-muted-foreground mt-6 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link
                    href="/register"
                    className="text-foreground rounded-sm font-medium underline underline-offset-4"
                >
                    Create one
                </Link>
            </p>
        </div>
    );
}

export default function LoginPage() {
    // useSearchParams opts the tree into client-side rendering; without a Suspense boundary the
    // production build fails rather than degrading.
    return (
        <Suspense fallback={<div className="bg-muted h-96 animate-pulse rounded-md" />}>
            <LoginForm />
        </Suspense>
    );
}
