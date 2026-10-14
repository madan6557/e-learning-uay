import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const sourcePath =
  "docs/requirements/Technical Design - E-Learning UAY - v5.0.md";
const source = readFileSync(sourcePath, "utf8");
const roles = [
  "Mahasiswa",
  "Dosen",
  "Asisten Dosen (Asdos)",
  "Dosen Kolaborator",
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
  PRA: "Kelas praktikum terhubung",
  UI: "Tampilan & interaksi bersama",
  SYN: "Sinkronisasi pengguna & integrasi",
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
    ACC: "Buka Beranda E-Learning setelah login, lalu periksa menu profil akun.",
    SDH: "Di Beranda, buka Dashboard Mahasiswa. Pilih kelas uji yang tercantum di Data uji.",
    TDH: "Di Beranda, buka Dashboard Dosen. Pilih kelas yang ditugaskan dan tercantum di Data uji.",
    CRS: "Buka menu Kelola kelas/Mata kuliah; pilih kelas uji yang disediakan tim, bukan kelas pengguna nyata.",
    ENR: "Di kelas uji pada sesi, buka Peserta; cari NIM atau email mahasiswa yang tercantum di Data uji.",
    SEC: "Di kelas uji pada sesi, buka Pertemuan; pilih atau buat pertemuan terpisah sesuai Data uji.",
    RES:
      role === "Mahasiswa"
        ? `Di kelas uji pada sesi, buka Materi dan pilih materi terbit “${title}” untuk akun mahasiswa uji.`
        : `Di kelas uji pada sesi, buka Materi; pilih materi “${title}” atau buat draf uji baru dengan nama itu, lalu siapkan isinya sesuai Data uji.`,
    QZ:
      role === "Mahasiswa"
        ? `Di kelas uji pada sesi, buka Kuis dan pilih kuis terbit “${title}” yang disediakan untuk akun uji.`
        : `Di kelas uji pada sesi, buka Kuis/Bank soal; pilih atau buat kuis uji “${title}” dan atur butirnya sesuai Data uji.`,
    ASG:
      role === "Mahasiswa"
        ? `Di kelas uji pada sesi, buka Tugas dan pilih tugas “${title}” yang ditetapkan pada Data uji.`
        : `Di kelas uji pada sesi, buka Tugas; pilih atau buat tugas uji “${title}” dengan konfigurasi dari Data uji.`,
    GRD: "Di kelas uji pada sesi, buka Nilai; pilih kategori atau tugas yang namanya dan kondisi awalnya tercantum di Data uji.",
    ANN: "Di kelas uji yang ditetapkan tim, buka Pengumuman; pilih atau buat pengumuman uji terpisah dengan judul kasus.",
    NOT: "Buka ikon lonceng/Notifikasi di navigasi atas; siapkan item yang dihasilkan aktivitas khusus pada Data uji.",
    ATT: "Di kelas uji pada sesi, buka Presensi; pilih sesi yang tanggal dan statusnya tercantum di Data uji.",
    ISO: "Buka Program Studi & Otoritas → Pengguna; cari akun uji dan prodi sumber/tujuan yang tertulis di Data uji.",
    REC: "Masuk ke Pemantauan Akademik sebagai Rektor; untuk API, kirim GET ke /api/v1/integrations/rector/snapshot dengan bearer token uji.",
    PRA: "Masuk dengan akun Asdos yang ditugaskan di kelas utama uji; dari kelas itu pilih Buat/Buka kelas praktikum.",
    UI: `Buka halaman ${title} sesuai peran di Data uji; pastikan tema dan tabel pada halaman tersebut tersedia.`,
    SYN: "Buka Program Studi & Otoritas → Pengguna → Sinkron Pengguna; gunakan akun uji SSO yang tercantum di Data uji.",
    BVA: `Buka modul ${modules[family] ?? family} pada kelas uji; siapkan batas atau berkas yang tercantum di Data uji.`,
    PRG: "Di kelas uji pada sesi, buka Materi; pilih video/PDF uji yang nama, durasi, atau jumlah halamannya tertulis di Data uji.",
    FIL: /peserta lain|jawaban peserta/i.test(title)
      ? "Masuk sebagai Mahasiswa A pada Data uji; buka kelas uji → Tugas → Pengumpulan dan coba akses jawaban milik Mahasiswa B."
      : /tiket|trash|restore|storage|zero-binary/i.test(title)
        ? "Buka File Service/Berkas pada kelas uji; pilih berkas privat atau entri Trash yang sesuai nama, status, dan umur pada Data uji."
        : /cover publik/i.test(title)
          ? "Buka pengaturan kelas uji; pilih cover publik dan PDF materi privat yang disediakan pada Data uji."
          : "Di kelas uji pada sesi, buka Materi → Lampiran/Video; pilih berkas yang MIME dan ukurannya sama dengan Data uji.",
    FDB: "Di kelas uji pada sesi, buka Tugas/Kuis/Materi sesuai judul kasus; siapkan draf dengan status dan isi awal pada Data uji.",
    CE: `Di kelas uji pada sesi, buka Materi & aktivitas lalu pilih objek “${title}”; siapkan kondisi awal pada Data uji.`,
    AUD: "Buka Jejak audit pada kelas uji yang ditetapkan tim; masuk dengan akun pengelola yang dapat membaca rekaman tersebut.",
    OPS: "Buka runbook staging; pilih dashboard/terminal komponen dengan nama host atau layanan yang tercantum di Data uji.",
    FUT: "Buka modul dan halaman yang tertulis di Data uji; jika kontrol rilis belum tersedia, jangan lanjut dan catat Terblokir.",
    PILOT:
      "Buka Test case, atur filter Prioritas dan Modul sesuai Data uji, lalu siapkan bukti UAT untuk setiap kasus yang tampil.",
  };
  const navigation =
    options.navigation ??
    contexts[family] ??
    `Buka modul ${modules[family] ?? family} pada target uji; siapkan entitas dan kondisi awal yang tercantum di Data uji.`;
  const loginExpected =
    options.loginExpected ??
    (role === "Asisten Dosen (Asdos)"
      ? "Profil menunjukkan akun uji Asdos dan kelas utama tetap menampilkan batas aksesnya."
      : role === "Dosen Kolaborator"
        ? "Profil menunjukkan akun uji dosen dan kelas yang tampil sesuai penugasannya."
        : role === "Operator / DevOps"
          ? "Target, versi build, dan waktu pengujian tercatat sebelum langkah operasional."
          : `Profil menunjukkan akun uji dengan peran ${role} yang diminta kasus.`);
  const login =
    role === "Asisten Dosen (Asdos)"
      ? "Masuk dengan akun mahasiswa yang sudah ditugaskan sebagai Asdos pada kelas utama uji; pastikan kelas utama tetap menampilkan akses terbatas."
      : role === "Dosen Kolaborator"
        ? "Masuk dengan akun Dosen yang ditugaskan sebagai kolaborator pada kelas uji; pastikan identitas dan cakupan kelas benar."
        : role === "Operator / DevOps"
          ? "Gunakan lingkungan staging atau database terisolasi; catat versi aplikasi dan waktu mulai."
          : `Masuk melalui SSO dengan akun uji resmi berperan ${role}; pastikan peran di profil sesuai.`;
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
    ...(options.sourceDocument
      ? { sourceDocument: options.sourceDocument }
      : {}),
    featureKeys: options.featureKeys ?? [],
    availability:
      options.availability ??
      (family === "FUT" || options.scope === "future" ? "backlog" : "active"),
    requirements:
      options.requirements ??
      (familyRanges[family]
        ? [`${family}-001–${String(familyRanges[family]).padStart(3, "0")}`]
        : []),
    preconditions:
      options.preconditions ??
      (options.scope === "external"
        ? [
            "Target staging/UAT atau lingkungan uji produksi yang disetujui tersedia; gunakan akun dan data uji terpisah.",
            "Siapkan akses komponen, runbook dan pemilik layanan yang terkait.",
          ]
        : options.scope === "future"
          ? [
              "Rilis P1/P2 yang diuji menyediakan fitur ini; catat Terblokir jika belum tersedia.",
              "Gunakan kelas dan akun uji terpisah dalam kewenangan peran kasus.",
            ]
          : [
              "URL target pada pengaturan sesi mengarah ke staging/UAT atau lingkungan uji produksi yang disetujui; catat versi build yang diuji.",
              "Gunakan hanya akun dan data uji yang disediakan pemilik lingkungan. Jangan mengubah atau menghapus data pengguna nyata.",
            ]),
    data,
    steps: options.steps ?? [
      {
        action: login,
        expected: loginExpected,
      },
      {
        action: navigation,
        expected:
          options.setupExpected ??
          `Halaman ${modules[family] ?? family} menampilkan akun, kelas, dan objek yang sama dengan Data uji. Pastikan status awalnya cocok sebelum melakukan perubahan; jika akun/objek/status tidak cocok, berhenti dan tandai Terblokir.`,
      },
      { action, expected },
      {
        action:
          options.verify ??
          "Periksa tampilan atau respons setelah tindakan sebelumnya. Bandingkan nilainya, status, dan pesan dengan kriteria Hasil yang diharapkan; catat hasil aktual sebelum lanjut.",
        expected: options.verifyExpected ?? expected,
      },
    ],
    expected,
    cleanup:
      options.cleanup ??
      "Simpan hasil dan bukti. Pulihkan hanya data uji yang dibuat atau diubah sesuai prosedur tim; jangan menghapus data nyata.",
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

function roleLoginSteps(role) {
  const loginAction =
    role === "Asisten Dosen (Asdos)"
      ? "Masuk dengan akun mahasiswa uji yang sudah ditugaskan sebagai Asdos di kelas utama; tunggu kembali ke E-Learning."
      : role === "Dosen Kolaborator"
        ? "Masuk dengan akun dosen uji yang sudah ditugaskan sebagai kolaborator pada kelas utama; tunggu kembali ke E-Learning."
        : `Masuk dengan akun uji aktif untuk peran ${role} yang tercantum pada Data uji; tunggu callback kembali ke E-Learning.`;
  const roleCheck =
    role === "Asisten Dosen (Asdos)"
      ? "Profil menunjukkan akun mahasiswa yang ditugaskan sebagai Asdos; kelas utama tetap membatasi haknya."
      : role === "Dosen Kolaborator"
        ? "Profil menunjukkan akun dosen yang ditugaskan sebagai kolaborator dan kelas sesuai penugasan."
        : `Profil menunjukkan identitas akun uji dan peran ${role}.`;
  return [
    {
      action:
        "Buka URL target E-Learning dari Pengaturan sesi di jendela browser baru, lalu pilih Masuk dengan SSO.",
      expected:
        "Halaman login E-Learning terbuka dan memakai penyedia SSO kampus pada target sesi.",
    },
    { action: loginAction, expected: "SSO menerima akun uji dan mengembalikan browser ke E-Learning." },
    { action: "Buka menu profil akun dan periksa nama/identitas serta peran yang ditampilkan.", expected: roleCheck },
    {
      action:
        "Buka Beranda, lalu periksa dashboard dan menu utama yang tersedia untuk akun tersebut.",
      expected:
        "Dashboard dan menu cocok dengan hak akses peran/penugasan akun; tidak ada password lokal yang diminta.",
    },
  ];
}

// Document-derived scenarios. Requirement ranges are deliberately kept at family level.
for (const role of roles.slice(0, 4))
  add(
    "ACC",
    role,
    "2.2",
    `Login SSO dan pemetaan peran ${role}`,
    `Akun uji SSO berstatus aktif untuk ${role}; penugasan kelas utama disiapkan jika role berupa Asdos atau kolaborator.`,
    "Klik Masuk dengan SSO, selesaikan login, lalu buka dashboard dan profil.",
    "Sesi terbentuk; dashboard dan menu sesuai peran tanpa password lokal.",
    { steps: roleLoginSteps(role) },
  );
add(
  "ACC",
  "Mahasiswa",
  "2.2",
  "Authorization Code + PKCE dan sesi tanpa password",
  "Satu akun mahasiswa uji berstatus aktif pada SSO staging/UAT dan diizinkan mengakses aplikasi E-Learning.",
  "Selesaikan login SSO; periksa callback dan /api/v1/me.",
  "JWT/nonce tervalidasi dan sesi HttpOnly terbentuk; data mahasiswa tidak berisi password.",
  {
    steps: [
      {
        action:
          "Buka URL target E-Learning dari Pengaturan sesi dan pilih Masuk dengan SSO.",
        expected:
          "Browser diarahkan ke halaman SSO kampus untuk client aplikasi pada target sesi.",
      },
      {
        action:
          "Autentikasi dengan akun mahasiswa aktif pada Data uji, lalu tunggu redirect ke URL callback E-Learning.",
        expected:
          "Callback membawa authorization code dan state; browser kembali ke E-Learning tanpa meminta password lokal.",
      },
      {
        action:
          "Di DevTools → Network, periksa callback OIDC dan GET /api/v1/me; jangan menyalin atau menyimpan token sensitif.",
        expected:
          "Code ditukar melalui PKCE, state/nonce valid, dan /api/v1/me menampilkan identitas mahasiswa tanpa password.",
      },
      {
        action:
          "Muat ulang Beranda lalu buka profil untuk memastikan sesi yang sama tetap aktif.",
        expected:
          "Profil tetap menampilkan akun uji yang sama dan sesi berbasis cookie HttpOnly masih berlaku.",
      },
    ],
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
  "Akun aktif dan nonaktif khusus uji dari pemilik SSO; nilai callback uji dengan state, nonce, atau audience yang tidak cocok.",
  "Ulangi callback OIDC dengan data tidak sah pada lingkungan fixture.",
  "State/nonce/audience salah ditolak 401; akun nonaktif ditolak 403.",
  {
    steps: [
      {
        action:
          "Pastikan pemilik SSO staging/UAT menyediakan akun aktif, akun nonaktif, dan nilai callback negatif khusus pengujian.",
        expected:
          "Kedua akun dan nilai state/nonce/audience negatif tercatat di Data uji dan hanya berlaku pada target uji.",
      },
      {
        action:
          "Jalankan callback OIDC memakai state yang salah, lalu ulangi terpisah dengan nonce dan audience yang salah.",
        expected:
          "Setiap callback dengan state, nonce, atau audience yang tidak cocok ditolak dengan 401 dan tidak membuat sesi.",
      },
      {
        action:
          "Mulai login dengan akun nonaktif yang disiapkan pemilik SSO dan ikuti redirect kembali ke E-Learning.",
        expected:
          "Login akun nonaktif ditolak dengan 403 dan sesi E-Learning tidak terbentuk.",
      },
      {
        action:
          "Periksa respons GET /api/v1/me pada browser setelah setiap percobaan.",
        expected:
          "Tidak ada percobaan gagal yang meninggalkan sesi atau membuka data akun.",
      },
    ],
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
  "Akun mahasiswa uji aktif dengan sesi E-Learning yang access token-nya sudah kedaluwarsa sesuai jadwal uji.",
  "Paksa expiry pada fixture, lalu panggil /me memakai cookie sesi.",
  "SSO menerima refresh; token server berganti dan identitas tervalidasi.",
  {
    steps: [
      {
        action:
          "Masuk melalui SSO dengan akun mahasiswa pada Data uji dan pastikan Beranda E-Learning terbuka.",
        expected:
          "Profil menampilkan akun mahasiswa uji yang benar dan sesi aktif terbentuk.",
      },
      {
        action:
          "Gunakan sesi yang masa access token-nya telah berakhir sesuai jadwal uji; jangan mengubah token secara manual pada produksi.",
        expected:
          "Cookie sesi masih tersedia untuk menjalankan mekanisme refresh yang diuji.",
      },
      {
        action:
          "Muat ulang Beranda atau panggil GET /api/v1/me dengan cookie sesi yang sama.",
        expected:
          "Aplikasi meminta refresh ke SSO dan endpoint mengembalikan identitas akun yang masih aktif.",
      },
      {
        action:
          "Muat ulang profil sekali lagi dan pastikan sesi dapat digunakan tanpa login ulang.",
        expected:
          "Identitas tetap tervalidasi dan refresh token server-side telah diperbarui.",
      },
    ],
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
  "Akun Super Admin sintetis khusus uji yang aktif; pemilik SSO menyiapkan prosedur pencabutan akses dan webhook bertanda tangan.",
  "Nonaktifkan akun pada fixture SSO dan kirim webhook bertanda tangan; akses /me kembali.",
  "Akses akun menjadi 403 dan status cache identitas DISABLED.",
  {
    steps: [
      {
        action:
          "Masuk ke E-Learning menggunakan akun Super Admin uji pada Data uji dan biarkan sesi tetap aktif.",
        expected:
          "Profil menunjukkan akun uji yang benar dan GET /api/v1/me masih mengembalikan 200.",
      },
      {
        action:
          "Minta pemilik SSO staging/UAT menonaktifkan akun uji melalui prosedur resmi dan mengirim webhook revokasi yang sah.",
        expected:
          "Pemilik SSO mengonfirmasi webhook terkirim untuk identitas akun uji tersebut.",
      },
      {
        action:
          "Tanpa login ulang, panggil GET /api/v1/me menggunakan sesi browser yang tadi aktif.",
        expected:
          "Endpoint menolak sesi yang telah dicabut dengan status 403.",
      },
      {
        action:
          "Coba buka kembali Beranda atau halaman terlindungi menggunakan tab yang sama.",
        expected:
          "Akses tetap ditolak dan akun tersimpan sebagai nonaktif pada cache identitas.",
      },
    ],
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
  "Akun mahasiswa uji aktif dengan sesi SSO yang masih berjalan.",
  "Klik Keluar, selesaikan logout provider lalu coba akses /me dengan sesi lama.",
  "Cookie sesi dicabut dan akses /me menjadi 401.",
  {
    steps: [
      {
        action:
          "Masuk dengan akun mahasiswa pada Data uji dan pastikan Beranda E-Learning terbuka.",
        expected:
          "Profil menunjukkan akun yang benar dan sesi E-Learning aktif.",
      },
      {
        action:
          "Pilih Keluar dari menu profil, lalu selesaikan logout pada halaman SSO jika diminta.",
        expected:
          "Browser kembali ke halaman publik/login dan cookie sesi E-Learning dihapus.",
      },
      {
        action:
          "Coba buka halaman terlindungi lalu panggil GET /api/v1/me dengan sesi lama.",
        expected:
          "Halaman meminta login dan /api/v1/me menolak cookie lama dengan 401.",
      },
      {
        action:
          "Gunakan tombol kembali browser lalu muat ulang halaman E-Learning.",
        expected:
          "Konten privat tidak muncul kembali tanpa login baru.",
      },
    ],
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
  "Payload OIDC pada provider uji pertama berisi roles=[STUDENT] dan role=SUPER_ADMIN; payload kedua berisi roles=[] dan role=SUPER_ADMIN.",
  "Validasikan payload claim campuran pada adapter SSO.",
  "roles resmi menang atas alias role; array roles kosong tidak menaikkan hak akses.",
  {
    steps: [
      {
        action:
          "Buka adapter SSO pada lingkungan uji terisolasi dan siapkan dua payload OIDC di bagian Data uji.",
        expected:
          "Payload hanya dikirim ke provider/adapter uji dan memuat kombinasi roles/role yang ditentukan.",
      },
      {
        action:
          "Kirim payload pertama melalui alur pemetaan claim yang sama dengan login aplikasi.",
        expected:
          "Hasil pemetaan menetapkan STUDENT dari array roles resmi, bukan SUPER_ADMIN dari alias role.",
      },
      {
        action:
          "Kirim payload kedua dengan array roles kosong dan alias role SUPER_ADMIN.",
        expected:
          "Akun tidak memperoleh hak Super Admin hanya dari alias role.",
      },
      {
        action:
          "Periksa role hasil pemetaan dan keputusan akses untuk kedua payload pada log uji.",
        expected:
          "Kombinasi claim tidak pernah menaikkan hak akses di atas aturan yang diharapkan.",
      },
    ],
    type: "Keamanan",
    automation: existing(
      "tests/sso.test.ts",
      "SSO roles take precedence over the legacy role claim",
      "unit",
    ),
  },
);
const accessScopeCases = {
  "TC-ACC-ANON": {
    data: "Browser tanpa cookie sesi; endpoint yang diuji adalah GET /api/v1/me.",
    steps: [
      { action: "Buka URL target E-Learning di jendela browser privat dan jangan login.", expected: "Halaman publik/login tampil tanpa identitas pengguna." },
      { action: "Di DevTools → Network, kirim GET /api/v1/me tanpa header Authorization dan tanpa cookie.", expected: "Endpoint mengembalikan 401 Unauthorized." },
      { action: "Muat ulang Beranda atau halaman terlindungi pada jendela yang sama.", expected: "Aplikasi tetap meminta autentikasi dan tidak menampilkan data privat." },
      { action: "Periksa kembali cookie dan respons endpoint pada tab Network.", expected: "Tidak ada sesi yang dibuat dan tidak ada data pengguna yang dikembalikan." },
    ],
  },
  "TC-ACC-OUTSIDER": {
    data: "Akun mahasiswa uji aktif yang tidak terdaftar pada kelas sasaran; kode kelas disediakan pemilik staging.",
    steps: [
      { action: "Masuk dengan akun mahasiswa pada Data uji dan pastikan kelas sasaran tidak tercantum pada Beranda.", expected: "Akun terautentikasi tetapi tidak memiliki enrollment pada kelas sasaran." },
      { action: "Buka URL kelas sasaran yang disediakan pemilik staging secara langsung.", expected: "Halaman menolak akses atau menampilkan status tidak ditemukan tanpa isi kelas." },
      { action: "Pada DevTools → Network, periksa respons permintaan detail kelas dan materi.", expected: "API menolak permintaan dan tidak mengirim metadata atau isi kelas." },
      { action: "Muat ulang URL yang sama setelah memastikan akun masih memakai sesi mahasiswa uji.", expected: "Akses tetap ditolak; tidak ada data peserta lain yang terlihat." },
    ],
  },
  "TC-ACC-STUDENT-ROSTER": {
    data: "Akun mahasiswa uji aktif yang terdaftar pada kelas sasaran; identitas kelas disediakan pemilik staging.",
    steps: [
      { action: "Masuk dengan akun mahasiswa pada Data uji dan buka kelas sasaran dari Beranda.", expected: "Mahasiswa dapat melihat materi kelas yang diizinkan." },
      { action: "Periksa menu kelas dan pastikan tidak ada menu pengelolaan Peserta/roster.", expected: "Aksi pengelolaan daftar peserta tidak ditampilkan untuk mahasiswa." },
      { action: "Buka DevTools → Network dan coba GET endpoint roster kelas sasaran dengan sesi mahasiswa yang sama.", expected: "API menolak permintaan roster tanpa mengirim data identitas peserta." },
      { action: "Muat ulang kelas lalu periksa kembali menu dan tab Network.", expected: "Tidak ada roster atau kontrol pengelolaan yang terbuka bagi mahasiswa." },
    ],
  },
  "TC-ACC-TEACHER-SCOPE": {
    data: "Akun dosen uji aktif yang tidak ditugaskan pada kelas sasaran; kode kelas dan materi disediakan pemilik staging.",
    steps: [
      { action: "Masuk dengan akun dosen pada Data uji dan pastikan kelas sasaran tidak ada di daftar kelas yang diampu.", expected: "Profil menunjukkan dosen uji tanpa penugasan pada kelas sasaran." },
      { action: "Buka URL kelas dan materi sasaran yang disediakan pemilik staging.", expected: "Kelas/materi tidak dapat dikelola oleh dosen yang tidak ditugaskan." },
      { action: "Periksa permintaan edit materi pada DevTools → Network menggunakan sesi dosen tersebut.", expected: "API menolak perubahan dan isi materi yang dilindungi tidak bocor." },
      { action: "Muat ulang materi dan pastikan judul, isi, serta status terbit tidak berubah.", expected: "Tidak ada perubahan tersimpan pada kelas atau materi." },
    ],
  },
  "TC-ACC-DEPT-SCOPE": {
    data: "Akun Admin Prodi untuk Prodi A dan kode kelas pada Prodi B; kedua prodi disiapkan di staging.",
    steps: [
      { action: "Masuk dengan akun Admin Prodi pada Data uji dan catat prodi yang tercantum pada profil.", expected: "Akun hanya memiliki lingkup administrasi Prodi A." },
      { action: "Buka menu pengelolaan kelas/pengguna lalu pilih kode kelas milik Prodi B.", expected: "Data Prodi B tidak muncul dalam daftar yang dapat dikelola." },
      { action: "Uji URL detail atau endpoint baca Prodi B menggunakan sesi Admin Prodi yang sama.", expected: "API menolak akses tanpa mengirim data Prodi B." },
      { action: "Kembali ke daftar Prodi A dan pastikan fungsi administrasi yang berwenang tetap tersedia.", expected: "Akses Prodi A tetap normal dan tidak ada perubahan pada Prodi B." },
    ],
  },
};
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
]) {
  const scenario = accessScopeCases[id];
  add(
    "ACC",
    role,
    "5.3",
    title,
    scenario.data,
    "Akses alamat kelas/endpoint langsung memakai identitas tanpa izin.",
    "API menolak akses dan data kelas lain tidak bocor.",
    { id, type: "Keamanan", steps: scenario.steps, automation: api(id) },
  );
}
add(
  "ACC",
  "Super Admin",
  "1.3",
  "Administrasi identitas tetap di SSO",
  "Akun kampus uji yang dapat membuka profil E-Learning dan mengakses halaman pengelolaan akun pada SSO.",
  "Buka profil E-Learning; ikuti tautan kelola akun ke SSO untuk reset password / perubahan akun.",
  "E-Learning menyimpan referensi identitas; administrasi password ada pada SSO.",
  {
    steps: [
      {
        action:
          "Masuk dengan akun Super Admin uji pada target staging/UAT, lalu buka menu profil E-Learning.",
        expected:
          "Profil menampilkan akun uji dan tautan pengelolaan identitas yang mengarah ke SSO kampus.",
      },
      {
        action:
          "Pilih Kelola akun dan pastikan browser membuka halaman administrasi akun SSO.",
        expected:
          "Perubahan identitas atau password hanya tersedia pada SSO, bukan formulir lokal E-Learning.",
      },
      {
        action:
          "Kembali ke E-Learning tanpa menyimpan perubahan akun, lalu buka profil lagi.",
        expected:
          "Profil E-Learning tetap memakai identitas SSO yang sama dan tidak menampilkan pengaturan password lokal.",
      },
      {
        action:
          "Catat alamat tujuan Kelola akun dan hasil pemeriksaan profil pada bukti kasus.",
        expected:
          "Bukti menunjukkan SSO menjadi tempat administrasi identitas dan E-Learning hanya memakai referensinya.",
      },
    ],
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
        "Di Beranda Dosen, buka Dashboard; pada ringkasan penilaian klik Antrean penilaian.",
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
    type === "divider"
      ? "Blok pemisah kosong tanpa teks atau berkas; konfigurasi blok berupa objek kosong {}."
      : JSON.stringify(data),
    type === "divider"
      ? "Di editor materi, tambahkan blok Pemisah dari menu tambah blok, simpan, lalu buka kembali materi yang sama."
      : `Tambahkan blok ${type} dengan data uji, simpan materi lalu buka kembali.`,
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
    "Satu materi draf dengan tabel 2 baris × 2 kolom; baris pertama berisi header Nama | Nilai, baris kedua Rina | 85.",
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
    "Kelas uji baru tanpa perubahan bobot; kategori Tugas, Kuis, UTS, UAS, dan Progres masih memakai bobot bawaan.",
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
  "Administrasi akun di SSO",
  "Login terpadu lintas peran",
  "Berkas privat dan trash",
  "Kesiapan kelas dan peserta",
  "Penyusunan pertemuan dan materi",
  "Aktivitas belajar mahasiswa",
  "Penilaian otomatis dan manual",
  "Isolasi nilai terbit",
  "Pengujian lintas layanan kampus",
  "Keterlacakan aksi kritis",
  "Nol blocker/critical terbuka",
  "SOP backup dan penanggung jawab",
];
const pilotModules = [
  ["SSO & akses"],
  ["SSO & akses", "Mata kuliah & kelas", "Peserta"],
  ["File Service"],
  ["Mata kuliah & kelas", "Peserta"],
  ["Pertemuan", "Materi & editor"],
  ["Dashboard mahasiswa", "Progres belajar", "Tugas", "Kuis & bank soal"],
  ["Kuis & bank soal", "Tugas", "Nilai & gradebook"],
  ["Nilai & gradebook"],
  ["Pemantauan Akademik & integrasi rektor", "Sinkronisasi pengguna & integrasi"],
  ["Jejak audit"],
  ["Semua modul P0"],
  ["Operasional"],
];
pilotTitles.forEach((title, i) => {
  const moduleTargets =
    i === 10 ? ["Semua modul P0"] : pilotModules[i];
  const filters =
    i === 10
      ? "Prioritas=P0 dan semua Modul"
      : `Prioritas=P0; Modul=${moduleTargets.join(", ")}`;
  const moduleAction =
    i === 10
      ? "Biarkan filter Modul pada Semua, sehingga seluruh kasus P0 tampil."
      : moduleTargets.length === 1
        ? `Pilih Modul “${moduleTargets[0]}” pada filter Modul.`
        : `Pilih satu per satu modul berikut pada filter Modul dan ulangi langkah ini untuk tiap pilihan: ${moduleTargets.map((name) => `“${name}”`).join(", ")}.`;
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
    `Checklist UAT “${title}”; filter Prioritas=P0; modul yang diuji: ${moduleTargets.join(", ")}; akun uji untuk tiap role dan bukti hasil tersedia.`,
    `Di menu Test case, gunakan filter ${filters}. Jalankan setiap baris dengan akun yang diminta kasus, lalu lampirkan bukti ke checklist pilot “${title}”.`,
    `Kriteria ${i + 1} disetujui dengan bukti; kegagalan atau pekerjaan terbuka dicatat sebelum sign-off.`,
    {
      scope: "external",
      type: "Acceptance",
      navigation: `Di portal QA, buka Test case; atur filter Prioritas=P0. ${moduleAction} Siapkan checklist pilot “${title}” untuk mencatat hasil dan bukti.`,
      steps: [
        {
          action: "Buka Pengaturan sesi portal QA; pastikan URL target, lingkungan staging/UAT, versi build, dan nama checklist pilot sudah dicatat.",
          expected: "Sesi menunjuk ke target uji yang disetujui dan checklist UAT pilot tersedia untuk menyimpan bukti.",
        },
        {
          action: `Buka Test case dan atur filter Prioritas=P0. ${moduleAction} Catat jumlah kasus yang tampil untuk setiap pilihan modul.`,
          expected: i === 10
            ? "Daftar menampilkan semua kasus P0 dan tidak membatasi filter Modul."
            : `Daftar menampilkan kasus P0 hanya dari modul yang dipilih; jumlah tiap modul dicatat di checklist “${title}”.`,
        },
        {
          action: `Buka setiap kasus yang tampil; ikuti semua langkahnya dengan akun yang diminta kasus tersebut dan masukkan hasil aktual serta bukti ke checklist “${title}”.`,
          expected: "Setiap kasus dalam cakupan memiliki hasil dan bukti; integrasi nonaktif/backlog dicatat Terblokir, tidak Lulus.",
        },
        {
          action: "Tinjau checklist terhadap jumlah kasus yang dicatat; pastikan tidak ada kasus terlewat, lalu daftar semua Gagal, Terblokir, dan tindak lanjut sebelum sign-off.",
          expected: `Seluruh cakupan “${title}” dapat ditelusuri ke hasil dan bukti; setiap blocker atau kegagalan memiliki penanggung jawab sebelum sign-off.`,
        },
      ],
      manualReason:
        "Penerimaan pilot memerlukan bukti lintas layanan dan persetujuan pihak terkait.",
    },
  );
});
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
          ? "Catat nilai/status awal yang disebut di Data uji sebelum menjalankan skenario kasus."
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
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Masuk melalui satu akun kampus dan akses laporan hanya baca",
  "Akun Rektor, Super Admin, Dosen, Mahasiswa; sesi aktif dan tanpa sesi.",
  "Buka /rector dan panggil API laporan serta percobaan perubahan akademik.",
  "Rektor/Super Admin dapat membaca; dosen/mahasiswa ditolak; tanpa sesi 401; perubahan akademik rektor ditolak.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/integration/rector-access.test.ts",
      "same cookie works; no separate demo login or academic write",
      "api",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Ringkasan cocok dengan dosen dan rekap program studi",
  "Fixture deterministik laporan akademik.",
  "Bandingkan ringkasan, tabel dosen, dan rekap prodi dengan periode sama.",
  "Total dan kegiatan pelaku cocok tanpa peringkat otomatis.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "summary matches departmental totals, lecturer activity and daily evidence",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Kelas bersama tidak menggandakan kegiatan dan antrean",
  "Kelas dengan dua pengampu.",
  "Buka kedua dosen dan kelas bersama, lalu bandingkan ringkasan.",
  "Kegiatan diberikan kepada pelakunya; antrean kelas dihitung sekali.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "shared classes attribute evidence to actual actors; class backlog is not duplicated in university totals",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Login saja, tanpa kegiatan, tanpa kelas dan tindakan per objek",
  "Dosen aktif, hanya login, tidak aktif dan tidak diampu kelas.",
  "Bandingkan jumlah tindakan dan objek pada rincian dosen.",
  "Login terpisah dari kegiatan akademik; lima perubahan satu materi tidak menjadi lima materi.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "actions and unique objects, login-only, inactive and unassigned lecturers stay distinct",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Filter konsisten dan kondisi data tidak menjadi aktivitas baru",
  "Semester, prodi, dosen, kelas dan periode berbeda.",
  "Ubah satu filter, periksa URL, ringkasan dan rincian; muat ulang.",
  "Filter membatasi cakupan konsisten; kondisi kelas bukan kegiatan baru pada tanggal muat ulang.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "snapshot metrics ignore activity dates; semester, department, lecturer and class constrain scope",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Kiriman pengganti dan penilaian otomatis dibedakan",
  "Tugas dikirim dua kali; kuis otomatis dan pekerjaan manual.",
  "Periksa pekerjaan belum dinilai pada kelas.",
  "Kiriman lama tidak masuk antrean; penilaian kuis otomatis memiliki jumlah tersendiri.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "latest submissions exclude superseded work and automatic grading has its own total",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Rentang login berakhir pada logout yang tercatat",
  "Sesi lengkap dan kegiatan dengan awal/akhir tercatat.",
  "Baca grafik sesi dan riwayat per dosen.",
  "Rentang menggunakan bukti masuk/keluar; logout bukan kegiatan akademik; bukan durasi kerja.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "connection spans and action intervals use explicit recorded events, without crediting logout as academic work",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Grafik harian meliputi akses selama 24 jam",
  "Sesi pagi, sore dan malam pada zona perangkat.",
  "Buka grafik harian dan periksa 00.00–24.00.",
  "Semua sesi hari tersebut tampil tanpa pembatasan jam kerja.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "daily session chart covers the device's full day, including afternoon and evening connections",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Sesi melewati tengah malam tetap dapat ditelusuri",
  "Sesi lintas hari dan beberapa hari.",
  "Pilih masing-masing tanggal dan periksa rentang.",
  "Grafik membagi sesi di batas hari tanpa mengubah waktu login/logout asli.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "daily chart splits overnight and multi-day sessions without losing time or altering login/logout evidence",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Logout belum tercatat dan data kosong tidak dikarang",
  "Sesi tanpa logout, kejadian tepat tengah malam, filter kosong.",
  "Lihat grafik dan rincian pada periode tersebut.",
  "Ada keterangan belum tercatat; tidak menggambar rentang sampai sekarang tanpa bukti.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "daily chart handles exact midnight, unknown logout, and point events without invented continuation",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Waktu lokal konsisten pada layar, tanggal dan unduhan",
  "Perangkat Asia/Makassar; tanggal dekat tengah malam.",
  "Pilih periode, buka ringkasan, detail dan unduh CSV/PDF.",
  "Tanggal dan zona sesuai perangkat; zona tidak selalu WIB.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/integration/rector-access.test.ts",
      "device timezone is consistent across filters, summary, details and exports",
      "api",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "CSV seluruh halaman cocok filter dan tidak memuat data mahasiswa",
  "Tabel beberapa halaman dan filter kronologi.",
  "Unduh tabel lalu hitung seluruh baris.",
  "Seluruh baris cocok termasuk halaman lain; tidak ada identitas, nilai individual atau jawaban mahasiswa.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "exports contain all matching rows without student content; chronology filters also affect exports",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "PDF ringkasan dan rincian lengkap",
  "Halaman ringkasan, dosen dan kelas.",
  "Unduh laporan pada setiap halaman.",
  "PDF valid memuat filter, waktu data, definisi dan label demo saat fixture dipakai.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/rector-reporting.test.ts",
      "PDF reports generate complete valid files for overview, lecturer and class",
      "unit",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Publikasi, nilai draf dan koreksi tidak tercampur",
  "Tugas belum dinilai, draf, publikasi dan koreksi.",
  "Periksa progres penilaian dan riwayat pada rincian kelas.",
  "Publikasi memakai status sebenarnya; laporan tidak membawa nilai mahasiswa.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/integration/rector-access.test.ts",
      "latest submissions, true publication and no student payload",
      "api",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Keluar dan penonaktifan mengakhiri akses laporan",
  "Akun rektor aktif lalu dinonaktifkan atau keluar.",
  "Panggil ulang API laporan setelah status berubah.",
  "Sesi berakhir atau akun dinonaktifkan tidak dapat membaca laporan.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik melalui menu akun rektor.",
    priority: "P0",
    priorityBasis: "Regresi laporan rektor yang sudah diimplementasikan.",
    automation: existing(
      "tests/integration/rector-access.test.ts",
      "deactivation and logout revoke report access",
      "api",
    ),
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Responsif dan teks terbaca",
  "Desktop 1440, tablet 820, ponsel 390 piksel.",
  "Buka Ringkasan, rincian dosen/kelas, filter dan riwayat pada tiap ukuran.",
  "Tidak ada konten terpotong; tabel dapat digeser; navigasi dan tombol terbaca.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik.",
    priority: "P1",
    priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini.",
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Kesalahan pemuatan dan Coba lagi",
  "API sementara tidak tersedia; sesi kemudian kedaluwarsa.",
  "Buka laporan, pulihkan API, tekan Coba lagi; uji sesi berakhir.",
  "Pesan mudah dipahami; mencoba kembali memulihkan laporan; sesi berakhir meminta masuk dan tidak memicu 401 berulang.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik.",
    priority: "P1",
    priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini.",
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "Tidak ada pembagi dan sumber belum tersedia",
  "Filter tanpa pekerjaan; presensi, forum, telekonferensi.",
  "Baca persentase dan panduan membaca laporan.",
  "Belum ada data menggantikan rasio tanpa pembagi; sumber belum tersedia dinyatakan jelas.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik.",
    priority: "P1",
    priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini.",
  },
);
add(
  "REC",
  "Rektor",
  "Implementasi saat ini",
  "PDF terbaca dan pergantian halaman rapi",
  "Laporan dengan tabel panjang dari kelas dan dosen.",
  "Buka seluruh halaman PDF dan bandingkan dengan filter layar.",
  "Teks dan tabel terbaca, tidak terpotong; waktu data dan label demo tercetak.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Pemantauan Akademik.",
    priority: "P1",
    priorityBasis: "Pemeriksaan antarmuka dan laporan rilis saat ini.",
  },
);
function helpGuideSteps(role) {
  return [
    {
      action: `Masuk ke E-Learning dengan akun uji berperan ${role}; buka menu Profil untuk memastikan akun dan perannya benar.`,
      expected: `Nama akun uji tampil di profil dengan peran ${role}.`,
    },
    {
      action: "Dari navigasi E-Learning, klik Bantuan lalu pastikan halaman Bantuan tampil pada tab aplikasi.",
      expected: "Halaman Bantuan terbuka dan tautan Buka buku panduan terlihat.",
    },
    {
      action: "Klik Buka buku panduan (tab baru); cari judul panduan dan buka satu bagian melalui daftar isi.",
      expected: `Tab baru menampilkan panduan ${role}; tab E-Learning tetap terbuka pada halaman Bantuan.`,
    },
    {
      action: "Pada tab panduan, tambahkan ?role=SUPER_ADMIN pada akhir URL, muat ulang, lalu kembali ke tab E-Learning dan buka Profil.",
      expected: `Panduan tetap menampilkan petunjuk untuk ${role}; query URL tidak mengubah peran pada profil E-Learning.`,
    },
  ];
}
add(
  "HELP",
  "Mahasiswa",
  "Implementasi saat ini",
  "Bantuan membuka panduan HTML pada tab baru sesuai peran",
  "Akun Mahasiswa yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.",
  "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.",
  "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Bantuan.",
    steps: helpGuideSteps("Mahasiswa"),
    priority: "P1",
    priorityBasis: "Regresi panduan berdasarkan peran.",
    automation: existing(
      "tests/standalone-guide.test.ts",
      "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist",
      "unit",
      "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.",
    ),
  },
);
add(
  "HELP",
  "Dosen",
  "Implementasi saat ini",
  "Bantuan membuka panduan HTML pada tab baru sesuai peran",
  "Akun Dosen yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.",
  "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.",
  "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Bantuan.",
    steps: helpGuideSteps("Dosen"),
    priority: "P1",
    priorityBasis: "Regresi panduan berdasarkan peran.",
    automation: existing(
      "tests/standalone-guide.test.ts",
      "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist",
      "unit",
      "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.",
    ),
  },
);
add(
  "HELP",
  "Admin Prodi",
  "Implementasi saat ini",
  "Bantuan membuka panduan HTML pada tab baru sesuai peran",
  "Akun Admin Prodi yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.",
  "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.",
  "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Bantuan.",
    steps: helpGuideSteps("Admin Prodi"),
    priority: "P1",
    priorityBasis: "Regresi panduan berdasarkan peran.",
    automation: existing(
      "tests/standalone-guide.test.ts",
      "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist",
      "unit",
      "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.",
    ),
  },
);
add(
  "HELP",
  "Super Admin",
  "Implementasi saat ini",
  "Bantuan membuka panduan HTML pada tab baru sesuai peran",
  "Akun Super Admin yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.",
  "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.",
  "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Bantuan.",
    steps: helpGuideSteps("Super Admin"),
    priority: "P1",
    priorityBasis: "Regresi panduan berdasarkan peran.",
    automation: existing(
      "tests/standalone-guide.test.ts",
      "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist",
      "unit",
      "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.",
    ),
  },
);
add(
  "HELP",
  "Rektor",
  "Implementasi saat ini",
  "Bantuan membuka panduan HTML pada tab baru sesuai peran",
  "Akun Rektor yang sedang masuk; URL tambahan ?role=SUPER_ADMIN.",
  "Buka Bantuan lalu klik Buka buku panduan (tab baru). Cari artikel, buka daftar isi, dan cetak pratinjau.",
  "Tab baru terbuka tanpa mengganti Bantuan. Hanya petunjuk untuk peran akun tampil; URL tidak mengganti peran. Langkah bernomor tanpa checklist atau kotak centang.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka Bantuan.",
    steps: helpGuideSteps("Rektor"),
    priority: "P1",
    priorityBasis: "Regresi panduan berdasarkan peran.",
    automation: existing(
      "tests/standalone-guide.test.ts",
      "standalone HTML guide follows the session role, ignores role URL overrides and contains no checklist",
      "unit",
      "Filter konten dan DOM teruji; pembukaan tab, cetak dan tata letak tetap diperiksa manual.",
    ),
  },
);
add(
  "HELP",
  "Rektor",
  "Implementasi saat ini",
  "Panduan terlindungi saat belum masuk dan setelah keluar",
  "Tab panduan terbuka; sesi belum ada atau diakhiri pada tab aplikasi.",
  "Buka URL panduan tanpa sesi; masuk lalu keluar dari tab aplikasi, kembali ke tab panduan dan muat ulang.",
  "Tanpa sesi pengguna diminta masuk; setelah keluar akses mengikuti sesi aktual, tidak tetap menampilkan petunjuk peran sebelumnya.",
  {
    requirements: [],
    sourceDocument: "current",
    navigation: "Buka /Panduan/panduan.html.",
    steps: [
      {
        action: "Buka tab baru dan kunjungi [URL target]/Panduan/panduan.html tanpa lebih dulu masuk ke E-Learning.",
        expected: "Panduan tidak menampilkan isi khusus peran dan meminta autentikasi atau menolak akses.",
      },
      {
        action: "Pada tab E-Learning terpisah, masuk melalui SSO dengan akun Rektor uji dan pastikan peran di Profil benar.",
        expected: "Profil E-Learning menunjukkan akun uji berperan Rektor.",
      },
      {
        action: "Di E-Learning, buka Bantuan lalu klik Buka buku panduan untuk membuka panduan pada tab baru.",
        expected: "Panduan menampilkan petunjuk sesuai peran Rektor pada sesi yang aktif.",
      },
      {
        action: "Keluar dari E-Learning melalui Profil, kembali ke tab panduan, muat ulang halaman, lalu periksa isi yang tampil.",
        expected: "Konten khusus Rektor tidak tetap terbuka setelah sesi berakhir; akses meminta autentikasi atau ditolak.",
      },
    ],
    priority: "P1",
    priorityBasis: "Perilaku autentikasi panduan lintas tab.",
  },
);

// Current feature inventory and manual tutorials, audited against the live app,
// API permissions, help guide and existing regression suites on 12 Oct 2026.
const current = {
  sourceDocument: "current",
  requirements: [],
  priorityBasis:
    "Uji penerimaan fitur yang tersedia pada implementasi E-Learning saat ini.",
};

const practicumSteps = {
  create: [
    {
      action:
        "Masuk sebagai Asdos yang sudah ditugaskan di kelas utama uji, lalu buka Kelas saya dan pilih kelas tersebut.",
      expected:
        "Kelas utama terlihat dan akun Asdos terdaftar sebagai asisten pada kelas itu.",
    },
    {
      action:
        "Klik Buat kelas praktikum, lalu periksa nama, mata kuliah, tahun akademik, dan relasi kelas yang akan dibuat.",
      expected:
        "Pratinjau menyebut Praktikum {Nama Kelas Utama} dan menghubungkannya ke kelas utama yang benar.",
    },
    {
      action: "Konfirmasi pembuatan kelas praktikum.",
      expected:
        "Kelas praktikum dibuat satu kali dengan Asdos sebagai pengelola dan peserta aktif kelas utama tersalin.",
    },
    {
      action:
        "Kembali ke kelas utama lalu klik Buka kelas praktikum. Ulangi permintaan pembuatan jika tombol tersedia lagi.",
      expected: "Kelas yang sama dibuka; tidak ada kelas praktikum duplikat.",
    },
  ],
  parentAccess: [
    {
      action:
        "Sebagai Asdos, buka tab Materi & aktivitas pada kelas utama dan cari materi yang sudah terbit.",
      expected:
        "Materi terbit dapat dibaca; kontrol pengelolaan kelas utama tidak tersedia.",
    },
    {
      action:
        "Coba tambah Section atau materi, buka pengelolaan Peserta, lalu coba buka aksi presensi dan nilai kelas utama.",
      expected:
        "Aksi pengubahan kelas utama disembunyikan atau ditolak; data kelas utama tidak berubah.",
    },
    {
      action:
        "Dari sesi Dosen pengelola, rekam request tambah Section pada DevTools → Network; kirim ulang request yang sama memakai sesi Asdos kelas utama.",
      expected:
        "API mengembalikan penolakan akses; tidak ada perubahan konten, roster, presensi, atau nilai.",
    },
    {
      action: "Buka kelas praktikum dari kartu kelas utama.",
      expected:
        "Asdos dapat masuk ke kelas praktikum terhubung untuk melakukan pengelolaan di ruang itu.",
    },
  ],
  operations: [
    {
      action:
        "Di kelas praktikum, buat Section uji dan terbitkan satu materi singkat.",
      expected:
        "Konten tersimpan dan tampil di kelas praktikum tanpa mengubah kelas utama.",
    },
    {
      action:
        "Buat sesi presensi praktikum, tandai kehadiran dua mahasiswa uji, lalu simpan.",
      expected: "Presensi hanya tercatat pada kelas praktikum.",
    },
    {
      action:
        "Buat atau gunakan tugas praktikum, beri nilai satu mahasiswa, simpan sebagai draf, lalu terbitkan setelah diperiksa.",
      expected:
        "Nilai draf tetap di praktikum; nilai berubah menjadi terbit setelah Asdos menerbitkannya.",
    },
    {
      action:
        "Buka daftar Peserta dan coba menambah atau menghapus mahasiswa langsung dari kelas praktikum.",
      expected:
        "Roster dikelola melalui kelas utama dan tidak dapat diubah langsung oleh Asdos di praktikum.",
    },
  ],
  monitor: [
    {
      action:
        "Masuk sebagai dosen pengampu kelas utama, lalu buka Praktikum {Nama Kelas Utama}.",
      expected:
        "Dosen dapat membuka kelas praktikum melalui tautan pemantauan dari kelas utama.",
    },
    {
      action:
        "Periksa Peserta, materi draf/terbit, sesi dan rekap presensi, pengumpulan tugas, serta nilai draf dan terbit.",
      expected:
        "Dosen dapat membaca rincian seluruh data praktikum, termasuk data yang masih draf.",
    },
    {
      action:
        "Coba mengedit materi, mengubah presensi atau nilai, dan mengubah roster melalui UI; untuk satu aksi, kirim request perubahan langsung.",
      expected:
        "Semua perubahan ditolak oleh UI atau API; data praktikum tidak berubah.",
    },
    {
      action:
        "Buka rekap nilai kelas utama dan ikuti tautan rincian praktikum.",
      expected:
        "Tautan menuju rincian baca-saja dan tidak memberi wewenang mengelola praktikum.",
    },
  ],
  roster: [
    {
      action:
        "Siapkan satu mahasiswa aktif, satu mahasiswa yang akan dinonaktifkan, dan satu mahasiswa baru; catat riwayat presensi/nilai mahasiswa pertama.",
      expected: "Data awal kelas utama dan praktikum dapat dibedakan.",
    },
    {
      action:
        "Di kelas utama, tambahkan mahasiswa baru, nonaktifkan mahasiswa kedua, lalu jalankan impor peserta yang menambah satu mahasiswa uji.",
      expected:
        "Perubahan kelas utama berhasil dan tercatat sesuai alur masing-masing.",
    },
    {
      action: "Periksa Peserta di kelas praktikum setelah setiap perubahan.",
      expected:
        "Mahasiswa baru dan hasil impor tercermin; peserta nonaktif tidak lagi aktif di praktikum.",
    },
    {
      action:
        "Aktifkan kembali mahasiswa kedua, lalu periksa mahasiswa pertama yang memiliki riwayat.",
      expected:
        "Peserta yang diaktifkan kembali muncul lagi; riwayat presensi dan nilai lama tetap tersimpan.",
    },
  ],
  grades: [
    {
      action:
        "Sebagai dosen pengelola kelas utama, buka Rekap nilai dan petakan praktikum ke kategori nilai yang tersedia.",
      expected:
        "Pemetaan tersimpan pada kategori yang dipilih dan tidak dapat diubah oleh Asdos.",
    },
    {
      action:
        "Sebagai Asdos, masukkan nilai praktikum untuk dua mahasiswa; biarkan satu nilai sebagai draf dan terbitkan nilai mahasiswa lainnya.",
      expected:
        "Nilai draf belum menjadi komponen nilai utama; nilai terbit siap dimasukkan ke kategori terpetakan.",
    },
    {
      action:
        "Sebagai dosen, muat ulang Rekap nilai kelas utama dan periksa komponen praktikum pada dua mahasiswa.",
      expected:
        "Hanya nilai yang diterbitkan tampil; nilai dihitung memakai bobot dan metode agregasi kategori yang dipetakan.",
    },
    {
      action:
        "Buka tautan nilai praktikum dari rekap untuk melihat rincian mahasiswa.",
      expected:
        "Dosen dapat melihat rincian nilai di praktikum secara baca-saja.",
    },
    {
      action:
        "Ulangi dengan kategori tanpa pemetaan atau lepas pemetaan pada kelas uji.",
      expected:
        "Nilai praktikum tetap terlihat di kelas praktikum tetapi tidak memengaruhi rekap nilai utama.",
    },
  ],
  clone: [
    {
      action:
        "Siapkan kelas utama uji yang sudah memiliki kelas praktikum dan pemetaan kategori nilai.",
      expected:
        "Kelas sumber menampilkan relasi praktikum dan kategori pemetaan yang sah.",
    },
    {
      action:
        "Gunakan aksi Duplikasi kelas pada kelas utama dan isi identitas kelas baru.",
      expected:
        "Pratinjau duplikasi menunjukkan kelas utama dan relasi praktikum yang akan ikut disalin.",
    },
    {
      action:
        "Selesaikan duplikasi, lalu buka kelas utama dan praktikum hasil salinan.",
      expected:
        "Terdapat satu praktikum baru bernama Praktikum {Nama Kelas Salinan}, tertaut ke kelas salinan, bukan kelas sumber.",
    },
    {
      action:
        "Periksa isi kelas, kategori nilai, peserta, nilai, dan presensi pada salinan.",
      expected:
        "Konten serta pemetaan yang memang diduplikasi mengikuti aturan salin; nilai, presensi, dan riwayat mahasiswa sumber tidak ikut tersalin.",
    },
  ],
};

add(
  "PRA",
  "Asisten Dosen (Asdos)",
  "Implementasi saat ini",
  "Asdos membuat satu kelas praktikum yang tertaut ke kelas utama",
  "Kelas utama aktif, Asdos yang ditugaskan, dua mahasiswa aktif, dan belum ada kelas praktikum.",
  "Dari kelas utama, pilih Buat kelas praktikum; setelah berhasil, buka kembali dan uji permintaan berulang.",
  "Nama kelas Praktikum {Nama Kelas Utama}; mata kuliah dan tahun akademik sama; roster awal tersalin; permintaan berulang membuka kelas yang sama tanpa duplikasi.",
  {
    ...current,
    featureKeys: ["linked-practicum"],
    navigation: "Kelas saya → pilih kelas utama → Buat kelas praktikum.",
    priority: "P0",
    preconditions: [
      "Gunakan kelas uji aktif tanpa praktikum dan akun Mahasiswa yang telah ditugaskan sebagai Asdos pada kelas tersebut.",
      "Siapkan minimal dua peserta aktif pada kelas utama; jangan memakai kelas produksi atau data mahasiswa nyata.",
    ],
    data: "Kelas utama QA dengan dua peserta aktif dan satu Asdos terdaftar.",
    steps: practicumSteps.create,
    cleanup:
      "Arsipkan kelas utama/praktikum uji setelah menyimpan bukti; jangan menghapus kelas atau riwayat yang dipakai pengujian lain.",
  },
);
add(
  "PRA",
  "Asisten Dosen (Asdos)",
  "Implementasi saat ini",
  "Asdos tidak memiliki wewenang perubahan pada kelas utama",
  "Kelas utama berisi materi terbit dan tab peserta, presensi, serta nilai; akun Asdos ditugaskan di kelas itu.",
  "Coba aksi pengelolaan di kelas utama melalui UI dan satu request API, lalu buka praktikum terhubung.",
  "Asdos dapat membaca materi terbit dan membuka praktikum; perubahan konten, peserta, presensi, dan nilai di kelas utama ditolak oleh UI/API.",
  {
    ...current,
    featureKeys: ["linked-practicum"],
    navigation: "Buka kelas utama yang mencantumkan akun sebagai Asdos.",
    priority: "P0",
    preconditions: [
      "Kelas utama QA memiliki minimal satu materi terbit serta kelas praktikum tertaut.",
      "Siapkan sesi browser Asdos dan data awal yang dapat dibandingkan setelah percobaan.",
    ],
    data: "Asdos terdaftar pada kelas utama; satu Section, satu peserta, satu sesi presensi dan satu kategori nilai.",
    steps: practicumSteps.parentAccess,
    cleanup:
      "Pastikan data utama tidak berubah; simpan status/response penolakan API sebagai bukti.",
  },
);
add(
  "PRA",
  "Asisten Dosen (Asdos)",
  "Implementasi saat ini",
  "Asdos mengelola konten presensi dan nilai di kelas praktikum",
  "Kelas praktikum tertaut dengan dua peserta aktif; akun Asdos menjadi pengelola.",
  "Buat konten dan presensi praktikum, simpan nilai sebagai draf lalu terbitkan; coba mengubah roster.",
  "Asdos berwenang mengelola konten, presensi dan nilai praktikum; roster mengikuti kelas utama dan tidak bisa diedit langsung.",
  {
    ...current,
    featureKeys: ["linked-practicum"],
    navigation:
      "Kelas utama → Buka kelas praktikum → Materi & aktivitas / Presensi / Rekap nilai.",
    priority: "P0",
    preconditions: [
      "Gunakan kelas praktikum QA tertaut dengan minimal dua peserta aktif dan tanpa data nilai penting.",
      "Masuk dengan akun Asdos yang menjadi pengelola praktikum.",
    ],
    data: "Section, materi, sesi presensi, tugas praktikum, dua peserta dan nilai uji 60/80.",
    steps: practicumSteps.operations,
    cleanup:
      "Hapus atau arsipkan konten uji sesuai kebijakan lingkungan; pertahankan bukti nilai draf dan terbit.",
  },
);
add(
  "PRA",
  "Dosen",
  "Implementasi saat ini",
  "Dosen memantau seluruh isi praktikum secara baca-saja",
  "Dosen pengampu kelas utama dan kelas praktikum dengan konten draf, peserta, presensi, pengumpulan, serta nilai draf.",
  "Buka semua data praktikum melalui dosen utama, lalu coba perubahan dari UI dan API.",
  "Dosen dapat membaca seluruh data termasuk draf; segala perubahan pada kelas praktikum ditolak.",
  {
    ...current,
    featureKeys: ["linked-practicum"],
    navigation: "Kelas saya → kelas utama → Praktikum {Nama Kelas Utama}.",
    priority: "P0",
    preconditions: [
      "Kelas utama dan praktikum QA aktif; siapkan sesi dosen pengampu.",
      "Praktikum memiliki materi draf, mahasiswa, riwayat presensi, pengumpulan tugas, dan nilai draf.",
    ],
    data: "Satu akun dosen pengampu; satu Asdos; dua peserta dengan data di beberapa status.",
    steps: practicumSteps.monitor,
    cleanup:
      "Jangan mengubah data praktikum. Catat hasil baca dan response penolakan yang diterima.",
  },
);
add(
  "PRA",
  "Dosen",
  "Implementasi saat ini",
  "Perubahan roster utama tersinkron ke praktikum tanpa menghapus riwayat",
  "Kelas utama/praktikum tertaut dengan peserta aktif, nonaktif, dan peserta ber-riwayat.",
  "Tambah, nonaktifkan, aktifkan kembali, dan impor peserta di kelas utama; periksa roster dan riwayat pada praktikum.",
  "Status peserta praktikum mengikuti kelas utama; riwayat presensi dan nilai lama tetap dipertahankan.",
  {
    ...current,
    featureKeys: ["linked-practicum", "enrollment"],
    navigation:
      "Kelas utama → Peserta atau Impor massal; verifikasi pada Praktikum → Peserta dan Riwayat.",
    priority: "P0",
    preconditions: [
      "Kelas praktikum QA sudah memiliki roster tersinkron.",
      "Sediakan tiga akun Mahasiswa uji dan satu peserta yang telah memiliki riwayat presensi/nilai.",
    ],
    data: "Peserta aktif baru, peserta untuk dinonaktifkan/diaktifkan kembali, file impor valid satu baris.",
    steps: practicumSteps.roster,
    cleanup:
      "Pulihkan status peserta kelas utama sesuai kondisi awal setelah seluruh bukti diambil.",
  },
);
add(
  "PRA",
  "Dosen",
  "Implementasi saat ini",
  "Nilai praktikum terbit masuk ke kategori utama yang dipetakan",
  "Praktikum memiliki nilai draf dan terbit; kelas utama memiliki kategori dengan bobot dan metode agregasi.",
  "Atur pemetaan sebagai dosen, terbitkan nilai sebagai Asdos, lalu bandingkan rekap utama dengan dan tanpa pemetaan.",
  "Hanya nilai terbit pada kategori yang dipetakan menjadi komponen nilai utama; kalkulasi mengikuti bobot/metode kategori.",
  {
    ...current,
    featureKeys: ["linked-practicum", "grades"],
    navigation:
      "Rekap nilai kelas utama → Pemetaan kategori praktikum; buka kelas praktikum untuk melihat nilai per mahasiswa.",
    priority: "P0",
    preconditions: [
      "Gunakan kelas QA dengan kategori nilai berbobot valid dan kelas praktikum tertaut.",
      "Siapkan dua peserta: satu dengan nilai draf, satu dengan nilai praktikum yang dapat diterbitkan.",
    ],
    data: "Kategori Praktikum 20%; nilai uji draf 70 dan nilai diterbitkan 80.",
    steps: practicumSteps.grades,
    cleanup:
      "Kembalikan pemetaan kategori dan batalkan nilai uji dengan alasan yang sesuai prosedur QA.",
  },
);
add(
  "PRA",
  "Dosen",
  "Implementasi saat ini",
  "Duplikasi kelas membawa relasi praktikum ke kelas salinan",
  "Kelas utama memiliki praktikum tertaut, konten, dan pemetaan kategori; tersedia tahun akademik tujuan.",
  "Duplikasi kelas utama, kemudian buka relasi kelas praktikum hasil salinan dan periksa data yang dibawa.",
  "Kelas salinan memiliki satu praktikum baru tertaut dengan nama yang benar dan pemetaan ke kategori salinan; riwayat mahasiswa tidak ikut tersalin.",
  {
    ...current,
    featureKeys: ["linked-practicum", "class-management"],
    navigation:
      "Kelola kelas atau Kelas saya → Duplikasi kelas utama → buka kelas hasil salinan.",
    priority: "P1",
    preconditions: [
      "Gunakan kelas QA sumber yang sudah memiliki praktikum dan kategori pemetaan.",
      "Pastikan ada ruang untuk membuat kelas salinan; jangan gunakan kelas sumber produksi.",
    ],
    data: "Kelas utama QA dengan satu Section praktikum, satu kategori nilai, dan peserta ber-riwayat.",
    steps: practicumSteps.clone,
    cleanup:
      "Arsipkan kelas salinan setelah menyimpan bukti relasi, pemetaan, konten, dan riwayat.",
  },
);

add(
  "CRS",
  "Dosen Kolaborator",
  "Implementasi saat ini",
  "Kolaborator hanya mendapat akses sesuai kelas yang ditugaskan",
  "Dua kelas QA; dosen kolaborator ditugaskan ke satu kelas dan tidak ditugaskan ke kelas lain.",
  "Buka kedua kelas, gunakan aksi pengajar pada kelas yang ditugaskan, lalu coba akses kelas lain.",
  "Kolaborator dapat bekerja dalam cakupan penugasannya saja; kelas lain dan administrasi global tetap terlindungi.",
  {
    ...current,
    featureKeys: ["class-collaborators"],
    navigation:
      "Kelas saya → kelas tempat akun ditambahkan sebagai Dosen Kolaborator.",
    priority: "P0",
    preconditions: [
      "Siapkan dua kelas QA dan akun Dosen Kolaborator yang hanya ditugaskan ke kelas pertama.",
      "Catat kondisi konten kedua kelas sebelum uji.",
    ],
    data: "Satu kolaborator, kelas A tempat ditugaskan, kelas B di luar penugasan.",
    steps: [
      {
        action: "Masuk sebagai kolaborator dan buka kelas A.",
        expected: "Kelas yang ditugaskan muncul dan identitas kelas sesuai.",
      },
      {
        action: "Gunakan satu aksi pengelolaan yang diizinkan di kelas A.",
        expected: "Aksi berlaku pada kelas A sesuai kapabilitas kolaborator.",
      },
      {
        action: "Coba buka kelas B dari daftar dan melalui URL langsung.",
        expected:
          "Kelas di luar penugasan tidak dapat dikelola atau dibaca di luar kebijakan akses.",
      },
      {
        action: "Buka menu administrasi kelas/prodi yang tidak ditugaskan.",
        expected:
          "Menu dan endpoint administratif tetap mengikuti role lokal akun.",
      },
    ],
    cleanup:
      "Pulihkan perubahan uji di kelas A; pastikan kelas B tidak berubah.",
  },
);

const themeRoles = [
  "Mahasiswa",
  "Dosen",
  "Admin Prodi",
  "Super Admin",
  "Rektor",
  "Asisten Dosen (Asdos)",
  "Dosen Kolaborator",
];
const themeTargets = {
  Mahasiswa: {
    route: "Beranda → kelas yang diikuti → Materi & aktivitas, Presensi, dan Rekap nilai",
    controls: "daftar aktivitas, panel nilai, menu profil, dan dialog yang tersedia pada kelas",
  },
  Dosen: {
    route: "Dashboard dosen → kelas yang diampu → Materi & aktivitas, Peserta, Presensi, dan Rekap nilai",
    controls: "tabel Peserta, form editor materi, filter nilai, dan menu profil",
  },
  "Admin Prodi": {
    route: "Program Studi & Otoritas → Master Program Studi dan Pengguna",
    controls: "tabel prodi/pengguna, filter, dialog Edit, dan form Atur Lingkup",
  },
  "Super Admin": {
    route: "Program Studi & Otoritas → Master Program Studi dan Pengguna",
    controls: "tabel prodi/pengguna, tombol sortir, dialog Edit, dan form Atur Lingkup",
  },
  Rektor: {
    route: "Pemantauan Akademik → ringkasan dan laporan kelas/prodi",
    controls: "filter periode/prodi, tabel dosen, tabel kelas, dan dialog rincian",
  },
  "Asisten Dosen (Asdos)": {
    route: "kelas utama (baca saja) → Praktikum {Nama Kelas} → Materi & aktivitas, Presensi, dan Nilai",
    controls: "tabel praktikum, form editor, daftar peserta tersinkron, dan menu profil",
  },
  "Dosen Kolaborator": {
    route: "kelas yang ditugaskan sebagai kolaborator → Materi & aktivitas, Peserta, dan Nilai",
    controls: "tabel kelas, form editor yang diizinkan, filter, dan menu profil",
  },
};
themeRoles.forEach((role, index) =>
  add(
    "UI",
    role,
    "Implementasi saat ini",
    `Tema terang dan gelap pada tampilan ${role}`,
    `Akun ${role} uji; halaman yang diperiksa: ${themeTargets[role].route}.`,
    "Ganti tema terang/gelap, jelajahi halaman serta dialog, lalu muat ulang.",
    "Latar, teks, border, tabel, badge, modal, fokus dan kontrol terbaca dalam kedua tema; preferensi tetap setelah muat ulang.",
    {
      ...current,
      id: `TC-UI-THEME-${String(index + 1).padStart(2, "0")}`,
      featureKeys: ["theme"],
      navigation: `Masuk dengan akun ${role} uji dan buka ${themeTargets[role].route}.`,
      priority: "P1",
      preconditions: [
        role === "Asisten Dosen (Asdos)"
          ? "Akun mahasiswa ditugaskan sebagai Asdos dan memiliki praktikum uji."
          : role === "Dosen Kolaborator"
            ? "Akun dosen terdaftar sebagai kolaborator pada kelas QA."
            : `Akun ${role} uji dapat masuk ke lingkungan yang diuji.`,
        "Gunakan browser desktop dan ponsel atau emulator viewport; catat keadaan tema awal.",
      ],
      data: `Tema Terang/Gelap; ${themeTargets[role].route}; ${themeTargets[role].controls}.`,
      steps: [
        {
          action: `Masuk sebagai ${role} memakai akun pada Data uji; buka ${themeTargets[role].route}.`,
          expected: `Halaman dan kontrol yang tercantum di Data uji terbuka sesuai hak akses ${role}.`,
        },
        {
          action: `Klik tombol tema di header, pilih Gelap, lalu periksa ${themeTargets[role].route}.`,
          expected:
            "Komponen beralih ke palet gelap dengan teks, border, tabel, status, modal dan kontrol tetap kontras.",
        },
        {
          action: `Buka ${themeTargets[role].controls}; tab melalui kontrol keyboard lalu periksa fokus, hover, badge, dan isi tabel.`,
          expected:
            "Dialog, input, tombol, fokus, hover, status dan isi tabel tidak tertinggal dengan warna tema terang.",
        },
        {
          action:
            "Muat ulang halaman dengan tema Gelap, pastikan pilihan tetap tersimpan, lalu pilih Terang dan muat ulang sekali lagi.",
          expected:
            "Tema Gelap dan Terang tetap mengikuti pilihan terakhir setelah muat ulang; isi halaman tidak hilang.",
        },
        {
          action:
            "Kecilkan viewport ke 390 px dan ulangi pemeriksaan halaman utama.",
          expected:
            "Konten tetap terbaca dan tidak menimbulkan overflow horizontal halaman.",
        },
      ],
      cleanup: "Kembalikan preferensi tema awal penguji.",
    },
  ),
);

add(
  "UI",
  "Dosen",
  "Implementasi saat ini",
  "Pengurutan naik-turun tersedia pada tabel di seluruh aplikasi",
  "Tabel data dari halaman kelas, peserta/presensi/nilai, audit, administrasi, laporan, dan tabel hasil dinamis; desktop dan viewport ponsel.",
  "Urutkan kolom data berbeda ke arah naik lalu turun pada setiap tabel, termasuk tabel yang baru dibuka dari dialog.",
  "Setiap kolom data menyediakan kontrol sort yang dapat diakses; urutan dan indikator mengikuti nilai kolom, kontrol aksi tidak mengubah data, tabel dinamis dan layout ponsel tetap dapat diurutkan.",
  {
    ...current,
    featureKeys: ["table-sorting"],
    navigation:
      "Gunakan akun sesuai role untuk membuka tabel data; pada ponsel gunakan kontrol sortir tabel.",
    priority: "P1",
    preconditions: [
      "Siapkan data uji minimal tiga baris dengan nilai mudah dibandingkan, termasuk angka seperti 2 dan 10.",
      "Siapkan akun Dosen, Admin Prodi, Super Admin, Rektor, serta sesi yang dapat membuka tabel hasil Sinkron Pengguna.",
    ],
    data: "Kolom nama, angka, tanggal/status dan kolom aksi; tabel halaman utama serta tabel yang muncul setelah modal dibuka.",
    steps: [
      {
        action:
          "Pada tabel peserta kelas, klik tombol sortir di header Nama satu kali dan periksa baris.",
        expected:
          "Baris terurut A–Z dan semua sel dalam baris tetap berpasangan dengan peserta yang sama.",
      },
      {
        action: "Klik header Nama yang sama lagi.",
        expected:
          "Baris beralih Z–A; indikator aksesibel menyatakan arah menurun.",
      },
      {
        action:
          "Ulangi pada kolom angka dan tanggal di rekap nilai, presensi, atau laporan.",
        expected:
          "Angka diurutkan numerik (2 sebelum 10) dan tanggal kronologis, bukan hanya berdasarkan teks.",
      },
      {
        action:
          "Buka Program Studi & Otoritas → Pengguna → Sinkron Pengguna, jalankan pratinjau, lalu urutkan kolom di tabel hasil.",
        expected:
          "Tabel yang baru dibuat tetap mendapat kontrol sortir dan tombol mengurutkan isi pratinjau.",
      },
      {
        action:
          "Ulangi pada tabel audit atau laporan Rektor yang memiliki beberapa halaman; ganti filter/paginasi setelah sortir.",
        expected:
          "Tabel tetap dapat digunakan dan data/filter/aksi tidak rusak akibat sortir.",
      },
      {
        action:
          "Pada viewport ponsel, buka tabel dengan header disembunyikan lalu pilih kolom dari toolbar sortir.",
        expected:
          "Toolbar ponsel mengurutkan tabel yang sama tanpa overflow halaman.",
      },
    ],
    cleanup:
      "Pulihkan filter dan halaman tabel; sortir hanya mengubah urutan tampilan lokal.",
  },
);

add(
  "SYN",
  "Super Admin",
  "Implementasi saat ini",
  "Sinkron Pengguna memfilter metrik dan pratinjau akun SSO",
  "Pratinjau berisi minimal satu akun baru dan dua akun yang sudah terdaftar; tipe akun dan query pencarian tersedia.",
  "Pilih filter jenis dan pencarian, pratinjau pengguna, lalu klik ketiga kartu metrik.",
  "Kartu Total, Akun Baru, dan Akun Sudah Terdaftar menyaring isi tabel dengan jumlah yang tepat; label Sinkron Pengguna jelas dan sortir tabel tetap berfungsi.",
  {
    ...current,
    featureKeys: ["user-sync"],
    navigation: "Program Studi & Otoritas → Pengguna → Sinkron Pengguna.",
    priority: "P0",
    preconditions: [
      "Gunakan SSO fixture atau lingkungan QA dengan akun baru dan akun yang sudah terdaftar.",
      "Jangan konfirmasi perubahan akun sebelum isi pratinjau diperiksa.",
    ],
    data: "Satu akun pra-registrasi, dua akun terdaftar, pencarian nama/email/NIDN/NIP.",
    steps: [
      {
        action:
          "Buka Sinkron Pengguna, pilih tipe akun dan isi pencarian yang cocok dengan subset akun uji.",
        expected:
          "Filter tipe dan pencarian diterapkan tanpa mengubah data pengguna.",
      },
      {
        action:
          "Klik Pratinjau akun dari SSO dan periksa kartu jumlah serta rincian tabel.",
        expected: "Jumlah total/new/existing konsisten dengan baris pratinjau.",
      },
      {
        action:
          "Klik kartu Akun Baru, lalu Akun Sudah Terdaftar, dan akhirnya Total Akun.",
        expected:
          "Setiap kartu menampilkan subset tepat; klik Total mengembalikan semua hasil pratinjau.",
      },
      {
        action:
          "Urutkan kolom Nama & Identitas, Tipe SSO, Status E-Learning, dan Peran.",
        expected:
          "Urutan naik/turun bekerja pada semua kolom data dan tidak mengubah status integrasi.",
      },
      {
        action: "Periksa dialog sebelum menutup tanpa konfirmasi simpan.",
        expected:
          "Pratinjau tidak menulis akun sampai penguji secara eksplisit menyelesaikan konfirmasi.",
      },
    ],
    cleanup:
      "Tutup dialog pratinjau tanpa menyimpan jika lingkungan bukan data QA.",
  },
);
add(
  "SYN",
  "Super Admin",
  "Implementasi saat ini",
  "Sinkronisasi SSO memperbarui profil tanpa mengambil alih role lokal",
  "Pengguna sudah terdaftar dan role/cakupan lokalnya berbeda dari role akun aplikasi SSO.",
  "Pratinjau dan konfirmasi sinkron pengguna; bandingkan role/cakupan sebelum dan sesudah serta jejak audit.",
  "Profil yang disinkronkan mengikuti aturan lokal; role dan cakupan E-Learning tidak berubah hanya karena usulan role SSO berbeda.",
  {
    ...current,
    featureKeys: ["access-sso", "user-sync"],
    navigation:
      "Program Studi & Otoritas → Pengguna → Sinkron Pengguna; gunakan akun uji terdaftar.",
    priority: "P0",
    preconditions: [
      "Gunakan akun QA yang aman diubah; catat role, cakupan prodi, dan versi profil lokal sebelum sinkronisasi.",
      "Sediakan data SSO dengan profil terbaru dan role aplikasi berbeda dari role lokal.",
    ],
    data: "Akun dosen/admin prodi QA dengan role lokal yang diketahui dan application_access role SSO yang berbeda.",
    steps: [
      {
        action:
          "Catat role dan cakupan pengguna di E-Learning sebelum membuka sinkronisasi.",
        expected:
          "Nilai awal role dan scope lokal tercatat sebagai pembanding.",
      },
      {
        action:
          "Pratinjau akun dari SSO dan baca status, role yang diajukan, serta perbedaan akun.",
        expected:
          "Perbedaan role terlihat sebagai informasi sinkronisasi, bukan perubahan role yang sudah diterapkan.",
      },
      {
        action:
          "Konfirmasi sinkronisasi untuk akun QA tersebut, lalu muat ulang halaman pengguna.",
        expected:
          "Profil non-otoritatif yang boleh disinkronkan diperbarui; role dan cakupan lokal tetap sama.",
      },
      {
        action: "Periksa hak akses menu/API dan jejak audit setelah sinkron.",
        expected:
          "Hak akses mengikuti role lokal; tindakan sinkron tercatat tanpa mengubah penugasan lokal.",
      },
    ],
    cleanup:
      "Pulihkan profil dan role akun QA sesuai keadaan awal bila diperlukan; jangan sinkronkan akun pengguna nyata.",
  },
);
add(
  "SYN",
  "Super Admin",
  "Implementasi saat ini",
  "Sinkronisasi SIAKAD ditandai belum siap dan tidak dapat dijalankan",
  "Integrasi SIAKAD belum dinyatakan siap; sinkronisasi manual pengguna SSO tetap tersedia.",
  "Buka Program Studi & Otoritas, periksa pesan kesiapan SIAKAD dan coba akses kontrol/endpoint sinkronisasinya.",
  "SIAKAD jelas berstatus belum siap; aksi sinkronisasi tidak dapat dipicu dan tidak mengubah scope/otoritas lokal.",
  {
    ...current,
    id: "TC-SYN-SIAKAD-001",
    featureKeys: ["siakad-sync-disabled"],
    availability: "disabled",
    navigation: "Program Studi & Otoritas → Pengguna / Integrasi.",
    priority: "P0",
    preconditions: [
      "Gunakan akun Super Admin pada lingkungan QA dengan Integrasi SIAKAD belum siap.",
      "Catat scope/otoritas lokal sebelum pengujian dan jangan mengirim data sinkronisasi.",
    ],
    data: "Halaman governance serta endpoint integrasi SIAKAD yang dikonfigurasi nonaktif.",
    steps: [
      {
        action:
          "Buka halaman Program Studi & Otoritas dan baca keterangan integrasi.",
        expected:
          "Pesan menyebut integrasi SIAKAD belum siap dan sinkronisasi dinonaktifkan.",
      },
      {
        action: "Periksa tab, tombol, menu, atau kontrol sinkron SIAKAD.",
        expected:
          "Kontrol aksi tidak ditampilkan atau terlihat nonaktif dan tidak dapat dikonfirmasi.",
      },
      {
        action:
          "Jika penguji memiliki akses API QA, kirim request uji ke endpoint sinkronisasi tanpa data nyata.",
        expected:
          "API menolak request karena integrasi belum siap; tidak ada scope/otoritas yang berubah.",
      },
      {
        action:
          "Muat ulang halaman dan periksa kembali status serta scope lokal.",
        expected: "Integrasi tetap nonaktif dan nilai lokal tetap sama.",
      },
    ],
    cleanup:
      "Tidak ada pembersihan data; simpan tangkapan pesan dan response penolakan sebagai bukti.",
  },
);

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
const productionCopyCorrections = [
  [
    "Lingkungan lokal aktif: E-Learning 127.0.0.1:5173, SSO dan File Service fixture.",
    "URL target pada pengaturan sesi harus mengarah ke staging/UAT atau lingkungan uji produksi yang disetujui; catat versi build yang diuji.",
  ],
  ["Akun fixture ACTIVE.", "Akun uji aktif pada SSO lingkungan target."],
  [
    "Ulangi callback OIDC dengan data tidak sah pada lingkungan fixture.",
    "Ulangi callback OIDC pada staging/UAT menggunakan parameter uji tidak sah yang telah disiapkan.",
  ],
  [
    "Paksa expiry pada fixture, lalu panggil /me memakai cookie sesi.",
    "Gunakan akun uji dengan sesi kedaluwarsa, lalu periksa endpoint /me dengan sesi yang sama.",
  ],
  [
    "Nonaktifkan akun pada fixture SSO dan kirim webhook bertanda tangan; akses /me kembali.",
    "Pada akun uji yang disiapkan pemilik SSO staging, nonaktifkan akses melalui prosedur resmi lalu periksa endpoint /me.",
  ],
  [
    "Course QA-V5, prodi IF, rombel A.",
    "Mata kuliah uji pada prodi IF dengan rombel A yang disiapkan di staging.",
  ],
  [
    "Fixture transaksi clone yang digagalkan sebelum semua entitas selesai.",
    "Skenario kegagalan transaksi penyalinan kelas di staging sebelum semua entitas tersimpan.",
  ],
  [
    "Berkas fixture INFECTED / checksum salah.",
    "Berkas uji yang disetujui pemilik lingkungan untuk skenario antivirus terdeteksi atau checksum tidak sesuai.",
  ],
  [
    "File TRASH berumur>7 hari di fixture.",
    "Berkas uji yang masa retensinya sudah berakhir (lebih dari tujuh hari).",
  ],
  [
    "Hasil antivirus nyata diverifikasi, bukan scan fixture.",
    "Hasil pemindaian pada staging berasal dari layanan antivirus aktif yang disetujui, bukan simulasi.",
  ],
  [
    "Buka profil/editor setelah memajukan waktu fixture.",
    "Buka profil/editor setelah masa berlaku data uji berakhir sesuai jadwal staging.",
  ],
  [
    "Kirim burst terkontrol pada staging fixture.",
    "Kirim beban terukur pada staging setelah mendapat persetujuan pemilik layanan.",
  ],
  [
    "SSO fixture lambat /503.",
    "SSO staging/UAT dengan gangguan latensi atau 503 yang telah dijadwalkan.",
  ],
  [
    "File Service fixture tidak tersedia.",
    "File Service staging dalam window gangguan yang telah dikoordinasikan.",
  ],
  [
    "150–250 pengguna staging; fixture load disetujui.",
    "150–250 akun sintetik untuk load test staging yang disetujui; jangan kirim beban ke produksi.",
  ],
  [
    "Fixture deterministik laporan akademik.",
    "Dataset akademik terkontrol pada staging untuk periode laporan yang sama.",
  ],
  [
    "Gunakan SSO fixture atau lingkungan QA dengan akun baru dan akun yang sudah terdaftar.",
    "Gunakan SSO staging/UAT dengan satu akun uji baru dan satu akun uji yang sudah terdaftar.",
  ],
  [
    "PDF valid memuat filter, waktu data, definisi dan label demo saat fixture dipakai.",
    "PDF valid memuat filter, waktu data, definisi, dan label lingkungan uji.",
  ],
  [
    "Teks dan tabel terbaca, tidak terpotong; waktu data dan label demo tercetak.",
    "Teks dan tabel terbaca, tidak terpotong; waktu data dan label lingkungan uji tercetak.",
  ],
  [
    "pemilih akun demonstrasi",
    "akun uji resmi yang disediakan untuk lingkungan target",
  ],
];
function productionLanguage(value) {
  if (typeof value === "string") {
    for (const [from, to] of productionCopyCorrections)
      value = value.replaceAll(from, to);
    return value
      .replace(/QA-V5/gi, "lingkungan staging/UAT")
      .replace(/\bfixture\b/gi, "data uji staging")
      .replace(/\bdemonstrasi\b/gi, "uji")
      .replace(/\bdemo\b/gi, "uji");
  }
  if (Array.isArray(value)) return value.map(productionLanguage);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        productionLanguage(child),
      ]),
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
    "navigation",
  ])
    c[key] = productionLanguage(c[key]);
const familyFeatureKeys = {
  ACC: ["access-sso"],
  SDH: ["student-dashboard"],
  TDH: ["instructor-dashboard"],
  CRS: ["class-management"],
  ENR: ["participants"],
  SEC: ["sections"],
  RES: ["learning-content"],
  QZ: ["quizzes"],
  ASG: ["assignments"],
  GRD: ["grades"],
  FDB: ["feedback-drafts"],
  ANN: ["announcements"],
  NOT: ["notifications"],
  FIL: ["files"],
  PRG: ["learning-progress"],
  ATT: ["attendance"],
  ISO: ["program-governance"],
  REC: ["rector-monitoring"],
  HELP: ["help-guide"],
  AUD: ["audit-trail"],
  OPS: ["operations"],
  FUT: ["roadmap"],
  PILOT: ["pilot-gates"],
};
for (const c of cases)
  c.featureKeys = [
    ...new Set([...(familyFeatureKeys[c.family] ?? []), ...c.featureKeys]),
  ];
const featureInventory = [
  [
    "access-sso",
    "Login SSO & kewenangan lokal",
    "Login, sesi, pemetaan role lokal, dan batas akses.",
    "active",
  ],
  [
    "student-dashboard",
    "Dashboard mahasiswa",
    "Beranda, agenda, kelas dan ringkasan mahasiswa.",
    "active",
  ],
  [
    "instructor-dashboard",
    "Dashboard dosen",
    "Beranda, aktivitas dan antrean kerja pengajar.",
    "active",
  ],
  [
    "class-management",
    "Mata kuliah & kelas",
    "Pengelolaan, duplikasi, penerbitan dan arsip kelas.",
    "active",
  ],
  [
    "participants",
    "Peserta & kolaborator",
    "Pendaftaran, impor, status peserta dan akses kolaborator.",
    "active",
  ],
  [
    "class-collaborators",
    "Dosen kolaborator",
    "Cakupan akses kolaborator pada kelas yang ditugaskan.",
    "active",
  ],
  [
    "sections",
    "Section & pertemuan",
    "Susunan, tipe, visibilitas dan jadwal section.",
    "active",
  ],
  [
    "learning-content",
    "Materi & editor",
    "Materi teks, PDF, video, tautan dan editor blok.",
    "active",
  ],
  ["files", "Berkas", "Unggah, akses, unduh dan pengelolaan berkas.", "active"],
  [
    "quizzes",
    "Kuis & bank soal",
    "Penyusunan, pengerjaan, autosave dan penilaian kuis.",
    "active",
  ],
  [
    "assignments",
    "Tugas",
    "Penerbitan, pengumpulan, versi, tenggat dan penilaian.",
    "active",
  ],
  [
    "grades",
    "Rekap nilai",
    "Kategori, bobot, kalkulasi dan publikasi nilai.",
    "active",
  ],
  [
    "feedback-drafts",
    "Umpan balik & draf",
    "Komentar, draf lokal/server dan pemulihan perubahan.",
    "active",
  ],
  [
    "announcements",
    "Pengumuman",
    "Sasaran, jadwal, lampiran dan pengelolaan pengumuman.",
    "active",
  ],
  [
    "notifications",
    "Notifikasi",
    "Penerimaan, jumlah belum dibaca dan status baca.",
    "active",
  ],
  [
    "attendance",
    "Presensi",
    "Jadwal, kode, check-in, koreksi dan rekap.",
    "active",
  ],
  [
    "learning-progress",
    "Progres belajar",
    "Pencatatan dan tampilan kemajuan mahasiswa.",
    "active",
  ],
  [
    "program-governance",
    "Administrasi & isolasi prodi",
    "Role lokal, lingkup prodi, pengguna dan isolasi data.",
    "active",
  ],
  [
    "user-sync",
    "Sinkron Pengguna dari SSO",
    "Pratinjau, filter, penambahan akun dan sinkron profil.",
    "active",
  ],
  [
    "siakad-sync-disabled",
    "Integrasi SIAKAD",
    "Kontrol sinkronisasi ditandai belum siap dan harus tetap nonaktif.",
    "disabled",
  ],
  [
    "linked-practicum",
    "Kelas praktikum terhubung",
    "Akses Asdos, pemantauan dosen, roster, nilai dan duplikasi.",
    "active",
  ],
  [
    "theme",
    "Tema terang & gelap",
    "Keterbacaan komponen dan preferensi tema lintas peran.",
    "active",
  ],
  [
    "table-sorting",
    "Pengurutan tabel global",
    "Sort naik/turun pada tabel statis, dinamis dan tampilan ponsel.",
    "active",
  ],
  [
    "rector-monitoring",
    "Pemantauan akademik Rektor",
    "Ringkasan, filter, rincian, riwayat dan ekspor baca-saja.",
    "active",
  ],
  [
    "help-guide",
    "Bantuan & panduan",
    "Panduan pengguna sesuai role dan navigasi bantuan.",
    "active",
  ],
  [
    "audit-trail",
    "Jejak audit",
    "Rekaman aksi dan cakupan akses audit.",
    "active",
  ],
  [
    "operations",
    "Operasional & konfigurasi",
    "Kesiapan runtime, keamanan dan prosedur operasi.",
    "active",
  ],
  [
    "pilot-gates",
    "Penerimaan lingkungan eksternal",
    "Gerbang SSO/File Service kampus, VPS dan pilot terisolasi.",
    "active",
  ],
  [
    "roadmap",
    "Backlog rilis mendatang",
    "Fitur rencana yang belum tersedia pada implementasi saat ini.",
    "backlog",
  ],
].map(([id, title, description, availability]) => {
  const caseIds = cases
    .filter((c) => c.featureKeys.includes(id))
    .map((c) => c.id);
  if (!caseIds.length)
    throw new Error(`Feature inventory item has no tutorial: ${id}`);
  return { id, title, description, availability, caseIds };
});
const documentNotes = [
  "Tambahan implementasi dan panduan diverifikasi kembali pada 12 Oktober 2026; bukan penambahan butir RTM resmi. Katalog memisahkan fitur aktif, integrasi nonaktif, backlog, dan gerbang lingkungan eksternal.",
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
  implementationReviewedAt: "2026-10-12",
  featureInventory,
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
writeGenerated(
  "apps/qa/public/source/current.html",
  '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cakupan implementasi terkini</title><body style="max-width:900px;margin:40px auto;padding:0 20px;font:18px/1.7 system-ui;color:#29465c"><h1 id="L1">Cakupan implementasi 12 Oktober 2026</h1><p>Inventaris portal QA ditinjau dari navigasi dan komponen E-Learning, panduan pengguna, kontrol akses API, dan regresi yang tersedia. Fitur aktif memiliki tutorial manual; integrasi SIAKAD ditampilkan nonaktif; roadmap tidak dapat dinyatakan lulus sampai rilis menyediakan fiturnya.</p><h2>Tambahan yang diuji</h2><ul><li>Praktikum terhubung: pembuatan Asdos, isolasi wewenang, pemantauan dosen baca-saja, sinkron peserta, pemetaan nilai, dan duplikasi.</li><li>Sinkron Pengguna SSO dengan role lokal tetap berwenang, filter metrik, dan tabel hasil.</li><li>Tema terang/gelap lintas persona dan pengurutan tabel global, termasuk tabel dinamis dan toolbar ponsel.</li><li>Integrasi SIAKAD yang diberi status belum siap dan tetap tidak dapat dijalankan.</li></ul><p>Hasil otomatis hanya membuktikan assertion yang dipetakan. Tampilan, alur lintas peran, layanan kampus, dan gerbang produksi tetap memerlukan bukti manual pada lingkungan yang sesuai.</p></body></html>',
);
console.log(
  `QA catalog: ${cases.length} scenarios, ${cases.filter((c) => c.automation).length} automated mappings, ${catalog.families.length} RTM families.`,
);
export { catalog, questionScenarios, blockSamples, gradeBands };
