import { cn } from "@/lib/utils";

// One place that owns page width and gutters. Previously the root layout applied max-w-7xl AND
// every page applied its own, doubling mobile padding and making full-bleed sections impossible.
export function Container({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={cn("mx-auto w-full max-w-page px-4 sm:px-6 lg:px-8", className)}>
            {children}
        </div>
    );
}
