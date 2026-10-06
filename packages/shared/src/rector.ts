/** Reporting contract. Contains aggregate academic evidence, never student records. */
export type ActorKind = "DOSEN" | "ADMIN" | "SISTEM";
export type ActivityCategory =
  | "LOGIN"
  | "LOGOUT"
  | "AKSES"
  | "MATERI"
  | "ASESMEN"
  | "PENILAIAN"
  | "PUBLIKASI"
  | "KOREKSI"
  | "PENGUMUMAN"
  | "KELAS";
export interface ReportFilters {
  semester?: string;
  from?: string;
  to?: string;
  department?: string;
  lecturer?: string;
  classId?: string;
  search?: string;
  category?: ActivityCategory;
  actorKind?: ActorKind;
  sessionId?: string;
}
export interface SnapshotMeta {
  demo: boolean;
  snapshotAt: string;
  responseAt: string;
  refreshSeconds: 300;
}
export interface Lecturer {
  id: string;
  name: string;
  identifier: string;
  department: string;
}
export interface Activity {
  id: string;
  at: string;
  /** Recorded action interval. Null means only an event timestamp is known. */
  completedAt?: string | null;
  sessionId?: string | null;
  actorId: string;
  actorName: string;
  actorKind: ActorKind;
  category: ActivityCategory;
  action: string;
  objectId: string;
  objectName: string;
  classId: string | null;
  semester: string | null;
  department: string | null;
}
/** Connection evidence, never a measurement of teaching or working time. */
export interface LoginSession {
  id: string;
  lecturerId: string;
  lecturerName: string;
  department: string;
  semester: string;
  loginAt: string;
  logoutAt: string | null;
  lastObservedAt: string;
  endReason: "LOGOUT" | "TIMEOUT" | "UNKNOWN";
}
export interface TeachingItem {
  id: string;
  title: string;
  kind: "PERTEMUAN" | "MATERI" | "BANK_SOAL" | "TUGAS" | "KUIS" | "PENGUMUMAN";
  visible: boolean;
  status: "DRAF" | "TERBIT";
  questionCount?: number;
}
export interface GradingWork {
  id: string;
  title: string;
  kind: "TUGAS" | "KUIS_MANUAL" | "KUIS_OTOMATIS" | "NILAI_AKHIR";
  current: boolean;
  total: number;
  graded: number;
  published: number;
  pendingSince: string | null;
  lastGradedAt: string | null;
  lastPublishedAt: string | null;
}
export interface ReportingClass {
  id: string;
  title: string;
  courseCode: string;
  department: string;
  semester: string;
  status: "AKTIF" | "ARSIP";
  instructorIds: string[];
  items: TeachingItem[];
  grading: GradingWork[];
}
export interface ReportingSnapshot {
  snapshotAt: string;
  lecturers: Lecturer[];
  classes: ReportingClass[];
  activities: Activity[];
  sessions: LoginSession[];
}
export interface ReportingDataSource {
  readSnapshot(): Promise<ReportingSnapshot>;
}
export interface ActivityMetrics {
  logins: number;
  accesses: number;
  academicActions: number;
  activeDays: number;
  materialActions: number;
  materialObjects: number;
  assessmentActions: number;
  assessmentObjects: number;
  gradingActions: number;
  publicationActions: number;
  correctionActions: number;
  lastLoginAt: string | null;
  lastAcademicAt: string | null;
}
export interface GradingMetrics {
  total: number;
  graded: number;
  pending: number;
  published: number;
  percentage: number | null;
  oldestPendingDays: number | null;
  automaticGraded: number;
}
export interface LecturerRow extends Lecturer, ActivityMetrics {
  classCount: number;
  pending: number;
}
export interface Summary {
  lecturerCount: number;
  classCount: number;
  loggedInLecturers: number;
  academicallyActiveLecturers: number;
  materialCount: number;
  assignmentCount: number;
  quizCount: number;
  activity: ActivityMetrics;
  grading: GradingMetrics;
  daily: { date: string; academic: number; login: number; access: number }[];
  sessions: LoginSession[];
  departments: {
    department: string;
    lecturers: number;
    classes: number;
    academicActions: number;
    pending: number;
  }[];
}
export interface FilterOptions {
  semesters: string[];
  departments: string[];
  lecturers: Lecturer[];
  classes: Pick<
    ReportingClass,
    "id" | "title" | "semester" | "department" | "instructorIds"
  >[];
  defaultFilters: ReportFilters;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface LecturerDetail {
  lecturer: LecturerRow;
  classes: {
    class: ReportingClass;
    contribution: ActivityMetrics;
    grading: GradingMetrics;
  }[];
  activities: Activity[];
  sessions: LoginSession[];
}
export interface ClassDetail {
  class: ReportingClass;
  instructors: Lecturer[];
  contributions: { lecturer: Lecturer; metrics: ActivityMetrics }[];
  grading: GradingMetrics;
  activities: Activity[];
}
export interface ReportResponse<T> {
  data: T;
  meta: SnapshotMeta;
}
export const INDICATOR_DEFINITIONS = [
  "Masuk ke e-learning belum berarti mengajar. Lihat juga materi, tugas, kuis, dan penilaian yang dikerjakan dosen.",
  "Kegiatan dosen ditampilkan sesuai tanggal yang dipilih. Pada kelas bersama, kegiatan dicatat atas nama dosen yang mengerjakannya.",
  "Pekerjaan belum dinilai menunjukkan kiriman mahasiswa yang masih menunggu penilaian. Jika mahasiswa mengirim ulang, hanya kiriman terbaru yang dihitung.",
  "Nilai sudah dibagikan berarti mahasiswa sudah dapat melihat hasilnya. Nilai yang masih disimpan dosen sebagai draf belum termasuk.",
  "Jumlah masuk dihitung ketika dosen berhasil masuk. Perpanjangan akses secara otomatis tidak menambah jumlah ini.",
  "Rentang sesi memakai login dan logout yang tercatat. Logout yang tidak tercatat tidak diperkirakan. Waktu terhubung dan durasi tindakan bukan durasi kerja dosen.",
  "Akses kelas tidak membuktikan pelaksanaan perkuliahan. Durasi kerja tidak diukur.",
  "Aktivitas akademik dihitung menurut pelaku dan rentang tanggal. Admin dan sistem dipisahkan.",
  "Tindakan dan objek berbeda: lima perubahan pada satu materi = lima tindakan, satu objek.",
  "Jumlah materi, kelas, dan pekerjaan yang belum dinilai menunjukkan keadaan pada tanggal data terakhir. Angka tersebut bukan jumlah kegiatan baru.",
  "Antrean tugas hanya memakai kiriman terbaru; versi yang digantikan dikecualikan.",
  "Penilaian otomatis kuis dipisahkan dari pekerjaan penilaian manual.",
  "Persentase nilai yang sudah dibagikan membandingkan pekerjaan yang hasilnya sudah dapat dilihat mahasiswa dengan seluruh pekerjaan penilaian dosen dan nilai akhir. Jika belum ada pekerjaan, tertulis Belum ada data.",
  "Pada kelas bersama, antrean adalah tanggung jawab kelas; bukan pekerjaan pribadi masing-masing pengampu.",
  "Login tanpa konteks kelas ditampilkan untuk dosen yang cocok dengan filter; semester/prodi/kelas tidak mengubahnya menjadi login kelas.",
];
