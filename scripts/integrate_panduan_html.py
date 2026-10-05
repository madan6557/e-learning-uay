# -*- coding: utf-8 -*-
"""
Integrate panduan.html content into the master user guide suite for E-Learning UAY.
Adopts all 33 tutorials, control tables, operational notes, screenshots, and appendices.
Transforms interactive checklists into clean, read-only numbered tutorial steps.
Enriches all section and tutorial titles with question keywords: 'Bagaimana Cara...', 'Cara...', etc.
"""
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(r"E:\UVAYA\Project\E - Learning UAY")
DOCS_DIR = ROOT / "docs"
PROJECT_ROOT = Path(r"E:\UVAYA\Project")
PANDUAN_DIR = PROJECT_ROOT / "Panduan"
HTML_SOURCE = PANDUAN_DIR / "panduan.html"
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# Tutorial title question mapping with 'Bagaimana Cara...' keywords
TITLE_MAPPING = {
    "U1": ("Bagaimana Cara Masuk ke E-Learning UAY Menggunakan Akun Kampus?", "Cara Masuk dengan Akun Kampus (SSO)"),
    "U2": ("Bagaimana Cara Menavigasi Menu dan Memulihkan Draf yang Belum Tersimpan?", "Cara Navigasi Menu & Pemulihan Draf"),
    "U3": ("Bagaimana Cara Memeriksa Profil Akun, Notifikasi, Bantuan, dan Keluar dari Sistem?", "Cara Cek Profil, Notifikasi, & Keluar"),
    "M1": ("Bagaimana Cara Mahasiswa Menemukan Mata Kuliah dan Bergabung ke Kelas Perkuliahan?", "Cara Bergabung ke Kelas Kuliah"),
    "M2": ("Bagaimana Cara Mahasiswa Mengisi Presensi Kuliah (Satu Klik atau Kode PIN)?", "Cara Mengisi Presensi Mandiri"),
    "M3": ("Bagaimana Cara Mempelajari Materi Teks, Membaca Modul PDF, dan Menonton Video Kuliah?", "Cara Mempelajari Materi & Unduh Modul"),
    "M4": ("Bagaimana Cara Mengumpulkan Berkas Tugas Kuliah dan Memeriksa Riwayat Versi Jawaban?", "Cara Mengumpulkan Tugas Kuliah"),
    "M5": ("Bagaimana Cara Mengerjakan Kuis dan Ujian Daring Sampai Berhasil Terkumpul?", "Cara Mengerjakan Kuis & Ujian Daring"),
    "M6": ("Bagaimana Cara Memeriksa Nilai Akhir, Masukan Dosen, dan Rekap Kehadiran Kuliah?", "Cara Memeriksa Nilai & Presensi Mahasiswa"),
    "D1": ("Bagaimana Cara Dosen Menyiapkan Kelas dan Mengatur Pertemuan Kuliah (Section)?", "Cara Menyiapkan Kelas & Pertemuan (Section)"),
    "D2": ("Bagaimana Cara Dosen Mengunggah Modul Ajar PDF dan Bahan Praktikum ke Dalam Kelas?", "Cara Mengunggah Modul PDF & Praktikum"),
    "D3": ("Bagaimana Cara Dosen Mengatur Video Pembelajaran dan Tautan Materi Kuliah?", "Cara Mengatur Video & Tautan Kuliah"),
    "D4": ("Bagaimana Cara Dosen Menyusun Artikel Teks dan Mengimpor Bahan Bacaan ke Kelas?", "Cara Menyusun Artikel & Impor Bahan"),
    "D5": ("Bagaimana Cara Dosen Membuat Tugas dengan Tenggat Waktu dan Batas Toleransi?", "Cara Membuat Tugas & Batas Pengumpulan"),
    "D6": ("Bagaimana Cara Dosen Memeriksa Berkas, Menilai Jawaban, dan Menerbitkan Nilai Tugas?", "Cara Menilai Tugas & Masukan Dosen"),
    "D7": ("Bagaimana Cara Dosen Membuat Kuis Daring dan Mengatur Batas Waktu serta Publikasi Hasil?", "Cara Membuat Kuis & Aturan Waktu"),
    "D8": ("Bagaimana Cara Dosen Menyusun Kunci Jawaban Soal Objektif (Pilihan Ganda, Benar-Salah, Jamak)?", "Cara Menyusun Soal Objektif & Kunci"),
    "D9": ("Bagaimana Cara Dosen Menyusun Soal Menjodohkan, Mengurutkan, Uraian (Esai), dan Unggahan Berkas?", "Cara Menyusun Soal Esai & Berkas"),
    "D10": ("Bagaimana Cara Dosen Menilai Jawaban Kuis Mahasiswa dan Mengelola Bank Soal?", "Cara Menilai Kuis & Kelola Bank Soal"),
    "D11": ("Bagaimana Cara Dosen Membuka Sesi Presensi Kuliah dengan Jadwal atau Kode PIN 6-Digit?", "Cara Membuka Presensi dengan PIN/Jadwal"),
    "D12": ("Bagaimana Cara Dosen Mengubah Jadwal, Menutup, dan Memperpanjang Waktu Sesi Presensi?", "Cara Mengubah Jadwal & Menutup Presensi"),
    "D13": ("Bagaimana Cara Dosen Mengoreksi Kehadiran Manual di Lembar Roster dan Mengekspor Rekap?", "Cara Koreksi Absen Roster & Ekspor"),
    "D14": ("Bagaimana Cara Dosen Mengatur Bobot Penilaian dan Sumber Nilai Kategori di Buku Nilai?", "Cara Mengatur Bobot di Buku Nilai"),
    "D15": ("Bagaimana Cara Dosen Meninjau, Menghitung Nilai Otomatis, dan Mempublikasikan Nilai Akhir?", "Cara Menghitung & Publikasi Nilai Akhir"),
    "D16": ("Bagaimana Cara Dosen Mengelola Peserta Kelas, Menulis Pengumuman, dan Menggandakan (Kloning) Kelas?", "Cara Pengumuman & Kloning Kelas"),
    "A1": ("Bagaimana Cara Admin Program Studi Memeriksa Cakupan dan Wilayah Kelola Prodi?", "Cara Memeriksa Cakupan Program Studi"),
    "A2": ("Bagaimana Cara Admin Program Studi Menambahkan Mata Kuliah Kurikulum dan Membuka Rombel Baru?", "Cara Membuka Rombel Kelas Baru"),
    "A3": ("Bagaimana Cara Admin Program Studi Mendaftarkan Dosen Pengampu dan Memasukkan Mahasiswa?", "Cara Mendaftarkan Dosen & Mahasiswa"),
    "A4": ("Bagaimana Cara Admin Program Studi Mengimpor Data Peserta, Nilai, atau Bank Soal dari Excel?", "Cara Impor Massal Peserta & Soal"),
    "A5": ("Bagaimana Cara Admin Program Studi Memantau Aktivitas Perkuliahan dan Mengarsipkan Kelas Selesai?", "Cara Memantau & Mengarsipkan Kelas"),
    "S1": ("Bagaimana Cara Super Admin Meninjau Administrasi Perkuliahan Seluruh Fakultas?", "Cara Tata Kelola Multi-Fakultas"),
    "S2": ("Bagaimana Cara Super Admin Menetapkan Periode Tahun Ajaran Aktif dan Mengatur Banner Semester?", "Cara Mengatur Tahun Ajaran & Semester"),
    "S3": ("Bagaimana Cara Super Admin Menetapkan Kebijakan Skala Huruf Mutu dan Ambang Batas Hadir 75%?", "Cara Menetapkan Skala Nilai & Ambang Hadir")
}

def clean_html_tags(s):
    if not s:
        return ""
    # Convert bold
    s = re.sub(r'<strong>(.*?)</strong>', r'**\1**', s)
    s = re.sub(r'<b>(.*?)</b>', r'**\1**', s)
    # Convert code
    s = re.sub(r'<code>(.*?)</code>', r'`\1`', s)
    # Remove all other tags
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    return s.strip()

def parse_panduan_html():
    print("Reading and parsing panduan.html...")
    with open(HTML_SOURCE, "r", encoding="utf-8") as f:
        raw = f.read()

    articles_raw = re.findall(r'<article class=\x27tutorial\x27 id=\x27([^\x27]+)\x27 data-role=\x27([^\x27]+)\x27>(.*?)</article>', raw, re.DOTALL)
    tutorials = []

    for aid, role, content in articles_raw:
        eyebrow_m = re.search(r'<p class=\x27eyebrow\x27>(.*?)</p>', content)
        eyebrow = eyebrow_m.group(1).strip() if eyebrow_m else f"Tutorial {aid}"

        h2_m = re.search(r'<h2>(.*?)</h2>', content)
        orig_title = h2_m.group(1).strip() if h2_m else ""

        # Get enhanced title with 'Bagaimana Cara...'
        if aid in TITLE_MAPPING:
            full_title, short_title = TITLE_MAPPING[aid]
        else:
            full_title = f"Bagaimana Cara {orig_title}?"
            short_title = f"Cara {orig_title}"

        goal_m = re.search(r'<p class=\x27goal\x27>(.*?)</p>', content)
        goal = clean_html_tags(goal_m.group(1)) if goal_m else ""

        buka_m = re.search(r'<p><strong>Buka:</strong> (.*?)</p>', content)
        buka = clean_html_tags(buka_m.group(1)) if buka_m else ""

        sebelum_m = re.search(r'<p><strong>Sebelum mulai:</strong> (.*?)</p>', content)
        sebelum = clean_html_tags(sebelum_m.group(1)) if sebelum_m else ""

        # Extract steps WITHOUT checkbox input
        raw_steps = re.findall(r'<li[^>]*>.*?<span>(.*?)</span>', content, re.DOTALL)
        steps = [clean_html_tags(st) for st in raw_steps]

        result_m = re.search(r'<p class=\x27result\x27>(.*?)</p>', content)
        result = clean_html_tags(result_m.group(1)) if result_m else ""

        # Image & figcaption
        img_m = re.search(r'<img src=\x27([^\x27]+)\x27 alt=\x27([^\x27]+)\x27', content)
        img_src = img_m.group(1).strip() if img_m else ""
        img_alt = img_m.group(2).strip() if img_m else ""

        fig_m = re.search(r'<figcaption>(.*?)</figcaption>', content, re.DOTALL)
        fig_text = clean_html_tags(fig_m.group(1)) if fig_m else ""
        # Clean <br> or replace with separator
        fig_text = fig_text.replace("Klik gambar untuk memperbesar.", "").strip()

        # Table of controls
        table_rows = []
        table_m = re.search(r'<table>(.*?)</table>', content, re.DOTALL)
        if table_m:
            for tr in re.findall(r'<tr>(.*?)</tr>', table_m.group(1), re.DOTALL):
                cells = re.findall(r'<(?:th|td)[^>]*>(.*?)</(?:th|td)>', tr, re.DOTALL)
                clean_cells = [clean_html_tags(c) for c in cells]
                if clean_cells:
                    table_rows.append(clean_cells)

        # Notes
        notes_m = re.search(r'<h3>Catatan penggunaan</h3>(.*?)<p class=\x27back\x27>', content, re.DOTALL)
        notes = []
        if notes_m:
            for p in re.findall(r'<p>(.*?)</p>', notes_m.group(1), re.DOTALL):
                clean_p = clean_html_tags(p)
                if clean_p:
                    notes.append(clean_p)

        tutorials.append({
            "id": aid,
            "role": role,
            "eyebrow": eyebrow,
            "orig_title": orig_title,
            "full_title": full_title,
            "short_title": short_title,
            "goal": goal,
            "buka": buka,
            "sebelum": sebelum,
            "steps": steps,
            "result": result,
            "img_src": img_src,
            "img_alt": img_alt,
            "fig_text": fig_text,
            "table_rows": table_rows,
            "notes": notes
        })

    # Parse appendices
    appendices = []
    app_raw = re.findall(r'<section class=\x27appendix\x27 id=\x27([^\x27]+)\x27>(.*?)</section>', raw, re.DOTALL)
    for apid, content in app_raw:
        h2_m = re.search(r'<h2>(.*?)</h2>', content)
        h2 = h2_m.group(1).strip() if h2_m else ""
        appendices.append({
            "id": apid,
            "title": h2,
            "content": content
        })

    print(f"Extracted {len(tutorials)} tutorials and {len(appendices)} appendices.")
    return tutorials, appendices

def build_markdown_document(tutorials, appendices):
    md = []
    md.append("# BUKU PANDUAN PENGGUNAAN RESMI E-LEARNING UNIVERSITAS ACHMAD YANI (UAY)")
    md.append("**Pedoman Lengkap dan Praktis Tutorial Operasional Pembelajaran Digital Berbasis Peran**")
    md.append("*Edisi Komprehensif Ramah Pengguna Non-Teknis · Terbit: Oktober 2026 · Alamat Resmi: https://e-learning.uay.ac.id*")
    md.append("\n---\n")

    md.append("## KATA PENGANTAR & RINGKASAN RESMI\n")
    md.append("Sistem **E-Learning Universitas Achmad Yani (UAY)** pada alamat resmi **https://e-learning.uay.ac.id** merupakan platform pembelajaran daring terintegrasi untuk seluruh civitas akademika UAY. Panduan ini dirancang dalam bentuk **tutorial praktis berbasis pertanyaan operasional (*\"Bagaimana Cara...?\"*)**, sehingga mempermudah Dosen Pengampu, Mahasiswa, Staf Admin Program Studi, dan Pimpinan Universitas dalam menemukan jawaban langsung atas kebutuhan tugas sehari-hari.")
    md.append("\nSeluruh tahapan tutorial dalam buku ini dilengkapi dengan **tangkapan layar aplikasi asli dengan penanda visual bernomor**, tabel fungsi kontrol antarmuka, serta panduan pencegahan kendala.")
    md.append("\n---\n")

    # Table of Contents
    md.append("## DAFTAR ISI TUTORIAL LENGKAP\n")
    current_role = None
    role_headers = {
        "umum": "BAGIAN 1: PANDUAN DASAR UNTUK SEMUA PENGGUNA (TUTORIAL U1 - U3)",
        "mahasiswa": "BAGIAN 2: PANDUAN LENGKAP UNTUK MAHASISWA (TUTORIAL M1 - M6)",
        "dosen": "BAGIAN 3: PANDUAN LENGKAP UNTUK DOSEN PENGAMPU (TUTORIAL D1 - D16)",
        "admin-prodi": "BAGIAN 4: PANDUAN UNTUK PENGELOLA PRODI / ADMIN TATA USAHA (TUTORIAL A1 - A5)",
        "super-admin": "BAGIAN 5: PANDUAN UNTUK SUPER ADMINISTRATOR & PIMPINAN (TUTORIAL S1 - S3)"
    }

    for tut in tutorials:
        if tut["role"] != current_role:
            current_role = tut["role"]
            md.append(f"\n### {role_headers.get(current_role, current_role.upper())}\n")
        anchor = f"tutorial-{tut['id'].lower()}"
        md.append(f"- **[{tut['id']}] [{tut['full_title']}](#{anchor})**")

    md.append("\n### LAMPIRAN & SOLUSI KENDALA\n")
    md.append("- **[Lampiran 1: Bagaimana Cara Konversi Nilai Angka ke Huruf Mutu (Skala 2026.1 & 2024.1)?](#lampiran-skala)**")
    md.append("- **[Lampiran 2: Bagaimana Cara Mengatasi Berbagai Kendala Umum Perkuliahan (FAQ Solusi)?](#lampiran-kendala)**")
    md.append("\n---\n")

    # Chapters & Tutorials
    current_role = None
    for tut in tutorials:
        if tut["role"] != current_role:
            current_role = tut["role"]
            md.append(f"\n# {role_headers.get(current_role, current_role.upper())}\n")

        anchor = f"tutorial-{tut['id'].lower()}"
        md.append(f"<a id='{anchor}'></a>")
        md.append(f"## [{tut['id']}] {tut['full_title']}\n")
        md.append(f"**Kategori Peran:** {tut['eyebrow']}  ")
        md.append(f"**Tujuan Tutorial:** {tut['goal']}  ")
        md.append(f"**Lokasi Menu (Buka):** `{tut['buka']}`  ")
        md.append(f"**Persiapan (Sebelum Mulai):** {tut['sebelum']}\n")

        # Steps
        md.append("### Langkah-Langkah Tutorial:")
        for idx, step in enumerate(tut["steps"], 1):
            md.append(f"{idx}. {step}")
        md.append("")

        # Result check
        md.append(f"> **✓ Periksa Hasil Pengerjaan:**  \n> {tut['result']}\n")

        # Image & callout caption
        if tut["img_src"]:
            md.append(f"![{tut['img_alt']}]({tut['img_src']})")
            caption_text = f"*Gambar Tutorial {tut['id']}: {tut['orig_title']}. {tut['fig_text']}*"
            md.append(f"{caption_text}\n")

        # Table of controls
        if tut["table_rows"] and len(tut["table_rows"]) > 1:
            md.append("### Penjelasan Kontrol di Layar (Input, Toggle, & Tombol):")
            header = tut["table_rows"][0]
            md.append(f"| {header[0]} | {header[1]} | {header[2]} |")
            md.append("|:---|:---|:---|")
            for row in tut["table_rows"][1:]:
                c0 = row[0] if len(row) > 0 else ""
                c1 = row[1] if len(row) > 1 else ""
                c2 = row[2] if len(row) > 2 else ""
                md.append(f"| **{c0}** | {c1} | {c2} |")
            md.append("")

        # Operational notes
        if tut["notes"]:
            md.append("### 💡 Catatan Penting & Tips Operasional:")
            for note in tut["notes"]:
                md.append(f"- {note}")
            md.append("")

        md.append("\n---\n")

    # Appendices
    md.append("<a id='lampiran-skala'></a>")
    md.append("# LAMPIRAN 1: KONVERSI NILAI & SKALA STANDAR UAY\n")
    md.append("Gunakan versi kebijakan skala nilai yang ditetapkan pada kelas. Nilai akhir dihitung dari total nilai kategori dikalikan bobot masing-masing (total bobot wajib berjumlah 100%).\n")
    md.append("### Skala Standar Akademik 2026.1 (Semester Berjalan)")
    md.append("| Rentang Skor Angka Akhir | Huruf Mutu | Angka / Indeks Mutu |")
    md.append("|:---:|:---:|:---:|")
    md.append("| 85,00 s.d. 100 | **A** | **4,00** |")
    md.append("| 80,00 s.d. < 85 | **A-** | **3,75** |")
    md.append("| 75,00 s.d. < 80 | **B+** | **3,50** |")
    md.append("| 70,00 s.d. < 75 | **B** | **3,00** |")
    md.append("| 65,00 s.d. < 70 | **B-** | **2,75** |")
    md.append("| 60,00 s.d. < 65 | **C+** | **2,50** |")
    md.append("| 55,00 s.d. < 60 | **C** | **2,00** |")
    md.append("| 45,00 s.d. < 55 | **D** | **1,00** |")
    md.append("| 0 s.d. < 45 | **E** | **0,00** |")
    md.append("\n### Skala Historis 2024.1 (Arsip Kelas Lama)")
    md.append("| Rentang Skor Angka Akhir | Huruf Mutu | Angka / Indeks Mutu |")
    md.append("|:---:|:---:|:---:|")
    md.append("| 80,00 s.d. 100 | **A** | **4,00** |")
    md.append("| 75,00 s.d. < 80 | **B+** | **3,50** |")
    md.append("| 70,00 s.d. < 75 | **B** | **3,00** |")
    md.append("| 65,00 s.d. < 70 | **C+** | **2,50** |")
    md.append("| 55,00 s.d. < 65 | **C** | **2,00** |")
    md.append("| 45,00 s.d. < 55 | **D** | **1,00** |")
    md.append("| 0 s.d. < 45 | **E** | **0,00** |")
    md.append("\n---\n")

    md.append("<a id='lampiran-kendala'></a>")
    md.append("# LAMPIRAN 2: TANYA JAWAB & SOLUSI KENDALA OPERASIONAL (FAQ)\n")
    faq_items = [
        ("Bagaimana jika daftar kelas saya kosong saat pertama kali masuk?",
         "Periksa semester aktif, role akun Anda, dan status kepesertaan. Untuk dosen, pastikan Anda telah ditugaskan sebagai pengampu oleh Admin Prodi. Untuk mahasiswa, pastikan KRS Anda telah disetujui dan didaftarkan ke rombel kelas terkait."),
        ("Bagaimana jika materi sudah diterbitkan dosen tetapi mahasiswa belum bisa melihatnya?",
         "Periksa 3 tingkatan status: (1) Pastikan status Kelas berstatus Terbit (bukan Draft/Arsip), (2) Pastikan Section (pertemuan) berstatus Terbit, dan (3) Pastikan status Materi di dalam Section berstatus Terbit serta berada dalam rentang jadwal buka/tutup."),
        ("Bagaimana jika kode 6-digit presensi ditolak saat mahasiswa memasukkannya?",
         "Ketikkan 6 karakter kode persis seperti yang tampil di layar proyektor dosen tanpa spasi. Kode dapat mengandung huruf kapital dan angka (misal AB7K92). Pastikan jam perangkat Anda otomatis dan sesi presensi belum ditutup oleh dosen."),
        ("Bagaimana jika sesi presensi terjadwal belum terbuka otomatis?",
         "Periksa kecocokan tanggal dan jam perangkat Anda dengan waktu mulai sesi. Tekan tombol Refresh/Muat Ulang pada tab Presensi ketika jadwal mulai sudah tercapai."),
        ("Bagaimana jika berkas tugas berhasil diunggah tetapi belum tercatat di riwayat?",
         "Setelah mengunggah berkas, Anda wajib menekan tombol hijau 'Kumpulkan tugas'. Unggah berkas saja baru menyimpan draf dokumen dan belum mencatat pengumpulan di server kampus."),
        ("Bagaimana jika tombol 'Kumpulkan tugas' tidak dapat diklik (non-aktif)?",
         "Periksa apakah tenggat waktu pengumpulan atau batas toleransi sudah lewat, jumlah kesempatan versi pengumpulan sudah habis (misal batas 3 versi), atau status nilai akhir kelas sudah dikunci oleh dosen."),
        ("Bagaimana jika jawaban kuis online belum tersimpan?",
         "Perhatikan pesan status di pojok layar: pastikan muncul pesan 'Jawaban tersimpan di server'. Server hanya dapat mengumpulkan butir soal yang sudah berhasil diterima server kampus sebelum waktu ujian habis."),
        ("Bagaimana jika nilai tugas atau kuis belum terlihat oleh mahasiswa?",
         "Pengajar mungkin sedang dalam proses memeriksa soal uraian/berkas, atau pengajar belum menekan tombol publikasi hasil penilaian. Silakan konfirmasi ke dosen pengampu mata kuliah."),
        ("Bagaimana jika tombol 'Publikasikan nilai akhir' di Buku Nilai tidak aktif?",
         "Periksa apakah total bobot seluruh kategori penilaian sudah pas 100%. Pastikan seluruh tugas dan kuis mahasiswa sudah memiliki nilai, dan klik 'Simpan Perubahan' sebelum publikasi."),
        ("Bagaimana jika persentase bobot penilaian di Buku Nilai tidak dapat diubah?",
         "Nilai akhir mungkin sudah dalam status Terkunci (Locked) atau kelas sudah berstatus Diarsipkan. Buka kunci nilai terlebih dahulu sebelum mengubah komposisi bobot."),
        ("Bagaimana jika terjadi kegagalan saat impor data peserta atau nilai dari Excel?",
         "Gunakan template resmi CSV/Excel dari sistem. Pastikan kolom NIM diformat sebagai Teks (agar angka 0 di depan tidak hilang), nama kolom tidak diubah, dan pilih opsi Timpa atau Abaikan sesuai kebutuhan."),
        ("Bagaimana jika draf pekerjaan hilang saat berganti gawai / laptop?",
         "Fitur draf lokal tersimpan di peramban perangkat awal. Selalu klik 'Simpan Sebagai Draf' atau 'Simpan Perubahan' ke server sebelum Anda berpindah ke laptop atau komputer lain.")
    ]

    for q, a in faq_items:
        md.append(f"### Q: {q}")
        md.append(f"**Jawaban & Tindakan:** {a}\n")

    md.append("---\n")
    md.append("## PUSAT BANTUAN & LAYANAN TEKNIS KAMPUS UAY\n")
    md.append("- **Surel Dukungan E-Learning:** `elearning-support@uay.ac.id`")
    md.append("- **Surel Layanan Akun & SSO:** `sso-admin@uay.ac.id`")
    md.append("- **Layanan Tatap Muka:** Gedung Rektorat UAY Lantai 2 (Ruang Pusat TIK)")
    md.append("- **Jam Layanan:** Senin – Jumat, pukul 08.00 – 16.00 WITA")
    md.append("\n*Diterbitkan oleh Pusat Data, Informasi, dan Pembelajaran Digital Universitas Achmad Yani (UAY) Banjarmasin.*")

    return "\n".join(md)

def main():
    tutorials, appendices = parse_panduan_html()
    md_content = build_markdown_document(tutorials, appendices)

    # 1. Write Markdown files
    print("Writing markdown files...")
    md_panduan = PANDUAN_DIR / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md"
    with open(md_panduan, "w", encoding="utf-8") as f:
        f.write(md_content)

    md_op = PANDUAN_DIR / "PANDUAN_OPERASIONAL_PENGGUNA_UAY.md"
    with open(md_op, "w", encoding="utf-8") as f:
        f.write(md_content)

    shutil.copy2(md_panduan, DOCS_DIR / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md")
    shutil.copy2(md_op, DOCS_DIR / "PANDUAN_OPERASIONAL_PENGGUNA_UAY.md")
    shutil.copy2(md_panduan, PROJECT_ROOT / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md")

    print(f"Master markdown written ({len(md_content)} characters).")

if __name__ == "__main__":
    main()
