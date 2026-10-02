import { spawn } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (!existsSync(".env")) copyFileSync(".env.example", ".env");
loadEnvFile();

const children = [];
let localPgLaunched = false;

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
  localPgLaunched = true;
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

console.log("Resetting database schema...");
await run([
  "node_modules/prisma/build/index.js",
  "migrate",
  "reset",
  "--schema",
  "packages/db/prisma/schema.prisma",
  "--force",
  "--skip-generate",
  "--skip-seed",
]);

console.log("Seeding fresh demo data...");
await run(["--import", "tsx", "packages/db/seed.ts"]);

console.log("\nDatabase reset and fresh seed completed successfully!");

if (localPgLaunched) {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
}
process.exit(0);
