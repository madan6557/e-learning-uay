# Bahan panduan E Learning UAY

Edisi 7 Oktober 2026 mencakup Mahasiswa, Dosen, Admin Prodi, Super Admin, dan Rektor. Isi tutorial bersumber dari `apps/web/src/data/helpGuide.json`.

Menu **Bantuan → Buka buku panduan (tab baru)** membuka `/Panduan/panduan.html`. Halaman memerlukan sesi akun kampus, menampilkan bagian sesuai peran, dan tidak memiliki checklist atau kotak centang. Pencarian, daftar isi, dan cetak tersedia. Parameter `role` pada alamat halaman tidak mengubah isi yang diizinkan.

`panduan.html` dalam paket dokumen menyediakan tautan ke panduan aplikasi yang mengikuti sesi, serta ke buku dan slide yang dapat dibaca tanpa aplikasi. Buku dan slide memuat seluruh peran. Angka dan tanggal pada gambar adalah contoh.

## Berkas yang diperbarui

- Buku Panduan Penggunaan E-Learning UAY.docx dan versi PDF
- Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx dengan 28 slide
- BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md
- SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html
- panduan.html sebagai halaman pembuka paket dokumen

Materi rektor menjelaskan akses satu pintu, laporan hanya baca, filter, kondisi data terakhir, grafik harian 24 jam, rentang masuk dan keluar yang tercatat, progres penilaian, waktu lokal, serta CSV/PDF. Presensi, forum, dan telekonferensi belum tersedia sebagai sumber laporan rektor. E-learning tetap menyediakan fitur presensi untuk dosen dan mahasiswa.

## Pemeliharaan untuk pengembang

1. Ubah sumber tutorial aplikasi, lalu jalankan `npm run docs:guide` dan `npm run docs:guide:check`.
2. Bangun Word menggunakan `scripts/generate_guide_docx.py` dengan Python dari workspace dependencies Codex. Skala nilai berasal dari `docs/guides/guide-grade-scales.json`, yang diekspor dari definisi aplikasi.
3. Render Word memakai `render_docx.py --emit_pdf` dari skill Documents; periksa seluruh halaman sebelum mengganti Word/PDF yang dibagikan.
4. Bangun slide menggunakan `scripts/generate-guide-slides.mjs` dengan Node dan Artifact Tool dari workspace dependencies Codex. Tetapkan `UAY_ARTIFACT_NODE_MODULES`, lalu berikan direktori kerja sementara absolut sebagai argumen. Generator memperbarui 24 slide utama dan 4 slide rektor; sumber dapat berupa deck 24 atau 28 slide.
5. Validasi PPT dengan finalizer skill Presentations dan periksa seluruh slide sebelum mengganti PPT yang dibagikan. Presentasi HTML diekspor dari isi slide yang sama.
6. Jalankan `npm run qa:catalog`, `npm run qa:run`, `npm run qa:test`, serta build aplikasi. Hasil manual tetap terpisah dari bukti otomatis.
7. Setelah dokumen final diverifikasi, salin paket melalui `scripts/build_panduan_folder.py --output <folder tujuan>`. Skrip ini hanya menyalin hasil final, tanpa membuat ulang konten lama.

Kontak bantuan mengikuti petugas akademik program studi atau pengelola akun kampus. Paket ini tidak menetapkan alamat surel, jam layanan, atau kebijakan akademik yang belum dikonfirmasi.
