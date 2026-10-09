# Deployment production kampus dengan PM2 dan Nginx

Panduan ini untuk production kampus, menggunakan Node.js >=22.12, PostgreSQL 15/16, Redis, OIDC kampus dan File Service nyata. Mode uji lokal dijalankan terpisah melalui `npm run db:local` dan `npm run dev:test`. Jangan menjalankan seed atau fixture SSO/File Service pada database production.

## Konfigurasi

Salin `deployment/.env.native.example` menjadi `.env` di root proyek, batasi izin menjadi 600, lalu isi nilai nyata. `DEMO_MODE=false`, `AUTH_MODE=oidc` dan HTTPS tetap wajib. Daftarkan callback backend `https://DOMAIN/api/v1/auth/callback` pada penyedia OIDC. Untuk klien PKCE public, `SSO_CLIENT_SECRET` boleh kosong. Grace sebelumnya dipertahankan: `REDIS_URL` dan `SSO_WEBHOOK_SECRET` boleh belum diisi tanpa menggagalkan startup atau pre-flight. Webhook pencabutan akun tetap mengembalikan 503 sampai secret dikonfigurasi; ketika diaktifkan, gunakan secret yang sama di kedua layanan.

Gunakan Redis khusus dengan autentikasi dan akses jaringan terbatas untuk sesi dan pembatasan akses lintas worker. Ketika Redis belum diisi atau tidak tersedia, grace memakai memori dan mencatat kondisi pada log/health. Memori hanya berlaku pada satu proses; data sesi hilang setelah proses dimulai ulang dan tidak dibagikan antar-worker. File Service tetap wajib memiliki kunci dan origin yang diizinkan. Penyimpanan lokal dan dokumen pengganti tidak digunakan sebagai pemulihan kegagalan layanan nyata.

PM2 menjalankan `elearning-uay`, memaksa `NODE_ENV=production` dan `DEMO_MODE=false`, dengan default API `127.0.0.1:3000`. Port API tidak perlu dibuka ke internet. Nginx menerima trafik publik dan mengganti header proxy; `TRUST_PROXY=1` hanya sesuai untuk satu proxy tepercaya langsung di depan API.

## Instalasi dan pembaruan

Dari root checkout deployment yang telah ditinjau:

```bash
npm ci
npm run typecheck
npm run build
npm test
npm audit
# Ambil backup database sebelum migrasi.
npm run db:migrate
npm run start:prod
pm2 save
```

Untuk pembaruan aplikasi yang telah lolos staging, gunakan `npm run reload:prod`. Simpan checkout/build sebelumnya untuk rollback aplikasi. Jangan membalik migrasi database secara spontan; gunakan backup terverifikasi dan rencana pemulihan jika perubahan data tidak kompatibel.

## Migrasi pengumuman lama

Pengumuman sekarang berada di tabel `system_announcements`. Backup JSON lama dan database terlebih dahulu. Migrasi tidak otomatis dijalankan saat server mulai, tidak mengubah record yang telah ada, serta mempertahankan ID dan waktu sumber.

```bash
npm run db:migrate:announcements -- --file /PATH/system-announcements.json
# Tinjau jumlah dan hasil validasi sebelum penerapan.
npm run db:migrate:announcements -- --file /PATH/system-announcements.json --apply
```

Pengulangan `--apply` aman dan melaporkan jumlah record yang dilewati. JSON tidak dihapus. Impor tidak mengirim notifikasi massal ulang. Validasi gagal menghentikan seluruh impor; perbaiki sumber, lalu ulangi. Contoh pengumuman hanya berasal dari seed mode uji.

## Nginx dan HTTPS

Sesuaikan domain dan root checkout di `deployment/nginx/hostinger.conf`. Template HTTP adalah tahap bootstrap untuk penerbitan sertifikat; production harus menggunakan HTTPS dengan redirect HTTP ke HTTPS. Setelah memasang sertifikat melalui mekanisme resmi infrastruktur, jalankan `nginx -t`, reload Nginx, dan verifikasi perpanjangan sertifikat. Pertahankan akses log tanpa query string agar kode callback dan tiket tidak masuk log.

Nginx meneruskan `/api/` ke `127.0.0.1:3000`; aset Vite berada di `apps/web/dist`. Batas body 50 MB perlu diselaraskan dengan kebijakan upload jika berkas dikirim melalui API. Berkas yang menggunakan tiket File Service langsung mengikuti batas layanan tersebut. Pastikan header Host dan X-Forwarded-Proto berasal dari proxy tepercaya dan origin browser cocok dengan APP_ORIGIN.

## Kesehatan, backup dan penerimaan

`GET /api/health` mengembalikan 200 jika PostgreSQL siap dan 503 jika database gagal. Grace Redis tidak menggagalkan health: respons menandai `degraded: true`, `checks.redis` sebagai `not_configured`/`unavailable`, dan `checks.sessionStore: memory`. `checks.revocationWebhook` menunjukkan apakah secret sudah diisi, bukan bukti webhook nyata telah diuji. Pemeriksaan ini tidak membuktikan SSO atau File Service; periksa `/api/v1/files/health` menggunakan sesi yang berwenang, serta login/upload/download nyata. Pantau kondisi degraded, 5xx, kegagalan dependency, latensi dan kapasitas PostgreSQL/Redis.

`deployment/scripts/backup-native.sh` membuat dump terkompresi dan checksum dengan izin terbatas. Simpan salinan terenkripsi di luar VPS dan uji restore ke database terisolasi, tanpa menghentikan production. `restore-native.sh` adalah prosedur penggantian database yang memerlukan konfirmasi operator, backup sebelum pemulihan dan penghentian proses `elearning-uay`; jangan gunakan skrip itu untuk latihan restore terisolasi.

Status production menunggu bukti staging: SSO/File Service nyata, pencabutan sesi, Redis gagal/pulih, HTTPS, backup/restore terisolasi, serta pilot 50 mahasiswa. Gunakan [laporan kesiapan](../docs/qa/PRODUCTION-READINESS.md).
