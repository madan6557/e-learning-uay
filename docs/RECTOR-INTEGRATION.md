# Pemantauan Akademik — akses rektor

Dashboard rektor sekarang menjadi bagian dari e-learning, memakai halaman masuk, sesi, sidebar, dan identitas visual yang sama. Alamat lokal: http://127.0.0.1:5173/rector. Aplikasi rektor terpisah pada port 5175/3002 tidak diperlukan untuk alur ini.

## Demo lokal

1. Jalankan `npm run dev` seperti biasa. Launcher menerapkan migrasi dan mengaktifkan `DEMO_MODE=true` bila belum diatur.
2. Buka e-learning, pilih **Masuk dengan SSO UAY**, lalu **Rektor UAY (Akun Uji)** dengan nomor `RKT001` pada provider lokal.
3. Rektor langsung masuk ke **Pemantauan Akademik**. Telusuri Ringkasan → Dosen & kelas → dosen → kelas. Riwayat dosen menampilkan rentang masuk sampai keluar pada grafik 00.00–24.00 WIB.
4. Gunakan filter periode/program studi dan unduh tabel CSV atau laporan PDF. Panduan membaca memberi empat penjelasan utama; rincian perhitungan dapat dibuka bila diperlukan.
5. Keluar melalui tombol sesi e-learning. Tidak ada login tambahan khusus dashboard.

Data demo deterministik memuat 12 dosen fiktif, empat program studi, 24 kelas, dan dua semester. Label **Demo — data simulasi** tetap terlihat. Waktu data terakhir berbeda dari waktu pemuatan halaman.

## Aktivasi kampus

- Tim SSO memberikan role `RECTOR` kepada akun resmi pada client **elearning-uay**, dengan `user_type=STAFF` dan status aktif. Tidak memerlukan client, callback, atau secret baru. Tidak memberikan `SUPER_ADMIN` untuk akses rektor.
- Terapkan migrasi `20261006090000_rector_role` melalui `npm run db:migrate`, lalu build aplikasi.
- Gunakan konfigurasi SSO kampus yang sudah berlaku, `AUTH_MODE=oidc`, dan `DEMO_MODE=false`. Jangan memakai provider demonstrasi untuk layanan kampus.
- Permintaan akun dan batas hak akses ditambahkan pada lembar data integrasi versi 1.1, halaman 9–10. Identitas akun resmi tetap harus diisi oleh pihak kampus.
- Bila seseorang memiliki beberapa role, urutan pemilihan adalah `SUPER_ADMIN`, `RECTOR`, `DEPARTMENT_ADMIN`, `INSTRUCTOR`, `STUDENT`. Berikan hanya `RECTOR` pada akun yang khusus untuk pemantauan.

## Hak akses dan data

API baca `/api/rector/v1` memakai sesi e-learning; hanya `RECTOR` dan `SUPER_ADMIN` yang dapat mengakses laporan. Rektor dapat membuka profil sendiri, keluar, melihat laporan, dan mengunduh CSV/PDF. Backend menolak operasi perubahan laporan serta akses rektor ke jalur pengelolaan akademik `/api/v1`. Tidak ada kemampuan mengubah kelas, materi, tugas, kuis, peserta, nilai, atau akun lain.

`ReportingDataSource` menyediakan implementasi fixture dan implementasi pembacaan database universitas. Pada mode kampus, laporan membaca kondisi kelas dan catatan kegiatan yang sudah tersimpan. Respons hanya berisi agregat akademik dan identitas dosen; identitas mahasiswa, nilai individual, jawaban, dan isi umpan balik tidak dimasukkan.

Kiriman tugas yang sudah digantikan tidak masuk antrean. Penilaian kuis otomatis terpisah dari penilaian manual. Kegiatan dosen pada kelas bersama dikreditkan kepada pelaku; kegiatan admin/sistem tampil terpisah. Kondisi kelas pada waktu terakhir dibaca bukan kegiatan baru dalam rentang tanggal.

## Batas pencatatan yang perlu dipahami

- Grafik sesi memakai waktu masuk dan keluar yang benar-benar tercatat. Bila waktu keluar tidak tersedia, laporan menyebutkannya tanpa mengarang waktu akhir. Rentang terhubung bukan ukuran lama bekerja.
- Database lama tidak merekam seluruh kunjungan kelas, riwayat sesi, durasi tindakan, dan waktu publikasi tugas. Laporan memakai bukti yang tersedia; penambahan pencatatan lengkap masih diperlukan sebelum mengklaim semua riwayat sudah tercakup.
- Pembaruan token sesi tidak mengubah waktu login terakhir. Durasi kerja, skor kinerja, dan peringkat dosen tidak dihitung.
- Presensi, forum, dan kehadiran telekonferensi belum tersedia dalam laporan.

## Pemeriksaan

`npm run check` memeriksa build dan aturan domain, termasuk 14 kasus pelaporan untuk filter, kelas bersama, pelaku kegiatan, penilaian otomatis, kiriman pengganti, pembagi nol, ekspor, dan sesi lintas tengah malam. Tes integrasi `tests/integration/rector-access.test.ts` memeriksa sesi yang sama, penolakan hak akses, sumber database, privasi, CSV/PDF, dan logout pada database terpisah berakhiran `_test`. Tes OIDC memastikan pembaruan sesi tidak dicatat sebagai login baru.

Peluncuran pada layanan kampus belum dilakukan. Role resmi dari tim SSO dan pemeriksaan dengan akun kampus diperlukan sebelum penggunaan operasional.
