const validDate = (value: string | number | Date) => new Date(value);

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
