"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores";
import UserMenu from "./UserMenu";

const NavLinks = () => {
    const { isAuthenticated, isHydrated, user } = useAuthStore();

    return (
        <>
            {/* Render nothing until Zustand rehydrates from localStorage */}
            {isHydrated && (
                isAuthenticated ? (
                    <>
                        <Link href="/blogs" className="text-gray-700 hover:text-indigo-600">
                            Blogs
                        </Link>
                        <Link href="/blogs/create" className="text-gray-700 hover:text-indigo-600">
                            Create Blog
                        </Link>
                        {/* Dashboard link — only visible to admin */}
                        {user?.role === "admin" && (
                            <Link
                                href="/admin"
                                className="text-indigo-600 font-semibold hover:text-indigo-800"
                            >
                                Dashboard
                            </Link>
                        )}
                        <UserMenu />
                    </>
                ) : (
                    <>
                        <Link href="/" className="text-gray-700 hover:text-indigo-600">
                            Home
                        </Link>
                        <Link href="/blogs" className="text-gray-700 hover:text-indigo-600">
                            Blogs
                        </Link>
                        <Link
                            href="/login"
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                        >
                            Login
                        </Link>
                        <Link
                            href="/register"
                            className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50"
                        >
                            Register
                        </Link>
                    </>
                )
            )}
        </>
    );
};

export default NavLinks;
