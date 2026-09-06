import { Skeleton } from "@/components/ui/skeleton";

// Replaces eight copies of the same hand-rolled spinner div. A skeleton keeps the layout stable
// instead of collapsing to a centred ring and then reflowing.

export function PostRowSkeleton() {
    return (
        <div className="border-border flex items-start justify-between gap-5 border-b py-6 sm:gap-8">
            <div className="min-w-0 flex-1 space-y-3">
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="size-20 shrink-0 rounded-sm sm:size-24" />
        </div>
    );
}

export function BlogGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="border-border border-t">
            {Array.from({ length: count }, (_, i) => (
                <PostRowSkeleton key={i} />
            ))}
        </div>
    );
}

export function ArticleSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="aspect-[16/9] w-full rounded-xl" />
            <div className="space-y-3">
                {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-4 w-full last:w-1/2" />
                ))}
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Skeleton className="size-9 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                </div>
            ))}
        </div>
    );
}

export function CommentThreadSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="border-border border-t">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="border-border flex gap-3 border-b py-5 last:border-b-0">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2.5">
                        <Skeleton className="h-3 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/5" />
                    </div>
                </div>
            ))}
        </div>
    );
}
