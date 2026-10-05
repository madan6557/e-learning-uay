# -*- coding: utf-8 -*-
"""
Generate beautifully formatted DOCX user guide document for E-Learning UAY with embedded UI screenshots.
Designed specifically for non-technical users (Lecturers, Students, Campus Admins, Leadership).
"""
from pathlib import Path
import re
import shutil
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(r"E:\UVAYA\Project\E - Learning UAY")
DOCS_DIR = ROOT / "docs"
PROJECT_ROOT = Path(r"E:\UVAYA\Project")
OUT_DOCX = DOCS_DIR / "Buku Panduan Penggunaan E-Learning UAY.docx"
OUT_ROOT_DOCX = PROJECT_ROOT / "Buku Panduan Penggunaan E-Learning UAY.docx"

def sanitize_xml(s):
    if not isinstance(s, str):
        return ""
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', s)

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_guide_docx():
    doc = Document()
    
    # Page setup - Margins
    for section in doc.sections:
        section.top_margin = Inches(0.9)
        section.bottom_margin = Inches(0.9)
        section.left_margin = Inches(0.9)
        section.right_margin = Inches(0.9)
        section.header_distance = Inches(0.4)
        section.footer_distance = Inches(0.4)

    # Color definitions
    C_PRIMARY = RGBColor(22, 101, 52)      # Deep Emerald Green (#166534)
    C_SECONDARY = RGBColor(15, 23, 42)     # Dark Slate
    C_MUTED = RGBColor(100, 116, 139)      # Muted Gray
    C_TEXT = RGBColor(30, 41, 59)          # Body Slate

    # 1. Cover Page
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst = p_inst.add_run("UNIVERSITAS ACHMAD YANI (UAY)\nLEMBAGA PENGEMBANGAN TEKNOLOGI INFORMASI & PEMBELAJARAN")
    r_inst.font.name = "Arial"
    r_inst.font.size = Pt(11)
    r_inst.font.bold = True
    r_inst.font.color.rgb = C_PRIMARY

    doc.add_paragraph("\n" * 2)

    # Official Logo on Cover
    logo_path = DOCS_DIR / "images" / "uay-logo.png"
    if logo_path.exists():
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_logo = p_logo.add_run()
        r_logo.add_picture(str(logo_path), width=Inches(2.0))

    doc.add_paragraph("\n")

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("BUKU PANDUAN PENGGUNAAN RESMI\nE-LEARNING UAY")
    r_title.font.name = "Arial"
    r_title.font.size = Pt(24)
    r_title.font.bold = True
    r_title.font.color.rgb = C_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run("Pedoman Operasional Praktis Sistem Pembelajaran Digital Kampus Berbasis Peran\n(Dosen Pengampu · Mahasiswa · Admin Program Studi · Pimpinan)")
    r_sub.font.name = "Arial"
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = C_SECONDARY

    doc.add_paragraph("\n" * 3)

    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_meta = p_meta.add_run("Edisi Ramah Pengguna Non-Teknis · Terbit: Oktober 2026\nTahun Akademik 2026/2027 · Alamat Resmi: https://e-learning.uay.ac.id\nBanjarmasin, Kalimantan Selatan")
    r_meta.font.name = "Arial"
    r_meta.font.size = Pt(10)
    r_meta.font.italic = True
    r_meta.font.color.rgb = C_MUTED

    doc.add_page_break()

    # Parse markdown and add content
    md_file = DOCS_DIR / "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md"
    with open(md_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    in_table = False
    table_rows = []

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            in_table = False
            return
        
        # Clean rows
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

        cols_count = max(len(r) for r in cleaned)
        table = doc.add_table(rows=len(cleaned), cols=cols_count)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        for r_idx, r_data in enumerate(cleaned):
            is_header = (r_idx == 0)
            row = table.rows[r_idx]
            for c_idx in range(cols_count):
                cell = row.cells[c_idx]
                val = r_data[c_idx] if c_idx < len(r_data) else ""
                cell.text = sanitize_xml(val.replace("**", "").replace("*", ""))
                
                # Styling
                if is_header:
                    set_cell_background(cell, "166534")  # Emerald Green
                    for p in cell.paragraphs:
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        for run in p.runs:
                            run.font.bold = True
                            run.font.color.rgb = RGBColor(255, 255, 255)
                            run.font.size = Pt(9.5)
                else:
                    bg = "F8FAFC" if (r_idx % 2 == 1) else "FFFFFF"
                    set_cell_background(cell, bg)
                    for p in cell.paragraphs:
                        for run in p.runs:
                            run.font.size = Pt(9)
                            run.font.color.rgb = C_TEXT
                set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
        
        doc.add_paragraph()  # Spacing after table
        in_table = False
        table_rows = []

    skip_front = True
    for line in lines:
        stripped = line.strip()

        # Skip markdown cover title line since we created a native cover page
        if stripped.startswith("# BUKU PANDUAN PENGGUNAAN RESMI"):
            skip_front = False
            continue
        if skip_front:
            continue
        if stripped.startswith("**Pedoman Praktis") or stripped.startswith("*Edisi Ramah"):
            continue
        if stripped == "---":
            continue

        # Check table
        if stripped.startswith("|") and stripped.endswith("|"):
            in_table = True
            table_rows.append(stripped)
            continue
        elif in_table:
            flush_table()

        # Image embed: ![Alt](images/filename.png)
        img_match = re.match(r'!\[(.*?)\]\((.*?)\)', stripped)
        if img_match:
            img_rel = img_match.group(2).strip()
            img_file = DOCS_DIR / img_rel
            if not img_file.exists():
                # Try images/ direct
                img_file = DOCS_DIR / "images" / Path(img_rel).name
            if img_file.exists():
                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(8)
                p_img.paragraph_format.space_after = Pt(4)
                r_img = p_img.add_run()
                r_img.add_picture(str(img_file), width=Inches(6.0))
            continue

        # Image caption: *Gambar X.X: ...*
        if stripped.startswith("*Gambar ") and stripped.endswith("*"):
            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(10)
            r_cap = p_cap.add_run(sanitize_xml(stripped.strip("*")))
            r_cap.font.name = "Arial"
            r_cap.font.size = Pt(8.5)
            r_cap.font.italic = True
            r_cap.font.color.rgb = C_MUTED
            continue

        # Headings
        if stripped.startswith("## "):
            h = doc.add_heading(level=1)
            r = h.add_run(sanitize_xml(stripped[3:]))
            r.font.name = "Arial"
            r.font.bold = True
            r.font.color.rgb = C_PRIMARY
            h.paragraph_format.space_before = Pt(16)
            h.paragraph_format.space_after = Pt(6)
        elif stripped.startswith("### "):
            h = doc.add_heading(level=2)
            r = h.add_run(sanitize_xml(stripped[4:]))
            r.font.name = "Arial"
            r.font.bold = True
            r.font.color.rgb = RGBColor(21, 128, 61)
            h.paragraph_format.space_before = Pt(12)
            h.paragraph_format.space_after = Pt(4)
        elif stripped.startswith("#### "):
            h = doc.add_heading(level=3)
            r = h.add_run(sanitize_xml(stripped[5:]))
            r.font.name = "Arial"
            r.font.bold = True
            r.font.color.rgb = C_SECONDARY
            h.paragraph_format.space_before = Pt(8)
            h.paragraph_format.space_after = Pt(2)
        elif stripped.startswith("```"):
            continue
        elif stripped.startswith("> "):
            # Callout box
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.4)
            p.paragraph_format.right_indent = Inches(0.2)
            r = p.add_run(sanitize_xml(stripped[2:]))
            r.font.italic = True
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(180, 83, 9)  # Amber
        elif stripped:
            # Normal paragraph or list
            p = doc.add_paragraph()
            if stripped.startswith("- ") or stripped.startswith("* "):
                p.paragraph_format.left_indent = Inches(0.25)
                raw_text = stripped[2:]
            elif stripped[0].isdigit() and len(stripped) > 2 and stripped[1:3] in (". ", ") "):
                p.paragraph_format.left_indent = Inches(0.25)
                raw_text = stripped
            else:
                raw_text = stripped

            clean_text = sanitize_xml(raw_text.replace("**", "").replace("*", ""))
            r = p.add_run(clean_text)
            r.font.name = "Arial"
            r.font.size = Pt(10)
            r.font.color.rgb = C_TEXT
            p.paragraph_format.space_after = Pt(3)

    if in_table:
        flush_table()

    doc.save(str(OUT_DOCX))
    shutil.copy2(OUT_DOCX, OUT_ROOT_DOCX)
    print(f"Formatted DOCX generated: {OUT_DOCX} and copied to {OUT_ROOT_DOCX}")

if __name__ == "__main__":
    create_guide_docx()
