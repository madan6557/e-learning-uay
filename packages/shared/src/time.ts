const validDate = (value: string | number | Date) => new Date(value);
type DateInputValue = string | number | Date | null | undefined;
const pad = (value: number) => String(value).padStart(2, "0");

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
export function localInputToUtc(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00` : input);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/** All displays and datetime-local inputs use the device timezone. */
export function formatDateTime(value: string | number | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset",
  }).format(validDate(value));
}

export function formatClock(value: string | number | Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZoneName: "shortOffset",
  }).format(validDate(value));
}
