import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { ApiError } from "../../services/api";
import labels from "../../../../../packages/shared/src/id.json";

const t = labels;

export function Notice({
  error,
  children,
  onClose,
  className = "",
}: {
  error?: unknown;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`${error ? "error notice" : "success notice"} ${className}`.trim()}
      role={error ? "alert" : "status"}
    >
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <div style={{ flex: 1, minWidth: 0 }}>
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
      {onClose && (
        <button
          type="button"
          className="icon-button notice-close-button"
          onClick={onClose}
          aria-label="Tutup pemberitahuan"
          style={{
            background: "transparent",
            border: 0,
            padding: 4,
            cursor: "pointer",
            color: "currentColor",
            opacity: 0.7,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: "auto",
            flexShrink: 0,
          }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
