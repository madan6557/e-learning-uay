import { t } from "./lib";

/**
 * Simple CSV parser supporting double quotes and multi-line quoted cells.
 * Extracted as a standalone utility so pages.tsx does not bundle Gradebook.tsx.
 */
export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error(t.errors.VALIDATION_ERROR);
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
