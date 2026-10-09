# Audit jarak dan komponen responsif — 9 Oktober 2026

Audit lanjutan atas contoh ikon yang merapat ke judul pada landing ponsel. Pemeriksaan menggunakan browser lokal, akun demo lima peran, dan database terpisah `elearning_visual_test`. Tinggi viewport 900 px; lebar 320, 390, 600, 768, 1024, dan 1440 px.

## Perbaikan

| Temuan | Perbaikan |
| --- | --- |
| Kolom ikon landing 32 px menampung ikon 44 px, sehingga gap efektif menjadi nol | Kolom 44 px dengan jarak horizontal 16 px; judul dan deskripsi sejajar di kolom teks |
| Header, formulir, dan isi modal memakai gutter 16/20/24/28 px yang bertabrakan | Satu `--modal-gutter`: desktop 24 px, layar kecil 20 px, ponsel 16 px; hilangkan padding inline pada kebijakan akademik |
| Field dalam grid ponsel mendapat gap sekaligus margin bawah | Field langsung dalam grid memakai gap 20 px tanpa margin ganda; field biasa tetap berjarak 20 px |
| Pagination bantuan meluber pada 320 px | CSS bersama; kontrol arah dua kolom dan nomor halaman membungkus pada ponsel; label aksesibel dan `aria-current` |
| Filter mode koreksi kuis meluber pada 320/390 px | Label dan select disusun vertikal pada ponsel; select mengikuti lebar wadah |
| Tabel aktivitas pada tinjauan nilai meluber pada 320 px | Kartu berlabel Nilai riil, Skala 100, Status; tabel tetap digunakan pada layar besar |
| Kode presensi proyektor meluber pada 320 px | Ukuran huruf mengikuti viewport, padding ponsel 16 px, tombol dapat membungkus |
| Feedback dan dialog memakai `100vw` termasuk scrollbar | Lebar mengikuti ruang yang tersedia; feedback ponsel berjarak 12 px dari kedua sisi |
| Gambar panduan dalam modal berlebar 100% ditambah margin | Lebar gambar dikurangi gutter; tepi gambar selaras dengan header |
| Bantuan mendapat padding halaman ganda; tabel buku panduan panjang meluber | Hilangkan padding luar ganda, gunakan kartu berlabel, kolom grid `minmax(0, 1fr)`, dan pembungkusan row header |
| Ikon Buka kelas pada rincian Rektor hanya berjarak 3 px | Gunakan token jarak 8 px |

Perubahan ini menyasar presentasi UI dan aksesibilitas kontrol pagination. Grace production, wewenang API, mode demo, dan alur tombol SSO tetap mengikuti implementasi sebelumnya.

## Cakupan browser

| Area | Halaman dan keadaan yang diperiksa |
| --- | --- |
| Publik | Landing dan tiga kartu fitur |
| Super Admin | Seluruh menu utama dan delapan tab kelas; tambah kelas/mata kuliah, impor katalog dan pratinjau, kebijakan tahun ajaran/skala, editor/pratinjau pengumuman |
| Admin Prodi | Seluruh menu utama dan delapan tab kelas, termasuk tampilan nilai baca saja |
| Dosen | Seluruh menu utama dan delapan tab kelas; formulir Section, pengaturan/duplikasi kelas, materi/kuis/tugas, edit/pratinjau materi, penilaian kuis/tugas, tinjauan nilai, impor nilai, pendaftaran peserta, bank soal dan impornya, pengumuman kelas |
| Presensi | Daftar/rekap, buat sesi, jadwal, kode proyektor, lembar koreksi |
| Mahasiswa | Seluruh menu utama, empat tab kelas yang tersedia, hasil kuis, tugas berversi, materi teks, dua PDF dan video dalam modal |
| Rektor | Ringkasan, filter terbuka, daftar dosen, profil dosen, rincian sesi/aktivitas, riwayat, panduan membaca; menu pengumuman/profil/bantuan |
| Bantuan | Daftar, artikel, pagination dan gambar diperbesar; buku panduan yang merender seluruh artikel sesuai peran |
| Komponen terisolasi | Delapan tipe editor soal dan sebelas tipe blok materi, masing-masing pada halaman dan modal; formulir/unggah/notice gagal; header panjang; dialog konfirmasi; feedback |
| Navigasi/keyboard | Drawer dan menu ponsel, gap ikon navigasi, Escape konfirmasi dan kembalinya fokus ke pemicu |

[checks.json](checks.json) menyimpan 1.120 pembacaan historis termasuk temuan sebelum perbaikan dan pemeriksaan ulang. `finalPageChecks` berisi **504 pengukuran akhir pada 84 keadaan**, tanpa temuan overflow halaman, tombol terpotong, atau ikon flex terlalu rapat. Komponen terisolasi mempunyai **246 pengukuran** pada enam lebar; semuanya tanpa temuan. Pemeriksaan awal beberapa tab dilakukan saat loading; tab tersebut kemudian diperiksa ulang setelah indikator loading hilang. Riwayat lama sengaja dipertahankan dan tidak dianggap sebagai hasil akhir.

Pengukuran memakai bounding box DOM dan computed styles. Lebar DOM bisa 15 px lebih kecil dari viewport karena scrollbar. Area yang memang dapat digeser—toolbar editor, tab kelas, PDF dan tabel desktop—dikecualikan dari temuan overflow halaman. Screenshot terpilih juga diperiksa secara visual. Angka pengukuran bukan jumlah fitur atau bukti seluruh keadaan runtime telah diuji.

[Pagination behavior](pagination-behavior.json) membuktikan halaman aktif berubah, Sebelumnya aktif di halaman kedua, perubahan ukuran mereset ke halaman pertama, dan Selanjutnya nonaktif pada halaman terakhir. Tidak ada data pembelajaran yang disimpan atau dihapus dalam audit ini. Fixture komponen hanya berada dalam direktori lokal yang diabaikan Git.

## Screenshot terpilih

| Bukti | Yang terlihat |
| --- | --- |
| [Landing 390](landing-390.jpg) | Gap ikon 16 px dan kolom teks selaras |
| [Katalog 390](catalog-390.jpg) | Margin halaman, kartu dan tombol aksi |
| [Formulir/unggah 390](form-upload-390.jpg) | Header panjang, gutter bersama, jarak field dan tombol |
| [Konfirmasi 390](confirmation-390.jpg) | Isi, separator dan tombol dengan tepi selaras |
| [Tinjauan nilai 390](grade-review-390.jpg) | Aktivitas menjadi kartu berlabel |
| [Proyektor 390](attendance-projector-390.jpg) | Kode muat dan tombol dapat dibaca |
| [Pratinjau materi 390](material-preview-390.jpg) | Konten editor pada ponsel |
| [Pembaca video 390](video-reader-390.jpg) | Judul/modal, player dan progres |
| [Bantuan 390](help-pagination-390.jpg) | Pagination dan konten bantuan; screenshot halaman penuh |

## Validasi dan batas

Build API/web dan typecheck berhasil. QA menjalankan 158 tes domain dan 132 tes integrasi: 290 tes berhasil. Audit dependensi melaporkan nol kerentanan. Hasil QA lengkap dicatat pada [report QA](../../../../apps/qa/public/reports/latest.json) dan [ringkasan perintah](verification.json). Pemetaan katalog mencatat 163 kasus lulus dan 191 belum diuji otomatis; jumlah kasus tersebut berbeda dari jumlah assertion tes.

Bobot nilai fixture terkunci setelah publikasi, sehingga formulir bobot tidak dibuka dengan memaksa izin; tampilan terkunci dan komponen formulir bersama diperiksa. Delapan tipe soal diperiksa melalui editor komponen, bukan pengerjaan mahasiswa satu per satu. Audit ini tidak menggantikan uji perangkat fisik/iOS, sertifikasi aksesibilitas, atau penerimaan SSO/File Service/pilot staging yang masih tercatat pada [laporan kesiapan](../../PRODUCTION-READINESS.md).
