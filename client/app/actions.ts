"use server";

import { updateTag } from "next/cache";

// The missing half of the caching design.
//
// lib/server-api.ts already tags every fetch — "blogs" for the list, `blog:<id>` for one post — and
// caches them for 60s so a cold visitor and a crawler are not left waiting on the API. Nothing ever
// invalidated those tags, so after publishing you kept seeing the previous list until the window
// expired.
//
// router.refresh() alone does not fix it: it re-runs the server components, but they hit the same
// cached fetch and get the same stale body back. The tag has to be invalidated on the server.
//
// updateTag rather than revalidateTag: it is the Next 16 API for read-your-own-writes from a server
// action, which is exactly this — the person who just published must see their post, now.

/** A post was created or destroyed: which posts exist has changed. */
export async function revalidateBlogs() {
    updateTag("blogs");
}

/** One post changed — its own page, and every list its row appears in. */
export async function revalidateBlog(id: string) {
    updateTag(`blog:${id}`);
    updateTag("blogs");
}

/**
 * A like or a comment. Neither changes the post's text, but both change counts that are rendered
 * into the cached list row and the cached article, so both tags still have to go.
 */
export async function revalidateEngagement(blogId: string) {
    updateTag(`blog:${blogId}`);
    updateTag("blogs");
}

/** A profile edit: the author's name and avatar are embedded in every row they wrote. */
export async function revalidateUser(id: string) {
    updateTag(`user:${id}`);
    updateTag("blogs");
}
