import axios, { type AxiosError } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
// Not exported: only getImageUrl below consumes it.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000";

// Server returns relative paths (/uploads/...); absolute URLs (Cloudinary, from Phase 7) pass
// through untouched.
export const getImageUrl = (path: string | undefined | null): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path}`;
};

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    timeout: 15_000,
});

// Attach the JWT from persisted auth storage. The key and shape here must match authStore's
// persist config exactly — changing either breaks every authenticated request silently.
apiClient.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        try {
            const stored = localStorage.getItem("auth-storage");
            if (stored) {
                const { state } = JSON.parse(stored);
                if (state?.token) {
                    config.headers.Authorization = `Bearer ${state.token}`;
                }
            }
        } catch {
            // Corrupt storage shouldn't stop the request; it just goes out unauthenticated.
        }
    }
    return config;
});

// Events, not a direct store import: store -> service -> lib/api -> store is a cycle that the
// bundler resolves to undefined at runtime. app/providers.tsx listens for these.
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string }>) => {
        if (typeof window !== "undefined") {
            const status = error.response?.status;
            const message = error.response?.data?.message?.toLowerCase() ?? "";

            if (status === 401) {
                window.dispatchEvent(new CustomEvent("auth:unauthorized"));
            } else if (status === 403 && message.includes("blocked")) {
                window.dispatchEvent(
                    new CustomEvent("auth:blocked", { detail: error.response?.data?.message })
                );
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
