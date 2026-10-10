import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import {
  ThemeProvider,
  THEME_STORAGE_KEY,
} from "../apps/web/src/contexts/ThemeContext.js";
import {
  ThemeToggle,
  ThemePreferenceControl,
} from "../apps/web/src/components/layout/ThemeToggle.js";

Object.assign(globalThis, { React });

function setup(dark: boolean) {
  const dom = new JSDOM(
    '<meta name="theme-color" content="#183d32"><div id="root"></div>',
    { url: "http://localhost" },
  );
  const listeners = new Set<() => void>();
  const media = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  dom.window.matchMedia = (() => media) as any;
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const root = createRoot(document.getElementById("root")!);
  const render = () =>
    act(async () =>
      root.render(
        createElement(
          ThemeProvider,
          {},
          createElement(ThemeToggle),
          createElement(ThemePreferenceControl),
        ),
      ),
    );
  return { dom, root, render, media, listeners };
}

test("theme follows system, persists manual choices, restores system mode, and syncs tabs", async () => {
  const { dom, root, render, media, listeners } = setup(true);
  try {
    await render();
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(
      document.querySelector("button")!.getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      document
        .querySelector('meta[name="theme-color"]')!
        .getAttribute("content"),
      "#0f1724",
    );
    await act(async () => document.querySelector("button")!.click());
    assert.equal(document.documentElement.dataset.theme, "light");
    assert.equal(dom.window.localStorage.getItem(THEME_STORAGE_KEY), "light");
    await act(async () => {
      media.matches = false;
      listeners.forEach((fn) => fn());
    });
    await act(async () => {
      media.matches = true;
      listeners.forEach((fn) => fn());
    });
    assert.equal(
      document.documentElement.dataset.theme,
      "light",
      "manual choice wins over system changes",
    );
    await act(async () => {
      const select = document.querySelector("select")!;
      select.value = "system";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(dom.window.localStorage.getItem(THEME_STORAGE_KEY), null);
    await act(async () => {
      media.matches = false;
      listeners.forEach((fn) => fn());
    });
    assert.equal(document.documentElement.dataset.theme, "light");
    await act(async () => {
      dom.window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
      dom.window.dispatchEvent(
        new dom.window.StorageEvent("storage", {
          key: THEME_STORAGE_KEY,
          newValue: "dark",
        }),
      );
    });
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(document.querySelector("select")!.value, "dark");
  } finally {
    await act(async () => root.unmount());
    assert.equal(listeners.size, 0, "media listener is removed on unmount");
    dom.window.close();
  }
});

test("saved theme is restored and theme still switches when storage is blocked", async () => {
  const { dom, root, render } = setup(false);
  dom.window.localStorage.setItem(THEME_STORAGE_KEY, "dark");
  try {
    await render();
    assert.equal(document.documentElement.dataset.theme, "dark");
    Object.defineProperty(dom.window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("storage blocked");
      },
    });
    await act(async () => document.querySelector("button")!.click());
    assert.equal(document.documentElement.dataset.theme, "light");
    await act(async () => document.querySelector("button")!.click());
    assert.equal(document.documentElement.dataset.theme, "dark");
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("both HTML entry points apply saved or system theme before rendering", async () => {
  const script = await readFile(
    new URL("../apps/web/public/theme-init.js", import.meta.url),
    "utf8",
  );
  for (const file of [
    "../apps/web/index.html",
    "../apps/web/Panduan/panduan.html",
  ]) {
    const html = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(html, /<script src="\/theme-init\.js"><\/script>/);
    assert.ok(html.indexOf("/theme-init.js") < html.indexOf('type="module"'));
    for (const saved of [null, "light", "dark", "invalid"]) {
      const dom = new JSDOM('<meta name="theme-color">', {
        url: "http://localhost",
        runScripts: "outside-only",
      });
      dom.window.matchMedia = (() => ({ matches: true })) as any;
      if (saved) dom.window.localStorage.setItem(THEME_STORAGE_KEY, saved);
      dom.window.eval(script);
      assert.equal(
        dom.window.document.documentElement.dataset.theme,
        saved === "light" ? "light" : "dark",
      );
      dom.window.close();
    }
  }
});

test("dark text and status palettes have readable contrast and screen-only colors", async () => {
  const css = await readFile(
    new URL("../apps/web/src/theme.css", import.meta.url),
    "utf8",
  );
  const tokens = new Map(
    [...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
  const value = (token: string): string => {
    const color = tokens.get(token)!;
    assert.ok(color, `${token} must exist`);
    return color.startsWith("var(") ? value(color.slice(4, -1)) : color;
  };
  const luminance = (color: string) => {
    assert.match(color, /^#[\da-f]{6}$/i);
    const rgb = [1, 3, 5]
      .map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const contrast = (a: string, b: string) => {
    const l = [luminance(a), luminance(b)].sort((a, b) => b - a);
    return (l[0] + 0.05) / (l[1] + 0.05);
  };
  for (const text of ["--foreground", "--muted-foreground", "--primary"]) {
    for (const surface of ["--background", "--surface", "--surface-muted"]) {
      assert.ok(
        contrast(value(text), value(surface)) >= 4.5,
        `${text} on ${surface}`,
      );
    }
  }
  for (const status of [
    "danger",
    "info",
    "success",
    "warning",
    "teal",
    "violet",
  ]) {
    assert.ok(
      contrast(
        value(`--adaptive-${status}-text`),
        value(`--adaptive-${status}-soft`),
      ) >= 4.5,
      `${status} status`,
    );
    assert.ok(
      contrast("#ffffff", value(`--adaptive-${status}-fill`)) >= 4.5,
      `${status} solid fill`,
    );
  }
  for (const chart of [
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--chart-neutral",
    "--chart-violet",
  ]) {
    assert.ok(
      contrast(value(chart), value("--surface")) >= 3,
      `${chart} on chart surface`,
    );
  }
  assert.ok(
    css.indexOf("@media screen") < css.indexOf(':root[data-theme="dark"]'),
  );
});
