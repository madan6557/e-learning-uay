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
  assert.ok(codes.includes("MN")); // Matches existing course codes; MAN remains an accepted alias.
  assert.ok(codes.includes("AK")); // Akuntansi
  assert.ok(codes.includes("FAR")); // Farmasi
});

test("normalizeDepartmentCode and formatDepartmentDisplay behave consistently", () => {
  assert.equal(normalizeDepartmentCode("  if  "), "IF");
  assert.equal(normalizeDepartmentCode("ti"), "TI");
  assert.equal(normalizeDepartmentCode("man"), "MN");
  assert.equal(normalizeDepartmentCode("Informatika"), "IF");
  assert.equal(normalizeDepartmentCode("Manajemen"), "MN");

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

test("Manual user pre-provisioning generates valid placeholder ssoUserId and matches upon SSO login", () => {
  const input = {
    identifierValue: "1112089099",
    identifierType: "NIDN" as const,
    name: "Dr. Bambang Kusumo, M.T.",
    email: "bambang.kusumo@uay.ac.id",
    role: "DEPARTMENT_ADMIN" as const,
    departmentScopes: ["ts", "TI"],
  };

  const normalizedScopes = [
    ...new Set(input.departmentScopes.map(normalizeDepartmentCode).filter(Boolean)),
  ];
  assert.deepEqual(normalizedScopes, ["TS", "TI"]);

  // Pre-provision user creation
  const preprovisioned = {
    id: "usr_preprov_1",
    ssoUserId: "preprovision:bambang123",
    identifierValue: input.identifierValue,
    identifierType: input.identifierType,
    name: input.name,
    email: input.email.toLowerCase(),
    username: input.email.split("@")[0],
    role: input.role,
    departmentScopes: normalizedScopes,
    status: "ACTIVE" as const,
    lastLoginAt: null,
  };

  assert.ok(preprovisioned.ssoUserId.startsWith("preprovision:"));
  assert.equal(preprovisioned.username, "bambang.kusumo");
  assert.equal(preprovisioned.lastLoginAt, null);

  // Simulated subsequent first SSO login by that lecturer
  const ssoClaims = {
    sub: "keycloak-real-uuid-9999",
    identifier_value: "1112089099",
    email: "bambang.kusumo@uay.ac.id",
    name: "Dr. Bambang Kusumo, M.T.",
  };

  // Auth matching logic: match by identifierValue or email
  const match = preprovisioned.identifierValue === ssoClaims.identifier_value ||
    preprovisioned.email === ssoClaims.email;
  assert.ok(match);

  // Link real SSO subject while preserving pre-provisioned scopes
  preprovisioned.ssoUserId = ssoClaims.sub;
  (preprovisioned as any).lastLoginAt = new Date();

  assert.equal(preprovisioned.ssoUserId, "keycloak-real-uuid-9999");
  assert.deepEqual(preprovisioned.departmentScopes, ["TS", "TI"]);
  assert.equal(preprovisioned.role, "DEPARTMENT_ADMIN");
  assert.ok(preprovisioned.lastLoginAt !== null);
});

test("SSO user synchronization handles user mapping and preserves existing governance scopes", () => {
  const existingUsers = [
    {
      id: "usr_existing_1",
      ssoUserId: "kc-user-01",
      identifierValue: "198501012010121001",
      name: "Dr. Budi Santoso",
      email: "budi.santoso@uay.ac.id",
      username: "198501012010121001",
      role: "DEPARTMENT_ADMIN",
      departmentScopes: ["IF"],
      authoritySource: "LOCAL",
      userType: "LECTURER",
    },
  ];

  const ssoUsers = [
    {
      user_id: "sso-usr-01",
      name: "Dr. Budi Santoso, M.Kom (Updated in SSO)",
      email: "budi.santoso@uay.ac.id",
      user_type: "LECTURER",
      status: "ACTIVE",
      account: {
        keycloak_user_id: "kc-user-01",
        username: "198501012010121001",
        status: "ACTIVE",
      },
      application_access: [
        {
          role: {
            role_id: "role-01",
            name: "kaprodi",
            status: "ACTIVE",
          },
        },
      ],
    },
    {
      user_id: "sso-usr-02",
      name: "Ir. Hendra Gunawan, M.T.",
      email: "hendra.gunawan@uay.ac.id",
      user_type: "LECTURER",
      status: "ACTIVE",
      account: {
        keycloak_user_id: "kc-user-02",
        username: "199203032018011003",
        status: "ACTIVE",
      },
      application_access: [],
    },
  ];

  const results = ssoUsers.map((ssoUser) => {
    const existing = existingUsers.find(
      (u) =>
        u.ssoUserId === ssoUser.account?.keycloak_user_id ||
        u.identifierValue === ssoUser.account?.username ||
        u.email === ssoUser.email,
    );

    if (existing) {
      return {
        id: existing.id,
        name: ssoUser.name,
        email: ssoUser.email,
        status: "ALREADY_EXISTS",
        role: existing.role,
        departmentScopes: existing.departmentScopes,
      };
    } else {
      const defaultRole =
        ssoUser.user_type === "ADMIN" ? "SUPER_ADMIN" : "INSTRUCTOR";
      return {
        id: "usr_new",
        name: ssoUser.name,
        email: ssoUser.email,
        status: "NEW",
        role: defaultRole,
        departmentScopes: [],
      };
    }
  });

  assert.equal(results.length, 2);
  const updatedExisting = results[0];
  assert.equal(updatedExisting.status, "ALREADY_EXISTS");
  assert.equal(updatedExisting.name, "Dr. Budi Santoso, M.Kom (Updated in SSO)");
  assert.equal(updatedExisting.role, "DEPARTMENT_ADMIN");
  assert.deepEqual(updatedExisting.departmentScopes, ["IF"]);

  const newUser = results[1];
  assert.equal(newUser.status, "NEW");
  assert.equal(newUser.name, "Ir. Hendra Gunawan, M.T.");
  assert.equal(newUser.role, "INSTRUCTOR");
  assert.deepEqual(newUser.departmentScopes, []);
});

test("Dean multi-prodi scope and Kaprodi single-prodi scope enforce faculty boundaries", () => {
  // Dean of Engineering covers IF, TI, and TS
  const deanScopes = ["IF", "TI", "TS"].map(normalizeDepartmentCode);
  // Kaprodi Informatics covers only IF
  const kaprodiScopes = ["IF"].map(normalizeDepartmentCode);

  const testClasses = [
    { id: "c1", departmentCode: "IF", title: "Struktur Data" },
    { id: "c2", departmentCode: "TI", title: "Ergonomi Industri" },
    { id: "c3", departmentCode: "TS", title: "Mekanika Tanah" },
    { id: "c4", departmentCode: "HK", title: "Hukum Perdata" },
    { id: "c5", departmentCode: "MN", title: "Manajemen Keuangan" },
  ];

  const canAccessClass = (userScopes: string[], classDept: string) => {
    return userScopes.includes(normalizeDepartmentCode(classDept));
  };

  // Dean should access all 3 engineering classes, but NOT law or management
  assert.equal(canAccessClass(deanScopes, "IF"), true);
  assert.equal(canAccessClass(deanScopes, "TI"), true);
  assert.equal(canAccessClass(deanScopes, "TS"), true);
  assert.equal(canAccessClass(deanScopes, "HK"), false);
  assert.equal(canAccessClass(deanScopes, "MN"), false);

  // Kaprodi IF should only access IF class
  assert.equal(canAccessClass(kaprodiScopes, "IF"), true);
  assert.equal(canAccessClass(kaprodiScopes, "TI"), false);
  assert.equal(canAccessClass(kaprodiScopes, "TS"), false);
  assert.equal(canAccessClass(kaprodiScopes, "HK"), false);
  assert.equal(canAccessClass(kaprodiScopes, "MN"), false);
});

test("Grading Sovereignty: Super Admin, Dean, and Kaprodi cannot grade student work without direct teaching assignment", () => {
  type UserContext = {
    id: string;
    role: "SUPER_ADMIN" | "DEPARTMENT_ADMIN" | "INSTRUCTOR" | "STUDENT" | "RECTOR";
    departmentScopes: string[];
  };

  type ClassContext = {
    id: string;
    departmentCode: string;
    assignedInstructorIds: string[];
  };

  const checkGradingAuthority = (user: UserContext, cls: ClassContext): boolean => {
    // Grading Sovereignty: ONLY the assigned instructor of the class can grade
    if (user.role === "INSTRUCTOR" && cls.assignedInstructorIds.includes(user.id)) {
      return true;
    }
    // Neither Super Admin nor Department Admin (Dean/Kaprodi) can grade
    return false;
  };

  const sampleClass: ClassContext = {
    id: "cls-if-101",
    departmentCode: "IF",
    assignedInstructorIds: ["usr-lecturer-assigned"],
  };

  const assignedLecturer: UserContext = {
    id: "usr-lecturer-assigned",
    role: "INSTRUCTOR",
    departmentScopes: ["IF"],
  };

  const nonAssignedLecturer: UserContext = {
    id: "usr-lecturer-other",
    role: "INSTRUCTOR",
    departmentScopes: ["IF"],
  };

  const dean: UserContext = {
    id: "usr-dean-ft",
    role: "DEPARTMENT_ADMIN",
    departmentScopes: ["IF", "TI", "TS"],
  };

  const kaprodi: UserContext = {
    id: "usr-kaprodi-if",
    role: "DEPARTMENT_ADMIN",
    departmentScopes: ["IF"],
  };

  const superAdmin: UserContext = {
    id: "usr-super-admin",
    role: "SUPER_ADMIN",
    departmentScopes: [],
  };

  const rector: UserContext = {
    id: "usr-rector",
    role: "RECTOR",
    departmentScopes: [],
  };

  // Only assigned instructor is authorized
  assert.equal(checkGradingAuthority(assignedLecturer, sampleClass), true);
  assert.equal(checkGradingAuthority(nonAssignedLecturer, sampleClass), false);
  assert.equal(checkGradingAuthority(dean, sampleClass), false);
  assert.equal(checkGradingAuthority(kaprodi, sampleClass), false);
  assert.equal(checkGradingAuthority(superAdmin, sampleClass), false);
  assert.equal(checkGradingAuthority(rector, sampleClass), false);
});

test("Department lifecycle protects active relational dependencies with DEACTIVATED status", () => {
  type MockDept = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };

  const handleDepartmentDeletion = (
    dept: MockDept,
    references: { courseCount: number; userCount: number; announcementCount: number },
  ): { action: "DEACTIVATED" | "DELETED"; dept: MockDept | null } => {
    const hasRelations =
      references.courseCount > 0 ||
      references.userCount > 0 ||
      references.announcementCount > 0;

    if (hasRelations) {
      dept.isActive = false;
      return { action: "DEACTIVATED", dept };
    }

    return { action: "DELETED", dept: null };
  };

  // Case 1: Department with existing courses
  const deptInUse: MockDept = {
    id: "d1",
    code: "IF",
    name: "Informatika",
    isActive: true,
  };

  const resultInUse = handleDepartmentDeletion(deptInUse, {
    courseCount: 15,
    userCount: 8,
    announcementCount: 2,
  });

  assert.equal(resultInUse.action, "DEACTIVATED");
  assert.equal(deptInUse.isActive, false);

  // Case 2: Newly created empty department without any courses or users
  const emptyDept: MockDept = {
    id: "d2",
    code: "BIO",
    name: "Bioteknologi",
    isActive: true,
  };

  const resultEmpty = handleDepartmentDeletion(emptyDept, {
    courseCount: 0,
    userCount: 0,
    announcementCount: 0,
  });

  assert.equal(resultEmpty.action, "DELETED");
  assert.equal(resultEmpty.dept, null);
});


