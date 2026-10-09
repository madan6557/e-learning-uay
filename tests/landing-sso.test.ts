import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "../apps/web/src/pages/Landing.js";

Object.assign(globalThis, { React });

test("Vercel demo landing only opens the account picker through the SSO button", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://e-learning-uay.vercel.app/",
  });
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method?: string; body?: string }> = [];
  let destination = "";
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    sessionStorage: dom.window.sessionStorage,
    location: {
      pathname: "/",
      search: "",
      assign: (url: string) => {
        destination = url;
      },
    },
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async (input: string, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: init?.method,
        body: init?.body as string,
      });
      return new Response(
        JSON.stringify({
          authorizationUrl: "https://sso.example.test/authorize",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    },
  });
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () =>
      root.render(
        createElement(Landing, {
          config: { mode: "oidc", demoEnabled: true },
        }),
      ),
    );
    assert.equal(
      requests.length,
      0,
      "opening landing must not request test accounts",
    );
    assert.doesNotMatch(
      document.body.textContent!,
      /Pilih akun|Akun Uji|Masuk sebagai/,
    );
    const buttons = document.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Masuk dengan SSO UAY"]',
    );
    assert.equal(buttons.length, 2);
    await act(async () => buttons[1].click());
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "/api/v1/auth/authorization");
    assert.equal(requests[0].method, "POST");
    assert.doesNotMatch(requests[0].body ?? "", /demoUserId|userId/);
    assert.equal(destination, "https://sso.example.test/authorize");
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    dom.window.close();
  }
});
