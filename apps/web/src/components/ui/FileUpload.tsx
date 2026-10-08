import { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { uploadFile } from "../../services/api";
import { uploadLimit } from "../../../../../packages/shared/src/files";
import { Notice } from "./Notice";
import labels from "../../../../../packages/shared/src/id.json";

export interface FileUploadProps {
  classId: string;
  purpose?: string;
  contextId?: string;
  onUploaded: (file: any) => void;
  accept?: string;
}

export function FileUpload({
  classId,
  purpose = "RESOURCE",
  contextId,
  onUploaded,
  accept,
}: FileUploadProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    name: string;
    size?: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
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
      onUploaded(res);
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

  const cleanAcceptText = () => {
    if (!accept) return "Semua format berkas umum didukung";
    return accept
      .split(",")
      .map((ext) => ext.trim().replace(/^\./, "").toUpperCase())
      .join(", ");
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
                  Format: {cleanAcceptText()} (Maks. {uploadLimit(purpose) / 1024 / 1024} MB)
                </p>
                <p className="dropzone-compression-tip" style={{ fontSize: "0.76rem", color: "var(--muted, #64748b)", margin: "4px 0 0" }}>
                  💡 Maksimal ukuran berkas {uploadLimit(purpose) / 1024 / 1024} MB. Jika ukuran berkas terlalu besar, gunakan kompresi PDF/dokumen atau arsipkan dalam format ZIP terlebih dahulu.
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
