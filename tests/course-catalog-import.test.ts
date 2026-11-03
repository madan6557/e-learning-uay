import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../apps/web/src/Gradebook.js";
import { reviewCourseBatch } from "../apps/api/src/learning.js";

test("course catalog CSV parser correctly parses comma-separated course list with headers", () => {
  const csv = `kode,nama,sks,prodi,deskripsi,status
IF101,"Algoritma dan Pemrograman I",3,IF,"Dasar logika, percabangan, perulangan",PUBLISHED
IF102,Struktur Data,3,IF,Penyimpanan data majemuk,PUBLISHED
SI201,Sistem Informasi Manajemen,4,SI,Manajemen SI korporat,PUBLISHED`;

  const rows = parseCsv(csv);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], ["kode", "nama", "sks", "prodi", "deskripsi", "status"]);
  assert.equal(rows[1][0], "IF101");
  assert.equal(rows[1][1], "Algoritma dan Pemrograman I");
  assert.equal(rows[1][4], "Dasar logika, percabangan, perulangan");
  assert.equal(rows[2][0], "IF102");
  assert.equal(rows[3][0], "SI201");
  assert.equal(rows[3][2], "4");
});

test("course catalog parser gracefully handles English headers and whitespace", () => {
  const csv = `code,title,credits,departmentCode,description,status
  IF301 , Jaringan Komputer , 3 , IF , Protokol TCP/IP , PUBLISHED  `;

  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0].trim(), "IF301");
  assert.equal(rows[1][1].trim(), "Jaringan Komputer");
  assert.equal(rows[1][2].trim(), "3");
  assert.equal(rows[1][3].trim(), "IF");
});

test("reviewCourseBatch allows same course code across different departments (general courses)", async () => {
  const lookups: any[] = [];
  const mockTx = {
    course: {
      findUnique: async (args: any) => {
        lookups.push(args);
        return null;
      },
    },
  };
  const adminUser = {
    role: "SUPER_ADMIN",
    departmentScopes: ["*"],
  };
  const batch = {
    reason: "Test MKU across departments",
    rows: [
      {
        values: {
          code: "MKU101",
          title: "Pendidikan Pancasila",
          credits: 2,
          departmentCode: "IF",
          status: "PUBLISHED",
        },
      },
      {
        values: {
          code: "MKU101",
          title: "Pendidikan Pancasila",
          credits: 2,
          departmentCode: "SI",
          status: "PUBLISHED",
        },
      },
    ],
  };

  const reviewed = await reviewCourseBatch(mockTx, adminUser, batch);
  assert.equal(reviewed.length, 2);
  assert.equal(reviewed[0].status, "READY");
  assert.equal(reviewed[1].status, "READY");
  assert.deepEqual(reviewed[0].issues, []);
  assert.deepEqual(reviewed[1].issues, []);

  // Lookups should use compound unique key (code_departmentCode)
  assert.equal(lookups.length, 2);
  assert.deepEqual(lookups[0], {
    where: {
      code_departmentCode: {
        code: "MKU101",
        departmentCode: "IF",
      },
    },
  });
  assert.deepEqual(lookups[1], {
    where: {
      code_departmentCode: {
        code: "MKU101",
        departmentCode: "SI",
      },
    },
  });
});

test("reviewCourseBatch flags duplicate course code within the same department", async () => {
  const mockTx = {
    course: {
      findUnique: async () => null,
    },
  };
  const adminUser = {
    role: "SUPER_ADMIN",
    departmentScopes: ["*"],
  };
  const batch = {
    reason: "Duplicate within same department",
    rows: [
      {
        values: {
          code: "IF101",
          title: "Algoritma I",
          credits: 3,
          departmentCode: "IF",
          status: "PUBLISHED",
        },
      },
      {
        values: {
          code: "IF101",
          title: "Algoritma Pemrograman",
          credits: 3,
          departmentCode: "IF",
          status: "PUBLISHED",
        },
      },
    ],
  };

  const reviewed = await reviewCourseBatch(mockTx, adminUser, batch);
  assert.equal(reviewed[0].status, "ISSUE");
  assert.equal(reviewed[1].status, "ISSUE");
  assert.ok(reviewed[0].issues.includes("DUPLICATE_FILE"));
  assert.ok(reviewed[1].issues.includes("DUPLICATE_FILE"));
});
