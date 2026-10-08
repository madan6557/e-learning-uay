# LEMBAR PENGAJUAN TEKNIS PENYELARASAN INTEGRASI SSO UAY — E-LEARNING
**Ringkasan Kebutuhan Atribut Identitas & Opsi Integrasi Teknis (Technical Brief)**  
*Versi: 1.0 (Ringkas) | Tanggal: 25 September 2026 | Ditujukan Kepada: Tim Pengembang SSO UAY & PUSTIK UAY*

---

## 1. Latar Belakang & Kendala Teknis
Berdasarkan telaah terhadap Bab 7 (*Authentication & Session*) Dokumen Teknis SSO UAY, Keycloak SSO saat ini hanya menerbitkan Access Token dengan klaim identitas dasar (`sub`, `preferred_username`, `email`, `name`).

Agar E-Learning UAY dapat menghubungkan mahasiswa ke rombongan belajar (kelas kuliah), mencatat nilai KRS, memvalidasi presensi, dan menerapkan hak akses dosen vs mahasiswa (RBAC), **E-Learning memerlukan 4 atribut data tambahan** dari ekosistem SSO.

---

## 2. 4 Poin Kebutuhan Data yang Belum Terpenuhi

| No | Atribut / Data | Sumber di Database SSO | Tipe Data | Urgensi & Fungsi Nyata di E-Learning |
|---|---|---|---|---|
| **1** | **`identifier_value`** | `user_identifiers.identifier_value` | String *(NIM / NIDN)* | **Kritis (Wajib)**. Kunci pengait mahasiswa ke kelas kuliah, kurikulum prodi, presensi, dan pelaporan nilai SIMAK/PDDikti. |
| **2** | **`roles`** | `application_access` $ightarrow$ `roles.name` | Array String | **Kritis (Wajib)**. Menentukan hak akses: `INSTRUCTOR` (dosen pengampu materi/kuis) vs `STUDENT` (mahasiswa). |
| **3** | **`status`** | `users.status` / `accounts.status` | String (`ACTIVE`/`DISABLED`) | **Kritis (Wajib)**. Memastikan akun aktif. Memblokir mahasiswa cuti/skorsing agar tidak dapat menyusup ke ujian online. |
| **4** | **`user_type`** | `users.user_type` | String (`STUDENT`, `LECTURER`, dll.) | **Penting**. Menentukan tipe direktori pengguna untuk personalisasi dashboard dan fitur profil LMS. |

---

## 3. Mengapa Atribut Ini Mutlak Diperlukan?
1. **Distribusi Kelas Kuliah**: E-Learning memetakan mahasiswa ke kelas mata kuliah spesifik berdasarkan **NIM**. Tanpa NIM, mahasiswa yang berhasil login tidak akan menemukan mata kuliah yang diikutinya.
2. **Integritas Penilaian & Transkrip**: Nilai kuis, tugas, dan ujian akhir terikat secara hukum pada NIM mahasiswa dan NIDN dosen pengampu untuk sinkronisasi ke SIAKAD.
3. **Kontrol Hak Akses (RBAC)**: Membedakan secara tegas antarmuka Dosen (mengunggah modul, membuat soal) dan Mahasiswa (mengerjakan tugas, melihat materi).

---

## 4. Dua Pilihan Solusi Praktis (Pilih Salah Satu)

### 🟢 OPSI A: Tambahkan Protocol Mapper di Keycloak (Sangat Direkomendasikan)
*Tim SSO cukup menambahkan 4 konfigurasi Protocol Mapper pada client `elearning-uay` di Keycloak Admin Console. **Estimasi pengerjaan ~15 menit, tanpa coding (zero code), latensi 0 ms (stateless), dan tahan lonjakan trafik saat ujian serentak.***

**Tabel Konfigurasi Mapper di Keycloak:**
| Nama Mapper | Mapper Type | User Attribute (SSO) | Token Claim Name | Add to ID/Access Token |
|---|---|---|---|---|
| `nim_nidn_mapper` | `User Attribute` | `identifier_value` *(atau NIM/NIDN)* | `identifier_value` | **ON / ON** |
| `elearning_roles_mapper` | `User Client Role` / `Attribute` | `roles` | `roles` | **ON / ON** *(Multivalued: ON)* |
| `account_status_mapper` | `User Attribute` | `status` | `status` | **ON / ON** |
| `user_type_mapper` | `User Attribute` | `user_type` | `user_type` | **ON / ON** |

---

### 🟡 OPSI B: Penyediaan Endpoint REST API di Backend SSO (Alternatif)
*Jika Tim SSO memilih Keycloak tetap murni tanpa custom mapper (sesuai alur Bab 7.9 & 20.2.3), mohon Tim SSO menyediakan 1 endpoint REST API di Backend SSO:*

* **Endpoint**: `GET /api/v1/auth/context`
* **Request Header**: `Authorization: Bearer <token_keycloak>`, `X-Client-ID: elearning-uay`
* **Response JSON (200 OK)**:
```json
{
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "identifier_value": "202401001",
  "identifier_type": "NIM",
  "roles": ["STUDENT"],
  "status": "ACTIVE",
  "user_type": "STUDENT"
}
```

---

## 5. Contoh Payload Token JWT Lengkap yang Diharapkan (Opsi A)
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "preferred_username": "202401001",
  "name": "Ahmad Dahlan",
  "email": "ahmad.dahlan@uay.ac.id",
  "user_type": "STUDENT",
  "status": "ACTIVE",
  "identifier_type": "NIM",
  "identifier_value": "202401001",
  "roles": ["STUDENT"]
}
```

---

## 6. Tindak Lanjut & Kontak Pengujian
Tim E-Learning telah menyiapkan kode backend untuk langsung menerima format di atas. Begitu Tim SSO mengaktifkan salah satu opsi di lingkungan Staging UAY, kami siap melakukan pengujian integrasi bersama.

*Palu, 25 September 2026 — Tim Pengembang E-Learning UAY*
