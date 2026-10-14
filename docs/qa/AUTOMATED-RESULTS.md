# Hasil otomatis QA v5

Run: 0d5aa238-8000-4de6-9907-7fa627d1ccb7
Tanggal: 2026-10-13T01:21:41.787Z
Commit: 65cdcf07e5277ec9ad9e6dbbe3f02f35fac83862 (working copy)
Lingkungan: Lokal · PostgreSQL _test · fixture SSO & File Service

373 kasus: 163 lulus, 0 gagal, 0 terblokir, 210 belum diuji otomatis.

## Temuan



## Batas bukti

- Tambahan implementasi dan panduan diverifikasi kembali pada 12 Oktober 2026; bukan penambahan butir RTM resmi. Katalog memisahkan fitur aktif, integrasi nonaktif, backlog, dan gerbang lingkungan eksternal.
- RTM §3.1.1 menyebut 151 butir, tetapi 15 rentang kode yang ditampilkan berjumlah 117. Detail per butir pada PDF requirement tidak ada di workspace; keterlacakan memakai keluarga kode dan paragraf v5 yang tersedia.
- RTM menyebut 4 tipe kuis, sedangkan §3.1 dan §3.3.2 menguraikan 8 tipe. Katalog mengikuti uraian lengkap 8 tipe.
- Prioritas dan role tiap kasus diturunkan dari cakupan §3.1. CRS-007/008 disebut eksplisit. Pembagian prioritas per kode lain tidak dirinci oleh dokumen.
- Istilah status/event cause-effect diverifikasi persis terhadap dokumen; ekuivalensi implementasi memerlukan keputusan PO, bukan diasumsikan otomatis.
- Hasil otomatis lokal dengan fixture tidak membuktikan penerimaan SSO/File Service kampus, antivirus nyata, Redis produksi, VPS atau performa pilot.

Lihat portal QA untuk langkah tiap kasus dan evidence terstruktur. Hasil manual dicatat terpisah pada sesi browser pengguna.

## Regresi tambahan di luar pemetaan kasus

Tidak ada assertion regresi tambahan yang gagal pada run ini.
