import type { Express } from "express";
import { dashboardClasses } from "./dashboard.js";
import { z } from "zod";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { randomUUID } from "node:crypto";
import {
  db,
  ensure,
  classAccess,
  itemAccess,
  canManageDepartment,
  available,
  mutate,
  audit,
  json,
  hash,
  notify,
  config,
  getAcademicSettings,
} from "./core.js";
import {
  GRADE_SCALE_PRESETS,
  blockSchema,
  advanceVideo,
  webUrl,
} from "../../../packages/shared/src/domain.js";
import { classPath, contentPath } from "../../../packages/shared/src/urls.js";
import { resourceFileIds, resourcesUsingFile } from "./files.js";
const purifier = createDOMPurify(new JSDOM("").window);
const clean = (text: string) =>
  purifier.sanitize(text, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "code",
      "a",
      "mark",
      "span",
    ],
    ALLOWED_ATTR: ["href", "title"],
  });
const date = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .transform((v) => (v ? new Date(v) : null));
const status = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
const title = z.string().trim().min(1).max(200);
const courseSchema = z.object({
  code: title,
  title,
  description: z.string().max(10000).default(""),
  credits: z.number().int().min(1).max(12).default(3),
  departmentCode: title,
  status: status.default("DRAFT"),
});
const sectionSchema = z.object({
  title,
  description: z.string().max(10000).default(""),
  type: z
    .enum(["LECTURE", "LAB_PRACTICUM", "SEMINAR", "WORKSHOP", "EXAM", "OTHER"])
    .default("LECTURE"),
  isVisible: z.boolean().default(false),
  startDate: date,
  endDate: date,
});
const payloadSchema = z.object({
  blocks: z.array(blockSchema).max(300).default([]),
  fileObjectId: z.string().optional(),
  totalPages: z.number().int().min(1).max(10000).optional(),
  url: webUrl.optional(),
  durationSeconds: z.number().positive().max(36000).optional(),
  minWatchPercent: z.number().min(1).max(100).default(85),
  gitRepositoryUrl: webUrl.optional(),
  softwarePrerequisites: z.array(z.string().max(200)).max(30).default([]),
});
const resourceSchema = z.object({
  title,
  resourceType: z.enum([
    "RICH_TEXT",
    "DOCUMENT",
    "VIDEO_MEDIA",
    "LAB_PRACTICUM",
    "VIRTUAL_SIMULATOR",
    "TELECONFERENCE",
    "EXTERNAL_LINK",
  ]),
  dynamicPayload: payloadSchema,
  isVisible: z.boolean().default(false),
  availableFrom: date,
  availableUntil: date,
});
export function validateWindow(
  start: Date | null | undefined,
  end: Date | null | undefined,
) {
  ensure(!start || !end || start <= end, 400, "INVALID_DATE_RANGE");
}
export async function validateResource(raw: unknown, tx: any, classId: string) {
  const data = resourceSchema.parse(raw);
  const p = data.dynamicPayload;
  validateWindow(data.availableFrom, data.availableUntil);
  if (data.resourceType === "DOCUMENT")
    ensure(p.fileObjectId && p.totalPages, 400, "DOCUMENT_REQUIRED");
  if (data.resourceType === "VIDEO_MEDIA") {
    ensure(
      (p.fileObjectId || p.url) && p.durationSeconds,
      400,
      "VIDEO_REQUIRED",
    );
    if (p.url) {
      ensure(
        config.embedOrigins.includes(new URL(p.url).origin),
        400,
        "EMBED_NOT_ALLOWED",
      );
    }
  }
  if (
    ["VIRTUAL_SIMULATOR", "TELECONFERENCE", "EXTERNAL_LINK"].includes(
      data.resourceType,
    )
  )
    ensure(p.url, 400, "URL_REQUIRED");
  for (const block of p.blocks) {
    if ("text" in block.data) block.data.text = clean(block.data.text);
    if (block.type === "embed_media")
      ensure(
        config.embedOrigins.includes(new URL(block.data.url).origin),
        400,
        "EMBED_NOT_ALLOWED",
      );
  }
  if (data.resourceType === "VIRTUAL_SIMULATOR")
    ensure(
      config.embedOrigins.includes(new URL(p.url!).origin),
      400,
      "EMBED_NOT_ALLOWED",
    );
  const ids = resourceFileIds(p);
  for (const id of ids) {
    const file = await tx.fileReference.findUnique({ where: { id } });
    const belongsToClass =
      file?.classId === classId ||
      (await resourcesUsingFile(tx, id, classId)).length > 0;
    ensure(
      file &&
        belongsToClass &&
        ["RESOURCE", "VIDEO"].includes(file.purpose) &&
        file.status === "READY",
      400,
      "FILE_NOT_READY",
    );
    if (id === p.fileObjectId && data.resourceType === "DOCUMENT")
      ensure(file.mimeType === "application/pdf", 400, "FILE_TYPE_OR_SIZE");
    if (id === p.fileObjectId && data.resourceType === "VIDEO_MEDIA")
      ensure(
        ["video/mp4", "video/webm"].includes(file.mimeType),
        400,
        "FILE_TYPE_OR_SIZE",
      );
    if (p.blocks.some((b) => b.type === "image" && b.data.fileObjectId === id))
      ensure(file.mimeType.startsWith("image/"), 400, "FILE_TYPE_OR_SIZE");
  }
  return { ...data, dynamicPayload: json(p) };
}
const courseBatchSchema = z.object({
  rows: z
    .array(
      z.object({
        values: z.record(z.unknown()),
        exclude: z.boolean().default(false),
        override: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(500),
  reason: z.string().trim().min(5).optional(),
});
async function reviewCourseBatch(
  tx: any,
  user: any,
  batch: z.infer<typeof courseBatchSchema>,
) {
  const codes = batch.rows.map((r) => String(r.values.code ?? "").trim());
  const output = [];
  for (let index = 0; index < batch.rows.length; index++) {
    const row = batch.rows[index];
    const code = codes[index];
    const titleVal = String(row.values.title ?? "").trim();
    const deptCode = String(
      row.values.departmentCode ??
        row.values.prodi ??
        row.values.department ??
        user.departmentScopes?.[0] ??
        "",
    ).trim();
    const rawCredits = row.values.credits ?? row.values.sks ?? 3;
    const creditsNum = Number(rawCredits);
    const issues: string[] = [];

    if (!code) issues.push("MISSING_CODE");
    if (!titleVal) issues.push("MISSING_TITLE");
    if (!deptCode) issues.push("MISSING_DEPARTMENT");

    if (deptCode && !canManageDepartment(user, deptCode)) {
      issues.push("WRITE_ACCESS_DENIED");
    }

    if (isNaN(creditsNum) || creditsNum < 1 || creditsNum > 12) {
      issues.push("INVALID_CREDITS");
    }

    if (
      code &&
      batch.rows.some((r, i) => i !== index && !r.exclude && codes[i] === code)
    ) {
      issues.push("DUPLICATE_FILE");
    }

    let existing: any = null;
    if (code) {
      existing = await tx.course.findUnique({ where: { code } });
    }

    if (existing && !row.override) {
      issues.push("DATABASE_CONFLICT");
    }

    const rawStatus = String(row.values.status ?? "")
      .trim()
      .toUpperCase();
    const resolvedStatus = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(
      rawStatus,
    )
      ? rawStatus
      : "PUBLISHED";

    output.push({
      ...row,
      rowNumber: index + 2,
      key: code,
      values: {
        ...row.values,
        code,
        title: titleVal,
        credits: isNaN(creditsNum) ? 3 : creditsNum,
        departmentCode: deptCode,
        description: String(
          row.values.description ?? row.values.deskripsi ?? "",
        ).trim(),
        status: resolvedStatus,
      },
      issues: row.exclude ? [] : [...new Set(issues)],
      status: row.exclude ? "EXCLUDED" : issues.length ? "ISSUE" : "READY",
      existing,
    });
  }
  return output;
}
export function registerLearning(app: Express) {
  app.get("/api/v1/me", (req, res) => res.json(req.context.user));
  app.get("/api/v1/courses", async (req, res) => {
    const user = req.context.user;
    const scope =
      user.role === "SUPER_ADMIN"
        ? {}
        : user.role === "DEPARTMENT_ADMIN"
          ? { departmentCode: { in: user.departmentScopes } }
          : user.role === "INSTRUCTOR"
            ? {
                OR: [
                  { departmentCode: { in: user.departmentScopes } },
                  {
                    classes: {
                      some: { instructors: { some: { userId: user.id } } },
                    },
                  },
                ],
              }
            : {
                classes: {
                  some: {
                    OR: [
                      { instructors: { some: { userId: user.id } } },
                      {
                        enrollments: {
                          some: { userId: user.id, isActive: true },
                        },
                      },
                    ],
                  },
                },
              };
    res.json(
      await db.course.findMany({
        where: scope,
        orderBy: { code: "asc" },
        include: { _count: { select: { classes: true, questionBanks: true } } },
      }),
    );
  });
  app.post("/api/v1/courses", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const data = courseSchema.parse(req.body);
        ensure(
          canManageDepartment(req.context.user, data.departmentCode),
          403,
          "WRITE_ACCESS_DENIED",
        );
        const existing = await tx.course.findUnique({
          where: { code: data.code },
        });
        ensure(!existing, 409, "COURSE_CODE_EXISTS");
        const after = await tx.course.create({ data });
        await audit(
          tx,
          req.context,
          "CREATE",
          "COURSE",
          after.id,
          null,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.patch("/api/v1/courses/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.course.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(before, 404, "NOT_FOUND");
        const data = courseSchema.parse(req.body);
        ensure(
          canManageDepartment(req.context.user, before.departmentCode) &&
            canManageDepartment(req.context.user, data.departmentCode),
          403,
          "WRITE_ACCESS_DENIED",
        );
        if (data.code !== before.code) {
          const existing = await tx.course.findUnique({
            where: { code: data.code },
          });
          ensure(!existing, 409, "COURSE_CODE_EXISTS");
        }
        const after = await tx.course.update({
          where: { id: before.id },
          data,
        });
        await audit(
          tx,
          req.context,
          before.status === "ARCHIVED" && data.status !== "ARCHIVED"
            ? "UNARCHIVE_COURSE"
            : data.status === "ARCHIVED" && before.status !== "ARCHIVED"
              ? "ARCHIVE_COURSE"
              : "UPDATE",
          "COURSE",
          after.id,
          null,
          before,
          after,
        );
        return after;
      }),
    ),
  );
  app.delete("/api/v1/courses/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const course = await tx.course.findUnique({
          where: { id: String(req.params.id) },
          include: {
            _count: { select: { classes: true, questionBanks: true } },
          },
        });
        ensure(course, 404, "NOT_FOUND");
        ensure(
          canManageDepartment(req.context.user, course.departmentCode),
          403,
          "WRITE_ACCESS_DENIED",
        );
        ensure(
          course._count.classes === 0 && course._count.questionBanks === 0,
          409,
          "COURSE_IN_USE",
        );
        await tx.course.delete({ where: { id: course.id } });
        await audit(
          tx,
          req.context,
          "DELETE",
          "COURSE",
          course.id,
          null,
          course,
          null,
        );
        return { id: course.id };
      }),
    ),
  );
  app.post("/api/v1/courses/imports/preview", async (req, res) => {
    ensure(
      ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(req.context.user.role),
      403,
      "WRITE_ACCESS_DENIED",
    );
    const batch = courseBatchSchema.parse(req.body);
    const rows = await reviewCourseBatch(db, req.context.user, batch);
    res.json({
      rows: rows.map(({ existing, ...r }) => ({
        ...r,
        existingId: existing?.id,
      })),
      ready: rows.filter((r) => r.status === "READY").length,
      issues: rows.filter((r) => r.status === "ISSUE").length,
    });
  });
  app.post("/api/v1/courses/imports/commit", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        ensure(
          ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(req.context.user.role),
          403,
          "WRITE_ACCESS_DENIED",
        );
        const batch = courseBatchSchema.parse(req.body);
        const rows = await reviewCourseBatch(tx, req.context.user, batch);
        ensure(
          rows.every((r) => r.status !== "ISSUE"),
          409,
          "IMPORT_REVIEW_REQUIRED",
        );
        const selected = rows.filter((r) => r.status === "READY");
        ensure(selected.length, 400, "IMPORT_EMPTY");
        let createdCount = 0;
        let updatedCount = 0;
        for (const row of selected) {
          const data = {
            code: String(row.values.code),
            title: String(row.values.title),
            credits: Number(row.values.credits),
            departmentCode: String(row.values.departmentCode),
            description: String(row.values.description ?? ""),
            status: row.values.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
          };
          const course = await tx.course.upsert({
            where: { code: row.values.code },
            create: data,
            update: data,
          });
          if (row.existing) updatedCount++;
          else createdCount++;
          await audit(
            tx,
            req.context,
            "BULK_IMPORT_RECONCILED",
            "COURSE",
            course.id,
            null,
            row.existing,
            course,
            batch.reason,
          );
        }
        return {
          imported: selected.length,
          created: createdCount,
          updated: updatedCount,
          excluded: rows.length - selected.length,
        };
      }),
    ),
  );
  app.get("/api/v1/course-classes", async (req, res) => {
    const u = req.context.user;
    const openOnly = req.query.open === "true";
    const where = openOnly
      ? {
          status: "PUBLISHED" as const,
          course: { status: "PUBLISHED" as const },
          enrollmentKeyHash: { not: null },
          ...(req.query.q
            ? {
                OR: [
                  {
                    name: {
                      contains: String(req.query.q),
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    course: {
                      code: {
                        contains: String(req.query.q),
                        mode: "insensitive" as const,
                      },
                    },
                  },
                  {
                    course: {
                      title: {
                        contains: String(req.query.q),
                        mode: "insensitive" as const,
                      },
                    },
                  },
                ],
              }
            : {}),
        }
      : u.role === "SUPER_ADMIN"
        ? {}
        : u.role === "DEPARTMENT_ADMIN"
          ? { course: { departmentCode: { in: u.departmentScopes } } }
          : {
              OR: [
                { instructors: { some: { userId: u.id } } },
                {
                  enrollments: { some: { userId: u.id } },
                  status: { not: "DRAFT" as const },
                  course: { status: { not: "DRAFT" as const } },
                },
              ],
            };
    const classes = await db.courseClass.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        academicYear: true,
        status: true,
        course: true,
        instructors: {
          include: { user: { select: { name: true, id: true } } },
        },
        enrollments: {
          where: { userId: u.id },
          select: { isActive: true },
        },
        _count: {
          select: {
            sections: true,
            enrollments: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const mapped = classes.map((cls) => {
      const canManage =
        canManageDepartment(u, cls.course.departmentCode) ||
        cls.instructors.some((i) => i.user.id === u.id);
      const isInactiveParticipant =
        !canManage && cls.enrollments?.some((e) => !e.isActive);
      return {
        ...cls,
        isInactiveParticipant: Boolean(isInactiveParticipant),
      };
    });
    res.json(
      req.query.summary === "true" ? await dashboardClasses(mapped, u) : mapped,
    );
  });
  app.post("/api/v1/course-classes", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const data = z
          .object({
            courseId: z.string().uuid(),
            name: title,
            academicYear: title,
            instructorIds: z.array(z.string().uuid()).min(1),
            enrollmentKey: z.string().min(6).optional(),
            status: status.default("DRAFT"),
          })
          .parse(req.body);
        const course = await tx.course.findUnique({
          where: { id: data.courseId },
        });
        ensure(course, 404, "NOT_FOUND");
        const isManager = canManageDepartment(
          req.context.user,
          course.departmentCode,
        );
        ensure(isManager, 403, "WRITE_ACCESS_DENIED");
        ensure(course.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");
        const users = await tx.user.findMany({
          where: {
            id: { in: data.instructorIds },
            status: "ACTIVE",
            role: "INSTRUCTOR",
          },
        });
        ensure(
          users.length === new Set(data.instructorIds).size,
          400,
          "INVALID_INSTRUCTORS",
        );
        const settings = await getAcademicSettings(tx);
        const after = await tx.courseClass.create({
          data: {
            gradeScaleVersion: settings.defaultGradeScaleVersion,
            courseId: data.courseId,
            name: data.name,
            academicYear: data.academicYear,
            status: data.status,
            enrollmentKeyHash: data.enrollmentKey
              ? hash(data.enrollmentKey)
              : null,
            instructors: {
              create: users.map((u, i) => ({
                userId: u.id,
                isPrimary: i === 0,
              })),
            },
            gradeCategories: {
              create: [
                ["Tugas & praktikum", 25],
                ["Kuis", 15],
                ["UTS", 25],
                ["UAS", 25],
                ["Progres belajar", 10],
              ].map(([name, weightPercent], order) => ({
                name: String(name),
                weightPercent: Number(weightPercent),
                order,
                kind: order === 4 ? "PROGRESS" : "ASSESSMENT",
              })),
            },
          },
        });
        await audit(
          tx,
          req.context,
          "CREATE",
          "CLASS",
          after.id,
          after.id,
          null,
          { ...after, enrollmentKeyHash: undefined },
        );
        return { id: after.id };
      }),
    ),
  );
  app.get("/api/v1/users", async (req, res) => {
    const u = req.context.user;
    ensure(u.role !== "STUDENT", 403, "WRITE_ACCESS_DENIED");
    const search = String(req.query.q ?? "").slice(0, 100);
    ensure(search.length >= 2, 400, "SEARCH_TOO_SHORT");
    if (u.role === "DEPARTMENT_ADMIN" && !u.departmentScopes.length) {
      res.json([]);
      return;
    }
    const scopeFilter =
      u.role === "SUPER_ADMIN"
        ? {}
        : u.departmentScopes.length > 0
          ? { departmentScopes: { hasSome: u.departmentScopes } }
          : {};
    res.json(
      await db.user.findMany({
        where: {
          status: "ACTIVE",
          ...scopeFilter,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { identifierValue: { contains: search } },
          ],
        },
        select: {
          id: true,
          name: true,
          identifierValue: true,
          role: true,
        },
        take: 30,
      }),
    );
  });
  app.get("/api/v1/course-classes/:id", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    if (cls.isInactiveParticipant) {
      return res.json({
        ...cls,
        enrollmentKeyHash: undefined,
        enrollments: undefined,
        sections: [],
        announcements: [],
        progress: { video: [], slides: [], downloads: [], text: [] },
        gradingQueue: [],
        isInactiveParticipant: true,
      });
    }
    const sections = await db.section.findMany({
      where: { classId: cls.id },
      orderBy: { order: "asc" },
      include: {
        resources: { orderBy: [{ contentOrder: "asc" }, { id: "asc" }] },
        quizzes: {
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            timeLimitMinutes: true,
            attemptLimit: true,
            availableFrom: true,
            availableUntil: true,
            isVisible: true,
            contentOrder: true,
          },
        },
        assignments: { orderBy: { contentOrder: "asc" } },
      },
    });
    const visible = (item: any) => {
      try {
        available(item);
        return true;
      } catch {
        return false;
      }
    };
    const [
      announcements,
      video,
      slides,
      downloads,
      text,
      gradingQueue,
      myAttempts,
      mySubmissions,
      myFinalGrade,
    ] = await Promise.all([
      db.announcement.findMany({
        where: {
          classId: cls.id,
          ...(!cls.canManage
            ? { isPublished: true, publishedAt: { lte: new Date() } }
            : {}),
        },
        orderBy: [{ isImportant: "desc" }, { publishedAt: "desc" }],
      }),
      db.videoProgress.findMany({
        where: {
          userId: req.context.user.id,
          resourceItem: { section: { classId: cls.id } },
        },
      }),
      db.slideProgress.findMany({
        where: {
          userId: req.context.user.id,
          resourceItem: { section: { classId: cls.id } },
        },
      }),
      db.materialDownload.findMany({
        where: {
          userId: req.context.user.id,
          resourceItem: { section: { classId: cls.id } },
        },
      }),
      db.resourceProgress.findMany({
        where: {
          userId: req.context.user.id,
          resourceItemId: {
            in: sections.flatMap((s) => s.resources.map((r) => r.id)),
          },
        },
      }),
      cls.canManage
        ? Promise.all([
            db.assignmentSubmission.groupBy({
              by: ["assignmentId"],
              where: {
                assignment: { section: { classId: cls.id } },
                status: { in: ["SUBMITTED", "LATE"] },
              },
              _count: true,
            }),
            db.quizAttempt.groupBy({
              by: ["quizId"],
              where: {
                quiz: { section: { classId: cls.id } },
                status: "NEEDS_GRADING",
              },
              _count: true,
            }),
          ]).then(([assignments, quizzes]) => [
            ...assignments.map((a) => ({
              id: a.assignmentId,
              kind: "assignment",
              count: a._count,
            })),
            ...quizzes.map((q) => ({
              id: q.quizId,
              kind: "quiz",
              count: q._count,
            })),
          ])
        : [],
      !cls.canManage
        ? db.quizAttempt.findMany({
            where: {
              userId: req.context.user.id,
              quiz: { section: { classId: cls.id } },
            },
            select: { quizId: true, status: true, score: true },
          })
        : [],
      !cls.canManage
        ? db.assignmentSubmission.findMany({
            where: {
              userId: req.context.user.id,
              assignment: { section: { classId: cls.id } },
            },
            select: { assignmentId: true, status: true, score: true },
          })
        : [],
      !cls.canManage
        ? db.finalGradeRecord.findUnique({
            where: {
              classId_userId: { classId: cls.id, userId: req.context.user.id },
            },
            select: { isLocked: true },
          })
        : null,
    ]);

    const now = new Date();
    const isGradeLocked = Boolean(myFinalGrade?.isLocked);
    const isClassArchived = cls.status === "ARCHIVED";

    const result = sections
      .filter((s) => cls.canManage || visible(s))
      .map((s) => ({
        ...s,
        resources: s.resources.filter((r) => cls.canManage || visible(r)),
        quizzes: s.quizzes
          .filter(
            (q) => cls.canManage || (q.status === "PUBLISHED" && q.isVisible),
          )
          .map((q) => {
            if (cls.canManage) return q;
            const attempts = myAttempts.filter((a: any) => a.quizId === q.id);
            const isCompleted =
              attempts.some((a: any) => a.status === "GRADED_COMPLETE") ||
              (q.attemptLimit ? attempts.length >= q.attemptLimit : false);
            const isTimeClosed = Boolean(
              q.availableUntil && now > q.availableUntil,
            );
            const isClosed = isGradeLocked || isTimeClosed || isClassArchived;
            const inProgress = attempts.some(
              (a: any) => a.status === "IN_PROGRESS",
            );
            return {
              ...q,
              userStatus: isCompleted
                ? "COMPLETED"
                : isClosed
                  ? "CLOSED"
                  : inProgress
                    ? "IN_PROGRESS"
                    : "OPEN",
              attemptsCount: attempts.length,
            };
          }),
        assignments: s.assignments
          .filter((a) => cls.canManage || a.isVisible)
          .map((a) => {
            if (cls.canManage) return a;
            const subs = mySubmissions.filter(
              (sub: any) => sub.assignmentId === a.id,
            );
            const isSubmitted = subs.some(
              (sub: any) => sub.status !== "SUPERSEDED",
            );
            const isCutoffPassed = Boolean(a.cutoffDate && now > a.cutoffDate);
            const isDeadlinePassed = Boolean(
              a.deadline && now > a.deadline && !a.allowLate,
            );
            const isClosed =
              isGradeLocked ||
              isCutoffPassed ||
              isDeadlinePassed ||
              isClassArchived;
            return {
              ...a,
              userStatus: isSubmitted
                ? "SUBMITTED"
                : isClosed
                  ? "CLOSED"
                  : "OPEN",
              submissionsCount: subs.length,
            };
          }),
      }));

    const progress = { video, slides, downloads, text };
    res.json({
      ...cls,
      enrollmentKeyHash: undefined,
      enrollments: undefined,
      sections: result,
      announcements,
      progress,
      gradingQueue,
      isGradeLocked,
    });
  });
  app.patch("/api/v1/course-classes/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
        );
        ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
        ensure(cls.course.status !== "ARCHIVED", 423, "COURSE_ARCHIVED");
        const data = z
          .object({
            name: title,
            academicYear: title,
            status,
            enrollmentKey: z.string().min(6).nullable().optional(),
          })
          .parse(req.body);
        ensure(
          cls.status !== "ARCHIVED" || data.status !== "ARCHIVED",
          423,
          "CLASS_ARCHIVED",
        );
        const after = await tx.courseClass.update({
          where: { id: cls.id },
          data: {
            name: data.name,
            academicYear: data.academicYear,
            status: data.status,
            ...(data.enrollmentKey !== undefined
              ? {
                  enrollmentKeyHash: data.enrollmentKey
                    ? hash(data.enrollmentKey)
                    : null,
                }
              : {}),
          },
        });
        await audit(
          tx,
          req.context,
          cls.status === "ARCHIVED" && data.status !== "ARCHIVED"
            ? "UNARCHIVE_CLASS"
            : cls.status !== "ARCHIVED" && data.status === "ARCHIVED"
              ? "ARCHIVE_CLASS"
              : "UPDATE",
          "CLASS",
          cls.id,
          cls.id,
          { name: cls.name, status: cls.status },
          { name: after.name, status: after.status },
        );
        return { id: after.id };
      }),
    ),
  );
  app.post("/api/v1/course-classes/:id/enroll", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const idParam = String(req.params.id);
        const cls =
          (await tx.courseClass.findFirst({
            where: {
              OR: [{ id: idParam }, { slug: idParam }],
            },
            include: { course: true },
          })) ??
          (await tx.courseClass.findFirst({
            where: {
              course: {
                code: { equals: idParam, mode: "insensitive" },
                status: "PUBLISHED",
              },
              status: "PUBLISHED",
              enrollmentKeyHash: { not: null },
            },
            include: { course: true },
          }));
        const { enrollmentKey } = z
          .object({ enrollmentKey: z.string().min(1) })
          .parse(req.body);
        ensure(
          cls &&
            cls.status === "PUBLISHED" &&
            cls.course.status === "PUBLISHED" &&
            cls.enrollmentKeyHash === hash(enrollmentKey),
          403,
          "INVALID_ENROLLMENT_KEY",
        );
        ensure(req.context.user.role === "STUDENT", 403, "STUDENT_REQUIRED");
        const after = await tx.enrollment.upsert({
          where: {
            classId_userId: { classId: cls.id, userId: req.context.user.id },
          },
          create: { classId: cls.id, userId: req.context.user.id },
          update: { isActive: true },
        });
        await audit(
          tx,
          req.context,
          "ENROLL",
          "ENROLLMENT",
          after.id,
          cls.id,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.get("/api/v1/course-classes/:id/participants", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
    const enrollments = await db.enrollment.findMany({
      where: { classId: cls.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            identifierValue: true,
            email: true,
            status: true,
            lastLoginAt: true,
            lastActiveAt: true,
          },
        },
      },
      orderBy: { enrolledAt: "asc" },
    });

    const now = Date.now();
    const formatted = enrollments.map((e) => {
      const activeTimestamp = e.user.lastActiveAt ?? e.user.lastLoginAt;
      const isOnline = activeTimestamp
        ? now - new Date(activeTimestamp).getTime() <= 5 * 60 * 1000
        : false;

      return {
        ...e,
        user: {
          ...e.user,
          lastActiveAt: activeTimestamp ? activeTimestamp.toISOString() : null,
          isOnline,
        },
      };
    });

    res.json(formatted);
  });
  app.post("/api/v1/course-classes/:id/participants", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
          false,
          true,
        );
        const { userId, isActive } = z
          .object({
            userId: z.string().uuid(),
            isActive: z.boolean().default(true),
          })
          .parse(req.body);
        const user = await tx.user.findUnique({ where: { id: userId } });
        ensure(
          user?.status === "ACTIVE" && user.role === "STUDENT",
          400,
          "INVALID_STUDENT",
        );
        const before = await tx.enrollment.findUnique({
          where: { classId_userId: { classId: cls.id, userId } },
        });
        const after = await tx.enrollment.upsert({
          where: { classId_userId: { classId: cls.id, userId } },
          create: { classId: cls.id, userId, isActive },
          update: { isActive },
        });
        if (!isActive && before?.isActive !== false) {
          await notify(
            tx,
            cls.id,
            "ENROLLMENT",
            `Partisipasi kelas dinonaktifkan: ${cls.course.code} - ${cls.name}`,
            `enrollment-disabled:${cls.id}:${userId}:${Date.now()}`,
            userId,
            classPath(cls),
            `Hak partisipasi Anda pada kelas ${cls.course.code} - ${cls.name} telah dinonaktifkan oleh dosen pengampu.`,
          );
        } else if (isActive && before?.isActive === false) {
          await notify(
            tx,
            cls.id,
            "ENROLLMENT",
            `Partisipasi kelas diaktifkan kembali: ${cls.course.code} - ${cls.name}`,
            `enrollment-enabled:${cls.id}:${userId}:${Date.now()}`,
            userId,
            classPath(cls),
            `Hak partisipasi Anda pada kelas ${cls.course.code} - ${cls.name} telah diaktifkan kembali.`,
          );
        }
        await audit(
          tx,
          req.context,
          "UPDATE_ENROLLMENT",
          "ENROLLMENT",
          after.id,
          cls.id,
          before,
          after,
        );
        return after;
      }),
    ),
  );
  app.post("/api/v1/course-classes/:id/instructors", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
          false,
          true,
        );
        const { userIds } = z
          .object({ userIds: z.array(z.string().uuid()).min(1) })
          .parse(req.body);
        ensure(
          canManageDepartment(req.context.user, cls.course.departmentCode) ||
            (req.context.user.role === "INSTRUCTOR" &&
              userIds.includes(req.context.user.id)),
          403,
          "WRITE_ACCESS_DENIED",
        );
        const users = await tx.user.findMany({
          where: {
            id: { in: userIds },
            status: "ACTIVE",
            role: "INSTRUCTOR",
          },
        });
        ensure(
          users.length === new Set(userIds).size,
          400,
          "INVALID_INSTRUCTORS",
        );
        await tx.classInstructor.deleteMany({ where: { classId: cls.id } });
        await tx.classInstructor.createMany({
          data: users.map((u, i) => ({
            classId: cls.id,
            userId: u.id,
            isPrimary: i === 0,
          })),
        });
        await audit(
          tx,
          req.context,
          "ASSIGN_INSTRUCTORS",
          "CLASS",
          cls.id,
          cls.id,
          cls.instructors,
          userIds,
        );
        return { ok: true };
      }),
    ),
  );
  app.post("/api/v1/course-classes/:id/sections", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        const data = sectionSchema.parse(req.body);
        validateWindow(data.startDate, data.endDate);
        const max = await tx.section.aggregate({
          where: { classId: cls.id },
          _max: { order: true },
        });
        const after = await tx.section.create({
          data: { ...data, classId: cls.id, order: (max._max.order ?? -1) + 1 },
        });
        await audit(
          tx,
          req.context,
          "CREATE",
          "SECTION",
          after.id,
          cls.id,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.patch("/api/v1/sections/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.section.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(before, 404, "NOT_FOUND");
        const cls = await classAccess(
          tx,
          req.context.user,
          before.classId,
          true,
        );
        const data = sectionSchema.parse(req.body);
        validateWindow(data.startDate, data.endDate);
        const after = await tx.section.update({
          where: { id: before.id },
          data,
        });
        await audit(
          tx,
          req.context,
          "UPDATE",
          "SECTION",
          after.id,
          cls.id,
          before,
          after,
        );
        return after;
      }),
    ),
  );
  app.put("/api/v1/course-classes/:id/section-order", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        const { ids } = z
          .object({ ids: z.array(z.string().uuid()).max(200) })
          .parse(req.body);
        const before = await tx.section.findMany({
          where: { classId: cls.id },
        });
        ensure(
          ids.length === before.length &&
            new Set(ids).size === ids.length &&
            before.every((s) => ids.includes(s.id)),
          400,
          "INVALID_ORDER",
        );
        for (let i = 0; i < ids.length; i++)
          await tx.section.update({
            where: { id: ids[i] },
            data: { order: -i - 1 },
          });
        for (let i = 0; i < ids.length; i++)
          await tx.section.update({
            where: { id: ids[i] },
            data: { order: i },
          });
        await audit(
          tx,
          req.context,
          "REORDER",
          "CLASS",
          cls.id,
          cls.id,
          before.map((s) => s.id),
          ids,
        );
        return { ok: true };
      }),
    ),
  );
  app.post("/api/v1/sections/:id/resources", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const cls = await itemAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        const data = await validateResource(req.body, tx, cls.id);
        const after = await tx.resourceItem.create({
          data: {
            ...data,
            sectionId: String(req.params.id),
            contentOrder: await tx.resourceItem.count({
              where: { sectionId: String(req.params.id) },
            }),
          },
        });
        await audit(
          tx,
          req.context,
          "CREATE",
          "RESOURCE",
          after.id,
          cls.id,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.patch("/api/v1/resources/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.resourceItem.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(before, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          before.sectionId,
          true,
        );
        const data = await validateResource(req.body, tx, cls.id);
        ensure(
          before.resourceType === data.resourceType,
          400,
          "RESOURCE_TYPE_IMMUTABLE",
        );
        const after = await tx.resourceItem.update({
          where: { id: before.id },
          data,
        });
        await audit(
          tx,
          req.context,
          "UPDATE",
          "RESOURCE",
          after.id,
          cls.id,
          before,
          after,
        );
        return after;
      }),
    ),
  );
  app.post("/api/v1/resources/:id/progress", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const resource = await tx.resourceItem.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(resource, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          resource.sectionId,
          true,
          true,
        );
        ensure(!cls.canManage, 403, "STUDENT_REQUIRED");
        available(resource);
        const payload = resource.dynamicPayload as any;
        const userId = req.context.user.id;
        const resourceItemId = resource.id;
        if (resource.resourceType === "VIDEO_MEDIA") {
          const { position } = z
            .object({
              position: z.number().nonnegative().max(payload.durationSeconds),
            })
            .parse(req.body);
          const previous = await tx.videoProgress.findUnique({
            where: { userId_resourceItemId: { userId, resourceItemId } },
          });
          const data = advanceVideo(
            previous ?? {
              watchedSeconds: 0,
              lastPositionSeconds: 0,
              updatedAt: new Date(),
            },
            position,
            payload.durationSeconds,
            new Date(),
          );
          return tx.videoProgress.upsert({
            where: { userId_resourceItemId: { userId, resourceItemId } },
            create: { userId, resourceItemId, ...data },
            update: data,
          });
        }
        if (resource.resourceType === "DOCUMENT") {
          const { page } = z
            .object({ page: z.number().int().min(1).max(payload.totalPages) })
            .parse(req.body);
          const before = await tx.slideProgress.findUnique({
            where: { userId_resourceItemId: { userId, resourceItemId } },
          });
          const pages = [
            ...new Set([...(before?.viewedPages ?? []), page]),
          ].sort((a, b) => a - b);
          return tx.slideProgress.upsert({
            where: { userId_resourceItemId: { userId, resourceItemId } },
            create: {
              userId,
              resourceItemId,
              viewedPages: pages,
              currentPage: page,
              percent: (pages.length / payload.totalPages) * 100,
            },
            update: {
              viewedPages: pages,
              currentPage: page,
              percent: (pages.length / payload.totalPages) * 100,
            },
          });
        }
        ensure(
          resource.resourceType !== "LAB_PRACTICUM" || !payload.fileObjectId,
          400,
          "DOWNLOAD_REQUIRED",
        );
        const { checklistIds } = z
          .object({ checklistIds: z.array(z.string()).default([]) })
          .parse(req.body);
        const validIds = (payload.blocks ?? [])
          .filter((b: any) => b.type === "checklist")
          .flatMap((b: any) => b.data.items.map((i: any) => i.id));
        ensure(
          checklistIds.every((id) => validIds.includes(id)),
          400,
          "INVALID_CHECKLIST",
        );
        return tx.resourceProgress.upsert({
          where: { userId_resourceItemId: { userId, resourceItemId } },
          create: { userId, resourceItemId, checklistIds },
          update: { checklistIds, completedAt: new Date() },
        });
      }),
    ),
  );
  app.post("/api/v1/course-classes/:id/announcements", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        const data = z
          .object({
            title,
            content: z.string().trim().min(1).max(20000),
            isImportant: z.boolean().default(false),
            isPublished: z.boolean().default(true),
            publishedAt: date,
          })
          .parse(req.body);
        const after = await tx.announcement.create({
          data: {
            ...data,
            publishedAt: data.publishedAt ?? new Date(),
            classId: cls.id,
            authorId: req.context.user.id,
          },
        });
        if (
          after.isPublished &&
          after.publishedAt <= new Date() &&
          cls.status === "PUBLISHED" &&
          cls.course.status === "PUBLISHED"
        )
          await notify(
            tx,
            cls.id,
            "ANNOUNCEMENT",
            `Pengumuman: ${after.title}`,
            `announcement:${after.id}`,
            undefined,
            `${classPath(cls)}/announcements#announcement-${after.id}`,
            after.content.length > 100
              ? `${after.content.slice(0, 100)}...`
              : after.content,
          );
        await audit(
          tx,
          req.context,
          "CREATE",
          "ANNOUNCEMENT",
          after.id,
          cls.id,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.get("/api/v1/notifications", async (req, res) => {
    const notifications = await db.notification.findMany({
      where: { userId: req.context.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const legacy = (url: string | null) =>
      url?.match(/^#?\/classes\/([a-f0-9-]{36})$/i)?.[1];
    const ids = notifications.flatMap((n) =>
      legacy(n.linkUrl) ? [legacy(n.linkUrl)!] : [],
    );
    const classes = ids.length
      ? await db.courseClass.findMany({
          where: { id: { in: ids } },
          include: { course: true },
        })
      : [];
    const urls = new Map(classes.map((cls) => [cls.id, classPath(cls)]));

    const targetUrls = new Map<string, string>();
    const attemptIds: string[] = [];
    const quizIds: string[] = [];
    const submissionIds: string[] = [];
    const assignmentIds: string[] = [];
    const announcementIds: string[] = [];

    for (const n of notifications) {
      if (
        n.linkUrl &&
        (n.linkUrl.includes("/quizzes/") ||
          n.linkUrl.includes("/assignments/") ||
          n.linkUrl.includes("/announcements"))
      )
        continue;
      const parts = n.eventKey.split(":");
      const id = parts[1];
      if (!id) continue;
      if (
        n.eventKey.startsWith("quiz-grade:") ||
        n.eventKey.startsWith("quiz-correction:")
      ) {
        attemptIds.push(id);
        quizIds.push(id);
      } else if (
        n.eventKey.startsWith("submission-grade:") ||
        n.eventKey.startsWith("submission-correction:")
      ) {
        submissionIds.push(id);
        assignmentIds.push(id);
      } else if (
        n.eventKey.startsWith("assignment:") ||
        n.eventKey.startsWith("deadline:")
      ) {
        assignmentIds.push(id);
      } else if (n.eventKey.startsWith("announcement:")) {
        announcementIds.push(id);
      }
    }

    if (attemptIds.length) {
      const attempts = await db.quizAttempt.findMany({
        where: { id: { in: attemptIds } },
        include: {
          quiz: {
            include: {
              section: { include: { class: { include: { course: true } } } },
            },
          },
        },
      });
      for (const a of attempts) {
        if (a.quiz?.section?.class)
          targetUrls.set(
            a.id,
            contentPath(a.quiz.section.class, "quizzes", a.quiz, []),
          );
      }
    }
    if (quizIds.length) {
      const quizzes = await db.quiz.findMany({
        where: { id: { in: quizIds } },
        include: {
          section: { include: { class: { include: { course: true } } } },
        },
      });
      for (const q of quizzes) {
        if (q.section?.class)
          targetUrls.set(q.id, contentPath(q.section.class, "quizzes", q, []));
      }
    }
    if (submissionIds.length) {
      const submissions = await db.assignmentSubmission.findMany({
        where: { id: { in: submissionIds } },
        include: {
          assignment: {
            include: {
              section: { include: { class: { include: { course: true } } } },
            },
          },
        },
      });
      for (const s of submissions) {
        if (s.assignment?.section?.class)
          targetUrls.set(
            s.id,
            contentPath(
              s.assignment.section.class,
              "assignments",
              s.assignment,
              [],
            ),
          );
      }
    }
    if (assignmentIds.length) {
      const assignments = await db.assignment.findMany({
        where: { id: { in: assignmentIds } },
        include: {
          section: { include: { class: { include: { course: true } } } },
        },
      });
      for (const asg of assignments) {
        if (asg.section?.class)
          targetUrls.set(
            asg.id,
            contentPath(asg.section.class, "assignments", asg, []),
          );
      }
    }
    if (announcementIds.length) {
      const announcements = await db.announcement.findMany({
        where: { id: { in: announcementIds } },
        include: {
          class: { include: { course: true } },
        },
      });
      for (const a of announcements) {
        if (a.class)
          targetUrls.set(
            a.id,
            `${classPath(a.class)}/announcements#announcement-${a.id}`,
          );
      }
    }

    res.json(
      notifications.map((n) => {
        let linkUrl = n.linkUrl;
        if (
          !linkUrl ||
          (!linkUrl.includes("/quizzes/") &&
            !linkUrl.includes("/assignments/") &&
            !linkUrl.includes("/announcements"))
        ) {
          const parts = n.eventKey.split(":");
          const id = parts[1];
          if (id && targetUrls.has(id)) {
            linkUrl = targetUrls.get(id)!;
          } else if (legacy(linkUrl)) {
            linkUrl = urls.get(legacy(linkUrl)!) ?? linkUrl;
          }
        }

        let title = n.title;
        let message = n.message;
        if (n.type === "GRADE_PUBLISHED") {
          if (!title.toLowerCase().startsWith("nilai")) {
            title = `Nilai telah diterbitkan: ${title}`;
          }
          if (!message || message === n.title) {
            message = `Nilai untuk "${n.title}" telah diterbitkan oleh pengajar.`;
          }
        } else if (n.type === "GRADE_CORRECTED") {
          if (!title.toLowerCase().startsWith("koreksi")) {
            title = `Koreksi nilai: ${title}`;
          }
          if (!message || message === n.title) {
            message = `Nilai untuk "${n.title}" telah dikoreksi oleh pengajar.`;
          }
        } else if (n.type === "NEW_ASSIGNMENT") {
          if (!title.toLowerCase().startsWith("tugas baru")) {
            title = `Tugas baru: ${title}`;
          }
          if (!message || message === n.title) {
            message = `Tugas baru "${n.title}" telah dipublikasikan.`;
          }
        } else if (n.type === "DEADLINE_REMINDER") {
          if (!title.toLowerCase().startsWith("pengingat")) {
            title = `Pengingat batas waktu: ${title}`;
          }
          if (!message || message === n.title) {
            message = `Batas waktu pengumpulan tugas "${n.title}" akan segera berakhir.`;
          }
        } else if (n.type === "ANNOUNCEMENT") {
          if (!title.toLowerCase().startsWith("pengumuman")) {
            title = `Pengumuman: ${title}`;
          }
        }

        return {
          ...n,
          title,
          message,
          linkUrl,
        };
      }),
    );
  });
  // Cheap enough for the navigation badge to poll without pulling the list.
  app.get("/api/v1/notifications/unread-count", async (req, res) =>
    res.json({
      count: await db.notification.count({
        where: { userId: req.context.user.id, isRead: false },
      }),
    }),
  );
  app.post("/api/v1/notifications/:id/read", async (req, res) => {
    await db.notification.updateMany({
      where: { id: String(req.params.id), userId: req.context.user.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ ok: true });
  });
  app.post("/api/v1/notifications/read-all", async (req, res) => {
    const { count } = await db.notification.updateMany({
      where: { userId: req.context.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ count });
  });
  app.get("/api/v1/course-classes/:id/audit", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const entries = await db.auditLog.findMany({
      where: { classId: cls.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { user: { select: { name: true } } },
    });
    const descriptiveEntities = new Set([
      "COURSE",
      "CLASS",
      "SECTION",
      "RESOURCE",
      "ASSIGNMENT",
      "QUIZ",
      "ANNOUNCEMENT",
      "QUESTION_BANK",
    ]);
    const visibleFields = [
      "status",
      "isVisible",
      "isPublished",
      "academicYear",
      "credits",
      "departmentCode",
      "deadline",
      "availableFrom",
      "availableUntil",
      "startDate",
      "endDate",
    ];
    const record = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    res.json(
      entries.map((entry) => {
        const before = record(entry.beforeState);
        const after = record(entry.afterState);
        const fields = descriptiveEntities.has(entry.entity)
          ? [...visibleFields, "title", "name"]
          : visibleFields;
        const safe = (value: unknown) =>
          value === null ||
          ["string", "number", "boolean"].includes(typeof value)
            ? value
            : undefined;
        const changes = fields.flatMap((field) => {
          const oldValue = safe(before[field]);
          const newValue = safe(after[field]);
          return JSON.stringify(oldValue) === JSON.stringify(newValue)
            ? []
            : [{ field, before: oldValue, after: newValue }];
        });
        const title = descriptiveEntities.has(entry.entity)
          ? safe(after.title ?? after.name ?? before.title ?? before.name)
          : null;
        return {
          id: entry.id,
          action: entry.action,
          entity: entry.entity,
          actorRole: entry.actorRole,
          user: entry.user,
          createdAt: entry.createdAt,
          reason: entry.reason,
          objectTitle: typeof title === "string" ? title : null,
          changes,
        };
      }),
    );
  });
  app.post("/api/v1/course-classes/:id/clone", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
        );
        ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
        ensure(cls.course.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");
        const data = z
          .object({ name: title, academicYear: title })
          .parse(req.body);
        const settings = await getAcademicSettings(tx);
        const copy = await tx.courseClass.create({
          data: {
            gradeScaleVersion: settings.defaultGradeScaleVersion,
            ...data,
            courseId: cls.courseId,
            status: "DRAFT",
            instructors: {
              create: cls.instructors.map((i) => ({
                userId: i.userId,
                isPrimary: i.isPrimary,
              })),
            },
          },
        });
        const categoryMap = new Map<string, string>();
        for (const category of await tx.gradeCategory.findMany({
          where: { classId: cls.id },
        })) {
          const { id, classId, createdAt, ...fields } = category;
          const c = await tx.gradeCategory.create({
            data: { ...fields, classId: copy.id },
          });
          categoryMap.set(id, c.id);
        }
        for (const section of await tx.section.findMany({
          where: { classId: cls.id },
          include: {
            resources: true,
            quizzes: { include: { questions: true } },
            assignments: true,
          },
        })) {
          const next = await tx.section.create({
            data: {
              classId: copy.id,
              title: section.title,
              description: section.description,
              type: section.type,
              order: section.order,
              isVisible: false,
            },
          });
          for (const r of section.resources) {
            const { id, slug, sectionId, createdAt, updatedAt, ...fields } = r;
            await tx.resourceItem.create({
              data: {
                ...fields,
                dynamicPayload: json(r.dynamicPayload),
                completionCriteria: r.completionCriteria
                  ? json(r.completionCriteria)
                  : undefined,
                sectionId: next.id,
                availableFrom: null,
                availableUntil: null,
                isVisible: false,
              },
            });
          }
          for (const q of section.quizzes) {
            const {
              id,
              slug,
              sectionId,
              createdAt,
              updatedAt,
              questions,
              ...fields
            } = q;
            await tx.quiz.create({
              data: {
                ...fields,
                gradeCategoryId:
                  categoryMap.get(q.gradeCategoryId ?? "") ?? null,
                sectionId: next.id,
                status: "DRAFT",
                availableFrom: null,
                availableUntil: null,
                resultReleaseAt: null,
                questions: {
                  create: questions.map(
                    ({
                      id,
                      quizId,
                      createdAt,
                      options,
                      answerKey,
                      rubric,
                      ...fields
                    }) => ({
                      ...fields,
                      options: json(options),
                      answerKey: json(answerKey),
                      rubric: json(rubric),
                    }),
                  ),
                },
              },
            });
          }
          for (const a of section.assignments) {
            const { id, slug, sectionId, createdAt, updatedAt, ...fields } = a;
            await tx.assignment.create({
              data: {
                ...fields,
                allowedFormats: json(a.allowedFormats),
                gradeCategoryId:
                  categoryMap.get(a.gradeCategoryId ?? "") ?? null,
                sectionId: next.id,
                availableFrom: null,
                deadline: null,
                cutoffDate: null,
                isVisible: false,
              },
            });
          }
        }
        await audit(
          tx,
          req.context,
          "CLONE_CLASS",
          "CLASS",
          copy.id,
          copy.id,
          { sourceClassId: cls.id },
          copy,
        );
        return { id: copy.id, path: classPath(copy) };
      }),
    ),
  );
  app.get("/api/v1/system/settings", async (_req, res) => {
    res.json(await getAcademicSettings());
  });
  app.put("/api/v1/system/settings", async (req, res) => {
    ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");
    const data = z
      .object({
        academicYear: z.string().trim().min(3).max(50),
        semesterLabel: z.string().trim().min(3).max(100).optional(),
        academicYears: z
          .array(z.string().trim().min(3).max(50))
          .min(1)
          .max(100)
          .optional(),
        defaultGradeScaleVersion: z
          .string()
          .refine((v) => Object.hasOwn(GRADE_SCALE_PRESETS, v))
          .optional(),
        minAttendancePercentage: z.number().min(0).max(100).optional(),
      })
      .parse(req.body);
    res.json(
      await mutate(req, async (tx) => {
        const before = await getAcademicSettings(tx);
        const after = await tx.academicSettings.update({
          where: { id: "global" },
          data: {
            ...data,
            semesterLabel:
              data.semesterLabel ??
              "SEMESTER " + data.academicYear.toUpperCase(),
            academicYears: [
              ...new Set([
                ...(data.academicYears ?? before.academicYears),
                data.academicYear,
              ]),
            ],
          },
        });
        await audit(
          tx,
          req.context,
          "UPDATE",
          "SYSTEM",
          "academic-settings",
          null,
          before,
          after,
          "Pembaruan pengaturan akademik global",
        );
        return after;
      }),
    );
  });
}
