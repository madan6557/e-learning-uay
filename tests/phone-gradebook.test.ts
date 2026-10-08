import test from "node:test";
import assert from "node:assert/strict";
import React, { act, createElement } from "react";
import { JSDOM } from "jsdom";

test("phone grade records keep administrative views read-only and route edits to the correct student/category", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    React,
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const { createRoot } = await import("react-dom/client");
  const { PhoneGradeRecord, GradebookEditor } =
    await import("../apps/web/src/Gradebook.js");
  const root = createRoot(document.getElementById("root")!);
  const row = {
    user: { id: "student-a", name: "Mahasiswa A", identifierValue: "001" },
    categoryScores: [
      { categoryId: "uts", name: "UTS", source: "MANUAL", score: 70 },
      {
        categoryId: "progress",
        name: "Progres",
        source: "PROGRESS",
        score: 50,
      },
    ],
    progress: 50,
    finalScore: 60,
    gradeLetter: "C",
    record: null,
    pending: [],
  };
  const edits: unknown[] = [];
  let reviews = 0;
  const props = {
    row,
    changes: { "student-a:uts": { score: "83" } },
    onScoreChange: (userId: string, category: any, score: string) =>
      edits.push([userId, category.categoryId, score]),
    onReview: () => {
      reviews++;
    },
  };
  try {
    await act(async () =>
      root.render(
        createElement(PhoneGradeRecord, { ...props, writable: false }),
      ),
    );
    assert.equal(document.querySelectorAll("input, button").length, 0);
    assert.match(document.body.textContent!, /70.00/);
    await act(async () =>
      root.render(
        createElement(PhoneGradeRecord, { ...props, writable: true }),
      ),
    );
    const input = document.querySelector<HTMLInputElement>("input")!;
    assert.equal(
      document.querySelectorAll("input").length,
      1,
      "progress is never editable",
    );
    assert.equal(
      input.value,
      "83",
      "local unsaved score survives changing layout",
    );
    assert.equal(input.getAttribute("aria-label"), "Mahasiswa A · UTS");
    Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "91");
    await act(async () =>
      input.dispatchEvent(
        new dom.window.FocusEvent("focusout", { bubbles: true }),
      ),
    );
    assert.deepEqual(edits, [["student-a", "uts", "91"]]);
    await act(async () =>
      document.querySelector<HTMLButtonElement>("button")!.click(),
    );
    assert.equal(reviews, 1);
    let paginationChanges = 0;
    await act(async () =>
      root.render(
        createElement(GradebookEditor, {
          writable: false,
          onSubmit: async () =>
            assert.fail("administrative view must not submit grades"),
          children: createElement(
            "select",
            {
              "aria-label": "Jumlah baris per halaman",
              defaultValue: "10",
              onChange: () => paginationChanges++,
            },
            createElement("option", { value: "10" }, "10"),
            createElement("option", { value: "25" }, "25"),
          ),
        }),
      ),
    );
    assert.equal(
      document.querySelectorAll("form, button[type=submit], fieldset[disabled]")
        .length,
      0,
    );
    const pageSize = document.querySelector<HTMLSelectElement>("select")!;
    assert.equal(
      pageSize.disabled,
      false,
      "read-only reports must retain working pagination",
    );
    await act(async () => {
      pageSize.value = "25";
      pageSize.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(paginationChanges, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
