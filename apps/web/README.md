# E-Learning UAY Web

React 19 + TypeScript + Vite, route berbasis hash, UI Indonesia yang responsif. Halaman kelas dan asesmen dimuat sesuai kebutuhan; PDF.js dan ExcelJS hanya dimuat saat digunakan. `Content.tsx` menangani editor/viewer, `Assessment.tsx` kuis/tugas, `Gradebook.tsx` rekap/impor, dan `drafts.ts` penyimpanan IndexedDB. Style berada di `styles.css` dan `workspace.css`; teks bersama di `packages/shared/src/id.json`.

Jalankan dari root dengan `npm run dev`. Build tersedia di `apps/web/dist` setelah `npm run build`. API diproksikan oleh Vite saat pengembangan dan Nginx di produksi. Panduan penggunaan berada di [README root](../../README.md).
