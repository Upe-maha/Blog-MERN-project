import { MongoMemoryReplSet } from "mongodb-memory-server";

// A one-node REPLICA SET, not a standalone. mongodb-memory-server gives you a standalone by
// default, and a standalone cannot do multi-document transactions — so the cascade deletes in
// user.service.ts and blog.controller.ts would fail under test while working in production. A
// replica set means the tests exercise the same code path Atlas does.
let replSet: MongoMemoryReplSet;

export async function setup() {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
    // Runs before the test workers are forked, so they inherit this. env.ts reads it, and
    // dotenv.config() does not override an already-set variable — so a developer's real .env
    // cannot pull the suite onto their live database.
    process.env.MONGODB_URI = replSet.getUri("marginalia_test");
}

export async function teardown() {
    await replSet?.stop();
}
