import type { SystemAnnouncement } from "../../apps/api/src/system-announcements.js";

export const sampleAnnouncements: SystemAnnouncement[] = [
  {
    id: "se-rek-028-2026",
    title:
      "Pelaksanaan Perkuliahan Terpadu Semester Ganjil TA 2026/2027 dan Pemanfaatan Platform E-Learning UAY",
    content: `<p>Diberitahukan kepada seluruh dosen pengampu dan mahasiswa <strong>Universitas Achmad Yani</strong>, bahwa perkuliahan Semester Ganjil Tahun Akademik 2026/2027 diselenggarakan secara terpadu melalui platform <strong>E-Learning UAY</strong>.</p>

<h3>Ketentuan Pokok Perkuliahan:</h3>
<ul>
  <li>Seluruh dosen diwajibkan mengunggah materi modul perkuliahan dan kontrak pembelajaran sebelum pertemuan perdana.</li>
  <li>Mahasiswa diwajibkan melakukan konfirmasi jadwal serta ruang perkuliahan virtual di akun masing-masing.</li>
  <li>Presensi kehadiran divalidasi langsung melalui sistem presensi mandiri dan sesi QR code dosen pengampu.</li>
</ul>

<blockquote class="callout-box">
  <strong>PERHATIAN REKTORAT:</strong> Setiap aktivitas pembelajaran daring dan penugasan terekam otomatis dalam repositori akademik universitas.
</blockquote>`,
    category: "SURAT_EDARAN",
    referenceNumber: "SE/028/UAY/REK/2026",
    authorId: "superadmin-uay-001",
    authorName: "Bagian Administrasi Akademik & Rektorat",
    authorRole: "SUPER_ADMIN",
    targetRole: "ALL",
    isImportant: true,
    isPublished: true,
    attachmentUrl:
      "https://uay.ac.id/dokumen/SE-028-Perkuliahan-Ganjil-2026.pdf",
    attachmentName: "SE-028-Perkuliahan-Ganjil-2026.pdf",
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "baak-krs-114-2026",
    title:
      "Jadwal Pengisian, Perubahan, dan Pengesahan Kartu Rencana Studi (KRS) Online Semester Ganjil",
    content: `<p>Masa pengisian dan revisi <strong>KRS Online</strong> pada sistem SIAKAD UAY dibuka sampai batas waktu yang ditentukan kalender akademik.</p>

<h3>Alur Konsultasi & Pengesahan KRS:</h3>
<ol>
  <li>Pastikan status administrasi pembayaran tahap pertama telah terverifikasi bendahara kampus.</li>
  <li>Pilih mata kuliah sesuai paket semester dan batas beban SKS berdasarkan IPK semester lalu.</li>
  <li>Konsultasikan rencana studi kepada <em>Dosen Pembimbing Akademik (DPA)</em> untuk persetujuan (ACC).</li>
</ol>

<blockquote class="callout-box">
  <strong>CATATAN BAAK:</strong> Sinkronisasi data mahasiswa ke kelas E-Learning memerlukan waktu 1x24 jam kerja setelah KRS disetujui (ACC).
</blockquote>`,
    category: "REGISTRASI",
    referenceNumber: "B/114/BAAK/UAY/2026",
    authorId: "superadmin-uay-001",
    authorName: "Biro Administrasi Akademik & Kemahasiswaan (BAAK)",
    authorRole: "SUPER_ADMIN",
    targetRole: "STUDENT",
    isImportant: true,
    isPublished: true,
    attachmentUrl:
      "https://siakad.uay.ac.id/panduan/jadwal-krs-ganjil-2026.pdf",
    attachmentName: "Jadwal-KRS-Ganjil-2026.pdf",
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lp3m-rps-089-2026",
    title:
      "Batas Akhir Sinkronisasi Kontrak Perkuliahan, Rencana Pembelajaran Semester (RPS), dan Bank Soal",
    content: `<p>Kepada seluruh Bapak/Ibu Dosen Pengampu mata kuliah di lingkungan Universitas Achmad Yani, dimohon untuk melengkapi instrumen perkuliahan pada kelas masing-masing:</p>

<ul>
  <li><strong>Kontrak Perkuliahan &amp; RPS:</strong> Terunggah dalam format dokumen atau Rich Text sebelum pekan ke-2.</li>
  <li><strong>Topik Pertemuan:</strong> Disusun minimum 16 sesi tatap muka terstruktur (termasuk UTS dan UAS).</li>
  <li><strong>Bank Soal Asesmen:</strong> Kelengkapan bank soal kuis dan penugasan untuk evaluasi <em>Capaian Pembelajaran Lulusan (CPL)</em>.</li>
</ul>`,
    category: "AKADEMIK",
    referenceNumber: "B/089/LP3M/UAY/2026",
    authorId: "superadmin-uay-001",
    authorName: "Lembaga Pengembangan Pembelajaran & Penjaminan Mutu (LP3M)",
    authorRole: "SUPER_ADMIN",
    targetRole: "INSTRUCTOR",
    isImportant: false,
    isPublished: true,
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "se-libur-031-2026",
    title:
      "Penetapan Hari Libur Nasional & Penyesuaian Agenda Evaluasi Tengah Semester (UTS)",
    content: `<p>Merujuk pada <strong>Surat Keputusan Bersama (SKB)</strong> tentang Hari Libur Nasional dan Cuti Bersama, dengan ini diberitahukan bahwa:</p>

<ul>
  <li>Kegiatan perkuliahan tatap muka maupun daring pada tanggal merah ditiadakan.</li>
  <li>Dosen dapat mengalihkan pertemuan secara asinkronus melalui penugasan terstruktur di platform E-Learning.</li>
  <li>Jadwal evaluasi tengah semester (UTS) yang bertepatan dengan tanggal libur akan dialihkan ke pekan pengganti.</li>
</ul>`,
    category: "LIBUR",
    referenceNumber: "SE/031/UAY/REK/2026",
    authorId: "superadmin-uay-001",
    authorName: "Sekretariat Rektorat UAY",
    authorRole: "SUPER_ADMIN",
    targetRole: "ALL",
    isImportant: false,
    isPublished: true,
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
