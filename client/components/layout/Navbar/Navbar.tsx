"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NavLinks from "./NavLinks";
import MobileMenu from "./MobileMenu";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        router.push(q ? `/blogs?q=${encodeURIComponent(q)}` : "/blogs");
    };

    return (
        <nav className="bg-white/95 shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center h-16 gap-4">

                    {/* Logo */}
                    <Link href="/" className="text-2xl font-bold text-indigo-600 shrink-0">
                        BlogApp
                    </Link>

                    {/* Search — centered, desktop only */}
                    <form onSubmit={handleSearch} className="hidden md:flex flex-1 justify-center">
                        <div className="relative w-full max-w-md">
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
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </form>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center space-x-6 shrink-0 ml-auto">
                        <NavLinks />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden ml-auto"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle Menu"
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
                    <MobileMenu closeMenu={() => setIsMenuOpen(false)} />
                )}
            </div>
        </nav>
    );
};

export default Navbar;
