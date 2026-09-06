import Link from "next/link";
import { House } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/theme-toggle";
import NavLinks from "./NavLinks";
import MobileMenu from "./MobileMenu";
import MobileSearch from "./MobileSearch";
import UserMenu from "./UserMenu";
import { SearchForm } from "./SearchForm";

// Sticky and translucent: this is the one place a blur is the right call, because it sits over
// scrolling content rather than over a decorative photo.
const Navbar = () => {
    return (
        <header className="bg-background/80 border-border sticky top-0 z-(--z-nav) border-b backdrop-blur">
            <Container>
                <nav className="flex h-16 items-center gap-4" aria-label="Main">
                    {/* The wordmark is the one piece of chrome set in the serif — it is identity,
                        not instrument. Everything else in the nav is Geist.

                        The home icon sits *inside* this link rather than beside it: two adjacent
                        links to the same destination would be two tab stops and two entries in a
                        screen reader's links list for one action. aria-hidden because the wordmark
                        already names it. */}
                    <Link
                        href="/"
                        className="font-display hover:text-primary flex shrink-0 items-center gap-2 rounded-sm text-xl font-medium tracking-[-0.01em] transition-colors"
                    >
                        <House className="size-[1.125rem] shrink-0" aria-hidden="true" />
                        Marginalia
                    </Link>

                    <SearchForm className="mx-auto hidden w-full max-w-sm md:block" />

                    <div className="ml-auto flex items-center gap-1">
                        <div className="hidden items-center gap-1 md:flex">
                            <NavLinks />
                        </div>
                        {/* Outside the md-only wrapper on purpose: a signed-in reader should see
                            whose account they are in at every width, not only on a wide screen.
                            It renders nothing when signed out. */}
                        <UserMenu />
                        {/* Below md the inline field above is hidden, so search needs its own
                            control here rather than being buried in the burger menu. */}
                        <MobileSearch />
                        <ThemeToggle />
                        <MobileMenu />
                    </div>
                </nav>
            </Container>
        </header>
    );
};

export default Navbar;
