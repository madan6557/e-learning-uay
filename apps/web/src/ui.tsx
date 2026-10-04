import {
  forwardRef,
  useState,
  useMemo,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronRight } from "lucide-react";
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
  }
>(
  (
    { variant = "secondary", className = "", type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={`${variant} ${className}`}
      {...props}
    />
  ),
);
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "?"
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span aria-hidden="true" className={large ? "large-avatar" : "avatar"}>
      {initials(name)}
    </span>
  );
}
export function UserChip({ user, role }: { user: any; role: string }) {
  return (
    <a
      href="/profile"
      className="user-chip"
      aria-label={`Profil akun ${user.name}`}
    >
      <Avatar name={user.name} />
      <span className="user-chip-details">
        <span className="user-chip-name">{user.name}</span>
        <small className="user-chip-role">{role}</small>
      </span>
    </a>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Jejak navigasi" className="breadcrumbs">
      <ol>
        {items.map((item, i) => (
          <li key={i}>
            {i > 0 && <ChevronRight size={14} aria-hidden="true" />}
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="filter-tabs" role="group" aria-label="Tampilan">
      {items.map((item) => (
        <Button
          key={item.id}
          aria-pressed={item.id === value}
          className={item.id === value ? "selected" : ""}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
export function DataTable({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="table-wrap" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function usePagination<T>(
  items: T[] = [],
  initialPageSize: number = 10,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const totalItems = items.length;
  const totalPages =
    pageSize > 0 ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  const currentPage = Math.min(page, totalPages);
  if (currentPage !== page && totalPages > 0) {
    setPage(currentPage);
  }

  const paginatedItems = useMemo(() => {
    if (pageSize <= 0) return items;
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const startIndex =
    totalItems === 0
      ? 0
      : (currentPage - 1) * (pageSize > 0 ? pageSize : totalItems) + 1;
  const endIndex =
    pageSize > 0 ? Math.min(currentPage * pageSize, totalItems) : totalItems;

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    paginatedItems,
    startIndex,
    endIndex,
    rangeText: `Menampilkan ${startIndex}–${endIndex} dari ${totalItems} data`,
  };
}

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
        gap: 12,
        padding: "12px 0",
        marginTop: 12,
        fontSize: "0.88rem",
        color: "var(--muted, #64748b)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>
          Menampilkan <strong>{startIndex}–{endIndex}</strong> dari{" "}
          <strong>{totalItems}</strong> data
        </span>
        {showPageSizeSelector && onPageSizeChange && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>per halaman:</span>
            <select
              aria-label="Jumlah baris per halaman"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                fontSize: "0.85rem",
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid var(--border, #cbd5e1)",
                background: "var(--card-bg, #ffffff)",
                cursor: "pointer",
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
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Navigasi Halaman"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <button
            type="button"
            className="button secondary"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            style={{
              padding: "4px 10px",
              fontSize: "0.82rem",
              borderRadius: 6,
              cursor: page <= 1 ? "not-allowed" : "pointer",
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            Sebelumnya
          </button>

          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <span key={`dots-${idx}`} style={{ padding: "0 4px" }}>
                …
              </span>
            ) : (
              <button
                key={`page-${p}`}
                type="button"
                className={`button ${page === p ? "primary" : "secondary"}`}
                onClick={() => onPageChange(Number(p))}
                style={{
                  minWidth: 32,
                  padding: "4px 8px",
                  fontSize: "0.82rem",
                  borderRadius: 6,
                  fontWeight: page === p ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            className="button secondary"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            style={{
              padding: "4px 10px",
              fontSize: "0.82rem",
              borderRadius: 6,
              cursor: page >= totalPages ? "not-allowed" : "pointer",
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            Selanjutnya
          </button>
        </nav>
      )}
    </div>
  );
}
