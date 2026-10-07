const validDate = (value: string | number | Date) => new Date(value);
type DateInputValue = string | number | Date | null | undefined;
const pad = (value: number) => String(value).padStart(2, "0");

export const localTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export function validTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("id-ID", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** A recorded UTC instant's calendar date in the viewer's timezone. */
const calendarFormatters = new Map<string, Intl.DateTimeFormat>();
export function calendarDate(
  value: string | number | Date,
  timeZone = localTimeZone(),
): string {
  let formatter = calendarFormatters.get(timeZone);
  if (!formatter) {
    if (calendarFormatters.size >= 32)
      calendarFormatters.delete(calendarFormatters.keys().next().value!);
    formatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    });
    calendarFormatters.set(timeZone, formatter);
  }
  const parts = formatter.formatToParts(validDate(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Date-only arithmetic is independent of UTC offsets and daylight saving. */
export function shiftCalendarDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Calendar fields must come from the device, not the date portion of a UTC ISO string. */
export function localDateInput(value: DateInputValue): string {
  if (value == null || value === "") return "";
  const date = validDate(value);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localDateTimeInput(value: DateInputValue): string {
  const day = localDateInput(value);
  if (!day) return "";
  const date = validDate(value!);
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Date-only inputs also represent local midnight; JavaScript otherwise parses them as UTC. */
export function localInputToUtc(
  value: string | null | undefined,
): string | null {
  const input = value?.trim();
  if (!input) return null;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00` : input,
  );
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/** All displays and datetime-local inputs use the device timezone. */
export function formatDateTime(
  value: string | number | Date,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
    timeZone,
  }).format(validDate(value));
}

export function formatClock(
  value: string | number | Date,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
    timeZone,
  }).format(validDate(value));
}
