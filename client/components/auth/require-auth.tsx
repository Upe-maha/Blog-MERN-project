"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { BlogGridSkeleton } from "@/components/skeletons";

// Waits for zustand's persist rehydration before deciding. Without the isHydrated gate, a hard
// refresh on a protected route reads an empty store and bounces an authenticated user to /login.
export function RequireAuth({
    children,
    requireAdmin = false,
}: {
    children: React.ReactNode;
    requireAdmin?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, isHydrated, user } = useAuthStore();

    const allowed = isAuthenticated && (!requireAdmin || user?.role === "admin");

    useEffect(() => {
        if (!isHydrated) return;
        if (!isAuthenticated) {
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        } else if (requireAdmin && user?.role !== "admin") {
            router.replace("/");
        }
    }, [isHydrated, isAuthenticated, requireAdmin, user?.role, router, pathname]);

    if (!isHydrated || !allowed) {
        return (
            <div aria-busy="true" aria-live="polite">
                <span className="sr-only">Checking your session…</span>
                <BlogGridSkeleton count={3} />
            </div>
        );
    }

    return <>{children}</>;
}

export default RequireAuth;
