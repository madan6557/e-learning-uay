import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomUUID, createHash } from "node:crypto";

test("File Service tickets, scan verification, ownership and trash lifecycle", async (suite) => {
  const objects = new Map<string, any>();
  let origin = "";
  const service = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const bytes = Buffer.concat(chunks);
    if (req.url === "/v1/uploads") {
      assert.equal(req.headers.authorization, "Bearer integration-file-key");
      const body = JSON.parse(bytes.toString());
      const id = randomUUID();
      objects.set(id, { ...body, status: "PENDING", scanStatus: "PENDING" });
      res.end(
        JSON.stringify({
          fileObjectId: id,
          uploadUrl: `${origin}/objects/${id}`,
          headers: { "Content-Type": body.mimeType },
        }),
      );
      return;
    }
    if (req.url?.startsWith("/objects/")) {
      const id = req.url.split("/").at(-1)!;
      const record = objects.get(id);
      record.bytes = bytes;
      record.status = "READY";
      record.scanStatus = "CLEAN";
      record.checksum = createHash("sha256").update(bytes).digest("hex");
      res.end("{}");
      return;
    }
    const parts = req.url!.split("/");
    const id = parts[3],
      action = parts[4],
      record = objects.get(id);
    if (!record) {
      res.statusCode = 404;
      res.end("{}");
      return;
    }
    if (action === "download-ticket") {
      res.end(
        JSON.stringify({
          downloadUrl: `${origin}/objects/${id}?ticket=signed`,
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        }),
      );
      return;
    }
    if (action === "trash") record.status = "TRASH";
    if (action === "restore") record.status = "READY";
    res.end(JSON.stringify({ ...record, bytes: undefined }));
  });
  service.listen(0, "127.0.0.1");
  await once(service, "listening");
  origin = `http://127.0.0.1:${(service.address() as any).port}`;
  process.env.FILE_SERVICE_URL = origin;
  process.env.FILE_SERVICE_KEY = "integration-file-key";
  process.env.FILE_ALLOWED_ORIGINS = origin;
  const { createApp } = await import("../../apps/api/src/index.js");
  const { db } = await import("../../apps/api/src/core.js");
  const app = createApp().listen(0, "127.0.0.1");
  await once(app, "listening");
  const base = `http://127.0.0.1:${(app.address() as any).port}/api/v1`;
  const createUser = async (role: any) => {
    const id = randomUUID();
    return db.user.create({
      data: {
        id,
        ssoUserId: id,
        identifierValue: id,
        name: "File Test",
        email: `${id}@example.test`,
        role,
      },
    });
  };
  const teacher = await createUser("INSTRUCTOR"),
    student = await createUser("STUDENT"),
    other = await createUser("STUDENT");
  const cookies = new Map<string, string>();
  for (const user of [teacher, student, other]) {
    const response = await fetch(base + "/auth/development-login", {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.id }),
    });
    assert.equal(response.status, 200);
    cookies.set(user.id, response.headers.get("set-cookie")!.split(";")[0]);
  }
  const course = await db.course.create({
    data: {
      code: randomUUID(),
      title: "File Course",
      departmentCode: "IF",
      status: "PUBLISHED",
    },
  });
  const cls = await db.courseClass.create({
    data: {
      courseId: course.id,
      name: "File Class",
      academicYear: "2026",
      status: "PUBLISHED",
      instructors: { create: { userId: teacher.id } },
      enrollments: { create: [{ userId: student.id }, { userId: other.id }] },
    },
  });
  const section = await db.section.create({
    data: { classId: cls.id, title: "Resources" },
  });
  const request = async (
    user: any,
    path: string,
    body: any,
    expected = 200,
    method = "POST",
  ) => {
    await new Promise((r) => setTimeout(r, 50));
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: "http://127.0.0.1:5173",
        "Content-Type": "application/json",
        Cookie: cookies.get(user.id)!,
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, JSON.stringify(result));
    return result;
  };
  let resource: any, file: any;
  try {
    await suite.test(
      "uploads reject invalid sizes and verify checksum plus malware state",
      async () => {
        const bytes = Buffer.from("test document");
        const metadata = {
          classId: cls.id,
          purpose: "RESOURCE",
          name: "module.pdf",
          mimeType: "application/pdf",
          sizeBytes: bytes.length,
          checksum: createHash("sha256").update(bytes).digest("hex"),
        };
        await request(
          teacher,
          "/files/upload-ticket",
          { ...metadata, sizeBytes: 0 },
          400,
        );
        await request(
          teacher,
          "/files/upload-ticket",
          { ...metadata, sizeBytes: 51 * 1024 * 1024 },
          400,
        );
        await request(student, "/files/upload-ticket", metadata, 403);
        file = await request(teacher, "/files/upload-ticket", metadata);
        await request(teacher, `/files/${file.fileObjectId}/confirm`, {}, 409);
        await fetch(file.uploadUrl, { method: "PUT", body: bytes });
        objects.get(file.fileObjectId).scanStatus = "INFECTED";
        await request(teacher, `/files/${file.fileObjectId}/confirm`, {}, 409);
        objects.get(file.fileObjectId).scanStatus = "CLEAN";
        await request(teacher, `/files/${file.fileObjectId}/confirm`, {});
        resource = await request(
          teacher,
          `/sections/${section.id}/resources`,
          {
            title: "Protected file",
            resourceType: "DOCUMENT",
            isVisible: true,
            dynamicPayload: { fileObjectId: file.fileObjectId, totalPages: 1 },
          },
          201,
        );
      },
    );
    await suite.test(
      "private access needs published resource context; downloads are idempotent",
      async () => {
        await request(
          student,
          `/files/${file.fileObjectId}/download-ticket`,
          {},
          403,
        );
        const ticket = await request(
          student,
          `/files/${file.fileObjectId}/download-ticket`,
          { resourceId: resource.id },
        );
        assert(ticket.url.startsWith(origin));
        await request(student, `/resources/${resource.id}/confirm-download`, {
          fileObjectId: file.fileObjectId,
        });
        await request(student, `/resources/${resource.id}/confirm-download`, {
          fileObjectId: file.fileObjectId,
        });
        assert.equal(
          await db.materialDownload.count({
            where: { resourceItemId: resource.id, userId: student.id },
          }),
          1,
        );
      },
    );
    await suite.test(
      "submission files cannot be read by another enrolled student",
      async () => {
        const assignment = await db.assignment.create({
          data: {
            sectionId: section.id,
            title: "File report",
            instructions: "Upload",
            allowedFormats: ["PDF"],
            isVisible: true,
          },
        });
        const bytes = Buffer.from("student report");
        const upload = await request(student, "/files/upload-ticket", {
          classId: cls.id,
          purpose: "SUBMISSION",
          contextId: assignment.id,
          name: "report.pdf",
          mimeType: "application/pdf",
          sizeBytes: bytes.length,
          checksum: createHash("sha256").update(bytes).digest("hex"),
        });
        await fetch(upload.uploadUrl, { method: "PUT", body: bytes });
        await request(student, `/files/${upload.fileObjectId}/confirm`, {});
        await request(
          student,
          `/assignments/${assignment.id}/submissions`,
          { fileObjectId: upload.fileObjectId },
          201,
        );
        await request(
          other,
          `/files/${upload.fileObjectId}/download-ticket`,
          {},
          403,
        );
        await request(
          teacher,
          `/files/${upload.fileObjectId}/download-ticket`,
          {},
        );
        await request(teacher, `/files/${upload.fileObjectId}/trash`, {}, 403);
      },
    );
    await suite.test(
      "cloned resources retain editable references; shared nested files cannot be trashed",
      async () => {
        const nested = await request(
          teacher,
          `/sections/${section.id}/resources`,
          {
            title: "Nested attachment",
            resourceType: "RICH_TEXT",
            isVisible: true,
            dynamicPayload: {
              blocks: [
                {
                  id: randomUUID(),
                  type: "file_attachment",
                  data: {
                    fileObjectId: file.fileObjectId,
                    displayName: "Module",
                  },
                },
              ],
            },
          },
          201,
        );
        const copy = await request(teacher, `/course-classes/${cls.id}/clone`, {
          name: "Clone",
          academicYear: "2027",
        });
        const copied = await db.resourceItem.findFirstOrThrow({
          where: { section: { classId: copy.id }, title: nested.title },
        });
        await db.resourceItem.deleteMany({
          where: { section: { classId: copy.id }, id: { not: copied.id } },
        });
        await request(
          teacher,
          `/resources/${copied.id}`,
          {
            title: "Edited clone",
            resourceType: copied.resourceType,
            isVisible: false,
            dynamicPayload: copied.dynamicPayload,
          },
          200,
          "PATCH",
        );
        await request(teacher, `/files/${file.fileObjectId}/trash`, {}, 409);
        await db.resourceItem.delete({ where: { id: copied.id } });
        await request(
          teacher,
          `/sections/${section.id}/resources`,
          {
            title: "Invalid video",
            resourceType: "VIDEO_MEDIA",
            isVisible: true,
            dynamicPayload: {
              fileObjectId: file.fileObjectId,
              durationSeconds: 100,
            },
          },
          400,
        );
      },
    );
    await suite.test(
      "trash denies access, restore preserves ID, retention cutoff is enforced",
      async () => {
        await request(teacher, `/files/${file.fileObjectId}/trash`, {});
        await request(
          student,
          `/files/${file.fileObjectId}/download-ticket`,
          { resourceId: resource.id },
          404,
        );
        const restored = await request(
          teacher,
          `/files/${file.fileObjectId}/restore`,
          {},
        );
        assert.equal(restored.id, file.fileObjectId);
        await request(student, `/files/${file.fileObjectId}/download-ticket`, {
          resourceId: resource.id,
        });
        await request(teacher, `/files/${file.fileObjectId}/trash`, {});
        await db.fileReference.update({
          where: { id: file.fileObjectId },
          data: { trashedAt: new Date(Date.now() - 8 * 86400000) },
        });
        await request(teacher, `/files/${file.fileObjectId}/restore`, {}, 409);
      },
    );
  } finally {
    await new Promise<void>((resolve) => app.close(() => resolve()));
    await new Promise<void>((resolve) => service.close(() => resolve()));
    await db.$disconnect();
  }
});
