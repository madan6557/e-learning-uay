import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

mkdirSync(resolve("docs/images"), { recursive: true });
mkdirSync(resolve("scratch/shots"), { recursive: true });

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const baseCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body { background: #0f172a; padding: 24px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .browser-window { width: 1100px; background: #ffffff; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45); overflow: hidden; border: 1px solid #cbd5e1; }
  .browser-bar { background: #f1f5f9; padding: 12px 18px; display: flex; align-items: center; border-bottom: 1px solid #e2e8f0; gap: 8px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #f59e0b; }
  .dot-green { background: #10b981; }
  .browser-url { margin-left: 12px; flex: 1; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 16px; font-size: 13px; color: #334155; display: flex; align-items: center; gap: 8px; font-weight: 500; }
  .nav-header { background: #173e61; color: white; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; letter-spacing: -0.3px; }
  .brand-logo { width: 28px; height: 28px; border-radius: 50%; background: #38bdf8; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #0c4a6e; font-size: 13px; }
  .brand-badge { background: #38bdf8; color: #0c4a6e; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; }
  .user-badge { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 500; }
  .avatar { width: 34px; height: 34px; border-radius: 50%; background: #38bdf8; color: #0c4a6e; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 13px; }
  .content { padding: 28px 32px; background: #f8fafc; min-height: 540px; }
  .btn-primary { background: #166534; color: white; border: none; border-radius: 6px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .btn-blue { background: #2563eb; color: white; border: none; border-radius: 6px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .btn-danger { background: #dc2626; color: white; border: none; border-radius: 6px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-red { background: #fee2e2; color: #b91c1c; }
  .badge-slate { background: #f1f5f9; color: #475569; }
`;

const shots = [
  // 1. HALAMAN MASUK (LOGIN)
  {
    name: "01-halaman-masuk-sso",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .login-container { display: flex; min-height: 520px; background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
      .login-hero { flex: 1.1; background: linear-gradient(135deg, #173e61 0%, #0f2438 100%); color: white; padding: 44px; display: flex; flex-direction: column; justify-content: space-between; }
      .login-form-area { flex: 0.9; padding: 44px; display: flex; flex-direction: column; justify-content: center; background: #ffffff; }
      .form-group { margin-bottom: 18px; }
      .form-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
      .form-input { width: 100%; padding: 11px 14px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; color: #0f172a; }
      .form-input:focus { border-color: #166534; outline: none; }
      .divider { display: flex; align-items: center; text-align: center; margin: 20px 0; color: #94a3b8; font-size: 12px; }
      .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
      .divider::before { margin-right: 12px; }
      .divider::after { margin-left: 12px; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/login</div>
        </div>
        <div class="login-container">
          <div class="login-hero">
            <div>
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
                <div class="brand-logo" style="width:38px; height:38px; font-size:16px;">UAY</div>
                <div>
                  <h3 style="font-size:18px; font-weight:800; letter-spacing:-0.3px;">E-Learning UAY</h3>
                  <div style="font-size:11px; color:#93c5fd;">Universitas Achmad Yani Banjarmasin</div>
                </div>
              </div>
              <h1 style="font-size:26px; line-height:1.3; font-weight:800; margin-bottom:12px;">Portal Pembelajaran Digital Terpadu Kampus</h1>
              <p style="font-size:14px; color:#cbd5e1; line-height:1.5;">Akses materi kuliah, presensi kelas tatap muka, pengumpulan tugas, dan buku nilai resmi civitas akademika UAY.</p>
            </div>
            <div style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:8px; padding:16px;">
              <div style="font-size:12px; font-weight:700; color:#38bdf8; margin-bottom:4px;">💡 PANDUAN MASUK AKUN KAMPUS</div>
              <div style="font-size:12px; color:#e2e8f0; line-height:1.4;">Gunakan NIM dan kata sandi akun kampus Anda untuk mahasiswa, atau email resmi <strong>@uay.ac.id</strong> untuk dosen dan staf.</div>
            </div>
          </div>
          <div class="login-form-area">
            <h2 style="font-size:22px; font-weight:800; color:#0f172a; margin-bottom:6px;">Selamat Datang</h2>
            <p style="font-size:13px; color:#64748b; margin-bottom:24px;">Silakan masuk menggunakan Akun Resmi Kampus Anda</p>
            
            <button class="btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:14px; margin-bottom:12px; background:#166534;">
              🎓 Masuk dengan Akun Kampus (SSO UAY)
            </button>
            
            <div class="divider">atau masuk langsung</div>

            <div class="form-group">
              <label class="form-label">NIM atau Email Resmi Kampus</label>
              <input class="form-input" type="text" value="202401001" placeholder="Masukkan NIM atau email kampus" />
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between;">
                <label class="form-label">Kata Sandi</label>
                <a href="#" style="font-size:12px; color:#166534; text-decoration:none; font-weight:600;">Lupa Kata Sandi?</a>
              </div>
              <input class="form-input" type="password" value="••••••••••••" />
            </div>
            
            <button class="btn-blue" style="width:100%; justify-content:center; padding:11px; font-size:14px;">
              Masuk ke Kelas
            </button>
            
            <div style="font-size:11px; color:#94a3b8; text-align:center; margin-top:20px;">
              Memerlukan bantuan masuk? Hubungi Layanan TIK di <strong>elearning-support@uay.ac.id</strong>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },

  // 2. BERANDA MAHASISWA
  {
    name: "02-beranda-mahasiswa",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .course-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-top: 18px; }
      .course-card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; }
      .course-header { background: #173e61; color: white; padding: 16px 18px; }
      .course-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
      .progress-bar-bg { width: 100%; height: 7px; background: #e2e8f0; border-radius: 9999px; overflow: hidden; margin-top: 8px; }
      .progress-bar-fill { height: 100%; background: #166534; border-radius: 9999px; }
      .alert-box { background: #fefce8; border: 1px solid #fef08a; border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/dashboard</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">MAHASISWA</span></div>
          <div class="user-badge"><span>Ahmad Fauzi (NIM: 202401001) · S1 Teknik Informatika</span><div class="avatar">AF</div></div>
        </div>
        <div class="content">
          <div class="alert-box">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="font-size:20px;">⏰</span>
              <div>
                <strong style="color:#854d0e; font-size:13px;">Tugas Menanti:</strong>
                <span style="color:#713f12; font-size:13px;"> Tugas 1 Analisis Algoritma jatuh tempo besok (15 Oktober 2026, 23.59 WITA).</span>
              </div>
            </div>
            <button class="btn-blue" style="padding:6px 14px; font-size:12px;">Buka Tugas</button>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="font-size:20px; color:#0f172a;">Mata Kuliah Semester Ganjil 2026/2027</h2>
              <div style="font-size:13px; color:#64748b; margin-top:2px;">Anda terdaftar dalam 3 kelas perkuliahan aktif.</div>
            </div>
            <div style="display:flex; gap:8px;">
              <span class="badge badge-green" style="font-size:12px; padding:6px 12px;">● Status Akademik: AKTIF</span>
            </div>
          </div>

          <div class="course-grid">
            <div class="course-card">
              <div class="course-header">
                <span class="badge" style="background:rgba(255,255,255,0.2); color:white; font-size:10px;">IF-201 · 3 SKS</span>
                <h3 style="font-size:16px; font-weight:700; margin-top:8px;">Algoritma & Pemrograman</h3>
                <div style="font-size:12px; color:#93c5fd; margin-top:4px;">Dr. Ir. Budi Santoso, M.Kom</div>
              </div>
              <div class="course-body">
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748b;">
                    <span>Kehadiran Anda: <strong>100%</strong></span>
                    <span class="badge badge-green">AMAN UAS</span>
                  </div>
                  <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:100%;"></div></div>
                  <div style="font-size:12px; color:#475569; margin-top:12px;">Pertemuan Saat Ini: <strong>Pertemuan 4 (Algoritma Greedy)</strong></div>
                </div>
                <button class="btn-primary" style="width:100%; justify-content:center; margin-top:16px;">Masuk Kelas →</button>
              </div>
            </div>

            <div class="course-card">
              <div class="course-header" style="background:#0c4a6e;">
                <span class="badge" style="background:rgba(255,255,255,0.2); color:white; font-size:10px;">IF-204 · 3 SKS</span>
                <h3 style="font-size:16px; font-weight:700; margin-top:8px;">Struktur Data & Kompleksitas</h3>
                <div style="font-size:12px; color:#93c5fd; margin-top:4px;">Siti Rahmah, S.T., M.Cs.</div>
              </div>
              <div class="course-body">
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748b;">
                    <span>Kehadiran Anda: <strong>85.7%</strong></span>
                    <span class="badge badge-green">AMAN UAS</span>
                  </div>
                  <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:85%;"></div></div>
                  <div style="font-size:12px; color:#475569; margin-top:12px;">Pertemuan Saat Ini: <strong>Pertemuan 4 (Binary Search Tree)</strong></div>
                </div>
                <button class="btn-primary" style="width:100%; justify-content:center; margin-top:16px;">Masuk Kelas →</button>
              </div>
            </div>

            <div class="course-card">
              <div class="course-header" style="background:#334155;">
                <span class="badge" style="background:rgba(255,255,255,0.2); color:white; font-size:10px;">KU-101 · 2 SKS</span>
                <h3 style="font-size:16px; font-weight:700; margin-top:8px;">Bahasa Indonesia & Tata Tulis</h3>
                <div style="font-size:12px; color:#93c5fd; margin-top:4px;">Drs. H. Ahmad Yani, M.Pd.</div>
              </div>
              <div class="course-body">
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:12px; color:#64748b;">
                    <span>Kehadiran Anda: <strong>75.0%</strong></span>
                    <span class="badge badge-yellow">BATAS MINIMAL</span>
                  </div>
                  <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:75%; background:#ca8a04;"></div></div>
                  <div style="font-size:12px; color:#475569; margin-top:12px;">Pertemuan Saat Ini: <strong>Pertemuan 3 (Paragraf & Penalaran)</strong></div>
                </div>
                <button class="btn-primary" style="width:100%; justify-content:center; margin-top:16px;">Masuk Kelas →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },

  // 3. PRESENSI PROYEKTOR DOSEN
  {
    name: "03-presensi-proyektor-dosen",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .projector-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 30px; text-align: center; }
      .code-display { font-family: monospace; font-size: 58px; font-weight: 800; letter-spacing: 14px; color: #166534; background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 18px 30px; display: inline-block; margin: 20px 0; }
      .qr-box { width: 140px; height: 140px; background: white; border: 2px solid #cbd5e1; border-radius: 10px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; color: #64748b; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 22px 0 0 0; }
      .stat-item { background: #f8fafc; border-radius: 8px; padding: 14px; border: 1px solid #e2e8f0; }
      .stat-val { font-size: 26px; font-weight: 800; color: #0f172a; }
      .stat-lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a/attendance/projector</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN</span></div>
          <div class="user-badge"><span>Dr. Ir. Budi Santoso, M.Kom (NIDN: 0412087501)</span><div class="avatar">BS</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
            <div>
              <div style="font-size:12px; font-weight:700; color:#166534; letter-spacing:0.5px;">MODE TAMPILAN PROYEKTOR KELAS · KULIAH TATAP MUKA</div>
              <h2 style="font-size:22px; color:#0f172a; margin-top:4px;">IF-201 Algoritma & Pemrograman · Pertemuan 4: Algoritma Greedy</h2>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-secondary">⚙️ Atur Waktu</button>
              <button class="btn-danger">⏹️ Tutup Presensi Sekarang</button>
            </div>
          </div>
          <div class="projector-card">
            <span class="badge badge-green" style="font-size:13px; padding:6px 14px;">● SESI PRESENSI AKTIF BERJALAN</span>
            <div style="font-size:14px; color:#475569; margin-top:12px;">Buka aplikasi <strong>https://e-learning.uay.ac.id</strong> di HP/Laptop lalu masukkan 6 digit kode di bawah:</div>
            
            <div class="code-display">8 4 9 2 0 1</div>
            
            <div style="display:flex; justify-content:center; align-items:center; gap:40px; margin-top:6px;">
              <div class="qr-box">
                <svg width="84" height="84" viewBox="0 0 24 24" fill="#0f172a"><path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h2v4h-2v-4zm2 2h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zm-12 12h2v2H5v-2z"/></svg>
                <span style="margin-top:4px;">Pindai QR Code</span>
              </div>
              <div style="text-align:left;">
                <div style="font-size:12px; color:#64748b; font-weight:600;">SISA WAKTU PENGISIAN:</div>
                <div style="font-size:36px; font-weight:800; color:#ea580c; font-family:monospace;">14 : 38</div>
                <div style="font-size:12px; color:#64748b; margin-top:4px;">Batas waktu toleransi: 15 menit sejak sesi dibuka</div>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-item"><div class="stat-val" style="color:#16a34a;">38 / 42</div><div class="stat-lbl">Mahasiswa Hadir (90.5%)</div></div>
              <div class="stat-item"><div class="stat-val" style="color:#d97706;">1</div><div class="stat-lbl">Izin Dispensasi Resmi</div></div>
              <div class="stat-item"><div class="stat-val" style="color:#dc2626;">3</div><div class="stat-lbl">Belum Hadir / Belum Absen</div></div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },

  // 4. PRESENSI MANDIRI MAHASISWA
  {
    name: "04-presensi-mandiri-mahasiswa",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .banner { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .modal-overlay { background: rgba(15, 23, 42, 0.65); padding: 40px; border-radius: 12px; display: flex; justify-content: center; }
      .modal-card { width: 480px; background: white; border-radius: 14px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; }
      .modal-header { background: #173e61; color: white; padding: 18px 24px; }
      .modal-body { padding: 24px; text-align: center; }
      .pin-input { display: flex; justify-content: center; gap: 10px; margin: 20px 0; }
      .pin-digit { width: 48px; height: 56px; border: 2px solid #166534; border-radius: 8px; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; color: #166534; background: #f0fdf4; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">MAHASISWA</span></div>
          <div class="user-badge"><span>Ahmad Fauzi (NIM: 202401001) · S1 Teknik Informatika</span><div class="avatar">AF</div></div>
        </div>
        <div class="content">
          <div class="banner">
            <div>
              <div style="font-size:12px; font-weight:700; color:#1d4ed8; letter-spacing:0.5px;">● PERKULIAHAN SEDANG BERLANGSUNG</div>
              <h3 style="color:#0f172a; margin-top:2px; font-size:17px;">Sesi Presensi Pertemuan 4 Telah Dibuka oleh Dosen Pengampu</h3>
              <div style="font-size:13px; color:#475569; margin-top:4px;">Masukkan 6 digit kode kehadiran yang ada pada layar proyektor dosen sebelum waktu habis.</div>
            </div>
            <button class="btn-primary" style="padding:12px 22px; font-size:14px; background:#166534;">📍 Isi Presensi Sekarang</button>
          </div>

          <div class="modal-overlay">
            <div class="modal-card">
              <div class="modal-header">
                <div style="font-size:12px; color:#38bdf8; font-weight:700;">FORMULIR PRESENSI MANDIRI</div>
                <h3 style="font-size:18px; margin-top:2px;">Pertemuan 4: Algoritma Greedy</h3>
              </div>
              <div class="modal-body">
                <div style="font-size:13px; color:#475569;">Ketikkan 6 digit kode angka yang tampil di layar proyektor:</div>
                <div class="pin-input">
                  <div class="pin-digit">8</div>
                  <div class="pin-digit">4</div>
                  <div class="pin-digit">9</div>
                  <div class="pin-digit">2</div>
                  <div class="pin-digit">0</div>
                  <div class="pin-digit">1</div>
                </div>
                <div style="font-size:12px; color:#15803d; font-weight:700; margin-bottom:18px;">✓ Kode Valid · Status: Siap Dicatat</div>
                <button class="btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:15px; background:#166534;">Kirim Presensi Kehadiran</button>
                <div style="font-size:11px; color:#94a3b8; margin-top:12px;">Waktu dan lokasi perkuliahan Anda dicatat otomatis oleh sistem kampus.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },

  // 5. LEMBAR ROSTER MANUAL DOSEN
  {
    name: "05-presensi-roster-manual",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      table { width: 100%; border-collapse: collapse; margin-top: 16px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      th { background: #f1f5f9; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
      td { padding: 12px 16px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
      select { padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; background: white; }
      input[type="text"] { padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 12px; width: 220px; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a/attendance/roster</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN</span></div>
          <div class="user-badge"><span>Dr. Ir. Budi Santoso, M.Kom · Dosen Pengampu</span><div class="avatar">BS</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div>
              <h2 style="font-size:20px; color:#0f172a;">Lembar Presensi (Roster) · Pertemuan 4</h2>
              <div style="font-size:13px; color:#64748b; margin-top:2px;">Koreksi kehadiran mahasiswa, pengisian status manual jika terkendala HP, dan catatan izin resmi.</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-primary" style="background:#0284c7;">⚡ Tandai Semua Hadir</button>
              <button class="btn-primary" style="background:#166534;">💾 Simpan Perubahan</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th style="width:130px;">NIM</th>
                <th>Nama Mahasiswa</th>
                <th style="width:150px;">Status Presensi</th>
                <th style="width:120px;">Waktu Check-In</th>
                <th>Keterangan / Catatan Izin</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><strong>202401001</strong></td>
                <td>Ahmad Fauzi</td>
                <td><span class="badge badge-green">HADIR</span></td>
                <td>14:02 WITA</td>
                <td style="color:#94a3b8; font-size:12px;">Mandiri (Kode 6-Digit)</td>
              </tr>
              <tr>
                <td>2</td>
                <td><strong>202401002</strong></td>
                <td>Bela Maharani</td>
                <td><span class="badge badge-green">HADIR</span></td>
                <td>14:04 WITA</td>
                <td style="color:#94a3b8; font-size:12px;">Mandiri (Pindai Barcode QR)</td>
              </tr>
              <tr>
                <td>3</td>
                <td><strong>202401003</strong></td>
                <td>Cahya Ramadhan</td>
                <td>
                  <select style="border-color:#eab308; color:#a16207;">
                    <option selected>IZIN (DISPENSASI)</option>
                    <option>HADIR</option>
                    <option>SAKIT</option>
                    <option>ALFA</option>
                  </select>
                </td>
                <td>-</td>
                <td><input type="text" value="Surat Dispensasi BEM No. 12/X/2026" /></td>
              </tr>
              <tr>
                <td>4</td>
                <td><strong>202401004</strong></td>
                <td>Dewi Lestari</td>
                <td>
                  <select style="border-color:#ef4444; color:#b91c1c;">
                    <option selected>SAKIT (DOKTER)</option>
                    <option>HADIR</option>
                    <option>IZIN</option>
                    <option>ALFA</option>
                  </select>
                </td>
                <td>-</td>
                <td><input type="text" value="Surat Dokter Klinik UAY No. 45" /></td>
              </tr>
              <tr>
                <td>5</td>
                <td><strong>202401005</strong></td>
                <td>Eko Prasetyo</td>
                <td>
                  <select style="border-color:#dc2626; color:#dc2626;">
                    <option selected>ALFA (TIDAK HADIR)</option>
                    <option>HADIR</option>
                    <option>IZIN</option>
                    <option>SAKIT</option>
                  </select>
                </td>
                <td>-</td>
                <td><input type="text" placeholder="Catatan opsional..." /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body></html>`
  },

  // 6. REKAP PRESENSI SEMESTER
  {
    name: "06-rekap-presensi-semester",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      table { width: 100%; border-collapse: collapse; margin-top: 16px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      th { background: #f1f5f9; text-align: center; padding: 10px 8px; font-size: 11px; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #e2e8f0; }
      td { padding: 10px 8px; font-size: 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; text-align: center; }
      .p-dot { width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }
      .p-h { background: #dcfce7; color: #15803d; }
      .p-i { background: #fef9c3; color: #854d0e; }
      .p-s { background: #dbeafe; color: #1d4ed8; }
      .p-a { background: #fee2e2; color: #b91c1c; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a/attendance/recap</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN & PRODI</span></div>
          <div class="user-badge"><span>Program Studi Teknik Informatika · Semester Ganjil 2026/2027</span><div class="avatar">IF</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="font-size:20px; color:#0f172a;">Rekapitulasi Presensi Semester Perkuliahan</h2>
              <div style="font-size:13px; color:#64748b; margin-top:2px;">Syarat Kelayakan Ujian Akhir Semester (UAS): Minimal 75% Total Kehadiran.</div>
            </div>
            <button class="btn-primary" style="background:#166534;">📥 Ekspor Laporan Presensi (Excel / CSV)</button>
          </div>

          <div style="display:flex; gap:16px; margin-top:16px;">
            <div style="background:white; padding:12px 18px; border-radius:8px; border:1px solid #e2e8f0; flex:1;">
              <div style="font-size:12px; color:#64748b;">Total Pertemuan Selesai</div>
              <div style="font-size:22px; font-weight:800; color:#0f172a;">14 Sesi Kuliah</div>
            </div>
            <div style="background:white; padding:12px 18px; border-radius:8px; border:1px solid #e2e8f0; flex:1;">
              <div style="font-size:12px; color:#64748b;">Mahasiswa Layak Ujian (≥75%)</div>
              <div style="font-size:22px; font-weight:800; color:#16a34a;">40 / 42 Mahasiswa (95.2%)</div>
            </div>
            <div style="background:white; padding:12px 18px; border-radius:8px; border:1px solid #e2e8f0; flex:1;">
              <div style="font-size:12px; color:#64748b;">Mahasiswa Tidak Layak (&lt;75%)</div>
              <div style="font-size:22px; font-weight:800; color:#dc2626;">2 Mahasiswa (Perlu Konseling)</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:110px; text-align:left;">NIM</th>
                <th style="width:180px; text-align:left;">Nama Mahasiswa</th>
                <th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>P5</th><th>P6</th><th>P7</th><th>P8</th><th>P9</th><th>P10</th><th>P11</th><th>P12</th><th>P13</th><th>P14</th>
                <th>Hadir</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Alfa</th>
                <th>Persentase</th>
                <th style="width:130px;">Status UAS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:left;"><strong>202401001</strong></td>
                <td style="text-align:left;">Ahmad Fauzi</td>
                <td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td>
                <td>14</td><td>0</td><td>0</td><td>0</td>
                <td><strong>100%</strong></td>
                <td><span class="badge badge-green">LAYAK UJIAN</span></td>
              </tr>
              <tr>
                <td style="text-align:left;"><strong>202401002</strong></td>
                <td style="text-align:left;">Bela Maharani</td>
                <td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-i">I</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-s">S</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td>
                <td>12</td><td>1</td><td>1</td><td>0</td>
                <td><strong>85.7%</strong></td>
                <td><span class="badge badge-green">LAYAK UJIAN</span></td>
              </tr>
              <tr>
                <td style="text-align:left;"><strong>202401005</strong></td>
                <td style="text-align:left;">Eko Prasetyo</td>
                <td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-a">A</span></td><td><span class="p-dot p-a">A</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-a">A</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-a">A</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-a">A</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-a">A</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td><td><span class="p-dot p-h">H</span></td>
                <td>8</td><td>0</td><td>0</td><td>6</td>
                <td style="color:#dc2626;"><strong>57.1%</strong></td>
                <td><span class="badge badge-red">TIDAK LAYAK</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body></html>`
  },

  // 7. UNGGAH MATERI KULIAH DOSEN
  {
    name: "07-unggah-materi-kuliah",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .modal-card { width: 620px; background: white; border-radius: 12px; margin: 0 auto; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); overflow: hidden; }
      .type-selector { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 16px 0; }
      .type-btn { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 8px; text-align: center; cursor: pointer; background: white; }
      .type-btn.active { border-color: #166534; background: #f0fdf4; color: #166534; font-weight: 700; }
      .dropzone { border: 2px dashed #94a3b8; border-radius: 8px; padding: 24px; text-align: center; background: #f8fafc; margin: 16px 0; }
      .form-group { margin-bottom: 14px; text-align: left; }
      .form-label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 4px; }
      .form-input { width: 100%; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a/materials/new</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN</span></div>
          <div class="user-badge"><span>Dr. Ir. Budi Santoso, M.Kom · Dosen Pengampu</span><div class="avatar">BS</div></div>
        </div>
        <div class="content">
          <div class="modal-card">
            <div style="background:#173e61; color:white; padding:16px 20px;">
              <h3 style="font-size:17px; font-weight:700;">Tambah Bahan Perkuliahan Baru</h3>
              <div style="font-size:12px; color:#93c5fd; margin-top:2px;">Pertemuan 4: Algoritma Greedy & Penyelesaian Masalah</div>
            </div>
            <div style="padding:24px;">
              <div class="form-group">
                <label class="form-label">Pilih Jenis Bahan Ajar:</label>
                <div class="type-selector">
                  <div class="type-btn active">📄 Dokumen (PDF)</div>
                  <div class="type-btn">📊 Slide Presentasi</div>
                  <div class="type-btn">🎥 Video Kuliah</div>
                  <div class="type-btn">🔗 Tautan Luar</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Judul Materi Perkuliahan</label>
                <input class="form-input" type="text" value="Modul 04 - Algoritma Greedy dan Fractional Knapsack" />
              </div>

              <div class="form-group">
                <label class="form-label">Deskripsi / Petunjuk untuk Mahasiswa (Opsional)</label>
                <textarea class="form-input" style="height:60px;">Pelajari bab ini sebelum mengikuti kuis. Perhatikan studi kasus di halaman 15.</textarea>
              </div>

              <div class="dropzone">
                <div style="font-size:24px;">📤</div>
                <div style="font-size:13px; font-weight:600; color:#0f172a; margin-top:6px;">Klik untuk Memilih File atau Tarik Berkas ke Sini</div>
                <div style="font-size:11px; color:#64748b; margin-top:2px;">Format yang didukung: PDF, PPTX, DOCX, MP4 (Maksimal 50 MB)</div>
                <div style="margin-top:10px; display:inline-block; padding:4px 10px; background:#e2e8f0; border-radius:4px; font-size:12px; color:#334155;">
                  📄 modul_04_greedy_uay.pdf (2.4 MB)
                </div>
              </div>

              <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:10px 14px; margin-bottom:18px; text-align:left;">
                <label style="display:flex; align-items:center; gap:8px; font-size:13px; color:#166534; font-weight:600; cursor:pointer;">
                  <input type="checkbox" checked /> Kunci Unduhan: Mahasiswa wajib membaca dokumen sebelum tombol unduh aktif
                </label>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button class="btn-secondary">Batal</button>
                <button class="btn-primary" style="background:#166534;">Simpan & Terbitkan Materi</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },

  // 8. PENGUMPULAN TUGAS MAHASISWA
  {
    name: "08-pengumpulan-tugas-mahasiswa",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .task-card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; padding: 26px; margin-bottom: 20px; }
      .status-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a/assignments/tugas-1</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">MAHASISWA</span></div>
          <div class="user-badge"><span>Ahmad Fauzi (NIM: 202401001) · S1 Teknik Informatika</span><div class="avatar">AF</div></div>
        </div>
        <div class="content">
          <div class="task-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <span class="badge badge-blue">TUGAS MANDIRI 1</span>
                <h2 style="font-size:22px; color:#0f172a; margin-top:6px;">Analisis Kompleksitas Waktu Algoritma Greedy</h2>
                <div style="font-size:13px; color:#64748b; margin-top:4px;">Dosen Pengampu: Dr. Ir. Budi Santoso, M.Kom · Bobot Nilai: 100 Poin</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px; color:#64748b;">Batas Waktu Pengumpulan:</div>
                <div style="font-size:15px; font-weight:800; color:#dc2626; margin-top:2px;">15 Oktober 2026, 23:59 WITA</div>
              </div>
            </div>

            <hr style="border:none; border-top:1px solid #f1f5f9; margin:16px 0;" />

            <div style="font-size:13px; color:#334155; line-height:1.6;">
              <strong>Instruksi Pengerjaan:</strong><br />
              1. Kerjakan analisis Big-O untuk masalah Fractional Knapsack vs 0/1 Knapsack.<br />
              2. Tuliskan jawaban dalam format dokumen rapi (diagram diperbolehkan).<br />
              3. Simpan lembar jawaban Anda dalam format <strong>PDF</strong> sebelum diunggah ke sistem.
            </div>
          </div>

          <div class="status-card">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge badge-green" style="font-size:12px;">✓ SUDAH DIKUMPULKAN TEPAT WAKTU</span>
                <span style="font-size:12px; color:#64748b;">(Dikirim pada 14 Oktober 2026, 09.30 WITA)</span>
              </div>
              <div style="font-size:14px; font-weight:700; color:#0f172a; margin-top:8px;">
                📄 Tugas1_AhmadFauzi_202401001.pdf <span style="font-size:12px; color:#64748b; font-weight:normal;">(1.4 MB)</span>
              </div>
              <div style="font-size:12px; color:#15803d; margin-top:4px;">Status Penilaian: Menunggu pemeriksaan oleh dosen pengampu.</div>
            </div>
            <div>
              <button class="btn-secondary" style="margin-right:8px;">Lihat Berkas</button>
              <button class="btn-primary" style="background:#0284c7;">Perbarui Berkas</button>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },

  // 9. PEMERIKSAAN & PENILAIAN TUGAS DOSEN
  {
    name: "09-pemeriksaan-tugas-dosen",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .split-container { display: flex; gap: 18px; margin-top: 14px; }
      .preview-pane { flex: 1.2; background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; min-height: 440px; }
      .grading-pane { flex: 0.8; background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; }
      .pdf-mock { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; font-size: 12px; color: #475569; height: 380px; overflow-y: hidden; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a/grading/tugas-1</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN</span></div>
          <div class="user-badge"><span>Dr. Ir. Budi Santoso, M.Kom · Dosen Pengampu</span><div class="avatar">BS</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="font-size:20px; color:#0f172a;">Penilaian Tugas: Analisis Algoritma Greedy</h2>
              <div style="font-size:13px; color:#64748b; margin-top:2px;">Memeriksa mahasiswa 1 dari 42 · <strong>Ahmad Fauzi (202401001)</strong></div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn-secondary">◀ Sebelumnya</button>
              <button class="btn-secondary">Berikutnya ▶</button>
            </div>
          </div>

          <div class="split-container">
            <div class="preview-pane">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong style="font-size:13px; color:#1e293b;">📄 Tugas1_AhmadFauzi_202401001.pdf</strong>
                <span class="badge badge-green">Tepat Waktu</span>
              </div>
              <div class="pdf-mock">
                <div style="text-align:center; font-weight:bold; font-size:14px; color:#0f172a; margin-bottom:10px;">
                  LAPORAN TUGAS 1: KOMPLEKSITAS ALGORITMA GREEDY<br />
                  <span style="font-size:11px; font-weight:normal; color:#64748b;">Oleh: Ahmad Fauzi (NIM: 202401001) - Universitas Achmad Yani</span>
                </div>
                <hr style="border:none; border-top:1px solid #cbd5e1; margin:10px 0;" />
                <p><strong>1. Pendahuluan Masalah Knapsack</strong><br />
                Permasalahan Knapsack terbagi menjadi dua varian utama: Fractional Knapsack dan 0/1 Knapsack. Pada Fractional Knapsack, elemen dapat dibagi menjadi pecahan rasio bobot-nilai, sehingga strategi Greedy terbukti menghasilkan solusi optimal secara global.</p>
                <p style="margin-top:8px;"><strong>2. Analisis Kompleksitas Waktu (Big-O)</strong><br />
                Tahap pengurutan (sorting) rasio nilai per berat item membutuhkan waktu O(n log n). Tahap iterasi pemilihan item membutuhkan waktu O(n). Sehingga total kompleksitas algoritma adalah O(n log n)...</p>
              </div>
            </div>

            <div class="grading-pane">
              <h3 style="font-size:15px; color:#0f172a; margin-bottom:14px;">Formulir Penilaian Dosen</h3>
              <div style="margin-bottom:14px;">
                <label style="display:block; font-size:13px; font-weight:600; color:#334155; margin-bottom:4px;">Nilai Angka (0 - 100):</label>
                <input type="number" value="88" style="width:100%; font-size:24px; font-weight:800; padding:10px; border:2px solid #166534; border-radius:6px; color:#166534;" />
              </div>

              <div style="margin-bottom:14px;">
                <label style="display:block; font-size:13px; font-weight:600; color:#334155; margin-bottom:4px;">Catatan & Saran Evaluasi:</label>
                <textarea style="width:100%; height:110px; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">Penjelasan analisis O(n log n) sudah sangat tepat dan terstruktur. Pembahasan pembuktian sifat greedy-choice perlu diperdalam pada tugas berikutnya. Pertahankan prestasinya!</textarea>
              </div>

              <button class="btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:14px; background:#166534;">
                💾 Simpan Nilai & Lanjut ke Mahasiswa Berikutnya
              </button>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },

  // 10. BUKU NILAI DOSEN (GRADEBOOK)
  {
    name: "10-buku-nilai-gradebook",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      table { width: 100%; border-collapse: collapse; margin-top: 14px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      th { background: #f1f5f9; text-align: center; padding: 10px 10px; font-size: 11px; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #e2e8f0; }
      td { padding: 10px 10px; font-size: 12px; color: #1e293b; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f1f5f9; text-align: center; }
      .weight-badge { font-size: 10px; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px; display: block; margin-top: 2px; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/classes/if-201-a/gradebook</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN</span></div>
          <div class="user-badge"><span>Dr. Ir. Budi Santoso, M.Kom · Dosen Pengampu</span><div class="avatar">BS</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="font-size:20px; color:#0f172a;">Buku Nilai (Gradebook) & Rekap Nilai Akhir</h2>
              <div style="font-size:13px; color:#64748b; margin-top:2px;">Kalkulasi otomatis berdasarkan bobot resmi: Presensi 10%, Tugas 25%, Kuis 15%, UTS 25%, UAS 25%.</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-secondary">⚙️ Atur Bobot Komponen</button>
              <button class="btn-primary" style="background:#166534;">📥 Ekspor Nilai Akhir ke Excel</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:110px; text-align:left;">NIM</th>
                <th style="width:180px; text-align:left;">Nama Mahasiswa</th>
                <th>Presensi<span class="weight-badge">10%</span></th>
                <th>Tugas<span class="weight-badge">25%</span></th>
                <th>Kuis<span class="weight-badge">15%</span></th>
                <th>UTS<span class="weight-badge">25%</span></th>
                <th>UAS<span class="weight-badge">25%</span></th>
                <th style="background:#f0fdf4;">Nilai Akhir<span class="weight-badge" style="color:#166534; background:#dcfce7;">100%</span></th>
                <th style="background:#f0fdf4; width:90px;">Huruf Mutu</th>
                <th style="width:110px;">Status Kelulusan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align:left;"><strong>202401001</strong></td>
                <td style="text-align:left;">Ahmad Fauzi</td>
                <td>100.0</td>
                <td>88.0</td>
                <td>90.0</td>
                <td>85.0</td>
                <td>87.0</td>
                <td style="background:#f0fdf4; font-weight:800; color:#166534; font-size:13px;">88.50</td>
                <td style="background:#f0fdf4;"><span class="badge badge-green" style="font-size:12px;">A</span></td>
                <td><span class="badge badge-green">LULUS</span></td>
              </tr>
              <tr>
                <td style="text-align:left;"><strong>202401002</strong></td>
                <td style="text-align:left;">Bela Maharani</td>
                <td>85.7</td>
                <td>82.0</td>
                <td>78.0</td>
                <td>80.0</td>
                <td>81.0</td>
                <td style="background:#f0fdf4; font-weight:800; color:#166534; font-size:13px;">81.02</td>
                <td style="background:#f0fdf4;"><span class="badge badge-green" style="font-size:12px;">A-</span></td>
                <td><span class="badge badge-green">LULUS</span></td>
              </tr>
              <tr>
                <td style="text-align:left;"><strong>202401003</strong></td>
                <td style="text-align:left;">Cahya Ramadhan</td>
                <td>92.8</td>
                <td>75.0</td>
                <td>70.0</td>
                <td>74.0</td>
                <td>76.0</td>
                <td style="background:#f0fdf4; font-weight:800; color:#166534; font-size:13px;">76.03</td>
                <td style="background:#f0fdf4;"><span class="badge badge-green" style="font-size:12px;">B+</span></td>
                <td><span class="badge badge-green">LULUS</span></td>
              </tr>
              <tr>
                <td style="text-align:left;"><strong>202401004</strong></td>
                <td style="text-align:left;">Dewi Lestari</td>
                <td>80.0</td>
                <td>70.0</td>
                <td>65.0</td>
                <td>68.0</td>
                <td>72.0</td>
                <td style="background:#f0fdf4; font-weight:800; color:#166534; font-size:13px;">70.25</td>
                <td style="background:#f0fdf4;"><span class="badge badge-yellow" style="font-size:12px;">B</span></td>
                <td><span class="badge badge-green">LULUS</span></td>
              </tr>
              <tr>
                <td style="text-align:left;"><strong>202401005</strong></td>
                <td style="text-align:left;">Eko Prasetyo</td>
                <td>57.1</td>
                <td>50.0</td>
                <td>45.0</td>
                <td>52.0</td>
                <td>0.0</td>
                <td style="background:#fee2e2; font-weight:800; color:#b91c1c; font-size:13px;">37.96</td>
                <td style="background:#fee2e2;"><span class="badge badge-red" style="font-size:12px;">E</span></td>
                <td><span class="badge badge-red">TIDAK LULUS</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body></html>`
  },

  // 11. PENGELOLAAN KELAS OLEH ADMIN PRODI
  {
    name: "11-kelola-kelas-admin",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .filter-bar { background: white; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      th { background: #f1f5f9; text-align: left; padding: 12px 14px; font-size: 12px; font-weight: 700; color: #475569; border-bottom: 1px solid #cbd5e1; }
      td { padding: 12px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/admin/classes</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">ADMIN PROGRAM STUDI</span></div>
          <div class="user-badge"><span>Program Studi Teknik Informatika · Admin Tata Usaha</span><div class="avatar">TU</div></div>
        </div>
        <div class="content">
          <div class="filter-bar">
            <div style="display:flex; gap:12px; align-items:center;">
              <select style="padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px; font-weight:600;">
                <option selected>Semester: 2026/2027 Ganjil</option>
                <option>Semester: 2025/2026 Genap</option>
              </select>
              <input type="text" placeholder="Cari nama mata kuliah atau dosen..." style="padding:8px 14px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:260px;" />
            </div>
            <button class="btn-primary" style="background:#166534;">➕ Buka Kelas Perkuliahan Baru</button>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:100px;">Kode MK</th>
                <th>Nama Mata Kuliah & Rombel</th>
                <th>Dosen Pengampu</th>
                <th style="width:100px; text-align:center;">Peserta</th>
                <th style="width:110px; text-align:center;">Status Kelas</th>
                <th style="width:170px; text-align:right;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>IF-201</strong></td>
                <td>
                  <strong>Algoritma & Pemrograman (Kelas A - Pagi)</strong>
                  <div style="font-size:11px; color:#64748b;">3 SKS · Ruang Lab Komputer 1</div>
                </td>
                <td>Dr. Ir. Budi Santoso, M.Kom</td>
                <td style="text-align:center;"><strong>42 Mhs</strong></td>
                <td style="text-align:center;"><span class="badge badge-green">DITERBITKAN</span></td>
                <td style="text-align:right;">
                  <button class="btn-secondary" style="padding:4px 8px; font-size:11px;">+ Dosen</button>
                  <button class="btn-secondary" style="padding:4px 8px; font-size:11px;">+ Mhs</button>
                  <button class="btn-blue" style="padding:4px 8px; font-size:11px;">Kelola</button>
                </td>
              </tr>
              <tr>
                <td><strong>IF-204</strong></td>
                <td>
                  <strong>Struktur Data & Kompleksitas (Kelas A)</strong>
                  <div style="font-size:11px; color:#64748b;">3 SKS · Ruang Teori B.204</div>
                </td>
                <td>Siti Rahmah, S.T., M.Cs.</td>
                <td style="text-align:center;"><strong>40 Mhs</strong></td>
                <td style="text-align:center;"><span class="badge badge-green">DITERBITKAN</span></td>
                <td style="text-align:right;">
                  <button class="btn-secondary" style="padding:4px 8px; font-size:11px;">+ Dosen</button>
                  <button class="btn-secondary" style="padding:4px 8px; font-size:11px;">+ Mhs</button>
                  <button class="btn-blue" style="padding:4px 8px; font-size:11px;">Kelola</button>
                </td>
              </tr>
              <tr>
                <td><strong>KU-101</strong></td>
                <td>
                  <strong>Bahasa Indonesia & Tata Tulis Ilmiah (Kelas B)</strong>
                  <div style="font-size:11px; color:#64748b;">2 SKS · Dosen Lintas Fakultas</div>
                </td>
                <td>Drs. H. Ahmad Yani, M.Pd.</td>
                <td style="text-align:center;"><strong>45 Mhs</strong></td>
                <td style="text-align:center;"><span class="badge badge-yellow">DRAFT KELAS</span></td>
                <td style="text-align:right;">
                  <button class="btn-secondary" style="padding:4px 8px; font-size:11px;">+ Dosen</button>
                  <button class="btn-secondary" style="padding:4px 8px; font-size:11px;">+ Mhs</button>
                  <button class="btn-blue" style="padding:4px 8px; font-size:11px;">Kelola</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body></html>`
  },

  // 12. PUSAT BANTUAN HELPDESK
  {
    name: "12-pusat-bantuan-helpdesk",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .search-box { width: 100%; padding: 14px 20px; font-size: 15px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin: 18px 0; }
      .pill { padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: white; color: #475569; }
      .pill-active { background: #166534; color: white; border-color: #166534; }
      .article-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px 22px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .helpdesk-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://e-learning.uay.ac.id/help</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">PUSAT BANTUAN</span></div>
          <div class="user-badge"><span>Dukungan Mahasiswa, Dosen & Tenaga Kependidikan</span><div class="avatar">?</div></div>
        </div>
        <div class="content">
          <div style="text-align:center; max-width:680px; margin:0 auto;">
            <h1 style="font-size:24px; color:#0f172a;">Pusat Bantuan & Panduan Pengguna E-Learning UAY</h1>
            <p style="font-size:14px; color:#64748b; margin-top:6px;">Temukan solusi cepat, panduan operasional per peran, dan jawaban kendala perkuliahan.</p>
            <input class="search-box" type="text" value="cara mengisi presensi mandiri" />
            <div style="display:flex; justify-content:center; gap:8px; margin-bottom:20px;">
              <span class="pill pill-active">Semua Panduan</span>
              <span class="pill">Untuk Mahasiswa</span>
              <span class="pill">Untuk Dosen</span>
              <span class="pill">Untuk Admin Prodi</span>
            </div>
          </div>

          <div style="max-width:820px; margin:0 auto;">
            <div class="article-card">
              <div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                  <span class="badge badge-blue">MAHASISWA</span>
                  <span class="badge badge-green">PRESENSI</span>
                </div>
                <h4 style="font-size:15px; color:#0f172a;">Cara Mengisi Presensi Mandiri dengan Kode 6 Digit atau Barcode QR</h4>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">Panduan langkah memasukkan kode saat dosen membuka sesi di ruang kelas.</div>
              </div>
              <span style="font-size:20px; color:#94a3b8;">→</span>
            </div>

            <div class="article-card">
              <div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                  <span class="badge badge-yellow">DOSEN</span>
                  <span class="badge badge-green">PRESENSI</span>
                </div>
                <h4 style="font-size:15px; color:#0f172a;">Panduan Membuka Presensi Perkuliahan & Mode Layar Proyektor</h4>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">Cara menampilkan kode 6 digit dan barcode QR di proyektor kelas perkuliahan.</div>
              </div>
              <span style="font-size:20px; color:#94a3b8;">→</span>
            </div>

            <div class="article-card">
              <div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                  <span class="badge badge-yellow">DOSEN</span>
                  <span class="badge badge-slate">KELAS</span>
                </div>
                <h4 style="font-size:15px; color:#0f172a;">Menyalin Materi ke Semester Baru dengan Fitur Kloning Kelas</h4>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">Cara mudah menggandakan silabus dan materi tanpa membawa data mahasiswa lama.</div>
              </div>
              <span style="font-size:20px; color:#94a3b8;">→</span>
            </div>

            <div class="helpdesk-banner">
              <div>
                <div style="font-size:12px; font-weight:700; color:#166534;">MEMBUTUHKAN BANTUAN TEKNIS LANGSUNG?</div>
                <div style="font-size:13px; color:#14532d; margin-top:2px;">Kirimkan email ke: <strong>elearning-support@uay.ac.id</strong> atau kunjungi Tim TIK di Gedung Rektorat Lt. 2.</div>
              </div>
              <button class="btn-primary" style="background:#166534;">Hubungi Helpdesk</button>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  }
];

console.log(`Starting generation of ${shots.length} UI screenshots...`);
for (const shot of shots) {
  const htmlPath = resolve(`scratch/shots/${shot.name}.html`);
  const pngPath = resolve(`docs/images/${shot.name}.png`);
  writeFileSync(htmlPath, shot.html);
  
  const cmd = `"${chromePath}" --headless --disable-gpu --window-size=1200,820 --screenshot="${pngPath}" "file:///${htmlPath.replaceAll("\\", "/")}"`;
  console.log(`Rendering: ${shot.name}...`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("All 12 UI screenshot images generated successfully in docs/images!");
