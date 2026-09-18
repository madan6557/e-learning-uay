# Penyelarasan penamaan data SSO ↔ E-Learning

Tanggal: 18 September 2026. Sumber SSO: `docs/SSO DB.txt` dan skema Prisma pada
repositori [UAY-System/SSO](https://github.com/UAY-System/SSO)
(`apps/api/prisma/schema.prisma`).

Tujuan dokumen ini adalah menghilangkan penerjemahan nama saat integrasi: satu
istilah dipakai dari kolom SSO, ke claim token, sampai kolom E-Learning.

## 1. Dua lapis penamaan

E-Learning memakai dua lapis yang sengaja berbeda:

| Lapis                              | Konvensi                                    | Alasan                                                                 |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Model Prisma dan kode TypeScript   | `PascalCase` model, `camelCase` field        | Technical Design v4.0 sub-bab 6.3 mewajibkan ini.                       |
| Tabel dan kolom PostgreSQL         | `snake_case`, primary key `<entitas>_id`     | Konvensi basis data SSO, sehingga kedua basis data terbaca sama.        |

Jembatannya adalah `@map` dan `@@map` pada `packages/db/prisma/schema.prisma`.
Contoh: model `CourseClass` memakai field `courseId` di kode, dan kolom
`course_id` pada tabel `course_classes`.

Nama tipe enum tetap `PascalCase` pada PostgreSQL, sama seperti di SSO.

## 2. Identitas

Kolom identitas E-Learning bernama sama dengan asalnya di SSO. E-Learning adalah
*cache* identitas: tidak pernah membuat, mengubah, atau menghapus akun.

| SSO                                           | Claim token          | E-Learning (field / kolom)                   |
| --------------------------------------------- | -------------------- | -------------------------------------------- |
| `users.user_id`                               | `sub`                | `ssoUserId` / `users.sso_user_id`             |
| `users.name`                                  | `name`               | `name` / `users.name`                         |
| `users.email`                                 | `email`              | `email` / `users.email`                       |
| `users.user_type`                             | `user_type`          | `userType` / `users.user_type`                |
| `users.status`                                | `account_status`     | `status` / `users.status`                     |
| `accounts.username`                           | `preferred_username` | `username` / `users.username`                 |
| `user_identifiers.identifier_type` (primary)  | `identifier_type`    | `identifierType` / `users.identifier_type`    |
| `user_identifiers.identifier_value` (primary) | `identifier_value`   | `identifierValue` / `users.identifier_value`  |
| `application_access` → `roles.name`           | `roles[]`            | `role` / `users.role`                         |
| —                                             | `department_scopes`  | `departmentScopes` / `users.department_scopes` |

Catatan:

- `users.user_id` E-Learning adalah kunci lokal, **bukan** `sub`. Kunci lokal
  dipisahkan agar penerbitan ulang record direktori tidak menulis ulang foreign
  key milik enrollment, nilai, dan audit.
- Enum `UserType`, `UserStatus`, dan `IdentifierType` memakai nilai yang persis
  sama dengan SSO.
- `GlobalRole` adalah role aplikasi E-Learning di dalam SSO
  (`application_access` yang menunjuk `client_id` E-Learning), bukan role global
  lintas aplikasi. Namanya dipertahankan karena Technical Design v4.0 sub-bab
  5.2 mendefinisikannya demikian.
- Kontrak claim dan aturan turunannya berada pada
  `packages/shared/src/sso.ts` sebagai satu-satunya sumber kebenaran.

### Kompatibilitas mundur

Skema claim menerima alias lama `role` (nilai tunggal) dan
`student_staff_number` agar penerbit token dan layanan ini dapat dimigrasikan
terpisah. Nama bergaya SSO menang bila keduanya dikirim.

### Nilai turunan

Bila SSO belum mengirim sebuah claim opsional, E-Learning menurunkannya:

| Claim kosong      | Diturunkan dari | Aturan                                                                       |
| ----------------- | --------------- | ---------------------------------------------------------------------------- |
| `user_type`       | `roles[]`       | `STUDENT`→`STUDENT`, `INSTRUCTOR`→`LECTURER`, `DEPARTMENT_ADMIN`→`STAFF`, `SUPER_ADMIN`→`ADMIN` |
| `identifier_type` | `user_type`     | `STUDENT`→`NIM`, `LECTURER`→`NIDN`, lainnya→`NIP`                             |

## 3. Audit

Kolom audit E-Learning memakai kosakata `audit_events` milik SSO supaya kedua
ledger dapat dibaca dan dikorelasikan dengan cara yang sama.

| SSO `audit_events` | E-Learning `audit_logs`      | Catatan                                        |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `actor_user_id`    | `actor_user_id`              | Field Prisma tetap `actorId`.                   |
| `action`           | `action`                     |                                                |
| `target_type`      | `target_type`                | Field Prisma tetap `entity` sesuai v4.0 §5.2.   |
| `target_id`        | `target_id`                  | Field Prisma tetap `entityId`.                  |
| `result`           | `result`                     | Ditambahkan: `SUCCESS` / `FAILED`.              |
| `reason`           | `reason`                     | Ditambahkan sebagai kolom, sebelumnya di JSON.  |
| `ip_address`       | `ip_address`                 | Ditambahkan sebagai kolom.                      |
| `user_agent`       | `user_agent`                 | Ditambahkan sebagai kolom.                      |
| `request_id`       | `request_id`                 | Ditambahkan sebagai kolom dan terindeks.        |
| `before_data`      | `before_data`                | Field Prisma tetap `beforeState`.               |
| `after_data`       | `after_data`                 | Field Prisma tetap `afterState`.                |
| —                  | `actor_role`, `class_id`     | Khusus E-Learning: otorisasi berbasis kelas.    |

Kolom `metadata` tetap ada untuk konteks yang tidak punya kolom sendiri.
Trigger append-only tetap menolak UPDATE dan DELETE pada `audit_logs`.

## 4. Nama tabel

| Model Prisma           | Tabel PostgreSQL          |
| ---------------------- | ------------------------- |
| `User`                 | `users`                   |
| `Course`               | `courses`                 |
| `CourseClass`          | `course_classes`          |
| `ClassInstructor`      | `class_instructors`       |
| `Enrollment`           | `enrollments`             |
| `Section`              | `sections`                |
| `ResourceItem`         | `resource_items`          |
| `VideoProgress`        | `video_progress`          |
| `SlideProgress`        | `slide_progress`          |
| `MaterialDownload`     | `material_downloads`      |
| `GradeCategory`        | `grade_categories`        |
| `FinalGradeRecord`     | `final_grade_records`     |
| `QuestionBank`         | `question_banks`          |
| `Question`             | `questions`               |
| `Quiz`                 | `quizzes`                 |
| `QuizAttempt`          | `quiz_attempts`           |
| `QuizAnswerGrade`      | `quiz_answer_grades`      |
| `Assignment`           | `assignments`             |
| `AssignmentSubmission` | `assignment_submissions`  |
| `Announcement`         | `announcements`           |
| `Notification`         | `notifications`           |
| `AuditLog`             | `audit_logs`              |
| `FileReference`        | `file_references`         |
| `ResourceProgress`     | `resource_progress`       |
| `IdempotencyRecord`    | `idempotency_records`     |
| `ManualGradeRecord`    | `manual_grade_records`    |

## 5. Simpangan terhadap Technical Design v4.0

Tiga nama field pada sub-bab 5.2 diganti agar sesuai basis data SSO. Simpangan
ini disengaja dan dicatat di sini supaya dapat ditinjau pemilik dokumen:

| v4.0 sub-bab 5.2     | Sekarang          | Alasan                                                   |
| -------------------- | ----------------- | -------------------------------------------------------- |
| `externalSubjectId`  | `ssoUserId`       | Menunjuk langsung ke `users.user_id` milik SSO.           |
| `studentStaffNumber` | `identifierValue` | SSO menyimpan identitas sebagai pasangan tipe + nilai.    |
| `fullName`           | `name`            | Sama dengan `users.name`.                                 |

Field baru `username`, `userType`, `identifierType`, dan `status` adalah
tambahan; `status` menggantikan `isActive` agar nilainya sama persis dengan
`users.status` di SSO (`ACTIVE` / `DISABLED`).

Konvensi sub-bab 6.3 tetap dipatuhi: seluruh nama field Prisma tetap `camelCase`
Bahasa Inggris, dan nama model tetap `PascalCase`.

## 6. Migrasi

`packages/db/prisma/migrations/202609180003_sso_naming_alignment` memindahkan
basis data yang sudah ada tanpa kehilangan data: seluruh tabel, kolom, index,
dan constraint di-*rename*, lalu kolom identitas baru diisi dari kolom yang
digantikannya (`isActive` → `status`, role → `user_type`/`identifier_type`) dan
kolom audit baru diisi dari `metadata`. Trigger append-only dinonaktifkan hanya
selama backfill audit tersebut.
