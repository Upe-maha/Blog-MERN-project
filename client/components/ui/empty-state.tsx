import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "border-border flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-16 text-center",
                className
            )}
        >
            <div className="bg-muted text-muted-foreground mb-4 grid size-12 place-items-center rounded-full">
                <Icon className="size-5" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? (
                <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">{description}</p>
            ) : null}
            {action ? <div className="mt-6">{action}</div> : null}
        </div>
    );
}
