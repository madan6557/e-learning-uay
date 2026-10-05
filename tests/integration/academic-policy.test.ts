import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { UPLOAD_LIMITS } from "../../packages/shared/src/files.js";

test("global academic policy, attendance privacy, file ACL and adapter failures use production endpoints", async suite => {
  for (const key of ["FILE_SERVICE_URL", "FILE_SERVICE_API_URL", "UAY_FILE_SERVICE_URL",
    "FILE_SERVICE_KEY", "FILE_SERVICE_API_KEY", "UAY_FILE_SERVICE_API_KEY", "FILE_SERVICE_TYPE"]) {
    process.env[key] = "";
  }
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db, getAcademicSettings } = await import("../../apps/api/src/core.js");
  const { checkFileService } = await import("../../apps/api/src/files.js");
  let server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  let base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const original = await getAcademicSettings();
  const users = await Promise.all(["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT", "STUDENT"]
    .map((role: any) => { const id = randomUUID(); return db.user.create({ data: {
      id, role, ssoUserId: id, identifierValue: id, email: `${id}@example.test`,
      name: `Policy ${role}`, departmentScopes: role === "DEPARTMENT_ADMIN" ? ["IF"] : [],
    } }); }));
  const [admin, department, teacher, student, outsider] = users;
  const cookies = new Map<string, string>();
  for (const user of users) {
    await new Promise(r => setTimeout(r, 230));
    const response = await fetch(base + "/auth/development-login", { method: "POST", headers: {
      Origin: "http://127.0.0.1:5173", "Content-Type": "application/json",
    }, body: JSON.stringify({ userId: user.id }) });
    assert.equal(response.status, 200);
    cookies.set(user.id, response.headers.get("set-cookie")!.split(";")[0]);
  }
  const request = async (user: any, path: string, method = "GET", body?: any, expected = 200, key = randomUUID()) => {
    await new Promise(r => setTimeout(r, 45));
    const response = await fetch(base + path, { method, headers: {
      Origin: "http://127.0.0.1:5173", "Content-Type": "application/json",
      Cookie: cookies.get(user.id)!, "Idempotency-Key": key,
    }, body: body === undefined ? undefined : JSON.stringify(body) });
    const result = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(result)}`);
    return result;
  };
  const course = await db.course.create({ data: {
    code: randomUUID(), title: "Policy fixture", departmentCode: "IF", status: "PUBLISHED",
  } });
  const cls = await db.courseClass.create({ data: {
    courseId: course.id, name: "Policy class", academicYear: original.academicYear, status: "PUBLISHED",
    instructors: { create: { userId: teacher.id } }, enrollments: { create: { userId: student.id } },
  } });
  const section = await db.section.create({ data: { classId: cls.id, title: "Policy resources" } });
  let upstreamState = "healthy";
  const service = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (upstreamState === "timeout") return;
    if (upstreamState === "failure") { res.writeHead(500).end('{"error":"offline"}'); return; }
    if (upstreamState === "invalid") { res.end('{"success":true,"data":{}}'); return; }
    if (req.url?.endsWith("/health")) { res.end('{"success":true,"data":{"status":"ok"}}'); return; }
    if (req.url?.endsWith("/repositories")) { res.end('{"data":[{"id":"repo","name":"Test repository"}]}'); return; }
    res.end(JSON.stringify({ data: { fileId: "remote", originalName: "module.pdf",
      sizeBytes: 12, mimeType: "application/pdf", status: "active", checksum: "a".repeat(64) } }));
  }).listen(0, "127.0.0.1");
  await once(service, "listening");
  try {
    await suite.test("only Super Admin writes, updates are audited and idempotent, and persistence survives a new app/client", async () => {
      const before = await request(department, "/system/settings");
      const update = { academicYear: "2027/2028 Genap", semesterLabel: "SEMESTER GENAP 2027/2028",
        academicYears: [...before.academicYears, "2027/2028 Genap"], defaultGradeScaleVersion: "2024.1",
        minAttendancePercentage: 80 };
      await request(department, "/system/settings", "PUT", update, 403);
      await request(teacher, "/system/settings", "PUT", update, 403);
      const key = randomUUID();
      const after = await request(admin, "/system/settings", "PUT", update, 200, key);
      assert.deepEqual(await request(admin, "/system/settings", "PUT", update, 200, key), after);
      const logs = await db.auditLog.findMany({ where: { actorId: admin.id, entityId: "academic-settings" } });
      assert.equal(logs.length, 1);
      assert.equal((logs[0].beforeState as any).minAttendancePercentage, before.minAttendancePercentage);
      assert.equal((logs[0].afterState as any).minAttendancePercentage, 80);
      assert.equal(logs[0].classId, null);
      await request(admin, "/system/settings", "PUT", { ...update, minAttendancePercentage: 50 }, 409, key);
      await request(admin, "/system/settings", "PUT", { ...update, defaultGradeScaleVersion: "invalid" }, 400);
      const freshClient = new PrismaClient();
      try { assert.equal((await freshClient.academicSettings.findUniqueOrThrow({ where: { id: "global" } })).minAttendancePercentage, 80); }
      finally { await freshClient.$disconnect(); }
      await new Promise<void>(resolve => server.close(() => resolve()));
      server = createApp().listen(0, "127.0.0.1"); await once(server, "listening");
      base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
      assert.equal((await request(department, "/system/settings")).minAttendancePercentage, 80);
      const publicConfig = await (await fetch(base + "/auth/config")).json();
      assert.equal(publicConfig.defaultGradeScaleVersion, "2024.1");
    });
    await suite.test("new and duplicated classes use the current default without changing published grades", async () => {
      const published = await db.finalGradeRecord.create({ data: {
        classId: cls.id, userId: student.id, categoryScoresJson: {}, finalScore: 80,
        gradeLetter: "A-", gradePoint: 3.75, gradeScaleVersion: "2026.1", publishedAt: new Date(), isLocked: true,
      } });
      const created = await request(admin, "/course-classes", "POST", {
        courseId: course.id, name: "New policy class", academicYear: "2027/2028 Genap", instructorIds: [teacher.id],
      }, 201);
      assert.equal((await db.courseClass.findUniqueOrThrow({ where: { id: created.id } })).gradeScaleVersion, "2024.1");
      const copied = await request(teacher, `/course-classes/${cls.id}/clone`, "POST", {
        name: "Cloned policy class", academicYear: "2027/2028 Genap",
      });
      assert.equal((await db.courseClass.findUniqueOrThrow({ where: { id: copied.id } })).gradeScaleVersion, "2024.1");
      assert.deepEqual(await db.finalGradeRecord.findUnique({ where: { id: published.id } }), published);
      assert.equal((await db.courseClass.findUniqueOrThrow({ where: { id: cls.id } })).gradeScaleVersion, "2026.1");
    });
    await suite.test("students get requiresCode without its value and recap follows changed thresholds", async () => {
      const session = await request(teacher, `/course-classes/${cls.id}/attendance`, "POST", {
        title: "Coded session", isOpen: true, requireCode: true,
      }, 201);
      assert.match(session.checkInCode, /^[A-Z0-9]{6}$/);
      const studentSessions = await request(student, `/course-classes/${cls.id}/attendance`);
      assert.equal(studentSessions[0].requiresCode, true);
      assert.equal(Object.hasOwn(studentSessions[0], "checkInCode"), false);
      const managerSessions = await request(teacher, `/course-classes/${cls.id}/attendance`);
      assert.equal(managerSessions[0].checkInCode, session.checkInCode);
      await request(student, `/attendance/${session.id}/check-in`, "POST", {}, 400);
      await request(student, `/attendance/${session.id}/check-in`, "POST", { code: session.checkInCode.toLowerCase() });
      for (let i = 0; i < 3; i++) {
        const next = await db.attendanceSession.create({ data: { classId: cls.id, title: `Recap ${i}` } });
        if (i < 2) await db.attendanceRecord.create({ data: { sessionId: next.id, userId: student.id, status: i ? "LATE" : "PRESENT" } });
      }
      const recap = await request(teacher, `/course-classes/${cls.id}/attendance/recap`);
      assert.equal(recap.minAttendancePercentage, 80);
      assert.equal(recap.recap[0].percentage, 75);
      assert.equal(recap.recap[0].isEligibleForExam, false);
      await request(admin, "/system/settings", "PUT", { academicYear: original.academicYear, minAttendancePercentage: 75 });
      assert.equal((await request(teacher, `/course-classes/${cls.id}/attendance/recap`)).recap[0].isEligibleForExam, true);
    });
    await suite.test("metadata and download ACL deny outsiders, inactive participants, hidden/scheduled resources and other answers", async () => {
      const file = await db.fileReference.create({ data: {
        id: randomUUID(), classId: cls.id, ownerId: teacher.id, purpose: "RESOURCE", name: "module.pdf",
        sizeBytes: 12, mimeType: "application/pdf", checksum: "a".repeat(64), status: "READY",
      } });
      const resource = await db.resourceItem.create({ data: {
        sectionId: section.id, title: "Document", resourceType: "DOCUMENT", dynamicPayload: { fileObjectId: file.id, blocks: [] },
      } });
      const path = `/files/${file.id}/metadata?resourceId=${resource.id}`;
      assert.equal((await request(student, path)).data.simulated, true);
      await request(outsider, path, "GET", undefined, 403);
      await request(student, `/files/${file.id}/metadata`, "GET", undefined, 403);
      await db.enrollment.update({ where: { classId_userId: { classId: cls.id, userId: student.id } }, data: { isActive: false } });
      await request(student, path, "GET", undefined, 403);
      await request(student, `/files/${file.id}/download-ticket`, "POST", { resourceId: resource.id }, 403);
      await db.enrollment.update({ where: { classId_userId: { classId: cls.id, userId: student.id } }, data: { isActive: true } });
      for (const changes of [{ isVisible: false }, { isVisible: true, availableFrom: new Date(Date.now() + 60000) }]) {
        await db.resourceItem.update({ where: { id: resource.id }, data: changes });
        await request(student, path, "GET", undefined, 403);
      }
      await db.resourceItem.update({ where: { id: resource.id }, data: { availableFrom: null } });
      await db.section.update({ where: { id: section.id }, data: { isVisible: false } });
      await request(student, path, "GET", undefined, 403);
      await db.section.update({ where: { id: section.id }, data: { isVisible: true } });
      const unrelated = await db.resourceItem.create({ data: { sectionId: section.id, title: "Unrelated", resourceType: "DOCUMENT", dynamicPayload: { blocks: [] } } });
      await request(student, `/files/${file.id}/metadata?resourceId=${unrelated.id}`, "GET", undefined, 403);
      const answer = await db.fileReference.create({ data: { ...file, id: randomUUID(), ownerId: student.id, purpose: "SUBMISSION" } });
      await db.enrollment.create({ data: { classId: cls.id, userId: outsider.id } });
      await request(outsider, `/files/${answer.id}/metadata`, "GET", undefined, 403);
      await request(student, `/files/${answer.id}/metadata`);
      await request(teacher, `/files/${answer.id}/metadata`);
    });
    await suite.test("server accepts exact upload purpose limits and rejects one byte above", async () => {
      const assignment = await db.assignment.create({ data: { sectionId: section.id, title: "Task", instructions: "Upload", allowedFormats: ["pdf"] } });
      const quiz = await db.quiz.create({ data: { sectionId: section.id, title: "Quiz", status: "PUBLISHED" } });
      const attempt = await db.quizAttempt.create({ data: { quizId: quiz.id, userId: student.id, attemptNum: 1,
        expiresAt: new Date(Date.now() + 3600000), answersJson: {}, questionSnapshot: [], status: "IN_PROGRESS" } });
      for (const [purpose, limit] of Object.entries(UPLOAD_LIMITS)) {
        const body = { classId: cls.id, purpose, name: purpose === "COVER" ? "cover.png" : purpose === "VIDEO" ? "video.mp4" : "document.pdf",
          mimeType: purpose === "COVER" ? "image/png" : purpose === "VIDEO" ? "video/mp4" : "application/pdf",
          checksum: "a".repeat(64), sizeBytes: limit,
          contextId: purpose === "SUBMISSION" ? assignment.id : purpose === "QUIZ_ANSWER" ? attempt.id : undefined };
        const user = ["SUBMISSION", "QUIZ_ANSWER"].includes(purpose) ? student : teacher;
        const ticket = await request(user, "/files/upload-ticket", "POST", body);
        assert.ok(ticket.fileObjectId);
        await request(user, "/files/upload-ticket", "POST", { ...body, sizeBytes: limit + 1 }, 400);
      }
    });
    await suite.test("active adapters report healthy, timeout, failure and invalid responses without fake success", async () => {
      assert.equal((await request(teacher, "/files/health")).data.simulated, true);
      process.env.FILE_SERVICE_URL = `http://127.0.0.1:${(service.address() as any).port}`;
      process.env.FILE_SERVICE_KEY = "integration-key";
      for (const mode of ["legacy", "uay"]) {
        process.env.FILE_SERVICE_TYPE = mode;
        upstreamState = "healthy";
        assert.equal((await request(teacher, "/files/health")).data.simulated, false);
        upstreamState = "invalid";
        await request(teacher, "/files/health", "GET", undefined, 502);
        upstreamState = "failure";
        await request(teacher, "/files/health", "GET", undefined, 503);
        upstreamState = "timeout";
        await assert.rejects(() => checkFileService({ timeoutMs: 30 }), (error: any) => error.code === "FILE_SERVICE_UNAVAILABLE");
        upstreamState = "healthy";
        await checkFileService();
      }
      const file = await db.fileReference.findFirstOrThrow({ where: { classId: cls.id, ownerId: teacher.id, status: "READY" } });
      upstreamState = "invalid";
      await request(teacher, `/files/${file.id}/metadata`, "GET", undefined, 502);
      await request(teacher, "/repositories", "GET", undefined, 502);
      upstreamState = "failure";
      await request(teacher, `/files/${file.id}/metadata`, "GET", undefined, 503);
      await request(teacher, "/repositories", "GET", undefined, 503);
      process.env.FILE_SERVICE_TYPE = "legacy";
      await request(teacher, "/repositories", "GET", undefined, 501);
    });
  } finally {
    const { id, updatedAt, ...values } = original;
    await db.academicSettings.update({ where: { id }, data: values });
    await new Promise<void>(resolve => server.close(() => resolve()));
    service.closeAllConnections();
    await new Promise<void>(resolve => service.close(() => resolve()));
    await db.$disconnect();
  }
});
