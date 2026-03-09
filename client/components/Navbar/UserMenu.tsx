"use client";

import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";

const UserMenu = () => {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/blogs");
    };

    return (
        <div className="flex items-center gap-3">
            {/* Avatar → Profile */}
            <Link href="/profile">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm overflow-hidden cursor-pointer">
                    {user?.profilePicture ? (
                        <img
                            src={user.profilePicture}
                            alt="profile"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        user?.username?.charAt(0).toUpperCase()
                    )}
                </div>
            </Link>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-medium"
            >
                Logout
            </button>
        </div>
    );
};

export default UserMenu;