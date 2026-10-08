import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";
try {
  loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const database = "elearning_visual_test";
const url =
  "postgresql://uay:uay_local_only@127.0.0.1:55432/" +
  database +
  "?schema=public";
Object.assign(process.env, {
  NODE_ENV: "test",
  DEMO_MODE: "true",
  AUTH_MODE: "oidc",
  DATABASE_URL: url,
  REDIS_URL: "",
  REDIS_PRIVATE_URL: "",
  REDISHOST: "",
  APP_ORIGIN: "http://127.0.0.1:5173",
  API_ORIGIN: "http://127.0.0.1:3000",
  PORT: "3000",
  API_HOST: "127.0.0.1",
  SSO_ISSUER: "http://127.0.0.1:4402",
  SSO_MOCK_PORT: "4402",
  SSO_REDIRECT_URI: "http://127.0.0.1:5173/api/v1/auth/callback",
  SSO_CLIENT_ID: "elearning-uay",
  SSO_AUDIENCE: "elearning-uay",
  SSO_CLIENT_SECRET: "",
  SSO_WEBHOOK_SECRET: "visual-test-only",
  FILE_SERVICE_TYPE: "legacy",
  FILE_SERVICE_URL: "http://127.0.0.1:3001",
  FILE_SERVICE_KEY: "visual-test-only",
  FILE_SERVICE_PORT: "3001",
  FILE_ALLOWED_ORIGINS: "http://127.0.0.1:3001",
  FILE_STORAGE_PROVIDER: "local",
  FILE_SERVICE_DATA_DIRECTORY: ".local/visual-test-files",
  VITE_API_URL: "",
});
const children = [];
const launch = (args) => {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  return child;
};
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = launch(args);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Test setup failed (" + code + ").")),
    );
    child.once("error", reject);
  });
const admin = new PrismaClient({
  datasourceUrl: url.replace("/" + database + "?", "/postgres?"),
});
try {
  const exists = await admin.$queryRawUnsafe(
    "SELECT 1 FROM pg_database WHERE datname=$1",
    database,
  );
  if (!exists.length)
    await admin.$executeRawUnsafe('CREATE DATABASE "' + database + '"');
} finally {
  await admin.$disconnect();
}
await run([
  "node_modules/prisma/build/index.js",
  "migrate",
  "deploy",
  "--schema",
  "packages/db/prisma/schema.prisma",
]);
const db = new PrismaClient();
let count;
try {
  count = await db.user.count();
} finally {
  await db.$disconnect();
}
if (!count) await run(["--import", "tsx", "packages/db/seed.ts"]);
await run(["--import", "tsx", "scripts/prepare-demo-files.ts"]);
launch(["scripts/file-service.mjs"]);
const { startMockSso } = await import("./oidc-fixture.mjs");
const sso = await startMockSso();
launch(["--import", "tsx", "apps/api/src/index.ts"]);
launch([
  "node_modules/vite/bin/vite.js",
  "--config",
  "apps/web/vite.config.ts",
]);
console.log("Mode uji visual: http://127.0.0.1:5173 — database " + database);
let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  await sso.close();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
