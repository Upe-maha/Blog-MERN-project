import { ImageResponse } from "next/og";
import { getBlog } from "@/lib/server-api";
import { toPlainText, truncate } from "@/lib/text";
import { OG, OG_SIZE, fraunces } from "@/lib/og";

export const alt = "A post on Marginalia";
export const size = OG_SIZE;
export const contentType = "image/png";

// The post's own card. This is what makes a shared link look intentional rather than generic — and
// before Phase 2 a shared post previewed as an empty spinner, because the route was client-side.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Never throw: an OG route that errors leaves the link with no image at all, which is worse
    // than the site-wide default. getBlog throws when the API is unreachable, so it is caught here.
    const blog = await getBlog(id).catch(() => null);

    const title = truncate(blog?.title ?? "Marginalia", 90);
    const author = blog?.author?.username ?? "Marginalia";
    const published = blog?.createdAt
        ? new Date(blog.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : "";
    // Markdown reduced to prose: a card reading "## The case for patience" is a bug the reader
    // meets before they ever reach the page.
    const excerpt = blog?.description ? truncate(toPlainText(blog.description), 120) : "";

    const font = await fraunces(title + author + published + excerpt + "·min read");

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: OG.paper,
                    padding: "72px 88px",
                    fontFamily: font ? "Fraunces" : "serif",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ width: 56, height: 4, background: OG.rust, marginBottom: 40 }} />
                    <div
                        style={{
                            fontSize: title.length > 55 ? 62 : 78,
                            color: OG.ink,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.1,
                        }}
                    >
                        {title}
                    </div>
                    {excerpt ? (
                        <div style={{ fontSize: 30, color: OG.muted, marginTop: 24, lineHeight: 1.4 }}>
                            {excerpt}
                        </div>
                    ) : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ height: 1, background: OG.hairline, marginBottom: 24 }} />
                    {/* Explicit margins, not gap and not spaces inside the strings: Satori
                        collapses leading and trailing whitespace, and does not apply flex gap
                        here — both of which ran the separators into the words either side. */}
                    <div style={{ display: "flex", alignItems: "center", fontSize: 26, color: OG.muted }}>
                        <span style={{ color: OG.ink, marginRight: 14 }}>{author}</span>
                        {published ? <span style={{ marginRight: 14 }}>·</span> : null}
                        {published ? <span style={{ marginRight: 14 }}>{published}</span> : null}
                        {blog?.readingMinutes ? <span style={{ marginRight: 14 }}>·</span> : null}
                        {blog?.readingMinutes ? <span>{`${blog.readingMinutes} min`}</span> : null}
                        <span style={{ marginLeft: "auto", color: OG.rust }}>Marginalia</span>
                    </div>
                </div>
            </div>
        ),
        {
            ...size,
            fonts: font ? [{ name: "Fraunces", data: font, style: "normal", weight: 500 }] : [],
        }
    );
}
