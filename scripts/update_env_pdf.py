"""Update LEMBAR_DATA_DAN_ENV_INTEGRASI_UAY.pdf with Prod-Test S3 Railway card on Page 5."""
from pathlib import Path
import shutil
import fitz

root = Path(__file__).resolve().parents[1]
target = root.parent / "LEMBAR_DATA_DAN_ENV_INTEGRASI_UAY.pdf"
staged = root / "tmp/pdfs/LEMBAR_DATA_DAN_ENV_INTEGRASI_UAY-revisi.pdf"

doc = fitz.open(target)

# 1. Update version on Page 1
p1 = doc[0]
p1.add_redact_annot(fitz.Rect(423, 44, 550, 94), fill=(1, 1, 1))
p1.apply_redactions(images=0, graphics=0)
p1.insert_textbox(
    fitz.Rect(423, 44, 550, 94),
    "No. Dokumen: UAY-INT-2026-001\nTanggal: 10 Oktober 2026\nVersi: 1.2 (Prod-Test S3)\nKlasifikasi: Internal Teknis",
    fontsize=7,
    fontname="helv",
    color=(0.075, 0.235, 0.365),
    lineheight=1.4,
)

# 2. Add Prod-Test S3 Railway Card on Page 5
p5 = doc[4]

# Redact existing area between Y=520 and Y=805 on Page 5 (in case re-run)
p5.add_redact_annot(fitz.Rect(38, 520, 560, 805), fill=(1, 1, 1))
p5.apply_redactions(images=0, graphics=0)

# Heading above card
p5.insert_textbox(
    fitz.Rect(39.75, 523.0, 550.0, 536.0),
    "Opsi Prod-Test: Penyimpanan S3 Railway (Hanya Storage di Railway, Sisanya VPS Kampus)",
    fontname="helv",
    fontsize=8.5,
    color=(0.059, 0.231, 0.376), # #0f3b60
)

# Coordinates for dark card
x0, y0, x1, y1 = 40.125, 538.0, 555.363, 792.0

shape = p5.new_shape()
shape.draw_rect(fitz.Rect(x0, y0, x1, y1), radius=0.015)
shape.finish(
    fill=(0.1176, 0.1608, 0.2314), # #1e293b
    color=(0.200, 0.2549, 0.3333), # #334155
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
    p5.insert_text(fitz.Point(51.0, curr_y), text, **kwargs)
    curr_y += line_height

# Set metadata
doc.set_metadata({
    "title": "Lembar Data dan ENV Integrasi UAY - Revisi 1.2 - S3 Railway Prod-Test",
    "author": "Universitas Achmad Yani",
    "subject": "Spesifikasi integrasi UAY SSO, UAY File Service, Akses Rektor, dan S3 Railway Prod-Test",
})

# Save to staged and target
staged.parent.mkdir(parents=True, exist_ok=True)
doc.save(staged, garbage=4, deflate=True)
doc.close()
shutil.copy2(staged, target)
print(f"Successfully updated {target} ({len(fitz.open(target))} pages)")
