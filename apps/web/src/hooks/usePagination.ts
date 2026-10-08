import { useState, useMemo } from "react";

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
