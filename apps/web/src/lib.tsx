import { confirmAction } from "./confirm";
import { useId, isValidElement, cloneElement, type ReactElement } from "react";
import { Button, Skeleton } from "./ui";
import { useLocalDraft, SaveStatus } from "./useLocalDraft";
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
    // Schedule blockers carry the moment they refer to, so the message states
    // the date instead of sending the reader off to find it.
    const base = (t.errors as Record<string, string>)[code] ?? code;
    super(details?.at ? `${base} ${date(details.at)}.` : base);
  }
}
// Preserve a logical write's key when the response is lost, including a manual retry.
// Successful or rejected writes release the key so a later intentional action stays distinct.
const uncertainWrites = new Map<string, { key: string; expires: number }>();
const apiBase = ((import.meta as any).env?.VITE_API_URL ?? "").replace(
  /\/$/,
  "",
);
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
        if (active)
          setError(Object.assign(e, { retry: () => setVersion((v) => v + 1) }));
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
  const id = useId();
  const [validation, setValidation] = useState("");
  const control =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "textarea", "select"].includes(children.type)
      ? cloneElement(children as ReactElement<any>, {
          "aria-labelledby": `${id}-label`,
          "aria-describedby":
            [hint && `${id}-hint`, validation && `${id}-error`]
              .filter(Boolean)
              .join(" ") || undefined,
          "aria-invalid": validation ? true : undefined,
          onInvalid: (event: any) =>
            setValidation(event.currentTarget.validationMessage),
          onInput: (event: any) => {
            setValidation("");
            (children.props as any).onInput?.(event);
          },
        })
      : children;
  return (
    <label className="field">
      <span id={`${id}-label`}>{label}</span>
      {control}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {validation && (
        <small className="danger-text" id={`${id}-error`} role="alert">
          {validation}
        </small>
      )}
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
export const Status = Badge;
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
  const titleId = useId();
  const close = async () => {
    if (
      ref.current?.querySelector('[data-dirty="true"]') &&
      !(await confirmAction(
        "Perubahan belum dikirim ke server. Tutup editor dan simpan draft di perangkat ini?",
      ))
    )
      return;
    onClose();
  };
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      close();
    };
    el.addEventListener("cancel", cancel);
    return () => el.removeEventListener("cancel", cancel);
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={wide ? "modal wide" : "modal"}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={close}
          aria-label={t.close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
type FormSnapshot = Record<string, string[]>;
export function captureForm(form: HTMLFormElement): FormSnapshot {
  const values: FormSnapshot = {};
  for (const control of Array.from(form.elements) as HTMLInputElement[]) {
    if (
      !control.name ||
      ["file", "password", "submit", "button"].includes(control.type) ||
      control.name === "key"
    )
      continue;
    values[control.name] ??= [];
    if (["checkbox", "radio"].includes(control.type) && !control.checked)
      continue;
    values[control.name].push(control.value);
  }
  return values;
}
function restoreForm(form: HTMLFormElement, values: FormSnapshot) {
  for (const control of Array.from(form.elements) as HTMLInputElement[]) {
    if (
      !control.name ||
      !(control.name in values) ||
      ["file", "password"].includes(control.type)
    )
      continue;
    const value = values[control.name];
    if (["checkbox", "radio"].includes(control.type))
      control.checked = value.includes(control.value);
    else {
      const prototype =
        control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : control instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
        control,
        value[0] ?? "",
      );
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}
export function Form({
  onSubmit,
  children,
  submitLabel = "Simpan semua perubahan",
  onCancel,
  draftKey = "form",
  draftValue,
  onRestoreDraft,
  autosave = true,
  disabled = false,
  submitDisabled = false,
  captureFields = true,
  onDirtyChange,
}: {
  onSubmit: (form: FormData) => Promise<unknown>;
  children: ReactNode;
  submitLabel?: string;
  onCancel?: () => void;
  draftKey?: string;
  draftValue?: any;
  onRestoreDraft?: (value: any) => void;
  autosave?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  captureFields?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<FormSnapshot>({});
  const draft = useLocalDraft(
    location.hash + ":" + draftKey,
    { fields, extra: draftValue },
    (stored) => {
      onRestoreDraft?.(stored.extra);
      setFields(stored.fields ?? {});
      // Restore named fields after React has rebuilt any dynamic sections.
      setTimeout(() => {
        if (ref.current) restoreForm(ref.current, stored.fields ?? {});
      }, 0);
    },
    autosave,
  );
  useEffect(() => { onDirtyChange?.(draft.dirty || !!draft.recovery); }, [draft.dirty, draft.recovery, onDirtyChange]);
  return (
    <form
      ref={ref}
      data-dirty={draft.dirty ? "true" : undefined}
      aria-busy={busy}
      onChange={() => {
        if (ref.current && captureFields) setFields(captureForm(ref.current));
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || disabled || submitDisabled || draft.recovery) return;
        const data = new FormData(e.currentTarget);
        setBusy(true);
        setError(null);
        try {
          const result = await onSubmit(data);
          if (result !== false) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            await draft.saved();
          }
        } catch (error) {
          setError(error as Error);
        } finally {
          setBusy(false);
        }
      }}
    >
      {autosave && <SaveStatus draft={draft} busy={busy} />}
      <fieldset disabled={busy || disabled || !!draft.recovery}>
        {children}
      </fieldset>
      {error && <Notice error={error} />}
      <div className="form-actions sticky-actions">
        {onCancel && (
          <Button
            onClick={async () => {
              if (
                !draft.dirty ||
                (await confirmAction(
                  "Tutup editor? Draft perubahan tetap tersedia di perangkat ini.",
                ))
              )
                onCancel();
            }}
          >
            {t.cancel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={busy || disabled || submitDisabled || !!draft.recovery}
        >
          {busy ? (
            <>
              <LoaderCircle size={16} className="spin" />
              {t.saving}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
export function Action({
  run,
  children,
  className = "secondary",
  disabled = false,
  label,
}: {
  run: () => Promise<unknown>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled || busy}
        aria-busy={busy}
        aria-label={label}
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
        {busy && <LoaderCircle size={16} className="spin" aria-hidden="true" />}
        {children}
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
      {progress !== null && <progress aria-label="Progres unggahan" value={progress} max={100} />}{" "}
      {error && <Notice error={error} />}
    </div>
  );
}
