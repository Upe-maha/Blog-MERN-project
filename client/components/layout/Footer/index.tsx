import Link from "next/link";
import { House } from "lucide-react";
import { Container } from "@/components/ui/container";
import { FooterWriteLink } from "./write-link";

// /profile is deliberately absent: the footer is a server component with no session, so linking it
// here showed a members-only route to signed-out visitors. It already lives in the user menu.
// "Write" is the same hazard and is handled by FooterWriteLink, which picks its destination from
// the session rather than being dropped.
const LINKS = [
    { href: "/", label: "Home" },
    { href: "/blogs", label: "Essays" },
];

const LINK_CLASS = "hover:text-foreground rounded-sm transition-colors";

const Footer = () => {
    return (
        <footer className="border-border mt-24 border-t py-10">
            <Container>
                <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-xs">
                        {/* The wordmark goes home here too, matching the navbar and the auth
                            shell. It keeps its own accessible name ("Marginalia"), so it does not
                            read as a duplicate of the "Home" entry in the list beside it. */}
                        <Link
                            href="/"
                            className="font-display hover:text-primary inline-flex items-center gap-2 rounded-sm text-lg font-medium tracking-[-0.01em] transition-colors"
                        >
                            <House className="size-4 shrink-0" aria-hidden="true" />
                            Marginalia
                        </Link>
                        <p className="font-serif text-muted-foreground mt-2 leading-relaxed">
                            Notes in the margins.
                        </p>
                    </div>

                    <nav aria-label="Footer">
                        <ul className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            {LINKS.map(({ href, label }) => (
                                <li key={href}>
                                    {/* next/link, not <a>: a plain anchor forces a full document
                                        reload and throws away the React tree on every click. */}
                                    <Link href={href} className={LINK_CLASS}>
                                        {label}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <FooterWriteLink className={LINK_CLASS} />
                            </li>
                        </ul>
                    </nav>
                </div>

                <p className="border-border text-muted-foreground mt-10 border-t pt-6 text-[0.8125rem] tracking-[0.06em] uppercase">
                    &copy; {new Date().getFullYear()} Marginalia
                </p>
            </Container>
        </footer>
    );
};

export default Footer;
