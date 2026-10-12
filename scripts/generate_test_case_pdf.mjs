import { writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const projectRoot = process.cwd();
const docsDir = join(projectRoot, "docs");
const tempHtmlPath = join(projectRoot, "temp_test_cases.html");
const outputPdfPath = join(docsDir, "TEST_CASE_PANDUAN_ELEARNING_UAY.pdf");
const artifactDir = "C:\\Users\\mikyl\\.gemini\\antigravity\\brain\\e6f9988c-7087-4127-9e25-8d0db675ec57";
const artifactPdfPath = join(artifactDir, "TEST_CASE_PANDUAN_ELEARNING_UAY.pdf");

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Panduan & Dokumen Test Case E-Learning UAY</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
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
      line-height: 1.5;
      font-size: 10pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* Cover / Header Banner */
    .header-banner {
      border-left: 6px solid #0284c7;
      background: #f0f9ff;
      padding: 18px 24px;
      border-radius: 0 10px 10px 0;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }

    .header-subtitle {
      font-size: 11pt;
      color: #0369a1;
      font-weight: 600;
      margin: 0 0 6px 0;
    }

    .header-meta {
      font-size: 8.5pt;
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
      font-size: 13pt;
      font-weight: 700;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      margin-top: 16px;
      margin-bottom: 8px;
      color: #1e293b;
    }

    p {
      margin: 0 0 10px 0;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 8.5pt;
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
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      font-size: 8.5pt;
    }

    td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
      color: #334155;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    /* Test Case Card / Block */
    .tc-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 14px;
      page-break-inside: avoid;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      overflow: hidden;
    }

    .tc-header {
      background: #f8fafc;
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tc-id {
      font-weight: 800;
      font-size: 9.5pt;
      color: #0284c7;
    }

    .tc-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0f172a;
      margin-left: 8px;
    }

    .tc-role-pill {
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }

    .role-super-admin { background: #fee2e2; color: #991b1b; }
    .role-dept-admin  { background: #fef3c7; color: #92400e; }
    .role-instructor  { background: #e0f2fe; color: #075985; }
    .role-student     { background: #dcfce7; color: #166534; }
    .role-rector      { background: #f3e8ff; color: #6b21a8; }
    .role-global      { background: #f1f5f9; color: #334155; }

    .tc-body {
      padding: 10px 14px;
    }

    .tc-grid {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 6px;
      font-size: 8.8pt;
      margin-bottom: 6px;
    }

    .tc-label {
      font-weight: 600;
      color: #64748b;
    }

    .tc-value {
      color: #1e293b;
    }

    .steps-list {
      margin: 4px 0 6px 18px;
      padding: 0;
      font-size: 8.8pt;
    }

    .steps-list li {
      margin-bottom: 4px;
    }

    .expected-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 6px 10px;
      margin-top: 6px;
      font-size: 8.5pt;
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
      font-size: 8.5pt;
      color: #0369a1;
      margin: 10px 0;
    }

    .page-break {
      page-break-before: always;
    }

    .toc {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 16px 0 24px 0;
    }

    .toc ul {
      margin: 6px 0 0 16px;
      padding: 0;
      font-size: 9pt;
      line-height: 1.6;
    }

    .toc a {
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
    }

    footer {
      font-size: 7.5pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 24px;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- Header Banner -->
  <div class="header-banner">
    <div>
      <div class="header-subtitle">UNIVERSITAS AL-AMIN YOGYAKARTA (UAY)</div>
      <div class="header-title">DOKUMEN TEST CASE & PANDUAN PENGUJIAN</div>
      <div class="header-meta">
        Sistem Pembelajaran Elektronik (E-Learning UAY) • Versi 2.1 (Terkini) • Lingkungan: Staging / Production
      </div>
    </div>
    <div style="text-align: right;">
      <span class="badge-status">VALIDATED TEST SPEC</span>
      <div style="font-size: 7.5pt; color: #64748b; margin-top: 4px;">Tahun Akademik 2026/2027</div>
    </div>
  </div>

  <!-- Ringkasan Eksekutif & Daftar Isi -->
  <div class="toc">
    <strong style="color: #0f172a; font-size: 10pt;">DAFTAR ISI PENGUJIAN PER PERAN (ROLE-BASED TEST MATRIX)</strong>
    <ul>
      <li><strong>Bagian 1:</strong> Matriks Hak Akses & Akun Uji Coba Pengguna (Test Accounts)</li>
      <li><strong>Bagian 2:</strong> Test Case Role Super Administrator (<code>SUPER_ADMIN</code>) — TC-SA-01 s/d TC-SA-04</li>
      <li><strong>Bagian 3:</strong> Test Case Role Admin Program Studi (<code>DEPARTMENT_ADMIN</code>) — TC-DA-01 s/d TC-DA-03</li>
      <li><strong>Bagian 4:</strong> Test Case Role Dosen Pengampu (<code>INSTRUCTOR</code>) — TC-IN-01 s/d TC-IN-07</li>
      <li><strong>Bagian 5:</strong> Test Case Role Mahasiswa (<code>STUDENT</code>) — TC-ST-01 s/d TC-ST-05</li>
      <li><strong>Bagian 6:</strong> Test Case Role Rektorat & Pimpinan (<code>RECTOR</code>) — TC-RC-01 s/d TC-RC-02</li>
      <li><strong>Bagian 7:</strong> Test Case Lintas Fitur & Kualitas UI/UX Global (Asterisk Merah, Toast, Pagination, 100MB Upload)</li>
      <li><strong>Bagian 8:</strong> Format Standar Pelaporan Temuan Kendala (Bug Report Template)</li>
    </ul>
  </div>

  <div class="callout">
    💡 <strong>Prinsip Pengujian:</strong> Seluruh pengujian menggunakan metode <em>Role-Based Access Control (RBAC) Verification</em>. Setiap akun hanya boleh mengakses fitur dan data sesuai batas wewenangnya. Pengujian mencakup fitur-fitur pembaruan terkini: auto-generate key 6 huruf, preset bobot 30-35-35, auto-assign kuis & tugas, upload hingga 100MB, floating toast, dan responsivitas.
  </div>

  <!-- Bagian 1: Matriks Akun Uji Coba -->
  <h2>1. Matriks Pengguna Uji Coba (Test Accounts)</h2>
  <p>Gunakan kredensial akun uji coba berikut saat menjalankan pengujian di lingkungan lokal maupun staging:</p>
  <table>
    <thead>
      <tr>
        <th style="width: 18%;">Peran (Role)</th>
        <th style="width: 20%;">Username / NIM / NIDN</th>
        <th style="width: 22%;">Password Default</th>
        <th style="width: 40%;">Cakupan Wewenang Utama</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="tc-role-pill role-super-admin">SUPER_ADMIN</span></td>
        <td><code>admin</code></td>
        <td><code>AdminUAY2026!</code></td>
        <td>Skala nilai universitas, audit trail seluruh kampus, pengumuman darurat, kelola semua fakultas.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-dept-admin">DEPARTMENT_ADMIN</span></td>
        <td><code>admin.if</code></td>
        <td><code>AdminProdi2026!</code></td>
        <td>Kurikulum prodi Informatika, buat kelas, auto-key pendaftaran, plot dosen, audit prodi.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-instructor">INSTRUCTOR</span></td>
        <td><code>198501012010121001</code></td>
        <td><code>DosenUAY2026!</code></td>
        <td>Pertemuan, materi teks/PDF/video, bank soal & kuis, tugas & uji coba dosen, presensi, bobot nilai.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-student">STUDENT</span></td>
        <td><code>202401001</code></td>
        <td><code>MahasiswaUAY2026!</code></td>
        <td>Pendaftaran mandiri (key), presensi 1-klik/kode, pelacakan progres materi, submit tugas, pengerjaan kuis.</td>
      </tr>
      <tr>
        <td><span class="tc-role-pill role-rector">RECTOR</span></td>
        <td><code>rektor</code></td>
        <td><code>RektorUAY2026!</code></td>
        <td>Dashboard eksekutif read-only, analitik keaktifan dosen/mahasiswa, ekspor laporan rektorat.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Bagian 2: Test Case SUPER_ADMIN -->
  <h2>2. Test Case Super Administrator (SUPER_ADMIN)</h2>

  <!-- TC-SA-01 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-SA-01</span>
        <span class="tc-title">Autentikasi & Verifikasi Menu Super Administrator</span>
      </div>
      <span class="tc-role-pill role-super-admin">SUPER_ADMIN</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memastikan akun Super Admin dapat masuk dan mengakses modul tata kelola universitas.</div>
        <div class="tc-label">Prasyarat:</div>
        <div class="tc-value">Berada di halaman <code>/login</code> dengan kredensial Super Admin aktif.</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Masukkan username <code>admin</code> dan password pada form login.</li>
        <li>Klik tombol <strong>Masuk</strong>.</li>
        <li>Periksa navigasi utama di sidebar.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Login berhasil. Sidebar menampilkan menu: Beranda, Katalog Kelas, Program Studi, Pengguna, Pengumuman Kampus, Jejak Aktivitas (Audit Log), dan Skala Nilai Universitas.
      </div>
    </div>
  </div>

  <!-- TC-SA-02 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-SA-02</span>
        <span class="tc-title">Konfigurasi Batas Nilai Huruf Mutu & Posisi Tombol Kanan Modal</span>
      </div>
      <span class="tc-role-pill role-super-admin">SUPER_ADMIN</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memverifikasi Super Admin dapat mengedit bobot huruf mutu dan tombol modal tersusun rapi di kanan.</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka menu <strong>Skala Nilai Universitas</strong>.</li>
        <li>Klik tombol <strong>Tambah / Edit Skala Nilai</strong>.</li>
        <li>Perhatikan tata letak tombol pada footer modal: tombol <strong>Batal</strong> dan <strong>Simpan</strong> berada di sisi kanan modal.</li>
        <li>Ubah batas nilai minimum huruf mutu (misal: Nilai A batas bawah 85, A- batas bawah 80).</li>
        <li>Klik tombol <strong>Simpan Skala Nilai</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Tombol aksi berada di sisi kanan modal. Data skala nilai tersimpan sukses dan langsung menjadi acuan konversi nilai akhir di semua kelas.
      </div>
    </div>
  </div>

  <!-- TC-SA-03 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-SA-03</span>
        <span class="tc-title">Pemantauan Jejak Aktivitas (Audit Trail) & Pagination Rapi</span>
      </div>
      <span class="tc-role-pill role-super-admin">SUPER_ADMIN</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memastikan riwayat aktivitas terekam, filter bekerja cepat, dan pagination tidak menempel ke tepi container.</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka menu <strong>Jejak Aktivitas</strong>.</li>
        <li>Periksa kolom log: Waktu, Aktor, Modul, Aksi, IP Address, dan Detail.</li>
        <li>Terapkan filter modul: pilih modul <code>GRADEBOOK</code> atau <code>ATTENDANCE</code>.</li>
        <li>Terapkan filter pencarian nama aktor.</li>
        <li>Scroll ke bagian bawah tabel dan periksa komponen pagination.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Log tersaring akurat secara instan. Komponen pagination memiliki margin keliling yang proporsional dan tidak mentok ke sudut card.
      </div>
    </div>
  </div>

  <!-- TC-SA-04 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-SA-04</span>
        <span class="tc-title">Penerbitan Pengumuman Darurat Sistem</span>
      </div>
      <span class="tc-role-pill role-super-admin">SUPER_ADMIN</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka menu <strong>Pengumuman Sistem</strong> -> klik <strong>Buat Pengumuman Baru</strong>.</li>
        <li>Isi judul: *"Pemeliharaan Infrastruktur Server UAY"*, tingkat urgensi: *Penting*.</li>
        <li>Tulis isi pengumuman dan klik **Terbitkan**.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Banner pengumuman muncul di halaman beranda seluruh pengguna (dosen dan mahasiswa) secara real-time.
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Bagian 3: Test Case DEPARTMENT_ADMIN -->
  <h2>3. Test Case Admin Program Studi (DEPARTMENT_ADMIN)</h2>

  <!-- TC-DA-01 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-DA-01</span>
        <span class="tc-title">Tambah Kelas & Kunci Pendaftaran Mandiri Acak Otomatis (6 Huruf Kapital)</span>
      </div>
      <span class="tc-role-pill role-dept-admin">DEPARTMENT_ADMIN</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memverifikasi pembentukan kelas baru secara default menghasilkan enrollment key 6 huruf kapital acak dengan tombol regenerasi.</div>
        <div class="tc-label">Prasyarat:</div>
        <div class="tc-value">Login sebagai Admin Prodi (<code>admin.if</code>).</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka menu <strong>Manajemen Kelas</strong> -> klik tombol <strong>Tambah Kelas</strong>.</li>
        <li>Periksa kolom <strong>Kunci Pendaftaran (Enrollment Key)</strong>: perhatikan nilai default yang otomatis terisi.</li>
        <li>Pastikan nilai default terdiri tepat 6 huruf kapital (misal: <code>KXZRTY</code>).</li>
        <li>Klik tombol <strong>Acak Ulang</strong> di samping kolom kunci: perhatikan apakah nilai berubah menjadi 6 huruf kapital baru.</li>
        <li>Pilih Mata Kuliah, isi Nama Kelas, Tahun Akademik, dan pilih minimal 1 Dosen Pengampu.</li>
        <li>Klik tombol <strong>Simpan</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Kunci otomatis terisi 6 huruf kapital acak, tombol Acak Ulang menghasilkan variasi baru, dan kelas baru berhasil disimpan.
      </div>
    </div>
  </div>

  <!-- TC-DA-02 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-DA-02</span>
        <span class="tc-title">Isolasi Hak Kelola & Audit Trail Program Studi</span>
      </div>
      <span class="tc-role-pill role-dept-admin">DEPARTMENT_ADMIN</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka menu <strong>Jejak Aktivitas Program Studi</strong>.</li>
        <li>Periksa data riwayat aktivitas dosen dan kelas yang tampil.</li>
        <li>Pastikan tidak ada aktivitas dari program studi lain yang muncul.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Terjadi isolasi ketat data antar prodi; hanya aktivitas dalam naungan Program Studi Informatika yang dapat diakses.
      </div>
    </div>
  </div>

  <!-- TC-DA-03 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-DA-03</span>
        <span class="tc-title">Manajemen Dosen Pengampu & Status Publikasi Kelas</span>
      </div>
      <span class="tc-role-pill role-dept-admin">DEPARTMENT_ADMIN</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka detail kelas perkuliahan.</li>
        <li>Buka tab <strong>Peserta</strong> -> tambahkan dosen pengampu kedua (*Team Teaching*).</li>
        <li>Ubah status kelas dari <strong>DRAFT</strong> menjadi <strong>PUBLISHED</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Dosen pengampu tambahan berhasil terplot dan status kelas berubah menjadi aktif untuk proses pembelajaran.
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Bagian 4: Test Case INSTRUCTOR -->
  <h2>4. Test Case Dosen Pengampu (INSTRUCTOR)</h2>

  <!-- TC-IN-01 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-IN-01</span>
        <span class="tc-title">Pembuatan Pertemuan: Tombol Atas & Tombol Tengah di Bawah Section</span>
      </div>
      <span class="tc-role-pill role-instructor">INSTRUCTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memverifikasi penambahan section perkuliahan dapat dilakukan dari tombol toolbar atas maupun tombol tengah di bagian bawah list.</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Login sebagai Dosen Pengampu (<code>198501012010121001</code>) dan buka kelas yang diampu.</li>
        <li>Periksa keberadaan tombol <strong>+ Tambah Pertemuan</strong> di kanan atas toolbar.</li>
        <li>Scroll ke bagian paling bawah dari daftar pertemuan yang sudah ada.</li>
        <li>Perhatikan tombol <strong>+ Tambah Pertemuan</strong> yang berada tepat di tengah (centered) di bawah section terakhir.</li>
        <li>Klik tombol di bagian bawah tengah tersebut.</li>
        <li>Isi Judul Pertemuan: *"Pertemuan 06: Pemrograman Dinamis"*, pilih tipe Tatap Muka, klik **Terbitkan**.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Modal terbuka dengan mulus dari tombol bawah tengah dan pertemuan baru berhasil diterbitkan di urutan paling akhir.
      </div>
    </div>
  </div>

  <!-- TC-IN-02 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-IN-02</span>
        <span class="tc-title">Tambah & Edit Materi: Tipe di Atas Judul, Tampilan File Lama & Unggah 100MB</span>
      </div>
      <span class="tc-role-pill role-instructor">INSTRUCTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Pada pertemuan kelas, klik tombol <strong>+ Materi</strong>.</li>
        <li>Perhatikan tata letak form editor materi:
          kolom pilihan <strong>Tipe Materi</strong> terletak di baris tersendiri di <strong>ATAS</strong> kolom <strong>Judul Materi</strong>.
        </li>
        <li>Pilih Tipe: <strong>Dokumen PDF</strong>.</li>
        <li>Masukkan Judul: *"Bahan Ajar Pertemuan 06"*.</li>
        <li>Unggah file PDF ukuran > 1.2 MB (misal 5 MB).</li>
        <li>Simpan materi pembelajaran.</li>
        <li>Klik tombol <strong>Edit</strong> pada materi yang baru disimpan tersebut.</li>
        <li>Periksa area berkas: kartu file lama tampil dengan nama berkas, badge hijau *"Berhasil diunggah"*, dan tombol *"Ganti berkas"*.</li>
        <li>Periksa padding modal: jarak atas di bawah header dan jarak bawah sebelum tombol aksi terlihat seimbang dan rapi.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Tipe materi berada di atas judul, upload file besar lolos tanpa galat ukuran body server, dan kartu file lama muncul saat edit.
      </div>
    </div>
  </div>

  <!-- TC-IN-03 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-IN-03</span>
        <span class="tc-title">Materi Teks (Rich Text Editor) & Lampiran Berkas Aman</span>
      </div>
      <span class="tc-role-pill role-instructor">INSTRUCTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buat materi baru bertipe <strong>Materi Teks</strong>.</li>
        <li>Tulis artikel dengan berbagai blok (Heading, Paragraf, Cuplikan Kode, Rumus LaTeX).</li>
        <li>Tambahkan blok <strong>Lampiran Berkas</strong> dan unggah file pelengkap (misal ZIP kode program).</li>
        <li>Beralih ke mode <strong>Pratinjau</strong> dan mode <strong>Berdampingan</strong>.</li>
        <li>Klik tombol <strong>Simpan Perubahan</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Pengunggahan lampiran berkas berhasil dengan kredensial XHR valid (tidak muncul pesan galat koneksi), dan artikel tersimpan utuh.
      </div>
    </div>
  </div>

  <!-- TC-IN-04 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-IN-04</span>
        <span class="tc-title">Tugas Perkuliahan & Mode Uji Coba Pengumpulan Berkas Dosen</span>
      </div>
      <span class="tc-role-pill role-instructor">INSTRUCTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memverifikasi dosen dapat membuat penugasan dan menguji coba pengumpulan berkas tugas tanpa terblokir hak akses mahasiswa.</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Klik tombol <strong>+ Tugas</strong> pada pertemuan.</li>
        <li>Isi Judul: *"Tugas Praktikum Struktur Data"*, deskripsi, batas waktu, dan pilih format berkas <code>PDF, ZIP</code>.</li>
        <li>Simpan tugas dan buka halaman detail tugas tersebut.</li>
        <li>Perhatikan bagian sebelum riwayat pengumpulan: terdapat kartu <strong>"Uji Coba Pengumpulan Tugas (Dosen Pengampu)"</strong> dengan garis border biru bertitik.</li>
        <li>Dosen mengunggah file uji coba (<code>Jawaban_Simulasi_Dosen.pdf</code>) dan menulis catatan.</li>
        <li>Klik tombol <strong>Kirim Uji Coba Pengumpulan</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Unggahan dan pengiriman berkas tugas oleh dosen berhasil tanpa error <code>403 STUDENT_REQUIRED</code>, serta muncul di daftar untuk verifikasi alur penilaian.
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- TC-IN-05 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-IN-05</span>
        <span class="tc-title">Kuis & Kunci Jawaban Ramah Pengguna (Non-JSON)</span>
      </div>
      <span class="tc-role-pill role-instructor">INSTRUCTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Klik <strong>+ Kuis</strong> -> buat butir soal Pilihan Ganda dan Pilihan Jamak.</li>
        <li>Tentukan opsi jawaban yang benar.</li>
        <li>Simpan kuis lalu buka detail soal atau bank soal kelas.</li>
        <li>Periksa area <strong>Kunci Jawaban</strong> pada butir soal.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Kunci jawaban ditampilkan dalam bentuk badge pilihan yang jelas (misal: *Opsi B: Hypertext Transfer Protocol*), bukan format JSON mentah <code>{"correct": ["b"]}</code>.
      </div>
    </div>
  </div>

  <!-- TC-IN-06 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-IN-06</span>
        <span class="tc-title">Presensi Kelas: Konsistensi Layout, Sesi Kode Proyektor & Sesi 1-Klik</span>
      </div>
      <span class="tc-role-pill role-instructor">INSTRUCTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka tab <strong>Presensi</strong> pada kelas.</li>
        <li>Periksa tata letak tab presensi: memenuhi lebar kontainer standar (tidak mengecil kaku ke 1040px) dan memiliki header standar <code>.section-heading</code>.</li>
        <li>Klik tombol <strong>Buat Sesi Presensi</strong>.</li>
        <li>Uji Skenario 1 (Sesi Kode): Aktifkan verifikasi kode -> kode 6 karakter acak besar tampil untuk layar proyektor.</li>
        <li>Uji Skenario 2 (Sesi 1-Klik): Nonaktifkan kode -> mahasiswa dapat langsung klik hadir tanpa kode.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Tata letak presensi proporsional dan selaras dengan tab lain, sesi presensi berjalan dengan countdown aktif.
      </div>
    </div>
  </div>

  <!-- TC-IN-07 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-IN-07</span>
        <span class="tc-title">Pembobotan Nilai Akhir: Template 30-35-35, Presets & Auto-Assign</span>
      </div>
      <span class="tc-role-pill role-instructor">INSTRUCTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memverifikasi template default pembobotan (30% Tugas & Kuis, 35% UTS, 35% UAS), ketersediaan tombol preset, dan auto-assign instan.</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka tab <strong>Buku Nilai (Gradebook)</strong> pada kelas.</li>
        <li>Klik menu <strong>Pengaturan Nilai</strong> -> <strong>Bobot Kategori Penilaian</strong>.</li>
        <li>Periksa konfigurasi awal:
          Kategori <strong>Tugas</strong> berbobot <strong>30%</strong> (auto-assign seluruh tugas & kuis aktif),
          Kategori <strong>UTS</strong> berbobot <strong>35%</strong>,
          Kategori <strong>UAS</strong> berbobot <strong>35%</strong> (Total 100%).
        </li>
        <li>Uji tombol Preset di bagian atas: klik <em>"Tugas & Kuis Terpisah"</em> (20% Tugas, 10% Kuis, 35% UTS, 35% UAS), lalu klik kembali <em>"Standar UAY"</em>.</li>
        <li>Klik tombol <strong>Jalankan Auto-Assign Sekarang</strong>.</li>
        <li>Klik tombol <strong>Simpan Bobot</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Template default 30-35-35 diterapkan, preset berganti mulus dengan validasi total 100%, dan seluruh tugas & kuis otomatis teralokasi ke kategori penilaian akhir.
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Bagian 5: Test Case STUDENT -->
  <h2>5. Test Case Mahasiswa (STUDENT)</h2>

  <!-- TC-ST-01 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-ST-01</span>
        <span class="tc-title">Pendaftaran Mandiri Kelas dengan Enrollment Key</span>
      </div>
      <span class="tc-role-pill role-student">STUDENT</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Login sebagai Mahasiswa (<code>202401001</code>).</li>
        <li>Klik tombol <strong>Gabung Kelas</strong> di beranda.</li>
        <li>Pilih kelas yang membuka pendaftaran mandiri atau masukkan ID kelas.</li>
        <li>Masukkan Kunci Pendaftaran 6 karakter yang diberikan dosen (misal: <code>KXZRTY</code>).</li>
        <li>Klik <strong>Gabung ke Kelas</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Pendaftaran berhasil, mahasiswa langsung masuk ke dalam kelas dan status peserta aktif.
      </div>
    </div>
  </div>

  <!-- TC-ST-02 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-ST-02</span>
        <span class="tc-title">Pengisian Presensi Mandiri (Verifikasi Kode & 1-Klik)</span>
      </div>
      <span class="tc-role-pill role-student">STUDENT</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka tab <strong>Presensi</strong> saat dosen membuka sesi.</li>
        <li>Amati banner presensi aktif:
          - Jika sesi kode: klik <strong>Isi Presensi</strong>, ketik 6 karakter kode proyektor, klik kirim.
          - Jika sesi 1-klik: klik tombol <strong>Konfirmasi Hadir (1-Klik)</strong>.
        </li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Status presensi mahasiswa tercatat <strong>HADIR</strong> lengkap dengan waktu presensi.
      </div>
    </div>
  </div>

  <!-- TC-ST-03 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-ST-03</span>
        <span class="tc-title">Perekaman Progres Belajar: Dokumen PDF & Video Pembelajaran</span>
      </div>
      <span class="tc-role-pill role-student">STUDENT</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka materi Dokumen PDF: baca dan navigasi hingga halaman terakhir.</li>
        <li>Buka materi Video Pembelajaran: putar video hingga mencapai ambang batas minimum tonton (85%).</li>
        <li>Kembali ke halaman daftar pertemuan kelas.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Indikator centang hijau selesai (*Completed*) aktif pada materi yang telah dituntaskan, dan persentase progres kelas bertambah secara adil dan akurat.
      </div>
    </div>
  </div>

  <!-- TC-ST-04 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-ST-04</span>
        <span class="tc-title">Pengumpulan Berkas Tugas & Revisi (Pengumpulan Ulang)</span>
      </div>
      <span class="tc-role-pill role-student">STUDENT</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka tugas yang diberikan dosen.</li>
        <li>Unggah file tugas (<code>Jawaban_Tugas_1.pdf</code>) dan klik <strong>Kumpulkan Tugas</strong>.</li>
        <li>Periksa tampilan kartu berkas terunggah: tampil nama file dan ukuran.</li>
        <li>Sebelum batas waktu berakhir, lakukan pengumpulan ulang: unggah file revisi dan klik <strong>Kumpulkan Ulang (Versi 2)</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Sistem mencatat riwayat versi pengumpulan tugas dan versi terbaru menjadi berkas final untuk dinilai dosen.
      </div>
    </div>
  </div>

  <!-- TC-ST-05 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-ST-05</span>
        <span class="tc-title">Pengerjaan Kuis Interaktif & Pengiriman Jawaban</span>
      </div>
      <span class="tc-role-pill role-student">STUDENT</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka kuis -> klik <strong>Mulai Kuis</strong>.</li>
        <li>Jawab butir soal, tandai nomor soal jika ragu-ragu.</li>
        <li>Setelah semua soal terjawab, klik <strong>Kumpulkan Jawaban Kuis</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Jawaban terkumpul dengan aman dan hasil skor objektif langsung ditampilkan jika diizinkan oleh dosen.
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Bagian 6: Test Case RECTOR -->
  <h2>6. Test Case Rektorat & Pimpinan (RECTOR)</h2>

  <!-- TC-RC-01 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-RC-01</span>
        <span class="tc-title">Akses Dashboard Eksekutif Universitas (Read-Only)</span>
      </div>
      <span class="tc-role-pill role-rector">RECTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-grid">
        <div class="tc-label">Tujuan:</div>
        <div class="tc-value">Memverifikasi pimpinan universitas dapat memantau indikator kinerja akademik secara read-only tanpa hak manipulasi data.</div>
      </div>
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Login dengan akun <code>rektor</code>.</li>
        <li>Amati ringkasan indikator: Total Mahasiswa, Total Dosen Mengajar, Total Kelas Berjalan, Rata-rata Kehadiran Mahasiswa, dan Kelengkapan Nilai Akhir.</li>
        <li>Buka salah satu kelas perkuliahan.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Dashboard menyajikan statistik analitik data riil (*live data*) dan seluruh kontrol bersifat read-only (tidak ada tombol ubah nilai, hapus konten, dll).
      </div>
    </div>
  </div>

  <!-- TC-RC-02 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-RC-02</span>
        <span class="tc-title">Pemantauan Keaktifan Perkuliahan & Ekspor Laporan Eksekutif</span>
      </div>
      <span class="tc-role-pill role-rector">RECTOR</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka tab <strong>Keaktifan Perkuliahan</strong>.</li>
        <li>Pilih filter Fakultas Sains dan Teknologi -> Program Studi Informatika.</li>
        <li>Amati grafik distribusi perkuliahan dan presensi.</li>
        <li>Klik tombol <strong>Ekspor Rekapitulasi Eksekutif (Excel)</strong>.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Laporan eksekutif berhasil diunduh dengan struktur kolom lengkap untuk kebutuhan evaluasi pimpinan.
      </div>
    </div>
  </div>

  <!-- Bagian 7: UI/UX & Quality Global -->
  <h2>7. Test Case Lintas Fitur & Kualitas UI/UX Global</h2>

  <!-- TC-UX-01 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-UX-01</span>
        <span class="tc-title">Tanda Bintang Merah pada Kolom Formulir Wajib Diisi (Required Asterisk)</span>
      </div>
      <span class="tc-role-pill role-global">GLOBAL UI</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka formulir Tambah Kelas, Tambah Pertemuan, Tambah Materi, atau Tambah Tugas.</li>
        <li>Perhatikan label input yang memiliki kolom wajib (misal: <em>Nama Kelas *</em>, <em>Judul Materi *</em>).</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Teks label berwarna hitam/gelap standar tema, sedangkan karakter asteris <code>*</code> secara spesifik berwarna merah terang (<code>#ef4444</code>).
      </div>
    </div>
  </div>

  <!-- TC-UX-02 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-UX-02</span>
        <span class="tc-title">Notifikasi Validasi Floating Toast Kanan Atas (Anti-Clutter Modal)</span>
      </div>
      <span class="tc-role-pill role-global">GLOBAL UI</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka modal Tambah Pertemuan atau Tambah Materi.</li>
        <li>Biarkan kolom wajib kosong lalu klik Simpan.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Peringatan muncul sebagai floating toast melayang di sudut kanan atas layar. Tidak ada kotak merah besar yang menggeser isi modal dan tidak ada tulisan artifact <em>"Waktu tidak tersedia"</em>.
      </div>
    </div>
  </div>

  <!-- TC-UX-03 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-UX-03</span>
        <span class="tc-title">Kerapian Margin Komponen Pagination di Seluruh Tabel</span>
      </div>
      <span class="tc-role-pill role-global">GLOBAL UI</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Buka tabel Jejak Aktivitas, Buku Nilai, atau Peserta Kelas yang memiliki lebih dari 25 baris.</li>
        <li>Periksa posisi kontrol pagination di bawah tabel data.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Pagination memiliki margin dan padding keliling yang estetis, tidak menempel ke sudut bawah container kartu.
      </div>
    </div>
  </div>

  <!-- TC-UX-04 -->
  <div class="tc-card">
    <div class="tc-header">
      <div>
        <span class="tc-id">TC-UX-04</span>
        <span class="tc-title">Kapasitas Unggah Berkas 100MB di Server & Nginx</span>
      </div>
      <span class="tc-role-pill role-global">GLOBAL SYSTEM</span>
    </div>
    <div class="tc-body">
      <div class="tc-label">Langkah-Langkah:</div>
      <ol class="steps-list">
        <li>Unggah file dokumen materi atau arsip tugas berukuran 5MB s/d 50MB.</li>
      </ol>
      <div class="expected-box">
        <strong>Hasil yang Diharapkan:</strong> Berkas berhasil diunggah dengan status 200/201 tanpa penolakan HTTP 413 (*Payload Too Large*) dari Nginx.
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- Bagian 8: Format Bug Report -->
  <h2>8. Format Standar Pelaporan Temuan Kendala (Bug Report)</h2>
  <p>Apabila ditemukan anomali atau ketidaksesuaian saat pengujian, dokumentasikan menggunakan format berikut:</p>

  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; font-family: monospace; font-size: 8.5pt;">
    <strong>### [BUG-ID] Ringkasan Kendala yang Ditemukan</strong><br><br>
    - <strong>ID Test Case:</strong> TC-IN-02 / TC-SA-01 / dll<br>
    - <strong>Peran Penguji:</strong> INSTRUCTOR / STUDENT / SUPER_ADMIN<br>
    - <strong>Perangkat / Browser:</strong> Windows 11 Chrome 124 / iOS Safari 17<br>
    - <strong>Langkah Reproduksi:</strong><br>
    &nbsp;&nbsp;1. Buka halaman ...<br>
    &nbsp;&nbsp;2. Klik tombol ...<br>
    &nbsp;&nbsp;3. Masukkan input ...<br>
    - <strong>Hasil Aktual:</strong> (Jelaskan pesan galat atau anomali visual)<br>
    - <strong>Hasil yang Diharapkan:</strong> (Sesuai panduan dokumen pengujian ini)<br>
    - <strong>Lampiran Bukti:</strong> (Screenshot / file tangkapan layar)
  </div>

  <footer>
    Dokumen Spesifikasi Pengujian Resmi • Universitas Al-Amin Yogyakarta (UAY) • Sistem E-Learning UAY 2026/2027
  </footer>

</body>
</html>
`;

writeFileSync(tempHtmlPath, htmlContent, "utf8");
console.log("HTML template written to temp_test_cases.html");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browserExe = existsSync(chromePath) ? chromePath : edgePath;

console.log("Using browser binary:", browserExe);

const cmd = `"${browserExe}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "${tempHtmlPath}"`;
console.log("Running PDF conversion...");
execSync(cmd, { stdio: "inherit" });

if (existsSync(outputPdfPath)) {
  console.log("PDF generated successfully at:", outputPdfPath);
  if (!existsSync(artifactDir)) {
    mkdirSync(artifactDir, { recursive: true });
  }
  copyFileSync(outputPdfPath, artifactPdfPath);
  console.log("PDF copied to artifacts at:", artifactPdfPath);
} else {
  console.error("PDF generation failed!");
  process.exit(1);
}
