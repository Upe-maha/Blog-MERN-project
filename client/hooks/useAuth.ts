"use client";

import { useAuthStore } from "@/stores/authStore";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/lib/errorHandler";

export function useAuth() {
    const { user, token, isAuthenticated, isLoading, setUser, logout, setLoading } =
        useAuthStore();

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const response = await authService.login({ email, password });
            if (response.user && response.token) {
                setUser(response.user, response.token);
                return { success: true as const };
            }
            return { success: false as const, message: response.message };
        } catch (error) {
            return { success: false as const, message: getErrorMessage(error) };
        } finally {
            setLoading(false);
        }
    };

    const register = async (formData: FormData) => {
        setLoading(true);
        try {
            const response = await authService.register(formData);
            if (response.user) {
                return { success: true as const, user: response.user };
            }
            return { success: false as const, message: response.message };
        } catch (error) {
            return { success: false as const, message: getErrorMessage(error) };
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
    };
}
