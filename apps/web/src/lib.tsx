import { uploadLimit, validateUploadSize } from "../../../packages/shared/src/files";
import { formatDateTime, formatClock, localDateTimeInput, localInputToUtc } from "../../../packages/shared/src/time";
export { localDateInput } from "../../../packages/shared/src/time";
export const clock = formatClock;
import { confirmAction } from "./confirm";
import { readCache, readTtl } from "./readCache";
import { useId, isValidElement, cloneElement, type ReactElement } from "react";
import { Button, Skeleton } from "./ui";
import { useLocalDraft, SaveStatus, DraftRouteContext } from "./useLocalDraft";
import {
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  X,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  RefreshCw,
} from "lucide-react";
import { navigate } from "./router";
import labels from "../../../packages/shared/src/id.json";
export const t = labels;
export const date = (value: string | Date | null | undefined) =>
  value ? formatDateTime(value) : "—";
export const day = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
export const localInput = localDateTimeInput;
export const isoInput = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  return localInputToUtc(String(value));
};
export const textValue = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export const numberValue = (form: FormData, key: string) =>
  Number(form.get(key));
export { navigate };
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

let currentAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  currentAuthToken = token;
  if (typeof sessionStorage !== "undefined") {
    if (token) {
      sessionStorage.setItem("uay-access-token", token);
    } else {
      sessionStorage.removeItem("uay-access-token");
    }
  }
}

export function getAuthToken(): string | null {
  if (!currentAuthToken && typeof sessionStorage !== "undefined") {
    currentAuthToken = sessionStorage.getItem("uay-access-token");
  }
  return currentAuthToken;
}

export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  if (method === "GET") {
    // Dashboard and agenda already contain the class cards; reuse those fields
    // when opening the class list instead of asking the server a second time.
    const summary =
      path === "/course-classes"
        ? readCache.peek<any[]>("/course-classes?summary=true")
        : undefined;
    if (summary)
      return summary.map(
        ({ sections, progress, gradingQueue, ...cls }) => cls,
      ) as T;
    return readCache.load(path, readTtl(path), () =>
      requestApi<T>(path, method, body, key),
    );
  }
  readCache.clear();
  try {
    return await requestApi<T>(path, method, body, key);
  } finally {
    readCache.clear();
  }
}

async function requestApi<T>(
  path: string,
  method: string,
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
    const token = getAuthToken();
    try {
      response = await fetch(`${apiBase}/api/v1${path}`, {
        method,
        credentials: isExternalApi ? "include" : "same-origin",
        headers: {
          ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
          ...(method !== "GET" ? { "Idempotency-Key": key } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        readCache.clear();
        setAuthToken(null);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("uay-return-path");
          try {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
              const k = sessionStorage.key(i);
              if (k && (k.startsWith("oidc.") || k.startsWith("authority."))) {
                sessionStorage.removeItem(k);
              }
            }
          } catch {}
        }
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
  const cached = path ? readCache.peek<T>(path) : undefined;
  const [data, setData] = useState<T | null>(cached ?? null),
    [error, setError] = useState<Error | null>(null),
    [loading, setLoading] = useState(Boolean(path && cached === undefined)),
    [version, setVersion] = useState(0);

  const prevPathRef = useRef<string | null>(path);
  const dataRef = useRef<T | null>(data);
  dataRef.current = data;

  useEffect(() => {
    let active = true;
    setError(null);
    if (!path) {
      setLoading(false);
      return;
    }
    const pathChanged = prevPathRef.current !== path;
    prevPathRef.current = path;

    const cached = readCache.peek<T>(path);
    if (pathChanged) {
      setData(cached ?? null);
      setLoading(cached === undefined);
    } else {
      // Revalidation / reload on the same path: keep existing data to avoid
      // full page unmounts and jarring blank-screen flashes.
      if (dataRef.current === null) {
        setData(cached ?? null);
        setLoading(cached === undefined);
      } else {
        setLoading(false);
      }
    }

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
    reload: () => {
      if (path) readCache.evict(path);
      else readCache.clear();
      setVersion((v) => v + 1);
    },
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
      <div className="modal-scroll">
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
      </div>
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
  publication,
}: {
  onSubmit: (
    form: FormData,
    intent: "save" | "publish" | "draft",
  ) => Promise<unknown>;
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
  publication?: {
    published: boolean;
    onUnpublish?: () => Promise<unknown>;
  };
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [pendingAction, setPendingAction] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<FormSnapshot>({});
  const draftRoute = useContext(DraftRouteContext);
  const draft = useLocalDraft(
    (draftRoute || "#" + location.pathname + location.search) + ":" + draftKey,
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
  useLayoutEffect(() => {
    if (!captureFields || !ref.current) return;
    const initialFields = captureForm(ref.current);
    setFields(initialFields);
    draft.initialize({ fields: initialFields, extra: draftValue });
  }, []);
  useEffect(() => {
    onDirtyChange?.(draft.dirty || !!draft.recovery);
  }, [draft.dirty, draft.recovery, onDirtyChange]);
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
        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        const intent = publication
          ? submitter?.value === "draft"
            ? "draft"
            : "publish"
          : "save";
        setBusy(true);
        setPendingAction(intent);
        setError(null);
        try {
          const result = await onSubmit(data, intent);
          if (result !== false) {
            await new Promise((resolve) => setTimeout(resolve, 0));
            await draft.saved();
            if (publication)
              window.dispatchEvent(new Event("notifications-changed"));
          }
        } catch (error) {
          setError(error as Error);
        } finally {
          setBusy(false);
          setPendingAction(null);
        }
      }}
    >
      {autosave && <SaveStatus draft={draft} busy={busy} />}
      <fieldset disabled={busy || disabled || !!draft.recovery}>
        {children}
      </fieldset>
      {error && <Notice error={error} />}
      <div
        className={`form-actions sticky-actions${publication ? " publication-actions" : ""}`}
      >
        {onCancel && (
          <Button
            disabled={busy}
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
          value={publication ? "publish" : "save"}
          variant="primary"
          disabled={busy || disabled || submitDisabled || !!draft.recovery}
        >
          {busy &&
          pendingAction !== "draft" &&
          pendingAction !== "unpublish" ? (
            <>
              <LoaderCircle size={16} className="spin" />
              {t.saving}
            </>
          ) : publication ? (
            "Simpan dan Publikasikan"
          ) : (
            submitLabel
          )}
        </Button>
        {publication && (
          <Button
            type={
              publication.published && publication.onUnpublish
                ? "button"
                : "submit"
            }
            value="draft"
            disabled={busy || disabled || submitDisabled || !!draft.recovery}
            onClick={
              publication.published && publication.onUnpublish
                ? async () => {
                    if (busy || disabled || submitDisabled || draft.recovery)
                      return;
                    setBusy(true);
                    setPendingAction("unpublish");
                    setError(null);
                    try {
                      await publication.onUnpublish!();
                      window.dispatchEvent(new Event("notifications-changed"));
                    } catch (error) {
                      setError(error as Error);
                    } finally {
                      setBusy(false);
                      setPendingAction(null);
                    }
                  }
                : undefined
            }
          >
            {busy &&
            (pendingAction === "draft" || pendingAction === "unpublish") ? (
              <>
                <LoaderCircle size={16} className="spin" />
                {t.saving}
              </>
            ) : publication.published && publication.onUnpublish ? (
              "Tarik Publikasi"
            ) : (
              "Simpan Sebagai Draf"
            )}
          </Button>
        )}
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
  try { validateUploadSize(file.size, purpose); } catch { throw new ApiError("FILE_TYPE_OR_SIZE"); }
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
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    name: string;
    size?: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const res = await uploadFile(
        file,
        classId,
        purpose,
        contextId,
        setProgress,
      );
      setUploadedFile({ id: res.id, name: file.name, size: file.size });
      onUploaded(res);
    } catch (err) {
      setError(err as Error);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (progress === null) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (progress !== null) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const cleanAcceptText = () => {
    if (!accept) return "Semua format berkas umum didukung";
    return accept
      .split(",")
      .map((ext) => ext.trim().replace(/^\./, "").toUpperCase())
      .join(", ");
  };

  return (
    <div className="file-upload-wrapper">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        disabled={progress !== null}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploadedFile && progress === null ? (
        <div className="uploaded-file-card">
          <div className="uploaded-file-info">
            <span className="file-icon-badge">
              <FileText size={20} />
            </span>
            <div className="uploaded-file-meta">
              <span className="uploaded-file-name" title={uploadedFile.name}>
                {uploadedFile.name}
              </span>
              {uploadedFile.size ? (
                <span className="uploaded-file-size">
                  {formatFileSize(uploadedFile.size)}
                </span>
              ) : null}
            </div>
            <span className="upload-success-pill">
              <CheckCircle2 size={14} /> Berhasil diunggah
            </span>
          </div>
          <button
            type="button"
            className="button secondary sm upload-change-btn"
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw size={14} />
            Ganti berkas
          </button>
        </div>
      ) : (
        <div
          className={`file-dropzone ${isDragging ? "is-dragging" : ""} ${progress !== null ? "is-uploading" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (progress === null) inputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (["Enter", " "].includes(e.key) && progress === null) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          {progress !== null ? (
            <div className="uploading-state">
              <LoaderCircle className="spin text-primary" size={28} />
              <div className="uploading-text">
                <span className="uploading-title">
                  {t.uploading} {progress}%
                </span>
                <span className="uploading-subtitle">
                  Mohon jangan menutup halaman ini
                </span>
              </div>
              <progress
                className="upload-progress-bar"
                aria-label="Progres unggahan"
                value={progress}
                max={100}
              />
            </div>
          ) : (
            <div className="dropzone-content">
              <div className="dropzone-icon">
                <UploadCloud size={28} />
              </div>
              <div className="dropzone-text">
                <p className="dropzone-prompt">
                  <strong>Pilih berkas</strong> atau seret dan lepas ke sini
                </p>
                <p className="dropzone-hint">
                  Format: {cleanAcceptText()} (Maks. {uploadLimit(purpose) / 1024 / 1024} MB)
                </p>
              </div>
              <button
                type="button"
                className="button secondary sm dropzone-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Cari berkas
              </button>
            </div>
          )}
        </div>
      )}

      {error && <Notice error={error} />}
    </div>
  );
}

export { Pagination, usePagination } from "./ui";

