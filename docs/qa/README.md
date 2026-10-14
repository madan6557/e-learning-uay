# Portal pengujian E-Learning UAY

Portal interaktif lokal: **http://127.0.0.1:5174/**. Jalankan dari root workspace:

```powershell
npm run qa
```

Untuk menjalankan E-Learning yang diuji pada terminal lain:

```powershell
npm run dev
```

Portal dapat dibuka tanpa E-Learning aktif. Pengujian HTTP otomatis membutuhkan PostgreSQL lokal aktif; menggunakan database terpisah dengan nama berakhiran `_test`. Aplikasi dan database perkuliahan tidak direset.

Tema portal dapat diganti kapan saja melalui tombol bulan/matahari di kanan atas. Pilihan terang atau gelap tersimpan di browser yang digunakan.

## Menguji manual

1. Buka **Pengaturan sesi**, isi nama penguji, URL staging/UAT yang benar, lingkungan, serta versi/commit yang diuji. Periksa URL sebelum membuka E-Learning. Gunakan akun dan data uji resmi; untuk skenario yang berisiko mengubah data, gunakan kelas salinan yang disiapkan pengelola lingkungan.
2. Pilih **Cakupan fitur** untuk melihat fitur aktif, integrasi nonaktif, dan backlog. Pilih fitur atau gunakan pencarian/filter prioritas, role, modul, dan status untuk menemukan tutorial.
3. Buka kasus. Baca role, kesiapan fitur, prasyarat, serta data uji sebelum menekan **Mulai tutorial**. Tautan E-Learning di header membuka target yang dipilih pada pengaturan sesi. Bila langkah tidak aman atau dependensi lingkungan belum siap, pilih **Terblokir** dan catat alasannya.
4. Ikuti satu langkah per layar. Cocokkan **Hasil yang diharapkan**, tandai langkah selesai, lalu pilih **Langkah berikutnya**. Portal memberi bunyi lembut saat langkah selesai dan jingle dua nada serta kilau saat semua langkah tuntas. **Efek suara tutorial** dapat dimatikan di Pengaturan sesi; animasi mengikuti preferensi gerak minim perangkat. **Lihat semua langkah** membuka seluruh urutan dan memungkinkan berpindah ke langkah tertentu. Progres langkah tersimpan otomatis.
5. Setelah langkah terakhir, isi hasil aktual, catatan, bukti/nomor permintaan, lalu pilih **Lulus**, **Gagal**, atau **Terblokir**. Selesaikan langkah bukan berarti kasus otomatis lulus.
6. Kasus backlog hanya dapat dibiarkan belum diuji atau ditandai **Terblokir**; tombol Lulus/Gagal dikunci. Integrasi SIAKAD berstatus **Integrasi nonaktif**, dan tutorialnya menguji bahwa integrasi tetap tidak dapat dijalankan.
7. Lihat **Ringkasan** untuk progres per prioritas/role dan temuan. **Selesai = Lulus + Gagal**; kasus terblokir masih memerlukan tindak lanjut.
8. Buka **Perbandingan** untuk melihat hasil manual dan otomatis berdampingan. Hasil **Sesuai/Berbeda** hanya dihitung jika kedua sisi berstatus Lulus/Gagal. Satu sisi yang belum diuji tidak dianggap lulus.
9. Gunakan **Ekspor → Backup sesi JSON** untuk menyimpan seluruh sesi. JSON dapat diimpor pada perangkat lain. CSV berisi seluruh kasus, langkah, harapan, hasil dan referensi bukti untuk pelaporan. Bukti berkas tidak diunggah oleh portal.

## Pengujian otomatis

Klik **Jalankan otomatis** di portal lokal, atau jalankan:

```powershell
npm run qa:run
```

Runner menjalankan regresi domain/komponen yang sudah ada, regresi integrasi, serta assertion v5 tambahan. Setiap kasus otomatis dipetakan ke **nama assertion dan file tertentu**; seluruh modul tidak diberi status lulus hanya karena satu assertion lulus. Nilai `not_run` berarti tidak ada bukti otomatis; `blocked` berarti suite/prasyarat gagal tersedia. UI menampilkan jenis bukti `unit` atau `api`, durasi, run ID, timestamp, lokasi assertion dan pesan kegagalan.

Hasil disimpan di `apps/qa/public/reports/latest.json`, riwayat per run, log event JSONL dan [AUTOMATED-RESULTS.md](AUTOMATED-RESULTS.md). Assertion regresi yang gagal di luar pemetaan katalog tetap ditampilkan pada panel **Regresi tambahan gagal** dan laporan. Exit code runner tetap nonzero bila ada assertion gagal, termasuk perbedaan nyata terhadap v5. Ini tidak menghalangi penggunaan portal.

Runner HTTP lokal hanya menerima origin `http://127.0.0.1:5174` dan alamat loopback. Perintah tetap dan tidak mengambil command/parameter dari browser. Runner menolak database yang namanya tidak berakhiran `_test` dan tidak mewarisi Redis/secret layanan produksi untuk suite.

## Cakupan dan batas penerimaan

373 kasus mempertahankan cakupan **Technical Design E-Learning UAY v5**, 18 keluarga RTM, 12 dimensi BVA, 9 cause-effect, dan 12 kriteria pilot. Inventaris implementasi ditinjau 12 Oktober 2026 dari menu, panduan pengguna, kontrol akses API dan tes regresi. Cakupan tambahan meliputi kelas praktikum terhubung, batas akses Asdos/kolaborator dan pemantauan dosen, sinkron peserta/nilai dan duplikasi, SSO dengan role lokal, Sinkron Pengguna, tema terang/gelap, sortir tabel global, serta SIAKAD yang belum siap. Jumlah kasus adalah skenario QA, bukan jumlah requirement resmi.

Fitur aktif, integrasi nonaktif, backlog, dan gerbang lingkungan eksternal ditandai terpisah. Roadmap v5 tetap tersedia untuk keterlacakan, tetapi kasus backlog tidak dapat diberi hasil manual Lulus/Gagal. Sesi dan backup lama tetap dapat diimpor; hasil lama untuk kasus yang kini berstatus backlog dipindahkan ke Terblokir dengan catatan.

Dokumen menyebut 151 butir kebutuhan, tetapi 15 rentang kode RTM berjumlah 117; PDF requirement per butir tidak ada di workspace. Karena itu acuan menggunakan **keluarga kode dan paragraf dokumen**, tanpa mengarang arti setiap kode individual. Prioritas per kasus diturunkan dari cakupan §3.1; `CRS-007/008` disebut eksplisit. Catatan ketidakkonsistenan dokumen terlihat pada menu Cakupan dokumen.

Fixture lokal menguji alur OIDC dan kontrak File Service, bukan layanan kampus atau antivirus nyata. Kasus VPS/Redis/backup/restore/load-test dan P1/P2 yang belum tersedia tetap membutuhkan lingkungan tersendiri. Hasil unit/API tidak membuktikan tampilan, keseluruhan cause-effect, atau kesiapan produksi.

## Verifikasi portal dan build

```powershell
npm run qa:test
npm run qa:build
```

`qa:test` memeriksa keterlacakan katalog, kelengkapan inventaris fitur, status backlog, semantik perbandingan, migrasi sesi/backup lama, URL aman, CSV, wizard, dan pencatatan hasil melalui komponen React. `qa:build` membuat ulang katalog dan halaman sumber, memeriksa TypeScript, lalu membangun portal terpisah dari frontend E-Learning. Build statis tetap bisa membaca bukti, membuka acuan sumber dan menyimpan hasil manual; eksekusi ulang dari tombol memerlukan server lokal.

Pemeriksaan pembaruan panduan, tampilan desktop/ponsel, dan bahan buku/PPT tercatat dalam [verifikasi panduan 7 Oktober 2026](GUIDE-UPDATE-VERIFICATION.md).
