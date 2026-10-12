# PANDUAN PENGUJIAN DAN TEST CASE SISTEM E-LEARNING UNIVERSITAS AL-AMIN YOGYAKARTA (UAY)

**Versi Dokumen:** 2.2 (Versi Sistem Terkini - 45 Modul Pengujian Komprehensif Sesuai Panduan)
**Lingkungan Uji:** Staging / Production (https://elearning.uay.ac.id)
**Dokumen Format PDF Resmi:** `docs/TEST_CASE_PANDUAN_ELEARNING_UAY.pdf`
**Metodologi:** Role-Based Access Control (RBAC) & End-to-End Functional Verification

---

## 1. Matriks Akun Pengujian Resmi

| Peran (Role) | Username / NIM / NIDN | Password Default | Tanggung Jawab Akademik |
|---|---|---|---|
| SUPER_ADMIN | `admin` | `AdminUAY2026!` | Tata kelola universitas, kebijakan skala nilai, audit log kampus, pengumuman darurat. |
| DEPARTMENT_ADMIN | `admin.if` | `AdminProdi2026!` | Kurikulum prodi Informatika, buat kelas, kunci enrollment otomatis 6 huruf, plotting dosen, audit prodi. |
| INSTRUCTOR | `198501012010121001` | `DosenUAY2026!` | Pertemuan (atas/bawah), materi (PDF/video/teks), tugas & simulasi dosen, kuis, presensi, pembobotan nilai 30-35-35. |
| ASSISTANT | `asdos01` / `202401002` | `AsdosUAY2026!` | Asisten Dosen / Lab. Kelola materi praktikum, buka presensi lab, koreksi & nilai laporan praktikum mahasiswa pada kelas yang ditugaskan. |
| STUDENT | `202401001` | `MahasiswaUAY2026!` | Gabung kelas dengan key, isi presensi 1-klik/kode, pelacakan materi adil, submit & revisi tugas, kuis interaktif. |
| RECTOR | `rektor` | `RektorUAY2026!` | Dashboard eksekutif read-only, analitik keaktifan dosen/mahasiswa, ekspor laporan rapat senat rektorat. |

---

## 2. Spesifikasi Rinci 45 Test Case Sesuai Panduan Aplikasi & Fitur Terkini

### TC-GEN-01: Masuk dengan Akun Kampus (SSO Keycloak & Login Lokal Cadangan)
- **Referensi Panduan:** Tutorial U1 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** SEMUA PERAN (`GLOBAL`)
- **Modul / Lokasi:** Autentikasi & Akun (Halaman Masuk (/login))
- **Tujuan Pengujian:** Memastikan proses autentikasi SSO kampus dan login darurat lokal berfungsi aman sesuai peran.
- **Prasyarat:** Browser membuka URL /login, server SSO aktif.
- **Data Uji:** Akun SSO atau kredensial darurat lokal (admin, admin.if, dosen, mahasiswa, rektor).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka halaman utama login /login.
  2. Untuk SSO Kampus: Klik tombol 'Masuk dengan Akun Kampus (SSO)'. Sistem mengarahkan ke portal Keycloak UAY.
  3. Masukkan kredensial kampus lalu konfirmasi izin akses.
  4. Untuk Login Darurat: Masukkan Nama Pengguna / NIM / NIDN dan Kata Sandi pada form lokal, lalu klik Masuk.
  5. Periksa pengalihan halaman setelah berhasil masuk.
- **Hasil yang Diharapkan:** Sesi berhasil dibentuk. Pengguna diarahkan ke dashboard sesuai perannya tanpa loop pengalihan. Token sesi tersimpan aman di cookie berstatus HttpOnly/SameSite.

### TC-GEN-02: Navigasi Menu, Responsivitas Mobile, dan Pemulihan Draf Formulir
- **Referensi Panduan:** Tutorial U2 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** SEMUA PERAN (`GLOBAL`)
- **Modul / Lokasi:** Antarmuka & Draf (Seluruh Halaman & Formulir Editor)
- **Tujuan Pengujian:** Memverifikasi navigasi sidebar desktop, drawer mobile 390px, serta fitur autosave & pemulihan draf lokal.
- **Prasyarat:** Pengguna telah login dan membuka formulir yang mendukung draf (Section, Materi, Tugas, Kuis, Bobot).
- **Data Uji:** Input teks draf pada formulir materi atau tugas.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Periksa menu navigasi di sisi kiri pada layar desktop, pastikan breadcrumb dan header aktif.
  2. Kecilkan ukuran browser ke lebar mobile (390px) atau buka dari smartphone: tombol hamburger membuka drawer navigasi dengan area sentuh minimal 44px.
  3. Buka salah satu form (misal Tambah Materi atau Tambah Pertemuan).
  4. Ketik judul dan deskripsi, lalu tutup modal atau muat ulang halaman secara sengaja tanpa menekan Simpan.
  5. Buka kembali modal form yang sama.
- **Hasil yang Diharapkan:** Drawer mobile responsif dan mulus. Saat form dibuka kembali, sistem menampilkan status draf tersimpan dan memulihkan teks yang sebelumnya telah diketik.

### TC-GEN-03: Profil Pengguna, Tema Gelap/Terang, Notifikasi Lonceng, dan Logout Aman
- **Referensi Panduan:** Tutorial U3 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** SEMUA PERAN (`GLOBAL`)
- **Modul / Lokasi:** Akun & Preferensi (Header Aplikasi & Menu Profil)
- **Tujuan Pengujian:** Memastikan pergantian tema, penerimaan notifikasi real-time, dan pembersihan sesi saat keluar.
- **Prasyarat:** Pengguna sedang dalam sesi aktif.
- **Data Uji:** Preferensi Dark/Light mode, notifikasi aktivitas kelas.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Klik ikon Tema (Matahari / Bulan) di bar navigasi atas: periksa perubahan warna antarmuka dari Terang ke Gelap dan sebaliknya.
  2. Pastikan kontras teks, tombol, dan kartu tetap jelas dan nyaman dibaca pada Mode Gelap.
  3. Klik ikon Lonceng Notifikasi: amati riwayat pemberitahuan tugas baru, materi baru, dan pengumuman sistem.
  4. Buka menu profil pengguna -> klik tombol Keluar (Logout).
  5. Coba gunakan tombol 'Back' di peramban.
- **Hasil yang Diharapkan:** Tema tersimpan persisten di perangkat. Notifikasi tampil akurat. Saat logout, seluruh cookie sesi dan token dihapus; tombol Back tidak dapat membuka data privat.

### TC-ST-01: Menemukan Kelas & Pendaftaran Mandiri dengan Kunci (Enrollment Key 6 Huruf)
- **Referensi Panduan:** Tutorial M1 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** MAHASISWA (`STUDENT`)
- **Modul / Lokasi:** Katalog & Pendaftaran (Beranda Mahasiswa -> Gabung Kelas)
- **Tujuan Pengujian:** Memverifikasi mahasiswa dapat menemukan kelas terbuka atau mendaftar menggunakan kunci 6 huruf kapital dari dosen.
- **Prasyarat:** Login sebagai mahasiswa (202401001). Kelas target memiliki enrollment key aktif.
- **Data Uji:** Kunci pendaftaran 6 karakter huruf kapital (misal: XKLRPT).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Di dashboard mahasiswa, klik tombol 'Gabung Kelas'.
  2. Skenario A (Daftar Terbuka): Cari kelas pada dropdown kelas terbuka yang membuka pendaftaran mandiri.
  3. Skenario B (ID Manual): Klik opsi 'Gunakan ID / Kode Kelas manual', masukkan kode mata kuliah (misal IF202).
  4. Masukkan Kunci Pendaftaran (6 huruf kapital).
  5. Klik tombol 'Gabung ke Kelas'.
- **Hasil yang Diharapkan:** Jika kunci valid, mahasiswa langsung terdaftar sebagai peserta aktif dan diarahkan ke beranda kelas. Jika kunci salah, muncul pesan galat jelas tanpa reload.

### TC-ST-02: Mengisi Presensi Perkuliahan (Satu Klik Mandiri & Verifikasi Kode)
- **Referensi Panduan:** Tutorial M2 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** MAHASISWA (`STUDENT`)
- **Modul / Lokasi:** Presensi Perkuliahan (Kelas -> Tab Presensi)
- **Tujuan Pengujian:** Memastikan mahasiswa dapat mencatatkan kehadiran secara mandiri sesuai jenis sesi yang dibuka dosen.
- **Prasyarat:** Dosen telah membuka sesi presensi pada kelas yang bersangkutan.
- **Data Uji:** Kode verifikasi 6 karakter dari layar dosen (jika sesi menggunakan kode).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka kelas perkuliahan saat jam kuliah berlangsung, lalu pilih tab Presensi.
  2. Perhatikan banner biru notifikasi presensi aktif di bagian atas.
  3. Jika sesi Bebas Kode: Klik tombol 'Konfirmasi Hadir (1-Klik)'.
  4. Jika sesi Kode Proyektor: Klik tombol 'Isi Presensi (Kode)', masukkan 6 karakter kode presensi, lalu klik Simpan.
  5. Periksa tabel riwayat kehadiran pertemuan.
- **Hasil yang Diharapkan:** Status kehadiran langsung berubah menjadi HADIR (PRESENT) disertai stempel waktu presensi. Tombol presensi otomatis nonaktif untuk mencegah klik ganda.

### TC-ST-03: Mempelajari Materi Teks, Dokumen PDF, dan Video dengan Perekaman Progres Akurat
- **Referensi Panduan:** Tutorial M3 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** MAHASISWA (`STUDENT`)
- **Modul / Lokasi:** Pembelajaran Materi (Kelas -> Tab Pembelajaran -> Pilih Materi)
- **Tujuan Pengujian:** Memverifikasi rekaman progres belajar terekam adil dan akurat tanpa merugikan mahasiswa.
- **Prasyarat:** Materi telah berstatus terbit (PUBLISHED).
- **Data Uji:** Materi artikel teks, dokumen PDF multi-halaman, video MP4 / YouTube.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka Materi Teks: scroll dan baca artikel hingga akhir blok. Klik lampiran berkas jika tersedia untuk mengunduh modul pendukung.
  2. Buka Materi Dokumen PDF: buka dokumen, navigasikan tombol halaman hingga halaman terakhir. Periksa auto-page indicator.
  3. Buka Materi Video: putar video hingga melewati batas ambang tonton (misal 85% durasi).
  4. Kembali ke halaman utama daftar pertemuan kelas dan amati ikon checklist progres.
- **Hasil yang Diharapkan:** Ikon indikator pada kartu pertemuan berubah menjadi centang hijau selesai (item-completed). Persentase progres belajar kelas bertambah secara proporsional.

### TC-ST-04: Mengumpulkan Tugas, Mengunggah Berkas, dan Melakukan Revisi (Multi-Versi)
- **Referensi Panduan:** Tutorial M4 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** MAHASISWA (`STUDENT`)
- **Modul / Lokasi:** Tugas Perkuliahan (Kelas -> Tab Pembelajaran -> Detail Tugas)
- **Tujuan Pengujian:** Memverifikasi pengumpulan berkas tugas mandiri serta mekanisme pengumpulan ulang/revisi sebelum batas waktu.
- **Prasyarat:** Tugas sedang dalam periode dibuka dan mahasiswa belum melampaui batas maksimal percobaan.
- **Data Uji:** Berkas tugas (PDF / ZIP ukuran hingga 50MB), teks jawaban, tautan eksternal.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tugas perkuliahan yang ditugaskan dosen.
  2. Unggah berkas tugas melalui dropzone berkas (atau masukkan teks rapi / link tugas sesuai format yang diizinkan).
  3. Klik tombol 'Kumpulkan Tugas'. Perhatikan konfirmasi tanda terima pengumpulan.
  4. Periksa kartu status pengumpulan: tampil status Terkumpul Tepat Waktu (Versi 1) beserta waktu kirim.
  5. Lakukan pengumpulan ulang (revisi): unggah berkas revisi lalu klik tombol 'Kumpulkan Ulang (Versi 2)'.
  6. Amati riwayat versi pengumpulan di tabel riwayat.
- **Hasil yang Diharapkan:** Berkas berhasil diunggah dengan status 200/201. Sistem mencatat versi pengumpulan terbaru sebagai versi aktif untuk penilaian dosen.

### TC-ST-05: Mengerjakan Kuis Perkuliahan Sampai Terkumpul (Timer & Auto-Submit)
- **Referensi Panduan:** Tutorial M5 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** MAHASISWA (`STUDENT`)
- **Modul / Lokasi:** Kuis Interaktif (Kelas -> Tab Pembelajaran -> Detail Kuis)
- **Tujuan Pengujian:** Memastikan integritas pengerjaan kuis, navigasi butir soal, penanda ragu-ragu, dan pengumpulan jawaban.
- **Prasyarat:** Kuis berstatus PUBLISHED dan waktu akses telah dibuka.
- **Data Uji:** Pilihan jawaban Single Choice, Multi Choice, Esai.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka kuis -> klik tombol 'Mulai Kuis'.
  2. Perhatikan indikator hitung mundur waktu (timer) di bar atas.
  3. Jawab butir soal satu per satu, gunakan tombol 'Tandai Ragu-ragu' pada soal yang belum yakin.
  4. Gunakan panel nomor soal untuk berpindah antar butir pertanyaan secara acak.
  5. Klik tombol 'Kumpulkan Jawaban Kuis' sebelum timer habis.
  6. Uji skenario batas waktu: biarkan waktu habis hingga nol untuk memastikan jawaban otomatis terkumpul (auto-submit).
- **Hasil yang Diharapkan:** Jawaban tersimpan otomatis per butir. Saat dikumpulkan atau waktu habis, pengerjaan difinalisasi dan skor objektif dihitung otomatis.

### TC-ST-06: Memeriksa Buku Nilai Pribadi dan Rekapitulasi Kehadiran Mahasiswa
- **Referensi Panduan:** Tutorial M6 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** MAHASISWA (`STUDENT`)
- **Modul / Lokasi:** Buku Nilai & Presensi (Kelas -> Tab Buku Nilai & Tab Presensi)
- **Tujuan Pengujian:** Memverifikasi transparansi nilai mahasiswa, rincian skor per kategori, dan syarat kelayakan ujian 75%.
- **Prasyarat:** Dosen telah memasukkan nilai dan mempublikasikan rekap nilai / kehadiran.
- **Data Uji:** Rekam jejak nilai tugas, kuis, UTS, UAS, dan kehadiran mahasiswa.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab 'Buku Nilai': periksa kartu Nilai Akhir (Skor Angka, Huruf Mutu, Indeks Prestasi 4.00, Tanggal Terbit).
  2. Periksa rincian tabel per kategori bobot (Tugas 30%, UTS 35%, UAS 35%).
  3. Buka tab 'Presensi': periksa persentase total kehadiran kuliah.
  4. Periksa badge kelayakan ujian (Layak Ujian jika kehadiran >= 75%, Tidak Layak jika < 75%).
- **Hasil yang Diharapkan:** Tampilan buku nilai mahasiswa bersifat read-only yang jelas dan transparan. Mahasiswa mengetahui rincian nilai tanpa ada data mahasiswa lain yang bocor.

### TC-IN-01: Menyiapkan Kelas dan Pertemuan (Tambah Pertemuan Atas & Bawah Tengah)
- **Referensi Panduan:** Tutorial D1 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Manajemen Pertemuan (Kelas -> Tab Pembelajaran)
- **Tujuan Pengujian:** Memverifikasi dosen dapat menyusun pertemuan dari tombol toolbar atas maupun tombol tengah di bagian bawah daftar.
- **Prasyarat:** Login sebagai Dosen Pengampu yang terdaftar pada kelas.
- **Data Uji:** Judul pertemuan, tipe pertemuan (Tatap Muka / Daring), tanggal mulai dan selesai.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Masuk ke kelas perkuliahan pada tab Pembelajaran.
  2. Uji tombol 1: Klik tombol '+ Tambah Pertemuan' di kanan atas toolbar.
  3. Scroll ke bawah daftar pertemuan yang sudah ada.
  4. Uji tombol 2: Klik tombol '+ Tambah Pertemuan' yang berada di posisi tengah di bawah pertemuan terakhir.
  5. Isi judul pertemuan: 'Pertemuan 07: Pohon Biner & Graf', tentukan tanggal akses, pilih Draf atau Terbit.
  6. Uji tombol pindah urutan: Gunakan tombol panah Naik / Turun untuk mengatur tata urutan pertemuan.
- **Hasil yang Diharapkan:** Modal tambah pertemuan terbuka sempurna dari kedua tombol. Pertemuan baru berhasil tersimpan dan urutan pertemuan dapat diatur dengan lancar.

### TC-IN-02: Mengunggah Modul PDF & Bahan Praktikum (Dukungan 100MB, Info File Lama, Selector di Atas Judul)
- **Referensi Panduan:** Tutorial D2 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Materi Pembelajaran (Kelas -> Tab Pembelajaran -> + Materi)
- **Tujuan Pengujian:** Memverifikasi peletakan selector tipe materi di atas judul, upload file hingga 100MB, dan tampilan file lama saat edit.
- **Prasyarat:** Dosen berada di dalam pertemuan yang aktif.
- **Data Uji:** File PDF ukuran besar (misal 5MB - 20MB) dan file praktikum.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Klik '+ Materi' pada pertemuan.
  2. Perhatikan posisi kolom: Kolom 'Tipe Materi' berada di baris tersendiri di ATAS kolom 'Judul Materi'.
  3. Pilih Tipe: 'Dokumen PDF', lalu masukkan Judul Materi.
  4. Unggah berkas PDF ukuran > 1.2MB. Amati proses persentase unggahan hingga selesai.
  5. Simpan materi, lalu klik tombol 'Edit' pada materi tersebut.
  6. Periksa tampilan area berkas di modal edit: kartu berkas lama tampil dengan nama berkas, badge hijau 'Berhasil diunggah', dan tombol 'Ganti berkas'.
  7. Periksa kerapian jarak modal: padding atas dan bawah simetris tanpa ruang kosong berlebih.
- **Hasil yang Diharapkan:** Selector tipe materi berada di atas judul, unggah file besar lolos tanpa error 413 Nginx, dan modal edit menampilkan info berkas yang sudah tersimpan.

### TC-IN-03: Mengatur Video Pembelajaran (YouTube & MP4 Lokal) dengan Pelacakan Durasi
- **Referensi Panduan:** Tutorial D3 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Materi Pembelajaran (Kelas -> Tab Pembelajaran -> + Materi (Video))
- **Tujuan Pengujian:** Memastikan integrasi tautan video YouTube atau berkas MP4 lokal dengan deteksi otomatis durasi dan ambang tonton.
- **Prasyarat:** Dosen memiliki URL video YouTube valid atau berkas MP4 lokal.
- **Data Uji:** URL YouTube valid (https://www.youtube.com/watch?v=...) atau berkas video MP4.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Pilih tipe materi 'Video Pembelajaran'.
  2. Masukkan tautan video YouTube: sistem otomatis memvalidasi format URL dan membaca durasi.
  3. Atau unggah file MP4: browser membaca metadata durasi video secara lokal.
  4. Tentukan 'Ambang Batas Tonton' (misal: 85%).
  5. Simpan dan terbitkan materi video.
- **Hasil yang Diharapkan:** Durasi video berhasil terdeteksi. Tombol simpan aktif setelah metadata durasi terbaca. Mahasiswa wajib menonton sesuai ambang batas agar progres belajar terekam.

### TC-IN-04: Menyusun Artikel Teks Kaya (Block Editor, Impor Artikel, dan Lampiran Berkas)
- **Referensi Panduan:** Tutorial D4 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Materi Pembelajaran (Kelas -> Tab Pembelajaran -> + Materi (Teks))
- **Tujuan Pengujian:** Memverifikasi fitur penyusunan modul teks interaktif, impor teks terstruktur, dan penambahan lampiran berkas bebas galat.
- **Prasyarat:** Form materi teks aktif.
- **Data Uji:** Blok paragraf, heading, gambar, kode program, rumus LaTeX, checklist, tabel, dan lampiran berkas.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Pilih tipe materi 'Materi Teks (Rich Text)'.
  2. Gunakan tombol beralih mode: 'Tulis', 'Pratinjau', dan 'Berdampingan'.
  3. Tambahkan berbagai blok konten: Heading H1/H2, Callout Catatan/Peringatan, Rumus LaTeX, dan Cuplikan Kode.
  4. Gunakan fitur 'Alat Artikel' -> Tambah Lampiran Berkas: unggah file arsip/dokumen pendukung.
  5. Uji fitur 'Impor Artikel': tempelkan teks format Markdown/outline dan klik impor.
  6. Simpan materi.
- **Hasil yang Diharapkan:** Seluruh blok teks terformat rapi. Lampiran berkas berhasil diunggah dengan XHR credentials valid tanpa muncul galat koneksi.

### TC-IN-05: Membuat Tugas Perkuliahan (Tenggat Waktu, Toleransi Terlambat, dan Format File)
- **Referensi Panduan:** Tutorial D5 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Tugas Perkuliahan (Kelas -> Tab Pembelajaran -> + Tugas)
- **Tujuan Pengujian:** Memverifikasi konfigurasi tenggat tugas, batas cutoff, dan pembatasan ekstensi berkas pengumpulan.
- **Prasyarat:** Dosen berada di pertemuan kelas yang aktif.
- **Data Uji:** Judul tugas, tenggat waktu, batas akhir pengumpulan (cutoff), format berkas diizinkan (PDF, ZIP, DOCX, TEXT, LINK).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Klik tombol '+ Tugas' pada pertemuan.
  2. Isi judul tugas dan instruksi pengerjaan.
  3. Tentukan Batas Waktu Pengumpulan (Deadline) dan Batas Toleransi Akhir (Cutoff Date).
  4. Centang opsi 'Izinkan Keterlambatan' jika mahasiswa boleh mengumpulkan setelah deadline dengan status TERLAMBAT.
  5. Tentukan Batas Maksimal Percobaan (misal 3 kali).
  6. Pilih format yang diizinkan (misal centang PDF dan ZIP).
  7. Klik Terbitkan Tugas.
- **Hasil yang Diharapkan:** Tugas perkuliahan berhasil dibuat dengan aturan tenggat waktu dan format berkas yang tersimpan rapi pada sistem.

### TC-IN-06: Memeriksa, Menilai Tugas, Mode Uji Coba Pengumpulan Dosen, dan Publikasi Nilai
- **Referensi Panduan:** Tutorial D6 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Tugas Perkuliahan (Kelas -> Detail Tugas)
- **Tujuan Pengujian:** Memverifikasi dosen dapat menguji coba pengumpulan tugas sendiri, menilai kiriman mahasiswa, dan mempublikasikan nilai.
- **Prasyarat:** Tugas telah dibuat dan terdapat mahasiswa yang mengumpulkan (atau dosen melakukan uji coba).
- **Data Uji:** File simulasi dosen (Jawaban_Dosen.pdf), skor tugas 0-100, umpan balik kualitatif.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka halaman detail tugas.
  2. Uji Mode Pratinjau Dosen: Perhatikan kartu 'Uji Coba Pengumpulan Tugas (Dosen Pengampu)'.
  3. Dosen mengunggah file uji coba dan menulis teks catatan, lalu klik 'Kirim Uji Coba Pengumpulan'.
  4. Pastikan proses unggah dan submit dosen berhasil tanpa terhambat error 403 STUDENT_REQUIRED.
  5. Pada tabel daftar pengumpulan mahasiswa: klik tombol 'Beri Nilai' pada salah satu kiriman.
  6. Masukkan nilai angka (misal 90) dan catatan umpan balik, lalu simpan.
  7. Uji publikasi nilai perorangan dan tombol 'Publikasikan Semua Nilai'.
- **Hasil yang Diharapkan:** Dosen dapat melakukan simulasi pengumpulan berkas tugas. Nilai mahasiswa tersimpan dan status berubah menjadi Diterbitkan (Published).

### TC-IN-07: Membuat Kuis Perkuliahan (Pengaturan Batas Waktu, Acak Soal, dan Opsi Review)
- **Referensi Panduan:** Tutorial D7 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Kuis Perkuliahan (Kelas -> Tab Pembelajaran -> + Kuis)
- **Tujuan Pengujian:** Memverifikasi pembuatan instrumen evaluasi kuis dengan konfigurasi pengacakan dan timer pengerjaan.
- **Prasyarat:** Pertemuan aktif.
- **Data Uji:** Durasi pengerjaan (misal 60 menit), batas percobaan, opsi acak soal, acak pilihan jawaban.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Klik tombol '+ Kuis' pada pertemuan.
  2. Isi judul kuis dan instruksi.
  3. Atur Durasi Pengerjaan dalam menit.
  4. Aktifkan opsi 'Acak Urutan Soal' dan 'Acak Urutan Opsi Pilihan'.
  5. Tentukan Opsi Review: apakah mahasiswa dapat melihat hasil dan pembahasan setelah kuis ditutup.
  6. Klik Simpan Kuis.
- **Hasil yang Diharapkan:** Kuis terbentuk dengan aturan waktu dan pengacakan yang siap diisi butir-butir pertanyaan.

### TC-IN-08: Menyusun Butir Soal Objektif & Tampilan Kunci Jawaban Non-Teknis (Human-Friendly)
- **Referensi Panduan:** Tutorial D8 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Bank Soal & Kuis (Kelas -> Detail Kuis -> Tambah Soal)
- **Tujuan Pengujian:** Memverifikasi input soal objektif dan tampilan kunci jawaban yang ramah pengguna non-teknis (tanpa JSON mentah).
- **Prasyarat:** Halaman editor butir soal kuis terbuka.
- **Data Uji:** Soal Pilihan Tunggal (Single Choice), Pilihan Ganda Kompleks (Multi Choice), dan Benar/Salah (Boolean).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buat soal Pilihan Tunggal: masukkan pertanyaan, opsi A s/d D, dan tandai kunci jawaban yang benar.
  2. Buat soal Pilihan Ganda Kompleks: tandai lebih dari satu opsi jawaban benar.
  3. Simpan butir-butir soal.
  4. Buka tab ringkasan butir soal kuis atau bank soal.
  5. Periksa tampilan kolom 'Kunci Jawaban' pada setiap butir soal.
- **Hasil yang Diharapkan:** Kunci jawaban ditampilkan dengan badge teks opsi yang manusiawi (misal: '✓ Opsi A: Hypertext Transfer Protocol'), BUKAN berupa format JSON mentah seperti {'correct': ['a']}.

### TC-IN-09: Menyusun Soal Uraian (Esai), Rubrik Penilaian, dan Lampiran Soal
- **Referensi Panduan:** Tutorial D9 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Bank Soal & Kuis (Kelas -> Detail Kuis -> Tambah Soal (Esai))
- **Tujuan Pengujian:** Memverifikasi pembuatan soal esai dengan rubrik kriteria penilaian dan file lampiran soal.
- **Prasyarat:** Editor soal kuis aktif.
- **Data Uji:** Pertanyaan studi kasus esai, bobot nilai soal, pedoman penskoran (rubrik).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Pilih tipe butir soal 'Uraian / Esai'.
  2. Masukkan instruksi studi kasus dan bobot maksimal skor (misal 20 poin).
  3. Tuliskan pedoman rubrik penilaian bagi dosen pengoreksi.
  4. Unggah berkas diagram pendukung soal jika diperlukan.
  5. Klik Simpan Butir Soal.
- **Hasil yang Diharapkan:** Soal esai berhasil ditambahkan ke instrumen kuis lengkap dengan rubrik penskoran yang tersimpan rapi.

### TC-IN-10: Koreksi Jawaban Kuis, Rekalkulasi Nilai, dan Manajemen Bank Soal
- **Referensi Panduan:** Tutorial D10 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Penilaian Kuis (Kelas -> Detail Kuis -> Riwayat Pengerjaan & Tab Bank Soal)
- **Tujuan Pengujian:** Memverifikasi koreksi manual soal esai oleh dosen, perhitungan ulang nilai, dan ekspor/impor ke bank soal.
- **Prasyarat:** Mahasiswa telah mengumpulkan kuis yang memuat butir esai.
- **Data Uji:** Skor koreksi esai, feedback butir esai.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab pengerjaan mahasiswa pada kuis.
  2. Klik 'Koreksi Jawaban' pada mahasiswa yang memiliki jawaban esai.
  3. Beri skor esai dan umpan balik per nomor, lalu klik Simpan Koreksi.
  4. Periksa apakah nilai total kuis mahasiswa langsung diperbarui secara otomatis.
  5. Buka tab 'Bank Soal Kelas': simpan butir soal pilihan ke dalam bank soal untuk dipakai kembali pada semester depan.
- **Hasil yang Diharapkan:** Skor esai terkoreksi, nilai akhir kuis terhitung proporsional, dan butir soal tersimpan aman di Bank Soal.

### TC-IN-11: Membuka Sesi Presensi Perkuliahan (Konsistensi Layout, Kode Proyektor & Sesi Bebas Kode)
- **Referensi Panduan:** Tutorial D11 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Presensi Perkuliahan (Kelas -> Tab Presensi)
- **Tujuan Pengujian:** Memverifikasi pembukaan sesi presensi dengan layout konsisten standar platform, baik dengan kode acak maupun 1-klik.
- **Prasyarat:** Dosen mengampu kelas aktif.
- **Data Uji:** Pertemuan ke-X, batas durasi sesi (misal 90 menit), opsi verifikasi kode.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab Presensi: amati lebar container halaman (memenuhi lebar penuh standar, tidak mengecil ke 1040px) dengan header .section-heading dan .toolbar.
  2. Klik tombol 'Buat Sesi Presensi'.
  3. Pilih pertemuan terkait.
  4. Skenario Kode: Centang 'Gunakan Kode Verifikasi' -> sistem memunculkan kode 6 karakter acak besar untuk proyektor.
  5. Skenario Bebas Kode: Hilangkan centang kode -> mahasiswa cukup klik konfirmasi hadir 1-klik.
  6. Klik Buka Sesi Presensi.
- **Hasil yang Diharapkan:** Layout presensi selaras dengan tab lain. Sesi terbuka dengan countdown aktif dan mahasiswa dapat langsung melakukan presensi.

### TC-IN-12: Mengubah Jadwal, Menutup Manual, dan Memperpanjang Waktu Sesi Presensi
- **Referensi Panduan:** Tutorial D12 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Presensi Perkuliahan (Kelas -> Tab Presensi -> Sesi Aktif)
- **Tujuan Pengujian:** Memverifikasi fleksibilitas dosen dalam mengelola durasi sesi perkuliahan tatap muka.
- **Prasyarat:** Terdapat sesi presensi yang sedang berlangsung atau terjadwal.
- **Data Uji:** Perpanjangan waktu (+15 menit), penutupan darurat.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Pada sesi presensi yang sedang aktif, klik tombol 'Perpanjang Waktu' (+15 atau +30 menit).
  2. Amati pembaruan timer hitung mundur.
  3. Setelah jam kuliah selesai, klik tombol 'Tutup Sesi Presensi Sekarang'.
  4. Buka sesi yang sudah ditutup untuk memastikan mahasiswa tidak dapat lagi mengisi presensi.
- **Hasil yang Diharapkan:** Perpanjangan durasi berhasil diperbarui secara instan. Saat sesi ditutup, form presensi mahasiswa otomatis terkunci.

### TC-IN-13: Koreksi Kehadiran Manual Mahasiswa dan Ekspor Rekapitulasi Presensi Excel
- **Referensi Panduan:** Tutorial D13 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Presensi Perkuliahan (Kelas -> Tab Presensi -> Rekap Kehadiran)
- **Tujuan Pengujian:** Memastikan dosen dapat mengubah status kehadiran mahasiswa bersebab (Izin/Sakit) dan mengunduh rekap spreadsheet.
- **Prasyarat:** Sesi presensi telah memiliki rekaman mahasiswa.
- **Data Uji:** Perubahan status ke SAKIT (SICK) / IZIN (EXCUSED), unduhan berkas Excel.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab 'Rekap Kehadiran' pada modul Presensi.
  2. Cari nama mahasiswa yang izin atau sakit.
  3. Ubah status pertemuannya dari ALFA menjadi IZIN atau SAKIT, lalu simpan catatan bukti izin.
  4. Perhatikan persentase kehadiran mahasiswa yang terhitung ulang.
  5. Klik tombol 'Ekspor Rekapitulasi (Excel)'.
- **Hasil yang Diharapkan:** Status kehadiran berhasil dikoreksi secara manual dan berkas rekap presensi (.xlsx) berhasil diunduh dengan struktur kolom lengkap.

### TC-IN-14: Pembobotan Nilai Akhir: Template Awal 30-35-35, Pilihan Preset, dan Tombol Auto-Assign
- **Referensi Panduan:** Tutorial D14 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Buku Nilai (Gradebook) (Kelas -> Tab Buku Nilai -> Pengaturan Nilai)
- **Tujuan Pengujian:** Memverifikasi konfigurasi template awal (30% Tugas auto-assign, 35% UTS, 35% UAS), pemilihan preset, dan tombol auto-assign instan.
- **Prasyarat:** Dosen membuka Buku Nilai kelas perkuliahan.
- **Data Uji:** Preset Standar UAY, Tugas & Kuis Terpisah, Berbasis Proyek, Teori & Praktikum, Partisipatif, Presensi.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab Buku Nilai -> klik 'Pengaturan Nilai' -> 'Bobot Kategori Penilaian'.
  2. Periksa konfigurasi default awal: Kategori Tugas berbobot 30% (auto-assign kuis & tugas aktif), UTS 35%, UAS 35% (Total 100%).
  3. Uji tombol Preset: Klik 'Tugas & Kuis Terpisah' (bobot berubah otomatis: 20% Tugas, 10% Kuis, 35% UTS, 35% UAS).
  4. Klik tombol 'Standar UAY' untuk mengembalikan ke template awal 30-35-35.
  5. Klik tombol 'Jalankan Auto-Assign Sekarang' untuk mengalokasikan semua kuis dan tugas yang belum berkategori.
  6. Klik tombol 'Simpan Bobot'.
- **Hasil yang Diharapkan:** Template awal 30-35-35 diterapkan, preset berpindah dengan validasi total tepat 100%, dan seluruh aktivitas tugas & kuis ter-assign secara otomatis.

### TC-IN-15: Meninjau, Menghitung, Override Nilai, Penguncian, dan Publikasi Nilai Akhir
- **Referensi Panduan:** Tutorial D15 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Buku Nilai (Gradebook) (Kelas -> Tab Buku Nilai)
- **Tujuan Pengujian:** Memverifikasi kalkulasi otomatis nilai akhir mahasiswa, override nilai manual berdasar alasan, kunci gradebook, dan ekspor rekap.
- **Prasyarat:** Aktivitas tugas, kuis, UTS, dan UAS telah dinilai.
- **Data Uji:** Nilai override manual mahasiswa, alasan perubahan, ekspor gradebook Excel.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tabel Buku Nilai: amati skor kategori, nilai akhir angka, dan konversi huruf mutu (A, B+, dll).
  2. Uji Override Nilai: Klik salah satu skor mahasiswa, ubah nilainya dan masukkan alasan perubahan.
  3. Klik 'Simpan Nilai'. Perhatikan kalkulasi nilai akhir yang langsung disesuaikan.
  4. Uji Penguncian: Centang opsi 'Kunci Buku Nilai' untuk memfinalisasi nilai akhir sebelum diserahkan ke BAAK.
  5. Klik tombol 'Publikasikan Nilai Akhir'.
  6. Klik tombol 'Ekspor Rekap Nilai (Excel)'.
- **Hasil yang Diharapkan:** Kalkulasi nilai akhir akurat sesuai bobot 100%. Riwayat audit perubahan nilai tercatat. Berkas Excel rekap nilai berhasil diunduh.

### TC-IN-16: Manajemen Peserta Kelas, Pengumuman Kelas, Berkas, dan Duplikasi (Kloning Kelas)
- **Referensi Panduan:** Tutorial D16 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Administrasi Kelas (Kelas -> Tab Peserta & Menu Aksi Kelas)
- **Tujuan Pengujian:** Memverifikasi pengelolaan team teaching, penerbitan pengumuman internal kelas, dan duplikasi struktur kelas ke semester baru.
- **Prasyarat:** Dosen mengampu kelas aktif.
- **Data Uji:** Penambahan dosen pengampu kedua, teks pengumuman kelas, kloning ke semester ganjil berikutnya.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab Peserta: periksa daftar mahasiswa dan dosen pengampu.
  2. Terbitkan pengumuman internal kelas pada tab Pembelajaran.
  3. Klik menu aksi kelas (ikon titik tiga) -> pilih 'Duplikasi Kelas (Clone)'.
  4. Pilih komponen yang ingin diduplikasi (Pertemuan, Materi, Tugas, Kuis, Bobot Nilai) dan tentukan semester baru.
  5. Klik tombol 'Mulai Kloning Kelas'.
- **Hasil yang Diharapkan:** Struktur kelas berhasil diduplikasi ke semester baru tanpa menyertakan riwayat pengerjaan mahasiswa semester lama.

### TC-AS-01: Penugasan Mahasiswa / Akun Khusus sebagai Asisten Dosen di Kelas Praktikum
- **Referensi Panduan:** Tutorial D16-AS (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN PENGAMPU (`INSTRUCTOR`)
- **Modul / Lokasi:** Manajemen Pengajar & Asdos (Kelas -> Tab Peserta -> Tombol Tambah Asisten Dosen (Asdos))
- **Tujuan Pengujian:** Memverifikasi Dosen Pengampu dapat menugaskan mahasiswa berprestasi atau akun asisten sebagai Asdos dengan badge indigo pembeda dan hak kelola kelas.
- **Prasyarat:** Login sebagai Dosen Pengampu Utama di kelas praktikum.
- **Data Uji:** Mahasiswa target (misal: Aditya Pratama / 202401001 atau akun asdos01).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka kelas praktikum (misal: Praktikum Pemrograman Web - Kelas A).
  2. Pilih tab Peserta pada navigasi kelas.
  3. Perhatikan dua tombol penugasan di toolbar: 'Tambah Dosen Kolaborator' dan 'Tambah Asisten Dosen (Asdos)'.
  4. Klik tombol 'Tambah Asisten Dosen (Asdos)'.
  5. Ketik nama atau NIM mahasiswa / asisten pada modal autocomplete.
  6. Pilih akun asisten lalu klik 'Tugaskan Sebagai Asdos'.
  7. Periksa daftar pengajar di tabel bagian atas tab Peserta.
- **Hasil yang Diharapkan:** Akun asisten berhasil ditambahkan ke daftar pengajar dengan badge 'Asisten Dosen / Lab' (warna indigo) yang membedakannya dari 'Pengampu Utama' dan 'Dosen Kolaborator'. Mahasiswa tetap terdaftar di akun SSO-nya tanpa kehilangan hak mahasiswa di kelas lain.

### TC-AS-02: Akses Fitur Dosen, Kelola Sesi Praktikum, dan Penilaian Laporan oleh Asdos
- **Referensi Panduan:** Tutorial AS-01 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** ASISTEN DOSEN (`ASSISTANT`)
- **Modul / Lokasi:** Ruang Kelas & Penilaian Praktikum (Kelas Praktikum -> Tab Materi, Presensi & Penilaian)
- **Tujuan Pengujian:** Memastikan mahasiswa yang ditugaskan sebagai Asdos memperoleh hak akses pengajar penuh pada kelas praktikum yang ditugaskan (tambah materi, buka presensi, nilai tugas).
- **Prasyarat:** Akun telah ditugaskan sebagai Asisten Dosen pada kelas praktikum.
- **Data Uji:** Kelas praktikum yang diampu, sesi modul praktikum, tugas laporan lab mahasiswa.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Login menggunakan akun asisten dosen (atau mahasiswa yang telah diangkat sebagai asdos).
  2. Buka menu Kelas Saya: periksa indikator chip pengajar pada kartu kelas menampilkan '(Asdos)'.
  3. Buka kelas praktikum: pastikan tombol 'Tambah Section' dan 'Tambah Materi' aktif dan dapat digunakan.
  4. Buka tab Presensi: klik 'Buka Sesi Presensi Praktikum', masukkan jadwal atau kode sesi lab.
  5. Buka tab Tugas / Asesmen: buka penugasan laporan praktikum mahasiswa, lalu klik 'Nilai Submisi'.
  6. Beri skor nilai laporan, ketik catatan evaluasi (feedback), lalu simpan nilai.
  7. Buka kelas lain di mana akun ini hanya sebagai mahasiswa biasa: pastikan hak pengajar tidak bocor ke kelas lain.
- **Hasil yang Diharapkan:** Asisten dosen dapat menambah section pertemuan praktikum, membuka presensi sesi lab, dan menilai lembar laporan praktikum mahasiswa. Isolasi izin (row-level authorization) berjalan sempurna sehingga di kelas lain akun ini tetap berfungsi murni sebagai mahasiswa biasa.

### TC-DA-01: Memeriksa Cakupan Program Studi dan Kurikulum Aktif
- **Referensi Panduan:** Tutorial A1 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** ADMIN PRODI (`DEPARTMENT_ADMIN`)
- **Modul / Lokasi:** Tata Kelola Prodi (Menu Program Studi)
- **Tujuan Pengujian:** Memverifikasi Admin Prodi hanya dapat melihat dan mengelola data dalam naungan program studinya sendiri.
- **Prasyarat:** Login sebagai Admin Prodi Informatika (admin.if).
- **Data Uji:** Program Studi Informatika (Fakultas Sains dan Teknologi).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka menu Program Studi di navigasi utama.
  2. Periksa kode prodi, nama departemen, dan kurikulum aktif yang ditampilkan.
  3. Pastikan data program studi lain terisolasi dan tidak dapat dimanipulasi.
- **Hasil yang Diharapkan:** Hanya data Program Studi Informatika yang dapat diakses; batasan wewenang RBAC departemen terisolasi sempurna.

### TC-DA-02: Menambahkan Mata Kuliah dan Rombel Kelas (Auto-Generated Key 6 Huruf Kapital)
- **Referensi Panduan:** Tutorial A2 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** ADMIN PRODI (`DEPARTMENT_ADMIN`)
- **Modul / Lokasi:** Manajemen Kelas Prodi (Menu Mata Kuliah & Tambah Kelas)
- **Tujuan Pengujian:** Memverifikasi penambahan kelas baru secara otomatis menghasilkan Kunci Pendaftaran 6 huruf kapital dengan tombol acak ulang.
- **Prasyarat:** Admin Prodi berada di menu Manajemen Kelas.
- **Data Uji:** Mata Kuliah IF202, Nama Kelas 'Kelas A', Tahun Akademik 2026/2027 Ganjil.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka menu Manajemen Kelas -> klik 'Tambah Kelas'.
  2. Pilih Mata Kuliah, isi Nama Kelas dan Tahun Akademik.
  3. Periksa kolom 'Kunci Pendaftaran': nilai default otomatis terisi 6 huruf kapital (A-Z).
  4. Klik tombol 'Acak Ulang' di samping input kunci: periksa apakah kode berubah menjadi 6 huruf baru.
  5. Pilih Dosen Pengampu kelas.
  6. Klik tombol Simpan.
- **Hasil yang Diharapkan:** Kelas berhasil dibentuk lengkap dengan kunci pendaftaran 6 karakter huruf kapital acak yang siap dibagikan ke mahasiswa.

### TC-DA-03: Mendaftarkan dan Mengaktifkan Peserta Mahasiswa Secara Manual
- **Referensi Panduan:** Tutorial A3 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** ADMIN PRODI (`DEPARTMENT_ADMIN`)
- **Modul / Lokasi:** Peserta Kelas (Detail Kelas -> Tab Peserta)
- **Tujuan Pengujian:** Memastikan Admin Prodi dapat melakukan plotting mahasiswa manual atau mengaktifkan kembali peserta yang berstatus cuti/nonaktif.
- **Prasyarat:** Kelas berstatus PUBLISHED.
- **Data Uji:** NIM Mahasiswa yang terdaftar di program studi.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka detail kelas -> tab Peserta.
  2. Gunakan kolom pencarian mahasiswa berdasarkan NIM atau Nama.
  3. Pilih mahasiswa lalu klik 'Tambahkan ke Kelas'.
  4. Uji aktivasi peserta: ubah status peserta dari Nonaktif menjadi Aktif.
- **Hasil yang Diharapkan:** Mahasiswa berhasil didaftarkan ke kelas secara administratif dan dapat langsung mengakses pembelajaran di beranda akunnya.

### TC-DA-04: Impor Massal Peserta, Nilai, atau Bank Soal Melalui Berkas Spreadsheet (Excel)
- **Referensi Panduan:** Tutorial A4 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** ADMIN PRODI (`DEPARTMENT_ADMIN`)
- **Modul / Lokasi:** Impor Data Massal (Menu Impor Data / Tab Buku Nilai -> Impor)
- **Tujuan Pengujian:** Memverifikasi fungsionalitas impor data spreadsheet dengan tahap pra-tinjau (preview) sebelum komit data ke database.
- **Prasyarat:** File spreadsheet Excel (.xlsx) sesuai template yang disediakan sistem.
- **Data Uji:** Template berkas Excel peserta kelas atau nilai mahasiswa.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka modal Impor Data pada kelas.
  2. Unduh template resmi spreadsheet yang disediakan sistem.
  3. Isi baris data sesuai kolom contoh.
  4. Unggah berkas Excel yang telah diisi.
  5. Periksa tahap Pra-tinjau (Review): sistem memvalidasi baris yang valid dan baris yang berpotensi galat.
  6. Klik tombol 'Komit / Simpan Data'.
- **Hasil yang Diharapkan:** Sistem memvalidasi kecocokan data. Data berhasil diimpor secara massal tanpa kegagalan transaksi database.

### TC-DA-05: Memantau Kelas, Arsip Kelas, dan Audit Jejak Aktivitas Program Studi
- **Referensi Panduan:** Tutorial A5 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** ADMIN PRODI (`DEPARTMENT_ADMIN`)
- **Modul / Lokasi:** Audit & Pemantauan (Menu Jejak Aktivitas Prodi & Arsip Kelas)
- **Tujuan Pengujian:** Memverifikasi pengarsipan kelas semester lalu dan pemantauan log aktivitas dosen di lingkup prodi.
- **Prasyarat:** Semester perkuliahan telah selesai.
- **Data Uji:** Kelas perkuliahan yang akan diarsipkan.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka kelas yang telah selesai periode perkuliahannya.
  2. Ubah status kelas menjadi ARCHIVED dengan konfirmasi tindakan.
  3. Buka menu 'Jejak Aktivitas Program Studi'.
  4. Periksa log pencatatan perubahan status, nilai, dan modul pembelajaran prodi.
  5. Periksa tata letak pagination di bawah tabel log prodi.
- **Hasil yang Diharapkan:** Kelas berhasil diarsipkan (bersifat read-only bagi dosen & mahasiswa). Log aktivitas prodi tersaji rapi dengan komponen pagination ber-margin nyaman.

### TC-SA-01: Meninjau Administrasi Seluruh Program Studi & Tata Kelola Pengguna Universitas
- **Referensi Panduan:** Tutorial S1 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** SUPER ADMIN (`SUPER_ADMIN`)
- **Modul / Lokasi:** Tata Kelola Universitas (Menu Program Studi & Pengguna)
- **Tujuan Pengujian:** Memverifikasi Super Admin memiliki akses penuh atas semua fakultas, prodi, dan akun civitas akademika.
- **Prasyarat:** Login sebagai Super Admin (admin).
- **Data Uji:** Data prodi seluruh fakultas (FST, FEB, FAI, dll).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka menu Program Studi: amati daftar seluruh fakultas dan program studi di lingkungan UAY.
  2. Buka menu Pengguna: cari akun dosen atau mahasiswa, periksa detail peran dan status akun.
  3. Uji pembuatan akun baru atau reset kredensial darurat jika diperlukan.
- **Hasil yang Diharapkan:** Super Admin dapat mengelola entitas seluruh universitas tanpa batasan isolasi fakultas.

### TC-SA-02: Mengatur Tahun Akademik, Semester Aktif, dan Pengumuman Darurat Banner
- **Referensi Panduan:** Tutorial S2 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** SUPER ADMIN (`SUPER_ADMIN`)
- **Modul / Lokasi:** Pengaturan Sistem & Pengumuman (Menu Pengaturan Sistem & Pengumuman)
- **Tujuan Pengujian:** Memverifikasi penetapan semester aktif universitas dan penerbitan banner pengumuman darurat global.
- **Prasyarat:** Super Admin login.
- **Data Uji:** Tahun Akademik '2026/2027 Ganjil', Banner Pengumuman Darurat Kampus.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka menu Pengaturan Sistem: ubah atau tetapkan Tahun Akademik aktif (2026/2027 Ganjil).
  2. Buka menu Pengumuman Sistem -> klik 'Buat Pengumuman Baru'.
  3. Pilih mode penulisan (Tulis / Pratinjau / Berdampingan).
  4. Pilih tingkat urgensi: 'Darurat / Penting'.
  5. Klik Terbitkan Pengumuman.
- **Hasil yang Diharapkan:** Tahun akademik aktif diterapkan sebagai nilai bawaan kelas baru. Banner pengumuman darurat tampil di seluruh antarmuka pengguna kampus.

### TC-SA-03: Menetapkan Kebijakan Skala Huruf Mutu, Tombol Kanan Modal, dan Ambang Hadir 75%
- **Referensi Panduan:** Tutorial S3 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** SUPER ADMIN (`SUPER_ADMIN`)
- **Modul / Lokasi:** Kebijakan Akademik Universitas (Menu Skala Nilai Universitas)
- **Tujuan Pengujian:** Memverifikasi Super Admin dapat mengedit batas nilai huruf mutu dengan tombol kanan modal yang rapi dan menetapkan ambang hadir.
- **Prasyarat:** Super Admin membuka modul Skala Nilai.
- **Data Uji:** Skala Nilai versi 2026.1 (A = 85, A- = 80, B+ = 75, dst), ambang hadir 75%.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka menu Skala Nilai Universitas.
  2. Klik tombol 'Tambah / Edit Skala Nilai'.
  3. Perhatikan posisi tombol footer modal: tombol Batal dan Simpan berada rapi di sisi kanan modal (justify-content: flex-end).
  4. Ubah batas bawah skor untuk huruf mutu dan bobot indeks prestasi (4.00, 3.75, dst).
  5. Klik tombol Simpan Skala Nilai.
  6. Buka kelas perkuliahan untuk memastikan versi skala nilai baru otomatis tersedia.
- **Hasil yang Diharapkan:** Skala nilai berhasil diperbarui, tombol modal tersusun rapi di sebelah kanan, dan formula konversi nilai langsung berlaku seragam di seluruh universitas.

### TC-RC-01: Membuka Dashboard Pemantauan Akademik Eksekutif (Mode Read-Only)
- **Referensi Panduan:** Tutorial R1 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** REKTORAT (`RECTOR`)
- **Modul / Lokasi:** Dashboard Eksekutif (Menu Dashboard Rektorat)
- **Tujuan Pengujian:** Memverifikasi pimpinan universitas mendapatkan visibilitas operasional perkuliahan secara read-only tanpa hak manipulasi.
- **Prasyarat:** Login sebagai Rektor (rektor).
- **Data Uji:** Ringkasan metrik universitas live.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Login menggunakan akun rektorat.
  2. Periksa tampilan Dashboard Eksekutif: kartu total mahasiswa aktif, dosen mengajar, kelas berjalan, rata-rata kehadiran, dan status nilai.
  3. Buka halaman detail salah satu kelas.
  4. Periksa seluruh tombol aksi pada kelas.
- **Hasil yang Diharapkan:** Semua data mencerminkan kondisi riil database kampus (bukan data tiruan) dan antarmuka bersifat murni Read-Only (tombol ubah/hapus tidak tersedia).

### TC-RC-02: Memilih Periode Semester dan Membaca Ringkasan Indikator KPI
- **Referensi Panduan:** Tutorial R2 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** REKTORAT (`RECTOR`)
- **Modul / Lokasi:** Analitik Eksekutif (Dashboard Rektorat -> Filter Periode)
- **Tujuan Pengujian:** Memverifikasi pemilihan semester perkuliahan dan pemutakhiran metrik KPI secara instan.
- **Prasyarat:** Tersedia data perkuliahan pada semester aktif.
- **Data Uji:** Filter semester 2026/2027 Ganjil.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Pilih filter semester pada bagian atas dashboard pimpinan.
  2. Amati grafik rasio ketercapaian materi perkuliahan.
  3. Amati grafik kepatuhan kehadiran dosen mengajar dan mahasiswa.
- **Hasil yang Diharapkan:** Data KPI universitas diperbarui secara instan sesuai periode akademik yang dipilih.

### TC-RC-03: Menelusuri Distribusi Keaktifan Dosen dan Kelas per Fakultas/Prodi
- **Referensi Panduan:** Tutorial R3 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** REKTORAT (`RECTOR`)
- **Modul / Lokasi:** Analitik Dosen & Kelas (Dashboard Rektorat -> Tab Keaktifan Dosen)
- **Tujuan Pengujian:** Memastikan rektorat dapat mendeteksi prodi atau mata kuliah yang mengalami ketertinggalan pertemuan tatap muka.
- **Prasyarat:** Dashboard rektorat aktif.
- **Data Uji:** Filter Fakultas Sains dan Teknologi -> Program Studi Informatika.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab 'Keaktifan Dosen & Kelas'.
  2. Pilih fakultas dan prodi yang ingin ditinjau.
  3. Periksa tabel distribusi pertemuan dosen: jumlah sesi yang sudah terlaksana vs target 16 pertemuan.
  4. Cari kelas yang tingkat keterlaksanaannya masih di bawah standar universitas.
- **Hasil yang Diharapkan:** Pimpinan universitas memperoleh peta keaktifan perkuliahan yang komprehensif untuk bahan koordinasi dengan dekan dan kaprodi.

### TC-RC-04: Membaca Riwayat Kegiatan (Waterfall Activity) dan Grafik Rentang Sesi Masuk
- **Referensi Panduan:** Tutorial R4 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** REKTORAT (`RECTOR`)
- **Modul / Lokasi:** Analitik Trafik Pengguna (Dashboard Rektorat -> Tab Aktivitas Sesi)
- **Tujuan Pengujian:** Memverifikasi visualisasi rentang waktu login pengguna per jam dan distribusi beban server harian.
- **Prasyarat:** Terdapat aktivitas login dan penggunaan sistem pada rentang 24 jam terakhir.
- **Data Uji:** Grafik sesi masuk per jam dengan zona waktu Asia/Jakarta (WIB).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tab 'Aktivitas Sesi Pengguna'.
  2. Periksa diagram air terjun (waterfall timeline) sesi aktif civitas akademika.
  3. Amati grafik jam sibuk penggunaan e-learning (puncak akses pagi dan sore hari).
  4. Pastikan stempel waktu konsisten dengan zona waktu lokal perangkat pengguna.
- **Hasil yang Diharapkan:** Grafik aktivitas login tersaji jernih tanpa distorsi midnight atau kelanjutan sesi fiktif.

### TC-RC-05: Mengunduh Laporan Rekapitulasi Eksekutif Excel dan Pemantauan Kendala
- **Referensi Panduan:** Tutorial R5 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** REKTORAT (`RECTOR`)
- **Modul / Lokasi:** Pelaporan Pimpinan (Dashboard Rektorat -> Ekspor Laporan)
- **Tujuan Pengujian:** Memverifikasi pengunduhan rekapitulasi data pimpinan ke dalam format spreadsheet resmi untuk bahan rapat senat universitas.
- **Prasyarat:** Akun rektorat aktif.
- **Data Uji:** Unduhan rekap eksekutif semester aktif.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Klik tombol 'Ekspor Rekapitulasi Eksekutif (Excel)'.
  2. Buka file spreadsheet hasil unduhan.
  3. Periksa sheet Ringkasan Universitas, Rekap Keaktifan Dosen, dan Rekap Nilai Mahasiswa.
- **Hasil yang Diharapkan:** Berkas Excel berhasil diunduh dengan struktur data lengkap, rapi, dan siap dipresentasikan di rapat pimpinan universitas.

### TC-UX-01: Verifikasi Indikator Bintang Merah (*) pada Kolom Formulir Wajib Diisi
- **Referensi Panduan:** Tutorial X1 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** UI/UX STANDAR (`GLOBAL`)
- **Modul / Lokasi:** Komponen Form (Field.tsx) (Seluruh Formulir Input Aplikasi)
- **Tujuan Pengujian:** Memastikan hanya karakter tanda bintang (*) yang berwarna merah terang, sementara teks label tetap berwarna netral standar tema.
- **Prasyarat:** Buka formulir Tambah Kelas, Tambah Pertemuan, Tambah Materi, atau Tambah Tugas.
- **Data Uji:** Kolom berlabel required (Nama Kelas, Judul Materi, Tanggal, dll).
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka modal formulir Tambah Kelas atau Tambah Materi.
  2. Perhatikan label input yang memiliki atribut required.
  3. Periksa elemen DOM teks label dan karakter bintang.
- **Hasil yang Diharapkan:** Teks label (misal: 'Nama Kelas') berwarna teks gelap standar, sedangkan karakter '*' secara spesifik berwarna merah terang (#ef4444).

### TC-UX-02: Verifikasi Notifikasi Galat Validasi via Floating Toast Kanan Atas (Anti-Clutter Modal)
- **Referensi Panduan:** Tutorial X2 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** UI/UX STANDAR (`GLOBAL`)
- **Modul / Lokasi:** Komponen Modal & Toast (Form.tsx & api.ts) (Modal Dialog Formulir)
- **Tujuan Pengujian:** Memverifikasi kesalahan input muncul sebagai toast melayang di kanan atas, tidak ada boks merah inline yang merusak kerapian modal, dan tidak ada teks artifact 'Waktu tidak tersedia'.
- **Prasyarat:** Modal formulir terbuka.
- **Data Uji:** Pengiriman form dengan mengosongkan kolom wajib.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka modal Tambah Pertemuan atau Tambah Materi.
  2. Kosongkan kolom yang wajib diisi lalu tekan tombol Simpan.
  3. Amati kemunculan pesan peringatan pada layar.
- **Hasil yang Diharapkan:** Notifikasi galat muncul sebagai floating toast melayang di sudut kanan atas layar. Tidak ada kotak merah inline yang merusak tata letak modal dan tidak ada tulisan aneh 'Waktu tidak tersedia'.

### TC-UX-03: Kerapian Margin dan Padding Komponen Pagination di Seluruh Tabel Data
- **Referensi Panduan:** Tutorial X3 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** UI/UX STANDAR (`GLOBAL`)
- **Modul / Lokasi:** Komponen Pagination (Table Wrapping) (Tabel Jejak Aktivitas, Buku Nilai, dan Peserta Kelas)
- **Tujuan Pengujian:** Memastikan pagination tabel data memiliki margin dan padding keliling yang proporsional, border lembut, dan tidak mentok ke sudut bawah container.
- **Prasyarat:** Tabel data memiliki baris data lebih dari kapasitas per halaman (>25 baris).
- **Data Uji:** Navigasi pagination halaman 1, 2, dst.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka tabel Jejak Aktivitas atau tabel Buku Nilai.
  2. Scroll ke bagian bawah tabel hingga ke kontrol nomor halaman pagination.
  3. Periksa jarak margin-bottom dan jarak batas pinggir kartu container.
- **Hasil yang Diharapkan:** Komponen pagination memiliki margin keliling yang proporsional, border halus, tidak menempel kaku ke sudut bawah kartu, dan mudah diklik.

### TC-UX-04: Dukungan Unggah Berkas hingga 100MB di Nginx dan 50MB di Express Body Parser
- **Referensi Panduan:** Tutorial X4 (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** SISTEM SERVER (`GLOBAL`)
- **Modul / Lokasi:** Infrastruktur Nginx & Express (File Service & Upload Endpoint)
- **Tujuan Pengujian:** Memverifikasi berkas materi PDF atau penugasan ukuran 1.2MB s/d 50MB dapat diunggah sukses tanpa penolakan HTTP 413 Payload Too Large.
- **Prasyarat:** Server Nginx dan API Express aktif.
- **Data Uji:** Berkas PDF / ZIP berukuran 2MB, 5MB, hingga 25MB.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka modul unggah materi atau pengumpulan tugas.
  2. Pilih berkas dokumen berukuran 5MB s/d 20MB.
  3. Jalankan proses unggah dan amati respon jaringan di browser developer tools.
- **Hasil yang Diharapkan:** Unggahan berhasil 100% dengan status HTTP 200/201. Konfigurasi Nginx client_max_body_size 100m dan Express json limit 50mb memproses data tanpa galat 413.

### TC-UX-05: Penyaringan Tipe Pertemuan dengan Tab Badge Dinamis (Semua, Perkuliahan, Praktikum)
- **Referensi Panduan:** Tutorial D1-UX (`panduan.html` / `helpGuide.json`)
- **Peran (Role):** DOSEN & MAHASISWA (`GLOBAL`)
- **Modul / Lokasi:** Navigasi Kelas & Section (Halaman Kelas -> Tab Materi & Aktivitas)
- **Tujuan Pengujian:** Memverifikasi fitur tab filter badge pertemuan (Semua, Perkuliahan, Praktikum, Seminar, Lokakarya, Ujian, Lainnya) dengan indikator counter jumlah pertemuan.
- **Prasyarat:** Kelas memiliki beberapa section dengan jenis yang berbeda (misal 10 Perkuliahan dan 4 Praktikum).
- **Data Uji:** Pertemuan jenis Perkuliahan dan Praktikum.
- **Langkah-Langkah Pengujian (Step-by-Step):**
  1. Buka halaman detail kelas pada tab Materi & Aktivitas.
  2. Amati bilah Tab Filter Badge di bawah judul Pertemuan Kelas: tab 'Semua', 'Perkuliahan', 'Praktikum', dan jenis lainnya yang ada pada kelas.
  3. Perhatikan angka counter badge pada setiap tab (misal: 'Semua (14)', 'Perkuliahan (10)', 'Praktikum (4)').
  4. Klik tab 'Praktikum': periksa daftar pertemuan yang tampil hanya pertemuan bertipe Praktikum.
  5. Periksa nomor urut pertemuan (misal: '04', '08') tetap mempertahankan urutan silabus aslinya.
  6. Klik tombol panah atas/bawah untuk memindahkan urutan pertemuan saat filter aktif: periksa posisi urutan tetap tertata benar.
  7. Klik tab yang tidak memiliki pertemuan: periksa tampilan state kosong informatif beserta tombol 'Tampilkan Semua Pertemuan'.
  8. Klik tab 'Semua': seluruh pertemuan kembali ditampilkan secara utuh.
- **Hasil yang Diharapkan:** Daftar pertemuan tersaring secara instan tanpa reload halaman, counter badge menampilkan jumlah yang akurat, nomor silabus tidak kacau, dan pengaturan urutan tetap berfungsi konsisten.

---

## 3. Format Standar Pelaporan Temuan Kendala (Bug Report Template)

```markdown
### [BUG-ID-UAY] Ringkasan Singkat Temuan Kendala
- ID Test Case Terkait: TC-IN-02 / TC-IN-14 / TC-DA-02 / dll
- Modul / Lokasi: Modul Buku Nilai / Presensi / Editor Materi
- Akun & Peran Penguji: INSTRUCTOR (198501012010121001) / STUDENT / dll
- Lingkungan Pengujian: Windows 11 Chrome 124 / iOS 17 Safari (Desktop / Mobile 390px)
- Langkah Reproduksi:
  1. Buka menu ...
  2. Klik tombol ...
  3. Masukkan data ...
- Hasil Aktual: (Jelaskan perilaku yang terjadi atau pesan error)
- Hasil yang Diharapkan: (Sesuai kriteria dokumen ini)
- Bukti Pendukung: Screenshot atau log inspect console
```
