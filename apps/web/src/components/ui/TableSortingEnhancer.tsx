import { useEffect } from "react";

type SortDirection = "asc" | "desc";
type TableSortState = { columnIndex: number; direction: SortDirection };
type SortableHeader = {
  cell: HTMLTableCellElement;
  columnIndex: number;
  label: string;
};

const sortStates = new WeakMap<HTMLTableElement, TableSortState>();
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});
const excludedHeaderLabels = new Set([
  "aksi",
  "action",
  "actions",
  "tindakan",
  "operasi",
  "pilih",
  "select",
]);

function getHeaderLabel(cell: HTMLTableCellElement) {
  const copy = cell.cloneNode(true) as HTMLTableCellElement;
  copy.querySelectorAll("[data-table-sort-control]").forEach((control) =>
    control.remove(),
  );
  return (copy.innerText || copy.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSortableHeaders(table: HTMLTableElement): SortableHeader[] {
  const rows = Array.from(table.tHead?.rows ?? []);
  const occupied: number[][] = [];
  const firstHeaderForColumn = new Set<number>();
  const headers: SortableHeader[] = [];

  rows.forEach((row, rowIndex) => {
    occupied[rowIndex] ??= [];
    let columnIndex = 0;
    Array.from(row.cells).forEach((cell) => {
      while (occupied[rowIndex][columnIndex] !== undefined) columnIndex++;
      const startColumn = columnIndex;
      const label = getHeaderLabel(cell);
      const normalizedLabel = label.toLocaleLowerCase().replace(/\s+/g, " ");
      const hasControls = Boolean(
        cell.querySelector("input, select, textarea, button, a"),
      );
      const explicitlyDisabled =
        cell.dataset.sortable === "false" ||
        cell.closest('[data-sortable="false"]') !== null;

      if (
        cell.colSpan === 1 &&
        label &&
        !excludedHeaderLabels.has(normalizedLabel) &&
        !(hasControls && !normalizedLabel) &&
        !explicitlyDisabled &&
        !firstHeaderForColumn.has(startColumn)
      ) {
        firstHeaderForColumn.add(startColumn);
        headers.push({ cell, columnIndex: startColumn, label });
      }

      const columnSpan = Math.max(1, cell.colSpan);
      const rowSpan = Math.max(1, Math.min(cell.rowSpan, rows.length - rowIndex));
      for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
        occupied[r] ??= [];
        for (let c = startColumn; c < startColumn + columnSpan; c++) {
          occupied[r][c] = startColumn;
        }
      }
      columnIndex = startColumn + columnSpan;
    });
  });

  return headers;
}

function getCellValue(cell: HTMLTableCellElement) {
  if (cell.dataset.sortValue !== undefined) return cell.dataset.sortValue;

  const time = cell.querySelector("time[datetime]");
  if (time instanceof HTMLTimeElement && time.dateTime) return time.dateTime;

  const select = cell.querySelector("select");
  if (select) {
    return select.selectedOptions[0]?.textContent?.trim() || select.value;
  }

  const input = cell.querySelector("input");
  if (input instanceof HTMLInputElement) {
    if (input.type === "checkbox" || input.type === "radio") {
      return input.checked ? "1" : "0";
    }
    return input.value || input.getAttribute("aria-label") || "";
  }

  const textarea = cell.querySelector("textarea");
  if (textarea) return textarea.value;

  return (cell.innerText || cell.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cellAtColumn(row: HTMLTableRowElement, columnIndex: number) {
  let startColumn = 0;
  for (const cell of Array.from(row.cells)) {
    const endColumn = startColumn + Math.max(1, cell.colSpan);
    if (columnIndex >= startColumn && columnIndex < endColumn) return cell;
    startColumn = endColumn;
  }
  return null;
}

function applySort(
  table: HTMLTableElement,
  columnIndex: number,
  direction: SortDirection,
) {
  sortStates.set(table, { columnIndex, direction });

  for (const header of Array.from(table.tHead?.querySelectorAll("th") ?? [])) {
    const activeControl = Array.from(
      header.querySelectorAll<HTMLButtonElement>("[data-table-sort-control]"),
    ).find((button) => Number(button.dataset.sortColumn) === columnIndex);
    const isActive = Boolean(activeControl);
    header.setAttribute(
      "aria-sort",
      isActive ? (direction === "asc" ? "ascending" : "descending") : "none",
    );
  }

  const mobileToolbar = table.previousElementSibling?.classList.contains(
    "table-sort-mobile-controls",
  )
    ? table.previousElementSibling
    : null;
  const sortButtons = [
    ...Array.from(
      table.querySelectorAll<HTMLButtonElement>("[data-table-sort-control]"),
    ),
    ...Array.from(
      mobileToolbar?.querySelectorAll<HTMLButtonElement>(
        "[data-table-sort-control]",
      ) ?? [],
    ),
  ];
  sortButtons.forEach((button) => {
      const buttonColumn = Number(button.dataset.sortColumn);
      const isActive = buttonColumn === columnIndex;
      const icon = button.querySelector<HTMLElement>(".table-sort-icon");
      const iconValue = isActive ? (direction === "asc" ? "↑" : "↓") : "↕";
      if (icon && icon.textContent !== iconValue) icon.textContent = iconValue;
      const label = button.dataset.sortLabel || "kolom";
      const nextDirection: SortDirection =
        isActive && direction === "asc" ? "desc" : "asc";
      button.setAttribute(
        "aria-label",
        `Urutkan ${label} ${nextDirection === "asc" ? "menaik" : "menurun"}`,
      );
      button.title = `Urutkan ${label} ${nextDirection === "asc" ? "menaik" : "menurun"}`;
  });

  for (const body of Array.from(table.tBodies)) {
    const rows = Array.from(body.rows);
    const sortableSlots = rows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) =>
          row.dataset.sortable !== "false" &&
          !Array.from(row.cells).some((cell) => cell.rowSpan > 1) &&
          cellAtColumn(row, columnIndex) !== null,
      );
    if (sortableSlots.length < 2) continue;

    const sortedRows = sortableSlots
      .map(({ row, index }) => ({ row, index, value: getCellValue(cellAtColumn(row, columnIndex)!) }))
      .sort((a, b) => {
        const comparison = collator.compare(a.value, b.value);
        return (direction === "asc" ? comparison : -comparison) || a.index - b.index;
      });
    const nextOrder = rows.slice();
    sortableSlots.forEach(({ index }, sortedIndex) => {
      nextOrder[index] = sortedRows[sortedIndex].row;
    });

    if (nextOrder.some((row, index) => row !== rows[index])) {
      nextOrder.forEach((row) => body.appendChild(row));
    }
  }
}

function createSortButton(
  table: HTMLTableElement,
  columnIndex: number,
  label: string,
  mobile = false,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = mobile
    ? "table-sort-mobile-button"
    : "table-sort-button";
  button.dataset.tableSortControl = "true";
  button.dataset.sortColumn = String(columnIndex);
  button.dataset.sortLabel = label;
  if (mobile) button.append(document.createTextNode(label));
  const icon = document.createElement("span");
  icon.className = "table-sort-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "↕";
  button.append(icon);
  button.setAttribute("aria-label", `Urutkan ${label} menaik`);
  button.title = `Urutkan ${label} menaik`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const current = sortStates.get(table);
    const direction: SortDirection =
      current?.columnIndex === columnIndex && current.direction === "asc"
        ? "desc"
        : "asc";
    applySort(table, columnIndex, direction);
  });
  return button;
}

function ensureMobileSortControls(
  table: HTMLTableElement,
  headers: SortableHeader[],
) {
  let toolbar = table.previousElementSibling;
  const existingToolbar = toolbar?.classList.contains(
    "table-sort-mobile-controls",
  )
    ? (toolbar as HTMLElement)
    : null;
  const tableHead = table.tHead;
  const headStyle = tableHead ? window.getComputedStyle(tableHead) : null;
  const hasMobileLayout = Boolean(
    table.closest(".phone-record-table") ||
      headStyle?.display === "none" ||
      headStyle?.position === "absolute" ||
      headStyle?.visibility === "hidden",
  );

  if (!hasMobileLayout || headers.length === 0) {
    existingToolbar?.remove();
    return;
  }

  if (!existingToolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "table-sort-mobile-controls";
    toolbar.setAttribute("role", "group");
    toolbar.setAttribute("aria-label", "Urutkan tabel");
    table.parentElement?.insertBefore(toolbar, table);
  }

  const signature = JSON.stringify(
    headers.map(({ columnIndex, label }) => [columnIndex, label]),
  );
  if ((toolbar as HTMLElement).dataset.sortSignature === signature) return;

  (toolbar as HTMLElement).dataset.sortSignature = signature;
  (toolbar as HTMLElement).replaceChildren(
    ...headers.map(({ columnIndex, label }) =>
      createSortButton(table, columnIndex, label, true),
    ),
  );
  const state = sortStates.get(table);
  if (state) {
    const activeButtons = (toolbar as HTMLElement).querySelectorAll<HTMLButtonElement>(
      "[data-table-sort-control]",
    );
    activeButtons.forEach((button) => {
      const isActive = Number(button.dataset.sortColumn) === state.columnIndex;
      const icon = button.querySelector<HTMLElement>(".table-sort-icon");
      const iconValue = isActive ? (state.direction === "asc" ? "↑" : "↓") : "↕";
      if (icon && icon.textContent !== iconValue) icon.textContent = iconValue;
      const nextDirection: SortDirection =
        isActive && state.direction === "asc" ? "desc" : "asc";
      button.setAttribute(
        "aria-label",
        `Urutkan ${button.dataset.sortLabel} ${nextDirection === "asc" ? "menaik" : "menurun"}`,
      );
      button.title = button.getAttribute("aria-label") || "Urutkan kolom";
    });
  }
}

function enhanceTable(table: HTMLTableElement) {
  if (table.dataset.sortable === "false") return;
  table.dataset.sortableEnhanced = "true";
  const headers = getSortableHeaders(table);

  headers.forEach(({ cell, columnIndex, label }) => {
    let button = Array.from(
      cell.querySelectorAll<HTMLButtonElement>("[data-table-sort-control]"),
    ).find((control) => !control.closest(".table-sort-mobile-controls"));
    if (!button) {
      button = createSortButton(table, columnIndex, label);
      cell.appendChild(button);
    } else {
      button.dataset.sortColumn = String(columnIndex);
      button.dataset.sortLabel = label;
    }
    cell.setAttribute("aria-sort", "none");
  });

  ensureMobileSortControls(table, headers);
  const state = sortStates.get(table);
  if (state) applySort(table, state.columnIndex, state.direction);
}

function scanForTables(node: Node, visit: (table: HTMLTableElement) => void) {
  if (node instanceof HTMLTableElement) visit(node);
  if (node instanceof Element) {
    const parentTable = node.closest("table");
    if (parentTable instanceof HTMLTableElement) visit(parentTable);
    node.querySelectorAll("table").forEach((table) => {
      if (table instanceof HTMLTableElement) visit(table);
    });
  } else if (node.parentElement) {
    const parentTable = node.parentElement.closest("table");
    if (parentTable instanceof HTMLTableElement) visit(parentTable);
  }
}

/** Adds accessible, client-side sorting controls to every data table in the app. */
export function TableSortingEnhancer() {
  useEffect(() => {
    const enhance = (table: HTMLTableElement) => enhanceTable(table);
    document.querySelectorAll("table").forEach((table) => {
      if (table instanceof HTMLTableElement) enhance(table);
    });

    const observer = new MutationObserver((records) => {
      const tables = new Set<HTMLTableElement>();
      records.forEach((record) => {
        scanForTables(record.target, (table) => tables.add(table));
        record.addedNodes.forEach((node) =>
          scanForTables(node, (table) => tables.add(table)),
        );
      });
      tables.forEach(enhance);
    });
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    const handleResize = () => {
      document.querySelectorAll("table").forEach((table) => {
        if (table instanceof HTMLTableElement) enhance(table);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}
