# Panduan Deployment VPS Hostinger dengan PM2 (Tanpa Docker)

Panduan ini ditujukan untuk **Tim VPS / Infrastruktur** yang akan melakukan deployment E-Learning UAY di VPS Hostinger.

## Ringkasan Lingkungan Deployment
- **Target OS**: Ubuntu 22.04 LTS / 24.04 LTS
- **Runtime**: Node.js **>= 22.12** & npm
- **Process Manager**: PM2 (`npm install -g pm2`)
- **Database**: PostgreSQL 15 atau 16
- **Reverse Proxy**: Nginx (direkomendasikan) atau direct port 3000
- **Mode Sistem**: **Mode Uji / Pilot** (`DEMO_MODE=true`, `AUTH_MODE=development`)
- **Penyimpanan Berkas**: **Lokal Disk VPS** (`FILE_STORAGE_DRIVER=local`, direktori `./uploads`), tanpa AWS S3 / tanpa layanan file eksternal.

---

## Langkah Deployment Cepat (Manual)

### 1. Prasyarat di VPS
Pastikan Node.js 22, PostgreSQL, dan PM2 telah terpasang:
```bash
# Cek versi Node.js (harus >= 22.12)
node -v

# Install PM2 secara global jika belum ada
npm install -g pm2
```

### 2. Siapkan Database PostgreSQL
Buat user dan database di PostgreSQL:
```bash
sudo -u postgres psql
```
```sql
CREATE USER uay WITH ENCRYPTED PASSWORD 'password_database_anda';
CREATE DATABASE elearning OWNER uay;
GRANT ALL PRIVILEGES ON DATABASE elearning TO uay;
\q
```

### 3. Clone Repositori
```bash
# Clone ke direktori aplikasi (misal: /var/www/e-learning)
git clone https://github.com/UAY-System/e-learning.git /var/www/e-learning
cd /var/www/e-learning
```

### 4. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
chmod 600 .env
```
Buka dan sesuaikan `.env`:
```env
NODE_ENV=production
PORT=3000
API_HOST=0.0.0.0
TRUST_PROXY=1

# PENTING: APP_ORIGIN harus sama persis dengan URL yang diakses browser
# Contoh jika memakai IP VPS: http://194.233.xx.xx:3000
# Contoh jika memakai Domain: https://elearning.uay.ac.id
APP_ORIGIN=http://194.233.xx.xx:3000
API_ORIGIN=http://194.233.xx.xx:3000

# Kredensial Database
DATABASE_URL=postgresql://uay:password_database_anda@127.0.0.1:5432/elearning?schema=public

# Mode Uji Coba (Tester & Akun Demo Aktif Langsung)
DEMO_MODE=true
AUTH_MODE=development

# Penyimpanan Berkas Lokal di VPS (Tanpa S3)
FILE_STORAGE_DRIVER=local
UPLOAD_DIR=./uploads
```

> ⚠️ **Catatan Penting CSRF & Origin**: Nilai `APP_ORIGIN` harus cocok dengan URL yang dibuka pengguna di peramban. Jika berbeda, sistem pengamanan API akan memblokir request POST/PUT dengan status `403 INVALID_ORIGIN`.

### 5. Install Dependensi, Migrasi DB & Seed Data
```bash
# Install paket
npm install

# Buat direktori berkas upload
mkdir -p uploads

# Generate Prisma Client & Migrasi Database
npm run db:generate
npm run db:migrate

# Seed data akun uji & kelas contoh
npm run db:seed
```
*Catatan:* `npm run db:seed` aman dijalankan berulang (idempoten) dan otomatis menyiapkan akun tester:
- **Super Admin**: NIP `ADM001`
- **Admin Prodi Informatika**: NIP `ADMIF01`
- **Dosen**: NIDN `1112089001`
- **Mahasiswa**: NIM `202601001` s/d `202601010` (10 mahasiswa terdaftar aktif)

### 6. Build Aplikasi Web & API
```bash
npm run build:web
npm run build:api
```
*(Atau cukup jalankan `npm run build`)*

### 7. Jalankan dengan PM2
```bash
# Menjalankan aplikasi dengan konfigurasi ekosistem produksi
pm2 start ecosystem.config.cjs --env production

# Simpan state PM2 agar otomatis berjalan saat VPS reboot
pm2 save
pm2 startup
```
Jalankan baris perintah `sudo env PATH=...` yang ditampilkan oleh output `pm2 startup`.

Periksa status aplikasi:
```bash
pm2 status
pm2 logs elearning-uay
curl -i http://127.0.0.1:3000/api/health
```
Output `curl` harus menghasilkan `{"status":"ok","service":"elearning-uay","version":"0.1.0"}`.

---

## Opsi Nginx & HTTPS (Reverse Proxy)

Jika menggunakan domain dan sertifikat SSL/HTTPS, gunakan konfigurasi Nginx yang telah disiapkan di `deployment/nginx/hostinger.conf`:
```bash
sudo cp deployment/nginx/hostinger.conf /etc/nginx/sites-available/elearning
# Sesuaikan server_name dan path direktori di file tersebut jika berbeda
sudo nano /etc/nginx/sites-available/elearning

sudo ln -s /etc/nginx/sites-available/elearning /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Pasang SSL gratis dengan Certbot
sudo certbot --nginx -d elearning.uay.ac.id
```

---

## Opsi CI/CD Otomatis (GitHub Actions)

Workflow GitHub Actions sudah tersedia di `.github/workflows/deploy.yml`. Jika tim VPS ingin deployment berjalan otomatis setiap kali ada `git push` ke branch `main`:
Tambahkan **Repository Secrets** di menu GitHub repo (`Settings` > `Secrets and variables` > `Actions`):
- `HOSTINGER_HOST`: IP publik VPS
- `HOSTINGER_SSH_KEY`: Private SSH Key (atau `HOSTINGER_PASSWORD`)
- `HOSTINGER_USERNAME`: `root` atau user VPS (misal `uay`)
- `HOSTINGER_APP_DIR`: `/var/www/e-learning`
- `HOSTINGER_PORT`: `22` (opsional)

---

## Pemeliharaan & Update Rutin
Jika ada pembaruan kode di kemudian hari:
```bash
cd /var/www/e-learning
git pull origin main
npm install
npm run db:generate
npm run db:migrate
npm run build:web
npm run build:api
pm2 reload elearning-uay
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
