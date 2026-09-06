import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import BlogForm from "@/components/blog/BlogForm";

export const metadata: Metadata = {
    title: "Write",
    robots: { index: false },
};

// The auth gate is blogs/create/layout.tsx (RequireAuth) plus proxy.ts, so this page no longer
// duplicates the guard and its own spinner the way it used to.
export default function CreateBlogPage() {
    return (
        <div className="max-w-reading py-4">
            <PageHeader
                title="New post"
                description="Markdown is supported. The preview tab renders exactly what will publish."
            />
            <BlogForm mode="create" />
        </div>
    );
}
