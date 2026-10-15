import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID, createHash } from "node:crypto";
import {
  getUayEndpoint,
  getUayHeaders,
  sanitizeFolderSegment,
  mapPurposeToFolderCategory,
  resolveClassFolderPath,
  uayUpload,
  getCompatibleMimeTypes,
} from "../apps/api/src/files.js";
import { config, db } from "../apps/api/src/core.js";
import { getFileLimit } from "../packages/shared/src/files.js";
import {
  cleanAcceptText,
  isFileAccepted,
} from "../apps/web/src/components/ui/FileUpload.js";

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

    // Test headers builder with plain API key (must NOT set Authorization to avoid breaking File Service JWKS guard)
    (config as any).fileKey = "uay_sec_live_test_key";
    (config as any).fileClientId = "elearning-uay";
    const headers = getUayHeaders({
      actorId: "actor-123",
      requestId: "req-456",
      contentType: "application/json",
      range: "bytes=0-100",
    });
    assert.equal(headers["x-api-key"], "uay_sec_live_test_key");
    assert.equal(headers["Authorization"], undefined);
    assert.equal(headers["x-actor-id"], "actor-123");
    assert.equal(headers["x-client-id"], "elearning-uay");
    assert.equal(headers["x-request-id"], "req-456");
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers["Range"], "bytes=0-100");

    // Test headers builder with JWT token (sets Authorization: Bearer ...)
    (config as any).fileKey =
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.signature";
    const jwtHeaders = getUayHeaders();
    assert.equal(
      jwtHeaders["Authorization"],
      `Bearer ${(config as any).fileKey}`,
    );

    // Test headers builder with explicit token option
    const tokenHeaders = getUayHeaders({ token: "custom-token-xyz" });
    assert.equal(tokenHeaders["Authorization"], "Bearer custom-token-xyz");
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

test("UAY File Service: sanitizeFolderSegment cleans names for filesystem and File-Service limits", () => {
  // Trimming and replacing illegal characters
  assert.equal(
    sanitizeFolderSegment("   TI/3A: Ganjil*?<>|   "),
    "TI-3A- Ganjil-",
  );
  // Collapsing whitespace
  assert.equal(
    sanitizeFolderSegment("  [IF101]   Pemrograman   Web  "),
    "[IF101] Pemrograman Web",
  );
  // Stripping leading/trailing dots
  assert.equal(sanitizeFolderSegment("..folder.name.."), "folder.name");
  // Empty or invalid returns fallback
  assert.equal(sanitizeFolderSegment("   "), "Umum");
  assert.equal(sanitizeFolderSegment("...", "FallbackFolder"), "FallbackFolder");
  // Length truncation to max 150 chars
  const longStr = "A".repeat(200);
  const truncated = sanitizeFolderSegment(longStr);
  assert.equal(truncated.length, 150);
  assert.equal(truncated, "A".repeat(150));
});

test("UAY File Service: mapPurposeToFolderCategory groups file purposes systematically", () => {
  assert.equal(mapPurposeToFolderCategory("COVER"), "00_Sampul");
  assert.equal(mapPurposeToFolderCategory("RESOURCE"), "01_Materi");
  assert.equal(mapPurposeToFolderCategory("VIDEO"), "01_Materi");
  assert.equal(mapPurposeToFolderCategory("SUBMISSION"), "02_Tugas");
  assert.equal(mapPurposeToFolderCategory("QUIZ_ANSWER"), "03_Kuis");
  assert.equal(mapPurposeToFolderCategory("UNKNOWN_PURPOSE"), "04_Lainnya");
});

test("UAY File Service: resolveClassFolderPath produces academic year / course class / category structure", async () => {
  // 1. Without classId -> Umum / category
  const umumPath = await resolveClassFolderPath({
    classId: null,
    purpose: "RESOURCE",
  });
  assert.equal(umumPath, "Umum/01_Materi");

  // 2. With classId stubbed in db.courseClass.findUnique
  const origFindUnique = db.courseClass.findUnique;
  try {
    (db.courseClass as any).findUnique = async ({ where }: any) => {
      if (where.id === "class-full") {
        return {
          name: "TI-3A",
          academicYear: "2024/2025 Ganjil",
          course: {
            code: "IF101",
            title: "Pemrograman Web",
          },
        };
      }
      if (where.id === "class-no-code") {
        return {
          name: "TI-1B",
          academicYear: "2024-2025 Genap",
          course: {
            code: null,
            title: "Algoritma Pemrograman",
          },
        };
      }
      if (where.id === "class-no-course") {
        return {
          name: "Kelas Percobaan",
          academicYear: "2024-2025",
          course: null,
        };
      }
      return null;
    };

    const path1 = await resolveClassFolderPath({
      classId: "class-full",
      purpose: "RESOURCE",
    });
    assert.equal(
      path1,
      "2024-2025 Ganjil/[IF101] Pemrograman Web - TI-3A/01_Materi",
    );

    const path2 = await resolveClassFolderPath({
      classId: "class-no-code",
      purpose: "SUBMISSION",
    });
    assert.equal(
      path2,
      "2024-2025 Genap/Algoritma Pemrograman - TI-1B/02_Tugas",
    );

    const path3 = await resolveClassFolderPath({
      classId: "class-no-course",
      purpose: "QUIZ_ANSWER",
    });
    assert.equal(
      path3,
      "2024-2025/Kelas Percobaan/03_Kuis",
    );

    const pathNotFound = await resolveClassFolderPath({
      classId: "non-existent-id",
      purpose: "COVER",
    });
    assert.equal(pathNotFound, "Umum/00_Sampul");
  } finally {
    (db.courseClass as any).findUnique = origFindUnique;
  }
});

test("UAY File Service: uayUpload sends folderPath multipart field and preserves field limit", async () => {
  let receivedBody = "";

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    receivedBody = Buffer.concat(chunks).toString("utf-8");

    res.setHeader("Content-Type", "application/json");
    res.statusCode = 201;
    res.end(
      JSON.stringify({
        statusCode: 201,
        success: true,
        data: {
          id: "uploaded-file-uuid-1",
          originalName: "silabus.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          status: "active",
        },
      }),
    );
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as any).port;
  const origUrl = config.fileUrl;
  const origKey = config.fileKey;

  try {
    (config as any).fileUrl = `http://127.0.0.1:${port}/api/v1`;
    (config as any).fileKey = "test-token-key";

    // 1. Upload with folderPath
    const result = await uayUpload({
      fileBuffer: Buffer.from("PDF DUMMY DATA"),
      fileName: "silabus.pdf",
      mimeType: "application/pdf",
      repositoryId: "00000000-0000-0000-0000-000000000001",
      folderPath: "2024-2025 Ganjil/[IF101] Pemrograman Web - TI-3A/01_Materi",
      resourceType: "RESOURCE",
      resourceId: "item-xyz-123",
      actorId: "lecturer-user-id",
      token: "mock-jwt-token",
    });

    assert.equal(result.id, "uploaded-file-uuid-1");
    // Verify folderPath was present in the multipart body
    assert.ok(receivedBody.includes('name="folderPath"'));
    assert.ok(
      receivedBody.includes(
        "2024-2025 Ganjil/[IF101] Pemrograman Web - TI-3A/01_Materi",
      ),
    );
    assert.ok(receivedBody.includes('name="contextType"'));
    assert.ok(receivedBody.includes("RESOURCE"));
    assert.ok(receivedBody.includes('name="contextId"'));
    assert.ok(receivedBody.includes("item-xyz-123"));
    assert.ok(!receivedBody.includes('name="folderId"'));

    // 2. Upload with folderId (folderId takes precedence, folderPath should NOT be sent)
    await uayUpload({
      fileBuffer: Buffer.from("PDF DUMMY DATA 2"),
      fileName: "silabus2.pdf",
      mimeType: "application/pdf",
      repositoryId: "00000000-0000-0000-0000-000000000001",
      folderId: "existing-folder-uuid",
      folderPath: "should-not-be-sent",
      actorId: "lecturer-user-id",
      token: "mock-jwt-token",
    });

    assert.ok(receivedBody.includes('name="folderId"'));
    assert.ok(receivedBody.includes("existing-folder-uuid"));
    assert.ok(!receivedBody.includes("should-not-be-sent"));
  } finally {
    (config as any).fileUrl = origUrl;
    (config as any).fileKey = origKey;
    server.close();
  }
});

test("UAY File Service: cleanAcceptText and isFileAccepted handle MIME types and extensions robustly", () => {
  // Test clean format labels
  assert.equal(
    cleanAcceptText(".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"),
    "PNG, JPG, JPEG, WEBP",
  );
  assert.equal(
    cleanAcceptText("image/png,image/jpeg,image/webp"),
    "PNG, JPEG, WEBP",
  );
  assert.equal(
    cleanAcceptText(".pdf,.ppt,.pptx,application/pdf"),
    "PDF, PPT, PPTX",
  );
  assert.equal(cleanAcceptText(undefined), "Semua format berkas umum didukung");

  // Test isFileAccepted with image block accept configuration
  const imageAccept = "image/png,image/jpeg,image/webp";
  const pngFile = { name: "diagram.png", type: "image/png" } as File;
  const jpgFile = { name: "foto.jpg", type: "image/jpeg" } as File;
  const webpFile = { name: "banner.webp", type: "image/webp" } as File;
  const pdfFile = { name: "materi.pdf", type: "application/pdf" } as File;
  const cppFile = { name: "program.cpp", type: "text/x-c++src" } as File;

  // The critical bug reported by user: png/jpg must NOT be rejected when accept has image/png,image/jpeg
  assert.equal(isFileAccepted(pngFile, imageAccept), true);
  assert.equal(isFileAccepted(jpgFile, imageAccept), true);
  assert.equal(isFileAccepted(webpFile, imageAccept), true);
  assert.equal(isFileAccepted(pdfFile, imageAccept), false);
  assert.equal(isFileAccepted(cppFile, imageAccept), false);

  // Even if browser file.type is empty (common on drag-and-drop), extension matches
  const untypedPng = { name: "foto.png", type: "" } as File;
  assert.equal(isFileAccepted(untypedPng, imageAccept), true);

  // Document attachment matching
  const docAccept = ".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip";
  assert.equal(isFileAccepted(pdfFile, docAccept), true);
  assert.equal(isFileAccepted(cppFile, docAccept), false);
});

test("UAY File Service: getFileLimit enforces per-extension caps aligned with File Service policies", () => {
  // Images capped at 10 MB
  assert.equal(getFileLimit("foto.png", "RESOURCE"), 10 * 1024 * 1024);
  assert.equal(getFileLimit("foto.jpg", "RESOURCE"), 10 * 1024 * 1024);
  assert.equal(getFileLimit("banner.webp", "RESOURCE"), 10 * 1024 * 1024);
  // Text files capped at 10 MB
  assert.equal(getFileLimit("catatan.txt", "RESOURCE"), 10 * 1024 * 1024);
  // Documents and archives capped at 50 MB
  assert.equal(getFileLimit("modul.pdf", "RESOURCE"), 50 * 1024 * 1024);
  assert.equal(getFileLimit("tugas.docx", "SUBMISSION"), 50 * 1024 * 1024);
  assert.equal(getFileLimit("arsip.zip", "RESOURCE"), 50 * 1024 * 1024);
  // Cover capped at 5 MB
  assert.equal(getFileLimit("cover.png", "COVER"), 5 * 1024 * 1024);
});

test("UAY File Service: getCompatibleMimeTypes and uayUpload tolerate policy MIME variations", async () => {
  // Candidate MIME generation
  const pngCandidates = getCompatibleMimeTypes("foto.png", "image/png");
  assert.ok(pngCandidates.includes("application/png"));
  assert.ok(pngCandidates.includes("image/png"));

  const jpgCandidates = getCompatibleMimeTypes("foto.jpg", "image/jpeg");
  assert.ok(jpgCandidates.includes("application/jpg"));
  assert.ok(jpgCandidates.includes("image/jpeg"));

  let attempts = 0;
  const server = createServer(async (req, res) => {
    attempts++;
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyStr = Buffer.concat(chunks).toString("utf-8");

    res.setHeader("Content-Type", "application/json");

    // First attempt rejects standard image/png because policy only allows application/png
    if (bodyStr.includes('type="image/png"') || bodyStr.includes("image/png")) {
      res.statusCode = 403;
      res.end(
        JSON.stringify({
          statusCode: 403,
          error: "This file extension and media type are not allowed in the repository",
        }),
      );
      return;
    }

    // Second attempt with application/png succeeds
    if (bodyStr.includes('type="application/png"') || bodyStr.includes("application/png")) {
      res.statusCode = 201;
      res.end(
        JSON.stringify({
          statusCode: 201,
          success: true,
          data: {
            id: "retried-image-id",
            originalName: "foto.png",
            mimeType: "application/png",
            sizeBytes: 1024,
            status: "active",
          },
        }),
      );
      return;
    }

    res.statusCode = 400;
    res.end(JSON.stringify({ error: "UNEXPECTED" }));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as any).port;
  const origUrl = config.fileUrl;
  const origKey = config.fileKey;

  try {
    (config as any).fileUrl = `http://127.0.0.1:${port}/api/v1`;
    (config as any).fileKey = "test-token-key";

    const uploadRes = await uayUpload({
      fileBuffer: Buffer.from("PNG FAKE BYTES"),
      fileName: "foto.png",
      mimeType: "image/png",
      repositoryId: "00000000-0000-0000-0000-000000000001",
      token: "mock-jwt-token",
    });

    assert.equal(uploadRes.id, "retried-image-id");
    assert.equal(attempts, 2); // Retried automatically and succeeded!
  } finally {
    (config as any).fileUrl = origUrl;
    (config as any).fileKey = origKey;
    server.close();
  }

  // Office and media candidate verification
  const docxCandidates = getCompatibleMimeTypes("tugas.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.ok(docxCandidates.includes("application/docx"));
  assert.ok(docxCandidates.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));

  const pptxCandidates = getCompatibleMimeTypes("presentasi.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  assert.ok(pptxCandidates.includes("application/pptx"));

  const mp4Candidates = getCompatibleMimeTypes("kuliah.mp4", "video/mp4");
  assert.ok(mp4Candidates.includes("video/mp4"));
  assert.ok(mp4Candidates.includes("application/mp4"));

  const webmCandidates = getCompatibleMimeTypes("video.webm", "video/webm");
  assert.ok(webmCandidates.includes("video/webm"));
});



