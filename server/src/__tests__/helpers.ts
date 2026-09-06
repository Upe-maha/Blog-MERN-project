import request from "supertest";
import type { Express } from "express";
import app from "../app.js";
import User from "../models/user.js";
import { hashPassword } from "../utils/hashPassword.js";

export const api = app as Express;

let seq = 0;

export interface TestUser {
    _id: string;
    username: string;
    email: string;
    password: string;
    token: string;
    auth: { Authorization: string };
}

// Creates the row directly and then logs in through the real endpoint, so the token is produced by
// the same code path production uses — but without spending a bcrypt hash per test on the register
// route, and without tripping the register rate limiter.
export async function makeUser(
    opts: { role?: "user" | "admin"; isBlocked?: boolean } = {}
): Promise<TestUser> {
    const n = ++seq;
    const username = `tester${n}_${Date.now()}`;
    const email = `${username}@example.test`;
    const password = "password123";

    const user = await User.create({
        username,
        email,
        password: await hashPassword(password),
        role: opts.role ?? "user",
        isBlocked: opts.isBlocked ?? false,
    });

    // A blocked account cannot log in, so mint its token before blocking it — which is exactly the
    // scenario the middleware exists for: a valid token whose account was blocked afterwards.
    if (opts.isBlocked) {
        await User.updateOne({ _id: user._id }, { isBlocked: false });
    }
    const res = await request(api).post("/api/users/login").send({ email, password });
    if (opts.isBlocked) {
        await User.updateOne({ _id: user._id }, { isBlocked: true });
    }

    const token: string = res.body.token;
    return {
        _id: String(user._id),
        username,
        email,
        password,
        token,
        auth: { Authorization: `Bearer ${token}` },
    };
}

export async function makeBlog(owner: TestUser, title = "A test post") {
    const res = await request(api)
        .post("/api/blogs")
        .set(owner.auth)
        .send({ title, description: "A body long enough to clear the ten character minimum." });
    return res.body.blog as { _id: string; title: string };
}

export async function makeComment(author: TestUser, blogId: string, content = "a comment") {
    const res = await request(api)
        .post(`/api/comments/blog/${blogId}`)
        .set(author.auth)
        .send({ content });
    return res.body.comment as { _id: string };
}
