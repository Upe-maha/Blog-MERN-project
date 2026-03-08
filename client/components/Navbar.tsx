"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/lib/store";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        setIsMenuOpen(false);
    };

    return (
        <nav className="bg-white/95 shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="text-2xl font-bold text-indigo-600">
                        BlogApp
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
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
                                <Link href="/profile" className="text-gray-700 hover:text-indigo-600">
                                    Profile
                                </Link>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm">
                                        {user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <Link
                                        href="/blogs/logout"
                                        className="text-red-600 hover:text-red-700 font-medium"
                                    >
                                        Logout
                                    </Link>
                                </div>
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
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            {isMenuOpen ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden pb-4">
                        <div className="flex flex-col space-y-3">
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
                                    <Link href="/profile" className="text-gray-700 hover:text-indigo-600">
                                        Profile
                                    </Link>
                                    <Link
                                        href="/blogs/logout"
                                        className="text-red-600 hover:text-red-700 text-left"
                                    >
                                        Logout
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-md text-center"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md text-center"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;