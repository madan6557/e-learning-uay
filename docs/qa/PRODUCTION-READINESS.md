# Kesiapan production E-Learning UAY

Tanggal verifikasi: **8–9 Oktober 2026**, zona waktu Asia/Singapore. Acuan kebutuhan: [desain v5](../requirements/Technical%20Design%20-%20E-Learning%20UAY%20-%20v5.0.md), [katalog QA](catalog.json), dan [matriks permission bersama](../../packages/shared/src/permissions.ts).

**Status: perbaikan dan verifikasi lokal selesai; penerimaan production kampus masih menunggu staging.** Tidak ada tes otomatis yang gagal pada run akhir. Bukti fixture lokal belum membuktikan SSO/File Service kampus, Redis multi-instance, HTTPS, backup/restore VPS, atau pilot 50 mahasiswa. Sebagian kasus katalog memerlukan penerimaan manual lebih lanjut; jangan menggunakan jumlah tes yang lulus sebagai pernyataan bahwa seluruh 354 kasus sudah diterima.

## Lingkungan dan hasil akhir

| Pemeriksaan | Hasil | Bukti |
| --- | --- | --- |
| TypeScript API dan web | Lulus | `npm run typecheck`; juga diperiksa oleh build penuh |
| Build penuh | Lulus | `npm run build`: Prisma Client, TypeScript API/web, Vite production |
| Domain, komponen UI, dan QA domain | 165 tes, exit 0 | [Hasil terstruktur](../../apps/qa/public/reports/latest.json), suite `domain` |
| Integrasi API/PostgreSQL | 132 tes, exit 0 | Hasil terstruktur, suite `integration`; database `elearning_test` |
| Katalog QA v5 | 163 lulus, 0 gagal, 191 belum dijalankan otomatis | [Ringkasan QA](AUTOMATED-RESULTS.md): P0 158 lulus/169 belum otomatis; P1 5/15; P2 0/7 |
| Portal QA | 8 tes lulus; build lulus | `npm run qa:test`, `npm run qa:build` |
| Audit dependensi | 0 kerentanan | `npm audit --json`; [ringkasan verifikasi](production/verification-results.json) |
| Panduan dan tautan dokumentasi | Lulus | `npm run docs:guide:check`, perakitan folder panduan, pemeriksaan tautan relatif |
| Browser desktop/tablet/ponsel | Halaman utama lima peran dan alur terpilih diperiksa | [Indeks screenshot dan pemeriksaan](production/README.md) |

Run QA terakhir: `6fe17ae4-10c2-447b-8a3c-b502052ba82d`, selesai `2026-10-09T13:56:25.012Z` (9 Oktober, 21.56 GMT+8). Report mencatat base commit beserta penanda working copy karena verifikasi dilakukan sebelum commit koreksi. [Patrol akhir UI/UX](production/final-patrol/README.md) memuat koreksi modal AI, feedback dalam dialog, label, status penyimpanan, pesan Admin Prodi, filter Rektor, serta regresi login mode OIDC demo. Build penuh dan typecheck ulang lulus; audit dependensi tetap 0 kerentanan. [Pre-flight hasil build sebelumnya](production/grace-preflight-checks.json) memakai skrip workflow yang sama dan lulus tanpa Redis/secret webhook; konfigurasi grace tidak diubah pada patrol akhir.

`npm run dev:test` memakai **elearning_visual_test** dan penyimpanan berkas `.local/visual-test-files`, terpisah dari database penggunaan biasa. Ada 58 akun fixture: 1 Super Admin, 1 Rektor, 4 Admin Prodi, 12 Dosen, dan 40 Mahasiswa; 16 kelas pada 4 prodi. Database integrasi dibatasi oleh launcher pada nama berakhiran `_test`. Pengguna lintas prodi, dosen bukan pengampu, dan mahasiswa bukan peserta tersedia untuk pemeriksaan penolakan akses. Akun fixture Damar diperbaiki agar tidak menimpa identitas mahasiswa Dewi; tidak ada relasi pengampu yang menunjuk akun mahasiswa. Riwayat audit fixture lama dipertahankan, sehingga angka laporan demo tidak menjadi bukti aktivitas kampus nyata.

## Wewenang yang ditegakkan

| Peran | Akses yang tersedia | Batas yang diperiksa |
| --- | --- | --- |
| Super Admin | Katalog, konfigurasi akademik, administrasi kelas/peserta/pengampu, pengumuman universitas, pemantauan dan ekspor | Tidak mendapat hak pedagogis atau penilaian hanya karena berperan sebagai administrator |
| Rektor | Laporan universitas, filter, detail, CSV/PDF, pengumuman, profil dan bantuan | Laporan hanya baca; tidak mengelola kelas atau menilai |
| Admin Prodi | Administrasi prodi sendiri dan bantuan konten kelas, bank soal, presensi, pengumuman prodi; melihat/mengekspor rekap | Tidak dapat menilai pekerjaan, mengubah bobot, mengimpor nilai, atau menerbitkan nilai akhir; prodi lain ditolak |
| Dosen pengampu | Konten, peserta, presensi, penilaian, bobot dan publikasi pada kelas yang diampu | Dosen yang bukan pengampu ditolak walaupun berasal dari prodi yang sama |
| Mahasiswa | Kelas yang diikuti, konten terbit, progres, pekerjaan sendiri dan presensi mandiri yang dibuka dosen | Konten tersembunyi, pekerjaan orang lain, nilai belum diterbitkan, akses peserta nonaktif dan kiriman ke kelas arsip dibatasi |

UI memakai matriks permission bersama dan konteks kelas. API tetap melakukan pemeriksaan sendiri. Jalur administrasi kelas diberi pengecualian eksplisit; pengecualian itu tidak digunakan untuk penilaian. Impor `GRADES` diperiksa pada **pratinjau maupun commit**, sehingga memilih jenis impor tidak dapat melampaui wewenang asal.

## Daftar fitur dan aksi dengan bukti

Semua baris berikut merupakan bukti **lokal**. “API” berarti permintaan langsung dalam tes integrasi, bukan hanya tombol yang disembunyikan. Pemeriksaan browser menggunakan akun demo. Komponen aksi bersama menampilkan proses, mengunci kiriman yang masih berjalan, dan menampilkan error tanpa menghapus input; keberhasilan disampaikan setelah server mengonfirmasi.

| Fitur / aksi | Peran dan lingkup | Bukti fungsi dan wewenang | Feedback / perubahan UI |
| --- | --- | --- | --- |
| Masuk OIDC, sesi, keluar | Kelima peran | [OIDC](../../tests/integration/oidc.test.ts), [sesi](../../tests/session-expiry.test.ts), login browser lima peran | Halaman peran terbuka; keluar kembali ke landing; sesi habis meminta masuk kembali |
| Revokasi akun/sesi | SSO ke E-Learning | [Integrasi OIDC](../../tests/integration/oidc.test.ts), [SSO domain](../../tests/sso.test.ts) | Permintaan berikutnya ditolak; kegagalan cache tidak disamarkan menjadi sesi anonim yang valid |
| Daftar/filter kelas, buat/edit/arsip/clone | Super Admin, Admin Prodi sesuai scope; administrasi pengampu sesuai izin | [Learning](../../tests/integration/learning.test.ts), [isolasi prodi](../../tests/integration/department-isolation.test.ts), [publikasi](../../tests/integration/publication.test.ts) | Daftar/status berubah; modal simpan ditutup dengan feedback aplikasi |
| Cari/daftarkan/nonaktifkan peserta dan impor peserta | Pengelola kelas yang berwenang | [Learning](../../tests/integration/learning.test.ts), browser peserta; hasil pencarian lama diabaikan | Loading, hasil kosong atau error eksplisit; batal tidak menghasilkan pesan berhasil |
| Tambah/edit/publikasikan/urutkan section dan materi | Dosen pengampu; bantuan Admin Prodi | [Learning](../../tests/integration/learning.test.ts), editor browser Tulis/Pratinjau/Berdampingan | Draf lokal terpisah dari status tersimpan; aksi publikasi mengubah badge dan memberi pesan |
| Membaca teks/PDF/video/link dan progres | Mahasiswa peserta aktif; pengelola dapat melihat | [Domain](../../tests/domain.test.ts), [QA domain](../../tests/qa/domain-v5.test.ts), [file ACL](../../tests/integration/academic-policy.test.ts), browser teks/PDF | Selesai/progres terlihat; video gagal memuat menyediakan pesan Indonesia dan coba lagi |
| Bank soal, impor soal, struktur kuis | Pengampu; bantuan Admin Prodi pada kelas dalam scope | [Learning](../../tests/integration/learning.test.ts), [QA API](../../tests/qa/api-v5.test.ts) | Pratinjau impor, masalah per baris dan jumlah siap impor; commit dikunci selama proses |
| Delapan tipe kuis | Mahasiswa peserta; penilaian manual hanya pengampu | [Domain kuis](../../tests/qa/domain-v5.test.ts): pilihan tunggal/jamak, benar-salah, jawaban singkat, pasangan, urutan, esai, berkas; [QA API](../../tests/qa/api-v5.test.ts) dan [batas waktu](../../tests/integration/boundaries.test.ts) | Autosave/revisi dan konflik, tenggat server, status selesai; esai/berkas menunggu penilaian. Browser memeriksa halaman hasil kuis fixture, bukan pengerjaan manual semua tipe |
| Pengumpulan tugas teks/link/berkas dan versi | Mahasiswa atas pekerjaan sendiri | [Learning](../../tests/integration/learning.test.ts), [QA API](../../tests/qa/api-v5.test.ts), browser tugas | Riwayat versi, status dikumpulkan/terlambat, tenggat/cutoff dan alasan penolakan |
| Buka/edit/tutup sesi presensi | Pengampu; bantuan prodi | [Presensi API](../../tests/integration/academic-policy.test.ts), [UI waktu](../../tests/attendance-time-ui.test.ts), browser jadwal | Form terkunci saat menyimpan; kegagalan mempertahankan input; kontrol presensi mandiri tersedia |
| Check-in dan rekap | Mahasiswa peserta aktif, sesi mengizinkan presensi mandiri | [Presensi](../../tests/attendance.test.ts), [API kebijakan](../../tests/integration/academic-policy.test.ts), browser Joko check-in | Status **Hadir** dan feedback tetap terlihat setelah modal tutup; tidak menawarkan check-in jika dimatikan dosen |
| Koreksi presensi manual | Pengelola yang berwenang | API kebijakan: status/catatan/pengelola/audit disimpan | Rekap berubah dan alasan/catatan tersimpan |
| Nilai manual, kalkulasi, simpan batch | Dosen pengampu | [Batch nilai](../../tests/integration/batch-grades.test.ts), [kemajuan](../../tests/gradebook-advancement.test.ts), [rekap ponsel](../../tests/phone-gradebook.test.ts) | Jumlah perubahan dan draf belum dikirim jelas; batch atomik; konflik mempertahankan input |
| Bobot, publikasi/penguncian/koreksi nilai | Dosen pengampu | [Publikasi](../../tests/integration/publication.test.ts), [QA API](../../tests/qa/api-v5.test.ts), [matriks](../../tests/permissions-matrix.test.ts) | Bobot harus valid; penilaian yang tertunda dan pengakuan nilai kosong dijelaskan; koreksi memerlukan alasan |
| Rekap hanya baca dan Excel | Admin dalam lingkup; mahasiswa nilai sendiri setelah terbit | [Governance UI](../../tests/academic-governance-ui.test.ts), [rekap ponsel](../../tests/phone-gradebook.test.ts), ekspor browser dosen | Tidak ada input/simpan pada Admin Prodi; paginasi tetap berfungsi; ekspor menunjukkan proses/berhasil/error |
| Impor nilai | Pengampu kelas saja | [Learning](../../tests/integration/learning.test.ts), pengujian penolakan preview/commit untuk administrator dan dosen asing | Jenis impor sesuai titik masuk; commit tidak aktif sampai pratinjau bersih |
| Unggah/finalisasi berkas | Pemilik/pengampu sesuai purpose, ukuran dan akses | [Files](../../tests/integration/files.test.ts), [UAY adapter](../../tests/uay-file-service.test.ts), [API kebijakan](../../tests/integration/academic-policy.test.ts) | Proses upload dan status scan; error layanan tidak menjadi sukses metadata fiktif |
| Unduh/stream/tiket berkas, trash/restore | ACL resource dan kepemilikan pekerjaan | Files + API kebijakan: pengguna luar, peserta nonaktif, konten tersembunyi, jawaban orang lain dan tiket kedaluwarsa | Unduhan valid; akses/tiket gagal memberi pesan; tidak membuat PDF palsu saat layanan gagal |
| Pengumuman universitas/prodi: buat/edit/hapus, sasaran, lampiran | Super Admin global; Admin Prodi sendiri | [Pengumuman API](../../tests/integration/system-announcements.test.ts), browser publikasi/edit | Validasi scope asal dan tujuan; konflik 409; input pulih; berhasil tetap terlihat setelah modal tutup |
| Pengumuman/notifikasi transaksional dan status baca | Penerima aktif sesuai prodi/sasaran | Pengumuman API: lebih dari 500 penerima, rollback audit/notifikasi, edit sasaran dan penarikan | Badge/daftar berubah; payload lama dicabut tanpa menghilangkan status baca yang relevan |
| Laporan Rektor, filter, pencarian, pengurutan, detail | Rektor; Super Admin yang diberi permission | [Rector API](../../tests/integration/rector-access.test.ts), [reporting](../../tests/rector-reporting.test.ts), [rentang](../../tests/rector-live-range.test.ts), browser filter/pengurutan | Ringkasan filter dan jumlah berubah; loading/error/retry; kartu dosen ponsel mempertahankan navigasi detail |
| Ekspor laporan CSV/PDF | Akses laporan hanya baca | Rector API dan ekspor browser | Tombol menunjukkan proses dan mencegah klik ganda; toast setelah hasil server tersedia |
| Profil, panduan, menu, navigasi/filter/batal | Sesuai peran | [Navigasi](../../tests/navigation.test.ts), [dashboard peran](../../tests/dashboard-roles.test.ts), browser keyboard | Rute/seleksi/drawer berubah langsung; fokus kembali ke pemicu Menu setelah Escape; batal tidak dianggap simpan |

## Perbaikan kegagalan dan regresi

| Kondisi | Pemeriksaan dan hasil |
| --- | --- |
| Klik berulang/respons belum selesai | [Feedback](../../tests/feedback.test.ts) menahan request kedua sebelum React memperbarui state; UI jadwal presensi memakai guard serupa dan fieldset/penutup modal terkunci |
| Server gagal/koneksi layanan gagal | Action/Form mempertahankan input dan menyediakan error/retry; tes adapter memeriksa timeout, failure dan respons invalid tanpa fallback sukses |
| Konflik simpan | Pengumuman memakai `expectedUpdatedAt`, transaksi dan respons 409; kuis/nilai memakai kontrol revisi sesuai tes API yang ada |
| Membatalkan konfirmasi | Hasil `false` tidak mengeluarkan toast berhasil; diterapkan pada kalkulasi otomatis dan penonaktifan peserta |
| Reload dengan draf | [Draf](../../tests/drafts.test.ts), Form/feedback dan browser pengumuman: pemulihan eksplisit sebelum input dibuka; draf di perangkat tidak diberi label tersimpan server |
| Resize dengan nilai belum disimpan | Browser: nilai UTS Bunga diubah menjadi 61, tetap 61 saat berpindah ponsel → desktop → ponsel, lalu dikembalikan tanpa menyimpan ke server; [bukti](production/gradebook-mobile-draft.jpg) |
| Presensi mandiri nonaktif/tertutup | UI tidak menawarkan tombol yang ditolak API; error membedakan tenggat presensi dari sesi autentikasi habis; dosen tidak dapat mengirim check-in mahasiswa |
| OIDC callback | Origin berasal dari konfigurasi terpercaya; endpoint `me` anonim tidak menghapus state; error pemuatan konfigurasi ditampilkan dan URL callback tidak diproses dua kali |
| Grace Redis/webhook | [Konfigurasi production](../../tests/production-config.test.ts), [health](../../tests/integration/production-health.test.ts): Redis kosong/gagal memakai memori, database siap tetap 200 dengan penanda degraded; webhook tanpa secret tetap 503 dan akun uji tetap ditolak pada production non-demo |
| Akses lintas scope/kelas | Tes permintaan API langsung memeriksa prodi asing, dosen nonpengampu, peserta nonaktif, kelas/course arsip, konten belum terbit serta file/pekerjaan privat |

Gangguan header selama HMR pengembangan sudah diperbaiki. Typecheck/build akhir lulus dan [konsol browser sesudah perbaikan](production/phone-browser-console.json) tidak mencatat error/warning. Ini bukan simulasi menyeluruh semua kombinasi jaringan pada setiap halaman; kasus manual yang belum mempunyai bukti tetap memerlukan penerimaan pada katalog.

## Tampilan dan organisasi dokumentasi

Ponsel hingga 600 px memakai navigasi bawah sesuai peran, judul dan kontrol dengan ukuran tersendiri, jarak kartu yang lebih lega, pemilih bagian kelas, disclosure pengelolaan/nilai, kartu nilai per mahasiswa dan kartu peserta berlabel. Modal/editor menggunakan layar penuh. Nilai lokal tetap berada pada state bisnis yang sama ketika layout berganti. Tablet mempertahankan penyajian tabel dan navigasi yang sesuai lebarnya. Editor materi/pengumuman hanya menyediakan **Berdampingan mulai 1025 px**; pada tablet/ponsel tersedia Tulis dan Pratinjau.

Lima peran diperiksa pada 1440, 768 dan 390 px. Pembacaan DOM tidak menemukan overflow horizontal tingkat halaman pada halaman yang dicatat dalam [bukti responsif](production/phone-viewport-checks.json). Tabel data lebar yang masih memakai scroll lokal tidak dianggap sebagai overflow halaman. Pemeriksaan ini belum menggantikan uji perangkat fisik/iOS, seluruh detail halaman, atau audit aksesibilitas formal.

Koreksi 9 Oktober atas screenshot pengguna: padding baris dashboard dipulihkan menjadi 16 px; katalog, berkas, pengerjaan kuis, presensi, pratinjau impor dan daftar laporan menggunakan kartu berlabel pada ponsel. Tombol Hapus/Nonaktifkan memakai token warna, border dan tipografi UAY; tombol katalog sejajar dan label panjang dapat membungkus. Hapus katalog memakai Action bersama: konfirmasi/batal, proses, pencegahan klik ganda, error dengan baris tetap tersedia, serta pesan berhasil setelah server mengonfirmasi. Regresi tercatat pada [tes katalog](../../tests/catalog-actions.test.ts). [Pemeriksaan lanjutan](production/grace-mobile-checks.json) mencatat katalog pada 390/500/768/1440 px dan contoh peserta, presensi, kuis serta riwayat Rektor pada 390 px.

Landing dan LoginButton tidak diubah pada koreksi ini maupun commit implementasi awal. Vercel utama diperiksa langsung: daftar akun tidak muncul pada landing; tombol SSO membuka pemilih akun pada provider demo Railway. [Regresi landing](../../tests/landing-sso.test.ts) memastikan membuka landing tidak meminta daftar akun dan klik SSO hanya meminta URL otorisasi, tanpa memilih akun langsung.

59 berkas dokumentasi dipindahkan ke `guides`, `architecture`, `integrations`, `requirements` (termasuk arsip), `presentations` dan `qa`. Hash sebelum/sesudah pemindahan diperiksa agar konten dokumen historis tidak hilang. Tautan relatif, generator Word/slide/paket panduan, katalog QA dan jalur sumber portal diselaraskan. [Indeks dokumentasi](../README.md) menjadi titik masuk. Word/PDF/PPTX historis dipertahankan; tidak ditulis ulang hanya untuk perubahan direktori.

Audit jarak tambahan pada 9 Oktober memeriksa lima peran pada 320/390/600/768/1024/1440 px. Kolom ikon landing, gutter modal, margin field, pagination, filter koreksi kuis, kartu tinjauan nilai, tabel panduan, feedback dan kode proyektor diperbaiki. [Laporan dan bukti](production/spacing-audit/README.md) membedakan 504 pengukuran akhir halaman/mode, 246 pemeriksaan komponen terisolasi, serta riwayat temuan sebelum koreksi. Penerimaan staging di bawah tetap berlaku.

## Migrasi dan konfigurasi deployment

Pengumuman resmi kini disimpan di PostgreSQL (`SystemAnnouncement`) dengan audit dan notifikasi dalam transaksi. Seed contoh hanya berjalan pada demo. Migrasi Prisma wajib dijalankan sebelum API versi ini diluncurkan. JSON lama tidak otomatis diimpor saat startup; jalankan migrasi eksplisit setelah backup:

```powershell
npm run db:migrate
# FILE_JSON adalah salinan JSON lama yang sudah diverifikasi operator.
npm run db:migrate:announcements -- --file FILE_JSON
npm run db:migrate:announcements -- --file FILE_JSON --apply
```

Perintah pertama importer merupakan dry run. Impor mempertahankan ID serta waktu sumber, memvalidasi seluruh data, dan melewati ID yang sudah ada agar tidak menimpa edit yang lebih baru. Jalankan kembali untuk membuktikan idempotensi. Operator harus memverifikasi jumlah/scope/penerima setelah migrasi; importer data historis tidak mengirim ulang seluruh notifikasi masa lalu.

Sesuai koreksi pengguna pada 9 Oktober, grace sebelumnya dipertahankan: untuk `NODE_ENV=production` dan `DEMO_MODE=false`, OIDC dan File Service tetap wajib, sedangkan Redis dan secret pencabutan akun boleh belum diisi. Redis kosong/gagal memakai memori per proses, dengan log dan penanda degraded pada health; webhook tanpa secret tetap 503. Memori tidak dibagikan antar-worker dan data sesi hilang saat restart. Ini menggantikan pengetatan startup pada implementasi awal. PM2 memakai mode production dan API loopback; Nginx/HTTPS/backup/restore mengikuti [panduan VPS](../../deployment/HOSTINGER-PM2.md) dan [env native](../../deployment/.env.native.example). Aplikasi SSO dan File Service terpisah tidak diubah.

## Penerimaan staging yang masih menunggu akses

| Gate | Bukti yang harus dikumpulkan | Status |
| --- | --- | --- |
| SSO kampus nyata | Issuer/JWKS/audience/claim prodi, callback/PKCE, refresh/logout, akun nonaktif dan webhook revokasi sesi | Menunggu akses |
| File Service kampus nyata | M2M repository, upload/finalisasi/scan, MIME/checksum, unduhan privat/Range, expired link, outage dan ACL | Menunggu akses |
| Redis dan multi-instance | Sesi/revokasi/rate limit konsisten lintas worker; observabilitas grace dan pemulihan Redis; fallback memori dibatasi per proses | Menunggu akses |
| VPS/Nginx/HTTPS | Sertifikat, cookie secure, proxy/origin, PM2 restart, health SQL/Redis dan observabilitas tanpa token/PII | Menunggu akses |
| Backup/restore terisolasi | Backup terverifikasi checksum, restore ke database terpisah, pemeriksaan akses dan data hasil restore | Menunggu akses |
| Pilot 50 mahasiswa | Login bersamaan, unggah/tugas/kuis/presensi, waktu respons dan kegagalan; penerimaan dosen/admin | Belum dilakukan |
| Katalog manual tersisa | Catat per kasus/peran/environment termasuk kondisi gagal dan perangkat nyata | Belum lengkap |

**Status production baru diberikan setelah gate ini lengkap dan tidak ada penghambat keamanan, wewenang, atau alur utama.** Push repository bukan bukti deployment maupun bukti penerimaan staging.

## Pekerjaan P1/P2 lanjutan

P1 yang belum tersedia: manajemen sesi aktif, filter/ekspor pengguna, ringkasan kuota, pencarian berkas mendalam, forum kelas dan prasyarat aktivitas (`TC-FUT-001`–`006`). P2: 2FA melalui SSO, countdown link sementara, versioning binary File Service, analitik lanjut, kalender interaktif, WhatsApp/email dan sinkronisasi dua arah SIAKAD (`TC-FUT-007`–`013`). Kebutuhan tersebut dicatat sebagai backlog, bukan dilaporkan selesai melalui pengujian fitur lain.
