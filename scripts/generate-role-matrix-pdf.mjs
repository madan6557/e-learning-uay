import PDFDocument from "pdfkit";
import { createWriteStream, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const outputPath = join(process.cwd(), "docs", "Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf");
const artifactDir = "C:\\Users\\mikyl\\.gemini\\antigravity\\brain\\e6f9988c-7087-4127-9e25-8d0db675ec57";
const artifactPath = join(artifactDir, "Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf");

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 40, bottom: 40, left: 45, right: 45 },
  bufferPages: true,
  info: {
    Title: "Dokumen Tata Kelola: Hirarki Role, Hak Akses Fitur & Matriks Aksi E-Learning UAY",
    Author: "Universitas Achmad Yani (UAY)",
    Subject: "Kebijakan Otorisasi & Matriks Hak Akses Pengguna E-Learning UAY",
    Keywords: "UAY, E-Learning, Role Hierarchy, Permissions, Department Admin, Instructor, Assistant, Rector, Super Admin, Student",
  },
});

const stream = createWriteStream(outputPath);
doc.pipe(stream);

// Helper styles
const primaryColor = "#0284c7";
const darkColor = "#0f172a";
const textMuted = "#475569";
const borderColor = "#cbd5e1";
const accentRed = "#dc2626";
const accentGreen = "#16a34a";
const bgLight = "#f8fafc";

// Header Banner
doc.rect(45, 40, 505, 65).fill("#f0f9ff");
doc.rect(45, 40, 6, 65).fill(primaryColor);

doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("UNIVERSITAS ACHMAD YANI (UAY) • SISTEM E-LEARNING", 60, 50);
doc.fillColor(darkColor).fontSize(13.5).font("Helvetica-Bold").text("DOKUMEN KEBIJAKAN TATA KELOLA AKADEMIK", 60, 63);
doc.fillColor(textMuted).fontSize(8.5).font("Helvetica").text("Hirarki Role, Hak Akses Fitur & Matriks Izin Aksi Pengguna Platform (Termasuk Asisten Dosen)", 60, 79);
doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold").text("STATUS: RESMI & TERVALIDASI (2026/2027)", 350, 50, { align: "right", width: 185 });

doc.moveDown(2.5);

// Section 1: Ringkasan Eksekutif
doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("1. RINGKASAN EKSEKUTIF & 6 PERAN PENGGUNA PLATFORM");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.5);

doc.fillColor(darkColor).fontSize(8.5).font("Helvetica").text(
  "Platform E-Learning Universitas Achmad Yani menerapkan model otorisasi Role-Based Access Control (RBAC) dengan Row-Level Authorization yang terhubung dengan SSO UAY. Setiap peran memiliki batasan wewenang tegas demi menjamin integritas akademik dan pemisahan tugas (Separation of Concerns).",
  { lineGap: 2.5 }
);
doc.moveDown(0.4);

const roles = [
  {
    name: "SUPER_ADMIN (Super Administrator / Admin IT)",
    desc: "Otoritas tertinggi tata kelola sistem. Mengatur kebijakan universitas (skala nilai, semester), mengelola seluruh katalog program studi, memublikasikan surat edaran universitas, dan melakukan audit sistem global.",
  },
  {
    name: "RECTOR (Rektor / Pimpinan Universitas)",
    desc: "Otoritas pemantauan eksekutif secara agregat (Read-Only). Memantau KPI universitas, waterfall aktivitas dosen, rekap penyelesaian nilai, dan membaca pengumuman. Dilarang mengubah konten atau lembar nilai kelas.",
  },
  {
    name: "DEPARTMENT_ADMIN (Admin Program Studi / BAAK Fakultas)",
    desc: "Otoritas administrasi tingkat program studi terikat departmentScopes (misal: IF). Mengelola katalog & kelas prodi, membantu mengisi materi kelas, kuis & tugas, TETAPI dilarang keras mengoreksi dan menginput nilai mahasiswa.",
  },
  {
    name: "INSTRUCTOR (Dosen Pengampu Mata Kuliah)",
    desc: "Otoritas pedagogi dan akademik penuh di kelas yang diampu. Bertanggung jawab atas pengisian materi, pelaksanaan kuis & tugas, validasi presensi, penilaian (grading) hasil belajar mahasiswa, dan penetapan nilai akhir.",
  },
  {
    name: "ASSISTANT (Asisten Dosen / Asisten Praktikum Lab)",
    desc: "Otoritas operasional pengajar pada kelas praktikum yang ditugaskan. Bertanggung jawab mengelola modul lab, membuka presensi praktikum, serta memeriksa dan menilai tugas/laporan mahasiswa. Mahasiswa dapat bertindak sebagai Asdos di kelas praktikum tanpa kehilangan identitas mahasiswa di kelas lain.",
  },
  {
    name: "STUDENT (Mahasiswa)",
    desc: "Peserta pembelajaran. Mengakses materi belajar, mengerjakan kuis dengan batas waktu dan timer, mengunggah tugas, presensi mandiri, serta melihat transkrip nilai pribadi.",
  },
];

roles.forEach((r) => {
  doc.rect(45, doc.y, 505, 30).fill(bgLight);
  doc.rect(45, doc.y, 3, 30).fill(primaryColor);
  doc.fillColor(darkColor).fontSize(8.5).font("Helvetica-Bold").text(r.name, 55, doc.y + 3);
  doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(r.desc, 55, doc.y + 14, { width: 485, lineGap: 1 });
  doc.moveDown(1.15);
});

doc.moveDown(0.3);

// Section 2: Ketentuan Khusus Admin Prodi & Asdos
doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("2. KETENTUAN KHUSUS: BANTUAN KONTEN ADMIN PRODI & ASISTEN DOSEN");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.4);

doc.rect(45, doc.y, 505, 52).fill("#fffbeb");
doc.rect(45, doc.y, 4, 52).fill("#f59e0b");
doc.fillColor("#92400e").fontSize(8).font("Helvetica-Bold").text("KEBIJAKAN RESMI: PENGISIAN KONTEN VS HAK PENILAIAN (GRADING RIGHTS)", 55, doc.y + 5);
doc.fillColor("#78350f").fontSize(7.5).font("Helvetica").text(
  "1. Admin Prodi DIIZINKAN membantu dosen menyiapkan struktur topik (sections), mengunggah modul ajar, menyusun draf penugasan, butir kuis, dan presensi, TETAPI DILARANG KERAS mengoreksi jawaban mahasiswa, memberi nilai, atau mengubah bobot penilaian.\n" +
  "2. Asisten Dosen (ASSISTANT) yang ditugaskan resmi oleh Dosen Pengampu pada kelas praktikum DIIZINKAN mengelola modul/section praktikum, membuka sesi presensi lab, serta memeriksa dan menilai tugas/laporan mahasiswa praktikum kelas bersangkutan.",
  55,
  doc.y + 17,
  { width: 485, lineGap: 2 }
);
doc.moveDown(2.2);

// PAGE 2: Matriks Akses Fitur & Aksi
doc.addPage();

doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("3. MATRIKS AKSES FITUR & NAVIGASI HALAMAN");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.5);

// Table helper
function drawTable(headers, rows, colWidths, startX = 45) {
  let currentY = doc.y;
  
  // Header Row
  doc.rect(startX, currentY, 505, 18).fill("#e0f2fe");
  let curX = startX;
  doc.fillColor("#0369a1").fontSize(7.5).font("Helvetica-Bold");
  headers.forEach((h, i) => {
    doc.text(h, curX + 2, currentY + 5, { width: colWidths[i] - 4, align: i >= 2 ? "center" : "left" });
    curX += colWidths[i];
  });
  currentY += 18;

  // Data Rows
  rows.forEach((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    doc.rect(startX, currentY, 505, 16).fill(isEven ? "#ffffff" : bgLight);
    doc.rect(startX, currentY, 505, 16).strokeColor(borderColor).lineWidth(0.5).stroke();

    let cellX = startX;
    row.forEach((cell, cIdx) => {
      doc.fillColor(cell === "Ya" || cell === "Aktif" || cell === "Penuh" ? accentGreen : cell === "Tidak" || cell === "Dilarang" ? accentRed : darkColor);
      doc.fontSize(7).font(cIdx === 0 ? "Helvetica-Bold" : "Helvetica");
      doc.text(cell, cellX + 2, currentY + 4, { width: colWidths[cIdx] - 4, align: cIdx >= 2 ? "center" : "left" });
      cellX += colWidths[cIdx];
    });
    currentY += 16;
  });

  doc.y = currentY + 10;
}

const navHeaders = ["Fitur Modul", "Rute URL", "Super Admin", "Rektor", "Admin Prodi", "Dosen", "Asdos", "Mahasiswa"];
const navWidths = [95, 75, 55, 48, 58, 54, 60, 60];
const navRows = [
  ["Dashboard", "/dashboard", "Ya (Global)", "Tidak", "Ya (Prodi)", "Ya (Amputan)", "Ya (Asdos)", "Ya (Peserta)"],
  ["Pemantauan Rektor", "/rector", "Ya (Audit)", "Ya (Utama)", "Tidak", "Tidak", "Tidak", "Tidak"],
  ["Katalog Kurikulum", "/catalog", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak", "Tidak"],
  ["Ruang Kelas", "/classes", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Ya (Amputan)", "Ya (Asdos)", "Ya (Diikuti)"],
  ["Detail Kelas", "/classes/:id", "Baca", "Tidak", "Bantu Konten", "Kelola Penuh", "Kelola (Asdos)", "Belajar"],
  ["Kuis & Asesmen", "/quizzes", "Pratinjau", "Tidak", "Bantu Susun", "Susun & Nilai", "Susun & Nilai", "Kerjakan"],
  ["Tugas Kuliah", "/assignments", "Pratinjau", "Tidak", "Bantu Susun", "Buat & Nilai", "Buat & Nilai", "Unggah Tugas"],
  ["Presensi Sesi", "Tab Presensi", "Rekap", "Tidak", "Bantu Sesi", "Buka QR/Nilai", "Buka Sesi Lab", "Presensi Mandiri"],
  ["Buku Nilai", "/grades", "Rekap Global", "Tidak", "Rekap Prodi", "Kelola & Terbit", "Bantu Nilai", "Nilai Pribadi"],
  ["Agenda Kalender", "/agenda", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Ya (Jadwal)", "Ya (Jadwal)", "Ya (Jadwal)"],
  ["Pusat Pengumuman", "/announcements", "Terbitkan/Pin", "Baca Semua", "Terbitkan (Prodi)", "Baca", "Baca", "Baca"],
  ["Profil Pengguna", "/profile", "Ya", "Ya", "Ya", "Ya", "Ya", "Ya"],
  ["Pusat Bantuan", "/help", "Ya", "Ya", "Ya", "Ya", "Ya", "Ya"],
];

drawTable(navHeaders, navRows, navWidths);

doc.moveDown(0.3);

// Section 4: Matriks Izin Aksi Detail
doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("4. MATRIKS IZIN AKSI (ACTION PERMISSIONS) & PEMBATASAN OTORITAS");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.5);

const actHeaders = ["Aksi / Operasi Sistem", "Super Admin", "Rektor", "Admin Prodi", "Dosen", "Asdos", "Mahasiswa"];
const actWidths = [155, 58, 52, 60, 60, 60, 60];
const actRows = [
  ["Ubah Skala Nilai / Semester", "Ya", "Tidak", "Tidak", "Tidak", "Tidak", "Tidak"],
  ["Tambah / Hapus MK Katalog", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak", "Tidak"],
  ["Buka & Kloning Rombel Kelas", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak", "Tidak"],
  ["Pendaftaran Peserta (Enroll)", "Ya (Manual)", "Tidak", "Ya (Manual)", "Tidak", "Tidak", "Ya (Kode Key)"],
  ["Tugaskan Asisten Dosen (Asdos)", "Ya", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Tidak", "Tidak"],
  ["Buat Topik Pertemuan (Sections)", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Ya (Praktikum)", "Tidak"],
  ["Filter Tab Badge Pertemuan", "Ya", "Tidak", "Ya", "Ya", "Ya", "Ya"],
  ["Unggah Materi / Video / PDF", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Ya (Praktikum)", "Tidak"],
  ["Buat Draf Kuis & Tugas", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Ya (Praktikum)", "Tidak"],
  ["Koreksi / Beri Skor Jawaban Kuis", "Dilarang", "Dilarang", "Dilarang", "Ya (Dosen)", "Ya (Praktikum)", "Tidak"],
  ["Koreksi / Beri Skor Berkas Tugas", "Dilarang", "Dilarang", "Dilarang", "Ya (Dosen)", "Ya (Praktikum)", "Tidak"],
  ["Publikasikan Nilai Kuis/Tugas", "Dilarang", "Dilarang", "Dilarang", "Ya (Dosen)", "Ya (Praktikum)", "Tidak"],
  ["Atur Bobot Komponen Penilaian", "Dilarang", "Dilarang", "Dilarang", "Ya (Dosen)", "Tidak", "Tidak"],
  ["Input Nilai Manual / Kunci Nilai", "Dilarang", "Dilarang", "Dilarang", "Ya (Dosen)", "Tidak", "Tidak"],
  ["Ekspor Rekap Nilai (Excel/CSV)", "Ya", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Ya (Praktikum)", "Tidak"],
  ["Jadwalkan Sesi Presensi", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Ya (Praktikum)", "Tidak"],
  ["Tampilkan QR / Kode Presensi", "Tidak", "Tidak", "Tidak", "Ya (Dosen)", "Ya (Praktikum)", "Tidak"],
  ["Kirim Presensi Mandiri (Check-in)", "Tidak", "Tidak", "Tidak", "Tidak", "Tidak", "Ya (Mahasiswa)"],
  ["Terbitkan Edaran Resmi Kampus", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak", "Tidak"],
  ["Lihat Waterfall Aktivitas Dosen", "Ya (Audit)", "Ya (Utama)", "Tidak", "Tidak", "Tidak", "Tidak"],
];

drawTable(actHeaders, actRows, actWidths);

// Footer on all pages
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc.moveTo(45, 800).lineTo(550, 800).strokeColor(borderColor).lineWidth(0.5).stroke();
  doc.fillColor(textMuted).fontSize(7).font("Helvetica").text(
    "Universitas Achmad Yani (UAY) • Sistem Manajemen Pembelajaran Terpadu (E-Learning) • Dokumen Tata Kelola",
    45,
    806
  );
  doc.text(`Halaman ${i + 1} dari ${range.count}`, 45, 806, { align: "right", width: 505 });
}

doc.end();

stream.on("finish", () => {
  try {
    if (!existsSync(artifactDir)) mkdirSync(artifactDir, { recursive: true });
    copyFileSync(outputPath, artifactPath);
    console.log("PDF berhasil dibuat dan disalin ke direktori artifact:", artifactPath);
  } catch (err) {
    console.error("Gagal menyalin PDF ke artifact:", err);
  }
});
