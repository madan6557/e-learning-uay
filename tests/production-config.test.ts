import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  NODE_ENV: "production",
  DEMO_MODE: "false",
  AUTH_MODE: "oidc",
  APP_ORIGIN: "https://elearning.example.test",
  API_ORIGIN: "https://elearning.example.test",
  DATABASE_URL:
    "postgresql://uay:uay_local_only@127.0.0.1:55432/elearning_test?schema=public",
  REDIS_URL: "redis://127.0.0.1:59999",
  REDIS_PRIVATE_URL: "",
  REDISHOST: "",
  SSO_ISSUER: "https://sso.example.test",
  SSO_CLIENT_ID: "elearning-uay",
  SSO_AUDIENCE: "elearning-uay",
  SSO_REDIRECT_URI: "https://elearning.example.test/api/v1/auth/callback",
  SSO_WEBHOOK_SECRET: "fixture-only",
  SSO_ACCOUNT_URL: "",
  FILE_SERVICE_TYPE: "legacy",
  FILE_SERVICE_URL: "https://files.example.test",
  FILE_SERVICE_KEY: "fixture-only",
  UAY_FILE_SERVICE_URL: "",
  UAY_FILE_SERVICE_API_KEY: "",
  FILE_ALLOWED_ORIGINS: "https://files.example.test",
};
const run = (script: string, overrides = {}) =>
  spawnSync(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "-e", script],
    {
      env: { ...env, ...overrides },
      encoding: "utf8",
      windowsHide: true,
      timeout: 15000,
    },
  );
test("campus production still requires OIDC and valid File Service configuration", () => {
  for (const overrides of [
    { AUTH_MODE: "development" },
    { SSO_ISSUER: "" },
    { FILE_SERVICE_KEY: "" },
    { FILE_SERVICE_URL: "http://file-service.uay.ac.id.evil.example" },
  ]) {
    const result = run("await import('./apps/api/src/core.ts')", overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Production configuration check failed/);
  }
});
test("production grace accepts missing Redis and revocation secret without enabling demo mode", () => {
  const result = run(
    `
    import assert from 'node:assert/strict';
    const {cache, redis, db, isDemo, config} = await import('./apps/api/src/core.ts');
    assert.equal(redis, null);
    assert.equal(isDemo, false);
    assert.equal(config.authMode, 'oidc');
    await cache.set('session:test', 'session', 10);
    assert.equal(await cache.get('session:test'), 'session');
    await cache.del('session:test');
    assert.equal(await cache.get('session:test'), null);
    await db.$disconnect();
    console.log('grace-verified');
  `,
    { REDIS_URL: "", SSO_WEBHOOK_SECRET: "" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /grace-verified/);
  assert.match(result.stderr, /SSO_WEBHOOK_SECRET.*grace aktif/);
});

test("Redis outage preserves grace for sessions, single-use state and rate limiting", () => {
  const result = run(`
    import assert from 'node:assert/strict';
    const {cache, redis, db} = await import('./apps/api/src/core.ts');
    redis.disconnect();
    await cache.set('session:test', 'session', 10);
    assert.equal(await cache.get('session:test'), 'session');
    await cache.del('session:test');
    assert.equal(await cache.get('session:test'), null);
    await cache.set('oidc:test', 'state', 10);
    assert.equal(await cache.take('oidc:test'), 'state');
    assert.equal(await cache.take('oidc:test'), null);
    assert.equal(await cache.rate('auth:test', 1, 10), true);
    assert.equal(await cache.rate('auth:test', 1, 10), false);
    await db.$disconnect();
    console.log('outage-grace-verified');
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /outage-grace-verified/);
});
