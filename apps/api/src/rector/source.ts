import { db } from "../core.js";
import type {
  Activity,
  ActivityCategory,
  GradingWork,
  ReportingClass,
  ReportingDataSource,
  ReportingSnapshot,
} from "../../../../packages/shared/src/rector.js";
import { FixtureDataSource } from "./fixture.js";

const DEPT_MAP: Record<string, string> = {
  IF: "Informatika",
  TS: "Teknik Sipil",
  AK: "Akuntansi",
  MN: "Manajemen",
  Informatika: "Informatika",
  "Teknik Sipil": "Teknik Sipil",
  Akuntansi: "Akuntansi",
  Manajemen: "Manajemen",
};

export function normalizeDept(codeOrName?: string | null): string {
  if (!codeOrName) return "Belum ditetapkan";
  return DEPT_MAP[codeOrName] ?? codeOrName;
}

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
const earliest = (dates: (Date | null)[]) =>
  dates.filter((d): d is Date => !!d).sort((a, b) => +a - +b)[0] ?? null;
const latest = (dates: (Date | null)[]) =>
  dates.filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0] ?? null;

/** Only aggregates leave this projection. Student names, scores and answers are never selected. */
export class UniversityReportingDataSource implements ReportingDataSource {
  private static cachedSnapshot: { snapshot: ReportingSnapshot; expires: number } | null = null;
  private static inFlight: Promise<ReportingSnapshot> | null = null;
  private readonly ttlMs: number;

  constructor(options?: { ttlMs?: number }) {
    // In test environment, default ttl is 0 so tests with sequential db mutations see fresh data.
    // In production and dev, default ttl is 60 seconds (60_000ms).
    const defaultTtl = process.env.NODE_ENV === "test" ? 0 : 60_000;
    this.ttlMs = options?.ttlMs ?? defaultTtl;
  }

  static invalidateCache() {
    UniversityReportingDataSource.cachedSnapshot = null;
    UniversityReportingDataSource.inFlight = null;
  }

  async readSnapshot(options?: { forceRefresh?: boolean }): Promise<ReportingSnapshot> {
    const now = Date.now();
    if (!options?.forceRefresh && this.ttlMs > 0 && UniversityReportingDataSource.cachedSnapshot) {
      if (UniversityReportingDataSource.cachedSnapshot.expires > now) {
        return UniversityReportingDataSource.cachedSnapshot.snapshot;
      }
    }

    if (UniversityReportingDataSource.inFlight) {
      return UniversityReportingDataSource.inFlight;
    }

    const promise = this.fetchSnapshot();
    UniversityReportingDataSource.inFlight = promise;
    try {
      const result = await promise;
      if (this.ttlMs > 0) {
        UniversityReportingDataSource.cachedSnapshot = {
          snapshot: result,
          expires: Date.now() + this.ttlMs,
        };
      }
      return result;
    } finally {
      UniversityReportingDataSource.inFlight = null;
    }
  }

  private async fetchSnapshot(): Promise<ReportingSnapshot> {
    return db.$transaction(
      async (tx) => {
        const now = new Date();
        const lecturers = await tx.user.findMany({
          where: { role: "INSTRUCTOR", status: "ACTIVE" },
          select: {
            id: true,
            name: true,
            identifierValue: true,
            departmentScopes: true,
            lastLoginAt: true,
          },
          orderBy: { name: "asc" },
        });
        const classes = await tx.courseClass.findMany({
          select: {
            id: true,
            name: true,
            academicYear: true,
            status: true,
            course: {
              select: { title: true, code: true, departmentCode: true },
            },
            instructors: { select: { userId: true } },
            enrollments: { where: { isActive: true }, select: { id: true } },
            finalGrades: { select: { publishedAt: true, updatedAt: true } },
            announcements: {
              select: { id: true, title: true, isPublished: true },
            },
            sections: {
              select: {
                id: true,
                title: true,
                isVisible: true,
                resources: {
                  select: { id: true, title: true, isVisible: true },
                },
                assignments: {
                  select: {
                    id: true,
                    title: true,
                    isVisible: true,
                    submissions: {
                      where: { status: { not: "SUPERSEDED" } },
                      orderBy: { version: "desc" },
                      distinct: ["userId"],
                      select: {
                        status: true,
                        isPublished: true,
                        submittedAt: true,
                        gradedAt: true,
                      },
                    },
                  },
                },
                quizzes: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    questions: { select: { type: true } },
                    attempts: {
                      where: { submittedAt: { not: null } },
                      orderBy: { attemptNum: "desc" },
                      distinct: ["userId"],
                      select: {
                        isGraded: true,
                        publishedAt: true,
                        submittedAt: true,
                        answerGrades: { select: { gradedAt: true } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { id: "asc" },
        });
        const mapped: ReportingClass[] = classes.map((c) => {
          const items: ReportingClass["items"] = [];
          const grading: GradingWork[] = [];
          for (const sec of c.sections) {
            items.push({
              id: sec.id,
              title: sec.title,
              kind: "PERTEMUAN",
              visible: sec.isVisible,
              status: sec.isVisible ? "TERBIT" : "DRAF",
            });
            for (const r of sec.resources)
              items.push({
                id: r.id,
                title: r.title,
                kind: "MATERI",
                visible: r.isVisible,
                status: r.isVisible ? "TERBIT" : "DRAF",
              });
            for (const a of sec.assignments) {
              items.push({
                id: a.id,
                title: a.title,
                kind: "TUGAS",
                visible: a.isVisible,
                status: a.isVisible ? "TERBIT" : "DRAF",
              });
              const graded = a.submissions.filter((s) => s.status === "GRADED");
              grading.push({
                id: a.id,
                title: a.title,
                kind: "TUGAS",
                current: true,
                total: a.submissions.length,
                graded: graded.length,
                published: graded.filter((s) => s.isPublished).length,
                pendingSince: iso(
                  earliest(
                    a.submissions
                      .filter((s) => s.status !== "GRADED")
                      .map((s) => s.submittedAt),
                  ),
                ),
                lastGradedAt: iso(latest(graded.map((s) => s.gradedAt))),
                lastPublishedAt: null,
              });
            }
            for (const q of sec.quizzes) {
              const manual = q.questions.some((q) =>
                ["ESSAY", "FILE_UPLOAD"].includes(q.type),
              );
              items.push({
                id: q.id,
                title: q.title,
                kind: "KUIS",
                visible: q.status === "PUBLISHED",
                status: q.status === "PUBLISHED" ? "TERBIT" : "DRAF",
                questionCount: q.questions.length,
              });
              const graded = q.attempts.filter((a) => a.isGraded);
              grading.push({
                id: q.id,
                title: q.title,
                kind: manual ? "KUIS_MANUAL" : "KUIS_OTOMATIS",
                current: true,
                total: q.attempts.length,
                graded: graded.length,
                published: graded.filter((a) => a.publishedAt).length,
                pendingSince: iso(
                  earliest(
                    q.attempts
                      .filter((a) => !a.isGraded)
                      .map((a) => a.submittedAt),
                  ),
                ),
                lastGradedAt: manual
                  ? iso(
                      latest(
                        graded.flatMap((a) =>
                          a.answerGrades.map((g) => g.gradedAt),
                        ),
                      ),
                    )
                  : null,
                lastPublishedAt: iso(latest(graded.map((a) => a.publishedAt))),
              });
            }
          }
          for (const a of c.announcements)
            items.push({
              id: a.id,
              title: a.title,
              kind: "PENGUMUMAN",
              visible: a.isPublished,
              status: a.isPublished ? "TERBIT" : "DRAF",
            });
          if (c.enrollments.length || c.finalGrades.length)
            grading.push({
              id: `final-${c.id}`,
              title: "Nilai akhir kelas",
              kind: "NILAI_AKHIR",
              current: true,
              total: Math.max(c.enrollments.length, c.finalGrades.length),
              graded: c.finalGrades.length,
              published: c.finalGrades.filter((g) => g.publishedAt).length,
              pendingSince: null,
              lastGradedAt: iso(latest(c.finalGrades.map((g) => g.updatedAt))),
              lastPublishedAt: iso(
                latest(c.finalGrades.map((g) => g.publishedAt)),
              ),
            });
          return {
            id: c.id,
            title: `${c.course.title} (${c.name})`,
            courseCode: c.course.code,
            department: normalizeDept(c.course.departmentCode),
            semester: c.academicYear,
            status: c.status === "ARCHIVED" ? "ARSIP" : "AKTIF",
            instructorIds: c.instructors.map((i) => i.userId),
            items,
            grading,
          };
        });
        const classMap = new Map(mapped.map((c) => [c.id, c]));
        const objects = new Map(
          mapped.flatMap((c) => c.items.map((i) => [i.id, i.title] as const)),
        );
        const logs = await tx.auditLog.findMany({
          where: {
            result: "SUCCESS",
            actorRole: { notIn: ["STUDENT", "RECTOR"] },
            createdAt: { gte: new Date(+now - 730 * 86400000) },
            OR: [
              { classId: { not: null } },
              { action: { in: ["LOGIN", "LOGOUT"] } },
            ],
          },
          select: {
            id: true,
            createdAt: true,
            actorId: true,
            actorRole: true,
            action: true,
            entity: true,
            entityId: true,
            classId: true,
            user: { select: { name: true } },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        const activities: Activity[] = [];
        const lecturerMap = new Map(lecturers.map((l) => [l.id, l]));
        for (const log of logs) {
          // Student events are outside lecturer contribution and are never sent to reporting.
          if (log.actorRole === "STUDENT" || log.actorRole === "RECTOR")
            continue;
          const cls = log.classId ? classMap.get(log.classId) : undefined;
          const lecturer = log.actorId ? lecturerMap.get(log.actorId) : undefined;
          const classification = classify(log.action, log.entity);
          if (!classification) continue;
          activities.push({
            id: log.id,
            at: log.createdAt.toISOString(),
            completedAt: null,
            sessionId: null,
            actorId: log.actorId ?? "system",
            actorName: log.user?.name ?? lecturer?.name ?? "Proses otomatis",
            actorKind:
              log.actorRole === "INSTRUCTOR"
                ? "DOSEN"
                : ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(log.actorRole)
                  ? "ADMIN"
                  : "SISTEM",
            category: classification.category,
            action: classification.label,
            objectId: log.entityId,
            objectName:
              objects.get(log.entityId) ?? cls?.title ?? classification.label,
            classId: cls?.id ?? null,
            semester: cls?.semester ?? null,
            department:
              cls?.department ??
              (lecturer ? normalizeDept(lecturer.departmentScopes[0]) : null),
          });
        }

        const sessions: ReportingSnapshot["sessions"] = [];
        for (const l of lecturers) {
          const dept = normalizeDept(l.departmentScopes[0]);
          const semester =
            mapped.find((c) => c.instructorIds.includes(l.id))?.semester ?? "";
          const lecturerActivities = activities.filter((a) => a.actorId === l.id);

          const loginTimestamps = new Set<string>();
          for (const a of lecturerActivities) {
            if (a.category === "LOGIN") loginTimestamps.add(a.at);
          }
          if (l.lastLoginAt) {
            loginTimestamps.add(l.lastLoginAt.toISOString());
          }

          const sortedLogins = [...loginTimestamps].sort();
          if (sortedLogins.length === 0 && lecturerActivities.length > 0) {
            sortedLogins.push(lecturerActivities[0].at);
          }

          for (let i = 0; i < sortedLogins.length; i++) {
            const loginAt = sortedLogins[i];
            const nextLoginAt = sortedLogins[i + 1] ?? null;
            const sessionId = `session-${l.id}-${Date.parse(loginAt)}`;

            const sessionEvents = lecturerActivities.filter(
              (a) => a.at >= loginAt && (!nextLoginAt || a.at < nextLoginAt),
            );

            const logout = sessionEvents.find((a) => a.category === "LOGOUT");
            const end = logout?.at ?? sessionEvents.at(-1)?.at ?? loginAt;

            for (const event of sessionEvents.filter((a) => a.at <= end)) {
              if (!event.sessionId) {
                event.sessionId = sessionId;
              }
            }

            if (!lecturerActivities.some((a) => a.category === "LOGIN" && a.at === loginAt)) {
              activities.push({
                id: `login-${sessionId}`,
                at: loginAt,
                completedAt: null,
                sessionId,
                actorId: l.id,
                actorName: l.name,
                actorKind: "DOSEN",
                category: "LOGIN",
                action: "Masuk ke e-learning",
                objectId: sessionId,
                objectName: "E-learning UAY",
                classId: null,
                semester: null,
                department: dept,
              });
            }

            sessions.push({
              id: sessionId,
              lecturerId: l.id,
              lecturerName: l.name,
              department: dept,
              semester,
              loginAt,
              logoutAt: logout?.at ?? null,
              lastObservedAt: end,
              endReason: logout ? "LOGOUT" : "UNKNOWN",
            });
          }
        }

        return {
          snapshotAt: now.toISOString(),
          lecturers: lecturers.map((l) => ({
            id: l.id,
            name: l.name,
            identifier: l.identifierValue,
            department: normalizeDept(l.departmentScopes[0]),
          })),
          classes: mapped,
          activities,
          sessions,
        };
      },
      { isolationLevel: "RepeatableRead", timeout: 30000 },
    );
  }
}

export function classify(
  action: string,
  entity: string,
): { category: ActivityCategory; label: string } | null {
  if (action === "LOGIN")
    return { category: "LOGIN", label: "Masuk ke e-learning" };
  if (action === "LOGOUT")
    return { category: "LOGOUT", label: "Keluar dari e-learning" };
  if (
    action.includes("PUBLISH") &&
    /GRADE|QUIZ_ATTEMPT|SUBMISSION/.test(entity)
  )
    return {
      category: "PUBLIKASI",
      label: "Membagikan nilai kepada mahasiswa",
    };
  if (action === "ACCESS" || action === "VIEW")
    return { category: "AKSES", label: "Membuka kelas perkuliahan" };
  if (/CORRECT|OVERRIDE|REOPEN|RESET/.test(action))
    return { category: "KOREKSI", label: "Mengoreksi catatan akademik" };
  if (/GRADE|GRADING/.test(action))
    return { category: "PENILAIAN", label: "Melakukan penilaian" };
  if (
    entity === "RESOURCE" &&
    ["CREATE", "UPDATE", "DELETE", "PUBLISH", "UNPUBLISH"].includes(action)
  )
    return {
      category: "MATERI",
      label: action === "CREATE" ? "Menambahkan materi" : "Memperbarui materi",
    };
  if (
    ["QUIZ", "QUESTION", "ASSIGNMENT"].includes(entity) &&
    /CREATE|UPDATE|DELETE|PUBLISH|IMPORT/.test(action)
  )
    return {
      category: "ASESMEN",
      label:
        action === "CREATE"
          ? "Menyiapkan tugas atau kuis"
          : "Memperbarui tugas atau kuis",
    };
  if (entity === "ANNOUNCEMENT")
    return { category: "PENGUMUMAN", label: "Memperbarui pengumuman kelas" };
  if (
    ["CLASS", "SECTION"].includes(entity) &&
    /CREATE|UPDATE|CLONE|PUBLISH|ASSIGN/.test(action)
  )
    return { category: "KELAS", label: "Memperbarui pengelolaan kelas" };
  if (entity.startsWith("ATTENDANCE"))
    return { category: "KELAS", label: "Mengelola presensi perkuliahan" };
  return null;
}

export class DynamicReportingDataSource implements ReportingDataSource {
  constructor(
    private readonly allowFixtureFallback: boolean,
    private readonly universitySource: ReportingDataSource = new UniversityReportingDataSource(),
    private readonly fixtureSource: ReportingDataSource = new FixtureDataSource(),
  ) {}

  async readSnapshot(): Promise<ReportingSnapshot> {
    try {
      const snapshot = await this.universitySource.readSnapshot();
      if (
        !this.allowFixtureFallback ||
        snapshot.lecturers.length > 0 ||
        snapshot.classes.length > 0
      ) {
        return snapshot;
      }
    } catch (err) {
      if (!this.allowFixtureFallback) throw err;
      console.warn("[rector] UniversityReportingDataSource failed, fallback to fixture:", err);
    }
    return this.fixtureSource.readSnapshot();
  }
}
