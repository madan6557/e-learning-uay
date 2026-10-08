CREATE TABLE "system_announcements" (
  "system_announcement_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "reference_number" TEXT,
  "author_id" TEXT NOT NULL,
  "author_name" TEXT NOT NULL,
  "author_role" TEXT NOT NULL,
  "target_role" TEXT NOT NULL DEFAULT 'ALL',
  "department_code" TEXT,
  "is_important" BOOLEAN NOT NULL DEFAULT false,
  "is_published" BOOLEAN NOT NULL DEFAULT true,
  "attachment_url" TEXT,
  "attachment_name" TEXT,
  "published_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "system_announcements_pkey" PRIMARY KEY ("system_announcement_id")
);
CREATE INDEX "system_announcements_department_code_is_published_idx" ON "system_announcements"("department_code", "is_published");
CREATE INDEX "system_announcements_is_important_published_at_idx" ON "system_announcements"("is_important", "published_at");
