import base64
from PIL import Image
import io
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

web_public = REPO_ROOT / "apps" / "web" / "public"
qa_public = REPO_ROOT / "apps" / "qa" / "public"

src_logo_path = web_public / "uay-logo.png"
if not src_logo_path.exists():
    raise FileNotFoundError(f"Missing {src_logo_path}")

print(f"Reading original logo from {src_logo_path}...")
orig_img = Image.open(src_logo_path)
orig_size = os.path.getsize(src_logo_path)
print(f"Original size: {orig_size:,} bytes, dimensions: {orig_img.size}")

# 1. Generate 256x256 PNG optimized
img256 = orig_img.resize((256, 256), Image.Resampling.LANCZOS)
q256 = img256.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
png_256_buf = io.BytesIO()
q256.save(png_256_buf, format="PNG", optimize=True)
png_256_bytes = png_256_buf.getvalue()

with open(src_logo_path, "wb") as f:
    f.write(png_256_bytes)
print(f"Updated {src_logo_path}: {len(png_256_bytes):,} bytes (saved {orig_size - len(png_256_bytes):,} bytes)")

# 2. Generate 256x256 WebP
webp_path = web_public / "uay-logo.webp"
webp_buf = io.BytesIO()
img256.save(webp_buf, format="WEBP", quality=92, method=6)
webp_bytes = webp_buf.getvalue()
with open(webp_path, "wb") as f:
    f.write(webp_bytes)
print(f"Created {webp_path}: {len(webp_bytes):,} bytes")

# 3. Generate 128x128 Favicon PNG and SVG
img128 = orig_img.resize((128, 128), Image.Resampling.LANCZOS)
q128 = img128.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
fav_png_buf = io.BytesIO()
q128.save(fav_png_buf, format="PNG", optimize=True)
fav_png_bytes = fav_png_buf.getvalue()
b64_fav = base64.b64encode(fav_png_bytes).decode("ascii")

svg_fav_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%" role="img" aria-label="Logo Resmi UAY Banjarmasin">
  <image href="data:image/png;base64,{b64_fav}" width="128" height="128"/>
</svg>
'''

fav_web_path = web_public / "favicon.svg"
fav_qa_path = qa_public / "favicon.svg"

with open(fav_web_path, "w", encoding="utf-8") as f:
    f.write(svg_fav_content)
print(f"Updated {fav_web_path}: {len(svg_fav_content):,} bytes")

if qa_public.exists():
    with open(fav_qa_path, "w", encoding="utf-8") as f:
        f.write(svg_fav_content)
    print(f"Updated {fav_qa_path}: {len(svg_fav_content):,} bytes")

# 4. Update uay-logo.svg
b64_logo256 = base64.b64encode(png_256_bytes).decode("ascii")
svg_logo_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%" role="img" aria-label="Logo Resmi UAY Banjarmasin">
  <image href="data:image/png;base64,{b64_logo256}" width="256" height="256"/>
</svg>
'''
logo_svg_path = web_public / "uay-logo.svg"
with open(logo_svg_path, "w", encoding="utf-8") as f:
    f.write(svg_logo_content)
print(f"Updated {logo_svg_path}: {len(svg_logo_content):,} bytes")

# 5. Optimize apple-touch-icon.png if present
apple_path = web_public / "apple-touch-icon.png"
if apple_path.exists():
    orig_apple = Image.open(apple_path)
    q_apple = orig_apple.quantize(colors=256, method=Image.Quantize.FASTOCTREE)
    apple_buf = io.BytesIO()
    q_apple.save(apple_buf, format="PNG", optimize=True)
    apple_bytes = apple_buf.getvalue()
    with open(apple_path, "wb") as f:
        f.write(apple_bytes)
    print(f"Updated {apple_path}: {len(apple_bytes):,} bytes")

print("All brand assets successfully optimized!")
