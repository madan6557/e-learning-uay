CREATE TABLE "academic_settings" (
    "academic_settings_id" TEXT NOT NULL DEFAULT 'global',
    "academic_year" TEXT NOT NULL,
    "semester_label" TEXT NOT NULL,
    "academic_years" TEXT[] NOT NULL,
    "default_grade_scale_version" TEXT NOT NULL,
    "min_attendance_percentage" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "academic_settings_pkey" PRIMARY KEY ("academic_settings_id"),
    CONSTRAINT "academic_settings_singleton" CHECK ("academic_settings_id" = 'global'),
    CONSTRAINT "academic_settings_attendance_range" CHECK ("min_attendance_percentage" BETWEEN 0 AND 100)
);
