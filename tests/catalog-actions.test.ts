import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { Catalog } from "../apps/web/src/pages.js";
import { ConfirmationHost } from "../apps/web/src/confirm.js";
import { FeedbackHost } from "../apps/web/src/feedback.js";
import { readCache } from "../apps/web/src/readCache.js";

Object.assign(globalThis, { React });

test("catalog deletion requires confirmation, prevents duplicate requests and reports server results", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    sessionStorage: dom.window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  const originalFetch = globalThis.fetch;
  let courses = [
    {
      id: "qa-course",
      code: "QA101",
      title: "Mata kuliah uji",
      departmentCode: "IF",
      credits: 3,
      status: "DRAFT",
      _count: { classes: 0, questionBanks: 0 },
    },
  ];
  let writes = 0;
  let finish!: (response: Response) => void;
  const response = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  globalThis.fetch = async (_url, init) => {
    if (init?.method === "DELETE") {
      writes++;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return response(courses);
  };
  readCache.clear();
  await readCache.load("/courses", 30000, async () => courses);
  const root = createRoot(document.getElementById("root")!);
  const remove = () =>
    document.querySelector<HTMLButtonElement>(
      'button[aria-label="Hapus QA101 · Mata kuliah uji"]',
    )!;
  const confirmButton = (text: string) =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>("dialog button"),
    ).find((button) => button.textContent === text)!;
  try {
    await act(async () =>
      root.render(
        createElement(
          React.Fragment,
          null,
          createElement(ConfirmationHost),
          createElement(FeedbackHost),
          createElement(Catalog, {
            user: { id: "admin", role: "SUPER_ADMIN" },
          }),
        ),
      ),
    );
    assert.equal(
      document.querySelectorAll(".catalog-table td[data-label]").length,
      4,
    );
    await act(async () => {
      remove().focus();
      remove().click();
    });
    await act(async () => confirmButton("Batal").click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
    assert.ok(
      document.activeElement === remove(),
      "cancelling restores keyboard focus to the action",
    );
    assert.equal(writes, 0);
    assert.equal(document.querySelector('[role="status"]'), null);
    await act(async () => remove().click());
    await act(async () => confirmButton("Lanjutkan").click());
    assert.equal(writes, 1);
    assert.equal(remove().disabled, true);
    await act(async () => remove().click());
    assert.equal(writes, 1);
    assert.equal(document.querySelector('[role="status"]'), null);
    await act(async () =>
      finish(response({ error: { code: "CONFLICT" } }, 409)),
    );
    assert.ok(document.querySelector('[role="alert"]'));
    assert.ok(
      remove(),
      "failed deletion must retain the course and retry action",
    );
    await act(async () => remove().click());
    await act(async () => confirmButton("Lanjutkan").click());
    courses = [];
    await act(async () => finish(response({ ok: true })));
    assert.equal(writes, 2);
    assert.equal(remove(), null);
    assert.match(
      document.querySelector('[role="status"]')!.textContent!,
      /Mata kuliah dihapus/,
    );
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    readCache.clear();
    dom.window.close();
  }
});
