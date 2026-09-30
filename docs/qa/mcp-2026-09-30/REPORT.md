# Pengujian UI E-Learning UAY melalui MCP Chrome

Tanggal sesi: 30 September 2026. Target: https://e-learning-uay.vercel.app/. Chrome Incognito, akun demonstrasi, development. Build deployment belum diverifikasi.

Ringkasan: 5 pemeriksaan lulus dalam cakupan UI/demo, 3 kasus baru sebagian (ditandai blocked), 309 kasus katalog tidak dijalankan. Tidak ada kegagalan yang terkonfirmasi dari pemeriksaan ini. Ini bukan hasil penuh 317 kasus, pengujian SSO kampus, atau pengujian API deployment.

## P0 > Role

### Mahasiswa · TC-ACC-001

Status MCP: **PASS UI/demo**. Otomatis lokal: not_run. Manual pengguna: not_run.

Aditya Pratama / 202601001; dashboard Mahasiswa dan profil sesuai; profil tetap Aktif setelah reload.

PASS terbatas jalur akun demonstrasi dan UI. Login provider SSO kampus, cookie, dan jaringan belum diuji.

Bukti: [student-profile.txt](student-profile.txt).

### Dosen · TC-ACC-002

Status MCP: **PASS UI/demo**. Otomatis lokal: not_run. Manual pengguna: not_run.

Dr. Rina Puspitasari / 1112089001; profil Dosen; dashboard pengampu; sesi dan panel kuis tetap tersedia setelah reload.

PASS terbatas jalur demonstrasi dan UI. Data demo existing digunakan. SSO kampus dan respons jaringan belum diuji.

Bukti: [teacher-reload.txt](teacher-reload.txt).

### Admin Prodi · TC-ACC-003

Status MCP: **PASS UI/demo**. Otomatis lokal: not_run. Manual pengguna: not_run.

Admin Prodi Informatika / ADMIF01; profil Admin prodi aktif setelah reload; navigasi Katalog, Kelola kelas, Agenda akademik, Rekap nilai.

PASS terbatas jalur demonstrasi dan UI. SSO kampus dan respons jaringan belum diuji.

Bukti: [admin-prodi-reload.txt](admin-prodi-reload.txt).

### Super Admin · TC-ACC-004

Status MCP: **PASS UI/demo**. Otomatis lokal: not_run. Manual pengguna: not_run.

Admin UAY / ADM001; profil Super admin Aktif setelah reload; dashboard Seluruh program studi.

PASS terbatas jalur demonstrasi dan UI. SSO kampus dan respons jaringan belum diuji.

Bukti: [super-admin-reload.txt](super-admin-reload.txt).

### Dosen · TC-TDH-002

Status MCP: **PASS UI/demo**. Otomatis lokal: not_run. Manual pengguna: not_run.

Antrean Kuis 01 · Fondasi web = 1. Tautan menuju kuis IF2101. Tabel mempunyai tepat 1 Perlu dinilai (Nadia attempt 3), 3 Selesai dinilai. Hasil bertahan setelah reload.

PASS UI pada data demo existing; tidak membuat submission atau mengubah nilai. Kelas QA-V5 terpisah dan pemeriksaan jaringan tidak dijalankan.

Bukti: [teacher-queue.txt](teacher-queue.txt).

### Mahasiswa · TC-ACC-009

Status MCP: **SEBAGIAN / blocked**. Otomatis lokal: pass. Manual pengguna: not_run.

Keluar mengembalikan landing. Back ke /profile tetap menampilkan landing tanpa profil Aditya. Pergantian akun tidak memperlihatkan identitas lama.

SEBAGIAN: alur UI logout lulus. Pencabutan cookie, logout provider, dan /me 401 belum diperiksa; kasus lengkap belum lulus.

Bukti: [logout-landing.txt](logout-landing.txt).

### Dosen · TC-ENR-005

Status MCP: **SEBAGIAN / blocked**. Otomatis lokal: not_run. Manual pengguna: not_run.

Aditya pada IF2101 sudah nonaktif. Membuka kelas menunjukkan Hak Partisipasi Kelas Dinonaktifkan, tanpa materi atau aksi submit.

SEBAGIAN: hanya kondisi nonaktif existing. Transisi aktif → nonaktif dan submit langsung belum diuji.

Bukti: [student-access.txt](student-access.txt).

### Admin Prodi · TC-TDH-005

Status MCP: **SEBAGIAN / blocked**. Otomatis lokal: pass. Manual pengguna: not_run.

Dashboard Admin Prodi: Cakupan IF; menu pengelolaan akademik tanpa antrean dosen; Kelola kelas berisi IF202 dan IF2101.

SEBAGIAN: dashboard dan navigasi lulus. Reload dashboard serta pembuktian isolasi terhadap kelas prodi lain belum dijalankan.

Bukti: [admin-prodi-dashboard.txt](admin-prodi-dashboard.txt).

## Langkah yang benar-benar dijalankan

1. Buka landing development di Chrome Incognito, scroll ke Akun demonstrasi, pilih Aditya.
2. Periksa dashboard Mahasiswa: IF202 diarsipkan dan IF2101 Partisipasi dinonaktifkan.
3. Buka IF2101; periksa pesan penolakan akses dan ketiadaan materi/aksi submit.
4. Buka Profil; periksa Aditya, NIM 202601001, role Mahasiswa, status Aktif; reload dan periksa kembali.
5. Klik Keluar; pastikan landing; tekan Back ke /profile dan pastikan profil tidak terbuka.
6. Pilih Dr. Rina melalui demo; periksa profil Dosen dan buka Beranda.
7. Periksa Perlu dinilai = 1; klik Kuis 01 · Fondasi web.
8. Bandingkan tabel: satu Nadia attempt 3 Perlu dinilai dan tiga baris Selesai dinilai; reload dan periksa sesi serta tabel.
9. Keluar; pilih Admin Prodi Informatika; periksa Dashboard administrasi cakupan IF tanpa antrean dosen.
10. Buka Kelola kelas dan periksa IF202/IF2101; buka Profil, periksa ADMIF01/Admin prodi, reload.
11. Keluar; pilih Admin UAY; periksa dashboard cakupan Seluruh program studi; buka Profil, periksa ADM001/Super admin, reload.
12. Klik Keluar dan pastikan landing.

Tidak ada materi, submission, nilai, atau kepesertaan yang diubah pada sesi ini. Transisi enrollment dan uji submit belum dieksekusi.

## Perbandingan yang dapat disimpulkan

Run otomatis tersimpan: 0c471db0-148d-4a8d-b589-95188f6b0bd5 selesai 2026-09-29T03:46:39.708Z, lokal PostgreSQL _test dan fixture; 133 pass, 2 fail, 182 not_run. Tidak dijalankan ulang terhadap Vercel pada sesi ini.

Empat login role dan antrean dosen belum mempunyai hasil otomatis terpetakan. Logout dan dashboard Admin Prodi pass otomatis lokal, tetapi MCP baru sebagian, sehingga belum layak diberi label match. Manual pengguna dalam backup tersedia hanya TC-ACC-005; kasus tersebut tidak dijalankan pada sesi MCP ini. Belum ada kasus yang lengkap dengan tiga hasil manusia/MCP/otomatis untuk dibandingkan.

Dua kegagalan otomatis lokal (TC-BVA-ATTEMPT-NULL dan TC-RES-VIDEO-EMBED) belum direproduksi melalui UI deployment. Jangan menyimpulkan deployment masih memiliki bug yang sama.

## Data dan tindak lanjut

Untuk alur mahasiswa aktif, tugas, kuis, progres, dan nilai dibutuhkan peserta aktif pada kelas uji terpisah; Aditya pada IF2101 saat sesi ini sudah nonaktif. Agenda dosen menunjukkan beberapa tenggat lampau di bagian Agenda terdekat; ini observasi, belum ditetapkan sebagai bug tanpa aturan penyaringan yang diverifikasi. Footer publik menyebut waktu lokal perangkat; kepatuhan WIB belum diuji.

## Memuat hasil ke portal

File portal-backup-with-mcp.json memuat sesi MCP dan salinan sesi pengguna dari backup yang tersedia. Backup asli tidak diubah. Portal Impor mengganti state browser setelah konfirmasi; ekspor state browser terbaru dahulu jika ada perubahan setelah backup tanggal 29 September. Pemeriksaan lengkap yang mencakup jaringan tetap belum dicentang.
