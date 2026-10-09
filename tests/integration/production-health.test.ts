import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

for (const { redisUrl, databaseDown } of [
  { redisUrl: "", databaseDown: false },
  { redisUrl: "redis://127.0.0.1:59999", databaseDown: false },
  { redisUrl: "", databaseDown: true },
]) {
  test(
    databaseDown
      ? "campus grace still returns 503 when the database is unavailable"
      : `campus grace remains available with ${redisUrl ? "unavailable" : "unconfigured"} Redis and no revocation secret`,
    () => {
      assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
      const databaseUrl = new URL(process.env.DATABASE_URL!);
      if (databaseDown) databaseUrl.port = "59998";
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          `
    import assert from 'node:assert/strict';
    import {once} from 'node:events';
    const {createApp} = await import('./apps/api/src/index.ts');
    const {db, redis} = await import('./apps/api/src/core.ts');
    redis?.disconnect();
    const server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const base = 'http://127.0.0.1:' + server.address().port;
      const health = await fetch(base + '/api/health');
      const databaseReady = process.env.HEALTH_TEST_DATABASE_DOWN !== 'true';
      assert.equal(health.status, databaseReady ? 200 : 503);
      const body = await health.json();
      assert.equal(body.status, databaseReady ? 'ok' : 'error');
      assert.equal(body.degraded, true);
      assert.equal(body.checks.database, databaseReady ? 'ok' : 'unavailable');
      assert.equal(body.checks.redis, redis ? 'unavailable' : 'not_configured');
      assert.equal(body.checks.sessionStore, 'memory');
      assert.equal(body.checks.revocationWebhook, 'not_configured');
      const session = await fetch(base + '/api/v1/me');
      assert.equal(session.status, 401);
      assert.equal((await session.json()).error.code, 'LOGIN_REQUIRED');
      const revocation = await fetch(base + '/api/v1/auth/revocations', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'
      });
      assert.equal(revocation.status, 503);
      assert.equal((await revocation.json()).error.code, 'SSO_CONFIGURATION');
      const demoUsers = await fetch(base + '/api/v1/auth/development-users');
      assert.equal(demoUsers.status, 404);
      const demoLogin = await fetch(base + '/api/v1/auth/development-login', {
        method: 'POST', headers: {'Content-Type': 'application/json', Origin: 'https://elearning.example.test'}, body: '{}'
      });
      assert.equal(demoLogin.status, 404);
    } finally {
      await new Promise(resolve => server.close(resolve));
      await db.$disconnect();
      redis?.disconnect();
    }
  `,
        ],
        {
          encoding: "utf8",
          windowsHide: true,
          timeout: 15000,
          env: {
            ...process.env,
            NODE_ENV: "production",
            DATABASE_URL: databaseUrl.href,
            HEALTH_TEST_DATABASE_DOWN: String(databaseDown),
            DEMO_MODE: "false",
            AUTH_MODE: "oidc",
            APP_ORIGIN: "https://elearning.example.test",
            API_ORIGIN: "https://elearning.example.test",
            REDIS_URL: redisUrl,
            REDIS_PRIVATE_URL: "",
            REDISHOST: "",
            SSO_ISSUER: "https://sso.example.test",
            SSO_CLIENT_ID: "elearning-uay",
            SSO_AUDIENCE: "elearning-uay",
            SSO_REDIRECT_URI:
              "https://elearning.example.test/api/v1/auth/callback",
            SSO_WEBHOOK_SECRET: "",
            FILE_SERVICE_TYPE: "legacy",
            FILE_SERVICE_URL: "https://files.example.test",
            FILE_SERVICE_KEY: "fixture-only",
            FILE_ALLOWED_ORIGINS: "https://files.example.test",
            UAY_FILE_SERVICE_URL: "",
            UAY_FILE_SERVICE_API_KEY: "",
          },
        },
      );
      assert.equal(result.status, 0, result.stderr || result.stdout);
    },
  );
}
