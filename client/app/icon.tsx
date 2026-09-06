import { ImageResponse } from "next/og";
import { OG, fraunces } from "@/lib/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Generated rather than committed as a binary, so the mark can never drift from the tokens it is
// built out of. Next serves it at /icon and links it from every page.
//
// A rust marginal rule beside an ink M — literally a note in the margin, which is the product.
export default async function Icon() {
    const font = await fraunces("M");

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: OG.paper,
                }}
            >
                <div style={{ width: 40, height: 300, background: OG.rust, marginRight: 40 }} />
                <div
                    style={{
                        fontSize: 340,
                        fontFamily: font ? "Fraunces" : "serif",
                        color: OG.ink,
                        lineHeight: 1,
                        letterSpacing: "-0.04em",
                    }}
                >
                    M
                </div>
            </div>
        ),
        {
            ...size,
            fonts: font ? [{ name: "Fraunces", data: font, style: "normal" as const, weight: 500 as const }] : [],
        }
    );
}
