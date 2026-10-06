import test from "node:test";
import assert from "node:assert/strict";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { AcademicGovernanceModal } from "../apps/web/src/pages.js";
import { uploadFile } from "../apps/web/src/lib.js";

Object.assign(globalThis, { React });
const config = { academicYear: "2026/2027 Ganjil", academicYears: ["2026/2027 Ganjil"],
  semesterLabel: "SEMESTER GANJIL 2026/2027", defaultGradeScaleVersion: "2026.1", minAttendancePercentage: 75 };

test("Admin Prodi's governance view disables fields and omits the save action", () => {
  const html = renderToStaticMarkup(createElement(AcademicGovernanceModal, {
    config, readOnly: true, onClose() {}, onSaved() {},
  }));
  assert.match(html, /fieldset disabled/);
  assert.match(html, /hanya dapat diubah oleh Super Admin/);
  assert.doesNotMatch(html, /Simpan Perubahan Kebijakan/);
});

test("governance form displays save failures and calls onSaved only after the server confirms", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://127.0.0.1:5173" });
  const previous = { window: globalThis.window, document: globalThis.document, fetch: globalThis.fetch };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", {
    value() { this.setAttribute("open", ""); },
  });
  let saved = 0;
  let close = 0;
  const root = createRoot(dom.window.document.getElementById("root")!);
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), { status: 403 });
    await act(async () => root.render(createElement(AcademicGovernanceModal, {
      config, readOnly: false, onClose() { close++; }, onSaved() { saved++; },
    })));
    const submit = () => dom.window.document.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    await act(async () => { submit(); });
    assert.equal(saved, 0);
    assert.equal(close, 0);
    assert.doesNotMatch(dom.window.document.body.textContent!, /berhasil disimpan/);
    assert.ok(dom.window.document.querySelector(".notice"));
    let confirm!: (response: Response) => void;
    globalThis.fetch = () => new Promise(resolve => { confirm = resolve; });
    await act(async () => { submit(); });
    assert.equal(saved, 0);
    assert.match(dom.window.document.body.textContent!, /Menyimpan/);
    await act(async () => { confirm(new Response(JSON.stringify(config), { status: 200 })); });
    assert.equal(saved, 1);
    assert.match(dom.window.document.body.textContent!, /berhasil disimpan/);
    await new Promise(resolve => setTimeout(resolve, 550));
    assert.equal(close, 1);
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});

test("oversized uploads are rejected before reading the file", async () => {
  let reads = 0;
  const file = { size: 5 * 1024 * 1024 + 1, arrayBuffer() { reads++; throw new Error("must not read"); } } as unknown as File;
  await assert.rejects(() => uploadFile(file, "class", "COVER", undefined, () => {}), (error: any) => error.code === "FILE_TYPE_OR_SIZE");
  assert.equal(reads, 0);
});
