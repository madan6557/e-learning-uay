import { db } from "../core.js";
import type {
  Activity,
  ActivityCategory,
  GradingWork,
  ReportingClass,
  ReportingDataSource,
  ReportingSnapshot,
} from "../../../../packages/shared/src/rector.js";
const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
const earliest = (dates: (Date | null)[]) =>
  dates.filter((d): d is Date => !!d).sort((a, b) => +a - +b)[0] ?? null;
const latest = (dates: (Date | null)[]) =>
  dates.filter((d): d is Date => !!d).sort((a, b) => +b - +a)[0] ?? null;

/** Only aggregates leave this projection. Student names, scores and answers are never selected. */
export class UniversityReportingDataSource implements ReportingDataSource {
  async readSnapshot(): Promise<ReportingSnapshot> {
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
            department: c.course.departmentCode,
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
        for (const log of logs) {
          // Student events are outside lecturer contribution and are never sent to reporting.
          if (log.actorRole === "STUDENT" || log.actorRole === "RECTOR")
            continue;
          const cls = log.classId ? classMap.get(log.classId) : undefined;
          const classification = classify(log.action, log.entity);
          if (!classification) continue;
          activities.push({
            id: log.id,
            at: log.createdAt.toISOString(),
            completedAt: null,
            sessionId: null,
            actorId: log.actorId ?? "system",
            actorName: log.user?.name ?? "Proses otomatis",
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
            department: cls?.department ?? null,
          });
        }
        // Older installs only retain the latest successful login. No logout is inferred.
        const sessions: ReportingSnapshot["sessions"] = lecturers
          .filter((l) => l.lastLoginAt)
          .map((l) => {
            const loginAt = l.lastLoginAt!.toISOString();
            const sessionId = `session-${l.id}-${+l.lastLoginAt!}`;
            const events = activities.filter(
              (a) => a.actorId === l.id && a.at >= loginAt,
            );
            const logout = events.find((a) => a.category === "LOGOUT");
            const end = logout?.at ?? events.at(-1)?.at ?? loginAt;
            for (const event of events.filter((a) => a.at <= end))
              event.sessionId = sessionId;
            if (!events.some((a) => a.category === "LOGIN" && a.at === loginAt))
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
                department: l.departmentScopes[0] ?? null,
              });
            return {
              id: sessionId,
              lecturerId: l.id,
              lecturerName: l.name,
              department: l.departmentScopes[0] ?? "Belum ditetapkan",
              semester:
                mapped.find((c) => c.instructorIds.includes(l.id))?.semester ??
                "",
              loginAt,
              logoutAt: logout?.at ?? null,
              lastObservedAt: end,
              endReason: logout ? "LOGOUT" : "UNKNOWN",
            };
          });
        return {
          snapshotAt: now.toISOString(),
          lecturers: lecturers.map((l) => ({
            id: l.id,
            name: l.name,
            identifier: l.identifierValue,
            department: l.departmentScopes[0] ?? "Belum ditetapkan",
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
  return null;
}
