# E-Learning UAY

Aplikasi pembelajaran berdasarkan **Presentation – Technical Design E-Learning UAY v4.0**. React 19 + TypeScript, Express 5, Prisma, PostgreSQL 16, Redis 7. Antarmuka berbahasa Indonesia; jadwal ditampilkan dalam WIB.

Implementasi lokal sudah tersedia: pengelolaan mata kuliah/kelas/peserta, editor 11 blok, materi dan progres belajar, kuis 8 tipe, tugas berversi, penilaian dan publikasi, impor dengan rekonsiliasi, pengumuman, notifikasi, serta audit. Rincian cakupan dan bukti verifikasi ada di [status implementasi](docs/IMPLEMENTATION.md).

## Menjalankan di komputer ini

Prasyarat: **Node.js 22.12 atau lebih baru**, npm, koneksi internet untuk instalasi awal. Docker tidak diperlukan untuk mode lokal.

```powershell
npm ci
npm run db:generate
npm run dev
```

Perintah `dev` menyalin `.env.example` jika `.env` belum ada, menyalakan PostgreSQL lokal, menerapkan migrasi, mengisi data contoh satu kali, lalu menyalakan API, Vite, File Service, dan provider SSO lokal. Launcher menggunakan `AUTH_MODE=oidc`, termasuk jika `.env` lama masih menyebut `development`.

Buka **http://127.0.0.1:5173/** untuk landing publik. Pilih **Masuk dengan SSO UAY** atau akun pada **Mode uji cepat**. Kedua cara melewati authorization code, PKCE, state/nonce, JWT/JWKS dan callback OIDC yang sama. Dashboard baru muncul setelah login berhasil. Kelas contoh adalah **IF2101 – Pemrograman Web / Kelas A**. Gunakan alamat `127.0.0.1` secara konsisten agar origin, cookie, dan upload cocok.

| Layanan lokal            | Alamat / lokasi                             |
| ------------------------ | ------------------------------------------- |
| Antarmuka                | `http://127.0.0.1:5173`                     |
| API / kesehatan          | `http://127.0.0.1:3000/api/health`          |
| File Service demonstrasi | `http://127.0.0.1:3001`                     |
| Provider SSO lokal       | `http://127.0.0.1:4402`                     |
| PostgreSQL 16            | `127.0.0.1:55432`                           |
| Data persisten           | `.local/postgres`, `.local/file-service`    |
| Konfigurasi lokal        | `.env` — jangan masukkan ke version control |

`Ctrl+C` menghentikan launcher. Database yang sudah berjalan sebelum launcher tetap merupakan proses terpisah. Data tidak direset saat restart atau seed ulang. `DEMO_MODE=false` menyembunyikan pemilih akun pada landing. Pada Railway, `DEMO_MODE=true` secara eksplisit menyalakan fixture OIDC dan File Service untuk demonstrasi tanpa layanan kampus; mode ini tidak menggunakan kredensial kampus. Saat `DEMO_MODE=false`, konfigurasi SSO, Redis, File Service, dan webhook production wajib diisi. Endpoint login development hanya tersedia pada mode pengujian backend yang secara eksplisit memakai `AUTH_MODE=development`; UI tidak menggunakannya.

## Pemeriksaan

```powershell
npm run check
npm run test:integration
npm audit
```

`check` menghasilkan build web/API dan menjalankan tes aturan domain. Tes integrasi membutuhkan PostgreSQL lokal aktif (`npm run dev` atau `npm run db:local` pada terminal lain), memakai database terpisah `elearning_test`, dan menjalankan fixture HTTP untuk OIDC dan File Service. Override dengan `TEST_DATABASE_URL` yang nama databasenya berakhiran `_test`. Tes tidak membersihkan database aplikasi. Data pengujian memakai ID unik dan tersimpan hanya di database uji.

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

## Menghubungkan layanan kampus dan VPS

Baca [kontrak adapter](docs/contracts/IMPLEMENTED-ADAPTERS.md), [panduan deployment VPS](deployment/README.md), atau [panduan Railway](deployment/RAILWAY.md). Kontrak yang dipakai adapter sudah diuji dengan fixture, tetapi penyelarasan pemilik SSO/File Service masih [terbuka](docs/contracts/SSO-File-Service-Questions.md). Kredensial kampus, DNS/TLS, antivirus File Service, pengujian lintas layanan nyata, uji beban pilot, dan latihan restore pada VPS masih diperlukan sebelum penerimaan produksi.
