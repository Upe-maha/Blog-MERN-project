"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores";

/**
 * The masthead's secondary call to action. It has two destinations depending on who is reading:
 * a signed-in writer wants the editor, a visitor needs an account first.
 *
 * The home page itself is a server component and cannot know which — the session lives in
 * localStorage — so this small island is the only part shipped to the browser.
 *
 * `/register` is the pre-hydration default on purpose. It is what a signed-out visitor and a
 * crawler should see (PRODUCT.md: the primary reader is evaluating this and has no account), and
 * defaulting the other way would flash the editor link at people who cannot use it.
 */
export function StartWriting() {
    const { isAuthenticated, isHydrated } = useAuthStore();
    const signedIn = isHydrated && isAuthenticated;

    return (
        <Button size="lg" variant="ghost" render={<Link href={signedIn ? "/blogs/create" : "/register"} />}>
            Start writing
        </Button>
    );
}

export default StartWriting;
