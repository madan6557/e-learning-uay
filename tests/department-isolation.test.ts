import test from "node:test";
import assert from "node:assert/strict";

type UserScope = {
  id: string;
  name: string;
  role: "SUPER_ADMIN" | "DEPARTMENT_ADMIN" | "INSTRUCTOR" | "STUDENT";
  departmentScopes: string[];
};

function filterUsersByScope(currentUser: UserScope, allUsers: UserScope[]): UserScope[] {
  if (currentUser.role === "SUPER_ADMIN") {
    return allUsers;
  }
  if (!currentUser.departmentScopes.length) {
    return [];
  }
  return allUsers.filter((u) =>
    u.departmentScopes.some((dept) => currentUser.departmentScopes.includes(dept)),
  );
}

test("Department Isolation: Department Admin only sees users within their department scope", () => {
  const users: UserScope[] = [
    { id: "1", name: "Mhs IF 1", role: "STUDENT", departmentScopes: ["IF"] },
    { id: "2", name: "Mhs IF 2", role: "STUDENT", departmentScopes: ["IF"] },
    { id: "3", name: "Mhs SI 1", role: "STUDENT", departmentScopes: ["SI"] },
    { id: "4", name: "Mhs Elektro", role: "STUDENT", departmentScopes: ["TE"] },
    { id: "5", name: "Dosen IF", role: "INSTRUCTOR", departmentScopes: ["IF"] },
  ];

  const adminIF: UserScope = {
    id: "adm-1",
    name: "Admin Prodi IF",
    role: "DEPARTMENT_ADMIN",
    departmentScopes: ["IF"],
  };

  const results = filterUsersByScope(adminIF, users);
  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((u) => u.name),
    ["Mhs IF 1", "Mhs IF 2", "Dosen IF"],
  );
  // SI and TE must never be exposed
  assert.ok(!results.some((u) => u.departmentScopes.includes("SI")));
  assert.ok(!results.some((u) => u.departmentScopes.includes("TE")));
});

test("Department Isolation: Multi-affiliation lecturer accesses multiple scoped departments", () => {
  const users: UserScope[] = [
    { id: "1", name: "Mhs IF", role: "STUDENT", departmentScopes: ["IF"] },
    { id: "2", name: "Mhs SI", role: "STUDENT", departmentScopes: ["SI"] },
    { id: "3", name: "Mhs Mesin", role: "STUDENT", departmentScopes: ["TM"] },
  ];

  const multiLecturer: UserScope = {
    id: "dos-1",
    name: "Dr. Dosen Multiprodi",
    role: "INSTRUCTOR",
    departmentScopes: ["IF", "SI"],
  };

  const visible = filterUsersByScope(multiLecturer, users);
  assert.equal(visible.length, 2);
  assert.ok(visible.some((u) => u.name === "Mhs IF"));
  assert.ok(visible.some((u) => u.name === "Mhs SI"));
  assert.ok(!visible.some((u) => u.name === "Mhs Mesin"));
});

test("Department Isolation: Super Admin has university-wide scope", () => {
  const users: UserScope[] = [
    { id: "1", name: "Mhs IF", role: "STUDENT", departmentScopes: ["IF"] },
    { id: "2", name: "Mhs SI", role: "STUDENT", departmentScopes: ["SI"] },
    { id: "3", name: "Mhs TE", role: "STUDENT", departmentScopes: ["TE"] },
  ];

  const superAdmin: UserScope = {
    id: "sa-1",
    name: "Super Admin UAY",
    role: "SUPER_ADMIN",
    departmentScopes: [],
  };

  const visible = filterUsersByScope(superAdmin, users);
  assert.equal(visible.length, 3);
});
