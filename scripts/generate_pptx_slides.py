# -*- coding: utf-8 -*-
"""
Generate professional 16:9 Widescreen PowerPoint Presentation (.pptx)
for E-Learning Universitas Achmad Yani (UAY) Socialization & Operational Guide.
Covers all roles: Super Admin, Department Admin, Instructor, and Student.
"""
from pathlib import Path
import shutil
import pptx
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

ROOT = Path(r"E:\UVAYA\Project\E - Learning UAY")
DOCS_DIR = ROOT / "docs"
PROJECT_ROOT = Path(r"E:\UVAYA\Project")
PANDUAN_DIR = PROJECT_ROOT / "Panduan"
OUT_PPTX = DOCS_DIR / "Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx"

# Color Palette
C_DARK_BG   = RGBColor(15, 23, 42)      # #0F172A (Midnight Navy)
C_DARK_CARD = RGBColor(30, 41, 59)      # #1E293B (Slate Dark)
C_LIGHT_BG  = RGBColor(248, 250, 252)   # #F8FAFC (Slate Light)
C_LIGHT_CARD= RGBColor(255, 255, 255)   # #FFFFFF
C_PRIMARY   = RGBColor(22, 101, 52)     # #166534 (Emerald Green Dark)
C_EMERALD   = RGBColor(34, 197, 94)     # #22C55E (Emerald Green Light)
C_AMBER     = RGBColor(217, 119, 6)     # #D97706 (Amber / Gold)
C_BLUE      = RGBColor(2, 132, 199)     # #0284C7 (Sky Blue)
C_TEXT_DARK = RGBColor(15, 23, 42)      # Slate Dark Text
C_TEXT_LIGHT= RGBColor(248, 250, 252)   # Slate Light Text
C_TEXT_MUTED= RGBColor(100, 116, 139)   # Slate Gray
C_BORDER    = RGBColor(226, 232, 240)   # Light Border

def add_header(slide, title_text, category_text, dark=False):
    # Category badge
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
    tf = cat_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = category_text.upper()
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_EMERALD if dark else C_PRIMARY
    
    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.8))
    tf2 = title_box.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
    p2 = tf2.paragraphs[0]
    p2.text = title_text
    p2.font.size = Pt(22)
    p2.font.bold = True
    p2.font.color.rgb = C_TEXT_LIGHT if dark else C_TEXT_DARK

def add_card(slide, left, top, width, height, title, items, badge="", accent_color=C_PRIMARY, dark=False):
    # Background shape
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = C_DARK_CARD if dark else C_LIGHT_CARD
    shape.line.color.rgb = RGBColor(51, 65, 85) if dark else C_BORDER
    shape.line.width = Pt(1)

    # Accent bar at top of card
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, Inches(0.08))
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent_color
    bar.line.fill.background()

    # Content textbox
    tb = slide.shapes.add_textbox(left + Inches(0.3), top + Inches(0.2), width - Inches(0.6), height - Inches(0.35))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

    # Badge if present
    if badge:
        p_badge = tf.paragraphs[0]
        p_badge.text = badge.upper()
        p_badge.font.size = Pt(9.5)
        p_badge.font.bold = True
        p_badge.font.color.rgb = accent_color
        p_title = tf.add_paragraph()
    else:
        p_title = tf.paragraphs[0]

    p_title.text = title
    p_title.font.size = Pt(15)
    p_title.font.bold = True
    p_title.font.color.rgb = C_TEXT_LIGHT if dark else C_TEXT_DARK
    p_title.space_after = Pt(8)

    for item in items:
        p = tf.add_paragraph()
        p.text = f"•  {item}"
        p.font.size = Pt(11)
        p.font.color.rgb = RGBColor(203, 213, 225) if dark else RGBColor(51, 65, 85)
        p.space_after = Pt(4)

def build_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # -------------------------------------------------------------
    # SLIDE 1: COVER
    # -------------------------------------------------------------
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = C_DARK_BG
    bg1.line.fill.background()

    # Decorative emerald bar
    d_bar = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.8), Inches(0.12), Inches(3.2))
    d_bar.fill.solid()
    d_bar.fill.fore_color.rgb = C_EMERALD
    d_bar.line.fill.background()

    tb1 = s1.shapes.add_textbox(Inches(1.2), Inches(1.6), Inches(11.0), Inches(4.0))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p_org = tf1.paragraphs[0]
    p_org.text = "UNIVERSITAS ACHMAD YANI BANJARMASIN"
    p_org.font.size = Pt(12)
    p_org.font.bold = True
    p_org.font.color.rgb = C_EMERALD

    p_t = tf1.add_paragraph()
    p_t.text = "SOSIALISASI & PANDUAN PENGGUNAAN\nE-LEARNING RESMI UAY"
    p_t.font.size = Pt(32)
    p_t.font.bold = True
    p_t.font.color.rgb = C_TEXT_LIGHT
    p_t.space_before = Pt(8)

    p_sub = tf1.add_paragraph()
    p_sub.text = "Panduan Operasional Lengkap: Super Admin · Admin Program Studi · Dosen Pengampu · Mahasiswa"
    p_sub.font.size = Pt(14)
    p_sub.font.color.rgb = RGBColor(148, 163, 184)
    p_sub.space_before = Pt(12)

    p_meta = tf1.add_paragraph()
    p_meta.text = "Tahun Akademik 2026/2027 · Single Sign-On (SSO) Terintegrasi · Dashboard Rektor Live"
    p_meta.font.size = Pt(11)
    p_meta.font.italic = True
    p_meta.font.color.rgb = C_AMBER
    p_meta.space_before = Pt(18)

    # -------------------------------------------------------------
    # SLIDE 2: LATAR BELAKANG & TUJUAN
    # -------------------------------------------------------------
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "Transformasi Pembelajaran Digital Terstandar", "Latar Belakang & Visi Institusi")
    
    add_card(s2, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Satu Pintu Akses (SSO)",
             ["Terintegrasi dengan Akun Resmi Kampus (SSO UAY)",
              "Satu akun terpadu untuk seluruh layanan kampus",
              "Dukungan verifikasi dua faktor (MFA/2FA)",
              "Keamanan akun terlindungi dan tersinkronisasi"],
             badge="Keamanan Terpusat", accent_color=C_PRIMARY)

    add_card(s2, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Akuntabilitas Kehadiran",
             ["Presensi mandiri kode 6-digit & QR Code",
              "Mode layar proyektor interaktif di kelas",
              "Pencatatan izin/sakit dengan catatan surat",
              "Otomatisasi ambang kelayakan ujian 75%"],
             badge="Disiplin Akademik", accent_color=C_BLUE)

    add_card(s2, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Monitoring Real-Time",
             ["Koneksi langsung ke Dashboard Rektor UAY",
              "Isolasi data rapi per program studi",
              "Dukungan pengajaran dosen lintas prodi",
              "Kalkulasi nilai otomatis berbasis bobot mutu"],
             badge="Transparansi Pimpinan", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 3: EKOSISTEM DIGITAL TERPADU
    # -------------------------------------------------------------
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "Topologi Ekosistem Teknologi Informasi UAY", "Arsitektur Terintegrasi")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "1. Akun Kampus Terpadu",
             ["Gerbang masuk resmi universitas",
              "Masuk menggunakan NIM atau Email UAY",
              "Pengenalan peran Mahasiswa & Dosen otomatis",
              "Keluar aman terpadu (Logout)"],
             badge="Satu Pintu Akses", accent_color=C_BLUE)

    add_card(s3, Inches(3.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "2. E-Learning Core",
             ["Manajemen perkuliahan semester",
              "Materi digital, tugas, & kuis 8 tipe",
              "Presensi hibrida proyektor & roster",
              "Buku nilai (Gradebook) otomatis"],
             badge="LMS Core Engine", accent_color=C_PRIMARY)

    add_card(s3, Inches(6.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "3. File Service UAY",
             ["Penyimpanan silabus, PDF & PPT",
              "Streaming video kuliah anti-skip",
              "Pengumpulan tugas berkas dokumen",
              "Kuota & retensi berkas terpusat"],
             badge="Cloud Storage", accent_color=C_AMBER)

    add_card(s3, Inches(9.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "4. Dashboard Rektor",
             ["Snapshot telemetri mingguan",
              "Monitoring keaktifan 4 fakultas & 12 prodi",
              "Rasio kehadiran mahasiswa universitas",
              "Evaluasi mutu pembelajaran berkala"],
             badge="Executive Telemetry", accent_color=C_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 4: MATRIKS 4 PERAN PENGGUNA
    # -------------------------------------------------------------
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "Klasifikasi Peran & Tanggung Jawab Operasional", "Role-Based Access Control")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Super Admin",
             ["Universal Scope seluruh fakultas",
              "Atur kebijakan nilai & tahun ajaran",
              "Kelola master katalog mata kuliah",
              "Sinkronisasi SSO & bridging Rektor"],
             badge="Tingkat Universitas", accent_color=RGBColor(147, 51, 234))

    add_card(s4, Inches(3.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Admin Prodi",
             ["Department Scoped (terisolasi prodi)",
              "Buat rombel kelas semester baru",
              "Tugaskan dosen utama & lintas prodi",
              "Kelola pendaftaran & status mahasiswa"],
             badge="Tingkat Program Studi", accent_color=C_BLUE)

    add_card(s4, Inches(6.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Dosen Pengampu",
             ["Susun pertemuan, silabus & materi",
              "Buka presensi proyektor (kode 6-digit)",
              "Kelola tugas & evaluasi (8 ragam kuis)",
              "Atur bobot gradebook & kloning kelas"],
             badge="Tingkat Kelas", accent_color=C_PRIMARY)

    add_card(s4, Inches(9.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Mahasiswa",
             ["Akses materi kuliah (PDF, slide, video)",
              "Isi presensi mandiri (kode/scan QR)",
              "Kirim berkas tugas & ikuti kuis",
              "Pantau syarat kelayakan ujian >= 75%"],
             badge="Peserta Didik", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 5: SINGLE SIGN-ON (SSO) UAY
    # -------------------------------------------------------------
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Autentikasi Terpadu & Prosedur Masuk Pengguna", "Gerbang Masuk Akun Kampus")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Langkah Masuk Pengguna (Semua Peran)",
             ["1. Buka situs https://e-learning.uay.ac.id",
              "2. Klik tombol utama 'Masuk dengan Akun Kampus (SSO UAY)'",
              "3. Masukkan Email Kampus Resmi / NIM Anda",
              "4. Masukkan Kata Sandi akun kampus Anda",
              "5. Jika diminta: masukkan kode verifikasi SMS/Aplikasi",
              "6. Sistem otomatis mengenali peran Anda dan membuka beranda",
              "Catatan: Cukup satu akun kampus untuk seluruh layanan UAY"],
             badge="Alur Masuk", accent_color=C_PRIMARY)

    add_card(s5, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Keamanan Akun & Tips Operasional",
             ["Satu Akun Kampus: Terhubung langsung data induk universitas",
              "Keluar Bersih (Logout): Selalu klik 'Keluar' pada komputer lab",
              "Reset Kata Sandi: Klik 'Lupa Kata Sandi' atau hubungi TIK",
              "Kenyamanan Sesi: Sesi tetap aktif selama Anda beraktivitas",
              "Keamanan Berlapis: Aktivitas perkuliahan tercatat akuntabel"],
             badge="Protokol Keamanan", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 6: SUPER ADMIN - UNIVERSAL SCOPE & TATA KELOLA
    # -------------------------------------------------------------
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Kendali Sistem Menyeluruh & Kebijakan Kampus", "Peran: Super Administrator")

    add_card(s6, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Universal Scope",
             ["Akses tanpa batas lintas seluruh prodi",
              "Monitoring 4 fakultas & 12 prodi aktif",
              "Pencarian dosen & mahasiswa se-kampus",
              "Pengawasan status akun ACTIVE / DISABLED"],
             badge="Akses Global", accent_color=C_PRIMARY)

    add_card(s6, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Katalog Mata Kuliah",
             ["Master database kurikulum institusi",
              "Pengaturan kode mata kuliah resmi",
              "Penetapan bobot SKS (1–6 SKS)",
              "Pemetaan kepemilikan prodi & kurikulum"],
             badge="Master Data", accent_color=C_BLUE)

    add_card(s6, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Audit Log & Keamanan",
             ["Rekam jejak setiap aksi krusial sistem",
              "Pelacakan pengubahan nilai oleh staf",
              "Pencatatan alamat IP dan timestamp",
              "Pencegahan sengketa data akademik"],
             badge="Security Audit", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 7: SUPER ADMIN - ACADEMIC GOVERNANCE MODAL
    # -------------------------------------------------------------
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Konfigurasi Periode & Standar Skala Mutu Nilai", "Peran: Super Administrator")

    add_card(s7, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Pengaturan Tahun Ajaran Aktif",
             ["Buka tombol 'Kebijakan & Tahun Ajaran' di dashboard",
              "Tentukan semester berjalan (contoh: 2026/2027 Ganjil)",
              "Atur daftar pilihan semester untuk pembuatan kelas",
              "Kunci semester yang telah selesai untuk proteksi arsip",
              "Sinkronisasi label semester dengan kalender universitas"],
             badge="Kalender Akademik", accent_color=C_PRIMARY)

    add_card(s7, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Standar Skala Nilai Huruf Mutu",
             ["Pilih Preset Aktif: 'Standar Akademik UAY 2026/2027'",
              "Skala huruf terstandar: A (85), A- (80), B+ (75), B (70)...",
              "Menjamin keseragaman konversi nilai di seluruh kelas",
              "Tersedia preset historis untuk keperluan arsip lama",
              "Otomatis diterapkan pada seluruh Buku Nilai (Gradebook)"],
             badge="Standar Penilaian", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 8: INTEGRASI DASHBOARD REKTOR
    # -------------------------------------------------------------
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Pemantauan Eksekutif untuk Pimpinan UAY", "Integrasi Dashboard Rektor")

    add_card(s8, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Konektivitas Pemantauan Kampus",
             ["Sinkronisasi otomatis ke Dashboard Rektor UAY",
              "Akses terlindungi khusus pimpinan universitas",
              "Menyajikan ringkasan tanpa mengganggu perkuliahan",
              "Pembaruan data keaktifan kuliah secara waktu nyata",
              "Digunakan oleh Rektorat & Penjaminan Mutu (BPM)"],
             badge="Pemantauan Pimpinan", accent_color=C_BLUE)

    add_card(s8, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Metrik yang Disajikan ke Rektor",
             ["• Total kelas perkuliahan aktif se-kampus",
              "• Total materi kuliah terbit (PDF, Slide, Video)",
              "• Jumlah tugas & kuis yang sedang berlangsung",
              "• Rata-rata persentase presensi kehadiran universitas",
              "• Persentase mahasiswa yang memenuhi syarat ujian"],
             badge="Ringkasan Eksekutif", accent_color=C_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 9: ADMIN PRODI - ISOLASI DATA & PEMBUATAN KELAS
    # -------------------------------------------------------------
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "Pengelolaan Kelas di Tingkat Program Studi", "Peran: Admin Program Studi")

    add_card(s9, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Prinsip Isolasi Data (Department Scoping)",
             ["Admin Prodi hanya dapat melihat data prodi sendiri",
              "Privasi mahasiswa & kurikulum antar-prodi terlindungi",
              "Mencegah kesalahan administrasi lintas fakultas",
              "Satu admin dapat memegang lebih dari satu prodi jika ditugaskan",
              "Data nilai mahasiswa tersimpan aman dan terisolasi"],
             badge="Prinsip Keamanan", accent_color=C_PRIMARY)

    add_card(s9, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Prosedur Pembuatan Kelas Baru",
             ["1. Klik tombol '+ Kelas Baru' di Beranda Admin Prodi",
              "2. Pilih Mata Kuliah dari katalog prodi",
              "3. Tulis Nama Rombel (contoh: IF-201 Kelas A)",
              "4. Pilih Tahun Ajaran aktif (2026/2027 Ganjil)",
              "5. Masukkan kapasitas maksimal mahasiswa",
              "6. Simpan kelas (status awal DRAFT)",
              "7. Terbitkan (PUBLISH) saat perkuliahan dimulai"],
             badge="Alur Pembuatan", accent_color=C_BLUE)

    # -------------------------------------------------------------
    # SLIDE 10: ADMIN PRODI - DOSEN LINTAS PRODI & ENROLLMENT
    # -------------------------------------------------------------
    s10 = prs.slides.add_slide(blank_layout)
    add_header(s10, "Penugasan Pengampu & Pendaftaran Mahasiswa", "Peran: Admin Program Studi")

    add_card(s10, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Penugasan Dosen (Termasuk Lintas Prodi)",
             ["Buka tab 'Peserta & Pengampu' di kelas",
              "Cari dosen berdasarkan Nama atau NIDN",
              "Dosen dari prodi lain dapat dicari dan ditugaskan",
              "Tentukan peran: Dosen Utama atau Team Teaching",
              "Dosen otomatis melihat kelas tersebut di dashboard-nya"],
             badge="Manajemen Dosen", accent_color=C_PRIMARY)

    add_card(s10, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Pendaftaran Mahasiswa (Enrollment)",
             ["Tambah mahasiswa perorangan atau massal via NIM",
              "Pantau kuota kapasitas kelas secara real-time",
              "Fitur Nonaktifkan Peserta (Toggle Status):",
              "• Mahasiswa cuti/mundur dapat dinonaktifkan",
              "• Tidak bisa akses materi baru, namun riwayat tersimpan",
              "• Dapat diaktifkan kembali sewaktu-waktu"],
             badge="Manajemen Mahasiswa", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 11: ADMIN PRODI - MONITORING KESIAPAN PERKULIAHAN
    # -------------------------------------------------------------
    s11 = prs.slides.add_slide(blank_layout)
    add_header(s11, "Pengawasan Kesiapan Kuliah Sebelum Semester Dimulai", "Peran: Admin Program Studi")

    add_card(s11, Inches(0.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Audit Silabus & Draf",
             ["Pantau kelas yang masih DRAFT",
              "Pastikan dosen unggah silabus",
              "Verifikasi materi minggu 1 s.d. 3",
              "Dorong penerbitan kelas tepat waktu"],
             badge="Kesiapan Awal", accent_color=C_PRIMARY)

    add_card(s11, Inches(4.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Monitoring Presensi",
             ["Pantau kelas yang rutin buka sesi",
              "Deteksi kelas dengan presensi rendah",
              "Pastikan aturan 75% disosialisasikan",
              "Bantu dosen jika terjadi kendala"],
             badge="Kedisiplinan", accent_color=C_BLUE)

    add_card(s11, Inches(8.8), Inches(1.8), Inches(3.6), Inches(5.0),
             "Pelaporan Akademik",
             ["Unduh rekapitulasi presensi prodi",
              "Verifikasi nilai sebelum tutup semester",
              "Cetak Berita Acara Perkuliahan (BAP)",
              "Laporan berkala ke Ketua Program Studi"],
             badge="Pelaporan Mutu", accent_color=C_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 12: DOSEN - DASHBOARD & GRADING QUEUE
    # -------------------------------------------------------------
    s12 = prs.slides.add_slide(blank_layout)
    add_header(s12, "Ruang Kerja Utama Pengajaran Dosen", "Peran: Dosen Pengampu")

    add_card(s12, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Dashboard Dosen & Filter Multi-Prodi",
             ["Daftar seluruh kelas aktif yang diampu semester ini",
              "Filter Program Studi: Mempermudah dosen lintas prodi",
              "Kartu ringkasan: jumlah peserta, progres silabus",
              "Akses cepat ke tab Presensi dan Buku Nilai",
              "Notifikasi pengumuman dan pesan akademik"],
             badge="Dashboard Pengajar", accent_color=C_PRIMARY)

    add_card(s12, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Antrean Penilaian (Grading Queue)",
             ["Menampilkan tugas mahasiswa yang menunggu dinilai",
              "Menampilkan kuis bertipe Esai yang perlu koreksi",
              "Indikator tenggat waktu pengumpulan",
              "Klik langsung untuk membuka lembar koreksi tugas",
              "Memastikan penilaian dosen tepat waktu"],
             badge="Grading Queue", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 13: DOSEN - PERTEMUAN & 4 FORMAT MATERI
    # -------------------------------------------------------------
    s13 = prs.slides.add_slide(blank_layout)
    add_header(s13, "Pengorganisasian Pertemuan & Konten Digital", "Peran: Dosen Pengampu")

    add_card(s13, Inches(0.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Dokumen (PDF/DOC)",
             ["Untuk silabus perkuliahan",
              "Modul & panduan praktikum",
              "Pratinjau langsung di web",
              "Pencatatan halaman dibaca"],
             badge="Bahan Ajar", accent_color=C_PRIMARY)

    add_card(s13, Inches(3.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Slide (PPT/PPTX)",
             ["Salindia materi kuliah",
              "Navigasi slide interaktif",
              "Dukungan fullscreen",
              "Pelacakan pemahaman slide"],
             badge="Presentasi", accent_color=C_BLUE)

    add_card(s13, Inches(6.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Video Kuliah",
             ["Streaming rekaman kuliah",
              "Anti-Skip Tracker (waktu nyata)",
              "Melompati linimasa dicegah",
              "Syarat tuntas sebelum unduh"],
             badge="Video Interaktif", accent_color=C_AMBER)

    add_card(s13, Inches(9.8), Inches(1.8), Inches(2.7), Inches(5.0),
             "Lainnya (Resource)",
             ["Dataset praktikum",
              "Source code & tautan GitHub",
              "Tautan referensi eksternal",
              "Lampiran materi pendukung"],
             badge="Ekstra Bahan", accent_color=C_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 14: DOSEN - PRESENSI LAYAR PROYEKTOR
    # -------------------------------------------------------------
    s14 = prs.slides.add_slide(blank_layout)
    add_header(s14, "Presensi Mandiri Interaktif di Ruang Kuliah", "Fitur Unggulan Presensi")

    add_card(s14, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Langkah Membuka Presensi Proyektor",
             ["1. Buka kelas Anda -> Masuk ke tab 'Presensi'",
              "2. Klik tombol 'Buka Sesi Presensi Baru'",
              "3. Masukkan judul (contoh: Pertemuan 5 - Basis Data)",
              "4. Pilih durasi aktif (15 / 30 / 60 Menit)",
              "5. Klik 'Buka Presensi Sekarang'",
              "6. Proyeksikan layar laptop ke proyektor kelas!",
              "Mahasiswa langsung melihat Kode 6-Digit & QR Code"],
             badge="Alur Operasional", accent_color=C_PRIMARY)

    add_card(s14, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Komponen Mode Layar Proyektor",
             ["• Kode 6-Digit Raksasa (contoh: 4 1 8 9 2 0)",
              "• QR Code Dinamis: Siap dipindai kamera ponsel",
              "• Countdown Timer: Penghitung mundur waktu aktif",
              "• Live Counter: Jumlah mahasiswa hadir secara realtime",
              "• Keamanan: Kode otomatis kadaluarsa setelah durasi habis"],
             badge="Tampilan Proyektor", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 15: DOSEN - ROSTER MANUAL & TANDAI SEMUA HADIR
    # -------------------------------------------------------------
    s15 = prs.slides.add_slide(blank_layout)
    add_header(s15, "Koreksi Presensi Manual & Penanganan Izin/Sakit", "Fitur Presensi Dosen")

    add_card(s15, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Lembar Presensi (Roster) Manual",
             ["Gunakan jika mahasiswa terkendala gawai/baterai",
              "Pilihan Status: Hadir, Izin, Sakit, atau Alfa",
              "Kolom Catatan: Masukkan nomor surat izin/sakit dokter",
              "Status Izin resmi tetap dihitung dalam persentase kelayakan",
              "Setiap koreksi tersimpan aman dalam audit log kelas"],
             badge="Koreksi Manual", accent_color=C_BLUE)

    add_card(s15, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Tombol Cepat 'Tandai Semua Hadir'",
             ["Pada kelas tatap muka yang dihadiri seluruh mahasiswa:",
              "1. Klik tombol 'Tandai Semua Hadir' sekali klik",
              "2. Seluruh status Alfa otomatis berubah menjadi Hadir",
              "3. Ubah 1-2 mahasiswa yang berhalangan menjadi Izin/Sakit",
              "4. Klik 'Simpan Presensi'",
              "Menghemat waktu dosen tanpa perlu klik satu per satu"],
             badge="Aksi Efisien", accent_color=C_EMERALD)

    # -------------------------------------------------------------
    # SLIDE 16: DOSEN - TUGAS, KUIS & 8 TIPE SOAL
    # -------------------------------------------------------------
    s16 = prs.slides.add_slide(blank_layout)
    add_header(s16, "Evaluasi Pembelajaran: Tugas & Mesin Kuis Canggih", "Peran: Dosen Pengampu")

    add_card(s16, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Pengelolaan Tugas Kuliah",
             ["Tenggat Waktu (Due Date) & Batas Toleransi (Cut-off Date)",
              "Rubrik penilaian transparan bagi mahasiswa",
              "Dukungan berkas PDF, DOCX, ZIP, atau Google Drive link",
              "Koreksi berkas & masukan kualitatif per mahasiswa",
              "Nilai tugas otomatis masuk ke Buku Nilai (Gradebook)"],
             badge="Penugasan", accent_color=C_PRIMARY)

    add_card(s16, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "8 Ragam Tipe Soal Kuis & Ujian",
             ["1. Pilihan Ganda Tunggal    5. Menjodohkan",
              "2. Pilihan Ganda Kompleks   6. Mengurutkan",
              "3. Benar / Salah            7. Esai Terbuka",
              "4. Isian Singkat            8. Unggah Berkas",
              "Fitur Unggulan: Bank Soal & Impor Massal via Excel!",
              "4 Mode Hasil: AUTO, HIDDEN, MANUAL, SCHEDULED"],
             badge="Mesin Evaluasi", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 17: DOSEN - GRADEBOOK & KLONING KELAS
    # -------------------------------------------------------------
    s17 = prs.slides.add_slide(blank_layout)
    add_header(s17, "Buku Nilai Otomatis & Efisiensi Semester Baru", "Peran: Dosen Pengampu")

    add_card(s17, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Buku Nilai (Gradebook) Otomatis",
             ["Atur bobot kategori (total wajib 100%):",
              "• Presensi Kehadiran (10%)",
              "• Tugas & Praktikum (20%)",
              "• Kuis (15%) · UTS (25%) · UAS (30%)",
              "Kalkulasi nilai otomatis ke Huruf Mutu UAY (A - E)",
              "Ekspor nilai akhir ke CSV untuk berkas BAP"],
             badge="Gradebook", accent_color=C_PRIMARY)

    add_card(s17, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Fitur Kloning Kelas Semester Baru",
             ["Duplikasi materi tanpa mengetik ulang dari awal:",
              "• Seluruh silabus, materi & kuis disalin ke Draf Bersih",
              "• Jadwal tugas & kuis otomatis di-reset",
              "• Mahasiswa kelas lama TIDAK diikutsertakan",
              "Mempersiapkan semester baru hanya dalam 2 menit!"],
             badge="Kloning Cerdas", accent_color=C_BLUE)

    # -------------------------------------------------------------
    # SLIDE 18: MAHASISWA - BERANDA & AGENDA
    # -------------------------------------------------------------
    s18 = prs.slides.add_slide(blank_layout)
    add_header(s18, "Ruang Belajar Mandiri Mahasiswa", "Peran: Mahasiswa")

    add_card(s18, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Beranda Pembelajaran Mahasiswa",
             ["Kartu Mata Kuliah Aktif semester berjalan",
              "Informasi Dosen Pengampu & Bobot SKS",
              "Persentase progres belajar setiap mata kuliah",
              "Pemberitahuan materi baru dan pengumuman dosen",
              "Akses mudah via laptop maupun ponsel pintar"],
             badge="Beranda Belajar", accent_color=C_PRIMARY)

    add_card(s18, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Agenda & Tenggat Waktu Terpusat",
             ["Daftar seluruh tugas & kuis dari semua mata kuliah",
              "Disusun urut waktu mendekati batas pengumpulan",
              "Membantu mahasiswa mengatur waktu belajar",
              "Peringatan tugas yang belum dikumpulkan",
              "Menghindari keterlambatan pengumpulan tugas"],
             badge="Time Management", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 19: MAHASISWA - PRESENSI MANDIRI & BELAJAR MATERI
    # -------------------------------------------------------------
    s19 = prs.slides.add_slide(blank_layout)
    add_header(s19, "Cara Mahasiswa Mengisi Presensi & Belajar Materi", "Peran: Mahasiswa")

    add_card(s19, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Alur Presensi Mandiri (Kode 6-Digit)",
             ["1. Buka mata kuliah saat sesi dimulai di kelas",
              "2. Klik banner 'Presensi Sedang Dibuka'",
              "3. Masukkan 6 Digit Kode di layar proyektor dosen",
              "   (atau scan QR code menggunakan kamera ponsel)",
              "4. Klik 'Kirim Presensi Sekarang'",
              "5. Konfirmasi lencana hijau HADIR langsung muncul!"],
             badge="Presensi Mandiri", accent_color=C_PRIMARY)

    add_card(s19, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Mempelajari Materi & Syarat Unduh",
             ["• Dokumen PDF: Baca langsung di penampil terintegrasi",
              "• Slide Presentasi: Navigasi halaman demi halaman",
              "• Video Kuliah: Tonton utuh (Anti-skip mendeteksi waktu nyata)",
              "• Tombol Unduh: Terbuka otomatis setelah progres 100%",
              "Semua aktivitas belajar tercatat untuk evaluasi dosen"],
             badge="Progres Belajar", accent_color=C_BLUE)

    # -------------------------------------------------------------
    # SLIDE 20: MAHASISWA - TUGAS & KUIS ONLINE
    # -------------------------------------------------------------
    s20 = prs.slides.add_slide(blank_layout)
    add_header(s20, "Pengumpulan Tugas & Pengerjaan Ujian Daring", "Peran: Mahasiswa")

    add_card(s20, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Pengumpulan Tugas Kuliah",
             ["Buka item tugas pada pertemuan terkait",
              "Perhatikan Due Date & Cut-off Date",
              "Unggah berkas dokumen (PDF, DOCX, ZIP)",
              "Dukungan tautan Google Drive / GitHub jika diminta",
              "Dapat memperbarui berkas sebelum batas waktu berakhir",
              "Lihat nilai & catatan koreksi dosen di halaman tugas"],
             badge="Pengumpulan Tugas", accent_color=C_PRIMARY)

    add_card(s20, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Mengerjakan Kuis & Ujian (UTS/UAS)",
             ["Fitur Auto-Save: Jawaban tersimpan otomatis di server",
              "Aman dari gangguan koneksi internet sementara",
              "Penghitung waktu mundur (Timer) di sudut layar",
              "Navigasi nomor soal untuk cek jawaban belum terisi",
              "Klik 'Kumpulkan & Selesaikan' setelah selesai",
              "Nilai instan atau diumumkan sesuai jadwal dosen"],
             badge="Ujian Online", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 21: REGULASI KEHADIRAN 75%
    # -------------------------------------------------------------
    s21 = prs.slides.add_slide(blank_layout)
    add_header(s21, "Ketentuan Wajib Kehadiran Minimal 75%", "Regulasi Akademik UAY")

    add_card(s21, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Aturan Kelayakan Ujian (UTS/UAS)",
             ["Wajib hadir minimal 75% dari total pertemuan tatap muka",
              "Ketidakhadiran alfa maksimal 25% (sekitar 3-4 pertemuan)",
              "Mahasiswa < 75% TIDAK BERHAK mengikuti UTS / UAS",
              "Sistem otomatis memberikan lencana status kelayakan:",
              "• Lencana Hijau: Memenuhi Syarat Ujian (>= 75%)",
              "• Lencana Merah: Peringatan Belum Memenuhi Syarat (< 75%)"],
             badge="Ketentuan Pokok", accent_color=RGBColor(220, 38, 38))

    add_card(s21, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Prosedur Izin & Sakit Resmi",
             ["Jika sakit atau izin dinas universitas:",
              "1. Serahkan surat keterangan dokter / dinas ke dosen",
              "2. Dosen mencatat di Roster Manual beserta nomor surat",
              "3. Status Sakit/Izin resmi diakui dalam persentase kelayakan",
              "4. Cek berkala tab Presensi Anda untuk memastikan pembaruan",
              "Segera hubungi dosen pengampu jika status Anda merah!"],
             badge="Dispensasi", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 22: SKALA NILAI MUTU UAY 2026/2027
    # -------------------------------------------------------------
    s22 = prs.slides.add_slide(blank_layout)
    add_header(s22, "Standar Skala Penilaian Huruf Mutu Institusi", "Kebijakan Penilaian UAY")

    add_card(s22, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Tabel Rentang Huruf Mutu (Preset 2026.1)",
             ["• Nilai >= 85.00  :  A   (Bobot 4.00) - Istimewa",
              "• 80.00 - 84.99   :  A-  (Bobot 3.75) - Sangat Baik",
              "• 75.00 - 79.99   :  B+  (Bobot 3.50) - Baik Sekali",
              "• 70.00 - 74.99   :  B   (Bobot 3.00) - Baik",
              "• 65.00 - 69.99   :  B-  (Bobot 2.75) - Cukup Baik",
              "• 60.00 - 64.99   :  C+  (Bobot 2.50) - Cukup",
              "• 55.00 - 59.99   :  C   (Bobot 2.00) - Batas Lulus",
              "• 45.00 - 54.99   :  D   (Bobot 1.00) - Kurang",
              "• < 45.00         :  E   (Bobot 0.00) - Mengulang"],
             badge="Rentang Skor", accent_color=C_PRIMARY)

    add_card(s22, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Rumus Nilai Akhir Semester",
             ["Kalkulasi otomatis oleh E-Learning:",
              "Nilai Akhir = Σ (Bobot Kategori x Rata-rata Skor)",
              "Total seluruh bobot kategori wajib tepat 100%",
              "Komponen dinilai secara transparan:",
              "Kehadiran + Tugas/Praktikum + Kuis + UTS + UAS",
              "Nilai dapat dipantau langsung mahasiswa di tab Nilai"],
             badge="Formula Nilai", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 23: FAQ & SOLUSI KENDALA PENGGUNAAN
    # -------------------------------------------------------------
    s23 = prs.slides.add_slide(blank_layout)
    add_header(s23, "Pertanyaan Umum & Solusi Pemecahan Masalah", "Tanya Jawab Cepat")

    add_card(s23, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Kendala Presensi & Materi",
             ["Q: Kode presensi ditolak / kadaluarsa?",
              "A: Pastikan jam gawai sinkron internet. Minta dosen catat di Roster manual jika sesi ditutup.",
              "",
              "Q: Tombol unduh materi abu-abu?",
              "A: Tonton video / baca dokumen hingga 100%. Tombol unduh otomatis aktif setelah syarat terpenuhi."],
             badge="Presensi & Materi", accent_color=C_PRIMARY)

    add_card(s23, Inches(6.8), Inches(1.8), Inches(5.6), Inches(5.0),
             "Kendala Akun & Ujian",
             ["Q: Lupa kata sandi login?",
              "A: Buka sso.uay.ac.id -> klik Lupa Kata Sandi atau email ke sso-admin@uay.ac.id.",
              "",
              "Q: Internet putus saat kuis online?",
              "A: Jawaban Anda auto-save. Cukup refresh browser saat internet kembali menyala dan lanjutkan kuis."],
             badge="Akun & Evaluasi", accent_color=C_AMBER)

    # -------------------------------------------------------------
    # SLIDE 24: PUSAT BANTUAN & PENUTUP
    # -------------------------------------------------------------
    s24 = prs.slides.add_slide(blank_layout)
    bg24 = s24.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg24.fill.solid()
    bg24.fill.fore_color.rgb = C_DARK_BG
    bg24.line.fill.background()

    add_header(s24, "Layanan Terpadu & Sesi Tanya Jawab (Q&A)", "Pusat Bantuan & Helpdesk", dark=True)

    add_card(s24, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Saluran Bantuan Resmi UAY",
             ["Helpdesk Akademik E-Learning:",
              "• Email: elearning-support@uay.ac.id",
              "• Jam Layanan: Senin – Jumat (08.00 – 16.00 WITA)",
              "",
              "Layanan Akun & SSO Kampus:",
              "• Email: sso-admin@uay.ac.id",
              "",
              "Layanan Fisik TIK:",
              "• Gedung Rektorat UAY Lantai 2, Kampus Terpadu"],
             badge="Helpdesk TIK", accent_color=C_EMERALD, dark=True)

    add_card(s24, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.8),
             "Pusat Bantuan Mandiri (Help Center)",
             ["Akses langsung melalui menu Bantuan (/help)",
              "Menyediakan lebih dari 50 Artikel Panduan Mandiri",
              "Pencarian cerdas solusi kendala teknis",
              "",
              "MARI SUKSESKAN PEMBELAJARAN DIGITAL UAY!",
              "Terima Kasih atas Partisipasi Bapak/Ibu & Mahasiswa",
              "Sesi Pertanyaan & Diskusi Dibuka"],
             badge="Terima Kasih", accent_color=C_AMBER, dark=True)

    prs.save(str(OUT_PPTX))
    print(f"PowerPoint Presentation generated: {OUT_PPTX} (24 slides)")
    
    # Copy to root Project and dedicated Panduan directory
    PANDUAN_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(OUT_PPTX, PROJECT_ROOT / "Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx")
    shutil.copy2(OUT_PPTX, PANDUAN_DIR / "Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx")
    print(f"Copied PPTX to {PANDUAN_DIR} and {PROJECT_ROOT}")

if __name__ == "__main__":
    build_presentation()
