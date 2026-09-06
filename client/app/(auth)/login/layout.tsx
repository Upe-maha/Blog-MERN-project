import type { Metadata } from "next";

// The page itself is a client component, and a client component cannot export metadata — so the
// route's title and robots directives live on its layout.
export const metadata: Metadata = {
    title: "Sign in",
    description: "Sign in to Marginalia.",
    robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
