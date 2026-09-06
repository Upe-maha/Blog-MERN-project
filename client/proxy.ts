import { NextResponse, type NextRequest } from "next/server";

// Next 16 renamed the `middleware` file convention to `proxy` — same edge runtime, same API,
// and `middleware.ts` now warns on every build.
//
// ⚠️ THIS IS NOT AUTHORISATION. ⚠️
//
// It reads a cookie the *client* writes (lib/sessionHint.ts) which anyone can set with one line in
// a console. It exists solely to redirect a signed-out visitor away from a protected route before
// React renders, so they see the login page instead of a skeleton that then bounces.
//
// Every real permission decision is made by the API against a verified JWT. Nothing here can be
// relied on, and nothing behind these routes is secret — the pages fetch their data from the API,
// which re-checks the token on every request.
//
// It cannot verify the JWT because it does not have it: the token lives in localStorage (invisible
// to edge middleware) and the API sits on a different origin, so an httpOnly cookie it set would
// never be sent here. Making that work needs a same-origin rewrite — see Phase 10.
const PROTECTED = ["/profile", "/blogs/create"];
const ADMIN_ONLY = ["/admin"];

export function proxy(req: NextRequest) {
    const { pathname, search } = req.nextUrl;

    const hasSession = req.cookies.get("bm_session")?.value === "1";
    const role = req.cookies.get("bm_role")?.value;

    const needsSession = [...PROTECTED, ...ADMIN_ONLY].some(
        (p) => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (!needsSession) return NextResponse.next();

    if (!hasSession) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.search = "";
        // Round-trips the visitor back to where they were aiming once they sign in.
        url.searchParams.set("next", `${pathname}${search}`);
        return NextResponse.redirect(url);
    }

    const needsAdmin = ADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (needsAdmin && role !== "admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    // Only the protected routes: everything else should not pay for a proxy invocation.
    matcher: ["/profile/:path*", "/blogs/create/:path*", "/admin/:path*"],
};
