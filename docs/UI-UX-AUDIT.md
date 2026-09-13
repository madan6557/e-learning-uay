# Audit UI/UX v4.0

Tanggal: 13 September 2026.

| Cakupan            | Hasil perbaikan dan pemeriksaan                                                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Masuk dan keluar   | Pengunjung melihat landing publik tanpa shell akademik. Tombol SSO dan kartu demo local/test melewati authorization code, PKCE, state, nonce, JWKS, callback, lalu sesi yang sama. Logout kembali ke landing.                                               |
| Navigasi           | Sidebar hanya setelah sesi ada. Navigasi desktop/mobile memiliki current state, skip link, drawer yang dapat ditutup Escape, focus trap, dan workspace inert ketika drawer terbuka.                                                                         |
| Form dan editor    | Satu aksi simpan global per layar kerja. Draf lokal menyimpan otomatis, dapat dipulihkan atau dibuang, dan memberi peringatan saat navigasi. Tombol icon memiliki nama aksesibel; toolbar rich text, modal, validasi, upload, dan close behavior diperiksa. |
| Pembelajaran       | Kelas, konten 11 blok, materi, berkas, peserta, pengumuman, bank soal, kuis, tugas, progres dan file state memakai empty/loading/error/success state yang konsisten.                                                                                        |
| Penilaian          | Gradebook memakai input inline dan satu simpan batch atomik. Manual quiz grading dan grading tugas memakai satu formulir tiap submission. Hitung/publikasi nonaktif saat ada perubahan lokal.                                                               |
| Identitas          | Profil berupa kartu read-only berisi avatar fallback, nama, email, ID mahasiswa/staf, role, status dan sumber SSO; pengelolaan identitas diarahkan ke issuer.                                                                                               |
| Tabel dan feedback | Tabel memiliki overflow responsif, filter/pagination, state kosong dan retry. Notice, status simpan, toast, destructive action, disabled state, serta kontras/focus target distandardkan.                                                                   |

Pemeriksaan browser dilakukan pada viewport desktop dan 390 px. Semua aksi server pada verifikasi UI hanya memakai data fixture; nilai dan draf pengujian dibuang sebelum penutupan stack lokal.
