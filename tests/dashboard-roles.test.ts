import test from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dashboard } from "../apps/web/src/pages.js";
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
    assert.match(html, /Pendaftaran kelas aktif/);
    assert.match(html, /Kelas draf/);
    assert.match(html, /Kelola kelas/);
    assert.match(html, /Rekap nilai/);
    assert.match(html, /href="#\/catalog"/);
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
  }
  readCache.clear();
});
