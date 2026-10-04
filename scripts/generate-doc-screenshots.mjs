import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

mkdirSync(resolve("docs/images"), { recursive: true });
mkdirSync(resolve("scratch/shots"), { recursive: true });

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const baseCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  body { background: #0f172a; padding: 30px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .browser-window { width: 1060px; background: #ffffff; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); overflow: hidden; border: 1px solid #e2e8f0; }
  .browser-bar { background: #f8fafc; padding: 12px 18px; display: flex; align-items: center; border-bottom: 1px solid #e2e8f0; gap: 8px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  .dot-red { background: #ef4444; }
  .dot-yellow { background: #f59e0b; }
  .dot-green { background: #10b981; }
  .browser-url { margin-left: 12px; flex: 1; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 14px; font-size: 13px; color: #475569; display: flex; align-items: center; gap: 6px; }
  .nav-header { background: #173e61; color: white; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
  .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 17px; letter-spacing: -0.3px; }
  .brand-badge { background: #38bdf8; color: #0c4a6e; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; }
  .user-badge { display: flex; align-items: center; gap: 10px; font-size: 13px; }
  .avatar { width: 34px; height: 34px; border-radius: 50%; background: #38bdf8; color: #0c4a6e; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 13px; }
  .content { padding: 28px 32px; background: #f8fafc; min-height: 520px; }
  .btn-primary { background: #2563eb; color: white; border: none; border-radius: 6px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px 16px; font-size: 13px; font-weight: 600; }
  .btn-success { background: #10b981; color: white; border: none; border-radius: 6px; padding: 9px 16px; font-size: 13px; font-weight: 600; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-yellow { background: #fef9c3; color: #854d0e; }
  .badge-blue { background: #dbeafe; color: #1d4ed8; }
  .badge-red { background: #fee2e2; color: #b91c1c; }
  .badge-slate { background: #f1f5f9; color: #475569; }
`;

const shots = [
  {
    name: "01-presensi-proyektor-dosen",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .projector-card { background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); padding: 32px; text-align: center; }
      .code-display { font-family: monospace; font-size: 56px; font-weight: 800; letter-spacing: 14px; color: #1e3a8a; background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 20px 30px; display: inline-block; margin: 24px 0; }
      .qr-box { width: 140px; height: 140px; background: white; border: 2px solid #cbd5e1; border-radius: 10px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; color: #64748b; }
      .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
      .stat-item { background: #f8fafc; border-radius: 8px; padding: 14px; border: 1px solid #e2e8f0; }
      .stat-val { font-size: 26px; font-weight: 800; color: #0f172a; }
      .stat-lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://elearning.uay.ac.id/classes/if-201-a/attendance/projector</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN</span></div>
          <div class="user-badge"><span>Dr. Ir. Budi Santoso, M.Kom (NIDN: 0412087501)</span><div class="avatar">BS</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
              <div style="font-size:12px; font-weight:700; color:#2563eb; letter-spacing:0.5px;">MODE TAMPILAN PROYEKTOR · PERKULIAHAN TATAP MUKA</div>
              <h2 style="font-size:22px; color:#0f172a; margin-top:4px;">IF-201 Algoritma & Pemrograman · Pertemuan 4: Algoritma Greedy</h2>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-secondary">⚙️ Pengaturan Durasi</button>
              <button class="btn-primary" style="background:#dc2626;">⏹️ Tutup Presensi Sekarang</button>
            </div>
          </div>
          <div class="projector-card">
            <span class="badge badge-green" style="font-size:13px; padding:6px 14px;">● SESI PRESENSI AKTIF BERJALAN</span>
            <div style="font-size:14px; color:#475569; margin-top:14px;">Minta mahasiswa membuka aplikasi E-Learning UAY di kelas lalu masukkan 6 digit kode di bawah:</div>
            
            <div class="code-display">8 4 9 2 0 1</div>
            
            <div style="display:flex; justify-content:center; align-items:center; gap:40px; margin-top:10px;">
              <div class="qr-box">
                <svg width="90" height="90" viewBox="0 0 24 24" fill="#0f172a"><path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h2v4h-2v-4zm2 2h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zm-12 12h2v2H5v-2z"/></svg>
                <span>Pindai QR Code</span>
              </div>
              <div style="text-align:left;">
                <div style="font-size:12px; color:#64748b; font-weight:600;">SISA WAKTU PENGISIAN:</div>
                <div style="font-size:36px; font-weight:800; color:#ea580c; font-family:monospace;">14 : 38</div>
                <div style="font-size:12px; color:#64748b; margin-top:4px;">Batas waktu toleransi: 15 menit sejak sesi dibuka</div>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-item"><div class="stat-val" style="color:#16a34a;">38 / 42</div><div class="stat-lbl">Mahasiswa Hadir (90.5%)</div></div>
              <div class="stat-item"><div class="stat-val" style="color:#d97706;">1</div><div class="stat-lbl">Izin Dispensasi (Surat)</div></div>
              <div class="stat-item"><div class="stat-val" style="color:#dc2626;">3</div><div class="stat-lbl">Belum Check-in / Alfa</div></div>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  },
  {
    name: "02-presensi-mandiri-mahasiswa",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .banner { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .modal-overlay { background: rgba(15, 23, 42, 0.65); padding: 40px; border-radius: 12px; display: flex; justify-content: center; }
      .modal-card { width: 480px; background: white; border-radius: 14px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2); overflow: hidden; }
      .modal-header { background: #173e61; color: white; padding: 18px 24px; }
      .modal-body { padding: 24px; text-align: center; }
      .pin-input { display: flex; justify-content: center; gap: 10px; margin: 20px 0; }
      .pin-digit { width: 48px; height: 56px; border: 2px solid #3b82f6; border-radius: 8px; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; color: #1e3a8a; background: #f8fafc; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://elearning.uay.ac.id/classes/if-201-a</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">MAHASISWA</span></div>
          <div class="user-badge"><span>Ahmad Fauzi (NIM: 202401001) · Teknik Informatika</span><div class="avatar">AF</div></div>
        </div>
        <div class="content">
          <div class="banner">
            <div>
              <div style="font-size:12px; font-weight:700; color:#1d4ed8; letter-spacing:0.5px;">● PERKULIAHAN SEDANG BERLANGSUNG</div>
              <h3 style="color:#0f172a; margin-top:2px; font-size:17px;">Sesi Presensi Pertemuan 4 Telah Dibuka oleh Dosen Pengampu</h3>
              <div style="font-size:13px; color:#475569; margin-top:4px;">Masukkan 6-digit kode kehadiran yang ditampilkan pada layar kelas sebelum waktu berakhir.</div>
            </div>
            <button class="btn-primary" style="padding:12px 22px; font-size:14px;">📍 Isi Presensi Sekarang</button>
          </div>

          <!-- Dialog Preview -->
          <div class="modal-overlay">
            <div class="modal-card">
              <div class="modal-header">
                <div style="font-size:12px; color:#38bdf8; font-weight:700;">FORMULIR PRESENSI MANDIRI</div>
                <h3 style="font-size:18px; margin-top:2px;">Pertemuan 4: Algoritma Greedy</h3>
              </div>
              <div class="modal-body">
                <div style="font-size:13px; color:#475569;">Masukkan 6 digit kode kehadiran yang tertera di layar proyektor dosen:</div>
                <div class="pin-input">
                  <div class="pin-digit">8</div>
                  <div class="pin-digit">4</div>
                  <div class="pin-digit">9</div>
                  <div class="pin-digit">2</div>
                  <div class="pin-digit">0</div>
                  <div class="pin-digit">1</div>
                </div>
                <div style="font-size:12px; color:#15803d; font-weight:600; margin-bottom:18px;">✓ Kode valid & siap diverifikasi</div>
                <button class="btn-primary" style="width:100%; justify-content:center; padding:12px; font-size:15px;">Kirim Presensi Kehadiran</button>
                <div style="font-size:11px; color:#94a3b8; margin-top:12px;">Sistem mencatat waktu kehadiran Anda secara otomatis di server UAY.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </body></html>`
  },
  {
    name: "03-presensi-roster-manual",
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
          <div class="browser-url">🔒 https://elearning.uay.ac.id/classes/if-201-a/attendance/roster</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN</span></div>
          <div class="user-badge"><span>Dr. Ir. Budi Santoso, M.Kom · Dosen Pengampu</span><div class="avatar">BS</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div>
              <h2 style="font-size:20px; color:#0f172a;">Lembar Presensi (Roster) · Pertemuan 4</h2>
              <div style="font-size:13px; color:#64748b; margin-top:2px;">Koreksi kehadiran mahasiswa, pengisian status manual, dan catatan izin resmi.</div>
            </div>
            <div style="display:flex; gap:10px;">
              <button class="btn-primary" style="background:#0284c7;">⚡ Tandai Semua Hadir</button>
              <button class="btn-success">💾 Simpan Perubahan</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:40px;">No</th>
                <th style="width:130px;">NIM</th>
                <th>Nama Mahasiswa</th>
                <th style="width:140px;">Status Presensi</th>
                <th style="width:120px;">Waktu Check-In</th>
                <th>Catatan Dispensasi / Alasan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td><strong>202401001</strong></td>
                <td>Ahmad Fauzi</td>
                <td><span class="badge badge-green">HADIR</span></td>
                <td>14:02 WIB</td>
                <td style="color:#94a3b8; font-size:12px;">Mandiri (Kode 6-Digit)</td>
              </tr>
              <tr>
                <td>2</td>
                <td><strong>202401002</strong></td>
                <td>Bela Maharani</td>
                <td><span class="badge badge-green">HADIR</span></td>
                <td>14:04 WIB</td>
                <td style="color:#94a3b8; font-size:12px;">Mandiri (QR Code)</td>
              </tr>
              <tr>
                <td>3</td>
                <td><strong>202401003</strong></td>
                <td>Cahya Ramadhan</td>
                <td>
                  <select style="border-color:#eab308; color:#a16207;">
                    <option selected>IZIN (EXCUSED)</option>
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
                    <option selected>SAKIT (SICK)</option>
                    <option>HADIR</option>
                    <option>IZIN</option>
                    <option>ALFA</option>
                  </select>
                </td>
                <td>-</td>
                <td><input type="text" value="Surat Dokter Klinik UAY" /></td>
              </tr>
              <tr>
                <td>5</td>
                <td><strong>202401005</strong></td>
                <td>Eko Prasetyo</td>
                <td>
                  <select style="border-color:#dc2626; color:#dc2626;">
                    <option selected>ALFA (ABSENT)</option>
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
  {
    name: "04-rekap-presensi-semester",
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
          <div class="browser-url">🔒 https://elearning.uay.ac.id/classes/if-201-a/attendance/recap</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">DOSEN & PRODI</span></div>
          <div class="user-badge"><span>Program Studi Teknik Informatika · Semester Ganjil 2026/2027</span><div class="avatar">IF</div></div>
        </div>
        <div class="content">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <h2 style="font-size:20px; color:#0f172a;">Rekapitulasi Presensi Semester Perkuliahan</h2>
              <div style="font-size:13px; color:#64748b; margin-top:2px;">Ambang Batas Kelayakan Ujian: Minimal 75% Total Kehadiran Mahasiswa.</div>
            </div>
            <button class="btn-primary" style="background:#059669;">📥 Ekspor Data Presensi (CSV / Excel)</button>
          </div>

          <div style="display:flex; gap:16px; margin-top:16px;">
            <div style="background:white; padding:12px 18px; border-radius:8px; border:1px solid #e2e8f0; flex:1;">
              <div style="font-size:12px; color:#64748b;">Total Pertemuan Selesai</div>
              <div style="font-size:22px; font-weight:800; color:#0f172a;">14 Sesi</div>
            </div>
            <div style="background:white; padding:12px 18px; border-radius:8px; border:1px solid #e2e8f0; flex:1;">
              <div style="font-size:12px; color:#64748b;">Mahasiswa Memenuhi Syarat (≥75%)</div>
              <div style="font-size:22px; font-weight:800; color:#16a34a;">40 / 42 Mahasiswa (95.2%)</div>
            </div>
            <div style="background:white; padding:12px 18px; border-radius:8px; border:1px solid #e2e8f0; flex:1;">
              <div style="font-size:12px; color:#64748b;">Mahasiswa Tidak Memenuhi Syarat (&lt;75%)</div>
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
                <th style="width:140px;">Status Ujian</th>
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
  {
    name: "05-pusat-bantuan-helpdesk",
    html: `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss}
      .search-box { width: 100%; padding: 14px 20px; font-size: 15px; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02); margin: 18px 0; }
      .pill { padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid #cbd5e1; background: white; color: #475569; }
      .pill-active { background: #2563eb; color: white; border-color: #2563eb; }
      .article-card { background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px 22px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .helpdesk-banner { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
    </style></head><body>
      <div class="browser-window">
        <div class="browser-bar">
          <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
          <div class="browser-url">🔒 https://elearning.uay.ac.id/help</div>
        </div>
        <div class="nav-header">
          <div class="brand">E-Learning UAY <span class="brand-badge">PUSAT BANTUAN</span></div>
          <div class="user-badge"><span>Dukungan Mahasiswa, Dosen & Tenaga Kependidikan</span><div class="avatar">?</div></div>
        </div>
        <div class="content">
          <div style="text-align:center; max-width:680px; margin:0 auto;">
            <h1 style="font-size:24px; color:#0f172a;">Pusat Bantuan & Panduan Pengguna E-Learning UAY</h1>
            <p style="font-size:14px; color:#64748b; margin-top:6px;">Temukan solusi cepat, panduan operasional per peran, dan jawaban pertanyaan umum.</p>
            <input class="search-box" type="text" value="presensi mandiri" />
            <div style="display:flex; justify-content:center; gap:8px; margin-bottom:20px;">
              <span class="pill pill-active">Semua (50 Artikel)</span>
              <span class="pill">Mahasiswa</span>
              <span class="pill">Dosen</span>
              <span class="pill">Admin Prodi</span>
            </div>
          </div>

          <div style="max-width:820px; margin:0 auto;">
            <div class="article-card">
              <div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                  <span class="badge badge-blue">MAHASISWA</span>
                  <span class="badge badge-green">PRESENSI</span>
                </div>
                <h4 style="font-size:15px; color:#0f172a;">Cara Mengisi Presensi Mandiri dengan Kode 6 Digit atau QR Code</h4>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">Langkah memasukkan kode saat dosen membuka sesi presensi di kelas perkuliahan.</div>
              </div>
              <span style="font-size:20px; color:#94a3b8;">→</span>
            </div>

            <div class="article-card">
              <div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                  <span class="badge badge-yellow">DOSEN</span>
                  <span class="badge badge-green">PRESENSI</span>
                </div>
                <h4 style="font-size:15px; color:#0f172a;">Panduan Membuka Presensi Perkuliahan & Mode Proyektor Kelas</h4>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">Menampilkan kode 6 digit dan QR Code di layar proyektor untuk mahasiswa.</div>
              </div>
              <span style="font-size:20px; color:#94a3b8;">→</span>
            </div>

            <div class="article-card">
              <div>
                <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
                  <span class="badge badge-yellow">DOSEN</span>
                  <span class="badge badge-slate">KELAS</span>
                </div>
                <h4 style="font-size:15px; color:#0f172a;">Kloning Kelas ke Semester Baru Tanpa Menghilangkan Struktur Materi</h4>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">Duplikasi kelas dengan reset tanggal draf bersih dan penentuan tahun ajaran baru.</div>
              </div>
              <span style="font-size:20px; color:#94a3b8;">→</span>
            </div>

            <div class="helpdesk-banner">
              <div>
                <div style="font-size:12px; font-weight:700; color:#15803d;">MEMERLUKAN BANTUAN LEBIH LANJUT?</div>
                <div style="font-size:13px; color:#166534; margin-top:2px;">Hubungi Layanan Terpadu TIK melalui email: <strong>elearning-support@uay.ac.id</strong> atau kunjungi Ruang B201.</div>
              </div>
              <button class="btn-success">Hubungi Tim Helpdesk</button>
            </div>
          </div>
        </div>
      </div>
    </body></html>`
  }
];

for (const shot of shots) {
  const htmlPath = resolve(`scratch/shots/${shot.name}.html`);
  const pngPath = resolve(`docs/images/${shot.name}.png`);
  writeFileSync(htmlPath, shot.html);
  
  const cmd = `"${chromePath}" --headless --disable-gpu --window-size=1180,780 --screenshot="${pngPath}" "file:///${htmlPath.replaceAll("\\", "/")}"`;
  console.log(`Generating screenshot: ${shot.name}...`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("All UI screenshot images generated successfully in docs/images!");
