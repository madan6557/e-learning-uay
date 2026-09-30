# RUNDOWN & PANDUAN MENGAJAR PRAKTIK QA
## Mata Kuliah: Pengenalan Informatika (Universitas Achmad Yani Banjarmasin)
**Instruktur:** Bang Iky (Lead) & Alif (Co-Lead / Fasilitator Lab)  
**Estimasi Durasi:** 100 Menit (2 SKS Praktikum)  
**Topik:** Pengenalan Rekayasa Perangkat Lunak melalui Peran Software Quality Assurance (QA) pada E-Learning UAY

---

## 1. PEMBAGIAN PERAN INSTRUKTUR

| Tanggung Jawab | Bang Iky (Lead) | Alif (Co-Lead / Lab Master) |
|---|---|---|
| **Fokus Utama** | Konseptual, presentasi slide, demo langsung di proyektor, review hasil temuan bug. | Teknis lab, pembagian lembar kerja & akun, keliling troubleshooting mahasiswa, rekapitulasi temuan. |
| **Peralatan** | Laptop terhubung proyektor, mikrofon. | Laptop kontrol database/monitoring, lembar cetak akun / form online. |
| **Interaksi Kelas** | Menghidupkan suasana kelas dari depan, memoderasi tanya jawab. | Mendampingi mahasiswa yang bingung, memastikan semua mahasiswa bisa login dan tidak ada yang pasif. |

---

## 2. RUNDOWN KELAS MENIT DEMI MENIT (100 MENIT)

```
[00:00 - 00:10] (10 Menit) - Pembukaan & Ice Breaking (Bang Iky & Alif)
[00:10 - 00:30] (20 Menit) - Pemaparan Materi: "Software Testing 101" (Bang Iky)
[00:30 - 00:40] (10 Menit) - Demo Sistem & Pembagian Akun Tester (Bang Iky & Alif)
[00:40 - 00:80] (40 Menit) - Sesi Hands-on Lab: Mahasiswa Menjadi Tester (Didampingi Alif & Iky)
[00:80 - 00:95] (15 Menit) - Presentasi "Bug of The Day" & Ulasan Temuan (Bang Iky)
[00:95 - 01:00] (05 Menit) - Penutup & Refleksi Rekayasa Perangkat Lunak (Bang Iky & Alif)
```

---

### DETAIL TAHAPAN

### 1. Pembukaan & Pengantar Realitas (Menit 00 – 10)
- **Oleh:** Bang Iky (didampingi Alif).
- **Tujuan:** Menarik perhatian mahasiswa baru bahwa Informatika bukan cuma mengetik sintaks kode yang membosankan, tapi membangun produk yang aman dan teruji.
- **Poin Bicara Bang Iky:**
  > *"Adik-adik sekalian, di dunia informatika, menulis kode itu baru setengah pekerjaan. Setengah pekerjaan yang paling menentukan masa depan aplikasi adalah: **Memastikan kode itu tidak membuat bencana saat dipakai orang banyak**.*  
  > *Hari ini, kalian tidak akan disuruh menghafal teori. Hari ini, seluruh kelas ini resmi direkrut menjadi **Software Quality Assurance (QA) Team** untuk aplikasi kampus kita sendiri: E-Learning UAY!"*

### 2. Pemaparan Slide: Menjadi Software Tester (Menit 10 – 30)
- **Oleh:** Bang Iky.
- **Media:** Buka file `docs/qa/SLIDE-PRESENTASI-TESTING.html` di browser (tekan F11 untuk Fullscreen).
- **Alur Slide:**
  1. **Slide 1-2:** Kisah nyata kegagalan software (contoh roket Ariane 5 atau sistem KRS/Akademik down saat ribuan orang akses bersamaan).
  2. **Slide 3:** Bedanya pikiran Developer vs pikiran Tester (*Developer bias vs Tester curiosity*).
  3. **Slide 4:** *Happy Path* (jalan santai) vs *Negative Testing* (sengaja input aneh, batas maksimal, jaringan putus).
  4. **Slide 5:** Apa itu Test Case? (Prasyarat, Langkah, Ekspektasi, Realita).
  5. **Slide 6:** Cara lapor bug yang profesional (jangan cuma teriak *"Kak error kak!"* tapi sebutkan *Steps to Reproduce* dan sertakan *screenshot*).
  6. **Slide 7-8:** Pengenalan 4 peran (Mahasiswa, Dosen, Admin Prodi, Super Admin/Chaos).

### 3. Distribusi Akun & Demo Cepat (Menit 30 – 40)
- **Oleh:** Alif & Bang Iky.
- **Aksi Alif:**
  - Membagikan lembar kerja (`LEMBAR-KERJA-TESTER-MAHASISWA.md`) atau mengirimkan tautan Google Form / Google Sheets pembagian akun ke grup kelas.
  - Memastikan setiap meja mahasiswa mendapat nomor akun unik (misal: Meja 1 = Mahasiswa Tester 01, Meja 2 = Mahasiswa Tester 02, dst.).
- **Aksi Bang Iky (Demo di Proyektor):**
  - Buka `https://e-learning-uay.vercel.app/`.
  - Tunjukkan cara scroll ke bawah ke bagian **"Akun demonstrasi"**.
  - Klik tombol **"Gunakan"** pada salah satu akun contoh.
  - Tunjukkan bagaimana berpindah antar menu tanpa perlu password rumit.

### 4. Sesi Hands-On Pengujian Lab (Menit 40 – 80 / 40 Menit)
- **Aktivitas Mahasiswa:**
  - Mahasiswa login dengan akun masing-masing.
  - Menjalankan skenario pada lembar kerja:
    - Kelompok Mahasiswa menguji pengerjaan kuis (8 tipe soal!), membaca modul interaktif, dan submit tugas praktikum.
    - Kelompok Dosen menguji pembuatan pengumuman baru dan memberi nilai untuk esai mahasiswa.
    - Kelompok Admin Prodi memeriksa kelola kelas dan isolasi jurusan.
    - Kelompok Chaos/Security mencoba hal-hal tak terduga (submit kosong, coba inspect element, coba buka di HP).
- **Peran Alif & Bang Iky:**
  - Berkeliling ke meja mahasiswa secara proaktif.
  - Jika ada mahasiswa yang menemukan glitch / error, bimbing mereka: *"Bagus! Sekarang tulis di formulir: apa langkah yang barusan kamu klik sebelum error itu muncul?"*
  - Alif mencatat 2-3 temuan paling menarik untuk dijadikan bahan ulasan di akhir sesi.

### 5. Review "Bug of The Day" & Diskusi Kelas (Menit 80 – 95)
- **Oleh:** Bang Iky.
- **Aktivitas:**
  - Bang Iky memanggil 2–3 mahasiswa yang menemukan temuan paling unik/kritis untuk menceritakan temuannya di depan kelas.
  - Bang Iky memperlihatkan di layar proyektor bagaimana temuan mahasiswa tersebut membantu para developer memperbaiki aplikasi.
  - Memberi apresiasi (applause atau nilai poin keaktifan) bagi penemu bug terbaik.

### 6. Penutup & Tugas Pengumpulan (Menit 95 – 100)
- **Oleh:** Alif & Bang Iky.
- Mahasiswa mengumpulkan lembar checklist atau submit form bug report.
- Pengantar untuk materi pekan depan: *"Sekarang kalian sudah tahu bagaimana sistem diuji. Pertemuan selanjutnya, kita akan belajar bagaimana merancang algoritma dan logika programnya!"*

---

## 3. CHECKLIST PERSIAPAN H-1 (MALAM INI)

- [ ] **Pastikan URL Deployment Aktif:** Buka `https://e-learning-uay.vercel.app/` di browser laptop.
- [ ] **Buka Slide HTML:** Buka file `docs/qa/SLIDE-PRESENTASI-TESTING.html` di Chrome, coba navigasi panah kiri/kanan dan tombol Fullscreen (F11).
- [ ] **Siapkan Salinan Akun:** Buka `docs/qa/DAFTAR-AKUN-TESTER.md` untuk referensi pembagian nomor meja mahasiswa.
- [ ] **Siapkan Lembar Kerja:** Cetak beberapa rangkap `docs/qa/LEMBAR-KERJA-TESTER-MAHASISWA.md` atau copy ke Google Docs/Form untuk diisi mahasiswa.
- [ ] **Kabel HDMI / Converter:** Pastikan konektor laptop Bang Iky / Alif ke proyektor lab berfungsi.

---

## 4. PENANGANAN SKENARIO DARURAT DI LAB (CONTINGENCY PLAN)

1. **Kasus: Koneksi Internet Lab Sangat Lambat / Putus**
   - **Solusi:** Jalankan server lokal di laptop instruktur (`npm run dev`), lalu sambungkan laptop mahasiswa ke hotspot lokal atau WiFi lab dengan IP lokal laptop instruktur (`http://<IP-LOKAL>:5173`).
2. **Kasus: Dua Mahasiswa Menggunakan Akun yang Sama dan Saling Bentrok**
   - **Solusi:** Alif langsung mengarahkan salah satu mahasiswa menggunakan akun cadangan (misal: *Mahasiswa Tester 25* sampai *Mahasiswa Tester 30*).
3. **Kasus: Mahasiswa Mengeluh "Tombol Masuk SSO Tidak Bisa Diklik"**
   - **Solusi:** Arahkan mahasiswa untuk tidak klik tombol hijau besar "Masuk SSO" di atas, melainkan scroll sedikit ke bawah ke bagian kotak **"Akun demonstrasi"** dan klik tombol biru/abu **"Gunakan"** di kartu nama mereka.
