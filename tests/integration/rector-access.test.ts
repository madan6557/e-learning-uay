import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

test("one E-Learning session authorizes aggregate-only rector reports", async (suite) => {
  assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const { UniversityReportingDataSource } =
    await import("../../apps/api/src/rector/source.js");
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const ids: string[] = [];
  let courseId: string | undefined;
  const cookies = new Map<string, string>();
  const req = async (
    path: string,
    role?: string,
    method = "GET",
    status = 200,
  ) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://127.0.0.1:5173",
        ...(role ? { Cookie: cookies.get(role)! } : {}),
      },
    });
    assert.equal(res.status, status, await res.clone().text());
    return res;
  };
  try {
    for (const role of [
      "RECTOR",
      "INSTRUCTOR",
      "STUDENT",
      "SUPER_ADMIN",
    ] as const) {
      const id = randomUUID();
      ids.push(id);
      await db.user.create({
        data: {
          id,
          ssoUserId: id,
          name: `Private-${role}-${id}`,
          email: `${id}@example.test`,
          identifierValue: id,
          role,
          userType: role === "INSTRUCTOR" ? "LECTURER" : "STAFF",
          departmentScopes: ["RECTEST"],
        },
      });
      const res = await fetch(base + "/api/v1/auth/development-login", {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: id }),
      });
      assert.equal(res.status, 200, await res.clone().text());
      cookies.set(role, res.headers.get("set-cookie")!.split(";")[0]);
    }
    await suite.test(
      "same cookie works; no separate demo login or academic write",
      async () => {
        await req("/api/rector/v1/summary", undefined, "GET", 401);
        await req("/api/rector/v1/summary", "STUDENT", "GET", 403);
        await req("/api/rector/v1/summary", "INSTRUCTOR", "GET", 403);
        await req("/api/rector/v1/summary", "SUPER_ADMIN");
        const session = await (
          await req("/api/rector/v1/auth/session", "RECTOR")
        ).json();
        assert.equal(session.role, "RECTOR");
        assert.equal(session.demo, false);
        await req("/api/rector/v1/auth/demo", "RECTOR", "POST", 405);
        await req("/api/rector/v1/lecturers", "RECTOR", "POST", 405);
        await req("/api/v1/course-classes", "RECTOR", "GET", 403);
        await req("/api/v1/course-classes", "RECTOR", "POST", 403);
        assert.equal(
          (await (await req("/api/v1/me", "RECTOR")).json()).role,
          "RECTOR",
        );
      },
    );
    const course = await db.course.create({
      data: {
        code: randomUUID(),
        title: "Rector verification",
        departmentCode: "RECTEST",
      },
    });
    courseId = course.id;
    const cls = await db.courseClass.create({
      data: {
        courseId,
        name: "Shared",
        academicYear: "2026/2027 Ganjil",
        status: "PUBLISHED",
        instructors: { create: { userId: ids[1] } },
      },
    });
    const sec = await db.section.create({
      data: { classId: cls.id, title: "Pertemuan" },
    });
    const assignment = await db.assignment.create({
      data: {
        sectionId: sec.id,
        title: "Tugas laporan",
        allowedFormats: [],
        instructions: "private",
      },
    });
    await db.assignmentSubmission.createMany({
      data: [
        {
          assignmentId: assignment.id,
          userId: ids[2],
          version: 1,
          status: "SUPERSEDED",
          score: 91,
          feedback: "SECRET_FEEDBACK",
          textContent: "SECRET_ANSWER",
          submittedAt: new Date("2026-09-01T01:00:00Z"),
        },
        {
          assignmentId: assignment.id,
          userId: ids[2],
          version: 2,
          status: "SUBMITTED",
          textContent: "SECRET_REPLACEMENT",
          submittedAt: new Date("2026-09-20T01:00:00Z"),
        },
      ],
    });
    await suite.test(
      "latest submissions, true publication and no student payload",
      async () => {
        let snapshot = await new UniversityReportingDataSource().readSnapshot();
        let work = snapshot.classes
          .find((c) => c.id === cls.id)!
          .grading.find((w) => w.id === assignment.id)!;
        assert.equal(work.total, 1);
        assert.equal(work.graded, 0);
        assert.equal(work.pendingSince, "2026-09-20T01:00:00.000Z");
        await db.assignmentSubmission.updateMany({
          where: { assignmentId: assignment.id, version: 2 },
          data: {
            status: "GRADED",
            score: 88,
            gradedAt: new Date("2026-09-25T01:00:00Z"),
            isPublished: false,
          },
        });
        snapshot = await new UniversityReportingDataSource().readSnapshot();
        work = snapshot.classes
          .find((c) => c.id === cls.id)!
          .grading.find((w) => w.id === assignment.id)!;
        assert.equal(work.graded, 1);
        assert.equal(work.published, 0);
        assert.equal(work.lastGradedAt, "2026-09-25T01:00:00.000Z");
        assert.equal(work.lastPublishedAt, null);
        const text = JSON.stringify(snapshot);
        for (const privateData of [
          ids[2],
          "SECRET_FEEDBACK",
          "SECRET_ANSWER",
          "SECRET_REPLACEMENT",
          '"score"',
          '"answersJson"',
          '"feedback"',
        ])
          assert.ok(!text.includes(privateData), privateData);
        const report = await (
          await req(`/api/rector/v1/summary?classId=${cls.id}`, "RECTOR")
        ).json();
        assert.equal(report.meta.demo, false);
        assert.equal(report.data.grading.pending, 0);
        assert.equal(report.data.grading.published, 0);
        const csv = await (
          await req(`/api/rector/v1/exports/csv?classId=${cls.id}`, "RECTOR")
        ).text();
        assert.ok(!csv.includes("Demo - data simulasi"));
        const pdf = await req(
          `/api/rector/v1/exports/pdf?classId=${cls.id}`,
          "RECTOR",
        );
        assert.equal(pdf.headers.get("content-type"), "application/pdf");
        assert.equal(
          Buffer.from(await pdf.arrayBuffer())
            .subarray(0, 4)
            .toString(),
          "%PDF",
        );
      },
    );
    await suite.test(
      "deactivation and logout revoke report access",
      async () => {
        await db.user.update({
          where: { id: ids[0] },
          data: { status: "DISABLED" },
        });
        await req("/api/rector/v1/summary", "RECTOR", "GET", 403);
        await db.user.update({
          where: { id: ids[0] },
          data: { status: "ACTIVE" },
        });
        await req("/api/v1/auth/logout", "RECTOR", "POST");
        await req("/api/rector/v1/summary", "RECTOR", "GET", 401);
      },
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    if (courseId) await db.course.delete({ where: { id: courseId } });
    await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
});
