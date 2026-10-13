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

export interface GradeBand {
  minScore: number;
  letter: string;
  point: number;
}

export interface GradeScalePolicy {
  version: string;
  name: string;
  description?: string;
  bands: GradeBand[];
}

export const GRADE_SCALE_PRESETS: Record<string, GradeScalePolicy> = {
  "2026.1": {
    version: "2026.1",
    name: "Standar Akademik UAY 2026/2027",
    description: "Skala nilai terstandar UAY aktif (A >= 85, A- >= 80, B+ >= 75)",
    bands: [
      { minScore: 85, letter: "A", point: 4.0 },
      { minScore: 80, letter: "A-", point: 3.75 },
      { minScore: 75, letter: "B+", point: 3.5 },
      { minScore: 70, letter: "B", point: 3.0 },
      { minScore: 65, letter: "B-", point: 2.75 },
      { minScore: 60, letter: "C+", point: 2.5 },
      { minScore: 55, letter: "C", point: 2.0 },
      { minScore: 45, letter: "D", point: 1.0 },
      { minScore: 0, letter: "E", point: 0.0 },
    ],
  },
  "2024.1": {
    version: "2024.1",
    name: "Standar Akademik Lama UAY (Sebelum 2026)",
    description: "Skala historis periode lama (A >= 80, B >= 70, C >= 60, D >= 50)",
    bands: [
      { minScore: 80, letter: "A", point: 4.0 },
      { minScore: 70, letter: "B", point: 3.0 },
      { minScore: 60, letter: "C", point: 2.0 },
      { minScore: 50, letter: "D", point: 1.0 },
      { minScore: 0, letter: "E", point: 0.0 },
    ],
  },
};

export const DEFAULT_GRADE_SCALE = GRADE_SCALE_PRESETS["2026.1"]!;

export function gradeScaleLabel(policy: GradeScalePolicy): string {
  const thresholds = (policy.bands || []).slice(0, 3)
    .map(b => `${b.letter} ≥ ${b.minScore}`).join(", ");
  return `${policy.version} - ${policy.name} (${thresholds}, dst.)`;
}

export function getAllGradeScalePolicies(
  customPolicies?: Record<string, GradeScalePolicy> | null,
): Record<string, GradeScalePolicy> {
  return {
    ...GRADE_SCALE_PRESETS,
    ...(customPolicies || {}),
  };
}

export function resolveGradeScalePolicy(
  version?: string | null,
  customPolicies?: Record<string, GradeScalePolicy> | null,
  classPolicy?: GradeScalePolicy | GradeBand[] | null,
): GradeScalePolicy {
  if (classPolicy) {
    if (Array.isArray(classPolicy)) {
      return {
        version: version || "custom",
        name: "Kebijakan Khusus Kelas",
        bands: classPolicy,
      };
    }
    return classPolicy;
  }
  const all = getAllGradeScalePolicies(customPolicies);
  const key = version || "2026.1";
  return all[key] || GRADE_SCALE_PRESETS["2026.1"] || DEFAULT_GRADE_SCALE;
}

export const GRADE_SOURCE_TYPES = [
  "ASSIGNMENT",
  "QUIZ",
  "ASSIGNMENT_AND_QUIZ",
  "PROGRESS",
  "ATTENDANCE",
  "MANUAL",
] as const;
export type GradeSourceType = (typeof GRADE_SOURCE_TYPES)[number];

export function clampGrade(value: number | string): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || isNaN(num)) return 0;
  return Math.max(0, Math.min(100, Math.round((num + Number.EPSILON) * 100) / 100));
}

export function gradeLetterWithPolicy(
  score: number,
  policy?: GradeScalePolicy | GradeBand[] | null,
): { gradeLetter: string; gradePoint: number } {
  const bands: GradeBand[] = Array.isArray(policy)
    ? policy
    : policy?.bands ?? DEFAULT_GRADE_SCALE.bands;
  const sortedBands = [...bands].sort((a, b) => b.minScore - a.minScore);
  const matched =
    sortedBands.find((b) => score >= b.minScore) ?? sortedBands.at(-1)!;
  return { gradeLetter: matched.letter, gradePoint: matched.point };
}

export function gradeLetter(score: number) {
  return gradeLetterWithPolicy(score, DEFAULT_GRADE_SCALE);
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
  const centsPerQuestion = Math.floor(10000 / values.length);
  let remainingCents = 10000 - centsPerQuestion * values.length;
  const result = values.map(() => {
    const points = (centsPerQuestion + (remainingCents > 0 ? 1 : 0)) / 100;
    remainingCents -= remainingCents > 0 ? 1 : 0;
    return points;
  });
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
  allowSeeking = true,
) {
  const previousAt = previous.updatedAt ? new Date(previous.updatedAt) : now;
  const elapsed = Math.max(
    0,
    (now.getTime() - previousAt.getTime()) / 1000,
  );
  const delta = position - previous.lastPositionSeconds;
  // Video playback at ~1x wall-clock speed with reasonable network/timer jitter tolerance
  const isNormalPlayback = delta >= 0 && delta <= elapsed + 1.5;
  const credit = isNormalPlayback
    ? Math.min(delta, Math.max(elapsed, delta), 30)
    : 0;

  let watchedSeconds = previous.watchedSeconds;
  if (allowSeeking && position > previous.watchedSeconds) {
    watchedSeconds = Math.min(duration, position);
  } else if (
    previous.watchedSeconds === 0 &&
    previous.lastPositionSeconds === 0 &&
    position <= 10
  ) {
    // Initial start within reasonable first-heartbeat window
    watchedSeconds = Math.min(duration, position);
  } else if (position > previous.watchedSeconds) {
    // Advancing past previously watched frontier
    watchedSeconds = Math.min(
      duration,
      Math.max(previous.watchedSeconds, previous.watchedSeconds + credit),
    );
  } else if (
    previous.lastPositionSeconds <= previous.watchedSeconds + 0.5 &&
    credit > 0
  ) {
    // Advancing along contiguous frontier
    watchedSeconds = Math.min(
      duration,
      Math.max(previous.watchedSeconds, previous.lastPositionSeconds + credit),
    );
  }

  if (position >= duration - 1 && (allowSeeking || credit > 0)) {
    watchedSeconds = duration;
  }

  return {
    watchedSeconds: round(watchedSeconds),
    lastPositionSeconds: position,
    percent: round((100 * watchedSeconds) / duration),
  };
}

export interface GradeCategoryPresetItem {
  name: string;
  weightPercent: number;
  kind?: "ASSESSMENT" | "PROGRESS";
  sourceType?: GradeSourceType;
  isMandatory?: boolean;
}

export interface GradeCategoryPreset {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  categories: GradeCategoryPresetItem[];
}

export const GRADE_CATEGORY_PRESETS: Record<string, GradeCategoryPreset> = {
  DEFAULT_UAY: {
    id: "DEFAULT_UAY",
    name: "Standar UAY (Default)",
    description: "30% Tugas (semua tugas & kuis), 35% UTS, 35% UAS",
    isDefault: true,
    categories: [
      {
        name: "Tugas",
        weightPercent: 30,
        kind: "ASSESSMENT",
        sourceType: "ASSIGNMENT_AND_QUIZ",
        isMandatory: false,
      },
      {
        name: "UTS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
      {
        name: "UAS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
    ],
  },
  SEPARATE_QUIZ: {
    id: "SEPARATE_QUIZ",
    name: "Tugas & Kuis Terpisah",
    description: "20% Tugas, 10% Kuis, 35% UTS, 35% UAS",
    categories: [
      {
        name: "Tugas",
        weightPercent: 20,
        kind: "ASSESSMENT",
        sourceType: "ASSIGNMENT",
        isMandatory: false,
      },
      {
        name: "Kuis",
        weightPercent: 10,
        kind: "ASSESSMENT",
        sourceType: "QUIZ",
        isMandatory: false,
      },
      {
        name: "UTS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
      {
        name: "UAS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
    ],
  },
  PROJECT_BASED: {
    id: "PROJECT_BASED",
    name: "Berbasis Proyek (PBL)",
    description: "40% Proyek & Tugas (semua tugas & kuis), 30% UTS, 30% UAS",
    categories: [
      {
        name: "Proyek & Tugas",
        weightPercent: 40,
        kind: "ASSESSMENT",
        sourceType: "ASSIGNMENT_AND_QUIZ",
        isMandatory: false,
      },
      {
        name: "UTS",
        weightPercent: 30,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
      {
        name: "UAS",
        weightPercent: 30,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
    ],
  },
  PRACTICUM_LAB: {
    id: "PRACTICUM_LAB",
    name: "Teori & Praktikum Lab",
    description: "15% Tugas & Kuis, 25% Praktikum, 30% UTS, 30% UAS",
    categories: [
      {
        name: "Tugas & Kuis",
        weightPercent: 15,
        kind: "ASSESSMENT",
        sourceType: "ASSIGNMENT_AND_QUIZ",
        isMandatory: false,
      },
      {
        name: "Praktikum",
        weightPercent: 25,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: false,
      },
      {
        name: "UTS",
        weightPercent: 30,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
      {
        name: "UAS",
        weightPercent: 30,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
    ],
  },
  PROGRESS_PARTICIPATION: {
    id: "PROGRESS_PARTICIPATION",
    name: "Partisipatif & Progres Mandiri",
    description: "10% Progres Belajar Materi, 20% Tugas & Kuis, 35% UTS, 35% UAS",
    categories: [
      {
        name: "Progres Belajar",
        weightPercent: 10,
        kind: "PROGRESS",
        sourceType: "PROGRESS",
        isMandatory: false,
      },
      {
        name: "Tugas",
        weightPercent: 20,
        kind: "ASSESSMENT",
        sourceType: "ASSIGNMENT_AND_QUIZ",
        isMandatory: false,
      },
      {
        name: "UTS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
      {
        name: "UAS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
    ],
  },
  ATTENDANCE_ACTIVE: {
    id: "ATTENDANCE_ACTIVE",
    name: "Presensi & Keaktifan",
    description: "10% Presensi Kehadiran, 20% Tugas & Kuis, 35% UTS, 35% UAS",
    categories: [
      {
        name: "Presensi Kehadiran",
        weightPercent: 10,
        kind: "ASSESSMENT",
        sourceType: "ATTENDANCE",
        isMandatory: false,
      },
      {
        name: "Tugas",
        weightPercent: 20,
        kind: "ASSESSMENT",
        sourceType: "ASSIGNMENT_AND_QUIZ",
        isMandatory: false,
      },
      {
        name: "UTS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
      {
        name: "UAS",
        weightPercent: 35,
        kind: "ASSESSMENT",
        sourceType: "MANUAL",
        isMandatory: true,
      },
    ],
  },
};

export const DEFAULT_GRADE_CATEGORIES_TEMPLATE =
  GRADE_CATEGORY_PRESETS.DEFAULT_UAY.categories;

export interface AutoAssignableItem {
  id: string;
  title: string;
  gradeCategoryId?: string | null;
}

export interface CategoryCandidate {
  id: string;
  name: string;
  kind?: string;
  sourceType?: string;
  isMandatory?: boolean;
}

export function autoAssignItems<T extends AutoAssignableItem>(
  categories: CategoryCandidate[],
  items: T[],
  itemType: "ASSIGNMENT" | "QUIZ",
): Array<T & { targetCategoryId: string | null; currentCategoryId: string | null }> {
  const utsCategory = categories.find(
    (c) =>
      /\b(uts|mid|tengah)\b/i.test(c.name) ||
      (Boolean(c.isMandatory) && c.name.toLowerCase().includes("uts")),
  );
  const uasCategory = categories.find(
    (c) =>
      /\b(uas|final|akhir)\b/i.test(c.name) ||
      (Boolean(c.isMandatory) && c.name.toLowerCase().includes("uas")),
  );
  const quizCategory = categories.find(
    (c) => c.sourceType === "QUIZ" || /\b(kuis|quiz)\b/i.test(c.name),
  );
  const practicumCategory = categories.find((c) =>
    /\b(praktik|praktikum|lab|responsip)\b/i.test(c.name),
  );
  const assignmentCategory =
    categories.find(
      (c) =>
        c.sourceType === "ASSIGNMENT_AND_QUIZ" ||
        c.sourceType === "ASSIGNMENT" ||
        /\b(tugas|proyek|project|tugas & kuis)\b/i.test(c.name),
    ) ??
    categories.find(
      (c) =>
        !c.isMandatory &&
        c.kind !== "PROGRESS" &&
        c.id !== utsCategory?.id &&
        c.id !== uasCategory?.id,
    ) ??
    categories.find((c) => c.kind !== "PROGRESS");

  return items.map((item) => {
    let targetId: string | null = null;
    const lowerTitle = item.title.toLowerCase();

    // 1. Keyword UTS
    if (
      /\b(uts|mid\s*test|mid\s*term|ujian tengah)\b/i.test(lowerTitle) &&
      utsCategory
    ) {
      targetId = utsCategory.id;
    }
    // 2. Keyword UAS
    else if (
      /\b(uas|final\s*test|final\s*term|ujian akhir)\b/i.test(lowerTitle) &&
      uasCategory
    ) {
      targetId = uasCategory.id;
    }
    // 3. Jenis Komponen
    else if (itemType === "QUIZ") {
      if (quizCategory) {
        targetId = quizCategory.id;
      } else if (assignmentCategory) {
        targetId = assignmentCategory.id;
      } else {
        targetId = categories.find((c) => c.kind !== "PROGRESS")?.id ?? null;
      }
    } else {
      // ASSIGNMENT
      if (
        /\b(praktik|praktikum|lab|responsip)\b/i.test(lowerTitle) &&
        practicumCategory
      ) {
        targetId = practicumCategory.id;
      } else if (assignmentCategory) {
        targetId = assignmentCategory.id;
      } else if (quizCategory) {
        targetId = quizCategory.id;
      } else {
        targetId = categories.find((c) => c.kind !== "PROGRESS")?.id ?? null;
      }
    }

    return {
      ...item,
      currentCategoryId: item.gradeCategoryId ?? null,
      targetCategoryId: targetId,
    };
  });
}
