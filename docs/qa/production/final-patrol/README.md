# Patrol akhir UI/UX — 9 Oktober 2026

Pemeriksaan lokal menggunakan `npm run dev:test`, database terpisah `elearning_visual_test`, SSO fixture, dan lima peran demo. Patrol ini melengkapi [audit jarak sebelumnya](../spacing-audit/README.md), dengan perhatian pada editor rich text dan perubahan UI terbaru.

## Temuan yang diperbaiki

| Temuan | Hasil akhir dan bukti |
| --- | --- |
| Escape pada prompt AI ikut menutup modal editor induk; overlay AI tidak memakai dialog native | Prompt memakai `Modal` bersama, judul aksesibel, fokus native, dan pengembalian fokus ke pemicu. Escape menyisakan editor induk dan isian. [Regresi modal](../../../../tests/ai-prompt-modal.test.ts) |
| Prompt memakai tombol/gaya inline yang berbeda dan navigasi template mendatar di ponsel | Gutter dan tombol mengikuti token UAY; pilihan template berupa select dan aksi dua kolom. [Desktop](prompt-ai-1440.jpg), [tablet](prompt-ai-768.jpg), [ponsel](prompt-ai-390.jpg), [320 px](prompt-ai-320.jpg) |
| Gagal menyalin clipboard tidak memberi langkah pemulihan; contoh mengganti isian tanpa konfirmasi | Kegagalan menampilkan pesan dan memilih teks untuk salinan manual; unduhan tetap tersedia. Penggantian isian meminta konfirmasi. Regresi clipboard, batal, dan penggantian lulus |
| Toast aplikasi berada di bawah backdrop dialog native | Feedback mengikuti dialog yang terbuka, dapat ditutup, tetap tersedia setelah modal ditutup, dan tidak menutupi aksi formulir. [Kegagalan pada fixture UI](modal-error-feedback-390.jpg), [regresi feedback](../../../../tests/feedback.test.ts) |
| Label editor gabungan serta select dengan petunjuk saudara tidak terhubung ke kontrol | `Field` memberikan ID/label melalui konteks dan menghubungkan kontrol dalam fragment; editor dan mode pratinjau mempunyai nama aksesibel. [Regresi label](../../../../tests/field-accessibility.test.ts) |
| Formulir baru dan isian yang dikembalikan ke nilai awal mengaku sudah tersimpan | Awal: **Belum ada perubahan**. Keberhasilan server: **Tersimpan di server**. Status draf lokal tetap berbeda. [Regresi formulir](../../../../tests/form.test.ts) |
| Rekap Admin Prodi menyuruh pengguna menyelesaikan penilaian | Pesan menerangkan pekerjaan yang menunggu dosen; rekap tetap hanya baca. [Ponsel Admin Prodi](admin-prodi-gradebook-390.jpg) |
| Filter kelas Rektor memakai UUID sebagai pembeda | Pilihan menampilkan nama kelas, prodi, dan semester |
| Integrasi menemukan login pengembangan menerima permintaan pada mode OIDC demo | Login pengembangan hanya tersedia bila `AUTH_MODE=development`; mode OIDC tetap melalui callback SSO. [Regresi integrasi yang sudah tersedia](../../../../tests/integration/demo-oidc.test.ts) lulus. Konfigurasi grace tidak diubah |

## Cakupan dan hasil

[Hasil DOM](responsive-checks.json) mencatat **214 pengukuran pada 74 halaman/mode per peran**. Menu dan halaman inti diuji pada 1440, 768, dan 390 px; landing, editor tugas/kuis, modal penilaian, prompt AI, dan editor pengumuman juga diperiksa pada 320 px. Tidak ditemukan overflow halaman atau kontrol melewati viewport pada pengukuran ini. Ukuran di JSON adalah viewport browser; scrollbar dapat mengurangi area screenshot.

- Dosen: delapan menu utama, bagian kelas, pembaca materi, kuis, tugas, serta editor dan penilaian.
- Mahasiswa: menu utama, kelas, materi, hasil kuis, dan tugas dengan nilai/riwayat sendiri.
- Admin Prodi: menu administrasi serta rekap nilai hanya baca; tidak ada input nilai pada rekap.
- Super Admin: menu administrasi, katalog, kebijakan melalui cakupan audit sebelumnya, dan formulir pengumuman Tulis/Pratinjau. Berdampingan tetap tidak ditawarkan pada tablet/ponsel.
- Rektor: menu utama, daftar/detail dosen, riwayat, dan filter laporan. [Rincian ponsel](rektor-detail-390.jpg).
- Delapan jenis soal: pilihan tunggal/jamak, benar-salah, isian singkat, menjodohkan, mengurutkan, uraian, dan unggah berkas diperiksa pada editor 320 px.
- Pembatalan penggantian format mempertahankan teks; pencarian bantuan tanpa hasil menyediakan Reset; Escape drawer mengembalikan fokus ke Menu. Draf kuis sementara terdeteksi saat editor dibuka ulang dan dibuang melalui UI setelah uji.
- Kegagalan aksi/formulir memakai fixture UI lokal tanpa menulis API; input dipertahankan. Pencegahan permintaan ganda, respons tertunda, dan keberhasilan setelah konfirmasi server juga diperiksa melalui tes regresi.

[Konsol browser](browser-console.json) tidak merekam warning/error pada patrol akhir. Screenshot menyajikan bagian viewport yang dibuka, bukan seluruh halaman.

| Validasi akhir | Hasil |
| --- | --- |
| Typecheck API/web dan build penuh | Lulus |
| `npm test` | 104 tes lulus |
| `npm run qa:run` | 165 domain/UI + 132 integrasi lulus, exit 0; PostgreSQL `elearning_test` |
| Katalog QA | 163 kasus terpetakan lulus; 191 memerlukan bukti manual, bukan kegagalan suite |
| `npm audit --json` | 0 kerentanan |
| `git diff --check` | Lulus |

Run QA: `6fe17ae4-10c2-447b-8a3c-b502052ba82d`. [Report terstruktur](../../../../apps/qa/public/reports/latest.json) dan [hasil otomatis](../../AUTOMATED-RESULTS.md) mencatat hasil serta keterbatasannya. Jumlah unit dan domain/UI saling mencakup; jangan dijumlahkan sebagai dua suite independen.

Patrol lokal ini tidak menggantikan penerimaan kampus untuk SSO/File Service nyata, Redis multi-instance, backup/restore, atau pilot 50 mahasiswa. Gate tersebut tetap tercatat dalam [laporan kesiapan](../../PRODUCTION-READINESS.md).
