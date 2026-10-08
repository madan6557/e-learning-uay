# 📋 MASTER PERSONAL NOTE: DESAIN TEKNIS E-LEARNING UAY (V4.0)
**Platform Digital Pembelajaran Universitas Achmad Yani (UAY)**  
*Dokumen Panduan Ringkas & Rujukan Cepat untuk Product Owner, Tim Dosen, QA, dan Tim Server/DevOps*

---

## 📌 Pengantar & Cara Menggunakan Catatan Ini
Catatan ini merangkum **seluruh pilar teknis dan arsitektur** yang tertuang di dalam Dokumen Desain Teknis (*Word / PDF 59 Halaman*) dan Bahan Tayang Presentasi (*PowerPoint 18 Slide*). Gunakan catatan ini sebagai peta rujukan cepat (*cheat sheet*) saat berdiskusi atau mengambil keputusan teknis dengan berbagai pemangku kepentingan.

---

## 1. Ekosistem Tiga Aplikasi & Batasan Tanggung Jawab (Service Boundaries)
* **Penjelasan Singkat**: Kampus UAY menerapkan pemisahan layanan mandiri (*Clean Service Separation*). E-Learning UAY tidak menyimpan kata sandi dan tidak menyimpan berkas fisik binary secara lokal di servernya.
* **Poin-Poin Kunci**:
  * **SSO / Identity Service**: Pemilik mutlak kredensial, multi-factor auth, dan status akun aktif.
  * **File Service**: Pemilik berkas fisik binary (*object storage*), pemindaian virus, dan masa retensi sampah 7 hari.
  * **E-Learning Core Engine**: Pemilik data akademik (kelas, materi, kuis, tugas, progres, nilai, audit log).
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 1.3 (Halaman 5).
  * **Slide Presentasi**: Slide 02 / 18 (*Ekosistem Tiga Aplikasi*).

---

## 2. Otentikasi SSO OIDC & Proteksi Akun 3 Lapis
* **Penjelasan Singkat**: Integrasi login menggunakan standar industri **OpenID Connect (OIDC)** dengan Authorization Code Flow + PKCE. Sistem melindungi akun dari akses ilegal melalui 3 lapis pengamanan.
* **Poin-Poin Kunci**:
  * **Lapis 1 (Stateless Fast-Path)**: Klaim token JWT memuat status akun (`ACTIVE`). Jika dinonaktifkan, akses langsung ditolak (*HTTP 403*).
  * **Lapis 2 (Short-Lived 15m Token TTL)**: Access token berumur pendek (15 menit). Setiap *refresh*, server memverifikasi status akun langsung ke database SSO.
  * **Lapis 3 (Real-Time Revocation via Redis)**: Jika admin menonaktifkan akun di portal SSO, event webhook seketika mem-blacklist `userId` di Redis E-Learning. Akses terputus detik itu juga tanpa menunggu token kedaluwarsa.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 2.2 (Halaman 7 - 8).
  * **Slide Presentasi**: Slide 04 / 18 (*Integrasi SSO OIDC & Proteksi Akun 3 Lapis*).

---

## 3. Integrasi Berkas & Kebijakan Zero-Binary Storage
* **Penjelasan Singkat**: E-Learning menerapkan prinsip *Zero-Binary Storage*. Mahasiswa dan dosen mengunggah berkas tugas/materi langsung ke File Service via *Presigned Upload Ticket*, sehingga server E-Learning tidak terbebani lalu lintas berkas besar.
* **Poin-Poin Kunci**:
  * **Presigned Upload Ticket**: Klien meminta izin unggah -> File Service menerbitkan URL berbatas waktu (15 menit).
  * **Entitas FileRef**: E-Learning hanya menyimpan metadata (`fileObjectId`, `fileName`, `fileSize`, `mimeType`).
  * **Private Signed Download URL**: Tautan unduh bersifat privat dan kedaluwarsa dalam 15 - 30 menit.
  * **Kebijakan Sampah 7 Hari (7-Day Trash Retention)**: Berkas yang dihapus di E-Learning tidak langsung musnah permanen, melainkan masuk ke _Trash_ File Service selama 7 hari sebelum dibersihkan otomatis.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 2.3 (Halaman 8 - 9).
  * **Slide Presentasi**: Slide 02 / 18.

---

## 4. Dynamic Resource Engine & Editor Blok Modular (Gaya Notion)
* **Penjelasan Singkat**: Konten materi tidak lagi berupa teks HTML statis monolitik, melainkan tersusun atas array blok modular (`blocks: ContentBlock[]`) yang dapat digeser (*drag-and-drop*), diduplikasi, dan disunting secara luwes.
* **Poin-Poin Kunci**:
  * **Mendukung Perkuliahan & Praktikum Lab**: Mendukung materi teori, modul praktikum lab (LKP), dataset, repositori kode, dan simulator virtual lab.
  * **11 Tipe Blok**: `paragraph`, `heading`, `image`, `file_attachment`, `code_snippet` (30+ bahasa), `math_latex` (KaTeX), `callout` (NOTE, TIP, IMPORTANT, WARNING), `checklist` (todo interaktif), `table`, `embed_media`, dan `divider`.
  * **Sanitasi Anti-XSS**: Seluruh blok diproses melalui `DOMPurify` dan skema runtime `Zod`.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 3.2 & 3.2.1 serta Bab 4.
  * **Slide Presentasi**: Slide 05 / 18 (*Dynamic Resource Engine: Editor Berbasis Blok*).

---

## 5. Pelacakan Progres Belajar Granular (Video & Slide Anti-Curang)
* **Penjelasan Singkat**: Sistem mencatat keaktifan belajar mahasiswa secara sangat detail hingga tingkat detik tontonan video dan nomor halaman unik dokumen yang dipelajari.
* **Poin-Poin Kunci**:
  * **Video Anti-Skip Tracking**: Mencatat `watchedSeconds` dan `percentCompleted`. Menggunakan prinsip *monotonic increase* (progres hanya boleh maju, tidak boleh mundur) dan transaksi database `Serializable` untuk mencegah kecurangan pemutaran video di banyak tab bersamaan.
  * **Slide & PDF Page Tracking**: Menyimpan array integer halaman unik yang benar-benar dibuka: `viewedPages: [1, 2, 3, 5]`. Mahasiswa tidak dapat curang langsung loncat ke halaman akhir.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 3.5 (Mesin Pelacakan Progress).
  * **Slide Presentasi**: Slide 06 / 18 (*Pelacakan Progres Granular*).

---

## 6. Kuis Multi-Tipe, Bank Soal, & Skoring Hibrida
* **Penjelasan Singkat**: Platform menyediakan Bank Soal institusi, 8 variasi tipe evaluasi, serta alur penilaian hibrida yang memadukan penilaian otomatis sistem dan penilaian manual dosen.
* **Poin-Poin Kunci**:
  * **8 Tipe Soal**: Single Choice, Multiple Select, True/False, Short Answer/Numerik, Matching, Ordering, Essay, dan File Upload.
  * **Pembobotan Kustom Butir Soal**: Dosen bebas memberi bobot berbeda per butir soal (misal soal studi kasus = 25 poin, definisi = 5 poin), dengan jaminan total nilai selalu ternormalisasi tepat pada skala 100.
  * **Skoring Hibrida**: Soal objektif langsung dinilai otomatis saat kuis dikirim; soal essay masuk antrean `NEEDS_GRADING` untuk dinilai dosen dengan rubrik terstruktur.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 3.3.2 s.d. 3.3.4 (Bank Soal & Kuis).
  * **Slide Presentasi**: Slide 07, 08, dan 09 / 18 (*Kuis, Pembobotan, dan Penilaian Essay*).

---

## 7. Pembobotan Nilai Otomatis & Gradebook Resmi UAY
* **Penjelasan Singkat**: Pengajar tidak perlu lagi menghitung rumus nilai akhir secara manual di kalkulator atau Excel. Sistem mengalkulasi nilai akhir kelas secara otomatis berbasis bobot persentase kategori.
* **Poin-Poin Kunci**:
  * **Validasi Bobot Kategori Tepat 100%**: Misal: Tugas/Lab (25%) + Kuis (15%) + UTS (25%) + UAS (25%) + Partisipasi/Progres (10%) = 100.0%.
  * **Konversi Huruf Mutu Standar UAY**: Otomatis mengonversi skor angka ke huruf: >= 85 -> A (4.00), 80 - 84.9 -> A- (3.75), 75 - 79.9 -> B+ (3.50), dst.
  * **Isolasi Nilai DRAFT vs PUBLISHED**: Nilai yang masih berupa draf dosen tidak akan bocor/terlihat oleh mahasiswa sebelum resmi dipublikasikan (*published*).
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 3.4 (Pembobotan Nilai Otomatis).
  * **Slide Presentasi**: Slide 10 / 18 (*Pembobotan Nilai Otomatis*).

---

## 8. Mesin Import Massal & Rekonsiliasi Data (Human-in-the-Loop)
* **Penjelasan Singkat**: Mengimpor data berulang (Bank Soal, Pendaftaran Peserta/Enrollment, dan Lembar Nilai Offline) menggunakan template Excel/CSV standar dengan tahap review interaktif sebelum data masuk ke database.
* **Poin-Poin Kunci**:
  * **Human-in-the-Loop**: Sistem tidak membatalkan seluruh berkas (*no rigid all-or-nothing failure*). Sistem hanya mendeteksi dan memberitahu daftar baris bermasalah.
  * **4 Deteksi Cacat**: Data Tidak Lengkap (*Missing*), Duplikasi Internal Berkas, Konflik Basis Data (Mahasiswa sudah terdaftar), dan Format/Rentang Salah.
  * **3 Kontrol Aksi Pengguna**: 
    1. *Hapus / Abaikan (Exclude)* baris cacat;
    2. *Edit Langsung di Tabel (Inline Editing)* tanpa unggah ulang file;
    3. *Tambahkan / Timpa (Force Override/Upsert)* data eksisting di database.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 3.3.1 (Mesin Import Massal), Sub-bab 8.1 (BVA), & Sub-bab 8.2 (CE-09).
  * **Slide Presentasi**: Slide 11 / 18 (*Mesin Import Massal & Rekonsiliasi*).

---

## 9. Sistem Umpan Balik (Feedback/Blocker) & Audit Log Before-After
* **Penjelasan Singkat**: Setiap interaksi penting memiliki respon visual yang eksplisit dan solutif. Setiap mutasi data akademik kritis direkam secara permanen untuk integritas institusi.
* **Poin-Poin Kunci**:
  * **4 Status Respon UI**: Success Toast, Solutive Error Banner, Blocker State (alasan mengapa aksi dilarang), dan Progress Indicator (mencegah double-submit).
  * **Audit Log Mendalam**: Mencatat metadata aktor, alamat IP, timestamp, alasan perubahan (*reason*), serta rekaman snapshot data sebelum (`beforeState`) dan sesudah (`afterState`).
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 3.6 (Audit Log) & Sub-bab 3.7 (Feedback & Blocker).
  * **Slide Presentasi**: Slide 13 / 18 (*Umpan Balik dan Jejak Audit Before-After*).

---

## 10. Arsitektur Basis Data (ERD 18 Model & 100% English Codebase)
* **Penjelasan Singkat**: Basis data relasional dirancang menggunakan PostgreSQL 16 dan Prisma ORM dengan skema yang bersih, ternormalisasi, dan berstandar internasional.
* **Poin-Poin Kunci**:
  * **Konvensi 100% Bahasa Inggris**: Seluruh model, kolom, enum, dan variabel ditulis dalam bahasa Inggris (`Course`, `CourseClass`, `Quiz`, `isPublished`, dll.). Bahasa Indonesia hanya digunakan pada lapisan antarmuka (*UI display*).
  * **Row-Level Security (RLS)**: Isolasi wewenang berbasis kelas. Dosen hanya dapat mengelola rombel yang ditugaskan; mahasiswa hanya dapat mengakses rombel yang terdaftar.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Bab 5 (Halaman 28 - 43) & Bab 6 (Halaman 44 - 47).
  * **Slide Presentasi**: Slide 14 (*Visual ERD Vector*) & Slide 15 (*Standar Rekayasa 100% English*).

---

## 11. Topologi Server, Dual-Environment, & Spesifikasi Sumber Daya
* **Penjelasan Singkat**: Deployment menggunakan arsitektur kontainer Docker Compose di balik reverse proxy Nginx ber-SSL/TLS 1.3, dengan pemisahan lingkungan kerja yang ketat.
* **Poin-Poin Kunci**:
  * **Arsitektur Dual-Environment**:
    * *Live Development / Staging Server*: Untuk validasi tim PO, QA, dan perbaikan harian dev (fitur hot-reload & debug port aktif).
    * *Production VPS Host*: Lingkungan resmi perkuliahan (terisolasi, restart policy always, healthcheck aktif).
  * **Spesifikasi Sumber Daya Server (Sizing)**:
    * *Spesifikasi Minimum (Pilot 1 Prodi)*: 2 vCPU, 4 GB RAM, 50 GB SSD NVMe.
    * *Spesifikasi Rekomendasi (Produksi Seluruh Kampus)*: 4 vCPU, 8 - 16 GB RAM, 100 - 150 GB SSD NVMe.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 7.1 (Topologi Server & Deployment).
  * **Slide Presentasi**: Slide 17 / 18 (*Blueprint Deployment Dual-Environment*).

---

## 12. Strategi Backup Otomatis & Disaster Recovery (Tim Server SOP)
* **Penjelasan Singkat**: Urusan backup basis data didelegasikan kepada Tim Server / DevOps menggunakan skrip otomasi shell dan cron sistem Linux host.
* **Poin-Poin Kunci**:
  * **Backup Otomatis Harian**: Eksekusi setiap malam pukul 02.00 WIB (`backup.sh` via crontab `0 2 * * *`). Menggunakan `pg_dump -Fc`, kompresi `gzip`, dan verifikasi integritas `SHA-256`.
  * **Rotasi Retensi 7 Hari**: Berkas cadangan yang berumur lebih dari 7 hari otomatis dibersihkan oleh skrip untuk mencegah pembengkakan penyimpanan.
  * **Runbook Pemulihan Darurat (Disaster Recovery)**: Tersedia skrip pemulihan 1 baris (`restore.sh`) dengan prompt konfirmasi keselamatan `RESTORE-PROD` dan target pemulihan *Recovery Time Objective (RTO) < 30 menit*.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 7.2 (Strategi Backup Otomatis).
  * **Slide Presentasi**: Slide 17 / 18.
  * **Berkas Skrip Siap Pakai**: Folder `deployment/scripts/` (`backup.sh`, `restore.sh`, `backup.cron`, `README.md`).

---

## 13. Strategi Rilis Prioritas P0-Pn & Kesiapan UAT Pilot
* **Penjelasan Singkat**: Pengembangan sistem dibagi menjadi 3 tingkatan prioritas fitur guna menjamin peluncuran pilot tepat waktu, stabil, dan aman.
* **Poin-Poin Kunci**:
  * **Prioritas P0 (Harus Ada / Core MVP)**: Alur end-to-end perkuliahan (Login SSO, kelas, modul praktikum, kuis/tugas, bobot nilai, dan audit log) ditargetkan tuntas untuk pilot Prodi Informatika.
  * **Prioritas P1 & P2**: Fitur pengayaan (duplikasi kelas antar-semester, analitik canggih, import massal lanjutan).
  * **12 Kriteria Kesiapan Pilot**: Parameter ketat penentu apakah sistem sudah layak di-*go-live*-kan ke mahasiswa dan dosen.
* **Bab / Dokumen Terkait**:
  * **Dokumen Teknis**: Sub-bab 3.1 (Prioritas P0-P2), Sub-bab 8.3, & Bab 9.
  * **Slide Presentasi**: Slide 16 (*Strategi Rilis Prioritas P0-Pn*) & Slide 18 (*Rencana Eksekusi 5 Tahap & Sign-Off PO*).

---

## 📂 Ringkasan Akses Berkas Resmi Proyek
Semua dokumen master dapat diakses langsung pada direktori `e:\UVAYA\Project\E - Learning UAY\docs\`:
* 📘 **Dokumen Desain Teknis (V4.0)**: `Technical Design - E-Learning UAY - v4.0.docx` & `Technical Design - E-Learning UAY - v4.0.pdf`
* 📊 **Slide Presentasi (V4.0)**: `Presentation - Technical Design E-Learning UAY - v4.0.pptx` & `Presentation - Technical Design E-Learning UAY - v4.0.pdf`
* 📝 **Catatan Master Eksekutif (V4.0)**: `Personal Note - Master Desain Teknis E-Learning UAY.md`, `Personal Note - Master Desain Teknis E-Learning UAY.docx`, & `Personal Note - Master Desain Teknis E-Learning UAY.pdf`
