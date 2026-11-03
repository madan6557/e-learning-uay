-- Drop old global unique index on code
DROP INDEX IF EXISTS "courses_code_key";
ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_code_key";

-- Create new composite unique index on (code, department_code)
CREATE UNIQUE INDEX IF NOT EXISTS "courses_code_department_code_key" ON "courses"("code", "department_code");
