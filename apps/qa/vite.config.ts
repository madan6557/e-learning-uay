import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../..", import.meta.url));
const reportPath = resolve(root, "apps/qa/public/reports/state.json");
function localRunner(): Plugin {
  let child: ReturnType<typeof spawn> | null = null;
  function readState() {
    if (!existsSync(reportPath)) return { running: false, phase: "idle" };
    const state = JSON.parse(readFileSync(reportPath, "utf8"));
    if (state.running && state.pid) {
      try {
        process.kill(state.pid, 0);
      } catch {
        state.running = false;
        state.phase = "interrupted";
      }
    }
    return state;
  }
  return {
    name: "uay-local-qa-runner",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] === "/reports/latest.json") {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          const latestPath = resolve(
            root,
            "apps/qa/public/reports/latest.json",
          );
          if (!existsSync(latestPath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: "REPORT_NOT_AVAILABLE" }));
            return;
          }
          // Read and close before sending, so a static stream cannot lock the
          // report against replacement on Windows while a client is connected.
          res.end(readFileSync(latestPath));
          return;
        }
        if (req.url?.split("?")[0] === "/source/v5.md") {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(
            readFileSync(
              resolve(root, "docs/Technical Design - E-Learning UAY - v5.0.md"),
            ),
          );
          return;
        }
        if (req.url !== "/__qa/state" && req.url !== "/__qa/run") return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        if (req.url === "/__qa/state" && req.method === "GET") {
          res.end(JSON.stringify({ ...readState(), available: true }));
          return;
        }
        // A loopback-only endpoint with a fixed command, no shell or request arguments.
        const allowed =
          req.headers.origin === "http://127.0.0.1:5174" &&
          req.headers.host === "127.0.0.1:5174" &&
          ["127.0.0.1", "::ffff:127.0.0.1"].includes(
            req.socket.remoteAddress ?? "",
          );
        if (req.method !== "POST" || !allowed) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "LOCAL_ORIGIN_REQUIRED" }));
          return;
        }
        if (child || readState().running) {
          res.statusCode = 409;
          res.end(JSON.stringify({ error: "RUN_IN_PROGRESS" }));
          return;
        }
        child = spawn(process.execPath, ["scripts/qa-runner.mjs"], {
          cwd: root,
          windowsHide: true,
          stdio: "ignore",
        });
        child.once("exit", () => {
          child = null;
        });
        child.once("error", () => {
          child = null;
        });
        res.statusCode = 202;
        res.end(JSON.stringify({ accepted: true }));
      });
    },
  };
}
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), localRunner()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    fs: { allow: [root] },
    watch: { ignored: ["**/public/reports/**"] },
  },
  build: { outDir: "dist" },
});
