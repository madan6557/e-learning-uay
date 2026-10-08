import test from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dashboard, Catalog, AcademicGovernanceModal } from "../apps/web/src/pages.js";
import { readCache } from "../apps/web/src/readCache.js";

Object.assign(globalThis, { React });
const cls = {
  id: "class-id",
  name: "Kelas A",
  academicYear: "2026/2027",
  status: "DRAFT",
  course: { id: "course-id", code: "IF101", title: "Pemrograman", credits: 3 },
  instructors: [{ user: { name: "Dosen Contoh" } }],
  _count: { sections: 2, enrollments: 4 },
  sections: [],
  progress: { video: [], slides: [], downloads: [], text: [] },
  gradingQueue: [],
};

test("administrators see academic management with their actual scope and no instructor dashboard", async () => {
  for (const role of ["SUPER_ADMIN", "DEPARTMENT_ADMIN"]) {
    readCache.clear();
    await readCache.load("/course-classes", 30000, async () => [cls]);
    await readCache.load("/courses", 30000, async () => [cls.course]);
    const user = {
      id: "admin",
      name: "Admin Contoh",
      role,
      departmentScopes: ["IF"],
    };
    const html = renderToStaticMarkup(
      createElement(Dashboard, { page: "dashboard", user }),
    );
    assert.match(html, /Dashboard administrasi/);
    assert.match(html, /Pendaftaran aktif/);
    assert.match(html, /Kelas draf/);
    assert.match(html, /Kelola kelas/);
    assert.match(html, /Rekap nilai/);
    assert.match(html, /href="\/catalog"/);
    assert.doesNotMatch(html, /Tambah kelas/);
    assert.match(
      html,
      role === "SUPER_ADMIN" ? /Seluruh program studi/ : /Cakupan: IF/,
    );
    assert.doesNotMatch(
      html,
      /Dosen Pengampu|Kelas yang Anda ampu|Perlu dinilai|Progres belajar|Agenda terdekat/,
    );
    const list = renderToStaticMarkup(
      createElement(Dashboard, { page: "classes", user }),
    );
    assert.match(list, /Kelola kelas/);
    assert.match(list, /Tambah kelas/);
    assert.doesNotMatch(list, /Gabung kelas/);
  }
  readCache.clear();
});

test("instructors and students retain their own learning dashboards", async () => {
  for (const role of ["INSTRUCTOR", "STUDENT"]) {
    readCache.clear();
    await readCache.load("/course-classes", 30000, async () => [cls]);
    await readCache.load("/course-classes?summary=true", 30000, async () => [
      cls,
    ]);
    const html = renderToStaticMarkup(
      createElement(Dashboard, {
        page: "dashboard",
        user: { name: "Nama Pengguna", role },
      }),
    );
    assert.match(
      html,
      role === "INSTRUCTOR" ? /Kelas yang Anda ampu/ : /Kelas yang Anda ikuti/,
    );
    assert.doesNotMatch(
      html,
      /Dashboard administrasi|Pengelolaan akademik universitas/,
    );
    assert.doesNotMatch(html, /Tambah kelas/);

    const list = renderToStaticMarkup(
      createElement(Dashboard, {
        page: "classes",
        user: { name: "Nama Pengguna", role },
      }),
    );
    if (role === "STUDENT") {
      assert.match(list, /Gabung kelas/);
      assert.doesNotMatch(list, /Tambah kelas/);
    } else {
      assert.doesNotMatch(list, /Gabung kelas/);
      assert.doesNotMatch(list, /Tambah kelas/);
    }
  }
  readCache.clear();
});

test("unauthorized actions are hidden or disabled across catalog and academic governance", async () => {
  readCache.clear();
  const ifCourse = {
    id: "c-if",
    code: "IF101",
    title: "Pemrograman",
    departmentCode: "IF",
    credits: 3,
    status: "PUBLISHED",
    _count: { classes: 0, questionBanks: 0 },
  };
  const siCourse = {
    id: "c-si",
    code: "SI201",
    title: "Sistem Informasi",
    departmentCode: "SI",
    credits: 3,
    status: "PUBLISHED",
    _count: { classes: 0, questionBanks: 0 },
  };
  await readCache.load("/courses", 30000, async () => [ifCourse, siCourse]);

  const deptAdmin = {
    id: "dept-admin",
    name: "Admin IF",
    role: "DEPARTMENT_ADMIN",
    departmentScopes: ["IF"],
  };
  const catalogHtml = renderToStaticMarkup(
    createElement(Catalog, { user: deptAdmin }),
  );
  // Admin IF should see edit/delete for IF course
  assert.match(catalogHtml, /IF101/);
  assert.match(catalogHtml, /Hapus/);
  // Admin IF should see SI course marked as Hanya-baca with no action buttons
  assert.match(catalogHtml, /SI201/);
  assert.match(catalogHtml, /Hanya-baca/);

  // AcademicGovernanceModal for readOnly role (e.g. DEPARTMENT_ADMIN)
  const govModalHtml = renderToStaticMarkup(
    createElement(AcademicGovernanceModal, {
      readOnly: true,
      onClose: () => {},
      onSaved: () => {},
    }),
  );
  assert.doesNotMatch(govModalHtml, /Tambah Semester/);
  assert.doesNotMatch(govModalHtml, /Simpan Perubahan Kebijakan/);
  assert.match(govModalHtml, /Tutup/);
  readCache.clear();
});

