// Markdown reduced to plain prose. Used for meta descriptions, where raw syntax would otherwise
// reach the outside world: a link preview reading "## The case for patience" looks broken.
//
// The server strips list excerpts with the same rules; this is the client-side counterpart for the
// full body, which the list never sends.
export function toPlainText(markdown: string): string {
    return markdown
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`([^`]*)`/g, "$1")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/<[^>]+>/g, " ")
        .replace(/^\s{0,3}#{1,6}\s+/gm, "")
        .replace(/^\s{0,3}>\s?/gm, "")
        .replace(/[*_~]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export const truncate = (s: string, max: number): string =>
    s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
