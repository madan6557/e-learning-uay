import PDFDocument from "pdfkit";
import { createWriteStream, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const outputPath = join(process.cwd(), "docs", "Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf");
const artifactDir = "C:\\Users\\mikyl\\.gemini\\antigravity\\brain\\6aeb902d-aa79-4adb-a0dd-28bd55aa1ed0";
const artifactPath = join(artifactDir, "Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf");

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 45, bottom: 45, left: 45, right: 45 },
  bufferPages: true,
  info: {
    Title: "Dokumen Tata Kelola: Hirarki Role, Hak Akses Fitur & Matriks Aksi E-Learning UAY",
    Author: "Universitas Achmad Yani (UAY)",
    Subject: "Kebijakan Otorisasi & Matriks Hak Akses Pengguna E-Learning UAY",
    Keywords: "UAY, E-Learning, Role Hierarchy, Permissions, Department Admin, Instructor, Rector, Super Admin, Student",
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
doc.rect(45, 45, 505, 70).fill("#f0f9ff");
doc.rect(45, 45, 6, 70).fill(primaryColor);

doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("UNIVERSITAS ACHMAD YANI (UAY) • SISTEM E-LEARNING", 60, 56);
doc.fillColor(darkColor).fontSize(14).font("Helvetica-Bold").text("DOKUMEN KEBIJAKAN TATA KELOLA AKADEMIK", 60, 70);
doc.fillColor(textMuted).fontSize(9).font("Helvetica").text("Hirarki Role, Hak Akses Fitur & Matriks Izin Aksi Pengguna Platform", 60, 88);
doc.fillColor(primaryColor).fontSize(8).font("Helvetica-Bold").text("STATUS: RESMI & TERVALIDASI (2026/2027)", 350, 56, { align: "right", width: 185 });

doc.moveDown(3);

// Section 1: Ringkasan Eksekutif
doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("1. RINGKASAN EKSEKUTIF & 5 PERAN PENGGUNA");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.6);

doc.fillColor(darkColor).fontSize(9.5).font("Helvetica").text(
  "Platform E-Learning Universitas Achmad Yani menerapkan model otorisasi Role-Based Access Control (RBAC) yang terhubung dengan SSO UAY. Setiap peran memiliki batasan wewenang yang tegas untuk menjamin integritas akademik, privasi data mahasiswa, dan pemisahan tugas (Separation of Concerns).",
  { lineGap: 3 }
);
doc.moveDown(0.5);

const roles = [
  {
    name: "SUPER_ADMIN (Super Administrator / Admin IT)",
    desc: "Otoritas tertinggi tata kelola sistem. Mengatur kebijakan universitas (skala nilai, semester), mengelola seluruh katalog program studi, memublikasikan surat edaran universitas, dan melakukan audit sistem.",
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
    name: "STUDENT (Mahasiswa)",
    desc: "Peserta pembelajaran. Mengakses materi belajar, mengerjakan kuis dengan batas waktu dan timer, mengunggah tugas, presensi mandiri, serta melihat transkrip nilai pribadi.",
  },
];

roles.forEach((r) => {
  doc.rect(45, doc.y, 505, 34).fill(bgLight);
  doc.rect(45, doc.y, 3, 34).fill(primaryColor);
  doc.fillColor(darkColor).fontSize(9).font("Helvetica-Bold").text(r.name, 55, doc.y + 4);
  doc.fillColor(textMuted).fontSize(8).font("Helvetica").text(r.desc, 55, doc.y + 16, { width: 485, lineGap: 1.5 });
  doc.moveDown(1.4);
});

doc.moveDown(0.5);

// Section 2: Ketentuan Khusus Admin Prodi
doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("2. KETENTUAN KHUSUS: BANTUAN KONTEN KELAS OLEH ADMIN PRODI");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.6);

doc.rect(45, doc.y, 505, 58).fill("#fffbeb");
doc.rect(45, doc.y, 4, 58).fill("#f59e0b");
doc.fillColor("#92400e").fontSize(8.5).font("Helvetica-Bold").text("KEBIJAKAN RESMI: PENGISIAN KONTEN VS HAK PENILAIAN (KECUALI NILAI)", 55, doc.y + 6);
doc.fillColor("#78350f").fontSize(8).font("Helvetica").text(
  "1. Admin Prodi DIIZINKAN membantu dosen menyiapkan struktur topik (sections), mengunggah modul ajar (Rich Text, PDF, video, simulator), menyusun draf penugasan, butir kuis, bank soal, dan menjadwalkan presensi pada kelas prodinya.\n" +
  "2. Admin Prodi DILARANG KERAS (KECUALI NILAI): mengoreksi jawaban mahasiswa, memberi skor tugas/kuis, mengubah bobot penilaian, menginput nilai manual, mengunci, atau mempublikasikan buku nilai. Penilaian adalah hak mutlak Dosen Pengampu.",
  55,
  doc.y + 20,
  { width: 485, lineGap: 2.5 }
);
doc.moveDown(2.5);

// PAGE 2: Matriks Akses Fitur & Aksi
doc.addPage();

doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("3. MATRIKS AKSES FITUR & NAVIGASI HALAMAN");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.6);

// Table helper
function drawTable(headers, rows, colWidths, startX = 45) {
  let currentY = doc.y;
  
  // Header Row
  doc.rect(startX, currentY, 505, 20).fill("#e0f2fe");
  let curX = startX;
  doc.fillColor("#0369a1").fontSize(8).font("Helvetica-Bold");
  headers.forEach((h, i) => {
    doc.text(h, curX + 4, currentY + 6, { width: colWidths[i] - 8, align: i >= 2 && i <= 6 ? "center" : "left" });
    curX += colWidths[i];
  });
  currentY += 20;

  // Data Rows
  rows.forEach((row, rIdx) => {
    const isEven = rIdx % 2 === 0;
    doc.rect(startX, currentY, 505, 18).fill(isEven ? "#ffffff" : bgLight);
    doc.rect(startX, currentY, 505, 18).strokeColor(borderColor).lineWidth(0.5).stroke();

    let cellX = startX;
    row.forEach((cell, cIdx) => {
      doc.fillColor(cell === "Ya" || cell === "Aktif" || cell === "Penuh" ? accentGreen : cell === "Tidak" || cell === "Dilarang" ? accentRed : darkColor);
      doc.fontSize(7.5).font(cIdx === 0 ? "Helvetica-Bold" : "Helvetica");
      doc.text(cell, cellX + 4, currentY + 5, { width: colWidths[cIdx] - 8, align: cIdx >= 2 && cIdx <= 6 ? "center" : "left" });
      cellX += colWidths[cIdx];
    });
    currentY += 18;
  });

  doc.y = currentY + 12;
}

const navHeaders = ["Fitur Modul", "Rute URL", "Super Admin", "Rektor", "Admin Prodi", "Dosen", "Mahasiswa"];
const navWidths = [110, 85, 62, 55, 65, 60, 68];
const navRows = [
  ["Dashboard", "/dashboard", "Ya (Global)", "Tidak", "Ya (Prodi)", "Ya (Amputan)", "Ya (Peserta)"],
  ["Pemantauan Rektor", "/rector", "Ya (Audit)", "Ya (Utama)", "Tidak", "Tidak", "Tidak"],
  ["Katalog Kurikulum", "/catalog", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak"],
  ["Ruang Kelas", "/classes", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Ya (Amputan)", "Ya (Diikuti)"],
  ["Detail Kelas", "/classes/:id", "Baca", "Tidak", "Bantu Konten", "Kelola Penuh", "Belajar"],
  ["Kuis & Asesmen", "/quizzes", "Pratinjau", "Tidak", "Bantu Susun", "Susun & Nilai", "Kerjakan"],
  ["Tugas Kuliah", "/assignments", "Pratinjau", "Tidak", "Bantu Susun", "Buat & Nilai", "Unggah Tugas"],
  ["Presensi Sesi", "Tab Presensi", "Rekap", "Tidak", "Bantu Sesi", "Buka QR/Nilai", "Presensi Mandiri"],
  ["Buku Nilai", "/grades", "Rekap Global", "Tidak", "Rekap Prodi", "Kelola & Terbit", "Nilai Pribadi"],
  ["Agenda Kalender", "/agenda", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Ya (Jadwal)", "Ya (Jadwal)"],
  ["Pusat Pengumuman", "/announcements", "Terbitkan/Pin", "Baca Semua", "Terbitkan (Prodi)", "Baca", "Baca"],
  ["Profil Pengguna", "/profile", "Ya", "Ya", "Ya", "Ya", "Ya"],
  ["Pusat Bantuan", "/help", "Ya", "Ya", "Ya", "Ya", "Ya"],
];

drawTable(navHeaders, navRows, navWidths);

doc.moveDown(0.5);

// Section 4: Matriks Izin Aksi Detail
doc.fillColor(primaryColor).fontSize(12).font("Helvetica-Bold").text("4. MATRIKS IZIN AKSI (ACTION PERMISSIONS) & PEMBATASAN NILAI");
doc.moveTo(45, doc.y + 2).lineTo(550, doc.y + 2).strokeColor(primaryColor).lineWidth(1.5).stroke();
doc.moveDown(0.6);

const actHeaders = ["Aksi / Operasi Sistem", "Super Admin", "Rektor", "Admin Prodi", "Dosen", "Mahasiswa"];
const actWidths = [165, 68, 62, 70, 70, 70];
const actRows = [
  ["Ubah Skala Nilai / Semester", "Ya", "Tidak", "Tidak", "Tidak", "Tidak"],
  ["Tambah / Hapus MK Katalog", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak"],
  ["Buka & Kloning Rombel Kelas", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak"],
  ["Pendaftaran Peserta (Enroll)", "Ya (Manual)", "Tidak", "Ya (Manual)", "Tidak", "Ya (Kode Key)"],
  ["Buat Topik Pertemuan (Sections)", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Tidak"],
  ["Unggah Materi / Video / PDF", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Tidak"],
  ["Buat Draf Kuis & Tugas", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Tidak"],
  ["Koreksi / Beri Skor Jawaban Kuis", "Dilarang", "Dilarang", "Dilarang (Kecuali)", "Ya (Dosen)", "Tidak"],
  ["Koreksi / Beri Skor Berkas Tugas", "Dilarang", "Dilarang", "Dilarang (Kecuali)", "Ya (Dosen)", "Tidak"],
  ["Publikasikan Nilai Kuis/Tugas", "Dilarang", "Dilarang", "Dilarang (Kecuali)", "Ya (Dosen)", "Tidak"],
  ["Atur Bobot Komponen Penilaian", "Dilarang", "Dilarang", "Dilarang (Kecuali)", "Ya (Dosen)", "Tidak"],
  ["Input Nilai Manual / Kunci Nilai", "Dilarang", "Dilarang", "Dilarang (Kecuali)", "Ya (Dosen)", "Tidak"],
  ["Ekspor Rekap Nilai (Excel/CSV)", "Ya", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Tidak"],
  ["Jadwalkan Sesi Presensi", "Tidak", "Tidak", "Ya (Prodi)", "Ya (Kelasnya)", "Tidak"],
  ["Tampilkan QR Code Presensi", "Tidak", "Tidak", "Tidak", "Ya (Dosen)", "Tidak"],
  ["Kirim Presensi Mandiri (Check-in)", "Tidak", "Tidak", "Tidak", "Tidak", "Ya (Mahasiswa)"],
  ["Terbitkan Edaran Resmi Kampus", "Ya (Semua)", "Tidak", "Ya (Prodi)", "Tidak", "Tidak"],
  ["Lihat Waterfall Aktivitas Dosen", "Ya (Audit)", "Ya (Utama)", "Tidak", "Tidak", "Tidak"],
];

drawTable(actHeaders, actRows, actWidths);

// Footer on all pages
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);
  doc.moveTo(45, 785).lineTo(550, 785).strokeColor(borderColor).lineWidth(0.5).stroke();
  doc.fillColor(textMuted).fontSize(7.5).font("Helvetica").text(
    "Universitas Achmad Yani (UAY) • Sistem Manajemen Pembelajaran Terpadu (E-Learning) • Dokumen Tata Kelola",
    45,
    792
  );
  doc.text(`Halaman ${i + 1} dari ${range.count}`, 45, 792, { align: "right", width: 505 });
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
