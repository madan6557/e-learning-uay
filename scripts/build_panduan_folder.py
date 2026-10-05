# -*- coding: utf-8 -*-
"""
Build and synchronize the dedicated 'Panduan' folder at E:\\UVAYA\\Project\\Panduan.
Contains:
1. Buku Panduan Penggunaan E-Learning UAY.docx (Word Document with all UI screenshots)
2. Buku Panduan Penggunaan E-Learning UAY.pdf (Printable PDF with official cover & screenshots)
3. BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md (Master Markdown)
4. PANDUAN_OPERASIONAL_PENGGUNA_UAY.md (Operational Markdown)
5. Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx (16:9 Presentation Slides)
6. SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html (Interactive HTML Slides)
7. images/ (12 Full HD UI Screenshots + Official UAY Emblem)
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
    print(f"Directory ready: {PANDUAN_DIR}")

def copy_images():
    print("Copying screenshots and official logo to Panduan/images...")
    for img in IMAGES_DIR.glob("*.*"):
        shutil.copy2(img, PANDUAN_IMAGES_DIR / img.name)
    print(f"Copied {len(list(PANDUAN_IMAGES_DIR.glob('*.*')))} image files.")

def copy_documents():
    print("Copying DOCX, PPTX, HTML, and MD guides...")
    # Markdown
    shutil.copy2(DOCS_DIR / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md", PANDUAN_DIR / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md")
    shutil.copy2(DOCS_DIR / "PANDUAN_OPERASIONAL_PENGGUNA_UAY.md", PANDUAN_DIR / "PANDUAN_OPERASIONAL_PENGGUNA_UAY.md")
    
    # DOCX
    docx_src = DOCS_DIR / "Buku Panduan Penggunaan E-Learning UAY.docx"
    if docx_src.exists():
        shutil.copy2(docx_src, PANDUAN_DIR / "Buku Panduan Penggunaan E-Learning UAY.docx")
        shutil.copy2(docx_src, PROJECT_ROOT / "Buku Panduan Penggunaan E-Learning UAY.docx")

    # PPTX
    pptx_src = DOCS_DIR / "Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx"
    if pptx_src.exists():
        shutil.copy2(pptx_src, PANDUAN_DIR / "Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx")
        shutil.copy2(pptx_src, PROJECT_ROOT / "Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx")

    # HTML Slides
    html_src = DOCS_DIR / "SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html"
    if html_src.exists():
        shutil.copy2(html_src, PANDUAN_DIR / "SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html")
        shutil.copy2(html_src, PROJECT_ROOT / "SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html")

def generate_pdf_guide():
    print("Generating printable PDF guide via Chrome headless...")
    md_path = PANDUAN_DIR / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md"
    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Convert Markdown to a clean, styled HTML for PDF printing
    # Basic conversion rules
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
            table_html.append(f'<th>{c.replace("**", "<strong>").replace("**", "</strong>")}</th>')
        table_html.append('</tr></thead><tbody>')
        for row in cleaned[1:]:
            table_html.append('<tr>')
            for cell in row:
                c_clean = cell.replace("**", "<strong>").replace("**", "</strong>")
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
        if skip_title or s.startswith("**Pedoman Praktis") or s.startswith("*Edisi Ramah"):
            continue
        if s == "---":
            html_body.append('<hr class="divider" />')
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
        if s.startswith("## "):
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
            html_body.append(f'<li class="list-item">{item}</li>')
        elif len(s) > 2 and s[0].isdigit() and s[1:3] in (". ", ") "):
            num_item = s[3:].replace("**", "<strong>").replace("**", "</strong>")
            html_body.append(f'<li class="num-item" value="{s[0]}">{num_item}</li>')
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
      margin: 20mm 18mm 20mm 18mm;
      @bottom-right {{
        content: counter(page);
      }}
    }}
    * {{ box-sizing: border-box; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }}
    .cover {{
      text-align: center;
      padding: 60px 20px 40px;
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
      margin-bottom: 30px;
    }}
    .cover-logo {{
      width: 140px;
      height: 140px;
      margin: 20px auto 30px;
    }}
    .main-title {{
      font-size: 24pt;
      font-weight: 900;
      color: #166534;
      line-height: 1.25;
      margin-bottom: 15px;
    }}
    .sub-title {{
      font-size: 13pt;
      color: #0f172a;
      max-width: 650px;
      margin: 0 auto 40px;
      line-height: 1.4;
    }}
    .meta-box {{
      font-size: 10pt;
      color: #64748b;
      border-top: 1px solid #cbd5e1;
      padding-top: 20px;
      max-width: 500px;
      margin: 0 auto;
    }}
    .h1-title {{
      font-size: 16pt;
      color: #166534;
      border-bottom: 2px solid #166534;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }}
    .h2-title {{
      font-size: 13pt;
      color: #15803d;
      margin-top: 20px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }}
    .h3-title {{
      font-size: 11.5pt;
      color: #0f172a;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }}
    .para {{
      margin-bottom: 10px;
      text-align: justify;
    }}
    .list-item, .num-item {{
      margin-left: 24px;
      margin-bottom: 6px;
      text-align: justify;
    }}
    .divider {{
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 24px 0;
    }}
    .callout {{
      background: #fefce8;
      border-left: 4px solid #ca8a04;
      padding: 12px 16px;
      font-size: 10pt;
      color: #854d0e;
      margin: 14px 0;
      border-radius: 4px;
      page-break-inside: avoid;
    }}
    .img-container {{
      text-align: center;
      margin: 18px 0 6px 0;
      page-break-inside: avoid;
    }}
    .img-container img {{
      max-width: 95%;
      height: auto;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }}
    .caption {{
      text-align: center;
      font-size: 9pt;
      font-style: italic;
      color: #64748b;
      margin-bottom: 18px;
      page-break-before: avoid;
    }}
    .table-container {{
      margin: 16px 0;
      overflow-x: auto;
      page-break-inside: avoid;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 10px;
    }}
    th {{
      background: #166534;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      border: 1px solid #166534;
    }}
    td {{
      padding: 7px 10px;
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
    <div class="sub-title">Pedoman Operasional Praktis Sistem Pembelajaran Digital Kampus Berbasis Peran<br /><strong>(Dosen Pengampu · Mahasiswa · Admin Program Studi · Pimpinan)</strong></div>
    <div class="meta-box">
      <strong>Edisi Ramah Pengguna Non-Teknis · Terbit: Oktober 2026</strong><br />
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
    
    # Also copy to root Project
    shutil.copy2(out_pdf, PROJECT_ROOT / "Buku Panduan Penggunaan E-Learning UAY.pdf")
    
    # Clean temp html
    if temp_html.exists():
        temp_html.unlink()
    print(f"Generated PDF successfully: {out_pdf} and copied to {PROJECT_ROOT}")

def create_readme():
    print("Writing Panduan/README.md...")
    readme_content = """# DOKUMEN PANDUAN RESMI E-LEARNING UNIVERSITAS ACHMAD YANI (UAY)
**Portal Resmi:** [https://e-learning.uay.ac.id](https://e-learning.uay.ac.id)  
**Tahun Akademik:** 2026/2027  
**Penerbit:** Pusat Data, Informasi, dan Pembelajaran Digital UAY Banjarmasin  

Folder ini memuat seluruh materi sosialisasi dan buku panduan resmi penggunaan sistem E-Learning UAY yang telah disesuaikan khusus untuk **pengguna non-teknis** (Dosen, Mahasiswa, Staf Administrasi Tata Usaha, dan Pimpinan Universitas). Setiap langkah dilengkapi **tangkapan layar antarmuka asli sistem**.

---

## DAFTAR BERKAS PANDUAN

| Nama Berkas | Format | Peruntukan & Cara Membuka |
|:---|:---:|:---|
| **[Buku Panduan Penggunaan E-Learning UAY.pdf](Buku%20Panduan%20Penggunaan%20E-Learning%20UAY.pdf)** | **PDF (Dokumen Resmi)** | Buku panduan lengkap dengan tata letak siap cetak / siap dibaca di ponsel dan laptop tanpa aplikasi Microsoft Office. |
| **[Buku Panduan Penggunaan E-Learning UAY.docx](Buku%20Panduan%20Penggunaan%20E-Learning%20UAY.docx)** | **Word (DOCX)** | Dokumen resmi lengkap dengan seluruh tangkapan layar antarmuka dan logo resmi UAY. Dapat diedit di Microsoft Word. |
| **[Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx](Sosialisasi%20dan%20Panduan%20Penggunaan%20E-Learning%20UAY.pptx)** | **PowerPoint (PPTX)** | 24 Salindia (Slide) presentasi resmi rasio 16:9 untuk pemaparan di layar proyektor saat sesi sosialisasi dosen dan mahasiswa baru. |
| **[SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html](SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html)** | **Web Interaktif (HTML)** | Salindia presentasi interaktif berbasis web. Cukup klik ganda untuk membuka di Google Chrome. Dilengkapi simulator presensi proyektor, kalkulator nilai mutu, dan pengukur batas hadir 75%. |
| **[BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md](BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md)** | **Markdown (MD)** | Versi teks terstruktur lengkap untuk portal web atau dokumentasi digital kampus. |
| **[PANDUAN_OPERASIONAL_PENGGUNA_UAY.md](PANDUAN_OPERASIONAL_PENGGUNA_UAY.md)** | **Markdown (MD)** | Ringkasan operasional langkah demi langkah bagi dosen dan mahasiswa. |
| **[images/](images/)** | **Folder Gambar HD** | Memuat 12 tangkapan layar beresolusi tinggi yang digunakan di seluruh buku panduan serta lambang resmi UAY. |

---

## RINGKASAN CARA MENGGUNAKAN UNTUK PENGGUNA

### 1. Untuk Dosen Pengampu di Kelas
1. Buka **https://e-learning.uay.ac.id** $\rightarrow$ Klik **"Masuk dengan Akun Kampus"**.
2. Masuk ke mata kuliah Anda $\rightarrow$ Buka tab **"Presensi"** $\rightarrow$ Klik **"+ Buka Presensi Baru"**.
3. Tampilkan ke layar proyektor. Mahasiswa akan melihat **6 digit kode besar** dan **Barcode QR**.
4. Jika ada mahasiswa yang terkendala ponsel, buka tab **"Lembar Presensi (Roster)"** lalu ubah statusnya menjadi **Hadir** secara manual.
5. Untuk menilai tugas mahasiswa, klik nama tugas $\rightarrow$ buka tab **Pengumpulan** $\rightarrow$ masukkan nilai angka dan catatan masukan.
6. Pada akhir semester, buka tab **Buku Nilai** $\rightarrow$ klik **"Ekspor Nilai Akhir ke Excel"**.

### 2. Untuk Mahasiswa
1. Buka **https://e-learning.uay.ac.id** di ponsel/laptop $\rightarrow$ Masuk dengan NIM Anda.
2. Saat jam kuliah, buka mata kuliah $\rightarrow$ Klik tombol biru **"Isi Presensi Mandiri"**.
3. Ketikkan 6 digit kode yang tampil di layar proyektor dosen $\rightarrow$ Klik **"Kirim Presensi"**.
4. Kumpulkan tugas kuliah dengan mengunggah berkas PDF pada menu tugas yang ditentukan.
5. Pantau lencana kehadiran Anda: pastikan selalu berada di atas **75%** agar berhak mengikuti UAS.

### 3. Untuk Admin Program Studi
1. Buka menu **"Kelas"** $\rightarrow$ Klik **"+ Buka Kelas Perkuliahan Baru"**.
2. Beri nama rombel kelas dan pilih semester aktif.
3. Buka tab **"Peserta & Pengampu"** untuk menugaskan dosen (termasuk dosen luar prodi) dan memasukkan mahasiswa sesuai KRS.

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
    copy_images()
    copy_documents()
    generate_pdf_guide()
    create_readme()
    print("\nAll guide assets assembled and verified in E:\\UVAYA\\Project\\Panduan!")

if __name__ == "__main__":
    build_all()
