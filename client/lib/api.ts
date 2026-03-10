import axios from "axios";

export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
export const BASE_URL =
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000";

// Helper to get full image URL
export const getImageUrl = (path: string | undefined): string => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${BASE_URL}${path}`;
};

const apiClient = axios.create({
    baseURL: API_URL,
});

// Attach JWT token from persisted auth storage on every request
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
            // Silently ignore parse errors
        }
    }
    return config;
});

// Unwrap axios errors so callers receive consistent rejection values
apiClient.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default apiClient;