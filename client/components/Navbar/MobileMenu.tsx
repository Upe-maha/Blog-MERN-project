"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/store";

interface MobileMenuProps {
    closeMenu: () => void;
}

const MobileMenu = ({ closeMenu }: MobileMenuProps) => {
    const { isAuthenticated, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        closeMenu();
    };

    return (
        <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-3">

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