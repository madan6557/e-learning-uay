import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { DepartmentGovernancePage } from "../apps/web/src/DepartmentGovernancePage.js";
import { readCache } from "../apps/web/src/readCache.js";
Object.assign(globalThis, { React });

test("governance UI keeps failed edits in the modal, guards duplicate submits and automatically applies role filters", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  readCache.clear();
  const originalFetch = globalThis.fetch,
    requests: string[] = [];
  let writes = 0,
    rejectWrite!: () => void;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push(url);
    if (init?.method === "PUT") {
      writes++;
      return await new Promise((resolve) => {
        rejectWrite = () =>
          resolve(
            new Response(
              JSON.stringify({ error: { code: "DEPARTMENT_CODE_IN_USE" } }),
              { status: 409 },
            ),
          );
      });
    }
    return new Response(
      JSON.stringify(
        url.includes("department-scopes")
          ? [
              {
                id: "lecturer",
                name: "Dosen SSO",
                identifierValue: "111",
                identifierType: "NIDN",
                email: "dosen@example.test",
                username: "dosen",
                role: "INSTRUCTOR",
                departmentScopes: ["IF"],
                status: "ACTIVE",
                lastLoginAt: null,
                ssoUserId: "real-sso-subject",
                authoritySource: "SSO",
                authorityVersion: "a".repeat(64),
              },
            ]
          : [
              {
                id: "IF",
                code: "IF",
                name: "Informatika",
                isActive: true,
                updatedAt: "2026-10-10T00:00:00.000Z",
              },
            ],
      ),
    );
  };
  const root = createRoot(document.getElementById("root")!);
  const button = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) =>
      b.textContent?.includes(text),
    )!;
  try {
    await act(async () => {
      root.render(
        createElement(DepartmentGovernancePage, {
          user: { role: "SUPER_ADMIN" },
        }),
      );
    });
    await act(async () => {
      button("Edit").click();
    });
    const form = document.querySelector("dialog form")!;
    await act(async () => {
      form.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
      form.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    assert.equal(writes, 1);
    assert.equal(form.getAttribute("aria-busy"), "true");
    await act(async () => {
      rejectWrite();
    });
    assert.match(
      document.querySelector('dialog [role="alert"]')!.textContent!,
      /Kode prodi sudah dirujuk/,
    );
    assert.equal(
      document.querySelectorAll<HTMLInputElement>("dialog input")[1].value,
      "Informatika",
    );
    await act(async () => {
      button("Batal").click();
      button("Otoritas Kaprodi").click();
      await new Promise((r) => setTimeout(r, 300));
    });
    assert.equal(
      button("Hapus"),
      undefined,
      "A seeded SSO lecturer with no login is not a disposable pre-registration",
    );
    const filter = document.querySelector<HTMLSelectElement>(
      ".governance-filter select",
    )!;
    await act(async () => {
      filter.value = "INSTRUCTOR";
      filter.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    assert.ok(
      requests.some((url) => url.includes("role=INSTRUCTOR")),
      "Filter must request matching data without manual refresh",
    );
    await act(async () => {
      button("Integrasi SIAKAD").click();
    });
    assert.equal(button("Terapkan Perubahan").disabled, true);
    assert.ok(document.querySelector("textarea")!.labels!.length);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    readCache.clear();
    dom.window.close();
  }
});

test("non-Super Admin roles see a clear restriction and never fetch authority data", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    throw new Error("Unexpected request");
  };
  const root = createRoot(document.getElementById("root")!);
  try {
    for (const role of [
      "DEPARTMENT_ADMIN",
      "INSTRUCTOR",
      "STUDENT",
      "RECTOR",
    ]) {
      await act(async () =>
        root.render(
          createElement(DepartmentGovernancePage, { user: { role } }),
        ),
      );
      assert.match(
        document.querySelector('[role="alert"]')!.textContent!,
        /hanya tersedia untuk Super Admin/,
      );
    }
    assert.equal(requests, 0);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    dom.window.close();
  }
});

test("authority modal supports prodi search, batch selection, and super admin access note", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    location: dom.window.location,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
  readCache.clear();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    return new Response(
      JSON.stringify(
        url.includes("department-scopes")
          ? [
              {
                id: "lecturer",
                name: "Dosen SSO",
                identifierValue: "111",
                identifierType: "NIDN",
                email: "dosen@example.test",
                username: "dosen",
                role: "DEPARTMENT_ADMIN",
                departmentScopes: ["IF"],
                status: "ACTIVE",
                lastLoginAt: null,
                ssoUserId: "real-sso-subject",
                authoritySource: "SSO",
                authorityVersion: "a".repeat(64),
              },
            ]
          : [
              { id: "IF", code: "IF", name: "Informatika", isActive: true },
              { id: "SI", code: "SI", name: "Sistem Informasi", isActive: true },
              { id: "TE", code: "TE", name: "Teknik Elektro", isActive: true },
              { id: "TS", code: "TS", name: "Teknik Sipil", isActive: true },
              { id: "MN", code: "MN", name: "Manajemen", isActive: true },
            ],
      ),
    );
  };
  const root = createRoot(document.getElementById("root")!);
  const button = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) =>
      b.textContent?.includes(text),
    )!;
  try {
    await act(async () => {
      root.render(
        createElement(DepartmentGovernancePage, {
          user: { role: "SUPER_ADMIN" },
        }),
      );
    });
    await act(async () => {
      button("Otoritas Kaprodi").click();
      await new Promise((r) => setTimeout(r, 300));
    });
    // Open authority modal
    await act(async () => {
      button("Atur Lingkup").click();
    });
    const modal = document.querySelector("dialog.governance-modal")!;
    assert.ok(modal, "Governance modal should open");
    assert.match(modal.textContent!, /Atur Otoritas: Dosen SSO/);

    // Verify search input is present (departments length = 5 > 4)
    const searchInput = modal.querySelector<HTMLInputElement>(
      'input[aria-label="Filter program studi"]',
    )!;
    assert.ok(searchInput, "Scope filter input should be present");

    const setInput = (input: HTMLInputElement, val: string) => {
      const propKey = Object.keys(input).find((k) =>
        k.startsWith("__reactProps$"),
      );
      if (propKey && (input as any)[propKey]?.onChange) {
        (input as any)[propKey].onChange({ target: { value: val } });
      } else {
        input.value = val;
        input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      }
    };

    // Filter for "Informatika"
    await act(async () => {
      setInput(searchInput, "Informatika");
    });
    const visibleScopes = modal.querySelectorAll(".governance-scope");
    assert.equal(visibleScopes.length, 1);
    assert.match(visibleScopes[0].textContent!, /Informatika/);

    // Clear search
    await act(async () => {
      setInput(searchInput, "");
    });
    assert.equal(modal.querySelectorAll(".governance-scope").length, 5);

    // Test Pilih Semua
    await act(async () => {
      button("Pilih Semua").click();
    });
    const checked = modal.querySelectorAll<HTMLInputElement>(
      '.governance-scope input[type="checkbox"]:checked',
    );
    assert.equal(checked.length, 5);

    // Test Kosongkan
    await act(async () => {
      button("Kosongkan").click();
    });
    assert.equal(
      modal.querySelectorAll('.governance-scope input[type="checkbox"]:checked').length,
      0,
    );

    // Switch role to SUPER_ADMIN -> should show universal access note
    const roleSelect = modal.querySelector<HTMLSelectElement>('select[aria-label="Peran"]')!;
    await act(async () => {
      roleSelect.value = "SUPER_ADMIN";
      roleSelect.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.ok(
      modal.querySelector(".governance-scope-admin-note"),
      "Super Admin should display universal access note",
    );
    assert.match(
      modal.querySelector(".governance-scope-admin-note")!.textContent!,
      /Akses Menyeluruh \(Super Admin\)/,
    );
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    readCache.clear();
    dom.window.close();
  }
});

