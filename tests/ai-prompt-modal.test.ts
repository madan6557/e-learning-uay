import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import { AiPromptModal } from "../apps/web/src/components/ui/AiPromptModal.js";
import { ConfirmationHost } from "../apps/web/src/confirm.js";

Object.assign(globalThis, { React });
// React detects input-event support when its DOM renderer is first loaded.
const initialDom = new JSDOM("<body></body>");
Object.assign(globalThis, {
  window: initialDom.window,
  document: initialDom.window.document,
});
const { createRoot } = await import("react-dom/client");
initialDom.window.close();
const templates = {
  assignment: {
    id: "assignment",
    title: "Tugas kuliah",
    subtitle: "Petunjuk tugas",
    downloadUrl: "/prompt.txt",
    downloadFileName: "prompt.txt",
    promptText: "Buat tugas [topik].",
    sampleHtml: "<p>Contoh tugas</p>",
  },
};

function setup() {
  const dom = new JSDOM(
    '<div id="root"></div><dialog open id="editor"><button id="trigger">Prompt AI</button></dialog>',
    { url: "http://localhost" },
  );
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  const root = createRoot(document.getElementById("root")!);
  const button = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>("button")].find(
      (item) => item.textContent === text,
    )!;
  return { dom, root, button };
}

test("cancelling a nested prompt retains the editor and returns focus to its trigger", async () => {
  const { dom, root } = setup();
  let inserted = false;
  document.getElementById("trigger")!.focus();
  try {
    await act(async () =>
      root.render(
        createElement(AiPromptModal, {
          templates,
          initialTemplate: "assignment",
          hasContent: true,
          onInsert: () => {
            inserted = true;
          },
          onClose: () => root.render(null),
        }),
      ),
    );
    const prompt =
      document.querySelector<HTMLDialogElement>(".ai-prompt-modal")!;
    const titleId = prompt.getAttribute("aria-labelledby")!;
    assert.match(
      document.getElementById(titleId)!.textContent!,
      /Template Prompt AI/,
    );
    await act(async () =>
      prompt.dispatchEvent(
        new dom.window.Event("cancel", { cancelable: true }),
      ),
    );
    await new Promise((done) => setTimeout(done, 10));
    assert.equal(document.querySelectorAll("dialog[open]").length, 1);
    assert.equal(document.activeElement?.id, "trigger");
    assert.equal(inserted, false);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("clipboard failure shows manual recovery and successful retry confirms the copy", async () => {
  const { dom, root, button } = setup();
  let fail = true,
    copied = "";
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: async (text: string) => {
        if (fail) throw new Error("Denied");
        copied = text;
      },
    },
  });
  try {
    await act(async () =>
      root.render(
        createElement(AiPromptModal, {
          templates,
          initialTemplate: "assignment",
          hasContent: false,
          onInsert: () => {},
          onClose: () => {},
        }),
      ),
    );
    await act(async () => button("Salin prompt AI").click());
    assert.match(
      document.querySelector('[role="alert"]')!.textContent!,
      /Salin teks prompt secara manual atau unduh/,
    );
    const prompt =
      document.querySelector<HTMLTextAreaElement>(".ai-prompt-text")!;
    assert.equal(document.activeElement, prompt);
    assert.equal(prompt.selectionEnd, templates.assignment.promptText.length);
    fail = false;
    await act(async () => button("Salin prompt AI").click());
    assert.equal(copied, templates.assignment.promptText);
    assert.ok(button("Prompt berhasil disalin"));
    assert.equal(document.querySelector('[role="alert"]'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("replacing existing content requires confirmation and cancellation preserves it", async () => {
  const { dom, root, button } = setup();
  let content = "Isian asli",
    closed = 0;
  try {
    await act(async () =>
      root.render(
        createElement(
          React.Fragment,
          null,
          createElement(ConfirmationHost),
          createElement(AiPromptModal, {
            templates,
            initialTemplate: "assignment",
            hasContent: true,
            onInsert: (html) => {
              content = html;
            },
            onClose: () => {
              closed++;
            },
          }),
        ),
      ),
    );
    await act(async () => button(" Sisipkan contoh format").click());
    assert.match(
      document.querySelector(".confirm-dialog")!.textContent!,
      /Isian saat ini akan diganti/,
    );
    await act(async () => button("Batal").click());
    assert.equal(content, "Isian asli");
    assert.equal(closed, 0);
    await act(async () => button(" Sisipkan contoh format").click());
    await act(async () => button("Lanjutkan").click());
    assert.equal(content, templates.assignment.sampleHtml);
    assert.equal(closed, 1);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
