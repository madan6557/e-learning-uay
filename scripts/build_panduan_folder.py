# -*- coding: utf-8 -*-
"""
Build and synchronize the dedicated 'Panduan' folder at E:\\UVAYA\\Project\\Panduan.
Integrates panduan.html content into the complete guide bundle:
1. BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md (Master Markdown with 33 'Bagaimana Cara...' tutorials)
2. PANDUAN_OPERASIONAL_PENGGUNA_UAY.md (Operational Markdown)
3. Buku Panduan Penggunaan E-Learning UAY.docx (Word Document with all 33 screenshots and control tables)
4. Buku Panduan Penggunaan E-Learning UAY.pdf (Printable PDF with official cover & screenshots)
5. Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx (Presentation Slides)
6. SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html (Interactive HTML Slides)
7. images/ (All UI Screenshots + Tutorial screenshots + Official UAY Emblem)
8. README.md (User-friendly index and file instructions)
"""
import os
import shutil
import subprocess
import re
from pathlib import Path

ROOT = Path(r"E:\UVAYA\Project\E - Learning UAY")
DOCS_DIR = ROOT / "docs"
IMAGES_DIR = DOCS_DIR / "images"
PROJECT_ROOT = Path(r"E:\UVAYA\Project")
PANDUAN_DIR = PROJECT_ROOT / "Panduan"
PANDUAN_IMAGES_DIR = PANDUAN_DIR / "images"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def setup_directories():
    PANDUAN_DIR.mkdir(parents=True, exist_ok=True)
    PANDUAN_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    (PANDUAN_IMAGES_DIR / "tutorial").mkdir(parents=True, exist_ok=True)
    (DOCS_DIR / "images" / "tutorial").mkdir(parents=True, exist_ok=True)
    print(f"Directories verified: {PANDUAN_DIR}")

def sync_images():
    print("Syncing screenshots and tutorial images...")
    # Sync tutorial images from Panduan/images/tutorial to docs/images/tutorial if missing
    src_tut = PANDUAN_IMAGES_DIR / "tutorial"
    dst_tut = DOCS_DIR / "images" / "tutorial"
    if src_tut.exists():
        for img in src_tut.glob("*.*"):
            shutil.copy2(img, dst_tut / img.name)
    print(f"Verified {len(list(dst_tut.glob('*.*')))} tutorial images in {dst_tut}")

def run_markdown_and_docx_generators():
    print("Executing integrate_panduan_html.py...")
    subprocess.run(["python", "scripts/integrate_panduan_html.py", "--output-dir", str(PANDUAN_DIR)], cwd=ROOT, check=True)

    print("Executing generate_guide_docx.py...")
    cmd2 = 'python "scripts/generate_guide_docx.py"'
    subprocess.run(cmd2, cwd=str(ROOT), shell=True, check=True)

def generate_pdf_guide():
    print("Generating printable PDF guide via Chrome headless...")
    md_path = PANDUAN_DIR / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md"
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Convert Markdown to a clean, styled HTML for PDF printing
    html_body = []
    lines = md_text.splitlines()
    in_table = False
    table_rows = []

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            in_table = False
            return
        cleaned = []
        for r in table_rows:
            cells = [c.strip() for c in r.strip().strip('|').split('|')]
            if cells and all(set(c).issubset({'-', ':', ' '}) for c in cells):
                continue
            cleaned.append(cells)
        if not cleaned:
            in_table = False
            table_rows = []
            return
        
        table_html = ['<div class="table-container"><table><thead><tr>']
        for c in cleaned[0]:
            c_clean = c.replace("**", "<strong>").replace("**", "</strong>")
            table_html.append(f'<th>{c_clean}</th>')
        table_html.append('</tr></thead><tbody>')
        for row in cleaned[1:]:
            table_html.append('<tr>')
            for idx, cell in enumerate(row):
                c_clean = cell.replace("**", "<strong>").replace("**", "</strong>")
                if idx == 0:
                    table_html.append(f'<td><strong>{c_clean}</strong></td>')
                else:
                    table_html.append(f'<td>{c_clean}</td>')
            table_html.append('</tr>')
        table_html.append('</tbody></table></div>')
        html_body.append('\n'.join(table_html))
        in_table = False
        table_rows = []

    skip_title = True
    for line in lines:
        s = line.strip()
        if s.startswith("# BUKU PANDUAN PENGGUNAAN RESMI"):
            skip_title = False
            continue
        if skip_title or s.startswith("**Pedoman Lengkap") or s.startswith("*Edisi Komprehensif"):
            continue
        if s == "---":
            html_body.append('<hr class="divider" />')
            continue

        if s.startswith("<a id=") or s.startswith("</a>"):
            continue

        if s.startswith("|") and s.endswith("|"):
            in_table = True
            table_rows.append(s)
            continue
        elif in_table:
            flush_table()

        # Image embed
        img_match = re.match(r'!\[(.*?)\]\((.*?)\)', s)
        if img_match:
            alt = img_match.group(1)
            src = img_match.group(2)
            html_body.append(f'<div class="img-container"><img src="{src}" alt="{alt}" /></div>')
            continue

        # Image caption
        if s.startswith("*Gambar ") and s.endswith("*"):
            html_body.append(f'<div class="caption">{s.strip("*")}</div>')
            continue

        # Headings
        if s.startswith("# "):
            title = s[2:]
            html_body.append(f'<h1 class="part-title">{title}</h1>')
        elif s.startswith("## "):
            title = s[3:]
            html_body.append(f'<h2 class="h1-title">{title}</h2>')
        elif s.startswith("### "):
            title = s[4:]
            html_body.append(f'<h3 class="h2-title">{title}</h3>')
        elif s.startswith("#### "):
            title = s[5:]
            html_body.append(f'<h4 class="h3-title">{title}</h4>')
        elif s.startswith("> "):
            callout = s[2:].replace("**", "<strong>").replace("**", "</strong>")
            html_body.append(f'<div class="callout">{callout}</div>')
        elif s.startswith("- ") or s.startswith("* "):
            item = s[2:].replace("**", "<strong>").replace("**", "</strong>")
            item = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', item)
            html_body.append(f'<li class="list-item">{item}</li>')
        elif len(s) > 2 and s[0].isdigit() and s[1:3] in (". ", ") "):
            num_item = s[3:].replace("**", "<strong>").replace("**", "</strong>")
            html_body.append(f'<div class="step-item"><span class="step-num">{s[:2]}</span><span>{num_item}</span></div>')
        elif s:
            p_text = s.replace("**", "<strong>").replace("**", "</strong>")
            p_text = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', p_text)
            html_body.append(f'<p class="para">{p_text}</p>')

    if in_table:
        flush_table()

    html_full = f"""<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Buku Panduan Penggunaan E-Learning UAY</title>
  <style>
    @page {{
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {{
        content: counter(page);
      }}
    }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }}
    .cover {{
      text-align: center;
      padding: 50px 20px 40px;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 85vh;
    }}
    .inst-title {{
      font-size: 13pt;
      font-weight: 800;
      color: #166534;
      letter-spacing: 0.5px;
      margin-bottom: 25px;
    }}
    .cover-logo {{
      width: 140px;
      height: 140px;
      margin: 15px auto 25px;
    }}
    .main-title {{
      font-size: 22pt;
      font-weight: 900;
      color: #166534;
      line-height: 1.25;
      margin-bottom: 12px;
    }}
    .sub-title {{
      font-size: 12pt;
      color: #0f172a;
      max-width: 650px;
      margin: 0 auto 35px;
      line-height: 1.4;
    }}
    .meta-box {{
      font-size: 9.5pt;
      color: #64748b;
      border-top: 1px solid #cbd5e1;
      padding-top: 18px;
      max-width: 500px;
      margin: 0 auto;
    }}
    .part-title {{
      font-size: 17pt;
      color: #166534;
      background: #f0fdf4;
      border-left: 6px solid #166534;
      padding: 10px 14px;
      margin-top: 36px;
      margin-bottom: 18px;
      page-break-after: avoid;
    }}
    .h1-title {{
      font-size: 14pt;
      color: #166534;
      border-bottom: 2px solid #166534;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-after: avoid;
    }}
    .h2-title {{
      font-size: 12pt;
      color: #15803d;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }}
    .h3-title {{
      font-size: 11pt;
      color: #0f172a;
      margin-top: 12px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }}
    .para {{
      margin-bottom: 8px;
      text-align: justify;
    }}
    .list-item {{
      margin-left: 20px;
      margin-bottom: 5px;
      text-align: justify;
    }}
    .step-item {{
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
      text-align: justify;
    }}
    .step-num {{
      font-weight: 700;
      color: #166534;
      flex: none;
    }}
    .divider {{
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }}
    .callout {{
      background: #f0fdf4;
      border-left: 4px solid #166534;
      padding: 10px 14px;
      font-size: 9.5pt;
      color: #166534;
      margin: 12px 0;
      border-radius: 4px;
      page-break-inside: avoid;
    }}
    .img-container {{
      text-align: center;
      margin: 14px 0 6px 0;
      page-break-inside: avoid;
    }}
    .img-container img {{
      max-width: 95%;
      height: auto;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08);
    }}
    .caption {{
      text-align: center;
      font-size: 8.5pt;
      font-style: italic;
      color: #64748b;
      margin-bottom: 14px;
      page-break-before: avoid;
    }}
    .table-container {{
      margin: 14px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 8px;
    }}
    th {{
      background: #166534;
      color: white;
      padding: 7px 9px;
      text-align: left;
      font-weight: 700;
      border: 1px solid #166534;
    }}
    td {{
      padding: 6px 9px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }}
    tr:nth-child(even) {{
      background: #f8fafc;
    }}
  </style>
</head>
<body>
  <div class="cover">
    <div class="inst-title">UNIVERSITAS ACHMAD YANI (UAY)<br />LEMBAGA PENGEMBANGAN TEKNOLOGI INFORMASI & PEMBELAJARAN</div>
    <img class="cover-logo" src="images/uay-logo.png" alt="Logo UAY" />
    <h1 class="main-title">BUKU PANDUAN PENGGUNAAN RESMI<br />E-LEARNING UAY</h1>
    <div class="sub-title">Pedoman Operasional Praktis Pembelajaran Digital Berbasis Pertanyaan Tutorial<br /><strong>(Bagaimana Cara: Dosen Pengampu · Mahasiswa · Admin Program Studi · Pimpinan)</strong></div>
    <div class="meta-box">
      <strong>Edisi Komprehensif Ramah Pengguna Non-Teknis · Terbit: Oktober 2026</strong><br />
      Alamat Portal Resmi: <strong>https://e-learning.uay.ac.id</strong><br />
      Banjarmasin, Kalimantan Selatan
    </div>
  </div>

  <div class="content-wrapper">
    {''.join(html_body)}
  </div>
</body>
</html>
"""
    temp_html = PANDUAN_DIR / "panduan_for_pdf.html"
    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_full)

    out_pdf = PANDUAN_DIR / "Buku Panduan Penggunaan E-Learning UAY.pdf"
    cmd = f'"{CHROME_PATH}" --headless --disable-gpu --print-to-pdf="{out_pdf}" --print-to-pdf-no-header "file:///{str(temp_html).replace(chr(92), "/")}"'
    subprocess.run(cmd, shell=True, check=True)
    
    # Also copy to root Project and docs
    shutil.copy2(out_pdf, PROJECT_ROOT / "Buku Panduan Penggunaan E-Learning UAY.pdf")
    shutil.copy2(out_pdf, DOCS_DIR / "Buku Panduan Penggunaan E-Learning UAY.pdf")
    
    # Clean temp html
    if temp_html.exists():
        temp_html.unlink()
    print(f"Generated PDF successfully: {out_pdf} and copied to {PROJECT_ROOT} & {DOCS_DIR}")

def create_readme():
    print("Writing Panduan/README.md...")
    readme_content = """# DOKUMEN PANDUAN RESMI E-LEARNING UNIVERSITAS ACHMAD YANI (UAY)
**Portal Resmi:** [https://e-learning.uay.ac.id](https://e-learning.uay.ac.id)  
**Tahun Akademik:** 2026/2027  
**Penerbit:** Pusat Data, Informasi, dan Pembelajaran Digital UAY Banjarmasin  

Folder ini memuat seluruh materi panduan resmi penggunaan sistem E-Learning UAY yang telah disesuaikan khusus untuk **pengguna non-teknis** (Dosen, Mahasiswa, Staf Administrasi Tata Usaha, dan Pimpinan Universitas). Setiap topik disajikan dalam bentuk **pertanyaan tutorial praktis (*\"Bagaimana Cara...?\"*)** dan dilengkapi **tangkapan layar antarmuka asli sistem dengan penanda visual**.

---

## DAFTAR BERKAS PANDUAN

| Nama Berkas | Format | Peruntukan & Cara Membuka |
|:---|:---:|:---|
| **[Buku Panduan Penggunaan E-Learning UAY.pdf](Buku%20Panduan%20Penggunaan%20E-Learning%20UAY.pdf)** | **PDF (Dokumen Resmi)** | Buku panduan lengkap dengan tata letak siap cetak / siap dibaca di ponsel dan laptop tanpa aplikasi Microsoft Office. |
| **[Buku Panduan Penggunaan E-Learning UAY.docx](Buku%20Panduan%20Penggunaan%20E-Learning%20UAY.docx)** | **Word (DOCX)** | Dokumen resmi lengkap dengan seluruh tangkapan layar antarmuka, penanda visual, dan tabel kontrol. Dapat diedit di Microsoft Word. |
| **[BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md](BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md)** | **Markdown (MD)** | Versi teks terstruktur lengkap 33 tutorial untuk portal web atau dokumentasi digital kampus. |
| **[PANDUAN_OPERASIONAL_PENGGUNA_UAY.md](PANDUAN_OPERASIONAL_PENGGUNA_UAY.md)** | **Markdown (MD)** | Ringkasan operasional langkah demi langkah bagi dosen dan mahasiswa. |
| **[Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx](Sosialisasi%20dan%20Panduan%20Penggunaan%20E-Learning%20UAY.pptx)** | **PowerPoint (PPTX)** | 24 Salindia (Slide) presentasi resmi rasio 16:9 untuk pemaparan di layar proyektor saat sesi sosialisasi. |
| **[SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html](SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html)** | **Web Interaktif (HTML)** | Salindia presentasi interaktif berbasis web. Cukup klik ganda untuk membuka di Google Chrome. |
| **[images/](images/)** | **Folder Gambar HD** | Menyimpan seluruh tangkapan layar beresolusi tinggi (termasuk folder `images/tutorial/` yang berisi 33 tangkapan layar tutorial). |

---

## INDEKS 33 TUTORIAL "BAGAIMANA CARA...?"

### 1. Semua Pengguna (Dasar)
- **[U1]** Bagaimana Cara Masuk ke E-Learning UAY Menggunakan Akun Kampus?
- **[U2]** Bagaimana Cara Menavigasi Menu dan Memulihkan Draf yang Belum Tersimpan?
- **[U3]** Bagaimana Cara Memeriksa Profil Akun, Notifikasi, Bantuan, dan Keluar dari Sistem?

### 2. Untuk Mahasiswa
- **[M1]** Bagaimana Cara Mahasiswa Menemukan Mata Kuliah dan Bergabung ke Kelas Perkuliahan?
- **[M2]** Bagaimana Cara Mahasiswa Mengisi Presensi Kuliah (Satu Klik atau Kode PIN)?
- **[M3]** Bagaimana Cara Mempelajari Materi Teks, Membaca Modul PDF, dan Menonton Video Kuliah?
- **[M4]** Bagaimana Cara Mengumpulkan Berkas Tugas Kuliah dan Memeriksa Riwayat Versi Jawaban?
- **[M5]** Bagaimana Cara Mengerjakan Kuis dan Ujian Daring Sampai Berhasil Terkumpul?
- **[M6]** Bagaimana Cara Memeriksa Nilai Akhir, Masukan Dosen, dan Rekap Kehadiran Kuliah?

### 3. Untuk Dosen Pengampu
- **[D1]** Bagaimana Cara Dosen Menyiapkan Kelas dan Mengatur Pertemuan Kuliah (Section)?
- **[D2]** Bagaimana Cara Dosen Mengunggah Modul Ajar PDF dan Bahan Praktikum ke Dalam Kelas?
- **[D3]** Bagaimana Cara Dosen Mengatur Video Pembelajaran dan Tautan Materi Kuliah?
- **[D4]** Bagaimana Cara Dosen Menyusun Artikel Teks dan Mengimpor Bahan Bacaan ke Kelas?
- **[D5]** Bagaimana Cara Dosen Membuat Tugas dengan Tenggat Waktu dan Batas Toleransi?
- **[D6]** Bagaimana Cara Dosen Memeriksa Berkas, Menilai Jawaban, dan Menerbitkan Nilai Tugas?
- **[D7]** Bagaimana Cara Dosen Membuat Kuis Daring dan Mengatur Batas Waktu serta Publikasi Hasil?
- **[D8]** Bagaimana Cara Dosen Menyusun Kunci Jawaban Soal Objektif (Pilihan Ganda, Benar-Salah, Jamak)?
- **[D9]** Bagaimana Cara Dosen Menyusun Soal Menjodohkan, Mengurutkan, Uraian (Esai), dan Unggahan Berkas?
- **[D10]** Bagaimana Cara Dosen Menilai Jawaban Kuis Mahasiswa dan Mengelola Bank Soal?
- **[D11]** Bagaimana Cara Dosen Membuka Sesi Presensi Kuliah dengan Jadwal atau Kode PIN 6-Digit?
- **[D12]** Bagaimana Cara Dosen Mengubah Jadwal, Menutup, dan Memperpanjang Waktu Sesi Presensi?
- **[D13]** Bagaimana Cara Dosen Mengoreksi Kehadiran Manual di Lembar Roster dan Mengekspor Rekap?
- **[D14]** Bagaimana Cara Dosen Mengatur Bobot Penilaian dan Sumber Nilai Kategori di Buku Nilai?
- **[D15]** Bagaimana Cara Dosen Meninjau, Menghitung Nilai Otomatis, dan Mempublikasikan Nilai Akhir?
- **[D16]** Bagaimana Cara Dosen Mengelola Peserta Kelas, Menulis Pengumuman, dan Menggandakan (Kloning) Kelas?

### 4. Untuk Admin Program Studi
- **[A1]** Bagaimana Cara Admin Program Studi Memeriksa Cakupan dan Wilayah Kelola Prodi?
- **[A2]** Bagaimana Cara Admin Program Studi Menambahkan Mata Kuliah Kurikulum dan Membuka Rombel Baru?
- **[A3]** Bagaimana Cara Admin Program Studi Mendaftarkan Dosen Pengampu dan Memasukkan Mahasiswa?
- **[A4]** Bagaimana Cara Admin Program Studi Mengimpor Data Peserta, Nilai, atau Bank Soal dari Excel?
- **[A5]** Bagaimana Cara Admin Program Studi Memantau Aktivitas Perkuliahan dan Mengarsipkan Kelas Selesai?

### 5. Untuk Super Administrator & Pimpinan
- **[S1]** Bagaimana Cara Super Admin Meninjau Administrasi Perkuliahan Seluruh Fakultas?
- **[S2]** Bagaimana Cara Super Admin Menetapkan Periode Tahun Ajaran Aktif dan Mengatur Banner Semester?
- **[S3]** Bagaimana Cara Super Admin Menetapkan Kebijakan Skala Huruf Mutu dan Ambang Batas Hadir 75%?

---

## KONTAK PUSAT BANTUAN TIK UAY

- **Surel Bantuan Teknis:** `elearning-support@uay.ac.id`
- **Surel Bantuan Akun & Sandi:** `sso-admin@uay.ac.id`
- **Lokasi Layanan Tatap Muka:** Gedung Rektorat UAY Lantai 2 (Ruang Pusat TIK)
- **Jam Operasional:** Senin – Jumat, pukul 08.00 – 16.00 WITA
"""
    with open(PANDUAN_DIR / "README.md", "w", encoding="utf-8") as f:
        f.write(readme_content)
    print("Panduan/README.md created successfully!")

def build_all():
    setup_directories()
    sync_images()
    run_markdown_and_docx_generators()
    generate_pdf_guide()
    create_readme()
    print("\nAll guide assets assembled and verified in E:\\UVAYA\\Project\\Panduan!")

if __name__ == "__main__":
    build_all()
