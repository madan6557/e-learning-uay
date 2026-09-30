# LEMBAR KERJA PRAKTIKUM: SOFTWARE QUALITY ASSURANCE (QA)
## Mata Kuliah: Pengenalan Informatika — Universitas Achmad Yani (UVAYA)

**Petunjuk Mahasiswa:**
1. Praktikum ini bertujuan melatih pola pikir rekayasa perangkat lunak (*Software Engineering mindset*) melalui pengujian sistem nyata: **E-Learning UAY**.
2. Setiap mahasiswa/kelompok memegang satu akun dummy uji coba.
3. Kerjakan checklist skenario pengujian sesuai peran (Role) yang ditugaskan instruktur.
4. Beri tanda centang `[x]` pada kolom **Hasil** jika langkah berhasil sesuai harapan (**PASS**), atau tulis **FAIL** jika terjadi error/kejanggalan.
5. Laporkan minimal **1 temuan bug atau masukan perbaikan UI/UX** pada Bagian Formulir Temuan Bug di akhir lembar ini.

---

### IDENTITAS MAHASISWA / TESTER
- **Nama Mahasiswa:** ______________________________________
- **NIM Asli:** ______________________________________
- **Akun Dummy yang Digunakan:** (contoh: *Mahasiswa Tester 05 / 202601105*)
- **Peran yang Diuji:** `[ ] Mahasiswa`  `[ ] Dosen`  `[ ] Admin Prodi`  `[ ] Super Admin / Chaos`
- **Perangkat / Browser:** Laptop / PC Lab / HP — Google Chrome / Edge / Safari

---

## BAGIAN 1: SKENARIO PENGUJIAN SESUAI PERAN

### TRACK A: ROLE MAHASISWA (STUDENT EXPERIENCE)
Target Kelas: **IF2101 - Pemrograman Web (Kelas A)**

| No | Kode Kasus | Skenario Uji & Langkah-Langkah | Hasil yang Diharapkan (Expected Result) | Hasil Aktual (PASS / FAIL / Catatan) |
|---|---|---|---|---|
| 1 | `TC-MHS-01` | **Login Akun Demonstrasi**<br>Buka halaman awal → scroll ke "Akun demonstrasi" → klik "Gunakan" pada nama Anda. | Berhasil masuk ke Dashboard Mahasiswa. Nama dan NIM Anda muncul di sudut kanan atas. | [ ] PASS  [ ] FAIL: __________ |
| 2 | `TC-MHS-02` | **Eksplorasi Profil Mahasiswa**<br>Klik menu Profil di sidebar/header. Periksa nama, NIM, status akun, dan email. | Profil menampilkan status "Aktif". Saat halaman di-refresh (F5), sesi tidak keluar dan status tetap aktif. | [ ] PASS  [ ] FAIL: __________ |
| 3 | `TC-MHS-03` | **Akses Ruang Kelas & Baca Materi Interaktif**<br>Buka kelas *IF2101 Pemrograman Web* → Buka materi *"Memahami cara kerja web"*. | Materi terbuka rapi. Komponen blok judul, paragraf, kotak kode (code snippet), tabel HTTP, dan callout info tampil jelas. | [ ] PASS  [ ] FAIL: __________ |
| 4 | `TC-MHS-04` | **Interaksi Checklist Materi Pembelajaran**<br>Pada materi di atas, klik kotak centang pada daftar tugas interaktif (*Checklist*). | Kotak centang merespons saat diklik. State checklist tersimpan. | [ ] PASS  [ ] FAIL: __________ |
| 5 | `TC-MHS-05` | **Pengerjaan Kuis Pilihan Ganda & Isian**<br>Buka *Kuis 01 · Fondasi web* → Jawab soal pilihan ganda, benar/salah, dan isian singkat. | Pilihan radio/checkbox dapat dipilih. Input teks isian dapat diketik dengan lancar. | [ ] PASS  [ ] FAIL: __________ |
| 6 | `TC-MHS-06` | **Pengerjaan Kuis Menjodohkan & Urutan (Interactive Matching/Ordering)**<br>Jawab soal menjodohkan pasangan dan urutan tahapan request-response. | Elemen interaktif dapat dipasangkan dan diurutkan sesuai instruksi tanpa macet. | [ ] PASS  [ ] FAIL: __________ |
| 7 | `TC-MHS-07` | **Penyelesaian & Submit Kuis**<br>Klik tombol "Selesaikan Kuis" atau "Submit Attempt". | Muncul konfirmasi pengumpulan kuis. Skor/status percobaan tercatat dan muncul di riwayat pengerjaan. | [ ] PASS  [ ] FAIL: __________ |
| 8 | `TC-MHS-08` | **Pengumpulan Tugas Praktikum (Assignment Submission)**<br>Buka *Praktikum 01 · Halaman profil* → Ketik teks laporan atau unggah berkas → Klik Kumpulkan. | Tugas berhasil terkirim. Status berubah menjadi "Sudah Dikumpulkan" disertai waktu pengumpulan. | [ ] PASS  [ ] FAIL: __________ |
| 9 | `TC-MHS-09` | **Cek Rekap Nilai (Gradebook)**<br>Buka menu Nilai / Gradebook di dalam kelas. | Kategori nilai (Tugas, Kuis, UTS, UAS, Progres) tampil beserta bobot persentasenya. | [ ] PASS  [ ] FAIL: __________ |
| 10 | `TC-MHS-10` | **Uji Negatif: Percobaan Submit Tanpa Mengisi Jawaban**<br>Coba kumpulkan tugas tanpa mengisi teks/berkas apapun. | Sistem memberikan peringatan validasi dan menolak pengumpulan kosong. | [ ] PASS  [ ] FAIL: __________ |

---

### TRACK B: ROLE DOSEN (INSTRUCTOR / COURSE CREATOR)
Target Pengujian: Menggunakan akun **Dosen, M.Kom.**

| No | Kode Kasus | Skenario Uji & Langkah-Langkah | Hasil yang Diharapkan (Expected Result) | Hasil Aktual (PASS / FAIL / Catatan) |
|---|---|---|---|---|
| 1 | `TC-DOS-01` | **Login & Dashboard Dosen**<br>Masuk sebagai Dosen → Periksa beranda dosen. | Dashboard menampilkan daftar kelas yang diampu dan antrean aktivitas yang perlu dinilai (*Perlu Dinilai*). | [ ] PASS  [ ] FAIL: __________ |
| 2 | `TC-DOS-02` | **Buat Pengumuman Baru**<br>Masuk ke kelas IF2101 → Buka tab Pengumuman → Buat pengumuman uji coba dengan menandai "Penting". | Pengumuman muncul di urutan teratas dengan lencana khusus penting. | [ ] PASS  [ ] FAIL: __________ |
| 3 | `TC-DOS-03` | **Memeriksa Antrean Penilaian Kuis (Grading Queue)**<br>Buka menu Antrean Nilai / Buka Kuis 01 → Lihat daftar submisi mahasiswa (misal percobaan Nadia). | Tabel submisi menampilkan daftar mahasiswa yang sudah mengerjakan, skor otomatis, dan status kuis. | [ ] PASS  [ ] FAIL: __________ |
| 4 | `TC-DOS-04` | **Memberikan Nilai Esai & Umpan Balik (Feedback)**<br>Buka salah satu jawaban esai mahasiswa → Masukkan skor sesuai rubrik → Ketik feedback → Simpan. | Nilai esai tersimpan, total nilai akhir terhitung otomatis, dan feedback tersimpan. | [ ] PASS  [ ] FAIL: __________ |
| 5 | `TC-DOS-05` | **Manajemen Visibilitas Pertemuan (Sembunyikan/Tampilkan)**<br>Ubah status visibilitas Pertemuan 3 dari tersembunyi menjadi tampil (*Visible*). | Status pertemuan berubah. Pertemuan menjadi dapat diakses oleh peserta kelas. | [ ] PASS  [ ] FAIL: __________ |
| 6 | `TC-DOS-06` | **Uji Negatif: Input Nilai di Luar Batas (Boundary Test)**<br>Coba masukkan nilai negatif (`-15`) atau nilai melebihi batas maksimal (`150`). | Sistem menolak nilai dengan pesan validasi "Nilai harus antara 0 hingga batas maksimum". | [ ] PASS  [ ] FAIL: __________ |

---

### TRACK C: ROLE ADMIN PRODI (DEPARTMENT MANAGEMENT)
Target Pengujian: Menggunakan akun **Admin Prodi Informatika (ADMIF01)**

| No | Kode Kasus | Skenario Uji & Langkah-Langkah | Hasil yang Diharapkan (Expected Result) | Hasil Aktual (PASS / FAIL / Catatan) |
|---|---|---|---|---|
| 1 | `TC-ADM-01` | **Login & Cakupan Program Studi**<br>Masuk sebagai Admin Prodi Informatika → Cek beranda administrasi. | Wilayah kerja dibatasi hanya pada program studi Informatika (IF). Tidak bercampur dengan prodi lain. | [ ] PASS  [ ] FAIL: __________ |
| 2 | `TC-ADM-02` | **Kelola Katalog Kelas & Kurikulum**<br>Buka menu *Kelola Kelas* → Periksa daftar kelas semester aktif. | Tampil kelas-kelas aktif prodi Informatika (IF202, IF2101). | [ ] PASS  [ ] FAIL: __________ |
| 3 | `TC-ADM-03` | **Pemeriksaan Isolasi Jurusan**<br>Coba cari atau buka URL kelas dari prodi lain jika diketahui kodenya. | Akses ditolak (403 Forbidden / Not Found) karena di luar hak akses prodi IF. | [ ] PASS  [ ] FAIL: __________ |
| 4 | `TC-ADM-04` | **Pemeriksaan Status Arsip Kelas**<br>Buka kelas yang diarsipkan (misal IF202). | Kelas berstatus arsip hanya dapat dibaca (Read-Only), tombol edit/tulis dinonaktifkan secara tepat. | [ ] PASS  [ ] FAIL: __________ |

---

### TRACK D: ROLE SUPER ADMIN & CHAOS TESTER (SECURITY & BOUNDARY)
Target Pengujian: Akun **Admin UAY (ADM001)** dan Mahasiswa Luar (**Bima Saputra**)

| No | Kode Kasus | Skenario Uji & Langkah-Langkah | Hasil yang Diharapkan (Expected Result) | Hasil Aktual (PASS / FAIL / Catatan) |
|---|---|---|---|---|
| 1 | `TC-SEC-01` | **Mahasiswa Luar Mencoba Masuk Kelas Bukan Haknya**<br>Login sebagai Bima Saputra (Outsider) → Coba buka tautan kelas IF2101. | Akses ditolak atau tampil pesan bahwa akun tidak terdaftar pada kelas tersebut. | [ ] PASS  [ ] FAIL: __________ |
| 2 | `TC-SEC-02` | **Pemeriksaan Jejak Audit (Audit Trail)**<br>Login sebagai Admin UAY → Buka menu Jejak Audit / Log Aktivitas. | Seluruh aksi penting (seperti sinkronisasi login, seeding data, perubahan kelas) tercatat rapi beserta waktu dan aktornya. | [ ] PASS  [ ] FAIL: __________ |
| 3 | `TC-SEC-03` | **Uji Ketahanan Tombol Navigasi Browser (Back / Forward)**<br>Saat sedang login, klik tombol Back hingga ke halaman depan, lalu klik Forward lagi. | Sesi pengguna tetap konsisten, tidak terjadi glitch atau kebocoran data pengguna lain. | [ ] PASS  [ ] FAIL: __________ |
| 4 | `TC-SEC-04` | **Uji Responsivitas Tampilan (Mobile / Tablet Layout)**<br>Buka aplikasi melalui ponsel pintar (HP) atau perkecil jendela browser hingga ukuran layar mobile. | Tampilan navigasi beralih ke mode mobile yang mudah disentuh (*touch-friendly*) tanpa teks terpotong keluar layar. | [ ] PASS  [ ] FAIL: __________ |

---

## BAGIAN 2: FORMULIR PELAPORAN TEMUAN BUG & SARAN UI/UX

Jika Anda menemukan error, tombol macet, teks salah ketik, atau tampilan yang berantakan, catat pada formulir di bawah ini:

### TEMUAN 1
- **Judul Masalah:** ___________________________________________________________
- **Tingkat Keparahan (Severity):**
  - `[ ] BLOCKER / CRITICAL` : Aplikasi macet total, layar blank putih, tidak bisa lanjut sama sekali.
  - `[ ] MAJOR` : Fitur utama gagal bekerja (misal kuis tidak bisa di-submit sama sekali).
  - `[ ] MINOR` : Fitur berjalan tapi ada error kecil yang mengganggu atau ada langkah membingungkan.
  - `[ ] COSMETIC / SARAN UI` : Salah ketik (typo), warna teks sulit dibaca, jarak antar tombol terlalu mepet.
- **Halaman / Fitur Terkait:** (contoh: *Halaman Kuis 01 / Kolom Pilihan Ganda*)
- **Langkah-Langkah Menemukan (Steps to Reproduce):**
  1. ___________________________________________________________
  2. ___________________________________________________________
  3. ___________________________________________________________
- **Hasil yang Diharapkan:** ___________________________________________________________
- **Hasil Nyata yang Terjadi:** ___________________________________________________________
- **Bukti / Screenshot:** (Lampirkan foto layar HP / screenshot laptop Anda)

---

### TEMUAN 2 (Opsional / Nilai Tambah)
- **Judul Masalah:** ___________________________________________________________
- **Tingkat Keparahan (Severity):** `[ ] Blocker`  `[ ] Major`  `[ ] Minor`  `[ ] Cosmetic`
- **Halaman / Fitur Terkait:** ___________________________________________________________
- **Langkah-Langkah Menemukan:**
  1. ___________________________________________________________
  2. ___________________________________________________________
- **Hasil yang Diharapkan vs Kenyataan:** ___________________________________________________________

---
*Paraf Instruktur Pemeriksa:*  
**Bang Iky / Kak Alif**  
[ _________________________ ]
