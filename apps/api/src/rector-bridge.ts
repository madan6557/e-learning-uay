import type { Express, RequestHandler } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { db, ensure } from "./core.js";
import { authenticate } from "./auth.js";

type SnapshotItem = {
  id: string; title: string; kind: "PERTEMUAN" | "MATERI" | "TUGAS" | "KUIS";
  visible: boolean; status: "TERBIT" | "DRAF"; questionCount?: number;
};
type SnapshotGrading = {
  id: string; title: string; kind: "TUGAS" | "KUIS_OTOMATIS"; current: boolean;
  total: number; graded: number; published: number; pendingSince: string | null;
  lastGradedAt: string | null; lastPublishedAt: string | null;
};

const authorizeRectorBridge: RequestHandler = async (req, res, next) => {
  const token = req.get("X-Rector-Bridge-Token") || req.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const secret = process.env.RECTOR_BRIDGE_TOKEN;
    ensure(secret && timingSafeEqual(createHash("sha256").update(token).digest(),
      createHash("sha256").update(secret).digest()), 401, "RECTOR_BRIDGE_UNAUTHORIZED");
    next();
    return;
  }
  await authenticate(req, res, () => {
    ensure(req.context.user.role === "SUPER_ADMIN", 401, "RECTOR_BRIDGE_UNAUTHORIZED");
    next();
  });
};

export function registerRectorBridgeRoutes(app: Express) {
  app.get("/api/v1/integrations/rector/snapshot", authorizeRectorBridge, async (_req, res) => {
    const now = new Date();

    // 1. Ambil daftar dosen (Instructors)
    const lecturers = await db.user.findMany({
      where: {
        OR: [{ role: "INSTRUCTOR" }, { userType: "LECTURER" }],
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        identifierValue: true,
        departmentScopes: true,
      },
    });

    const mappedLecturers = lecturers.map((l) => ({
      id: l.id,
      name: l.name,
      identifier: l.identifierValue,
      department: l.departmentScopes[0] || "IF",
    }));

    // 2. Ambil daftar kelas aktif dan materi/tugas/kuis
    const classes = await db.courseClass.findMany({
      include: {
        course: { select: { code: true, departmentCode: true, title: true } },
        instructors: { select: { userId: true } },
        sections: {
          select: {
            id: true,
            title: true,
            type: true,
            isVisible: true,
            resources: { select: { id: true, title: true, isVisible: true } },
            assignments: {
              select: {
                id: true,
                title: true,
                isVisible: true,
                submissions: { select: { id: true, status: true, score: true } },
              },
            },
            quizzes: {
              select: {
                id: true,
                title: true,
                status: true,
                questions: { select: { id: true } },
                attempts: { select: { id: true, status: true, score: true } },
              },
            },
          },
        },
      },
    });

    const mappedClasses = classes.map((c) => {
      const items: SnapshotItem[] = [];
      const grading: SnapshotGrading[] = [];

      for (const sec of c.sections) {
        items.push({
          id: sec.id,
          title: sec.title,
          kind: "PERTEMUAN",
          visible: sec.isVisible,
          status: sec.isVisible ? "TERBIT" : "DRAF",
        });

        for (const r of sec.resources) {
          items.push({
            id: r.id,
            title: r.title,
            kind: "MATERI",
            visible: r.isVisible,
            status: r.isVisible ? "TERBIT" : "DRAF",
          });
        }

        for (const a of sec.assignments) {
          items.push({
            id: a.id,
            title: a.title,
            kind: "TUGAS",
            visible: a.isVisible,
            status: a.isVisible ? "TERBIT" : "DRAF",
          });

          const total = a.submissions.length;
          const graded = a.submissions.filter((s) => s.status === "GRADED").length;
          grading.push({
            id: a.id,
            title: a.title,
            kind: "TUGAS",
            current: true,
            total,
            graded,
            published: graded,
            pendingSince: total > graded ? now.toISOString() : null,
            lastGradedAt: graded > 0 ? now.toISOString() : null,
            lastPublishedAt: graded > 0 ? now.toISOString() : null,
          });
        }

        for (const q of sec.quizzes) {
          items.push({
            id: q.id,
            title: q.title,
            kind: "KUIS",
            visible: q.status === "PUBLISHED",
            status: q.status === "PUBLISHED" ? "TERBIT" : "DRAF",
            questionCount: q.questions.length,
          });

          const total = q.attempts.length;
          const graded = q.attempts.filter((att) => att.status === "GRADED").length;
          grading.push({
            id: q.id,
            title: q.title,
            kind: "KUIS_OTOMATIS",
            current: true,
            total,
            graded,
            published: graded,
            pendingSince: null,
            lastGradedAt: graded > 0 ? now.toISOString() : null,
            lastPublishedAt: graded > 0 ? now.toISOString() : null,
          });
        }
      }

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

    // 3. Ambil aktivitas audit log terbaru untuk telemetri rektor
    const auditLogs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    const categoryMap: Record<string, string> = {
      CREATE: "MATERI",
      UPDATE: "MATERI",
      LOGIN: "LOGIN",
      LOGOUT: "LOGOUT",
      GRADE: "PENILAIAN",
      PUBLISH: "PUBLIKASI",
      ENROLL: "KELAS",
      CLONE_CLASS: "KELAS",
    };

    const activities = auditLogs.map((log) => ({
      id: log.id,
      at: log.createdAt.toISOString(),
      completedAt: log.createdAt.toISOString(),
      sessionId: null,
      actorId: log.actorId || "system",
      actorName: log.user?.name || "System",
      actorKind: log.actorRole === "INSTRUCTOR" ? "DOSEN" : log.actorRole === "SUPER_ADMIN" ? "ADMIN" : "SISTEM",
      category: categoryMap[log.action] || "AKSES",
      action: log.action,
      objectId: log.entityId || log.id,
      objectName: log.entity || "Entity",
      classId: log.classId || null,
      semester: null,
      department: null,
    }));

    // 4. Sesi login dosen
    const recentLecturerLogins = await db.user.findMany({
      where: {
        OR: [{ role: "INSTRUCTOR" }, { userType: "LECTURER" }],
        lastLoginAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        lastLoginAt: true,
        departmentScopes: true,
      },
      orderBy: [{ lastLoginAt: "desc" }, { id: "asc" }],
      take: 50,
    });

    const sessions = recentLecturerLogins.map((l) => ({
      id: `session-${l.id}`,
      lecturerId: l.id,
      lecturerName: l.name,
      department: l.departmentScopes[0] || "IF",
      semester: "2026/2027 Ganjil",
      loginAt: l.lastLoginAt ? l.lastLoginAt.toISOString() : now.toISOString(),
      logoutAt: null,
      lastObservedAt: l.lastLoginAt ? l.lastLoginAt.toISOString() : now.toISOString(),
      endReason: "UNKNOWN" as const,
    }));

    res.json({
      snapshotAt: now.toISOString(),
      lecturers: mappedLecturers,
      classes: mappedClasses,
      activities,
      sessions,
    });
  });
}
