import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ApiError } from "../../services/api";
import labels from "../../../../../packages/shared/src/id.json";

const t = labels;

export function Notice({
  error,
  children,
}: {
  error?: unknown;
  children?: ReactNode;
}) {
  return (
    <div
      className={error ? "error notice" : "success notice"}
      role={error ? "alert" : "status"}
    >
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <div>
        {error instanceof Error ? error.message : typeof error === "string" ? error : children}
        {error instanceof Error &&
          typeof (error as any).retry === "function" && (
            <button
              type="button"
              className="secondary retry-button"
              onClick={(error as any).retry}
            >
              Coba lagi
            </button>
          )}
        {error instanceof ApiError && error.details?.rows && (
          <ul>
            {error.details.rows.map((row: any, index: number) => (
              <li key={index}>
                Baris {row.index + 1}: {(t.errors as any)[row.code] ?? row.code}
              </li>
            ))}
          </ul>
        )}
        {error instanceof ApiError && error.requestId && (
          <small className="request-id">
            {t.requestId}: {error.requestId}
          </small>
        )}
      </div>
    </div>
  );
}
