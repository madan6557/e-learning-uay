import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
const runtimeModules = process.env.UAY_ARTIFACT_NODE_MODULES;
if (!runtimeModules || !path.isAbsolute(runtimeModules))
  throw Error(
    "Set UAY_ARTIFACT_NODE_MODULES to the Codex workspace dependency directory",
  );
const require = createRequire(path.join(runtimeModules, "uay-loader.cjs"));
const { FileBlob, PresentationFile } = await import(
  pathToFileURL(require.resolve("@oai/artifact-tool")).href
);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = process.argv[2];
if (!workspace || !path.isAbsolute(workspace))
  throw Error("Provide an absolute private workspace directory");
const source = path.join(
  root,
  "docs/Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx",
);
const deck = await PresentationFile.importPptx(await FileBlob.load(source));
await fs.mkdir(workspace, { recursive: true });
const before = await deck.inspect({
  kind: "slide,textbox,shape",
  maxChars: 300000,
});
const records = before.ndjson
  .split("\n")
  .filter(Boolean)
  .map((v) => JSON.parse(v));
await fs.writeFile(path.join(workspace, "before.ndjson"), before.ndjson);
const cards = (title, ...lines) => [title, "", ...lines].join("\n");
const content = [
  [
    "UNIVERSITAS ACHMAD YANI BANJARMASIN\nSOSIALISASI DAN PANDUAN PENGGUNAAN\nE-LEARNING UAY\nMahasiswa · Dosen · Admin Prodi · Super Admin · Rektor\nEdisi 7 Oktober 2026 · Satu akun kampus · Waktu lokal perangkat",
  ],
  [
    "PANDUAN PENGGUNA",
    "Belajar dan mengelola kegiatan akademik",
    cards(
      "Satu akun kampus",
      "Masuk melalui SSO UAY.",
      "Menu mengikuti peran akun.",
      "Periksa identitas pada Profil.",
      "Keluar setelah selesai.",
    ),
    cards(
      "Pembelajaran",
      "Baca materi per pertemuan.",
      "Kirim tugas dan kerjakan kuis.",
      "Isi presensi sesuai mode sesi.",
      "Lihat hasil yang telah diterbitkan.",
    ),
    cards(
      "Pemantauan akademik",
      "Rektor membaca laporan.",
      "Data diperiksa setiap 5 menit.",
      "Waktu data dan waktu dimuat berbeda.",
      "Tidak ada skor kinerja otomatis.",
    ),
  ],
  [
    "SATU PINTU AKSES",
    "Layanan yang digunakan melalui e-learning",
    cards(
      "Akun kampus",
      "Identitas dan peran dari kampus.",
      "Masuk memakai akun sendiri.",
      "Perubahan akses melalui pengelola akun.",
    ),
    cards(
      "Ruang belajar",
      "Kelas dan pertemuan.",
      "Materi, tugas dan kuis.",
      "Presensi dan nilai sesuai hak akses.",
    ),
    cards(
      "Berkas kuliah",
      "Berkas sesuai jenis materi.",
      "Periksa status unggahan.",
      "Pastikan tugas benar-benar terkumpul.",
    ),
    cards(
      "Laporan rektor",
      "Ringkasan universitas.",
      "Dosen, kelas dan riwayat kegiatan.",
      "Hanya membaca data akademik.",
    ),
  ],
  [
    "PERAN PENGGUNA",
    "Menu dan tugas mengikuti kewenangan akun",
    cards(
      "Super Admin",
      "Mengelola administrasi universitas.",
      "Tahun ajaran dan kebijakan nilai.",
      "Katalog serta laporan rektor.",
    ),
    cards(
      "Admin Prodi",
      "Mengelola kelas pada cakupan prodi.",
      "Menugaskan pengampu.",
      "Mendaftarkan peserta kelas.",
    ),
    cards(
      "Dosen",
      "Menyusun pertemuan dan materi.",
      "Membuka tugas, kuis dan presensi.",
      "Menilai dan menerbitkan hasil.",
    ),
    cards(
      "Mahasiswa",
      "Mempelajari materi.",
      "Mengirim tugas dan kuis.",
      "Melihat hasil yang diterbitkan.",
    ),
  ],
  [
    "SEMUA PERAN",
    "Masuk dan mengakhiri sesi",
    cards(
      "Langkah masuk",
      "1. Buka e-learning.uay.ac.id.",
      "2. Klik Masuk dengan SSO UAY.",
      "3. Ikuti formulir akun kampus.",
      "4. Periksa nama dan peran.",
      "5. Pilih menu yang sesuai.",
    ),
    cards(
      "Saat selesai",
      "Klik Keluar pada bagian atas.",
      "Menutup tab tidak mengakhiri sesi.",
      "Jika sesi berakhir, masuk kembali.",
      "Pemulihan kata sandi melalui layanan akun kampus.",
    ),
  ],
  [
    "SUPER ADMIN",
    "Administrasi seluruh program studi",
    cards(
      "Cakupan universitas",
      "Periksa kelas dan program studi.",
      "Cari pengguna sesuai kewenangan.",
      "Gunakan data aktual, bukan angka contoh.",
    ),
    cards(
      "Katalog mata kuliah",
      "Buka Katalog mata kuliah.",
      "Periksa kode, nama, SKS dan prodi.",
      "Tambahkan kelas dari mata kuliah yang benar.",
    ),
    cards(
      "Pemantauan",
      "Buka Pemantauan Akademik.",
      "Telusuri dosen dan kelas.",
      "Tindakan admin dipisahkan dari kegiatan dosen.",
    ),
  ],
  [
    "SUPER ADMIN",
    "Tahun ajaran dan kebijakan penilaian",
    cards(
      "Tahun ajaran",
      "Buka Kebijakan & Tahun Ajaran.",
      "Atur pilihan semester dan banner.",
      "Periksa label setelah tersimpan.",
      "Pengarsipan dilakukan pada kelas.",
    ),
    cards(
      "Kebijakan nilai",
      "Pilih skala nilai yang berlaku.",
      "Atur ambang hadir sesuai kebijakan.",
      "Periksa versi skala pada kelas.",
      "Nilai yang telah terbit tidak dihitung ulang hanya karena default berubah.",
    ),
  ],
  [
    "REKTOR DAN SUPER ADMIN",
    "Pemantauan Akademik dalam e-learning",
    cards(
      "Akses laporan",
      "Masuk memakai akun kampus.",
      "Rektor langsung diarahkan ke laporan.",
      "Akun rektor tidak mengubah materi, tugas atau nilai.",
      "Demo memiliki akun Rektor dan label data simulasi.",
    ),
    cards(
      "Ringkasan yang dibaca",
      "Dosen beraktivitas akademik.",
      "Pekerjaan mahasiswa belum dinilai.",
      "Nilai yang sudah dibagikan.",
      "Rekap setiap program studi.",
      "Lanjutkan ke dosen, kelas dan kegiatan.",
    ),
  ],
  [
    "ADMIN PRODI",
    "Menyiapkan mata kuliah dan kelas",
    cards(
      "Cakupan program studi",
      "Periksa prodi pada Profil.",
      "Kelola kelas dalam cakupan Anda.",
      "Pengampu lintas prodi dapat ditugaskan.",
      "Perubahan identitas melalui pengelola kampus.",
    ),
    cards(
      "Membuat kelas",
      "1. Buka Katalog mata kuliah.",
      "2. Pilih mata kuliah lalu Tambah kelas.",
      "3. Isi rombel dan semester.",
      "4. Periksa pengampu dan peserta.",
      "5. Terbitkan saat kelas siap.",
    ),
  ],
  [
    "ADMIN PRODI",
    "Pengampu dan peserta kelas",
    cards(
      "Pengampu",
      "Buka kelas → Peserta.",
      "Cari dosen berdasarkan identitasnya.",
      "Tambahkan pengampu yang ditugaskan.",
      "Periksa kelas pada akun dosen tersebut.",
    ),
    cards(
      "Peserta",
      "Tambahkan mahasiswa sesuai identitas.",
      "Periksa kepesertaan aktif.",
      "Gunakan impor dengan pratinjau.",
      "Status nonaktif membatasi akses.",
      "Riwayat tetap dapat ditinjau.",
    ),
  ],
  [
    "ADMIN PRODI",
    "Meninjau kondisi kelas dan arsip",
    cards(
      "Kondisi kelas",
      "Periksa status draf atau terbit.",
      "Materi tersembunyi belum terlihat mahasiswa.",
      "Verifikasi pengampu dan peserta.",
    ),
    cards(
      "Bantuan pengajaran",
      "Periksa jadwal dan sesi presensi.",
      "Tinjau laporan kelas sesuai akses.",
      "Bantu dosen menangani kendala.",
    ),
    cards(
      "Arsip kelas",
      "Gunakan tindakan arsip yang tersedia.",
      "Periksa semester sebelum mengarsip.",
      "Riwayat kelas tetap diperlukan untuk peninjauan.",
    ),
  ],
  [
    "DOSEN",
    "Ruang kerja pengajaran",
    cards(
      "Kelas saya",
      "Pilih semester dan kelas yang diampu.",
      "Buka pertemuan, materi dan kegiatan.",
      "Periksa pengumuman serta tenggat.",
      "Filter membantu dosen lintas prodi.",
    ),
    cards(
      "Pekerjaan penilaian",
      "Tinjau kiriman tugas terbaru.",
      "Koreksi uraian dan unggahan kuis.",
      "Bedakan nilai draf dan terbit.",
      "Mahasiswa melihat hasil setelah diterbitkan.",
    ),
  ],
  [
    "DOSEN",
    "Menyusun materi pada pertemuan",
    cards(
      "Modul PDF",
      "Pilih pertemuan.",
      "Unggah PDF yang sesuai.",
      "Periksa pratinjau dan visibilitas.",
      "Terbitkan setelah siap.",
    ),
    cards(
      "Artikel teks",
      "Gunakan editor artikel.",
      "Periksa format dan lampiran.",
      "Impor artikel bila diperlukan.",
      "Simpan lalu periksa hasil.",
    ),
    cards(
      "Video",
      "Unggah video atau gunakan tautan.",
      "Periksa pemutaran.",
      "Atur progres sesuai fitur materi.",
      "Periksa visibilitas mahasiswa.",
    ),
    cards(
      "Bahan pendukung",
      "Unggah berkas praktikum.",
      "Cantumkan tautan referensi.",
      "Periksa berkas dan judul.",
      "Jangan menyamakan unggah dengan terbit.",
    ),
  ],
  [
    "DOSEN",
    "Membuka dan mengatur sesi presensi",
    cards(
      "Langkah penggunaan",
      "1. Buka kelas → Presensi.",
      "2. Tambahkan sesi dan judul.",
      "3. Pilih mode, jadwal dan durasi.",
      "4. Buka sekarang atau jadwalkan.",
      "5. Tampilkan kode bila mode kode dipilih.",
    ),
    cards(
      "Mode dan waktu",
      "Mode satu klik atau kode sesuai sesi.",
      "Kode terdiri dari 6 karakter.",
      "QR membawa mahasiswa ke halaman presensi.",
      "Periksa status sesi dan waktu lokal.",
      "Sesi dapat ditutup atau diperpanjang.",
    ),
  ],
  [
    "DOSEN",
    "Koreksi kehadiran dan rekap presensi",
    cards(
      "Koreksi manual",
      "Buka rincian sesi presensi.",
      "Pilih peserta dan status kehadiran.",
      "Tambahkan catatan yang diperlukan.",
      "Simpan, lalu periksa rekap.",
      "Koreksi memiliki riwayat perubahan.",
    ),
    cards(
      "Rekap kehadiran",
      "Tinjau sesi yang menjadi dasar hitungan.",
      "Periksa Hadir, Izin, Sakit atau Alfa.",
      "Gunakan aturan kelas yang berlaku.",
      "Unduh rekap bila diperlukan.",
      "Jangan menambahkan aturan ujian yang belum ditetapkan.",
    ),
  ],
  [
    "DOSEN",
    "Tugas dan kuis",
    cards(
      "Tugas",
      "Isi petunjuk, tenggat dan batas toleransi.",
      "Periksa jenis pengumpulan.",
      "Tinjau versi kiriman terbaru.",
      "Simpan penilaian sebagai draf.",
      "Terbitkan hasil setelah diperiksa.",
    ),
    cards(
      "Kuis",
      "Tersedia 8 tipe soal.",
      "Soal objektif memakai kunci.",
      "Uraian dan berkas memerlukan koreksi.",
      "Gunakan bank soal atau impor.",
      "Atur kapan hasil dapat dilihat.",
    ),
  ],
  [
    "DOSEN",
    "Nilai akhir dan penggunaan ulang kelas",
    cards(
      "Nilai akhir",
      "Atur bobot kategori hingga 100%.",
      "Periksa sumber nilai setiap kategori.",
      "Hitung dan tinjau hasil.",
      "Terbitkan setelah data siap.",
      "Koreksi mengikuti alur dan riwayat yang tersedia.",
    ),
    cards(
      "Duplikasi kelas",
      "Pilih kelas dan tujuan semester.",
      "Tinjau materi yang akan disalin.",
      "Periksa jadwal dan status draf.",
      "Peserta serta jawaban lama tidak menjadi pekerjaan semester baru.",
    ),
  ],
  [
    "MAHASISWA",
    "Beranda dan agenda belajar",
    cards(
      "Kelas yang diikuti",
      "Pilih kelas pada semester yang benar.",
      "Periksa dosen dan pertemuan.",
      "Baca materi yang sudah tersedia.",
      "Jika kelas kosong, hubungi prodi.",
    ),
    cards(
      "Agenda akademik",
      "Lihat tugas dan kuis mendatang.",
      "Perhatikan tenggat waktu lokal.",
      "Buka kegiatan dari agenda.",
      "Periksa kembali status pengumpulan.",
    ),
  ],
  [
    "MAHASISWA",
    "Mengisi presensi dan mempelajari materi",
    cards(
      "Presensi",
      "1. Buka kelas dan sesi yang aktif.",
      "2. Pilih satu klik atau masukkan kode.",
      "3. Untuk kode, gunakan 6 karakter yang tampil.",
      "4. Kirim dan periksa status tercatat.",
      "QR membuka halaman presensi; ikuti petunjuk sesi.",
    ),
    cards(
      "Materi",
      "Buka pertemuan dan materi.",
      "Baca PDF atau artikel; putar video.",
      "Periksa progres yang ditampilkan.",
      "Unduh sesuai ketentuan materi.",
      "Laporkan materi yang gagal dibuka.",
    ),
  ],
  [
    "MAHASISWA",
    "Mengirim tugas dan menyelesaikan kuis",
    cards(
      "Tugas",
      "Baca petunjuk dan tenggat.",
      "Unggah berkas atau isi jawaban.",
      "Klik tindakan pengumpulan.",
      "Periksa riwayat versi dan status.",
      "Unggah berkas saja belum berarti tugas terkumpul.",
    ),
    cards(
      "Kuis",
      "Periksa waktu dan batas percobaan.",
      "Mulai saat siap.",
      "Perhatikan status simpan jawaban.",
      "Kumpulkan sebelum waktu habis.",
      "Lihat hasil sesuai pengaturan dosen.",
    ),
  ],
  [
    "MAHASISWA",
    "Membaca kehadiran dan hasil belajar",
    cards(
      "Kehadiran",
      "Buka rekap presensi kelas.",
      "Periksa sesi dan status tercatat.",
      "Ambang mengikuti kebijakan kelas.",
      "Jika belum ada sesi, jangan menganggap persentase sebagai nol.",
      "Koreksi dilakukan oleh petugas yang berwenang.",
    ),
    cards(
      "Nilai",
      "Buka hasil tugas, kuis atau tab Nilai.",
      "Hasil draf belum dibagikan.",
      "Nilai akhir tampil setelah diterbitkan.",
      "Untuk keberatan atau kekeliruan, hubungi dosen dengan bukti kegiatan.",
    ),
  ],
  [
    "PENILAIAN",
    "Skala dan bobot pada kelas",
    cards(
      "Versi skala",
      "Buka Bantuan → Konversi nilai.",
      "Periksa versi yang dipakai kelas.",
      "Tabel menampilkan skor minimum, huruf dan indeks.",
      "Gunakan skala tersebut saat membaca hasil.",
    ),
    cards(
      "Bobot kategori",
      "Total bobot harus 100%.",
      "Nilai mengikuti sumber kategori.",
      "Periksa hasil sebelum diterbitkan.",
      "Mengubah default tidak mengganti versi nilai akhir yang telah terbit.",
    ),
  ],
  [
    "SOLUSI KENDALA",
    "Langkah saat data atau halaman bermasalah",
    cards(
      "Presensi dan materi",
      "Periksa kelas, jadwal dan status sesi.",
      "Salin kode 6 karakter dengan benar.",
      "Bila sesi sudah tutup, hubungi dosen.",
      "Untuk materi gagal dibuka, catat judul dan pesan kesalahan.",
    ),
    cards(
      "Sesi dan pengumpulan",
      "Jika sesi berakhir, masuk kembali.",
      "Jika pemuatan gagal, gunakan Coba lagi.",
      "Periksa status jawaban tersimpan.",
      "Catat waktu lokal dan nomor permintaan bila tersedia.",
    ),
  ],
  [
    "BANTUAN",
    "Buku panduan pada tab baru sesuai peran",
    cards(
      "Membuka panduan HTML",
      "1. Pilih menu Bantuan.",
      "2. Klik Buka buku panduan (tab baru).",
      "3. Baca bagian yang sesuai peran akun.",
      "4. Gunakan pencarian atau daftar isi.",
      "5. Kembali ke tab aplikasi setelah selesai.",
    ),
    cards(
      "Isi dan dukungan",
      "Langkah bernomor tanpa kotak centang.",
      "Panduan tidak mengganti peran akun.",
      "Buku memuat 38 tutorial untuk 5 peran.",
      "Hubungi prodi atau pengelola akun kampus untuk kendala yang belum selesai.",
    ),
  ],
];
if (content.length !== 24)
  throw Error("Source coverage must preserve 24 slides");
for (let n = 1; n <= 24; n++) {
  const boxes = records.filter(
    (r) =>
      r.kind === "textbox" &&
      r.slide === n &&
      !r.text.startsWith("E-Learning UAY · Edisi") &&
      !r.text.startsWith("Rektor: membaca"),
  );
  if (boxes.length !== content[n - 1].length)
    throw Error(`Slide ${n}: textbox count differs`);
  for (let i = 0; i < boxes.length; i++) {
    const box = deck.resolve(boxes[i].id);
    box.text = content[n - 1][i];
    if (n !== 1) {
      const dark = n === 24;
      box.text.style = {
        typeface: "Arial",
        fontSize:
          i === 0 ? 14.66 : i === 1 ? 29.33 : boxes[i].bbox[2] < 250 ? 20 : 23,
        color:
          i === 0
            ? dark
              ? "#22C55E"
              : "#166534"
            : dark
              ? "#F8FAFC"
              : "#0F172A",
        bold: i < 2,
        autoFit: "none",
      };
    }
  }
  const slide = deck.resolve(
    records.find((r) => r.kind === "slide" && r.slide === n).id,
  );
  slide.speakerNotes.textFrame.setText(
    "Sumber: apps/web/src/data/helpGuide.json dan fitur aplikasi pada 7 Oktober 2026. Nama, angka dan tanggal demo bukan data kampus. Petunjuk lengkap tersedia di menu Bantuan.",
  );
}
const extra = [
  [
    "REKTOR",
    "Membaca ringkasan dan memilih periode",
    [
      cards(
        "Pilih cakupan",
        "Semester dan rentang tanggal.",
        "Program studi, dosen atau kelas.",
        "Pilihan tersimpan pada alamat halaman.",
        "Unduhan memakai pilihan yang sama.",
      ),
      cards(
        "Makna angka",
        "Kegiatan dihitung dalam periode.",
        "Kondisi kelas memakai Data terakhir.",
        "Dimuat adalah waktu membuka data.",
        "Pemeriksaan ulang setiap 5 menit tidak membuat kegiatan baru.",
      ),
    ],
  ],
  [
    "REKTOR",
    "Menelusuri dosen kelas dan pekerjaan penilaian",
    [
      cards(
        "Dosen dan kelas",
        "Buka Dosen & kelas lalu pilih nama.",
        "Lihat kelas dan kontribusi pengampu.",
        "Buka rincian kelas serta kegiatan.",
        "Kegiatan dihitung atas nama pelakunya.",
      ),
      cards(
        "Progres penilaian",
        "Pekerjaan belum dinilai dan umur antrean.",
        "Nilai draf, terbit dan koreksi.",
        "Kuis otomatis terpisah dari penilaian manual.",
        "Kiriman yang digantikan tidak masuk antrean.",
      ),
    ],
  ],
  [
    "REKTOR",
    "Riwayat kegiatan dan grafik 24 jam",
    [
      cards(
        "Rentang yang tercatat",
        "Grafik harian 00.00 sampai 24.00.",
        "Mengikuti zona waktu perangkat.",
        "Sesi memakai waktu masuk dan keluar.",
        "Jika keluar belum tercatat, tidak diperkirakan.",
      ),
      cards(
        "Cara menafsirkan",
        "Login dan akses kelas bukan kegiatan akademik.",
        "Rentang masuk bukan durasi kerja.",
        "Admin dan sistem memiliki kategori sendiri.",
        "Tidak ada skor atau peringkat otomatis.",
      ),
    ],
  ],
  [
    "REKTOR",
    "Menyimpan laporan dan menilai konteksnya",
    [
      cards(
        "Unduhan",
        "CSV memuat seluruh baris yang cocok.",
        "PDF mengikuti halaman dan filter.",
        "Periksa waktu data serta label demo.",
        "Gunakan periode yang sama untuk pembandingan.",
      ),
      cards(
        "Batas laporan",
        "Identitas dan nilai mahasiswa tidak tampil.",
        "Jawaban serta umpan balik mahasiswa tidak tampil.",
        "Presensi, forum dan telekonferensi belum tersedia pada laporan rektor.",
        "Gunakan laporan sebagai bahan pertimbangan.",
      ),
    ],
  ],
];
function text(slide, value, x, y, w, h, size, color = "#0F172A", bold = false) {
  const sh = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  sh.text = value;
  sh.text.style = {
    fontSize: size,
    typeface: "Arial",
    color,
    bold,
    autoFit: "none",
  };
  return sh;
}
for (const [extraIndex, [category, title, bodies]] of extra.entries()) {
  if (deck.slides.items.length >= 28) {
    const boxes = records.filter(
      (r) =>
        r.kind === "textbox" &&
        r.slide === 25 + extraIndex &&
        !r.text.startsWith("E-Learning UAY · Edisi"),
    );
    if (boxes.length !== 4) throw Error("Unexpected rector slide layout");
    for (const [i, value] of [category, title, ...bodies].entries())
      deck.resolve(boxes[i].id).text = value;
    continue;
  }
  const s = deck.slides.add();
  s.background.fill = "#FFFFFF";
  text(s, category, 76.8, 38.4, 1123.2, 38.4, 14.66, "#166534", true);
  text(s, title, 76.8, 72, 1123.2, 76.8, 29.33, "#0F172A", true);
  for (let i = 0; i < 2; i++) {
    const x = 76.8 + i * 576;
    const card = s.shapes.add({
      geometry: "roundRect",
      position: { left: x, top: 172.8, width: 537.6, height: 480 },
      fill: "#FFFFFF",
      line: { fill: "#E2E8F0", width: 1.33 },
    });
    s.shapes.add({
      geometry: "rect",
      position: { left: x, top: 172.8, width: 537.6, height: 7.68 },
      fill: i ? "#D97706" : "#166534",
      line: { fill: "none", width: 0 },
    });
    text(s, bodies[i], x + 28.8, 200, 480, 412, 25);
  }
  s.speakerNotes.textFrame.setText(
    "Sumber: tutorial R1–R5 pada apps/web/src/data/helpGuide.json; tests/rector-reporting.test.ts dan tests/integration/rector-access.test.ts. Demonstrasikan alur universitas → dosen → kelas → kegiatan. Semua tindakan pada laporan hanya membaca.",
  );
}
const roleSlide = deck.resolve(
  records.find((r) => r.kind === "slide" && r.slide === 4).id,
);
if (
  !records.some(
    (r) =>
      r.kind === "textbox" &&
      r.slide === 4 &&
      r.text.startsWith("Rektor: membaca"),
  )
)
  text(
    roleSlide,
    "Rektor: membaca Pemantauan Akademik tanpa mengubah kelas atau nilai.",
    76.8,
    665,
    1123.2,
    32,
    18,
  );
for (let i = 0; i < deck.slides.items.length; i++) {
  if (
    records.some(
      (r) =>
        r.kind === "textbox" &&
        r.slide === i + 1 &&
        r.text.startsWith("E-Learning UAY · Edisi"),
    )
  )
    continue;
  text(
    deck.slides.items[i],
    `E-Learning UAY · Edisi 7 Oktober 2026                                      ${i + 1} / ${deck.slides.items.length}`,
    76.8,
    698,
    1123.2,
    18,
    11,
    i === 0 || i === 23 ? "#CBD5E1" : "#64748B",
  );
}
const candidate = path.join(workspace, "candidate.pptx");
await (await PresentationFile.exportPptx(deck)).save(candidate);
for (let i = 0; i < deck.slides.items.length; i++) {
  const png = await deck.slides.items[i].export({ format: "png", scale: 1 });
  await fs.writeFile(
    path.join(workspace, `slide-${i + 1}.png`),
    new Uint8Array(await png.arrayBuffer()),
  );
}
await fs.writeFile(
  path.join(workspace, "after.ndjson"),
  (await deck.inspect({ kind: "slide,textbox,shape", maxChars: 300000 }))
    .ndjson,
);
console.log("Candidate:", candidate, "Slides:", deck.slides.items.length);

const esc = (v) =>
  v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const allSlides = [
  ...content,
  ...extra.map(([category, title, bodies]) => [category, title, ...bodies]),
];
const slidesHtml = allSlides
  .map(
    (slide, index) =>
      `<section id="slide-${index + 1}"><small>${esc(slide[0])}</small><h1>${esc(index ? slide[1] : "Sosialisasi dan panduan penggunaan E-Learning UAY")}</h1><div class="cards">${(index
        ? slide.slice(2)
        : slide.slice(0)
      )
        .map((body) => {
          const [title, ...lines] = body.split("\n");
          return `<article><h2>${esc(title)}</h2>${lines
            .filter(Boolean)
            .map((line) => `<p>${esc(line)}</p>`)
            .join("")}</article>`;
        })
        .join(
          "",
        )}</div><footer>E-Learning UAY · Edisi 7 Oktober 2026 · ${index + 1} / 28</footer></section>`,
  )
  .join("");
await fs.writeFile(
  path.join(root, "docs/SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html"),
  `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Panduan presentasi E-Learning UAY</title><style>body{margin:0;background:#eef3f7;color:#173e61;font:20px/1.6 Arial,sans-serif}nav{position:sticky;top:0;background:#173e61;color:white;padding:14px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}nav a{color:white;font-size:17px}button,select{font:inherit;padding:8px;border-radius:6px}section{max-width:1200px;padding:48px;margin:24px auto;background:white;border-radius:12px;min-height:560px}small{color:#166534;font-weight:bold}h1{font-size:34px}h2{font-size:24px}.cards{display:flex;gap:24px}.cards article{flex:1;border:1px solid #dbe4ec;border-top:5px solid #166534;padding:24px;border-radius:8px}footer{font-size:15px;margin-top:32px;color:#64748b}@media(max-width:800px){section{padding:24px}.cards{flex-direction:column}}@media print{nav{display:none}section{break-before:page;margin:0;border:0}body{background:white}}[hidden]{display:none!important}</style><nav><button id="prev">Sebelumnya</button><label>Slide <select id="page">${allSlides.map((s, i) => `<option value="${i}">${i + 1} — ${esc(i ? s[1] : "Pengantar")}</option>`).join("")}</select></label><button id="next">Selanjutnya</button><a href="Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx">Unduh PPT</a></nav>${slidesHtml}<script>const pages=[...document.querySelectorAll('section')], select=document.getElementById('page');function show(n){n=Math.max(0,Math.min(pages.length-1,n));pages.forEach((p,i)=>p.hidden=i!==n);select.value=n;document.getElementById('prev').disabled=n===0;document.getElementById('next').disabled=n===pages.length-1}select.onchange=()=>show(Number(select.value));document.getElementById('prev').onclick=()=>show(Number(select.value)-1);document.getElementById('next').onclick=()=>show(Number(select.value)+1);show(0);</script></html>`,
);
