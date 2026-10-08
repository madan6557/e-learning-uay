# DOKUMEN TINJAUAN TEKNIS & USULAN PENYELARASAN ARSITEKTUR INTEGRASI AUTHENTIKASI & OTORISASI SSO UAY DENGAN E-LEARNING UAY

**Kajian Komparatif Bab 7 Dokumen Teknis SSO UAY terhadap Kebutuhan Operasional LMS UAY**  
*Versi Dokumen: 1.0 | Tanggal: 25 September 2026*  
*Penyusun: Tim Pengembang E-Learning UAY*  
*Ditujukan Kepada: Tim Pengembang SSO Universitas Al-Khairaat & Biro TI / PUSTIK UAY*

---

## 1. Ringkasan Eksekutif & Latar Belakang

Dokumen ini disusun sebagai tindak lanjut resmi atas penyerahan *Dokumen Teknis SSO UAY* oleh Tim Pengembang SSO Universitas Al-Khairaat (UAY) kepada Tim Pengembang E-Learning UAY, dengan rujukan khusus pada **Bab 7 (*Authentication & Session*)**.

Tim Pengembang E-Learning telah melakukan audit mendalam terhadap Bab 7 (sub-bab 7.1 hingga 7.15) dan menyimpulkan hal-hal pokok sebagai berikut:
1. **Fondasi Protokol yang Sangat Baik**: Implementasi OpenID Connect (OIDC) dan OAuth 2.0 menggunakan alur *Authorization Code Flow with PKCE (RFC 7636)* pada Keycloak telah memenuhi standar keamanan modern industri pendidikan tinggi.
2. **Pemisahan Peran Dua Lapis (Two-Tier Architecture)**: Bab 7.7 mendefinisikan pembagian arsitektur di mana **Lapis 1 (Keycloak)** menangani Autentikasi Pengguna, sedangkan **Lapis 2 (SSO Backend)** mengelola Otorisasi Terpusat berbasis tabel database `application_access` dan `roles`.
3. **Kesenjangan Kritis (Critical Gap)**: Sesuai spesifikasi klaim token Keycloak pada **Bab 7.5**, token JWT yang diterbitkan saat ini **hanya memuat data identitas dasar** (`sub`, `preferred_username`, `email`, `name`). Token tersebut **belum memuat**:
   - Nomor identitas akademik mahasiswa/dosen (`identifier_value` seperti NIM atau NIDN).
   - Hak akses dan peran spesifik aplikasi (`roles`).
   - Penegasan status keaktifan akun pengguna (`account_status: ACTIVE`).
4. **Implikasi Operasional E-Learning**: Tanpa atribut-atribut di atas, E-Learning UAY tidak dapat mengaitkan pengguna dengan mata kuliah, kurikulum, pengisian nilai, maupun menerapkan kontrol akses berbasis peran (RBAC).

Untuk mengatasi kesenjangan tersebut secara konstruktif dan kolaboratif, dokumen ini menyajikan **dua alternatif solusi arsitektur**:
- **Opsi 1 (Penyesuaian di sisi SSO — Token Enrichment via Keycloak Protocol Mappers)**: Tim SSO mengonfigurasi Protocol Mappers pada client `elearning-uay` di Keycloak agar atribut akademik, peran, dan status akun langsung disematkan ke dalam Access Token JWT. *Keunggulan*: latensi 0 ms (stateless), tanpa beban panggilan API tambahan ke SSO Backend, dan E-Learning siap berjalan tanpa modifikasi kode.
- **Opsi 2 (Penyesuaian di sisi E-Learning — Two-Tier Decoupled Architecture via SSO Backend API)**: E-Learning beradaptasi sepenuhnya dengan arsitektur Bab 7.7–7.9 dengan cara memvalidasi token Keycloak dasar, kemudian backend E-Learning menghubungi endpoint REST API SSO Backend (`GET /api/v1/auth/context`) untuk mengambil konteks otorisasi dan identitas akademik secara berkala (*with caching*).

Tim Pengembang E-Learning siap mengimplementasikan salah satu dari kedua opsi di atas berdasarkan keputusan dan kebijakan arsitektur Tim SSO serta PUSTIK UAY.

---

## 2. Matriks Evaluasi Butir per Butir Bab 7 Dokumen Teknis SSO UAY

Berikut adalah hasil telaah komparatif terhadap 15 sub-bab pada Bab 7 Dokumen Teknis SSO UAY:

| Sub-Bab | Butir Spesifikasi SSO UAY | Implementasi & Kebutuhan E-Learning | Status Kesesuaian | Tindak Lanjut Teknis |
|---|---|---|---|---|
| **7.1** | **Standar Protokol Autentikasi**: OIDC & OAuth 2.0, Authorization Code + PKCE (RFC 7636). | Backend E-Learning (`apps/api/src/auth.ts`) telah mengimplementasikan PKCE dengan `code_challenge_method=S256`. | **Sesuai Penuh (Full Match)** | Pertahankan konfigurasi client Keycloak (`elearning-uay`) bertipe Confidential/Public dengan PKCE wajib. |
| **7.2** | **Alur Autentikasi Pengguna**: Login terpusat via Keycloak Login Page. | Pengguna E-Learning diarahkan ke Keycloak untuk autentikasi kredensial; E-Learning menerima `authorization_code`. | **Sesuai Penuh (Full Match)** | Daftarkan redirect URI resmi E-Learning: `https://elearning.uay.ac.id/api/v1/auth/callback`. |
| **7.3** | **Single Sign-On Behavior**: Keycloak SSO Session Cookie (`KEYCLOAK_IDENTITY`). | Pengguna yang telah login di Portal UAY tidak perlu login ulang saat membuka LMS E-Learning. | **Sesuai Penuh (Full Match)** | Didukung secara *out-of-the-box* oleh Keycloak. |
| **7.4** | **Single Sign-Out & Manajemen Sesi**: RP-Initiated Logout via Keycloak `end_session_endpoint`. | Tombol logout di LMS memicu pembersihan sesi lokal dan me-redirect browser ke `end_session_endpoint` Keycloak. | **Sesuai Penuh (Full Match)** | E-Learning menyertakan parameter `id_token_hint` dan `post_logout_redirect_uri`. |
| **7.5** | **Struktur & Klaim Token Keycloak**: Token memuat `sub`, `preferred_username`, `email`, `name`, `iss`, `aud`, `iat`, `exp`. | **Kesenjangan Kritis**: Token tidak memiliki peran (`roles`), nomor identitas akademik (`identifier_value`), tipe user (`user_type`), dan status akun (`account_status`). | **Kesenjangan Kritis (Critical Gap)** | Memerlukan penyelesaian via **Opsi 1** (Protocol Mapper) atau **Opsi 2** (Query SSO Backend API). |
| **7.6** | **Validasi Token di Sisi Klien / Resource Server**: Verifikasi asimetris via JWKS URI (`/.well-known/openid-configuration`), algoritma RS256/ES256, caching key. | E-Learning memvalidasi signature token secara lokal menggunakan library `jose` dengan remote JWKS caching otomatis. | **Sesuai Penuh (Full Match)** | Tidak diperlukan perubahan pada logika kriptografi verifikasi token. |
| **7.7** | **Arsitektur Otorisasi Dua Lapis**: Lapis 1 = Keycloak (Autentikasi Identitas). Lapis 2 = SSO Backend (Otorisasi Akses Aplikasi). | E-Learning sebelumnya mengasumsikan *Self-Contained Token*. Namun E-Learning siap mengadopsi Lapis 2 jika API SSO Backend tersedia. | **Titik Temu Arsitektur** | Dijadikan landasan perancangan solusi **Opsi 2**. |
| **7.8** | **Skema Data Otorisasi di SSO Backend**: Tabel `application_access`, `roles`, `permissions`, `role_permissions`. | Struktur database SSO Backend sangat lengkap dan selaras dengan kebutuhan pemetaan hak akses E-Learning. | **Sesuai Struktur Data** | Kolom `roles.name` atau `role_code` menjadi sumber otoritas hak akses di LMS. |
| **7.9** | **Alur Evaluasi Akses Pengguna**: Klien menerima token -> klien memanggil SSO Backend API -> SSO Backend mengembalikan Authorization Context. | Alur query SQL telah dijelaskan di Bab 7.9, namun **kontrak REST API resmi** belum terdefinisi (URL, auth header, schema response). | **Perlu Spesifikasi Endpoint API** | Memerlukan penerbitan kontrak endpoint resmi dari Tim SSO (disajikan pada Bab 5 & 8). |
| **7.10** | **Refresh Token & Perpanjangan Sesi**: Token refresh ditukarkan ke Keycloak token endpoint tanpa interaksi login ulang. | Backend E-Learning mengelola rotasi token dan menyimpan refresh token di cookie `HttpOnly` terenkripsi. | **Sesuai Penuh (Full Match)** | Sesuai dengan spesifikasi RFC 6749. |
| **7.11** | **Manajemen Masa Berlaku Token**: Access token 15 menit, refresh token 8 jam, SSO session idle 30 menit. | Kode E-Learning memvalidasi umur token: `payload.exp - payload.iat <= 900` (15 menit). | **Sesuai Penuh (Full Match)** | Konfigurasi waktu kedaluwarsa sudah identik. |
| **7.12** | **Penanganan Token Kedaluwarsa & Rotasi**: Silent refresh dan deteksi refresh token reuse. | Middleware E-Learning mendeteksi token kedaluwarsa dan memicu refresh otomatis di latar belakang. | **Sesuai Penuh (Full Match)** | Mekanisme rotasi token berjalan transparan bagi pengguna. |
| **7.13** | **Penyimpanan Kredensial & Token di Klien**: Cookie `HttpOnly`, `Secure`, `SameSite=Lax`. | E-Learning menolak penyimpanan token di `localStorage` peramban demi mencegah risiko eksfiltrasi XSS. | **Sesuai Penuh (Full Match)** | Standar keamanan penyimpanan token telah terpenuhi. |
| **7.14** | **Pencegahan Replay Attack & CSRF**: Validasi parameter `state`, `nonce`, PKCE `code_verifier`, dan origin headers. | E-Learning memverifikasi integritas `state` yang disimpan dalam session cookie bertanda tangan sebelum menukar token. | **Sesuai Penuh (Full Match)** | Memitigasi serangan CSRF dan Replay secara tuntas. |
| **7.15** | **Penonaktifan Pengguna & Blacklist Sesi**: Penonaktifan akun di Keycloak/SSO harus segera mencabut akses pengguna. | E-Learning memiliki cache blacklist lokal (`cache.get("revoked:{sub}")`), namun membutuhkan mekanisme propagasi instan dari SSO. | **Perlu Penyelarasan Propagasi** | Diselaraskan melalui Webhook Revocation atau masa tunggu TTL Refresh Token (maks. 15 menit). |

---

## 3. Analisis Mendalam 5 Kesenjangan Kritis & Implikasi Teknis

### 3.1 Ketiadaan Identitas Akademik Mahasiswa & Dosen (`identifier_value` NIM / NIDN)
- **Kondisi Dokumen SSO**: Bab 7.5 menyatakan bahwa Keycloak hanya menyediakan klaim OIDC standar: `sub` (UUID Keycloak), `preferred_username`, `email`, dan `name`.
- **Kebutuhan E-Learning**: Di lingkungan akademik perguruan tinggi, `sub` (UUID) dan username tidak cukup untuk menghubungkan mahasiswa ke rombongan belajar (kelas kuliah), kurikulum prodi, presensi, pengisian nilai di SIMAK/SIAKAD, serta sinkronisasi KRS. E-Learning secara mutlak memerlukan **NIM (Nomor Induk Mahasiswa)** untuk mahasiswa dan **NIDN / NIP** untuk dosen.
- **Implikasi**: Jika atribut ini tidak disuplai saat login, E-Learning tidak dapat melakukan *Just-In-Time (JIT) provisioning*, sehingga mahasiswa yang berhasil login tidak akan menemukan mata kuliah yang diikutinya.

### 3.2 Ketiadaan Hak Akses & Peran Aplikasi (`roles`)
- **Kondisi Dokumen SSO**: Token Keycloak tidak memuat informasi peran spesifik aplikasi E-Learning. Bab 7.7–7.9 memindahkan tanggung jawab otorisasi ke database SSO Backend melalui tabel `application_access` dan `roles`.
- **Kebutuhan E-Learning**: E-Learning menerapkan Role-Based Access Control (RBAC) yang ketat. Sistem harus segera mengetahui apakah pengguna bertindak sebagai `STUDENT`, `INSTRUCTOR`, `DEPARTMENT_ADMIN`, atau `SUPER_ADMIN`.
- **Implikasi**: Berdasarkan `apps/api/src/auth.ts` dan `packages/shared/src/sso.ts`, ketiadaan klaim peran menyebabkan kegagalan otorisasi:
  ```typescript
  const role = claims.role ?? highestRole(claims.roles ?? []);
  if (!role) {
    ctx.addIssue({ message: "No E-Learning role granted for this account" });
  }
  ```
  Pengguna akan mendapatkan respons `403 Forbidden` meskipun berhasil login di Keycloak.

### 3.3 Ketiadaan Validasi Status Akun Pengguna (`account_status: ACTIVE`)
- **Kondisi Dokumen SSO**: Status keaktifan pengguna tersimpan di database SSO (`users.status` / `application_access.is_active`), namun tidak diekspos di dalam token JWT Keycloak.
- **Kebutuhan E-Learning**: Kode E-Learning mewajibkan `payload.account_status === "ACTIVE"`. Hal ini mencegah mahasiswa yang berstatus cuti, non-aktif, atau terkena sanksi akademik mengakses ujian dan materi pembelajaran internal.
- **Implikasi**: Token Keycloak saat ini ditolak oleh middleware E-Learning (`apps/api/src/auth.ts:110`) dengan pesan error `ACCOUNT_DISABLED` karena properti `account_status` bernilai `undefined`.

### 3.4 Penyelarasan Taksonomi Peran (Role Mapping)
- **Kondisi Dokumen SSO**: Contoh peran dalam dokumen SSO menggunakan label deskriptif berbahasa Indonesia seperti `"DOSEN"` dan `"MAHASISWA"`.
- **Kebutuhan E-Learning**: E-Learning menggunakan konvensi enum arsitektur bersih:
  `["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT"]`.
- **Implikasi**: Diperlukan aturan pemetaan (*mapping matrix*) resmi agar peran yang tersimpan di SSO Backend dapat diterjemahkan secara presisi ke dalam domain model E-Learning tanpa ambigu.

### 3.5 Spesifikasi & Kepastian Kontrak Endpoint Otorisasi SSO Backend
- **Kondisi Dokumen SSO**: Bab 7.9 menggambarkan alur evaluasi akses secara konseptual melalui ilustrasi diagram dan query SQL, namun belum mendokumentasikan spesifikasi REST API (URL endpoint, metode HTTP, skema header autentikasi, payload respon JSON, dan kode status error).
- **Kebutuhan E-Learning**: Jika arsitektur Two-Tier pada Bab 7.9 diterapkan (Opsi 2), E-Learning membutuhkan kontrak antarmuka API yang konkret dan berstatus *stable* untuk diintegrasikan pada backend LMS.

---

## 4. Opsi Usulan 1: Penyesuaian dari Sisi SSO (Token Enrichment via Keycloak Protocol Mappers)

### 4.1 Deskripsi Solusi & Arsitektur Alur Kerja
Pada opsi ini, Tim SSO mempertahankan Keycloak sebagai pusat penerbit token, namun menambahkan konfigurasi **Protocol Mappers** khusus untuk client `elearning-uay`. Dengan konfigurasi ini, Keycloak menyematkan data identitas akademik, peran aplikasi, dan status akun langsung ke dalam Access Token & ID Token JWT saat pengguna berhasil login.

```
[Pengguna] ──(1. Login)──> [Keycloak UI]
                                │ (Autentikasi & Mapping Database SSO)
[Pengguna] <──(2. Token JWT)────┘ (Token berisi: NIM, roles, account_status)
    │
    └──(3. Request API + Bearer Token)──> [E-Learning Backend]
                                                │
                                                └──(4. Verifikasi Lokal via JWKS)──> [Akses Diberikan (0 ms latency)]
```

### 4.2 Langkah-Langkah Konfigurasi Teknis di Admin Console Keycloak
Tim SSO hanya perlu melakukan konfigurasi berikut pada Realm UAY di Keycloak Admin Console (tanpa perubahan kode program):
1. **Buka Menu Clients**: Pilih client `elearning-uay` -> Tab **Client scopes** atau **Mappers**.
2. **Mapper 1 — User Type**:
   - Name: `user_type_mapper`
   - Mapper Type: `User Attribute`
   - User Attribute: `user_type` (atau atribut user SSO terkait)
   - Token Claim Name: `user_type`
   - Claim JSON Type: `String`
   - Add to ID token: `ON`, Add to access token: `ON`
3. **Mapper 2 — Status Akun**:
   - Name: `account_status_mapper`
   - Mapper Type: `User Attribute`
   - User Attribute: `status`
   - Token Claim Name: `account_status`
   - Claim JSON Type: `String` (Nilai: `"ACTIVE"`)
   - Add to ID token: `ON`, Add to access token: `ON`
4. **Mapper 3 — Identitas Akademik (NIM / NIDN)**:
   - Name: `identifier_value_mapper` & `identifier_type_mapper`
   - Mapper Type: `User Attribute`
   - Token Claim Name: `identifier_value` & `identifier_type`
   - Claim JSON Type: `String` (Contoh: `"202401001"` dan `"NIM"`)
   - Add to ID token: `ON`, Add to access token: `ON`
5. **Mapper 4 — Peran Aplikasi E-Learning**:
   - Name: `elearning_roles_mapper`
   - Mapper Type: `User Client Role` atau `User Attribute`
   - Token Claim Name: `roles`
   - Claim JSON Type: `JSON` (Array of Strings: `["STUDENT"]` atau `["INSTRUCTOR"]`)
   - Add to ID token: `ON`, Add to access token: `ON`, Multivalued: `ON`

### 4.3 Contoh Spesifikasi Payload Token JWT yang Diharapkan
```json
{
  "exp": 1741500000,
  "iat": 1741499100,
  "jti": "b3c8f2a1-5d4e-4f8a-9c2b-1a2b3c4d5e6f",
  "iss": "https://sso.uay.ac.id/realms/uay",
  "aud": "elearning-uay",
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "typ": "Bearer",
  "azp": "elearning-uay",
  "preferred_username": "202401001",
  "email": "ahmad.dahlan@uay.ac.id",
  "name": "Ahmad Dahlan",
  "user_type": "STUDENT",
  "account_status": "ACTIVE",
  "identifier_type": "NIM",
  "identifier_value": "202401001",
  "roles": ["STUDENT"],
  "department_scopes": ["INFORMATIKA"]
}
```

### 4.4 Keunggulan & Batasan Opsi 1
- **Keunggulan Utama**:
  - **Latensi Nol (0 ms overhead)**: E-Learning memvalidasi token secara *in-memory* menggunakan public key JWKS yang ter-cache. Tidak ada panggilan jaringan tambahan ke SSO Backend saat melayani request perkuliahan.
  - **Stateless & Scalable**: Server SSO Backend tidak akan terbebani oleh query database berulang ketika ribuan mahasiswa mengakses ujian online secara bersamaan.
  - **Zero Code Modification pada E-Learning**: Kode `apps/api/src/auth.ts` sudah 100% kompatibel dan langsung siap beroperasi.
- **Batasan**: Memerlukan akses dan waktu konfigurasi mapper di Keycloak Admin Console oleh Tim SSO (estimasi waktu pengerjaan: 30–60 menit).

---

## 5. Opsi Usulan 2: Penyesuaian dari Sisi E-Learning (Two-Tier Decoupled Architecture)

### 5.1 Deskripsi Solusi & Arsitektur Alur Kerja
Pada opsi ini, Tim SSO **tidak perlu mengubah konfigurasi Keycloak**. E-Learning UAY sepenuhnya beradaptasi dengan konsep arsitektur Bab 7.7–7.9:
1. Pengguna login ke Keycloak dan E-Learning menerima Access Token dasar (klaim Bab 7.5).
2. Backend E-Learning memvalidasi signature token secara kriptografis via JWKS Keycloak.
3. Backend E-Learning menghubungi REST API SSO Backend (`GET /api/v1/auth/context`) dengan menyertakan token Keycloak sebagai Bearer Token.
4. SSO Backend mengevaluasi hak akses ke tabel database `application_access` dan mengembalikan Konteks Otorisasi lengkap (NIM/NIDN, peran, dan status akses).
5. E-Learning menyinkronkan data pengguna ke database lokal dan menyimpan konteks otorisasi dalam in-memory cache / Redis dengan masa berlaku (TTL) 15 menit.

```
[Pengguna] ──(1. Login)──> [Keycloak UI]
[Pengguna] <──(2. Basic Token)─┘ (Klaim standar Bab 7.5)
    │
    └──(3. Request Login LMS)──> [E-Learning Backend]
                                      │
                                      ├──(4. Validasi JWKS)──> [Keycloak JWKS]
                                      │
                                      └──(5. GET /api/v1/auth/context)──> [SSO Backend API]
                                                                                │ (Query DB Bab 7.8)
                                      [E-Learning Backend] <──(6. Auth Context)─┘
                                              │ (Cache 15m di Redis/Memory)
                                              └──> [Sesi E-Learning Terbentuk]
```

### 5.2 Spesifikasi Kontrak API SSO Backend yang Dibutuhkan oleh E-Learning
Agar Opsi 2 dapat diimplementasikan, Tim SSO perlu menyediakan endpoint REST API dengan spesifikasi sebagai berikut:

- **Endpoint Path**: `GET /api/v1/auth/context` (atau `GET /api/v1/users/me/access`)
- **HTTP Method**: `GET`
- **Request Headers**:
  ```http
  Authorization: Bearer <keycloak_access_token>
  X-Client-ID: elearning-uay
  Accept: application/json
  ```
- **Response Format (200 OK)**:
  ```json
  {
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "username": "202401001",
    "name": "Ahmad Dahlan",
    "email": "ahmad.dahlan@uay.ac.id",
    "user_type": "STUDENT",
    "status": "ACTIVE",
    "primary_identifier": {
      "type": "NIM",
      "value": "202401001"
    },
    "application_access": {
      "client_id": "elearning-uay",
      "roles": ["STUDENT"],
      "permissions": ["courses.view", "assignments.submit", "quizzes.take"],
      "department_scopes": ["INFORMATIKA"],
      "is_active": true,
      "expires_at": null
    }
  }
  ```
- **Response Status Error**:
  - `401 Unauthorized`: Token Keycloak tidak valid, kadaluwarsa, atau signature tidak cocok.
  - `403 Forbidden`: Pengguna tidak memiliki hak akses ke aplikasi `elearning-uay` (`application_access.is_active = false` atau akun dinonaktifkan).
  - `404 Not Found`: Data pengguna tidak ditemukan di direktori database SSO.

### 5.3 Strategi Caching & Resiliensi di Sisi E-Learning
Untuk menjaga keandalan sistem E-Learning saat menerapkan Opsi 2:
1. **Local Context Caching**: E-Learning akan menyimpan respon otorisasi SSO Backend dalam cache lokal (Redis / In-Memory) dengan TTL 15 menit (disesuaikan dengan masa aktif token Keycloak). Panggilan ke SSO Backend API hanya dilakukan saat login awal atau saat cache miss.
2. **Circuit Breaker Pattern**: Jika server SSO Backend mengalami perlambatan (*latency spike*) atau gangguan sementara (*temporary downtime*), E-Learning akan menggunakan data profil terakhir dari database lokal untuk sesi pengguna yang masih valid.

### 5.4 Keunggulan & Batasan Opsi 2
- **Keunggulan**: Mematuhi arsitektur Lapis 2 murni rancangan Tim SSO; Tim SSO tidak perlu menyentuh konfigurasi protocol mapper di Keycloak.
- **Batasan**:
  - Menambah 1 hop jaringan (*network hop*) saat login, dengan tambahan latensi 30–120 ms.
  - Menimbulkan dependensi runtime terhadap ketersediaan server SSO Backend API.
  - Memerlukan penyesuaian kode pada `apps/api/src/auth.ts` di sisi E-Learning.

---

## 6. Matriks Komparasi Opsi 1 vs Opsi 2

| Kriteria Evaluasi | Opsi 1: Token Enrichment (Keycloak Mapper) | Opsi 2: Two-Tier Adapter (SSO Backend API) | Analisis Komparatif & Dampak |
|---|---|---|---|
| **Latensi & Kecepatan Response** | **Optimal (0 ms overhead)**. Validasi token dilakukan 100% lokal via public key JWKS cache. | **Menengah (+30 s.d. 120 ms)** pada saat autentikasi awal atau saat cache otorisasi kadaluwarsa. | Opsi 1 memberikan *user experience* terbaik dan sangat tangguh menghadapi lonjakan akses (*traffic surge*). |
| **Beban Server SSO** | **Sangat Ringan**. Server SSO hanya memproses pertukaran authorization code; tidak melayani request otorisasi runtime. | **Tinggi**. Server SSO Backend harus memproses panggilan API dan mengeksekusi query database untuk setiap sesi. | Opsi 1 melindungi database SSO dari beban query repetitif ribuan mahasiswa. |
| **Kompleksitas Implementasi di SSO** | **Sangat Rendah (Konfigurasi Saja)**. Tim SSO hanya menambahkan Protocol Mapper di UI Keycloak (estimasi 30 menit). | **Sedang s.d. Tinggi**. Tim SSO harus merilis, mendokumentasikan, dan memelihara endpoint API otorisasi yang aman. | Opsi 1 menghemat sumber daya dan waktu pengembangan Tim SSO. |
| **Kompleksitas Implementasi di E-Learning** | **Nol (Zero Code Modification)**. Kode E-Learning saat ini telah siap memproses token yang diperkaya. | **Sedang**. E-Learning harus membuat client HTTP ke SSO Backend, modul caching, dan mekanisme fallback resiliensi. | Tim E-Learning siap mengembangkan adapter Opsi 2 dalam 3–4 hari kerja. |
| **Kepatuhan Standar OIDC** | **Tinggi (Standar Industri)**. Token enrichment menggunakan custom mapper adalah pola standar OpenID Connect & Keycloak. | **Pola Hybrid / Proprietary**. Memisahkan token standar dengan API konteks khusus organisasi. | Opsi 1 lebih modular dan kompatibel dengan arsitektur microservices standar. |
| **Kecepatan Propagasi Perubahan Role** | **Menunggu Siklus Token (Maks. 15 menit)** atau saat user login ulang. | **Mendekati Instan s.d. 15 menit** (bergantung pada durasi caching di E-Learning). | Relatif seimbang karena Opsi 2 pun wajib menerapkan caching untuk efisiensi. |
| **Ketahanan Sistem (System Resilience)** | **Tinggi**. E-Learning tetap berfungsi normal memvalidasi token selama JWKS ter-cache, meskipun SSO Backend offline. | **Rentan terhadap Single Point of Failure**. Jika SSO Backend API tidak dapat dihubungi, proses login dapat terhambat. | Opsi 1 memiliki *fault isolation* yang jauh lebih baik. |
| **Estimasi Waktu Menuju Go-Live** | **1–2 Hari Kerja** (konfigurasi mapper + testing integrasi end-to-end). | **1–2 Minggu Kerja** (finalisasi endpoint API SSO Backend + refactoring auth client di LMS + pengujian). | Opsi 1 menawarkan jalur rilis yang jauh lebih cepat. |

---

## 7. Penyelarasan Taksonomi Peran (Role Mapping Matrix)

Untuk memastikan konsistensi hak akses antara skema database SSO (`roles.name` / `role_code`) dan skema E-Learning (`GlobalRole`), disepakati aturan konversi berikut:

| Peran pada SSO UAY (`roles.role_code` / `role_name`) | Peran pada E-Learning (`GlobalRole` Enum) | Hak Akses & Kewenangan di E-Learning UAY |
|---|---|---|
| `MAHASISWA` / `STUDENT` | `STUDENT` | Mengakses materi kuliah, mengumpulkan tugas, mengikuti kuis/ujian, melihat nilai pribadi, dan berpartisipasi dalam diskusi kelas. |
| `DOSEN` / `LECTURER` / `PENGAJAR` | `INSTRUCTOR` | Mengelola modul pembelajaran, mengunggah materi, membuat tugas dan soal ujian, memberikan penilaian, serta mengelola interaksi kelas. |
| `ADMIN_PRODI` / `STAFF_AKADEMIK` | `DEPARTMENT_ADMIN` | Memantau seluruh mata kuliah di program studinya, melihat analitik akademik tingkat prodi, dan mengelola alokasi dosen pengampu. |
| `SUPER_ADMIN` / `ADMIN_PUSAT` / `ADMIN_IT` | `SUPER_ADMIN` | Kendali sistem menyeluruh, konfigurasi integrasi sistem, manajemen audit log, dan pemeliharaan platform lintas fakultas. |

**Aturan Penanganan Multi-Peran (*Role Precedence*)**:  
Jika seorang pengguna memiliki lebih dari satu peran di SSO (misalnya seorang Dosen yang juga menjabat sebagai Admin Prodi, atau Staf yang menempuh studi lanjut), E-Learning menetapkan peran efektif berdasarkan hierarki tertinggi:  
$$	ext{SUPER\_ADMIN} > 	ext{DEPARTMENT\_ADMIN} > 	ext{INSTRUCTOR} > 	ext{STUDENT}$$

---

## 8. Protokol Keamanan, Penonaktifan Akun (Bab 7.15), & Siklus Hidup Sesi

### 8.1 Sinkronisasi Penonaktifan Akun (Bab 7.15)
Bab 7.15 Dokumen Teknis SSO mengatur tentang pemblokiran akses pengguna yang akunnya dinonaktifkan. Tim E-Learning mendukung dua mekanisme sinkronisasi:
1. **Mekanisme Pasif (Standar OIDC)**: Karena masa aktif Access Token adalah 15 menit, penonaktifan akun di Keycloak/SSO akan otomatis menghentikan akses pengguna paling lambat dalam 15 menit, saat E-Learning mencoba melakukan refresh token ke Keycloak dan ditolak.
2. **Mekanisme Aktif (Webhook Revocation — Rekomendasi Tambahan)**: Tim SSO dapat memanggil webhook internal E-Learning ketika status pengguna diubah menjadi `DISABLED`:
   - Endpoint: `POST /api/v1/auth/internal/revoke-user`
   - Header: `X-SSO-Secret: <shared_webhook_secret>`
   - Payload: `{"sso_user_id": "uuid-pengguna", "reason": "ACCOUNT_DISABLED"}`
   - E-Learning seketika menandai sesi pengguna pada Redis revocation blacklist (< 1 detik).

### 8.2 Single Sign-Out (RP-Initiated Logout — Bab 7.4)
Saat pengguna menekan tombol "Keluar" pada aplikasi E-Learning:
1. E-Learning menghapus cookie sesi lokal (`HttpOnly`).
2. Browser dialihkan ke endpoint Keycloak:
   `https://sso.uay.ac.id/realms/uay/protocol/openid-connect/logout?post_logout_redirect_uri=https://elearning.uay.ac.id/login&id_token_hint=<id_token>`
3. Keycloak menghapus sesi terpusat dan mengarahkan pengguna kembali ke halaman login E-Learning.

---

## 9. Rekomendasi Tim Pengembang, Action Plan, & Jadwal Integrasi

### 9.1 Rekomendasi Tim Pengembang E-Learning
Berdasarkan pertimbangan performa, resiliensi sistem saat ujian massal, beban infrastruktur server, dan efisiensi waktu penyelesaian, **Tim Pengembang E-Learning merekomendasikan Opsi 1 (Token Enrichment via Keycloak Protocol Mappers)** sebagai solusi utama.

Namun demikian, apabila Tim SSO dan PUSTIK UAY menetapkan bahwa arsitektur Two-Tier harus diterapkan secara murni tanpa penambahan klaim pada Keycloak, **Tim E-Learning 100% siap mengimplementasikan Opsi 2**, dengan catatan endpoint API SSO Backend (Bab 5.2) telah aktif di lingkungan staging.

### 9.2 Rencana Aksi Bersama (Action Plan)

| Tahap | Aktivitas | Pelaksana | Target Waktu |
|---|---|---|---|
| **Tahap 1** | Evaluasi & Pemilihan Opsi (Opsi 1 atau Opsi 2) | Tim SSO & PUSTIK UAY | Hari ke-1 |
| **Tahap 2A** *(Jika Opsi 1)* | Konfigurasi Protocol Mapper pada Client Keycloak Staging | Tim SSO UAY | Hari ke-2 |
| **Tahap 2B** *(Jika Opsi 2)* | Penyediaan Endpoint `GET /api/v1/auth/context` di Staging | Tim SSO UAY | Hari ke-2 s.d. 4 |
| **Tahap 3B** *(Jika Opsi 2)* | Pembuatan Adapter HTTP SSO Backend di E-Learning | Tim E-Learning UAY | Hari ke-4 s.d. 7 |
| **Tahap 4** | Pengujian Integrasi Terpadu (*End-to-End Integration Testing*) | Tim SSO & Tim E-Learning | Hari ke-8 |
| **Tahap 5** | Migrasi Konfigurasi & Rilis ke Lingkungan Production | Tim SSO & Tim E-Learning | Hari ke-9 |

---

## 10. Lembar Pengesahan & Konfirmasi Kesepakatan (Sign-Off Sheet)

Dokumen ini disusun dengan itikad baik untuk mempercepat terwujudnya integrasi Single Sign-On yang aman, andal, dan berstandar tinggi demi kemajuan ekosistem teknologi informasi di lingkungan Universitas Al-Khairaat.

*Palu, 25 September 2026*

| Perwakilan Tim Pengembang E-Learning UAY | Perwakilan Tim Pengembang SSO UAY | Mengetahui, Kepala Biro TI / PUSTIK UAY |
|:---:|:---:|:---:|
| <br><br><br>____________________________<br>**Lead Engineer E-Learning** | <br><br><br>____________________________<br>**Lead Engineer SSO UAY** | <br><br><br>____________________________<br>**Kepala PUSTIK UAY** |
