"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuthStore } from "@/stores";
import { blogService } from "@/services/blogService";
import { getErrorMessage } from "@/lib/errorHandler";
import { revalidateBlog } from "@/app/actions";
import { useBlogStore } from "@/stores";

// The only interactive part of the article, split out so the page itself can stay a server
// component. Ownership here mirrors requireOwnership on the server — it decides what to *show*,
// never what is *allowed*; the API re-checks on every request.
export function BlogActions({ blogId, authorId }: { blogId: string; authorId?: string }) {
    const router = useRouter();
    const { user, isHydrated } = useAuthStore();
    const [confirming, setConfirming] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const canEdit = isHydrated && !!user && (user._id === authorId || user.role === "admin");

    const share = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied");
        } catch {
            toast.error("Couldn't copy the link");
        }
    };

    const remove = async () => {
        setDeleting(true);
        try {
            await blogService.delete(blogId);
            toast.success("Post deleted");
            setConfirming(false);
            // Drop the row from the feed store as well as the server cache. The store is what
            // /blogs renders from once it has taken over, and it outlives this navigation — so
            // without this the reader lands back on the archive and sees the post they just
            // deleted still sitting there.
            useBlogStore.getState().removeBlog(blogId);
            // The archive must drop the row now, not when the cache window happens to expire.
            await revalidateBlog(blogId);
            router.refresh();
            router.push("/blogs");
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not delete the post."));
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" onClick={share}>
                <Link2 />
                Copy link
            </Button>

            {canEdit ? (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/blogs/${blogId}/edit`} />}
                    >
                        <Pencil />
                        Edit
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirming(true)}
                    >
                        <Trash2 />
                        Delete
                    </Button>
                </>
            ) : null}

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title="Delete this post?"
                description="The post and all of its comments and likes are removed. This cannot be undone."
                confirmLabel="Delete post"
                destructive
                loading={deleting}
                onConfirm={remove}
            />
        </div>
    );
}

export default BlogActions;
