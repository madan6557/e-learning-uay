import { writeFileSync, copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const projectRoot = "E:\\UVAYA\\Project";
const elearningRoot = join(projectRoot, "E - Learning UAY");
const tempHtmlPath = join(projectRoot, "temp_rfc_document.html");

const outputPdf1 = join(projectRoot, "docs", "RFC - Feature Request File Service Hierarchical Directories.pdf");
const outputPdf2 = join(elearningRoot, "docs", "fileservice", "RFC - Feature Request File Service Hierarchical Directories.pdf");
const artifactDir = "C:\\Users\\mikyl\\.gemini\\antigravity\\brain\\e55d8d2f-74ff-4bde-9c1a-62e04ce5fca1";
const artifactPdf = join(artifactDir, "RFC - Feature Request File Service Hierarchical Directories.pdf");

const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>RFC-UAY-FS-2026-001: Dynamic Hierarchical Directory Management for Application Clients</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 18mm 15mm;
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
      color: #0f172a;
      line-height: 1.5;
      font-size: 9.5pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    /* Header Banner */
    .header-banner {
      background: #f0f9ff;
      border-left: 6px solid #0284c7;
      border-right: 1px solid #bae6fd;
      border-top: 1px solid #bae6fd;
      border-bottom: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }

    .org-title {
      font-size: 8pt;
      font-weight: 700;
      color: #0369a1;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .doc-main-title {
      font-size: 15pt;
      font-weight: 800;
      color: #0c4a6e;
      margin: 0 0 6px 0;
      line-height: 1.25;
    }

    .doc-subtitle {
      font-size: 10pt;
      font-weight: 600;
      color: #475569;
      margin: 0;
    }

    /* Metadata Table */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 22px;
      font-size: 9pt;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }

    .meta-table td {
      padding: 7px 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    .meta-table tr:last-child td {
      border-bottom: none;
    }

    .meta-label {
      width: 25%;
      font-weight: 700;
      color: #334155;
      background: #f1f5f9;
      border-right: 1px solid #e2e8f0;
    }

    .meta-val {
      color: #0f172a;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .badge-proposed {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
    }

    .badge-high {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Sections */
    h2 {
      font-size: 12pt;
      font-weight: 800;
      color: #0369a1;
      border-bottom: 2px solid #e0f2fe;
      padding-bottom: 5px;
      margin-top: 22px;
      margin-bottom: 10px;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }

    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 22px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Tables */
    table.content-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }

    table.content-table th {
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #0284c7;
    }

    table.content-table td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    table.content-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    /* Code Blocks */
    pre {
      background: #0f172a;
      color: #f8fafc;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 8pt;
      line-height: 1.45;
      padding: 10px 14px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0 14px 0;
      page-break-inside: avoid;
    }

    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 8.5pt;
      background: #f1f5f9;
      color: #0369a1;
      padding: 1px 4px;
      border-radius: 3px;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    .comment { color: #94a3b8; }
    .keyword { color: #38bdf8; font-weight: 600; }
    .string { color: #a5f3fc; }
    .type { color: #c084fc; }

    /* Diagram & Callout */
    .diagram-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 12px 0;
      page-break-inside: avoid;
    }

    .alert-box {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      border-radius: 0 6px 6px 0;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 9pt;
      color: #1e40af;
      page-break-inside: avoid;
    }

    .alert-box strong {
      color: #1e3a8a;
    }

    .tree-box {
      background: #f1f5f9;
      border-left: 4px solid #0284c7;
      padding: 10px 14px;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 8pt;
      line-height: 1.4;
      margin: 10px 0 14px 0;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
      white-space: pre;
    }

    footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      font-size: 7.5pt;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 4px;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- Header Banner -->
  <div class="header-banner">
    <div class="org-title">Universitas Achmad Yani (UAY) • Infrastruktur Layanan Berkas Terpusat</div>
    <div class="doc-main-title">USULAN FITUR (FEATURE REQUEST / RFC)</div>
    <div class="doc-subtitle">Manajemen Direktori Hierarkis Dinamis untuk Klien Aplikasi pada UAY File Service</div>
  </div>

  <!-- Metadata Table -->
  <table class="meta-table">
    <tr>
      <td class="meta-label">Nomor Dokumen</td>
      <td class="meta-val"><strong>RFC-UAY-FS-2026-001</strong></td>
      <td class="meta-label">Tanggal Pengajuan</td>
      <td class="meta-val">13 Oktober 2026</td>
    </tr>
    <tr>
      <td class="meta-label">Pengusul / Pemohon</td>
      <td class="meta-val">Tim Pengembang E-Learning UAY</td>
      <td class="meta-label">Penerima / Sasaran</td>
      <td class="meta-val">Tim Pengembang & Pengelola UAY File Service</td>
    </tr>
    <tr>
      <td class="meta-label">Status Dokumen</td>
      <td class="meta-val"><span class="badge badge-proposed">PROPOSED (Menunggu Tinjauan Teknis)</span></td>
      <td class="meta-label">Tingkat Prioritas</td>
      <td class="meta-val"><span class="badge badge-high">TINGGI (High / Usability & Scalability)</span></td>
    </tr>
  </table>

  <!-- Section 1 -->
  <h2>1. Ringkasan Eksekutif & Latar Belakang Masalah</h2>
  <p>
    Dalam operasional integrasi akademik antara platform <strong>E-Learning UAY</strong> dan <strong>UAY File Service</strong>, seluruh berkas digital—mulai dari dokumen materi perkuliahan, modul presentasi, rekaman video, pengumpulan tugas mahasiswa, hingga berkas jawaban kuis—diunggah melalui antarmuka REST API File Service.
  </p>
  <p>
    Saat ini, seluruh berkas yang dikirimkan oleh klien aplikasi tersimpan di tingkat <strong>root repository</strong> (dengan nilai <code>folder_id = null</code>). Mengingat proyeksi volume unggahan mencapai puluhan ribu berkas per semester perkuliahan, penumpukan berkas di level <em>root</em> menimbulkan beberapa hambatan kritis:
  </p>
  <ul>
    <li><strong>Kesulitan Audit dan Navigasi Visual:</strong> Pada antarmuka <em>File Explorer Admin Console</em> File Service, ribuan berkas dari berbagai program studi, semester, dan jenis aktivitas bercampur dalam satu daftar tanpa pengelompokan folder.</li>
    <li><strong>Ketiadaan Isolasi Logis Akademik:</strong> Struktur repositori File Service tidak mencerminkan hirarki tahun akademik maupun mata kuliah, sehingga pelacakan manual membutuhkan penelusuran balik ke database E-Learning.</li>
    <li><strong>Keterbatasan Antarmuka M2M Saat Ini:</strong> Endpoint upload aplikasi klien (<code>POST /v1/repositories/:repositoryId/files</code>) menerima parameter <code>folderId</code>, namun File Service <strong>belum menyediakan endpoint bagi aplikasi klien (Machine-to-Machine / API Key) untuk membuat folder atau membuat jalur direktori secara dinamis</strong>. Endpoint pembuatan folder saat ini hanya ada di rute Console (<code>POST /v1/console/repositories/:repositoryId/folders</code>) yang memerlukan sesi login pengguna SSO interaktif di peramban.</li>
  </ul>

  <!-- Section 2 -->
  <h2>2. Analisis Arsitektur File Service Saat Ini</h2>
  <p>
    Berdasarkan audit teknis terhadap basis kode dan skema basis data UAY File Service:
  </p>
  <ol>
    <li>
      <strong>Model Basis Data Sudah Mendukung Struktur Pohon (Recursive Folder Tree):</strong><br>
      Tabel <code>folders</code> pada PostgreSQL telah memiliki relasi rekursif (<code>parent_folder_id &rarr; folder_id</code>) dengan indeks unik <code>(repository_id, name)</code> di root dan <code>(repository_id, parent_folder_id, name)</code> untuk sub-folder. Tabel <code>files</code> juga telah memiliki relasi <code>folder_id</code> yang terhubung langsung ke tabel <code>folders</code>.
    </li>
    <li>
      <strong>Keterbatasan Batas Parameter Multipart (Multer Limits):</strong><br>
      Pada service storage lokal (<code>filesystem-storage.service.ts</code>), konfigurasi Multer saat ini dibatasi maksimal <code>fields: 3</code> (hanya menerima <code>folderId</code>, <code>contextType</code>, dan <code>contextId</code>). Jika klien aplikasi mengirimkan parameter tambahan seperti jalur path, parser Multer akan menghasilkan error <code>400 Bad Request (LIMIT_FIELD_COUNT)</code>.
    </li>
    <li>
      <strong>Keterbatasan Hak Akses Endpoint Console:</strong><br>
      Endpoint pembuatan folder hanya tersedia pada Controller Sandbox Console yang dijaga oleh <code>ConsoleBearerAuthGuard</code> dan <code>ConsoleRepositoryManagerGuard</code> (memerlukan audience <code>KEYCLOAK_CONSOLE_CLIENT_ID</code>). Klien backend M2M seperti E-Learning (dengan client ID <code>elearning-uay</code>) tidak dapat mengakses rute tersebut.
    </li>
  </ol>

  <!-- Section 3 -->
  <h2>3. Spesifikasi Usulan Solusi</h2>
  <p>
    Kami mengusulkan dua alternatif solusi yang dapat dipertimbangkan oleh tim pengembang File Service:
  </p>

  <h3>Opsi A (Sangat Direkomendasikan): Dukungan Parameter <code>folderPath</code> pada Endpoint Upload</h3>
  <p>
    Pendekatan ini paling optimal dan efisien karena bersifat <strong>atomik (1 round-trip HTTP)</strong>, di mana klien aplikasi tidak perlu melakukan pemanggilan terpisah untuk membuat folder sebelum mengunggah berkas.
  </p>
  <ul>
    <li>
      <strong>Endpoint:</strong> <code>POST /v1/repositories/:repositoryId/files</code> (multipart/form-data).
    </li>
    <li>
      <strong>Parameter Baru:</strong> <code>folderPath</code> (string opsional), contoh: <code>"2024-2025 Ganjil/[IF101] Pemrograman Web - TI-3A/01_Materi"</code>.
    </li>
    <li>
      <strong>Mekanisme Kerja Server:</strong>
      <ol>
        <li>Jika <code>folderId</code> (UUID) disertakan oleh klien, File Service langsung menggunakan folder tersebut.</li>
        <li>Jika <code>folderId</code> tidak disertakan tetapi <code>folderPath</code> ada, File Service secara otomatis memecah segmen path (dipisahkan oleh <code>/</code>) dari kiri ke kanan.</li>
        <li>File Service mencari folder aktif yang cocok pada setiap tingkat hirarki; jika belum ditemukan, folder dibuat secara otomatis (dengan penanganan konkurensi/idempoten).</li>
        <li>Folder tingkat terdalam (*leaf folder*) dijadikan sebagai <code>folderId</code> dari berkas yang diunggah.</li>
      </ol>
    </li>
    <li>
      <strong>Penyesuaian Multer:</strong> Menaikkan batas <code>fields: 10</code> dan <code>parts: 12</code> pada <code>getFileUploadOptions()</code>.
    </li>
  </ul>

  <h3>Opsi B: Penambahan Endpoint Folder untuk Klien Aplikasi (M2M)</h3>
  <p>
    Jika arsitektur File Service mengharuskan pemisahan tanggung jawab antara pengelolaan folder dan pengunggahan berkas:
  </p>
  <ul>
    <li>
      <code>GET /v1/repositories/:repositoryId/folders</code>: Mengambil daftar folder aktif di repositori (izin: <code>FILE_LIST</code>).
    </li>
    <li>
      <code>POST /v1/repositories/:repositoryId/folders</code>: Membuat folder atau memastikan jalur hierarki tersedia (*ensure path*) dengan izin <code>FILE_UPLOAD</code>. Endpoint bersifat idempoten (mengembalikan data folder jika sudah ada sebelumnya).
    </li>
  </ul>

  <!-- Section 4 -->
  <h2>4. Standar Hirarki Direktori E-Learning UAY</h2>
  <p>
    Platform E-Learning UAY telah menyiapkan algoritma pemetaan otomatis 3 tingkat yang ramah arsip akademik dan konsisten:
  </p>

  <div class="tree-box">[Repository Root]
├── 2024-2025 Ganjil/
│   ├── [IF101] Pemrograman Web - TI-3A/
│   │   ├── 00_Sampul/           (Foto banner & cover kelas)
│   │   ├── 01_Materi/           (Modul PDF, slide presentasi, video pembelajaran)
│   │   ├── 02_Tugas/            (Pengumpulan berkas tugas & laporan praktikum)
│   │   └── 03_Kuis/             (Lembar kerja kuis & jawaban ujian)
│   └── [IF102] Struktur Data - TI-1B/
│       ├── 01_Materi/
│       └── 02_Tugas/
└── Umum/
    └── 04_Lainnya/</div>

  <!-- Section 5 -->
  <h2>5. Referensi Implementasi Teknis (NestJS & Prisma)</h2>
  <p>
    Berikut adalah cuplikan kode implementasi fungsi resolusi folder yang aman, efisien, dan tahan konkurensi untuk diterapkan di <code>files.service.ts</code> File Service:
  </p>

  <pre><code><span class="keyword">async</span> ensureFolderPath(
  repositoryId: <span class="type">string</span>,
  folderPath: <span class="type">string</span>,
  actorId?: <span class="type">string</span>,
): <span class="type">Promise&lt;string&gt;</span> {
  <span class="keyword">const</span> segments = folderPath.replace(/\\\\/g, <span class="string">'/'</span>).split(<span class="string">'/'</span>).map(s => s.trim()).filter(Boolean);
  <span class="keyword">if</span> (segments.length === 0) <span class="keyword">throw new</span> BadRequestException(<span class="string">'Folder path cannot be empty'</span>);
  <span class="keyword">if</span> (segments.length > 20) <span class="keyword">throw new</span> BadRequestException(<span class="string">'Depth cannot exceed 20 levels'</span>);

  <span class="comment">// Validasi sanitasi segmen (mencegah directory traversal & karakter ilegal)</span>
  <span class="keyword">for</span> (<span class="keyword">const</span> seg <span class="keyword">of</span> segments) {
    <span class="keyword">if</span> (seg === <span class="string">'.'</span> || seg === <span class="string">'..'</span> || seg.length > 255 || /[\\x00-\\x1f]/.test(seg)) {
      <span class="keyword">throw new</span> BadRequestException(<span class="string">\`Invalid folder segment: "\${seg}"\`</span>);
    }
  }

  <span class="keyword">let</span> currentParentId: <span class="type">string | null</span> = <span class="keyword">null</span>;
  <span class="keyword">for</span> (<span class="keyword">const</span> seg <span class="keyword">of</span> segments) {
    <span class="keyword">let</span> folder = <span class="keyword">await</span> <span class="keyword">this</span>.prisma.folder.findFirst({
      where: { repositoryId, parentFolderId: currentParentId, name: seg, status: <span class="string">'active'</span> },
      select: { folderId: <span class="keyword">true</span> },
    });

    <span class="keyword">if</span> (!folder) {
      <span class="keyword">try</span> {
        folder = <span class="keyword">await</span> <span class="keyword">this</span>.prisma.folder.create({
          data: { repositoryId, parentFolderId: currentParentId, name: seg, status: <span class="string">'active'</span> },
          select: { folderId: <span class="keyword">true</span> },
        });
      } <span class="keyword">catch</span> (err: <span class="type">any</span>) {
        <span class="comment">// Tangani race condition bila dua upload bersamaan membuat folder yang sama</span>
        <span class="keyword">if</span> (err?.code === <span class="string">'P2002'</span>) {
          folder = <span class="keyword">await</span> <span class="keyword">this</span>.prisma.folder.findFirst({
            where: { repositoryId, parentFolderId: currentParentId, name: seg, status: <span class="string">'active'</span> },
            select: { folderId: <span class="keyword">true</span> },
          });
          <span class="keyword">if</span> (!folder) <span class="keyword">throw</span> err;
        } <span class="keyword">else</span> { <span class="keyword">throw</span> err; }
      }
    }
    currentParentId = folder.folderId;
  }
  <span class="keyword">return</span> currentParentId!;
}</code></pre>

  <!-- Section 6 -->
  <h2>6. Jaminan Kompatibilitas Mundur (Backward Compatibility)</h2>
  <div class="alert-box">
    <strong>Jaminan Keamanan Sistem:</strong>
    <ol style="margin-top: 4px; margin-bottom: 0;">
      <li><strong>Klien Lama Tetap Berfungsi Normal:</strong> Jika aplikasi klien tidak mengirimkan <code>folderPath</code> atau mengirimkan <code>folderId: null</code>, berkas tetap disimpan di root seperti perilaku sebelumnya.</li>
      <li><strong>Tanpa Migrasi Basis Data Baru:</strong> Tabel <code>folders</code> dan relasinya sudah lengkap sejak migrasi rilis awal. Tidak ada tabel atau kolom baru yang perlu ditambahkan.</li>
      <li><strong>Tanpa Penambahan Hak Akses:</strong> Operasi pembuatan direktori memanfaatkan hak akses <code>FILE_UPLOAD</code> yang telah terdaftar pada sistem perizinan repositori.</li>
      <li><strong>Tahan Terhadap Beban Konkuren:</strong> Penanganan galat Prisma <code>P2002</code> memastikan proses upload simultan oleh banyak mahasiswa tidak menghasilkan folder duplikat atau crash.</li>
    </ol>
  </div>

  <!-- Section 7 -->
  <h2>7. Kesimpulan & Koordinasi Antar-Tim</h2>
  <table class="content-table">
    <thead>
      <tr>
        <th style="width: 25%;">Pihak Terkait</th>
        <th style="width: 75%;">Tindakan yang Diharapkan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Tim File Service</strong></td>
        <td>Meninjau usulan teknis ini, menyetujui implementasi parameter <code>folderPath</code> (Opsi A) atau endpoint folder (Opsi B), dan menerapkannya pada siklus rilis File Service berikutnya.</td>
      </tr>
      <tr>
        <td><strong>Tim E-Learning</strong></td>
        <td>Mengaktifkan pengiriman jalur hierarki <code>folderPath</code> otomatis dari sisi E-Learning segera setelah pembaruan File Service diaktifkan di lingkungan staging dan production.</td>
      </tr>
    </tbody>
  </table>

  <footer>
    Dokumen Permintaan Fitur Resmi • RFC-UAY-FS-2026-001 • Universitas Achmad Yani (UAY) • Sistem E-Learning & File Service
  </footer>

</body>
</html>
`;

writeFileSync(tempHtmlPath, htmlContent, "utf8");
console.log("Template HTML ditulis ke:", tempHtmlPath);

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const browserExe = existsSync(chromePath) ? chromePath : edgePath;

console.log("Menggunakan peramban:", browserExe);

const cmd = `"${browserExe}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdf1}" "${tempHtmlPath}"`;
console.log("Menjalankan kompilasi PDF via headless browser...");
execSync(cmd, { stdio: "inherit" });

if (existsSync(outputPdf1)) {
  console.log("PDF berhasil dibuat di:", outputPdf1);
  copyFileSync(outputPdf1, outputPdf2);
  console.log("PDF disalin ke:", outputPdf2);

  if (!existsSync(artifactDir)) {
    mkdirSync(artifactDir, { recursive: true });
  }
  copyFileSync(outputPdf1, artifactPdf);
  console.log("PDF disalin ke folder Artifact:", artifactPdf);

  // Bersihkan temp file
  try { unlinkSync(tempHtmlPath); } catch {}
} else {
  console.error("Gagal membuat berkas PDF!");
  process.exit(1);
}
