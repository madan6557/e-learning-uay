import type { Express } from "express";
import { z } from "zod";
import {
  db,
  ensure,
  config,
  classAccess,
  itemAccess,
  available,
  mutate,
  audit,
  cache,
  HttpError,
} from "./core.js";

const limits = {
  COVER: 5 * 1024 * 1024,
  RESOURCE: 50 * 1024 * 1024,
  SUBMISSION: 50 * 1024 * 1024,
  QUIZ_ANSWER: 50 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
};
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
const blockedExtensions = /\.(html?|svg|js|mjs|exe|dll|bat|cmd|ps1|sh|msi)$/i;
let failures = 0;
let openUntil = 0;
export async function fileRequest(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
): Promise<any> {
  ensure(config.fileUrl && config.fileKey, 503, "FILE_SERVICE_UNAVAILABLE");
  ensure(Date.now() > openUntil, 503, "FILE_SERVICE_UNAVAILABLE");
  for (let attempt = 0; attempt < 3; attempt++)
    try {
      const response = await fetch(`${config.fileUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${config.fileKey}`,
          "Content-Type": "application/json",
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });
      if (response.status >= 500) throw new Error("upstream");
      ensure(response.ok, 502, "FILE_SERVICE_REJECTED");
      failures = 0;
      return await response.json();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (attempt === 2) {
        failures++;
        if (failures >= 3) openUntil = Date.now() + 30000;
        throw new HttpError(503, "FILE_SERVICE_UNAVAILABLE");
      }
      if (method !== "GET" && !key)
        throw new HttpError(503, "FILE_SERVICE_UNAVAILABLE");
      await new Promise((r) => setTimeout(r, 100 * 2 ** attempt));
    }
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
export function registerFiles(app: Express) {
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
          data.sizeBytes <= limits[data.purpose] &&
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
        const ticket = await fileRequest(
          "/v1/uploads",
          "POST",
          {
            ...data,
            ownerSubject: req.context.user.externalSubjectId,
            retentionDays: 7,
          },
          req.get("Idempotency-Key"),
        );
        const id = z.string().min(1).max(200).parse(ticket.fileObjectId);
        const uploadUrl = validateSignedUrl(ticket.uploadUrl);
        await tx.fileReference.create({
          data: {
            id,
            classId: cls.id,
            ownerId: req.context.user.id,
            purpose: data.purpose === "VIDEO" ? "RESOURCE" : data.purpose,
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
          headers: ticket.headers ?? {},
          expiresAt: ticket.expiresAt,
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
    let cls;
    if (resourceId) {
      const resource = await db.resourceItem.findUnique({
        where: { id: resourceId },
      });
      ensure(resource, 404, "NOT_FOUND");
      cls = await itemAccess(db, req.context.user, resource.sectionId);
      if (!cls.canManage) available(resource);
      const ids = resourceFileIds(resource.dynamicPayload);
      ensure(ids.includes(file.id), 403, "FILE_ACCESS_DENIED");
    } else {
      cls = await classAccess(db, req.context.user, file.classId);
      ensure(
        cls.canManage || file.ownerId === req.context.user.id,
        403,
        "FILE_ACCESS_DENIED",
      );
    }
    const ticket = await fileRequest(
      `/v1/files/${encodeURIComponent(file.id)}/download-ticket`,
      "POST",
      {
        ttlSeconds: 900,
        subject: req.context.user.externalSubjectId,
        disposition: req.body.inline ? "inline" : "attachment",
      },
      req.get("Idempotency-Key") ?? req.context.requestId,
    );
    const url = validateSignedUrl(ticket.downloadUrl);
    if (resourceId)
      await cache.set(
        `download:${req.context.user.id}:${resourceId}:${file.id}`,
        "1",
        900,
      );
    res.json({ url, expiresAt: ticket.expiresAt, name: file.name });
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
            file.purpose === "RESOURCE" || file.purpose === "COVER",
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
          await fileRequest(
            `/v1/files/${encodeURIComponent(file.id)}/${operation}`,
            "POST",
            {},
            req.get("Idempotency-Key"),
          );
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
  app.get("/api/v1/course-classes/:id/files", async (req, res) => {
    const cls = await classAccess(db, req.context.user, String(req.params.id));
    ensure(cls.canManage, 403, "WRITE_ACCESS_DENIED");
    res.json(
      await db.fileReference.findMany({
        where: { classId: cls.id, purpose: { in: ["RESOURCE", "COVER"] } },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    );
  });
}
