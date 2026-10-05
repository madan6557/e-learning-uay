import { uploadLimit } from "../../../../packages/shared/src/files";
const uploadLimitsText = `Cover maksimum ${uploadLimit("COVER") / 1024 / 1024} MB; materi, tugas, dan jawaban kuis ${uploadLimit("RESOURCE") / 1024 / 1024} MB; video unggahan ${uploadLimit("VIDEO") / 1024 / 1024} MB.`;

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
    steps: ["Buka alamat E-Learning yang diberikan kampus.","Klik Masuk dengan SSO UAY pada halaman utama.","Gunakan identitas dan kata sandi yang diminta halaman SSO kampus.","Setelah berhasil, Anda kembali ke beranda sesuai peran akun.","Buka menu Profil untuk melihat identitas. Gunakan tombol Keluar setelah selesai."],
    content: "E-Learning UAY dapat diakses menggunakan akun resmi kampus Universitas Achmad Yani. Anda tidak perlu mendaftar atau membuat akun baru; cukup gunakan akun kampus yang sudah aktif. Antarmuka dan menu yang tampil otomatis menyesuaikan peran akun Anda (Mahasiswa, Dosen, atau Administrator).",
    related: ["sso-login-flow", "roles"]
  },
  {
    id: "sso-login-flow",
    title: "Panduan Masuk Satu Pintu Menggunakan Akun Kampus",
    summary: "Alur masuk E-Learning melalui layanan SSO kampus.",
    category: "User & Akses",
    roles: all,
    keywords: ["masuk akun", "login", "kata sandi", "keamanan akun", "portal kampus"],
    steps: ["Klik Masuk dengan SSO UAY.","Isi identitas dan kata sandi pada halaman SSO kampus.","Setelah verifikasi berhasil, Anda kembali ke E-Learning."],
    content: "E-Learning menggunakan layanan SSO kampus. Identitas masuk mengikuti akun yang diberikan kampus; tidak selalu NIM atau NIDN. Untuk kendala akun atau kata sandi, hubungi pengelola SSO kampus.",
    related: ["getting-started", "roles"]
  },
  {
    id: "roles",
    title: "Peran Pengguna & Hak Akses Fitur",
    summary: "Hak akses Mahasiswa, Dosen, Admin Prodi, dan Super Admin.",
    category: "User & Akses",
    roles: all,
    keywords: ["peran", "hak akses", "dosen", "mahasiswa", "admin prodi", "pimpinan"],
    content: "Mahasiswa mengakses aktivitas pada kelas dengan kepesertaan aktif. Dosen mengelola kelas yang diampu. Admin Prodi mengelola kelas dalam cakupan prodinya dan dapat membaca pengaturan akademik global. Hanya Super Admin dapat mengubah pengaturan global.",
    related: ["department-isolation", "multi-affiliation"]
  },
  {
    id: "department-isolation",
    title: "Pengelompokan Kelas Berdasarkan Program Studi",
    summary: "Penyusunan tampilan kelas dan mahasiswa agar rapi sesuai program studi masing-masing.",
    category: "Tata Kelola Akademik",
    roles: staff,
    keywords: ["program studi", "prodi", "kelas", "fakultas", "daftar mahasiswa"],
    content: "Admin Prodi melihat dan mengelola data dalam cakupan prodi yang diberikan kepada akunnya. Dosen mengelola kelas yang ditugaskan kepadanya, termasuk penugasan lintas prodi. Mahasiswa melihat kelas yang diikutinya.",
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
    steps: ["Buka Kelas Saya.","Pilih kelas yang ingin dibuka.","Lihat pertemuan, materi, tugas, kuis, dan presensi yang tersedia. Jumlah pertemuan mengikuti pengaturan kelas."],
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
    steps: ["Buka kelas dan tab Presensi saat sesi dibuka.","Klik Isi Presensi (PIN) jika sesi memakai kode, atau Konfirmasi Hadir (1-Klik) jika tanpa kode.","Untuk sesi berkode, masukkan kode 6 karakter yang diberikan dosen, lalu klik Simpan semua perubahan.","Pastikan status kehadiran tampil setelah server mengonfirmasi."],
    content: "Presensi mandiri hanya tersedia jika dosen mengizinkannya dan sesi sedang terbuka dalam jadwalnya. Kode dapat berisi huruf dan angka. Mahasiswa memperoleh kode dari dosen; aplikasi tidak menampilkan kode pengelola kepada mahasiswa.",
    related: ["attendance-rules", "courses"]
  },
  {
    id: "attendance-lecturer",
    title: "Pengelolaan Lembar Presensi Kelas oleh Dosen",
    summary: "Membuka sesi presensi, menampilkan kode proyektor, dan mengisi kehadiran mahasiswa.",
    category: "Presensi Perkuliahan",
    roles: staff,
    keywords: ["presensi manual", "buka presensi", "kode presensi", "tandai semua hadir", "dosen"],
    steps: ["Buka kelas dan tab Presensi.","Buat atau buka sesi. Aktifkan penggunaan kode bila diperlukan.","Gunakan Tampilan Proyektor untuk memperlihatkan kode 6 karakter kepada mahasiswa.","Buka presensi manual untuk mengatur Hadir, Izin, Sakit, Alpa, atau Terlambat dan catat keterangannya.","Simpan perubahan dan tutup sesi sesuai jadwal."],
    content: "Pengelola kelas yang berhak dapat menampilkan kode serta memperbarui catatan presensi. Perubahan tetap mengikuti akses kelas dan status arsip.",
    related: ["attendance-recap", "attendance-rules"]
  },
  {
    id: "attendance-recap",
    title: "Rekapitulasi Kehadiran & Ambang Kelayakan Ujian",
    summary: "Memantau persentase kehadiran mahasiswa dan mengekspor lembar rekap presensi.",
    category: "Presensi Perkuliahan",
    roles: staff,
    keywords: ["rekap presensi","ambang kehadiran","syarat ujian","csv"],
    steps: ["Buka tab Presensi.","Pilih Rekapitulasi Kehadiran.","Lihat ambang yang tercantum pada rekap dan indikator kelayakan mahasiswa.","Klik Ekspor CSV untuk mengunduh rekap."],
    content: "Persentase adalah (Hadir + Terlambat) dibagi jumlah sesi. Izin, Sakit, dan Alpa tetap ditampilkan tetapi tidak menambah persentase. Kelayakan dibandingkan dengan ambang global tersimpan yang ditetapkan Super Admin; angka awalnya 75% dan dapat berubah. Tanpa sesi, persentase awal ditampilkan 100%.",
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
    title: "Progres Modul PDF, Video Unggahan, dan Video Sematan",
    summary: "Cara sistem mendeteksi kemajuan membaca materi modul dan menyimak video perkuliahan.",
    category: "Materi & Media",
    roles: all,
    keywords: ["progress", "video", "pdf", "ppt", "slide", "selesai membaca"],
    content: "Modul PDF mencatat halaman yang dibuka. Video yang diunggah mencatat durasi menonton melalui pemutar aplikasi. Video sematan dari layanan lain tidak mengirim progres menonton yang sama: gunakan tombol Tandai Selesai Menonton setelah menyimaknya. Indikator selesai mengikuti syarat materi yang ditetapkan dosen.",
    related: ["material-download", "manage-material"]
  },
  {
    id: "material-download",
    title: "Ketentuan Unduh Berkas Bahan Ajar",
    summary: "Penjelasan pembukaan tombol unduh materi setelah mahasiswa menyelesaikan bahan ajar.",
    category: "Materi & Media",
    roles: all,
    keywords: ["unduh materi", "download", "baca tuntas", "persyaratan unduh"],
    content: "Akses berkas mengikuti kepesertaan aktif, visibilitas materi, dan jadwal pertemuan maupun materi. Pada modul PDF, dosen dapat menetapkan persentase halaman minimum sebelum unduhan. Periksa syarat yang tampil pada materi; berkas lampiran dapat diunduh melalui tombolnya saat akses tersedia.",
    related: ["progress-material"]
  },
  {
    id: "manage-material",
    title: "Mengunggah & Mengelola Bahan Ajar",
    summary: "Panduan dosen mengunggah modul kuliah, bahan tayang presentasi, dan tautan video materi.",
    category: "Materi & Media",
    roles: staff,
    keywords: ["unggah materi", "upload pdf", "upload video", "ppt", "bahan ajar"],
    steps: ["Buka kelas dan pertemuan yang dituju.","Klik Tambah Materi.","Pilih jenis materi yang tersedia, misalnya Modul PDF, Video Pembelajaran, atau materi teks/praktikum.","Unggah berkas atau isi tautan sematan yang diizinkan. PPTX dapat digunakan sebagai lampiran.","Atur visibilitas dan jadwal materi, lalu simpan."],
    content: "Modul PDF dan video unggahan dibuka melalui pemutar aplikasi. Video sematan menggunakan pemutar layanan asal. Penggunaan data dan kecepatan pemutaran bergantung pada ukuran berkas, koneksi, dan layanan yang digunakan.",
    related: ["progress-material", "class-cloning"]
  },
  {
    id: "class-cloning",
    title: "Menduplikasi (Kloning) Kelas ke Semester Baru",
    summary: "Cara praktis menyalin materi dan struktur kelas ke semester baru tanpa membawa data mahasiswa lama.",
    category: "Siklus Kelas & Kloning",
    roles: staff,
    keywords: ["clone kelas", "duplikasi kelas", "semester baru", "tahun ajaran baru"],
    steps: ["Buka kelas yang ingin diduplikasi.","Klik Duplikasi.","Isi nama kelas dan tahun akademik tujuan.","Konfirmasikan duplikasi, lalu sesuaikan materi dan jadwal kelas baru."],
    content: "Duplikasi menyalin struktur pertemuan, materi, tugas, kuis, dan kategori penilaian ke kelas baru berstatus draf. Peserta, jawaban, dan nilai lama tidak disalin; jadwal aktivitas dikosongkan untuk diatur kembali. Skala nilai kelas baru memakai default global saat duplikasi dibuat.",
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
    content: "Format yang diizinkan mencakup PDF, DOCX, PPTX, gambar, ZIP, dan video MP4/WebM sesuai tujuan unggahan. Program seperti EXE dan BAT ditolak. " + uploadLimitsText + " Batas memakai 1 MB = 1.048.576 byte dan tetap diperiksa server.",
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
    content: "Aplikasi mengirim jawaban secara berkala sekitar setiap tiga detik. Perhatikan indikator tersimpan di server. Jika koneksi terputus, jawaban yang belum diterima server belum tersimpan. Anda dapat melanjutkan percobaan yang masih aktif selama batas waktu belum berakhir.",
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
    content: "Buku Nilai menghitung draf berdasarkan bobot kategori dan sumber nilai yang diatur pada kelas. Total bobot harus 100%. Mahasiswa melihat nilai akhir setelah pengelola menerbitkannya. Skala konversi mengikuti kebijakan kelas; perubahan default global hanya digunakan pada kelas baru dan tidak menghitung ulang nilai terbit.",
    related: ["quiz-results", "assignments"]
  },
  {
    id: "rector-dashboard-bridging",
    title: "Ringkasan Aktivitas Perkuliahan untuk Administrator",
    summary: "Membaca ringkasan kelas dan aktivitas dalam cakupan akses administrator.",
    category: "Integrasi Sistem",
    roles: admins,
    keywords: ["pimpinan", "ringkasan perkuliahan", "keaktifan dosen", "monitoring akademik"],
    content: "Beranda administrator menampilkan ringkasan kelas, peserta, dan aktivitas sesuai cakupan akses. Statistik membantu pemeriksaan kegiatan yang tercatat di aplikasi; tindak lanjut akademik tetap dilakukan pengelola kampus.",
    related: ["roles", "security"]
  },
  {
    id: "security",
    title: "Keamanan Akun & Perlindungan Data Pribadi",
    summary: "Panduan menjaga keamanan akun perkuliahan dan privasi informasi akademik.",
    category: "Keamanan Sistem",
    roles: all,
    keywords: ["keamanan akun", "kata sandi", "privasi", "tips aman", "logout"],
    steps: ["Jaga kerahasiaan akun dan kata sandi.","Klik Keluar setelah memakai komputer bersama.","Gunakan alamat E-Learning yang diberikan kampus."],
    content: "Akses data mengikuti peran, penugasan kelas, dan kepesertaan. Laporkan masalah akses kepada pengelola kampus dengan menyertakan pesan yang ditampilkan aplikasi.",
    related: ["sso-login-flow"]
  },
  {
    id: "troubleshooting",
    title: "Panduan Penanganan Kendala Operasional Umum",
    summary: "Langkah mudah penanganan jika gagal masuk, presensi belum muncul, atau kendala mengunduh materi.",
    category: "Bantuan & FAQ",
    roles: all,
    keywords: ["kendala", "gagal masuk", "solusi", "troubleshooting", "bantuan"],
    steps: ["Periksa koneksi dan muat ulang halaman bila perlu.","Jika gagal masuk, periksa identitas yang diminta halaman SSO dan hubungi pengelola akun.","Jika presensi belum tersedia, periksa jadwal dan konfirmasikan kepada dosen bahwa sesi telah dibuka.","Jika unduhan ditolak, periksa status kepesertaan, jadwal, dan syarat progres yang ditampilkan materi.","Jika penyimpanan gagal, perhatikan pesan kegagalan dan coba lagi. Hubungi bantuan kampus dengan pesan yang muncul."],
    content: "Indikator berhasil muncul setelah server menerima perubahan. Untuk kendala yang berulang, catat aktivitas, waktu, dan pesan kegagalan agar pengelola dapat memeriksanya.",
    related: ["getting-started", "attendance-student"]
  },
  {
    id: "faq-attendance",
    title: "FAQ: Pertanyaan yang Sering Diajukan Seputar Presensi",
    summary: "Jawaban pertanyaan umum seputar kehadiran perkuliahan dan aturan presensi kelas.",
    category: "Bantuan & FAQ",
    roles: all,
    keywords: ["faq presensi", "tanya jawab presensi", "izin sakit", "lupa absen", "kuota kehadiran"],
    content: "Jika lupa presensi, hubungi dosen untuk pemeriksaan dan pencatatan manual. Ambang kehadiran mengikuti pengaturan Super Admin dan tercantum pada rekap. Izin dan Sakit dicatat terpisah dari Alpa, tetapi persentase kehadiran dihitung dari Hadir dan Terlambat saja.",
    related: ["attendance-student", "attendance-lecturer", "attendance-rules"]
  }
];

export default helpArticles;
