export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  showPageSizeSelector = true,
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const startIndex =
    (page - 1) * (pageSize > 0 ? pageSize : totalItems) + 1;
  const endIndex =
    pageSize > 0 ? Math.min(page * pageSize, totalItems) : totalItems;

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <div
      className="pagination-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        padding: "14px 4px 6px 4px",
        marginTop: 16,
        fontSize: "0.86rem",
        color: "var(--muted, #64748b)",
        borderTop: "1px solid var(--border, #f1f5f9)",
      }}
    >
      {/* Sisi Kiri: Rekap Data */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
        <span>
          Menampilkan <strong style={{ color: "var(--foreground, #0f172a)", fontWeight: 600 }}>{startIndex}–{endIndex}</strong> dari{" "}
          <strong style={{ color: "var(--foreground, #0f172a)", fontWeight: 600 }}>{totalItems}</strong> data
        </span>
      </div>

      {/* Sisi Kanan: Kontrol (Baris per halaman & Navigasi Tombol) */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginLeft: "auto",
        }}
      >
        {showPageSizeSelector && onPageSizeChange && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)", whiteSpace: "nowrap" }}>
              Baris per halaman:
            </span>
            <select
              aria-label="Jumlah baris per halaman"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              style={{
                fontSize: "0.82rem",
                fontWeight: 500,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid var(--border, #cbd5e1)",
                background: "var(--card-bg, #ffffff)",
                color: "var(--foreground, #0f172a)",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === -1 ? "Semua" : opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Navigasi Halaman"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 12px",
                fontSize: "0.82rem",
                fontWeight: 500,
                borderRadius: 6,
                border: "1px solid var(--border, #cbd5e1)",
                background: page <= 1 ? "var(--neutral-soft, #f8fafc)" : "var(--card-bg, #ffffff)",
                color: page <= 1 ? "var(--muted, #94a3b8)" : "var(--foreground, #0f172a)",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Sebelumnya
            </button>

            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} style={{ padding: "0 6px", color: "var(--muted, #94a3b8)" }}>
                  …
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(Number(p))}
                  style={{
                    minWidth: 32,
                    height: 30,
                    padding: "0 6px",
                    fontSize: "0.82rem",
                    borderRadius: 6,
                    fontWeight: page === p ? 700 : 500,
                    border: page === p ? "1px solid var(--primary, #0284c7)" : "1px solid var(--border, #cbd5e1)",
                    background: page === p ? "var(--primary, #0284c7)" : "var(--card-bg, #ffffff)",
                    color: page === p ? "#ffffff" : "var(--foreground, #0f172a)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {p}
                </button>
              ),
            )}

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 12px",
                fontSize: "0.82rem",
                fontWeight: 500,
                borderRadius: 6,
                border: "1px solid var(--border, #cbd5e1)",
                background: page >= totalPages ? "var(--neutral-soft, #f8fafc)" : "var(--card-bg, #ffffff)",
                color: page >= totalPages ? "var(--muted, #94a3b8)" : "var(--foreground, #0f172a)",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Selanjutnya
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
