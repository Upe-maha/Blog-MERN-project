"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, LogOut, PenLine, Settings } from "lucide-react";
import { toast } from "sonner";
import type { BlogListItem } from "@/types";
import { useAuthStore } from "@/stores";
import { blogService } from "@/services/blogService";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errorHandler";
import { revalidateBlog } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BlogGridSkeleton } from "@/components/skeletons";
import PostRow from "@/components/blog/PostRow";
import PostActionsMenu from "@/components/user/PostActionsMenu";

const PAGE_SIZE = 12;

type Stats = { blogs: number; comments: number; likesReceived: number };

// A stat is a number and its name, in that reading order. The old pills put the *value* in bold
// colour and the *label* in grey beside it, which read backwards — "12 Blogs" as one sentence
// rather than a labelled figure.
function Stat({ value, label }: { value: number | null; label: string }) {
    return (
        <div>
            <div className="font-serif text-2xl leading-none tabular-nums">
                {value === null ? <span className="text-muted-foreground">—</span> : value}
            </div>
            <div className="text-muted-foreground mt-1.5 text-[0.8125rem] tracking-[0.06em]">
                {label}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    // The (main)/profile layout wraps this in RequireAuth, so by the time it renders the store is
    // hydrated and the user is real — no local redirect effect needed.
    const { user, logout } = useAuthStore();

    const [posts, setPosts] = useState<BlogListItem[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // null until the request lands, so the tiles show a dash rather than a confident zero.
    const [stats, setStats] = useState<Stats | null>(null);

    const [pendingDelete, setPendingDelete] = useState<BlogListItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async () => {
        try {
            // author=me is resolved from the token server-side. This used to fetch the newest
            // posts site-wide at limit 5 and filter them in the browser, so you only saw your own
            // posts if they happened to be among the five most recent on the entire site.
            const [list, counts] = await Promise.all([
                blogService.getAll({ author: "me", page: 1, limit: PAGE_SIZE }),
                authService.getMyStats(),
            ]);
            setPosts(list.blogs ?? []);
            setPage(list.currentPage ?? 1);
            setHasMore(!!list.hasMore);
            setStats(counts);
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not load your profile."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const loadMore = async () => {
        if (isFetchingMore || !hasMore) return;
        setIsFetchingMore(true);
        try {
            const list = await blogService.getAll({
                author: "me",
                page: page + 1,
                limit: PAGE_SIZE,
            });
            // Dedupe by id: publishing between two page requests shifts everything down one, which
            // would otherwise render the boundary post twice.
            const seen = new Set(posts.map((p) => p._id));
            setPosts((prev) => [...prev, ...(list.blogs ?? []).filter((b) => !seen.has(b._id))]);
            setPage(list.currentPage ?? page + 1);
            setHasMore(!!list.hasMore);
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not load more posts."));
        } finally {
            setIsFetchingMore(false);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await blogService.delete(pendingDelete._id);
            setPosts((prev) => prev.filter((b) => b._id !== pendingDelete._id));
            setStats((s) => (s ? { ...s, blogs: Math.max(0, s.blogs - 1) } : s));
            toast.success("Post deleted");
            const removedId = pendingDelete._id;
            setPendingDelete(null);
            await revalidateBlog(removedId);
            router.refresh();
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not delete the post."));
        } finally {
            setDeleting(false);
        }
    };

    const signOut = () => {
        logout();
        toast.success("Signed out");
        router.push("/");
    };

    if (!user) return null;

    const joined = new Date(user.createdAt);

    return (
        <div className="max-w-feed py-4">
            <header className="border-border border-b pb-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex min-w-0 items-center gap-4">
                        <UserAvatar
                            username={user.username}
                            profilePicture={user.profilePicture}
                            className="size-16 shrink-0"
                        />
                        <div className="min-w-0">
                            <h1 className="text-2xl leading-tight font-normal">{user.username}</h1>
                            <p className="text-muted-foreground mt-1 truncate text-sm">
                                {user.email}
                            </p>
                            <p className="text-muted-foreground mt-1.5 text-[0.8125rem] tracking-[0.06em]">
                                Joined{" "}
                                <time dateTime={user.createdAt}>
                                    {joined.toLocaleDateString("en-GB", {
                                        month: "long",
                                        year: "numeric",
                                    })}
                                </time>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                        <Button variant="ghost" size="sm" render={<Link href="/blogs/create" />}>
                            <PenLine aria-hidden="true" />
                            Write
                        </Button>
                        <Button variant="ghost" size="sm" render={<Link href="/profile/edit" />}>
                            <Settings aria-hidden="true" />
                            Settings
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={signOut}
                        >
                            <LogOut aria-hidden="true" />
                            Sign out
                        </Button>
                    </div>
                </div>

                <div className="mt-8 flex gap-12">
                    <Stat value={stats?.blogs ?? null} label="Posts" />
                    <Stat value={stats?.comments ?? null} label="Comments" />
                    <Stat value={stats?.likesReceived ?? null} label="Likes received" />
                </div>
            </header>

            <section className="mt-8">
                <h2 className="sr-only">Your posts</h2>

                {isLoading ? (
                    <BlogGridSkeleton count={3} />
                ) : posts.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="Nothing published yet"
                        description="Your posts will collect here once you write one."
                        action={<Button render={<Link href="/blogs/create" />}>Write your first</Button>}
                    />
                ) : (
                    <div className="border-border border-t">
                        {posts.map((blog) => (
                            // The menu sits outside PostRow's stretched title link rather than on
                            // top of it, so the trigger is a real tab stop instead of something
                            // the row's own click target swallows.
                            <div key={blog._id} className="flex items-start gap-2">
                                <div className="min-w-0 flex-1">
                                    <PostRow blog={blog} />
                                </div>
                                <div className="shrink-0 pt-6">
                                    <PostActionsMenu
                                        blogId={blog._id}
                                        title={blog.title}
                                        onDelete={() => setPendingDelete(blog)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hasMore ? (
                    <div className="mt-6 flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadMore}
                            disabled={isFetchingMore}
                        >
                            {isFetchingMore ? <Loader2 className="animate-spin" /> : null}
                            {isFetchingMore ? "Loading…" : "Load more posts"}
                        </Button>
                    </div>
                ) : null}
            </section>

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
                onConfirm={confirmDelete}
            />
        </div>
    );
}
