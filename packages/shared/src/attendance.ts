export function attendanceSummary(present: number, late: number, total: number, minimum: number) {
  const raw = total > 0 ? ((present + late) / total) * 100 : 100;
  return { percentage: Number(raw.toFixed(1)), isEligibleForExam: raw >= minimum };
}

export function matchesAttendanceCode(expected: string | null, supplied: string | null | undefined) {
  return Boolean(expected?.trim() && supplied?.trim() &&
    expected.trim().toUpperCase() === supplied.trim().toUpperCase());
}
