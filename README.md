# E-Learning UAY

Aplikasi pembelajaran berdasarkan **Presentation – Technical Design E-Learning UAY v4.0**. React 19 + TypeScript, Express 5, Prisma, PostgreSQL 16, Redis 7. Antarmuka berbahasa Indonesia; jadwal mengikuti waktu perangkat dengan label offset zona sebenarnya (misalnya GMT+7 atau GMT+8).

> 📘 **Panduan Pengembang & Handover (Wajib Dibaca Developer):**  
> Bagi pengembang baru yang akan memelihara atau melanjutkan sistem ini, silakan baca dokumen serah terima teknis lengkap di **[HANDOVER.md](HANDOVER.md)** dan indeks dokumentasi teknis di **[docs/README.md](docs/README.md)**. Dokumen tersebut merinci arsitektur monorepo, matriks RBAC 5-peran, pembatasan wewenang penilaian dosen, tata kelola berkas, dan panduan pemecahan kendala.

Implementasi lokal sudah tersedia: pengelolaan mata kuliah/kelas/peserta, editor 11 blok, materi dan progres belajar, kuis 8 tipe, tugas berversi, penilaian dan publikasi, impor dengan rekonsiliasi, pengumuman, notifikasi, serta audit. Rincian cakupan dan bukti verifikasi ada di [status implementasi](docs/architecture/IMPLEMENTATION.md).

**Pemantauan Akademik untuk rektor** tersedia di `/rector` melalui login e-learning yang sama. Akun `RECTOR` hanya membaca laporan dan mengunduh CSV/PDF. Petunjuk demo, aktivasi role kampus, sumber data, dan batas pencatatan ada di [panduan akses rektor](docs/integrations/rector/RECTOR-INTEGRATION.md).

## Menjalankan di komputer ini

Untuk audit dengan akun lima peran dan data terpisah, jalankan `npm run dev:test` setelah PostgreSQL lokal aktif (`npm run db:local`). Mode ini memakai `elearning_visual_test`, menerapkan migrasi, dan mengisi fixture hanya saat database tersebut kosong. Data aplikasi dan database integrasi `elearning_test` tetap terpisah. Gunakan satu launcher pada port lokal yang sama.

Bukti perbaikan, pemeriksaan per peran, serta pekerjaan staging yang masih menunggu akses tercatat pada [laporan kesiapan](docs/qa/PRODUCTION-READINESS.md).

Prasyarat: **Node.js 22.12 atau lebih baru**, npm, koneksi internet untuk instalasi awal. Docker tidak diperlukan untuk mode lokal.

```powershell
npm ci
npm run db:generate
npm run dev
```

Perintah `dev` menyalin `.env.example` jika `.env` belum ada, menyalakan PostgreSQL lokal, menerapkan migrasi, mengisi data contoh satu kali, lalu menyalakan API, Vite, File Service, dan provider SSO lokal. Launcher menggunakan `AUTH_MODE=oidc`, termasuk jika `.env` lama masih menyebut `development`.

Buka **http://127.0.0.1:5173/** untuk landing publik. Klik **Masuk dengan SSO UAY**, lalu pilih akun fixture pada provider SSO lokal. Alur ini melewati authorization code, PKCE, state/nonce, JWT/JWKS dan callback OIDC yang sama. Dashboard baru muncul setelah login berhasil. Kelas contoh adalah **IF2101 – Pemrograman Web / Kelas A**. Gunakan alamat `127.0.0.1` secara konsisten agar origin, cookie, dan upload cocok.

| Layanan lokal            | Alamat / lokasi                             |
| ------------------------ | ------------------------------------------- |
| Antarmuka                | `http://127.0.0.1:5173`                     |
| API / kesehatan          | `http://127.0.0.1:3000/api/health`          |
| File Service demonstrasi | `http://127.0.0.1:3001`                     |
| Provider SSO lokal       | `http://127.0.0.1:4402`                     |
| PostgreSQL 16            | `127.0.0.1:55432`                           |
| Data persisten           | `.local/postgres`, `.local/file-service`    |
| Konfigurasi lokal        | `.env` — jangan masukkan ke version control |

`Ctrl+C` menghentikan launcher. Database yang sudah berjalan sebelum launcher tetap merupakan proses terpisah. Data tidak direset saat restart atau seed ulang. Landing menggunakan tombol SSO tanpa pemilih akun. `DEMO_MODE` mengatur ketersediaan fixture demonstrasi. Pada Railway, `DEMO_MODE=true` secara eksplisit menyalakan fixture OIDC dan File Service untuk demonstrasi tanpa layanan kampus; mode ini tidak menggunakan kredensial kampus. Jika frontend staging memakai Vercel, gunakan gateway same-origin `/api/*` dan konfigurasi `APP_ORIGIN`, `API_ORIGIN`, serta `RAILWAY_API_ORIGIN` seperti di [panduan Railway](deployment/RAILWAY.md). Production VPS menggunakan satu domain dan gateway Nginx seperti di [panduan VPS](deployment/README.md). Saat `DEMO_MODE=false`, konfigurasi SSO dan File Service tetap wajib; grace sebelumnya mengizinkan Redis dan secret webhook belum diisi. Redis kosong/gagal memakai memori per proses dan dicatat pada log/health; webhook tanpa secret tetap 503. Endpoint login development hanya tersedia pada mode pengujian backend yang secara eksplisit memakai `AUTH_MODE=development`; UI tidak menggunakannya.

## Pemeriksaan & Kualitas Kode

```powershell
npm run typecheck       # Verifikasi tipe TypeScript (API & Web) tanpa emit
npm test                # Menjalankan 87+ unit dan domain test suites
npm run check           # Kompilasi build penuh dan pengujian aturan domain
npm run test:integration # Tes integrasi HTTP dengan mock DB terpisah
npm audit
```

`check` menghasilkan build web/API dan menjalankan tes aturan domain. Tes integrasi membutuhkan PostgreSQL lokal aktif (`npm run dev` atau `npm run db:local` pada terminal lain), memakai database terpisah `elearning_test`, dan menjalankan fixture HTTP untuk OIDC dan File Service. Override dengan `TEST_DATABASE_URL` yang nama databasenya berakhiran `_test`. Tes tidak membersihkan database aplikasi. Data pengujian memakai ID unik dan tersimpan hanya di database uji.

Untuk pengujian manual, [panduan pengujian](docs/qa/PANDUAN-PENGUJIAN.md) memuat daftar periksa langkah demi langkah per modul beserta hasil yang diharapkan.

**Portal pengujian interaktif v5:** jalankan `npm run qa`, lalu buka **http://127.0.0.1:5174/**. Katalog 354 kasus disusun **P0/P1/P2 → Role**, dengan langkah, hasil manual, bukti otomatis, ringkasan progres, serta perbandingan hasil. Jalankan `npm run qa:run` atau tombol **Jalankan otomatis** untuk memperbarui bukti. Lihat [panduan portal QA](docs/qa/README.md).

Menu **Bantuan** memuat tutorial, gambar, dan solusi kendala sesuai lima peran akun, termasuk Rektor. Tautan **Buka buku panduan (tab baru)** membuka `/Panduan/panduan.html` dengan isi mengikuti sesi akun dan langkah bernomor tanpa checklist. [Panduan penggunaan utama](docs/guides/BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md) diekspor dari konten Bantuan dan definisi skala nilai yang sama. Jalankan `npm run docs:guide` setelah memperbarui konten, lalu `npm run docs:guide:check` untuk memastikan dokumen masih sesuai.

Panduan 11 blok dan tag teks, prompt AI, serta contoh JSON artikel tersedia pada
**Panduan & artikel AI** di editor Materi teks/Praktikum. Berkas sumber yang bisa
diunduh: [panduan artikel](apps/web/public/authoring/panduan-artikel.html),
[prompt AI](apps/web/public/authoring/prompt-artikel-ai.txt), dan
[contoh JSON](apps/web/public/authoring/template-artikel.json). Impor menambahkan
blok ke draf tanpa menimpa isi atau pengaturan publikasi; media ditambahkan
melalui editor sesudah impor.

Pada Windows, hentikan proses API sebelum menjalankan `db:generate`/`build` apabila Prisma melaporkan DLL sedang dipakai. Jika port sibuk, gunakan proses lokal yang sudah berjalan atau hentikan proses proyek yang bersangkutan; jangan menghapus direktori data.

## Alur mencoba

1. Masuk sebagai dosen, buka kelas, tambah pertemuan/materi atau edit kuis. Atur visibilitas dan rentang waktunya sebelum menerbitkan.
2. Masuk sebagai mahasiswa, buka materi, kerjakan kuis, lalu kirim tugas. Gunakan akun berbeda untuk memeriksa pemisahan akses. Jawaban kuis tersimpan ke server setiap 3 detik dan draf lokal setiap 2 detik.
3. Kembali sebagai dosen, nilai uraian/berkas, periksa rekap, lalu publikasikan nilai. Nilai draf belum ditampilkan kepada mahasiswa. Nilai akhir yang terbit dikunci; koreksi membutuhkan alasan dan tercatat dalam audit.
4. Gunakan menu impor pada peserta, bank soal, atau rekap. Unduh template, unggah CSV/XLSX, perbaiki/abaikan konflik, lalu konfirmasi data yang siap.
5. Arsipkan kelas untuk mengunci perubahan. Duplikasi kelas menyalin materi dan soal ke draf semester baru tanpa peserta, jawaban, progres, nilai, dan tenggat lama.

## Struktur dan batas layanan

- `apps/web`: antarmuka React dan IndexedDB untuk draf lokal.
- `apps/api`: otorisasi, domain akademik, adapter SSO/File Service, worker jadwal.
- `packages/shared`: validasi blok/soal, aturan nilai/progres, teks antarmuka.
- `packages/db`: skema Prisma, migrasi, dan seed contoh.
- `deployment`: Docker, Nginx TLS, backup dan restore.
- `tests`: pengujian domain, akses lintas pengguna, akademik, OIDC dan berkas.

SSO memiliki identitas dan kredensial. E-Learning menyimpan referensi identitas dan sesi opaque; password pengguna tidak disimpan. File Service memiliki seluruh binary; API E-Learning menyimpan ID dan metadata terverifikasi. Fixture lokal menyimpan file di direktorinya sendiri dan **tidak melakukan antivirus nyata**.

Endpoint baca `/api/v1/integrations/rector/snapshot` menerima sesi Super Admin atau token khusus yang dikonfigurasi melalui `RECTOR_BRIDGE_TOKEN`, pada header `Authorization: Bearer ...` atau `X-Rector-Bridge-Token`. Tanpa konfigurasi token tersebut, hanya sesi Super Admin yang diterima. Token tidak memakai secret SSO atau nilai bawaan.

## Menghubungkan layanan kampus dan VPS

Baca [kontrak adapter](docs/contracts/IMPLEMENTED-ADAPTERS.md), [panduan deployment VPS](deployment/README.md), atau [panduan Railway](deployment/RAILWAY.md). Kontrak yang dipakai adapter sudah diuji dengan fixture, tetapi penyelarasan pemilik SSO/File Service masih [terbuka](docs/contracts/SSO-File-Service-Questions.md). Kredensial kampus, DNS/TLS, antivirus File Service, pengujian lintas layanan nyata, uji beban pilot, dan latihan restore pada VPS masih diperlukan sebelum penerimaan produksi.

## Produksi VPS Hostinger

Deployment tanpa Docker menggunakan PM2 dan Nginx: lihat [panduan Hostinger](deployment/HOSTINGER-PM2.md).
