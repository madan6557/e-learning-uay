import { spawn } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
loadEnvFile();
if (process.env.NODE_ENV === "production")
  throw new Error("The local launcher cannot run in production.");
process.env.AUTH_MODE = "oidc";
process.env.DEMO_MODE = process.env.DEMO_MODE ?? "true";
process.env.SSO_ISSUER = `http://127.0.0.1:${process.env.SSO_MOCK_PORT ?? 4402}`;
process.env.SSO_REDIRECT_URI = `${process.env.APP_ORIGIN ?? "http://127.0.0.1:5173"}/api/v1/auth/callback`;
const children = [];
function launch(args) {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    windowsHide: true,
  });
  children.push(child);
  return child;
}
async function run(args) {
  const child = launch(args);
  await new Promise((resolve, reject) => {
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command failed (${code})`)),
    );
    child.on("error", reject);
  });
}
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
let ready = false;
try {
  await db.$queryRaw`SELECT 1`;
  ready = true;
  console.log("Using the existing local PostgreSQL server.");
} catch {
  launch(["scripts/database.mjs"]);
}
for (let i = 0; i < 30; i++) {
  if (ready) break;
  try {
    await db.$queryRaw`SELECT 1`;
    ready = true;
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
await db.$disconnect();
if (!ready) throw new Error("Local PostgreSQL did not become ready.");
await run([
  "node_modules/prisma/build/index.js",
  "migrate",
  "deploy",
  "--schema",
  "packages/db/prisma/schema.prisma",
]);
await run(["--import", "tsx", "packages/db/seed.ts"]);
launch(["scripts/file-service.mjs"]);
const { startMockSso } = await import("./oidc-fixture.mjs");
const sso = await startMockSso({
  port: Number(process.env.SSO_MOCK_PORT ?? 4402),
  origin: process.env.APP_ORIGIN,
});
console.log(`Local OIDC provider ready at ${sso.issuer}`);
launch([
  "--watch",
  "--watch-path=apps/api/src",
  "--watch-path=packages/shared/src",
  "--import",
  "tsx",
  "apps/api/src/index.ts",
]);
launch([
  "node_modules/vite/bin/vite.js",
  "--config",
  "apps/web/vite.config.ts",
]);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  void sso.close();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
