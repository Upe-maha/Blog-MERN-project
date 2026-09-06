"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";

const NavLinks = () => {
    const { isAuthenticated, isHydrated } = useAuthStore();

    // Render nothing until zustand rehydrates, otherwise the nav flickers from logged-out to
    // logged-in on every page load.
    if (!isHydrated) return <div className="h-8 w-40" aria-hidden="true" />;

    if (isAuthenticated) {
        return (
            <>
                <Button variant="ghost" size="sm" render={<Link href="/blogs" />}>
                    Essays
                </Button>
                <Button variant="ghost" size="sm" render={<Link href="/blogs/create" />}>
                    Write
                </Button>
            </>
        );
    }

    return (
        <>
            <Button variant="ghost" size="sm" render={<Link href="/blogs" />}>
                Essays
            </Button>
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>
                Sign in
            </Button>
            <Button size="sm" render={<Link href="/register" />}>
                Get started
            </Button>
        </>
    );
};

export default NavLinks;
