-- CreateEnum AttendanceStatus if not exists
DO $$ BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'EXCUSED', 'SICK', 'ABSENT', 'LATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Attendance sessions and records
CREATE TABLE IF NOT EXISTS "attendance_sessions" (
    "session_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "section_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "session_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "is_open" BOOLEAN NOT NULL DEFAULT false,
    "check_in_code" TEXT,
    "allow_self_check_in" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("session_id"),
    CONSTRAINT "attendance_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "course_classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_sessions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("section_id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "attendance_sessions_class_id_session_date_idx" ON "attendance_sessions"("class_id", "session_date");
CREATE INDEX IF NOT EXISTS "attendance_sessions_section_id_idx" ON "attendance_sessions"("section_id");

CREATE TABLE IF NOT EXISTS "attendance_records" (
    "record_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "checked_in_at" TIMESTAMP(3),
    "notes" TEXT,
    "verified_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("record_id"),
    CONSTRAINT "attendance_records_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_records_session_id_user_id_key" ON "attendance_records"("session_id", "user_id");
CREATE INDEX IF NOT EXISTS "attendance_records_user_id_idx" ON "attendance_records"("user_id");
CREATE INDEX IF NOT EXISTS "attendance_records_session_id_status_idx" ON "attendance_records"("session_id", "status");

-- Gradebook Enhancements:
ALTER TABLE "course_classes" ADD COLUMN IF NOT EXISTS "grade_scale_version" TEXT DEFAULT '2026.1';
ALTER TABLE "course_classes" ADD COLUMN IF NOT EXISTS "grade_scale_policy" JSONB;

ALTER TABLE "grade_categories" ADD COLUMN IF NOT EXISTS "is_mandatory" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "grade_categories" ADD COLUMN IF NOT EXISTS "source_type" TEXT NOT NULL DEFAULT 'MANUAL';

ALTER TABLE "final_grade_records" ADD COLUMN IF NOT EXISTS "grade_scale_version" TEXT DEFAULT '2026.1';
