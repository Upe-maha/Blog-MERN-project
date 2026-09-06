"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Markdown from "@/components/blog/Markdown";
import { blogService } from "@/services/blogService";
import { getErrorMessage } from "@/lib/errorHandler";
import { getImageUrl } from "@/lib/api";
import { revalidateBlog, revalidateBlogs } from "@/app/actions";
import { blogSchema, validateCover, type BlogValues } from "@/lib/validation/blog";

export function BlogForm({
    mode,
    blogId,
    initial,
}: {
    mode: "create" | "edit";
    blogId?: string;
    initial?: { title: string; description: string; imageUrl?: string };
}) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewUrlRef = useRef("");

    const [formError, setFormError] = useState("");
    const [cover, setCover] = useState<File | null>(null);
    const [coverError, setCoverError] = useState("");
    const [previewUrl, setPreviewUrl] = useState(
        initial?.imageUrl ? getImageUrl(initial.imageUrl) : ""
    );

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BlogValues>({
        resolver: zodResolver(blogSchema),
        defaultValues: { title: initial?.title ?? "", description: initial?.description ?? "" },
    });

    const body = watch("description");

    // Created in the handler rather than derived in an effect, which would setState on every
    // change and cascade a render. The previous object URL is released on each swap.
    const chooseCover = (file: File | null) => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = file ? URL.createObjectURL(file) : "";
        previewUrlRef.current = url;
        setCover(file);
        setPreviewUrl(url || (initial?.imageUrl ? getImageUrl(initial.imageUrl) : ""));
    };

    useEffect(
        () => () => {
            if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        },
        []
    );

    const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // The copy has always promised a limit; nothing ever enforced it before the upload.
        const problem = validateCover(file);
        if (problem) {
            setCoverError(problem);
            chooseCover(null);
            e.target.value = "";
            return;
        }
        setCoverError("");
        chooseCover(file);
    };

    const onSubmit = handleSubmit(async (values) => {
        setFormError("");
        try {
            const payload = new FormData();
            payload.append("title", values.title);
            payload.append("description", values.description);
            if (cover) payload.append("blogImage", cover);
            // No `author` field: the server takes it from the token and strips the key anyway.

            const response =
                mode === "create"
                    ? await blogService.create(payload)
                    : await blogService.update(blogId!, payload);

            const id = response?.blog?._id ?? blogId;
            toast.success(mode === "create" ? "Post published" : "Post updated");

            // Drop the cached fetches *before* navigating. router.refresh() re-runs the server
            // components but they would read the same cached response — which is why a new post
            // only appeared in the archive after a manual reload.
            if (mode === "create") await revalidateBlogs();
            else if (id) await revalidateBlog(id);
            router.refresh();
            router.push(id ? `/blogs/${id}` : "/blogs");
        } catch (err) {
            setFormError(
                getErrorMessage(
                    err,
                    mode === "create" ? "Could not publish the post." : "Could not save your changes."
                )
            );
        }
    });

    return (
        <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
                {formError ? (
                    <p
                        role="alert"
                        className="border-destructive text-destructive border-l-2 py-0.5 pl-3 text-sm"
                    >
                        {formError}
                    </p>
                ) : null}

                <Field data-invalid={!!errors.title}>
                    <FieldLabel htmlFor="title">Title</FieldLabel>
                    <Input
                        id="title"
                        placeholder="On writing software slowly"
                        aria-invalid={!!errors.title}
                        className="h-11 font-serif text-lg"
                        {...register("title")}
                    />
                    <FieldError errors={[errors.title]} />
                </Field>

                <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="description">Body</FieldLabel>
                    {/* The preview runs the same sanitised pipeline the reader does, so what you
                        see here is exactly what publishes. */}
                    <Tabs defaultValue="write">
                        <TabsList>
                            <TabsTrigger value="write">Write</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>

                        <TabsContent value="write" className="mt-3">
                            <Textarea
                                id="description"
                                rows={18}
                                placeholder="Markdown is supported — ## headings, **bold**, [links](https://example.com), lists and code fences."
                                aria-invalid={!!errors.description}
                                className="min-h-[24rem] font-serif text-base leading-relaxed"
                                {...register("description")}
                            />
                        </TabsContent>

                        <TabsContent value="preview" className="mt-3">
                            <div className="border-border min-h-[24rem] rounded-sm border px-4 py-3">
                                {body?.trim() ? (
                                    <div className="prose">
                                        <Markdown>{body}</Markdown>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm">
                                        Nothing to preview yet.
                                    </p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                    <FieldError errors={[errors.description]} />
                </Field>

                <Field>
                    <FieldLabel htmlFor="blogImage">Cover image</FieldLabel>
                    <FieldDescription>Optional. JPEG, PNG, GIF or WebP, up to 5 MB.</FieldDescription>

                    {previewUrl ? (
                        <div className="mt-1 flex flex-wrap items-start gap-3">
                            <Image
                                src={previewUrl}
                                alt=""
                                width={240}
                                height={135}
                                unoptimized
                                className="border-border h-auto w-60 rounded-sm border object-cover"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    chooseCover(null);
                                    setPreviewUrl("");
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                            >
                                <X />
                                Remove
                            </Button>
                        </div>
                    ) : (
                        // A real <label for>, so the control is reachable by keyboard and announced.
                        // The old dropzone was a <div onClick> that neither was.
                        <FieldLabel
                            htmlFor="blogImage"
                            className="border-border hover:bg-surface-hover focus-within:ring-ring/50 mt-1 flex cursor-pointer flex-col items-center gap-2 rounded-sm border border-dashed px-6 py-10 transition-colors focus-within:ring-3"
                        >
                            <ImagePlus className="text-muted-foreground size-5" aria-hidden="true" />
                            <span className="text-muted-foreground text-sm font-normal">
                                Choose an image
                            </span>
                        </FieldLabel>
                    )}

                    <input
                        ref={fileInputRef}
                        id="blogImage"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={onCoverChange}
                        className="sr-only"
                    />
                    {coverError ? <FieldError>{coverError}</FieldError> : null}
                </Field>

                <div className="flex flex-wrap gap-3">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
                        {isSubmitting
                            ? mode === "create"
                                ? "Publishing…"
                                : "Saving…"
                            : mode === "create"
                              ? "Publish"
                              : "Save changes"}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        render={<Link href={blogId ? `/blogs/${blogId}` : "/blogs"} />}
                    >
                        Cancel
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
}

export default BlogForm;
