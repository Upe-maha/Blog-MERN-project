import { expect, test } from "@playwright/test";
import { assertApiReachable, collectConsoleErrors, settle } from "./support";

// Every route a signed-out visitor can reach must render real content — not an error boundary and
// not an empty shell. This is the test that catches "the whole app is broken".
const PUBLIC_ROUTES = [
    { path: "/", heading: /Marginalia|margins/i },
    { path: "/blogs", heading: /Essays|Search/i },
    { path: "/login", heading: /welcome back/i },
    { path: "/register", heading: /create your account|set up marginalia/i },
];

test.beforeAll(async ({ request }) => {
    await assertApiReachable(request);
});

test.describe("public pages render", () => {
    for (const { path, heading } of PUBLIC_ROUTES) {
        test(`${path} loads with its heading and no console errors`, async ({ page }) => {
            const errors = collectConsoleErrors(page);

            const res = await page.goto(path);
            expect(res?.status(), `${path} should not be a server error`).toBeLessThan(400);
            await settle(page);

            await expect(page.locator("h1").first()).toBeVisible();
            await expect(page.locator("h1").first()).toHaveText(heading);

            // The app's own error boundary copy — if this is on screen the page threw.
            await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
            expect(errors, `console output on ${path}`).toEqual([]);
        });
    }

    test("a missing post shows the not-found page, with navigation intact", async ({ page }) => {
        // Before the (main)/not-found.tsx boundary existed this rendered an empty shell: navbar,
        // footer and nothing between them. That is the regression this guards.
        await page.goto("/blogs/000000000000000000000000");
        await settle(page);
        await expect(page.getByRole("heading", { name: /couldn't find that/i })).toBeVisible();
        await expect(page.getByRole("link", { name: /browse essays/i })).toBeVisible();
        // A dead end inside the publication should still offer the way out. .first() because the
        // wordmark links home from both the masthead and the footer.
        await expect(page.getByRole("link", { name: /^Marginalia$/ }).first()).toBeVisible();
    });

    test("a missing author page returns a real 404 status", async ({ page }) => {
        // /users/[id] does not stream, so notFound() sets the status correctly here. The article
        // route does stream and still answers 200 — recorded as a known issue, not asserted here.
        const res = await page.goto("/users/000000000000000000000000");
        expect(res?.status()).toBe(404);
    });

    test("signed-out visitors are redirected away from protected routes", async ({ page }) => {
        for (const path of ["/profile", "/admin", "/blogs/create"]) {
            await page.goto(path);
            await expect(page, `${path} should send a signed-out visitor to /login`).toHaveURL(
                /\/login/
            );
        }
    });

    test("no page scrolls horizontally", async ({ page }, testInfo) => {
        // The single most common responsive defect, and invisible from source.
        for (const { path } of PUBLIC_ROUTES) {
            await page.goto(path);
            await settle(page);
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth
            );
            expect(overflow, `${path} overflows horizontally at ${testInfo.project.name}`).toBeLessThanOrEqual(1);
        }
    });
});
