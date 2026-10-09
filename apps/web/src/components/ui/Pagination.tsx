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

  const startIndex = (page - 1) * (pageSize > 0 ? pageSize : totalItems) + 1;
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
    <div className="pagination-bar">
      <span className="pagination-summary">
        Menampilkan{" "}
        <strong>
          {startIndex}–{endIndex}
        </strong>{" "}
        dari <strong>{totalItems}</strong> data
      </span>
      <div className="pagination-controls">
        {showPageSizeSelector && onPageSizeChange && (
          <label className="pagination-size">
            <span>Baris per halaman:</span>
            <select
              aria-label="Jumlah baris per halaman"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === -1 ? "Semua" : opt}
                </option>
              ))}
            </select>
          </label>
        )}
        {totalPages > 1 && (
          <nav aria-label="Navigasi Halaman" className="pagination-pages">
            <button
              type="button"
              className="secondary pagination-direction"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Sebelumnya
            </button>
            <div className="pagination-numbers">
              {getPageNumbers().map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    className={page === p ? "primary" : "secondary"}
                    aria-label={`Halaman ${p}`}
                    aria-current={page === p ? "page" : undefined}
                    onClick={() => onPageChange(Number(p))}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              className="secondary pagination-direction"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Selanjutnya
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
