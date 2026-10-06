import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname, basename, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";

const input = process.argv[2];
if (!input) throw new Error("Usage: node scripts/import-help-guide.mjs <panduan.html>");
const source = resolve(input);
const sourceDirectory = dirname(source);
const root = fileURLToPath(new URL("../", import.meta.url));
const html = readFileSync(source, "utf8");
const dom = new JSDOM(html); // Parse only; source scripts are never executed.
const document = dom.window.document;
const all = ["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT"];
const staff = ["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR"];
const roleMap = { umum: all, mahasiswa: ["STUDENT"], dosen: ["INSTRUCTOR"],
  "admin-prodi": ["DEPARTMENT_ADMIN"], "super-admin": ["SUPER_ADMIN"] };
const categories = { umum: "Mulai Menggunakan Sistem", mahasiswa: "Panduan Mahasiswa",
  dosen: "Panduan Dosen", "admin-prodi": "Administrasi Kelas", "super-admin": "Pengaturan Universitas" };
const text = node => (node?.textContent ?? "").replace(/\s+/g, " ").trim();
const stripPrefix = (value, prefix) => value.replace(prefix, "");
const currentText = value => value
  .replaceAll("Kode PIN 6-Digit", "Kode 6 Karakter")
  .replaceAll("Kode PIN 6 Karakter", "Kode 6 Karakter")
  .replaceAll("kode PIN", "kode")
  .replace(/\bPIN\b/g, "kode")
  .replaceAll("(kode)", "(Kode)")
  .replaceAll("ber-kode", "dengan kode")
  .replaceAll("Kode kode", "Kode")
  .replaceAll("Acak Ulang kode", "Acak Ulang Kode")
  .replace("Kode dapat berisi huruf dan angka meski label menyebut digit.", "Kode 6 karakter dapat berisi huruf dan angka.")
  .replace("PDF untuk Modul PDF, maksimum yang ditampilkan saat ini 25 MB", "PDF untuk Modul PDF, maksimum 50 MB")
  .replace("Tanggal dan jam umumnya mengikuti zona waktu perangkat. Gunakan zona waktu yang benar. Pada tampilan presensi tertentu terdapat label WIB, sehingga cocokkan jam dengan jadwal pengajar.", "Tanggal dan jam mengikuti zona perangkat dengan offset sebenarnya, misalnya GMT+7 atau GMT+8. Input jadwal memakai waktu perangkat dan dikirim ke server sebagai UTC. Pastikan zona perangkat sesuai lokasi Anda.")
  .replace("Contoh: 6 Hadir + 1 Terlambat dari 8 sesi = 87,5 persen. Tampilan rekap versi ini memakai ambang 75 persen untuk kelayakan ujian. Jika kebijakan kampus berubah, cocokkan dengan keputusan akademik.", "Contoh: 6 Hadir + 1 Terlambat dari 8 sesi = 87,5 persen. Ambang kelayakan pada rekap mengikuti pengaturan Super Admin yang tersimpan dan ditampilkan pada rekap.")
  .replace("Pada versi aplikasi yang ditinjau, rekap presensi masih menghitung kelayakan dengan ambang 75 persen. Pengaturan ambang sistem belum otomatis mengubah perhitungan rekap tersebut.", "Perubahan ambang tersimpan langsung dipakai pada perhitungan dan label rekap presensi. Perubahan skala default berlaku pada kelas baru dan hasil duplikasi; nilai akhir yang sudah diterbitkan tidak dihitung ulang.")
  .replace("Sesuaikan zona waktu perangkat. Umumnya tanggal-jam mengikuti perangkat, sedangkan beberapa teks presensi masih menampilkan WIB. Cocokkan dengan pengajar.", "Sesuaikan zona waktu perangkat. Seluruh tanggal-jam mengikuti zona perangkat dan menampilkan offset sebenarnya. Jadwal tetap mengacu pada timestamp UTC yang sama.")
  .replace("Jam Mulai serta Jam Selesai", "Waktu Mulai serta Waktu Selesai, masing-masing berupa tanggal-jam perangkat. Untuk sesi melewati tengah malam, pilih tanggal selesai pada hari berikutnya")
  .replace("Jam Mulai / Jam Selesai", "Waktu Mulai / Waktu Selesai")
  .replace("Jam lokal pada tanggal yang dipilih, akhir sesudah awal", "Tanggal-jam lokal masing-masing; akhir tidak sebelum awal")
  .replace("Gunakan A2 sampai A5 untuk pengelolaan mata kuliah, kelas, peserta, impor, dan arsip. Gunakan tutorial dosen untuk operasi pembelajaran yang memerlukan pengelolaan kelas.", "Gunakan A2 sampai A5 untuk pengelolaan mata kuliah, kelas, peserta, impor, dan arsip sesuai kewenangan Super Admin.");

const imageDirectory = resolve(root, "apps/web/public/help/tutorial");
mkdirSync(imageDirectory, { recursive: true });
const tutorials = [...document.querySelectorAll("article.tutorial")].map(article => {
  const sourceRole = article.dataset.role;
  const roles = roleMap[sourceRole]?.slice();
  if (!roles) throw new Error(`Unknown tutorial role: ${sourceRole}`);
  // Shared class-management workflows are explicitly assigned in the source guide.
  if (["A2", "A3", "A4", "A5"].includes(article.id)) roles.push("SUPER_ADMIN");
  if (["A3", "A4"].includes(article.id)) roles.push("INSTRUCTOR");
  const paragraphs = [...article.children].filter(node => node.tagName === "P");
  const metadata = prefix => currentText(stripPrefix(text(paragraphs.find(node => text(node).startsWith(prefix))), new RegExp(`^${prefix}\\s*`)));
  const notesHeading = [...article.querySelectorAll("h3")].find(node => text(node) === "Catatan penggunaan");
  const notes = [];
  for (let node = notesHeading?.nextElementSibling; node && !node.classList.contains("back"); node = node.nextElementSibling) {
    if (node.tagName === "P") notes.push(currentText(text(node)));
  }
  const image = article.querySelector("figure img");
  if (!image) throw new Error(`Missing screenshot for ${article.id}`);
  const imageSource = resolve(sourceDirectory, image.getAttribute("src"));
  if (!imageSource.startsWith(sourceDirectory + sep)) throw new Error("Guide image must be inside its source directory");
  const imageName = basename(imageSource);
  if (!/^[\w-]+\.png$/.test(imageName)) throw new Error(`Unsupported guide image name: ${imageName}`);
  copyFileSync(imageSource, resolve(imageDirectory, imageName));
  return {
    id: article.id, title: currentText(text(article.querySelector("h2"))), summary: currentText(text(article.querySelector(".goal"))),
    category: categories[sourceRole], roles, keywords: [article.id],
    location: metadata("Buka:"), preparation: metadata("Sebelum mulai:"),
    steps: [...article.querySelectorAll(".steps li")].map(node => currentText(text(node))),
    result: currentText(stripPrefix(text(article.querySelector(".result")), /^Periksa hasil:\s*/)),
    controls: [...article.querySelectorAll("tbody tr")].map(row => {
      const cells = [...row.children].map(node => currentText(text(node)));
      if (cells.length !== 3) throw new Error(`Invalid control table in ${article.id}`);
      return { label: cells[0], value: cells[1], effect: cells[2] };
    }),
    notes, content: "",
    figure: { src: `/help/tutorial/${imageName}`, alt: currentText(image.getAttribute("alt") ?? ""),
      caption: currentText(text(article.querySelector("figcaption"))).replace(/Klik gambar untuk memperbesar\.$/, "").trim() },
  };
});
if (tutorials.length !== 33 || new Set(tutorials.map(article => article.id)).size !== 33) {
  throw new Error("The expected guide contains 33 unique tutorials");
}
const faqRoles = [all, staff, ["STUDENT"], all, ["STUDENT"], ["STUDENT"], ["STUDENT"],
  ["STUDENT"], staff, staff, staff, all, all, all];
const faqs = [...document.querySelectorAll("#kendala details")].map((details, index) => ({
  id: `kendala-${index + 1}`, title: currentText(text(details.querySelector("summary"))),
  summary: currentText(text(details.querySelector("p"))), category: "Solusi Kendala", roles: faqRoles[index],
  keywords: [], content: currentText(text(details.querySelector("p"))),
}));
if (faqs.length !== faqRoles.length) throw new Error("Troubleshooting role assignments must match the source guide");
const result = { source: { name: basename(source), sha256: createHash("sha256").update(html).digest("hex"), tutorialCount: tutorials.length },
  tutorials, faqs };
writeFileSync(resolve(root, "apps/web/src/data/helpGuide.json"), JSON.stringify(result, null, 2) + "\n");
dom.window.close();
console.log(`Imported ${tutorials.length} tutorials and ${faqs.length} troubleshooting articles without source scripts or checklist controls.`);
