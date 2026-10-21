import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { JSDOM } from "jsdom";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { createSheet, readImportFile } from "../apps/web/src/services/excel.js";
import { CourseImportModal } from "../apps/web/src/pages.js";

Object.assign(globalThis, { React });

test("Excel templates preserve columns, commas, empty cells, and text identifiers", async () => {
  const headers = ["name", "email", "identifier_value", "status"];
  const rows = [
    ["Dr. Budi, M.T.", "", "00123456789012345678", "ACTIVE"],
    ["Siti", "siti@example.test", "000123", "ACTIVE"],
  ];
  const output = await createSheet(headers, rows, ["identifier_value"]);
  const file = new File([output as BlobPart], "template.XLSX");
  assert.deepEqual(await readImportFile(file), [headers, ...rows]);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await file.arrayBuffer());
  assert.equal(book.worksheets[0].getColumn(3).numFmt, "@");
});

test("legacy CSV still reads BOM, quoted commas and multiline cells", async () => {
  const file = new File(
    [
      '\uFEFFkode,nama,deskripsi\r\nIF101,"Algoritma, dasar","Baris pertama\nBaris kedua"',
    ],
    "data.csv",
  );
  assert.deepEqual(await readImportFile(file), [
    ["kode", "nama", "deskripsi"],
    ["IF101", "Algoritma, dasar", "Baris pertama\nBaris kedua"],
  ]);
  await assert.rejects(
    () => readImportFile(new File([], "empty.xlsx")),
    /10 MB/,
  );
  await assert.rejects(
    () => readImportFile(new File(["data"], "data.xls")),
    /xlsx/,
  );
});

test("catalog Excel upload previews only data rows and clears stale data after a bad file", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    fetch: globalThis.fetch,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  const previews: any[] = [];
  let commits = 0;
  globalThis.fetch = async (input, init) => {
    assert.match(String(input), /courses\/imports\/preview$/);
    if (String(input).endsWith("commit")) commits++;
    const { rows } = JSON.parse(String(init?.body));
    previews.push(rows);
    return new Response(
      JSON.stringify({
        ready: rows.length,
        issues: 0,
        rows: rows.map((row: any, i: number) => ({
          ...row,
          rowNumber: i + 1,
          status: "READY",
        })),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  };
  const output = await createSheet(
    ["kode", "nama", "sks", "prodi", "deskripsi", "status"],
    [
      ["IF101", "Algoritma, dasar", 3, "IF", "", "PUBLISHED"],
      ["IF102", "Struktur Data", 2, "IF", "Contoh", "DRAFT"],
    ],
  );
  const root = createRoot(document.getElementById("root")!);
  try {
    await act(async () =>
      root.render(
        createElement(CourseImportModal, {
          user: { role: "SUPER_ADMIN", departmentScopes: ["IF"] },
          onClose() {},
          onSuccess() {},
        }),
      ),
    );
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const upload = async (file: File) => {
      Object.defineProperty(input, "files", {
        configurable: true,
        value: [file],
      });
      await act(async () => {
        input.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
        await new Promise((r) => setTimeout(r, 100));
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 500));
      });
    };
    assert.match(input.accept, /xlsx/);
    await upload(new File([output as BlobPart], "katalog.xlsx"));
    assert.equal(previews.length, 1);
    assert.equal(previews[0].length, 2);
    assert.equal(previews[0][0].values.title, "Algoritma, dasar");
    assert.equal(previews[0][1].values.credits, 2);
    assert.deepEqual(
      [...document.querySelectorAll('td[data-label="Baris"]')].map(
        (cell) => cell.textContent,
      ),
      ["1", "2"],
    );
    assert.equal(commits, 0, "Uploading must not save before review");
    await upload(new File(["invalid"], "rusak.xlsx"));
    assert.equal(document.querySelectorAll('td[data-label="Baris"]').length, 0);
    assert.ok(document.querySelector('[role="alert"]'));
    const commit = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((b) => /Impor \d+ Mata Kuliah/.test(b.textContent ?? ""))!;
    assert.equal(commit.disabled, true);
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
