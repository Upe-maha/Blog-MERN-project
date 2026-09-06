"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuthStore } from "@/stores";

// A rendering decision, not an authorisation one: the API re-checks ownership on the PUT and
// answers 403 whatever this component shows.
export function EditGuard({
    authorId,
    children,
}: {
    authorId?: string;
    children: React.ReactNode;
}) {
    const { user, isHydrated } = useAuthStore();

    if (!isHydrated) return null;

    const allowed = !!user && (user._id === authorId || user.role === "admin");
    if (allowed) return <>{children}</>;

    return (
        <div className="max-w-reading py-4">
            <EmptyState
                icon={Lock}
                title="This isn't your post"
                description="Only the author can edit it."
                action={
                    <Button variant="ghost" render={<Link href="/blogs" />}>
                        Back to essays
                    </Button>
                }
            />
        </div>
    );
}

export default EditGuard;
