# Kontrak adapter yang diimplementasikan

Versi implementasi: 11 September 2026. Ini adalah kontrak **konsumen E-Learning**, bukan pernyataan bahwa layanan kampus sudah menyediakan endpoint yang sama. Pertanyaan lintas tim tetap tercatat dalam `SSO-File-Service-Questions.md`.

## SSO / OIDC

`AUTH_MODE=oidc`, discovery pada `${SSO_ISSUER}/.well-known/openid-configuration`. Issuer, authorization endpoint, token endpoint, JWKS dan end-session endpoint harus berada pada origin SSO yang dikonfigurasi. Flow memakai Authorization Code, PKCE S256, state dan nonce sekali pakai. Token endpoint menerima form dengan `client_id` dan `client_secret` (`client_secret_post`); provider yang mewajibkan metode lain perlu penyesuaian adapter.

Access token berupa JWT dengan tanda tangan **RS256 atau ES256**. Contoh claim:

```json
{
  "iss": "https://sso.uay.ac.id",
  "aud": "elearning-uay",
  "sub": "00000000-0000-4000-8000-000000000003",
  "iat": 1789084800,
  "exp": 1789085700,
  "account_status": "ACTIVE",
  "name": "Nama Mahasiswa",
  "email": "mahasiswa@example.edu",
  "student_staff_number": "202601001",
  "role": "STUDENT",
  "department_scopes": []
}
```

Timestamp contoh harus diganti saat menerbitkan token. `sub` immutable berbentuk UUID; masa access token paling lama 900 detik. Role yang diterima: `SUPER_ADMIN`, `DEPARTMENT_ADMIN`, `INSTRUCTOR`, `STUDENT`. Admin prodi hanya berwenang pada `department_scopes`; dosen hanya pada kelas yang ditugaskan. ID token diverifikasi terhadap client ID dan nonce; subject ID token/access token wajib sama. Refresh token disimpan di sesi server dan dirotasi tanpa diberikan kepada JavaScript browser.

Daftarkan callback `${APP_ORIGIN}/api/v1/auth/callback` dan post-logout redirect `${APP_ORIGIN}`. Cookie produksi `__Host-uay-session` menggunakan Secure, HttpOnly, SameSite=Lax dan Path=/; Redis menyimpan sesi paling lama 8 jam. Setiap request memvalidasi token/status akun, cache pencabutan dan akun lokal; Redis gagal berarti akses gagal. Akun lokal adalah cache identitas tanpa password. Impor peserta hanya dapat merujuk identitas yang sudah disinkronkan melalui login SSO.

### Pencabutan akun

`POST /api/v1/auth/revocations`, body `{"subject":"<UUID>"}`. Header:

- `X-SSO-Timestamp`: Unix seconds, toleransi kurang dari 5 menit.
- `X-SSO-Signature`: HMAC-SHA256 lowercase hex dari **`timestamp + "." + rawBody`**, menggunakan `SSO_WEBHOOK_SECRET`. Spasi/newline body harus persis seperti yang dikirim.

Webhook menandai pengguna nonaktif, menulis audit, dan menyimpan pencabutan Redis selama 900 detik. Pengaktifan kembali memerlukan login baru dengan claim ACTIVE setelah masa pencabutan; kebijakan event pengaktifan langsung belum disepakati. Retry webhook aman secara efek status; tidak ada endpoint pembentukan password.

## File Service

Seluruh panggilan server menggunakan `Authorization: Bearer ${FILE_SERVICE_KEY}`. Mutation eksternal membawa `Idempotency-Key`; File Service harus menyimpan hasil berdasarkan key dan menolak reuse key dengan body berbeda. Adapter membatasi tiap panggilan 3 detik, maksimal 3 percobaan dengan jeda eksponensial, serta membuka circuit breaker 30 detik setelah tiga kegagalan beruntun.

| Endpoint layanan eksternal | Request / response utama |
|---|---|
| `POST /v1/uploads` | Request `{classId,purpose,contextId?,name,mimeType,sizeBytes,checksum,ownerSubject,retentionDays:7}`. Response `{fileObjectId,uploadUrl,headers?,expiresAt}`. Browser mengunggah langsung dengan PUT. |
| `GET /v1/files/:id` | `{status:"READY",scanStatus:"CLEAN",checksum,sizeBytes,mimeType}`. Nilai harus cocok dengan metadata awal; PENDING/scan lain ditolak. |
| `POST /v1/files/:id/download-ticket` | `{ttlSeconds:900,subject,disposition:"inline"|"attachment"}` → `{downloadUrl,expiresAt}`. |
| `POST /v1/files/:id/trash` | `{}` → JSON sukses; URL lama harus tidak dapat mengunduh objek yang sudah di-trash. |
| `POST /v1/files/:id/restore` | `{}` → JSON sukses; ID tetap sama, hanya dalam 7 hari. |

Origin upload/download harus termasuk `FILE_ALLOWED_ORIGINS`. Production menggunakan HTTPS. File Service perlu mengizinkan CORS origin aplikasi untuk PUT/GET dan header tiket; signed URL harus cukup untuk PDF.js/native video. File Service bertanggung jawab atas deteksi MIME dari konten, antivirus, checksum SHA-256, karantina, kuota, backup, dan purge setelah retensi. API E-Learning memverifikasi metadata terkonfirmasi sebelum berkas dipakai; ia tidak menerima binary.

Batas E-Learning: cover 5 MiB, materi/tugas/jawaban 50 MiB, video 100 MiB. Ekstensi executable, HTML/SVG/JavaScript aktif diblokir. PDF/video/gambar harus memiliki MIME yang sesuai. Dosen mengakses berkas kelas yang dikelola; mahasiswa mengakses materi melalui resource yang tersedia dan berkas jawaban miliknya sendiri. URL yang sudah diterbitkan berlaku sampai expiry kecuali File Service membatalkannya lebih awal.

Clone mempertahankan referensi berkas materi. File yang dipakai kelas lain tidak boleh di-trash melalui E-Learning; unggah salinan baru jika perlu lifecycle mandiri. Berkas submission immutable. Konfirmasi unduhan mencatat penyelesaian fetch pada browser; ini bukan bukti bahwa mahasiswa membaca file.

`scripts/file-service.mjs` adalah fixture terpisah untuk pengembangan: disk sendiri, upload/download bertanda tangan, checksum dan trash/restore. Status CLEAN pada fixture disimulasikan; fixture ditolak pada `NODE_ENV=production`.

## API E-Learning

API menggunakan cookie sesi dan prefix `/api/v1`. Mutation browser mewajibkan `Origin` yang cocok dengan `APP_ORIGIN`; operasi domain membawa `Idempotency-Key` 16–100 karakter. Key terikat pengguna, role/scope, URL, metode dan body. Gunakan key yang sama ketika mengulang request yang hasilnya belum diketahui. Konflik revision autosave kuis menghasilkan `ANSWER_CONFLICT`; klien harus memuat ulang jawaban server sebelum menggabungkan draf.

Impor: `POST /course-classes/:id/imports/preview` lalu `/commit`, body `{kind,categoryId?,bankId?,rows:[{values,exclude,override}],reason?}`. Kind `ENROLLMENT`, `GRADES`, `QUESTIONS`; maksimal 500 baris. Preview tidak menulis data; commit memvalidasi ulang dan menerapkan seluruh baris siap dalam satu transaksi serializable. Tidak ada pembuatan identitas atau penggantian grade diam-diam.

Tes runnable: `tests/integration/oidc.test.ts`, `files.test.ts`, `learning.test.ts`. Fixture menandatangani token RSA serta menguji nonce/state/audience, refresh, webhook, checksum, scan, kepemilikan dan retensi. Penerimaan lintas layanan nyata tetap memerlukan penyelarasan dengan kedua pemilik service.
