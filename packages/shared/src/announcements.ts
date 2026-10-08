import { z } from "zod";
import { canManageDepartmentScope, hasPermission } from "./permissions.js";
import type { ApplicationRole } from "./sso.js";

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(300),
  content: z.string().trim().min(5).max(50000),
  category: z
    .enum([
      "SURAT_EDARAN",
      "AKADEMIK",
      "REGISTRASI",
      "LIBUR",
      "KEGIATAN",
      "UMUM",
    ])
    .default("SURAT_EDARAN"),
  referenceNumber: z.string().trim().max(100).optional(),
  targetRole: z.enum(["ALL", "STUDENT", "INSTRUCTOR"]).default("ALL"),
  departmentCode: z.string().trim().max(100).optional(),
  isImportant: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  attachmentUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "Lampiran harus menggunakan URL HTTPS.")
    .optional()
    .or(z.literal("")),
  attachmentName: z.string().trim().max(200).optional(),
});

type Audience = { role: ApplicationRole; departmentScopes: readonly string[] };
export const announcementPatchSchema = announcementSchema
  .partial()
  .extend({ expectedUpdatedAt: z.string().datetime().optional() });
type AnnouncementScope = {
  departmentCode?: string | null;
  targetRole: string;
  isPublished: boolean;
};

export function canManageAnnouncement(
  user: Audience,
  announcement: { departmentCode?: string | null },
) {
  return (
    hasPermission(user.role, "PUBLISH_GLOBAL_ANNOUNCEMENTS") ||
    (announcement.departmentCode !== "ALL" &&
      hasPermission(user.role, "PUBLISH_DEPT_ANNOUNCEMENTS") &&
      canManageDepartmentScope(
        user.role,
        user.departmentScopes,
        announcement.departmentCode ?? undefined,
      ))
  );
}

export function canReadAnnouncement(
  user: Audience,
  announcement: AnnouncementScope,
) {
  if (canManageAnnouncement(user, announcement)) return true;
  if (
    !hasPermission(user.role, "READ_ANNOUNCEMENTS") ||
    !announcement.isPublished
  )
    return false;
  if (
    announcement.targetRole !== "ALL" &&
    announcement.targetRole !== user.role
  )
    return false;
  return (
    !announcement.departmentCode ||
    announcement.departmentCode === "ALL" ||
    user.departmentScopes.includes(announcement.departmentCode)
  );
}
