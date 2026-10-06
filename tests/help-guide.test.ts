import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React, { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { helpArticles, helpArticlesForRole, type HelpRole } from "../apps/web/src/data/helpArticles.js";

const tutorialIds = (role: unknown) => helpArticlesForRole(role).filter(article => /^[UMDAS]\d+$/.test(article.id)).map(article => article.id);
const sequence = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
test("guide exposes only common and assigned tutorials for each account role", () => {
  const common = sequence("U", 3);
  assert.deepEqual(tutorialIds("STUDENT"), [...common, ...sequence("M", 6)]);
  assert.deepEqual(tutorialIds("INSTRUCTOR"), [...common, ...sequence("D", 16), "A3", "A4"]);
  assert.deepEqual(tutorialIds("DEPARTMENT_ADMIN"), [...common, ...sequence("A", 5)]);
  assert.deepEqual(tutorialIds("SUPER_ADMIN"), [...common, "A2", "A3", "A4", "A5", ...sequence("S", 3)]);
  for (const role of [null, undefined, "UNKNOWN", "student", "__proto__"]) assert.deepEqual(helpArticlesForRole(role), []);
});

test("33 imported tutorials retain their steps, control tables and packaged screenshots", () => {
  const tutorials = helpArticles.filter(article => article.figure);
  assert.equal(tutorials.length, 33);
  assert.equal(tutorials.reduce((sum, article) => sum + article.steps!.length, 0), 171);
  assert.equal(new Set(helpArticles.map(article => article.id)).size, helpArticles.length);
  for (const article of tutorials) {
    assert.ok(article.location && article.preparation && article.result);
    assert.ok(article.controls!.length > 0);
    assert.match(article.figure!.src, /^\/help\/tutorial\/[\w-]+\.png$/);
    const image = readFileSync(resolve("apps/web/public", article.figure!.src.slice(1)));
    assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  }
  assert.doesNotMatch(JSON.stringify(helpArticles), /file:\/\/|<script|data-step|localStorage|25 MB|label WIB|masih menampilkan WIB|label menyebut digit|belum otomatis mengubah/i);
  // Original image filenames are retained; the text users read must use the current terminology.
  const visibleText = JSON.stringify(helpArticles, (key, value) => key === "src" ? undefined : value);
  assert.doesNotMatch(visibleText, /6[- ]digit|\bPIN\b/i);
});

test("help search and article detail contain no checklist and role changes hide an open article and image", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://127.0.0.1:5173/help" });
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, { React, window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", { value() { this.setAttribute("open", ""); } });
  const { createRoot } = await import("react-dom/client");
  const { HelpPage } = await import("../apps/web/src/HelpPage.js");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const render = async (role: HelpRole | string) => act(async () => root.render(createElement(HelpPage, { user: { role } })));
  const search = async (value: string) => {
    const input = dom.window.document.querySelector<HTMLInputElement>('input[type="search"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  };
  try {
    for (const [role, count] of [["STUDENT", 20], ["INSTRUCTOR", 31], ["DEPARTMENT_ADMIN", 18], ["SUPER_ADMIN", 20]] as const) {
      await render(role);
      assert.match(dom.window.document.body.textContent!, new RegExp(`Menampilkan ${count} panduan`));
      assert.equal(dom.window.document.querySelectorAll('input[type="checkbox"], [data-filter], [data-step]').length, 0);
    }
    await render("STUDENT");
    await search("S3");
    assert.equal(dom.window.document.querySelectorAll(".help-guide-link").length, 0);
    await search("M2");
    assert.equal(dom.window.document.querySelectorAll(".help-guide-link").length, 1);
    await act(async () => (dom.window.document.querySelector(".help-guide-link") as HTMLButtonElement).click());
    assert.equal(dom.window.document.activeElement, dom.window.document.querySelector("h2"));
    assert.equal(dom.window.document.querySelectorAll("ol li").length, 5);
    assert.ok(dom.window.document.querySelector(".help-guide-table tbody th"));
    assert.equal(dom.window.document.querySelectorAll('input[type="checkbox"], [data-step]').length, 0);
    await act(async () => (dom.window.document.querySelector(".button.secondary") as HTMLButtonElement).click());
    assert.equal(dom.window.document.activeElement, dom.window.document.querySelector(".help-guide-link"));
    await act(async () => (dom.window.document.querySelector(".help-guide-link") as HTMLButtonElement).click());
    await act(async () => (dom.window.document.querySelector(".help-guide-image") as HTMLButtonElement).click());
    assert.ok(dom.window.document.querySelector("dialog .help-guide-zoom"));
    await render("SUPER_ADMIN");
    assert.equal(dom.window.document.querySelector("dialog"), null);
    assert.doesNotMatch(dom.window.document.body.textContent!, /Mengisi presensi satu klik atau kode/);
    await search("ambang kehadiran");
    const policy = [...dom.window.document.querySelectorAll<HTMLButtonElement>(".help-guide-link")].find(button => button.textContent!.includes("Menetapkan kebijakan"));
    assert.ok(policy);
    await act(async () => policy.click());
    assert.match(dom.window.document.body.textContent!, /Perubahan ambang tersimpan langsung dipakai/);
    assert.doesNotMatch(dom.window.document.body.textContent!, /belum otomatis/);
    for (const role of ["UNKNOWN", "__proto__"]) {
      await render(role);
      assert.equal(dom.window.document.querySelectorAll(".help-guide-link, .help-guide-image").length, 0);
    }
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
