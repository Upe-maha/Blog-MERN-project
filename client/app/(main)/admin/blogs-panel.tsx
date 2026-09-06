"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileX, Heart, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminStore } from "@/stores";
import type { AdminBlogRow } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableSkeleton } from "@/components/skeletons";
import { revalidateBlog } from "@/app/actions";
import { Pagination, SearchInput, SortSelect } from "./toolbar";

const PAGE_SIZE = 20;

const SORTS = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "title", label: "Title A–Z" },
    { value: "comments", label: "Most comments" },
    { value: "likes", label: "Most likes" },
] as const;

export function BlogsPanel() {
    const {
        blogs,
        blogsTotal,
        blogsPage,
        blogsHasMore,
        blogsQuery,
        blogsSort,
        isLoadingBlogs,
        fetchBlogs,
        deleteBlog,
    } = useAdminStore();

    const [pendingDelete, setPendingDelete] = useState<AdminBlogRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        void fetchBlogs({ page: 1 });
    }, [fetchBlogs]);

    const search = useCallback((q: string) => void fetchBlogs({ q, page: 1 }), [fetchBlogs]);

    const onDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        const error = await deleteBlog(pendingDelete._id);
        setDeleting(false);
        if (error) {
            toast.error(error);
        } else {
            toast.success("Post deleted");
            // The admin table keeps its own list, but the post is gone from the public archive
            // too — and that is the copy every reader sees. Nothing here dropped its tag, so a
            // deleted post stayed on /blogs and on its own page until the cache window expired.
            await revalidateBlog(pendingDelete._id);
            setPendingDelete(null);
        }
    };

    const published = (iso: string) =>
        new Date(iso).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <SearchInput
                    value={blogsQuery}
                    onChange={search}
                    label="Search posts"
                    placeholder="Title or body…"
                />
                <SortSelect
                    value={blogsSort}
                    onChange={(sort) => void fetchBlogs({ sort, page: 1 })}
                    options={[...SORTS]}
                    label="Sort posts"
                />
            </div>

            {isLoadingBlogs ? (
                <TableSkeleton rows={6} />
            ) : blogs.length === 0 ? (
                <EmptyState
                    icon={FileX}
                    title={blogsQuery ? `No posts match “${blogsQuery}”` : "Nothing published yet"}
                    description={
                        blogsQuery
                            ? "Search covers the title and body of every post."
                            : "Posts will appear here once someone writes one."
                    }
                />
            ) : (
                <>
                    <div className="hidden md:block">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-border text-muted-foreground border-b text-left text-[0.8125rem] tracking-[0.06em]">
                                    <th scope="col" className="py-2 font-normal">Post</th>
                                    <th scope="col" className="py-2 font-normal">Author</th>
                                    <th scope="col" className="py-2 text-right font-normal">Engagement</th>
                                    <th scope="col" className="py-2 text-right font-normal">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {blogs.map((b) => (
                                    <tr key={b._id} className="border-border border-b">
                                        <td className="max-w-0 py-3">
                                            <Link
                                                href={`/blogs/${b._id}`}
                                                className="hover:text-primary block truncate rounded-sm transition-colors"
                                            >
                                                {b.title}
                                            </Link>
                                            <time
                                                dateTime={b.createdAt}
                                                className="text-muted-foreground text-[0.8125rem]"
                                            >
                                                {published(b.createdAt)}
                                            </time>
                                        </td>
                                        <td className="py-3">
                                            {/* The aggregation deliberately keeps a post whose
                                                author was deleted, so this can genuinely be absent. */}
                                            {b.author ? (
                                                <Link
                                                    href={`/users/${b.author._id}`}
                                                    className="hover:text-primary rounded-sm transition-colors"
                                                >
                                                    {b.author.username}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">Deleted user</span>
                                            )}
                                        </td>
                                        <td className="text-muted-foreground py-3 text-right tabular-nums">
                                            <span className="inline-flex items-center gap-1">
                                                <MessageSquare className="size-3.5" aria-hidden="true" />
                                                {b.commentsCount}
                                                <span className="sr-only"> comments</span>
                                            </span>
                                            <span className="ml-3 inline-flex items-center gap-1">
                                                <Heart className="size-3.5" aria-hidden="true" />
                                                {b.likesCount}
                                                <span className="sr-only"> likes</span>
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => setPendingDelete(b)}
                                                aria-label={`Delete “${b.title}”`}
                                            >
                                                <Trash2 aria-hidden="true" />
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-border border-t md:hidden">
                        {blogs.map((b) => (
                            <div key={b._id} className="border-border border-b py-4">
                                <Link
                                    href={`/blogs/${b._id}`}
                                    className="hover:text-primary rounded-sm font-serif transition-colors"
                                >
                                    {b.title}
                                </Link>
                                <p className="text-muted-foreground mt-1.5 text-[0.8125rem] tracking-[0.06em]">
                                    {b.author?.username ?? "Deleted user"}
                                    <span aria-hidden="true"> · </span>
                                    <time dateTime={b.createdAt}>{published(b.createdAt)}</time>
                                    <span aria-hidden="true"> · </span>
                                    {b.commentsCount} comments
                                    <span aria-hidden="true"> · </span>
                                    {b.likesCount} likes
                                </p>
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-muted-foreground hover:text-destructive mt-2"
                                    onClick={() => setPendingDelete(b)}
                                    aria-label={`Delete “${b.title}”`}
                                >
                                    <Trash2 aria-hidden="true" />
                                    Delete
                                </Button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <Pagination
                page={blogsPage}
                total={blogsTotal}
                limit={PAGE_SIZE}
                hasMore={blogsHasMore}
                loading={isLoadingBlogs}
                onPage={(p) => void fetchBlogs({ page: p })}
            />

            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={(open) => {
                    if (!open) setPendingDelete(null);
                }}
                title="Delete this post?"
                description={
                    pendingDelete
                        ? `“${pendingDelete.title}” and all of its comments and likes are removed. This cannot be undone.`
                        : undefined
                }
                confirmLabel="Delete post"
                destructive
                loading={deleting}
                onConfirm={onDelete}
            />
        </div>
    );
}

export default BlogsPanel;
