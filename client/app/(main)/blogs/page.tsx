"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useBlogStore, useAuthStore } from "@/stores";
import BlogCard from "@/components/blog/BlogCard";
import Link from "next/link";

function BlogsContent() {
    const searchParams = useSearchParams();
    const {
        blogs,
        isLoading,
        isFetchingMore,
        hasMore,
        currentPage,
        error,
        fetchBlogs,
        fetchMoreBlogs,
    } = useBlogStore();
    const { isAuthenticated, isHydrated } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");

    // Sentinel div that IntersectionObserver watches — must stay in DOM at all times
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // Fetch page 1 on mount — empty deps because fetchBlogs is a stable Zustand reference
    useEffect(() => {
        fetchBlogs(1, 5);
    }, []);

    // Sync search term with ?q= URL param
    useEffect(() => {
        setSearchTerm(searchParams.get("q") || "");
    }, [searchParams]);

    // Set up IntersectionObserver.
    // Re-runs every time currentPage changes so the observer re-attaches.
    // When the sentinel is already in the viewport at re-attach time the browser
    // fires the callback immediately — this handles the case where 5 blogs do not
    // fill the screen and the sentinel never leaves the viewport between pages.
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) return;
                // Read fresh state from the store — avoids stale closure over
                // hasMore / isFetchingMore captured at observer-creation time.
                const { hasMore, isFetchingMore } = useBlogStore.getState();
                if (hasMore && !isFetchingMore) {
                    fetchMoreBlogs(5);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [currentPage]); // reconnect after every page load

    const filteredBlogs = blogs.filter(
        (blog) =>
            blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            blog.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">All Blogs</h1>
                    <p className="text-gray-600">
                        {searchTerm
                            ? `Showing results for "${searchTerm}"`
                            : "Discover amazing stories from our community"}
                    </p>
                </div>
                {isHydrated && isAuthenticated && (
                    <Link
                        href="/blogs/create"
                        className="mt-4 md:mt-0 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                        + Create Blog
                    </Link>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Initial full-page spinner — rendered inside the layout, not an early return,
                so the sentinel div below always stays mounted */}
            {isLoading ? (
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-600">Loading blogs...</p>
                    </div>
                </div>
            ) : filteredBlogs.length === 0 ? (
                /* Empty state */
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">📝</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {searchTerm ? "No blogs match your search" : "No blogs found"}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {searchTerm ? "Try a different keyword." : "Be the first one to create a blog!"}
                    </p>
                    {!searchTerm && isHydrated && (
                        isAuthenticated ? (
                            <Link
                                href="/blogs/create"
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition inline-block"
                            >
                                Create Your First Blog
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition inline-block"
                            >
                                Login to Create Blog
                            </Link>
                        )
                    )}
                </div>
            ) : (
                /* Blog grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredBlogs.map((blog) => (
                        <BlogCard key={blog._id} blog={blog} />
                    ))}
                </div>
            )}

            {/* ── Sentinel ──────────────────────────────────────────────────────────
                Always mounted regardless of loading/empty state.
                IntersectionObserver targets this element. When it scrolls into view
                the observer fires fetchMoreBlogs. The 1px height makes it invisible
                but still observable by the browser. */}
            <div ref={sentinelRef} className="h-px" />

            {/* Small spinner while fetching the next page */}
            {isFetchingMore && (
                <div className="flex justify-center py-8">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* End-of-list message */}
            {!hasMore && !isLoading && filteredBlogs.length > 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">
                    You&apos;ve reached the end
                </p>
            )}
        </div>
    );
}

export default function BlogsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
        }>
            <BlogsContent />
        </Suspense>
    );
}
