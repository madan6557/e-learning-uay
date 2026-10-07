import test from "node:test";
import assert from "node:assert/strict";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useSessionExpiry } from "../apps/web/src/useSessionExpiry.js";

test("session expiry uses the identity after login and removes its listener on unmount", async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = { window: globalThis.window, document: globalThis.document };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(dom.window.document.getElementById("root")!);
  const expiredIdentities: (string | null)[] = [];
  function Harness({ identity }: { identity: string | null }) {
    useSessionExpiry(() => expiredIdentities.push(identity));
    return null;
  }
  const expire = () =>
    dom.window.dispatchEvent(new dom.window.Event("session-expired"));
  try {
    await act(async () =>
      root.render(createElement(Harness, { identity: null })),
    );
    await act(async () =>
      root.render(createElement(Harness, { identity: "super-admin" })),
    );
    await act(async () => {
      expire();
    });
    assert.deepEqual(expiredIdentities, ["super-admin"]);
    await act(async () =>
      root.render(createElement(Harness, { identity: null })),
    );
    await act(async () => {
      expire();
    });
    assert.deepEqual(expiredIdentities, ["super-admin", null]);
  } finally {
    await act(async () => root.unmount());
    expire();
    assert.equal(
      expiredIdentities.length,
      2,
      "unmounted shells must stop receiving session events",
    );
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
