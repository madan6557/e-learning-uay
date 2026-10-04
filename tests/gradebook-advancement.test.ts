import test from "node:test";
import assert from "node:assert/strict";
import {
  clampGrade,
  gradeLetterWithPolicy,
  GRADE_SCALE_PRESETS,
  DEFAULT_GRADE_SCALE,
  GRADE_SOURCE_TYPES,
  validateTotal,
} from "../packages/shared/src/domain.js";

test("Grade clamping strictly bounds score values to [0, 100]", () => {
  assert.equal(clampGrade(-15), 0);
  assert.equal(clampGrade(150), 100);
  assert.equal(clampGrade(9999), 100);
  assert.equal(clampGrade(0), 0);
  assert.equal(clampGrade(100), 100);
  assert.equal(clampGrade(85.456), 85.46);
  assert.equal(clampGrade(72.5), 72.5);
  assert.equal(clampGrade("95" as any), 95);
  assert.equal(clampGrade("invalid" as any), 0);
  assert.equal(clampGrade(NaN), 0);
});

test("Grade scale policy versioning maintains historical scale immutability", () => {
  const policy2026 = GRADE_SCALE_PRESETS["2026.1"];
  const policy2024 = GRADE_SCALE_PRESETS["2024.1"];

  assert.ok(policy2026, "2026.1 preset must exist");
  assert.ok(policy2024, "2024.1 preset must exist");

  // In 2026.1: 85 -> A (4.0), 80 -> A- (3.75), 75 -> B+ (3.5)
  const result2026_82 = gradeLetterWithPolicy(82, policy2026);
  assert.equal(result2026_82.gradeLetter, "A-");
  assert.equal(result2026_82.gradePoint, 3.75);

  const result2026_85 = gradeLetterWithPolicy(85, policy2026);
  assert.equal(result2026_85.gradeLetter, "A");
  assert.equal(result2026_85.gradePoint, 4.0);

  // In 2024.1: 80 -> A (4.0), 70 -> B (3.0)
  const result2024_82 = gradeLetterWithPolicy(82, policy2024);
  assert.equal(result2024_82.gradeLetter, "A");
  assert.equal(result2024_82.gradePoint, 4.0);

  // Score 76: In 2026.1 -> "B+" (>= 75), In 2024.1 -> "B" (>= 70)
  assert.equal(gradeLetterWithPolicy(76, policy2026).gradeLetter, "B+");
  assert.equal(gradeLetterWithPolicy(76, policy2024).gradeLetter, "B");

  // Custom policy snapshot preserves exact historic bands
  const customPolicy = {
    version: "CUSTOM_2020",
    label: "Custom Past Scale",
    bands: [
      { minScore: 90, letter: "A", point: 4.0 },
      { minScore: 0, letter: "E", point: 0.0 },
    ],
  };
  assert.equal(gradeLetterWithPolicy(88, customPolicy).gradeLetter, "E");
  assert.equal(gradeLetterWithPolicy(90, customPolicy).gradeLetter, "A");
});

test("Weight validation enforces 100% total", () => {
  assert.equal(validateTotal([25, 25, 25, 25]), true);
  assert.equal(validateTotal([20, 20, 20, 20, 20]), true);
  assert.equal(validateTotal([25, 25, 25, 20]), false);
  assert.equal(validateTotal([25, 25, 25, 30]), false);
});

test("Grade category source types and mandatory category definitions", () => {
  assert.deepEqual(GRADE_SOURCE_TYPES, [
    "ASSIGNMENT",
    "QUIZ",
    "ASSIGNMENT_AND_QUIZ",
    "PROGRESS",
    "ATTENDANCE",
    "MANUAL",
  ]);

  // Mandatory exam category identification
  const isMandatory = (name: string, flag?: boolean) =>
    Boolean(flag) || ["uts", "uas"].includes(name.trim().toLowerCase());

  assert.equal(isMandatory("UTS"), true);
  assert.equal(isMandatory("UAS"), true);
  assert.equal(isMandatory("uts"), true);
  assert.equal(isMandatory("uas"), true);
  assert.equal(isMandatory("Tugas Harian"), false);
  assert.equal(isMandatory("Kuis 1"), false);
  assert.equal(isMandatory("Praktikum", true), true);
});
