import { useState, useMemo } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  QrCode,
  Users,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  Unlock,
  KeyRound,
  FileText,
  UserCheck,
  Sliders,
  Calendar,
} from "lucide-react";
import { clock, api, useApi, Loading, Notice, Modal, Field, Form, textValue, Pagination, usePagination } from "./lib";

type AttendanceStatus = "PRESENT" | "EXCUSED" | "SICK" | "ABSENT" | "LATE";

const statusLabels: Record<
  AttendanceStatus,
  { label: string; bg: string; text: string; border: string; dot: string; color: string }
> = {
  PRESENT: { label: "Hadir", bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0", dot: "#10b981", color: "#10b981" },
  EXCUSED: { label: "Izin", bg: "#fef3c7", text: "#92400e", border: "#fde68a", dot: "#f59e0b", color: "#f59e0b" },
  SICK: { label: "Sakit", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6", color: "#3b82f6" },
  ABSENT: { label: "Tidak Hadir (Alpa)", bg: "#fef2f2", text: "#991b1b", border: "#fecaca", dot: "#ef4444", color: "#ef4444" },
  LATE: { label: "Terlambat", bg: "#f5f3ff", text: "#6b21a8", border: "#ddd6fe", dot: "#8b5cf6", color: "#8b5cf6" },
};

function formatSchedule(startTime?: string | null, endTime?: string | null) {
  if (!startTime && !endTime) return "Fleksibel (Sepanjang Hari)";
  const toTimeStr = (iso: string) => {
    try {
      const d = new Date(iso);
      return clock(d);
    } catch {
      return "";
    }
  };
  if (startTime && endTime) {
    return `${toTimeStr(startTime)} – ${toTimeStr(endTime)}`;
  }
  if (startTime) {
    return `Mulai ${toTimeStr(startTime)}`;
  }
  return `Hingga ${toTimeStr(endTime!)}`;
}

function AttendanceStatusBadge({
  status,
  isOpen,
}: {
  status?: AttendanceStatus | null;
  isOpen: boolean;
}) {
  if (isOpen && (!status || status === "ABSENT")) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "#b45309",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          padding: "3px 10px",
          borderRadius: 999,
        }}
      >
        <Clock size={12} />
        Belum Presensi
      </span>
    );
  }

  const fallback = { label: "Belum Ada Data", bg: "#f8fafc", text: "#64748b", border: "#e2e8f0", dot: "#94a3b8" };
  const cfg = (status && statusLabels[status]) || fallback;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "0.8rem",
        fontWeight: 600,
        color: cfg.text,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        padding: "3px 10px",
        borderRadius: 999,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export function Attendance({
  classId,
  writable,
  canManage,
}: {
  classId: string;
  writable: boolean;
  canManage: boolean;
  user: any;
}) {
  const [activeTab, setActiveTab] = useState<"sessions" | "recap">("sessions");
  const sessionsApi = useApi<any[]>(`/course-classes/${classId}/attendance`);
  const [modal, setModal] = useState<
    | { kind: "create" }
    | { kind: "code"; session: any }
    | { kind: "schedule"; session: any }
    | { kind: "manual"; session: any }
    | { kind: "checkin"; session: any }
    | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);

  const sessions = sessionsApi.data || [];
  const sessionsPagination = usePagination(sessions, 10);

  // Cari sesi aktif yang sedang dibuka untuk notifikasi mahasiswa
  const activeOpenSession = useMemo(() => {
    if (canManage) return null;
    return sessions.find((s) => s.isOpen && s.myRecord?.status !== "PRESENT");
  }, [sessions, canManage]);

  if (sessionsApi.loading && !sessionsApi.data) return <Loading />;
  if (sessionsApi.error) return <Notice error={sessionsApi.error} />;

  return (
    <div className="attendance-view" style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 40 }}>
      {message && (
        <div
          className="notice"
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* Banner Notifikasi Presensi Aktif untuk Mahasiswa */}
      {activeOpenSession && (
        <div
          className="active-attendance-banner"
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            borderRadius: 12,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 16px -4px rgba(2, 132, 199, 0.3)",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4ade80",
                    boxShadow: "0 0 8px #4ade80",
                    display: "inline-block",
                  }}
                />
                Sedang Berlangsung
              </span>
            </div>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "1.25rem", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.01em" }}>
              {activeOpenSession.title}
            </h3>
            <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.92)", fontSize: "0.88rem", lineHeight: 1.5 }}>
              {activeOpenSession.requiresCode
                ? "Dosen telah membuka sesi presensi dengan verifikasi PIN. Masukkan kode 6 karakter dari layar proyektor kelas."
                : "Dosen telah membuka sesi presensi mandiri (bebas kode). Anda dapat langsung mengonfirmasi kehadiran dengan 1 klik."}
            </p>
          </div>
          <button
            type="button"
            style={{
              background: "#ffffff",
              color: "#0369a1",
              fontWeight: 700,
              fontSize: "0.88rem",
              padding: "10px 22px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
            onClick={() => setModal({ kind: "checkin", session: activeOpenSession })}
          >
            {activeOpenSession.requiresCode ? <KeyRound size={16} /> : <CheckCircle2 size={16} />}
            <span>{activeOpenSession.requiresCode ? "Isi Presensi (PIN)" : "Konfirmasi Hadir (1-Klik)"}</span>
          </button>
        </div>
      )}

      {/* Header & Aksi */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>Presensi Perkuliahan</h2>
          <p style={{ color: "var(--muted, #64748b)", margin: "4px 0 0 0", fontSize: "0.9rem" }}>
            {canManage
              ? "Kelola kehadiran mahasiswa tatap muka per pertemuan dan pantau rekapitulasi kelayakan ujian."
              : "Riwayat status kehadiran dan pengisian presensi mandiri perkuliahan."}
          </p>
        </div>

        {canManage && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "inline-flex", background: "var(--chip-bg, #f1f5f9)", padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => setActiveTab("sessions")}
                style={{
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  fontWeight: activeTab === "sessions" ? 700 : 500,
                  background: activeTab === "sessions" ? "#ffffff" : "transparent",
                  color: activeTab === "sessions" ? "#0f172a" : "#64748b",
                  cursor: "pointer",
                  boxShadow: activeTab === "sessions" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Daftar Sesi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("recap")}
                style={{
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  fontWeight: activeTab === "recap" ? 700 : 500,
                  background: activeTab === "recap" ? "#ffffff" : "transparent",
                  color: activeTab === "recap" ? "#0f172a" : "#64748b",
                  cursor: "pointer",
                  boxShadow: activeTab === "recap" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                Rekapitulasi Kehadiran
              </button>
            </div>

            {writable && (
              <button
                type="button"
                className="button primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                onClick={() => setModal({ kind: "create" })}
              >
                <CalendarCheck size={16} />
                <span>Buat Sesi Presensi</span>
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === "sessions" ? (
        /* ================= DAFTAR SESI ================= */
        <div style={{ display: "grid", gap: 14 }}>
          {sessions.length > 0 ? (
            sessionsPagination.paginatedItems.map((s) => {
              const dateStr = new Date(s.sessionDate).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const isCurrentlyOpen = s.isOpen;
              const isScheduledFuture = !s.isOpen && s.startTime && new Date(s.startTime) > new Date();

              return (
                <div
                  key={s.id}
                  className="card session-card"
                  style={{
                    padding: "18px 20px",
                    borderRadius: 12,
                    border: isCurrentlyOpen
                      ? "1.5px solid #38bdf8"
                      : "1px solid var(--border, #e2e8f0)",
                    background: "var(--card-bg, #ffffff)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                    boxShadow: isCurrentlyOpen
                      ? "0 4px 12px -2px rgba(2, 132, 199, 0.1)"
                      : "0 1px 3px rgba(0, 0, 0, 0.03)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
                        {dateStr}
                      </span>

                      {/* Status sesi */}
                      {isCurrentlyOpen ? (
                        <span
                          style={{
                            background: "#ecfdf5",
                            color: "#15803d",
                            border: "1px solid #bbf7d0",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                          Sesi Dibuka
                        </span>
                      ) : isScheduledFuture ? (
                        <span
                          style={{
                            background: "#f0f9ff",
                            color: "#0369a1",
                            border: "1px solid #bae6fd",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CalendarClock size={12} />
                          Terjadwal
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#f8fafc",
                            color: "#64748b",
                            border: "1px solid #e2e8f0",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Lock size={12} /> Ditutup
                        </span>
                      )}

                      {/* Mode Presensi: Bebas Kode vs Perlu PIN */}
                      {s.requiresCode ? (
                        <span
                          style={{
                            background: "#fffbeb",
                            color: "#92400e",
                            border: "1px solid #fde68a",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <KeyRound size={11} /> Perlu PIN
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#f0fdf4",
                            color: "#166534",
                            border: "1px solid #dcfce7",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={11} /> Bebas Kode (1-Klik)
                        </span>
                      )}

                      {/* Jam Jadwal / Status Pembukaan */}
                      {s.startTime || s.endTime ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.78rem",
                            color: "var(--muted, #64748b)",
                            background: "var(--neutral-soft, #f8fafc)",
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          <Clock size={11} /> {formatSchedule(s.startTime, s.endTime)}
                        </span>
                      ) : isCurrentlyOpen ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.78rem",
                            color: "#166534",
                            background: "#f0fdf4",
                            border: "1px solid #dcfce7",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontWeight: 500,
                          }}
                        >
                          <Clock size={11} /> Buka Manual (Sampai Ditutup Dosen)
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.78rem",
                            color: "var(--muted, #64748b)",
                            background: "var(--neutral-soft, #f8fafc)",
                            padding: "2px 8px",
                            borderRadius: 6,
                          }}
                        >
                          <Lock size={11} /> Ditutup Manual oleh Dosen
                        </span>
                      )}
                    </div>

                    <h3 style={{ margin: "0 0 6px 0", fontSize: "1.08rem", fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
                      {s.title}
                    </h3>
                    {s.description && (
                      <p style={{ margin: "0 0 8px 0", color: "var(--muted, #64748b)", fontSize: "0.86rem", lineHeight: 1.5 }}>
                        {s.description}
                      </p>
                    )}

                    {/* Stats Ringkas & Rapi untuk Dosen */}
                    {canManage && s.stats && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 12,
                          fontSize: "0.8rem",
                          flexWrap: "wrap",
                          marginTop: 8,
                          padding: "6px 12px",
                          background: "var(--neutral-soft, #f8fafc)",
                          border: "1px solid var(--border, #e2e8f0)",
                          borderRadius: 8,
                        }}
                      >
                        <span style={{ color: "#15803d", fontWeight: 600 }}>
                          Hadir: {s.stats.presentCount}
                        </span>
                        <span style={{ color: "#b45309", fontWeight: 500 }}>
                          Izin: {s.stats.excusedCount}
                        </span>
                        <span style={{ color: "#1d4ed8", fontWeight: 500 }}>
                          Sakit: {s.stats.sickCount}
                        </span>
                        <span style={{ color: "#7c3aed", fontWeight: 500 }}>
                          Terlambat: {s.stats.lateCount}
                        </span>
                        <span style={{ color: "#b91c1c", fontWeight: 500 }}>
                          Alpa: {s.stats.absentCount}
                        </span>
                        <span style={{ color: "var(--muted, #64748b)", borderLeft: "1px solid var(--border, #cbd5e1)", paddingLeft: 8 }}>
                          Total: {s.stats.totalStudents} Mhs
                        </span>
                      </div>
                    )}

                    {/* Status untuk Mahasiswa */}
                    {!canManage && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
                          Status Kehadiran:
                        </span>
                        <AttendanceStatusBadge status={s.myRecord?.status} isOpen={s.isOpen} />
                        {s.myRecord?.checkedInAt && (
                          <span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
                            (Presensi pukul {clock(s.myRecord.checkedInAt)})
                          </span>
                        )}
                        {s.myRecord?.notes && (
                          <span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)", fontStyle: "italic" }}>
                            — {s.myRecord.notes}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {canManage ? (
                      <>
                        {/* Tombol Cepat Buka/Tutup Sesi Langsung */}
                        <button
                          type="button"
                          className="button"
                          title={s.isOpen ? "Tutup sesi presensi sekarang" : "Buka sesi presensi sekarang"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.82rem",
                            padding: "7px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                            background: s.isOpen ? "#fee2e2" : "#f0fdf4",
                            color: s.isOpen ? "#991b1b" : "#166534",
                            border: `1px solid ${s.isOpen ? "#fecaca" : "#bbf7d0"}`,
                            fontWeight: 600,
                          }}
                          onClick={async () => {
                            await api(`/attendance/${s.id}`, "PATCH", { isOpen: !s.isOpen });
                            sessionsApi.reload();
                            setMessage(`Sesi "${s.title}" berhasil ${!s.isOpen ? "dibuka" : "ditutup"}.`);
                          }}
                        >
                          {s.isOpen ? <Lock size={13} /> : <Unlock size={13} />}
                          <span>{s.isOpen ? "Tutup Sesi" : "Buka Sesi"}</span>
                        </button>

                        <button
                          type="button"
                          className="button secondary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.84rem",
                            cursor: "pointer",
                            padding: "7px 12px",
                            borderRadius: 8,
                          }}
                          onClick={() => setModal({ kind: "schedule", session: s })}
                        >
                          <Sliders size={14} />
                          <span>Atur Jadwal</span>
                        </button>

                        {s.checkInCode && (
                          <button
                            type="button"
                            className="button secondary"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: "0.84rem",
                              cursor: "pointer",
                              padding: "7px 12px",
                              borderRadius: 8,
                            }}
                            onClick={() => setModal({ kind: "code", session: s })}
                          >
                            <QrCode size={14} />
                            <span>Kode Proyektor</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="button primary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            borderRadius: 8,
                            padding: "7px 14px",
                            cursor: "pointer",
                          }}
                          onClick={() => setModal({ kind: "manual", session: s })}
                        >
                          <UserCheck size={14} />
                          <span>Lembar Presensi</span>
                        </button>
                      </>
                    ) : (
                      s.isOpen &&
                      s.myRecord?.status !== "PRESENT" && (
                        <button
                          type="button"
                          className="button primary"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            borderRadius: 8,
                            padding: "8px 16px",
                            cursor: "pointer",
                          }}
                          onClick={() => setModal({ kind: "checkin", session: s })}
                        >
                          {s.requiresCode ? <KeyRound size={14} /> : <CheckCircle2 size={14} />}
                          <span>{s.requiresCode ? "Isi Presensi (PIN)" : "Konfirmasi Hadir (1-Klik)"}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted, #64748b)" }}>
              <Clock size={32} style={{ margin: "0 auto 8px auto", opacity: 0.6 }} />
              <p style={{ margin: 0 }}>Belum ada sesi presensi yang dibuat pada kelas ini.</p>
            </div>
          )}

          {sessions.length > 0 && (
            <div
              style={{
                marginTop: 6,
                padding: "4px 16px",
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 10,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
              }}
            >
              <Pagination
                page={sessionsPagination.page}
                totalPages={sessionsPagination.totalPages}
                totalItems={sessionsPagination.totalItems}
                pageSize={sessionsPagination.pageSize}
                onPageChange={sessionsPagination.setPage}
                onPageSizeChange={sessionsPagination.setPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            </div>
          )}
        </div>
      ) : (
        /* ================= REKAPITULASI KEHADIRAN ================= */
        <AttendanceRecapTable classId={classId} />
      )}

      {/* ================= MODAL BUAT SESI ================= */}
      {modal?.kind === "create" && (
        <CreateSessionModal
          classId={classId}
          defaultTitle={`Pertemuan ${sessions.length + 1} - Kuliah Tatap Muka`}
          onClose={() => setModal(null)}
          onCreated={() => {
            sessionsApi.reload();
            setMessage("Sesi presensi baru berhasil dibuat.");
          }}
        />
      )}

      {/* ================= MODAL ATUR JADWAL & PENGATURAN SESI ================= */}
      {modal?.kind === "schedule" && (
        <ScheduleSessionModal
          session={modal.session}
          onClose={() => setModal(null)}
          onSaved={() => {
            sessionsApi.reload();
            setMessage("Jadwal dan pengaturan sesi berhasil disimpan.");
          }}
        />
      )}

      {/* ================= MODAL KODE PROYEKTOR / QR ================= */}
      {modal?.kind === "code" && (
        <Modal title="Kode Presensi Layar Proyektor" onClose={() => setModal(null)} wide>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <h3 style={{ margin: "0 0 6px 0", color: "var(--muted, #64748b)", fontSize: "1rem" }}>
              {modal.session.title}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--muted, #64748b)", marginBottom: 24 }}>
              Tampilkan kode ini di layar proyektor kelas agar mahasiswa dapat melakukan presensi mandiri.
            </p>

            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                border: "2px dashed #0284c7",
                borderRadius: 16,
                padding: "24px 48px",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                Kode Presensi 6 Karakter
              </div>
              <div
                style={{
                  fontSize: "3.5rem",
                  fontWeight: 900,
                  letterSpacing: "0.4rem",
                  color: "#0f172a",
                  fontFamily: "monospace",
                }}
              >
                {modal.session.checkInCode || "---"}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                type="button"
                className="button"
                style={{
                  background: modal.session.isOpen ? "#ef4444" : "#10b981",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  await api(`/attendance/${modal.session.id}`, "PATCH", {
                    isOpen: !modal.session.isOpen,
                  });
                  sessionsApi.reload();
                  setModal(null);
                  setMessage(`Sesi presensi berhasil ${!modal.session.isOpen ? "dibuka" : "ditutup"}.`);
                }}
              >
                {modal.session.isOpen ? <Lock size={16} /> : <Unlock size={16} />}
                <span>{modal.session.isOpen ? "Tutup Sesi Sekarang" : "Buka Sesi Presensi"}</span>
              </button>

              <button
                type="button"
                className="button secondary"
                style={{ cursor: "pointer" }}
                onClick={async () => {
                  const res = await api(`/attendance/${modal.session.id}`, "PATCH", {
                    regenerateCode: true,
                  });
                  setModal({ kind: "code", session: res });
                  sessionsApi.reload();
                  setMessage("Kode presensi baru berhasil dibuat.");
                }}
              >
                Acak Ulang Kode
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL LEMBAR PRESENSI MANUAL DOSEN ================= */}
      {modal?.kind === "manual" && (
        <ManualAttendanceModal
          session={modal.session}
          onClose={() => setModal(null)}
          onSaved={() => {
            sessionsApi.reload();
            setMessage("Presensi manual berhasil disimpan.");
          }}
        />
      )}

      {/* ================= MODAL SELF CHECK-IN MAHASISWA ================= */}
      {modal?.kind === "checkin" && (
        <Modal title="Presensi Mandiri Mahasiswa" onClose={() => setModal(null)}>
          {modal.session.requiresCode ? (
            <Form
              onSubmit={async (f) => {
                const code = textValue(f, "code");
                await api(`/attendance/${modal.session.id}/check-in`, "POST", { code });
                setModal(null);
                setMessage("Presensi berhasil dicatat! Status Anda kini Hadir.");
                sessionsApi.reload();
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--foreground, #1e293b)" }}>
                  Anda melakukan presensi untuk: <strong>{modal.session.title}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>
                  Masukkan kode akses 6 karakter yang ditampilkan oleh dosen di ruang kelas.
                </p>
              </div>

              <Field label="Kode Presensi (6 Karakter)">
                <input
                  name="code"
                  required
                  autoFocus
                  placeholder="Contoh: K7X9PQ"
                  style={{
                    fontSize: "1.2rem",
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                />
              </Field>
            </Form>
          ) : (
            <div style={{ textAlign: "center", padding: "12px 8px 8px 8px" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#16a34a",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.15rem", fontWeight: 700 }}>
                Konfirmasi Kehadiran Bebas Kode
              </h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--muted, #64748b)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                Sesi perkuliahan <strong>{modal.session.title}</strong> menggunakan sistem presensi 1-klik tanpa memerlukan kode PIN. Pastikan Anda telah hadir di ruang perkuliahan.
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" className="button secondary" onClick={() => setModal(null)}>
                  Batal
                </button>
                <button
                  type="button"
                  className="button primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={async () => {
                    await api(`/attendance/${modal.session.id}/check-in`, "POST", { code: "" });
                    setModal(null);
                    setMessage("Presensi berhasil dicatat! Status Anda kini Hadir.");
                    sessionsApi.reload();
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Konfirmasi Hadir Saya (1-Klik)</span>
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Buat Sesi Presensi Baru (Default: Bebas Kode / 1-Klik)
// ---------------------------------------------------------------------------
function CreateSessionModal({
  classId,
  defaultTitle,
  onClose,
  onCreated,
}: {
  classId: string;
  defaultTitle: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [hasSchedule, setHasSchedule] = useState(false);

  // Waktu perkuliahan standar (sekarang & +2 jam)
  const now = new Date();
  const defStartTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const endHour = (now.getHours() + 2) % 24;
  const defEndTime = `${String(endHour).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const [startTime, setStartTime] = useState(defStartTime);
  const [endTime, setEndTime] = useState(defEndTime);
  const [requireCode, setRequireCode] = useState(false); // DEFAULT FALSE (Bebas Kode / 1-Klik)
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalStartTime: string | null = null;
      let finalEndTime: string | null = null;

      if (hasSchedule && startTime) {
        finalStartTime = new Date(`${sessionDate}T${startTime}:00`).toISOString();
      }
      if (hasSchedule && endTime) {
        finalEndTime = new Date(`${sessionDate}T${endTime}:00`).toISOString();
      }

      await api(`/course-classes/${classId}/attendance`, "POST", {
        title,
        description: description || undefined,
        sessionDate: new Date(`${sessionDate}T00:00:00`).toISOString(),
        startTime: finalStartTime,
        endTime: finalEndTime,
        isOpen: !hasSchedule || (finalStartTime ? new Date(finalStartTime) <= new Date() : true),
        allowSelfCheckIn: true,
        requireCode, // false by default
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Buat Sesi Presensi Baru" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <Field label="Judul Sesi Presensi">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Contoh: Pertemuan 1 - Pengantar Web"
          />
        </Field>

        <Field label="Keterangan / Topik (Opsional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Materi perkuliahan atau pengumuman ruangan..."
          />
        </Field>

        <Field label="Tanggal Perkuliahan">
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            required
          />
        </Field>

        {/* Jadwal Waktu Presensi */}
        <div style={{ borderTop: "1px solid var(--border, #f1f5f9)", paddingTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={hasSchedule}
              onChange={(e) => setHasSchedule(e.target.checked)}
            />
            <span>Jadwalkan Waktu Presensi (Mulai &amp; Selesai)</span>
          </label>
          <p style={{ margin: "4px 0 10px 24px", fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
            Bila diaktifkan, sesi presensi otomatis dibuka saat jam mulai dan ditutup saat jam selesai. <strong>Jika tidak dicentang (default)</strong>, sesi akan langsung dibuka dan tetap aktif (<em>always open</em>) sampai Anda menutupnya secara manual.
          </p>

          {hasSchedule && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginLeft: 24 }}>
              <Field label="Jam Mulai">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required={hasSchedule}
                />
              </Field>
              <Field label="Jam Selesai">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required={hasSchedule}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Opsi PIN (Default: Bebas Kode / 1-Klik) */}
        <div style={{ borderTop: "1px solid var(--border, #f1f5f9)", paddingTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={requireCode}
              onChange={(e) => setRequireCode(e.target.checked)}
            />
            <span>Wajibkan Kode PIN 6 Karakter (Proyektor)</span>
          </label>
          <p style={{ margin: "4px 0 0 24px", fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
            <strong>Default tidak dicentang (Bebas Kode / 1-Klik)</strong>. Mahasiswa cukup klik tombol Hadir. Centang opsi ini jika Anda ingin mahasiswa wajib memasukkan PIN acak yang diproyeksikan di ruang kelas.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, borderTop: "1px solid var(--border, #f1f5f9)", paddingTop: 14 }}>
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? "Membuat Sesi..." : "Buat & Buka Sesi"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal Pengaturan & Jadwal Sesi Presensi Dosen
// ---------------------------------------------------------------------------
function ScheduleSessionModal({
  session,
  onClose,
  onSaved,
}: {
  session: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isOpen, setIsOpen] = useState(Boolean(session.isOpen));
  const [requireCode, setRequireCode] = useState(Boolean(session.checkInCode));
  const [title, setTitle] = useState(session.title || "");
  const [description, setDescription] = useState(session.description || "");

  const initialDate = session.sessionDate
    ? new Date(session.sessionDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const [sessionDate, setSessionDate] = useState(initialDate);

  const initialStartTime = session.startTime
    ? new Date(session.startTime).toTimeString().slice(0, 5)
    : "";
  const initialEndTime = session.endTime
    ? new Date(session.endTime).toTimeString().slice(0, 5)
    : "";

  const [hasSchedule, setHasSchedule] = useState(Boolean(session.startTime || session.endTime));
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [checkInCode, setCheckInCode] = useState(session.checkInCode || "");
  const [saving, setSaving] = useState(false);

  const handleQuickExtend = async (minutes: number) => {
    setSaving(true);
    try {
      const currentEnd = session.endTime ? new Date(session.endTime).getTime() : Date.now();
      const newEnd = new Date(Math.max(Date.now(), currentEnd) + minutes * 60000).toISOString();
      await api(`/attendance/${session.id}`, "PATCH", {
        endTime: newEnd,
        isOpen: true,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalStartTime: string | null = null;
      let finalEndTime: string | null = null;

      if (hasSchedule && startTime) {
        finalStartTime = new Date(`${sessionDate}T${startTime}:00`).toISOString();
      }
      if (hasSchedule && endTime) {
        finalEndTime = new Date(`${sessionDate}T${endTime}:00`).toISOString();
      }

      await api(`/attendance/${session.id}`, "PATCH", {
        title,
        description: description || null,
        sessionDate: new Date(`${sessionDate}T00:00:00`).toISOString(),
        startTime: hasSchedule ? finalStartTime : null,
        endTime: hasSchedule ? finalEndTime : null,
        isOpen,
        requireCode,
        checkInCode: requireCode ? (checkInCode || undefined) : null,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Pengaturan & Jadwal Sesi: ${session.title}`} onClose={onClose}>
      <form onSubmit={handleSave} style={{ display: "grid", gap: 16 }}>
        {/* Banner Status & Perpanjang Cepat */}
        <div
          style={{
            background: "var(--neutral-soft, #f8fafc)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
                Status Sesi Saat Ini:
              </span>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: isOpen ? "#15803d" : "#64748b", marginTop: 2 }}>
                {isOpen ? "🟢 Terbuka (Menerima Presensi)" : "🔒 Ditutup (Tidak Menerima Presensi)"}
              </div>
            </div>
            <button
              type="button"
              className="button"
              style={{
                background: isOpen ? "#fee2e2" : "#dcfce7",
                color: isOpen ? "#991b1b" : "#15803d",
                border: `1px solid ${isOpen ? "#fecaca" : "#bbf7d0"}`,
                fontSize: "0.82rem",
                padding: "6px 14px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? "Tutup Sesi" : "Buka Sesi Sekarang"}
            </button>
          </div>

          <div style={{ borderTop: "1px dashed var(--border, #e2e8f0)", paddingTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
              Perpanjang Waktu Cepat:
            </span>
            <button
              type="button"
              className="button secondary"
              style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 6 }}
              disabled={saving}
              onClick={() => handleQuickExtend(15)}
            >
              +15 Menit
            </button>
            <button
              type="button"
              className="button secondary"
              style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 6 }}
              disabled={saving}
              onClick={() => handleQuickExtend(30)}
            >
              +30 Menit
            </button>
          </div>
        </div>

        <Field label="Judul Sesi">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Judul Sesi Pertemuan"
          />
        </Field>

        <Field label="Keterangan / Topik">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Materi atau catatan perkuliahan..."
          />
        </Field>

        <Field label="Tanggal Perkuliahan">
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            required
          />
        </Field>

        {/* Jadwal otomatis */}
        <div style={{ borderTop: "1px solid var(--border, #f1f5f9)", paddingTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={hasSchedule}
              onChange={(e) => setHasSchedule(e.target.checked)}
            />
            <span>Terapkan Jadwal Otomatis (Mulai &amp; Selesai)</span>
          </label>
          <p style={{ margin: "4px 0 10px 24px", fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
            Sistem otomatis membuka sesi saat waktu mulai tercapai dan menutupnya saat batas selesai lewat.
          </p>

          {hasSchedule && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginLeft: 24 }}>
              <Field label="Jam Mulai">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required={hasSchedule}
                />
              </Field>
              <Field label="Jam Selesai">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required={hasSchedule}
                />
              </Field>
            </div>
          )}
        </div>

        {/* Kebijakan PIN Presensi */}
        <div style={{ borderTop: "1px solid var(--border, #f1f5f9)", paddingTop: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
            <input
              type="checkbox"
              checked={requireCode}
              onChange={(e) => setRequireCode(e.target.checked)}
            />
            <span>Wajibkan Kode PIN 6 Karakter (Proyektor)</span>
          </label>
          <p style={{ margin: "4px 0 8px 24px", fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
            {requireCode
              ? "Mahasiswa wajib memasukkan kode acak 6 karakter yang ditampilkan oleh dosen."
              : "Default aktif: Presensi bebas kode (1-klik). Mahasiswa cukup klik konfirmasi kehadiran."}
          </p>

          {requireCode && (
            <div style={{ marginLeft: 24, display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <input
                type="text"
                value={checkInCode}
                onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
                placeholder="Auto jika kosong"
                maxLength={6}
                style={{
                  width: 140,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              />
              <button
                type="button"
                className="button secondary"
                style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                onClick={() => {
                  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                  let code = "";
                  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
                  setCheckInCode(code);
                }}
              >
                Acak Ulang PIN
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12, borderTop: "1px solid var(--border, #f1f5f9)", paddingTop: 14 }}>
          <button type="button" className="button secondary" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="submit" className="button primary" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Lembar Presensi Manual Dosen (Roster Grid)
// ---------------------------------------------------------------------------
function ManualAttendanceModal({
  session,
  onClose,
  onSaved,
}: {
  session: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const rosterApi = useApi<{ session: any; roster: any[] }>(`/attendance/${session.id}/records`);
  const [roster, setRoster] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Inisialisasi roster dari API
  const list = roster || rosterApi.data?.roster || [];
  const pagination = usePagination(list, 15);

  const updateStudentStatus = (userId: string, status: AttendanceStatus) => {
    const updated = list.map((item) => (item.userId === userId ? { ...item, status } : item));
    setRoster(updated);
  };

  const updateStudentNotes = (userId: string, notes: string) => {
    const updated = list.map((item) => (item.userId === userId ? { ...item, notes } : item));
    setRoster(updated);
  };

  const markAllPresent = () => {
    const updated = list.map((item) => ({ ...item, status: "PRESENT" as AttendanceStatus }));
    setRoster(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api(`/attendance/${session.id}/records/batch`, "PUT", {
        records: list.map((item) => ({
          userId: item.userId,
          status: item.status,
          notes: item.notes || null,
        })),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (rosterApi.loading && !rosterApi.data) return <Loading />;

  return (
    <Modal title={`Lembar Presensi: ${session.title}`} onClose={onClose} wide>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>
            Total Mahasiswa Terdaftar: <strong>{list.length}</strong>
          </span>
        </div>
        <button
          type="button"
          className="button secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}
          onClick={markAllPresent}
        >
          <CheckCircle2 size={16} style={{ color: "#10b981" }} />
          <span>Tandai Semua Hadir</span>
        </button>
      </div>

      <div className="card table-wrap" style={{ maxHeight: "55vh", overflowY: "auto", marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Mahasiswa (NIM / Nama)</th>
              <th style={{ width: "45%" }}>Status Kehadiran</th>
              <th style={{ width: "25%" }}>Catatan / Izin</th>
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((m) => (
              <tr key={m.userId}>
                <td>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <small style={{ color: "var(--muted, #64748b)" }}>NIM: {m.identifierValue}</small>
                </td>
                <td>
                  <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
                    {(["PRESENT", "EXCUSED", "SICK", "ABSENT", "LATE"] as AttendanceStatus[]).map((st) => {
                      const isSelected = m.status === st;
                      const conf = statusLabels[st];
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateStudentStatus(m.userId, st)}
                          style={{
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 8px",
                            fontSize: "0.75rem",
                            fontWeight: isSelected ? 700 : 500,
                            cursor: "pointer",
                            background: isSelected ? conf.color : "#f1f5f9",
                            color: isSelected ? "#ffffff" : "#475569",
                            transition: "all 0.1s ease",
                          }}
                        >
                          {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Alasan izin / nomor surat..."
                    defaultValue={m.notes || ""}
                    onChange={(e) => updateStudentNotes(m.userId, e.target.value)}
                    style={{ fontSize: "0.82rem", padding: "4px 8px", width: "100%" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[10, 15, 25, 50]}
          />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="button secondary" onClick={onClose} disabled={saving}>
          Batal
        </button>
        <button type="button" className="button primary" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Semua Perubahan"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Rekapitulasi Kehadiran Kelas & Syarat Ujian dari pengaturan akademik
// ---------------------------------------------------------------------------
function AttendanceRecapTable({ classId }: { classId: string }) {
  const recapApi = useApi<{
    totalSessions: number;
    minAttendancePercentage: number;
    sessions: any[];
    recap: any[];
  }>(`/course-classes/${classId}/attendance/recap`);
  const students = recapApi.data?.recap ?? [];
  const pagination = usePagination(students, 25);

  if (recapApi.loading && !recapApi.data) return <Loading />;
  if (recapApi.error) return <Notice error={recapApi.error} />;

  const data = recapApi.data!;

  const exportCsv = () => {
    let csv = "NIM,Nama Mahasiswa,Email,Total Sesi,Hadir,Izin,Sakit,Alpa,Terlambat,Persentase,Status Ujian\n";
    for (const s of students) {
      csv += `"${s.user.identifierValue}","${s.user.name}","${s.user.email}",${data.totalSessions},${s.presentCount},${s.excusedCount},${s.sickCount},${s.absentCount},${s.lateCount},${s.percentage}%,${s.isEligibleForExam ? "Memenuhi Syarat" : "Gugur Ujian"}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rekap_Presensi_Kelas_${classId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="attendance-recap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <span style={{ fontSize: "0.9rem", color: "var(--muted, #64748b)" }}>
            Total Pertemuan Berlangsung: <strong>{data.totalSessions} Sesi</strong> | Ambang Batas Ujian: <strong>{data.minAttendancePercentage}%</strong>
          </span>
        </div>
        <button
          type="button"
          className="button secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}
          onClick={exportCsv}
        >
          <FileSpreadsheet size={16} />
          <span>Ekspor Rekap (CSV)</span>
        </button>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mahasiswa (NIM &amp; Nama)</th>
              <th style={{ textAlign: "center" }}>H</th>
              <th style={{ textAlign: "center" }}>I</th>
              <th style={{ textAlign: "center" }}>S</th>
              <th style={{ textAlign: "center" }}>A</th>
              <th style={{ textAlign: "center" }}>T</th>
              <th style={{ textAlign: "center" }}>Kehadiran (%)</th>
              <th style={{ textAlign: "center" }}>Kelayakan Ujian</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              pagination.paginatedItems.map((item) => (
                <tr key={item.user.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.user.name}</div>
                    <small style={{ color: "var(--muted, #64748b)" }}>NIM: {item.user.identifierValue}</small>
                  </td>
                  <td style={{ textAlign: "center", color: "#10b981", fontWeight: 600 }}>{item.presentCount}</td>
                  <td style={{ textAlign: "center", color: "#f59e0b", fontWeight: 600 }}>{item.excusedCount}</td>
                  <td style={{ textAlign: "center", color: "#3b82f6", fontWeight: 600 }}>{item.sickCount}</td>
                  <td style={{ textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{item.absentCount}</td>
                  <td style={{ textAlign: "center", color: "#8b5cf6", fontWeight: 600 }}>{item.lateCount}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{item.percentage}%</td>
                  <td style={{ textAlign: "center" }}>
                    {item.isEligibleForExam ? (
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#15803d",
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        Memenuhi Syarat
                      </span>
                    ) : (
                      <span
                        style={{
                          background: "#fee2e2",
                          color: "#b91c1c",
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        Di bawah ambang (&lt; {data.minAttendancePercentage}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "var(--muted, #64748b)", padding: 24 }}>
                  Belum ada data mahasiswa terdaftar pada kelas ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {students.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "4px 16px",
            background: "var(--card-bg, #ffffff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 10,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
          }}
        >
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      )}
    </div>
  );
}

export default Attendance;
