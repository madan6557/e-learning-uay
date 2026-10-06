import test from "node:test";
import assert from "node:assert/strict";
import { identityClaims, normalizeRole } from "../packages/shared/src/sso.js";

const base = {
  sub: "00000000-0000-4000-8000-000000000001",
  name: "Contoh Pengguna",
  email: "contoh@example.test",
  identifier_value: "202600001",
};

test('rector identity is a separate read-only role, including Indonesian alias',()=>{
  assert.equal(normalizeRole('rektor'),'RECTOR');
  const rector=identityClaims.parse({...base,roles:['RECTOR']});
  assert.equal(rector.role,'RECTOR');assert.equal(rector.userType,'STAFF');
  assert.equal(identityClaims.parse({...base,roles:['INSTRUCTOR','RECTOR']}).role,'RECTOR');
  assert.equal(identityClaims.parse({...base,roles:['RECTOR','SUPER_ADMIN']}).role,'SUPER_ADMIN');
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

