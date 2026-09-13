import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { spawnSync } from "node:child_process";

test("quick demo selection uses the real OIDC callback and rejects bypass", async () => {
  process.env.AUTH_MODE = "oidc";
  process.env.DEMO_MODE = "true";
  const { startMockSso } = await import("../../scripts/oidc-fixture.mjs");
  const mock = await startMockSso({ port: 0 });
  process.env.SSO_ISSUER = mock.issuer;
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      externalSubjectId: id,
      fullName: "Demo OIDC",
      role: "INSTRUCTOR",
      email: `${id}@example.test`,
      studentStaffNumber: id,
    },
  });
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const config: any = await (
      await fetch(base + "/api/v1/auth/config")
    ).json();
    assert.equal(config.demoEnabled, true);
    assert.equal(config.mode, "oidc");
    const login = await fetch(base + `/api/v1/auth/login?demoUserId=${id}`, {
      redirect: "manual",
    });
    assert.equal(login.status, 302);
    const authorize = login.headers.get("location")!;
    assert.equal(new URL(authorize).searchParams.get("login_hint"), id);
    assert.equal(
      new URL(authorize).searchParams.get("code_challenge_method"),
      "S256",
    );
    const provider = await fetch(authorize, { redirect: "manual" });
    assert.equal(provider.status, 302);
    const callback = new URL(provider.headers.get("location")!);
    const completed = await fetch(base + callback.pathname + callback.search, {
      headers: { Cookie: login.headers.get("set-cookie")!.split(";")[0] },
      redirect: "manual",
    });
    assert.equal(completed.status, 302);
    assert.equal(completed.headers.get("location"), "/#/dashboard");
    const session = completed.headers
      .getSetCookie()
      .find((c) => c.startsWith("uay-session="))!
      .split(";")[0];
    const me: any = await (
      await fetch(base + "/api/v1/me", { headers: { Cookie: session } })
    ).json();
    assert.equal(me.id, id);
    const bypass = await fetch(base + "/api/v1/auth/development-login", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: id }),
    });
    assert.equal(bypass.status, 404);
    await new Promise((r) => setTimeout(r, 1100));
    const logout: any = await (
      await fetch(base + "/api/v1/auth/logout", {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          Cookie: session,
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).json();
    assert.equal(
      (await fetch(logout.logoutUrl, { redirect: "manual" })).headers.get(
        "location",
      ),
      "http://127.0.0.1:5173",
    );
    assert.equal(
      (await fetch(base + "/api/v1/me", { headers: { Cookie: session } }))
        .status,
      401,
    );
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "-e", "import('./apps/api/src/core.ts')"],
      {
        env: {
          ...process.env,
          NODE_ENV: "production",
          DEMO_MODE: "true",
          AUTH_MODE: "development",
        },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Production requires OIDC/);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await mock.close();
    await db.$disconnect();
  }
});
