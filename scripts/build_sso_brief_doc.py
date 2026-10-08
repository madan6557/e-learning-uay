# -*- coding: utf-8 -*-
"""
Dokumen Pengajuan Teknis Penyelarasan Integrasi SSO UAY — E-Learning (Versi Ringkas / 2 Halaman)
Menghasilkan:
1. docs/integrations/sso/Pengajuan Teknis Integrasi SSO UAY - E-Learning (Ringkas).md
2. docs/integrations/sso/Pengajuan Teknis Integrasi SSO UAY - E-Learning (Ringkas).docx
3. docs/integrations/sso/Pengajuan Teknis Integrasi SSO UAY - E-Learning (Ringkas).pdf
"""
from __future__ import annotations
import os
import sys
from pathlib import Path
from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
import win32com.client

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)

MD_PATH = DOCS / "Pengajuan Teknis Integrasi SSO UAY - E-Learning (Ringkas).md"
DOCX_PATH = DOCS / "Pengajuan Teknis Integrasi SSO UAY - E-Learning (Ringkas).docx"
PDF_PATH = DOCS / "Pengajuan Teknis Integrasi SSO UAY - E-Learning (Ringkas).pdf"

# Institutional Palette: Navy / Blue / Slate
NAVY = "17395C"
BLUE = "2B6CB0"
INK = "17233C"
MUTED = "64748B"
LIGHT_BLUE = "EAF2F8"
LIGHT_GRAY = "F8FAFC"
LINE = "D8E0EA"
GOLD = "B7791F"
LIGHT_GOLD = "FFFBEB"
GREEN = "2F855A"
LIGHT_GREEN = "ECFDF5"
WHITE = "FFFFFF"

def rgb(value: str) -> RGBColor:
    return RGBColor.from_string(value)

def set_cell_shading(cell, fill: str) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)

def set_cell_margins(cell, top=60, start=100, bottom=60, end=100) -> None:
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")

def set_cell_border(cell, color=LINE, size="4") -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = qn(f"w:{edge}")
        node = borders.find(tag)
        if node is None:
            node = OxmlElement(f"w:{edge}")
            borders.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), size)
        node.set(qn("w:space"), "0")
        node.set(qn("w:color"), color)

def set_table_geometry(table, widths_dxa: list[int], indent=0) -> None:
    table.autofit = False
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    tbl_pr = table._tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:w"), str(sum(widths_dxa)))
    tbl_w.set(qn("w:type"), "dxa")

    tbl_ind = tbl_pr.find(qn("w:tblInd"))
    if tbl_ind is None:
        tbl_ind = OxmlElement("w:tblInd")
        tbl_pr.append(tbl_ind)
    tbl_ind.set(qn("w:w"), str(indent))
    tbl_ind.set(qn("w:type"), "dxa")

    layout = tbl_pr.find(qn("w:tblLayout"))
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tbl_pr.append(layout)
    layout.set(qn("w:type"), "fixed")

    grid = table._tbl.tblGrid
    for child in list(grid):
        grid.remove(child)
    for width in widths_dxa:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)

    for row in table.rows:
        row.height = None
        for i, cell in enumerate(row.cells):
            cell.width = Inches(widths_dxa[i] / 1440)
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:w"), str(widths_dxa[i]))
            tc_w.set(qn("w:type"), "dxa")
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)

def repeat_header(row) -> None:
    tr_pr = row._tr.get_or_add_trPr()
    header = OxmlElement("w:tblHeader")
    header.set(qn("w:val"), "true")
    tr_pr.append(header)

def set_run_font(run, name="Segoe UI", size=9.0, color=INK, bold=False, italic=False) -> None:
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.font.color.rgb = rgb(color)
    run.bold = bold
    run.italic = italic

def add_text(doc, text: str, bold_prefix: str | None = None, color=INK, size=9.0, italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2.5)
    p.paragraph_format.line_spacing = 1.12
    if bold_prefix and text.startswith(bold_prefix):
        r = p.add_run(bold_prefix)
        set_run_font(r, size=size, color=color, bold=True)
        r = p.add_run(text[len(bold_prefix):])
        set_run_font(r, size=size, color=color, italic=italic)
    else:
        r = p.add_run(text)
        set_run_font(r, size=size, color=color, italic=italic)
    return p

def add_heading(doc, text: str, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.keep_with_next = True
    if level == 1:
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(text)
        set_run_font(r, size=11.0, color=NAVY, bold=True)
    elif level == 2:
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(text)
        set_run_font(r, size=9.8, color=BLUE, bold=True)
    return p

def add_callout(doc, label: str, body: str, fill=LIGHT_BLUE, label_color=BLUE):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9360]) # full width for 0.6in margins (8.5 - 1.2 = 7.3in = 10512 dxa, let's use 9360 or 9500)
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    set_cell_border(cell, fill, "0")
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(1.5)
    r = p.add_run(label.upper())
    set_run_font(r, size=8.0, color=label_color, bold=True)
    p = cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.1
    r = p.add_run(body)
    set_run_font(r, size=8.8, color=INK)
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(2)
    return table

def add_code(doc, code_str: str):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9360])
    cell = table.cell(0, 0)
    set_cell_shading(cell, LIGHT_GRAY)
    set_cell_border(cell, LINE, "4")
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.0
    r = p.add_run(code_str)
    set_run_font(r, name="Consolas", size=8.0, color=INK)
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(2)
    return table

def add_table(doc, headers: list[str], rows: list[list[str]], widths: list[int]):
    table = doc.add_table(rows=1, cols=len(headers))
    set_table_geometry(table, widths)
    repeat_header(table.rows[0])
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        set_cell_shading(cell, NAVY)
        set_cell_border(cell, NAVY, "4")
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(header)
        set_run_font(r, size=8.2, color=WHITE, bold=True)
    for row_index, values in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(values):
            cell = cells[i]
            set_cell_shading(cell, LIGHT_GRAY if row_index % 2 else WHITE)
            set_cell_border(cell)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.08
            r = p.add_run(str(value))
            set_run_font(r, size=8.2, color=INK)
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(2)
    return table

def generate_markdown() -> str:
    md_content = """# LEMBAR PENGAJUAN TEKNIS PENYELARASAN INTEGRASI SSO UAY — E-LEARNING
**Ringkasan Kebutuhan Atribut Identitas & Opsi Integrasi Teknis (Technical Brief)**  
*Versi: 1.0 (Ringkas) | Tanggal: 25 September 2026 | Ditujukan Kepada: Tim Pengembang SSO UAY & PUSTIK UAY*

---

## 1. Latar Belakang & Kendala Teknis
Berdasarkan telaah terhadap Bab 7 (*Authentication & Session*) Dokumen Teknis SSO UAY, Keycloak SSO saat ini hanya menerbitkan Access Token dengan klaim identitas dasar (`sub`, `preferred_username`, `email`, `name`).

Agar E-Learning UAY dapat menghubungkan mahasiswa ke rombongan belajar (kelas kuliah), mencatat nilai KRS, memvalidasi presensi, dan menerapkan hak akses dosen vs mahasiswa (RBAC), **E-Learning memerlukan 4 atribut data tambahan** dari ekosistem SSO.

---

## 2. 4 Poin Kebutuhan Data yang Belum Terpenuhi

| No | Atribut / Data | Sumber di Database SSO | Tipe Data | Urgensi & Fungsi Nyata di E-Learning |
|---|---|---|---|---|
| **1** | **`identifier_value`** | `user_identifiers.identifier_value` | String *(NIM / NIDN)* | **Kritis (Wajib)**. Kunci pengait mahasiswa ke kelas kuliah, kurikulum prodi, presensi, dan pelaporan nilai SIMAK/PDDikti. |
| **2** | **`roles`** | `application_access` $\rightarrow$ `roles.name` | Array String | **Kritis (Wajib)**. Menentukan hak akses: `INSTRUCTOR` (dosen pengampu materi/kuis) vs `STUDENT` (mahasiswa). |
| **3** | **`status`** | `users.status` / `accounts.status` | String (`ACTIVE`/`DISABLED`) | **Kritis (Wajib)**. Memastikan akun aktif. Memblokir mahasiswa cuti/skorsing agar tidak dapat menyusup ke ujian online. |
| **4** | **`user_type`** | `users.user_type` | String (`STUDENT`, `LECTURER`, dll.) | **Penting**. Menentukan tipe direktori pengguna untuk personalisasi dashboard dan fitur profil LMS. |

---

## 3. Mengapa Atribut Ini Mutlak Diperlukan?
1. **Distribusi Kelas Kuliah**: E-Learning memetakan mahasiswa ke kelas mata kuliah spesifik berdasarkan **NIM**. Tanpa NIM, mahasiswa yang berhasil login tidak akan menemukan mata kuliah yang diikutinya.
2. **Integritas Penilaian & Transkrip**: Nilai kuis, tugas, dan ujian akhir terikat secara hukum pada NIM mahasiswa dan NIDN dosen pengampu untuk sinkronisasi ke SIAKAD.
3. **Kontrol Hak Akses (RBAC)**: Membedakan secara tegas antarmuka Dosen (mengunggah modul, membuat soal) dan Mahasiswa (mengerjakan tugas, melihat materi).

---

## 4. Dua Pilihan Solusi Praktis (Pilih Salah Satu)

### 🟢 OPSI A: Tambahkan Protocol Mapper di Keycloak (Sangat Direkomendasikan)
*Tim SSO cukup menambahkan 4 konfigurasi Protocol Mapper pada client `elearning-uay` di Keycloak Admin Console. **Estimasi pengerjaan ~15 menit, tanpa coding (zero code), latensi 0 ms (stateless), dan tahan lonjakan trafik saat ujian serentak.***

**Tabel Konfigurasi Mapper di Keycloak:**
| Nama Mapper | Mapper Type | User Attribute (SSO) | Token Claim Name | Add to ID/Access Token |
|---|---|---|---|---|
| `nim_nidn_mapper` | `User Attribute` | `identifier_value` *(atau NIM/NIDN)* | `identifier_value` | **ON / ON** |
| `elearning_roles_mapper` | `User Client Role` / `Attribute` | `roles` | `roles` | **ON / ON** *(Multivalued: ON)* |
| `account_status_mapper` | `User Attribute` | `status` | `status` | **ON / ON** |
| `user_type_mapper` | `User Attribute` | `user_type` | `user_type` | **ON / ON** |

---

### 🟡 OPSI B: Penyediaan Endpoint REST API di Backend SSO (Alternatif)
*Jika Tim SSO memilih Keycloak tetap murni tanpa custom mapper (sesuai alur Bab 7.9 & 20.2.3), mohon Tim SSO menyediakan 1 endpoint REST API di Backend SSO:*

* **Endpoint**: `GET /api/v1/auth/context`
* **Request Header**: `Authorization: Bearer <token_keycloak>`, `X-Client-ID: elearning-uay`
* **Response JSON (200 OK)**:
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "identifier_value": "202401001",
  "identifier_type": "NIM",
  "roles": ["STUDENT"],
  "status": "ACTIVE",
  "user_type": "STUDENT"
}
```

---

## 5. Contoh Payload Token JWT Lengkap yang Diharapkan (Opsi A)
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "preferred_username": "202401001",
  "name": "Ahmad Dahlan",
  "email": "ahmad.dahlan@uay.ac.id",
  "user_type": "STUDENT",
  "status": "ACTIVE",
  "identifier_type": "NIM",
  "identifier_value": "202401001",
  "roles": ["STUDENT"]
}
```

---

## 6. Tindak Lanjut & Kontak Pengujian
Tim E-Learning telah menyiapkan kode backend untuk langsung menerima format di atas. Begitu Tim SSO mengaktifkan salah satu opsi di lingkungan Staging UAY, kami siap melakukan pengujian integrasi bersama.

*Palu, 25 September 2026 — Tim Pengembang E-Learning UAY*
"""
    with open(MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"[OK] Markdown generated: {MD_PATH}")
    return md_content

def generate_docx():
    doc = Document()
    for section in doc.sections:
        # Tight margins to fit exactly 2 pages
        section.top_margin = Inches(0.55)
        section.bottom_margin = Inches(0.55)
        section.left_margin = Inches(0.65)
        section.right_margin = Inches(0.65)

        # Header
        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_hdr = p_hdr.add_run("PENGAJUAN TEKNIS INTEGRASI SSO UAY — E-LEARNING (RINGKAS)")
        set_run_font(r_hdr, size=7.5, color=MUTED, bold=True)

        # Footer
        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_ftr = p_ftr.add_run("Biro Teknologi Informasi / PUSTIK Universitas Al-Khairaat (UAY) • 25 September 2026")
        set_run_font(r_ftr, size=7.5, color=MUTED)

    # PAGE 1: HEADER BOX
    cover_table = doc.add_table(rows=1, cols=1)
    set_table_geometry(cover_table, [9360])
    c_cell = cover_table.cell(0, 0)
    set_cell_shading(c_cell, NAVY)
    set_cell_margins(c_cell, top=140, start=180, bottom=140, end=180)
    set_cell_border(c_cell, NAVY, "0")

    p = c_cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(1.5)
    r = p.add_run("UNIVERSITAS AL-KHAIRAAT (UAY) • BIRO TEKNOLOGI INFORMASI / PUSTIK")
    set_run_font(r, size=8.0, color=LIGHT_BLUE, bold=True)

    p = c_cell.add_paragraph()
    p.paragraph_format.space_after = Pt(2.5)
    r = p.add_run("LEMBAR PENGAJUAN TEKNIS PENYELARASAN INTEGRASI SSO UAY — E-LEARNING")
    set_run_font(r, size=11.5, color=WHITE, bold=True)

    p = c_cell.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Ringkasan Kebutuhan Atribut Identitas & Opsi Integrasi Teknis (Technical Brief)")
    set_run_font(r, size=9.0, color=LIGHT_BLUE, italic=True)

    p = c_cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run("Versi: 1.0 (Ringkas)  |  Tanggal: 25 September 2026  |  Ditujukan Kepada: Tim Pengembang SSO UAY")
    set_run_font(r, size=8.0, color=WHITE)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(4)

    # 1. Latar Belakang & Kendala Teknis
    add_heading(doc, "1. Latar Belakang & Kendala Teknis", level=1)
    add_text(doc, "Berdasarkan telaah terhadap Bab 7 (Authentication & Session) Dokumen Teknis SSO UAY, Keycloak SSO saat ini hanya menerbitkan Access Token dengan klaim identitas dasar: sub (UUID), preferred_username, email, dan name.")
    add_text(doc, "Agar E-Learning UAY dapat menghubungkan mahasiswa ke rombongan belajar (kelas kuliah), mencatat nilai KRS, memvalidasi presensi perkuliahan, dan menerapkan hak akses dosen vs mahasiswa (RBAC), E-Learning memerlukan 4 atribut data tambahan dari ekosistem SSO.")

    # 2. 4 Poin Kebutuhan Data yang Belum Terpenuhi
    add_heading(doc, "2. 4 Poin Kebutuhan Data yang Belum Terpenuhi", level=1)
    headers_req = ["No", "Atribut / Data", "Sumber DB SSO", "Tipe Data", "Urgensi & Fungsi Nyata di E-Learning"]
    rows_req = [
        ["1", "identifier_value", "user_identifiers.identifier_value", "String (NIM / NIDN)", "Kritis (Wajib). Kunci pengait mahasiswa ke kelas kuliah, rombongan belajar KRS, presensi, dan pelaporan nilai SIMAK/PDDikti."],
        ["2", "roles", "application_access -> roles.name", "Array String", "Kritis (Wajib). Menentukan hak akses: INSTRUCTOR (dosen pembuat modul/soal ujian) vs STUDENT (mahasiswa pengerja tugas/kuis)."],
        ["3", "status", "users.status / accounts.status", "String (ACTIVE / DISABLED)", "Kritis (Wajib). Penegasan akun aktif. Memblokir mahasiswa cuti / skorsing agar tidak dapat menyusup ke ujian online."],
        ["4", "user_type", "users.user_type", "String (STUDENT, LECTURER, STAFF)", "Penting. Mengidentifikasi tipe direktori pengguna untuk personalisasi menu dashboard dan profil pengguna di LMS."]
    ]
    # Total width = 9360: 400, 1600, 2400, 1600, 3360
    add_table(doc, headers_req, rows_req, [400, 1600, 2400, 1600, 3360])

    # 3. Mengapa Atribut Ini Mutlak Diperlukan?
    add_heading(doc, "3. Mengapa Atribut Ini Mutlak Diperlukan?", level=1)
    add_callout(doc, "DAMPAK OPERASIONAL JIKA ATRIBUT TIDAK TERSEDIA",
        "• Distribusi Kelas Kuliah: E-Learning mengelompokkan mahasiswa ke kelas spesifik berdasarkan NIM. Tanpa NIM, mahasiswa tidak akan menemukan kelas kuliahnya.\n• Integritas Nilai & Transkrip: Nilai kuis, tugas, dan ujian akhir terikat secara legal pada NIM mahasiswa dan NIDN dosen pengampu untuk disinkronkan ke SIMAK/SIAKAD.\n• Kontrol Hak Akses (RBAC): Tanpa data role, LMS tidak dapat membedakan kewenangan Dosen (mengunggah soal/nilai) dan Mahasiswa (mengerjakan soal).",
        fill=LIGHT_GOLD, label_color=GOLD)

    # EXPLICIT PAGE BREAK TO GUARANTEE EXACTLY 2 PAGES
    doc.add_page_break()

    # PAGE 2: 4. Dua Pilihan Solusi Praktis
    add_heading(doc, "4. Dua Pilihan Solusi Praktis (Pilih Salah Satu)", level=1)
    
    add_heading(doc, "OPSI A: Konfigurasi Protocol Mapper di Keycloak (Sangat Direkomendasikan)", level=2)
    add_text(doc, "Tim SSO cukup menambahkan 4 konfigurasi Protocol Mapper pada client elearning-uay di Keycloak Admin Console. Waktu pengerjaan ~15 menit, tanpa coding (zero code), latensi 0 ms (stateless), dan sangat tangguh menghadapi lonjakan trafik saat ribuan mahasiswa ujian daring serentak.")

    headers_map = ["Nama Mapper", "Mapper Type", "User Attribute (SSO)", "Token Claim Name", "Add to ID / Access Token"]
    rows_map = [
        ["nim_nidn_mapper", "User Attribute", "identifier_value", "identifier_value", "ON / ON"],
        ["elearning_roles_mapper", "User Client Role / Attribute", "roles", "roles", "ON / ON (Multivalued: ON)"],
        ["account_status_mapper", "User Attribute", "status", "status", "ON / ON"],
        ["user_type_mapper", "User Attribute", "user_type", "user_type", "ON / ON"]
    ]
    # Total width = 9360: 2000, 2360, 1800, 1800, 1400
    add_table(doc, headers_map, rows_map, [2000, 2360, 1800, 1800, 1400])

    add_heading(doc, "OPSI B: Penyediaan Endpoint REST API di Backend SSO (Alternatif)", level=2)
    add_text(doc, "Jika Tim SSO memilih Keycloak tetap murni tanpa custom mapper (sesuai alur Bab 7.9 & 20.2.3), mohon Tim SSO menyediakan 1 endpoint REST API di Backend SSO:")
    add_text(doc, "Endpoint: GET /api/v1/auth/context  |  Headers: Authorization: Bearer <token_keycloak>, X-Client-ID: elearning-uay")
    add_code(doc, """// Contoh Response JSON dari Backend SSO (200 OK):
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "identifier_value": "202401001",
  "identifier_type": "NIM",
  "roles": ["STUDENT"],
  "status": "ACTIVE",
  "user_type": "STUDENT"
}""")

    # 5. Contoh Payload Token JWT yang Diharapkan (Opsi A)
    add_heading(doc, "5. Contoh Payload Token JWT Lengkap yang Diharapkan (Opsi A)", level=1)
    add_code(doc, """{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "preferred_username": "202401001",
  "name": "Ahmad Dahlan",
  "email": "ahmad.dahlan@uay.ac.id",
  "user_type": "STUDENT",
  "status": "ACTIVE",
  "identifier_type": "NIM",
  "identifier_value": "202401001",
  "roles": ["STUDENT"]
}""")

    # 6. Tindak Lanjut & Kontak Pengujian
    add_heading(doc, "6. Tindak Lanjut & Kontak Pengujian Bersama", level=1)
    add_callout(doc, "KESIAPAN IMPLEMENTASI TIM E-LEARNING",
        "Tim E-Learning telah menyiapkan kode autentikasi untuk menerima format Opsi A maupun Opsi B (termasuk normalisasi otomatis peran bahasa Indonesia/Inggris dan fleksibilitas status). Begitu Tim SSO mengaktifkan salah satu opsi di Staging UAY, kami siap langsung melakukan verifikasi end-to-end.",
        fill=LIGHT_GREEN, label_color=GREEN)

    p_dt = doc.add_paragraph()
    p_dt.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_dt.paragraph_format.space_before = Pt(4)
    p_dt.paragraph_format.space_after = Pt(0)
    r = p_dt.add_run("Palu, 25 September 2026 — Tim Pengembang E-Learning UAY")
    set_run_font(r, size=8.5, color=MUTED, italic=True)

    doc.save(DOCX_PATH)
    print(f"[OK] Word document generated: {DOCX_PATH}")

def convert_docx_to_pdf():
    print(f"Converting DOCX to PDF via Microsoft Word COM...")
    word = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = False

        doc = word.Documents.Open(str(DOCX_PATH.resolve()))
        # FileFormat 17 = wdFormatPDF
        doc.SaveAs(str(PDF_PATH.resolve()), FileFormat=17)
        doc.Close(False)
        print(f"[OK] PDF generated successfully: {PDF_PATH}")
    except Exception as e:
        print(f"[ERROR] Failed to convert DOCX to PDF via Word COM: {e}")
        raise
    finally:
        if word:
            word.Quit()

def build_all():
    print("=== Generating SSO Brief Document Suite (Ringkas / 2 Halaman) ===")
    generate_markdown()
    generate_docx()
    convert_docx_to_pdf()
    print("=== All Brief Documents Generated Successfully ===")

if __name__ == "__main__":
    build_all()
