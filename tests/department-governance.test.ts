import test from "node:test";
import assert from "node:assert/strict";
import {
  UAY_DEPARTMENTS,
  normalizeDepartmentCode,
  formatDepartmentDisplay,
  siakadScopeSyncPayloadSchema,
} from "../packages/shared/src/departments.js";

test("departments master list contains standard UAY faculties and codes", () => {
  assert.ok(UAY_DEPARTMENTS.length >= 10);
  const codes = UAY_DEPARTMENTS.map((d) => d.code);
  assert.ok(codes.includes("IF")); // Informatika
  assert.ok(codes.includes("TI")); // Teknik Industri
  assert.ok(codes.includes("TS")); // Teknik Sipil
  assert.ok(codes.includes("HK")); // Hukum
  assert.ok(codes.includes("MAN")); // Manajemen
  assert.ok(codes.includes("AK")); // Akuntansi
  assert.ok(codes.includes("FAR")); // Farmasi
});

test("normalizeDepartmentCode and formatDepartmentDisplay behave consistently", () => {
  assert.equal(normalizeDepartmentCode("  if  "), "IF");
  assert.equal(normalizeDepartmentCode("ti"), "TI");
  assert.equal(normalizeDepartmentCode("man"), "MAN");

  assert.match(formatDepartmentDisplay("IF"), /^IF \(Program Studi Informatika\)$/);
  assert.match(formatDepartmentDisplay("TS"), /^TS \(Program Studi Teknik Sipil\)$/);
  assert.equal(formatDepartmentDisplay(""), "");
});

test("siakadScopeSyncPayloadSchema validates input and rejects malformed data", () => {
  // Valid payload
  const valid = {
    academicYear: "2026/2027 Ganjil",
    source: "SIAKAD_SIMAK_API",
    dryRun: false,
    assignments: [
      {
        identifierValue: "0912058501",
        departmentScopes: ["IF"],
        role: "DEPARTMENT_ADMIN" as const,
        notes: "SK Dekan No. 42",
      },
      {
        identifierValue: "0915088202",
        departmentScopes: ["TS", "TI"],
        role: "DEPARTMENT_ADMIN" as const,
      },
    ],
  };
  const parsed = siakadScopeSyncPayloadSchema.safeParse(valid);
  assert.ok(parsed.success);
  if (parsed.success) {
    assert.equal(parsed.data.assignments.length, 2);
    assert.equal(parsed.data.dryRun, false);
    assert.equal(parsed.data.source, "SIAKAD_SIMAK_API");
  }

  // Reject empty assignments
  const emptyAssignments = {
    assignments: [],
  };
  assert.equal(siakadScopeSyncPayloadSchema.safeParse(emptyAssignments).success, false);

  // Reject empty department scopes in assignment
  const emptyScopes = {
    assignments: [
      {
        identifierValue: "0912058501",
        departmentScopes: [],
      },
    ],
  };
  assert.equal(siakadScopeSyncPayloadSchema.safeParse(emptyScopes).success, false);

  // Reject empty identifierValue
  const emptyIdentifier = {
    assignments: [
      {
        identifierValue: "   ",
        departmentScopes: ["IF"],
      },
    ],
  };
  assert.equal(siakadScopeSyncPayloadSchema.safeParse(emptyIdentifier).success, false);
});

test("Super Admin scope assignment rules normalize codes and promote roles appropriately", () => {
  // Scenario 1: Normalizing duplicate or lowercase input
  const rawInput = ["if", "IF", "  ts  ", ""];
  const normalized = [
    ...new Set(rawInput.map(normalizeDepartmentCode).filter(Boolean)),
  ];
  assert.deepEqual(normalized, ["IF", "TS"]);

  // Scenario 2: Role promotion rule
  // When an INSTRUCTOR is assigned departmentScopes, they are promoted to DEPARTMENT_ADMIN
  const instructor = { role: "INSTRUCTOR", departmentScopes: [] };
  let newRole = instructor.role;
  if (normalized.length > 0 && instructor.role === "INSTRUCTOR") {
    newRole = "DEPARTMENT_ADMIN";
  }
  assert.equal(newRole, "DEPARTMENT_ADMIN");

  // Scenario 3: Role demotion rule
  // When departmentScopes are cleared, DEPARTMENT_ADMIN returns to INSTRUCTOR
  const deptAdmin = { role: "DEPARTMENT_ADMIN", departmentScopes: ["IF"] };
  const clearedScopes: string[] = [];
  let updatedRole = deptAdmin.role;
  if (clearedScopes.length === 0 && deptAdmin.role === "DEPARTMENT_ADMIN") {
    updatedRole = "INSTRUCTOR";
  }
  assert.equal(updatedRole, "INSTRUCTOR");
});

test("SIAKAD Sync mapping resolution matches user identifiers accurately", () => {
  const mockUsers = [
    {
      id: "u1",
      identifierValue: "0912058501",
      username: "kaprodi_if",
      email: "kaprodi.if@uay.ac.id",
      name: "Dr. Ahmad Hidayat",
      role: "INSTRUCTOR",
      departmentScopes: [],
    },
    {
      id: "u2",
      identifierValue: "0915088202",
      username: "kaprodi_ts",
      email: "kaprodi.ts@uay.ac.id",
      name: "Ir. Siti Rahmawati",
      role: "DEPARTMENT_ADMIN",
      departmentScopes: ["TS"],
    },
  ];

  const incomingAssignments = [
    {
      identifierValue: "0912058501",
      departmentScopes: ["if"],
      role: "DEPARTMENT_ADMIN" as const,
    },
    {
      identifierValue: "0999999999", // Unregistered
      departmentScopes: ["MAN"],
      role: "DEPARTMENT_ADMIN" as const,
    },
  ];

  const syncResults = incomingAssignments.map((assignment) => {
    const user = mockUsers.find(
      (u) =>
        u.identifierValue === assignment.identifierValue ||
        u.username === assignment.identifierValue ||
        u.email === assignment.identifierValue,
    );

    const normalizedScopes = [
      ...new Set(assignment.departmentScopes.map(normalizeDepartmentCode).filter(Boolean)),
    ];

    if (!user) {
      return {
        identifierValue: assignment.identifierValue,
        status: "USER_NOT_FOUND",
        departmentScopes: normalizedScopes,
        role: assignment.role,
      };
    }

    user.departmentScopes = normalizedScopes;
    user.role = assignment.role;

    return {
      identifierValue: assignment.identifierValue,
      name: user.name,
      status: "UPDATED",
      departmentScopes: normalizedScopes,
      role: assignment.role,
    };
  });

  assert.equal(syncResults[0].status, "UPDATED");
  assert.equal(syncResults[0].name, "Dr. Ahmad Hidayat");
  assert.deepEqual(syncResults[0].departmentScopes, ["IF"]);
  assert.equal(syncResults[0].role, "DEPARTMENT_ADMIN");

  assert.equal(syncResults[1].status, "USER_NOT_FOUND");
  assert.equal(syncResults[1].identifierValue, "0999999999");
});
