import Link from "next/link";
import { House } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

// Auth pages get their own bare shell. Previously they rendered inside the full navbar/footer
// chrome, which made a sign-in form look like a card floating in a content column.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <header className="flex items-center justify-between px-4 py-4 sm:px-6">
                {/* Same construction as the main navbar: the icon lives inside the wordmark's
                    link, so signing in still offers exactly one way back to the publication rather
                    than two adjacent links to the same place. */}
                <Link
                    href="/"
                    className="font-display hover:text-primary flex items-center gap-2 rounded-sm text-xl font-medium tracking-[-0.01em] transition-colors"
                >
                    <House className="size-[1.125rem] shrink-0" aria-hidden="true" />
                    Marginalia
                </Link>
                <ThemeToggle />
            </header>
            <main id="main" className="grid grow place-items-center px-4 py-8">
                <div className="w-full max-w-md">{children}</div>
            </main>
        </div>
    );
}
