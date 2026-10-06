import type {
  Activity,
  LoginSession,
  ReportingClass,
  ReportingDataSource,
  ReportingSnapshot,
} from "../../../../packages/shared/src/rector.js";
export const SNAPSHOT_AT = "2026-10-02T02:00:00.000Z";
const names = [
  "Dr. Aruna Prameswari",
  "Bagas Mahendra, M.Kom.",
  "Citra Adinata, M.Kom.",
  "Dr. Damar Wicaksana",
  "Elina Paramitha, M.T.",
  "Farhan Kusuma, M.T.",
  "Dr. Gita Larasati",
  "Hadi Suryatama, M.Ak.",
  "Intan Kirana, M.Ak.",
  "Dr. Jati Nugraha",
  "Kirana Wulandari, M.M.",
  "Laksana Pradipta, M.M.",
];
const departments = ["Informatika", "Teknik Sipil", "Akuntansi", "Manajemen"];
const titles = [
  "Pemrograman Web",
  "Basis Data",
  "Rekayasa Perangkat Lunak",
  "Mekanika Teknik",
  "Struktur Beton",
  "Manajemen Konstruksi",
  "Akuntansi Keuangan",
  "Audit dan Assurance",
  "Sistem Informasi Akuntansi",
  "Manajemen Strategis",
  "Perilaku Organisasi",
  "Pengantar Bisnis",
];
function createSnapshot(): ReportingSnapshot {
  const lecturers = names.map((name, i) => ({
    id: `d${i + 1}`,
    name,
    identifier: `DEMO-${String(i + 1).padStart(3, "0")}`,
    department: departments[Math.floor(i / 3)],
  }));
  const classes: ReportingClass[] = [];
  const activities: Activity[] = [];
  const event = (data: Omit<Activity, "id">) =>
    activities.push({
      id: `e${String(activities.length + 1).padStart(5, "0")}`,
      ...data,
    });
  for (let term = 0; term < 2; term++) {
    const semester = term === 0 ? "2026/2027 Ganjil" : "2025/2026 Genap";
    const at = (day: number, hour = 2) =>
      `${term === 0 ? "2026-09" : "2026-03"}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`;
    for (let i = 0; i < 12; i++) {
      const owner = i === 11 ? lecturers[0] : lecturers[i];
      const id = `k${term * 12 + i + 1}`;
      const shared = i === 0 || i === 3 || i === 6;
      const cls: ReportingClass = {
        id,
        title: i === 11 ? "Praktikum Pemrograman Web" : titles[i],
        courseCode:
          i === 11
            ? "IF222"
            : `${["IF", "TS", "AK", "MN"][Math.floor(i / 3)]}${210 + i}`,
        department: owner.department,
        semester,
        status: term === 0 ? "AKTIF" : "ARSIP",
        instructorIds: shared ? [owner.id, lecturers[i + 1].id] : [owner.id],
        items: [],
        grading: [],
      };
      for (let j = 0; j < 4; j++) {
        cls.items.push({
          id: `${id}-p${j}`,
          title: `Pertemuan ${j + 1}: ${["Orientasi dan konsep dasar", "Studi kasus", "Praktik terarah", "Evaluasi pembelajaran"][j]}`,
          kind: "PERTEMUAN",
          visible: j !== 3,
          status: j === 3 ? "DRAF" : "TERBIT",
        });
        cls.items.push({
          id: `${id}-m${j}`,
          title: `Materi ${j + 1} — ${cls.title}`,
          kind: "MATERI",
          visible: j !== 3,
          status: j === 3 ? "DRAF" : "TERBIT",
        });
      }
      cls.items.push(
        {
          id: `${id}-bank`,
          title: "Bank soal semester",
          kind: "BANK_SOAL",
          visible: true,
          status: "TERBIT",
          questionCount: 12 + i,
        },
        {
          id: `${id}-tugas`,
          title: "Tugas studi kasus",
          kind: "TUGAS",
          visible: true,
          status: "TERBIT",
        },
        {
          id: `${id}-kuis`,
          title: "Kuis pemahaman konsep",
          kind: "KUIS",
          visible: true,
          status: "TERBIT",
        },
        {
          id: `${id}-ann`,
          title: "Petunjuk evaluasi pembelajaran",
          kind: "PENGUMUMAN",
          visible: true,
          status: "TERBIT",
        },
      );
      if (i !== 10) {
        const total = 20 + i;
        const graded = term === 1 ? total : Math.max(0, total - (i % 4) * 4);
        const published =
          term === 1 ? graded : i % 3 === 0 ? graded : Math.max(0, graded - 5);
        cls.grading.push(
          {
            id: `${id}-tugas-v2`,
            title: "Tugas studi kasus — kiriman berlaku",
            kind: "TUGAS",
            current: true,
            total,
            graded,
            published,
            pendingSince: graded < total ? at(20) : null,
            lastGradedAt: graded ? at(26) : null,
            lastPublishedAt: published ? at(27) : null,
          },
          {
            id: `${id}-tugas-v1`,
            title: "Kiriman lama yang digantikan",
            kind: "TUGAS",
            current: false,
            total: 3,
            graded: 0,
            published: 0,
            pendingSince: at(18),
            lastGradedAt: null,
            lastPublishedAt: null,
          },
          {
            id: `${id}-manual`,
            title: "Uraian kuis",
            kind: "KUIS_MANUAL",
            current: true,
            total: 12,
            graded: term === 1 ? 12 : 8,
            published: term === 1 ? 12 : 4,
            pendingSince: term === 1 ? null : at(22),
            lastGradedAt: at(26),
            lastPublishedAt: at(27),
          },
          {
            id: `${id}-auto`,
            title: "Jawaban objektif kuis",
            kind: "KUIS_OTOMATIS",
            current: true,
            total,
            graded: total,
            published: total,
            pendingSince: null,
            lastGradedAt: at(22),
            lastPublishedAt: at(22),
          },
          {
            id: `${id}-final`,
            title: "Nilai akhir kelas",
            kind: "NILAI_AKHIR",
            current: true,
            total,
            graded: term === 1 ? total : i % 2 === 0 ? total : 0,
            published: term === 1 ? total : i % 3 === 0 ? total : 0,
            pendingSince: term === 0 && i % 2 !== 0 ? at(28) : null,
            lastGradedAt: term === 1 || i % 2 === 0 ? at(28) : null,
            lastPublishedAt: term === 1 || i % 3 === 0 ? at(29) : null,
          },
        );
        // A publication cannot exist before grading, including the odd-index final records.
        const final = cls.grading.at(-1)!;
        final.published = Math.min(final.published, final.graded);
        if (!final.published) final.lastPublishedAt = null;
      }
      classes.push(cls);
      const emit = (
        category: Activity["category"],
        action: string,
        objectId: string,
        objectName: string,
        day: number,
        actor = owner.id,
        kind: Activity["actorKind"] = "DOSEN",
      ) =>
        event({
          at: at(day),
          actorId: actor,
          actorName:
            kind === "ADMIN"
              ? "Admin akademik demo"
              : kind === "SISTEM"
                ? "Penilaian otomatis"
                : lecturers.find((l) => l.id === actor)!.name,
          actorKind: kind,
          category,
          action,
          objectId,
          objectName,
          classId: id,
          semester,
          department: cls.department,
        });
      emit(
        "KELAS",
        "Penugasan pengampu",
        id,
        cls.title,
        1,
        "admin-demo",
        "ADMIN",
      );
      if (i < 9 || i === 11) {
        emit("AKSES", "Membuka kelas", id, cls.title, 5);
        cls.items.forEach((item, j) =>
          emit(
            item.kind === "MATERI"
              ? "MATERI"
              : item.kind === "TUGAS" ||
                  item.kind === "KUIS" ||
                  item.kind === "BANK_SOAL"
                ? "ASESMEN"
                : item.kind === "PENGUMUMAN"
                  ? "PENGUMUMAN"
                  : "KELAS",
            "Membuat " + item.kind.toLowerCase().replace("_", " "),
            item.id,
            item.title,
            6,
          ),
        );
        for (let n = 0; n < 5; n++)
          emit(
            "MATERI",
            "Memperbarui materi",
            `${id}-m0`,
            cls.items[1].title,
            19 + n,
            shared && n % 2 === 1 ? cls.instructorIds[1] : owner.id,
          );
        emit(
          "PENILAIAN",
          "Menginput nilai tugas",
          `${id}-tugas`,
          "Tugas studi kasus",
          26,
        );
        emit(
          "PENILAIAN",
          "Menilai uraian kuis",
          `${id}-manual`,
          "Uraian kuis",
          26,
          shared ? cls.instructorIds[1] : owner.id,
        );
        emit(
          "PUBLIKASI",
          "Menerbitkan nilai tugas",
          `${id}-tugas`,
          "Tugas studi kasus",
          27,
        );
        if (cls.grading.at(-1)!.graded)
          emit(
            "PENILAIAN",
            "Menyimpan draf nilai akhir",
            `${id}-final`,
            "Nilai akhir kelas",
            28,
          );
        if (cls.grading.at(-1)!.published)
          emit(
            "PUBLIKASI",
            "Menerbitkan nilai akhir",
            `${id}-final`,
            "Nilai akhir kelas",
            29,
          );
        if (i === 0 || i === 6)
          emit(
            "KOREKSI",
            "Mengoreksi nilai yang terbit",
            `${id}-tugas`,
            "Tugas studi kasus",
            30,
          );
      }
      if (i === 9) {
        emit(
          "PENILAIAN",
          "Menginput nilai tugas",
          `${id}-tugas`,
          "Tugas studi kasus",
          26,
          "admin-demo",
          "ADMIN",
        );
        emit(
          "PUBLIKASI",
          "Menerbitkan nilai tugas",
          `${id}-tugas`,
          "Tugas studi kasus",
          27,
          "admin-demo",
          "ADMIN",
        );
      }
      if (cls.grading.length)
        emit(
          "PENILAIAN",
          "Menilai jawaban objektif otomatis",
          `${id}-auto`,
          "Jawaban objektif kuis",
          22,
          "system-demo",
          "SISTEM",
        );
    }
    lecturers.forEach((l, i) => {
      if (i < 9 || i === 10)
        for (let n = 0; n < (i === 10 ? 1 : 3); n++)
          event({
            at: at(5 + n * 9, 1),
            actorId: l.id,
            actorName: l.name,
            actorKind: "DOSEN",
            category: "LOGIN",
            action: "Login berhasil",
            objectId: l.id,
            objectName: "E-learning UAY",
            classId: null,
            semester: null,
            department: l.department,
          });
    });
  }
  // Explicit, deterministic simulated connection and action intervals. Real
  // adapters must supply recorded times; reporting never infers a logout.
  const sessions: LoginSession[] = [];
  const groups = new Map<string, Activity[]>();
  for (const a of activities.filter((a) => a.actorKind === "DOSEN")) {
    const key = `${a.actorId}:${a.at.slice(0, 10)}`;
    const group = groups.get(key) ?? [];
    group.push(a);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const actor = lecturers.find((l) => l.id === group[0].actorId)!;
    const existingLogin = group.find((a) => a.category === "LOGIN");
    const day = group[0].at.slice(0, 10);
    let start = Date.parse(existingLogin?.at ?? `${day}T01:55:00.000Z`);
    // One session crosses midnight WIB to exercise date clipping.
    if (actor.id === "d5" && day === "2026-09-23")
      start = Date.parse("2026-09-22T16:55:00.000Z");
    const id = `session-${actor.id}-${day}`;
    const iso = (time: number) => new Date(time).toISOString();
    const academic = group.filter((a) => a.category !== "LOGIN");
    let cursor = start + 5 * 60000;
    for (const [i, a] of academic.entries()) {
      a.at = iso(cursor);
      a.completedAt = iso(cursor + (2 + (i % 4)) * 60000);
      a.sessionId = id;
      cursor = Date.parse(a.completedAt) + 3 * 60000;
    }
    const loginData = {
      at: iso(start),
      actorId: actor.id,
      actorName: actor.name,
      actorKind: "DOSEN" as const,
      category: "LOGIN" as const,
      action: "Masuk ke e-learning",
      objectId: actor.id,
      objectName: "E-learning UAY",
      classId: null,
      semester: null,
      department: actor.department,
      sessionId: id,
      completedAt: null,
    };
    if (existingLogin) Object.assign(existingLogin, loginData);
    else event(loginData);
    const missingLogout = actor.id === "d3" && day === "2026-09-27";
    const logoutAt = missingLogout ? null : iso(cursor + 5 * 60000);
    sessions.push({
      id,
      lecturerId: actor.id,
      lecturerName: actor.name,
      department: actor.department,
      semester: day.includes("-09-") ? "2026/2027 Ganjil" : "2025/2026 Genap",
      loginAt: iso(start),
      logoutAt,
      lastObservedAt: academic.at(-1)?.completedAt ?? iso(start),
      endReason: missingLogout ? "UNKNOWN" : "LOGOUT",
    });
    if (logoutAt)
      event({
        ...loginData,
        at: logoutAt,
        category: "LOGOUT",
        action: "Keluar dari e-learning",
      });
  }
  return { snapshotAt: SNAPSHOT_AT, lecturers, classes, activities, sessions };
}
export class FixtureDataSource implements ReportingDataSource {
  private readonly snapshot = createSnapshot();
  async readSnapshot() {
    return structuredClone(this.snapshot);
  }
}
