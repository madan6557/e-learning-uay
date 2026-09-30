import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
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
  FileText,
  FlaskConical,
  GitCompareArrows,
  Layers,
  ListChecks,
  LoaderCircle,
  Menu,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Terminal,
  Upload,
  Users,
  X,
  XCircle,
} from "lucide-react";
import dictionary from "../../../packages/shared/src/id.json";
import rawCatalog from "../../../docs/qa/catalog.json";
import {
  comparison,
  emptyManual,
  exportCsv,
  readState,
  safeUrl,
  saveState,
  statistics,
  newSession,
  validateState,
  type Case,
  type Evidence,
  type Manual,
  type Report,
  type State,
  type Status,
} from "./model";

const t = dictionary.qa;
const catalog = rawCatalog as typeof rawCatalog & { cases: Case[] };
const cases = catalog.cases as Case[];
const ids = new Set(cases.map((c) => c.id));
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
  "Admin Prodi": "AP",
  "Super Admin": "SA",
  "Operator / DevOps": "OP",
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
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Badge({ status, text }: { status: string; text?: string }) {
  const Icon =
    status === "pass" || status === "match"
      ? Check
      : status === "fail" || status === "mismatch"
        ? XCircle
        : status === "blocked"
          ? CircleAlert
          : Circle;
  return (
    <span className={`badge ${status}`}>
      <Icon size={13} aria-hidden="true" />
      {text ?? statusLabels[status] ?? status}
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
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      className={`dialog ${wide ? "wide" : ""}`}
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
  const [state, setState] = useState<State>(() => readState(ids));
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
    [type, setType] = useState("all");
  const [query, setQuery] = useState(""),
    [manualFilter, setManualFilter] = useState("all"),
    [autoFilter, setAutoFilter] = useState("all"),
    [diffFilter, setDiffFilter] = useState("all");
  const [expanded, setExpanded] = useState<string[]>(["P0"]),
    [selected, setSelected] = useState<Case | null>(null),
    [settingsOpen, setSettingsOpen] = useState(false),
    [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState(""),
    [storageError, setStorageError] = useState(false),
    [exportOpen, setExportOpen] = useState(false);
  const [smallScreen, setSmallScreen] = useState(
    () => window.matchMedia?.("(max-width: 760px)").matches ?? false,
  );
  const importRef = useRef<HTMLInputElement>(null),
    lastRun = useRef("");
  const session = state.sessions.find((s) => s.id === state.active)!;
  const results = report?.results ?? {};
  const stats = statistics(cases, session.records, results);
  const selectedManual = selected
    ? (session.records[selected.id] ?? emptyManual())
    : emptyManual();

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
    setQuery("");
    setManualFilter("all");
    setAutoFilter("all");
    setDiffFilter("all");
  }
  function updateSession(values: Partial<typeof session>) {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((item) =>
        item.id === s.active ? { ...item, ...values } : item,
      ),
    }));
  }
  function updateManual(id: string, values: Partial<Manual>) {
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((item) =>
        item.id !== s.active
          ? item
          : {
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
            },
      ),
    }));
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
    const next = filtered.find(
      (c) =>
        !["pass", "fail"].includes(session.records[c.id]?.status ?? "not_run"),
    );
    if (next) setSelected(next);
    else setNotice(t.finished);
  }
  function nextCase() {
    if (!selected) return;
    const index = filtered.findIndex((c) => c.id === selected.id);
    setSelected(filtered[index + 1] ?? null);
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
      const parsed = validateState(JSON.parse(await file.text()), ids);
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
    <div className="app-shell">
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
            <a
              className="text-link"
              href={safeUrl(state.targetUrl) ?? "#"}
              target="_blank"
              rel="noreferrer"
            >
              {t.openApp}
              <ExternalLink size={14} />
            </a>
            <span className="divider" />
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
                      ? t.traceHelp
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
                    return (
                      <button
                        className="priority-progress"
                        key={p}
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
                                <small className="source-ref">
                                  v5 §{c.section}
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
              <div className="coverage-metrics">
                <div>
                  <BookOpen size={23} />
                  <strong>15 / 15</strong>
                  <span>{t.requirements}</span>
                </div>
                <div>
                  <FlaskConical size={23} />
                  <strong>12 / 12</strong>
                  <span>BVA · v5 §8.1</span>
                </div>
                <div>
                  <GitCompareArrows size={23} />
                  <strong>9 / 9</strong>
                  <span>Cause-effect · v5 §8.2</span>
                </div>
                <div>
                  <ShieldCheck size={23} />
                  <strong>12 / 12</strong>
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
                  onChange={(e) => updateSession({ build: e.target.value })}
                />
              </label>
            </div>
            <label>
              {t.target}
              <input
                type="url"
                value={state.targetUrl}
                onChange={(e) =>
                  setState((s) => ({ ...s, targetUrl: e.target.value }))
                }
                onBlur={() => {
                  if (!safeUrl(state.targetUrl)) setNotice(t.invalidUrl);
                }}
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
      {selected && (
        <Dialog
          title={`${t.detail} · ${selected.id}`}
          onClose={() => setSelected(null)}
          wide
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
                <span>
                  v5 §{selected.section} · {selected.module}
                </span>
                <a
                  href={`/source/v5.html#L${selected.sourceLine}`}
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
                <section className="detail-section">
                  <h3>
                    <ClipboardCheck size={17} />
                    {t.preconditions}
                  </h3>
                  <ul>
                    {selected.preconditions.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <div className="test-data">
                    <span>{t.data}</span>
                    <p>{selected.data}</p>
                  </div>
                </section>
                <section className="detail-section">
                  <h3>
                    <ListChecks size={17} />
                    {t.steps}
                  </h3>
                  <p className="helper-text">{t.stepHint}</p>
                  <ol className="steps">
                    {selected.steps.map((s, i) => (
                      <li
                        key={`${selected.id}-${i}`}
                        className={
                          selectedManual.checks.includes(i) ? "checked" : ""
                        }
                      >
                        <button
                          className="step-check"
                          aria-label={`${t.step} ${i + 1}`}
                          aria-pressed={selectedManual.checks.includes(i)}
                          onClick={() =>
                            updateManual(selected.id, {
                              checks: selectedManual.checks.includes(i)
                                ? selectedManual.checks.filter((n) => n !== i)
                                : [...selectedManual.checks, i],
                            })
                          }
                        >
                          {selectedManual.checks.includes(i) ? (
                            <Check size={16} />
                          ) : (
                            i + 1
                          )}
                        </button>
                        <div>
                          <p>{s.action}</p>
                          <small>
                            <Check size={13} />
                            {s.expected}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="expected-box">
                  <h3>
                    <Target size={16} />
                    {t.expected}
                  </h3>
                  <p>{selected.expected}</p>
                </section>
                <section className="cleanup">
                  <h3>{t.cleanup}</h3>
                  <p>{selected.cleanup}</p>
                </section>
                <div className="detail-requirements">
                  <span>
                    {t.requirements}:{" "}
                    {selected.requirements.join(", ") ||
                      `v5 §${selected.section}`}
                  </span>
                  <small>{selected.priorityBasis}</small>
                </div>
              </div>
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
                      (s) => (
                        <button
                          key={s}
                          className={`${s} ${selectedManual.status === s ? "selected" : ""}`}
                          aria-pressed={selectedManual.status === s}
                          onClick={() => {
                            updateManual(selected.id, { status: s });
                            setNotice(t.saved);
                          }}
                        >
                          <Badge status={s} />
                        </button>
                      ),
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
                        updateManual(selected.id, { evidence: e.target.value })
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
            </div>
          </div>
          <div className="detail-footer">
            <span>
              <Check size={14} />
              {storageError ? t.saveFailed : t.local}
            </span>
            <button className="button primary" onClick={nextCase}>
              {t.next}
              <ArrowRight size={16} />
            </button>
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
