import { writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const projectRoot = process.cwd();
const docsDir = join(projectRoot, "docs");
const tempHtmlPath = join(projectRoot, "temp_complete_guide.html");
const outputPdfPath = join(docsDir, "TEST_CASE_PANDUAN_ELEARNING_UAY.pdf");
const artifactDir = "C:\\Users\\mikyl\\.gemini\\antigravity\\brain\\e6f9988c-7087-4127-9e25-8d0db675ec57";
const artifactPdfPath = join(artifactDir, "TEST_CASE_PANDUAN_ELEARNING_UAY.pdf");

// All 42 Test Cases covering EVERY tutorial in helpGuide.json / panduan.html + all recent features & bug fixes
const testCases = [
  // --- PENGGUNA UMUM (U1 - U3) ---
  {
    id: "TC-GEN-01",
    tutorialId: "U1",
    title: "Masuk dengan Akun Kampus (SSO Keycloak & Login Lokal Cadangan)",
    role: "GLOBAL",
    roleLabel: "SEMUA PERAN",
    module: "Autentikasi & Akun",
    location: "Halaman Masuk (/login)",
    objective: "Memastikan proses autentikasi SSO kampus dan login darurat lokal berfungsi aman sesuai peran.",
    preconditions: "Browser membuka URL /login, server SSO aktif.",
    testData: "Akun SSO atau kredensial darurat lokal (admin, admin.if, dosen, mahasiswa, rektor).",
    steps: [
      "Buka halaman utama login /login.",
      "Untuk SSO Kampus: Klik tombol 'Masuk dengan Akun Kampus (SSO)'. Sistem mengarahkan ke portal Keycloak UAY.",
      "Masukkan kredensial kampus lalu konfirmasi izin akses.",
      "Untuk Login Darurat: Masukkan Nama Pengguna / NIM / NIDN dan Kata Sandi pada form lokal, lalu klik Masuk.",
      "Periksa pengalihan halaman setelah berhasil masuk."
    ],
    expected: "Sesi berhasil dibentuk. Pengguna diarahkan ke dashboard sesuai perannya tanpa loop pengalihan. Token sesi tersimpan aman di cookie berstatus HttpOnly/SameSite."
  },
  {
    id: "TC-GEN-02",
    tutorialId: "U2",
    title: "Navigasi Menu, Responsivitas Mobile, dan Pemulihan Draf Formulir",
    role: "GLOBAL",
    roleLabel: "SEMUA PERAN",
    module: "Antarmuka & Draf",
    location: "Seluruh Halaman & Formulir Editor",
    objective: "Memverifikasi navigasi sidebar desktop, drawer mobile 390px, serta fitur autosave & pemulihan draf lokal.",
    preconditions: "Pengguna telah login dan membuka formulir yang mendukung draf (Section, Materi, Tugas, Kuis, Bobot).",
    testData: "Input teks draf pada formulir materi atau tugas.",
    steps: [
      "Periksa menu navigasi di sisi kiri pada layar desktop, pastikan breadcrumb dan header aktif.",
      "Kecilkan ukuran browser ke lebar mobile (390px) atau buka dari smartphone: tombol hamburger membuka drawer navigasi dengan area sentuh minimal 44px.",
      "Buka salah satu form (misal Tambah Materi atau Tambah Pertemuan).",
      "Ketik judul dan deskripsi, lalu tutup modal atau muat ulang halaman secara sengaja tanpa menekan Simpan.",
      "Buka kembali modal form yang sama."
    ],
    expected: "Drawer mobile responsif dan mulus. Saat form dibuka kembali, sistem menampilkan status draf tersimpan dan memulihkan teks yang sebelumnya telah diketik."
  },
  {
    id: "TC-GEN-03",
    tutorialId: "U3",
    title: "Profil Pengguna, Tema Gelap/Terang, Notifikasi Lonceng, dan Logout Aman",
    role: "GLOBAL",
    roleLabel: "SEMUA PERAN",
    module: "Akun & Preferensi",
    location: "Header Aplikasi & Menu Profil",
    objective: "Memastikan pergantian tema, penerimaan notifikasi real-time, dan pembersihan sesi saat keluar.",
    preconditions: "Pengguna sedang dalam sesi aktif.",
    testData: "Preferensi Dark/Light mode, notifikasi aktivitas kelas.",
    steps: [
      "Klik ikon Tema (Matahari / Bulan) di bar navigasi atas: periksa perubahan warna antarmuka dari Terang ke Gelap dan sebaliknya.",
      "Pastikan kontras teks, tombol, dan kartu tetap jelas dan nyaman dibaca pada Mode Gelap.",
      "Klik ikon Lonceng Notifikasi: amati riwayat pemberitahuan tugas baru, materi baru, dan pengumuman sistem.",
      "Buka menu profil pengguna -> klik tombol Keluar (Logout).",
      "Coba gunakan tombol 'Back' di peramban."
    ],
    expected: "Tema tersimpan persisten di perangkat. Notifikasi tampil akurat. Saat logout, seluruh cookie sesi dan token dihapus; tombol Back tidak dapat membuka data privat."
  },

  // --- MAHASISWA (M1 - M6) ---
  {
    id: "TC-ST-01",
    tutorialId: "M1",
    title: "Menemukan Kelas & Pendaftaran Mandiri dengan Kunci (Enrollment Key 6 Huruf)",
    role: "STUDENT",
    roleLabel: "MAHASISWA",
    module: "Katalog & Pendaftaran",
    location: "Beranda Mahasiswa -> Gabung Kelas",
    objective: "Memverifikasi mahasiswa dapat menemukan kelas terbuka atau mendaftar menggunakan kunci 6 huruf kapital dari dosen.",
    preconditions: "Login sebagai mahasiswa (202401001). Kelas target memiliki enrollment key aktif.",
    testData: "Kunci pendaftaran 6 karakter huruf kapital (misal: XKLRPT).",
    steps: [
      "Di dashboard mahasiswa, klik tombol 'Gabung Kelas'.",
      "Skenario A (Daftar Terbuka): Cari kelas pada dropdown kelas terbuka yang membuka pendaftaran mandiri.",
      "Skenario B (ID Manual): Klik opsi 'Gunakan ID / Kode Kelas manual', masukkan kode mata kuliah (misal IF202).",
      "Masukkan Kunci Pendaftaran (6 huruf kapital).",
      "Klik tombol 'Gabung ke Kelas'."
    ],
    expected: "Jika kunci valid, mahasiswa langsung terdaftar sebagai peserta aktif dan diarahkan ke beranda kelas. Jika kunci salah, muncul pesan galat jelas tanpa reload."
  },
  {
    id: "TC-ST-02",
    tutorialId: "M2",
    title: "Mengisi Presensi Perkuliahan (Satu Klik Mandiri & Verifikasi Kode)",
    role: "STUDENT",
    roleLabel: "MAHASISWA",
    module: "Presensi Perkuliahan",
    location: "Kelas -> Tab Presensi",
    objective: "Memastikan mahasiswa dapat mencatatkan kehadiran secara mandiri sesuai jenis sesi yang dibuka dosen.",
    preconditions: "Dosen telah membuka sesi presensi pada kelas yang bersangkutan.",
    testData: "Kode verifikasi 6 karakter dari layar dosen (jika sesi menggunakan kode).",
    steps: [
      "Buka kelas perkuliahan saat jam kuliah berlangsung, lalu pilih tab Presensi.",
      "Perhatikan banner biru notifikasi presensi aktif di bagian atas.",
      "Jika sesi Bebas Kode: Klik tombol 'Konfirmasi Hadir (1-Klik)'.",
      "Jika sesi Kode Proyektor: Klik tombol 'Isi Presensi (Kode)', masukkan 6 karakter kode presensi, lalu klik Simpan.",
      "Periksa tabel riwayat kehadiran pertemuan."
    ],
    expected: "Status kehadiran langsung berubah menjadi HADIR (PRESENT) disertai stempel waktu presensi. Tombol presensi otomatis nonaktif untuk mencegah klik ganda."
  },
  {
    id: "TC-ST-03",
    tutorialId: "M3",
    title: "Mempelajari Materi Teks, Dokumen PDF, dan Video dengan Perekaman Progres Akurat",
    role: "STUDENT",
    roleLabel: "MAHASISWA",
    module: "Pembelajaran Materi",
    location: "Kelas -> Tab Pembelajaran -> Pilih Materi",
    objective: "Memverifikasi rekaman progres belajar terekam adil dan akurat tanpa merugikan mahasiswa.",
    preconditions: "Materi telah berstatus terbit (PUBLISHED).",
    testData: "Materi artikel teks, dokumen PDF multi-halaman, video MP4 / YouTube.",
    steps: [
      "Buka Materi Teks: scroll dan baca artikel hingga akhir blok. Klik lampiran berkas jika tersedia untuk mengunduh modul pendukung.",
      "Buka Materi Dokumen PDF: buka dokumen, navigasikan tombol halaman hingga halaman terakhir. Periksa auto-page indicator.",
      "Buka Materi Video: putar video hingga melewati batas ambang tonton (misal 85% durasi).",
      "Kembali ke halaman utama daftar pertemuan kelas dan amati ikon checklist progres."
    ],
    expected: "Ikon indikator pada kartu pertemuan berubah menjadi centang hijau selesai (item-completed). Persentase progres belajar kelas bertambah secara proporsional."
  },
  {
    id: "TC-ST-04",
    tutorialId: "M4",
    title: "Mengumpulkan Tugas, Mengunggah Berkas, dan Melakukan Revisi (Multi-Versi)",
    role: "STUDENT",
    roleLabel: "MAHASISWA",
    module: "Tugas Perkuliahan",
    location: "Kelas -> Tab Pembelajaran -> Detail Tugas",
    objective: "Memverifikasi pengumpulan berkas tugas mandiri serta mekanisme pengumpulan ulang/revisi sebelum batas waktu.",
    preconditions: "Tugas sedang dalam periode dibuka dan mahasiswa belum melampaui batas maksimal percobaan.",
    testData: "Berkas tugas (PDF / ZIP ukuran hingga 50MB), teks jawaban, tautan eksternal.",
    steps: [
      "Buka tugas perkuliahan yang ditugaskan dosen.",
      "Unggah berkas tugas melalui dropzone berkas (atau masukkan teks rapi / link tugas sesuai format yang diizinkan).",
      "Klik tombol 'Kumpulkan Tugas'. Perhatikan konfirmasi tanda terima pengumpulan.",
      "Periksa kartu status pengumpulan: tampil status Terkumpul Tepat Waktu (Versi 1) beserta waktu kirim.",
      "Lakukan pengumpulan ulang (revisi): unggah berkas revisi lalu klik tombol 'Kumpulkan Ulang (Versi 2)'.",
      "Amati riwayat versi pengumpulan di tabel riwayat."
    ],
    expected: "Berkas berhasil diunggah dengan status 200/201. Sistem mencatat versi pengumpulan terbaru sebagai versi aktif untuk penilaian dosen."
  },
  {
    id: "TC-ST-05",
    tutorialId: "M5",
    title: "Mengerjakan Kuis Perkuliahan Sampai Terkumpul (Timer & Auto-Submit)",
    role: "STUDENT",
    roleLabel: "MAHASISWA",
    module: "Kuis Interaktif",
    location: "Kelas -> Tab Pembelajaran -> Detail Kuis",
    objective: "Memastikan integritas pengerjaan kuis, navigasi butir soal, penanda ragu-ragu, dan pengumpulan jawaban.",
    preconditions: "Kuis berstatus PUBLISHED dan waktu akses telah dibuka.",
    testData: "Pilihan jawaban Single Choice, Multi Choice, Esai.",
    steps: [
      "Buka kuis -> klik tombol 'Mulai Kuis'.",
      "Perhatikan indikator hitung mundur waktu (timer) di bar atas.",
      "Jawab butir soal satu per satu, gunakan tombol 'Tandai Ragu-ragu' pada soal yang belum yakin.",
      "Gunakan panel nomor soal untuk berpindah antar butir pertanyaan secara acak.",
      "Klik tombol 'Kumpulkan Jawaban Kuis' sebelum timer habis.",
      "Uji skenario batas waktu: biarkan waktu habis hingga nol untuk memastikan jawaban otomatis terkumpul (auto-submit)."
    ],
    expected: "Jawaban tersimpan otomatis per butir. Saat dikumpulkan atau waktu habis, pengerjaan difinalisasi dan skor objektif dihitung otomatis."
  },
  {
    id: "TC-ST-06",
    tutorialId: "M6",
    title: "Memeriksa Buku Nilai Pribadi dan Rekapitulasi Kehadiran Mahasiswa",
    role: "STUDENT",
    roleLabel: "MAHASISWA",
    module: "Buku Nilai & Presensi",
    location: "Kelas -> Tab Buku Nilai & Tab Presensi",
    objective: "Memverifikasi transparansi nilai mahasiswa, rincian skor per kategori, dan syarat kelayakan ujian 75%.",
    preconditions: "Dosen telah memasukkan nilai dan mempublikasikan rekap nilai / kehadiran.",
    testData: "Rekam jejak nilai tugas, kuis, UTS, UAS, dan kehadiran mahasiswa.",
    steps: [
      "Buka tab 'Buku Nilai': periksa kartu Nilai Akhir (Skor Angka, Huruf Mutu, Indeks Prestasi 4.00, Tanggal Terbit).",
      "Periksa rincian tabel per kategori bobot (Tugas 30%, UTS 35%, UAS 35%).",
      "Buka tab 'Presensi': periksa persentase total kehadiran kuliah.",
      "Periksa badge kelayakan ujian (Layak Ujian jika kehadiran >= 75%, Tidak Layak jika < 75%)."
    ],
    expected: "Tampilan buku nilai mahasiswa bersifat read-only yang jelas dan transparan. Mahasiswa mengetahui rincian nilai tanpa ada data mahasiswa lain yang bocor."
  },

  // --- DOSEN PENGAMPU (D1 - D16) ---
  {
    id: "TC-IN-01",
    tutorialId: "D1",
    title: "Menyiapkan Kelas dan Pertemuan (Tambah Pertemuan Atas & Bawah Tengah)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Manajemen Pertemuan",
    location: "Kelas -> Tab Pembelajaran",
    objective: "Memverifikasi dosen dapat menyusun pertemuan dari tombol toolbar atas maupun tombol tengah di bagian bawah daftar.",
    preconditions: "Login sebagai Dosen Pengampu yang terdaftar pada kelas.",
    testData: "Judul pertemuan, tipe pertemuan (Tatap Muka / Daring), tanggal mulai dan selesai.",
    steps: [
      "Masuk ke kelas perkuliahan pada tab Pembelajaran.",
      "Uji tombol 1: Klik tombol '+ Tambah Pertemuan' di kanan atas toolbar.",
      "Scroll ke bawah daftar pertemuan yang sudah ada.",
      "Uji tombol 2: Klik tombol '+ Tambah Pertemuan' yang berada di posisi tengah di bawah pertemuan terakhir.",
      "Isi judul pertemuan: 'Pertemuan 07: Pohon Biner & Graf', tentukan tanggal akses, pilih Draf atau Terbit.",
      "Uji tombol pindah urutan: Gunakan tombol panah Naik / Turun untuk mengatur tata urutan pertemuan."
    ],
    expected: "Modal tambah pertemuan terbuka sempurna dari kedua tombol. Pertemuan baru berhasil tersimpan dan urutan pertemuan dapat diatur dengan lancar."
  },
  {
    id: "TC-IN-02",
    tutorialId: "D2",
    title: "Mengunggah Modul PDF & Bahan Praktikum (Dukungan 100MB, Info File Lama, Selector di Atas Judul)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Materi Pembelajaran",
    location: "Kelas -> Tab Pembelajaran -> + Materi",
    objective: "Memverifikasi peletakan selector tipe materi di atas judul, upload file hingga 100MB, dan tampilan file lama saat edit.",
    preconditions: "Dosen berada di dalam pertemuan yang aktif.",
    testData: "File PDF ukuran besar (misal 5MB - 20MB) dan file praktikum.",
    steps: [
      "Klik '+ Materi' pada pertemuan.",
      "Perhatikan posisi kolom: Kolom 'Tipe Materi' berada di baris tersendiri di ATAS kolom 'Judul Materi'.",
      "Pilih Tipe: 'Dokumen PDF', lalu masukkan Judul Materi.",
      "Unggah berkas PDF ukuran > 1.2MB. Amati proses persentase unggahan hingga selesai.",
      "Simpan materi, lalu klik tombol 'Edit' pada materi tersebut.",
      "Periksa tampilan area berkas di modal edit: kartu berkas lama tampil dengan nama berkas, badge hijau 'Berhasil diunggah', dan tombol 'Ganti berkas'.",
      "Periksa kerapian jarak modal: padding atas dan bawah simetris tanpa ruang kosong berlebih."
    ],
    expected: "Selector tipe materi berada di atas judul, unggah file besar lolos tanpa error 413 Nginx, dan modal edit menampilkan info berkas yang sudah tersimpan."
  },
  {
    id: "TC-IN-03",
    tutorialId: "D3",
    title: "Mengatur Video Pembelajaran (YouTube & MP4 Lokal) dengan Pelacakan Durasi",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Materi Pembelajaran",
    location: "Kelas -> Tab Pembelajaran -> + Materi (Video)",
    objective: "Memastikan integrasi tautan video YouTube atau berkas MP4 lokal dengan deteksi otomatis durasi dan ambang tonton.",
    preconditions: "Dosen memiliki URL video YouTube valid atau berkas MP4 lokal.",
    testData: "URL YouTube valid (https://www.youtube.com/watch?v=...) atau berkas video MP4.",
    steps: [
      "Pilih tipe materi 'Video Pembelajaran'.",
      "Masukkan tautan video YouTube: sistem otomatis memvalidasi format URL dan membaca durasi.",
      "Atau unggah file MP4: browser membaca metadata durasi video secara lokal.",
      "Tentukan 'Ambang Batas Tonton' (misal: 85%).",
      "Simpan dan terbitkan materi video."
    ],
    expected: "Durasi video berhasil terdeteksi. Tombol simpan aktif setelah metadata durasi terbaca. Mahasiswa wajib menonton sesuai ambang batas agar progres belajar terekam."
  },
  {
    id: "TC-IN-04",
    tutorialId: "D4",
    title: "Menyusun Artikel Teks Kaya (Block Editor, Impor Artikel, dan Lampiran Berkas)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Materi Pembelajaran",
    location: "Kelas -> Tab Pembelajaran -> + Materi (Teks)",
    objective: "Memverifikasi fitur penyusunan modul teks interaktif, impor teks terstruktur, dan penambahan lampiran berkas bebas galat.",
    preconditions: "Form materi teks aktif.",
    testData: "Blok paragraf, heading, gambar, kode program, rumus LaTeX, checklist, tabel, dan lampiran berkas.",
    steps: [
      "Pilih tipe materi 'Materi Teks (Rich Text)'.",
      "Gunakan tombol beralih mode: 'Tulis', 'Pratinjau', dan 'Berdampingan'.",
      "Tambahkan berbagai blok konten: Heading H1/H2, Callout Catatan/Peringatan, Rumus LaTeX, dan Cuplikan Kode.",
      "Gunakan fitur 'Alat Artikel' -> Tambah Lampiran Berkas: unggah file arsip/dokumen pendukung.",
      "Uji fitur 'Impor Artikel': tempelkan teks format Markdown/outline dan klik impor.",
      "Simpan materi."
    ],
    expected: "Seluruh blok teks terformat rapi. Lampiran berkas berhasil diunggah dengan XHR credentials valid tanpa muncul galat koneksi."
  },
  {
    id: "TC-IN-05",
    tutorialId: "D5",
    title: "Membuat Tugas Perkuliahan (Tenggat Waktu, Toleransi Terlambat, dan Format File)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Tugas Perkuliahan",
    location: "Kelas -> Tab Pembelajaran -> + Tugas",
    objective: "Memverifikasi konfigurasi tenggat tugas, batas cutoff, dan pembatasan ekstensi berkas pengumpulan.",
    preconditions: "Dosen berada di pertemuan kelas yang aktif.",
    testData: "Judul tugas, tenggat waktu, batas akhir pengumpulan (cutoff), format berkas diizinkan (PDF, ZIP, DOCX, TEXT, LINK).",
    steps: [
      "Klik tombol '+ Tugas' pada pertemuan.",
      "Isi judul tugas dan instruksi pengerjaan.",
      "Tentukan Batas Waktu Pengumpulan (Deadline) dan Batas Toleransi Akhir (Cutoff Date).",
      "Centang opsi 'Izinkan Keterlambatan' jika mahasiswa boleh mengumpulkan setelah deadline dengan status TERLAMBAT.",
      "Tentukan Batas Maksimal Percobaan (misal 3 kali).",
      "Pilih format yang diizinkan (misal centang PDF dan ZIP).",
      "Klik Terbitkan Tugas."
    ],
    expected: "Tugas perkuliahan berhasil dibuat dengan aturan tenggat waktu dan format berkas yang tersimpan rapi pada sistem."
  },
  {
    id: "TC-IN-06",
    tutorialId: "D6",
    title: "Memeriksa, Menilai Tugas, Mode Uji Coba Pengumpulan Dosen, dan Publikasi Nilai",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Tugas Perkuliahan",
    location: "Kelas -> Detail Tugas",
    objective: "Memverifikasi dosen dapat menguji coba pengumpulan tugas sendiri, menilai kiriman mahasiswa, dan mempublikasikan nilai.",
    preconditions: "Tugas telah dibuat dan terdapat mahasiswa yang mengumpulkan (atau dosen melakukan uji coba).",
    testData: "File simulasi dosen (Jawaban_Dosen.pdf), skor tugas 0-100, umpan balik kualitatif.",
    steps: [
      "Buka halaman detail tugas.",
      "Uji Mode Pratinjau Dosen: Perhatikan kartu 'Uji Coba Pengumpulan Tugas (Dosen Pengampu)'.",
      "Dosen mengunggah file uji coba dan menulis teks catatan, lalu klik 'Kirim Uji Coba Pengumpulan'.",
      "Pastikan proses unggah dan submit dosen berhasil tanpa terhambat error 403 STUDENT_REQUIRED.",
      "Pada tabel daftar pengumpulan mahasiswa: klik tombol 'Beri Nilai' pada salah satu kiriman.",
      "Masukkan nilai angka (misal 90) dan catatan umpan balik, lalu simpan.",
      "Uji publikasi nilai perorangan dan tombol 'Publikasikan Semua Nilai'."
    ],
    expected: "Dosen dapat melakukan simulasi pengumpulan berkas tugas. Nilai mahasiswa tersimpan dan status berubah menjadi Diterbitkan (Published)."
  },
  {
    id: "TC-IN-07",
    tutorialId: "D7",
    title: "Membuat Kuis Perkuliahan (Pengaturan Batas Waktu, Acak Soal, dan Opsi Review)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Kuis Perkuliahan",
    location: "Kelas -> Tab Pembelajaran -> + Kuis",
    objective: "Memverifikasi pembuatan instrumen evaluasi kuis dengan konfigurasi pengacakan dan timer pengerjaan.",
    preconditions: "Pertemuan aktif.",
    testData: "Durasi pengerjaan (misal 60 menit), batas percobaan, opsi acak soal, acak pilihan jawaban.",
    steps: [
      "Klik tombol '+ Kuis' pada pertemuan.",
      "Isi judul kuis dan instruksi.",
      "Atur Durasi Pengerjaan dalam menit.",
      "Aktifkan opsi 'Acak Urutan Soal' dan 'Acak Urutan Opsi Pilihan'.",
      "Tentukan Opsi Review: apakah mahasiswa dapat melihat hasil dan pembahasan setelah kuis ditutup.",
      "Klik Simpan Kuis."
    ],
    expected: "Kuis terbentuk dengan aturan waktu dan pengacakan yang siap diisi butir-butir pertanyaan."
  },
  {
    id: "TC-IN-08",
    tutorialId: "D8",
    title: "Menyusun Butir Soal Objektif & Tampilan Kunci Jawaban Non-Teknis (Human-Friendly)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Bank Soal & Kuis",
    location: "Kelas -> Detail Kuis -> Tambah Soal",
    objective: "Memverifikasi input soal objektif dan tampilan kunci jawaban yang ramah pengguna non-teknis (tanpa JSON mentah).",
    preconditions: "Halaman editor butir soal kuis terbuka.",
    testData: "Soal Pilihan Tunggal (Single Choice), Pilihan Ganda Kompleks (Multi Choice), dan Benar/Salah (Boolean).",
    steps: [
      "Buat soal Pilihan Tunggal: masukkan pertanyaan, opsi A s/d D, dan tandai kunci jawaban yang benar.",
      "Buat soal Pilihan Ganda Kompleks: tandai lebih dari satu opsi jawaban benar.",
      "Simpan butir-butir soal.",
      "Buka tab ringkasan butir soal kuis atau bank soal.",
      "Periksa tampilan kolom 'Kunci Jawaban' pada setiap butir soal."
    ],
    expected: "Kunci jawaban ditampilkan dengan badge teks opsi yang manusiawi (misal: '✓ Opsi A: Hypertext Transfer Protocol'), BUKAN berupa format JSON mentah seperti {'correct': ['a']}."
  },
  {
    id: "TC-IN-09",
    tutorialId: "D9",
    title: "Menyusun Soal Uraian (Esai), Rubrik Penilaian, dan Lampiran Soal",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Bank Soal & Kuis",
    location: "Kelas -> Detail Kuis -> Tambah Soal (Esai)",
    objective: "Memverifikasi pembuatan soal esai dengan rubrik kriteria penilaian dan file lampiran soal.",
    preconditions: "Editor soal kuis aktif.",
    testData: "Pertanyaan studi kasus esai, bobot nilai soal, pedoman penskoran (rubrik).",
    steps: [
      "Pilih tipe butir soal 'Uraian / Esai'.",
      "Masukkan instruksi studi kasus dan bobot maksimal skor (misal 20 poin).",
      "Tuliskan pedoman rubrik penilaian bagi dosen pengoreksi.",
      "Unggah berkas diagram pendukung soal jika diperlukan.",
      "Klik Simpan Butir Soal."
    ],
    expected: "Soal esai berhasil ditambahkan ke instrumen kuis lengkap dengan rubrik penskoran yang tersimpan rapi."
  },
  {
    id: "TC-IN-10",
    tutorialId: "D10",
    title: "Koreksi Jawaban Kuis, Rekalkulasi Nilai, dan Manajemen Bank Soal",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Penilaian Kuis",
    location: "Kelas -> Detail Kuis -> Riwayat Pengerjaan & Tab Bank Soal",
    objective: "Memverifikasi koreksi manual soal esai oleh dosen, perhitungan ulang nilai, dan ekspor/impor ke bank soal.",
    preconditions: "Mahasiswa telah mengumpulkan kuis yang memuat butir esai.",
    testData: "Skor koreksi esai, feedback butir esai.",
    steps: [
      "Buka tab pengerjaan mahasiswa pada kuis.",
      "Klik 'Koreksi Jawaban' pada mahasiswa yang memiliki jawaban esai.",
      "Beri skor esai dan umpan balik per nomor, lalu klik Simpan Koreksi.",
      "Periksa apakah nilai total kuis mahasiswa langsung diperbarui secara otomatis.",
      "Buka tab 'Bank Soal Kelas': simpan butir soal pilihan ke dalam bank soal untuk dipakai kembali pada semester depan."
    ],
    expected: "Skor esai terkoreksi, nilai akhir kuis terhitung proporsional, dan butir soal tersimpan aman di Bank Soal."
  },
  {
    id: "TC-IN-11",
    tutorialId: "D11",
    title: "Membuka Sesi Presensi Perkuliahan (Konsistensi Layout, Kode Proyektor & Sesi Bebas Kode)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Presensi Perkuliahan",
    location: "Kelas -> Tab Presensi",
    objective: "Memverifikasi pembukaan sesi presensi dengan layout konsisten standar platform, baik dengan kode acak maupun 1-klik.",
    preconditions: "Dosen mengampu kelas aktif.",
    testData: "Pertemuan ke-X, batas durasi sesi (misal 90 menit), opsi verifikasi kode.",
    steps: [
      "Buka tab Presensi: amati lebar container halaman (memenuhi lebar penuh standar, tidak mengecil ke 1040px) dengan header .section-heading dan .toolbar.",
      "Klik tombol 'Buat Sesi Presensi'.",
      "Pilih pertemuan terkait.",
      "Skenario Kode: Centang 'Gunakan Kode Verifikasi' -> sistem memunculkan kode 6 karakter acak besar untuk proyektor.",
      "Skenario Bebas Kode: Hilangkan centang kode -> mahasiswa cukup klik konfirmasi hadir 1-klik.",
      "Klik Buka Sesi Presensi."
    ],
    expected: "Layout presensi selaras dengan tab lain. Sesi terbuka dengan countdown aktif dan mahasiswa dapat langsung melakukan presensi."
  },
  {
    id: "TC-IN-12",
    tutorialId: "D12",
    title: "Mengubah Jadwal, Menutup Manual, dan Memperpanjang Waktu Sesi Presensi",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Presensi Perkuliahan",
    location: "Kelas -> Tab Presensi -> Sesi Aktif",
    objective: "Memverifikasi fleksibilitas dosen dalam mengelola durasi sesi perkuliahan tatap muka.",
    preconditions: "Terdapat sesi presensi yang sedang berlangsung atau terjadwal.",
    testData: "Perpanjangan waktu (+15 menit), penutupan darurat.",
    steps: [
      "Pada sesi presensi yang sedang aktif, klik tombol 'Perpanjang Waktu' (+15 atau +30 menit).",
      "Amati pembaruan timer hitung mundur.",
      "Setelah jam kuliah selesai, klik tombol 'Tutup Sesi Presensi Sekarang'.",
      "Buka sesi yang sudah ditutup untuk memastikan mahasiswa tidak dapat lagi mengisi presensi."
    ],
    expected: "Perpanjangan durasi berhasil diperbarui secara instan. Saat sesi ditutup, form presensi mahasiswa otomatis terkunci."
  },
  {
    id: "TC-IN-13",
    tutorialId: "D13",
    title: "Koreksi Kehadiran Manual Mahasiswa dan Ekspor Rekapitulasi Presensi Excel",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Presensi Perkuliahan",
    location: "Kelas -> Tab Presensi -> Rekap Kehadiran",
    objective: "Memastikan dosen dapat mengubah status kehadiran mahasiswa bersebab (Izin/Sakit) dan mengunduh rekap spreadsheet.",
    preconditions: "Sesi presensi telah memiliki rekaman mahasiswa.",
    testData: "Perubahan status ke SAKIT (SICK) / IZIN (EXCUSED), unduhan berkas Excel.",
    steps: [
      "Buka tab 'Rekap Kehadiran' pada modul Presensi.",
      "Cari nama mahasiswa yang izin atau sakit.",
      "Ubah status pertemuannya dari ALFA menjadi IZIN atau SAKIT, lalu simpan catatan bukti izin.",
      "Perhatikan persentase kehadiran mahasiswa yang terhitung ulang.",
      "Klik tombol 'Ekspor Rekapitulasi (Excel)'."
    ],
    expected: "Status kehadiran berhasil dikoreksi secara manual dan berkas rekap presensi (.xlsx) berhasil diunduh dengan struktur kolom lengkap."
  },
  {
    id: "TC-IN-14",
    tutorialId: "D14",
    title: "Pembobotan Nilai Akhir: Template Awal 30-35-35, Pilihan Preset, dan Tombol Auto-Assign",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Buku Nilai (Gradebook)",
    location: "Kelas -> Tab Buku Nilai -> Pengaturan Nilai",
    objective: "Memverifikasi konfigurasi template awal (30% Tugas auto-assign, 35% UTS, 35% UAS), pemilihan preset, dan tombol auto-assign instan.",
    preconditions: "Dosen membuka Buku Nilai kelas perkuliahan.",
    testData: "Preset Standar UAY, Tugas & Kuis Terpisah, Berbasis Proyek, Teori & Praktikum, Partisipatif, Presensi.",
    steps: [
      "Buka tab Buku Nilai -> klik 'Pengaturan Nilai' -> 'Bobot Kategori Penilaian'.",
      "Periksa konfigurasi default awal: Kategori Tugas berbobot 30% (auto-assign kuis & tugas aktif), UTS 35%, UAS 35% (Total 100%).",
      "Uji tombol Preset: Klik 'Tugas & Kuis Terpisah' (bobot berubah otomatis: 20% Tugas, 10% Kuis, 35% UTS, 35% UAS).",
      "Klik tombol 'Standar UAY' untuk mengembalikan ke template awal 30-35-35.",
      "Klik tombol 'Jalankan Auto-Assign Sekarang' untuk mengalokasikan semua kuis dan tugas yang belum berkategori.",
      "Klik tombol 'Simpan Bobot'."
    ],
    expected: "Template awal 30-35-35 diterapkan, preset berpindah dengan validasi total tepat 100%, dan seluruh aktivitas tugas & kuis ter-assign secara otomatis."
  },
  {
    id: "TC-IN-15",
    tutorialId: "D15",
    title: "Meninjau, Menghitung, Override Nilai, Penguncian, dan Publikasi Nilai Akhir",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Buku Nilai (Gradebook)",
    location: "Kelas -> Tab Buku Nilai",
    objective: "Memverifikasi kalkulasi otomatis nilai akhir mahasiswa, override nilai manual berdasar alasan, kunci gradebook, dan ekspor rekap.",
    preconditions: "Aktivitas tugas, kuis, UTS, dan UAS telah dinilai.",
    testData: "Nilai override manual mahasiswa, alasan perubahan, ekspor gradebook Excel.",
    steps: [
      "Buka tabel Buku Nilai: amati skor kategori, nilai akhir angka, dan konversi huruf mutu (A, B+, dll).",
      "Uji Override Nilai: Klik salah satu skor mahasiswa, ubah nilainya dan masukkan alasan perubahan.",
      "Klik 'Simpan Nilai'. Perhatikan kalkulasi nilai akhir yang langsung disesuaikan.",
      "Uji Penguncian: Centang opsi 'Kunci Buku Nilai' untuk memfinalisasi nilai akhir sebelum diserahkan ke BAAK.",
      "Klik tombol 'Publikasikan Nilai Akhir'.",
      "Klik tombol 'Ekspor Rekap Nilai (Excel)'."
    ],
    expected: "Kalkulasi nilai akhir akurat sesuai bobot 100%. Riwayat audit perubahan nilai tercatat. Berkas Excel rekap nilai berhasil diunduh."
  },
  {
    id: "TC-IN-16",
    tutorialId: "D16",
    title: "Manajemen Peserta Kelas, Pengumuman Kelas, Berkas, dan Duplikasi (Kloning Kelas)",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Administrasi Kelas",
    location: "Kelas -> Tab Peserta & Menu Aksi Kelas",
    objective: "Memverifikasi pengelolaan team teaching, penerbitan pengumuman internal kelas, dan duplikasi struktur kelas ke semester baru.",
    preconditions: "Dosen mengampu kelas aktif.",
    testData: "Penambahan dosen pengampu kedua, teks pengumuman kelas, kloning ke semester ganjil berikutnya.",
    steps: [
      "Buka tab Peserta: periksa daftar mahasiswa dan dosen pengampu.",
      "Terbitkan pengumuman internal kelas pada tab Pembelajaran.",
      "Klik menu aksi kelas (ikon titik tiga) -> pilih 'Duplikasi Kelas (Clone)'.",
      "Pilih komponen yang ingin diduplikasi (Pertemuan, Materi, Tugas, Kuis, Bobot Nilai) dan tentukan semester baru.",
      "Klik tombol 'Mulai Kloning Kelas'."
    ],
    expected: "Struktur kelas berhasil diduplikasi ke semester baru tanpa menyertakan riwayat pengerjaan mahasiswa semester lama."
  },
  {
    id: "TC-AS-01",
    tutorialId: "D16-AS",
    title: "Penugasan Mahasiswa / Akun Khusus sebagai Asisten Dosen di Kelas Praktikum",
    role: "INSTRUCTOR",
    roleLabel: "DOSEN PENGAMPU",
    module: "Manajemen Pengajar & Asdos",
    location: "Kelas -> Tab Peserta -> Tombol Tambah Asisten Dosen (Asdos)",
    objective: "Memverifikasi Dosen Pengampu dapat menugaskan mahasiswa berprestasi atau akun asisten sebagai Asdos dengan badge indigo pembeda dan hak kelola kelas.",
    preconditions: "Login sebagai Dosen Pengampu Utama di kelas praktikum.",
    testData: "Mahasiswa target (misal: Aditya Pratama / 202401001 atau akun asdos01).",
    steps: [
      "Buka kelas praktikum (misal: Praktikum Pemrograman Web - Kelas A).",
      "Pilih tab Peserta pada navigasi kelas.",
      "Perhatikan dua tombol penugasan di toolbar: 'Tambah Dosen Kolaborator' dan 'Tambah Asisten Dosen (Asdos)'.",
      "Klik tombol 'Tambah Asisten Dosen (Asdos)'.",
      "Ketik nama atau NIM mahasiswa / asisten pada modal autocomplete.",
      "Pilih akun asisten lalu klik 'Tugaskan Sebagai Asdos'.",
      "Periksa daftar pengajar di tabel bagian atas tab Peserta."
    ],
    expected: "Akun asisten berhasil ditambahkan ke daftar pengajar dengan badge 'Asisten Dosen / Lab' (warna indigo) yang membedakannya dari 'Pengampu Utama' dan 'Dosen Kolaborator'. Mahasiswa tetap terdaftar di akun SSO-nya tanpa kehilangan hak mahasiswa di kelas lain."
  },
  {
    id: "TC-AS-02",
    tutorialId: "AS-01",
    title: "Akses Fitur Dosen, Kelola Sesi Praktikum, dan Penilaian Laporan oleh Asdos",
    role: "ASSISTANT",
    roleLabel: "ASISTEN DOSEN",
    module: "Ruang Kelas & Penilaian Praktikum",
    location: "Kelas Praktikum -> Tab Materi, Presensi & Penilaian",
    objective: "Memastikan mahasiswa yang ditugaskan sebagai Asdos memperoleh hak akses pengajar penuh pada kelas praktikum yang ditugaskan (tambah materi, buka presensi, nilai tugas).",
    preconditions: "Akun telah ditugaskan sebagai Asisten Dosen pada kelas praktikum.",
    testData: "Kelas praktikum yang diampu, sesi modul praktikum, tugas laporan lab mahasiswa.",
    steps: [
      "Login menggunakan akun asisten dosen (atau mahasiswa yang telah diangkat sebagai asdos).",
      "Buka menu Kelas Saya: periksa indikator chip pengajar pada kartu kelas menampilkan '(Asdos)'.",
      "Buka kelas praktikum: pastikan tombol 'Tambah Section' dan 'Tambah Materi' aktif dan dapat digunakan.",
      "Buka tab Presensi: klik 'Buka Sesi Presensi Praktikum', masukkan jadwal atau kode sesi lab.",
      "Buka tab Tugas / Asesmen: buka penugasan laporan praktikum mahasiswa, lalu klik 'Nilai Submisi'.",
      "Beri skor nilai laporan, ketik catatan evaluasi (feedback), lalu simpan nilai.",
      "Buka kelas lain di mana akun ini hanya sebagai mahasiswa biasa: pastikan hak pengajar tidak bocor ke kelas lain."
    ],
    expected: "Asisten dosen dapat menambah section pertemuan praktikum, membuka presensi sesi lab, dan menilai lembar laporan praktikum mahasiswa. Isolasi izin (row-level authorization) berjalan sempurna sehingga di kelas lain akun ini tetap berfungsi murni sebagai mahasiswa biasa."
  },

  // --- ADMIN PROGRAM STUDI (A1 - A5) ---
  {
    id: "TC-DA-01",
    tutorialId: "A1",
    title: "Memeriksa Cakupan Program Studi dan Kurikulum Aktif",
    role: "DEPARTMENT_ADMIN",
    roleLabel: "ADMIN PRODI",
    module: "Tata Kelola Prodi",
    location: "Menu Program Studi",
    objective: "Memverifikasi Admin Prodi hanya dapat melihat dan mengelola data dalam naungan program studinya sendiri.",
    preconditions: "Login sebagai Admin Prodi Informatika (admin.if).",
    testData: "Program Studi Informatika (Fakultas Sains dan Teknologi).",
    steps: [
      "Buka menu Program Studi di navigasi utama.",
      "Periksa kode prodi, nama departemen, dan kurikulum aktif yang ditampilkan.",
      "Pastikan data program studi lain terisolasi dan tidak dapat dimanipulasi."
    ],
    expected: "Hanya data Program Studi Informatika yang dapat diakses; batasan wewenang RBAC departemen terisolasi sempurna."
  },
  {
    id: "TC-DA-02",
    tutorialId: "A2",
    title: "Menambahkan Mata Kuliah dan Rombel Kelas (Auto-Generated Key 6 Huruf Kapital)",
    role: "DEPARTMENT_ADMIN",
    roleLabel: "ADMIN PRODI",
    module: "Manajemen Kelas Prodi",
    location: "Menu Mata Kuliah & Tambah Kelas",
    objective: "Memverifikasi penambahan kelas baru secara otomatis menghasilkan Kunci Pendaftaran 6 huruf kapital dengan tombol acak ulang.",
    preconditions: "Admin Prodi berada di menu Manajemen Kelas.",
    testData: "Mata Kuliah IF202, Nama Kelas 'Kelas A', Tahun Akademik 2026/2027 Ganjil.",
    steps: [
      "Buka menu Manajemen Kelas -> klik 'Tambah Kelas'.",
      "Pilih Mata Kuliah, isi Nama Kelas dan Tahun Akademik.",
      "Periksa kolom 'Kunci Pendaftaran': nilai default otomatis terisi 6 huruf kapital (A-Z).",
      "Klik tombol 'Acak Ulang' di samping input kunci: periksa apakah kode berubah menjadi 6 huruf baru.",
      "Pilih Dosen Pengampu kelas.",
      "Klik tombol Simpan."
    ],
    expected: "Kelas berhasil dibentuk lengkap dengan kunci pendaftaran 6 karakter huruf kapital acak yang siap dibagikan ke mahasiswa."
  },
  {
    id: "TC-DA-03",
    tutorialId: "A3",
    title: "Mendaftarkan dan Mengaktifkan Peserta Mahasiswa Secara Manual",
    role: "DEPARTMENT_ADMIN",
    roleLabel: "ADMIN PRODI",
    module: "Peserta Kelas",
    location: "Detail Kelas -> Tab Peserta",
    objective: "Memastikan Admin Prodi dapat melakukan plotting mahasiswa manual atau mengaktifkan kembali peserta yang berstatus cuti/nonaktif.",
    preconditions: "Kelas berstatus PUBLISHED.",
    testData: "NIM Mahasiswa yang terdaftar di program studi.",
    steps: [
      "Buka detail kelas -> tab Peserta.",
      "Gunakan kolom pencarian mahasiswa berdasarkan NIM atau Nama.",
      "Pilih mahasiswa lalu klik 'Tambahkan ke Kelas'.",
      "Uji aktivasi peserta: ubah status peserta dari Nonaktif menjadi Aktif."
    ],
    expected: "Mahasiswa berhasil didaftarkan ke kelas secara administratif dan dapat langsung mengakses pembelajaran di beranda akunnya."
  },
  {
    id: "TC-DA-04",
    tutorialId: "A4",
    title: "Impor Massal Peserta, Nilai, atau Bank Soal Melalui Berkas Spreadsheet (Excel)",
    role: "DEPARTMENT_ADMIN",
    roleLabel: "ADMIN PRODI",
    module: "Impor Data Massal",
    location: "Menu Impor Data / Tab Buku Nilai -> Impor",
    objective: "Memverifikasi fungsionalitas impor data spreadsheet dengan tahap pra-tinjau (preview) sebelum komit data ke database.",
    preconditions: "File spreadsheet Excel (.xlsx) sesuai template yang disediakan sistem.",
    testData: "Template berkas Excel peserta kelas atau nilai mahasiswa.",
    steps: [
      "Buka modal Impor Data pada kelas.",
      "Unduh template resmi spreadsheet yang disediakan sistem.",
      "Isi baris data sesuai kolom contoh.",
      "Unggah berkas Excel yang telah diisi.",
      "Periksa tahap Pra-tinjau (Review): sistem memvalidasi baris yang valid dan baris yang berpotensi galat.",
      "Klik tombol 'Komit / Simpan Data'."
    ],
    expected: "Sistem memvalidasi kecocokan data. Data berhasil diimpor secara massal tanpa kegagalan transaksi database."
  },
  {
    id: "TC-DA-05",
    tutorialId: "A5",
    title: "Memantau Kelas, Arsip Kelas, dan Audit Jejak Aktivitas Program Studi",
    role: "DEPARTMENT_ADMIN",
    roleLabel: "ADMIN PRODI",
    module: "Audit & Pemantauan",
    location: "Menu Jejak Aktivitas Prodi & Arsip Kelas",
    objective: "Memverifikasi pengarsipan kelas semester lalu dan pemantauan log aktivitas dosen di lingkup prodi.",
    preconditions: "Semester perkuliahan telah selesai.",
    testData: "Kelas perkuliahan yang akan diarsipkan.",
    steps: [
      "Buka kelas yang telah selesai periode perkuliahannya.",
      "Ubah status kelas menjadi ARCHIVED dengan konfirmasi tindakan.",
      "Buka menu 'Jejak Aktivitas Program Studi'.",
      "Periksa log pencatatan perubahan status, nilai, dan modul pembelajaran prodi.",
      "Periksa tata letak pagination di bawah tabel log prodi."
    ],
    expected: "Kelas berhasil diarsipkan (bersifat read-only bagi dosen & mahasiswa). Log aktivitas prodi tersaji rapi dengan komponen pagination ber-margin nyaman."
  },

  // --- SUPER ADMINISTRATOR (S1 - S3) ---
  {
    id: "TC-SA-01",
    tutorialId: "S1",
    title: "Meninjau Administrasi Seluruh Program Studi & Tata Kelola Pengguna Universitas",
    role: "SUPER_ADMIN",
    roleLabel: "SUPER ADMIN",
    module: "Tata Kelola Universitas",
    location: "Menu Program Studi & Pengguna",
    objective: "Memverifikasi Super Admin memiliki akses penuh atas semua fakultas, prodi, dan akun civitas akademika.",
    preconditions: "Login sebagai Super Admin (admin).",
    testData: "Data prodi seluruh fakultas (FST, FEB, FAI, dll).",
    steps: [
      "Buka menu Program Studi: amati daftar seluruh fakultas dan program studi di lingkungan UAY.",
      "Buka menu Pengguna: cari akun dosen atau mahasiswa, periksa detail peran dan status akun.",
      "Uji pembuatan akun baru atau reset kredensial darurat jika diperlukan."
    ],
    expected: "Super Admin dapat mengelola entitas seluruh universitas tanpa batasan isolasi fakultas."
  },
  {
    id: "TC-SA-02",
    tutorialId: "S2",
    title: "Mengatur Tahun Akademik, Semester Aktif, dan Pengumuman Darurat Banner",
    role: "SUPER_ADMIN",
    roleLabel: "SUPER ADMIN",
    module: "Pengaturan Sistem & Pengumuman",
    location: "Menu Pengaturan Sistem & Pengumuman",
    objective: "Memverifikasi penetapan semester aktif universitas dan penerbitan banner pengumuman darurat global.",
    preconditions: "Super Admin login.",
    testData: "Tahun Akademik '2026/2027 Ganjil', Banner Pengumuman Darurat Kampus.",
    steps: [
      "Buka menu Pengaturan Sistem: ubah atau tetapkan Tahun Akademik aktif (2026/2027 Ganjil).",
      "Buka menu Pengumuman Sistem -> klik 'Buat Pengumuman Baru'.",
      "Pilih mode penulisan (Tulis / Pratinjau / Berdampingan).",
      "Pilih tingkat urgensi: 'Darurat / Penting'.",
      "Klik Terbitkan Pengumuman."
    ],
    expected: "Tahun akademik aktif diterapkan sebagai nilai bawaan kelas baru. Banner pengumuman darurat tampil di seluruh antarmuka pengguna kampus."
  },
  {
    id: "TC-SA-03",
    tutorialId: "S3",
    title: "Menetapkan Kebijakan Skala Huruf Mutu, Tombol Kanan Modal, dan Ambang Hadir 75%",
    role: "SUPER_ADMIN",
    roleLabel: "SUPER ADMIN",
    module: "Kebijakan Akademik Universitas",
    location: "Menu Skala Nilai Universitas",
    objective: "Memverifikasi Super Admin dapat mengedit batas nilai huruf mutu dengan tombol kanan modal yang rapi dan menetapkan ambang hadir.",
    preconditions: "Super Admin membuka modul Skala Nilai.",
    testData: "Skala Nilai versi 2026.1 (A = 85, A- = 80, B+ = 75, dst), ambang hadir 75%.",
    steps: [
      "Buka menu Skala Nilai Universitas.",
      "Klik tombol 'Tambah / Edit Skala Nilai'.",
      "Perhatikan posisi tombol footer modal: tombol Batal dan Simpan berada rapi di sisi kanan modal (justify-content: flex-end).",
      "Ubah batas bawah skor untuk huruf mutu dan bobot indeks prestasi (4.00, 3.75, dst).",
      "Klik tombol Simpan Skala Nilai.",
      "Buka kelas perkuliahan untuk memastikan versi skala nilai baru otomatis tersedia."
    ],
    expected: "Skala nilai berhasil diperbarui, tombol modal tersusun rapi di sebelah kanan, dan formula konversi nilai langsung berlaku seragam di seluruh universitas."
  },

  // --- REKTORAT & PIMPINAN (R1 - R5) ---
  {
    id: "TC-RC-01",
    tutorialId: "R1",
    title: "Membuka Dashboard Pemantauan Akademik Eksekutif (Mode Read-Only)",
    role: "RECTOR",
    roleLabel: "REKTORAT",
    module: "Dashboard Eksekutif",
    location: "Menu Dashboard Rektorat",
    objective: "Memverifikasi pimpinan universitas mendapatkan visibilitas operasional perkuliahan secara read-only tanpa hak manipulasi.",
    preconditions: "Login sebagai Rektor (rektor).",
    testData: "Ringkasan metrik universitas live.",
    steps: [
      "Login menggunakan akun rektorat.",
      "Periksa tampilan Dashboard Eksekutif: kartu total mahasiswa aktif, dosen mengajar, kelas berjalan, rata-rata kehadiran, dan status nilai.",
      "Buka halaman detail salah satu kelas.",
      "Periksa seluruh tombol aksi pada kelas."
    ],
    expected: "Semua data mencerminkan kondisi riil database kampus (bukan data tiruan) dan antarmuka bersifat murni Read-Only (tombol ubah/hapus tidak tersedia)."
  },
  {
    id: "TC-RC-02",
    tutorialId: "R2",
    title: "Memilih Periode Semester dan Membaca Ringkasan Indikator KPI",
    role: "RECTOR",
    roleLabel: "REKTORAT",
    module: "Analitik Eksekutif",
    location: "Dashboard Rektorat -> Filter Periode",
    objective: "Memverifikasi pemilihan semester perkuliahan dan pemutakhiran metrik KPI secara instan.",
    preconditions: "Tersedia data perkuliahan pada semester aktif.",
    testData: "Filter semester 2026/2027 Ganjil.",
    steps: [
      "Pilih filter semester pada bagian atas dashboard pimpinan.",
      "Amati grafik rasio ketercapaian materi perkuliahan.",
      "Amati grafik kepatuhan kehadiran dosen mengajar dan mahasiswa."
    ],
    expected: "Data KPI universitas diperbarui secara instan sesuai periode akademik yang dipilih."
  },
  {
    id: "TC-RC-03",
    tutorialId: "R3",
    title: "Menelusuri Distribusi Keaktifan Dosen dan Kelas per Fakultas/Prodi",
    role: "RECTOR",
    roleLabel: "REKTORAT",
    module: "Analitik Dosen & Kelas",
    location: "Dashboard Rektorat -> Tab Keaktifan Dosen",
    objective: "Memastikan rektorat dapat mendeteksi prodi atau mata kuliah yang mengalami ketertinggalan pertemuan tatap muka.",
    preconditions: "Dashboard rektorat aktif.",
    testData: "Filter Fakultas Sains dan Teknologi -> Program Studi Informatika.",
    steps: [
      "Buka tab 'Keaktifan Dosen & Kelas'.",
      "Pilih fakultas dan prodi yang ingin ditinjau.",
      "Periksa tabel distribusi pertemuan dosen: jumlah sesi yang sudah terlaksana vs target 16 pertemuan.",
      "Cari kelas yang tingkat keterlaksanaannya masih di bawah standar universitas."
    ],
    expected: "Pimpinan universitas memperoleh peta keaktifan perkuliahan yang komprehensif untuk bahan koordinasi dengan dekan dan kaprodi."
  },
  {
    id: "TC-RC-04",
    tutorialId: "R4",
    title: "Membaca Riwayat Kegiatan (Waterfall Activity) dan Grafik Rentang Sesi Masuk",
    role: "RECTOR",
    roleLabel: "REKTORAT",
    module: "Analitik Trafik Pengguna",
    location: "Dashboard Rektorat -> Tab Aktivitas Sesi",
    objective: "Memverifikasi visualisasi rentang waktu login pengguna per jam dan distribusi beban server harian.",
    preconditions: "Terdapat aktivitas login dan penggunaan sistem pada rentang 24 jam terakhir.",
    testData: "Grafik sesi masuk per jam dengan zona waktu Asia/Jakarta (WIB).",
    steps: [
      "Buka tab 'Aktivitas Sesi Pengguna'.",
      "Periksa diagram air terjun (waterfall timeline) sesi aktif civitas akademika.",
      "Amati grafik jam sibuk penggunaan e-learning (puncak akses pagi dan sore hari).",
      "Pastikan stempel waktu konsisten dengan zona waktu lokal perangkat pengguna."
    ],
    expected: "Grafik aktivitas login tersaji jernih tanpa distorsi midnight atau kelanjutan sesi fiktif."
  },
  {
    id: "TC-RC-05",
    tutorialId: "R5",
    title: "Mengunduh Laporan Rekapitulasi Eksekutif Excel dan Pemantauan Kendala",
    role: "RECTOR",
    roleLabel: "REKTORAT",
    module: "Pelaporan Pimpinan",
    location: "Dashboard Rektorat -> Ekspor Laporan",
    objective: "Memverifikasi pengunduhan rekapitulasi data pimpinan ke dalam format spreadsheet resmi untuk bahan rapat senat universitas.",
    preconditions: "Akun rektorat aktif.",
    testData: "Unduhan rekap eksekutif semester aktif.",
    steps: [
      "Klik tombol 'Ekspor Rekapitulasi Eksekutif (Excel)'.",
      "Buka file spreadsheet hasil unduhan.",
      "Periksa sheet Ringkasan Universitas, Rekap Keaktifan Dosen, dan Rekap Nilai Mahasiswa."
    ],
    expected: "Berkas Excel berhasil diunduh dengan struktur data lengkap, rapi, dan siap dipresentasikan di rapat pimpinan universitas."
  },

  // --- KUALITAS UI/UX & SISTEM GLOBAL (UX1 - UX4) ---
  {
    id: "TC-UX-01",
    tutorialId: "X1",
    title: "Verifikasi Indikator Bintang Merah (*) pada Kolom Formulir Wajib Diisi",
    role: "GLOBAL",
    roleLabel: "UI/UX STANDAR",
    module: "Komponen Form (Field.tsx)",
    location: "Seluruh Formulir Input Aplikasi",
    objective: "Memastikan hanya karakter tanda bintang (*) yang berwarna merah terang, sementara teks label tetap berwarna netral standar tema.",
    preconditions: "Buka formulir Tambah Kelas, Tambah Pertemuan, Tambah Materi, atau Tambah Tugas.",
    testData: "Kolom berlabel required (Nama Kelas, Judul Materi, Tanggal, dll).",
    steps: [
      "Buka modal formulir Tambah Kelas atau Tambah Materi.",
      "Perhatikan label input yang memiliki atribut required.",
      "Periksa elemen DOM teks label dan karakter bintang."
    ],
    expected: "Teks label (misal: 'Nama Kelas') berwarna teks gelap standar, sedangkan karakter '*' secara spesifik berwarna merah terang (#ef4444)."
  },
  {
    id: "TC-UX-02",
    tutorialId: "X2",
    title: "Verifikasi Notifikasi Galat Validasi via Floating Toast Kanan Atas (Anti-Clutter Modal)",
    role: "GLOBAL",
    roleLabel: "UI/UX STANDAR",
    module: "Komponen Modal & Toast (Form.tsx & api.ts)",
    location: "Modal Dialog Formulir",
    objective: "Memverifikasi kesalahan input muncul sebagai toast melayang di kanan atas, tidak ada boks merah inline yang merusak kerapian modal, dan tidak ada teks artifact 'Waktu tidak tersedia'.",
    preconditions: "Modal formulir terbuka.",
    testData: "Pengiriman form dengan mengosongkan kolom wajib.",
    steps: [
      "Buka modal Tambah Pertemuan atau Tambah Materi.",
      "Kosongkan kolom yang wajib diisi lalu tekan tombol Simpan.",
      "Amati kemunculan pesan peringatan pada layar."
    ],
    expected: "Notifikasi galat muncul sebagai floating toast melayang di sudut kanan atas layar. Tidak ada kotak merah inline yang merusak tata letak modal dan tidak ada tulisan aneh 'Waktu tidak tersedia'."
  },
  {
    id: "TC-UX-03",
    tutorialId: "X3",
    title: "Kerapian Margin dan Padding Komponen Pagination di Seluruh Tabel Data",
    role: "GLOBAL",
    roleLabel: "UI/UX STANDAR",
    module: "Komponen Pagination (Table Wrapping)",
    location: "Tabel Jejak Aktivitas, Buku Nilai, dan Peserta Kelas",
    objective: "Memastikan pagination tabel data memiliki margin dan padding keliling yang proporsional, border lembut, dan tidak mentok ke sudut bawah container.",
    preconditions: "Tabel data memiliki baris data lebih dari kapasitas per halaman (>25 baris).",
    testData: "Navigasi pagination halaman 1, 2, dst.",
    steps: [
      "Buka tabel Jejak Aktivitas atau tabel Buku Nilai.",
      "Scroll ke bagian bawah tabel hingga ke kontrol nomor halaman pagination.",
      "Periksa jarak margin-bottom dan jarak batas pinggir kartu container."
    ],
    expected: "Komponen pagination memiliki margin keliling yang proporsional, border halus, tidak menempel kaku ke sudut bawah kartu, dan mudah diklik."
  },
  {
    id: "TC-UX-04",
    tutorialId: "X4",
    title: "Dukungan Unggah Berkas hingga 100MB di Nginx dan 50MB di Express Body Parser",
    role: "GLOBAL",
    roleLabel: "SISTEM SERVER",
    module: "Infrastruktur Nginx & Express",
    location: "File Service & Upload Endpoint",
    objective: "Memverifikasi berkas materi PDF atau penugasan ukuran 1.2MB s/d 50MB dapat diunggah sukses tanpa penolakan HTTP 413 Payload Too Large.",
    preconditions: "Server Nginx dan API Express aktif.",
    testData: "Berkas PDF / ZIP berukuran 2MB, 5MB, hingga 25MB.",
    steps: [
      "Buka modul unggah materi atau pengumpulan tugas.",
      "Pilih berkas dokumen berukuran 5MB s/d 20MB.",
      "Jalankan proses unggah dan amati respon jaringan di browser developer tools."
    ],
    expected: "Unggahan berhasil 100% dengan status HTTP 200/201. Konfigurasi Nginx client_max_body_size 100m dan Express json limit 50mb memproses data tanpa galat 413."
  },
  {
    id: "TC-UX-05",
    tutorialId: "D1-UX",
    title: "Penyaringan Tipe Pertemuan dengan Tab Badge Dinamis (Semua, Perkuliahan, Praktikum)",
    role: "GLOBAL",
    roleLabel: "DOSEN & MAHASISWA",
    module: "Navigasi Kelas & Section",
    location: "Halaman Kelas -> Tab Materi & Aktivitas",
    objective: "Memverifikasi fitur tab filter badge pertemuan (Semua, Perkuliahan, Praktikum, Seminar, Lokakarya, Ujian, Lainnya) dengan indikator counter jumlah pertemuan.",
    preconditions: "Kelas memiliki beberapa section dengan jenis yang berbeda (misal 10 Perkuliahan dan 4 Praktikum).",
    testData: "Pertemuan jenis Perkuliahan dan Praktikum.",
    steps: [
      "Buka halaman detail kelas pada tab Materi & Aktivitas.",
      "Amati bilah Tab Filter Badge di bawah judul Pertemuan Kelas: tab 'Semua', 'Perkuliahan', 'Praktikum', dan jenis lainnya yang ada pada kelas.",
      "Perhatikan angka counter badge pada setiap tab (misal: 'Semua (14)', 'Perkuliahan (10)', 'Praktikum (4)').",
      "Klik tab 'Praktikum': periksa daftar pertemuan yang tampil hanya pertemuan bertipe Praktikum.",
      "Periksa nomor urut pertemuan (misal: '04', '08') tetap mempertahankan urutan silabus aslinya.",
      "Klik tombol panah atas/bawah untuk memindahkan urutan pertemuan saat filter aktif: periksa posisi urutan tetap tertata benar.",
      "Klik tab yang tidak memiliki pertemuan: periksa tampilan state kosong informatif beserta tombol 'Tampilkan Semua Pertemuan'.",
      "Klik tab 'Semua': seluruh pertemuan kembali ditampilkan secara utuh."
    ],
    expected: "Daftar pertemuan tersaring secara instan tanpa reload halaman, counter badge menampilkan jumlah yang akurat, nomor silabus tidak kacau, dan pengaturan urutan tetap berfungsi konsisten."
  }
];

console.log(`Total Test Cases to generate: ${testCases.length}`);

// Generate HTML Content
const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Buku Panduan Lengkap Test Case Pengujian E-Learning UAY</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 14mm 18mm 14mm;
      @bottom-right {
        content: counter(page);
      }
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      line-height: 1.45;
      font-size: 9pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* Cover / Header Banner */
    .header-banner {
      border-left: 6px solid #0284c7;
      background: #f0f9ff;
      padding: 16px 20px;
      border-radius: 0 10px 10px 0;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      font-size: 16pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }

    .header-subtitle {
      font-size: 10.5pt;
      color: #0369a1;
      font-weight: 700;
      margin: 0 0 4px 0;
    }

    .header-meta {
      font-size: 8pt;
      color: #64748b;
    }

    .badge-status {
      display: inline-block;
      padding: 4px 10px;
      background: #0284c7;
      color: #ffffff;
      font-size: 8pt;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    h1, h2, h3, h4 {
      color: #0f172a;
      page-break-after: avoid;
    }

    h2 {
      font-size: 12pt;
      font-weight: 700;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 5px;
      margin-top: 22px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      margin-top: 14px;
      margin-bottom: 6px;
      color: #1e293b;
    }

    p {
      margin: 0 0 8px 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 8pt;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      font-size: 8pt;
    }

    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #334155;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    /* Test Case Card */
    .tc-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      overflow: hidden;
    }

    .tc-header {
      background: #f8fafc;
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tc-id-badge {
      font-weight: 800;
      font-size: 9pt;
      color: #0284c7;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tc-tut-tag {
      font-size: 7.5pt;
      background: #e2e8f0;
      color: #475569;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 600;
    }

    .tc-title {
      font-weight: 700;
      font-size: 9pt;
      color: #0f172a;
      margin-left: 6px;
    }

    .tc-role-pill {
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .role-SUPER_ADMIN       { background: #fee2e2; color: #991b1b; }
    .role-DEPARTMENT_ADMIN  { background: #fef3c7; color: #92400e; }
    .role-INSTRUCTOR        { background: #e0f2fe; color: #075985; }
    .role-ASSISTANT         { background: #e0e7ff; color: #3730a3; }
    .role-STUDENT           { background: #dcfce7; color: #166534; }
    .role-RECTOR            { background: #f3e8ff; color: #6b21a8; }
    .role-GLOBAL            { background: #f1f5f9; color: #334155; }

    .tc-body {
      padding: 8px 12px;
    }

    .tc-grid {
      display: grid;
      grid-template-columns: 90px 1fr;
      gap: 4px 8px;
      font-size: 8.2pt;
      margin-bottom: 6px;
    }

    .tc-label {
      font-weight: 700;
      color: #64748b;
    }

    .tc-value {
      color: #1e293b;
    }

    .steps-list {
      margin: 4px 0 6px 16px;
      padding: 0;
      font-size: 8.2pt;
    }

    .steps-list li {
      margin-bottom: 3px;
    }

    .expected-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 5px;
      padding: 6px 9px;
      margin-top: 6px;
      font-size: 8.2pt;
      color: #14532d;
    }

    .expected-box strong {
      color: #166534;
    }

    .callout {
      border-left: 4px solid #0284c7;
      background: #f0f9ff;
      padding: 8px 12px;
      border-radius: 0 6px 6px 0;
      font-size: 8.2pt;
      color: #0369a1;
      margin: 10px 0;
    }

    .page-break {
      page-break-before: always;
    }

    .toc-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin: 14px 0 20px 0;
      font-size: 8.2pt;
    }

    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      margin-top: 8px;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 2px;
    }

    .toc-item a {
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
    }

    footer {
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>

  <!-- Header Banner -->
  <div class="header-banner">
    <div>
      <div class="header-subtitle">UNIVERSITAS AL-AMIN YOGYAKARTA (UAY)</div>
      <div class="header-title">BUKU LENGKAP PANDUAN TEST CASE SISTEM</div>
      <div class="header-meta">
        Sistem Informasi Pembelajaran Elektronik (E-Learning UAY) • Versi 2.2 (Terkini) • 45 Modul Pengujian Komprehensif
      </div>
    </div>
    <div style="text-align: right;">
      <span class="badge-status">VALIDATED 100% COVERAGE</span>
      <div style="font-size: 7.5pt; color: #64748b; margin-top: 4px;">Tahun Akademik 2026/2027</div>
    </div>
  </div>

  <!-- Ringkasan Dokumen & Matriks -->
  <div class="callout">
    📖 <strong>Cakupan Pengujian Penuh:</strong> Dokumen pengujian ini dirancang secara komprehensif mengacu pada arsitektur resmi <strong>panduan.html</strong> dan <strong>helpGuide.json</strong> (Tutorial U1 s/d U3, M1 s/d M6, D1 s/d D16, A1 s/d A5, S1 s/d S3, R1 s/d R5) serta seluruh penambahan fitur dan perbaikan bug terkini:
    <br>
    <em>• Role Asisten Dosen (ASSISTANT) untuk Praktikum Lab & Hak Koreksi/Grading</em> | 
    <em>• Filter Tipe Pertemuan dengan Tab Badge (Semua, Perkuliahan, Praktikum, dll)</em> | 
    <em>• Template Bobot Default (30% Tugas Auto-Assign, 35% UTS, 35% UAS) & Presets</em> | 
    <em>• Auto-Generate Enrollment Key 6 Huruf Kapital</em> | 
    <em>• Tombol Tambah Pertemuan di Tengah Bawah</em> | 
    <em>• Selector Tipe Materi di Atas Judul & Tampilan Berkas Tersimpan</em> | 
    <em>• Kartu Uji Coba Pengumpulan Tugas Dosen (Bypass STUDENT_REQUIRED)</em> | 
    <em>• Kunci Jawaban Kuis Human-Friendly (Non-JSON)</em> | 
    <em>• Upload hingga 100MB Nginx & 50MB Express</em> | 
    <em>• Notifikasi Validasi Floating Toast Kanan Atas</em> | 
    <em>• Asterisk Merah (*) pada Kolom Wajib Diisi</em> | 
    <em>• Kerapian Margin Komponen Pagination</em>.
  </div>

  <!-- Daftar Isi Lengkap -->
  <div class="toc-card">
    <strong style="color: #0f172a; font-size: 9pt;">MATRIKS DAFTAR 45 TEST CASE SESUAI PERAN & MODUL PANDUAN:</strong>
    <div class="toc-grid">
      <div>
        <div style="font-weight: 700; color: #0369a1; margin-bottom: 4px;">PENGGUNA UMUM & MAHASISWA</div>
        ${testCases.slice(0, 9).map(tc => `
          <div class="toc-item">
            <span><strong>${tc.id}</strong> (${tc.tutorialId}) ${tc.title.slice(0, 32)}...</span>
            <span style="color: #64748b;">${tc.roleLabel}</span>
          </div>
        `).join("")}
        <div style="font-weight: 700; color: #0369a1; margin: 8px 0 4px 0;">ADMIN PRODI & SUPER ADMIN</div>
        ${testCases.slice(27, 35).map(tc => `
          <div class="toc-item">
            <span><strong>${tc.id}</strong> (${tc.tutorialId}) ${tc.title.slice(0, 32)}...</span>
            <span style="color: #64748b;">${tc.roleLabel}</span>
          </div>
        `).join("")}
      </div>
      <div>
        <div style="font-weight: 700; color: #0369a1; margin-bottom: 4px;">DOSEN PENGAMPU & ASISTEN DOSEN</div>
        ${testCases.slice(9, 27).map(tc => `
          <div class="toc-item">
            <span><strong>${tc.id}</strong> (${tc.tutorialId}) ${tc.title.slice(0, 32)}...</span>
            <span style="color: #64748b;">${tc.roleLabel}</span>
          </div>
        `).join("")}
        <div style="font-weight: 700; color: #0369a1; margin: 8px 0 4px 0;">REKTORAT & KUALITAS SISTEM GLOBAL</div>
        ${testCases.slice(35).map(tc => `
          <div class="toc-item">
            <span><strong>${tc.id}</strong> (${tc.tutorialId}) ${tc.title.slice(0, 32)}...</span>
            <span style="color: #64748b;">${tc.roleLabel}</span>
          </div>
        `).join("")}
      </div>
    </div>
  </div>

  <!-- Matriks Akun Uji Coba -->
  <h2>Matriks Akun Pengujian Resmi (Test Accounts)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Peran (Role)</th>
        <th style="width: 20%;">Username / NIM / NIDN</th>
        <th style="width: 22%;">Password Default</th>
        <th style="width: 40%;">Tanggung Jawab Akademik</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="tc-role-pill role-SUPER_ADMIN">SUPER_ADMIN</span></td>
        <td><code>admin</code></td>
        <td><code>AdminUAY2026!</code></td>
        <td>Tata kelola universitas, kebijakan skala nilai huruf mutu, audit log seluruh kampus, pengumuman darurat.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-DEPARTMENT_ADMIN">DEPARTMENT_ADMIN</span></td>
        <td><code>admin.if</code></td>
        <td><code>AdminProdi2026!</code></td>
        <td>Kurikulum prodi Informatika, buat kelas, kunci enrollment otomatis 6 huruf, plotting dosen, audit prodi.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-INSTRUCTOR">INSTRUCTOR</span></td>
        <td><code>198501012010121001</code></td>
        <td><code>DosenUAY2026!</code></td>
        <td>Pertemuan (atas/bawah), materi (PDF/video/teks), tugas & simulasi dosen, kuis, presensi, pembobotan nilai 30-35-35.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-ASSISTANT">ASSISTANT</span></td>
        <td><code>asdos01</code> / <code>202401002</code></td>
        <td><code>AsdosUAY2026!</code></td>
        <td>Asisten Dosen / Asisten Praktikum. Kelola sesi materi praktikum, presensi lab, koreksi tugas & laporan mahasiswa pada kelas yang ditugaskan.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-STUDENT">STUDENT</span></td>
        <td><code>202401001</code></td>
        <td><code>MahasiswaUAY2026!</code></td>
        <td>Gabung kelas dengan key, isi presensi 1-klik/kode, pelacakan materi adil, submit & revisi tugas, kuis interaktif.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-RECTOR">RECTOR</span></td>
        <td><code>rektor</code></td>
        <td><code>RektorUAY2026!</code></td>
        <td>Dashboard eksekutif read-only, analitik keaktifan dosen/mahasiswa, ekspor laporan rapat senat rektorat.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Render All 45 Test Cases -->
  <h2>Spesifikasi Rinci Seluruh Test Case Pengujian</h2>

  ${testCases.map((tc, idx) => `
    <div class="tc-card">
      <div class="tc-header">
        <div class="tc-id-badge">
          <span>${tc.id}</span>
          <span class="tc-tut-tag">Ref: ${tc.tutorialId}</span>
          <span class="tc-title">${tc.title}</span>
        </div>
        <span class="tc-role-pill role-${tc.role}">${tc.roleLabel}</span>
      </div>
      <div class="tc-body">
        <div class="tc-grid">
          <div class="tc-label">Modul:</div>
          <div class="tc-value">${tc.module} (${tc.location})</div>
          <div class="tc-label">Tujuan Uji:</div>
          <div class="tc-value">${tc.objective}</div>
          <div class="tc-label">Prasyarat:</div>
          <div class="tc-value">${tc.preconditions}</div>
          <div class="tc-label">Data Uji:</div>
          <div class="tc-value">${tc.testData}</div>
        </div>
        <div style="font-weight: 700; color: #475569; font-size: 8.2pt; margin-top: 4px;">Langkah-Langkah Pengujian (Step-by-Step):</div>
        <ol class="steps-list">
          ${tc.steps.map(step => `<li>${step}</li>`).join("")}
        </ol>
        <div class="expected-box">
          <strong>Hasil yang Diharapkan:</strong> ${tc.expected}
        </div>
      </div>
    </div>
    ${(idx + 1) % 4 === 0 && idx !== testCases.length - 1 ? '<div class="page-break"></div>' : ''}
  `).join("")}

  <div class="page-break"></div>

  <!-- Lembar Verifikasi & Format Bug Report -->
  <h2>Lembar Verifikasi & Format Standar Pelaporan Kendala</h2>
  <p>Gunakan format laporan terstandarisasi di bawah ini jika tim penguji menjumpai anomali sistem:</p>

  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; font-family: monospace; font-size: 8pt; line-height: 1.6;">
    <strong>### [BUG-ID-UAY] Ringkasan Singkat Temuan Kendala</strong><br>
    - <strong>ID Test Case Terkait:</strong> TC-IN-02 / TC-IN-14 / TC-DA-02 / dll<br>
    - <strong>Modul / Lokasi:</strong> Modul Buku Nilai / Presensi / Editor Materi<br>
    - <strong>Akun & Peran Penguji:</strong> INSTRUCTOR (198501012010121001) / STUDENT / dll<br>
    - <strong>Lingkungan Pengujian:</strong> Windows 11 Chrome 124 / iOS 17 Safari (Resolusi Layar: Desktop / 390px)<br>
    - <strong>Langkah Reproduksi:</strong><br>
    &nbsp;&nbsp;1. Buka menu ...<br>
    &nbsp;&nbsp;2. Klik tombol ...<br>
    &nbsp;&nbsp;3. Masukkan data ...<br>
    - <strong>Hasil Aktual:</strong> (Jelaskan perilaku yang terjadi atau pesan galat yang muncul)<br>
    - <strong>Hasil yang Diharapkan:</strong> (Sesuai kriteria pada buku panduan test case ini)<br>
    - <strong>Bukti Pendukung:</strong> Lampirkan screenshot tangkapan layar atau log inspect console.
  </div>

  <footer>
    Universitas Al-Amin Yogyakarta (UAY) • Buku Panduan Lengkap Test Case E-Learning UAY • Edisi Akademik 2026/2027
  </footer>

</body>
</html>
`;

writeFileSync(tempHtmlPath, htmlContent, "utf8");
console.log("Comprehensive HTML written to temp_complete_guide.html");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browserExe = existsSync(chromePath) ? chromePath : edgePath;

console.log("Using browser binary:", browserExe);

const cmd = `"${browserExe}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "${tempHtmlPath}"`;
console.log("Generating full PDF guide...");
execSync(cmd, { stdio: "inherit" });

if (existsSync(outputPdfPath)) {
  console.log("Full PDF generated successfully at:", outputPdfPath);
  if (!existsSync(artifactDir)) {
    mkdirSync(artifactDir, { recursive: true });
  }
  copyFileSync(outputPdfPath, artifactPdfPath);
  console.log("Full PDF copied to artifacts at:", artifactPdfPath);

  // Synchronize docs/TEST_CASE_PANDUAN_ELEARNING_UAY.md
  const mdPath = join(docsDir, "TEST_CASE_PANDUAN_ELEARNING_UAY.md");
  let md = "# PANDUAN PENGUJIAN DAN TEST CASE SISTEM E-LEARNING UNIVERSITAS AL-AMIN YOGYAKARTA (UAY)\n\n";
  md += "**Versi Dokumen:** 2.2 (Versi Sistem Terkini - 45 Modul Pengujian Komprehensif Sesuai Panduan)\n";
  md += "**Lingkungan Uji:** Staging / Production (https://elearning.uay.ac.id)\n";
  md += "**Dokumen Format PDF Resmi:** `docs/TEST_CASE_PANDUAN_ELEARNING_UAY.pdf`\n";
  md += "**Metodologi:** Role-Based Access Control (RBAC) & End-to-End Functional Verification\n\n---\n\n";
  md += "## 1. Matriks Akun Pengujian Resmi\n\n";
  md += "| Peran (Role) | Username / NIM / NIDN | Password Default | Tanggung Jawab Akademik |\n";
  md += "|---|---|---|---|\n";
  md += "| SUPER_ADMIN | `admin` | `AdminUAY2026!` | Tata kelola universitas, kebijakan skala nilai, audit log kampus, pengumuman darurat. |\n";
  md += "| DEPARTMENT_ADMIN | `admin.if` | `AdminProdi2026!` | Kurikulum prodi Informatika, buat kelas, kunci enrollment otomatis 6 huruf, plotting dosen, audit prodi. |\n";
  md += "| INSTRUCTOR | `198501012010121001` | `DosenUAY2026!` | Pertemuan (atas/bawah), materi (PDF/video/teks), tugas & simulasi dosen, kuis, presensi, pembobotan nilai 30-35-35. |\n";
  md += "| ASSISTANT | `asdos01` / `202401002` | `AsdosUAY2026!` | Asisten Dosen / Lab. Kelola materi praktikum, buka presensi lab, koreksi & nilai laporan praktikum mahasiswa pada kelas yang ditugaskan. |\n";
  md += "| STUDENT | `202401001` | `MahasiswaUAY2026!` | Gabung kelas dengan key, isi presensi 1-klik/kode, pelacakan materi adil, submit & revisi tugas, kuis interaktif. |\n";
  md += "| RECTOR | `rektor` | `RektorUAY2026!` | Dashboard eksekutif read-only, analitik keaktifan dosen/mahasiswa, ekspor laporan rapat senat rektorat. |\n\n---\n\n";
  md += "## 2. Spesifikasi Rinci 45 Test Case Sesuai Panduan Aplikasi & Fitur Terkini\n\n";
  for (const tc of testCases) {
    md += `### ${tc.id}: ${tc.title}\n`;
    md += `- **Referensi Panduan:** Tutorial ${tc.tutorialId} (\`panduan.html\` / \`helpGuide.json\`)\n`;
    md += `- **Peran (Role):** ${tc.roleLabel} (\`${tc.role}\`)\n`;
    md += `- **Modul / Lokasi:** ${tc.module} (${tc.location})\n`;
    md += `- **Tujuan Pengujian:** ${tc.objective}\n`;
    md += `- **Prasyarat:** ${tc.preconditions}\n`;
    md += `- **Data Uji:** ${tc.testData}\n`;
    md += "- **Langkah-Langkah Pengujian (Step-by-Step):**\n";
    tc.steps.forEach((s, i) => { md += `  ${i + 1}. ${s}\n`; });
    md += `- **Hasil yang Diharapkan:** ${tc.expected}\n\n`;
  }
  md += "---\n\n## 3. Format Standar Pelaporan Temuan Kendala (Bug Report Template)\n\n";
  md += "```markdown\n### [BUG-ID-UAY] Ringkasan Singkat Temuan Kendala\n- ID Test Case Terkait: TC-IN-02 / TC-IN-14 / TC-DA-02 / dll\n- Modul / Lokasi: Modul Buku Nilai / Presensi / Editor Materi\n- Akun & Peran Penguji: INSTRUCTOR (198501012010121001) / STUDENT / dll\n- Lingkungan Pengujian: Windows 11 Chrome 124 / iOS 17 Safari (Desktop / Mobile 390px)\n- Langkah Reproduksi:\n  1. Buka menu ...\n  2. Klik tombol ...\n  3. Masukkan data ...\n- Hasil Aktual: (Jelaskan perilaku yang terjadi atau pesan error)\n- Hasil yang Diharapkan: (Sesuai kriteria dokumen ini)\n- Bukti Pendukung: Screenshot atau log inspect console\n```\n";
  writeFileSync(mdPath, md, "utf8");
  console.log("Synchronized docs/TEST_CASE_PANDUAN_ELEARNING_UAY.md successfully!");
} else {
  console.error("PDF generation failed!");
  process.exit(1);
}
