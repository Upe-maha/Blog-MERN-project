import { describe, it } from "vitest";
import request from "supertest";
import { api, makeUser } from "./helpers.js";

// A separate file from rateLimit.test.ts, not just a separate describe. Vitest's isolation boundary
// is the FILE, so the counters tripped over there would still be at the limit here — which is how
// this test failed the first time it was written.
describe("skipSuccessfulRequests", () => {
    it("signing in repeatedly never locks you out", async () => {
        // Only failures count toward the credential limiter, so a legitimate user reloading the app
        // or signing in on several devices is never locked out of their own account.
        const user = await makeUser();
        for (let i = 0; i < 15; i++) {
            await request(api)
                .post("/api/users/login")
                .send({ email: user.email, password: user.password })
                .expect(200);
        }
    });
});
