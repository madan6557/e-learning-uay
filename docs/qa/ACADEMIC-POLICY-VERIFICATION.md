# Verifikasi perbaikan ketidaksesuaian E-Learning UAY

Tanggal: 5 Oktober 2026. Lingkungan: workspace lokal, PostgreSQL, akun fixture SSO dan File Service lokal. Tidak ada deployment.

## Hasil penerapan

| Area | Perilaku yang diterapkan |
| --- | --- |
| Pengaturan akademik | Lima pengaturan disimpan pada satu baris global PostgreSQL. Perubahan memakai transaksi, kunci idempotensi dan audit before/after. Hanya Super Admin dapat menyimpan; Admin Prodi mendapat form baca saja. Form menampilkan kegagalan dan mengonfirmasi keberhasilan setelah respons server. |
| Kebijakan akademik | Ambang tersimpan dipakai pada perhitungan dan respons rekap. Kelas baru dan hasil duplikasi memakai skala default aktif. Mengganti default tidak mengubah nilai akhir yang sudah diterbitkan. |
| Skala nilai | Pilihan, tabel dan label berasal dari definisi bersama. Batas 2026.1 adalah A ≥ 85, A− ≥ 80 dan B+ ≥ 75. |
| Presensi | Kode hanya dikirim kepada pengelola kelas. Mahasiswa menerima `requiresCode` tanpa nilai kode. Kode baru dan kode khusus berisi 6 karakter alfanumerik. |
| File Service | Pemeriksaan kesehatan memakai adapter aktif. Timeout, kegagalan layanan dan respons tidak valid menghasilkan error API. Fallback sukses eksternal dihapus. Mode lokal/demo ditandai sebagai simulasi; operasi adapter yang tidak tersedia menghasilkan error eksplisit. |
| Metadata berkas | Metadata dan tiket unduhan memakai pemeriksaan akses bersama. Konteks `resourceId` memeriksa relasi berkas, peserta aktif, visibilitas dan jadwal. Berkas jawaban tetap dibatasi kepada pemilik atau pengelola, termasuk bila direferensikan sebagai materi. |
| Unggahan | Batas bersama: cover 5 MiB, materi/tugas/jawaban kuis 50 MiB, video 100 MiB. UI menolak ukuran berlebih sebelum membaca berkas; server memvalidasi tiket dan ukuran data unggahan. Label aplikasi memakai MB. |
| Waktu | Formatter mengikuti zona perangkat dan menampilkan offset sebenarnya. Input jadwal lokal dikirim sebagai timestamp UTC. Akhiran WIB tetap dihapus. |
| Bantuan dan dokumentasi | Petunjuk disesuaikan dengan kontrol aplikasi, login, router, skala nilai, unggahan, waktu dan arsip yang dapat dibuka kembali. Progres video unggahan dibedakan dari konfirmasi video sematan. Klaim hemat kuota dan jaminan kelancaran dihapus. |

Migrasi `202610050007_academic_settings` diterapkan pada database lokal aplikasi dan database integrasi `_test`. Setelah layanan lokal dimulai ulang, `/auth/config` tetap mengembalikan semester **2026/2027 Ganjil**, skala default **2026.1**, dan ambang **75%** dari database.

## Pengujian otomatis

| Pemeriksaan | Hasil |
| --- | --- |
| Build utama, build web terakhir, pemeriksaan TypeScript API/web | Lulus |
| `npm test` | 47 tes lulus, 0 gagal |
| `npm run test:integration` | 43 tes lulus, 0 gagal; database `_test` |
| `npm run qa:build` | Lulus |
| `npm run qa:test` | 8 tes lulus, 0 gagal |
| `npm run qa:run` | 143 kasus otomatis lulus, 0 gagal, 0 terblokir; 186 kasus belum diuji otomatis |
| `git diff --check` | Lulus |

Tes regresi menggunakan helper, komponen dan endpoint produksi. Cakupan mencakup persistensi dengan koneksi/aplikasi baru, otorisasi pengaturan, idempotensi/audit, perubahan ambang, default kelas/duplikasi, nilai terbit, skor 75/80/85, privasi kode, akses metadata lintas kelas/peserta nonaktif/jawaban orang lain, kedua adapter eksternal, timeout/error/respons tidak valid, batas unggahan tepat dan satu byte di atasnya, serta penolakan UI sebelum `arrayBuffer()`.

Zona perangkat diuji pada **UTC+7 (Asia/Jakarta)** dan **UTC+8 (Asia/Makassar)**, termasuk konversi input lokal ke UTC dan kembali. Pemeriksaan browser lokal menampilkan GMT+8.

## Pemeriksaan UI fixture

| Peran | Hasil |
| --- | --- |
| Super Admin | Form kebijakan dapat diedit; tombol simpan tersedia; tabel batas skala sesuai definisi bersama. |
| Admin Prodi | Field kebijakan dinonaktifkan; tombol simpan tidak tersedia; pembatasan Super Admin dijelaskan. |
| Dosen | Kode presensi dapat ditampilkan melalui Kode Proyektor; rekap memakai ambang dari server. |
| Mahasiswa | Indikator kebutuhan kode tersedia; form meminta kode 6 karakter tanpa memperlihatkan kode sesi; waktu mengikuti perangkat. |

Bukti screenshot tersimpan di `.local/verification/`: `super-admin-policy.jpg`, `admin-prodi-policy.jpg`, `instructor-code.jpg`, `student-attendance.jpg`, dan `student-code-form.jpg`. Folder ini merupakan artefak lokal yang diabaikan Git. Satu kode sesi fixture lama yang berisi tujuh karakter diregenerasi melalui kontrol dosen menjadi enam karakter. Tidak ada presensi mahasiswa yang dikirim selama pemeriksaan UI.

Hasil QA rinci: [AUTOMATED-RESULTS.md](AUTOMATED-RESULTS.md). Pengujian dengan fixture lokal tidak membuktikan integrasi layanan kampus atau penerimaan seluruh 329 kasus; 186 kasus yang belum dijalankan otomatis tetap dicatat demikian.

Perubahan workspace yang sudah ada dipertahankan. Penerapan tidak mencakup perombakan visual, penghapusan kode massal atau deployment.
