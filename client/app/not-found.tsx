import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-indigo-600">404</h1>
                <h2 className="text-3xl font-bold text-gray-800 mt-4">Page Not Found</h2>
                <p className="text-gray-500 mt-2 mb-8">
                    The page you are looking for doesn&apos;t exist or has been moved.
                </p>
                <div className="flex justify-center gap-4">
                    <Link
                        href="/"
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/blogs"
                        className="border border-indigo-600 text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
                    >
                        Browse Blogs
                    </Link>
                </div>
            </div>
        </div>
    );
}