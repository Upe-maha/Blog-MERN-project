"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores";

/**
 * The footer's "Write" entry, which has two destinations depending on who is reading — the same
 * split as StartWriting on the home page.
 *
 * The footer is a server component with no session, so a static link sent every visitor to
 * /blogs/create, where proxy.ts bounced the signed-out ones straight to /login. That is why
 * /profile was dropped from the list entirely; Write earns this island instead of removal,
 * because it is the product's primary action and belongs in the footer.
 *
 * /register is the pre-hydration default for the same reason it is in StartWriting: it is what a
 * signed-out visitor and a crawler should see.
 */
export function FooterWriteLink({ className }: { className?: string }) {
    const { isAuthenticated, isHydrated } = useAuthStore();
    const signedIn = isHydrated && isAuthenticated;

    return (
        <Link href={signedIn ? "/blogs/create" : "/register"} className={className}>
            Write
        </Link>
    );
}

export default FooterWriteLink;
