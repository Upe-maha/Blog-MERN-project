import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getUser, getBlogs } from "@/lib/server-api";
import { UserAvatar } from "@/components/ui/user-avatar";
import { EmptyState } from "@/components/ui/empty-state";
import PostRow from "@/components/blog/PostRow";

type Params = { params: Promise<{ id: string }> };

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { id } = await params;
    const user = await getUser(id);

    // notFound() here as well as in the component: returning metadata successfully lets Next commit
    // a 200 before the page throws, which serves a missing author as a soft 404.
    if (!user) notFound();

    return {
        title: user.username,
        description: `Posts written by ${user.username} on Marginalia.`,
        alternates: { canonical: `/users/${id}` },
        openGraph: {
            type: "profile",
            title: user.username,
            description: `Posts written by ${user.username} on Marginalia.`,
            url: `/users/${id}`,
            // Declaring an openGraph block at all replaces the parent's rather than merging into
            // it, so without naming an image here this page would have no og:image — the same way
            // the post page silently lost its card. There is no per-author card, so it points at
            // the site one; metadataBase makes the path absolute.
            images: ["/opengraph-image"],
        },
    };
}

// A server component, and another indexable page: an author's archive is a real destination, and
// before this the only route to it was the /blogs list filtered by hand.
//
// The public projection is username, avatar and join date — getPublicUserById is an allow-list, so
// no email, role or block status reaches this page even though it renders a user.
export default async function PublicProfilePage({ params }: Params) {
    const { id } = await params;

    const [user, posts] = await Promise.all([
        getUser(id),
        getBlogs({ author: id, limit: PAGE_SIZE }),
    ]);

    if (!user) notFound();

    const joined = new Date(user.createdAt);
    const total = posts?.total ?? 0;

    return (
        <div className="max-w-feed py-4">
            <header className="border-border flex items-center gap-4 border-b pb-8">
                <UserAvatar
                    username={user.username}
                    profilePicture={user.profilePicture}
                    className="size-16 shrink-0"
                />
                <div className="min-w-0">
                    <h1 className="text-2xl leading-tight font-normal">{user.username}</h1>
                    <p className="text-muted-foreground mt-1.5 text-[0.8125rem] tracking-[0.06em]">
                        {total} {total === 1 ? "post" : "posts"}
                        <span aria-hidden="true"> · </span>
                        joined{" "}
                        <time dateTime={user.createdAt}>
                            {joined.toLocaleDateString("en-GB", {
                                month: "long",
                                year: "numeric",
                            })}
                        </time>
                    </p>
                </div>
            </header>

            {posts && posts.blogs.length > 0 ? (
                <div className="mt-8">
                    {posts.blogs.map((blog) => (
                        <PostRow key={blog._id} blog={blog} />
                    ))}
                </div>
            ) : (
                <div className="mt-8">
                    <EmptyState
                        icon={FileText}
                        title="Nothing published yet"
                        description={`${user.username} hasn't posted anything here.`}
                    />
                </div>
            )}
        </div>
    );
}
