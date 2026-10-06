import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import type { GlobalRole, User } from "@prisma/client";

test("user search enforces department isolation through the production API", async (suite) => {
  assert.ok(
    process.env.DATABASE_URL &&
      new URL(process.env.DATABASE_URL).pathname.endsWith("_test"),
  );
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  const prefix = `Scope-${randomUUID()}`;
  const users: User[] = [];
  const cookies = new Map<string, string>();
  const makeUser = async (
    role: GlobalRole,
    departmentScopes: string[],
    status: "ACTIVE" | "DISABLED" = "ACTIVE",
  ) => {
    const id = randomUUID();
    const user = await db.user.create({
      data: {
        id,
        ssoUserId: id,
        role,
        departmentScopes,
        status,
        identifierValue: id,
        name: `${prefix}-${users.length}`,
        email: `${id}@example.test`,
      },
    });
    users.push(user);
    return user;
  };
  const search = async (user: User, expected = 200) => {
    const response = await fetch(
      `${base}/users?q=${encodeURIComponent(prefix)}`,
      { headers: { Cookie: cookies.get(user.id)! } },
    );
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result as { id: string }[];
  };
  const ids = (result: { id: string }[]) =>
    result.map((user) => user.id).sort();
  try {
    const admin = await makeUser("SUPER_ADMIN", []);
    const department = await makeUser("DEPARTMENT_ADMIN", ["IF"]);
    const multi = await makeUser("INSTRUCTOR", ["IF", "SI"]);
    const noScope = await makeUser("DEPARTMENT_ADMIN", []);
    const student = await makeUser("STUDENT", ["IF"]);
    await makeUser("STUDENT", ["SI"]);
    await makeUser("STUDENT", ["TE"]);
    await makeUser("STUDENT", ["IF"], "DISABLED");
    for (const user of [admin, department, multi, noScope, student]) {
      await new Promise((resolve) => setTimeout(resolve, 230));
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
    const expected = (scopes?: string[]) =>
      users
        .filter(
          (user) =>
            user.status === "ACTIVE" &&
            (!scopes ||
              user.departmentScopes.some((scope) => scopes.includes(scope))),
        )
        .map((user) => user.id)
        .sort();
    await suite.test(
      "Department Isolation: Department Admin only sees users within their department scope",
      async () => {
        assert.deepEqual(ids(await search(department)), expected(["IF"]));
      },
    );
    await suite.test(
      "Department Isolation: Multi-affiliation lecturer accesses multiple scoped departments",
      async () => {
        assert.deepEqual(ids(await search(multi)), expected(["IF", "SI"]));
      },
    );
    await suite.test(
      "Department Isolation: Super Admin has university-wide scope",
      async () => {
        assert.deepEqual(ids(await search(admin)), expected());
      },
    );
    await suite.test(
      "Department Admin without scope sees no users and students cannot search identities",
      async () => {
        assert.deepEqual(await search(noScope), []);
        await search(student, 403);
      },
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.auditLog.deleteMany({
      where: { actorId: { in: users.map((user) => user.id) } },
    });
    await db.user.deleteMany({
      where: { id: { in: users.map((user) => user.id) } },
    });
    await db.$disconnect();
  }
});
