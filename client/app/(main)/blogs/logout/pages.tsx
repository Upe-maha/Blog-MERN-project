"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function LogoutPage() {
    const router = useRouter();
    const { logout } = useAuthStore();

    useEffect(() => {
        logout();
        router.replace("/login");
    }, [logout, router]);

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Logging out...</p>
            </div>
        </div>
    );
}