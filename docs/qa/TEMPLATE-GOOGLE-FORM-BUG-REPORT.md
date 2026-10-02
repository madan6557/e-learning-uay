# TEMPLATE & SCRIPT GOOGLE FORM PENGUMPULAN HASIL QA
## Praktikum Pengenalan Informatika · Platform E-Learning UAY

---

### METODE 1: OTOMATIS DENGAN GOOGLE APPS SCRIPT (Selesai dalam 10 Detik)

Langkah-langkah:
1. Di halaman Google Form yang sedang Anda buka, klik tombol **Menu Titik Tiga (`⋮`)** di pojok kanan atas (di sebelah tombol ungu *Publikasikan/Kirim*).
2. Pilih **Editor skrip** (*Script editor*).
3. Hapus semua tulisan di editor skrip tersebut, lalu salin dan tempel (paste) kode berikut:

```javascript
function buatFormulirQA() {
  const form = FormApp.getActiveForm();

  // Bersihkan pertanyaan kosong bawaan
  const existingItems = form.getItems();
  for (let i = existingItems.length - 1; i >= 0; i--) {
    form.deleteItem(existingItems[i]);
  }

  // Atur Judul & Deskripsi
  form.setTitle("Laporan Pengujian Aplikasi (QA) - E-Learning UAY");
  form.setDescription(
    "Formulir pengumpulan hasil pengujian dan laporan temuan kendala/saran pada platform E-Learning UAY untuk mata kuliah Pengenalan Informatika.\n\n" +
    "Target Web: https://e-learning-uay.vercel.app/\n" +
    "Silakan isi formulir ini sesuai hasil pengujian yang Anda lakukan pada lembar kerja praktikum."
  );

  // --- BAGIAN 1: IDENTITAS MAHASISWA ---
  form.addTextItem()
    .setTitle("Nama Lengkap Mahasiswa")
    .setRequired(true);

  form.addTextItem()
    .setTitle("NIM Mahasiswa")
    .setRequired(true);

  const akunItem = form.addListItem()
    .setTitle("Akun Demo yang Digunakan");
  akunItem.setChoiceValues([
    "Mahasiswa 01", "Mahasiswa 02", "Mahasiswa 03", "Mahasiswa 04", "Mahasiswa 05",
    "Mahasiswa 06", "Mahasiswa 07", "Mahasiswa 08", "Mahasiswa 09", "Mahasiswa 10",
    "Dosen, M.Kom.",
    "Lainnya"
  ]);
  akunItem.setRequired(true);

  const deviceItem = form.addCheckboxItem()
    .setTitle("Perangkat & Browser yang Digunakan");
  deviceItem.setChoiceValues([
    "PC Laboratorium (Chrome / Edge)",
    "Laptop Pribadi (Chrome / Edge / Firefox)",
    "HP Smartphone (Android / iOS)",
    "Lainnya"
  ]);
  deviceItem.setRequired(true);

  // --- BAGIAN 2: HASIL PENGUJIAN DASAR ---
  const statusItem = form.addMultipleChoiceItem()
    .setTitle("Hasil Pengujian 7 Langkah Uji Dasar");
  statusItem.setChoiceValues([
    "Semua Berjalan Lancar (100% PASS)",
    "Sebagian Berhasil, Ada Sedikit Kendala",
    "Menemukan Tombol Macet / Error (FAIL)"
  ]);
  statusItem.setRequired(true);

  const fiturItem = form.addCheckboxItem()
    .setTitle("Fitur yang Berhasil Anda Uji");
  fiturItem.setChoiceValues([
    "Login Akun Demo",
    "Buka Kelas & Baca Materi Kuliah",
    "Centang Checklist Belajar",
    "Mengerjakan & Kumpul Kuis",
    "Kumpul Tugas Praktikum",
    "Cek Rekap Nilai (Gradebook)",
    "Menu Profil & Keluar (Logout)",
    "Eksplorasi Kreatif / Akun Dosen"
  ]);

  // --- BAGIAN 3: TEMUAN MASALAH ATAU SARAN PERBAIKAN ---
  const section2 = form.addPageBreakItem()
    .setTitle("Laporan Temuan Bug & Saran Perbaikan")
    .setHelpText("Isi bagian ini jika menemukan error, tombol macet, salah ketik, atau memiliki saran perbaikan.");

  form.addTextItem()
    .setTitle("Judul Masalah / Bug")
    .setHelpText("Contoh: Tombol submit kuis tertekan 2 kali / Teks terpotong di HP / Tidak ada (Semua lancar)");

  const severityItem = form.addMultipleChoiceItem()
    .setTitle("Tingkat Keparahan (Severity)");
  severityItem.setChoiceValues([
    "Kritis (Blocker) - Aplikasi macet total / blank putih",
    "Tinggi (Major) - Fitur penting gagal bekerja",
    "Sedang (Minor) - Fitur berjalan tapi ada error atau perilaku aneh",
    "Rendah / Tampilan (Cosmetic) - Salah ketik teks (typo), tata letak kurang rapi, saran UI",
    "Tidak Menemukan Masalah (Sistem Berjalan Sangat Baik)"
  ]);

  form.addParagraphTextItem()
    .setTitle("Langkah-Langkah Menemukan Masalah (Steps to Reproduce)")
    .setHelpText("Tuliskan langkah 1, 2, 3 yang Anda lakukan sampai masalah tersebut muncul.");

  form.addParagraphTextItem()
    .setTitle("Apa yang Terjadi vs Apa yang Seharusnya?")
    .setHelpText("Tuliskan apa yang error/muncul di layar dan bagaimana seharusnya yang benar.");

  form.addParagraphTextItem()
    .setTitle("Saran Perbaikan Tampilan / Pengalaman Pengguna (UI/UX)")
    .setHelpText("Tuliskan ide saran Anda agar aplikasi lebih nyaman digunakan.");
}
```

4. Klik icon **Simpan** (💾 Disk) atau tekan `Ctrl + S`.
5. Klik tombol **Jalankan** (*Run* / ▶️) di atas.
6. Berikan izin akses (*Review Permissions*) akun Google Anda jika diminta (klik akun Anda → *Advanced* → *Go to script (unsafe)* → *Allow*).
7. Kembali ke tab Google Form Anda, dan **refresh (F5)**: seluruh formulir sudah jadi secara otomatis!

---

### METODE 2: SUSUNAN MANUAL (Jika Ingin Tambah Satu per Satu)

Jika ingin membuat manual di tampilan Google Form:

1. **Judul Formulir:**
   `Laporan Pengujian Aplikasi (QA) - E-Learning UAY`
   *Deskripsi:*
   `Formulir pengumpulan hasil pengujian dan temuan kendala pada platform E-Learning UAY untuk mata kuliah Pengenalan Informatika.`

2. **Pertanyaan 1:** `Nama Lengkap Mahasiswa`
   - Tipe: **Jawaban singkat** (*Short answer*)
   - Wajib diisi: **Aktif (ON)**

3. **Pertanyaan 2:** `NIM Mahasiswa`
   - Tipe: **Jawaban singkat** (*Short answer*)
   - Wajib diisi: **Aktif (ON)**

4. **Pertanyaan 3:** `Akun Demo yang Digunakan`
   - Tipe: **Drop-down** atau **Pilihan ganda**
   - Pilihan opsi:
     - `Mahasiswa 01`
     - `Mahasiswa 02`
     - `Mahasiswa 03`
     - `Mahasiswa 04`
     - `Mahasiswa 05`
     - `Mahasiswa 06`
     - `Mahasiswa 07`
     - `Mahasiswa 08`
     - `Mahasiswa 09`
     - `Mahasiswa 10`
     - `Dosen, M.Kom.`
     - `Lainnya`
   - Wajib diisi: **Aktif (ON)**

5. **Pertanyaan 4:** `Hasil Pengujian 7 Langkah Uji Dasar`
   - Tipe: **Pilihan ganda** (*Multiple choice*)
   - Pilihan opsi:
     - `Semua Berjalan Lancar (100% PASS)`
     - `Sebagian Berhasil, Ada Sedikit Kendala`
     - `Menemukan Tombol Macet / Error (FAIL)`
   - Wajib diisi: **Aktif (ON)**

6. **Pertanyaan 5:** `Judul Masalah / Bug (Jika Ada)`
   - Tipe: **Jawaban singkat** (*Short answer*)
   - Deskripsi/Contoh: *Tombol kuis tertekan 2 kali / Teks terpotong di HP / Tidak menemukan bug*
   - Wajib diisi: **Nonaktif (OFF)**

7. **Pertanyaan 6:** `Langkah-Langkah Menemukan Masalah`
   - Tipe: **Paragraf** (*Long answer*)
   - Wajib diisi: **Nonaktif (OFF)**

8. **Pertanyaan 7:** `Apa yang Terjadi vs Apa yang Seharusnya?`
   - Tipe: **Paragraf** (*Long answer*)
   - Wajib diisi: **Nonaktif (OFF)**

9. **Pertanyaan 8:** `Saran Perbaikan Tampilan / UI/UX`
   - Tipe: **Paragraf** (*Long answer*)
   - Wajib diisi: **Nonaktif (OFF)**

---

### Tips Menghubungkan ke Google Sheets:
Di tab atas formulir Google Form Anda:
Klik tab **Jawaban** (*Responses*) → Klik ikon hijau **Tautkan ke Spreadsheet** (*Link to Sheets*) → Klik **Buat spreadsheet baru**.
Maka seluruh laporan mahasiswa saat praktikum akan masuk ke tabel Excel/Google Sheets secara *real-time*.
