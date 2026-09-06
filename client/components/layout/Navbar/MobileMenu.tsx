"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Menu, PenLine, Newspaper, User as UserIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

// A Sheet rather than a hand-rolled dropdown: the old menu had no aria-expanded, no Escape
// handler, no outside-click close and no scroll lock. The primitive provides all of them.
const MobileMenu = () => {
    const { isAuthenticated, isHydrated, user } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        useAuthStore.getState().logout();
        router.push("/");
    };

    const links = [
        { href: "/blogs", label: "Essays", Icon: Newspaper, show: true },
        { href: "/blogs/create", label: "Write", Icon: PenLine, show: isAuthenticated },
        { href: "/profile", label: "Profile", Icon: UserIcon, show: isAuthenticated },
        {
            href: "/admin",
            label: "Dashboard",
            Icon: LayoutDashboard,
            show: isAuthenticated && user?.role === "admin",
        },
    ];

    return (
        <Sheet>
            <SheetTrigger
                render={
                    <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                        <Menu />
                    </Button>
                }
            />
            <SheetContent side="right" className="w-[85vw] max-w-sm">
                <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-6 px-4 pb-6">
                    {/* Search moved out to its own nav control (MobileSearch). A text input sat
                        oddly among a list of destinations, and burying the site's main way of
                        finding anything behind the burger cost it two extra interactions. */}
                    <nav className="flex flex-col gap-1">
                        {links
                            .filter((l) => l.show)
                            .map(({ href, label, Icon }) => (
                                <SheetClose
                                    key={href}
                                    render={
                                        <Link
                                            href={href}
                                            className="hover:bg-surface-hover flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                                        >
                                            <Icon className="size-4" aria-hidden="true" />
                                            {label}
                                        </Link>
                                    }
                                />
                            ))}
                    </nav>

                    {isHydrated ? (
                        <div className="border-border flex flex-col gap-2 border-t pt-4">
                            {isAuthenticated ? (
                                <Button variant="outline" onClick={handleLogout}>
                                    <LogOut />
                                    Log out
                                </Button>
                            ) : (
                                <>
                                    <SheetClose
                                        render={
                                            <Button variant="outline" render={<Link href="/login" />}>
                                                Sign in
                                            </Button>
                                        }
                                    />
                                    <SheetClose
                                        render={
                                            <Button render={<Link href="/register" />}>
                                                Get started
                                            </Button>
                                        }
                                    />
                                </>
                            )}
                        </div>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default MobileMenu;
