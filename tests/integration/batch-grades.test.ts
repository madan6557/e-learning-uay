import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createApp } from "../../apps/api/src/index.js";
import { db } from "../../apps/api/src/core.js";

test("batch grading validates, commits and audits one atomic operation", async (suite) => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const user = async (role: any) => {
    const id = randomUUID();
    return db.user.create({
      data: {
        id,
        ssoUserId: id,
        name: `Batch ${role}`,
        email: `${id}@example.test`,
        identifierValue: id,
        role,
      },
    });
  };
  const admin = await user("SUPER_ADMIN"),
    student = await user("STUDENT"),
    peer = await user("STUDENT");
  const course = await db.course.create({
    data: {
      code: randomUUID(),
      title: "Batch tests",
      departmentCode: "IF",
      status: "PUBLISHED",
    },
  });
  const cls = await db.courseClass.create({
    data: {
      courseId: course.id,
      name: "Batch A",
      academicYear: "2026",
      status: "PUBLISHED",
      enrollments: { create: [{ userId: student.id }, { userId: peer.id }] },
    },
  });
  const category = await db.gradeCategory.create({
    data: { classId: cls.id, name: "Evaluasi", weightPercent: 100 },
  });
  const section = await db.section.create({
    data: { classId: cls.id, title: "Evaluasi" },
  });
  const quiz = await db.quiz.create({
    data: {
      sectionId: section.id,
      title: "Essay",
      gradeCategoryId: category.id,
    },
  });
  const questions = await Promise.all(
    ["ESSAY", "FILE_UPLOAD"].map((type) =>
      db.question.create({
        data: {
          quizId: quiz.id,
          text: type,
          type: type as any,
          options: [],
          answerKey: {},
          points: 50,
        },
      }),
    ),
  );
  const attempt = await db.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: student.id,
      status: "NEEDS_GRADING",
      questionSnapshot: JSON.parse(JSON.stringify(questions)),
      answersJson: {},
      expiresAt: new Date(),
      submittedAt: new Date(),
    },
  });
  const login = async (userId: string) => {
    const r = await fetch(base + "/auth/development-login", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
    assert.equal(r.status, 200);
    return r.headers.get("set-cookie")!.split(";")[0];
  };
  const cookie = await login(admin.id),
    learnerCookie = await login(student.id);
  const request = async (
    path: string,
    body: any,
    expected = 200,
    key = randomUUID(),
    auth = cookie,
  ) => {
    await new Promise((r) => setTimeout(r, 40));
    const response = await fetch(base + path, {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        Cookie: auth,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    });
    const value = await response.json();
    assert.equal(response.status, expected, JSON.stringify(value));
    return value;
  };
  const manual = `/course-classes/${cls.id}/manual-grades/batch`,
    answers = `/attempts/${attempt.id}/grades/batch`;
  try {
    await suite.test(
      "invalid second row leaves both rows and audit unchanged",
      async () => {
        const result = await request(
          manual,
          {
            changes: [
              { userId: student.id, categoryId: category.id, score: 80 },
              { userId: peer.id, categoryId: randomUUID(), score: 90 },
            ],
          },
          400,
        );
        assert.equal(result.error.details.rows[0].index, 1);
        assert.equal(
          await db.manualGradeRecord.count({ where: { classId: cls.id } }),
          0,
        );
        assert.equal(
          await db.auditLog.count({ where: { classId: cls.id } }),
          0,
        );
        await request(
          manual,
          {
            changes: [
              { userId: student.id, categoryId: category.id, score: -1 },
            ],
          },
          400,
        );
        await request(
          manual,
          {
            changes: [
              { userId: student.id, categoryId: category.id, score: 80 },
            ],
          },
          403,
          randomUUID(),
          learnerCookie,
        );
      },
    );
    await suite.test(
      "valid batch is idempotent and subsequent correction needs a reason",
      async () => {
        const changes = [student, peer].map((u) => ({
          userId: u.id,
          categoryId: category.id,
          score: 80,
        }));
        const key = randomUUID();
        assert.equal((await request(manual, { changes }, 200, key)).count, 2);
        assert.equal((await request(manual, { changes }, 200, key)).count, 2);
        assert.equal(
          await db.auditLog.count({
            where: { classId: cls.id, action: "MANUAL_GRADE" },
          }),
          2,
        );
        await request(
          manual,
          { changes: changes.map((c) => ({ ...c, score: 90 })) },
          400,
        );
        assert.equal(
          (
            await db.manualGradeRecord.findFirstOrThrow({
              where: { classId: cls.id },
            })
          ).score,
          80,
        );
        await request(manual, { changes, reason: "Verifikasi hasil evaluasi" });
        await request(
          manual,
          { changes: [changes[0], changes[0]], reason: "Verifikasi ulang" },
          400,
        );
      },
    );
    await suite.test(
      "multi-answer batch rejects invalid points then completes once",
      async () => {
        const grades = questions.map((q) => ({
          questionId: q.id,
          score: 40,
          feedback: "Baik",
        }));
        await request(
          answers,
          { grades: [grades[0], { ...grades[1], score: 51 }] },
          400,
        );
        assert.equal(
          await db.quizAnswerGrade.count({ where: { attemptId: attempt.id } }),
          0,
        );
        const key = randomUUID(),
          result = await request(answers, { grades }, 200, key);
        assert.equal(result.count, 2);
        assert.equal(result.attempt.status, "GRADED_COMPLETE");
        assert.equal(result.attempt.score, 80);
        await request(answers, { grades }, 200, key);
        assert.equal(
          await db.quizAnswerGrade.count({ where: { attemptId: attempt.id } }),
          2,
        );
        await request(answers, { grades }, 400);
        await request(answers, {
          grades,
          reason: "Koreksi berdasarkan rubrik",
        });
      },
    );
    await suite.test(
      "locked unpublished record and archived class reject writes",
      async () => {
        await db.finalGradeRecord.create({
          data: {
            classId: cls.id,
            userId: student.id,
            categoryScoresJson: [],
            finalScore: 80,
            gradeLetter: "A",
            gradePoint: 4,
            isLocked: true,
          },
        });
        await request(
          answers,
          {
            grades: [{ questionId: questions[0].id, score: 45 }],
            reason: "Koreksi nilai",
          },
          423,
        );
        await db.courseClass.update({
          where: { id: cls.id },
          data: { status: "ARCHIVED" },
        });
        await request(
          manual,
          {
            changes: [{ userId: peer.id, categoryId: category.id, score: 90 }],
            reason: "Koreksi nilai",
          },
          423,
        );
      },
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await db.$disconnect();
  }
});
