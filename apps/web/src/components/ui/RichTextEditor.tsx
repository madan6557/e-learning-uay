import { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Eye,
  Edit3,
} from "lucide-react";
import { Html } from "../../Content";

export function formatContentHtml(raw?: string | null): string {
  if (!raw || !raw.trim()) return "";
  if (/<(p|div|ul|ol|h[1-6]|blockquote|table|hr)\b/i.test(raw)) {
    return raw;
  }
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  rows?: number;
  minHeight?: number | string;
  required?: boolean;
  compact?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  name,
  placeholder,
  rows = 5,
  minHeight,
  required,
  compact = false,
  disabled = false,
  id,
  className = "",
}: RichTextEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (before: string, after: string, placeholderText = "") => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) {
      onChange(value + before + placeholderText + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const newValue =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    }, 0);
  };

  return (
    <div className={`rich-editor-container ${className}`}>
      {/* Hidden textarea to guarantee FormData captures value even if in preview mode */}
      {name && (
        <textarea
          name={name}
          value={value}
          readOnly
          required={required && !value.trim()}
          style={{ display: "none" }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Formatting Toolbar */}
      <div className="rich-editor-toolbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <button
            type="button"
            title="Teks Tebal"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<strong>", "</strong>", "Teks Tebal")}
          >
            <Bold size={13} /> {!compact && "Tebal"}
          </button>
          <button
            type="button"
            title="Teks Miring"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<em>", "</em>", "Teks Miring")}
          >
            <Italic size={13} /> {!compact && "Miring"}
          </button>
          <button
            type="button"
            title="Garis Bawah"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<u>", "</u>", "Garis Bawah")}
          >
            <Underline size={13} /> {!compact && "Garis Bawah"}
          </button>

          {!compact && (
            <button
              type="button"
              title="Subjudul"
              disabled={disabled || mode === "preview"}
              onClick={() => insertTag("<h3>", "</h3>", "Subjudul Poin")}
            >
              <Heading size={13} /> Subjudul
            </button>
          )}

          <div className="toolbar-divider" />

          <button
            type="button"
            title="Daftar Poin (Bullet)"
            disabled={disabled || mode === "preview"}
            onClick={() =>
              insertTag(
                "<ul>\n  <li>",
                "</li>\n  <li>Poin berikutnya</li>\n</ul>",
                "Poin pertama",
              )
            }
          >
            <List size={13} /> {!compact && "Poin"}
          </button>
          <button
            type="button"
            title="Daftar Nomor"
            disabled={disabled || mode === "preview"}
            onClick={() =>
              insertTag(
                "<ol>\n  <li>",
                "</li>\n  <li>Langkah berikutnya</li>\n</ol>",
                "Langkah pertama",
              )
            }
          >
            <ListOrdered size={13} /> {!compact && "Nomor"}
          </button>
          <button
            type="button"
            title="Kotak Catatan / Sorotan"
            disabled={disabled || mode === "preview"}
            onClick={() =>
              insertTag(
                '<blockquote class="callout-box">\n  <strong>Catatan:</strong> ',
                "\n</blockquote>",
                "Tuliskan instruksi atau catatan penting di sini...",
              )
            }
          >
            <Quote size={13} /> {!compact && "Catatan"}
          </button>

          <button
            type="button"
            title="Sisipkan Tautan Web"
            disabled={disabled || mode === "preview"}
            onClick={() => {
              const url = prompt(
                "Masukkan URL tautan (contoh: https://uay.ac.id):",
                "https://",
              );
              if (url) {
                insertTag(
                  `<a href="${url}" target="_blank" rel="noopener noreferrer">`,
                  "</a>",
                  "Teks Tautan",
                );
              }
            }}
          >
            <LinkIcon size={13} /> {!compact && "Tautan"}
          </button>

          <button
            type="button"
            title="Kode / Monospace"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<code>", "</code>", "kode")}
          >
            <Code size={13} /> {!compact && "Kode"}
          </button>
        </div>

        {/* Mode Toggle (Tulis / Pratinjau) */}
        <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <button
            type="button"
            style={{
              background: mode === "edit" ? "var(--primary, #0284c7)" : "#ffffff",
              color: mode === "edit" ? "#ffffff" : "var(--foreground, #334155)",
              borderColor: mode === "edit" ? "var(--primary, #0284c7)" : undefined,
            }}
            onClick={() => setMode("edit")}
            title="Mode Editor Teks"
          >
            <Edit3 size={13} /> Tulis
          </button>
          <button
            type="button"
            style={{
              background: mode === "preview" ? "var(--primary, #0284c7)" : "#ffffff",
              color: mode === "preview" ? "#ffffff" : "var(--foreground, #334155)",
              borderColor: mode === "preview" ? "var(--primary, #0284c7)" : undefined,
            }}
            onClick={() => setMode("preview")}
            title="Pratinjau Hasil Format"
          >
            <Eye size={13} /> Pratinjau
          </button>
        </div>
      </div>

      {/* Editor Body or Preview Body */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          id={id}
          className="rich-editor-textarea"
          rows={rows}
          style={{ minHeight }}
          placeholder={placeholder || "Tuliskan konten dengan format teks rapi di sini..."}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          className="rich-editor-textarea formatted-content announcement-content-body"
          style={{
            minHeight: minHeight ?? (rows ? rows * 28 : 120),
            maxHeight: 480,
            overflowY: "auto",
            background: "var(--surface-subtle, #fafafa)",
            padding: "14px 16px",
          }}
        >
          {value.trim() ? (
            <Html text={formatContentHtml(value)} inline={false} />
          ) : (
            <span style={{ color: "var(--muted, #94a3b8)", fontStyle: "italic" }}>
              (Belum ada teks untuk dipratinjau. Ketik pada mode Tulis terlebih dahulu.)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
