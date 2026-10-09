# Panduan Serah Terima & Arsitektur Developer (Handover Guide)
## E-Learning Universitas Achmad Yani (UAY) Banjarmasin

Dokumen ini disusun sebagai panduan teknis utama bagi pengembang (software engineer / dev team) yang akan melanjutkan pengembangan, memelihara, atau mengoperasikan platform **E-Learning UAY**. 

---

## 1. Ringkasan Eksekutif & Topologi Sistem

E-Learning UAY adalah platform pembelajaran terpadu berbasis web yang dirancang berdasarkan **Technical Design E-Learning UAY v4.0**. Sistem ini menggunakan arsitektur monorepo dengan pemisahan tegas antara antarmuka (frontend), backend API, basis data, dan pustaka bersama.

### Teknologi Utama (Tech Stack)
| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Runtime** | Node.js `>= 22.12` | ESM native (`"type": "module"`) |
| **Frontend** | React 19, TypeScript 5.9, Vite 7 | Single Page Application (SPA), Lucide icons |
| **Backend API** | Express 5, TypeScript 5.9 | REST API `/api/v1`, Zod validation |
| **Database ORM** | Prisma Client 6.19 | PostgreSQL 16 (Embedded untuk dev lokal) |
| **Cache & Realtime** | Redis 7 dengan grace memori | Sesi, pencabutan token, pembatasan akses; memori hanya berlaku pada satu proses |
| **Autentikasi** | Keycloak OpenID Connect (OIDC) | PKCE + Auth Code Flow, cookie berbasis sesi opaque |
| **File Storage** | UAY File Service API (M2M) | Arsitektur *Zero-Binary* di database utama |
| **Dokumen & Ekspor** | ExcelJS, PDFKit | Pembuatan laporan PDF Rektor & rekap nilai Excel |

### Topologi Layanan Lokal (`npm run dev`)
Saat menjalankan `npm run dev`, launcher otomatis mengorkestrasi 5 proses lokal tanpa memerlukan instalasi Docker:

| Port | Layanan | Keterangan |
| :--- | :--- | :--- |
| **`5173`** | **Frontend Vite** | Proksi transparan `/api/*` ke port `3000` |
| **`3000`** | **Express API** | REST API gateway dan otorisasi aplikasi |
| **`3001`** | **File Service Fixture** | Mock simulasi UAY File Service (`scripts/file-service.mjs`) |
| **`4402`** | **OIDC SSO Provider** | Mock Keycloak lokal dengan penerbitan token JWT asli |
| **`55432`** | **Embedded PostgreSQL** | Database lokal persisten di direktori `.local/postgres` |

> **Catatan Penting:** Gunakan alamat host `http://127.0.0.1:5173` secara konsisten pada browser, jangan berganti-ganti dengan `localhost` agar domain cookie sesi dan origin CORS tetap sinkron.

---

## 2. Peta Direktori & Struktur Kode (Source Code Map)

```text
E - Learning UAY/
├── apps/
│   ├── api/                      # Backend Express Application
│   │   ├── src/
│   │   │   ├── index.ts          # Server entrypoint, middleware global & route guards
│   │   │   ├── core.ts           # Prisma DB instance, ensure(), mutate(), classAccess()
│   │   │   ├── auth.ts           # OIDC authentication handler & session token manager
│   │   │   ├── learning.ts       # Manajemen mata kuliah, kelas, sesi/pertemuan, materi
│   │   │   ├── assessment.ts     # Kuis (8 tipe soal), tugas terstruktur, submisi jawaban
│   │   │   ├── grades.ts         # Mesin kalkulasi nilai, bobot kategori, publikasi rekap
│   │   │   ├── attendance.ts     # Sesi presensi, check-in GPS/kode, rekap kehadiran
│   │   │   ├── files.ts          # Integrasi UAY File Service & tiket unduhan aman
│   │   │   ├── system-announcements.ts # Pengumuman universitas & edaran akademik
│   │   │   ├── rector-bridge.ts  # Endpoint integrasi telemetri Rektor
│   │   │   ├── imports.ts        # Impor massal CSV/XLSX (peserta, soal, nilai)
│   │   │   └── rector/           # Analitika & waterfall aktivitas pengajaran dosen
│   │   └── tsconfig.json
│   │
│   └── web/                      # Frontend React Application (Modular Clean Architecture)
│       ├── src/
│       │   ├── main.tsx          # Client route dispatcher & app bootstrapping
│       │   ├── components/       # Komponen antarmuka terpisah sesuai domain
│       │   │   ├── ui/           # Komponen UI primitif (Modal, Form, Action, Badge, Field, Pagination, FileUpload, Notice, Loading, ScoreInput)
│       │   │   ├── layout/       # Komponen tata letak (Brand, LoginButton, PublicShell, AuthShell)
│       │   │   └── class/        # Subkomponen kelas (Participants, QuestionBanks, Files, Audit, ClassModals)
│       │   ├── services/         # Layer komunikasi API & layanan berkas
│       │   │   ├── api.ts        # Client API uay, token handling, idempotency, unggah berkas
│       │   │   └── excel.ts      # Parser CSV/Excel & generator ekspor spreadsheet
│       │   ├── contexts/         # React Contexts global (ConfirmContext, DraftContext)
│       │   ├── hooks/            # Custom React hooks (useApi, usePagination)
│       │   ├── types/            # Definisi TypeScript domain frontend (CurrentUser, Course, CourseClass, Role)
│       │   ├── pages/            # Halaman independen (Landing, Dashboard, Catalog, Profile)
│       │   ├── rector/           # Dashboard pemantauan Rektor & timeline visual
│       │   ├── ClassPage.tsx     # Ruang kelas utama (orkestrator tab materi, presensi, nilai)
│       │   ├── Content.tsx       # Editor materi kaya 11 blok & viewer materi mahasiswa
│       │   ├── Assessment.tsx    # Halaman pengerjaan kuis, submisi tugas & antarmuka nilai
│       │   ├── Gradebook.tsx     # Matriks rekap nilai, pengaturan bobot & ekspor Excel
│       │   ├── Attendance.tsx    # Antarmuka presensi mahasiswa & dosen
│       │   ├── AnnouncementsPage.tsx # Portal pengumuman resmi & edaran
│       │   ├── lib.tsx           # Compatibility barrel layer (re-export services, hooks, ui)
│       │   └── ui.tsx            # Komponen layout lama, avatars, navigasi & breadcrumbs
│       └── vite.config.ts
│
├── packages/
│   ├── shared/                   # Kode bersama API & Frontend
│   │   ├── src/
│   │   │   ├── permissions.ts    # Matriks RBAC resmi & fungsi verifikasi wewenang
│   │   │   ├── domain.ts         # Preset skala nilai (2026.1/2024.1), definisi tipe
│   │   │   ├── files.ts          # Validasi batas ukuran & ekstensi unggahan
│   │   │   ├── time.ts           # Formatting tanggal & zona waktu perangkat
│   │   │   ├── urls.ts           # Canonical URL & deep link builders
│   │   │   └── sso.ts            # Tipe peran aplikasi & normalisasi klaim Keycloak
│   │
│   └── db/                       # Definisi Basis Data
│       ├── prisma/
│       │   └── schema.prisma     # Skema relational Prisma (PostgreSQL)
│       ├── seed.ts               # Seeder data demonstrasi awal
│       └── seed-lab.ts           # Seeder pengujian skenario kompleks
│
├── docs/                         # Dokumentasi Resmi & Regulasi
│   ├── Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf # Matriks Hak Akses Resmi
│   ├── BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md       # Buku Manual Pengguna
│   ├── IMPLEMENTATION.md         # Catatan audit & bukti kepatuhan fitur
│   ├── RECTOR-INTEGRATION.md     # Panduan integrasi dashboard Rektor
│   └── PANDUAN-PENGUJIAN.md      # Skenario pengujian QA manual
│
├── tests/                        # Automated Test Suites
│   ├── permissions-matrix.test.ts # Tes wewenang RBAC & proteksi penilaian
│   ├── rector-reporting.test.ts   # Tes analitika akademik & waterfall dosen
│   ├── policy-consistency.test.ts # Tes konsistensi skala nilai & zona waktu
│   └── integration/              # Tes integrasi HTTP dengan mock DB
│
├── scripts/                      # Skrip Otomatisasi & Deployment
│   ├── dev.mjs                   # Launcher lingkungan lokal lengkap
│   ├── database.mjs              # Pengelola embedded PostgreSQL
│   ├── oidc-fixture.mjs          # Server mock Keycloak SSO lokal
│   ├── file-service.mjs          # Server mock UAY File Service lokal
│   └── generate-role-matrix-pdf.mjs # Generator dokumen PDF matriks wewenang
│
├── deployment/                   # Konfigurasi Server Produksi (Nginx, PM2, Docker)
├── .env.example                  # Template variabel lingkungan
└── package.json                  # Dependensi monorepo & skrip build/test
```

---

## 3. Tata Kelola Peran & Wewenang (RBAC Rules)

Sistem menerapkan **Role-Based Access Control (RBAC)** ketat yang membagi pengguna menjadi 5 peran akademik resmi:

```
                      ┌──────────────────────┐
                      │     SUPER_ADMIN      │ (Katalog, Pengaturan, Akun Sistem)
                      └──────────┬───────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
   │     RECTOR     │   │DEPARTMENT_ADMIN│   │   INSTRUCTOR   │
   │ (Pemantauan    │   │ (Admin Prodi - │   │ (Dosen Pengampu│
   │  Akademik Murni│   │  Bantuan Materi│   │  Pemberi Nilai │
   │  & Pengumuman) │   │  Tanpa Nilai)  │   │  Tunggal)      │
   └────────────────┘   └────────────────┘   └────────┬───────┘
                                                      │
                                                      ▼
                                             ┌────────────────┐
                                             │    STUDENT     │
                                             │ (Mahasiswa -   │
                                             │  Pembelajaran) │
                                             └────────────────┘
```

### Matriks Hak Akses Utama
| Fitur / Modul | SUPER_ADMIN | RECTOR | DEPARTMENT_ADMIN | INSTRUCTOR | STUDENT |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Katalog & Kurikulum** | Penuh (Semua) | — | Sesuai Prodi (`scopes`) | Lihat Saja | Lihat Saja |
| **Pembuatan Kelas Baru** | Penuh (Semua) | — | Sesuai Prodi (`scopes`) | Sesuai Penugasan | — |
| **Kelola Konten (Materi, Sesi)** | — *(Read Only)* | — | **Bisa (Bantuan Prodi)** | **Penuh (Pengampu)** | Pelajari |
| **Kelola Bank Soal** | — *(Read Only)* | — | **Bisa (Bantuan Prodi)** | **Penuh (Pengampu)** | — |
| **Penyusunan Kuis & Tugas** | — *(Read Only)* | — | **Bisa (Draf Soal)** | **Penuh (Pengampu)** | Kerjakan |
| **Pemberian Nilai (Grading)** | ❌ Ditolak | ❌ Ditolak | ❌ **DITOLAK (403)** | ✅ **Eksklusif Dosen** | Lihat Milik Sendiri |
| **Atur Bobot & Terbitkan Nilai**| ❌ Ditolak | ❌ Ditolak | ❌ **DITOLAK (403)** | ✅ **Eksklusif Dosen** | Lihat Hasil Terbit |
| **Pantau Rekap Nilai & Ekspor** | Ekspor Semua | — | **Ekspor Prodi** | **Ekspor Kelas** | Transkrip Pribadi |
| **Pemantauan Rektor (`/rector`)**| ✅ Akses | ✅ **Utama** | — | — | — |
| **Pengumuman Universitas** | Buat Global | **Baca** | Buat Prodi & Baca | Baca | Baca |

### Aturan Emas: "Bantuan Konten Prodi Tanpa Hak Nilai"
1. **Admin Prodi (`DEPARTMENT_ADMIN`)** diizinkan membantu dosen yang berhalangan untuk:
   - Membuat/mengatur sesi pertemuan dan RPS.
   - Mengunggah modul, materi bacaan, video materi, dan tautan referensi.
   - Mengelola bank soal prodi dan mendistribusikannya ke kuis.
   - Menyusun instruksi tugas dan parameter batas waktu.
   - Membantu menjadwalkan sesi presensi perkuliahan.
2. **Larangan Keras Penilaian bagi Admin Prodi**:
   - Admin Prodi **TIDAK BISA** dan **DILARANG KERAS** menilai jawaban esai mahasiswa (`POST /attempts/:id/grades`).
   - Admin Prodi **TIDAK BISA** menilai unggahan tugas (`POST /submissions/:id/grade`).
   - Admin Prodi **TIDAK BISA** memublikasikan nilai kuis/tugas (`POST /.../publish-grades`).
   - Admin Prodi **TIDAK BISA** mengubah bobot kategori nilai (`PUT /.../grade-categories`).
   - Admin Prodi **TIDAK BISA** memasukkan nilai koreksi manual (`POST /.../manual-grades`).
   - Admin Prodi **TIDAK BISA** menyimpan draf atau mengunci nilai akhir (`POST /.../gradebook/calculate` & `publish`).
   - Pelanggaran terhadap endpoint di atas otomatis memicu respons HTTP `403` dengan kode error:
     ```json
     { "error": { "code": "ONLY_INSTRUCTOR_CAN_GRADE", "message": "Pemberian nilai merupakan wewenang eksklusif dosen pengampu." } }
     ```

### Mekanisme Keamanan Berlapis (Defense-in-Depth)
Implementasi izin dijamin di 4 lapisan independen:
1. **Middleware Gateway** ([`apps/api/src/index.ts`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/apps/api/src/index.ts)): Melakukan regex intercepting pada seluruh rute penilaian dan menolak `DEPARTMENT_ADMIN` serta peran non-dosen.
2. **Access Control Layer** ([`apps/api/src/core.ts`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/apps/api/src/core.ts)): Fungsi `classAccess()` memvalidasi `canManage` berdasarkan relasi dosen pengampu kelas atau `user.departmentScopes.includes(course.departmentCode)`.
3. **Endpoint Handlers** ([`apps/api/src/grades.ts`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/apps/api/src/grades.ts) & [`apps/api/src/assessment.ts`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/apps/api/src/assessment.ts)): Validasi eksplisit `ensure(req.context.user.role === "INSTRUCTOR", 403, "ONLY_INSTRUCTOR_CAN_GRADE")`.
4. **Antarmuka Web** ([`apps/web/src/Gradebook.tsx`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/apps/web/src/Gradebook.tsx) & [`Assessment.tsx`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/apps/web/src/Assessment.tsx)): Pemisahan state `canEdit` (soal/instruksi) dan `canGrade` (tombol penilaian), serta rendering Gradebook mode hanya-baca & ekspor bagi Admin Prodi.

---

## 4. Mesin Penilaian & Rekap Hasil Belajar (Gradebook)

### Formula Perhitungan Nilai Akhir
Nilai akhir mahasiswa dikalkulasikan secara otomatis berdasarkan agregasi kategori nilai:

$$\text{FinalScore} = \sum_{i=1}^{n} \left( \text{CategoryScore}_i \times \frac{\text{WeightPercent}_i}{100} \right)$$

- **Total Bobot Wajib 100%**: Jika total `weightPercent` kategori tidak sama persis dengan `100`, kalkulasi dan publikasi nilai akhir ditolak dengan pesan error `WEIGHTS_TOTAL`.
- **Sumber Nilai Kategori (`sourceType`)**:
  - `QUIZ`: Rata-rata atau skor tertinggi dari kuis yang ditugaskan ke kategori tersebut.
  - `ASSIGNMENT`: Nilai tugas terstruktur yang sudah dipublikasikan dosen.
  - `ATTENDANCE`: Persentase kehadiran mahasiswa dari total pertemuan wajib.
  - `MANUAL`: Nilai yang diinput secara manual oleh dosen (misalnya Ujian Praktik atau Keaktifan).

### Skala Nilai Huruf (Grade Scale Preset `2026.1`)
Sistem secara default menggunakan skala nilai standar UAY tahun ajaran berjalan:
| Rentang Nilai Angka | Nilai Huruf | Bobot Indeks (Grade Point) | Keterangan |
| :---: | :---: | :---: | :---: |
| $\ge 85.00$ | **A** | $4.00$ | Sangat Baik (Istimewa) |
| $80.00 - 84.99$ | **A-** | $3.75$ | Sangat Baik |
| $75.00 - 79.99$ | **B+** | $3.25$ | Baik Sekali |
| $70.00 - 74.99$ | **B** | $3.00$ | Baik |
| $65.00 - 69.99$ | **B-** | $2.75$ | Cukup Baik |
| $60.00 - 64.99$ | **C+** | $2.25$ | Lebih dari Cukup |
| $55.00 - 59.99$ | **C** | $2.00$ | Cukup |
| $40.00 - 54.99$ | **D** | $1.00$ | Kurang |
| $< 40.00$ | **E** | $0.00$ | Gagal |

### Siklus Hidup & Kunci Nilai (Locking Policy)
1. **Draf**: Dosen dapat menyimpan draf (`SAVE_GRADE_DRAFT`). Pada tahap ini mahasiswa belum dapat melihat rekap nilai akhir.
2. **Publikasi**: Dosen mempublikasikan rekap nilai (`PUBLISH_GRADEBOOK`). Mahasiswa menerima notifikasi dan dapat melihat hasil belajarnya di halaman kelas.
3. **Penguncian Permanen**: Setelah dipublikasikan, record nilai dikunci (`isLocked = true`).
4. **Koreksi Nilai**: Apabila terdapat revisi nilai setelah publikasi, sistem mewajibkan pengisian alasan revisi minimal 5 karakter (`CORRECTION_REASON_REQUIRED`). Setiap koreksi dicatat dalam riwayat audit log universitas secara permanen.

---

## 5. Kebijakan Penyimpanan Berkas (Zero-Binary Storage)

E-Learning UAY menerapkan kebijakan **Zero-Binary Storage** pada database relasional:
- Database PostgreSQL **hanya menyimpan metadata berkas** (UUID, nama berkas, ekstensi, MIME type, ukuran bytes, SHA-256 hash, dan status pemindaian antivirus).
- Biner fisik berkas (PDF, video, gambar, arsip tugas) dikelola secara terpusat oleh **UAY File Service**.
- **Tiket Unduhan Aman (Download Ticket)**:
  - Mahasiswa dan dosen tidak pernah mengakses berkas melalui direct URL publik permanen.
  - Saat pengguna mengeklik tautan berkas, frontend meminta tiket sementara via `POST /api/v1/files/:id/download-ticket`.
  - Tiket ini bertanda tangan kriptografis dengan waktu kedaluwarsa pendek (default: 60 detik) untuk mencegah peredaran tautan materi berhak cipta ke luar sistem.

---

## 6. Autentikasi SSO & Mode Pengembangan

### OpenID Connect (OIDC) Keycloak
- Menggunakan endpoint standar `.well-known/openid-configuration`.
- Alur masuk menggunakan **Authorization Code Flow dengan PKCE (Proof Key for Code Exchange)**.
- Token ditukar di sisi backend API; browser hanya menyimpan cookie sesi opaque bertanda tangan (`uay_session`).
- Kredensial password mahasiswa/dosen dikelola sepenuhnya oleh server SSO universitas (`sso.uay.ac.id`), E-Learning **tidak pernah menyimpan kata sandi**.

### Akun Demonstrasi Lokal (Local SSO Fixture)
Saat menjalankan `npm run dev`, Anda dapat memilih langsung akun pengujian pada landing page SSO lokal:
| Akun Fixture | Peran | Cakupan / Hak Istimewa |
| :--- | :--- | :--- |
| **`superadmin`** | `SUPER_ADMIN` | Administrator Universitas (Semua Katalog & Pengaturan) |
| **`rector`** | `RECTOR` | Rektor (Dashboard Pemantauan `/rector` & Pengumuman) |
| **`admin_prodi_if`**| `DEPARTMENT_ADMIN` | Admin Prodi Teknik Informatika (`departmentScopes: ["IF"]`) |
| **`dosen_if`** | `INSTRUCTOR` | Dosen Pengampu Kelas Pemrograman Web |
| **`mahasiswa_1`** | `STUDENT` | Mahasiswa Terdaftar di Kelas Contoh |

---

## 7. Panduan Memulai Cepat (Quick Start in 3 Minutes)

### 1. Prasyarat
- Node.js versi `22.12.0` atau lebih baru (`node -v`).
- npm versi `10` atau lebih baru (`npm -v`).
- Git.

### 2. Instalasi & Menjalankan
```powershell
# 1. Klon repositori
git clone https://github.com/UAY-System/e-learning.git
cd "E - Learning UAY"

# 2. Instalasi dependensi monorepo
npm ci

# 3. Generate Prisma ORM client
npm run db:generate

# 4. Jalankan seluruh layanan lokal
npm run dev
```

### 3. Membuka Aplikasi
1. Buka browser ke alamat: **`http://127.0.0.1:5173/`**.
2. Klik tombol **"Masuk dengan SSO UAY"**.
3. Pilih salah satu akun contoh (misalnya `dosen_if` untuk mencoba mengajar, atau `admin_prodi_if` untuk mencoba fitur bantuan prodi).

---

## 8. Alur Kerja Pengembang (Developer Workflows & Quality Gates)

Setiap perubahan kode **wajib** lolos 3 gerbang kualitas sebelum dilakukan commit atau pull request:

```powershell
# 1. Verifikasi tipe TypeScript (API & Web)
npm run typecheck

# 2. Eksekusi seluruh automated test suite (87+ tes)
npm test

# 3. Verifikasi build produksi Vite frontend
npm run build:web
```

### Daftar Perintah npm yang Tersedia
| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan seluruh stack lokal (Vite, API, DB, SSO, File Service) |
| `npm run build` | Menjalankan Prisma generate, typecheck, dan kompilasi build produksi |
| `npm run build:web` | Mengompilasi frontend React ke `apps/web/dist` |
| `npm run build:api` | Mengompilasi backend Express ke `apps/api/dist` |
| `npm run typecheck` | Menjalankan `tsc --noEmit` untuk `apps/api` dan `apps/web` |
| `npm test` | Menjalankan seluruh unit & domain tests (sangat cepat, in-memory) |
| `npm run test:integration` | Menjalankan tes integrasi HTTP end-to-end dengan database uji |
| `npm run db:generate` | Memperbarui Prisma Client setelah perubahan `schema.prisma` |
| `npm run db:migrate` | Menerapkan migrasi database Prisma ke PostgreSQL |
| `npm run db:reset` | Mereset dan mengisi ulang database lokal dengan data seed baru |
| `npm run format` | Memformat kode menggunakan Prettier sesuai standar proyek |
| `npm run docs:guide` | Mengekspor pembaruan konten Buku Panduan HTML/Markdown |

---

## 9. Jebakan Umum & Panduan Solusi (Troubleshooting / Gotchas)

### ⚠️ 1. EPERM Lock pada File Prisma Engine di Windows
**Gejala:** Muncul error `EPERM: operation not permitted, unlink '...query_engine-windows.dll.node'` saat menjalankan `npm run build` atau `npm run db:generate`.
**Penyebab:** Pada sistem operasi Windows, file binary DLL Prisma dikunci oleh proses Node.js yang sedang berjalan (`npm run dev` atau API server).
**Solusi:** Hentikan sementara terminal `npm run dev` (atau jalankan `taskkill /F /IM node.exe` di PowerShell) sebelum melakukan build atau migrasi database.

### ⚠️ 2. Masalah Port Konflik (EADDRINUSE)
**Gejala:** Muncul pesan `Error: listen EADDRINUSE: address already in use :::3000` atau `:::55432`.
**Solusi:** Cari proses yang menempati port tersebut dan hentikan:
```powershell
# Cari PID proses (contoh port 3000):
netstat -ano | findstr :3000
# Hentikan proses berdasarkan PID:
taskkill /F /PID <PID_TERSEBUT>
```

### ⚠️ 3. Format Tanggal & Zona Waktu (WITA / UTC+8)
- Basis data **selalu menyimpan timestamp dalam format ISO-8601 UTC** (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- Frontend secara otomatis memformat tampilan tanggal dan jam sesuai zona waktu perangkat pengguna dengan label eksplisit (misalnya `14:30 WITA` atau `GMT+8`).
- Jangan pernah melakukan *hardcode* penambahan jam manual (`+ 8 jam`) pada logika query backend, karena fungsi utilitas di [`packages/shared/src/time.ts`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/packages/shared/src/time.ts) telah mengelola konversi IANA time zone secara presisi.

### ⚠️ 4. Mode Redis (In-Memory Fallback)
Grace sebelumnya dipertahankan, termasuk pada `NODE_ENV=production` dan `DEMO_MODE=false`. Redis yang belum diisi atau tidak tersedia memakai memori per proses; kondisi tersebut dicatat pada log dan health sebagai degraded. `SSO_WEBHOOK_SECRET` boleh belum diisi, tetapi endpoint pencabutan akun tetap mengembalikan 503 sampai secret tersedia. Health menghasilkan 503 ketika PostgreSQL gagal. Memori tidak dibagikan antar-worker dan data sesi hilang setelah restart. Rincian konfigurasi dan bukti penerimaan ada di [laporan kesiapan](docs/qa/PRODUCTION-READINESS.md).

---

## 10. Prosedur Produksi & Deployment VPS (Hostinger / Ubuntu)

Aplikasi dipersiapkan untuk berjalan pada VPS Linux menggunakan reverse-proxy Nginx dan process manager PM2.

### Struktur Layanan di Server VPS
1. **Frontend Static Dist**: Berkas hasil `npm run build:web` diletakkan di `/var/www/elearning-uay/dist` dan dilayani langsung oleh Nginx dengan HTTP caching optimal.
2. **Backend API Process**: Dikelola oleh PM2 menggunakan konfigurasi [`ecosystem.config.cjs`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/ecosystem.config.cjs) di port internal `3001`.
3. **Nginx Reverse Proxy**: Mengarahkan lalu lintas HTTPS `https://e-learning.uay.ac.id/api/*` ke API backend port `3001`.

### Perintah Pembaruan Versi di VPS (Deploy Update)
```bash
# Masuk ke direktori aplikasi di VPS
cd /var/www/elearning-uay

# Tarik perubahan kode terbaru dari Git
git pull origin main

# Instal dependensi dan kompilasi
npm ci --production=false
npm run db:generate
npm run db:migrate
npm run build

# Muat ulang aplikasi Node.js tanpa downtime (Zero-Downtime Reload)
npm run reload:prod
```

### Backup & Pemulihan Database Produksi
```bash
# Backup manual database PostgreSQL:
pg_dump -U uay_admin -d elearning -F c -b -v -f "/backup/elearning_$(date +%Y%m%d_%H%M%S).dump"

# Restore database dari berkas dump:
pg_restore -U uay_admin -d elearning -v "/backup/nama_file_backup.dump"
```

---

## 11. Kontak & Referensi Dokumen Terkait

- **Dokumen Matriks Hak Akses Resmi (PDF)**: [`docs/architecture/Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/docs/architecture/Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf)
- **Buku Panduan Penggunaan Lengkap**: [`docs/guides/BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/docs/guides/BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md)
- **Panduan Integrasi Telemetri Rektor**: [`docs/integrations/rector/RECTOR-INTEGRATION.md`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/docs/integrations/rector/RECTOR-INTEGRATION.md)
- **Status & Bukti Implementasi Teknis**: [`docs/architecture/IMPLEMENTATION.md`](file:///e:/UVAYA/Project/E%20-%20Learning%20UAY/docs/architecture/IMPLEMENTATION.md)

*(Dokumen ini diperbarui secara berkala seiring penambahan kapabilitas sistem E-Learning UAY)*
