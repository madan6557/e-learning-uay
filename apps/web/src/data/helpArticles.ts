export type HelpRole = "SUPER_ADMIN" | "DEPARTMENT_ADMIN" | "INSTRUCTOR" | "STUDENT";

export type HelpArticle = {
  id: string;
  title: string;
  summary: string;
  category: string;
  roles: HelpRole[];
  keywords: string[];
  steps?: string[];
  content: string;
  related?: string[];
};

const all: HelpRole[] = ["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT"];
const staff: HelpRole[] = ["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR"];
const admins: HelpRole[] = ["SUPER_ADMIN", "DEPARTMENT_ADMIN"];

export const helpArticles: HelpArticle[] = [
  {
    id: "getting-started",
    title: "Mulai Menggunakan E-Learning UAY",
    summary: "Panduan masuk dengan akun resmi kampus, navigasi menu, profil pengguna, dan keluar dari sistem.",
    category: "Mulai Menggunakan Sistem",
    roles: all,
    keywords: ["masuk", "login", "keluar", "logout", "navigasi", "profil", "akun kampus"],
    steps: [
      "Buka peramban (browser) dan akses alamat resmi https://e-learning.uay.ac.id.",
      "Klik tombol Masuk pada halaman utama E-Learning.",
      "Ketikkan NIM (mahasiswa) atau NIDN (dosen) beserta kata sandi akun resmi kampus Anda.",
      "Sistem memverifikasi akun dan otomatis mengarahkan Anda ke Beranda E-Learning sesuai peran akun Anda.",
      "Klik foto profil di pojok kanan atas lalu pilih Keluar setelah selesai beraktivitas."
    ],
    content: "E-Learning UAY dapat diakses menggunakan akun resmi kampus Universitas Achmad Yani. Anda tidak perlu mendaftar atau membuat akun baru; cukup gunakan akun kampus yang sudah aktif. Antarmuka dan menu yang tampil otomatis menyesuaikan peran akun Anda (Mahasiswa, Dosen, atau Administrator).",
    related: ["sso-login-flow", "roles"]
  },
  {
    id: "sso-login-flow",
    title: "Panduan Masuk Satu Pintu Menggunakan Akun Kampus",
    summary: "Penjelasan alur masuk yang praktis dan aman menggunakan satu akun resmi untuk seluruh layanan perkuliahan.",
    category: "User & Akses",
    roles: all,
    keywords: ["masuk akun", "login", "kata sandi", "keamanan akun", "portal kampus"],
    steps: [
      "Klik tombol Masuk pada halaman utama E-Learning UAY.",
      "Halaman verifikasi akun resmi kampus akan terbuka secara otomatis.",
      "Ketikkan NIM bagi mahasiswa atau NIDN bagi dosen beserta kata sandi Anda.",
      "Setelah verifikasi berhasil, sistem otomatis mengarahkan Anda kembali ke E-Learning dan siap belajar."
    ],
    content: "Untuk memudahkan sivitas akademika dan melindungi privasi akun, E-Learning UAY menggunakan sistem masuk satu pintu terpadu. Anda cukup mengingat satu akun resmi kampus (NIM/NIDN dan kata sandi) untuk mengakses seluruh layanan perkuliahan daring tanpa perlu membuat akun terpisah. Sistem menjaga kerahasiaan kata sandi Anda secara terpusat dan aman.",
    related: ["getting-started", "roles"]
  },
  {
    id: "roles",
    title: "Peran Pengguna & Hak Akses Fitur",
    summary: "Hak akses bagi Mahasiswa, Dosen Pengampu, Pengelola Program Studi, dan Pimpinan.",
    category: "User & Akses",
    roles: all,
    keywords: ["peran", "hak akses", "dosen", "mahasiswa", "admin prodi", "pimpinan"],
    content: "Hak akses di E-Learning UAY disesuaikan dengan peran masing-masing: Mahasiswa berhak mengakses materi pembelajaran, mengisi presensi kuliah, mengumpulkan tugas, dan mengerjakan evaluasi kuis pada kelas yang diikutinya. Dosen Pengampu mengelola silabus pertemuan, mengunggah bahan ajar, membuka sesi presensi, serta menilai tugas dan kuis. Pengelola Program Studi memantau aktivitas kelas pada prodinya dan mengelola penugasan dosen. Pimpinan Universitas dan Administrator mengelola konfigurasi umum serta memantau ringkasan keaktifan perkuliahan.",
    related: ["department-isolation", "multi-affiliation"]
  },
  {
    id: "department-isolation",
    title: "Pengelompokan Kelas Berdasarkan Program Studi",
    summary: "Penyusunan tampilan kelas dan mahasiswa agar rapi sesuai program studi masing-masing.",
    category: "Tata Kelola Akademik",
    roles: staff,
    keywords: ["program studi", "prodi", "kelas", "fakultas", "daftar mahasiswa"],
    content: "E-Learning UAY secara otomatis mengelompokkan tampilan kelas, mata kuliah, dan pencarian pengguna berdasarkan program studi. Pengelola Program Studi dan Dosen dapat fokus memantau dan mengelola perkuliahan di prodinya masing-masing dengan rapi, tertib, dan tidak tercampur antar program studi.",
    related: ["multi-affiliation", "roles"]
  },
  {
    id: "multi-affiliation",
    title: "Panduan Dosen yang Mengajar di Lebih dari Satu Program Studi",
    summary: "Cara dosen yang mengampu mata kuliah di beberapa program studi mengelola kelas perkuliahan.",
    category: "Tata Kelola Akademik",
    roles: staff,
    keywords: ["dosen lintas prodi", "mengajar beberapa prodi", "kelas kuliah", "dosen"],
    steps: [
      "Masuk ke E-Learning menggunakan akun resmi dosen Anda.",
      "Buka menu Kelas Saya di bilah navigasi kiri.",
      "Seluruh kelas yang Anda ampu dari berbagai program studi akan otomatis tampil di layar.",
      "Pilih kelas yang ingin dikelola untuk mengunggah materi, membuka presensi, atau memeriksa tugas."
    ],
    content: "Bagi Dosen yang mengajar di lebih dari satu program studi (misalnya Teknik Informatika dan Sistem Informasi), akun Anda secara otomatis terhubung ke seluruh program studi penugasan tersebut. Anda dapat langsung mengelola perkuliahan dan mahasiswa di setiap prodi tanpa perlu keluar-masuk atau berganti akun.",
    related: ["department-isolation", "courses"]
  },
  {
    id: "courses",
    title: "Membuka & Menjelajahi Kelas Perkuliahan",
    summary: "Cara menemukan kelas, melihat silabus pertemuan mingguan, dan bahan ajar.",
    category: "Mata Kuliah & Kelas",
    roles: all,
    keywords: ["kelas", "matkul", "silabus", "pertemuan", "jadwal"],
    steps: [
      "Buka menu Kelas Saya dari bilah navigasi utama.",
      "Pilih kartu kelas yang ingin dibuka.",
      "Lihat daftar pertemuan (Pertemuan 1 s/d 16) beserta materi, tugas, dan evaluasi aktif."
    ],
    content: "Halaman kelas mengelompokkan aktivitas pembelajaran per pertemuan perkuliahan. Mahasiswa dapat melihat kelas yang telah terdaftar, sedangkan dosen dan pengelola program studi melihat kelas sesuai penugasan perkuliahan.",
    related: ["section-types", "attendance-student"]
  },
  {
    id: "section-types",
    title: "Jenis Pertemuan Kuliah (Section Type)",
    summary: "Pilihan jenis pertemuan: Perkuliahan, Praktikum, Seminar, Lokakarya, Ujian, dan Lainnya.",
    category: "Mata Kuliah & Kelas",
    roles: staff,
    keywords: ["section", "jenis pertemuan", "kuliah", "praktikum", "seminar", "lokakarya", "ujian", "lainnya"],
    steps: [
      "Buka kelas dan klik Tambah Pertemuan atau Edit Pertemuan.",
      "Pada pilihan Jenis Pertemuan, pilih kategori yang sesuai: Perkuliahan, Praktikum, Seminar, Lokakarya, Ujian, atau Lainnya.",
      "Isi judul topik dan deskripsi capaian pembelajaran pertemuan, lalu simpan."
    ],
    content: "Pilihan jenis pertemuan membantu mahasiswa memahami format kegiatan belajar pada minggu terkait. Pilihan 'Lainnya' dapat digunakan untuk kegiatan akademik khusus seperti matrikulasi, studi lapangan, kuliah pakar, atau kegiatan pembekalan.",
    related: ["courses", "manage-material"]
  },
  {
    id: "attendance-student",
    title: "Presensi Mandiri Mahasiswa",
    summary: "Langkah mahasiswa mengisi kehadiran saat sesi presensi dibuka oleh dosen di kelas.",
    category: "Presensi Perkuliahan",
    roles: ["STUDENT"],
    keywords: ["presensi", "absensi", "check-in", "kode pin", "kehadiran", "mahasiswa"],
    steps: [
      "Buka kelas perkuliahan saat jam kuliah berlangsung.",
      "Perhatikan banner Presensi Sedang Berlangsung di bagian atas halaman kelas.",
      "Klik tombol Isi Presensi.",
      "Masukkan Kode Presensi 6 Digit yang ditampilkan dosen di layar proyektor kelas (bila sesi menggunakan kode PIN).",
      "Tekan Kirim Presensi. Status kehadiran Anda seketika tercatat sebagai Hadir (H)."
    ],
    content: "Presensi mandiri hanya dapat diisi selama sesi dibuka oleh dosen dan sebelum batas waktu berakhir. Penggunaan kode presensi memastikan mahasiswa hadir secara aktif pada jam perkuliahan.",
    related: ["attendance-rules", "courses"]
  },
  {
    id: "attendance-lecturer",
    title: "Pengelolaan Lembar Presensi Kelas oleh Dosen",
    summary: "Membuka sesi presensi, menampilkan kode proyektor, dan mengisi kehadiran mahasiswa.",
    category: "Presensi Perkuliahan",
    roles: staff,
    keywords: ["presensi manual", "buka presensi", "kode presensi", "tandai semua hadir", "dosen"],
    steps: [
      "Buka kelas dan pilih tab Presensi atau klik Presensi pada kartu pertemuan.",
      "Klik Buka Presensi untuk mengaktifkan sesi dan menampilkan Kode 6 Digit di proyektor kelas.",
      "Gunakan tombol Cepat 'Set Semua Hadir' jika mayoritas mahasiswa hadir.",
      "Ubah status mahasiswa tertentu yang tidak hadir menjadi Izin (I), Sakit (S), Alpa (A), atau Terlambat (T).",
      "Tambahkan catatan keterangan izin atau sakit bila mahasiswa menyerahkan surat izin resmi.",
      "Tutup sesi presensi setelah jam perkuliahan selesai."
    ],
    content: "Dosen memiliki wewenang penuh untuk melakukan pengisian manual maupun mengoreksi kehadiran mahasiswa sewaktu-waktu jika mahasiswa menyerahkan surat dokter atau permohonan izin susulan.",
    related: ["attendance-recap", "attendance-rules"]
  },
  {
    id: "attendance-recap",
    title: "Rekapitulasi Kehadiran & Syarat Ujian (Minimal 75%)",
    summary: "Memantau persentase kehadiran mahasiswa dan mengekspor lembar rekap presensi.",
    category: "Presensi Perkuliahan",
    roles: staff,
    keywords: ["rekap presensi", "75 persen", "syarat ujian", "bap", "ekspor excel"],
    steps: [
      "Buka tab Presensi pada kelas terkait.",
      "Pilih sub-tab Rekapitulasi Kehadiran.",
      "Sistem menampilkan tabel persentase kehadiran seluruh mahasiswa dan indikator kelayakan mengikuti ujian.",
      "Gunakan tombol Ekspor untuk mengunduh rekap dalam format Excel/CSV untuk kelengkapan berkas perkuliahan prodi."
    ],
    content: "Mahasiswa dengan persentase kehadiran di bawah 75% otomatis ditandai perhatian khusus sesuai peraturan akademik universitas, membantu dosen dan prodi melakukan evaluasi sebelum masa UTS/UAS tiba.",
    related: ["attendance-lecturer", "grading"]
  },
  {
    id: "attendance-rules",
    title: "Arti Status Kehadiran: Hadir, Izin, Sakit, Alpa, Terlambat",
    summary: "Arti dan penjelasan dari masing-masing status presensi di E-Learning UAY.",
    category: "Presensi Perkuliahan",
    roles: all,
    keywords: ["hadir", "izin", "sakit", "alpa", "terlambat", "aturan presensi"],
    content: "Hadir (H): Mahasiswa mengikuti perkuliahan penuh. Izin (I): Mahasiswa berhalangan dengan pemberitahuan dan surat keterangan resmi. Sakit (S): Mahasiswa melampirkan surat keterangan dokter. Terlambat (T): Mahasiswa hadir melampaui toleransi waktu namun tetap mengikuti kelas. Alpa (A): Mahasiswa tidak hadir tanpa keterangan yang sah.",
    related: ["attendance-student", "attendance-lecturer"]
  },
  {
    id: "progress-material",
    title: "Perekaman Progres Belajar: Video, Dokumen PDF, dan Presentasi",
    summary: "Cara sistem mendeteksi kemajuan membaca materi modul dan menyimak video perkuliahan.",
    category: "Materi & Media",
    roles: all,
    keywords: ["progress", "video", "pdf", "ppt", "slide", "selesai membaca"],
    content: "Kemajuan belajar Anda tercatat secara otomatis saat Anda menonton video pembelajaran atau membaca dokumen modul perkuliahan lembar demi lembar. Pastikan Anda menyimak materi hingga tuntas agar indikator kelengkapan belajar terisi penuh.",
    related: ["material-download", "manage-material"]
  },
  {
    id: "material-download",
    title: "Ketentuan Unduh Berkas Bahan Ajar",
    summary: "Penjelasan pembukaan tombol unduh materi setelah mahasiswa menyelesaikan bahan ajar.",
    category: "Materi & Media",
    roles: all,
    keywords: ["unduh materi", "download", "baca tuntas", "persyaratan unduh"],
    content: "Jika dosen mengaktifkan syarat 'Wajib Tuntas Sebelum Mengunduh', mahasiswa perlu menyimak video hingga selesai atau membuka seluruh halaman modul PDF/presentasi terlebih dahulu. Setelah selesai disimak, tombol unduh berkas akan otomatis aktif.",
    related: ["progress-material"]
  },
  {
    id: "manage-material",
    title: "Mengunggah & Mengelola Bahan Ajar (PDF, Presentasi, Video)",
    summary: "Panduan dosen mengunggah modul kuliah, bahan tayang presentasi, dan tautan video materi.",
    category: "Materi & Media",
    roles: staff,
    keywords: ["unggah materi", "upload pdf", "upload video", "ppt", "bahan ajar"],
    steps: [
      "Buka kelas dan pilih pertemuan perkuliahan yang dituju.",
      "Klik Tambah Materi.",
      "Pilih tipe materi: Dokumen PDF, Slide Presentasi, atau Video Pembelajaran.",
      "Unggah berkas bahan ajar atau masukkan tautan video pembelajaran.",
      "Atur jadwal tayang atau simpan sebagai Draf.",
      "Klik Publikasikan agar bahan ajar dapat dipelajari oleh mahasiswa."
    ],
    content: "Semua bahan ajar yang diunggah tersimpan aman di sistem E-Learning UAY. Mahasiswa dapat langsung membaca modul dan memutar video pembelajaran secara lancar dari peramban dengan hemat kuota tanpa harus mengunduh berkas berukuran besar terlebih dahulu.",
    related: ["progress-material", "class-cloning"]
  },
  {
    id: "class-cloning",
    title: "Menduplikasi (Kloning) Kelas ke Semester Baru",
    summary: "Cara praktis menyalin materi dan struktur kelas ke semester baru tanpa membawa data mahasiswa lama.",
    category: "Siklus Kelas & Kloning",
    roles: staff,
    keywords: ["clone kelas", "duplikasi kelas", "semester baru", "tahun ajaran baru"],
    steps: [
      "Buka kelas yang ingin diduplikasi.",
      "Klik tombol Titik Tiga / Menu Opsi di bagian atas kelas, lalu pilih Duplikasi Kelas.",
      "Pilih Tahun Ajaran & Semester baru (misal: 2026/2027 Ganjil).",
      "Ketikkan Nama Rombel Kelas baru (misal: Pemrograman Web - Kelas A).",
      "Pilih opsi jadwal: Reset ke Draf Bersih (Direkomendasikan) atau Sesuaikan Tanggal.",
      "Klik Konfirmasi Duplikasi."
    ],
    content: "Fitur duplikasi kelas menyalin silabus materi, tugas, dan kuis secara utuh. Jadwal lama otomatis disetel ke status Draf agar dosen dapat menyesuaikan kembali dengan kalender akademik yang baru. Data mahasiswa semester sebelumnya tidak diikutsertakan, sehingga kelas baru siap untuk diisi mahasiswa angkatan berjalan.",
    related: ["courses", "manage-material"]
  },
  {
    id: "assignments",
    title: "Pengumpulan Tugas Kuliah & Praktikum",
    summary: "Panduan mahasiswa mengunggah lembar jawaban tugas dan memperhatikan batas waktu pengumpulan.",
    category: "Tugas & Evaluasi",
    roles: all,
    keywords: ["tugas", "praktikum", "kumpulkan tugas", "deadline", "unggah berkas"],
    steps: [
      "Buka tugas pada pertemuan perkuliahan terkait.",
      "Baca petunjuk tugas, kriteria penilaian, dan batas waktu pengumpulan (deadline).",
      "Pilih format pengumpulan: Unggah Berkas (PDF/ZIP) atau Masukkan Tautan (URL Tugas).",
      "Klik Kirim Tugas. Pastikan status berubah menjadi Terkumpul (Submitted)."
    ],
    content: "Mahasiswa dapat memperbarui berkas tugas sebelum batas waktu berakhir. Jika dosen menetapkan batas toleransi keterlambatan, pengumpulan setelah batas waktu akan ditandai Terlambat oleh sistem.",
    related: ["grading", "file-safety"]
  },
  {
    id: "file-safety",
    title: "Format Berkas yang Didukung & Batas Ukuran",
    summary: "Ketentuan jenis berkas yang dapat diunggah untuk pengumpulan tugas dan bahan ajar.",
    category: "Keamanan Sistem",
    roles: all,
    keywords: ["tipe berkas", "format file", "pdf", "zip", "ukuran berkas"],
    content: "Sistem mendukung format dokumen umum seperti PDF, Word (DOCX), Presentasi (PPTX), Gambar (PNG, JPG), Arsip Tugas (ZIP), dan Video MP4. Berkas program (.exe, .bat) tidak diizinkan demi menjaga keamanan bersama. Batas ukuran maksimal pengunggahan berkas adalah 50 MB per berkas.",
    related: ["assignments"]
  },
  {
    id: "quiz-basics",
    title: "Mengerjakan Kuis & Ujian Daring",
    summary: "Panduan langkah pengerjaan kuis, batas percobaan, penghitung waktu, dan ragam jenis soal.",
    category: "Kuis & Ujian",
    roles: all,
    keywords: ["kuis", "quiz", "ujian", "evaluasi", "timer", "pilihan ganda", "esai"],
    steps: [
      "Buka kuis dari pertemuan perkuliahan yang sedang aktif.",
      "Baca instruksi: batas kesempatan mencoba (attempt), durasi waktu pengerjaan, dan batas akhir kuis.",
      "Klik Mulai Kuis.",
      "Jawab butir-butir soal (Pilihan Ganda, Benar/Salah, Menjodohkan, Mengurutkan, atau Uraian/Esai).",
      "Klik Kirim Jawaban sebelum waktu hitung mundur habis."
    ],
    content: "Jawaban yang Anda pilih tersimpan secara bertahap saat Anda berpindah soal. Jika koneksi internet Anda sempat terputus sebentar, Anda dapat memuat ulang halaman dan melanjutkan pengerjaan selama durasi waktu kuis belum habis.",
    related: ["timer-modes", "quiz-results"]
  },
  {
    id: "timer-modes",
    title: "Perbedaan Durasi Mandiri vs Batas Waktu Serentak pada Kuis",
    summary: "Penjelasan cara kerja hitung mundur waktu kuis secara individu maupun ujian serentak.",
    category: "Kuis & Ujian",
    roles: all,
    keywords: ["timer", "durasi kuis", "waktu ujian", "serentak", "hitung mundur"],
    content: "Pada Mode Durasi Mandiri, mahasiswa memperoleh durasi waktu penuh (misalnya 60 menit) sejak tombol Mulai ditekan, asalkan masih dalam jadwal kuis dibuka. Pada Mode Waktu Serentak, pengerjaan akan otomatis selesai bersamaan saat batas akhir jam kuis tiba, sehingga mahasiswa disarankan mulai tepat waktu.",
    related: ["quiz-basics"]
  },
  {
    id: "quiz-results",
    title: "Melihat Hasil Kuis & Ulasan Jawaban",
    summary: "Penjelasan mengenai waktu rilis nilai kuis dan ulasan pembahasan jawaban.",
    category: "Kuis & Ujian",
    roles: all,
    keywords: ["nilai kuis", "ulasan jawaban", "skor", "pembahasan kuis"],
    content: "Untuk soal pilihan ganda, nilai dihitung secara otomatis oleh sistem. Untuk soal uraian/esai, nilai akan diperbarui setelah dosen menyelesaikan pemeriksaan manual. Dosen dapat menentukan apakah nilai kuis langsung tampil setelah kuis selesai atau dirilis pada jadwal yang ditentukan.",
    related: ["grading", "quiz-basics"]
  },
  {
    id: "grading",
    title: "Pemeriksaan Tugas, Penilaian Esai, dan Buku Nilai (Gradebook)",
    summary: "Panduan dosen memeriksa jawaban mahasiswa, memberikan masukan, dan mengelola buku nilai.",
    category: "Penilaian & Rekap",
    roles: staff,
    keywords: ["koreksi tugas", "buku nilai", "gradebook", "menilai", "bobot nilai"],
    steps: [
      "Buka kelas dan pilih tab Buku Nilai (Gradebook) atau buka tugas perkuliahan terkait.",
      "Periksa daftar mahasiswa yang telah mengumpulkan tugas atau menyelesaikan kuis.",
      "Buka lembar jawaban mahasiswa, masukkan nilai (skala 0-100), dan ketikkan masukan perbaikan.",
      "Klik Simpan Nilai."
    ],
    content: "Buku Nilai menghitung nilai akhir mahasiswa secara otomatis berdasarkan persentase bobot yang telah ditetapkan dosen (misalnya Tugas 20%, Kuis 15%, UTS 30%, UAS 35%).",
    related: ["quiz-results", "assignments"]
  },
  {
    id: "rector-dashboard-bridging",
    title: "Ringkasan Aktivitas Perkuliahan untuk Pimpinan Universitas",
    summary: "Pemantauan ringkasan aktivitas akademik dan kelancaran perkuliahan oleh pimpinan universitas.",
    category: "Integrasi Sistem",
    roles: admins,
    keywords: ["pimpinan", "ringkasan perkuliahan", "keaktifan dosen", "monitoring akademik"],
    content: "Pimpinan universitas dapat memantau ringkasan statistik perkuliahan secara langsung, seperti jumlah kelas yang aktif berjalan, keaktifan pembelajaran dosen, dan tingkat penyelesaian perkuliahan, guna memastikan mutu proses akademik berjalan optimal di seluruh fakultas dan program studi.",
    related: ["roles", "security"]
  },
  {
    id: "security",
    title: "Keamanan Akun & Perlindungan Data Pribadi",
    summary: "Panduan menjaga keamanan akun perkuliahan dan privasi informasi akademik.",
    category: "Keamanan Sistem",
    roles: all,
    keywords: ["keamanan akun", "kata sandi", "privasi", "tips aman", "logout"],
    steps: [
      "Jaga kerahasiaan kata sandi Anda dan jangan berikan kepada orang lain.",
      "Biasakan mengklik tombol Keluar (Logout) setelah selesai menggunakan komputer di laboratorium atau perpustakaan.",
      "Pastikan Anda selalu mengakses situs resmi universitas di https://e-learning.uay.ac.id."
    ],
    content: "E-Learning UAY dirancang dengan standar perlindungan akun untuk menjaga keamanan data seluruh sivitas akademika. Setiap pengguna hanya dapat mengakses kelas dan informasi akademik yang sesuai dengan haknya. Jagalah selalu kerahasiaan akun dan kata sandi Anda.",
    related: ["sso-login-flow"]
  },
  {
    id: "troubleshooting",
    title: "Panduan Penanganan Kendala Operasional Umum",
    summary: "Langkah mudah penanganan jika gagal masuk, presensi belum muncul, atau kendala mengunduh materi.",
    category: "Bantuan & FAQ",
    roles: all,
    keywords: ["kendala", "gagal masuk", "solusi", "troubleshooting", "bantuan"],
    steps: [
      "Periksa koneksi internet Anda dan pastikan peramban tidak dalam mode offline.",
      "Jika mengalami kendala masuk, pastikan NIM/NIDN dan kata sandi yang Anda masukkan sudah benar.",
      "Jika presensi mandiri belum bisa diisi, tanyakan kepada dosen pengampu apakah sesi sudah dibuka dan pastikan kode sudah sesuai.",
      "Jika materi belum bisa diunduh, pastikan video telah ditonton tuntas atau modul dokumen telah dibaca hingga akhir.",
      "Bila kendala belum terselesaikan, hubungi layanan bantuan kampus dengan melampirkan foto layar pesan yang muncul."
    ],
    content: "Sebagian besar kendala tampilan dapat diselesaikan dengan memuat ulang halaman (refresh browser) atau keluar lalu masuk kembali menggunakan akun resmi kampus Anda.",
    related: ["getting-started", "attendance-student"]
  },
  {
    id: "faq-attendance",
    title: "FAQ: Pertanyaan yang Sering Diajukan Seputar Presensi",
    summary: "Jawaban pertanyaan umum seputar kehadiran perkuliahan dan aturan presensi kelas.",
    category: "Bantuan & FAQ",
    roles: all,
    keywords: ["faq presensi", "tanya jawab presensi", "izin sakit", "lupa absen", "kuota kehadiran"],
    content: "T: Bagaimana jika saya lupa memasukkan kode presensi saat kuliah? J: Segera lapor ke dosen pengampu agar dosen dapat menandai kehadiran Anda secara manual di lembar presensi kelas. T: Berapa batas minimal kehadiran untuk dapat mengikuti ujian? J: Minimal 75% dari total seluruh pertemuan kuliah. T: Apakah surat keterangan sakit dihitung alpa? J: Tidak, surat dokter dicatat sebagai Sakit (S) dan diperhitungkan secara sah dalam rekap kehadiran.",
    related: ["attendance-student", "attendance-lecturer", "attendance-rules"]
  }
];

export default helpArticles;
