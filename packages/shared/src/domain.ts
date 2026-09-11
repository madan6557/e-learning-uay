import { z } from "zod";

export const questionTypes = [
  "SINGLE_CHOICE",
  "MULTIPLE_SELECT",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "MATCHING",
  "ORDERING",
  "ESSAY",
  "FILE_UPLOAD",
] as const;
export const blockTypes = [
  "paragraph",
  "heading",
  "image",
  "code_snippet",
  "math_latex",
  "callout",
  "checklist",
  "table",
  "file_attachment",
  "embed_media",
  "divider",
] as const;
const text = z.string().max(100000);
export const webUrl = z
  .string()
  .url()
  .max(2048)
  .refine(
    (value) => ["https:", "http:"].includes(new URL(value).protocol),
    "URL_PROTOCOL",
  );
export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().max(100),
    type: z.literal("paragraph"),
    data: z.object({ text }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("heading"),
    data: z.object({ text, level: z.number().int().min(1).max(3) }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("image"),
    data: z.object({
      fileObjectId: z.string().min(1),
      caption: text.default(""),
      altText: text,
      alignment: z.enum(["left", "center", "right", "full"]).default("center"),
    }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("code_snippet"),
    data: z.object({
      code: text,
      language: z.string().max(40),
      showLineNumbers: z.boolean().default(true),
      filename: z.string().max(200).default(""),
    }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("math_latex"),
    data: z.object({ expression: text }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("callout"),
    data: z.object({
      text,
      title: text,
      alertType: z.enum(["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"]),
    }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("checklist"),
    data: z.object({
      items: z
        .array(z.object({ id: z.string(), text, checked: z.boolean() }))
        .max(200),
    }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("table"),
    data: z.object({
      rows: z.array(z.array(z.string().max(2000)).max(30)).max(200),
      header: z.boolean().default(true),
    }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("file_attachment"),
    data: z.object({
      fileObjectId: z.string().min(1),
      displayName: z.string().max(250),
    }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("embed_media"),
    data: z.object({ url: webUrl, title: text }),
  }),
  z.object({
    id: z.string().max(100),
    type: z.literal("divider"),
    data: z.object({}),
  }),
]);
export type ContentBlock = z.infer<typeof blockSchema>;
export const questionSchema = z
  .object({
    id: z.string().optional(),
    text: z.string().trim().min(1).max(20000),
    type: z.enum(questionTypes),
    points: z.number().positive().max(1000),
    options: z
      .array(
        z.object({
          id: z.string().min(1).max(60),
          text: z.string().min(1).max(10000),
          rightText: z.string().max(10000).optional(),
        }),
      )
      .max(50)
      .default([]),
    answerKey: z.object({
      correct: z.array(z.string()).default([]),
      partialCredit: z.boolean().default(false),
      caseSensitive: z.boolean().default(false),
      numericValue: z.number().optional(),
      tolerance: z.number().nonnegative().optional(),
      pairs: z.record(z.string()).optional(),
    }),
    rubric: z
      .array(
        z.object({ title: z.string().min(1), points: z.number().positive() }),
      )
      .max(20)
      .default([]),
    maxWords: z.number().int().positive().max(10000).default(1000),
    explanation: z.string().max(20000).default(""),
  })
  .superRefine((q, ctx) => {
    const ids = q.options.map((o) => o.id);
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (new Set(ids).size !== ids.length) fail("DUPLICATE_OPTIONS");
    if (
      [
        "SINGLE_CHOICE",
        "MULTIPLE_SELECT",
        "TRUE_FALSE",
        "ORDERING",
        "MATCHING",
      ].includes(q.type) &&
      ids.length < 2
    )
      fail("OPTIONS_REQUIRED");
    if (
      ["SINGLE_CHOICE", "TRUE_FALSE"].includes(q.type) &&
      q.answerKey.correct.length !== 1
    )
      fail("ONE_CORRECT_REQUIRED");
    if (
      ["SINGLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "ORDERING"].includes(
        q.type,
      ) &&
      (!q.answerKey.correct.length ||
        q.answerKey.correct.some((id) => !ids.includes(id)) ||
        new Set(q.answerKey.correct).size !== q.answerKey.correct.length)
    )
      fail("INVALID_ANSWER_KEY");
    if (q.type === "ORDERING" && q.answerKey.correct.length !== ids.length)
      fail("INVALID_ORDER");
    if (
      q.type === "SHORT_ANSWER" &&
      q.answerKey.numericValue === undefined &&
      !q.answerKey.correct.some((v) => v.trim())
    )
      fail("ANSWER_REQUIRED");
    if (
      q.type === "MATCHING" &&
      (Object.keys(q.answerKey.pairs ?? {}).length !== ids.length ||
        ids.some((id) => !ids.includes(q.answerKey.pairs?.[id] ?? "")))
    )
      fail("INVALID_PAIRS");
    if (
      q.rubric.length &&
      Math.abs(q.rubric.reduce((sum, r) => sum + r.points, 0) - q.points) >
        0.001
    )
      fail("RUBRIC_TOTAL");
  });
export type QuestionData = z.infer<typeof questionSchema>;
export const round = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export function gradeAnswer(
  question: QuestionData,
  answer: unknown,
): number | null {
  const { type, points, answerKey: key } = question;
  if (type === "ESSAY" || type === "FILE_UPLOAD") return null;
  if (answer === undefined || answer === null || answer === "") return 0;
  if (type === "SINGLE_CHOICE" || type === "TRUE_FALSE")
    return typeof answer === "string" && key.correct.includes(answer)
      ? points
      : 0;
  if (type === "MULTIPLE_SELECT") {
    if (!Array.isArray(answer) || answer.some((a) => typeof a !== "string"))
      return 0;
    const selected = [...new Set(answer)];
    if (selected.some((a) => !key.correct.includes(a))) return 0;
    return round(
      points *
        (key.partialCredit
          ? selected.length / key.correct.length
          : Number(selected.length === key.correct.length)),
    );
  }
  if (type === "SHORT_ANSWER") {
    if (typeof answer !== "string" || !answer.trim()) return 0;
    if (key.numericValue !== undefined)
      return Number.isFinite(Number(answer)) &&
        Math.abs(Number(answer) - key.numericValue) <=
          (key.tolerance ?? 0) + 1e-9
        ? points
        : 0;
    const normalize = (s: string) =>
      key.caseSensitive ? s.trim() : s.trim().toLocaleLowerCase("en");
    return key.correct.some((a) => normalize(a) === normalize(answer))
      ? points
      : 0;
  }
  if (type === "MATCHING") {
    if (typeof answer !== "object" || Array.isArray(answer)) return 0;
    const pairs = Object.entries(key.pairs ?? {});
    return round(
      (points *
        pairs.filter(
          ([id, value]) => (answer as Record<string, unknown>)[id] === value,
        ).length) /
        pairs.length,
    );
  }
  return Array.isArray(answer) &&
    JSON.stringify(answer) === JSON.stringify(key.correct)
    ? points
    : 0;
}
export function gradeLetter(score: number) {
  const bands: [number, string, number][] = [
    [85, "A", 4],
    [80, "A-", 3.75],
    [75, "B+", 3.5],
    [70, "B", 3],
    [65, "B-", 2.75],
    [60, "C+", 2.5],
    [55, "C", 2],
    [45, "D", 1],
    [0, "E", 0],
  ];
  const [, letter, point] =
    bands.find(([min]) => score >= min) ?? bands.at(-1)!;
  return { gradeLetter: letter, gradePoint: point };
}
export function validateTotal(values: number[]) {
  return (
    values.length > 0 &&
    values.every((v) => Number.isFinite(v) && v >= 0) &&
    Math.abs(values.reduce((a, b) => a + b, 0) - 100) < 0.001
  );
}
export function distributePoints(values: number[]) {
  if (!values.length) return [];
  const total = values.reduce((a, b) => a + b, 0);
  const result = values.map(
    (v) => Math.floor((total ? v / total : 1 / values.length) * 10000) / 100,
  );
  let cents = Math.round((100 - result.reduce((a, b) => a + b, 0)) * 100);
  for (let i = 0; cents > 0; i++, cents--)
    result[i % result.length] = round(result[i % result.length] + 0.01);
  return result;
}
export function advanceVideo(
  previous: {
    watchedSeconds: number;
    lastPositionSeconds: number;
    updatedAt: Date;
  },
  position: number,
  duration: number,
  now: Date,
) {
  const elapsed = Math.max(
    0,
    (now.getTime() - previous.updatedAt.getTime()) / 1000,
  );
  const delta = position - previous.lastPositionSeconds;
  const credit =
    delta >= 0 && delta <= Math.min(elapsed + 0.5, 8)
      ? Math.min(delta, elapsed)
      : 0;
  // Credit only the contiguous frontier: replaying or seeking cannot inflate completion.
  const watchedSeconds = Math.min(
    duration,
    Math.max(
      previous.watchedSeconds,
      previous.lastPositionSeconds <= previous.watchedSeconds + 0.5
        ? previous.lastPositionSeconds + credit
        : previous.watchedSeconds,
    ),
  );
  return {
    watchedSeconds,
    lastPositionSeconds: position,
    percent: round((100 * watchedSeconds) / duration),
  };
}
