import { expect, test, type Page } from "@playwright/test";
import { assertApiReachable, createUser, deleteUser, signIn, settle, type TestUser } from "./support";

// These cover one regression class: a mutation lands, but the reader keeps seeing the old value
// until they reload the whole site.
//
// The cause was the feed's store. It is a plain (unpersisted) zustand store, and BlogFeed refused
// to re-seed it from the server whenever it already held rows for the current query — so a
// republished list arrived and was thrown away, and a full reload was the only thing that cleared
// it. Every assertion below is written to fail if that guard comes back.
let author: TestUser;

test.beforeAll(async ({ request }) => {
    await assertApiReachable(request);
    author = await createUser(request);
});

test.afterAll(async ({ request }) => {
    await deleteUser(request, author);
});

/**
 * Every navigation below is a link click, never page.goto, and that is the whole point.
 *
 * goto is a full page load, which tears down the zustand store the feed reads from — so a suite
 * built on it exercises a fresh store every time and cannot observe the stale-store bug at all.
 * (Verified: with the original guard restored, a goto-based version of these tests passed.) Only
 * client-side navigation keeps the store alive across routes, which is what a reader actually does
 * and where the staleness was visible.
 */
async function toArchive(page: Page) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Essays" }).click();
    await page.waitForURL(/\/blogs$/);
}

/**
 * Publishes through the form rather than the API on purpose. A raw POST creates the row but runs
 * none of app/actions.ts, so the Next cache tag survives and the archive legitimately keeps serving
 * its cached copy — which would make these tests fail for a reason that is not the bug under test.
 * Going through the UI is also the path a reader actually takes.
 */
async function publish(page: Page, title: string) {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Write" }).click();
    await page.waitForURL(/\/blogs\/create$/);
    // By id: the body sits inside a Write/Preview tab panel, so a label lookup is ambiguous.
    await page.locator("#title").fill(title);
    await page
        .locator("#description")
        .fill("A body comfortably past the ten character minimum, written so the form will submit.");
    await page.getByRole("button", { name: "Publish" }).click();
    await page.waitForURL(/\/blogs\/[a-f0-9]{24}$/, { timeout: 20_000 });
    return page.url().split("/").pop()!;
}

test.describe("the feed reflects writes without a reload", () => {
    // A data-freshness rule is viewport-independent, so it is proven once rather than at every size.
    test.beforeEach(() => {
        test.skip(test.info().project.name !== "desktop", "proven once, on desktop");
    });

    test("a post published from the form appears in the archive", async ({ page }) => {
        const title = `Freshly published ${Date.now()}`;

        await signIn(page, author);
        // Load the archive once: this is what seeds the store, and is precisely the state in which
        // the old code started ignoring the server.
        await page.goto("/blogs");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        await publish(page, title);

        await toArchive(page);
        await expect(page.getByRole("link", { name: title })).toBeVisible();
    });

    test("a post deleted from its own page leaves the archive", async ({ page }) => {
        const title = `Doomed ${Date.now()}`;

        await signIn(page, author);
        await page.goto("/blogs");
        const id = await publish(page, title);

        await toArchive(page);
        await expect(page.getByRole("link", { name: title })).toBeVisible();

        await page.getByRole("link", { name: title }).click();
        await page.waitForURL(new RegExp(`/blogs/${id}$`));
        await page.getByRole("button", { name: /^delete/i }).first().click();
        await page.getByRole("alertdialog").getByRole("button", { name: /delete post/i }).click();

        await page.waitForURL(/\/blogs$/, { timeout: 20_000 });
        await settle(page);
        await expect(page.getByRole("link", { name: title })).toHaveCount(0);
    });

    test("a like is reflected in the archive row on the way back", async ({ page }) => {
        const title = `Likeable ${Date.now()}`;

        await signIn(page, author);
        await page.goto("/blogs");
        const id = await publish(page, title);

        await toArchive(page);
        await expect(page.getByRole("link", { name: title })).toBeVisible();

        await page.getByRole("link", { name: title }).click();
        await page.waitForURL(new RegExp(`/blogs/${id}$`));

        // Wait on the server action's own response, not on the button flipping. The button is
        // optimistic, so it flips before the toggle has even reached the API — asserting on it and
        // navigating immediately outruns the revalidation by milliseconds and produces a failure
        // that no human interaction could ever reproduce. A fixed sleep would hide the same race
        // behind a slower test; this waits for the actual thing.
        const revalidated = page.waitForResponse(
            (r) => r.request().method() === "POST" && r.url().endsWith(`/blogs/${id}`) && r.ok()
        );
        await page.getByRole("button", { name: /like this post/i }).click();
        await expect(page.getByRole("button", { name: /unlike this post/i })).toBeVisible();
        await revalidated;

        await toArchive(page);
        await settle(page);
        // The row's like count is rendered by a server component from the cached list response.
        // Reaching 1 here means the tag was dropped *and* the store accepted the newer payload.
        await expect(page.locator("article").filter({ hasText: title })).toContainText("1 like");
    });
});
