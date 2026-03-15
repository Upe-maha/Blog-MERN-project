"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores";

export default function RegisterPage() {
    const router = useRouter();
    const { setUser } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [adminExists, setAdminExists] = useState<boolean | null>(null);
    const [registerAsAdmin, setRegisterAsAdmin] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Check if an admin exists — determines whether to show the admin option
    useEffect(() => {
        authService.checkAdminExists()
            .then(({ adminExists }) => setAdminExists(adminExists))
            .catch(() => setAdminExists(true)); // fail-safe: hide admin option on error
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setProfileImage(null);
        setImagePreview("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            const submitData = new FormData();
            submitData.append("username", formData.username);
            submitData.append("email", formData.email);
            submitData.append("password", formData.password);
            if (registerAsAdmin) submitData.append("role", "admin");
            if (profileImage) submitData.append("profilePicture", profileImage);

            const response = await authService.register(submitData);

            if (response.user) {
                const loginResponse = await authService.login({
                    email: formData.email,
                    password: formData.password,
                });
                if (loginResponse.user && loginResponse.token) {
                    setUser(loginResponse.user, loginResponse.token);
                    router.push(loginResponse.user.role === "admin" ? "/admin" : "/blogs");
                } else {
                    router.push("/login");
                }
            } else {
                setError(response.message || "Registration failed");
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
                    <p className="text-gray-500 mt-2">Join our community today</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-5">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            {imagePreview ? (
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-24 h-24 rounded-full object-cover border-4 border-indigo-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition"
                                >
                                    <span className="text-3xl text-gray-400">📷</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                        <p className="text-sm text-gray-500 mt-2">Profile Picture (optional)</p>
                    </div>

                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <input
                            type="text" id="username" name="username"
                            value={formData.username} onChange={handleInputChange} required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            placeholder="johndoe"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email" id="email" name="email"
                            value={formData.email} onChange={handleInputChange} required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password" id="password" name="password"
                            value={formData.password} onChange={handleInputChange} required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            placeholder="Create a password"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password" id="confirmPassword" name="confirmPassword"
                            value={formData.confirmPassword} onChange={handleInputChange} required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                            placeholder="Confirm your password"
                        />
                    </div>

                    {/* Admin option — only shown when no admin exists yet */}
                    {adminExists === false && (
                        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={registerAsAdmin}
                                    onChange={(e) => setRegisterAsAdmin(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <div>
                                    <span className="font-semibold text-amber-800">Register as Admin</span>
                                    <p className="text-xs text-amber-600 mt-0.5">
                                        First-time only — no admin account exists yet.
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || adminExists === null}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading
                            ? "Creating Account..."
                            : registerAsAdmin
                            ? "Create Admin Account"
                            : "Create Account"}
                    </button>
                </form>

                <p className="text-center mt-6 text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                        Sign in here
                    </Link>
                </p>
            </div>
        </div>
    );
}
