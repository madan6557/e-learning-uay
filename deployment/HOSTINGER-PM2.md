# Produksi VPS Hostinger dengan PM2 (tanpa Docker)

Target: Ubuntu 24.04 LTS, Node.js 22 LTS (minimal 22.12), npm, PostgreSQL 16,
Redis 7, Nginx, PM2, dan Certbot. Pasang lewat sumber resmi dan jalankan aplikasi
sebagai user khusus `uay`. PostgreSQL/Redis/API hanya bind loopback;
firewall membuka SSH, 80 dan 443. Sesuaikan kapasitas setelah pengujian pilot.

## Konfigurasi awal

1. Clone proyek ke `/opt/uay-elearning`, dimiliki user `uay`.
2. Siapkan database `elearning_prod` beserta user/password terpisah. Aktifkan
   password Redis, persistence AOF, dan `maxmemory-policy noeviction` untuk sesi.
3. Salin `deployment/.env.native.example` menjadi `.env` di root proyek,
   isi secret asli, dan `chmod 600 .env`. Aplikasi membaca file ini saat mulai.
   Jangan memasukkan secret ke ecosystem PM2. Daftarkan callback OIDC
   `https://DOMAIN/api/v1/auth/callback` dan logout `https://DOMAIN` di SSO.
4. `FILE_SERVICE_URL` menunjuk layanan berkas resmi; `FILE_ALLOWED_ORIGINS`
   mencakup origin signed download/upload URL dari layanan itu. Railway S3
   pada mode demo belum menyediakan antivirus untuk produksi kampus.
5. Install PM2 dari npm sebagai tooling server (`npm install -g pm2`).

```bash
cd /opt/uay-elearning
npm ci
npm run build
npm run db:migrate
npm run start:prod
pm2 save
pm2 startup
```

Jalankan perintah sudo yang dicetak `pm2 startup` untuk user `uay`, lalu `pm2 save`.
Jangan menjalankan `db:seed` atau runtime Railway di produksi. PM2 memakai satu
instance agar scheduler kuis/notifikasi tidak digandakan. API mengirim sinyal
ready kepada PM2 setelah port siap; SIGINT/SIGTERM menutup server dan koneksi.
Atur rotasi log PM2/logrotate dan monitoring disk, memory, database, serta Redis.

## Nginx dan HTTPS

Salin `deployment/nginx/hostinger.conf` ke sites-available, sesuaikan domain/path,
lalu aktifkan symlink pada sites-enabled. Pastikan user Nginx dapat membaca
`apps/web/dist`. Arahkan DNS A/AAAA ke VPS sebelum memperoleh sertifikat.

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d elearning.example.ac.id --redirect
sudo certbot renew --dry-run
curl --fail https://elearning.example.ac.id/api/health
```

Certbot memasang HTTPS/redirect; aplikasi memakai origin HTTPS. Jangan membuka
port 3000 ke publik. SPA fallback menyajikan index.html untuk URL kelas/tugas,
sementara `/api/` menuju API dan asset yang hilang menghasilkan 404.
Log akses tidak merekam query string callback SSO/tiket berkas.

## Pembaruan

Buat backup database terlebih dahulu dan catat commit sebelumnya, kemudian:

```bash
cd /opt/uay-elearning
git pull --ff-only
npm ci
npm run build
npm run db:migrate
npm run reload:prod
pm2 save
curl --fail https://elearning.example.ac.id/api/health
```

Build selesai sebelum migrasi dan reload. Migrasi tidak kompatibel memerlukan
maintenance window. Rollback kode hanya aman jika schema tetap kompatibel.
`npm start` hanya menjalankan API yang sudah dibuild, tanpa migrasi atau seed.
Jangan mengisi `VITE_API_URL`/`RAILWAY_API_ORIGIN` di VPS: frontend memakai API
pada domain yang sama. Script backup/restore native ada pada `deployment/scripts/`.
Latih restore di database terisolasi sebelum go-live.
Script native memakai `DB_NAME=elearning_prod`, `DB_USER=postgres` (user OS
untuk sudo PostgreSQL), dan `DB_OWNER=elearning` (pemilik objek database saat
restore). Sesuaikan jika nama akun berbeda. Jalankan restore sebagai user `uay`
yang mengelola PM2 dan memiliki izin sudo PostgreSQL. Backup lokal berada di
`deployment/backups/`; salin juga ke penyimpanan di luar VPS.

Verifikasi SSO resmi, upload/scan, back/forward, refresh deep link, expiry kuis,
backup/restore dan akses mahasiswa/dosen/admin pada VPS sebelum penerimaan.
Dokumen dan konfigurasi ini disiapkan dari lingkungan Windows; Nginx, systemd,
TLS dan PM2 di VPS Hostinger belum dijalankan.
