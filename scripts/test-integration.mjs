import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://uay:uay_local_only@127.0.0.1:55432/elearning_test?schema=public";
if (!new URL(databaseUrl).pathname.endsWith("_test"))
  throw new Error(
    "Integration checks require a separate database ending in _test.",
  );
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  AUTH_MODE: "development",
  DEMO_MODE: "false",
  REDIS_URL: "",
  REDIS_RESOLVED_URL: "",
  REDIS_RESOLVED_SOURCE: "disabled-for-tests",
  SSO_ISSUER: "",
  SSO_CLIENT_ID: "elearning-uay",
  SSO_AUDIENCE: "elearning-uay",
  SSO_REDIRECT_URI: "http://127.0.0.1:5173/api/v1/auth/callback",
  SSO_CLIENT_SECRET: "",
  DEMO_INTERNAL_SSO_URL: "",
  SSO_WEBHOOK_SECRET: "integration-local-only-secret",
  FILE_SERVICE_URL: "",
  FILE_SERVICE_KEY: "",
  UAY_FILE_SERVICE_URL: "",
  UAY_FILE_SERVICE_API_KEY: "",
  UAY_FILE_SERVICE_REPOSITORY_ID: "",
  APP_ORIGIN: "http://127.0.0.1:5173",
  NODE_ENV: "test",
};
const migration = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
    "--schema",
    "packages/db/prisma/schema.prisma",
  ],
  { stdio: "inherit", env, windowsHide: true },
);
if (migration.status) process.exit(migration.status);
const files = readdirSync("tests/integration")
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => `tests/integration/${f}`);
const tests = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", ...files],
  { stdio: "inherit", env, windowsHide: true },
);
process.exit(tests.status ?? 1);
