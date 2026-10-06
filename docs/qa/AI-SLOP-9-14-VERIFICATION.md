# Verifikasi perbaikan temuan 9–14

Tanggal: 6 Oktober 2026. Cakupan: workspace lokal, termasuk integrasi Bantuan yang sudah ada. Perubahan sebelumnya dipertahankan; tidak ada deployment.

## Hasil per temuan

| Temuan | Perbaikan | Bukti |
| --- | --- | --- |
| 9 — Kontrol klik tanpa akses keyboard | Kartu Bantuan, kartu kebijakan, dan hasil pencarian dosen memakai tombol HTML. Pilihan dosen menyatakan status melalui `aria-pressed`. Detail Bantuan memfokuskan judul dan mengembalikan fokus ke kartu asal saat kembali. | Browser: Enter dan Space membuka kartu; Enter memilih dosen dan Space membatalkannya. Tes HelpPage produksi memeriksa perpindahan fokus, filter role, detail, dan gambar. |
| 10 — CSS bertumpuk dan aturan demo mati | Header memiliki satu definisi dasar dan satu penyesuaian seluler di `experience.css`: 56 px desktop, 60 px seluler. Aturan demo tanpa pemakai dihapus. Override komponen memakai specificity yang sesuai. | Build CSS lulus. Browser pada 1440×1000 dan 390×844 mengukur tinggi header sesuai aturan dan tidak menemukan overflow horizontal. Menu seluler terbuka melalui Enter; Escape menutupnya dan mengembalikan fokus. |
| 11 — Tes menguji logika salinan | Tes isolasi prodi dan rector bridge dipindahkan menjadi tes integrasi yang menjalankan `createApp()`, endpoint HTTP, sesi autentikasi, dan PostgreSQL `_test`. Pemetaan QA diarahkan ke tes baru. Tes presensi produksi dari perbaikan sebelumnya tetap dipakai. | Suite integrasi lulus. Pencarian identitas memeriksa cakupan IF, IF/SI, Super Admin, akun nonaktif, Admin Prodi tanpa cakupan, dan penolakan mahasiswa. Rector bridge memeriksa token salah/kosong, kedua header token, sesi mahasiswa/Super Admin, serta data snapshot dari fixture database. |
| 12 — Definisi ganda dan kode tidak terpakai | Skala nilai tetap memakai `GRADE_SCALE_PRESETS` bersama pada kalkulasi, UI, Bantuan, dan ekspor panduan. Komponen SVG `UayLogo.tsx` yang tidak diimpor dihapus; logo PNG yang dipakai tetap tersedia. DTO kartu kelas, pencarian dosen, pengaturan akademik, role Bantuan, dan item snapshot diberi tipe. | Build TypeScript web/API lulus. Tes batas skala dan panduan lulus. Pemeriksaan referensi dilakukan sebelum penghapusan komponen logo. |
| 13 — Ikon kelas tidak mewakili isi | Semua kartu kelas memakai ikon buku, tanpa memilih ikon kode/database/terminal menurut posisi daftar. | DOM dashboard mahasiswa memperlihatkan `lucide-book-open` pada kedua kartu kelas. |
| 14 — Petunjuk dan dokumentasi berbeda dari aplikasi | Bantuan memakai tutorial sesuai role tanpa checklist. Satu panduan Markdown utama diekspor dari data Bantuan dan skala produksi; dokumen operasional menjadi tautan pengarah. Generator Markdown lama menjadi wrapper exporter yang sama. Istilah presensi diselaraskan menjadi kode 6 karakter pada aplikasi, importer, dan panduan. README menjelaskan sumber panduan, perintah pemeriksaan, jumlah katalog QA, dan autentikasi rector bridge. | `docs:guide:check` lulus. Browser memeriksa empat role; pencarian S3 pada akun mahasiswa tidak menghasilkan artikel. Tes menolak istilah PIN/6-digit pada teks yang dibaca pengguna dan memeriksa 33 gambar PNG serta 171 langkah. |

Enam penggunaan `!important` dipertahankan untuk pengurangan animasi dan tampilan cetak. Pengetikan dan pemindahan style difokuskan pada alur yang diubah; penggunaan `any` atau inline style pada bagian lain tidak dinyatakan telah dihapus seluruhnya. Jumlah kemunculannya sendiri bukan bukti kesalahan fungsi.

## Masalah produksi yang ditemukan oleh tes baru

- Admin Prodi tanpa `departmentScopes` sebelumnya dapat mencari identitas secara global. Endpoint `/users` kini mengembalikan daftar kosong untuk akun tersebut. Akun mahasiswa tetap ditolak.
- Token rector bridge yang benar sebelumnya terhalang middleware login browser. Endpoint baca snapshot kini memiliki autentikasi khusus sebelum middleware sesi global; penerimaan token hanya berlaku pada endpoint tersebut. Token wajib berasal dari `RECTOR_BRIDGE_TOKEN`, tanpa fallback secret SSO atau nilai bawaan.
- Pengambilan 50 sesi dosen sebelumnya tidak memiliki urutan. Query kini memakai `lastLoginAt` terbaru terlebih dahulu, dengan ID sebagai urutan tambahan, agar batas tersebut tidak melewatkan sesi terbaru secara acak.

## Pengujian

- `npm run build`: Prisma, TypeScript API/web, dan Vite lulus.
- `npm test`: 47 tes lulus. Lima tes lama yang menguji salinan logika telah diganti dengan delapan tes integrasi, termasuk parent suite.
- Tes integrasi produksi pada database `_test`: 53 tes lulus, termasuk perubahan kebijakan, presensi, waktu, metadata berkas, File Service, isolasi prodi, dan rector bridge.
- `npm run qa:build` dan `npm run qa:test`: build portal lulus; 8 tes portal lulus.
- `npm run qa:run`: 143 kasus katalog lulus, 0 gagal, 0 terblokir, 186 belum diuji otomatis. Suite domain dan integrasi masing-masing exit 0; tidak ada regresi tambahan yang gagal. Katalog berisi 329 kasus.
- `npm run docs:guide:check` dan `git diff --check`: lulus.

Run QA: `bfe21569-f47e-4981-9c31-cf402afc62c2`, selesai `2026-10-06T03:06:05.116Z`. Hasil terstruktur tersedia pada `apps/qa/public/reports/latest.json`; ringkasan yang dihasilkan runner berada pada `docs/qa/AUTOMATED-RESULTS.md`. Perubahan fokus Bantuan setelah run tersebut diperiksa melalui tes HelpPage produksi dan browser, kemudian build/tes utama terakhir dijalankan kembali.

## Pemeriksaan browser

Fixture lokal yang dipakai: Admin UAY (Super Admin), Admin Prodi Informatika, Dosen M.Kom., dan Mahasiswa 02. Tidak ada kelas atau pengaturan akademik yang disimpan melalui pemeriksaan UI. Pemilihan dosen hanya diuji pada formulir yang kemudian ditutup tanpa mengirim perubahan.

Super Admin dapat membuka kontrol pengaturan. Admin Prodi melihat field pengaturan dalam keadaan disabled dan tidak memiliki tombol simpan. Bantuan menampilkan 20 artikel untuk Super Admin, 18 untuk Admin Prodi, 31 untuk dosen, dan 20 untuk mahasiswa, termasuk solusi kendala dan konversi nilai sesuai role. Mahasiswa tidak memperoleh kategori administrasi/universitas.

Bukti lokal:

- `.local/verification/ai-slop-9-14-desktop.jpg`: detail Bantuan dibuka dengan keyboard.
- `.local/verification/ai-slop-9-14-mobile.jpg`: dashboard pada viewport 390×844.
- `.local/verification/ai-slop-9-14-student.jpg`: daftar Bantuan mahasiswa sesuai role.
- `.local/verification/ai-slop-9-14-student-final.jpg`: petunjuk kode 6 karakter tanpa checklist, dengan fokus pada judul artikel.

Viewport sementara sudah dikembalikan, akun fixture sudah keluar, dan tab verifikasi ditutup. Gambar tutorial tetap berasal dari panduan sumber; contoh data dan beberapa label pada tangkapan layar lama bukan hasil rekam ulang semua kontrol aplikasi sekarang. Ekspor Word/PDF/PowerPoint dan layanan kampus nyata tidak termasuk bukti run ini.
