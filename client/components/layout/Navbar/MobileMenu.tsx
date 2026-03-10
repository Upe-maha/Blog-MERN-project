"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";

interface MobileMenuProps {
    closeMenu: () => void;
}

const MobileMenu = ({ closeMenu }: MobileMenuProps) => {
    const { isAuthenticated, logout } = useAuthStore();
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const handleLogout = () => {
        logout();
        closeMenu();
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        router.push(q ? `/blogs?q=${encodeURIComponent(q)}` : "/blogs");
        closeMenu();
    };

    return (
        <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-3">

                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                        />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search blogs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                </form>

                <Link href="/" onClick={closeMenu} className="text-gray-700 hover:text-indigo-600">
                    Home
                </Link>

                <Link href="/blogs" onClick={closeMenu} className="text-gray-700 hover:text-indigo-600">
                    Blogs
                </Link>

                {isAuthenticated ? (
                    <>
                        <Link
                            href="/blogs/create"
                            onClick={closeMenu}
                            className="text-gray-700 hover:text-indigo-600"
                        >
                            Create Blog
                        </Link>

                        <Link
                            href="/profile"
                            onClick={closeMenu}
                            className="text-gray-700 hover:text-indigo-600"
                        >
                            Profile
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="text-red-600 hover:text-red-700 text-left"
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link
                            href="/login"
                            onClick={closeMenu}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-center"
                        >
                            Login
                        </Link>

                        <Link
                            href="/register"
                            onClick={closeMenu}
                            className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md text-center"
                        >
                            Register
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default MobileMenu;
