import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createApp } from "../../apps/api/src/index.js";
import { db } from "../../apps/api/src/core.js";

test("publication and withdrawal enforce permissions and preserve content and grades", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const makeUser = (role: "INSTRUCTOR" | "STUDENT") => {
    const id = randomUUID();
    return db.user.create({
      data: {
        id,
        ssoUserId: id,
        name: `Publication ${role}`,
        email: `${id}@example.test`,
        identifierValue: id,
        role,
      },
    });
  };
  const cookies = new Map<string, string>();
  const request = async (
    user: any,
    path: string,
    expected = 200,
    key = randomUUID(),
    method = "POST",
  ) => {
    if (!cookies.has(user.id)) {
      const login = await fetch(`${base}/auth/development-login`, {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });
      assert.equal(login.status, 200);
      cookies.set(user.id, login.headers.get("set-cookie")!.split(";")[0]);
    }
    await new Promise((r) => setTimeout(r, 45));
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
        Cookie: cookies.get(user.id)!,
        "Idempotency-Key": key,
      },
      body: method === "GET" ? undefined : "{}",
    });
    const body = await response.json();
    assert.equal(response.status, expected, `${path}: ${JSON.stringify(body)}`);
    return body;
  };
  try {
    const teacher = await makeUser("INSTRUCTOR"),
      student = await makeUser("STUDENT"),
      outsider = await makeUser("INSTRUCTOR");
    const course = await db.course.create({
      data: {
        code: randomUUID(),
        title: "Publication",
        departmentCode: "IF",
        status: "PUBLISHED",
      },
    });
    const cls = await db.courseClass.create({
      data: {
        courseId: course.id,
        name: "A",
        academicYear: "2026",
        status: "PUBLISHED",
        instructors: { create: { userId: teacher.id } },
        enrollments: { create: { userId: student.id } },
      },
    });
    const section = await db.section.create({
      data: {
        classId: cls.id,
        title: "Section draf",
        order: 0,
        isVisible: false,
      },
    });
    const future = new Date(Date.now() + 3600000);
    const resource = await db.resourceItem.create({
      data: {
        sectionId: section.id,
        title: "Materi terjadwal",
        resourceType: "RICH_TEXT",
        isVisible: false,
        availableFrom: future,
        dynamicPayload: { blocks: [] },
      },
    });
    const assignment = await db.assignment.create({
      data: {
        sectionId: section.id,
        title: "Tugas draf",
        instructions: "Instruksi tetap",
        isVisible: false,
        maxScore: 75,
        allowedFormats: ["TEXT"],
      },
    });
    const quiz = await db.quiz.create({
      data: {
        sectionId: section.id,
        title: "Kuis draf",
        status: "DRAFT",
        isVisible: false,
        questions: {
          create: {
            text: "Benar?",
            type: "TRUE_FALSE",
            points: 90,
            options: [
              { id: "true", text: "Benar" },
              { id: "false", text: "Salah" },
            ],
            answerKey: { correct: ["true"] },
            rubric: [],
            order: 0,
          },
        },
      },
      include: { questions: true },
    });
    const announcement = await db.announcement.create({
      data: {
        classId: cls.id,
        authorId: teacher.id,
        title: "Pengumuman",
        content: "Konten tetap",
        isPublished: false,
        publishedAt: future,
      },
    });
    const paths = [
      `/sections/${section.id}/publish`,
      `/resources/${resource.id}/publish`,
      `/quizzes/${quiz.id}/publish`,
      `/assignments/${assignment.id}/publish`,
      `/announcements/${announcement.id}/publish`,
    ];
    for (const path of paths) {
      await request(student, path, 403);
      await request(outsider, path, 403);
    }
    await request(teacher, paths[0]);
    await request(teacher, paths[1]);
    const afterResource = await db.resourceItem.findUniqueOrThrow({
      where: { id: resource.id },
    });
    assert.equal(afterResource.isVisible, true);
    assert.equal(
      afterResource.availableFrom?.toISOString(),
      future.toISOString(),
    );
    assert.deepEqual(afterResource.dynamicPayload, resource.dynamicPayload);
    const rejected = await request(teacher, paths[2], 400);
    assert.equal(
      rejected.error.code,
      "QUIZ_POINTS_TOTAL",
      JSON.stringify(rejected),
    );
    assert.equal(
      (await db.quiz.findUniqueOrThrow({ where: { id: quiz.id } })).status,
      "DRAFT",
    );
    await db.question.update({
      where: { id: quiz.questions[0].id },
      data: { points: 100 },
    });
    const key = randomUUID();
    await request(teacher, paths[2], 200, key);
    await request(teacher, paths[2], 200, key);
    const afterQuiz = await db.quiz.findUniqueOrThrow({
      where: { id: quiz.id },
      include: { questions: true },
    });
    assert.equal(afterQuiz.status, "PUBLISHED");
    assert.equal(afterQuiz.isVisible, true);
    assert.equal(afterQuiz.questions[0].id, quiz.questions[0].id);
    assert.equal(
      await db.auditLog.count({
        where: { entityId: quiz.id, action: "PUBLISH" },
      }),
      1,
    );
    await request(teacher, paths[3]);
    const afterAssignment = await db.assignment.findUniqueOrThrow({
      where: { id: assignment.id },
    });
    assert.equal(afterAssignment.isVisible, true);
    assert.equal(afterAssignment.instructions, assignment.instructions);
    assert.equal(afterAssignment.maxScore, 75);
    assert.equal(
      await db.notification.count({
        where: { eventKey: `assignment:${assignment.id}` },
      }),
      1,
    );
    await request(teacher, paths[4]);
    assert.equal(
      (
        await db.announcement.findUniqueOrThrow({
          where: { id: announcement.id },
        })
      ).publishedAt.toISOString(),
      future.toISOString(),
    );
    assert.equal(
      await db.notification.count({
        where: { eventKey: `announcement:${announcement.id}` },
      }),
      0,
    );
    const attempt = await db.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: student.id,
        attemptNum: 1,
        questionSnapshot: [],
        answersJson: { true: "true" },
        expiresAt: future,
        status: "GRADED_COMPLETE",
        score: 95,
        objectiveScore: 95,
        isGraded: true,
        isPassed: true,
        publishedAt: new Date(),
      },
    });
    const grade = await db.quizAnswerGrade.create({
      data: {
        attemptId: attempt.id,
        questionId: quiz.questions[0].id,
        graderId: teacher.id,
        score: 95,
        feedback: "Dipertahankan",
      },
    });
    const submission = await db.assignmentSubmission.create({
      data: {
        assignmentId: assignment.id,
        userId: student.id,
        version: 1,
        status: "GRADED",
        textContent: "Jawaban mahasiswa",
        score: 60,
        feedback: "Dipertahankan",
        isPublished: true,
      },
    });
    const progress = await db.resourceProgress.create({
      data: {
        userId: student.id,
        resourceItemId: resource.id,
      },
    });
    const withdrawalPaths = paths.map((path) =>
      path.replace(/\/publish$/, "/unpublish"),
    );
    for (const path of withdrawalPaths) {
      await request(student, path, 403);
      await request(outsider, path, 403);
    }
    const withdrawKey = randomUUID();
    for (const path of withdrawalPaths)
      await request(
        teacher,
        path,
        200,
        path === withdrawalPaths[2] ? withdrawKey : randomUUID(),
      );
    await request(teacher, withdrawalPaths[2], 200, withdrawKey);
    assert.equal(
      await db.auditLog.count({
        where: { entityId: quiz.id, action: "UNPUBLISH" },
      }),
      1,
    );
    const hiddenQuiz = await db.quiz.findUniqueOrThrow({
      where: { id: quiz.id },
      include: { questions: true },
    });
    assert.equal(hiddenQuiz.isVisible, false);
    assert.equal(hiddenQuiz.status, "PUBLISHED");
    assert.deepEqual(hiddenQuiz.questions, afterQuiz.questions);
    assert.deepEqual(
      await db.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } }),
      attempt,
    );
    assert.deepEqual(
      await db.quizAnswerGrade.findUniqueOrThrow({ where: { id: grade.id } }),
      grade,
    );
    assert.deepEqual(
      await db.assignmentSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      }),
      submission,
    );
    assert.deepEqual(
      await db.resourceProgress.findUniqueOrThrow({
        where: {
          userId_resourceItemId: {
            userId: student.id,
            resourceItemId: resource.id,
          },
        },
      }),
      progress,
    );
    assert.deepEqual(
      (await db.resourceItem.findUniqueOrThrow({ where: { id: resource.id } }))
        .dynamicPayload,
      resource.dynamicPayload,
    );
    assert.equal(
      (
        await db.announcement.findUniqueOrThrow({
          where: { id: announcement.id },
        })
      ).isPublished,
      false,
    );
    const hiddenClass = await request(
      student,
      `/course-classes/${cls.id}`,
      200,
      randomUUID(),
      "GET",
    );
    assert.equal(hiddenClass.sections.length, 0);
    assert.equal(hiddenClass.announcements.length, 0);
    await request(teacher, paths[0]);
    const visibleSection = await request(
      student,
      `/course-classes/${cls.id}`,
      200,
      randomUUID(),
      "GET",
    );
    assert.equal(visibleSection.sections.length, 1);
    assert.equal(visibleSection.sections[0].resources.length, 0);
    assert.equal(visibleSection.sections[0].quizzes.length, 0);
    assert.equal(visibleSection.sections[0].assignments.length, 0);
    for (const path of [
      `/quizzes/${quiz.id}`,
      `/assignments/${assignment.id}`,
    ]) {
      await request(student, path, 403, randomUUID(), "GET");
    }
    for (const path of paths) await request(teacher, path);
    assert.deepEqual(
      (
        await db.quiz.findUniqueOrThrow({
          where: { id: quiz.id },
          include: { questions: true },
        })
      ).questions,
      afterQuiz.questions,
    );
    assert.deepEqual(
      await db.quizAttempt.findUniqueOrThrow({ where: { id: attempt.id } }),
      attempt,
    );
    assert.equal(
      (
        await db.resourceItem.findUniqueOrThrow({ where: { id: resource.id } })
      ).availableFrom?.toISOString(),
      future.toISOString(),
    );
    assert.equal(
      (
        await db.announcement.findUniqueOrThrow({
          where: { id: announcement.id },
        })
      ).publishedAt.toISOString(),
      future.toISOString(),
    );
    await db.courseClass.update({
      where: { id: cls.id },
      data: { status: "ARCHIVED" },
    });
    for (const path of paths) await request(teacher, path, 423);
    for (const path of withdrawalPaths) await request(teacher, path, 423);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await db.$disconnect();
  }
});
