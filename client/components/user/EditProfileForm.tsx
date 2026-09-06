"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuthStore } from "@/stores";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errorHandler";
import { getImageUrl } from "@/lib/api";
import { revalidateUser } from "@/app/actions";
import { updateProfileSchema, validateAvatar, type UpdateProfileValues } from "@/lib/validation/auth";

export function EditProfileForm() {
    const router = useRouter();
    const { user, updateUser } = useAuthStore();

    const fileInputRef = useRef<HTMLInputElement>(null);
    // The object URL currently held, so it can be revoked before the next one is made and again on
    // unmount. The previous version called URL.createObjectURL on every pick and revoked none of
    // them, so each preview leaked a blob for the lifetime of the tab.
    const previewUrlRef = useRef("");

    const [avatar, setAvatar] = useState<File | null>(null);
    const [avatarError, setAvatarError] = useState("");
    const [preview, setPreview] = useState("");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, dirtyFields },
    } = useForm<UpdateProfileValues>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: { username: user?.username ?? "", email: user?.email ?? "" },
    });

    const chooseAvatar = (file: File | null) => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = file ? URL.createObjectURL(file) : "";
        previewUrlRef.current = url;
        setAvatar(file);
        setPreview(url);
    };

    useEffect(
        () => () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        },
        []
    );

    const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Checked here rather than after the upload, so an oversized file never leaves the machine.
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

    const onSubmit = handleSubmit(async (values) => {
        if (!user) return;

        const payload = new FormData();
        // Only what actually changed. PATCH is a partial update, and sending an unchanged email
        // makes the server run its uniqueness check against the caller's own row for no reason.
        if (dirtyFields.username) payload.append("username", values.username.trim());
        if (dirtyFields.email) payload.append("email", values.email.trim());
        if (avatar) payload.append("profilePicture", avatar);

        // FormData has no .keys().length; entries() is how you ask whether anything is in it.
        if (payload.entries().next().done) {
            toast.info("Nothing to save yet");
            return;
        }

        try {
            // No id argument: the server takes identity from the JWT, so this cannot be aimed at
            // another account.
            const response = await authService.updateMe(payload);
            updateUser(response.user);
            // A toast and an immediate navigation, rather than rendering a success banner and
            // sitting on setTimeout(1200) before moving.
            toast.success("Profile updated");
            // router.refresh() on its own re-runs the server components, which read the same
            // cached fetch and render the same old name and avatar. The username and photo are
            // embedded in every post row this author wrote and in their public page, so the tags
            // have to be dropped first.
            await revalidateUser(user._id);
            router.push("/profile");
            router.refresh();
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not save your changes."));
        }
    });

    if (!user) return null;

    const currentAvatar = getImageUrl(user.profilePicture);

    return (
        <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
                <Field>
                    <FieldLabel htmlFor="profilePicture">Photo</FieldLabel>
                    <FieldDescription>Optional. JPEG, PNG, GIF or WebP, up to 5 MB.</FieldDescription>

                    <div className="mt-1 flex items-center gap-4">
                        {preview ? (
                            <Image
                                src={preview}
                                alt=""
                                width={64}
                                height={64}
                                unoptimized
                                className="border-border size-16 shrink-0 rounded-full border object-cover"
                            />
                        ) : currentAvatar ? (
                            <Image
                                src={currentAvatar}
                                alt=""
                                width={64}
                                height={64}
                                className="border-border size-16 shrink-0 rounded-full border object-cover"
                            />
                        ) : (
                            <UserAvatar username={user.username} className="size-16 shrink-0" />
                        )}

                        <div className="flex items-center gap-2">
                            {/* A real <label> pointing at a real input, not a <div onClick> whose
                                only affordance was a hover overlay — that was invisible to
                                keyboard users and unreachable without a mouse. */}
                            <FieldLabel
                                htmlFor="profilePicture"
                                className="border-border hover:bg-surface-hover inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors focus-within:ring-3 focus-within:ring-ring/50"
                            >
                                <Upload className="size-4" aria-hidden="true" />
                                {avatar ? "Change photo" : "Choose photo"}
                            </FieldLabel>

                            {avatar ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        chooseAvatar(null);
                                        setAvatarError("");
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                >
                                    Remove
                                </Button>
                            ) : null}
                        </div>

                        <input
                            ref={fileInputRef}
                            id="profilePicture"
                            name="profilePicture"
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={onAvatarChange}
                            className="sr-only"
                        />
                    </div>

                    {avatarError ? <FieldError>{avatarError}</FieldError> : null}
                </Field>

                <Field data-invalid={!!errors.username}>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                        id="username"
                        autoComplete="username"
                        aria-invalid={!!errors.username}
                        {...register("username")}
                    />
                    <FieldError errors={[errors.username]} />
                </Field>

                <Field data-invalid={!!errors.email}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={!!errors.email}
                        {...register("email")}
                    />
                    <FieldError errors={[errors.email]} />
                </Field>

                <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                        {isSubmitting ? "Saving…" : "Save changes"}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/profile")}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
}

export default EditProfileForm;
