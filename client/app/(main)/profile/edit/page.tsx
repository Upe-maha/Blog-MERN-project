"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import Link from "next/link";
import EditProfileForm from "@/components/user/EditProfileForm";

export default function EditProfilePage() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-10">
            <Link href="/profile" className="text-indigo-600 hover:underline mb-6 inline-block text-sm">
                ← Back to profile
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>
            <EditProfileForm />
        </div>
    );
}
