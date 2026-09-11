import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID, createHash, createHmac } from "node:crypto";
import { generateKeyPair, exportJWK, SignJWT } from "jose";

test("OIDC authorization code with PKCE, JWT validation, refresh, logout and revocation", async (suite) => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  Object.assign(jwk, { kid: "test-key", alg: "RS256", use: "sig" });
  const subject = randomUUID();
  let issuer = "",
    nonce = "",
    challenge = "",
    tokenMode = "active";
  let refreshes = 0;
  const used = new Set<string>();
  const sign = async (extra: any, audience = "elearning-uay") =>
    new SignJWT(extra)
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(subject)
      .setIssuedAt()
      .setExpirationTime(
        tokenMode === "expired" ? Math.floor(Date.now() / 1000) - 1 : "15m",
      )
      .sign(privateKey);
  const sso = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/.well-known/openid-configuration") {
      res.end(
        JSON.stringify({
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          jwks_uri: `${issuer}/jwks`,
          end_session_endpoint: `${issuer}/logout`,
        }),
      );
      return;
    }
    if (req.url === "/jwks") {
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    if (req.url === "/token") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const params = new URLSearchParams(Buffer.concat(chunks).toString());
      if (params.get("grant_type") === "authorization_code") {
        const code = params.get("code")!;
        if (
          used.has(code) ||
          createHash("sha256")
            .update(params.get("code_verifier") ?? "")
            .digest("base64url") !== challenge
        ) {
          res.statusCode = 400;
          res.end("{}");
          return;
        }
        used.add(code);
      } else {
        refreshes++;
      }
      const profile = {
        name: "OIDC Test User",
        email: `${subject}@example.test`,
        student_staff_number: subject,
        role: "STUDENT",
        department_scopes: [],
        account_status: tokenMode === "disabled" ? "DISABLED" : "ACTIVE",
      };
      const access = await sign(
        profile,
        tokenMode === "wrong-audience" ? "different-app" : "elearning-uay",
      );
      const id = await sign({
        ...profile,
        nonce: tokenMode === "wrong-nonce" ? "wrong" : nonce,
      });
      res.end(
        JSON.stringify({
          access_token: access,
          id_token: id,
          refresh_token: "rotated-refresh",
          expires_in: 900,
        }),
      );
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  sso.listen(0, "127.0.0.1");
  await once(sso, "listening");
  issuer = `http://127.0.0.1:${(sso.address() as any).port}`;
  process.env.AUTH_MODE = "oidc";
  process.env.SSO_ISSUER = issuer;
  process.env.SSO_CLIENT_ID = "elearning-uay";
  process.env.SSO_AUDIENCE = "elearning-uay";
  process.env.SSO_WEBHOOK_SECRET = "test-signed-webhook-secret";
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db, cache, hash } = await import("../../apps/api/src/core.js");
  const app = createApp().listen(0, "127.0.0.1");
  await once(app, "listening");
  const base = `http://127.0.0.1:${(app.address() as any).port}/api/v1`;
  let sessionCookie = "";
  async function login(mode = "active") {
    tokenMode = mode;
    await new Promise((r) => setTimeout(r, 1100));
    const response = await fetch(`${base}/auth/login`, { redirect: "manual" });
    assert.equal(response.status, 302);
    const url = new URL(response.headers.get("location")!);
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    nonce = url.searchParams.get("nonce")!;
    challenge = url.searchParams.get("code_challenge")!;
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    return fetch(
      `${base}/auth/callback?state=${url.searchParams.get("state")}&code=${randomUUID()}`,
      { headers: { Cookie: cookie }, redirect: "manual" },
    );
  }
  try {
    await suite.test(
      "PKCE + nonce creates a password-free session",
      async () => {
        const response = await login();
        assert.equal(response.status, 302);
        sessionCookie = response.headers
          .get("set-cookie")!
          .split(/, (?=uay-session)/)
          .find((c) => c.includes("uay-session="))!
          .split(";")[0];
        const me = await fetch(`${base}/me`, {
          headers: { Cookie: sessionCookie },
        });
        assert.equal(me.status, 200);
        const user: any = await me.json();
        assert.equal(user.externalSubjectId, subject);
        assert.equal(user.role, "STUDENT");
        assert.equal(user.password, undefined);
      },
    );
    await suite.test(
      "bad state, nonce, audience and account status are rejected",
      async () => {
        const state = await fetch(
          `${base}/auth/callback?state=abcdefghijklmnopqrstuv&code=invalid`,
          { headers: { Cookie: "uay-oidc-state=different" } },
        );
        assert.equal(state.status, 401);
        const badNonce = await login("wrong-nonce");
        assert.equal(badNonce.status, 401);
        const badAudience = await login("wrong-audience");
        assert.equal(badAudience.status, 401);
        const disabled = await login("disabled");
        assert.equal(disabled.status, 403);
      },
    );
    await suite.test(
      "refresh rotates server-side tokens and revalidates identity",
      async () => {
        tokenMode = "active";
        const raw = sessionCookie.split("=")[1];
        const key = `session:${hash(raw)}`;
        const stored = JSON.parse((await cache.get(key))!);
        stored.expires = Date.now() - 1;
        await cache.set(key, JSON.stringify(stored), 3600);
        const result = await fetch(`${base}/me`, {
          headers: { Cookie: sessionCookie },
        });
        assert.equal(result.status, 200);
        assert.equal(refreshes, 1);
      },
    );
    await suite.test(
      "signed webhook invalidates active sessions immediately",
      async () => {
        await new Promise((r) => setTimeout(r, 1100));
        const body = JSON.stringify({ subject }, null, 2);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = createHmac("sha256", process.env.SSO_WEBHOOK_SECRET!)
          .update(`${timestamp}.${body}`)
          .digest("hex");
        const response = await fetch(`${base}/auth/revocations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-SSO-Timestamp": timestamp,
            "X-SSO-Signature": signature,
          },
          body,
        });
        assert.equal(response.status, 200);
        const blocked = await fetch(`${base}/me`, {
          headers: { Cookie: sessionCookie },
        });
        assert.equal(blocked.status, 403);
        const user = await db.user.findUniqueOrThrow({
          where: { externalSubjectId: subject },
        });
        assert.equal(user.isActive, false);
      },
    );
    await suite.test(
      "logout clears session and provides the provider logout URL",
      async () => {
        const response = await fetch(`${base}/auth/logout`, {
          method: "POST",
          headers: {
            Origin: "http://127.0.0.1:5173",
            Cookie: sessionCookie,
            "Content-Type": "application/json",
          },
          body: "{}",
        });
        assert.equal(response.status, 200);
        const body: any = await response.json();
        assert(body.logoutUrl.startsWith(`${issuer}/logout?`));
        const me = await fetch(`${base}/me`, {
          headers: { Cookie: sessionCookie },
        });
        assert.equal(me.status, 401);
      },
    );
  } finally {
    await new Promise<void>((resolve) => app.close(() => resolve()));
    await new Promise<void>((resolve) => sso.close(() => resolve()));
    await db.$disconnect();
  }
});
