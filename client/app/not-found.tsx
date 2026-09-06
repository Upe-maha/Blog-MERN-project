import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// Sits outside both route groups, so it renders without the navbar/footer chrome.
export default function NotFound() {
    return (
        <div className="grid min-h-dvh place-items-center px-4">
            <div className="w-full max-w-lg">
                <EmptyState
                    icon={FileQuestion}
                    title="Page not found"
                    description="The page you're looking for doesn't exist or has been moved."
                    action={
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button render={<Link href="/" />}>Go home</Button>
                            <Button variant="ghost" render={<Link href="/blogs" />}>
                                Browse essays
                            </Button>
                        </div>
                    }
                />
            </div>
        </div>
    );
}
