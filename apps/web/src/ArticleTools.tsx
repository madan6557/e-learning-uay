import { useId, useState } from "react";
import {
  BookOpen,
  Braces,
  ChevronDown,
  Download,
  FileText,
  Upload,
  Paperclip,
} from "lucide-react";
import { articleImportMaxBytes } from "./articleImport";

export function ArticleTools({
  onImport,
  onAddAttachment,
}: {
  onImport: (json: string) => void;
  onAddAttachment: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");
  const hintId = useId();
  return (
    <div className="article-authoring-tools">
      <div className="article-editor-heading">
        <div>
          <h3>Isi artikel</h3>
          <p>Susun materi dengan blok teks, media, dan lampiran.</p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setError("");
            setSuccess("");
            try {
              onAddAttachment();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Paperclip size={16} aria-hidden="true" /> Sisipkan lampiran
        </button>
      </div>
      <details className="article-tools">
        <summary>
          <BookOpen size={18} aria-hidden="true" />
          <span className="article-tools-title">
            <strong>Panduan & artikel AI</strong>
            <small>Unduh panduan atau impor artikel dari AI.</small>
          </span>
          <ChevronDown
            size={18}
            className="article-tools-chevron"
            aria-hidden="true"
          />
        </summary>
        <div className="article-tools-body">
          <div className="article-downloads">
            <a
              href="/authoring/panduan-artikel.html"
              download="panduan-artikel-uay.html"
            >
              <BookOpen size={18} aria-hidden="true" />
              <span>
                <strong>Panduan</strong>
                <small>Blok & format artikel</small>
              </span>
              <Download size={15} aria-hidden="true" />
            </a>
            <a
              href="/authoring/prompt-artikel-ai.txt"
              download="prompt-artikel-ai-uay.txt"
            >
              <FileText size={18} aria-hidden="true" />
              <span>
                <strong>Prompt AI</strong>
                <small>Siap disalin ke AI</small>
              </span>
              <Download size={15} aria-hidden="true" />
            </a>
            <a
              href="/authoring/template-artikel.json"
              download="template-artikel-uay.json"
            >
              <Braces size={18} aria-hidden="true" />
              <span>
                <strong>Contoh JSON</strong>
                <small>Template isi artikel</small>
              </span>
              <Download size={15} aria-hidden="true" />
            </a>
          </div>
          <div className="article-import">
            <div className="article-import-heading">
              <strong>Impor artikel</strong>
              <label className="article-file-picker">
                <Upload size={15} aria-hidden="true" /> Pilih JSON
                <input
                  type="file"
                  aria-label="Pilih berkas JSON (maksimal 1 MB)"
                  accept=".json,application/json"
                  disabled={reading}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setError("");
                    setSuccess("");
                    setText("");
                    setFileName("");
                    if (file.size > articleImportMaxBytes) {
                      setError("Ukuran JSON maksimal 1 MB.");
                      return;
                    }
                    setReading(true);
                    try {
                      setText(await file.text());
                      setFileName(file.name);
                    } catch {
                      setError("Berkas tidak dapat dibaca. Coba pilih ulang.");
                    } finally {
                      setReading(false);
                    }
                  }}
                />
              </label>
            </div>
            <label className="field article-json-field">
              <span>Atau tempel JSON dari AI</span>
              <textarea
                rows={4}
                className="code-input"
                aria-describedby={hintId}
                disabled={reading}
                value={text}
                placeholder={'{"title":"Judul artikel","blocks":[...]}'}
                onChange={(event) => {
                  setText(event.target.value);
                  setFileName("");
                  setError("");
                  setSuccess("");
                }}
              />
            </label>
            <div className="article-import-actions">
              <small className="article-file-status" role="status">
                {reading
                  ? "Membaca berkas…"
                  : fileName || "Berkas JSON maksimal 1 MB"}
              </small>
              <button
                type="button"
                className="primary"
                disabled={!text.trim() || reading}
                onClick={() => {
                  setError("");
                  setSuccess("");
                  try {
                    onImport(text);
                    setText("");
                    setFileName("");
                    setSuccess(
                      "Artikel ditambahkan ke draf. Periksa isi sebelum menyimpan dan mempublikasikan.",
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <Upload size={15} aria-hidden="true" /> Tambahkan ke draf
              </button>
            </div>
            <p className="article-hint" id={hintId}>
              Blok ditambahkan di akhir isi. Judul yang sudah diisi tetap
              digunakan.
            </p>
          </div>
        </div>
      </details>
      {error && (
        <p role="alert" className="article-feedback article-error">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="article-feedback article-success">
          {success}
        </p>
      )}
    </div>
  );
}
