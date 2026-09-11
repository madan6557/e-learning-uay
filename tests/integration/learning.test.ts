import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createApp, runScheduledWork } from "../../apps/api/src/index.js";
import { db, cache } from "../../apps/api/src/core.js";

test("complete academic flow on PostgreSQL with isolation and integrity checks", async (suite) => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as any).port;
  const base = `http://127.0.0.1:${port}/api/v1`;
  const suffix = randomUUID().slice(0, 8);
  const makeUser = async (role: any, departmentScopes: string[] = []) => {
    const id = randomUUID();
    return db.user.create({
      data: {
        id,
        externalSubjectId: id,
        studentStaffNumber: `${suffix}-${role}-${departmentScopes.join("")}`,
        fullName: `Test ${role}`,
        email: `${id}@example.test`,
        role,
        departmentScopes,
      },
    });
  };
  const admin = await makeUser("SUPER_ADMIN"),
    teacher = await makeUser("INSTRUCTOR"),
    student = await makeUser("STUDENT"),
    outsider = await makeUser("STUDENT", ["OTHER"]),
    department = await makeUser("DEPARTMENT_ADMIN", ["OTHER"]);
  const cookies = new Map<string, string>();
  async function request(
    user: any,
    path: string,
    method = "GET",
    body?: any,
    expected = 200,
    key = randomUUID(),
  ) {
    await new Promise((r) => setTimeout(r, 45));
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        Cookie: cookies.get(user.id) ?? "",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: ${JSON.stringify(data)}`,
    );
    return data;
  }
  for (const user of [admin, teacher, student, outsider, department]) {
    const response = await fetch(base + "/auth/development-login", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    cookies.set(user.id, cookie.split(";")[0]);
  }
  let course: any,
    cls: any,
    section: any,
    resource: any,
    assignment: any,
    quiz: any,
    attempt: any,
    submission: any,
    categories: any[] = [];
  try {
    await suite.test(
      "admin creates course and class; department and outsider scopes are enforced",
      async () => {
        course = await request(
          admin,
          "/courses",
          "POST",
          {
            code: `TEST-${suffix}`,
            title: "Integration Course",
            departmentCode: "IF",
            status: "PUBLISHED",
          },
          201,
        );
        await request(
          department,
          "/courses",
          "POST",
          {
            code: `DENIED-${suffix}`,
            title: "Denied Course",
            departmentCode: "IF",
          },
          403,
        );
        cls = await request(
          admin,
          "/course-classes",
          "POST",
          {
            courseId: course.id,
            name: "Integration A",
            academicYear: "2026/2027",
            instructorIds: [teacher.id],
            status: "PUBLISHED",
          },
          201,
        );
        await request(
          teacher,
          `/course-classes/${cls.id}/participants`,
          "POST",
          { userId: student.id },
        );
        await request(
          outsider,
          `/course-classes/${cls.id}`,
          "GET",
          undefined,
          403,
        );
        await request(
          department,
          `/course-classes/${cls.id}`,
          "GET",
          undefined,
          403,
        );
        await request(
          student,
          `/course-classes/${cls.id}/participants`,
          "GET",
          undefined,
          403,
        );
        categories = await request(
          teacher,
          `/course-classes/${cls.id}/grade-categories`,
        );
      },
    );
    await suite.test(
      "content sanitization, draft isolation and page boundaries",
      async () => {
        section = await request(
          teacher,
          `/course-classes/${cls.id}/sections`,
          "POST",
          { title: "Lesson 1", isVisible: true },
          201,
        );
        resource = await request(
          teacher,
          `/sections/${section.id}/resources`,
          "POST",
          {
            title: "Article",
            resourceType: "RICH_TEXT",
            isVisible: true,
            dynamicPayload: {
              blocks: [
                {
                  id: "p",
                  type: "paragraph",
                  data: {
                    text: "<script>alert(1)</script><strong>Safe</strong><img src=x onerror=alert(1)>",
                  },
                },
              ],
            },
          },
          201,
        );
        assert.doesNotMatch(
          JSON.stringify(resource.dynamicPayload),
          /script|onerror/,
        );
        assert.match(JSON.stringify(resource.dynamicPayload), /strong/);
        const draft = await request(
          teacher,
          `/sections/${section.id}/resources`,
          "POST",
          {
            title: "Hidden",
            resourceType: "RICH_TEXT",
            isVisible: false,
            dynamicPayload: { blocks: [] },
          },
          201,
        );
        const view = await request(student, `/course-classes/${cls.id}`);
        assert(!view.sections[0].resources.some((r: any) => r.id === draft.id));
        await request(
          student,
          `/resources/${draft.id}/progress`,
          "POST",
          {},
          403,
        );
        const doc = await db.resourceItem.create({
          data: {
            sectionId: section.id,
            title: "PDF tracking",
            resourceType: "DOCUMENT",
            dynamicPayload: { totalPages: 50, fileObjectId: "test-pdf" },
            isVisible: true,
          },
        });
        await request(
          student,
          `/resources/${doc.id}/progress`,
          "POST",
          { page: 0 },
          400,
        );
        await request(
          student,
          `/resources/${doc.id}/progress`,
          "POST",
          { page: 51 },
          400,
        );
        await request(student, `/resources/${doc.id}/progress`, "POST", {
          page: 1,
        });
        const progress = await request(
          student,
          `/resources/${doc.id}/progress`,
          "POST",
          { page: 50 },
        );
        assert.equal(progress.percent, 4);
        const duplicate = await request(
          student,
          `/resources/${doc.id}/progress`,
          "POST",
          { page: 50 },
        );
        assert.deepEqual(duplicate.viewedPages, [1, 50]);
        await request(
          outsider,
          `/resources/${doc.id}/progress`,
          "POST",
          { page: 2 },
          403,
        );
      },
    );
    await suite.test(
      "idempotent versioned assignment submissions and draft grade secrecy",
      async () => {
        assignment = await request(
          teacher,
          `/sections/${section.id}/assignments`,
          "POST",
          {
            title: "Report",
            instructions: "Write a report",
            gradeCategoryId: categories[0].id,
            allowedFormats: ["TEXT"],
            maxAttempts: 3,
            isVisible: true,
            deadline: new Date(Date.now() - 1000).toISOString(),
            cutoffDate: new Date(Date.now() + 86400000).toISOString(),
            allowLate: true,
          },
          201,
        );
        const key = randomUUID();
        const [first, repeat] = await Promise.all([
          request(
            student,
            `/assignments/${assignment.id}/submissions`,
            "POST",
            { textContent: "first" },
            201,
            key,
          ),
          request(
            student,
            `/assignments/${assignment.id}/submissions`,
            "POST",
            { textContent: "first" },
            201,
            key,
          ),
        ]);
        assert.equal(first.id, repeat.id);
        assert.equal(first.version, 1);
        assert.equal(first.status, "LATE");
        await request(
          student,
          `/assignments/${assignment.id}/submissions`,
          "POST",
          { textContent: "different" },
          409,
          key,
        );
        submission = await request(
          student,
          `/assignments/${assignment.id}/submissions`,
          "POST",
          { textContent: "revision" },
          201,
        );
        assert.equal(submission.version, 2);
        const original = await db.assignmentSubmission.findUniqueOrThrow({
          where: { id: first.id },
        });
        assert.equal(original.textContent, "first");
        assert.equal(original.status, "SUPERSEDED");
        await request(teacher, `/submissions/${submission.id}/grade`, "POST", {
          score: 80,
          feedback: "Draft feedback",
        });
        const hidden = await request(student, `/assignments/${assignment.id}`);
        assert.equal(hidden.submissions[0].score, undefined);
        assert.equal(hidden.submissions[0].feedback, undefined);
        await request(
          outsider,
          `/assignments/${assignment.id}`,
          "GET",
          undefined,
          403,
        );
        await request(
          teacher,
          `/assignments/${assignment.id}/publish-grades`,
          "POST",
          {},
        );
        const published = await request(
          student,
          `/assignments/${assignment.id}`,
        );
        assert.equal(published.submissions[0].score, 80);
        await request(
          teacher,
          `/submissions/${submission.id}/grade`,
          "POST",
          { score: 90 },
          400,
        );
      },
    );
    await suite.test(
      "eight-type hybrid quiz, immutable snapshots and stale-answer protection",
      async () => {
        const options = [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ];
        const question = (type: string, answerKey: any, points = 10) => ({
          type,
          text: type,
          points,
          options,
          answerKey,
        });
        const questions = [
          question("SINGLE_CHOICE", { correct: ["a"] }),
          question("MULTIPLE_SELECT", {
            correct: ["a", "b"],
            partialCredit: true,
          }),
          question("TRUE_FALSE", { correct: ["a"] }),
          question("SHORT_ANSWER", { correct: ["HTTP"] }),
          question("MATCHING", { correct: [], pairs: { a: "b", b: "a" } }),
          question("ORDERING", { correct: ["a", "b"] }),
          question("ESSAY", { correct: [] }, 25),
          question("FILE_UPLOAD", { correct: [] }, 15),
        ];
        await request(
          teacher,
          `/sections/${section.id}/quizzes`,
          "POST",
          {
            title: "Invalid points",
            status: "PUBLISHED",
            questions: questions.slice(1),
          },
          400,
        );
        quiz = await request(
          teacher,
          `/sections/${section.id}/quizzes`,
          "POST",
          {
            title: "Hybrid Quiz",
            status: "PUBLISHED",
            gradeCategoryId: categories[1].id,
            questions,
            resultReleaseMode: "MANUAL",
          },
          201,
        );
        const metadata = await request(student, `/quizzes/${quiz.id}`);
        assert.equal(metadata.questions, undefined);
        attempt = await request(
          student,
          `/quizzes/${quiz.id}/attempts`,
          "POST",
          {},
        );
        assert(
          attempt.questionSnapshot.every(
            (q: any) =>
              q.answerKey === undefined && q.explanation === undefined,
          ),
        );
        const answers = Object.fromEntries(
          attempt.questionSnapshot.map((q: any) => [
            q.id,
            q.type === "MULTIPLE_SELECT"
              ? ["a", "b"]
              : q.type === "MATCHING"
                ? { a: "b", b: "a" }
                : q.type === "ORDERING"
                  ? ["a", "b"]
                  : q.type === "SHORT_ANSWER"
                    ? "http"
                    : q.type === "ESSAY"
                      ? "Explanation"
                      : q.type === "FILE_UPLOAD"
                        ? ""
                        : "a",
          ]),
        );
        const saved = await request(
          student,
          `/attempts/${attempt.id}/answers`,
          "PUT",
          { revision: 0, answers },
        );
        assert.equal(saved.revision, 1);
        await request(
          student,
          `/attempts/${attempt.id}/answers`,
          "PUT",
          { revision: 0, answers },
          409,
        );
        const submitted = await request(
          student,
          `/attempts/${attempt.id}/submit`,
          "POST",
          {},
        );
        assert.equal(submitted.status, "NEEDS_GRADING");
        assert.equal(submitted.score, undefined);
        await request(
          teacher,
          `/quizzes/${quiz.id}`,
          "PATCH",
          { title: "Changed", questions },
          409,
        );
        for (const q of quiz.questions.filter((q: any) =>
          ["ESSAY", "FILE_UPLOAD"].includes(q.type),
        ))
          await request(teacher, `/attempts/${attempt.id}/grades`, "POST", {
            questionId: q.id,
            score: q.type === "ESSAY" ? 20 : 0,
            feedback: "Feedback",
          });
        const stored = await db.quizAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
        });
        assert.equal(stored.status, "GRADED_COMPLETE");
        assert.equal(stored.score, 80);
        assert.equal(stored.objectiveScore, 60);
        const hidden = await request(student, `/quizzes/${quiz.id}`);
        assert.equal(hidden.attempts[0].score, undefined);
        await request(
          teacher,
          `/quizzes/${quiz.id}/publish-grades`,
          "POST",
          {},
        );
        const published = await request(student, `/quizzes/${quiz.id}`);
        assert.equal(published.attempts[0].score, 80);
        assert(!JSON.stringify(published).includes("answerKey"));
      },
    );
    await suite.test(
      "gradebook totals, publication, correction audit and append-only constraints",
      async () => {
        await request(
          teacher,
          `/course-classes/${cls.id}/grade-categories`,
          "PUT",
          { categories: categories.map((c) => ({ ...c, weightPercent: 1 })) },
          400,
        );
        const draft = await request(
          student,
          `/course-classes/${cls.id}/gradebook`,
        );
        assert.equal(draft.record, null);
        await request(
          teacher,
          `/course-classes/${cls.id}/gradebook/calculate`,
          "POST",
          {},
        );
        const stillHidden = await request(
          student,
          `/course-classes/${cls.id}/gradebook`,
        );
        assert.equal(stillHidden.record, null);
        await request(
          teacher,
          `/course-classes/${cls.id}/gradebook/publish`,
          "POST",
          {},
          409,
        );
        await request(
          teacher,
          `/course-classes/${cls.id}/gradebook/publish`,
          "POST",
          { acknowledgeMissing: true },
        );
        const published = await request(
          student,
          `/course-classes/${cls.id}/gradebook`,
        );
        assert.equal(published.record.finalScore, 32.2);
        assert.equal(published.record.isLocked, true);
        await request(student, `/quizzes/${quiz.id}/attempts`, "POST", {}, 423);
        await request(teacher, `/submissions/${submission.id}/grade`, "POST", {
          score: 90,
          reason: "Corrected report assessment",
        });
        const corrected = await request(
          student,
          `/course-classes/${cls.id}/gradebook`,
        );
        assert.equal(corrected.record.finalScore, 34.7);
        const audit = await request(teacher, `/course-classes/${cls.id}/audit`);
        const correction = audit.find(
          (a: any) => a.action === "CORRECT_FINAL_GRADE",
        );
        assert.equal(correction.beforeState.finalScore, 32.2);
        assert.equal(correction.afterState.finalScore, 34.7);
        assert.equal(correction.metadata.reason, "Corrected report assessment");
        await request(
          student,
          `/course-classes/${cls.id}/audit`,
          "GET",
          undefined,
          403,
        );
        await assert.rejects(
          db.auditLog.delete({ where: { id: correction.id } }),
          /append-only/,
        );
        await request(
          student,
          `/assignments/${assignment.id}/submissions`,
          "POST",
          { textContent: "after-lock" },
          423,
        );
      },
    );
    await suite.test(
      "bulk import previews, excludes and commits approved rows atomically",
      async () => {
        const body = {
          kind: "ENROLLMENT",
          rows: [
            {
              values: { studentStaffNumber: outsider.studentStaffNumber },
              exclude: false,
              override: false,
            },
            {
              values: { studentStaffNumber: student.studentStaffNumber },
              exclude: false,
              override: false,
            },
            {
              values: { studentStaffNumber: "missing" },
              exclude: false,
              override: false,
            },
          ],
        };
        const preview = await request(
          teacher,
          `/course-classes/${cls.id}/imports/preview`,
          "POST",
          body,
        );
        assert.equal(preview.ready, 1);
        assert.equal(preview.issues, 2);
        await request(
          teacher,
          `/course-classes/${cls.id}/imports/commit`,
          "POST",
          body,
          409,
        );
        assert.equal(
          await db.enrollment.count({
            where: { classId: cls.id, userId: outsider.id },
          }),
          0,
        );
        body.rows[1].exclude = true;
        body.rows[2].exclude = true;
        const committed = await request(
          teacher,
          `/course-classes/${cls.id}/imports/commit`,
          "POST",
          body,
        );
        assert.equal(committed.imported, 1);
        assert.equal(
          await db.enrollment.count({
            where: { classId: cls.id, userId: outsider.id },
          }),
          1,
        );
      },
    );
    await suite.test(
      "clean clone clears student history and archive blocks all mutations",
      async () => {
        const copy = await request(
          teacher,
          `/course-classes/${cls.id}/clone`,
          "POST",
          { name: "Next Semester", academicYear: "2027/2028" },
        );
        const cloned = await request(teacher, `/course-classes/${copy.id}`);
        assert.equal(cloned.status, "DRAFT");
        assert.equal(cloned.sections.length, 1);
        assert.equal(
          await db.enrollment.count({ where: { classId: copy.id } }),
          0,
        );
        assert.equal(
          await db.quizAttempt.count({
            where: { quiz: { section: { classId: copy.id } } },
          }),
          0,
        );
        assert.equal(
          await db.finalGradeRecord.count({ where: { classId: copy.id } }),
          0,
        );
        assert.equal(cloned.sections[0].quizzes[0].status, "DRAFT");
        await request(teacher, `/course-classes/${cls.id}`, "PATCH", {
          name: "Archived",
          academicYear: "2026/2027",
          status: "ARCHIVED",
        });
        await request(
          teacher,
          `/sections/${section.id}`,
          "PATCH",
          { title: "Changed" },
          423,
        );
        await request(
          teacher,
          `/submissions/${submission.id}/grade`,
          "POST",
          { score: 95, reason: "Archive must reject" },
          423,
        );
        await request(
          student,
          `/resources/${resource.id}/progress`,
          "POST",
          {},
          423,
        );
        const history = await request(student, `/course-classes/${cls.id}`);
        assert.equal(history.status, "ARCHIVED");
      },
    );
    await suite.test(
      "server expiry publishes scheduled results once and hidden assignments do not notify",
      async () => {
        const workerClass = await db.courseClass.create({
          data: {
            courseId: course.id,
            name: "Scheduled work",
            academicYear: "2026",
            status: "PUBLISHED",
            enrollments: { create: { userId: student.id } },
            instructors: { create: { userId: teacher.id } },
          },
        });
        const hidden = await db.section.create({
          data: { classId: workerClass.id, title: "Later", isVisible: false },
        });
        const scheduledAssignment = await db.assignment.create({
          data: {
            sectionId: hidden.id,
            title: "Release later",
            instructions: "Read",
            allowedFormats: ["TEXT"],
            isVisible: true,
            deadline: new Date(Date.now() + 3600000),
          },
        });
        const scheduledQuiz = await db.quiz.create({
          data: {
            sectionId: hidden.id,
            title: "Expiry quiz",
            status: "PUBLISHED",
            resultReleaseMode: "SCHEDULED",
            resultReleaseAt: new Date(Date.now() - 1000),
          },
        });
        const questionId = randomUUID();
        const expired = await db.quizAttempt.create({
          data: {
            quizId: scheduledQuiz.id,
            userId: student.id,
            attemptNum: 1,
            expiresAt: new Date(Date.now() - 1000),
            answersJson: { [questionId]: "true" },
            questionSnapshot: [
              {
                id: questionId,
                type: "TRUE_FALSE",
                text: "True?",
                points: 100,
                options: [
                  { id: "true", text: "True" },
                  { id: "false", text: "False" },
                ],
                answerKey: { correct: ["true"] },
                rubric: [],
                order: 0,
              },
            ],
          },
        });
        await runScheduledWork();
        const result = await db.quizAttempt.findUniqueOrThrow({
          where: { id: expired.id },
        });
        assert.equal(result.forced, true);
        assert.equal(result.status, "GRADED_COMPLETE");
        assert.equal(result.score, 100);
        assert(result.publishedAt);
        assert.equal(
          await db.notification.count({
            where: { eventKey: `assignment:${scheduledAssignment.id}` },
          }),
          0,
        );
        await db.section.update({
          where: { id: hidden.id },
          data: { isVisible: true },
        });
        const globalQuizData = {
          title: "Global clock",
          status: "PUBLISHED",
          timerMode: "GLOBAL",
          timeLimitMinutes: 1,
          passingScore: 75,
          questions: [
            {
              id: randomUUID(),
              type: "TRUE_FALSE",
              text: "True?",
              points: 100,
              options: [
                { id: "true", text: "True" },
                { id: "false", text: "False" },
              ],
              answerKey: { correct: ["true"] },
            },
          ],
        };
        await request(
          teacher,
          `/sections/${hidden.id}/quizzes`,
          "POST",
          globalQuizData,
          400,
        );
        const closes = new Date(Date.now() + 10 * 60000).toISOString();
        const globalQuiz = await request(
          teacher,
          `/sections/${hidden.id}/quizzes`,
          "POST",
          { ...globalQuizData, availableUntil: closes },
          201,
        );
        const globalAttempt = await request(
          student,
          `/quizzes/${globalQuiz.id}/attempts`,
          "POST",
          {},
        );
        assert.equal(globalAttempt.expiresAt, closes);
        assert.equal(globalQuiz.passingScore, 75);
        await runScheduledWork();
        await runScheduledWork();
        assert.equal(
          await db.notification.count({
            where: { eventKey: `assignment:${scheduledAssignment.id}` },
          }),
          1,
        );
        assert.equal(
          await db.notification.count({
            where: { eventKey: `quiz-grade:${expired.id}` },
          }),
          1,
        );
        assert.equal(
          await db.auditLog.count({
            where: { entityId: expired.id, action: "SCHEDULED_PUBLISH_GRADE" },
          }),
          1,
        );
      },
    );
    await suite.test(
      "disabled account and CSRF protection fail closed",
      async () => {
        await cache.set(`revoked:${student.externalSubjectId}`, "1", 900);
        await request(student, "/me", "GET", undefined, 403);
        const response = await fetch(base + "/courses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookies.get(admin.id)!,
          },
          body: "{}",
        });
        assert.equal(response.status, 403);
      },
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.$disconnect();
  }
});
