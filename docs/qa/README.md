# Ruang pengujian E-Learning UAY v5

Portal interaktif lokal: **http://127.0.0.1:5174/**. Jalankan dari root workspace:

```powershell
npm run qa
```

Untuk menjalankan E-Learning yang diuji pada terminal lain:

```powershell
npm run dev
```

Portal dapat dibuka tanpa E-Learning aktif. Pengujian HTTP otomatis membutuhkan PostgreSQL lokal aktif; menggunakan database terpisah dengan nama berakhiran `_test`. Aplikasi dan database perkuliahan tidak direset.

## Menguji manual

1. Buka **Pengaturan sesi**, isi nama penguji, lingkungan, serta versi/commit E-Learning yang diuji. Buat sesi baru untuk pengulangan uji atau lingkungan berbeda.
2. Pilih **P0 / P1 / P2 → Role → Test case**. Filter modul/jenis/status atau cari ID kasus bila perlu.
3. Buka kasus; baca prasyarat, data uji dan langkah. Gunakan kelas uji/salinan, serta akun peserta dan bukan peserta untuk pemeriksaan isolasi.
4. Jalankan setiap langkah pada E-Learning. Centang langkah yang sudah dilakukan. Centang langkah tidak otomatis menetapkan kasus lulus.
5. Isi hasil aktual, catatan, bukti/nomor permintaan, lalu pilih **Lulus**, **Gagal**, atau **Terblokir**. Status dan input tersimpan otomatis pada browser/perangkat ini.
6. Lihat **Ringkasan** untuk progres per prioritas/role dan temuan. **Selesai = Lulus + Gagal**; kasus terblokir masih memerlukan tindak lanjut.
7. Buka **Perbandingan** untuk melihat hasil manual dan otomatis berdampingan. Hasil **Sesuai/Berbeda** hanya dihitung jika kedua sisi berstatus Lulus/Gagal. Satu sisi yang belum diuji tidak dianggap lulus.
8. Gunakan **Ekspor → Backup sesi JSON** untuk menyimpan seluruh sesi. JSON dapat diimpor pada perangkat lain. CSV berisi seluruh kasus, langkah, harapan, hasil dan referensi bukti untuk pelaporan. Bukti berkas tidak diunggah oleh portal.

## Pengujian otomatis

Klik **Jalankan otomatis** di portal lokal, atau jalankan:

```powershell
npm run qa:run
```

Runner menjalankan regresi domain/komponen yang sudah ada, regresi integrasi, serta assertion v5 tambahan. Setiap kasus otomatis dipetakan ke **nama assertion dan file tertentu**; seluruh modul tidak diberi status lulus hanya karena satu assertion lulus. Nilai `not_run` berarti tidak ada bukti otomatis; `blocked` berarti suite/prasyarat gagal tersedia. UI menampilkan jenis bukti `unit` atau `api`, durasi, run ID, timestamp, lokasi assertion dan pesan kegagalan.

Hasil disimpan di `apps/qa/public/reports/latest.json`, riwayat per run, log event JSONL dan [AUTOMATED-RESULTS.md](AUTOMATED-RESULTS.md). Assertion regresi yang gagal di luar pemetaan katalog tetap ditampilkan pada panel **Regresi tambahan gagal** dan laporan. Exit code runner tetap nonzero bila ada assertion gagal, termasuk perbedaan nyata terhadap v5. Ini tidak menghalangi penggunaan portal.

Runner HTTP lokal hanya menerima origin `http://127.0.0.1:5174` dan alamat loopback. Perintah tetap dan tidak mengambil command/parameter dari browser. Runner menolak database yang namanya tidak berakhiran `_test` dan tidak mewarisi Redis/secret layanan produksi untuk suite.

## Cakupan dan batas penerimaan

317 kasus disusun dari markdown **Technical Design - E-Learning UAY - v5.0.md**, mencakup 15 keluarga RTM, 12 dimensi BVA, 9 cause-effect, 12 kriteria pilot, editor 11 blok, 8 tipe kuis, keamanan/otorisasi, draf, serta operasional dan rilis lanjutan. Katalog merupakan turunan dokumen; jumlah kasus bukan klaim 317 requirement resmi.

Dokumen menyebut 151 butir kebutuhan, tetapi 15 rentang kode RTM berjumlah 117; PDF requirement per butir tidak ada di workspace. Karena itu acuan menggunakan **keluarga kode dan paragraf dokumen**, tanpa mengarang arti setiap kode individual. Prioritas per kasus diturunkan dari cakupan §3.1; `CRS-007/008` disebut eksplisit. Catatan ketidakkonsistenan dokumen terlihat pada menu Cakupan dokumen.

Fixture lokal menguji alur OIDC dan kontrak File Service, bukan layanan kampus atau antivirus nyata. Kasus VPS/Redis/backup/restore/load-test dan P1/P2 yang belum tersedia tetap membutuhkan lingkungan tersendiri. Hasil unit/API tidak membuktikan tampilan, keseluruhan cause-effect, atau kesiapan produksi.

## Verifikasi portal dan build

```powershell
npm run qa:test
npm run qa:build
```

`qa:test` memeriksa keterlacakan katalog, semantik perbandingan, hitungan ringkasan, isolasi/validasi backup, URL aman, CSV, dan pencatatan hasil melalui komponen React. `qa:build` membuat ulang katalog dan halaman sumber, memeriksa TypeScript, lalu membangun portal terpisah dari frontend E-Learning. Build statis tetap bisa membaca bukti, membuka acuan sumber dan menyimpan hasil manual; eksekusi ulang dari tombol memerlukan server lokal.
