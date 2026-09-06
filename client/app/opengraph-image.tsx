import { ImageResponse } from "next/og";
import { OG, OG_SIZE, fraunces } from "@/lib/og";

export const alt = "Marginalia — a small publication, and the record of building one.";
export const size = OG_SIZE;
export const contentType = "image/png";

const TITLE = "Marginalia";
const SUB = "A small publication, and the record of building one.";

// The site-wide card. The Reading Room in 1200×630: paper, a rust rule, ink. No gradient, no glow,
// no shadow — the same vocabulary the pages use.
export default async function Image() {
    const font = await fraunces(TITLE + SUB);

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: OG.paper,
                    padding: "80px 96px",
                    fontFamily: font ? "Fraunces" : "serif",
                }}
            >
                <div style={{ width: 72, height: 4, background: OG.rust, marginBottom: 48 }} />
                <div style={{ fontSize: 108, color: OG.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {TITLE}
                </div>
                <div style={{ fontSize: 40, color: OG.muted, marginTop: 28, lineHeight: 1.35 }}>
                    {SUB}
                </div>
            </div>
        ),
        {
            ...size,
            fonts: font ? [{ name: "Fraunces", data: font, style: "normal", weight: 500 }] : [],
        }
    );
}
