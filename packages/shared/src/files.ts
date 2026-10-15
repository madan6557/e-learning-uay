export const UPLOAD_LIMITS = {
  COVER: 5 * 1024 * 1024,
  RESOURCE: 50 * 1024 * 1024,
  SUBMISSION: 50 * 1024 * 1024,
  QUIZ_ANSWER: 50 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
} as const;

export type UploadPurpose = keyof typeof UPLOAD_LIMITS;

export const EXTENSION_UPLOAD_LIMITS: Record<string, number> = {
  png: 10 * 1024 * 1024,
  jpg: 10 * 1024 * 1024,
  jpeg: 10 * 1024 * 1024,
  webp: 10 * 1024 * 1024,
  txt: 10 * 1024 * 1024,
  csv: 20 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  doc: 50 * 1024 * 1024,
  docx: 50 * 1024 * 1024,
  ppt: 50 * 1024 * 1024,
  pptx: 50 * 1024 * 1024,
  zip: 50 * 1024 * 1024,
  mp4: 100 * 1024 * 1024,
  webm: 100 * 1024 * 1024,
};

export function uploadLimit(purpose: string): number {
  if (!Object.hasOwn(UPLOAD_LIMITS, purpose)) throw new Error("INVALID_UPLOAD_PURPOSE");
  return UPLOAD_LIMITS[purpose as UploadPurpose];
}

export function getFileLimit(filename?: string, purpose = "RESOURCE"): number {
  const ext = filename?.split(".").at(-1)?.toLowerCase() || "";
  const extLimit = EXTENSION_UPLOAD_LIMITS[ext];
  const purposeLimit = uploadLimit(purpose);
  return extLimit ? Math.min(extLimit, purposeLimit) : purposeLimit;
}

export function validateUploadSize(size: number, purpose: string, filename?: string): void {
  const max = filename ? getFileLimit(filename, purpose) : uploadLimit(purpose);
  if (!Number.isSafeInteger(size) || size <= 0 || size > max) {
    throw new Error("FILE_TYPE_OR_SIZE");
  }
}

