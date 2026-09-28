import test from "node:test";
import assert from "node:assert/strict";
import React, { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { indexedDB } from "fake-indexeddb";
import { navigate, routeFromLocation } from "../apps/web/src/router.js";
import { DraftUserContext, useNavigationGuard, useLocalDraft } from "../apps/web/src/useLocalDraft.js";
import { ConfirmationHost } from "../apps/web/src/confirm.js";

test("clean paths retain history and unsaved drafts can cancel both links and Back", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/#/classes/example" });
  Object.assign(globalThis, {
    React, window: dom.window, document: dom.window.document,
    history: dom.window.history, location: dom.window.location,
    Event: dom.window.Event, indexedDB, IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  assert.equal(routeFromLocation(), "/classes/example");
  assert.equal(location.hash, "");
  let edit!: (v: string) => void;
  function Editor() {
    useNavigationGuard();
    const [value, setValue] = useState("saved");
    edit = setValue;
    useLocalDraft("navigation-test", value, setValue);
    return createElement(React.Fragment, {},
      createElement("a", { href: "/agenda" }, "Agenda"),
      createElement(ConfirmationHost));
  }
  const root = createRoot(document.getElementById("root")!);
  const settle = () => act(async () => { await new Promise(r => setTimeout(r, 60)); });
  const answer = async (label: string) => {
    await act(async () => {
      const button = [...document.querySelectorAll("dialog button")].find(b => b.textContent === label) as HTMLButtonElement;
      assert.ok(button, `confirmation button ${label}`);
      button.click();
    });
    await settle();
  };
  try {
    await act(async () => root.render(createElement(DraftUserContext.Provider, { value: "navigation-test-user" }, createElement(Editor))));
    await act(async () => navigate("/profile"));
    assert.equal(location.pathname, "/profile");
    history.back(); await settle();
    assert.equal(location.pathname, "/classes/example");
    await act(async () => edit("unsaved"));
    await act(async () => (document.querySelector("a") as HTMLAnchorElement).click());
    await answer("Batal");
    assert.equal(location.pathname, "/classes/example");
    await act(async () => (document.querySelector("a") as HTMLAnchorElement).click());
    await answer("Lanjutkan");
    assert.equal(location.pathname, "/agenda");
    history.back(); await settle();
    await answer("Batal");
    assert.equal(location.pathname, "/agenda");
    history.back(); await settle();
    await answer("Lanjutkan");
    assert.equal(location.pathname, "/classes/example");
    await act(async () => edit("saved"));
    history.forward(); await settle();
    assert.equal(location.pathname, "/agenda");
    navigate("https://other.example/", true);
    assert.equal(location.origin, "http://localhost");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
