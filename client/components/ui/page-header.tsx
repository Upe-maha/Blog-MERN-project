import { cn } from "@/lib/utils";

// The type scale lives here. Before this, h1 was text-5xl/7xl/4xl/3xl/2xl/9xl depending on which
// page you happened to open.
//
// This is DESIGN.md's Headline role: Fraunces at 400, not 600. The serif carries the weight on its
// own, and a semibold Fraunces at 40px reads as shouting.
export function PageHeader({
    title,
    description,
    action,
    className,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
                className
            )}
        >
            <div className="space-y-2">
                <h1 className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.15] font-normal text-balance">
                    {title}
                </h1>
                {description ? (
                    <p className="font-serif text-muted-foreground max-w-reading text-lg leading-relaxed text-pretty">
                        {description}
                    </p>
                ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    );
}
