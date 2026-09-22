# DOKUMEN DESAIN TEKNIS (TECHNICAL DESIGN DOCUMENT)
# PLATFORM E-LEARNING UNIVERSITAS ACHMAD YANI (UAY) — VERSI 5.0
## EDISI SPESIFIKASI ARSITEKTUR & DESAIN LOGIKA SISTEM (VERSI PRODUCT OWNER)

**Platform Digital Pembelajaran Terpadu Teori & Praktikum Laboratorium**  
*Disusun khusus untuk Product Owner (PO) dan Pimpinan Akademik guna menyelaraskan visi produk dengan keputusan rekayasa perangkat lunak, arsitektur data, alur status, dan mitigasi risiko teknis.*

---

## DAFTAR ISI
- [Bab 1: Gambaran Sistem & Arsitektur Solusi](#bab-1-gambaran-sistem--arsitektur-solusi)
  - [1.1 Visi Teknis & Tujuan Rekayasa Platform](#11-visi-teknis--tujuan-rekayasa-platform)
  - [1.2 Model Tata Kelola Aktor & Matriks Wewenang (RBAC)](#12-model-tata-kelola-aktor--matriks-wewenang-rbac)
  - [1.3 Ekosistem 3 Layanan & Batasan Tanggung Jawab (Service Boundaries)](#13-ekosistem-3-layanan--batasan-tanggung-jawab-service-boundaries)
  - [1.4 Topologi Infrastruktur Server Bare-Metal Linux](#14-topologi-infrastruktur-server-bare-metal-linux)
- [Bab 2: Desain Integrasi & Protokol Komunikasi Antar-Layanan](#bab-2-desain-integrasi--protokol-komunikasi-antar-layanan)
  - [2.1 Alur Otentikasi OIDC & Verifikasi Token JWT (PKCE Flow)](#21-alur-otentikasi-oidc--verifikasi-token-jwt-pkce-flow)
  - [2.2 Mekanisme Keamanan Status Akun 3-Tier (Real-Time Revocation)](#22-mekanisme-keamanan-status-akun-3-tier-real-time-revocation)
  - [2.3 Integrasi File Service: Presigned URLs, Direct Streaming, & 7-Day Trash](#23-integrasi-file-service-presigned-urls-direct-streaming--7-day-trash)
  - [2.4 Pola Ketahanan Sistem & Circuit Breaker](#24-pola-ketahanan-sistem--circuit-breaker)
- [Bab 3: Desain Mesin Bisnis Inti (Core Business Logic Engines)](#bab-3-desain-mesin-bisnis-inti-core-business-logic-engines)
  - [3.1 Mesin Siklus Kelas & Course Cloning Bebas Residu Data](#31-mesin-siklus-kelas--course-cloning-bebas-residu-data)
  - [3.2 Mesin Konten Berbasis Blok Modular (Notion-Style Block Engine)](#32-mesin-konten-berbasis-blok-modular-notion-style-block-engine)
  - [3.3 Mesin Impor Massal Excel & Rekonsiliasi Data (Human-in-the-Loop)](#33-mesin-impor-massal-excel--rekonsiliasi-data-human-in-the-loop)
  - [3.4 Mesin Evaluasi Kuis 8 Tipe Soal & Skoring Hibrida](#34-mesin-evaluasi-kuis-8-tipe-soal--skoring-hibrida)
  - [3.5 Mesin Pembobotan Nilai Otomatis & Konversi Huruf Mutu UAY](#35-mesin-pembobotan-nilai-otomatis--konversi-huruf-mutu-uay)
  - [3.6 Mesin Pelacakan Progres Belajar Rinci (Granular Telemetry Engine)](#36-mesin-pelacakan-progres-belajar-rinci-granular-telemetry-engine)
  - [3.7 Mesin Pencatatan Jejak Audit Imutabel (Before-After State Snapshot)](#37-mesin-pencatatan-jejak-audit-imutabel-before-after-state-snapshot)
  - [3.8 Mesin Draf Lokal Offline & Pemulihan Data Otomatis (IndexedDB Storage)](#38-mesin-draf-lokal-offline--pemulihan-data-otomatis-indexeddb-storage)
- [Bab 4: Arsitektur Data & Pemodelan Entitas Konseptual](#bab-4-arsitektur-data--pemodelan-entitas-konseptual)
  - [4.1 Diagram Entitas Relasi Konseptual (Conceptual ERD)](#41-diagram-entitas-relasi-konseptual-conceptual-erd)
  - [4.2 Kamus Entitas Kunci Sistem](#42-kamus-entitas-kunci-sistem)
  - [4.3 Aturan Proteksi Data Tingkat Baris (Row-Level Multi-Tenancy Authorization)](#43-aturan-proteksi-data-tingkat-baris-row-level-multi-tenancy-authorization)
- [Bab 5: Diagram Mesin Status & Siklus Hidup Objek (State Machines)](#bab-5-diagram-mesin-status--siklus-hidup-objek-state-machines)
  - [5.1 Siklus Hidup Rombel Perkuliahan (Course Class Lifecycle)](#51-siklus-hidup-rombel-perkuliahan-course-class-lifecycle)
  - [5.2 Siklus Hidup Pengumpulan Tugas Mahasiswa (Assignment Submission Lifecycle)](#52-siklus-hidup-pengumpulan-tugas-mahasiswa-assignment-submission-lifecycle)
  - [5.3 Siklus Hidup Pengerjaan Kuis Ujian (Quiz Attempt Lifecycle)](#53-siklus-hidup-pengerjaan-kuis-ujian-quiz-attempt-lifecycle)
  - [5.4 Siklus Hidup Penerbitan Nilai (Gradebook Publishing Lifecycle)](#54-siklus-hidup-penerbitan-nilai-gradebook-publishing-lifecycle)
- [Bab 6: Analisis Nilai Batas (BVA) & Matriks Sebab-Akibat](#bab-6-analisis-nilai-batas-bva--matriks-sebab-akibat)
  - [6.1 Matriks Boundary Value Analysis (BVA) & Penanganan Kasus Ekstrem](#61-matriks-boundary-value-analysis-bva--penanganan-kasus-ekstrem)
  - [6.2 Matriks Sebab-Akibat Terpadu (Cause-Effect Event Matrix)](#62-matriks-sebab-akibat-terpadu-cause-effect-event-matrix)
- [Bab 7: Manajemen Risiko Teknis & Matriks Keputusan Product Owner](#bab-7-manajemen-risiko-teknis--matriks-keputusan-product-owner)
  - [7.1 Register Risiko Rekayasa & Strategi Mitigasi](#71-register-risiko-rekayasa--strategi-mitigasi)
  - [7.2 Asumsi Kapasitas Beban & Kinerja Konkurensi](#72-asumsi-kapasitas-beban--kinerja-konkurensi)
  - [7.3 Matriks Keputusan Arsitektur & Pengesahan PO (Sign-Off)](#73-matriks-keputusan-arsitektur--pengesahan-po-sign-off)

---

# BAB 1: GAMBARAN SISTEM & ARSITEKTUR SOLUSI

## 1.1 Visi Teknis & Tujuan Rekayasa Platform
Platform E-Learning Universitas Achmad Yani (UAY) dibangun sebagai sistem inti pembelajaran akademik (*core academic learning system*) yang menyatukan perkuliahan teori, praktikum laboratorium, bimbingan seminar, dan evaluasi hasil belajar ke dalam satu arsitektur terintegrasi.

Sebagai dokumen desain teknis untuk Product Owner, dokumen ini merumuskan 5 prinsip rekayasa yang mendasari setiap keputusan arsitektural:
1. **Pemisahan Layanan Mandiri (*Decoupled Micro-Services*)**: Memisahkan manajemen identitas (SSO), manajemen berkas fisik (File Service), dan logika akademik (E-Learning Engine) agar beban komputasi terdistribusi secara seimbang dan kegagalan pada satu subsistem tidak melumpuhkan seluruh platform.
2. **Kalkulasi & Rekonsiliasi Otomatis (*Automated Processing*)**: Mengeliminasi pekerjaan klerikal manual dosen melalui mesin pembobotan nilai otomatis berstandar SKS dan mesin koreksi kuis hibrida instan.
3. **Integritas Akademik & Ketertelusuran Mutlak (*Academic Traceability*)**: Setiap pengubahan nilai, draf soal ujian, dan riwayat tugas tercatat dalam buku besar jejak audit (*audit trail snapshot*) yang tidak dapat dimanipulasi (*immutable*).
4. **Ketahanan Koneksi Ekstrem (*Offline-First Resilience*)**: Menjaga data draf ketikan dosen dan pengerjaan ujian mahasiswa dari insiden listrik padam atau gangguan koneksi kampus melalui penyimpanan lokal browser berkala (*client-side auto-save*).
5. **Kedaulatan Infrastruktur Kampus (*Bare-Metal Native Deployment*)**: Mengoperasikan sistem secara langsung di atas server Linux universitas menggunakan runtime manager PM2 dan web server Nginx Native untuk efisiensi CPU dan RAM maksimum tanpa *overhead* virtualisasi kontainer.

---

## 1.2 Model Tata Kelola Aktor & Matriks Wewenang (RBAC)
Sistem menerapkan model **Role-Based Access Control (RBAC)** dengan isolasi otorisasi tingkat baris (*Row-Level Authorization*). Hal ini menjamin bahwa hak akses seorang pengguna dibatasi secara ketat berdasarkan perannya:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN (Tingkat Institusi)                 │
│                 Konfigurasi Platform, Master Mata Kuliah, Audit Log    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   ADMIN PRODI / LAB (Tingkat Fakultas & Lab)           │
│           Membuka Rombel Kelas, Assign Dosen Pengampu, Import Mhs      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DOSEN / ASISTEN LAB (Tingkat Kelas)                 │
│         Kelola 16 Pertemuan, Bank Soal, Koreksi Tugas, Publish Nilai   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      MAHASISWA (Tingkat Peserta Kelas)                 │
│           Akses Modul, Tonton Video, Kerjakan Kuis, Kumpul Tugas       │
└────────────────────────────────────────────────────────────────────────┘
```

### Matriks Wewenang Teknis (RBAC Permission Matrix):

| Modul Fungsional | Super Admin | Admin Prodi / Lab | Dosen / Asisten Lab | Mahasiswa Terdaftar |
| :--- | :---: | :---: | :---: | :---: |
| **Konfigurasi Global & Integrasi SSO** | Penuh (CRUD) | Baca | Tidak Ada | Tidak Ada |
| **Master Mata Kuliah (*Course*)** | Penuh (CRUD) | Buat / Edit Prodi | Baca | Tidak Ada |
| **Buka Kelas Rombel (*Class Rombel*)** | Baca / Hapus | Penuh (CRUD) | Baca | Tidak Ada |
| **Pendaftaran Mahasiswa (*Enrollment*)** | Kelola | Penuh (CRUD) | Tambah Manual | Akses Sendiri |
| **Penyusunan 16 Pertemuan & Materi** | Audit | Pantau | Penuh (Kelas Sendiri) | Baca |
| **Bank Soal & Penjadwalan Kuis** | Audit | Pantau | Penuh (Kelas Sendiri) | Kerjakan (Sesuai Timer) |
| **Koreksi Essay & Penilaian Tugas** | Audit | Pantau | Penuh (Kelas Sendiri) | Lihat Nilai (Jika Terbit) |
| **Pengaturan Bobot & Publish Nilai** | Audit | Rekapitulasi | Atur & Terbitkan | Lihat Nilai Resmi Sendiri |
| **Pencatatan Audit Trail Log** | Baca Seluruh Log | Baca Log Prodi | Baca Riwayat Kelas | Tidak Ada |

---

## 1.3 Ekosistem 3 Layanan & Batasan Tanggung Jawab (Service Boundaries)
Sistem dirancang dengan pemisahan batas domain (*domain boundaries*) yang tegas:

```
[ Klien Browser: Dosen & Mahasiswa ]
        │                    │                     │
        │ (1) Otentikasi     │ (2) Transaksi       │ (3) Streaming / Unduh
        ▼                    ▼                     ▼
┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐
│   SSO SERVICE   │  │ E-LEARNING CORE  │  │     FILE SERVICE      │
│ (Identitas Kampus│  │ (Mesin Akademik) │  │  (Brankas Dokumen)    │
│  & Single Login)│  │                  │  │                       │
└────────┬────────┘  └────────┬─────────┘  └───────────┬───────────┘
         │                    │                        │
         ▼                    ▼                        ▼
  [Database SSO]      [PostgreSQL 16]          [Object Storage S3/MinIO]
                      [ & Cache Redis 7]       [7-Day Trash Soft-Delete]
```

### Prinsip Kepemilikan Data (*Data Ownership Rules*):
1. **SSO Service (Penyedia Identitas & Otentikasi)**:
   - **Pemilik Tunggal**: Kredensial pengguna (NIM/NIDN, hash kata sandi Argon2/Bcrypt), data otentikasi multi-faktor, dan status keaktifan akun institusi (`ACTIVE`, `SUSPENDED`, `DISABLED`).
   - **Batasan E-Learning**: E-Learning **tidak pernah menyimpan kata sandi pengguna**. E-Learning hanya menyimpan penyelarasan data profil dasar (`externalSubjectId`, nama lengkap, email, NIM/NIDN) sebagai cache data lokal.
2. **File Service (Brankas Objek & Streaming Dokumen)**:
   - **Pemilik Tunggal**: Berkas biner fisik (modul PDF praktikum, video pembelajaran MP4, arsip tugas ZIP), hash integritas SHA-256, pemindaian antivirus, dan masa retensi pemulihan tempat sampah 7 hari (*7-day soft-delete trash*).
   - **Batasan E-Learning**: E-Learning **sama sekali tidak menyimpan file fisik** pada penyimpanannya (*Zero-Binary Storage*). E-Learning hanya mencatat referensi metadata file (`fileObjectId`, nama berkas, ukuran bytes, tipe MIME, dan izin visibilitas).
3. **E-Learning Core Service (Pusat Logika Akademik)**:
   - **Pemilik Tunggal**: Struktur kurikulum, hierarki sesi 16 pertemuan, blok materi Notion, bank soal, lembar pengerjaan kuis, draf dan versi revisi tugas, formula bobot persentase nilai, kalkulasi Gradebook, telemetri progres belajar, serta buku besar jejak audit.

---

## 1.4 Topologi Infrastruktur Server Bare-Metal Linux
Sistem dioperasikan langsung di atas server Linux Ubuntu 22.04 LTS (tanpa lapisan virtualisasi Docker) untuk menjamin latensi terendah dan utilitas prosesor yang optimal:

```
                      [ Pengguna: Dosen / Mahasiswa ]
                                     │
                                     ▼ HTTPS (Port 443)
                      ┌─────────────────────────────┐
                      │     Nginx Web Server Native │
                      │  - Terminasi SSL / TLS      │
                      │  - HTTP/2 & Gzip/Brotli     │
                      │  - Rate Limiting Proteksi   │
                      └──────┬───────────────┬──────┘
                             │               │
            ┌────────────────┘               └────────────────┐
            │ Proxy Pass Port 3000                            │ Servis Berkas Statis
            ▼                                                 ▼
┌───────────────────────────────────────┐         ┌───────────────────────┐
│     PM2 RUNTIME MANAGER CLUSTER       │         │   React Frontend SPA  │
│ ┌─────────────────┐ ┌───────────────┐ │         │   (Distribusi Aset    │
│ │ Worker API (1)  │ │ Worker API (2)│ │         │    Produksi Build)    │
│ └─────────────────┘ └───────────────┘ │         └───────────────────────┘
│ ┌─────────────────┐ ┌───────────────┐ │
│ │ Worker API (3)  │ │ BullMQ Worker │ │
│ └─────────────────┘ └───────────────┘ │
└───────────────────┬───────────────────┘
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
┌──────────────┐          ┌──────────────┐
│  PostgreSQL  │          │   Redis 7    │
│  Versi 16    │          │  Cache &     │
│ (Data Utama) │          │  Antrean Job │
└──────────────┘          └──────────────┘
```

### Keuntungan Arsitektur PM2 Native untuk PO:
* **Ketahanan Tanpa Waktu Henti (*Zero-Downtime Reload*)**: Saat tim pengembang merilis pembaruan versi atau perbaikan bug (*hotfix*), PM2 memuat ulang proses pekerja (*cluster workers*) secara bergantian satu per satu (*rolling reload*). Dosen dan mahasiswa yang sedang aktif belajar tidak mengalami layar error atau putus koneksi.
* **Pemisahan Jalur Komputasi Berat (*Dedicated BullMQ Background Worker*)**: Proses kalkulasi nilai akhir satu angkatan, pemrosesan file impor Excel ratusan mahasiswa, dan pengiriman notifikasi massal ditangani oleh *worker* latar belakang mandiri. Kinerja klik antarmuka web tetap responsif di bawah 200 milidetik.

---

# BAB 2: DESAIN INTEGRASI & PROTOKOL KOMUNIKASI ANTAR-LAYANAN

## 2.1 Alur Otentikasi OIDC & Verifikasi Token JWT (PKCE Flow)
Otentikasi pengguna mengadopsi standar industri **OpenID Connect (OIDC)** dengan protokol **Authorization Code Flow + PKCE (Proof Key for Code Exchange)** untuk mencegah penyadapan kredensial:

```
[ Browser Klien ]            [ E-Learning Frontend ]      [ SSO Identity Portal ]     [ E-Learning API Backend ]
       │                               │                             │                             │
       │───(1) Klik Tombol Login──────►│                             │                             │
       │                               │───(2) Redirect OIDC + PKCE─►│                             │
       │                               │       Challenge             │                             │
       │◄──(3) Form Login SSO Tampil─────────────────────────────────│                             │
       │───(4) Input NIM & Sandi────────────────────────────────────►│                             │
       │                               │◄──(5) Redirect dg Auth Code─│                             │
       │                               │       (Jika Kredensial Sah) │                             │
       │                               │                             │                             │
       │                               │───(6) Kirim Auth Code + PKCE Verifier────────────────────►│
       │                               │                                                           │──(7) Server-to-Server
       │                               │                                                           │      Token Request──► [SSO Endpoint]
       │                               │                                                           │◄─(8) Return Access Token
       │                               │                                                           │      & ID Token Claims
       │                               │◄──(9) Set Secure HttpOnly Session Cookie──────────────────│
       │◄──(10) Dashboard Siap Digunakan─────────────────────────────│
```

---

## 2.2 Mekanisme Keamanan Status Akun 3-Tier (Real-Time Revocation)
Untuk mencegah pengguna bermasalah (misal: mahasiswa nonaktif/cuti atau dosen yang dimutasi) tetap mengakses sistem, diterapkan mekanisme pengamanan 3 lapis:

```
                          LAPISAN PENGAMANAN STATUS AKUN
                                        │
    ┌───────────────────────────────────┼───────────────────────────────────┐
    ▼                                   ▼                                   ▼
[ Lapis 1: Verifikasi Token ]     [ Lapis 2: Refresh Token ]          [ Lapis 3: Redis Blacklist ]
Setiap request API memeriksa       Token aktif hanya berlaku          Begitu admin menonaktifkan
klaim status akun pada JWT.        15 menit. Saat perpanjangan,       akun di SSO, sinyal kilat
Jika bukan ACTIVE, sistem          sistem wajib validasi status       masuk ke Redis Blacklist.
langsung menolak detik itu juga.   terkini ke database SSO.           Sesi pengguna seketika putus.
```

1. **Lapis 1 (Pemeriksaan Klaim Instan)**: Token JWT membawa parameter `account_status: "ACTIVE"`. Jika bernilai selain itu, gateway API langsung menolak akses (*HTTP 403 Forbidden*).
2. **Lapis 2 (Masa Hidup Token Pendek / 15-Minute TTL)**: Token hanya berlaku selama 15 menit. Setiap siklus perpanjangan otomatis di latar belakang (*silent refresh*), sistem mengecek ulang keaslian status akun langsung ke database SSO.
3. **Lapis 3 (Pencabutan Seketika via Redis Blacklist)**: Jika Super Admin menonaktifkan akun di portal SSO, SSO memancarkan pesan pembatalan instan (*instant revocation event*) ke Redis. E-Learning seketika memblokir akun tersebut dalam hitungan milidetik tanpa perlu menunggu masa 15 menit habis.

---

## 2.3 Integrasi File Service: Presigned URLs, Direct Streaming, & 7-Day Trash
Arsitektur penanganan berkas dirancang agar server utama E-Learning tidak terbebani oleh lalu lintas data berukuran gigabyte:

```
[ Browser Klien / Dosen ]      [ E-Learning Core API ]             [ File Service ]           [ S3 / MinIO Storage ]
          │                               │                               │                             │
          │──(1) Minta Izin Unggah───────►│                               │                             │
          │      (Metadata File & Ukuran) │──(2) Generate Presigned Ticket│                             │
          │                               │      (Otorisasi & Hak Akses) ─►│                            │
          │                               │                               │──(3) Terbitkan Signed URL──►│
          │                               │◄─(4) Kirimkan Presigned URL───│      (Valid 15 Menit)       │
          │◄─(5) Kembalikan URL Unggah────│                                                             │
          │                                                                                             │
          │──(6) UNGGAH LANGSUNG DOKUMEN / VIDEO BESAR (Direct Streaming)──────────────────────────────►│
          │                                                                                             │
          │──(7) Konfirmasi Selesai──────►│ (Mencatat FileRef di Database)                              │
```

### Keamanan Berkas & Perlindungan Human-Error:
* **Tautan Berkas Terproteksi (*Private Presigned Download*)**: Berkas tugas mahasiswa dan soal ujian tidak pernah memiliki URL publik statis. Sistem menghasilkan tautan bertanda tangan kriptografis dengan masa kedaluwarsa 15 menit khusus untuk pengguna yang sah. Mahasiswa lain tidak bisa mengintip berkas temannya.
* **Keranjang Sampah 7 Hari (*7-Day Trash Policy*)**: Jika dosen secara tidak sengaja menghapus materi atau tugas, berkas fisik tidak dihapus seketika dari media penyimpanan. Berkas dipindahkan ke status karantina sampah (*trash*) selama 7 hari kalender dan dapat dipulihkan (*Restore*) utuh dengan satu klik.

---

## 2.4 Pola Ketahanan Sistem & Circuit Breaker
Jika layanan eksternal (misal: SSO atau File Service) mengalami penurunan kecepatan respons (*degraded performance*) atau gangguan jaringan, E-Learning mengaktifkan pola **Circuit Breaker**:
* Jika 5 permintaan berturut-turut mengalami kegagalan/timeout, sirkuit berpindah ke status **Open (Terbuka)**.
* Sistem tidak lagi membebani layanan yang sedang bermasalah dengan antrean panggilan baru, melainkan menampilkan pesan informatif yang ramah kepada pengguna (*"Layanan penyimpanan berkas sedang dalam pemeliharaan berkala"*).
* Setelah 30 detik, sirkuit mencoba 1 permintaan percobaan (*Half-Open*). Jika berhasil, sirkuit kembali ke status **Closed (Normal)** secara otomatis.

---

# BAB 3: DESAIN MESIN BISNIS INTI (CORE BUSINESS LOGIC ENGINES)

## 3.1 Mesin Siklus Kelas & Course Cloning Bebas Residu Data
Untuk efisiensi administrasi semester baru tanpa mengorbankan riwayat akademik angkatan sebelumnya, sistem menyediakan mesin duplikasi kelas (*Clean-Slate Course Cloning Engine*):

```
KELAS SEMESTER LAMA (Contoh: Semester Ganjil 2025/2026)
  • 16 Pertemuan, Teks Materi, Slide PDF, Video, Soal Kuis, Aturan Bobot Nilai
  • 45 Mahasiswa Terdaftar, 45 Riwayat Tugas, Nilai Akhir & Transkrip
                                   │
                                   ▼ [ Dosen Klik: "Arsipkan & Duplikasi Kelas" ]
  ┌────────────────────────────────┴────────────────────────────────┐
  │                                                                 │
  ▼                                                                 ▼
KELAS LAMA DIARSIPKAN (ARCHIVED)                  KELAS BARU TERBENTUK (ACTIVE)
• Status dikunci permanen (Read-Only).            • Struktur 16 pertemuan utuh tersalin.
• Mahasiswa lama tetap bisa melihat materi        • Teks, slide, video, & bank soal utuh.
  dan transkrip nilai sebagai portofolio.         • Skema persentase bobot nilai tersalin.
• Mencegah manipulasi perubahan nilai susulan.    • BERSIH TOTAL: 0 Mahasiswa terdaftar,
                                                    0 Riwayat tugas lama, 0 Lembar jawaban.
```

---

## 3.2 Mesin Konten Berbasis Blok Modular (Notion-Style Block Engine)
Materi perkuliahan disimpan dalam format dokumen blok modular berbasis JSON terstruktur. Format ini memungkinkan kebebasan penyusunan materi setara aplikasi modern seperti Notion:

### Struktur Hierarki Blok Konten (JSON Architecture):
Setiap sesi materi terdiri dari larik (*array*) blok mandiri dengan identitas unik:
```json
[
  {
    "id": "blk_01HZX8",
    "type": "heading_1",
    "content": { "text": "Pertemuan 02: Analisis Algoritma Rekursif" }
  },
  {
    "id": "blk_01HZX9",
    "type": "callout",
    "content": {
      "variant": "warning",
      "icon": "alert-triangle",
      "text": "Wajib membaca modul praktikum LKP-02 sebelum kelas dimulai di laboratorium."
    }
  },
  {
    "id": "blk_01HZXA",
    "type": "code_sandbox",
    "content": {
      "language": "python",
      "code": "def faktorial(n):\n    return 1 if n <= 1 else n * faktorial(n - 1)"
    }
  },
  {
    "id": "blk_01HZB1",
    "type": "equation",
    "content": { "latex": "T(n) = 2T(n/2) + O(n)" }
  }
]
```

### Keunggulan Format Blok bagi PO:
1. **Dukungan Kuliah Teori & Praktikum Lab**: Mendukung blok kode interaktif dengan pewarnaan sintaks (*syntax highlighting*), rumus matematika tajam berbasis LaTeX, checklist tahapan modul praktikum, kotak peringatan keselamatan kerja lab (*callout*), serta sematan video.
2. **Perintah Cepat Garis Miring (`/`)**: Dosen cukup menekan tombol `/` untuk memunculkan palet pilihan blok tanpa harus mencari ikon menu.
3. **Pemuatan Parsial Ringan (*Lazy Rendering*)**: Browser pengguna hanya me-render blok yang terlihat di layar, sehingga halaman materi sepanjang puluhan halaman tetap ringan dibuka dari ponsel pintar.

---

## 3.3 Mesin Impor Massal Excel & Rekonsiliasi Data (Human-in-the-Loop)
Untuk mencegah kegagalan proses data massal ribuan peserta atau ratusan butir soal kuis, sistem menolak pendekatan kaku (*all-or-nothing rollback*). Sebaliknya, sistem menggunakan pendekatan **Staging Area Interaktif**:

```
[ Berkas Excel Diunggah Dosen ]
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. VALIDASI FORMAT & ANOMALI STRUKTURAL (PARSING ENGINE):                   │
│    • Deteksi kolom kosong wajib (Missing Fields).                           │
│    • Deteksi duplikasi identitas (Duplikasi NIM atau Soal).                 │
│    • Deteksi nilai angka di luar batas (Misal: Skor 150 atau Nilai Minus).  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. PANEL REKONSILIASI INTERAKTIF (HUMAN-IN-THE-LOOP PREVIEW):               │
│    Sistem memisahkan data menjadi dua tab:                                  │
│    - Tab Hijau (Data Valid): Siap disimpan ke basis data secara instan.     │
│    - Tab Merah (Data Bermasalah): Ditandai letak baris dan sel keliru.      │
│                                                                             │
│    Dosen dapat:                                                             │
│    a. Memperbaiki angka/huruf salah langsung di tabel web tanpa buka Excel. │
│    b. Mengklik opsi "Abaikan Baris Bermasalah & Simpan yang Sah Saja".      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
[ Klik Tombol "Konfirmasi & Komit Data" ] ──► Data Bersih Tersimpan Permanen
```

---

## 3.4 Mesin Evaluasi Kuis 8 Tipe Soal & Skoring Hibrida

### 1. Spesifikasi 8 Tipe Soal Evaluasi:
Sistem mendukung spektrum evaluasi akademik yang komprehensif:

| No | Tipe Soal Evaluasi | Mekanisme Penilaian Sistem | Karakteristik Jawaban |
| :---: | :--- | :--- | :--- |
| **1** | **Pilihan Ganda Tunggal** | Otomatis Instan (0 / 100% Poin) | Memilih 1 kunci jawaban benar (A, B, C, D, E). |
| **2** | **Pilihan Ganda Majemuk** | Otomatis Proporsional Sebagian | Memilih lebih dari 1 opsi benar. Salah pilih mengurangi poin parsial secara terukur (*Partial Grading*). |
| **3** | **Benar / Salah** | Otomatis Instan (0 / 100% Poin) | Verifikasi ketepatan premis/pernyataan cepat. |
| **4** | **Isian Singkat / Numerik** | Otomatis Toleransi Selisih | Menilai kata kunci eksak atau angka dengan toleransi selisih ($x \pm \Delta$). |
| **5** | **Menjodohkan Pasangan** | Otomatis Proporsional Sebagian | Menghubungkan premis sisi kiri dengan opsi sisi kanan. |
| **6** | **Mengurutkan Prosedur** | Otomatis Proporsional Posisi | Mengurutkan tahapan praktikum/algoritma secara benar. |
| **7** | **Essay / Uraian Bebas** | Hibrida (Antrean Koreksi Dosen) | Jawaban teks panjang yang dinilai manual oleh dosen dengan rubrik penilaian. |
| **8** | **Unggah Berkas Lembar Kerja** | Hibrida (Antrean Koreksi Dosen) | Unggahan foto perhitungan tangan, PDF laporan, atau arsip proyek pemrograman. |

---

### 2. Alur Skoring Hibrida (*Hybrid Grading Workflow*):
Untuk kuis campuran (soal pilihan ganda + essay):
```
[ Mahasiswa Kumpulkan Kuis ]
             │
             ├──► [ Soal Objektif (Tipe 1-6) ] ──► Otomatis Ternilai Seketika
             │
             └──► [ Soal Subjektif (Tipe 7-8) ] ─► Masuk Antrean: "Menunggu Penilaian Dosen"
                                                                │
                                                                ▼
                                                   [ Dosen Masukkan Nilai Essay ]
                                                                │
                                                                ▼
                                                   [ Mesin Gabungkan Total Skor ]
                                                   [ Terbitkan Nilai Akhir Kuis ]
```

---

## 3.5 Mesin Pembobotan Nilai Otomatis & Konversi Huruf Mutu UAY
Sistem mengeliminasi risiko kelalaian perhitungan manual dosen dengan **Mesin Kalkulasi Otomatis Berbobot Persentase**:

### 1. Formula Perhitungan Nilai Akhir Kelas:
Dosen menetapkan komposisi persentase kategori penilaian di awal semester (wajib berjumlah tepat 100%):

$$\text{Nilai Akhir} = \sum_{i=1}^{n} \left( \overline{\text{Skor Kategori}_i} \times \frac{\text{Bobot}_i}{100} \right)$$

Sebagai contoh konfigurasi perkuliahan berbobot standar:
* **Tugas Mandiri & Modul Praktikum**: $25\%$
* **Kuis Pemahaman & Responsi**: $15\%$
* **Ujian Tengah Semester (UTS)**: $25\%$
* **Ujian Akhir Semester (UAS)**: $25\%$
* **Partisipasi & Progres Belajar**: $10\%$

$$\text{Nilai Akhir} = (Tugas \times 0.25) + (Kuis \times 0.15) + (UTS \times 0.25) + (UAS \times 0.25) + (Progres \times 0.10)$$

---

### 2. Standar Konversi Huruf Mutu Resmi Universitas Achmad Yani:
Begitu seluruh angka terisi, mesin seketika memetakan skor angka ke dalam skala huruf mutu dan indeks prestasi resmi:

| Rentang Skor Angka Akhir | Huruf Mutu Resmi | Bobot Indeks Mutu | Keterangan Status Akademik |
| :---: | :---: | :---: | :--- |
| **$\ge 85.00$** | **A** | **4.00** | Sangat Memuaskan (Pujian Terbuka) |
| **$80.00 - 84.99$** | **A-** | **3.75** | Sangat Baik |
| **$75.00 - 79.99$** | **B+** | **3.50** | Baik Sekali |
| **$70.00 - 74.99$** | **B** | **3.00** | Baik |
| **$65.00 - 69.99$** | **B-** | **2.75** | Cukup Baik |
| **$60.00 - 64.99$** | **C+** | **2.50** | Cukup |
| **$55.00 - 59.99$** | **C** | **2.00** | Kurang (Batas Minimal Kelulusan S-1) |
| **$45.00 - 54.99$** | **D** | **1.00** | Tidak Lulus (Wajib Mengulang Semester) |
| **$< 45.00$** | **E** | **0.00** | Gagal Mutlak |

---

## 3.6 Mesin Pelacakan Progres Belajar Rinci (Granular Telemetry Engine)
Mencegah kecurangan mahasiswa yang memanipulasi progres belajar dengan melompati bacaan atau video:
1. **Pelacakan Video Anti-Lompat (*Anti-Skip Heartbeat Telemetry*)**:
   - Pemutar video mengirimkan sinyal detak (*telemetry heartbeat*) setiap 5 detik berisi posisi tontonan aktual.
   - Jika kursor digeser secara mendadak dari menit ke-2 ke menit ke-25, lonjakan tersebut diabaikan. Durasi yang diakui hanya detik-detik yang benar-benar diputar secara alami.
2. **Pelacakan Modul Slide / Dokumen PDF Berbasis Halaman Terbuka**:
   - Sistem mendeteksi nomor halaman yang aktif terbuka di jendela layar pembaca (*viewport*).
   - Progres membaca dokumen dihitung berdasarkan rasio halaman unik yang telah dibuka terhadap total halaman dokumen:
     $$\text{Progres PDF (\%)} = \left( \frac{\text{Jumlah Halaman Unik yang Telah Dibaca}}{\text{Total Halaman Dokumen}} \right) \times 100\%$$
3. **Penyelesaian Otomatis saat Mengunduh Aset Praktikum**:
   - Untuk berkas lembar kerja praktikum (LKP) atau *source code skeleton*, penandaan selesai tercatat secara otomatis saat *token* unduhan berhasil dieksekusi.

---

## 3.7 Mesin Pencatatan Jejak Audit Imutabel (Before-After State Snapshot)
Untuk melindungi kampus dari potensi gugatan atau kecurigaan manipulasi nilai:
* **Pencatatan Kondisi Sebelum-Sesudah (*Before-After State Snapshot*)**: Setiap kali nilai yang telah terpublikasi dikoreksi oleh dosen, sistem merekam kondisi lama, kondisi baru, identitas dosen, serta **alasan wajib perubahan** dalam format JSON imutabel.
* **Buku Besar Audit Log Transparan**:
  ```json
  {
    "auditId": "aud_01HZ9K2",
    "action": "GRADE_OVERRIDE",
    "actor": { "nidn": "0412088501", "name": "Dr. Ir. Ahmad Junaidi, M.T." },
    "student": { "nim": "2210511045", "name": "Budi Santoso" },
    "context": { "courseClass": "Pemrograman Web - Kelas A", "assessment": "Tugas 02" },
    "stateTransition": {
      "scoreBefore": 65.0,
      "scoreAfter": 88.0,
      "gradeLetterBefore": "B-",
      "gradeLetterAfter": "A"
    },
    "mandatoryReason": "Mahasiswa mengumpulkan revisi repositori kode yang valid sebelum toleransi cut-off berakhir.",
    "timestamp": "2026-09-21T09:42:15.120Z"
  }
  ```

---

## 3.8 Mesin Draf Lokal Offline & Pemulihan Data Otomatis (IndexedDB Storage)
Mengatasi insiden listrik padam mendadak di kampus atau koneksi Wi-Fi terputus:
* **Penyimpanan Lokal Browser (*Client-Side Auto-Save*)**: Saat dosen mengetik penjelasan materi atau mahasiswa mengetik jawaban essay ujian, mesin menyimpan draf secara otomatis ke basis data lokal peramban (*IndexedDB*) setiap 2 detik.
* **Dialog Pemulihan Cerdas (*One-Click Draft Recovery*)**: Jika peramban ditutup paksa atau komputer mati, saat halaman dibuka kembali sistem mendeteksi perbedaan versi antara server dan penyimpanan lokal. Sistem menampilkan notifikasi: *"Ditemukan draf lokal terakhir Anda (disimpan 3 menit lalu). Pulihkan Tulisan?"* sehingga tidak ada satu kalimat pun yang hilang.

---

# BAB 4: ARSITEKTUR DATA & PEMODELAN ENTITAS KONSEPTUAL

## 4.1 Diagram Entitas Relasi Konseptual (Conceptual ERD)
Hubungan antar-entitas data utama dalam arsitektur E-Learning UAY disajikan dalam diagram konseptual berikut:

```
┌─────────────────┐       1..N       ┌────────────────────────┐
│  MATA KULIAH    │─────────────────►│     KELAS ROMBEL       │
│  (Course Master)│                  │     (Course Class)     │
└─────────────────┘                  └───────────┬────────────┘
                                                 │
                                 ┌───────────────┼───────────────┐
                                 │ 1..N          │ 1..N          │ 1..N
                                 ▼               ▼               ▼
                        ┌────────────────┐┌─────────────┐┌────────────────┐
                        │   PERTEMUAN    ││ PENDAFTARAN ││ SKEMA BOBOT    │
                        │   (Section)    ││ (Enrollment)││ (Grade Weight) │
                        └───────┬────────┘└──────┬──────┘└────────┬───────┘
                                │ 1..N           │                │
                                ▼                │                │
                        ┌────────────────┐       │                │
                        │ DYNAMIC ASSET  │       │                │
                        │ Materi / Video │       │                │
                        │ / Modul Lab    │       │                │
                        └───────┬────────┘       │                │
                                │ 1..1           │                │
                                ▼                │                │
                        ┌────────────────┐       │                │
                        │ EVALUASI / KUIS│       │                │
                        │   (Assessment) │       │                │
                        └───────┬────────┘       │                │
                                │ 1..N           │                │
                                ▼                ▼                ▼
                        ┌─────────────────────────────────────────────────┐
                        │              BUKU NILAI RESMI                   │
                        │                 (Gradebook)                     │
                        └─────────────────────────────────────────────────┘
```

---

## 4.2 Kamus Entitas Kunci Sistem

| Nama Entitas | Deskripsi Fungsional & Peran Bisnis | Atribut Kunci yang Disimpan |
| :--- | :--- | :--- |
| **Course** | Master mata kuliah kurikulum universitas. | Kode MK, Nama MK, Bobot SKS, Program Studi Pemilik, Silabus Pokok. |
| **CourseClass** | Rombongan belajar aktif pada semester tertentu. | Nama Kelas (A/B), Semester Akademik, Kapasitas Kuota, Status (Active/Archived). |
| **Section** | Unit pertemuan pembelajaran (1 s.d. 16 sesi). | Judul Sesi, Urutan Minggu, Tipe Sesi (Teori, Lab, Seminar, Workshop, Ujian). |
| **DynamicResource**| Aset pembelajaran modular di dalam pertemuan. | Tipe Konten (Notion Block, FileRef, Video Embed, Sandbox Code, LKP). |
| **Assessment** | Kuis ujian atau tugas perkuliahan berbobot. | Tipe (Quiz, Task), Batas Deadline, Waktu Cutoff Toleransi, Durasi Timer Kuis. |
| **QuizQuestion** | Butir soal bank soal dengan 8 tipe evaluasi. | Tipe Soal, Teks Pertanyaan, Pilihan Kunci, Bobot Butir Soal, Rubrik Essay. |
| **Submission** | Lembar pengumpulan tugas / kuis mahasiswa. | Nomor Versi (v1, v2), Waktu Kumpul, Status (Tepat Waktu / Terlambat), Nilai. |
| **Gradebook** | Rekapitulasi nilai akhir kelas berbobot. | Skor per Kategori, Nilai Akhir Angka, Huruf Mutu (A-E), Status Publish. |
| **AuditTrail** | Jejak buku besar perubahan data bernilai kritis. | Aktor Pengubah, Waktu Detik, Nilai Before-After, Alasan Koreksi Wajib. |

---

## 4.3 Aturan Proteksi Data Tingkat Baris (Row-Level Multi-Tenancy Authorization)
Untuk menjamin integritas kerahasiaan data:
1. **Isolasi Antar-Kelas (*Class Boundary Isolation*)**: Dosen pengampu Kelas A dilarang membaca atau mengubah tugas dan nilai mahasiswa Kelas B, meskipun mata kuliahnya sama, kecuali dosen tersebut resmi ditugaskan pada kedua kelas tersebut.
2. **Kerahasiaan Jawaban Antar-Mahasiswa**: Mahasiswa hanya memiliki akses baca terhadap lembar jawaban (*attempt*) dan berkas tugas miliknya sendiri. Akses terhadap berkas milik mahasiswa lain ditolak secara absolut oleh lapis otorisasi API (*HTTP 403 Forbidden*).

---

# BAB 5: DIAGRAM MESIN STATUS & SIKLUS HIDUP OBJEK (STATE MACHINES)

## 5.1 Siklus Hidup Rombel Perkuliahan (Course Class Lifecycle)

```
                ┌──────────────────┐
                │      DRAFT       │ (Dosen/Admin menyusun materi)
                └────────┬─────────┘
                         │ Klik "Aktifkan Kelas"
                         ▼
                ┌──────────────────┐
    ┌──────────►│      ACTIVE      │ (Mahasiswa belajar, kuis & tugas berjalan)
    │           └────────┬─────────┘
    │                    │ Akhir Semester: Klik "Arsipkan Kelas"
    │                    ▼
    │           ┌──────────────────┐
    │           │     ARCHIVED     │ (Terkunci permanen, read-only bagi mahasiswa lama)
    │           └────────┬─────────┘
    │                    │ Klik "Duplikasi Kelas ke Semester Baru"
    └────────────────────┘ (Membersihkan peserta lama & reset progres nilai ke 0)
```

---

## 5.2 Siklus Hidup Pengumpulan Tugas Mahasiswa (Assignment Submission Lifecycle)

```
        ┌──────────────────┐
        │   NOT_STARTED    │ (Tugas belum dikerjakan)
        └────────┬─────────┘
                 │ Mahasiswa mengunggah dokumen
                 ▼
        ┌──────────────────┐
        │    SUBMITTED     │ (Tersimpan sebagai Versi 1 - Tepat Waktu)
        └────────┬─────────┘
                 │ Mahasiswa unggah berkas perbaikan sebelum cut-off
                 ▼
        ┌──────────────────┐
        │     REVISED      │ (Berkas lama jadi Arsip v1, berkas baru aktif jadi v2)
        └────────┬─────────┘
                 │ Dosen selesai memeriksa & menginput nilai
                 ▼
        ┌──────────────────┐
        │      GRADED      │ (Nilai tersimpan dalam draf dosen)
        └────────┬─────────┘
                 │ Dosen klik "Publikasikan Nilai"
                 ▼
        ┌──────────────────┐
        │    FINALIZED     │ (Nilai resmi tampil di dashboard mahasiswa)
        └──────────────────┘
```

---

## 5.3 Siklus Hidup Pengerjaan Kuis Ujian (Quiz Attempt Lifecycle)

```
        ┌──────────────────┐
        │      LOCKED      │ (Kuis belum memasuki tanggal/jam buka)
        └────────┬─────────┘
                 │ Jadwal mulai tercapai
                 ▼
        ┌──────────────────┐
        │    AVAILABLE     │ (Tombol "Mulai Kuis" aktif)
        └────────┬─────────┘
                 │ Mahasiswa menekan tombol mulai (Timer berjalan)
                 ▼
        ┌──────────────────┐
        │   IN_PROGRESS    │ (Jawaban tersimpan otomatis berkala)
        └────────┬─────────┘
                 │ Tombol "Selesai" ditekan / Waktu habis (Timer 00:00)
                 ▼
        ┌──────────────────┐
        │    SUBMITTED     │ (Lembar ujian terkunci otomatis oleh sistem)
        └────────┬─────────┘
                 │ Evaluasi otomatis soal objektif selesai
                 ▼
        ┌──────────────────┐
        │ PARTIAL_SCORED   │ (Soal PG selesai dinilai, Essay menunggu dosen)
        └────────┬─────────┘
                 │ Dosen selesai mengoreksi seluruh nomor essay
                 ▼
        ┌──────────────────┐
        │    FINALIZED     │ (Skor utuh diterbitkan ke Gradebook)
        └──────────────────┘
```

---

## 5.4 Siklus Hidup Penerbitan Nilai (Gradebook Publishing Lifecycle)

```
┌───────────────────────┐
│     DRAFT_GRADING     │ Dosen mengoreksi dan menguji simulasi pembobotan nilai.
└───────────┬───────────┘ Seluruh nilai bersifat RAHASIA (Mahasiswa belum melihat).
            │
            ▼ Dosen menekan tombol resmi: "Publikasikan Nilai Kelas"
┌───────────────────────┐
│   PUBLISHED_OFFICIAL  │ Nilai resmi terbuka di akun mahasiswa masing-masing.
└───────────┬───────────┘ Sistem memicu notifikasi pemberitahuan nilai terbit.
            │
            ▼ Terjadi sanggahan nilai / koreksi tugas susulan
┌───────────────────────┐
│    OVERRIDE_AUDITED   │ Dosen WAJIB mengisi alasan perubahan pada pop-up dialog.
└───────────────────────┘ Sistem merekam Before-After Snapshot ke buku Audit Log.
```

---

# BAB 6: ANALISIS NILAI BATAS (BVA) & MATRIKS SEBAB-AKIBAT

## 6.1 Matriks Boundary Value Analysis (BVA) & Penanganan Kasus Ekstrem

| Parameter Uji | Titik Batas (*Boundary*) | Nilai Uji Ekstrem | Perilaku Rekayasa Sistem | Respon Antarmuka (UI/UX) |
| :--- | :--- | :--- | :--- | :--- |
| **Persentase Bobot Nilai Kelas** | Wajib tepat $100\%$ | $99.99\%$ atau $100.01\%$ | Menolak penyimpanan skema nilai. | Tombol simpan dinonaktifkan. Kotak peringatan oranye: *"Total bobot wajib tepat 100%"*. |
| **Batas Waktu Toleransi (*Cut-Off*)** | Detik pergantian batas | $T_{\text{cutoff}} + 1\text{ detik}$ | Menolak berkas pengumpulan susulan. | Kotak unggah terkunci. Pesan merah: *"Masa toleransi pengumpulan telah berakhir"*. |
| **Timer Pengerjaan Kuis Ujian** | Durasi mencapai 0 | Waktu sisa $00:00$ | Eksekusi auto-submit seluruh jawaban yang sempat terisi. | Jendela modal: *"Waktu ujian telah habis. Seluruh jawaban Anda berhasil disimpan"*. |
| **Beban Ukuran Berkas Tugas** | Batas maksimal 50 MB | $50.1\text{ MB}$ | Ditolak di sisi browser sebelum streaming ke File Service. | Pesan blocker instan: *"Ukuran berkas melebihi batas 50 MB"*. |
| **Toleransi Numerik Kuis Lab** | $x \pm \Delta$ ($9.8 \pm 0.1$) | $9.69$ vs $9.70$ s.d. $9.90$ | Skor 0 jika di luar rentang; skor penuh jika dalam toleransi. | Nilai otomatis terhitung tanpa intervensi koreksi manual dosen. |

---

## 6.2 Matriks Sebab-Akibat Terpadu (Cause-Effect Event Matrix)

| Pemicu Aksi (*Cause / Event*) | Logika Pemrosesan Sistem (*Processing Engine*) | Mutasi Data / Latar Belakang (*System Backend Action*) | Tampilan Layar Pengguna (*UI Effect*) |
| :--- | :--- | :--- | :--- |
| **Dosen klik "Publish Nilai"** | Memeriksa seluruh komponen nilai dan menghitung nilai huruf mutu (A-E). | Update status Gradebook dari `DRAFT` menjadi `PUBLISHED`. | Banner hijau sukses di layar dosen; notifikasi lonceng masuk ke mahasiswa. |
| **Mahasiswa lewati durasi video** | Sinyal *heartbeat* mendeteksi selisih lompatan detik > 5 detik. | Sinyal lompatan dibatalkan. Menit yang diakui hanya yang berurutan. | Indikator progres video tidak bertambah; kursor kembali ke titik wajar. |
| **Koneksi internet putus saat ujian** | Deteksi status *offline* pada peramban klien. | Jawaban dialihkan ke antrean penyimpanan lokal *IndexedDB*. | Status koneksi di pojok kanan atas berubah oranye: *"Mode Cadangan Offline Aktif"*. |
| **Dosen ubah nilai terpublikasi** | Sistem memicu intersepsi *Audit Trail Engine*. | Membuka form modal wajib alasan. Simpan Before-After State Snapshot. | Nilai terbarui dengan ikon lencana biru: *"Telah Dikoreksi (Lihat Riwayat)"*. |
| **Akun dinonaktifkan di SSO** | Sinyal webhook / redis pub-sub diterima gateway E-Learning. | Token di-blacklist di Redis. Menolak request berikutnya (*HTTP 403*). | Pengguna terkeluar ke halaman login dengan pesan kontak administrator prodi. |

---

# BAB 7: MANAJEMEN RISIKO TEKNIS & MATRIKS KEPUTUSAN PRODUCT OWNER

## 7.1 Register Risiko Rekayasa & Strategi Mitigasi

| ID Risiko | Deskripsi Potensi Risiko | Tingkat Dampak | Probabilitas | Strategi Mitigasi Rekayasa (*Engineered Mitigation*) |
| :---: | :--- | :---: | :---: | :--- |
| **RSK-01** | Lonjakan serentak saat batas waktu pengumpulan tugas (*Deadline Rush*). | **Tinggi** | **Tinggi** | Seluruh proses pengunggahan berkas ditangani langsung oleh File Service / Object Storage (*Direct-to-S3*), sehingga server inti API bebas dari kemacetan memori I/O. |
| **RSK-02** | Kehilangan jawaban ujian essay saat koneksi internet kampus terputus mendadak. | **Kritis** | **Sedang** | Fitur penyimpanan berkala ke IndexedDB per 2 detik dan dialog pemulihan draf otomatis dengan satu klik (*Client-side Auto-Save*). |
| **RSK-03** | Inkonsistensi data nilai akibat kegagalan transaksi saat proses kalkulasi massal. | **Tinggi** | **Rendah** | Penerapan transaksi ACID berbasis PostgreSQL dan isolasi pemrosesan latar belakang oleh antrean terdedikasi BullMQ Worker. |
| **RSK-04** | Dosen salah mengubah nilai mahasiswa yang memicu konflik transparansi akademik. | **Tinggi** | **Sedang** | Kewajiban pengisian alasan koreksi dan pencatatan buku besar jejak audit (*Audit Trail Snapshot*) yang dapat diinspeksi oleh Dekan dan Kaprodi. |

---

## 7.2 Asumsi Kapasitas Beban & Kinerja Konkurensi
Berdasarkan skala operasional Universitas Achmad Yani, arsitektur v5.0 dirancang untuk memenuhi tolok ukur kinerja (*Performance Benchmark*) berikut:
* **Pengguna Aktif Bersamaan (*Concurrent Users*)**: Mampu melayani **1.000 hingga 1.500 pengguna aktif serentak** pada masa puncak ujian (UTS/UAS) menggunakan 3 worker klaster PM2.
* **Waktu Respon Rata-Rata (*API Latency*)**: Di bawah **150 milidetik** untuk transaksi data akademik harian, dan di bawah **300 milidetik** saat pelacakan telemetri video serentak.
* **Kapasitas Penyimpanan Berkas**: File Service mendukung ukuran berkas tugas hingga **50 MB per berkas**, dengan retensi sampah 7 hari sebelum purifikasi permanen.

---

## 7.3 Matriks Keputusan Rekayasa & Lembar Evaluasi Product Owner

Bagian ini memuat usulan dan rekomendasi teknis dari Tim Pengembang yang memerlukan penelaahan (*review*), arahan, dan keputusan resmi dari Product Owner. Status saat ini berada dalam tahap **USULAN PENGEMBANG (MENUNGGU PENELAAHAN & KEPUTUSAN PO)**:

| Area Keputusan | Usulan / Rekomendasi Tim Developer | Alternatif Lain yang Dipertimbangkan | Pertimbangan Teknis & Dampak bagi Produk | Status Penelaahan PO | Catatan / Arahan Khusus PO |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Runtime Server** | **PM2 Native Cluster + Linux Ubuntu Host** | Kontainer Docker & Kubernetes | Menghilangkan *overhead* RAM/CPU kontainer, mempermudah tim internal kampus mengelola server, dan mendukung *zero-downtime reload*. | `[ Dalam Penelaahan / Review ]` | *(Ruang catatan PO)* |
| **Alur Otentikasi** | **SSO Terpusat via OIDC + Redis Revocation** | Database Kredensial Mandiri | Menjamin kepatuhan keamanan data, privasi sandi terpusat, dan kemampuan memutus akun bermasalah dalam hitungan milidetik. | `[ Dalam Penelaahan / Review ]` | *(Ruang catatan PO)* |
| **Penyimpanan Berkas** | **File Service Terpisah (Presigned URL)** | Penyimpanan Lokal Folder Server | Server E-Learning tidak memproses biner berkas besar, tautan privat kedaluwarsa 15 menit, dan perlindungan berkas sampah 7 hari. | `[ Dalam Penelaahan / Review ]` | *(Ruang catatan PO)* |
| **Editor Konten** | **Notion-Style Modular JSON Blocks** | Rich Text Editor HTML Kuno (WYSIWYG) | Mendukung materi interaktif lab (kode program, rumus LaTeX, checklist praktikum) dan ringan dibuka di perangkat seluler. | `[ Dalam Penelaahan / Review ]` | *(Ruang catatan PO)* |
| **Validasi Impor Excel** | **Human-in-the-Loop Preview Panel** | Penolakan Kaku Semua Baris (*All-or-Nothing*) | Menghemat waktu dosen; baris yang keliru dapat diperbaiki langsung di layar tanpa harus mengunggah ulang seluruh file. | `[ Dalam Penelaahan / Review ]` | *(Ruang catatan PO)* |
| **Cakupan Rilis Awal (Pilot)** | **Fokus P0 untuk Pilot Prodi Informatika** | Peluncuran Serentak Seluruh Fakultas | Memastikan kestabilan sistem di lingkungan terkontrol sebelum ekspansi ke seluruh prodi universitas. | `[ Dalam Penelaahan / Review ]` | *(Ruang catatan PO)* |

---

### Lembar Penelaahan & Pengesahan Product Owner (Sign-Off Sheet):

Dokumen ini disusun sebagai **Proposal Desain Teknis Resmi** yang diajukan oleh Tim Pengembang untuk ditelaah dan diputuskan oleh Product Owner bersama Pimpinan Akademik UAY.

```
Status Dokumen     : DRAF USULAN TEKNIS (SIAP DITELAAH PO)
Tanggal Pengajuan  : 21 September 2026
Diusulkan oleh     : Tim Pengembang Perangkat Lunak E-Learning UAY

Lembar Keputusan Product Owner:
[   ] DISETUJUI TANPA CATATAN
[   ] DISETUJUI DENGAN CATATAN REVISI (Lihat kolom arahan di atas)
[   ] PERLU PEMBAHASAN / RAPAT KOORDINASI TEKNIS LEBIH LANJUT

Tanda Tangan & Nama Terang PO : __________________________________________
Tanggal Keputusan Resmi        : __________________________________________
```  
