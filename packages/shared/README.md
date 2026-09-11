# E-Learning UAY Shared Contracts

`src/domain.ts` berisi Zod schema untuk 11 blok, 8 tipe soal, penilaian objektif, pembagian poin, konversi nilai UAY dan akumulasi video tanpa kredit untuk seek/replay. `src/id.json` memusatkan label dan pesan kesalahan antarmuka Indonesia. Aturan yang mempengaruhi integritas akademik diuji di `tests/domain.test.ts`; server selalu memvalidasi ulang input klien.
