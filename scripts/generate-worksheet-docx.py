import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, hex_color):
    """Sets background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets inner margins for a table cell (in twips: 20 twips = 1 pt)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'  <w:top w:w="{top}" w:type="dxa"/>'
        f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'  <w:left w:w="{left}" w:type="dxa"/>'
        f'  <w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4"):
    """Sets light subtle borders for a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_bug_template(doc, title_text, is_optional=False):
    """Adds a clean, easy-to-copy-paste bug report template using simple paragraphs."""
    p_header = doc.add_paragraph()
    p_header.paragraph_format.space_before = Pt(10)
    p_header.paragraph_format.space_after = Pt(4)
    r_hdr = p_header.add_run(f"📋 {title_text}")
    r_hdr.bold = True
    r_hdr.font.size = Pt(10.5)
    r_hdr.font.color.rgb = RGBColor(30, 58, 138) # Navy blue

    # Fields
    items = [
        ("Judul Masalah / Bug", "contoh: Tombol submit kuis tertekan 2 kali / Teks tombol terpotong"),
        ("Halaman / Fitur", "contoh: Halaman Kuis 01 / Halaman Tugas / Menu Profil"),
    ]

    for label, hint in items:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r_lbl = p.add_run(f"• {label} : ")
        r_lbl.bold = True
        r_lbl.font.size = Pt(9.5)
        r_hint = p.add_run(f"[{hint}]")
        r_hint.font.size = Pt(8.5)
        r_hint.font.color.rgb = RGBColor(148, 163, 184)

    # Steps to reproduce as clean paragraph list
    p_steps = doc.add_paragraph()
    p_steps.paragraph_format.space_before = Pt(2)
    p_steps.paragraph_format.space_after = Pt(2)
    r_step_lbl = p_steps.add_run("• Langkah-Langkah Menemukan Masalah (Bisa tekan Enter untuk menambah nomor langkah):")
    r_step_lbl.bold = True
    r_step_lbl.font.size = Pt(9.5)

    steps_placeholder = [
        "1. Buka halaman ...",
        "2. Klik tombol ...",
        "3. Yang terjadi adalah ..."
    ]
    for step in steps_placeholder:
        p_step = doc.add_paragraph()
        p_step.paragraph_format.left_indent = Inches(0.25)
        p_step.paragraph_format.space_before = Pt(1)
        p_step.paragraph_format.space_after = Pt(2)
        r_s = p_step.add_run(step)
        r_s.font.size = Pt(9)
        r_s.font.color.rgb = RGBColor(100, 116, 139)

    # What happened vs expected
    followups = [
        ("Yang Terjadi (Kenyataan)", "Tulis apa yang error, macet, atau tampil aneh di layar Anda"),
        ("Yang Seharusnya (Harapan)", "Tulis seharusnya bagaimana aplikasi bekerja yang benar"),
        ("Saran Perbaikan Tampilan / UX", "Tulis saran Anda agar tampilan atau tombol lebih nyaman dipakai (opsional)")
    ]

    for label, hint in followups:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r_lbl = p.add_run(f"• {label} : ")
        r_lbl.bold = True
        r_lbl.font.size = Pt(9.5)
        r_hint = p.add_run(f"({hint})")
        r_hint.font.size = Pt(8.5)
        r_hint.font.color.rgb = RGBColor(148, 163, 184)

    # Separator line
    p_sep = doc.add_paragraph()
    p_sep.paragraph_format.space_before = Pt(4)
    p_sep.paragraph_format.space_after = Pt(6)
    r_sep = p_sep.add_run("─" * 65)
    r_sep.font.size = Pt(8)
    r_sep.font.color.rgb = RGBColor(226, 232, 240)

def build_worksheet():
    doc = Document()

    # Set page margins (0.7 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Styles
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Calibri'
    font.size = Pt(10)
    font.color.rgb = RGBColor(30, 41, 59) # Slate 800

    # Header / Title
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_uni = title_p.add_run("UNIVERSITAS ACHMAD YANI (UVAYA)\n")
    r_uni.bold = True
    r_uni.font.size = Pt(11)
    r_uni.font.color.rgb = RGBColor(71, 85, 105)

    r_title = title_p.add_run("LEMBAR KERJA PRAKTIKUM: PENGUJIAN APLIKASI (QA)\n")
    r_title.bold = True
    r_title.font.size = Pt(13.5)
    r_title.font.color.rgb = RGBColor(15, 23, 42)

    r_sub = title_p.add_run("Mata Kuliah: Pengenalan Informatika | Platform: E-Learning UAY")
    r_sub.font.size = Pt(9.5)
    r_sub.font.color.rgb = RGBColor(100, 116, 139)

    # Divider bar
    div_table = doc.add_table(rows=1, cols=1)
    div_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    div_cell = div_table.cell(0, 0)
    div_cell.width = Inches(7.0)
    set_cell_background(div_cell, "2563EB") # Blue primary
    div_p = div_cell.paragraphs[0]
    div_p.paragraph_format.space_before = Pt(1)
    div_p.paragraph_format.space_after = Pt(1)
    div_run = div_p.add_run("")
    div_run.font.size = Pt(2)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)

    # Quick Intro Box
    intro_table = doc.add_table(rows=1, cols=1)
    intro_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    intro_cell = intro_table.cell(0, 0)
    intro_cell.width = Inches(7.0)
    set_cell_background(intro_cell, "F8FAFC")
    set_cell_margins(intro_cell, top=120, bottom=120, left=180, right=180)
    
    # Border for intro box
    intro_tcPr = intro_cell._tc.get_or_add_tcPr()
    intro_borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="18" w:space="0" w:color="2563EB"/>'
        f'  <w:top w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    intro_tcPr.append(intro_borders)

    intro_p = intro_cell.paragraphs[0]
    intro_p.paragraph_format.space_after = Pt(2)
    r = intro_p.add_run("💡 Apa itu Software Quality Assurance (QA)?\n")
    r.bold = True
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(30, 58, 138)

    r_desc = intro_p.add_run(
        "Sebagai mahasiswa Informatika, hari ini kita berlatih menjadi Quality Assurance (QA). "
        "Tugas QA adalah mencoba aplikasi seperti pengguna sungguhan untuk memastikan tombol berfungsi, tampilan tidak berantakan, "
        "dan alur berjalan lancar.\n"
        "• Beri tanda centang [ V ] pada kolom PASS jika fitur berjalan lancar.\n"
        "• Beri tanda centang [ V ] pada kolom FAIL jika ada tombol macet, error, atau tampilan yang aneh."
    )
    r_desc.font.size = Pt(9)
    r_desc.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_paragraph().paragraph_format.space_after = Pt(3)

    # Student Info Box (Table)
    info_table = doc.add_table(rows=3, cols=2)
    info_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(info_table, color="CBD5E1", sz="6")

    fields = [
        ("Nama Mahasiswa : __________________________________", "Akun Demo : [  ] Mahasiswa 01 - 10"),
        ("NIM Lengkap       : __________________________________", "Peran Uji  : [  ] Mahasiswa  [  ] Dosen"),
        ("Perangkat / Web  : [  ] Laptop  [  ] PC Lab  [  ] HP (Chrome / Edge)", "Waktu Uji : Sesi Praktikum Lab")
    ]

    for row_idx, (col1, col2) in enumerate(fields):
        c1 = info_table.cell(row_idx, 0)
        c2 = info_table.cell(row_idx, 1)
        c1.width = Inches(4.3)
        c2.width = Inches(2.7)
        set_cell_margins(c1, top=60, bottom=60, left=90, right=90)
        set_cell_margins(c2, top=60, bottom=60, left=90, right=90)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_after = Pt(0)
        r1 = p1.add_run(col1)
        r1.font.size = Pt(9)

        p2 = c2.paragraphs[0]
        p2.paragraph_format.space_after = Pt(0)
        r2 = p2.add_run(col2)
        r2.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # Section 1: Basic Test Cases
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(6)
    h1.paragraph_format.space_after = Pt(3)
    r = h1.add_run("BAGIAN 1: UJI COBA DASAR (Ikuti Langkah demi Langkah)")
    r.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(30, 58, 138)

    sub_h1 = doc.add_paragraph()
    sub_h1.paragraph_format.space_after = Pt(4)
    r_sub1 = sub_h1.add_run("Target URL: ")
    r_sub1.font.size = Pt(9)
    r_url = sub_h1.add_run("https://e-learning-uay.vercel.app/")
    r_url.bold = True
    r_url.font.size = Pt(9)
    r_url.font.color.rgb = RGBColor(37, 99, 235)
    r_kelas = sub_h1.add_run("  |  Kelas Uji: IF2101 - Pemrograman Web (Kelas A)")
    r_kelas.font.size = Pt(9)

    # Basic test cases table
    tc_table = doc.add_table(rows=1, cols=5)
    tc_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tc_table, color="CBD5E1", sz="6")

    headers = ["No", "Fitur yang Diuji", "Langkah Uji Sederhana", "Hasil yang Diharapkan", "Hasil Uji Anda"]
    col_widths = [Inches(0.4), Inches(1.3), Inches(2.3), Inches(2.0), Inches(1.0)]

    hdr_cells = tc_table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "1E3A8A") # Navy Blue
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=80, right=80)
        p = hdr_cells[i].paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        if i == 0 or i == 4:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(title)
        r.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)

    basic_cases = [
        (
            "1",
            "Login Akun Demo",
            "Buka web → scroll ke bagian 'Akun Demonstrasi' → klik tombol 'Gunakan' pada salah satu Mahasiswa (contoh: Mahasiswa 01).",
            "Berhasil masuk Dashboard. Nama akun Anda tampil di pojok kanan atas.",
            "[  ] PASS\n[  ] FAIL"
        ),
        (
            "2",
            "Buka Kelas & Baca Materi",
            "Klik kelas 'IF2101 Pemrograman Web' → buka materi kuliah pertemuan pertama.",
            "Halaman materi terbuka rapi, teks terbaca jelas, dan ada kotak kode/catatan.",
            "[  ] PASS\n[  ] FAIL"
        ),
        (
            "3",
            "Centang Checklist",
            "Di dalam materi kuliah, cari daftar ceklis materi → coba klik kotak centangnya.",
            "Kotak berhasil tercentang dan status progres tersimpan tanpa error.",
            "[  ] PASS\n[  ] FAIL"
        ),
        (
            "4",
            "Mengerjakan Kuis",
            "Buka menu Kuis → pilih 'Kuis 01' → pilih salah satu jawaban kuis → klik 'Kumpulkan' atau 'Submit'.",
            "Jawaban tersimpan, dan muncul tanda kuis telah selesai dikerjakan.",
            "[  ] PASS\n[  ] FAIL"
        ),
        (
            "5",
            "Kumpul Tugas Praktikum",
            "Buka tugas 'Praktikum 01' → ketik teks singkat di kolom jawaban tugas → klik 'Kumpulkan Tugas'.",
            "Tugas berhasil terkirim dan status berubah menjadi 'Sudah Dikumpulkan'.",
            "[  ] PASS\n[  ] FAIL"
        ),
        (
            "6",
            "Cek Rekap Nilai",
            "Buka tab/menu 'Nilai' (Gradebook) di dalam kelas yang sedang dibuka.",
            "Tampil daftar tugas & kuis beserta skor atau status penilaiannya.",
            "[  ] PASS\n[  ] FAIL"
        ),
        (
            "7",
            "Cek Menu Profil & Keluar",
            "Buka menu profil di kanan atas, periksa data diri → lalu klik tombol 'Keluar' (Logout).",
            "Informasi profil benar dan tombol keluar membawa Anda kembali ke halaman login.",
            "[  ] PASS\n[  ] FAIL"
        )
    ]

    for row_data in basic_cases:
        row_cells = tc_table.add_row().cells
        for col_idx, text in enumerate(row_data):
            row_cells[col_idx].width = col_widths[col_idx]
            bg = "F8FAFC" if int(row_data[0]) % 2 == 0 else "FFFFFF"
            set_cell_background(row_cells[col_idx], bg)
            set_cell_margins(row_cells[col_idx], top=70, bottom=70, left=80, right=80)
            p = row_cells[col_idx].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(text)
                r.bold = True
                r.font.size = Pt(9)
            elif col_idx == 4:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(text)
                r.font.size = Pt(8.5)
            elif col_idx == 1:
                r = p.add_run(text)
                r.bold = True
                r.font.size = Pt(8.5)
            else:
                r = p.add_run(text)
                r.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Section 2: Creative & Free Exploration Test Cases
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(6)
    h2.paragraph_format.space_after = Pt(2)
    r = h2.add_run("BAGIAN 2: EKSPLORASI KREATIF (Uji Bebas Tambahan Anda)")
    r.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(30, 58, 138)

    desc2 = doc.add_paragraph()
    desc2.paragraph_format.space_after = Pt(3)
    r = desc2.add_run(
        "Sebagai tester yang cerdas, cobalah skenario kreatif Anda sendiri di luar langkah di atas! "
        "Contoh ide: Coba klik tombol berulang kali dengan cepat, coba kumpulkan tugas tanpa isi apa-apa (apakah ditolak?), "
        "coba perkecil jendela browser / buka di HP (apakah responsif?), atau coba login dengan akun Dosen, M.Kom. untuk melihat antrean nilai."
    )
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(71, 85, 105)

    free_table = doc.add_table(rows=1, cols=5)
    free_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(free_table, color="CBD5E1", sz="6")

    free_headers = ["No", "Ide Eksplorasi Anda", "Langkah Percobaan yang Dilakukan", "Hasil yang Terjadi", "Status"]
    free_widths = [Inches(0.4), Inches(1.8), Inches(2.2), Inches(1.8), Inches(0.8)]

    free_hdr_cells = free_table.rows[0].cells
    for i, title in enumerate(free_headers):
        free_hdr_cells[i].width = free_widths[i]
        set_cell_background(free_hdr_cells[i], "0D9488") # Teal 600
        set_cell_margins(free_hdr_cells[i], top=90, bottom=90, left=80, right=80)
        p = free_hdr_cells[i].paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        if i == 0 or i == 4:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(title)
        r.bold = True
        r.font.size = Pt(8.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    for i in range(1, 4):
        row_cells = free_table.add_row().cells
        for col_idx in range(5):
            row_cells[col_idx].width = free_widths[col_idx]
            set_cell_background(row_cells[col_idx], "FFFFFF")
            set_cell_margins(row_cells[col_idx], top=120, bottom=120, left=80, right=80)
            p = row_cells[col_idx].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            if col_idx == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(str(i))
                r.bold = True
                r.font.size = Pt(9)
            elif col_idx == 4:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run("[ ] PASS\n[ ] FAIL")
                r.font.size = Pt(8)
            else:
                r = p.add_run("")
                r.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # Section 3: Simple & Easily Copy-Pasteable Bug Report Section
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(8)
    h3.paragraph_format.space_after = Pt(2)
    r = h3.add_run("BAGIAN 3: CATATAN TEMUAN BUG ATAU SARAN TAMPILAN")
    r.bold = True
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(30, 58, 138)

    desc3 = doc.add_paragraph()
    desc3.paragraph_format.space_after = Pt(4)
    r = desc3.add_run(
        "Jika menemukan tombol macet, pesan error aneh, salah ketik kata, atau tampilan yang sulit dibaca, isi format di bawah ini.\n"
        "💡 Tip: Format teks ini sangat mudah di-copy dan paste jika Anda menemukan lebih dari 1 masalah. "
        "Untuk menambahkan langkah, Anda cukup menekan tombol Enter."
    )
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(71, 85, 105)

    # Add Bug Form 1
    add_bug_template(doc, "FORM TEMUAN BUG / SARAN #1", is_optional=False)

    # Add Bug Form 2 (Ready to fill / optional)
    add_bug_template(doc, "FORM TEMUAN BUG / SARAN #2 (Opsional jika ada temuan lain)", is_optional=True)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # Signature Footer Table
    sign_table = doc.add_table(rows=1, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(sign_table, color="FFFFFF", sz="0")

    sc1 = sign_table.cell(0, 0)
    sc2 = sign_table.cell(0, 1)
    sc1.width = Inches(3.5)
    sc2.width = Inches(3.5)

    sp1 = sc1.paragraphs[0]
    sp1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sp1.paragraph_format.space_after = Pt(0)
    r1 = sp1.add_run("Mahasiswa Penguji (Tester),\n\n\n\n( _____________________________ )")
    r1.font.size = Pt(9)

    sp2 = sc2.paragraphs[0]
    sp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sp2.paragraph_format.space_after = Pt(0)
    r2 = sp2.add_run("Instruktur / Asisten Laboratorium,\n\n\n\n( _____________________________ )")
    r2.font.size = Pt(9)

    # Save
    out_dir = r"E:\UVAYA\Project\E - Learning UAY\docs\qa"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "LEMBAR-KERJA-TESTER-MAHASISWA.docx")
    doc.save(out_path)
    print(f"Successfully generated: {out_path}")

if __name__ == "__main__":
    build_worksheet()
