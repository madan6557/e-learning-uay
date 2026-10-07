import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Activity as ActivityIcon,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import {
  ActivityWaterfall,
  SessionChart,
  categoryLabel,
} from "./ActivityWaterfall";
import {
  INDICATOR_DEFINITIONS,
  type Activity,
  type ActivityMetrics,
  type ClassDetail,
  type FilterOptions,
  type GradingMetrics,
  type LecturerDetail,
  type LecturerRow,
  type Page,
  type ReportResponse,
  type Summary,
} from "../../../../packages/shared/src/rector";
import { formatDateTime, localTimeZone } from "../../../../packages/shared/src/time";
import "./styles.css";
const API = "/api/rector/v1";
const formatDate = (v: string | null) =>
  v
    ? formatDateTime(v)
    : "Belum ada data";
const n = (v: number) => new Intl.NumberFormat("id-ID").format(v);
const shortDay = (v: string) =>
  !v || Number.isNaN(Date.parse(v))
    ? "—"
    : new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
      }).format(new Date(v + "T00:00:00"));
type View =
  | "overview"
  | "lecturers"
  | "lecturer"
  | "class"
  | "activities"
  | "definitions";
function useReport<T>(path: string | null, onUnauthorized: () => void) {
  const [data, setData] = useState<ReportResponse<T> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    setData(null);
    setError("");
    setLoading(true);
    fetch(API + path, { signal: controller.signal })
      .then(async (r) => {
        if (r.status === 401) {
          onUnauthorized();
          throw new Error("Sesi berakhir. Silakan masuk kembali.");
        }
        if (!r.ok)
          throw new Error(
            r.status === 400
              ? "Filter tidak valid. Periksa tanggal dan rentang maksimal dua tahun."
              : "Data belum dapat dimuat. Silakan coba kembali.",
          );
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version, onUnauthorized]);
  useEffect(() => {
    if (!path) return;
    const timer = setInterval(() => setVersion((v) => v + 1), 300000);
    return () => clearInterval(timer);
  }, [path]);
  return { data, error, loading, reload: () => setVersion((v) => v + 1) };
}
function Empty({
  children = "Tidak ada data yang cocok dengan filter.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Search size={24} />
      <strong>Belum ada data</strong>
      <span>{children}</span>
    </div>
  );
}
function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="error" role="alert">
        {error}
        <button onClick={retry}>Coba kembali</button>
      </div>
    );
  if (loading)
    return (
      <div className="loading" role="status">
        <RefreshCw size={18} /> Memuat bukti aktivitas…
      </div>
    );
  return null;
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Metric({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: ReactNode;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function Progress({ data }: { data: GradingMetrics }) {
  return (
    <div className="grading-panel">
      <div className="split">
        <div>
          <h3>Penyelesaian penilaian</h3>
        </div>
      </div>
      <div className="progress-number">
        {data.percentage === null ? "Belum ada data" : `${data.percentage}%`}
        <span>
          {n(data.published)} dari {n(data.total)} pekerjaan sudah dibagikan
        </span>
      </div>
      <div
        className="progress-track"
        role="img"
        aria-label={`Publikasi ${data.percentage ?? "belum ada data"} persen`}
      >
        <span style={{ width: `${data.percentage ?? 0}%` }} />
      </div>
      <div className="grading-grid">
        <div>
          <strong>{n(data.graded)}</strong>
          <span>Sudah dinilai</span>
        </div>
        <div>
          <strong>{n(data.pending)}</strong>
          <span>Menunggu penilaian</span>
        </div>
        <div>
          <strong>
            {data.oldestPendingDays === null
              ? "—"
              : `${data.oldestPendingDays} hari`}
          </strong>
          <span>Antrean tertua</span>
        </div>
      </div>
      <details className="secondary-detail">
        <summary>Rincian perhitungan</summary>
        <p>
          {n(data.automaticGraded)} jawaban kuis dinilai otomatis dan dihitung
          terpisah. Antrean hanya memakai kiriman terbaru, penilaian manual, dan
          nilai akhir kelas.
        </p>
      </details>
    </div>
  );
}
function ActivityCards({ m }: { m: ActivityMetrics }) {
  return (
    <div className="metrics compact">
      <Metric
        label="Berhasil masuk"
        value={n(m.logins)}
        note="Dihitung saat dosen berhasil masuk"
        icon={<LogIn size={18} />}
      />
      <Metric
        label="Akses kelas"
        value={n(m.accesses)}
        note="Terpisah dari aktivitas akademik"
        icon={<BookOpen size={18} />}
      />
      <Metric
        label="Kegiatan pembelajaran"
        value={n(m.academicActions)}
        note={`${m.activeDays} hari aktif akademik`}
        icon={<ActivityIcon size={18} />}
      />
      <Metric
        label="Penilaian oleh dosen"
        value={n(m.gradingActions)}
        note={`${m.publicationActions} pembagian nilai · ${m.correctionActions} koreksi`}
        icon={<FileCheck2 size={18} />}
      />
    </div>
  );
}
function Timeline({
  events,
  category,
  actor,
  onFilter,
}: {
  events: Activity[];
  category: string;
  actor: string;
  onFilter: (v: Record<string, string | null>) => void;
}) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [events, category, actor]);
  const filtered = events.filter(
    (a) =>
      (!category || a.category === category) &&
      (!actor || a.actorKind === actor),
  );
  const shown = filtered.slice((page - 1) * 10, page * 10);
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span className="eyebrow">BUKTI DALAM PERIODE</span>
          <h3>Riwayat kegiatan</h3>
        </div>
        <Badge>{filtered.length} kejadian</Badge>
      </div>
      <div className="timeline-filters">
        <label>
          Kategori
          <select
            value={category}
            onChange={(e) => onFilter({ category: e.target.value, page: null })}
          >
            <option value="">Semua kategori</option>
            {[
              "LOGIN",
              "LOGOUT",
              "AKSES",
              "MATERI",
              "ASESMEN",
              "PENILAIAN",
              "PUBLIKASI",
              "KOREKSI",
              "PENGUMUMAN",
              "KELAS",
            ].map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pelaku
          <select
            value={actor}
            onChange={(e) =>
              onFilter({ actorKind: e.target.value, page: null })
            }
          >
            <option value="">Semua pelaku</option>
            <option value="DOSEN">Dosen</option>
            <option value="ADMIN">Admin akademik</option>
            <option value="SISTEM">Proses otomatis</option>
          </select>
        </label>
      </div>
      {shown.length ? (
        <div className="timeline">
          {shown.map((a) => (
            <div className="timeline-row" key={a.id}>
              <div className={`timeline-dot ${a.actorKind.toLowerCase()}`}>
                {a.category === "LOGIN" ? (
                  <LogIn size={15} />
                ) : (
                  <ActivityIcon size={15} />
                )}
              </div>
              <div>
                <div className="event-title">
                  <strong>{a.action}</strong>
                  <Badge
                    tone={
                      a.actorKind === "DOSEN"
                        ? "blue"
                        : a.actorKind === "SISTEM"
                          ? "green"
                          : "neutral"
                    }
                  >
                    {a.actorKind === "DOSEN"
                      ? "Dosen"
                      : a.actorKind === "ADMIN"
                        ? "Admin akademik"
                        : "Proses otomatis"}
                  </Badge>
                </div>
                <p>{a.objectName}</p>
                <small>
                  {a.actorName} · {formatDate(a.at)}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty />
      )}
      <Pagination
        page={page}
        total={filtered.length}
        pageSize={10}
        setPage={setPage}
      />
    </section>
  );
}
function Pagination({
  page,
  total,
  pageSize,
  setPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  setPage: (p: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} dari ${total}`
          : "0 hasil"}
      </span>
      <div>
        <button
          aria-label="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          <ArrowLeft size={15} />
        </button>
        <span>
          Halaman {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <button
          aria-label="Halaman berikutnya"
          disabled={page * pageSize >= total}
          onClick={() => setPage(page + 1)}
        >
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
export function RectorDashboard({ demo }: { demo: boolean }) {
  const timeZone = localTimeZone();
  const [refreshKey, setRefreshKey] = useState(0);
  const [params, setParams] = useState(
    () => new URLSearchParams(location.search),
  );
  const [session, setSession] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const unauthorized = useCallback(() => {
    setSession(false);
    window.dispatchEvent(new Event("session-expired"));
  }, []);
  useEffect(() => {
    const update = () => setParams(new URLSearchParams(location.search));
    addEventListener("popstate", update);
    addEventListener("routechange", update);
    return () => {
      removeEventListener("popstate", update);
      removeEventListener("routechange", update);
    };
  }, []);
  const update = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(changes))
      value ? next.set(key, value) : next.delete(key);
    (replace ? history.replaceState : history.pushState).call(
      history,
      history.state,
      "",
      "/rector?" + next.toString(),
    );
    setParams(next);
  };
  const filters = useReport<FilterOptions>(
    session ? "/filters?timeZone=" + encodeURIComponent(timeZone) : null,
    unauthorized,
  );
  useEffect(() => {
    if (params.get("timeZone") !== timeZone) update({ timeZone }, true);
  }, [params, timeZone]);
  const opts = filters.data?.data;
  useEffect(() => {
    if (!opts) return;
    const defaults: Record<string, string> = {};
    for (const [k, v] of Object.entries(opts.defaultFilters))
      if (!new URLSearchParams(location.search).has(k)) defaults[k] = v!;
    if (Object.keys(defaults).length) update(defaults, true);
  }, [opts]);
  const requestedView = params.get("view") ?? "overview";
  const view: View = [
    "overview",
    "lecturers",
    "lecturer",
    "class",
    "activities",
    "definitions",
  ].includes(requestedView)
    ? (requestedView as View)
    : "overview";
  const id = params.get("id") ?? "";
  const query = useMemo(() => {
    const q = new URLSearchParams();
    q.set("timeZone", timeZone);
    for (const key of [
      "semester",
      "from",
      "to",
      "department",
      "lecturer",
      "classId",
      "search",
      "category",
      "actorKind",
    ]) {
      // Search belongs to the lecturer list, not to another actor's evidence
      // when drilling into a jointly taught class.
      if (key === "search" && view !== "lecturers") continue;
      const value =
        params.get(key) ??
        opts?.defaultFilters[key as keyof typeof opts.defaultFilters];
      if (value) q.set(key, value);
    }
    if (view === "lecturer") q.set("lecturer", id);
    if (view === "class") q.set("classId", id);
    if (params.get("session")) q.set("_session", params.get("session")!);
    q.set("_refresh", String(refreshKey));
    return q;
  }, [params, opts, view, id, refreshKey, timeZone]);
  const report = useReport<Summary>(
    session && opts ? "/summary?" + query : null,
    unauthorized,
  );
  const nav = (next: View, nextId?: string, sessionId?: string) =>
    update({
      view: next,
      id: nextId ?? null,
      page: null,
      category: null,
      actorKind: null,
      session: sessionId ?? null,
    });
  const editFilter = (key: string, value: string) => {
    const changes: Record<string, string | null> = { [key]: value, page: null };
    if (key === "semester" || key === "department") {
      changes.classId = null;
      changes.lecturer = null;
      changes.search = null;
      changes.id = null;
      changes.view =
        view === "class" || view === "lecturer" ? "lecturers" : view;
    }
    if (key === "lecturer" || key === "classId") {
      changes.id = null;
      changes.view =
        view === "class" || view === "lecturer" ? "lecturers" : view;
    }
    update(changes);
  };
  const get = (key: string) => query.get(key) ?? "";
  const exportReport = async (format: "csv" | "pdf") => {
    setExporting(true);
    setExportError("");
    try {
      const q = new URLSearchParams(query);
      q.set("view", view === "definitions" ? "overview" : view);
      if (id) q.set("id", id);
      const r = await fetch(API + "/exports/" + format + "?" + q);
      if (r.status === 401) {
        unauthorized();
        throw new Error("Sesi berakhir. Silakan masuk kembali.");
      }
      if (!r.ok)
        throw new Error(
          "Laporan gagal dibuat. Periksa filter atau coba kembali.",
        );
      // Use the authenticated HTTP attachment URL so embedded browsers can
      // handle downloads too; blob: URLs are not supported by every host.
      await r.arrayBuffer();
      const a = document.createElement("a");
      a.href = API + "/exports/" + format + "?" + q;
      a.download = `uay-rektor-${view}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setExportError((e as Error).message);
    } finally {
      setExporting(false);
    }
  };
  const stats = report.data?.data;
  const title =
    view === "overview"
      ? "Ringkasan universitas"
      : view === "lecturers"
        ? "Aktivitas dosen"
        : view === "activities"
          ? "Riwayat kegiatan"
          : view === "definitions"
            ? "Panduan membaca"
            : view === "lecturer"
              ? "Profil aktivitas dosen"
              : "Pemantauan kelas";
  const visibleLecturers =
    opts?.lecturers.filter(
      (l) => !get("department") || l.department === get("department"),
    ) ?? [];
  const visibleClasses =
    opts?.classes.filter(
      (c) =>
        (get("semester") === "all" || c.semester === get("semester")) &&
        (!get("department") || c.department === get("department")) &&
        (!get("lecturer") || c.instructorIds.includes(get("lecturer"))),
    ) ?? [];
  return (
    <div className="rector-dashboard">
      <nav className="rector-tabs" aria-label="Laporan akademik">
        {(
          [
            { v: "overview", text: "Ringkasan" },
            { v: "lecturers", text: "Dosen & kelas" },
            { v: "activities", text: "Riwayat kegiatan" },
            { v: "definitions", text: "Panduan membaca" },
          ] as { v: View; text: string }[]
        ).map((link) => (
          <button
            key={link.v}
            aria-current={
              view === link.v ||
              (link.v === "lecturers" && ["lecturer", "class"].includes(view))
                ? "page"
                : undefined
            }
            onClick={() => nav(link.v)}
          >
            {link.text}
          </button>
        ))}
      </nav>
      <div className="rector-content">
        <div className="page-heading">
          <div>
            <h1>{title}</h1>
            <p>
              {view === "overview"
                ? "Pantau aktivitas dosen dan penyelesaian penilaian."
                : view === "lecturer"
                  ? "Lihat kelas dan urutan aktivitas dosen selama sesi login."
                  : view === "definitions"
                    ? "Penjelasan singkat untuk memahami laporan akademik."
                    : "Pilih dosen atau kelas untuk melihat rinciannya."}
            </p>
          </div>
          {view !== "definitions" && (
            <div className="export-actions">
              <button
                disabled={!stats || exporting}
                onClick={() => exportReport("csv")}
              >
                <ArrowDownToLine size={15} /> Unduh tabel
              </button>
              <button
                className="primary"
                disabled={!stats || exporting}
                onClick={() => exportReport("pdf")}
              >
                <ArrowDownToLine size={15} />
                {exporting ? "Menyiapkan…" : "Unduh laporan"}
              </button>
            </div>
          )}
        </div>
        {view !== "definitions" && (
          <>
            <div className="data-status">
              <span>
                <Clock3 size={14} /> Data terakhir:{" "}
                <strong>
                  {formatDate(report.data?.meta.snapshotAt ?? null)}
                </strong>
              </span>
              <span>
                Dimuat:{" "}
                {report.data ? formatDate(report.data.meta.responseAt) : "—"} ·
                diperiksa tiap 5 menit
                <button
                  title="Muat ulang data"
                  aria-label="Muat ulang data"
                  onClick={() => setRefreshKey((v) => v + 1)}
                >
                  <RefreshCw size={14} />
                </button>
              </span>
            </div>
            {exportError && (
              <div className="error" role="alert">
                {exportError}
                <button
                  onClick={() => setExportError("")}
                  aria-label="Tutup pesan"
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <LoadState
              loading={filters.loading}
              error={filters.error}
              retry={filters.reload}
            />
            {opts && (
              <section className="filter-panel" aria-label="Filter laporan">
                <div className="filter-top">
                  <span>
                    <CalendarDays size={15} /> Filter laporan
                  </span>
                  <button
                    aria-expanded={moreFilters}
                    onClick={() => setMoreFilters(!moreFilters)}
                  >
                    {moreFilters ? "Tutup filter" : "Ubah filter"}{" "}
                    <ChevronDown size={13} />
                  </button>
                  <button
                    onClick={() => {
                      const next = new URLSearchParams({
                        view: "overview",
                        ...(opts.defaultFilters as Record<string, string>),
                      });
                      history.pushState(history.state, "", "/rector?" + next);
                      setParams(next);
                    }}
                  >
                    Reset filter
                  </button>
                </div>
                {moreFilters && (
                  <div className="filter-fields">
                    <label>
                      Semester
                      <select
                        value={get("semester")}
                        onChange={(e) => editFilter("semester", e.target.value)}
                      >
                        <option value="all">Semua semester</option>
                        {opts.semesters.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className={!moreFilters ? "extra-filter" : ""}>
                      Dari tanggal
                      <input
                        type="date"
                        aria-label="Dari tanggal"
                        value={get("from")}
                        onChange={(e) => editFilter("from", e.target.value)}
                      />
                    </label>
                    <label className={!moreFilters ? "extra-filter" : ""}>
                      Sampai tanggal
                      <input
                        type="date"
                        aria-label="Sampai tanggal"
                        value={get("to")}
                        onChange={(e) => editFilter("to", e.target.value)}
                      />
                    </label>
                    <label>
                      Program studi
                      <select
                        value={get("department")}
                        onChange={(e) =>
                          editFilter("department", e.target.value)
                        }
                      >
                        <option value="">Semua prodi</option>
                        {opts.departments.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <label className={!moreFilters ? "extra-filter" : ""}>
                      Dosen
                      <select
                        value={get("lecturer")}
                        onChange={(e) => editFilter("lecturer", e.target.value)}
                      >
                        <option value="">Semua dosen</option>
                        {visibleLecturers.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={!moreFilters ? "extra-filter" : ""}>
                      Kelas
                      <select
                        value={get("classId")}
                        onChange={(e) => editFilter("classId", e.target.value)}
                      >
                        <option value="">Semua kelas</option>
                        {visibleClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} · {c.id.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <p className="filter-summary">
                  {get("semester") === "all"
                    ? "Semua semester"
                    : get("semester")}{" "}
                  · {get("department") || "Semua prodi"} · Periode:{" "}
                  {shortDay(get("from"))} – {shortDay(get("to"))}{" "}
                  {get("to").slice(0, 4)}
                  {get("lecturer") &&
                    ` · ${opts.lecturers.find((l) => l.id === get("lecturer"))?.name ?? ""}`}
                  {get("classId") &&
                    ` · ${opts.classes.find((c) => c.id === get("classId"))?.title ?? ""}`}
                </p>
              </section>
            )}
            <LoadState
              loading={report.loading}
              error={report.error}
              retry={report.reload}
            />
          </>
        )}
        {stats && view === "overview" && (
          <Overview stats={stats} nav={nav} from={get("from")} to={get("to")} />
        )}
        {opts && view === "lecturers" && (
          <LecturerList
            query={query}
            params={params}
            update={update}
            nav={nav}
            unauthorized={unauthorized}
          />
        )}{" "}
        {opts && view === "lecturer" && (
          <LecturerProfile
            id={id}
            query={query}
            nav={nav}
            update={update}
            unauthorized={unauthorized}
          />
        )}{" "}
        {opts && view === "class" && (
          <ClassProfile
            id={id}
            query={query}
            nav={nav}
            update={update}
            unauthorized={unauthorized}
          />
        )}{" "}
        {opts && view === "activities" && (
          <ActivityPage
            query={query}
            params={params}
            update={update}
            unauthorized={unauthorized}
          />
        )}{" "}
        {view === "definitions" && <Definitions demo={demo} />}
        <footer>
          Universitas Achmad Yani · Dashboard Rektor{" "}
          <span>{demo ? "Data contoh · " : ""}Akses hanya baca</span>
        </footer>
      </div>
    </div>
  );
}
function Overview({
  stats: s,
  nav,
  from,
  to,
}: {
  stats: Summary;
  nav: (v: View, id?: string, sessionId?: string) => void;
  from: string;
  to: string;
}) {
  const max = Math.max(1, ...s.daily.map((d) => d.academic));
  return (
    <>
      <div className="overview-intro">
        <span>
          {s.lecturerCount} dosen · {s.classCount} kelas
        </span>
        <button className="text-link" onClick={() => nav("lecturers")}>
          Lihat dosen & kelas <ArrowRight size={16} />
        </button>
      </div>
      <div className="metrics rector-metrics">
        <Metric
          label="Dosen beraktivitas akademik"
          value={
            <>
              {s.academicallyActiveLecturers}
              <em> / {s.lecturerCount} dosen</em>
            </>
          }
          note="Membuat materi, tugas, menilai, atau menerbitkan nilai dalam periode."
          icon={<Users size={21} />}
        />
        <Metric
          label="Pekerjaan mahasiswa belum dinilai"
          value={n(s.grading.pending)}
          note={
            s.grading.oldestPendingDays === null
              ? "Belum ada pekerjaan menunggu penilaian."
              : `Antrean tertua ${s.grading.oldestPendingDays} hari · kondisi kelas saat ini.`
          }
          icon={<FileCheck2 size={21} />}
        />
        <Metric
          label="Nilai sudah dibagikan"
          value={
            s.grading.percentage === null
              ? "Belum ada data"
              : `${s.grading.percentage}%`
          }
          note={`${n(s.grading.published)} dari ${n(s.grading.total)} pekerjaan penilaian manual dan nilai akhir.`}
          icon={<CheckCircle2 size={21} />}
        />
      </div>
      <section className="panel prodi-panel">
        <div className="section-title">
          <div>
            <h3>Bagaimana kondisi setiap program studi?</h3>
            <p>
              Aktivitas selama periode dan pekerjaan kelas yang belum dinilai.
            </p>
          </div>
          <Building2 size={23} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Program studi</th>
                <th>Dosen / kelas</th>
                <th>Aktivitas akademik</th>
                <th>Belum dinilai</th>
              </tr>
            </thead>
            <tbody>
              {s.departments.map((d) => (
                <tr key={d.department}>
                  <td>
                    <strong>{d.department}</strong>
                  </td>
                  <td>
                    {d.lecturers} dosen · {d.classes} kelas
                  </td>
                  <td>{n(d.academicActions)} kegiatan</td>
                  <td>
                    <Badge tone={d.pending ? "amber" : "green"}>
                      {d.pending ? `${d.pending} pekerjaan` : "Selesai dinilai"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="text-link" onClick={() => nav("lecturers")}>
          Telusuri aktivitas dosen <ArrowRight size={16} />
        </button>
      </section>
      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="section-title">
            <div>
              <h3>Aktivitas akademik harian</h3>
              <p>
                {n(s.activity.academicActions)} kegiatan dosen selama periode.
              </p>
            </div>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label="Jumlah kegiatan akademik dosen per hari"
          >
            <div className="chart-scale">
              <span>{max}</span>
              <span>{Math.round(max / 2)}</span>
              <span>0</span>
            </div>
            <div className="bars">
              {s.daily.map((d, i) => (
                <div
                  className="bar-column"
                  key={d.date}
                  title={`${shortDay(d.date)}: ${d.academic} kegiatan akademik`}
                >
                  <div className="bar-stack">
                    <span
                      className="bar academic"
                      style={{ height: `${(d.academic / max) * 100}%` }}
                    />
                  </div>
                  <small>
                    {i === 0 ||
                    i === s.daily.length - 1 ||
                    (i % 7 === 0 && s.daily.length - 1 - i >= 5)
                      ? shortDay(d.date)
                      : ""}
                  </small>
                </div>
              ))}
            </div>
          </div>
          <p className="quiet-note">
            Masuk dan membuka kelas belum berarti melakukan kegiatan
            pembelajaran.
          </p>
        </section>
        <Progress data={s.grading} />
      </div>
      <SessionChart
        sessions={s.sessions}
        from={from}
        to={to}
        onLecturer={(id, sessionId) => nav("lecturer", id, sessionId)}
      />
      <details className="secondary-detail panel">
        <summary>Informasi pembelajaran lainnya</summary>
        <div className="supporting-stats">
          <span>
            <strong>{s.loggedInLecturers}</strong> dosen login
          </span>
          <span>
            <strong>{s.materialCount}</strong> materi tersedia
          </span>
          <span>
            <strong>{s.assignmentCount}</strong> tugas
          </span>
          <span>
            <strong>{s.quizCount}</strong> kuis
          </span>
        </div>
        <p>
          Presensi, forum diskusi, dan kehadiran telekonferensi: belum tersedia.
        </p>
        <button className="text-link" onClick={() => nav("definitions")}>
          Panduan membaca indikator <ArrowRight size={15} />
        </button>
      </details>
    </>
  );
}
function LecturerList({
  query,
  params,
  update,
  nav,
  unauthorized,
}: {
  query: URLSearchParams;
  params: URLSearchParams;
  update: (v: Record<string, string | null>) => void;
  nav: (v: View, id?: string) => void;
  unauthorized: () => void;
}) {
  const q = new URLSearchParams(query);
  for (const k of ["page", "sort", "order"])
    if (params.get(k)) q.set(k, params.get(k)!);
  const report = useReport<Page<LecturerRow>>("/lecturers?" + q, unauthorized);
  const data = report.data?.data;
  const [search, setSearch] = useState(query.get("search") ?? "");
  useEffect(() => setSearch(query.get("search") ?? ""), [query.toString()]);
  const sort = (key: string) =>
    update({
      sort: key,
      order:
        params.get("sort") === key && params.get("order") !== "desc"
          ? "desc"
          : "asc",
      page: null,
    });
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <h3>
            Dosen & kelas <Badge>{data?.total ?? "…"} dosen</Badge>
          </h3>
          <p>Pilih nama dosen untuk melihat sesi dan rincian aktivitas.</p>
        </div>
        <form
          className="search-box"
          onSubmit={(e) => {
            e.preventDefault();
            update({ search, page: null });
          }}
        >
          <Search size={17} />
          <input
            aria-label="Cari nama atau identitas dosen"
            placeholder="Cari nama dosen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Cari</button>
        </form>
      </div>
      <LoadState
        loading={report.loading}
        error={report.error}
        retry={report.reload}
      />
      {data &&
        (data.items.length ? (
          <div className="table-wrap">
            <table className="rector-lecturer-table">
              <thead>
                <tr>
                  {[
                    ["name", "Dosen"],
                    ["lastAcademicAt", "Aktivitas terakhir"],
                    ["materialActions", "Materi & evaluasi"],
                    ["gradingActions", "Penilaian"],
                    ["pending", "Belum dinilai di kelas"],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      aria-sort={
                        params.get("sort") === key
                          ? params.get("order") === "desc"
                            ? "descending"
                            : "ascending"
                          : "none"
                      }
                    >
                      <button onClick={() => sort(key)}>
                        {label}
                        <ChevronDown size={13} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <button
                        className="name-link"
                        onClick={() => nav("lecturer", l.id)}
                      >
                        <span className="avatar small">
                          {l.name.replace("Dr. ", "").slice(0, 1)}
                        </span>
                        <span>
                          <strong>{l.name}</strong>
                          <small>
                            {l.department} · {l.classCount} kelas
                          </small>
                        </span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                    <td>
                      {l.lastAcademicAt ? (
                        <>
                          {formatDate(l.lastAcademicAt)}
                          <small>
                            {l.academicActions} kegiatan · {l.activeDays} hari
                            aktif
                          </small>
                        </>
                      ) : (
                        <>
                          <Badge tone="neutral">
                            {l.classCount === 0
                              ? "Belum memiliki kelas"
                              : l.logins
                                ? "Hanya login"
                                : "Belum ada aktivitas"}
                          </Badge>
                          {l.lastLoginAt && (
                            <small>Login: {formatDate(l.lastLoginAt)}</small>
                          )}
                        </>
                      )}
                    </td>
                    <td>
                      {l.materialObjects} materi · {l.assessmentObjects} tugas,
                      kuis & bank soal
                      <small>
                        {l.materialActions + l.assessmentActions} kegiatan
                        tercatat
                      </small>
                    </td>
                    <td>
                      {l.gradingActions} kegiatan penilaian
                      <small>{l.publicationActions} penerbitan nilai</small>
                    </td>
                    <td>
                      <Badge tone={l.pending ? "amber" : "green"}>
                        {l.pending
                          ? `${l.pending} pekerjaan`
                          : l.classCount
                            ? "Tidak ada antrean"
                            : "—"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        ))}
      {data && (
        <div className="mobile-lecturer-list">
          <div className="mobile-list-sort">
            <label>
              Urutkan menurut
              <select
                value={params.get("sort") ?? "name"}
                onChange={(e) =>
                  update({ sort: e.target.value, order: "asc", page: null })
                }
              >
                <option value="name">Nama dosen</option>
                <option value="lastAcademicAt">Aktivitas terakhir</option>
                <option value="gradingActions">Penilaian</option>
                <option value="pending">
                  Pekerjaan mahasiswa belum dinilai
                </option>
              </select>
            </label>
            <button
              aria-label="Ubah arah urutan"
              onClick={() =>
                update({
                  order: params.get("order") === "desc" ? "asc" : "desc",
                  page: null,
                })
              }
            >
              {params.get("order") === "desc" ? "Menurun" : "Menaik"}
              <ChevronDown size={14} />
            </button>
          </div>
          {data.items.map((l) => (
            <button key={l.id} onClick={() => nav("lecturer", l.id)}>
              <span className="mobile-lecturer-name">
                <strong>{l.name}</strong>
                <ChevronRight size={17} />
              </span>
              <small>
                {l.department} · {l.classCount} kelas
              </small>
              <span>
                {l.lastAcademicAt
                  ? `${l.academicActions} aktivitas akademik · ${l.activeDays} hari aktif`
                  : l.classCount === 0
                    ? "Belum memiliki kelas"
                    : l.logins
                      ? "Hanya login, belum beraktivitas akademik"
                      : "Belum ada aktivitas tercatat"}
              </span>
              <span className={`badge ${l.pending ? "amber" : "neutral"}`}>
                {l.pending
                  ? `${l.pending} pekerjaan kelas belum dinilai`
                  : "Tidak ada antrean penilaian"}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="quiet-note">
        Antrean pada kelas bersama dapat muncul pada setiap pengampu.
      </p>
      {data && (
        <Pagination
          page={data.page}
          total={data.total}
          pageSize={data.pageSize}
          setPage={(p) => update({ page: String(p) })}
        />
      )}
    </section>
  );
}
function LecturerProfile({
  id,
  query,
  nav,
  update,
  unauthorized,
}: {
  id: string;
  query: URLSearchParams;
  nav: (v: View, id?: string) => void;
  update: (v: Record<string, string | null>) => void;
  unauthorized: () => void;
}) {
  const report = useReport<LecturerDetail>(
    "/lecturers/" + encodeURIComponent(id) + "?" + query,
    unauthorized,
  );
  const d = report.data?.data;
  return (
    <>
      <button className="text-link back" onClick={() => nav("lecturers")}>
        <ArrowLeft size={16} />
        Daftar dosen
      </button>
      <LoadState
        loading={report.loading}
        error={report.error}
        retry={report.reload}
      />
      {d && (
        <>
          <section className="profile-heading">
            <div className="avatar large">
              {d.lecturer.name.replace("Dr. ", "").slice(0, 1)}
            </div>
            <div>
              <span className="badge blue">{d.lecturer.department}</span>
              <h2>{d.lecturer.name}</h2>
              <p>
                {d.lecturer.classCount} kelas diampu · {d.lecturer.activeDays}{" "}
                hari beraktivitas akademik
              </p>
            </div>
            <div className="last-activity">
              <small>Aktivitas akademik terakhir</small>
              <strong>{formatDate(d.lecturer.lastAcademicAt)}</strong>
            </div>
          </section>
          <div className="profile-brief">
            <span>
              <strong>{d.lecturer.materialObjects}</strong> materi ·{" "}
              {d.lecturer.materialActions} kegiatan
            </span>
            <span>
              <strong>{d.lecturer.assessmentObjects}</strong> tugas, kuis & bank
              soal · {d.lecturer.assessmentActions} kegiatan
            </span>
            <span>
              <strong>{d.lecturer.gradingActions}</strong> penilaian ·{" "}
              {d.lecturer.publicationActions} penerbitan nilai
            </span>
          </div>
          <ActivityWaterfall
            sessions={d.sessions}
            events={d.activities}
            classes={d.classes.map((c) => c.class)}
            selectedSession={query.get("_session") ?? ""}
            onSession={(session) => update({ session })}
            onClass={(id) => nav("class", id)}
          />
          <section className="panel">
            <div className="section-title">
              <div>
                <h3>Kelas yang diampu</h3>
                <p>Kondisi penilaian pada data terakhir.</p>
              </div>
              <GraduationCap size={23} />
            </div>
            {d.classes.length ? (
              <div className="class-cards">
                {d.classes.map((c) => (
                  <button
                    className="class-card"
                    key={c.class.id}
                    onClick={() => nav("class", c.class.id)}
                  >
                    <div className="split">
                      <span className="course-code">{c.class.courseCode}</span>
                      <Badge
                        tone={c.class.status === "ARSIP" ? "neutral" : "blue"}
                      >
                        {c.class.status === "ARSIP"
                          ? "Arsip"
                          : c.class.instructorIds.length > 1
                            ? "Kelas bersama"
                            : "Aktif"}
                      </Badge>
                    </div>
                    <h3>{c.class.title}</h3>
                    <p>{c.class.semester}</p>
                    <div className="class-stat">
                      <span>
                        {c.contribution.academicActions} aktivitas dosen ini
                      </span>
                      <span>
                        <strong>{c.grading.pending}</strong> pekerjaan kelas
                        belum dinilai
                      </span>
                    </div>
                    <div className="class-footer">
                      <span>
                        Nilai terbit:{" "}
                        {c.grading.percentage === null
                          ? "Belum ada data"
                          : `${c.grading.percentage}%`}
                      </span>
                      <span>
                        Buka kelas
                        <ChevronRight size={15} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <Empty>
                Dosen ini belum memiliki kelas dalam cakupan filter.
              </Empty>
            )}
            <p className="quiet-note">
              Pada kelas bersama, antrean adalah pekerjaan kelas, bukan
              seluruhnya pekerjaan dosen ini.
            </p>
          </section>
          <details className="secondary-detail panel">
            <summary>Rekap aktivitas lengkap dalam periode</summary>
            <ActivityCards m={d.lecturer} />
            <p>
              Login terakhir: {formatDate(d.lecturer.lastLoginAt)} ·{" "}
              {d.lecturer.correctionActions} koreksi nilai.
            </p>
          </details>
        </>
      )}
    </>
  );
}
function ClassProfile({
  id,
  query,
  nav,
  update,
  unauthorized,
}: {
  id: string;
  query: URLSearchParams;
  nav: (v: View, id?: string) => void;
  update: (v: Record<string, string | null>) => void;
  unauthorized: () => void;
}) {
  const report = useReport<ClassDetail>(
    "/classes/" + encodeURIComponent(id) + "?" + query,
    unauthorized,
  );
  const d = report.data?.data;
  const itemKind: Record<string, string> = {
    PERTEMUAN: "Pertemuan",
    MATERI: "Materi",
    BANK_SOAL: "Bank soal",
    TUGAS: "Tugas",
    KUIS: "Kuis",
    PENGUMUMAN: "Pengumuman",
  };
  return (
    <>
      <button className="text-link back" onClick={() => nav("lecturers")}>
        <ArrowLeft size={16} />
        Dosen & kelas
      </button>
      <LoadState
        loading={report.loading}
        error={report.error}
        retry={report.reload}
      />
      {d && (
        <>
          <section className="profile-heading">
            <div className="class-icon">
              <BookOpen size={27} />
            </div>
            <div>
              <span className="badge blue">
                {d.class.courseCode} ·{" "}
                {d.class.status === "ARSIP" ? "Arsip" : "Aktif"}
              </span>
              <h2>{d.class.title}</h2>
              <p>
                {d.class.department} · {d.class.semester}
              </p>
              <small>
                Pengampu: {d.instructors.map((l) => l.name).join("; ")}
              </small>
            </div>
          </section>
          <Progress data={d.grading} />
          <section className="panel">
            <div className="section-title">
              <div>
                <h3>Pekerjaan penilaian di kelas ini</h3>
                <p>
                  Kiriman terbaru yang berlaku. Jumlah disajikan tanpa data
                  pribadi mahasiswa.
                </p>
              </div>
            </div>
            {d.class.grading.length ? (
              <div className="table-wrap">
                <table className="class-work-table">
                  <thead>
                    <tr>
                      <th>Pekerjaan</th>
                      <th>Total</th>
                      <th>Sudah dinilai</th>
                      <th>Belum dinilai</th>
                      <th>Nilai terbit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.class.grading
                      .filter((w) => w.current)
                      .map((w) => (
                        <tr key={w.id}>
                          <td>
                            <strong>{w.title}</strong>
                            <small>
                              {w.kind === "KUIS_OTOMATIS"
                                ? "Dinilai otomatis · terpisah"
                                : "Penilaian manual"}
                            </small>
                          </td>
                          <td>{w.total}</td>
                          <td>{w.graded}</td>
                          <td>
                            <Badge
                              tone={w.total > w.graded ? "amber" : "green"}
                            >
                              {w.total - w.graded}
                            </Badge>
                          </td>
                          <td>{w.published}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>Belum ada pekerjaan penilaian pada kelas ini.</Empty>
            )}
            <details className="secondary-detail">
              <summary>Waktu penilaian dan penerbitan</summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Pekerjaan</th>
                      <th>Menunggu sejak</th>
                      <th>Terakhir dinilai</th>
                      <th>Terakhir diterbitkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.class.grading
                      .filter((w) => w.current)
                      .map((w) => (
                        <tr key={w.id}>
                          <td>{w.title}</td>
                          <td>{formatDate(w.pendingSince)}</td>
                          <td>{formatDate(w.lastGradedAt)}</td>
                          <td>{formatDate(w.lastPublishedAt)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <section className="panel">
            <div className="section-title">
              <div>
                <h3>Aktivitas pengampu</h3>
                <p>Kontribusi dicatat sesuai dosen yang melakukan kegiatan.</p>
              </div>
            </div>
            <div className="instructor-cards">
              {d.contributions.map((c) => (
                <button
                  key={c.lecturer.id}
                  onClick={() => nav("lecturer", c.lecturer.id)}
                >
                  <strong>{c.lecturer.name}</strong>
                  <span>
                    {c.metrics.academicActions} aktivitas akademik ·{" "}
                    {c.metrics.gradingActions} penilaian ·{" "}
                    {c.metrics.publicationActions} penerbitan nilai
                  </span>
                  <span>
                    Lihat sesi & aktivitas
                    <ChevronRight size={15} />
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="panel">
            <div className="section-title">
              <div>
                <h3>Materi dan kegiatan pembelajaran</h3>
                <p>
                  {
                    d.class.items.filter(
                      (i) => i.visible && i.status === "TERBIT",
                    ).length
                  }{" "}
                  konten tersedia ·{" "}
                  {
                    d.class.items.filter(
                      (i) => !i.visible || i.status === "DRAF",
                    ).length
                  }{" "}
                  konten draf / tersembunyi
                </p>
              </div>
              <BookOpen size={23} />
            </div>
            <details className="secondary-detail">
              <summary>
                Lihat pertemuan, materi, tugas, kuis, dan pengumuman
              </summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Konten</th>
                      <th>Jenis</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.class.items.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <strong>{i.title}</strong>
                          {i.questionCount && (
                            <small>{i.questionCount} soal</small>
                          )}
                        </td>
                        <td>{itemKind[i.kind]}</td>
                        <td>
                          <Badge
                            tone={
                              i.visible && i.status === "TERBIT"
                                ? "green"
                                : "neutral"
                            }
                          >
                            {!i.visible
                              ? "Tersembunyi"
                              : i.status === "DRAF"
                                ? "Draf"
                                : "Tersedia"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <details className="secondary-detail panel">
            <summary>
              Riwayat aktivitas dan koreksi nilai ({d.activities.length})
            </summary>
            <Timeline
              events={d.activities}
              category={query.get("category") ?? ""}
              actor={query.get("actorKind") ?? ""}
              onFilter={update}
            />
          </details>
        </>
      )}
    </>
  );
}
function ActivityPage({
  query,
  params,
  update,
  unauthorized,
}: {
  query: URLSearchParams;
  params: URLSearchParams;
  update: (v: Record<string, string | null>) => void;
  unauthorized: () => void;
}) {
  const q = new URLSearchParams(query);
  for (const k of ["page", "category", "actorKind"])
    if (params.get(k)) q.set(k, params.get(k)!);
  const report = useReport<Page<Activity>>("/activities?" + q, unauthorized);
  const d = report.data?.data;
  return (
    <section className="panel">
      <div className="section-title">
        <div>
          <span className="eyebrow">BUKTI AKTIVITAS DALAM PERIODE</span>
          <h3>Dosen, admin, dan sistem</h3>
        </div>
        <Badge>{d?.total ?? "…"} kejadian</Badge>
      </div>
      <div className="timeline-filters">
        <label>
          Kategori
          <select
            value={params.get("category") ?? ""}
            onChange={(e) => update({ category: e.target.value, page: null })}
          >
            <option value="">Semua kategori</option>
            {[
              "LOGIN",
              "LOGOUT",
              "AKSES",
              "MATERI",
              "ASESMEN",
              "PENILAIAN",
              "PUBLIKASI",
              "KOREKSI",
              "PENGUMUMAN",
              "KELAS",
            ].map((c) => (
              <option key={c} value={c}>
                {categoryLabel[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pelaku
          <select
            value={params.get("actorKind") ?? ""}
            onChange={(e) => update({ actorKind: e.target.value, page: null })}
          >
            <option value="">Semua pelaku</option>
            <option value="DOSEN">Dosen</option>
            <option value="ADMIN">Admin akademik</option>
            <option value="SISTEM">Proses otomatis</option>
          </select>
        </label>
      </div>
      <LoadState
        loading={report.loading}
        error={report.error}
        retry={report.reload}
      />
      {d &&
        (d.items.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pelaku</th>
                  <th>Kegiatan</th>
                  <th>Objek</th>
                  <th>Konteks</th>
                </tr>
              </thead>
              <tbody>
                {d.items.map((a) => (
                  <tr key={a.id}>
                    <td className="date-cell">{formatDate(a.at)}</td>
                    <td>
                      <strong>{a.actorName}</strong>
                      <Badge
                        tone={
                          a.actorKind === "DOSEN"
                            ? "blue"
                            : a.actorKind === "SISTEM"
                              ? "green"
                              : "neutral"
                        }
                      >
                        {a.actorKind === "DOSEN"
                          ? "Dosen"
                          : a.actorKind === "ADMIN"
                            ? "Admin akademik"
                            : "Proses otomatis"}
                      </Badge>
                    </td>
                    <td>
                      {a.action}
                      <small>{categoryLabel[a.category]}</small>
                    </td>
                    <td>{a.objectName}</td>
                    <td>
                      {a.classId
                        ? a.classId.toUpperCase()
                        : "Tanpa konteks kelas"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        ))}
      {d && (
        <Pagination
          page={d.page}
          total={d.total}
          pageSize={d.pageSize}
          setPage={(p) => update({ page: String(p) })}
        />
      )}
    </section>
  );
}
function Definitions({ demo }: { demo: boolean }) {
  return (
    <section className="panel definitions">
      <span className="eyebrow">MEMAHAMI LAPORAN</span>
      <h2>Cara membaca dashboard</h2>
      <p>
        Dashboard menyajikan bukti aktivitas untuk mendukung pertimbangan
        rektor. Tidak ada skor, peringkat, atau penilaian otomatis atas kualitas
        kerja dosen.
      </p>
      {INDICATOR_DEFINITIONS.slice(0, 4).map((text, i) => (
        <div className="definition" key={text}>
          <span>{String(i + 1).padStart(2, "0")}</span>
          <p>{text}</p>
        </div>
      ))}
      <details className="secondary-detail">
        <summary>Penjelasan perhitungan lebih lengkap</summary>
        {INDICATOR_DEFINITIONS.slice(4).map((text) => (
          <p key={text}>{text}</p>
        ))}
      </details>
      <div className="unavailable">
        <strong>Sumber yang belum tersedia</strong>
        <p>
          Presensi, forum diskusi, dan kehadiran telekonferensi belum diukur.
          Identitas mahasiswa, nilai individual, jawaban, dan isi umpan balik
          mahasiswa tidak ditampilkan.
        </p>
      </div>
      <p className="footnote">
        {demo ? "Laporan ini memakai data contoh untuk presentasi. " : ""}
        Tanggal data terakhir menunjukkan kapan informasi laporan dicatat.
        Menekan muat ulang tidak menambah kegiatan dosen.
      </p>
    </section>
  );
}
