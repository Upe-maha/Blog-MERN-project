"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { Comment } from "@/types";
import { useAuthStore, useCommentStore } from "@/stores";
import { emptyThread } from "@/stores/commentStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CommentThreadSkeleton } from "@/components/skeletons";
import { revalidateEngagement } from "@/app/actions";

const MAX_LENGTH = 2000;
// Below this the counter is noise; above it, it is the thing you need to see.
const COUNTER_FROM = 1600;

function timestamp(iso: string) {
    const date = new Date(iso);
    return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        absolute: date.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }),
    };
}

// One editor for both composing and editing, so the character cap, the counter and Enter-to-submit
// cannot drift apart between the two.
function CommentEditor({
    value,
    onChange,
    onSubmit,
    onCancel,
    submitLabel,
    pending,
    label,
    placeholder,
    autoFocus,
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    submitLabel: string;
    pending: boolean;
    label: string;
    placeholder?: string;
    autoFocus?: boolean;
}) {
    const trimmed = value.trim();
    const tooLong = value.length > MAX_LENGTH;
    const canSubmit = trimmed.length > 0 && !tooLong && !pending;

    // Enter posts, Shift+Enter breaks the line — kept from the original, which got this right.
    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSubmit) onSubmit();
        }
        if (e.key === "Escape" && onCancel) onCancel();
    };

    return (
        <div className="space-y-2">
            <Textarea
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                aria-invalid={tooLong || undefined}
                // field-sizing-content on the primitive grows the box as you type; the cap keeps a
                // long comment from pushing the thread off screen.
                className="max-h-56 min-h-11 resize-none py-2.5"
            />

            <div className="flex items-center justify-between gap-3">
                <span
                    aria-live="polite"
                    className={`text-xs tabular-nums ${
                        tooLong ? "text-destructive" : "text-muted-foreground"
                    }`}
                >
                    {value.length >= COUNTER_FROM
                        ? `${value.length.toLocaleString()} / ${MAX_LENGTH.toLocaleString()}`
                        : ""}
                </span>

                <div className="flex items-center gap-1">
                    {onCancel ? (
                        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
                            Cancel
                        </Button>
                    ) : null}
                    <Button size="sm" onClick={onSubmit} disabled={!canSubmit}>
                        {pending ? <Loader2 className="animate-spin" /> : null}
                        {submitLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function CommentRow({
    comment,
    canEdit,
    canDelete,
    onSave,
    onRequestDelete,
}: {
    comment: Comment;
    canEdit: boolean;
    canDelete: boolean;
    onSave: (id: string, content: string) => Promise<boolean>;
    onRequestDelete: (comment: Comment) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(comment.content);
    const [saving, setSaving] = useState(false);

    // A temporary id means the POST has not come back yet; the row is on screen but not yet a
    // thing the server knows about, so it cannot be edited or deleted.
    const pendingInsert = comment._id.startsWith("temp-");
    const { relative, absolute } = timestamp(comment.createdAt);
    const edited = comment.updatedAt !== comment.createdAt;

    const save = async () => {
        setSaving(true);
        const ok = await onSave(comment._id, draft.trim());
        setSaving(false);
        if (ok) setEditing(false);
    };

    return (
        <article
            className={`border-border flex gap-3 border-b py-5 last:border-b-0 ${
                pendingInsert ? "opacity-60" : ""
            }`}
        >
            <UserAvatar
                username={comment.user?.username}
                profilePicture={comment.user?.profilePicture}
                className="size-8 shrink-0"
            />

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-[0.8125rem] tracking-[0.06em]">
                        <span className="text-foreground">
                            {comment.user?.username ?? "Unknown"}
                        </span>
                        <span className="text-muted-foreground" aria-hidden="true">
                            {" · "}
                        </span>
                        <time className="text-muted-foreground" dateTime={comment.createdAt} title={absolute}>
                            {relative}
                        </time>
                        {edited ? (
                            <span className="text-muted-foreground"> · edited</span>
                        ) : null}
                    </p>

                    {/* Mirrors the server's permission chain — it decides what to show, never what
                        is allowed. Forge the request and the API answers 403. */}
                    {!editing && !pendingInsert && (canEdit || canDelete) ? (
                        <div className="flex shrink-0 items-center gap-0.5">
                            {canEdit ? (
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => {
                                        setDraft(comment.content);
                                        setEditing(true);
                                    }}
                                >
                                    Edit
                                    <span className="sr-only"> comment by {comment.user?.username}</span>
                                </Button>
                            ) : null}
                            {canDelete ? (
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => onRequestDelete(comment)}
                                >
                                    Delete
                                    <span className="sr-only"> comment by {comment.user?.username}</span>
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {editing ? (
                    <div className="mt-3">
                        <CommentEditor
                            value={draft}
                            onChange={setDraft}
                            onSubmit={save}
                            onCancel={() => {
                                setDraft(comment.content);
                                setEditing(false);
                            }}
                            submitLabel="Save"
                            pending={saving}
                            label="Edit your comment"
                            autoFocus
                        />
                    </div>
                ) : (
                    // Serif: a comment is read, not operated. whitespace-pre-line keeps the line
                    // breaks the writer typed without letting raw markdown render.
                    <p className="font-serif mt-1.5 leading-relaxed break-words whitespace-pre-line">
                        {comment.content}
                    </p>
                )}
            </div>
        </article>
    );
}

export function CommentSection({
    blogId,
    blogAuthorId,
}: {
    blogId: string;
    blogAuthorId?: string;
}) {
    const { user, isAuthenticated, isHydrated } = useAuthStore();
    const thread = useCommentStore((s) => s.byBlog[blogId]) ?? emptyThread;
    const { fetchComments, fetchMoreComments, addComment, updateComment, deleteComment } =
        useCommentStore();

    const [draft, setDraft] = useState("");
    const [posting, setPosting] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Guards against the double fetch a Strict Mode remount would otherwise cause.
    const loadedFor = useRef<string | null>(null);
    useEffect(() => {
        if (loadedFor.current === blogId) return;
        loadedFor.current = blogId;
        void fetchComments(blogId);
    }, [blogId, fetchComments]);

    const post = async () => {
        const content = draft.trim();
        if (!content) return;

        if (!isAuthenticated || !user) {
            // Nearly unreachable — the composer is only rendered for signed-in readers — but this
            // is the path a token that expired mid-visit takes.
            toast.error("Please sign in to comment.");
            return;
        }

        setPosting(true);
        const ok = await addComment(blogId, content, user);
        setPosting(false);

        if (ok) {
            setDraft("");
            // Same reason as likes, including the await: the comment is already on screen
            // optimistically, so waiting here delays nothing the reader sees, and an error stops
            // disappearing into an unobserved promise.
            await revalidateEngagement(blogId);
        } else {
            toast.error(useCommentStore.getState().byBlog[blogId]?.error ?? "Could not post your comment.");
        }
    };

    const save = async (id: string, content: string) => {
        const ok = await updateComment(blogId, id, content);
        if (ok) toast.success("Comment updated");
        // An edit does not change the count, so no revalidation is needed — the cached row already
        // shows the right number.
        else toast.error(useCommentStore.getState().byBlog[blogId]?.error ?? "Could not save your edit.");
        return ok;
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        const ok = await deleteComment(blogId, pendingDelete._id);
        setDeleting(false);
        if (ok) {
            toast.success("Comment deleted");
            setPendingDelete(null);
            await revalidateEngagement(blogId);
        } else {
            toast.error(useCommentStore.getState().byBlog[blogId]?.error ?? "Could not delete the comment.");
        }
    };

    const isMine = (c: Comment) => !!user && c.user?._id === user._id;
    // Moderation: the post's author can remove comments on their own essay, as can an admin.
    const canModerate =
        !!user && (user.role === "admin" || (!!blogAuthorId && user._id === blogAuthorId));

    return (
        <div>
            <h2 className="text-xl font-medium tracking-[-0.01em]">
                Comments
                {thread.total > 0 ? (
                    <span className="text-muted-foreground font-sans text-base font-normal">
                        {" "}
                        ({thread.total})
                    </span>
                ) : null}
            </h2>

            {/* isHydrated gates the composer so a signed-in reader never sees the sign-in prompt
                flash before the persisted store rehydrates. */}
            {!isHydrated ? (
                <div className="border-border mt-5 h-24 rounded-lg border border-dashed" />
            ) : isAuthenticated && user ? (
                <div className="mt-5 flex gap-3">
                    <UserAvatar
                        username={user.username}
                        profilePicture={user.profilePicture}
                        className="mt-1 size-8 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <CommentEditor
                            value={draft}
                            onChange={setDraft}
                            onSubmit={post}
                            submitLabel="Post"
                            pending={posting}
                            label="Write a comment"
                            placeholder="Add to the conversation… (Enter to post)"
                        />
                    </div>
                </div>
            ) : (
                <p className="text-muted-foreground mt-5 text-sm">
                    <Link
                        href={`/login?next=${encodeURIComponent(`/blogs/${blogId}#comments`)}`}
                        className="text-primary rounded-sm underline underline-offset-4"
                    >
                        Sign in
                    </Link>{" "}
                    to join the conversation.
                </p>
            )}

            <div className="mt-8">
                {thread.isLoading ? (
                    <CommentThreadSkeleton />
                ) : thread.items.length === 0 ? (
                    <div className="border-border text-muted-foreground flex items-center gap-2.5 border-t py-8 text-sm">
                        <MessageSquare className="size-4 shrink-0" aria-hidden="true" />
                        No comments yet.
                    </div>
                ) : (
                    <div className="border-border border-t">
                        {thread.items.map((comment) => (
                            <CommentRow
                                key={comment._id}
                                comment={comment}
                                canEdit={isMine(comment)}
                                canDelete={isMine(comment) || canModerate}
                                onSave={save}
                                onRequestDelete={setPendingDelete}
                            />
                        ))}
                    </div>
                )}

                {thread.hasMore ? (
                    <div className="mt-6 flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void fetchMoreComments(blogId)}
                            disabled={thread.isFetchingMore}
                        >
                            {thread.isFetchingMore ? <Loader2 className="animate-spin" /> : null}
                            {thread.isFetchingMore ? "Loading…" : "Load more comments"}
                        </Button>
                    </div>
                ) : null}
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={(open) => {
                    if (!open) setPendingDelete(null);
                }}
                title="Delete this comment?"
                description="The comment is removed for everyone. This cannot be undone."
                confirmLabel="Delete comment"
                destructive
                loading={deleting}
                onConfirm={confirmDelete}
            />
        </div>
    );
}

export default CommentSection;
