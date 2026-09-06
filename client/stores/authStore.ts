import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";
import { clearSessionHint, setSessionHint } from "@/lib/sessionHint";

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isHydrated: boolean;

    // Actions
    setUser: (user: User, token: string) => void;
    updateUser: (user: User) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            isHydrated: false,

            // The session-hint cookie is written here rather than at each call site: there are
            // five places that log out, and one that forgets leaves middleware.ts redirecting a
            // signed-out visitor as though they were still signed in. It is a non-sensitive,
            // forgeable UX hint — see lib/sessionHint.ts.
            setUser: (user, token) => {
                setSessionHint(user.role);
                set({
                    user,
                    token,
                    isAuthenticated: true,
                });
            },

            updateUser: (user) => {
                setSessionHint(user.role);
                set({ user });
            },

            logout: () => {
                clearSessionHint();
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            },

            setLoading: (loading) =>
                set({
                    isLoading: loading,
                }),

            setHydrated: (state) =>
                set({
                    isHydrated: state,
                }),
        }),
        {
            name: "auth-storage",

            // Only persist important data
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),

            // Handle hydration after refresh
            onRehydrateStorage: () => (state) => {
                // localStorage has no expiry but the hint cookie does, so a returning visitor can
                // have a valid session and no cookie. Re-assert it before anything reads it.
                if (state?.isAuthenticated && state.user) setSessionHint(state.user.role);
                state?.setHydrated(true);
            },
        }
    )
);
