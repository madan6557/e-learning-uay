export const UPLOAD_LIMITS = {
  COVER: 5 * 1024 * 1024,
  RESOURCE: 50 * 1024 * 1024,
  SUBMISSION: 50 * 1024 * 1024,
  QUIZ_ANSWER: 50 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
} as const;

export type UploadPurpose = keyof typeof UPLOAD_LIMITS;

export function uploadLimit(purpose: string): number {
  if (!Object.hasOwn(UPLOAD_LIMITS, purpose)) throw new Error("INVALID_UPLOAD_PURPOSE");
  return UPLOAD_LIMITS[purpose as UploadPurpose];
}

export function validateUploadSize(size: number, purpose: string): void {
  if (!Number.isSafeInteger(size) || size <= 0 || size > uploadLimit(purpose)) {
    throw new Error("FILE_TYPE_OR_SIZE");
  }
}
