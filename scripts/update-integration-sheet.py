"""Update the supplied handover sheet in place, preserving its original eight pages."""
from pathlib import Path
import io, shutil
import pymupdf as fitz
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT

root = Path(__file__).resolve().parents[1]
target = root.parent / 'LEMBAR_DATA_DAN_ENV_INTEGRASI_UAY.pdf'
backup = root / 'tmp/pdfs/LEMBAR_DATA_DAN_ENV_INTEGRASI_UAY-v1.0.pdf'
backup.parent.mkdir(parents=True, exist_ok=True)
if not backup.exists(): shutil.copy2(target, backup)
doc = fitz.open(backup)
navy = (0.075, 0.235, 0.365)
muted = (0.26, 0.32, 0.40)

def replace(page, rect, text, size=9, color=navy):
    page.add_redact_annot(fitz.Rect(rect), fill=(1,1,1))
    page.apply_redactions(images=0, graphics=0)
    result = page.insert_textbox(fitz.Rect(rect), text, fontsize=size, fontname='helv', color=color, lineheight=1.4)
    if result < 0: raise RuntimeError(f'Text did not fit: {text[:60]}')

replace(doc[0], (423,44,550,94), 'No. Dokumen: UAY-INT-2026-001\nTanggal: 10 Oktober 2026\nVersi: 1.2 (Prod-Test S3)\nKlasifikasi: Internal Teknis', 7)
replace(doc[1], (47,641,290,771),
    'Daftarkan 5 role pada client elearning-uay:\n'
    'SUPER_ADMIN: Administrator utama / IT pusat.\n'
    'DEPARTMENT_ADMIN: Pengelola program studi.\n'
    'RECTOR: Rektor; membaca laporan seluruh prodi.\n'
    'INSTRUCTOR: Dosen pengampu / asisten.\n'
    'STUDENT: Mahasiswa peserta perkuliahan.\n'
    'Permintaan akun dan batas akses rektor: halaman 9-10.', 8.5)
replace(doc[7], (228,178,446,220),
    'Jika beberapa role diberikan, urutan: SUPER_ADMIN > RECTOR > DEPARTMENT_ADMIN > INSTRUCTOR > STUDENT. Akun rektor hanya diberi RECTOR.', 8)

def add_s3_railway_card(page):
    x0, y0, x1, y1 = 40.125, 538.0, 555.363, 792.0
    page.insert_textbox(
        fitz.Rect(39.75, 523.0, 550.0, 536.0),
        "Opsi Prod-Test: Penyimpanan S3 Railway (Hanya Storage di Railway, Sisanya VPS Kampus)",
        fontname="helv",
        fontsize=8.5,
        color=(0.059, 0.231, 0.376),
    )
    shape = page.new_shape()
    shape.draw_rect(fitz.Rect(x0, y0, x1, y1), radius=0.015)
    shape.finish(
        fill=(0.1176, 0.1608, 0.2314),
        color=(0.200, 0.2549, 0.3333),
        width=0.75,
    )
    shape.commit()

    f_reg = Path("C:/Windows/Fonts/consola.ttf")
    f_bld = Path("C:/Windows/Fonts/consolab.ttf")
    f_ita = Path("C:/Windows/Fonts/consolai.ttf")
    has_consolas = f_reg.exists() and f_bld.exists() and f_ita.exists()

    lines = [
        ("# ====================================================================", "comment"),
        ("# VARIAN PROD-TEST: PENYIMPANAN S3 RAILWAY (TIGRIS OBJECT STORAGE)", "comment"),
        ("# Digunakan saat pengujian produksi sebelum UAY File Service live.", "comment"),
        ("# Seluruh variabel di atas (Domain, DB, SSO) tetap sama, HANYA storage diganti:", "comment"),
        ("# ====================================================================", "comment"),
        ("FILE_STORAGE_DRIVER=s3", "keyval"),
        ("FILE_SERVICE_TYPE=s3", "keyval"),
        ("# Kredensial S3 Railway Tigris (Obyek Penyimpanan)", "comment"),
        ("S3_ENDPOINT=https://t3.storageapi.dev", "keyval"),
        ("S3_REGION=auto", "keyval"),
        ("S3_BUCKET=arranged-lounge-j7sbw8iq1", "keyval"),
        ("S3_ACCESS_KEY_ID=tid_zImBpKfObONAYpHBoICnphxCNDKgcIbhCRWjkcPiaHWpnvTAfT", "keyval"),
        ("S3_SECRET_ACCESS_KEY=IsiDenganSecretAccessKeyRailwayTigris", "keyval"),
        ("S3_FORCE_PATH_STYLE=true", "keyval"),
        ("S3_KEY_PREFIX=uploads", "keyval"),
        ("# Domain Asal yang Diizinkan (S3 Railway & Domain Produksi Kampus)", "comment"),
        ("FILE_ALLOWED_ORIGINS=https://t3.storageapi.dev,https://e-learning.uay.ac.id", "keyval"),
    ]

    curr_y = 553.0
    line_height = 13.5
    for text, ltype in lines:
        if ltype == "comment":
            color = (0.58, 0.639, 0.722)
            fname = "Consolas-Italic" if has_consolas else "Courier-Oblique"
            ffile = str(f_ita) if has_consolas else None
        else:
            color = (0.22, 0.741, 0.973)
            fname = "Consolas-Bold" if has_consolas else "Courier-Bold"
            ffile = str(f_bld) if has_consolas else None

        kwargs = {"fontname": fname, "fontsize": 7.8, "color": color}
        if ffile: kwargs["fontfile"] = ffile
        page.insert_text(fitz.Point(51.0, curr_y), text, **kwargs)
        curr_y += line_height

add_s3_railway_card(doc[4])

styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyUAY',fontName='Helvetica',fontSize=10.5,leading=15,textColor=HexColor('#273747'),spaceAfter=8))
styles.add(ParagraphStyle(name='TitleUAY',fontName='Helvetica-Bold',fontSize=19,leading=24,textColor=HexColor('#133c5d'),spaceAfter=12))
styles.add(ParagraphStyle(name='HeadUAY',fontName='Helvetica-Bold',fontSize=12.5,leading=17,textColor=HexColor('#133c5d'),spaceBefore=12,spaceAfter=7))
styles.add(ParagraphStyle(name='CellUAY',fontName='Helvetica',fontSize=10,leading=14,textColor=HexColor('#273747')))
styles.add(ParagraphStyle(name='KeyUAY',fontName='Helvetica-Bold',fontSize=10,leading=14,textColor=HexColor('#133c5d')))
def p(text,style='BodyUAY'): return Paragraph(text,styles[style])
buffer=io.BytesIO()
sheet=SimpleDocTemplate(buffer,pagesize=(594.96,841.92),leftMargin=40,rightMargin=40,topMargin=42,bottomMargin=45)
story=[p('6. PERMINTAAN AKUN &amp; AKSES REKTOR','TitleUAY'),
 p('Revisi 1.1 - 06 Oktober 2026 | UAY-INT-2026-001'),
 p('Rektor masuk melalui E-Learning UAY dengan akun kampus, lalu membuka menu <b>Pemantauan Akademik</b>. Akun ini hanya untuk melihat kegiatan dosen dan penyelesaian penilaian di seluruh program studi.'),
 p('A. Permintaan kepada pengelola SSO UAY','HeadUAY')]
rows=[('Aplikasi / client','E-Learning UAY / elearning-uay. Gunakan aplikasi yang sudah terdaftar; tidak perlu client dashboard terpisah.'),
 ('Role yang diminta','RECTOR (nama tampilan: Rektor). Kirim dalam claim roles: ["RECTOR"]. Jangan memberikan SUPER_ADMIN atau DEPARTMENT_ADMIN untuk kebutuhan ini.'),
 ('Identitas akun','Nama: ______________________________<br/>Email kampus: ______________________<br/>NIP / NIDN: _________________________<br/>Username: __________________________'),
 ('Claim identitas','sub berupa UUID; name, email, preferred_username, user_type, identifier_type, identifier_value; account_status=ACTIVE. Gunakan identitas dan nomor induk rektor yang resmi.'),
 ('Cakupan laporan','Seluruh program studi, berdasarkan role RECTOR. department_scopes tetap berupa array; array kosong [] dapat digunakan untuk akun rektor. Tidak perlu nilai wildcard.'),
 ('Alamat masuk / keluar','Callback dan alamat setelah keluar tetap mengikuti tabel registrasi pada halaman 2. Akun yang dinonaktifkan atau dicabut aksesnya harus kehilangan akses laporan.')]
t=Table([[p(a,'KeyUAY'),p(b,'CellUAY')] for a,b in rows],colWidths=[135,379.96],hAlign='LEFT')
t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('BACKGROUND',(0,0),(0,-1),HexColor('#eef4f8')),('GRID',(0,0),(-1,-1),0.5,HexColor('#d4e0ea')),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
story.extend([t,PageBreak(),p('AKSES REKTOR - VERIFIKASI','TitleUAY'),p('B. Batas hak akses rektor','HeadUAY'),
 p('<b>Dapat:</b> membaca ringkasan universitas, kegiatan dosen, laporan kelas, riwayat kegiatan, serta mengunduh laporan CSV/PDF.'),
 p('<b>Tidak dapat:</b> mengubah kelas atau materi, memasukkan/mengoreksi nilai, mengelola pengguna, mengakses jawaban dan umpan balik mahasiswa, atau menerima nilai individual mahasiswa. Role rektor tidak memerlukan izin pengelolaan File Service.'),
 p('C. Konfigurasi dan pemeriksaan penerimaan','HeadUAY'),
 p('Gunakan AUTH_MODE=oidc dan DEMO_MODE=false untuk layanan kampus. Tidak ada rahasia atau variabel login dashboard tambahan. Jalankan migrasi penambahan role RECTOR sebelum layanan diperbarui.'),
 p('Periksa: (1) akun rektor berhasil masuk melalui e-learning; (2) menu laporan terlihat dan mencakup seluruh prodi; (3) dosen/mahasiswa tidak dapat membuka laporan rektor; (4) akun rektor ditolak ketika mencoba mengubah data akademik; (5) keluar atau penonaktifan akun menghentikan akses.'),
 p('<b>Catatan data:</b> mode demo tetap berlabel data simulasi. Pada data kampus, riwayat yang belum tercatat, termasuk logout, ditampilkan sebagai belum tersedia; tidak dibuat perkiraan durasi kerja. Pengelola SSO perlu mengonfirmasi pemberian role sebelum penggunaan kampus.'),
 p('D. Konfirmasi serah-terima akun','HeadUAY'),
 p('Pengelola SSO: ______________________________________<br/>Tanggal role diberikan: _______________________________<br/>Nama akun / username yang diberi akses: ________________<br/>Role aplikasi yang dikonfirmasi: RECTOR<br/>Status akun: ACTIVE / DISABLED (pilih yang sesuai)'),
 p('E. Catatan hasil pemeriksaan','HeadUAY'),
 p('Masuk melalui akun kampus: ___________________________<br/>Laporan seluruh program studi: _________________________<br/>Penolakan akses dosen / mahasiswa: ____________________<br/>Penolakan perubahan data oleh rektor: __________________<br/>Keluar / pencabutan akses: ____________________________<br/>Pemeriksa dan tanggal: ________________________________')])
sheet.build(story)
appendix=fitz.open(stream=buffer.getvalue(),filetype='pdf')
if len(appendix)!=2: raise RuntimeError(f'Rector appendix expected two pages; got {len(appendix)}')
doc.insert_pdf(appendix)
for i,page in enumerate(doc):
    for rect in page.search_for(f'Halaman {i+1} dari 8'):
        page.add_redact_annot(rect+(-2,-1,2,2),fill=(1,1,1))
    page.apply_redactions(images=0,graphics=0)
    page.insert_textbox(fitz.Rect(190,814,405,834),f'Halaman {i+1} dari {len(doc)}',fontname='helv',fontsize=8,align=1,color=muted)
doc.set_metadata({'title':'Lembar Data dan ENV Integrasi UAY - Revisi 1.2 - S3 Railway Prod-Test','author':'Universitas Achmad Yani','subject':'Spesifikasi integrasi UAY SSO, UAY File Service, Akses Rektor, dan S3 Railway Prod-Test'})
staged=root/'tmp/pdfs/LEMBAR_DATA_DAN_ENV_INTEGRASI_UAY-revisi.pdf'
doc.save(staged,garbage=4,deflate=True)
doc.close()
shutil.copy2(staged,target)
print(f'Updated {target} (10 pages)')
