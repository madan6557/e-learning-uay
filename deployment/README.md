# Menjalankan dan mengoperasikan server

Target desain: Linux VPS, Docker Engine + Compose v2, PostgreSQL 16, Redis 7, Nginx dan Node.js 22. Build aplikasi diuji pada Windows; container, TLS, beban 50 mahasiswa dan restore pada VPS **belum dijalankan** di lingkungan kerja ini karena Docker/VPS tidak tersedia.

## Pengembangan dengan Docker

Dari root proyek, hentikan layanan lokal yang menggunakan port 5173/3000/3001/55432, lalu:

```bash
docker compose -f deployment/docker-compose.dev.yml up --build
```

Compose menyediakan PostgreSQL, Redis, API, Vite dan File Service demonstrasi secara terpisah. Data PostgreSQL/file menggunakan named volumes. `docker compose ... down` mempertahankan data; jangan memakai `down -v` untuk restart biasa. Mode tanpa Docker tersedia melalui `npm run dev` pada README root.

## Produksi

1. Tempatkan proyek pada VPS, misalnya `/opt/uay-elearning`. Salin `deployment/.env.example` menjadi `deployment/.env`, isi seluruh secret layanan. Password database/Redis harus URL-safe; gunakan random hex. Lindungi file dengan `chmod 600 deployment/.env`.
2. Daftarkan client OIDC, callback, logout dan webhook sesuai [kontrak adapter](../docs/contracts/IMPLEMENTED-ADAPTERS.md). Atur layanan berkas beserta origin signed URL dan CORS. Jangan gunakan fixture demonstrasi di produksi.
3. Arahkan DNS `elearning.uay.ac.id` ke VPS. Konfigurasi `nginx/prod.conf` mengacu nama ini; bila domain berbeda, sesuaikan server_name, redirect dan path sertifikat bersama APP_ORIGIN/SSO_REDIRECT_URI. Sesuaikan `frame-src` CSP jika menambah simulator pada EMBED_ALLOWED_ORIGINS.
4. Siapkan sertifikat valid terlebih dahulu di `/etc/letsencrypt/live/elearning.uay.ac.id`. Gunakan Certbot DNS challenge atau standalone saat port 80 belum digunakan. Container Nginx memerlukan sertifikat pada startup. Untuk pembaruan webroot, direktori host `/var/www/certbot` dipasang read-only ke Nginx; setelah pembaruan lakukan `docker exec uay-nginx nginx -s reload` melalui renewal hook. Kelola timer Certbot pada host.
5. Validasi konfigurasi dan jalankan dari root proyek:

```bash
docker compose --env-file deployment/.env -f deployment/docker-compose.prod.yml config --quiet
docker compose --env-file deployment/.env -f deployment/docker-compose.prod.yml build
docker compose --env-file deployment/.env -f deployment/docker-compose.prod.yml up -d
docker compose --env-file deployment/.env -f deployment/docker-compose.prod.yml ps
docker exec uay-nginx nginx -t
curl --fail https://elearning.uay.ac.id/api/health
```

Container `migrate` menerapkan migrasi sebelum API mulai. Seed demonstrasi tidak dijalankan di produksi. Database/Redis hanya berada pada network internal; hanya gateway membuka 80/443. API runtime memakai user node, filesystem read-only dan secret environment. Redis memakai password, AOF, serta kebijakan noeviction agar sesi tidak diam-diam terbuang saat memori penuh.

Log akses Nginx menghilangkan query string agar authorization code tidak masuk log. API tidak mencetak token/body request. Saat memeriksa gangguan, gunakan `docker logs --tail 100 uay-backend` dan nomor request dari UI. Jangan menyalin output `docker compose config` lengkap ke tiket karena dapat mengandung secret; gunakan `--quiet` untuk validasi.

## Backup dan restore

Backup hanya mencakup database E-Learning. Binary berkas dimiliki dan dicadangkan oleh File Service. Sesi Redis tidak wajib dipulihkan bersama database; pengguna dapat diminta login kembali setelah pemulihan.

```bash
bash deployment/scripts/backup.sh
```

Script menggunakan pg_dump custom format, gzip, checksum SHA-256, file sementara, lock untuk mencegah tumpang tindih, permission 0600, dan retensi lokal 7 hari. Kredensial dibaca di dalam container PostgreSQL. Jadwalkan template `deployment/scripts/backup.cron` pada **user crontab**, sesuaikan path dan timezone host ke Asia/Jakarta. Buat direktori `deployment/backups` sebelum memasang cron agar redirect log berhasil. Salin backup beserta sidecar checksum ke penyimpanan terpisah sesuai kebijakan kampus.

```bash
bash deployment/scripts/restore.sh deployment/backups/elearning_YYYYMMDD_HHMMSS.dump.gz
```

Restore memeriksa checksum dan gzip, meminta frasa `RESTORE-PROD`, membuat backup keadaan saat ini, menghentikan backend, lalu memakai pg_restore dalam **satu transaksi**. Jika gagal, backend tetap berhenti untuk pemeriksaan operator. Jika berhasil, script memeriksa tabel penting dan menyalakan backend kembali. Endpoint kesehatan dan flow SSO harus diperiksa setelahnya. Script ini sengaja meminta konfirmasi operator pada tindakan pemulihan yang mengganti isi database; membuat backup tidak memerlukan konfirmasi.

Latihan restore harus dilakukan pada VPS/container terisolasi sebelum penerimaan. Catat waktu restore dan verifikasi jumlah course, enrollment, submission, final grade, audit, foreign key serta kecocokan fileObjectId dengan File Service. Checksum memastikan keutuhan arsip, bukan membuktikan bahwa seluruh data bisnis benar.

## Pemeriksaan penerimaan yang memerlukan lingkungan kampus

- Login/logout, refresh dan pencabutan akun pada SSO nyata; admin prodi/dosen/mahasiswa dengan scope berbeda.
- Upload PDF, video, kode praktikum; pending/karantina antivirus; signed URL 15 menit; trash/restore dan perlindungan file jawaban.
- Satu kelas pilot 50 mahasiswa, autosave serentak, expiry kuis saat browser tertutup, dan rekonsiliasi impor 500 baris. Ukur latency, error dan memory sebelum menetapkan kapasitas VPS.
- Backup terjadwal 02:00 WIB, restore terisolasi, renewal TLS serta alarm disk/Redis/database.
- Pemeriksaan visual, keyboard dan perangkat mobile, termasuk PDF/video di browser yang digunakan kampus.

Hak akses layanan, DNS, sertifikat, secret dan kontrak kampus tidak diasumsikan tersedia. Compose dan script disiapkan untuk tahap tersebut; menjalankannya pada server produksi adalah pekerjaan penerapan tersendiri.
