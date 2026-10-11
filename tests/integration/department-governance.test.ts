import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";

test("department governance protects authority, identity and reference integrity", async (suite) => {
  assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const suffix = randomUUID().slice(0, 8);
  const users: any[] = [],
    departments: any[] = [],
    courses: any[] = [];
  const cookies = new Map<string, string>();
  const makeUser = async (
    role: any,
    scopes: string[] = [],
    extra: any = {},
  ) => {
    const id = randomUUID();
    const user = await db.user.create({
      data: {
        id,
        ssoUserId: id,
        name: `Scope ${suffix} ${users.length}`,
        email: `${id}@example.test`,
        identifierValue: id,
        role,
        departmentScopes: scopes,
        ...extra,
      },
    });
    users.push(user);
    await new Promise((r) => setTimeout(r, 230));
    const login = await fetch(base + "/auth/development-login", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: id }),
    });
    assert.equal(login.status, 200);
    cookies.set(id, login.headers.get("set-cookie")!.split(";")[0]);
    return user;
  };
  const request = async (
    user: any,
    path: string,
    method = "GET",
    body?: any,
    expected = 200,
    key = randomUUID(),
    machine = false,
  ) => {
    await new Promise((r) => setTimeout(r, 45));
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        ...(machine
          ? { "X-SIAKAD-Secret": process.env.SIAKAD_SYNC_SECRET! }
          : { Cookie: cookies.get(user.id)! }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: any = await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${path}: ${JSON.stringify(data)}`,
    );
    return data;
  };
  let admin: any,
    instructor: any,
    departmentAdmin: any,
    student: any,
    rector: any,
    first: any;
  try {
    admin = await makeUser("SUPER_ADMIN");
    instructor = await makeUser("INSTRUCTOR", ["IF"]);
    departmentAdmin = await makeUser("DEPARTMENT_ADMIN", ["IF"]);
    student = await makeUser("STUDENT", ["IF"]);
    rector = await makeUser("RECTOR");
    await request(admin, "/system/departments");
    first = await request(admin, "/system/departments", "POST", {
      code: `QA${suffix}`,
      name: "Program studi patroli",
    });
    departments.push(first);

    await suite.test(
      "only Super Admin can write governance or inspect user authority",
      async () => {
        for (const user of [instructor, departmentAdmin, student, rector]) {
          await request(
            user,
            "/system/department-scopes/users",
            "GET",
            undefined,
            403,
          );
          await request(
            user,
            "/system/departments",
            "POST",
            { code: "NO", name: "Ditolak" },
            403,
          );
          await request(
            user,
            `/system/department-scopes/users/${instructor.id}`,
            "PUT",
            { departmentScopes: ["TS"] },
            403,
          );
          await request(
            user,
            "/system/siakad/sync-scopes",
            "POST",
            { assignments: [] },
            403,
          );
        }
      },
    );
    await suite.test(
      "unknown scopes and empty Department Admin authority are rejected",
      async () => {
        await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "PUT",
          { role: "DEPARTMENT_ADMIN", departmentScopes: ["DOES_NOT_EXIST"] },
          400,
        );
        await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "PUT",
          { role: "DEPARTMENT_ADMIN", departmentScopes: [] },
          400,
        );
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: instructor.id } }))
            .role,
          "INSTRUCTOR",
        );
      },
    );
    await suite.test(
      "scope assignment preserves teaching role unless promotion is explicit and takes effect in a live session",
      async () => {
        const changed = await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "PUT",
          { role: "DEPARTMENT_ADMIN", departmentScopes: [" if ", "IF", "TS"] },
        );
        assert.deepEqual(changed.departmentScopes, ["IF", "TS"]);
        const current = await request(instructor, "/me");
        assert.equal(current.role, "DEPARTMENT_ADMIN");
        assert.deepEqual(current.departmentScopes, ["IF", "TS"]);
        await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "PUT",
          { role: "INSTRUCTOR", departmentScopes: ["IF"] },
        );
      },
    );
    await suite.test(
      "student and rector accounts cannot be converted through lecturer authority tools",
      async () => {
        for (const user of [student, rector])
          await request(
            admin,
            `/system/department-scopes/users/${user.id}`,
            "PUT",
            { role: "INSTRUCTOR", departmentScopes: ["IF"] },
            403,
          );
        const list = await request(admin, "/system/department-scopes/users");
        assert.ok(
          !list.some((u: any) => u.id === student.id || u.id === rector.id),
        );
      },
    );
    await suite.test(
      "scope changes grant and revoke foreign-class access in the existing session",
      async () => {
        const classes = [];
        for (const code of ["IF", "TS"]) {
          const course = await db.course.create({
            data: {
              code: `DYNAMIC-${suffix}-${code}`,
              title: `Dynamic scope ${code}`,
              departmentCode: code,
            },
          });
          courses.push(course);
          classes.push(
            await db.courseClass.create({
              data: {
                courseId: course.id,
                name: `Scope ${suffix}`,
                academicYear: "2026/2027 Ganjil",
              },
            }),
          );
        }
        await request(departmentAdmin, `/course-classes/${classes[0].id}`);
        await request(
          departmentAdmin,
          `/course-classes/${classes[1].id}`,
          "GET",
          undefined,
          403,
        );
        const list = await request(
          admin,
          `/system/department-scopes/users?q=${departmentAdmin.identifierValue}`,
        );
        await db.user.update({
          where: { id: departmentAdmin.id },
          data: { lastActiveAt: new Date() },
        });
        await request(
          admin,
          `/system/department-scopes/users/${departmentAdmin.id}`,
          "PUT",
          {
            role: "DEPARTMENT_ADMIN",
            departmentScopes: ["IF", "TS"],
            expectedAuthorityVersion: list[0].authorityVersion,
          },
        );
        await request(departmentAdmin, `/course-classes/${classes[1].id}`);
        await request(
          departmentAdmin,
          `/course-classes/${classes[1].id}/grade-categories`,
          "PUT",
          { categories: [] },
          403,
        );
        await request(
          admin,
          `/system/department-scopes/users/${departmentAdmin.id}`,
          "PUT",
          { role: "DEPARTMENT_ADMIN", departmentScopes: ["IF"] },
        );
        await request(
          departmentAdmin,
          `/course-classes/${classes[1].id}`,
          "GET",
          undefined,
          403,
        );
        const ownCourses = await request(
          admin,
          "/courses",
          "POST",
          {
            code: `ALIAS-${suffix}`,
            title: "Alias course",
            departmentCode: "Manajemen",
          },
          201,
        );
        courses.push(ownCourses);
        assert.equal(ownCourses.departmentCode, "MN");
      },
    );
    await suite.test(
      "referenced department codes cannot be renamed or hard-deleted",
      async () => {
        const course = await db.course.create({
          data: {
            code: `QA-${suffix}`,
            title: "Patrol course",
            departmentCode: first.code,
          },
        });
        courses.push(course);
        await request(
          admin,
          `/system/departments/${first.id}`,
          "PUT",
          { code: `${first.code}X` },
          409,
        );
        assert.equal(
          (await db.course.findUniqueOrThrow({ where: { id: course.id } }))
            .departmentCode,
          first.code,
        );
        const deleted = await request(
          admin,
          `/system/departments/${first.id}`,
          "DELETE",
        );
        assert.equal(deleted.action, "DEACTIVATED");
        assert.equal(
          (await db.department.findUniqueOrThrow({ where: { id: first.id } }))
            .isActive,
          false,
        );
        await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "PUT",
          { role: "INSTRUCTOR", departmentScopes: [first.code] },
          400,
        );
      },
    );
    await suite.test(
      "pre-provisioning refuses ambiguous or mismatched identities and never reactivates disabled accounts",
      async () => {
        await request(
          admin,
          "/system/department-scopes/users",
          "POST",
          {
            identifierValue: instructor.identifierValue,
            email: departmentAdmin.email,
            name: "Wrong identity",
            role: "INSTRUCTOR",
            departmentScopes: ["IF"],
          },
          409,
        );
        await db.user.update({
          where: { id: instructor.id },
          data: { status: "DISABLED" },
        });
        await request(
          admin,
          "/system/department-scopes/users",
          "POST",
          {
            identifierValue: instructor.identifierValue,
            email: instructor.email,
            name: instructor.name,
            role: "INSTRUCTOR",
            departmentScopes: ["IF"],
          },
          403,
        );
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: instructor.id } }))
            .status,
          "DISABLED",
        );
        await db.user.update({
          where: { id: instructor.id },
          data: { status: "ACTIVE" },
        });
      },
    );
    await suite.test(
      "existing SSO users cannot be deleted through the pre-registration endpoint",
      async () => {
        await request(
          admin,
          `/system/department-scopes/users/${student.id}`,
          "DELETE",
          undefined,
          403,
        );
        await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "DELETE",
          undefined,
          409,
        );
        assert.ok(await db.user.findUnique({ where: { id: instructor.id } }));
      },
    );
    await suite.test(
      "machine sync supports preview, audit and idempotent commit without a fictitious user FK",
      async () => {
        process.env.SIAKAD_SYNC_SECRET = "scope-patrol-machine-secret";
        const assignments = [
          {
            identifierValue: instructor.identifierValue,
            departmentScopes: ["TS"],
            role: "DEPARTMENT_ADMIN",
          },
        ];
        const preview = await request(
          null,
          "/system/siakad/sync-scopes",
          "POST",
          { assignments, dryRun: true },
          200,
          randomUUID(),
          true,
        );
        assert.equal(preview.ready, 1);
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: instructor.id } }))
            .role,
          "INSTRUCTOR",
        );
        const key = randomUUID();
        await request(
          null,
          "/system/siakad/sync-scopes",
          "POST",
          { assignments },
          200,
          key,
          true,
        );
        await request(
          null,
          "/system/siakad/sync-scopes",
          "POST",
          { assignments },
          200,
          key,
          true,
        );
        assert.equal(
          await db.auditLog.count({
            where: { entityId: instructor.id, action: "SYNC_SIAKAD_SCOPES" },
          }),
          1,
        );
      },
    );
    await suite.test(
      "SIAKAD rejects invalid scopes and protects unrelated student identities",
      async () => {
        await request(
          admin,
          "/system/siakad/sync-scopes",
          "POST",
          {
            assignments: [
              {
                identifierValue: instructor.identifierValue,
                departmentScopes: ["BOGUS"],
              },
            ],
            dryRun: true,
          },
          400,
        );
        await request(
          admin,
          "/system/siakad/sync-scopes",
          "POST",
          {
            assignments: [
              {
                identifierValue: student.identifierValue,
                departmentScopes: ["IF"],
              },
            ],
          },
          403,
        );
        assert.equal(
          (await db.user.findUniqueOrThrow({ where: { id: student.id } })).role,
          "STUDENT",
        );
      },
    );
    await suite.test(
      "stale edits and previews cannot overwrite new authority; SIAKAD can revoke all scopes",
      async () => {
        const before = await db.user.findUniqueOrThrow({
          where: { id: instructor.id },
        });
        const assignments = [
          {
            identifierValue: instructor.identifierValue,
            departmentScopes: ["IF"],
            role: "DEPARTMENT_ADMIN",
          },
        ];
        const preview = await request(
          admin,
          "/system/siakad/sync-scopes",
          "POST",
          { assignments, dryRun: true },
        );
        await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "PUT",
          {
            departmentScopes: ["IF"],
            role: "INSTRUCTOR",
            expectedUpdatedAt: before.updatedAt.toISOString(),
          },
        );
        await request(
          admin,
          `/system/department-scopes/users/${instructor.id}`,
          "PUT",
          {
            departmentScopes: ["TS"],
            expectedUpdatedAt: before.updatedAt.toISOString(),
          },
          409,
        );
        await request(
          admin,
          "/system/siakad/sync-scopes",
          "POST",
          {
            assignments: [
              {
                ...assignments[0],
                expectedUpdatedAt: preview.results[0].updatedAt,
              },
            ],
          },
          409,
        );
        await request(admin, "/system/siakad/sync-scopes", "POST", {
          assignments: [
            {
              identifierValue: instructor.identifierValue,
              departmentScopes: [],
              role: "INSTRUCTOR",
            },
          ],
        });
        const revoked = await db.user.findUniqueOrThrow({
          where: { id: instructor.id },
        });
        assert.equal(revoked.authoritySource, "SIAKAD");
        assert.deepEqual(revoked.departmentScopes, []);
        await request(
          admin,
          "/system/siakad/sync-scopes",
          "POST",
          {
            assignments: [
              { ...assignments[0] },
              { ...assignments[0], identifierValue: instructor.email },
            ],
          },
          400,
        );
      },
    );
    await suite.test(
      "SSO sync users requires Super Admin authority and validates parameters",
      async () => {
        for (const user of [instructor, departmentAdmin, student, rector]) {
          await request(
            user,
            "/system/sso/sync-users",
            "POST",
            { dryRun: true },
            403,
          );
        }
        await request(
          admin,
          "/system/sso/sync-users",
          "POST",
          { userType: "INVALID_ROLE" },
          400,
        );
      },
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.course.deleteMany({
      where: { id: { in: courses.map((c) => c.id) } },
    });
    await db.idempotencyRecord.deleteMany({
      where: { userId: { in: users.map((u) => u.id) } },
    });
    // Audit is append-only; retire fixture actors rather than altering the ledger.
    await db.user.updateMany({
      where: { id: { in: users.map((u) => u.id) } },
      data: { status: "DISABLED", departmentScopes: [] },
    });
    await db.department.deleteMany({
      where: { id: { in: departments.map((d) => d.id) } },
    });
    await db.$disconnect();
  }
});
