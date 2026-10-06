import PDFDocument from "pdfkit";
import {
  INDICATOR_DEFINITIONS,
  type ReportingSnapshot,
  type ReportFilters,
} from "../../../../packages/shared/src/rector.js";
import {
  classDetail,
  lecturerDetail,
  lecturerRows,
  selectReport,
  summary,
} from "./reporting.js";
export type ReportView =
  "overview" | "lecturers" | "lecturer" | "class" | "activities";
export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value)) + " WIB"
    : "Belum ada data";
const clean = (value: unknown) =>
  String(value ?? "").replace(/[\u2010-\u2015]/g, "-");
const readableLabel = (value: string) =>
  (
    ({
      TUGAS: "Tugas",
      KUIS_MANUAL: "Kuis dinilai dosen",
      KUIS_OTOMATIS: "Kuis otomatis",
      NILAI_AKHIR: "Nilai akhir",
      PERTEMUAN: "Pertemuan",
      MATERI: "Materi",
      BANK_SOAL: "Bank soal",
      KUIS: "Kuis",
      PENGUMUMAN: "Pengumuman",
      TERBIT: "Terbit",
      DRAF: "Draf",
      AKTIF: "Aktif",
      ARSIP: "Arsip",
    }) as Record<string, string>
  )[value] ?? value;
export function exportTable(
  s: ReportingSnapshot,
  f: ReportFilters,
  view: ReportView,
  id?: string,
) {
  if (view === "activities")
    return {
      title: "Kronologi aktivitas",
      headers: [
        "Waktu (WIB)",
        "Pelaku",
        "Kategori pelaku",
        "Tindakan",
        "Objek",
        "Kelas",
      ],
      rows: selectReport(s, f)
        .activities.sort((a, b) => b.at.localeCompare(a.at))
        .map((a) => [
          formatDate(a.at),
          a.actorName,
          a.actorKind,
          a.action,
          a.objectName,
          s.classes.find((c) => c.id === a.classId)?.title ??
            "Tanpa konteks kelas",
        ]),
    };
  if (view === "class") {
    const d = classDetail(s, f, id!);
    if (!d) throw new Error("NOT_FOUND");
    return {
      title: `Kelas: ${d.class.title}`,
      headers: [
        "Pekerjaan berlaku",
        "Jenis",
        "Total",
        "Dinilai",
        "Antrean",
        "Terbit",
        "Mulai antrean (WIB)",
      ],
      rows: d.class.grading
        .filter((w) => w.current)
        .map((w) => [
          w.title,
          readableLabel(w.kind),
          w.total,
          w.graded,
          w.total - w.graded,
          w.published,
          formatDate(w.pendingSince),
        ]),
    };
  }
  const rows =
    view === "lecturer"
      ? [lecturerDetail(s, f, id!)?.lecturer].filter(
          (r): r is NonNullable<typeof r> => !!r,
        )
      : lecturerRows(s, f);
  return {
    title:
      view === "lecturer"
        ? `Dosen: ${rows[0]?.name ?? ""}`
        : "Rekap aktivitas dosen",
    headers: [
      "Dosen",
      "Prodi",
      "Kelas",
      "Login",
      "Akses kelas",
      "Hari aktif akademik",
      "Tindakan akademik",
      "Tindakan materi",
      "Objek materi",
      "Tindakan asesmen",
      "Objek asesmen",
      "Tindakan penilaian",
      "Publikasi",
      "Koreksi",
      "Antrean kelas",
      "Login terakhir (WIB)",
      "Akademik terakhir (WIB)",
    ],
    rows: rows.map((l) => [
      l.name,
      l.department,
      l.classCount,
      l.logins,
      l.accesses,
      l.activeDays,
      l.academicActions,
      l.materialActions,
      l.materialObjects,
      l.assessmentActions,
      l.assessmentObjects,
      l.gradingActions,
      l.publicationActions,
      l.correctionActions,
      l.pending,
      formatDate(l.lastLoginAt),
      formatDate(l.lastAcademicAt),
    ]),
  };
}
export function csvReport(
  s: ReportingSnapshot,
  f: ReportFilters,
  view: ReportView,
  id?: string,
  demo = true,
) {
  const t = exportTable(s, f, view, id);
  // Quote every cell and neutralize spreadsheet formulas in any text field.
  const cell = (v: unknown) =>
    '"' +
    (/^[=+@\-\t\r\n]/.test(String(v ?? ""))
      ? "'" + String(v)
      : String(v ?? "")
    ).replace(/"/g, '""') +
    '"';
  const lines = [
    [demo ? "Demo - data simulasi" : "Pemantauan Akademik E-Learning UAY"],
    ["Data terakhir", formatDate(s.snapshotAt)],
    ["Filter", JSON.stringify(f)],
    ["Laporan", t.title],
    t.headers,
    ...t.rows,
  ];
  if (view === "lecturer") {
    const detail = lecturerDetail(s, f, id!)!;
    lines.push(
      [],
      ["Sesi login - waktu terhubung, bukan durasi kerja"],
      ["Login (WIB)", "Logout (WIB)", "Status", "Sesi"],
    );
    lines.push(
      ...detail.sessions.map((session) => [
        formatDate(session.loginAt),
        formatDate(session.logoutAt),
        session.logoutAt ? "Logout tercatat" : "Logout belum tercatat",
        session.id,
      ]),
    );
    lines.push(
      [],
      ["Aktivitas dosen dalam periode"],
      [
        "Mulai (WIB)",
        "Selesai tercatat (WIB)",
        "Tindakan",
        "Objek",
        "Kelas",
        "Sesi",
      ],
    );
    lines.push(
      ...detail.activities.map((a) => [
        formatDate(a.at),
        formatDate(a.completedAt ?? null),
        a.action,
        a.objectName,
        s.classes.find((c) => c.id === a.classId)?.title ?? "—",
        a.sessionId ?? "Belum tercatat",
      ]),
    );
  }
  return (
    "\uFEFF" + lines.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
  );
}
export async function pdfReport(
  s: ReportingSnapshot,
  f: ReportFilters,
  view: ReportView,
  id?: string,
  selectedSession?: string,
  demo = true,
): Promise<Buffer> {
  const table = exportTable(s, f, view, id);
  const stats = summary(s, f);
  const doc = new PDFDocument({
    size: "A4",
    margin: 42,
    bufferPages: true,
    info: { Title: table.title, Author: "UAY - Pemantauan Akademik" },
  });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const width = doc.page.width - 84;
  const bottom = doc.page.height - 64;
  function paragraph(text: string, size = 10, bold = false) {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
    const h = doc.heightOfString(clean(text), { width, lineGap: 3 });
    if (doc.y + h > bottom) doc.addPage();
    doc
      .fillColor("#203a50")
      .text(clean(text), 42, doc.y, { width, lineGap: 3 });
    doc.moveDown(0.65);
  }
  function heading(text: string) {
    if (doc.y + 55 > bottom) doc.addPage();
    paragraph(text, 13, true);
  }
  function rows(headers: string[], values: unknown[][], ratios?: number[]) {
    const widths = (ratios ?? headers.map(() => 1)).map(
      (v, _, a) => (width * v) / a.reduce((n, x) => n + x, 0),
    );
    const row = (cells: unknown[], header = false) => {
      doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      const height = Math.max(
        26,
        ...cells.map(
          (c, i) =>
            doc.heightOfString(clean(c), {
              width: widths[i] - 12,
              lineGap: 2,
            }) + 14,
        ),
      );
      if (doc.y + height > bottom) {
        doc.addPage();
        row(headers, true);
      }
      doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(10);
      const y = doc.y;
      let x = 42;
      doc.rect(42, y, width, height).fill(header ? "#173f62" : "#f2f5f8");
      cells.forEach((c, i) => {
        doc
          .fillColor(header ? "#ffffff" : "#203a50")
          .text(clean(c), x + 6, y + 7, { width: widths[i] - 12, lineGap: 2 });
        x += widths[i];
      });
      doc.y = y + height + 3;
      doc.x = 42;
    };
    row(headers, true);
    values.forEach((v) => row(v));
    doc.moveDown();
  }
  paragraph("UNIVERSITAS ACHMAD YANI", 10, true);
  paragraph("Dashboard Rektor", 23, true);
  paragraph(`Laporan pemantauan rektor${demo ? " | DEMO - DATA SIMULASI" : " | E-Learning UAY"}`, 10, true);
  paragraph(
    `Data terakhir: ${formatDate(s.snapshotAt)}\nLaporan dibuat: ${formatDate(new Date().toISOString())}`,
  );
  const lecturer = f.lecturer
    ? s.lecturers.find((l) => l.id === f.lecturer)?.name
    : "Semua dosen";
  const cls = f.classId
    ? s.classes.find((c) => c.id === f.classId)?.title
    : "Semua kelas";
  paragraph(
    `Semester: ${f.semester ?? "Semua semester"} | Periode: ${f.from ?? "Semua"} s.d. ${f.to ?? "Semua"}\nProdi: ${f.department ?? "Semua prodi"} | Dosen: ${lecturer ?? "-"} | Kelas: ${cls ?? "-"}${f.search ? `\nPencarian: ${f.search}` : ""}\nKategori: ${f.category ?? "Semua"} | Pelaku: ${f.actorKind ?? "Semua"}`,
  );
  heading("Ringkasan indikator");
  rows(
    [
      "Dosen / kelas",
      "Masuk / kegiatan akademik",
      "Belum dinilai dosen",
      "Nilai dibagikan",
    ],
    [
      [
        `${stats.lecturerCount} / ${stats.classCount}`,
        `${stats.loggedInLecturers} / ${stats.academicallyActiveLecturers}`,
        stats.grading.pending,
        stats.grading.percentage === null
          ? "Belum ada data"
          : `${stats.grading.published}/${stats.grading.total} (${stats.grading.percentage}%)`,
      ],
    ],
  );
  paragraph(
    `Materi tersedia: ${stats.materialCount} | Tugas: ${stats.assignmentCount} | Kuis: ${stats.quizCount}\nDinilai manual/akhir: ${stats.grading.graded} | Dinilai otomatis: ${stats.grading.automaticGraded}\nAktivitas akademik dosen dalam periode: ${stats.activity.academicActions}`,
  );
  heading(table.title);
  if (view === "activities")
    rows(table.headers, table.rows, [1.1, 1.2, 0.7, 1.4, 1.4, 1.1]);
  else if (view === "class") {
    const detail = classDetail(s, f, id!)!;
    paragraph(
      `${detail.class.courseCode} | ${detail.class.department} | ${detail.class.semester} | ${detail.class.status}\nPengampu: ${detail.instructors.map((l) => l.name).join(", ")}`,
    );
    rows(table.headers, table.rows, [2, 1.3, 0.5, 0.6, 0.8, 0.6, 1.2]);
    heading("Pertemuan dan konten");
    rows(
      ["Konten", "Jenis", "Status", "Visibilitas"],
      detail.class.items.map((i) => [
        i.title,
        readableLabel(i.kind),
        readableLabel(i.status),
        i.visible ? "Terlihat" : "Tersembunyi",
      ]),
      [2.5, 1, 1, 1],
    );
    heading("Kontribusi pengampu dalam periode");
    rows(
      ["Dosen", "Akademik", "Materi", "Penilaian", "Publikasi", "Koreksi"],
      detail.contributions.map((c) => [
        c.lecturer.name,
        c.metrics.academicActions,
        c.metrics.materialActions,
        c.metrics.gradingActions,
        c.metrics.publicationActions,
        c.metrics.correctionActions,
      ]),
      [2.5, 1, 1, 1, 1, 1],
    );
  } else {
    const data =
      view === "lecturer"
        ? [lecturerDetail(s, f, id!)!.lecturer]
        : lecturerRows(s, f);
    rows(
      [
        "Dosen / prodi",
        "Kelas",
        "Login",
        "Akademik",
        "Materi*",
        "Penilaian",
        "Antrean**",
      ],
      data.map((l) => [
        `${l.name}\n${l.department}`,
        l.classCount,
        l.logins,
        l.academicActions,
        `${l.materialActions} / ${l.materialObjects}`,
        l.gradingActions,
        l.pending,
      ]),
      [2.8, 0.6, 0.6, 0.8, 0.8, 0.8, 0.8],
    );
    paragraph(
      "* Materi: tindakan / objek unik. ** Antrean kelas bersama dapat muncul pada beberapa pengampu; tidak dijumlahkan sebagai antrean universitas.",
      8.5,
    );
    if (view === "lecturer") {
      const d = lecturerDetail(s, f, id!)!;
      heading("Kelas dan kontribusi dosen");
      rows(
        ["Kelas", "Akademik", "Penilaian", "Antrean kelas", "Nilai terbit"],
        d.classes.map((c) => [
          c.class.title,
          c.contribution.academicActions,
          c.contribution.gradingActions,
          c.grading.pending,
          `${c.grading.published}/${c.grading.total}`,
        ]),
        [2.5, 1, 1, 1, 1],
      );
      heading("Sesi login dalam periode");
      paragraph(
        "Rentang login sampai logout adalah waktu terhubung, bukan durasi kerja. Logout yang tidak tercatat tidak diperkirakan.",
        9,
      );
      rows(
        ["Login (WIB)", "Logout (WIB)", "Status"],
        d.sessions.map((session) => [
          formatDate(session.loginAt),
          formatDate(session.logoutAt),
          session.logoutAt ? "Logout tercatat" : "Logout belum tercatat",
        ]),
        [1.5, 1.5, 1],
      );
    }
  }
  if (view === "lecturer" || view === "class") {
    let events =
      view === "lecturer"
        ? lecturerDetail(s, f, id!)!.activities
        : classDetail(s, f, id!)!.activities;
    if (view === "lecturer") {
      const d = lecturerDetail(s, f, id!)!;
      const session =
        d.sessions.find((session) => session.id === selectedSession) ??
        d.sessions[0];
      heading("Aktivitas selama sesi yang dibuka");
      if (session) {
        paragraph(
          `Login: ${formatDate(session.loginAt)} | Logout: ${session.logoutAt ? formatDate(session.logoutAt) : "Belum tercatat"}`,
          9,
        );
        events = events
          .filter((a) => a.sessionId === session.id)
          .sort((a, b) => a.at.localeCompare(b.at));
      }
    } else heading("Riwayat aktivitas dan koreksi dalam periode");
    const at = (a: (typeof events)[number]) =>
      `${formatDate(a.at)}${a.completedAt ? `\nSelesai: ${formatDate(a.completedAt)}` : ""}`;
    if (view === "lecturer")
      rows(
        ["Mulai / selesai (WIB)", "Aktivitas", "Kelas / objek"],
        events.map((a) => [
          at(a),
          a.action,
          `${s.classes.find((c) => c.id === a.classId)?.title ?? "E-learning UAY"}\n${a.objectName}`,
        ]),
        [1.2, 1.4, 1.7],
      );
    else
      rows(
        ["Mulai / selesai (WIB)", "Pelaku", "Tindakan", "Objek"],
        events.map((a) => [
          at(a),
          `${a.actorName}\n${a.actorKind === "DOSEN" ? "Dosen" : a.actorKind === "ADMIN" ? "Admin akademik" : "Proses otomatis"}`,
          a.action,
          a.objectName,
        ]),
        [1.2, 1.4, 1.4, 1.6],
      );
  }
  heading("Definisi dan batas indikator");
  INDICATOR_DEFINITIONS.forEach((t, i) => paragraph(`${i + 1}. ${t}`, 9));
  paragraph(
    "Presensi, forum diskusi, dan kehadiran telekonferensi: belum tersedia. Identitas mahasiswa, nilai individual, jawaban, dan isi umpan balik tidak disajikan.",
    9,
  );
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    // Footer is outside the content margin; it must not create overflow pages.
    const previousBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#637383")
      .text(
        `UAY | ${demo ? "Demo - data simulasi | " : ""}Data terakhir ${formatDate(s.snapshotAt)}`,
        42,
        doc.page.height - 40,
        { width: width - 60, lineBreak: false },
      );
    doc.text(
      `${i + 1}/${pages.count}`,
      doc.page.width - 85,
      doc.page.height - 40,
      { width: 43, align: "right", lineBreak: false },
    );
    doc.page.margins.bottom = previousBottomMargin;
  }
  doc.end();
  return completed;
}
