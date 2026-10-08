async function workbook() {
  const module = await import("exceljs");
  return new module.default.Workbook();
}

/**
 * Exports data to an Excel XLSX file and triggers browser download.
 */
export async function exportSheet(
  name: string,
  headers: string[],
  rows: unknown[][],
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
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const output = await book.xlsx.writeBuffer();
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
export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (inQuotes && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some((c) => c !== "")) rows.push(row);
  }
  return rows;
}

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
      cells.push(String(cell.value ?? "").trim());
    });
    matrix.push(cells);
  });
  return matrix;
}
