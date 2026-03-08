"use client";

import { useEffect } from "react";

interface ErrorProps {
    error: Error;
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="text-center">
                <div className="text-6xl mb-4">😵</div>
                <h1 className="text-3xl font-bold text-gray-800">Something went wrong!</h1>
                <p className="text-gray-500 mt-2 mb-8">
                    An unexpected error occurred. Please try again.
                </p>
                {process.env.NODE_ENV === "development" && (
                    <p className="text-red-500 mt-4">{error.message}</p>
                )}
                <button
                    onClick={reset}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                >
                    Try Again
                </button>
            </div>
        </div>
    );
}