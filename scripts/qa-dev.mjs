import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createServer } from "vite";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const catalog = spawnSync(process.execPath, ["scripts/qa-catalog.mjs"], {
  stdio: "inherit",
  windowsHide: true,
});
if (catalog.status !== 0) process.exit(catalog.status ?? 1);
const server = await createServer({ configFile: "apps/qa/vite.config.ts" });
await server.listen();
server.printUrls();
const stop = async () => {
  await server.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
