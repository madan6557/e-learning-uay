import test from "node:test";
import assert from "node:assert/strict";
import React, { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { helpArticlesForRole } from "../apps/web/src/data/helpArticles.js";

test("standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1:5173/Panduan/panduan.html?role=SUPER_ADMIN",
  });
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, {
    React,
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.getElementById("root")!);
  try {
    const { GuidePage } = await import("../apps/web/src/GuidePage.js");
    for (const role of [
      "STUDENT",
      "INSTRUCTOR",
      "DEPARTMENT_ADMIN",
      "SUPER_ADMIN",
      "RECTOR",
      "UNKNOWN",
      "__proto__",
      null,
    ]) {
      await act(async () =>
        root.render(createElement(GuidePage, { user: role ? { role } : null })),
      );
      const ids = [...dom.window.document.querySelectorAll("article")].map(
        (a) => a.id.replace("panduan-", ""),
      );
      assert.deepEqual(
        ids,
        helpArticlesForRole(role).map((a) => a.id),
      );
      assert.equal(
        dom.window.document.querySelectorAll(
          'input[type="checkbox"], [data-step], select',
        ).length,
        0,
      );
      if (role === "RECTOR") {
        assert.doesNotMatch(
          dom.window.document.body.textContent!,
          /Menetapkan kebijakan skala nilai|Menambahkan mata kuliah/,
        );
        assert.match(
          dom.window.document.body.textContent!,
          /00.00 sampai 24.00|zona waktu perangkat/,
        );
      }
    }
    assert.equal(dom.window.document.querySelectorAll("article").length, 0);
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
