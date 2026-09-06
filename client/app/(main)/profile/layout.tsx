import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";

// A signed-in-only surface has nothing to offer an index. robots.ts disallows it too; this
// is the per-page directive for a crawler that reached it anyway.
export const metadata: Metadata = {
    title: "Your profile",
    description: "Your posts and account.",
    robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    return <RequireAuth>{children}</RequireAuth>;
}
