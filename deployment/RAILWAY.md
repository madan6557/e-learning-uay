# Deployment Railway

Railway menjalankan API dan bundle React dari satu service. Gunakan domain public Railway atau domain milik kampus sebagai satu origin HTTPS. `DEMO_MODE=true` menjalankan SSO dan File Service fixture internal untuk demonstrasi; data dan berkas fixture tidak boleh dipakai sebagai layanan kampus.

## Layanan Railway

1. Buat service PostgreSQL dan referensikan URL internalnya sebagai `DATABASE_URL` pada service aplikasi.
2. Buat service Redis dan referensikan URL internalnya sebagai `REDIS_URL` pada service aplikasi.
3. Aktifkan domain HTTPS untuk service aplikasi. Gunakan nilai domain lengkap tanpa garis miring terakhir untuk `APP_ORIGIN`.

## Variabel service aplikasi

| Variabel               | Nilai / sumber                                                                |
| ---------------------- | ----------------------------------------------------------------------------- |
| `NODE_ENV`             | `production`                                                                  |
| `AUTH_MODE`            | `oidc`                                                                        |
| `DEMO_MODE`            | `false`                                                                       |
| `APP_ORIGIN`           | domain HTTPS aplikasi, misalnya `https://elearning-production.up.railway.app` |
| `DATABASE_URL`         | referensi URL PostgreSQL Railway                                              |
| `REDIS_URL`            | referensi URL Redis Railway                                                   |
| `SSO_ISSUER`           | issuer HTTPS SSO kampus                                                       |
| `SSO_CLIENT_ID`        | client ID OIDC yang didaftarkan pada SSO                                      |
| `SSO_CLIENT_SECRET`    | secret client OIDC                                                            |
| `SSO_AUDIENCE`         | audience token SSO untuk E-Learning                                           |
| `SSO_REDIRECT_URI`     | `${APP_ORIGIN}/api/v1/auth/callback`                                          |
| `SSO_WEBHOOK_SECRET`   | secret HMAC webhook pencabutan akun SSO                                       |
| `FILE_SERVICE_URL`     | base URL HTTPS File Service produksi                                          |
| `FILE_SERVICE_KEY`     | bearer credential File Service                                                |
| `FILE_ALLOWED_ORIGINS` | origin HTTPS File Service dan storage signed URL, dipisahkan koma             |

`SSO_CLIENT_SECRET`, `SSO_WEBHOOK_SECRET`, dan `FILE_SERVICE_KEY` adalah secret. Jangan menggunakan nilai contoh dari dokumen desain atau memasukkannya ke repository.

## Demo tanpa layanan kampus

Jika SSO, Redis, dan File Service kampus belum tersedia, gunakan lima variabel berikut pada service aplikasi:

| Variabel       | Nilai                            |
| -------------- | -------------------------------- |
| `NODE_ENV`     | `production`                     |
| `AUTH_MODE`    | `oidc`                           |
| `DEMO_MODE`    | `true`                           |
| `APP_ORIGIN`   | domain HTTPS Railway aplikasi    |
| `DATABASE_URL` | referensi URL PostgreSQL Railway |

Runtime akan menyalakan fixture OIDC dan File Service yang hanya dapat diakses lewat domain aplikasi, kemudian mengisi data akun demo secara idempoten. Redis, webhook, dan kredensial SSO/File Service tidak diperlukan dalam mode ini. Jangan menambahkan kredensial kampus ke mode demo. Mengubah `DEMO_MODE` ke `false` mewajibkan seluruh variabel production pada tabel sebelumnya.

## Pendaftaran OIDC production

Saat `DEMO_MODE=false`, daftarkan redirect URI `${APP_ORIGIN}/api/v1/auth/callback` dan post-logout URI `${APP_ORIGIN}` pada SSO. Issuer dan endpoint OIDC harus HTTPS serta dapat dijangkau dari service Railway. Pastikan claim token mengikuti [kontrak adapter](../docs/contracts/IMPLEMENTED-ADAPTERS.md).

Setelah variabel mode yang dipilih tersedia, redeploy. Endpoint `GET ${APP_ORIGIN}/api/health` harus memberi respons `200`; domain root harus menampilkan landing page React.
