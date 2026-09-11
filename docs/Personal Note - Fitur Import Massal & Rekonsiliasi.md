# CATATAN PRIBADI (PERSONAL NOTE): FITUR IMPORT MASSAL & REKONSILIASI DATA
**Platform Digital E-Learning Universitas Achmad Yani (UAY)**  
*Dokumen Rujukan Cepat untuk Product Owner & Developer*

---

## 1. Penjelasan Singkat (Executive Summary)

Fitur **Import Massal (Excel / CSV)** di E-Learning UAY dirancang dengan filosofi **Human-in-the-Loop**. 

Artinya, sistem **tidak bekerja secara kaku atau sepihak**:
- **Bukan All-or-Nothing**: Sistem tidak langsung menggagalkan seluruh berkas hanya karena ada 1 atau 2 baris yang salah/duplikat.
- **Bukan Silent Override**: Sistem tidak langsung menimpa data di database tanpa persetujuan eksplisit pengguna.
- **Pemisahan Peran Tegas**: 
  - **Tugas Sistem**: Memindai berkas, mendeteksi cacat/duplikasi, dan menampilkan **Panel Review Diff** secara transparan (memberitahu mana yang berhasil dan mana yang bermasalah).
  - **Tugas Pengguna**: Melakukan keputusan koreksi langsung di layar (apakah baris bermasalah ingin **Dihapus/Diabaikan**, **Diedit di tempat**, atau **Ditambahkan/Ditimpa**).

Setelah pengguna selesai melakukan penyesuaian, sistem hanya mengeksekusi baris data yang telah berstatus valid ke dalam basis data melalui transaksi atomik (*ACID*).

---

## 2. Poin-Poin Kunci Fitur (Core Highlights)

### A. 4 Jenis Cacat yang Dideteksi Otomatis oleh Sistem
1. **Data Tidak Lengkap (*Missing Values*)**: Kolom esensial bernilai kosong (misal: NIM kosong, teks soal kosong, atau skor kosong).
2. **Duplikasi Internal Berkas (*Intra-File Duplicate*)**: Baris kembar di dalam file yang sama (misal: NIM yang sama tertulis 2 kali di file Excel). Sistem menampilkan referensi silang: *"Duplikat dengan Baris #05"*.
3. **Konflik Basis Data (*Database Conflict*)**: Data yang diimpor sudah ada di database (misal: mahasiswa bersangkutan sudah terdaftar di kelas rombel, atau kode butir soal sudah ada di Bank Soal).
4. **Format / Rentang Salah (*Type & Range Error*)**: Nilai skor di luar rentang 0.0 s.d. 100.0, kunci kuis `E` padahal opsi cuma sampai `D`, atau format email tidak valid.

### B. 3 Kontrol Aksi Koreksi di Tangan Pengguna
1. **Hapus / Abaikan (*Exclude*)**: Baris bermasalah dikeluarkan dari antrean impor. Baris yang valid lainnya tetap dapat diimpor tanpa kendala. Tersedia tombol massal *"Abaikan Semua Duplikat"*.
2. **Edit Langsung di Tabel (*Inline Editing*)**: Pengguna dapat langsung mengklik sel tabel yang salah di browser untuk mengoreksi nilainya (tidak perlu unduh ulang atau ubah Excel dari awal). Sistem memvalidasi ulang secara instan (*instant re-validation*).
3. **Tambahkan / Timpa (*Force Include / Override*)**: Untuk kasus duplikasi terhadap database, pengguna dapat memilih menimpa (*upsert*) rekaman lama atau membuat rekaman baru jika disengaja.

### C. Batasan Teknis & Integritas Data
- **Kapasitas Transaksi**: Direkomendasikan maksimal **500 baris per batch** per transaksi untuk menjaga performa server dan koneksi database.
- **Transaksi Atomik**: Seluruh data yang disetujui disimpan dalam satu siklus `BEGIN ... COMMIT` (*Read Committed*), mencegah risiko data tersimpan setengah-setengah.
- **Jejak Audit Otomatis**: Setiap aksi rekonsiliasi dan penimpaan data dicatat ke dalam `AuditLog` (`BULK_IMPORT_RECONCILED`).

---

## 3. Peta Bab & Bagian Dokumen yang Terkait (Document Cross-Reference)

Jika ingin meninjau atau mempresentasikan bagian ini, buka bab/bagian berikut:

| No | Lokasi Dokumen | Bagian / Sub-Bab | Topik Pembahasan Terkait |
| :---: | :--- | :--- | :--- |
| **1** | **Dokumen Teknis (DOCX & PDF)** | **Sub-bab 3.4.1 (Halaman 19)** | **Spesifikasi Lengkap Mesin Import Massal**:<br>• Diagram Alur Box Drawing Review Interaktif.<br>• Rincian 4 deteksi cacat sistem.<br>• Rincian 3 kontrol aksi koreksi pengguna.<br>• Penerapan pada 3 modul: Bank Soal Kuis, Enrollment Peserta, dan Sinkronisasi Gradebook Offline. |
| **2** | **Dokumen Teknis (DOCX & PDF)** | **Sub-bab 8.1 (Matriks BVA)** | **Matriks Boundary Value Analysis (BVA)**:<br>• Nilai batas berkas kosong (0 baris), batch valid, batch cacat parsial, dan batas kapasitas 500 baris per transaksi. |
| **3** | **Dokumen Teknis (DOCX & PDF)** | **Sub-bab 8.2 (Matriks Cause-Effect)** | **Skenario Event CE-09**:<br>• Alur sebab-akibat saat file anomali diunggah, penahanan commit (*pre-commit stage*), interaksi rekonsiliasi pengguna, hingga pencatatan di `AuditLog`. |
| **4** | **Dokumen Teknis (DOCX & PDF)** | **Sub-bab 3.7** | **Sistem Audit Log**:<br>• Pencatatan rekaman *before-after snapshot* saat data lama ditimpa oleh data dari berkas impor baru. |
| **5** | **Presentasi PowerPoint (PPTX & PDF)** | **Slide 11 (03: Efisiensi Pengelola)** | **Slide Eksekutif Siap Presentasi**:<br>• Kartu 1: *Review Interaktif & Panel Diff*<br>• Kartu 2: *Deteksi Cacat & Duplikasi*<br>• Kartu 3: *Tindakan Koreksi Pengguna (Human-in-the-Loop)* |
| **6** | **Skrip Otomasi Master** | `scratch/build_formal_v3.py` | Skrip Python generator master yang menghasilkan seluruh berkas Word, PDF, PPTX, dan slide PDF secara otomatis. |

---
*Catatan ini disusun untuk memudahkan navigasi cepat saat berdiskusi dengan Product Owner, Tim Dosen, Penguji QA, maupun pengembang teknis.*
