# Bukti browser kesiapan production

Lingkungan lokal demo, database elearning_visual_test. Akun merupakan fixture, bukan data mahasiswa kampus. Pemeriksaan awal dilakukan 8 Oktober; pembaruan layout ponsel diperiksa 9 Oktober 2026 (Asia/Singapore).

[Laporan kesiapan](../PRODUCTION-READINESS.md) memuat batas bukti dan gate staging. [Hasil responsif](phone-viewport-checks.json) mencatat 57 pembacaan DOM pada 19 halaman/mode. [Konsol final](phone-browser-console.json) mencatat error pengembangan yang sudah diperbaiki dan hasil setelah perbaikan. [Ringkasan perintah dan audit](verification-results.json) melengkapi [report QA](../../../apps/qa/public/reports/latest.json).

## Tampilan pada tiga ukuran

1440 × 900 desktop; 768 × 1024 tablet; 390 × 844 ponsel. Editor tidak menyediakan Berdampingan pada dua ukuran terakhir. Screenshot memperlihatkan bagian layar yang sedang dibuka, bukan seluruh isi halaman.

| Halaman / mode | Desktop | Tablet | Ponsel |
| --- | --- | --- | --- |
| Beranda dosen | [1440](dosen-dashboard-1440.jpg) | [768](dosen-dashboard-768.jpg) | [390](dosen-dashboard-390.jpg) |
| Rekap nilai dosen | [1440](dosen-gradebook-1440.jpg) | [768](dosen-gradebook-768.jpg) | [390](dosen-gradebook-390.jpg) |
| Peserta | [1440](dosen-participants-1440.jpg) | [768](dosen-participants-768.jpg) | [390](dosen-participants-390.jpg) |
| Presensi dosen | [1440](dosen-attendance-1440.jpg) | [768](dosen-attendance-768.jpg) | [390](dosen-attendance-390.jpg) |
| Beranda mahasiswa | [1440](mahasiswa-dashboard-1440.jpg) | [768](mahasiswa-dashboard-768.jpg) | [390](mahasiswa-dashboard-390.jpg) |
| Kelas mahasiswa | [1440](mahasiswa-kelas-1440.jpg) | [768](mahasiswa-kelas-768.jpg) | [390](mahasiswa-kelas-390.jpg) |
| Materi mahasiswa | [1440](mahasiswa-materi-1440.jpg) | [768](mahasiswa-materi-768.jpg) | [390](mahasiswa-materi-390.jpg) |
| Tugas berversi | [1440](mahasiswa-tugas-1440.jpg) | [768](mahasiswa-tugas-768.jpg) | [390](mahasiswa-tugas-390.jpg) |
| Hasil kuis | [1440](mahasiswa-kuis-1440.jpg) | [768](mahasiswa-kuis-768.jpg) | [390](mahasiswa-kuis-390.jpg) |
| Beranda Admin Prodi | [1440](admin-prodi-dashboard-1440.jpg) | [768](admin-prodi-dashboard-768.jpg) | [390](admin-prodi-dashboard-390.jpg) |
| Rekap nilai Admin Prodi hanya baca | [1440](admin-prodi-gradebook-1440.jpg) | [768](admin-prodi-gradebook-768.jpg) | [390](admin-prodi-gradebook-390.jpg) |
| Beranda Super Admin | [1440](super-admin-dashboard-1440.jpg) | [768](super-admin-dashboard-768.jpg) | [390](super-admin-dashboard-390.jpg) |
| Pengumuman Super Admin | [1440](super-admin-announcements-1440.jpg) | [768](super-admin-announcements-768.jpg) | [390](super-admin-announcements-390.jpg) |
| Ringkasan Rektor | [1440](rector-summary-1440.jpg) | [768](rector-summary-768.jpg) | [390](rector-summary-390.jpg) |
| Daftar dosen Rektor | [1440](rector-lecturers-1440.jpg) | [768](rector-lecturers-768.jpg) | [390](rector-lecturers-390.jpg) |
| Editor materi — Tulis | [1440](materi-editor-write-1440.jpg) | [768](materi-editor-write-768.jpg) | [390](materi-editor-write-390.jpg) |
| Editor materi — Pratinjau | [1440](materi-editor-preview-1440.jpg) | [768](materi-editor-preview-768.jpg) | [390](materi-editor-preview-390.jpg) |
| Editor pengumuman — Tulis | [1440](announcement-editor-write-1440.jpg) | [768](announcement-editor-write-768.jpg) | [390](announcement-editor-write-390.jpg) |
| Editor pengumuman — Pratinjau | [1440](announcement-editor-preview-1440.jpg) | [768](announcement-editor-preview-768.jpg) | [390](announcement-editor-preview-390.jpg) |

## Bukti aksi dan rincian

| Bukti | Keterangan |
| --- | --- |
| [Kartu nilai ponsel](gradebook-mobile-card.jpg) | Rincian komponen per mahasiswa dengan kontrol sentuh |
| [Draf nilai ponsel](gradebook-mobile-draft.jpg) | Nilai belum dikirim ke server; tetap ada saat layout berubah |
| [Rekap prodi hanya baca](admin-prodi-grade-readonly-phone.jpg) | Tanpa input/simpan nilai; paginasi dapat digunakan |
| [Editor berdampingan desktop](materi-editor-desktop-split.jpg) | Formulir dan pratinjau pada layar desktop |
| [Kartu dosen Rektor](rector-lecturers-mobile-cards.jpg) | Urutan aktivitas terakhir menurun, navigasi detail dan fokus keyboard |
| [Pengumuman berhasil](announcement-publish-feedback.jpg) | Feedback penerbitan bertahan setelah modal tutup (uji fungsional 8 Oktober, layout sebelum redesign) |
| [Presensi berhasil](attendance-checkin-feedback.jpg) | Mahasiswa Joko berstatus Hadir setelah check-in; feedback setelah modal tutup (uji fungsional 8 Oktober) |
| [Ekspor Rektor berhasil](rector-export-feedback.jpg) | Feedback ekspor CSV/PDF (uji fungsional 8 Oktober) |

Pemeriksaan keyboard mencakup fokus modal, Escape/drawer dan kembalinya fokus ke pemicu Menu. Ini belum merupakan sertifikasi aksesibilitas. [Snapshot pemeriksaan awal](initial/README.md) disimpan terpisah; tabel di atas menunjuk bukti terpilih untuk layout terbaru dan aksi fungsional.
