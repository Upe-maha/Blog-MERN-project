import { expect, test } from "@playwright/test";
import { collectConsoleErrors, createUser, deleteUser, settle, signIn, type TestUser } from "./support";

test.describe("navigation", () => {
    test("the masthead goes home from anywhere", async ({ page }) => {
        await page.goto("/blogs");
        await settle(page);
        await page.getByRole("link", { name: /^Marginalia$/ }).first().click();
        await expect(page).toHaveURL(new RegExp(`${page.url().split("/").slice(0, 3).join("/")}/?$`));
    });

    test("desktop nav is visible above md and collapses below it", async ({ page }, testInfo) => {
        await page.goto("/");
        await settle(page);
        const menuButton = page.getByRole("button", { name: /open menu/i });
        if (testInfo.project.name === "mobile") {
            await expect(menuButton, "mobile must offer the menu trigger").toBeVisible();
        } else {
            await expect(menuButton, "desktop/tablet should not show a hamburger").toBeHidden();
            await expect(page.getByRole("link", { name: /^Essays$/ }).first()).toBeVisible();
        }
    });

    test("the mobile sheet opens, navigates, and closes", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "sheet only exists below md");
        const errors = collectConsoleErrors(page);
        await page.goto("/");
        await settle(page);

        await page.getByRole("button", { name: /open menu/i }).click();
        const sheet = page.getByRole("dialog");
        await expect(sheet).toBeVisible();
        // Everything inside must be reachable — this is the surface that used to log Base UI
        // warnings for every control in it.
        await expect(sheet.getByRole("link", { name: /essays/i }).first()).toBeVisible();

        await sheet.getByRole("link", { name: /essays/i }).first().click();
        await expect(page).toHaveURL(/\/blogs$/);
        await expect(sheet).toBeHidden();
        expect(errors).toEqual([]);
    });

    test("Escape closes the mobile sheet", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "mobile", "sheet only exists below md");
        await page.goto("/");
        await settle(page);
        await page.getByRole("button", { name: /open menu/i }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
    });

    test("the theme menu opens and switches theme", async ({ page }) => {
        await page.goto("/");
        await settle(page);
        await page.getByRole("button", { name: /change theme/i }).first().click();
        const menu = page.getByRole("menu");
        await expect(menu).toBeVisible();
        await menu.getByRole("menuitem", { name: /^dark$/i }).click();
        await expect(page.locator("html")).toHaveClass(/dark/);
        // Dark mode must not be an inversion into pure black — DESIGN.md §41.
        const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bg, "dark background must not be pure black").not.toBe("rgb(0, 0, 0)");
    });

    test("a signed-in reader gets the account menu with working links", async ({ page, request }, testInfo) => {
        // Above md only: NavLinks is `hidden md:flex`, and on mobile the same entries live in the
        // sheet, which the sheet test covers.
        test.skip(testInfo.project.name === "mobile", "account menu lives in the sheet on mobile");
        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            await signIn(page, user);
            await page.goto("/");
            await settle(page);

            await page.getByRole("button", { name: /account menu/i }).click();
            const menu = page.getByRole("menu");
            await expect(menu).toBeVisible();
            await expect(menu.getByText(user.email)).toBeVisible();
            await menu.getByRole("menuitem", { name: /profile/i }).click();
            await expect(page).toHaveURL(/\/profile$/);
        } finally {
            if (user) await deleteUser(request, user);
        }
    });

    test("'Start writing' goes to register when signed out, and to the editor when signed in", async ({
        page,
        request,
    }) => {
        // The bug this guards: the home page is a server component, so the CTA was hardcoded to
        // /register and sent signed-in writers to a registration form.
        await page.goto("/");
        await settle(page);
        const cta = page.getByRole("link", { name: /start writing/i });
        await expect(cta).toHaveAttribute("href", "/register");

        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            await signIn(page, user);
            await page.goto("/");
            await settle(page);
            await expect(cta).toHaveAttribute("href", "/blogs/create");

            // And it actually lands on the editor, rather than bouncing through the auth guard.
            await cta.click();
            await expect(page).toHaveURL(/\/blogs\/create$/);
            await expect(page.locator("#title")).toBeVisible();
        } finally {
            if (user) await deleteUser(request, user);
        }
    });

    test("a signed-in reader sees their account in the navbar at every width", async ({
        page,
        request,
    }) => {
        // The account used to live inside NavLinks, which is `hidden md:flex` — so on a phone the
        // only route to it was through the menu sheet, and nothing showed whose account you were in.
        let user: TestUser | undefined;
        try {
            user = await createUser(request);
            await page.goto("/");
            await settle(page);
            await expect(
                page.getByRole("button", { name: /account menu/i }),
                "signed out: no account control"
            ).toHaveCount(0);

            await signIn(page, user);
            await page.goto("/");
            await settle(page);
            const account = page.getByRole("button", { name: /account menu/i });
            await expect(account, "signed in: the avatar is in the navbar").toBeVisible();

            // And it is the real menu, not a decoration.
            await account.click();
            await expect(page.getByRole("menu").getByText(user.email)).toBeVisible();
        } finally {
            if (user) await deleteUser(request, user);
        }
    });

    test("search from the navbar reaches the results page", async ({ page }, testInfo) => {
        test.skip(testInfo.project.name === "mobile", "below md it lives behind its own nav control");
        await page.goto("/blogs");
        await settle(page);
        // combobox, not searchbox: the field suggests as you type now, and the ARIA combobox
        // pattern's explicit role supersedes the implicit one that type="search" would give it.
        const search = page.getByRole("combobox", { name: /search/i }).first();
        await search.fill("patience");
        // Enter with nothing highlighted in the suggestion list still runs the full search, which
        // is the behaviour this test has always been about.
        await search.press("Enter");
        await expect(page).toHaveURL(/[?&]q=patience/);
    });
});
