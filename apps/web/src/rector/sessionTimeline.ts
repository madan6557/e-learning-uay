import type { LoginSession } from "../../../../packages/shared/src/rector.js";
import { localDateInput, shiftCalendarDay } from "../../../../packages/shared/src/time.js";

const DAY = 86400000;
export function dayWindow(day: string) {
  const start = Date.parse(`${day}T00:00:00`);
  const end = Date.parse(`${shiftCalendarDay(day, 1)}T00:00:00`);
  return { start, end };
}

/** Clip connection evidence to one device-local day without changing recorded times. */
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
  const first = from ?? (times.length ? localDateInput(Math.min(...times)) : "");
  const last = to ?? (times.length ? localDateInput(Math.max(...times)) : "");
  if (!first || !last)
    return { days: [], defaultDay: "", latestSessionDay: "" };
  const start = Date.parse(`${first}T00:00:00Z`);
  const end = Date.parse(`${last}T00:00:00Z`);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end < start ||
    end - start > 730 * DAY
  )
    return { days: [], defaultDay: "", latestSessionDay: "" };
  const days: string[] = [];
  for (let time = end; time >= start; time -= DAY) days.push(new Date(time).toISOString().slice(0, 10));
  return {
    days,
    // Start on the report's latest day, even if no one logged in that day.
    // A separate shortcut lets readers inspect the last recorded session.
    defaultDay: days[0],
    latestSessionDay:
      days.find((day) => dailySessionSegments(sessions, day).length > 0) ?? "",
  };
}
