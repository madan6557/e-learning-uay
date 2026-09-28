-- Public URLs use persistent readable names; internal IDs remain unchanged.
CREATE FUNCTION assign_public_slug() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  label text;
  base text;
  candidate text;
  suffix integer := 1;
  taken boolean;
BEGIN
  IF TG_TABLE_NAME = 'course_classes' THEN
    SELECT code || '-' || title INTO label FROM courses WHERE course_id = NEW.course_id;
    label := label || '-' || NEW.name || '-' || NEW.academic_year;
  ELSE
    label := NEW.title;
  END IF;
  base := trim(both '-' from regexp_replace(lower(label), '[^a-z0-9]+', '-', 'g'));
  IF base = '' OR base IS NULL THEN base := 'konten'; END IF;
  base := left(base, 180);
  -- Serialize allocation per table so concurrent equal titles get distinct URLs.
  PERFORM pg_advisory_xact_lock(hashtext('public-slug:' || TG_TABLE_NAME));
  candidate := base;
  LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE slug = $1)', TG_TABLE_NAME)
      INTO taken USING candidate;
    EXIT WHEN NOT taken;
    suffix := suffix + 1;
    candidate := base || '-' || suffix;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

ALTER TABLE course_classes ADD COLUMN slug text;
CREATE UNIQUE INDEX course_classes_slug_key ON course_classes(slug);
CREATE TRIGGER course_classes_public_slug BEFORE INSERT OR UPDATE OF slug ON course_classes
  FOR EACH ROW WHEN (NEW.slug IS NULL) EXECUTE FUNCTION assign_public_slug();
DO $$
DECLARE row_id text;
BEGIN
  FOR row_id IN SELECT class_id FROM course_classes ORDER BY created_at, class_id LOOP
    UPDATE course_classes SET slug = NULL WHERE class_id = row_id;
  END LOOP;
END;
$$;
ALTER TABLE course_classes ALTER COLUMN slug SET NOT NULL;

ALTER TABLE resource_items ADD COLUMN slug text;
CREATE UNIQUE INDEX resource_items_slug_key ON resource_items(slug);
CREATE TRIGGER resource_items_public_slug BEFORE INSERT OR UPDATE OF slug ON resource_items
  FOR EACH ROW WHEN (NEW.slug IS NULL) EXECUTE FUNCTION assign_public_slug();
DO $$
DECLARE row_id text;
BEGIN
  FOR row_id IN SELECT resource_item_id FROM resource_items ORDER BY created_at, resource_item_id LOOP
    UPDATE resource_items SET slug = NULL WHERE resource_item_id = row_id;
  END LOOP;
END;
$$;
ALTER TABLE resource_items ALTER COLUMN slug SET NOT NULL;

ALTER TABLE quizzes ADD COLUMN slug text;
CREATE UNIQUE INDEX quizzes_slug_key ON quizzes(slug);
CREATE TRIGGER quizzes_public_slug BEFORE INSERT OR UPDATE OF slug ON quizzes
  FOR EACH ROW WHEN (NEW.slug IS NULL) EXECUTE FUNCTION assign_public_slug();
DO $$
DECLARE row_id text;
BEGIN
  FOR row_id IN SELECT quiz_id FROM quizzes ORDER BY created_at, quiz_id LOOP
    UPDATE quizzes SET slug = NULL WHERE quiz_id = row_id;
  END LOOP;
END;
$$;
ALTER TABLE quizzes ALTER COLUMN slug SET NOT NULL;

ALTER TABLE assignments ADD COLUMN slug text;
CREATE UNIQUE INDEX assignments_slug_key ON assignments(slug);
CREATE TRIGGER assignments_public_slug BEFORE INSERT OR UPDATE OF slug ON assignments
  FOR EACH ROW WHEN (NEW.slug IS NULL) EXECUTE FUNCTION assign_public_slug();
DO $$
DECLARE row_id text;
BEGIN
  FOR row_id IN SELECT assignment_id FROM assignments ORDER BY created_at, assignment_id LOOP
    UPDATE assignments SET slug = NULL WHERE assignment_id = row_id;
  END LOOP;
END;
$$;
ALTER TABLE assignments ALTER COLUMN slug SET NOT NULL;
