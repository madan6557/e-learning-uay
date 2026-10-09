import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

export function createSimplePdf(
  pagesText: string[],
  isLandscape = false,
): Buffer {
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  let currentId = 3;
  for (let i = 0; i < pagesText.length; i++) {
    pageIds.push(++currentId);
    contentIds.push(++currentId);
  }
  const allObjs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [" +
      pageIds.map((id) => id + " 0 R").join(" ") +
      "] /Count " +
      pageIds.length +
      " >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  const mediaBox = isLandscape ? "[0 0 842 595]" : "[0 0 595 842]";
  const startY = isLandscape ? 500 : 750;

  for (let i = 0; i < pagesText.length; i++) {
    const text = pagesText[i];
    const lines = text.split("\n");
    let stream = "BT\n/F1 16 Tf\n50 " + startY + " Td\n";
    for (let l = 0; l < lines.length; l++) {
      if (l > 0) stream += "0 -24 Td\n";
      stream += "(" + lines[l].replace(/[\(\)\\]/g, " ") + ") Tj\n";
    }
    stream += "ET";
    allObjs.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox " +
        mediaBox +
        " /Resources << /Font << /F1 3 0 R >> >> /Contents " +
        contentIds[i] +
        " 0 R >>",
    );
    allObjs.push(
      "<< /Length " +
        Buffer.byteLength(stream) +
        " >>\nstream\n" +
        stream +
        "\nendstream",
    );
  }
  let out = "%PDF-1.4\n";
  const xref = [0];
  for (let i = 0; i < allObjs.length; i++) {
    xref.push(Buffer.byteLength(out));
    out += i + 1 + " 0 obj\n" + allObjs[i] + "\nendobj\n";
  }
  const xrefStart = Buffer.byteLength(out);
  out += "xref\n0 " + (allObjs.length + 1) + "\n0000000000 65535 f \n";
  for (let i = 1; i <= allObjs.length; i++) {
    out += String(xref[i]).padStart(10, "0") + " 00000 n \n";
  }
  out +=
    "trailer\n<< /Size " +
    (allObjs.length + 1) +
    " /Root 1 0 R >>\nstartxref\n" +
    xrefStart +
    "\n%%EOF";
  return Buffer.from(out, "binary");
}

export function generateAllDemoFiles() {
  try {
    const uploadDir = resolve(
      process.cwd(),
      process.env.FILE_SERVICE_DATA_DIRECTORY ??
        process.env.UPLOAD_DIR ??
        "uploads",
    );
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const files = [
      {
        id: "50000000-0000-4000-8000-000000000002",
        name: "Buku Panduan & Silabus Pemrograman Web.pdf",
        mimeType: "application/pdf",
        buffer: createSimplePdf(
          [
            "E-Learning UAY - Universitas Achmad Yani\nSilabus & Rencana Pembelajaran Semester (RPS)\nMata Kuliah: Pemrograman Web (IF2101)",
            "Capaian Pembelajaran Lulusan (CPL):\n1. Mahasiswa memahami protokol HTTP, DNS, dan TCP/IP.\n2. Mahasiswa mampu menyusun dokumen web semantik.\n3. Mahasiswa mampu merancang antarmuka aksesibel dan aman.",
            "Referensi & Buku Ajar:\n1. MDN Web Docs - HTML, CSS, JavaScript Standards.\n2. Technical Design E-Learning UAY v5.0.\n3. World Wide Web Consortium (W3C) Accessibility Guidelines.",
          ],
          false,
        ),
      },
      {
        id: "50000000-0000-4000-8000-000000000003",
        name: "Slide Presentasi Pertemuan 1 - Arsitektur Web.pdf",
        mimeType: "application/pdf",
        buffer: createSimplePdf(
          [
            "SLIDE 1: PENGANTAR TEKNOLOGI WEB\nProgram Studi Teknik Informatika - UAY\nDosen Pengampu: Dosen, M.Kom.",
            "SLIDE 2: BAGAIMANA WEB BEKERJA?\nBrowser (Client) melakukan permintaan via HTTP/HTTPS ke Server.\nServer memproses dan mengembalikan respons dokumen atau JSON.",
            "SLIDE 3: STRUKTUR DOKUMEN HTML SEMANTIK\nGunakan tag semantik: <header>, <nav>, <main>, <article>, <footer>.\nMeningkatkan SEO, aksesibilitas screen reader, dan maintainability.",
            "SLIDE 4: METODE HTTP & RESTFUL API\nGET (Membaca), POST (Membuat), PUT/PATCH (Memperbarui), DELETE (Menghapus).\nStatus Code: 200 OK, 201 Created, 400 Bad Request, 401/403 Auth, 500 Error.",
            "SLIDE 5: KESIMPULAN & TUGAS MINGGU KE-1\nPelajari modul dan kerjakan Praktikum 01 pada E-Learning UAY.\nSesi diskusi dan tanya jawab dibuka di forum kelas.",
          ],
          true,
        ),
      },
      {
        id: "50000000-0000-4000-8000-000000000004",
        name: "Video Pembelajaran - Alur HTTP Request Response.mp4",
        mimeType: "video/mp4",
        buffer: readFileSync(
          new URL("./fixtures/demo-http.mp4", import.meta.url),
        ),
      },
    ];

    const generated = [];
    for (const f of files) {
      const filePath = join(uploadDir, `${f.id}.bin`);
      writeFileSync(filePath, f.buffer);
      const checksum = createHash("sha256").update(f.buffer).digest("hex");
      const meta = {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        sizeBytes: f.buffer.length,
        checksum,
        status: "READY",
        scanStatus: "CLEAN",
        createdAt: new Date().toISOString(),
      };
      writeFileSync(
        join(uploadDir, `${f.id}.json`),
        JSON.stringify(meta, null, 2),
      );
      generated.push(meta);
      console.log(`Generated demo file: ${f.name} (${f.buffer.length} bytes)`);
    }
    return generated;
  } catch (err) {
    throw new Error("Gagal menyiapkan berkas mode uji.", { cause: err });
  }
}

export async function syncDemoFilesToStorage() {
  const generated = generateAllDemoFiles();
  const bucket =
    process.env.S3_BUCKET?.trim() ||
    process.env.S3_BUCKET_NAME?.trim() ||
    process.env.BUCKET_NAME?.trim() ||
    process.env.AWS_S3_BUCKET_NAME?.trim() ||
    process.env.AWS_BUCKET?.trim() ||
    "";
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID?.trim() ||
    process.env.AWS_ACCESS_KEY_ID?.trim() ||
    "";
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY?.trim() ||
    process.env.AWS_SECRET_ACCESS_KEY?.trim() ||
    "";
  const endpoint =
    process.env.S3_ENDPOINT?.trim() ||
    process.env.AWS_ENDPOINT_URL_S3?.trim() ||
    process.env.AWS_ENDPOINT?.trim() ||
    process.env.S3_ENDPOINT_URL?.trim() ||
    "";
  const region =
    process.env.S3_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "auto";

  if (bucket && (accessKeyId || endpoint)) {
    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const client = new S3Client({
        region,
        ...(endpoint ? { endpoint } : {}),
        ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
      });
      const prefix = process.env.S3_KEY_PREFIX?.trim() || "uploads";
      const uploadDir = resolve(
        process.cwd(),
        process.env.FILE_SERVICE_DATA_DIRECTORY ??
          process.env.UPLOAD_DIR ??
          "uploads",
      );
      for (const item of generated) {
        const filePath = join(uploadDir, `${item.id}.bin`);
        if (existsSync(filePath)) {
          const buffer = readFileSync(filePath);
          await client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: `${prefix.replace(/\/+$/, "")}/${item.id}.bin`,
              Body: buffer,
              ContentType: item.mimeType,
              Metadata: {
                originalname: encodeURIComponent(item.name),
                checksum: item.checksum,
              },
            }),
          );
          console.log(`✓ Berhasil sync berkas demo ke S3 (${bucket}): ${item.name}`);
        }
      }
    } catch (s3Err: any) {
      console.warn(
        `[Sync S3 Info]: Melewati sinkronisasi S3 (${s3Err.message}). Berkas lokal tetap tersedia.`,
      );
    }
  }
  return generated;
}
