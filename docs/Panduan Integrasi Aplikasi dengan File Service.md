# Panduan Integrasi Aplikasi ke File Service

Dokumentasi ini menjelaskan secara komprehensif cara mengintegrasikan aplikasi (khususnya platform E-Learning UAY) dengan UAY File Service menggunakan endpoint aplikasi yang tersedia, serta tata cara konfigurasi mandiri (*self-service*) menggunakan fitur **Repository Sandbox** di File Service Console.

Seluruh komunikasi operasional berkas dilakukan melalui backend aplikasi (arsitektur perantara/proxy terotorisasi), bukan langsung dari peramban (*browser*) pengguna akhir, guna menjamin keamanan kredensial dan penegakan otorisasi data akademik.

---

## 1. Arsitektur Integrasi & Aliran Komunikasi

Integrasi File Service menggunakan arsitektur OAuth 2.0 *Client Credentials Grant* yang terhubung dengan UAY Keycloak SSO:

```
+------------------+          +----------------------+          +----------------------+
|  Browser / Klien |          |   Backend Aplikasi   |          |     UAY Keycloak     |
|    (Mahasiswa/   |          |     (E-Learning)     |          |       (SSO)          |
|      Dosen)      |          +----------------------+          +----------------------+
+--------+---------+                     |                                  |
         |                               | 1. POST /token (client_cred)     |
         |                               |--------------------------------->|
         |                               | 2. access_token (aud: file-svc)  |
         |                               |<---------------------------------|
         |                               |
         | 3. Upload/Download Request    |
         |------------------------------>|
         |    (Validasi Role Mahasiswa/  |
         |     Dosen di Database App)    |
         |                               | 4. REST Request + Bearer Token   +----------------------+
         |                               |--------------------------------->|   UAY File Service   |
         |                               | 5. Stream Content / JSON Meta    |      (Backend)       |
         |                               |<---------------------------------+----------------------+
         | 6. Respons ke Browser         |                                             |
         |<------------------------------+                                             |
                                                                             +---------v----------+
                                                                             |   Storage Engine   |
                                                                             |  (S3 / MinIO / FS) |
                                                                             +--------------------+
```

---

## 2. Persiapan & Konfigurasi Mandiri via Repository Sandbox

UAY File Service menyediakan antarmuka mandiri bernama **Repository Sandbox** pada Admin Console. Fitur ini dirancang agar Pengembang (*Developer*) dan Administrator Platform dapat mengonfigurasi parameter teknis repositori, menetapkan aturan tipe berkas, mengatur hak akses teknis aplikasi, serta membuat struktur folder awal tanpa harus memodifikasi kode backend File Service secara langsung.

### 2.1. Cara Mengakses Repository Sandbox
1. Masuk ke **Admin Console File Service** (`apps/admin`).
2. Masuk ke menu **Applications** pada navigasi utama.
3. Cari aplikasi tujuan (misalnya **E-Learning UAY**).
4. Pada kolom **Repository IDs**, cari repository yang ingin dikonfigurasi (misalnya repository *Development* atau *Production*).
5. Klik ikon **Configure repository** (ikon folder gerigi). Anda akan diarahkan ke halaman **Repository Sandbox** di rute `/repositories/{repositoryId}`.

Di halaman Repository Sandbox, terdapat tiga tab konfigurasi mandiri:

---

### 2.2. Tab "Allowed File Types" (Kebijakan Tipe & Batas Ukuran Berkas)
Tab ini mengatur ekstensi dan tipe MIME apa saja yang diizinkan untuk diunggah ke dalam repositori aplikasi, serta batas ukuran berkas maksimum (*max file size*).

> **PENTING:** Jika berkas diunggah melalui backend atau frontend aplikasi tetapi tipe/ekstensinya belum diaktifkan di tab ini, File Service akan menolak unggahan dengan kode error `FILE_TYPE_NOT_ALLOWED`.

#### Langkah Konfigurasi:
1. Klik tab **Allowed file types**.
2. Klik tombol **Add rule** untuk menambahkan baris kebijakan baru.
3. Isi parameter berkas:
   * **Extension:** Ekstensi berkas tanpa titik (contoh: `pdf`, `docx`, `xlsx`, `pptx`, `zip`, `jpg`, `png`, `mp4`).
   * **MIME type:** Tipe MIME resmi (contoh: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/png`).
   * **Maximum size (MiB):** Batas ukuran maksimal file dalam satuan MiB (contoh: `25` untuk dokumen tugas, `100` untuk berkas zip materi, `500` untuk rekaman video).
   * **Enabled:** Centang kotak *Enabled* agar kebijakan langsung berlaku.
4. Klik tombol **Save rules** untuk menyimpan perubahan ke basis data.

---

### 2.3. Tab "Application Permissions" (Hak Akses Teknis Klien Aplikasi)
Tab ini mengatur kewenangan teknis apa saja yang diberikan kepada backend aplikasi klien (`client_credentials`) saat memanggil API File Service.

#### Matriks Permission yang Dapat Diatur:
* `FILE_LIST`: Mengizinkan backend aplikasi mengambil daftar berkas dan filter folder.
* `FILE_METADATA_READ`: Mengizinkan backend aplikasi membaca informasi detail berkas.
* `FILE_UPLOAD`: Mengizinkan backend aplikasi mengunggah berkas baru ke repositori.
* `FILE_DOWNLOAD`: Mengizinkan backend aplikasi mengunduh isi berkas privat.
* `FILE_METADATA_UPDATE`: Mengizinkan backend aplikasi mengubah nama berkas, memindahkan folder, atau mengubah metadata konteks.
* `FILE_VISIBILITY_UPDATE`: Mengizinkan backend aplikasi mengubah visibilitas berkas (`private` <-> `public`).
* `FILE_DELETE`: Mengizinkan backend aplikasi melakukan penghapusan berkas (*soft delete*).
* `FILE_RESTORE`: Mengizinkan backend aplikasi memulihkan berkas yang telah dihapus.

#### Langkah Konfigurasi:
1. Klik tab **Application permissions**.
2. Centang izin (*permission*) yang dibutuhkan oleh aplikasi E-Learning (terapkan prinsip *Least Privilege*).
3. Klik tombol **Save permissions**.

---

### 2.4. Tab "Folder Structure" (Hierarki Folder & Pengambilan `folderId`)
Saat ini API File Service tidak menyediakan endpoint publik bagi aplikasi klien untuk membuat folder secara dinamis. Seluruh struktur folder utama harus dipersiapkan terlebih dahulu melalui Repository Sandbox.

#### Langkah Pembuatan Folder Awal:
1. Klik tab **Folder structure**.
2. Klik tombol **Create folder** (atau ikon folder tambah).
3. Masukkan nama folder sesuai struktur logis modul aplikasi, misalnya:
   * `courses` (induk materi perkuliahan)
   * `assignments` (induk berkas tugas dosen)
   * `submissions` (induk berkas pengumpulan tugas mahasiswa)
   * `announcements` (lampiran pengumuman)
4. Buat subfolder jika diperlukan (buka folder induk, lalu klik *Create folder* di dalamnya).
5. **Ambil `folderId`:** Klik atau sorot folder yang dibuat untuk menyalin UUID folder tersebut (`folderId`). Nilai UUID ini yang akan dikirimkan oleh backend E-Learning pada field upload `folderId`.

---

### 2.5. Uji Coba Berkas Mandiri di Sandbox (*File Explorer Testing*)
Sebelum menguji integrasi melalui kode aplikasi, developer dapat memvalidasi apakah repositori berjalan normal:
* **Upload Test:** Klik tombol **Upload** atau seret berkas (*drag and drop*) langsung ke zona dropzone untuk memastikan aturan tipe berkas dan storage engine berjalan dengan baik.
* **Preview Aman:** Klik berkas di tabel untuk melihat pratinjau dokumen/gambar. Sandbox menyajikan preview dengan header keamanan ketat `Content-Security-Policy: default-src 'none'; sandbox`.
* **Download Test:** Mengunduh berkas langsung dari console untuk verifikasi integritas data (*checksum*).
* **Rename & Delete:** Mengubah nama berkas serta menguji proteksi penghapusan (dialog konfirmasi mewajibkan mengetikkan nama berkas/folder secara tepat).

---

## 3. Konfigurasi Backend Aplikasi

Simpan variabel konfigurasi berikut pada environment backend atau secret manager yang digunakan oleh aplikasi:

```env
FILE_SERVICE_BASE_URL=https://file-service.uay.ac.id
FILE_SERVICE_REPOSITORY_ID=<repository-id>

KEYCLOAK_TOKEN_URL=https://sso.uay.ac.id/realms/uay/protocol/openid-connect/token
FILE_SERVICE_CLIENT_ID=<backend-client-id>
FILE_SERVICE_CLIENT_SECRET=<secret-backend-client>
FILE_SERVICE_AUDIENCE=uay-file-service
```

* `FILE_SERVICE_REPOSITORY_ID`: Diperoleh dari kolom *Repository IDs* di Console atau dari URL halaman Sandbox (`/repositories/{repositoryId}`).
* `FILE_SERVICE_CLIENT_ID`: Client ID backend khusus yang didaftarkan di UAY SSO (format standar: `<nama-aplikasi>-file-service`, contoh: `elearning-file-service`).
* **Keamanan Kredensial:** `FILE_SERVICE_CLIENT_SECRET` bersifat rahasia tingkat tinggi. Dilarang keras menaruh nilai ini di frontend, repositori git publik/privat, atau berkas konfigurasi klien.

---

## 4. Mendapatkan Access Token dari UAY SSO

Backend aplikasi meminta access token dari Keycloak menggunakan protokol **OAuth 2.0 Client Credentials Grant**. Alur ini mengidentifikasi identitas sistem backend saat berkomunikasi antarlayanan (*machine-to-machine*).

### Contoh Permintaan Token:
```bash
curl -X POST "$KEYCLOAK_TOKEN_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=client_credentials" \
  --data-urlencode "client_id=$FILE_SERVICE_CLIENT_ID" \
  --data-urlencode "client_secret=$FILE_SERVICE_CLIENT_SECRET"
```

### Respons Token Sukses:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "expires_in": 300,
  "token_type": "Bearer"
}
```

Sertakan token tersebut pada setiap pemanggilan endpoint File Service melalui header HTTP:
```http
Authorization: Bearer <access-token>
```

> **Catatan Pengelolaan Token:** Backend aplikasi wajib melakukan *caching* terhadap `access_token` selama masa berlaku (`expires_in`) masih mencukupi, dan hanya meminta token baru ketika mendekati waktu kedaluwarsa. Jangan meminta token baru pada setiap satu operasi berkas.

---

## 5. Format URL API & Standar Header

Endpoint File Service untuk integrasi aplikasi menggunakan format dasar:

```text
{FILE_SERVICE_BASE_URL}/v1/repositories/{repositoryId}
```

### Header Standar:
| Header | Nilai / Format | Keterangan |
|---|---|---|
| `Authorization` | `Bearer <access-token>` | Wajib untuk seluruh endpoint repositori privat. |
| `Content-Type` | `application/json` / `multipart/form-data` | Sesuai jenis operasi (JSON untuk patch/update, multipart untuk upload). |
| `Accept` | `application/json` | Mengharapkan respons dalam format JSON standar. |

---

## 6. Operasi API Berkas

### 6.1. Melihat Daftar Berkas
Mengambil daftar berkas aktif yang tersimpan di dalam repositori.

```http
GET /v1/repositories/{repositoryId}/files
```

* **Permission yang Dibutuhkan:** `FILE_LIST`
* **Query Parameters:**
  | Parameter | Tipe | Keterangan |
  |---|---|---|
  | `page` | Integer | Nomor halaman (default: `1`). |
  | `limit` | Integer | Jumlah data per halaman (default: `20`, maks: `100`). |
  | `folder_id` | UUID | Filter berkas dalam folder tertentu (opsional). |
  | `context_type` | String | Filter tipe konteks aplikasi (misal: `course`, `assignment`). |
  | `context_id` | String | Filter ID konteks aplikasi. Harus dikirim berpasangan dengan `context_type`. |

#### Contoh Permintaan:
```bash
curl "$FILE_SERVICE_BASE_URL/v1/repositories/$FILE_SERVICE_REPOSITORY_ID/files?page=1&limit=20&folder_id=<folder-id>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### Contoh Respons:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "fileId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "repositoryId": "3b29c98a-...",
        "folderId": "4a12b34c-...",
        "originalName": "Modul_1_Pemrograman_Web.pdf",
        "mimeType": "application/pdf",
        "extension": "pdf",
        "sizeBytes": 2048500,
        "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "contextType": "course",
        "contextId": "cs-101",
        "uploadedBy": "dosen-001",
        "visibility": "private",
        "createdAt": "2026-10-10T10:00:00.000Z",
        "updatedAt": "2026-10-10T10:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "total_pages": 1
    }
  },
  "request_id": "req-9b37c18a"
}
```

---

### 6.2. Membaca Metadata Berkas
Mengambil metadata lengkap berkas tanpa mengunduh konten fisiknya.

```http
GET /v1/repositories/{repositoryId}/files/{fileId}
```

* **Permission yang Dibutuhkan:** `FILE_METADATA_READ`

#### Contoh Permintaan:
```bash
curl "$FILE_SERVICE_BASE_URL/v1/repositories/$FILE_SERVICE_REPOSITORY_ID/files/<file-id>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### 6.3. Mengunggah Berkas
Mengunggah berkas baru ke repositori menggunakan format `multipart/form-data`.

```http
POST /v1/repositories/{repositoryId}/files
Content-Type: multipart/form-data
```

* **Permission yang Dibutuhkan:** `FILE_UPLOAD`
* **Form Fields:**
  | Field | Tipe | Wajib? | Keterangan |
  |---|---|---|---|
  | `file` | File Binary | Ya | Berkas yang akan diunggah. |
  | `folderId` | UUID | Tidak | ID folder tujuan yang telah dibuat di Sandbox. Jika kosong, file disimpan di root repositori. |
  | `contextType` | String | Tidak | Nama modul/konteks (misal: `course_material`, `submission`). |
  | `contextId` | String | Tidak | Identitas entitas terkait (misal: ID mata kuliah atau ID tugas). Wajib ada jika `contextType` diisi. |

#### Contoh Permintaan:
```bash
curl -X POST "$FILE_SERVICE_BASE_URL/v1/repositories/$FILE_SERVICE_REPOSITORY_ID/files" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@./Modul_1_Pemrograman_Web.pdf" \
  -F "folderId=4a12b34c-..." \
  -F "contextType=course" \
  -F "contextId=cs-101"
```

> **Validasi Kebijakan:** File Service secara otomatis memvalidasi apakah ekstensi dan MIME type berkas tersebut sesuai dengan aturan yang telah diaktifkan di tab **Allowed file types** Sandbox. Jika ukuran melebihi batas atau tipe tidak terdaftar, request akan gagal dengan respons error HTTP 400.

---

### 6.4. Mengunduh Berkas Privat
Mengunduh konten berkas privat melalui perantara backend aplikasi.

```http
GET /v1/repositories/{repositoryId}/files/{fileId}/download
```

* **Permission yang Dibutuhkan:** `FILE_DOWNLOAD`

#### Contoh Permintaan:
```bash
curl "$FILE_SERVICE_BASE_URL/v1/repositories/$FILE_SERVICE_REPOSITORY_ID/files/<file-id>/download" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  --output "Modul_1_Pemrograman_Web.pdf"
```

* Respons mengirimkan *binary stream* dengan header `Content-Disposition: attachment; filename="..."` dan tipe MIME yang sesuai.
* Backend aplikasi disarankan meneruskan (*stream pipe*) aliran data ini langsung ke peramban pengguna setelah memvalidasi otorisasi pengguna.

---

### 6.5. Mengunduh Berkas Publik
Berkas dengan visibility `public` dapat diunduh langsung tanpa menyertakan Bearer Token.

```http
GET /v1/public/files/{fileId}/download
```

* **Permission yang Dibutuhkan:** Tidak memerlukan token.
* Endpoint ini ideal untuk aset publik seperti logo universitas, silabus umum, atau template dokumen yang dapat diakses khalayak luas.
* **Perhatian:** Jangan pernah menyetel visibility `public` untuk dokumen sensitif, soal ujian, atau berkas tugas mahasiswa.

---

### 6.6. Mengubah Nama atau Lokasi Folder Berkas
Mengubah atribut metadata nama berkas atau memindahkan berkas ke folder lain.

```http
PATCH /v1/repositories/{repositoryId}/files/{fileId}
Content-Type: application/json
```

* **Permission yang Dibutuhkan:** `FILE_METADATA_UPDATE`

#### Payload:
```json
{
  "originalName": "Modul_1_Pemrograman_Web_Revisi.pdf",
  "folderId": "5b23c45d-..."
}
```

* Untuk memindahkan berkas kembali ke root direktori repositori, kirimkan `"folderId": null`.
* Mengganti nama berkas tidak boleh mengubah ekstensi aslinya.

---

### 6.7. Mengubah Visibility Berkas
Mengubah status keterbukaan berkas antara `private` dan `public`.

```http
PATCH /v1/repositories/{repositoryId}/files/{fileId}/visibility
Content-Type: application/json
```

* **Permission yang Dibutuhkan:** `FILE_VISIBILITY_UPDATE`

#### Payload:
```json
{
  "visibility": "private"
}
```

---

### 6.8. Menghapus Berkas (*Soft Delete*)
Menandai berkas sebagai terhapus sehingga tidak lagi dapat diakses oleh query aktif.

```http
DELETE /v1/repositories/{repositoryId}/files/{fileId}
```

* **Permission yang Dibutuhkan:** `FILE_DELETE`

```bash
curl -X DELETE "$FILE_SERVICE_BASE_URL/v1/repositories/$FILE_SERVICE_REPOSITORY_ID/files/<file-id>" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

### 6.9. Memulihkan Berkas Terhapus (*Restore*)
Mengembalikan berkas yang sebelumnya dihapus (*soft deleted*) ke kondisi aktif.

```http
POST /v1/repositories/{repositoryId}/files/{fileId}/restore
```

* **Permission yang Dibutuhkan:** `FILE_RESTORE`

---

## 7. Penegakan Otorisasi & Keamanan Pengguna Akhir

Backend aplikasi E-Learning bertanggung jawab penuh atas otorisasi tingkat pengguna (*End-User Authorization*). File Service **hanya** memvalidasi izin teknis backend aplikasi terhadap repositori, bukan izin individual mahasiswa atau dosen.

### Prinsip Keamanan Wajib:
1. **Tidak Ada Kredensial di Frontend:** Client ID backend dan Client Secret **tidak boleh** dikirimkan ke peramban atau disimpan di kode JavaScript sisi klien.
2. **Validasi Kepemilikan Data:** Sebelum backend E-Learning memanggil endpoint `download` atau `delete` ke File Service, backend harus memeriksa:
   * Apakah mahasiswa yang meminta berkas terdaftar pada kelas yang bersangkutan?
   * Apakah dosen yang menghapus materi adalah pengampu mata kuliah tersebut?
3. **Penyaluran Berkas Aman (*Secure Streaming*):** Backend aplikasi mengunduh aliran data dari File Service dan menyalurkannya ke klien dengan validasi sesi aktif.

---

## 8. Format Respons & Penanganan Kesalahan (*Error Handling*)

File Service mengembalikan respons JSON terstandarisasi untuk setiap kegagalan:

```json
{
  "success": false,
  "error": {
    "code": "FILE_TYPE_NOT_ALLOWED",
    "message": "File type 'exe' is not allowed in this repository."
  },
  "request_id": "req-a1b2c3d4"
}
```

### Daftar Kode Kesalahan Umum:
| Kode Error | Status HTTP | Penyebab & Solusi |
|---|---|---|
| `UNAUTHORIZED` | 401 | Token access kedaluwarsa atau tidak valid. Lakukan pembaruan token melalui Keycloak SSO. |
| `FORBIDDEN` | 403 | Client backend tidak memiliki permission yang dibutuhkan. Periksa tab **Application permissions** di Repository Sandbox. |
| `REPOSITORY_NOT_FOUND` | 404 | Nilai `FILE_SERVICE_REPOSITORY_ID` tidak cocok atau tidak terdaftar. |
| `FILE_NOT_FOUND` | 404 | UUID berkas tidak ditemukan atau telah terhapus. |
| `FILE_TYPE_NOT_ALLOWED` | 400 | Ekstensi/MIME type tidak terdaftar di tab **Allowed file types** Repository Sandbox. Tambahkan aturan baru di Sandbox. |
| `FILE_TOO_LARGE` | 400 | Ukuran berkas melebihi batas MiB yang ditentukan pada tab **Allowed file types** Sandbox atau batas upload server. |
| `FOLDER_NOT_FOUND` | 400 | `folderId` yang dikirim tidak valid atau berada di repositori lain. Buat folder di Sandbox terlebih dahulu. |

> **Catatan Debugging:** Selalu catat nilai `request_id` ke dalam log backend aplikasi saat terjadi kesalahan untuk mempermudah penelusuran log bersama tim infrastruktur File Service.

---

## 9. Checklist Kesiapan Integrasi (*Production Checklist*)

Sebelum integrasi dinyatakan siap dan dirilis ke lingkungan produksi (*production*), pastikan seluruh poin berikut telah diverifikasi:

- [ ] **Akses Console & Sandbox:** Akun pengembang memiliki akses ke Admin Console File Service dan dapat membuka halaman Repository Sandbox.
- [ ] **Kebijakan Tipe Berkas Terkonfigurasi:** Seluruh format berkas yang dibutuhkan modul E-Learning (`pdf`, `docx`, `xlsx`, `zip`, `jpg`, `png`, dll) telah didaftarkan dan diaktifkan di tab *Allowed file types* Sandbox dengan batas ukuran yang sesuai.
- [ ] **Hak Akses Teknis Terpenuhi:** Tab *Application permissions* di Sandbox telah mencentang seluruh hak izin yang diperlukan (`FILE_LIST`, `FILE_METADATA_READ`, `FILE_UPLOAD`, `FILE_DOWNLOAD`, `FILE_METADATA_UPDATE`, `FILE_DELETE`).
- [ ] **Struktur Folder Awal Dibuat:** Folder-folder utama modul aplikasi (`courses`, `assignments`, `submissions`, dll) telah dibuat di tab *Folder structure* Sandbox, dan UUID folder telah dipetakan pada konfigurasi backend.
- [ ] **Uji Coba Sandbox Berhasil:** Pengujian unggah, pratinjau CSP, unduh, dan hapus berkas secara manual di Sandbox berhasil tanpa kendala penyimpanan.
- [ ] **Penyimpanan Kredensial Aman:** `FILE_SERVICE_CLIENT_ID` dan `FILE_SERVICE_CLIENT_SECRET` disimpan di environment variabel backend / secret manager, dan tidak terekspos ke repositori git atau frontend.
- [ ] **Caching Token OAuth 2.0:** Backend mengimplementasikan mekanisme caching untuk access token SSO agar tidak meminta token berulang pada setiap pemanggilan API.
- [ ] **Otorisasi Pengguna Akhir Ditegakkan:** Backend aplikasi secara independen memvalidasi hak akses mahasiswa/dosen sebelum meneruskan permintaan ke File Service.
- [ ] **Penanganan Error Terintegrasi:** Log backend mencatat `request_id` saat terjadi kegagalan respons dari File Service.
- [ ] **Uji Alur End-to-End Berhasil:** Skenario unggah materi oleh dosen, unduh materi oleh mahasiswa, pengumpulan tugas mahasiswa, dan penghapusan materi teruji secara menyeluruh di lingkungan staging.
