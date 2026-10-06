import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { User } from "@prisma/client";

test("rector bridge authorization and snapshot use the production API and PostgreSQL", async (suite) => {
  assert.ok(
    process.env.DATABASE_URL &&
      new URL(process.env.DATABASE_URL).pathname.endsWith("_test"),
  );
  const originalToken = process.env.RECTOR_BRIDGE_TOKEN;
  const token = randomUUID();
  process.env.RECTOR_BRIDGE_TOKEN = token;
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const users: User[] = [];
  let courseId: string | undefined;
  const request = async (
    headers: Record<string, string> = {},
    expected = 200,
  ) => {
    const response = await fetch(base + "/integrations/rector/snapshot", {
      headers,
    });
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  };
  try {
    for (const role of ["SUPER_ADMIN", "INSTRUCTOR", "STUDENT"] as const) {
      const id = randomUUID();
      users.push(
        await db.user.create({
          data: {
            id,
            ssoUserId: id,
            role,
            userType: role === "INSTRUCTOR" ? "LECTURER" : "STUDENT",
            identifierValue: id,
            name: `Bridge-${id}`,
            email: `${id}@example.test`,
            departmentScopes: ["BRIDGE"],
            lastLoginAt: new Date(),
          },
        }),
      );
    }
    const [admin, teacher, student] = users;
    const cookies = new Map<string, string>();
    for (const user of [admin, student]) {
      const response = await fetch(base + "/auth/development-login", {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });
      assert.equal(response.status, 200);
      cookies.set(user.id, response.headers.get("set-cookie")!.split(";")[0]);
    }
    const course = await db.course.create({
      data: {
        code: randomUUID(),
        title: "Bridge fixture",
        departmentCode: "BRIDGE",
      },
    });
    courseId = course.id;
    const cls = await db.courseClass.create({
      data: {
        courseId: course.id,
        name: "Published",
        academicYear: "2027/2028 Genap",
        status: "PUBLISHED",
        instructors: { create: { userId: teacher.id } },
      },
    });
    const archived = await db.courseClass.create({
      data: {
        courseId: course.id,
        name: "Archived",
        academicYear: "2026/2027 Ganjil",
        status: "ARCHIVED",
      },
    });
    const section = await db.section.create({
      data: { classId: cls.id, title: "Bridge section", isVisible: false },
    });
    const resource = await db.resourceItem.create({
      data: {
        sectionId: section.id,
        title: "Bridge material",
        resourceType: "RICH_TEXT",
        dynamicPayload: { blocks: [] },
      },
    });
    await suite.test(
      "Rector Bridging: token authorization gate rejects invalid credentials",
      async () => {
        await request({}, 401);
        await request({ Authorization: "Bearer wrong-token" }, 401);
        await request({ "X-Rector-Bridge-Token": "wrong-token" }, 401);
        await request(
          { Authorization: "Bearer uay-rector-telemetry-key" },
          401,
        );
        await request({ Cookie: cookies.get(student.id)! }, 401);
        await request({ Cookie: cookies.get(admin.id)! });
        await request({ Authorization: `Bearer ${token}` });
        await request({ "X-Rector-Bridge-Token": token });
        delete process.env.RECTOR_BRIDGE_TOKEN;
        await request({ Authorization: `Bearer ${token}` }, 401);
        await request({ Cookie: cookies.get(admin.id)! });
        process.env.RECTOR_BRIDGE_TOKEN = token;
      },
    );
    await suite.test(
      "Rector Bridging: ReportingSnapshot schema conforms to Dashboard Rektor contract",
      async () => {
        const snapshot = await request({ Authorization: `Bearer ${token}` });
        assert.deepEqual(
          Object.keys(snapshot).sort(),
          [
            "snapshotAt",
            "lecturers",
            "classes",
            "activities",
            "sessions",
          ].sort(),
        );
        assert.ok(Number.isFinite(Date.parse(snapshot.snapshotAt)));
        for (const field of ["lecturers", "classes", "activities", "sessions"])
          assert.ok(Array.isArray(snapshot[field]));
        const lecturer = snapshot.lecturers.find(
          (row: { id: string }) => row.id === teacher.id,
        );
        assert.deepEqual(lecturer, {
          id: teacher.id,
          name: teacher.name,
          identifier: teacher.identifierValue,
          department: "BRIDGE",
        });
        const actual = snapshot.classes.find(
          (row: { id: string }) => row.id === cls.id,
        );
        assert.equal(actual.title, "Bridge fixture (Published)");
        assert.equal(actual.semester, cls.academicYear);
        assert.equal(actual.department, "BRIDGE");
        assert.deepEqual(actual.instructorIds, [teacher.id]);
        assert.equal(actual.status, "AKTIF");
        assert.equal(
          snapshot.classes.find((row: { id: string }) => row.id === archived.id)
            .status,
          "ARSIP",
        );
        assert.deepEqual(
          actual.items.find((row: { id: string }) => row.id === section.id),
          {
            id: section.id,
            title: section.title,
            kind: "PERTEMUAN",
            visible: false,
            status: "DRAF",
          },
        );
        assert.equal(
          actual.items.find((row: { id: string }) => row.id === resource.id)
            .kind,
          "MATERI",
        );
        const session = snapshot.sessions.find(
          (row: { lecturerId: string }) => row.lecturerId === teacher.id,
        );
        assert.ok(session, "Snapshot harus menyertakan sesi dosen terbaru");
        assert.equal(session.loginAt, teacher.lastLoginAt!.toISOString());
        assert.equal(session.department, "BRIDGE");
      },
    );
  } finally {
    if (originalToken === undefined) delete process.env.RECTOR_BRIDGE_TOKEN;
    else process.env.RECTOR_BRIDGE_TOKEN = originalToken;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (courseId) await db.course.delete({ where: { id: courseId } });
    await db.auditLog.deleteMany({
      where: { actorId: { in: users.map((user) => user.id) } },
    });
    await db.user.deleteMany({
      where: { id: { in: users.map((user) => user.id) } },
    });
    await db.$disconnect();
  }
});
