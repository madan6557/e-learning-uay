import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";

test("hosted demo keeps the browser callback on the frontend origin without provider credentials", async () => {
  const origin = "https://frontend.example.test";
  const apiOrigin = "https://api.example.test";
  process.env.NODE_ENV = "production";
  process.env.DEMO_MODE = "true";
  process.env.AUTH_MODE = "oidc";
  process.env.APP_ORIGIN = origin;
  process.env.API_ORIGIN = apiOrigin;
  delete process.env.REDIS_URL;
  delete process.env.SSO_CLIENT_SECRET;
  delete process.env.SSO_WEBHOOK_SECRET;
  delete process.env.FILE_SERVICE_URL;
  delete process.env.FILE_SERVICE_KEY;
  const { startMockSso } = await import("../../scripts/oidc-fixture.mjs");
  const mock = await startMockSso({
    port: 0,
    origin,
    publicIssuer: `${apiOrigin}/demo-sso`,
    redirectUri: `${origin}/api/v1/auth/callback`,
    clientId: "elearning-uay-demo",
    audience: "elearning-uay-demo",
  });
  process.env.SSO_ISSUER = mock.issuer;
  process.env.SSO_CLIENT_ID = "elearning-uay-demo";
  process.env.SSO_AUDIENCE = "elearning-uay-demo";
  process.env.SSO_REDIRECT_URI = `${origin}/api/v1/auth/callback`;
  process.env.DEMO_INTERNAL_SSO_URL = mock.internalIssuer;
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      externalSubjectId: id,
      fullName: "Demo Railway",
      email: `${id}@example.test`,
      studentStaffNumber: id,
      role: "INSTRUCTOR",
    },
  });
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const users: any[] = await (
      await fetch(`${base}/api/v1/auth/development-users`)
    ).json();
    assert.ok(users.some((user) => user.id === id));
    const login = await fetch(`${base}/api/v1/auth/login?demoUserId=${id}`, {
      redirect: "manual",
    });
    assert.equal(login.status, 302);
    const stateCookie = login.headers.get("set-cookie")!.split(";")[0];
    const authorize = new URL(login.headers.get("location")!);
    assert.equal(authorize.origin, apiOrigin);
    assert.equal(authorize.pathname, "/demo-sso/authorize");
    const provider = await fetch(base + authorize.pathname + authorize.search, {
      redirect: "manual",
    });
    const callback = new URL(provider.headers.get("location")!);
    assert.equal(callback.origin, origin);
    const completed = await fetch(base + callback.pathname + callback.search, {
      headers: { Cookie: stateCookie },
      redirect: "manual",
    });
    assert.equal(completed.status, 302);
    const session = completed.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith("__Host-uay-session="))!
      .split(";")[0];
    const me: any = await (
      await fetch(`${base}/api/v1/me`, { headers: { Cookie: session } })
    ).json();
    assert.equal(me.id, id);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mock.close();
    await db.$disconnect();
  }
});
