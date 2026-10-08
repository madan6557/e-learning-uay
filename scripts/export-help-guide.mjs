import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { GRADE_SCALE_PRESETS } from "../packages/shared/src/domain.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const guide = JSON.parse(
  readFileSync(resolve(root, "apps/web/src/data/helpGuide.json"), "utf8"),
);
const labels = {
  SUPER_ADMIN: "Super Admin",
  DEPARTMENT_ADMIN: "Admin Prodi",
  INSTRUCTOR: "Dosen",
  STUDENT: "Mahasiswa",
  RECTOR: "Rektor",
};
const cell = (value) => value.replaceAll("|", "\\|");
const lines = [
  "# Panduan penggunaan E-Learning UAY",
  "",
  "Edisi 7 Oktober 2026. Mencakup Mahasiswa, Dosen, Admin Prodi, Super Admin, dan Rektor. Buka Bantuan → Buka buku panduan (tab baru) untuk petunjuk yang sesuai dengan peran akun.",
  "",
  "Panduan ini memakai konten yang sama dengan halaman Bantuan. Di aplikasi, panduan yang tampil mengikuti role akun. Nama, angka, dan tanggal pada gambar merupakan contoh.",
  "",
  "Langkah disajikan sebagai daftar bernomor tanpa checklist. Tanggal dan jam mengikuti zona perangkat dengan offset sebenarnya; jadwal dikirim dan disimpan sebagai UTC.",
  "",
  "## Daftar tutorial",
  "",
];
for (const article of guide.tutorials)
  lines.push(
    `- [${article.id} — ${article.title}](#tutorial-${article.id.toLowerCase()})`,
  );
lines.push(
  "",
  "- [Konversi nilai](#konversi-nilai)",
  "- [Solusi kendala](#solusi-kendala)",
  "",
);
for (const article of guide.tutorials) {
  lines.push(
    `<a id="tutorial-${article.id.toLowerCase()}"></a>`,
    "",
    `## ${article.id} — ${article.title}`,
    "",
    `**Peran:** ${article.roles.map((role) => labels[role]).join(", ")}.`,
    "",
    `**Tujuan:** ${article.summary}`,
    "",
    `**Buka:** ${article.location}`,
    "",
    `**Sebelum mulai:** ${article.preparation}`,
    "",
    "### Langkah",
    "",
  );
  article.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
  lines.push(
    "",
    `**Periksa hasil:** ${article.result}`,
    "",
    ...(article.figure
      ? [
          `![${article.figure.alt}](images/tutorial/${basename(article.figure.src)})`,
          "",
          article.figure.caption,
          "",
        ]
      : []),
    "### Input, pilihan, dan tombol",
    "",
    "| Kontrol di layar | Nilai atau contoh | Fungsi dan akibat |",
    "| --- | --- | --- |",
  );
  article.controls.forEach((control) =>
    lines.push(
      `| ${cell(control.label)} | ${cell(control.value)} | ${cell(control.effect)} |`,
    ),
  );
  lines.push("");
  if (article.notes.length)
    lines.push(
      "### Catatan penggunaan",
      "",
      ...article.notes.flatMap((note) => [note, ""]),
    );
}
lines.push(
  "## Konversi nilai",
  "",
  "Gunakan versi skala pada kelas. Total bobot kategori harus 100 persen. Mengubah skala default tidak menghitung ulang nilai akhir yang telah diterbitkan.",
  "",
);
for (const scale of Object.values(GRADE_SCALE_PRESETS)) {
  lines.push(
    `### Skala ${scale.version}`,
    "",
    "| Skor minimum | Huruf mutu | Indeks mutu |",
    "| --- | --- | --- |",
  );
  scale.bands.forEach((band) =>
    lines.push(
      `| ≥ ${band.minScore} | ${band.letter} | ${band.point.toFixed(2).replace(".", ",")} |`,
    ),
  );
  lines.push("");
}
lines.push("## Solusi kendala", "");
for (const article of guide.faqs)
  lines.push(
    `### ${article.title}`,
    "",
    `**Peran:** ${article.roles.map((role) => labels[role]).join(", ")}.`,
    "",
    article.content,
    "",
  );
const master = lines.join("\n");
const alias =
  "# Panduan operasional E-Learning UAY\n\nGunakan [panduan penggunaan utama](BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md) atau menu **Bantuan** di aplikasi. Panduan di aplikasi mengikuti role akun.\n\nDokumen ini merupakan tautan ke sumber utama agar petunjuk tidak memiliki dua salinan yang berbeda.\n";
const files = {
  "guide-grade-scales.json":
    JSON.stringify(GRADE_SCALE_PRESETS, null, 2) + "\n",
  "BUKU_PANDUAN_PENGGUNAAN_ELEARNING_UAY.md": master,
  "PANDUAN_OPERASIONAL_PENGGUNA_UAY.md": alias,
};
const check = process.argv.includes("--check");
const outputIndex = process.argv.indexOf("--output-dir");
if (outputIndex >= 0 && !process.argv[outputIndex + 1])
  throw new Error("--output-dir requires a directory");
const defaultDirectory = resolve(root, "docs/guides");
const directories = [defaultDirectory];
if (outputIndex >= 0) directories.push(resolve(process.argv[outputIndex + 1]));
for (const directory of directories) {
  const imageDirectory =
    directory === defaultDirectory ? "../images/tutorial" : "images/tutorial";
  if (!check)
    mkdirSync(resolve(directory, imageDirectory), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const outputContent =
      directory === defaultDirectory
        ? content.replaceAll("](images/tutorial/", "](../images/tutorial/")
        : content;
    const path = resolve(directory, name);
    if (check) {
      if (readFileSync(path, "utf8").replaceAll("\r\n", "\n") !== outputContent)
        throw new Error(`${path} is out of date; run npm run docs:guide`);
    } else writeFileSync(path, outputContent);
  }
  if (!check)
    for (const article of guide.tutorials.filter((article) => article.figure))
      copyFileSync(
        resolve(root, "apps/web/public", article.figure.src.slice(1)),
        resolve(directory, imageDirectory, basename(article.figure.src)),
      );
}
console.log(
  check
    ? "Guide documents match the application content and grade scales."
    : "Exported one master guide and an operational link from the application content.",
);
