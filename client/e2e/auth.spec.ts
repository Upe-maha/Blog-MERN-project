import { expect, test } from "@playwright/test";
import { randomBytes } from "crypto";
import { API, createUser, deleteUser, settle, signIn, type TestUser } from "./support";

// Credentials are generated per run and the account is deleted afterwards; nothing is stored here.
const password = () => `Pw-${randomBytes(12).toString("hex")}`;

test.describe("authentication", () => {
    test("a visitor can register and lands signed in", async ({ page, request }) => {
        const name = `e2e${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
        const email = `${name}@e2e.test`;
        const pw = password();
        let token: string | undefined;

        try {
            await page.goto("/register");
            await settle(page);
            await page.locator("#username").fill(name);
            await page.locator("#email").fill(email);
            await page.locator("#password").fill(pw);
            await page.locator("#confirmPassword").fill(pw);
            await page.getByRole("button", { name: /create account|sign up|create/i }).click();

            // Registration signs you in and moves you on.
            await expect(page).toHaveURL(/\/blogs/, { timeout: 20_000 });
            const stored = await page.evaluate(() => localStorage.getItem("auth-storage"));
            expect(stored, "a session should be persisted after registering").toContain("token");
            token = JSON.parse(stored!).state.token;
        } finally {
            if (token) {
                await request.delete(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
            }
        }
    });

    test("the form rejects a mismatched confirmation before contacting the API", async ({ page }) => {
        await page.goto("/register");
        await settle(page);
        await page.locator("#username").fill("mismatch");
        await page.locator("#email").fill("mismatch@e2e.test");
        await page.locator("#password").fill("password123");
        await page.locator("#confirmPassword").fill("password124");
        await page.getByRole("button", { name: /create account|sign up|create/i }).click();
        await expect(page.getByText(/passwords don't match/i)).toBeVisible();
        await expect(page, "should not navigate on a validation failure").toHaveURL(/\/register/);
    });

    test("a wrong password shows an error and keeps you on the form", async ({ page, request }) => {
        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            await page.goto("/login");
            await settle(page);
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill("definitely-not-the-password");
            await page.getByRole("button", { name: /sign in/i }).click();

            await expect(page.getByRole("alert")).toBeVisible();
            await expect(page).toHaveURL(/\/login/);
            // A failed login must not look like an expired session.
            await expect(page.getByText(/session has expired/i)).toHaveCount(0);
        } finally {
            if (user) await deleteUser(request, user);
        }
    });

    test("sign in, then sign out, returns you to a signed-out app", async ({ page, request }) => {
        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            await page.goto("/login");
            await settle(page);
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.getByRole("button", { name: /sign in/i }).click();
            await expect(page).toHaveURL(/\/blogs/, { timeout: 20_000 });

            await page.goto("/profile");
            await expect(page.getByRole("heading", { name: user.username })).toBeVisible();
            await page.getByRole("button", { name: /sign out/i }).click();

            // Signed out for real: the guard sends you away again.
            await page.goto("/profile");
            await expect(page).toHaveURL(/\/login/);
        } finally {
            if (user) await deleteUser(request, user);
        }
    });

    test("?next= returns you to where you were headed", async ({ page, request }) => {
        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            await page.goto("/blogs/create");
            await expect(page).toHaveURL(/\/login\?next=/);
            await page.locator("#email").fill(user.email);
            await page.locator("#password").fill(user.password);
            await page.getByRole("button", { name: /sign in/i }).click();
            await expect(page).toHaveURL(/\/blogs\/create/, { timeout: 20_000 });
        } finally {
            if (user) await deleteUser(request, user);
        }
    });

    test("changing your password keeps this browser in and puts the others out", async ({
        page,
        request,
    }) => {
        // Only an end-to-end test can see this one. The server retires every token issued before a
        // password change, including the one that authorised it, so the client has to store the
        // replacement that comes back — forget that and the user signs themselves out by changing
        // their own password, which no API test would notice.
        let user: TestUser | undefined;
        const next = password();
        try {
            user = await createUser(request);
            await signIn(page, user);

            await page.goto("/profile/edit");
            await settle(page);
            await page.locator("#currentPassword").fill(user.password);
            await page.locator("#newPassword").fill(next);
            await page.locator("#confirmPassword").fill("not-the-same-thing");
            await page.getByRole("button", { name: /change password/i }).click();
            // Client-side, so the API is never asked about a typo.
            await expect(page.getByText(/passwords don't match/i)).toBeVisible();

            await page.locator("#confirmPassword").fill(next);
            await page.getByRole("button", { name: /change password/i }).click();
            await expect(page.getByText(/password changed/i)).toBeVisible();

            // Still signed in, and the fields are not left holding the password.
            await expect(page.locator("#currentPassword")).toHaveValue("");
            await page.goto("/profile");
            await settle(page);
            await expect(page).toHaveURL(/\/profile$/);

            // The session that existed before the change is gone.
            const stale = await request.get(`${API}/users/me`, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
            expect(stale.status()).toBe(401);

            // Re-point the fixture at a live token so the cleanup below can still delete it.
            const login = await request.post(`${API}/users/login`, {
                data: { email: user.email, password: next },
            });
            expect(login.ok(), "the new password does not sign in").toBeTruthy();
            user.token = (await login.json()).token;
        } finally {
            if (user) await deleteUser(request, user);
        }
    });
});
