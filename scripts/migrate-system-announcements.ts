import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { announcementSchema } from "../packages/shared/src/announcements.js";

const legacySchema = announcementSchema.extend({
  id: z.string().min(1).max(200),
  authorId: z.string().min(1).max(200),
  authorName: z.string().min(1).max(300),
  authorRole: z.string().min(1).max(100),
  publishedAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
});

export function validateLegacyAnnouncements(value: unknown) {
  const records = z.array(legacySchema).parse(value);
  if (new Set(records.map((item) => item.id)).size !== records.length)
    throw new Error("ID pengumuman duplikat dalam sumber migrasi.");
  return records.map((item) => ({
    ...item,
    departmentCode:
      !item.departmentCode || item.departmentCode === "ALL"
        ? null
        : item.departmentCode,
    referenceNumber: item.referenceNumber || null,
    attachmentUrl: item.attachmentUrl || null,
    attachmentName: item.attachmentName || null,
    publishedAt: new Date(item.publishedAt),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.createdAt),
  }));
}

export async function importLegacyAnnouncements(
  db: PrismaClient,
  value: unknown,
) {
  const records = validateLegacyAnnouncements(value);
  // All rows are validated before touching the DB. Repeated runs never overwrite edits.
  return db.$transaction(async (tx) =>
    tx.systemAnnouncement.createMany({
      data: records,
      skipDuplicates: true,
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    loadEnvFile();
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
  const args = process.argv.slice(2);
  const fileAt = args.indexOf("--file");
  if (fileAt < 0 || !args[fileAt + 1])
    throw new Error(
      "Gunakan --file <JSON legacy> [--apply]. Default hanya validasi.",
    );
  const value = JSON.parse(readFileSync(resolve(args[fileAt + 1]), "utf8"));
  const records = validateLegacyAnnouncements(value);
  if (!args.includes("--apply")) {
    console.log(
      "Validasi berhasil: " +
        records.length +
        " pengumuman. Database belum diubah.",
    );
  } else {
    const db = new PrismaClient();
    try {
      const result = await importLegacyAnnouncements(db, value);
      console.log(
        "Migrasi berhasil: " +
          result.count +
          " ditambahkan; ID yang sudah ada dipertahankan.",
      );
    } finally {
      await db.$disconnect();
    }
  }
}
