import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Skeleton } from "../../ui";
import labels from "../../../../../packages/shared/src/id.json";

const t = labels;

export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      {t.loading}
      <Skeleton />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export const EmptyState = Empty;
