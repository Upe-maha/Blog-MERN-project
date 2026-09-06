import fs from "fs";
import path from "path";
import { defineConfig, type Plugin } from "vitest/config";

// src/ is ESM with NodeNext resolution, so every relative import carries a .js extension even
// though the file on disk is .ts. Node resolves that at runtime; Vite does not, and it is Vite that
// loads these modules under Vitest.
//
// This rewrites a relative "./env.js" to "./env.ts" when that file exists. Doing it here rather
// than changing the source is deliberate: dropping the .js extensions in src/ would satisfy Vitest
// and break the production build.
const resolveJsToTs = (): Plugin => ({
    name: "resolve-js-to-ts",
    enforce: "pre",
    resolveId(source, importer) {
        if (!importer || !source.startsWith(".") || !source.endsWith(".js")) return null;
        const candidate = path.resolve(path.dirname(importer), source.slice(0, -3) + ".ts");
        return fs.existsSync(candidate) ? candidate : null;
    },
});

export default defineConfig({
    plugins: [resolveJsToTs()],
    test: {
        environment: "node",
        globalSetup: ["./src/__tests__/globalSetup.ts"],
        setupFiles: ["./src/__tests__/setup.ts"],
        include: ["src/**/*.test.ts"],

        // Each test file gets its own module registry. That matters here because express-rate-limit
        // keeps its counters in module scope — without isolation, the rate-limit test would leave
        // every later login 429ing.
        isolate: true,
        fileParallelism: false, // one in-memory replica set, shared

        // env.ts validates these at import and exits the process if any is missing. Set here so
        // they exist before any module is loaded, and so CI needs no .env file.
        env: {
            NODE_ENV: "test",
            JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
            JWT_EXPIRES_IN: "1h",
            CLIENT_URL: "http://localhost:3000",
            LOG_LEVEL: "fatal", // the quietest level env.ts accepts; pino stays out of the test output
            // Transactions need a replica set; globalSetup starts one, so this can stay on and the
            // cascade deletes are exercised the way they run in production.
            ENABLE_TRANSACTIONS: "true",
            // Never contacted: no test uploads a file. Present only because env.ts requires them.
            CLOUDINARY_CLOUD_NAME: "test",
            CLOUDINARY_API_KEY: "test",
            CLOUDINARY_API_SECRET: "test",
        },
        testTimeout: 20_000,
        hookTimeout: 60_000,
    },
});
