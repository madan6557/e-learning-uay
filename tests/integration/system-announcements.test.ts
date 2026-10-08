import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import {
  importLegacyAnnouncements,
  validateLegacyAnnouncements,
} from "../../scripts/migrate-system-announcements.js";

test("system announcements enforce scope, atomic persistence, complete notifications and safe legacy import", async (suite) => {
  assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
  const { db } = await import("../../apps/api/src/core.js");
  const { createApp } = await import("../../apps/api/src/index.js");
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base =
    "http://127.0.0.1:" + (server.address() as AddressInfo).port + "/api/v1";
  const scope = "IF-" + randomUUID(),
    otherScope = "TS-" + randomUUID();
  const users: string[] = [],
    announcements: string[] = [];
  const makeUser = async (role: any, scopes: string[]) => {
    const id = randomUUID();
    users.push(id);
    return db.user.create({
      data: {
        id,
        ssoUserId: id,
        role,
        departmentScopes: scopes,
        name: "Announcement test",
        email: id + "@example.test",
        identifierValue: id,
      },
    });
  };
  const cookies = new Map<string, string>();
  const request = async (
    user: { id: string },
    method: string,
    path: string,
    body?: any,
    key = randomUUID(),
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        Cookie: cookies.get(user.id)!,
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const admin = await makeUser("SUPER_ADMIN", []);
    const dept = await makeUser("DEPARTMENT_ADMIN", [scope]);
    const other = await makeUser("DEPARTMENT_ADMIN", [otherScope]);
    const student = await makeUser("STUDENT", [scope]);
    const outside = await makeUser("STUDENT", [otherScope]);
    const noScope = await makeUser("STUDENT", []);
    const instructor = await makeUser("INSTRUCTOR", [scope]);
    const rector = await makeUser("RECTOR", []);
    for (const user of [
      admin,
      dept,
      other,
      student,
      outside,
      noScope,
      instructor,
      rector,
    ]) {
      await new Promise((done) => setTimeout(done, 250));
      const login = await fetch(base + "/auth/development-login", {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });
      assert.equal(login.status, 200);
      cookies.set(user.id, login.headers.getSetCookie()[0].split(";")[0]);
    }
    const bulk = Array.from({ length: 505 }, () => {
      const id = randomUUID();
      users.push(id);
      return {
        id,
        ssoUserId: id,
        role: "STUDENT" as const,
        departmentScopes: [scope],
        name: "Recipient",
        email: id + "@example.test",
        identifierValue: id,
      };
    });
    await db.user.createMany({ data: bulk });
    let item: any;
    await suite.test(
      "all eligible recipients beyond 500 are notified once, and audit/persistence are atomic",
      async () => {
        const key = randomUUID();
        const payload = {
          title: "Pengumuman Prodi",
          content: "<p>Informasi akademik.</p><script>alert(1)</script>",
          departmentCode: scope,
          targetRole: "STUDENT",
        };
        const result = await request(
          dept,
          "POST",
          "/system-announcements",
          payload,
          key,
        );
        assert.equal(result.status, 201, JSON.stringify(result.body));
        item = result.body;
        announcements.push(item.id);
        assert.equal(item.authorId, dept.id);
        assert.ok(!item.content.includes("<script"));
        assert.equal(
          await db.notification.count({
            where: { eventKey: "system_announcement:" + item.id },
          }),
          506,
        );
        assert.equal(
          await db.notification.count({
            where: {
              eventKey: "system_announcement:" + item.id,
              userId: { in: [outside.id, noScope.id, instructor.id] },
            },
          }),
          0,
        );
        assert.equal(
          await db.auditLog.count({
            where: { entityId: item.id, action: "CREATE" },
          }),
          1,
        );
        assert.deepEqual(
          (await request(dept, "POST", "/system-announcements", payload, key))
            .body,
          item,
        );
        assert.equal(
          await db.notification.count({
            where: { eventKey: "system_announcement:" + item.id },
          }),
          506,
        );
      },
    );
    await suite.test(
      "department writes validate original and destination scope; forbidden actions change nothing",
      async () => {
        for (const target of ["", "ALL", otherScope]) {
          assert.equal(
            (
              await request(dept, "PATCH", "/system-announcements/" + item.id, {
                departmentCode: target,
              })
            ).status,
            403,
          );
        }
        assert.equal(
          (
            await request(other, "PATCH", "/system-announcements/" + item.id, {
              title: "Bukan wewenang",
            })
          ).status,
          403,
        );
        assert.equal(
          (await request(student, "DELETE", "/system-announcements/" + item.id))
            .status,
          403,
        );
        assert.equal(
          (
            await db.systemAnnouncement.findUniqueOrThrow({
              where: { id: item.id },
            })
          ).title,
          item.title,
        );
        await db.user.update({
          where: { id: dept.id },
          data: { departmentScopes: [otherScope] },
        });
        assert.equal(
          (await request(dept, "DELETE", "/system-announcements/" + item.id))
            .status,
          403,
        );
        await db.user.update({
          where: { id: dept.id },
          data: { departmentScopes: [scope] },
        });
      },
    );
    await suite.test(
      "read access fails closed without scope, and scoped administrators can manage their own drafts",
      async () => {
        for (const user of [outside, noScope, instructor, rector]) {
          const list = (await request(user, "GET", "/system-announcements"))
            .body;
          assert.ok(!list.some((value: any) => value.id === item.id));
        }
        assert.ok(
          (await request(student, "GET", "/system-announcements")).body.some(
            (value: any) => value.id === item.id,
          ),
        );
        const draft = await request(dept, "POST", "/system-announcements", {
          title: "Draf pengumuman",
          content: "Isi belum diterbitkan.",
          departmentCode: scope,
          isPublished: false,
        });
        assert.equal(draft.status, 201);
        announcements.push(draft.body.id);
        assert.ok(
          (await request(dept, "GET", "/system-announcements")).body.some(
            (value: any) => value.id === draft.body.id,
          ),
        );
        assert.ok(
          !(await request(student, "GET", "/system-announcements")).body.some(
            (value: any) => value.id === draft.body.id,
          ),
        );
        assert.equal(
          (
            await request(
              dept,
              "PATCH",
              "/system-announcements/" + draft.body.id,
              { isPublished: true },
            )
          ).status,
          200,
        );
        assert.equal(
          await db.notification.count({
            where: { eventKey: "system_announcement:" + draft.body.id },
          }),
          507,
        );
      },
    );
    await suite.test(
      "audience edits and withdrawal revoke stale notification payloads atomically",
      async () => {
        const path = "/system-announcements/" + item.id;
        assert.equal(
          (
            await request(dept, "PATCH", path, {
              targetRole: "INSTRUCTOR",
              title: "Informasi dosen terbaru",
              expectedUpdatedAt: item.updatedAt,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await request(dept, "PATCH", path, {
              title: "Suntingan usang",
              expectedUpdatedAt: item.updatedAt,
            })
          ).status,
          409,
        );
        const notices = await db.notification.findMany({
          where: { eventKey: "system_announcement:" + item.id },
        });
        assert.equal(notices.length, 1);
        assert.equal(notices[0].userId, instructor.id);
        assert.match(notices[0].title, /terbaru/);
        assert.equal(
          (await request(dept, "PATCH", path, { isPublished: false })).status,
          200,
        );
        assert.equal(
          await db.notification.count({
            where: { eventKey: "system_announcement:" + item.id },
          }),
          0,
        );
      },
    );
    await suite.test(
      "failed transaction rolls back announcement, notifications and audit instead of reporting success",
      async () => {
        const original = db.$transaction.bind(db);
        db.$transaction = ((callback: any, options: any) =>
          original(async (tx) => {
            await callback(tx);
            throw new Error("Simulated storage failure");
          }, options)) as any;
        try {
          const result = await request(admin, "POST", "/system-announcements", {
            title: "Rollback-" + scope,
            content: "Harus dibatalkan.",
            departmentCode: scope,
          });
          assert.equal(result.status, 500);
          assert.equal(
            await db.systemAnnouncement.count({
              where: { title: "Rollback-" + scope },
            }),
            0,
          );
          assert.equal(
            await db.notification.count({
              where: { title: "Pengumuman: Rollback-" + scope },
            }),
            0,
          );
        } finally {
          db.$transaction = original;
        }
      },
    );
    await suite.test(
      "legacy migration preserves IDs/timestamps and never overwrites later edits",
      async () => {
        const legacy = {
          ...item,
          id: "legacy-" + randomUUID(),
          createdAt: "2026-01-01T00:00:00Z",
          publishedAt: "2026-02-01T00:00:00Z",
        };
        announcements.push(legacy.id);
        assert.throws(
          () => validateLegacyAnnouncements([legacy, legacy]),
          /duplikat/,
        );
        assert.throws(() =>
          validateLegacyAnnouncements([{ ...legacy, createdAt: "invalid" }]),
        );
        assert.equal((await importLegacyAnnouncements(db, [legacy])).count, 1);
        await db.systemAnnouncement.update({
          where: { id: legacy.id },
          data: { title: "Suntingan sesudah migrasi" },
        });
        assert.equal((await importLegacyAnnouncements(db, [legacy])).count, 0);
        const imported = await db.systemAnnouncement.findUniqueOrThrow({
          where: { id: legacy.id },
        });
        assert.equal(imported.title, "Suntingan sesudah migrasi");
        assert.equal(
          imported.createdAt.toISOString(),
          "2026-01-01T00:00:00.000Z",
        );
        assert.equal(
          imported.publishedAt.toISOString(),
          "2026-02-01T00:00:00.000Z",
        );
      },
    );
  } finally {
    await db.notification.deleteMany({ where: { userId: { in: users } } });
    await db.idempotencyRecord.deleteMany({ where: { userId: { in: users } } });
    await db.systemAnnouncement.deleteMany({
      where: { id: { in: announcements } },
    });
    // Audit actors remain in this disposable database; audit history is append-only.
    await db.user.updateMany({
      where: { id: { in: users } },
      data: { status: "DISABLED" },
    });
    await new Promise<void>((done) => server.close(() => done()));
    await db.$disconnect();
  }
});
