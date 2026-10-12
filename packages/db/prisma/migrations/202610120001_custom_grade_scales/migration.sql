-- AlterTable
ALTER TABLE "academic_settings" ADD COLUMN IF NOT EXISTS "custom_grade_scales" JSONB;
