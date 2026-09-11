import type { Express } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  db,
  ensure,
  classAccess,
  mutate,
  audit,
  json,
  notify,
  type Context,
} from "./core.js";
import {
  gradeLetter,
  round,
  validateTotal,
} from "../../../packages/shared/src/domain.js";

export async function calculateGradebook(
  tx: Prisma.TransactionClient,
  classId: string,
  onlyUserId?: string,
) {
  const [categories, enrollments, resources, quizzes, assignments, manual] =
    await Promise.all([
      tx.gradeCategory.findMany({
        where: { classId },
        orderBy: { order: "asc" },
      }),
      tx.enrollment.findMany({
        where: {
          classId,
          isActive: true,
          ...(onlyUserId ? { userId: onlyUserId } : {}),
        },
        include: {
          user: {
            select: { id: true, fullName: true, studentStaffNumber: true },
          },
        },
      }),
      tx.resourceItem.findMany({
        where: { section: { classId, isVisible: true }, isVisible: true },
        include: {
          videoProgresses: true,
          slideProgresses: true,
          downloads: true,
        },
      }),
      tx.quiz.findMany({
        where: { section: { classId }, status: "PUBLISHED" },
        include: {
          attempts: { where: { status: { not: "IN_PROGRESS" } } },
          questions: { select: { points: true } },
        },
      }),
      tx.assignment.findMany({
        where: { section: { classId }, isVisible: true },
        include: { submissions: { where: { status: { not: "SUPERSEDED" } } } },
      }),
      tx.manualGradeRecord.findMany({ where: { classId } }),
    ]);
  const textProgress = await tx.resourceProgress.findMany({
    where: { resourceItemId: { in: resources.map((r) => r.id) } },
  });
  const saved = await tx.finalGradeRecord.findMany({ where: { classId } });
  const rows = enrollments.map(({ user }) => {
    const progress = round(
      resources.length
        ? resources.reduce((sum, r) => {
            const p = r.dynamicPayload as any;
            let percent = 0;
            if (r.resourceType === "VIDEO_MEDIA") {
              const value =
                r.videoProgresses.find((v) => v.userId === user.id)?.percent ??
                0;
              percent =
                value >= (p.minWatchPercent ?? 85)
                  ? 100
                  : (value / (p.minWatchPercent ?? 85)) * 100;
            } else if (r.resourceType === "DOCUMENT")
              percent =
                r.slideProgresses.find((s) => s.userId === user.id)?.percent ??
                0;
            else if (r.resourceType === "LAB_PRACTICUM" && p.fileObjectId)
              percent = r.downloads.some((d) => d.userId === user.id) ? 100 : 0;
            else {
              const record = textProgress.find(
                (t) => t.userId === user.id && t.resourceItemId === r.id,
              );
              const checkboxes = (p.blocks ?? [])
                .filter((b: any) => b.type === "checklist")
                .flatMap((b: any) => b.data.items.map((i: any) => i.id));
              percent = record
                ? checkboxes.length
                  ? (checkboxes.filter((id: string) =>
                      record.checklistIds.includes(id),
                    ).length /
                      checkboxes.length) *
                    100
                  : 100
                : 0;
            }
            return sum + percent;
          }, 0) / resources.length
        : 0,
    );
    const pending: string[] = [];
    const missing: string[] = [];
    const categoryScores = categories.map((category) => {
      const override = manual.find(
        (m) => m.categoryId === category.id && m.userId === user.id,
      );
      if (override)
        return {
          categoryId: category.id,
          name: category.name,
          score: override.score,
          weight: category.weightPercent,
          source: "MANUAL",
        };
      if (category.kind === "PROGRESS")
        return {
          categoryId: category.id,
          name: category.name,
          score: progress,
          weight: category.weightPercent,
          source: "PROGRESS",
        };
      const values: { score: number; points: number }[] = [];
      for (const quiz of quizzes.filter(
        (q) => q.gradeCategoryId === category.id,
      )) {
        const attempts = quiz.attempts.filter((a) => a.userId === user.id);
        if (attempts.some((a) => a.status === "NEEDS_GRADING"))
          pending.push(quiz.title);
        const completed = attempts.filter((a) => a.isGraded);
        if (!completed.length) missing.push(quiz.title);
        values.push({
          score: completed.length
            ? Math.max(...completed.map((a) => a.score))
            : 0,
          points: quiz.questions.reduce((s, q) => s + q.points, 0),
        });
      }
      for (const assignment of assignments.filter(
        (a) => a.gradeCategoryId === category.id,
      )) {
        const submission = assignment.submissions.find(
          (s) => s.userId === user.id,
        );
        if (submission && submission.score === null)
          pending.push(assignment.title);
        if (!submission) missing.push(assignment.title);
        values.push({
          score:
            submission?.score == null
              ? 0
              : (submission.score / assignment.maxScore) * 100,
          points: assignment.maxScore,
        });
      }
      if (!values.length && category.weightPercent > 0)
        missing.push(category.name);
      const included = values
        .sort((a, b) => a.score - b.score)
        .slice(Math.min(category.dropLowest, Math.max(0, values.length - 1)));
      const score = included.length
        ? category.aggregationMethod === "HIGHEST_SCORE"
          ? Math.max(...included.map((v) => v.score))
          : category.aggregationMethod === "WEIGHTED_POINTS"
            ? included.reduce((s, v) => s + v.score * v.points, 0) /
              included.reduce((s, v) => s + v.points, 0)
            : included.reduce((s, v) => s + v.score, 0) / included.length
        : 0;
      return {
        categoryId: category.id,
        name: category.name,
        score: round(score),
        weight: category.weightPercent,
        source: "ASSESSMENT",
      };
    });
    const finalScore = round(
      categoryScores.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0),
    );
    return {
      user,
      progress,
      categoryScores,
      finalScore,
      ...gradeLetter(finalScore),
      pending,
      missing,
      record: saved.find((s) => s.userId === user.id) ?? null,
    };
  });
  return {
    categories,
    rows,
    weightsValid: validateTotal(categories.map((c) => c.weightPercent)),
  };
}
export async function refreshPublishedFinal(
  tx: Prisma.TransactionClient,
  context: Context,
  classId: string,
  userId: string,
  reason?: string,
) {
  const before = await tx.finalGradeRecord.findUnique({
    where: { classId_userId: { classId, userId } },
  });
  if (!before?.publishedAt) return;
  ensure(
    reason && reason.trim().length >= 5,
    400,
    "CORRECTION_REASON_REQUIRED",
  );
  const result = await calculateGradebook(tx, classId, userId);
  const row = result.rows[0];
  ensure(
    row && result.weightsValid && !row.pending.length,
    409,
    "GRADING_INCOMPLETE",
  );
  const after = await tx.finalGradeRecord.update({
    where: { id: before.id },
    data: {
      categoryScoresJson: json(row.categoryScores),
      finalScore: row.finalScore,
      gradeLetter: row.gradeLetter,
      gradePoint: row.gradePoint,
    },
  });
  await audit(
    tx,
    context,
    "CORRECT_FINAL_GRADE",
    "FINAL_GRADE",
    after.id,
    classId,
    before,
    after,
    reason,
  );
  await notify(
    tx,
    classId,
    "GRADE_CORRECTED",
    "Hasil belajar diperbarui",
    `final-correction:${after.id}:${after.updatedAt.toISOString()}`,
    userId,
  );
}
export function registerGrades(app: Express) {
  app.get("/api/v1/course-classes/:id/gradebook", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    if (!cls.canManage) {
      const record = await db.finalGradeRecord.findFirst({
        where: {
          classId: cls.id,
          userId: req.context.user.id,
          publishedAt: { not: null },
        },
      });
      res.json({ canManage: false, record });
      return;
    }
    res.json({ canManage: true, ...(await calculateGradebook(db, cls.id)) });
  });
  app.get("/api/v1/course-classes/:id/grade-categories", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    res.json(
      await db.gradeCategory.findMany({
        where: { classId: cls.id },
        orderBy: { order: "asc" },
      }),
    );
  });
  app.put("/api/v1/course-classes/:id/grade-categories", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        ensure(
          (await tx.finalGradeRecord.count({
            where: { classId: cls.id, isLocked: true },
          })) === 0,
          423,
          "GRADEBOOK_LOCKED",
        );
        const { categories } = z
          .object({
            categories: z
              .array(
                z.object({
                  id: z.string().uuid().optional(),
                  name: z.string().trim().min(1).max(100),
                  weightPercent: z.number().min(0).max(100),
                  aggregationMethod: z
                    .enum([
                      "SIMPLE_AVERAGE",
                      "WEIGHTED_POINTS",
                      "HIGHEST_SCORE",
                    ])
                    .default("SIMPLE_AVERAGE"),
                  dropLowest: z.number().int().min(0).max(20).default(0),
                  kind: z
                    .enum(["ASSESSMENT", "PROGRESS"])
                    .default("ASSESSMENT"),
                }),
              )
              .min(1)
              .max(20),
          })
          .parse(req.body);
        ensure(
          validateTotal(categories.map((c) => c.weightPercent)),
          400,
          "WEIGHTS_TOTAL",
        );
        const before = await tx.gradeCategory.findMany({
          where: { classId: cls.id },
        });
        ensure(
          categories
            .filter((c) => c.id)
            .every((c) => before.some((b) => b.id === c.id)),
          400,
          "INVALID_CATEGORY",
        );
        ensure(
          new Set(categories.filter((c) => c.id).map((c) => c.id)).size ===
            categories.filter((c) => c.id).length,
          400,
          "INVALID_CATEGORY",
        );
        for (const old of before)
          if (!categories.some((c) => c.id === old.id)) {
            ensure(
              (await tx.quiz.count({ where: { gradeCategoryId: old.id } })) +
                (await tx.assignment.count({
                  where: { gradeCategoryId: old.id },
                })) +
                (await tx.manualGradeRecord.count({
                  where: { categoryId: old.id },
                })) ===
                0,
              409,
              "CATEGORY_IN_USE",
            );
            await tx.gradeCategory.delete({ where: { id: old.id } });
          }
        for (let order = 0; order < categories.length; order++) {
          const { id, ...data } = categories[order];
          if (id)
            await tx.gradeCategory.update({
              where: { id },
              data: { ...data, order },
            });
          else
            await tx.gradeCategory.create({
              data: { ...data, classId: cls.id, order },
            });
        }
        const after = await tx.gradeCategory.findMany({
          where: { classId: cls.id },
          orderBy: { order: "asc" },
        });
        await audit(
          tx,
          req.context,
          "UPDATE_WEIGHTS",
          "CLASS",
          cls.id,
          cls.id,
          before,
          after,
        );
        return after;
      }),
    ),
  );
  for (const action of ["calculate", "publish"] as const)
    app.post(
      `/api/v1/course-classes/:id/gradebook/${action}`,
      async (req, res) =>
        res.json(
          await mutate(req, async (tx) => {
            const cls = await classAccess(
              tx,
              req.context.user,
              String(req.params.id),
              true,
            );
            const result = await calculateGradebook(tx, cls.id);
            ensure(result.weightsValid, 400, "WEIGHTS_TOTAL");
            ensure(result.rows.length, 409, "NO_PARTICIPANTS");
            if (action === "publish") {
              ensure(
                result.rows.every((r) => !r.pending.length),
                409,
                "GRADING_INCOMPLETE",
              );
              ensure(
                req.body.acknowledgeMissing === true ||
                  result.rows.every((r) => !r.missing.length),
                409,
                "MISSING_SCORES",
              );
            }
            let count = 0;
            for (const row of result.rows) {
              if (row.record?.publishedAt) continue;
              const data = {
                categoryScoresJson: json(row.categoryScores),
                finalScore: row.finalScore,
                gradeLetter: row.gradeLetter,
                gradePoint: row.gradePoint,
                isLocked: action === "publish",
                publishedAt: action === "publish" ? new Date() : null,
              };
              const after = await tx.finalGradeRecord.upsert({
                where: {
                  classId_userId: { classId: cls.id, userId: row.user.id },
                },
                create: { ...data, classId: cls.id, userId: row.user.id },
                update: data,
              });
              await audit(
                tx,
                req.context,
                action === "publish" ? "PUBLISH_GRADEBOOK" : "SAVE_GRADE_DRAFT",
                "FINAL_GRADE",
                after.id,
                cls.id,
                row.record,
                after,
              );
              if (action === "publish")
                await notify(
                  tx,
                  cls.id,
                  "GRADE_PUBLISHED",
                  "Hasil belajar telah diterbitkan",
                  `final-grade:${after.id}`,
                  row.user.id,
                );
              count++;
            }
            return { count };
          }),
        ),
    );
  app.post("/api/v1/course-classes/:id/manual-grades", async (req, res) =>
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
            userId: z.string().uuid(),
            categoryId: z.string().uuid(),
            score: z.number().min(0).max(100),
            reason: z.string().trim().min(5).max(2000).optional(),
          })
          .parse(req.body);
        ensure(
          await tx.enrollment.findFirst({
            where: { classId: cls.id, userId: data.userId, isActive: true },
          }),
          400,
          "INVALID_STUDENT",
        );
        const category = await tx.gradeCategory.findUnique({
          where: { id: data.categoryId },
        });
        ensure(
          category &&
            category.classId === cls.id &&
            category.kind === "ASSESSMENT",
          400,
          "INVALID_CATEGORY",
        );
        const where = {
          classId_userId_categoryId: {
            classId: cls.id,
            userId: data.userId,
            categoryId: data.categoryId,
          },
        };
        const before = await tx.manualGradeRecord.findUnique({ where });
        if (before) ensure(data.reason, 400, "CORRECTION_REASON_REQUIRED");
        const after = await tx.manualGradeRecord.upsert({
          where,
          create: {
            classId: cls.id,
            userId: data.userId,
            categoryId: data.categoryId,
            score: data.score,
          },
          update: { score: data.score },
        });
        await audit(
          tx,
          req.context,
          "MANUAL_GRADE",
          "MANUAL_GRADE",
          after.id,
          cls.id,
          before,
          after,
          data.reason,
        );
        await refreshPublishedFinal(
          tx,
          req.context,
          cls.id,
          data.userId,
          data.reason,
        );
        return after;
      }),
    ),
  );
}
