ALTER TABLE "users" ADD COLUMN "authority_source" TEXT NOT NULL DEFAULT 'SSO';

-- Preserve grants already issued by the governance endpoints, including before first SSO login.
WITH grants AS (
  SELECT DISTINCT ON ("target_id") "target_id", "action", "after_data"
  FROM "audit_logs"
  WHERE "target_type" = 'USER' AND "action" IN
    ('UPDATE_DEPARTMENT_SCOPES', 'CREATE_PREPROVISIONED_USER', 'UPDATE_PREPROVISIONED_USER', 'SYNC_SIAKAD_SCOPES')
  ORDER BY "target_id", "created_at" DESC, "audit_log_id" DESC
)
UPDATE "users" u SET
  "authority_source" = CASE WHEN g."action" = 'SYNC_SIAKAD_SCOPES' THEN 'SIAKAD' ELSE 'LOCAL' END,
  "role" = (g."after_data"->>'role')::"GlobalRole",
  "department_scopes" = ARRAY(SELECT jsonb_array_elements_text(g."after_data"->'departmentScopes'))
FROM grants g WHERE u."user_id" = g."target_id"
  AND g."after_data"->>'role' IN ('SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'INSTRUCTOR')
  AND jsonb_typeof(g."after_data"->'departmentScopes') = 'array';
UPDATE "users" SET "authority_source" = 'LOCAL' WHERE "sso_user_id" LIKE 'preprovision:%';

-- Match the codes used by existing courses. Keep audit events unchanged.
UPDATE "users" SET "department_scopes" = ARRAY(
  SELECT DISTINCT CASE upper(trim(scope))
    WHEN 'INFORMATIKA' THEN 'IF' WHEN 'TEKNIK SIPIL' THEN 'TS'
    WHEN 'TEKNIK INDUSTRI' THEN 'TI' WHEN 'TEKNIK ELEKTRO' THEN 'TE'
    WHEN 'SISTEM INFORMASI' THEN 'SI' WHEN 'AKUNTANSI' THEN 'AK'
    WHEN 'MANAJEMEN' THEN 'MN' WHEN 'MAN' THEN 'MN'
    WHEN 'ILMU HUKUM' THEN 'HK' WHEN 'IH' THEN 'HK'
    WHEN 'MAGISTER ILMU HUKUM' THEN 'MIH' WHEN 'MH' THEN 'MIH'
    WHEN 'ADMINISTRASI PUBLIK' THEN 'AP' WHEN 'ADMINISTRASI BISNIS' THEN 'AB'
    WHEN 'FARMASI' THEN 'FAR' WHEN 'FARM' THEN 'FAR'
    ELSE upper(trim(scope)) END
  FROM unnest("department_scopes") scope WHERE trim(scope) <> ''
);
UPDATE "departments" SET "code" = 'MN' WHERE "code" = 'MAN'
  AND NOT EXISTS (SELECT 1 FROM "departments" WHERE "code" = 'MN');
