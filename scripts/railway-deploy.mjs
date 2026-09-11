import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {}

console.log("=== Railway Pre-Deploy Step Starting ===");

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    console.log(`> ${cmd} ${args.join(" ")}`);
    const child = spawn(cmd, args, { stdio: "inherit", shell: true });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command ${cmd} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  try {
    console.log("Applying Prisma database migrations...");
    await runCommand("npx", ["prisma", "migrate", "deploy", "--schema", "packages/db/prisma/schema.prisma"]);
    console.log("Prisma migrations applied successfully.");

    const isDemo = process.env.DEMO_MODE === "true" || process.env.AUTH_MODE === "development";
    if (isDemo || process.env.SEED_ON_DEPLOY === "true") {
      console.log("Seeding demonstration / pilot accounts and data...");
      await runCommand("npx", ["tsx", "packages/db/seed.ts"]);
      console.log("Seed data applied successfully.");
    } else {
      console.log("Skipping seed (production mode).");
    }
    console.log("=== Railway Pre-Deploy Finished Successfully ===");
  } catch (error) {
    console.error("Railway Pre-Deploy failed:", error);
    process.exit(1);
  }
}

main();
