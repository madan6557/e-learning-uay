# Status implementasi v4.0

> Catatan ini merupakan riwayat implementasi. Untuk perubahan dan hasil verifikasi 8–9 Oktober 2026, gunakan [laporan kesiapan production](../qa/PRODUCTION-READINESS.md).

Tanggal: 13 September 2026. Sumber: `Presentation - Technical Design E-Learning UAY - v4.0.pdf` (18 halaman) dan rincian `Technical Design - E-Learning UAY - v4.0.md`.

## Cakupan yang sudah tersedia

| Area desain          | Implementasi                                                                                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identitas dan akses  | Landing publik tanpa sidebar, OIDC code + PKCE, JWT/JWKS RS256/ES256, state/nonce, refresh, cookie HttpOnly, logout ke landing, webhook pencabutan, scope prodi dan kelas. Tidak ada password lokal. Pemilih akun demo memakai callback OIDC yang sama pada local/test dan pada Railway ketika `DEMO_MODE=true`.                          |
| Ruang perkuliahan    | Course, kelas, pengampu, peserta aktif/nonaktif, self-enrollment key, pertemuan berurutan, tanggal/visibilitas, arsip terkunci dan clean clone.                                                                                                                                                                      |
| Konten               | Editor 11 blok dengan slash menu, reorder/duplikasi, sanitasi HTML, highlight kode, KaTeX, tabel, checklist, gambar, attachment dan embed origin terbatas. Materi PDF/video/praktikum/link/simulator/pertemuan daring.                                                                                               |
| Progres              | PDF menghitung halaman unik, video frontier kontinu tanpa kredit seek/replay/kecepatan tinggi, checklist dan konfirmasi unduhan dataset.                                                                                                                                                                             |
| Kuis                 | 8 tipe soal, bank soal, snapshot immutable dengan pengacakan, tanpa key di respons mahasiswa, autosave 3 detik + revision conflict, expiry server, 6 tipe otomatis dan 2 manual, mode total 100/normalisasi, publikasi hasil.                                                                                        |
| Tugas                | Teks/link/berkas, batas ukuran/format, tenggat dan cutoff, versi sebelumnya tetap disimpan, tanda terlambat, nilai/feedback manual, publikasi serta koreksi beralasan.                                                                                                                                               |
| Rekap nilai          | Bobot awal 25/15/25/25/10, total 100%, agregasi/drop-lowest, nilai offline, kontribusi progres, konversi huruf/IP UAY, draft tersembunyi, missing score perlu pengakuan, publikasi dan penguncian, koreksi tercatat. Input inline dikirim melalui satu batch atomik per layar; koreksi nilai terbit wajib beralasan. |
| Impor/ekspor         | CSV/XLSX peserta, soal dan nilai; template, preview, duplikat/format/identity checks, edit/exclude/override, validasi ulang dan commit atomik. Ekspor rekap XLSX.                                                                                                                                                    |
| Ketahanan browser    | Draf IndexedDB per pengguna, route, dan entitas; debounce sekitar satu detik, TTL 14 hari, kuota 15 MiB / 50 item, pulihkan/buang draft, guard navigasi, serta penghapusan otomatis setelah simpan server berhasil.                                                                                                  |
| Pengalaman antarmuka | PublicShell/AuthShell terpisah, navigasi responsif, fokus keyboard dan target sentuh, status simpan, toast/notice/error dengan retry, modal terkelola, tabel responsif, empty/loading state, serta profil SSO read-only yang dapat dipindai.                                                                         |
| Berkas               | Tiket upload langsung, verifikasi checksum/MIME/ukuran/scan, signed download, kepemilikan jawaban, trash/restore 7 hari, referensi clone dan perlindungan file lintas kelas.                                                                                                                                         |
| Komunikasi dan audit | Pengumuman terjadwal, notifikasi tugas/tenggat/nilai, status baca, antrean penilaian aktual, audit before/after/reason dengan trigger database append-only.                                                                                                                                                          |
| Operasional          | Migrasi PostgreSQL, data contoh idempotent, launcher lokal, health endpoint, rate limit, origin check, Docker/Nginx TLS, backup/checksum/restore dan panduan operator.                                                                                                                                               |

## Penyelarasan lingkungan UAY (18 September 2026)

| Area          | Perubahan                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tema antarmuka | Token desain diambil langsung dari `apps/admin/src/styles.css` pada repositori SSO: primary `oklch(0.44 0.106 250)`, kanvas `oklch(0.972 0.004 250)`, radius `0.5rem`, bayangan panel/raised, tipografi Inter Tight dan IBM Plex Mono. Seluruh warna hijau lama dipetakan ulang ke keluarga biru institusional dengan lightness dipertahankan; status memakai hue success/warning/danger/info milik SSO, dan ramp kategorikal memakai `--chart-1..5`. |
| Kerangka layar | Lockup merek (kotak `UAY` + nama produk), tinggi header 56 px, rail 256 px dengan item 13 px/ikon 16 px, pil status bertitik, kerapatan tabel `data-cell`, dan cincin fokus mengikuti komponen SSO. Rail dapat diperkecil seperti pada konsol SSO. Mode gelap tidak diaktifkan karena konsol SSO juga belum mengaktifkannya. |
| Penamaan basis data | Tabel dan kolom PostgreSQL berpindah ke `snake_case` dengan primary key `<entitas>_id`, mengikuti konvensi basis data SSO, sementara model Prisma tetap `PascalCase`/`camelCase` sesuai Technical Design v4.0 sub-bab 6.3. Jembatannya adalah `@map`/`@@map`. |
| Kosakata identitas | Kolom identitas memakai nama SSO: `sso_user_id`, `name`, `username`, `user_type`, `identifier_type`, `identifier_value`, `status`. Enum `UserType`, `UserStatus`, dan `IdentifierType` bernilai sama persis dengan SSO. Kontrak claim tunggal berada di `packages/shared/src/sso.ts`, menerima nama bergaya SSO dan alias lama (`role`, `student_staff_number`) selama masa transisi. |
| Kosakata audit | `audit_logs` memakai kolom `actor_user_id`, `target_type`, `target_id`, `before_data`, `after_data` seperti `audit_events` SSO, ditambah kolom `result`, `reason`, `ip_address`, `user_agent`, dan `request_id` yang sebelumnya hanya tersimpan di JSON `metadata`. |
| Keandalan lintas layanan | Kebijakan sub-bab 2.4 kini berlaku untuk SSO, bukan hanya File Service: timeout 3 detik, hingga 3 percobaan dengan jeda eksponensial untuk panggilan idempotent, dan circuit breaker 30 detik. Penukaran authorization code tidak diulang karena code bersifat sekali pakai. |

Migrasi `202609180003_sso_naming_alignment` memindahkan basis data yang sudah ada
tanpa kehilangan data. Pemetaan lengkap ada di
[contracts/SSO-DATA-MAPPING.md](../contracts/SSO-DATA-MAPPING.md).

## Perbaikan cacat pada siklus ini

1. **Halaman kelas kosong (blocker).** `classAccess` mengembalikan baris pengampu tanpa relasi `user`, sedangkan header kelas membaca `instructors[0].user.name`. Setiap pembukaan detail kelas berakhir dengan layar putih. Relasi kini di-resolve di `classAccess`, dan pembacaan nama pengampu diberi penjaga.
2. **Layar putih tanpa pemulihan.** Kesalahan render apa pun mengosongkan seluruh aplikasi. `ErrorBoundary` kini membatasi kegagalan pada satu halaman dan menawarkan muat ulang.
3. **Tab kelas tak dikenal.** `?tab=` yang tidak valid atau tidak berhak dilihat peran tersebut menghasilkan halaman kosong tanpa penjelasan; nilai tab kini dinormalisasi ke tab yang tersedia.
4. **Judul halaman melayang.** `.page-heading` memakai `space-between` untuk semua pemakaian, sehingga eyebrow dan `h1` pada halaman Notifikasi dan Hasil belajar terlempar ke sisi berlawanan. Tata letak baris kini khusus untuk `heading-with-action`.
5. **Notifikasi ganda.** Kartu notifikasi menampilkan judul dua kali ketika `message` sama dengan `title`.

## Peningkatan pengalaman pengguna

- Lencana jumlah notifikasi belum dibaca pada navigasi, menyusut menjadi titik saat rail diperkecil.
- Aksi **Tandai semua dibaca**; sebelumnya setiap notifikasi harus ditandai satu per satu.
- Rail yang dapat diperkecil dengan preferensi tersimpan per perangkat.
- Status peserta memakai pil status yang sama dengan seluruh aplikasi.
- Profil menampilkan identitas bergaya SSO: nama pengguna, jenis identitas (NIM/NIP/NIDN), jenis pengguna, dan subject SSO.

## Keputusan implementasi

- Frontend React dan backend Express tetap terpisah; dependency berat PDF/Excel serta halaman asesmen dimuat saat diperlukan. Tidak ada dependency pada database atau filesystem OMNI.
- Mutation domain dan impor memakai transaksi serializable dengan retry konflik. Ini memperkuat konsistensi terhadap concurrent submit/publikasi dibanding Read Committed pada rancangan impor awal.
- Audit merekam peristiwa bisnis dan perubahan nilai. Heartbeat video/PDF dan autosave memperbarui state progres/jawaban, tanpa menggandakan ledger setiap 3–5 detik.
- Draf lokal membantu pemulihan input; waktu kuis dan penerimaan submission tetap ditentukan server. Offline tidak memperpanjang waktu, dan progres yang tidak terverifikasi tidak diberi kredit.
- File clone mempertahankan ID objek. Menghapus objek yang dipakai kelas lain ditolak agar kelas arsip maupun kelas salinan tidak kehilangan materi.
- Identitas impor harus sudah pernah tersinkron dari SSO. Provisioning massal dari direktori kampus menunggu API sumber identitas resmi; E-Learning tidak membuat akun SSO sendiri.

## Verifikasi yang dijalankan

`npm run build`: TypeScript web/API dan bundel produksi Vite. `npm test`: aturan seluruh tipe soal, input invalid, distribusi poin, batas konversi UAY, serta anti-skip video. `npm run test:integration`: HTTP nyata + PostgreSQL 16 terpisah, mencakup flow akademik, race submit/idempotensi, draft secrecy, penguncian/koreksi nilai, audit trigger, impor, clone/arsip, SSO bertanda tangan, scan/checksum/akses/retensi berkas, dan scheduler. `npm audit`: pemeriksaan advisori dependency pada lockfile.

Hasil akhir: **build lulus, 10/10 tes domain lulus, 29/29 tes integrasi lulus, npm audit 0 kerentanan**. Pemeriksaan browser mencakup landing tanpa sidebar, login SSO biasa dan callback demo OIDC, dashboard dan profil desktop/mobile, editor materi, peserta, pengumuman, bank soal, berkas, audit, serta gradebook dengan satu tombol simpan global. Hosted demo juga diverifikasi memakai origin publik aplikasi, callback OIDC internal, dan File Service fixture.

Tes integrasi memakai service fixture dan database `_test`. Keberhasilan tes ini tidak menyatakan bahwa SSO/File Service kampus atau VPS telah diterima. Rincian matriks audit UI/UX tersedia di [UI-UX-AUDIT.md](../qa/UI-UX-AUDIT.md). Daftar periksa untuk pengujian manual per modul ada di [PANDUAN-PENGUJIAN.md](../qa/PANDUAN-PENGUJIAN.md).

## Pekerjaan yang membutuhkan pihak/lingkungan luar

1. Konfirmasi claim dan endpoint adapter dengan pemilik SSO/File Service, lalu isi secret, daftar callback/logout/webhook dan CORS.
2. Verifikasi antivirus nyata, signed URL, lifecycle dan backup binary pada File Service. Fixture pengembangan hanya mensimulasikan scan CLEAN.
3. Build/jalankan Docker pada Linux, pasang DNS/TLS, lakukan uji beban pilot dan restore database terisolasi, serta pemeriksaan UI/perangkat.
4. Finalisasi kebijakan retensi audit, penerimaan akademik dan provisioning identitas kampus.

P1/P2 yang ditetapkan sebagai pengembangan berikutnya dalam desain (misalnya forum, gamifikasi, SCORM/LTI, integrasi SIAKAD dan analitik lanjutan) tidak dinyatakan selesai. Clean clone dan ekspor rekap sudah tersedia untuk mendukung pilot.

Panduan: [menjalankan aplikasi](../../README.md), [kontrak adapter](../contracts/IMPLEMENTED-ADAPTERS.md), [deployment/backup/restore](../../deployment/README.md).

## Koreksi kebijakan dan akses — 5 Oktober 2026

Pengaturan akademik global disimpan pada PostgreSQL melalui migrasi `202610050007_academic_settings`. Super Admin mengubahnya melalui transaksi idempotensi dan audit before/after; Admin Prodi hanya membaca. Rekap memakai ambang tersimpan. Kelas baru dan hasil duplikasi memakai skala default tanpa mengubah nilai terbit.

Kode presensi hanya diberikan kepada pengelola, dengan indikator `requiresCode` untuk mahasiswa. Metadata dan tiket unduhan memakai pemeriksaan akses yang sama; parameter `resourceId` memeriksa relasi materi, peserta aktif, visibilitas dan jadwal. Jawaban hanya dapat dibaca pemilik atau pengelola kelas.

File Service diperiksa melalui adapter aktif. Kegagalan eksternal tidak beralih menjadi sukses lokal. Adapter legacy tidak mendukung daftar repositori dan mengembalikan 501. Mode lokal ditandai simulasi. Batas unggahan bersama: cover 5 MB, materi/tugas/jawaban kuis 50 MB, video 100 MB (1 MB = 1.048.576 byte). Frontend menolak ukuran berlebih sebelum membaca berkas; server memvalidasi tiket dan jumlah byte unggahan lokal/UAY.

Tampilan waktu mengikuti perangkat dengan offset sebenarnya; input jadwal dikirim sebagai UTC. Router memakai path dan mendukung pengalihan hash lama. Login lokal menggunakan provider fixture SSO; landing tidak menyediakan pemilih akun. Kelas terarsip dapat dibuka kembali oleh pengelola yang berhak.

## Konsistensi waktu — 6 Oktober 2026

Konversi input tanggal dan tanggal-jam memakai helper bersama. Tanggal form presensi berasal dari kalender perangkat, bukan potongan tanggal UTC. Waktu Mulai dan Waktu Selesai masing-masing memakai input tanggal-jam sehingga jadwal lintas tengah malam dan pengeditan dari zona berbeda tidak kehilangan tanggal. Menyimpan pengaturan tanpa perubahan jadwal mempertahankan timestamp asli, termasuk detik dan milidetik.

API presensi mewajibkan timestamp dengan `Z` atau offset, memvalidasi urutan jadwal, dan membedakan field yang tidak dikirim dari `null`. Pembaruan status/kode atau perpanjangan akhir sesi tidak lagi menghapus waktu lainnya. Pesan kegagalan ditampilkan pada form.

Migrasi `202610060008_utc_timestamp_defaults` membuat 25 default DateTime menghasilkan `CURRENT_TIMESTAMP AT TIME ZONE 'UTC'`. Kolom tetap memakai `TIMESTAMP(3)` sesuai konvensi proyek; default tidak lagi bergantung pada zona sesi PostgreSQL. Migrasi hanya mengubah default dan tidak menebak atau menggeser timestamp lama.

Build, 49 tes utama, dan 45 tes integrasi lulus. Form produksi diuji melalui React/JSDOM pada UTC+7 dan UTC+8, termasuk pergantian tahun, jadwal lintas hari, serta payload UTC saat simpan ulang. Default SQL diuji pada sesi UTC, UTC+7 dan UTC+8. Rincian: [TIME-CONSISTENCY-VERIFICATION.md](../qa/TIME-CONSISTENCY-VERIFICATION.md).

## Integrasi panduan Bantuan — 6 Oktober 2026

Halaman `/help` memakai 33 tutorial (171 langkah), 14 solusi kendala, dan 33 gambar dari `E:/UVAYA/Project/Panduan/panduan.html`. Langkah tampil sebagai daftar bernomor tanpa checkbox atau penyimpanan progres checklist. Pencarian, kategori, detail, dan pembesaran gambar mengikuti role akun; tidak ada pemilih role manual. Tabel konversi nilai memakai definisi skala produksi bersama.

Panduan umum tersedia bagi semua role. Mahasiswa menerima U1–U3 dan M1–M6; dosen U1–U3, D1–D16, A3–A4; Admin Prodi U1–U3 dan A1–A5; Super Admin U1–U3, A2–A5, S1–S3. A3–A4 merupakan alur pengelolaan peserta/impor yang dibagikan kepada dosen sesuai panduan sumber. Solusi kendala juga dibatasi menurut role. Role yang tidak dikenali tidak menerima artikel.

Importer `scripts/import-help-guide.mjs` hanya mengurai HTML dan menyalin gambar lokal; skrip, CSS, kontrol checklist, dan toolbar sumber tidak dijalankan atau disisipkan. Berkas sumber tetap utuh. Untuk memperbarui konten, jalankan `node scripts/import-help-guide.mjs "E:/UVAYA/Project/Panduan/panduan.html"`, tinjau perubahan data/gambar, lalu jalankan tes dan build. Importer menyelaraskan teks lama tentang zona waktu, batas PDF, jadwal presensi, kode 6 karakter, dan kebijakan akademik dengan implementasi sekarang. Gambar tetap berasal dari panduan sumber dan diberi keterangan bahwa nama, angka, serta tanggal merupakan contoh.

Build penuh, pemeriksaan TypeScript web, build web terakhir, dan 52 tes utama lulus. Tiga tes panduan memverifikasi daftar tutorial untuk empat role, penolakan role tidak dikenal, gambar PNG, konten tanpa kontrol checklist, pencarian lintas role, dan penutupan detail/gambar saat role berubah. Browser lokal dengan fixture Mahasiswa dan Super Admin memverifikasi kategori sesuai role, pencarian S3 yang kosong bagi mahasiswa, detail M2, gambar termuat, dan dialog pembesaran. Bukti viewport: `.local/verification/help-guide-student-viewport.jpg`.

## Penyelesaian temuan 9–14 — 6 Oktober 2026

Kartu Bantuan/kebijakan dan pilihan dosen memakai tombol dengan akses keyboard. Detail Bantuan memfokuskan judul dan mengembalikan fokus ke kartu asal. Header memiliki satu definisi dasar dengan penyesuaian seluler; CSS demo tanpa pemakai dihapus. Override `!important` tersisa untuk pengurangan animasi dan cetak. Kartu kelas memakai ikon buku yang netral. Komponen SVG logo yang tidak diimpor dihapus dan DTO pada alur yang diubah diberi tipe.

Tes isolasi prodi dan rector bridge kini menjalankan endpoint produksi serta PostgreSQL `_test`. Tes mengungkap dan mengamankan pencarian identitas Admin Prodi tanpa cakupan, autentikasi token khusus snapshot, serta urutan sesi dosen terbaru sebelum batas 50 baris. Pemetaan QA mengikuti tes integrasi tersebut.

Panduan Markdown utama diekspor dari data Bantuan serta skala produksi melalui `npm run docs:guide`; `npm run docs:guide:check` memeriksa kesesuaiannya. Dokumen operasional mengarah ke panduan utama. Istilah presensi menjadi kode 6 karakter pada aplikasi dan panduan. Build, 47 tes utama, 53 tes integrasi, 8 tes portal, serta 143 kasus otomatis QA lulus. Sebanyak 186 kasus katalog belum diuji otomatis. Pemeriksaan UI mencakup empat role dan breakpoint desktop/seluler. Rincian: [AI-SLOP-9-14-VERIFICATION.md](../qa/AI-SLOP-9-14-VERIFICATION.md).
