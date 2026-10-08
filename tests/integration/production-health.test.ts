import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("campus health and authenticated API return 503 during a Redis outage", () => {
  assert.ok(new URL(process.env.DATABASE_URL!).pathname.endsWith("_test"));
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
    redis.disconnect();
    const server = createApp().listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const base = 'http://127.0.0.1:' + server.address().port;
      const health = await fetch(base + '/api/health');
      assert.equal(health.status, 503);
      const body = await health.json();
      assert.equal(body.checks.database, 'ok');
      assert.equal(body.checks.redis, 'unavailable');
      const session = await fetch(base + '/api/v1/me');
      assert.equal(session.status, 503);
      assert.equal((await session.json()).error.code, 'CACHE_UNAVAILABLE');
    } finally {
      await new Promise(resolve => server.close(resolve));
      await db.$disconnect();
      redis.disconnect();
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
        DEMO_MODE: "false",
        AUTH_MODE: "oidc",
        APP_ORIGIN: "https://elearning.example.test",
        API_ORIGIN: "https://elearning.example.test",
        REDIS_URL: "redis://127.0.0.1:59999",
        REDIS_PRIVATE_URL: "",
        REDISHOST: "",
        SSO_ISSUER: "https://sso.example.test",
        SSO_CLIENT_ID: "elearning-uay",
        SSO_AUDIENCE: "elearning-uay",
        SSO_REDIRECT_URI: "https://elearning.example.test/api/v1/auth/callback",
        SSO_WEBHOOK_SECRET: "fixture-only",
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
});
