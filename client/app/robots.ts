import type { MetadataRoute } from "next";
import { siteUrl } from "./layout";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Signed-in surfaces and the API. None of them are secret — the API re-checks every
            // token regardless — they simply have nothing to offer an index, and a crawler
            // hammering /admin is wasted crawl budget.
            disallow: ["/admin", "/profile", "/blogs/create", "/api/", "/login", "/register"],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}
