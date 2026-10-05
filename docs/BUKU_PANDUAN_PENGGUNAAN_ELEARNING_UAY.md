# BUKU PANDUAN PENGGUNAAN RESMI E-LEARNING UNIVERSITAS ACHMAD YANI (UAY)
**Pedoman Komprehensif Operasional Sistem Pembelajaran Digital Berbasis Peran**
*Edisi Terpadu: Versi 5.2 · Terbit: Oktober 2026 · Target: Super Administrator, Admin Program Studi, Dosen Pengampu, & Mahasiswa*

---

## KATA PENGANTAR & RINGKASAN EKSEKUTIF

Sistem **E-Learning Universitas Achmad Yani (UAY)** merupakan platform pembelajaran digital resmi institusi yang mengintegrasikan seluruh proses akademik tatap muka maupun daring. Sistem ini dirancang untuk mewujudkan tata kelola akademik yang transparan, akuntabel, dan terstandar di seluruh fakultas dan program studi di lingkungan UAY.

Buku panduan ini disusun sebagai rujukan operasional resmi bagi seluruh pemangku kepentingan (*stakeholders*) kampus, mulai dari tingkat pimpinan universitas, administrator program studi, dosen pengampu mata kuliah, hingga mahasiswa. Seluruh alur kerja yang dipaparkan dalam buku panduan ini merujuk langsung pada antarmuka aplikasi terpasang dan aturan akademik universitas terbaru.

---

## DAFTAR ISI

1. [BAB 1: PENDAHULUAN & ARSITEKTUR EKOSISTEM DIGITAL UAY](#bab-1-pendahuluan--arsitektur-ekosistem-digital-uay)
   - 1.1 [Visi & Nilai Utama Sistem](#11-visi--nilai-utama-sistem)
   - 1.2 [Ekosistem Terpadu: SSO, File-Service, E-Learning, & Dashboard Rektor](#12-ekosistem-terpadu-sso-file-service-e-learning--dashboard-rektor)
   - 1.3 [Kebutuhan Perangkat & Peramban yang Didukung](#13-kebutuhan-perangkat--peramban-yang-didukung)
2. [BAB 2: MATRIKS PERAN & HAK AKSES PENGGUNA (ROLE-BASED ACCESS CONTROL)](#bab-2-matriks-peran--hak-akses-pengguna-role-based-access-control)
   - 2.1 [Klasifikasi Peran Pengguna](#21-klasifikasi-peran-pengguna)
   - 2.2 [Tabel Matriks Hak Akses Antar-Fitur Lengkap](#22-tabel-matriks-hak-akses-antar-fitur-lengkap)
3. [BAB 3: ALUR AUTENTIKASI TUNGGAL (SINGLE SIGN-ON / SSO UAY)](#bab-3-alur-autentikasi-tunggal-single-sign-on--sso-uay)
   - 3.1 [Prinsip Keamanan Zero Local Password](#31-prinsip-keamanan-zero-local-password)
   - 3.2 [Prosedur Masuk Menggunakan SSO UAY](#32-prosedur-masuk-menggunakan-sso-uay)
   - 3.3 [Autentikasi Dua Faktor (MFA / 2FA)](#33-autentikasi-dua-faktor-mfa--2fa)
   - 3.4 [Manajemen Sesi & Logout Terpadu](#34-manajemen-sesi--logout-terpadu)
   - 3.5 [Pemulihan Akun & Reset Kata Sandi SSO](#35-pemulihan-akun--reset-kata-sandi-sso)
4. [BAB 4: PANDUAN SUPER ADMINISTRATOR & PIMPINAN UNIVERSITAS](#bab-4-panduan-super-administrator--pimpinan-universitas)
   - 4.1 [Universal Scope & Kendali Lintas Fakultas](#41-universal-scope--kendali-lintas-fakultas)
   - 4.2 [Manajemen Pengguna Global & Sinkronisasi Direktori SSO](#42-manajemen-pengguna-global--sinkronisasi-direktori-sso)
   - 4.3 [Tata Kelola Kebijakan Akademik & Tahun Ajaran (Academic Governance)](#43-tata-kelola-kebijakan-akademik--tahun-ajaran-academic-governance)
   - 4.4 [Pengelolaan Master Katalog Mata Kuliah Universitas](#44-pengelolaan-master-katalog-mata-kuliah-universitas)
   - 4.5 [Audit Log Global & Pengawasan Keamanan Sistem](#45-audit-log-global--pengawasan-keamanan-sistem)
   - 4.6 [Integrasi Telemetri Eksekutif Dashboard Rektor UAY](#46-integrasi-telemetri-eksekutif-dashboard-rektor-uay)
   - 4.7 [Manajemen Penyimpanan & Kuota File Service](#47-manajemen-penyimpanan--kuota-file-service)
5. [BAB 5: PANDUAN ADMINISTRATOR PROGRAM STUDI (DEPARTMENT ADMIN)](#bab-5-panduan-administrator-program-studi-department-admin)
   - 5.1 [Prinsip Isolasi Data Tingkat Program Studi (Department Scopes)](#51-prinsip-isolasi-data-tingkat-program-studi-department-scopes)
   - 5.2 [Pembuatan & Konfigurasi Kelas Perkuliahan Semester](#52-pembuatan--konfigurasi-kelas-perkuliahan-semester)
   - 5.3 [Penugasan Dosen Utama & Dosen Lintas Program Studi (Multi-Afiliasi)](#53-penugasan-dosen-utama--dosen-lintas-program-studi-multi-afiliasi)
   - 5.4 [Manajemen Peserta Kuliah (Enrollment Mahasiswa & Toggle Status Aktif)](#54-manajemen-peserta-kuliah-enrollment-mahasiswa--toggle-status-aktif)
   - 5.5 [Monitoring Kesiapan Perkuliahan & Audit Silabus Awal Semester](#55-monitoring-kesiapan-perkuliahan--audit-silabus-awal-semester)
   - 5.6 [Rekapitulasi Presensi & Pelaporan Nilai Tingkat Program Studi](#56-rekapitulasi-presensi--pelaporan-nilai-tingkat-program-studi)
6. [BAB 6: PANDUAN DOSEN / PENGAMPU KELAS (INSTRUCTOR)](#bab-6-panduan-dosen--pengampu-kelas-instructor)
   - 6.1 [Navigasi Dashboard Dosen, Filter Prodi, & Antrean Penilaian (Grading Queue)](#61-navigasi-dashboard-dosen-filter-prodi--antrean-penilaian-grading-queue)
   - 6.2 [Struktur Kelas: Pertemuan (Sections), Silabus, & Pengumuman Terarah](#62-struktur-kelas-pertemuan-sections-silabus--pengumuman-terarah)
   - 6.3 [Pengunggahan & Pengelolaan Materi Perkuliahan (4 Format Media)](#63-pengunggahan--pengelolaan-materi-perkuliahan-4-format-media)
   - 6.4 [Aturan Penyelesaian Belajar (Completion Rules) & Proteksi Unduh](#64-aturan-penyelesaian-belajar-completion-rules--proteksi-unduh)
   - 6.5 [Pengelolaan Tugas Kuliah (Assignments) & Rubrik Penilaian](#65-pengelolaan-tugas-kuliah-assignments--rubrik-penilaian)
   - 6.6 [Penyusunan Kuis & Ujian (8 Ragam Soal, Bank Soal, & Impor Excel)](#66-penyusunan-kuis--ujian-8-ragam-soal-bank-soal--impor-excel)
   - 6.7 [Konfigurasi Timer Ujian & 4 Mode Publikasi Hasil](#67-konfigurasi-timer-ujian--4-mode-publikasi-hasil)
   - 6.8 [Presensi Layar Proyektor (Kode 6-Digit & QR Code Dinamis)](#68-presensi-layar-proyektor-kode-6-digit--qr-code-dinamis)
   - 6.9 [Presensi Roster Manual, Aksi 'Tandai Semua Hadir', & Catatan Dispensasi](#69-presensi-roster-manual-aksi-tandai-semua-hadir--catatan-dispensasi)
   - 6.10 [Rekapitulasi Presensi Semester & Ekspor CSV](#610-rekapitulasi-presensi-semester--ekspor-csv)
   - 6.11 [Pengelolaan Buku Nilai (Gradebook) & Kalkulasi Bobot Otomatis](#611-pengelolaan-buku-nilai-gradebook--kalkulasi-bobot-otomatis)
   - 6.12 [Fitur Kloning Kelas Semester Baru (Clean Draft & Reset Jadwal)](#612-fitur-kloning-kelas-semester-baru-clean-draft--reset-jadwal)
   - 6.13 [Log Audit Kelas & Transparansi Perubahan Data](#613-log-audit-kelas--transparansi-perubahan-data)
7. [BAB 7: PANDUAN MAHASISWA (STUDENT)](#bab-7-panduan-mahasiswa-student)
   - 7.1 [Beranda Mahasiswa, Ringkasan Akademik, & Agenda Tenggat Waktu](#71-beranda-mahasiswa-ringkasan-akademik--agenda-tenggat-waktu)
   - 7.2 [Pengisian Presensi Mandiri (Kode 6-Digit & Pemindaian QR Code)](#72-pengisian-presensi-mandiri-kode-6-digit--pemindaian-qr-code)
   - 7.3 [Mempelajari Materi Kuliah & Pelacakan Progres (Anti-Cheat Frontier)](#73-mempelajari-materi-kuliah--pelacakan-progres-anti-cheat-frontier)
   - 7.4 [Pengumpulan Tugas Kuliah & Pemantauan Masukan Dosen](#74-pengumpulan-tugas-kuliah--pemantauan-masukan-dosen)
   - 7.5 [Pelaksanaan Kuis & Ujian Daring (Auto-Save & Navigasi Soal)](#75-pelaksanaan-kuis--ujian-daring-auto-save--navigasi-soal)
   - 7.6 [Pemantauan Ambang Batas Kehadiran 75% Syarat Ujian (UTS/UAS)](#76-pemantauan-ambang-batas-kehadiran-75-syarat-ujian-utsuas)
   - 7.7 [Buku Nilai Pribadi (Transparansi Komponen Evaluasi & Huruf Mutu)](#77-buku-nilai-pribadi-transparansi-komponen-evaluasi--huruf-mutu)
   - 7.8 [Pusat Notifikasi & Layanan Bantuan Mandiri](#78-pusat-notifikasi--layanan-bantuan-mandiri)
8. [BAB 8: KEBIJAKAN AKADEMIK & STANDAR EVALUASI INSTITUSI](#bab-8-kebijakan-akademik--standar-evaluasi-institusi)
   - 8.1 [Tabel Standar Rentang Nilai Huruf Mutu UAY (Preset 2026.1)](#81-tabel-standar-rentang-nilai-huruf-mutu-uay-preset-20261)
   - 8.2 [Rumus & Pembobotan Nilai Akhir Semester](#82-rumus--pembobotan-nilai-akhir-semester)
   - 8.3 [Regulasi Ambang Batas Kehadiran Minimal 75%](#83-regulasi-ambang-batas-kehadiran-minimal-75)
9. [BAB 9: INTEGRASI TELEMETRI EKSEKUTIF DASHBOARD REKTOR UAY](#bab-9-integrasi-telemetri-eksekutif-dashboard-rektor-uay)
   - 9.1 [Tujuan & Manfaat Bagi Pimpinan Universitas](#91-tujuan--manfaat-bagi-pimpinan-universitas)
   - 9.2 [Struktur Snapshot Telemetri Real-Time](#92-struktur-snapshot-telemetri-real-time)
10. [BAB 10: FAQ & PANDUAN PEMECAHAN MASALAH (TROUBLESHOOTING)](#bab-10-faq--panduan-pemecahan-masalah-troubleshooting)
   - 10.1 [Kendala Login & SSO](#101-kendala-login--sso)
   - 10.2 [Kendala Presensi Perkuliahan](#102-kendala-presensi-perkuliahan)
   - 10.3 [Kendala Materi & Pelacakan Progres Video/Slide](#103-kendala-materi--pelacakan-progres-videoslide)
   - 10.4 [Kendala Pengunggahan Tugas & Kuis](#104-kendala-pengunggahan-tugas--kuis)
   - 10.5 [Kendala Hak Akses Dosen & Admin Prodi](#105-kendala-hak-akses-dosen--admin-prodi)
11. [BAB 11: PUSAT BANTUAN & KONTAK LAYANAN TERPADU TIK UAY](#bab-11-pusat-bantuan--kontak-layanan-terpadu-tik-uay)
   - 11.1 [Pusat Bantuan Mandiri Terintegrasi (Help Center)](#111-pusat-bantuan-mandiri-terintegrasi-help-center)
   - 11.2 [Saluran Bantuan Resmi Helpdesk UAY](#112-saluran-bantuan-resmi-helpdesk-uay)

---

## BAB 1: PENDAHULUAN & ARSITEKTUR EKOSISTEM DIGITAL UAY

### 1.1 Visi & Nilai Utama Sistem
E-Learning UAY dibangun dengan visi menyediakan platform pembelajaran modern, handal, dan berintegritas tinggi. Sistem mengusung empat pilar utama:
1. **Keamanan & Autentikasi Tunggal (Single Sign-On)**: Menggunakan portal identitas kampus resmi. Tidak ada penyimpanan kata sandi terpisah di aplikasi e-learning.
2. **Isolasi Data Berjenjang (Department Scoping)**: Setiap program studi memiliki ruang kerja independen, menjamin kerahasiaan data dan kemudahan tata kelola kurikulum.
3. **Akuntabilitas Kehadiran Terstandar**: Sistem presensi hibrida (mandiri kode 6-digit, QR code, serta roster manual) dengan pemantauan otomatis kelayakan ujian minimal **75%**.
4. **Visibilitas Eksekutif Real-Time**: Integrasi langsung dengan **Dashboard Rektor UAY** yang menyajikan metrik keaktifan perkuliahan universitas secara transparan dan akurat.

### 1.2 Ekosistem Terpadu: SSO, File-Service, E-Learning, & Dashboard Rektor
Ekosistem digital kampus UAY terdiri dari empat komponen yang saling terhubung:

```
+-----------------------------------------------------------------------------------+
|                           PORTAL SSO UAY (Keycloak)                               |
|              - Otentikasi Terpusat  - Multi-Factor Authentication (MFA)          |
+-----------------------------------------------------------------------------------+
                                         │ Token JWT
                                         ▼
+-----------------------------------------------------------------------------------+
|                                E-LEARNING UAY                                     |
|  [Super Admin]  ──►  [Admin Prodi]  ──►  [Dosen Pengampu]  ──►  [Mahasiswa]       |
|  - Tata Kelola       - Kelas Prodi       - Materi & Kuis        - Presensi Mandiri|
|  - Katalog MK        - Enrol Mahasiswa   - Presensi Proyektor   - Unggah Tugas    |
|  - Kebijakan Nilai   - Dosen Lintas      - Gradebook Otomatis   - Syarat Ujian 75%|
+-----------------------------------------------------------------------------------+
           ▲                                                        │
           │ Kuota & Berkas                                         │ Snapshot Telemetri
           ▼                                                        ▼
+-------------------------------------+  +------------------------------------------+
|          FILE-SERVICE UAY           |  |           DASHBOARD REKTOR UAY           |
|  - Penyimpanan Dokumen/PDF/Slide    |  |  - Agregasi Keaktifan Perkuliahan Kampus |
|  - Streaming Video Perkuliahan      |  |  - Monitoring Capaian Kurikulum & SKS    |
+-------------------------------------+  +------------------------------------------+
```

### 1.3 Kebutuhan Perangkat & Peramban yang Didukung
Aplikasi berbasis web modern responsif (Single Page Application) yang dapat diakses melalui:
- **Komputer / Laptop**: Google Chrome (versi 110+), Mozilla Firefox (versi 110+), Microsoft Edge (versi 110+), Apple Safari (versi 16+).
- **Ponsel Pintar / Tablet**: Android Chrome, iOS Safari, Samsung Internet.
- **Koneksi Internet**: Minimal 512 Kbps untuk teks/dokumen; disarankan minimal 2 Mbps untuk pemutaran materi video.

---

## BAB 2: MATRIKS PERAN & HAK AKSES PENGGUNA (ROLE-BASED ACCESS CONTROL)

### 2.1 Klasifikasi Peran Pengguna
Dalam sistem E-Learning UAY, terdapat empat tingkatan peran pengguna:
1. **Super Administrator (`SUPER_ADMIN`)**: Administrator sistem tingkat universitas dan pimpinan TIK. Memiliki hak akses menyeluruh ke seluruh modul, fakultas, dan program studi.
2. **Administrator Program Studi (`DEPARTMENT_ADMIN`)**: Staf akademik yang ditugaskan mengelola kurikulum, kelas, penugasan dosen, dan pendaftaran mahasiswa pada program studi tertentu.
3. **Dosen / Pengampu Kelas (`INSTRUCTOR`)**: Tenaga pendidik yang mengampu mata kuliah. Bertanggung jawab atas materi, penugasan, pelaksanaan kuis/ujian, presensi perkuliahan, dan pembobotan nilai akhir.
4. **Mahasiswa (`STUDENT`)**: Peserta didik yang terdaftar pada kelas perkuliahan aktif. Berhak mengakses materi, mengisi presensi mandiri, mengumpulkan tugas, mengikuti ujian, dan memantau rekapitulasi kehadiran serta nilai pribadi.

### 2.2 Tabel Matriks Hak Akses Antar-Fitur Lengkap

| Fitur / Modul Operasional | Mahasiswa | Dosen | Admin Prodi | Super Admin |
|:---|:---:|:---:|:---:|:---:|
| **Masuk via SSO UAY & Profil Pribadi** | ✓ | ✓ | ✓ | ✓ |
| **Pusat Bantuan Mandiri (Help Center)** | ✓ | ✓ | ✓ | ✓ |
| **Melihat Kelas yang Diikuti / Diampu** | ✓ | ✓ | ✓ | ✓ |
| **Mengisi Presensi Mandiri (Kode/QR)** | ✓ | - | - | - |
| **Melihat Rekap Kehadiran & Status 75%** | ✓ | ✓ | ✓ | ✓ |
| **Mengunduh Materi Kuliah (PDF/Slide/Video)** | ✓* *(setelah syarat)* | ✓ | ✓ | ✓ |
| **Mengumpulkan Tugas & Mengikuti Kuis** | ✓ | - | - | - |
| **Melihat Buku Nilai Pribadi** | ✓ | - | - | - |
| **Membuka Presensi Layar Proyektor (Kode 6-Digit)**| - | ✓ | ✓ | ✓ |
| **Mengoreksi Presensi Roster Manual & Sakit/Izin** | - | ✓ | ✓ | ✓ |
| **Mengunggah & Mengatur Materi Kuliah** | - | ✓ | ✓ | ✓ |
| **Membuat Tugas & Rubrik Penilaian** | - | ✓ | ✓ | ✓ |
| **Membuat Kuis, Ujian, & Bank Soal (8 Tipe)** | - | ✓ | ✓ | ✓ |
| **Menilai Tugas & Jawaban Esai Mahasiswa** | - | ✓ | ✓ | ✓ |
| **Mengelola Bobot Nilai & Gradebook Kelas** | - | ✓ | ✓ | ✓ |
| **Mengekspor Rekap Presensi & Nilai (CSV)** | - | ✓ | ✓ | ✓ |
| **Kloning Kelas untuk Semester Baru** | - | ✓ | ✓ | ✓ |
| **Membuat Kelas Perkuliahan Baru** | - | - | ✓ | ✓ |
| **Menugaskan Dosen Pengampu & Dosen Lintas Prodi** | - | - | ✓ | ✓ |
| **Mengelola Pendaftaran Mahasiswa (Enrollment)** | - | - | ✓ | ✓ |
| **Monitoring Kesiapan Perkuliahan Prodi** | - | - | ✓ | ✓ |
| **Mengelola Master Katalog Mata Kuliah Kampus** | - | - | - | ✓ |
| **Konfigurasi Kebijakan & Tahun Ajaran Global** | - | - | - | ✓ |
| **Audit Log Global & Pengawasan Keamanan** | - | - | - | ✓ |
| **Snapshot Telemetri Dashboard Rektor** | - | - | - | ✓ |

---

## BAB 3: ALUR AUTENTIKASI TUNGGAL (SINGLE SIGN-ON / SSO UAY)

### 3.1 Prinsip Keamanan Zero Local Password
E-Learning UAY menerapkan standar keamanan modern:
- Aplikasi **tidak menyimpan kata sandi** pengguna di basis data lokal.
- Semua kredensial diverifikasi langsung oleh peladen **SSO Keycloak Universitas Achmad Yani**.
- Kebijakan ini memastikan kata sandi mahasiswa dan dosen tetap aman dan terpusat pada satu pintu akses resmi.

### 3.2 Prosedur Masuk Menggunakan SSO UAY
1. Buka halaman utama E-Learning UAY pada alamat resmi kampus (`https://elearning.uay.ac.id`).
2. Klik tombol utama berwarna hijau: **"Masuk dengan SSO UAY"**.
3. Sistem mengarahkan peramban Anda ke laman autentikasi resmi SSO (`https://sso.uay.ac.id`).
4. Masukkan **Alamat Email Kampus Resmi** (atau NIM bagi mahasiswa / NIDN bagi dosen).
5. Masukkan **Kata Sandi SSO** Anda.
6. Klik **"Masuk"**. Sistem akan memvalidasi kredensial dan secara instan mengarahkan Anda kembali ke beranda E-Learning sesuai hak peran Anda.

### 3.3 Autentikasi Dua Faktor (MFA / 2FA)
Untuk peran pimpinan, dosen, dan administrator, akun SSO dapat dilengkapi dengan Autentikasi Dua Faktor:
- Setelah memasukkan kata sandi, sistem meminta 6-digit kode verifikasi waktu nyata (*Time-based One-Time Password / TOTP*).
- Buka aplikasi autentikator di ponsel Anda (contoh: Google Authenticator / Microsoft Authenticator), masukkan kode 6-digit tersebut, lalu konfirmasi.

### 3.4 Manajemen Sesi & Logout Terpadu
- **Durasi Sesi**: Sesi aktif dilindungi oleh token keamanan bertenggat waktu. Aktivitas pengguna secara berkala memperbarui tiket otorisasi.
- **Keluar Bersih (Logout)**: Klik ikon foto profil di sudut kanan atas, lalu klik tombol **"Keluar"**. Sistem akan mengakhiri sesi lokal dan memutus tiket otentikasi pada server SSO untuk mencegah penyalahgunaan pada perangkat publik.

### 3.5 Pemulihan Akun & Reset Kata Sandi SSO
Apabila Anda lupa kata sandi SSO:
1. Pada laman masuk SSO UAY, klik tautan **"Lupa Kata Sandi?"**.
2. Masukkan email institusi Anda untuk menerima tautan pemulihan resmi.
3. Jika terdapat kendala email tidak aktif, hubungi Helpdesk SSO TIK UAY melalui email `sso-admin@uay.ac.id`.

---

## BAB 4: PANDUAN SUPER ADMINISTRATOR & PIMPINAN UNIVERSITAS

### 4.1 Universal Scope & Kendali Lintas Fakultas
Sebagai `SUPER_ADMIN`:
- Anda memiliki akses pandang dan kendali universal (*Universal Scope*) mencakup seluruh fakultas dan program studi.
- Anda dapat berpindah peninjauan antar-prodi tanpa hambatan isolasi data.

### 4.2 Manajemen Pengguna Global & Sinkronisasi Direktori SSO
- **Pencarian Pengguna**: Cari akun berdasarkan Nama, NIM, NIDN, atau Email kampus.
- **Status Akun**: Memantau status keaktifan akun (`ACTIVE` atau `DISABLED`). Akun yang berstatus nonaktif di SSO otomatis ditolak aksesnya oleh E-Learning.
- **Penetapan Peran Global**: Menetapkan peran operasional (`SUPER_ADMIN`, `DEPARTMENT_ADMIN`, `INSTRUCTOR`, `STUDENT`).
- **Penetapan Department Scopes**: Menentukan daftar kode program studi yang dapat dikelola oleh seorang Admin Program Studi.

### 4.3 Tata Kelola Kebijakan Akademik & Tahun Ajaran (Academic Governance)
Super Admin dapat membuka jendela modal **"Kebijakan & Tahun Ajaran"** melalui Dashboard Admin:
1. **Tahun Akademik Aktif**: Mengatur periode semester aktif kampus (contoh: `2026/2027 Ganjil`, `2026/2027 Genap`).
2. **Daftar Semester Resmi**: Menambah atau memperbarui opsi semester yang dapat dipilih saat pembuatan kelas baru.
3. **Standar Skala Huruf Mutu UAY**: Memilih preset skala penilaian aktif:
   - **Standar Akademik UAY 2026/2027** (`Preset 2026.1`): Standar resmi aktif institusi.
   - **Standar Akademik Lama** (`Preset 2024.1`): Khusus penyesuaian arsip masa lalu.

### 4.4 Pengelolaan Master Katalog Mata Kuliah Universitas
Menu **/catalog** memungkinkan pengelolaan kurikulum resmi:
- **Tambah Mata Kuliah**: Masukkan Kode Mata Kuliah (contoh: `IF-201`), Nama Mata Kuliah, Bobot SKS (1–6 SKS), dan Program Studi pemilik kurikulum.
- **Pencarian & Filter**: Memfilter mata kuliah berdasarkan prodi atau mencari judul mata kuliah secara cepat.

### 4.5 Audit Log Global & Pengawasan Keamanan Sistem
- Setiap aksi administratif krusial (pembuatan kelas, pengubahan nilai, penghapusan materi, penerbitan kuis) terekam dalam **Audit Log**.
- Informasi yang dicatat: Waktu kejadian (*timestamp*), ID Pengguna pelaku aksi, alamat IP, aksi yang dilakukan, dan entitas data yang terpengaruh.

### 4.6 Integrasi Telemetri Eksekutif Dashboard Rektor UAY
E-Learning UAY menyediakan jalur bridging data bagi pimpinan universitas (Rektor & Wakil Rektor):
- **Endpoint**: `GET /api/v1/integrations/rector/snapshot`
- **Keamanan**: Dilindungi oleh *Bearer Secret Token* (`RECTOR_INTEGRATION_TOKEN`).
- **Data yang Disajikan ke Dashboard Rektor**:
  - Jumlah total kelas aktif per fakultas dan prodi.
  - Jumlah materi perkuliahan terbit (Dokumen, Slide, Video, Lainnya).
  - Jumlah penugasan dan pelaksanaan kuis aktif.
  - Rasio rata-rata presensi kehadiran mahasiswa se-universitas.

### 4.7 Manajemen Penyimpanan & Kuota File Service
- Seluruh dokumen, slide PDF/PPT, dan rekaman video dikelola melalui **File Service UAY**.
- Super Admin dapat memantau utilisasi ruang penyimpanan (*storage volume*) dan memastikan kebijakan retensi berkas berjalan optimal.

---

## BAB 5: PANDUAN ADMINISTRATOR PROGRAM STUDI (DEPARTMENT ADMIN)

### 5.1 Prinsip Isolasi Data Tingkat Program Studi (Department Scopes)
Administrator Program Studi memiliki kewenangan tata kelola yang terisolasi (*Department Scoped*):
- Admin Prodi Teknik Informatika hanya berwenang melihat data, mahasiswa, dan kelas pada Prodi Teknik Informatika.
- Hal ini menjamin privasi nilai dan kerapian administrasi antar-fakultas.

### 5.2 Pembuatan & Konfigurasi Kelas Perkuliahan Semester
Setiap menjelang awal semester:
1. Buka menu **"Dashboard"** atau **"Kelas"**.
2. Klik tombol **"+ Kelas Baru"**.
3. Pilih **Mata Kuliah** dari katalog yang tersedia di prodi Anda.
4. Masukkan **Nama Kelas / Rombel** (contoh: *Kelas A*, *Kelas Pagi*, *Reguler B*).
5. Pilih **Tahun Ajaran** (contoh: *2026/2027 Ganjil*).
6. Tentukan kapasitas maksimal mahasiswa.
7. Klik **"Simpan Kelas"**. Kelas baru akan berstatus **DRAFT** hingga siap diterbitkan.

### 5.3 Penugasan Dosen Utama & Dosen Lintas Program Studi (Multi-Afiliasi)
1. Buka detail kelas yang telah dibuat $ightarrow$ pilih tab **"Peserta & Pengampu"**.
2. Klik **"Tambah Dosen Pengampu"**.
3. Ketikkan Nama atau NIDN dosen yang bersangkutan.
4. Sistem mendukung penugasan **Dosen Lintas Program Studi**: dosen dari program studi lain yang mengajar di prodi Anda dapat dicari dan ditugaskan secara langsung.
5. Tetapkan peran dosen: *Dosen Utama* atau *Dosen Pendamping (Team Teaching)*.

### 5.4 Manajemen Peserta Kuliah (Enrollment Mahasiswa & Toggle Status Aktif)
1. Pada tab **"Peserta"** di dalam kelas, klik **"Tambah Mahasiswa"**.
2. Pilih mahasiswa berdasarkan NIM atau Nama. Mahasiswa dapat ditambahkan secara perorangan maupun massal.
3. **Toggle Status Aktif Peserta**:
   - Jika terdapat mahasiswa yang mengundurkan diri, cuti akademik, atau belum menyelesaikan registrasi KRS, Admin Prodi dapat menonaktifkan status mahasiswa (*Nonaktifkan Keikutsertaan*).
   - Mahasiswa berstatus nonaktif tidak akan dapat mengakses materi atau mengisi presensi kelas tersebut, namun riwayat akademiknya tetap tersimpan aman.

### 5.5 Monitoring Kesiapan Perkuliahan & Audit Silabus Awal Semester
- Admin Prodi dapat memantau indikator status setiap kelas di prodinya:
  - Berapa kelas yang masih berstatus `DRAFT`.
  - Berapa kelas yang sudah `PUBLISHED` (Diterbitkan).
  - Apakah dosen pengampu telah mengunggah silabus dan materi untuk Pertemuan 1 s.d. 3 sebelum perkuliahan perdana dimulai.

### 5.6 Rekapitulasi Presensi & Pelaporan Nilai Tingkat Program Studi
- Mengakses tab **"Buku Nilai"** dan **"Rekap Presensi"** kelas untuk mencetak Berita Acara Perkuliahan (BAP).
- Memastikan rasio kelayakan ujian mahasiswa di program studi memenuhi standar minimal universitas (**75%**).

---

## BAB 6: PANDUAN DOSEN / PENGAMPU KELAS (INSTRUCTOR)

### 6.1 Navigasi Dashboard Dosen, Filter Prodi, & Antrean Penilaian (Grading Queue)
Setelah masuk, dosen akan melihat Dashboard Pengajaran:
- **Filter Multi-Afiliasi Program Studi**: Jika Anda mengajar di lebih dari satu prodi, klik tombol filter di atas daftar kelas untuk menyaring kelas per prodi.
- **Antrean Penilaian (*Grading Queue*)**: Menampilkan daftar tugas mahasiswa dan kuis bertipe esai yang telah dikumpulkan dan menanti pemeriksaan Anda. Klik langsung untuk menuju lembar penilaian.

### 6.2 Struktur Kelas: Pertemuan (Sections), Silabus, & Pengumuman Terarah
- **Pertemuan (*Sections*)**: Pembelajaran diorganisasikan per pertemuan (contoh: *Pertemuan 1: Kontrak Kuliah & Pengantar*, *Pertemuan 2*, dst.).
- **Pengurutan Pertemuan**: Dosen dapat menata urutan pertemuan menggunakan tombol naik/turun atau menyeret ikon pegangan (*drag handle*).
- **Pengumuman Kelas**: Terbitkan pengumuman penting yang akan memunculkan banner notifikasi langsung di dashboard seluruh mahasiswa kelas tersebut.

### 6.3 Pengunggahan & Pengelolaan Materi Perkuliahan (4 Format Media)
Pada setiap pertemuan, klik **"+ Tambah Materi"**. Pilih jenis media yang sesuai:
1. **DOKUMEN**: Untuk silabus perkuliahan, modul ajar praktikum, dan materi bacaan (format PDF, DOCX).
2. **SLIDE**: Untuk salindia presentasi perkuliahan (format PPT, PPTX, PDF Slide). Mahasiswa dapat menavigasi slide secara interaktif.
3. **VIDEO**: Untuk rekaman pengajaran atau video penjelasan (format MP4 atau tautan embed video).
4. **LAINNYA**: Untuk materi pendukung, berkas *source code*, dataset latihan, tautan eksternal GitHub, dsb.

### 6.4 Aturan Penyelesaian Belajar (Completion Rules) & Proteksi Unduh
Dosen dapat mengaktifkan fitur **"Syarat Penyelesaian Belajar"**:
- **Proteksi Unduh Berkas**: Tombol unduh dokumen dinonaktifkan bagi mahasiswa sebelum mahasiswa menyelesaikan pembacaan dokumen atau menonton video materi secara tuntas.
- **Pencegah Manipulasi Waktu Video (*Anti-Skip Frontier Tracker*)**: Pemutar video mencatat durasi tonton nyata. Mahasiswa yang mempercepat atau melompati linimasa video ke bagian akhir tidak akan mendapatkan progres 100%.

### 6.5 Pengelolaan Tugas Kuliah (Assignments) & Rubrik Penilaian
1. Klik **"+ Tambah Tugas"** pada pertemuan terkait.
2. Atur parameter tugas:
   - **Judul & Instruksi Tugas**: Tulis deskripsi tugas dengan jelas.
   - **Tenggat Waktu (*Due Date*)**: Batas waktu normal pengumpulan tugas.
   - **Batas Toleransi Terlambat (*Cut-off Date*)**: Waktu sistem menolak seluruh pengumpulan lebih lanjut.
   - **Format Berkas yang Diizinkan**: Dokumen (PDF/DOCX), Arsip (ZIP), atau tautan penyimpanan awan (*Cloud Link*).
3. **Pemeriksaan & Rubrik**:
   - Unduh atau pratinjau berkas tugas mahasiswa langsung di browser.
   - Berikan skor numerik (0–100) dan catatan masukan kualitatif (*feedback*).

### 6.6 Penyusunan Kuis & Ujian (8 Ragam Soal, Bank Soal, & Impor Excel)
E-Learning UAY menyediakan mesin evaluasi canggih dengan 8 variasi tipe soal:
1. **Pilihan Ganda Tunggal (*Single Choice*)**: Satu jawaban benar dengan opsi acak.
2. **Pilihan Ganda Kompleks (*Multiple Select*)**: Memilih lebih dari satu opsi yang benar dengan skor parsial/penuh.
3. **Benar / Salah (*True / False*)**: Pernyataan biner.
4. **Isian Singkat (*Short Answer*)**: Jawaban kata/frasa spesifik.
5. **Menjodohkan (*Matching*)**: Memasangkan premis dengan respons yang tepat.
6. **Mengurutkan (*Ordering*)**: Menyusun runtutan kronologis atau tahapan logis.
7. **Esai (*Essay*)**: Jawaban terbuka yang dinilai secara manual oleh dosen.
8. **Unggah Berkas (*File Upload*)**: Soal hitungan/desain di mana mahasiswa mengunggah lembar jawaban foto/PDF.

- **Bank Soal & Impor Excel**: Dosen dapat mengunggah puluhan soal sekaligus menggunakan berkas template Excel resmi tanpa perlu mengetik manual satu demi satu.

### 6.7 Konfigurasi Timer Ujian & 4 Mode Publikasi Hasil
- **Mode Timer**:
  - *Independen dari Deadline*: Mahasiswa mendapat durasi penuh pengerjaan sejak klik mulai, meskipun mendekati jam tutup kalender.
  - *Serentak dengan Deadline*: Waktu berhenti secara mutlak begitu batas jam penutupan ujian tiba.
- **Mode Publikasi Nilai**:
  - `AUTO`: Nilai instan muncul begitu mahasiswa menyelesaikan ujian (cocok untuk kuis latihan mandiri).
  - `HIDDEN`: Skor disembunyikan sepenuhnya dari mahasiswa.
  - `MANUAL`: Nilai baru tampil kepada mahasiswa setelah dosen menekan tombol *"Publikasikan Hasil"*.
  - `SCHEDULED`: Nilai otomatis terbuka pada tanggal dan jam rilis yang telah ditentukan dosen.

### 6.8 Presensi Layar Proyektor (Kode 6-Digit & QR Code Dinamis)
Saat memulai sesi kuliah di kelas:
1. Buka kelas $ightarrow$ pilih tab **"Presensi"**.
2. Klik tombol **"Buka Sesi Presensi Baru"**.
3. Masukkan judul pertemuan (contoh: *Pertemuan 4: Algoritma Pencarian*), pilih durasi aktif (contoh: 15 menit), lalu klik **"Buka Presensi Sekarang"**.
4. Sistem memuat **Mode Layar Proyektor (Projector Mode)**:
   - Kode 6-Digit tampil besar di tengah layar (contoh: **7 2 9 4 1 0**).
   - QR Code dinamis siap dipindai kamera gawai mahasiswa.
   - Terdapat penghitung waktu mundur (*Countdown Timer*) dan pemantau jumlah mahasiswa hadir langsung (*Live Counter*).

### 6.9 Presensi Roster Manual, Aksi 'Tandai Semua Hadir', & Catatan Dispensasi
Jika mahasiswa terkendala gawai atau memiliki surat izin resmi:
1. Buka sub-tab **"Lembar Presensi (Roster)"**.
2. Cari nama atau NIM mahasiswa terkait.
3. Ubah status presensi pada menu pilihan:
   - **Hadir (PRESENT)**
   - **Izin (EXCUSED)**
   - **Sakit (SICK)**
   - **Alfa (ABSENT)**
4. Masukkan catatan dispensasi (contoh: *"Surat Sakit No. 12/KLINIK/X/2026"*).
5. **Tombol Cepat "Tandai Semua Hadir"**: Pada kelas tatap muka penuh, klik tombol ini untuk mengubah seluruh mahasiswa berstatus alfa menjadi hadir dalam satu klik, kemudian sesuaikan mahasiswa yang berhalangan sebelum menyimpan.

### 6.10 Rekapitulasi Presensi Semester & Ekspor CSV
1. Masuk ke sub-tab **"Rekap Semester"** pada menu Presensi.
2. Layar menampilkan matriks kehadiran seluruh pertemuan, akumulasi persentase kehadiran (%), dan indikator status kelayakan ujian:
   - Lencana Hijau: $\ge 75\%$ (Memenuhi Syarat Ujian).
   - Lencana Merah: $< 75\%$ (Peringatan Belum Memenuhi Syarat).
3. Klik **"Ekspor Data Presensi (CSV)"** untuk mengunduh berkas laporan resmi yang dapat dibuka di Microsoft Excel.

### 6.11 Pengelolaan Buku Nilai (Gradebook) & Kalkulasi Bobot Otomatis
1. Buka tab **"Buku Nilai"** di kelas Anda.
2. Atur persentase bobot setiap kategori evaluasi (total wajib 100%):
   - Contoh komposisi standar: *Presensi Kehadiran (10%)*, *Tugas & Praktikum (20%)*, *Kuis (15%)*, *UTS (25%)*, *UAS (30%)*.
3. Sistem secara otomatis mengalkulasi nilai kumulatif numerik dan mengonversinya ke **Huruf Mutu** (A, A-, B+, B, B-, C+, C, D, E) berdasarkan kebijakan akademik universitas.
4. Klik **"Ekspor Nilai Akhir"** untuk pelaporan nilai ke bagian akademik.

### 6.12 Fitur Kloning Kelas Semester Baru (Clean Draft & Reset Jadwal)
Saat memasuki semester baru:
1. Dosen tidak perlu membuat ulang materi dari nol. Buka kelas lama Anda, klik tombol **"Kloning Kelas Ini"**.
2. Masukkan nama kelas baru dan pilih periode semester baru.
3. **Mekanisme Cerdas Kloning E-Learning UAY**:
   - Seluruh silabus, materi, tugas, dan kuis disalin ke dalam status **Draf Bersih (Clean Draft)**.
   - Jadwal deadline dan kuis di-reset menjadi belum terjadwal agar tidak bertabrakan dengan kalender akademik baru.
   - Peserta mahasiswa kelas lama **TIDAK diikutsertakan**, memastikan integritas dan privasi data antar-angkatan.

### 6.13 Log Audit Kelas & Transparansi Perubahan Data
Tab **"Log Audit"** menyajikan rekam jejak setiap aksi pengubahan konten, perubahan nilai, atau koreksi presensi. Hal ini menjamin transparansi penuh dan mencegah sengketa nilai di kemudian hari.

---

## BAB 7: PANDUAN MAHASISWA (STUDENT)

### 7.1 Beranda Mahasiswa, Ringkasan Akademik, & Agenda Tenggat Waktu
Setelah masuk via SSO UAY, mahasiswa disambut oleh antarmuka terpadu:
- **Kartu Mata Kuliah Aktif**: Menampilkan daftar kelas semester berjalan, nama dosen pengampu, bobot SKS, dan persentase progres belajar.
- **Agenda & Tenggat Waktu**: Menampilkan daftar tugas dan kuis yang mendekati batas waktu pengumpulan secara urut waktu.
- **Ringkasan Kehadiran Rata-Rata**: Memberikan sinyal visual apakah rata-rata kehadiran Anda berada di zona aman ($\ge 75\%$).

### 7.2 Pengisian Presensi Mandiri (Kode 6-Digit & Pemindaian QR Code)
Saat perkuliahan dimulai dan dosen mengumumkan sesi presensi dibuka:
1. Buka kelas mata kuliah yang bersangkutan di laptop atau ponsel Anda.
2. Di bagian paling atas kelas, muncul banner biru: **"Presensi Perkuliahan Sedang Dibuka"**.
3. Klik tombol **"Isi Presensi Mandiri"**.
4. Masukkan **6-Digit Kode Kehadiran** yang ditampilkan dosen pada proyektor (contoh: `582914`).
   - Kode bersifat *case-insensitive* dan spasi otomatis dibersihkan oleh sistem.
   - Alternatif: Anda juga dapat memindai **QR Code** di layar menggunakan kamera ponsel.
5. Klik **"Kirim Presensi Sekarang"**.
6. Notifikasi hijau akan muncul mengonfirmasi kehadiran Anda: *"Presensi Berhasil Dicatat: HADIR"*.

### 7.3 Mempelajari Materi Kuliah & Pelacakan Progres (Anti-Cheat Frontier)
- **Membaca Dokumen & Modul**: Pratinjau langsung berkas modul (PDF/DOCX) di browser Anda. Setiap halaman yang Anda baca dicatat oleh peladen.
- **Navigasi Slide Presentasi**: Geser salindia perkuliahan satu per satu untuk menandai progres pemahaman materi.
- **Menonton Video Pembelajaran**: Pemutar video terintegrasi mendukung penyesuaian resolusi dan jeda.
  - *Penting*: Anda wajib menonton linimasa video secara utuh. Melompati linimasa video secara paksa tidak akan diakui sebagai progres penyelesaian.
- **Akses Unduh Berkas**: Jika dosen mengaktifkan aturan penyelesaian, tautan unduh berkas baru akan terbuka setelah progres materi Anda mencapai 100%.

### 7.4 Pengumpulan Tugas Kuliah & Pemantauan Masukan Dosen
1. Klik nama tugas pada pertemuan terkait.
2. Baca rincian instruksi, batas pengumpulan (*Due Date*), dan rubrik penilaian yang ditetapkan dosen.
3. Pilih berkas tugas dari komputer/gawai Anda (PDF, DOCX, ZIP) atau masukkan tautan Google Drive / GitHub jika diminta.
4. Klik tombol **"Kirim Tugas"**.
5. Pastikan tanda konfirmasi waktu pengumpulan berhasil muncul di layar. Anda dapat memperbarui unggahan tugas selama batas waktu toleransi belum ditutup.
6. Setelah diperiksa dosen, nilai beserta catatan evaluasi akan langsung tampil di halaman tugas dan pusat notifikasi Anda.

### 7.5 Pelaksanaan Kuis & Ujian Daring (Auto-Save & Navigasi Soal)
1. Klik judul kuis atau ujian pada pertemuan yang dijadwalkan.
2. Periksa parameter ujian: durasi pengerjaan, batas percobaan (*attempt*), dan batas waktu akhir.
3. Klik **"Mulai Pengerjaan"**.
4. **Fitur Auto-Save**: Setiap jawaban yang Anda klik atau ketikkan otomatis tersimpan di server. Anda tidak perlu khawatir kehilangan jawaban jika terjadi gangguan internet sesaat.
5. Gunakan nomor soal di bilah samping untuk berpindah antar-soal.
6. Setelah seluruh soal selesai dijawab, klik **"Kumpulkan dan Selesaikan Ujian"**.
7. Konfirmasi pengumpulan. Nilai Anda akan tampil seketika atau diumumkan kemudian sesuai dengan kebijakan publikasi dosen pengampu.

### 7.6 Pemantauan Ambang Batas Kehadiran 75% Syarat Ujian (UTS/UAS)
Universitas Achmad Yani memberlakukan ketentuan ketat mengenai kelayakan ujian:
- Mahasiswa **wajib memiliki tingkat kehadiran minimal 75%** dari total pertemuan tatap muka.
- Buka tab **"Presensi"** di dalam kelas untuk mengecek:
  - Total sesi perkuliahan yang telah diselenggarakan.
  - Rincian Hadir, Izin, Sakit, dan Alfa.
  - **Lencana Kelayakan Ujian**:
    - **"MEMENUHI SYARAT UJIAN"** (Warna Hijau): Anda berhak mengikuti UTS/UAS.
    - **"BELUM MEMENUHI SYARAT UJIAN"** (Warna Merah): Kehadiran Anda berada di bawah 75%. Segera temui dosen pengampu atau serahkan bukti surat izin/sakit resmi sebelum batas akhir pengisian nilai.

### 7.7 Buku Nilai Pribadi (Transparansi Komponen Evaluasi & Huruf Mutu)
- Buka menu navigasi **"Nilai"** untuk melihat ringkasan seluruh mata kuliah.
- Masuk ke salah satu kelas $ightarrow$ tab **"Buku Nilai"** untuk melihat transparansi rincian nilai tugas, kuis, UTS, dan UAS beserta bobotnya masing-masing.

### 7.8 Pusat Notifikasi & Layanan Bantuan Mandiri
- Ikon lonceng di bilah atas menampilkan pembaruan terkini: pengumuman dosen, tugas baru, dan terbitnya nilai.
- Akses menu **"Bantuan"** kapan saja untuk mencari panduan pemecahan masalah mandiri.

---

## BAB 8: KEBIJAKAN AKADEMIK & STANDAR EVALUASI INSTITUSI

### 8.1 Tabel Standar Rentang Nilai Huruf Mutu UAY (Preset 2026.1)
Berdasarkan Keputusan Akademik Universitas Achmad Yani, skala nilai huruf mutu resmi yang berlaku per Semester Ganjil 2026/2027 adalah sebagai berikut:

| Rentang Skor Numerik | Huruf Mutu | Bobot Indeks Prestasi (Point) | Status Keterangan |
|:---:|:---:|:---:|:---|
| **$\ge 85.00$** | **A** | **4.00** | Sangat Baik (Istimewa) |
| **$80.00 - 84.99$** | **A-** | **3.75** | Sangat Baik |
| **$75.00 - 79.99$** | **B+** | **3.50** | Baik Sekali |
| **$70.00 - 74.99$** | **B** | **3.00** | Baik |
| **$65.00 - 69.99$** | **B-** | **2.75** | Cukup Baik |
| **$60.00 - 64.99$** | **C+** | **2.50** | Cukup |
| **$55.00 - 59.99$** | **C** | **2.00** | Cukup (Batas Kelulusan Minimal) |
| **$45.00 - 54.99$** | **D** | **1.00** | Kurang (Wajib Perbaikan) |
| **$< 45.00$** | **E** | **0.00** | Gagal (Wajib Mengulang) |

### 8.2 Rumus & Pembobotan Nilai Akhir Semester
Nilai Akhir Mahasiswa dihitung berdasarkan rumus pembobotan proporsional:
$$	ext{Nilai Akhir} = \sum_{i=1}^{k} \left( rac{	ext{Bobot Kategori}_i}{100} 	imes 	ext{Rata-rata Skor}_i ight)$$

Di mana total seluruh bobot kategori wajib memenuhi:
$$\sum_{i=1}^{k} 	ext{Bobot Kategori}_i = 100\%$$

Sistem E-Learning UAY secara otomatis menolak penyimpanan konfigurasi gradebook jika akumulasi persentase bobot tidak tepat bernilai 100%.

### 8.3 Regulasi Ambang Batas Kehadiran Minimal 75%
1. Sesuai Buku Pedoman Akademik UAY, mahasiswa yang memiliki akumulasi ketidakhadiran (alfa/tanpa keterangan) melebihi 25% dari total sesi perkuliahan aktif dinyatakan **TIDAK BERHAK MENGIKUTI UJIAN AKHIR SEMESTER (UAS)**.
2. Nilai kehadiran dihitung secara matematis oleh sistem:
   $$	ext{Persentase Kehadiran} = rac{	ext{Jumlah Sesi Hadir} + 	ext{Jumlah Sesi Izin Resmi}}{	ext{Total Sesi Perkuliahan yang Diselenggarakan}} 	imes 100\%$$
3. Status Sakit dan Izin Resmi hanya diakui jika dosen pengampu telah memperbarui status presensi pada Roster dan membubuhkan catatan nomor surat keterangan.

---

## BAB 9: INTEGRASI TELEMETRI EKSEKUTIF DASHBOARD REKTOR UAY

### 9.1 Tujuan & Manfaat Bagi Pimpinan Universitas
Integrasi E-Learning dengan **Dashboard Rektor UAY** bertujuan menyediakan visibilitas menyeluruh bagi Rektor, para Wakil Rektor, dan Badan Penjaminan Mutu Akademik (BPM) untuk memantau kelancaran kegiatan belajar mengajar secara *real-time* tanpa mengganggu privasi detail kelas.

### 9.2 Struktur Snapshot Telemetri Real-Time
Aplikasi E-Learning menyediakan endpoint aman `GET /api/v1/integrations/rector/snapshot` yang mengembalikan data agregat terstruktur:

```json
{
  "system": "E-Learning UAY",
  "generatedAt": "2026-10-05T06:15:00Z",
  "academicYear": "2026/2027 Ganjil",
  "overview": {
    "totalFaculties": 4,
    "totalDepartments": 12,
    "totalActiveClasses": 248,
    "totalEnrolledStudents": 4120,
    "totalLecturersActive": 185
  },
  "contentActivity": {
    "totalPublishedSections": 1984,
    "documentsUploaded": 3410,
    "slideDecksPublished": 1820,
    "videoLecturesStreamed": 890,
    "assignmentsActive": 980,
    "quizzesAdministered": 640
  },
  "attendanceCompliance": {
    "universityAverageAttendance": 91.4,
    "eligibleStudentsRate": 94.2,
    "sessionsConductedThisWeek": 496
  }
}
```

Melalui data telemetri ini, pimpinan universitas dapat segera mendeteksi program studi yang membutuhkan perhatian khusus, mengevaluasi rasio keaktifan dosen, serta memastikan kepatuhan standar mutu akademik kampus.

---

## BAB 10: FAQ & PANDUAN PEMECAHAN MASALAH (TROUBLESHOOTING)

### 10.1 Kendala Login & SSO
- **Tanya**: Saat klik "Masuk dengan SSO UAY", muncul pesan *Session Expired* atau kesalahan otentikasi.
  - **Solusi**: Bersihkan cache dan cookies browser Anda, atau gunakan jendela penyamaran (*Incognito Window*). Pastikan Anda mengakses alamat resmi `https://sso.uay.ac.id`.
- **Tanya**: Saya lupa kata sandi email kampus/SSO saya.
  - **Solusi**: Klik tautan *"Lupa Kata Sandi"* di halaman portal SSO atau hubungi helpdesk TIK melalui `sso-admin@uay.ac.id`. E-Learning tidak dapat mereset kata sandi secara langsung.

### 10.2 Kendala Presensi Perkuliahan
- **Tanya**: Mahasiswa memasukkan kode 6-digit namun sistem menampilkan *"Kode Tidak Valid atau Telah Berakhir"*.
  - **Solusi**: Pastikan jam di gawai Anda tersinkronisasi otomatis dengan waktu internet. Periksa apakah batas durasi sesi presensi dosen telah habis. Jika sesi telah ditutup, mintalah dosen untuk mengoreksi kehadiran Anda melalui lembar Roster manual.
- **Tanya**: Tampilan proyektor dosen tidak menampilkan QR Code.
  - **Solusi**: Periksa koneksi internet laptop dosen. Kode 6-digit teks tetap dapat digunakan mahasiswa secara mandiri tanpa memindai QR code.

### 10.3 Kendala Materi & Pelacakan Progres Video/Slide
- **Tanya**: Mengapa tombol unduh berkas modul (PDF/Slide) berwarna abu-abu dan tidak dapat diklik?
  - **Solusi**: Dosen mengaktifkan aturan *Completion Rules*. Anda wajib membaca seluruh halaman dokumen atau menonton video materi hingga 100% sebelum tombol unduh diaktifkan oleh peladen.
- **Tanya**: Saya sudah menonton video tetapi persentase progres tertahan di 80%.
  - **Solusi**: Sistem menggunakan *Anti-Skip Frontier Tracker*. Putar video secara normal tanpa mempercepat linimasa (*scrubbing*) ke bagian akhir. Pastikan koneksi internet stabil agar sinyal pencatatan progres dapat terkirim berkala ke peladen.

### 10.4 Kendala Pengunggahan Tugas & Kuis
- **Tanya**: Berkas tugas gagal diunggah dan muncul peringatan ukuran berkas.
  - **Solusi**: Pastikan ukuran berkas tidak melebihi kuota maksimal (standar 25 MB). Jika berkas laporan atau video proyek berukuran sangat besar, kompres berkas ke format PDF/ZIP atau unggah ke Google Drive resmi UAY dan serahkan tautannya pada kolom yang disediakan.
- **Tanya**: Koneksi internet terputus saat sedang mengerjakan kuis online.
  - **Solusi**: Jangan panik. Seluruh jawaban yang telah Anda klik otomatis tersimpan (*auto-save*). Segera sambungkan kembali koneksi internet Anda dan muat ulang (*refresh*) halaman ujian untuk melanjutkan pengerjaan selama durasi timer masih tersisa.

### 10.5 Kendala Hak Akses Dosen & Admin Prodi
- **Tanya**: Dosen tidak menemukan mata kuliah yang diampunya di daftar kelas.
  - **Solusi**: Hubungi Administrator Program Studi terkait untuk memastikan bahwa NIDN Anda telah ditugaskan sebagai dosen pengampu pada kelas tersebut.
- **Tanya**: Admin Prodi tidak dapat mengakses menu di luar prodinya.
  - **Solusi**: Ini merupakan mekanisme keamanan resmi (*Department Scoping*). Admin Prodi hanya berwenang mengelola prodi yang terdaftar pada mandat akunnya. Jika Anda mengelola dua prodi, mintalah Super Admin untuk menambahkan cakupan prodi pada profil SSO Anda.

---

## BAB 11: PUSAT BANTUAN & KONTAK LAYANAN TERPADU TIK UAY

### 11.1 Pusat Bantuan Mandiri Terintegrasi (Help Center)
Aplikasi E-Learning UAY dilengkapi dengan **Help Center Mandiri** yang dapat diakses langsung melalui menu navigasi samping atau tautan **/help**:
- Menyediakan lebih dari **50 Artikel Panduan Praktis** yang disusun per peran (Mahasiswa, Dosen, Admin).
- Kolom pencarian instan cerdas untuk menemukan jawaban cepat seputar kendala teknis.

### 11.2 Saluran Bantuan Resmi Helpdesk UAY
Apabila Anda membutuhkan bantuan teknis lanjutan, silakan menghubungi tim dukungan resmi kami melalui saluran berikut:

| Layanan / Divisi | Saluran Kontak | Jam Operasional | Cakupan Layanan |
|:---|:---|:---:|:---|
| **Helpdesk Akademik E-Learning** | `elearning-support@uay.ac.id` | Senin – Jumat (08.00 – 16.00 WITA) | Kendala kelas, presensi, tugas, dan rekap nilai |
| **Layanan Akun & SSO Kampus** | `sso-admin@uay.ac.id` | Senin – Jumat (08.00 – 16.00 WITA) | Reset akun, lupa sandi, aktivasi MFA 2FA |
| **Layanan Terpadu TIK UAY (Fisik)**| Gedung Rektorat UAY Lt. 2 | Hari Kerja Kampus | Konsultasi teknis tatap muka & verifikasi identitas |

---
*Dokumen Buku Panduan Resmi ini diterbitkan dan diawasi oleh Pusat Data, Informasi, dan Pembelajaran Digital Universitas Achmad Yani (UAY).*
