import type { Express } from "express";
import type {
  Prisma,
  SystemAnnouncement as StoredAnnouncement,
  User,
} from "@prisma/client";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import {
  announcementSchema,
  announcementPatchSchema,
  canManageAnnouncement,
  canReadAnnouncement,
} from "../../../packages/shared/src/announcements.js";
import { db, ensure, mutate, audit } from "./core.js";
const purifier = createDOMPurify(new JSDOM("").window);

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  category:
    "SURAT_EDARAN" | "AKADEMIK" | "REGISTRASI" | "LIBUR" | "KEGIATAN" | "UMUM";
  referenceNumber?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  targetRole: "ALL" | "STUDENT" | "INSTRUCTOR";
  departmentCode?: string;
  isImportant: boolean;
  isPublished: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export function serializeAnnouncement(
  item: StoredAnnouncement,
): SystemAnnouncement {
  return {
    ...item,
    category: item.category as SystemAnnouncement["category"],
    targetRole: item.targetRole as SystemAnnouncement["targetRole"],
    referenceNumber: item.referenceNumber ?? undefined,
    departmentCode: item.departmentCode ?? undefined,
    attachmentUrl: item.attachmentUrl ?? undefined,
    attachmentName: item.attachmentName ?? undefined,
    publishedAt: item.publishedAt.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function assertManage(user: User, item: { departmentCode?: string | null }) {
  ensure(canManageAnnouncement(user, item), 403, "DEPARTMENT_SCOPE_DENIED");
}

async function broadcast(
  tx: Prisma.TransactionClient,
  item: StoredAnnouncement,
) {
  const eventKey = "system_announcement:" + item.id;
  const audience: Prisma.UserWhereInput = {
    status: "ACTIVE",
    role:
      item.targetRole === "ALL"
        ? { in: ["STUDENT", "INSTRUCTOR"] }
        : (item.targetRole as "STUDENT" | "INSTRUCTOR"),
    ...(item.departmentCode && item.departmentCode !== "ALL"
      ? { departmentScopes: { has: item.departmentCode } }
      : {}),
  };
  await tx.notification.deleteMany({
    where: {
      eventKey,
      ...(!item.isPublished ? {} : { user: { isNot: audience } }),
    },
  });
  if (!item.isPublished) return;
  const plainText = item.content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const notification = {
    title: "Pengumuman: " + item.title,
    message: plainText.slice(0, 140) + (plainText.length > 140 ? "…" : ""),
    linkUrl: "/announcements#announcement-" + item.id,
  };
  await tx.notification.updateMany({ where: { eventKey }, data: notification });
  let cursor: string | undefined;
  // Keyset pagination reaches every eligible recipient, including those beyond 500.
  for (;;) {
    const recipients = await tx.user.findMany({
      where: audience,
      select: { id: true },
      orderBy: { id: "asc" },
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!recipients.length) return;
    await tx.notification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        type: "SYSTEM_ANNOUNCEMENT",
        ...notification,
        eventKey,
      })),
      skipDuplicates: true,
    });
    cursor = recipients[recipients.length - 1].id;
  }
}

export function registerSystemAnnouncements(app: Express) {
  app.get("/api/v1/system-announcements", async (req, res) => {
    const all = await db.systemAnnouncement.findMany({
      orderBy: [
        { isImportant: "desc" },
        { publishedAt: "desc" },
        { id: "asc" },
      ],
    });
    res.json(
      all
        .filter((item) => canReadAnnouncement(req.context.user, item))
        .map(serializeAnnouncement),
    );
  });
  app.post("/api/v1/system-announcements", async (req, res) => {
    const result = await mutate(req, async (tx) => {
      const user = req.context.user;
      const data = announcementSchema.parse(req.body);
      data.content = purifier.sanitize(data.content);
      ensure(
        data.content
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim().length >= 5,
        400,
        "VALIDATION_ERROR",
      );
      assertManage(user, data);
      const item = await tx.systemAnnouncement.create({
        data: {
          ...data,
          departmentCode:
            data.departmentCode === "ALL" || !data.departmentCode
              ? null
              : data.departmentCode,
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
        },
      });
      await broadcast(tx, item);
      await audit(
        tx,
        req.context,
        "CREATE",
        "SYSTEM_ANNOUNCEMENT",
        item.id,
        null,
        null,
        item,
      );
      return serializeAnnouncement(item);
    });
    res.status(201).json(result);
  });
  app.patch("/api/v1/system-announcements/:id", async (req, res) => {
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.systemAnnouncement.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(before, 404, "NOT_FOUND");
        assertManage(req.context.user, before);
        const { expectedUpdatedAt, ...data } = announcementPatchSchema.parse(
          req.body,
        );
        if (data.content !== undefined) {
          data.content = purifier.sanitize(data.content);
          ensure(
            data.content
              .replace(/<[^>]*>/g, "")
              .replace(/&nbsp;/g, " ")
              .trim().length >= 5,
            400,
            "VALIDATION_ERROR",
          );
        }
        assertManage(req.context.user, {
          departmentCode: data.departmentCode ?? before.departmentCode,
        });
        const updated = await tx.systemAnnouncement.updateMany({
          where: {
            id: before.id,
            updatedAt: expectedUpdatedAt
              ? new Date(expectedUpdatedAt)
              : before.updatedAt,
          },
          data: {
            ...data,
            ...(data.departmentCode !== undefined
              ? {
                  departmentCode:
                    !data.departmentCode || data.departmentCode === "ALL"
                      ? null
                      : data.departmentCode,
                }
              : {}),
            ...(!before.isPublished && data.isPublished
              ? { publishedAt: new Date() }
              : {}),
          },
        });
        ensure(updated.count === 1, 409, "ANNOUNCEMENT_CONFLICT");
        const item = await tx.systemAnnouncement.findUniqueOrThrow({
          where: { id: before.id },
        });
        await broadcast(tx, item);
        await audit(
          tx,
          req.context,
          "UPDATE",
          "SYSTEM_ANNOUNCEMENT",
          item.id,
          null,
          before,
          item,
        );
        return serializeAnnouncement(item);
      }),
    );
  });
  app.delete("/api/v1/system-announcements/:id", async (req, res) => {
    res.json(
      await mutate(req, async (tx) => {
        const before = await tx.systemAnnouncement.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(before, 404, "NOT_FOUND");
        assertManage(req.context.user, before);
        await tx.systemAnnouncement.delete({ where: { id: before.id } });
        await tx.notification.deleteMany({
          where: { eventKey: "system_announcement:" + before.id },
        });
        await audit(
          tx,
          req.context,
          "DELETE",
          "SYSTEM_ANNOUNCEMENT",
          before.id,
          null,
          before,
          null,
        );
        return { id: before.id };
      }),
    );
  });
}
