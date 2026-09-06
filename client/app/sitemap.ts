import type { MetadataRoute } from "next";
import { getBlogsForSitemap } from "@/lib/server-api";
import { siteUrl } from "./layout";

// Regenerated hourly rather than pinned at build time, so a post published after the last deploy
// still reaches a crawler.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    // Only what a stranger can actually open. /profile, /admin and /blogs/create are signed-in
    // routes and are excluded here as well as in robots.ts.
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${siteUrl}/blogs`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ];

    const blogs = await getBlogsForSitemap();

    // lastModified is optional in the sitemap spec, and one row with a missing or malformed
    // timestamp must not take the whole file down with it — `new Date(undefined).toISOString()`
    // throws RangeError, and inside a prerendered route that fails the entire build. A row
    // inserted by a migration or a script that skipped timestamps is enough to trigger it.
    const modified = (iso: string | undefined): Date | undefined => {
        if (!iso) return undefined;
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? undefined : d;
    };

    return [
        ...staticRoutes,
        ...blogs.map((b) => ({
            url: `${siteUrl}/blogs/${b._id}`,
            // The post's own timestamp, not the build's — that is the entire signal a crawler uses
            // to decide whether re-fetching is worth it.
            lastModified: modified(b.updatedAt),
            changeFrequency: "weekly" as const,
            priority: 0.7,
        })),
    ];
}
