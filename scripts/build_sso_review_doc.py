# -*- coding: utf-8 -*-
"""
Dokumen Tinjauan Teknis & Usulan Penyelarasan Integrasi SSO UAY — E-Learning UAY
Menghasilkan 3 format:
1. docs/integrations/sso/Review Kebutuhan Integrasi SSO UAY - E-Learning.md
2. docs/integrations/sso/Review Kebutuhan Integrasi SSO UAY - E-Learning.docx
3. docs/integrations/sso/Review Kebutuhan Integrasi SSO UAY - E-Learning.pdf
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

MD_PATH = DOCS / "Review Kebutuhan Integrasi SSO UAY - E-Learning.md"
DOCX_PATH = DOCS / "Review Kebutuhan Integrasi SSO UAY - E-Learning.docx"
PDF_PATH = DOCS / "Review Kebutuhan Integrasi SSO UAY - E-Learning.pdf"

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
RED = "9B2C2C"
LIGHT_RED = "FEF2F2"
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

def set_cell_margins(cell, top=100, start=140, bottom=100, end=140) -> None:
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

def set_run_font(run, name="Segoe UI", size=10, color=INK, bold=False, italic=False) -> None:
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.font.color.rgb = rgb(color)
    run.bold = bold
    run.italic = italic

def add_text(doc, text: str, bold_prefix: str | None = None, color=INK, size=10.0, italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
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
        p.paragraph_format.space_before = Pt(16)
        p.paragraph_format.space_after = Pt(6)
        r = p.add_run(text)
        set_run_font(r, size=13.0, color=NAVY, bold=True)
    elif level == 2:
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run(text)
        set_run_font(r, size=11.0, color=BLUE, bold=True)
    elif level == 3:
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        r = p.add_run(text)
        set_run_font(r, size=10.0, color=NAVY, bold=True)
    return p

def add_bullets(doc, items: list[str], numbered=False):
    for index, item in enumerate(items, start=1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.25)
        p.paragraph_format.first_line_indent = Inches(-0.18)
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.line_spacing = 1.15
        marker = f"{index}. " if numbered else "•  "
        r = p.add_run(marker)
        set_run_font(r, size=9.5, color=BLUE, bold=True)
        r = p.add_run(item)
        set_run_font(r, size=9.5, color=INK)

def add_callout(doc, label: str, body: str, fill=LIGHT_BLUE, label_color=BLUE):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9020])
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    set_cell_border(cell, fill, "0")
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(label.upper())
    set_run_font(r, size=8.5, color=label_color, bold=True)
    p = cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(body)
    set_run_font(r, size=9.5, color=INK)
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)
    return table

def add_code(doc, code_str: str):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9020])
    cell = table.cell(0, 0)
    set_cell_shading(cell, LIGHT_GRAY)
    set_cell_border(cell, LINE, "4")
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.05
    r = p.add_run(code_str)
    set_run_font(r, name="Consolas", size=8.5, color=INK)
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)
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
        set_run_font(r, size=8.5 if small else 9.0, color=WHITE, bold=True)
    for row_index, values in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(values):
            cell = cells[i]
            set_cell_shading(cell, LIGHT_GRAY if row_index % 2 else WHITE)
            set_cell_border(cell)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.1
            r = p.add_run(str(value))
            set_run_font(r, size=8.5 if small else 9.0, color=INK)
    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(3)
    return table

def generate_markdown() -> str:
    md_content = """# DOKUMEN TINJAUAN TEKNIS & USULAN PENYELARASAN ARSITEKTUR INTEGRASI AUTHENTIKASI & OTORISASI SSO UAY DENGAN E-LEARNING UAY

**Kajian Komparatif Bab 7 Dokumen Teknis SSO UAY terhadap Kebutuhan Operasional LMS UAY**  
*Versi Dokumen: 1.0 | Tanggal: 25 September 2026*  
*Penyusun: Tim Pengembang E-Learning UAY*  
*Ditujukan Kepada: Tim Pengembang SSO Universitas Al-Khairaat & Biro TI / PUSTIK UAY*

---

## 1. Ringkasan Eksekutif & Latar Belakang

Dokumen ini disusun sebagai tindak lanjut resmi atas penyerahan *Dokumen Teknis SSO UAY* oleh Tim Pengembang SSO Universitas Al-Khairaat (UAY) kepada Tim Pengembang E-Learning UAY, dengan rujukan khusus pada **Bab 7 (*Authentication & Session*)**.

Tim Pengembang E-Learning telah melakukan audit mendalam terhadap Bab 7 (sub-bab 7.1 hingga 7.15) dan menyimpulkan hal-hal pokok sebagai berikut:
1. **Fondasi Protokol yang Sangat Baik**: Implementasi OpenID Connect (OIDC) dan OAuth 2.0 menggunakan alur *Authorization Code Flow with PKCE (RFC 7636)* pada Keycloak telah memenuhi standar keamanan modern industri pendidikan tinggi.
2. **Pemisahan Peran Dua Lapis (Two-Tier Architecture)**: Bab 7.7 mendefinisikan pembagian arsitektur di mana **Lapis 1 (Keycloak)** menangani Autentikasi Pengguna, sedangkan **Lapis 2 (SSO Backend)** mengelola Otorisasi Terpusat berbasis tabel database `application_access` dan `roles`.
3. **Kesenjangan Kritis (Critical Gap)**: Sesuai spesifikasi klaim token Keycloak pada **Bab 7.5**, token JWT yang diterbitkan saat ini **hanya memuat data identitas dasar** (`sub`, `preferred_username`, `email`, `name`). Token tersebut **belum memuat**:
   - Nomor identitas akademik mahasiswa/dosen (`identifier_value` seperti NIM atau NIDN).
   - Hak akses dan peran spesifik aplikasi (`roles`).
   - Penegasan status keaktifan akun pengguna (`account_status: ACTIVE`).
4. **Implikasi Operasional E-Learning**: Tanpa atribut-atribut di atas, E-Learning UAY tidak dapat mengaitkan pengguna dengan mata kuliah, kurikulum, pengisian nilai, maupun menerapkan kontrol akses berbasis peran (RBAC).

Untuk mengatasi kesenjangan tersebut secara konstruktif dan kolaboratif, dokumen ini menyajikan **dua alternatif solusi arsitektur**:
- **Opsi 1 (Penyesuaian di sisi SSO — Token Enrichment via Keycloak Protocol Mappers)**: Tim SSO mengonfigurasi Protocol Mappers pada client `elearning-uay` di Keycloak agar atribut akademik, peran, dan status akun langsung disematkan ke dalam Access Token JWT. *Keunggulan*: latensi 0 ms (stateless), tanpa beban panggilan API tambahan ke SSO Backend, dan E-Learning siap berjalan tanpa modifikasi kode.
- **Opsi 2 (Penyesuaian di sisi E-Learning — Two-Tier Decoupled Architecture via SSO Backend API)**: E-Learning beradaptasi sepenuhnya dengan arsitektur Bab 7.7–7.9 dengan cara memvalidasi token Keycloak dasar, kemudian backend E-Learning menghubungi endpoint REST API SSO Backend (`GET /api/v1/auth/context`) untuk mengambil konteks otorisasi dan identitas akademik secara berkala (*with caching*).

Tim Pengembang E-Learning siap mengimplementasikan salah satu dari kedua opsi di atas berdasarkan keputusan dan kebijakan arsitektur Tim SSO serta PUSTIK UAY.

---

## 2. Matriks Evaluasi Butir per Butir Bab 7 Dokumen Teknis SSO UAY

Berikut adalah hasil telaah komparatif terhadap 15 sub-bab pada Bab 7 Dokumen Teknis SSO UAY:

| Sub-Bab | Butir Spesifikasi SSO UAY | Implementasi & Kebutuhan E-Learning | Status Kesesuaian | Tindak Lanjut Teknis |
|---|---|---|---|---|
| **7.1** | **Standar Protokol Autentikasi**: OIDC & OAuth 2.0, Authorization Code + PKCE (RFC 7636). | Backend E-Learning (`apps/api/src/auth.ts`) telah mengimplementasikan PKCE dengan `code_challenge_method=S256`. | **Sesuai Penuh (Full Match)** | Pertahankan konfigurasi client Keycloak (`elearning-uay`) bertipe Confidential/Public dengan PKCE wajib. |
| **7.2** | **Alur Autentikasi Pengguna**: Login terpusat via Keycloak Login Page. | Pengguna E-Learning diarahkan ke Keycloak untuk autentikasi kredensial; E-Learning menerima `authorization_code`. | **Sesuai Penuh (Full Match)** | Daftarkan redirect URI resmi E-Learning: `https://elearning.uay.ac.id/api/v1/auth/callback`. |
| **7.3** | **Single Sign-On Behavior**: Keycloak SSO Session Cookie (`KEYCLOAK_IDENTITY`). | Pengguna yang telah login di Portal UAY tidak perlu login ulang saat membuka LMS E-Learning. | **Sesuai Penuh (Full Match)** | Didukung secara *out-of-the-box* oleh Keycloak. |
| **7.4** | **Single Sign-Out & Manajemen Sesi**: RP-Initiated Logout via Keycloak `end_session_endpoint`. | Tombol logout di LMS memicu pembersihan sesi lokal dan me-redirect browser ke `end_session_endpoint` Keycloak. | **Sesuai Penuh (Full Match)** | E-Learning menyertakan parameter `id_token_hint` dan `post_logout_redirect_uri`. |
| **7.5** | **Struktur & Klaim Token Keycloak**: Token memuat `sub`, `preferred_username`, `email`, `name`, `iss`, `aud`, `iat`, `exp`. | **Kesenjangan Kritis**: Token tidak memiliki peran (`roles`), nomor identitas akademik (`identifier_value`), tipe user (`user_type`), dan status akun (`account_status`). | **Kesenjangan Kritis (Critical Gap)** | Memerlukan penyelesaian via **Opsi 1** (Protocol Mapper) atau **Opsi 2** (Query SSO Backend API). |
| **7.6** | **Validasi Token di Sisi Klien / Resource Server**: Verifikasi asimetris via JWKS URI (`/.well-known/openid-configuration`), algoritma RS256/ES256, caching key. | E-Learning memvalidasi signature token secara lokal menggunakan library `jose` dengan remote JWKS caching otomatis. | **Sesuai Penuh (Full Match)** | Tidak diperlukan perubahan pada logika kriptografi verifikasi token. |
| **7.7** | **Arsitektur Otorisasi Dua Lapis**: Lapis 1 = Keycloak (Autentikasi Identitas). Lapis 2 = SSO Backend (Otorisasi Akses Aplikasi). | E-Learning sebelumnya mengasumsikan *Self-Contained Token*. Namun E-Learning siap mengadopsi Lapis 2 jika API SSO Backend tersedia. | **Titik Temu Arsitektur** | Dijadikan landasan perancangan solusi **Opsi 2**. |
| **7.8** | **Skema Data Otorisasi di SSO Backend**: Tabel `application_access`, `roles`, `permissions`, `role_permissions`. | Struktur database SSO Backend sangat lengkap dan selaras dengan kebutuhan pemetaan hak akses E-Learning. | **Sesuai Struktur Data** | Kolom `roles.name` atau `role_code` menjadi sumber otoritas hak akses di LMS. |
| **7.9** | **Alur Evaluasi Akses Pengguna**: Klien menerima token -> klien memanggil SSO Backend API -> SSO Backend mengembalikan Authorization Context. | Alur query SQL telah dijelaskan di Bab 7.9, namun **kontrak REST API resmi** belum terdefinisi (URL, auth header, schema response). | **Perlu Spesifikasi Endpoint API** | Memerlukan penerbitan kontrak endpoint resmi dari Tim SSO (disajikan pada Bab 5 & 8). |
| **7.10** | **Refresh Token & Perpanjangan Sesi**: Token refresh ditukarkan ke Keycloak token endpoint tanpa interaksi login ulang. | Backend E-Learning mengelola rotasi token dan menyimpan refresh token di cookie `HttpOnly` terenkripsi. | **Sesuai Penuh (Full Match)** | Sesuai dengan spesifikasi RFC 6749. |
| **7.11** | **Manajemen Masa Berlaku Token**: Access token 15 menit, refresh token 8 jam, SSO session idle 30 menit. | Kode E-Learning memvalidasi umur token: `payload.exp - payload.iat <= 900` (15 menit). | **Sesuai Penuh (Full Match)** | Konfigurasi waktu kedaluwarsa sudah identik. |
| **7.12** | **Penanganan Token Kedaluwarsa & Rotasi**: Silent refresh dan deteksi refresh token reuse. | Middleware E-Learning mendeteksi token kedaluwarsa dan memicu refresh otomatis di latar belakang. | **Sesuai Penuh (Full Match)** | Mekanisme rotasi token berjalan transparan bagi pengguna. |
| **7.13** | **Penyimpanan Kredensial & Token di Klien**: Cookie `HttpOnly`, `Secure`, `SameSite=Lax`. | E-Learning menolak penyimpanan token di `localStorage` peramban demi mencegah risiko eksfiltrasi XSS. | **Sesuai Penuh (Full Match)** | Standar keamanan penyimpanan token telah terpenuhi. |
| **7.14** | **Pencegahan Replay Attack & CSRF**: Validasi parameter `state`, `nonce`, PKCE `code_verifier`, dan origin headers. | E-Learning memverifikasi integritas `state` yang disimpan dalam session cookie bertanda tangan sebelum menukar token. | **Sesuai Penuh (Full Match)** | Memitigasi serangan CSRF dan Replay secara tuntas. |
| **7.15** | **Penonaktifan Pengguna & Blacklist Sesi**: Penonaktifan akun di Keycloak/SSO harus segera mencabut akses pengguna. | E-Learning memiliki cache blacklist lokal (`cache.get("revoked:{sub}")`), namun membutuhkan mekanisme propagasi instan dari SSO. | **Perlu Penyelarasan Propagasi** | Diselaraskan melalui Webhook Revocation atau masa tunggu TTL Refresh Token (maks. 15 menit). |

---

## 3. Analisis Mendalam 5 Kesenjangan Kritis & Implikasi Teknis

### 3.1 Ketiadaan Identitas Akademik Mahasiswa & Dosen (`identifier_value` NIM / NIDN)
- **Kondisi Dokumen SSO**: Bab 7.5 menyatakan bahwa Keycloak hanya menyediakan klaim OIDC standar: `sub` (UUID Keycloak), `preferred_username`, `email`, dan `name`.
- **Kebutuhan E-Learning**: Di lingkungan akademik perguruan tinggi, `sub` (UUID) dan username tidak cukup untuk menghubungkan mahasiswa ke rombongan belajar (kelas kuliah), kurikulum prodi, presensi, pengisian nilai di SIMAK/SIAKAD, serta sinkronisasi KRS. E-Learning secara mutlak memerlukan **NIM (Nomor Induk Mahasiswa)** untuk mahasiswa dan **NIDN / NIP** untuk dosen.
- **Implikasi**: Jika atribut ini tidak disuplai saat login, E-Learning tidak dapat melakukan *Just-In-Time (JIT) provisioning*, sehingga mahasiswa yang berhasil login tidak akan menemukan mata kuliah yang diikutinya.

### 3.2 Ketiadaan Hak Akses & Peran Aplikasi (`roles`)
- **Kondisi Dokumen SSO**: Token Keycloak tidak memuat informasi peran spesifik aplikasi E-Learning. Bab 7.7–7.9 memindahkan tanggung jawab otorisasi ke database SSO Backend melalui tabel `application_access` dan `roles`.
- **Kebutuhan E-Learning**: E-Learning menerapkan Role-Based Access Control (RBAC) yang ketat. Sistem harus segera mengetahui apakah pengguna bertindak sebagai `STUDENT`, `INSTRUCTOR`, `DEPARTMENT_ADMIN`, atau `SUPER_ADMIN`.
- **Implikasi**: Berdasarkan `apps/api/src/auth.ts` dan `packages/shared/src/sso.ts`, ketiadaan klaim peran menyebabkan kegagalan otorisasi:
  ```typescript
  const role = claims.role ?? highestRole(claims.roles ?? []);
  if (!role) {
    ctx.addIssue({ message: "No E-Learning role granted for this account" });
  }
  ```
  Pengguna akan mendapatkan respons `403 Forbidden` meskipun berhasil login di Keycloak.

### 3.3 Ketiadaan Validasi Status Akun Pengguna (`account_status: ACTIVE`)
- **Kondisi Dokumen SSO**: Status keaktifan pengguna tersimpan di database SSO (`users.status` / `application_access.is_active`), namun tidak diekspos di dalam token JWT Keycloak.
- **Kebutuhan E-Learning**: Kode E-Learning mewajibkan `payload.account_status === "ACTIVE"`. Hal ini mencegah mahasiswa yang berstatus cuti, non-aktif, atau terkena sanksi akademik mengakses ujian dan materi pembelajaran internal.
- **Implikasi**: Token Keycloak saat ini ditolak oleh middleware E-Learning (`apps/api/src/auth.ts:110`) dengan pesan error `ACCOUNT_DISABLED` karena properti `account_status` bernilai `undefined`.

### 3.4 Penyelarasan Taksonomi Peran (Role Mapping)
- **Kondisi Dokumen SSO**: Contoh peran dalam dokumen SSO menggunakan label deskriptif berbahasa Indonesia seperti `"DOSEN"` dan `"MAHASISWA"`.
- **Kebutuhan E-Learning**: E-Learning menggunakan konvensi enum arsitektur bersih:
  `["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT"]`.
- **Implikasi**: Diperlukan aturan pemetaan (*mapping matrix*) resmi agar peran yang tersimpan di SSO Backend dapat diterjemahkan secara presisi ke dalam domain model E-Learning tanpa ambigu.

### 3.5 Spesifikasi & Kepastian Kontrak Endpoint Otorisasi SSO Backend
- **Kondisi Dokumen SSO**: Bab 7.9 menggambarkan alur evaluasi akses secara konseptual melalui ilustrasi diagram dan query SQL, namun belum mendokumentasikan spesifikasi REST API (URL endpoint, metode HTTP, skema header autentikasi, payload respon JSON, dan kode status error).
- **Kebutuhan E-Learning**: Jika arsitektur Two-Tier pada Bab 7.9 diterapkan (Opsi 2), E-Learning membutuhkan kontrak antarmuka API yang konkret dan berstatus *stable* untuk diintegrasikan pada backend LMS.

---

## 4. Opsi Usulan 1: Penyesuaian dari Sisi SSO (Token Enrichment via Keycloak Protocol Mappers)

### 4.1 Deskripsi Solusi & Arsitektur Alur Kerja
Pada opsi ini, Tim SSO mempertahankan Keycloak sebagai pusat penerbit token, namun menambahkan konfigurasi **Protocol Mappers** khusus untuk client `elearning-uay`. Dengan konfigurasi ini, Keycloak menyematkan data identitas akademik, peran aplikasi, dan status akun langsung ke dalam Access Token & ID Token JWT saat pengguna berhasil login.

```
[Pengguna] ──(1. Login)──> [Keycloak UI]
                                │ (Autentikasi & Mapping Database SSO)
[Pengguna] <──(2. Token JWT)────┘ (Token berisi: NIM, roles, account_status)
    │
    └──(3. Request API + Bearer Token)──> [E-Learning Backend]
                                                │
                                                └──(4. Verifikasi Lokal via JWKS)──> [Akses Diberikan (0 ms latency)]
```

### 4.2 Langkah-Langkah Konfigurasi Teknis di Admin Console Keycloak
Tim SSO hanya perlu melakukan konfigurasi berikut pada Realm UAY di Keycloak Admin Console (tanpa perubahan kode program):
1. **Buka Menu Clients**: Pilih client `elearning-uay` -> Tab **Client scopes** atau **Mappers**.
2. **Mapper 1 — User Type**:
   - Name: `user_type_mapper`
   - Mapper Type: `User Attribute`
   - User Attribute: `user_type` (atau atribut user SSO terkait)
   - Token Claim Name: `user_type`
   - Claim JSON Type: `String`
   - Add to ID token: `ON`, Add to access token: `ON`
3. **Mapper 2 — Status Akun**:
   - Name: `account_status_mapper`
   - Mapper Type: `User Attribute`
   - User Attribute: `status`
   - Token Claim Name: `account_status`
   - Claim JSON Type: `String` (Nilai: `"ACTIVE"`)
   - Add to ID token: `ON`, Add to access token: `ON`
4. **Mapper 3 — Identitas Akademik (NIM / NIDN)**:
   - Name: `identifier_value_mapper` & `identifier_type_mapper`
   - Mapper Type: `User Attribute`
   - Token Claim Name: `identifier_value` & `identifier_type`
   - Claim JSON Type: `String` (Contoh: `"202401001"` dan `"NIM"`)
   - Add to ID token: `ON`, Add to access token: `ON`
5. **Mapper 4 — Peran Aplikasi E-Learning**:
   - Name: `elearning_roles_mapper`
   - Mapper Type: `User Client Role` atau `User Attribute`
   - Token Claim Name: `roles`
   - Claim JSON Type: `JSON` (Array of Strings: `["STUDENT"]` atau `["INSTRUCTOR"]`)
   - Add to ID token: `ON`, Add to access token: `ON`, Multivalued: `ON`

### 4.3 Contoh Spesifikasi Payload Token JWT yang Diharapkan
```json
{
  "exp": 1741500000,
  "iat": 1741499100,
  "jti": "b3c8f2a1-5d4e-4f8a-9c2b-1a2b3c4d5e6f",
  "iss": "https://sso.uay.ac.id/realms/uay",
  "aud": "elearning-uay",
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "typ": "Bearer",
  "azp": "elearning-uay",
  "preferred_username": "202401001",
  "email": "ahmad.dahlan@uay.ac.id",
  "name": "Ahmad Dahlan",
  "user_type": "STUDENT",
  "account_status": "ACTIVE",
  "identifier_type": "NIM",
  "identifier_value": "202401001",
  "roles": ["STUDENT"],
  "department_scopes": ["INFORMATIKA"]
}
```

### 4.4 Keunggulan & Batasan Opsi 1
- **Keunggulan Utama**:
  - **Latensi Nol (0 ms overhead)**: E-Learning memvalidasi token secara *in-memory* menggunakan public key JWKS yang ter-cache. Tidak ada panggilan jaringan tambahan ke SSO Backend saat melayani request perkuliahan.
  - **Stateless & Scalable**: Server SSO Backend tidak akan terbebani oleh query database berulang ketika ribuan mahasiswa mengakses ujian online secara bersamaan.
  - **Zero Code Modification pada E-Learning**: Kode `apps/api/src/auth.ts` sudah 100% kompatibel dan langsung siap beroperasi.
- **Batasan**: Memerlukan akses dan waktu konfigurasi mapper di Keycloak Admin Console oleh Tim SSO (estimasi waktu pengerjaan: 30–60 menit).

---

## 5. Opsi Usulan 2: Penyesuaian dari Sisi E-Learning (Two-Tier Decoupled Architecture)

### 5.1 Deskripsi Solusi & Arsitektur Alur Kerja
Pada opsi ini, Tim SSO **tidak perlu mengubah konfigurasi Keycloak**. E-Learning UAY sepenuhnya beradaptasi dengan konsep arsitektur Bab 7.7–7.9:
1. Pengguna login ke Keycloak dan E-Learning menerima Access Token dasar (klaim Bab 7.5).
2. Backend E-Learning memvalidasi signature token secara kriptografis via JWKS Keycloak.
3. Backend E-Learning menghubungi REST API SSO Backend (`GET /api/v1/auth/context`) dengan menyertakan token Keycloak sebagai Bearer Token.
4. SSO Backend mengevaluasi hak akses ke tabel database `application_access` dan mengembalikan Konteks Otorisasi lengkap (NIM/NIDN, peran, dan status akses).
5. E-Learning menyinkronkan data pengguna ke database lokal dan menyimpan konteks otorisasi dalam in-memory cache / Redis dengan masa berlaku (TTL) 15 menit.

```
[Pengguna] ──(1. Login)──> [Keycloak UI]
[Pengguna] <──(2. Basic Token)─┘ (Klaim standar Bab 7.5)
    │
    └──(3. Request Login LMS)──> [E-Learning Backend]
                                      │
                                      ├──(4. Validasi JWKS)──> [Keycloak JWKS]
                                      │
                                      └──(5. GET /api/v1/auth/context)──> [SSO Backend API]
                                                                                │ (Query DB Bab 7.8)
                                      [E-Learning Backend] <──(6. Auth Context)─┘
                                              │ (Cache 15m di Redis/Memory)
                                              └──> [Sesi E-Learning Terbentuk]
```

### 5.2 Spesifikasi Kontrak API SSO Backend yang Dibutuhkan oleh E-Learning
Agar Opsi 2 dapat diimplementasikan, Tim SSO perlu menyediakan endpoint REST API dengan spesifikasi sebagai berikut:

- **Endpoint Path**: `GET /api/v1/auth/context` (atau `GET /api/v1/users/me/access`)
- **HTTP Method**: `GET`
- **Request Headers**:
  ```http
  Authorization: Bearer <keycloak_access_token>
  X-Client-ID: elearning-uay
  Accept: application/json
  ```
- **Response Format (200 OK)**:
  ```json
  {
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "202401001",
    "name": "Ahmad Dahlan",
    "email": "ahmad.dahlan@uay.ac.id",
    "user_type": "STUDENT",
    "status": "ACTIVE",
    "primary_identifier": {
      "type": "NIM",
      "value": "202401001"
    },
    "application_access": {
      "client_id": "elearning-uay",
      "roles": ["STUDENT"],
      "permissions": ["courses.view", "assignments.submit", "quizzes.take"],
      "department_scopes": ["INFORMATIKA"],
      "is_active": true,
      "expires_at": null
    }
  }
  ```
- **Response Status Error**:
  - `401 Unauthorized`: Token Keycloak tidak valid, kadaluwarsa, atau signature tidak cocok.
  - `403 Forbidden`: Pengguna tidak memiliki hak akses ke aplikasi `elearning-uay` (`application_access.is_active = false` atau akun dinonaktifkan).
  - `404 Not Found`: Data pengguna tidak ditemukan di direktori database SSO.

### 5.3 Strategi Caching & Resiliensi di Sisi E-Learning
Untuk menjaga keandalan sistem E-Learning saat menerapkan Opsi 2:
1. **Local Context Caching**: E-Learning akan menyimpan respon otorisasi SSO Backend dalam cache lokal (Redis / In-Memory) dengan TTL 15 menit (disesuaikan dengan masa aktif token Keycloak). Panggilan ke SSO Backend API hanya dilakukan saat login awal atau saat cache miss.
2. **Circuit Breaker Pattern**: Jika server SSO Backend mengalami perlambatan (*latency spike*) atau gangguan sementara (*temporary downtime*), E-Learning akan menggunakan data profil terakhir dari database lokal untuk sesi pengguna yang masih valid.

### 5.4 Keunggulan & Batasan Opsi 2
- **Keunggulan**: Mematuhi arsitektur Lapis 2 murni rancangan Tim SSO; Tim SSO tidak perlu menyentuh konfigurasi protocol mapper di Keycloak.
- **Batasan**:
  - Menambah 1 hop jaringan (*network hop*) saat login, dengan tambahan latensi 30–120 ms.
  - Menimbulkan dependensi runtime terhadap ketersediaan server SSO Backend API.
  - Memerlukan penyesuaian kode pada `apps/api/src/auth.ts` di sisi E-Learning.

---

## 6. Matriks Komparasi Opsi 1 vs Opsi 2

| Kriteria Evaluasi | Opsi 1: Token Enrichment (Keycloak Mapper) | Opsi 2: Two-Tier Adapter (SSO Backend API) | Analisis Komparatif & Dampak |
|---|---|---|---|
| **Latensi & Kecepatan Response** | **Optimal (0 ms overhead)**. Validasi token dilakukan 100% lokal via public key JWKS cache. | **Menengah (+30 s.d. 120 ms)** pada saat autentikasi awal atau saat cache otorisasi kadaluwarsa. | Opsi 1 memberikan *user experience* terbaik dan sangat tangguh menghadapi lonjakan akses (*traffic surge*). |
| **Beban Server SSO** | **Sangat Ringan**. Server SSO hanya memproses pertukaran authorization code; tidak melayani request otorisasi runtime. | **Tinggi**. Server SSO Backend harus memproses panggilan API dan mengeksekusi query database untuk setiap sesi. | Opsi 1 melindungi database SSO dari beban query repetitif ribuan mahasiswa. |
| **Kompleksitas Implementasi di SSO** | **Sangat Rendah (Konfigurasi Saja)**. Tim SSO hanya menambahkan Protocol Mapper di UI Keycloak (estimasi 30 menit). | **Sedang s.d. Tinggi**. Tim SSO harus merilis, mendokumentasikan, dan memelihara endpoint API otorisasi yang aman. | Opsi 1 menghemat sumber daya dan waktu pengembangan Tim SSO. |
| **Kompleksitas Implementasi di E-Learning** | **Nol (Zero Code Modification)**. Kode E-Learning saat ini telah siap memproses token yang diperkaya. | **Sedang**. E-Learning harus membuat client HTTP ke SSO Backend, modul caching, dan mekanisme fallback resiliensi. | Tim E-Learning siap mengembangkan adapter Opsi 2 dalam 3–4 hari kerja. |
| **Kepatuhan Standar OIDC** | **Tinggi (Standar Industri)**. Token enrichment menggunakan custom mapper adalah pola standar OpenID Connect & Keycloak. | **Pola Hybrid / Proprietary**. Memisahkan token standar dengan API konteks khusus organisasi. | Opsi 1 lebih modular dan kompatibel dengan arsitektur microservices standar. |
| **Kecepatan Propagasi Perubahan Role** | **Menunggu Siklus Token (Maks. 15 menit)** atau saat user login ulang. | **Mendekati Instan s.d. 15 menit** (bergantung pada durasi caching di E-Learning). | Relatif seimbang karena Opsi 2 pun wajib menerapkan caching untuk efisiensi. |
| **Ketahanan Sistem (System Resilience)** | **Tinggi**. E-Learning tetap berfungsi normal memvalidasi token selama JWKS ter-cache, meskipun SSO Backend offline. | **Rentan terhadap Single Point of Failure**. Jika SSO Backend API tidak dapat dihubungi, proses login dapat terhambat. | Opsi 1 memiliki *fault isolation* yang jauh lebih baik. |
| **Estimasi Waktu Menuju Go-Live** | **1–2 Hari Kerja** (konfigurasi mapper + testing integrasi end-to-end). | **1–2 Minggu Kerja** (finalisasi endpoint API SSO Backend + refactoring auth client di LMS + pengujian). | Opsi 1 menawarkan jalur rilis yang jauh lebih cepat. |

---

## 7. Penyelarasan Taksonomi Peran (Role Mapping Matrix)

Untuk memastikan konsistensi hak akses antara skema database SSO (`roles.name` / `role_code`) dan skema E-Learning (`GlobalRole`), disepakati aturan konversi berikut:

| Peran pada SSO UAY (`roles.role_code` / `role_name`) | Peran pada E-Learning (`GlobalRole` Enum) | Hak Akses & Kewenangan di E-Learning UAY |
|---|---|---|
| `MAHASISWA` / `STUDENT` | `STUDENT` | Mengakses materi kuliah, mengumpulkan tugas, mengikuti kuis/ujian, melihat nilai pribadi, dan berpartisipasi dalam diskusi kelas. |
| `DOSEN` / `LECTURER` / `PENGAJAR` | `INSTRUCTOR` | Mengelola modul pembelajaran, mengunggah materi, membuat tugas dan soal ujian, memberikan penilaian, serta mengelola interaksi kelas. |
| `ADMIN_PRODI` / `STAFF_AKADEMIK` | `DEPARTMENT_ADMIN` | Memantau seluruh mata kuliah di program studinya, melihat analitik akademik tingkat prodi, dan mengelola alokasi dosen pengampu. |
| `SUPER_ADMIN` / `ADMIN_PUSAT` / `ADMIN_IT` | `SUPER_ADMIN` | Kendali sistem menyeluruh, konfigurasi integrasi sistem, manajemen audit log, dan pemeliharaan platform lintas fakultas. |

**Aturan Penanganan Multi-Peran (*Role Precedence*)**:  
Jika seorang pengguna memiliki lebih dari satu peran di SSO (misalnya seorang Dosen yang juga menjabat sebagai Admin Prodi, atau Staf yang menempuh studi lanjut), E-Learning menetapkan peran efektif berdasarkan hierarki tertinggi:  
$$\text{SUPER\_ADMIN} > \text{DEPARTMENT\_ADMIN} > \text{INSTRUCTOR} > \text{STUDENT}$$

---

## 8. Protokol Keamanan, Penonaktifan Akun (Bab 7.15), & Siklus Hidup Sesi

### 8.1 Sinkronisasi Penonaktifan Akun (Bab 7.15)
Bab 7.15 Dokumen Teknis SSO mengatur tentang pemblokiran akses pengguna yang akunnya dinonaktifkan. Tim E-Learning mendukung dua mekanisme sinkronisasi:
1. **Mekanisme Pasif (Standar OIDC)**: Karena masa aktif Access Token adalah 15 menit, penonaktifan akun di Keycloak/SSO akan otomatis menghentikan akses pengguna paling lambat dalam 15 menit, saat E-Learning mencoba melakukan refresh token ke Keycloak dan ditolak.
2. **Mekanisme Aktif (Webhook Revocation — Rekomendasi Tambahan)**: Tim SSO dapat memanggil webhook internal E-Learning ketika status pengguna diubah menjadi `DISABLED`:
   - Endpoint: `POST /api/v1/auth/internal/revoke-user`
   - Header: `X-SSO-Secret: <shared_webhook_secret>`
   - Payload: `{"sso_user_id": "uuid-pengguna", "reason": "ACCOUNT_DISABLED"}`
   - E-Learning seketika menandai sesi pengguna pada Redis revocation blacklist (< 1 detik).

### 8.2 Single Sign-Out (RP-Initiated Logout — Bab 7.4)
Saat pengguna menekan tombol "Keluar" pada aplikasi E-Learning:
1. E-Learning menghapus cookie sesi lokal (`HttpOnly`).
2. Browser dialihkan ke endpoint Keycloak:
   `https://sso.uay.ac.id/realms/uay/protocol/openid-connect/logout?post_logout_redirect_uri=https://elearning.uay.ac.id/login&id_token_hint=<id_token>`
3. Keycloak menghapus sesi terpusat dan mengarahkan pengguna kembali ke halaman login E-Learning.

---

## 9. Rekomendasi Tim Pengembang, Action Plan, & Jadwal Integrasi

### 9.1 Rekomendasi Tim Pengembang E-Learning
Berdasarkan pertimbangan performa, resiliensi sistem saat ujian massal, beban infrastruktur server, dan efisiensi waktu penyelesaian, **Tim Pengembang E-Learning merekomendasikan Opsi 1 (Token Enrichment via Keycloak Protocol Mappers)** sebagai solusi utama.

Namun demikian, apabila Tim SSO dan PUSTIK UAY menetapkan bahwa arsitektur Two-Tier harus diterapkan secara murni tanpa penambahan klaim pada Keycloak, **Tim E-Learning 100% siap mengimplementasikan Opsi 2**, dengan catatan endpoint API SSO Backend (Bab 5.2) telah aktif di lingkungan staging.

### 9.2 Rencana Aksi Bersama (Action Plan)

| Tahap | Aktivitas | Pelaksana | Target Waktu |
|---|---|---|---|
| **Tahap 1** | Evaluasi & Pemilihan Opsi (Opsi 1 atau Opsi 2) | Tim SSO & PUSTIK UAY | Hari ke-1 |
| **Tahap 2A** *(Jika Opsi 1)* | Konfigurasi Protocol Mapper pada Client Keycloak Staging | Tim SSO UAY | Hari ke-2 |
| **Tahap 2B** *(Jika Opsi 2)* | Penyediaan Endpoint `GET /api/v1/auth/context` di Staging | Tim SSO UAY | Hari ke-2 s.d. 4 |
| **Tahap 3B** *(Jika Opsi 2)* | Pembuatan Adapter HTTP SSO Backend di E-Learning | Tim E-Learning UAY | Hari ke-4 s.d. 7 |
| **Tahap 4** | Pengujian Integrasi Terpadu (*End-to-End Integration Testing*) | Tim SSO & Tim E-Learning | Hari ke-8 |
| **Tahap 5** | Migrasi Konfigurasi & Rilis ke Lingkungan Production | Tim SSO & Tim E-Learning | Hari ke-9 |

---

## 10. Lembar Pengesahan & Konfirmasi Kesepakatan (Sign-Off Sheet)

Dokumen ini disusun dengan itikad baik untuk mempercepat terwujudnya integrasi Single Sign-On yang aman, andal, dan berstandar tinggi demi kemajuan ekosistem teknologi informasi di lingkungan Universitas Al-Khairaat.

*Palu, 25 September 2026*

| Perwakilan Tim Pengembang E-Learning UAY | Perwakilan Tim Pengembang SSO UAY | Mengetahui, Kepala Biro TI / PUSTIK UAY |
|:---:|:---:|:---:|
| <br><br><br>____________________________<br>**Lead Engineer E-Learning** | <br><br><br>____________________________<br>**Lead Engineer SSO UAY** | <br><br><br>____________________________<br>**Kepala PUSTIK UAY** |
"""
    with open(MD_PATH, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"[OK] Markdown generated: {MD_PATH}")
    return md_content

def generate_docx():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

        # Header
        header = section.header
        p_hdr = header.paragraphs[0]
        p_hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_hdr = p_hdr.add_run("TINJAUAN TEKNIS INTEGRASI SSO UAY — E-LEARNING UAY (VERSI 1.0)")
        set_run_font(r_hdr, size=7.5, color=MUTED, bold=True)

        # Footer
        footer = section.footer
        p_ftr = footer.paragraphs[0]
        p_ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_ftr = p_ftr.add_run("Dokumen Usulan Penyelarasan Integrasi — Universitas Al-Khairaat (UAY) • 25 September 2026")
        set_run_font(r_ftr, size=7.5, color=MUTED)

    # Document Header Box / Cover Header
    cover_table = doc.add_table(rows=1, cols=1)
    set_table_geometry(cover_table, [9020])
    c_cell = cover_table.cell(0, 0)
    set_cell_shading(c_cell, NAVY)
    set_cell_margins(c_cell, top=200, start=240, bottom=200, end=240)
    set_cell_border(c_cell, NAVY, "0")

    p = c_cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("UNIVERSITAS AL-KHAIRAAT (UAY) • BIRO TEKNOLOGI INFORMASI / PUSTIK")
    set_run_font(r, size=8.5, color=LIGHT_BLUE, bold=True)

    p = c_cell.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("DOKUMEN TINJAUAN TEKNIS & USULAN PENYELARASAN ARSITEKTUR INTEGRASI AUTHENTIKASI & OTORISASI SSO UAY DENGAN E-LEARNING UAY")
    set_run_font(r, size=13.0, color=WHITE, bold=True)

    p = c_cell.add_paragraph()
    p.paragraph_format.space_after = Pt(8)
    r = p.add_run("Kajian Komparatif Bab 7 Dokumen Teknis SSO UAY terhadap Kebutuhan Operasional LMS UAY")
    set_run_font(r, size=10.0, color=LIGHT_BLUE, italic=True)

    p = c_cell.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    r = p.add_run("Versi: 1.0  |  Tanggal: 25 September 2026  |  Penyusun: Tim Pengembang E-Learning UAY")
    set_run_font(r, size=8.5, color=WHITE)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_after = Pt(8)

    # 1. Ringkasan Eksekutif & Latar Belakang
    add_heading(doc, "1. Ringkasan Eksekutif & Latar Belakang", level=1)
    add_text(doc, "Dokumen ini disusun sebagai tindak lanjut resmi atas penyerahan Dokumen Teknis SSO UAY oleh Tim Pengembang SSO Universitas Al-Khairaat (UAY) kepada Tim Pengembang E-Learning UAY, dengan rujukan khusus pada Bab 7 (Authentication & Session).")
    add_text(doc, "Tim Pengembang E-Learning telah melakukan audit komparatif mendalam terhadap Bab 7 (sub-bab 7.1 hingga 7.15) dan merumuskan kesimpulan strategis sebagai berikut:")

    add_bullets(doc, [
        "Fondasi Protokol Modern: Penerapan OpenID Connect (OIDC) dan OAuth 2.0 menggunakan Authorization Code Flow dengan PKCE (RFC 7636) pada Keycloak telah memenuhi standar baku keamanan industri pendidikan tinggi.",
        "Arsitektur Dua Lapis (Two-Tier Architecture): Bab 7.7 mendefinisikan pemisahan di mana Lapis 1 (Keycloak) menangani Autentikasi Pengguna, dan Lapis 2 (SSO Backend) mengelola Otorisasi Terpusat melalui tabel application_access dan roles.",
        "Kesenjangan Kritis (Critical Gap): Sesuai spesifikasi klaim token Keycloak pada Bab 7.5, token JWT yang diterbitkan saat ini HANYA memuat identitas dasar (sub, preferred_username, email, name). Token tersebut BELUM memuat: (1) Nomor identitas akademik mahasiswa/dosen (identifier_value seperti NIM/NIDN), (2) Hak akses atau peran spesifik aplikasi (roles), dan (3) Penegasan status keaktifan akun (account_status: ACTIVE).",
        "Implikasi Operasional: Tanpa data identitas akademik dan peran aplikasi, sistem E-Learning tidak dapat mengaitkan pengguna dengan rombongan belajar (kelas), kurikulum program studi, penilaian tugas/kuis, serta tidak dapat menjalankan kontrol akses berbasis peran (RBAC)."
    ])

    add_callout(doc, "TUJUAN PENGAJUAN USULAN",
        "Untuk menjembatani kesenjangan ini tanpa menimbulkan hambatan teknis atau saling tunggu antar tim, dokumen ini menyajikan dua opsi solusi arsitektur: Opsi 1 (Penyesuaian di sisi SSO via Keycloak Protocol Mappers) dan Opsi 2 (Penyesuaian di sisi E-Learning via SSO Backend API). Tim E-Learning siap mengimplementasikan salah satu dari kedua opsi tersebut.",
        fill=LIGHT_BLUE, label_color=BLUE)

    # 2. Matriks Evaluasi Butir per Butir Bab 7
    add_heading(doc, "2. Matriks Evaluasi Butir per Butir Bab 7 Dokumen Teknis SSO UAY", level=1)
    add_text(doc, "Tabel berikut menyajikan telaah teknis mendalam terhadap 15 butir pada Bab 7 Dokumen Teknis SSO UAY dibandingkan dengan kesiapan dan kebutuhan operasional sistem E-Learning UAY:")

    headers_b7 = ["Sub-Bab", "Spesifikasi SSO UAY", "Kebutuhan E-Learning", "Status", "Tindak Lanjut Teknis"]
    rows_b7 = [
        ["7.1", "Standar Protokol: OIDC & OAuth 2.0, Authorization Code + PKCE (RFC 7636).", "E-Learning telah mengimplementasikan PKCE dengan code_challenge_method=S256.", "Sesuai Penuh", "Pertahankan konfigurasi client elearning-uay dengan PKCE wajib."],
        ["7.2", "Alur Autentikasi: Login terpusat via Keycloak Login Page.", "Pengguna dialihkan ke Keycloak; E-Learning menerima authorization_code.", "Sesuai Penuh", "Daftarkan redirect URI resmi: /api/v1/auth/callback."],
        ["7.3", "Single Sign-On Behavior: Keycloak SSO Session Cookie.", "Pengguna yang login di Portal UAY langsung terautentikasi saat membuka LMS.", "Sesuai Penuh", "Didukung otomatis oleh Keycloak SSO Session."],
        ["7.4", "Single Sign-Out: RP-Initiated Logout via Keycloak end_session_endpoint.", "Logout di LMS membersihkan sesi lokal dan memanggil end_session_endpoint.", "Sesuai Penuh", "E-Learning menyertakan id_token_hint dan post_logout_redirect_uri."],
        ["7.5", "Struktur & Klaim Token: sub, preferred_username, email, name, iss, aud, exp.", "Kritis: Token tidak memiliki roles, identifier_value (NIM/NIDN), dan account_status.", "Kesenjangan Kritis", "Memerlukan Opsi 1 (Protocol Mapper) atau Opsi 2 (Query API SSO Backend)."],
        ["7.6", "Validasi Token: Verifikasi asimetris via JWKS URI, RS256/ES256, caching key.", "E-Learning memverifikasi signature token secara lokal via jose & JWKS remote cache.", "Sesuai Penuh", "Tidak ada perubahan pada logika kriptografi verifikasi token."],
        ["7.7", "Arsitektur Otorisasi Dua Lapis: Lapis 1 = Keycloak, Lapis 2 = SSO Backend.", "E-Learning siap mengadopsi Lapis 2 jika API SSO Backend tersedia resmi.", "Titik Temu", "Dijadikan landasan perancangan solusi Opsi 2."],
        ["7.8", "Skema Data Otorisasi: application_access, roles, permissions, dsb.", "Struktur database SSO Backend sangat lengkap dan selaras dengan LMS.", "Sesuai Struktur", "Kolom roles.name menjadi sumber otoritas hak akses di LMS."],
        ["7.9", "Alur Evaluasi Akses: Klien memanggil SSO Backend API untuk Auth Context.", "Alur query SQL dijelaskan, namun belum ada kontrak REST API resmi.", "Perlu Kontrak API", "Memerlukan penerbitan kontrak endpoint resmi dari Tim SSO."],
        ["7.10", "Refresh Token: Penukaran token refresh ke Keycloak token endpoint.", "Backend E-Learning mengelola rotasi token dan menyimpan di HttpOnly cookie.", "Sesuai Penuh", "Sesuai spesifikasi standar RFC 6749."],
        ["7.11", "Manajemen Masa Berlaku Token: Access token 15 menit, refresh token 8 jam.", "Kode E-Learning memvalidasi umur token: payload.exp - payload.iat <= 900.", "Sesuai Penuh", "Konfigurasi waktu kedaluwarsa sudah identik (15 menit)."],
        ["7.12", "Penanganan Token Kedaluwarsa: Silent refresh dan deteksi reuse.", "Middleware LMS mendeteksi token kedaluwarsa dan memicu refresh di background.", "Sesuai Penuh", "Mekanisme rotasi token berjalan transparan bagi pengguna."],
        ["7.13", "Penyimpanan Kredensial: Cookie HttpOnly, Secure, SameSite=Lax.", "E-Learning menolak penyimpanan di localStorage demi mencegah XSS.", "Sesuai Penuh", "Standar keamanan penyimpanan token telah terpenuhi."],
        ["7.14", "Pencegahan Replay & CSRF: Parameter state, nonce, PKCE code_verifier.", "E-Learning memverifikasi integritas state sebelum menukar token.", "Sesuai Penuh", "Memitigasi serangan CSRF dan Replay secara tuntas."],
        ["7.15", "Penonaktifan Pengguna: Pencabutan akses jika akun dinonaktifkan.", "LMS memiliki cache blacklist lokal, butuh propagasi instan dari SSO.", "Perlu Penyelarasan", "Diselaraskan via Webhook Revocation atau TTL token 15 menit."]
    ]
    # Total width = 9020: 600, 2200, 2420, 1400, 2400
    add_table(doc, headers_b7, rows_b7, [600, 2200, 2420, 1400, 2400], small=True)

    # 3. Analisis Mendalam Kesenjangan Kritis
    add_heading(doc, "3. Analisis Mendalam 5 Kesenjangan Kritis & Implikasi Teknis", level=1)
    
    add_heading(doc, "3.1 Ketiadaan Identitas Akademik Mahasiswa & Dosen (NIM / NIDN)", level=2)
    add_text(doc, "Bab 7.5 menetapkan bahwa Keycloak hanya menyertakan klaim profil umum (sub, preferred_username, email, name). Di perguruan tinggi, sub (UUID) dan username tidak cukup untuk menghubungkan mahasiswa ke rombongan belajar (kelas kuliah), kurikulum prodi, presensi, pengisian nilai di SIMAK/SIAKAD, serta sinkronisasi KRS. E-Learning secara mutlak memerlukan NIM untuk mahasiswa dan NIDN/NIP untuk dosen.")
    add_text(doc, "Implikasi Operasional: Jika atribut ini tidak tersedia saat login, E-Learning tidak dapat melakukan Just-In-Time (JIT) provisioning akun akademik, sehingga mahasiswa yang berhasil login tidak akan menemukan mata kuliah yang diikutinya.")

    add_heading(doc, "3.2 Ketiadaan Hak Akses & Peran Aplikasi (roles)", level=2)
    add_text(doc, "Token Keycloak saat ini tidak memuat informasi peran spesifik aplikasi E-Learning. E-Learning menerapkan Role-Based Access Control (RBAC) yang ketat untuk membedakan antara STUDENT, INSTRUCTOR, DEPARTMENT_ADMIN, dan SUPER_ADMIN.")
    add_text(doc, "Implikasi Operasional: Sesuai apps/api/src/auth.ts dan packages/shared/src/sso.ts, ketiadaan peran menyebabkan penolakan akses (403 Forbidden) dengan galat 'No E-Learning role granted for this account'.")

    add_heading(doc, "3.3 Ketiadaan Validasi Status Akun Pengguna (account_status: ACTIVE)", level=2)
    add_text(doc, "Kode otorisasi E-Learning mewajibkan adanya penegasan bahwa status akun pengguna adalah ACTIVE (payload.account_status === 'ACTIVE'). Hal ini penting untuk mencegah mahasiswa cuti, non-aktif, atau terkena sanksi akademik mengakses materi pembelajaran dan ujian daring.")
    add_text(doc, "Implikasi Operasional: Token Keycloak standar saat ini langsung ditolak oleh middleware LMS dengan galat 'ACCOUNT_DISABLED' karena properti account_status bernilai undefined.")

    add_heading(doc, "3.4 Penyelarasan Taksonomi Peran (Role Mapping)", level=2)
    add_text(doc, "Dokumen SSO menggunakan label deskriptif berbahasa Indonesia seperti 'DOSEN' dan 'MAHASISWA', sedangkan domain model E-Learning menggunakan konvensi enum arsitektur bersih: INSTRUCTOR, STUDENT, DEPARTMENT_ADMIN, dan SUPER_ADMIN. Diperlukan penetapan mapping resmi agar tidak terjadi kegagalan type casting saat sinkronisasi identitas.")

    add_heading(doc, "3.5 Spesifikasi & Kepastian Kontrak Endpoint Otorisasi SSO Backend", level=2)
    add_text(doc, "Bab 7.9 memaparkan alur evaluasi akses secara konseptual melalui query SQL ke tabel application_access, namun belum mendokumentasikan spesifikasi REST API (URL endpoint, metode HTTP, header otentikasi, format payload JSON respon, dan penanganan galat). Kepastian kontrak ini mutlak diperlukan jika Opsi 2 dipilih.")

    # 4. Opsi Usulan 1: Token Enrichment via Keycloak Protocol Mappers
    add_heading(doc, "4. Opsi Usulan 1: Penyesuaian Sisi SSO (Token Enrichment via Keycloak)", level=1)
    add_text(doc, "Pada Opsi 1, Tim SSO mengonfigurasi Protocol Mappers khusus pada client elearning-uay di Keycloak. Dengan konfigurasi ini, Keycloak menyematkan data identitas akademik, peran aplikasi, dan status akun langsung ke dalam token JWT yang diterbitkan.")

    add_callout(doc, "ARSITEKTUR ALUR KERJA OPSI 1 (STATELESS / ZERO LATENCY)",
        "Pengguna Login di Keycloak -> Keycloak membaca database SSO -> Keycloak menerbitkan Token JWT berisi [NIM/NIDN, roles, account_status] -> Pengguna mengirim token ke E-Learning -> Backend E-Learning memvalidasi token secara lokal via JWKS (0 ms latensi jaringan ke SSO Backend).",
        fill=LIGHT_GREEN, label_color=GREEN)

    add_heading(doc, "Langkah-Langkah Konfigurasi Teknis di Admin Console Keycloak:", level=2)
    add_bullets(doc, [
        "Mapper 1 (user_type): Buat User Attribute Mapper, Name: user_type_mapper, User Attribute: user_type, Token Claim Name: user_type, Claim JSON Type: String, Add to ID/Access Token: ON.",
        "Mapper 2 (account_status): Buat User Attribute Mapper, Name: account_status_mapper, User Attribute: status, Token Claim Name: account_status, Claim JSON Type: String (nilai: ACTIVE), Add to ID/Access Token: ON.",
        "Mapper 3 (identifier_value & identifier_type): Buat User Attribute Mapper untuk memetakan NIM/NIDN ke klaim identifier_value dan tipe ke identifier_type.",
        "Mapper 4 (roles): Buat User Client Role Mapper atau Attribute Mapper, Name: elearning_roles_mapper, Token Claim Name: roles, Claim JSON Type: JSON (Array of Strings), Add to ID/Access Token: ON, Multivalued: ON."
    ], numbered=True)

    add_heading(doc, "Contoh Payload Token JWT yang Diharapkan (Self-Contained Token):", level=2)
    add_code(doc, """{
  "exp": 1741500000,
  "iat": 1741499100,
  "jti": "b3c8f2a1-5d4e-4f8a-9c2b-1a2b3c4d5e6f",
  "iss": "https://sso.uay.ac.id/realms/uay",
  "aud": "elearning-uay",
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "preferred_username": "202401001",
  "email": "ahmad.dahlan@uay.ac.id",
  "name": "Ahmad Dahlan",
  "user_type": "STUDENT",
  "account_status": "ACTIVE",
  "identifier_type": "NIM",
  "identifier_value": "202401001",
  "roles": ["STUDENT"],
  "department_scopes": ["INFORMATIKA"]
}""")

    add_text(doc, "Kelebihan Opsi 1: Latensi 0 ms (tanpa network hop tambahan), stateless & tahan lonjakan trafik ujian serentak, serta zero code modification di sisi E-Learning.")
    add_text(doc, "Batasan: Memerlukan konfigurasi protocol mapper di Keycloak Admin Console oleh Tim SSO (estimasi pengerjaan: 30–60 menit).")

    # 5. Opsi Usulan 2: Two-Tier Decoupled Architecture
    add_heading(doc, "5. Opsi Usulan 2: Penyesuaian Sisi E-Learning (Two-Tier Decoupled Architecture)", level=1)
    add_text(doc, "Pada Opsi 2, Tim SSO tidak perlu mengubah konfigurasi Keycloak. E-Learning beradaptasi sepenuhnya dengan arsitektur Bab 7.7–7.9: Keycloak hanya bertugas melakukan autentikasi identitas, sedangkan E-Learning menambahkan adapter HTTP internal untuk memanggil REST API SSO Backend guna mengambil Konteks Otorisasi dan data akademik.")

    add_callout(doc, "ARSITEKTUR ALUR KERJA OPSI 2 (TWO-TIER ADAPTER)",
        "Pengguna Login di Keycloak -> E-Learning menerima Token dasar (Bab 7.5) -> Backend E-Learning memvalidasi JWKS -> Backend E-Learning memanggil GET /api/v1/auth/context ke SSO Backend -> SSO Backend mengeksekusi query database Bab 7.8 -> E-Learning menyimpan Konteks Otorisasi di Redis/Memory Cache selama 15 menit.",
        fill=LIGHT_GOLD, label_color=GOLD)

    add_heading(doc, "Spesifikasi Kontrak API SSO Backend yang Dibutuhkan oleh E-Learning:", level=2)
    add_text(doc, "Endpoint Path: GET /api/v1/auth/context (atau GET /api/v1/users/me/access)")
    add_text(doc, "Headers Permintaan: Authorization: Bearer <keycloak_token>, X-Client-ID: elearning-uay, Accept: application/json")
    
    add_heading(doc, "Contoh Payload Respon JSON dari SSO Backend (200 OK):", level=3)
    add_code(doc, """{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "username": "202401001",
  "name": "Ahmad Dahlan",
  "email": "ahmad.dahlan@uay.ac.id",
  "user_type": "STUDENT",
  "status": "ACTIVE",
  "primary_identifier": {
    "type": "NIM",
    "value": "202401001"
  },
  "application_access": {
    "client_id": "elearning-uay",
    "roles": ["STUDENT"],
    "permissions": ["courses.view", "assignments.submit", "quizzes.take"],
    "department_scopes": ["INFORMATIKA"],
    "is_active": true,
    "expires_at": null
  }
}""")

    add_text(doc, "Mekanisme Resiliensi & Caching di E-Learning: Respon API akan di-cache secara lokal selama 15 menit sejalan dengan masa aktif token Keycloak. E-Learning juga menerapkan Circuit Breaker agar sistem tetap dapat beroperasi menggunakan data lokal apabila SSO Backend mengalami gangguan sementara.")
    add_text(doc, "Kelebihan Opsi 2: Mematuhi arsitektur Lapis 2 murni rancangan Tim SSO; Tim SSO tidak perlu menyentuh konfigurasi Keycloak.")
    add_text(doc, "Batasan: Menambah 1 network hop (latensi 30–120 ms saat login), menimbulkan dependensi runtime ke SSO Backend API, dan membutuhkan penyesuaian kode pada backend E-Learning.")

    # 6. Matriks Komparasi Opsi 1 vs Opsi 2
    add_heading(doc, "6. Matriks Komparasi Opsi 1 vs Opsi 2", level=1)
    add_text(doc, "Tabel berikut merangkum perbandingan teknis antara Opsi 1 dan Opsi 2 sebagai bahan pertimbangan bagi pimpinan dan Tim SSO:")

    headers_cmp = ["Kriteria Evaluasi", "Opsi 1: Token Enrichment (Keycloak)", "Opsi 2: Two-Tier Adapter (SSO Backend API)", "Analisis Dampak"]
    rows_cmp = [
        ["Latensi & Kecepatan", "Optimal (0 ms overhead). Validasi token 100% lokal via JWKS cache.", "Menengah (+30 s.d. 120 ms) saat login awal atau saat cache miss.", "Opsi 1 memberikan performa terbaik saat ujian daring serentak."],
        ["Beban Server SSO", "Sangat Ringan. Server SSO hanya melayani handshake OIDC awal.", "Tinggi. SSO Backend melayani query database untuk setiap sesi login.", "Opsi 1 melindungi database SSO dari beban lonjakan query."],
        ["Kompleksitas Tim SSO", "Sangat Rendah (Konfigurasi Saja). Menambah mapper di Keycloak UI (30-60 menit).", "Sedang s.d. Tinggi. Merilis dan memelihara endpoint REST API otorisasi.", "Opsi 1 menghemat sumber daya dan waktu pengerjaan Tim SSO."],
        ["Kompleksitas Tim LMS", "Nol (Zero Code Modification). Kode LMS sudah siap memproses token lengkap.", "Sedang. Menambahkan client HTTP ke SSO Backend, caching, & fallback.", "Tim E-Learning siap mengembangkan adapter Opsi 2 jika dipilih."],
        ["Kepatuhan Standar", "Tinggi (Standar OIDC). Token enrichment adalah fitur standar Keycloak.", "Pola Hybrid / Proprietary. Bergantung pada API khusus SSO Backend.", "Opsi 1 lebih modular dan portable sesuai best practice microservices."],
        ["Propagasi Perubahan Role", "Menunggu Refresh Token (Maks. 15 menit) atau login ulang.", "Mendekati Instan s.d. 15 menit (bergantung pada durasi caching).", "Relatif seimbang karena Opsi 2 pun wajib menerapkan caching."],
        ["Ketahanan Sistem", "Tinggi. LMS tetap aktif memvalidasi token meskipun SSO Backend down.", "Rentan. Jika SSO Backend offline, proses login LMS terhambat.", "Opsi 1 memiliki isolasi kegagalan (fault tolerance) yang lebih baik."],
        ["Estimasi Waktu Go-Live", "1–2 Hari Kerja (konfigurasi mapper + testing integrasi).", "1–2 Minggu Kerja (finalisasi endpoint API SSO + refactor auth LMS).", "Opsi 1 menawarkan jalur integrasi yang jauh lebih cepat."]
    ]
    # Total width = 9020: 1620, 2400, 2400, 2600
    add_table(doc, headers_cmp, rows_cmp, [1620, 2400, 2400, 2600], small=True)

    # 7. Penyelarasan Taksonomi Peran
    add_heading(doc, "7. Penyelarasan Taksonomi Peran (Role Mapping Matrix)", level=1)
    add_text(doc, "Untuk memastikan keselarasan hak akses antara database SSO UAY dan sistem E-Learning UAY, disepakati aturan pemetaan peran sebagai berikut:")

    headers_rm = ["Peran pada SSO UAY", "Peran pada E-Learning", "Hak Akses & Kewenangan di E-Learning UAY"]
    rows_rm = [
        ["MAHASISWA / STUDENT", "STUDENT", "Mengakses materi kuliah, mengumpulkan tugas, mengikuti kuis/ujian daring, melihat nilai pribadi, dan berdiskusi di forum kelas."],
        ["DOSEN / LECTURER / PENGAJAR", "INSTRUCTOR", "Mengelola silabus dan modul, mengunggah materi, membuat tugas & bank soal ujian, memberikan penilaian, dan mengelola kelas."],
        ["ADMIN_PRODI / STAFF_AKADEMIK", "DEPARTMENT_ADMIN", "Memantau seluruh mata kuliah dalam program studi, melihat analitik akademik prodi, dan mengelola alokasi dosen pengampu."],
        ["SUPER_ADMIN / ADMIN_PUSAT", "SUPER_ADMIN", "Kendali penuh atas sistem LMS, konfigurasi integrasi SSO, audit log keamanan, dan pemeliharaan lintas fakultas/prodi."]
    ]
    # Total width = 9020: 2200, 2200, 4620
    add_table(doc, headers_rm, rows_rm, [2200, 2200, 4620], small=True)
    add_text(doc, "Aturan Multi-Peran: Jika seorang pengguna memiliki lebih dari satu peran di SSO, E-Learning menetapkan peran efektif berdasarkan hierarki tertinggi: SUPER_ADMIN > DEPARTMENT_ADMIN > INSTRUCTOR > STUDENT.")

    # 8. Protokol Keamanan, Penonaktifan Akun, & Siklus Sesi
    add_heading(doc, "8. Protokol Keamanan, Penonaktifan Akun (Bab 7.15), & Siklus Sesi", level=1)
    add_heading(doc, "8.1 Sinkronisasi Penonaktifan Akun (Bab 7.15)", level=2)
    add_text(doc, "1. Mekanisme Pasif (Standar OIDC): Dengan masa aktif token 15 menit, penonaktifan akun di Keycloak/SSO akan otomatis menghentikan akses pengguna maksimal dalam 15 menit saat token refresh ditolak oleh Keycloak.")
    add_text(doc, "2. Mekanisme Aktif (Webhook Revocation): Tim SSO dapat memanggil webhook internal LMS saat akun dinonaktifkan: POST /api/v1/auth/internal/revoke-user dengan payload {'sso_user_id': 'uuid', 'reason': 'ACCOUNT_DISABLED'} untuk mencabut akses seketika (< 1 detik).")

    add_heading(doc, "8.2 Single Sign-Out (RP-Initiated Logout — Bab 7.4)", level=2)
    add_text(doc, "Saat pengguna logout di LMS: (1) LMS membersihkan cookie sesi lokal, (2) Browser dialihkan ke Keycloak end_session_endpoint dengan menyertakan id_token_hint dan post_logout_redirect_uri, (3) Keycloak menghapus sesi terpusat dan mengarahkan kembali ke halaman login LMS.")

    # 9. Rekomendasi Tim Pengembang & Action Plan
    add_heading(doc, "9. Rekomendasi Tim Pengembang, Action Plan, & Jadwal Integrasi", level=1)
    add_text(doc, "Rekomendasi Resmi: Berdasarkan pertimbangan performa bebas latensi (0 ms), keandalan saat lonjakan akses ujian massal, efisiensi beban server SSO, dan waktu implementasi tercepat, Tim Pengembang E-Learning merekomendasikan Opsi 1 (Token Enrichment via Keycloak).")
    add_text(doc, "Kesiapan Menjalankan Opsi 2: Apabila Tim SSO menetapkan bahwa Keycloak tidak diperbolehkan menyimpan atau memetakan atribut aplikasi, Tim E-Learning 100% siap mengimplementasikan Opsi 2, asalkan endpoint API SSO Backend (Bab 5.2) telah aktif di lingkungan staging.")

    headers_ap = ["Tahap", "Aktivitas", "Pelaksana", "Target Waktu"]
    rows_ap = [
        ["Tahap 1", "Evaluasi & Pemilihan Opsi (Opsi 1 atau Opsi 2)", "Tim SSO & PUSTIK UAY", "Hari ke-1"],
        ["Tahap 2A", "Jika Opsi 1: Konfigurasi Protocol Mapper pada Client Keycloak Staging", "Tim SSO UAY", "Hari ke-2"],
        ["Tahap 2B", "Jika Opsi 2: Penyediaan Endpoint GET /api/v1/auth/context di Staging", "Tim SSO UAY", "Hari ke-2 s.d. 4"],
        ["Tahap 3B", "Jika Opsi 2: Pembuatan Adapter HTTP SSO Backend di E-Learning", "Tim E-Learning UAY", "Hari ke-4 s.d. 7"],
        ["Tahap 4", "Pengujian Integrasi Terpadu (End-to-End Integration Testing)", "Tim SSO & Tim E-Learning", "Hari ke-8"],
        ["Tahap 5", "Migrasi Konfigurasi & Rilis ke Lingkungan Production", "Tim SSO & Tim E-Learning", "Hari ke-9"]
    ]
    # Total width = 9020: 1200, 4220, 2200, 1400
    add_table(doc, headers_ap, rows_ap, [1200, 4220, 2200, 1400], small=True)

    # 10. Lembar Pengesahan
    add_heading(doc, "10. Lembar Pengesahan & Konfirmasi Kesepakatan (Sign-Off Sheet)", level=1)
    add_text(doc, "Dokumen ini disusun untuk mempercepat terwujudnya integrasi Single Sign-On yang aman, andal, dan berstandar tinggi demi kemajuan ekosistem teknologi informasi di lingkungan Universitas Al-Khairaat.")
    add_text(doc, "Palu, 25 September 2026", italic=True)

    sig_table = doc.add_table(rows=2, cols=3)
    set_table_geometry(sig_table, [3006, 3006, 3008])
    headers_sig = [
        "Perwakilan Tim Pengembang\nE-Learning UAY",
        "Perwakilan Tim Pengembang\nSSO UAY",
        "Mengetahui,\nKepala Biro TI / PUSTIK UAY"
    ]
    for i, h in enumerate(headers_sig):
        cell = sig_table.rows[0].cells[i]
        set_cell_shading(cell, LIGHT_GRAY)
        set_cell_border(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        set_run_font(r, size=9.0, color=NAVY, bold=True)

    for i in range(3):
        cell = sig_table.rows[1].cells[i]
        set_cell_shading(cell, WHITE)
        set_cell_border(cell)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(50)
        p.paragraph_format.space_after = Pt(4)
        r = p.add_run("( ___________________________ )")
        set_run_font(r, size=9.0, color=MUTED)
        p2 = cell.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.space_after = Pt(0)
        titles = ["Lead Engineer LMS", "Lead Engineer SSO", "Kepala PUSTIK UAY"]
        r2 = p2.add_run(titles[i])
        set_run_font(r2, size=8.5, color=INK, bold=True)

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
    print("=== Generating SSO Integration Review Document Suite ===")
    generate_markdown()
    generate_docx()
    convert_docx_to_pdf()
    print("=== All Documents Generated Successfully ===")

if __name__ == "__main__":
    build_all()
