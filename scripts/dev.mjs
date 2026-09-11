import { spawn } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
if (!existsSync(".env")) copyFileSync(".env.example", ".env");
loadEnvFile();
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
if (process.env.AUTH_MODE !== "development")
  throw new Error(
    "Use production compose for OIDC deployments; this launcher is local development only.",
  );
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
launch(["--watch", "--import", "tsx", "apps/api/src/index.ts"]);
launch([
  "node_modules/vite/bin/vite.js",
  "--config",
  "apps/web/vite.config.ts",
]);
const stop = () => {
  for (const child of children) child.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
