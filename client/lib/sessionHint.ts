// A NON-SENSITIVE, TRIVIALLY FORGEABLE hint that a session exists.
//
// It exists only so middleware.ts can redirect away from protected routes before render, avoiding
// a flash of protected content. It is never trusted for authorisation: the JWT lives in
// localStorage (unreadable by edge middleware, which runs on a different origin from the API), and
// every real permission decision is made server-side.
const SESSION_COOKIE = "bm_session";
const ROLE_COOKIE = "bm_role";

const write = (name: string, value: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
};

const erase = (name: string) => {
    if (typeof document === "undefined") return;
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
};

export const setSessionHint = (role: string) => {
    write(SESSION_COOKIE, "1");
    write(ROLE_COOKIE, role);
};

export const clearSessionHint = () => {
    erase(SESSION_COOKIE);
    erase(ROLE_COOKIE);
};
