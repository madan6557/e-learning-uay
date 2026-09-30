import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import {
  comparison,
  statistics,
  validateState,
  exportCsv,
  emptyManual,
  safeUrl,
  type Case,
} from "../../apps/qa/src/model.js";

const catalog = JSON.parse(readFileSync("docs/qa/catalog.json", "utf8"));
const cases: Case[] = catalog.cases;
const ids = new Set(cases.map((c) => c.id));
test("every v5 scenario has distinct ID, priority, role, source and actionable steps", () => {
  assert.equal(ids.size, cases.length);
  for (const c of cases) {
    assert.ok(["P0", "P1", "P2"].includes(c.priority));
    assert.ok(catalog.roles.includes(c.role));
    assert.ok(c.sourceLine >= 1);
    assert.ok(c.preconditions.length);
    assert.ok(c.data);
    assert.ok(c.expected);
    assert.ok(c.steps.length >= 4);
    for (const s of c.steps) {
      assert.ok(s.action);
      assert.ok(s.expected);
    }
  }
});
test("all RTM families, twelve BVA dimensions, nine cause-effects and pilot gates are covered", () => {
  for (const family of catalog.families)
    assert.ok(cases.some((c) => c.family === family.code));
  const dimensions = [
    "Rekonsiliasi Impor Berkas",
    "Total Bobot Nilai",
    "Ukuran Berkas Modul",
    "Ukuran Berkas Video",
    "Durasi Timer Kuis",
    "Pengerjaan Lewat Deadline",
    "Batas Percobaan Kuis",
    "Rentang Nilai Tugas/Kuis",
    "Tenggat Tugas & Cut-off",
    "Koreksi Nilai Dosen",
    "Pelacakan Slide Halaman",
    "Concurrency Update Progress",
  ];
  for (const dimension of dimensions)
    assert.ok(
      cases.some((c) => c.tags.includes(dimension)),
      dimension,
    );
  for (let i = 1; i <= 9; i++)
    assert.ok(ids.has(`TC-CE-${String(i).padStart(2, "0")}`));
  assert.equal(cases.filter((c) => c.family === "PILOT").length, 12);
});
test("comparison requires terminal evidence on both sides and never treats missing as pass", () => {
  assert.equal(comparison("pass", "pass"), "match");
  assert.equal(comparison("fail", "fail"), "match");
  assert.equal(comparison("pass", "fail"), "mismatch");
  assert.equal(comparison("fail", "pass"), "mismatch");
  assert.equal(comparison("not_run", "not_run"), "pending");
  assert.equal(comparison("pass", "not_run"), "pending");
  assert.equal(comparison("blocked", "pass"), "blocked");
});
test("summary separates progress, blocked results and automatic evidence", () => {
  const sample = cases.slice(0, 3);
  const m = {
    [sample[0].id]: { ...emptyManual(), status: "pass" as const },
    [sample[1].id]: { ...emptyManual(), status: "blocked" as const },
  };
  const s = statistics(sample, m, { [sample[0].id]: { status: "fail" } });
  assert.equal(s.tested, 1);
  assert.equal(s.blocked, 1);
  assert.equal(s.progress, 33);
  assert.equal(s.mismatch, 1);
  assert.equal(s.autoTested, 1);
});
test("backup validation isolates sessions, strips unknown IDs and refuses invalid statuses", () => {
  const state = {
    version: 1,
    active: "a",
    targetUrl: "javascript:alert(1)",
    sessions: [
      {
        id: "a",
        name: "A",
        records: {
          [cases[0].id]: { ...emptyManual(), status: "pass" },
          unknown: emptyManual(),
        },
      },
      { id: "b", name: "B", records: {} },
    ],
  };
  const restored = validateState(state, ids);
  assert.equal(Object.keys(restored.sessions[0].records).length, 1);
  assert.deepEqual(restored.sessions[1].records, {});
  assert.ok(restored.targetUrl.startsWith("http"));
  assert.throws(() => validateState({ ...state, active: "missing" }, ids));
  assert.throws(() =>
    validateState(
      {
        ...state,
        sessions: [
          {
            id: "a",
            name: "A",
            records: {
              [cases[0].id]: { ...emptyManual(), status: "invented" },
            },
          },
        ],
      },
      ids,
    ),
  );
});
test("CSV contains every step and neutralizes spreadsheet formula input", () => {
  const c = cases[0];
  const m = {
    [c.id]: {
      ...emptyManual(),
      note: '=HYPERLINK("danger")',
      actual: "Line1\nLine2",
    },
  };
  const csv = exportCsv(
    [c],
    m,
    {},
    {
      id: "a",
      name: "A",
      records: m,
      tester: "Tester",
      environment: "Local",
      build: "v5",
      createdAt: "",
    },
  );
  assert.ok(csv.includes(c.id));
  assert.ok(csv.includes("\"'=HYPERLINK"));
  assert.ok(csv.includes(c.steps[0].action));
  assert.ok(csv.includes("Line1\nLine2"));
  assert.ok(csv.startsWith("\uFEFF"));
});
test("evidence URLs accept only HTTP and HTTPS", () => {
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("file:///secret"), null);
  assert.equal(
    safeUrl("https://example.test/proof"),
    "https://example.test/proof",
  );
});
test("portal renders and records a manual result independently of automatic results", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1:5174/",
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    fetch: globalThis.fetch,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", {
    value: function () {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(dom.window.HTMLDialogElement.prototype, "close", {
    value: function () {
      this.removeAttribute("open");
    },
  });
  globalThis.fetch = (async () => ({
    ok: false,
    json: async () => ({}),
  })) as any;
  const { createElement, act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { App } = await import("../../apps/qa/src/App.js");
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () => root.render(createElement(App)));
    assert.ok(document.body.textContent?.includes("317"));
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Mulai kasus pertama",
    )!;
    assert.ok(button);
    await act(async () => button.click());
    assert.ok(document.querySelector("dialog[open]"));
    const choices = [...document.querySelectorAll(".status-choice button")];
    await act(async () => choices[0].click());
    const saved = JSON.parse(localStorage.getItem("uay-qa-v5-sessions")!);
    assert.equal(saved.sessions[0].records[cases[0].id].status, "pass");
    assert.equal(
      document.querySelector(".comparison-box .badge")?.textContent,
      "Belum sebanding",
    );
    const close =
      document.querySelector<HTMLButtonElement>(".dialog-top button")!;
    await act(async () => close.click());
    assert.ok(document.body.textContent?.includes("1 / 317 selesai"));
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, previous);
  }
});
