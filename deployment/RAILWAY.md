# Live Development: Railway + Vercel

Panduan ini hanya untuk lingkungan live development atau staging yang memakai frontend Vercel dan API Railway. Vercel menyediakan gateway `/api/*` yang meneruskan request ke Railway. Dengan pola ini cookie sesi tetap berada pada domain frontend dan callback OIDC kembali ke domain frontend.

Ini bukan topologi production VPS. Production mengikuti [panduan VPS PM2](HOSTINGER-PM2.md): Nginx menyajikan SPA pada `/` dan meneruskan `/api/*` ke backend pada domain yang sama. Dengan demikian production tidak memakai `RAILWAY_API_ORIGIN`, `VITE_API_URL`, atau gateway Vercel.

## Sambungkan dua domain

Untuk memeriksa request lambat, buka Network → Timing di DevTools. Respons JSON
menyertakan `Server-Timing`: `auth` untuk pemeriksaan sesi, `api` untuk total
pemrosesan backend, dan `upstream` untuk perjalanan dari gateway Vercel sampai
respons Railway selesai diterima. Durasi tersebut bertumpang tindih; jangan
dijumlahkan. Jika `upstream` jauh lebih besar daripada `api`, periksa jalur
gateway, lokasi layanan, atau proses startup. Jika `api` besar, periksa database
dan pemrosesan backend.

Browser menggunakan cache di memori selama 10–30 detik untuk daftar kelas,
ringkasan dashboard, detail kelas, nilai, dan notifikasi. Permintaan identik yang
sedang berjalan digabungkan. Setiap operasi tulis, logout, sesi kedaluwarsa, atau
reload data membersihkan cache. Status pengerjaan kuis/tugas, identitas, audit,
dan URL akses file tetap mengambil data baru. Pemindaian notifikasi umum berjalan
setiap 60 detik; kedaluwarsa percobaan kuis dan publikasi nilai tetap diperiksa
setiap 5 detik.

1. Aktifkan domain HTTPS untuk service aplikasi Railway dan salin domain tersebut, misalnya `https://elearning-api-production.up.railway.app`.
2. Tetapkan domain Vercel yang dipakai pengguna sebagai `APP_ORIGIN`, misalnya `https://e-learning-uay.vercel.app`.
3. Pada **Railway**, set `API_ORIGIN` ke domain Railway dari langkah 1.
4. Pada **Vercel**, tambahkan environment variable `RAILWAY_API_ORIGIN` dengan nilai domain Railway yang sama, lalu redeploy Vercel. Fungsi `api/[...path].js` akan meneruskan `/api/*`; tidak ada URL Railway yang ditanam di bundle React.

Kedua nilai harus menggunakan `https://` dan tanpa garis miring terakhir. Jangan menggunakan `VITE_API_URL` untuk arsitektur ini, karena browser harus selalu memanggil `/api/*` pada domain Vercel agar cookie sesi bersifat same-origin.

## Demo tanpa layanan kampus

Saat SSO, Redis, dan File Service UAY belum tersedia, gunakan variabel berikut pada **service aplikasi Railway**:

| Variabel | Nilai |
| --- | --- |
| `NODE_ENV` | `production` |
| `AUTH_MODE` | `oidc` |
| `DEMO_MODE` | `true` |
| `APP_ORIGIN` | domain frontend Vercel |
| `API_ORIGIN` | domain HTTPS service aplikasi Railway |
| `DATABASE_URL` | reference URL PostgreSQL Railway |

Tambahkan `RAILWAY_API_ORIGIN` dengan nilai `API_ORIGIN` yang sama pada environment production di Vercel. Runtime demo menyalakan fixture OIDC dan File Service internal, mengisi akun contoh secara idempoten, dan memublikasikan fixture melalui domain Railway. Redis, webhook, serta kredensial SSO dan File Service kampus tidak diperlukan.

Alur yang dipakai adalah: browser meminta URL otorisasi lewat `Vercel /api/auth/authorization`, lalu langsung berpindah ke `Railway /demo-sso/authorize` dan kembali ke `Vercel /auth/callback` sebelum dashboard. Endpoint API tidak tampil sebagai URL transisi pada address bar. Pilihan akun demo tetap melalui authorization code, PKCE, state, nonce, token, JWKS, callback, dan sesi yang sama dengan alur OIDC produksi.

## Staging dengan layanan kampus

Gunakan variabel dasar berikut pada Railway:

| Variabel | Nilai / sumber |
| --- | --- |
| `NODE_ENV` | `production` |
| `AUTH_MODE` | `oidc` |
| `DEMO_MODE` | `false` |
| `APP_ORIGIN` | domain HTTPS frontend Vercel atau domain kampus |
| `API_ORIGIN` | domain HTTPS service API Railway |
| `DATABASE_URL` | reference URL PostgreSQL Railway |
| `REDIS_URL` | reference URL Redis Railway |
| `SSO_ISSUER` | issuer HTTPS SSO kampus |
| `SSO_CLIENT_ID` | client ID OIDC yang terdaftar |
| `SSO_CLIENT_SECRET` | secret client OIDC |
| `SSO_AUDIENCE` | audience token E-Learning |
| `SSO_REDIRECT_URI` | `${APP_ORIGIN}/api/v1/auth/callback` |
| `SSO_WEBHOOK_SECRET` | secret HMAC webhook pencabutan akun SSO |
| `FILE_SERVICE_URL` | base URL HTTPS File Service produksi |
| `FILE_SERVICE_KEY` | bearer credential File Service |
| `FILE_ALLOWED_ORIGINS` | origin frontend yang diizinkan untuk storage signed URL |

Daftarkan `${APP_ORIGIN}/api/v1/auth/callback` sebagai redirect URI dan `${APP_ORIGIN}` sebagai post-logout URI di SSO. `SSO_CLIENT_SECRET`, `SSO_WEBHOOK_SECRET`, dan `FILE_SERVICE_KEY` adalah secret; jangan masukkan nilainya ke repository atau tangkapan layar.

## Verifikasi staging

Setelah Railway dan Vercel redeploy, periksa kedua URL berikut:

```text
${API_ORIGIN}/api/health
${APP_ORIGIN}/api/health
```

Keduanya harus merespons `200`. Buka `${APP_ORIGIN}/`, pilih akun pada **Mode uji cepat**, pastikan kembali ke dashboard, lalu logout. Logout harus kembali ke landing page Vercel.

## Saat pindah ke production VPS

Gunakan domain VPS tunggal, misalnya `https://elearning.uay.ac.id`. Nginx menjadi gateway untuk React dan API, sesuai topologi desain teknis.

| Variabel di VPS | Nilai |
| --- | --- |
| `APP_ORIGIN` | `https://elearning.uay.ac.id` |
| `API_ORIGIN` | hapus, atau gunakan nilai `APP_ORIGIN` yang sama |
| `VITE_API_URL` | tidak diisi |
| `RAILWAY_API_ORIGIN` | tidak digunakan |

Aktifkan `DEMO_MODE=false`, Redis, kredensial SSO resmi, File Service produksi, webhook, dan backup VPS. Detail PM2, Nginx, TLS, backup, serta verifikasi operasi tersedia di [panduan VPS PM2](HOSTINGER-PM2.md).

## Bucket Railway untuk uji coba

Bucket `ember` dapat digunakan oleh File Service demo. Pada service aplikasi
`e-learning-uay`, tambahkan reference variables berikut (bukan nilai secret ke Git):

| Variabel aplikasi | Reference Railway |
| --- | --- |
| `FILE_STORAGE_PROVIDER` | `s3` |
| `AWS_ENDPOINT_URL` | `${{ember.ENDPOINT}}` |
| `AWS_S3_BUCKET_NAME` | `${{ember.BUCKET}}` |
| `AWS_ACCESS_KEY_ID` | `${{ember.ACCESS_KEY_ID}}` |
| `AWS_SECRET_ACCESS_KEY` | `${{ember.SECRET_ACCESS_KEY}}` |
| `AWS_DEFAULT_REGION` | `${{ember.REGION}}` |

Runtime memeriksa akses bucket saat mulai dan gagal secara jelas jika konfigurasi
salah. Berkas dan metadata disimpan di prefix `uay-demo-files/`; keduanya bertahan
saat aplikasi redeploy. Berkas yang sebelumnya hanya berada di `/tmp` tidak otomatis
berpindah, sehingga perlu diunggah ulang. Bucket tetap private. Browser menggunakan
URL tiket sementara pada API Railway, sehingga tidak memerlukan CORS bucket atau
kredensial S3 di frontend. Checksum dan batas ukuran tetap diperiksa sebelum upload
ke bucket. Mode ini memakai fixture demo tanpa antivirus, sesuai batasan File
Service uji coba; produksi kampus tetap memakai File Service resmi.

Railway saat ini memakai virtual-hosted URLs. Jika tab Credentials bucket lama
meminta path-style, tambahkan `AWS_S3_FORCE_PATH_STYLE=true`.
Referensi: https://docs.railway.com/storage-buckets

## URL aplikasi

Navigasi menggunakan path seperti `/classes/<nama-kelas>/assignments/<nama-tugas>`.
Slug disimpan di database dan tetap saat judul berubah. Migrasi database harus
berjalan sebelum frontend baru dipublikasikan. UUID tetap dipakai internal oleh API.
Rewrite Vercel yang sudah tersedia dan `try_files` Nginx menyajikan `index.html`
untuk deep link. Tautan lama `#/...` diarahkan ke path baru setelah data dimuat.
