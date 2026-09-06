"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuthStore } from "@/stores";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errorHandler";
import { changePasswordSchema, type ChangePasswordValues } from "@/lib/validation/auth";

// A section of the settings page rather than a route of its own: it is one of three things the
// account owner can change about themselves, and a page that holds two of them and links to the
// third is a worse map of the same idea.
export function ChangePassword() {
    const { user, setUser } = useAuthStore();
    const [reveal, setReveal] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordValues>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const onSubmit = handleSubmit(async (values) => {
        if (!user) return;
        try {
            const { token } = await authService.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });

            // Mandatory, not housekeeping. The server retires every token issued before the change,
            // including the one that authorised this request, so storing the replacement is the
            // difference between staying signed in and being bounced to /login on the next click.
            setUser(user, token);

            toast.success("Password changed");
            // Nothing here is worth keeping on screen, and a filled-in password field left behind
            // is just an offer to somebody walking past.
            reset();
            setReveal(false);
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not change your password."));
        }
    });

    if (!user) return null;

    return (
        <section className="border-border mt-12 border-t pt-8">
            <h2 className="text-base font-medium">Password</h2>
            <p className="text-muted-foreground mt-2 max-w-prose text-sm">
                Changing it signs out every other browser still holding this account&apos;s session.
                This one stays signed in.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-6">
                <FieldGroup>
                    <Field data-invalid={!!errors.currentPassword}>
                        <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
                        <Input
                            id="currentPassword"
                            type={reveal ? "text" : "password"}
                            autoComplete="current-password"
                            aria-invalid={!!errors.currentPassword}
                            {...register("currentPassword")}
                        />
                        <FieldError errors={[errors.currentPassword]} />
                    </Field>

                    <Field data-invalid={!!errors.newPassword}>
                        <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={reveal ? "text" : "password"}
                                autoComplete="new-password"
                                placeholder="At least 8 characters"
                                aria-invalid={!!errors.newPassword}
                                className="pr-10"
                                {...register("newPassword")}
                            />
                            {/* One toggle for all three fields: they are checked against each
                                other, so revealing one and not the others helps with nothing. */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setReveal((v) => !v)}
                                aria-label={reveal ? "Hide passwords" : "Show passwords"}
                                aria-pressed={reveal}
                                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                            >
                                {reveal ? <EyeOff /> : <Eye />}
                            </Button>
                        </div>
                        <FieldError errors={[errors.newPassword]} />
                    </Field>

                    <Field data-invalid={!!errors.confirmPassword}>
                        <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
                        <Input
                            id="confirmPassword"
                            type={reveal ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Re-enter your new password"
                            aria-invalid={!!errors.confirmPassword}
                            {...register("confirmPassword")}
                        />
                        <FieldError errors={[errors.confirmPassword]} />
                    </Field>

                    <div>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                            {isSubmitting ? "Changing…" : "Change password"}
                        </Button>
                    </div>
                </FieldGroup>
            </form>
        </section>
    );
}

export default ChangePassword;
