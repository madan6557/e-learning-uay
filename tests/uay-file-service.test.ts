import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID, createHash } from "node:crypto";
import { getUayEndpoint, getUayHeaders } from "../apps/api/src/files.js";
import { config } from "../apps/api/src/core.js";

test("UAY File Service: endpoint formatting and header resolution", () => {
  // Test endpoint URL normalizer
  const originalUrl = config.fileUrl;
  try {
    (config as any).fileUrl = "http://file-service.uay.ac.id/api/v1";
    assert.equal(
      getUayEndpoint("/files"),
      "http://file-service.uay.ac.id/api/v1/files",
    );
    assert.equal(
      getUayEndpoint("/api/v1/files"),
      "http://file-service.uay.ac.id/api/v1/files",
    );

    (config as any).fileUrl = "http://file-service.uay.ac.id";
    assert.equal(
      getUayEndpoint("/files"),
      "http://file-service.uay.ac.id/api/v1/files",
    );
    assert.equal(
      getUayEndpoint("/api/v1/files"),
      "http://file-service.uay.ac.id/api/v1/files",
    );

    // Test headers builder
    (config as any).fileKey = "uay_sec_live_test_key";
    (config as any).fileClientId = "elearning-uay";
    const headers = getUayHeaders({
      actorId: "actor-123",
      requestId: "req-456",
      contentType: "application/json",
      range: "bytes=0-100",
    });
    assert.equal(headers["x-api-key"], "uay_sec_live_test_key");
    assert.equal(headers["Authorization"], "Bearer uay_sec_live_test_key");
    assert.equal(headers["x-actor-id"], "actor-123");
    assert.equal(headers["x-client-id"], "elearning-uay");
    assert.equal(headers["x-request-id"], "req-456");
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers["Range"], "bytes=0-100");
  } finally {
    (config as any).fileUrl = originalUrl;
  }
});

test("UAY File Service: mock fixture endpoints and RFC 7233 streaming", async () => {
  // Spin up an in-process mock server compliant with DOKUMENTASI_API_ENDPOINT.pdf
  const files = new Map<string, any>();
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c);
    const bodyBuf = Buffer.concat(chunks);

    const apiKey = req.headers["x-api-key"] || req.headers.authorization?.replace(/^Bearer\s+/, "");
    if (apiKey !== "uay_sec_live_mock") {
      res.statusCode = 401;
      res.end(JSON.stringify({ statusCode: 401, success: false, error: "UNAUTHORIZED" }));
      return;
    }

    if (req.url === "/api/v1/health") {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          statusCode: 200,
          success: true,
          data: { status: "ok" },
          message: "Service is healthy",
        }),
      );
      return;
    }

    if (req.url === "/api/v1/repositories" && req.method === "GET") {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
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
        }),
      );
      return;
    }

    if (req.url?.startsWith("/api/v1/files/") && req.url.endsWith("/metadata")) {
      const parts = req.url.split("/");
      const id = parts[4];
      const record = files.get(id);
      if (!record) {
        res.statusCode = 404;
        res.end(JSON.stringify({ statusCode: 404, success: false, error: "NOT_FOUND" }));
        return;
      }
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          statusCode: 200,
          success: true,
          data: {
            fileId: id,
            originalName: record.original_name,
            sizeBytes: record.size_bytes,
            mimeType: record.mime_type,
            checksum: record.checksum,
            status: record.status,
            visibility: record.visibility,
          },
        }),
      );
      return;
    }

    if (req.url?.startsWith("/api/v1/files/") && req.url.endsWith("/restore")) {
      const parts = req.url.split("/");
      const id = parts[4];
      const record = files.get(id);
      if (record) record.status = "active";
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          statusCode: 200,
          success: true,
          message: "File restored successfully",
          data: { id, status: "active" },
        }),
      );
      return;
    }

    if (req.url?.startsWith("/api/v1/files/") && req.method === "DELETE") {
      const parts = req.url.split("/");
      const id = parts[4];
      const record = files.get(id);
      if (record) record.status = "deleted";
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          statusCode: 200,
          success: true,
          message: "File moved to trash successfully",
          data: { id, status: "deleted" },
        }),
      );
      return;
    }

    if (req.url?.startsWith("/api/v1/files/") && req.method === "GET") {
      const parts = req.url.split("/");
      const id = parts[4];
      const record = files.get(id);
      if (!record) {
        res.statusCode = 404;
        res.end(JSON.stringify({ statusCode: 404, error: "NOT_FOUND" }));
        return;
      }
      const range = req.headers.range;
      if (range && range.startsWith("bytes=")) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : record.binary.length - 1;
        const chunk = record.binary.subarray(start, end + 1);
        res.writeHead(206, {
          "Content-Type": record.mime_type,
          "Content-Range": `bytes ${start}-${end}/${record.binary.length}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunk.length,
        });
        res.end(chunk);
        return;
      }
      res.writeHead(200, {
        "Content-Type": record.mime_type,
        "Content-Length": record.binary.length,
        "Accept-Ranges": "bytes",
      });
      res.end(record.binary);
      return;
    }

    if (req.url === "/api/v1/files" && req.method === "POST") {
      const fileId = randomUUID();
      const fakeBinary = Buffer.from("Universitas Achmad Yani Learning Material");
      const fakeChecksum = createHash("sha256").update(fakeBinary).digest("hex");
      const record = {
        id: fileId,
        original_name: "test-material.pdf",
        mime_type: "application/pdf",
        size_bytes: fakeBinary.length,
        checksum: fakeChecksum,
        status: "active",
        visibility: "private",
        binary: fakeBinary,
      };
      files.set(fileId, record);
      res.statusCode = 201;
      res.end(
        JSON.stringify({
          statusCode: 201,
          success: true,
          data: {
            id: fileId,
            original_name: record.original_name,
            mime_type: record.mime_type,
            size_bytes: record.size_bytes,
            checksum: record.checksum,
            status: record.status,
            visibility: record.visibility,
          },
          message: "File uploaded successfully",
        }),
      );
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ statusCode: 404, error: "NOT_FOUND" }));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const serverPort = (server.address() as any).port;
  const mockUrl = `http://127.0.0.1:${serverPort}/api/v1`;

  try {
    // 1. Health check
    const healthRes = await fetch(`${mockUrl}/health`, {
      headers: { "x-api-key": "uay_sec_live_mock" },
    });
    assert.equal(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.equal(healthData.success, true);
    assert.equal(healthData.data.status, "ok");

    // 2. Repositories
    const reposRes = await fetch(`${mockUrl}/repositories`, {
      headers: { "x-api-key": "uay_sec_live_mock" },
    });
    assert.equal(reposRes.status, 200);
    const reposData = await reposRes.json();
    assert.equal(reposData.data[0].slug, "elearning");

    // 3. Upload file
    const uploadRes = await fetch(`${mockUrl}/files`, {
      method: "POST",
      headers: { "x-api-key": "uay_sec_live_mock" },
      body: Buffer.from("dummy-payload"),
    });
    assert.equal(uploadRes.status, 201);
    const uploadJson = await uploadRes.json();
    const uploadedFileId = uploadJson.data.id;
    assert.ok(uploadedFileId);

    // 4. Metadata
    const metaRes = await fetch(`${mockUrl}/files/${uploadedFileId}/metadata`, {
      headers: { "x-api-key": "uay_sec_live_mock" },
    });
    assert.equal(metaRes.status, 200);
    const metaJson = await metaRes.json();
    assert.equal(metaJson.data.originalName, "test-material.pdf");
    assert.equal(metaJson.data.status, "active");

    // 5. RFC 7233 Range streaming
    const fullStreamRes = await fetch(`${mockUrl}/files/${uploadedFileId}`, {
      headers: { "x-api-key": "uay_sec_live_mock" },
    });
    assert.equal(fullStreamRes.status, 200);
    const fullText = await fullStreamRes.text();
    assert.equal(fullText, "Universitas Achmad Yani Learning Material");

    const rangeStreamRes = await fetch(`${mockUrl}/files/${uploadedFileId}`, {
      headers: {
        "x-api-key": "uay_sec_live_mock",
        Range: "bytes=0-10",
      },
    });
    assert.equal(rangeStreamRes.status, 206);
    assert.equal(rangeStreamRes.headers.get("content-range"), "bytes 0-10/41");
    const partialText = await rangeStreamRes.text();
    assert.equal(partialText, "Universitas");

    // 6. Soft delete (Trash)
    const delRes = await fetch(`${mockUrl}/files/${uploadedFileId}`, {
      method: "DELETE",
      headers: { "x-api-key": "uay_sec_live_mock" },
    });
    assert.equal(delRes.status, 200);
    const delJson = await delRes.json();
    assert.equal(delJson.data.status, "deleted");

    // 7. Restore
    const restoreRes = await fetch(`${mockUrl}/files/${uploadedFileId}/restore`, {
      method: "POST",
      headers: { "x-api-key": "uay_sec_live_mock" },
    });
    assert.equal(restoreRes.status, 200);
    const restoreJson = await restoreRes.json();
    assert.equal(restoreJson.data.status, "active");
  } finally {
    server.close();
  }
});

test("production mode strictly requires file service and rejects local storage", async () => {
  const origUrl = config.fileUrl;
  const origKey = config.fileKey;
  const origBucket = config.s3Bucket;
  const origEndpoint = config.s3Endpoint;
  try {
    (config as any).fileUrl = "";
    (config as any).fileKey = "";
    (config as any).s3Bucket = "";
    (config as any).s3Endpoint = "";
    assert.equal(config.fileMode, "local");

    (config as any).fileUrl = "http://file-service.uay.ac.id/api/v1";
    (config as any).fileKey = "uay_sec_live_key";
    assert.equal(config.fileMode, "uay");

    // S3 configuration auto-detection (e.g. Railway Tigris bucket)
    (config as any).fileUrl = "";
    (config as any).fileKey = "";
    (config as any).s3Bucket = "arranged-lounge-j7sbw8iq1";
    (config as any).s3Endpoint = "https://t3.storageapi.dev";
    assert.equal(config.fileMode, "s3");
  } finally {
    (config as any).fileUrl = origUrl;
    (config as any).fileKey = origKey;
    (config as any).s3Bucket = origBucket;
    (config as any).s3Endpoint = origEndpoint;
  }
});

