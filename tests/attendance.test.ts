import test from "node:test";
import assert from "node:assert/strict";
import { attendanceSummary, matchesAttendanceCode } from "../packages/shared/src/attendance.js";

test("attendance codes accept case and surrounding spaces without accepting an empty or wrong code", () => {
  assert.equal(matchesAttendanceCode("K7X9PQ", " k7x9pq "), true);
  assert.equal(matchesAttendanceCode("K7X9PQ", "WRONG1"), false);
  assert.equal(matchesAttendanceCode("K7X9PQ", ""), false);
  assert.equal(matchesAttendanceCode(null, "K7X9PQ"), false);
});

test("attendance eligibility uses configured threshold and the unrounded percentage", () => {
  assert.deepEqual(attendanceSummary(11, 1, 16, 75), { percentage: 75, isEligibleForExam: true });
  assert.equal(attendanceSummary(11, 1, 16, 80).isEligibleForExam, false);
  assert.equal(attendanceSummary(11, 0, 16, 60).isEligibleForExam, true);
  assert.deepEqual(attendanceSummary(0, 0, 0, 75), { percentage: 100, isEligibleForExam: true });
  assert.deepEqual(attendanceSummary(2, 0, 3, 66.7), { percentage: 66.7, isEligibleForExam: false });
});
