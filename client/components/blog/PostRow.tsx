import Image from "next/image";
import Link from "next/link";
import { MessageSquare, Heart } from "lucide-react";
import type { BlogListItem } from "@/types";
import { getImageUrl } from "@/lib/api";

// DESIGN.md's signature component, and the thing that replaced the card grid: a ruled row with no
// border, background, shadow or radius. The hairline and the air do the dividing.
//
// A server component — nothing here is interactive beyond the links, so none of it needs shipping
// to the browser.
export function PostRow({ blog }: { blog: BlogListItem }) {
    // null rather than getImageUrl's "" for a missing cover, so the type says the src is either a
    // real URL or absent — an empty string would render a broken-image box.
    const cover = blog.imageUrl ? getImageUrl(blog.imageUrl) : null;
    const published = new Date(blog.createdAt);
    const authorId = blog.author?._id;

    return (
        // The row carries two destinations now — the post and its author — so it can no longer be
        // one big <Link>: an <a> inside an <a> is invalid HTML and browsers silently unnest it.
        // The title's ::after covers the row instead, keeping the whole thing clickable, and the
        // author link sits above it by coming later in the DOM.
        <article className="border-border relative border-b">
            <div className="hover:bg-surface-hover group -mx-3 flex items-start justify-between gap-5 rounded-sm px-3 py-6 transition-colors sm:gap-8">
                <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-xl leading-snug font-medium tracking-[-0.01em] text-balance">
                        {/* prefetch={false}: a feed of N rows otherwise fires 2N RSC prefetches
                            the moment it paints — one per post and one per author — and each post
                            prefetch costs the API a full read. App Router still prefetches on
                            hover and touchstart, so a click that is actually coming is still warm. */}
                        <Link
                            href={`/blogs/${blog._id}`}
                            prefetch={false}
                            className="group-hover:text-primary rounded-sm transition-colors after:absolute after:inset-0"
                        >
                            {blog.title}
                        </Link>
                    </h2>

                    {blog.excerpt ? (
                        <p className="text-muted-foreground font-serif mt-2 line-clamp-2 leading-relaxed">
                            {blog.excerpt}
                        </p>
                    ) : null}

                    <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] tracking-[0.06em]">
                        {authorId ? (
                            <Link
                                href={`/users/${authorId}`}
                                prefetch={false}
                                className="hover:text-foreground relative rounded-sm transition-colors"
                            >
                                {blog.author.username}
                            </Link>
                        ) : (
                            <span>{blog.author?.username ?? "Unknown"}</span>
                        )}
                        <span aria-hidden="true">·</span>
                        {/* A machine-readable date, so the timestamp means something to a crawler. */}
                        <time dateTime={blog.createdAt}>
                            {published.toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                            })}
                        </time>
                        <span aria-hidden="true">·</span>
                        <span>{blog.readingMinutes} min</span>

                        {blog.likesCount > 0 ? (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1">
                                    <Heart className="size-3.5" aria-hidden="true" />
                                    {blog.likesCount}
                                    <span className="sr-only"> likes</span>
                                </span>
                            </>
                        ) : null}

                        {blog.commentsCount > 0 ? (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1">
                                    <MessageSquare className="size-3.5" aria-hidden="true" />
                                    {blog.commentsCount}
                                    <span className="sr-only"> comments</span>
                                </span>
                            </>
                        ) : null}
                    </div>
                </div>

                {/* A thumbnail beside the text, not a banner above it. Explicit dimensions are the
                    CLS fix — the old card used two raw <img> tags with no size at all. */}
                {cover ? (
                    <Image
                        src={cover}
                        alt=""
                        width={96}
                        height={96}
                        sizes="96px"
                        className="border-border size-20 shrink-0 rounded-sm border object-cover sm:size-24"
                    />
                ) : null}
            </div>
        </article>
    );
}

export default PostRow;
