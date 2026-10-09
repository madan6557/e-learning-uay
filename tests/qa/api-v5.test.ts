import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import http from "node:http";

test(
  "QA v5 HTTP assertions on isolated PostgreSQL",
  { timeout: 120000 },
  async (suite) => {
    assert.ok(
      new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"),
      "Refuse non-test database",
    );
    const fileServer = http
      .createServer((req, res) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const id = randomUUID();
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              fileObjectId: id,
              uploadUrl: `http://127.0.0.1:${(fileServer.address() as any).port}/upload/${id}`,
              expiresAt: new Date(Date.now() + 900000).toISOString(),
            }),
          );
        });
      })
      .listen(0, "127.0.0.1");
    await once(fileServer, "listening");
    process.env.FILE_SERVICE_URL = `http://127.0.0.1:${(fileServer.address() as any).port}`;
    process.env.FILE_ALLOWED_ORIGINS = process.env.FILE_SERVICE_URL;
    process.env.FILE_SERVICE_KEY = "qa-fixture-key";
    const { createApp } = await import("../../apps/api/src/index.js");
    const { db, redis } = await import("../../apps/api/src/core.js");
    const server = createApp().listen(0, "127.0.0.1");
    await once(server, "listening");
    suite.after(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await new Promise<void>((resolve) => fileServer.close(() => resolve()));
      await db.$disconnect();
      if (redis) await redis.quit();
    });
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
    const suffix = randomUUID().slice(0, 8);
    const cookies = new Map<string, string>();
    const user = async (role: any, departmentScopes: string[] = []) => {
      const id = randomUUID();
      return db.user.create({
        data: {
          id,
          ssoUserId: id,
          name: `QA ${role}`,
          email: `${id}@example.test`,
          identifierValue: `${id}`,
          role,
          departmentScopes,
        },
      });
    };
    const admin = await user("SUPER_ADMIN"),
      teacher = await user("INSTRUCTOR"),
      otherTeacher = await user("INSTRUCTOR"),
      student = await user("STUDENT"),
      outside = await user("STUDENT"),
      department = await user("DEPARTMENT_ADMIN", ["OTHER"]);
    for (const account of [
      admin,
      teacher,
      otherTeacher,
      student,
      outside,
      department,
    ]) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const response = await fetch(base + "/auth/development-login", {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: account.id }),
      });
      assert.equal(response.status, 200);
      cookies.set(
        account.id,
        response.headers.get("set-cookie")!.split(";")[0],
      );
    }
    async function request(
      account: any,
      path: string,
      method = "GET",
      body?: any,
      expected = 200,
    ) {
      // Stay below the existing 30 requests/second limit, including setup requests.
      await new Promise((resolve) => setTimeout(resolve, 45));
      const response = await fetch(base + path, {
        method,
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
          Cookie: account ? (cookies.get(account.id) ?? "") : "",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data: any = await response.json();
      assert.equal(
        response.status,
        expected,
        `${method} ${path}: actual ${response.status}, expected ${expected}; ${JSON.stringify(data)}`,
      );
      return data;
    }
    const course = await db.course.create({
      data: {
        code: `QA-${suffix}`,
        title: "QA v5",
        departmentCode: "IF",
        status: "PUBLISHED",
      },
    });
    const cls = await db.courseClass.create({
      data: {
        courseId: course.id,
        name: "QA A",
        academicYear: "2026/2027",
        status: "PUBLISHED",
        instructors: { create: { userId: teacher.id } },
        enrollments: { create: { userId: student.id } },
      },
    });
    const section = await db.section.create({
      data: { classId: cls.id, title: "QA Section", isVisible: true },
    });
    const question = {
      type: "SINGLE_CHOICE",
      text: "QA question",
      points: 100,
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      answerKey: { correct: ["a"] },
    };
    const quizBody = (overrides: any = {}) => ({
      title: "QA Quiz",
      status: "DRAFT",
      questions: [question],
      ...overrides,
    });
    const newAssignment = (overrides: any = {}) =>
      db.assignment.create({
        data: {
          sectionId: section.id,
          title: "QA Assignment",
          instructions: "QA test",
          allowedFormats: ["TEXT"],
          maxScore: 100,
          isVisible: true,
          ...overrides,
        },
      });
    const newPdf = () =>
      db.resourceItem.create({
        data: {
          sectionId: section.id,
          title: "PDF fixture",
          resourceType: "DOCUMENT",
          isVisible: true,
          dynamicPayload: { totalPages: 10 },
        },
      });
    try {
      await suite.test("[TC-ACC-ANON] unauthenticated API denied", () =>
        request(null, "/me", "GET", undefined, 401),
      );
      await suite.test("[TC-ACC-OUTSIDER] outsider cannot read class", () =>
        request(outside, `/course-classes/${cls.id}`, "GET", undefined, 403),
      );
      await suite.test(
        "[TC-ACC-STUDENT-ROSTER] student cannot read roster",
        () =>
          request(
            student,
            `/course-classes/${cls.id}/participants`,
            "GET",
            undefined,
            403,
          ),
      );
      await suite.test(
        "[TC-ACC-TEACHER-SCOPE] unrelated instructor cannot mutate",
        () =>
          request(
            otherTeacher,
            `/course-classes/${cls.id}/sections`,
            "POST",
            { title: "Denied" },
            403,
          ),
      );
      await suite.test("[TC-ACC-DEPT-SCOPE] unrelated department denied", () =>
        request(department, `/course-classes/${cls.id}`, "GET", undefined, 403),
      );
      await suite.test(
        "[TC-CRS-CREATE] course and class creation",
        async () => {
          const c = await request(
            admin,
            "/courses",
            "POST",
            {
              code: `QA-CREATE-${suffix}`,
              title: "QA Created",
              departmentCode: "IF",
              status: "PUBLISHED",
            },
            201,
          );
          const v = await request(
            admin,
            "/course-classes",
            "POST",
            {
              courseId: c.id,
              name: "QA Created A",
              academicYear: "2026/2027",
              instructorIds: [teacher.id],
              status: "PUBLISHED",
            },
            201,
          );
          const created = await db.courseClass.findFirstOrThrow({
            where: { courseId: c.id, name: "QA Created A" },
          });
          assert.equal(created.courseId, c.id);
          const saved = await db.classInstructor.findFirst({
            where: { classId: created.id, userId: teacher.id },
          });
          assert.ok(saved);
        },
      );
      await suite.test(
        "[TC-CRS-DRAFT] enrolled student cannot read draft class",
        async () => {
          const c = await db.courseClass.create({
            data: {
              courseId: course.id,
              name: "QA Draft",
              academicYear: "2026/2027",
              status: "DRAFT",
              enrollments: { create: { userId: student.id } },
            },
          });
          await request(
            student,
            `/course-classes/${c.id}`,
            "GET",
            undefined,
            403,
          );
        },
      );
      const archived = await db.courseClass.create({
        data: {
          courseId: course.id,
          name: "QA Archive",
          academicYear: "2026/2027",
          status: "ARCHIVED",
          instructors: { create: { userId: teacher.id } },
          enrollments: { create: { userId: student.id } },
        },
      });
      await suite.test(
        "[TC-CRS-ARCHIVE-WRITE] archived class rejects writes",
        () =>
          request(
            teacher,
            `/course-classes/${archived.id}/sections`,
            "POST",
            { title: "Denied" },
            423,
          ),
      );
      await suite.test(
        "[TC-CRS-ARCHIVE-READ] archived class remains readable",
        async () => {
          const v = await request(student, `/course-classes/${archived.id}`);
          assert.equal(v.id, archived.id);
        },
      );
      for (const type of [
        "LECTURE",
        "LAB_PRACTICUM",
        "SEMINAR",
        "WORKSHOP",
        "EXAM",
      ])
        await suite.test(
          `[TC-SEC-${type}] section type round trip`,
          async () => {
            const s = await request(
              teacher,
              `/course-classes/${cls.id}/sections`,
              "POST",
              { title: `QA ${type}`, type, isVisible: true },
              201,
            );
            assert.equal(s.type, type);
            const v = await db.section.findUniqueOrThrow({
              where: { id: s.id },
            });
            assert.equal(v.type, type);
          },
        );
      for (const minutes of [0, 1, 15, 120, 300, 301, 1.5])
        await suite.test(
          `[TC-BVA-TIMER-${String(minutes).replace(".", "_")}] timer boundary`,
          () =>
            request(
              teacher,
              `/sections/${section.id}/quizzes`,
              "POST",
              quizBody({ timeLimitMinutes: minutes }),
              Number.isInteger(minutes) && minutes >= 1 && minutes <= 300
                ? 201
                : 400,
            ),
        );
      for (const limit of [0, 1, 3, null])
        await suite.test(
          `[TC-BVA-ATTEMPT-${limit ?? "NULL"}] attempt limit as specified by v5`,
          () =>
            request(
              teacher,
              `/sections/${section.id}/quizzes`,
              "POST",
              quizBody({ attemptLimit: limit }),
              limit === 0 ? 400 : 201,
            ),
        );
      for (const score of [-0.01, 0, 99.99, 100, 100.01])
        await suite.test(
          `[TC-BVA-SCORE-${String(score).replace(".", "_")}] assignment grading boundary`,
          async () => {
            const a = await newAssignment();
            const sub = await request(
              student,
              `/assignments/${a.id}/submissions`,
              "POST",
              { textContent: "QA" },
              201,
            );
            const result = await request(
              teacher,
              `/submissions/${sub.id}/grade`,
              "POST",
              { score, feedback: "QA" },
              score >= 0 && score <= 100 ? 200 : 400,
            );
            const saved = await db.assignmentSubmission.findUniqueOrThrow({
              where: { id: sub.id },
            });
            assert.equal(
              saved.score,
              score >= 0 && score <= 100 ? score : null,
            );
          },
        );
      for (const page of [0, 1, 10, 11, 1.5])
        await suite.test(
          `[TC-BVA-PAGE-${String(page).replace(".", "_")}] PDF page boundary`,
          async () => {
            const pdf = await newPdf();
            const valid = Number.isInteger(page) && page >= 1 && page <= 10;
            const v = await request(
              student,
              `/resources/${pdf.id}/progress`,
              "POST",
              { page },
              valid ? 200 : 400,
            );
            if (valid) assert.deepEqual(v.viewedPages, [page]);
          },
        );
      for (const count of [0, 1, 500, 501])
        await suite.test(
          `[TC-BVA-IMPORT-${count}] import batch boundary`,
          async () => {
            const rows = Array.from({ length: count }, (_, i) => ({
              values: { identifierValue: `missing-${i}-${suffix}` },
            }));
            const v = await request(
              teacher,
              `/course-classes/${cls.id}/imports/preview`,
              "POST",
              { kind: "ENROLLMENT", rows },
              count >= 1 && count <= 500 ? 200 : 400,
            );
            if (count >= 1 && count <= 500) assert.equal(v.rows.length, count);
          },
        );
      for (const [label, size, valid] of [
        ["0BYTE", 0, false],
        ["1BYTE", 1, true],
        ["20MB", 20 * 1024 * 1024, true],
        ["50MB", 50 * 1024 * 1024, true],
        ["50MB_PLUS", 50 * 1024 * 1024 + 1, false],
      ] as const)
        await suite.test(
          `[TC-BVA-FILE-${label}] upload ticket metadata boundary`,
          async () => {
            const v = await request(
              teacher,
              "/files/upload-ticket",
              "POST",
              {
                classId: cls.id,
                purpose: "RESOURCE",
                name: "qa.pdf",
                mimeType: "application/pdf",
                sizeBytes: size,
                checksum: "a".repeat(64),
              },
              valid ? 200 : 400,
            );
            if (valid) assert.ok(v.fileObjectId);
          },
        );
      const day = 86400000;
      for (const [id, overrides, status, late] of [
        [
          "TC-BVA-ASG-BEFORE",
          { availableFrom: new Date(Date.now() + day) },
          403,
          null,
        ],
        [
          "TC-BVA-ASG-ONTIME",
          {
            deadline: new Date(Date.now() + day),
            cutoffDate: new Date(Date.now() + 2 * day),
          },
          201,
          false,
        ],
        [
          "TC-BVA-ASG-LATE",
          {
            deadline: new Date(Date.now() - day),
            cutoffDate: new Date(Date.now() + day),
            allowLate: true,
          },
          201,
          true,
        ],
        [
          "TC-BVA-ASG-CUTOFF",
          {
            deadline: new Date(Date.now() - day),
            cutoffDate: new Date(Date.now() - 3600000),
          },
          403,
          null,
        ],
        [
          "TC-BVA-ASG-LATE-DENIED",
          {
            deadline: new Date(Date.now() - day),
            cutoffDate: new Date(Date.now() + day),
            allowLate: false,
          },
          403,
          null,
        ],
      ] as const)
        await suite.test(`[${id}] assignment time window`, async () => {
          const a = await newAssignment(overrides);
          const v = await request(
            student,
            `/assignments/${a.id}/submissions`,
            "POST",
            { textContent: "QA" },
            status,
          );
          if (late !== null)
            assert.equal(v.status, late ? "LATE" : "SUBMITTED");
          else
            assert.equal(
              await db.assignmentSubmission.count({
                where: { assignmentId: a.id },
              }),
              0,
            );
        });
      await suite.test(
        "[TC-BVA-REASON] existing score correction requires reason",
        async () => {
          const a = await newAssignment();
          const sub = await request(
            student,
            `/assignments/${a.id}/submissions`,
            "POST",
            { textContent: "QA" },
            201,
          );
          await request(teacher, `/submissions/${sub.id}/grade`, "POST", {
            score: 70,
          });
          await request(
            teacher,
            `/submissions/${sub.id}/grade`,
            "POST",
            { score: 85 },
            400,
          );
          assert.equal(
            (
              await db.assignmentSubmission.findUniqueOrThrow({
                where: { id: sub.id },
              })
            ).score,
            70,
          );
        },
      );
      await suite.test(
        "[TC-PRG-PDF-UNIQUE] repeated page only counted once",
        async () => {
          const pdf = await newPdf();
          await request(student, `/resources/${pdf.id}/progress`, "POST", {
            page: 5,
          });
          const v = await request(
            student,
            `/resources/${pdf.id}/progress`,
            "POST",
            { page: 5 },
          );
          assert.deepEqual(v.viewedPages, [5]);
          assert.equal(v.percent, 10);
        },
      );
      await suite.test(
        "[TC-PRG-CONCURRENT] concurrent page updates preserve union",
        async () => {
          const pdf = await newPdf();
          await Promise.all([
            request(student, `/resources/${pdf.id}/progress`, "POST", {
              page: 2,
            }),
            request(student, `/resources/${pdf.id}/progress`, "POST", {
              page: 3,
            }),
          ]);
          const v = await db.slideProgress.findFirstOrThrow({
            where: { resourceItemId: pdf.id, userId: student.id },
          });
          assert.deepEqual(v.viewedPages, [2, 3]);
          assert.equal(v.percent, 20);
        },
      );
      await suite.test(
        "[TC-PRG-HIDDEN] hidden resource rejects forged progress",
        async () => {
          const pdf = await newPdf();
          await db.resourceItem.update({
            where: { id: pdf.id },
            data: { isVisible: false },
          });
          await request(
            student,
            `/resources/${pdf.id}/progress`,
            "POST",
            { page: 1 },
            403,
          );
        },
      );
      await suite.test(
        "[TC-RES-XSS] stored resource strips scripts and events",
        async () => {
          const v = await request(
            teacher,
            `/sections/${section.id}/resources`,
            "POST",
            {
              title: "QA XSS",
              resourceType: "RICH_TEXT",
              isVisible: true,
              dynamicPayload: {
                blocks: [
                  {
                    id: "qa",
                    type: "paragraph",
                    data: {
                      text: '<script>alert(1)</script><p onclick="alert(2)">Aman</p>',
                    },
                  },
                ],
              },
            },
            201,
          );
          const saved = await db.resourceItem.findUniqueOrThrow({
            where: { id: v.id },
          });
          const raw = JSON.stringify(saved.dynamicPayload);
          assert.ok(!raw.includes("<script"));
          assert.ok(!raw.includes("onclick"));
          assert.ok(raw.includes("Aman"));
        },
      );
      await suite.test(
        "[TC-RES-VIDEO-EMBED] v5 accepts external video URL without binary",
        () =>
          request(
            teacher,
            `/sections/${section.id}/resources`,
            "POST",
            {
              title: "QA external video",
              resourceType: "VIDEO_MEDIA",
              isVisible: true,
              dynamicPayload: {
                provider: "YOUTUBE",
                url: "https://www.youtube.com/embed/M7lc1UVf-VE",
                durationSeconds: 100,
              },
            },
            201,
          ),
      );
      const quiz = await request(
        teacher,
        `/sections/${section.id}/quizzes`,
        "POST",
        quizBody({
          status: "PUBLISHED",
          timerMode: "GLOBAL",
          availableUntil: new Date(Date.now() + 60000).toISOString(),
          timeLimitMinutes: 300,
        }),
        201,
      );
      let attempt: any;
      await suite.test(
        "[TC-BVA-QZ-CUTOFF] server deadline caps expiresAt",
        async () => {
          attempt = await request(
            student,
            `/quizzes/${quiz.id}/attempts`,
            "POST",
            {},
          );
          assert.ok(
            +new Date(attempt.expiresAt) <= +new Date(quiz.availableUntil),
          );
        },
      );
      await suite.test("[TC-BVA-QZ-NPLUS1] active attempt reused", async () => {
        assert.ok(attempt, "Prerequisite attempt missing");
        const v = await request(
          student,
          `/quizzes/${quiz.id}/attempts`,
          "POST",
          {},
        );
        assert.equal(v.id, attempt.id);
        assert.equal(
          await db.quizAttempt.count({ where: { quizId: quiz.id } }),
          1,
        );
      });
      await suite.test(
        "[TC-BVA-QZ-LIMIT] submitted limit rejects next attempt",
        async () => {
          assert.ok(attempt, "Prerequisite attempt missing");
          await request(student, `/attempts/${attempt.id}/submit`, "POST", {});
          await request(
            student,
            `/quizzes/${quiz.id}/attempts`,
            "POST",
            {},
            403,
          );
        },
      );
      await suite.test(
        "[TC-CRS-COURSE-ARCHIVE] parent course archive locks child and audits",
        async () => {
          await request(admin, `/courses/${course.id}`, "PATCH", {
            code: course.code,
            title: course.title,
            departmentCode: "IF",
            status: "ARCHIVED",
          });
          await request(
            teacher,
            `/course-classes/${cls.id}/sections`,
            "POST",
            { title: "Denied" },
            423,
          );
          const audit = await db.auditLog.findFirst({
            where: { entityId: course.id },
            orderBy: { createdAt: "desc" },
          });
          assert.ok(audit);
          assert.equal((audit.afterState as any).status, "ARCHIVED");
        },
      );
    } finally {
      /* suite.after also cleans up when a setup assertion fails. */
    }
  },
);
