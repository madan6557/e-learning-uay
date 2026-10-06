import type { LoginSession } from "../../../../packages/shared/src/rector.js";

const DAY = 86400000;
const wibDay = (time: number) =>
  new Date(time + 7 * 3600000).toISOString().slice(0, 10);

export function dayWindow(day: string) {
  const start = Date.parse(`${day}T00:00:00+07:00`);
  return { start, end: start + DAY };
}

/** Clip connection evidence to one WIB day without changing recorded times. */
export function dailySessionSegments(sessions: LoginSession[], day: string) {
  const { start, end } = dayWindow(day);
  return sessions
    .flatMap((session) => {
      const login = Date.parse(session.loginAt);
      const lastKnown = Date.parse(session.logoutAt ?? session.lastObservedAt);
      if (
        !Number.isFinite(login) ||
        !Number.isFinite(lastKnown) ||
        lastKnown < login ||
        login >= end
      )
        return [];
      // Logout at exactly 00:00 closes the previous day's interval. An observed
      // timestamp without logout at 00:00 remains a point on the following day.
      if (
        lastKnown < start ||
        (lastKnown === start && session.logoutAt && login < start)
      )
        return [];
      const clippedStart = Math.max(login, start);
      const clippedEnd = Math.min(lastKnown, end);
      return [
        {
          session,
          at: new Date(clippedStart).toISOString(),
          until:
            clippedEnd === clippedStart
              ? null
              : new Date(clippedEnd).toISOString(),
          startsBeforeDay: login < start,
          continuesAfterDay: lastKnown > end,
          endsAtDayBoundary: clippedEnd === end,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.session.lecturerName.localeCompare(b.session.lecturerName, "id") ||
        a.at.localeCompare(b.at) ||
        a.session.id.localeCompare(b.session.id),
    );
}

export function sessionChartCalendar(
  sessions: LoginSession[],
  from?: string,
  to?: string,
) {
  const times = sessions
    .flatMap((s) => [
      Date.parse(s.loginAt),
      Date.parse(s.logoutAt ?? s.lastObservedAt),
    ])
    .filter(Number.isFinite);
  const first = from ?? (times.length ? wibDay(Math.min(...times)) : "");
  const last = to ?? (times.length ? wibDay(Math.max(...times)) : "");
  if (!first || !last) return { days: [], defaultDay: "" };
  const start = dayWindow(first).start;
  const end = dayWindow(last).start;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    end - start > 730 * DAY
  )
    return { days: [], defaultDay: "" };
  const days: string[] = [];
  for (let time = end; time >= start; time -= DAY) days.push(wibDay(time));
  return {
    days,
    defaultDay:
      days.find((day) => dailySessionSegments(sessions, day).length > 0) ??
      days[0],
  };
}
