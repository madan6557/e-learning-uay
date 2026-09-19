# Panduan Pengujian Mandiri — E-Learning UAY

Tanggal: 19 September 2026. Acuan: **Technical Design E-Learning UAY v4.0**,
terutama sub-bab 8.1 (Boundary Value Analysis) dan 8.2 (Cause-Effect).

Dokumen ini untuk menguji **fitur E-Learning** secara mandiri. Integrasi SSO
kampus dan File Service kampus **belum** termasuk; lingkungan lokal memakai
fixture untuk keduanya (lihat [Batasan](#0-batasan-pengujian)).

Cara pakai: kerjakan per modul, centang `[x]` bila hasil sesuai kolom
**Harapan**. Bila tidak sesuai, catat nomor langkah dan **Nomor permintaan**
yang muncul pada pesan kesalahan.

---

## 0. Batasan pengujian

| Aspek | Status di lingkungan lokal |
| --- | --- |
| Login SSO | Fixture OIDC lokal (`127.0.0.1:4402`). Alur authorization code + PKCE + JWKS **nyata**, hanya penerbitnya yang fixture. |
| Unggah berkas | Fixture File Service lokal (`127.0.0.1:3001`). Tiket unggah, checksum, dan trash/restore **berjalan**. |
| Antivirus berkas | **Disimulasikan** selalu `CLEAN`. Tidak menguji deteksi malware sungguhan. |
| Email / notifikasi luar | Tidak ada. Notifikasi hanya in-app. |

Yang **tidak** bisa diuji di sini: kredensial kampus, pencabutan akun dari SSO
produksi, antivirus nyata, dan kuota penyimpanan File Service kampus.

---

## 1. Persiapan

```bash
npm ci
npm run db:generate
npm run dev
```

Buka **http://127.0.0.1:5173/**. Gunakan alamat `127.0.0.1`, jangan `localhost`
— cookie dan origin tidak akan cocok.

Akun demonstrasi (tombol **Gunakan** pada bagian "Akun demonstrasi"):

| Peran | Nama | Identitas |
| --- | --- | --- |
| Super admin | Admin UAY | ADM001 |
| Admin prodi | Admin Prodi Informatika | ADMIF01 |
| Dosen | Dr. Rina Puspitasari, M.Kom. | 1112089001 |
| Mahasiswa | Aditya Pratama | 202601001 |
| Mahasiswa | Nadia Putri | 202601002 |
| Mahasiswa (luar kelas) | Bima Saputra | 202602001 |

Kelas contoh: **IF2101 – Pemrograman Web / Kelas A**.

> Untuk menguji dua peran sekaligus, pakai satu jendela biasa dan satu jendela
> penyamaran (incognito). Dua tab pada jendela yang sama berbagi sesi.

- [ ] Stack menyala: antarmuka 5173, API 3000, File Service 3001, SSO 4402
- [ ] Landing publik tampil **tanpa** sidebar
- [ ] Masuk sebagai Dosen berhasil, dashboard muncul

---

## 2. Masuk, keluar, dan sesi

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 2.1 | Dari landing, klik **Masuk dengan SSO UAY** | Diarahkan ke halaman pemilih akun provider (judul tab "SSO UAY · Akun uji") | [ ] |
| 2.2 | Pilih satu akun | Kembali ke aplikasi dalam keadaan masuk; dashboard tampil | [ ] |
| 2.3 | Klik **Keluar** | Kembali ke landing publik; sidebar hilang | [ ] |
| 2.4 | Setelah keluar, tekan tombol *Back* peramban | Tidak masuk kembali; tetap di landing | [ ] |
| 2.5 | Buka `#/dashboard` langsung tanpa masuk | Diarahkan ke landing, bukan halaman kosong | [ ] |

---

## 3. Navigasi dan tampilan

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 3.1 | Klik setiap menu sidebar | Item aktif tersorot; breadcrumb ikut berubah | [ ] |
| 3.2 | Klik **Perkecil navigasi** | Rail menyempit jadi ikon saja; pilihan bertahan setelah muat ulang | [ ] |
| 3.3 | Arahkan kursor ke kapsul akun di kanan atas | Sorotan membulat di kiri, rata di sisi sekat | [ ] |
| 3.4 | Arahkan kursor ke tombol **Keluar** | Sorotan rata di kiri, membulat di kanan, bernuansa merah | [ ] |
| 3.5 | Perkecil jendela sampai ±375 px | Sidebar jadi laci; muncul tombol menu; **tidak ada** geser horizontal | [ ] |
| 3.6 | Buka laci lalu tekan `Esc` | Laci tertutup; fokus kembali ke tombol menu | [ ] |
| 3.7 | Tekan `Tab` dari awal halaman | Tautan **Lewati ke konten** muncul lebih dulu | [ ] |
| 3.8 | Telusuri halaman dengan `Tab` | Setiap elemen fokus punya cincin biru yang jelas | [ ] |
| 3.9 | Buka alamat ngawur, mis. `#/tidakada` | Halaman "tidak ditemukan" dengan tautan kembali, bukan layar kosong | [ ] |

---

## 4. Kelas dan pertemuan (peran: Dosen)

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 4.1 | Buka **Kelas saya → Pemrograman Web** | Halaman kelas dengan tab Materi, Rekap nilai, Pengumuman, Peserta, Bank soal, Berkas, Jejak audit | [ ] |
| 4.2 | Klik **Tambah pertemuan**, isi judul, simpan | Pertemuan baru muncul di urutan terakhir | [ ] |
| 4.3 | Gunakan panah ↑ ↓ pada pertemuan | Urutan berubah dan bertahan setelah muat ulang | [ ] |
| 4.4 | Edit pertemuan, matikan **Tampilkan kepada mahasiswa**, simpan | Pertemuan bertanda tersembunyi bagi dosen | [ ] |
| 4.5 | Masuk sebagai Mahasiswa, buka kelas yang sama | Pertemuan tersembunyi **tidak** terlihat | [ ] |
| 4.6 | Sebagai Dosen, isi **Dibuka pada** dengan tanggal besok | Mahasiswa melihat pertemuan terkunci sampai tanggal itu | [ ] |
| 4.7 | Ubah tab lewat alamat, mis. `?tab=ngawur` | Kembali otomatis ke tab Materi, bukan halaman kosong | [ ] |

---

## 5. Materi dan editor blok

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 5.1 | Tambah materi bertipe **Materi teks** | Editor blok terbuka | [ ] |
| 5.2 | Ketik `/` di editor | Menu pilihan blok muncul | [ ] |
| 5.3 | Coba blok: judul, daftar, kutipan, kode, tabel, checklist, gambar, rumus | Semua blok tampil benar saat disimpan | [ ] |
| 5.4 | Sisipkan blok kode, pilih bahasa | Penyorotan sintaks aktif | [ ] |
| 5.5 | Sisipkan rumus KaTeX, mis. `E = mc^2` | Rumus ter-render, bukan teks mentah | [ ] |
| 5.6 | Sisipkan sematan dari domain **selain** YouTube/Drive | Ditolak dengan pesan domain belum diizinkan | [ ] |
| 5.7 | Unggah berkas PDF pada materi dokumen | Progres unggah tampil; berkas berstatus siap | [ ] |
| 5.8 | Coba unggah berkas > 50 MB | Ditolak sebelum unggah dimulai | [ ] |
| 5.9 | Coba unggah berkas berekstensi `.exe` atau `.html` | Ditolak | [ ] |

---

## 6. Kuis

### 6a. Menyusun (Dosen)

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 6.1 | Tambah kuis pada sebuah pertemuan | Formulir kuis terbuka | [ ] |
| 6.2 | Isi **Waktu pengerjaan** dengan `0` | Ditolak | [ ] |
| 6.3 | Isi dengan `300` | **Diterima** (batas atas sesuai desain) | [ ] |
| 6.4 | Isi dengan `301` | Ditolak | [ ] |
| 6.5 | Isi **Kesempatan pengerjaan** dengan `0` | Ditolak | [ ] |
| 6.6 | Buat soal untuk 8 tipe (pilihan tunggal, pilihan jamak, benar/salah, isian singkat, menjodohkan, pengurutan, uraian, unggah berkas) | Semua tipe tersimpan | [ ] |
| 6.7 | Mode **ketat**, total poin ≠ 100, lalu terbitkan | Ditolak dengan pesan total poin harus 100 | [ ] |
| 6.8 | Ubah ke mode **normalisasi**, terbitkan | Diterima | [ ] |
| 6.9 | Isi **Dibuka pada** dengan tanggal besok, terbitkan | Kuis tersimpan | [ ] |

### 6b. Mengerjakan (Mahasiswa)

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 6.10 | Buka kuis dari langkah 6.9 | Pesan **"Aktivitas baru dapat diakses pada [tanggal jam]"** — tanggalnya tertulis, bukan sekadar "periksa jadwal" | [ ] |
| 6.11 | Buka kuis yang sudah dibuka, klik **Mulai kuis** | Timer berjalan; navigasi nomor soal tampil | [ ] |
| 6.12 | Jawab beberapa soal, tunggu ±3 detik | Status berubah jadi tersimpan di server | [ ] |
| 6.13 | Muat ulang halaman di tengah pengerjaan | Jawaban tetap ada; timer lanjut, **tidak** ter-reset | [ ] |
| 6.14 | Buka kuis yang sama di tab lain, ubah jawaban di kedua tab | Muncul peringatan konflik; diminta muat ulang | [ ] |
| 6.15 | Kumpulkan | Nilai objektif langsung terhitung; soal uraian menunggu penilaian | [ ] |
| 6.16 | Coba mulai kuis lagi setelah kesempatan habis | Ditolak dengan pesan kesempatan habis | [ ] |
| 6.17 | Biarkan timer habis tanpa mengumpulkan | Server mengumpulkan otomatis; jawaban terakhir tersimpan | [ ] |

### 6c. Menilai (Dosen)

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 6.18 | Buka **Nilai jawaban** | Daftar pengerjaan yang perlu dinilai | [ ] |
| 6.19 | Nilai soal uraian, beri umpan balik, simpan | Status pengerjaan jadi selesai dinilai | [ ] |
| 6.20 | Sebelum publikasi, cek sebagai Mahasiswa | Nilai **belum** terlihat | [ ] |
| 6.21 | Klik **Publikasikan nilai** | Mahasiswa menerima notifikasi dan melihat nilainya | [ ] |

---

## 7. Tugas

| # | Peran | Langkah | Harapan | ✔ |
| --- | --- | --- | --- | --- |
| 7.1 | Dosen | Buat tugas: tenggat besok, batas akhir lusa, izinkan terlambat | Tugas tersimpan | [ ] |
| 7.2 | Mahasiswa | Kumpulkan teks/tautan/berkas | Tercatat versi 1, status dikumpulkan | [ ] |
| 7.3 | Mahasiswa | Kumpulkan ulang sebelum batas akhir | Jadi versi 2; versi 1 bertanda **Versi sebelumnya** | [ ] |
| 7.4 | Dosen | Buat tugas dengan tenggat **kemarin**, batas akhir **besok**; kumpulkan sebagai Mahasiswa | Ditandai **Terlambat** | [ ] |
| 7.5 | Dosen | Buat tugas dengan batas akhir **kemarin**; coba kumpulkan | Ditolak; tombol kirim nonaktif | [ ] |
| 7.6 | Dosen | Beri nilai `-1` | Ditolak | [ ] |
| 7.7 | Dosen | Beri nilai `101` (pada skala 100) | Ditolak | [ ] |
| 7.8 | Dosen | Beri nilai `0` lalu `100` | Keduanya diterima | [ ] |
| 7.9 | Dosen | Ubah nilai yang sudah ada **tanpa** alasan | Ditolak: alasan wajib | [ ] |
| 7.10 | Dosen | Ubah nilai dengan alasan ≥ 5 karakter | Diterima; tercatat di Jejak audit | [ ] |

---

## 8. Rekap nilai

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 8.1 | Buka tab **Rekap nilai → Bobot penilaian** | Lima kategori; total 100% | [ ] |
| 8.2 | Ubah bobot sehingga total `99` | Ditolak: total harus tepat 100% | [ ] |
| 8.3 | Ubah sehingga total `101` | Ditolak | [ ] |
| 8.4 | Kembalikan ke total `100` | Diterima | [ ] |
| 8.5 | Isi beberapa nilai inline, klik **Simpan semua perubahan** | Tersimpan sekali jalan; penghitung perubahan kembali 0 | [ ] |
| 8.6 | Klik **Hitung nilai akhir** saat masih ada jawaban belum dinilai | Tombol publikasi **nonaktif** + callout "Selesaikan penilaian…" | [ ] |
| 8.7 | Saat ada nilai kosong | Muncul kotak centang "Saya sudah meninjau nilai kosong…" | [ ] |
| 8.8 | Publikasikan nilai akhir | Mahasiswa melihat nilai + huruf + IP | [ ] |
| 8.9 | Setelah terbit, ubah salah satu komponen | Wajib alasan; nilai akhir terhitung ulang otomatis | [ ] |
| 8.10 | Klik **Ekspor Excel** | Berkas `.xlsx` terunduh dan terbaca | [ ] |

---

## 9. Impor massal

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 9.1 | **Impor massal → Unduh template** (peserta) | Template `.xlsx` berisi kolom `identifierValue`, `email` | [ ] |
| 9.2 | Unggah berkas kosong / tanpa baris | Ditolak | [ ] |
| 9.3 | Unggah > 500 baris | Ditolak dengan saran memecah berkas | [ ] |
| 9.4 | Unggah berisi 1 NIM sah + 1 NIM tidak dikenal + 1 duplikat | Panel tinjauan menandai baris bermasalah beserta alasannya | [ ] |
| 9.5 | Perbaiki / abaikan / timpa baris bermasalah | Tombol konfirmasi aktif setelah tidak ada anomali | [ ] |
| 9.6 | Konfirmasi impor | Hanya baris disetujui yang masuk; tercatat di Jejak audit | [ ] |
| 9.7 | Ulangi untuk **Bank soal** dan **Rekap nilai** | Alur tinjauan sama | [ ] |

---

## 10. Pengumuman dan notifikasi

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 10.1 | Dosen: buat pengumuman, tandai **Penting**, terbitkan | Tampil di urutan teratas kelas | [ ] |
| 10.2 | Dosen: buat pengumuman terjadwal (waktu ke depan) | Belum terlihat mahasiswa sampai waktunya | [ ] |
| 10.3 | Mahasiswa: buka **Notifikasi** | Lencana jumlah di sidebar cocok dengan yang belum dibaca | [ ] |
| 10.4 | Klik **Tandai dibaca** pada satu notifikasi | Lencana berkurang seketika | [ ] |
| 10.5 | Klik **Tandai semua dibaca** | Daftar jadi terbaca semua; lencana hilang | [ ] |
| 10.6 | Saat tidak ada notifikasi | Tampil "Tidak ada notifikasi." | [ ] |

---

## 11. Progres belajar

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 11.1 | Mahasiswa: buka materi PDF, baca halaman 1→5 | Progres naik sesuai halaman unik terbaca | [ ] |
| 11.2 | Buka ulang halaman yang sama | Progres **tidak** naik dua kali | [ ] |
| 11.3 | Tonton video sampai ±50% | Progres naik mengikuti bagian yang benar-benar ditonton | [ ] |
| 11.4 | Lompat (seek) ke akhir video | Bagian yang dilompati **tidak** dihitung | [ ] |
| 11.5 | Centang checklist materi | Materi bertanda selesai | [ ] |
| 11.6 | Dosen: lihat ringkasan progres kelas | Angka cocok dengan aktivitas mahasiswa | [ ] |

---

## 12. Arsip dan duplikasi kelas

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 12.1 | Dosen: **Pengaturan → status Diarsipkan**, konfirmasi | Callout "Kelas telah diarsipkan…" muncul | [ ] |
| 12.2 | Coba tambah pertemuan pada kelas arsip | Ditolak; tampilan hanya baca | [ ] |
| 12.3 | Mahasiswa: buka kelas arsip | Materi dan nilai masih dapat dibaca | [ ] |
| 12.4 | **Duplikasi ke semester baru** | Kelas draf baru berisi materi dan soal | [ ] |
| 12.5 | Periksa kelas hasil duplikasi | Peserta, jawaban, progres, tenggat, dan nilai **kosong** | [ ] |

---

## 13. Jejak audit

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 13.1 | Buka tab **Jejak audit** | Daftar peristiwa dengan pelaku dan waktu | [ ] |
| 13.2 | Buka salah satu entri koreksi nilai | Terlihat nilai **sebelum** dan **sesudah** | [ ] |
| 13.3 | Cari entri koreksi yang Anda buat di 7.10 | Alasan yang Anda tulis tercatat | [ ] |

---

## 14. Draf lokal dan ketahanan

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 14.1 | Isi formulir (mis. pengumuman) tanpa menyimpan, tunggu 2 detik | Status "Tersimpan lokal · belum dikirim ke server" | [ ] |
| 14.2 | Tutup editor, buka lagi | Muncul "Draft ditemukan · [waktu]" + tombol **Pulihkan** / **Buang** | [ ] |
| 14.3 | Sebelum memilih | Kolom formulir terkunci sampai Anda memutuskan | [ ] |
| 14.4 | Klik **Pulihkan draft** | Isian kembali seperti sebelumnya | [ ] |
| 14.5 | Isi formulir lalu coba pindah halaman | Muncul peringatan perubahan belum terkirim | [ ] |
| 14.6 | Buka **Profil → Hapus draft lokal** | Jumlah draf jadi 0 | [ ] |
| 14.7 | Matikan API (`Ctrl+C` pada terminal `dev`), lalu simpan sesuatu | Pesan gagal terhubung + tombol **Coba lagi**; draf lokal tetap aman | [ ] |

---

## 15. Isolasi akses antar pengguna

| # | Langkah | Harapan | ✔ |
| --- | --- | --- | --- |
| 15.1 | Masuk sebagai **Bima Saputra** (bukan peserta IF2101) | Kelas IF2101 tidak muncul di daftar | [ ] |
| 15.2 | Tempel alamat kelas IF2101 langsung | Ditolak: belum terdaftar pada kelas ini | [ ] |
| 15.3 | Tempel alamat rekap nilai kelas itu | Ditolak | [ ] |
| 15.4 | Sebagai Mahasiswa, tempel alamat tab **Peserta** atau **Jejak audit** | Kembali ke tab Materi, tidak bocor | [ ] |
| 15.5 | Sebagai Mahasiswa A, coba buka tugas milik Mahasiswa B | Ditolak | [ ] |

---

## 16. Ringkasan hasil

| Modul | Jumlah langkah | Lulus | Catatan |
| --- | --- | --- | --- |
| 2. Masuk & sesi | 5 | | |
| 3. Navigasi & tampilan | 9 | | |
| 4. Kelas & pertemuan | 7 | | |
| 5. Materi & editor | 9 | | |
| 6. Kuis | 21 | | |
| 7. Tugas | 10 | | |
| 8. Rekap nilai | 10 | | |
| 9. Impor massal | 7 | | |
| 10. Pengumuman & notifikasi | 6 | | |
| 11. Progres belajar | 6 | | |
| 12. Arsip & duplikasi | 5 | | |
| 13. Jejak audit | 3 | | |
| 14. Draf lokal | 7 | | |
| 15. Isolasi akses | 5 | | |

**Cara melaporkan temuan**: sebutkan nomor langkah, peran yang dipakai, apa yang
terjadi, apa yang diharapkan, dan **Nomor permintaan** dari pesan kesalahan bila
ada. Nomor itu dapat ditelusuri langsung di log server.

---

## Lampiran — pengujian otomatis

Sebagian besar aturan batas di atas juga dijalankan otomatis:

```bash
npm test                  # aturan domain (tanpa database)
npm run test:integration  # HTTP + PostgreSQL, termasuk batas pada bab 8.1
```

Berkas `tests/integration/boundaries.test.ts` menjaga batas timer kuis 1–300
menit dan pesan blocker bertanggal agar tidak kembali rusak diam-diam.
