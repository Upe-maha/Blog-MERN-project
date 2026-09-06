"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="grid min-h-dvh place-items-center px-4">
            <div className="w-full max-w-lg">
                <EmptyState
                    icon={TriangleAlert}
                    title="Something went wrong"
                    description="An unexpected error occurred. Trying again often fixes it."
                    action={<Button onClick={reset}>Try again</Button>}
                />
            </div>
        </div>
    );
}
