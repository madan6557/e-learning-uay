import type { Express } from "express";
import type { Prisma, QuizAttempt } from "@prisma/client";
import { z } from "zod";
import { randomInt, randomUUID } from "node:crypto";
import {
  questionSchema,
  gradeAnswer,
  round,
  validateTotal,
  webUrl,
  type QuestionData,
} from "../../../packages/shared/src/domain.js";
import {
  db,
  ensure,
  itemAccess,
  classAccess,
  mutate,
  audit,
  available,
  json,
  notify,
  transaction,
  systemContext,
  type Context,
} from "./core.js";
import { validateWindow } from "./learning.js";
import { ensureOwnedFile } from "./files.js";
import { refreshPublishedFinal } from "./grades.js";
const title = z.string().trim().min(1).max(200);
const date = z
  .string()
  .datetime({ offset: true })
  .nullable()
  .optional()
  .transform((v) => (v ? new Date(v) : null));
const quizSchema = z
  .object({
    title,
    description: z.string().max(20000).default(""),
    gradeCategoryId: z.string().uuid().nullable().default(null),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    scoreMode: z.enum(["STRICT", "NORMALIZED"]).default("STRICT"),
    timeLimitMinutes: z.number().int().min(1).max(240).default(30),
    timerMode: z.enum(["INDEPENDENT", "GLOBAL"]).default("INDEPENDENT"),
    passingScore: z.number().min(0).max(100).default(60),
    attemptLimit: z.number().int().min(1).max(10).default(1),
    randomizeQuestions: z.boolean().default(true),
    randomizeOptions: z.boolean().default(true),
    resultReleaseMode: z
      .enum(["AUTO", "HIDDEN", "MANUAL", "SCHEDULED"])
      .default("MANUAL"),
    resultReleaseAt: date,
    availableFrom: date,
    availableUntil: date,
    isVisible: z.boolean().default(true),
    questions: z.array(questionSchema).min(1).max(200),
  })
  .refine((q) => q.timerMode !== "GLOBAL" || !!q.availableUntil, {
    message: "GLOBAL_DEADLINE_REQUIRED",
    path: ["availableUntil"],
  });
const assignmentSchema = z.object({
  title,
  instructions: z.string().trim().min(1).max(50000),
  gradeCategoryId: z.string().uuid().nullable().default(null),
  maxScore: z.number().positive().max(1000).default(100),
  allowedFormats: z
    .array(
      z.enum([
        "PDF",
        "ZIP",
        "PNG",
        "JPG",
        "PY",
        "CPP",
        "DOCX",
        "CSV",
        "TEXT",
        "LINK",
      ]),
    )
    .min(1)
    .default(["TEXT", "PDF", "ZIP", "LINK"]),
  availableFrom: date,
  deadline: date,
  cutoffDate: date,
  allowLate: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).max(20).default(3),
  isVisible: z.boolean().default(false),
});
const shuffle = <T>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const publicQuestion = ({
  answerKey,
  explanation,
  ...question
}: QuestionData) => question;
export function presentAttempt(attempt: any, manage = false) {
  const published =
    attempt.publishedAt && new Date(attempt.publishedAt) <= new Date();
  return {
    ...attempt,
    questionSnapshot: (attempt.questionSnapshot as QuestionData[]).map((q) =>
      manage ? q : publicQuestion(q),
    ),
    ...(!manage && !published
      ? {
          score: undefined,
          objectiveScore: undefined,
          isPassed: undefined,
          answerGrades: undefined,
        }
      : {}),
    quiz: undefined,
    user: manage ? attempt.user : undefined,
  };
}
export function presentSubmission(submission: any, manage = false) {
  return {
    ...submission,
    ...(!manage && !submission.isPublished
      ? { score: undefined, feedback: undefined, gradedAt: undefined }
      : {}),
    user: manage ? submission.user : undefined,
  };
}
async function checkCategory(
  tx: Prisma.TransactionClient,
  id: string | null,
  classId: string,
) {
  if (id) {
    const category = await tx.gradeCategory.findUnique({ where: { id } });
    ensure(
      category && category.classId === classId && category.kind !== "PROGRESS",
      400,
      "INVALID_CATEGORY",
    );
  }
}
async function validateAnswers(
  tx: Prisma.TransactionClient,
  attempt: QuizAttempt,
  answers: Record<string, unknown>,
  classId: string,
) {
  const questions = attempt.questionSnapshot as unknown as QuestionData[];
  for (const [id, value] of Object.entries(answers)) {
    const q = questions.find((q) => q.id === id);
    ensure(q, 400, "INVALID_ANSWER");
    if (value === null || value === "") continue;
    const options = q.options.map((o) => o.id);
    if (q.type === "SINGLE_CHOICE" || q.type === "TRUE_FALSE")
      ensure(
        typeof value === "string" && options.includes(value),
        400,
        "INVALID_ANSWER",
      );
    if (q.type === "MULTIPLE_SELECT" || q.type === "ORDERING")
      ensure(
        Array.isArray(value) &&
          value.every((v) => typeof v === "string" && options.includes(v)) &&
          new Set(value).size === value.length &&
          (q.type !== "ORDERING" || value.length === options.length),
        400,
        "INVALID_ANSWER",
      );
    if (q.type === "MATCHING")
      ensure(
        typeof value === "object" &&
          !Array.isArray(value) &&
          Object.entries(value).every(
            ([k, v]) =>
              options.includes(k) &&
              typeof v === "string" &&
              (v === "" || options.includes(v)),
          ),
        400,
        "INVALID_ANSWER",
      );
    if (q.type === "SHORT_ANSWER" || q.type === "ESSAY")
      ensure(
        typeof value === "string" &&
          value.length <= 100000 &&
          (q.type !== "ESSAY" ||
            value.trim().split(/\s+/).length <= q.maxWords),
        400,
        "ANSWER_TOO_LONG",
      );
    if (q.type === "FILE_UPLOAD") {
      ensure(typeof value === "string", 400, "INVALID_ANSWER");
      await ensureOwnedFile(
        tx,
        value,
        attempt.userId,
        classId,
        "QUIZ_ANSWER",
        attempt.id,
      );
    }
  }
}
export async function finalizeAttempt(
  tx: Prisma.TransactionClient,
  attempt: QuizAttempt,
  context: Context,
  forced = false,
) {
  if (attempt.status !== "IN_PROGRESS") return attempt;
  const quiz = await tx.quiz.findUniqueOrThrow({
    where: { id: attempt.quizId },
    include: { section: true },
  });
  const questions = attempt.questionSnapshot as unknown as QuestionData[];
  const answers = attempt.answersJson as Record<string, unknown>;
  const objectiveScore = round(
    questions.reduce(
      (sum, q) => sum + (gradeAnswer(q, answers[q.id!]) ?? 0),
      0,
    ),
  );
  const total = questions.reduce((sum, q) => sum + q.points, 0);
  const manual = questions.some((q) =>
    ["ESSAY", "FILE_UPLOAD"].includes(q.type),
  );
  const score = round((objectiveScore / total) * 100);
  const after = await tx.quizAttempt.update({
    where: { id: attempt.id },
    data: {
      status: manual ? "NEEDS_GRADING" : "GRADED_COMPLETE",
      submittedAt: new Date(),
      forced,
      objectiveScore,
      score,
      isGraded: !manual,
      isPassed: !manual && score >= quiz.passingScore,
      publishedAt:
        !manual && quiz.resultReleaseMode === "AUTO" ? new Date() : null,
      revision: { increment: 1 },
    },
  });
  await audit(
    tx,
    context,
    forced ? "QUIZ_AUTO_EXPIRE" : "SUBMIT_QUIZ",
    "ATTEMPT",
    attempt.id,
    quiz.section.classId,
    { status: attempt.status },
    { status: after.status, score: after.score, forced },
  );
  if (after.publishedAt)
    await notify(
      tx,
      quiz.section.classId,
      "GRADE_PUBLISHED",
      quiz.title,
      `quiz-grade:${after.id}`,
      attempt.userId,
    );
  return after;
}
export function registerAssessment(app: Express) {
  app.get("/api/v1/course-classes/:id/question-banks", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
    res.json(
      await db.questionBank.findMany({
        where: { courseId: cls.courseId },
        include: {
          questions: { where: { quizId: null }, orderBy: { order: "asc" } },
        },
      }),
    );
  });
  app.post("/api/v1/course-classes/:id/question-banks", async (req, res) =>
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
            questions: z.array(questionSchema).max(500).default([]),
          })
          .parse(req.body);
        const after = await tx.questionBank.create({
          data: {
            courseId: cls.courseId,
            title: data.title,
            questions: {
              create: data.questions.map(({ id, ...q }, order) => ({
                ...q,
                options: json(q.options),
                answerKey: json(q.answerKey),
                rubric: json(q.rubric),
                order,
              })),
            },
          },
        });
        await audit(
          tx,
          req.context,
          "CREATE",
          "QUESTION_BANK",
          after.id,
          cls.id,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.post(
    "/api/v1/course-classes/:id/question-banks/:bankId/questions",
    async (req, res) =>
      res.json(
        await mutate(req, async (tx) => {
          const cls = await classAccess(
            tx,
            req.context.user,
            String(req.params.id),
            true,
          );
          const bank = await tx.questionBank.findUnique({
            where: { id: String(req.params.bankId) },
          });
          ensure(bank?.courseId === cls.courseId, 403, "WRITE_ACCESS_DENIED");
          const { id, ...q } = questionSchema.parse(req.body);
          const after = await tx.question.create({
            data: {
              ...q,
              questionBankId: bank.id,
              options: json(q.options),
              answerKey: json(q.answerKey),
              rubric: json(q.rubric),
            },
          });
          await audit(
            tx,
            req.context,
            "CREATE",
            "QUESTION",
            after.id,
            cls.id,
            null,
            after,
          );
          return after;
        }),
      ),
  );
  app.post("/api/v1/sections/:id/quizzes", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const cls = await itemAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        const { questions, ...data } = quizSchema.parse(req.body);
        validateWindow(data.availableFrom, data.availableUntil);
        await checkCategory(tx, data.gradeCategoryId, cls.id);
        ensure(
          data.status !== "PUBLISHED" ||
            data.scoreMode === "NORMALIZED" ||
            validateTotal(questions.map((q) => q.points)),
          400,
          "QUIZ_POINTS_TOTAL",
        );
        ensure(
          data.resultReleaseMode !== "SCHEDULED" || data.resultReleaseAt,
          400,
          "RELEASE_DATE_REQUIRED",
        );
        const after = await tx.quiz.create({
          data: {
            ...data,
            sectionId: String(req.params.id),
            questions: {
              create: questions.map(({ id, ...q }, order) => ({
                ...q,
                options: json(q.options),
                answerKey: json(q.answerKey),
                rubric: json(q.rubric),
                order,
              })),
            },
          },
          include: { questions: true },
        });
        await audit(
          tx,
          req.context,
          "CREATE",
          "QUIZ",
          after.id,
          cls.id,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.patch("/api/v1/quizzes/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.quiz.findUnique({
          where: { id: String(req.params.id) },
          include: { questions: true },
        });
        ensure(before, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          before.sectionId,
          true,
        );
        ensure(
          (await tx.quizAttempt.count({ where: { quizId: before.id } })) === 0,
          409,
          "QUIZ_HAS_ATTEMPTS",
        );
        const { questions, ...data } = quizSchema.parse(req.body);
        validateWindow(data.availableFrom, data.availableUntil);
        await checkCategory(tx, data.gradeCategoryId, cls.id);
        ensure(
          data.status !== "PUBLISHED" ||
            data.scoreMode === "NORMALIZED" ||
            validateTotal(questions.map((q) => q.points)),
          400,
          "QUIZ_POINTS_TOTAL",
        );
        ensure(
          data.resultReleaseMode !== "SCHEDULED" || data.resultReleaseAt,
          400,
          "RELEASE_DATE_REQUIRED",
        );
        await tx.question.deleteMany({ where: { quizId: before.id } });
        const after = await tx.quiz.update({
          where: { id: before.id },
          data: {
            ...data,
            questions: {
              create: questions.map(({ id, ...q }, order) => ({
                ...q,
                options: json(q.options),
                answerKey: json(q.answerKey),
                rubric: json(q.rubric),
                order,
              })),
            },
          },
          include: { questions: true },
        });
        await audit(
          tx,
          req.context,
          "UPDATE",
          "QUIZ",
          after.id,
          cls.id,
          before,
          after,
        );
        return after;
      }),
    ),
  );
  app.get("/api/v1/quizzes/:id", async (req, res) => {
    const quiz = await db.quiz.findUnique({
      where: { id: String(req.params.id) },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    ensure(quiz, 404, "NOT_FOUND");
    const cls = await itemAccess(db, req.context.user, quiz.sectionId);
    if (!cls.canManage) {
      ensure(quiz.status === "PUBLISHED", 403, "CONTENT_HIDDEN");
      available(quiz);
    }
    const attempts = await db.quizAttempt.findMany({
      where: {
        quizId: quiz.id,
        ...(!cls.canManage ? { userId: req.context.user.id } : {}),
      },
      include: {
        user: { select: { fullName: true, studentStaffNumber: true } },
        answerGrades: true,
      },
      orderBy: { startedAt: "desc" },
    });
    res.json({
      ...quiz,
      questions: cls.canManage ? quiz.questions : undefined,
      attempts: attempts.map((a) => presentAttempt(a, cls.canManage)),
      canManage: cls.canManage,
      classId: cls.id,
    });
  });
  app.post("/api/v1/quizzes/:id/attempts", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const quiz = await tx.quiz.findUnique({
          where: { id: String(req.params.id) },
          include: { questions: { orderBy: { order: "asc" } } },
        });
        ensure(quiz, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          quiz.sectionId,
          true,
          true,
        );
        ensure(!cls.canManage, 403, "STUDENT_REQUIRED");
        ensure(quiz.status === "PUBLISHED", 403, "CONTENT_HIDDEN");
        available(quiz);
        const finalGrade = await tx.finalGradeRecord.findUnique({
          where: {
            classId_userId: { classId: cls.id, userId: req.context.user.id },
          },
        });
        ensure(!finalGrade?.isLocked, 423, "GRADEBOOK_LOCKED");
        const existing = await tx.quizAttempt.findMany({
          where: { quizId: quiz.id, userId: req.context.user.id },
          orderBy: { attemptNum: "desc" },
        });
        const active = existing.find((a) => a.status === "IN_PROGRESS");
        if (active && active.expiresAt > new Date())
          return presentAttempt(active);
        if (active) await finalizeAttempt(tx, active, req.context, true);
        ensure(existing.length < quiz.attemptLimit, 403, "ATTEMPT_LIMIT");
        let questions = quiz.questions.map((q) => questionSchema.parse(q));
        if (quiz.randomizeQuestions) questions = shuffle(questions);
        questions = questions.map((q) => ({
          ...q,
          options: quiz.randomizeOptions ? shuffle(q.options) : q.options,
        }));
        const expiresAt = new Date(
          quiz.timerMode === "GLOBAL"
            ? quiz.availableUntil!.getTime()
            : Math.min(
                Date.now() + (quiz.timeLimitMinutes ?? 30) * 60000,
                quiz.availableUntil?.getTime() ?? Infinity,
              ),
        );
        const after = await tx.quizAttempt.create({
          data: {
            quizId: quiz.id,
            userId: req.context.user.id,
            attemptNum: existing.length + 1,
            answersJson: {},
            questionSnapshot: json(questions),
            expiresAt,
          },
        });
        await audit(
          tx,
          req.context,
          "START_QUIZ",
          "ATTEMPT",
          after.id,
          cls.id,
          null,
          { quizId: quiz.id, expiresAt },
        );
        return presentAttempt(after);
      }),
    ),
  );
  app.put("/api/v1/attempts/:id/answers", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.quizAttempt.findUnique({
          where: { id: String(req.params.id) },
          include: { quiz: true },
        });
        ensure(
          before && before.userId === req.context.user.id,
          403,
          "ATTEMPT_ACCESS_DENIED",
        );
        const cls = await itemAccess(
          tx,
          req.context.user,
          before.quiz.sectionId,
          true,
          true,
        );
        ensure(before.status === "IN_PROGRESS", 409, "ATTEMPT_CLOSED");
        if (before.expiresAt <= new Date())
          return presentAttempt(
            await finalizeAttempt(tx, before, req.context, true),
          );
        const data = z
          .object({
            revision: z.number().int().nonnegative(),
            answers: z.record(z.unknown()),
          })
          .parse(req.body);
        ensure(before.revision === data.revision, 409, "ANSWER_CONFLICT");
        await validateAnswers(tx, before, data.answers, cls.id);
        const after = await tx.quizAttempt.update({
          where: { id: before.id },
          data: { answersJson: json(data.answers), revision: { increment: 1 } },
        });
        return presentAttempt(after);
      }),
    ),
  );
  app.post("/api/v1/attempts/:id/submit", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const attempt = await tx.quizAttempt.findUnique({
          where: { id: String(req.params.id) },
          include: { quiz: true },
        });
        ensure(
          attempt && attempt.userId === req.context.user.id,
          403,
          "ATTEMPT_ACCESS_DENIED",
        );
        await itemAccess(
          tx,
          req.context.user,
          attempt.quiz.sectionId,
          true,
          true,
        );
        return presentAttempt(
          await finalizeAttempt(
            tx,
            attempt,
            req.context,
            attempt.expiresAt <= new Date(),
          ),
        );
      }),
    ),
  );
  app.post(
    ["/api/v1/attempts/:id/grades", "/api/v1/attempts/:id/grades/batch"],
    async (req, res) =>
      res.json(
        await mutate(req, async (tx) => {
          const attempt = await tx.quizAttempt.findUnique({
            where: { id: String(req.params.id) },
            include: {
              quiz: { include: { section: true } },
              answerGrades: true,
            },
          });
          ensure(attempt, 404, "NOT_FOUND");
          const cls = await itemAccess(
            tx,
            req.context.user,
            attempt.quiz.sectionId,
            true,
          );
          ensure(
            attempt.status !== "IN_PROGRESS",
            409,
            "ATTEMPT_NOT_SUBMITTED",
          );
          const final = await tx.finalGradeRecord.findUnique({
            where: {
              classId_userId: { classId: cls.id, userId: attempt.userId },
            },
          });
          ensure(
            !final?.isLocked || final.publishedAt,
            423,
            "GRADEBOOK_LOCKED",
          );
          const batch = req.path.endsWith("/batch");
          const data = z
            .object({
              grades: z
                .array(
                  z.object({
                    questionId: z.string().uuid(),
                    score: z.number().nonnegative(),
                    feedback: z.string().max(20000).default(""),
                    reason: z.string().trim().min(5).max(2000).optional(),
                  }),
                )
                .min(1)
                .max(500),
              reason: z.string().trim().min(5).max(2000).optional(),
            })
            .parse(batch ? req.body : { grades: [req.body] });
          ensure(
            new Set(data.grades.map((g) => g.questionId)).size ===
              data.grades.length,
            400,
            "DUPLICATE_GRADE",
          );
          const questions =
            attempt.questionSnapshot as unknown as QuestionData[];
          const errors: any[] = [];
          const prepared = data.grades.map((g, index) => {
            const q = questions.find((q) => q.id === g.questionId);
            const before = attempt.answerGrades.find(
              (v) => v.questionId === g.questionId,
            );
            const reason = g.reason ?? data.reason;
            const code =
              !q ||
              !["ESSAY", "FILE_UPLOAD"].includes(q.type) ||
              g.score > q.points
                ? "INVALID_SCORE"
                : (before || attempt.publishedAt || final?.publishedAt) &&
                    !reason
                  ? "CORRECTION_REASON_REQUIRED"
                  : null;
            if (code) errors.push({ index, questionId: g.questionId, code });
            return { g, before, reason };
          });
          ensure(!errors.length, 400, errors[0]?.code ?? "VALIDATION_ERROR", {
            rows: errors,
          });
          for (const { g, before, reason } of prepared) {
            const grade = await tx.quizAnswerGrade.upsert({
              where: {
                attemptId_questionId: {
                  attemptId: attempt.id,
                  questionId: g.questionId,
                },
              },
              create: {
                attemptId: attempt.id,
                questionId: g.questionId,
                graderId: req.context.user.id,
                score: g.score,
                feedback: g.feedback,
              },
              update: {
                score: g.score,
                feedback: g.feedback,
                graderId: req.context.user.id,
                gradedAt: new Date(),
              },
            });
            await audit(
              tx,
              req.context,
              "GRADE_ANSWER",
              "ANSWER_GRADE",
              grade.id,
              cls.id,
              before,
              grade,
              reason,
            );
          }
          const grades = await tx.quizAnswerGrade.findMany({
            where: { attemptId: attempt.id },
          });
          const complete = questions
            .filter((q) => ["ESSAY", "FILE_UPLOAD"].includes(q.type))
            .every((q) => grades.some((g) => g.questionId === q.id));
          const score = round(
            ((attempt.objectiveScore +
              grades.reduce((s, g) => s + g.score, 0)) /
              questions.reduce((s, q) => s + q.points, 0)) *
              100,
          );
          const after = await tx.quizAttempt.update({
            where: { id: attempt.id },
            data: {
              score,
              status: complete ? "GRADED_COMPLETE" : "NEEDS_GRADING",
              isGraded: complete,
              isPassed: complete && score >= attempt.quiz.passingScore,
            },
          });
          if (attempt.publishedAt)
            await notify(
              tx,
              cls.id,
              "GRADE_CORRECTED",
              attempt.quiz.title,
              "quiz-correction:" + attempt.id + ":" + req.context.requestId,
              attempt.userId,
            );
          await refreshPublishedFinal(
            tx,
            req.context,
            cls.id,
            attempt.userId,
            data.reason ?? prepared.find((p) => p.reason)?.reason,
          );
          return batch ? { count: data.grades.length, attempt: after } : after;
        }),
      ),
  );
  app.post("/api/v1/quizzes/:id/publish-grades", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const quiz = await tx.quiz.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(quiz, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          quiz.sectionId,
          true,
        );
        const attempts = await tx.quizAttempt.findMany({
          where: { quizId: quiz.id },
        });
        ensure(
          attempts.length &&
            attempts.every((a) => a.status === "GRADED_COMPLETE"),
          409,
          "GRADING_INCOMPLETE",
        );
        for (const before of attempts) {
          if (before.publishedAt) continue;
          const after = await tx.quizAttempt.update({
            where: { id: before.id },
            data: { publishedAt: new Date() },
          });
          await notify(
            tx,
            cls.id,
            "GRADE_PUBLISHED",
            quiz.title,
            `quiz-grade:${before.id}`,
            before.userId,
          );
          await audit(
            tx,
            req.context,
            "PUBLISH_GRADE",
            "ATTEMPT",
            before.id,
            cls.id,
            { publishedAt: before.publishedAt },
            { publishedAt: after.publishedAt },
          );
        }
        return { published: attempts.length };
      }),
    ),
  );
  app.post("/api/v1/sections/:id/assignments", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const cls = await itemAccess(
          tx,
          req.context.user,
          String(req.params.id),
          true,
        );
        const data = assignmentSchema.parse(req.body);
        validateWindow(data.availableFrom, data.deadline);
        validateWindow(data.deadline, data.cutoffDate);
        await checkCategory(tx, data.gradeCategoryId, cls.id);
        const after = await tx.assignment.create({
          data: {
            ...data,
            allowedFormats: json(data.allowedFormats),
            sectionId: String(req.params.id),
          },
        });
        const section = await tx.section.findUniqueOrThrow({
          where: { id: after.sectionId },
        });
        if (
          after.isVisible &&
          cls.status === "PUBLISHED" &&
          cls.course.status === "PUBLISHED" &&
          (!after.availableFrom || after.availableFrom <= new Date()) &&
          section.isVisible &&
          (!section.startDate || section.startDate <= new Date()) &&
          (!section.endDate || section.endDate >= new Date())
        )
          await notify(
            tx,
            cls.id,
            "NEW_ASSIGNMENT",
            after.title,
            `assignment:${after.id}`,
          );
        await audit(
          tx,
          req.context,
          "CREATE",
          "ASSIGNMENT",
          after.id,
          cls.id,
          null,
          after,
        );
        return after;
      }),
    ),
  );
  app.patch("/api/v1/assignments/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.assignment.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(before, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          before.sectionId,
          true,
        );
        const data = assignmentSchema.parse(req.body);
        validateWindow(data.availableFrom, data.deadline);
        validateWindow(data.deadline, data.cutoffDate);
        await checkCategory(tx, data.gradeCategoryId, cls.id);
        if (
          await tx.assignmentSubmission.count({
            where: { assignmentId: before.id },
          })
        )
          ensure(
            data.maxScore === before.maxScore,
            409,
            "ASSIGNMENT_HAS_SUBMISSIONS",
          );
        const after = await tx.assignment.update({
          where: { id: before.id },
          data: { ...data, allowedFormats: json(data.allowedFormats) },
        });
        await audit(
          tx,
          req.context,
          "UPDATE",
          "ASSIGNMENT",
          after.id,
          cls.id,
          before,
          after,
        );
        return after;
      }),
    ),
  );
  app.get("/api/v1/assignments/:id", async (req, res) => {
    const assignment = await db.assignment.findUnique({
      where: { id: String(req.params.id) },
    });
    ensure(assignment, 404, "NOT_FOUND");
    const cls = await itemAccess(db, req.context.user, assignment.sectionId);
    if (!cls.canManage) available(assignment);
    const submissions = await db.assignmentSubmission.findMany({
      where: {
        assignmentId: assignment.id,
        ...(!cls.canManage ? { userId: req.context.user.id } : {}),
      },
      include: {
        user: { select: { fullName: true, studentStaffNumber: true } },
      },
      orderBy: [{ submittedAt: "desc" }],
    });
    res.json({
      ...assignment,
      submissions: submissions.map((s) => presentSubmission(s, cls.canManage)),
      canManage: cls.canManage,
      classId: cls.id,
    });
  });
  app.post("/api/v1/assignments/:id/submissions", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const assignment = await tx.assignment.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(assignment, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          assignment.sectionId,
          true,
          true,
        );
        ensure(!cls.canManage, 403, "STUDENT_REQUIRED");
        available(assignment);
        const now = new Date();
        const late = !!assignment.deadline && now > assignment.deadline;
        ensure(!late || assignment.allowLate, 403, "DEADLINE_PASSED");
        ensure(
          !assignment.cutoffDate || now <= assignment.cutoffDate,
          403,
          "CUTOFF_PASSED",
        );
        const locked = await tx.finalGradeRecord.findUnique({
          where: {
            classId_userId: { classId: cls.id, userId: req.context.user.id },
          },
        });
        ensure(!locked?.isLocked, 423, "GRADEBOOK_LOCKED");
        const data = z
          .object({
            textContent: z.string().trim().max(100000).optional(),
            externalUrl: webUrl.optional(),
            fileObjectId: z.string().optional(),
          })
          .parse(req.body);
        ensure(
          data.textContent || data.externalUrl || data.fileObjectId,
          400,
          "SUBMISSION_REQUIRED",
        );
        const formats = assignment.allowedFormats as string[];
        if (data.textContent)
          ensure(formats.includes("TEXT"), 400, "FILE_TYPE_OR_SIZE");
        if (data.externalUrl)
          ensure(formats.includes("LINK"), 400, "FILE_TYPE_OR_SIZE");
        let file;
        if (data.fileObjectId) {
          file = await ensureOwnedFile(
            tx,
            data.fileObjectId,
            req.context.user.id,
            cls.id,
            "SUBMISSION",
            assignment.id,
          );
          ensure(
            formats.includes(file.name.split(".").at(-1)!.toUpperCase()),
            400,
            "FILE_TYPE_OR_SIZE",
          );
        }
        const previous = await tx.assignmentSubmission.findFirst({
          where: { assignmentId: assignment.id, userId: req.context.user.id },
          orderBy: { version: "desc" },
        });
        ensure(
          (previous?.version ?? 0) < assignment.maxAttempts,
          403,
          "SUBMISSION_LIMIT",
        );
        if (previous)
          await tx.assignmentSubmission.update({
            where: { id: previous.id },
            data: { status: "SUPERSEDED" },
          });
        const after = await tx.assignmentSubmission.create({
          data: {
            ...data,
            assignmentId: assignment.id,
            userId: req.context.user.id,
            version: (previous?.version ?? 0) + 1,
            status: late ? "LATE" : "SUBMITTED",
            fileName: file?.name,
            fileSizeBytes: file?.sizeBytes,
          },
        });
        await audit(
          tx,
          req.context,
          previous ? "RESUBMIT_ASSIGNMENT" : "SUBMIT_ASSIGNMENT",
          "SUBMISSION",
          after.id,
          cls.id,
          previous,
          after,
        );
        return presentSubmission(after);
      }),
    ),
  );
  app.post("/api/v1/submissions/:id/grade", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.assignmentSubmission.findUnique({
          where: { id: String(req.params.id) },
          include: { assignment: true },
        });
        ensure(before, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          before.assignment.sectionId,
          true,
        );
        ensure(before.status !== "SUPERSEDED", 409, "SUBMISSION_SUPERSEDED");
        const data = z
          .object({
            score: z.number().min(0).max(before.assignment.maxScore),
            feedback: z.string().max(20000).default(""),
            reason: z.string().trim().min(5).max(2000).optional(),
          })
          .parse(req.body);
        if (before.score !== null)
          ensure(data.reason, 400, "CORRECTION_REASON_REQUIRED");
        const after = await tx.assignmentSubmission.update({
          where: { id: before.id },
          data: {
            score: data.score,
            feedback: data.feedback,
            gradedAt: new Date(),
            status: "GRADED",
          },
        });
        await audit(
          tx,
          req.context,
          "GRADE_SUBMISSION",
          "SUBMISSION",
          after.id,
          cls.id,
          before,
          after,
          data.reason,
        );
        if (after.isPublished)
          await notify(
            tx,
            cls.id,
            "GRADE_CORRECTED",
            before.assignment.title,
            `submission-correction:${after.id}:${after.gradedAt!.toISOString()}`,
            after.userId,
          );
        await refreshPublishedFinal(
          tx,
          req.context,
          cls.id,
          after.userId,
          data.reason,
        );
        return after;
      }),
    ),
  );
  app.post("/api/v1/assignments/:id/publish-grades", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const assignment = await tx.assignment.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(assignment, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          assignment.sectionId,
          true,
        );
        const submissions = await tx.assignmentSubmission.findMany({
          where: { assignmentId: assignment.id, status: { not: "SUPERSEDED" } },
        });
        ensure(
          submissions.length && submissions.every((s) => s.score !== null),
          409,
          "GRADING_INCOMPLETE",
        );
        for (const before of submissions) {
          if (before.isPublished) continue;
          await tx.assignmentSubmission.update({
            where: { id: before.id },
            data: { isPublished: true },
          });
          await notify(
            tx,
            cls.id,
            "GRADE_PUBLISHED",
            assignment.title,
            `submission-grade:${before.id}`,
            before.userId,
          );
          await audit(
            tx,
            req.context,
            "PUBLISH_GRADE",
            "SUBMISSION",
            before.id,
            cls.id,
            { isPublished: false },
            { isPublished: true },
          );
        }
        return { published: submissions.length };
      }),
    ),
  );
}
export async function expireAttempts() {
  const attempts = await db.quizAttempt.findMany({
    where: { status: "IN_PROGRESS", expiresAt: { lte: new Date() } },
    include: { user: true },
    take: 100,
  });
  for (const candidate of attempts)
    await transaction(async (tx) => {
      const attempt = await tx.quizAttempt.findUniqueOrThrow({
        where: { id: candidate.id },
      });
      await finalizeAttempt(tx, attempt, systemContext(candidate.user), true);
    });
}
