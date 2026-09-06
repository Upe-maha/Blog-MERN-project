import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Fraunces reads, Geist operates — see DESIGN.md. Fraunces carries a 64px
// headline and an 18px paragraph from one family because it has true optical
// sizing; `opsz` is why we pay for the extra axes rather than shipping two serifs.
const fraunces = Fraunces({
    variable: "--font-fraunces",
    subsets: ["latin"],
    display: "swap",
    // Only the axes actually varied. SOFT was requested but never set to anything but its
    // default of 0 (see DESIGN.md), and every unused axis is weight in the variable font file —
    // which sits directly on the LCP path, since the headline is Fraunces.
    axes: ["WONK", "opsz"],
});

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: "swap",
});

// Geist Mono was loaded on every page and rendered on none — nothing in the app uses font-mono.
// --font-mono in globals.css now points at the system mono stack, so the token still resolves.

// VERCEL_URL is set automatically on preview deployments, where NEXT_PUBLIC_SITE_URL is not. Every
// canonical, OG and sitemap URL resolves against this, so getting it wrong points share cards and
// crawlers at localhost.
export const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const description = "A small publication, and the record of building one.";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: {
        default: "Marginalia",
        // Every child page sets only its own name; the suffix is applied here so no page has to
        // remember it, and `default` is what a page that sets nothing falls back to.
        template: "%s · Marginalia",
    },
    description,
    applicationName: "Marginalia",
    // PRODUCT.md: there are no users, testimonials or metrics, so nothing here may imply any.
    authors: [{ name: "Upendra Mahatara" }],
    creator: "Upendra Mahatara",
    // Deliberately no `alternates.canonical` here. A canonical set on the root layout is
    // INHERITED by every page that does not set its own — which made /blogs, /login and the rest
    // all declare themselves duplicates of the homepage. Each indexable route sets its own.
    openGraph: {
        type: "website",
        siteName: "Marginalia",
        title: "Marginalia",
        description,
        url: "/",
        locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title: "Marginalia", description },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            // Let Google use a full-size image and an unclipped snippet rather than its
            // conservative defaults; this is a publication, and the preview is the point.
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
    formatDetection: { telephone: false, address: false, email: false },
};

// The page chrome (navbar, footer, container) lives in app/(main)/layout.tsx. Keeping it here
// meant the auth pages rendered inside it, and that every page double-wrapped the container.
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${fraunces.variable} ${geistSans.variable} antialiased`}
            >
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-skip) focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2"
                >
                    Skip to content
                </a>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
