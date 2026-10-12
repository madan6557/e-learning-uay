import test from "node:test";
import assert from "node:assert/strict";
import {
  GRADE_SCALE_PRESETS,
  DEFAULT_GRADE_SCALE,
  gradeScaleLabel,
  gradeLetterWithPolicy,
  getAllGradeScalePolicies,
  resolveGradeScalePolicy,
  type GradeScalePolicy,
  type GradeBand,
} from "../packages/shared/src/domain.js";

test("getAllGradeScalePolicies merges default presets with custom grade scale policies", () => {
  const customScales: Record<string, GradeScalePolicy> = {
    "2027.1": {
      version: "2027.1",
      name: "Standar Akademik UAY 2027/2028",
      bands: [
        { minScore: 90, letter: "A+", point: 4.0 },
        { minScore: 85, letter: "A", point: 4.0 },
        { minScore: 80, letter: "A-", point: 3.75 },
        { minScore: 75, letter: "B+", point: 3.5 },
        { minScore: 70, letter: "B", point: 3.0 },
        { minScore: 0, letter: "E", point: 0.0 },
      ],
    },
  };

  const all = getAllGradeScalePolicies(customScales);
  assert.ok(all["2026.1"], "Preset 2026.1 must be present");
  assert.ok(all["2024.1"], "Preset 2024.1 must be present");
  assert.ok(all["2027.1"], "Custom scale 2027.1 must be present");
  assert.equal(all["2027.1"].name, "Standar Akademik UAY 2027/2028");
  assert.equal(all["2027.1"].bands.length, 6);
});

test("Super Admin can override existing preset bands or add new letter grades", () => {
  const customized2026: Record<string, GradeScalePolicy> = {
    "2026.1": {
      version: "2026.1",
      name: "Standar Akademik UAY 2026 (Kustom Huruf A+)",
      bands: [
        { minScore: 92, letter: "A+", point: 4.0 },
        { minScore: 85, letter: "A", point: 3.85 },
        { minScore: 80, letter: "A-", point: 3.7 },
        { minScore: 75, letter: "B+", point: 3.3 },
        { minScore: 70, letter: "B", point: 3.0 },
        { minScore: 65, letter: "C+", point: 2.5 },
        { minScore: 55, letter: "C", point: 2.0 },
        { minScore: 45, letter: "D", point: 1.0 },
        { minScore: 0, letter: "E", point: 0.0 },
      ],
    },
  };

  const resolved = resolveGradeScalePolicy("2026.1", customized2026);
  assert.equal(resolved.name, "Standar Akademik UAY 2026 (Kustom Huruf A+)");

  // Verify letter grade conversion with the newly added A+ band
  const result95 = gradeLetterWithPolicy(95, resolved);
  assert.equal(result95.gradeLetter, "A+");
  assert.equal(result95.gradePoint, 4.0);

  const result88 = gradeLetterWithPolicy(88, resolved);
  assert.equal(result88.gradeLetter, "A");
  assert.equal(result88.gradePoint, 3.85);

  const result81 = gradeLetterWithPolicy(81, resolved);
  assert.equal(result81.gradeLetter, "A-");
  assert.equal(result81.gradePoint, 3.7);
});

test("resolveGradeScalePolicy prioritizes class snapshot policy over system settings", () => {
  const classPolicySnapshot: GradeScalePolicy = {
    version: "CLASS-ARCHIVED-SCALE",
    name: "Snapshot Kelas Tahun 2023",
    bands: [
      { minScore: 90, letter: "A", point: 4.0 },
      { minScore: 0, letter: "F", point: 0.0 },
    ],
  };

  const systemCustom: Record<string, GradeScalePolicy> = {
    "2026.1": {
      version: "2026.1",
      name: "Standar 2026",
      bands: [{ minScore: 80, letter: "A", point: 4.0 }],
    },
  };

  const resolved = resolveGradeScalePolicy("2026.1", systemCustom, classPolicySnapshot);
  assert.equal(resolved.version, "CLASS-ARCHIVED-SCALE");
  assert.equal(gradeLetterWithPolicy(85, resolved).gradeLetter, "F");
  assert.equal(gradeLetterWithPolicy(92, resolved).gradeLetter, "A");
});

test("gradeScaleLabel handles custom policies cleanly without crashing on empty or dynamic bands", () => {
  const emptyBandsPolicy: GradeScalePolicy = {
    version: "TEST.EMPTY",
    name: "Uji Skala Kosong",
    bands: [],
  };
  const label = gradeScaleLabel(emptyBandsPolicy);
  assert.ok(label.startsWith("TEST.EMPTY - Uji Skala Kosong"));

  const customBands: GradeScalePolicy = {
    version: "FK-2026",
    name: "Fakultas Kedokteran",
    bands: [
      { minScore: 88, letter: "A", point: 4.0 },
      { minScore: 82, letter: "B+", point: 3.5 },
      { minScore: 76, letter: "B", point: 3.0 },
      { minScore: 0, letter: "E", point: 0.0 },
    ],
  };
  assert.ok(gradeScaleLabel(customBands).includes("A ≥ 88, B+ ≥ 82, B ≥ 76"));
});
