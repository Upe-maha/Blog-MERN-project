"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/stores/authStore";

// lib/api.ts dispatches these instead of importing the auth store directly: store -> service ->
// lib/api -> store is a circular import, and the bundler resolves it to undefined at runtime.
function AuthEventBridge() {
    const router = useRouter();
    const pathname = usePathname();
    const logout = useAuthStore((s) => s.logout);

    useEffect(() => {
        const onUnauthorized = () => {
            if (!useAuthStore.getState().isAuthenticated) return; // already logged out
            logout(); // also clears the session-hint cookie
            toast.error("Your session has expired. Please sign in again.");
            router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        };

        const onBlocked = (e: Event) => {
            logout();
            toast.error((e as CustomEvent<string>).detail ?? "Your account has been blocked.");
            router.replace("/login");
        };

        window.addEventListener("auth:unauthorized", onUnauthorized);
        window.addEventListener("auth:blocked", onBlocked);
        return () => {
            window.removeEventListener("auth:unauthorized", onUnauthorized);
            window.removeEventListener("auth:blocked", onBlocked);
        };
    }, [logout, router, pathname]);

    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AuthEventBridge />
            {children}
            <Toaster richColors closeButton position="bottom-right" />
        </ThemeProvider>
    );
}
