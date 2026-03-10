"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores";
import UserMenu from "./UserMenu";

const NavLinks = () => {
    const { isAuthenticated } = useAuthStore();

    return (
        <>
            <Link href="/" className="text-gray-700 hover:text-indigo-600">
                Home
            </Link>

            <Link href="/blogs" className="text-gray-700 hover:text-indigo-600">
                Blogs
            </Link>

            {isAuthenticated ? (
                <>
                    <Link href="/blogs/create" className="text-gray-700 hover:text-indigo-600">
                        Create Blog
                    </Link>

                    <UserMenu />

                </>
            ) : (
                <>
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
            )}
        </>
    );
};

export default NavLinks;
