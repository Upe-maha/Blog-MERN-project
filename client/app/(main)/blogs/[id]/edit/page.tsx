import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBlog } from "@/lib/server-api";
import { PageHeader } from "@/components/ui/page-header";
import RequireAuth from "@/components/auth/require-auth";
import BlogForm from "@/components/blog/BlogForm";
import EditGuard from "./edit-guard";

export const metadata: Metadata = {
    title: "Edit post",
    robots: { index: false },
};

// This route did not exist, which is why blogService.update was unreachable dead code.
export default async function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const blog = await getBlog(id);
    if (!blog) notFound();

    return (
        <RequireAuth>
            {/* Mirrors requireOwnership(Blog, "author") on the server. This decides what to render;
                the API is what actually enforces it, and rejects a forged request regardless. */}
            <EditGuard authorId={blog.author?._id}>
                <div className="max-w-reading py-4">
                    <PageHeader title="Edit post" description={blog.title} />
                    <BlogForm
                        mode="edit"
                        blogId={blog._id}
                        initial={{
                            title: blog.title,
                            description: blog.description,
                            imageUrl: blog.imageUrl,
                        }}
                    />
                </div>
            </EditGuard>
        </RequireAuth>
    );
}
