import type { Express } from "express";
import { z } from "zod";
import { db, ensure, classAccess, mutate, audit, json } from "./core.js";
import { questionSchema } from "../../../packages/shared/src/domain.js";
import { refreshPublishedFinal } from "./grades.js";
const batchSchema = z.object({
  kind: z.enum(["ENROLLMENT", "GRADES", "QUESTIONS"]),
  categoryId: z.string().uuid().optional(),
  bankId: z.string().uuid().optional(),
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
async function review(
  tx: any,
  classId: string,
  courseId: string,
  batch: z.infer<typeof batchSchema>,
) {
  if (batch.kind === "GRADES")
    ensure(
      await tx.gradeCategory.findFirst({
        where: { id: batch.categoryId ?? "", classId, kind: "ASSESSMENT" },
      }),
      400,
      "INVALID_CATEGORY",
    );
  if (batch.kind === "QUESTIONS")
    ensure(
      await tx.questionBank.findFirst({
        where: { id: batch.bankId ?? "", courseId },
      }),
      400,
      "INVALID_QUESTION_BANK",
    );
  const keys = batch.rows.map((r) =>
    String(
      batch.kind === "QUESTIONS"
        ? (r.values.text ?? "")
        : (r.values.studentStaffNumber ?? ""),
    ).trim(),
  );
  const output = [];
  for (let index = 0; index < batch.rows.length; index++) {
    const row = batch.rows[index];
    const key = keys[index];
    const issues: string[] = [];
    let existing: any = null;
    let user: any = null;
    let parsed: any = null;
    if (!key) issues.push("MISSING_REQUIRED");
    if (
      key &&
      batch.rows.some((r, i) => i !== index && !r.exclude && keys[i] === key)
    )
      issues.push("DUPLICATE_FILE");
    if (batch.kind === "QUESTIONS") {
      const result = questionSchema.safeParse(row.values);
      if (!result.success) issues.push("INVALID_QUESTION");
      else parsed = result.data;
      existing = await tx.question.findFirst({
        where: { questionBankId: batch.bankId, quizId: null, text: key },
      });
    } else {
      user = await tx.user.findUnique({ where: { studentStaffNumber: key } });
      if (!user?.isActive || user.role !== "STUDENT")
        issues.push("SSO_IDENTITY_NOT_FOUND");
      if (user) {
        existing =
          batch.kind === "ENROLLMENT"
            ? await tx.enrollment.findUnique({
                where: { classId_userId: { classId, userId: user.id } },
              })
            : await tx.manualGradeRecord.findUnique({
                where: {
                  classId_userId_categoryId: {
                    classId,
                    userId: user.id,
                    categoryId: batch.categoryId,
                  },
                },
              });
      }
      if (batch.kind === "GRADES") {
        if (
          !user ||
          !(await tx.enrollment.findFirst({
            where: { classId, userId: user.id, isActive: true },
          }))
        )
          issues.push("NOT_ENROLLED");
        const value = row.values.score;
        if (
          value === null ||
          value === undefined ||
          String(value).trim() === "" ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0 ||
          Number(value) > 100
        )
          issues.push("INVALID_SCORE");
      }
      if (
        row.values.email &&
        !z.string().email().safeParse(row.values.email).success
      )
        issues.push("INVALID_EMAIL");
    }
    if (existing && !row.override) issues.push("DATABASE_CONFLICT");
    if (existing && batch.kind === "GRADES" && row.override && !batch.reason)
      issues.push("CORRECTION_REASON_REQUIRED");
    output.push({
      ...row,
      rowNumber: index + 2,
      key,
      issues: row.exclude ? [] : [...new Set(issues)],
      status: row.exclude ? "EXCLUDED" : issues.length ? "ISSUE" : "READY",
      existing,
      user,
      parsed,
    });
  }
  return output;
}
export function registerImports(app: Express) {
  app.post("/api/v1/course-classes/:id/imports/preview", async (req, res) => {
    const cls = await classAccess(
      db,
      req.context.user,
      String(req.params.id),
      true,
    );
    const batch = batchSchema.parse(req.body);
    const rows = await review(db, cls.id, cls.courseId, batch);
    res.json({
      rows: rows.map(({ user, parsed, ...row }) => row),
      ready: rows.filter((r) => r.status === "READY").length,
      issues: rows.filter((r) => r.status === "ISSUE").length,
    });
  });
  app.post("/api/v1/course-classes/:id/imports/commit", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const cls = await classAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        const batch = batchSchema.parse(req.body);
        const rows = await review(tx, cls.id, cls.courseId, batch);
        ensure(
          rows.every((r) => r.status !== "ISSUE"),
          409,
          "IMPORT_REVIEW_REQUIRED",
        );
        const selected = rows.filter((r) => r.status === "READY");
        ensure(selected.length, 400, "IMPORT_EMPTY");
        for (const row of selected) {
          let after;
          if (batch.kind === "ENROLLMENT")
            after = await tx.enrollment.upsert({
              where: {
                classId_userId: { classId: cls.id, userId: row.user.id },
              },
              create: { classId: cls.id, userId: row.user.id },
              update: { isActive: true },
            });
          else if (batch.kind === "GRADES") {
            after = await tx.manualGradeRecord.upsert({
              where: {
                classId_userId_categoryId: {
                  classId: cls.id,
                  userId: row.user.id,
                  categoryId: batch.categoryId!,
                },
              },
              create: {
                classId: cls.id,
                userId: row.user.id,
                categoryId: batch.categoryId!,
                score: Number(row.values.score),
              },
              update: { score: Number(row.values.score) },
            });
            await refreshPublishedFinal(
              tx,
              req.context,
              cls.id,
              row.user.id,
              batch.reason,
            );
          } else {
            const { id, ...q } = row.parsed;
            const data = {
              ...q,
              options: json(q.options),
              answerKey: json(q.answerKey),
              rubric: json(q.rubric),
            };
            after = row.existing
              ? await tx.question.update({
                  where: { id: row.existing.id },
                  data,
                })
              : await tx.question.create({
                  data: { ...data, questionBankId: batch.bankId },
                });
          }
          await audit(
            tx,
            req.context,
            "BULK_IMPORT_RECONCILED",
            batch.kind,
            after.id,
            cls.id,
            row.existing,
            after,
            batch.reason,
          );
        }
        return {
          imported: selected.length,
          excluded: rows.length - selected.length,
        };
      }),
    ),
  );
}
