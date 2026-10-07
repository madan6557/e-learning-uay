export type Status = "not_run" | "pass" | "fail" | "blocked";
export type Case = {
  id: string;
  priority: string;
  role: string;
  module: string;
  family: string;
  title: string;
  type: string;
  section: string;
  sourceLine: number;
  sourceDocument?: "current";
  requirements: string[];
  preconditions: string[];
  data: string;
  steps: { action: string; expected: string }[];
  expected: string;
  cleanup: string;
  automation: {
    kind: string;
    file: string;
    title: string;
    scope: string;
  } | null;
  manualReason: string;
  tags: string[];
  scope: string;
  priorityBasis: string;
};
export type Manual = {
  status: Status;
  actual: string;
  note: string;
  evidence: string;
  checks: number[];
  updatedAt?: string;
  tester?: string;
  environment?: string;
};
export type Session = {
  id: string;
  name: string;
  tester: string;
  environment: string;
  build: string;
  createdAt: string;
  records: Record<string, Manual>;
};
export type State = {
  version: 1;
  active: string;
  sessions: Session[];
  targetUrl: string;
};
export type Evidence = {
  status: Status;
  reason?: string;
  kind?: string;
  test?: string;
  scope?: string;
  file?: string;
  line?: number;
  durationMs?: number;
  completedAt?: string;
  runId?: string;
  error?: any;
  diagnostic?: string;
};
export type Report = {
  runId: string;
  startedAt: string;
  completedAt: string;
  revision: string;
  environment: {
    label: string;
    database: string;
    runtime: string;
    limitations: string;
  };
  summary: Record<string, number>;
  results: Record<string, Evidence>;
  regressionFindings?: { name: string; file: string; error: string }[];
  suites: {
    name: string;
    exitCode: number;
    blocked: boolean;
    diagnostic: string;
    tests: number;
  }[];
  records: any[];
};
export const emptyManual = (): Manual => ({
  status: "not_run",
  actual: "",
  note: "",
  evidence: "",
  checks: [],
});
export function comparison(
  manual: Status = "not_run",
  auto: Status = "not_run",
) {
  if (["pass", "fail"].includes(manual) && ["pass", "fail"].includes(auto))
    return manual === auto ? "match" : "mismatch";
  if (manual === "blocked" || auto === "blocked") return "blocked";
  return "pending";
}
export function statistics(
  cases: Case[],
  records: Record<string, Manual>,
  results: Record<string, Evidence> = {},
) {
  const result = {
    total: cases.length,
    tested: 0,
    pass: 0,
    fail: 0,
    blocked: 0,
    not_run: 0,
    autoPass: 0,
    autoFail: 0,
    autoBlocked: 0,
    autoTested: 0,
    match: 0,
    mismatch: 0,
    comparable: 0,
    progress: 0,
  };
  for (const c of cases) {
    const manual = records[c.id]?.status ?? "not_run",
      auto = results[c.id]?.status ?? "not_run";
    result[manual]++;
    if (manual === "pass" || manual === "fail") result.tested++;
    if (auto === "pass") result.autoPass++;
    if (auto === "fail") result.autoFail++;
    if (auto === "blocked") result.autoBlocked++;
    const diff = comparison(manual, auto);
    if (diff === "match") result.match++;
    if (diff === "mismatch") result.mismatch++;
  }
  result.autoTested = result.autoPass + result.autoFail;
  result.comparable = result.match + result.mismatch;
  result.progress = result.total
    ? Math.round((result.tested / result.total) * 100)
    : 0;
  return result;
}
export function newSession(): Session {
  return {
    id: crypto.randomUUID(),
    name: "Sesi pengujian 1",
    tester: "",
    environment: "Lokal · fixture SSO & File Service",
    build: "",
    createdAt: new Date().toISOString(),
    records: {},
  };
}
export function initialState(): State {
  const session = newSession();
  return {
    version: 1,
    active: session.id,
    sessions: [session],
    targetUrl: "http://127.0.0.1:5173/",
  };
}
const storageKey = "uay-qa-v5-sessions";
export function validateState(value: unknown, ids: Set<string>): State {
  const v = value as any;
  if (
    !v ||
    v.version !== 1 ||
    !Array.isArray(v.sessions) ||
    !v.sessions.length ||
    v.sessions.length > 100 ||
    typeof v.active !== "string"
  )
    throw new Error("INVALID_BACKUP");
  const sessions: Session[] = v.sessions.map((s: any) => {
    if (
      !s ||
      typeof s.id !== "string" ||
      typeof s.name !== "string" ||
      !s.records ||
      typeof s.records !== "object"
    )
      throw new Error("INVALID_BACKUP");
    const records: Record<string, Manual> = {};
    for (const [id, raw] of Object.entries(s.records)) {
      if (!ids.has(id)) continue;
      const r = raw as any;
      if (
        !r ||
        !["not_run", "pass", "fail", "blocked"].includes(r.status) ||
        !Array.isArray(r.checks) ||
        r.checks.some((n: any) => !Number.isInteger(n) || n < 0)
      )
        throw new Error("INVALID_BACKUP");
      records[id] = {
        status: r.status,
        actual: String(r.actual ?? "").slice(0, 20000),
        note: String(r.note ?? "").slice(0, 20000),
        evidence: String(r.evidence ?? "").slice(0, 4000),
        checks: r.checks,
        updatedAt: r.updatedAt,
        tester: r.tester,
        environment: r.environment,
      };
    }
    return {
      id: s.id,
      name: s.name.slice(0, 200),
      tester: String(s.tester ?? "").slice(0, 200),
      environment: String(s.environment ?? "").slice(0, 500),
      build: String(s.build ?? "").slice(0, 200),
      createdAt: String(s.createdAt ?? ""),
      records,
    };
  });
  if (
    new Set(sessions.map((s) => s.id)).size !== sessions.length ||
    !sessions.some((s) => s.id === v.active)
  )
    throw new Error("INVALID_BACKUP");
  return {
    version: 1,
    active: v.active,
    sessions,
    targetUrl: safeUrl(v.targetUrl) ?? "http://127.0.0.1:5173/",
  };
}
export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function readState(ids: Set<string>): State {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? validateState(JSON.parse(raw), ids) : initialState();
  } catch {
    return initialState();
  }
}
export function saveState(state: State) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}
export function csvValue(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function exportCsv(
  cases: Case[],
  records: Record<string, Manual>,
  results: Record<string, Evidence>,
  session: Session,
) {
  const rows: unknown[][] = [
    [
      "ID",
      "Prioritas",
      "Role",
      "Modul",
      "Kasus",
      "Dokumen",
      "Jenis uji",
      "Manual",
      "Otomatis",
      "Perbandingan",
      "Aktual",
      "Catatan",
      "Bukti",
      "Penguji",
      "Lingkungan",
      "Versi aplikasi",
      "Waktu manual",
      "Run otomatis",
      "Jenis otomatis",
      "Scope bukti",
      "Data uji",
      "Langkah",
      "Harapan",
    ],
  ];
  for (const c of cases) {
    const m = records[c.id] ?? emptyManual(),
      a = results[c.id];
    rows.push([
      c.id,
      c.priority,
      c.role,
      c.module,
      c.title,
      `v5 §${c.section}`,
      c.type,
      m.status,
      a?.status ?? "not_run",
      comparison(m.status, a?.status),
      m.actual,
      m.note,
      m.evidence,
      m.tester ?? session.tester,
      m.environment ?? session.environment,
      session.build,
      m.updatedAt,
      a?.runId,
      a?.kind,
      a?.scope,
      c.data,
      c.steps.map((s, i) => `${i + 1}. ${s.action} → ${s.expected}`).join("\n"),
      c.expected,
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(csvValue).join(",")).join("\r\n");
}
