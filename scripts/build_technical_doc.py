from __future__ import annotations

import shutil
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from docx.enum.style import WD_STYLE_TYPE


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT.parent / "Struktur Sederhana Dokumen Teknis UAY.docx"
DOCS = ROOT / "docs"
DIAGRAMS = DOCS / "diagrams"
OUTPUT = DOCS / "Technical Design - E-Learning UAY.docx"

NAVY = "17395C"
BLUE = "2B6CB0"
INK = "17233C"
MUTED = "64748B"
LIGHT_BLUE = "EAF2F8"
LIGHT_GRAY = "F3F6F9"
LINE = "D8E0EA"
GOLD = "B7791F"
LIGHT_GOLD = "FFF7E6"
GREEN = "2F855A"
LIGHT_GREEN = "ECFDF5"
RED = "9B2C2C"
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


def set_cell_margins(cell, top=90, start=120, bottom=90, end=120) -> None:
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


def set_cell_border(cell, color=LINE, size="6") -> None:
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
    tbl = table._tbl
    tbl_pr = tbl.tblPr

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

    grid = tbl.tblGrid
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


def clear_paragraph(paragraph) -> None:
    for run in list(paragraph.runs):
        paragraph._p.remove(run._r)


def set_run_font(run, name="Lexend", size=10.5, color=INK, bold=False, italic=False) -> None:
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.font.color.rgb = rgb(color)
    run.bold = bold
    run.italic = italic


def style_doc(doc: Document) -> None:
    section = doc.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.header_distance = Inches(0.45)
    section.footer_distance = Inches(0.45)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Lexend"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Lexend")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Lexend")
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = rgb(INK)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15

    tokens = {
        "Heading 1": (19, NAVY, 16, 7, True),
        "Heading 2": (14, BLUE, 12, 5, True),
        "Heading 3": (11.5, NAVY, 8, 4, True),
    }
    for name, (size, color, before, after, bold) in tokens.items():
        style = styles[name]
        style.font.name = "Lexend"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Lexend")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Lexend")
        style.font.size = Pt(size)
        style.font.color.rgb = rgb(color)
        style.font.bold = bold
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True

    for style_name in ("List Bullet", "List Number"):
        if style_name not in [s.name for s in styles]:
            continue
        style = styles[style_name]
        style.font.name = "Lexend"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Lexend")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Lexend")
        style.font.size = Pt(10)
        style.paragraph_format.left_indent = Inches(0.34)
        style.paragraph_format.first_line_indent = Inches(-0.18)
        style.paragraph_format.space_after = Pt(3)
        style.paragraph_format.line_spacing = 1.15

    if "Code" not in [s.name for s in styles]:
        code = styles.add_style("Code", WD_STYLE_TYPE.PARAGRAPH)
    else:
        code = styles["Code"]
    code.font.name = "Consolas"
    code._element.rPr.rFonts.set(qn("w:ascii"), "Consolas")
    code._element.rPr.rFonts.set(qn("w:hAnsi"), "Consolas")
    code.font.size = Pt(8.5)
    code.font.color.rgb = rgb(INK)
    code.paragraph_format.space_after = Pt(4)
    code.paragraph_format.line_spacing = 1.0

    header = section.header
    hp = header.paragraphs[0]
    clear_paragraph(hp)
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = hp.add_run("PLATFORM UAY  /  E-LEARNING TECHNICAL DESIGN")
    set_run_font(r, size=8.5, color=MUTED, bold=True)

    footer = section.footer
    fp = footer.paragraphs[0]
    clear_paragraph(fp)
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run("E-Learning UAY  •  Draft v0.1  •  2 September 2026  •  Page ")
    set_run_font(r, size=8, color=MUTED)
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    fp._p.append(fld)


def remove_body_content(doc: Document) -> None:
    body = doc._element.body
    for child in list(body):
        if child.tag != qn("w:sectPr"):
            body.remove(child)


def add_text(doc, text: str, style=None, bold_prefix: str | None = None, color=INK, size=10.5):
    p = doc.add_paragraph(style=style)
    if bold_prefix and text.startswith(bold_prefix):
        r = p.add_run(bold_prefix)
        set_run_font(r, size=size, color=color, bold=True)
        r = p.add_run(text[len(bold_prefix):])
        set_run_font(r, size=size, color=color)
    else:
        r = p.add_run(text)
        set_run_font(r, size=size, color=color)
    return p


def add_heading(doc, text: str, level=1):
    return doc.add_heading(text, level=level)


def add_bullets(doc, items: list[str], numbered=False):
    for index, item in enumerate(items, start=1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.22)
        p.paragraph_format.first_line_indent = Inches(-0.16)
        p.paragraph_format.space_after = Pt(3)
        marker = f"{index}. " if numbered else "• "
        r = p.add_run(marker)
        set_run_font(r, size=10, color=BLUE, bold=True)
        r = p.add_run(item)
        set_run_font(r, size=10, color=INK)


def add_numbered(doc, items: list[str]):
    add_bullets(doc, items, numbered=True)


def add_callout(doc, label: str, body: str, fill=LIGHT_BLUE, label_color=BLUE):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9020])
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    set_cell_border(cell, fill, "0")
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(label.upper())
    set_run_font(r, size=8.5, color=label_color, bold=True)
    p = cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run(body)
    set_run_font(r, size=10, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_table(doc, headers: list[str], rows: list[list[str]], widths: list[int], small=False):
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
        set_run_font(r, size=8.5 if small else 9, color=WHITE, bold=True)
    for row_index, values in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(values):
            cell = cells[i]
            set_cell_shading(cell, LIGHT_GRAY if row_index % 2 else WHITE)
            set_cell_border(cell)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            r = p.add_run(str(value))
            set_run_font(r, size=8.5 if small else 9.5, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_code(doc, text: str):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9020])
    cell = table.cell(0, 0)
    set_cell_shading(cell, "F7FAFC")
    set_cell_border(cell, LINE, "4")
    cell.paragraphs[0].style = "Code"
    cell.paragraphs[0].paragraph_format.space_after = Pt(0)
    for index, line in enumerate(text.splitlines()):
        p = cell.paragraphs[0] if index == 0 else cell.add_paragraph(style="Code")
        r = p.add_run(line)
        set_run_font(r, name="Consolas", size=8.2, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def add_diagram(doc, name: str, caption: str):
    path = DIAGRAMS / f"{name}.png"
    if path.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(4)
        p.paragraph_format.space_after = Pt(2)
        inline_shape = p.add_run().add_picture(str(path), width=Inches(6.12))
        inline_shape._inline.docPr.set("title", name.replace("-", " ").title())
        inline_shape._inline.docPr.set("descr", caption)
        cap = doc.add_paragraph()
        cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cap.paragraph_format.space_after = Pt(7)
        r = cap.add_run(caption)
        set_run_font(r, size=8.5, color=MUTED, italic=True)


def font(size: int, bold=False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def wrap_text(draw, text: str, width: int, fnt):
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def box(draw, x, y, w, h, title, body="", fill=LIGHT_BLUE, outline=BLUE, title_fill=None):
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=f"#{fill}", outline=f"#{outline}", width=3)
    if title_fill:
        draw.rounded_rectangle((x, y, x + w, y + 44), radius=18, fill=f"#{title_fill}")
        draw.rectangle((x, y + 22, x + w, y + 44), fill=f"#{title_fill}")
    draw.text((x + 18, y + 12), title, font=font(21, True), fill=f"#{NAVY}")
    if body:
        fnt = font(17)
        lines = wrap_text(draw, body, w - 36, fnt)
        for index, line in enumerate(lines[:7]):
            draw.text((x + 18, y + 56 + index * 24), line, font=fnt, fill=f"#{INK}")


def arrow(draw, start, end, label="", color=BLUE):
    draw.line((start[0], start[1], end[0], end[1]), fill=f"#{color}", width=4)
    dx, dy = end[0] - start[0], end[1] - start[1]
    length = max((dx * dx + dy * dy) ** 0.5, 1)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    tip = end
    left = (tip[0] - ux * 18 + px * 8, tip[1] - uy * 18 + py * 8)
    right = (tip[0] - ux * 18 - px * 8, tip[1] - uy * 18 - py * 8)
    draw.polygon((tip, left, right), fill=f"#{color}")
    if label:
        mx, my = (start[0] + end[0]) // 2, (start[1] + end[1]) // 2
        draw.text((mx - 60, my - 24), label, font=font(15, True), fill=f"#{MUTED}")


def title_image(draw, title):
    draw.text((50, 30), title, font=font(30, True), fill=f"#{NAVY}")


def make_diagrams():
    DIAGRAMS.mkdir(parents=True, exist_ok=True)

    im = Image.new("RGB", (1600, 900), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "System context dan ownership boundary")
    box(d, 50, 330, 220, 100, "Pengguna", "Browser desktop, tablet, mobile", "F7FAFC", MUTED)
    box(d, 350, 160, 280, 120, "SSO / Identity", "Account, session, global role", LIGHT_BLUE, BLUE)
    box(d, 350, 470, 280, 120, "E-Learning FE", "Learning experience and editor", LIGHT_BLUE, BLUE)
    box(d, 760, 440, 300, 150, "E-Learning BE", "Domain policy, transactions, audit", "E8F0FE", BLUE)
    box(d, 1140, 150, 300, 150, "File Service", "Binary, ACL, trash, restore", "FFF7E6", GOLD)
    box(d, 1140, 500, 300, 120, "External systems", "Future academic portal or notification", "F7FAFC", MUTED)
    box(d, 760, 700, 300, 100, "PostgreSQL", "E-Learning-owned relational data", LIGHT_GREEN, GREEN)
    box(d, 1140, 700, 300, 100, "Object storage", "File Service-owned binary", "FFF7E6", GOLD)
    arrow(d, (270, 350), (350, 230), "login")
    arrow(d, (270, 410), (350, 530), "use")
    arrow(d, (630, 220), (760, 490), "claims")
    arrow(d, (630, 530), (760, 510), "API")
    arrow(d, (1060, 480), (1140, 230), "file API")
    arrow(d, (1290, 300), (1290, 700), "binary")
    arrow(d, (910, 590), (910, 700), "transaction")
    arrow(d, (1060, 550), (1140, 550), "correlation")
    im.save(DIAGRAMS / "01-system-context.png")

    im = Image.new("RGB", (1600, 900), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "SSO login sequence - recommended OIDC flow")
    lanes = [(100, "User"), (450, "SSO"), (850, "E-Learning FE"), (1250, "E-Learning API")]
    for x, label in lanes:
        d.text((x - 45, 100), label, font=font(21, True), fill=f"#{NAVY}")
        d.line((x, 150, x, 780), fill=f"#{LINE}", width=3)
    steps = [
        (100, 210, 850, "Open E-Learning"),
        (850, 290, 450, "Authorization Code + PKCE"),
        (450, 370, 850, "Redirect with code"),
        (850, 450, 1250, "Exchange code / token"),
        (1250, 530, 450, "Validate issuer, audience, expiry"),
        (1250, 610, 1250, "Upsert IdentityRef"),
        (1250, 690, 850, "Create E-Learning session"),
        (850, 770, 100, "Show dashboard"),
    ]
    for x1, y, x2, label in steps:
        if x1 == x2:
            d.text((x1 + 18, y - 12), label, font=font(15), fill=f"#{MUTED}")
        else:
            arrow(d, (x1, y), (x2, y), label)
    im.save(DIAGRAMS / "02-sso-sequence.png")

    im = Image.new("RGB", (1600, 900), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "File upload and authorized download")
    box(d, 40, 370, 220, 110, "Pengguna", "Choose file", "F7FAFC", MUTED)
    box(d, 350, 320, 300, 190, "E-Learning", "Check class/item policy; store FileRef", LIGHT_BLUE, BLUE)
    box(d, 760, 320, 300, 190, "File Service", "Create object, ACL, scan, signed URL", "FFF7E6", GOLD)
    box(d, 1170, 320, 300, 190, "Object storage", "Binary only", "FFF7E6", GOLD)
    arrow(d, (260, 410), (350, 410), "context")
    arrow(d, (650, 380), (760, 380), "create object")
    arrow(d, (1060, 410), (1170, 410), "upload binary")
    arrow(d, (1170, 480), (1060, 480), "scan status")
    arrow(d, (760, 500), (650, 500), "fileObjectId")
    arrow(d, (650, 560), (760, 560), "authorize access")
    arrow(d, (1060, 600), (650, 600), "signed download URL")
    arrow(d, (350, 660), (260, 660), "stream file")
    im.save(DIAGRAMS / "03-file-sequence.png")

    im = Image.new("RGB", (1600, 900), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "Audit transaction flow")
    box(d, 50, 340, 240, 130, "API command", "requestId + correlationId", LIGHT_BLUE, BLUE)
    box(d, 390, 340, 250, 130, "Policy", "authorize actor and context", "E8F0FE", BLUE)
    box(d, 750, 170, 300, 130, "Domain change", "update Course, Grade, Submission...", LIGHT_GREEN, GREEN)
    box(d, 750, 510, 300, 130, "AuditEvent", "actor, action, object, context, result", LIGHT_GOLD, GOLD)
    box(d, 1190, 170, 300, 130, "AuditChange", "field path, before, after", LIGHT_GOLD, GOLD)
    box(d, 1190, 510, 300, 130, "PostgreSQL", "same transaction; append-only", "F7FAFC", MUTED)
    arrow(d, (290, 400), (390, 400), "")
    arrow(d, (640, 380), (750, 235), "allow")
    arrow(d, (640, 430), (750, 570), "same tx")
    arrow(d, (1050, 235), (1190, 235), "diff")
    arrow(d, (1050, 570), (1190, 570), "commit")
    arrow(d, (1050, 570), (1190, 235), "snapshot")
    im.save(DIAGRAMS / "04-audit-flow.png")

    im = Image.new("RGB", (1600, 950), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "E-Learning module hierarchy")
    box(d, 620, 90, 360, 90, "E-Learning", "", LIGHT_BLUE, BLUE)
    box(d, 80, 300, 270, 90, "Dashboard", "", "F7FAFC", MUTED)
    box(d, 420, 270, 270, 120, "Course", "Class, instructor, enrollment", "E8F0FE", BLUE)
    box(d, 800, 270, 270, 120, "Course Class", "Term, roster, policy", "E8F0FE", BLUE)
    box(d, 1180, 270, 270, 120, "Section", "Meeting / topic / week", "E8F0FE", BLUE)
    box(d, 620, 510, 360, 110, "Ordered Learning Item", "Resource, Quiz, Assignment", LIGHT_GREEN, GREEN)
    box(d, 80, 720, 270, 90, "Rich Resource", "Blocks and FileRef", "FFF7E6", GOLD)
    box(d, 420, 720, 270, 90, "Quiz", "Question, Attempt, Answer", "FFF7E6", GOLD)
    box(d, 800, 720, 270, 90, "Assignment", "Submission versions", "FFF7E6", GOLD)
    box(d, 1180, 720, 270, 90, "Gradebook", "Draft and published grade", "FFF7E6", GOLD)
    for a, b in [((800, 180), (555, 270)), ((800, 180), (935, 270)), ((935, 390), (1315, 270)), ((555, 390), (800, 510)), ((1315, 390), (800, 510)), ((800, 620), (215, 720)), ((800, 620), (555, 720)), ((800, 620), (935, 720)), ((800, 620), (1315, 720))]:
        arrow(d, a, b, "")
    im.save(DIAGRAMS / "05-module-hierarchy.png")

    im = Image.new("RGB", (1800, 1200), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "Core ERD - logical view")
    entities = [
        (40, 180, 250, 100, "IDENTITY_REF", "externalSubject, status"),
        (380, 90, 250, 100, "COURSE", "title, status"),
        (730, 90, 280, 100, "COURSE_CLASS", "term, status"),
        (1120, 90, 260, 100, "ENROLLMENT", "identity + class"),
        (1450, 90, 280, 100, "TEACHING_ASSIGNMENT", "identity + class"),
        (730, 300, 250, 100, "SECTION", "position, availability"),
        (1080, 300, 280, 110, "LEARNING_ITEM", "kind, position"),
        (1450, 300, 280, 110, "RESOURCE", "current revision"),
        (380, 560, 280, 110, "RESOURCE_REVISION", "schema, document JSON"),
        (730, 560, 250, 110, "CONTENT_BLOCK", "type, payload"),
        (1080, 560, 250, 110, "QUIZ", "release policy"),
        (1430, 560, 250, 110, "QUESTION", "type, points"),
        (380, 820, 280, 110, "QUIZ_ATTEMPT", "identity, score"),
        (730, 820, 250, 110, "ANSWER", "response"),
        (1080, 820, 280, 110, "ASSIGNMENT", "submission policy"),
        (1430, 820, 250, 110, "SUBMISSION_VERSION", "immutable version"),
        (380, 1030, 280, 100, "GRADE_RECORD", "draft/published"),
        (800, 1030, 280, 100, "FILE_REF", "fileObjectId"),
        (1190, 1030, 280, 100, "AUDIT_EVENT", "before/after"),
        (1540, 1030, 220, 100, "AUDIT_CHANGE", "field diff"),
    ]
    for x, y, w, h, title, body in entities:
        box(d, x, y, w, h, title, body, "F7FAFC", BLUE)
    relations = [
        ((290, 230), (380, 140)), ((630, 140), (730, 140)), ((1010, 140), (1120, 140)), ((1380, 140), (1450, 140)),
        ((870, 190), (850, 300)), ((980, 350), (1080, 350)), ((1360, 350), (1450, 350)), ((1200, 410), (520, 560)),
        ((660, 615), (730, 615)), ((1200, 410), (1200, 560)), ((1360, 615), (1430, 615)), ((1200, 670), (520, 820)),
        ((660, 875), (730, 875)), ((1200, 670), (1080, 875)), ((1360, 875), (1430, 875)), ((520, 930), (520, 1030)),
        ((800, 930), (940, 1030)), ((1080, 1080), (1190, 1080)), ((1470, 1080), (1540, 1080)),
    ]
    for a, b in relations:
        arrow(d, a, b, "")
    im.save(DIAGRAMS / "06-erd.png")

    im = Image.new("RGB", (1600, 900), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "Deployment topology - independent services")
    box(d, 60, 350, 260, 120, "Browser", "UAY users", "F7FAFC", MUTED)
    box(d, 430, 210, 290, 120, "Reverse proxy", "TLS and routing", LIGHT_BLUE, BLUE)
    box(d, 430, 490, 290, 120, "E-Learning FE", "Static assets", LIGHT_BLUE, BLUE)
    box(d, 900, 170, 300, 140, "E-Learning API", "Container / service", "E8F0FE", BLUE)
    box(d, 900, 470, 300, 140, "PostgreSQL", "Managed, encrypted, backed up", LIGHT_GREEN, GREEN)
    box(d, 1320, 170, 220, 140, "SSO API", "OIDC / JWKS", "FFF7E6", GOLD)
    box(d, 1320, 470, 220, 140, "File Service", "ACL / signed URL", "FFF7E6", GOLD)
    box(d, 1320, 700, 220, 100, "Object store", "File Service-owned", "FFF7E6", GOLD)
    arrow(d, (320, 380), (430, 270), "HTTPS")
    arrow(d, (320, 430), (430, 550), "HTTPS")
    arrow(d, (720, 270), (900, 240), "API")
    arrow(d, (720, 550), (900, 240), "API")
    arrow(d, (1050, 310), (1050, 470), "SQL")
    arrow(d, (1200, 240), (1320, 240), "claims")
    arrow(d, (1200, 540), (1320, 540), "file API")
    arrow(d, (1430, 610), (1430, 700), "binary")
    im.save(DIAGRAMS / "07-deployment.png")

    im = Image.new("RGB", (1800, 1200), "white")
    d = ImageDraw.Draw(im)
    title_image(d, "Domain state transitions")
    lanes = [
        (120, "Course", ["DRAFT", "PUBLISHED", "ARCHIVED"]),
        (360, "Learning item", ["DRAFT / HIDDEN", "OPEN", "CLOSED / ARCHIVED"]),
        (600, "Submission", ["STARTED", "SUBMITTED", "GRADED"]),
        (840, "Grade record", ["DRAFT", "PUBLISHED", "REVISED / DRAFT"]),
    ]
    for y, label, states in lanes:
        d.text((70, y + 24), label, font=font(22, True), fill=f"#{NAVY}")
        x_positions = [390, 820, 1250]
        for x, state in zip(x_positions, states):
            box(d, x, y, 300, 100, state, "", LIGHT_BLUE if state in ("PUBLISHED", "OPEN", "SUBMITTED") else "F7FAFC", BLUE)
        arrow(d, (690, y + 50), (820, y + 50), "publish" if label in ("Course", "Grade record") else "open")
        arrow(d, (1120, y + 50), (1250, y + 50), "archive" if label == "Course" else "grade" if label == "Submission" else "close" if label == "Learning item" else "revise")
    add_note = "Every transition is authorized, idempotent, and audited with before/after state."
    d.rounded_rectangle((390, 1060, 1590, 1140), radius=14, fill=f"#{LIGHT_GOLD}", outline=f"#{GOLD}", width=3)
    d.text((430, 1085), add_note, font=font(20, True), fill=f"#{NAVY}")
    im.save(DIAGRAMS / "08-states.png")


def build_document():
    make_diagrams()
    doc = Document(str(REFERENCE))
    remove_body_content(doc)
    style_doc(doc)

    # Cover
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(28)
    p.paragraph_format.space_after = Pt(12)
    r = p.add_run("TECHNICAL DESIGN  /  E-LEARNING UAY")
    set_run_font(r, size=10, color=BLUE, bold=True)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run("E-Learning UAY")
    set_run_font(r, size=31, color=NAVY, bold=True)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(22)
    r = p.add_run("Architecture, domain model, integration, audit, and pilot plan")
    set_run_font(r, size=14, color=MUTED)
    add_callout(doc, "Keputusan utama", "Bangun proyek E-Learning UAY baru dengan clean-start pada domain, database, auth, file integration, dan audit. Reuse OMNI hanya untuk UI, tooling, dan pola fitur yang sudah tervalidasi.", LIGHT_BLUE, BLUE)
    add_table(doc, ["Atribut", "Nilai"], [
        ["Dokumen", "Technical Design E-Learning UAY"],
        ["Versi", "0.1 - Draft untuk penyelarasan lintas service"],
        ["Sumber kebutuhan", "Requirement Digital UAY v1.1, 2 September 2026"],
        ["Target", "Pilot Prodi Informatika dan beberapa mata kuliah"],
        ["Prioritas", "P0 wajib; P1 jika memungkinkan; P2 future development"],
        ["Workspace", "E:\\UVAYA\\Project\\E - Learning UAY"],
    ], [2200, 6820])
    add_text(doc, "Dokumen ini sengaja memisahkan keputusan yang dapat ditetapkan oleh tim E-Learning dari kontrak yang harus disepakati dengan tim SSO dan File Service.", color=MUTED, size=9.5)
    doc.add_page_break()

    # 1
    add_heading(doc, "1. Gambaran Sistem", 1)
    add_text(doc, "Platform UAY terdiri dari tiga aplikasi terpisah yang saling berhubungan melalui kontrak API. E-Learning menjadi tempat pengguna menjalankan proses pembelajaran, sedangkan SSO dan File Service menjadi service pendukung dengan ownership masing-masing.")
    add_heading(doc, "1.1 Keputusan arsitektur", 2)
    add_bullets(doc, [
        "SSO memiliki identity, account status, session, dan global role.",
        "E-Learning memiliki course, Course Class, Section/Pertemuan, content, enrollment, assessment, grade, notification, dan audit lokal.",
        "File Service memiliki binary object, metadata file, ACL, public/private access, trash, restore, dan audit file.",
        "Tidak ada shared database dan tidak ada shared filesystem antar-service.",
        "E-Learning menyimpan external subject dari SSO dan fileObjectId dari File Service, bukan password atau binary file.",
    ])
    add_diagram(doc, "01-system-context", "Gambar 1. Boundary dan ownership tiga aplikasi.")
    add_heading(doc, "1.2 Analisis reuse OMNI", 2)
    add_text(doc, "OMNI berhasil menjadi prototype yang dapat dibuild dan memiliki alur course, material, quiz, assignment, progress, notification, dan report. Namun, hasil inspeksi menunjukkan bahwa beberapa keputusan fundamentalnya bertentangan dengan requirement UAY dan akan mahal untuk diperbaiki setelah data production terbentuk.")
    add_table(doc, ["Area", "Kondisi OMNI", "Keputusan UAY"], [
        ["Tooling dan UI", "TypeScript, React/Vite, Tailwind, Express, Prisma, Zod, pola layout sudah tersedia.", "Reuse sebagai fondasi teknis dan UX."],
        ["Domain", "Course langsung berisi Module; Course Class dan Section tidak dimodelkan.", "Buat ulang schema domain berbasis Course -> Class -> Section -> LearningItem."],
        ["Auth", "NIM/password lokal, bcrypt, JWT internal; SSO hanya bridge terhadap bentuk token lokal.", "Buat SSO adapter; tidak ada password lokal."],
        ["File", "multer, UPLOAD_DIR, sendFile/res.download, volume lokal.", "Buat File Service adapter; simpan fileObjectId saja."],
        ["Rich text", "Material memiliki type/sourceUrl; deskripsi berupa string/textarea.", "Buat block document JSON dengan revision dan sanitization."],
        ["Audit", "AuditLog berisi action/entity/entityId/metadata; sebagian ditulis void/asynchronous.", "Buat append-only AuditEvent + AuditChange dalam transaksi yang sama."],
        ["Submission", "Unique assignmentId + userId dan upsert; resubmission menimpa record.", "Buat Submission + immutable SubmissionVersion."],
        ["Database", "SQLite schema dengan proses deployment yang mengganti provider ke PostgreSQL.", "PostgreSQL-first dengan migration yang konsisten."],
    ], [1700, 3900, 3420], small=True)
    add_callout(doc, "Rekomendasi", "Jangan melakukan rewrite seluruh pengetahuan dan UI OMNI. Yang perlu di-clean-start adalah bagian yang sulit dibalik: ownership data, identity boundary, file boundary, rich-text schema, submission history, dan audit model.", LIGHT_GOLD, GOLD)

    # 2
    add_heading(doc, "2. Arsitektur Sistem", 1)
    add_text(doc, "Arsitektur memakai service boundary yang jelas dan database terpisah. FE E-Learning berbicara ke BE E-Learning; BE E-Learning berkomunikasi server-to-server dengan SSO dan File Service. Browser tidak pernah mengakses database atau private file secara langsung tanpa authorization dari service terkait.")
    add_diagram(doc, "02-sso-sequence", "Gambar 2. Alur SSO yang direkomendasikan.")
    add_heading(doc, "2.1 SSO integration", 2)
    add_bullets(doc, [
        "Default: OIDC Authorization Code + PKCE untuk browser; API memvalidasi issuer, audience, subject, expiry, dan status account.",
        "Subject SSO yang immutable menjadi identity reference. NIM/NIDN digunakan sebagai identifier resmi untuk tampilan dan pencarian, bukan primary key histori.",
        "Role global dari SSO tidak menggantikan authorization E-Learning. Hak pengajar/admin tetap ditentukan oleh assignment dan scope class.",
        "Jika tim SSO memilih JWT internal atau one-time code, perubahan hanya berada pada adapter SSO, bukan pada model domain E-Learning.",
    ])
    add_heading(doc, "2.2 File Service integration", 2)
    add_diagram(doc, "03-file-sequence", "Gambar 3. Upload dan download file melalui File Service.")
    add_bullets(doc, [
        "File Service adalah pemilik binary, metadata file, malware/virus scan, visibility, ACL, trash, restore, dan retention.",
        "E-Learning menyimpan FileRef: fileObjectId, owner context, purpose, dan hubungan ke item pembelajaran.",
        "Upload memakai upload session/signed URL. Download memakai signed URL/token berumur pendek setelah policy E-Learning dan File Service memvalidasi ulang konteks.",
        "Submission, question attachment, feedback, dan dokumen mahasiswa selalu private.",
    ])
    add_heading(doc, "2.3 Cross-service reliability", 2)
    add_bullets(doc, [
        "Setiap request lintas service membawa requestId dan correlationId.",
        "Write command memakai Idempotency-Key untuk mencegah duplikasi upload reference, submit, publish, dan enrollment.",
        "Tidak menggunakan distributed transaction. E-Learning mencatat intent/result remote call dan masing-masing service menyimpan audit authoritative-nya sendiri.",
        "Retry untuk remote operation harus aman karena command idempotent; kegagalan remote tidak boleh meninggalkan FileRef seolah-olah file sudah siap.",
    ])

    # 3
    add_heading(doc, "3. Pembagian Aplikasi dan Fitur", 1)
    add_text(doc, "Pemisahan berikut menjaga agar service tidak saling mengambil alih ownership. E-Learning tetap dapat dikembangkan dinamis untuk pembelajaran biasa, praktikum, dan aktivitas sejenis melalui model LearningItem.")
    add_table(doc, ["Aplikasi", "Memiliki", "Tidak memiliki"], [
        ["SSO / Identity", "Account, login, logout, session, global role, status akun, recovery, audit identity.", "Course, enrollment, rich content, grade, submission."],
        ["File Service", "File object, metadata, ACL, public/private, validation, scan, trash, restore, file audit.", "Makna akademik file, grade, quiz, atau hak class."],
        ["E-Learning", "Course, Course Class, section, learning item, roster, activities, gradebook, notification, audit domain.", "Password, binary storage, dan authoritative account management."],
    ], [1900, 3700, 3420])
    add_heading(doc, "3.1 Fitur E-Learning P0", 2)
    add_bullets(doc, [
        "Dashboard sesuai role dan class yang dapat diakses.",
        "Course dan Course Class dengan instructor, enrollment, status, term, dan scope kewenangan.",
        "Section/Pertemuan dengan urutan LearningItem gabungan Resource, Quiz, dan Assignment.",
        "Resource rich text dengan block teks, gambar, attachment, link, YouTube, Zoom, dan Google Meet.",
        "Quiz/question bank, attempt, answer, timer, auto/manual grading, dan result release.",
        "Assignment, submission, resubmission version, late status, feedback, dan grade.",
        "Gradebook draft/published, announcement, in-app notification, progress, dan laporan minimum.",
        "Audit object-level untuk semua perubahan dan aktivitas penting.",
    ])
    add_heading(doc, "3.2 Fitur P1 dan P2", 2)
    add_table(doc, ["Prioritas", "Isi"], [
        ["P1", "Course duplication; enrollment key/capacity/period; prerequisite; progress summary lanjutan; audit filter/export; grade formula/export; scheduled announcement; short answer; rubric; temporary file access; file versioning."],
        ["P2", "Forum; group assignment; advanced question types; advanced analytics; email/kanal lain; proctoring; native mobile; Portal Akademik/KRS; long-video hosting."],
    ], [1300, 7720])

    # 4
    add_heading(doc, "4. Diagram Modul E-Learning", 1)
    add_diagram(doc, "05-module-hierarchy", "Gambar 4. Struktur modul E-Learning berbasis ordered LearningItem.")
    add_text(doc, "Course adalah mata kuliah induk. Course Class adalah pelaksanaan course pada term/rombongan tertentu. Section mengelompokkan pembelajaran berdasarkan minggu atau topik. LearningItem menyatukan urutan tampilan, tetapi Resource, Quiz, dan Assignment tetap menjadi tipe domain yang terpisah.")
    add_heading(doc, "4.1 Rich content", 2)
    add_bullets(doc, [
        "Resource memiliki revision document yang disimpan sebagai JSON terstruktur dengan schemaVersion.",
        "Block P0: paragraph, heading, bullet/ordered list, quote, code, image, attachment, external link, YouTube, Zoom/Meet.",
        "Image dan attachment hanya menyimpan fileObjectId dari File Service.",
        "Renderer menggunakan allowlist node/attribute; raw HTML dan script tidak dipercaya.",
        "Setiap save membuat revision immutable sehingga perubahan materi dapat dibandingkan dan dipulihkan.",
    ])
    add_heading(doc, "4.2 Availability dan lifecycle", 2)
    add_bullets(doc, [
        "Course: Draft -> Published -> Archived.",
        "LearningItem: Draft/Hidden -> Published/Open -> Archived/Closed.",
        "Mahasiswa hanya melihat item jika identity aktif, terdaftar pada class, item tersedia, dan policy mengizinkan.",
        "Course Archived tetap dapat dibaca sesuai kebijakan, tetapi tidak menerima aktivitas baru.",
    ])

    # 5
    add_heading(doc, "5. Rancangan Data Umum", 1)
    add_diagram(doc, "06-erd", "Gambar 5. ERD logical view E-Learning UAY.")
    add_heading(doc, "5.1 Entitas dan hubungan utama", 2)
    add_table(doc, ["Entitas", "Tanggung jawab", "Relasi kunci"], [
        ["IdentityRef", "Reference minimum ke subject SSO; tanpa password.", "Enrollment, TeachingAssignment, Attempt, Submission, Notification, AuditEvent."],
        ["Course / CourseClass", "Mata kuliah induk dan instance pelaksanaan.", "Course memiliki banyak CourseClass."],
        ["Section", "Pertemuan/topik/minggu pada satu class.", "CourseClass memiliki banyak Section."],
        ["LearningItem", "Base item untuk urutan gabungan dan availability.", "Section memiliki Resource, Quiz, atau Assignment."],
        ["ResourceRevision / ContentBlock", "Rich-text document version dan blok konten.", "Resource memiliki banyak revision; revision memiliki banyak block."],
        ["Quiz / Question / Attempt / Answer", "Bank soal, pengerjaan, jawaban, dan penilaian.", "Quiz memiliki question dan attempt."],
        ["Assignment / Submission / SubmissionVersion", "Tugas dan histori submission immutable.", "Assignment memiliki submission; submission memiliki version."],
        ["GradeRecord", "Nilai current dengan status draft/published.", "Menghubungkan enrollment dan learning item."],
        ["FileRef", "Reference object file dari File Service.", "Dapat direferensikan resource/question/submission/feedback."],
        ["AuditEvent / AuditChange", "Ledger append-only untuk audit dan field diff.", "AuditEvent memiliki banyak perubahan field."],
    ], [1900, 3600, 3520], small=True)
    add_heading(doc, "5.2 Audit object-level", 2)
    add_diagram(doc, "04-audit-flow", "Gambar 6. Audit disimpan di transaction boundary yang sama dengan perubahan object.")
    add_text(doc, "Setiap command yang mengubah state membaca before state, memvalidasi policy, mengubah domain object, menghitung field-level diff, dan menulis AuditEvent serta AuditChange dalam satu transaksi PostgreSQL. Untuk create, beforeState bernilai null; untuk delete, afterState bernilai null.")
    add_code(doc, '''{
  "action": "UPDATE",
  "entity": "GradeRecord",
  "entityId": "grade_123",
  "context": {"courseClassId": "class_2026_if_a"},
  "beforeState": {"score": 70, "status": "PUBLISHED"},
  "afterState": {"score": 85, "status": "DRAFT"},
  "changes": [{"path": "score", "before": 70, "after": 85}],
  "actor": {"subject": "sso_abc", "role": "DOSEN"},
  "requestId": "req_123",
  "correlationId": "corr_123",
  "result": "SUCCESS",
  "occurredAt": "server timestamp"
}''')
    add_heading(doc, "5.3 Data protection rules", 2)
    add_bullets(doc, [
        "AuditEvent dan AuditChange tidak memiliki endpoint update/delete untuk pengguna biasa.",
        "Password, access token, refresh token, signed URL, dan secret tidak boleh masuk ke state audit.",
        "Grade, answer key, submission, feedback, dan private FileRef mengikuti authorization context.",
        "High-frequency progress heartbeat disimpan sebagai snapshot/checkpoint; audit semantic action tetap dicatat. Keputusan literal untuk setiap heartbeat masih menunggu PO.",
    ])

    # 6
    add_heading(doc, "6. Tech Stack", 1)
    add_text(doc, "Tim dapat mempertahankan stack OMNI yang sudah dipahami. Perubahan utama berada pada boundary dan model data, bukan pada penggantian framework tanpa kebutuhan.")
    add_table(doc, ["Lapisan", "Rekomendasi", "Alasan"], [
        ["Frontend", "React + Vite + TypeScript + Tailwind; Tiptap/ProseMirror untuk rich text.", "Reuse kompetensi dan UI OMNI; editor memiliki JSON schema dan extension yang sesuai block content."],
        ["Backend", "Express + TypeScript + Zod; service layer tipis untuk policy dan transaction command.", "Migrasi pengetahuan paling kecil; cukup untuk skala awal dan integrasi API."],
        ["Database", "PostgreSQL + Prisma migration PostgreSQL-first.", "Relasi, transaction, JSONB, index, dan concurrency sesuai kebutuhan audit/assessment."],
        ["Auth", "OIDC client/validator atau adapter sesuai kontrak SSO; tanpa bcrypt/password lokal.", "Identity ownership berada di SSO."],
        ["File", "HTTP client adapter ke File Service; signed URL/session.", "E-Learning tidak memiliki binary atau storage lifecycle."],
        ["Validation", "Zod DTO versi kontrak.", "Boundary runtime jelas untuk FE, BE, SSO, dan File Service."],
        ["Testing", "Node test/Vitest untuk unit, Supertest atau fetch untuk API, Playwright untuk alur FE bila tersedia.", "Fokus pada contract, authorization, audit transaction, dan end-to-end P0."],
        ["Observability", "Structured log dengan requestId/correlationId; metrics DB/API dan error tracking.", "Membantu troubleshooting lintas service tanpa menulis secret."],
    ], [1600, 3900, 3520], small=True)
    add_callout(doc, "Yang sengaja tidak dibawa", "SQLite compatibility, local file upload, shared secret JWT sebagai default, custom audit helper asynchronous, dan abstraksi generic sebelum ada kebutuhan nyata.", LIGHT_GOLD, GOLD)

    # 7
    add_heading(doc, "7. Server dan Deployment", 1)
    add_diagram(doc, "07-deployment", "Gambar 7. Deployment topology independen.")
    add_bullets(doc, [
        "FE dan API E-Learning dideploy sebagai unit terpisah, tetapi dapat berada pada provider/VPS yang sama pada pilot.",
        "PostgreSQL menggunakan managed database atau instance terpisah dengan backup terjadwal dan encryption at rest.",
        "File binary tidak berada pada volume E-Learning; File Service menentukan object storage dan lifecycle.",
        "Domain final, hostname SSO, dan hostname File Service dicatat sebagai environment configuration setelah disepakati.",
        "Environment minimum: local, staging, production. Staging memakai client SSO dan bucket File Service non-production.",
    ])
    add_heading(doc, "7.1 Security dan backup", 2)
    add_bullets(doc, [
        "TLS untuk seluruh traffic; CORS hanya untuk domain yang disetujui.",
        "Secret hanya berada di server environment/secrets manager; tidak masuk repository, FE bundle, log, atau audit.",
        "Database backup dan restore diuji, tetapi tidak memindahkan ownership File Service.",
        "Audit retention dan immutable storage ditetapkan UAY sesuai kebutuhan sengketa akademik dan kebijakan institusi.",
        "Health check mencakup API, database, SSO dependency, dan File Service dependency tanpa membocorkan secret.",
    ])
    add_heading(doc, "7.2 State transition", 2)
    add_diagram(doc, "08-states", "Gambar 8. State transition utama dan titik audit setiap command.")

    # 8
    add_heading(doc, "8. Rencana Pengembangan", 1)
    add_text(doc, "Urutan kerja berikut memprioritaskan bagian yang paling sulit dibalik. Estimasi kalender final menunggu keputusan kontrak SSO/File Service dan kapasitas tim.")
    add_table(doc, ["Tahap", "Fokus", "Owner awal", "Output"], [
        ["1. Contract dan skeleton", "Folder baru, monorepo minimal, ADR, SSO/File contract, PostgreSQL schema baseline.", "E-Learning lead + SSO/File Service lead", "Repository siap integration test; pertanyaan kontrak memiliki owner."],
        ["2. Integration kernel", "SSO adapter, IdentityRef, FileRef/File adapter, request correlation, authorization policy, audit transaction kernel.", "E-Learning BE", "Login dan file mock flow; audit before/after tervalidasi."],
        ["3. Core learning", "Course, CourseClass, instructor, enrollment, Section, ordered LearningItem, availability.", "E-Learning BE/FE", "Admin/pengajar dapat menyiapkan satu class."],
        ["4. Rich resource", "Editor, revision, block rendering, File Service image/attachment.", "E-Learning FE + File Service", "Resource teks/gambar/file/link siap dipakai."],
        ["5. Activity dan assessment", "Quiz, attempt, assignment, submission version, gradebook, publish, notification.", "E-Learning BE/FE", "Alur belajar dan penilaian end-to-end."],
        ["6. Pilot hardening", "Contract/E2E/security/accessibility/performance tests, backup, runbook, UAT.", "Seluruh tim", "Production pilot dengan acceptance P0."],
    ], [1500, 3900, 1800, 1820], small=True)
    add_heading(doc, "8.1 Rekomendasi vertical slice satu minggu", 2)
    add_numbered(doc, [
        "SSO login satu role mahasiswa dan satu role pengajar melalui staging contract.",
        "Satu Course Class dengan satu Section dan satu Resource rich text yang memiliki file reference.",
        "Satu Quiz dan satu Assignment dengan submission version pertama.",
        "Satu alur grade draft -> publish -> mahasiswa melihat nilai sendiri.",
        "Audit before/after dan correlation ID untuk seluruh command di atas.",
        "Test access isolation dan file private access menggunakan mock SSO/File Service.",
    ])
    add_heading(doc, "8.2 Scope P0/P1/P2", 2)
    add_table(doc, ["Scope", "Keputusan implementasi"], [
        ["P0", "Wajib selesai untuk acceptance pilot: SSO, File Service integration, course/class/enrollment, sections, rich resource, quiz, assignment versioning, gradebook publish, notification dasar, audit, security, accessibility, backup strategy, dan integration test."],
        ["P1", "Masuk setelah P0 stabil bila kapasitas memungkinkan: duplication, enrollment key, prerequisite, advanced progress, audit export, grade formula/export, scheduled notification, short answer, rubric, file versioning."],
        ["P2", "Tidak dibangun sekarang: forum, group assignment, advanced question, analytics lanjutan, proctoring, native mobile, Portal Akademik, dan long-video hosting."],
    ], [1300, 7720])

    # 9
    add_heading(doc, "9. Pertanyaan dan Hal yang Memerlukan Persetujuan", 1)
    add_text(doc, "Pertanyaan ini sengaja menjadi bagian dari deliverable agar tim E-Learning, SSO, File Service, dan PO dapat menyepakati interface sebelum code production dimulai. Daftar lengkap juga tersedia pada `docs/contracts/SSO-File-Service-Questions.md`.")
    questions = [
        ["SSO-01", "OIDC, JWT internal, atau one-time code?", "OIDC Authorization Code + PKCE; fallback di adapter."],
        ["SSO-02", "Identifier canonical pengguna?", "Immutable `sub`; NIM/NIDN sebagai atribut resmi."],
        ["SSO-03", "Claim wajib dan status akun?", "iss, aud, sub, iat, exp, name, identifier, roles, status aktif."],
        ["SSO-04", "Logout global dan revocation?", "Access token pendek dan re-check pada request sensitif."],
        ["DATA-01", "Pemilik course, class, enrollment?", "E-Learning untuk pilot; sync akademik menjadi keputusan terpisah."],
        ["DATA-02", "Scope Admin Prodi?", "Policy E-Learning membatasi prodi/fakultas/class."],
        ["FILE-01", "Upload session dan completion?", "Signed upload session ke File Service."],
        ["FILE-02", "File object ID, scan status, dan ACL?", "fileObjectId + metadata/status wajib sebelum publish."],
        ["FILE-03", "Private file access?", "Signed URL/token pendek dengan context authorization."],
        ["FILE-04", "File direferensikan lalu dihapus?", "Trash/soft delete; file ID tidak berubah saat restore."],
        ["AUD-01", "Apakah heartbeat 5 detik menjadi audit?", "Checkpoint bermakna; heartbeat mentah bukan audit ledger."],
        ["AUD-02", "Retention dan viewer audit?", "Append-only; auditor/admin berwenang; retention ditetapkan UAY."],
        ["DATA-03", "Migrasi data OMNI?", "Tidak otomatis; hanya bila data ditetapkan resmi oleh PO."],
        ["OPS-01", "Makna target satu minggu?", "Vertical slice aman; seluruh P0 tetap acceptance bertahap."],
    ]
    add_table(doc, ["ID", "Pertanyaan", "Rekomendasi sementara"], questions, [1000, 4200, 3820], small=True)
    add_heading(doc, "9.1 Risk register", 2)
    add_table(doc, ["Risiko", "Dampak", "Mitigasi"], [
        ["SSO contract terlambat", "FE/BE tidak dapat menyelesaikan login production.", "Mock contract, adapter boundary, contract test, owner dan deadline keputusan."],
        ["File Service belum memiliki signed URL/ACL", "File private atau upload tidak aman.", "Tunda publish file pada staging; jangan fallback ke shared storage."],
        ["Audit ditulis asynchronous", "Sengketa tidak dapat membuktikan perubahan secara lengkap.", "AuditEvent + AuditChange satu transaction; test rollback."],
        ["P0 terlalu besar untuk satu minggu", "Kualitas/security turun atau scope tidak realistis.", "Vertical slice dengan acceptance eksplisit dan sign-off PO."],
        ["Migrasi OMNI dipaksakan", "Data tidak memiliki mapping class/section/audit yang valid.", "Freeze mapping; import hanya melalui keputusan dan validasi data."],
    ], [2400, 3100, 3520], small=True)
    add_heading(doc, "9.2 Acceptance checklist P0", 2)
    add_bullets(doc, [
        "Disabled account dan token expired ditolak; dashboard mengikuti role dan class scope.",
        "Mahasiswa tidak dapat melihat class, activity, submission, answer key, atau grade milik pengguna lain.",
        "Private file tidak dapat dibuka hanya dengan mengetahui file ID atau URL.",
        "Rich text dapat disimpan, dirender, disanitasi, memiliki revision, dan memiliki audit diff.",
        "Resubmission menghasilkan version baru tanpa menimpa versi sebelumnya.",
        "Grade draft tidak terlihat mahasiswa; publish menghasilkan visibility dan notification yang benar.",
        "Create/update/delete/publish/submit/grade/enroll/file action memiliki actor, context, before/after, diff, waktu, requestId, dan correlationId.",
        "Kegagalan transaction tidak meninggalkan perubahan domain tanpa audit atau audit tanpa perubahan domain.",
        "Integration test tersedia untuk mock SSO dan File Service; FE diuji responsive, keyboard, loading, error, empty, dan aksesibilitas dasar.",
    ])
    add_callout(doc, "Keputusan yang diminta PO", "Setujui clean-start core E-Learning, ownership E-Learning atas Course Class/enrollment untuk pilot, prinsip no shared database/storage, dan daftar kontrak terbuka sebelum implementasi production.", LIGHT_GREEN, GREEN)

    # Appendix
    doc.add_page_break()
    add_heading(doc, "Lampiran A. Struktur proyek baru", 1)
    add_code(doc, '''E - Learning UAY/
├── apps/
│   ├── web/                 # React/Vite learning experience
│   └── api/                 # Express domain API and policy
├── packages/
│   ├── db/                  # PostgreSQL-first Prisma schema
│   └── shared/              # Zod DTOs and versioned contracts
└── docs/
    ├── Technical Design - E-Learning UAY.docx
    ├── contracts/
    │   └── SSO-File-Service-Questions.md
    └── diagrams/
        ├── *.mmd             # Mermaid source
        └── *.png             # Embedded render for this document''')
    add_heading(doc, "Lampiran B. Sumber dan batas penggunaan", 1)
    add_bullets(doc, [
        "Requirement Digital UAY v1.1 menjadi sumber scope, prioritas, aturan bisnis, dan acceptance functional.",
        "Struktur Sederhana Dokumen Teknis UAY menjadi acuan urutan bab, diagram, ERD, tech stack, deployment, roadmap, dan decision register.",
        "OMNI hanya digunakan sebagai reference implementation; tidak ada perubahan atau pemindahan data otomatis dalam pekerjaan ini.",
    ])

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUTPUT))
    print(OUTPUT)


if __name__ == "__main__":
    build_document()
