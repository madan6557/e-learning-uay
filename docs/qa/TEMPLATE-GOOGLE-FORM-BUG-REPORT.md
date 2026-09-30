# TEMPLATE FORMULIR PENGUMPULAN BUG (GOOGLE FORM / SHEETS)
## Untuk Praktikum Pengenalan Informatika · Lab E-Learning UAY

Bila Bang Iky & Alif ingin mahasiswa mengumpulkan laporan pengujian secara online lewat **Google Form**, berikut struktur pertanyaan yang tinggal disalin (copy-paste) ke Google Form:

---

### JUDUL FORMULIR:
`Laporan Praktikum QA: Uji Coba Aplikasi E-Learning UAY`

### DESKRIPSI FORMULIR:
`Formulir pengumpulan hasil pengujian dan laporan temuan bug pada platform E-Learning UAY untuk mahasiswa mata kuliah Pengenalan Informatika.`

---

### DAFTAR PERTANYAAN (FIELDS):

#### 1. Nama Lengkap Mahasiswa
- **Tipe:** Jawaban Singkat (*Short answer*)
- **Wajib Diisi (Required):** Ya

#### 2. NIM Asli Mahasiswa
- **Tipe:** Jawaban Singkat (*Short answer*)
- **Wajib Diisi (Required):** Ya

#### 3. Akun Dummy yang Digunakan
- **Tipe:** Pilihan Ganda (*Multiple choice*) atau Jawaban Singkat
- **Contoh Opsi:**
  - Mahasiswa Tester 01 s/d 30
  - Dosen Tester (Dr. Rina / Dosen Tester 02)
  - Admin Prodi Informatika
  - Super Admin UAY / Bima Saputra (Outsider)

#### 4. Peran (Role) yang Diuji
- **Tipe:** Pilihan Ganda (*Multiple choice*)
  - `Mahasiswa (Peserta Kelas)`
  - `Dosen Pengampu (Instructor)`
  - `Admin Program Studi`
  - `Super Admin / Chaos Tester`
- **Wajib Diisi:** Ya

#### 5. Fitur atau Halaman yang Diuji
- **Tipe:** Kotak Centang (*Checkboxes*) — Boleh pilih lebih dari satu
  - `[ ] Login & Navigasi Akun`
  - `[ ] Profil Pengguna & Pengaturan`
  - `[ ] Modul Materi Kuliah (Rich Text / Code / Video)`
  - `[ ] Checklist Interaktif Materi`
  - `[ ] Kuis Online (Pilihan Ganda / Isian / Menjodohkan)`
  - `[ ] Pengumpulan Tugas (Assignment Submission)`
  - `[ ] Rekap Nilai (Gradebook)`
  - `[ ] Pembuatan Pengumuman Kelas`
  - `[ ] Penilaian Tugas & Rubrik Esai (Role Dosen)`
  - `[ ] Kelola Kelas & Kurikulum (Role Admin)`
  - `[ ] Jejak Audit (Audit Trail)`
- **Wajib Diisi:** Ya

#### 6. Apakah Skenario Utama Berhasil (PASS)?
- **Tipe:** Pilihan Ganda (*Multiple choice*)
  - `Ya, Seluruhnya Berjalan Lancar (PASS)`
  - `Sebagian Berjalan, Ada Sedikit Kendala`
  - `Gagal / Menemukan Bug (FAIL)`
- **Wajib Diisi:** Ya

#### 7. Judul Temuan Masalah / Bug (Jika Ada)
- **Tipe:** Jawaban Singkat (*Short answer*)
- *Contoh: "Tombol simpan nilai tidak merespons di layar HP", "Teks penjelasan kuis terpotong"*

#### 8. Tingkat Keparahan Masalah (Severity)
- **Tipe:** Pilihan Ganda (*Multiple choice*)
  - `Kritis (Blocker) - Aplikasi macet/blank putih, tidak bisa lanjut sama sekali`
  - `Tinggi (Major) - Fitur penting gagal bekerja`
  - `Sedang (Minor) - Fitur bisa dipakai tapi ada error/perilaku aneh`
  - `Rendah / Kosmetik (Trivial) - Salah ketik (typo), tata letak kurang rapi, usulan tampilan`
  - `Tidak Menemukan Masalah (Sistem Bagus)`

#### 9. Langkah Menemukan Masalah (Steps to Reproduce)
- **Tipe:** Paragraf (*Long answer text*)
- *Tuliskan langkah 1, 2, 3 yang Anda lakukan sebelum masalah muncul.*

#### 10. Hasil yang Diharapkan vs Hasil Nyata
- **Tipe:** Paragraf (*Long answer text*)
- *Jelaskan apa yang seharusnya terjadi dan apa yang justru terjadi di layar.*

#### 11. Unggah Tangkapan Layar (Screenshot Bukti)
- **Tipe:** Upload File (*File upload*)
- **Wajib Diisi:** Tidak (Opsional untuk nilai tambah)

#### 12. Kesan & Pengalaman Menjadi Software Tester Hari Ini
- **Tipe:** Paragraf (*Long answer text*)
- *Apa pelajaran paling menarik yang Anda dapatkan tentang pentingnya pengujian aplikasi?*

---

### LINK HASIL & SPREADSHEET
Setelah form dibuat, klik tab **Responses** → **Link to Sheets** agar seluruh laporan mahasiswa langsung otomatis terkumpul dalam satu tabel Excel/Google Sheets secara *real-time* di laptop Alif dan Bang Iky selama jam praktikum!
