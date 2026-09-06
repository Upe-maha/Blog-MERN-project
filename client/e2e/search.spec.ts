import { expect, test } from "@playwright/test";
import { assertApiReachable, createPost, createUser, deleteUser, settle, type TestUser } from "./support";

// A title nothing else in the archive will collide with, so the assertions do not depend on what
// happens to be in the database.
const TITLE = "Zarquon on marginalia and memory";

let author: TestUser;

test.beforeAll(async ({ request }) => {
    await assertApiReachable(request);
    author = await createUser(request);
    await createPost(request, author, TITLE);
});

test.afterAll(async ({ request }) => {
    await deleteUser(request, author);
});

test.describe("search suggestions", () => {
    test("suggests on a partial word, which the text index alone cannot match", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "the inline field only exists at md and above");

        await page.goto("/blogs");
        const field = page.getByRole("combobox", { name: "Search essays" });
        // "Zarq" is not a whole word, so $text would return nothing — the prefix index is what
        // makes this pass, and this assertion is the regression guard for it.
        await field.fill("Zarq");

        const option = page.getByRole("option", { name: new RegExp(TITLE, "i") });
        await expect(option).toBeVisible();
    });

    test("opens the post when a suggestion is chosen", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "the inline field only exists at md and above");

        await page.goto("/blogs");
        await page.getByRole("combobox", { name: "Search essays" }).fill("Zarquon");
        await page.getByRole("option", { name: new RegExp(TITLE, "i") }).click();

        await expect(page).toHaveURL(/\/blogs\/[a-f0-9]{24}$/);
        await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    });

    test("keyboard: arrow highlights, Enter opens it", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "the inline field only exists at md and above");

        await page.goto("/blogs");
        const field = page.getByRole("combobox", { name: "Search essays" });
        await field.fill("Zarquon");
        await expect(page.getByRole("option", { name: new RegExp(TITLE, "i") })).toBeVisible();

        await field.press("ArrowDown");
        // aria-activedescendant is what a screen reader follows while focus stays in the input.
        await expect(field).toHaveAttribute("aria-activedescendant", /option-0$/);
        await field.press("Enter");

        await expect(page).toHaveURL(/\/blogs\/[a-f0-9]{24}$/);
    });

    test("Enter with nothing highlighted runs the full search instead", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "the inline field only exists at md and above");

        await page.goto("/blogs");
        await page.getByRole("combobox", { name: "Search essays" }).fill("Zarquon");
        await page.getByRole("combobox", { name: "Search essays" }).press("Enter");

        await expect(page).toHaveURL(/\/blogs\?q=Zarquon$/);
    });

    test("Escape dismisses the panel without navigating", async ({ page }, info) => {
        test.skip(info.project.name !== "desktop", "the inline field only exists at md and above");

        await page.goto("/blogs");
        const field = page.getByRole("combobox", { name: "Search essays" });
        await field.fill("Zarquon");
        await expect(page.getByRole("listbox")).toBeVisible();

        await field.press("Escape");
        await expect(page.getByRole("listbox")).toBeHidden();
        await expect(page).toHaveURL(/\/blogs$/);
    });
});

test.describe("search on mobile", () => {
    test("has its own nav control and suggests from there", async ({ page }, info) => {
        test.skip(info.project.name !== "mobile", "this is the mobile entry point");

        await page.goto("/blogs");
        await page.getByRole("button", { name: "Open search" }).click();

        const field = page.getByRole("combobox", { name: "Search essays" });
        await expect(field).toBeVisible();
        await field.fill("Zarq");
        await expect(page.getByRole("option", { name: new RegExp(TITLE, "i") })).toBeVisible();
    });

    test("no longer lives in the burger menu", async ({ page }, info) => {
        test.skip(info.project.name !== "mobile", "this is the mobile entry point");

        await page.goto("/blogs");
        await page.getByRole("button", { name: "Open menu" }).click();
        await settle(page);

        // The menu is a list of destinations now; the search field was moved out of it. Assert on
        // both roles: the field is a combobox since it gained suggestions, so checking only for a
        // searchbox would pass whether or not the form was still in there.
        const menu = page.getByRole("dialog");
        await expect(menu.getByRole("combobox")).toHaveCount(0);
        await expect(menu.getByRole("searchbox")).toHaveCount(0);
        await expect(menu.getByRole("textbox")).toHaveCount(0);
        await expect(page.getByRole("link", { name: "Essays" })).toBeVisible();
    });
});
