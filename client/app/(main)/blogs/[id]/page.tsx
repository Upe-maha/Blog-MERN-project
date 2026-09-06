import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBlog } from "@/lib/server-api";
import { getImageUrl } from "@/lib/api";
import { siteUrl } from "@/app/layout";
import { toPlainText, truncate } from "@/lib/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import Markdown from "@/components/blog/Markdown";
import BlogActions from "./blog-actions";
import LikeSection from "@/components/blog/LikeSection";
import CommentSection from "@/components/blog/CommentSection";

type Params = { params: Promise<{ id: string }> };

// This is what a crawler and a link preview actually read. Before this the route was "use client"
// fetching in an effect, so every share of every post previewed as an empty spinner.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { id } = await params;
    const blog = await getBlog(id);

    // notFound() here, not just in the component. Returning metadata successfully lets Next commit
    // the response before the page throws, which produced a soft 404: the right page rendered with
    // a 200 status, telling crawlers a missing post was a real one.
    if (!blog) notFound();

    // Plain text, not raw markdown — a preview card reading "## The case for patience"
    // is a bug the reader meets before they ever reach the page.
    const description = truncate(toPlainText(blog.description), 155);

    return {
        title: blog.title,
        description,
        alternates: { canonical: `/blogs/${id}` },
        openGraph: {
            type: "article",
            title: blog.title,
            description,
            url: `/blogs/${id}`,
            publishedTime: blog.createdAt,
            modifiedTime: blog.updatedAt,
            authors: blog.author?.username ? [blog.author.username] : undefined,
            // No `images` key on purpose. Setting one here — even to undefined — suppresses the
            // file-convention image from opengraph-image.tsx, which is how this page ended up with
            // no og:image at all. The generated card is also the better preview: it always exists,
            // and it carries the title, author and date rather than a cropped cover photo.
        },
        twitter: {
            // Unconditional, because the generated card is always there.
            card: "summary_large_image",
            title: blog.title,
            description,
        },
    };
}

export default async function BlogPage({ params }: Params) {
    const { id } = await params;
    const blog = await getBlog(id);

    // notFound() renders the 404 route with a real 404 status. The old page rendered its own
    // "not found" markup with a 200, which told crawlers the missing post was a real page.
    if (!blog) notFound();

    const cover = blog.imageUrl ? getImageUrl(blog.imageUrl) : null;
    const published = new Date(blog.createdAt);

    // Rendered from the server component, so a crawler gets it in the HTML rather than after a
    // hydration it may never perform. dangerouslySetInnerHTML is the documented way to emit a JSON-LD
    // script: React would otherwise escape the quotes and hand Google an unparseable blob.
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: blog.title,
        description: truncate(toPlainText(blog.description), 155),
        datePublished: blog.createdAt,
        dateModified: blog.updatedAt,
        author: blog.author?.username
            ? {
                  "@type": "Person",
                  name: blog.author.username,
                  ...(blog.author._id ? { url: `${siteUrl}/users/${blog.author._id}` } : {}),
              }
            : undefined,
        ...(cover ? { image: [cover] } : {}),
        mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blogs/${id}` },
        publisher: { "@type": "Organization", name: "Marginalia", url: siteUrl },
        wordCount: blog.description.trim().split(/\s+/).length,
        commentCount: blog.commentsCount ?? 0,
    };

    return (
        <div className="max-w-reading py-4">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Link
                href="/blogs"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm text-sm transition-colors"
            >
                <ArrowLeft className="size-4" aria-hidden="true" />
                All essays
            </Link>

            <article className="mt-8">
                <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.15] font-normal text-balance">
                    {blog.title}
                </h1>

                <div className="border-border mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-6">
                    <UserAvatar
                        username={blog.author?.username}
                        profilePicture={blog.author?.profilePicture}
                        className="size-9"
                    />
                    <div className="text-muted-foreground text-[0.8125rem] tracking-[0.06em]">
                        <span className="text-foreground">{blog.author?.username ?? "Unknown"}</span>
                        <span aria-hidden="true"> · </span>
                        <time dateTime={blog.createdAt}>
                            {published.toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </time>
                        <span aria-hidden="true"> · </span>
                        <span>{blog.readingMinutes} min read</span>
                    </div>
                </div>

                {/* Above the body, where a cover image belongs. It used to render *after* the text,
                    which is why the article read oddly. */}
                {cover ? (
                    <Image
                        src={cover}
                        alt=""
                        width={1200}
                        height={675}
                        sizes="(min-width: 42rem) 42rem, 100vw"
                        priority
                        className="border-border mt-8 w-full rounded-sm border object-cover"
                    />
                ) : null}

                {/* prose is themed in globals.css: 18px Fraunces on a 68ch measure. */}
                <div className="prose mt-8">
                    <Markdown>{blog.description}</Markdown>
                </div>
            </article>

            <div className="border-border mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
                <LikeSection blogId={blog._id} initialLikesCount={blog.likesCount ?? 0} />
                <BlogActions blogId={blog._id} authorId={blog.author?._id} />
            </div>

            <section id="comments" className="mt-12 scroll-mt-20">
                <CommentSection blogId={blog._id} blogAuthorId={blog.author?._id} />
            </section>
        </div>
    );
}
