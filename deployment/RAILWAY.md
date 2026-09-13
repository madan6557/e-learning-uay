# Deployment Railway + Vercel

Frontend publik berjalan di Vercel dan API berjalan di Railway. Vercel menyediakan gateway `/api/*` yang meneruskan request ke Railway. Dengan pola ini cookie sesi tetap berada pada domain frontend, callback OIDC kembali ke domain frontend, dan Railway tidak perlu berbagi cookie lintas domain.

## Sambungkan dua domain

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

Alur yang dipakai adalah: `Vercel /api/auth/login` → `Railway /demo-sso/authorize` → `Vercel /api/auth/callback` → dashboard Vercel. Jadi pilihan akun demo tetap melalui authorization code, PKCE, state, nonce, token, JWKS, callback, dan sesi yang sama dengan alur OIDC produksi.

## Production dengan layanan kampus

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

## Verifikasi

Setelah Railway dan Vercel redeploy, periksa kedua URL berikut:

```text
${API_ORIGIN}/api/health
${APP_ORIGIN}/api/health
```

Keduanya harus merespons `200`. Buka `${APP_ORIGIN}/`, pilih akun pada **Mode uji cepat**, pastikan kembali ke dashboard, lalu logout. Logout harus kembali ke landing page Vercel.
