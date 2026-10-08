import type { Express } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { db, ensure, mutate, audit } from "./core.js";

export interface SystemAnnouncement {
  id: string;
  title: string;
  content: string;
  category: "SURAT_EDARAN" | "AKADEMIK" | "REGISTRASI" | "LIBUR" | "KEGIATAN" | "UMUM";
  referenceNumber?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  targetRole: "ALL" | "STUDENT" | "INSTRUCTOR";
  departmentCode?: string;
  isImportant: boolean;
  isPublished: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  publishedAt: string;
  createdAt: string;
}

const dataDir = join(process.cwd(), "apps", "api", "data");
const dataFilePath = join(dataDir, "system_announcements.json");

const sampleAnnouncements: SystemAnnouncement[] = [
  {
    id: "se-rek-028-2026",
    title: "Pelaksanaan Perkuliahan Terpadu Semester Ganjil TA 2026/2027 dan Pemanfaatan Platform E-Learning UAY",
    content: `<p>Diberitahukan kepada seluruh dosen pengampu dan mahasiswa <strong>Universitas Achmad Yani</strong>, bahwa perkuliahan Semester Ganjil Tahun Akademik 2026/2027 diselenggarakan secara terpadu melalui platform <strong>E-Learning UAY</strong>.</p>

<h3>Ketentuan Pokok Perkuliahan:</h3>
<ul>
  <li>Seluruh dosen diwajibkan mengunggah materi modul perkuliahan dan kontrak pembelajaran sebelum pertemuan perdana.</li>
  <li>Mahasiswa diwajibkan melakukan konfirmasi jadwal serta ruang perkuliahan virtual di akun masing-masing.</li>
  <li>Presensi kehadiran divalidasi langsung melalui sistem presensi mandiri dan sesi QR code dosen pengampu.</li>
</ul>

<blockquote class="callout-box">
  <strong>PERHATIAN REKTORAT:</strong> Setiap aktivitas pembelajaran daring dan penugasan terekam otomatis dalam repositori akademik universitas.
</blockquote>`,
    category: "SURAT_EDARAN",
    referenceNumber: "SE/028/UAY/REK/2026",
    authorId: "superadmin-uay-001",
    authorName: "Bagian Administrasi Akademik & Rektorat",
    authorRole: "SUPER_ADMIN",
    targetRole: "ALL",
    isImportant: true,
    isPublished: true,
    attachmentUrl: "https://uay.ac.id/dokumen/SE-028-Perkuliahan-Ganjil-2026.pdf",
    attachmentName: "SE-028-Perkuliahan-Ganjil-2026.pdf",
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "baak-krs-114-2026",
    title: "Jadwal Pengisian, Perubahan, dan Pengesahan Kartu Rencana Studi (KRS) Online Semester Ganjil",
    content: `<p>Masa pengisian dan revisi <strong>KRS Online</strong> pada sistem SIAKAD UAY dibuka sampai batas waktu yang ditentukan kalender akademik.</p>

<h3>Alur Konsultasi & Pengesahan KRS:</h3>
<ol>
  <li>Pastikan status administrasi pembayaran tahap pertama telah terverifikasi bendahara kampus.</li>
  <li>Pilih mata kuliah sesuai paket semester dan batas beban SKS berdasarkan IPK semester lalu.</li>
  <li>Konsultasikan rencana studi kepada <em>Dosen Pembimbing Akademik (DPA)</em> untuk persetujuan (ACC).</li>
</ol>

<blockquote class="callout-box">
  <strong>CATATAN BAAK:</strong> Sinkronisasi data mahasiswa ke kelas E-Learning memerlukan waktu 1x24 jam kerja setelah KRS disetujui (ACC).
</blockquote>`,
    category: "REGISTRASI",
    referenceNumber: "B/114/BAAK/UAY/2026",
    authorId: "superadmin-uay-001",
    authorName: "Biro Administrasi Akademik & Kemahasiswaan (BAAK)",
    authorRole: "SUPER_ADMIN",
    targetRole: "STUDENT",
    isImportant: true,
    isPublished: true,
    attachmentUrl: "https://siakad.uay.ac.id/panduan/jadwal-krs-ganjil-2026.pdf",
    attachmentName: "Jadwal-KRS-Ganjil-2026.pdf",
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lp3m-rps-089-2026",
    title: "Batas Akhir Sinkronisasi Kontrak Perkuliahan, Rencana Pembelajaran Semester (RPS), dan Bank Soal",
    content: `<p>Kepada seluruh Bapak/Ibu Dosen Pengampu mata kuliah di lingkungan Universitas Achmad Yani, dimohon untuk melengkapi instrumen perkuliahan pada kelas masing-masing:</p>

<ul>
  <li><strong>Kontrak Perkuliahan &amp; RPS:</strong> Terunggah dalam format dokumen atau Rich Text sebelum pekan ke-2.</li>
  <li><strong>Topik Pertemuan:</strong> Disusun minimum 16 sesi tatap muka terstruktur (termasuk UTS dan UAS).</li>
  <li><strong>Bank Soal Asesmen:</strong> Kelengkapan bank soal kuis dan penugasan untuk evaluasi <em>Capaian Pembelajaran Lulusan (CPL)</em>.</li>
</ul>`,
    category: "AKADEMIK",
    referenceNumber: "B/089/LP3M/UAY/2026",
    authorId: "superadmin-uay-001",
    authorName: "Lembaga Pengembangan Pembelajaran & Penjaminan Mutu (LP3M)",
    authorRole: "SUPER_ADMIN",
    targetRole: "INSTRUCTOR",
    isImportant: false,
    isPublished: true,
    publishedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "se-libur-031-2026",
    title: "Penetapan Hari Libur Nasional & Penyesuaian Agenda Evaluasi Tengah Semester (UTS)",
    content: `<p>Merujuk pada <strong>Surat Keputusan Bersama (SKB)</strong> tentang Hari Libur Nasional dan Cuti Bersama, dengan ini diberitahukan bahwa:</p>

<ul>
  <li>Kegiatan perkuliahan tatap muka maupun daring pada tanggal merah ditiadakan.</li>
  <li>Dosen dapat mengalihkan pertemuan secara asinkronus melalui penugasan terstruktur di platform E-Learning.</li>
  <li>Jadwal evaluasi tengah semester (UTS) yang bertepatan dengan tanggal libur akan dialihkan ke pekan pengganti.</li>
</ul>`,
    category: "LIBUR",
    referenceNumber: "SE/031/UAY/REK/2026",
    authorId: "superadmin-uay-001",
    authorName: "Sekretariat Rektorat UAY",
    authorRole: "SUPER_ADMIN",
    targetRole: "ALL",
    isImportant: false,
    isPublished: true,
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function loadAnnouncements(): SystemAnnouncement[] {
  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    if (!existsSync(dataFilePath)) {
      writeFileSync(dataFilePath, JSON.stringify(sampleAnnouncements, null, 2), "utf-8");
      return sampleAnnouncements;
    }
    const raw = readFileSync(dataFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return sampleAnnouncements;
  } catch {
    return sampleAnnouncements;
  }
}

function saveAnnouncements(items: SystemAnnouncement[]): void {
  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
    writeFileSync(dataFilePath, JSON.stringify(items, null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal menyimpan system_announcements.json:", e);
  }
}

const announcementSchema = z.object({
  title: z.string().trim().min(3).max(300),
  content: z.string().trim().min(5).max(50000),
  category: z.enum(["SURAT_EDARAN", "AKADEMIK", "REGISTRASI", "LIBUR", "KEGIATAN", "UMUM"]).default("SURAT_EDARAN"),
  referenceNumber: z.string().trim().max(100).optional(),
  targetRole: z.enum(["ALL", "STUDENT", "INSTRUCTOR"]).default("ALL"),
  departmentCode: z.string().trim().max(20).optional(),
  isImportant: z.boolean().default(false),
  isPublished: z.boolean().default(true),
  attachmentUrl: z.string().trim().url().optional().or(z.literal("")),
  attachmentName: z.string().trim().max(200).optional(),
});

export function registerSystemAnnouncements(app: Express) {
  // GET: Ambil daftar pengumuman & edaran yang relevan untuk pengguna
  app.get("/api/v1/system-announcements", async (req, res) => {
    const user = req.context.user;
    const all = loadAnnouncements();

    const filtered = all.filter((a) => {
      if (user.role === "SUPER_ADMIN") return true;

      // Belum diterbitkan hanya untuk Super Admin
      if (!a.isPublished) return false;

      // Filter role sasaran
      if (a.targetRole !== "ALL") {
        if (a.targetRole === "STUDENT" && user.role !== "STUDENT") return false;
        if (a.targetRole === "INSTRUCTOR" && user.role !== "INSTRUCTOR") return false;
      }

      // Filter program studi
      if (a.departmentCode && a.departmentCode !== "ALL") {
        if (user.role === "DEPARTMENT_ADMIN") {
          return user.departmentScopes?.includes(a.departmentCode);
        }
        if (user.departmentScopes?.length) {
          return user.departmentScopes.includes(a.departmentCode);
        }
      }

      return true;
    });

    // Urutkan: Pinned (isImportant) pertama, kemudian publishedAt terbaru
    filtered.sort((a, b) => {
      if (a.isImportant !== b.isImportant) {
        return a.isImportant ? -1 : 1;
      }
      return Date.parse(b.publishedAt || b.createdAt) - Date.parse(a.publishedAt || a.createdAt);
    });

    res.json(filtered);
  });

  // POST: Terbitkan pengumuman / edaran baru (Super Admin / Admin Prodi)
  app.post("/api/v1/system-announcements", async (req, res) =>
    res.status(201).json(
      await mutate(req, async (tx) => {
        const user = req.context.user;
        ensure(
          ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role),
          403,
          "WRITE_ACCESS_DENIED",
        );

        const data = announcementSchema.parse(req.body);

        // Jika Admin Prodi, batasi hanya untuk prodinya
        if (user.role === "DEPARTMENT_ADMIN") {
          ensure(
            data.departmentCode && user.departmentScopes?.includes(data.departmentCode),
            403,
            "DEPARTMENT_SCOPE_DENIED",
          );
        }

        const now = new Date().toISOString();
        const newAnnouncement: SystemAnnouncement = {
          id: randomUUID(),
          title: data.title,
          content: data.content,
          category: data.category,
          referenceNumber: data.referenceNumber || undefined,
          authorId: user.id,
          authorName: user.name,
          authorRole: user.role,
          targetRole: data.targetRole,
          departmentCode: data.departmentCode || undefined,
          isImportant: data.isImportant,
          isPublished: data.isPublished,
          attachmentUrl: data.attachmentUrl || undefined,
          attachmentName: data.attachmentName || undefined,
          publishedAt: now,
          createdAt: now,
        };

        const list = loadAnnouncements();
        list.unshift(newAnnouncement);
        saveAnnouncements(list);

        // Kirim notifikasi broadcast ke pengguna sasaran jika diterbitkan
        if (newAnnouncement.isPublished) {
          try {
            const roleFilter: any = {};
            if (data.targetRole === "STUDENT") roleFilter.role = "STUDENT";
            else if (data.targetRole === "INSTRUCTOR") roleFilter.role = "INSTRUCTOR";
            else roleFilter.role = { in: ["STUDENT", "INSTRUCTOR"] };

            const targetUsers = await tx.user.findMany({
              where: {
                status: "ACTIVE",
                ...roleFilter,
              },
              select: { id: true },
              take: 500,
            });

            if (targetUsers.length > 0) {
              const categoryLabels: Record<string, string> = {
                SURAT_EDARAN: "Surat Edaran",
                AKADEMIK: "Pengumuman Akademik",
                REGISTRASI: "Info Registrasi",
                LIBUR: "Pemberitahuan Libur",
                KEGIATAN: "Agenda Kampus",
                UMUM: "Pengumuman",
              };
              const catLabel = categoryLabels[newAnnouncement.category] ?? "Pengumuman";

              await tx.notification.createMany({
                data: targetUsers.map((u) => ({
                  userId: u.id,
                  type: "SYSTEM_ANNOUNCEMENT",
                  title: `[${catLabel}] ${newAnnouncement.title}`,
                  message: newAnnouncement.content.slice(0, 140) + (newAnnouncement.content.length > 140 ? "..." : ""),
                  eventKey: `system_announcement:${newAnnouncement.id}`,
                  linkUrl: `/announcements#announcement-${newAnnouncement.id}`,
                })),
                skipDuplicates: true,
              });
            }
          } catch (e) {
            console.error("Gagal mengirim notifikasi broadcast edaran:", e);
          }
        }

        await audit(
          tx,
          req.context,
          "CREATE",
          "SYSTEM_ANNOUNCEMENT",
          newAnnouncement.id,
          null,
          null,
          newAnnouncement,
        );

        return newAnnouncement;
      }),
    ),
  );

  // PATCH: Sunting pengumuman / edaran
  app.patch("/api/v1/system-announcements/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const user = req.context.user;
        ensure(
          ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role),
          403,
          "WRITE_ACCESS_DENIED",
        );

        const list = loadAnnouncements();
        const index = list.findIndex((a) => a.id === req.params.id);
        ensure(index !== -1, 404, "NOT_FOUND");

        const before = list[index];
        if (user.role === "DEPARTMENT_ADMIN") {
          ensure(
            before.authorId === user.id || (before.departmentCode && user.departmentScopes?.includes(before.departmentCode)),
            403,
            "WRITE_ACCESS_DENIED",
          );
        }

        const data = announcementSchema.partial().parse(req.body);
        const updated: SystemAnnouncement = {
          ...before,
          ...data,
          referenceNumber: data.referenceNumber !== undefined ? (data.referenceNumber || undefined) : before.referenceNumber,
          departmentCode: data.departmentCode !== undefined ? (data.departmentCode || undefined) : before.departmentCode,
          attachmentUrl: data.attachmentUrl !== undefined ? (data.attachmentUrl || undefined) : before.attachmentUrl,
          attachmentName: data.attachmentName !== undefined ? (data.attachmentName || undefined) : before.attachmentName,
        };

        list[index] = updated;
        saveAnnouncements(list);

        await audit(
          tx,
          req.context,
          "UPDATE",
          "SYSTEM_ANNOUNCEMENT",
          updated.id,
          null,
          before,
          updated,
        );

        return updated;
      }),
    ),
  );

  // DELETE: Hapus pengumuman / edaran
  app.delete("/api/v1/system-announcements/:id", async (req, res) =>
    res.json(
      await mutate(req, async (tx) => {
        const user = req.context.user;
        ensure(
          ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role),
          403,
          "WRITE_ACCESS_DENIED",
        );

        const list = loadAnnouncements();
        const index = list.findIndex((a) => a.id === req.params.id);
        ensure(index !== -1, 404, "NOT_FOUND");

        const target = list[index];
        if (user.role === "DEPARTMENT_ADMIN") {
          ensure(
            target.authorId === user.id || (target.departmentCode && user.departmentScopes?.includes(target.departmentCode)),
            403,
            "WRITE_ACCESS_DENIED",
          );
        }

        list.splice(index, 1);
        saveAnnouncements(list);

        await audit(
          tx,
          req.context,
          "DELETE",
          "SYSTEM_ANNOUNCEMENT",
          target.id,
          null,
          target,
          null,
        );

        return { id: target.id };
      }),
    ),
  );
}
