import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { AnswerKeyDisplay } from "../apps/web/src/components/ui/AnswerKeyDisplay.js";
import { Pagination } from "../apps/web/src/components/ui/Pagination.js";

test("AnswerKeyDisplay renders non-technical, human-friendly UI for all question types and avoids raw JSON", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const root = createRoot(document.getElementById("root")!);
  const { act } = await import("react");

  try {
    // 1. TRUE_FALSE
    await act(async () => {
      root.render(
        createElement(AnswerKeyDisplay, {
          question: {
            text: "Bumi mengelilingi matahari.",
            type: "TRUE_FALSE",
            options: [
              { id: "true", text: "True" },
              { id: "false", text: "False" },
            ],
            answerKey: { correct: ["true"] },
            explanation: "Bumi berevolusi mengelilingi matahari dalam waktu 365 hari.",
          },
        }),
      );
    });

    const tfText = document.getElementById("root")!.textContent!;
    assert.match(tfText, /BENAR \(True\)/);
    assert.match(tfText, /Kunci Jawaban/);
    assert.match(tfText, /Pembahasan/);
    assert.doesNotMatch(tfText, /\{"correct":/);

    // 2. SINGLE_CHOICE
    await act(async () => {
      root.render(
        createElement(AnswerKeyDisplay, {
          question: {
            text: "Ibu kota Indonesia adalah?",
            type: "SINGLE_CHOICE",
            options: [
              { id: "a", text: "Bandung" },
              { id: "b", text: "Nusantara" },
              { id: "c", text: "Surabaya" },
            ],
            answerKey: { correct: ["b"] },
          },
        }),
      );
    });

    const scText = document.getElementById("root")!.textContent!;
    assert.match(scText, /Pilihan B \(Nusantara\)/);
    assert.match(scText, /Kunci Jawaban/);
    assert.doesNotMatch(scText, /\{"correct":/);

    // 3. MULTIPLE_SELECT
    await act(async () => {
      root.render(
        createElement(AnswerKeyDisplay, {
          question: {
            text: "Pilih bahasa pemrograman backend:",
            type: "MULTIPLE_SELECT",
            options: [
              { id: "a", text: "TypeScript" },
              { id: "b", text: "HTML" },
              { id: "c", text: "Python" },
            ],
            answerKey: { correct: ["a", "c"], partialCredit: true },
          },
        }),
      );
    });

    const msText = document.getElementById("root")!.textContent!;
    assert.match(msText, /TypeScript/);
    assert.match(msText, /Python/);
    assert.match(msText, /Penilaian parsial/);
    assert.match(msText, /Diizinkan/);
    assert.doesNotMatch(msText, /\{"correct":/);

    // 4. SHORT_ANSWER
    await act(async () => {
      root.render(
        createElement(AnswerKeyDisplay, {
          question: {
            text: "Berapa nilai percepatan gravitasi bumi rata-rata (m/s²)?",
            type: "SHORT_ANSWER",
            answerKey: {
              numericValue: 9.8,
              tolerance: 0.1,
              caseSensitive: false,
            },
          },
        }),
      );
    });

    const saText = document.getElementById("root")!.textContent!;
    assert.match(saText, /9\.8/);
    assert.match(saText, /Toleransi: ±0\.1/);
    assert.doesNotMatch(saText, /\{"numericValue":/);

    // 5. MATCHING
    await act(async () => {
      root.render(
        createElement(AnswerKeyDisplay, {
          question: {
            text: "Pasangkan negara dengan ibu kotanya:",
            type: "MATCHING",
            options: [
              { id: "1", text: "Jepang", rightText: "Tokyo" },
              { id: "2", text: "Perancis", rightText: "Paris" },
            ],
            answerKey: {
              pairs: { "1": "1", "2": "2" },
            },
          },
        }),
      );
    });

    const matchText = document.getElementById("root")!.textContent!;
    assert.match(matchText, /Jepang/);
    assert.match(matchText, /Tokyo/);
    assert.match(matchText, /Perancis/);
    assert.match(matchText, /Paris/);
    assert.doesNotMatch(matchText, /\{"pairs":/);

    // 6. ORDERING
    await act(async () => {
      root.render(
        createElement(AnswerKeyDisplay, {
          question: {
            text: "Urutkan siklus hidup perangkat lunak:",
            type: "ORDERING",
            options: [
              { id: "req", text: "Analisis Kebutuhan" },
              { id: "des", text: "Perancangan Desain" },
              { id: "imp", text: "Implementasi Kode" },
            ],
            answerKey: {
              correct: ["req", "des", "imp"],
            },
          },
        }),
      );
    });

    const ordText = document.getElementById("root")!.textContent!;
    assert.match(ordText, /1.*Analisis Kebutuhan/);
    assert.match(ordText, /2.*Perancangan Desain/);
    assert.match(ordText, /3.*Implementasi Kode/);
    assert.doesNotMatch(ordText, /\{"correct":/);

    // 7. ESSAY
    await act(async () => {
      root.render(
        createElement(AnswerKeyDisplay, {
          question: {
            text: "Jelaskan prinsip kerja sistem operasi modern.",
            type: "ESSAY",
            maxWords: 500,
            rubric: [
              { title: "Manajemen Memori", points: 40 },
              { title: "Penjadwalan CPU", points: 60 },
            ],
          },
        }),
      );
    });

    const esText = document.getElementById("root")!.textContent!;
    assert.match(esText, /500 kata/);
    assert.match(esText, /Manajemen Memori/);
    assert.match(esText, /40 poin/);
    assert.match(esText, /Penjadwalan CPU/);
    assert.match(esText, /60 poin/);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("Pagination component has margin, padding, border and is not stuck to edge", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const root = createRoot(document.getElementById("root")!);
  const { act } = await import("react");

  try {
    await act(async () => {
      root.render(
        createElement(Pagination, {
          page: 1,
          totalPages: 5,
          totalItems: 50,
          pageSize: 10,
          onPageChange: () => {},
          onPageSizeChange: () => {},
        }),
      );
    });

    const bar = document.querySelector(".pagination-bar") as HTMLElement;
    assert.ok(bar);
    assert.ok(bar.style.margin.length > 0);
    assert.ok(bar.style.padding.length > 0);
    assert.ok(bar.style.borderRadius.length > 0);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("System audit-logs endpoint enforces access control and filters for super admin and department admin", async (suite) => {
  if (!process.env.DATABASE_URL) {
    suite.skip("DATABASE_URL is not set in this environment");
    return;
  }
  assert.ok(new URL(process.env.DATABASE_URL).pathname.endsWith("_test"));
  const { createApp } = await import("../apps/api/src/index.js");
  const { db } = await import("../apps/api/src/core.js");
  const server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;

  const suffix = randomUUID().slice(0, 8);
  const cookies = new Map<string, string>();

  const makeUser = async (role: any, scopes: string[] = []) => {
    const id = randomUUID();
    const user = await db.user.create({
      data: {
        id,
        ssoUserId: id,
        name: `User ${role} ${suffix}`,
        email: `${id}@example.test`,
        identifierValue: id,
        role,
        departmentScopes: scopes,
      },
    });
    await new Promise((r) => setTimeout(r, 200));
    const login = await fetch(base + "/auth/development-login", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: id }),
    });
    assert.equal(login.status, 200);
    cookies.set(id, login.headers.get("set-cookie")!.split(";")[0]);
    return user;
  };

  const req = async (userId: string, path: string) => {
    return fetch(base + path, {
      headers: {
        Cookie: cookies.get(userId) || "",
        Origin: "http://127.0.0.1:5173",
      },
    });
  };

  try {
    const superAdmin = await makeUser("SUPER_ADMIN", []);
    const deptAdmin = await makeUser("DEPARTMENT_ADMIN", ["TI"]);
    const student = await makeUser("STUDENT", []);

    // 1. Student should be denied (403)
    const studentRes = await req(student.id, "/system/audit-logs");
    assert.equal(studentRes.status, 403);

    // 2. Super admin should be allowed (200)
    const superRes = await req(superAdmin.id, "/system/audit-logs?page=1&pageSize=10");
    assert.equal(superRes.status, 200);
    const superData = await superRes.json();
    assert.ok(Array.isArray(superData.data));
    assert.equal(typeof superData.total, "number");
    assert.equal(typeof superData.totalPages, "number");

    // 3. Department admin should be allowed (200)
    const deptRes = await req(deptAdmin.id, "/system/audit-logs?page=1&pageSize=10");
    assert.equal(deptRes.status, 200);
    const deptData = await deptRes.json();
    assert.ok(Array.isArray(deptData.data));
    assert.equal(typeof deptData.total, "number");
  } finally {
    server.close();
  }
});
