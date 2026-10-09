import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import katex from "katex";
import hljs from "highlight.js/lib/common";
import { ArticleTools } from "./ArticleTools";
import { useEditorViewMode } from "./useEditorViewMode";
import { importArticle } from "./articleImport";
import { VideoMetadata, videoSourceKey } from "./components/VideoMetadata";
import { VideoProgressViewer as VideoViewer } from "./components/VideoProgressViewer";
import { validVideoDuration } from "../../../packages/shared/src/video";
import {
  GripVertical,
  Plus,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  ExternalLink,
  CheckCircle2,
  Eye,
  Edit3,
  Columns,
} from "lucide-react";
import {
  blockTypes,
  type ContentBlock,
} from "../../../packages/shared/src/domain";
import {
  t,
  api,
  Action,
  Field,
  FileUpload,
  Form,
  Modal,
  Notice,
  date,
  localInput,
  isoInput,
  uploadFile,
} from "./lib";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

const defaults: Record<string, any> = {
  paragraph: { text: "" },
  heading: { text: "", level: 2 },
  image: { fileObjectId: "", altText: "", caption: "", alignment: "center" },
  code_snippet: {
    code: "",
    language: "javascript",
    filename: "",
    showLineNumbers: true,
  },
  math_latex: { expression: "" },
  callout: { title: "", text: "", alertType: "NOTE" },
  checklist: { items: [] },
  table: {
    rows: [
      ["", ""],
      ["", ""],
    ],
    header: true,
  },
  file_attachment: { fileObjectId: "", displayName: "" },
  embed_media: { url: "", title: "" },
  divider: {},
};
export const newBlock = (type: string): ContentBlock =>
  ({
    id: crypto.randomUUID(),
    type,
    data: structuredClone(defaults[type]),
  }) as ContentBlock;
export function Html({
  text,
  inline = true,
}: {
  text: string;
  inline?: boolean;
}) {
  const sanitized = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "code",
      "a",
      "mark",
      "span",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "hr",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    ALLOWED_ATTR: ["href", "title", "target", "rel", "class", "style"],
  });

  if (inline) {
    return <span dangerouslySetInnerHTML={{ __html: sanitized }} />;
  }
  return <div className="html-content" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
export function BlockEditor({
  blocks,
  onChange,
  classId,
}: {
  blocks: ContentBlock[];
  onChange: (value: ContentBlock[]) => void;
  classId: string;
}) {
  const [menu, setMenu] = useState<number | null>(null),
    [drag, setDrag] = useState<number | null>(null),
    [error, setError] = useState<Error | null>(null);
  const update = (index: number, data: any) =>
    onChange(
      blocks.map((b, i) =>
        i === index
          ? ({ ...b, data: { ...b.data, ...data } } as ContentBlock)
          : b,
      ),
    );
  const move = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };
  const insert = (type: string, index = blocks.length) => {
    const next = [...blocks];
    next.splice(index, 0, newBlock(type));
    onChange(next);
    setMenu(null);
  };
  const pasteImage = async (file: File) => {
    try {
      const uploaded = await uploadFile(
        file,
        classId,
        "RESOURCE",
        undefined,
        () => {},
      );
      onChange([
        ...blocks,
        {
          id: crypto.randomUUID(),
          type: "image",
          data: {
            fileObjectId: uploaded.id,
            altText: file.name,
            caption: "",
            alignment: "center",
          },
        },
      ]);
    } catch (e) {
      setError(e as Error);
    }
  };
  return (
    <div
      className="block-editor"
      onPaste={(e) => {
        const image = [...e.clipboardData.files].find((f) =>
          f.type.startsWith("image/"),
        );
        if (image) {
          e.preventDefault();
          void pasteImage(image);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          const image = [...e.dataTransfer.files].find((f) =>
            f.type.startsWith("image/"),
          );
          if (image) void pasteImage(image);
        }
      }}
    >
      {blocks.map((block, index) => {
        const data = block.data as any;
        return (
          <div
            className="editor-block"
            key={block.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (drag !== null) {
                e.preventDefault();
                move(drag, index);
                setDrag(null);
              }
            }}
          >
            <div className="block-toolbar">
              <button
                className="icon-button drag-handle"
                type="button"
                draggable
                onDragStart={() => setDrag(index)}
                aria-label="Seret untuk memindahkan blok"
              >
                <GripVertical size={16} />
              </button>
              <span>{(t as any)[block.type]}</span>
              <div className="toolbar">
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  aria-label={t.moveUp}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, index + 1)}
                  aria-label={t.moveDown}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t.duplicate}
                  onClick={() => {
                    const next = [...blocks];
                    next.splice(index + 1, 0, {
                      ...structuredClone(block),
                      id: crypto.randomUUID(),
                    });
                    onChange(next);
                  }}
                >
                  <Copy size={14} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t.delete}
                  onClick={() =>
                    onChange(blocks.filter((b) => b.id !== block.id))
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {["paragraph", "heading", "callout"].includes(block.type) && (
              <>
                {block.type === "heading" && (
                  <Field label={t.level}>
                    <select
                      value={data.level}
                      onChange={(e) =>
                        update(index, { level: Number(e.target.value) })
                      }
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          H{n}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                {block.type === "callout" && (
                  <div className="form-grid">
                    <Field label={t.title}>
                      <input
                        value={data.title}
                        onChange={(e) =>
                          update(index, { title: e.target.value })
                        }
                      />
                    </Field>
                    <Field label={t.status}>
                      <select
                        value={data.alertType}
                        onChange={(e) =>
                          update(index, { alertType: e.target.value })
                        }
                      >
                        {["NOTE", "TIP", "IMPORTANT", "WARNING", "CAUTION"].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </select>
                    </Field>
                  </div>
                )}
                <div className="inline-rich-toolbar">
                  {[
                    ["B", "strong", "Tebal"],
                    ["I", "em", "Miring"],
                    ["U", "u", "Garis bawah"],
                    ["</>", "code", "Kode inline"],
                  ].map(([label, tag, description]) => (
                    <button
                      type="button"
                      key={tag}
                      aria-label={description}
                      onClick={() => {
                        const el = document.getElementById(
                          `block-${block.id}`,
                        ) as HTMLTextAreaElement;
                        const start = el.selectionStart,
                          end = el.selectionEnd;
                        update(index, {
                          text:
                            data.text.slice(0, start) +
                            `<${tag}>` +
                            data.text.slice(start, end) +
                            `</${tag}>` +
                            data.text.slice(end),
                        });
                        el.focus();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  id={`block-${block.id}`}
                  aria-label={t.text}
                  value={data.text}
                  placeholder={t.slashHint}
                  onKeyDown={(e) => {
                    if (e.key === "/" && !data.text) {
                      e.preventDefault();
                      setMenu(index);
                    }
                  }}
                  onChange={(e) => update(index, { text: e.target.value })}
                />
              </>
            )}
            {block.type === "code_snippet" && (
              <>
                <div className="form-grid">
                  <Field label={t.language}>
                    <input
                      value={data.language}
                      onChange={(e) =>
                        update(index, { language: e.target.value })
                      }
                    />
                  </Field>
                  <Field label={t.filename}>
                    <input
                      value={data.filename}
                      onChange={(e) =>
                        update(index, { filename: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <textarea
                  className="code-input"
                  aria-label={t.code}
                  value={data.code}
                  onChange={(e) => update(index, { code: e.target.value })}
                />
              </>
            )}
            {block.type === "math_latex" && (
              <Field label={t.expression}>
                <textarea
                  value={data.expression}
                  onChange={(e) =>
                    update(index, { expression: e.target.value })
                  }
                />
              </Field>
            )}
            {block.type === "checklist" && (
              <Field label={t.checklist} hint={t.checklistHint}>
                <textarea
                  value={data.items.map((i: any) => i.text).join("\n")}
                  onChange={(e) =>
                    update(index, {
                      items: e.target.value.split("\n").map((text, i) => ({
                        id: data.items[i]?.id ?? crypto.randomUUID(),
                        text,
                        checked: false,
                      })),
                    })
                  }
                />
              </Field>
            )}
            {block.type === "table" && (
              <Field label={t.table} hint={t.tableHint}>
                <textarea
                  value={data.rows
                    .map((r: string[]) => r.join(" | "))
                    .join("\n")}
                  onChange={(e) =>
                    update(index, {
                      rows: e.target.value
                        .split("\n")
                        .map((row) =>
                          row.split(/\t|\|/).map((cell) => cell.trim()),
                        ),
                    })
                  }
                />
              </Field>
            )}
            {["image", "file_attachment"].includes(block.type) && (
              <div className="editor-media-fields">
                <div className="editor-media-upload">
                  <FileUpload
                    classId={classId}
                    accept={
                      block.type === "image"
                        ? "image/png,image/jpeg,image/webp"
                        : undefined
                    }
                    onUploaded={(f) =>
                      update(index, {
                        fileObjectId: f.id,
                        ...(block.type === "image"
                          ? { altText: f.name }
                          : { displayName: f.name }),
                      })
                    }
                  />
                  {data.fileObjectId && (
                    <small className="editor-file-saved">
                      <CheckCircle2 size={14} aria-hidden="true" /> {t.saved}
                    </small>
                  )}
                  {block.type === "file_attachment" && (
                    <small className="editor-upload-hint">
                      Maksimal 50 MB. Peserta dapat mengunduh lampiran dari
                      artikel.
                    </small>
                  )}
                </div>
                <Field label={block.type === "image" ? t.altText : t.filename}>
                  <input
                    value={
                      block.type === "image" ? data.altText : data.displayName
                    }
                    onChange={(e) =>
                      update(index, {
                        [block.type === "image" ? "altText" : "displayName"]:
                          e.target.value,
                      })
                    }
                  />
                </Field>
                {block.type === "image" && (
                  <Field label={t.caption}>
                    <input
                      value={data.caption}
                      onChange={(e) =>
                        update(index, { caption: e.target.value })
                      }
                    />
                  </Field>
                )}
              </div>
            )}
            {block.type === "embed_media" && (
              <>
                <Field label={t.title}>
                  <input
                    value={data.title}
                    onChange={(e) => update(index, { title: e.target.value })}
                  />
                </Field>
                <Field label={t.url}>
                  <input
                    type="url"
                    value={data.url}
                    onChange={(e) => update(index, { url: e.target.value })}
                  />
                </Field>
              </>
            )}
            {block.type === "divider" && <hr />}
            {menu === index && (
              <div className="block-menu">
                {blockTypes.map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => {
                      onChange(
                        blocks.map((b, i) =>
                          i === index ? newBlock(type) : b,
                        ),
                      );
                      setMenu(null);
                    }}
                  >
                    {(t as any)[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="add-block">
        <select
          aria-label={t.addBlock}
          value=""
          onChange={(e) => insert(e.target.value)}
        >
          <option value="">+ {t.addBlock}</option>
          {blockTypes.map((type) => (
            <option key={type} value={type}>
              {(t as any)[type]}
            </option>
          ))}
        </select>
      </div>
      {error && <Notice error={error} onClose={() => setError(null)} />}
    </div>
  );
}
export function ResourceEditor({
  resource,
  sectionId,
  classId,
  user,
  onClose,
  onSaved,
}: {
  resource?: any;
  sectionId: string;
  classId: string;
  user: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<any>({
    title: resource?.title ?? "",
    resourceType: resource?.resourceType ?? "RICH_TEXT",
    dynamicPayload: resource?.dynamicPayload ?? {
      blocks: [newBlock("paragraph")],
      minWatchPercent: 85,
    },
    isVisible: resource?.isVisible ?? false,
    availableFrom: resource?.availableFrom ?? null,
    availableUntil: resource?.availableUntil ?? null,
  });
  const change = setDraft;
  const payload = (data: any) =>
    change((current: any) => ({
      ...current,
      dynamicPayload: { ...current.dynamicPayload, ...data },
    }));

  const isRich = ["RICH_TEXT", "LAB_PRACTICUM"].includes(draft.resourceType);
  const { viewMode, setViewMode, canSplit } = useEditorViewMode();
  const [previewChecked, setPreviewChecked] = useState<string[]>([]);
  const [videoMetadata, setVideoMetadata] = useState<{
    source: string;
    duration?: number;
  }>({ source: "" });
  const videoReady =
    videoMetadata.source === videoSourceKey(draft.dynamicPayload) &&
    validVideoDuration(videoMetadata.duration ?? 0);

  const editorFields = (
    <>
      <div className="resource-metadata-grid">
        <Field label={t.title}>
          <input
            required
            value={draft.title}
            onChange={(e) => change({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label={t.material}>
          <select
            disabled={!!resource}
            value={draft.resourceType}
            onChange={(e) =>
              change({ ...draft, resourceType: e.target.value })
            }
          >
            {Object.entries(t.resourceTypes).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {["DOCUMENT", "LAB_PRACTICUM"].includes(draft.resourceType) && (
        <>
          <FileUpload
            classId={classId}
            purpose="RESOURCE"
            accept={
              draft.resourceType === "DOCUMENT"
                ? "application/pdf"
                : undefined
            }
            onUploaded={(f) =>
              payload({ fileObjectId: f.id, fileName: f.name })
            }
          />
          {draft.dynamicPayload.fileObjectId && (
            <p>{draft.dynamicPayload.fileName ?? t.saved}</p>
          )}
        </>
      )}
      {draft.resourceType === "VIDEO_MEDIA" && (
        <>
          <Field label="Tautan video (YouTube atau MP4/WebM)">
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={draft.dynamicPayload.url ?? ""}
              onChange={(e) =>
                payload({
                  url: e.target.value,
                  fileObjectId: undefined,
                  fileName: undefined,
                  durationSeconds: undefined,
                })
              }
            />
          </Field>
          {!draft.dynamicPayload.url && (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  margin: "8px 0 4px",
                }}
              >
                Atau unggah berkas video (MP4/WebM):
              </p>
              <FileUpload
                classId={classId}
                purpose="VIDEO"
                accept="video/mp4,video/webm"
                existingFile={
                  draft.dynamicPayload.fileObjectId
                    ? {
                        id: draft.dynamicPayload.fileObjectId,
                        name: draft.dynamicPayload.fileName ?? "Video materi tersimpan",
                      }
                    : undefined
                }
                onUploaded={(f) =>
                  payload({
                    fileObjectId: f.id,
                    fileName: f.name,
                    url: undefined,
                    durationSeconds: undefined,
                  })
                }
              />
            </>
          )}
        </>
      )}
      {draft.resourceType === "DOCUMENT" && (
        <Field label={t.totalPages}>
          <input
            type="number"
            required
            min={1}
            max={10000}
            value={draft.dynamicPayload.totalPages ?? ""}
            onChange={(e) => payload({ totalPages: Number(e.target.value) })}
          />
        </Field>
      )}
      {draft.resourceType === "VIDEO_MEDIA" && (
        <>
          <VideoMetadata
            payload={draft.dynamicPayload}
            onDetected={(source, duration) =>
              setVideoMetadata({ source, duration })
            }
          />
          <Field label={t.watchThreshold}>
            <input
              type="number"
              min={1}
              max={100}
              required
              value={draft.dynamicPayload.minWatchPercent ?? 85}
              onChange={(e) =>
                payload({ minWatchPercent: Number(e.target.value) })
              }
            />
          </Field>
        </>
      )}
      {["EXTERNAL_LINK", "VIRTUAL_SIMULATOR", "TELECONFERENCE"].includes(
        draft.resourceType,
      ) && (
        <Field label={t.url}>
          <input
            type="url"
            required
            value={draft.dynamicPayload.url ?? ""}
            onChange={(e) => payload({ url: e.target.value })}
          />
        </Field>
      )}
      {isRich && (
        <ArticleTools
          onAddAttachment={() => {
            const blocks = draft.dynamicPayload.blocks ?? [];
            if (blocks.length >= 300)
              throw new Error("Total isi materi maksimal 300 blok.");
            payload({ blocks: [...blocks, newBlock("file_attachment")] });
          }}
          onImport={(text) => {
            const article = importArticle(text, {
              title: draft.title,
              blocks: draft.dynamicPayload.blocks ?? [],
            });
            change({
              ...draft,
              title: article.title,
              dynamicPayload: {
                ...draft.dynamicPayload,
                blocks: article.blocks,
              },
            });
          }}
        />
      )}
      {isRich && (
        <BlockEditor
          blocks={draft.dynamicPayload.blocks ?? []}
          onChange={(blocks) => payload({ blocks })}
          classId={classId}
        />
      )}
      <div className="form-grid">
        <Field label={t.opens}>
          <input
            type="datetime-local"
            value={localInput(draft.availableFrom)}
            onChange={(e) =>
              change({ ...draft, availableFrom: isoInput(e.target.value) })
            }
          />
        </Field>
        <Field label={t.closes}>
          <input
            type="datetime-local"
            value={localInput(draft.availableUntil)}
            onChange={(e) =>
              change({ ...draft, availableUntil: isoInput(e.target.value) })
            }
          />
        </Field>
      </div>
    </>
  );

  const previewPanel = (
    <div
      className="resource-viewer"
      style={{
        background: "var(--surface, #ffffff)",
        padding: "20px 22px",
        borderRadius: 12,
        border: "1px solid var(--border, #e2e8f0)",
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.04)",
      }}
    >
      <div
        className="resource-caption"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "1px solid var(--border-subtle, #f1f5f9)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span
            className="badge"
            style={{
              padding: "4px 9px",
              borderRadius: 5,
              fontSize: "0.76rem",
              fontWeight: 700,
              background: "rgba(2, 132, 199, 0.12)",
              color: "var(--primary, #0284c7)",
              letterSpacing: "0.02em",
            }}
          >
            {(t.resourceTypes as any)[draft.resourceType] || "Materi Teks"}
          </span>
          <span
            className="badge"
            style={{
              padding: "4px 9px",
              borderRadius: 5,
              fontSize: "0.76rem",
              fontWeight: 600,
              background: draft.isVisible ? "rgba(16, 185, 129, 0.12)" : "rgba(100, 116, 139, 0.12)",
              color: draft.isVisible ? "#059669" : "#64748b",
            }}
          >
            {draft.isVisible ? "Status: Terbit" : "Status: Draf"}
          </span>
        </div>
        {draft.availableFrom && (
          <span style={{ fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
            Akses: {date(draft.availableFrom)}
          </span>
        )}
      </div>

      <h2
        style={{
          fontSize: "1.35rem",
          fontWeight: 800,
          margin: "0 0 16px 0",
          color: "var(--foreground, #0f172a)",
          lineHeight: 1.35,
        }}
      >
        {draft.title.trim() || (
          <span style={{ color: "#94a3b8", fontStyle: "italic", fontWeight: 400 }}>
            Judul Materi Pembelajaran
          </span>
        )}
      </h2>

      {draft.dynamicPayload?.blocks && draft.dynamicPayload.blocks.length > 0 ? (
        <Blocks
          blocks={draft.dynamicPayload.blocks}
          resourceId={resource?.id}
          checked={previewChecked}
          onCheck={setPreviewChecked}
        />
      ) : (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "#94a3b8",
            fontStyle: "italic",
            background: "var(--surface-muted, #f8fafc)",
            borderRadius: 8,
            border: "1px dashed var(--border, #cbd5e1)",
          }}
        >
          Belum ada isi materi. Tambahkan blok teks, judul, gambar, atau kode pada formulir editor di kiri untuk melihat pratinjau langsung.
        </div>
      )}
    </div>
  );

  return (
    <Modal
      title={resource ? t.edit : t.newResource}
      onClose={onClose}
      wide={!isRich || viewMode !== "split"}
      fullScreen={isRich && viewMode === "split"}
    >
      {isRich && (
        <div className="announcement-viewmode-bar">
          <div className="segmented-buttons">
            <button
              type="button"
              className={viewMode === "edit" ? "active" : ""}
              onClick={() => setViewMode("edit")}
              aria-pressed={viewMode === "edit"}
            >
              <Edit3 size={13} />
              Tulis
            </button>
            <button
              type="button"
              className={viewMode === "preview" ? "active" : ""}
              onClick={() => setViewMode("preview")}
              aria-pressed={viewMode === "preview"}
            >
              <Eye size={13} />
              Pratinjau
            </button>
            {canSplit && <button
              type="button"
              className={viewMode === "split" ? "active" : ""}
              onClick={() => setViewMode("split")}
              aria-pressed={viewMode === "split"}
            >
              <Columns size={13} />
              Berdampingan
            </button>}
          </div>

          <div style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
            {viewMode === "split" ? (
              <span>
                Mode <strong>Berdampingan</strong>: Formulir blok materi di kiri, pratinjau di kanan.
              </span>
            ) : viewMode === "preview" ? (
              <span>
                Mode <strong>Pratinjau</strong>: Tampilan membaca materi sebagaimana dilihat mahasiswa.
              </span>
            ) : (
              <span>
                Mode <strong>Tulis</strong>: Fokus penyusunan blok materi pembelajaran.
              </span>
            )}
          </div>
        </div>
      )}

      <Form
        draftKey={`resource:${resource?.id ?? sectionId}`}
        draftValue={draft}
        draftVersion={resource?.updatedAt}
        onRestoreDraft={setDraft}
        onCancel={onClose}
        submitDisabled={draft.resourceType === "VIDEO_MEDIA" && !videoReady}
        disabledReason="Penyimpanan tersedia setelah durasi video berhasil dibaca. Periksa sumber video atau baca ulang durasinya."
        publication={{
          published: resource?.isVisible ?? false,
          onUnpublish: resource
            ? async () => {
                await api(`/resources/${resource.id}/unpublish`, "POST", {});
                onSaved();
              }
            : undefined,
        }}
        onSubmit={async (_, intent) => {
          await api(
            resource
              ? `/resources/${resource.id}`
              : `/sections/${sectionId}/resources`,
            resource ? "PATCH" : "POST",
            {
              ...draft,
              dynamicPayload:
                draft.resourceType === "VIDEO_MEDIA"
                  ? {
                      ...draft.dynamicPayload,
                      durationSeconds: videoMetadata.duration,
                    }
                  : draft.dynamicPayload,
              isVisible: intent === "publish",
            },
          );
          onSaved();
        }}
      >
        {isRich && viewMode === "split" ? (
          <div className="announcement-split-container">
            <div className="announcement-editor-left">{editorFields}</div>
            <div className="announcement-preview-panel">
              <div className="announcement-preview-panel-header">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    color: "var(--foreground, #0f172a)",
                  }}
                >
                  <Eye size={15} style={{ color: "var(--primary, #0284c7)" }} />
                  Pratinjau Materi (Tampilan Mahasiswa)
                </div>
                <span
                  style={{
                    fontSize: "0.74rem",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  Tampilan Pembaca
                </span>
              </div>
              <div className="announcement-preview-scroll">
                {previewPanel}
              </div>
            </div>
          </div>
        ) : isRich && viewMode === "preview" ? (
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "10px 0" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontWeight: 700,
                fontSize: "0.85rem",
                color: "var(--muted, #64748b)",
                marginBottom: 12,
              }}
            >
              <Eye size={15} style={{ color: "var(--primary, #0284c7)" }} />
              Pratinjau Nyata bagi Mahasiswa
            </div>
            {previewPanel}
          </div>
        ) : (
          editorFields
        )}
      </Form>
    </Modal>
  );
}
export function DownloadButton({
  fileId,
  resourceId,
  label = t.download,
  onComplete,
}: {
  fileId: string;
  resourceId?: string;
  label?: string;
  onComplete?: () => void;
}) {
  return (
    <Action
      run={async () => {
        try {
          const ticket = await api(`/files/${fileId}/download-ticket`, "POST", {
            resourceId,
          });
          const response = await fetch(ticket.url);
          if (!response.ok) throw new Error(t.connectionError);
          const blob = await response.blob(),
            url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = ticket.name;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          if (resourceId && onComplete) {
            await api(`/resources/${resourceId}/confirm-download`, "POST", {
              fileObjectId: fileId,
            });
            onComplete();
          }
        } catch (e: any) {
          const msg = e?.message || "";
          if (msg.includes("menolak") || msg.includes("FILE_SERVICE") || msg.includes("502")) {
            throw new Error("Layanan berkas sedang dalam proses sinkronisasi sistem. Silakan coba unduh kembali beberapa saat lagi.");
          }
          throw e;
        }
      }}
    >
      <Download size={16} />
      {label}
    </Action>
  );
}
function FileImage({ data, resourceId }: { data: any; resourceId?: string }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!data.fileObjectId) return;
    let active = true;
    api(`/files/${data.fileObjectId}/download-ticket`, "POST", {
      resourceId: resourceId || undefined,
      inline: true,
    })
      .then((ticket) => {
        if (active) setUrl(ticket.url);
      })
      .catch((e) => {
        if (active) setError(e);
      });
    return () => {
      active = false;
    };
  }, [data.fileObjectId, resourceId]);
  return error ? (
    <Notice error={error} />
  ) : (
    <figure>
      {url && <img src={url} alt={data.altText} loading="lazy" />}
      <figcaption>{data.caption}</figcaption>
    </figure>
  );
}
export function Blocks({
  blocks,
  resourceId,
  checked = [],
  onCheck,
}: {
  blocks: ContentBlock[];
  resourceId?: string;
  checked?: string[];
  onCheck?: (ids: string[]) => void;
}) {
  return (
    <div className="reading-content">
      {blocks.map((block) => {
        const d = block.data as any;
        switch (block.type) {
          case "paragraph":
            return (
              <p key={block.id}>
                <Html text={d.text} />
              </p>
            );
          case "heading": {
            const Tag = `h${d.level}` as "h1" | "h2" | "h3";
            return (
              <Tag key={block.id} id={`heading-${block.id}`}>
                <Html text={d.text} />
              </Tag>
            );
          }
          case "callout":
            return (
              <aside
                className={`callout ${d.alertType.toLowerCase()}`}
                key={block.id}
              >
                <strong>{d.title}</strong>
                <p>
                  <Html text={d.text} />
                </p>
              </aside>
            );
          case "code_snippet":
            return (
              <div key={block.id} className="code-block">
                <div>
                  <span>{d.filename || d.language}</span>
                  <Action
                    className="text-button"
                    run={() => navigator.clipboard.writeText(d.code)}
                  >
                    <Copy size={14} />
                    {t.copy}
                  </Action>
                </div>
                <pre>
                  <code
                    dangerouslySetInnerHTML={{
                      __html: hljs.getLanguage(d.language)
                        ? hljs.highlight(d.code, { language: d.language }).value
                        : hljs.highlightAuto(d.code).value,
                    }}
                  />
                </pre>
              </div>
            );
          case "math_latex":
            return (
              <div
                key={block.id}
                className="math-block"
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(d.expression, {
                    throwOnError: false,
                    trust: false,
                    strict: "warn",
                    displayMode: true,
                    maxExpand: 1000,
                  }),
                }}
              />
            );
          case "checklist":
            return (
              <div key={block.id} className="checklist">
                {d.items.map((item: any) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={checked.includes(item.id)}
                      disabled={!onCheck}
                      onChange={(e) =>
                        onCheck?.(
                          e.target.checked
                            ? [...checked, item.id]
                            : checked.filter((id) => id !== item.id),
                        )
                      }
                    />
                    <span>{item.text}</span>
                  </label>
                ))}
              </div>
            );
          case "table":
            return (
              <div key={block.id} className="table-wrap">
                <table>
                  {d.header && (
                    <thead>
                      <tr>
                        {d.rows[0]?.map((cell: string, i: number) => (
                          <th key={i}>{cell}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {d.rows
                      .slice(d.header ? 1 : 0)
                      .map((row: string[], i: number) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            );
          case "image":
            return (
              <FileImage key={block.id} data={d} resourceId={resourceId} />
            );
          case "file_attachment":
            return (
              <div key={block.id} className="attachment">
                <span>{d.displayName}</span>
                <DownloadButton
                  fileId={d.fileObjectId}
                  resourceId={resourceId}
                />
              </div>
            );
          case "embed_media":
            return (
              <iframe
                key={block.id}
                title={d.title}
                src={d.url}
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            );
          default:
            return <hr key={block.id} />;
        }
      })}
    </div>
  );
}
export function ResourceViewer({
  resource,
  cls,
  user,
  onClose,
  reload,
}: {
  resource: any;
  cls: any;
  user: any;
  onClose: () => void;
  reload: () => void;
}) {
  const p = resource.dynamicPayload;
  const initial = cls.progress.text.find(
    (v: any) => v.resourceItemId === resource.id,
  );
  const [checked, setChecked] = useState<string[]>(initial?.checklistIds ?? []),
    [done, setDone] = useState(!!initial),
    [error, setError] = useState<Error | null>(null);
  const writable =
    !cls.canManage &&
    cls.status !== "ARCHIVED" &&
    cls.course.status !== "ARCHIVED";
  return (
    <Modal title={resource.title} onClose={onClose} wide>
      <div className="resource-viewer">
        <div className="resource-caption">
          <span>{(t.resourceTypes as any)[resource.resourceType]}</span>
          {done && (
            <span>
              <CheckCircle2 size={16} />
              {t.completed}
            </span>
          )}
        </div>
        {["RICH_TEXT", "LAB_PRACTICUM"].includes(resource.resourceType) && (
          <Blocks
            blocks={p.blocks ?? []}
            resourceId={resource.id}
            checked={checked}
            onCheck={writable ? setChecked : undefined}
          />
        )}{" "}
        {resource.resourceType === "DOCUMENT" && (
          <PdfViewer
            fileId={p.fileObjectId}
            resourceId={resource.id}
            totalPages={p.totalPages}
            writable={writable}
          />
        )}{" "}
        {resource.resourceType === "VIDEO_MEDIA" && (
          <VideoViewer
            key={resource.id}
            resource={resource}
            previous={cls.progress.video.find(
              (v: any) => v.resourceItemId === resource.id,
            )}
            writable={writable}
          />
        )}
        {resource.resourceType === "VIRTUAL_SIMULATOR" && (
          <iframe
            title={resource.title}
            src={p.url}
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        )}
        {["TELECONFERENCE", "EXTERNAL_LINK"].includes(
          resource.resourceType,
        ) && (
          <a className="button" href={p.url} target="_blank" rel="noreferrer">
            {resource.title}
            <ExternalLink size={16} />
          </a>
        )}
        {p.fileObjectId && !p.url && (
          <DownloadButton
            fileId={p.fileObjectId}
            resourceId={resource.id}
            onComplete={
              writable
                ? () => {
                    setDone(true);
                    reload();
                  }
                : undefined
            }
          />
        )}{" "}
        {writable &&
          !["VIDEO_MEDIA", "DOCUMENT"].includes(resource.resourceType) &&
          !(resource.resourceType === "LAB_PRACTICUM" && p.fileObjectId) && (
            <div className="form-actions">
              <Action
                className="primary"
                run={async () => {
                  await api(`/resources/${resource.id}/progress`, "POST", {
                    checklistIds: checked,
                  });
                  setDone(true);
                  reload();
                }}
              >
                <CheckCircle2 size={17} />
                {t.markComplete}
              </Action>
            </div>
          )}
        {error && <Notice error={error} onClose={() => setError(null)} />}
      </div>
    </Modal>
  );
}
function PdfViewer({
  fileId,
  resourceId,
  totalPages,
  writable,
}: {
  fileId: string;
  resourceId: string;
  totalPages: number;
  writable: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    documentRef = useRef<any>(null),
    [page, setPage] = useState(1),
    [count, setCount] = useState(totalPages),
    [error, setError] = useState<Error | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let document: any;
    const load = async () => {
      const pdf = await import("pdfjs-dist");
      pdf.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).href;
      const ticket = await api(`/files/${fileId}/download-ticket`, "POST", {
        resourceId,
        inline: true,
      });
      document = await pdf.getDocument({
        url: ticket.url,
        isEvalSupported: false,
      }).promise;
      if (!active) {
        document.destroy();
        return;
      }
      documentRef.current = document;
      setCount(document.numPages);
      setReady(true);
    };
    load().catch((e) => setError(e));
    return () => {
      active = false;
      document?.destroy();
    };
  }, [fileId]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    let task: any;
    const render = async () => {
      const pdfPage = await documentRef.current.getPage(page);
      if (!active) return;
      const viewport = pdfPage.getViewport({ scale: 1.4 });
      const c = canvas.current!;
      c.width = viewport.width;
      c.height = viewport.height;
      task = pdfPage.render({ canvasContext: c.getContext("2d"), viewport });
      await task.promise;
      if (active && writable)
        await api(`/resources/${resourceId}/progress`, "POST", { page });
    };
    render().catch((e) => {
      if (e.name !== "RenderingCancelledException") setError(e);
    });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [page, ready]);
  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button
          className="secondary"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          {t.previous}
        </button>
        <label>
          {t.page}{" "}
          <input
            type="number"
            min={1}
            max={count}
            value={page}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= count) setPage(n);
            }}
          />{" "}
          / {count}
        </label>
        <button
          className="secondary"
          disabled={page >= count}
          onClick={() => setPage((p) => p + 1)}
        >
          {t.next}
        </button>
      </div>
      <canvas ref={canvas} aria-label={`${t.page} ${page}`} />
      {error && (
        <div className="callout note" style={{ margin: "16px 0", textAlign: "left" }}>
          <strong>Pratinjau Berkas Sedang Disinkronkan</strong>
          <p style={{ margin: "4px 0 0" }}>
            Layanan berkas sedang dalam proses sinkronisasi dengan server penyimpanan. Anda dapat mengunduh berkas langsung menggunakan tombol di bawah.
          </p>
        </div>
      )}
    </div>
  );
}
