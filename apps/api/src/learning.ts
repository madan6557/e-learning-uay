import type { Express } from "express";
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
} from "./core.js";
import {
  blockSchema,
  advanceVideo,
  webUrl,
} from "../../../packages/shared/src/domain.js";
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
    .enum(["LECTURE", "LAB_PRACTICUM", "SEMINAR", "WORKSHOP", "EXAM"])
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
  if (data.resourceType === "VIDEO_MEDIA")
    ensure(p.fileObjectId && p.durationSeconds, 400, "VIDEO_REQUIRED");
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
        file.purpose === "RESOURCE" &&
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
export function registerLearning(app: Express) {
  app.get("/api/v1/me", (req, res) => res.json(req.context.user));
  app.get("/api/v1/courses", async (req, res) => {
    const user = req.context.user;
    const scope =
      user.role === "SUPER_ADMIN"
        ? {}
        : user.role === "DEPARTMENT_ADMIN"
          ? { departmentCode: { in: user.departmentScopes } }
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
      await db.course.findMany({ where: scope, orderBy: { code: "asc" } }),
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
        ensure(before.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");
        const after = await tx.course.update({
          where: { id: before.id },
          data,
        });
        await audit(
          tx,
          req.context,
          "UPDATE",
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
  app.get("/api/v1/course-classes", async (req, res) => {
    const u = req.context.user;
    const where =
      u.role === "SUPER_ADMIN"
        ? {}
        : u.role === "DEPARTMENT_ADMIN"
          ? { course: { departmentCode: { in: u.departmentScopes } } }
          : {
              OR: [
                { instructors: { some: { userId: u.id } } },
                {
                  enrollments: { some: { userId: u.id, isActive: true } },
                  status: { not: "DRAFT" as const },
                  course: { status: { not: "DRAFT" as const } },
                },
              ],
            };
    const classes = await db.courseClass.findMany({
      where,
      select: {
        id: true,
        name: true,
        academicYear: true,
        status: true,
        course: true,
        instructors: {
          include: { user: { select: { name: true, id: true } } },
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
    res.json(classes);
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
        ensure(
          course &&
            canManageDepartment(req.context.user, course.departmentCode),
          403,
          "WRITE_ACCESS_DENIED",
        );
        ensure(course.status !== "ARCHIVED", 423, "CLASS_ARCHIVED");
        const users = await tx.user.findMany({
          where: {
            id: { in: data.instructorIds },
            status: "ACTIVE",
            role: { in: ["INSTRUCTOR", "DEPARTMENT_ADMIN", "SUPER_ADMIN"] },
          },
        });
        ensure(
          users.length === new Set(data.instructorIds).size,
          400,
          "INVALID_INSTRUCTORS",
        );
        const after = await tx.courseClass.create({
          data: {
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
    res.json(
      await db.user.findMany({
        where: {
          status: "ACTIVE",
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
    const sections = await db.section.findMany({
      where: { classId: cls.id },
      orderBy: { order: "asc" },
      include: {
        resources: { orderBy: { contentOrder: "asc" } },
        quizzes: {
          select: {
            id: true,
            title: true,
            status: true,
            timeLimitMinutes: true,
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
    const result = sections
      .filter((s) => cls.canManage || visible(s))
      .map((s) => ({
        ...s,
        resources: s.resources.filter((r) => cls.canManage || visible(r)),
        quizzes: s.quizzes.filter(
          (q) => cls.canManage || (q.status === "PUBLISHED" && q.isVisible),
        ),
        assignments: s.assignments.filter((a) => cls.canManage || a.isVisible),
      }));
    const announcements = await db.announcement.findMany({
      where: {
        classId: cls.id,
        ...(!cls.canManage
          ? { isPublished: true, publishedAt: { lte: new Date() } }
          : {}),
      },
      orderBy: [{ isImportant: "desc" }, { publishedAt: "desc" }],
    });
    const progress = {
      video: await db.videoProgress.findMany({
        where: {
          userId: req.context.user.id,
          resourceItem: { section: { classId: cls.id } },
        },
      }),
      slides: await db.slideProgress.findMany({
        where: {
          userId: req.context.user.id,
          resourceItem: { section: { classId: cls.id } },
        },
      }),
      downloads: await db.materialDownload.findMany({
        where: {
          userId: req.context.user.id,
          resourceItem: { section: { classId: cls.id } },
        },
      }),
      text: await db.resourceProgress.findMany({
        where: {
          userId: req.context.user.id,
          resourceItemId: {
            in: sections.flatMap((s) => s.resources.map((r) => r.id)),
          },
        },
      }),
    };
    const gradingQueue = cls.canManage
      ? await Promise.all([
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
      : [];
    res.json({
      ...cls,
      enrollmentKeyHash: undefined,
      enrollments: undefined,
      sections: result,
      announcements,
      progress,
      gradingQueue,
    });
  });
  app.patch("/api/v1/course-classes/:id", async (req, res) =>
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
            name: title,
            academicYear: title,
            status,
            enrollmentKey: z.string().min(6).nullable().optional(),
          })
          .parse(req.body);
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
          "UPDATE",
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
        const cls = await tx.courseClass.findUnique({
          where: { id: String(req.params.id) },
          include: { course: true },
        });
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
    res.json(
      await db.enrollment.findMany({
        where: { classId: cls.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              identifierValue: true,
              email: true,
              status: true,
            },
          },
        },
        orderBy: { enrolledAt: "asc" },
      }),
    );
  });
  app.post("/api/v1/course-classes/:id/participants", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
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
        );
        ensure(
          canManageDepartment(req.context.user, cls.course.departmentCode),
          403,
          "WRITE_ACCESS_DENIED",
        );
        const { userIds } = z
          .object({ userIds: z.array(z.string().uuid()).min(1) })
          .parse(req.body);
        const users = await tx.user.findMany({
          where: {
            id: { in: userIds },
            status: "ACTIVE",
            role: { in: ["INSTRUCTOR", "DEPARTMENT_ADMIN", "SUPER_ADMIN"] },
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
            after.title,
            `announcement:${after.id}`,
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
  app.get("/api/v1/notifications", async (req, res) =>
    res.json(
      await db.notification.findMany({
        where: { userId: req.context.user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ),
  );
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
    res.json(
      await db.auditLog.findMany({
        where: { classId: cls.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: { user: { select: { name: true } } },
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
        const copy = await tx.courseClass.create({
          data: {
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
            const { id, sectionId, createdAt, updatedAt, ...fields } = r;
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
            const { id, sectionId, createdAt, updatedAt, ...fields } = a;
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
        return { id: copy.id };
      }),
    ),
  );
}
