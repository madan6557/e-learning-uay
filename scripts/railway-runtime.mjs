import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {}

const demo = process.env.DEMO_MODE === "true";
if (!demo) {
  const api = spawn(process.execPath, ["apps/api/dist/apps/api/src/index.js"], {
    stdio: "inherit",
    env: process.env,
  });
  api.on("exit", (code) => process.exit(code ?? 1));
} else {
  const appOrigin = (process.env.APP_ORIGIN ?? "").replace(/\/$/, "");
  const apiOrigin = (process.env.API_ORIGIN ?? appOrigin).replace(/\/$/, "");
  const callbackUri = `${appOrigin}${
    apiOrigin === appOrigin ? "/api/v1/auth/callback" : "/auth/callback"
  }`;
  if (!appOrigin.startsWith("https://") || !apiOrigin.startsWith("https://"))
    throw new Error("Hosted demo requires HTTPS APP_ORIGIN and API_ORIGIN.");

  const ssoPort = Number(process.env.DEMO_SSO_PORT ?? 4402);
  const filePort = Number(process.env.DEMO_FILE_PORT ?? 4403);
  const fileKey = randomBytes(32).toString("base64url");
  Object.assign(process.env, {
    AUTH_MODE: "oidc",
    // The browser returns to APP_ORIGIN through the Vercel API proxy. The
    // fixture itself is public from Railway so Vercel never has to proxy it.
    SSO_ISSUER: `${apiOrigin}/demo-sso`,
    SSO_CLIENT_ID: "elearning-uay-demo",
    SSO_AUDIENCE: "elearning-uay-demo",
    SSO_REDIRECT_URI: callbackUri,
    FILE_SERVICE_URL: `http://127.0.0.1:${filePort}`,
    FILE_SERVICE_KEY: fileKey,
    FILE_ALLOWED_ORIGINS: appOrigin,
    DEMO_INTERNAL_SSO_URL: `http://127.0.0.1:${ssoPort}`,
    DEMO_INTERNAL_FILE_URL: `http://127.0.0.1:${filePort}`,
  });

  const fixtureEnv = {
    ...process.env,
    NODE_ENV: "development",
    APP_ORIGIN: appOrigin,
    SSO_MOCK_PORT: String(ssoPort),
    SSO_PUBLIC_ISSUER: `${apiOrigin}/demo-sso`,
    SSO_REDIRECT_URI: callbackUri,
    FILE_SERVICE_PORT: String(filePort),
    FILE_PUBLIC_ORIGIN: `${apiOrigin}/demo-files`,
    FILE_SERVICE_DATA_DIRECTORY: "/tmp/uay-demo-files",
  };
  const start = (script) =>
    spawn(process.execPath, [script], { stdio: "inherit", env: fixtureEnv });
  const sso = start("scripts/oidc-fixture.mjs");
  const files = start("scripts/file-service.mjs");
  const fixtures = [sso, files];
  const waitFor = async (url) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        if ((await fetch(url)).ok) return;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error(`Demo fixture did not start: ${url}`);
  };
  await Promise.all([
    waitFor(`http://127.0.0.1:${ssoPort}/.well-known/openid-configuration`),
    waitFor(`http://127.0.0.1:${filePort}/health`),
  ]);
  const api = spawn(process.execPath, ["apps/api/dist/apps/api/src/index.js"], {
    stdio: "inherit",
    env: process.env,
  });
  let stopping = false;
  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    api.kill("SIGTERM");
    for (const child of fixtures) child.kill("SIGTERM");
    process.exitCode = code;
  };
  api.on("exit", (code) => stop(code ?? 1));
  for (const child of fixtures)
    child.on("exit", (code) => {
      if (!stopping) stop(code ?? 1);
    });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
}
