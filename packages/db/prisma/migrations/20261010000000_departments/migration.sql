CREATE TABLE IF NOT EXISTS "departments" (
  "department_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "faculty" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "departments_code_key" ON "departments"("code");
CREATE INDEX IF NOT EXISTS "departments_is_active_idx" ON "departments"("is_active");
