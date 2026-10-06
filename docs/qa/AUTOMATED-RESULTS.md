# Hasil otomatis QA v5

Run: bfe21569-f47e-4981-9c31-cf402afc62c2
Tanggal: 2026-10-06T03:06:05.116Z
Commit: 46485551585e8996e9de0b6202c3e29a93a87054 (working copy)
Lingkungan: Lokal · PostgreSQL _test · fixture SSO & File Service

329 kasus: 143 lulus, 0 gagal, 0 terblokir, 186 belum diuji otomatis.

## Temuan



## Batas bukti

- RTM §3.1.1 menyebut 151 butir, tetapi 15 rentang kode yang ditampilkan berjumlah 117. Detail per butir pada PDF requirement tidak ada di workspace; keterlacakan memakai keluarga kode dan paragraf v5 yang tersedia.
- RTM menyebut 4 tipe kuis, sedangkan §3.1 dan §3.3.2 menguraikan 8 tipe. Katalog mengikuti uraian lengkap 8 tipe.
- Prioritas dan role tiap kasus diturunkan dari cakupan §3.1. CRS-007/008 disebut eksplisit. Pembagian prioritas per kode lain tidak dirinci oleh dokumen.
- Istilah status/event cause-effect diverifikasi persis terhadap dokumen; ekuivalensi implementasi memerlukan keputusan PO, bukan diasumsikan otomatis.
- Hasil otomatis lokal dengan fixture tidak membuktikan penerimaan SSO/File Service kampus, antivirus nyata, Redis produksi, VPS atau performa pilot.

Lihat portal QA untuk langkah tiap kasus dan evidence terstruktur. Hasil manual dicatat terpisah pada sesi browser pengguna.

## Regresi tambahan di luar pemetaan kasus

Tidak ada assertion regresi tambahan yang gagal pada run ini.
