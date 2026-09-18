-- Align the physical schema with the UAY SSO database convention:
-- snake_case tables and columns, <entity>_id surrogate keys, and an identity
-- vocabulary that maps one-for-one onto SSO `users` / `user_identifiers` /
-- `accounts`. The Prisma model surface stays camelCase per Technical Design
-- v4.0 section 6.3; only @map/@@map targets move.

-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STUDENT', 'LECTURER', 'STAFF', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "IdentifierType" AS ENUM ('NIM', 'NIP', 'NIDN', 'OTHER');
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILED');

-- The audit ledger is append-only; the backfill below is the one sanctioned
-- rewrite and runs with the guard lifted.
ALTER TABLE "AuditLog" DISABLE TRIGGER "audit_append_only";

ALTER TABLE "User" RENAME COLUMN "id" TO "user_id";
ALTER TABLE "User" RENAME COLUMN "externalSubjectId" TO "sso_user_id";
ALTER TABLE "User" RENAME COLUMN "fullName" TO "name";
ALTER TABLE "User" RENAME COLUMN "studentStaffNumber" TO "identifier_value";
ALTER TABLE "User" RENAME COLUMN "departmentScopes" TO "department_scopes";
ALTER TABLE "User" RENAME COLUMN "lastLoginAt" TO "last_login_at";
ALTER TABLE "User" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "User" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Course" RENAME COLUMN "id" TO "course_id";
ALTER TABLE "Course" RENAME COLUMN "departmentCode" TO "department_code";
ALTER TABLE "Course" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Course" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "Course" RENAME TO "courses";
ALTER TABLE "CourseClass" RENAME COLUMN "id" TO "class_id";
ALTER TABLE "CourseClass" RENAME COLUMN "courseId" TO "course_id";
ALTER TABLE "CourseClass" RENAME COLUMN "academicYear" TO "academic_year";
ALTER TABLE "CourseClass" RENAME COLUMN "enrollmentKeyHash" TO "enrollment_key_hash";
ALTER TABLE "CourseClass" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "CourseClass" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "CourseClass" RENAME TO "course_classes";
ALTER TABLE "ClassInstructor" RENAME COLUMN "id" TO "class_instructor_id";
ALTER TABLE "ClassInstructor" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "ClassInstructor" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "ClassInstructor" RENAME COLUMN "isPrimary" TO "is_primary";
ALTER TABLE "ClassInstructor" RENAME TO "class_instructors";
ALTER TABLE "Enrollment" RENAME COLUMN "id" TO "enrollment_id";
ALTER TABLE "Enrollment" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "Enrollment" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "Enrollment" RENAME COLUMN "enrolledAt" TO "enrolled_at";
ALTER TABLE "Enrollment" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "Enrollment" RENAME TO "enrollments";
ALTER TABLE "Section" RENAME COLUMN "id" TO "section_id";
ALTER TABLE "Section" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "Section" RENAME COLUMN "isVisible" TO "is_visible";
ALTER TABLE "Section" RENAME COLUMN "startDate" TO "start_date";
ALTER TABLE "Section" RENAME COLUMN "endDate" TO "end_date";
ALTER TABLE "Section" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Section" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "Section" RENAME TO "sections";
ALTER TABLE "ResourceItem" RENAME COLUMN "id" TO "resource_item_id";
ALTER TABLE "ResourceItem" RENAME COLUMN "sectionId" TO "section_id";
ALTER TABLE "ResourceItem" RENAME COLUMN "resourceType" TO "resource_type";
ALTER TABLE "ResourceItem" RENAME COLUMN "dynamicPayload" TO "dynamic_payload";
ALTER TABLE "ResourceItem" RENAME COLUMN "completionCriteria" TO "completion_criteria";
ALTER TABLE "ResourceItem" RENAME COLUMN "contentOrder" TO "content_order";
ALTER TABLE "ResourceItem" RENAME COLUMN "isVisible" TO "is_visible";
ALTER TABLE "ResourceItem" RENAME COLUMN "availableFrom" TO "available_from";
ALTER TABLE "ResourceItem" RENAME COLUMN "availableUntil" TO "available_until";
ALTER TABLE "ResourceItem" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "ResourceItem" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "ResourceItem" RENAME TO "resource_items";
ALTER TABLE "VideoProgress" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "VideoProgress" RENAME COLUMN "resourceItemId" TO "resource_item_id";
ALTER TABLE "VideoProgress" RENAME COLUMN "watchedSeconds" TO "watched_seconds";
ALTER TABLE "VideoProgress" RENAME COLUMN "lastPositionSeconds" TO "last_position_seconds";
ALTER TABLE "VideoProgress" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "VideoProgress" RENAME TO "video_progress";
ALTER TABLE "SlideProgress" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "SlideProgress" RENAME COLUMN "resourceItemId" TO "resource_item_id";
ALTER TABLE "SlideProgress" RENAME COLUMN "viewedPages" TO "viewed_pages";
ALTER TABLE "SlideProgress" RENAME COLUMN "currentPage" TO "current_page";
ALTER TABLE "SlideProgress" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "SlideProgress" RENAME TO "slide_progress";
ALTER TABLE "MaterialDownload" RENAME COLUMN "id" TO "material_download_id";
ALTER TABLE "MaterialDownload" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "MaterialDownload" RENAME COLUMN "resourceItemId" TO "resource_item_id";
ALTER TABLE "MaterialDownload" RENAME COLUMN "downloadedAt" TO "downloaded_at";
ALTER TABLE "MaterialDownload" RENAME TO "material_downloads";
ALTER TABLE "GradeCategory" RENAME COLUMN "id" TO "grade_category_id";
ALTER TABLE "GradeCategory" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "GradeCategory" RENAME COLUMN "weightPercent" TO "weight_percent";
ALTER TABLE "GradeCategory" RENAME COLUMN "aggregationMethod" TO "aggregation_method";
ALTER TABLE "GradeCategory" RENAME COLUMN "dropLowest" TO "drop_lowest";
ALTER TABLE "GradeCategory" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "GradeCategory" RENAME TO "grade_categories";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "id" TO "final_grade_record_id";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "categoryScoresJson" TO "category_scores_json";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "finalScore" TO "final_score";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "gradeLetter" TO "grade_letter";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "gradePoint" TO "grade_point";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "isLocked" TO "is_locked";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "FinalGradeRecord" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "FinalGradeRecord" RENAME TO "final_grade_records";
ALTER TABLE "QuestionBank" RENAME COLUMN "id" TO "question_bank_id";
ALTER TABLE "QuestionBank" RENAME COLUMN "courseId" TO "course_id";
ALTER TABLE "QuestionBank" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "QuestionBank" RENAME TO "question_banks";
ALTER TABLE "Question" RENAME COLUMN "id" TO "question_id";
ALTER TABLE "Question" RENAME COLUMN "questionBankId" TO "question_bank_id";
ALTER TABLE "Question" RENAME COLUMN "quizId" TO "quiz_id";
ALTER TABLE "Question" RENAME COLUMN "answerKey" TO "answer_key";
ALTER TABLE "Question" RENAME COLUMN "maxWords" TO "max_words";
ALTER TABLE "Question" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Question" RENAME TO "questions";
ALTER TABLE "Quiz" RENAME COLUMN "id" TO "quiz_id";
ALTER TABLE "Quiz" RENAME COLUMN "sectionId" TO "section_id";
ALTER TABLE "Quiz" RENAME COLUMN "gradeCategoryId" TO "grade_category_id";
ALTER TABLE "Quiz" RENAME COLUMN "scoreMode" TO "score_mode";
ALTER TABLE "Quiz" RENAME COLUMN "passingScore" TO "passing_score";
ALTER TABLE "Quiz" RENAME COLUMN "timeLimitMinutes" TO "time_limit_minutes";
ALTER TABLE "Quiz" RENAME COLUMN "timerMode" TO "timer_mode";
ALTER TABLE "Quiz" RENAME COLUMN "attemptLimit" TO "attempt_limit";
ALTER TABLE "Quiz" RENAME COLUMN "randomizeQuestions" TO "randomize_questions";
ALTER TABLE "Quiz" RENAME COLUMN "randomizeOptions" TO "randomize_options";
ALTER TABLE "Quiz" RENAME COLUMN "resultReleaseMode" TO "result_release_mode";
ALTER TABLE "Quiz" RENAME COLUMN "resultReleaseAt" TO "result_release_at";
ALTER TABLE "Quiz" RENAME COLUMN "availableFrom" TO "available_from";
ALTER TABLE "Quiz" RENAME COLUMN "availableUntil" TO "available_until";
ALTER TABLE "Quiz" RENAME COLUMN "contentOrder" TO "content_order";
ALTER TABLE "Quiz" RENAME COLUMN "isVisible" TO "is_visible";
ALTER TABLE "Quiz" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Quiz" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "Quiz" RENAME TO "quizzes";
ALTER TABLE "QuizAttempt" RENAME COLUMN "id" TO "quiz_attempt_id";
ALTER TABLE "QuizAttempt" RENAME COLUMN "quizId" TO "quiz_id";
ALTER TABLE "QuizAttempt" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "QuizAttempt" RENAME COLUMN "attemptNum" TO "attempt_num";
ALTER TABLE "QuizAttempt" RENAME COLUMN "isPassed" TO "is_passed";
ALTER TABLE "QuizAttempt" RENAME COLUMN "questionSnapshot" TO "question_snapshot";
ALTER TABLE "QuizAttempt" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "QuizAttempt" RENAME COLUMN "objectiveScore" TO "objective_score";
ALTER TABLE "QuizAttempt" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "QuizAttempt" RENAME COLUMN "answersJson" TO "answers_json";
ALTER TABLE "QuizAttempt" RENAME COLUMN "startedAt" TO "started_at";
ALTER TABLE "QuizAttempt" RENAME COLUMN "submittedAt" TO "submitted_at";
ALTER TABLE "QuizAttempt" RENAME COLUMN "isGraded" TO "is_graded";
ALTER TABLE "QuizAttempt" RENAME TO "quiz_attempts";
ALTER TABLE "QuizAnswerGrade" RENAME COLUMN "id" TO "quiz_answer_grade_id";
ALTER TABLE "QuizAnswerGrade" RENAME COLUMN "attemptId" TO "attempt_id";
ALTER TABLE "QuizAnswerGrade" RENAME COLUMN "questionId" TO "question_id";
ALTER TABLE "QuizAnswerGrade" RENAME COLUMN "graderId" TO "grader_id";
ALTER TABLE "QuizAnswerGrade" RENAME COLUMN "gradedAt" TO "graded_at";
ALTER TABLE "QuizAnswerGrade" RENAME TO "quiz_answer_grades";
ALTER TABLE "Assignment" RENAME COLUMN "id" TO "assignment_id";
ALTER TABLE "Assignment" RENAME COLUMN "sectionId" TO "section_id";
ALTER TABLE "Assignment" RENAME COLUMN "gradeCategoryId" TO "grade_category_id";
ALTER TABLE "Assignment" RENAME COLUMN "maxScore" TO "max_score";
ALTER TABLE "Assignment" RENAME COLUMN "allowedFormats" TO "allowed_formats";
ALTER TABLE "Assignment" RENAME COLUMN "availableFrom" TO "available_from";
ALTER TABLE "Assignment" RENAME COLUMN "cutoffDate" TO "cutoff_date";
ALTER TABLE "Assignment" RENAME COLUMN "allowLate" TO "allow_late";
ALTER TABLE "Assignment" RENAME COLUMN "maxAttempts" TO "max_attempts";
ALTER TABLE "Assignment" RENAME COLUMN "contentOrder" TO "content_order";
ALTER TABLE "Assignment" RENAME COLUMN "isVisible" TO "is_visible";
ALTER TABLE "Assignment" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Assignment" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "Assignment" RENAME TO "assignments";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "id" TO "assignment_submission_id";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "assignmentId" TO "assignment_id";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "textContent" TO "text_content";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "fileObjectId" TO "file_object_id";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "fileName" TO "file_name";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "fileSizeBytes" TO "file_size_bytes";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "externalUrl" TO "external_url";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "isPublished" TO "is_published";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "submittedAt" TO "submitted_at";
ALTER TABLE "AssignmentSubmission" RENAME COLUMN "gradedAt" TO "graded_at";
ALTER TABLE "AssignmentSubmission" RENAME TO "assignment_submissions";
ALTER TABLE "Announcement" RENAME COLUMN "id" TO "announcement_id";
ALTER TABLE "Announcement" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "Announcement" RENAME COLUMN "authorId" TO "author_id";
ALTER TABLE "Announcement" RENAME COLUMN "isImportant" TO "is_important";
ALTER TABLE "Announcement" RENAME COLUMN "isPublished" TO "is_published";
ALTER TABLE "Announcement" RENAME COLUMN "publishedAt" TO "published_at";
ALTER TABLE "Announcement" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Announcement" RENAME TO "announcements";
ALTER TABLE "Notification" RENAME COLUMN "id" TO "notification_id";
ALTER TABLE "Notification" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "Notification" RENAME COLUMN "linkUrl" TO "link_url";
ALTER TABLE "Notification" RENAME COLUMN "eventKey" TO "event_key";
ALTER TABLE "Notification" RENAME COLUMN "isRead" TO "is_read";
ALTER TABLE "Notification" RENAME COLUMN "readAt" TO "read_at";
ALTER TABLE "Notification" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "Notification" RENAME TO "notifications";
ALTER TABLE "AuditLog" RENAME COLUMN "id" TO "audit_log_id";
ALTER TABLE "AuditLog" RENAME COLUMN "actorId" TO "actor_user_id";
ALTER TABLE "AuditLog" RENAME COLUMN "actorRole" TO "actor_role";
ALTER TABLE "AuditLog" RENAME COLUMN "entity" TO "target_type";
ALTER TABLE "AuditLog" RENAME COLUMN "entityId" TO "target_id";
ALTER TABLE "AuditLog" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "AuditLog" RENAME COLUMN "beforeState" TO "before_data";
ALTER TABLE "AuditLog" RENAME COLUMN "afterState" TO "after_data";
ALTER TABLE "AuditLog" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "AuditLog" RENAME TO "audit_logs";
ALTER TABLE "FileReference" RENAME COLUMN "id" TO "file_reference_id";
ALTER TABLE "FileReference" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "FileReference" RENAME COLUMN "ownerId" TO "owner_id";
ALTER TABLE "FileReference" RENAME COLUMN "contextId" TO "context_id";
ALTER TABLE "FileReference" RENAME COLUMN "mimeType" TO "mime_type";
ALTER TABLE "FileReference" RENAME COLUMN "sizeBytes" TO "size_bytes";
ALTER TABLE "FileReference" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "FileReference" RENAME COLUMN "trashedAt" TO "trashed_at";
ALTER TABLE "FileReference" RENAME TO "file_references";
ALTER TABLE "ResourceProgress" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "ResourceProgress" RENAME COLUMN "resourceItemId" TO "resource_item_id";
ALTER TABLE "ResourceProgress" RENAME COLUMN "completedAt" TO "completed_at";
ALTER TABLE "ResourceProgress" RENAME COLUMN "checklistIds" TO "checklist_ids";
ALTER TABLE "ResourceProgress" RENAME TO "resource_progress";
ALTER TABLE "IdempotencyRecord" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "IdempotencyRecord" RENAME COLUMN "requestHash" TO "request_hash";
ALTER TABLE "IdempotencyRecord" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "IdempotencyRecord" RENAME TO "idempotency_records";
ALTER TABLE "ManualGradeRecord" RENAME COLUMN "id" TO "manual_grade_record_id";
ALTER TABLE "ManualGradeRecord" RENAME COLUMN "classId" TO "class_id";
ALTER TABLE "ManualGradeRecord" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "ManualGradeRecord" RENAME COLUMN "categoryId" TO "grade_category_id";
ALTER TABLE "ManualGradeRecord" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "ManualGradeRecord" RENAME TO "manual_grade_records";
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER INDEX "User_externalSubjectId_key" RENAME TO "users_sso_user_id_key";
ALTER INDEX "User_email_key" RENAME TO "users_email_key";
ALTER INDEX "User_studentStaffNumber_key" RENAME TO "users_identifier_value_key";
ALTER TABLE "courses" RENAME CONSTRAINT "Course_pkey" TO "courses_pkey";
ALTER INDEX "Course_code_key" RENAME TO "courses_code_key";
ALTER TABLE "course_classes" RENAME CONSTRAINT "CourseClass_pkey" TO "course_classes_pkey";
ALTER INDEX "CourseClass_courseId_academicYear_idx" RENAME TO "course_classes_course_id_academic_year_idx";
ALTER TABLE "course_classes" RENAME CONSTRAINT "CourseClass_courseId_fkey" TO "course_classes_course_id_fkey";
ALTER TABLE "class_instructors" RENAME CONSTRAINT "ClassInstructor_pkey" TO "class_instructors_pkey";
ALTER INDEX "ClassInstructor_classId_userId_key" RENAME TO "class_instructors_class_id_user_id_key";
ALTER INDEX "ClassInstructor_userId_idx" RENAME TO "class_instructors_user_id_idx";
ALTER TABLE "class_instructors" RENAME CONSTRAINT "ClassInstructor_classId_fkey" TO "class_instructors_class_id_fkey";
ALTER TABLE "class_instructors" RENAME CONSTRAINT "ClassInstructor_userId_fkey" TO "class_instructors_user_id_fkey";
ALTER TABLE "enrollments" RENAME CONSTRAINT "Enrollment_pkey" TO "enrollments_pkey";
ALTER INDEX "Enrollment_classId_userId_key" RENAME TO "enrollments_class_id_user_id_key";
ALTER INDEX "Enrollment_userId_idx" RENAME TO "enrollments_user_id_idx";
ALTER TABLE "enrollments" RENAME CONSTRAINT "Enrollment_classId_fkey" TO "enrollments_class_id_fkey";
ALTER TABLE "enrollments" RENAME CONSTRAINT "Enrollment_userId_fkey" TO "enrollments_user_id_fkey";
ALTER TABLE "sections" RENAME CONSTRAINT "Section_pkey" TO "sections_pkey";
ALTER INDEX "Section_classId_order_key" RENAME TO "sections_class_id_order_key";
ALTER INDEX "Section_classId_idx" RENAME TO "sections_class_id_idx";
ALTER TABLE "sections" RENAME CONSTRAINT "Section_classId_fkey" TO "sections_class_id_fkey";
ALTER TABLE "resource_items" RENAME CONSTRAINT "ResourceItem_pkey" TO "resource_items_pkey";
ALTER INDEX "ResourceItem_sectionId_contentOrder_idx" RENAME TO "resource_items_section_id_content_order_idx";
ALTER TABLE "resource_items" RENAME CONSTRAINT "ResourceItem_sectionId_fkey" TO "resource_items_section_id_fkey";
ALTER TABLE "video_progress" RENAME CONSTRAINT "VideoProgress_pkey" TO "video_progress_pkey";
ALTER TABLE "video_progress" RENAME CONSTRAINT "VideoProgress_userId_fkey" TO "video_progress_user_id_fkey";
ALTER TABLE "video_progress" RENAME CONSTRAINT "VideoProgress_resourceItemId_fkey" TO "video_progress_resource_item_id_fkey";
ALTER TABLE "slide_progress" RENAME CONSTRAINT "SlideProgress_pkey" TO "slide_progress_pkey";
ALTER TABLE "slide_progress" RENAME CONSTRAINT "SlideProgress_userId_fkey" TO "slide_progress_user_id_fkey";
ALTER TABLE "slide_progress" RENAME CONSTRAINT "SlideProgress_resourceItemId_fkey" TO "slide_progress_resource_item_id_fkey";
ALTER TABLE "material_downloads" RENAME CONSTRAINT "MaterialDownload_pkey" TO "material_downloads_pkey";
ALTER INDEX "MaterialDownload_userId_resourceItemId_key" RENAME TO "material_downloads_user_id_resource_item_id_key";
ALTER INDEX "MaterialDownload_resourceItemId_idx" RENAME TO "material_downloads_resource_item_id_idx";
ALTER TABLE "material_downloads" RENAME CONSTRAINT "MaterialDownload_userId_fkey" TO "material_downloads_user_id_fkey";
ALTER TABLE "material_downloads" RENAME CONSTRAINT "MaterialDownload_resourceItemId_fkey" TO "material_downloads_resource_item_id_fkey";
ALTER TABLE "grade_categories" RENAME CONSTRAINT "GradeCategory_pkey" TO "grade_categories_pkey";
ALTER INDEX "GradeCategory_classId_order_idx" RENAME TO "grade_categories_class_id_order_idx";
ALTER TABLE "grade_categories" RENAME CONSTRAINT "GradeCategory_classId_fkey" TO "grade_categories_class_id_fkey";
ALTER TABLE "final_grade_records" RENAME CONSTRAINT "FinalGradeRecord_pkey" TO "final_grade_records_pkey";
ALTER INDEX "FinalGradeRecord_classId_userId_key" RENAME TO "final_grade_records_class_id_user_id_key";
ALTER INDEX "FinalGradeRecord_classId_idx" RENAME TO "final_grade_records_class_id_idx";
ALTER TABLE "final_grade_records" RENAME CONSTRAINT "FinalGradeRecord_classId_fkey" TO "final_grade_records_class_id_fkey";
ALTER TABLE "final_grade_records" RENAME CONSTRAINT "FinalGradeRecord_userId_fkey" TO "final_grade_records_user_id_fkey";
ALTER TABLE "question_banks" RENAME CONSTRAINT "QuestionBank_pkey" TO "question_banks_pkey";
ALTER TABLE "question_banks" RENAME CONSTRAINT "QuestionBank_courseId_fkey" TO "question_banks_course_id_fkey";
ALTER TABLE "questions" RENAME CONSTRAINT "Question_pkey" TO "questions_pkey";
ALTER INDEX "Question_quizId_order_idx" RENAME TO "questions_quiz_id_order_idx";
ALTER TABLE "questions" RENAME CONSTRAINT "Question_questionBankId_fkey" TO "questions_question_bank_id_fkey";
ALTER TABLE "questions" RENAME CONSTRAINT "Question_quizId_fkey" TO "questions_quiz_id_fkey";
ALTER TABLE "quizzes" RENAME CONSTRAINT "Quiz_pkey" TO "quizzes_pkey";
ALTER INDEX "Quiz_sectionId_contentOrder_idx" RENAME TO "quizzes_section_id_content_order_idx";
ALTER TABLE "quizzes" RENAME CONSTRAINT "Quiz_sectionId_fkey" TO "quizzes_section_id_fkey";
ALTER TABLE "quizzes" RENAME CONSTRAINT "Quiz_gradeCategoryId_fkey" TO "quizzes_grade_category_id_fkey";
ALTER TABLE "quiz_attempts" RENAME CONSTRAINT "QuizAttempt_pkey" TO "quiz_attempts_pkey";
ALTER INDEX "QuizAttempt_quizId_userId_attemptNum_key" RENAME TO "quiz_attempts_quiz_id_user_id_attempt_num_key";
ALTER INDEX "QuizAttempt_userId_quizId_idx" RENAME TO "quiz_attempts_user_id_quiz_id_idx";
ALTER TABLE "quiz_attempts" RENAME CONSTRAINT "QuizAttempt_quizId_fkey" TO "quiz_attempts_quiz_id_fkey";
ALTER TABLE "quiz_attempts" RENAME CONSTRAINT "QuizAttempt_userId_fkey" TO "quiz_attempts_user_id_fkey";
ALTER TABLE "quiz_answer_grades" RENAME CONSTRAINT "QuizAnswerGrade_pkey" TO "quiz_answer_grades_pkey";
ALTER INDEX "QuizAnswerGrade_attemptId_questionId_key" RENAME TO "quiz_answer_grades_attempt_id_question_id_key";
ALTER INDEX "QuizAnswerGrade_questionId_idx" RENAME TO "quiz_answer_grades_question_id_idx";
ALTER TABLE "quiz_answer_grades" RENAME CONSTRAINT "QuizAnswerGrade_attemptId_fkey" TO "quiz_answer_grades_attempt_id_fkey";
ALTER TABLE "quiz_answer_grades" RENAME CONSTRAINT "QuizAnswerGrade_questionId_fkey" TO "quiz_answer_grades_question_id_fkey";
ALTER TABLE "quiz_answer_grades" RENAME CONSTRAINT "QuizAnswerGrade_graderId_fkey" TO "quiz_answer_grades_grader_id_fkey";
ALTER TABLE "assignments" RENAME CONSTRAINT "Assignment_pkey" TO "assignments_pkey";
ALTER INDEX "Assignment_sectionId_contentOrder_idx" RENAME TO "assignments_section_id_content_order_idx";
ALTER TABLE "assignments" RENAME CONSTRAINT "Assignment_sectionId_fkey" TO "assignments_section_id_fkey";
ALTER TABLE "assignments" RENAME CONSTRAINT "Assignment_gradeCategoryId_fkey" TO "assignments_grade_category_id_fkey";
ALTER TABLE "assignment_submissions" RENAME CONSTRAINT "AssignmentSubmission_pkey" TO "assignment_submissions_pkey";
ALTER INDEX "AssignmentSubmission_assignmentId_userId_version_key" RENAME TO "assignment_submissions_assignment_id_user_id_version_key";
ALTER INDEX "AssignmentSubmission_assignmentId_userId_idx" RENAME TO "assignment_submissions_assignment_id_user_id_idx";
ALTER TABLE "assignment_submissions" RENAME CONSTRAINT "AssignmentSubmission_assignmentId_fkey" TO "assignment_submissions_assignment_id_fkey";
ALTER TABLE "assignment_submissions" RENAME CONSTRAINT "AssignmentSubmission_userId_fkey" TO "assignment_submissions_user_id_fkey";
ALTER TABLE "announcements" RENAME CONSTRAINT "Announcement_pkey" TO "announcements_pkey";
ALTER INDEX "Announcement_classId_publishedAt_idx" RENAME TO "announcements_class_id_published_at_idx";
ALTER TABLE "announcements" RENAME CONSTRAINT "Announcement_classId_fkey" TO "announcements_class_id_fkey";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_pkey" TO "notifications_pkey";
ALTER INDEX "Notification_userId_eventKey_key" RENAME TO "notifications_user_id_event_key_key";
ALTER INDEX "Notification_userId_isRead_idx" RENAME TO "notifications_user_id_is_read_idx";
ALTER TABLE "notifications" RENAME CONSTRAINT "Notification_userId_fkey" TO "notifications_user_id_fkey";
ALTER TABLE "audit_logs" RENAME CONSTRAINT "AuditLog_pkey" TO "audit_logs_pkey";
ALTER INDEX "AuditLog_actorId_createdAt_idx" RENAME TO "audit_logs_actor_user_id_created_at_idx";
ALTER INDEX "AuditLog_entity_entityId_idx" RENAME TO "audit_logs_target_type_target_id_idx";
ALTER INDEX "AuditLog_classId_createdAt_idx" RENAME TO "audit_logs_class_id_created_at_idx";
ALTER TABLE "audit_logs" RENAME CONSTRAINT "AuditLog_actorId_fkey" TO "audit_logs_actor_user_id_fkey";
ALTER TABLE "file_references" RENAME CONSTRAINT "FileReference_pkey" TO "file_references_pkey";
ALTER INDEX "FileReference_classId_purpose_idx" RENAME TO "file_references_class_id_purpose_idx";
ALTER INDEX "FileReference_ownerId_idx" RENAME TO "file_references_owner_id_idx";
ALTER TABLE "resource_progress" RENAME CONSTRAINT "ResourceProgress_pkey" TO "resource_progress_pkey";
ALTER TABLE "idempotency_records" RENAME CONSTRAINT "IdempotencyRecord_pkey" TO "idempotency_records_pkey";
ALTER TABLE "manual_grade_records" RENAME CONSTRAINT "ManualGradeRecord_pkey" TO "manual_grade_records_pkey";
ALTER INDEX "ManualGradeRecord_classId_userId_categoryId_key" RENAME TO "manual_grade_records_class_id_user_id_grade_category_id_key";

-- Identity columns projected from SSO.
ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "user_type" "UserType" NOT NULL DEFAULT 'STUDENT';
ALTER TABLE "users" ADD COLUMN "identifier_type" "IdentifierType" NOT NULL DEFAULT 'NIM';
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- Derive the SSO shape from the columns it replaces. Directory type and
-- identifier kind follow the application role until SSO supplies its own.
UPDATE "users" SET
  "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"UserStatus" ELSE 'DISABLED'::"UserStatus" END,
  "user_type" = (CASE "role"
    WHEN 'SUPER_ADMIN' THEN 'ADMIN'
    WHEN 'DEPARTMENT_ADMIN' THEN 'STAFF'
    WHEN 'INSTRUCTOR' THEN 'LECTURER'
    ELSE 'STUDENT' END)::"UserType",
  "identifier_type" = (CASE "role"
    WHEN 'STUDENT' THEN 'NIM'
    WHEN 'INSTRUCTOR' THEN 'NIDN'
    ELSE 'NIP' END)::"IdentifierType";

ALTER TABLE "users" DROP COLUMN "isActive";

-- Audit columns that mirror SSO `audit_events`; previously nested in metadata.
ALTER TABLE "audit_logs" ADD COLUMN "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "audit_logs" ADD COLUMN "reason" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "ip_address" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "user_agent" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "request_id" TEXT;

UPDATE "audit_logs" SET
  "reason" = NULLIF("metadata" ->> 'reason', ''),
  "ip_address" = NULLIF("metadata" ->> 'clientIp', ''),
  "user_agent" = NULLIF("metadata" ->> 'userAgent', ''),
  "request_id" = NULLIF("metadata" ->> 'requestId', '');

ALTER TABLE "audit_logs" ENABLE TRIGGER "audit_append_only";

CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END;
$$;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE INDEX "users_user_type_idx" ON "users"("user_type");
CREATE INDEX "users_identifier_type_identifier_value_idx" ON "users"("identifier_type", "identifier_value");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_request_id_idx" ON "audit_logs"("request_id");
