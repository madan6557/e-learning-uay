import { useState, useMemo } from "react";
import {
  CalendarCheck,
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
} from "lucide-react";
import { api, useApi, Loading, Notice, Modal, Field, Form, textValue } from "./lib";

type AttendanceStatus = "PRESENT" | "EXCUSED" | "SICK" | "ABSENT" | "LATE";

const statusLabels: Record<AttendanceStatus, { label: string; badge: string; color: string }> = {
  PRESENT: { label: "Hadir", badge: "badge-success", color: "#10b981" },
  EXCUSED: { label: "Izin", badge: "badge-warning", color: "#f59e0b" },
  SICK: { label: "Sakit", badge: "badge-primary", color: "#3b82f6" },
  ABSENT: { label: "Alpa", badge: "badge-gray", color: "#ef4444" },
  LATE: { label: "Terlambat", badge: "badge-purple", color: "#8b5cf6" },
};

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
    | { kind: "manual"; session: any }
    | { kind: "checkin"; session: any }
    | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);

  const sessions = sessionsApi.data || [];

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
          className="card active-attendance-banner"
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            borderRadius: 12,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.25)",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Sedang Berlangsung
              </span>
            </div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", fontWeight: 700 }}>
              {activeOpenSession.title}
            </h3>
            <p style={{ margin: 0, opacity: 0.9, fontSize: "0.9rem" }}>
              Dosen telah membuka sesi presensi. Masukkan kode 6 digit untuk melakukan presensi mandiri.
            </p>
          </div>
          <button
            type="button"
            className="button"
            style={{
              background: "#ffffff",
              color: "#0369a1",
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            }}
            onClick={() => setModal({ kind: "checkin", session: activeOpenSession })}
          >
            Isi Presensi Sekarang
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
            sessions.map((s) => {
              const dateStr = new Date(s.sessionDate).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    padding: "18px 20px",
                    borderRadius: 10,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "var(--card-bg, #ffffff)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)", fontWeight: 500 }}>
                        {dateStr}
                      </span>
                      {s.isOpen ? (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 12,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Unlock size={12} /> Terbuka
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#64748b",
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
                    </div>
                    <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", fontWeight: 700 }}>{s.title}</h3>
                    {s.description && (
                      <p style={{ margin: "0 0 8px 0", color: "var(--muted, #64748b)", fontSize: "0.88rem" }}>
                        {s.description}
                      </p>
                    )}

                    {/* Stats untuk Dosen */}
                    {canManage && s.stats && (
                      <div style={{ display: "flex", gap: 12, fontSize: "0.82rem", color: "#475569", flexWrap: "wrap" }}>
                        <span style={{ color: "#10b981", fontWeight: 600 }}>Hadir: {s.stats.presentCount}</span>
                        <span style={{ color: "#f59e0b", fontWeight: 600 }}>Izin: {s.stats.excusedCount}</span>
                        <span style={{ color: "#3b82f6", fontWeight: 600 }}>Sakit: {s.stats.sickCount}</span>
                        <span style={{ color: "#8b5cf6", fontWeight: 600 }}>Terlambat: {s.stats.lateCount}</span>
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>Alpa: {s.stats.absentCount}</span>
                        <span style={{ color: "#64748b" }}>/ Total {s.stats.totalStudents} Mhs</span>
                      </div>
                    )}

                    {/* Status untuk Mahasiswa */}
                    {!canManage && (
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>Status Anda:</span>
                        {s.myRecord ? (
                          <span
                            style={{
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              color: statusLabels[s.myRecord.status as AttendanceStatus]?.color || "#64748b",
                              background: "rgba(0,0,0,0.04)",
                              padding: "2px 10px",
                              borderRadius: 12,
                            }}
                          >
                            {statusLabels[s.myRecord.status as AttendanceStatus]?.label || s.myRecord.status}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.82rem", color: "#ef4444", fontWeight: 600 }}>Belum Presensi</span>
                        )}
                        {s.myRecord?.checkedInAt && (
                          <span style={{ fontSize: "0.78rem", color: "var(--muted, #94a3b8)" }}>
                            (Pukul {new Date(s.myRecord.checkedInAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {canManage ? (
                      <>
                        <button
                          type="button"
                          className="button secondary"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}
                          onClick={() => setModal({ kind: "code", session: s })}
                        >
                          <QrCode size={15} />
                          <span>Kode Proyektor</span>
                        </button>

                        <button
                          type="button"
                          className="button"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.85rem",
                            background: "var(--primary, #0284c7)",
                            color: "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => setModal({ kind: "manual", session: s })}
                        >
                          <UserCheck size={15} />
                          <span>Lembar Presensi</span>
                        </button>
                      </>
                    ) : (
                      s.isOpen &&
                      s.myRecord?.status !== "PRESENT" && (
                        <button
                          type="button"
                          className="button primary"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                          onClick={() => setModal({ kind: "checkin", session: s })}
                        >
                          <KeyRound size={15} />
                          <span>Isi Presensi</span>
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
        </div>
      ) : (
        /* ================= REKAPITULASI KEHADIRAN ================= */
        <AttendanceRecapTable classId={classId} />
      )}

      {/* ================= MODAL BUAT SESI ================= */}
      {modal?.kind === "create" && (
        <Modal title="Buat Sesi Presensi Baru" onClose={() => setModal(null)}>
          <Form
            draftKey={`att-create-${classId}`}
            onSubmit={async (f) => {
              await api(`/course-classes/${classId}/attendance`, "POST", {
                title: textValue(f, "title"),
                description: textValue(f, "description") || undefined,
                sessionDate: new Date().toISOString(),
                isOpen: true,
                allowSelfCheckIn: true,
              });
              setModal(null);
              setMessage("Sesi presensi baru berhasil dibuat dan dibuka.");
              sessionsApi.reload();
            }}
          >
            <Field label="Judul Sesi Presensi">
              <input
                name="title"
                required
                defaultValue={`Pertemuan ${sessions.length + 1} - Kuliah Tatap Muka`}
                placeholder="Contoh: Pertemuan 1 - Pengantar Web"
              />
            </Field>
            <Field label="Keterangan / Topik (Opsional)">
              <textarea name="description" rows={3} placeholder="Materi perkuliahan atau pengumuman ruangan..." />
            </Field>
          </Form>
        </Modal>
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
                Kode Presensi 6-Digit
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
                Masukkan kode akses 6 digit yang ditampilkan oleh dosen di ruang kelas.
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
        </Modal>
      )}
    </div>
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
            {list.map((m) => (
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
// Rekapitulasi Kehadiran Kelas & Syarat Ujian (>= 75%)
// ---------------------------------------------------------------------------
function AttendanceRecapTable({ classId }: { classId: string }) {
  const recapApi = useApi<{
    totalSessions: number;
    sessions: any[];
    recap: any[];
  }>(`/course-classes/${classId}/attendance/recap`);

  if (recapApi.loading && !recapApi.data) return <Loading />;
  if (recapApi.error) return <Notice error={recapApi.error} />;

  const data = recapApi.data!;
  const students = data.recap || [];

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
            Total Pertemuan Berlangsung: <strong>{data.totalSessions} Sesi</strong> | Ambang Batas Ujian: <strong>75%</strong>
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
              students.map((item) => (
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
                        Terancam Gugur (&lt; 75%)
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
    </div>
  );
}

export default Attendance;
