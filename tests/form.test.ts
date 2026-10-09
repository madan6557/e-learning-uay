import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { indexedDB } from "fake-indexeddb";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { Form } from "../apps/web/src/lib.js";
import { Profile } from "../apps/web/src/pages.js";
import { DraftUserContext } from "../apps/web/src/useLocalDraft.js";
import { removeDraft } from "../apps/web/src/drafts.js";

// The app build supplies the automatic JSX runtime; tsx's Node test runner
// transpiles these components with the classic runtime.
Object.assign(globalThis, { React });

test("a form returns to clean after its initial value is restored", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/#/classes/test",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    FormData: dom.window.FormData,
    indexedDB,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () => {
      root.render(
        createElement(
          DraftUserContext.Provider,
          { value: "form-test-user" },
          createElement(
            Form,
            { draftKey: "revert", onSubmit: async () => undefined },
            createElement(
              "select",
              { name: "status", defaultValue: "DRAFT" },
              createElement("option", { value: "DRAFT" }, "Draft"),
              createElement("option", { value: "PUBLISHED" }, "Terbit"),
            ),
          ),
        ),
      );
    });
    const form = document.querySelector("form")!;
    const select = document.querySelector("select")!;
    assert.equal(form.dataset.dirty, undefined);
    assert.equal(
      document.querySelector(".save-status")!.textContent,
      "Belum ada perubahan",
    );

    await act(async () => {
      select.value = "PUBLISHED";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(form.dataset.dirty, "true");

    await act(async () => {
      select.value = "DRAFT";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(form.dataset.dirty, undefined);
    assert.equal(
      document.querySelector(".save-status")!.textContent,
      "Belum ada perubahan",
    );
    await act(async () => {
      form.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
      await new Promise((done) => setTimeout(done, 20));
    });
    assert.equal(
      document.querySelector(".save-status")!.textContent,
      "Tersimpan di server",
    );
  } finally {
    await act(async () => root.unmount());
    await removeDraft("form-test-user");
    dom.window.close();
  }
});

test("profile only links to a configured account-management page", async () => {
  const user = {
    id: "profile-test-user",
    ssoUserId: "00000000-0000-4000-8000-000000000001",
    name: "Contoh Pengguna",
    email: "contoh@example.test",
    role: "STUDENT",
    status: "ACTIVE",
    userType: "STUDENT",
    identifierType: "NIM",
    identifierValue: "202600001",
  };
  const { renderToStaticMarkup } = await import("react-dom/server");
  const withoutUrl = renderToStaticMarkup(createElement(Profile, { user }));
  assert.match(withoutUrl, /Tautan pengelolaan akun SSO belum tersedia/);
  assert.doesNotMatch(withoutUrl, /Kelola akun SSO/);

  const withUrl = renderToStaticMarkup(
    createElement(Profile, {
      user,
      accountUrl: "https://sso.example.test/account",
    }),
  );
  assert.match(withUrl, /href="https:\/\/sso\.example\.test\/account"/);
});

test("publication form submits the selected intent and keeps native validation", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/classes/test",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    FormData: dom.window.FormData,
    Event: dom.window.Event,
    indexedDB,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const calls: { title: unknown; intent: string }[] = [];
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () =>
      root.render(
        createElement(
          Form,
          {
            autosave: false,
            publication: { published: false },
            onCancel: () => {},
            onSubmit: async (data: FormData, intent: string) => {
              calls.push({ title: data.get("title"), intent });
            },
          },
          createElement("input", { name: "title", required: true }),
        ),
      ),
    );
    const buttons = [...document.querySelectorAll("button")];
    assert.deepEqual(
      buttons.map((b) => b.textContent),
      ["Batal", "Simpan dan Publikasikan", "Simpan Sebagai Draf"],
    );
    await act(async () => buttons[1].click());
    assert.equal(calls.length, 0);
    document.querySelector("input")!.value = "Artikel";
    for (const button of [buttons[2], buttons[1]]) {
      await act(async () => {
        button.click();
        await new Promise((r) => setTimeout(r, 20));
      });
    }
    assert.deepEqual(calls, [
      { title: "Artikel", intent: "draft" },
      { title: "Artikel", intent: "publish" },
    ]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("withdrawing bypasses content submission and locks actions until completion", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://localhost/classes/test",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    FormData: dom.window.FormData,
    Event: dom.window.Event,
    indexedDB,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  let submits = 0,
    withdrawals = 0;
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () =>
      root.render(
        createElement(
          Form,
          {
            autosave: false,
            onCancel: () => {},
            publication: {
              published: true,
              onUnpublish: async () => {
                withdrawals++;
                await pending;
              },
            },
            onSubmit: async () => {
              submits++;
            },
          },
          createElement("input", { name: "title", required: true }),
        ),
      ),
    );
    const buttons = [...document.querySelectorAll("button")];
    assert.equal(buttons[2].textContent, "Tarik Publikasi");
    await act(async () => buttons[2].click());
    assert.equal(withdrawals, 1);
    assert.equal(submits, 0);
    assert.ok(buttons.every((button) => button.disabled));
    await act(async () => {
      buttons[2].click();
      finish();
      await pending;
    });
    assert.equal(withdrawals, 1);
    assert.ok(buttons.every((button) => !button.disabled));
    assert.equal(document.querySelector("input")!.value, "");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
