import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// The (main) group needs its own boundary. Without one, notFound() from a route in this group
// resolved to the root app/not-found.tsx, which lives outside the group — and the group's layout
// rendered with an empty slot: navbar, footer, and nothing between them.
//
// Having it here also keeps the chrome, which is right: a missing post is a dead end inside the
// publication, not a dead end outside it, so the reader should still have the navigation.
export default function MainNotFound() {
    return (
        <div className="max-w-reading py-16">
            <EmptyState
                icon={FileQuestion}
                title="We couldn't find that"
                description="The post or page you're looking for doesn't exist, or it has been removed."
                action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button render={<Link href="/blogs" />}>Browse essays</Button>
                        <Button variant="ghost" render={<Link href="/" />}>
                            Go home
                        </Button>
                    </div>
                }
            />
        </div>
    );
}
