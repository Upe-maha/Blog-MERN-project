import type { NextConfig } from "next";

// The API origin is environment-driven, so the image host has to be too. Phase 7 moves uploads to
// Cloudinary; both patterns are listed so the switch needs no config change.
const apiHost = (() => {
    try {
        return new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:5000");
    } catch {
        return new URL("http://localhost:5000");
    }
})();

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: apiHost.protocol.replace(":", "") as "http" | "https",
                hostname: apiHost.hostname,
                ...(apiHost.port ? { port: apiHost.port } : {}),
                pathname: "/uploads/**",
            },
            { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
        ],
        formats: ["image/avif", "image/webp"],
    },
    poweredByHeader: false,
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
