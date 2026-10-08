import {
  uploadLimit,
  validateUploadSize,
} from "../../../../packages/shared/src/files";
import { formatDateTime } from "../../../../packages/shared/src/time";
import { readCache, readTtl } from "../readCache";
import labels from "../../../../packages/shared/src/id.json";

export const t = labels;

export class ApiError extends Error {
  constructor(
    public code: string,
    public details?: any,
    public requestId?: string,
  ) {
    const base =
      (t.errors as Record<string, string>)[code] ??
      "Tindakan belum berhasil. Coba lagi; jika tetap gagal, hubungi administrator dengan ID permintaan di bawah.";
    super(details?.at ? `${base} ${formatDateTime(details.at)}.` : base);
  }
}

// Preserve a logical write's key when the response is lost, including a manual retry.
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

export function parseJwtPayload(
  token: string | null | undefined,
): Record<string, any> | null {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<T> {
  if (method === "GET") {
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
      if (
        response.status === 401 &&
        !(path === "/me" && !token && data.error?.code === "LOGIN_REQUIRED")
      ) {
        uncertainWrites.clear();
        readCache.clear();
        setAuthToken(null);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("uay-return-path");
          // OIDC state belongs to an in-progress sign-in and must survive unrelated 401s.
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

export async function uploadFile(
  file: File,
  classId: string,
  purpose: string,
  contextId: string | undefined,
  onProgress: (value: number) => void,
) {
  try {
    validateUploadSize(file.size, purpose);
  } catch {
    throw new ApiError("FILE_TYPE_OR_SIZE");
  }
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
