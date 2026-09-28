// Isolated development File Service. Never run this fixture as production storage.
import http from "node:http";
import {
  createHash,
  randomUUID,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
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
    res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, base);
  try {
    if (url.pathname === "/health") {
      send(res, 200, {
        status: "development-fixture",
        storage: storage.provider,
      });
      return;
    }
    if (url.pathname.startsWith("/v1/")) {
      if (req.headers.authorization !== `Bearer ${key}`) {
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
        // A retry after a lost response is safe because checksum and length
        // have already been checked against the immutable upload metadata.
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
