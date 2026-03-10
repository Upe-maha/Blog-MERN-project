import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isHydrated: boolean;

    // Actions
    setUser: (user: User, token: string) => void;
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

            setUser: (user, token) =>
                set({
                    user,
                    token,
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                }),

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
                state?.setHydrated(true);
            },
        }
    )
);
