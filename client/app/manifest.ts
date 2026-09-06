import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Marginalia",
        short_name: "Marginalia",
        description: "A small publication, and the record of building one.",
        start_url: "/",
        display: "standalone",
        // The paper and rust of DESIGN.md, as literal hex: a manifest cannot read a CSS variable,
        // and these are the oklch tokens converted. Keep them in step with globals.css.
        background_color: "#faf8f4",
        theme_color: "#a4552f",
        icons: [
            { src: "/icon", sizes: "512x512", type: "image/png" },
            { src: "/apple-icon", sizes: "180x180", type: "image/png" },
        ],
    };
}
