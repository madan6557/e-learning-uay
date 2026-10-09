import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Download, FileText } from "lucide-react";
import { confirmAction } from "../../confirm";
import { Modal } from "./Modal";
import { Field } from "./Field";
import { Notice } from "./Notice";

export interface AiPromptTemplate {
  id: string;
  title: string;
  subtitle: string;
  downloadUrl: string;
  downloadFileName: string;
  promptText: string;
  sampleHtml: string;
}

export function AiPromptModal({
  templates,
  initialTemplate,
  hasContent,
  disabled,
  onInsert,
  onClose,
}: {
  templates: Record<string, AiPromptTemplate>;
  initialTemplate: string;
  hasContent: boolean;
  disabled?: boolean;
  onInsert: (html: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(initialTemplate);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const template = templates[selected] ?? Object.values(templates)[0];

  return createPortal(
    <Modal
      title="Template Prompt AI — E-Learning UAY"
      onClose={onClose}
      className="ai-prompt-modal"
    >
      <div className="modal-body ai-prompt-body">
        <Field label="Template prompt">
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setCopied(false);
              setCopyError("");
            }}
          >
            {Object.values(templates).map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </Field>
        <p>{template.subtitle}</p>
        <p className="ai-prompt-help">
          <strong>Cara pakai:</strong> salin prompt ke AI pilihan Anda,
          sesuaikan bagian <code>[kurung siku]</code>, lalu tempelkan hasilnya
          ke editor.
        </p>
        {copyError && <Notice error={copyError} />}
        <textarea
          ref={promptRef}
          className="ai-prompt-text"
          aria-label="Teks prompt AI"
          value={template.promptText}
          readOnly
        />
      </div>
      <div className="form-actions ai-prompt-actions">
        <a
          className="secondary"
          href={template.downloadUrl}
          download={template.downloadFileName}
        >
          <Download size={16} /> Unduh .txt
        </a>
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          onClick={async () => {
            if (
              disabled ||
              (hasContent &&
                !(await confirmAction(
                  "Ganti isi editor dengan contoh format? Isian saat ini akan diganti.",
                )))
            )
              return;
            onInsert(template.sampleHtml);
            onClose();
          }}
        >
          <FileText size={16} /> Sisipkan contoh format
        </button>
        <button type="button" className="secondary" onClick={onClose}>
          Tutup
        </button>
        <button
          type="button"
          className="primary"
          onClick={async () => {
            setCopyError("");
            try {
              await navigator.clipboard.writeText(template.promptText);
              setCopied(true);
            } catch {
              setCopied(false);
              setCopyError(
                "Tidak dapat menyalin otomatis. Salin teks prompt secara manual atau unduh file .txt.",
              );
              promptRef.current?.focus();
              promptRef.current?.select();
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Prompt berhasil disalin" : "Salin prompt AI"}
        </button>
      </div>
    </Modal>,
    document.body,
  );
}
