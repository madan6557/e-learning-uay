import type { Express, Request } from "express";
import type { FileReference } from "@prisma/client";
import { UPLOAD_LIMITS } from "../../../packages/shared/src/files.js";
import { z } from "zod";
import {
  existsSync,
  mkdirSync,
  statSync,
  createWriteStream,
  createReadStream,
  readFileSync,
  writeFileSync,
  accessSync,
  constants,
} from "node:fs";
import { join, resolve } from "node:path";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import {
  db,
  ensure,
  config,
  production,
  isDemo,
  classAccess,
  itemAccess,
  available,
  mutate,
  audit,
  cache,
  serviceFetch,
} from "./core.js";

async function serviceJson(response: Response): Promise<any> {
  let body;
  try { body = await response.json(); } catch { ensure(false, 502, "FILE_SERVICE_INVALID_RESPONSE"); }
  ensure(body && typeof body === "object" && body.success !== false, 502, "FILE_SERVICE_INVALID_RESPONSE");
  return body.data ?? body;
}

export async function checkFileService(options?: { timeoutMs?: number; requestId?: string }) {
  const mode = config.fileMode;
  if (mode === "local") {
    ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
    accessSync(uploadDir, constants.R_OK | constants.W_OK);
    return { status: "ok", mode, simulated: true, timestamp: new Date().toISOString() };
  }
  ensure(config.fileUrl && config.fileKey, 503, "FILE_SERVICE_REQUIRED");
  const response = await serviceFetch("file_service",
    mode === "uay" ? getUayEndpoint("/health") : `${config.fileUrl.replace(/\/+$/, "")}/health`,
    { headers: mode === "uay" ? getUayHeaders(options) : { Authorization: `Bearer ${config.fileKey}` } },
    { idempotent: true, attempts: 1, timeoutMs: options?.timeoutMs ?? 3000 });
  ensure(response.ok, 503, "FILE_SERVICE_UNAVAILABLE");
  const body = await serviceJson(response);
  ensure(["ok", "healthy"].includes(body.status) && body.storage?.accessible !== false,
    502, "FILE_SERVICE_INVALID_RESPONSE");
  return { ...body, mode, simulated: isDemo, timestamp: new Date().toISOString() };
}

async function authorizeFileAccess(req: Request, file: FileReference, resourceId?: string) {
  if (resourceId) {
    const resource = await db.resourceItem.findUnique({ where: { id: resourceId } });
    ensure(resource, 404, "NOT_FOUND");
    ensure(resourceFileIds(resource.dynamicPayload).includes(file.id), 403, "FILE_ACCESS_DENIED");
    const cls = await itemAccess(db, req.context.user, resource.sectionId);
    if (!cls.canManage) available(resource);
    if (["SUBMISSION", "QUIZ_ANSWER"].includes(file.purpose)) {
      const fileClass = await classAccess(db, req.context.user, file.classId);
      ensure(!fileClass.isInactiveParticipant, 403, "PARTICIPATION_DISABLED");
      ensure(fileClass.canManage || file.ownerId === req.context.user.id, 403, "FILE_ACCESS_DENIED");
    }
    return cls;
  }
  const cls = await classAccess(db, req.context.user, file.classId);
  ensure(!cls.isInactiveParticipant, 403, "PARTICIPATION_DISABLED");
  ensure(cls.canManage || file.ownerId === req.context.user.id, 403, "FILE_ACCESS_DENIED");
  return cls;
}

const uploadDir = process.env.UPLOAD_DIR || resolve(process.cwd(), "uploads");

export function getLocalFilePath(id: string): string {
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  return join(uploadDir, `${id.replace(/[^a-zA-Z0-9_-]/g, "")}.bin`);
}

// Memory and disk cache for mapping local file ticket IDs to remote UAY File Service UUIDs
const remoteIdMap = new Map<string, string>();

export async function getRemoteFileId(id: string): Promise<string> {
  const mem = remoteIdMap.get(id);
  if (mem) return mem;
  const cached = await cache.get(`file_remote:${id}`);
  if (cached) {
    remoteIdMap.set(id, cached);
    return cached;
  }
  const metaPath = join(uploadDir, `${id}.meta.json`);
  if (existsSync(metaPath)) {
    try {
      const data = JSON.parse(readFileSync(metaPath, "utf-8"));
      if (data.remoteId) {
        remoteIdMap.set(id, data.remoteId);
        return data.remoteId;
      }
    } catch {}
  }
  return id;
}

export async function setRemoteFileId(
  id: string,
  remoteId: string,
): Promise<void> {
  remoteIdMap.set(id, remoteId);
  remoteIdMap.set(remoteId, id);
  await cache.set(`file_remote:${id}`, remoteId, 86400 * 30);
  try {
    const metaPath = join(uploadDir, `${id}.meta.json`);
    writeFileSync(metaPath, JSON.stringify({ localId: id, remoteId }));
  } catch {}
}

// ---------------------------------------------------------------------------
// Official UAY File Service Client (DOKUMENTASI_API_ENDPOINT.pdf)
// ---------------------------------------------------------------------------

export function getUayEndpoint(path: string): string {
  const base = config.fileUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api/v1")) {
    if (cleanPath.startsWith("/api/v1/")) {
      return `${base}${cleanPath.slice("/api/v1".length)}`;
    }
    return `${base}${cleanPath}`;
  }
  if (cleanPath.startsWith("/api/v1/")) {
    return `${base}${cleanPath}`;
  }
  return `${base}/api/v1${cleanPath}`;
}

export function getUayHeaders(options?: {
  actorId?: string;
  requestId?: string;
  contentType?: string;
  range?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    "x-api-key": config.fileKey,
    Authorization: `Bearer ${config.fileKey}`,
    "x-client-id": config.fileClientId || "elearning-uay",
    "x-request-id": options?.requestId || randomUUID(),
  };
  if (options?.actorId) headers["x-actor-id"] = options.actorId;
  if (options?.contentType) headers["Content-Type"] = options.contentType;
  if (options?.range) headers["Range"] = options.range;
  return headers;
}

export async function uayUpload(params: {
  fileBuffer: Buffer | Uint8Array;
  fileName: string;
  mimeType: string;
  repositoryId?: string;
  visibility?: "public" | "private";
  resourceType?: string;
  resourceId?: string;
  folderId?: string;
  actorId?: string;
  requestId?: string;
}) {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([params.fileBuffer as any], { type: params.mimeType }),
    params.fileName,
  );
  formData.append(
    "repository_id",
    params.repositoryId ||
      config.fileRepoId ||
      "00000000-0000-0000-0000-000000000001",
  );
  formData.append("visibility", params.visibility || "private");
  if (params.resourceType) formData.append("resource_type", params.resourceType);
  if (params.resourceId) formData.append("resource_id", params.resourceId);
  if (params.folderId) formData.append("folder_id", params.folderId);

  const res = await serviceFetch(
    "file_service",
    getUayEndpoint("/files"),
    {
      method: "POST",
      headers: getUayHeaders({
        actorId: params.actorId,
        requestId: params.requestId,
      }),
      body: formData,
    },
  );
  ensure(res.ok, 502, "FILE_SERVICE_REJECTED");
  const uploaded = await serviceJson(res);
  const fileId = uploaded.fileId || uploaded.id;
  ensure(typeof fileId === "string", 502, "FILE_SERVICE_INVALID_RESPONSE");
  return { ...uploaded, id: fileId, fileId };
}

export async function uayGetMetadata(
  fileId: string,
  options?: { actorId?: string; requestId?: string },
) {
  const res = await serviceFetch(
    "file_service",
    getUayEndpoint(`/files/${encodeURIComponent(fileId)}/metadata`),
    {
      method: "GET",
      headers: getUayHeaders(options),
    },
    { idempotent: true },
  );
  ensure(res.ok, res.status === 404 ? 404 : 502, "FILE_SERVICE_REJECTED");
  const meta = await serviceJson(res);
  ensure(typeof meta.fileId === "string" && typeof meta.originalName === "string" &&
    Number.isSafeInteger(meta.sizeBytes) && meta.sizeBytes > 0 && typeof meta.mimeType === "string" &&
    typeof meta.status === "string", 502, "FILE_SERVICE_INVALID_RESPONSE");
  return meta;
}

export async function uayStreamFile(
  fileId: string,
  rangeHeader?: string,
  options?: { actorId?: string; requestId?: string },
) {
  const res = await serviceFetch(
    "file_service",
    getUayEndpoint(`/files/${encodeURIComponent(fileId)}`),
    {
      method: "GET",
      headers: getUayHeaders({
        actorId: options?.actorId,
        requestId: options?.requestId,
        range: rangeHeader,
      }),
    },
    { idempotent: true },
  );
  return res;
}

export async function uayTrash(
  fileId: string,
  options?: { actorId?: string; requestId?: string },
) {
  const res = await serviceFetch(
    "file_service",
    getUayEndpoint(`/files/${encodeURIComponent(fileId)}`),
    {
      method: "DELETE",
      headers: getUayHeaders(options),
    },
  );
  ensure(res.ok, 502, "FILE_SERVICE_REJECTED");
  return serviceJson(res);
}

export async function uayRestore(
  fileId: string,
  options?: { actorId?: string; requestId?: string },
) {
  const res = await serviceFetch(
    "file_service",
    getUayEndpoint(`/files/${encodeURIComponent(fileId)}/restore`),
    {
      method: "POST",
      headers: getUayHeaders(options),
      body: JSON.stringify({}),
    },
  );
  ensure(res.ok, 502, "FILE_SERVICE_REJECTED");
  return serviceJson(res);
}

export async function uayGetRepositories(options?: {
  actorId?: string;
  requestId?: string;
}) {
  const res = await serviceFetch(
    "file_service",
    getUayEndpoint("/repositories"),
    {
      method: "GET",
      headers: getUayHeaders(options),
    },
    { idempotent: true },
  );
  ensure(res.ok, 502, "FILE_SERVICE_REJECTED");
  const repos = await serviceJson(res);
  ensure(Array.isArray(repos) && repos.every(r => r && typeof r.id === "string" && typeof r.name === "string"),
    502, "FILE_SERVICE_INVALID_RESPONSE");
  return repos;
}

export function createSignedDownloadToken(
  id: string,
  ttlSeconds = 900,
): string {
  const expires = Date.now() + ttlSeconds * 1000;
  const token = createHmac(
    "sha256",
    config.fileKey || config.clientSecret || "uay-elearning-storage",
  )
    .update(`${id}:download:${expires}`)
    .digest("hex");
  return `${expires}.${token}`;
}

export function verifySignedDownloadToken(
  id: string,
  rawToken: string,
): boolean {
  if (!rawToken || !rawToken.includes(".")) return false;
  const [expiresStr, token] = rawToken.split(".");
  const expires = Number(expiresStr);
  if (!expires || expires < Date.now()) return false;
  const expected = createHmac(
    "sha256",
    config.fileKey || config.clientSecret || "uay-elearning-storage",
  )
    .update(`${id}:download:${expires}`)
    .digest("hex");
  return (
    token.length === expected.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  );
}

// ---------------------------------------------------------------------------
// Legacy mock request handler (for backwards compatibility)
// ---------------------------------------------------------------------------

async function handleLocalFileRequest(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<any> {
  if (production && !isDemo) {
    throw Object.assign(new Error("FILE_SERVICE_REQUIRED"), { status: 503 });
  }
  const base = (config.apiOrigin || config.origin || "").replace(/\/$/, "");
  if (path === "/v1/uploads") {
    const id = randomUUID();
    return {
      fileObjectId: id,
      uploadUrl: `${base}/api/v1/files/local-storage/${id}`,
      headers: {
        "Content-Type":
          (body as any)?.mimeType || "application/octet-stream",
      },
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
  if (path.startsWith("/v1/files/") && path.endsWith("/download-ticket")) {
    const parts = path.split("/");
    const id = decodeURIComponent(parts[3]);
    return {
      downloadUrl: `${base}/api/v1/files/local-storage/${id}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
  }
  if (path.startsWith("/v1/files/")) {
    const parts = path.split("/");
    const id = decodeURIComponent(parts[3]);
    const filePath = getLocalFilePath(id);
    if (existsSync(filePath)) {
      const stat = statSync(filePath);
      const fileRef = await db.fileReference.findUnique({ where: { id } });
      return {
        fileObjectId: id,
        status: "READY",
        scanStatus: "CLEAN",
        checksum: fileRef?.checksum,
        sizeBytes: stat.size,
        mimeType: fileRef?.mimeType,
      };
    }
    return {
      fileObjectId: id,
      status: "READY",
      scanStatus: "CLEAN",
      checksum: (body as any)?.checksum,
      sizeBytes: (body as any)?.sizeBytes,
      mimeType: (body as any)?.mimeType,
    };
  }
  return { status: "OK" };
}

const allowedTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
  "text/csv",
  "text/plain",
  "text/x-python",
  "text/x-c++src",
  "application/octet-stream",
  "video/mp4",
  "video/webm",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const blockedExtensions =
  /\.(html?|svg|js|mjs|exe|dll|bat|cmd|ps1|sh|msi)$/i;

export async function fileRequest(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<any> {
  if (config.fileMode !== "local") {
    ensure(config.fileUrl && config.fileKey, 503, "FILE_SERVICE_REQUIRED");
    const response = await serviceFetch(
      "file_service",
      `${config.fileUrl}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${config.fileKey}`,
          "Content-Type": "application/json",
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      { idempotent: method === "GET" || Boolean(key) },
    );
    ensure(response.ok, 502, "FILE_SERVICE_REJECTED");
    return await serviceJson(response);
  }
  return handleLocalFileRequest(path, method, body);
}

export function validateSignedUrl(value: unknown) {
  ensure(typeof value === "string", 502, "INVALID_FILE_TICKET");
  const url = new URL(value);
  ensure(config.fileOrigins.includes(url.origin), 502, "INVALID_FILE_TICKET");
  return value;
}

export async function ensureOwnedFile(
  tx: any,
  id: string,
  userId: string,
  classId: string,
  purpose: string,
  contextId: string,
) {
  const file = await tx.fileReference.findUnique({ where: { id } });
  ensure(
    file &&
      file.ownerId === userId &&
      file.classId === classId &&
      file.purpose === purpose &&
      file.contextId === contextId &&
      file.status === "READY",
    400,
    "FILE_NOT_READY",
  );
  return file;
}

export function resourceFileIds(payload: any): string[] {
  return [
    payload.fileObjectId,
    ...(payload.blocks ?? []).map((b: any) => b.data?.fileObjectId),
  ].filter((id): id is string => typeof id === "string");
}

export function resourcesUsingFile(tx: any, id: string, classId?: string) {
  return tx.resourceItem.findMany({
    where: {
      ...(classId ? { section: { classId } } : {}),
      OR: [
        { dynamicPayload: { path: ["fileObjectId"], equals: id } },
        {
          dynamicPayload: {
            path: ["blocks"],
            array_contains: [{ data: { fileObjectId: id } }],
          },
        },
      ],
    },
    include: { section: { select: { classId: true } } },
  });
}

// Helper to stream binary files (local or remote UAY File Service with RFC 7233 range)
async function serveFileStream(id: string, req: any, res: any) {
  if (production && !isDemo && config.fileMode === "local") {
    res.status(503).json({ error: "FILE_SERVICE_REQUIRED" });
    return;
  }
  const fileRef = await db.fileReference.findUnique({ where: { id } });
  if (config.fileMode === "uay") {
    try {
      const targetId = await getRemoteFileId(id);
      const remoteRes = await uayStreamFile(targetId, req.headers.range, {
        actorId: req.context?.user?.id,
        requestId: req.context?.requestId,
      });
      if (remoteRes.ok || remoteRes.status === 206) {
        res.status(remoteRes.status);
        for (const [key, value] of remoteRes.headers.entries()) {
          if (
            [
              "content-type",
              "content-length",
              "content-range",
              "accept-ranges",
              "content-disposition",
            ].includes(key.toLowerCase())
          ) {
            res.setHeader(key, value);
          }
        }
        if (!res.getHeader("Content-Type") && fileRef?.mimeType) {
          res.setHeader("Content-Type", fileRef.mimeType);
        }
        if (!res.getHeader("Content-Disposition") && fileRef?.name) {
          res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(fileRef.name)}"`,
          );
        }
        if (remoteRes.body) {
          const bodyStream = Readable.fromWeb(remoteRes.body as any);
          bodyStream.pipe(res);
          return;
        }
      }
    } catch (err) { throw err; }
    ensure(false, 502, "FILE_SERVICE_REJECTED");
  }

  if (production && !isDemo && config.fileMode !== "legacy") {
    res.status(502).json({ error: "FILE_SERVICE_UNAVAILABLE" });
    return;
  }

  const filePath = getLocalFilePath(id);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  const stat = statSync(filePath);
  const totalSize = stat.size;
  const mimeType = fileRef?.mimeType || "application/octet-stream";
  const fileName = fileRef?.name || "file.bin";

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", mimeType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${encodeURIComponent(fileName)}"`,
  );

  const range = req.headers.range;
  if (range && range.startsWith("bytes=")) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
    if (
      isNaN(start) ||
      isNaN(end) ||
      start >= totalSize ||
      end >= totalSize ||
      start > end
    ) {
      res.status(416).setHeader("Content-Range", `bytes */${totalSize}`).end();
      return;
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${totalSize}`);
    res.setHeader("Content-Length", end - start + 1);
    createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.status(200);
    res.setHeader("Content-Length", totalSize);
    createReadStream(filePath).pipe(res);
  }
}

// Helper to handle binary PUT upload
async function handleBinaryUpload(id: string, req: any, res: any) {
  if (production && !isDemo && config.fileMode === "local") {
    res.status(503).json({ error: "FILE_SERVICE_REQUIRED" });
    return;
  }
  const fileRef = await db.fileReference.findUnique({ where: { id } });
  ensure(fileRef, 404, "NOT_FOUND");
  ensure(fileRef.ownerId === req.context.user.id, 403, "FILE_ACCESS_DENIED");
  const limit = UPLOAD_LIMITS[fileRef.purpose as keyof typeof UPLOAD_LIMITS];
  ensure(limit && fileRef.sizeBytes <= limit, 400, "FILE_TYPE_OR_SIZE");
  const filePath = getLocalFilePath(id);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buf.length;
    ensure(size <= fileRef.sizeBytes && size <= limit, 400, "FILE_TYPE_OR_SIZE");
    chunks.push(buf);
  }
  ensure(size === fileRef.sizeBytes, 400, "FILE_TYPE_OR_SIZE");
  const binaryBuffer = Buffer.concat(chunks);
  writeFileSync(filePath, binaryBuffer);

  if (config.fileMode === "uay") {
    try {
      const uayRes = await uayUpload({
        fileBuffer: binaryBuffer,
        fileName: fileRef.name,
        mimeType: fileRef.mimeType,
        visibility: "private",
        resourceType: fileRef.purpose,
        resourceId: fileRef.contextId || fileRef.classId,
        actorId: fileRef.ownerId,
        requestId: req.context?.requestId,
      });
      const remoteId = uayRes?.fileId || uayRes?.id;
      if (remoteId) {
        await setRemoteFileId(id, remoteId);
      } else {
        ensure(false, 502, "FILE_SERVICE_INVALID_RESPONSE");
      }
    } catch (err) { throw err; }
  } else if (production && !isDemo && config.fileMode !== "legacy") {
    res.status(503).json({ error: "FILE_SERVICE_REQUIRED" });
    return;
  }
  res.status(200).json({ status: "READY" });
}

export function registerFiles(app: Express) {
  app.get("/api/v1/files/health", async (req, res) => {
    const data = await checkFileService({ requestId: req.context.requestId });
    res.json({ statusCode: 200, success: true, data,
      message: data.simulated ? "File service simulation is available" : "File service is healthy" });
  });

  app.post("/api/v1/files/upload-ticket", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const data = z
          .object({
            classId: z.string().uuid(),
            purpose: z.enum([
              "COVER",
              "RESOURCE",
              "SUBMISSION",
              "QUIZ_ANSWER",
              "VIDEO",
            ]),
            contextId: z.string().uuid().optional(),
            name: z
              .string()
              .min(1)
              .max(250)
              .refine((v) => !/[\\/\x00-\x1f]/.test(v), "INVALID_FILE_NAME"),
            mimeType: z.string(),
            sizeBytes: z.number().int().positive(),
            checksum: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .parse(req.body);
        ensure(
          data.sizeBytes <= UPLOAD_LIMITS[data.purpose] &&
            allowedTypes.has(data.mimeType) &&
            !blockedExtensions.test(data.name),
          400,
          "FILE_TYPE_OR_SIZE",
        );
        if (data.purpose === "COVER")
          ensure(data.mimeType.startsWith("image/"), 400, "FILE_TYPE_OR_SIZE");
        if (data.purpose === "VIDEO")
          ensure(data.mimeType.startsWith("video/"), 400, "FILE_TYPE_OR_SIZE");
        const student = ["SUBMISSION", "QUIZ_ANSWER"].includes(data.purpose);
        const cls = await classAccess(
          tx,
          req.context.user,
          data.classId,
          true,
          student,
        );
        if (student) {
          ensure(!cls.canManage, 403, "STUDENT_REQUIRED");
          ensure(data.contextId, 400, "FILE_CONTEXT_REQUIRED");
          if (data.purpose === "SUBMISSION") {
            const item = await tx.assignment.findUnique({
              where: { id: data.contextId },
              include: { section: true },
            });
            ensure(
              item && item.section.classId === cls.id,
              400,
              "FILE_CONTEXT_REQUIRED",
            );
            await itemAccess(tx, req.context.user, item.sectionId, true, true);
            available(item);
            ensure(
              !item.cutoffDate || new Date() <= item.cutoffDate,
              403,
              "CUTOFF_PASSED",
            );
          } else {
            const attempt = await tx.quizAttempt.findUnique({
              where: { id: data.contextId },
              include: { quiz: { include: { section: true } } },
            });
            ensure(
              attempt &&
                attempt.userId === req.context.user.id &&
                attempt.quiz.section.classId === cls.id &&
                attempt.status === "IN_PROGRESS" &&
                attempt.expiresAt > new Date(),
              403,
              "ATTEMPT_CLOSED",
            );
          }
        }

        let id: string;
        let uploadUrl: string;
        let headers: Record<string, string>;
        let expiresAt: string;

        if (config.fileMode === "legacy") {
          const ticket = await fileRequest(
            "/v1/uploads",
            "POST",
            {
              ...data,
              ownerSubject: req.context.user.ssoUserId,
              retentionDays: 7,
            },
            req.get("Idempotency-Key"),
          );
          id = z.string().min(1).max(200).parse(ticket.fileObjectId);
          uploadUrl = validateSignedUrl(ticket.uploadUrl);
          headers = ticket.headers ?? {};
          expiresAt = ticket.expiresAt;
        } else if (config.fileMode === "uay") {
          id = randomUUID();
          const base = (config.apiOrigin || config.origin || "").replace(
            /\/$/,
            "",
          );
          uploadUrl = validateSignedUrl(
            `${base}/api/v1/files/upload/${id}`,
          );
          headers = { "Content-Type": data.mimeType };
          expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        } else {
          // Local storage mode: strictly forbidden in production
          ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
          id = randomUUID();
          const base = (config.apiOrigin || config.origin || "").replace(
            /\/$/,
            "",
          );
          uploadUrl = validateSignedUrl(
            `${base}/api/v1/files/upload/${id}`,
          );
          headers = { "Content-Type": data.mimeType };
          expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        await tx.fileReference.create({
          data: {
            id,
            classId: cls.id,
            ownerId: req.context.user.id,
            purpose: data.purpose,
            contextId: data.contextId,
            name: data.name,
            mimeType: data.mimeType,
            sizeBytes: data.sizeBytes,
            checksum: data.checksum,
          },
        });
        await audit(
          tx,
          req.context,
          "REQUEST_UPLOAD",
          "FILE",
          id,
          cls.id,
          null,
          { name: data.name, sizeBytes: data.sizeBytes },
        );
        return {
          fileObjectId: id,
          uploadUrl,
          method: "PUT",
          headers,
          expiresAt,
        };
      }),
    ),
  );

  app.post("/api/v1/files/:id/confirm", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const file = await tx.fileReference.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(
          file && file.ownerId === req.context.user.id,
          403,
          "FILE_ACCESS_DENIED",
        );
        await classAccess(
          tx,
          req.context.user,
          file.classId,
          true,
          ["SUBMISSION", "QUIZ_ANSWER"].includes(file.purpose),
        );

        if (config.fileMode === "uay") {
          const targetId = await getRemoteFileId(file.id);
          const metadata = await uayGetMetadata(targetId, {
            actorId: req.context.user.id, requestId: req.context.requestId,
          });
          ensure(["active", "ready"].includes(metadata.status.toLowerCase()) &&
            metadata.checksum === file.checksum && metadata.sizeBytes === file.sizeBytes &&
            metadata.mimeType === file.mimeType, 409, "FILE_NOT_READY");
        } else if (config.fileMode === "legacy") {
          const metadata = await fileRequest(
            `/v1/files/${encodeURIComponent(file.id)}`,
          );
          ensure(
            metadata.status === "READY" &&
              metadata.scanStatus === "CLEAN" &&
              metadata.checksum === file.checksum &&
              metadata.sizeBytes === file.sizeBytes &&
              metadata.mimeType === file.mimeType,
            409,
            "FILE_NOT_READY",
          );
        } else {
          ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
          const filePath = getLocalFilePath(file.id);
          ensure(existsSync(filePath), 409, "FILE_NOT_READY");
        }

        const after = await tx.fileReference.update({
          where: { id: file.id },
          data: { status: "READY" },
        });
        await audit(
          tx,
          req.context,
          "CONFIRM_UPLOAD",
          "FILE",
          file.id,
          file.classId,
          file,
          after,
        );
        return after;
      }),
    ),
  );

  app.post("/api/v1/files/:id/download-ticket", async (req, res) => {
    const file = await db.fileReference.findUnique({
      where: { id: String(req.params.id) },
    });
    ensure(file && file.status === "READY", 404, "FILE_NOT_READY");
    const resourceId = z.string().uuid().optional().parse(req.body.resourceId);
    const cls = await authorizeFileAccess(req, file, resourceId);

    let url: string;
    let expiresAt: string;

    if (config.fileMode === "legacy") {
      const ticket = await fileRequest(
        `/v1/files/${encodeURIComponent(file.id)}/download-ticket`,
        "POST",
        {
          ttlSeconds: 900,
          subject: req.context.user.ssoUserId,
          disposition: req.body.inline ? "inline" : "attachment",
        },
        req.get("Idempotency-Key") ?? req.context.requestId,
      );
      url = validateSignedUrl(ticket.downloadUrl);
      expiresAt = ticket.expiresAt;
    } else if (config.fileMode === "uay") {
      const base = (config.apiOrigin || config.origin || "").replace(
        /\/$/,
        "",
      );
      const token = createSignedDownloadToken(file.id, 900);
      expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
      url = validateSignedUrl(
        `${base}/api/v1/files/${file.id}/stream?token=${encodeURIComponent(token)}${
          req.body.inline ? "&inline=1" : ""
        }`,
      );
    } else {
      ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
      const base = (config.apiOrigin || config.origin || "").replace(
        /\/$/,
        "",
      );
      const token = createSignedDownloadToken(file.id, 900);
      expiresAt = new Date(Date.now() + 900 * 1000).toISOString();
      url = validateSignedUrl(
        `${base}/api/v1/files/${file.id}/stream?token=${encodeURIComponent(token)}${
          req.body.inline ? "&inline=1" : ""
        }`,
      );
    }

    if (resourceId)
      await cache.set(
        `download:${req.context.user.id}:${resourceId}:${file.id}`,
        "1",
        900,
      );
    res.json({ url, expiresAt, name: file.name });
  });

  app.post("/api/v1/resources/:id/confirm-download", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const resourceItemId = String(req.params.id);
        const { fileObjectId } = z
          .object({ fileObjectId: z.string() })
          .parse(req.body);
        const resource = await tx.resourceItem.findUnique({
          where: { id: resourceItemId },
        });
        ensure(resource, 404, "NOT_FOUND");
        const cls = await itemAccess(
          tx,
          req.context.user,
          resource.sectionId,
          true,
          true,
        );
        available(resource);
        const payload = resource.dynamicPayload as any;
        ensure(
          resourceFileIds(payload).includes(fileObjectId),
          403,
          "FILE_ACCESS_DENIED",
        );
        if (resource.resourceType === "LAB_PRACTICUM" && payload.fileObjectId)
          ensure(
            payload.fileObjectId === fileObjectId,
            400,
            "DOWNLOAD_REQUIRED",
          );
        const file = await tx.fileReference.findUnique({
          where: { id: fileObjectId },
        });
        ensure(file?.status === "READY", 404, "FILE_NOT_READY");
        ensure(
          !cls.canManage &&
            (await cache.get(
              `download:${req.context.user.id}:${resourceItemId}:${fileObjectId}`,
            )),
          403,
          "DOWNLOAD_REQUIRED",
        );
        const userId = req.context.user.id;
        const after = await tx.materialDownload.upsert({
          where: { userId_resourceItemId: { userId, resourceItemId } },
          create: { userId, resourceItemId },
          update: {},
        });
        return after;
      }),
    ),
  );

  for (const operation of ["trash", "restore"] as const)
    app.post(`/api/v1/files/:id/${operation}`, async (req, res) =>
      res.json(
        await mutate(req, async (tx) => {
          const file = await tx.fileReference.findUnique({
            where: { id: String(req.params.id) },
          });
          ensure(file, 404, "NOT_FOUND");
          await classAccess(tx, req.context.user, file.classId, true);
          ensure(
            ["RESOURCE", "VIDEO", "COVER"].includes(file.purpose),
            403,
            "SUBMISSION_FILE_IMMUTABLE",
          );
          ensure(
            operation === "trash"
              ? file.status === "READY"
              : file.status === "TRASH" &&
                  file.trashedAt &&
                  Date.now() - file.trashedAt.getTime() <= 7 * 86400000,
            409,
            "FILE_LIFECYCLE",
          );
          const referenced = await resourcesUsingFile(tx, file.id);
          for (const resource of referenced) {
            ensure(
              resource.section.classId === file.classId,
              409,
              "FILE_SHARED",
            );
            const cls = await itemAccess(
              tx,
              req.context.user,
              resource.sectionId,
              true,
            );
            ensure(cls.canManage, 403, "FILE_SHARED");
          }

          if (config.fileMode === "uay") {
            const targetId = await getRemoteFileId(file.id);
            try {
              if (operation === "trash") {
                await uayTrash(targetId, {
                  actorId: req.context.user.id,
                  requestId: req.context.requestId,
                });
              } else {
                await uayRestore(targetId, {
                  actorId: req.context.user.id,
                  requestId: req.context.requestId,
                });
              }
            } catch (err) { throw err; }
          } else if (config.fileMode === "legacy") {
            await fileRequest(
              `/v1/files/${encodeURIComponent(file.id)}/${operation}`,
              "POST",
              {},
              req.get("Idempotency-Key"),
            );
          } else {
            ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
          }

          const after = await tx.fileReference.update({
            where: { id: file.id },
            data: {
              status: operation === "trash" ? "TRASH" : "READY",
              trashedAt: operation === "trash" ? new Date() : null,
            },
          });
          await audit(
            tx,
            req.context,
            operation.toUpperCase(),
            "FILE",
            file.id,
            file.classId,
            file,
            after,
          );
          return after;
        }),
      ),
    );

  // Soft delete alias matching official specification DELETE /api/v1/files/:id
  app.delete("/api/v1/files/:id", async (req, res) => {
    try {
      const file = await db.fileReference.findUnique({
        where: { id: String(req.params.id) },
      });
      ensure(file, 404, "NOT_FOUND");
      await classAccess(db, req.context.user, file.classId, true);
      ensure(
        ["RESOURCE", "VIDEO", "COVER"].includes(file.purpose),
        403,
        "SUBMISSION_FILE_IMMUTABLE",
      );
      ensure(file.status === "READY", 409, "FILE_LIFECYCLE");

      if (config.fileMode === "uay") {
        const targetId = await getRemoteFileId(file.id);
        try {
          await uayTrash(targetId, {
            actorId: req.context.user.id,
            requestId: req.context.requestId,
          });
        } catch (err) { throw err; }
      } else if (config.fileMode === "legacy") {
        await fileRequest(
          `/v1/files/${encodeURIComponent(file.id)}/trash`,
          "POST",
          {},
          req.get("Idempotency-Key"),
        );
      } else {
        ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
      }

      await db.fileReference.update({
        where: { id: file.id },
        data: { status: "TRASH", trashedAt: new Date() },
      });
      await audit(
        db,
        req.context,
        "TRASH",
        "FILE",
        file.id,
        file.classId,
        file,
        { ...file, status: "TRASH" },
      );
      res.json({
        statusCode: 200,
        success: true,
        message: "File moved to trash successfully",
        data: { id: file.id, status: "deleted" },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        statusCode: err.status || 500,
        success: false,
        error: err.code || "FILE_OPERATION_FAILED",
        message: err.message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      });
    }
  });

  app.get("/api/v1/course-classes/:id/files", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
    res.json(
      await db.fileReference.findMany({
        where: { classId: cls.id, purpose: { in: ["RESOURCE", "VIDEO", "COVER"] } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    );
  });

  // Direct and local-storage PUT endpoints
  app.put("/api/v1/files/upload/:id", (req, res) =>
    handleBinaryUpload(String(req.params.id), req, res),
  );
  app.put("/api/v1/files/local-storage/:id", (req, res) => {
    if (production && !isDemo) {
      res.status(403).json({ error: "LOCAL_STORAGE_DISABLED_IN_PRODUCTION" });
      return;
    }
    handleBinaryUpload(String(req.params.id), req, res);
  });

  // Streaming and download endpoints (RFC 7233 byte-range support)
  const streamHandler = async (req: any, res: any) => {
    const id = String(req.params.id);
    const token = String(req.query.token || "");
    const hasValidToken = verifySignedDownloadToken(id, token);
    if (!hasValidToken) {
      if (!req.context?.user) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
      }
      const file = await db.fileReference.findUnique({ where: { id } });
      if (!file || file.status !== "READY") {
        res.status(404).json({ error: "NOT_FOUND" });
        return;
      }
    }
    await serveFileStream(id, req, res);
  };

  app.get("/api/v1/files/:id/stream", streamHandler);
  app.get("/api/v1/files/local-storage/:id", (req, res) => {
    if (production && !isDemo) {
      res.status(403).json({ error: "LOCAL_STORAGE_DISABLED_IN_PRODUCTION" });
      return;
    }
    streamHandler(req, res);
  });
  app.get("/api/v1/files/:id", streamHandler);

  app.get("/api/v1/files/:id/metadata", async (req, res) => {
    const file = await db.fileReference.findUnique({ where: { id: String(req.params.id) } });
    ensure(file, 404, "NOT_FOUND");
    const resourceId = z.string().uuid().optional().parse(req.query.resourceId);
    await authorizeFileAccess(req, file, resourceId);
    let data;
    if (config.fileMode === "uay") {
      data = await uayGetMetadata(await getRemoteFileId(file.id), {
        actorId: req.context.user.id, requestId: req.context.requestId,
      });
    } else if (config.fileMode === "legacy") {
      data = await fileRequest("/v1/files/" + encodeURIComponent(file.id));
      ensure(typeof data.status === "string" && Number.isSafeInteger(data.sizeBytes) &&
        data.sizeBytes > 0 && typeof data.mimeType === "string", 502, "FILE_SERVICE_INVALID_RESPONSE");
    } else {
      ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
      data = {
        fileId: file.id, originalName: file.name, sizeBytes: file.sizeBytes,
        mimeType: file.mimeType, checksum: file.checksum,
        status: file.status === "READY" ? "active" : file.status.toLowerCase(),
        visibility: "private", simulated: true,
      };
    }
    res.json({ statusCode: 200, success: true, data,
      message: "Metadata retrieved successfully", timestamp: new Date().toISOString() });
  });

  app.get("/api/v1/repositories", async (req, res) => {
    ensure(config.fileMode !== "legacy", 501, "FILE_SERVICE_OPERATION_UNSUPPORTED");
    let data;
    if (config.fileMode === "uay") {
      data = await uayGetRepositories({ actorId: req.context.user.id, requestId: req.context.requestId });
    } else {
      ensure(!production || isDemo, 503, "FILE_SERVICE_REQUIRED");
      data = [{ id: config.fileRepoId, name: "Penyimpanan lokal (simulasi)", slug: "elearning",
        status: "active", simulated: true }];
    }
    res.json({ statusCode: 200, success: true, data,
      message: "Repositories retrieved successfully", timestamp: new Date().toISOString() });
  });


}
