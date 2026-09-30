# LEMBAR KERJA PRAKTIKUM: PENGUJIAN APLIKASI (QA)
## Mata Kuliah: Pengenalan Informatika — Universitas Achmad Yani (UVAYA)
**Platform Sasaran:** [E-Learning UAY](https://e-learning-uay.vercel.app/)  
**Kelas Uji Coba:** IF2101 - Pemrograman Web (Kelas A)

---

### 💡 Apa itu Software Quality Assurance (QA)?
Sebagai mahasiswa Informatika, hari ini kita berlatih menjadi **Quality Assurance (QA)**.  
Tugas seorang QA adalah mencoba aplikasi selayaknya pengguna sungguhan untuk memastikan tombol berfungsi, teks mudah dibaca, dan alur aplikasi berjalan lancar.
- Beri tanda centang `[x]` pada kolom **PASS** jika fitur berhasil berjalan sesuai petunjuk.
- Beri tanda centang `[x]` pada kolom **FAIL** dan tulis catatan jika menemukan error, tombol macet, atau tampilan janggal.

---

### IDENTITAS MAHASISWA (TESTER)
- **Nama Mahasiswa:** __________________________________________________
- **NIM Lengkap:** __________________________________________________
- **Akun Demo yang Digunakan:** `[ ] Mahasiswa 01 - 10`  `[ ] Dosen, M.Kom.`
- **Perangkat yang Digunakan:** `[ ] Laptop`  `[ ] PC Laboratorium`  `[ ] HP Smartphone (Chrome / Edge)`
- **Waktu Sesi Praktikum:** __________________________________________________

---

## BAGIAN 1: UJI COBA DASAR (Langkah demi Langkah)

Ikuti 7 langkah dasar pengujian berikut pada aplikasi:

| No | Fitur yang Diuji | Langkah Uji Sederhana | Hasil yang Diharapkan | Hasil Uji Anda |
|:--:|---|---|---|:--:|
| **1** | **Login Akun Demo** | Buka web → scroll ke bagian *"Akun demonstrasi"* → klik tombol **"Gunakan"** pada salah satu akun Mahasiswa (misal: *Mahasiswa 01*). | Berhasil masuk ke halaman Dashboard. Nama akun Anda tampil di sudut kanan atas. | [ ] PASS<br>[ ] FAIL |
| **2** | **Buka Kelas & Baca Materi** | Klik kelas **IF2101 Pemrograman Web** → buka materi kuliah pertemuan pertama. | Halaman materi terbuka rapi, teks terbaca jelas, serta kotak kode/catatan tampil normal. | [ ] PASS<br>[ ] FAIL |
| **3** | **Centang Checklist Belajar** | Di dalam halaman materi kuliah, cari daftar ceklis materi → coba klik kotak centangnya. | Kotak berhasil tercentang dan status progres tersimpan tanpa error. | [ ] PASS<br>[ ] FAIL |
| **4** | **Mengerjakan Kuis** | Buka menu/tab **Kuis** → pilih *Kuis 01* → pilih salah satu jawaban → klik tombol **Kumpulkan / Submit**. | Jawaban tersimpan, dan muncul tanda atau skor bahwa kuis telah selesai dikerjakan. | [ ] PASS<br>[ ] FAIL |
| **5** | **Kumpul Tugas Praktikum** | Buka menu tugas *Praktikum 01* → ketik teks singkat di kolom jawaban tugas → klik **Kumpulkan Tugas**. | Tugas berhasil terkirim dan status berubah menjadi *"Sudah Dikumpulkan"*. | [ ] PASS<br>[ ] FAIL |
| **6** | **Cek Rekap Nilai** | Buka tab/menu **Nilai (Gradebook)** di dalam kelas yang sedang dibuka. | Tampil daftar tugas dan kuis beserta skor atau status penilaiannya. | [ ] PASS<br>[ ] FAIL |
| **7** | **Cek Profil & Keluar** | Buka menu profil di kanan atas, periksa data diri → lalu klik tombol **Keluar (Logout)**. | Informasi profil sesuai dan tombol keluar membawa Anda kembali ke halaman depan. | [ ] PASS<br>[ ] FAIL |

---

## BAGIAN 2: EKSPLORASI KREATIF (Uji Bebas Tambahan Anda)

Sekarang giliran Anda mencoba hal baru di luar langkah dasar!  
*Contoh ide uji coba:*
- *Coba klik tombol berulang kali dengan cepat (apakah aplikasi macet?)*
- *Coba kumpulkan tugas tanpa mengisi teks sama sekali (apakah sistem menolak input kosong?)*
- *Coba perkecil jendela browser / buka di HP (apakah tampilannya tetap rapi?)*
- *Coba login menggunakan akun **Dosen, M.Kom.** dan lihat apakah antrean nilai mahasiswa langsung muncul.*

| No | Ide Eksplorasi Anda | Langkah Percobaan yang Dilakukan | Hasil yang Terjadi | Status |
|:--:|---|---|---|:--:|
| **1** | *(Tuliskan ide Anda)* | 1. <br>2. | | [ ] PASS<br>[ ] FAIL |
| **2** | *(Tuliskan ide Anda)* | 1. <br>2. | | [ ] PASS<br>[ ] FAIL |
| **3** | *(Tuliskan ide Anda)* | 1. <br>2. | | [ ] PASS<br>[ ] FAIL |

---

## BAGIAN 3: CATATAN TEMUAN BUG ATAU SARAN TAMPILAN

Jika selama pengujian Anda menemukan tombol macet, salah ketik teks (*typo*), pesan error aneh, atau tampilan yang kurang nyaman, tuliskan di bawah ini:

| Bagian | Keterangan Temuan Anda |
|---|---|
| **Judul Masalah / Bug** | *(contoh: Tombol submit kuis tidak sengaja tertekan 2 kali / Teks tombol terpotong di HP)* |
| **Halaman Terkait** | *(contoh: Halaman Kuis 01 / Halaman Tugas / Menu Profil)* |
| **Langkah Singkat Menemukan** | 1. ____________________________________________________________________<br>2. ____________________________________________________________________ |
| **Kenyataan vs Harapan** | **Yang Terjadi:** _______________________________________________________<br>**Seharusnya:** ________________________________________________________ |
| **Saran Perbaikan UI/UX Anda** | ________________________________________________________________________ |

---

<br>

| Mahasiswa Penguji (Tester) | Instruktur / Asisten Laboratorium |
|:---:|:---:|
| <br><br><br><br>*( _____________________________ )* | <br><br><br><br>*( _____________________________ )* |
