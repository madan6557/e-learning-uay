import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  questionSchema,
  blockSchema,
  gradeAnswer,
  gradeLetter,
  advanceVideo,
  validateTotal,
  distributePoints,
} from "../../packages/shared/src/domain.js";

const fixtures = JSON.parse(readFileSync("docs/qa/fixtures.json", "utf8"));
const q = (type: string, key: any, overrides: any = {}) =>
  questionSchema.parse({
    type,
    text: "QA v5",
    points: 20,
    options: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: id })),
    answerKey: key,
    ...overrides,
  });
const scenarios: Record<string, () => number | null> = {
  "SINGLE-OK": () => gradeAnswer(q("SINGLE_CHOICE", { correct: ["a"] }), "a"),
  "SINGLE-WRONG": () =>
    gradeAnswer(q("SINGLE_CHOICE", { correct: ["a"] }), "b"),
  "MULTI-ALL": () =>
    gradeAnswer(q("MULTIPLE_SELECT", { correct: ["a", "b"] }), ["a", "b"]),
  "MULTI-PARTIAL": () =>
    gradeAnswer(
      q("MULTIPLE_SELECT", {
        correct: ["a", "b", "c", "d"],
        partialCredit: true,
      }),
      ["a", "b"],
    ),
  "MULTI-WRONG": () =>
    gradeAnswer(
      q("MULTIPLE_SELECT", { correct: ["a", "b"], partialCredit: true }),
      ["a", "e"],
    ),
  "MULTI-STRICT": () =>
    gradeAnswer(
      q("MULTIPLE_SELECT", { correct: ["a", "b"], partialCredit: false }),
      ["a"],
    ),
  TRUE: () => gradeAnswer(q("TRUE_FALSE", { correct: ["a"] }), "a"),
  FALSE: () => gradeAnswer(q("TRUE_FALSE", { correct: ["a"] }), "b"),
  "SHORT-FOLD": () =>
    gradeAnswer(
      q("SHORT_ANSWER", { correct: ["HTTP"], caseSensitive: false }),
      "http",
    ),
  "SHORT-CASE": () =>
    gradeAnswer(
      q("SHORT_ANSWER", { correct: ["HTTP"], caseSensitive: true }),
      "http",
    ),
  "SHORT-NUMERIC": () =>
    gradeAnswer(
      q("SHORT_ANSWER", { numericValue: 9.8, tolerance: 0.1 }),
      "9.9",
    ),
  "SHORT-OUTSIDE": () =>
    gradeAnswer(
      q("SHORT_ANSWER", { numericValue: 9.8, tolerance: 0.1 }),
      "9.901",
    ),
  "MATCH-ALL": () =>
    gradeAnswer(
      q(
        "MATCHING",
        { pairs: { a: "b", b: "a", c: "c" } },
        { options: ["a", "b", "c"].map((id) => ({ id, text: id })) },
      ),
      { a: "b", b: "a", c: "c" },
    ),
  "MATCH-PARTIAL": () =>
    gradeAnswer(
      q(
        "MATCHING",
        { pairs: { a: "b", b: "a", c: "c" } },
        { options: ["a", "b", "c"].map((id) => ({ id, text: id })) },
      ),
      { a: "b", b: "a" },
    ),
  "ORDER-OK": () =>
    gradeAnswer(
      q(
        "ORDERING",
        { correct: ["b", "a", "c"] },
        { options: ["a", "b", "c"].map((id) => ({ id, text: id })) },
      ),
      ["b", "a", "c"],
    ),
  "ORDER-WRONG": () =>
    gradeAnswer(
      q(
        "ORDERING",
        { correct: ["b", "a", "c"] },
        { options: ["a", "b", "c"].map((id) => ({ id, text: id })) },
      ),
      ["a", "b", "c"],
    ),
  "ESSAY-PENDING": () => gradeAnswer(q("ESSAY", {}), "Uraian mahasiswa"),
  "FILE-PENDING": () => gradeAnswer(q("FILE_UPLOAD", {}), "file-ready"),
};
for (const [suffix, title, , , expected] of fixtures.questionScenarios)
  test(`[TC-QZ-${suffix}] ${title}`, () =>
    assert.equal(scenarios[suffix](), expected === "manual" ? null : expected));
for (const [type, data] of Object.entries(fixtures.blockSamples))
  test(`[TC-BLOCK-${type.toUpperCase()}] valid block payload`, () =>
    assert.equal(
      blockSchema.safeParse({ id: "qa", type, data }).success,
      true,
    ));
for (const [value, letter, gpa] of fixtures.gradeBands)
  test(`[TC-GRD-BAND-${String(value).replace(".", "_")}] UAY letter and GPA`, () =>
    assert.deepEqual(gradeLetter(value), {
      gradeLetter: letter,
      gradePoint: gpa,
    }));
for (const total of [99.99, 100, 100.01])
  test(`[TC-BVA-WEIGHT-${String(total).replace(".", "_")}] category total ${total}`, () =>
    assert.equal(validateTotal([25, 15, 25, 25, total - 90]), total === 100));
test("[TC-QZ-BAD-KEY] answer key outside options rejected", () =>
  assert.throws(() => q("SINGLE_CHOICE", { correct: ["z"] })));
test("[TC-QZ-DUP-OPTIONS] duplicate option IDs rejected", () =>
  assert.throws(() =>
    q(
      "SINGLE_CHOICE",
      { correct: ["a"] },
      {
        options: [
          { id: "a", text: "A" },
          { id: "a", text: "B" },
        ],
      },
    ),
  ));
test("[TC-QZ-RUBRIC] rubric must equal item points", () =>
  assert.throws(() =>
    q(
      "ESSAY",
      {},
      {
        points: 30,
        rubric: [
          { title: "Analysis", points: 15 },
          { title: "Syntax", points: 15 },
          { title: "Layout", points: 10 },
        ],
      },
    ),
  ));
test("[TC-QZ-POINTS-NAN] non-finite item points rejected", () => {
  for (const points of [NaN, Infinity, -Infinity])
    assert.throws(() => q("SINGLE_CHOICE", { correct: ["a"] }, { points }));
});
test("[TC-QZ-DISTRIBUTE] fourteen items sum to 100 cents-exact", () => {
  const output = distributePoints(Array(14).fill(5));
  assert.equal(output.length, 14);
  assert.equal(
    output.reduce((sum, value) => sum + Math.round(value * 100), 0),
    10000,
  );
});
test("[TC-RES-URL] javascript embed protocol rejected", () =>
  assert.equal(
    blockSchema.safeParse({
      id: "qa",
      type: "embed_media",
      data: { url: "javascript:alert(1)", title: "Unsafe" },
    }).success,
    false,
  ));
const now = new Date("2026-09-01T00:00:00Z");
const prev = { watchedSeconds: 10, lastPositionSeconds: 10, updatedAt: now };
test("[TC-PRG-CONTINUOUS] five seconds actual playback", () =>
  assert.equal(
    advanceVideo(prev, 15, 100, new Date(+now + 5000)).watchedSeconds,
    15,
  ));
test("[TC-PRG-SEEK] seeking gets no credit", () =>
  assert.equal(
    advanceVideo(prev, 100, 100, new Date(+now + 5000)).watchedSeconds,
    10,
  ));
test("[TC-PRG-REPLAY] replay cannot duplicate credit", () =>
  assert.equal(
    advanceVideo(
      { ...prev, lastPositionSeconds: 2 },
      7,
      100,
      new Date(+now + 5000),
    ).watchedSeconds,
    10,
  ));
test("[TC-PRG-FAST] accelerated playback gets no false credit", () =>
  assert.equal(
    advanceVideo(prev, 20, 100, new Date(+now + 5000)).watchedSeconds,
    10,
  ));
test("[TC-PRG-REORDER] stale heartbeat is monotonic", () =>
  assert.equal(
    advanceVideo(prev, 15, 100, new Date(+now - 5000)).watchedSeconds,
    10,
  ));
