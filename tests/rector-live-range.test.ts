import test from "node:test";
import assert from "node:assert/strict";
import React, { act, createElement } from "react";
import { JSDOM } from "jsdom";
import { FixtureDataSource } from "../apps/api/src/rector/fixture.js";
import { options, summary } from "../apps/api/src/rector/reporting.js";

test("rector can switch a fixed end date to a rolling range, including after month change", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "http://127.0.0.1:5173/rector?from=2026-09-01&to=2026-10-08",
  });
  const original = {
    window: globalThis.window,
    document: globalThis.document,
    location: globalThis.location,
    history: globalThis.history,
    Event: globalThis.Event,
    addEventListener: globalThis.addEventListener,
    removeEventListener: globalThis.removeEventListener,
    fetch: globalThis.fetch,
  };
  const snapshot = await new FixtureDataSource().readSnapshot();
  let snapshotAt = "2026-10-08T02:00:00.000Z";
  const queries: URL[] = [];
  Object.assign(globalThis, {
    React,
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    history: dom.window.history,
    Event: dom.window.Event,
    addEventListener: dom.window.addEventListener.bind(dom.window),
    removeEventListener: dom.window.removeEventListener.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async (input: string) => {
      const url = new URL(input, dom.window.location.origin);
      queries.push(url);
      const current = { ...snapshot, snapshotAt };
      const timeZone = "Asia/Singapore";
      const defaults = options(current, timeZone).defaultFilters;
      const meta = {
        timeZone,
        demo: true,
        snapshotAt,
        responseAt: snapshotAt,
        refreshSeconds: 300,
      };
      if (url.pathname.endsWith("/filters"))
        return Response.json({ data: options(current, timeZone), meta });
      if (url.pathname.endsWith("/summary"))
        return Response.json({
          data: summary(current, {
            timeZone,
            semester: defaults.semester,
            from: url.searchParams.get("from") ?? defaults.from,
            to: url.searchParams.get("to") ?? defaults.to,
          }),
          meta,
        });
      throw new Error(`Unexpected report request: ${url.pathname}`);
    },
  });
  const { register } = await import("node:module");
  register(
    "data:text/javascript," +
      encodeURIComponent(
        "export async function load(url, context, nextLoad) { if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true }; return nextLoad(url, context); }",
      ),
    import.meta.url,
  );
  const { createRoot } = await import("react-dom/client");
  const { RectorDashboard } = await import("../apps/web/src/rector/RectorDashboard.js");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const click = async (label: string) => {
    const button = [...dom.window.document.querySelectorAll("button")].find(
      (element) =>
        element.textContent?.trim() === label || element.ariaLabel === label,
    );
    assert.ok(button, `Missing button: ${label}`);
    await act(async () => button.click());
  };
  const lastSummary = () => {
    const url = queries.filter((q) => q.pathname.endsWith("/summary")).at(-1);
    assert.ok(url);
    return url;
  };
  try {
    await act(async () => root.render(createElement(RectorDashboard, { demo: true })));
    assert.equal(lastSummary().searchParams.get("to"), "2026-10-08");

    snapshotAt = "2026-10-10T02:00:00.000Z";
    await click("Muat ulang data");
    assert.equal(lastSummary().searchParams.get("to"), "2026-10-08");

    await click("Ikuti tanggal terbaru");
    assert.equal(dom.window.location.search.includes("to="), false);
    assert.equal(lastSummary().searchParams.has("to"), false);
    assert.match(
      dom.window.document.querySelector(".filter-summary")?.textContent ?? "",
      /10 Okt.*Tanggal akhir otomatis/,
    );

    await click("Reset filter");
    assert.equal(dom.window.location.search.includes("from="), false);
    assert.equal(dom.window.location.search.includes("to="), false);
    assert.equal(lastSummary().searchParams.has("from"), false);
    assert.equal(lastSummary().searchParams.has("to"), false);

    snapshotAt = "2026-11-01T02:00:00.000Z";
    await click("Muat ulang data");
    assert.equal(lastSummary().searchParams.has("from"), false);
    assert.equal(lastSummary().searchParams.has("to"), false);
    assert.match(
      dom.window.document.querySelector(".filter-summary")?.textContent ?? "",
      /1 Okt.*1 Nov.*Tanggal akhir otomatis/,
    );
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, original);
    dom.window.close();
  }
});
