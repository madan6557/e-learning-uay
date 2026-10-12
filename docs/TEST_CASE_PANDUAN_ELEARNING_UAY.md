# PANDUAN PENGUJIAN DAN TEST CASE SISTEM E-LEARNING UNIVERSITAS AL-AMIN YOGYAKARTA (UAY)

**Versi Dokumen:** 2.1 (Versi Sistem Terkini)  
**Lingkungan Uji:** Staging / Production (`https://elearning.uay.ac.id`)  
**Metodologi Pengujian:** End-to-End Black Box & Role-Based Verification  

---

## DAFTAR ISI
1. [Pendahuluan & Konsep Hak Akses (Role-Based Access Control)](#1-pendahuluan--konsep-hak-akses)
2. [Matriks Pengguna Uji (Test Accounts)](#2-matriks-pengguna-uji-test-accounts)
3. [Test Case Role: Super Administrator (`SUPER_ADMIN`)](#3-test-case-role-super-administrator-super_admin)
4. [Test Case Role: Admin Program Studi (`DEPARTMENT_ADMIN`)](#4-test-case-role-admin-program-studi-department_admin)
5. [Test Case Role: Dosen Pengampu (`INSTRUCTOR`)](#5-test-case-role-dosen-pengampu-instructor)
6. [Test Case Role: Mahasiswa (`STUDENT`)](#6-test-case-role-mahasiswa-student)
7. [Test Case Role: Rektorat / Pimpinan (`RECTOR`)](#7-test-case-role-rektorat--pimpinan-rector)
8. [Test Case Lintas Fitur & UI/UX Global](#8-test-case-lintas-fitur--uiux-global)
9. [Format Pelaporan Temuan Kendala (Bug Report)](#9-format-pelaporan-temuan-kendala-bug-report)

---

## 1. Pendahuluan & Konsep Hak Akses

Sistem E-Learning Universitas Al-Amin Yogyakarta (UAY) dibangun dengan arsitektur berbasis peran (*Role-Based Access Control* - RBAC) yang ketat. Setiap pengguna memiliki hak akses, batas kewenangan, dan menu navigasi yang terisolasi sesuai tanggung jawab akademiknya:

| Role | Identitas | Batas Kewenangan Utama |
|---|---|---|
| **SUPER_ADMIN** | Administrator Pusat TIK / Universitas | Konfigurasi skala nilai universitas, audit trail seluruh sistem, pengumuman darurat kampus, kelola seluruh fakultas, prodi, dan akun. |
| **DEPARTMENT_ADMIN** | Admin Akademik Fakultas / Program Studi | Kelola kurikulum, mata kuliah prodi, kelas perkuliahan, plot dosen pengampu, audit trail prodi, monitoring kelas. |
| **INSTRUCTOR** | Dosen Pengampu Mata Kuliah | Kelola pertemuan kelas (section), materi (teks/video/PDF/simulasi), kuis, bank soal, tugas perkuliahan, presensi tatap muka/mandiri, bobot nilai akhir, rekap & publikasi nilai. |
| **STUDENT** | Mahasiswa Terdaftar | Akses kelas, pendaftaran mandiri (enrollment key), pembelajaran materi interaktif, presensi kelas (kode/1-klik), pengerjaan kuis, pengumpulan tugas, pemantauan nilai & progres. |
| **RECTOR** | Rektor / Wakil Rektor / Pimpinan | Dashboard eksekutif analitik universitas (read-only), statistik keaktifan dosen/mahasiswa, rasio pembelajaran, tren fakultas, ekspor rekapitulasi eksekutif. |

---

## 2. Matriks Pengguna Uji (Test Accounts)

Gunakan kredensial akun uji coba berikut saat menjalankan skenario verifikasi:

| Role | Username / Identifier | Password Default | Catatan |
|---|---|---|---|
| Super Admin | `admin` | `AdminUAY2026!` | Hak akses penuh universitas |
| Admin Prodi IF | `admin.if` | `AdminProdi2026!` | Terikat Program Studi Informatika |
| Admin Prodi SI | `admin.si` | `AdminProdi2026!` | Terikat Program Studi Sistem Informasi |
| Dosen Pengampu 1 | `198501012010121001` (NIDN) | `DosenUAY2026!` | Dosen Pengampu Kelas IF202 |
| Dosen Pengampu 2 | `198902022015042002` (NIDN) | `DosenUAY2026!` | Dosen Pengampu Kelas SI101 |
| Mahasiswa 1 | `202401001` (NIM) | `MahasiswaUAY2026!` | Mahasiswa Aktif Semester 3 |
| Mahasiswa 2 | `202401002` (NIM) | `MahasiswaUAY2026!` | Mahasiswa Aktif Semester 3 |
| Rektor | `rektor` | `RektorUAY2026!` | Akun Read-Only Eksekutif |

---

## 3. Test Case Role: Super Administrator (`SUPER_ADMIN`)

### TC-SA-01: Login dan Verifikasi Dashboard Pusat
* **Tujuan:** Memastikan Super Admin dapat masuk dan melihat metrik seluruh universitas.
* **Langkah-langkah:**
  1. Akses halaman login e-learning (`/login`).
  2. Masukkan username `admin` dan password Super Admin.
  3. Klik tombol **Masuk**.
* **Ekspektasi:**
  - Pengguna diarahkan ke dashboard utama.
  - Sidebar menampilkan menu: Beranda, Katalog Kelas, Program Studi, Pengguna, Pengumuman Kampus, Jejak Aktivitas (Audit Log), Skala Nilai Universitas.

### TC-SA-02: Konfigurasi Skala Huruf Mutu Nilai Universitas
* **Tujuan:** Memverifikasi Super Admin dapat mengedit batas bawah nilai huruf dan bobot IP (4.00, 3.75, dst) dan tombol modal berada di sebelah kanan.
* **Langkah-langkah:**
  1. Klik menu **Skala Nilai Universitas** pada navigasi.
  2. Klik tombol **Tambah / Edit Skala Nilai**.
  3. Periksa posisi tombol pada footer modal: tombol **Batal** dan **Simpan** berada rapi di sisi kanan modal (`justify-content: flex-end`).
  4. Ubah batas bawah nilai (misal A = 85, A- = 80, B+ = 75, B = 70).
  5. Klik tombol **Simpan Skala Nilai**.
* **Ekspektasi:**
  - Notifikasi toast hijau muncul di kanan atas: *"Skala nilai berhasil diperbarui"*.
  - Perubahan skala nilai tersimpan dan langsung diterapkan pada kalkulasi nilai akhir kelas.

### TC-SA-03: Pemantauan Rekaman Jejak Aktivitas (Audit Trail)
* **Tujuan:** Memverifikasi Super Admin dapat melihat riwayat aktivitas sistem, menggunakan filter, dan pagination rapi tidak mentok ke tepi.
* **Langkah-langkah:**
  1. Klik menu **Jejak Aktivitas (Audit Logs)**.
  2. Periksa tabel log aktivitas: memuat Kolom Waktu, Aktor, Modul, Aksi, Alamat IP, dan Detail Perubahan.
  3. Gunakan filter Aktor (masukkan nama dosen atau admin).
  4. Gunakan filter Modul (pilih `GRADEBOOK`, `ATTENDANCE`, atau `ASSESSMENT`).
  5. Periksa komponen pagination di bawah tabel: terdapat margin/padding yang cukup, border halus, tidak mentok ke pojok container.
  6. Klik tombol halaman `2` atau tombol navigasi panah.
* **Ekspektasi:**
  - Data log tersaring sesuai kriteria tanpa reload halaman penuh.
  - Komponen pagination tampak proporsional, rapi, dan mudah diklik.

### TC-SA-04: Publikasi Pengumuman Darurat Sistem
* **Tujuan:** Memastikan pengumuman darurat dapat diterbitkan ke seluruh pengguna.
* **Langkah-langkah:**
  1. Buka menu **Pengumuman Sistem**.
  2. Klik tombol **Buat Pengumuman Baru**.
  3. Masukkan Judul: *"Pemeliharaan Server Berkala"*.
  4. Pilih Tingkat Kepentingan: **Penting / Urgent**.
  5. Tulis isi pengumuman dan klik **Terbitkan**.
* **Ekspektasi:**
  - Banner pengumuman muncul di halaman utama seluruh pengguna kampus.

---

## 4. Test Case Role: Admin Program Studi (`DEPARTMENT_ADMIN`)

### TC-SA-05: Pembuatan Kelas Perkuliahan & Auto-Generated Enrollment Key
* **Tujuan:** Memverifikasi pembuatan kelas dengan kode pendaftaran mandiri 6 huruf kapital acak otomatis.
* **Langkah-langkah:**
  1. Login sebagai `admin.if`.
  2. Masuk ke menu **Manajemen Kelas** -> klik tombol **Tambah Kelas**.
  3. Perhatikan field **Kunci Pendaftaran (Enrollment Key)**:
     - Field sudah terisi otomatis dengan 6 huruf kapital (misal: `XKLRPT`).
     - Terdapat tombol **Acak Ulang** di samping kolom input.
  4. Klik tombol **Acak Ulang**: pastikan kode berubah menjadi 6 huruf kapital baru tanpa reload.
  5. Isi Nama Mata Kuliah, Semester/Tahun Akademik, dan pilih minimal 1 Dosen Pengampu.
  6. Klik tombol **Simpan**.
* **Ekspektasi:**
  - Kelas baru berhasil dibuat dengan kunci pendaftaran 6 karakter huruf kapital tersebut.
  - Mahasiswa dapat mendaftar mandiri menggunakan kode tersebut.

### TC-SA-06: Monitoring Kelas & Audit Aktivitas Program Studi
* **Tujuan:** Memastikan Admin Prodi dapat memantau aktivitas dosen di lingkup prodinya.
* **Langkah-langkah:**
  1. Masuk ke menu **Jejak Aktivitas Program Studi**.
  2. Pastikan log yang tampil hanya mencakup mata kuliah dan dosen di bawah program studi yang bersangkutan.
  3. Periksa pagination di bagian bawah tabel audit prodi.
* **Ekspektasi:**
  - Terjadi isolasi data (data prodi lain tidak bocor).
  - Pagination rapi dengan spasi estetis di tepi card.

---

## 5. Test Case Role: Dosen Pengampu (`INSTRUCTOR`)

### TC-IN-01: Navigasi dan Pembuatan Pertemuan (Section)
* **Tujuan:** Memverifikasi penambahan pertemuan baik melalui tombol atas maupun tombol bawah yang berada di tengah.
* **Langkah-langkah:**
  1. Login sebagai Dosen (`198501012010121001`).
  2. Buka kelas yang diampu dari dashboard.
  3. Pada tab **Pembelajaran**:
     - Uji tombol **Tambah Pertemuan** di bagian kanan atas toolbar.
     - Scroll ke bagian paling bawah daftar pertemuan, perhatikan tombol **Tambah Pertemuan** yang berada di posisi tengah (`center`).
  4. Klik tombol di bagian bawah tengah tersebut.
  5. Masukkan Judul Pertemuan (misal: *"Pertemuan 05: Algoritma Greedy"*), pilih tipe perkuliahan, lalu klik **Terbitkan**.
* **Ekspektasi:**
  - Modal tambah pertemuan terbuka dengan mulus dari kedua tombol.
  - Pertemuan baru muncul di urutan paling bawah daftar pertemuan kelas.

### TC-IN-02: Tambah & Edit Materi (Tipe di Atas Judul, Tampilan Berkas Tersimpan)
* **Tujuan:** Memverifikasi urutan form materi (Tipe Materi di atas Judul), informasi berkas PDF/praktikum tersimpan, dan modal padding yang proporsional.
* **Langkah-langkah:**
  1. Pada suatu pertemuan, klik **+ Materi**.
  2. Perhatikan tata letak form editor materi:
     - Kolom pilihan **Tipe Materi** berada di baris tersendiri di ATAS kolom **Judul Materi**.
  3. Pilih Tipe: **Dokumen PDF**.
  4. Unggah berkas dokumen materi (misal `Slide_Pertemuan_05.pdf` ukuran 2MB).
  5. Pastikan proses unggah berhasil tanpa kendala ukuran body size (hingga 100MB didukung).
  6. Simpan materi.
  7. Klik tombol **Edit** pada materi yang baru dibuat tersebut.
  8. Perhatikan tampilan area berkas di dalam modal edit:
     - Tampil kartu informasi berkas tersimpan dengan nama berkas dan badge hijau: *"Berhasil diunggah"*.
     - Terdapat tombol *"Ganti berkas"* jika dosen ingin memperbarui file.
     - Jarak padding atas (di bawah header modal) dan padding bawah (sebelum tombol aksi) terlihat rapi dan tidak ada tumpukan ruang kosong berlebih.
* **Ekspektasi:**
  - Selector tipe materi berada di atas judul.
  - Informasi berkas lama tampil jelas sehingga dosen yakin berkas sudah tersimpan.

### TC-IN-03: Materi Teks Kaya (Block Editor & Lampiran Berkas)
* **Tujuan:** Memverifikasi penambahan blok teks, kode program, rumus LaTeX, dan lampiran berkas tanpa galat koneksi.
* **Langkah-langkah:**
  1. Buat materi baru bertipe **Materi Teks (Rich Text)**.
  2. Beralih antar tab **Tulis**, **Pratinjau**, dan **Berdampingan**.
  3. Tambahkan blok **Lampiran Berkas** ke dalam artikel materi.
  4. Unggah berkas pendukung (misal file ZIP/PDF kode sumber).
  5. Simpan materi.
* **Ekspektasi:**
  - Berkas berhasil diunggah dengan status kredensial valid (tidak muncul pesan galat *"Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi"*).
  - Mahasiswa dapat mengunduh lampiran berkas langsung dari bacaan materi.

### TC-IN-04: Pembuatan Tugas & Mode Uji Coba Pengumpulan Dosen
* **Tujuan:** Memverifikasi dosen dapat membuat tugas dan menguji coba pengumpulan berkas tugas tanpa terblokir hak akses mahasiswa.
* **Langkah-langkah:**
  1. Klik tombol **+ Tugas** pada suatu pertemuan.
  2. Isi Judul: *"Tugas Praktikum 01"*, Deskripsi tugas, Batas Waktu, dan pilih format berkas yang diperbolehkan (`PDF, ZIP`).
  3. Simpan dan buka detail halaman Tugas tersebut.
  4. Perhatikan bagian bawah ringkasan tugas: terdapat kartu khusus **"Uji Coba Pengumpulan Tugas (Dosen Pengampu)"** dengan border biru halus.
  5. Dosen mengunggah file uji coba (`Jawaban_Uji_Coba.pdf`) dan menulis catatan tugas.
  6. Klik tombol **Kirim Uji Coba Pengumpulan**.
* **Ekspektasi:**
  - Unggahan berkas berjalan mulus tanpa error `403 STUDENT_REQUIRED`.
  - Jawaban uji coba tersimpan dan tampil pada daftar pengumpulan untuk verifikasi alur penilaian.

### TC-IN-05: Pembuatan Kuis, Bank Soal, dan Kunci Jawaban Non-Teknis
* **Tujuan:** Memverifikasi pembuatan kuis dan tampilan kunci jawaban ramah pengguna (bukan JSON mentah).
* **Langkah-langkah:**
  1. Klik **+ Kuis** pada pertemuan.
  2. Buat soal Pilihan Ganda (Single Choice), Pilihan Ganda Kompleks (Multi Choice), dan Esai.
  3. Tentukan kunci jawaban yang benar.
  4. Buka tab ringkasan kuis / bank soal dan klik **Lihat Kunci Jawaban**.
* **Ekspektasi:**
  - Kunci jawaban ditampilkan dalam bentuk badge pilihan yang jelas (misal: Opsi A: *"Hypertext Transfer Protocol"*), bukan format kode JSON mentah seperti `{"correct": ["a"]}`.

### TC-IN-06: Presensi Perkuliahan (Sesi Mandiri & Sesi Kode Proyektor)
* **Tujuan:** Memverifikasi pembukaan sesi presensi tatap muka dan keselarasan layout presensi.
* **Langkah-langkah:**
  1. Buka tab **Presensi** pada kelas.
  2. Perhatikan layout tab Presensi: lebar halaman selaras dengan tab lain (tidak mengecil ke 1040px), menggunakan header standar `.section-heading` dan `.toolbar`.
  3. Klik tombol **Buat Sesi Presensi**.
  4. Skenario A (Presensi dengan Kode): Centang *"Gunakan Kode Verifikasi"*, sistem menampilkan 6 digit kode acak besar untuk proyektor.
  5. Skenario B (Presensi Bebas Kode / 1-Klik): Jangan centang kode verifikasi.
  6. Klik **Buka Sesi Presensi**.
* **Ekspektasi:**
  - Sesi terbuka dengan countdown waktu aktif.
  - Tampilan presensi konsisten dan estetis di layar proyektor maupun laptop dosen.

### TC-IN-07: Pembobotan Penilaian Akhir (Gradebook Presets & Auto-Assign)
* **Tujuan:** Memverifikasi template awal pembobotan (Tugas 30%, UTS 35%, UAS 35%) dan tombol auto-assign tugas & kuis.
* **Langkah-langkah:**
  1. Buka tab **Buku Nilai (Gradebook)** pada kelas baru.
  2. Buka menu **Pengaturan Nilai** -> **Bobot Kategori Penilaian**.
  3. Periksa template awal kelas:
     - Kategori 1: **Tugas** (Bobot **30%**, opsi auto-assign seluruh tugas & kuis aktif).
     - Kategori 2: **UTS** (Bobot **35%**).
     - Kategori 3: **UAS** (Bobot **35%**).
     - Total persentase: **100%**.
  4. Uji tombol Preset di bagian atas modal:
     - Klik tombol preset **Tugas & Kuis Terpisah**: bobot berubah menjadi Tugas 20%, Kuis 10%, UTS 35%, UAS 35%.
     - Klik tombol preset **Standar UAY (Default)**: bobot kembali ke Tugas 30%, UTS 35%, UAS 35%.
  5. Klik tombol **Jalankan Auto-Assign Sekarang**.
  6. Klik tombol **Simpan Bobot**.
* **Ekspektasi:**
  - Seluruh tugas dan kuis yang belum memiliki kategori otomatis masuk ke dalam kategori Tugas (30%).
  - Total nilai akhir mahasiswa langsung terhitung otomatis secara proporsional.

---

## 6. Test Case Role: Mahasiswa (`STUDENT`)

### TC-ST-01: Pendaftaran Mandiri Kelas Menggunakan Enrollment Key
* **Tujuan:** Memverifikasi mahasiswa dapat bergabung ke kelas menggunakan kunci pendaftaran 6 karakter dari dosen.
* **Langkah-langkah:**
  1. Login sebagai Mahasiswa (`202401001`).
  2. Klik menu **Gabung Kelas** di dashboard.
  3. Pilih mata kuliah dari daftar kelas terbuka atau masukkan kode kelas.
  4. Masukkan Kunci Pendaftaran 6 huruf kapital (misal: `XKLRPT`).
  5. Klik **Gabung ke Kelas**.
* **Ekspektasi:**
  - Mahasiswa berhasil terdaftar ke dalam kelas dan diarahkan ke halaman kelas perkuliahan.

### TC-ST-02: Pengisian Presensi Perkuliahan
* **Tujuan:** Memverifikasi pengisian presensi mandiri saat sesi dibuka dosen.
* **Langkah-langkah:**
  1. Masuk ke kelas perkuliahan yang sedang membuka sesi presensi.
  2. Perhatikan banner biru di bagian atas tab Presensi: *"Sesi Presensi Sedang Berlangsung"*.
  3. Jika sesi memerlukan kode: Klik tombol **Isi Presensi**, masukkan 6 karakter kode dari layar dosen, lalu klik kirim.
  4. Jika sesi 1-klik: Klik tombol **Konfirmasi Hadir (1-Klik)**.
* **Ekspektasi:**
  - Status kehadiran mahasiswa langsung tercatat sebagai **HADIR (PRESENT)** lengkap dengan waktu pencatatan.

### TC-ST-03: Pembelajaran Materi (PDF & Video Tracking)
* **Tujuan:** Memverifikasi progres belajar tercatat akurat tanpa merugikan mahasiswa.
* **Langkah-langkah:**
  1. Buka materi bertipe **Dokumen PDF**: baca dokumen hingga halaman terakhir.
  2. Buka materi bertipe **Video Pembelajaran**: putar video hingga melewati batas minimum tonton (misal 85%).
  3. Kembali ke daftar pertemuan kelas.
* **Ekspektasi:**
  - Checklist progres materi berubah menjadi centang hijau selesai (*Completed*).
  - Persentase penyelesaian kelas mahasiswa bertambah secara adil dan akurat.

### TC-ST-04: Pengumpulan & Pengumpulan Ulang Tugas
* **Tujuan:** Memverifikasi pengumpulan berkas tugas dan fitur perbaikan tugas (revisi).
* **Langkah-langkah:**
  1. Buka materi bertipe **Tugas**.
  2. Unggah file jawaban tugas (`Laporan_Tugas_1.pdf`).
  3. Klik **Kumpulkan Tugas**.
  4. Setelah berhasil, perhatikan tampilan informasi pengumpulan: muncul status **Terkumpul Tepat Waktu (Versi 1)**.
  5. Selagi waktu pengumpulan masih dibuka, uji fitur revisi: unggah file perbaikan baru dan klik **Kumpulkan Ulang (Versi 2)**.
* **Ekspektasi:**
  - Sistem mencatat riwayat versi pengumpulan dengan rapi.
  - Versi terbaru menggantikan versi lama untuk dinilai dosen.

### TC-ST-05: Pengerjaan Kuis Interaktif
* **Tujuan:** Memverifikasi pengerjaan kuis, navigasi butir soal, dan timer hitung mundur.
* **Langkah-langkah:**
  1. Buka kuis perkuliahan dan klik **Mulai Kuis**.
  2. Jawab soal pilihan ganda, tandai ragu-ragu jika perlu, lalu beralih ke soal berikutnya.
  3. Setelah selesai semua soal, klik **Kumpulkan Jawaban Kuis**.
* **Ekspektasi:**
  - Jawaban tersimpan dengan aman.
  - Nilai otomatis terhitung untuk soal pilihan ganda objektif.

---

## 7. Test Case Role: Rektorat / Pimpinan (`RECTOR`)

### TC-RC-01: Akses Dashboard Eksekutif Universitas (Read-Only)
* **Tujuan:** Memverifikasi pimpinan universitas dapat melihat indikator kinerja utama pembelajaran tanpa hak ubah data operasional.
* **Langkah-langkah:**
  1. Login sebagai `rektor`.
  2. Buka Dashboard Pimpinan.
  3. Amati ringkasan metrik: Total Mahasiswa Aktif, Total Dosen Mengajar, Total Kelas Berjalan, Rata-rata Kehadiran Mahasiswa, dan Persentase Kelengkapan Nilai.
  4. Klik salah satu kelas untuk melihat detail.
* **Ekspektasi:**
  - Semua halaman tampil dalam mode *Read-Only* (tidak terdapat tombol hapus, edit, atau ubah nilai).
  - Data yang ditampilkan mencerminkan kondisi riil database universitas (*live data*).

### TC-RC-02: Pemantauan Keaktifan Dosen & Kelas
* **Tujuan:** Memverifikasi rekapitulasi keaktifan perkuliahan per fakultas dan prodi.
* **Langkah-langkah:**
  1. Buka tab **Keaktifan Perkuliahan**.
  2. Filter berdasarkan Fakultas Sains dan Teknologi -> Program Studi Informatika.
  3. Amati grafik distribusi penyelesaian materi dan presensi dosen.
  4. Klik tombol **Ekspor Rekapitulasi Eksekutif (Excel)**.
* **Ekspektasi:**
  - Berkas rekap Excel berhasil diunduh dengan struktur data lengkap untuk bahan rapat pimpinan.

---

## 8. Test Case Lintas Fitur & UI/UX Global

### TC-UX-01: Tanda Bintang Merah pada Kolom Wajib Diisi (Required Fields)
* **Tujuan:** Memverifikasi bahwa setiap field input formulir yang wajib diisi menampilkan tanda asteris `*` berwarna merah, sementara teks label tetap berwarna netral standar.
* **Langkah-langkah:**
  1. Buka formulir Tambah Kelas, Tambah Materi, atau Tambah Tugas.
  2. Perhatikan label input yang memiliki atribut `required` (misal: *"Nama Kelas \*"*, *"Judul Materi \*"*).
* **Ekspektasi:**
  - Teks *"Nama Kelas"* berwarna hitam/gelap standar tema.
  - Karakter asteris `*` secara spesifik berwarna merah menyala (`#ef4444`).

### TC-UX-02: Notifikasi Validasi Berupa Floating Toast Kanan Atas
* **Tujuan:** Memverifikasi bahwa saat terjadi kesalahan validasi input, peringatan muncul sebagai floating toast di kanan atas, bukan boks inline besar yang merusak kerapian modal.
* **Langkah-langkah:**
  1. Buka modal Tambah Pertemuan atau Tambah Materi.
  2. Kosongkan kolom yang wajib diisi lalu tekan tombol Simpan.
* **Ekspektasi:**
  - Notifikasi toast peringatan melayang muncul di sudut kanan atas layar.
  - Tidak muncul tulisan artifact aneh seperti *"Waktu tidak tersedia"*.
  - Modal tetap bersih, proporsional, dan fokus pada input yang belum lengkap.

### TC-UX-03: Kerapian Komponen Pagination (Anti Mentok ke Pojok)
* **Tujuan:** Memverifikasi seluruh komponen pagination di tabel data (Audit Log, Daftar Mahasiswa, Riwayat Nilai) memiliki margin dan padding yang nyaman.
* **Langkah-langkah:**
  1. Buka tabel audit log atau daftar peserta kelas dengan data lebih dari 25 baris.
  2. Scroll ke bagian kontrol pagination di bawah tabel.
* **Ekspektasi:**
  - Tombol nomor halaman dan navigasi memiliki jarak aman dari batas pinggir kartu (margin-bottom dan padding proporsional).
  - Tampilan tidak mentok ke sudut container.

### TC-UX-04: Responsivitas Mobile & Dark Mode
* **Tujuan:** Memverifikasi kenyamanan penggunaan di perangkat smartphone dan pergantian tema gelap/terang.
* **Langkah-langkah:**
  1. Akses sistem melalui browser smartphone atau aktifkan Device Mode (lebar 390px).
  2. Uji alur pengisian presensi dan pembacaan materi.
  3. Beralih tema dari Mode Terang (*Light Mode*) ke Mode Gelap (*Dark Mode*).
* **Ekspektasi:**
  - Seluruh tombol memiliki area sentuh minimal 44px (*finger-friendly*).
  - Kontras warna teks dan kartu tetap tinggi dan nyaman dibaca dalam kondisi gelap.

---

## 9. Format Pelaporan Temuan Kendala (Bug Report)

Apabila tim penguji menemukan ketidaksesuaian antara hasil pengujian dengan ekspektasi, catat laporan menggunakan format standar berikut:

```markdown
### [BUG-ID] Judul Ringkas Kendala
- **ID Test Case Terkait:** TC-IN-02 / TC-SA-05 / dll
- **Role Pengguna:** INSTRUCTOR / STUDENT / dll
- **Perangkat & Browser:** Chrome 124 (Desktop Windows 11) / Safari iOS 17
- **Langkah Reproduksi:**
  1. Buka menu X
  2. Klik tombol Y
  3. Masukkan input Z
- **Hasil yang Terjadi:** (Jelaskan pesan error atau keanehan visual)
- **Hasil yang Diharapkan:** (Sesuai panduan test case di dokumen ini)
- **Bukti Tangkapan Layar (Screenshot/Log):** Lampirkan gambar jika ada
```

---
*Dokumen ini disusun untuk menjamin mutu dan keandalan operasional E-Learning Universitas Al-Amin Yogyakarta (UAY).*
