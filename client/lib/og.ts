// Shared bits for the generated OG cards and icons.
//
// A manifest, an <svg> and an ImageResponse cannot read a CSS custom property, so DESIGN.md's
// tokens are repeated here as literal hex. Keep them in step with app/globals.css.
export const OG = {
    paper: "#faf8f4",      // --background
    card: "#fdfcfa",       // --card
    ink: "#332a24",        // --foreground
    muted: "#7a706a",      // --muted-foreground
    rust: "#a4552f",       // --primary
    hairline: "#e5ded4",   // --border
} as const;

export const OG_SIZE = { width: 1200, height: 630 };

// Fraunces, fetched at render time for the card's headline. ImageResponse needs real font bytes;
// it cannot use the next/font face the pages use.
//
// Wrapped in try/catch and cached: a Google Fonts hiccup must degrade the card to the built-in
// font, never fail the request and leave a shared link with no image at all.
let cached: ArrayBuffer | null | undefined;

export async function fraunces(text: string): Promise<ArrayBuffer | null> {
    if (cached !== undefined) return cached;
    try {
        const css = await fetch(
            `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&text=${encodeURIComponent(text)}`,
            { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 86400 } }
        ).then((r) => r.text());

        const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff2?)'\)/)?.[1];
        if (!url) throw new Error("no font url in CSS");

        cached = await fetch(url, { next: { revalidate: 86400 } }).then((r) => r.arrayBuffer());
    } catch {
        cached = null;
    }
    return cached ?? null;
}
