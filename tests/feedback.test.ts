import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { Action } from "../apps/web/src/components/ui/Action.js";
import { Form } from "../apps/web/src/components/ui/Form.js";
import { FeedbackHost } from "../apps/web/src/feedback.js";

Object.assign(globalThis, { React });
test("action feedback survives unmount, prevents concurrent clicks and excludes cancellation or failure", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById("root")!);
  let resolve!: (value: unknown) => void,
    requests = 0;
  let showAction = true;
  const render = (run: () => Promise<unknown>) =>
    createElement(
      React.Fragment,
      null,
      createElement(FeedbackHost),
      showAction &&
        createElement(
          Action,
          {
            run,
            successMessage: "Presensi tersimpan.",
            busyLabel: "Menyimpan…",
          },
          "Simpan",
        ),
    );
  const run = () => {
    requests++;
    return new Promise((done) => {
      resolve = done;
    });
  };
  try {
    await act(async () => root.render(render(run)));
    const button = document.querySelector("button")!;
    await act(async () => {
      button.click();
      button.click();
    });
    assert.equal(requests, 1);
    assert.equal(button.disabled, true);
    assert.match(button.textContent!, /Menyimpan/);
    await act(async () => {
      resolve(undefined);
    });
    showAction = false;
    await act(async () => root.render(render(run)));
    assert.match(
      document.querySelector('[role="status"]')!.textContent!,
      /Presensi tersimpan/,
    );
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>('[aria-label="Tutup pesan"]')!
        .click(),
    );
    showAction = true;
    await act(async () => root.render(render(async () => false)));
    await act(async () => document.querySelector("button")!.click());
    assert.equal(document.querySelector('[role="status"]'), null);
    await act(async () =>
      root.render(
        render(async () => {
          throw new Error("Koneksi gagal. Coba lagi.");
        }),
      ),
    );
    await act(async () => document.querySelector("button")!.click());
    assert.match(
      document.querySelector('[role="alert"]')!.textContent!,
      /Koneksi gagal/,
    );
    assert.equal(document.querySelector('[role="status"]'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("form failures preserve input and successful feedback remains after the editor closes", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    FormData: dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById("root")!);
  let fail = true,
    calls = 0,
    showEditor = true;
  const editor = () =>
    createElement(
      React.Fragment,
      null,
      createElement(FeedbackHost),
      showEditor &&
        createElement(
          Form,
          {
            autosave: false,
            captureFields: false,
            successMessage: "Nilai berhasil disimpan.",
            onSubmit: async () => {
              calls++;
              if (fail) throw new Error("Server belum tersedia.");
            },
          },
          createElement("input", { name: "score", defaultValue: "75" }),
        ),
    );
  try {
    await act(async () => root.render(editor()));
    await act(async () => {
      document
        .querySelector("form")!
        .dispatchEvent(
          new dom.window.Event("submit", { bubbles: true, cancelable: true }),
        );
    });
    assert.equal(calls, 1);
    assert.equal(document.querySelector("input")!.value, "75");
    assert.match(
      document.querySelector('[role="alert"]')!.textContent!,
      /Server belum tersedia/,
    );
    assert.equal(document.querySelector('[role="status"]'), null);
    fail = false;
    await act(async () => {
      document
        .querySelector("form")!
        .dispatchEvent(
          new dom.window.Event("submit", { bubbles: true, cancelable: true }),
        );
      await new Promise((done) => setTimeout(done, 10));
    });
    assert.match(
      document.querySelector('[role="status"]')!.textContent!,
      /Nilai berhasil disimpan/,
    );
    showEditor = false;
    await act(async () => root.render(editor()));
    assert.equal(document.querySelector("form"), null);
    assert.match(
      document.querySelector('[role="status"]')!.textContent!,
      /Nilai berhasil disimpan/,
    );
    assert.equal(calls, 2);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
