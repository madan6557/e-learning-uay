import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const sourcePath = "docs/requirements/Technical Design - E-Learning UAY - v5.0.md";
const source = readFileSync(sourcePath, "utf8");
const roles = [
  "Mahasiswa",
  "Dosen",
  "Admin Prodi",
  "Super Admin",
  "Rektor",
  "Operator / DevOps",
];
const cases = [];
const familyRanges = {
  ACC: 6,
  SDH: 6,
  TDH: 6,
  CRS: 8,
  ENR: 9,
  SEC: 8,
  RES: 8,
  QZ: 13,
  ASG: 11,
  GRD: 9,
  FDB: 6,
  ANN: 5,
  NOT: 7,
  FIL: 9,
  PRG: 6,
  ATT: 6,
  ISO: 3,
  REC: 3,
};
const modules = {
  ACC: "SSO & akses",
  SDH: "Dashboard mahasiswa",
  TDH: "Dashboard dosen",
  CRS: "Mata kuliah & kelas",
  ENR: "Peserta",
  SEC: "Pertemuan",
  RES: "Materi & editor",
  QZ: "Kuis & bank soal",
  ASG: "Tugas",
  GRD: "Nilai & gradebook",
  FDB: "Feedback & draf",
  ANN: "Pengumuman",
  NOT: "Notifikasi",
  FIL: "File Service",
  PRG: "Progres belajar",
  ATT: "Presensi & kehadiran",
  ISO: "Isolasi Program Studi",
  REC: "Pemantauan Akademik & integrasi rektor",
  HELP: "Bantuan & panduan sesuai peran",
  AUD: "Jejak audit",
  OPS: "Operasional",
  FUT: "Rilis lanjutan",
  PILOT: "Kesiapan pilot",
  CE: "Cause-effect",
  BVA: "Boundary value",
};
const counters = {};
function add(
  family,
  role,
  section,
  title,
  data,
  action,
  expected,
  options = {},
) {
  const id =
    options.id ??
    `TC-${family}-${String((counters[family] = (counters[family] ?? 0) + 1)).padStart(3, "0")}`;
  const contexts = {
    ACC: "Buka landing, profil atau menu akses yang disebut pada data uji.",
    SDH: "Buka Dashboard mahasiswa dan siapkan kelas uji QA-V5 yang diikuti akun ini.",
    TDH: "Buka Dashboard sesuai peran dan siapkan kelas uji QA-V5 dalam kewenangan akun ini.",
    CRS: "Buka pengelolaan mata kuliah/kelas; gunakan kelas uji QA-V5 terpisah.",
    ENR: "Buka kelas uji QA-V5 → Peserta.",
    SEC: "Buka kelas uji QA-V5 → Pertemuan.",
    RES: "Buka kelas uji QA-V5 → Materi; gunakan editor atau detail materi sesuai kasus.",
    QZ: "Buka kelas uji QA-V5 → Kuis / Bank soal; gunakan kuis terpisah untuk kasus ini.",
    ASG: "Buka kelas uji QA-V5 → Tugas; siapkan tugas dan jawaban sesuai data uji.",
    GRD: "Buka kelas uji QA-V5 → Nilai; siapkan kategori dan jawaban sesuai data uji.",
    ANN: "Buka kelas uji QA-V5 → Pengumuman.",
    NOT: "Buka pusat notifikasi; siapkan aktivitas pada kelas uji QA-V5.",
    ATT: "Buka kelas uji QA-V5 → Presensi; gunakan sesi presensi sesuai data uji.",
    ISO: "Buka menu pencarian pengguna atau manajemen akademik pada prodi terkait.",
    REC: "Buka endpoint bridging /api/v1/integrations/rector/snapshot dengan bearer token.",
    AUD: "Buka kelas uji QA-V5 → Jejak audit dengan akun yang berwenang.",
    OPS: "Buka runbook staging dan alat pemantauan untuk komponen yang diuji.",
    FUT: "Pastikan fitur tersedia pada rilis yang diuji; jika belum tersedia, catat Terblokir.",
    PILOT:
      "Buka checklist acceptance pilot dan kumpulkan bukti dari kasus terkait.",
  };
  const navigation =
    options.navigation ??
    contexts[family] ??
    "Buka kelas uji QA-V5 terpisah dan fitur yang disebut pada data uji.";
  const login =
    role === "Operator / DevOps"
      ? "Gunakan lingkungan staging atau database terisolasi; catat versi aplikasi dan waktu mulai."
      : `Masuk sebagai ${role} melalui SSO / pemilih akun demonstrasi; pastikan peran di profil benar.`;
  const sectionLine =
    source
      .split("\n")
      .findIndex((line) =>
        new RegExp(`^#{2,4} ${section.replaceAll(".", "\\.")}[ .:]`).test(line),
      ) + 1;
  cases.push({
    id,
    priority: options.priority ?? "P0",
    role,
    module: modules[family] ?? family,
    family,
    title,
    type: options.type ?? "Fungsional",
    section,
    sourceLine: options.sourceDocument ? 1 : sectionLine || 1,
    ...(options.sourceDocument ? { sourceDocument: options.sourceDocument } : {}),
    requirements:
      options.requirements ??
      (familyRanges[family]
        ? [`${family}-001–${String(familyRanges[family]).padStart(3, "0")}`]
        : []),
    preconditions:
      options.preconditions ??
      (options.scope === "external"
        ? [
            "Lingkungan staging/layanan kampus untuk kasus ini tersedia; gunakan akun dan data uji terpisah.",
            "Siapkan akses komponen, runbook dan pemilik layanan yang terkait.",
          ]
        : options.scope === "future"
          ? [
              "Rilis P1/P2 yang diuji menyediakan fitur ini; catat Terblokir jika belum tersedia.",
              "Gunakan kelas dan akun uji terpisah dalam kewenangan peran kasus.",
            ]
          : [
              "Lingkungan lokal aktif: E-Learning 127.0.0.1:5173, SSO dan File Service fixture.",
              "Gunakan kelas uji terpisah dan dua mahasiswa: peserta aktif A serta B untuk uji isolasi.",
            ]),
    data,
    steps: options.steps ?? [
      {
        action: login,
        expected: "Lingkungan dan identitas uji sesuai peran kasus.",
      },
      {
        action: navigation,
        expected:
          options.setupExpected ??
          "Konteks kelas/fitur uji tersedia sesuai hak akses.",
      },
      { action, expected },
      {
        action:
          options.verify ??
          "Muat ulang halaman dan periksa data tersimpan, pesan, serta respons jaringan yang berkaitan.",
        expected: options.verifyExpected ?? expected,
      },
    ],
    expected,
    cleanup:
      options.cleanup ??
      "Catat hasil dan bukti; kembalikan konfigurasi kelas uji jika kasus mengubahnya.",
    automation: options.automation ?? null,
    manualReason:
      options.manualReason ??
      "Verifikasi antarmuka dan alur pengguna memerlukan pengujian manual.",
    tags: options.tags ?? [],
    scope: options.scope ?? "local",
    priorityBasis:
      options.priorityBasis ??
      "Prioritas diturunkan dari cakupan rilis §3.1; bukan pemetaan per butir requirement resmi.",
  });
  return id;
}
const unit = (id) => ({
  kind: "unit",
  file: "tests/qa/domain-v5.test.ts",
  title: `[${id}]`,
  scope: "Aturan domain, tanpa browser atau layanan kampus.",
});
const api = (id) => ({
  kind: "api",
  file: "tests/qa/api-v5.test.ts",
  title: `[${id}]`,
  scope:
    "HTTP nyata + PostgreSQL _test; identitas dan layanan eksternal menggunakan fixture.",
});
const existing = (
  file,
  title,
  kind = "api",
  scope = "Assertion regresi terpilih; UI tetap perlu diverifikasi manual.",
) => ({ kind, file, title, scope });

// Document-derived scenarios. Requirement ranges are deliberately kept at family level.
for (const role of roles.slice(0, 4))
  add(
    "ACC",
    role,
    "2.2",
    `Login SSO dan pemetaan peran ${role}`,
    "Akun ACTIVE sesuai peran.",
    "Klik Masuk dengan SSO, selesaikan login, lalu buka dashboard dan profil.",
    "Sesi terbentuk; dashboard dan menu sesuai peran tanpa password lokal.",
    { navigation: "Buka landing E-Learning dalam sesi browser baru." },
  );
add(
  "ACC",
  "Mahasiswa",
  "2.2",
  "Authorization Code + PKCE dan sesi tanpa password",
  "Akun fixture ACTIVE.",
  "Selesaikan login SSO; periksa callback dan /api/v1/me.",
  "JWT/nonce tervalidasi dan sesi HttpOnly terbentuk; data mahasiswa tidak berisi password.",
  {
    automation: existing(
      "tests/integration/oidc.test.ts",
      "PKCE + nonce creates a password-free session",
    ),
  },
);
add(
  "ACC",
  "Mahasiswa",
  "2.2",
  "State, nonce, audience dan akun nonaktif ditolak",
  "State/nonce/audience salah; account_status DISABLED.",
  "Ulangi callback OIDC dengan data tidak sah pada lingkungan fixture.",
  "State/nonce/audience salah ditolak 401; akun nonaktif ditolak 403.",
  {
    type: "Keamanan",
    automation: existing(
      "tests/integration/oidc.test.ts",
      "bad state, nonce, audience and account status are rejected",
    ),
  },
);
add(
  "ACC",
  "Mahasiswa",
  "2.2",
  "Refresh token memvalidasi identitas ulang",
  "Access token sesi kedaluwarsa.",
  "Paksa expiry pada fixture, lalu panggil /me memakai cookie sesi.",
  "SSO menerima refresh; token server berganti dan identitas tervalidasi.",
  {
    automation: existing(
      "tests/integration/oidc.test.ts",
      "refresh rotates server-side tokens and revalidates identity",
    ),
  },
);
add(
  "ACC",
  "Super Admin",
  "2.2",
  "Webhook mencabut sesi pengguna seketika",
  "Webhook HMAC sah untuk akun yang sudah login.",
  "Nonaktifkan akun pada fixture SSO dan kirim webhook bertanda tangan; akses /me kembali.",
  "Akses akun menjadi 403 dan status cache identitas DISABLED.",
  {
    type: "Keamanan",
    automation: existing(
      "tests/integration/oidc.test.ts",
      "signed webhook invalidates active sessions immediately",
    ),
  },
);
add(
  "ACC",
  "Mahasiswa",
  "2.2",
  "Logout membersihkan sesi",
  "Sesi SSO aktif.",
  "Klik Keluar, selesaikan logout provider lalu coba akses /me dengan sesi lama.",
  "Cookie sesi dicabut dan akses /me menjadi 401.",
  {
    automation: existing(
      "tests/integration/oidc.test.ts",
      "logout clears session and provides the provider logout URL",
    ),
  },
);
add(
  "ACC",
  "Super Admin",
  "2.2",
  "Prioritas claim peran dari SSO",
  "roles=[STUDENT], role=SUPER_ADMIN; roles kosong.",
  "Validasikan payload claim campuran pada adapter SSO.",
  "roles resmi menang atas alias role; array roles kosong tidak menaikkan hak akses.",
  {
    type: "Keamanan",
    automation: existing(
      "tests/sso.test.ts",
      "SSO roles take precedence over the legacy role claim",
      "unit",
    ),
  },
);
for (const [id, role, title, path] of [
  ["TC-ACC-ANON", "Mahasiswa", "API tanpa sesi ditolak", "/me"],
  [
    "TC-ACC-OUTSIDER",
    "Mahasiswa",
    "Peserta luar kelas tidak bisa membaca kelas",
    "class",
  ],
  [
    "TC-ACC-STUDENT-ROSTER",
    "Mahasiswa",
    "Mahasiswa tidak bisa melihat roster pengelolaan",
    "participants",
  ],
  [
    "TC-ACC-TEACHER-SCOPE",
    "Dosen",
    "Dosen di luar pengampu tidak bisa mengubah materi",
    "teacher",
  ],
  [
    "TC-ACC-DEPT-SCOPE",
    "Admin Prodi",
    "Admin prodi tidak bisa mengelola prodi lain",
    "department",
  ],
])
  add(
    "ACC",
    role,
    "5.3",
    title,
    `Konteks permintaan: ${path}.`,
    "Akses alamat kelas/endpoint langsung memakai identitas tanpa izin.",
    "API menolak akses dan data kelas lain tidak bocor.",
    { id, type: "Keamanan", automation: api(id) },
  );
add(
  "ACC",
  "Super Admin",
  "1.3",
  "Administrasi identitas tetap di SSO",
  "Akun kampus uji.",
  "Buka profil E-Learning; ikuti tautan kelola akun ke SSO untuk reset password / perubahan akun.",
  "E-Learning menyimpan referensi identitas; administrasi password ada pada SSO.",
  {
    scope: "external",
    manualReason: "Membutuhkan lingkungan dan pemilik SSO kampus.",
  },
);
for (const [family, role, section, rows] of [
  [
    "SDH",
    "Mahasiswa",
    "3.1.1",
    [
      [
        "Kelas aktif sesuai enrollment",
        "Satu kelas peserta dan satu kelas bukan peserta.",
        "Buka dashboard dan daftar kelas.",
        "Hanya kelas yang berhak diakses ditampilkan.",
      ],
      [
        "Timeline tenggat tugas dan kuis",
        "Tugas besok, kuis dua hari lagi, aktivitas tersembunyi.",
        "Bandingkan agenda dengan tanggal aktivitas.",
        "Tenggat aktivitas tersedia diurutkan sesuai jadwal; materi tersembunyi tidak bocor.",
      ],
      [
        "Ringkasan progres mandiri",
        "PDF 5/10 halaman dan video sebagian ditonton.",
        "Buka dashboard setelah belajar; bandingkan detail kelas.",
        "Ringkasan sesuai progres granular mahasiswa sendiri.",
      ],
      [
        "Nilai draf tersembunyi di dashboard",
        "Nilai dosen tersimpan belum dipublikasikan.",
        "Buka dashboard dan tab Nilai; periksa respons jaringan.",
        "Nilai draf tidak tampil dan tidak dikirim ke browser.",
      ],
      [
        "Dashboard kosong mudah dipahami",
        "Akun tanpa enrollment aktif.",
        "Masuk dan buka dashboard.",
        "Status kosong jelas, tanpa angka atau kelas milik orang lain.",
      ],
    ],
  ],
  [
    "TDH",
    "Dosen",
    "3.1.1",
    [
      [
        "Dashboard kelas yang diampu",
        "Satu kelas pengampu dan satu kelas dosen lain.",
        "Buka dashboard dosen dan daftar kelas.",
        "Hanya ruang lingkup pengampu terlihat.",
      ],
      [
        "Antrean jawaban perlu dinilai",
        "Kuis essay dan tugas baru belum dinilai.",
        "Buka dashboard; klik antrean penilaian.",
        "Jumlah antrean sesuai submission belum dinilai dan tautan menuju panel yang benar.",
      ],
      [
        "Akses cepat pembuatan materi",
        "Kelas PUBLISHED yang diampu.",
        "Gunakan aksi cepat tambah materi.",
        "Editor terbuka pada kelas yang tepat tanpa mengubah kelas lain.",
      ],
      [
        "Antrean selesai setelah penilaian",
        "Satu jawaban essay selesai dinilai.",
        "Nilai jawaban lalu kembali ke dashboard.",
        "Jumlah antrean berkurang sesuai data aktual.",
      ],
    ],
  ],
])
  for (const row of rows) add(family, role, section, ...row);
add(
  "TDH",
  "Admin Prodi",
  "3.1.1",
  "Dashboard admin menggunakan ruang lingkup akademik",
  "Admin prodi IF.",
  "Buka dashboard dan navigasi pengelolaan.",
  "Panel pengelolaan sesuai scope prodi tanpa dashboard antrean dosen.",
  {
    automation: existing(
      "tests/dashboard-roles.test.ts",
      "administrators see academic management with their actual scope and no instructor dashboard",
      "unit",
    ),
  },
);

for (const [id, role, title, data, action, expected] of [
  [
    "TC-CRS-CREATE",
    "Super Admin",
    "Buat course dan rombel terhubung",
    "Course QA-V5, prodi IF, rombel A.",
    "Buat course lalu kelas dengan pengampu.",
    "Course dan rombel tersimpan dengan relasi induk dan pengampu yang benar.",
  ],
  [
    "TC-CRS-DRAFT",
    "Mahasiswa",
    "Kelas DRAFT tidak bisa dibaca mahasiswa",
    "Kelas DRAFT; mahasiswa sudah terdaftar.",
    "Tempel alamat langsung kelas draf.",
    "API menolak akses kelas draf.",
  ],
  [
    "TC-CRS-ARCHIVE-WRITE",
    "Dosen",
    "Arsip kelas mengunci penambahan pertemuan",
    "Kelas ARCHIVED.",
    "Tambah pertemuan baru pada kelas arsip melalui UI dan API.",
    "Mutasi ditolak HTTP 423; kelas hanya baca.",
  ],
  [
    "TC-CRS-ARCHIVE-READ",
    "Mahasiswa",
    "Kelas arsip mempertahankan akses baca",
    "Kelas ARCHIVED dengan peserta aktif.",
    "Buka materi dan nilai yang telah diterbitkan.",
    "Peserta tetap dapat membaca riwayat kelas.",
  ],
  [
    "TC-CRS-COURSE-ARCHIVE",
    "Super Admin",
    "Arsip course mengunci kelas turunannya",
    "Course PUBLISHED memiliki dua rombel.",
    "Ubah course ke ARCHIVED, kemudian coba tambah pertemuan pada rombel.",
    "Semua rombel terkunci untuk mutasi; status arsip tercatat di audit.",
  ],
])
  add("CRS", role, "3.1.2", title, data, action, expected, {
    id,
    automation: api(id),
    requirements: [id.includes("ARCHIVE") ? "CRS-007" : "CRS-001–008"],
  });
for (const [title, data, action, expected] of [
  [
    "Edit metadata kelas",
    "Kelas uji dan semester 2026/2027.",
    "Ubah nama, tahun akademik, dan deskripsi kelas lalu simpan.",
    "Metadata tersimpan dan relasi Course tidak berubah.",
  ],
  [
    "Pembatalan konfirmasi arsip",
    "Kelas PUBLISHED.",
    "Klik Arsipkan lalu Batalkan di dialog.",
    "Status kelas tetap PUBLISHED tanpa mutasi audit arsip.",
  ],
  [
    "Clone bersih semester baru",
    "Sumber berisi materi, soal, tugas, kategori, peserta, jawaban, progres dan nilai.",
    "Duplikasi kelas ke semester baru; periksa seluruh tab.",
    "Materi/soal/tugas/bobot disalin; peserta/jawaban/progres/nilai kosong dan tenggat direset.",
  ],
  [
    "Referensi file clone tetap valid",
    "Materi clone memakai ID file sumber.",
    "Buka file dari kedua kelas; coba hapus file yang masih dipakai.",
    "Referensi dapat diakses sesuai izin; file bersama tidak dihapus sepihak.",
  ],
  [
    "Rollback clone yang gagal",
    "Fixture transaksi clone yang digagalkan sebelum semua entitas selesai.",
    "Jalankan clone dengan kegagalan terkontrol pada staging.",
    "Tidak ada kelas atau entitas salinan parsial.",
  ],
])
  add("CRS", "Dosen", "3.1.2", title, data, action, expected, {
    priority: title.includes("Clone") || title.includes("clone") ? "P1" : "P0",
    requirements: ["CRS-008"],
    type: title.includes("Rollback") ? "Ketahanan" : "Fungsional",
  });
for (const [title, data, action, expected] of [
  [
    "Daftarkan peserta manual",
    "Mahasiswa ACTIVE sudah sinkron dari SSO.",
    "Peserta → Tambah peserta → pilih NIM mahasiswa → Simpan.",
    "Enrollment aktif terbentuk satu kali.",
  ],
  [
    "Enrollment mandiri dengan kunci sah",
    "Enrollment key kelas uji.",
    "Mahasiswa masukkan kunci kelas di katalog.",
    "Mahasiswa terdaftar pada rombel yang benar.",
  ],
  [
    "Enrollment key salah ditolak",
    "Kunci tidak cocok.",
    "Masukkan kunci salah.",
    "Enrollment tidak dibuat; pesan menjelaskan penolakan.",
  ],
  [
    "Enrollment duplikat tidak menambah baris",
    "Mahasiswa sudah peserta.",
    "Daftarkan kembali mahasiswa yang sama.",
    "Tidak ada enrollment ganda.",
  ],
  [
    "Peserta dinonaktifkan kehilangan akses",
    "Mahasiswa aktif pada rombel uji.",
    "Dosen nonaktifkan peserta; mahasiswa muat ulang kelas.",
    "Hak baca dan submit peserta tersebut dicabut.",
  ],
  [
    "Tambah pengampu",
    "Dua dosen ACTIVE dari SSO.",
    "Admin tambahkan dosen kedua pada rombel.",
    "Kedua pengampu mendapatkan izin kelas yang tepat.",
  ],
  [
    "Akun SSO tidak dikenal tidak dibuat lokal",
    "NIM yang belum sinkron / tidak dikenal.",
    "Cari NIM dan coba daftar peserta.",
    "Ada penjelasan identitas tidak ditemukan; tidak membuat akun SSO.",
  ],
])
  add(
    "ENR",
    title.startsWith("Enrollment mandiri") || title.startsWith("Enrollment key")
      ? "Mahasiswa"
      : "Dosen",
    "3.1.1",
    title,
    data,
    action,
    expected,
  );
for (const type of [
  "LECTURE",
  "LAB_PRACTICUM",
  "SEMINAR",
  "WORKSHOP",
  "EXAM",
]) {
  const id = `TC-SEC-${type}`;
  add(
    "SEC",
    "Dosen",
    "4.2",
    `Pertemuan bertipe ${type}`,
    `Judul Sesi QA ${type}.`,
    `Buat pertemuan, pilih ${type}, tampilkan ke mahasiswa dan simpan.`,
    "Tipe pertemuan tersimpan dan dapat dibaca peserta.",
    { id, automation: api(id) },
  );
}
for (const row of [
  [
    "Pertemuan tersembunyi",
    "Pertemuan isVisible=false.",
    "Dosen sembunyikan pertemuan; mahasiswa muat ulang kelas.",
    "Pertemuan dan aktivitasnya tidak dapat diakses peserta.",
  ],
  [
    "Jadwal rilis pertemuan",
    "startDate besok dan endDate setelahnya.",
    "Atur rentang jadwal; buka sebagai mahasiswa sebelum pembukaan.",
    "Pertemuan diblokir sampai startDate.",
  ],
  [
    "Rentang tanggal terbalik",
    "startDate setelah endDate.",
    "Simpan jadwal yang terbalik.",
    "Validasi menolak rentang tidak sah.",
  ],
  [
    "Urutan pertemuan atomik",
    "Tiga pertemuan bernomor 1, 2, 3.",
    "Seret pertemuan 3 ke awal; muat ulang sebagai mahasiswa.",
    "Urutan sama untuk dosen dan mahasiswa tanpa indeks ganda.",
  ],
  [
    "Urutan campuran aktivitas",
    "Satu pertemuan berisi materi, kuis dan tugas.",
    "Seret tugas sebelum materi kemudian simpan.",
    "Urutan lintas tipe tetap benar setelah muat ulang.",
  ],
])
  add("SEC", "Dosen", "4.2", ...row);
for (const [type, data, expected] of [
  [
    "RICH_TEXT",
    "Paragraf, rumus dan checklist.",
    "Seluruh blok tersimpan dan dirender aman.",
  ],
  [
    "DOCUMENT",
    "PDF 10 halaman; allowDownload=false.",
    "PDF dapat dibaca; unduhan mengikuti konfigurasi.",
  ],
  [
    "VIDEO_MEDIA",
    "URL embed YouTube/Drive; durasi 100 detik.",
    "Video eksternal dapat diputar dan progres ditangani sesuai provider.",
  ],
  [
    "LAB_PRACTICUM",
    "Dataset ZIP, panduan PDF, Git URL, prasyarat Python.",
    "Dataset, panduan, repositori dan prasyarat tampil.",
  ],
  [
    "VIRTUAL_SIMULATOR",
    "URL dari origin yang diizinkan.",
    "Simulator dapat digunakan dengan sandbox yang aman.",
  ],
  [
    "TELECONFERENCE",
    "Tautan GMeet, waktu mulai, ID dan passcode.",
    "Metadata rapat dan tautan gabung tampil pada jadwal yang sesuai.",
  ],
  [
    "EXTERNAL_LINK",
    "https://example.org/referensi.",
    "Tautan terbuka pada tab baru dengan protokol aman.",
  ],
])
  add(
    "RES",
    "Dosen",
    "3.2",
    `Materi ${type}`,
    data,
    `Tambah materi bertipe ${type}; isi konfigurasi dan terbitkan; buka sebagai mahasiswa.`,
    expected,
    { tags: [type] },
  );
for (const [criterion, expected] of [
  ["AUTOMATIC_ON_VIEW", "Materi selesai setelah dibuka."],
  [
    "MINIMUM_WATCH_PERCENT",
    "Video 84% belum selesai; pada ambang 85% menjadi selesai.",
  ],
  ["ALL_PAGES_VIEWED", "PDF 9/10 belum selesai; 10/10 selesai."],
  ["CONFIRMED_DOWNLOAD", "Materi belum selesai sebelum unduhan dikonfirmasi."],
])
  add(
    "RES",
    "Dosen",
    "4.2",
    `Kriteria selesai ${criterion}`,
    `Kriteria ${criterion}; video ambang 85%; PDF 10 halaman.`,
    `Atur kriteria pada materi lalu lakukan aktivitas mahasiswa tepat sebelum dan pada ambang.`,
    expected,
  );
const blockSamples = {
  paragraph: { text: "<strong>Teori</strong> <em>praktikum</em>" },
  heading: { text: "Judul Bab", level: 2 },
  image: {
    fileObjectId: "qa-image",
    altText: "Rangkaian logika",
    caption: "Gambar 1",
    alignment: "center",
  },
  code_snippet: { code: "print(1)", language: "python", showLineNumbers: true },
  math_latex: { expression: "E=mc^2" },
  callout: {
    title: "Catatan",
    text: "Perhatikan instruksi",
    alertType: "WARNING",
  },
  checklist: {
    items: [{ id: "step-1", text: "Siapkan alat", checked: false }],
  },
  table: {
    rows: [
      ["Nama", "Nilai"],
      ["A", "85"],
    ],
    header: true,
  },
  file_attachment: { fileObjectId: "qa-file", displayName: "modul.pdf" },
  embed_media: { url: "https://www.youtube.com/embed/example", title: "Video" },
  divider: {},
};
for (const [type, data] of Object.entries(blockSamples)) {
  const id = `TC-BLOCK-${type.toUpperCase()}`;
  add(
    "RES",
    "Dosen",
    "3.2.1",
    `Blok ${type}: struktur data valid`,
    JSON.stringify(data),
    `Tambahkan blok ${type} dengan data uji, simpan materi lalu buka kembali.`,
    `Struktur blok ${type} lolos validasi skema; tampilannya diverifikasi manual.`,
    { id, automation: unit(id), tags: ["Block engine"], type: "Validasi" },
  );
}
for (const row of [
  [
    "Slash command editor",
    "/code, /math, /table dan /file.",
    "Ketik / pada editor; pilih blok dengan keyboard.",
    "Menu muncul; blok terpilih ditambahkan di posisi kursor.",
  ],
  [
    "Seret dan duplikasi blok",
    "Paragraf A, B, C.",
    "Duplikasi B, lalu seret C ke paling atas dan simpan.",
    "Isi dan urutan baru tersimpan tanpa kehilangan data.",
  ],
  [
    "Format paragraf kaya",
    "Bold, italic, underline, strike, inline code, link, sorotan dan rumus inline.",
    "Terapkan semua format pada paragraf, simpan lalu buka sebagai mahasiswa.",
    "Seluruh format yang didukung dokumen dipertahankan.",
  ],
  [
    "Anchor heading otomatis",
    "Heading H1, H2 dan H3.",
    "Buat heading dan pilih navigasi daftar isi pada materi.",
    "Navigasi menuju anchor heading yang benar.",
  ],
  [
    "Gambar clipboard dan drag-drop",
    "PNG/JPG kecil dari clipboard.",
    "Tempel gambar, lalu seret gambar lain ke editor; atur caption dan alignment.",
    "Upload melalui File Service; gambar dan metadata tampil.",
  ],
  [
    "Kode: nomor baris dan salin",
    "Python dan TypeScript.",
    "Tambahkan kode, aktifkan nomor baris, lalu tekan Salin kode.",
    "Sintaks disorot, nomor baris tampil, clipboard berisi kode asli.",
  ],
  [
    "Tabel dapat diubah",
    "Tabel 2×2.",
    "Tambah dan hapus baris/kolom; ubah perataan dan header.",
    "Tabel sesuai perubahan setelah disimpan.",
  ],
  [
    "Checklist interaktif",
    "Dua langkah praktikum.",
    "Mahasiswa centang satu item dan muat ulang materi.",
    "Centang tersimpan hanya untuk mahasiswa itu.",
  ],
])
  add(
    "RES",
    row[0].startsWith("Checklist") ? "Mahasiswa" : "Dosen",
    "3.2.1",
    ...row,
  );

const questionScenarios = [
  [
    "SINGLE-OK",
    "Pilihan tunggal benar",
    "SINGLE_CHOICE",
    "Kunci a; bobot 20; jawaban a.",
    20,
  ],
  [
    "SINGLE-WRONG",
    "Pilihan tunggal salah",
    "SINGLE_CHOICE",
    "Kunci a; jawaban b.",
    0,
  ],
  [
    "MULTI-ALL",
    "Pilihan jamak seluruhnya benar",
    "MULTIPLE_SELECT",
    "Kunci a,b; jawaban a,b; bobot 20.",
    20,
  ],
  [
    "MULTI-PARTIAL",
    "Pilihan jamak partial credit",
    "MULTIPLE_SELECT",
    "Kunci a,b,c,d; pilih a,b; bobot 20; partialCredit=true.",
    10,
  ],
  [
    "MULTI-WRONG",
    "Pilihan jamak mengandung opsi salah",
    "MULTIPLE_SELECT",
    "Kunci a,b; pilih a,e; partialCredit=true.",
    0,
  ],
  [
    "MULTI-STRICT",
    "Pilihan jamak all-or-nothing",
    "MULTIPLE_SELECT",
    "Kunci a,b; pilih a; partialCredit=false.",
    0,
  ],
  [
    "TRUE",
    "Benar/salah benar",
    "TRUE_FALSE",
    "Kunci a; pilih a; bobot 20.",
    20,
  ],
  ["FALSE", "Benar/salah salah", "TRUE_FALSE", "Kunci a; pilih b.", 0],
  [
    "SHORT-FOLD",
    "Isian mengabaikan kapital",
    "SHORT_ANSWER",
    "Kunci HTTP; jawaban http; caseSensitive=false.",
    20,
  ],
  [
    "SHORT-CASE",
    "Isian sensitif kapital",
    "SHORT_ANSWER",
    "Kunci HTTP; jawaban http; caseSensitive=true.",
    0,
  ],
  [
    "SHORT-NUMERIC",
    "Numerik pada batas toleransi",
    "SHORT_ANSWER",
    "9.8 ± 0.1; jawaban 9.9.",
    20,
  ],
  [
    "SHORT-OUTSIDE",
    "Numerik di luar toleransi",
    "SHORT_ANSWER",
    "9.8 ± 0.1; jawaban 9.901.",
    0,
  ],
  [
    "MATCH-ALL",
    "Menjodohkan semua pasangan benar",
    "MATCHING",
    "a→b, b→a, c→c; bobot 20.",
    20,
  ],
  [
    "MATCH-PARTIAL",
    "Menjodohkan sebagian benar",
    "MATCHING",
    "2 dari 3 pasangan benar; bobot 20.",
    13.33,
  ],
  [
    "ORDER-OK",
    "Urutan prosedur benar",
    "ORDERING",
    "Kunci b,a,c; jawaban b,a,c.",
    20,
  ],
  [
    "ORDER-WRONG",
    "Urutan prosedur salah",
    "ORDERING",
    "Kunci b,a,c; jawaban a,b,c.",
    0,
  ],
  [
    "ESSAY-PENDING",
    "Essay menunggu penilaian dosen",
    "ESSAY",
    "Jawaban uraian; bobot 20.",
    "manual",
  ],
  [
    "FILE-PENDING",
    "Jawaban berkas menunggu dosen",
    "FILE_UPLOAD",
    "fileObjectId sah; bobot 20.",
    "manual",
  ],
];
for (const [suffix, title, type, data, score] of questionScenarios) {
  const id = `TC-QZ-${suffix}`;
  add(
    "QZ",
    "Mahasiswa",
    "3.3.2",
    title,
    data,
    `Kerjakan satu butir ${type} sesuai data uji dan kirim jawaban.`,
    score === "manual"
      ? "Tidak diberi skor otomatis; memerlukan penilaian dosen."
      : `Mesin penilaian menghasilkan ${score} poin dari bobot 20.`,
    { id, automation: unit(id), tags: [type], type: "Penilaian" },
  );
}
for (const [id, title, expected] of [
  [
    "TC-QZ-BAD-KEY",
    "Kunci tidak ada dalam opsi",
    "Kunci z dengan opsi a,b ditolak.",
  ],
  ["TC-QZ-DUP-OPTIONS", "Opsi duplikat ditolak", "Dua opsi id a ditolak."],
  [
    "TC-QZ-RUBRIC",
    "Total rubrik tidak sama dengan bobot",
    "Rubrik 15+15+10 untuk bobot 30 ditolak.",
  ],
  [
    "TC-QZ-POINTS-NAN",
    "Bobot non-finite ditolak",
    "Bobot NaN/Infinity tidak valid.",
  ],
  [
    "TC-QZ-DISTRIBUTE",
    "Bagi poin menjadi tepat 100",
    "14 bobot 5 didistribusikan menjadi total 100 dengan presisi dua desimal.",
  ],
])
  add(
    "QZ",
    "Dosen",
    "3.3.3",
    title,
    expected,
    "Buka editor kuis dan masukkan konfigurasi sesuai data uji; coba simpan/terbitkan.",
    expected,
    { id, type: "Validasi", automation: unit(id) },
  );
for (const row of [
  [
    "Publikasi STRICT dengan total 85 ditolak",
    "Dua soal total 85; scoreMode=STRICT.",
    "Simpan draf lalu klik Publikasikan kuis.",
    "Tombol publikasi diblokir dengan alasan total harus 100.",
  ],
  [
    "Publikasi STRICT total 100",
    "Soal berbobot 30,40,15,15.",
    "Terbitkan kuis dan buka sebagai mahasiswa.",
    "Kuis dapat dikerjakan dan total skor maksimal 100.",
  ],
  [
    "Normalisasi skor mentah ke 100",
    "scoreMode=NORMALIZED; skor mentah 35 dari 70.",
    "Kerjakan soal untuk memperoleh setengah poin lalu kirim.",
    "Skor akhir kuis 50.00 pada skala 100.",
  ],
  [
    "Randomisasi soal dan opsi",
    "Lima soal dengan opsi berbeda.",
    "Mulai attempt dari dua mahasiswa; bandingkan urutan dan kunci di server.",
    "Pengacakan mempertahankan relasi jawaban dan snapshot stabil dalam attempt.",
  ],
  [
    "Snapshot kuis tidak berubah",
    "Attempt aktif; dosen mengubah butir di bank soal.",
    "Buka kembali attempt yang sama setelah bank soal diedit.",
    "Snapshot attempt tetap sama dan kunci tidak dikirim kepada mahasiswa.",
  ],
  [
    "Autosave jawaban tiga detik",
    "Essay panjang dan pilihan jawaban.",
    "Isi jawaban, tunggu ≥3 detik lalu muat ulang.",
    "Jawaban terakhir tersimpan di server dan dapat dilanjutkan.",
  ],
  [
    "Konflik revisi autosave",
    "Dua tab pada attempt yang sama.",
    "Simpan jawaban berbeda dari revisi yang sama.",
    "Konflik ditangani tanpa menimpa jawaban terbaru secara diam-diam.",
  ],
  [
    "Nilai hibrida menunggu semua essay",
    "Objektif 50/60; essay belum dinilai.",
    "Kirim attempt lalu buka hasil mahasiswa dan antrean dosen.",
    "Attempt NEEDS_GRADING; nilai final belum diterbitkan.",
  ],
  [
    "Penilaian essay per mahasiswa",
    "Dua essay milik satu mahasiswa.",
    "Buka lembar mahasiswa; beri skor dan catatan per soal.",
    "Skor, feedback dan status lengkap tersimpan.",
  ],
  [
    "Penilaian essay per nomor soal",
    "40 jawaban essay pada soal nomor 5.",
    "Pilih mode penilaian per soal; nilai jawaban berurutan.",
    "Jawaban tersusun per butir dengan rubrik konsisten.",
  ],
  [
    "Klik rubrik mengakumulasi skor",
    "Rubrik 15+15+10 untuk essay 40 poin.",
    "Pilih poin rubrik di panel penilaian.",
    "Total dihitung dari rubrik tanpa perhitungan manual.",
  ],
  [
    "Publikasi kuis belum dinilai diblokir",
    "Satu essay belum dinilai.",
    "Coba publikasikan seluruh hasil kuis.",
    "Blocker menyebut jawaban yang belum dinilai.",
  ],
  [
    "Batas jumlah kata essay",
    "maxWords=100; jawaban 101 kata.",
    "Isi essay melebihi batas dan coba kirim.",
    "Batas kata diberlakukan dengan pesan jelas.",
  ],
  [
    "LaTeX di soal dan opsi",
    "Rumus sigma dan pecahan.",
    "Buat soal beserta opsi dengan rumus; tampilkan ke mahasiswa.",
    "Rumus dirender tajam tanpa mengubah teks jawaban.",
  ],
  [
    "Bank soal dapat digunakan ulang",
    "Satu bank soal kelas.",
    "Buat soal, lalu pilih dari bank untuk kuis baru.",
    "Butir disalin dengan opsi, kunci, rubrik dan bobot yang benar.",
  ],
])
  add(
    "QZ",
    row[0].startsWith("Autosave") ||
      row[0].startsWith("Konflik") ||
      row[0].startsWith("Batas jumlah")
      ? "Mahasiswa"
      : "Dosen",
    "3.3",
    ...row,
  );

for (const row of [
  [
    "Pengumpulan teks",
    "Format TEXT; teks laporan uji.",
    "Buka tugas, tulis jawaban dan klik Kumpulkan.",
    "Versi 1 terbentuk dengan timestamp server dan status on-time.",
  ],
  [
    "Pengumpulan tautan",
    "Format LINK; URL Git HTTPS.",
    "Masukkan tautan repositori dan kumpulkan.",
    "Tautan tersimpan sebagai versi jawaban tanpa binary lokal.",
  ],
  [
    "Pengumpulan berkas",
    "Format PDF/ZIP; file siap CLEAN.",
    "Unggah berkas, tunggu verifikasi lalu kumpulkan.",
    "Jawaban mengacu file terverifikasi; ukuran dan MIME sesuai izin tugas.",
  ],
  [
    "Revisi tugas mempertahankan versi lama",
    "v1 sudah terkirim; maxAttempts=3.",
    "Ubah jawaban dan kumpulkan v2 sebelum cutoff.",
    "v1 tetap tersimpan; v2 menjadi jawaban terkini dan perlu dinilai.",
  ],
  [
    "Revisi setelah dinilai",
    "v1 bernilai 80.",
    "Mahasiswa kirim v2; dosen buka antrean.",
    "Jawaban terbaru membutuhkan penilaian baru tanpa menghapus histori v1.",
  ],
  [
    "Attempt tugas melebihi batas",
    "maxAttempts=1 dan v1 sudah dikumpulkan.",
    "Coba kumpulkan versi kedua.",
    "Pengumpulan ditolak dengan alasan batas tercapai.",
  ],
  [
    "Format berkas dilarang",
    "Tugas hanya menerima PDF; berkas .exe.",
    "Pilih berkas yang tidak sesuai dan coba unggah.",
    "Ditolak sebelum menjadi submission.",
  ],
  [
    "Nilai tugas draf disembunyikan",
    "Submission dinilai 70 belum terbit.",
    "Mahasiswa buka detail tugas dan respons jaringan.",
    "Nilai dan feedback draf tidak dikirim kepada mahasiswa.",
  ],
  [
    "Publikasi nilai tugas",
    "Semua submission sudah dinilai.",
    "Dosen klik Publikasikan nilai lalu mahasiswa buka hasil.",
    "Nilai terlihat dan notifikasi diterbitkan hanya untuk pemilik.",
  ],
  [
    "Koreksi nilai dengan alasan",
    "Nilai terbit 70; nilai baru 85; alasan ≥5 karakter.",
    "Edit nilai setelah terbit dan isi alasan.",
    "Nilai diperbarui; final dihitung ulang dan audit merekam before/after/reason.",
  ],
])
  add(
    "ASG",
    row[0].startsWith("Nilai")
      ? "Mahasiswa"
      : row[0].includes("nilai") || row[0].startsWith("Koreksi")
        ? "Dosen"
        : "Mahasiswa",
    "3.3",
    ...row,
  );

for (const [value, allowed] of [
  [99.99, false],
  [100, true],
  [100.01, false],
]) {
  const id = `TC-BVA-WEIGHT-${String(value).replace(".", "_")}`;
  add(
    "GRD",
    "Dosen",
    "8.1",
    `Total bobot kategori ${value}%`,
    `Bobot 25,15,25,25,${value - 90}.`,
    "Ubah bobot kategori lalu coba hitung dan kunci nilai akhir.",
    allowed
      ? "Total tepat 100% diterima."
      : "Total yang bukan 100% ditolak dengan blocker.",
    { id, type: "BVA", automation: unit(id), tags: ["Total Bobot Nilai"] },
  );
}
const gradeBands = [
  [0, "E", 0],
  [44.99, "E", 0],
  [45, "D", 1],
  [54.99, "D", 1],
  [55, "C", 2],
  [59.99, "C", 2],
  [60, "C+", 2.5],
  [64.99, "C+", 2.5],
  [65, "B-", 2.75],
  [69.99, "B-", 2.75],
  [70, "B", 3],
  [74.99, "B", 3],
  [75, "B+", 3.5],
  [79.99, "B+", 3.5],
  [80, "A-", 3.75],
  [84.99, "A-", 3.75],
  [85, "A", 4],
  [100, "A", 4],
];
for (const [value, letter, gpa] of gradeBands) {
  const id = `TC-GRD-BAND-${String(value).replace(".", "_")}`;
  add(
    "GRD",
    "Dosen",
    "3.4",
    `Konversi skor ${value} → ${letter}`,
    `Skor akhir ${value}.`,
    "Gunakan nilai akhir sesuai data uji dan periksa huruf serta indeks mutu.",
    `Nilai huruf ${letter}; indeks mutu ${gpa.toFixed(2)}.`,
    { id, type: "BVA", automation: unit(id) },
  );
}
for (const row of [
  [
    "Bobot default kelas",
    "Kelas baru.",
    "Buka Bobot penilaian.",
    "Tugas25%, Kuis15%, UTS25%, UAS25%, Progres10%; total100%.",
  ],
  [
    "Kalkulasi nilai akhir",
    "Tugas80, Kuis70, UTS90, UAS85, Progres100.",
    "Masukkan nilai kategori lalu hitung nilai akhir.",
    "Total=84.25; huruf A-; indeks 3.75.",
  ],
  [
    "Nilai kosong perlu pengakuan",
    "Satu komponen belum diisi.",
    "Klik Hitung nilai akhir dan coba Publikasikan tanpa konfirmasi nilai kosong.",
    "Publikasi memerlukan pengakuan eksplisit nilai kosong.",
  ],
  [
    "Nilai akhir terkunci setelah terbit",
    "Final grade PUBLISHED.",
    "Ubah nilai kategori tanpa alasan koreksi.",
    "Perubahan diblokir; alasan wajib untuk koreksi.",
  ],
  [
    "Simpan nilai batch atomik",
    "Dua nilai sah dan satu nilai 101.",
    "Isi tiga nilai inline lalu Simpan semua perubahan.",
    "Batch tidak menyimpan sebagian ketika ada input invalid.",
  ],
  [
    "Kategori progres dari aktivitas",
    "PDF dan video mahasiswa memiliki progres.",
    "Hitung nilai akhir tanpa mengetik skor progres manual.",
    "Kontribusi progres diperoleh otomatis dari aktivitas yang valid.",
  ],
])
  add("GRD", "Dosen", "3.4", ...row);
add(
  "GRD",
  "Dosen",
  "3.1",
  "Ekspor rekap Excel",
  "Kelas dengan beberapa mahasiswa.",
  "Klik Ekspor Excel; buka hasil dan bandingkan nilai dengan gradebook.",
  "XLSX terbaca dan berisi nilai serta peserta sesuai scope.",
  { priority: "P1" },
);

// Explicit boundary values from all twelve rows of §8.1.
for (const minutes of [0, 1, 15, 120, 300, 301, 1.5]) {
  const id = `TC-BVA-TIMER-${String(minutes).replace(".", "_")}`;
  add(
    "QZ",
    "Dosen",
    "8.1",
    `Timer kuis ${minutes} menit`,
    `timeLimitMinutes=${minutes}.`,
    "Buat kuis dengan durasi uji dan simpan.",
    Number.isInteger(minutes) && minutes >= 1 && minutes <= 300
      ? "Durasi integer dalam 1–300 diterima."
      : "Durasi ditolak oleh validasi.",
    { id, type: "BVA", automation: api(id), tags: ["Durasi Timer Kuis"] },
  );
}
for (const limit of [0, 1, 3, null]) {
  const id = `TC-BVA-ATTEMPT-${limit ?? "NULL"}`;
  add(
    "QZ",
    "Dosen",
    "8.1",
    `Batas attempt ${limit ?? "tidak terbatas (null)"}`,
    `attemptLimit=${limit}.`,
    "Buat kuis dengan batas attempt sesuai data uji lalu simpan.",
    limit === 0
      ? "Batas nol ditolak."
      : limit === null
        ? "null diterima sebagai attempt tak terbatas sesuai §8.1."
        : "Batas attempt diterima.",
    { id, type: "BVA", automation: api(id), tags: ["Batas Percobaan Kuis"] },
  );
}
for (const score of [-0.01, 0, 99.99, 100, 100.01]) {
  const id = `TC-BVA-SCORE-${String(score).replace(".", "_")}`;
  add(
    "ASG",
    "Dosen",
    "8.1",
    `Nilai tugas ${score}`,
    `maxScore=100; score=${score}.`,
    "Beri nilai submission baru sesuai data uji dan simpan.",
    score >= 0 && score <= 100
      ? "Skor diterima dalam rentang 0–100."
      : "Skor ditolak dan nilai tersimpan tidak berubah.",
    {
      id,
      type: "BVA",
      automation: api(id),
      tags: ["Rentang Nilai Tugas/Kuis"],
    },
  );
}
for (const page of [0, 1, 10, 11, 1.5]) {
  const id = `TC-BVA-PAGE-${String(page).replace(".", "_")}`;
  add(
    "PRG",
    "Mahasiswa",
    "8.1",
    `Halaman PDF ${page} dari 10`,
    `totalPages=10; page=${page}.`,
    "Buka PDF dan kirim nomor halaman uji melalui endpoint progress.",
    Number.isInteger(page) && page >= 1 && page <= 10
      ? "Halaman valid tersimpan satu kali."
      : "Halaman di luar rentang atau non-integer ditolak.",
    { id, type: "BVA", automation: api(id), tags: ["Pelacakan Slide Halaman"] },
  );
}
for (const count of [0, 1, 500, 501]) {
  const id = `TC-BVA-IMPORT-${count}`;
  add(
    "ENR",
    "Dosen",
    "8.1",
    `Impor ${count} baris`,
    `Batch ENROLLMENT sebanyak ${count} baris.`,
    "Unggah batch sesuai jumlah uji untuk pratinjau.",
    count >= 1 && count <= 500
      ? "Batch diterima pada tahap review; anomali ditampilkan untuk direkonsiliasi."
      : "Jumlah baris ditolak; untuk >500 tampil saran memecah batch.",
    {
      id,
      type: "BVA",
      automation: api(id),
      tags: ["Rekonsiliasi Impor Berkas"],
    },
  );
}
for (const [label, bytes, allowed] of [
  ["0BYTE", 0, false],
  ["1BYTE", 1, true],
  ["20MB", 20 * 1024 * 1024, true],
  ["50MB", 50 * 1024 * 1024, true],
  ["50MB_PLUS", 50 * 1024 * 1024 + 1, false],
]) {
  const id = `TC-BVA-FILE-${label}`;
  add(
    "FIL",
    "Dosen",
    "8.1",
    `Berkas modul ${label}`,
    `application/pdf; sizeBytes=${bytes}.`,
    "Minta upload ticket dengan metadata ukuran uji.",
    allowed
      ? "Ukuran melewati validasi; layanan penyimpanan harus tersedia untuk menerbitkan tiket."
      : "Ukuran ditolak sebelum tiket diterbitkan.",
    { id, type: "BVA", tags: ["Ukuran Berkas Modul"], automation: api(id) },
  );
}
for (const [label, size, expected] of [
  ["100MB", 100 * 1024 * 1024, "Video lokal tepat 100 MB diterima."],
  ["100MB_PLUS", 100 * 1024 * 1024 + 1, "Video >100 MB ditolak."],
])
  add(
    "FIL",
    "Dosen",
    "8.1",
    `Video lokal ${label}`,
    `MIME video/mp4; sizeBytes=${size}.`,
    "Unggah video lokal sesuai ukuran lalu lihat validasi tiket.",
    expected,
    { type: "BVA", tags: ["Ukuran Berkas Video"] },
  );
for (const [id, title, data, expected] of [
  [
    "TC-BVA-ASG-BEFORE",
    "Tugas sebelum waktu buka",
    "availableFrom besok.",
    "Pengumpulan ditolak 403 sebelum pembukaan.",
  ],
  [
    "TC-BVA-ASG-ONTIME",
    "Tugas sebelum deadline",
    "deadline besok; cutoff dua hari lagi.",
    "Pengumpulan diterima dan isLate=false.",
  ],
  [
    "TC-BVA-ASG-LATE",
    "Tugas dalam masa toleransi",
    "deadline kemarin; cutoff besok; allowLate=true.",
    "Pengumpulan diterima dan isLate=true.",
  ],
  [
    "TC-BVA-ASG-CUTOFF",
    "Tugas setelah cutoff",
    "deadline kemarin; cutoff satu jam lalu.",
    "Pengumpulan ditolak setelah cutoff.",
  ],
  [
    "TC-BVA-ASG-LATE-DENIED",
    "Terlambat ketika allowLate=false",
    "deadline kemarin; cutoff besok; allowLate=false.",
    "Pengumpulan ditolak walau cutoff belum tercapai.",
  ],
])
  add(
    "ASG",
    "Mahasiswa",
    "8.1",
    title,
    data,
    "Buka tugas dengan jendela waktu uji, tulis teks dan kumpulkan.",
    expected,
    { id, type: "BVA", automation: api(id), tags: ["Tenggat Tugas & Cut-off"] },
  );
for (const [id, title, data, expected] of [
  [
    "TC-BVA-QZ-CUTOFF",
    "Timer dipotong oleh deadline",
    "Durasi300 menit; availableUntil satu menit lagi; GLOBAL.",
    "expiresAt tidak melebihi availableUntil.",
  ],
  [
    "TC-BVA-QZ-NPLUS1",
    "Attempt aktif tidak membentuk attempt ganda",
    "Satu attempt IN_PROGRESS.",
    "Mulai ulang mengembalikan attempt aktif, tanpa baris ganda.",
  ],
  [
    "TC-BVA-QZ-LIMIT",
    "Attempt N+1 setelah limit tercapai",
    "attemptLimit=1; satu attempt sudah terkirim.",
    "Attempt berikutnya ditolak.",
  ],
])
  add(
    "QZ",
    "Mahasiswa",
    "8.1",
    title,
    data,
    "Mulai kuis sesuai kondisi uji lalu periksa respons dan jumlah attempt.",
    expected,
    {
      id,
      type: "BVA",
      automation: api(id),
      tags: [
        id.includes("CUTOFF")
          ? "Pengerjaan Lewat Deadline"
          : "Batas Percobaan Kuis",
      ],
    },
  );
add(
  "ASG",
  "Dosen",
  "8.1",
  "Koreksi tanpa alasan ditolak",
  "Submission sudah bernilai70; revisi85 tanpa reason.",
  "Edit nilai existing tanpa menyertakan alasan.",
  "API menolak koreksi; nilai lama tetap70.",
  {
    id: "TC-BVA-REASON",
    type: "BVA",
    automation: api("TC-BVA-REASON"),
    tags: ["Koreksi Nilai Dosen"],
  },
);
for (const [suffix, title, expected] of [
  [
    "CONTINUOUS",
    "Video heartbeat kontinu",
    "5 detik nyata menambah maksimal5 detik tontonan.",
  ],
  ["SEEK", "Video seek ke akhir", "Lompatan ke akhir tidak menambah progres."],
  [
    "REPLAY",
    "Video diputar ulang",
    "Segmen yang sudah dihitung tidak menggandakan progres.",
  ],
  [
    "FAST",
    "Video dipercepat",
    "Delta melebihi waktu nyata tidak mendapat kredit palsu.",
  ],
  [
    "REORDER",
    "Heartbeat terlambat / urutan terbalik",
    "Progres monotonik dan tidak bertambah dari request stale.",
  ],
]) {
  const id = `TC-PRG-${suffix}`;
  add(
    "PRG",
    "Mahasiswa",
    "3.5",
    title,
    "Durasi100 detik; posisi sebelumnya10; interval nyata5detik.",
    "Putar / seek / ulang video sesuai skenario lalu bandingkan progress sebelum dan sesudah.",
    expected,
    {
      id,
      type: "BVA",
      automation: unit(id),
      tags: ["Concurrency Update Progress"],
    },
  );
}
add(
  "PRG",
  "Mahasiswa",
  "8.1",
  "Dua tab memperbarui halaman bersamaan",
  "PDF10halaman; request page2 dan page3 bersamaan.",
  "Buka dua tab dan kirim heartbeat halaman paralel.",
  "Tidak ada halaman hilang; unique pages dan percent konsisten.",
  {
    id: "TC-PRG-CONCURRENT",
    type: "BVA",
    automation: api("TC-PRG-CONCURRENT"),
    tags: ["Concurrency Update Progress"],
  },
);
add(
  "PRG",
  "Mahasiswa",
  "3.5",
  "Halaman PDF berulang idempotent",
  "PDF10halaman; page5 dibuka dua kali.",
  "Buka halaman5 dua kali lalu muat ulang kelas.",
  "viewedPages=[5]; percent=10%, tidak20%.",
  { id: "TC-PRG-PDF-UNIQUE", automation: api("TC-PRG-PDF-UNIQUE") },
);
add(
  "PRG",
  "Mahasiswa",
  "3.5",
  "Progres materi tersembunyi tidak bisa dimanipulasi",
  "Resource isVisible=false.",
  "Kirim progress ke ID materi tersembunyi.",
  "API menolak progress materi yang belum tersedia.",
  { id: "TC-PRG-HIDDEN", type: "Keamanan", automation: api("TC-PRG-HIDDEN") },
);
add(
  "PRG",
  "Mahasiswa",
  "3.5",
  "Konfirmasi unduh idempotent",
  "Dataset terbit dan peserta aktif.",
  "Unduh lalu kirim konfirmasi unduh dua kali.",
  "Satu materialDownload tercatat untuk pasangan pengguna dan resource.",
  {
    automation: existing(
      "tests/integration/files.test.ts",
      "private access needs published resource context; downloads are idempotent",
    ),
  },
);
add(
  "RES",
  "Dosen",
  "3.2.1",
  "Sanitasi HTML sebelum disimpan",
  '<script>alert(1)</script><p onclick="alert(2)">Aman</p>.',
  "Simpan konten berbahaya pada materi RICH_TEXT lalu periksa data tersimpan.",
  "Tag script dan atribut event dihapus sebelum dikirim kembali.",
  { id: "TC-RES-XSS", type: "Keamanan", automation: api("TC-RES-XSS") },
);
add(
  "RES",
  "Dosen",
  "3.2.1",
  "URL javascript ditolak",
  "embed_media url=javascript:alert(1).",
  "Tambahkan embed dengan URL berbahaya lalu simpan.",
  "Skema menolak protokol selain HTTP/HTTPS.",
  { id: "TC-RES-URL", type: "Keamanan", automation: unit("TC-RES-URL") },
);
add(
  "RES",
  "Dosen",
  "3.2",
  "Embed video eksternal sesuai v5",
  "VIDEO_MEDIA; providerYOUTUBE; url HTTPS; duration100.",
  "Buat materi video dengan URL embed tanpa file upload.",
  "Materi video URL eksternal tersimpan sesuai §3.2 dan8.1.",
  { id: "TC-RES-VIDEO-EMBED", automation: api("TC-RES-VIDEO-EMBED") },
);

for (const [kind, label] of [
  ["ENROLLMENT", "peserta"],
  ["QUESTIONS", "bank soal"],
  ["GRADES", "nilai"],
])
  for (const [suffix, title, data, action, expected] of [
    [
      "TEMPLATE",
      `Template impor ${label}`,
      "Format XLSX/CSV resmi.",
      "Unduh template dan buka header kolom.",
      "Kolom sesuai jenis impor dan contoh data jelas.",
    ],
    [
      "MISSING",
      `Impor ${label}: kolom wajib kosong`,
      "Satu baris lengkap; satu baris kolom esensial kosong/spasi.",
      "Unggah berkas dan lihat pratinjau.",
      "Baris tidak lengkap ditandai tanpa menghapus baris valid.",
    ],
    [
      "DUPLICATE",
      `Impor ${label}: duplikat internal`,
      "Dua baris dengan NIM/teks soal identik.",
      "Unggah dan lihat seluruh baris duplikat.",
      "Setiap baris duplikat memiliki referensi baris konflik.",
    ],
    [
      "CONFLICT",
      `Impor ${label}: konflik basis data`,
      "Satu pengenal sudah ada di database.",
      "Unggah data yang sudah ada lalu pilih Timpa secara eksplisit.",
      "Diff nilai lama/baru terlihat; tidak menimpa tanpa keputusan.",
    ],
    [
      "INLINE",
      `Impor ${label}: edit inline dan validasi ulang`,
      "Baris dengan skor/opsi/NIM invalid.",
      "Perbaiki sel pada tabel review.",
      "Status berubah Siap impor setelah validasi ulang.",
    ],
    [
      "EXCLUDE",
      `Impor ${label}: abaikan baris dan commit`,
      "Satu baris valid; satu invalid.",
      "Abaikan baris invalid lalu konfirmasi.",
      "Hanya baris disetujui tersimpan dalam satu transaksi dan audit tercatat.",
    ],
  ])
    add(
      kind === "GRADES" ? "GRD" : kind === "QUESTIONS" ? "QZ" : "ENR",
      "Dosen",
      "3.3.1",
      title,
      data,
      action,
      expected,
      { tags: ["Impor", kind] },
    );
for (const row of [
  [
    "Pengumuman penting",
    "Teks pengumuman kelas; important=true.",
    "Buat pengumuman penting dan terbitkan.",
    "Pengumuman diurutkan di atas dan peserta menerima notifikasi.",
  ],
  [
    "Pengumuman terjadwal",
    "publishAt besok.",
    "Buat pengumuman terjadwal; periksa sebelum dan setelah jadwal.",
    "Mahasiswa baru melihat saat jadwal; notifikasi tidak ganda.",
  ],
  [
    "Pengumuman kelas lain terlindungi",
    "Mahasiswa bukan peserta kelas.",
    "Tempel alamat pengumuman langsung.",
    "Pengumuman privat tidak dapat dibaca.",
  ],
])
  add("ANN", "Dosen", "3.1.1", ...row);
for (const row of [
  [
    "Notifikasi nilai terbit",
    "Nilai sendiri baru dipublikasikan.",
    "Buka notifikasi setelah dosen mempublikasikan nilai.",
    "Notifikasi mengarah ke hasil sendiri.",
  ],
  [
    "Tandai satu notifikasi dibaca",
    "Dua notifikasi belum dibaca.",
    "Klik Tandai dibaca pada satu item.",
    "Badge turun satu dan tetap benar setelah reload.",
  ],
  [
    "Tandai semua dibaca",
    "Beberapa notifikasi unread.",
    "Klik Tandai semua dibaca.",
    "Semua terbaca dan jumlah unread nol.",
  ],
  [
    "Isolasi notifikasi antar pengguna",
    "Dua akun mahasiswa.",
    "Bandingkan notifikasi akun A dan B; coba ID notifikasi B sebagai A.",
    "Akun A tidak dapat membaca/mengubah notifikasi B.",
  ],
  [
    "Pengingat tenggat idempotent",
    "Satu tugas mendekati deadline.",
    "Jalankan scheduler dua kali untuk periode yang sama.",
    "Satu notifikasi per event/pengguna.",
  ],
])
  add("NOT", "Mahasiswa", "3.1.1", ...row);
for (const [title, data, action, expected, auto] of [
  [
    "Verifikasi malware dan checksum",
    "Berkas fixture INFECTED / checksum salah.",
    "Upload lalu konfirmasi metadata sebelum mengaitkan ke materi.",
    "File tidak READY sampai scan CLEAN dan checksum cocok.",
    existing(
      "tests/integration/files.test.ts",
      "uploads reject invalid sizes and verify checksum plus malware state",
    ),
  ],
  [
    "Berkas jawaban peserta lain terlindungi",
    "Dua mahasiswa terdaftar; file milik B.",
    "Sebagai A minta download ticket berkas submission B.",
    "Akses ditolak meskipun sama-sama peserta kelas.",
    existing(
      "tests/integration/files.test.ts",
      "submission files cannot be read by another enrolled student",
    ),
  ],
  [
    "Tiket download privat kedaluwarsa",
    "File privat READY; TTL15menit.",
    "Minta tiket sah, akses setelah TTL dan minta tiket baru.",
    "Tiket lama tidak berlaku; tiket baru hanya diterbitkan untuk pengguna berhak.",
    null,
  ],
  [
    "Trash dapat dipulihkan tujuh hari",
    "File uji tanpa referensi lain.",
    "Hapus lalu pulihkan sebelum7hari; periksa metadata dan akses.",
    "File kembali READY dalam masa retensi.",
    null,
  ],
  [
    "Restore sesudah tujuh hari ditolak",
    "File TRASH berumur>7hari di fixture.",
    "Coba restore sesudah retensi.",
    "File tidak bisa dipulihkan; pesan menjelaskan masa retensi.",
    null,
  ],
  [
    "Zero-binary storage",
    "Upload PDF dan ZIP lewat browser.",
    "Periksa network upload dan penyimpanan API.",
    "Binary menuju File Service; E-Learning menyimpan ID dan metadata saja.",
    null,
  ],
  [
    "Cover publik dan modul privat",
    "Cover public; PDF resource private.",
    "Buka URL cover tanpa login lalu coba URL statis PDF.",
    "Cover publik sesuai kebijakan; modul memerlukan signed ticket.",
    null,
  ],
  [
    "Antivirus layanan kampus nyata",
    "File uji antivirus yang disetujui pemilik layanan.",
    "Lakukan upload pada staging File Service kampus dan periksa scan.",
    "Hasil antivirus nyata diverifikasi, bukan scan fixture.",
    null,
  ],
])
  add(
    "FIL",
    title.includes("jawaban") ? "Mahasiswa" : "Dosen",
    "2.3",
    title,
    data,
    action,
    expected,
    {
      automation: auto,
      scope: title.includes("kampus") ? "external" : "local",
      manualReason: title.includes("kampus")
        ? "Membutuhkan File Service kampus dan antivirus nyata."
        : "Retensi, TTL atau tampilan memerlukan verifikasi tambahan.",
    },
  );
for (const row of [
  [
    "Audit koreksi nilai before/after",
    "Nilai70→85; feedback lama/baru; reason.",
    "Koreksi nilai lalu buka Jejak audit kelas.",
    "Pelaku,waktu,before,after,reason,requestId tercatat.",
  ],
  [
    "Audit perubahan enrollment",
    "Tambah lalu nonaktifkan peserta.",
    "Buka audit sesudah kedua aksi.",
    "Histori enrollment menyimpan perubahan dan pelaku.",
  ],
  [
    "Audit perubahan kuis aktif",
    "Attempt aktif; durasi/deadline diubah dosen.",
    "Ubah konfigurasi dan baca entri audit.",
    "Snapshot sebelum/sesudah tersimpan tanpa merusak attempt.",
  ],
  [
    "Audit penghapusan file",
    "Materi memiliki file siap.",
    "Hapus materi dan periksa audit.",
    "Aksi penghapusan dan reference file tercatat.",
  ],
  [
    "Audit append-only",
    "Entri audit yang sudah dibuat.",
    "Pada database _test, coba UPDATE dan DELETE audit.",
    "Trigger database menolak perubahan dan penghapusan histori.",
  ],
  [
    "Audit tidak terbuka untuk mahasiswa",
    "Akun peserta kelas.",
    "Tempel alamat audit dan panggil endpoint langsung.",
    "Akses ditolak; tidak ada snapshot pengguna lain yang bocor.",
  ],
])
  add(
    "AUD",
    row[0].includes("mahasiswa") ? "Mahasiswa" : "Dosen",
    "3.6",
    ...row,
    { type: row[0].includes("append") ? "Keamanan" : "Fungsional" },
  );
for (const row of [
  [
    "Success state dengan timestamp dan versi",
    "Kirim tugas versi2.",
    "Kumpulkan tugas lalu lihat konfirmasi.",
    "Banner sukses menyebut waktu perangkat dengan offset zona sebenarnya dan versi2.",
  ],
  [
    "Failure state menyediakan retry",
    "Putuskan API saat menyimpan draf.",
    "Klik Simpan; hidupkan API lalu klik Coba lagi.",
    "Pesan gagal solutif; retry tidak menggandakan data.",
  ],
  [
    "Blocker menyebut waktu pembukaan",
    "Kuis availableFrom besok.",
    "Mahasiswa buka kuis yang belum dibuka.",
    "Callout menjelaskan tanggal/jam pembukaan; tombol mulai nonaktif.",
  ],
  [
    "Upload progress dan tombol terkunci",
    "Unggahan PDF ukuran sedang.",
    "Unggah dengan jaringan diperlambat.",
    "Progres0–100% terlihat; aksi kirim dinonaktifkan selama proses.",
  ],
  [
    "Double-submit tidak menggandakan data",
    "Satu operasi submit dengan Idempotency-Key sama.",
    "Klik Kirim berulang atau ulangi request yang sama.",
    "Satu operasi tersimpan; respons replay sama.",
  ],
  [
    "Key sama payload berbeda ditolak",
    "Idempotency-Key tetap; isi payload diubah.",
    "Ulangi mutation dengan key sama dan body berbeda.",
    "HTTP409; mutasi kedua tidak menimpa pertama.",
  ],
])
  add(
    "FDB",
    row[0].startsWith("Success") || row[0].startsWith("Blocker")
      ? "Mahasiswa"
      : "Dosen",
    "3.7",
    ...row,
  );
for (const [title, data, action, expected, auto] of [
  [
    "Draf pengguna dan entitas terisolasi",
    "AkunA/B; materi1/2.",
    "Simpan draf pada dua akun lalu buka materi berbeda.",
    "Tidak ada draf lintas pengguna/entitas.",
    existing(
      "tests/drafts.test.ts",
      "different users and entities never share data",
      "unit",
    ),
  ],
  [
    "Draf autosave dan recovery eksplisit",
    "Materi JSON belum disimpan ke server.",
    "Ketik, tunggu2detik, tutup lalu buka editor; klik Pulihkan.",
    "Draf terdeteksi dan isi pulih hanya setelah keputusan pengguna.",
    existing(
      "tests/drafts.test.ts",
      "debounce persists complex edits and remount offers recovery",
      "unit",
    ),
  ],
  [
    "Navigasi terlalu cepat tetap menyimpan draf",
    "Edit lalu tutup editor sebelum debounce.",
    "Buka kembali dan pilih Buang draf.",
    "Draf yang belum debounce tetap disimpan; Buang menghapusnya.",
    existing(
      "tests/drafts.test.ts",
      "unmount before debounce flushes the draft; discard removes recovery",
      "unit",
    ),
  ],
  [
    "Draf identik nilai server dibersihkan",
    "Edit sementara lalu kembalikan nilai awal.",
    "Tunggu penyimpanan dan periksa draf.",
    "Draf tidak kotor dan penyimpanan lokal dibersihkan.",
    existing(
      "tests/drafts.test.ts",
      "returning to the server value clears the local draft",
      "unit",
    ),
  ],
  [
    "TTL draf empat belas hari",
    "expiresAt tepat sekarang dan lewat14hari.",
    "Buka profil/editor setelah memajukan waktu fixture.",
    "Draf kedaluwarsa terhapus sebelum recovery.",
    null,
  ],
  [
    "Kuota draf 15MB dan50item",
    "51draf atau total>15MB.",
    "Simpan draf hingga melebihi kuota.",
    "Expired/synced dibersihkan dulu; draf LRU terhapus bila perlu.",
    null,
  ],
  [
    "Hapus semua draf pada profil",
    "Beberapa draf lokal milik akun aktif.",
    "Profil → Hapus semua draf lokal → konfirmasi.",
    "Draf akun aktif dihapus; draf akun lain tetap terisolasi.",
    null,
  ],
  [
    "Peringatan navigasi perubahan belum terkirim",
    "Editor kotor; link dan tombol Back.",
    "Klik link / Back lalu Batalkan di dialog.",
    "Navigasi dapat dibatalkan dan isi editor tidak hilang.",
    existing(
      "tests/navigation.test.ts",
      "clean paths retain history and unsaved drafts can cancel both links and Back",
      "unit",
    ),
  ],
  [
    "Offline tidak memperpanjang waktu kuis",
    "Attempt berjalan mendekati expiry.",
    "Matikan jaringan, ketik jawaban, kembali online setelah expiry.",
    "Jawaban lokal tidak mengubah otoritas waktu server.",
    null,
  ],
])
  add(
    "FDB",
    title.includes("kuis") ? "Mahasiswa" : "Dosen",
    "3.7.1",
    title,
    data,
    action,
    expected,
    { automation: auto, tags: ["Draf lokal"] },
  );

const effects = [
  [
    "CE-01",
    "Dosen",
    "Publikasi nilai tugas",
    "Nilai DRAFT telah lengkap.",
    "Klik Publikasikan nilai; buka dashboard mahasiswa, notifikasi dan audit.",
    "Nilai PUBLISHED, banner sukses, notifikasi, hasil mahasiswa dan audit before/after sesuai.",
  ],
  [
    "CE-02",
    "Dosen",
    "Koreksi nilai terbit70→85",
    "Nilai70 terbit; reason koreksi sah.",
    "Koreksi ke85; periksa final grade, notifikasi dan audit.",
    "Nilai85, final dihitung ulang, notifikasi revisi dan snapshot70→85 tersimpan.",
  ],
  [
    "CE-03",
    "Mahasiswa",
    "Resubmission tugas sebelum cutoff",
    "v1 sudah terkumpul; batas attempt belum habis.",
    "Kirimv2; buka riwayat tugas, antrean dosen dan audit.",
    "v2 aktif; v1 SUPERSEDED; NEEDS_GRADING; banner versi baru; audit RESUBMIT_ASSIGNMENT.",
  ],
  [
    "CE-04",
    "Mahasiswa",
    "Membuka halaman5 PDF10halaman",
    "Mahasiswa peserta; PDF tersedia.",
    "Buka halaman5; lihat progress detail dan agregasi kelas.",
    "Halaman5 masuk array unik; percent dihitung ulang dan agregasi kelas berubah.",
  ],
  [
    "CE-05",
    "Mahasiswa",
    "Timer kuis habis",
    "Jawaban terakhir tersimpan; expiresAt<=now.",
    "Biarkan timer habis; tunggu worker; buka attempt dan audit.",
    "Submit otomatis; objektif dinilai; FORCE_SUBMITTED_SYSTEM; modal timeout; audit QUIZ_AUTO_EXPIRE.",
  ],
  [
    "CE-06",
    "Mahasiswa",
    "Kuis belum dibuka",
    "availableFrom besok.",
    "Buka kuis sebelum jadwal dan coba mulai lewat API.",
    "Tidak ada attempt; callout waktu pembukaan dan tombol mulai nonaktif.",
  ],
  [
    "CE-07",
    "Super Admin",
    "Course diarsipkan",
    "Course PUBLISHED dengan beberapa rombel.",
    "Arsipkan course lalu coba submit/mutasi setiap rombel.",
    "Semua kelas read-only; tugas/kuis ditolak; audit status course PUBLISHED→ARCHIVED.",
  ],
  [
    "CE-08",
    "Dosen",
    "Materi dihapus",
    "Resource terlihat dan file tidak dipakai kelas lain.",
    "Hapus materi dan lihat status resource, file serta audit.",
    "Resource soft-delete; file TRASH7hari; toast dan audit penghapusan.",
  ],
  [
    "CE-09",
    "Dosen",
    "Impor direkonsiliasi",
    "4baris cacat/duplikat dan beberapa baris sah.",
    "Unggah, review diff, edit/abaikan/timpa lalu konfirmasi.",
    "Nomor/alasan anomali jelas; commit setelah resolusi; audit BULK_IMPORT_RECONCILED.",
  ],
];
for (const [ce, role, title, data, action, expected] of effects)
  add("CE", role, "8.2", `${ce} · ${title}`, data, action, expected, {
    id: `TC-${ce}`,
    type: "Cause-effect",
    tags: [ce],
    manualReason:
      "Seluruh efek UI, notifikasi, status dan audit harus diperiksa bersama. Tes komponen tidak menyatakan CE lengkap lulus.",
  });

for (const [title, data, action, expected] of [
  [
    "Health aplikasi dan dependensi",
    "Staging E-Learning, PostgreSQL, Redis.",
    "Panggil health dan periksa readiness layanan.",
    "API sehat; kegagalan dependensi terdeteksi.",
  ],
  [
    "Nginx TLS dan redirectHTTPS",
    "Domain staging dan sertifikat.",
    "AksesHTTP, cek redirect dan sertifikatHTTPS.",
    "HTTPS aktif; sertifikat valid dan redirect benar.",
  ],
  [
    "Rate limit autentikasi",
    "Endpointauth5request/detik.",
    "Kirim burst terkontrol pada staging fixture.",
    "Permintaan berlebih429 tanpa menghentikan layanan.",
  ],
  [
    "Rate limit API",
    "API30request/detik.",
    "Kirim burst terkontrol dengan akun uji.",
    "429dengan pesan jelas; permintaan normal tetap berjalan.",
  ],
  [
    "Origin/CSRF mutation",
    "Origin asing; cookie sah.",
    "Kirim mutation dari origin tidak diizinkan.",
    "Mutation ditolak tanpa perubahan database.",
  ],
  [
    "SSO outage timeout dan circuit breaker",
    "SSO fixture lambat /503.",
    "Simulasikan outage; ulangi login sesuai kebijakan retry.",
    "Timeout3000ms; retrybackoff terkontrol; breaker mencegah banjirrequest.",
  ],
  [
    "File Service outage solutif",
    "File Service fixture tidak tersedia.",
    "Minta upload/downloadticket lalu pulihkan layanan.",
    "Pesan solusi jelas; circuit breaker; data tidak dianggap terunggah.",
  ],
  [
    "PM2 cluster dan worker",
    "VPS stagingbare-metal.",
    "Periksa2instanceAPI dan1worker; jalankan tugas background.",
    "Proses terpisah dan worker menyelesaikan antrian.",
  ],
  [
    "Isolasi environmentdev/prod",
    "LiveDev3001danProduction3000.",
    "Periksa environment, koneksi database dan prosesPM2.",
    "Database dan secret tiap environment terpisah.",
  ],
  [
    "Reload tanpa downtime",
    "Traffic health ringan; versi baru staging.",
    "Rolling reloadPM2 sambil memantau health.",
    "Permintaan tetap terlayani sepanjang reload.",
  ],
  [
    "Migrasi dan rollback rilis",
    "Backup sebelum migrasi; skemaversi baru.",
    "Deploy di staging; uji rollback sesuai runbook.",
    "Migrasi aman dan rencana rollback dapat dijalankan.",
  ],
  [
    "Backup harian02WIB",
    "Database staging; target offsite.",
    "Jalankan backup; verifikasi cron, checksum dan salinan offsite.",
    "Backup custom PostgreSQL danSHA256valid; jadwal02WIB.",
  ],
  [
    "Retensi backup tujuh hari",
    "Backup lokal>7haridan backup baru.",
    "Periksa rotasi pada direktori backupstaging.",
    "Backup lama dirotasi sesuai retensi; salinan terbaru terlindungi.",
  ],
  [
    "Latihan restore terisolasi",
    "Database _test khusus restore; checksum sah.",
    "Restorebackup ke database terisolasi dan verifikasi data akademik.",
    "Relasi,nilai,audit pulih; RPO/RTOdiukur terhadap§7.2.",
  ],
  [
    "Uji beban pilot",
    "150–250pengguna staging; fixture load disetujui.",
    "Jalankan beban kuis/progress dan ukur latensi serta error.",
    "Tidak ada kehilangan jawaban/progress; kapasitas pilot tervalidasi.",
  ],
  [
    "Waktu mengikuti perangkat",
    "Timestamp serverUTC; uji browserzonaAsia/Jakarta danAsia/Makassar.",
    "Bandingkan deadline,notifikasi,timestampaudit dan formulir.",
    "Timestamp sama tampil GMT+7 pada UTC+7 dan GMT+8 pada UTC+8; input lokal dikirim UTC.",
  ],
])
  add(
    "OPS",
    "Operator / DevOps",
    title.includes("WIB") ? "9.2" : "7.1",
    title,
    data,
    action,
    expected,
    {
      scope: "external",
      type: title.includes("beban") ? "Performa" : "Operasional",
      manualReason:
        "Memerlukan VPS / Redis / layanan kampus atau simulasi khusus yang tidak dibuktikan oleh tes lokal.",
    },
  );
for (const [role, title, data, expected] of [
  [
    "Super Admin",
    "Manajemen sesi aktif",
    "Dua sesi pengguna.",
    "Admin dapat meninjau dan mencabut sesi yang dipilih.",
  ],
  [
    "Super Admin",
    "Filter dan ekspor pengguna",
    "Pengguna lintasprodi dengan status berbeda.",
    "Filter/ekspor sesuai kewenangan.",
  ],
  [
    "Dosen",
    "Ringkasan kuota penyimpanan",
    "Kelas dengan file berbagaiukuran.",
    "Pemakaian kuota sesuai metadata layanan.",
  ],
  [
    "Dosen",
    "Pencarian berkas mendalam",
    "Nama,MIMEdan tanggalfile.",
    "Filter menemukan file berhakakses saja.",
  ],
  [
    "Dosen",
    "Forum diskusi perkelas",
    "Dua rombel berbeda.",
    "Diskusi terisolasi pada kelas dan peran.",
  ],
  [
    "Dosen",
    "Prasyarat aktivitas",
    "MateriA harus selesai sebelumkuisB.",
    "KuisB terkunci sampai prasyarat terpenuhi.",
  ],
])
  add(
    "FUT",
    role,
    "3.1",
    title,
    data,
    "Buka fitur pada rilisP1 yang mendukungnya; lakukan skenario sesuai data uji.",
    expected,
    {
      priority: "P1",
      scope: "future",
      manualReason:
        "Cakupan pasca-pilot; periksa ketersediaan implementasi sebelum eksekusi.",
    },
  );
for (const [role, title, data, expected] of [
  [
    "Mahasiswa",
    "Verifikasi login2FA",
    "Akun staging2FA.",
    "Kode sah membuka sesi; kode salah/kedaluwarsa ditolak.",
  ],
  [
    "Dosen",
    "Link sementara dengan hitungmundur",
    "Tiket berjangkawaktu.",
    "Countdown akurat dan akses ditolak setelahexpiry.",
  ],
  [
    "Dosen",
    "Versioning binary File Service",
    "Filev1kemudianv2.",
    "Histori binary tetap tersedia sesuaiACL.",
  ],
  [
    "Dosen",
    "Analitik pembelajaran lanjut",
    "Aktivitas beberapa mahasiswa.",
    "Visual analitik sesuai data dan scope.",
  ],
  [
    "Mahasiswa",
    "Kalender akademik interaktif",
    "Tugas,kuis danpertemuan.",
    "Agenda mengikuti zona perangkat dengan offset yang sesuai.",
  ],
  [
    "Mahasiswa",
    "NotifikasiWhatsApp/Email",
    "Kontak uji dan gatewaystaging.",
    "Pesan terkirim sekali ke penerima yangtepat.",
  ],
  [
    "Admin Prodi",
    "Sinkronisasi dua arahSIAKAD",
    "Nilai akhir terbit dan dataakademikstaging.",
    "Sinkronisasi idempotent tanpa membocorkan prodi lain.",
  ],
])
  add(
    "FUT",
    role,
    "3.1",
    title,
    data,
    "Gunakan lingkungan rilisP2 yang mendukung fitur; lakukan skenario dengan akun uji.",
    expected,
    {
      priority: "P2",
      scope: "future",
      manualReason:
        "Fitur rilis lanjutan; belum dinyatakan tersedia pada pilot.",
    },
  );
const pilotTitles = [
  "Administrasi akun diSSO",
  "Login terpadu lintasperan",
  "Berkas privat dantrash",
  "Kesiapan kelas danpeserta",
  "Penyusunan pertemuan danmateri",
  "Aktivitas belajar mahasiswa",
  "Penilaian otomatis danmanual",
  "Isolasi nilaiterbit",
  "Pengujian lintaslayanan kampus",
  "Keterlacakan aksi kritis",
  "Nol blocker/critical terbuka",
  "SOPbackup dan penanggungjawab",
];
pilotTitles.forEach((title, i) =>
  add(
    "PILOT",
    i === 11
      ? "Operator / DevOps"
      : i === 0
        ? "Super Admin"
        : i >= 4 && i <= 7
          ? "Dosen"
          : "Admin Prodi",
    "3.1",
    `Pilot ${String(i + 1).padStart(2, "0")} · ${title}`,
    "Checklist acceptance pilot; bukti UAT peralurmendasar.",
    `Jalankan kasus terkait ${title}, kumpulkan bukti dan tinjau dengan penanggung jawab pilot.`,
    `Kriteria ${i + 1} disetujui dengan bukti; kegagalan atau pekerjaan terbuka dicatat sebelum sign-off.`,
    {
      scope: "external",
      type: "Acceptance",
      manualReason:
        "Penerimaan pilot memerlukan bukti lintas layanan dan persetujuan pihak terkait.",
    },
  ),
);
const futureActions = [
  [
    "Buka daftar sesi aktif pengguna; cocokkan dua sesi yang dibuat dari browser berbeda.",
    "Cabut satu sesi, lalu akses E-Learning kembali dari kedua browser; hanya sesi yang dicabut harus berakhir.",
  ],
  [
    "Buka pengelolaan pengguna; filter prodi dan status akun sesuai data uji.",
    "Ekspor hasil filter; periksa jumlah/baris dan coba scope prodi lain dengan akun Admin Prodi.",
  ],
  [
    "Buka ringkasan penyimpanan kelas; catat total ukuran metadata file.",
    "Tambah satu file uji lalu hapus melalui alur normal; cocokkan perubahan pemakaian dan kebijakan trash.",
  ],
  [
    "Buka pencarian berkas; cari nama, MIME, tanggal dan kombinasi filter secara bergantian.",
    "Coba nama file pada kelas yang tidak diampu; hasil yang tidak berhak diakses harus tidak muncul.",
  ],
  [
    "Buka forum kelas A; buat topik dan balasan dengan akun uji.",
    "Masuk sebagai peserta kelas B; coba alamat topik kelas A dan periksa isolasi akses.",
  ],
  [
    "Atur Materi A sebagai prasyarat kuis B; mahasiswa coba mulai kuis sebelum A selesai.",
    "Selesaikan Materi A sesuai kriteria, muat ulang lalu coba kuis B kembali.",
  ],
  [
    "Masuk dengan akun uji yang 2FA-nya sudah dikonfigurasi; gunakan kode sah.",
    "Pada sesi browser baru, coba kode salah dan kode kedaluwarsa; catat penolakan tanpa sesi aktif.",
  ],
  [
    "Minta link sementara file uji; buka panel hitung mundur dan bandingkan dengan waktu expiry server.",
    "Akses link sebelum dan setelah expiry; minta link baru dengan akun berhak akses.",
  ],
  [
    "Unggah file uji v1 lalu ganti dengan v2 melalui fitur versioning.",
    "Buka histori dan unduh kedua versi; periksa isi, metadata dan izin dengan peserta/bukan peserta.",
  ],
  [
    "Catat aktivitas dan progres dua mahasiswa; buka panel analitik kelas.",
    "Filter periode dan mahasiswa; cocokkan angka/grafik dengan aktivitas yang dicatat dan uji scope kelas lain.",
  ],
  [
    "Siapkan tenggat tugas, jadwal kuis dan pertemuan pada kelas yang diikuti.",
    "Buka kalender, pindah bulan dan pilih agenda; cocokkan tanggal sesuai perangkat serta tautan detail aktivitas.",
  ],
  [
    "Gunakan kontak pengujian dan gateway staging; picu satu notifikasi tugas/kuis.",
    "Ulangi event yang sama; periksa pesan, penerima, antrean retry dan tidak adanya duplikasi.",
  ],
  [
    "Siapkan data akademik staging dan nilai akhir terbit; jalankan sinkronisasi dari panel yang tersedia.",
    "Ulangi sinkronisasi, cek hasil di kedua sistem dan coba scope prodi lain dengan akun Admin Prodi.",
  ],
];
cases
  .filter((c) => c.family === "FUT")
  .forEach((c, i) => {
    c.steps.splice(
      2,
      1,
      ...futureActions[i].map((action, index) => ({
        action,
        expected:
          index === 0
            ? "Data/fitur uji tersedia; respons awal tercatat untuk dibandingkan."
            : c.expected,
      })),
    );
  });

// ATT - Attendance & Presensi Perkuliahan
add(
  "ATT",
  "Mahasiswa",
  "3.1.2",
  "Validasi kode presensi mandiri case-insensitive dan auto-trim",
  "Sesi presensi aktif dengan kode 6 karakter.",
  "Masukkan kode presensi dengan huruf kecil dan spasi di awal/akhir.",
  "Kode tervalidasi sukses dan kehadiran tercatat HADIR (PRESENT).",
  {
    automation: existing(
      "tests/attendance.test.ts",
      "attendance codes accept case and surrounding spaces without accepting an empty or wrong code",
      "unit",
    ),
  },
);
add(
  "ATT",
  "Dosen",
  "3.1.2",
  "Ambang kehadiran tersimpan untuk kelayakan ujian",
  "Rekap kehadiran mahasiswa; ubah ambang global dari75% menjadi80%.",
  "Hitung persentase kehadiran terhadap total sesi perkuliahan.",
  "Kelayakan mengikuti ambang tersimpan; persentase75% lolos ambang75% dan tidak lolos ambang80%.",
  {
    automation: existing(
      "tests/attendance.test.ts",
      "attendance eligibility uses configured threshold and the unrounded percentage",
      "unit",
    ),
  },
);
add(
  "ATT",
  "Dosen",
  "3.1.2",
  "Override manual presensi dosen dan pencatatan dispensasi/izin",
  "Daftar hadir mahasiswa pada sesi perkuliahan tertentu.",
  "Ubah status mahasiswa menjadi SAKIT/IZIN dengan catatan dispensasi.",
  "Status tersimpan dan catatan izin tampil pada lembar presensi dan rekap.",
  {
    automation: existing(
      "tests/integration/academic-policy.test.ts",
      "manual attendance override persists status, notes, manager identity and audit",
      "integration",
    ),
  },
);
add(
  "ATT",
  "Dosen",
  "3.1.2",
  "Buka sesi presensi perkuliahan dengan kode acak dan durasi",
  "Kelas aktif pada semester berjalan.",
  "Klik Buka Presensi, tentukan judul pertemuan, tipe mandiri dan durasi 30 menit.",
  "Sesi presensi aktif, kode 6 karakter digenerate, dan roster mahasiswa otomatis terisi.",
);
add(
  "ATT",
  "Dosen",
  "3.1.2",
  "Aksi cepat Tandai Semua Hadir pada lembar presensi",
  "Sesi presensi perkuliahan tatap muka.",
  "Klik tombol Tandai Semua Hadir lalu simpan presensi.",
  "Seluruh mahasiswa yang belum memiliki catatan langsung diperbarui menjadi HADIR.",
);
add(
  "ATT",
  "Dosen",
  "3.1.2",
  "Rekapitulasi presensi semester per mahasiswa dan ekspor CSV",
  "Kelas dengan beberapa sesi perkuliahan yang sudah selesai.",
  "Buka tab Rekap Presensi lalu klik Ekspor CSV.",
  "Tabel rekap menampilkan persentase tiap mahasiswa beserta berkas CSV unduhan.",
);

// ISO - Isolasi Program Studi & Multi-Afiliasi
add(
  "ISO",
  "Admin Prodi",
  "2.2",
  "Admin Prodi hanya melihat pengguna dalam lingkup prodinya",
  "Akun Admin Prodi dengan scope prodi tertentu.",
  "Cari pengguna melalui API/antarmuka dengan berbagai kata kunci.",
  "Hanya pengguna yang memiliki kesamaan prodi yang muncul dalam hasil pencarian.",
  {
    automation: existing(
      "tests/integration/department-isolation.test.ts",
      "Department Isolation: Department Admin only sees users within their department scope",
      "api",
    ),
  },
);
add(
  "ISO",
  "Dosen",
  "2.2",
  "Dosen multi-afiliasi dapat mengakses prodi-prodi yang terafiliasi",
  "Akun dosen dengan klaim departmentScopes jamak (misal: IF dan SI).",
  "Lakukan pencarian pengguna dan kelola kelas pada kedua prodi tersebut.",
  "Dosen dapat melihat dan mengelola pengguna pada kedua program studi terafiliasi.",
  {
    automation: existing(
      "tests/integration/department-isolation.test.ts",
      "Department Isolation: Multi-affiliation lecturer accesses multiple scoped departments",
      "api",
    ),
  },
);
add(
  "ISO",
  "Super Admin",
  "2.2",
  "Super Admin memiliki cakupan universal seluruh program studi",
  "Akun Super Admin universitas.",
  "Cari pengguna dan kelola master data lintas seluruh program studi.",
  "Semua pengguna dan mata kuliah dari seluruh fakultas/prodi dapat diakses.",
  {
    automation: existing(
      "tests/integration/department-isolation.test.ts",
      "Department Isolation: Super Admin has university-wide scope",
      "api",
    ),
  },
);

// REC - Integrasi Dashboard Rektor UAY
add(
  "REC",
  "Operator / DevOps",
  "7.2",
  "Kontrak skema ReportingSnapshot sesuai spesifikasi Dashboard Rektor",
  "Klien Dashboard Rektor UAY memanggil endpoint snapshot.",
  "Periksa payload JSON terhadap definisi antarmuka ReportingSnapshot.",
  "Snapshot memuat snapshotAt, lecturers, classes, activities, dan sessions; identitas serta data kelas cocok dengan PostgreSQL.",
  {
    automation: existing(
      "tests/integration/rector-bridging.test.ts",
      "Rector Bridging: ReportingSnapshot schema conforms to Dashboard Rektor contract",
      "api",
    ),
  },
);
add(
  "REC",
  "Operator / DevOps",
  "7.2",
  "Validasi otorisasi Bearer Token pada endpoint integrasi rektor",
  "Request tanpa token atau dengan token salah ke /api/v1/integrations/rector/snapshot.",
  "Panggil endpoint integrasi dengan Authorization header tidak valid.",
  "Request ditolak HTTP 401 Unauthorized; token valid diterima HTTP 200.",
  {
    automation: existing(
      "tests/integration/rector-bridging.test.ts",
      "Rector Bridging: token authorization gate rejects invalid credentials",
      "api",
    ),
  },
);
add(
  "REC",
  "Operator / DevOps",
  "7.2",
  "Agregasi metrik aktivitas perkuliahan dan publikasi prodi",
  "Data kelas, materi, tugas, dan kuis lintas program studi.",
  "Panggil endpoint snapshot dan hitung agregasi metrik.",
  "Total materi, tugas, kuis, dan rasio kelas aktif teragregasi akurat per prodi.",
);

// Tambahan sesuai implementasi Oktober 2026; bukan requirement RTM baru.
add("REC", "Rektor", "Implementasi saat ini", "Masuk melalui satu akun kampus dan akses laporan hanya baca", "Akun Rektor, Super Admin, Dosen, Mahasiswa; sesi aktif dan tanpa sesi.", "Buka /rector dan panggil API laporan serta percobaan perubahan akademik.", "Rektor/Super Admin dapat membaca; dosen/mahasiswa ditolak; tanpa sesi 401; perubahan akademik rektor ditolak.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/integration/rector-access.test.ts", "same cookie works; no separate demo login or academic write", "api") });
add("REC", "Rektor", "Implementasi saat ini", "Ringkasan cocok dengan dosen dan rekap program studi", "Fixture deterministik laporan akademik.", "Bandingkan ringkasan, tabel dosen, dan rekap prodi dengan periode sama.", "Total dan kegiatan pelaku cocok tanpa peringkat otomatis.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "summary matches departmental totals, lecturer activity and daily evidence", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Kelas bersama tidak menggandakan kegiatan dan antrean", "Kelas dengan dua pengampu.", "Buka kedua dosen dan kelas bersama, lalu bandingkan ringkasan.", "Kegiatan diberikan kepada pelakunya; antrean kelas dihitung sekali.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "shared classes attribute evidence to actual actors; class backlog is not duplicated in university totals", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Login saja, tanpa kegiatan, tanpa kelas dan tindakan per objek", "Dosen aktif, hanya login, tidak aktif dan tidak diampu kelas.", "Bandingkan jumlah tindakan dan objek pada rincian dosen.", "Login terpisah dari kegiatan akademik; lima perubahan satu materi tidak menjadi lima materi.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "actions and unique objects, login-only, inactive and unassigned lecturers stay distinct", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Filter konsisten dan kondisi data tidak menjadi aktivitas baru", "Semester, prodi, dosen, kelas dan periode berbeda.", "Ubah satu filter, periksa URL, ringkasan dan rincian; muat ulang.", "Filter membatasi cakupan konsisten; kondisi kelas bukan kegiatan baru pada tanggal muat ulang.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "snapshot metrics ignore activity dates; semester, department, lecturer and class constrain scope", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Kiriman pengganti dan penilaian otomatis dibedakan", "Tugas dikirim dua kali; kuis otomatis dan pekerjaan manual.", "Periksa pekerjaan belum dinilai pada kelas.", "Kiriman lama tidak masuk antrean; penilaian kuis otomatis memiliki jumlah tersendiri.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "latest submissions exclude superseded work and automatic grading has its own total", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Rentang login berakhir pada logout yang tercatat", "Sesi lengkap dan kegiatan dengan awal/akhir tercatat.", "Baca grafik sesi dan riwayat per dosen.", "Rentang menggunakan bukti masuk/keluar; logout bukan kegiatan akademik; bukan durasi kerja.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "connection spans and action intervals use explicit recorded events, without crediting logout as academic work", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Grafik harian meliputi akses selama 24 jam", "Sesi pagi, sore dan malam pada zona perangkat.", "Buka grafik harian dan periksa 00.00–24.00.", "Semua sesi hari tersebut tampil tanpa pembatasan jam kerja.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "daily session chart covers the device's full day, including afternoon and evening connections", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Sesi melewati tengah malam tetap dapat ditelusuri", "Sesi lintas hari dan beberapa hari.", "Pilih masing-masing tanggal dan periksa rentang.", "Grafik membagi sesi di batas hari tanpa mengubah waktu login/logout asli.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "daily chart splits overnight and multi-day sessions without losing time or altering login/logout evidence", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Logout belum tercatat dan data kosong tidak dikarang", "Sesi tanpa logout, kejadian tepat tengah malam, filter kosong.", "Lihat grafik dan rincian pada periode tersebut.", "Ada keterangan belum tercatat; tidak menggambar rentang sampai sekarang tanpa bukti.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "daily chart handles exact midnight, unknown logout, and point events without invented continuation", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Waktu lokal konsisten pada layar, tanggal dan unduhan", "Perangkat Asia/Makassar; tanggal dekat tengah malam.", "Pilih periode, buka ringkasan, detail dan unduh CSV/PDF.", "Tanggal dan zona sesuai perangkat; zona tidak selalu WIB.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/integration/rector-access.test.ts", "device timezone is consistent across filters, summary, details and exports", "api") });
add("REC", "Rektor", "Implementasi saat ini", "CSV seluruh halaman cocok filter dan tidak memuat data mahasiswa", "Tabel beberapa halaman dan filter kronologi.", "Unduh tabel lalu hitung seluruh baris.", "Seluruh baris cocok termasuk halaman lain; tidak ada identitas, nilai individual atau jawaban mahasiswa.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "exports contain all matching rows without student content; chronology filters also affect exports", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "PDF ringkasan dan rincian lengkap", "Halaman ringkasan, dosen dan kelas.", "Unduh laporan pada setiap halaman.", "PDF valid memuat filter, waktu data, definisi dan label demo saat fixture dipakai.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/rector-reporting.test.ts", "PDF reports generate complete valid files for overview, lecturer and class", "unit") });
add("REC", "Rektor", "Implementasi saat ini", "Publikasi, nilai draf dan koreksi tidak tercampur", "Tugas belum dinilai, draf, publikasi dan koreksi.", "Periksa progres penilaian dan riwayat pada rincian kelas.", "Publikasi memakai status sebenarnya; laporan tidak membawa nilai mahasiswa.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/integration/rector-access.test.ts", "latest submissions, true publication and no student payload", "api") });
add("REC", "Rektor", "Implementasi saat ini", "Keluar dan penonaktifan mengakhiri akses laporan", "Akun rektor aktif lalu dinonaktifkan atau keluar.", "Panggil ulang API laporan setelah status berubah.", "Sesi berakhir atau akun dinonaktifkan tidak dapat membaca laporan.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik melalui menu akun rektor.", priority: "P0", priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.", automation: existing("tests/integration/rector-access.test.ts", "deactivation and logout revoke report access", "api") });
add("REC", "Rektor", "Implementasi saat ini", "Responsif dan teks terbaca", "Desktop 1440, tablet 820, ponsel 390 piksel.", "Buka Ringkasan, rincian dosen/kelas, filter dan riwayat pada tiap ukuran.", "Tidak ada konten terpotong; tabel dapat digeser; navigasi dan tombol terbaca.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik.", priority: "P1", priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini." });
add("REC", "Rektor", "Implementasi saat ini", "Kesalahan pemuatan dan Coba lagi", "API sementara tidak tersedia; sesi kemudian kedaluwarsa.", "Buka laporan, pulihkan API, tekan Coba lagi; uji sesi berakhir.", "Pesan mudah dipahami; mencoba kembali memulihkan laporan; sesi berakhir meminta masuk dan tidak memicu 401 berulang.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik.", priority: "P1", priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini." });
add("REC", "Rektor", "Implementasi saat ini", "Tidak ada pembagi dan sumber belum tersedia", "Filter tanpa pekerjaan; presensi, forum, telekonferensi.", "Baca persentase dan panduan membaca laporan.", "Belum ada data menggantikan rasio tanpa pembagi; sumber belum tersedia dinyatakan jelas.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik.", priority: "P1", priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini." });
add("REC", "Rektor", "Implementasi saat ini", "PDF terbaca dan pergantian halaman rapi", "Laporan dengan tabel panjang dari kelas dan dosen.", "Buka seluruh halaman PDF dan bandingkan dengan filter layar.", "Teks dan tabel terbaca, tidak terpotong; waktu data dan label demo tercetak.", { requirements: [], sourceDocument: "current", navigation: "Buka Pemantauan Akademik.", priority: "P1", priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini." });
add("HELP", "Mahasiswa", "Implementasi saat ini", "Bantuan membuka panduan HTML pada tab baru sesuai peran", "Akun Mahasiswa yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.", "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.", "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.", { requirements: [], sourceDocument: "current", navigation: "Buka Bantuan.", priority: "P1", priorityBasis: "Regresi panduan berdasarkan peran.", automation: existing("tests/standalone-guide.test.ts", "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist", "unit", "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.") });
add("HELP", "Dosen", "Implementasi saat ini", "Bantuan membuka panduan HTML pada tab baru sesuai peran", "Akun Dosen yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.", "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.", "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.", { requirements: [], sourceDocument: "current", navigation: "Buka Bantuan.", priority: "P1", priorityBasis: "Regresi panduan berdasarkan peran.", automation: existing("tests/standalone-guide.test.ts", "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist", "unit", "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.") });
add("HELP", "Admin Prodi", "Implementasi saat ini", "Bantuan membuka panduan HTML pada tab baru sesuai peran", "Akun Admin Prodi yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.", "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.", "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.", { requirements: [], sourceDocument: "current", navigation: "Buka Bantuan.", priority: "P1", priorityBasis: "Regresi panduan berdasarkan peran.", automation: existing("tests/standalone-guide.test.ts", "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist", "unit", "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.") });
add("HELP", "Super Admin", "Implementasi saat ini", "Bantuan membuka panduan HTML pada tab baru sesuai peran", "Akun Super Admin yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.", "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.", "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.", { requirements: [], sourceDocument: "current", navigation: "Buka Bantuan.", priority: "P1", priorityBasis: "Regresi panduan berdasarkan peran.", automation: existing("tests/standalone-guide.test.ts", "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist", "unit", "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.") });
add("HELP", "Rektor", "Implementasi saat ini", "Bantuan membuka panduan HTML pada tab baru sesuai peran", "Akun Rektor yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.", "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.", "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.", { requirements: [], sourceDocument: "current", navigation: "Buka Bantuan.", priority: "P1", priorityBasis: "Regresi panduan berdasarkan peran.", automation: existing("tests/standalone-guide.test.ts", "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist", "unit", "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.") });
add("HELP", "Rektor", "Implementasi saat ini", "Panduan terlindungi saat belum masuk dan setelah keluar", "Tab panduan terbuka; sesi belum ada atau diakhiri pada tab aplikasi.", "Buka URL panduan tanpa sesi; masuk lalu keluar dari tab aplikasi, kembali ke tab panduan dan muat ulang.", "Tanpa sesi pengguna diminta masuk; setelah keluar akses mengikuti sesi aktual, tidak tetap menampilkan petunjuk peran sebelumnya.", { requirements: [], sourceDocument: "current", navigation: "Buka /Panduan/panduan.html.", priority: "P1", priorityBasis: "Perilaku autentikasi panduan lintas tab." });

// Human-facing copy only; identifiers and assertion mappings remain stable.
const copyCorrections = {
  kuisB: "kuis B",
  KuisB: "Kuis B",
  "prasyarat.": "prasyarat.",
  peralurmendasar: "per alur mendasar",
  Acceptance: "Acceptance",
  lintasperan: "lintas peran",
  lintaslayanan: "lintas layanan",
  nilaiterbit: "nilai terbit",
  peralurmendasar: "per alur mendasar",
  dantrash: "dan trash",
  danpeserta: "dan peserta",
  danmateri: "dan materi",
  danmanual: "dan manual",
  penanggungjawab: "penanggung jawab",
  diSSO: "di SSO",
  SOPbackup: "SOP backup",
  formatXLSX: "format XLSX",
  "15MB": "15 MB",
  "50item": "50 item",
  "51draf": "51 draf",
  "14hari": "14 hari",
  "14haridan": "14 hari dan",
  "7hari": "7 hari",
  "7haridan": "7 hari dan",
  tujuhhari: "tujuh hari",
  "10halaman": "10 halaman",
  PDF10halaman: "PDF 10 halaman",
  "detik.": " detik.",
  "100detik": "100 detik",
  nyata5detik: "nyata 5 detik",
  posisi10: "posisi 10",
  "maxWords=100": "maxWords=100",
  page2: "page 2",
  page3: "page 3",
  halaman5: "halaman 5",
  page5: "page 5",
  filev1kemudianv2: "file v1 kemudian v2",
  Filev1kemudianv2: "File v1 kemudian v2",
  Kirimv2: "Kirim v2",
  "v1 SUPERSEDED": "v1 SUPERSEDED",
  "banner versi baru": "banner versi baru",
  "4baris": "4 baris",
  "beberapa baris sah": "beberapa baris sah",
  "3000ms": "3.000 ms",
  "2FA": "2FA",
  "5request": "5 request",
  "30request": "30 request",
  "request/detik": "request/detik",
  "429dengan": "429 dengan",
  banjirrequest: "banjir request",
  retrybackoff: "retry backoff",
  circuitbreaker: "circuit breaker",
  "upload/downloadticket": "upload/download ticket",
  "stagingbare-metal": "staging bare-metal",
  "2instanceAPI": "2 instance API",
  "1worker": "1 worker",
  antrian: "antrean",
  "environmentdev/prod": "environment dev/prod",
  LiveDev3001danProduction3000: "Live Dev 3001 dan Production 3000",
  prosesPM2: "proses PM2",
  reloadPM2: "reload PM2",
  backupstaging: "backup staging",
  "offsite.": "offsite.",
  "salinan offsite": "salinan offsite",
  danSHA256valid: "dan SHA-256 valid",
  jadwal02WIB: "jadwal 02 WIB",
  harian02WIB: "harian 02 WIB",
  Restorebackup: "Restore backup",
  "Relasi,nilai,audit": "Relasi, nilai, audit",
  "RPO/RTOdiukur": "RPO/RTO diukur",
  "terhadap§7.2": "terhadap §7.2",
  "Waktu operasionalWIB": "Waktu operasional WIB",
  "browserzonaAsia/Singapore": "browser zona Asia/Singapore",
  "deadline,notifikasi,timestampaudit": "deadline, notifikasi, timestamp audit",
  "WIBUTC+7": "WIB UTC+7",
  "sesua i": "sesuai",
  "150–250pengguna": "150–250 pengguna",
  "fixture load": "fixture load",
  lintasprodi: "lintas prodi",
  berbagaiukuran: "berbagai ukuran",
  "Nama,MIMEdan tanggalfile": "Nama, MIME dan tanggal file",
  berhakakses: "berhak akses",
  perkelas: "per kelas",
  MateriA: "Materi A",
  sebelumkuis: "sebelum kuis",
  staging2FA: "staging 2FA",
  "salah/kedaluwarsa": "salah/kedaluwarsa",
  hitungmundur: "hitung mundur",
  berjangkawaktu: "berjangka waktu",
  setelahexpiry: "setelah expiry",
  sesuaiACL: "sesuai ACL",
  "beberapa mahasiswa": "beberapa mahasiswa",
  "Tugas,kuis danpertemuan": "Tugas, kuis dan pertemuan",
  zonaWIB: "zona WIB",
  "NotifikasiWhatsApp/Email": "Notifikasi WhatsApp/Email",
  gatewaystaging: "gateway staging",
  yangtepat: "yang tepat",
  arahSIAKAD: "arah SIAKAD",
  dataakademikstaging: "data akademik staging",
  rilisP1: "rilis P1",
  rilisP2: "rilis P2",
  nilai70: "nilai 70",
  "lama tetap70": "lama tetap 70",
  Nilai70: "Nilai 70",
  revisi85: "revisi 85",
  "Koreksi ke85": "Koreksi ke 85",
  Nilai85: "Nilai 85",
  "Nilai terbit70→85": "Nilai terbit 70→85",
  "snapshot70→85": "snapshot 70→85",
  "soal nomor 5": "soal nomor 5",
  "batas attempt belum habis": "batas attempt belum habis",
  "Total=84.25": "Total = 84.25",
  "Kriteria selesai": "Kriteria selesai",
  "Tugas25%, Kuis15%, UTS25%, UAS25%, Progres10%; total100%":
    "Tugas 25%, Kuis 15%, UTS 25%, UAS 25%, Progres 10%; total 100%",
  "periode yang sama": "periode yang sama",
  versi2: "versi 2",
  "tugas versi2": "tugas versi 2",
  "2detik": "2 detik",
  "50MB": "50 MB",
  "100MB": "100 MB",
};
Object.assign(copyCorrections, {
  Progres0: "Progres 0",
  HTTP409: "HTTP 409",
  "AkunA/B": "Akun A/B",
  "materi1/2": "materi 1/2",
  tunggu2: "tunggu 2",
  lewat14: "lewat 14",
  dan50: "dan 50",
  terbit70: "terbit 70",
  Halaman5: "Halaman 5",
  TRASH7: "TRASH 7",
  redirectHTTPS: "redirect HTTPS",
  AksesHTTP: "Akses HTTP",
  sertifikatHTTPS: "sertifikat HTTPS",
  Endpointauth5: "Endpoint autentikasi 5",
  API30: "API 30",
  berlebih429: "berlebih 429",
  Timeout3: "Timeout 3",
  Periksa2: "Periksa 2",
  dan1: "dan 1",
  skemaversi: "skema versi",
  serverUTC: "server UTC",
  "sesuai§": "sesuai §",
  login2FA: "login 2FA",
  Tugas80: "Tugas 80",
  Kuis70: "Kuis 70",
  UTS90: "UTS 90",
  UAS85: "UAS 85",
  Progres100: "Progres 100",
  Durasi300: "Durasi 300",
  Durasi100: "Durasi 100",
  sebelumnya10: "sebelumnya 10",
  maksimal5: "maksimal 5",
  tidak20: "tidak 20",
  providerYOUTUBE: "provider YOUTUBE",
  duration100: "duration 100",
  "dan8.1": "dan 8.1",
  TTL15menit: "TTL 15 menit",
  sebelum7: "sebelum 7",
  "Pelaku,waktu,before,after,reason,requestId":
    "Pelaku, waktu, before, after, reason, requestId",
  "0BYTE": "0 byte",
  "1BYTE": "1 byte",
  "20MB": "20 MB",
  "50MB_PLUS": "50 MB + 1 byte",
  "100MB_PLUS": "100 MB + 1 byte",
});
const replacements = Object.entries(copyCorrections)
  .filter(([from, to]) => from !== to && from !== "detik.")
  .sort(([a], [b]) => b.length - a.length);
function readable(value) {
  if (typeof value === "string") {
    for (const [from, to] of replacements) value = value.replaceAll(from, to);
    return value;
  }
  if (Array.isArray(value)) return value.map(readable);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, readable(v)]),
    );
  return value;
}
for (const c of cases)
  for (const key of [
    "title",
    "data",
    "preconditions",
    "steps",
    "expected",
    "cleanup",
    "manualReason",
  ])
    c[key] = readable(c[key]);
const documentNotes = [
  "Tambahan REC-004 dan seterusnya serta HELP mengacu pada implementasi dan panduan 7 Oktober 2026, bukan penambahan butir RTM resmi. Peran Re ktor memakai sesi e-learning yang sama; zona waktu mengikuti perangkat.".replace("Re ktor", "Rektor"),
  "RTM §3.1.1 menyebut 151 butir, tetapi 15 rentang kode yang ditampilkan berjumlah 117. Detail per butir pada PDF requirement tidak ada di workspace; keterlacakan memakai keluarga kode dan paragraf v5 yang tersedia.",
  "RTM menyebut 4 tipe kuis, sedangkan §3.1 dan §3.3.2 menguraikan 8 tipe. Katalog mengikuti uraian lengkap 8 tipe.",
  "Prioritas dan role tiap kasus diturunkan dari cakupan §3.1. CRS-007/008 disebut eksplisit. Pembagian prioritas per kode lain tidak dirinci oleh dokumen.",
  "Istilah status/event cause-effect diverifikasi persis terhadap dokumen; ekuivalensi implementasi memerlukan keputusan PO, bukan diasumsikan otomatis.",
  "Hasil otomatis lokal dengan fixture tidak membuktikan penerimaan SSO/File Service kampus, antivirus nyata, Redis produksi, VPS atau performa pilot.",
];
const catalog = {
  version: 1,
  document: {
    title: "Technical Design E-Learning UAY · v5.0",
    path: sourcePath,
    sha256: createHash("sha256").update(source).digest("hex"),
    notes: documentNotes,
  },
  roles,
  priorities: ["P0", "P1", "P2"],
  modules: Object.values(modules),
  families: Object.entries(familyRanges).map(([code, count]) => ({
    code,
    range: `${code}-001–${String(count).padStart(3, "0")}`,
    module: modules[code],
  })),
  cases,
};
if (new Set(cases.map((c) => c.id)).size !== cases.length)
  throw new Error("Duplicate test-case identifiers");
function writeGenerated(path, contents) {
  if (!existsSync(path) || readFileSync(path, "utf8") !== contents)
    writeFileSync(path, contents);
}
mkdirSync(resolve("docs/qa"), { recursive: true });
writeGenerated("docs/qa/catalog.json", JSON.stringify(catalog, null, 2) + "\n");
writeGenerated(
  "docs/qa/fixtures.json",
  JSON.stringify({ questionScenarios, blockSamples, gradeBands }, null, 2) +
    "\n",
);
mkdirSync("apps/qa/public/source", { recursive: true });
const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
writeGenerated(
  "apps/qa/public/source/v5.html",
  `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dokumen teknis E-Learning UAY v5</title><style>body{margin:0;background:#f5f7fa;color:#304a62;font:14px/1.8 Consolas,monospace}header{padding:20px 28px;background:#173e61;color:white;font:16px system-ui}pre{white-space:pre-wrap;margin:20px auto;padding:24px;background:white;max-width:1200px}span{display:block;scroll-margin-top:16px;overflow-wrap:anywhere}span:target{background:#fff0ae}a{color:#90a5b5;text-decoration:none;display:inline-block;width:52px;font-size:12px;user-select:none}</style><header>Technical Design · E-Learning UAY v5.0</header><pre>${source
    .split("\n")
    .map(
      (line, i) =>
        `<span id="L${i + 1}"><a href="#L${i + 1}">${i + 1}</a>${escapeHtml(line)}</span>`,
    )
    .join("")}</pre></html>`,
);
writeGenerated("apps/qa/public/source/current.html", '<!doctype html><html lang="id"><meta charset="utf-8"><title>Cakupan implementasi terkini</title><body style="max-width:900px;margin:40px auto;font:18px/1.7 system-ui"><h1 id="L1">Cakupan implementasi 7 Oktober 2026</h1><p>Tambahan QA memverifikasi implementasi pemantauan akademik satu pintu, panduan sesuai lima peran, waktu lokal dan ekspor. Dasar isi: apps/web/src/data/helpGuide.json, tests/rector-reporting.test.ts, tests/integration/rector-access.test.ts dan tests/standalone-guide.test.ts. Bukan requirement RTM resmi baru.</p><p>Hasil otomatis hanya membuktikan lingkup assertion yang dipetakan. Tata letak, tab baru, cetak dan layanan kampus tetap memerlukan bukti manual.</p></body></html>');
console.log(
  `QA catalog: ${cases.length} scenarios, ${cases.filter((c) => c.automation).length} automated mappings, ${catalog.families.length} RTM families.`,
);
export { catalog, questionScenarios, blockSamples, gradeBands };
