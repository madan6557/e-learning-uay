import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  localTimeZone,
  calendarDate,
  formatClock,
} from "../../packages/shared/src/time.js";
import {
  dayWindow,
  dailySessionSegments,
  sessionChartCalendar,
} from "../../apps/web/src/rector/sessionTimeline.js";
import {
  ActivityWaterfall,
  SessionChart,
} from "../../apps/web/src/rector/ActivityWaterfall.js";
import { FixtureDataSource } from "../../apps/api/src/rector/fixture.js";
import { csvReport } from "../../apps/api/src/rector/exports.js";
import { summary } from "../../apps/api/src/rector/reporting.js";

Object.assign(globalThis, { React });
const expected: Record<
  string,
  { start: string; end: string; day: string; clock: string }
> = {
  "Asia/Jakarta": {
    start: "2026-09-22T17:00:00.000Z",
    end: "2026-09-23T17:00:00.000Z",
    day: "2026-09-22",
    clock: "23.30 GMT+7",
  },
  "Asia/Makassar": {
    start: "2026-09-22T16:00:00.000Z",
    end: "2026-09-23T16:00:00.000Z",
    day: "2026-09-23",
    clock: "00.30 GMT+8",
  },
  "Asia/Jayapura": {
    start: "2026-09-22T15:00:00.000Z",
    end: "2026-09-23T15:00:00.000Z",
    day: "2026-09-23",
    clock: "01.30 GMT+9",
  },
  UTC: {
    start: "2026-09-23T00:00:00.000Z",
    end: "2026-09-24T00:00:00.000Z",
    day: "2026-09-22",
    clock: "16.30 GMT",
  },
  "America/New_York": {
    start: "2026-09-23T04:00:00.000Z",
    end: "2026-09-24T04:00:00.000Z",
    day: "2026-09-22",
    clock: "12.30 GMT-4",
  },
};
const timeZone = localTimeZone();
const e = expected[timeZone];
assert.ok(e, timeZone);
const window = dayWindow("2026-09-23");
assert.equal(new Date(window.start).toISOString(), e.start);
assert.equal(new Date(window.end).toISOString(), e.end);
assert.equal(window.end - window.start, 24 * 3600000);
const instant = "2026-09-22T16:30:00.000Z";
assert.equal(calendarDate(instant), e.day);
// ICU versions label a zero UTC offset as either GMT or GMT+0.
// Both represent the same device-local clock and timezone.
assert.equal(formatClock(instant).replace(/\bGMT\+0\b/g, "GMT"), e.clock);
const snapshot = await new FixtureDataSource().readSnapshot();
const session = {
  ...snapshot.sessions[0],
  id: "local-session",
  loginAt: instant,
  logoutAt: "2026-09-22T17:00:00.000Z",
};
const event = {
  ...snapshot.activities[0],
  at: instant,
  category: "LOGIN" as const,
  actorKind: "DOSEN" as const,
  sessionId: session.id,
  actorId: session.lecturerId,
  classId: null,
};
snapshot.activities = [event];
snapshot.sessions = [session];
const filters = { timeZone, from: e.day, to: e.day };
const result = summary(snapshot, filters);
assert.equal(result.activity.logins, 1);
assert.equal(result.daily[0].date, e.day);
assert.equal(result.daily[0].login, 1);
assert.equal(dailySessionSegments([session], e.day).length, 1);
const csv = csvReport(snapshot, filters, "activities");
assert.ok(csv.includes(timeZone));
assert.ok(csv.includes(e.clock));
assert.ok(!csv.includes("WIB"));
const html = renderToStaticMarkup(
  React.createElement(ActivityWaterfall, {
    sessions: [session],
    events: [event],
    classes: [],
    selectedSession: session.id,
    onSession() {},
    onClass() {},
  }),
);
assert.ok(html.includes(e.clock));
assert.ok(html.includes("Waktu lokal"));
assert.ok(!html.includes("WIB"));
const chart = renderToStaticMarkup(
  React.createElement(SessionChart, {
    sessions: [session],
    from: e.day,
    to: e.day,
    onLecturer() {},
  }),
);
assert.ok(chart.includes("00.00–24.00"));
assert.ok(chart.includes("waktu lokal perangkat"));
assert.ok(!chart.includes("WIB"));
assert.deepEqual(sessionChartCalendar([], "2026-11-01", "2026-11-03").days, [
  "2026-11-03",
  "2026-11-02",
  "2026-11-01",
]);
if (timeZone === "America/New_York") {
  const spring = dayWindow("2026-03-08"),
    fall = dayWindow("2026-11-01");
  assert.equal(spring.end - spring.start, 23 * 3600000);
  assert.equal(fall.end - fall.start, 25 * 3600000);
  const dstSession = {
    ...session,
    loginAt: "2026-03-08T06:00:00.000Z",
    logoutAt: "2026-03-08T08:00:00.000Z",
  };
  const dstChart = renderToStaticMarkup(
    React.createElement(SessionChart, {
      sessions: [dstSession],
      from: "2026-03-08",
      to: "2026-03-08",
      onLecturer() {},
    }),
  );
  assert.ok(
    dstChart.includes(`left:${(5 / 23) * 100}%`),
    "06:00 tick must follow the clock change",
  );
}
console.log("local timestamps, midnight and report consistency verified");
