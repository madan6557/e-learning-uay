import { useState } from "react";
import {
  t,
  api,
  useApi,
  Loading,
  Notice,
  Empty,
  Action,
  date,
} from "../../lib";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Admin Utama",
  DEPARTMENT_ADMIN: "Admin Program Studi",
  INSTRUCTOR: "Dosen Pengampu",
  STUDENT: "Mahasiswa",
};

const ENTITY_LABELS: Record<string, string> = {
  SECTION: "Pertemuan",
  ClassSection: "Pertemuan",
  RESOURCE: "Materi Pembelajaran",
  ResourceItem: "Materi Pembelajaran",
  ANNOUNCEMENT: "Pengumuman",
  Announcement: "Pengumuman",
  ASSIGNMENT: "Tugas",
  Assignment: "Tugas",
  SUBMISSION: "Pengumpulan Tugas",
  AssignmentSubmission: "Pengumpulan Tugas",
  QUIZ: "Kuis",
  Quiz: "Kuis",
  ATTEMPT: "Pengerjaan Kuis",
  QuizAttempt: "Pengerjaan Kuis",
  ANSWER_GRADE: "Penilaian Jawaban Kuis",
  QUESTION_BANK: "Bank Soal",
  QuestionBank: "Bank Soal",
  QUESTION: "Butir Soal",
  Question: "Butir Soal",
  ENROLLMENT: "Kepesertaan",
  Enrollment: "Kepesertaan",
  FINAL_GRADE: "Nilai Akhir",
  FinalGrade: "Nilai Akhir",
  CLASS: "Kelas",
  CourseClass: "Kelas",
  COURSE: "Mata Kuliah",
  Course: "Mata Kuliah",
  FILE: "Berkas",
  FileRecord: "Berkas",
  MANUAL_GRADE: "Nilai Manual",
  ATTENDANCE_SESSION: "Sesi Presensi",
};

const ACTION_DESCRIPTIONS: Record<
  string,
  { label: string; tone: "primary" | "success" | "warning" | "info" }
> = {
  ENROLL: { label: "Pendaftaran Mahasiswa", tone: "info" },
  UPDATE_ENROLLMENT: { label: "Pembaruan Status Kepesertaan", tone: "warning" },
  BULK_IMPORT_RECONCILED: { label: "Pencocokan Daftar Peserta", tone: "info" },
  ASSIGN_INSTRUCTORS: { label: "Penetapan Dosen Pengampu", tone: "info" },

  CREATE_SECTION: { label: "Penambahan Pertemuan Baru", tone: "success" },
  UPDATE_SECTION: { label: "Pembaruan Informasi Pertemuan", tone: "info" },
  DELETE_SECTION: { label: "Penghapusan Pertemuan", tone: "warning" },
  REORDER_CLASS: { label: "Penyusunan Ulang Urutan Pertemuan", tone: "info" },
  REORDER: { label: "Penyusunan Ulang Urutan Pertemuan", tone: "info" },

  CREATE_RESOURCE: { label: "Penambahan Materi Pembelajaran", tone: "success" },
  UPDATE_RESOURCE: { label: "Pembaruan Materi Pembelajaran", tone: "info" },

  CREATE_ANNOUNCEMENT: { label: "Pembuatan Pengumuman", tone: "info" },
  UPDATE_ANNOUNCEMENT: { label: "Pembaruan Pengumuman", tone: "info" },

  CREATE_ASSIGNMENT: { label: "Pembuatan Tugas Baru", tone: "success" },
  UPDATE_ASSIGNMENT: { label: "Pembaruan Pengaturan Tugas", tone: "info" },
  SUBMIT_ASSIGNMENT: { label: "Pengumpulan Tugas", tone: "info" },
  RESUBMIT_ASSIGNMENT: { label: "Pengumpulan Ulang Tugas", tone: "info" },
  GRADE_SUBMISSION: { label: "Penilaian Tugas Mahasiswa", tone: "success" },

  CREATE_QUIZ: { label: "Pembuatan Kuis Baru", tone: "success" },
  UPDATE_QUIZ: { label: "Pembaruan Pengaturan Kuis", tone: "info" },
  START_QUIZ: { label: "Pengerjaan Kuis Dimulai", tone: "info" },
  SUBMIT_QUIZ: { label: "Pengumpulan Jawaban Kuis", tone: "info" },
  QUIZ_AUTO_EXPIRE: {
    label: "Pengerjaan Kuis Selesai (Waktu Habis)",
    tone: "warning",
  },
  GRADE_ANSWER: { label: "Penilaian Jawaban Kuis", tone: "info" },
  CREATE_QUESTION_BANK: { label: "Pembuatan Bank Soal", tone: "info" },
  CREATE_QUESTION: { label: "Penambahan Butir Soal", tone: "info" },

  PUBLISH_GRADE: { label: "Publikasi Nilai", tone: "success" },
  PUBLISH_GRADES: { label: "Publikasi Nilai", tone: "success" },
  PUBLISH_GRADEBOOK: { label: "Publikasi Nilai Akhir Kelas", tone: "success" },
  SAVE_GRADE_DRAFT: { label: "Penyimpanan Draf Nilai Akhir", tone: "info" },
  UPDATE_WEIGHTS: { label: "Pembaruan Bobot Nilai", tone: "warning" },
  CORRECT_FINAL_GRADE: { label: "Koreksi Nilai Akhir", tone: "warning" },
  MANUAL_GRADE: { label: "Penginputan Nilai Komponen", tone: "info" },

  PUBLISH: { label: "Publikasi Konten", tone: "success" },
  UNPUBLISH: { label: "Pembatalan Publikasi Konten", tone: "warning" },
  UPDATE_CLASS: { label: "Pembaruan Informasi Kelas", tone: "info" },
  CREATE_CLASS: { label: "Pembuatan Kelas", tone: "success" },
  CLONE_CLASS: { label: "Duplikasi Kelas ke Semester Baru", tone: "info" },
  CLONE: { label: "Duplikasi Kelas", tone: "info" },
  ARCHIVE_CLASS: { label: "Pengarsipan Kelas", tone: "warning" },
  UNARCHIVE_CLASS: { label: "Pembukaan Kembali Kelas", tone: "success" },

  REQUEST_UPLOAD: { label: "Permintaan Unggah Berkas", tone: "info" },
  CONFIRM_UPLOAD: { label: "Konfirmasi Unggah Berkas", tone: "info" },
  TRASH: { label: "Pemindahan Berkas ke Tempat Sampah", tone: "warning" },
  RESTORE: { label: "Pemulihan Berkas dari Tempat Sampah", tone: "info" },
};

const FIELD_LABELS: Record<string, string> = {
  isActive: "Status Partisipasi",
  status: "Status",
  score: "Nilai",
  finalScore: "Nilai Akhir",
  gradeLetter: "Nilai Huruf",
  gradePoint: "Indeks Mutu",
  feedback: "Catatan / Umpan Balik",
  title: "Judul",
  name: "Nama",
  description: "Deskripsi",
  deadline: "Tenggat Waktu",
  availableFrom: "Waktu Mulai Akses",
  availableUntil: "Batas Waktu Akses",
  startDate: "Tanggal Mulai",
  endDate: "Tanggal Selesai",
  maxScore: "Nilai Maksimum",
  passingGrade: "Nilai Kelulusan",
  passingScore: "Nilai Minimum Kelulusan",
  maxAttempts: "Maksimal Percobaan",
  attemptLimit: "Batas Percobaan",
  timeLimit: "Batas Waktu (Menit)",
  weight: "Bobot Penilaian (%)",
  weights: "Bobot Penilaian",
  isVisible: "Ditampilkan ke Mahasiswa",
  isPublished: "Status Publikasi",
  isLocked: "Status Kunci Nilai",
  type: "Jenis",
  academicYear: "Tahun Akademik",
  departmentCode: "Program Studi",
  credits: "SKS",
  fileName: "Nama Berkas",
  fileSizeBytes: "Ukuran Berkas",
  allowLate: "Izinkan Pengumpulan Terlambat",
  maxSubmissions: "Batas Pengumpulan",
};

function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") {
    if (key === "isActive") return val ? "Aktif" : "Dinonaktifkan";
    if (key === "isVisible") return val ? "Ditampilkan" : "Disembunyikan";
    if (key === "isPublished") return val ? "Terbit" : "Draf";
    if (key === "isLocked") return val ? "Terkunci" : "Terbuka";
    return val ? "Ya" : "Tidak";
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      return date(val);
    }
    if ((t.statuses as any)?.[val]) {
      return (t.statuses as any)[val];
    }
    if ((t.sectionTypes as any)?.[val]) {
      return (t.sectionTypes as any)[val];
    }
  }
  if (typeof val === "object") {
    return Array.isArray(val) ? `${val.length} item` : "Data tersimpan";
  }
  return String(val);
}

function getAuditChanges(entry: any) {
  return (entry.changes ?? []).map((change: any) => ({
    field: FIELD_LABELS[change.field] ?? change.field,
    before: change.before === undefined ? undefined : formatFieldValue(change.field, change.before),
    after: formatFieldValue(change.field, change.after),
  }));
}

function getAuditAction(entry: any) {
  const combined = `${entry.action}_${entry.entity}`;
  if (ACTION_DESCRIPTIONS[combined]) return ACTION_DESCRIPTIONS[combined];
  if (ACTION_DESCRIPTIONS[entry.action]) return ACTION_DESCRIPTIONS[entry.action];
  const entityLabel = ENTITY_LABELS[entry.entity] ?? "kelas";
  if (entry.action === "CREATE")
    return { label: `Pembuatan ${entityLabel}`, tone: "success" as const };
  if (entry.action === "UPDATE")
    return { label: `Pembaruan ${entityLabel}`, tone: "info" as const };
  if (entry.action === "DELETE")
    return { label: `Penghapusan ${entityLabel}`, tone: "warning" as const };
  return { label: `Aktivitas ${entityLabel}`, tone: "info" as const };
}

function getAuditActor(entry: any) {
  const roleName =
    ROLE_LABELS[entry.actorRole] ??
    (t.roles as Record<string, string>)[entry.actorRole] ??
    entry.actorRole;
  if (entry.user?.name) {
    return `${entry.user.name} (${roleName})`;
  }
  return roleName;
}

function getAuditTargetTitle(entry: any) {
  return entry.objectTitle || ENTITY_LABELS[entry.entity] || "Aktivitas kelas";
}

export function Audit({ classId }: { classId: string }) {
  const entries = useApi<any[]>(`/course-classes/${classId}/audit`);
  const [hasMore, setHasMore] = useState(true);

  return (
    <>
      <div className="section-heading">
        <h2>Riwayat kegiatan</h2>
      </div>
      {entries.error ? (
        <Notice error={entries.error} />
      ) : entries.loading && !entries.data ? (
        <Loading />
      ) : (
        <div className="audit-list">
          {entries.data?.map((entry) => {
            const actionInfo = getAuditAction(entry);
            const actor = getAuditActor(entry);
            const targetTitle = getAuditTargetTitle(entry);
            const diffs = getAuditChanges(entry);
            const reason =
              typeof entry.reason === "string" ? entry.reason.trim() : "";

            return (
              <article key={entry.id} className="card audit-entry">
                <div className="audit-header">
                  <div className="audit-header-main">
                    <span className={`badge ${actionInfo.tone}`}>
                      {actionInfo.label}
                    </span>
                    <h3 className="audit-target-title">{targetTitle}</h3>
                    <div className="audit-meta">
                      <span className="audit-actor">{actor}</span>
                      <span className="audit-dot">·</span>
                      <time className="audit-time">{date(entry.createdAt)}</time>
                    </div>
                  </div>
                </div>

                {reason && (
                  <div className="audit-reason-box">
                    <strong>Catatan:</strong> {reason}
                  </div>
                )}

                {diffs.length > 0 && (
                  <div className="audit-changes-box">
                    <div className="audit-changes-heading">
                      {t.auditChangedFields || "Rincian perubahan data:"}
                    </div>
                    <div className="audit-changes-list">
                      {diffs.map((diff: { field: string; before?: string; after: string }, i: number) => (
                        <div key={i} className="audit-change-row">
                          <span className="audit-field-name">
                            {diff.field}:
                          </span>
                          {diff.before !== undefined && (
                            <>
                              <span className="audit-value-before">
                                {diff.before}
                              </span>
                              <span className="audit-arrow">➔</span>
                            </>
                          )}
                          <span className="audit-value-after">
                            {diff.after}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </article>
            );
          })}
          {hasMore && (entries.data?.length ?? 0) >= 50 && (
            <Action
              run={async () => {
                const next = await api(
                  `/course-classes/${classId}/audit?cursor=${entries.data!.at(-1).id}`,
                );
                entries.setData([...entries.data!, ...next]);
                setHasMore(next.length === 50);
              }}
            >
              {t.more}
            </Action>
          )}
          {!entries.data?.length && <Empty>{t.noAudit}</Empty>}
        </div>
      )}
    </>
  );
}
