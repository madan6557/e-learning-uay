# Audit UI/UX v4.0

Tanggal: 13 September 2026.

| Cakupan            | Hasil perbaikan dan pemeriksaan                                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Masuk dan keluar   | Pengunjung melihat landing publik tanpa shell akademik. Tombol SSO dan kartu demo local/test, serta hosted demo Railway yang diaktifkan eksplisit, melewati authorization code, PKCE, state, nonce, JWKS, callback, lalu sesi yang sama. Logout kembali ke landing.                                               |
| Navigasi           | Sidebar hanya setelah sesi ada. Navigasi desktop/mobile memiliki current state, skip link, drawer yang dapat ditutup Escape, focus trap, dan workspace inert ketika drawer terbuka.                                                                         |
| Form dan editor    | Satu aksi simpan global per layar kerja. Draf lokal menyimpan otomatis, dapat dipulihkan atau dibuang, dan memberi peringatan saat navigasi. Tombol icon memiliki nama aksesibel; toolbar rich text, modal, validasi, upload, dan close behavior diperiksa. |
| Pembelajaran       | Kelas, konten 11 blok, materi, berkas, peserta, pengumuman, bank soal, kuis, tugas, progres dan file state memakai empty/loading/error/success state yang konsisten.                                                                                        |
| Penilaian          | Gradebook memakai input inline dan satu simpan batch atomik. Manual quiz grading dan grading tugas memakai satu formulir tiap submission. Hitung/publikasi nonaktif saat ada perubahan lokal.                                                               |
| Identitas          | Profil berupa kartu read-only berisi avatar fallback, nama, email, ID mahasiswa/staf, role, status dan sumber SSO; pengelolaan identitas diarahkan ke issuer.                                                                                               |
| Tabel dan feedback | Tabel memiliki overflow responsif, filter/pagination, state kosong dan retry. Notice, status simpan, toast, destructive action, disabled state, serta kontras/focus target distandardkan.                                                                   |

## Penyelarasan dengan konsol SSO (18 September 2026)

| Elemen              | Sebelum                                                  | Sesudah                                                                                       |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Palet               | Hijau `#183d32` dengan 289 warna keras tersebar           | Biru institusional `oklch(0.44 0.106 250)`, token bersama, permukaan nyaris netral              |
| Tipografi           | DM Sans + Manrope, tracking judul −0.04em                 | Inter Tight + IBM Plex Mono, tracking judul −0.015em, bobot 600                                 |
| Lockup merek        | Ikon toga dalam kotak 13 px                               | Kotak `UAY` 32 px + nama produk, sama dengan konsol SSO                                         |
| Header              | 64–84 px, latar blur                                      | 56 px, permukaan solid dengan garis batas                                                       |
| Rail navigasi       | 242 px, item 0.9rem/ikon 19 px, penanda garis kiri        | 256 px, item 0.8125 rem/ikon 16 px, latar `sidebar-accent`, dapat diperkecil ke 64 px           |
| Pil status          | Kotak radius 5 px tanpa garis                             | Pil penuh bertitik, nada success/warning/danger/neutral seperti `StatusBadge` SSO               |
| Tabel               | Kerapatan bervariasi                                      | `padding 0.625rem/0.875rem`, ukuran 0.8125 rem, mengikuti utilitas `data-cell`                  |
| Cincin fokus        | Outline bawaan peramban                                   | `2px` warna `--ring` dengan offset 2 px pada seluruh kontrol                                    |
| Warna kategorikal   | Ramp hijau buatan sendiri                                 | `--chart-1..5` milik sistem desain UAY                                                          |

Mode gelap sengaja tidak diaktifkan: konsol SSO mendefinisikan token `.dark`
tetapi tidak menyediakan pengalih tema, sehingga mengaktifkannya di sini justru
membuat kedua aplikasi berbeda.

Pemeriksaan browser dilakukan pada viewport desktop dan 390 px. Semua aksi server pada verifikasi UI hanya memakai data fixture; nilai dan draf pengujian dibuang sebelum penutupan stack lokal.
