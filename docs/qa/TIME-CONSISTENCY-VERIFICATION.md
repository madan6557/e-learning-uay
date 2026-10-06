# Verifikasi konsistensi waktu

Tanggal: 6 Oktober 2026. Lingkungan: lokal; integrasi memakai PostgreSQL `elearning_test`.

## Perubahan

- Input dan tampilan mengikuti zona perangkat. Helper kalender lokal menggantikan pengambilan tanggal melalui `toISOString().slice(0, 10)`.
- Timestamp dikirim sebagai UTC dengan akhiran `Z`. Input tanggal saja ditafsirkan sebagai tengah malam lokal sebelum dikonversi ke UTC.
- Jadwal mulai dan selesai masing-masing memiliki tanggal-jam. Sesi dapat melewati tengah malam, akhir bulan, dan pergantian tahun.
- Form edit yang tidak mengubah jadwal mempertahankan timestamp aslinya, termasuk detik/milidetik dan ketika perangkat memakai zona berbeda.
- API presensi menolak timestamp tanpa zona, tanggal tidak valid, dan akhir sebelum awal. Field yang tidak dikirim pada PATCH dipertahankan; `null` menghapus jadwal secara eksplisit.
- Kesalahan menyimpan/memperpanjang jadwal ditampilkan pada form tanpa mengonfirmasi keberhasilan.
- Migrasi `202610060008_utc_timestamp_defaults` membuat 25 default SQL menghasilkan UTC, meskipun PostgreSQL memakai zona lain. Migrasi diterapkan pada database lokal aplikasi dan `_test`; data lama tidak digeser.

Contoh: tanggal lokal **6 Oktober 2026 pukul 00.00 GMT+8** dikirim sebagai `2026-10-05T16:00:00.000Z`. Form pada perangkat GMT+8 menampilkan tanggal **6 Oktober**, dan simpan ulang tanpa perubahan tetap mempertahankan timestamp tersebut.

## Hasil pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run build` | Lulus: Prisma, TypeScript API/web dan bundel Vite |
| `npm test` | 49 lulus, 0 gagal |
| `npm run test:integration` | 45 lulus, 0 gagal; database `_test` |
| Form React/JSDOM UTC+7 dan UTC+8 | Tanggal pada dini hari, sesi lintas tengah malam/pergantian tahun, payload simpan ulang, presisi timestamp dan pesan kegagalan lulus |
| Default SQL sesi UTC, UTC+7 dan UTC+8 | Waktu default sama dengan instant UTC database; seluruh 25 default sesuai |

PostgreSQL lokal tetap memakai `Asia/Kuala_Lumpur` (UTC+8). Pemeriksaan setelah migrasi mengonfirmasi 25 default eksplisit UTC; perubahan tidak membutuhkan penggantian zona server global.

Runner integrasi pertama menemukan empat fixture percobaan kuis kosong dari pengujian sebelumnya. Fixture tersebut dibersihkan hanya pada `_test`. Fixture baru memakai snapshot soal valid dan percobaan aktif dibersihkan setelah tes agar worker kedaluwarsa tidak mengambilnya pada hari berikutnya. Integrasi lengkap kemudian lulus.

Tes UI menggunakan komponen produksi melalui React/JSDOM. Pada penerapan ini tidak ada pemeriksaan browser manual baru atau deployment. Timestamp lama yang sumber zonanya tidak tercatat tetap dipertahankan; koreksi historis memerlukan bukti asal tiap data.
