import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Award,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleAlert,
  ClipboardCheck,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Layers,
  ListChecks,
  LoaderCircle,
  Menu,
  Moon,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tag,
  Target,
  Terminal,
  Upload,
  Users,
  Volume2,
  VolumeX,
  X,
  XCircle,
} from "lucide-react";
import dictionary from "../../../packages/shared/src/id.json";
import rawCatalog from "../../../docs/qa/catalog.json";
import {
  comparison,
  canRecordManualStatus,
  emptyManual,
  exportCsv,
  readState,
  safeUrl,
  saveState,
  statistics,
  newSession,
  validateState,
  getPriorityProgress,
  isPriorityCompleted,
  versionPresets,
  certificatePdf,
  type Case,
  type CertificateRecord,
  type Evidence,
  type FeatureInventoryItem,
  type Manual,
  type Report,
  type Session,
  type State,
  type Status,
} from "./model";
import { playQaSound, warmUpQaSound } from "./sfx";

const t = dictionary.qa;
const catalog = rawCatalog as typeof rawCatalog & {
  cases: Case[];
  featureInventory: FeatureInventoryItem[];
};
const cases = catalog.cases as Case[];
const ids = new Set(cases.map((c) => c.id));
const caseAvailability = new Map(cases.map((c) => [c.id, c.availability]));
const soundPreferenceKey = "uay-qa-sfx-enabled";
const themePreferenceKey = "uay-qa-theme";
type Theme = "light" | "dark";
function readThemePreference(): Theme {
  try {
    return typeof window !== "undefined" &&
      window.localStorage.getItem(themePreferenceKey) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}
function readSoundPreference() {
  try {
    return typeof window === "undefined"
      ? true
      : window.localStorage.getItem(soundPreferenceKey) !== "false";
  } catch {
    return true;
  }
}
const bvaDimensions = [
  "Rekonsiliasi Impor Berkas",
  "Total Bobot Nilai",
  "Ukuran Berkas Modul",
  "Ukuran Berkas Video",
  "Durasi Timer Kuis",
  "Pengerjaan Lewat Deadline",
  "Batas Percobaan Kuis",
  "Rentang Nilai Tugas/Kuis",
  "Tenggat Tugas & Cut-off",
  "Koreksi Nilai Dosen",
  "Pelacakan Slide Halaman",
  "Concurrency Update Progress",
];
const statusLabels: Record<string, string> = {
  pass: t.pass,
  fail: t.fail,
  blocked: t.blocked,
  not_run: t.not_run,
  match: t.match,
  mismatch: t.mismatch,
  pending: t.pending,
};
const roleShort: Record<string, string> = {
  Mahasiswa: "M",
  Dosen: "D",
  "Asisten Dosen (Asdos)": "AS",
  "Dosen Kolaborator": "DK",
  "Admin Prodi": "AP",
  "Super Admin": "SA",
  "Operator / DevOps": "OP",
  Rektor: "R",
};
const phaseLabels: Record<string, string> = {
  preparing: t.preparing,
  catalog: t.catalog,
  domain: t.domain,
  database: t.database,
  integration: t.integration,
  report: t.report,
  complete: t.complete,
  error: t.error,
  idle: t.idle,
  interrupted: t.interrupted,
};
function date(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function StatusIcon({ status }: { status: string }) {
  const Icon =
    status === "pass" || status === "match"
      ? Check
      : status === "fail" || status === "mismatch"
        ? XCircle
        : status === "blocked"
          ? CircleAlert
          : Circle;
  return <Icon size={13} aria-hidden="true" />;
}
function Badge({ status, text }: { status: string; text?: string }) {
  return (
    <span className={`badge ${status}`}>
      <StatusIcon status={status} />
      {text ?? statusLabels[status] ?? status}
    </span>
  );
}
function AvailabilityBadge({ availability }: { availability: string }) {
  const label =
    availability === "disabled"
      ? "Integrasi nonaktif"
      : availability === "backlog"
        ? "Backlog"
        : "Fitur aktif";
  return <span className={`availability-badge ${availability}`}>{label}</span>;
}
const magicalSparkleGlyphs = ["✦", "✧", "✺", "✦", "·", "✧", "✦", "✺", "·", "✧", "✦", "✺"];
function MagicalSparkles({ compact = false }: { compact?: boolean }) {
  const radius = compact ? 18 : 92;
  return (
    <span
      className={`magical-sparkles ${compact ? "compact" : ""}`}
      aria-hidden="true"
    >
      {magicalSparkleGlyphs.map((glyph, index) => {
        const angle = (index / magicalSparkleGlyphs.length) * Math.PI * 2;
        return (
          <span
            className={`magical-particle particle-${index % 4}`}
            key={`${index}-${glyph}`}
            style={
              {
                "--spark-x": `${Math.cos(angle) * radius}px`,
                "--spark-y": `${Math.sin(angle) * radius * 0.55}px`,
                "--spark-mid-x": `${Math.cos(angle) * radius * 0.58}px`,
                "--spark-mid-y": `${Math.sin(angle) * radius * 0.32}px`,
                "--spark-delay": `${(index % 4) * 35}ms`,
              } as React.CSSProperties
            }
          >
            {glyph}
          </span>
        );
      })}
    </span>
  );
}
function Bar({
  done,
  total,
  className = "",
}: {
  done: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={`bar ${className}`}
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={Math.max(1, total)}
    >
      <span
        style={{ width: `${total ? Math.min(100, (done / total) * 100) : 0}%` }}
      />
    </div>
  );
}
function Dialog({
  children,
  title,
  onClose,
  wide = false,
  className = "",
  scrollKey,
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  scrollKey?: string | number;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  useEffect(() => {
    if (scrollKey !== undefined && ref.current) {
      const detail = ref.current.querySelector<HTMLElement>(".case-detail");
      if (detail) detail.scrollTop = 0;
      else ref.current.scrollTop = 0;
    }
  }, [scrollKey]);
  return (
    <dialog
      className={`dialog ${wide ? "wide" : ""} ${className}`.trim()}
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-top">
        <span>{title}</span>
        <button className="icon-button" onClick={onClose} aria-label={t.close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function App() {
  const [state, setState] = useState<State>(() =>
    readState(ids, caseAvailability),
  );
  const [report, setReport] = useState<Report | null>(null);
  const [runner, setRunner] = useState<{
    available?: boolean;
    running?: boolean;
    phase?: string;
    error?: string;
  }>({});
  const [view, setView] = useState<
    "summary" | "cases" | "compare" | "coverage"
  >("summary");
  const [priority, setPriority] = useState("all"),
    [role, setRole] = useState("all"),
    [module, setModule] = useState("all"),
    [type, setType] = useState("all"),
    [availability, setAvailability] = useState("current"),
    [featureKey, setFeatureKey] = useState("all");
  const [query, setQuery] = useState(""),
    [manualFilter, setManualFilter] = useState("all"),
    [autoFilter, setAutoFilter] = useState("all"),
    [diffFilter, setDiffFilter] = useState("all");
  const [expanded, setExpanded] = useState<string[]>(["P0"]),
    [selected, setSelected] = useState<Case | null>(null),
    [settingsOpen, setSettingsOpen] = useState(false),
    [mobileNav, setMobileNav] = useState(false);
  const [showAllTutorialSteps, setShowAllTutorialSteps] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(readSoundPreference);
  const [theme, setTheme] = useState<Theme>(readThemePreference);
  const [celebrationCase, setCelebrationCase] = useState<string | null>(null);
  const [notice, setNotice] = useState(""),
    [storageError, setStorageError] = useState(false),
    [exportOpen, setExportOpen] = useState(false);
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certTargetPriority, setCertTargetPriority] = useState<string>("all");
  const [certTargetRole, setCertTargetRole] = useState<string>("all");
  const [certificatePreview, setCertificatePreview] = useState<{
    url: string;
    filename: string;
    scope: string;
  } | null>(null);
  const [smallScreen, setSmallScreen] = useState(
    () => window.matchMedia?.("(max-width: 760px)").matches ?? false,
  );
  const importRef = useRef<HTMLInputElement>(null),
    lastRun = useRef("");
  const certificatePreviewRef = useRef<HTMLElement>(null);
  const session = state.sessions.find((s) => s.id === state.active)!;
  const results = report?.results ?? {};
  const stats = statistics(cases, session.records, results);
  const requiredQaCases = cases.filter((testCase) => testCase.availability !== "backlog");
  const resolvedQaCases = requiredQaCases.filter((testCase) =>
    ["pass", "fail", "blocked"].includes(session.records[testCase.id]?.status ?? "not_run"),
  ).length;
  const canDeclareQaComplete =
    !runner.running && resolvedQaCases === requiredQaCases.length;
  const selectedManual = selected
    ? (session.records[selected.id] ?? emptyManual())
    : emptyManual();
  const tutorialStage = selected
    ? selectedManual.tutorialStep < 0
      ? "intro"
      : selectedManual.tutorialStep >= selected.steps.length
        ? "result"
        : "steps"
    : "intro";
  const activeTutorialStep = selected
    ? Math.max(
        0,
        Math.min(selectedManual.tutorialStep, selected.steps.length - 1),
      )
    : 0;

  useEffect(() => setShowAllTutorialSteps(false), [selected?.id]);
  useEffect(() => setCelebrationCase(null), [selected?.id]);
  useEffect(() => {
    const url = certificatePreview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [certificatePreview?.url]);
  useEffect(() => {
    if (certificatePreview?.url) {
      certificatePreviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [certificatePreview?.url]);

  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 760px)");
    if (!media) return;
    const changed = () => setSmallScreen(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    try {
      saveState(state);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    try {
      window.localStorage.setItem(soundPreferenceKey, String(soundEnabled));
    } catch {
      /* Sound remains available for this page even when preference storage is blocked. */
    }
  }, [soundEnabled]);
  useEffect(() => {
    if (!soundEnabled) return;
    const warmAudioOnGesture = () => {
      warmUpQaSound();
    };
    window.addEventListener("pointerdown", warmAudioOnGesture, true);
    window.addEventListener("keydown", warmAudioOnGesture, true);
    return () => {
      window.removeEventListener("pointerdown", warmAudioOnGesture, true);
      window.removeEventListener("keydown", warmAudioOnGesture, true);
    };
  }, [soundEnabled]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(themePreferenceKey, theme);
    } catch {
      /* Theme remains active for this page when preference storage is blocked. */
    }
  }, [theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function refresh() {
    try {
      const res = await fetch("/reports/latest.json?time=" + Date.now(), {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: Report = await res.json();
      if (data.results) {
        setReport(data);
        lastRun.current = data.runId;
      }
    } catch {
      /* The empty report state remains visible. */
    }
  }
  useEffect(() => {
    void refresh();
    let live = true;
    const poll = async () => {
      try {
        const res = await fetch("/__qa/state", { cache: "no-store" });
        if (!res.ok) return;
        const value = await res.json();
        if (!live) return;
        setRunner(value);
        if (!value.running && value.runId && value.runId !== lastRun.current)
          void refresh();
      } catch {
        /* Static builds have no local runner. */
      }
    };
    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  const filtered = useMemo(
    () =>
      cases.filter(
        (c) =>
          (priority === "all" || c.priority === priority) &&
          (role === "all" || c.role === role) &&
          (module === "all" || c.module === module) &&
          (type === "all" || c.type === type) &&
          (availability === "all" ||
            (availability === "current"
              ? c.availability !== "backlog"
              : c.availability === availability)) &&
          (featureKey === "all" || c.featureKeys.includes(featureKey)) &&
          (manualFilter === "all" ||
            (session.records[c.id]?.status ?? "not_run") === manualFilter) &&
          (autoFilter === "all" ||
            (results[c.id]?.status ?? "not_run") === autoFilter) &&
          (diffFilter === "all" ||
            (diffFilter === "attention"
              ? results[c.id]?.status === "fail" ||
                session.records[c.id]?.status === "fail"
              : comparison(
                  session.records[c.id]?.status,
                  results[c.id]?.status,
                ) === diffFilter)) &&
          (!query ||
            [
              c.id,
              c.title,
              c.module,
              c.role,
              c.type,
              c.data,
              c.expected,
              ...c.tags,
              ...c.requirements,
              ...c.featureKeys,
              c.availability,
            ]
              .join(" ")
              .toLocaleLowerCase("id")
              .includes(query.toLocaleLowerCase("id"))),
      ),
    [
      priority,
      role,
      module,
      type,
      availability,
      featureKey,
      manualFilter,
      autoFilter,
      diffFilter,
      query,
      session.records,
      report,
    ],
  );
  const groups = useMemo(
    () =>
      catalog.priorities
        .flatMap((p) =>
          catalog.roles.map((r) => ({
            priority: p,
            role: r,
            cases: filtered.filter((c) => c.priority === p && c.role === r),
          })),
        )
        .filter((g) => g.cases.length),
    [filtered],
  );
  const listedCases = useMemo(
    () => groups.flatMap((group) => group.cases),
    [groups],
  );
  const filteredStats = statistics(filtered, session.records, results);
  const attention = cases.filter(
    (c) =>
      results[c.id]?.status === "fail" ||
      session.records[c.id]?.status === "fail" ||
      comparison(session.records[c.id]?.status, results[c.id]?.status) ===
        "mismatch",
  );
  function choose(p: string, r = "all") {
    setPriority(p);
    setRole(r);
    setView("cases");
    setMobileNav(false);
    setManualFilter("all");
    setAutoFilter("all");
    setDiffFilter("all");
  }
  function clearFilters() {
    setPriority("all");
    setRole("all");
    setModule("all");
    setType("all");
    setAvailability("current");
    setFeatureKey("all");
    setQuery("");
    setManualFilter("all");
    setAutoFilter("all");
    setDiffFilter("all");
  }
  function updateSession(values: Partial<typeof session>) {
    const certificateDetailsChanged = ["name", "tester", "environment", "build"].some(
      (key) => Object.hasOwn(values, key),
    );
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((item) =>
        item.id === s.active
          ? {
              ...item,
              ...values,
              ...(certificateDetailsChanged &&
              !Object.hasOwn(values, "completedAt") &&
              !Object.hasOwn(values, "certificates")
                ? {
                    completedAt: undefined,
                    certificateId: undefined,
                    certificates: undefined,
                  }
                : {}),
            }
          : item,
      ),
    }));
  }
  function updateManual(id: string, values: Partial<Manual>) {
    const testCase = cases.find((item) => item.id === id);
    if (
      values.status &&
      testCase &&
      !canRecordManualStatus(testCase, values.status)
    ) {
      setNotice("Fitur backlog belum dapat dinyatakan Lulus atau Gagal.");
      return;
    }
    const certificateEvidenceChanged = ["status", "actual", "note", "evidence"].some(
      (key) => Object.hasOwn(values, key),
    );
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((item) => {
        if (item.id !== s.active) return item;
        let nextCerts = item.certificates;
        let clearedCompletedAt = item.completedAt;
        let clearedCertId = item.certificateId;
        if (certificateEvidenceChanged && testCase) {
          clearedCompletedAt = undefined;
          clearedCertId = undefined;
          if (nextCerts) {
            const copy = { ...nextCerts };
            delete copy.all;
            delete copy[testCase.priority];
            delete copy[`all:${testCase.role}`];
            delete copy[`${testCase.priority}:${testCase.role}`];
            nextCerts = Object.keys(copy).length ? copy : undefined;
          }
        }
        return {
          ...item,
          records: {
            ...item.records,
            [id]: {
              ...(item.records[id] ?? emptyManual()),
              ...values,
              updatedAt: new Date().toISOString(),
              tester: item.tester,
              environment: item.environment,
            },
          },
          completedAt: clearedCompletedAt,
          certificateId: clearedCertId,
          certificates: nextCerts,
        };
      }),
    }));
  }
  function issueCertificate(
    targetPriority: string = "all",
    targetRole: string = "all",
    customBuild?: string,
    customTester?: string,
  ) {
    const pProgress = getPriorityProgress(
      targetPriority,
      cases,
      session.records,
      targetRole,
    );
    if (!pProgress.isComplete) {
      const remaining = pProgress.total - pProgress.resolved;
      const targetPLabel =
        targetPriority === "all" ? "semua prioritas" : `prioritas ${targetPriority}`;
      const targetRLabel =
        targetRole === "all" ? "" : ` (peran ${targetRole})`;
      setNotice(
        `Selesaikan status ${remaining} kasus ${targetPLabel}${targetRLabel} terlebih dahulu. Kasus harus Lulus, Gagal, atau Terblokir.`,
      );
      return;
    }
    const completedAt = new Date().toISOString();
    const certificateId = crypto.randomUUID();
    const buildToUse =
      (customBuild !== undefined ? customBuild : session.build) || "";
    const testerToUse =
      (customTester !== undefined ? customTester : session.tester) || "";
    const certKey =
      targetRole === "all" ? targetPriority : `${targetPriority}:${targetRole}`;
    const newCertRecord: CertificateRecord = {
      completedAt,
      certificateId,
      priority: targetPriority,
      role: targetRole === "all" ? undefined : targetRole,
      build: buildToUse,
      tester: testerToUse,
    };
    const updatedCertificates = {
      ...(session.certificates ?? {}),
      [certKey]: newCertRecord,
    };
    const sessionUpdates: Partial<Session> = {
      certificates: updatedCertificates,
      build: buildToUse,
      tester: testerToUse,
    };
    if (targetPriority === "all" && targetRole === "all") {
      sessionUpdates.completedAt = completedAt;
      sessionUpdates.certificateId = certificateId;
    }
    const updatedSession: Session = {
      ...session,
      ...sessionUpdates,
    };
    updateSession(sessionUpdates);

    showCertificatePreview(
      updatedSession,
      targetPriority,
      targetRole,
      newCertRecord,
    );
    setCertModalOpen(true);
    const priorityName =
      targetPriority === "all" ? "Semua Prioritas" : targetPriority;
    const roleName = targetRole === "all" ? "" : ` · Peran ${targetRole}`;
    setNotice(
      `Sertifikat QA (${priorityName}${roleName}) berhasil diterbitkan. Pratinjau siap dilihat.`,
    );
  }
  function findCertificate(
    sourceSession: Session,
    targetPriority: string,
    targetRole: string,
  ): CertificateRecord | undefined {
    const certKey =
      targetRole === "all" ? targetPriority : `${targetPriority}:${targetRole}`;
    const cert =
      sourceSession.certificates?.[certKey] ||
      (targetRole === "all"
        ? sourceSession.certificates?.[targetPriority]
        : undefined) ||
      (targetPriority === "all" &&
      targetRole === "all" &&
      sourceSession.completedAt &&
      sourceSession.certificateId
        ? {
            completedAt: sourceSession.completedAt,
            certificateId: sourceSession.certificateId,
            priority: "all",
            role: undefined,
            build: sourceSession.build,
            tester: sourceSession.tester,
          }
        : undefined);
    return cert;
  }

  function buildCertificateFile(
    sourceSession: Session,
    targetPriority: string,
    targetRole: string,
    cert: CertificateRecord,
  ) {
    const subsetCases = cases.filter((c) => {
      const matchP = targetPriority === "all" || c.priority === targetPriority;
      const matchR = targetRole === "all" || c.role === targetRole;
      return matchP && matchR;
    });
    const subsetStats = statistics(subsetCases, sourceSession.records, results);

    const rolePart =
      targetRole === "all"
        ? ""
        : `-${targetRole.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const filename = `sertifikat-qa-${targetPriority.toLowerCase()}${rolePart}-${cert.certificateId.slice(0, 8).toLowerCase()}.pdf`;
    const pdfContent = certificatePdf(sourceSession, subsetStats, targetPriority, {
      certificateId: cert.certificateId,
      completedAt: cert.completedAt,
      build: cert.build,
      tester: cert.tester,
      role: targetRole,
    });
    return { filename, pdfContent };
  }

  function showCertificatePreview(
    sourceSession: Session,
    targetPriority: string,
    targetRole: string,
    issuedCertificate?: CertificateRecord,
  ) {
    const cert =
      issuedCertificate ||
      findCertificate(sourceSession, targetPriority, targetRole);
    if (!cert) return;
    const { filename, pdfContent } = buildCertificateFile(
      sourceSession,
      targetPriority,
      targetRole,
      cert,
    );
    const url = URL.createObjectURL(
      new Blob([pdfContent], { type: "application/pdf" }),
    );
    setCertificatePreview({
      url,
      filename,
      scope: `${targetPriority}:${targetRole}`,
    });
  }

  function downloadCertificate(
    targetPriority: string = "all",
    targetRole: string = "all",
  ) {
    const cert = findCertificate(session, targetPriority, targetRole);
    if (!cert) return;
    const { filename, pdfContent } = buildCertificateFile(
      session,
      targetPriority,
      targetRole,
      cert,
    );
    download(filename, pdfContent, "application/pdf");
  }
  function declareQaComplete() {
    if (!canDeclareQaComplete) {
      setNotice(
        `Selesaikan status ${requiredQaCases.length - resolvedQaCases} kasus aktif/nonaktif terlebih dahulu. Kasus harus Lulus, Gagal, atau Terblokir.`,
      );
      return;
    }
    if (
      !window.confirm(
        "Nyatakan seluruh sesi QA ini selesai dan terbitkan sertifikat penyelesaian?",
      )
    )
      return;
    issueCertificate("all", "all");
  }
  function downloadQaCertificate() {
    downloadCertificate("all", "all");
  }
  async function run() {
    if (!runner.available) {
      setNotice(t.runUnavailable);
      return;
    }
    try {
      const res = await fetch("/__qa/run", { method: "POST" });
      if (!res.ok) throw new Error();
      setRunner({ available: true, running: true, phase: "preparing" });
    } catch {
      setNotice(t.runFailed);
    }
  }
  function continueTesting() {
    const next = listedCases.find(
      (c) =>
        !["pass", "fail"].includes(session.records[c.id]?.status ?? "not_run"),
    );
    if (next) setSelected(next);
    else setNotice(t.finished);
  }
  function nextCase() {
    if (!selected) return;
    const index = listedCases.findIndex((c) => c.id === selected.id);
    setSelected(index < 0 ? null : (listedCases[index + 1] ?? null));
  }
  function exportBackup() {
    download(
      "uay-qa-v5-backup.json",
      JSON.stringify(
        {
          ...state,
          exportedAt: new Date().toISOString(),
          documentSha256: catalog.document.sha256,
        },
        null,
        2,
      ),
      "application/json",
    );
    setExportOpen(false);
  }
  function exportResults() {
    download(
      "uay-qa-v5-results.csv",
      exportCsv(cases, session.records, results, session),
      "text/csv;charset=utf-8",
    );
    setExportOpen(false);
  }
  async function importBackup(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNotice(t.backupTooLarge);
      return;
    }
    try {
      const parsed = validateState(
        JSON.parse(await file.text()),
        ids,
        caseAvailability,
      );
      if (!window.confirm(t.replaceConfirm)) return;
      saveState(parsed);
      setState(parsed);
      setNotice(t.backupImported);
    } catch {
      setNotice(t.backupInvalid);
    }
  }
  const viewTitle =
    view === "summary"
      ? t.summary
      : view === "cases"
        ? t.catalogue
        : view === "compare"
          ? t.compare
          : t.coverage;
  const ring = 2 * Math.PI * 57;

  return (
    <div className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#main">
        {t.cases}
      </a>
      {mobileNav && (
        <button
          className="nav-backdrop"
          onClick={() => setMobileNav(false)}
          aria-label={t.close}
        />
      )}
      <aside
        className={`sidebar ${mobileNav ? "mobile-open" : ""}`}
        inert={smallScreen && !mobileNav}
        aria-hidden={smallScreen && !mobileNav}
      >
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setView("summary");
          }}
        >
          <span className="brand-mark">
            <CheckCheck size={23} />
          </span>
          <span>
            <strong>
              UAY<span className="brand-slash"> / </span>QA
            </strong>
            <small>{t.app}</small>
          </span>
          <span className="version">v5</span>
        </a>
        <div className="sidebar-context">
          <span className="status-dot" />
          <span>E-Learning UAY</span>
          <ShieldCheck size={15} />
        </div>
        <nav aria-label={t.app} className="primary-nav">
          {(
            [
              ["summary", Activity, t.summary],
              ["cases", ListChecks, t.cases],
              ["compare", GitCompareArrows, t.compare],
              ["coverage", BookOpen, t.coverage],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              className={view === key ? "active" : ""}
              onClick={() => {
                setView(key);
                setMobileNav(false);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "compare" && stats.mismatch > 0 && (
                <b className="nav-count">{stats.mismatch}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="tree-title">
          <span>{t.filterHint}</span>
          <Layers size={14} />
        </div>
        <nav className="priority-tree" aria-label={t.filterHint}>
          {catalog.priorities.map((p) => {
            const subset = cases.filter((c) => c.priority === p);
            return (
              <div className="tree-group" key={p}>
                <div
                  className={`priority-line ${priority === p && view === "cases" ? "chosen" : ""}`}
                >
                  <button
                    className="tree-toggle"
                    onClick={() =>
                      setExpanded((e) =>
                        e.includes(p) ? e.filter((x) => x !== p) : [...e, p],
                      )
                    }
                    aria-label={`${p} ${t.role}`}
                    aria-expanded={expanded.includes(p)}
                  >
                    {expanded.includes(p) ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                  <button className="tree-priority" onClick={() => choose(p)}>
                    <span className={`priority-label ${p}`}>{p}</span>
                    <span>
                      {p === "P0"
                        ? t.pilot.split(" · ")[1]
                        : p === "P1"
                          ? t.postPilot.split(" · ")[1]
                          : t.future.split(" · ")[1]}
                    </span>
                    <small>{subset.length}</small>
                  </button>
                </div>
                {expanded.includes(p) && (
                  <div className="role-tree">
                    {catalog.roles.map((r) => {
                      const total = subset.filter((c) => c.role === r).length;
                      if (!total) return null;
                      const done = subset.filter(
                        (c) =>
                          c.role === r &&
                          ["pass", "fail"].includes(
                            session.records[c.id]?.status ?? "not_run",
                          ),
                      ).length;
                      return (
                        <button
                          key={r}
                          className={
                            role === r && priority === p && view === "cases"
                              ? "chosen"
                              : ""
                          }
                          onClick={() => choose(p, r)}
                        >
                          <span className="tree-dot" />
                          <span>{r}</span>
                          <small>
                            {done}/{total}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="session-card">
            <ClipboardCheck size={20} />
            <div>
              <strong>{session.name}</strong>
              <small>{session.tester || t.noTester}</small>
            </div>
            <button
              className="icon-button"
              onClick={() => setSettingsOpen(true)}
              aria-label={t.settings}
            >
              <Settings2 size={16} />
            </button>
          </div>
          <span className="local-label">
            <span className="status-dot" />
            {t.persistLabel}
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label={t.filterHint}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              E-Learning UAY <ChevronRight size={13} /> <b>{viewTitle}</b>
            </span>
          </div>
          <div className="topbar-right">
            <div className="topbar-meta">
              <button
                type="button"
                className="version-chip"
                onClick={() => setVersionModalOpen(true)}
                title="Klik untuk mengatur atau mengubah versi aplikasi"
                aria-label={`Versi aplikasi: ${session.build || "Belum diatur"}`}
              >
                <Tag size={13} aria-hidden="true" />
                <span className="version-chip-label">Versi:</span>
                <span className="version-chip-val">
                  {session.build || "Atur versi…"}
                </span>
              </button>
            </div>
            <a
              className="text-link"
              href={safeUrl(state.targetUrl) ?? undefined}
              aria-disabled={!safeUrl(state.targetUrl)}
              title={
                safeUrl(state.targetUrl)
                  ? undefined
                  : "Atur URL staging/UAT pada pengaturan sesi terlebih dahulu."
              }
              target="_blank"
              rel="noreferrer"
            >
              {t.openApp}
              <ExternalLink size={14} />
            </a>
            <span className="divider" />
            <button
              className="icon-button theme-toggle"
              onClick={() =>
                setTheme((current) => (current === "dark" ? "light" : "dark"))
              }
              aria-label={
                theme === "dark"
                  ? "Ganti ke mode terang"
                  : "Ganti ke mode gelap"
              }
              aria-pressed={theme === "dark"}
              title={
                theme === "dark"
                  ? "Ganti ke mode terang"
                  : "Ganti ke mode gelap"
              }
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="tester-avatar"
              onClick={() => setSettingsOpen(true)}
              aria-label={t.settings}
            >
              {session.tester ? session.tester.slice(0, 2).toUpperCase() : "QA"}
            </button>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                QUALITY ASSURANCE WORKSPACE
              </div>
              <h1>
                {view === "summary" ? t.app : viewTitle}
                <span className="heading-period">.</span>
              </h1>
              <p>
                {view === "summary"
                  ? t.subtitle
                  : view === "compare"
                    ? t.compareHelp
                    : view === "coverage"
                      ? `Keterlacakan berdasarkan paragraf v5 dan ${catalog.families.length} keluarga RTM. Kasus tersedia tidak berarti semua kebutuhan sudah lulus.`
                      : t.roleHelp}
              </p>
            </div>
            <div className="page-actions">
              <div className="export-wrap">
                <button
                  className="button secondary"
                  onClick={() => setExportOpen(!exportOpen)}
                  aria-expanded={exportOpen}
                >
                  <Download size={16} />
                  {t.export}
                  <ChevronDown size={14} />
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    <button onClick={exportResults}>
                      <FileText size={15} />
                      {t.exportCsv}
                    </button>
                    <button onClick={exportBackup}>
                      <ArrowDownToLine size={15} />
                      {t.exportJson}
                    </button>
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        importRef.current?.click();
                      }}
                    >
                      <Upload size={15} />
                      {t.import}
                    </button>
                    <button
                      onClick={() => {
                        setExportOpen(false);
                        window.print();
                      }}
                    >
                      <FileText size={15} />
                      {t.print}
                    </button>
                  </div>
                )}
              </div>
              <button
                className="button primary"
                disabled={runner.running}
                onClick={run}
              >
                {runner.running ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Play size={15} />
                )}
                {runner.running ? t.running : t.run}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setCertTargetPriority(priority === "all" ? "all" : priority);
                  setCertTargetRole(role === "all" ? "all" : role);
                  setCertModalOpen(true);
                }}
                title="Kelola dan terbitkan sertifikat QA per P# atau peran"
              >
                <Award size={16} />
                {t.qaCertificate ?? "Sertifikat QA"}
              </button>
              {(() => {
                const activeScopePriority = priority;
                const activeScopeRole = role;
                const activeScopeProgress = getPriorityProgress(
                  activeScopePriority,
                  cases,
                  session.records,
                  activeScopeRole,
                );
                const scopeKey =
                  activeScopeRole === "all"
                    ? activeScopePriority
                    : `${activeScopePriority}:${activeScopeRole}`;
                const scopeCert =
                  session.certificates?.[scopeKey] ||
                  (activeScopeRole === "all"
                    ? session.certificates?.[activeScopePriority]
                    : undefined) ||
                  (activeScopePriority === "all" &&
                  activeScopeRole === "all" &&
                  session.completedAt &&
                  session.certificateId
                    ? {
                        completedAt: session.completedAt,
                        certificateId: session.certificateId,
                        priority: "all",
                        build: session.build,
                        tester: session.tester,
                      }
                    : undefined);

                const scopeLabel =
                  activeScopePriority === "all" && activeScopeRole === "all"
                    ? ""
                    : ` (${activeScopePriority}${activeScopeRole !== "all" ? ` · ${activeScopeRole}` : ""})`;

                if (scopeCert) {
                  return (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        setCertTargetPriority(activeScopePriority);
                        setCertTargetRole(activeScopeRole);
                        showCertificatePreview(
                          session,
                          activeScopePriority,
                          activeScopeRole,
                        );
                        setCertModalOpen(true);
                      }}
                      title={`Lihat sertifikat QA yang telah diterbitkan${scopeLabel}`}
                    >
                      <Eye size={16} />
                      {activeScopePriority === "all" && activeScopeRole === "all"
                        ? "Lihat Sertifikat"
                        : `Lihat Sertifikat${scopeLabel}`}
                    </button>
                  );
                }

                if (activeScopeProgress.isComplete) {
                  return (
                    <button
                      type="button"
                      className="button mint"
                      onClick={() => {
                        setCertTargetPriority(activeScopePriority);
                        setCertTargetRole(activeScopeRole);
                        setCertModalOpen(true);
                      }}
                      title={`Pengujian selesai (100%)! Klik untuk meninjau dan menerbitkan sertifikat${scopeLabel}`}
                    >
                      <Award size={16} />
                      {`Terbitkan Sertifikat${scopeLabel || " (Semua)"}`}
                    </button>
                  );
                }

                return (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={true}
                    title={
                      activeScopePriority === "all" && activeScopeRole === "all"
                        ? t.completionPrerequisite
                            .replace("{done}", String(resolvedQaCases))
                            .replace("{total}", String(requiredQaCases.length))
                        : `Selesaikan ${activeScopeProgress.total - activeScopeProgress.resolved} kasus lagi pada cakupan ini (${activeScopeProgress.resolved}/${activeScopeProgress.total} selesai) untuk menerbitkan sertifikat.`
                    }
                    onClick={() => {
                      setCertTargetPriority(activeScopePriority);
                      setCertTargetRole(activeScopeRole);
                      setCertModalOpen(true);
                    }}
                  >
                    <Award size={16} />
                    {activeScopePriority === "all" && activeScopeRole === "all"
                      ? t.declareComplete
                      : `Sertifikat (${activeScopeProgress.resolved}/${activeScopeProgress.total})`}
                  </button>
                );
              })()}
            </div>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              void importBackup(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {storageError && (
            <div className="alert danger" role="alert">
              {t.saveFailed}
              <button onClick={exportBackup}>{t.exportJson}</button>
            </div>
          )}
          {runner.running && (
            <div className="running-notice" role="status">
              <LoaderCircle size={16} className="spin" />
              <strong>{t.running}</strong>
              <span>{phaseLabels[runner.phase ?? ""] ?? runner.phase}</span>
              <span>{t.autoScope}</span>
            </div>
          )}
          {runner.error && (
            <div className="alert danger" role="alert">
              {runner.error}
            </div>
          )}

          {view === "summary" && (
            <>
              <section className="progress-hero">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <Sparkles size={14} />
                    {t.manualProgress}
                  </span>
                  <h2>{t.summaryTitle}</h2>
                  <p>
                    {stats.tested} / {stats.total} {t.done}
                    <span> · </span>
                    {stats.total - stats.tested} {t.remaining}
                  </p>
                  <button className="button mint" onClick={continueTesting}>
                    {stats.tested ? t.continue : t.testNow}
                    <ArrowRight size={16} />
                  </button>
                  <span className="hero-footnote">{t.countersHelp}</span>
                </div>
                <div className="hero-meter">
                  <svg viewBox="0 0 140 140" aria-hidden="true">
                    <circle cx="70" cy="70" r="57" className="ring-track" />
                    <circle
                      cx="70"
                      cy="70"
                      r="57"
                      className="ring-fill"
                      strokeDasharray={ring}
                      strokeDashoffset={ring * (1 - stats.progress / 100)}
                    />
                    <circle cx="70" cy="70" r="46" className="ring-inner" />
                  </svg>
                  <div>
                    <strong>
                      {stats.progress}
                      <span>%</span>
                    </strong>
                    <small>{t.done}</small>
                  </div>
                </div>
                <div className="hero-grid" aria-hidden="true" />
              </section>
              <section className="metrics-grid" aria-label={t.summary}>
                {[
                  {
                    icon: Layers,
                    value: stats.total,
                    label: t.caseCount,
                    hint: t.caseCountHint,
                    color: "blue",
                  },
                  {
                    icon: Terminal,
                    value: stats.autoTested,
                    label: t.autoCount,
                    hint: `${stats.autoPass} ${t.pass.toLowerCase()} · ${stats.autoFail} ${t.fail.toLowerCase()}`,
                    color: "green",
                  },
                  {
                    icon: GitCompareArrows,
                    value: stats.comparable,
                    label: t.comparedCount,
                    hint: stats.comparable
                      ? `${stats.match} ${t.match.toLowerCase()} · ${stats.mismatch} ${t.mismatch.toLowerCase()}`
                      : t.comparedHint,
                    color: "violet",
                  },
                  {
                    icon: Target,
                    value: attention.length,
                    label: t.findings,
                    hint: t.findingsHint,
                    color: "orange",
                  },
                ].map(({ icon: Icon, value, label, hint, color }) => (
                  <div className="metric" key={label}>
                    <span className={`metric-icon ${color}`}>
                      <Icon size={19} />
                    </span>
                    <span className="metric-label">{label}</span>
                    <strong>{value.toLocaleString("id-ID")}</strong>
                    <small>{hint}</small>
                  </div>
                ))}
              </section>
              <div className="summary-grid">
                <section className="panel priorities-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>{t.byPriority}</h2>
                      <p>{t.filterHint}</p>
                    </div>
                    <Layers size={18} />
                  </div>
                  {catalog.priorities.map((p) => {
                    const subset = cases.filter((c) => c.priority === p);
                    const s = statistics(subset, session.records, results);
                    const pProg = getPriorityProgress(p, cases, session.records);
                    const cert = session.certificates?.[p];
                    return (
                      <div className="priority-card-wrap" key={p}>
                        <button
                          className="priority-progress"
                          onClick={() => choose(p)}
                        >
                          <div>
                            <span className={`priority-label ${p}`}>{p}</span>
                            <strong>
                              {p === "P0"
                                ? t.pilot.split(" · ")[1]
                                : p === "P1"
                                  ? t.postPilot.split(" · ")[1]
                                  : t.future.split(" · ")[1]}
                            </strong>
                            <span>
                              {s.tested}
                              <small> / {s.total}</small>
                              <ChevronRight size={15} />
                            </span>
                          </div>
                          <Bar done={s.tested} total={s.total} className={p} />
                          <div className="priority-stats">
                            <span>
                              <i className="dot pass" />
                              {s.pass} {t.pass}
                            </span>
                            <span>
                              <i className="dot fail" />
                              {s.fail} {t.fail}
                            </span>
                            <span>
                              <i className="dot blocked" />
                              {s.blocked} {t.blocked}
                            </span>
                            <b>{s.progress}%</b>
                          </div>
                        </button>
                        <div className="priority-card-actions">
                          {cert ? (
                            <button
                              type="button"
                              className="button secondary mini cert-action certified"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCertTargetPriority(p);
                                setCertTargetRole("all");
                                showCertificatePreview(session, p, "all");
                                setCertModalOpen(true);
                              }}
                              title={`Lihat sertifikat ${p} yang telah diterbitkan`}
                            >
                              <Eye size={13} />
                              Lihat Sertifikat {p}
                            </button>
                          ) : pProg.isComplete ? (
                            <button
                              type="button"
                              className="button mint mini cert-action ready"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCertTargetPriority(p);
                                setCertTargetRole("all");
                                setCertModalOpen(true);
                              }}
                              title={`Terbitkan sertifikat ${p}`}
                            >
                              <Award size={13} />
                              Terbitkan Sertifikat {p}
                            </button>
                          ) : (
                            <span className="cert-status-badge">
                              {pProg.resolved}/{pProg.total} kasus wajib selesai
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
                <section className="panel role-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>{t.byRole}</h2>
                      <p>{t.manualProgress.toLocaleLowerCase("id")}</p>
                    </div>
                    <Users size={18} />
                  </div>
                  {catalog.roles.map((r) => {
                    const s = statistics(
                      cases.filter((c) => c.role === r),
                      session.records,
                      results,
                    );
                    return (
                      <button
                        className="role-progress"
                        key={r}
                        onClick={() => {
                          setRole(r);
                          setPriority("all");
                          setView("cases");
                        }}
                      >
                        <span className={`role-avatar role-${roleShort[r]}`}>
                          {roleShort[r]}
                        </span>
                        <div>
                          <div>
                            <strong>{r}</strong>
                            <span>
                              {s.tested}
                              <small> / {s.total}</small>
                            </span>
                          </div>
                          <Bar done={s.tested} total={s.total} />
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    );
                  })}
                </section>
              </div>
              <div className="summary-grid lower">
                <section className="panel attention-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        {t.attentionTitle}
                        <span className="small-count">{attention.length}</span>
                      </h2>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => {
                        clearFilters();
                        setView("compare");
                        setDiffFilter("attention");
                      }}
                    >
                      {t.viewAll}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  {attention.length ? (
                    attention.slice(0, 4).map((c) => (
                      <button
                        className="finding-row"
                        key={c.id}
                        onClick={() => setSelected(c)}
                      >
                        <span className="finding-icon">
                          <CircleAlert size={17} />
                        </span>
                        <div>
                          <small>
                            {c.id} <span>· v5 §{c.section}</span>
                          </small>
                          <strong>{c.title}</strong>
                        </div>
                        <Badge
                          status={
                            results[c.id]?.status === "fail"
                              ? "fail"
                              : (session.records[c.id]?.status ?? "fail")
                          }
                        />
                      </button>
                    ))
                  ) : (
                    <div className="empty-attention">
                      <ShieldCheck size={29} />
                      <p>{t.attentionEmpty}</p>
                    </div>
                  )}
                </section>
                <section className="panel run-panel">
                  <div className="run-top">
                    <span className="terminal-icon">
                      <Terminal size={20} />
                    </span>
                    <span>{t.autoLatest}</span>
                    <button
                      className="icon-button"
                      aria-label={t.refresh}
                      onClick={refresh}
                    >
                      <Activity size={16} />
                    </button>
                  </div>
                  <h2>{report ? date(report.completedAt) : t.noRun}</h2>
                  <p>{report?.environment.label ?? t.loadFailed}</p>
                  {report && (
                    <>
                      <div className="run-outcomes">
                        <span>
                          <i className="dot pass" />
                          {stats.autoPass} {t.pass}
                        </span>
                        <span>
                          <i className="dot fail" />
                          {stats.autoFail} {t.fail}
                        </span>
                        <span>
                          <i className="dot blocked" />
                          {stats.autoBlocked} {t.blocked}
                        </span>
                      </div>
                      <div className="segmented-bar" aria-label={t.auto}>
                        <span
                          className="auto-pass"
                          style={{ flex: stats.autoPass }}
                        />
                        <span
                          className="auto-fail"
                          style={{ flex: stats.autoFail }}
                        />
                        <span
                          className="auto-pending"
                          style={{ flex: stats.total - stats.autoTested }}
                        />
                      </div>
                      <a
                        className="text-link"
                        href="/reports/latest.json"
                        download
                      >
                        {t.reportDownload}
                        <ArrowDownToLine size={14} />
                      </a>
                      {!!report.regressionFindings?.length && (
                        <details className="regression-findings">
                          <summary>
                            {t.regressionFailures} ·{" "}
                            {report.regressionFindings.length}
                          </summary>
                          {report.regressionFindings.map((f) => (
                            <div key={f.file + f.name}>
                              <strong>{f.name}</strong>
                              <code>{f.file}</code>
                              <pre>{f.error}</pre>
                            </div>
                          ))}
                        </details>
                      )}
                    </>
                  )}
                  <small className="scope-text">{t.autoScope}</small>
                </section>
              </div>
            </>
          )}

          {(view === "cases" || view === "compare") && (
            <>
              <section className="filter-panel">
                <div className="filter-first">
                  <label className="search-box">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={t.search}
                      aria-label={t.search}
                    />
                  </label>
                  <button className="button secondary" onClick={clearFilters}>
                    <X size={14} />
                    {t.clearFilters}
                  </button>
                </div>
                <div className="filters">
                  <label>
                    {t.priority}
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="all">{t.all}</option>
                      {catalog.priorities.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.role}
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="all">{t.all}</option>
                      {catalog.roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.module}
                    <select
                      value={module}
                      onChange={(e) => setModule(e.target.value)}
                    >
                      <option value="all">{t.all}</option>
                      {[...new Set(cases.map((c) => c.module))].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.type}
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="all">{t.all}</option>
                      {[...new Set(cases.map((c) => c.type))].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Kesiapan fitur
                    <select
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                    >
                      <option value="current">
                        Fitur tersedia & integrasi nonaktif
                      </option>
                      <option value="active">Fitur aktif</option>
                      <option value="disabled">Integrasi nonaktif</option>
                      <option value="backlog">Backlog</option>
                      <option value="all">Semua status</option>
                    </select>
                  </label>
                  <label>
                    Cakupan fitur
                    <select
                      value={featureKey}
                      onChange={(e) => setFeatureKey(e.target.value)}
                    >
                      <option value="all">Semua fitur</option>
                      {catalog.featureInventory.map((feature) => (
                        <option key={feature.id} value={feature.id}>
                          {feature.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.manual}
                    <select
                      aria-label={t.resultFilter}
                      value={manualFilter}
                      onChange={(e) => setManualFilter(e.target.value)}
                    >
                      <option value="all">{t.allStatus}</option>
                      {(["not_run", "pass", "fail", "blocked"] as const).map(
                        (s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    {t.auto}
                    <select
                      aria-label={t.autoFilter}
                      value={autoFilter}
                      onChange={(e) => setAutoFilter(e.target.value)}
                    >
                      <option value="all">{t.allStatus}</option>
                      {(["not_run", "pass", "fail", "blocked"] as const).map(
                        (s) => (
                          <option key={s} value={s}>
                            {statusLabels[s]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  {view === "compare" && (
                    <label>
                      {t.comparison}
                      <select
                        aria-label={t.compareFilter}
                        value={diffFilter}
                        onChange={(e) => setDiffFilter(e.target.value)}
                      >
                        <option value="all">{t.allCompare}</option>
                        <option value="attention">{t.attentionTitle}</option>
                        {["match", "mismatch", "pending", "blocked"].map(
                          (s) => (
                            <option key={s} value={s}>
                              {statusLabels[s]}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                </div>
                <div className="filter-summary">
                  <span>
                    <b>{filtered.length}</b> {t.visible}
                  </span>
                  <span>
                    {filteredStats.tested} {t.done} · {filteredStats.mismatch}{" "}
                    {t.mismatch.toLowerCase()}
                  </span>
                  <button className="text-link" onClick={continueTesting}>
                    {t.continue}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </section>
              {view === "compare" && (
                <div className="comparison-stats">
                  <div>
                    <CheckCheck size={18} />
                    <strong>{filteredStats.match}</strong>
                    <span>{t.match}</span>
                  </div>
                  <div>
                    <GitCompareArrows size={18} />
                    <strong>{filteredStats.mismatch}</strong>
                    <span>{t.mismatch}</span>
                  </div>
                  <div>
                    <Circle size={18} />
                    <strong>
                      {filtered.length - filteredStats.comparable}
                    </strong>
                    <span>{t.pending}</span>
                  </div>
                  <p>{t.autoScope}</p>
                </div>
              )}
              {!filtered.length && (
                <div className="empty-state">
                  <Search size={30} />
                  <h2>{t.noResults}</h2>
                  <button className="button secondary" onClick={clearFilters}>
                    {t.clearFilters}
                  </button>
                </div>
              )}
              {groups.map((g) => (
                <section key={g.priority + g.role} className="case-group">
                  <div className="group-heading">
                    <span className={`priority-label ${g.priority}`}>
                      {g.priority}
                    </span>
                    <ChevronRight size={15} />
                    <span className="group-role">{g.role}</span>
                    <span className="small-count">{g.cases.length}</span>
                    <div className="group-line" />
                  </div>
                  <div className="case-table-wrap">
                    <table className="case-table">
                      <thead>
                        <tr>
                          <th>{t.case}</th>
                          <th>{t.module}</th>
                          <th>{t.manual}</th>
                          <th>{t.auto}</th>
                          <th>{t.comparison}</th>
                          <th>
                            <span className="sr-only">{t.detail}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.cases.map((c) => {
                          const m = session.records[c.id]?.status ?? "not_run",
                            a = results[c.id]?.status ?? "not_run";
                          return (
                            <tr key={c.id}>
                              <td>
                                <button
                                  className="case-title"
                                  onClick={() => setSelected(c)}
                                >
                                  <small>
                                    {c.id}
                                    <span className="case-type">{c.type}</span>
                                  </small>
                                  <strong>{c.title}</strong>
                                </button>
                              </td>
                              <td>
                                <span className="module-text">{c.module}</span>
                                <AvailabilityBadge
                                  availability={c.availability}
                                />
                                <small className="source-ref">
                                  {c.sourceDocument === "current"
                                    ? "Implementasi saat ini"
                                    : `v5 §${c.section}`}
                                </small>
                              </td>
                              <td>
                                <Badge status={m} />
                              </td>
                              <td>
                                <Badge status={a} />
                                <small className="proof-type">
                                  {results[c.id]?.kind ??
                                    (c.scope === "external"
                                      ? t.externalScope
                                      : "—")}
                                </small>
                              </td>
                              <td>
                                <Badge status={comparison(m, a)} />
                              </td>
                              <td>
                                <button
                                  className="icon-button"
                                  onClick={() => setSelected(c)}
                                  aria-label={`${t.detail} ${c.id}`}
                                >
                                  <ArrowRight size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </>
          )}

          {view === "coverage" && (
            <>
              <section className="panel feature-inventory-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Cakupan fitur E-Learning saat ini</h2>
                    <p className="helper-text">
                      Ditinjau 12 Oktober 2026 · pilih fitur untuk membuka
                      tutorial pengujiannya.
                    </p>
                  </div>
                  <span className="inventory-summary">
                    {
                      catalog.featureInventory.filter(
                        (item) => item.availability === "active",
                      ).length
                    }{" "}
                    aktif ·{" "}
                    {
                      catalog.featureInventory.filter(
                        (item) => item.availability === "disabled",
                      ).length
                    }{" "}
                    nonaktif ·{" "}
                    {
                      catalog.featureInventory.filter(
                        (item) => item.availability === "backlog",
                      ).length
                    }{" "}
                    backlog
                  </span>
                </div>
                <div className="feature-coverage-grid">
                  {catalog.featureInventory.map((feature) => {
                    const featureCases = cases.filter((item) =>
                      feature.caseIds.includes(item.id),
                    );
                    const featureStats = statistics(
                      featureCases,
                      session.records,
                      results,
                    );
                    return (
                      <button
                        className={`feature-coverage-card ${feature.availability}`}
                        key={feature.id}
                        onClick={() => {
                          clearFilters();
                          setAvailability("all");
                          setFeatureKey(feature.id);
                          setView("cases");
                        }}
                      >
                        <div className="feature-card-heading">
                          <strong>{feature.title}</strong>
                          <AvailabilityBadge
                            availability={feature.availability}
                          />
                        </div>
                        <p>{feature.description}</p>
                        <div className="feature-card-progress">
                          <Bar
                            done={featureStats.tested}
                            total={featureCases.length}
                          />
                          <small>
                            {featureStats.tested}/{featureCases.length} diuji
                          </small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
              <div className="coverage-metrics">
                <div>
                  <BookOpen size={23} />
                  <strong>
                    {catalog.families.length} / {catalog.families.length}
                  </strong>
                  <span>{t.requirements}</span>
                </div>
                <div>
                  <FlaskConical size={23} />
                  <strong>
                    {
                      bvaDimensions.filter((dimension) =>
                        cases.some((item) => item.tags.includes(dimension)),
                      ).length
                    }{" "}
                    / {bvaDimensions.length}
                  </strong>
                  <span>BVA · v5 §8.1</span>
                </div>
                <div>
                  <GitCompareArrows size={23} />
                  <strong>
                    {
                      cases.filter((item) => item.id.startsWith("TC-CE-"))
                        .length
                    }{" "}
                    / 9
                  </strong>
                  <span>Cause-effect · v5 §8.2</span>
                </div>
                <div>
                  <ShieldCheck size={23} />
                  <strong>
                    {cases.filter((item) => item.family === "PILOT").length} /
                    12
                  </strong>
                  <span>Acceptance pilot · v5 §3.1</span>
                </div>
              </div>
              <div className="coverage-list">
                {catalog.families.map((f) => {
                  const list = cases.filter((c) => c.family === f.code);
                  const s = statistics(list, session.records, results);
                  return (
                    <button
                      className="panel coverage-row"
                      key={f.code}
                      onClick={() => {
                        clearFilters();
                        setModule(f.module);
                        setView("cases");
                      }}
                    >
                      <span className="family-code">{f.code}</span>
                      <div>
                        <h2>{f.module}</h2>
                        <small>
                          {f.range} · {list.length} {t.planned}
                        </small>
                      </div>
                      <div className="coverage-score">
                        <span>
                          {s.autoTested} {t.automated}
                        </span>
                        <Bar done={s.tested} total={s.total} />
                        <small>
                          {s.tested} / {s.total} {t.done}
                        </small>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  );
                })}
              </div>
              <section className="panel document-notes">
                <div className="panel-heading">
                  <h2>{t.docNotes}</h2>
                  <a
                    className="text-link"
                    href="/source/v5.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.source}
                    <ExternalLink size={14} />
                  </a>
                </div>
                <ul>
                  {catalog.document.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p>
                  <code>SHA-256 {catalog.document.sha256}</code>
                </p>
              </section>
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <ShieldCheck size={14} />
              {t.subtitle}
            </span>
            <span>
              {t.local}
              <span> · </span>
              {t.scopeNotice}
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label={t.close}>
            <X size={14} />
          </button>
        </div>
      )}
      {settingsOpen && (
        <Dialog title={t.settings} onClose={() => setSettingsOpen(false)}>
          <div className="settings-body">
            <p>{t.sessionHelp}</p>
            <label>
              {t.session}
              <select
                value={state.active}
                onChange={(e) =>
                  setState((s) => ({ ...s, active: e.target.value }))
                }
              >
                {state.sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="settings-grid">
              <label>
                {t.sessionName}
                <input
                  value={session.name}
                  onChange={(e) => updateSession({ name: e.target.value })}
                />
              </label>
              <label>
                {t.tester}
                <input
                  value={session.tester}
                  onChange={(e) => updateSession({ tester: e.target.value })}
                />
              </label>
              <label>
                {t.environment}
                <input
                  value={session.environment}
                  onChange={(e) =>
                    updateSession({ environment: e.target.value })
                  }
                />
              </label>
              <label>
                {t.build}
                <input
                  value={session.build}
                  placeholder="Contoh: alpha 0.1.0, beta, v.1.0.0"
                  onChange={(e) => updateSession({ build: e.target.value })}
                />
                <div className="preset-chips">
                  {versionPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`preset-chip ${session.build === preset ? "active" : ""}`}
                      onClick={() => updateSession({ build: preset })}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <label>
              {t.target}
              <input
                type="url"
                value={state.targetUrl}
                placeholder="https://staging.example.ac.id/"
                onChange={(e) =>
                  setState((s) => ({ ...s, targetUrl: e.target.value }))
                }
                onBlur={() => {
                  if (!safeUrl(state.targetUrl)) setNotice(t.invalidUrl);
                }}
              />
              <small className="target-url-hint">
                Isi URL staging/UAT yang disetujui. Tautan E-Learning aktif
                setelah URL valid disimpan.
              </small>
            </label>
            <label className="sound-preference">
              <span className="sound-preference-copy">
                {soundEnabled ? (
                  <Volume2 size={18} aria-hidden="true" />
                ) : (
                  <VolumeX size={18} aria-hidden="true" />
                )}
                <span>
                  <strong>Efek suara tutorial</strong>
                  <small>Bunyi lembut saat langkah dan kasus selesai.</small>
                </span>
              </span>
              <input
                aria-label="Efek suara tutorial"
                type="checkbox"
                checked={soundEnabled}
                onChange={(event) => setSoundEnabled(event.target.checked)}
              />
            </label>
            <div className="settings-buttons">
              <button
                className="button secondary"
                onClick={() => {
                  const s = newSession();
                  s.name = `${t.session} ${state.sessions.length + 1}`;
                  setState((old) => ({
                    ...old,
                    active: s.id,
                    sessions: [...old.sessions, s],
                  }));
                }}
              >
                <Plus size={16} />
                {t.newSession}
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setSettingsOpen(false);
                  setNotice(t.settingsSaved);
                }}
              >
                <Check size={16} />
                {t.close}
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {versionModalOpen && (
        <Dialog
          title="Versi Aplikasi (App Version)"
          onClose={() => setVersionModalOpen(false)}
        >
          <div className="version-dialog-body">
            <p>
              Masukkan versi aplikasi yang sedang diuji (misalnya:{" "}
              <strong>alpha 0.1.0</strong>, <strong>beta</strong>,{" "}
              <strong>v.1.0.0</strong>). Versi ini dicantumkan pada laporan
              pengujian, CSV, dan sertifikat QA.
            </p>
            <label>
              <strong>Versi / Build Aplikasi</strong>
              <input
                value={session.build}
                placeholder="Contoh: alpha 0.1.0, beta, v.1.0.0"
                onChange={(e) => updateSession({ build: e.target.value })}
                autoFocus
              />
            </label>
            <div>
              <small
                style={{
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Pilihan cepat versi:
              </small>
              <div className="preset-chips">
                {versionPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-chip ${session.build === preset ? "active" : ""}`}
                    onClick={() => updateSession({ build: preset })}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-buttons">
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  setVersionModalOpen(false);
                  setNotice("Versi aplikasi berhasil disimpan.");
                }}
              >
                <Check size={16} />
                Selesai
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {certModalOpen && (
        <Dialog
          title="Penerbitan Sertifikat QA"
          wide
          className="cert-dialog"
          onClose={() => {
            setCertModalOpen(false);
            setCertificatePreview(null);
          }}
        >
          <div className="cert-dialog-body">
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              Terbitkan sertifikat kelayakan QA per tingkatan prioritas (P0, P1,
              P2), per peran pengguna, atau untuk seluruh pengujian.
            </p>

            <div className="cert-scope-section">
              <span className="cert-scope-label">Tingkat Prioritas:</span>
              <div
                className="cert-priority-tabs"
                role="tablist"
                aria-label="Tingkat prioritas sertifikat"
              >
                {[
                  { id: "all", label: "Semua Prioritas" },
                  ...catalog.priorities.map((p) => ({
                    id: p,
                    label: `${p} · ${p === "P0" ? "Pilot" : p === "P1" ? "Pasca-pilot" : "Masa depan"}`,
                  })),
                ].map(({ id, label }) => {
                  const isSelected = certTargetPriority === id;
                  const pProgress = getPriorityProgress(
                    id,
                    cases,
                    session.records,
                    certTargetRole,
                  );
                  const certKey =
                    certTargetRole === "all" ? id : `${id}:${certTargetRole}`;
                  const isCert =
                    id === "all" && certTargetRole === "all"
                      ? !!(
                          session.certificates?.all ||
                          (session.completedAt && session.certificateId)
                        )
                      : !!session.certificates?.[certKey];
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`cert-tab ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        setCertificatePreview(null);
                        setCertTargetPriority(id);
                      }}
                    >
                      <span>{label}</span>
                      <span className="cert-tab-pill">
                        {isCert
                          ? "✓ Diterbitkan"
                          : pProgress.isComplete
                            ? "Siap"
                            : `${pProgress.resolved}/${pProgress.total}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="cert-scope-section">
              <span className="cert-scope-label">Cakupan Peran:</span>
              <div
                className="cert-role-chips"
                role="tablist"
                aria-label="Cakupan peran pengujian"
              >
                {[
                  { id: "all", label: "Semua Peran" },
                  ...catalog.roles.map((r) => ({ id: r, label: r })),
                ].map(({ id, label }) => {
                  const isSelected = certTargetRole === id;
                  const rProgress = getPriorityProgress(
                    certTargetPriority,
                    cases,
                    session.records,
                    id,
                  );
                  const certKey =
                    id === "all"
                      ? certTargetPriority
                      : `${certTargetPriority}:${id}`;
                  const isCert =
                    certTargetPriority === "all" && id === "all"
                      ? !!(
                          session.certificates?.all ||
                          (session.completedAt && session.certificateId)
                        )
                      : !!session.certificates?.[certKey];
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`cert-role-chip ${isSelected ? "active" : ""}`}
                      onClick={() => {
                        setCertificatePreview(null);
                        setCertTargetRole(id);
                      }}
                    >
                      <span>{label}</span>
                      <span className="chip-status">
                        {isCert
                          ? "✓ Diterbitkan"
                          : rProgress.isComplete
                            ? "✓ Siap"
                            : `${rProgress.resolved}/${rProgress.total}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const currentPriority = certTargetPriority;
              const currentRole = certTargetRole;
              const isAllPriority = currentPriority === "all";
              const isAllRole = currentRole === "all";

              const subset = cases.filter((c) => {
                const matchP = isAllPriority || c.priority === currentPriority;
                const matchR = isAllRole || c.role === currentRole;
                return matchP && matchR;
              });
              const pStats = statistics(subset, session.records, results);
              const pProgress = getPriorityProgress(
                currentPriority,
                cases,
                session.records,
                currentRole,
              );
              const certKey =
                isAllRole ? currentPriority : `${currentPriority}:${currentRole}`;
              const cert =
                session.certificates?.[certKey] ||
                (isAllRole
                  ? session.certificates?.[currentPriority]
                  : undefined) ||
                (isAllPriority &&
                isAllRole &&
                session.completedAt &&
                session.certificateId
                  ? {
                      completedAt: session.completedAt,
                      certificateId: session.certificateId,
                      priority: "all",
                      role: undefined,
                      build: session.build,
                      tester: session.tester,
                    }
                  : undefined);

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
              const pCode = isAllPriority ? "" : `-${currentPriority}`;
              const rCode = isAllRole
                ? ""
                : `-${roleShortCodes[currentRole] || currentRole.slice(0, 3).toUpperCase()}`;

              const priorityTitle = isAllPriority
                ? "Semua Prioritas"
                : `Prioritas ${currentPriority} (${currentPriority === "P0" ? "Pilot" : currentPriority === "P1" ? "Pasca-pilot" : "Rencana masa depan"})`;
              const roleTitle = isAllRole ? "Semua Peran" : `Peran ${currentRole}`;
              const cardTitle =
                isAllPriority && isAllRole
                  ? "Sertifikat Seluruh Pengujian (P0, P1, P2 · Semua Peran)"
                  : `Sertifikat ${priorityTitle} · ${roleTitle}`;

              const scopeLabel =
                isAllPriority && isAllRole
                  ? "Semua"
                  : `${isAllPriority ? "Semua Prioritas" : currentPriority}${isAllRole ? "" : ` · ${currentRole}`}`;

              return (
                <div className="cert-detail-card">
                  <div className="cert-detail-header">
                    <h3>
                      <Award size={18} />
                      {cardTitle}
                    </h3>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {pStats.progress}% Selesai
                    </span>
                  </div>

                  <Bar
                    done={pProgress.resolved}
                    total={pProgress.total}
                    className={isAllPriority ? "" : currentPriority}
                  />

                  <div className="priority-stats" style={{ marginTop: 2 }}>
                    <span>
                      <i className="dot pass" /> {pStats.pass} {t.pass}
                    </span>
                    <span>
                      <i className="dot fail" /> {pStats.fail} {t.fail}
                    </span>
                    <span>
                      <i className="dot blocked" /> {pStats.blocked} {t.blocked}
                    </span>
                    <span>
                      <i className="dot not_run" /> {pStats.not_run} {t.not_run}
                    </span>
                  </div>

                  {cert ? (
                    <div className="cert-status-banner certified">
                      <CheckCheck size={18} />
                      <div>
                        <strong>Sertifikat Telah Diterbitkan</strong>
                        <div>
                          Nomor:{" "}
                          <code style={{ fontFamily: "var(--mono)" }}>
                            {`QA-${new Date(cert.completedAt).getFullYear()}${pCode}${rCode}-${cert.certificateId.slice(0, 8).toUpperCase()}`}
                          </code>
                          {" · "}
                          Tanggal: {date(cert.completedAt)}
                        </div>
                        <div>
                          Versi aplikasi:{" "}
                          <strong>
                            {cert.build || session.build || "Tidak dicantumkan"}
                          </strong>
                          {" · "}
                          Penguji:{" "}
                          <strong>
                            {cert.tester ||
                              session.tester ||
                              "Tidak dicantumkan"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : pProgress.isComplete ? (
                    <div className="cert-status-banner ready">
                      <Sparkles size={18} />
                      <div>
                        <strong>Pengujian Selesai & Siap Diterbitkan</strong>
                        <div>
                          Seluruh {pProgress.total} kasus telah diuji dengan
                          status Lulus, Gagal, atau Terblokir. Anda dapat
                          menerbitkan sertifikat sekarang.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="cert-status-banner pending">
                      <CircleAlert size={18} />
                      <div>
                        <strong>Pengujian Belum Lengkap</strong>
                        <div>
                          Masih terdapat{" "}
                          {pProgress.total - pProgress.resolved} kasus yang
                          belum diselesaikan pada cakupan ini (
                          {pProgress.resolved} dari {pProgress.total} selesai).
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="cert-form-grid" style={{ marginTop: 10 }}>
                    <label>
                      <span>Versi Aplikasi yang Diuji:</span>
                      <input
                        value={session.build}
                        placeholder="Contoh: alpha 0.1.0, beta, v.1.0.0"
                        onChange={(e) =>
                          updateSession({ build: e.target.value })
                        }
                      />
                      <div className="preset-chips">
                        {versionPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`preset-chip ${session.build === preset ? "active" : ""}`}
                            onClick={() => updateSession({ build: preset })}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label>
                      <span>Nama Penguji:</span>
                      <input
                        value={session.tester}
                        placeholder="Nama Penguji QA"
                        onChange={(e) =>
                          updateSession({ tester: e.target.value })
                        }
                      />
                      <small
                        style={{
                          color: "var(--muted)",
                          marginTop: 6,
                          display: "block",
                        }}
                      >
                        Dicantumkan pada baris penguji sertifikat.
                      </small>
                    </label>
                  </div>

                  <div className="cert-action-bar">
                    {cert && (
                      <>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            showCertificatePreview(
                              session,
                              currentPriority,
                              currentRole,
                            )
                          }
                        >
                          <Eye size={15} />
                          Lihat Sertifikat
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            downloadCertificate(currentPriority, currentRole)
                          }
                        >
                          <Download size={15} />
                          Unduh Sertifikat PDF
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="button primary"
                      disabled={!pProgress.isComplete || runner.running}
                      onClick={() =>
                        issueCertificate(currentPriority, currentRole)
                      }
                    >
                      <Award size={15} />
                      {cert
                        ? `Terbitkan Ulang (${scopeLabel})`
                        : `Terbitkan Sertifikat (${scopeLabel})`}
                    </button>
                  </div>
                  {certificatePreview?.scope ===
                    `${currentPriority}:${currentRole}` && (
                    <section
                      className="cert-preview-panel"
                      ref={certificatePreviewRef}
                    >
                      <div className="cert-preview-heading">
                        <div>
                          <strong>Pratinjau Sertifikat</strong>
                          <span>{certificatePreview.filename}</span>
                        </div>
                        <div className="cert-preview-actions">
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() =>
                              downloadCertificate(currentPriority, currentRole)
                            }
                          >
                            <Download size={15} />
                            Unduh PDF
                          </button>
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => setCertificatePreview(null)}
                          >
                            Tutup Pratinjau
                          </button>
                        </div>
                      </div>
                      <iframe
                        className="cert-preview-frame"
                        title="Pratinjau sertifikat hasil uji QA"
                        src={`${certificatePreview.url}#toolbar=0&navpanes=0`}
                      />
                    </section>
                  )}
                </div>
              );
            })()}
          </div>
        </Dialog>
      )}
      {selected && (
        <Dialog
          title={`${t.detail} · ${selected.id}`}
          onClose={() => setSelected(null)}
          wide
          scrollKey={`${selected.id}-${tutorialStage}-${activeTutorialStep}`}
        >
          <div className="case-detail">
            <div className="detail-heading">
              <div className="detail-meta">
                <span className={`priority-label ${selected.priority}`}>
                  {selected.priority}
                </span>
                <ChevronRight size={14} />
                <span>{selected.role}</span>
                <span className="detail-type">{selected.type}</span>
              </div>
              <h2>{selected.title}</h2>
              <div className="detail-source">
                <span>{selected.id}</span>
                <AvailabilityBadge availability={selected.availability} />
                <span>
                  {selected.sourceDocument === "current"
                    ? "Implementasi saat ini · 12 Oktober 2026"
                    : `v5 §${selected.section}`}{" "}
                  · {selected.module}
                </span>
                <a
                  href={`/source/${selected.sourceDocument === "current" ? "current" : "v5"}.html#L${selected.sourceLine}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  {t.source}
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
            <div className="detail-columns">
              <div className="detail-main">
                <section className="tutorial-progress-panel">
                  <div className="tutorial-progress-copy">
                    <span>
                      {tutorialStage === "intro"
                        ? "Persiapan pengujian"
                        : tutorialStage === "result"
                          ? "Catat hasil pengujian"
                          : `Langkah ${activeTutorialStep + 1} dari ${selected.steps.length}`}
                    </span>
                    <strong>
                      {selectedManual.checks.length} / {selected.steps.length}{" "}
                      langkah selesai
                    </strong>
                  </div>
                  <Bar
                    className="tutorial-progress-bar"
                    done={selectedManual.checks.length}
                    total={selected.steps.length}
                  />
                </section>
                {tutorialStage === "intro" && (
                  <section className="detail-section tutorial-intro">
                    <h3>
                      <ClipboardCheck size={17} />
                      Sebelum memulai
                    </h3>
                    <p className="tutorial-context">
                      Lingkungan: <strong>{session.environment}</strong>
                      {session.build && (
                        <>
                          {" "}
                          · Build: <strong>{session.build}</strong>
                        </>
                      )}
                    </p>
                    <p className="tutorial-target">
                      <span>URL target</span>
                      <code>{safeUrl(state.targetUrl) ?? "Belum diatur"}</code>
                    </p>
                    <div className="production-safety-note" role="note">
                      <ShieldCheck size={18} aria-hidden="true" />
                      <p>
                        Pastikan URL mengarah ke staging/UAT atau lingkungan uji
                        produksi yang disetujui. Gunakan akun dan data uji
                        resmi; jangan mengubah atau menghapus data pengguna
                        nyata. Jika skenario tidak dapat dilakukan dengan aman,
                        tandai Terblokir dan koordinasikan dengan pemilik
                        lingkungan.
                      </p>
                    </div>
                    <ul>
                      {selected.preconditions.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                    <div className="test-data">
                      <span>{t.data}</span>
                      <p>{selected.data}</p>
                    </div>
                    {selected.availability === "backlog" && (
                      <div className="availability-notice backlog-notice">
                        Fitur ini belum tersedia pada implementasi saat ini.
                        Anda dapat membaca kasus dan menandainya Terblokir,
                        tetapi tidak dapat menyatakan Lulus atau Gagal.
                      </div>
                    )}
                    {selected.availability === "disabled" && (
                      <div className="availability-notice disabled-notice">
                        Kasus ini memeriksa bahwa integrasi tetap nonaktif;
                        kelulusan berarti status nonaktif bekerja sesuai
                        harapan.
                      </div>
                    )}
                  </section>
                )}
                {tutorialStage === "steps" && (
                  <section className="detail-section tutorial-step-section">
                    <div className="tutorial-step-heading">
                      <h3>
                        <ListChecks size={17} />
                        Langkah {activeTutorialStep + 1}
                      </h3>
                      <button
                        className="text-link"
                        onClick={() =>
                          setShowAllTutorialSteps((visible) => !visible)
                        }
                        aria-expanded={showAllTutorialSteps}
                      >
                        <span aria-hidden="true">
                          {showAllTutorialSteps ? "◉" : "◎"}
                        </span>
                        {showAllTutorialSteps
                          ? "Fokus ke langkah ini"
                          : "Lihat semua langkah"}
                      </button>
                    </div>
                    <p className="helper-text">
                      Kerjakan langkah ini di tab E-Learning, lalu cocokkan
                      hasil aktual dengan harapan di bawah.
                    </p>
                    {!showAllTutorialSteps && (
                      <div
                        className={`tutorial-current-step ${selectedManual.checks.includes(activeTutorialStep) ? "complete" : ""}`}
                      >
                        {selectedManual.checks.includes(activeTutorialStep) && (
                          <span className="step-success-banner" role="status">
                            <span className="step-success-icon">
                              <Sparkles
                                className="step-success-mark"
                                size={15}
                                aria-hidden="true"
                              />
                            </span>
                            Langkah selesai!
                          </span>
                        )}
                        <p>{selected.steps[activeTutorialStep].action}</p>
                        <div className="tutorial-expected-step">
                          <Check size={15} />
                          <span>
                            {selected.steps[activeTutorialStep].expected}
                          </span>
                        </div>
                        <button
                          className={`button ${selectedManual.checks.includes(activeTutorialStep) ? "secondary" : "primary"}`}
                          aria-pressed={selectedManual.checks.includes(
                            activeTutorialStep,
                          )}
                          onClick={() => {
                            const alreadyComplete =
                              selectedManual.checks.includes(
                                activeTutorialStep,
                              );
                            const checks = alreadyComplete
                              ? selectedManual.checks.filter(
                                  (item) => item !== activeTutorialStep,
                                )
                              : [...selectedManual.checks, activeTutorialStep];
                            updateManual(selected.id, { checks });
                            if (alreadyComplete) {
                              setCelebrationCase(null);
                              return;
                            }
                            const tutorialComplete = selected.steps.every(
                              (_, index) => checks.includes(index),
                            );
                            if (tutorialComplete) {
                              setCelebrationCase(selected.id);
                              if (soundEnabled) playQaSound("completion");
                            } else if (soundEnabled) {
                              playQaSound("step");
                            }
                          }}
                        >
                          <Check size={16} />
                          {selectedManual.checks.includes(activeTutorialStep)
                            ? "Batalkan tanda selesai"
                            : "Tandai langkah selesai"}
                        </button>
                      </div>
                    )}
                    {showAllTutorialSteps && (
                      <ol className="steps all-tutorial-steps">
                        {selected.steps.map((step, index) => (
                          <li
                            key={`${selected.id}-${index}`}
                            className={`${selectedManual.checks.includes(index) ? "checked" : ""} ${activeTutorialStep === index ? "current" : ""}`}
                          >
                            <button
                              className="step-check"
                              aria-label={`Buka langkah ${index + 1}`}
                              aria-pressed={activeTutorialStep === index}
                              onClick={() =>
                                updateManual(selected.id, {
                                  tutorialStep: index,
                                })
                              }
                            >
                              {selectedManual.checks.includes(index) ? (
                                <Check size={16} />
                              ) : (
                                index + 1
                              )}
                            </button>
                            <div>
                              <p>{step.action}</p>
                              <small>
                                <Check size={13} />
                                {step.expected}
                              </small>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                    {celebrationCase === selected.id &&
                      selected.steps.every((_, index) =>
                        selectedManual.checks.includes(index),
                      ) && (
                        <div
                          className="tutorial-celebration"
                          role="status"
                          aria-live="polite"
                        >
                          <span className="celebration-icon">
                            <Sparkles size={21} aria-hidden="true" />
                            <MagicalSparkles compact />
                          </span>
                          <span className="celebration-copy">
                            <strong>Semua langkah selesai!</strong>
                            <small>
                              Mantap. Lanjutkan untuk mencatat hasil dan bukti
                              pengujian.
                            </small>
                          </span>
                        </div>
                      )}
                  </section>
                )}
                {tutorialStage === "result" && (
                  <section className="expected-box">
                    <h3>
                      <Target size={16} />
                      {t.expected}
                    </h3>
                    <p>{selected.expected}</p>
                  </section>
                )}
                {tutorialStage === "result" && (
                  <section className="cleanup">
                    <h3>{t.cleanup}</h3>
                    <p>{selected.cleanup}</p>
                  </section>
                )}
                {tutorialStage === "result" && (
                  <div className="detail-requirements">
                    <span>
                      {t.requirements}:{" "}
                      {selected.requirements.join(", ") ||
                        `Implementasi saat ini · ${selected.module}`}
                    </span>
                    <small>{selected.priorityBasis}</small>
                  </div>
                )}
              </div>
              {tutorialStage === "result" && (
                <aside className="detail-results">
                  <section className="manual-result">
                    <div className="result-heading">
                      <h3>
                        <Users size={16} />
                        {t.manual}
                      </h3>
                      <Badge status={selectedManual.status} />
                    </div>
                    <div className="status-choice" aria-label={t.caseStatus}>
                      {(["pass", "fail", "blocked", "not_run"] as Status[]).map(
                        (s) => {
                          const unavailableResult = !canRecordManualStatus(
                            selected,
                            s,
                          );
                          return (
                            <button
                              key={s}
                              className={`${s} ${selectedManual.status === s ? "selected" : ""}`}
                              aria-pressed={selectedManual.status === s}
                              disabled={unavailableResult}
                              onClick={() => {
                                updateManual(selected.id, { status: s });
                                if (selectedManual.status !== s && soundEnabled)
                                  playQaSound(`status-${s}`);
                                if (s === "pass") {
                                  setNotice(
                                    `Kasus ${selected.id} lulus. Progres pengujian tersimpan!`,
                                  );
                                } else {
                                  setNotice(t.saved);
                                }
                              }}
                            >
                              <span className="status-choice-label">
                                <StatusIcon status={s} />
                                {statusLabels[s]}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                    <label>
                      {t.actual}
                      <textarea
                        value={selectedManual.actual}
                        placeholder={t.actualPlaceholder}
                        onChange={(e) =>
                          updateManual(selected.id, { actual: e.target.value })
                        }
                        rows={4}
                      />
                    </label>
                    <label>
                      {t.notes}
                      <textarea
                        value={selectedManual.note}
                        placeholder={t.notesPlaceholder}
                        onChange={(e) =>
                          updateManual(selected.id, { note: e.target.value })
                        }
                        rows={3}
                      />
                    </label>
                    <label>
                      {t.evidence}
                      <input
                        value={selectedManual.evidence}
                        placeholder={t.evidencePlaceholder}
                        onChange={(e) =>
                          updateManual(selected.id, {
                            evidence: e.target.value,
                          })
                        }
                      />
                    </label>
                    <small className="helper-text">{t.evidenceHelp}</small>
                    {safeUrl(selectedManual.evidence) && (
                      <a
                        className="text-link"
                        href={safeUrl(selectedManual.evidence)!}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.openEvidence}
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <div className="manual-meta">
                      <span>{session.tester || t.noTester}</span>
                      <span>
                        {t.updated}: {date(selectedManual.updatedAt)}
                      </span>
                      <span>{session.environment}</span>
                    </div>
                  </section>
                  <AutoEvidence c={selected} evidence={results[selected.id]} />
                  <section className="comparison-box">
                    <span>{t.comparison}</span>
                    <Badge
                      status={comparison(
                        selectedManual.status,
                        results[selected.id]?.status,
                      )}
                    />
                    <small>{t.autoScope}</small>
                  </section>
                </aside>
              )}
            </div>
          </div>
          <div className="detail-footer">
            <span>
              <Check size={14} />
              {storageError ? t.saveFailed : t.local}
            </span>
            <div className="tutorial-footer-actions">
              {tutorialStage !== "intro" && (
                <button
                  className="button secondary"
                  onClick={() =>
                    updateManual(selected.id, {
                      tutorialStep:
                        tutorialStage === "result"
                          ? selected.steps.length - 1
                          : Math.max(-1, selectedManual.tutorialStep - 1),
                    })
                  }
                >
                  <ArrowLeft size={16} />
                  Sebelumnya
                </button>
              )}
              {tutorialStage === "intro" ? (
                <button
                  className="button primary"
                  onClick={() => updateManual(selected.id, { tutorialStep: 0 })}
                >
                  Mulai tutorial <ArrowRight size={16} />
                </button>
              ) : tutorialStage === "steps" ? (
                <button
                  className="button primary"
                  onClick={() =>
                    updateManual(selected.id, {
                      tutorialStep: selectedManual.tutorialStep + 1,
                    })
                  }
                >
                  {selectedManual.tutorialStep + 1 === selected.steps.length
                    ? "Lanjut ke hasil"
                    : "Langkah berikutnya"}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button className="button primary" onClick={nextCase}>
                  {t.next} <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function AutoEvidence({ c, evidence }: { c: Case; evidence?: Evidence }) {
  const error = evidence?.error?.cause ?? evidence?.error;
  return (
    <section className="auto-result">
      <div className="result-heading">
        <h3>
          <Terminal size={16} />
          {t.autoEvidence}
        </h3>
        <Badge status={evidence?.status ?? "not_run"} />
      </div>
      {evidence?.test ? (
        <>
          <span className="evidence-kind">
            {evidence.kind?.toUpperCase()} · {evidence.durationMs?.toFixed(1)}{" "}
            ms
          </span>
          <dl>
            <dt>{t.assertion}</dt>
            <dd>{evidence.test}</dd>
            <dt>{t.assertionFile}</dt>
            <dd>
              <code>
                {evidence.file}
                {evidence.line && evidence.line > 1 ? `:${evidence.line}` : ""}
              </code>
            </dd>
            <dt>{t.runId}</dt>
            <dd>
              <code>{evidence.runId}</code>
            </dd>
            <dt>{t.updated}</dt>
            <dd>{date(evidence.completedAt)}</dd>
          </dl>
          {error && (
            <div className="error-evidence">
              <strong>{t.errorDetail}</strong>
              <pre>{error.message ?? JSON.stringify(error)}</pre>
              {error.actual !== undefined && (
                <small>
                  actual: {String(error.actual)} · expected:{" "}
                  {String(error.expected)}
                </small>
              )}
            </div>
          )}
        </>
      ) : (
        <p>{evidence?.reason ?? c.manualReason ?? t.manualOnly}</p>
      )}
      <small className="scope-text">
        <b>{t.scope}</b>
        <br />
        {evidence?.scope ?? c.automation?.scope ?? t.manualOnly}
      </small>
    </section>
  );
}
