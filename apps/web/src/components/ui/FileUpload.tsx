import { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { uploadFile } from "../../services/api";
import { uploadLimit, getFileLimit } from "../../../../../packages/shared/src/files";
import { Notice } from "./Notice";
import labels from "../../../../../packages/shared/src/id.json";

export interface FileUploadProps {
  classId: string;
  purpose?: string;
  contextId?: string;
  onUploaded: (file: any) => void;
  accept?: string;
  existingFile?: { id: string; name: string };
  maxSizeMb?: number;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/jpg": "JPG",
  "image/webp": "WEBP",
  "application/png": "PNG",
  "application/jpeg": "JPEG",
  "application/jpg": "JPG",
  "application/webp": "WEBP",
  "application/pdf": "PDF",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/docx": "DOCX",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/pptx": "PPTX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/xlsx": "XLSX",
  "text/plain": "TXT",
  "application/txt": "TXT",
  "text/csv": "CSV",
  "application/csv": "CSV",
  "text/x-python": "PY",
  "video/mp4": "MP4",
  "application/mp4": "MP4",
  "video/webm": "WEBM",
};

export function cleanAcceptText(accept?: string): string {
  if (!accept || !accept.trim()) return "Semua format berkas umum didukung";
  const items = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const labelsList: string[] = [];

  for (const item of items) {
    let label = "";
    if (MIME_TO_EXT[item]) {
      label = MIME_TO_EXT[item];
    } else if (item.startsWith(".")) {
      label = item.slice(1).toUpperCase();
    } else if (!item.includes("/")) {
      label = item.toUpperCase();
    } else if (item.endsWith("/*")) {
      label = item.replace("/*", "").toUpperCase();
    }

    if (label && !seen.has(label)) {
      seen.add(label);
      labelsList.push(label);
    }
  }

  return labelsList.length > 0 ? labelsList.join(", ") : "Semua format berkas umum didukung";
}

export function isFileAccepted(file: File, accept?: string): boolean {
  if (!accept || !accept.trim()) return true;
  const extension = (file.name.split(".").at(-1) || "").toLowerCase();
  const fileMime = (file.type || "").toLowerCase();

  const tokens = accept
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  for (const token of tokens) {
    // 1. Extension token: ".png" or "png"
    if (!token.includes("/")) {
      const ext = token.startsWith(".") ? token.slice(1) : token;
      if (ext === extension) return true;
    }

    // 2. Wildcard MIME: "image/*", "video/*"
    if (token.endsWith("/*")) {
      const prefix = token.slice(0, token.indexOf("/*") + 1);
      if (fileMime.startsWith(prefix)) return true;
      if (prefix === "image/" && ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(extension)) return true;
      if (prefix === "video/" && ["mp4", "webm", "ogg", "mov"].includes(extension)) return true;
      if (prefix === "audio/" && ["mp3", "wav", "ogg", "m4a"].includes(extension)) return true;
    }

    // 3. Exact MIME token
    if (token.includes("/")) {
      if (fileMime && fileMime === token) return true;
      const extFromMime = MIME_TO_EXT[token]?.toLowerCase();
      if (extFromMime) {
        if (extFromMime === extension) return true;
        if (extFromMime === "jpeg" && extension === "jpg") return true;
        if (extFromMime === "jpg" && extension === "jpeg") return true;
      }
    }
  }

  return false;
}

export function FileUpload({
  classId,
  purpose = "RESOURCE",
  contextId,
  onUploaded,
  accept,
  existingFile,
  maxSizeMb,
}: FileUploadProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    name: string;
    size?: number;
  } | null>(existingFile ?? null);
  useEffect(() => {
    if (existingFile) setUploadedFile(existingFile);
  }, [existingFile?.id, existingFile?.name]);
  const inputRef = useRef<HTMLInputElement>(null);

  const isImageUpload =
    accept?.toLowerCase().includes("image") ||
    purpose === "COVER" ||
    (accept !== undefined &&
      accept
        .toLowerCase()
        .split(",")
        .every((t) =>
          ["png", "jpg", "jpeg", "webp", ".png", ".jpg", ".jpeg", ".webp"].includes(t.trim()),
        ));

  const isVideoUpload = purpose === "VIDEO" || accept?.toLowerCase().includes("video");

  const effectiveMaxMb =
    maxSizeMb ?? (isImageUpload ? 10 : uploadLimit(purpose) / (1024 * 1024));

  const handleFile = async (file: File) => {
    if (!file) return;

    if (!isFileAccepted(file, accept)) {
      setError(
        new Error(`Jenis berkas tidak didukung. Gunakan: ${cleanAcceptText(accept)}.`),
      );
      return;
    }

    const fileSpecificLimit = maxSizeMb ? maxSizeMb * 1024 * 1024 : getFileLimit(file.name, purpose);
    if (file.size > fileSpecificLimit) {
      const fileMaxMb = Math.round(fileSpecificLimit / (1024 * 1024));
      const isImage = /\.(png|jpe?g|webp)$/i.test(file.name) || file.type.startsWith("image/");
      const isVideo = /\.(mp4|webm)$/i.test(file.name) || file.type.startsWith("video/");
      setError(
        new Error(
          `Ukuran berkas ${file.name} (${formatFileSize(file.size)}) melebihi batas maksimal ${fileMaxMb} MB untuk jenis berkas ini. ${
            isImage
              ? "Silakan kompres atau perkecil resolusi gambar terlebih dahulu."
              : isVideo
                ? "Silakan kompres atau turunkan resolusi video terlebih dahulu."
                : "Silakan gunakan kompresi dokumen atau arsipkan dalam format ZIP terlebih dahulu."
          }`,
        ),
      );
      return;
    }

    setError(null);
    setProgress(0);
    try {
      const res = await uploadFile(
        file,
        classId,
        purpose,
        contextId,
        setProgress,
      );
      setUploadedFile({ id: res.id, name: file.name, size: file.size });
      onUploaded({ ...res, file });
    } catch (err) {
      setError(err as Error);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (progress === null) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (progress !== null) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="file-upload-wrapper">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: "none" }}
        disabled={progress !== null}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {uploadedFile && progress === null ? (
        <div className="uploaded-file-card">
          <div className="uploaded-file-info">
            <span className="file-icon-badge">
              <FileText size={20} />
            </span>
            <div className="uploaded-file-meta">
              <span className="uploaded-file-name" title={uploadedFile.name}>
                {uploadedFile.name}
              </span>
              {uploadedFile.size ? (
                <span className="uploaded-file-size">
                  {formatFileSize(uploadedFile.size)}
                </span>
              ) : null}
            </div>
            <span className="upload-success-pill">
              <CheckCircle2 size={14} /> Berhasil diunggah
            </span>
          </div>
          <button
            type="button"
            className="button secondary sm upload-change-btn"
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw size={14} />
            Ganti berkas
          </button>
        </div>
      ) : (
        <div
          className={`file-dropzone ${isDragging ? "is-dragging" : ""} ${progress !== null ? "is-uploading" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (progress === null) inputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (["Enter", " "].includes(e.key) && progress === null) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          {progress !== null ? (
            <div className="uploading-state">
              <LoaderCircle className="spin text-primary" size={28} />
              <div className="uploading-text">
                <span className="uploading-title">
                  {labels.uploading} {progress}%
                </span>
                <span className="uploading-subtitle">
                  Mohon jangan menutup halaman ini
                </span>
              </div>
              <progress
                className="upload-progress-bar"
                aria-label="Progres unggahan"
                value={progress}
                max={100}
              />
            </div>
          ) : (
            <div className="dropzone-content">
              <div className="dropzone-icon">
                <UploadCloud size={28} />
              </div>
              <div className="dropzone-text">
                <p className="dropzone-prompt">
                  <strong>Pilih berkas</strong> atau seret dan lepas ke sini
                </p>
                <p className="dropzone-hint">
                  Format: {cleanAcceptText(accept)} (Maks. {effectiveMaxMb} MB)
                </p>
                <p
                  className="dropzone-compression-tip"
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--muted, #64748b)",
                    margin: "4px 0 0",
                  }}
                >
                  {isVideoUpload
                    ? `Maksimal ${effectiveMaxMb} MB. Jika video terlalu besar, kompres atau turunkan resolusinya; tetap gunakan format MP4/WebM.`
                    : isImageUpload
                      ? `Maksimal ukuran gambar ${effectiveMaxMb} MB. Jika ukuran gambar terlalu besar, kompres atau perkecil resolusi gambar terlebih dahulu.`
                      : `Maksimal ukuran berkas ${effectiveMaxMb} MB. Jika ukuran berkas terlalu besar, gunakan kompresi PDF/dokumen atau arsipkan dalam format ZIP terlebih dahulu.`}
                </p>
              </div>
              <button
                type="button"
                className="button secondary sm dropzone-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                Cari berkas
              </button>
            </div>
          )}
        </div>
      )}

      {error && <Notice error={error} />}
    </div>
  );
}
