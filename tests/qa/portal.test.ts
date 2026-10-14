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
  canRecordManualStatus,
  getPriorityProgress,
  isPriorityCompleted,
  certificatePdf,
  versionPresets,
  type Case,
  type Session,
} from "../../apps/qa/src/model.js";
import {
  resumeAndScheduleQaSound,
  scheduleQaSound,
  type QaSoundKind,
} from "../../apps/qa/src/sfx.js";

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
    assert.ok(c.cleanup, c.id);
    assert.ok(c.steps.length >= 4);
    for (const s of c.steps) {
      assert.ok(s.action);
      assert.ok(s.expected);
    }
  }
});
test("all case instructions name actionable targets and reject unresolved template wording", () => {
  const unclear =
    /Buka kembali halaman atau fitur terkait|Buka landing, profil atau menu akses yang disebut|fitur yang disebut pada data uji|Buka kelas uji yang disiapkan pada staging\/UAT dan fitur|Buka checklist acceptance pilot dan kumpulkan bukti dari kasus terkait|Buka runbook staging dan alat pemantauan untuk komponen yang diuji|Data\/fitur uji tersedia; respons awal|Buka menu pencarian pengguna atau manajemen akademik pada prodi terkait|Untuk satu aksi yang tidak tampil, panggil endpoint perubahan terkait|Buka Bantuan\.$|Buka dashboard; klik antrean penilaian|akun, objek, dan kondisi awal cocok dengan nilai pada Data uji/i;
  for (const c of cases) {
    assert.ok(c.data.trim().length >= 12, `${c.id} has no usable test data`);
    assert.ok(c.steps.length >= 4, `${c.id} has too few steps`);
    for (const [index, step] of c.steps.entries()) {
      assert.ok(step.action.trim().length >= 16, `${c.id} step ${index + 1} action`);
      assert.ok(step.expected.trim().length >= 12, `${c.id} step ${index + 1} expected result`);
      assert.doesNotMatch(step.action, unclear, `${c.id} step ${index + 1}`);
      assert.doesNotMatch(step.expected, unclear, `${c.id} step ${index + 1} result`);
    }
  }
  const help = cases.find((c) => c.id === "TC-HELP-001")!;
  assert.match(help.steps[1].action, /navigasi E-Learning, klik Bantuan/);
  assert.match(help.steps[3].action, /\?role=SUPER_ADMIN/);
  const multiModulePilot = cases.find((c) => c.id === "TC-PILOT-002")!;
  assert.match(multiModulePilot.steps[1].action, /pilih satu per satu modul/i);
  assert.doesNotMatch(multiModulePilot.steps[1].action, /Modul=[^;]+;/);
});
test("manual instructions target staging or approved production-test environments", () => {
  for (const c of cases) {
    const instructions = JSON.stringify({
      title: c.title,
      navigation: c.navigation,
      data: c.data,
      preconditions: c.preconditions,
      steps: c.steps,
      expected: c.expected,
      cleanup: c.cleanup,
      manualReason: c.manualReason,
    });
    assert.doesNotMatch(
      instructions,
      /\b(?:demo|demonstrasi|fixture)\b|QA-V5|127\.0\.0\.1|localhost/i,
      c.id,
    );
  }
});
test("current feature inventory is covered and release readiness is explicit for every case", () => {
  const availability = new Map(cases.map((c) => [c.id, c.availability]));
  for (const c of cases)
    assert.ok(["active", "disabled", "backlog"].includes(c.availability), c.id);
  for (const feature of catalog.featureInventory) {
    const mapped = cases.filter((c) => c.featureKeys.includes(feature.id));
    assert.ok(mapped.length > 0, feature.id);
    assert.deepEqual(
      new Set(feature.caseIds),
      new Set(mapped.map((c) => c.id)),
    );
    if (feature.availability === "active")
      assert.ok(
        mapped.some((c) => c.availability === "active"),
        feature.id,
      );
  }
  const siakad = cases.find((c) => c.id === "TC-SYN-SIAKAD-001")!;
  assert.equal(siakad.availability, "disabled");
  const backlog = cases.find((c) => c.availability === "backlog")!;
  assert.equal(canRecordManualStatus(backlog, "pass"), false);
  assert.equal(canRecordManualStatus(backlog, "fail"), false);
  assert.equal(canRecordManualStatus(backlog, "blocked"), true);
  assert.ok(cases.some((c) => c.featureKeys.includes("linked-practicum")));
  assert.ok(cases.some((c) => c.featureKeys.includes("theme")));
  assert.ok(cases.some((c) => c.featureKeys.includes("table-sorting")));
  assert.ok(cases.some((c) => c.featureKeys.includes("user-sync")));
  assert.equal(availability.get(backlog.id), "backlog");
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
  assert.equal(restored.targetUrl, "");
  const legacyLocalTarget = validateState(
    { ...state, targetUrl: "http://127.0.0.1:5173/" },
    ids,
  );
  assert.equal(legacyLocalTarget.targetUrl, "");
  const stagingTarget = validateState(
    { ...state, targetUrl: "https://staging.example.ac.id/" },
    ids,
  );
  assert.equal(stagingTarget.targetUrl, "https://staging.example.ac.id/");
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
test("old sessions and backups restore wizard progress and move obsolete backlog results to blocked", () => {
  const backlog = cases.find((c) => c.availability === "backlog")!;
  const tutorial = cases.find((c) => c.availability === "active")!;
  const availability = new Map(cases.map((c) => [c.id, c.availability]));
  const legacy = {
    version: 1,
    active: "legacy",
    targetUrl: "http://127.0.0.1:5173/",
    sessions: [
      {
        id: "legacy",
        name: "Sesi lama",
        records: {
          [tutorial.id]: {
            ...emptyManual(),
            checks: [0, 1],
            status: "not_run",
          },
          [backlog.id]: { ...emptyManual(), status: "pass", checks: [0] },
        },
      },
    ],
  };
  const restored = validateState(legacy, ids, availability);
  assert.equal(restored.targetUrl, "");
  assert.equal(
    restored.sessions[0].environment,
    "Staging/UAT · target perlu diverifikasi",
  );
  assert.deepEqual(restored.sessions[0].records[tutorial.id].checks, [0, 1]);
  assert.equal(restored.sessions[0].records[tutorial.id].tutorialStep, -1);
  assert.equal(restored.sessions[0].records[backlog.id].status, "blocked");
  assert.match(restored.sessions[0].records[backlog.id].note, /backlog/);
  const resumed = validateState(
    {
      ...legacy,
      sessions: [
        {
          ...legacy.sessions[0],
          records: {
            [tutorial.id]: {
              ...emptyManual(),
              tutorialStep: 2,
              checks: [0, 1],
            },
          },
        },
      ],
    },
    ids,
    availability,
  );
  assert.equal(resumed.sessions[0].records[tutorial.id].tutorialStep, 2);
});
test("tutorial and manual status sounds use distinct tone patterns", () => {
  const frequencies: number[] = [];
  const startTimes: number[] = [];
  const waveforms: OscillatorType[] = [];
  const makeContext = () => ({
    currentTime: 3,
    destination: {},
    createOscillator() {
      return {
        set type(value: OscillatorType) {
          waveforms.push(value);
        },
        frequency: {
          setValueAtTime(value: number) {
            frequencies.push(value);
          },
        },
        connect() {},
        start(at: number) {
          startTimes.push(at);
        },
        stop() {},
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
  });

  const context = makeContext() as unknown as AudioContext;
  scheduleQaSound(context, "step");
  scheduleQaSound(context, "completion");
  scheduleQaSound(context, "status-pass");
  scheduleQaSound(context, "status-fail");
  scheduleQaSound(context, "status-blocked");
  scheduleQaSound(context, "status-not_run");
  assert.deepEqual(frequencies, [
    880,
    659.25,
    880,
    784,
    1046.5,
    440,
    349.23,
    293.66,
    392,
    392,
    587.33,
  ]);
  assert.deepEqual(startTimes, [
    3,
    3,
    3.16,
    3,
    3.11,
    3,
    3.12,
    3.24,
    3,
    3.19,
    3,
  ]);
  const signatures = [
    `step:${waveforms[0]}:${frequencies[0]}`,
    `completion:${waveforms[1]}:${frequencies.slice(1, 3).join(",")}`,
  ];
  const statusPatterns: Array<[QaSoundKind, OscillatorType, number[]]> = [
    ["status-pass", "triangle", [784, 1046.5]],
    ["status-fail", "triangle", [440, 349.23, 293.66]],
    ["status-blocked", "square", [392, 392]],
    ["status-not_run", "sine", [587.33]],
  ];
  let offset = 3;
  for (const [kind, waveform, pattern] of statusPatterns) {
    const actualFrequencies = frequencies.slice(offset, offset + pattern.length);
    const actualWaveforms = waveforms.slice(offset, offset + pattern.length);
    assert.deepEqual(actualFrequencies, pattern, `${kind} has its own notes`);
    assert.ok(actualWaveforms.every((actual) => actual === waveform));
    signatures.push(`${kind}:${waveform}:${pattern.join(",")}`);
    offset += pattern.length;
  }
  assert.equal(new Set(signatures.slice(2)).size, 4);
});
test("tutorial sound playback resumes audio before scheduling and skips blocked audio", async () => {
  const events: string[] = [];
  const context = {
    currentTime: 0,
    destination: {},
    state: "suspended",
    async resume() {
      events.push("resume");
      this.state = "running";
    },
    createOscillator() {
      events.push("schedule");
      return {
        type: "sine",
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
  };
  assert.equal(await resumeAndScheduleQaSound(context as never, "step"), true);
  assert.equal(events[0], "resume");
  assert.equal(events[1], "schedule");

  const blockedContext = {
    ...context,
    state: "suspended",
    async resume() {
      events.push("blocked");
    },
    createOscillator() {
      events.push("schedule-blocked");
      return {
        type: "sine",
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop(at: number) {
          if (at === 0) events.push("cancelled");
        },
      };
    },
  };
  assert.equal(
    await resumeAndScheduleQaSound(blockedContext as never, "step"),
    false,
  );
  assert.ok(events.includes("cancelled"), "a sound is cleared if audio stays blocked");
});
test("suspended-context sounds are queued before resume completes", async () => {
  const events: string[] = [];
  let finishResume!: () => void;
  const context = {
    currentTime: 0,
    destination: {},
    state: "suspended",
    resume() {
      events.push("resume");
      return new Promise<void>((resolve) => {
        finishResume = () => {
          this.state = "running";
          resolve();
        };
      });
    },
    createOscillator() {
      events.push("schedule");
      return {
        type: "sine",
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {},
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
  };
  const pendingPlayback = resumeAndScheduleQaSound(context as never, "step");
  assert.deepEqual(events, ["resume", "schedule"]);
  finishResume();
  assert.equal(await pendingPlayback, true);
});
test("completion VFX are brief and anchored, with no continuously rotating aura", () => {
  const styles = readFileSync("apps/qa/src/styles.css", "utf8");
  assert.doesNotMatch(styles, /magical-aura|tutorial-celebration::before/);
  assert.match(styles, /\.step-success-mark\s*{[^}]*animation:\s*step-success-sparkle/s);
  assert.match(styles, /\.tutorial-celebration\s*{[^}]*animation:\s*tutorial-celebration-in/s);
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
test("portal wizard persists results and continues within the filtered visible cases", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1:5174/",
  });
  dom.window.localStorage.clear();
  let toneStarts = 0;
  class MockAudioContext {
    state: AudioContextState = "suspended";
    currentTime = 0;
    destination = {};
    async resume() {
      this.state = "running";
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {
          toneStarts += 1;
        },
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    }
  }
  Object.defineProperty(dom.window, "AudioContext", {
    configurable: true,
    value: MockAudioContext,
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
    assert.ok(document.body.textContent?.includes(String(cases.length)));
    const themeToggle = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Ganti ke mode gelap"]',
    )!;
    assert.equal(
      document.querySelector(".app-shell")?.getAttribute("data-theme"),
      "light",
    );
    assert.equal(document.documentElement.dataset.theme, "light");
    await act(async () => themeToggle.click());
    assert.equal(
      document.querySelector(".app-shell")?.getAttribute("data-theme"),
      "dark",
    );
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(localStorage.getItem("uay-qa-theme"), "dark");
    const lightThemeToggle = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Ganti ke mode terang"]',
    )!;
    await act(async () => lightThemeToggle.click());
    assert.equal(
      document.querySelector(".app-shell")?.getAttribute("data-theme"),
      "light",
    );
    assert.equal(localStorage.getItem("uay-qa-theme"), "light");
    assert.equal(
      document.querySelector('a[aria-disabled="true"]')?.getAttribute("href"),
      null,
    );
    const sessionSettings = [
      ...document.querySelectorAll<HTMLButtonElement>("button[aria-label]"),
    ].find(
      (button) => button.getAttribute("aria-label") === "Pengaturan sesi",
    )!;
    await act(async () => sessionSettings.click());
    const soundToggle = document.querySelector<HTMLInputElement>(
      'input[aria-label="Efek suara tutorial"]',
    )!;
    assert.ok(soundToggle.checked);
    await act(async () => soundToggle.click());
    assert.equal(localStorage.getItem("uay-qa-sfx-enabled"), "false");
    await act(async () => soundToggle.click());
    assert.equal(localStorage.getItem("uay-qa-sfx-enabled"), "true");
    const closeSettings = document.querySelector<HTMLButtonElement>(
      ".settings-buttons .button.primary",
    )!;
    await act(async () => closeSettings.click());
    const button = [...document.querySelectorAll("button")].find(
      (b) => b.textContent === "Mulai kasus pertama",
    )!;
    assert.ok(button);
    await act(async () => button.click());
    assert.ok(document.querySelector("dialog[open]"));
    const start = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Mulai tutorial"),
    )!;
    assert.ok(document.body.textContent?.includes("Sebelum memulai"));
    assert.ok(document.body.textContent?.includes("URL target"));
    assert.ok(document.querySelector(".production-safety-note"));
    const caseDialog =
      document.querySelector<HTMLDialogElement>("dialog[open]")!;
    const caseBody = caseDialog.querySelector<HTMLElement>(".case-detail")!;
    caseBody.scrollTop = 84;
    await act(async () => start.click());
    assert.equal(caseBody.scrollTop, 0);
    assert.ok(document.body.textContent?.includes("Langkah 1"));
    const showAll = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Lihat semua langkah"),
    )!;
    await act(async () => showAll.click());
    assert.equal(
      document.querySelectorAll(".all-tutorial-steps > li").length,
      cases[0].steps.length,
    );
    const focusStep = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Fokus ke langkah ini"),
    )!;
    await act(async () => focusStep.click());
    const firstMark = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Tandai langkah selesai"),
    )!;
    await act(async () => firstMark.click());
    assert.equal(toneStarts, 1, "marking a step plays its chime");
    assert.ok(document.querySelector(".step-success-banner"));
    assert.ok(document.querySelector(".step-success-mark"));
    const nextStep = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Langkah berikutnya"),
    )!;
    await act(async () => nextStep.click());
    assert.ok(document.body.textContent?.includes("Langkah 2"));
    const previousStep = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Sebelumnya"),
    )!;
    await act(async () => previousStep.click());
    assert.ok(
      document.body.textContent?.includes(
        `1 / ${cases[0].steps.length} langkah selesai`,
      ),
    );
    const unmarkFirst = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Batalkan tanda selesai"),
    )!;
    await act(async () => unmarkFirst.click());
    assert.equal(toneStarts, 1, "cancelling a completed step is silent");
    assert.equal(document.querySelector(".step-success-banner"), null);
    for (let i = 0; i < cases[0].steps.length; i++) {
      const mark = [...document.querySelectorAll("button")].find((b) =>
        b.textContent?.includes("Tandai langkah selesai"),
      )!;
      await act(async () => mark.click());
      if (i === cases[0].steps.length - 1)
        assert.ok(
          document.body.textContent?.includes("Semua langkah selesai!"),
        );
      if (i === cases[0].steps.length - 1) {
        assert.equal(toneStarts, 6, "the final step plays the completion melody");
        assert.ok(document.querySelector(".tutorial-celebration .magical-sparkles"));
      }
      const nextLabel =
        i === cases[0].steps.length - 1
          ? "Lanjut ke hasil"
          : "Langkah berikutnya";
      const next = [...document.querySelectorAll("button")].find((b) =>
        b.textContent?.includes(nextLabel),
      )!;
      await act(async () => next.click());
    }
    assert.ok(document.body.textContent?.includes("Catat hasil pengujian"));
    assert.equal(
      document.querySelectorAll(".status-choice .badge").length,
      0,
      "status options render labels directly without nested badge blocks",
    );
    assert.equal(
      document.querySelectorAll(".status-choice-label").length,
      4,
    );
    const choices = [...document.querySelectorAll(".status-choice button")];
    await act(async () => choices[0].click());
    assert.equal(toneStarts, 8, "Lulus plays its rising two-note chime");
    await act(async () => choices[1].click());
    assert.equal(toneStarts, 11, "Gagal plays its descending three-note cue");
    await act(async () => choices[2].click());
    assert.equal(toneStarts, 13, "Terblokir plays its low double pulse");
    await act(async () => choices[3].click());
    assert.equal(toneStarts, 14, "Belum diuji plays its quiet single note");
    await act(async () => choices[0].click());
    assert.equal(toneStarts, 16, "each new status selection plays its own sound");
    const saved = JSON.parse(localStorage.getItem("uay-qa-v5-sessions")!);
    assert.equal(saved.sessions[0].records[cases[0].id].status, "pass");
    assert.equal(
      saved.sessions[0].records[cases[0].id].tutorialStep,
      cases[0].steps.length,
    );
    assert.equal(
      saved.sessions[0].records[cases[0].id].checks.length,
      cases[0].steps.length,
    );
    assert.equal(
      document.querySelector(".comparison-box .badge")?.textContent,
      "Belum sebanding",
    );
    const close =
      document.querySelector<HTMLButtonElement>(".dialog-top button")!;
    await act(async () => close.click());
    assert.ok(
      document.body.textContent?.includes(`1 / ${cases.length} selesai`),
    );
    const testCasesNav = [...document.querySelectorAll(".primary-nav button")].find(
      (b) => b.textContent?.includes("Test case"),
    )!;
    await act(async () => testCasesNav.click());
    const search = document.querySelector<HTMLInputElement>(".search-box input");
    assert.ok(search);
    const setSearchValue = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value",
    )!.set!;
    setSearchValue.call(search, "TC-ACC-006");
    await act(async () =>
      search.dispatchEvent(new dom.window.Event("input", { bubbles: true })),
    );
    const continueButton = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Lanjutkan pengujian"),
    )!;
    await act(async () => continueButton.click());
    assert.ok(
      document.querySelector("dialog[open]")?.textContent?.includes("TC-ACC-006"),
      "continuation opens a case that matches the active search filter",
    );
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    Object.assign(globalThis, previous);
  }
});
test("certificate issuance and validation supports per-P# priorities and tracks distinct progress", () => {
  const records: Record<string, any> = {};
  const p0Cases = cases.filter((c) => c.priority === "P0");
  const p1Cases = cases.filter((c) => c.priority === "P1");

  // Initial progress should be 0% for both
  const p0ProgInitial = getPriorityProgress("P0", cases, records);
  assert.equal(p0ProgInitial.resolved, 0);
  assert.equal(p0ProgInitial.isComplete, false);
  assert.equal(isPriorityCompleted("P0", cases, records), false);

  // Mark all P0 required cases as pass
  for (const c of p0Cases) {
    if (c.availability !== "backlog") {
      records[c.id] = { ...emptyManual(), status: "pass" };
    }
  }

  // P0 should now be complete, but P1 is not
  const p0ProgDone = getPriorityProgress("P0", cases, records);
  assert.equal(p0ProgDone.resolved, p0ProgDone.total);
  assert.equal(p0ProgDone.isComplete, true);
  assert.equal(isPriorityCompleted("P0", cases, records), true);

  const p1ProgPending = getPriorityProgress("P1", cases, records);
  assert.equal(p1ProgPending.resolved, 0);
  assert.equal(p1ProgPending.isComplete, false);
  assert.equal(isPriorityCompleted("P1", cases, records), false);

  // Validate state preserves certificates per priority
  const testState = {
    version: 1,
    active: "sess-1",
    targetUrl: "https://staging.uay.ac.id",
    sessions: [
      {
        id: "sess-1",
        name: "Sesi Uji Pilot",
        tester: "QA Tester",
        environment: "Staging/UAT",
        build: "alpha 0.1.0",
        createdAt: new Date().toISOString(),
        certificates: {
          P0: {
            completedAt: new Date().toISOString(),
            certificateId: "cert-p0-uuid",
            priority: "P0",
            build: "alpha 0.1.0",
            tester: "QA Tester",
          },
        },
        records: {},
      },
    ],
  };

  const restored = validateState(testState, ids);
  assert.ok(restored.sessions[0].certificates?.P0);
  assert.equal(restored.sessions[0].certificates.P0.priority, "P0");
  assert.equal(restored.sessions[0].certificates.P0.build, "alpha 0.1.0");
  assert.equal(restored.sessions[0].certificates.P0.certificateId, "cert-p0-uuid");
});
test("certificatePdf generates valid PDF per priority with custom app versions (alpha 0.1.0, beta, v.1.0.0)", () => {
  const dummySession: Session = {
    id: "sess-test",
    name: "Sesi Uji Rilis",
    tester: "Hasbullah",
    environment: "Staging/UAT",
    build: "alpha 0.1.0",
    createdAt: new Date().toISOString(),
    records: {},
  };

  const p0Subset = cases.filter((c) => c.priority === "P0");
  const p0Stats = statistics(p0Subset, {});

  // Generate P0 certificate with version alpha 0.1.0
  const pdfP0 = certificatePdf(dummySession, p0Stats, "P0", {
    certificateId: "abc12345-p0",
    completedAt: "2026-10-13T10:00:00Z",
    build: "alpha 0.1.0",
    tester: "Hasbullah",
  });

  assert.ok(pdfP0.startsWith("%PDF-1.4"));
  assert.ok(pdfP0.endsWith("%%EOF"));
  assert.match(pdfP0, /SERTIFIKAT PENYELESAIAN QA - P0/);
  assert.match(pdfP0, /Prioritas P0/);
  assert.match(pdfP0, /Versi aplikasi: alpha 0\.1\.0/);
  assert.match(pdfP0, /QA-2026-P0-ABC12345/);
  assert.match(pdfP0, /Penguji: Hasbullah/);

  // Generate P1 certificate with version v.1.0.0
  const p1Subset = cases.filter((c) => c.priority === "P1");
  const p1Stats = statistics(p1Subset, {});
  const pdfP1 = certificatePdf(dummySession, p1Stats, "P1", {
    certificateId: "fedcba98-p1",
    completedAt: "2026-10-13T10:00:00Z",
    build: "v.1.0.0",
    tester: "Hasbullah",
  });

  assert.match(pdfP1, /SERTIFIKAT PENYELESAIAN QA - P1/);
  assert.match(pdfP1, /Prioritas P1/);
  assert.match(pdfP1, /Versi aplikasi: v\.1\.0\.0/);
  assert.match(pdfP1, /QA-2026-P1-FEDCBA98/);

  // Generate overall (all) certificate with version beta
  const allStats = statistics(cases, {});
  const pdfAll = certificatePdf(dummySession, allStats, "all", {
    certificateId: "11223344-all",
    completedAt: "2026-10-13T10:00:00Z",
    build: "beta",
    tester: "Tim QA",
  });

  assert.match(pdfAll, /SERTIFIKAT PENYELESAIAN QA/);
  assert.doesNotMatch(pdfAll, /SERTIFIKAT PENYELESAIAN QA - ALL/);
  assert.match(pdfAll, /Semua Prioritas/);
  assert.match(pdfAll, /Versi aplikasi: beta/);
  assert.match(pdfAll, /QA-2026-11223344/);
});
test("version presets list includes standard release stages", () => {
  assert.ok(versionPresets.includes("alpha 0.1.0"));
  assert.ok(versionPresets.includes("beta 0.1.0"));
  assert.ok(versionPresets.includes("v1.0.0"));
});
test("user backup with P0 Mahasiswa completed can generate role-scoped P0 certificate", () => {
  const backupRaw = JSON.parse(
    readFileSync("docs/qa/uay-qa-v5-backup 131026.json", "utf8"),
  );
  const validated = validateState(backupRaw, ids);
  const userSession = validated.sessions[0];

  // Global P0 across all roles is not complete (83/337)
  const p0AllProg = getPriorityProgress("P0", cases, userSession.records, "all");
  assert.equal(p0AllProg.resolved, 83);
  assert.equal(p0AllProg.total, 337);
  assert.equal(p0AllProg.isComplete, false);

  // But P0 scoped to Mahasiswa is 100% complete (83/83)
  const p0MhsProg = getPriorityProgress(
    "P0",
    cases,
    userSession.records,
    "Mahasiswa",
  );
  assert.equal(p0MhsProg.resolved, 83);
  assert.equal(p0MhsProg.total, 83);
  assert.equal(p0MhsProg.isComplete, true);
  assert.equal(
    isPriorityCompleted("P0", cases, userSession.records, "Mahasiswa"),
    true,
  );

  // Generate certificate for P0 Mahasiswa
  const mhsCases = cases.filter(
    (c) => c.priority === "P0" && c.role === "Mahasiswa",
  );
  const mhsStats = statistics(mhsCases, userSession.records);
  const pdfP0Mhs = certificatePdf(userSession, mhsStats, "P0", {
    certificateId: "user-cert-8899aabb",
    completedAt: "2026-10-13T14:30:00Z",
    build: "alpha 0.1.0",
    tester: userSession.tester,
    role: "Mahasiswa",
  });

  assert.ok(pdfP0Mhs.startsWith("%PDF-1.4"));
  assert.ok(pdfP0Mhs.endsWith("%%EOF"));
  assert.match(pdfP0Mhs, /SERTIFIKAT PENYELESAIAN QA - P0 \\\(MAHASISWA\\\)/);
  assert.match(pdfP0Mhs, /Peran Mahasiswa/);
  assert.match(pdfP0Mhs, /QA-2026-P0-M-USER-CER/);
  assert.match(pdfP0Mhs, /Versi aplikasi: alpha 0\.1\.0/);
});

