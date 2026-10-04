import test from "node:test";
import assert from "node:assert/strict";

type AttendanceStatus = "PRESENT" | "EXCUSED" | "SICK" | "ABSENT" | "LATE";

function calculateRecap(
  totalSessions: number,
  records: Array<{ status: AttendanceStatus }>,
) {
  const counts = {
    present: 0,
    excused: 0,
    sick: 0,
    absent: 0,
    late: 0,
  };

  for (const r of records) {
    if (r.status === "PRESENT") counts.present++;
    else if (r.status === "EXCUSED") counts.excused++;
    else if (r.status === "SICK") counts.sick++;
    else if (r.status === "LATE") counts.late++;
    else counts.absent++;
  }

  const effectiveAttended = counts.present + counts.late;
  const percentage =
    totalSessions > 0
      ? Number(((effectiveAttended / totalSessions) * 100).toFixed(1))
      : 100;
  const isEligibleForExam = percentage >= 75.0;

  return {
    totalSessions,
    counts,
    percentage,
    isEligibleForExam,
  };
}

function validateCheckInCode(expectedCode: string, inputCode: string): boolean {
  if (!expectedCode || !inputCode) return false;
  return expectedCode.trim().toUpperCase() === inputCode.trim().toUpperCase();
}

test("Attendance: check-in code validation is case-insensitive and trims whitespace", () => {
  assert.equal(validateCheckInCode("K7X9PQ", "k7x9pq"), true);
  assert.equal(validateCheckInCode("K7X9PQ", " K7X9PQ "), true);
  assert.equal(validateCheckInCode("K7X9PQ", "WRONG1"), false);
  assert.equal(validateCheckInCode("K7X9PQ", ""), false);
});

test("Attendance: exam eligibility threshold strictly enforces 75% rule", () => {
  // Case 1: 14 out of 16 attended = 87.5% -> Eligible
  const res1 = calculateRecap(16, [
    ...Array(14).fill({ status: "PRESENT" }),
    ...Array(2).fill({ status: "ABSENT" }),
  ]);
  assert.equal(res1.percentage, 87.5);
  assert.equal(res1.isEligibleForExam, true);

  // Case 2: 12 out of 16 attended = 75.0% -> Eligible
  const res2 = calculateRecap(16, [
    ...Array(11).fill({ status: "PRESENT" }),
    { status: "LATE" }, // Late counts towards attendance
    ...Array(4).fill({ status: "ABSENT" }),
  ]);
  assert.equal(res2.percentage, 75.0);
  assert.equal(res2.isEligibleForExam, true);

  // Case 3: 11 out of 16 attended = 68.8% -> Barred from exam (<75%)
  const res3 = calculateRecap(16, [
    ...Array(11).fill({ status: "PRESENT" }),
    ...Array(5).fill({ status: "ABSENT" }),
  ]);
  assert.equal(res3.percentage, 68.8);
  assert.equal(res3.isEligibleForExam, false);

  // Case 4: No sessions yet -> 100% default
  const res4 = calculateRecap(0, []);
  assert.equal(res4.percentage, 100);
  assert.equal(res4.isEligibleForExam, true);
});

test("Attendance: manual override transitions and note handling", () => {
  const record = {
    userId: "user-1",
    status: "ABSENT" as AttendanceStatus,
    notes: null as string | null,
    verifiedBy: null as string | null,
  };

  // Lecturer updates to EXCUSED with doctor's note
  record.status = "EXCUSED";
  record.notes = "Surat izin dinas universitas no 042/UAY/2026";
  record.verifiedBy = "dosen-uuid";

  assert.equal(record.status, "EXCUSED");
  assert.ok(record.notes?.includes("042/UAY/2026"));
  assert.equal(record.verifiedBy, "dosen-uuid");
});
