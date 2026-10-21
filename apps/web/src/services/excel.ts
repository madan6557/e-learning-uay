import { parseCsv } from "../csv";

async function workbook() {
  const module = await import("exceljs");
  return new module.default.Workbook();
}

/**
 * Exports data to an Excel XLSX file and triggers browser download.
 */
export async function createSheet(
  headers: string[],
  rows: unknown[][],
  textColumns: string[] = [],
) {
  const book = await workbook(),
    sheet = book.addWorksheet("UAY");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF183D32" },
  };
  sheet.columns.forEach((column) => (column.width = 24));
  textColumns.forEach((header) => {
    const index = headers.indexOf(header);
    if (index >= 0) sheet.getColumn(index + 1).numFmt = "@";
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: "A1",
    to: { row: sheet.rowCount, column: headers.length },
  };
  return book.xlsx.writeBuffer();
}

export async function exportSheet(
  name: string,
  headers: string[],
  rows: unknown[][],
  textColumns: string[] = [],
) {
  const output = await createSheet(headers, rows, textColumns);
  const url = URL.createObjectURL(
    new Blob([output as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Parses CSV raw text into a matrix of string cells.
 */
export { parseCsv };

/**
 * Reads an Excel (XLSX) ArrayBuffer into a matrix of cell values.
 */
export async function parseExcel(buffer: ArrayBuffer): Promise<string[][]> {
  const book = await workbook();
  await book.xlsx.load(buffer);
  const sheet = book.worksheets[0];
  if (!sheet) return [];
  const matrix: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cell.text.trim());
    });
    if (cells.some(Boolean)) matrix.push(cells);
  });
  return matrix;
}

/** Read either the column-based Excel template or a legacy CSV file. */
export async function readImportFile(file: File): Promise<string[][]> {
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error("Berkas harus berisi data dan berukuran maksimal 10 MB.");
  if (/\.xlsx$/i.test(file.name)) return parseExcel(await file.arrayBuffer());
  if (/\.csv$/i.test(file.name))
    return parseCsv((await file.text()).replace(/^\uFEFF/, ""));
  throw new Error("Gunakan berkas Excel (.xlsx) atau CSV (.csv).");
}
