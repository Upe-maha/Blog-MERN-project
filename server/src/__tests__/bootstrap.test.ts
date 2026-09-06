import { describe, expect, it } from "vitest";
import request from "supertest";
import { api, makeUser } from "./helpers.js";
import User from "../models/user.js";

const signup = (n: string, claim?: "true" | "false") =>
    request(api)
        .post("/api/users")
        .send({
            username: n,
            email: `${n}@example.test`,
            password: "password123",
            ...(claim ? { claimAdmin: claim } : {}),
        });

describe("first-run admin bootstrap", () => {
    it("reports that no administrator exists yet", async () => {
        const res = await request(api).get("/api/users/bootstrap-status").expect(200);
        expect(res.body).toEqual({ adminExists: false });
    });

    it("grants admin to the first account that claims it", async () => {
        const res = await signup("founder", "true").expect(201);
        expect(res.body.user.role).toBe("admin");

        const after = await request(api).get("/api/users/bootstrap-status").expect(200);
        expect(after.body.adminExists).toBe(true);
    });

    it("ignores the claim once an administrator exists", async () => {
        await makeUser({ role: "admin" });
        const res = await signup("latecomer", "true").expect(201);
        expect(res.body.user.role).toBe("user");
    });

    it("ignores the claim when the admin came from the seed script", async () => {
        // seed:admin leaves bootstrapAdmin unset, so the unique index cannot see it. The role
        // pre-check is what closes that case.
        await User.create({
            username: "seeded",
            email: "seeded@example.test",
            password: "x".repeat(60),
            role: "admin",
        });
        const res = await signup("opportunist", "true").expect(201);
        expect(res.body.user.role).toBe("user");
    });

    it("never grants admin without the flag", async () => {
        const res = await signup("plain").expect(201);
        expect(res.body.user.role).toBe("user");
    });

    it("still strips a role supplied directly in the body", async () => {
        await request(api)
            .post("/api/users")
            .send({
                username: "forger",
                email: "forger@example.test",
                password: "password123",
                role: "admin",
            })
            .expect(201);
        const created = await User.findOne({ email: "forger@example.test" }).select("role").lean();
        expect(created?.role).toBe("user");
    });

    it("rejects a claimAdmin value that is not true or false", async () => {
        await request(api)
            .post("/api/users")
            .send({
                username: "junk",
                email: "junk@example.test",
                password: "password123",
                claimAdmin: "yes",
            })
            .expect(400);
    });

    it("grants admin to exactly one of many simultaneous claims", async () => {
        // The whole reason this is a unique sparse index rather than a count-then-create: eight
        // requests all observe "no admin yet" before any of them has finished inserting.
        const results = await Promise.all(
            Array.from({ length: 8 }, (_, i) => signup(`racer${i}`, "true"))
        );
        for (const r of results) expect(r.status).toBe(201);

        const roles = results.map((r) => r.body.user.role);
        expect(roles.filter((role) => role === "admin")).toHaveLength(1);
        expect(await User.countDocuments({ role: "admin" })).toBe(1);
        // The losers are still registered — a lost race must not cost someone their signup.
        expect(await User.countDocuments({})).toBe(8);
    });
});
