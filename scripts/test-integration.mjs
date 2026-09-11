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
  ["--import", "tsx", "--test", ...files],
  { stdio: "inherit", env, windowsHide: true },
);
process.exit(tests.status ?? 1);
