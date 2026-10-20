import test from "node:test";
import assert from "node:assert/strict";
import {
  identityClaims,
  normalizeRole,
  extractSsoUserData,
} from "../packages/shared/src/sso.js";

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

test("SSO identity resolves official_identifier and adjusts identifier type based on user_type", () => {
  // 1. Staff / Admin with official_identifier "NIP 2111016210015"
  const staff = identityClaims.parse({
    sub: "00000000-0000-4000-8000-000000000003",
    name: "Muhammad Rizky",
    email: "rizky@staff.uay.ac.id",
    official_identifier: "NIP 2111016210015",
    user_type: "STAFF",
    roles: ["SUPER_ADMIN"],
  });
  assert.equal(staff.identifierValue, "2111016210015");
  assert.equal(staff.identifierType, "NIP");
  assert.equal(staff.userType, "STAFF");

  // 2. Lecturer with official_identifier "NIDN 0415037801"
  const dosen = identityClaims.parse({
    sub: "00000000-0000-4000-8000-000000000004",
    name: "Dr. Hendra",
    email: "hendra@dosen.uay.ac.id",
    official_identifier: "NIDN 0415037801",
    user_type: "LECTURER",
    roles: ["INSTRUCTOR"],
  });
  assert.equal(dosen.identifierValue, "0415037801");
  assert.equal(dosen.identifierType, "NIDN");
  assert.equal(dosen.userType, "LECTURER");

  // 3. Username fallback with email domain "2111016210015@staff.uay.ac.id"
  const fallbackStaff = identityClaims.parse({
    sub: "00000000-0000-4000-8000-000000000005",
    name: "Staff UAY",
    email: "staff@example.test",
    preferred_username: "2111016210015@staff.uay.ac.id",
    roles: ["DEPARTMENT_ADMIN"],
  });
  assert.equal(fallbackStaff.identifierValue, "2111016210015");
  assert.equal(fallbackStaff.identifierType, "NIP");
  assert.equal(fallbackStaff.userType, "STAFF");
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

test("normalizeRole and permissions recognize ASSISTANT role and aliases", async () => {
  const { hasPermission, canManageClassContent, canGradeClassWork } = await import(
    "../packages/shared/src/permissions.js"
  );

  const assistantAliases = [
    "assistant",
    "Assistant",
    "ASISTEN",
    "asisten",
    "asdos",
    "Asdos",
    "ASDOS",
    "asisten_dosen",
    "asisten-dosen",
    "Asisten Dosen",
    "lab_assistant",
    "asisten_lab",
  ];

  for (const alias of assistantAliases) {
    assert.equal(
      normalizeRole(alias),
      "ASSISTANT",
      `Failed for alias: ${alias}`,
    );
  }

  const asst = identityClaims.parse({ ...base, roles: ["ASSISTANT"] });
  assert.equal(asst.role, "ASSISTANT");
  assert.equal(asst.userType, "STUDENT");

  // Capabilities
  assert.equal(hasPermission("ASSISTANT", "MANAGE_CLASS_CONTENT"), true);
  assert.equal(hasPermission("ASSISTANT", "GRADE_STUDENT_WORK"), true);
  assert.equal(hasPermission("ASSISTANT", "MANAGE_ALL_CLASSES"), false);
  assert.equal(hasPermission("ASSISTANT", "JOIN_CLASS_WITH_KEY"), true);

  // canManageClassContent and canGradeClassWork helpers
  const assigned = canManageClassContent(
    { role: "ASSISTANT", id: "user-123" },
    { courseDepartmentCode: "IF", instructorUserIds: ["user-123", "prof-456"] },
  );
  assert.equal(assigned, true);

  const unassigned = canManageClassContent(
    { role: "ASSISTANT", id: "user-999" },
    { courseDepartmentCode: "IF", instructorUserIds: ["user-123", "prof-456"] },
  );
  assert.equal(unassigned, false);

  assert.equal(
    canGradeClassWork({ role: "ASSISTANT", id: "user-123" }, true),
    true,
  );
  assert.equal(
    canGradeClassWork({ role: "ASSISTANT", id: "user-123" }, false),
    false,
  );
});

test("extractSsoUserData extracts official identifiers and maps user types correctly", () => {
  // Case 1: Student with official_identifier from SIAKAD/SSO
  const studentRaw = {
    user_id: 105,
    name: "Ahmad Dahlan",
    email: "ahmad.dahlan@uay.ac.id",
    username: "ahmad.dahlan",
    official_identifier: "231011001",
    user_type: "MAHASISWA",
  };
  const parsedStudent = extractSsoUserData(studentRaw);
  assert.equal(parsedStudent.identifierValue, "231011001");
  assert.equal(parsedStudent.identifierType, "NIM");
  assert.equal(parsedStudent.userType, "STUDENT");
  assert.equal(parsedStudent.name, "Ahmad Dahlan");
  assert.equal(parsedStudent.email, "ahmad.dahlan@uay.ac.id");

  // Case 2: Lecturer with NIDN in primary_identifier object
  const lecturerRaw = {
    id: "usr-lecturer-42",
    full_name: "Dr. Budi Santoso, M.Kom.",
    email: "budi.santoso@uay.ac.id",
    preferred_username: "budi.santoso",
    primary_identifier: {
      identifier_value: "0912058501",
      identifier_type: "NIDN",
    },
    user_type: "DOSEN",
  };
  const parsedLecturer = extractSsoUserData(lecturerRaw);
  assert.equal(parsedLecturer.identifierValue, "0912058501");
  assert.equal(parsedLecturer.identifierType, "NIDN");
  assert.equal(parsedLecturer.userType, "LECTURER");
  assert.equal(parsedLecturer.name, "Dr. Budi Santoso, M.Kom.");

  // Case 3: Staff with student_staff_number and tendik type
  const staffRaw = {
    user_id: "staff-99",
    name: "Siti Rahma",
    email: "siti.rahma@uay.ac.id",
    student_staff_number: "198501012010122001",
    user_type: "TENDIK",
  };
  const parsedStaff = extractSsoUserData(staffRaw);
  assert.equal(parsedStaff.identifierValue, "198501012010122001");
  assert.equal(parsedStaff.identifierType, "NIP");
  assert.equal(parsedStaff.userType, "STAFF");

  // Case 4: Fallback to username / email prefix when no explicit identifier is provided
  const fallbackRaw = {
    user_id: "usr-fallback",
    username: "mhs_baru",
    email: "mhs_baru@uay.ac.id",
    user_type: "STUDENT",
  };
  const parsedFallback = extractSsoUserData(fallbackRaw);
  assert.equal(parsedFallback.identifierValue, "mhs_baru");
  assert.equal(parsedFallback.identifierType, "NIM");
  assert.equal(parsedFallback.userType, "STUDENT");
});

test("getAuthErrorMessage and id.json provide clear notice for NO_APPLICATION_ACCESS", async () => {
  const { getAuthErrorMessage } = await import(
    "../apps/web/src/pages/Landing.js"
  );
  const idLabels = await import("../packages/shared/src/id.json", {
    with: { type: "json" },
  });

  const expectedMsg =
    "Akun SSO Anda belum memiliki izin akses ke layanan E-Learning UAY. Silakan hubungi Administrator atau Helpdesk IT UAY untuk aktivasi akses akun Anda.";
  assert.equal(getAuthErrorMessage("NO_APPLICATION_ACCESS"), expectedMsg);
  assert.equal(idLabels.default.errors.NO_APPLICATION_ACCESS, expectedMsg);
});

test("syncUser denies SSO login when user has no explicit E-Learning role or pre-provisioned grant", async () => {
  const { syncUser } = await import("../apps/api/src/auth.js");
  const { db } = await import("../apps/api/src/core.js");
  const originalFindMany = db.user.findMany;
  db.user.findMany = (async () => []) as any;

  try {
    const randomSub = "unauthorized-sso-" + Date.now();
    const unauthorizedClaims = {
      sub: randomSub,
      preferred_username: "user_tanpa_izin",
      email: "user_tanpa_izin@mhs.uay.ac.id",
      name: "User Tanpa Izin",
      realm_access: {
        roles: ["default-roles-uay", "offline_access", "uma_authorization"],
      },
      resource_access: {
        account: {
          roles: ["manage-account", "view-profile"],
        },
      },
    };

    await assert.rejects(
      async () => {
        await syncUser(unauthorizedClaims as any, true);
      },
      (err: any) => {
        assert.equal(err.status, 403);
        assert.equal(err.code, "NO_APPLICATION_ACCESS");
        return true;
      },
    );
  } finally {
    db.user.findMany = originalFindMany;
  }
});

test("syncUser allows SSO login when user has explicit E-Learning role in client resource_access or realm_access", async () => {
  const { syncUser } = await import("../apps/api/src/auth.js");
  const { db } = await import("../apps/api/src/core.js");
  const originalFindMany = db.user.findMany;
  const originalTransaction = db.$transaction;

  const authorizedSub = "authorized-sso-" + Date.now();
  let createdUser: any = null;

  db.user.findMany = (async () => []) as any;
  db.$transaction = (async (run: any) => {
    const txMock: any = {
      user: {
        create: async ({ data }: any) => {
          createdUser = { id: "test-user-id", ...data };
          return createdUser;
        },
      },
      auditLog: {
        create: async () => {},
      },
    };
    return run(txMock);
  }) as any;

  try {
    const authorizedClaims = {
      sub: authorizedSub,
      preferred_username: "mhs_berizin_" + Date.now(),
      email: `mhs_berizin_${Date.now()}@mhs.uay.ac.id`,
      name: "Mahasiswa Berizin",
      resource_access: {
        "elearning-uay": {
          roles: ["student"],
        },
      },
    };

    const user = await syncUser(authorizedClaims as any, true);
    assert.ok(user);
    assert.equal(user.ssoUserId, authorizedSub);
    assert.equal(user.role, "STUDENT");
  } finally {
    db.user.findMany = originalFindMany;
    db.$transaction = originalTransaction;
  }
});

test("normalizeRole recognizes Spring and client prefixes like ROLE_ and ELEARNING_", () => {
  assert.equal(normalizeRole("ROLE_STUDENT"), "STUDENT");
  assert.equal(normalizeRole("ROLE_INSTRUCTOR"), "INSTRUCTOR");
  assert.equal(normalizeRole("ROLE_ADMIN"), "SUPER_ADMIN");
  assert.equal(normalizeRole("elearning_student"), "STUDENT");
  assert.equal(normalizeRole("elearning-student"), "STUDENT");
  assert.equal(normalizeRole("elearning_instructor"), "INSTRUCTOR");
  assert.equal(normalizeRole("elearning_dosen"), "INSTRUCTOR");
  assert.equal(normalizeRole("LMS_DOSEN"), "INSTRUCTOR");
  assert.equal(normalizeRole("LMS_MAHASISWA"), "STUDENT");
});

test("syncUser allows SSO login when user has explicit E-Learning role in application_access", async () => {
  const { syncUser } = await import("../apps/api/src/auth.js");
  const { db } = await import("../apps/api/src/core.js");
  const originalFindMany = db.user.findMany;
  const originalTransaction = db.$transaction;

  const appAccessSub = "app-access-sub-" + Date.now();
  let createdUser: any = null;

  db.user.findMany = (async () => []) as any;
  db.$transaction = (async (run: any) => {
    const txMock: any = {
      user: {
        create: async ({ data }: any) => {
          createdUser = { id: "test-user-id", ...data };
          return createdUser;
        },
      },
      auditLog: {
        create: async () => {},
      },
    };
    return run(txMock);
  }) as any;

  try {
    const appAccessClaims = {
      sub: appAccessSub,
      preferred_username: "dosen_sso_" + Date.now(),
      email: `dosen_sso_${Date.now()}@dosen.uay.ac.id`,
      name: "Dosen SSO Berizin",
      application_access: [
        {
          client_id: "elearning-uay",
          role: { name: "DOSEN" },
          is_active: true,
        },
      ],
    };

    const user = await syncUser(appAccessClaims as any, true);
    assert.ok(user);
    assert.equal(user.ssoUserId, appAccessSub);
    assert.equal(user.role, "INSTRUCTOR");
  } finally {
    db.user.findMany = originalFindMany;
    db.$transaction = originalTransaction;
  }
});

test("syncUser preserves existing active users without false rejection even if token omits role", async () => {
  const { syncUser } = await import("../apps/api/src/auth.js");
  const { db } = await import("../apps/api/src/core.js");
  const originalFindMany = db.user.findMany;
  const originalTransaction = db.$transaction;

  const existingSub = "existing-active-user-" + Date.now();
  const mockExistingUser = {
    id: "existing-user-uuid",
    ssoUserId: existingSub,
    name: "Mahasiswa Terdaftar",
    username: "mhs_lama",
    email: "mhs_lama@mhs.uay.ac.id",
    identifierValue: "20240001",
    identifierType: "NIM",
    userType: "STUDENT",
    role: "STUDENT",
    authoritySource: "SSO",
    status: "ACTIVE",
    departmentScopes: [],
    lastLoginAt: new Date(),
    lastActiveAt: new Date(),
  };

  db.user.findMany = (async () => [mockExistingUser]) as any;
  db.$transaction = (async (run: any) => {
    const txMock: any = {
      user: {
        findUniqueOrThrow: async () => mockExistingUser,
        update: async ({ data }: any) => ({ ...mockExistingUser, ...data }),
      },
      auditLog: {
        create: async () => {},
      },
    };
    return run(txMock);
  }) as any;

  try {
    // Minimal token without explicit roles (e.g. only standard OIDC profile)
    const minimalTokenClaims = {
      sub: existingSub,
      preferred_username: "mhs_lama",
      email: "mhs_lama@mhs.uay.ac.id",
      name: "Mahasiswa Terdaftar",
    };

    const user = await syncUser(minimalTokenClaims as any, true);
    assert.ok(user);
    assert.equal(user.id, "existing-user-uuid");
    assert.equal(user.role, "STUDENT");
  } finally {
    db.user.findMany = originalFindMany;
    db.$transaction = originalTransaction;
  }
});

test("syncUser updates role, email, and departmentScopes when changes occur in SSO for authoritySource=SSO", async () => {
  const { syncUser } = await import("../apps/api/src/auth.js");
  const { db } = await import("../apps/api/src/core.js");
  const originalFindMany = db.user.findMany;
  const originalTransaction = db.$transaction;

  const existingSub = "sso-change-user-" + Date.now();
  const mockExistingUser = {
    id: "existing-user-uuid-2",
    ssoUserId: existingSub,
    name: "Dosen Awal",
    username: "dosen_awal",
    email: "dosen_lama@uay.ac.id",
    identifierValue: "198001012005011001",
    identifierType: "NIP",
    userType: "LECTURER",
    role: "INSTRUCTOR",
    authoritySource: "SSO",
    status: "ACTIVE",
    departmentScopes: ["IF"],
    lastLoginAt: new Date(),
    lastActiveAt: new Date(),
  };

  let updatedData: any = null;
  db.user.findMany = (async () => [mockExistingUser]) as any;
  db.$transaction = (async (run: any) => {
    const txMock: any = {
      user: {
        findUniqueOrThrow: async () => mockExistingUser,
        update: async ({ data }: any) => {
          updatedData = data;
          return { ...mockExistingUser, ...data };
        },
      },
      auditLog: {
        create: async () => {},
      },
    };
    return run(txMock);
  }) as any;

  try {
    const updatedTokenClaims = {
      sub: existingSub,
      preferred_username: "dosen_awal",
      name: "Dr. Dosen Baru",
      email: "dosen_baru@uay.ac.id",
      roles: ["DEPARTMENT_ADMIN"],
      department_scopes: ["IF", "SI"],
      user_type: "STAFF",
    };

    const user = await syncUser(updatedTokenClaims as any, true);
    assert.ok(user);
    assert.equal(updatedData.name, "Dr. Dosen Baru");
    assert.equal(updatedData.email, "dosen_baru@uay.ac.id");
    assert.equal(updatedData.role, "DEPARTMENT_ADMIN");
    assert.deepEqual(updatedData.departmentScopes, ["IF", "SI"]);
  } finally {
    db.user.findMany = originalFindMany;
    db.$transaction = originalTransaction;
  }
});

test("syncUser preserves local role when authoritySource is LOCAL even if SSO role differs", async () => {
  const { syncUser } = await import("../apps/api/src/auth.js");
  const { db } = await import("../apps/api/src/core.js");
  const originalFindMany = db.user.findMany;
  const originalTransaction = db.$transaction;

  const existingSub = "local-managed-user-" + Date.now();
  const mockLocalUser = {
    id: "local-user-uuid",
    ssoUserId: existingSub,
    name: "Admin Lokal",
    username: "admin_lokal",
    email: "admin_lokal@uay.ac.id",
    identifierValue: "198501012010011002",
    identifierType: "NIP",
    userType: "STAFF",
    role: "DEPARTMENT_ADMIN",
    authoritySource: "LOCAL",
    status: "ACTIVE",
    departmentScopes: ["IF"],
    lastLoginAt: new Date(),
    lastActiveAt: new Date(),
  };

  let updatedData: any = null;
  db.user.findMany = (async () => [mockLocalUser]) as any;
  db.$transaction = (async (run: any) => {
    const txMock: any = {
      user: {
        findUniqueOrThrow: async () => mockLocalUser,
        update: async ({ data }: any) => {
          updatedData = data;
          return { ...mockLocalUser, ...data };
        },
      },
      auditLog: {
        create: async () => {},
      },
    };
    return run(txMock);
  }) as any;

  try {
    const ssoClaims = {
      sub: existingSub,
      preferred_username: "admin_lokal",
      roles: ["INSTRUCTOR"],
      department_scopes: ["SI"],
    };

    const user = await syncUser(ssoClaims as any, true);
    assert.ok(user);
    assert.equal(updatedData.role, "DEPARTMENT_ADMIN");
    assert.deepEqual(updatedData.departmentScopes, ["IF"]);
  } finally {
    db.user.findMany = originalFindMany;
    db.$transaction = originalTransaction;
  }
});
