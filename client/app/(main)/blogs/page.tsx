import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { getBlogs } from "@/lib/server-api";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import BlogFeed from "./blog-feed";

const PAGE_SIZE = 9;

export async function generateMetadata({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
    const { q } = await searchParams;
    return q
        ? // A search results page is not a destination: it has no stable content to index, and
          // its canonical points at the unfiltered archive so ?q= variants do not compete with it.
          {
              title: `Search: ${q}`,
              robots: { index: false },
              alternates: { canonical: "/blogs" },
          }
        : {
              title: "Essays",
              description: "Everything published on Marginalia, newest first.",
              alternates: { canonical: "/blogs" },
          };
}

// A server component: page 1 is rendered on the server, so a crawler and a cold visitor both get
// real posts in the HTML instead of a spinner. BlogFeed takes over for appending.
//
// In Next 16 `searchParams` is a Promise — awaiting it is mandatory.
export default async function BlogsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const query = q?.trim() ?? "";

    const initial = await getBlogs({ page: 1, limit: PAGE_SIZE, q: query || undefined });

    return (
        <div className="max-w-feed py-4">
            <PageHeader
                title={query ? "Search" : "Essays"}
                description={
                    query
                        ? `Posts matching “${query}”.`
                        : "Everything published here, newest first."
                }
                action={
                    // Always shown: a signed-out visitor is sent to the login page by proxy.ts with
                    // ?next= set, so the button works rather than hiding until the store rehydrates.
                    <Button variant="ghost" render={<Link href="/blogs/create" />}>
                        <PenLine />
                        Write
                    </Button>
                }
            />

            <BlogFeed initial={initial} query={query} />
        </div>
    );
}
