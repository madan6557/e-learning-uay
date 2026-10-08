import test from "node:test";
import assert from "node:assert/strict";
import { identityClaims, normalizeRole } from "../packages/shared/src/sso.js";

const base = {
  sub: "00000000-0000-4000-8000-000000000001",
  name: "Contoh Pengguna",
  email: "contoh@example.test",
  identifier_value: "202600001",
};

test("rector identity is a separate read-only role, including Indonesian alias", () => {
  assert.equal(normalizeRole("rektor"), "RECTOR");
  const rector = identityClaims.parse({ ...base, roles: ["RECTOR"] });
  assert.equal(rector.role, "RECTOR");
  assert.equal(rector.userType, "STAFF");
  assert.equal(
    identityClaims.parse({ ...base, roles: ["INSTRUCTOR", "RECTOR"] }).role,
    "RECTOR",
  );
  assert.equal(
    identityClaims.parse({ ...base, roles: ["DEPARTMENT_ADMIN", "RECTOR"] })
      .role,
    "RECTOR",
  );
  assert.equal(
    identityClaims.parse({ ...base, roles: ["STAFF", "RECTOR"] }).role,
    "RECTOR",
  );
  assert.equal(
    identityClaims.parse({ ...base, roles: ["RECTOR", "SUPER_ADMIN"] }).role,
    "SUPER_ADMIN",
  );
});

test("SSO roles take precedence over the legacy role claim", () => {
  assert.equal(
    identityClaims.parse({
      ...base,
      roles: ["STUDENT"],
      role: "SUPER_ADMIN",
    }).role,
    "STUDENT",
  );
  assert.equal(
    identityClaims.parse({
      ...base,
      roles: ["DOSEN", "ADMIN_PRODI"],
      role: "STUDENT",
    }).role,
    "DEPARTMENT_ADMIN",
  );
  assert.equal(
    identityClaims.safeParse({ ...base, roles: [], role: "SUPER_ADMIN" })
      .success,
    false,
  );
  assert.equal(
    identityClaims.parse({ ...base, role: "STUDENT" }).role,
    "STUDENT",
  );
});

test("SSO identity resolves preferred_username as academic identifier when identifier_value is absent", () => {
  const withoutIdentifier = {
    sub: "00000000-0000-4000-8000-000000000002",
    name: "Mahasiswa UAY",
    email: "mahasiswa@uay.ac.id",
    preferred_username: "231001001",
    roles: ["STUDENT"],
  };
  const resolved = identityClaims.parse(withoutIdentifier);
  assert.equal(resolved.identifierValue, "231001001");
  assert.equal(resolved.role, "STUDENT");
  assert.equal(resolved.identifierType, "NIM");
});

test("clearAllAuthCookies clears all session and oidc cookies across paths", async () => {
  const { clearAllAuthCookies } = await import("../apps/api/src/auth.js");
  const cleared: { name: string; options: any }[] = [];
  const mockRes: any = {
    clearCookie(name: string, options: any) {
      cleared.push({ name, options });
    },
  };
  clearAllAuthCookies(mockRes);
  const clearedNames = cleared.map((c) => c.name);
  assert.ok(clearedNames.includes("__Host-uay-session"));
  assert.ok(clearedNames.includes("uay-session"));
  assert.ok(clearedNames.includes("uay-oidc-state"));
  assert.ok(clearedNames.includes("uay-oidc-payload"));
});

test("getEffectiveRedirectUri extracts dynamic host or falls back", async () => {
  const { getEffectiveRedirectUri } = await import("../apps/api/src/auth.js");
  const mockReq: any = {
    headers: {
      "x-forwarded-host": "e-learning.uay.ac.id",
      "x-forwarded-proto": "https",
    },
    secure: true,
  };
  const uri = getEffectiveRedirectUri(mockReq);
  assert.equal(uri, "https://e-learning.uay.ac.id/api/v1/auth/callback");

  const fallbackUri = getEffectiveRedirectUri();
  assert.ok(fallbackUri.includes("/api/v1/auth/callback"));
});

test("backend authorization retains its callback and rejects untrusted redirect hosts", async () => {
  const { getEffectiveRedirectUri, getEffectiveOrigin } =
    await import("../apps/api/src/auth.js");
  const { config } = await import("../apps/api/src/core.js");
  const approved = config.allowedOrigins.find((origin) =>
    origin.startsWith("http://127.0.0.1:"),
  )!;
  assert.ok(approved);
  const request: any = {
    headers: { host: new URL(approved).host },
    secure: false,
  };
  assert.equal(
    getEffectiveRedirectUri(request),
    approved + "/api/v1/auth/callback",
  );
  const hostile: any = {
    headers: {
      origin: "https://evil.example",
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "https",
    },
  };
  assert.equal(getEffectiveRedirectUri(hostile), config.redirectUri);
  assert.equal(getEffectiveOrigin(hostile), config.origin);
});

test("SSO identity accepts non-UUID sub and synthesizes fallback email", () => {
  const minimalClaims = {
    sub: "uay-sub-12345",
    preferred_username: "user_test",
    roles: ["STUDENT"],
  };
  const resolved = identityClaims.parse(minimalClaims);
  assert.equal(resolved.ssoUserId, "uay-sub-12345");
  assert.equal(resolved.email, "user_test@uay.ac.id");
  assert.equal(resolved.name, "user_test");
  assert.equal(resolved.identifierValue, "user_test");
  assert.equal(resolved.role, "STUDENT");
});

test("normalizeRole recognizes various Keycloak super admin aliases and group formats", () => {
  const adminAliases = [
    "super_admin",
    "Super Admin",
    "/Super Admin",
    "superadmin",
    "super-admin",
    "admin",
    "Admin",
    "/admin",
    "administrator",
    "realm-admin",
    "admin-elearning",
    "elearning-admin",
    "sysadmin",
  ];
  for (const alias of adminAliases) {
    assert.equal(
      normalizeRole(alias),
      "SUPER_ADMIN",
      `Failed for alias: ${alias}`,
    );
  }
});
