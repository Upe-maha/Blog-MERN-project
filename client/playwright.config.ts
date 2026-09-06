import { defineConfig, devices } from "@playwright/test";

// The app is two processes: this Next client and the Express API on :5000. Playwright starts the
// client; the API has to be running already, because it owns the database connection and a test
// run must not be the thing that decides which database is live.
//
// ⚠️ The API's default rate limit is 300 requests per 15 minutes, and a full run legitimately makes
// far more than that — every test registers an account and creates content. Start the API with
// limits sized for a test run, or the suite fails with 429s that look like application errors:
//
//     cd server && RATE_LIMIT_MAX=100000 RATE_LIMIT_WINDOW_MS=60000 npm run dev
//
// The production defaults are deliberately not weakened to accommodate the suite.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
    testDir: "./e2e",
    // Every spec drives one browser through a real journey; running them in parallel against one
    // shared database makes counts and list contents race. Correctness over wall-clock here.
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
    timeout: 45_000,
    expect: {
        timeout: 10_000,
        // The app uses a variable font and server-rendered content; a byte-exact match would be
        // noise. This tolerates sub-pixel text rendering while still catching real layout breaks.
        toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled", scale: "css" },
    },

    use: {
        baseURL: BASE_URL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
    },

    // The three viewports the audit requires. Named so a failure says which one broke.
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
        { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
        // Portrait tablet is a genuinely different case, not a smaller landscape one: it is below
        // the md breakpoint, so it gets the mobile navigation while still being 768px wide — the
        // width where a table is most likely to overflow.
        { name: "tablet-portrait", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
        { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: false, hasTouch: true } },
    ],

    // Reuses a server you already have running, so `npm run dev` in another terminal is not fought
    // over. Serves the production build in CI, which is what the visual snapshots are taken against.
    webServer: {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
    },
});
