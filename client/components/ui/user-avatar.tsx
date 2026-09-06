import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getImageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

// Replaces six hand-rolled copies of "coloured circle containing the first letter".
export function UserAvatar({
    username,
    profilePicture,
    className,
}: {
    username?: string | null;
    profilePicture?: string | null;
    className?: string;
}) {
    const name = username?.trim() || "Unknown";
    const src = profilePicture ? getImageUrl(profilePicture) : "";

    return (
        <Avatar className={cn("size-9", className)}>
            {src ? <AvatarImage src={src} alt="" /> : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold uppercase">
                {name.slice(0, 2)}
            </AvatarFallback>
        </Avatar>
    );
}
