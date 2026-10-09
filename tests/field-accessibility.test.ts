import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { createElement, useContext } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Field, FieldContext } from "../apps/web/src/components/ui/Field.js";

Object.assign(globalThis, { React });
test("field connects its visible label and hint when a select has sibling guidance", () => {
  const html = renderToStaticMarkup(
    createElement(
      Field,
      { label: "Program Studi Sasaran", hint: "Sesuai wewenang Anda." },
      createElement(
        React.Fragment,
        null,
        createElement(
          "select",
          { id: "department" },
          createElement("option", null, "Informatika"),
        ),
        createElement("small", null, "Sasaran dibatasi."),
      ),
    ),
  );
  const dom = new JSDOM(html);
  const select = dom.window.document.querySelector("select")!;
  assert.equal(select.labels?.[0].htmlFor, "department");
  assert.equal(
    dom.window.document.getElementById(select.getAttribute("aria-labelledby")!)!
      .textContent,
    "Program Studi Sasaran",
  );
  assert.equal(
    dom.window.document.getElementById(
      select.getAttribute("aria-describedby")!,
    )!.textContent,
    "Sesuai wewenang Anda.",
  );
  dom.window.close();
});
test("compound controls receive the label association through field context", () => {
  function Compound() {
    const field = useContext(FieldContext)!;
    return createElement(
      "div",
      null,
      createElement("button", null, "Pratinjau"),
      createElement("textarea", {
        id: field.controlId,
        "aria-labelledby": field.labelId,
        "aria-describedby": field.describedBy,
      }),
    );
  }
  const dom = new JSDOM(
    renderToStaticMarkup(
      createElement(
        Field,
        { label: "Petunjuk tugas" },
        createElement(Compound),
      ),
    ),
  );
  const textarea = dom.window.document.querySelector("textarea")!;
  assert.equal(textarea.labels?.[0].htmlFor, textarea.id);
  assert.equal(
    dom.window.document.getElementById(
      textarea.getAttribute("aria-labelledby")!,
    )!.textContent,
    "Petunjuk tugas",
  );
  dom.window.close();
});
