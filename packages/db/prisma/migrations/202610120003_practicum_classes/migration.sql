ALTER TABLE "course_classes"
  ADD COLUMN "parent_class_id" TEXT,
  ADD COLUMN "parent_grade_category_id" TEXT;

CREATE UNIQUE INDEX "course_classes_parent_class_id_key"
  ON "course_classes"("parent_class_id");

CREATE INDEX "course_classes_parent_grade_category_id_idx"
  ON "course_classes"("parent_grade_category_id");

ALTER TABLE "course_classes"
  ADD CONSTRAINT "course_classes_parent_class_id_fkey"
  FOREIGN KEY ("parent_class_id") REFERENCES "course_classes"("class_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_classes"
  ADD CONSTRAINT "course_classes_parent_grade_category_id_fkey"
  FOREIGN KEY ("parent_grade_category_id") REFERENCES "grade_categories"("grade_category_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
