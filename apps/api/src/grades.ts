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
  clampGrade,
  gradeLetterWithPolicy,
  GRADE_SCALE_PRESETS,
  DEFAULT_GRADE_SCALE,
} from "../../../packages/shared/src/domain.js";
import { classPath } from "../../../packages/shared/src/urls.js";

export async function calculateGradebook(
  tx: Prisma.TransactionClient,
  classId: string,
  onlyUserId?: string,
) {
  const [
    cls,
    categories,
    enrollments,
    resources,
    quizzes,
    assignments,
    manual,
    attendanceSessions,
    attendanceRecords,
  ] = await Promise.all([
    tx.courseClass.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        academicYear: true,
        gradeScaleVersion: true,
        gradeScalePolicy: true,
      },
    }),
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
          select: { id: true, name: true, identifierValue: true, email: true },
        },
      },
    }),
    tx.resourceItem.findMany({
      where: { section: { classId, isVisible: true }, isVisible: true },
      include: {
        videoProgresses: { where: onlyUserId ? { userId: onlyUserId } : {} },
        slideProgresses: { where: onlyUserId ? { userId: onlyUserId } : {} },
        downloads: { where: onlyUserId ? { userId: onlyUserId } : {} },
      },
    }),
    tx.quiz.findMany({
      where: { section: { classId }, status: "PUBLISHED" },
      include: {
        attempts: {
          where: {
            status: { not: "IN_PROGRESS" },
            ...(onlyUserId ? { userId: onlyUserId } : {}),
          },
        },
        questions: { select: { points: true } },
      },
    }),
    tx.assignment.findMany({
      where: { section: { classId }, isVisible: true },
      include: {
        submissions: {
          where: {
            status: { not: "SUPERSEDED" },
            ...(onlyUserId ? { userId: onlyUserId } : {}),
          },
        },
      },
    }),
    tx.manualGradeRecord.findMany({
      where: { classId, ...(onlyUserId ? { userId: onlyUserId } : {}) },
    }),
    tx.attendanceSession.findMany({
      where: { classId },
      select: { id: true, title: true, sessionDate: true },
    }),
    tx.attendanceRecord.findMany({
      where: {
        session: { classId },
        ...(onlyUserId ? { userId: onlyUserId } : {}),
      },
      select: { sessionId: true, userId: true, status: true },
    }),
  ]);

  const [textProgress, saved] = await Promise.all([
    tx.resourceProgress.findMany({
      where: {
        resourceItemId: { in: resources.map((r) => r.id) },
        ...(onlyUserId ? { userId: onlyUserId } : {}),
      },
    }),
    tx.finalGradeRecord.findMany({
      where: { classId, ...(onlyUserId ? { userId: onlyUserId } : {}) },
    }),
  ]);

  const policy =
    (cls?.gradeScalePolicy as any) ??
    GRADE_SCALE_PRESETS[cls?.gradeScaleVersion ?? "2026.1"] ??
    DEFAULT_GRADE_SCALE;

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
      const isMandatory =
        category.isMandatory ||
        ["uts", "uas"].includes(category.name.trim().toLowerCase());
      const effectiveSource =
        category.sourceType ||
        (category.kind === "PROGRESS" ? "PROGRESS" : "MANUAL");

      let suggestedScore = 0;

      if (effectiveSource === "PROGRESS" || category.kind === "PROGRESS") {
        suggestedScore = progress;
      } else if (effectiveSource === "ATTENDANCE") {
        const userAtt = attendanceRecords.filter((r) => r.userId === user.id);
        const attendedCount = userAtt.filter(
          (r) =>
            r.status === "PRESENT" ||
            r.status === "EXCUSED" ||
            r.status === "SICK",
        ).length;
        suggestedScore =
          attendanceSessions.length > 0
            ? round((attendedCount / attendanceSessions.length) * 100)
            : 100;
      } else {
        const values: { score: number; points: number }[] = [];
        const includeQuizzes =
          effectiveSource === "QUIZ" ||
          effectiveSource === "ASSIGNMENT_AND_QUIZ" ||
          quizzes.some((q) => q.gradeCategoryId === category.id);
        const includeAssignments =
          effectiveSource === "ASSIGNMENT" ||
          effectiveSource === "ASSIGNMENT_AND_QUIZ" ||
          assignments.some((a) => a.gradeCategoryId === category.id);

        if (includeQuizzes) {
          for (const quiz of quizzes.filter(
            (q) =>
              q.gradeCategoryId === category.id ||
              (effectiveSource === "QUIZ" && !q.gradeCategoryId),
          )) {
            const attempts = quiz.attempts.filter((a) => a.userId === user.id);
            if (attempts.some((a) => a.status === "NEEDS_GRADING"))
              pending.push(quiz.title);
            const completed = attempts.filter((a) => a.isGraded);
            if (!completed.length) missing.push(quiz.title);
            const totalPoints = quiz.questions.reduce(
              (s, q) => s + q.points,
              0,
            );
            values.push({
              score: completed.length
                ? totalPoints
                  ? round(
                      (Math.max(...completed.map((a) => a.score)) /
                        totalPoints) *
                        100,
                    )
                  : 0
                : 0,
              points: totalPoints || 100,
            });
          }
        }

        if (includeAssignments) {
          for (const assignment of assignments.filter(
            (a) =>
              a.gradeCategoryId === category.id ||
              (effectiveSource === "ASSIGNMENT" && !a.gradeCategoryId),
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
                  : assignment.maxScore
                    ? round((submission.score / assignment.maxScore) * 100)
                    : 0,
              points: assignment.maxScore || 100,
            });
          }
        }

        if (
          !values.length &&
          category.weightPercent > 0 &&
          effectiveSource !== "MANUAL"
        ) {
          missing.push(category.name);
        }

        if (values.length) {
          const included = values
            .sort((a, b) => a.score - b.score)
            .slice(
              Math.min(category.dropLowest, Math.max(0, values.length - 1)),
            );
          suggestedScore = included.length
            ? category.aggregationMethod === "HIGHEST_SCORE"
              ? Math.max(...included.map((v) => v.score))
              : category.aggregationMethod === "WEIGHTED_POINTS"
                ? included.reduce((s, v) => s + v.score * v.points, 0) /
                  (included.reduce((s, v) => s + v.points, 0) || 1)
                : included.reduce((s, v) => s + v.score, 0) / included.length
            : 0;
          suggestedScore = round(suggestedScore);
        }
      }

      const finalCategoryScore = override
        ? clampGrade(override.score)
        : effectiveSource === "MANUAL" && suggestedScore === 0
          ? 0
          : clampGrade(suggestedScore);

      return {
        categoryId: category.id,
        name: category.name,
        weight: category.weightPercent,
        weightPercent: category.weightPercent,
        isMandatory,
        sourceType: effectiveSource,
        score: round(finalCategoryScore),
        suggestedScore: round(suggestedScore),
        hasManualOverride: Boolean(override),
        source: override
          ? "MANUAL"
          : category.kind === "PROGRESS"
            ? "PROGRESS"
            : "ASSESSMENT",
      };
    });

    const finalScore = round(
      categoryScores.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0),
    );
    const { gradeLetter: letter, gradePoint: point } = gradeLetterWithPolicy(
      finalScore,
      policy,
    );

    return {
      user,
      progress,
      categoryScores,
      finalScore,
      gradeLetter: letter,
      gradePoint: point,
      pending,
      missing,
      record: saved.find((s) => s.userId === user.id) ?? null,
    };
  });

  return {
    class: {
      id: cls?.id ?? classId,
      name: cls?.name,
      academicYear: cls?.academicYear,
      gradeScaleVersion: cls?.gradeScaleVersion ?? "2026.1",
      gradeScalePolicy: cls?.gradeScalePolicy ?? null,
    },
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
  const cls = await tx.courseClass.findUnique({
    where: { id: classId },
    include: { course: true },
  });
  await notify(
    tx,
    classId,
    "GRADE_CORRECTED",
    "Hasil belajar diperbarui",
    `final-correction:${after.id}:${after.updatedAt.toISOString()}`,
    userId,
    cls ? `${classPath(cls)}/gradebook` : undefined,
    "Nilai akhir hasil belajar Anda telah diperbarui oleh pengajar.",
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
  app.get("/api/v1/grade-scales", (_req, res) => {
    res.json(GRADE_SCALE_PRESETS);
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
  app.get(
    "/api/v1/course-classes/:id/students/:userId/grade-breakdown",
    async (req, res) => {
      const cls = await classAccess(db, req.context.user, String(req.params.id));
      const targetUserId = String(req.params.userId);
      ensure(
        cls.canManage || req.context.user.id === targetUserId,
        403,
        "FORBIDDEN",
      );
      const result = await calculateGradebook(db, cls.id, targetUserId);
      const row = result.rows[0];
      ensure(row, 404, "STUDENT_NOT_FOUND");

      const [quizzes, assignments, attendanceSessions, attendanceRecords] =
        await Promise.all([
          db.quiz.findMany({
            where: { section: { classId: cls.id }, status: "PUBLISHED" },
            include: {
              attempts: {
                where: { userId: targetUserId, status: { not: "IN_PROGRESS" } },
                orderBy: { score: "desc" },
              },
              questions: { select: { points: true } },
            },
          }),
          db.assignment.findMany({
            where: { section: { classId: cls.id }, isVisible: true },
            include: {
              submissions: {
                where: { userId: targetUserId, status: { not: "SUPERSEDED" } },
                orderBy: { submittedAt: "desc" },
              },
            },
          }),
          db.attendanceSession.findMany({
            where: { classId: cls.id },
            orderBy: { sessionDate: "asc" },
          }),
          db.attendanceRecord.findMany({
            where: { session: { classId: cls.id }, userId: targetUserId },
          }),
        ]);

      const breakdownCategories = result.categories.map((cat) => {
        const catScoreInfo = row.categoryScores.find(
          (cs) => cs.categoryId === cat.id,
        );
        const isMandatory =
          cat.isMandatory ||
          ["uts", "uas"].includes(cat.name.trim().toLowerCase());
        const effectiveSource =
          cat.sourceType ||
          (cat.kind === "PROGRESS" ? "PROGRESS" : "MANUAL");

        const activities: any[] = [];

        if (
          effectiveSource === "QUIZ" ||
          effectiveSource === "ASSIGNMENT_AND_QUIZ" ||
          quizzes.some((q) => q.gradeCategoryId === cat.id)
        ) {
          const matchedQuizzes = quizzes.filter(
            (q) =>
              q.gradeCategoryId === cat.id ||
              (effectiveSource === "QUIZ" && !q.gradeCategoryId),
          );
          for (const q of matchedQuizzes) {
            const bestAttempt = q.attempts[0];
            const totalPoints = q.questions.reduce((s, qu) => s + qu.points, 0);
            const rawScore = bestAttempt?.score ?? 0;
            const normalized = totalPoints
              ? round((rawScore / totalPoints) * 100)
              : 0;
            activities.push({
              id: q.id,
              title: q.title,
              type: "QUIZ",
              rawScore,
              maxScore: totalPoints,
              normalizedScore: normalized,
              date: bestAttempt?.submittedAt ?? null,
              status: bestAttempt
                ? bestAttempt.isGraded
                  ? "Selesai"
                  : "Menunggu Penilaian"
                : "Belum Mengerjakan",
            });
          }
        }

        if (
          effectiveSource === "ASSIGNMENT" ||
          effectiveSource === "ASSIGNMENT_AND_QUIZ" ||
          assignments.some((a) => a.gradeCategoryId === cat.id)
        ) {
          const matchedAssignments = assignments.filter(
            (a) =>
              a.gradeCategoryId === cat.id ||
              (effectiveSource === "ASSIGNMENT" && !a.gradeCategoryId),
          );
          for (const a of matchedAssignments) {
            const sub = a.submissions[0];
            const rawScore = sub?.score ?? null;
            const maxScore = a.maxScore;
            const normalized =
              rawScore !== null && maxScore
                ? round((rawScore / maxScore) * 100)
                : 0;
            activities.push({
              id: a.id,
              title: a.title,
              type: "ASSIGNMENT",
              rawScore,
              maxScore,
              normalizedScore: normalized,
              date: sub?.submittedAt ?? null,
              status: sub
                ? sub.score !== null
                  ? "Dinilai"
                  : "Menunggu Penilaian"
                : "Belum Mengumpulkan",
            });
          }
        }

        if (effectiveSource === "PROGRESS" || cat.kind === "PROGRESS") {
          activities.push({
            id: "progress",
            title: "Progres Materi & Video Perkuliahan",
            type: "PROGRESS",
            rawScore: row.progress,
            maxScore: 100,
            normalizedScore: row.progress,
            date: null,
            status:
              row.progress >= 100 ? "Selesai" : `${row.progress}% Selesai`,
          });
        }

        if (effectiveSource === "ATTENDANCE") {
          const attendedCount = attendanceRecords.filter(
            (r) =>
              r.status === "PRESENT" ||
              r.status === "EXCUSED" ||
              r.status === "SICK",
          ).length;
          const total = attendanceSessions.length;
          const attPct = total > 0 ? round((attendedCount / total) * 100) : 100;
          activities.push({
            id: "attendance",
            title: `Kehadiran Tatap Muka (${attendedCount}/${total} Sesi Hadir)`,
            type: "ATTENDANCE",
            rawScore: attendedCount,
            maxScore: total,
            normalizedScore: attPct,
            date: null,
            status: `${attPct}% Kehadiran`,
          });
        }

        return {
          categoryId: cat.id,
          name: cat.name,
          weightPercent: cat.weightPercent,
          isMandatory,
          sourceType: effectiveSource,
          currentScore: catScoreInfo?.score ?? 0,
          suggestedScore: catScoreInfo?.suggestedScore ?? 0,
          hasManualOverride: Boolean(catScoreInfo?.hasManualOverride),
          activities,
        };
      });

      res.json({
        student: row.user,
        class: {
          id: cls.id,
          name: cls.name,
          academicYear: cls.academicYear,
          gradeScaleVersion: cls.gradeScaleVersion ?? "2026.1",
          gradeScalePolicy: cls.gradeScalePolicy ?? null,
        },
        categories: breakdownCategories,
        finalScore: row.finalScore,
        gradeLetter: row.gradeLetter,
        gradePoint: row.gradePoint,
        isPublished: Boolean(row.record?.publishedAt),
        publishedAt: row.record?.publishedAt ?? null,
      });
    },
  );

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
        const { categories, gradeScaleVersion } = z
          .object({
            gradeScaleVersion: z.string().optional(),
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
                  isMandatory: z.boolean().default(false),
                  sourceType: z.string().default("MANUAL"),
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
            const isMandatory =
              old.isMandatory ||
              ["uts", "uas"].includes(old.name.trim().toLowerCase());
            ensure(!isMandatory, 400, "MANDATORY_CATEGORY_CANNOT_BE_DELETED");
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
          const isMandatory =
            data.isMandatory ||
            ["uts", "uas"].includes(data.name.trim().toLowerCase());
          const sourceType =
            data.sourceType ||
            (data.kind === "PROGRESS" ? "PROGRESS" : "MANUAL");
          if (id)
            await tx.gradeCategory.update({
              where: { id },
              data: { ...data, isMandatory, sourceType, order },
            });
          else
            await tx.gradeCategory.create({
              data: {
                ...data,
                isMandatory,
                sourceType,
                classId: cls.id,
                order,
              },
            });
        }
        if (gradeScaleVersion && GRADE_SCALE_PRESETS[gradeScaleVersion]) {
          await tx.courseClass.update({
            where: { id: cls.id },
            data: { gradeScaleVersion },
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
                gradeScaleVersion: cls.gradeScaleVersion ?? "2026.1",
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
                  `${classPath(cls)}/gradebook`,
                  "Nilai akhir hasil belajar kelas Anda telah diterbitkan.",
                );
              count++;
            }
            return { count };
          }),
        ),
    );
  app.post(
    [
      "/api/v1/course-classes/:id/manual-grades",
      "/api/v1/course-classes/:id/manual-grades/batch",
    ],
    async (req, res) =>
      res.json(
        await mutate(req, async (tx) => {
          const cls = await classAccess(
            tx,
            req.context.user,
            String(req.params.id),
            true,
          );
          const item = z.object({
            userId: z.string().uuid(),
            categoryId: z.string().uuid(),
            score: z.number().transform((val) => clampGrade(val)),
            reason: z.string().trim().min(5).max(2000).optional(),
          });
          const batch = req.path.endsWith("/batch");
          const data = z
            .object({
              changes: z.array(item).min(1).max(2000),
              reason: z.string().trim().min(5).max(2000).optional(),
            })
            .parse(batch ? req.body : { changes: [req.body] });
          ensure(
            new Set(data.changes.map((c) => c.userId + ":" + c.categoryId))
              .size === data.changes.length,
            400,
            "DUPLICATE_GRADE",
          );
          const prepared = [];
          const errors: any[] = [];
          for (const [index, change] of data.changes.entries()) {
            const category = await tx.gradeCategory.findUnique({
              where: { id: change.categoryId },
            });
            const enrolled = await tx.enrollment.findFirst({
              where: { classId: cls.id, userId: change.userId, isActive: true },
            });
            const where = {
              classId_userId_categoryId: {
                classId: cls.id,
                userId: change.userId,
                categoryId: change.categoryId,
              },
            };
            const before = await tx.manualGradeRecord.findUnique({ where });
            const final = await tx.finalGradeRecord.findUnique({
              where: {
                classId_userId: { classId: cls.id, userId: change.userId },
              },
            });
            const reason = change.reason ?? data.reason;
            const code = !enrolled
              ? "INVALID_STUDENT"
              : !category || category.classId !== cls.id
                ? "INVALID_CATEGORY"
                : final?.isLocked && !final.publishedAt
                  ? "GRADEBOOK_LOCKED"
                  : (before || final?.publishedAt) && !reason
                    ? "CORRECTION_REASON_REQUIRED"
                    : null;
            if (code)
              errors.push({
                index,
                userId: change.userId,
                categoryId: change.categoryId,
                code,
              });
            prepared.push({ change, where, before, reason });
          }
          ensure(!errors.length, 400, errors[0]?.code ?? "VALIDATION_ERROR", {
            rows: errors,
          });
          const results = [];
          for (const { change, where, before, reason } of prepared) {
            const after = await tx.manualGradeRecord.upsert({
              where,
              create: {
                classId: cls.id,
                userId: change.userId,
                categoryId: change.categoryId,
                score: change.score,
              },
              update: { score: change.score },
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
              reason,
            );
            results.push(after);
          }
          // Refresh each published total once, after every category has been written.
          for (const userId of new Set(data.changes.map((c) => c.userId))) {
            const reason =
              data.reason ??
              prepared.find((p) => p.change.userId === userId && p.reason)
                ?.reason;
            await refreshPublishedFinal(
              tx,
              req.context,
              cls.id,
              userId,
              reason,
            );
          }
          return batch
            ? { count: results.length, changes: results }
            : results[0];
        }),
      ),
  );
}
