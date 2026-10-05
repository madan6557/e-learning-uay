import { spawn, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  renameSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnvFile } from "node:process";

const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
try {
  loadEnvFile();
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const reportDir = resolve("apps/qa/public/reports");
mkdirSync(reportDir, { recursive: true });
const runId = randomUUID();
const startedAt = new Date().toISOString();
const state = {
  runId,
  pid: process.pid,
  running: true,
  phase: "preparing",
  startedAt,
  completedAt: null,
  error: null,
};
function atomic(path, value) {
  const temp = path + `.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + "\n");
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      renameSync(temp, path);
      return;
    } catch (error) {
      if (!["EPERM", "EBUSY", "EACCES"].includes(error.code) || attempt === 99)
        throw error;
      // Windows readers/watchers can briefly hold the destination file open.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
    }
  }
}
function progress(phase) {
  state.phase = phase;
  atomic(resolve(reportDir, "state.json"), state);
  console.log(`QA phase: ${phase}`);
}
function run(args, env = process.env) {
  return new Promise((resolveRun) => {
    const records = [];
    let buffer = "",
      stderr = "";
    const child = spawn(process.execPath, args, {
      cwd: root,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      appendFileSync(resolve(reportDir, runId + "-events.jsonl"), chunk);
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        try {
          records.push(JSON.parse(line));
        } catch {
          stderr += line + "\n";
        }
      }
    });
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", (error) =>
      resolveRun({ exitCode: 1, records, diagnostic: error.message }),
    );
    child.once("exit", (exitCode) =>
      resolveRun({
        exitCode: exitCode ?? 1,
        records,
        diagnostic: stderr.slice(-16000),
      }),
    );
  });
}
const reporter = pathToFileURL(resolve("scripts/qa-reporter.mjs")).href;
const suites = [];
try {
  progress("catalog");
  const generation = spawnSync(process.execPath, ["scripts/qa-catalog.mjs"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (generation.status !== 0)
    throw new Error(generation.stderr || "Catalog generation failed");
  const catalog = JSON.parse(readFileSync("docs/qa/catalog.json", "utf8"));
  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    "postgresql://uay:uay_local_only@127.0.0.1:55432/elearning_test?schema=public";
  const database = new URL(databaseUrl);
  if (!database.pathname.endsWith("_test"))
    throw new Error("Refuse database whose name does not end in _test.");
  // The suite must never inherit production Redis/SSO/File credentials.
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    AUTH_MODE: "development",
    NODE_ENV: "test",
    DEMO_MODE: "false",
    APP_ORIGIN: "http://127.0.0.1:5173",
    REDIS_URL: "",
    SSO_ISSUER: "",
    SSO_CLIENT_SECRET: "",
    FILE_SERVICE_URL: "",
    FILE_SERVICE_KEY: "",
    UAY_FILE_SERVICE_URL: "",
    UAY_FILE_SERVICE_API_KEY: "",
    UAY_FILE_SERVICE_REPOSITORY_ID: "",
    SSO_WEBHOOK_SECRET: "qa-local-only-secret",
  };
  progress("domain");
  const unitFiles = readdirSync("tests")
    .filter((file) => file.endsWith(".test.ts"))
    .map((file) => "tests/" + file);
  const domain = await run(
    [
      "--import",
      "tsx",
      "--test",
      "--test-concurrency=1",
      `--test-reporter=${reporter}`,
      ...unitFiles,
      "tests/qa/domain-v5.test.ts",
    ],
    env,
  );
  suites.push({ name: "domain", ...domain });
  progress("database");
  const migration = spawnSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "deploy",
      "--schema",
      "packages/db/prisma/schema.prisma",
    ],
    { cwd: root, env, encoding: "utf8", windowsHide: true, timeout: 60000 },
  );
  if (migration.status !== 0) {
    suites.push({
      name: "integration",
      exitCode: 1,
      records: [],
      diagnostic: (migration.stderr ?? "") + (migration.stdout ?? ""),
      blocked: true,
    });
  } else {
    progress("integration");
    const files = readdirSync("tests/integration")
      .filter((file) => file.endsWith(".test.ts"))
      .map((file) => "tests/integration/" + file);
    const integration = await run(
      [
        "--import",
        "tsx",
        "--test",
        "--test-concurrency=1",
        `--test-reporter=${reporter}`,
        ...files,
        "tests/qa/api-v5.test.ts",
      ],
      env,
    );
    suites.push({ name: "integration", ...integration });
  }
  progress("report");
  const records = suites.flatMap((s) =>
    s.records.map((record) => ({ ...record, suite: s.name })),
  );
  const normalized = (file) => file.replaceAll("\\", "/");
  const results = {};
  for (const c of catalog.cases) {
    const a = c.automation;
    if (!a) {
      results[c.id] = { status: "not_run", reason: c.manualReason };
      continue;
    }
    const record = records.find(
      (r) =>
        normalized(r.file).endsWith(a.file) &&
        (a.title.startsWith("[")
          ? r.name.startsWith(a.title)
          : r.name === a.title) &&
        ["test:pass", "test:fail"].includes(r.event),
    );
    if (record) {
      results[c.id] = {
        status:
          record.skipped || record.todo
            ? "not_run"
            : record.event === "test:pass"
              ? "pass"
              : "fail",
        runId,
        completedAt: new Date().toISOString(),
        kind: a.kind,
        scope: a.scope,
        test: record.name,
        file: a.file,
        line: record.line,
        durationMs: record.durationMs,
        error: record.error,
      };
    } else {
      const suite = suites.find(
        (s) => s.name === (a.kind === "unit" ? "domain" : "integration"),
      );
      results[c.id] = {
        status: suite?.blocked || suite?.exitCode ? "blocked" : "not_run",
        runId,
        kind: a.kind,
        scope: a.scope,
        reason: suite?.blocked
          ? "Database uji tidak tersedia; suite tidak dieksekusi."
          : "Assertion tidak menghasilkan event terminal; periksa log suite.",
        diagnostic: suite?.diagnostic,
      };
    }
  }
  const summary = {
    cases: catalog.cases.length,
    pass: 0,
    fail: 0,
    blocked: 0,
    not_run: 0,
  };
  for (const result of Object.values(results)) summary[result.status]++;
  const revision =
    spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    }).stdout?.trim() ?? "unknown";
  const regressionFindings = records
    .filter(
      (r) =>
        r.event === "test:fail" &&
        r.error?.failureType !== "subtestsFailed" &&
        !/^\d+ subtests? failed$/.test(r.error?.message ?? "") &&
        !Object.values(results).some(
          (result) =>
            result.test === r.name &&
            normalized(r.file).endsWith(result.file ?? "__unmapped__"),
        ),
    )
    .map((r) => ({
      name: r.name,
      file: normalized(r.file).replace(normalized(root), ""),
      error: r.error?.cause?.message ?? r.error?.message ?? "Assertion failed",
    }));
  const report = {
    version: 1,
    runId,
    startedAt,
    completedAt: new Date().toISOString(),
    revision,
    workingTree: "working copy (includes current uncommitted QA work)",
    catalogSha256: createHash("sha256")
      .update(readFileSync("docs/qa/catalog.json"))
      .digest("hex"),
    document: catalog.document,
    environment: {
      label: "Lokal · PostgreSQL _test · fixture SSO & File Service",
      database: database.pathname.slice(1),
      runtime: process.version,
      platform: process.platform,
      limitations: catalog.document.notes.at(-1),
    },
    summary,
    results,
    regressionFindings,
    suites: suites.map((s) => ({
      name: s.name,
      exitCode: s.exitCode,
      blocked: !!s.blocked,
      diagnostic: s.diagnostic,
      tests: s.records.filter((r) =>
        ["test:pass", "test:fail"].includes(r.event),
      ).length,
    })),
    records,
  };
  atomic(resolve(reportDir, runId + ".json"), report);
  atomic(resolve(reportDir, "latest.json"), report);
  state.running = false;
  state.phase = "complete";
  state.completedAt = report.completedAt;
  atomic(resolve(reportDir, "state.json"), state);
  const markdown = `# Hasil otomatis QA v5\n\nRun: ${runId}\nTanggal: ${report.completedAt}\nCommit: ${revision} (working copy)\nLingkungan: ${report.environment.label}\n\n${summary.cases} kasus: ${summary.pass} lulus, ${summary.fail} gagal, ${summary.blocked} terblokir, ${summary.not_run} belum diuji otomatis.\n\n## Temuan\n\n${catalog.cases
    .filter((c) => results[c.id].status === "fail")
    .map(
      (c) =>
        `- **${c.id} — ${c.title}**: ${results[c.id].error?.cause?.message ?? results[c.id].error?.message ?? "Assertion failed"}`,
    )
    .join(
      "\n",
    )}\n\n## Batas bukti\n\n${catalog.document.notes.map((note) => "- " + note).join("\n")}\n\nLihat portal QA untuk langkah tiap kasus dan evidence terstruktur. Hasil manual dicatat terpisah pada sesi browser pengguna.\n`;
  writeFileSync(
    "docs/qa/AUTOMATED-RESULTS.md",
    markdown +
      `\n## Regresi tambahan di luar pemetaan kasus\n\n${regressionFindings.length ? regressionFindings.map((f) => `- **${f.name}** (${f.file}):\n\n\`\`\`text\n${f.error}\n\`\`\`\n`).join("\n") : "Tidak ada assertion regresi tambahan yang gagal pada run ini."}\n`,
  );
  console.log(JSON.stringify(summary));
  process.exitCode =
    summary.fail || summary.blocked || suites.some((s) => s.exitCode) ? 1 : 0;
} catch (error) {
  state.running = false;
  state.phase = "error";
  state.completedAt = new Date().toISOString();
  state.error = error.message;
  atomic(resolve(reportDir, "state.json"), state);
  console.error(error.message);
  process.exitCode = 1;
}
