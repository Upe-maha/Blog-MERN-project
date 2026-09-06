import type { Blog, BlogListResponse, PublicAuthor } from "@/types";

// Plain fetch, deliberately not the axios client: this runs on the server, where there is no
// localStorage to read a token from and no interceptor worth having. Every call here is anonymous,
// which is also what makes the responses cacheable.
//
// API_URL lets a deployment point server-side fetches at an internal address while the browser
// keeps using the public one.
const SERVER_API_URL =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// Render's free tier spins down after idle, so a cold first request can take ~50s. Failing fast
// with a readable error beats hanging the render.
const TIMEOUT_MS = 8_000;

// "This does not exist" and "I could not reach the API" are different answers and must not collapse
// into one. Returning null for both would render "Post not found" for every article the moment the
// API was slow or asleep — a far worse failure than an error page, because it looks authoritative.
export class ApiUnreachableError extends Error {}

async function fetchJson<T>(path: string, tags: string[], revalidate = 60): Promise<T | null> {
    let res: Response;
    try {
        res = await fetch(`${SERVER_API_URL}${path}`, {
            next: { revalidate, tags },
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (err) {
        throw new ApiUnreachableError(`${path}: ${(err as Error).message}`);
    }

    if (res.status === 404) return null; // genuinely absent
    if (!res.ok) throw new ApiUnreachableError(`${path}: ${res.status}`);
    return (await res.json()) as T;
}

// The list tolerates a failure: BlogFeed retries from the browser, so a sleeping API costs a
// moment rather than the whole route.
async function fetchJsonOrNull<T>(path: string, tags: string[], revalidate = 60): Promise<T | null> {
    try {
        return await fetchJson<T>(path, tags, revalidate);
    } catch (err) {
        console.error(`[server-api] ${path}`, err);
        return null;
    }
}

// Throws when the API is unreachable, so error.tsx renders instead of a misleading 404.
export async function getBlog(id: string): Promise<Blog | null> {
    const data = await fetchJson<{ blog: Blog }>(`/blogs/${id}`, [`blog:${id}`]);
    return data?.blog ?? null;
}

// The public projection: username, avatar and join date. Throws when the API is unreachable so
// a missing author page and a sleeping API stay distinguishable — same contract as getBlog.
export async function getUser(
    id: string
): Promise<(PublicAuthor & { createdAt: string }) | null> {
    const data = await fetchJson<{ user: PublicAuthor & { createdAt: string } }>(
        `/users/${id}`,
        [`user:${id}`]
    );
    return data?.user ?? null;
}

// Ids and timestamps for app/sitemap.ts. Tolerates failure — a sitemap missing its posts is a
// far better outcome than a build or a request that fails outright because the API was asleep.
export async function getBlogsForSitemap(): Promise<
    // updatedAt is optional on purpose: a row written by a migration or a script that skipped
    // timestamps genuinely has none, and the type should say so rather than lie.
    { _id: string; updatedAt?: string }[]
> {
    // An hour, matching app/sitemap.ts's own revalidate. Without this the inner fetch's 60s
    // default would win and the sitemap would rebuild every minute for no benefit.
    const data = await fetchJsonOrNull<{ blogs: { _id: string; updatedAt?: string }[] }>(
        "/blogs/sitemap",
        ["blogs"],
        3600
    );
    return data?.blogs ?? [];
}

export async function getBlogs(params: {
    page?: number;
    limit?: number;
    q?: string;
    author?: string;
}): Promise<BlogListResponse | null> {
    const search = new URLSearchParams();
    if (params.page) search.set("page", String(params.page));
    if (params.limit) search.set("limit", String(params.limit));
    if (params.q) search.set("q", params.q);
    if (params.author) search.set("author", params.author);

    const qs = search.toString();
    return fetchJsonOrNull<BlogListResponse>(`/blogs${qs ? `?${qs}` : ""}`, ["blogs"]);
}
