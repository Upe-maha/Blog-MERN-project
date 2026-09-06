import { expect, test } from "@playwright/test";
import { settle } from "./support";

/**
 * Screenshots only of surfaces whose content is stable. The archive and any post page are
 * deliberately excluded: their content is whatever is in the database, so a snapshot of them would
 * fail for reasons that have nothing to do with the UI.
 *
 * Each runs in all three viewport projects, so one assertion covers desktop, tablet and mobile.
 */
const STABLE_PAGES = [
    { name: "home", path: "/" },
    { name: "login", path: "/login" },
    { name: "register", path: "/register" },
    { name: "not-found", path: "/blogs/000000000000000000000000" },
];

test.describe("visual regression", () => {
    for (const { name, path } of STABLE_PAGES) {
        test(`${name} matches its snapshot`, async ({ page }) => {
            await page.goto(path);
            await settle(page);
            // The theme toggle renders a different icon once mounted; settle on the resolved state.
            await page.waitForTimeout(300);
            await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
        });
    }

    test("the mobile menu matches its snapshot", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "the sheet only exists below md");
        await page.goto("/");
        await settle(page);
        await page.getByRole("button", { name: /open menu/i }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.waitForTimeout(400); // let the sheet transition finish
        await expect(page).toHaveScreenshot("mobile-menu.png");
    });

    test("dark mode matches its snapshot", async ({ page }) => {
        await page.goto("/");
        await settle(page);
        await page.getByRole("button", { name: /change theme/i }).first().click();
        await page.getByRole("menu").getByRole("menuitem", { name: /^dark$/i }).click();
        await expect(page.locator("html")).toHaveClass(/dark/);
        await page.waitForTimeout(400);
        await expect(page).toHaveScreenshot("home-dark.png", { fullPage: true });
    });
});
