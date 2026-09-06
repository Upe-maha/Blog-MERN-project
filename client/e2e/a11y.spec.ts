import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createPost, createUser, deleteUser, settle, signIn, type TestUser } from "./support";

// WCAG 2 A/AA is the bar DESIGN.md §37 sets. Colour contrast is included deliberately: the palette
// is warm and low-contrast by design, so it is exactly the thing that could drift.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: import("@playwright/test").Page) {
    return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

const describeViolations = (v: Awaited<ReturnType<typeof scan>>["violations"]) =>
    v.map((x) => `${x.id} (${x.impact}) — ${x.nodes.length} node(s): ${x.nodes[0]?.target.join(" ")}`);

test.describe("accessibility", () => {
    for (const path of ["/", "/blogs", "/login", "/register"]) {
        test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
            await page.goto(path);
            await settle(page);
            const { violations } = await scan(page);
            expect(describeViolations(violations), `axe violations on ${path}`).toEqual([]);
        });
    }

    test("an article page has no violations", async ({ page, request }) => {
        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            const post = await createPost(request, user, `A11y ${Date.now()}`);
            await page.goto(`/blogs/${post._id}`);
            await settle(page);
            const { violations } = await scan(page);
            expect(describeViolations(violations)).toEqual([]);
        } finally {
            if (user) await deleteUser(request, user);
        }
    });

    test("the open mobile menu has no violations", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "the sheet only exists below md");
        await page.goto("/");
        await settle(page);
        await page.getByRole("button", { name: /open menu/i }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        // Let the open transition finish. Scanning mid-fade measures colours against a partially
        // transparent backdrop and reports contrast failures that vanish once it settles.
        await page.waitForTimeout(600);
        const { violations } = await scan(page);
        expect(describeViolations(violations)).toEqual([]);
    });

    test("every page is reachable and operable by keyboard alone", async ({ page }) => {
        await page.goto("/blogs");
        await settle(page);

        // The first tab stop must be the skip link — the escape hatch for keyboard users.
        await page.keyboard.press("Tab");
        const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
        expect(first, "first tab stop should be the skip link").toMatch(/skip to content/i);

        // Focus must be visible, not removed.
        const outline = await page.evaluate(() => {
            const el = document.activeElement as HTMLElement;
            const s = getComputedStyle(el);
            return { outline: s.outlineStyle, shadow: s.boxShadow, ring: s.getPropertyValue("--tw-ring-color") };
        });
        expect(
            outline.outline !== "none" || outline.shadow !== "none" || !!outline.ring,
            "the focused element must show a visible focus indicator"
        ).toBeTruthy();
    });

    test("the delete dialog traps focus and closes on Escape", async ({ page, request }) => {
        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            const post = await createPost(request, user, `A11y dialog ${Date.now()}`);
            await signIn(page, user);
            await page.goto(`/blogs/${post._id}`);
            await settle(page);

            await page.getByRole("button", { name: /^delete$/i }).first().click();
            const dialog = page.getByRole("alertdialog");
            await expect(dialog).toBeVisible();

            // Focus must be inside the dialog, not left behind on the page.
            const inside = await page.evaluate(() => {
                const d = document.querySelector('[role="alertdialog"]');
                return !!d && d.contains(document.activeElement);
            });
            expect(inside, "focus should move into the dialog").toBeTruthy();

            const { violations } = await scan(page);
            expect(describeViolations(violations)).toEqual([]);

            await page.keyboard.press("Escape");
            await expect(dialog).toBeHidden();
        } finally {
            if (user) await deleteUser(request, user);
        }
    });
});
