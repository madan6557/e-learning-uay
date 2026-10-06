import type {
  Activity,
  ActivityMetrics,
  ClassDetail,
  FilterOptions,
  GradingMetrics,
  LecturerDetail,
  LecturerRow,
  ReportingClass,
  ReportingSnapshot,
  ReportFilters,
  Summary,
} from "../../../../packages/shared/src/rector.js";
export const isAcademic = (a: Activity) =>
  !["LOGIN", "LOGOUT", "AKSES"].includes(a.category);
const last = (events: Activity[]) =>
  events.reduce<string | null>((v, a) => (!v || a.at > v ? a.at : v), null);
export function activityMetrics(events: Activity[]): ActivityMetrics {
  const own = events.filter((a) => a.actorKind === "DOSEN");
  const academic = own.filter(isAcademic);
  const material = academic.filter((a) => a.category === "MATERI");
  const assessment = academic.filter((a) => a.category === "ASESMEN");
  return {
    logins: own.filter((a) => a.category === "LOGIN").length,
    accesses: own.filter((a) => a.category === "AKSES").length,
    academicActions: academic.length,
    activeDays: new Set(
      academic.map((a) =>
        new Date(new Date(a.at).getTime() + 7 * 3600000)
          .toISOString()
          .slice(0, 10),
      ),
    ).size,
    materialActions: material.length,
    materialObjects: new Set(material.map((a) => a.objectId)).size,
    assessmentActions: assessment.length,
    assessmentObjects: new Set(assessment.map((a) => a.objectId)).size,
    gradingActions: academic.filter((a) => a.category === "PENILAIAN").length,
    publicationActions: academic.filter((a) => a.category === "PUBLIKASI")
      .length,
    correctionActions: academic.filter((a) => a.category === "KOREKSI").length,
    lastLoginAt: last(own.filter((a) => a.category === "LOGIN")),
    lastAcademicAt: last(academic),
  };
}
export function gradingMetrics(
  classes: ReportingClass[],
  snapshotAt: string,
): GradingMetrics {
  const current = classes.flatMap((c) => c.grading).filter((w) => w.current);
  const manual = current.filter((w) => w.kind !== "KUIS_OTOMATIS");
  const sum = (key: "total" | "graded" | "published") =>
    manual.reduce((n, w) => n + w[key], 0);
  const pending = manual.filter((w) => w.total > w.graded && w.pendingSince);
  return {
    total: sum("total"),
    graded: sum("graded"),
    pending: sum("total") - sum("graded"),
    published: sum("published"),
    percentage: sum("total")
      ? Math.round((sum("published") / sum("total")) * 100)
      : null,
    oldestPendingDays: pending.length
      ? Math.max(
          ...pending.map((w) =>
            Math.max(
              0,
              Math.floor(
                (Date.parse(snapshotAt) - Date.parse(w.pendingSince!)) /
                  86400000,
              ),
            ),
          ),
        )
      : null,
    automaticGraded: current
      .filter((w) => w.kind === "KUIS_OTOMATIS")
      .reduce((n, w) => n + w.graded, 0),
  };
}
export function selectReport(s: ReportingSnapshot, f: ReportFilters) {
  const classes = s.classes.filter(
    (c) =>
      (!f.semester || c.semester === f.semester) &&
      (!f.department || c.department === f.department) &&
      (!f.classId || c.id === f.classId) &&
      (!f.lecturer || c.instructorIds.includes(f.lecturer)),
  );
  const classIds = new Set(classes.map((c) => c.id));
  const lecturers = s.lecturers.filter(
    (l) =>
      (!f.department || l.department === f.department) &&
      (!f.lecturer || l.id === f.lecturer) &&
      (!f.classId || classes.some((c) => c.instructorIds.includes(l.id))) &&
      (!f.search ||
        `${l.name} ${l.identifier}`
          .toLocaleLowerCase("id")
          .includes(f.search.toLocaleLowerCase("id"))),
  );
  const lecturerIds = new Set(lecturers.map((l) => l.id));
  const from = f.from ? Date.parse(`${f.from}T00:00:00+07:00`) : -Infinity;
  const to = f.to ? Date.parse(`${f.to}T23:59:59.999+07:00`) : Infinity;
  const activities = s.activities.filter(
    (a) =>
      Date.parse(a.at) >= from &&
      Date.parse(a.at) <= to &&
      (!f.category || a.category === f.category) &&
      (!f.actorKind || a.actorKind === f.actorKind) &&
      (!f.sessionId || a.sessionId === f.sessionId) &&
      (a.actorKind === "DOSEN"
        ? lecturerIds.has(a.actorId)
        : !f.lecturer && !f.search) &&
      (a.classId ? classIds.has(a.classId) : lecturerIds.has(a.actorId)),
  );
  return {
    classes: f.search
      ? classes.filter((c) => c.instructorIds.some((id) => lecturerIds.has(id)))
      : classes,
    lecturers,
    activities,
  };
}
export function loginSessions(s: ReportingSnapshot, f: ReportFilters) {
  const selected = selectReport(s, f);
  const lecturerIds = new Set(selected.lecturers.map((l) => l.id));
  const from = f.from ? Date.parse(`${f.from}T00:00:00+07:00`) : -Infinity;
  const to = f.to ? Date.parse(`${f.to}T23:59:59.999+07:00`) : Infinity;
  // Sessions are user-level connection evidence, like login events. Class
  // and semester filters restrict lecturer scope, never invent a class login.
  return s.sessions
    .filter(
      (session) =>
        lecturerIds.has(session.lecturerId) &&
        (!f.sessionId || session.id === f.sessionId) &&
        (!f.actorKind || f.actorKind === "DOSEN") &&
        Date.parse(session.loginAt) <= to &&
        Date.parse(session.logoutAt ?? session.lastObservedAt) >= from,
    )
    .sort((a, b) => b.loginAt.localeCompare(a.loginAt));
}
export function lecturerRows(
  s: ReportingSnapshot,
  f: ReportFilters,
): LecturerRow[] {
  const selected = selectReport(s, f);
  return selected.lecturers.map((l) => {
    const classes = selected.classes.filter((c) =>
      c.instructorIds.includes(l.id),
    );
    return {
      ...l,
      ...activityMetrics(selected.activities.filter((a) => a.actorId === l.id)),
      classCount: classes.length,
      pending: gradingMetrics(classes, s.snapshotAt).pending,
    };
  });
}
export function summary(s: ReportingSnapshot, f: ReportFilters): Summary {
  const { classes, lecturers, activities } = selectReport(s, f);
  const own = activities.filter((a) => a.actorKind === "DOSEN");
  const daily = new Map<
    string,
    { date: string; academic: number; login: number; access: number }
  >();
  const from = f.from ?? "2026-09-01";
  const to = f.to ?? s.snapshotAt.slice(0, 10);
  // Range validation bounds this loop to at most 731 days.
  for (
    let d = Date.parse(from + "T00:00:00Z");
    d <= Date.parse(to + "T00:00:00Z");
    d += 86400000
  ) {
    const date = new Date(d).toISOString().slice(0, 10);
    daily.set(date, { date, academic: 0, login: 0, access: 0 });
  }
  for (const a of own) {
    if (a.category === "LOGOUT") continue;
    const date = new Date(Date.parse(a.at) + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
    const row = daily.get(date) ?? { date, academic: 0, login: 0, access: 0 };
    row[
      a.category === "LOGIN"
        ? "login"
        : a.category === "AKSES"
          ? "access"
          : "academic"
    ]++;
    daily.set(date, row);
  }
  const items = classes.flatMap((c) => c.items);
  return {
    lecturerCount: lecturers.length,
    classCount: classes.length,
    loggedInLecturers: new Set(
      own.filter((a) => a.category === "LOGIN").map((a) => a.actorId),
    ).size,
    academicallyActiveLecturers: new Set(
      own.filter(isAcademic).map((a) => a.actorId),
    ).size,
    materialCount: items.filter(
      (i) => i.kind === "MATERI" && i.visible && i.status === "TERBIT",
    ).length,
    assignmentCount: items.filter((i) => i.kind === "TUGAS").length,
    quizCount: items.filter((i) => i.kind === "KUIS").length,
    activity: activityMetrics(activities),
    grading: gradingMetrics(classes, s.snapshotAt),
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
    sessions: loginSessions(s, f),
    departments: [
      ...new Set([
        ...lecturers.map((l) => l.department),
        ...classes.map((c) => c.department),
      ]),
    ]
      .sort()
      .map((department) => ({
        department,
        lecturers: lecturers.filter((l) => l.department === department).length,
        classes: classes.filter((c) => c.department === department).length,
        academicActions: own.filter(
          (a) => a.department === department && isAcademic(a),
        ).length,
        pending: gradingMetrics(
          classes.filter((c) => c.department === department),
          s.snapshotAt,
        ).pending,
      })),
  };
}
export function options(s: ReportingSnapshot): FilterOptions {
  return {
    semesters: [...new Set(s.classes.map((c) => c.semester))].sort().reverse(),
    departments: [...new Set(s.lecturers.map((l) => l.department))].sort(),
    lecturers: s.lecturers,
    classes: s.classes.map(
      ({ id, title, semester, department, instructorIds }) => ({
        id,
        title,
        semester,
        department,
        instructorIds,
      }),
    ),
    defaultFilters: {
      semester:
        [...new Set(s.classes.map((c) => c.semester))].sort().reverse()[0] ??
        "all",
      from: new Date(
        Date.UTC(
          new Date(s.snapshotAt).getUTCFullYear(),
          new Date(s.snapshotAt).getUTCMonth() - 1,
          1,
        ),
      )
        .toISOString()
        .slice(0, 10),
      to: new Date(Date.parse(s.snapshotAt) + 7 * 3600000)
        .toISOString()
        .slice(0, 10),
    },
  };
}
export function lecturerDetail(
  s: ReportingSnapshot,
  f: ReportFilters,
  id: string,
): LecturerDetail | null {
  const row = lecturerRows(s, { ...f, lecturer: id }).find((l) => l.id === id);
  if (!row) return null;
  const selected = selectReport(s, { ...f, lecturer: id });
  return {
    lecturer: row,
    classes: selected.classes.map((c) => ({
      class: c,
      contribution: activityMetrics(
        selected.activities.filter(
          (a) => a.classId === c.id && a.actorId === id,
        ),
      ),
      grading: gradingMetrics([c], s.snapshotAt),
    })),
    activities: selected.activities.sort(
      (a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id),
    ),
    sessions: loginSessions(s, { ...f, lecturer: id }),
  };
}
export function classDetail(
  s: ReportingSnapshot,
  f: ReportFilters,
  id: string,
): ClassDetail | null {
  const selected = selectReport(s, { ...f, classId: id });
  const cls = selected.classes.find((c) => c.id === id);
  if (!cls) return null;
  const instructors = s.lecturers.filter((l) =>
    cls.instructorIds.includes(l.id),
  );
  return {
    class: cls,
    instructors,
    contributions: instructors
      .filter((l) => !f.lecturer || l.id === f.lecturer)
      .map((lecturer) => ({
        lecturer,
        metrics: activityMetrics(
          selected.activities.filter(
            (a) => a.actorId === lecturer.id && a.classId === id,
          ),
        ),
      })),
    grading: gradingMetrics([cls], s.snapshotAt),
    activities: selected.activities
      .filter((a) => a.classId === id)
      .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)),
  };
}
