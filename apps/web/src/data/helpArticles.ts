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
    summary: "Login via SSO Keycloak, navigasi menu, profil pengguna, dan keluar dari sistem.",
    category: "Mulai Menggunakan Sistem",
    roles: all,
    keywords: ["login", "sso", "logout", "navigasi", "profil", "keycloak"],
    steps: [
      "Buka alamat resmi E-Learning UAY.",
      "Klik tombol Masuk SSO / Masuk dengan SSO UAY.",
      "Masukkan NIM/NIDN dan kata sandi pada portal login resmi Keycloak UAY.",
      "Sistem memverifikasi akun dan otomatis mengarahkan Anda ke Dashboard E-Learning sesuai kewenangan peran akun Anda.",
      "Gunakan tombol Keluar di menu profil setelah selesai beraktivitas."
    ],
    content: "E-Learning UAY terintegrasi penuh dengan Single Sign-On (SSO) Universitas Achmad Yani. Anda tidak perlu membuat akun baru; gunakan akun SSO resmi universitas. Antarmuka dan fitur yang tampil otomatis menyesuaikan peran akun (Mahasiswa, Dosen, atau Administrator).",
    related: ["sso-login-flow", "roles"]
  },
  {
    id: "sso-login-flow",
    title: "Kebijakan Login SSO & Keamanan Zero-Trust",
    summary: "Penjelasan mengapa login dialihkan ke portal SSO resmi dan tidak ada form login mandiri.",
    category: "User & Akses",
    roles: all,
    keywords: ["sso", "redirect", "keamanan", "zero-trust", "mfa", "password"],
    steps: [
      "Klik tombol Masuk SSO pada header E-Learning.",
      "Browser dialihkan ke https://sso.uay.ac.id/...",
      "Lakukan autentikasi dan verifikasi MFA (bila aktif).",
      "Keycloak mengembalikan browser ke E-Learning dengan token sesi aman."
    ],
    content: "Demi menjaga keamanan kredensial sivitas akademika UAY, E-Learning UAY menerapkan standar Zero-Trust OIDC Authorization Code Flow dengan PKCE (S256). E-Learning tidak menyimpan atau meminta kata sandi Anda secara langsung, mencegah pencurian kredensial (credential harvesting) dan memungkinkan Single Sign-On di seluruh portal kampus.",
    related: ["getting-started", "roles"]
  },
  {
    id: "roles",
    title: "Peran Pengguna & Batasan Hak Akses",
    summary: "Kewenangan Super Admin, Admin Prodi, Dosen (Instructor), dan Mahasiswa (Student).",
    category: "User & Akses",
    roles: all,
    keywords: ["role", "akses", "super admin", "admin prodi", "dosen", "mahasiswa", "permission"],
    content: "Mahasiswa berhak mengakses materi, mengisi presensi, mengumpulkan tugas, dan mengerjakan kuis pada kelas yang diikutinya. Dosen mengelola silabus pertemuan, mengunggah materi ajar, membuka sesi presensi, menilai tugas/kuis, serta mengkloning kelas. Admin Prodi memantau kelas pada program studinya dan mengelola penugasan dosen. Super Admin mengelola konfigurasi sistem universitas dan audit trail.",
    related: ["department-isolation", "multi-affiliation"]
  },
  {
    id: "department-isolation",
    title: "Isolasi Program Studi & Perlindungan Data",
    summary: "Pemisahan otomatis data akademik dan pencarian pengguna per program studi.",
    category: "Tata Kelola Akademik",
    roles: staff,
    keywords: ["prodi", "isolasi", "pencarian", "department", "data leak", "fakultas"],
    content: "E-Learning UAY secara otomatis membatasi visibilitas kelas, mata kuliah, dan pencarian pengguna berdasarkan lingkup program studi (departmentScopes). Admin Prodi dan Dosen hanya dapat mencari dan melihat data dari prodi yang sama, menjamin data akademik tidak tercampur antar program studi di lingkungan universitas.",
    related: ["multi-affiliation", "roles"]
  },
  {
    id: "multi-affiliation",
    title: "Penanganan Dosen Multi-Afiliasi (Lebih dari 1 Prodi)",
    summary: "Cara dosen yang mengajar di beberapa program studi mengelola kelas perkuliahan.",
    category: "Tata Kelola Akademik",
    roles: staff,
    keywords: ["multi-afiliasi", "dosen lintas prodi", "teknik informatika", "sistem informasi", "department_scopes"],
    content: "Bagi dosen yang mengajar di lebih dari satu prodi (misal Teknik Informatika dan Sistem Informasi), SSO Keycloak memetakan seluruh afiliasi tersebut ke dalam array claim department_scopes. Di E-Learning, dosen dapat mengampu kelas dan mengakses mahasiswa pada prodi-prodi yang terdaftar tanpa melanggar aturan isolasi data.",
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
      "Buka menu Kelas dari bilah navigasi utama.",
      "Pilih kartu kelas yang ingin dibuka.",
      "Lihat daftar pertemuan (Pertemuan 1 s/d 16) beserta materi, tugas, dan evaluasi aktif."
    ],
    content: "Halaman kelas mengelompokkan aktivitas pembelajaran per pertemuan. Mahasiswa hanya melihat kelas yang sudah terdaftar (enrolled), sedangkan dosen dan admin melihat kelas sesuai penugasan.",
    related: ["section-types", "attendance-student"]
  },
  {
    id: "section-types",
    title: "Jenis Pertemuan (Section Type)",
    summary: "Pilihan jenis pertemuan: Perkuliahan, Praktikum, Seminar, Lokakarya, Ujian, dan Lainnya.",
    category: "Mata Kuliah & Kelas",
    roles: staff,
    keywords: ["section", "jenis pertemuan", "kuliah", "praktikum", "seminar", "lokakarya", "ujian", "lainnya"],
    steps: [
      "Buka kelas dan klik Tambah Pertemuan atau Edit Pertemuan.",
      "Pada dropdown Jenis Section, pilih kategori yang sesuai: Perkuliahan, Praktikum, Seminar, Lokakarya, Ujian, atau Lainnya.",
      "Isi judul dan deskripsi capaian pembelajaran pertemuan, lalu simpan."
    ],
    content: "Pilihan jenis pertemuan membantu mahasiswa memahami format kegiatan belajar pada minggu terkait. Pilihan 'Lainnya' dapat digunakan untuk kegiatan akademik khusus seperti matrikulasi, studi lapangan, kuliah pakar, atau temu alumni.",
    related: ["courses", "manage-material"]
  },
  {
    id: "attendance-student",
    title: "Presensi Mandiri Mahasiswa (Self Check-in)",
    summary: "Langkah mahasiswa mengisi kehadiran saat sesi presensi dibuka oleh dosen di kelas.",
    category: "Presensi Perkuliahan",
    roles: ["STUDENT"],
    keywords: ["presensi", "absensi", "check-in", "kode", "kehadiran", "mahasiswa"],
    steps: [
      "Buka kelas perkuliahan saat jam kuliah berlangsung.",
      "Perhatikan banner Presensi Sedang Berlangsung di bagian atas halaman kelas.",
      "Klik tombol Isi Presensi.",
      "Masukkan Kode 6 Digit yang ditampilkan dosen di layar proyektor kelas.",
      "Tekan Kirim Presensi. Status kehadiran Anda seketika tercatat sebagai Hadir (H)."
    ],
    content: "Presensi mandiri hanya dapat diisi selama sesi dibuka oleh dosen dan sebelum batas waktu berakhir. Kode presensi 6 digit memastikan mahasiswa hadir secara fisik di ruang perkuliahan dan mencegah titip absen.",
    related: ["attendance-rules", "courses"]
  },
  {
    id: "attendance-lecturer",
    title: "Pengelolaan Lembar Presensi Kelas oleh Dosen",
    summary: "Membuka sesi presensi, menampilkan kode/QR proyektor, dan presensi manual mahasiswa.",
    category: "Presensi Perkuliahan",
    roles: staff,
    keywords: ["presensi manual", "buka presensi", "kode presensi", "tandai semua hadir", "dosen"],
    steps: [
      "Buka kelas dan pilih tab Presensi atau klik Presensi pada kartu pertemuan.",
      "Klik Buka Presensi untuk mengaktifkan sesi dan menampilkan Kode 6 Digit / QR Code di proyektor kelas.",
      "Gunakan tombol Cepat 'Set Semua Hadir' jika mayoritas mahasiswa hadir.",
      "Ubah status mahasiswa tertentu yang tidak hadir menjadi Izin (I), Sakit (S), Alpa (A), atau Terlambat (T).",
      "Tambahkan catatan keterangan izin/sakit bila mahasiswa membawa surat izin resmi.",
      "Tutup sesi presensi setelah perkuliahan selesai."
    ],
    content: "Dosen memiliki wewenang penuh untuk melakukan pengisian manual maupun mengoreksi kehadiran mahasiswa sewaktu-waktu jika mahasiswa menyerahkan surat dokter/izin susulan.",
    related: ["attendance-recap", "attendance-rules"]
  },
  {
    id: "attendance-recap",
    title: "Rekapitulasi Kehadiran & Syarat Ujian (Minimal 75%)",
    summary: "Memantau persentase kehadiran mahasiswa dan mengekspor lembar BAP perkuliahan.",
    category: "Presensi Perkuliahan",
    roles: staff,
    keywords: ["rekap presensi", "75 persen", "syarat ujian", "bap", "ekspor excel"],
    steps: [
      "Buka tab Presensi pada kelas terkait.",
      "Pilih sub-tab Rekapitulasi Kehadiran.",
      "Sistem menampilkan tabel persentase kehadiran seluruh mahasiswa dan indikator kelayakan ujian.",
      "Gunakan tombol Ekspor untuk mengunduh rekap dalam format CSV/Excel untuk arsip BAP prodi."
    ],
    content: "Mahasiswa dengan persentase kehadiran di bawah 75% otomatis ditandai terancam gugur ujian sesuai peraturan akademik universitas, membantu dosen dan prodi melakukan evaluasi sebelum masa UTS/UAS.",
    related: ["attendance-lecturer", "grading"]
  },
  {
    id: "attendance-rules",
    title: "Status Kehadiran: Hadir, Izin, Sakit, Alpa, Terlambat",
    summary: "Arti dan konsekuensi dari masing-masing status presensi di E-Learning UAY.",
    category: "Presensi Perkuliahan",
    roles: all,
    keywords: ["hadir", "izin", "sakit", "alpa", "terlambat", "aturan presensi"],
    content: "Hadir (H): Mahasiswa mengikuti perkuliahan penuh. Izin (I): Mahasiswa berhalangan dengan pemberitahuan dan surat resmi. Sakit (S): Mahasiswa melampirkan surat keterangan dokter. Terlambat (T): Mahasiswa hadir melampaui toleransi waktu namun tetap mengikuti kelas. Alpa (A): Mahasiswa tidak hadir tanpa keterangan.",
    related: ["attendance-student", "attendance-lecturer"]
  },
  {
    id: "progress-material",
    title: "Perekaman Progres Belajar: Video, PDF, dan Slide PPT",
    summary: "Cara sistem mendeteksi penyelesaian membaca dokumen modul dan menonton video perkuliahan.",
    category: "Materi & Media",
    roles: all,
    keywords: ["progress", "video", "pdf", "ppt", "slide", "selesai membaca"],
    content: "Progres video direkam berkala berdasarkan detik tontonan sebenarnya (bukan sekadar membuka tab). Progres membaca PDF dan slide PPT dihitung dari rasio halaman yang telah dibuka dan dibaca di viewer sistem. Data progres divalidasi langsung oleh server E-Learning.",
    related: ["material-download", "manage-material"]
  },
  {
    id: "material-download",
    title: "Aturan Unduh Berkas Bahan Ajar (Completion Rule)",
    summary: "Ketentuan pembukaan tombol unduh materi setelah mahasiswa menyelesaikan bahan ajar.",
    category: "Materi & Media",
    roles: all,
    keywords: ["download", "unduh materi", "baca tuntas", "completion"],
    content: "Jika dosen mengaktifkan syarat 'Wajib Tuntas Sebelum Mengunduh', mahasiswa harus menonton video hingga 100% atau membuka seluruh halaman PDF/PPT terlebih dahulu. Setelah tercapai, tombol unduh berkas otomatis aktif.",
    related: ["progress-material"]
  },
  {
    id: "manage-material",
    title: "Mengunggah & Mengelola Bahan Ajar (PDF, PPT, Video)",
    summary: "Panduan dosen mengunggah modul kuliah, bahan tayang presentasi, dan video materi.",
    category: "Materi & Media",
    roles: staff,
    keywords: ["unggah materi", "upload pdf", "upload video", "ppt", "bahan ajar"],
    steps: [
      "Buka kelas dan pilih pertemuan yang dituju.",
      "Klik Tambah Materi.",
      "Pilih tipe materi: Dokumen PDF, Slide Presentasi, atau Video Pembelajaran.",
      "Unggah berkas atau isi tautan materi.",
      "Atur jadwal tayang atau simpan sebagai Draf.",
      "Klik Publikasikan agar dapat diakses mahasiswa."
    ],
    content: "Semua berkas yang diunggah disimpan di UAY File Service dengan perlindungan checksum SHA-256 dan pemutaran video didukung fitur streaming hemat kuota (RFC 7233).",
    related: ["progress-material", "class-cloning"]
  },
  {
    id: "class-cloning",
    title: "Menduplikasi (Clone) Kelas ke Semester Baru",
    summary: "Cara menduplikasi materi dan struktur kelas tanpa membawa mahasiswa lama atau jadwal kedaluwarsa.",
    category: "Siklus Kelas & Kloning",
    roles: staff,
    keywords: ["clone kelas", "duplikasi kelas", "semester baru", "tahun ajaran", "jadwal kedaluwarsa"],
    steps: [
      "Buka kelas yang ingin diduplikasi.",
      "Klik tombol Titik Tiga / Menu Aksi di header kelas, lalu pilih Duplikasi Kelas.",
      "Pilih Tahun Ajaran & Semester baru (misal: 2026/2027 Ganjil).",
      "Pilih Nama Kelas baru (misal: Pemrograman Web - Kelas A).",
      "Pilih strategi jadwal: Reset ke Draf Bersih (Rekomendasi) atau Geser Jadwal.",
      "Klik Konfirmasi Duplikasi."
    ],
    content: "Mesin kloning E-Learning UAY secara otomatis mereset jadwal kedaluwarsa pada tugas dan kuis, serta menyetel seluruh materi ke status DRAF agar dosen dapat mengaturnya kembali sesuai kalender akademik baru. Mahasiswa angkatan lama TIDAK diikutkan ke kelas baru, sehingga peserta kelas baru dimulai dari 0 mahasiswa.",
    related: ["courses", "manage-material"]
  },
  {
    id: "assignments",
    title: "Pengumpulan Tugas Kuliah & Praktikum",
    summary: "Alur mahasiswa mengunggah dokumen tugas, link repositori, dan membaca batas waktu.",
    category: "Tugas & Evaluasi",
    roles: all,
    keywords: ["tugas", "praktikum", "submission", "deadline", "unggah tugas"],
    steps: [
      "Buka tugas dari pertemuan terkait.",
      "Baca petunjuk, rubrik penilaian, dan batas waktu pengumpulan (deadline).",
      "Pilih format pengumpulan: Unggah Berkas (PDF/ZIP) atau Kirim Tautan (URL Repositori/Drive).",
      "Klik Kirim Tugas. Pastikan status berubah menjadi Terkumpul (Submitted)."
    ],
    content: "Mahasiswa dapat memperbarui tugas sebelum batas waktu berakhir. Jika dosen mengaktifkan batas keterlambatan (cutoff date), pengumpulan setelah deadline akan ditandai Terlambat.",
    related: ["grading", "file-safety"]
  },
  {
    id: "file-safety",
    title: "Format Berkas yang Diizinkan & Batasan Ukuran",
    summary: "Ketentuan jenis file yang aman untuk pengumpulan tugas dan bahan ajar.",
    category: "Keamanan Sistem",
    roles: all,
    keywords: ["tipe file", "format aman", "pdf", "zip", "ukuran maksimum"],
    content: "Sistem menerima format dokumen (PDF, DOCX), presentasi (PPTX), gambar (PNG, JPG), arsip kode (ZIP), dan video MP4. Berkas executable (.exe, .bat, .sh) ditolak demi keamanan kampus. Batas ukuran berkas mengikuti kebijakan File Service (maksimal 50MB per pengumpulan).",
    related: ["assignments"]
  },
  {
    id: "quiz-basics",
    title: "Mengerjakan Kuis & Evaluasi Online",
    summary: "Alur pengerjaan kuis, batas percobaan (attempt), timer, dan ragam jenis soal.",
    category: "Kuis & Ujian",
    roles: all,
    keywords: ["kuis", "quiz", "ujian", "attempt", "timer", "pilihan ganda", "essay"],
    steps: [
      "Buka kuis dari pertemuan perkuliahan.",
      "Baca instruksi: batas percobaan (attempt), durasi pengerjaan, dan batas waktu kuis.",
      "Klik Mulai Kuis.",
      "Jawab soal (Pilihan Tunggal, Jamak, Benar/Salah, Menjodohkan, Mengurutkan, atau Uraian/Essay).",
      "Klik Kirim Jawaban sebelum timer habis."
    ],
    content: "Jawaban tersimpan otomatis di perangkat Anda selama pengerjaan. Jika koneksi terputus sesaat, Anda dapat memuat ulang halaman dan melanjutkan pengerjaan selama durasi waktu kuis masih berjalan.",
    related: ["timer-modes", "quiz-results"]
  },
  {
    id: "timer-modes",
    title: "Mode Timer Kuis: Independen vs Serentak",
    summary: "Perbedaan durasi kuis individu dan batas akhir jadwal kuis serentak.",
    category: "Kuis & Ujian",
    roles: all,
    keywords: ["timer", "independen", "serentak", "deadline kuis", "durasi"],
    content: "Mode Independen memberikan durasi penuh (misal 60 menit) sejak mahasiswa menekan tombol mulai, selama masih dalam rentang buka kuis. Mode Serentak memotong waktu pengerjaan tepat pada jam batas akhir kuis meskipun mahasiswa baru mulai mengerjakan 10 menit sebelum kuis ditutup.",
    related: ["quiz-basics"]
  },
  {
    id: "quiz-results",
    title: "Publikasi Hasil Kuis & Umpan Balik Nilai",
    summary: "Ketentuan kapan mahasiswa dapat melihat nilai dan review jawaban kuis.",
    category: "Kuis & Ujian",
    roles: all,
    keywords: ["nilai kuis", "publikasi nilai", "review jawaban", "skor"],
    content: "Nilai soal pilihan ganda dihitung otomatis oleh server. Untuk soal uraian/essay, nilai akhir akan diperbarui setelah dosen menyelesaikan koreksi manual. Dosen dapat memilih mode rilis nilai: Langsung Selesai, Manual oleh Dosen, atau Terjadwal.",
    related: ["grading", "quiz-basics"]
  },
  {
    id: "grading",
    title: "Koreksi Tugas, Uraian Essay, dan Buku Nilai (Gradebook)",
    summary: "Panduan dosen menilai jawaban mahasiswa dan menetapkan bobot penilaian.",
    category: "Penilaian & Rekap",
    roles: staff,
    keywords: ["koreksi", "gradebook", "menilai tugas", "rubrik", "bobot nilai"],
    steps: [
      "Buka kelas dan pilih tab Buku Nilai (Gradebook) atau buka tugas terkait.",
      "Lihat daftar mahasiswa yang sudah mengumpulkan tugas atau menyelesaikan kuis.",
      "Buka submisi mahasiswa, berikan skor nilai (0-100) dan catatan feedback konstruktif.",
      "Klik Simpan Nilai."
    ],
    content: "Buku nilai menghitung akumulasi nilai akhir mahasiswa secara otomatis berdasarkan persentase bobot kategori (Tugas, Kuis, UTS, UAS, dan Progres Belajar) yang telah ditetapkan pada awal semester.",
    related: ["quiz-results", "assignments"]
  },
  {
    id: "rector-dashboard-bridging",
    title: "Integrasi Telemetri ke Dashboard Rektor UAY",
    summary: "Pemantauan aktivitas akademik dan produktivitas perkuliahan oleh pimpinan universitas.",
    category: "Integrasi Sistem",
    roles: admins,
    keywords: ["dashboard rektor", "bridging", "telemetri", "monitoring rektor", "snapshot"],
    content: "E-Learning UAY menyediakan endpoint bridging aman (/api/v1/integrations/rector/snapshot) yang menyuplai data agregat aktivitas akademik (keaktifan dosen, jumlah kelas berjalan, silabus terbit, dan penyelesaian koreksi) ke Dashboard Rektor UAY tanpa membuka data pribadi mahasiswa.",
    related: ["roles", "security"]
  },
  {
    id: "security",
    title: "Prinsip Keamanan Sistem & Perlindungan Privasi",
    summary: "Standar enkripsi, pembatasan session cookie, dan pencegahan kecurangan akademik.",
    category: "Keamanan Sistem",
    roles: all,
    keywords: ["keamanan", "enkripsi", "cookie", "privasi", "audit log"],
    content: "Semua komunikasi data dilindungi protokol HTTPS TLS 1.3, autentikasi berbasis HTTP-Only Secure Cookie, dan verifikasi peran berlapis di sisi server. Seluruh aktivitas pengelolaan data penting tercatat di jejak audit (Audit Log).",
    related: ["sso-login-flow"]
  },
  {
    id: "troubleshooting",
    title: "Panduan Penanganan Kendala (Troubleshooting Umum)",
    summary: "Langkah penanganan jika gagal login, presensi tidak muncul, atau kendala unduh materi.",
    category: "Bantuan & FAQ",
    roles: all,
    keywords: ["error", "kendala", "gagal login", "troubleshooting", "bantuan"],
    steps: [
      "Periksa status koneksi internet dan pastikan browser dalam versi mutakhir.",
      "Jika gagal login SSO, pastikan akun universitas Anda dalam status aktif di portal SSO.",
      "Jika presensi mandiri tidak terbuka, konfirmasikan ke dosen apakah sesi sudah dibuka dan kode sudah sesuai.",
      "Jika materi tidak bisa diunduh, pastikan video atau halaman dokumen telah diselesaikan tuntas.",
      "Bila kendala berlanjut, hubungi Helpdesk IT UAY dengan menyertakan tangkapan layar pesan error."
    ],
    content: "Sebagian besar kendala disebabkan oleh sesi login yang kedaluwarsa atau aturan prasyarat materi yang belum terpenuhi. Membersihkan cache browser atau login ulang via SSO dapat menyelesaikan sebagian besar masalah tampilan.",
    related: ["getting-started", "attendance-student"]
  },
  {
    id: "faq-attendance",
    title: "FAQ: Pertanyaan Seputar Presensi Perkuliahan",
    summary: "Jawaban pertanyaan yang sering diajukan mengenai sistem absensi kelas.",
    category: "Bantuan & FAQ",
    roles: all,
    keywords: ["faq presensi", "titip absen", "izin dokter", "lupa absen", "kuota kehadiran"],
    content: "T: Bagaimana jika saya lupa memasukkan kode presensi di kelas? J: Segera lapor ke dosen pengampu agar dosen dapat mengubah status Anda secara manual di lembar presensi kelas. T: Berapa minimal kehadiran untuk ikut ujian? J: Minimal 75% dari total pertemuan perkuliahan. T: Apakah surat sakit dihitung alpa? J: Tidak, surat dokter dicatat sebagai Sakit (S) dan dipertimbangkan dalam persentase evaluasi akademik.",
    related: ["attendance-student", "attendance-lecturer", "attendance-rules"]
  }
];

export default helpArticles;
