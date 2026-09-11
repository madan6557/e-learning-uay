import test from "node:test";
import assert from "node:assert/strict";
import {
  questionSchema,
  gradeAnswer,
  gradeLetter,
  distributePoints,
  advanceVideo,
  validateTotal,
  blockSchema,
} from "../packages/shared/src/domain.js";
const question = (
  type: string,
  answerKey: any,
  points = 20,
  options = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ],
) =>
  questionSchema.parse({ type, text: "Question", points, options, answerKey });
test("all eight question types and score boundaries", () => {
  assert.equal(
    gradeAnswer(question("SINGLE_CHOICE", { correct: ["a"] }), "a"),
    20,
  );
  assert.equal(
    gradeAnswer(question("SINGLE_CHOICE", { correct: ["a"] }), "b"),
    0,
  );
  const multiple = question("MULTIPLE_SELECT", {
    correct: ["a", "b"],
    partialCredit: true,
  });
  assert.equal(gradeAnswer(multiple, ["a", "a"]), 10);
  assert.equal(gradeAnswer(multiple, ["a", "c"]), 0);
  assert.equal(gradeAnswer(multiple, ["a", "b"]), 20);
  assert.equal(
    gradeAnswer(question("TRUE_FALSE", { correct: ["a"] }), "a"),
    20,
  );
  assert.equal(
    gradeAnswer(
      question("SHORT_ANSWER", {
        correct: [],
        numericValue: 9.8,
        tolerance: 0.1,
      }),
      "9.9",
    ),
    20,
  );
  assert.equal(
    gradeAnswer(
      question("SHORT_ANSWER", {
        correct: [],
        numericValue: 9.8,
        tolerance: 0.1,
      }),
      "9.901",
    ),
    0,
  );
  assert.equal(
    gradeAnswer(
      question("SHORT_ANSWER", { correct: [], numericValue: 0, tolerance: 0 }),
      " ",
    ),
    0,
  );
  assert.equal(
    gradeAnswer(question("SHORT_ANSWER", { correct: ["HTTP"] }), " http "),
    20,
  );
  assert.equal(
    gradeAnswer(
      question("MATCHING", { correct: [], pairs: { a: "b", b: "a", c: "c" } }),
      { a: "b", b: "a" },
    ),
    13.33,
  );
  assert.equal(
    gradeAnswer(question("ORDERING", { correct: ["b", "a", "c"] }), [
      "b",
      "a",
      "c",
    ]),
    20,
  );
  assert.equal(
    gradeAnswer(question("ORDERING", { correct: ["b", "a", "c"] }), [
      "a",
      "b",
      "c",
    ]),
    0,
  );
  assert.equal(gradeAnswer(question("ESSAY", { correct: [] }), "answer"), null);
  assert.equal(
    gradeAnswer(question("FILE_UPLOAD", { correct: [] }), "file-id"),
    null,
  );
});
test("invalid answer keys, non-finite points, rubric totals and unsafe URLs are rejected", () => {
  assert.throws(() => question("SINGLE_CHOICE", { correct: ["z"] }));
  assert.throws(() => question("ORDERING", { correct: ["a"] }));
  assert.throws(() => question("SINGLE_CHOICE", { correct: ["a"] }, NaN));
  assert.throws(() =>
    questionSchema.parse({
      ...question("ESSAY", { correct: [] }),
      rubric: [{ title: "Analysis", points: 10 }],
    }),
  );
  assert.equal(
    blockSchema.safeParse({
      id: "x",
      type: "embed_media",
      data: { url: "javascript:alert(1)", title: "X" },
    }).success,
    false,
  );
});
test("point distribution is exact and preserves two-decimal 100-scale scoring", () => {
  for (const input of [
    [10, 20, 30],
    [0, 0, 0],
    Array(14).fill(5),
    [1, 1, 1, 1, 1, 1],
  ]) {
    const output = distributePoints(input);
    assert.equal(validateTotal(output), true);
    assert.equal(output.length, input.length);
  }
  assert.equal(validateTotal([25, 15, 25, 25, 9.99]), false);
  assert.equal(validateTotal([25, 15, 25, 25, 10]), true);
});
test("UAY letter grade boundaries", () => {
  for (const [score, letter] of [
    [100, "A"],
    [85, "A"],
    [84.99, "A-"],
    [80, "A-"],
    [79.99, "B+"],
    [75, "B+"],
    [70, "B"],
    [65, "B-"],
    [60, "C+"],
    [55, "C"],
    [45, "D"],
    [44.99, "E"],
    [0, "E"],
  ] as const)
    assert.equal(gradeLetter(score).gradeLetter, letter);
});
test("video seeks, replay, fast playback and competing heartbeats cannot inflate progress", () => {
  const start = new Date("2026-09-01T00:00:00Z");
  const previous = {
    watchedSeconds: 10,
    lastPositionSeconds: 10,
    updatedAt: start,
  };
  assert.equal(
    advanceVideo(previous, 15, 100, new Date(+start + 5000)).watchedSeconds,
    15,
  );
  assert.equal(
    advanceVideo(previous, 100, 100, new Date(+start + 5000)).watchedSeconds,
    10,
  );
  assert.equal(advanceVideo(previous, 15, 100, start).watchedSeconds, 10);
  assert.equal(
    advanceVideo(
      { ...previous, lastPositionSeconds: 2 },
      7,
      100,
      new Date(+start + 5000),
    ).watchedSeconds,
    10,
  );
  assert.equal(
    advanceVideo(previous, 20, 100, new Date(+start + 5000)).watchedSeconds,
    10,
  );
  assert.equal(
    advanceVideo(
      { ...previous, watchedSeconds: 98, lastPositionSeconds: 98 },
      100,
      100,
      new Date(+start + 5000),
    ).percent,
    100,
  );
});
