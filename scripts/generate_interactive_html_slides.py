# -*- coding: utf-8 -*-
"""
Generate highly interactive HTML presentation slide deck:
SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html
Equipped with live interactive simulators:
1. Live Attendance Projector & Student Check-in Simulator
2. Live Gradebook & Letter Grade Calculator (Preset 2026.1)
3. Live 4-Role Permission & Dashboard Explorer
4. Live 75% Exam Eligibility Compliance Meter
5. Live Quiz Evaluation Sandbox
Plus keyboard controls, fullscreen, slide jump menu, presenter notes, audio feedback, and role filters.
"""
from pathlib import Path
import shutil

ROOT = Path(r"E:\UVAYA\Project\E - Learning UAY")
DOCS_DIR = ROOT / "docs"
PROJECT_ROOT = Path(r"E:\UVAYA\Project")
PANDUAN_DIR = PROJECT_ROOT / "Panduan"
OUT_HTML = DOCS_DIR / "SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html"

HTML_TEMPLATE = r'''<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sosialisasi & Panduan E-Learning UAY · Interactive Slide Deck</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #15803d;
      --primary-light: #22c55e;
      --primary-dark: #166534;
      --primary-soft: rgba(34, 197, 94, 0.12);
      --accent: #0284c7;
      --accent-soft: rgba(2, 132, 199, 0.12);
      --amber: #d97706;
      --amber-soft: rgba(217, 119, 6, 0.12);
      --danger: #dc2626;
      --danger-soft: rgba(220, 38, 38, 0.12);
      --purple: #9333ea;
      --purple-soft: rgba(147, 51, 234, 0.12);
      
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-inner: #0f172a;
      --border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }

    [data-theme="light"] {
      --bg: #f1f5f9;
      --card-bg: #ffffff;
      --card-inner: #f8fafc;
      --border: #cbd5e1;
      --text-main: #0f172a;
      --text-muted: #64748b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text-main);
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
      user-select: none;
      transition: background 0.3s ease, color 0.3s ease;
    }

    /* Top Navigation Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 28px;
      border-bottom: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      z-index: 50;
    }
    [data-theme="light"] header {
      background: rgba(255, 255, 255, 0.9);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-mark {
      background: var(--primary-dark);
      color: #86efac;
      font-weight: 800;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .brand-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
    }
    .role-pills {
      display: flex;
      gap: 6px;
    }
    .role-pill {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .role-pill:hover, .role-pill.active {
      background: var(--primary);
      border-color: var(--primary-light);
      color: white;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn {
      background: var(--card-bg);
      border: 1px solid var(--border);
      color: var(--text-main);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #334155;
      border-color: #64748b;
    }
    [data-theme="light"] .btn:hover {
      background: #e2e8f0;
    }
    .btn-primary {
      background: var(--primary);
      border-color: var(--primary-light);
      color: white;
    }
    .btn-primary:hover {
      background: var(--primary-dark);
    }

    /* Progress bar */
    .progress-bar-container {
      width: 100%;
      height: 4px;
      background: rgba(51, 65, 85, 0.4);
      position: relative;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--primary-light));
      width: 0%;
      transition: width 0.3s ease;
    }

    /* Main Stage */
    main {
      flex: 1;
      display: flex;
      position: relative;
      overflow: hidden;
      padding: 24px 36px;
    }
    .slide-viewport {
      flex: 1;
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .slide {
      position: absolute;
      width: 100%;
      max-width: 1280px;
      height: 100%;
      max-height: 720px;
      opacity: 0;
      pointer-events: none;
      transform: translateY(16px) scale(0.98);
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .slide.active {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    /* Slide Typography */
    .slide-header {
      margin-bottom: 20px;
    }
    .slide-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 8px;
    }
    .badge-green { background: var(--primary-soft); color: var(--primary-light); border: 1px solid var(--primary); }
    .badge-blue { background: var(--accent-soft); color: #38bdf8; border: 1px solid var(--accent); }
    .badge-amber { background: var(--amber-soft); color: #fbbf24; border: 1px solid var(--amber); }
    .badge-purple { background: var(--purple-soft); color: #c084fc; border: 1px solid var(--purple); }
    .badge-danger { background: var(--danger-soft); color: #f87171; border: 1px solid var(--danger); }

    .slide-title {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.2;
      color: var(--text-main);
    }
    .slide-desc {
      font-size: 15px;
      color: var(--text-muted);
      margin-top: 6px;
    }

    /* Grid Layouts */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex: 1; min-height: 0; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; flex: 1; min-height: 0; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; flex: 1; min-height: 0; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    .card-top-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
    }
    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .card ul li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.4;
    }
    .card ul li::before {
      content: "•";
      color: var(--primary-light);
      font-weight: bold;
      font-size: 16px;
      line-height: 1;
    }

    /* Simulator 1: Presensi Layar Proyektor & Check-in */
    .presensi-sim-box {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 20px;
      flex: 1;
      min-height: 0;
    }
    .projector-screen {
      background: #020617;
      border: 2px solid #1e293b;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      position: relative;
      box-shadow: inset 0 0 40px rgba(34, 197, 94, 0.1);
    }
    .projector-badge {
      background: #14532d;
      color: #86efac;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    .big-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 52px;
      font-weight: 800;
      letter-spacing: 0.15em;
      color: #22c55e;
      text-shadow: 0 0 24px rgba(34, 197, 94, 0.4);
      margin: 10px 0;
      background: rgba(34, 197, 94, 0.08);
      padding: 8px 24px;
      border-radius: 12px;
      border: 1px dashed rgba(34, 197, 94, 0.4);
    }
    .phone-simulator {
      background: #090d16;
      border: 2px solid var(--border);
      border-radius: 20px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .phone-header {
      font-size: 13px;
      font-weight: 700;
      color: #cbd5e1;
      border-bottom: 1px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
    }
    .sim-input {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      text-align: center;
      letter-spacing: 0.2em;
      background: #1e293b;
      border: 2px solid #475569;
      color: white;
      border-radius: 10px;
      padding: 10px;
      width: 100%;
      outline: none;
      transition: border-color 0.2s;
    }
    .sim-input:focus {
      border-color: var(--primary-light);
    }

    /* Simulator 2: Gradebook Calculator */
    .calc-grid {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
      flex: 1;
      min-height: 0;
    }
    .slider-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }
    .slider-label {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
    }
    .slider-input {
      width: 100%;
      accent-color: var(--primary-light);
      cursor: pointer;
    }
    .calc-result-card {
      background: #020617;
      border: 2px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .calc-grade-letter {
      font-size: 72px;
      font-weight: 900;
      color: #22c55e;
      line-height: 1;
      text-shadow: 0 0 30px rgba(34, 197, 94, 0.4);
    }

    /* Simulator 3: 4-Role Explorer */
    .role-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .role-tab-btn {
      flex: 1;
      padding: 10px 14px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text-muted);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .role-tab-btn.active {
      background: var(--primary);
      border-color: var(--primary-light);
      color: white;
    }
    .role-content-view {
      background: var(--card-inner);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 22px;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Footer & Navigation Controls */
    footer {
      padding: 12px 28px;
      border-top: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.9);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: var(--text-muted);
    }
    [data-theme="light"] footer {
      background: rgba(255, 255, 255, 0.9);
    }
    .nav-buttons {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .slide-counter {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    /* Presenter Notes Drawer */
    #notes-drawer {
      position: fixed;
      bottom: 50px;
      right: 28px;
      width: 360px;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 100;
      display: none;
      animation: slideUp 0.2s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    #notes-drawer h4 {
      font-size: 13px;
      color: var(--amber);
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    #notes-content {
      font-size: 12px;
      color: #cbd5e1;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <div class="brand">
      <span class="brand-mark">UAY</span>
      <span class="brand-title">E-Learning UAY · Sosialisasi Terpadu</span>
    </div>
    
    <div class="role-pills">
      <button class="role-pill active" onclick="jumpToCategory('all')">Semua Slide</button>
      <button class="role-pill" onclick="jumpToCategory('super')">Super Admin</button>
      <button class="role-pill" onclick="jumpToCategory('prodi')">Admin Prodi</button>
      <button class="role-pill" onclick="jumpToCategory('dosen')">Dosen</button>
      <button class="role-pill" onclick="jumpToCategory('mhs')">Mahasiswa</button>
      <button class="role-pill" onclick="jumpToCategory('regulasi')">Regulasi 75%</button>
    </div>

    <div class="controls">
      <button class="btn" onclick="toggleAudio()" id="audio-btn" title="Toggle Suara">🔊 Suara: ON</button>
      <button class="btn" onclick="toggleTheme()" title="Ubah Tema (T)">🌓 Tema</button>
      <button class="btn" onclick="toggleNotes()" title="Catatan Pembicara (N)">📝 Catatan</button>
      <button class="btn btn-primary" onclick="toggleFullscreen()" title="Layar Penuh (F)">⛶ Layar Penuh</button>
    </div>
  </header>

  <!-- Progress Bar -->
  <div class="progress-bar-container">
    <div class="progress-bar-fill" id="progress-fill"></div>
  </div>

  <!-- Main Slide Viewport -->
  <main>
    <div class="slide-viewport" id="viewport">

      <!-- SLIDE 1: COVER -->
      <div class="slide active" data-category="all" data-note="Buka dengan menyapa audiens dari seluruh pimpinan, dosen, dan staf prodi. Jelaskan bahwa ini adalah sosialisasi resmi platform terpadu UAY 2026/2027.">
        <div class="slide-header">
          <span class="slide-badge badge-green">UNIVERSITAS ACHMAD YANI BANJARMASIN</span>
          <h1 class="slide-title">SOSIALISASI RESMI & PANDUAN PENGGUNAAN<br><span style="color:var(--primary-light)">E-LEARNING TERPADU UAY</span></h1>
          <p class="slide-desc">Pedoman Operasional Lengkap Berbasis Peran: Super Administrator · Admin Program Studi · Dosen · Mahasiswa</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary-light)"></div>
            <div class="card-title">🔐 Satu Akun Kampus (SSO)</div>
            <ul>
              <li>Satu Akun Resmi Kampus Terpadu</li>
              <li>Praktis & Aman tanpa sandi baru</li>
              <li>Dukungan Autentikasi Dua Faktor (MFA)</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">📊 Presensi Proyektor & Roster</div>
            <ul>
              <li>Presensi mandiri kode 6-digit & QR Code</li>
              <li>Koreksi roster manual & dispensasi surat</li>
              <li>Otomatisasi ambang batas kelayakan ujian 75%</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">📈 Dashboard Rektor Live</div>
            <ul>
              <li>Bridging telemetri eksekutif universitas</li>
              <li>Monitoring mutu 4 fakultas & 12 prodi</li>
              <li>Kalkulasi Gradebook otomatis UAY 2026.1</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 2: 4-ROLE EXPLORER (INTERAKTIF) -->
      <div class="slide" data-category="all" data-note="Gunakan tab interaktif untuk mendemonstrasikan bahwa setiap peran memiliki batasan hak akses yang tegas (RBAC).">
        <div class="slide-header">
          <span class="slide-badge badge-blue">FITUR INTERAKTIF · ROLE-BASED ACCESS CONTROL</span>
          <h2 class="slide-title">Eksplorasi Hak Akses & Tanggung Jawab Peran</h2>
          <p class="slide-desc">Klik peran di bawah untuk melihat cakupan kewenangan, ruang lingkup, dan fitur utama masing-masing pengguna.</p>
        </div>
        <div class="role-tabs">
          <button class="role-tab-btn active" onclick="selectRoleTab('super')">1. Super Administrator</button>
          <button class="role-tab-btn" onclick="selectRoleTab('prodi')">2. Admin Program Studi</button>
          <button class="role-tab-btn" onclick="selectRoleTab('dosen')">3. Dosen Pengampu</button>
          <button class="role-tab-btn" onclick="selectRoleTab('mhs')">4. Mahasiswa</button>
        </div>
        <div class="role-content-view" id="role-display-box">
          <!-- Dynamic by JS -->
        </div>
      </div>

      <!-- SLIDE 3: SSO FLOW -->
      <div class="slide" data-category="all" data-note="Jelaskan bahwa seluruh pengguna cukup menggunakan akun resmi kampus UAY tanpa perlu membuat akun baru.">
        <div class="slide-header">
          <span class="slide-badge badge-green">AUTENTIKASI TERPADU</span>
          <h2 class="slide-title">Alur Masuk Praktis: Satu Akun Kampus (SSO UAY)</h2>
          <p class="slide-desc">Menjamin kemudahan dan keamanan dengan satu akun resmi kampus universitas.</p>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary)"></div>
            <div class="card-title">Langkah Masuk (Semua Pengguna)</div>
            <ul>
              <li><strong>1. Akses Portal:</strong> Buka <code>https://e-learning.uay.ac.id</code></li>
              <li><strong>2. Klik Masuk Akun Kampus:</strong> Tombol hijau di beranda portal</li>
              <li><strong>3. Masukkan Data Akun:</strong> Gunakan NIM (Mahasiswa) atau Email Kampus (Dosen/Staf)</li>
              <li><strong>4. Verifikasi Keamanan:</strong> Masukkan kode jika diminta</li>
              <li><strong>5. Otomatis ke Dashboard:</strong> Sesi aktif secara aman sesuai peran Anda</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">Keamanan & Panduan Penting</div>
            <ul>
              <li><strong>Satu Akun Kampus:</strong> Cukup gunakan NIM atau email resmi kampus untuk semua layanan.</li>
              <li><strong>Logout Bersih:</strong> Selalu klik 'Keluar' pada komputer laboratorium/bersama.</li>
              <li><strong>Lupa Password:</strong> Klik tautan 'Lupa Kata Sandi' atau hubungi Tim TIK UAY.</li>
              <li><strong>Keamanan Berlapis:</strong> Seluruh aktivitas perkuliahan tercatat secara aman dan akuntabel.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 4: SUPER ADMIN - GOVERNANCE -->
      <div class="slide" data-category="super" data-note="Soroti Academic Governance Modal: Super Admin dapat memilih tahun ajaran aktif dan standar bobot nilai mutu institusi.">
        <div class="slide-header">
          <span class="slide-badge badge-purple">SUPER ADMINISTRATOR</span>
          <h2 class="slide-title">Tata Kelola Akademik Global & Tahun Ajaran</h2>
          <p class="slide-desc">Konfigurasi universal tingkat universitas melalui jendela Academic Governance Modal.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-top-bar" style="background:var(--purple)"></div>
            <div class="card-title">Universal Scope</div>
            <ul>
              <li>Akses tak terbatas lintas 4 fakultas & 12 prodi</li>
              <li>Pencarian master pengguna se-universitas</li>
              <li>Pengawasan status aktif / disabled akun</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary-light)"></div>
            <div class="card-title">Tahun Ajaran & Semester</div>
            <ul>
              <li>Penetapan periode aktif (2026/2027 Ganjil)</li>
              <li>Pengaturan daftar semester saat buat kelas</li>
              <li>Penguncian semester masa lalu untuk arsip</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">Preset Skala Nilai Mutu</div>
            <ul>
              <li>Standar Akademik UAY 2026/2027 aktif</li>
              <li>Skala terstandar: A (85), A- (80), B+ (75)...</li>
              <li>Seragam di seluruh Gradebook kelas</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 5: DASHBOARD REKTOR BRIDGE -->
      <div class="slide" data-category="super" data-note="Jelaskan bahwa pimpinan kampus (Rektor) dapat melihat keaktifan kuliah secara waktu nyata tanpa harus membuka kelas satu per satu.">
        <div class="slide-header">
          <span class="slide-badge badge-purple">INTEGRASI EKSEKUTIF</span>
          <h2 class="slide-title">Pemantauan Real-Time di Dashboard Rektor UAY</h2>
          <p class="slide-desc">Menyediakan ringkasan keaktifan perkuliahan dan kepatuhan mutu akademik bagi pimpinan universitas.</p>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary)"></div>
            <div class="card-title">Mekanisme Pemantauan Pimpinan</div>
            <ul>
              <li><strong>Sinkronisasi Otomatis:</strong> Terhubung langsung ke Dashboard Rektor UAY</li>
              <li><strong>Akses Terlindungi:</strong> Khusus diperuntukkan bagi pejabat universitas</li>
              <li><strong>Pembaruan Berkala:</strong> Diperbarui otomatis saat proses belajar mengajar berjalan</li>
              <li><strong>Privasi Terjaga:</strong> Menyajikan angka ringkasan tanpa mengganggu ruang kelas</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">Data yang Dipantau Pimpinan</div>
            <ul>
              <li>Total kelas aktif per fakultas dan prodi</li>
              <li>Jumlah materi kuliah terbit (PDF, Slide, Video)</li>
              <li>Volume pelaksanaan tugas dan kuis aktif</li>
              <li>Rata-rata persentase presensi kehadiran universitas</li>
              <li>Rasio mahasiswa yang memenuhi syarat kelayakan ujian</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 6: ADMIN PRODI - KELAS & DOSEN LINTAS PRODI -->
      <div class="slide" data-category="prodi" data-note="Jelaskan bahwa Admin Prodi hanya bisa melihat prodi sendiri (Department Scoping), namun dapat menugaskan dosen dari prodi lain.">
        <div class="slide-header">
          <span class="slide-badge badge-blue">ADMINISTRATOR PROGRAM STUDI</span>
          <h2 class="slide-title">Isolasi Data Prodi & Penugasan Dosen Lintas Prodi</h2>
          <p class="slide-desc">Menjamin kerahasiaan dan ketertiban tata kelola kelas, dosen pengampu, dan mahasiswa pada setiap prodi.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">Department Scoping</div>
            <ul>
              <li>Akses terisolasi hanya pada prodi bersangkutan</li>
              <li>Mencegah kebocoran data akademik antar-fakultas</li>
              <li>Dukungan multi-scope jika staf mengelola 2 prodi</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary-light)"></div>
            <div class="card-title">Dosen Lintas Prodi</div>
            <ul>
              <li>Cari dosen berdasarkan NIDN se-universitas</li>
              <li>Tugaskan sebagai Dosen Utama atau Team Teaching</li>
              <li>Dosen langsung melihat kelas di dashboard-nya</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">Manajemen Mahasiswa</div>
            <ul>
              <li>Pendaftaran rombel via NIM (satuan / massal)</li>
              <li>Toggle status aktif (untuk mahasiswa cuti/mundur)</li>
              <li>Riwayat akademik tetap terlindungi aman</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 7: DOSEN - MATERI 4 MEDIA & COMPLETION -->
      <div class="slide" data-category="dosen" data-note="Dosen dapat mengunggah 4 format media. Tekankan fitur Anti-Skip Tracker: video harus ditonton utuh sebelum tombol unduh aktif.">
        <div class="slide-header">
          <span class="slide-badge badge-green">DOSEN PENGAMPU</span>
          <h2 class="slide-title">Pengelolaan 4 Format Materi & Anti-Skip Tracker</h2>
          <p class="slide-desc">Mengatur bahan ajar secara sistematis per pertemuan dengan aturan penyelesaian belajar terukur.</p>
        </div>
        <div class="grid-4">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary-light)"></div>
            <div class="card-title">📄 Dokumen</div>
            <ul>
              <li>Silabus & modul PDF/DOCX</li>
              <li>Pratinjau langsung di web</li>
              <li>Pencatatan halaman dibaca</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">📊 Slide</div>
            <ul>
              <li>Presentasi PPT/PPTX</li>
              <li>Navigasi per lembar salindia</li>
              <li>Dukungan mode fullscreen</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">🎥 Video</div>
            <ul>
              <li>Streaming video kuliah</li>
              <li>Anti-Skip Frontier Tracker</li>
              <li>Skip linimasa tidak dihitung</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--purple)"></div>
            <div class="card-title">🔗 Lainnya</div>
            <ul>
              <li>Dataset latihan praktikum</li>
              <li>Repositori source code</li>
              <li>Tautan referensi eksternal</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 8: SIMULATOR PRESENSI (SANGAT INTERAKTIF) -->
      <div class="slide" data-category="dosen" data-note="DEMO LANGSUNG: Tunjukkan layar proyektor dosen di kiri dan ponsel mahasiswa di kanan. Masukkan kode 6 digit untuk melihat jumlah hadir bertambah secara live!">
        <div class="slide-header">
          <span class="slide-badge badge-green">SIMULATOR INTERAKTIF · PRESENSI DI KELAS</span>
          <h2 class="slide-title">Simulasi Langsung: Presensi Layar Proyektor Dosen & Check-in Mahasiswa</h2>
          <p class="slide-desc">Cobalah langsung alur presensi tatap muka di bawah ini: lihat kode proyektor, lalu masukkan kodenya pada ponsel simulasi.</p>
        </div>
        <div class="presensi-sim-box">
          <!-- Sisi Layar Proyektor Dosen -->
          <div class="projector-screen">
            <span class="projector-badge">LAYAR PROYEKTOR DOSEN DI RUANG KULIAH</span>
            <div style="font-size:14px; color:#94a3b8">IF-201 Algoritma & Pemrograman · Pertemuan 4</div>
            <div class="big-code" id="sim-projector-code">418 920</div>
            <div style="font-size:12px; color:#cbd5e1; margin-bottom:12px">
              ⏱️ Sisa Waktu Aktif: <strong style="color:#f59e0b" id="sim-countdown">14:45</strong> | Sesi Terbuka
            </div>
            <div style="display:flex; gap:16px; align-items:center; background:rgba(255,255,255,0.05); padding:10px 18px; border-radius:10px">
              <div style="font-size:24px">👥</div>
              <div style="text-align:left">
                <div style="font-size:11px; color:#94a3b8">MAHASISWA BERHASIL HADIR</div>
                <div style="font-size:20px; font-weight:800; color:#22c55e" id="sim-counter-text"><span id="sim-counter">38</span> / 42 Mahasiswa</div>
              </div>
            </div>
            <div style="margin-top:14px">
              <button class="btn btn-primary" onclick="generateNewSimCode()" style="font-size:11px">🔄 Acak Kode Baru</button>
            </div>
          </div>

          <!-- Sisi Ponsel Mahasiswa -->
          <div class="phone-simulator">
            <div>
              <div class="phone-header">
                <span>📱 Gawai Mahasiswa</span>
                <span style="color:#22c55e">● Online</span>
              </div>
              <div style="font-size:13px; font-weight:700; color:#cbd5e1; margin-bottom:6px">Isi Presensi Mandiri</div>
              <div style="font-size:11px; color:#94a3b8; margin-bottom:14px">Ketikkan 6 digit kode yang tampil di proyektor dosen:</div>
              <input type="text" class="sim-input" id="sim-user-input" maxlength="6" placeholder="______">
              <div id="sim-feedback" style="margin-top:12px; font-size:12px; min-height:20px; text-align:center"></div>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px">
              <button class="btn btn-primary" style="width:100%; justify-content:center; padding:10px" onclick="submitSimAttendance()">Kirim Presensi Sekarang</button>
              <button class="btn" style="width:100%; justify-content:center; font-size:11px" onclick="autoFillSimCode()">Otomatis Isi Kode</button>
            </div>
          </div>
        </div>
      </div>

      <!-- SLIDE 9: DOSEN - ROSTER & TANDAI SEMUA HADIR -->
      <div class="slide" data-category="dosen" data-note="Jelaskan penanganan izin dan sakit dengan nomor surat dokter, serta tombol 'Tandai Semua Hadir' yang menghemat waktu.">
        <div class="slide-header">
          <span class="slide-badge badge-blue">FITUR EFISIENSI DOSEN</span>
          <h2 class="slide-title">Roster Manual & Tombol Cepat "Tandai Semua Hadir"</h2>
          <p class="slide-desc">Solusi praktis jika mahasiswa terkendala gawai, izin dinas, atau pada kelas tatap muka penuh.</p>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">Koreksi Presensi Roster Manual</div>
            <ul>
              <li><strong>Pilihan Status:</strong> Hadir (Present), Izin (Excused), Sakit (Sick), Alfa (Absent)</li>
              <li><strong>Kolom Catatan:</strong> Tulis nomor surat dokter atau disposisi dinas</li>
              <li><strong>Pengaruh Status:</strong> Status Sakit dan Izin resmi diakui dalam persentase syarat ujian</li>
              <li><strong>Audit Trail:</strong> Setiap koreksi status tercatat aman dalam log audit kelas</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary)"></div>
            <div class="card-title">Aksi Cepat "Tandai Semua Hadir"</div>
            <ul>
              <li>Satu klik tombol biru <strong>"Tandai Semua Hadir"</strong> di lembar presensi</li>
              <li>Seluruh mahasiswa yang berstatus Alfa seketika berubah menjadi Hadir</li>
              <li>Dosen tinggal menyesuaikan 1-2 mahasiswa yang izin sebelum menyimpan</li>
              <li>Menghemat waktu dosen: selesai presensi 40+ mahasiswa dalam 10 detik!</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 10: DOSEN - TUGAS, KUIS & 8 TIPE SOAL -->
      <div class="slide" data-category="dosen" data-note="Sebutkan 8 variasi tipe soal dan fitur impor soal massal menggunakan Excel.">
        <div class="slide-header">
          <span class="slide-badge badge-amber">EVALUASI PEMBELAJARAN</span>
          <h2 class="slide-title">Mesin Kuis Canggih (8 Tipe Soal) & Impor Excel</h2>
          <p class="slide-desc">Mendukung evaluasi komprehensif dari kuis mingguan hingga Ujian Tengah & Akhir Semester.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">8 Ragam Tipe Soal</div>
            <ul>
              <li>1. Pilihan Ganda Tunggal</li>
              <li>2. Pilihan Ganda Kompleks</li>
              <li>3. Benar / Salah</li>
              <li>4. Isian Singkat</li>
              <li>5. Menjodohkan (Matching)</li>
              <li>6. Mengurutkan (Ordering)</li>
              <li>7. Esai Terbuka</li>
              <li>8. Unggah Berkas Jawaban</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary)"></div>
            <div class="card-title">Bank Soal & Impor Excel</div>
            <ul>
              <li>Unggah puluhan soal sekaligus via template Excel</li>
              <li>Pengacakan soal dan opsi otomatis</li>
              <li>Dukungan gambar pada narasi soal</li>
              <li>Transaksional: baris error dilaporkan spesifik</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">4 Mode Publikasi Hasil</div>
            <ul>
              <li><code>AUTO</code>: Nilai instan muncul setelah submit</li>
              <li><code>HIDDEN</code>: Nilai disembunyikan total</li>
              <li><code>MANUAL</code>: Rilis via tombol publikasi dosen</li>
              <li><code>SCHEDULED</code>: Terbuka pada jadwal kalender</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 11: SIMULATOR GRADEBOOK (SANGAT INTERAKTIF) -->
      <div class="slide" data-category="dosen" data-note="DEMO INTERAKTIF: Geser slider nilai tugas, kuis, UTS, UAS, dan kehadiran untuk melihat konversi huruf mutu UAY 2026.1 secara real-time!">
        <div class="slide-header">
          <span class="slide-badge badge-green">SIMULATOR INTERAKTIF · GRADEBOOK UAY 2026.1</span>
          <h2 class="slide-title">Kalkulator Pembobotan Nilai & Skala Huruf Mutu UAY</h2>
          <p class="slide-desc">Geser nilai komponen di sisi kiri untuk melihat kalkulasi nilai akhir otomatis dan konversi huruf mutu.</p>
        </div>
        <div class="calc-grid">
          <!-- Sliders -->
          <div class="card" style="padding:16px">
            <div class="slider-row">
              <div class="slider-label">
                <span>Tugas & Praktikum (Bobot 20%)</span>
                <strong id="val-tugas">85</strong>
              </div>
              <input type="range" class="slider-input" min="0" max="100" value="85" oninput="updateGradeCalc()" id="slide-tugas">
            </div>
            <div class="slider-row">
              <div class="slider-label">
                <span>Kuis Perkuliahan (Bobot 15%)</span>
                <strong id="val-kuis">80</strong>
              </div>
              <input type="range" class="slider-input" min="0" max="100" value="80" oninput="updateGradeCalc()" id="slide-kuis">
            </div>
            <div class="slider-row">
              <div class="slider-label">
                <span>Ujian Tengah Semester / UTS (Bobot 25%)</span>
                <strong id="val-uts">88</strong>
              </div>
              <input type="range" class="slider-input" min="0" max="100" value="88" oninput="updateGradeCalc()" id="slide-uts">
            </div>
            <div class="slider-row">
              <div class="slider-label">
                <span>Ujian Akhir Semester / UAS (Bobot 30%)</span>
                <strong id="val-uas">86</strong>
              </div>
              <input type="range" class="slider-input" min="0" max="100" value="86" oninput="updateGradeCalc()" id="slide-uas">
            </div>
            <div class="slider-row">
              <div class="slider-label">
                <span>Presensi Kehadiran (Bobot 10%)</span>
                <strong id="val-presensi">100</strong>
              </div>
              <input type="range" class="slider-input" min="0" max="100" value="100" oninput="updateGradeCalc()" id="slide-presensi">
            </div>
          </div>

          <!-- Result Display -->
          <div class="calc-result-card">
            <div style="font-size:12px; color:#94a3b8; font-weight:700; letter-spacing:0.05em">NILAI AKHIR KUMULATIF</div>
            <div style="font-size:42px; font-weight:800; color:white; margin:6px 0" id="calc-total-score">86.30</div>
            <div class="calc-grade-letter" id="calc-letter">A</div>
            <div style="font-size:14px; font-weight:700; color:#cbd5e1; margin-top:6px" id="calc-point">Bobot: 4.00 · Sangat Baik (Istimewa)</div>
            <div style="margin-top:14px; font-size:11px; color:#64748b; background:rgba(255,255,255,0.05); padding:6px 14px; border-radius:8px">
              Formula: (20%×T) + (15%×K) + (25%×UTS) + (30%×UAS) + (10%×P)
            </div>
          </div>
        </div>
      </div>

      <!-- SLIDE 12: DOSEN - KLONING KELAS -->
      <div class="slide" data-category="dosen" data-note="Jelaskan bahwa semester baru tidak perlu ketik ulang materi. Cukup klik 'Kloning Kelas Ini' dan pilih semester baru.">
        <div class="slide-header">
          <span class="slide-badge badge-blue">EFISIENSI SEMESTER BARU</span>
          <h2 class="slide-title">Fitur Kloning Kelas: Draf Bersih & Reset Jadwal</h2>
          <p class="slide-desc">Mempersiapkan mata kuliah semester baru dalam hitungan detik tanpa mengetik ulang dari awal.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary)"></div>
            <div class="card-title">1. Duplikasi Cerdas</div>
            <ul>
              <li>Seluruh struktur pertemuan, silabus, & materi disalin utuh</li>
              <li>Kuis dan tugas disalin ke status <strong>Clean Draft</strong></li>
              <li>Dosen dapat meninjau dan merevisi materi kapan saja</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">2. Reset Jadwal Otomatis</div>
            <ul>
              <li>Deadline tugas lama di-reset ke status belum terjadwal</li>
              <li>Jadwal kuis disesuaikan dengan kalender akademik baru</li>
              <li>Mencegah mahasiswa baru terkecoh tanggal masa lalu</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">3. Isolasi Angkatan Baru</div>
            <ul>
              <li>Peserta mahasiswa kelas lama <strong>TIDAK diikutsertakan</strong></li>
              <li>Kelas baru dimulai dengan 0 peserta bersih</li>
              <li>Menjaga privasi nilai antar-angkatan mahasiswa</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 13: MAHASISWA - AGENDA & TUGAS -->
      <div class="slide" data-category="mhs" data-note="Tunjukkan beranda mahasiswa yang intuitif: daftar kelas aktif, agenda deadline terpusat, dan riwayat tugas.">
        <div class="slide-header">
          <span class="slide-badge badge-amber">PENGALAMAN MAHASISWA</span>
          <h2 class="slide-title">Beranda Belajar & Agenda Tenggat Waktu Terpusat</h2>
          <p class="slide-desc">Antarmuka ramah pengguna membantu mahasiswa mengelola prioritas akademik secara efisien.</p>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary-light)"></div>
            <div class="card-title">Navigasi Beranda Mahasiswa</div>
            <ul>
              <li><strong>Kartu Mata Kuliah:</strong> Menampilkan kelas semester berjalan, dosen pengampu, dan SKS</li>
              <li><strong>Progres Belajar:</strong> Persentase materi yang sudah dipelajari per mata kuliah</li>
              <li><strong>Pengumuman Dosen:</strong> Banner informasi penting muncul di bagian atas kelas</li>
              <li><strong>Akses Multi-Device:</strong> Tampilan optimal di laptop, tablet, maupun ponsel</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">Agenda & Deadlines</div>
            <ul>
              <li>Daftar seluruh tugas & kuis dari semua mata kuliah dikumpulkan dalam satu linimasa</li>
              <li>Diurutkan berdasarkan waktu terdekat batas pengumpulan</li>
              <li>Indikator tugas yang sudah diserahkan vs yang masih menunggu</li>
              <li>Mencegah mahasiswa lupa atau terlambat mengumpulkan tugas kuliah</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 14: MAHASISWA - PENGUMPULAN TUGAS & KUIS AUTO-SAVE -->
      <div class="slide" data-category="mhs" data-note="Tekankan fitur Auto-Save saat kuis: jika koneksi internet mahasiswa terputus, jawaban tidak hilang. Cukup refresh saat online kembali.">
        <div class="slide-header">
          <span class="slide-badge badge-amber">PENGALAMAN MAHASISWA</span>
          <h2 class="slide-title">Pengumpulan Tugas & Kuis Daring Anti-Hilang Jawaban</h2>
          <p class="slide-desc">Fitur keamanan otomatis menjamin kelancaran evaluasi daring meskipun terjadi gangguan jaringan.</p>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">Pengumpulan Tugas Kuliah</div>
            <ul>
              <li>Mendukung unggah berkas (PDF, DOCX, ZIP) atau link Google Drive/GitHub</li>
              <li>Bukti tanda terima waktu pengumpulan tampil seketika</li>
              <li>Dapat memperbarui berkas sebelum batas waktu toleransi (Cut-off Date)</li>
              <li>Transparansi nilai dan umpan balik personal dari dosen</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary)"></div>
            <div class="card-title">Fitur Auto-Save Saat Kuis</div>
            <ul>
              <li>Setiap jawaban yang diklik / diketik otomatis tersimpan di server</li>
              <li>Jika internet terputus, jawaban yang sudah dipilih tetap aman!</li>
              <li>Cukup refresh halaman saat internet kembali aktif untuk lanjut</li>
              <li>Timer countdown berjalan akurat berdasarkan jam server</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 15: SIMULATOR REGULASI KEHADIRAN 75% (INTERAKTIF) -->
      <div class="slide" data-category="regulasi" data-note="DEMO INTERAKTIF: Geser slider jumlah kehadiran dari 16 pertemuan untuk mendemonstrasikan ambang batas 75% (minimal 12 pertemuan hadir).">
        <div class="slide-header">
          <span class="slide-badge badge-danger">REGULASI AKADEMIK UAY</span>
          <h2 class="slide-title">Simulasi Ambang Batas Kehadiran Minimal 75%</h2>
          <p class="slide-desc">Sesuai Peraturan Akademik UAY: Mahasiswa dengan kehadiran < 75% TIDAK BERHAK mengikuti UTS / UAS.</p>
        </div>
        <div class="calc-grid">
          <div class="card" style="padding:20px">
            <div class="card-title" style="margin-bottom:12px">Simulasi Pertemuan Mahasiswa</div>
            <div class="slider-row">
              <div class="slider-label">
                <span>Total Sesi Kuliah Semester:</span>
                <strong>16 Pertemuan</strong>
              </div>
            </div>
            <div class="slider-row">
              <div class="slider-label">
                <span>Jumlah Hadir / Izin Resmi:</span>
                <strong id="sim-attend-count" style="color:#22c55e">14 Pertemuan</strong>
              </div>
              <input type="range" class="slider-input" min="0" max="16" value="14" oninput="updateAttendanceSim()" id="slide-attend">
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-top:14px; line-height:1.5">
              💡 <em>Rumus:</em> (Sesi Hadir + Izin Resmi) / 16 Sesi × 100%.<br>
              Status Sakit dan Izin resmi wajib dilengkapi nomor surat pada Roster dosen.
            </div>
          </div>

          <div class="calc-result-card" id="attend-status-card">
            <div style="font-size:12px; color:#94a3b8; font-weight:700">PERSENTASE KEHADIRAN</div>
            <div style="font-size:54px; font-weight:900; color:#22c55e; margin:6px 0" id="attend-pct-text">87.5%</div>
            <div id="attend-badge" style="background:#14532d; color:#86efac; border:1px solid #22c55e; padding:6px 16px; border-radius:999px; font-size:13px; font-weight:800">
              ✓ MEMENUHI SYARAT UJIAN
            </div>
            <div style="font-size:12px; color:#cbd5e1; margin-top:10px" id="attend-status-desc">
              Mahasiswa berhak mencetak kartu ujian & mengikuti UTS / UAS.
            </div>
          </div>
        </div>
      </div>

      <!-- SLIDE 16: SKALA HURUF MUTU UAY -->
      <div class="slide" data-category="regulasi" data-note="Tampilkan tabel skala nilai resmi UAY 2026.1 agar seluruh dosen dan mahasiswa memiliki acuan baku yang sama.">
        <div class="slide-header">
          <span class="slide-badge badge-green">KEBIJAKAN PENILAIAN</span>
          <h2 class="slide-title">Tabel Standar Rentang Nilai Huruf Mutu UAY (2026.1)</h2>
          <p class="slide-desc">Berlaku resmi di seluruh fakultas dan program studi Universitas Achmad Yani.</p>
        </div>
        <div class="grid-2">
          <div class="card" style="padding:14px">
            <div class="card-title">Rentang Nilai Lulus</div>
            <ul>
              <li><strong>A (≥ 85.00):</strong> Bobot 4.00 · Sangat Baik (Istimewa)</li>
              <li><strong>A- (80.00 – 84.99):</strong> Bobot 3.75 · Sangat Baik</li>
              <li><strong>B+ (75.00 – 79.99):</strong> Bobot 3.50 · Baik Sekali</li>
              <li><strong>B (70.00 – 74.99):</strong> Bobot 3.00 · Baik</li>
              <li><strong>B- (65.00 – 69.99):</strong> Bobot 2.75 · Cukup Baik</li>
              <li><strong>C+ (60.00 – 64.99):</strong> Bobot 2.50 · Cukup</li>
              <li><strong>C (55.00 – 59.99):</strong> Bobot 2.00 · Batas Kelulusan Minimal</li>
            </ul>
          </div>
          <div class="card" style="padding:14px">
            <div class="card-title">Rentang Nilai Tidak Lulus / Perbaikan</div>
            <ul>
              <li><strong>D (45.00 – 54.99):</strong> Bobot 1.00 · Kurang (Wajib Ujian Perbaikan)</li>
              <li><strong>E (< 45.00):</strong> Bobot 0.00 · Gagal (Wajib Mengulang Semester Depan)</li>
              <li style="margin-top:12px; border-top:1px solid var(--border); padding-top:10px">
                <em>Catatan:</em> Sistem Gradebook otomatis menerapkan preset ini begitu dosen memasukkan bobot kategori.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 17: FAQ & TROUBLESHOOTING -->
      <div class="slide" data-category="all" data-note="Bagian tanya jawab cepat seputar kendala yang sering ditanyakan pengguna baru.">
        <div class="slide-header">
          <span class="slide-badge badge-amber">TANYA JAWAB CEPAT</span>
          <h2 class="slide-title">Pertanyaan Sering Diajukan (FAQ & Solusi)</h2>
          <p class="slide-desc">Jawaban cepat atas kendala umum yang sering dihadapi pengguna di awal perkuliahan.</p>
        </div>
        <div class="grid-3">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary)"></div>
            <div class="card-title">🔑 Kendala Login SSO</div>
            <ul>
              <li><strong>Q: Lupa password login?</strong></li>
              <li>A: Reset kata sandi melalui portal <code>sso.uay.ac.id</code> atau email ke <code>sso-admin@uay.ac.id</code>.</li>
              <li><strong>Q: Sesi logout tiba-tiba?</strong></li>
              <li>A: Bersihkan cache browser atau buka mode incognito.</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--accent)"></div>
            <div class="card-title">📱 Kendala Presensi</div>
            <ul>
              <li><strong>Q: Kode 6-digit ditolak?</strong></li>
              <li>A: Pastikan jam ponsel sinkron waktu internet. Hubungi dosen jika durasi habis.</li>
              <li><strong>Q: Baterai habis saat kuliah?</strong></li>
              <li>A: Minta dosen menginput status Hadir pada Roster manual.</li>
            </ul>
          </div>
          <div class="card">
            <div class="card-top-bar" style="background:var(--amber)"></div>
            <div class="card-title">📥 Kendala Materi & Video</div>
            <ul>
              <li><strong>Q: Tombol unduh tidak bisa diklik?</strong></li>
              <li>A: Tonton video hingga selesai atau baca seluruh dokumen hingga 100%.</li>
              <li><strong>Q: Tugas gagal terunggah?</strong></li>
              <li>A: Pastikan file < 25 MB atau gunakan tautan Google Drive resmi UAY.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- SLIDE 18: PUSAT BANTUAN & PENUTUP -->
      <div class="slide" data-category="all" data-note="Tutup presentasi dengan mengajak seluruh peserta mensukseskan perkuliahan digital dan buka sesi tanya jawab.">
        <div class="slide-header">
          <span class="slide-badge badge-green">PUSAT BANTUAN & HELPDESK</span>
          <h2 class="slide-title">Layanan Dukungan Terpadu & Sesi Tanya Jawab (Q&A)</h2>
          <p class="slide-desc">Tim TIK Universitas Achmad Yani siap mendampingi kelancaran perkuliahan digital Anda.</p>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-top-bar" style="background:var(--primary-light)"></div>
            <div class="card-title">Saluran Kontak Resmi TIK UAY</div>
            <ul>
              <li><strong>Helpdesk Akademik E-Learning:</strong><br><code>elearning-support@uay.ac.id</code> (Senin–Jumat 08.00–16.00 WITA)</li>
              <li><strong>Layanan Akun & SSO Kampus:</strong><br><code>sso-admin@uay.ac.id</code></li>
              <li><strong>Layanan Terpadu Fisik:</strong><br>Gedung Rektorat UAY Lantai 2, Kampus Terpadu Banjarmasin</li>
              <li><strong>Help Center Terpadu:</strong><br>Menu Bantuan di <code>/help</code> (Lebih dari 50 Artikel Panduan)</li>
            </ul>
          </div>
          <div class="card" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; background:#020617">
            <div style="font-size:44px; margin-bottom:8px">🎓</div>
            <div style="font-size:20px; font-weight:800; color:white">MARI SUKSESKAN PEMBELAJARAN DIGITAL!</div>
            <p style="font-size:13px; color:#94a3b8; margin:8px 0 16px">Terima kasih atas perhatian dan partisipasi Bapak/Ibu Dosen serta Rekan Mahasiswa.</p>
            <div style="background:var(--primary-soft); border:1px solid var(--primary); color:#86efac; padding:8px 18px; border-radius:999px; font-size:12px; font-weight:700">
              SESI TANYA JAWAB DIBUKA
            </div>
          </div>
        </div>
      </div>

    </div>
  </main>

  <!-- Presenter Notes Drawer -->
  <div id="notes-drawer">
    <h4>
      <span>Catatan Pembicara (Presenter Notes)</span>
      <span style="cursor:pointer" onclick="toggleNotes()">✕</span>
    </h4>
    <div id="notes-content">Memuat catatan...</div>
  </div>

  <!-- Bottom Navigation Bar -->
  <footer>
    <div style="display:flex; align-items:center; gap:12px">
      <span class="slide-counter" id="slide-counter">Slide 1 / 18</span>
      <span style="font-size:12px; color:var(--text-muted)">Navigasi: [← / →] Spasi, [F] Layar Penuh, [T] Tema, [N] Catatan</span>
    </div>
    <div class="nav-buttons">
      <button class="btn" onclick="prevSlide()" id="prev-btn">◀ Sebelumnya</button>
      <button class="btn btn-primary" onclick="nextSlide()" id="next-btn">Berikutnya ▶</button>
    </div>
  </footer>

  <!-- Interactive JavaScript Engine -->
  <script>
    // Audio synthesis for interactive sound effects (Zero external dependencies)
    let audioEnabled = true;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function playChime(freq = 600, type = 'sine', duration = 0.08) {
      if (!audioEnabled || !audioCtx) return;
      try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
      } catch (e) {}
    }

    function toggleAudio() {
      audioEnabled = !audioEnabled;
      const btn = document.getElementById('audio-btn');
      btn.innerText = audioEnabled ? '🔊 Suara: ON' : '🔇 Suara: OFF';
      if (audioEnabled) playChime(800);
    }

    // Slide Engine
    let currentSlide = 0;
    const slides = Array.from(document.querySelectorAll('.slide'));
    const totalSlides = slides.length;
    let activeCategory = 'all';

    function getVisibleSlides() {
      if (activeCategory === 'all') return slides;
      return slides.filter(s => s.getAttribute('data-category') === activeCategory || s.getAttribute('data-category') === 'all');
    }

    function updateSlide() {
      slides.forEach((s, idx) => {
        s.classList.remove('active');
        if (idx === currentSlide) s.classList.add('active');
      });

      // Update counter and progress bar
      document.getElementById('slide-counter').innerText = `Slide ${currentSlide + 1} / ${totalSlides}`;
      const pct = ((currentSlide + 1) / totalSlides) * 100;
      document.getElementById('progress-fill').style.width = pct + '%';

      // Update buttons
      document.getElementById('prev-btn').disabled = (currentSlide === 0);
      document.getElementById('next-btn').disabled = (currentSlide === totalSlides - 1);

      // Update presenter notes
      const note = slides[currentSlide].getAttribute('data-note') || 'Tidak ada catatan khusus untuk slide ini.';
      document.getElementById('notes-content').innerText = note;

      playChime(500, 'sine', 0.05);
    }

    function nextSlide() {
      if (currentSlide < totalSlides - 1) {
        currentSlide++;
        updateSlide();
      }
    }

    function prevSlide() {
      if (currentSlide > 0) {
        currentSlide--;
        updateSlide();
      }
    }

    function jumpToCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('.role-pill').forEach(btn => btn.classList.remove('active'));
      const found = Array.from(document.querySelectorAll('.role-pill')).find(p => p.getAttribute('onclick').includes(cat));
      if (found) found.classList.add('active');

      if (cat === 'all') {
        currentSlide = 0;
      } else {
        const firstMatch = slides.findIndex(s => s.getAttribute('data-category') === cat);
        if (firstMatch !== -1) currentSlide = firstMatch;
      }
      updateSlide();
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return; // Don't intercept typing in inputs
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 't') {
        toggleTheme();
      } else if (e.key.toLowerCase() === 'n') {
        toggleNotes();
      } else if (e.key === 'Home') {
        currentSlide = 0;
        updateSlide();
      } else if (e.key === 'End') {
        currentSlide = totalSlides - 1;
        updateSlide();
      }
    });

    // Theme Toggle
    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const target = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', target);
      playChime(700, 'sine', 0.08);
    }

    // Fullscreen Toggle
    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    // Notes Toggle
    function toggleNotes() {
      const drawer = document.getElementById('notes-drawer');
      drawer.style.display = drawer.style.display === 'block' ? 'none' : 'block';
    }

    // -------------------------------------------------------------
    // INTERACTIVE SIMULATOR 1: PRESENSI PROYEKTOR
    // -------------------------------------------------------------
    let liveSimCode = '418920';
    let liveStudentCount = 38;

    function generateNewSimCode() {
      liveSimCode = String(Math.floor(100000 + Math.random() * 900000));
      const formatted = liveSimCode.slice(0, 3) + ' ' + liveSimCode.slice(3);
      document.getElementById('sim-projector-code').innerText = formatted;
      document.getElementById('sim-feedback').innerHTML = '<span style="color:#38bdf8">Kode baru dibuat oleh dosen!</span>';
      playChime(850, 'triangle', 0.1);
    }

    function autoFillSimCode() {
      document.getElementById('sim-user-input').value = liveSimCode;
      playChime(600, 'sine', 0.05);
    }

    function submitSimAttendance() {
      const input = document.getElementById('sim-user-input').value.trim().replace(/\s+/g, '');
      const fb = document.getElementById('sim-feedback');
      if (input === liveSimCode) {
        liveStudentCount = Math.min(42, liveStudentCount + 1);
        document.getElementById('sim-counter').innerText = liveStudentCount;
        fb.innerHTML = '<span style="color:#22c55e; font-weight:bold">✓ Presensi Berhasil: HADIR (Tercatat di Server)!</span>';
        playChime(900, 'sine', 0.15);
        setTimeout(() => playChime(1200, 'sine', 0.2), 100);
      } else {
        fb.innerHTML = '<span style="color:#ef4444; font-weight:bold">✗ Kode Salah atau Kadaluarsa! Coba lagi.</span>';
        playChime(300, 'sawtooth', 0.2);
      }
    }

    // Timer simulator countdown
    let secondsLeft = 14 * 60 + 45;
    setInterval(() => {
      if (secondsLeft > 0) {
        secondsLeft--;
        const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
        const s = String(secondsLeft % 60).padStart(2, '0');
        const el = document.getElementById('sim-countdown');
        if (el) el.innerText = `${m}:${s}`;
      }
    }, 1000);

    // -------------------------------------------------------------
    // INTERACTIVE SIMULATOR 2: GRADEBOOK CALCULATOR
    // -------------------------------------------------------------
    function updateGradeCalc() {
      const t = parseFloat(document.getElementById('slide-tugas').value);
      const k = parseFloat(document.getElementById('slide-kuis').value);
      const uts = parseFloat(document.getElementById('slide-uts').value);
      const uas = parseFloat(document.getElementById('slide-uas').value);
      const p = parseFloat(document.getElementById('slide-presensi').value);

      document.getElementById('val-tugas').innerText = t;
      document.getElementById('val-kuis').innerText = k;
      document.getElementById('val-uts').innerText = uts;
      document.getElementById('val-uas').innerText = uas;
      document.getElementById('val-presensi').innerText = p;

      // Formula: (20%*T) + (15%*K) + (25%*UTS) + (30%*UAS) + (10%*P)
      const total = (0.20 * t) + (0.15 * k) + (0.25 * uts) + (0.30 * uas) + (0.10 * p);
      document.getElementById('calc-total-score').innerText = total.toFixed(2);

      let letter = 'E', pt = '0.00', desc = 'Gagal (Wajib Mengulang)';
      if (total >= 85) { letter = 'A'; pt = '4.00'; desc = 'Sangat Baik (Istimewa)'; }
      else if (total >= 80) { letter = 'A-'; pt = '3.75'; desc = 'Sangat Baik'; }
      else if (total >= 75) { letter = 'B+'; pt = '3.50'; desc = 'Baik Sekali'; }
      else if (total >= 70) { letter = 'B'; pt = '3.00'; desc = 'Baik'; }
      else if (total >= 65) { letter = 'B-'; pt = '2.75'; desc = 'Cukup Baik'; }
      else if (total >= 60) { letter = 'C+'; pt = '2.50'; desc = 'Cukup'; }
      else if (total >= 55) { letter = 'C'; pt = '2.00'; desc = 'Cukup (Batas Kelulusan Minimal)'; }
      else if (total >= 45) { letter = 'D'; pt = '1.00'; desc = 'Kurang (Wajib Ujian Perbaikan)'; }

      document.getElementById('calc-letter').innerText = letter;
      document.getElementById('calc-point').innerText = `Bobot: ${pt} · ${desc}`;
    }

    // -------------------------------------------------------------
    // INTERACTIVE SIMULATOR 3: ROLE TAB EXPLORER
    // -------------------------------------------------------------
    const roleData = {
      super: {
        title: "Super Administrator (Tingkat Universitas)",
        badge: "UNIVERSAL SCOPE",
        color: "var(--purple)",
        items: [
          "<strong>Cakupan Akses:</strong> Melihat dan mengelola seluruh fakultas, program studi, kelas, dosen, dan mahasiswa.",
          "<strong>Kebijakan Akademik:</strong> Mengatur periode tahun ajaran aktif (misal 2026/2027 Ganjil) dan preset standar nilai huruf mutu.",
          "<strong>Master Kurikulum:</strong> Menambah dan memperbarui master mata kuliah resmi universitas pada menu Katalog (/catalog).",
          "<strong>Integrasi Eksekutif:</strong> Menyediakan ringkasan keaktifan perkuliahan berkala untuk Dashboard Rektor UAY."
        ]
      },
      prodi: {
        title: "Administrator Program Studi (Department Admin)",
        badge: "DEPARTMENT SCOPED",
        color: "var(--accent)",
        items: [
          "<strong>Isolasi Data:</strong> Hanya berwenang melihat kelas, dosen, dan mahasiswa pada program studi yang ditugaskan.",
          "<strong>Buka Kelas Baru:</strong> Membuat rombel kelas semester baru, mengatur kuota kapasitas, dan menetapkan semester.",
          "<strong>Penugasan Dosen:</strong> Menetapkan dosen utama atau team teaching, termasuk mencari dosen lintas prodi (NIDN).",
          "<strong>Enrollment Mahasiswa:</strong> Mendaftarkan mahasiswa ke kelas dan menonaktifkan status peserta cuti/mundur."
        ]
      },
      dosen: {
        title: "Dosen Pengampu Kelas (Instructor)",
        badge: "COURSE & CLASS MANAGEMENT",
        color: "var(--primary-light)",
        items: [
          "<strong>Pertemuan & Materi:</strong> Mengunggah 4 ragam media (Dokumen, Slide, Video, Lainnya) dengan completion rules.",
          "<strong>Presensi Proyektor:</strong> Membuka sesi mandiri kode 6-digit & QR Code di kelas dengan live counter peserta.",
          "<strong>Presensi Manual:</strong> Mengoreksi roster manual untuk izin/sakit dengan catatan surat dokter, atau klik 'Tandai Semua Hadir'.",
          "<strong>Tugas & Kuis:</strong> Mengelola evaluasi 8 tipe soal, bank soal Excel, auto-grading, dan buku nilai (Gradebook)."
        ]
      },
      mhs: {
        title: "Mahasiswa Peserta Kuliah (Student)",
        badge: "LEARNING & ATTENDANCE",
        color: "var(--amber)",
        items: [
          "<strong>Beranda Belajar:</strong> Membuka materi kuliah, navigasi slide PPT, dan pemutar video dengan pelacakan tontonan utuh.",
          "<strong>Presensi Mandiri:</strong> Memasukkan 6-digit kode dosen atau memindai QR Code di ruang kuliah tatap muka.",
          "<strong>Tugas & Ujian:</strong> Mengunggah berkas tugas dan mengerjakan kuis dengan fitur auto-save jawaban anti-hilang.",
          "<strong>Ambang Kehadiran 75%:</strong> Memantau lencana kelayakan ujian (UTS/UAS) secara berkala pada tab Presensi kelas."
        ]
      }
    };

    function selectRoleTab(roleKey) {
      document.querySelectorAll('.role-tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.role-tab-btn')).find(b => b.getAttribute('onclick').includes(roleKey));
      if (activeBtn) activeBtn.classList.add('active');

      const data = roleData[roleKey];
      const box = document.getElementById('role-display-box');
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:10px">
          <h3 style="font-size:18px; color:var(--text-main)">${data.title}</h3>
          <span style="background:rgba(255,255,255,0.08); color:${data.color}; border:1px solid ${data.color}; font-size:11px; font-weight:800; padding:4px 12px; border-radius:999px">${data.badge}</span>
        </div>
        <ul style="list-style:none; display:flex; flex-direction:column; gap:12px; font-size:13px; color:var(--text-muted)">
          ${data.items.map(item => `<li style="line-height:1.5">• ${item}</li>`).join('')}
        </ul>
      `;
      playChime(750, 'sine', 0.05);
    }

    // -------------------------------------------------------------
    // INTERACTIVE SIMULATOR 4: 75% ATTENDANCE SIMULATOR
    // -------------------------------------------------------------
    function updateAttendanceSim() {
      const hadir = parseInt(document.getElementById('slide-attend').value);
      document.getElementById('sim-attend-count').innerText = `${hadir} Pertemuan`;

      const pct = (hadir / 16) * 100;
      document.getElementById('attend-pct-text').innerText = pct.toFixed(1) + '%';

      const badge = document.getElementById('attend-badge');
      const desc = document.getElementById('attend-status-desc');
      const pctText = document.getElementById('attend-pct-text');

      if (pct >= 75) {
        pctText.style.color = '#22c55e';
        badge.style.background = '#14532d';
        badge.style.color = '#86efac';
        badge.style.borderColor = '#22c55e';
        badge.innerText = '✓ MEMENUHI SYARAT UJIAN';
        desc.innerText = 'Mahasiswa berhak mencetak kartu ujian & mengikuti UTS / UAS.';
      } else {
        pctText.style.color = '#ef4444';
        badge.style.background = '#7f1d1d';
        badge.style.color = '#fca5a5';
        badge.style.borderColor = '#ef4444';
        badge.innerText = '✗ PERINGATAN: BELUM MEMENUHI SYARAT (< 75%)';
        desc.innerText = 'TIDAK BERHAK mengikuti ujian. Segera hubungi dosen pengampu atau serahkan surat izin resmi!';
      }
    }

    // Initialize initial views on load
    window.addEventListener('DOMContentLoaded', () => {
      selectRoleTab('super');
      updateGradeCalc();
      updateAttendanceSim();
      updateSlide();
    });
  </script>
</body>
</html>
'''

def generate_interactive_slides():
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(HTML_TEMPLATE)
    print(f"Highly interactive HTML slides generated: {OUT_HTML} ({len(HTML_TEMPLATE)} bytes)")
    
    # Copy to root and Panduan folder
    PANDUAN_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_HTML, PROJECT_ROOT / "SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html")
    shutil.copy2(OUT_HTML, PANDUAN_DIR / "SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html")
    print(f"Copied HTML slides to {PANDUAN_DIR} and {PROJECT_ROOT}")

if __name__ == "__main__":
    generate_interactive_slides()
