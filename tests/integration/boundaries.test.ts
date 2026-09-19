import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createApp } from "../../apps/api/src/index.js";
import { db } from "../../apps/api/src/core.js";

// Boundaries stated in Technical Design v4.0 section 8.1 and the blocker
// feedback required by section 8.2 CE-06.
test("quiz scheduling boundaries follow the technical design", async (suite) => {
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const suffix = randomUUID().slice(0, 8);
  const cookies = new Map<string, string>();

  const makeUser = (role: any) => {
    const id = randomUUID();
    return db.user.create({
      data: {
        id,
        ssoUserId: id,
        identifierValue: `${suffix}-${role}`,
        name: `Boundary ${role}`,
        email: `${id}@example.test`,
        role,
      },
    });
  };

  async function request(user: any, path: string, method = "GET", body?: any) {
    if (!cookies.has(user.id)) {
      const login = await fetch(`${base}/auth/development-login`, {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
          "Idempotency-Key": randomUUID(),
        },
        body: JSON.stringify({ userId: user.id }),
      });
      cookies.set(user.id, login.headers.get("set-cookie")!.split(";")[0]);
    }
    await new Promise((r) => setTimeout(r, 45));
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
        Cookie: cookies.get(user.id)!,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  }

  const question = () => ({
    text: "Soal batas",
    type: "SINGLE_CHOICE" as const,
    options: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
    ],
    points: 100,
    answerKey: { correct: ["a"] },
    rubric: [],
    maxWords: 1000,
    explanation: "",
  });

  const admin = await makeUser("SUPER_ADMIN");
  const teacher = await makeUser("INSTRUCTOR");
  const student = await makeUser("STUDENT");

  const course = (
    await request(admin, "/courses", "POST", {
      code: `BD${suffix}`,
      title: "Boundary Course",
      departmentCode: "IF",
      credits: 3,
      status: "PUBLISHED",
    })
  ).body;
  const cls = (
    await request(admin, "/course-classes", "POST", {
      courseId: course.id,
      name: "Boundary A",
      academicYear: "2026/2027",
      instructorIds: [teacher.id],
      status: "PUBLISHED",
    })
  ).body;
  await request(teacher, `/course-classes/${cls.id}/participants`, "POST", {
    userId: student.id,
    isActive: true,
  });
  const section = (
    await request(teacher, `/course-classes/${cls.id}/sections`, "POST", {
      title: "Boundary Section",
      type: "LECTURE",
      order: 0,
      isVisible: true,
    })
  ).body;

  const makeQuiz = (minutes: number) =>
    request(teacher, `/sections/${section.id}/quizzes`, "POST", {
      title: `Durasi ${minutes}`,
      status: "DRAFT",
      attemptLimit: 1,
      timeLimitMinutes: minutes,
      questions: [question()],
    });

  await suite.test("timer accepts 1 to 300 minutes and rejects outside", async () => {
    assert.equal((await makeQuiz(0)).status, 400, "0 minutes must be rejected");
    assert.equal((await makeQuiz(1)).status, 201, "1 minute must be accepted");
    assert.equal((await makeQuiz(300)).status, 201, "300 minutes must be accepted");
    assert.equal((await makeQuiz(301)).status, 400, "301 minutes must be rejected");
  });

  await suite.test("quiz before its opening time reports when it opens", async () => {
    const opensAt = new Date(Date.now() + 86400_000);
    const quiz = (
      await request(teacher, `/sections/${section.id}/quizzes`, "POST", {
        title: "Belum dibuka",
        status: "PUBLISHED",
        isVisible: true,
        availableFrom: opensAt.toISOString(),
        attemptLimit: 1,
        questions: [question()],
      })
    ).body;
    const blocked = await request(
      student,
      `/quizzes/${quiz.id}/attempts`,
      "POST",
      {},
    );
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, "NOT_OPEN_YET");
    // The interface states the date, so the moment has to travel with the error.
    assert.equal(
      new Date(blocked.body.error.details.at).toISOString(),
      opensAt.toISOString(),
    );
  });

  await new Promise<void>((resolve) => server.close(() => resolve()));
});
