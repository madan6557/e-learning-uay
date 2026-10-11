-- Keep persisted course/announcement scopes aligned with canonical SSO and governance codes.
-- Unknown/custom codes are preserved; audit history is never rewritten.
WITH aliases(old_code, canonical) AS (VALUES
  ('INFORMATIKA', 'IF'), ('TEKNIK SIPIL', 'TS'), ('TEKNIK INDUSTRI', 'TI'),
  ('TEKNIK ELEKTRO', 'TE'), ('SISTEM INFORMASI', 'SI'), ('AKUNTANSI', 'AK'),
  ('MANAJEMEN', 'MN'), ('MAN', 'MN'), ('ILMU HUKUM', 'HK'), ('IH', 'HK'),
  ('MAGISTER ILMU HUKUM', 'MIH'), ('MH', 'MIH'), ('ADMINISTRASI PUBLIK', 'AP'),
  ('ADMINISTRASI BISNIS', 'AB'), ('FARMASI', 'FAR'), ('FARM', 'FAR')
)
UPDATE "courses" c SET "department_code" = a.canonical FROM aliases a
WHERE upper(trim(c."department_code")) = a.old_code;
WITH aliases(old_code, canonical) AS (VALUES
  ('INFORMATIKA', 'IF'), ('TEKNIK SIPIL', 'TS'), ('TEKNIK INDUSTRI', 'TI'),
  ('TEKNIK ELEKTRO', 'TE'), ('SISTEM INFORMASI', 'SI'), ('AKUNTANSI', 'AK'),
  ('MANAJEMEN', 'MN'), ('MAN', 'MN'), ('ILMU HUKUM', 'HK'), ('IH', 'HK'),
  ('MAGISTER ILMU HUKUM', 'MIH'), ('MH', 'MIH'), ('ADMINISTRASI PUBLIK', 'AP'),
  ('ADMINISTRASI BISNIS', 'AB'), ('FARMASI', 'FAR'), ('FARM', 'FAR')
)
UPDATE "system_announcements" s SET "department_code" = a.canonical FROM aliases a
WHERE upper(trim(s."department_code")) = a.old_code;
