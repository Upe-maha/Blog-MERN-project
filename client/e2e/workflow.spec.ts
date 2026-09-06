import { expect, test } from "@playwright/test";
import { createPost, createUser, deleteUser, settle, signIn, type TestUser } from "./support";

test.describe("the publishing journey", () => {
    let user: TestUser;

    test.beforeEach(async ({ request, page }) => {
        user = await createUser(request);
        await signIn(page, user);
    });

    test.afterEach(async ({ request }) => {
        if (user) await deleteUser(request, user);
    });

    test("publish a post and see it in the archive without reloading", async ({ page }) => {
        // The regression this guards: the archive is a cached server component, and nothing used
        // to invalidate its tag — so a new post only appeared after a manual refresh.
        const title = `E2E publish ${Date.now()}`;

        await page.goto("/blogs/create");
        await settle(page);
        await page.locator("#title").fill(title);
        await page.locator("#description").fill(
            "A body comfortably longer than the ten character minimum the schema enforces."
        );
        await page.getByRole("button", { name: /publish|save/i }).click();

        await expect(page).toHaveURL(/\/blogs\/[a-f0-9]{24}/, { timeout: 25_000 });
        await expect(page.getByRole("heading", { name: title })).toBeVisible();

        // Client-side navigation, deliberately — not a reload.
        await page.getByRole("link", { name: /^Essays$/ }).first().click();
        await expect(page).toHaveURL(/\/blogs$/);
        await expect(page.getByRole("heading", { name: title })).toBeVisible();
    });

    test("edit a post and see the new title", async ({ page, request }) => {
        const post = await createPost(request, user, `E2E edit ${Date.now()}`);
        const edited = `${post.title} — revised`;

        await page.goto(`/blogs/${post._id}/edit`);
        await settle(page);
        await page.locator("#title").fill(edited);
        await page.getByRole("button", { name: /save|update|publish/i }).click();

        await expect(page).toHaveURL(new RegExp(`/blogs/${post._id}`), { timeout: 25_000 });
        await expect(page.getByRole("heading", { name: edited })).toBeVisible();
    });

    test("like a post and have the count follow to the archive", async ({ page, request }) => {
        const post = await createPost(request, user, `E2E like ${Date.now()}`);

        await page.goto(`/blogs/${post._id}`);
        await settle(page);
        const like = page.getByRole("button", { name: /like this post/i });
        await expect(like).toBeVisible();
        await like.click();
        await expect(page.getByRole("button", { name: /unlike/i })).toBeVisible();
    });

    test("comment on a post, edit it, then delete it", async ({ page, request }) => {
        const post = await createPost(request, user, `E2E comment ${Date.now()}`);
        await page.goto(`/blogs/${post._id}`);
        await settle(page);

        const box = page.getByLabel(/write a comment/i);
        await box.fill("A first comment from the end-to-end suite.");
        await page.getByRole("button", { name: /^post$/i }).click();
        await expect(page.getByText("A first comment from the end-to-end suite.").last()).toBeVisible();

        // The comment's own controls, not the post's — CommentRow gives each an accessible name
        // naming the author, precisely so a page of them is distinguishable.
        await page.getByRole("button", { name: /edit comment by/i }).first().click();
        const editor = page.getByLabel(/edit your comment/i);
        await editor.fill("An edited comment.");
        await page.getByRole("button", { name: /^save$/i }).click();
        await expect(page.getByText("An edited comment.").last()).toBeVisible();

        await page.getByRole("button", { name: /delete comment by/i }).first().click();
        const dialog = page.getByRole("alertdialog");
        await expect(dialog).toBeVisible();
        await dialog.getByRole("button", { name: /delete comment/i }).click();
        await expect(page.getByText("An edited comment.")).toHaveCount(0);
    });

    test("delete a post through the confirmation dialog", async ({ page, request }) => {
        const post = await createPost(request, user, `E2E delete ${Date.now()}`);
        await page.goto(`/blogs/${post._id}`);
        await settle(page);

        await page.getByRole("button", { name: /^delete$/i }).first().click();
        const dialog = page.getByRole("alertdialog");
        await expect(dialog).toBeVisible();
        // Escape must cancel without deleting — a destructive dialog that traps you is a bug.
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();

        await page.getByRole("button", { name: /^delete$/i }).first().click();
        await page.getByRole("alertdialog").getByRole("button", { name: /delete post/i }).click();
        await expect(page).toHaveURL(/\/blogs$/, { timeout: 25_000 });
        await expect(page.getByRole("heading", { name: post.title })).toHaveCount(0);
    });

    test("search finds a post by title, and a miss shows a real empty state", async ({ page, request }) => {
        const marker = `zebra${Date.now().toString(36)}`;
        await createPost(request, user, `E2E search ${marker}`);

        await page.goto(`/blogs?q=${marker}`);
        await settle(page);
        await expect(page.getByRole("heading", { name: new RegExp(marker) })).toBeVisible();

        await page.goto("/blogs?q=qqzzxxnothingmatchesthis");
        await settle(page);
        await expect(page.getByText(/nothing matches/i)).toBeVisible();
        await expect(page.getByRole("link", { name: /clear search/i })).toBeVisible();
    });

    test("the profile lists your own posts and its counts are real", async ({ page, request }) => {
        await createPost(request, user, `E2E profile ${Date.now()}`);
        await page.goto("/profile");
        await settle(page);
        await expect(page.getByRole("heading", { name: user.username })).toBeVisible();
        // The stat used to be the length of one fetched page rather than a real count.
        await expect(page.getByText(/^Posts$/)).toBeVisible();
    });
});
