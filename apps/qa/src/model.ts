export type Status = "not_run" | "pass" | "fail" | "blocked";
export type FeatureAvailability = "active" | "disabled" | "backlog";
export type Case = {
  id: string;
  priority: string;
  role: string;
  module: string;
  family: string;
  featureKeys: string[];
  availability: FeatureAvailability;
  title: string;
  navigation?: string;
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
  /** -1 shows preparation, 0..n-1 are tutorial steps, n shows results. */
  tutorialStep: number;
  updatedAt?: string;
  tester?: string;
  environment?: string;
};
export type CertificateRecord = {
  completedAt: string;
  certificateId: string;
  priority: string;
  role?: string;
  build?: string;
  tester?: string;
};
export type Session = {
  id: string;
  name: string;
  tester: string;
  environment: string;
  build: string;
  createdAt: string;
  completedAt?: string;
  certificateId?: string;
  certificates?: Record<string, CertificateRecord>;
  records: Record<string, Manual>;
};
export type State = {
  version: 1;
  active: string;
  sessions: Session[];
  targetUrl: string;
};
export type FeatureInventoryItem = {
  id: string;
  title: string;
  description: string;
  availability: FeatureAvailability;
  caseIds: string[];
};
export const defaultTestEnvironment = "Staging/UAT · target perlu diverifikasi";
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
  tutorialStep: -1,
});
export function canRecordManualStatus(
  testCase: Pick<Case, "availability">,
  status: Status,
) {
  return (
    testCase.availability !== "backlog" ||
    (status !== "pass" && status !== "fail")
  );
}
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
    environment: defaultTestEnvironment,
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
    targetUrl: "",
  };
}
const storageKey = "uay-qa-v5-sessions";
export function validateState(
  value: unknown,
  ids: Set<string>,
  availabilityByCase?: Map<string, FeatureAvailability>,
): State {
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
      const availability = availabilityByCase?.get(id);
      const obsoleteBacklogResult =
        availability === "backlog" &&
        (r.status === "pass" || r.status === "fail");
      records[id] = {
        status: obsoleteBacklogResult ? "blocked" : r.status,
        actual: String(r.actual ?? "").slice(0, 20000),
        note: obsoleteBacklogResult
          ? [
              "Fitur ini berstatus backlog pada katalog saat ini; hasil lama dipindahkan ke Terblokir sampai fitur tersedia.",
              String(r.note ?? "").slice(0, 20000),
            ]
              .filter(Boolean)
              .join("\n")
              .slice(0, 20000)
          : String(r.note ?? "").slice(0, 20000),
        evidence: String(r.evidence ?? "").slice(0, 4000),
        checks: r.checks,
        updatedAt: r.updatedAt,
        tester: r.tester,
        environment: r.environment,
        tutorialStep:
          Number.isInteger(r.tutorialStep) && r.tutorialStep >= -1
            ? Math.min(r.tutorialStep, 1000)
            : -1,
      };
    }
    return {
      id: s.id,
      name: s.name.slice(0, 200),
      tester: String(s.tester ?? "").slice(0, 200),
      environment: (() => {
        const savedEnvironment = String(s.environment ?? "").slice(0, 500);
        return !savedEnvironment ||
          savedEnvironment === "Lokal · fixture SSO & File Service"
          ? defaultTestEnvironment
          : savedEnvironment;
      })(),
      build: String(s.build ?? "").slice(0, 200),
      createdAt: String(s.createdAt ?? ""),
      completedAt:
        typeof s.completedAt === "string" && !Number.isNaN(Date.parse(s.completedAt))
          ? s.completedAt
          : (typeof s.certificates?.all?.completedAt === "string" &&
              !Number.isNaN(Date.parse(s.certificates.all.completedAt))
              ? s.certificates.all.completedAt
              : undefined),
      certificateId:
        typeof s.certificateId === "string" && s.certificateId.length <= 100
          ? s.certificateId
          : (typeof s.certificates?.all?.certificateId === "string" &&
              s.certificates.all.certificateId.length <= 100
              ? s.certificates.all.certificateId
              : undefined),
      certificates: (() => {
        const certs: Record<string, CertificateRecord> = {};
        if (s.certificates && typeof s.certificates === "object") {
          for (const [key, rawCert] of Object.entries(s.certificates)) {
            const c = rawCert as any;
            if (
              c &&
              typeof c.completedAt === "string" &&
              !Number.isNaN(Date.parse(c.completedAt)) &&
              typeof c.certificateId === "string" &&
              c.certificateId.length <= 100
            ) {
              certs[key] = {
                completedAt: c.completedAt,
                certificateId: c.certificateId,
                priority: String(c.priority ?? key.split(":")[0] ?? key).slice(0, 20),
                role: typeof c.role === "string" ? c.role.slice(0, 100) : undefined,
                build:
                  typeof c.build === "string" ? c.build.slice(0, 200) : undefined,
                tester:
                  typeof c.tester === "string" ? c.tester.slice(0, 200) : undefined,
              };
            }
          }
        }
        if (
          !certs.all &&
          typeof s.completedAt === "string" &&
          !Number.isNaN(Date.parse(s.completedAt)) &&
          typeof s.certificateId === "string" &&
          s.certificateId.length <= 100
        ) {
          certs.all = {
            completedAt: s.completedAt,
            certificateId: s.certificateId,
            priority: "all",
            build: String(s.build ?? "").slice(0, 200),
            tester: String(s.tester ?? "").slice(0, 200),
          };
        }
        return Object.keys(certs).length ? certs : undefined;
      })(),
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
    targetUrl: (() => {
      const target = safeUrl(String(v.targetUrl ?? ""));
      // Older portal builds prefilled the local E-Learning development URL.
      // Clear that default so a staging/UAT tester must choose their target.
      return target === "http://127.0.0.1:5173/" ? "" : (target ?? "");
    })(),
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
export function readState(
  ids: Set<string>,
  availabilityByCase?: Map<string, FeatureAvailability>,
): State {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw
      ? validateState(JSON.parse(raw), ids, availabilityByCase)
      : initialState();
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

export const versionPresets = [
  "alpha 0.1.0",
  "beta 0.1.0",
  "beta 1.0.0",
  "v1.0.0",
  "v1.0.0-rc.1",
  "v1.1.0",
];

export function getPriorityProgress(
  priority: string,
  cases: Case[],
  records: Record<string, Manual>,
  role: string = "all",
) {
  const isAllPriority = priority === "all";
  const isAllRole = role === "all";
  const targetCases = cases.filter((c) => {
    const matchPriority = isAllPriority || c.priority === priority;
    const matchRole = isAllRole || c.role === role;
    return matchPriority && matchRole;
  });
  const requiredCases = targetCases.filter((c) => c.availability !== "backlog");
  if (requiredCases.length > 0) {
    const resolved = requiredCases.filter((c) =>
      ["pass", "fail", "blocked"].includes(records[c.id]?.status ?? "not_run"),
    ).length;
    return {
      resolved,
      total: requiredCases.length,
      isComplete: resolved === requiredCases.length,
      allCasesCount: targetCases.length,
    };
  }
  const resolved = targetCases.filter(
    (c) => (records[c.id]?.status ?? "not_run") === "blocked",
  ).length;
  return {
    resolved,
    total: targetCases.length,
    isComplete: targetCases.length > 0 && resolved === targetCases.length,
    allCasesCount: targetCases.length,
  };
}

export function isPriorityCompleted(
  priority: string,
  cases: Case[],
  records: Record<string, Manual>,
  role: string = "all",
) {
  return getPriorityProgress(priority, cases, records, role).isComplete;
}

export function formatCertificateDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function certificateText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[·•]/g, " | ")
    .replace(/[–—−]/g, "-")
    .replace(/[^\x20-\x7e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function certificatePdf(
  session: Session,
  stats: ReturnType<typeof statistics>,
  priority: string = "all",
  options?: {
    certificateId?: string;
    completedAt?: string;
    build?: string;
    tester?: string;
    role?: string;
  },
) {
  const targetRole = options?.role || "all";
  const certKey = targetRole === "all" ? priority : `${priority}:${targetRole}`;

  const completedTime =
    options?.completedAt ||
    session.certificates?.[certKey]?.completedAt ||
    session.certificates?.[priority]?.completedAt ||
    (priority === "all" && targetRole === "all"
      ? session.completedAt
      : undefined) ||
    new Date().toISOString();

  const certRawId =
    options?.certificateId ||
    session.certificates?.[certKey]?.certificateId ||
    session.certificates?.[priority]?.certificateId ||
    (priority === "all" && targetRole === "all"
      ? session.certificateId
      : undefined) ||
    crypto.randomUUID();

  const buildVersion =
    options?.build ||
    session.certificates?.[certKey]?.build ||
    session.certificates?.[priority]?.build ||
    session.build ||
    "Tidak dicantumkan";

  const testerName =
    options?.tester ||
    session.certificates?.[certKey]?.tester ||
    session.certificates?.[priority]?.tester ||
    session.tester ||
    "Tidak dicantumkan";

  const isAllPriority = priority === "all";
  const isAllRole = targetRole === "all";
  const priorityLabels: Record<string, string> = {
    P0: "Pilot",
    P1: "Pasca-pilot",
    P2: "Rencana masa depan",
  };
  const roleShortCodes: Record<string, string> = {
    Mahasiswa: "M",
    Dosen: "D",
    "Asisten Dosen (Asdos)": "AS",
    "Dosen Kolaborator": "DK",
    "Admin Prodi": "AP",
    "Super Admin": "SA",
    "Operator / DevOps": "OP",
    Rektor: "R",
  };
  const priorityDesc = priorityLabels[priority] || priority;
  const pCode = isAllPriority ? "" : `-${priority.toUpperCase()}`;
  const rCode = isAllRole
    ? ""
    : `-${roleShortCodes[targetRole] || targetRole.slice(0, 3).toUpperCase()}`;
  const certificateId = `QA-${new Date(completedTime).getFullYear()}${pCode}${rCode}-${certRawId.slice(0, 8).toUpperCase()}`;

  let certTitle = "SERTIFIKAT PENYELESAIAN QA";
  if (!isAllPriority && isAllRole) {
    certTitle = `SERTIFIKAT PENYELESAIAN QA - ${priority.toUpperCase()}`;
  } else if (isAllPriority && !isAllRole) {
    certTitle = `SERTIFIKAT PENYELESAIAN QA - ${targetRole.toUpperCase()}`;
  } else if (!isAllPriority && !isAllRole) {
    certTitle = `SERTIFIKAT PENYELESAIAN QA - ${priority.toUpperCase()} (${targetRole.toUpperCase()})`;
  }

  const certSubtitle =
    !isAllPriority && !isAllRole
      ? `Pengujian kualitas tingkat prioritas ${priority.toUpperCase()} untuk peran ${targetRole} telah dinyatakan selesai:`
      : !isAllPriority
        ? `Pengujian kualitas tingkat prioritas ${priority.toUpperCase()} telah dinyatakan selesai:`
        : !isAllRole
          ? `Pengujian kualitas untuk peran ${targetRole} telah dinyatakan selesai:`
          : `Sesi pengujian kualitas berikut telah dinyatakan selesai:`;

  let certScope = "Semua Prioritas (P0, P1, P2) · Semua Peran";
  if (!isAllPriority && isAllRole) {
    certScope = `Prioritas ${priority.toUpperCase()} (${priorityDesc}) · Semua Peran`;
  } else if (isAllPriority && !isAllRole) {
    certScope = `Semua Prioritas · Peran ${targetRole}`;
  } else if (!isAllPriority && !isAllRole) {
    certScope = `Prioritas ${priority.toUpperCase()} (${priorityDesc}) · Peran ${targetRole}`;
  }

  const pdfString = (value: string) =>
    certificateText(value)
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)");
  const color = (hex: string) => {
    const rgb = hex.match(/[0-9a-f]{2}/gi)!.map((part) =>
      (parseInt(part, 16) / 255).toFixed(3),
    );
    return rgb.join(" ");
  };
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    hex: string,
    align: "left" | "center" | "right" = "left",
  ) => {
    const safe = pdfString(value).slice(0, 180);
    const width = safe.length * size * 0.5;
    const textX =
      align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    return `BT /F1 ${size} Tf ${color(hex)} rg 1 0 0 1 ${Math.round(textX)} ${y} Tm (${safe}) Tj ET`;
  };
  const rect = (
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    stroke?: string,
  ) =>
    `${color(fill)} rg ${color(stroke || fill)} RG 0.8 w ${x} ${y} ${width} ${height} re ${stroke ? "B" : "f"}`;
  const line = (x1: number, y1: number, x2: number, y2: number, hex: string) =>
    `${color(hex)} RG 1 w ${x1} ${y1} m ${x2} ${y2} l S`;
  const wrap = (value: string, maxChars: number) => {
    const words = certificateText(value).split(" ");
    const result: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        result.push(current);
        current = word;
      } else current = next;
    }
    if (current) result.push(current);
    return result;
  };

  const navy = "17365B";
  const deepNavy = "102944";
  const gold = "C9A24A";
  const ink = "26384B";
  const muted = "64748B";
  const pale = "F4F7FA";
  const commands = [
    rect(0, 0, 842, 595, "FFFFFF"),
    rect(0, 458, 842, 137, navy),
    rect(0, 454, 842, 4, gold),
    rect(48, 493, 50, 50, gold),
    text("UAY", 73, 512, 15, deepNavy, "center"),
    text("E-LEARNING  |  QUALITY ASSURANCE", 116, 529, 11, "FFFFFF"),
    text("UAY DIGITAL TESTING PROGRAM", 116, 511, 9, "D6E0EA"),
    text("SERTIFIKAT", 421, 424, 11, gold, "center"),
    text(certTitle, 421, 391, certTitle.length > 42 ? 21 : 25, navy, "center"),
    ...wrap(certSubtitle, 92).slice(0, 2).map((lineText, index) =>
      text(lineText, 421, 369 - index * 16, 10, muted, "center"),
    ),
    rect(48, 280, 746, 66, pale, "E1E8EF"),
    text("DIBERIKAN UNTUK SESI", 66, 326, 8, muted),
    ...wrap(session.name || "Sesi pengujian QA", 66)
      .slice(0, 2)
      .map((lineText, index) =>
        text(lineText, 66, 301 - index * 19, index ? 16 : 19, navy),
      ),
    text("RINCIAN PENGUJIAN", 52, 258, 8, muted),
    ...wrap(`Cakupan: ${certScope}`, 54)
      .slice(0, 2)
      .map((lineText, index) =>
        text(lineText, 52, 240 - index * 13, 10, ink),
      ),
    ...wrap(`Penguji: ${testerName}`, 48)
      .slice(0, 2)
      .map((lineText, index) =>
        text(lineText, 432, 240 - index * 13, 10, ink),
      ),
    ...wrap(`Lingkungan: ${session.environment || "Tidak dicantumkan"}`, 54)
      .slice(0, 2)
      .map((lineText, index) => text(lineText, 52, 188 - index * 12, 9, ink)),
    ...wrap(`Versi aplikasi: ${buildVersion}`, 48)
      .slice(0, 2)
      .map((lineText, index) => text(lineText, 432, 188 - index * 12, 9, ink)),
    line(48, 172, 794, 172, "E1E8EF"),
    text("RINGKASAN HASIL UJI", 52, 155, 9, navy),
    text("SAAT SERTIFIKAT DITERBITKAN", 790, 155, 7, muted, "right"),
    line(48, 145, 794, 145, "E1E8EF"),
    text("TOTAL", 111, 124, 8, muted, "center"),
    text(String(stats.total), 111, 99, 22, navy, "center"),
    text("LULUS", 266, 124, 8, muted, "center"),
    text(String(stats.pass), 266, 99, 22, "238363", "center"),
    text("GAGAL", 421, 124, 8, muted, "center"),
    text(String(stats.fail), 421, 99, 22, "B54747", "center"),
    text("TERBLOKIR", 576, 124, 8, muted, "center"),
    text(String(stats.blocked), 576, 99, 22, "B7791F", "center"),
    text("BELUM DIUJI", 731, 124, 8, muted, "center"),
    text(String(stats.not_run), 731, 99, 22, ink, "center"),
    line(188, 91, 188, 132, "E1E8EF"),
    line(343, 91, 343, 132, "E1E8EF"),
    line(499, 91, 499, 132, "E1E8EF"),
    line(654, 91, 654, 132, "E1E8EF"),
    line(48, 78, 794, 78, "E1E8EF"),
    text(`Tanggal selesai: ${formatCertificateDate(completedTime)}`, 52, 59, 9, ink),
    text(`Nomor sertifikat: ${certificateId}`, 790, 59, 9, navy, "right"),
    text(
      "Dokumen ini mencatat penyelesaian pengujian. Status tiap kasus ditampilkan pada ringkasan hasil uji.",
      421,
      31,
      8,
      muted,
      "center",
    ),
    `${color(gold)} RG 1.5 w 24 24 794 547 re S`,
  ].join("\n");
  const stream = `${commands}\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}
