import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../apps/web/src/Gradebook.js";

test("course catalog CSV parser correctly parses comma-separated course list with headers", () => {
  const csv = `kode,nama,sks,prodi,deskripsi,status
IF101,"Algoritma dan Pemrograman I",3,IF,"Dasar logika, percabangan, perulangan",PUBLISHED
IF102,Struktur Data,3,IF,Penyimpanan data majemuk,PUBLISHED
SI201,Sistem Informasi Manajemen,4,SI,Manajemen SI korporat,PUBLISHED`;

  const rows = parseCsv(csv);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], ["kode", "nama", "sks", "prodi", "deskripsi", "status"]);
  assert.equal(rows[1][0], "IF101");
  assert.equal(rows[1][1], "Algoritma dan Pemrograman I");
  assert.equal(rows[1][4], "Dasar logika, percabangan, perulangan");
  assert.equal(rows[2][0], "IF102");
  assert.equal(rows[3][0], "SI201");
  assert.equal(rows[3][2], "4");
});

test("course catalog parser gracefully handles English headers and whitespace", () => {
  const csv = `code,title,credits,departmentCode,description,status
  IF301 , Jaringan Komputer , 3 , IF , Protokol TCP/IP , PUBLISHED  `;

  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0].trim(), "IF301");
  assert.equal(rows[1][1].trim(), "Jaringan Komputer");
  assert.equal(rows[1][2].trim(), "3");
  assert.equal(rows[1][3].trim(), "IF");
});
