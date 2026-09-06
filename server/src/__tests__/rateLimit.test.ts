import { describe, expect, it } from "vitest";
import request from "supertest";
import { api, makeUser } from "./helpers.js";

// Its own file on purpose. express-rate-limit keeps its counters in module scope, so tripping a
// limiter here would 429 every later login if these shared a module registry with the other suites.
// vitest's isolate:true gives each test file its own — which is exactly what makes this safe.
describe("credential rate limiting", () => {
    it("locks out after 10 failed logins and keeps the { message } shape", async () => {
        const user = await makeUser();

        for (let i = 0; i < 10; i++) {
            await request(api)
                .post("/api/users/login")
                .send({ email: user.email, password: "wrong-password" })
                .expect(400);
        }

        const blocked = await request(api)
            .post("/api/users/login")
            .send({ email: user.email, password: "wrong-password" })
            .expect(429);
        // The client's getErrorMessage reads this key; a bare string body would surface as
        // "Something went wrong".
        expect(typeof blocked.body.message).toBe("string");
        expect(blocked.body.message).toMatch(/too many/i);

        // Correct credentials are refused too — that is the point of a lockout.
        await request(api)
            .post("/api/users/login")
            .send({ email: user.email, password: user.password })
            .expect(429);
    });

    it("login and register have separate buckets", async () => {
        // Each rateLimit() call owns its own store. Sharing one instance across both routes would
        // let ten fumbled passwords block account creation from the same address.
        const user = await makeUser();
        for (let i = 0; i < 11; i++) {
            await request(api)
                .post("/api/users/login")
                .send({ email: user.email, password: "wrong-password" });
        }
        await request(api)
            .post("/api/users")
            .send({
                username: "unblocked",
                email: `unblocked${Date.now()}@example.test`,
                password: "password123",
            })
            .expect(201);
    });
});
