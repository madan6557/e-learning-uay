# Temuan pengujian E-Learning v5

Pengujian dilakukan pada PostgreSQL `_test`, identitas fixture dan kontrak File Service lokal. Kasus yang gagal dipertahankan sebagai kegagalan terhadap dokumen, agar dapat dibandingkan dengan pengujian manual. Bukti lengkap dan run ID ada di `AUTOMATED-RESULTS.md` serta `apps/qa/public/reports/latest.json`.

| Temuan | Acuan / assertion | Hasil yang diharapkan | Hasil aktual |
| --- | --- | --- | --- |
| QA-01 · Percobaan kuis tanpa batas | v5 §8.1; `TC-BVA-ATTEMPT-NULL` | `attemptLimit=null` diterima sebagai tanpa batas; HTTP 201. | HTTP 400 `VALIDATION_ERROR`: `Expected number, received null`. |
| QA-02 · Video eksternal tanpa unggahan | v5 §3.2 dan §8.1; `TC-RES-VIDEO-EMBED` | Materi VIDEO_MEDIA dengan provider YouTube, URL HTTPS dan durasi tersimpan tanpa file binary; HTTP 201. | HTTP 400 `VIDEO_REQUIRED`. |
| QA-03 · Urutan materi pada ringkasan dashboard | `tests/integration/learning.test.ts`, `dashboard summaries preserve visibility, progress and grading counts` | Ringkasan dan detail mengembalikan urutan materi yang sama. | Urutan DOCUMENT dan RICH_TEXT bertukar. Assertion pernah lulus dan gagal pada beberapa run; perlu memeriksa penentuan urutan untuk posisi yang sama. |

QA-03 merupakan regresi tambahan, sehingga tidak dimasukkan ke hitungan 135 kasus katalog yang mempunyai pemetaan assertion. Setiap run tetap merekam kegagalan tersebut bila terjadi, termasuk exit code suite yang nonzero. Penyebab urutan yang tidak stabil masih perlu investigasi; belum dianggap selesai.

Untuk memverifikasi manual: pilih **P0 → Dosen**, cari ID QA-01/QA-02 pada katalog menggunakan ID test case-nya, ikuti langkah dan catat respons aktual. Untuk QA-03 gunakan **P0 → Mahasiswa**, bandingkan urutan materi pada dashboard dengan detail kelas uji. Pisahkan hasil dari lingkungan lokal dan layanan kampus ke sesi yang berbeda.
