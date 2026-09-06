"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Previously this was an avatar sitting next to a Logout button, despite the name. It is now an
// actual menu, which also gets keyboard navigation and an accessible name.
const UserMenu = () => {
    const { user, logout, isAuthenticated, isHydrated } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    // Guards itself rather than relying on its parent, because it is now rendered at every width —
    // NavLinks is hidden below md, and the account still has to be reachable there. Nothing until
    // the store rehydrates, or the avatar flashes in for signed-out visitors on every load.
    if (!isHydrated || !isAuthenticated) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button
                        type="button"
                        className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:ring-offset-2"
                        aria-label="Account menu"
                    >
                        <UserAvatar
                            username={user?.username}
                            profilePicture={user?.profilePicture}
                            className="size-8"
                        />
                    </button>
                }
            />
            <DropdownMenuContent align="end" className="w-56">
                {/* A plain header, not DropdownMenuLabel. That maps to Base UI's Menu.GroupLabel,
                    which throws without a Menu.Group ancestor — and wrapping this in an empty group
                    just to satisfy it would announce a group containing no items. This is the
                    account's identity, not a label for the entries below it. */}
                <div className="px-1.5 py-1 text-xs">
                    <span className="block truncate font-medium">{user?.username}</span>
                    <span className="text-muted-foreground block truncate font-normal">
                        {user?.email}
                    </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/profile" />}>
                    <UserIcon />
                    Profile
                </DropdownMenuItem>
                {user?.role === "admin" ? (
                    <DropdownMenuItem render={<Link href="/admin" />}>
                        <LayoutDashboard />
                        Dashboard
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut />
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default UserMenu;
