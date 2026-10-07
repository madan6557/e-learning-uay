import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  FixtureDataSource,
  SNAPSHOT_AT,
} from "../apps/api/src/rector/fixture.js";
import {
  activityMetrics,
  classDetail,
  gradingMetrics,
  lecturerDetail,
  lecturerRows,
  loginSessions,
  isAcademic,
  options,
  selectReport,
  summary,
} from "../apps/api/src/rector/reporting.js";
import { csvReport, pdfReport } from "../apps/api/src/rector/exports.js";
import {
  dailySessionSegments,
  dayWindow,
  sessionChartCalendar,
} from "../apps/web/src/rector/sessionTimeline.js";
import type {
  ReportingDataSource,
  ReportingSnapshot,
  ReportFilters,
} from "../packages/shared/src/rector.js";
const source = new FixtureDataSource();
// Existing fixture assertions use its original Jakarta calendar. Other device
// zones are tested in separate processes by rector-time-ui.test.ts.
process.env.TZ = "Asia/Jakarta";
const f: ReportFilters = {
  timeZone: "Asia/Jakarta",
  semester: "2026/2027 Ganjil",
  from: "2026-09-01",
  to: "2026-10-02",
};
test("fixture is deterministic, independent and contains all demonstration scenarios", async () => {
  const a = await source.readSnapshot(),
    b = await source.readSnapshot();
  assert.deepEqual(a, b);
  assert.equal(a.lecturers.length, 12);
  assert.equal(a.classes.length, 24);
  assert.equal(new Set(a.lecturers.map((l) => l.department)).size, 4);
  assert.equal(options(a).semesters.length, 2);
  assert.ok(a.classes.some((c) => c.status === "ARSIP"));
  assert.ok(a.classes.some((c) => c.instructorIds.length > 1));
  assert.ok(a.classes.some((c) => c.items.some((i) => !i.visible)));
  assert.ok(a.classes.some((c) => c.grading.some((w) => !w.current)));
  a.classes.pop();
  assert.equal((await source.readSnapshot()).classes.length, 24);
  for (const c of b.classes)
    for (const w of c.grading) {
      assert.ok(w.published <= w.graded && w.graded <= w.total);
      if (w.graded === 0) assert.equal(w.lastGradedAt, null);
      if (w.published === 0) assert.equal(w.lastPublishedAt, null);
    }
});
test("summary matches departmental totals, lecturer activity and daily evidence", async () => {
  const s = await source.readSnapshot(),
    result = summary(s, f),
    rows = lecturerRows(s, f);
  assert.equal(result.lecturerCount, 12);
  assert.equal(result.classCount, 12);
  assert.equal(result.loggedInLecturers, 10);
  assert.equal(result.academicallyActiveLecturers, 9);
  assert.equal(
    result.departments.reduce((n, d) => n + d.classes, 0),
    result.classCount,
  );
  assert.equal(
    result.departments.reduce((n, d) => n + d.pending, 0),
    result.grading.pending,
  );
  assert.equal(
    rows.reduce((n, l) => n + l.academicActions, 0),
    result.activity.academicActions,
  );
  assert.equal(
    result.daily.reduce((n, d) => n + d.academic, 0),
    result.activity.academicActions,
  );
  assert.ok(result.materialCount > 0);
  assert.equal(result.quizCount, 12);
});
test("shared classes attribute evidence to actual actors; class backlog is not duplicated in university totals", async () => {
  const s = await source.readSnapshot(),
    d = classDetail(s, f, "k1")!;
  assert.equal(d.contributions.length, 2);
  const own = d.activities.filter((a) => a.actorKind === "DOSEN");
  assert.equal(
    d.contributions.reduce((n, c) => n + c.metrics.academicActions, 0),
    activityMetrics(own).academicActions,
  );
  assert.ok(d.activities.some((a) => a.actorKind === "ADMIN"));
  assert.ok(d.activities.some((a) => a.actorKind === "SISTEM"));
  assert.ok(d.contributions[1].metrics.materialActions > 0);
  const rows = lecturerRows(s, { ...f, classId: "k1" });
  assert.equal(rows.length, 2);
  assert.equal(
    summary(s, { ...f, classId: "k1" }).grading.pending,
    d.grading.pending,
  );
  assert.equal(
    rows.reduce((n, r) => n + r.pending, 0),
    d.grading.pending * 2,
  );
});
test("actions and unique objects, login-only, inactive and unassigned lecturers stay distinct", async () => {
  const s = await source.readSnapshot(),
    r = lecturerRows(s, f);
  assert.ok(
    r.find((l) => l.id === "d1")!.materialActions >
      r.find((l) => l.id === "d1")!.materialObjects,
  );
  const loginOnly = r.find((l) => l.id === "d11")!;
  assert.equal(loginOnly.logins, 1);
  assert.equal(loginOnly.academicActions, 0);
  assert.equal(r.find((l) => l.id === "d10")!.academicActions, 0);
  assert.equal(r.find((l) => l.id === "d10")!.lastLoginAt, null);
  assert.equal(r.find((l) => l.id === "d12")!.classCount, 0);
});
test("snapshot metrics ignore activity dates; semester, department, lecturer and class constrain scope", async () => {
  const s = await source.readSnapshot();
  const noEvents = summary(s, { ...f, from: "2026-10-01", to: "2026-10-02" });
  assert.equal(noEvents.activity.academicActions, 0);
  assert.equal(noEvents.classCount, 12);
  assert.equal(noEvents.grading.pending, summary(s, f).grading.pending);
  const prodi = selectReport(s, { ...f, department: "Teknik Sipil" });
  assert.ok(prodi.classes.every((c) => c.department === "Teknik Sipil"));
  assert.ok(prodi.activities.every((a) => a.department === "Teknik Sipil"));
  const earlier = summary(s, {
    semester: "2025/2026 Genap",
    from: "2026-03-01",
    to: "2026-03-31",
  });
  assert.equal(earlier.classCount, 12);
  assert.equal(earlier.grading.pending, 0);
  assert.ok(earlier.activity.academicActions > 0);
  assert.equal(lecturerDetail(s, f, "d12")!.classes.length, 0);
  assert.equal(classDetail(s, { ...f, department: "Akuntansi" }, "k1"), null);
  assert.equal(
    lecturerRows(s, { ...f, search: "Tidak ada nama ini" }).length,
    0,
  );
});
test("latest submissions exclude superseded work and automatic grading has its own total", async () => {
  const s = await source.readSnapshot(),
    c = s.classes[0],
    g = gradingMetrics([c], s.snapshotAt);
  const manual = c.grading.filter(
    (w) => w.current && w.kind !== "KUIS_OTOMATIS",
  );
  assert.equal(
    g.total,
    manual.reduce((n, w) => n + w.total, 0),
  );
  assert.equal(
    g.pending,
    manual.reduce((n, w) => n + w.total - w.graded, 0),
  );
  assert.equal(g.automaticGraded, 20);
  assert.equal(g.oldestPendingDays, 10);
  assert.equal(gradingMetrics([], s.snapshotAt).percentage, null);
  assert.equal(gradingMetrics([], s.snapshotAt).oldestPendingDays, null);
});
test("dates use the requested timezone for filtering, daily totals and active days", async () => {
  const s = await source.readSnapshot();
  const template = s.activities.find((a) => a.category === "LOGIN")!;
  s.activities = [
    { ...template, category: "MATERI", id: "boundary-1", at: "2026-09-30T15:59:59.000Z" },
    { ...template, category: "MATERI", id: "boundary-2", at: "2026-09-30T16:00:00.000Z" },
    { ...template, category: "MATERI", id: "boundary-3", at: "2026-09-30T16:59:59.000Z" },
    { ...template, category: "MATERI", id: "boundary-4", at: "2026-09-30T17:00:00.000Z" },
  ];
  assert.equal(
    selectReport(s, { ...f, from: "2026-09-30", to: "2026-09-30" }).activities
      .length,
    3,
  );
  assert.equal(
    selectReport(s, { ...f, from: "2026-10-01", to: "2026-10-01" }).activities
      .length,
    1,
  );
  const localFilters = { ...f, timeZone: "Asia/Makassar", from: "2026-10-01", to: "2026-10-01" };
  const local = summary(s, localFilters);
  assert.equal(local.activity.academicActions, 3);
  assert.equal(local.daily[0].date, "2026-10-01");
  assert.equal(local.daily[0].academic, 3);
  assert.equal(lecturerDetail(s, localFilters, template.actorId)!.activities.length, 3);
  const csv = csvReport(s, localFilters, "activities");
  assert.ok(csv.includes("Asia/Makassar"));
  assert.ok(csv.includes("00.00 GMT+8"));
  assert.ok(!csv.includes("30 Sep 2026"));
  assert.equal(activityMetrics(s.activities.slice(0, 2), "Asia/Jakarta").activeDays, 1);
  assert.equal(activityMetrics(s.activities.slice(0, 2), "Asia/Makassar").activeDays, 2);
  s.snapshotAt = "2026-09-30T16:30:00.000Z";
  assert.equal(options(s, "Asia/Jakarta").defaultFilters.to, "2026-09-30");
  assert.equal(options(s, "Asia/Makassar").defaultFilters.to, "2026-10-01");
  assert.equal(options(s, "Asia/Makassar").defaultFilters.from, "2026-09-01");
});
test("exports contain all matching rows without student content; chronology filters also affect exports", async () => {
  const s = await source.readSnapshot();
  const csv = csvReport(s, { ...f, department: "Akuntansi" }, "lecturers");
  assert.ok(csv.includes("Dr. Gita Larasati"));
  assert.ok(!csv.includes("Dr. Aruna Prameswari"));
  assert.ok(csv.includes("Demo - data simulasi"));
  assert.ok(csv.includes("Data terakhir"));
  assert.ok(csv.includes("GMT+7"));
  assert.ok(!csv.includes("WIB"));
  const events = csvReport(s, { ...f, actorKind: "SISTEM" }, "activities");
  assert.ok(events.includes("Penilaian otomatis"));
  assert.ok(!events.includes("Login berhasil"));
  const altered = structuredClone(s);
  altered.lecturers[0].name = "=DANGEROUS()";
  assert.ok(csvReport(altered, f, "lecturers").includes("'=DANGEROUS()"));
});
test("PDF reports generate complete valid files for overview, lecturer and class", async () => {
  const s = await source.readSnapshot();
  for (const [view, id, session] of [
    ["overview", undefined, undefined],
    ["lecturer", "d1", undefined],
    ["class", "k1", undefined],
    ["lecturer", "d1", "session-d1-2026-09-06"],
    ["lecturer", "d3", "session-d3-2026-09-27"],
  ] as const) {
    const pdf = await pdfReport(
      s,
      view === "lecturer"
        ? { ...f, lecturer: id }
        : view === "class"
          ? { ...f, classId: id }
          : f,
      view,
      id,
      session,
    );
    assert.ok(pdf.toString("ascii", 0, 8).startsWith("%PDF-"));
    assert.ok(pdf.length > 4000);
    assert.ok(pdf.toString("ascii").includes("%%EOF"));
    const pages =
      pdf.toString("ascii").match(/\/Type\s*\/Page\b/g)?.length ?? 0;
    assert.ok(
      pages > 0 && pages <= 6,
      "Report must not add empty overflow pages",
    );
  }
});
test("connection spans and action intervals use explicit recorded events, without crediting logout as academic work", async () => {
  const s = await source.readSnapshot();
  for (const session of s.sessions) {
    const events = s.activities.filter((a) => a.sessionId === session.id);
    assert.equal(events.filter((a) => a.category === "LOGIN").length, 1);
    assert.equal(
      events.find((a) => a.category === "LOGIN")!.at,
      session.loginAt,
    );
    assert.ok(events.every((a) => a.actorId === session.lecturerId));
    if (session.logoutAt) {
      assert.equal(
        events.find((a) => a.category === "LOGOUT")!.at,
        session.logoutAt,
      );
      assert.ok(Date.parse(session.logoutAt) > Date.parse(session.loginAt));
    } else
      assert.equal(events.filter((a) => a.category === "LOGOUT").length, 0);
    for (const a of events) {
      assert.ok(Date.parse(a.at) >= Date.parse(session.loginAt));
      if (a.completedAt) {
        assert.ok(Date.parse(a.completedAt) >= Date.parse(a.at));
        if (session.logoutAt)
          assert.ok(Date.parse(a.completedAt) <= Date.parse(session.logoutAt));
      }
      if (a.category === "LOGOUT") assert.equal(isAcademic(a), false);
    }
  }
  const withoutLogout = {
    ...s,
    activities: s.activities.filter((a) => a.category !== "LOGOUT"),
  };
  assert.deepEqual(summary(s, f).activity, summary(withoutLogout, f).activity);
  assert.deepEqual(summary(s, f).daily, summary(withoutLogout, f).daily);
  assert.equal(summary(s, f).sessions.length, summary(s, f).activity.logins);
});
test("session filtering includes midnight overlaps, retains unknown logout, and supports empty and lecturer scopes", async () => {
  const s = await source.readSnapshot();
  const overnight = s.sessions.find(
    (session) => session.id === "session-d5-2026-09-23",
  )!;
  assert.ok(overnight.loginAt < "2026-09-22T17:00:00.000Z");
  assert.ok(overnight.logoutAt! > "2026-09-22T17:00:00.000Z");
  for (const day of ["2026-09-22", "2026-09-23"])
    assert.ok(
      loginSessions(s, { ...f, from: day, to: day }).some(
        (session) => session.id === overnight.id,
      ),
    );
  const unknown = lecturerDetail(s, f, "d3")!.sessions.find(
    (session) => !session.logoutAt,
  )!;
  assert.equal(unknown.endReason, "UNKNOWN");
  assert.equal(unknown.logoutAt, null);
  const selected = loginSessions(s, { ...f, lecturer: "d1" });
  assert.ok(selected.every((session) => session.lecturerId === "d1"));
  assert.ok(
    loginSessions(s, { ...f, department: "Akuntansi" }).every(
      (session) => session.department === "Akuntansi",
    ),
  );
  assert.deepEqual(loginSessions(s, { ...f, lecturer: "d12" }), []);
  assert.deepEqual(loginSessions(s, { ...f, actorKind: "ADMIN" }), []);
  assert.equal(loginSessions(s, { ...f, sessionId: overnight.id }).length, 1);
  const overlapping = structuredClone(overnight);
  overlapping.id = "second-session";
  s.sessions.push(overlapping);
  assert.equal(
    loginSessions(s, {
      ...f,
      lecturer: "d5",
      from: "2026-09-23",
      to: "2026-09-23",
    }).length,
    2,
  );
});
test("daily session chart covers the device's full day, including afternoon and evening connections", async () => {
  const s = await source.readSnapshot();
  const window = dayWindow("2026-09-23");
  assert.equal(
    new Date(window.start).toISOString(),
    "2026-09-22T17:00:00.000Z",
  );
  assert.equal(new Date(window.end).toISOString(), "2026-09-23T17:00:00.000Z");
  assert.equal(window.end - window.start, 24 * 3600000);
  const sample = s.sessions[0];
  const sessions = [
    {
      ...sample,
      id: "afternoon",
      loginAt: "2026-09-23T14:10:00+07:00",
      logoutAt: "2026-09-23T15:00:00+07:00",
    },
    {
      ...sample,
      id: "evening",
      loginAt: "2026-09-23T21:00:00+07:00",
      logoutAt: "2026-09-23T23:50:00+07:00",
    },
  ];
  const segments = dailySessionSegments(sessions, "2026-09-23");
  assert.equal(segments.length, 2);
  assert.equal(
    Date.parse(segments[0].at) - window.start,
    (14 * 60 + 10) * 60000,
  );
  assert.equal(
    Date.parse(segments[1].until!) - window.start,
    (23 * 60 + 50) * 60000,
  );
  const empty = sessionChartCalendar([], "2026-10-01", "2026-10-02");
  assert.deepEqual(empty.days, ["2026-10-02", "2026-10-01"]);
  assert.equal(empty.defaultDay, "2026-10-02");
  assert.deepEqual(dailySessionSegments([], empty.defaultDay), []);
});
test("daily chart splits overnight and multi-day sessions without losing time or altering login/logout evidence", async () => {
  const s = await source.readSnapshot();
  const overnight = s.sessions.find(
    (session) => session.id === "session-d5-2026-09-23",
  )!;
  const before = structuredClone(overnight);
  const first = dailySessionSegments([overnight], "2026-09-22")[0];
  const second = dailySessionSegments([overnight], "2026-09-23")[0];
  assert.equal(Date.parse(first.until!) - Date.parse(first.at), 5 * 60000);
  assert.equal(Date.parse(second.until!) - Date.parse(second.at), 10 * 60000);
  assert.equal(first.continuesAfterDay, true);
  assert.equal(first.endsAtDayBoundary, true);
  assert.equal(second.startsBeforeDay, true);
  assert.equal(second.continuesAfterDay, false);
  assert.deepEqual(overnight, before);
  const calendar = sessionChartCalendar(
    [overnight],
    "2026-09-23",
    "2026-09-24",
  );
  assert.deepEqual(calendar.days, ["2026-09-24", "2026-09-23"]);
  assert.equal(calendar.defaultDay, "2026-09-23");
  const multi = {
    ...overnight,
    loginAt: "2026-09-22T23:00:00+07:00",
    logoutAt: "2026-09-24T01:00:00+07:00",
  };
  const spans = ["2026-09-22", "2026-09-23", "2026-09-24"].flatMap((day) =>
    dailySessionSegments([multi], day),
  );
  assert.equal(
    spans.reduce(
      (n, span) => n + Date.parse(span.until!) - Date.parse(span.at),
      0,
    ),
    26 * 3600000,
  );
  assert.equal(dailySessionSegments([multi], "2026-09-25").length, 0);
});
test("daily chart handles exact midnight, unknown logout, and point events without invented continuation", async () => {
  const s = await source.readSnapshot(),
    sample = s.sessions[0];
  const midnight = {
    ...sample,
    loginAt: "2026-09-22T23:00:00+07:00",
    logoutAt: "2026-09-23T00:00:00+07:00",
  };
  assert.equal(
    dailySessionSegments([midnight], "2026-09-22")[0].endsAtDayBoundary,
    true,
  );
  assert.equal(
    dailySessionSegments([midnight], "2026-09-22")[0].continuesAfterDay,
    false,
  );
  assert.equal(dailySessionSegments([midnight], "2026-09-23").length, 0);
  const unknown = {
    ...sample,
    loginAt: "2026-09-22T23:55:00+07:00",
    logoutAt: null,
    lastObservedAt: "2026-09-23T00:00:00+07:00",
    endReason: "UNKNOWN" as const,
  };
  const point = dailySessionSegments([unknown], "2026-09-23")[0];
  assert.equal(point.until, null);
  assert.equal(point.startsBeforeDay, true);
  assert.equal(point.session.logoutAt, null);
  assert.equal(dailySessionSegments([unknown], "2026-09-24").length, 0);
  const loginOnly = { ...unknown, loginAt: "2026-09-23T00:00:00+07:00" };
  assert.equal(dailySessionSegments([loginOnly], "2026-09-23")[0].until, null);
  assert.equal(
    dailySessionSegments(
      [
        {
          ...sample,
          loginAt: "2026-09-23T12:00:00+07:00",
          logoutAt: "2026-09-23T11:00:00+07:00",
        },
      ],
      "2026-09-23",
    ).length,
    0,
  );
});

