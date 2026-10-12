import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  User,
  Shield,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { api, Loading, Notice, Empty, Pagination, date, t } from "../../lib";
import { formatDepartmentDisplay } from "../../../../../packages/shared/src/departments";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  DEPARTMENT_ADMIN: "Admin Program Studi",
  INSTRUCTOR: "Dosen Pengampu",
  ASSISTANT: "Asisten Dosen",
  STUDENT: "Mahasiswa",
  RECTOR: "Rektor / Pimpinan",
};

const ENTITY_LABELS: Record<string, string> = {
  DEPARTMENT: "Program Studi",
  Department: "Program Studi",
  USER_AUTHORITY: "Otoritas Pengguna",
  USER: "Akun Pengguna",
  User: "Akun Pengguna",
  DEPARTMENT_SCOPE_SYNC: "Sinkronisasi SIAKAD",
  GRADE_SCALE: "Bobot Nilai / Skala Mutu",
  AcademicSettings: "Kebijakan Akademik",
  COURSE: "Mata Kuliah",
  Course: "Mata Kuliah",
  CLASS: "Kelas Kuliah",
  CourseClass: "Kelas Kuliah",
  SECTION: "Pertemuan",
  ClassSection: "Pertemuan",
  RESOURCE: "Materi Pembelajaran",
  ResourceItem: "Materi Pembelajaran",
  ASSIGNMENT: "Tugas",
  Assignment: "Tugas",
  SUBMISSION: "Pengumpulan Tugas",
  AssignmentSubmission: "Pengumpulan Tugas",
  QUIZ: "Kuis",
  Quiz: "Kuis",
  ATTEMPT: "Pengerjaan Kuis",
  QuizAttempt: "Pengerjaan Kuis",
  QUESTION_BANK: "Bank Soal",
  QuestionBank: "Bank Soal",
  QUESTION: "Butir Soal",
  Question: "Butir Soal",
  ANNOUNCEMENT: "Pengumuman",
  Announcement: "Pengumuman",
  ENROLLMENT: "Kepesertaan",
  Enrollment: "Kepesertaan",
  FINAL_GRADE: "Nilai Akhir",
  FinalGrade: "Nilai Akhir",
  ATTENDANCE_SESSION: "Sesi Presensi",
  FILE: "Berkas",
  FileRecord: "Berkas",
};

const ACTION_DESCRIPTIONS: Record<
  string,
  { label: string; tone: "primary" | "success" | "warning" | "info" }
> = {
  CREATE_DEPARTMENT: { label: "Penambahan Program Studi", tone: "success" },
  UPDATE_DEPARTMENT: { label: "Pembaruan Program Studi", tone: "info" },
  DELETE_DEPARTMENT: { label: "Penghapusan Program Studi", tone: "warning" },
  DEACTIVATE_DEPARTMENT: { label: "Penonaktifan Program Studi", tone: "warning" },

  ASSIGN_AUTHORITY: { label: "Penetapan Wewenang Pengguna", tone: "success" },
  UPDATE_AUTHORITY: { label: "Pembaruan Wewenang Pengguna", tone: "info" },
  SYNC_SIAKAD: { label: "Sinkronisasi Data SIAKAD", tone: "info" },
  SYNC_SSO_USERS: { label: "Sinkronisasi Akun SSO", tone: "info" },

  UPDATE_GRADE_SCALE: { label: "Pembaruan Bobot Nilai & Huruf Mutu", tone: "warning" },
  UPDATE_WEIGHTS: { label: "Pembaruan Bobot Nilai", tone: "warning" },
  CORRECT_FINAL_GRADE: { label: "Koreksi Nilai Akhir", tone: "warning" },
  PUBLISH_GRADES: { label: "Publikasi Nilai Akhir", tone: "success" },
  PUBLISH_GRADEBOOK: { label: "Publikasi Rekap Nilai", tone: "success" },

  CREATE_CLASS: { label: "Pembuatan Kelas Baru", tone: "success" },
  UPDATE_CLASS: { label: "Pembaruan Data Kelas", tone: "info" },
  ARCHIVE_CLASS: { label: "Pengarsipan Kelas", tone: "warning" },
  UNARCHIVE_CLASS: { label: "Pembukaan Kembali Kelas", tone: "success" },
  CLONE_CLASS: { label: "Duplikasi Kelas", tone: "info" },

  CREATE_COURSE: { label: "Pembuatan Mata Kuliah", tone: "success" },
  UPDATE_COURSE: { label: "Pembaruan Mata Kuliah", tone: "info" },
  DELETE_COURSE: { label: "Penghapusan Mata Kuliah", tone: "warning" },

  ENROLL: { label: "Pendaftaran Mahasiswa", tone: "info" },
  UPDATE_ENROLLMENT: { label: "Pembaruan Kepesertaan", tone: "warning" },
  ASSIGN_INSTRUCTORS: { label: "Penetapan Dosen Pengampu", tone: "info" },

  CREATE_RESOURCE: { label: "Penambahan Materi", tone: "success" },
  UPDATE_RESOURCE: { label: "Pembaruan Materi", tone: "info" },
  DELETE_RESOURCE: { label: "Penghapusan Materi", tone: "warning" },

  CREATE_ASSIGNMENT: { label: "Pembuatan Tugas", tone: "success" },
  UPDATE_ASSIGNMENT: { label: "Pembaruan Tugas", tone: "info" },
  GRADE_SUBMISSION: { label: "Penilaian Tugas", tone: "success" },

  CREATE_QUIZ: { label: "Pembuatan Kuis", tone: "success" },
  UPDATE_QUIZ: { label: "Pembaruan Kuis", tone: "info" },
  CREATE_QUESTION_BANK: { label: "Pembuatan Bank Soal", tone: "info" },
  CREATE_QUESTION: { label: "Penambahan Butir Soal", tone: "info" },
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nama",
  title: "Judul",
  code: "Kode",
  faculty: "Fakultas",
  role: "Peran / Hak Akses",
  departmentScopes: "Cakupan Program Studi",
  status: "Status",
  isActive: "Status Aktif",
  isPublished: "Status Terbit",
  isVisible: "Visibilitas",
  academicYear: "Tahun Akademik",
  credits: "Jumlah SKS",
  departmentCode: "Kode Program Studi",
  description: "Deskripsi",
  bands: "Skala Huruf Mutu",
  passingGrade: "Nilai Kelulusan Minimum",
  minAttendancePercentage: "Batas Minimum Kehadiran",
  weights: "Bobot Komponen Penilaian",
  score: "Nilai",
  finalScore: "Nilai Akhir",
  gradeLetter: "Nilai Huruf",
  gradePoint: "Indeks Mutu",
  deadline: "Tenggat Waktu",
};

function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") {
    if (key === "isActive") return val ? "Aktif" : "Nonaktif";
    if (key === "isPublished") return val ? "Terbit" : "Draf";
    if (key === "isVisible") return val ? "Tampil" : "Tersembunyi";
    return val ? "Ya" : "Tidak";
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return "Kosong";
    if (key === "departmentScopes") {
      return val.map((c) => formatDepartmentDisplay(c)).join(", ");
    }
    if (key === "bands") {
      return `${val.length} batas nilai huruf`;
    }
    return val.map(String).join(", ");
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      return date(val);
    }
    if (ROLE_LABELS[val]) return ROLE_LABELS[val];
    if (val === "ACTIVE") return "Aktif";
    if (val === "DISABLED") return "Dinonaktifkan";
    if (val === "DRAFT") return "Draf";
    if (val === "PUBLISHED") return "Terbit";
    if (val === "ARCHIVED") return "Diarsipkan";
  }
  return String(val);
}

function getAuditAction(entry: any) {
  const combined = `${entry.action}_${entry.entity}`;
  if (ACTION_DESCRIPTIONS[combined]) return ACTION_DESCRIPTIONS[combined];
  if (ACTION_DESCRIPTIONS[entry.action]) return ACTION_DESCRIPTIONS[entry.action];

  const entityLabel = ENTITY_LABELS[entry.entity] || entry.entity;
  if (entry.action === "CREATE")
    return { label: `Pembuatan ${entityLabel}`, tone: "success" as const };
  if (entry.action === "UPDATE")
    return { label: `Pembaruan ${entityLabel}`, tone: "info" as const };
  if (entry.action === "DELETE")
    return { label: `Penghapusan ${entityLabel}`, tone: "warning" as const };
  return { label: `Aktivitas ${entityLabel}`, tone: "info" as const };
}

export function AuditLogView({
  user,
  departments = [],
}: {
  user: any;
  departments?: Array<{ id: string; code: string; name: string }>;
}) {
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (debouncedSearch) params.set("q", debouncedSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (entityFilter !== "ALL") params.set("entity", entityFilter);
      if (isSuperAdmin && departmentFilter !== "ALL") {
        params.set("department", departmentFilter);
      }
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await api<{
        data: any[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      }>(`/system/audit-logs?${params.toString()}`);

      setLogs(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    debouncedSearch,
    roleFilter,
    actionFilter,
    entityFilter,
    departmentFilter,
    dateFrom,
    dateTo,
    isSuperAdmin,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleReset = () => {
    setSearch("");
    setDebouncedSearch("");
    setRoleFilter("ALL");
    setActionFilter("ALL");
    setEntityFilter("ALL");
    setDepartmentFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleExportCsv = () => {
    if (!logs.length) return;
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "zona waktu perangkat";
    const headers = [
      "ID",
      `Waktu (${timeZone})`,
      "Aktor",
      "Peran Aktor",
      "Identitas / NIM / NIDN",
      "Aksi",
      "Entitas",
      "Target Objek",
      "Catatan Alasan",
      "Alamat IP",
    ];

    const rows = logs.map((l) => [
      l.id,
      date(l.createdAt),
      l.user?.name || "Sistem / Anonim",
      ROLE_LABELS[l.actorRole] || l.actorRole,
      l.user?.identifierValue || "—",
      l.action,
      ENTITY_LABELS[l.entity] || l.entity,
      l.objectTitle || l.entityId,
      (l.reason || "").replace(/"/g, '""'),
      l.ipAddress || "—",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekaman-jejak-aktivitas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="audit-governance-view">
      <div className="audit-view-header">
        <div>
          <h2>
            <History size={22} style={{ verticalAlign: "middle", marginRight: 8 }} />
            Rekaman Jejak Aktivitas (Audit Log)
          </h2>
          <p className="subtext">
            {isSuperAdmin
              ? "Transparansi dan jejak audit menyeluruh terhadap seluruh aktivitas tata kelola sistem, perubahan wewenang, dan operasional akademik."
              : `Jejak audit operasional akademik terlingkup program studi: ${
                  user.departmentScopes && user.departmentScopes.length > 0
                    ? user.departmentScopes
                        .map((c: string) => formatDepartmentDisplay(c))
                        .join(", ")
                    : "Semua cakupan wewenang Anda"
                }.`}
          </p>
        </div>
        <div className="audit-header-actions">
          <button
            type="button"
            className="secondary"
            onClick={fetchLogs}
            disabled={loading}
            title="Muat ulang data log"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Muat Ulang
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleExportCsv}
            disabled={!logs.length}
            title="Unduh rekaman jejak sebagai berkas CSV"
          >
            <Download size={16} />
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="audit-filters-card card">
        <div className="audit-filters-grid">
          <div className="filter-item search-box">
            <label htmlFor="audit-search">Pencarian</label>
            <div className="search-input-wrapper">
              <Search size={16} aria-hidden="true" />
              <input
                id="audit-search"
                type="text"
                placeholder="Cari aktor, NIM/NIDN, aksi, entitas..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          <div className="filter-item">
            <label htmlFor="audit-role">Peran Aktor</label>
            <select
              id="audit-role"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Peran</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="DEPARTMENT_ADMIN">Admin Program Studi</option>
              <option value="INSTRUCTOR">Dosen Pengampu</option>
              <option value="ASSISTANT">Asisten Dosen</option>
              <option value="STUDENT">Mahasiswa</option>
            </select>
          </div>

          {isSuperAdmin && departments.length > 0 && (
            <div className="filter-item">
              <label htmlFor="audit-dept">Program Studi</label>
              <select
                id="audit-dept"
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Program Studi</option>
                {departments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {formatDepartmentDisplay(d.code)} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-item">
            <label htmlFor="audit-date-from">Dari Tanggal</label>
            <input
              id="audit-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="audit-date-to">Sampai Tanggal</label>
            <input
              id="audit-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="filter-item filter-reset-box">
            <label>&nbsp;</label>
            <button
              type="button"
              className="secondary"
              onClick={handleReset}
              title="Bersihkan semua filter pencarian"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* ERROR NOTICE */}
      {error && <Notice error={error} />}

      {/* LOG ENTRIES */}
      {loading && !logs.length ? (
        <Loading />
      ) : !logs.length ? (
        <Empty>
          <History size={40} style={{ opacity: 0.5, marginBottom: 12 }} />
          <h3>Tidak ada rekaman jejak aktivitas</h3>
          <p>
            {debouncedSearch || roleFilter !== "ALL" || dateFrom || dateTo
              ? "Tidak ditemukan data log yang sesuai dengan filter yang dipilih."
              : "Belum ada catatan aktivitas pada sistem."}
          </p>
          {(debouncedSearch || roleFilter !== "ALL" || dateFrom || dateTo) && (
            <button type="button" className="secondary" onClick={handleReset}>
              Bersihkan Filter
            </button>
          )}
        </Empty>
      ) : (
        <div className="audit-entries-list">
          {logs.map((entry) => {
            const actionInfo = getAuditAction(entry);
            const entityLabel = ENTITY_LABELS[entry.entity] || entry.entity;
            const actorRole = ROLE_LABELS[entry.actorRole] || entry.actorRole;
            const isExpanded = expandedId === entry.id;
            const hasChanges = entry.changes && entry.changes.length > 0;

            return (
              <article key={entry.id} className="card audit-log-card">
                <div className="audit-card-top">
                  <div className="audit-badge-group">
                    <span className={`badge ${actionInfo.tone}`}>
                      {actionInfo.label}
                    </span>
                    <span className="badge neutral">{entityLabel}</span>
                  </div>
                  <time className="audit-timestamp" dateTime={entry.createdAt}>
                    {date(entry.createdAt)}
                  </time>
                </div>

                <div className="audit-card-body">
                  <h3 className="audit-target-heading">
                    {entry.objectTitle || entry.entityId || "Aktivitas Sistem"}
                  </h3>

                  <div className="audit-actor-meta">
                    <span className="audit-actor-name">
                      <User size={14} />
                      <strong>{entry.user?.name || "Pengguna Sistem"}</strong>
                    </span>
                    <span className="audit-actor-role">({actorRole})</span>
                    {entry.user?.identifierValue && (
                      <span className="audit-actor-identifier">
                        • ID: {entry.user.identifierValue}
                      </span>
                    )}
                    {entry.ipAddress && (
                      <span className="audit-ip-address">
                        • IP: {entry.ipAddress}
                      </span>
                    )}
                  </div>

                  {entry.reason && (
                    <div className="audit-reason-alert">
                      <strong>Catatan / Alasan:</strong> {entry.reason}
                    </div>
                  )}

                  {/* DATA CHANGES TABLE */}
                  {hasChanges && (
                    <div className="audit-changes-container">
                      <div className="audit-changes-title">
                        <span>Perubahan Nilai / Parameter:</span>
                      </div>
                      <table className="audit-diff-table">
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Nilai Sebelumnya</th>
                            <th className="arrow-col"></th>
                            <th>Nilai Baru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.changes.map((c: any, idx: number) => {
                            const fieldName = FIELD_LABELS[c.field] || c.field;
                            const beforeStr = formatFieldValue(c.field, c.before);
                            const afterStr = formatFieldValue(c.field, c.after);
                            return (
                              <tr key={idx}>
                                <td className="diff-field">
                                  <strong>{fieldName}</strong>
                                </td>
                                <td className="diff-before">{beforeStr}</td>
                                <td className="arrow-col">
                                  <ArrowRight size={14} />
                                </td>
                                <td className="diff-after">{afterStr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* RAW DETAIL TOGGLE */}
                  {(entry.beforeState || entry.afterState) && (
                    <div className="audit-details-toggle">
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={14} /> Tutup Rincian Data Teknis
                          </>
                        ) : (
                          <>
                            <ChevronDown size={14} /> Lihat Rincian Data Teknis
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="audit-raw-json-grid">
                          {entry.beforeState && (
                            <div>
                              <h4>Data Awal (Sebelum)</h4>
                              <pre>{JSON.stringify(entry.beforeState, null, 2)}</pre>
                            </div>
                          )}
                          {entry.afterState && (
                            <div>
                              <h4>Data Akhir (Sesudah)</h4>
                              <pre>{JSON.stringify(entry.afterState, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            totalPages={totalPages}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(ps) => {
              setPageSize(ps);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
