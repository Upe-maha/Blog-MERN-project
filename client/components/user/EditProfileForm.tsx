"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores";
import { authService } from "@/services/authService";
import { getImageUrl } from "@/lib/api";
import { getErrorMessage } from "@/lib/errorHandler";

const EditProfileForm = () => {
    const router = useRouter();
    const { user, updateUser } = useAuthStore();

    const [username, setUsername] = useState(user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [previewUrl, setPreviewUrl] = useState(getImageUrl(user?.profilePicture));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?._id) return;

        setIsLoading(true);
        setError("");
        setSuccess("");

        try {
            const formData = new FormData();
            formData.append("username", username.trim());
            formData.append("email", email.trim());
            const file = fileRef.current?.files?.[0];
            if (file) formData.append("profilePicture", file);

            const response = await authService.update(user._id, formData);
            updateUser(response.user);
            setSuccess("Profile updated successfully!");
            setTimeout(() => router.push("/profile"), 1200);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to update profile."));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">

            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-8">
                <div
                    className="relative w-28 h-28 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center text-white text-4xl font-bold cursor-pointer group"
                    onClick={() => fileRef.current?.click()}
                >
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        user?.username?.charAt(0).toUpperCase()
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mt-2">Click to change photo</p>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {/* Fields */}
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    />
                </div>
            </div>

            {/* Feedback */}
            {error && (
                <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-4 px-4 py-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg">
                    {success}
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-6">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
                >
                    {isLoading ? "Saving…" : "Save Changes"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-50 transition"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

export default EditProfileForm;
