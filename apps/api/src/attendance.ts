import type { Express } from "express";
import { z } from "zod";
import { db, ensure, classAccess, mutate, audit } from "./core.js";
import type { AttendanceStatus } from "@prisma/client";

const statusSchema = z.enum(["PRESENT", "EXCUSED", "SICK", "ABSENT", "LATE"]);

function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function registerAttendanceRoutes(app: Express) {
  // 1. GET /api/v1/course-classes/:id/attendance
  // Mengambil seluruh sesi presensi kelas beserta ringkasan status dan sinkronisasi jadwal otomatis
  app.get("/api/v1/course-classes/:id/attendance", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    const user = req.context.user;
    const now = new Date();

    // Sinkronisasi otomatis sesi terjadwal:
    // 1. Buka otomatis sesi terjadwal yang waktu mulainya telah tiba (startTime <= now) dan belum lewat endTime
    await db.attendanceSession.updateMany({
      where: {
        classId: cls.id,
        isOpen: false,
        startTime: { lte: now },
        OR: [{ endTime: null }, { endTime: { gte: now } }],
      },
      data: { isOpen: true },
    });

    // 2. Tutup otomatis sesi yang telah melewati batas endTime
    await db.attendanceSession.updateMany({
      where: {
        classId: cls.id,
        isOpen: true,
        endTime: { lt: now },
      },
      data: { isOpen: false },
    });

    const sessions = await db.attendanceSession.findMany({
      where: { classId: cls.id },
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
      include: {
        section: {
          select: { id: true, title: true, order: true },
        },
        records: {
          select: {
            id: true,
            userId: true,
            status: true,
            checkedInAt: true,
            notes: true,
          },
        },
      },
    });

    const activeEnrollments = await db.enrollment.findMany({
      where: { classId: cls.id, isActive: true },
      select: { userId: true },
    });
    const totalStudents = activeEnrollments.length;

    const formatted = sessions.map((s) => {
      const myRecord = s.records.find((r) => r.userId === user.id) || null;
      const presentCount = s.records.filter((r) => r.status === "PRESENT").length;
      const excusedCount = s.records.filter((r) => r.status === "EXCUSED").length;
      const sickCount = s.records.filter((r) => r.status === "SICK").length;
      const absentCount = s.records.filter((r) => r.status === "ABSENT").length;
      const lateCount = s.records.filter((r) => r.status === "LATE").length;

      const isScheduled = Boolean(!s.isOpen && s.startTime && now < s.startTime);
      const isLive = Boolean(s.isOpen && (!s.endTime || now <= s.endTime));
      const isExpired = Boolean(s.endTime && now > s.endTime);

      return {
        id: s.id,
        classId: s.classId,
        sectionId: s.sectionId,
        section: s.section,
        title: s.title,
        description: s.description,
        sessionDate: s.sessionDate,
        startTime: s.startTime,
        endTime: s.endTime,
        isOpen: s.isOpen,
        isScheduled,
        isLive,
        isExpired,
        requiresCode: Boolean(s.checkInCode && s.checkInCode.trim().length > 0),
        // Sembunyikan kode jika mahasiswa dan sesi ditutup
        checkInCode: cls.canManage || s.isOpen ? s.checkInCode : undefined,
        allowSelfCheckIn: s.allowSelfCheckIn,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        myRecord: myRecord
          ? {
              status: myRecord.status,
              checkedInAt: myRecord.checkedInAt,
              notes: myRecord.notes,
            }
          : null,
        stats: cls.canManage
          ? {
              totalStudents,
              presentCount,
              excusedCount,
              sickCount,
              absentCount,
              lateCount,
            }
          : undefined,
      };
    });

    res.json(formatted);
  });

  // 2. POST /api/v1/course-classes/:id/attendance
  // Dosen/Admin membuat sesi presensi baru untuk pertemuan tertentu (Default Tanpa Kode & Dukungan Jadwal)
  app.post("/api/v1/course-classes/:id/attendance", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
        );
        ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
        ensure(cls.course.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");

        const data = z
          .object({
            title: z.string().min(2).max(200),
            description: z.string().max(1000).optional(),
            sectionId: z.string().uuid().nullable().optional(),
            sessionDate: z
              .string()
              .optional()
              .transform((d) => (d ? new Date(d) : new Date())),
            startTime: z
              .string()
              .nullable()
              .optional()
              .transform((d) => (d ? new Date(d) : null)),
            endTime: z
              .string()
              .nullable()
              .optional()
              .transform((d) => (d ? new Date(d) : null)),
            isOpen: z.boolean().optional(),
            allowSelfCheckIn: z.boolean().default(true),
            requireCode: z.boolean().default(false),
            checkInCode: z.string().max(10).optional().nullable(),
          })
          .parse(req.body);

        const now = new Date();

        // Kode presensi: DEFAULT TANPA KODE (null) kecuali requireCode = true atau kode custom diisi
        let code: string | null = null;
        if (data.requireCode || (data.checkInCode && data.checkInCode.trim().length > 0)) {
          code = (
            data.checkInCode && data.checkInCode.trim().length >= 4
              ? data.checkInCode.trim()
              : generateRandomCode()
          ).toUpperCase();
        }

        // Status awal buka sesi:
        // Jika dijadwalkan di masa depan (startTime > now) dan isOpen tidak ditentukan khusus, mulai sebagai terjadwal (false)
        let initialIsOpen = data.isOpen ?? true;
        if (data.startTime && data.startTime > now && data.isOpen === undefined) {
          initialIsOpen = false;
        }

        const session = await tx.attendanceSession.create({
          data: {
            classId: cls.id,
            sectionId: data.sectionId ?? null,
            title: data.title,
            description: data.description ?? null,
            sessionDate: data.sessionDate,
            startTime: data.startTime,
            endTime: data.endTime,
            isOpen: initialIsOpen,
            allowSelfCheckIn: data.allowSelfCheckIn,
            checkInCode: code,
          },
        });

        // Inisialisasi daftar kehadiran mahasiswa aktif sebagai ABSENT secara transaksional
        const enrollments = await tx.enrollment.findMany({
          where: { classId: cls.id, isActive: true },
          select: { userId: true },
        });

        if (enrollments.length > 0) {
          await tx.attendanceRecord.createMany({
            data: enrollments.map((e) => ({
              sessionId: session.id,
              userId: e.userId,
              status: "ABSENT" as AttendanceStatus,
            })),
            skipDuplicates: true,
          });
        }

        await audit(
          tx,
          req.context,
          "CREATE",
          "ATTENDANCE_SESSION",
          session.id,
          cls.id,
          null,
          session,
          `Pembuatan sesi presensi: ${session.title}`,
        );

        return session;
      }),
    ),
  );

  // 3. PATCH /api/v1/attendance/:sessionId
  // Dosen/Admin membuka/menutup sesi, mengubah toleransi waktu, kode, dsb
  app.patch("/api/v1/attendance/:sessionId", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const sessionId = String(req.params.sessionId);
        const session = await tx.attendanceSession.findUnique({
          where: { id: sessionId },
          include: { class: { include: { course: true, instructors: true } } },
        });
        ensure(session, 404, "NOT_FOUND");

        const cls = await classAccess(tx, req.context.user, session.classId);
        ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
        ensure(cls.course.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");

        const data = z
          .object({
            title: z.string().min(2).max(200).optional(),
            description: z.string().max(1000).nullable().optional(),
            sectionId: z.string().uuid().nullable().optional(),
            sessionDate: z
              .string()
              .optional()
              .transform((d) => (d ? new Date(d) : undefined)),
            startTime: z
              .string()
              .nullable()
              .optional()
              .transform((d) => (d ? new Date(d) : null)),
            endTime: z
              .string()
              .nullable()
              .optional()
              .transform((d) => (d ? new Date(d) : null)),
            isOpen: z.boolean().optional(),
            allowSelfCheckIn: z.boolean().optional(),
            requireCode: z.boolean().optional(),
            regenerateCode: z.boolean().optional(),
            checkInCode: z.string().max(10).nullable().optional(),
          })
          .parse(req.body);

        let nextCode = session.checkInCode;
        if (data.requireCode === false) {
          nextCode = null;
        } else if (data.requireCode === true && !nextCode) {
          nextCode = generateRandomCode();
        }

        if (data.regenerateCode) {
          nextCode = generateRandomCode();
        } else if (data.checkInCode !== undefined) {
          nextCode =
            data.checkInCode && data.checkInCode.trim().length > 0
              ? data.checkInCode.trim().toUpperCase()
              : null;
        }

        const updated = await tx.attendanceSession.update({
          where: { id: sessionId },
          data: {
            title: data.title ?? undefined,
            description: data.description !== undefined ? data.description : undefined,
            sectionId: data.sectionId !== undefined ? data.sectionId : undefined,
            sessionDate: data.sessionDate ?? undefined,
            startTime: data.startTime !== undefined ? data.startTime : undefined,
            endTime: data.endTime !== undefined ? data.endTime : undefined,
            isOpen: data.isOpen !== undefined ? data.isOpen : undefined,
            allowSelfCheckIn:
              data.allowSelfCheckIn !== undefined
                ? data.allowSelfCheckIn
                : undefined,
            checkInCode: nextCode,
          },
        });

        await audit(
          tx,
          req.context,
          "UPDATE",
          "ATTENDANCE_SESSION",
          session.id,
          session.classId,
          session,
          updated,
          `Pembaruan sesi presensi: ${updated.title} (Buka: ${updated.isOpen})`,
        );

        return updated;
      }),
    ),
  );

  // 4. GET /api/v1/attendance/:sessionId/records
  // Mengambil daftar seluruh mahasiswa kelas beserta status kehadiran saat ini
  app.get("/api/v1/attendance/:sessionId/records", async (req, res) => {
    const sessionId = String(req.params.sessionId);
    const session = await db.attendanceSession.findUnique({
      where: { id: sessionId },
    });
    ensure(session, 404, "NOT_FOUND");

    const cls = await classAccess(db, req.context.user, session.classId);
    ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");

    // Ambil seluruh mahasiswa yang aktif terdaftar
    const enrollments = await db.enrollment.findMany({
      where: { classId: session.classId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            identifierValue: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const records = await db.attendanceRecord.findMany({
      where: { sessionId },
    });
    const recordMap = new Map(records.map((r) => [r.userId, r]));

    const roster = enrollments.map((e) => {
      const rec = recordMap.get(e.userId);
      return {
        userId: e.user.id,
        name: e.user.name,
        identifierValue: e.user.identifierValue,
        email: e.user.email,
        status: (rec?.status ?? "ABSENT") as AttendanceStatus,
        checkedInAt: rec?.checkedInAt ?? null,
        notes: rec?.notes ?? null,
        verifiedBy: rec?.verifiedBy ?? null,
      };
    });

    res.json({
      session,
      roster,
    });
  });

  // 5. PUT /api/v1/attendance/:sessionId/records/batch
  // Presensi Manual Massal: Menyimpan status seluruh mahasiswa (termasuk "Set Semua Hadir")
  app.put("/api/v1/attendance/:sessionId/records/batch", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const sessionId = String(req.params.sessionId);
        const session = await tx.attendanceSession.findUnique({
          where: { id: sessionId },
        });
        ensure(session, 404, "NOT_FOUND");

        const cls = await classAccess(tx, req.context.user, session.classId);
        ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
        ensure(cls.course.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");

        const data = z
          .object({
            records: z.array(
              z.object({
                userId: z.string().uuid(),
                status: statusSchema,
                notes: z.string().max(500).optional().nullable(),
              }),
            ),
          })
          .parse(req.body);

        const now = new Date();
        const results = [];

        for (const item of data.records) {
          const rec = await tx.attendanceRecord.upsert({
            where: {
              sessionId_userId: { sessionId, userId: item.userId },
            },
            create: {
              sessionId,
              userId: item.userId,
              status: item.status,
              notes: item.notes ?? null,
              checkedInAt: item.status === "PRESENT" ? now : null,
              verifiedBy: req.context.user.id,
            },
            update: {
              status: item.status,
              notes: item.notes !== undefined ? item.notes : undefined,
              checkedInAt: item.status === "PRESENT" ? now : null,
              verifiedBy: req.context.user.id,
            },
          });
          results.push(rec);
        }

        await audit(
          tx,
          req.context,
          "UPDATE",
          "ATTENDANCE_RECORD_BATCH",
          sessionId,
          session.classId,
          null,
          { updatedCount: results.length },
          `Pembaruan batch presensi manual untuk ${results.length} mahasiswa`,
        );

        return { success: true, updatedCount: results.length };
      }),
    ),
  );

  // 6. PATCH /api/v1/attendance/:sessionId/records/:userId
  // Presensi Manual Individu: Mengubah status kehadiran satu mahasiswa tertentu beserta catatan
  app.patch("/api/v1/attendance/:sessionId/records/:userId", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const sessionId = String(req.params.sessionId);
        const userId = String(req.params.userId);

        const session = await tx.attendanceSession.findUnique({
          where: { id: sessionId },
        });
        ensure(session, 404, "NOT_FOUND");

        const cls = await classAccess(tx, req.context.user, session.classId);
        ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
        ensure(cls.course.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");

        const data = z
          .object({
            status: statusSchema,
            notes: z.string().max(500).nullable().optional(),
          })
          .parse(req.body);

        const now = new Date();
        const updated = await tx.attendanceRecord.upsert({
          where: { sessionId_userId: { sessionId, userId } },
          create: {
            sessionId,
            userId,
            status: data.status,
            notes: data.notes ?? null,
            checkedInAt: data.status === "PRESENT" ? now : null,
            verifiedBy: req.context.user.id,
          },
          update: {
            status: data.status,
            notes: data.notes !== undefined ? data.notes : undefined,
            checkedInAt: data.status === "PRESENT" ? now : undefined,
            verifiedBy: req.context.user.id,
          },
        });

        await audit(
          tx,
          req.context,
          "UPDATE",
          "ATTENDANCE_RECORD",
          updated.id,
          session.classId,
          null,
          updated,
          `Pengubahan presensi manual user ${userId} menjadi ${data.status}`,
        );

        return updated;
      }),
    ),
  );

  // 7. POST /api/v1/attendance/:sessionId/check-in
  // Presensi Mandiri oleh Mahasiswa dengan Kode 6 Digit
  app.post("/api/v1/attendance/:sessionId/check-in", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const sessionId = String(req.params.sessionId);
        const user = req.context.user;

        const session = await tx.attendanceSession.findUnique({
          where: { id: sessionId },
          include: { class: { include: { course: true } } },
        });
        ensure(session, 404, "NOT_FOUND");
        const now = new Date();

        // Jika sesi terjadwal dan saat ini dalam rentang waktu perkuliahan, aktifkan otomatis
        if (
          !session.isOpen &&
          session.startTime &&
          session.startTime <= now &&
          (!session.endTime || now <= session.endTime)
        ) {
          session.isOpen = true;
          await tx.attendanceSession.update({
            where: { id: session.id },
            data: { isOpen: true },
          });
        }

        ensure(session.isOpen, 403, "SESSION_CLOSED");
        ensure(session.allowSelfCheckIn, 403, "SELF_CHECKIN_DISABLED");
        ensure(session.class.status === "PUBLISHED", 403, "CLASS_NOT_PUBLISHED");

        // Periksa enrollment aktif mahasiswa
        const enrollment = await tx.enrollment.findUnique({
          where: { classId_userId: { classId: session.classId, userId: user.id } },
        });
        ensure(enrollment && enrollment.isActive, 403, "ENROLLMENT_REQUIRED");

        // Validasi jendela waktu perkuliahan bila ditentukan
        if (session.startTime && now < session.startTime) {
          ensure(false, 400, "SESSION_NOT_STARTED_YET");
        }
        if (session.endTime && now > session.endTime) {
          ensure(false, 400, "SESSION_EXPIRED");
        }

        // Validasi kode presensi (Hanya jika sesi mensyaratkan kode)
        const { code } = z
          .object({ code: z.string().max(20).optional().nullable() })
          .parse(req.body);

        if (session.checkInCode && session.checkInCode.trim().length > 0) {
          ensure(code && code.trim().length > 0, 400, "CODE_REQUIRED");
          ensure(
            session.checkInCode.trim().toUpperCase() === code.trim().toUpperCase(),
            400,
            "INVALID_CHECKIN_CODE",
          );
        }

        const record = await tx.attendanceRecord.upsert({
          where: { sessionId_userId: { sessionId, userId: user.id } },
          create: {
            sessionId,
            userId: user.id,
            status: "PRESENT",
            checkedInAt: now,
          },
          update: {
            status: "PRESENT",
            checkedInAt: now,
          },
        });

        await audit(
          tx,
          req.context,
          "CHECK_IN",
          "ATTENDANCE_RECORD",
          record.id,
          session.classId,
          null,
          record,
          `Mahasiswa ${user.name} berhasil melakukan presensi mandiri`,
        );

        return {
          success: true,
          status: record.status,
          checkedInAt: record.checkedInAt,
        };
      }),
    ),
  );

  // 8. GET /api/v1/course-classes/:id/attendance/recap
  // Rekapitulasi Kehadiran & Ambang Batas Ujian (>= 75%)
  app.get("/api/v1/course-classes/:id/attendance/recap", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");

    const sessions = await db.attendanceSession.findMany({
      where: { classId: cls.id },
      orderBy: { sessionDate: "asc" },
      select: { id: true, title: true, sessionDate: true },
    });

    const enrollments = await db.enrollment.findMany({
      where: { classId: cls.id, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            identifierValue: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const records = await db.attendanceRecord.findMany({
      where: { session: { classId: cls.id } },
    });

    // Petakan catatan per user dan session
    const userSessionMap = new Map<string, AttendanceStatus>();
    for (const r of records) {
      userSessionMap.set(`${r.userId}:${r.sessionId}`, r.status);
    }

    const totalSessions = sessions.length;

    const recap = enrollments.map((e) => {
      let presentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      let sickCount = 0;
      let absentCount = 0;

      const perSessionStatus: Record<string, AttendanceStatus> = {};

      for (const s of sessions) {
        const st = userSessionMap.get(`${e.user.id}:${s.id}`) || "ABSENT";
        perSessionStatus[s.id] = st;
        if (st === "PRESENT") presentCount++;
        else if (st === "LATE") lateCount++;
        else if (st === "EXCUSED") excusedCount++;
        else if (st === "SICK") sickCount++;
        else absentCount++;
      }

      // Persentase kehadiran: (Hadir + Terlambat) / Total Sesi
      const attendanceScore = totalSessions > 0 ? presentCount + lateCount : 0;
      const percentage =
        totalSessions > 0 ? (attendanceScore / totalSessions) * 100 : 100;

      return {
        user: e.user,
        presentCount,
        lateCount,
        excusedCount,
        sickCount,
        absentCount,
        percentage: Number(percentage.toFixed(1)),
        isEligibleForExam: percentage >= 75.0,
        perSessionStatus,
      };
    });

    res.json({
      totalSessions,
      sessions,
      recap,
    });
  });
}
