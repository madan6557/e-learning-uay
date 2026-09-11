# E-Learning UAY Database

PostgreSQL 16 untuk pengembangan dan produksi. Skema Prisma berada di `prisma/schema.prisma`. Migrasi pertama membentuk domain akademik; migrasi kedua menambahkan trigger audit append-only, batas numerik, dan foreign key pendukung. Jangan memakai `db push` pada produksi karena trigger SQL harus ikut diterapkan.

Dari root: `npm run db:generate`, `npm run db:migrate`, lalu `npm run db:seed` untuk contoh lokal. Seed tidak mereset data dan ditolak di produksi. `npm run db:local` menjalankan PostgreSQL embedded di `.local/postgres`, port 55432. Cadangan dan restore produksi dijelaskan di [deployment](../../deployment/README.md).
