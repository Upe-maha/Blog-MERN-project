import { ImageResponse } from "next/og";
import { OG, fraunces } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The iOS home-screen mark: the same construction as icon.tsx, proportioned for 180px.
export default async function AppleIcon() {
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
                <div style={{ width: 14, height: 106, background: OG.rust, marginRight: 14 }} />
                <div
                    style={{
                        fontSize: 120,
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
