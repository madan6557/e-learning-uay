# DOKUMEN DESAIN TEKNIS (TECHNICAL DESIGN DOCUMENT)
# PLATFORM E-LEARNING UNIVERSITAS ACHMAD YANI (UAY) — VERSI 2.0
**Fokus**: Arsitektur Teknis, Integrasi SSO & File Service, Dynamic Resource Engine (Perkuliahan & Praktikum), Pelacakan Progress Belajar Granular, Audit Log State Snapshot, Pembobotan Nilai Otomatis, Sistem Umpan Balik & Konfirmasi (Feedback/Blocker Engine), Boundary Value Analysis (BVA), dan Cause-Effect Matrix.

---

##  PANDUAN PENELAAHAN MULTI-DISIPLIN (REVIEW GUIDE)
Dokumen ini disusun secara terstruktur agar mudah dipahami dan ditelaah bersama oleh 4 pemangku kepentingan utama:
1. **Product Owner (PO)**: Fokus pada *Bab 1 (Gambaran Sistem)*, *Bab 3 (Pembagian Fitur & Aturan Bisnis)*, *Sub-bab 3.5 (Pembobotan Nilai Otomatis)*, *Sub-bab 3.8 (Konfirmasi & Feedback Sistem)*, dan *Bab 9 (Risiko & Keputusan)*.
2. **Software Developer (Dev)**: Fokus pada *Bab 2 (Arsitektur & Integrasi)*, *Bab 4 (Hierarki Modul Polimorfik)*, *Bab 5 (Skema Database Prisma & Aturan Otorisasi)*, dan *Bab 6 (Tech Stack)*.
3. **Quality Assurance (QA)**: Fokus pada *Bab 8 (Matriks Boundary Value Analysis & Matriks Cause-Effect)*, kriteria penerimaan, penanganan kasus batas (*edge cases*), dan pesan respon kendala (*blocker handling*).
4. **Teknisi Server / DevOps / Sysadmin**: Fokus pada *Bab 2 (Topologi Jaringan)*, *Bab 7 (Topologi Docker Single-VPS, Nginx Reverse Proxy, SSL, Rate Limiting, dan Prosedur Backup Otomatis)*.

---

## DAFTAR ISI
- [**Bab 1: Gambaran Sistem**](#bab-1-gambaran-sistem)
  - [1.1 Ringkasan Platform dan Tujuan](#11-ringkasan-platform-dan-tujuan)
  - [1.2 Aktor dan Batasan Tanggung Jawab](#12-aktor-dan-batasan-tanggung-jawab)
  - [1.3 Ekosistem Tiga Aplikasi dan Kepemilikan Data (Service Boundary)](#13-ekosistem-tiga-aplikasi-dan-kepemilikan-data-service-boundary)
- [**Bab 2: Arsitektur Sistem dan Penyelarasan Integrasi**](#bab-2-arsitektur-sistem-dan-penyelarasan-integrasi)
  - [2.1 Diagram Arsitektur Komponen dan Jaringan](#21-diagram-arsitektur-komponen-dan-jaringan)
  - [2.2 Penyelarasan Integrasi SSO / Identity (OIDC & Token Claims)](#22-penyelarasan-integrasi-sso-identity-oidc-token-claims)
  - [2.3 Penyelarasan Integrasi File Service (Presigned URLs, ACL & 7-Day Trash)](#23-penyelarasan-integrasi-file-service-presigned-urls-acl-7-day-trash)
  - [2.4 Keandalan Antar-Layanan (Cross-Service Reliability & Circuit Breaker)](#24-keandalan-antar-layanan-cross-service-reliability-circuit-breaker)
- [**Bab 3: Pembagian Aplikasi dan Rincian Fitur**](#bab-3-pembagian-aplikasi-dan-rincian-fitur)
  - [3.1 Modul Utama E-Learning dan Strategi Rilis Prioritas (P0, P1, P2)](#31-modul-utama-e-learning-dan-strategi-rilis-prioritas-p0-p1-p2)
    - [3.1.1 Matriks Keterlacakan Kebutuhan Resmi (RTM)](#311-matriks-keterlacakan-kebutuhan-resmi-requirements-traceability-matrix---rtm)
    - [3.1.2 Mekanisme Duplikasi Kelas (Course Cloning) dan Pengarsipan Angkatan](#312-mekanisme-duplikasi-kelas-course-cloning-dan-pengarsipan-angkatan)
  - [3.2 Dynamic Resource Management Engine (Perkuliahan, Praktikum, Seminar, Workshop)](#32-dynamic-resource-management-engine-perkuliahan-praktikum-seminar-workshop)
    - [3.2.1 Arsitektur Sistem Editor Konten Berbasis Blok (Notion-Style Block Engine)](#321-arsitektur-sistem-editor-konten-berbasis-blok-notion-style-block-engine)
  - [3.3 Modul Penilaian, Kuis Multi-Tipe, Tugas, dan Gradebook](#33-modul-penilaian-kuis-multi-tipe-tugas-dan-gradebook)
    - [3.3.1 Mesin Import Massal Berbasis Template Excel/CSV (Bulk Import & Reconciliation Engine)](#331-mesin-import-massal-berbasis-template-excelcsv-bulk-import--reconciliation-engine)
    - [3.3.2 Rincian Lengkap 8 Tipe Soal Kuis dan Evaluasi](#332-rincian-lengkap-8-tipe-soal-kuis-dan-evaluasi-comprehensive-question-types)
    - [3.3.3 Mesin Pembobotan Kustom Butir Soal Kuis dan Normalisasi Skala 100](#333-mesin-pembobotan-kustom-butir-soal-kuis-dan-normalisasi-skala-100-custom-question-weighting-engine)
    - [3.3.4 Alur Penilaian Soal Essay dan Sistem Skoring Hibrida](#334-alur-penilaian-soal-essay-dan-sistem-skoring-hibrida-hybrid-auto-manual-grading-workflow)
  - [3.4 Modul Pembobotan Nilai Otomatis & Kalkulasi Nilai Akhir](#34-modul-pembobotan-nilai-otomatis-kalkulasi-nilai-akhir)
  - [3.5 Mesin Pelacakan Progress Belajar Rinci (Granular Learning Progress Engine)](#35-mesin-pelacakan-progress-belajar-rinci-granular-learning-progress-engine)
  - [3.6 Sistem Audit Log Mendalam (Before-After State Change Capture)](#36-sistem-audit-log-mendalam-before-after-state-change-capture)
  - [3.7 Standar Umpan Balik Sistem, Konfirmasi Aksi, dan Penanganan Kendala (Feedback & Blocker Engine)](#37-standar-umpan-balik-sistem-konfirmasi-aksi-dan-penanganan-kendala-feedback-blocker-engine)
    - [3.7.1 Mesin Penyimpanan Draf Lokal, Pemulihan Otomatis, dan Manajemen Eviksi Penyimpanan](#371-mesin-penyimpanan-draf-lokal-pemulihan-otomatis-dan-manajemen-eviksi-penyimpanan-client-side-draft-caching--storage-eviction-engine)
- [**Bab 4: Diagram Modul dan Dynamic Resource Hierarchy**](#bab-4-diagram-modul-dan-dynamic-resource-hierarchy)
  - [4.1 Diagram Hierarki Modul Pembelajaran](#41-diagram-hierarki-modul-pembelajaran)
  - [4.2 Desain Polimorfik, Pengurutan Dinamis, dan Kriteria Penyelesaian Aktivitas](#42-desain-polimorfik-pengurutan-dinamis-dan-kriteria-penyelesaian-aktivitas)
- [**Bab 5: Rancangan Data Umum (ERD dan Skema Database Lengkap)**](#bab-5-rancangan-data-umum-erd-dan-skema-database-lengkap)
  - [5.1 Diagram Relasi Entitas (ERD)](#51-diagram-relasi-entitas-erd)
  - [5.2 Skema Database Relasional (Prisma / PostgreSQL Schema)](#52-skema-database-relasional-prisma-postgresql-schema)
  - [5.3 Aturan Proteksi Data dan Otorisasi Berbasis Kelas (Row-Level Authorization)](#53-aturan-proteksi-data-dan-otorisasi-berbasis-kelas-row-level-authorization)
- [**Bab 6: Tech Stack dan Justifikasi Teknis**](#bab-6-tech-stack-dan-justifikasi-teknis)
  - [6.1 Rekomendasi Teknologi](#61-rekomendasi-teknologi)
  - [6.2 Matriks Pertimbangan dan Efisiensi Tim 2 Developer](#62-matriks-pertimbangan-dan-efisiensi-tim-2-developer)
  - [6.3 Standar Rekayasa Perangkat Lunak & Konvensi Kode (100% English)](#63-standar-rekayasa-perangkat-lunak-dan-konvensi-kode-engineering-standards--100-english-codebase)
- [**Bab 7: Server, Deployment, dan State Machines**](#bab-7-server-deployment-dan-state-machines)
  - [7.1 Topologi Server (Single-VPS Pilot menuju Multi-Container Scaling)](#71-topologi-server-single-vps-pilot-menuju-multi-container-scaling)
    - [7.1.1 Arsitektur Dual-Environment (Live Dev & Production)](#711-arsitektur-dual-environment-live-development-server--production-vps)
    - [7.1.2 Berkas Konfigurasi Standar Docker & Nginx](#712-berkas-konfigurasi-standar-docker--nginx)
  - [7.2 Strategi Backup Otomatis dan Disaster Recovery](#72-strategi-backup-otomatis-dan-disaster-recovery)
  - [7.3 Diagram Mesin Status (State Transition Diagrams)](#73-diagram-mesin-status-state-transition-diagrams)
- [**Bab 8: Rencana Pengembangan, Boundary Value Analysis (BVA), dan Cause-Effect Analysis**](#bab-8-rencana-pengembangan-boundary-value-analysis-bva-dan-cause-effect-analysis)
  - [8.1 Matriks Boundary Value Analysis (BVA) dan Penanganan Edge Cases](#81-matriks-boundary-value-analysis-bva-dan-penanganan-edge-cases)
  - [8.2 Matriks Cause-Effect Analysis (Event-Driven State Changes)](#82-matriks-cause-effect-analysis-event-driven-state-changes)
  - [8.3 Rencana Pengembangan Bertahap (Vertical Slice Stages)](#83-rencana-pengembangan-bertahap-vertical-slice-stages)
- [**Bab 9: Pertanyaan Terbuka, Manajemen Risiko, dan Sign-Off Product Owner**](#bab-9-pertanyaan-terbuka-manajemen-risiko-dan-sign-off-product-owner)
  - [9.1 Register Risiko Teknis dan Mitigasi](#91-register-risiko-teknis-dan-mitigasi)
  - [9.2 Asumsi Operasional Sistem](#92-asumsi-operasional-sistem)
  - [9.3 Tabel Rekomendasi Developer dan Keputusan Product Owner](#93-tabel-rekomendasi-developer-dan-keputusan-product-owner)

---

# BAB 1: GAMBARAN SISTEM

## 1.1 Ringkasan Platform dan Tujuan
Platform Pembelajaran Digital Universitas Achmad Yani (E-Learning UAY) dibangun sebagai sistem inti (*core academic learning engine*) yang mendukung seluruh aktivitas belajar-mengajar di lingkungan kampus UAY. Sistem ini tidak hanya melayani perkuliahan teori reguler, tetapi juga dirancang secara modular dan dinamis untuk memfasilitasi kegiatan praktikum laboratorium, responsi, seminar/sidang tugas akhir, hingga pelatihan/workshop akademik.

Tujuan utama pengembangan platform ini adalah:
1. Menyediakan lingkungan belajar yang terstruktur, fleksibel, responsif, dan mudah digunakan oleh mahasiswa maupun dosen.
2. Memfasilitasi manajemen konten pembelajaran yang dinamis dan polimorfik (teks, dokumen, video, dataset praktikum, repositori kode, simulator virtual lab, dan telekonferensi).
3. Melacak progres belajar mahasiswa secara sangat rinci (*granular tracking*) hingga tingkat detik tontonan video dan halaman modul yang telah dipelajari.
4. Menyediakan sistem pembobotan nilai otomatis (*automated grade weighting*) sehingga pengajar tidak perlu menghitung nilai akhir secara manual.
5. Menjamin kejelasan interaksi melalui sistem umpan balik instan (*real-time system feedback*) yang memberikan konfirmasi keberhasilan, pesan error yang solutif, serta penjelasan kendala (*blocker reasons*) yang eksplisit.
6. Menjamin integritas akademik melalui pencatatan audit log komprehensif (*before-after state snapshot*) pada seluruh mutasi data kritis.

## 1.2 Aktor dan Batasan Tanggung Jawab
Sistem E-Learning UAY mendefinisikan 4 aktor utama dengan pemisahan wewenang yang tegas:

| Aktor | Peran Utama | Lingkup Wewenang (*Scope*) | Tanggung Jawab Kunci |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Administrator Sistem Institusi | Global (Seluruh Sistem) | Mengelola konfigurasi platform, pemantauan audit log institusi, manajemen akun darurat, dan manajemen mata kuliah induk (*Course*). |
| **Admin Prodi / Lab** | Administrator Program Studi / Laboratorium | Tingkat Program Studi / Lab | Membuat mata kuliah (*Course*), membuka kelas rombel (*Course Class*), menetapkan dosen pengampu/asisten lab, dan mengelola pendaftaran peserta (*Enrollment*). |
| **Pengajar / Dosen / Asisten Lab** | Instruktur Pembelajaran | Kelas yang Ditugaskan (*Assigned Classes*) | Menyusun pertemuan (*Section*), mengunggah materi & aset praktikum, membuat kuis & bank soal, mengelola tugas & tenggat, mengatur skema pembobotan nilai, menilai essay, dan mempublikasikan Gradebook. |
| **Mahasiswa / Peserta** | Peserta Pembelajaran | Kelas yang Diikuti (*Enrolled Classes*) | Mempelajari materi teks/slide/video, mengunduh modul & dataset praktikum, mengerjakan kuis, mengumpulkan tugas (dengan riwayat versi), memantau progres belajar mandiri, dan melihat nilai resmi. |

## 1.3 Ekosistem Tiga Aplikasi dan Kepemilikan Data (Service Boundary)
Platform digital UAY terdiri dari 3 aplikasi independen yang berkomunikasi melalui API contract:

```
[ Pengguna / Browser Client ]
       │                     │                      │
       │ (1) Login OIDC      │ (2) Operasional App  │ (3) Direct Upload/Download
       ▼                     ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   SSO Service    │  │ E-Learning Engine│  │     File Service     │
│ (Identity & Auth)│  │ (Academic Core)  │  │ (Storage & Security) │
└──────────────────┘  └──────────────────┘  └──────────────────────┘
       │                      ▲                     ▲
       │ JWT Token Validation │                     │
       └──────────────────────┴─────────────────────┘
              Server-to-Server / Signed Ticket URL
```

### Prinsip Kepemilikan Data (Data Ownership & Zero-Binary Storage):
1. **SSO / Identity Service**:
   - Pemilik data kredensial (username/email/password), hash kata sandi, multi-factor authentication, status akun aktif/nonaktif, dan peran identitas global (*Global Role*).
   - E-Learning **TIDAK** menyimpan password pengguna, melainkan hanya menyimpan referensi `externalSubjectId` (UUID) dan menyalin profil dasar (`nim`/`nidn`, nama, email) untuk kebutuhan tampilan lokal.
2. **File Service**:
   - Pemilik berkas fisik (*binary object storage*), metadata teknis file (checksum SHA-256, ukuran bytes, MIME type), pemindaian virus/malware, proteksi akses privat, dan masa retensi berkas sampah (*7-day trash policy*).
   - E-Learning **TIDAK** menyimpan file binary di storage lokalnya. E-Learning hanya menyimpan entitas `FileRef` (`fileObjectId`, `fileName`, `fileSize`, `mimeType`, `visibility`, dan `contextTag`).
3. **E-Learning Service**:
   - Pemilik seluruh domain model pembelajaran: Course, Class, Section, Dynamic Resources, Bank Soal, Kuis, Attempt, Tugas, Submission Versions, Skema Pembobotan Nilai, Gradebook, Progress Tracking State, Notifikasi, dan Audit Log Pembelajaran.

---

# BAB 2: ARSITEKTUR SISTEM DAN PENYELARASAN INTEGRASI

## 2.1 Diagram Arsitektur Komponen dan Jaringan
Sistem dirancang dengan pola *Layered Clean Architecture* berbasis kontainer:

```
                          ┌───────────────────────────┐
                          │   Pengguna (Web/Mobile)   │
                          └─────────────┬─────────────┘
                                        │ HTTPS (Port 443)
                                        ▼
                          ┌───────────────────────────┐
                          │    Nginx Reverse Proxy    │
                          │   (SSL & Rate Limiting)   │
                          └──────┬─────────────┬──────┘
                                 │             │
                    ┌────────────┘             └────────────┐
                    ▼                                       ▼
    ┌───────────────────────────────┐       ┌───────────────────────────────┐
    │     Frontend SPA (React)      │       │     Backend API (Node.js)     │
    │  - Responsive Learning UI     │       │  - Express / NestJS Framework │
    │  - Realtime Feedback Banner   │       │  - Business & Auto-Grading    │
    │  - Video & PDF Tracking Hook  │       │  - Audit Log Interceptor      │
    └───────────────────────────────┘       └──────┬─────────────┬──────────┘
                                                   │             │
                                  ┌────────────────┘             └────────────────┐
                                  ▼                                               ▼
                  ┌───────────────────────────────┐               ┌───────────────────────────────┐
                  │    PostgreSQL Database (ACID) │               │      Redis In-Memory Cache    │
                  │  - Core Learning Domain       │               │  - Rate Limiter & Token Cache │
                  │  - Audit Log State Snapshots  │               │  - BullMQ Background Worker   │
                  │  - Weighted Grade Tables      │               │  - Progress Debounce Queue    │
                  └───────────────────────────────┘               └───────────────────────────────┘
```

## 2.2 Penyelarasan Integrasi SSO / Identity
Otentikasi pengguna dilakukan menggunakan standar terbuka **OpenID Connect (OIDC)** dengan alur **Authorization Code Flow + PKCE**:

```
[ Mahasiswa / Dosen ] ──(1) Akses E-Learning──► [ E-Learning Frontend ]
         │                                               │
         │◄────(2) Redirect ke Login SSO (OIDC/PKCE)─────┘
         ▼
[ SSO Login Portal ] ──(3) Input NIM/NIDN & Sandi
         │
         ├─────(4) Validasi Berhasil, Redirect dg Auth Code
         ▼
[ E-Learning Frontend ] ──(5) Tukar Code + PKCE Verifier──► [ E-Learning Backend ]
                                                                   │
                                                                   ├─(6) Server-to-Server Token Exchange──► [ SSO Token Endpoint ]
                                                                   │◄─(7) Return Access Token & ID Token────┘
                                                                   ▼
                                                            [ Verifikasi JWT & Claims ]
                                                            [ Upsert Local User Cache ]
                                                            [ Terbitkan HttpOnly Session Cookie ]
```

### Format Validasi Token Claims dan Manajemen Status Akun:
Setiap token JWT dari SSO diverifikasi dengan kriteria:
- `iss` (Issuer): `https://sso.uay.ac.id`
- `aud` (Audience): `elearning-uay` (memastikan token ditujukan khusus untuk platform E-Learning)
- `sub` (Subject): UUID unik pengguna yang tidak berubah (*immutable subject*)
- `exp` (Expiry): Waktu kedaluwarsa token aktif (*short-lived access token*, default 15 menit)
- `account_status`: **Wajib bernilai `ACTIVE`**. Menyimpan status resmi akun (`ACTIVE` | `SUSPENDED` | `DISABLED`).

####  Mekanisme Perlindungan Status Akun Berlapis (3-Tier Security):
1. **Validasi Klaim Token Instan** (*Stateless Fast-Path*):
   - Middleware otentikasi E-Learning memeriksa klaim `account_status` pada setiap permintaan API. Jika bernilai `SUSPENDED` atau `DISABLED`, akses langsung ditolak (*HTTP 403 Forbidden*) dengan pesan blocker eksplisit: *"Akun Anda sedang dinonaktifkan oleh administrator institusi"*.
2. **Validasi Status Segar pada Siklus Refresh Token** (*Short-Lived 15m TTL*):
   - Karena access token hanya berumur 15 menit, setiap kali frontend meminta perpanjangan token via *Refresh Token*, SSO mengecek status akun terkini langsung ke database SSO. Jika akun telah diubah menjadi `DISABLED`, perpanjangan token ditolak dan sesi diakhiri.
3. **Pencabutan Akses Seketika via Redis Blacklist** (*Real-Time Account Revocation*):
   - Saat Super Admin / Admin menonaktifkan akun di portal SSO, SSO memancarkan event webhook / Redis pub-sub: `AUTH:REVOKE:USER { userId: "..." }`.
   - E-Learning seketika mencatat `userId` tersebut ke dalam *Blacklist Cache* di Redis (TTL 15 menit), sehingga pengguna yang dinonaktifkan langsung terputus koneksinya detik itu juga tanpa perlu menunggu masa berlaku token 15 menit habis.

## 2.3 Penyelarasan Integrasi File Service
Seluruh file pembelajaran, dokumen tugas, dan lampiran dikelola secara aman melalui File Service:

```
[ Mahasiswa / Dosen ] ──(1) Permintaan Unggah Berkas──► [ E-Learning Backend ]
                                                                 │
                                                                 ├─(2) Request Upload Session / Ticket──► [ File Service API ]
                                                                 │◄─(3) Return Upload Ticket & Signed URL─┘
                                                                 ▼
[ Mahasiswa / Dosen ] ◄──(4) Berikan Signed Upload URL ──────────┘
         │
         └──(5) Direct Binary Upload (PUT/POST)───────► [ File Service ]
                                                                 │
                                                                 └─(6) Validasi Ukuran, MIME, & Scan Antivirus
                                                                 │
[ Mahasiswa / Dosen ] ──(7) Konfirmasi Selesai Unggah──► [ E-Learning Backend ]
                                                                 │
                                                                 ├─(8) Verifikasi Status File via API──► [ File Service API ]
                                                                 │◄─(9) Return fileObjectId & Metadata────┘
                                                                 ▼
                                                         [ Simpan Record FileRef ke DB ]
```

### Kebijakan Akses File (Public vs Private) & 7-Day Trash:
1. **Public Files** (Cover mata kuliah, banner pengumuman umum): E-Learning dapat menyajikan link publik langsung dari CDN/File Service.
2. **Private Files** (Modul berhak cipta, naskah soal ujian, berkas submission tugas mahasiswa): Browser dilarang mengakses URL file secara statis. Browser meminta URL akses sementara (*Signed Download Ticket* dengan TTL 15 menit) ke API E-Learning. E-Learning memvalidasi hak akses kelas/submission sebelum meminta tiket unduh ke File Service.
3. **Masa Retensi Sampah 7 Hari** (*7-Day Trash Lifecycle*): File yang dihapus di E-Learning masuk status `TRASH` di File Service. Pengajar atau Admin dapat melakukan *Restore* dalam rentang 7 hari sebelum berkas dihapus permanen oleh sistem (*Purge*).

## 2.4 Keandalan Antar-Layanan (Cross-Service Reliability)
Untuk mencegah kegagalan berantai (*cascading failure*):
- **Timeout & Retry with Exponential Backoff**: Batas timeout HTTP server-to-server adalah 3.000 ms dengan maksimal 3 kali retry untuk kegagalan jaringan sementara (*transient error*).
- **Circuit Breaker Pattern**: Jika SSO atau File Service mengalami *outage*, E-Learning mengaktifkan circuit breaker agar tidak membanjiri service yang sedang mengalami beban tinggi.
- **Graceful Error Response**: Saat File Service mengalami kendala sementara, antarmuka menampilkan pesan informatif dan solutif (*"Layanan penyimpanan berkas sedang dalam pemeliharaan berkala, silakan coba beberapa saat lagi"*).

[ Kembali ke Daftar Isi](#daftar-isi)

---

# BAB 3: PEMBAGIAN APLIKASI DAN RINCIAN FITUR

## 3.1 Modul Utama E-Learning dan Strategi Rilis Prioritas (P0, P1, P2)

Berdasarkan dokumen acuan resmi **File Service dan Elearning Requirement UAY.pdf (Section 1.4 & Section 10)**, seluruh kebutuhan fungsional dikelompokkan secara ketat ke dalam 3 tingkatan prioritas:

###  Definisi Resmi Prioritas Kebutuhan:
1. **P0 (Wajib Pilot / Production Pilot V0.1)**:
   - **Makna**: Fitur inti yang **wajib tersedia** untuk peluncuran pilot perkuliahan dan mendukung alur pembelajaran daring ujung-ke-ujung (*end-to-end*).
   - **Cakupan Utama**: SSO login/logout, pemetaan akun & peran, manajemen Course & CourseClass, pendaftaran peserta (Enrollment), Section pertemuan, Dynamic Resource (Teks Blok, Dokumen, Video, Dataset Lab), Bank Soal & Kuis (8 tipe soal), Pengumpulan Tugas berversi, Pembobotan Nilai Otomatis, Gradebook, serta Publikasi Nilai resmi.
2. **P1 (Penyempurnaan Pasca-Pilot Stabil)**:
   - **Makna**: Fitur penting yang dijadwalkan pada rilis berikutnya setelah alur pilot awal berjalan stabil di lingkungan produksi.
   - **Cakupan Utama**: Manajemen sesi pengguna aktif, filter & ekspor data user, ringkasan penggunaan kuota storage, pencarian berkas mendalam, forum diskusi per kelas, prasyarat aktivitas (*prerequisites*), duplikasi kelas/materi (*duplicate course*), dan ekspor rekap nilai massal.
3. **P2 (Fitur Lanjutan / Future Releases)**:
   - **Makna**: Fitur penunjang tingkat lanjut yang tidak menghambat jalannya perkuliahan awal.
   - **Cakupan Utama**: Verifikasi login bertingkat (2FA), link akses berkas sementara dengan hitung mundur, versioning file fisik di storage, analitik pembelajaran visual tingkat lanjut, kalender akademik interaktif, kanal notifikasi WhatsApp/Email Gateway, dan integrasi dua arah dengan Portal Akademik / SIAKAD.

---

###  Kebijakan Target Satu Minggu (Timebox & Scope Guardrail):
Sesuai arahan pada dokumen kebutuhan:
> *"Target satu minggu dipahami sebagai Production Pilot/V0.1 terbatas. Jika seluruh butir P0 belum dapat diselesaikan dengan aman dan stabil, cakupan pilot dipersempit berdasarkan alur end-to-end tanpa mengurangi perlindungan akses dan keselamatan data."*

---

###  Matriks 12 Kriteria Kesiapan Pilot (Pilot Readiness Criteria):
Sebelum sistem dinyatakan siap melayani perkuliahan pilot di Program Studi Informatika, sistem wajib memenuhi 12 kriteria kesiapan:
1.  **Administrasi Akun**: Admin dapat membuat/import akun, menetapkan peran, menonaktifkan akun, dan reset password via SSO.
2.  **Autentikasi Terpadu**: Mahasiswa, dosen, dan admin dapat masuk melalui SSO UAY dan memperoleh wewenang yang tepat.
3.  **Keamanan Berkas**: File valid dapat diunggah, berkas Private terlindungi, dan Trash/pemulihan 7-hari berfungsi normal.
4.  **Kesiapan Kelas**: Admin prodi dan dosen dapat menyiapkan rombongan belajar (*CourseClass*) dan mendaftarkan peserta.
5.  **Penyusunan Pertemuan**: Dosen dapat menyusun pertemuan modular, materi blok, kuis, dan tugas praktikum.
6.  **Aktivitas Pembelajaran**: Mahasiswa dapat mengakses materi belajar, mengerjakan kuis multi-tipe, dan mengunggah tugas.
7.  **Alur Penilaian Dosen**: Dosen dapat menilai kuis objektif secara otomatis, mengoreksi essay manual, dan menilai tugas.
8.  **Isolasi Nilai Terlindungi**: Mahasiswa hanya dapat melihat nilai miliknya setelah dosen mempublikasikan nilai secara resmi.
9.  **Pengujian Lintas Layanan**: Seluruh hak akses telah teruji secara aman lintas SSO, File Service, dan E-Learning.
10.  **Keterlacakan Audit**: Riwayat pengumpulan tugas, koreksi nilai, perubahan akun, dan penghapusan file tercatat di AuditLog.
11.  **Nol Masalah Kritis**: Tidak ada bug berkategori *blocker/critical* yang menghambat alur pembelajaran utama.
12.  **SOP Dukungan & Pemulihan**: Prosedur operasional backup harian dan penanggung jawab pilot telah ditetapkan.

### 3.1.1 Matriks Keterlacakan Kebutuhan Resmi (Requirements Traceability Matrix - RTM)
Seluruh 151 butir kebutuhan dari dokumen resmi **Requirement UAY (File Service dan Elearning Requirement UAY.pdf)** telah dipetakan dan diakomodasi 100% ke dalam arsitektur teknis sistem:

| Modul Kebutuhan PDF | Kode Kebutuhan | Cakupan & Prioritas | Pemenuhan dalam Desain Teknis |
| :--- | :---: | :---: | :--- |
| **1. Autentikasi & Akses E-Learning** | `ACC-001 - 006` | P0 (5 Fitur) / P1 (1 Fitur) | Integrasi OIDC SSO UAY dengan PKCE, penanganan peran pengguna, session TTL, dan pemutusan akses akun nonaktif (*Sub-bab 2.2 & 3.1*). |
| **2. Dashboard Mahasiswa** | `SDH-001 - 006` | P0 (5 Fitur) / P1 (1 Fitur) | Dashboard adaptif menampilkan kelas aktif, timeline tugas & kuis mendatang (*upcoming deadlines*), dan rekap progres belajar mandiri (*Sub-bab 3.2*). |
| **3. Dashboard Pengajar** | `TDH-001 - 006` | P0 (4 Fitur) / P1 (1 Fitur) | Dashboard ringkasan kelas yang diampu, antrean penilaian (*pending submissions to grade*), dan akses cepat pembuatan materi (*Sub-bab 3.2*). |
| **4. Course & Course Class** | `CRS-001 - 008` | P0 (7 Fitur) / P1 (1 Fitur) | Relasi entitas Course induk vs CourseClass rombel per semester, enrollment key mandiri, status DRAFT / PUBLISHED / ARCHIVED (*Sub-bab 3.2 & Skema Bab 5*). |
| **5. Enrollment & Peserta** | `ENR-001 - 009` | P0 (4 Fitur) / P1 (5 Fitur) | Import peserta massal via CSV/Excel dengan pratinjau validasi baris, pendaftaran manual admin/dosen, dan status keaktifan peserta (*Sub-bab 3.2*). |
| **6. Section / Pertemuan** | `SEC-001 - 008` | P0 (7 Fitur) / P1 (1 Fitur) | Pengelompokan sesi modular (Kuliah, Praktikum, Seminar, Workshop, Ujian), pengaturan visibilitas, jadwal rilis otomatis, dan drag-and-drop ordering (*Bab 4*). |
| **7. Dynamic Resource Engine** | `RES-001 - 008` | P0 (8 Fitur Lengkap) | Sistem konten dinamis: Teks Kaya Notion-Style Blocks, Modul Slide PDF, Video Streaming, Dataset Praktikum Lab, Virtual Simulator, dan Telekonferensi (*Sub-bab 3.3*). |
| **8. Kuis & Bank Soal** | `QZ-001 - 013` | P0 (11 Fitur) / P1 / P2 | Bank Soal, 4 tipe soal (Pilihan Tunggal, Pilihan Jamak, Benar/Salah, Essay), pengacakan soal/opsi, timer independen vs sync deadline, dan penilaian essay (*Sub-bab 3.4*). |
| **9. Tugas & Pengumpulan Berversi**| `ASG-001 - 011` | P0 (9 Fitur) / P2 (2 Fitur) | Pengumpulan berkas/teks/link, riwayat revisi berversi (v1, v2, v3), toleransi keterlambatan (*grace period / cutoff date*), dan status On-Time/Late (*Sub-bab 3.4*). |
| **10. Pembobotan Nilai Otomatis** | `GRD-001 - 009` | P0 (7 Fitur) / P1 / P2 | Skema kategori berbobot otomatis (Tugas 25%, Kuis 15%, UTS 25%, UAS 25%, Progres 10% = 100%), kalkulasi nilai akhir instan, dan konversi huruf A-E (*Sub-bab 3.5*). |
| **11. Umpan Balik & Blocker Engine**| `FDB-001 - 006` | P0 (6 Fitur Lengkap) | 4 Status respon interaksi: Sukses seketika, Pesan error solutif, Callout blocker eksplisit, Indikator proses unggah, dan Anti double-submit token (*Sub-bab 3.8*). |
| **12. Pengumuman Kelas** | `ANN-001 - 005` | P0 (4 Fitur) / P1 (1 Fitur) | Pembuatan pengumuman broadcast kelas oleh dosen dengan penjadwalan publikasi dan penandaan penting (*Sub-bab 3.2*). |
| **13. Notifikasi Dalam Aplikasi** | `NOT-001 - 007` | P0 (5 Fitur) / P1 / P2 | In-app notification untuk nilai terbit, tugas baru, pengumuman, pengingat deadline, dan kunci idempotensi event (*Sub-bab 3.2*). |
| **14. Integrasi File Service** | `FIL-001 - 009` | P0 (9 Fitur Lengkap) | Zero-binary storage di E-Learning, Presigned Upload URL, Signed Download Ticket TTL 15m, ACL check, dan siklus retensi sampah 7 hari (*Sub-bab 2.3*). |
| **15. Perekaman Progress Belajar** | `PRG-001 - 006` | P0 (6 Fitur Lengkap) | Pelacakan detik tontonan video anti-skip, pelacakan array halaman PDF unik `viewedPages`, tracking download aset lab, dan agregasi kelas (*Sub-bab 3.6*). |
### 3.1.2 Mekanisme Duplikasi Kelas (Course Cloning) dan Pengarsipan Angkatan

Untuk menjamin efisiensi kerja pengajar setiap pergantian tahun akademik serta menjaga integritas data historis antar-angkatan mahasiswa, sistem mengimplementasikan mekanisme **Duplikasi Kelas Bersih (Clean-Slate Course Cloning)** dan **Siklus Pengarsipan Permanen (Archived Course Lifecycle)** sesuai butir kebutuhan resmi `CRS-007` (P0) dan `CRS-008` (P1).

#### Skenario Siklus Hidup Rombongan Belajar (Rombel):
1. **Semester Berjalan (Misal: Angkatan 2025)**:
   - Dosen mengampu mata kuliah pada rombongan belajar `IF101-A-20251` (Tahun Akademik 2025/2026 Ganjil) dengan peserta terdaftar mahasiswa angkatan 2025.
   - Seluruh aktivitas perkuliahan, kuis, pengumpulan tugas, dan pembobotan nilai berlangsung hingga nilai akhir resmi diterbitkan (*Published*).
2. **Penutupan dan Pengarsipan** (*Archiving*):
   - Setelah periode semester selesai, status `CourseClass` dialihkan menjadi `ARCHIVED`.
   - **Karakteristik Kelas Terarsip (Read-Only)**: Mahasiswa angkatan 2025 tetap memiliki akses permanen untuk membaca materi perkuliahan dan melihat riwayat nilai akhir mereka (berfungsi sebagai portofolio belajar transkrip), namun sistem secara ketat menolak pengumpulan tugas baru, kuis baru, atau pengubahan nilai (*immutable state*).
3. **Pembukaan Semester Baru (Misal: Angkatan 2026)**:
   - Dosen atau admin program studi memilih aksi **"Duplikasi Kelas (Clone Class)"** dari sumber `IF101-A-20251` untuk membentuk rombel baru `IF101-A-20261` (Tahun Akademik 2026/2027 Ganjil).

#### Matriks Aturan Duplikasi Bersih (Clean-Slate Deep Clone Rules):

| Entitas Data | Tindakan Duplikasi | Status pada Rombel Baru | Rationale & Penjelasan Teknis |
| :--- | :---: | :---: | :--- |
| **Struktur Pertemuan (Section)** | Disalin Utuh | Aktif | Mempertahankan urutan 16 pertemuan perkuliahan, silabus, dan deskripsi sesi. |
| **Materi & Dynamic Block (ResourceItem)** | Disalin Utuh | Aktif | Teks kaya Notion-style, referensi slide PDF, video pembelajaran, dan dataset lab siap pakai kembali. |
| **Kuis & Bank Soal (Quiz & Question)** | Disalin Utuh | Aktif (Draft) | Seluruh butir pertanyaan, opsi jawaban, pembobotan soal, dan kunci jawaban tersalin tanpa kehilangan format. |
| **Tugas Perkuliahan (Assignment)** | Disalin Utuh | Aktif (Draft) | Judul tugas, petunjuk pengerjaan, format berkas yang diizinkan, dan rubrik penilaian tersalin. |
| **Skema Pembobotan Nilai (GradeCategory)**| Disalin Utuh | Aktif | Konfigurasi persentase kategori nilai (misal: Tugas 20%, UTS 30%, UAS 30%, Progres 20%) tersalin otomatis. |
| **Tenggat Waktu (Deadlines)** | Direset | Nilai Null / Penyesuaian | Tanggal batas pengumpulan tugas dan kuis dikosongkan untuk mencegah mahasiswa baru langsung berstatus terlambat (*Late*). |
| **Daftar Peserta (Enrollment)** | Direset Total | Kosong (0 Mahasiswa) | Mahasiswa angkatan lama tidak terbawa ke kelas baru. Angkatan 2026 didaftarkan fresh via import CSV atau enrollment key. |
| **Pengumpulan Tugas (Submission)** | Direset Total | Kosong (0 Berkas) | Berkas dan teks jawaban tugas mahasiswa angkatan lama tidak masuk ke kelas baru. |
| **Riwayat Jawaban Kuis (QuizAttempt)** | Direset Total | Kosong (0 Lembar) | Lembar kerja kuis bersih dari jawaban lama. |
| **Progres Pembelajaran (StudentProgress)** | Direset Total | Kosong (0%) | Pelacakan video anti-skip dan halaman PDF kembali ke awal untuk seluruh peserta baru. |
| **Catatan Audit (AuditLog)** | Dipisahkan | Riwayat Baru | Log audit lama tetap melekat pada kelas 20251; kelas 20261 memulai pencatatan audit perubahan baru. |

#### Jaminan Integritas Transaksional Backend:
Proses kloning dijalankan di dalam satu transaksi database atomik (*Database Transaction Isolation Level Read Committed*):

```typescript
// Eksekusi atomik deep-clone rombel kelas
await prisma.$transaction(async (tx) => {
  // 1. Buat record CourseClass baru dengan status PUBLISHED / DRAFT
  const newClass = await tx.courseClass.create({
    data: {
      courseId: sourceClass.courseId,
      name: payload.targetName,
      academicYear: payload.targetAcademicYear,
      status: 'PUBLISHED',
      enrollmentKey: payload.newEnrollmentKey,
    }
  });

  // 2. Duplikasi seluruh Section & ResourceItem terkait
  // 3. Duplikasi Quiz, Questions, & Options
  // 4. Duplikasi Assignments & GradeCategories
  // 5. Catat event CLONE_COURSE_CLASS pada AuditLog institusi
});
```
Dengan isolasi transaksi ini, tidak ada risiko kegagalan parsial di mana materi tersalin tetapi soal kuis tertinggal.

[ Kembali ke Daftar Isi](#daftar-isi)

---

## 3.2 Dynamic Resource Management Engine (Perkuliahan, Praktikum, & Kegiatan Akademik)
Untuk mengakomodasi spektrum kegiatan akademik yang luas (tidak hanya kuliah teori), sistem mengimplementasikan **Polymorphic Dynamic Resource Engine**. Setiap materi pembelajaran (*ResourceItem*) memiliki tipe khusus beserta skema konfigurasi dinamis (*dynamic payload*):

```
                               ┌────────────────────────────────┐
                               │   Section / Sesi Pembelajaran  │
                               │   (Type: LECTURE / LAB /       │
                               │    SEMINAR / WORKSHOP / EXAM)  │
                               └───────────────┬────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
     ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
     │   ResourceItem    │           │   Quiz Activity   │           │  Assignment Task  │
     └─────────┬─────────┘           └───────────────────┘           └───────────────────┘
               │
   ┌───────────┴───────────┬───────────────────┬───────────────────┬───────────────────┐
   ▼                       ▼                   ▼                   ▼                   ▼
RICH_TEXT               DOCUMENT            VIDEO_MEDIA         LAB_PRACTICUM       VIRTUAL_SIMULATOR
(HTML / Markdown /      (PDF, PPTX, DOCX,   (YouTube Embed,     (Dataset CSV/ZIP,   (Iframe Web Tool,
 Math Formula LaTeX)     Slide View Array)   Direct HLS Stream)  Git Repo, Tool Spec) Interactive Applet)
```

### Tipe Resource dan Payload Dinamis:
1. **`RICH_TEXT` (Materi Teks & Teori)**:
   - *Payload*: `{ htmlContent: "...", readingTimeMinutes: 5, enableLatex: true }`
   - *Penggunaan*: Artikel pengantar, konsep matematika/algoritma, silabus mingguan.
2. **`DOCUMENT` (Modul PDF / Presentasi Slide PPT)**:
   - *Payload*: `{ fileObjectId: "...", totalPages: 45, allowDownload: true, requireCompletionToDownload: false }`
   - *Penggunaan*: Buku ajar digital, slide presentasi dosen, lembar kerja praktikum (LKP).
3. **`VIDEO_MEDIA` (Video Perkuliahan / Tutorial Praktikum)**:
   - *Payload*: `{ provider: "YOUTUBE" | "DRIVE" | "STREAM", videoId: "...", durationSeconds: 1840, minWatchPercent: 85 }`
   - *Penggunaan*: Rekaman penjelasan materi, demonstrasi praktikum lab, video tutorial instalasi perangkat lunak.
4. **`LAB_PRACTICUM` (Aset & Panduan Praktikum Laboratorium)**:
   - *Payload*: `{ gitRepositoryUrl: "https://github.com/...", datasetFileObjectId: "...", softwarePrerequisites: ["Python 3.12", "PostgreSQL 16"], labManualFileObjectId: "...", estimatedLabHours: 3 }`
   - *Penggunaan*: Praktikum pemrograman, sains data, rekayasa perangkat lunak, simulasi jaringan.
5. **`VIRTUAL_SIMULATOR` (Virtual Lab & Interaktif)**:
   - *Payload*: `{ simulatorUrl: "https://sim.uay.ac.id/...", sandboxPermissions: "allow-scripts allow-same-origin", allowFullscreen: true }`
   - *Penggunaan*: Simulator rangkaian logika, praktikum fisika digital, virtual compiler.
6. **`TELECONFERENCE` (Sesi Kuliah / Responsi Daring)**:
   - *Payload*: `{ platform: "ZOOM" | "GMEET", joinUrl: "...", meetingId: "...", passcode: "...", scheduledStartTime: "2026-09-10T08:00:00Z" }`
   - *Penggunaan*: Kuliah tatap muka daring, responsi sebelum ujian, asistensi praktikum.
7. **`EXTERNAL_LINK` (Tautan Referensi Eksternal)**:
   - *Payload*: `{ targetUrl: "https://ieee.org/...", openInNewTab: true }`
   - *Penggunaan*: Jurnal ilmiah, dokumentasi resmi pustaka pemrograman, portal berita akademik.


### 3.2.1 Arsitektur Sistem Editor Konten Berbasis Blok (Notion-Style Block Engine)
Untuk memberikan fleksibilitas maksimal bagi dosen dalam menyusun materi ajar, panduan praktikum laboratorium, dan lembar aktivitas akademik, modul `RICH_TEXT` mengadopsi **Block-Based Content System (seperti Notion / TipTap / EditorJS)**.

Setiap dokumen materi disusun atas array blok terstruktur (`blocks: ContentBlock[]`) yang bersifat modular, dapat digeser (*drag-and-drop*), diduplikasi, dihapus, dan diubah tipenya secara dinamis melalui menu perintah kilat (*Slash Command Menu* `/`):

```json
{
  "version": "2.0",
  "time": 1788406000000,
  "blocks": [
    {
      "id": "blk-01",
      "type": "heading",
      "data": { "level": 1, "text": "Panduan Praktikum 03: Algoritma Enkripsi AES" }
    },
    {
      "id": "blk-02",
      "type": "callout",
      "data": {
        "alertType": "IMPORTANT",
        "icon": "",
        "title": "Prasyarat Lingkungan Laboratorium",
        "text": "Pastikan Python 3.12 dan library PyCryptodome telah terpasang sebelum memulai modul ini."
      }
    },
    {
      "id": "blk-03",
      "type": "paragraph",
      "data": {
        "text": "Advanced Encryption Standard (AES) adalah cipher blok simetris yang memproses data dalam blok berukuran 128 bit menggunakan kunci $K$ dengan panjang 128, 192, atau 256 bit."
      }
    },
    {
      "id": "blk-04",
      "type": "code_snippet",
      "data": {
        "language": "python",
        "filename": "aes_example.py",
        "showLineNumbers": true,
        "code": "from Crypto.Cipher import AES\nimport os\n\nkey = os.urandom(16)\ncipher = AES.new(key, AES.MODE_EAX)\nnonce = cipher.nonce\nciphertext, tag = cipher.encrypt_and_digest(b'Pesan Rahasia UAY')"
      }
    },
    {
      "id": "blk-05",
      "type": "math_latex",
      "data": {
        "expression": "C_i = E_K(P_i \\oplus C_{i-1}), \\quad C_0 = IV"
      }
    },
    {
      "id": "blk-06",
      "type": "image",
      "data": {
        "fileObjectId": "fobj-aes-architecture-uuid",
        "caption": "Gambar 3.1: Diagram Alur Transformasi Round pada AES-128",
        "alignment": "center",
        "aspectRatio": "16:9",
        "altText": "Arsitektur Round AES"
      }
    },
    {
      "id": "blk-07",
      "type": "checklist",
      "data": {
        "items": [
          { "id": "chk-1", "text": "Unduh dataset uji praktikum (dataset_crypto.zip)", "checked": false },
          { "id": "chk-2", "text": "Jalankan script enkripsi pada terminal lokal", "checked": false },
          { "id": "chk-3", "text": "Ambil tangkapan layar output ciphertext", "checked": false }
        ]
      }
    },
    {
      "id": "blk-08",
      "type": "file_attachment",
      "data": {
        "fileObjectId": "fobj-dataset-zip-uuid",
        "displayName": "dataset_crypto_v1.zip",
        "fileSizeBytes": 4194304,
        "mimeType": "application/zip",
        "downloadCount": 42
      }
    }
  ]
}
```

#### Tipe-Tipe Blok yang Didukung (Supported Block Types):
1. **`paragraph` (Teks Paragraf Kaya)**: Mendukung pemformatan teks inline kaya: **Tebal**, *Miring*, <u>Garis Bawah</u>, ~~Coret~~, `Inline Code`, Tautan URL, Warna Teks/Sorotan, dan Formula Matematika Inline (`$E = mc^2$`).
2. **`heading` (Judul Bab & Sub-bab)**: H1, H2, H3 dengan pembuatan anchor ID otomatis untuk navigasi daftar isi halaman materi.
3. **`image` (Gambar Terintegrasi File Service)**: Unggah gambar langsung dari clipboard (Ctrl+V) atau drag-and-drop. Gambar disimpan ke File Service dengan resolusi adaptif, opsi perataan (Kiri, Tengah, Kanan, Lebar Penuh), dan teks takarir (*caption*).
4. **`code_snippet` (Blok Kode Program Berwarna)**: Penyorotan sintaks (*syntax highlighting*) otomatis untuk lebih dari 30 bahasa pemrograman (Python, JS/TS, Java, C/C++, SQL, PHP, Rust, Go, HTML/CSS). Dilengkapi nomor baris dan tombol salin kode (*Copy to Clipboard*).
5. **`math_latex` (Formula Matematika / Sains KaTeX)**: Blok persamaan matematika kompleks berbasis LaTeX ($$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$) yang di-render secara tajam dan responsif.
6. **`callout` (Kotak Catatan / Peringatan Penting)**: Kotak informasi visual dengan ikon emoji yang dapat disesuaikan dan 5 tema warna (`NOTE` biru, `TIP` hijau, `IMPORTANT` ungu, `WARNING` kuning/oranye, `CAUTION` merah).
7. **`checklist` / `list_item` (Daftar Ceklis & Poin)**: Daftar poin berpeluru (*bulleted*), bernomor (*numbered*), dan daftar tugas interaktif (*interactive todo list*) yang dapat dicentang mahasiswa saat menyelesaikan tahapan praktikum.
8. **`table` (Tabel Data Fleksibel)**: Tabel baris dan kolom yang dapat ditambah/dikurangi dengan baris tajuk (*header row*) dan perataan teks kolom.
9. **`file_attachment` (Lampiran Berkas Unduhan)**: Menampilkan kartu unduhan file yang rapi dengan info nama berkas, ukuran bytes, tipe ekstensi, dan jumlah unduhan.
10. **`embed_media` (Media Sematan Interaktif)**: Menyematkan video YouTube, preview Google Drive, simulator online, atau repositori GitHub langsung di dalam alur baca materi.
11. **`divider` (Garis Pemisah Visual)**: Pembatas antar-subtopik materi.

#### Fitur Interaksi Editor untuk Dosen:
- **Menu Perintah Kilat** (*Slash Command Menu*): Cukup mengetik tanda garis miring `/` (misal: `/image`, `/code`, `/math`, `/callout`, `/table`, `/file`) untuk memunculkan popup pemilihan blok secara instan tanpa perlu menyentuh mouse.
- **Drag-and-Drop Block Handles**: Setiap blok memiliki handle 6-titik di sisi kiri untuk memindahkan posisi blok secara leluasa ke atas atau ke bawah.
- **Sanitasi Keamanan & Anti-XSS**: Seluruh konten blok diparsing melalui pustaka sanitasi ketat (*DOMPurify*) dan validasi schema Zod pada backend sebelum disimpan ke basis data, mencegah injeksi script berbahaya.


[ Kembali ke Daftar Isi](#daftar-isi)

---

## 3.3 Modul Penilaian, Kuis Multi-Tipe, Tugas, dan Gradebook
- **Kuis Multi-Tipe**: Single Choice, Multiple Select, True/False, dan Essay. Dilengkapi Bank Soal, pengacakan soal/opsi, timer independen vs sync deadline, dan batas attempt.
- **Tugas Berversi**: Mendukung pengumpulan berkas (PDF, ZIP), teks, atau tautan repositori Git. Dilengkapi batas waktu normal (`deadline`), batas akhir toleransi (*cutoff date / grace period*), dan riwayat pengumpulan revisi tanpa menimpa (*Versioned Resubmission*).
- **Buku Nilai (Gradebook)**: Dosen dapat menginput nilai dalam status `DRAFT` sebelum resmi di-`PUBLISH` ke mahasiswa. Pengubahan nilai pasca-publikasi mewajibkan pengisian alasan koreksi dan tercatat dalam audit log.


### 3.3.1 Mesin Import Massal Berbasis Template Excel/CSV (Bulk Import & Reconciliation Engine)
Untuk mengeliminasi pekerjaan repetitif pengajar dan pengelola program studi, sistem menyediakan **Mesin Import Template Standar (Excel .xlsx / CSV)** yang dilengkapi **Tahap Review Interaktif (Interactive Review Step)**, **Deteksi Cacat Otomatis oleh Sistem (System Defect Detection)**, serta **Rekonsiliasi Pengguna (Human-in-the-Loop)** pada seluruh modul data massal:
```
[ Pengajar / Admin ] ──(1) Unduh Template Resmi (.xlsx/.csv)
         │
         ├──(2) Isi Data Soal / Peserta / Nilai di Excel
         ▼
[ E-Learning Web UI ] ──(3) Unggah Berkas Excel/CSV
         │
         ├──(4) Parser & Deteksi Cacat Otomatis (Auto-Detection Engine)
         │      ├─ Cek Kelengkapan Kolom Wajib (Missing Values)
         │      ├─ Cek Duplikasi Internal Berkas (Intra-File Duplicate)
         │      ├─ Cek Duplikasi Basis Data Eksisting (Database Conflict)
         │      └─ Cek Kesesuaian Tipe Data & Rentang Skor
         ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                    PANEL REVIEW INTERAKTIF & REKONSILIASI ANOMALI (DIFF VIEW)             │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ Ringkasan Batch: 100 Baris Ditemukan  │  96 Baris Siap Impor  │  4 Baris Cacat / Duplikat │
├──────┬────────────────────┬─────────────────────┬───────────────────┬─────────────────────┤
│Baris │ Entitas / Kunci    │ Deteksi Cacat       │ Status Rekonsiliasi│ Opsi Aksi Pengguna  │
├──────┼────────────────────┼─────────────────────┼───────────────────┼─────────────────────┤
│ #01  │ NIM: 202301045     │ Duplikat Basis Data │ [!] KONFLIK DB    │ [Timpa] / [Abaikan] │
│ #14  │ Soal: Kuis Modul 2 │ Kunci [E] Luar Opsi │ [!] FORMAT SALAH  │ [Edit] / [Hapus]    │
│ #28  │ NIM: 202301089     │ Duplikat dg Baris 5 │ [!] DUPLIKAT FILE │ [Hapus Baris Ini]   │
│ #42  │ Nilai: Budi Santoso│ Kolom Skor Kosong   │ [!] DATA KURANG   │ [Input Skor Inline] │
└──────┴────────────────────┴─────────────────────┴───────────────────┴─────────────────────┘
         │
         ├──(5) Pengguna Mengambil Tindakan: Hapus Baris / Edit Inline / Setujui Timpa
         ▼
[ Tombol: Konfirmasi & Eksekusi Impor Data Siap ] ──(6)──► Simpan Atomic ke Basis Data
```

#### 1. Prinsip Human-in-the-Loop & Pemisahan Peran:
- **Tanggung Jawab Sistem (Deteksi & Pemberitahuan)**: Sistem **TIDAK PERNAH** melakukan penghapusan atau pemaksaan modifikasi data sepihak. Sistem juga **tidak menggagalkan seluruh berkas** secara kaku (*no rigid all-or-nothing failure*). Peran sistem murni memindai (*parsing*), mengidentifikasi baris anomali, mengelompokkan jenis cacat, dan menyajikan perbandingan (*diff view*) secara transparan kepada pengguna.
- **Tanggung Jawab Pengguna (Koreksi & Keputusan)**: Keputusan final sepenuhnya berada di tangan pengajar/administrator. Pengguna dapat meninjau baris mana saja yang berhasil divalidasi serta menentukan tindakan atas baris-baris yang bermasalah sebelum transaksi database dieksekusi.

#### 2. Empat Kategori Deteksi Cacat Otomatis (System Defect Detection):
1. **Data Tidak Lengkap** (*Missing Mandatory Fields*): Terjadi jika kolom esensial bernilai kosong atau spasi putih (misal: kolom `NIM` kosong pada impor peserta, kolom `Teks Soal` kosong pada impor bank soal, atau kolom `Nilai Angka` kosong pada lembar nilai). Baris ditandai dengan badge peringatan kuning `DATA TIDAK LENGKAP`.
2. **Duplikasi Internal Berkas** (*Intra-File Duplicate*): Terjadi jika terdapat dua atau lebih baris dalam berkas yang sama memiliki nilai pengenal identik (misal: NIM mahasiswa tertulis ganda pada dua baris berbeda dalam berkas pendaftaran peserta). Sistem menandai seluruh baris duplikat beserta referensi silang nomor barisnya (misal: *"Duplikat dengan Baris #05"*).
3. **Duplikasi Terhadap Basis Data** (*Database Conflict / Cross-Record Duplicate*): Terjadi jika data yang diimpor sudah eksis di dalam database institusi (misal: mahasiswa dengan NIM bersangkutan telah terdaftar di kelas rombel tersebut, atau butir soal dengan kode identik sudah tersimpan di Bank Soal). Sistem menandai baris dengan badge oranye `KONFLIK BASIS DATA`.
4. **Ketidaksesuaian Format & Tipe Data** (*Type & Range Validation Error*): Terjadi jika tipe data atau aturan domain dilanggar (misal: skor nilai di luar batas 0.0 s.d. 100.0, format email tidak valid, atau kunci jawaban kuis `E` padahal opsi yang didefinisikan hanya sampai `D`). Baris ditandai dengan badge merah `FORMAT SALAH`.

#### 3. Tiga Opsi Tindakan Koreksi Pengguna (User Reconciliation Controls):
Antarmuka web menyediakan 3 kontrol aksi langsung pada setiap baris bermasalah di tabel review:
1. **Hapus / Abaikan Baris** (*Exclude / Delete Row*): Pengguna dapat mengklik tombol "Abaikan" atau menghapus baris bermasalah dari daftar tunggu impor. Baris yang diabaikan tidak akan dimasukkan ke database, sementara baris valid lainnya tetap dapat diimpor dengan lancar. Tersedia juga tombol massal *"Abaikan Semua Duplikat"* (*Exclude All Duplicates*).
2. **Edit Langsung di Tabel** (*Inline Live Editing*): Pengguna tidak perlu mengunduh ulang, mengedit di Excel, dan mengunggah berkas baru. Pengguna cukup mengklik dua kali (*double-click*) pada sel yang bermasalah (misal: mengisi nama yang kosong, mengoreksi kunci jawaban dari `E` menjadi `B`, atau memperbaiki skor) langsung pada antarmuka web. Sistem langsung melakukan validasi ulang (*instant re-validation*) secara reaktif; jika nilai telah valid, status baris seketika berubah menjadi hijau `SIAP IMPOR`.
3. **Tambahkan / Timpa Data Eksisting** (*Force Include / Override Conflict*): Untuk kasus duplikasi terhadap basis data, pengguna diberikan opsi eksplisit: apakah ingin **Menimpa** (*Update/Upsert*) rekaman lama dengan nilai baru dari berkas impor (misal: revisi nilai tugas praktikum mahasiswa), atau **Membuat Entitas Baru** dengan variasi pengenal jika dikonfirmasi memang disengaja.

#### 4. Penerapan pada Tiga Modul Utama:
1. **Import Bank Soal & Butir Soal Kuis** (*Question Bank Bulk Import*):
   - Berkas template: `template_bank_soal_uay.xlsx`.
   - Deteksi cacat: Kolom opsi tidak lengkap, bobot poin non-numerik, kunci jawaban tidak cocok dengan opsi yang tersedia, rumus LaTeX bermasalah.
   - Tindakan pengguna: Koreksi kunci jawaban langsung via dropdown inline, edit formula rumus, atau hapus butir soal yang cacat sebelum dimasukkan ke bank soal kelas.
2. **Import Pendaftaran Peserta Kelas Massal** (*Enrollment Bulk Import*):
   - Berkas template: `template_peserta_kelas_uay.xlsx` / `.csv`.
   - Deteksi cacat: NIM tidak terdaftar di SSO UAY, mahasiswa sudah terdaftar di kelas rombel yang sama, atau format email kampus tidak valid.
   - Tindakan pengguna: Klik "Abaikan Duplikat" untuk mahasiswa yang sudah terdaftar, edit koreksi penulisan NIM inline, dan commit pendaftaran massal hingga 500 mahasiswa per batch dalam satu transaksi database atomik (*Read Committed*).
3. **Import & Export Lembar Nilai Tugas/Ujian Offline** (*Bulk Gradebook Sync*):
   - Berkas template: `gradebook_export_[kelas].xlsx` (otomatis memuat seluruh peserta aktif).
   - Deteksi cacat: Nilai di luar rentang 0.0 s.d. 100.0, kolom nilai kosong untuk mahasiswa yang mengikuti ujian, atau data NIM yang tidak cocok dengan peserta kelas.
   - Tindakan pengguna: Review diff antara nilai lama di sistem dengan nilai baru dari berkas, input nilai susulan secara inline pada baris yang kosong, konfirmasi simpan sebagai *Draft Gradebook*, dan pencatatan audit log otomatis atas setiap nilai yang ditimpa.


[ Kembali ke Daftar Isi](#daftar-isi)

---


### 3.3.2 Rincian Lengkap 8 Tipe Soal Kuis dan Evaluasi (Comprehensive Question Types)
Untuk mengakomodasi berbagai model evaluasi akademik (dari kuis teori singkat hingga responsi praktikum teknik dan sains), sistem menyediakan **8 Tipe Soal Lengkap** dengan mesin penilaian otomatis (*Auto-Grading Engine*) dan penilaian manual dosen:

| No | Tipe Soal (*Question Type*) | Kode Enum | Metode Penilaian | Karakteristik & Format Input |
| :---: | :--- | :--- | :---: | :--- |
| **1** | **Pilihan Ganda Tunggal** (*Single Choice*) | `SINGLE_CHOICE` | **Otomatis 100%** | Memilih 1 jawaban benar dari opsi A s.d. E (radio button). Pengacakan opsi dapat diaktifkan. |
| **2** | **Pilihan Ganda Majemuk** (*Multiple Select*) | `MULTIPLE_SELECT` | **Otomatis 100%** | Memilih lebih dari 1 jawaban benar (checkbox). Mendukung mode nilai *All-or-Nothing* atau *Partial Credit* (proporsional). |
| **3** | **Benar / Salah** (*True / False*) | `TRUE_FALSE` | **Otomatis 100%** | Memilih pernyataan bernilai Benar atau Salah secara instan. |
| **4** | **Isian Singkat & Numerik** (*Short Answer / Fill Blank*) | `SHORT_ANSWER` | **Otomatis 100%** | Menginput kata kunci eksak atau nilai numerik dengan rentang toleransi (misal: $9.8 \pm 0.1$). Mendukung *case-sensitive toggle*. |
| **5** | **Menjodohkan Pasangan** (*Matching*) | `MATCHING` | **Otomatis 100%** | Memasangkan premis konsep di sisi kiri dengan definisi/jawaban di sisi kanan melalui dropdown/garis hubung. |
| **6** | **Mengurutkan Prosedur** (*Ordering / Sequencing*) | `ORDERING` | **Otomatis 100%** | Mengurutkan langkah kerja praktikum, siklus proses, atau baris algoritma dengan *drag-and-drop*. |
| **7** | **Uraian & Pembahasan** (*Essay / Long Text*) | `ESSAY` | **Penilaian Dosen** | Jawaban teks panjang terformat (Rich Text / LaTeX rumus). Dilengkapi rubrik penilaian, batas jumlah kata, dan kotak catatan umpan balik dosen. |
| **8** | **Jawaban Unggah Berkas** (*File Upload Response*) | `FILE_UPLOAD` | **Penilaian Dosen** | Mahasiswa mengunggah berkas foto lembar kerja coretan tangan (PNG/JPG), PDF analisa, atau berkas kode program praktikum (.py/.cpp). |

#### Fitur Pendukung Bank Soal & Kuis:
- **Dukungan Formula Matematika & Kimia (LaTeX / KaTeX)**: Seluruh teks pertanyaan dan opsi jawaban mendukung notasi matematika kompleks ($$\sum_{i=1}^{n} x_i^2$$) dan struktur reaksi kimia.
- **Pengacakan Ganda** (*Double Randomization*): Pengacakan urutan nomor butir soal (*Shuffle Questions*) dan pengacakan urutan abjad pilihan jawaban (*Shuffle Options*) untuk mencegah kecurangan ujian.
- **Pencegahan Kehilangan Jawaban** (*Realtime Autosave*): Setiap jawaban yang dipilih/diketik mahasiswa otomatis tersimpan (*autosaved*) ke Redis/Database dalam interval 3 detik, sehingga jika koneksi internet terputus, mahasiswa dapat melanjutkan kuis tanpa kehilangan jawaban sebelumnya.


[ Kembali ke Daftar Isi](#daftar-isi)

---


### 3.3.3 Mesin Pembobotan Kustom Butir Soal Kuis dan Normalisasi Skala 100 (Custom Question Weighting Engine)
Pengajar memiliki kendali penuh untuk menentukan **bobot poin yang berbeda pada setiap butir soal kuis** (misal: soal studi kasus analitis berbobot lebih besar daripada soal definisi dasar), dengan jaminan bahwa **total nilai kuis selalu terhitung presisi pada skala 100**:

```
[ Pengajar Mengatur Bobot Butir Soal pada Kuis Pemrograman Web ]
┌─────────────────────────────────────────────────────────────────────────────┐
│                       KONFIGURASI BOBOT PER BUTIR SOAL                      │
├──────┬──────────────────────┬──────────────┬─────────────┬──────────────────┤
│ No   │ Pertanyaan           │ Tipe Soal    │ Bobot Poin  │ Proporsi (%)     │
├──────┼──────────────────────┼──────────────┼─────────────┼──────────────────┤
│ #01  │ Analisa Arsitektur   │ ESSAY        │ 30.0 Poin   │ 30% dari Kuis    │
│ #02  │ Implementasi Kode    │ FILE_UPLOAD  │ 40.0 Poin   │ 40% dari Kuis    │
│ #03  │ Pemahaman Konsep     │ SINGLE_CHOICE│ 15.0 Poin   │ 15% dari Kuis    │
│ #04  │ Troubleshooting Bug  │ MATCHING     │ 15.0 Poin   │ 15% dari Kuis    │
├──────┴──────────────────────┴──────────────┴─────────────┴──────────────────┤
│ STATUS TOTAL POIN: 100.0 / 100.0 ✅ [ Siap Dipublikasikan ke Mahasiswa ]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Fitur Kunci Pembobotan Butir Soal (Item-Level Weighting Features):
- **Custom Points per Item**: Setiap butir soal (`Question`) memiliki atribut `points: Float` independen yang dapat diatur oleh dosen (misal: Soal 1 = 35.0 poin, Soal 2 = 15.0 poin, Soal 3 = 50.0 poin).
- **Indikator Akumulasi Poin Real-Time** (*Live Points Counter Bar*): Pada editor pembuatan kuis, antarmuka menyajikan indikator akumulasi poin yang berubah secara *real-time* saat dosen mengubah nilai pada butir soal (misal: *"Total Poin: 75 / 100 — Kurang 25 Poin lagi untuk mencapai 100"*).

#### 2. Dua Mode Penjaminan Nilai Akhir Skala 100 (100-Scale Guarantee Modes):
Dosen dapat memilih mekanisme penjaminan skala 100 sesuai preferensi akademik:
1. **Mode Validasi Ketat 100 Poin** (*Strict 100-Point Target Validation*):
   - Sistem mewajibkan jumlah total poin seluruh butir soal aktif tepat bernilai 100.0 ($\sum \text{points} = 100.0$).
   - Jika total poin belum 100 (misal baru 85 atau lebih dari 100), tombol *Publish Kuis* dinonaktifkan dan menampilkan pesan blocker instruktif (*"Total poin butir soal kuis harus berjumlah tepat 100"*).
   - Disediakan tombol cerdas: **[Bagi Rata Sisa Poin]** (*Auto-Distribute Remaining Points*) untuk menggenapkan sisa poin ke butir soal secara proporsional dengan 1 klik.
2. **Mode Normalisasi Otomatis ke Skala 100** (*Auto-Normalization to 100 Scale*):
   - Jika kuis memiliki total poin mentah (*raw points*) yang tidak genap 100 (misal: terdapat 14 soal dengan total akumulasi poin mentah $= 70$), sistem secara otomatis mengonversi skor perolehan mahasiswa ke skala standar 100 menggunakan formula normalisasi matematis:
     $$\text{Nilai Kuis Mahasiswa (Skala 100)} = \left( \frac{\sum \text{Poin Butir Soal yang Diperoleh Mahasiswa}}{\sum \text{Total Poin Mentah Seluruh Soal Kuis}} \right) \times 100$$
   - Hasil normalisasi disimpan dengan presisi 2 angka desimal (misal: $88.57$).

#### 3. Penilaian Parsial Proporsional pada Soal Majemuk (Partial Credit Scoring):
Untuk soal tipe `MULTIPLE_SELECT` (Pilihan Ganda Jamak) yang memiliki bobot besar (misal 20 poin):
- Jika butir soal memiliki 4 opsi benar, dan mahasiswa memilih 2 opsi benar tanpa memilih opsi salah, sistem secara otomatis memberikan nilai proporsional sebesar:
  $$\text{Skor Soal} = \left( \frac{2}{4} \right) \times 20.0 = 10.0 \text{ Poin}$$


[ Kembali ke Daftar Isi](#daftar-isi)

---


### 3.3.4 Alur Penilaian Soal Essay dan Sistem Skoring Hibrida (Hybrid Auto-Manual Grading Workflow)
Untuk kuis yang memadukan butir soal objektif (pilihan ganda, benar-salah, menjodohkan) dengan **butir soal subjektif (Essay / Unggah Berkas)**, sistem menerapkan **Alur Penilaian Hibrida Terpadu** (*Hybrid Grading Engine*):

```
[ Mahasiswa Mengirimkan Jawaban Kuis ]
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. PEMERIKSAAN OTOMATIS SOAL OBJEKTIF (Auto-Grading Engine)                 │
│    - Soal Pilihan Ganda, Benar/Salah, Matching, Short Answer diperiksa instan│
│    - Diperoleh Skor Sementara Objektif: misal 50.0 dari total 60.0 poin     │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. STATUS ATTEMPT: [ NEEDS_GRADING ] (Menunggu Penilaian Essay)             │
│    - Layar Mahasiswa: Tampil notifikasi "Skor Objektif Sementara: 50.0.      │
│      Jawaban Essay sedang dalam proses pemeriksaan oleh Dosen."             │
│    - Dashboard Dosen: Muncul badge notifikasi antrean "35 Jawaban Perlu     │
│      Dinilai pada Kuis [Nama Kuis]".                                         │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. ANTARMUKA PENILAIAN ESSAY KHUSUS DOSEN (Instructor Grading Panel)        │
│    - Dosen membaca teks jawaban essay / melihat preview gambar/file lampiran │
│    - Dosen menginput Skor Essay (misal: 35.0 dari max 40.0 poin)             │
│    - Dosen mengetik catatan koreksi kustom (Feedback & Rubrik Nilai)        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. KALKULASI NILAI AKHIR OTOMATIS KE SKALA 100                              │
│    - Total Poin = Skor Objektif (50.0) + Skor Essay Dosen (35.0) = 85.0 Poin│
│    - Nilai Akhir Kuis Mahasiswa = 85.0 / 100.0 (Status: GRADED_COMPLETE)    │
│    - Dosen klik "Publikasikan Nilai" ──► Notifikasi terbit ke Mahasiswa     │
│    - Nilai otomatis mengalir ke Gradebook & Mesin Pembobotan Kelas           │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 1. Dua Mode Penilaian Essay yang Fleksibel untuk Dosen:
Dosen dapat memilih metode penilaian yang paling nyaman:
1. **Mode Penilaian per Mahasiswa** (*Grading by Student*):
   - Dosen membuka lembar jawaban 1 mahasiswa secara utuh untuk membaca seluruh butir essay mahasiswa tersebut sekaligus memberikan nilai dan catatan per butir soal.
2. **Mode Penilaian per Nomor Soal** (*Grading by Question / Batch Grading*):
   - Dosen menilai Soal Essay No. 5 untuk seluruh 40 mahasiswa secara berurutan sebelum berpindah ke Soal Essay No. 6. Mode ini sangat efektif menjaga konsistensi standar rubrik nilai dan mempercepat waktu koreksi dosen.

#### 2. Rubrik Penilaian Terstruktur (Structured Grading Rubric):
Pada saat membuat soal essay, dosen dapat menyertakan rubrik penilaian (misal: *Analisa Masalah: 15 poin, Ketepatan Sintaks: 15 poin, Kerapihan: 10 poin*). Saat memeriksa essay, dosen cukup mengklik opsi poin rubrik untuk mengakumulasi skor essay secara otomatis tanpa perlu kalkulasi manual.

#### 3. Rekonsiliasi Nilai & Pencatatan Jejak Audit:
- **Koreksi Nilai Pasca-Rilis**: Jika dosen ingin mengoreksi nilai essay setelah dipublikasikan, sistem mewajibkan pengisian alasan perubahan (*reason*), memperbarui nilai akhir kuis dan gradebook secara otomatis, serta mencatat data sebelum dan sesudah (`beforeState` $\rightarrow$ `afterState`) ke dalam `AuditLog`.


[ Kembali ke Daftar Isi](#daftar-isi)

---

## 3.4 Modul Pembobotan Nilai Otomatis & Kalkulasi Nilai Akhir
Sistem dilengkapi **Automated Grade Weighting & Final Score Engine** sehingga pengajar **tidak perlu menghitung nilai akhir secara manual**.

### 1. Skema Kategori Penilaian Berbobot (Weighted Grade Categories):
Pengajar atau Admin Prodi dapat menetapkan persentase bobot untuk setiap kategori penilaian pada suatu kelas:

| Kategori Penilaian | Bobot Default | Metode Agregasi Internal | Keterangan |
| :--- | :---: | :--- | :--- |
| **Partisipasi & Progres Belajar** | **10%** | Rata-rata Progres Materi (%) | Diambil otomatis dari persentase penyelesaian modul, video, dan slide. |
| **Tugas & Laporan Praktikum** | **25%** | Rata-rata Skor Tugas (0-100) | Menghitung rata-rata seluruh tugas yang masuk dalam kategori ini. |
| **Kuis & Responsi** | **15%** | Rata-rata Skor Kuis (0-100) | Nilai kuis otomatis dan essay yang telah dinilai dosen. |
| **Ujian Tengah Semester (UTS)** | **25%** | Skor Ujian UTS | Kuis/Penugasan khusus berlabel evaluasi tengah semester. |
| **Ujian Akhir Semester (UAS)** | **25%** | Skor Ujian UAS | Kuis/Penugasan akhir/Proyek akhir semester. |
| **TOTAL BOBOT** | **100%** | **Wajib Tepat 100.0%** | Sistem memvalidasi $\sum \text{Bobot} = 100\%$ sebelum nilai akhir dihitung. |

### 2. Formula Perhitungan Nilai Akhir Otomatis:
$$\text{Nilai Akhir (Skala 100)} = \sum_{k=1}^{N} \left( \text{Rata-rata Skor Kategori}_k \times \frac{\text{Bobot Kategori}_k}{100} \right)$$

### 3. Konversi Nilai Huruf & Indeks Mutu Otomatis (Standar UAY):
Sistem secara otomatis mengonversi skor angka ke nilai huruf dan bobot indeks prestasi:
- $\text{Skor} \ge 85.00 \longrightarrow \text{Nilai Huruf: } \mathbf{A} \quad (\text{Bobot: } 4.00)$
- $80.00 \le \text{Skor} < 85.00 \longrightarrow \text{Nilai Huruf: } \mathbf{A-} \quad (\text{Bobot: } 3.75)$
- $75.00 \le \text{Skor} < 80.00 \longrightarrow \text{Nilai Huruf: } \mathbf{B+} \quad (\text{Bobot: } 3.50)$
- $70.00 \le \text{Skor} < 75.00 \longrightarrow \text{Nilai Huruf: } \mathbf{B} \quad (\text{Bobot: } 3.00)$
- $65.00 \le \text{Skor} < 70.00 \longrightarrow \text{Nilai Huruf: } \mathbf{B-} \quad (\text{Bobot: } 2.75)$
- $60.00 \le \text{Skor} < 65.00 \longrightarrow \text{Nilai Huruf: } \mathbf{C+} \quad (\text{Bobot: } 2.50)$
- $55.00 \le \text{Skor} < 60.00 \longrightarrow \text{Nilai Huruf: } \mathbf{C} \quad (\text{Bobot: } 2.00)$
- $45.00 \le \text{Skor} < 55.00 \longrightarrow \text{Nilai Huruf: } \mathbf{D} \quad (\text{Bobot: } 1.00)$
- $\text{Skor} < 45.00 \longrightarrow \text{Nilai Huruf: } \mathbf{E} \quad (\text{Bobot: } 0.00)$

Pengajar dapat melihat tabel rekap nilai akhir seluruh mahasiswa secara instan dan mengunci (*lock & publish*) nilai akhir ke portal akademik dengan satu kali klik.

## 3.5 Mesin Pelacakan Progress Belajar Rinci (Granular Learning Progress Engine)
1. **Pelacakan Video Anti-Skip**: Mencatat `watchedSec`, `lastPosition`, dan `percent`. Dilengkapi transaksi database serializable dan prinsip *monotonic increase* agar progres tidak dapat dimanipulasi melalui multi-tab.
2. **Pelacakan Slide/PDF Berbasis Halaman**: Menyimpan array halaman unik yang benar-benar telah dibuka (`viewedPages: [1, 2, 3, 5]`). Persentase dihitung: $(\text{viewedPages.length} / \text{totalPages}) \times 100\%$.
3. **Pelacakan Unduhan Aset**: Mencatat event unduhan modul/dataset praktikum secara *idempotent*.

## 3.6 Sistem Audit Log Mendalam (Before-After State Change Capture)
Seluruh aksi kritis yang memutasi data akademik dicatat ke dalam tabel `AuditLog` dengan menyimpan *snapshot* kondisi data sebelum (`beforeState`) dan sesudah (`afterState`) aksi dijalankan.

### Titik Kritis yang Wajib Mencatat Before-After State:
1. **Penilaian & Koreksi Nilai (`GRADE`)**: Mencatat nilai lama, nilai baru, feedback lama, feedback baru, dan status publikasi.
2. **Pengumpulan Ulang Tugas (`ASSIGNMENT_SUBMISSION`)**: Menyimpan histori pengumpulan lama dan membuat versi baru (`version: 2`).
3. **Pengubahan Konfigurasi Kuis Aktif (`QUIZ`)**: Pengubahan durasi, deadline, atau kunci jawaban saat kuis berjalan.
4. **Keanggotaan Kelas & Peran (`ENROLLMENT` & `USER`)**: Penambahan/pengeluaran peserta dan perubahan wewenang.

## 3.7 Standar Umpan Balik Sistem, Konfirmasi Aksi, dan Penanganan Kendala (Feedback & Blocker Engine)
Untuk memastikan pengalaman pengguna yang jelas, transparan, dan tidak membingungkan, sistem menerapkan **4 Status Respon Interaksi**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 MATRIKS STATUS RESPON DAN FEEDBACK PENGGUNA                 │
├───────────────────┬────────────────────────────┬────────────────────────────┤
│ Tipe Respon       │ Komponen UI / Tampilan     │ Contoh Skenario & Pesan    │
├───────────────────┼────────────────────────────┼────────────────────────────┤
│ 1. SUCCESS STATE  │ Banner Hijau / Toast       │ "Tugas berhasil dikumpul   │
│    (Berhasil)     │ Konfirmasi + Data Timestamp│ pada 03 Sep 2026, 11:15 WIB│
│                   │ & Versi Pengumpulan        │ (Versi 2 - On Time)."      │
├───────────────────┼────────────────────────────┼────────────────────────────┤
│ 2. FAILURE STATE  │ Banner Merah / Modal Error │ "Gagal mengunggah berkas   │
│    (Gagal Retry)  │ Ramah + Tombol Coba Lagi   │ karena jaringan terputus.  │
│                   │ (Actionable Error)         │ Silakan klik 'Coba Lagi'." │
├───────────────────┼────────────────────────────┼────────────────────────────┤
│ 3. BLOCKER STATE  │ Callout Kuning/Oranye      │ "Pengumpulan tugas dikunci │
│    (Kendala Akses)│ Eksplisit Menyebut Alasan  │ karena telah melewati batas│
│                   │ & Waktu Pembukaan/Tutup    │ toleransi (05 Sep 23:59)." │
├───────────────────┼────────────────────────────┼────────────────────────────┤
│ 4. PROGRESS STATE │ Progress Bar (0 - 100%) +  │ "Mengunggah Laporan (72%)  │
│    (Proses Aktif) │ Spinner + Disable Button   │ Harap jangan tutup halaman"│
└───────────────────┴────────────────────────────┴────────────────────────────┘
```

### Standar Pencegahan Double-Submit:
Saat pengguna menekan tombol penting (misal: **Kirim Jawaban Kuis**, **Kumpulkan Tugas**, **Publikasikan Nilai**):
1. Tombol langsung dinonaktifkan (*disabled*) dan menampilkan animasi pemrosesan (*loading spinner*).
2. Backend API menerapkan *Idempotency-Key* berbasis token transaksi di Redis untuk memastikan tidak terjadi duplikasi attempt kuis atau submission ganda akibat klik berulang.

[ Kembali ke Daftar Isi](#daftar-isi)

---


### 3.7.1 Mesin Penyimpanan Draf Lokal, Pemulihan Otomatis, dan Manajemen Eviksi Penyimpanan (Client-Side Draft Caching & Storage Eviction Engine)
Untuk mengantisipasi kendala kehilangan koneksi internet tiba-tiba, *browser crash*, mati listrik, atau *reload* tidak sengaja saat pengajar sedang menyusun materi blok yang panjang, membuat bank soal, atau mahasiswa sedang mengetik essay ujian, sistem menerapkan **Draf Caching Klien dengan Manajemen Penyimpanan Otomatis**:

```
[ Pengajar / Mahasiswa Mengetik Materi / Soal / Jawaban ]
                     │
                     ├─(1) Debounce Interval 2000ms & Hashing Konten
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MESIN PENYIMPANAN DRAF LOKAL (IndexedDB Storage Engine)                  │
│    - Menggunakan IndexedDB browser (asinkronus, non-blocking, kuota besar) │
│    - Menyimpan snapshot struktur JSON blok, butir soal, atau teks essay     │
│    - Indikator UI: "Draf tersimpan lokal • 12:40:15 WIB" (Ikon Centang Abu) │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼ (Jika Koneksi Terputus / Crash)       ▼ (Saat Berhasil Simpan ke Server)
┌───────────────────────────────────────────────┐ ┌───────────────────────────┐
│ 2. DETEKSI & PEMULIHAN OTOMATIS (Auto-Restore)│ │ 3. PURGE DRAF OTOMATIS    │
│    - Saat editor dibuka kembali:              │ │ - Draf lokal langsung     │
│    - Sistem bandingkan Timestamp Lokal vs DB  │ │   dihapus dari IndexedDB  │
│    - Tampil Banner: "Ditemukan draf lokal     │ │ - Penyimpanan tetap bersih│
│      terbaru dari [Waktu]. [Pulihkan Draf]"   │ └───────────────────────────┘
└───────────────────────────────────────────────┘
```

#### 1. Struktur Data Record Draf Lokal (LocalDraftRecord):
Setiap draf disimpan secara terisolasi pada IndexedDB per pengguna:

```typescript
interface LocalDraftRecord {
  draftKey: string;        // Format: "DRAFT:{ENTITY_TYPE}:{ENTITY_ID}:{USER_ID}"
  userId: string;          // UUID pengguna SSO aktif
  entityType: 'RESOURCE_BLOCKS' | 'QUIZ_BUILDER' | 'QUESTION_BANK' | 'ESSAY_ANSWER' | 'ASSIGNMENT_TEXT';
  entityId: string;        // ID materi, kuis, atau tugas terkait
  title: string;           // Judul materi/soal untuk label pemulihan
  payloadJson: any;        // Array blok JSON / butir soal kuis
  contentHash: string;     // Hash SHA-256 untuk mendeteksi perubahan nyata
  lastSavedAt: number;     // Timestamp milidetik penyimpanan lokal
  expiresAt: number;       // TTL masa kedaluwarsa (Default: 14 Hari)
  byteSize: number;        // Ukuran payload dalam bytes
}
```

#### 2. Manajemen Eviksi Penyimpanan (Anti-Bloat Storage Management):
Untuk mencegah penyimpanan browser membengkak (*prevent storage bloat*):
- **Batas Kuota Maksimal per Perangkat**: Maksimal dialokasikan **15 MB** untuk seluruh draf lokal E-Learning.
- **Masa Kedaluwarsa Otomatis** (*Time-To-Live / TTL*): Setiap draf lokal yang tidak disentuh atau tidak dipulihkan dalam rentang **14 hari** akan otomatis dihapus oleh sistem (*Auto-Expunged*).
- **Kebijakan Eviksi LRU** (*Least Recently Used Pruning*):
  Jika akumulasi ukuran draf lokal mendekati 15 MB atau jumlah draf melebihi 50 item:
  1. *Tahap 1*: Sistem otomatis menghapus seluruh draf yang telah melewati masa berlaku (`expiresAt <= now()`).
  2. *Tahap 2*: Sistem menghapus draf yang berstatus *Synced* (telah berhasil disimpan ke server).
  3. *Tahap 3*: Jika masih melebihi kuota, sistem menghapus draf tertua yang paling jarang diakses berdasarkan `lastSavedAt` (*LRU eviction*).
- **Pembersihan Draf Pasca-Submit Sukses**: Saat pengajar menekan tombol *"Simpan / Publikasikan Materi"* dan menerima konfirmasi *Success State* dari server API, sistem secara otomatis mengeksekusi perintah `DELETE` pada kunci draf terkait di IndexedDB sehingga ruang penyimpanan langsung dibebaskan.
- **Menu Pengelolaan Draf Mandiri**: Disediakan menu *"Pengaturan Draf & Cache Lokal"* pada profil pengguna yang menampilkan daftar draf lokal yang tersimpan beserta tombol *"Hapus Semua Draf Lokal"* untuk kontrol privasi dan kebersihan penyimpanan.


[ Kembali ke Daftar Isi](#daftar-isi)

---

# BAB 4: DIAGRAM MODUL DAN DYNAMIC RESOURCE HIERARCHY

## 4.1 Diagram Hierarki Modul Pembelajaran
Struktur domain model E-Learning UAY tersusun dalam hierarki yang terstruktur dan fleksibel:

```
E-Learning UAY Platform
├── [Modul Identitas & Sesi]
│   ├── SSO OIDC Auth Adapter
│   ├── User Local Cache & Role Scoping
│   └── Session & RBAC Middleware
├── [Modul Mata Kuliah & Rombel]
│   ├── Course (Mata Kuliah Induk)
│   ├── CourseClass (Kelas / Rombel Berjalan)
│   ├── ClassInstructor Assignment
│   └── Enrollment Management (Import / Key)
├── [Modul Sesi / Pertemuan (Dynamic Section)]
│   ├── Lecture Section (Sesi Perkuliahan Teori)
│   ├── Lab Practicum Section (Sesi Praktikum Laboratorium)
│   ├── Seminar / Thesis Section (Sesi Bimbingan / Sidang)
│   └── Workshop / Certification Section (Sesi Pelatihan)
├── [Modul Dynamic Resource Items]
│   ├── Rich Text / Teori Format
│   ├── Dokumen & Slide Presentasi (Page Tracking)
│   ├── Video Media (Watch Timestamp Tracking)
│   ├── Lab Assets (Dataset, Git Repo, Software Specs)
│   ├── Virtual Lab Simulator (Iframe Sandbox)
│   └── Teleconference (Zoom / Google Meet Integration)
├── [Modul Penilaian & Evaluasi]
│   ├── Question Bank (Bank Soal Multi-Tipe)
│   ├── Quiz Activity & Attempts
│   ├── Assignment Task & Versioned Submissions
│   ├── GradeCategory (Skema Pembobotan Nilai Otomatis)
│   └── Gradebook Matrix (Draft, Published, Final Score Engine)
├── [Modul Pelacakan Progress & Analitik]
│   ├── Video Progress Engine (Monotonic Upsert)
│   ├── Slide Page-Level Tracker
│   ├── Material Download Tracker
│   └── Aggregated Student & Class Progress Engine
├── [Modul Feedback & Konfirmasi Sistem]
│   ├── Realtime Toast & Blocker Handler
│   └── Anti-Double Submit Idempotency Engine
└── [Modul Tata Kelola & Audit Trail]
    ├── State Snapshot Capture (Before / After)
    └── Immutable Academic Audit Log
```

## 4.2 Desain Polimorfik, Pengurutan Dinamis, dan Kriteria Penyelesaian Aktivitas
Untuk mendukung fleksibilitas perkuliahan teori, praktikum laboratorium, responsi, seminar, hingga workshop, modul pembelajaran mengintegrasikan tiga mekanisme arsitektur utama:

1. **Desain Polimorfik Resource & Payload Dinamis (JSONB)**:
   Tabel `Section` merepresentasikan satu unit pertemuan dengan atribut `type` (`LECTURE`, `LAB_PRACTICUM`, `SEMINAR`, `WORKSHOP`, `EXAM`). Di dalam setiap pertemuan, terdapat daftar `ResourceItem` polimorfik yang menyimpan konfigurasi spesifik pada kolom `dynamicPayload` (tipe `JSONB` di PostgreSQL). Hal ini memungkinkan satu tabel model tunggal melayani materi teks blok, dokumen/slide, media video, dataset praktikum, repositori kode lab, hingga simulator virtual tanpa perlu memodifikasi skema basis data setiap kali ada tipe materi baru.

2. **Mesin Pengurutan Dinamis** (*Atomic Drag-and-Drop Reordering*):
   Setiap item aktivitas di dalam pertemuan memiliki atribut urutan `contentOrder: number`. Pengajar dapat mengubah urutan tampilan item secara leluasa melalui antarmuka web (*drag-and-drop*). Seluruh perubahan indeks urutan dieksekusi dalam satu transaksi atomik database (`prisma.$transaction`) untuk menjamin konsistensi urutan tampilan mahasiswa (*zero gap / zero duplicate order index*).

3. **Mesin Kriteria Penyelesaian Fleksibel** (*Configurable Completion Engine*):
   Setiap `ResourceItem` dapat dikonfigurasi kriteria penyelesaiannya secara mandiri oleh dosen pengampu:
   - `AUTOMATIC_ON_VIEW`: Materi otomatis ditandai selesai begitu dibuka oleh mahasiswa.
   - `MINIMUM_WATCH_PERCENT`: Mengharuskan tontonan video mencapai persentase durasi tertentu (misal: minimal 80%).
   - `ALL_PAGES_VIEWED`: Mengharuskan seluruh halaman slide/PDF dibuka secara lengkap oleh mahasiswa.
   - `CONFIRMED_DOWNLOAD`: Mengharuskan pengunduhan berkas modul atau dataset praktikum terkonfirmasi.

[ Kembali ke Daftar Isi](#daftar-isi)

---

# BAB 5: RANCANGAN DATA UMUM (ERD DAN SKEMA DATABASE LENGKAP)

## 5.1 Diagram Relasi Entitas (ERD)

```
┌──────────────────┐       1..n       ┌──────────────────────┐
│       User       ├─────────────────►│      Enrollment      │
│ (SSO Subject Id) │                  └──────────┬───────────┘
└────────┬─────────┘                             │ n..1
         │ 1..n                                  ▼
         │                            ┌──────────────────────┐
         ├───────────────────────────►│     CourseClass      │
         │ (Instructor)               └──────────┬───────────┘
         ▼                                       │ 1..n
┌──────────────────┐       1..n                  ▼
│      Course      ├─────────────────►┌──────────────────────┐
└──────────────────┘                  │  Section (Pertemuan) │
                                      └──────────┬───────────┘
                                                 │
                  ┌──────────────────────────────┼──────────────────────────────┐
                  │ 1..n                         │ 1..n                         │ 1..n
                  ▼                              ▼                              ▼
       ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
       │    ResourceItem    │         │        Quiz        │         │     Assignment     │
       │ (Dynamic Payload)  │         └──────────┬─────────┘         └──────────┬─────────┘
       └──────────┬─────────┘                    │                              │
                  │                              ▼                              ▼
      ┌───────────┼───────────┐       ┌────────────────────┐         ┌────────────────────┐
      ▼           ▼           ▼       │   GradeCategory    │         │AssignmentSubmission│
 VideoProg   SlideProg   Download     │(Pembobotan Otomatis│         │(Versioned History) │
 (WatchedSec)(ViewPages) (Idempotent) └──────────┬─────────┘         └────────────────────┘
                                                 │
                                                 ▼
                                      ┌────────────────────┐
                                      │  FinalGradeRecord  │
                                      │(Nilai Akhir & Huruf│
                                      └────────────────────┘
```

## 5.2 Skema Database Relasional (Prisma / PostgreSQL Schema)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// -------------------------------------------------------------
// 1. PENGGUNA & OTORISASI
// -------------------------------------------------------------
enum GlobalRole {
  SUPER_ADMIN
  DEPARTMENT_ADMIN
  INSTRUCTOR
  STUDENT
}

model User {
  id                 String       @id @default(uuid())
  externalSubjectId  String       @unique // Immutable UUID from SSO
  studentStaffNumber String       @unique // Official NIM or NIDN
  fullName           String
  email              String       @unique
  role               GlobalRole   @default(STUDENT)
  isActive           Boolean      @default(true)
  lastLoginAt        DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  instructedClasses  ClassInstructor[]
  enrollments        Enrollment[]
  videoProgresses    VideoProgress[]
  slideProgresses    SlideProgress[]
  downloads          MaterialDownload[]
  quizAttempts       QuizAttempt[]
  submissions        AssignmentSubmission[]
  gradedAnswers      QuizAnswerGrade[]
  finalGrades        FinalGradeRecord[]
  notifications      Notification[]
  auditLogs          AuditLog[]

  @@index([role, isActive])
}

// -------------------------------------------------------------
// 2. MATA KULIAH, KELAS, & KEANGGOTAAN
// -------------------------------------------------------------
enum CourseStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Course {
  id          String       @id @default(uuid())
  code        String       @unique // Misal: IF-2101
  title       String       // Nama Mata Kuliah
  description String?
  credits     Int          @default(3) // Jumlah SKS
  prodiCode   String       // Kode Program Studi
  status      CourseStatus @default(DRAFT)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  classes       CourseClass[]
  questionBanks QuestionBank[]
}

model CourseClass {
  id            String       @id @default(uuid())
  courseId      String
  course        Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  name          String       // Misal: Kelas A, Kelas Praktikum 1
  academicYear  String       // Misal: 2026/2027 Ganjil
  enrollmentKey String?      // Kunci pendaftaran mandiri jika dibuka
  status        CourseStatus @default(PUBLISHED)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  instructors     ClassInstructor[]
  enrollments     Enrollment[]
  sections        Section[]
  gradeCategories GradeCategory[]
  finalGrades     FinalGradeRecord[]
  announcements   Announcement[]

  @@index([courseId, academicYear])
}

model ClassInstructor {
  id        String      @id @default(uuid())
  classId   String
  class     CourseClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  isPrimary Boolean     @default(true) // Dosen Utama vs Pendamping / Asisten

  @@unique([classId, userId])
  @@index([userId])
}

model Enrollment {
  id         String      @id @default(uuid())
  classId    String
  class      CourseClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  userId     String
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  enrolledAt DateTime    @default(now())
  isActive   Boolean     @default(true)

  @@unique([classId, userId])
  @@index([userId])
}

// -------------------------------------------------------------
// 3. SECTION & DYNAMIC RESOURCE ENGINE
// -------------------------------------------------------------
enum SectionType {
  LECTURE
  LAB_PRACTICUM
  SEMINAR
  WORKSHOP
  EXAM
}

model Section {
  id          String      @id @default(uuid())
  classId     String
  class       CourseClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  title       String      // Misal: Pertemuan 1 - Konsep Pemrograman Web
  description String?
  type        SectionType @default(LECTURE)
  order       Int         @default(0)
  isVisible   Boolean     @default(true)
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  resources   ResourceItem[]
  quizzes     Quiz[]
  assignments Assignment[]

  @@unique([classId, order])
  @@index([classId])
}

enum ResourceType {
  RICH_TEXT
  DOCUMENT
  VIDEO_MEDIA
  LAB_PRACTICUM
  VIRTUAL_SIMULATOR
  TELECONFERENCE
  EXTERNAL_LINK
}

model ResourceItem {
  id                 String       @id @default(uuid())
  sectionId          String
  section            Section      @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  title              String
  description        String?
  resourceType       ResourceType
  dynamicPayload     Json         // Konfigurasi dinamis (gitRepo, dataset, videoId, iframeUrl)
  completionCriteria Json?        // Aturan penyelesaian otomatis
  contentOrder       Int          @default(0)
  isVisible          Boolean      @default(true)
  availableFrom      DateTime?
  availableUntil     DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  downloads       MaterialDownload[]
  videoProgresses VideoProgress[]
  slideProgresses SlideProgress[]

  @@index([sectionId, contentOrder])
}

// -------------------------------------------------------------
// 4. MESIN PELACAKAN PROGRESS BELAJAR
// -------------------------------------------------------------
model VideoProgress {
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  resourceItemId String
  resourceItem   ResourceItem @relation(fields: [resourceItemId], references: [id], onDelete: Cascade)
  watchedSec     Int          @default(0)
  lastPosition   Int          @default(0)
  percent        Float        @default(0.0)
  updatedAt      DateTime     @updatedAt

  @@id([userId, resourceItemId])
}

model SlideProgress {
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  resourceItemId String
  resourceItem   ResourceItem @relation(fields: [resourceItemId], references: [id], onDelete: Cascade)
  viewedPages    Json         @default("[]") // Array integer halaman unik yang dibuka: [1, 2, 3]
  currentPage    Int          @default(1)
  percent        Float        @default(0.0)
  updatedAt      DateTime     @updatedAt

  @@id([userId, resourceItemId])
}

model MaterialDownload {
  id             String       @id @default(uuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  resourceItemId String
  resourceItem   ResourceItem @relation(fields: [resourceItemId], references: [id], onDelete: Cascade)
  downloadedAt   DateTime     @default(now())

  @@unique([userId, resourceItemId])
  @@index([resourceItemId])
}

// -------------------------------------------------------------
// 5. PEMBOBOTAN NILAI OTOMATIS & EVALUASI
// -------------------------------------------------------------
enum AggregationMethod {
  SIMPLE_AVERAGE
  WEIGHTED_POINTS
  HIGHEST_SCORE
}

model GradeCategory {
  id                String            @id @default(uuid())
  classId           String
  class             CourseClass       @relation(fields: [classId], references: [id], onDelete: Cascade)
  name              String            // Misal: Tugas & Praktikum, Kuis, UTS, UAS, Progres
  weightPercent     Float             // Misal: 25.0 (Persen bobot dari 100%)
  aggregationMethod AggregationMethod @default(SIMPLE_AVERAGE)
  dropLowest        Int               @default(0) // Pilihan buang N nilai terendah
  order             Int               @default(0)
  createdAt         DateTime          @default(now())

  quizzes           Quiz[]
  assignments       Assignment[]

  @@index([classId, order])
}

model FinalGradeRecord {
  id                 String      @id @default(uuid())
  classId            String
  class              CourseClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  userId             String
  user               User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryScoresJson Json        // Snapshot nilai per kategori: { "Tugas": 88.0, "Kuis": 80.0, "UTS": 90.0, "UAS": 85.0 }
  finalScore         Float       // Nilai Akhir Angka (0.00 - 100.00)
  gradeLetter        String      // Nilai Huruf: A, A-, B+, B, B-, C+, C, D, E
  gradePoint         Float       // Indeks Mutu: 4.00, 3.75, 3.50, dll.
  isLocked           Boolean     @default(false) // Nilai dikunci dosen
  publishedAt        DateTime?
  updatedAt          DateTime    @updatedAt

  @@unique([classId, userId])
  @@index([classId])
}

// -------------------------------------------------------------
// 6. KUIS, BANK SOAL, & ATTEMPTS
// -------------------------------------------------------------
enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_SELECT
  TRUE_FALSE
  SHORT_ANSWER
  MATCHING
  ORDERING
  ESSAY
  FILE_UPLOAD
}

enum QuizReleaseMode {
  AUTO
  HIDDEN
  MANUAL
  SCHEDULED
}

model QuestionBank {
  id          String     @id @default(uuid())
  courseId    String
  course      Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title       String
  description String?
  createdAt   DateTime   @default(now())

  questions   Question[]
}

model Question {
  id             String        @id @default(uuid())
  questionBankId String?
  questionBank   QuestionBank? @relation(fields: [questionBankId], references: [id], onDelete: SetNull)
  quizId         String?
  quiz           Quiz?         @relation(fields: [quizId], references: [id], onDelete: Cascade)
  text           String        // Pertanyaan (dukungan teks kaya / LaTeX)
  type           QuestionType  @default(SINGLE_CHOICE)
  options        Json          // Array opsi: [{ id: "opt1", text: "...", isCorrect: true }]
  points         Float         @default(10.0)
  explanation    String?       // Penjelasan kunci jawaban
  order          Int           @default(0)
  createdAt      DateTime      @default(now())

  answerGrades   QuizAnswerGrade[]

  @@index([quizId, order])
}

model Quiz {
  id                 String          @id @default(uuid())
  sectionId          String
  section            Section         @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  gradeCategoryId    String?
  gradeCategory      GradeCategory?  @relation(fields: [gradeCategoryId], references: [id], onDelete: SetNull)
  title              String
  description        String?
  passingScore       Float           @default(60.0)
  timeLimitMinutes   Int?            // null = tidak ada batas waktu
  timerMode          String          @default("INDEPENDENT") // INDEPENDENT | SYNC_DEADLINE
  attemptLimit       Int             @default(1)
  randomizeQuestions Boolean         @default(false)
  randomizeOptions   Boolean         @default(false)
  resultReleaseMode  QuizReleaseMode @default(AUTO)
  resultReleaseAt    DateTime?
  availableFrom      DateTime?
  availableUntil     DateTime?
  contentOrder       Int             @default(0)
  isVisible          Boolean         @default(true)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  questions          Question[]
  attempts           QuizAttempt[]

  @@index([sectionId, contentOrder])
}

model QuizAttempt {
  id          String            @id @default(uuid())
  quizId      String
  quiz        Quiz              @relation(fields: [quizId], references: [id], onDelete: Cascade)
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  attemptNum  Int               @default(1)
  score       Float             @default(0.0)
  isPassed    Boolean           @default(false)
  answersJson Json              // Jawaban tersimpan: [{ questionId, selectedOptions, essayText }]
  startedAt   DateTime          @default(now())
  submittedAt DateTime?
  isGraded    Boolean           @default(false)

  answerGrades QuizAnswerGrade[]

  @@unique([quizId, userId, attemptNum])
  @@index([userId, quizId])
}

model QuizAnswerGrade {
  id         String      @id @default(uuid())
  attemptId  String
  attempt    QuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  questionId String
  question   Question    @relation(fields: [questionId], references: [id], onDelete: Cascade)
  graderId   String
  grader     User        @relation(fields: [graderId], references: [id], onDelete: Cascade)
  score      Float
  feedback   String?
  gradedAt   DateTime    @default(now())

  @@unique([attemptId, questionId])
  @@index([questionId])
}

// -------------------------------------------------------------
// 7. TUGAS (ASSIGNMENT) & SUBMISSION BERVERSI
// -------------------------------------------------------------
enum SubmissionStatus {
  SUBMITTED
  LATE
  GRADED
  SUPERSEDED
}

model Assignment {
  id              String         @id @default(uuid())
  sectionId       String
  section         Section        @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  gradeCategoryId String?
  gradeCategory   GradeCategory? @relation(fields: [gradeCategoryId], references: [id], onDelete: SetNull)
  title           String
  instructions    String         // Instruksi tugas
  maxScore        Float          @default(100.0)
  allowedFormats  Json           // Array: ["PDF", "ZIP", "LINK", "TEXT"]
  availableFrom   DateTime?
  deadline        DateTime?      // Batas waktu normal
  cutoffDate      DateTime?      // Batas akhir toleransi keterlambatan
  allowLate       Boolean        @default(true)
  maxAttempts     Int            @default(3)
  contentOrder    Int            @default(0)
  isVisible       Boolean        @default(true)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  submissions     AssignmentSubmission[]

  @@index([sectionId, contentOrder])
}

model AssignmentSubmission {
  id           String           @id @default(uuid())
  assignmentId String
  assignment   Assignment       @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  userId       String
  user         User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  version      Int              @default(1) // Versi pengumpulan (1, 2, 3)
  status       SubmissionStatus @default(SUBMITTED)
  textContent  String?
  fileObjectId String?          // Referensi ke File Service
  fileName     String?
  fileSizeBytes Int?
  externalUrl  String?
  score        Float?           // Nilai dari dosen
  feedback     String?          // Catatan/koreksi dosen
  isPublished  Boolean          @default(false) // Nilai Draft vs Published
  submittedAt  DateTime         @default(now())
  gradedAt     DateTime?

  @@unique([assignmentId, userId, version])
  @@index([assignmentId, userId])
}

// -------------------------------------------------------------
// 8. PENGUMUMAN & NOTIFIKASI
// -------------------------------------------------------------
model Announcement {
  id          String      @id @default(uuid())
  classId     String
  class       CourseClass @relation(fields: [classId], references: [id], onDelete: Cascade)
  title       String
  content     String
  authorId    String
  isPublished Boolean     @default(true)
  publishedAt DateTime    @default(now())
  createdAt   DateTime    @default(now())

  @@index([classId, publishedAt])
}

model Notification {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String    // GRADE_PUBLISHED | DEADLINE_REMINDER | ANNOUNCEMENT
  title     String
  message   String
  linkUrl   String?
  eventKey  String    // Kunci unik idempotensi: GRADE:classId:assignmentId:userId
  isRead    Boolean   @default(false)
  readAt    DateTime?
  createdAt DateTime  @default(now())

  @@unique([userId, eventKey])
  @@index([userId, isRead])
}

// -------------------------------------------------------------
// 9. AUDIT LOG & CHANGE DATA CAPTURE
// -------------------------------------------------------------
model AuditLog {
  id          String   @id @default(uuid())
  actorId     String?  // null jika dipicu oleh sistem otomatis
  user        User?    @relation(fields: [actorId], references: [id], onDelete: SetNull)
  actorRole   String
  action      String   // LOGIN | CREATE | UPDATE | DELETE | PUBLISH_GRADE | OVERRIDE_GRADE dll
  entity      String   // COURSE | CLASS | GRADE | SUBMISSION | QUIZ | FILE
  entityId    String
  classId     String?
  beforeState Json?    // Snapshot data sebelum mutasi
  afterState  Json?    // Snapshot data sesudah mutasi
  metadata    Json     // { clientIp, userAgent, reason, requestId }
  createdAt   DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([entity, entityId])
  @@index([classId, createdAt])
}
```

## 5.3 Aturan Proteksi Data dan Otorisasi Berbasis Kelas (Row-Level Authorization)
1. **Pemisahan Ruang Lingkup Kelas** (*Class Scoping*): Dosen hanya memiliki izin mutasi data (membuat materi, mengubah kuis, menginput nilai) pada kelas yang terdaftar dalam `ClassInstructor`.
2. **Proteksi Nilai Draft**: Nilai ujian/tugas berstatus `isPublished = false` difilter di level database/query sehingga tidak pernah terkirim ke klien mahasiswa sebelum dipublikasikan resmi.
3. **Isolasi Berkas Privat**: URL download file submission mahasiswa lain tidak dapat di-*generate* oleh mahasiswa biasa. Akses berkas dibatasi hanya untuk pemilik berkas dan dosen pengampu kelas.

[ Kembali ke Daftar Isi](#daftar-isi)

---

# BAB 6: TECH STACK DAN JUSTIFIKASI TEKNIS

## 6.1 Rekomendasi Teknologi
Berdasarkan kebutuhan kecepatan pengembangan, kemudahan pemeliharaan oleh tim 2 developer, keandalan transaksi ACID, serta target performa 1.000+ pengguna aktif, tech stack yang direkomendasikan adalah:

| Komponen | Teknologi Terpilih | Justifikasi & Keunggulan |
| :--- | :--- | :--- |
| **Frontend Web** | **React.js + Vite + TypeScript + Tailwind CSS** | Ekosistem komponen yang sangat matang, tipe data aman (*end-to-end type safety*), rendering cepat, dan kemudahan membangun antarmuka dinamis untuk video player dan PDF viewer. |
| **Backend API** | **Node.js + TypeScript (Express / Fastify)** | I/O asinkronus berperforma tinggi, ringan, mudah dirawat, dan berbagi tipe data (*shared types/schemas*) dengan frontend. |
| **Database** | **PostgreSQL (v16+)** | Basis data relasional standar industri dengan dukungan transaksi ACID yang kuat serta tipe data `JSONB` yang sangat efisien untuk menyimpan *state snapshot* audit log dan konfigurasi materi dinamis. |
| **ORM / Data Access** | **Prisma ORM** | Type-safe database client, migrasi skema deklaratif, dan performa tinggi untuk operasi relasional kompleks. |
| **In-Memory Cache & Queue**| **Redis + BullMQ** | Manajemen sesi pengguna, rate limiting, antrean debounce progress video/slide, dan pemrosesan notifikasi asinkronus. |
| **Pengujian & Kualitas** | **Vitest + Supertest + Zod** | Pengujian unit dan integrasi API yang cepat, dengan validasi runtime schema berbasis Zod untuk memastikan tidak ada payload cacat. |

## 6.2 Matriks Pertimbangan dan Efisiensi Tim 2 Developer
Dengan komposisi tim 2 pengembang:
- Penggunaan **TypeScript penuh (Fullstack TypeScript)** memungkinkan berbagi validasi skema (Zod) dan antarmuka model antara frontend dan backend tanpa duplikasi kode.
- Prisma ORM mengeliminasi pembuatan boilerplate SQL manual dan mencegah kesalahan penulisan nama kolom.
- Arsitektur modular *monorepo* atau struktur proyek terpadu memudahkan koordinasi dan pengujian bersama.

[ Kembali ke Daftar Isi](#daftar-isi)

---


## 6.3 Standar Rekayasa Perangkat Lunak dan Konvensi Kode (Engineering Standards & 100% English Codebase)
Seluruh tim pengembang **diwajibkan menerapkan standar penulisan kode 100% dalam Bahasa Inggris profesional** (*100% English Codebase Convention*) untuk menjamin kualitas kode, konsistensi teknis, dan kemudahan kolaborasi:

### 1. Prinsip Penamaan Kode (Naming Conventions):
- **Variabel, Fungsi, & Metode**: Menggunakan `camelCase` dalam Bahasa Inggris deskriptif (misal: `calculateFinalGrade()`, `submitQuizAttempt()`, `trackVideoProgress()`, `isEnrollmentActive`, `hasPendingGrades`).
- **Tipe Data, Interface, & Class**: Menggunakan `PascalCase` dalam Bahasa Inggris (misal: `CourseClassService`, `AssignmentSubmissionRecord`, `GradeCategoryConfig`, `QuizAttemptPayload`).
- **Skema Basis Data (Tabel & Kolom)**: Model menggunakan `PascalCase` tunggal dan kolom menggunakan `camelCase` Bahasa Inggris (misal: `studentStaffNumber`, `academicTerm`, `watchedSeconds`, `viewedPages`, `feedbackComment`).
- **Konstanta & Nilai Enum**: Menggunakan `UPPER_SNAKE_CASE` (misal: `GLOBAL_ROLE`, `SINGLE_CHOICE`, `SUBMISSION_STATUS`, `SIMPLE_AVERAGE`).
- **REST API Endpoints**: Menggunakan kata benda jamak dalam Bahasa Inggris berhuruf kecil dengan pemisah tanda hubung (*kebab-case*) (misal: `GET /api/v1/course-classes/:id/grade-categories`, `POST /api/v1/quizzes/:id/submit-attempt`).

### 2. Pemisahan Bahasa Kode vs Bahasa Tampilan (Separation of Concerns):
- **Kode Program (Backend & Frontend Core)**: 100% Bahasa Inggris murni (nama file, fungsi, type definitions, validasi Zod, skema basis data, dan dokumentasi docstring kode).
- **Bahasa Indonesia**: Digunakan secara terisolasi khusus pada berkas lokalisasi UI (*i18n resource files* seperti `id.json` untuk label tombol, teks panduan, dan pesan error ramah pengguna) serta dokumen laporan institusi.


[ Kembali ke Daftar Isi](#daftar-isi)

---

# BAB 7: SERVER, DEPLOYMENT, DAN STATE MACHINES

## 7.1 Topologi Server (Single-VPS Pilot menuju Multi-Container Scaling)

Untuk memastikan keandalan, ketersediaan tinggi, dan efisiensi biaya operasional, infrastruktur E-Learning UAY dirancang menggunakan arsitektur **Multi-Container terisolasi** yang dapat dijalankan secara efisien pada satu Virtual Private Server (Single-VPS) pada fase pilot, serta siap ditingkatkan (*scaled*) ke arsitektur multi-server saat jumlah pengguna bertambah.

### Spesifikasi Hardware Server Host (Minimum vs Rekomendasi):

| Parameter Hardware | Spesifikasi Minimum (*Minimum Spec*) | Spesifikasi Rekomendasi (*Recommended Spec*) |
| :--- | :--- | :--- |
| **Peruntukan Lingkungan** | **Fase Pilot / Uji Coba Terbatas**<br>(1 Program Studi / ~500 – 1.000 Mahasiswa) | **Fase Produksi Penuh Seluruh Kampus**<br>(Multi-Fakultas / ~3.000 – 5.000+ Mahasiswa) |
| **Processor (vCPU)** | **2 vCPU** (Frekuensi 2.4 GHz+) | **4 vCPU** (Frekuensi 3.0 GHz+ Compute-Optimized) |
| **Memori (RAM)** | **4 GB RAM** (DDR4) | **8 GB – 16 GB RAM** (DDR4 / DDR5 ECC) |
| **Penyimpanan (Storage)** | **50 GB NVMe SSD** | **100 GB – 150 GB NVMe SSD** (High IOPS) |
| **Sistem Operasi Host** | Ubuntu 22.04 / 24.04 LTS (64-bit Minimal) | Ubuntu 24.04 LTS (64-bit Minimal Server) |
| **Koneksi Jaringan / Bandwidth** | 100 Mbps Port (Bandwidth Unmetered) | 1 Gbps Port (Bandwidth Unmetered) |
| **Beban Puncak Konkurensi** | **150 – 250 pengguna aktif bersamaan**<br>(Cukup untuk kuis serentak 1–2 rombel) | **800 – 1.500 pengguna aktif bersamaan**<br>(Kuat melayani ujian serentak antar-fakultas) |

### Matriks Alokasi Sumber Daya per Kontainer (Docker Resource Allocation):

Setiap layanan kontainer dikonfigurasikan dengan alokasi batas memori (*limit*) dan jaminan sumber daya (*reservation*) untuk mencegah perebutan memori (*noisy neighbor problem*) dan risiko kehabisan memori (*Out-Of-Memory / OOM*):

| Kontainer Layanan | Komponen & Tugas Utama | Alokasi CPU (Reservation / Limit) | Alokasi RAM Minimum (Host 4 GB) | Alokasi RAM Rekomendasi (Host 8-16 GB) | Catatan Konfigurasi Optimasi |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`postgres-db`** | Database Relasional PostgreSQL 16 | 0.5 vCPU / 1.0 vCPU | 1.5 GB | 3.5 GB | Buffer cache dialokasikan: `shared_buffers = 1GB`, `max_connections = 150` |
| **`elearning-api`** | Backend Core (Node.js REST API) | 0.4 vCPU / 1.0 vCPU | 1.0 GB | 2.0 GB | Node heap limit diatur `--max-old-space-size=1536` |
| **`elearning-worker`** | BullMQ Background Jobs (Notifikasi, Evaluasi) | 0.2 vCPU / 0.5 vCPU | 384 MB | 1.0 GB | Memproses kalkulasi nilai & notifikasi antrean terisolasi |
| **`redis-cache`** | Cache, Session Blacklist, Rate Limiter | 0.1 vCPU / 0.3 vCPU | 256 MB | 512 MB | Konfigurasi `maxmemory 400mb`, policy `volatile-lru` |
| **`nginx-gateway`** | Reverse Proxy SSL, Gzip, Serving Frontend SPA | 0.1 vCPU / 0.4 vCPU | 128 MB | 256 MB | Gzip compression aktif, caching aset statis frontend |
| **OS Host & Cadangan** | Sistem Operasi Ubuntu, Docker Engine, Backup | 0.2 vCPU / 0.8 vCPU | 732 MB | 1.2 GB | Mencegah crash akibat *Out Of Memory (OOM)* |
| **TOTAL KEBUTUHAN** | **Kebutuhan Server Keseluruhan** | **2 vCPU / 4 vCPU** | **4.0 GB RAM** | **8.5 GB RAM (Cocok di VPS 8 GB - 16 GB)** | Seluruh alokasi terisolasi aman |

### Alokasi Partisi Penyimpanan Disk (Storage Allocation):

Server E-Learning UAY memiliki karakteristik penyimpanan yang sangat ramping karena menerapkan prinsip arsitektur **Zero-Binary Storage** (seluruh berkas fisik besar dialihkan ke File Service / MinIO S3):
- **Sistem Operasi & Docker Base Images**: ~15 GB
- **Database Master (PostgreSQL 16)**: ~20 – 30 GB (teks materi, butir soal, skema nilai, dan snapshot audit log)
- **Log File & Redis AOF/RDB Snapshot**: ~5 – 10 GB
- **Staging Berkas Backup Harian Lokal**: ~15 – 25 GB (disimpan sementara sebelum sinkronisasi otomatis ke offsite storage)
- **Total Kebutuhan Disk**: 50 GB (Minimum) hingga 100 GB (Rekomendasi).

### Diagram Topologi Kontainer Docker:

```
Production VPS Host (Ubuntu 24.04 LTS)
├── [Docker Network: uay-net]
│   ├── Container: nginx-reverse-proxy (Port 80/443 SSL Certbot)
│   ├── Container: elearning-web (React Static Build via Nginx)
│   ├── Container: elearning-api (Node.js REST Service Port 3000)
│   ├── Container: elearning-worker (BullMQ Background Jobs)
│   ├── Container: postgres-db (PostgreSQL 16 Volume Mount)
│   └── Container: redis-cache (Redis Alpine Volume Mount)
└── [Cron Host]: Script Backup Harian Otomatis ke Offsite Backup
```


### 7.1.1 Arsitektur Dual-Environment (Live Development Server & Production VPS)
Sistem dirancang dengan pemisahan lingkungan yang jelas antara **Live Development / Staging Server** (untuk pengujian berkelanjutan dan validasi tim PO/QA) serta **Production VPS** (untuk operasional resmi perkuliahan):

```
┌───────────────────────────────────────────────┐     ┌───────────────────────────────────────────────┐
│     1. LIVE DEV / STAGING SERVER              │     │     2. PRODUCTION VPS HOST                    │
│     (dev-elearning.uay.ac.id)                 │     │     (elearning.uay.ac.id)                     │
├───────────────────────────────────────────────┤     ├───────────────────────────────────────────────┤
│ • File: docker-compose.dev.yml                │     │ • File: docker-compose.prod.yml               │
│ • Database: elearning_dev (Sample Data)       │     │ • Database: elearning_prod (ACID Master Data) │
│ • Log Level: DEBUG / Verbose                  │     │ • Log Level: INFO / WARN / ERROR Only         │
│ • SSO: Staging Sandbox Client ID              │     │ • SSO: Official Production Client ID & Secret │
│ • File Service: Dev Bucket (Testing Uploads)  │     │ • File Service: Prod S3/MinIO Encrypted Bucket│
│ • Port Mapping: Exposed for easy debugging    │     │ • Port Mapping: Private (Only Nginx 80/443)   │
└───────────────────────────────────────────────┘     └───────────────────────────────────────────────┘
```

---

### 7.1.2 Berkas Konfigurasi Standar Docker & Nginx

#### 1. Dockerfile.api (Backend Node.js Multi-Stage Build):

```dockerfile
# Stage 1: Build & TypeScript Compilation
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# Stage 2: Production Runtime (Minimal Image ~120MB)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### 2. Dockerfile.web (Frontend React SPA Multi-Stage Build):

```dockerfile
# Stage 1: Build React/Vite App
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Lightweight Nginx Alpine (~25MB)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3. docker-compose.prod.yml (Konfigurasi Produksi VPS):

```yaml
version: '3.8'

networks:
  uay-net:
    driver: bridge

volumes:
  pg_data:
    driver: local
  redis_data:
    driver: local

services:
  nginx-gateway:
    image: nginx:alpine
    container_name: uay-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - elearning-web
      - elearning-api
    networks:
      - uay-net

  elearning-web:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: uay-frontend
    restart: always
    networks:
      - uay-net

  elearning-api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: uay-backend
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@postgres-db:5432/${DB_NAME}?schema=public
      - REDIS_URL=redis://redis-cache:6379
      - SSO_ISSUER_URL=${SSO_ISSUER_URL}
      - SSO_CLIENT_ID=${SSO_CLIENT_ID}
      - SSO_CLIENT_SECRET=${SSO_CLIENT_SECRET}
      - FILE_SERVICE_API_URL=${FILE_SERVICE_API_URL}
      - FILE_SERVICE_API_KEY=${FILE_SERVICE_API_KEY}
    depends_on:
      postgres-db:
        condition: service_healthy
      redis-cache:
        condition: service_healthy
    networks:
      - uay-net

  postgres-db:
    image: postgres:16-alpine
    container_name: uay-postgres
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - uay-net

  redis-cache:
    image: redis:7-alpine
    container_name: uay-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASS}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - uay-net
```

#### 4. docker-compose.dev.yml (Konfigurasi Live Development / Staging):

```yaml
version: '3.8'

networks:
  uay-dev-net:
    driver: bridge

services:
  elearning-api-dev:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: uay-api-dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:postgres@postgres-dev:5432/elearning_dev?schema=public
      - REDIS_URL=redis://redis-dev:6379
    volumes:
      - ./backend/src:/app/src
    networks:
      - uay-dev-net

  elearning-web-dev:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: uay-web-dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    networks:
      - uay-dev-net

  postgres-dev:
    image: postgres:16-alpine
    container_name: uay-pg-dev
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: elearning_dev
    networks:
      - uay-dev-net

  redis-dev:
    image: redis:7-alpine
    container_name: uay-redis-dev
    ports:
      - "6379:6379"
    networks:
      - uay-dev-net
```

#### 5. .env.example (Dokumentasi Variabel Lingkungan):

```ini
# --- APLIKASI UTAMA ---
NODE_ENV=production
PORT=3000
APP_PUBLIC_URL=https://elearning.uay.ac.id

# --- DATABASE POSTGRESQL ---
DB_USER=uay_admin
DB_PASS=SuperSecurePassword2026!
DB_NAME=elearning_uay_db

# --- REDIS IN-MEMORY CACHE ---
REDIS_PASS=RedisSecretAuthKey2026!

# --- INTEGRASI SSO / IDENTITY UAY ---
SSO_ISSUER_URL=https://sso.uay.ac.id
SSO_CLIENT_ID=elearning-uay-prod
SSO_CLIENT_SECRET=SecretOAuthTokenFromSSO2026
SSO_REDIRECT_URI=https://elearning.uay.ac.id/api/v1/auth/callback

# --- INTEGRASI FILE SERVICE UAY ---
FILE_SERVICE_API_URL=https://files.uay.ac.id/api/v1
FILE_SERVICE_API_KEY=SecretServiceTokenFromFS2026
```

#### 6. nginx/prod.conf (Konfigurasi Reverse Proxy Nginx & Keamanan SSL):
Konfigurasi Nginx diatur dengan standar keamanan produksi enterprise:
- **Protokol SSL/TLS Modern**: Menggunakan TLS 1.2 dan TLS 1.3 Let's Encrypt dengan cipher berstandar industri tinggi (`HIGH:!aNULL:!MD5`).
- **Pencegahan Serangan & Rate Limiting**: Menerapkan zona rate-limiting ketat pada rute otentikasi (`auth_limit` maksimal 5 req/detik) dan API umum (`api_limit` maksimal 30 req/detik) untuk memitigasi brute-force dan DDoS.
- **Security Headers Lengkap**: Menyematkan `X-Frame-Options: SAMEORIGIN` (anti-clickjacking), `X-Content-Type-Options: nosniff` (anti-MIME sniffing), `X-XSS-Protection`, dan `Referrer-Policy: strict-origin-when-cross-origin`.

```nginx
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # Rate Limiting Zone
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

    # HTTP Redirect to HTTPS
    server {
        listen 80;
        server_name elearning.uay.ac.id;
        return 301 https://$host$request_uri;
    }

    # HTTPS Production Gateway
    server {
        listen 443 ssl http2;
        server_name elearning.uay.ac.id;

        ssl_certificate /etc/letsencrypt/live/elearning.uay.ac.id/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/elearning.uay.ac.id/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Frontend SPA Static Routing
        location / {
            proxy_pass http://elearning-web:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Backend REST API Routing
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://elearning-api:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
        }

        # Auth Endpoint Strict Rate Limiting
        location /api/v1/auth/ {
            limit_req zone=auth_limit burst=5 nodelay;
            proxy_pass http://elearning-api:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```


[ Kembali ke Daftar Isi](#daftar-isi)

---

## 7.2 Strategi Backup Otomatis dan Disaster Recovery

Pencadangan data dan pemulihan bencana (*Disaster Recovery*) menerapkan **Model Tanggung Jawab Bersama** (*Shared Responsibility Model*) antara Tim Pengembang (*Developer*) dan Tim Server (*DevOps / Sysadmin Kampus*).

### 1. Model Tanggung Jawab Bersama (RACI Backup & Recovery):
- **Tanggung Jawab Tim Pengembang (Developer)**:
  - Menyediakan skrip pencadangan otomatis yang sadar struktur aplikasi (*application-aware*), mengeksekusi `pg_dump -Fc` secara konsisten dari dalam kontainer database tanpa merusak integritas transaksi yang sedang berjalan.
  - Menyediakan skrip pemulihan darurat (*recovery runbook*) yang menangani pemutusan koneksi aktif, restorasi skema/data, dan verifikasi tabel aktif.
  - Menjaga keselarasan referensi `fileObjectId` antara database E-Learning dengan penyimpanan objek di File Service.
- **Tanggung Jawab Tim Server / Sysadmin**:
  - Memasang dan mengelola penjadwalan *cron job* harian pada VPS host.
  - Menyediakan dan mengamankan media penyimpanan cadangan (NAS lokal kampus dan *bucket* Cloud Object Storage terisolasi / *offsite*).
  - Mengatur kebijakan retensi (7 hari lokal, 30 hari offsite) dan memantau ketersediaan kapasitas disk (*disk space alerting*).
  - Melakukan pemantauan status eksekusi (*monitoring & alert*) jika backup gagal berjalan.

### 2. Berkas Siap Pakai di Direktori deployment/scripts/:
Tim pengembang telah menyediakan paket otomasi lengkap yang siap digunakan langsung oleh tim server:
1. `deployment/scripts/backup.sh`:
   - Mengekspor database PostgreSQL (`elearning_uay_db`) dari kontainer `uay-postgres` menggunakan format custom terkompresi `pg_dump -Fc`.
   - Mengompresi berkas menjadi `.dump.gz` dan menghasilkan berkas hash verifikasi integritas **SHA-256 Checksum** (`.dump.gz.sha256`).
   - Otomatis membersihkan berkas cadangan lokal yang berumur lebih dari 7 hari (*retention rotation*).
   - Menyediakan hook integrasi *offsite sync* (misal: via `rclone` atau `rsync` ke NAS kampus).
2. `deployment/scripts/restore.sh`:
   - Melakukan pemulihan database dari berkas `.dump.gz` dengan satu baris perintah.
   - Dilengkapi konfirmasi pengaman manual (wajib mengetik `RESTORE-PROD`) atau flag `--force` untuk lingkungan staging.
   - Memverifikasi kecocokan checksum SHA-256 sebelum eksekusi penimpaan data.
   - Memutuskan seluruh koneksi aktif (`pg_terminate_backend`) dan mengeksekusi `pg_restore --clean --if-exists`.
   - Memvalidasi integritas pasca-restore dengan menghitung jumlah tabel aktif serta me-restart service backend (`uay-backend`) agar koneksi Prisma ORM kembali sinkron.
3. `deployment/scripts/backup.cron`:
   - Konfigurasi crontab Linux standar siap pasang untuk eksekusi otomatis setiap malam pukul **02.00 WIB** (`0 2 * * *`).
4. `deployment/scripts/README.md`:
   - Standar Operasional Prosedur (SOP) dan *Disaster Recovery Runbook* langkah-demi-langkah bagi tim server.

### 3. Parameter Pemulihan Bencana (Disaster Recovery SLA):
- **Recovery Point Objective (RPO)**: **Maksimal 24 Jam** (kehilangan data maksimal 1 hari jika terjadi insiden total, terjamin melalui eksekusi *nightly backup* pukul 02.00 WIB).
- **Recovery Time Objective (RTO)**: **Kurang dari 30 Menit** (waktu pemulihan hingga sistem aktif normal kembali pada server baru menggunakan Docker Compose dan skrip `restore.sh`).


## 7.3 Diagram Mesin Status (State Transition Diagrams)

### 1. State Machine: Kuis Mahasiswa (Quiz Attempt Lifecycle)

```
[ NOT_STARTED ] ───(Klik Mulai Kuis)───► [ IN_PROGRESS ]
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼ (Klik Submit Sebelum Batas)                                 ▼ (Timer Habis / Deadline Lewat)
        [ SUBMITTED_MANUAL ]                                          [ FORCE_SUBMITTED_SYSTEM ]
                 │                                                             │
                 └──────────────────────────────┬──────────────────────────────┘
                                                ▼
                                    [ EVALUATING_OBJECTIVE ]
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        ▼ (Jika Ada Soal Essay)                         ▼ (Semua Soal Pilihan Ganda)
              [ NEEDS_GRADING ]                                    [ GRADED_AUTO ]
                        │                                               │
                        ▼ (Dosen Selesai Menilai Essay)                 │
              [ GRADED_COMPLETE ] ◄─────────────────────────────────────┘
                        │
                        ▼ (Sesuai Aturan Rilis Nilai)
              [ RESULTS_PUBLISHED ]
```

### 2. State Machine: Tugas Mahasiswa (Assignment Submission Lifecycle)

```
[ UNASSIGNED / OPEN ] ───(Upload File / Input Teks)───► [ SUBMITTED ] (Status: ON_TIME atau LATE)
                                                               │
                               ┌───────────────────────────────┴───────────────────────────────┐
                               ▼ (Sebelum Cutoff Date: Resubmit)                               ▼ (Dosen Input Nilai & Catatan)
                     [ SUPERSEDED ]                                                   [ GRADED_DRAFT ]
                           │                                                                   │
                           ▼ (Membuat Record Versi Baru)                                       ▼ (Dosen Klik Publikasikan)
                 [ SUBMITTED (v2) ]                                                   [ GRADED_PUBLISHED ]
```

[ Kembali ke Daftar Isi](#daftar-isi)

---

# BAB 8: RENCANA PENGEMBANGAN, BOUNDARY VALUE ANALYSIS (BVA), DAN CAUSE-EFFECT ANALYSIS

## 8.1 Matriks Boundary Value Analysis (BVA) dan Penanganan Edge Cases

| Parameter / Fitur | Batas Bawah / Kasus Ekstrem Bawah | Nilai Normal | Batas Atas / Kasus Ekstrem Atas | Perilaku Sistem & Penanganan Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **Rekonsiliasi Impor Berkas** | Berkas 0 byte / tanpa baris data (Ditolak) | 1 – 500 baris data valid | > 500 baris per batch (Disarankan memecah file) | Menampilkan panel review diff baris valid vs cacat; pengguna memilih aksi abaikan, edit inline, atau timpa sebelum commit atomik. |
| **Total Bobot Nilai** | Total bobot < 100% (Ditolak) | Tepat 100.0% | Total bobot > 100% (Ditolak) | Sistem memblokir penguncian nilai akhir dan menampilkan banner peringatan *"Total bobot kategori harus tepat 100%"*. |
| **Ukuran Berkas Modul** | 0 Byte (Ditolak) | 1 – 20 MB | 50 MB (Maksimal Dokumen) | File 0 byte ditolak validasi; file > 50 MB ditolak pada saat pembuatan upload session presigned URL. |
| **Ukuran Berkas Video** | Direct upload tidak diizinkan untuk video besar | URL Embed (YouTube/Drive) | 100 MB (Maksimal Video Lokal) | Mengutamakan URL embed video eksternal (RES-005) guna menjaga bandwidth dan penyimpanan server. |
| **Durasi Timer Kuis** | 0 Menit (Ditolak) / 1 Menit (Minimum) | 15 – 120 Menit | 300 Menit (5 Jam Maksimum) | Validasi Zod schema memastikan durasi bernilai integer positif dalam rentang 1 s.d. 300 menit. |
| **Pengerjaan Lewat Deadline** | Attempt dimulai saat deadline kurang 1 menit | Sisa waktu timer normal | Waktu deadline tercapai sebelum timer habis | Sistem memotong durasi timer agar tidak melebihi deadline resmi kuis (*cutoff sync*). |
| **Batas Percobaan Kuis** | 0 Percobaan (Ditolak) | 1 – 3 Kali | Tak Terbatas (`null`) | Sistem mencegah pembuatan attempt ke-$(N+1)$ jika attempt ke-$N$ belum dikirimkan atau limit tercapai. |
| **Rentang Nilai Tugas/Kuis** | Nilai negatif (< 0.00, Ditolak) | 0.00 – 100.00 | Nilai > 100.00 (Ditolak) | Skor dibatasi floating-point presisi 2 desimal dengan validasi ketat `0 <= score <= 100`. |
| **Tenggat Tugas & Cut-off** | Upload sebelum `availableFrom` (Ditolak) | Pengumpulan normal | Upload setelah `cutoffDate` (Ditolak) | Pengumpulan antara `deadline` dan `cutoffDate` ditandai `LATE`; setelah `cutoffDate`, tombol upload dinonaktifkan dengan status blocker. |
| **Koreksi Nilai Dosen** | Dosen mengganti nilai tanpa alasan | Perubahan nilai normal | Nilai diubah berulang kali | Wajib menyertakan string alasan perubahan; setiap mutasi dicatat dalam tabel audit log before-after. |
| **Pelacakan Slide Halaman** | Nomor halaman < 1 atau > `totalPages` | Halaman 1 s.d. `totalPages` | Manipulasi array halaman palsu | Server memvalidasi bahwa setiap elemen dalam `viewedPages` adalah integer valid dalam rentang `1 <= page <= totalPages`. |
| **Concurrency Update Progress** | Multi-tab memutar video bersamaan | Heartbeat 5 detik sekali | Network lag / Re-order request | Menggunakan isolation level `Serializable` pada transaksi Prisma untuk mencegah inkonsistensi progress. |

## 8.2 Matriks Cause-Effect Analysis (Event-Driven State Changes)

| ID | Sebab (*Trigger Event & Conditions*) | Proses Bisnis & Validasi Sistem | Akibat (*System State, Notification, Feedback & Audit*) |
| :---: | :--- | :--- | :--- |
| **CE-01** | Pengajar menekan tombol **"Publikasikan Nilai"** pada Tugas X. | Sistem memverifikasi bahwa pengajar mengampu kelas tersebut dan nilai berstatus `DRAFT`. | 1. Status nilai -> `PUBLISHED`.<br>2. Banner hijau konfirmasi sukses tampil di layar dosen.<br>3. Mahasiswa terkait menerima `In-App Notification`.<br>4. Nilai tampil di dashboard siswa.<br>5. Audit log mencatat: `before: { isPublished: false }` $\rightarrow$ `after: { isPublished: true }`. |
| **CE-02** | Pengajar mengubah nilai mahasiswa dari 70 menjadi 85 pasca publikasi. | Sistem memvalidasi izin dosen dan mewajibkan pengisian `reason` perubahan nilai. | 1. Kolom `score` diperbarui menjadi 85.0.<br>2. Kalkulasi nilai akhir mahasiswa terhitung ulang otomatis.<br>3. Notifikasi revisi nilai terbit ke mahasiswa.<br>4. Audit log mencatat: `before: { score: 70.0 }` $\rightarrow$ `after: { score: 85.0, reason: "..." }`. |
| **CE-03** | Mahasiswa mengumpulkan revisi tugas (Resubmission) sebelum batas cutoff. | Sistem memeriksa bahwa jumlah attempt belum habis dan tugas belum dikunci. | 1. Dibuat record `AssignmentSubmission` baru dengan `version: n+1`.<br>2. Banner sukses pengumpulan versi baru tampil di layar mahasiswa.<br>3. Submission lama -> `SUPERSEDED`.<br>4. Status tugas dosen -> `NEEDS_GRADING`.<br>5. Audit log mencatat event `RESUBMIT_ASSIGNMENT`. |
| **CE-04** | Mahasiswa membuka halaman 5 dari 10 pada modul PDF praktikum. | Sistem memvalidasi bahwa mahasiswa terdaftar dan modul tersedia. | 1. Array `viewedPages` di-update menjadi `[..., 5]` secara unik.<br>2. Persentase slide dihitung ulang ($(\text{panjang array} / 10) \times 100\%$).<br>3. Agregasi progres belajar kelas diperbarui otomatis. |
| **CE-05** | Timer kuis mahasiswa habis saat sedang mengerjakan soal. | Server background worker mendeteksi `expiresAt <= now()` atau client mengirim sinyal timeout. | 1. Attempt kuis otomatis di-submit dengan jawaban tersimpan terakhir.<br>2. Soal pilihan ganda dinilai otomatis.<br>3. Status attempt -> `FORCE_SUBMITTED_SYSTEM`.<br>4. Mahasiswa melihat modal konfirmasi waktu habis.<br>5. Audit log mencatat event `QUIZ_AUTO_EXPIRE`. |
| **CE-06** | Mahasiswa mencoba mengakses kuis sebelum waktu `availableFrom`. | Sistem memeriksa jadwal pembukaan kuis. | 1. Aksi pengerjaan diblokir total (*Blocker State*).<br>2. Tampil callout pesan blocker: *"Kuis baru dapat diakses pada [Tanggal/Jam]"*.<br>3. Tombol 'Mulai Kuis' dinonaktifkan. |
| **CE-07** | Admin mengubah status Course menjadi `ARCHIVED`. | Admin mengarsipkan mata kuliah semester lalu. | 1. Seluruh kelas di bawah mata kuliah terkunci menjadi `READ_ONLY`.<br>2. Mahasiswa & dosen dilarang submit tugas/kuis baru.<br>3. Audit log mencatat mutasi status course `before: PUBLISHED` $\rightarrow$ `after: ARCHIVED`. |
| **CE-09** | Pengajar/Admin mengunggah berkas impor massal dengan 4 baris data cacat/duplikat. | Sistem memindai seluruh baris, memisahkan baris valid dari baris bermasalah (*Pre-commit Stage*). | 1. Tampil Panel Review Interaktif & Diff View.<br>2. Menampilkan nomor baris cacat dan alasan kendala.<br>3. Pengguna melakukan aksi koreksi (Hapus, Edit Inline, atau Timpa).<br>4. Tombol konfirmasi impor aktif setelah anomali terselesaikan.<br>5. Commit database atomik dieksekusi dan AuditLog mencatat event `BULK_IMPORT_RECONCILED`. |
| **CE-08** | Pengajar menghapus materi pembelajaran pada pertemuan. | Pengajar memilih hapus materi. | 1. Status `ResourceItem` ditandai `isVisible = false` (soft delete).<br>2. E-Learning kirim sinyal `MOVE_TO_TRASH` ke File Service (retensi 7 hari).<br>3. Toast konfirmasi berhasil hapus materi tampil.<br>4. Audit log mencatat aksi penghapusan file. |

## 8.3 Rencana Pengembangan Bertahap (Vertical Slice Stages)

```
[ TAHAP 1: Persiapan & SSO ] ──► [ TAHAP 2: File & Dynamic Engine ] ──► [ TAHAP 3: Assessment & Auto-Grading ]
                                                                                   │
[ TAHAP 5: Pilot & Sign-Off ] ◄─── [ TAHAP 4: Progress, Audit & Test ] ◄───────────┘
```

| Tahap | Fokus Pekerjaan | Rincian Fitur yang Dikerjakan | Estimasi Waktu | Hasil / Deliverable Utama |
| :---: | :--- | :--- | :---: | :--- |
| **Tahap 1** | **Infrastruktur & SSO** | Setup repositori, konfigurasi Prisma & PostgreSQL, integrasi OIDC SSO UAY, pemetaan pengguna & middleware peran. | 3 Hari | Otentikasi login/logout OIDC berfungsi mulus dengan routing dashboard berbasis peran. |
| **Tahap 2** | **File & Dynamic Engine** | Integrasi Upload Ticket File Service, pembuatan Course, Class, Section dinamis (Kuliah & Praktikum), dan Dynamic Resource Engine. | 4 Hari | Dosen dapat membuat rombel dan menyusun materi teks, slide, video, modul praktikum, dan virtual lab. |
| **Tahap 3** | **Assessment & Auto-Grading** | Bank Soal, Kuis Multi-Tipe, Tugas berversi, Skema Pembobotan Nilai Otomatis, dan Kalkulasi Nilai Akhir Instan. | 5 Hari | Mahasiswa dapat mengerjakan kuis & tugas; dosen mengonfigurasi bobot nilai dan sistem menghitung nilai akhir otomatis. |
| **Tahap 4** | **Progress, Audit & Feedback** | Video & Slide Progress Engine, Audit Log Before-After snapshot, Sistem Feedback/Blocker, in-app notification, dan automated testing. | 3 Hari | Progress belajar terekam presisi, mutasi data tercatat di audit log, dan interaksi UI memiliki feedback/blocker eksplisit. |
| **Tahap 5** | **Pilot Deployment** | Deployment ke VPS Staging/Production, konfigurasi SSL Nginx, load testing, pengujian UAT pilot pada Prodi Informatika. | 2 Hari | Sistem siap digunakan secara langsung (*production-ready*) untuk pilot perkuliahan dan praktikum. |

[ Kembali ke Daftar Isi](#daftar-isi)

---

# BAB 9: PERTANYAAN TERBUKA, MANAJEMEN RISIKO, DAN SIGN-OFF PRODUCT OWNER

## 9.1 Register Risiko Teknis dan Mitigasi

| ID Risiko | Deskripsi Risiko Teknis | Tingkat Risiko | Rencana Mitigasi Teknis |
| :---: | :--- | :---: | :--- |
| **RSK-01** | Lonjakan koneksi simultan (*traffic spike*) saat pembukaan kuis bersamaan. | **Tinggi** | Menggunakan koneksi pooling database (PgBouncer/Prisma pool), Redis caching untuk soal kuis, dan rate limiting. |
| **RSK-02** | Inkonsistensi data progress saat mahasiswa membuka materi di multi-tab. | **Sedang** | Menggunakan transaksi database berisolasi `Serializable` dan prinsip nilai yang hanya boleh bertambah (*monotonic increase*). |
| **RSK-03** | Kesalahan perhitungan nilai akhir manual oleh pengajar. | **Rendah** | Telah dimitigasi dengan mesin pembobotan otomatis (*Automated Grade Weighting Engine*) yang memvalidasi total bobot 100%. |
| **RSK-04** | Kebingungan pengguna saat aksi gagal atau diblokir sistem. | **Sedang** | Telah dimitigasi dengan *Feedback & Blocker Engine* yang menyajikan penjelasan kendala secara eksplisit dan solutif. |
| **RSK-05** | Sengketa nilai mahasiswa akibat pengubahan nilai tanpa jejak. | **Sedang** | Sistem audit log mewajibkan pencatatan *snapshot* nilai lama, nilai baru, identitas dosen, dan alasan perubahan (*reason*). |
| **RSK-06** | Kegagalan koneksi ke SSO atau File Service saat jam perkuliahan aktif. | **Sedang** | Menerapkan circuit breaker, retry exponential backoff, dan token caching lokal berdurasi pendek. |

## 9.2 Asumsi Operasional Sistem
- **Asumsi 1**: Identitas resmi mahasiswa dan dosen menggunakan NIM dan NIDN yang sinkron dari SSO UAY.
- **Asumsi 2**: File yang dihapus di E-Learning akan disimpan di tempat sampah (*Trash*) File Service selama 7 hari sebelum dibersihkan permanen.
- **Asumsi 3**: Zona waktu operasional sistem adalah Waktu Indonesia Bagian Barat (WIB / UTC+7).

## 9.3 Tabel Rekomendasi Developer dan Keputusan Product Owner

| Aspek Teknis | Pilihan / Rekomendasi Developer | Keputusan & Catatan Product Owner |
| :--- | :--- | :--- |
| **Arsitektur Konten** | Dynamic Polymorphic Resource Engine (mendukung kuliah teori, praktikum lab, seminar, dan workshop). | [ Dalam Penelaahan / Review ] |
| **Pelacakan Progress** | Detil hingga detik tonton video dan array halaman slide PDF yang dibuka (`viewedPages`). | [ Dalam Penelaahan / Review ] |
| **Pembobotan Nilai** | Automated Grade Weighting & Final Score Engine (bobot kategori otomatis + konversi huruf). | [ Dalam Penelaahan / Review ] |
| **Feedback & Blocker** | Standar 4 Status Respon (Success, Failure, Blocker Explanations, Progress Indicators + Anti Double-Submit). | [ Dalam Penelaahan / Review ] |
| **Audit Trail** | Pencatatan Before-After State Snapshot untuk nilai, tugas, kuis, file, dan status akun. | [ Dalam Penelaahan / Review ] |
| **Tech Stack** | Fullstack TypeScript (React.js + Node.js + PostgreSQL + Prisma + Redis). | [ Dalam Penelaahan / Review ] |
| **Topologi Deployment** | Single VPS Containerized Architecture (Docker Compose) untuk fase pilot. | [ Dalam Penelaahan / Review ] |
| **Cakupan Rilis Awal** | Fokus seluruh fitur P0 (Core Learning, Dynamic Lab, Assessment, Progress, Audit) untuk pilot Prodi Informatika. | [ Dalam Penelaahan / Review ] |

---
**Dokumen ini disusun sebagai proposal teknis resmi untuk ditelaah bersama oleh Product Owner, Tim Developer, Tim QA, dan Teknisi Server Platform E-Learning Universitas Achmad Yani (UAY) V3.0.**

