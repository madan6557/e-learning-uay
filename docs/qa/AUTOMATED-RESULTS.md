# Hasil otomatis QA v5

Run: 0c471db0-148d-4a8d-b589-95188f6b0bd5
Tanggal: 2026-09-29T03:46:39.708Z
Commit: ba3fdd1c4f84f131dfc43142f7d7b94d8db5c2ac (working copy)
Lingkungan: Lokal · PostgreSQL _test · fixture SSO & File Service

317 kasus: 133 lulus, 2 gagal, 0 terblokir, 182 belum diuji otomatis.

## Temuan

- **TC-BVA-ATTEMPT-NULL — Batas attempt tidak terbatas (null)**: POST /sections/c8315f00-d3f2-4bee-8f3e-6d697a41bb28/quizzes: actual 400, expected 201; {"error":{"code":"VALIDATION_ERROR","details":[{"path":"attemptLimit","message":"Expected number, received null"}],"requestId":"f12fc80fa32bde92d03692404f910bc7"}}

400 !== 201

- **TC-RES-VIDEO-EMBED — Embed video eksternal sesuai v5**: POST /sections/c8315f00-d3f2-4bee-8f3e-6d697a41bb28/resources: actual 400, expected 201; {"error":{"code":"VIDEO_REQUIRED","requestId":"1263b5bf99ab89c2f0ed3cd10dc49233"}}

400 !== 201


## Batas bukti

- RTM §3.1.1 menyebut 151 butir, tetapi 15 rentang kode yang ditampilkan berjumlah 117. Detail per butir pada PDF requirement tidak ada di workspace; keterlacakan memakai keluarga kode dan paragraf v5 yang tersedia.
- RTM menyebut 4 tipe kuis, sedangkan §3.1 dan §3.3.2 menguraikan 8 tipe. Katalog mengikuti uraian lengkap 8 tipe.
- Prioritas dan role tiap kasus diturunkan dari cakupan §3.1. CRS-007/008 disebut eksplisit. Pembagian prioritas per kode lain tidak dirinci oleh dokumen.
- Istilah status/event cause-effect diverifikasi persis terhadap dokumen; ekuivalensi implementasi memerlukan keputusan PO, bukan diasumsikan otomatis.
- Hasil otomatis lokal dengan fixture tidak membuktikan penerimaan SSO/File Service kampus, antivirus nyata, Redis produksi, VPS atau performa pilot.

Lihat portal QA untuk langkah tiap kasus dan evidence terstruktur. Hasil manual dicatat terpisah pada sesi browser pengguna.

## Regresi tambahan di luar pemetaan kasus

Tidak ada assertion regresi tambahan yang gagal pada run ini.
