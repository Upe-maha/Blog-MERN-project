import { AxiosError } from "axios";

export function getErrorMessage(
    error: unknown,
    fallback = "Something went wrong"
): string {
    if (error instanceof AxiosError) {
        return (
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            fallback
        );
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    if (typeof error === "string") {
        return error || fallback;
    }
    return fallback;
}
