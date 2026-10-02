// Isolated development File Service. Never run this fixture as production storage.
import http from "node:http";
import {
  createHash,
  randomUUID,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { Readable } from "node:stream";
import { createFileStorage } from "./file-storage.mjs";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile();
} catch {}
if (process.env.NODE_ENV === "production")
  throw new Error("Development File Service cannot run in production.");
const storage = await createFileStorage();
const key = process.env.FILE_SERVICE_KEY ?? "local-development-only";
const origin = process.env.APP_ORIGIN ?? "http://127.0.0.1:5173";
const port = Number(process.env.FILE_SERVICE_PORT ?? 3001);
const base = process.env.FILE_PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`;
const ticket = (id, action, ttl = 900) => {
  const exp = Date.now() + ttl * 1000;
  const token = createHmac("sha256", key)
    .update(`${id}:${action}:${exp}`)
    .digest("hex");
  return `${base}/objects/${id}?action=${action}&expires=${exp}&token=${token}`;
};
async function readBody(req, max) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max)
      throw Object.assign(new Error("too large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function metadata(id) {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id))
    throw Object.assign(new Error("not found"), { status: 404 });
  return JSON.parse((await storage.read(`${id}.json`)).toString("utf8"));
}
const send = (res, status, value) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
};
const server = http.createServer(async (req, res) => {
  if (req.headers.origin === origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,x-api-key,x-actor-id,x-client-id,x-request-id,Range",
    );
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, base);
  try {
    // Health checks (both legacy and official)
    if (url.pathname === "/health" || url.pathname === "/api/v1/health") {
      send(res, 200, {
        statusCode: 200,
        success: true,
        data: {
          status: "ok",
          timestamp: new Date().toISOString(),
          storage: { driver: storage.provider, accessible: true },
        },
      });
      return;
    }

    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers["x-api-key"];
    const isAuth =
      authHeader === `Bearer ${key}` ||
      apiKeyHeader === key ||
      key === "local-development-only";

    // Official UAY File Service API (/api/v1/...)
    if (url.pathname.startsWith("/api/v1/")) {
      if (!isAuth) {
        send(res, 401, {
          statusCode: 401,
          success: false,
          error: "UNAUTHORIZED",
          message: "Invalid or missing API key",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (url.pathname === "/api/v1/repositories" && req.method === "GET") {
        send(res, 200, {
          statusCode: 200,
          success: true,
          data: [
            {
              id: "00000000-0000-0000-0000-000000000001",
              name: "E-Learning Materials",
              slug: "elearning",
              status: "active",
            },
          ],
          message: "Repositories retrieved successfully",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (url.pathname === "/api/v1/files" && req.method === "POST") {
        let binary;
        let originalName = "uploaded_file.bin";
        let mimeType = "application/octet-stream";
        let repoId = "00000000-0000-0000-0000-000000000001";
        let visibility = "private";

        const contentType = req.headers["content-type"] || "";
        if (contentType.includes("multipart/form-data")) {
          const webReq = new Request("http://localhost", {
            method: "POST",
            headers: req.headers,
            body: Readable.toWeb(req),
            duplex: "half",
          });
          const formData = await webReq.formData();
          const file = formData.get("file");
          if (file && typeof file === "object" && "arrayBuffer" in file) {
            originalName = file.name || originalName;
            mimeType = file.type || mimeType;
            binary = Buffer.from(await file.arrayBuffer());
          } else {
            binary = Buffer.alloc(0);
          }
          repoId = String(formData.get("repository_id") || repoId);
          visibility = String(formData.get("visibility") || visibility);
        } else {
          binary = await readBody(req, 100 * 1024 * 1024);
          originalName =
            (req.headers["x-filename"] && decodeURIComponent(String(req.headers["x-filename"]))) ||
            originalName;
          mimeType = contentType || mimeType;
        }

        const id = randomUUID();
        const checksum = createHash("sha256").update(binary).digest("hex");
        const record = {
          id,
          name: originalName,
          original_name: originalName,
          sizeBytes: binary.length,
          size_bytes: binary.length,
          mimeType,
          mime_type: mimeType,
          checksum,
          status: "READY",
          scanStatus: "CLEAN",
          visibility,
          repository_id: repoId,
          createdAt: new Date().toISOString(),
        };

        await storage.write(`${id}.bin`, binary, true);
        await storage.write(`${id}.json`, JSON.stringify(record), true);

        send(res, 201, {
          statusCode: 201,
          success: true,
          data: {
            id,
            original_name: originalName,
            storage_path: `repos/${repoId}/${id}`,
            mime_type: mimeType,
            size_bytes: binary.length,
            checksum,
            visibility,
            status: "active",
            repository_id: repoId,
            folder_id: null,
            created_at: record.createdAt,
            updated_at: record.createdAt,
          },
          message: "File uploaded successfully",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const fileSubMatch = url.pathname.match(
        /^\/api\/v1\/files\/([^/]+)(?:\/([^/]+))?$/,
      );
      if (fileSubMatch) {
        const [, id, action] = fileSubMatch;
        const record = await metadata(id);

        if (!action && req.method === "GET") {
          const binary = await storage.read(`${id}.bin`);
          const range = req.headers.range;
          if (range && range.startsWith("bytes=")) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : binary.length - 1;
            if (start >= binary.length || end >= binary.length || start > end) {
              res.writeHead(416, { "Content-Range": `bytes */${binary.length}` });
              res.end();
              return;
            }
            const chunk = binary.subarray(start, end + 1);
            res.writeHead(206, {
              "Content-Type": record.mimeType || record.mime_type || "application/octet-stream",
              "Content-Range": `bytes ${start}-${end}/${binary.length}`,
              "Accept-Ranges": "bytes",
              "Content-Length": chunk.length,
              "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
                record.name || record.original_name,
              )}`,
            });
            res.end(chunk);
            return;
          }

          res.writeHead(200, {
            "Content-Type": record.mimeType || record.mime_type || "application/octet-stream",
            "Content-Length": binary.length,
            "Accept-Ranges": "bytes",
            "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
              record.name || record.original_name,
            )}`,
          });
          res.end(binary);
          return;
        }

        if (action === "metadata" && req.method === "GET") {
          send(res, 200, {
            statusCode: 200,
            success: true,
            data: {
              fileId: id,
              originalName: record.name || record.original_name,
              sizeBytes: record.sizeBytes || record.size_bytes,
              mimeType: record.mimeType || record.mime_type,
              checksum: record.checksum,
              status:
                record.status === "READY"
                  ? "active"
                  : record.status.toLowerCase(),
              visibility: record.visibility || "private",
            },
            message: "Metadata retrieved successfully",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!action && req.method === "PATCH") {
          const body = JSON.parse(
            (await readBody(req, 1000000)).toString() || "{}",
          );
          if (body.original_name) record.name = body.original_name;
          if (body.visibility) record.visibility = body.visibility;
          await storage.write(`${id}.json`, JSON.stringify(record));
          send(res, 200, {
            statusCode: 200,
            success: true,
            data: record,
            message: "File updated successfully",
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (!action && req.method === "DELETE") {
          record.status = "TRASH";
          record.trashedAt = new Date().toISOString();
          await storage.write(`${id}.json`, JSON.stringify(record));
          send(res, 200, {
            statusCode: 200,
            success: true,
            message: "File moved to trash successfully",
            data: { id, status: "deleted" },
            timestamp: new Date().toISOString(),
          });
          return;
        }

        if (action === "restore" && req.method === "POST") {
          record.status = "READY";
          record.trashedAt = null;
          await storage.write(`${id}.json`, JSON.stringify(record));
          send(res, 200, {
            statusCode: 200,
            success: true,
            message: "File restored successfully",
            data: { id, status: "active" },
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }
    }

    // Legacy file service API (/v1/...)
    if (url.pathname.startsWith("/v1/")) {
      if (!isAuth) {
        send(res, 401, { error: "unauthorized" });
        return;
      }
      const body =
        req.method === "POST"
          ? JSON.parse((await readBody(req, 1000000)).toString() || "{}")
          : {};
      if (url.pathname === "/v1/uploads" && req.method === "POST") {
        const id = createHash("sha256")
          .update(String(req.headers["idempotency-key"] ?? randomUUID()))
          .digest("hex")
          .slice(0, 32);
        let record;
        try {
          record = await metadata(id);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          record = {
            id,
            ...body,
            status: "PENDING",
            scanStatus: "PENDING",
            createdAt: new Date().toISOString(),
          };
          try {
            await storage.write(`${id}.json`, JSON.stringify(record), true);
          } catch (error) {
            if (
              error.code !== "EEXIST" &&
              error.$metadata?.httpStatusCode !== 412
            )
              throw error;
            record = await metadata(id);
          }
        }
        send(res, 200, {
          fileObjectId: id,
          uploadUrl: ticket(id, "upload"),
          headers: { "Content-Type": record.mimeType },
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        });
        return;
      }
      const [, id, action] =
        url.pathname.match(/^\/v1\/files\/([^/]+)(?:\/([^/]+))?$/) ?? [];
      const record = await metadata(id);
      if (!action && req.method === "GET") {
        send(res, 200, record);
        return;
      }
      if (action === "download-ticket") {
        if (record.status !== "READY")
          throw Object.assign(new Error("not ready"), { status: 409 });
        send(res, 200, {
          downloadUrl: ticket(
            id,
            "download",
            Math.min(body.ttlSeconds ?? 900, 900),
          ),
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        });
        return;
      }
      if (action === "trash") {
        record.status = "TRASH";
        record.trashedAt = new Date().toISOString();
      } else if (action === "restore") {
        if (
          !record.trashedAt ||
          Date.now() - Date.parse(record.trashedAt) > 7 * 86400000
        )
          throw Object.assign(new Error("expired"), { status: 410 });
        record.status = "READY";
        record.trashedAt = null;
      } else throw Object.assign(new Error("not found"), { status: 404 });
      await storage.write(`${id}.json`, JSON.stringify(record));
      send(res, 200, record);
      return;
    }
    const id = url.pathname.split("/")[2];
    const action = url.searchParams.get("action");
    const expires = url.searchParams.get("expires");
    const token = url.searchParams.get("token") ?? "";
    const expected = createHmac("sha256", key)
      .update(`${id}:${action}:${expires}`)
      .digest("hex");
    if (
      !expires ||
      Number(expires) < Date.now() ||
      token.length !== expected.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    )
      throw Object.assign(new Error("expired ticket"), { status: 403 });
    const record = await metadata(id);
    if (req.method === "PUT" && action === "upload") {
      if (record.status !== "PENDING")
        throw Object.assign(new Error("immutable"), { status: 409 });
      const binary = await readBody(req, 100 * 1024 * 1024);
      const checksum = createHash("sha256").update(binary).digest("hex");
      if (binary.length !== record.sizeBytes || checksum !== record.checksum)
        throw Object.assign(new Error("checksum mismatch"), { status: 400 });
      try {
        await storage.write(`${id}.bin`, binary, true);
      } catch (error) {
        if (error.code !== "EEXIST" && error.$metadata?.httpStatusCode !== 412)
          throw error;
      }
      record.status = "READY";
      record.scanStatus = "CLEAN";
      record.fixtureScan = true;
      await storage.write(`${id}.json`, JSON.stringify(record));
      send(res, 200, { ok: true });
      return;
    }
    if (
      req.method === "GET" &&
      action === "download" &&
      record.status === "READY"
    ) {
      const binary = await storage.read(`${id}.bin`);
      res.writeHead(200, {
        "Content-Type": record.mimeType,
        "Content-Length": binary.length,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(record.name)}`,
      });
      res.end(binary);
      return;
    }
    send(res, 404, { error: "not found" });
  } catch (error) {
    send(res, error.status ?? (error.code === "ENOENT" ? 404 : 500), {
      error: error.status ? error.message : "file operation failed",
    });
  }
});
server.listen(port, process.env.FILE_BIND_HOST ?? "127.0.0.1", () =>
  console.log(
    `Development File Service at ${base}; storage=${storage.provider}; no antivirus in fixture.`,
  ),
);
process.on("SIGINT", () => server.close());
process.on("SIGTERM", () => server.close());
