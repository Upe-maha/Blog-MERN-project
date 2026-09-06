import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";

// A signed-in-only surface has nothing to offer an index. robots.ts disallows it too; this
// is the per-page directive for a crawler that reached it anyway.
export const metadata: Metadata = {
    title: "Admin",
    description: "Manage people and posts.",
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <RequireAuth requireAdmin>{children}</RequireAuth>;
}
