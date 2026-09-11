import { useState, useEffect, useRef, type ReactNode } from "react";
import { X, LoaderCircle, CheckCircle2, AlertCircle } from "lucide-react";
import labels from "../../../packages/shared/src/id.json";
export const t = labels;
export const date = (value: string | Date | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value))
    : "—";
export const day = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
export function localInput(value: string | null | undefined) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
  return parts.replace(" ", "T");
}
export const isoInput = (value: FormDataEntryValue | null) =>
  value ? new Date(`${value}:00+07:00`).toISOString() : null;
export const textValue = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export const numberValue = (form: FormData, key: string) =>
  Number(form.get(key));
export const navigate = (path: string) => {
  location.hash = path;
};
export class ApiError extends Error {
  constructor(
    public code: string,
    public details?: any,
    public requestId?: string,
  ) {
    super((t.errors as Record<string, string>)[code] ?? code);
  }
}
// Preserve a logical write's key when the response is lost, including a manual retry.
// Successful or rejected writes release the key so a later intentional action stays distinct.
const uncertainWrites = new Map<string, { key: string; expires: number }>();
const apiBase = ((import.meta as any).env?.VITE_API_URL ?? "").replace(/\/$/, "");
const isExternalApi = Boolean(apiBase);

export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  const encoded = body === undefined ? undefined : JSON.stringify(body);
  const fingerprint = `${method}:${path}:${encoded ?? ""}`;
  for (const [entry, value] of uncertainWrites)
    if (value.expires < Date.now()) uncertainWrites.delete(entry);
  key ??= uncertainWrites.get(fingerprint)?.key ?? crypto.randomUUID();
  if (method !== "GET") {
    if (uncertainWrites.size >= 100)
      uncertainWrites.delete(uncertainWrites.keys().next().value!);
    uncertainWrites.set(fingerprint, { key, expires: Date.now() + 15 * 60000 });
  }
  for (let attempt = 0; ; attempt++) {
    let response;
    try {
      response = await fetch(`${apiBase}/api/v1${path}`, {
        method,
        credentials: isExternalApi ? "include" : "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(method !== "GET" ? { "Idempotency-Key": key } : {}),
        },
        body: encoded,
      });
    } catch {
      throw new Error(t.connectionError);
    }
    const data = await response.json().catch(() => {
      throw new Error(t.connectionError);
    });
    if (response.status < 500 && data.error?.code !== "SESSION_REFRESHING")
      uncertainWrites.delete(fingerprint);
    if (!response.ok) {
      if (data.error?.code === "SESSION_REFRESHING" && attempt < 4) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      if (response.status === 401) {
        uncertainWrites.clear();
        window.dispatchEvent(new Event("session-expired"));
      }
      throw new ApiError(
        data.error?.code ?? "INTERNAL_ERROR",
        data.error?.details,
        data.error?.requestId,
      );
    }
    return data;
  }
}
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<Error | null>(null),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setError(null);
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<T>(path)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return {
    data,
    setData,
    error,
    loading,
    reload: () => setVersion((v) => v + 1),
  };
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      {(t.statuses as Record<string, string>)[value] ?? value}
    </span>
  );
}
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
        {error instanceof Error ? error.message : children}
        {error instanceof ApiError && error.requestId && (
          <small className="request-id">
            {t.requestId}: {error.requestId}
          </small>
        )}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      {t.loading}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    const close = () => onClose();
    el.addEventListener("cancel", close);
    return () => el.removeEventListener("cancel", close);
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={t.close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Form({
  onSubmit,
  children,
  submitLabel = t.save,
  onCancel,
}: {
  onSubmit: (form: FormData) => Promise<unknown>;
  children: ReactNode;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        try {
          await onSubmit(form);
        } catch (error) {
          setError(error as Error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {error && <Notice error={error} />}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            {t.cancel}
          </button>
        )}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" />
              {t.saving}
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
export function Action({
  run,
  children,
  className = "secondary",
  disabled = false,
}: {
  run: () => Promise<unknown>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await run();
          } catch (e) {
            setError(e as Error);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <LoaderCircle size={16} className="spin" /> : children}
      </button>
      {error && <Notice error={error} />}
    </>
  );
}
export async function uploadFile(
  file: File,
  classId: string,
  purpose: string,
  contextId: string | undefined,
  onProgress: (value: number) => void,
) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const checksum = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const mimeType =
    file.type ||
    (/\.py$/i.test(file.name)
      ? "text/x-python"
      : /\.cpp$/i.test(file.name)
        ? "text/x-c++src"
        : "application/octet-stream");
  const ticket = await api("/files/upload-ticket", "POST", {
    classId,
    purpose,
    contextId,
    name: file.name,
    mimeType,
    sizeBytes: file.size,
    checksum,
  });
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", ticket.uploadUrl);
    for (const [key, value] of Object.entries(ticket.headers ?? {}))
      xhr.setRequestHeader(key, String(value));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(t.connectionError));
    xhr.onerror = () => reject(new Error(t.connectionError));
    xhr.ontimeout = () => reject(new Error(t.connectionError));
    xhr.timeout = 120000;
    xhr.send(file);
  });
  return api(`/files/${ticket.fileObjectId}/confirm`, "POST", {});
}
export function FileUpload({
  classId,
  purpose = "RESOURCE",
  contextId,
  onUploaded,
  accept,
}: {
  classId: string;
  purpose?: string;
  contextId?: string;
  onUploaded: (file: any) => void;
  accept?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState<Error | null>(null);
  return (
    <div className="file-upload">
      <label className="upload-label">
        {progress !== null ? `${t.uploading} ${progress}%` : t.upload}
        <input
          type="file"
          accept={accept}
          disabled={progress !== null}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError(null);
            setProgress(0);
            try {
              onUploaded(
                await uploadFile(
                  file,
                  classId,
                  purpose,
                  contextId,
                  setProgress,
                ),
              );
            } catch (error) {
              setError(error as Error);
            } finally {
              setProgress(null);
              e.target.value = "";
            }
          }}
        />
      </label>
      {progress !== null && <progress value={progress} max={100} />}{" "}
      {error && <Notice error={error} />}
    </div>
  );
}
