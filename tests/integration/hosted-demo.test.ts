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
    redirectUri: `${origin}/auth/callback`,
    clientId: "elearning-uay-demo",
    audience: "elearning-uay-demo",
  });
  process.env.SSO_ISSUER = mock.issuer;
  process.env.SSO_CLIENT_ID = "elearning-uay-demo";
  process.env.SSO_AUDIENCE = "elearning-uay-demo";
  process.env.SSO_REDIRECT_URI = `${origin}/auth/callback`;
  process.env.DEMO_INTERNAL_SSO_URL = mock.internalIssuer;
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const id = randomUUID();
  await db.user.create({
    data: {
      id,
      ssoUserId: id,
      name: "Demo Railway",
      email: `${id}@example.test`,
      identifierValue: id,
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
    const selected = await fetch(`${base}/api/v1/auth/authorization`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ demoUserId: id }),
    });
    assert.equal(selected.status, 200);
    const stateCookie = selected.headers.get("set-cookie")!.split(";")[0];
    const authorize = new URL((await selected.json()).authorizationUrl);
    assert.equal(authorize.origin, apiOrigin);
    assert.equal(authorize.pathname, "/demo-sso/authorize");
    const provider = await fetch(base + authorize.pathname + authorize.search, {
      redirect: "manual",
    });
    const callback = new URL(provider.headers.get("location")!);
    assert.equal(callback.origin, origin);
    assert.equal(callback.pathname, "/auth/callback");
    const completed = await fetch(base + "/api/v1/auth/callback" + callback.search, {
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

test("hosted demo account picker keeps links on the provider mount path", async () => {
  // The fixture is served at `${apiOrigin}/demo-sso`, but the proxy strips that
  // prefix before the fixture sees the request. A self-referencing link rebuilt
  // from the received path loses the mount and lands on the SPA catch-all, which
  // boots the app on the API origin and fails every later write with
  // INVALID_ORIGIN. Only the picker page builds such links, so the redirect-only
  // path above cannot catch this.
  const origin = "https://frontend.example.test";
  const apiOrigin = "https://api.example.test";
  process.env.NODE_ENV = "production";
  process.env.DEMO_MODE = "true";
  process.env.AUTH_MODE = "oidc";
  process.env.APP_ORIGIN = origin;
  process.env.API_ORIGIN = apiOrigin;
  delete process.env.REDIS_URL;
  const { startMockSso } = await import("../../scripts/oidc-fixture.mjs");
  const mock = await startMockSso({
    port: 0,
    origin,
    publicIssuer: `${apiOrigin}/demo-sso`,
    redirectUri: `${origin}/auth/callback`,
    clientId: "elearning-uay-demo",
    audience: "elearning-uay-demo",
  });
  process.env.SSO_ISSUER = mock.issuer;
  process.env.SSO_CLIENT_ID = "elearning-uay-demo";
  process.env.SSO_AUDIENCE = "elearning-uay-demo";
  process.env.SSO_REDIRECT_URI = `${origin}/auth/callback`;
  process.env.DEMO_INTERNAL_SSO_URL = mock.internalIssuer;
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const query = new URLSearchParams({
      client_id: "elearning-uay-demo",
      redirect_uri: `${origin}/auth/callback`,
      response_type: "code",
      code_challenge_method: "S256",
      state: randomUUID(),
      nonce: randomUUID(),
      code_challenge: randomUUID(),
    });
    // No login_hint: this is the plain "sign in with SSO" path that renders the
    // account picker rather than redirecting straight to the callback.
    const page = await fetch(`${base}/demo-sso/authorize?${query}`, {
      redirect: "manual",
    });
    assert.equal(page.status, 200);
    const html = await page.text();
    const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) =>
      m[1].replaceAll("&amp;", "&"),
    );
    const accountLinks = links.filter((href) => href.includes("login_hint="));
    assert.ok(accountLinks.length > 0, "picker should offer at least one account");
    for (const href of accountLinks) {
      const url = new URL(href);
      assert.equal(url.origin, apiOrigin);
      assert.equal(
        url.pathname,
        "/demo-sso/authorize",
        `picker link dropped the mount prefix: ${href}`,
      );
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await mock.close();
    await db.$disconnect();
  }
});
