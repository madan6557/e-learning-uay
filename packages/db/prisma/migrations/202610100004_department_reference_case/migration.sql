-- User scopes and master codes are uppercase. Preserve custom codes' meaning while
-- aligning old free-text course/announcement references with those canonical scopes.
UPDATE "courses" SET "department_code" = upper(trim("department_code"))
WHERE "department_code" <> upper(trim("department_code"));
UPDATE "system_announcements" SET "department_code" = upper(trim("department_code"))
WHERE "department_code" <> upper(trim("department_code"));
