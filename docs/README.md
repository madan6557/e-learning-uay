# Katalog Dokumentasi Teknis E-Learning UAY

Direktori ini memuat seluruh dokumen acuan, desain teknis, panduan penggunaan, matriks hak akses, dan materi sosialisasi resmi platform **E-Learning Universitas Achmad Yani (UAY)**.

Mulai dari [laporan kesiapan production](qa/PRODUCTION-READINESS.md) untuk perubahan dan bukti verifikasi terbaru. Acuan katalog QA berada pada [desain teknis v5](requirements/Technical%20Design%20-%20E-Learning%20UAY%20-%20v5.0.md); berkas versi PO disimpan bersama untuk penelusuran.

| Direktori | Isi |
| --- | --- |
| `guides/` | Buku pengguna, versi Word/PDF/HTML, dan petunjuk pemeliharaan panduan |
| `architecture/`, `diagrams/` | Status implementasi, matriks peran, dan diagram teknis |
| `integrations/`, `contracts/`, `fileservice/` | Dokumen SSO/Rektor dan kontrak layanan kampus |
| `requirements/` | Spesifikasi v5, catatan PO, ekstraksi referensi, serta `archive/` untuk versi terdahulu |
| `presentations/` | Materi sosialisasi pengguna dan slide HTML |
| `qa/` | Katalog, hasil tes, panduan pengujian, dan screenshot kesiapan |
| `images/` | Aset gambar bersama untuk panduan |

59 berkas dipindahkan berdasarkan fungsi tanpa membuang versi historis. Tautan dokumen serta lokasi masukan/keluaran skrip panduan dan katalog QA telah diselaraskan. Dokumen dalam `requirements/archive/` merupakan referensi historis.

---

## 1. Panduan Pengembang & Arsitektur Sistem
- **[HANDOVER.md](../HANDOVER.md)**: Panduan serah terima utama bagi pengembang baru (arsitektur, topologi monorepo, aliran data, mesin nilai, troubleshooting).
- **[Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf](architecture/Hirarki-Role-dan-Akses-Fitur-E-Learning-UAY.pdf)**: Dokumen resmi PDF matriks 5 peran akademik, wewenang fitur, dan batasan ketat penilaian dosen.
- **[IMPLEMENTATION.md](architecture/IMPLEMENTATION.md)**: Catatan status implementasi fitur teknis, bukti verifikasi pengujian, dan kepatuhan spesifikasi.
- **[RECTOR-INTEGRATION.md](integrations/rector/RECTOR-INTEGRATION.md)**: Arsitektur telemetri eksekutif Rektor, waterfall aktivitas dosen, dan parameter agregasi.

---

## 2. Buku Panduan Pengguna (User Manuals)
- **[BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md](guides/BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md)**: Buku panduan lengkap berbahasa Indonesia yang mencakup alur penggunaan untuk Super Admin, Rektor, Admin Prodi, Dosen, dan Mahasiswa.
- **Buku Panduan Format Dokumen Resmi**:
  - [Buku Panduan Penggunaan E-Learning UAY.pdf](guides/Buku%20Panduan%20Penggunaan%20E-Learning%20UAY.pdf)
  - [Buku Panduan Penggunaan E-Learning UAY.docx](guides/Buku%20Panduan%20Penggunaan%20E-Learning%20UAY.docx)
- **[panduan.html](guides/panduan.html)**: Tampilan buku panduan interaktif berbasis HTML mandiri.

---

## 3. Materi Presentasi & Sosialisasi
- **[SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html](presentations/SLIDE-PRESENTASI-SOSIALISASI-ELEARNING-UAY.html)**: Slide presentasi sosialisasi interaktif berbasis HTML.
- **[Sosialisasi dan Panduan Penggunaan E-Learning UAY.pptx](presentations/Sosialisasi%20dan%20Panduan%20Penggunaan%20E-Learning%20UAY.pptx)**: Berkas slide sosialisasi Microsoft PowerPoint.
- **[Presentation - Technical Design E-Learning UAY - v4.0.pdf](requirements/archive/presentations/Presentation%20-%20Technical%20Design%20E-Learning%20UAY%20-%20v4.0.pdf)**: Arsip presentasi desain teknis v4.0.

---

## 4. Integrasi Layanan Kampus (SSO & File Service)
- **[Review Kebutuhan Integrasi SSO UAY - E-Learning.pdf](integrations/sso/Review%20Kebutuhan%20Integrasi%20SSO%20UAY%20-%20E-Learning.pdf)**: Analisis kebutuhan integrasi Keycloak OpenID Connect.
- **[Pengajuan Teknis Integrasi SSO UAY - E-Learning (Ringkas).pdf](integrations/sso/Pengajuan%20Teknis%20Integrasi%20SSO%20UAY%20-%20E-Learning%20(Ringkas).pdf)**: Surat pengajuan teknis integrasi SSO ke pengelola infrastruktur kampus.
- **[Dokumen Teknis SSO UAY.docx](integrations/sso/Dokumen%20Teknis%20SSO%20UAY.docx)**: Dokumen teknis spesifikasi protokol SSO.

---

## 5. Pengujian & Penjaminan Kualitas (QA)
- **[PANDUAN-PENGUJIAN.md](qa/PANDUAN-PENGUJIAN.md)**: Matriks skenario uji fungsional manual modul demi modul.
- **[qa/README.md](qa/README.md)**: Panduan pengoperasian Portal QA Otomatis v5 (354 skenario P0/P1/P2).
