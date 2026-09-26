import test from "node:test";
import assert from "node:assert/strict";
import { identityClaims } from "../packages/shared/src/sso.js";

const base = {
  sub: "00000000-0000-4000-8000-000000000001",
  name: "Contoh Pengguna",
  email: "contoh@example.test",
  identifier_value: "202600001",
};

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
