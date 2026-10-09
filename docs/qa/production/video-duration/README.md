# Durasi video otomatis dan draf opsional

Verifikasi 9 Oktober 2026 pada `elearning_visual_test`, melalui SSO mode uji. Perubahan ini menindaklanjuti kolom durasi manual dan editor yang terkunci ketika ada draf pemulihan.

## Perilaku akhir

- Editor membaca durasi MP4/WebM dari metadata media dan YouTube melalui IFrame Player API. Tidak ada input durasi manual atau angka pengganti 300 detik. Durasi harus terbaca sebelum materi video disimpan; kegagalan memiliki pesan dan aksi baca ulang. Ambang tonton tetap dapat diatur dosen.
- Progres mengikuti posisi pemutaran nyata, interval, jeda, dan akhir video. Persentase berasal dari jawaban server; gagal simpan mempertahankan persentase terakhir dan menyediakan retry. Waktu yang ditonton dan durasi total juga tampil, termasuk persentase pecahan untuk video panjang.
- API tetap membatasi progres dengan durasi materi yang tersimpan dan wewenang mahasiswa peserta. Mahasiswa tidak dapat mengganti durasi lewat endpoint progres. Koreksi durasi menghitung ulang persentase secara transaksi; penggantian sumber menghapus progres video lama. Variasi tautan YouTube untuk video yang sama mempertahankan progres.
- Tautan halaman/embed yang tidak menyediakan metadata pemutar, seperti Google Drive, diarahkan ke materi Tautan referensi. Siaran langsung diarahkan ke Pertemuan daring. Materi lama dengan durasi manual yang salah perlu dibuka dan disimpan ulang oleh pengelola materi; pembaca menampilkan alasan jika durasi berbeda.
- Draf pemulihan tidak mengunci isian, aksi, penyimpanan, pengumuman, atau impor. Pemulihan opsional. Mulai mengisi data baru memilih isian saat ini sebagai draf aktif; autosave tetap berfungsi. Penguncian hanya berlaku saat permintaan sedang diproses atau syarat fitur belum terpenuhi.
- Setelah server mengonfirmasi simpan, draf lokal dihapus. Gagal simpan mempertahankan isian. Materi, kuis, tugas, pengumuman, dan editor lain dengan `updatedAt` membandingkan versi server saat dibuka. Draf versi lama dibersihkan; draf legacy tanpa penanda versi menggunakan waktu pembaruan server jika tersedia. Formulir baru tanpa versi server tetap menawarkan pemulihan opsional.
- Pembersihan draf usang memeriksa timestamp record agar tidak menghapus draf baru yang ditulis setelah pembacaan. Tombol pemulihan/pembuangan tidak dapat mengubah isian di tengah penyimpanan server.

Pembacaan media mengikuti [metadata HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/loadedmetadata_event) dan [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference). Sumber YouTube tidak memakai pencarian substring hostname; CSP mengizinkan script pemutar dan iframe privasi YouTube. Konfigurasi grace tetap mengikuti pengaturan sebelumnya.

## Bukti browser

[Pengukuran DOM](checks.json) memuat editor pada 1440, 768, 390, dan 320 px tanpa overflow halaman. Input angka yang tersisa adalah **Tonton minimal (%)**. [Konsol](browser-console.json) tidak merekam warning/error.

| Alur | Hasil dan bukti |
| --- | --- |
| Unggah rekaman MP4 | Durasi 5 detik terbaca otomatis, tersimpan setelah server mengonfirmasi. [Desktop](editor-upload-1440.jpg), [tablet](editor-upload-768.jpg), [ponsel](editor-upload-390.jpg), [320 px](editor-upload-320.jpg) |
| Menonton sebagai mahasiswa | Video dimainkan sampai akhir melalui kontrol asli; progres mencapai 100%, bertahan setelah reload, restart lokal, dan login kembali. [Progres tersimpan](student-progress-100-390.jpg) |
| YouTube | Metadata video contoh terbaca 5:08:48; data demo lama 300 detik dikoreksi. Pemutaran, jeda, dan reload mempertahankan progres 0,58% / sekitar 1:49; tidak ada tombol selesai manual. [YouTube ponsel](youtube-progress-390.jpg) |
| Draf pemulihan | Editor tetap memiliki isian dan tombol aktif sebelum pemulihan. [Draf opsional ponsel](draft-optional-390.jpg) |

Rekaman pendek dan akun adalah fixture lokal, tidak dikirim ke layanan kampus. Progres YouTube diuji sebagian; tidak diklaim menonton video 5 jam sampai selesai.

## Regresi dan batas

- `tests/video.test.ts`: sumber yang dapat dilacak, metadata nonfinite, HTML media, YouTube, pergantian sumber, kegagalan metadata, retry progres, dan ketidaksesuaian durasi.
- `tests/integration/learning.test.ts`: wewenang, koreksi persentase, pergantian sumber, alias sumber yang sama, sumber tidak didukung, dan durasi tidak tersedia. Data video tambahan dibersihkan agar tidak mengubah perhitungan suite akademik lain.
- `tests/drafts.test.ts` dan `tests/form.test.ts`: pemulihan opsional, autosave isian baru, pembersihan setelah simpan, versi server terbaru, draft legacy, perlindungan terhadap race pembersihan, serta penguncian hanya ketika simpan sedang berlangsung.
- Build penuh, typecheck, panduan, 115 tes unit, 176 domain/UI + 133 integrasi, dan audit 0 kerentanan lulus. [Report otomatis](../../../../apps/qa/public/reports/latest.json) mencatat run dan batas pemetaan katalog.

Penerimaan SSO/File Service kampus, Redis multi-instance, backup/restore, dan pilot 50 mahasiswa tetap mengikuti [gate staging](../../PRODUCTION-READINESS.md). Hasil lokal ini bukan pengganti penerimaan tersebut.
