/**
 * Web Library & Compatibility Layer
 * Re-exports modular services, hooks, and UI primitives for convenient access.
 */
import { formatDateTime, formatClock, localDateTimeInput, localInputToUtc } from "../../../packages/shared/src/time";
import { navigate } from "./router";
import labels from "../../../packages/shared/src/id.json";

// Shared helpers and date utilities
export { uploadLimit, validateUploadSize } from "../../../packages/shared/src/files";
export { formatDateTime, formatClock, localDateTimeInput, localInputToUtc, localDateInput } from "../../../packages/shared/src/time";
export const clock = formatClock;
export const t = labels;
export const date = (value: string | Date | null | undefined) =>
  value ? formatDateTime(value) : "—";
export const day = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
export const localInput = localDateTimeInput;
export const isoInput = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  return localInputToUtc(String(value));
};
export const textValue = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export const numberValue = (form: FormData, key: string) =>
  Number(form.get(key));
export { navigate };

// Services (API, Auth, Uploads)
export {
  ApiError,
  setAuthToken,
  getAuthToken,
  parseJwtPayload,
  api,
  uploadFile,
} from "./services/api";

// Hooks
export { useApi } from "./hooks/useApi";
export { usePagination } from "./hooks/usePagination";

// UI Components
export {
  Action,
  Badge,
  Field,
  FileUpload,
  Form,
  Loading,
  Modal,
  Notice,
  Pagination,
  Empty,
  EmptyState,
  Status,
  captureForm,
} from "./components/ui";
export { GradeScoreInput } from "./components/ui/ScoreInput";
