import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import StartWriting from "./start-writing";

export const metadata: Metadata = {
    title: "Notes in the margins",
    description:
        "A small publication, and the record of building one — essays published on software written from scratch.",
    alternates: { canonical: "/" },
};

// A server component: nothing here is interactive, so there is no reason to ship it to the client.
//
// The masthead is the entire pitch. PRODUCT.md's primary reader is someone evaluating this in under
// two minutes who will never sign up, so the leading action is "read", not "create an account".
export default function HomePage() {
    return (
        // The whole page sits on the feed measure, so the hairlines end where the text does. A rule
        // that runs 1152px under a 42rem paragraph reads as a stray line, not a division.
        <div className="max-w-feed py-8 sm:py-16">
            {/* Masthead. The one Display-size element on the site — see The One Display Rule. */}
            <section>
                <h1
                    className="font-display text-[clamp(2.5rem,6vw,4rem)] leading-[1.05] tracking-[-0.02em] text-balance"
                    style={{ fontVariationSettings: '"opsz" 144, "WONK" 1' }}
                >
                    Notes in the margins.
                </h1>

                <p className="font-serif text-muted-foreground mt-6 max-w-reading text-lg leading-relaxed text-pretty">
                    A small publication, and the record of building one. The reading, the writing and
                    the accounts behind it all run on software written from scratch.
                </p>

                <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                    <Button size="lg" render={<Link href="/blogs" />}>
                        Read the essays
                        <ArrowRight />
                    </Button>
                    {/* Two destinations depending on the reader — see start-writing.tsx. */}
                    <StartWriting />
                </div>
            </section>

            {/* Phase 2 replaces this section with the real latest-posts list once
                lib/server-api.ts exists. The heading and rule are the slot it drops into. */}
            <section className="border-border mt-16 border-t pt-10 sm:mt-24" aria-labelledby="latest">
                <h2
                    id="latest"
                    className="font-sans text-muted-foreground text-[0.8125rem] font-medium tracking-[0.06em] uppercase"
                >
                    Latest
                </h2>

                <p className="font-serif mt-6 max-w-reading text-lg leading-relaxed">
                    Essays are listed newest first, with the full archive on one page.
                </p>

                <Link
                    href="/blogs"
                    className="text-primary mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline underline-offset-4"
                >
                    Browse the archive
                    <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            </section>

            {/* A real colophon: the printer's note about how the thing was made. It is the honest
                version of a features section — every claim here is checkable in the repository. */}
            <section
                className="border-border mt-16 border-t pt-10 sm:mt-24"
                aria-labelledby="colophon"
            >
                <h2
                    id="colophon"
                    className="font-sans text-muted-foreground text-[0.8125rem] font-medium tracking-[0.06em] uppercase"
                >
                    Colophon
                </h2>

                <div className="font-serif mt-6 max-w-reading space-y-4 text-lg leading-relaxed">
                    <p>
                        Marginalia runs on Next.js and React at the front, with an Express and
                        MongoDB API behind it. Authorization is enforced on the server and never read
                        from the request body — the token decides who you are, and the database is
                        re-checked on every request.
                    </p>
                    <p className="text-muted-foreground">
                        Set in Fraunces and Geist. Built in the open, one phase at a time.
                    </p>
                </div>
            </section>
        </div>
    );
}
