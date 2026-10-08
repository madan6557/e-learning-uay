import test from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ROLE_PERMISSIONS,
  hasPermission,
  canManageDepartmentScope,
  canManageClassContent,
  canGradeClassWork,
  canAccessNavigationSection,
} from "../packages/shared/src/permissions.js";
import { Gradebook } from "../apps/web/src/Gradebook.js";
import { readCache } from "../apps/web/src/readCache.js";

Object.assign(globalThis, {
  React,
  location: new URL("http://localhost:3000/classes/cls-1/gradebook"),
});

test("permissions registry accurately defines role hierarchy and restrictions", () => {
  // DEPARTMENT_ADMIN can assist with class content
  assert.equal(
    hasPermission("DEPARTMENT_ADMIN", "MANAGE_CLASS_CONTENT"),
    true,
  );
  assert.equal(
    hasPermission("DEPARTMENT_ADMIN", "EXPORT_DEPT_GRADES"),
    true,
  );
  assert.equal(
    hasPermission("DEPARTMENT_ADMIN", "MANAGE_DEPT_CLASSES"),
    true,
  );

  // DEPARTMENT_ADMIN can NEVER grade student work or finalize grades
  assert.equal(
    hasPermission("DEPARTMENT_ADMIN", "GRADE_STUDENT_WORK"),
    false,
  );
  assert.equal(
    hasPermission("DEPARTMENT_ADMIN", "PUBLISH_GRADES"),
    false,
  );
  assert.equal(
    hasPermission("DEPARTMENT_ADMIN", "MANAGE_GRADEBOOK_WEIGHTS"),
    false,
  );
  assert.equal(
    hasPermission("DEPARTMENT_ADMIN", "LOCK_GRADEBOOK"),
    false,
  );

  // INSTRUCTOR has full grading and content permissions
  assert.equal(hasPermission("INSTRUCTOR", "GRADE_STUDENT_WORK"), true);
  assert.equal(hasPermission("INSTRUCTOR", "PUBLISH_GRADES"), true);
  assert.equal(hasPermission("INSTRUCTOR", "MANAGE_GRADEBOOK_WEIGHTS"), true);
  assert.equal(hasPermission("INSTRUCTOR", "LOCK_GRADEBOOK"), true);
  assert.equal(hasPermission("INSTRUCTOR", "MANAGE_CLASS_CONTENT"), true);

  // SUPER_ADMIN has catalog and institutional governance, but cannot grade or modify class content
  assert.equal(hasPermission("SUPER_ADMIN", "MANAGE_SYSTEM_SETTINGS"), true);
  assert.equal(hasPermission("SUPER_ADMIN", "MANAGE_ALL_CATALOG"), true);
  assert.equal(hasPermission("SUPER_ADMIN", "GRADE_STUDENT_WORK"), false);
  assert.equal(hasPermission("SUPER_ADMIN", "MANAGE_CLASS_CONTENT"), false);

  // RECTOR is read-only observer
  assert.equal(hasPermission("RECTOR", "VIEW_RECTOR_ANALYTICS"), true);
  assert.equal(hasPermission("RECTOR", "READ_ANNOUNCEMENTS"), true);
  assert.equal(hasPermission("RECTOR", "MANAGE_CLASS_CONTENT"), false);
  assert.equal(hasPermission("RECTOR", "GRADE_STUDENT_WORK"), false);
});

test("canManageClassContent verifies role and department scopes", () => {
  const deptAdmin = {
    id: "admin-1",
    role: "DEPARTMENT_ADMIN" as const,
    departmentScopes: ["IF", "SI"],
  };
  const instructor = {
    id: "inst-1",
    role: "INSTRUCTOR" as const,
    departmentScopes: [],
  };
  const otherInstructor = {
    id: "inst-2",
    role: "INSTRUCTOR" as const,
    departmentScopes: [],
  };
  const superAdmin = {
    id: "super-1",
    role: "SUPER_ADMIN" as const,
    departmentScopes: [],
  };
  const student = {
    id: "stud-1",
    role: "STUDENT" as const,
    departmentScopes: [],
  };

  const classIf = {
    courseDepartmentCode: "IF",
    instructorUserIds: ["inst-1"],
  };
  const classTi = {
    courseDepartmentCode: "TI",
    instructorUserIds: ["inst-1"],
  };

  // Department admin within scope can manage class content
  assert.equal(canManageClassContent(deptAdmin, classIf), true);
  // Department admin outside scope cannot manage class content
  assert.equal(canManageClassContent(deptAdmin, classTi), false);

  // Assigned instructor can manage class content
  assert.equal(canManageClassContent(instructor, classIf), true);
  // Unassigned instructor cannot manage class content
  assert.equal(canManageClassContent(otherInstructor, classIf), false);

  // Super admin and student cannot manage class content
  assert.equal(canManageClassContent(superAdmin, classIf), false);
  assert.equal(canManageClassContent(student, classIf), false);
});

test("canGradeClassWork is strictly reserved for assigned INSTRUCTOR", () => {
  assert.equal(
    canGradeClassWork({ id: "1", role: "INSTRUCTOR" }, true),
    true,
  );
  assert.equal(
    canGradeClassWork({ id: "1", role: "INSTRUCTOR" }, false),
    false,
  );
  assert.equal(
    canGradeClassWork({ id: "2", role: "DEPARTMENT_ADMIN" }, true),
    false,
  );
  assert.equal(
    canGradeClassWork({ id: "3", role: "SUPER_ADMIN" }, true),
    false,
  );
  assert.equal(
    canGradeClassWork({ id: "4", role: "RECTOR" }, true),
    false,
  );
  assert.equal(
    canGradeClassWork({ id: "5", role: "STUDENT" }, true),
    false,
  );
});

test("canAccessNavigationSection verifies section boundaries including Rector announcements", () => {
  // Rector
  assert.equal(canAccessNavigationSection("RECTOR", "rector"), true);
  assert.equal(canAccessNavigationSection("RECTOR", "announcements"), true);
  assert.equal(canAccessNavigationSection("RECTOR", "profile"), true);
  assert.equal(canAccessNavigationSection("RECTOR", "help"), true);
  assert.equal(canAccessNavigationSection("RECTOR", "dashboard"), false);
  assert.equal(canAccessNavigationSection("RECTOR", "classes"), false);
  assert.equal(canAccessNavigationSection("RECTOR", "catalog"), false);

  // Department Admin
  assert.equal(
    canAccessNavigationSection("DEPARTMENT_ADMIN", "announcements"),
    true,
  );
  assert.equal(
    canAccessNavigationSection("DEPARTMENT_ADMIN", "dashboard"),
    true,
  );
  assert.equal(canAccessNavigationSection("DEPARTMENT_ADMIN", "classes"), true);
  assert.equal(canAccessNavigationSection("DEPARTMENT_ADMIN", "catalog"), true);
  assert.equal(canAccessNavigationSection("DEPARTMENT_ADMIN", "rector"), false);
});

test("Gradebook renders in read-only / monitor mode for DEPARTMENT_ADMIN", async () => {
  readCache.clear();
  const mockGradebookData = {
    canManage: true,
    weightsValid: true,
    categories: [
      { id: "cat-1", name: "Tugas", weightPercent: 40, sourceType: "MANUAL" },
      { id: "cat-2", name: "UAS", weightPercent: 60, sourceType: "MANUAL" },
    ],
    rows: [
      {
        user: { id: "user-1", name: "Budi", identifierValue: "12345" },
        categoryScores: [
          { categoryId: "cat-1", score: 85, source: "MANUAL" },
          { categoryId: "cat-2", score: 90, source: "MANUAL" },
        ],
        finalScore: 88,
        gradeLetter: "A",
        progress: 100,
        pending: [],
        missing: [],
        record: null,
      },
    ],
  };

  await readCache.load(
    "/course-classes/cls-1/gradebook",
    30000,
    async () => mockGradebookData,
  );

  const deptAdminUser = {
    id: "admin-1",
    name: "Admin IF",
    role: "DEPARTMENT_ADMIN",
    departmentScopes: ["IF"],
  };

  const html = renderToStaticMarkup(
    createElement(Gradebook, {
      classId: "cls-1",
      writable: false,
      user: deptAdminUser,
    }),
  );

  // Admin prodi sees student data and export option
  assert.match(html, /Budi/);
  assert.match(html, /12345/);
  assert.match(html, /Ekspor/);
  // Admin prodi sees the informative notice
  assert.match(html, /Mode pratinjau rekap nilai/);
  assert.match(
    html,
    /Pengaturan bobot, koreksi nilai manual, dan publikasi nilai akhir merupakan wewenang dosen pengampu/,
  );

  // Admin prodi does NOT see grading actions: Atur Bobot, Import, Apply Automatic, or Publish Final
  assert.doesNotMatch(html, />Atur Bobot</);
  assert.doesNotMatch(html, />Impor</);
  assert.doesNotMatch(html, />Terapkan Kalkulasi Otomatis ke Draf</);
  assert.doesNotMatch(html, />Publikasikan Nilai Akhir</);

  readCache.clear();
});
