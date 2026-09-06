import { describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { api, makeUser, type TestUser } from "./helpers.js";
import User from "../models/user.js";
import { env } from "../env.js";

describe("registration", () => {
    it("silently strips a role field from the body", async () => {
        // The privilege escalation this closes: registerSchema has no `role` key and z.object drops
        // unknown ones, so this creates a normal user rather than 400ing or granting admin.
        const email = `escalate${Date.now()}@example.test`;
        await request(api)
            .post("/api/users")
            .send({ username: "escalator", email, password: "password123", role: "admin" })
            .expect(201);

        const created = await User.findOne({ email }).select("role").lean();
        expect(created?.role).toBe("user");
    });

    it("never returns the password hash", async () => {
        const res = await request(api)
            .post("/api/users")
            .send({
                username: "nohash",
                email: `nohash${Date.now()}@example.test`,
                password: "password123",
            })
            .expect(201);
        expect(res.body.user).not.toHaveProperty("password");
    });

    it("rejects a duplicate email with 409", async () => {
        const user = await makeUser();
        await request(api)
            .post("/api/users")
            .send({ username: "dupe", email: user.email, password: "password123" })
            .expect(409);
    });
});

describe("login", () => {
    it("answers 400, not 401, for bad credentials", async () => {
        // 401 would fire the client's global "your session expired" logout on a visitor who was
        // never signed in.
        const user = await makeUser();
        await request(api)
            .post("/api/users/login")
            .send({ email: user.email, password: "wrong-password" })
            .expect(400);
    });

    it("gives the same message for a wrong password and a missing account", async () => {
        // Otherwise the form is an account-enumeration oracle.
        const user = await makeUser();
        const wrongPw = await request(api)
            .post("/api/users/login")
            .send({ email: user.email, password: "wrong-password" });
        const noSuchUser = await request(api)
            .post("/api/users/login")
            .send({ email: "nobody@example.test", password: "wrong-password" });
        expect(wrongPw.body.message).toBe(noSuchUser.body.message);
    });
});

describe("tokens", () => {
    it("rejects a malformed token", async () => {
        await request(api)
            .get("/api/users/me")
            .set({ Authorization: "Bearer not-a-real-token" })
            .expect(401);
    });

    it("rejects a token signed with the wrong secret", async () => {
        const user = await makeUser();
        const forged = jwt.sign({ userId: user._id, email: user.email, role: "admin" }, "wrong-secret");
        await request(api).get("/api/users/me").set({ Authorization: `Bearer ${forged}` }).expect(401);
    });

    it("ignores the role claim inside a valid token", async () => {
        // Correctly signed, but claiming admin. authenticate re-reads the real role from Mongo.
        const user = await makeUser();
        const escalated = jwt.sign(
            { userId: user._id, email: user.email, role: "admin" },
            env.JWT_SECRET
        );
        await request(api).get("/api/admin/users").set({ Authorization: `Bearer ${escalated}` }).expect(403);
    });

    it("rejects a missing Authorization header", async () => {
        await request(api).get("/api/users/me").expect(401);
    });
});

describe("blocked accounts", () => {
    it("a token issued before the block stops working immediately", async () => {
        const blocked = await makeUser({ isBlocked: true });
        const res = await request(api).get("/api/users/me").set(blocked.auth).expect(403);
        expect(res.body.message).toMatch(/blocked/i);
    });

    it("a blocked account cannot log in", async () => {
        const blocked = await makeUser({ isBlocked: true });
        await request(api)
            .post("/api/users/login")
            .send({ email: blocked.email, password: blocked.password })
            .expect(403);
    });
});

describe("admin surface", () => {
    it("is 401 anonymous and 403 for a normal user", async () => {
        const user = await makeUser();
        await request(api).get("/api/admin/users").expect(401);
        await request(api).get("/api/admin/users").set(user.auth).expect(403);
    });

    it("lets an admin in, and never ships a password field", async () => {
        const admin = await makeUser({ role: "admin" });
        await makeUser();
        const res = await request(api).get("/api/admin/users").set(admin.auth).expect(200);
        expect(res.body.users.length).toBeGreaterThan(0);
        for (const u of res.body.users) expect(u).not.toHaveProperty("password");
    });

    it("refuses to delete the last admin's own account", async () => {
        // The one path that can lock everybody out of the dashboard.
        const admin = await makeUser({ role: "admin" });
        const res = await request(api).delete("/api/users/me").set(admin.auth).expect(400);
        expect(res.body.message).toMatch(/only admin/i);
    });

    it("allows it once a second admin exists", async () => {
        const first = await makeUser({ role: "admin" });
        await makeUser({ role: "admin" });
        await request(api).delete("/api/users/me").set(first.auth).expect(200);
    });

    it("an admin cannot block or demote themselves", async () => {
        const admin = await makeUser({ role: "admin" });
        await request(api).patch(`/api/admin/users/${admin._id}/block`).set(admin.auth).expect(400);
        await request(api)
            .post(`/api/admin/users/${admin._id}/role`)
            .set(admin.auth)
            .send({ role: "user" })
            .expect(400);
    });
});

describe("changing a password", () => {
    const change = (user: TestUser, body: Record<string, unknown>) =>
        request(api).patch("/api/users/me/password").set(user.auth).send(body);

    it("cannot be called without a token", async () => {
        await request(api)
            .patch("/api/users/me/password")
            .send({ currentPassword: "password123", newPassword: "a-brand-new-password" })
            .expect(401);
    });

    it("answers 400, not 401, for a wrong current password", async () => {
        // 401 would fire the client's global "your session expired" logout and throw away the form
        // the user is standing in, because they mistyped one field.
        const user = await makeUser();
        const res = await change(user, {
            currentPassword: "not-my-password",
            newPassword: "a-brand-new-password",
        }).expect(400);
        expect(res.body.message).toMatch(/current password/i);
    });

    it("holds the new password to the 8 character minimum", async () => {
        const user = await makeUser();
        await change(user, { currentPassword: user.password, newPassword: "short" }).expect(400);
    });

    it("refuses a new password identical to the current one", async () => {
        const user = await makeUser();
        await change(user, { currentPassword: user.password, newPassword: user.password }).expect(400);
    });

    it("swaps the password: the old one stops working, the new one signs in", async () => {
        const user = await makeUser();
        const next = "a-brand-new-password";
        await change(user, { currentPassword: user.password, newPassword: next }).expect(200);

        await request(api)
            .post("/api/users/login")
            .send({ email: user.email, password: user.password })
            .expect(400);
        await request(api)
            .post("/api/users/login")
            .send({ email: user.email, password: next })
            .expect(200);
    });

    it("retires the tokens issued before the change and returns one that works", async () => {
        // The whole point of the feature: a session someone else is holding does not survive the
        // password change made because of it. The token that authorised this very request included.
        const user = await makeUser();
        const res = await change(user, {
            currentPassword: user.password,
            newPassword: "another-new-password",
        }).expect(200);

        await request(api).get("/api/users/me").set(user.auth).expect(401);

        expect(res.body.token).toBeTruthy();
        await request(api)
            .get("/api/users/me")
            .set({ Authorization: `Bearer ${res.body.token}` })
            .expect(200);
    });

    it("never writes the new password in the clear", async () => {
        const user = await makeUser();
        await change(user, {
            currentPassword: user.password,
            newPassword: "a-brand-new-password",
        }).expect(200);

        const row = await User.findById(user._id).select("+password").lean();
        expect(row?.password).not.toBe("a-brand-new-password");
        expect(row?.password.startsWith("$2")).toBe(true);
    });
});
