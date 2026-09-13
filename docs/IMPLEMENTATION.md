# Status implementasi v4.0

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

Tes integrasi memakai service fixture dan database `_test`. Keberhasilan tes ini tidak menyatakan bahwa SSO/File Service kampus atau VPS telah diterima. Rincian matriks audit UI/UX tersedia di [UI-UX-AUDIT.md](UI-UX-AUDIT.md).

## Pekerjaan yang membutuhkan pihak/lingkungan luar

1. Konfirmasi claim dan endpoint adapter dengan pemilik SSO/File Service, lalu isi secret, daftar callback/logout/webhook dan CORS.
2. Verifikasi antivirus nyata, signed URL, lifecycle dan backup binary pada File Service. Fixture pengembangan hanya mensimulasikan scan CLEAN.
3. Build/jalankan Docker pada Linux, pasang DNS/TLS, lakukan uji beban pilot dan restore database terisolasi, serta pemeriksaan UI/perangkat.
4. Finalisasi kebijakan retensi audit, penerimaan akademik dan provisioning identitas kampus.

P1/P2 yang ditetapkan sebagai pengembangan berikutnya dalam desain (misalnya forum, gamifikasi, SCORM/LTI, integrasi SIAKAD dan analitik lanjutan) tidak dinyatakan selesai. Clean clone dan ekspor rekap sudah tersedia untuk mendukung pilot.

Panduan: [menjalankan aplikasi](../README.md), [kontrak adapter](contracts/IMPLEMENTED-ADAPTERS.md), [deployment/backup/restore](../deployment/README.md).
