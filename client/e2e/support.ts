import { randomBytes } from "crypto";
import { expect, type Page, type APIRequestContext } from "@playwright/test";

export const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:5000/api";

// No credential is ever stored in the repository. Each run mints its own throwaway account with a
// random password, uses it, and deletes it again. An env var can override the password for a CI
// setup that needs a fixed one, but nothing here depends on that.
const PASSWORD = process.env.E2E_PASSWORD ?? `Pw-${randomBytes(12).toString("hex")}`;

export interface TestUser {
    _id: string;
    username: string;
    email: string;
    password: string;
    token: string;
}

const unique = () => `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;

export async function createUser(request: APIRequestContext): Promise<TestUser> {
    const username = `e2e${unique()}`;
    const email = `${username}@e2e.test`;

    const reg = await request.post(`${API}/users`, {
        data: { username, email, password: PASSWORD },
    });
    expect(reg.ok(), `registration failed: ${reg.status()} ${await reg.text()}`).toBeTruthy();

    const login = await request.post(`${API}/users/login`, { data: { email, password: PASSWORD } });
    expect(login.ok(), "login failed").toBeTruthy();
    const body = await login.json();
    return { _id: body.user._id, username, email, password: PASSWORD, token: body.token };
}

export async function deleteUser(request: APIRequestContext, user: TestUser) {
    // Cascades: the account, its posts, and every comment and like on them.
    await request.delete(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${user.token}` },
    });
}

export async function createPost(request: APIRequestContext, user: TestUser, title: string) {
    const res = await request.post(`${API}/blogs`, {
        headers: { Authorization: `Bearer ${user.token}` },
        multipart: {
            title,
            description:
                "A body long enough to clear the ten character minimum the schema enforces, with a little more besides.",
        },
    });
    expect(res.ok(), `post creation failed: ${res.status()}`).toBeTruthy();
    return (await res.json()).blog as { _id: string; title: string };
}

/**
 * Signs the browser in the way the app itself does: the token in the persisted zustand store, plus
 * the non-sensitive session-hint cookie that proxy.ts reads to avoid a flash of protected content.
 * Faster and less brittle than driving the login form for every test that merely needs a session —
 * the form itself is covered by its own spec.
 */
export async function signIn(page: Page, user: TestUser) {
    await page.goto("/login");
    await page.evaluate(
        ({ u, token }) => {
            localStorage.setItem(
                "auth-storage",
                JSON.stringify({
                    state: { user: u, token, isAuthenticated: true },
                    version: 0,
                })
            );
            document.cookie = "bm_session=1;path=/";
            document.cookie = `bm_role=${(u as { role?: string }).role ?? "user"};path=/`;
        },
        { u: { _id: user._id, username: user.username, email: user.email, role: "user", isBlocked: false, profilePicture: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, token: user.token }
    );
}

/**
 * Fails loudly and early if the API is not up, rather than producing thirty confusing UI failures.
 * Retries, because the client dev server compiling on first hit can starve the box for a few
 * seconds and a single probe then reports a false outage.
 */
export async function assertApiReachable(request: APIRequestContext) {
    for (let attempt = 0; attempt < 10; attempt++) {
        const res = await request
            .get(`${API}/health`, { timeout: 5_000 })
            .catch(() => null);
        if (res?.ok()) return;
        await new Promise((r) => setTimeout(r, 1_500));
    }
    expect(
        false,
        `The API at ${API} did not respond after 10 attempts. Start it with: cd server && npm run dev`
    ).toBeTruthy();
}

/**
 * Console noise that is the dev server talking to itself, not the application misbehaving. Kept
 * deliberately short: anything not listed here fails the test.
 */
const DEV_NOISE = [
    /Download the React DevTools/i,
    /\[Fast Refresh\]/i,
    /React Router Future Flag/i,
];

/** Collects genuine console errors and uncaught exceptions for a test to assert on. */
export function collectConsoleErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on("console", (m) => {
        if (m.type() !== "error") return;
        const text = m.text();
        if (DEV_NOISE.some((r) => r.test(text))) return;
        errors.push(text);
    });
    page.on("pageerror", (e) => errors.push(`uncaught: ${e.message}`));
    return errors;
}

/** Stops the page moving under assertions: fonts settled, no in-flight network. */
export async function settle(page: Page) {
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => document.fonts?.ready);
}
