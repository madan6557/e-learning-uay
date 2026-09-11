# E-Learning UAY API

Express 5 + TypeScript. Jalankan perintah npm dari root workspace. `src/index.ts` merakit route dan worker; `core.ts` mengatur transaksi serializable, otorisasi kelas, idempotensi dan audit. Auth menggunakan OIDC/PKCE dan cookie sesi opaque. Modul learning, assessment, grades, imports, dan files memiliki validasi server dan pemeriksaan akses pada setiap operasi.

API berada di `/api/v1`; mutation memakai `Origin` yang sesuai dan `Idempotency-Key` 16–100 karakter. Kesehatan layanan berada di `/api/health`. Error berbentuk `{error:{code,details?,requestId?}}`. Lihat [kontrak integrasi](../../docs/contracts/IMPLEMENTED-ADAPTERS.md), [tes integrasi](../../tests/integration), dan [panduan root](../../README.md).
