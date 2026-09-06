"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore, useCommentStore, useLikeStore } from "@/stores";
import { emptyEntry } from "@/stores/likeStore";
import { Button } from "@/components/ui/button";
import { revalidateEngagement } from "@/app/actions";

export function LikeSection({
    blogId,
    initialLikesCount,
}: {
    blogId: string;
    initialLikesCount: number;
}) {
    const pathname = usePathname();
    const { isAuthenticated, isHydrated } = useAuthStore();

    const { likesCount, liked, pending } = useLikeStore((s) => s.byBlog[blogId]) ?? emptyEntry;
    const { hydrate, syncMine, toggle } = useLikeStore();

    // The comment count is the thread's own total, so posting a comment updates this link without
    // a refetch. Phase 3 keyed that store by blogId too.
    const commentsCount = useCommentStore((s) => s.byBlog[blogId]?.total ?? 0);

    useEffect(() => {
        // Seed from the server-rendered count first so the number is right on the very first
        // paint, then correct `liked` — which that payload always reports as false, because the
        // page was fetched by a server component with no token.
        hydrate(blogId, initialLikesCount, false);
        if (isHydrated && isAuthenticated) void syncMine(blogId);
    }, [blogId, initialLikesCount, isHydrated, isAuthenticated, hydrate, syncMine]);

    const onToggle = async () => {
        const error = await toggle(blogId);
        if (error) {
            toast.error(error);
            return;
        }
        // The like count is rendered into the cached archive row and the cached article, so both
        // have to be dropped — otherwise the number here and the number on /blogs disagree for a
        // minute.
        //
        // Awaited rather than `void`ed. This does not make the tag drop land any sooner — the
        // request is dispatched at the same moment either way — and it costs the reader nothing,
        // because the optimistic patch and the server round trip both already happened inside
        // toggle() above. What it buys is that a failure here surfaces as a rejection instead of
        // vanishing into an unobserved promise.
        await revalidateEngagement(blogId);
    };

    const countLabel = `${likesCount} ${likesCount === 1 ? "like" : "likes"}`;

    return (
        <div className="flex items-center gap-1">
            {isHydrated && !isAuthenticated ? (
                // A signed-out reader gets a link, not a button that fails. ?next= returns them
                // here rather than to the home page.
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    render={<Link href={`/login?next=${encodeURIComponent(pathname)}`} />}
                >
                    <Heart aria-hidden="true" />
                    {countLabel}
                </Button>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggle}
                    disabled={pending || !isHydrated}
                    aria-pressed={liked}
                    aria-label={liked ? "Unlike this post" : "Like this post"}
                    className={liked ? "text-primary hover:text-primary" : "text-muted-foreground"}
                >
                    {/* lucide, not an emoji. "🤍 3" is announced as "white heart 3"; the fill and
                        aria-pressed carry the state properly. */}
                    <Heart className={liked ? "fill-current" : undefined} aria-hidden="true" />
                    {countLabel}
                </Button>
            )}

            <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                render={<a href="#comments" />}
            >
                <MessageSquare aria-hidden="true" />
                {commentsCount} {commentsCount === 1 ? "comment" : "comments"}
            </Button>
        </div>
    );
}

export default LikeSection;
