import { useState, useMemo, useRef } from "react";
import {
  Megaphone,
  Plus,
  Search,
  FileText,
  ExternalLink,
  Pin,
  Building2,
  Trash2,
  Edit3,
  Users,
  Columns,
  Eye,
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Minus,
  Sparkles,
} from "lucide-react";
import { api, useApi, Loading, Notice, Empty, Modal, Field, date } from "./lib";
import { confirmAction } from "./confirm";
import { Html } from "./Content";
import { canManageAnnouncement } from "../../../packages/shared/src/announcements";
import { hasPermission } from "../../../packages/shared/src/permissions";
import { notifyAction } from "./feedback";
import { useLocalDraft, SaveStatus } from "./useLocalDraft";
import { useEditorViewMode } from "./useEditorViewMode";

export interface SystemAnnouncementItem {
  id: string;
  title: string;
  content: string;
  category:
    "SURAT_EDARAN" | "AKADEMIK" | "REGISTRASI" | "LIBUR" | "KEGIATAN" | "UMUM";
  referenceNumber?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  targetRole: "ALL" | "STUDENT" | "INSTRUCTOR";
  departmentCode?: string;
  isImportant: boolean;
  isPublished: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  publishedAt: string;
  createdAt: string;
  updatedAt?: string;
}

const CATEGORY_LABELS: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  SURAT_EDARAN: {
    label: "Surat Edaran",
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.08)",
  },
  AKADEMIK: {
    label: "Akademik",
    color: "#0284c7",
    bg: "rgba(2, 132, 199, 0.08)",
  },
  REGISTRASI: {
    label: "Registrasi & KRS",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.08)",
  },
  LIBUR: {
    label: "Libur & Cuti",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.08)",
  },
  KEGIATAN: {
    label: "Agenda Kampus",
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.08)",
  },
  UMUM: {
    label: "Pengumuman Umum",
    color: "#475569",
    bg: "rgba(71, 85, 105, 0.08)",
  },
};

const TARGET_ROLE_LABELS: Record<string, string> = {
  ALL: "Semua Sivitas Akademika",
  STUDENT: "Khusus Mahasiswa",
  INSTRUCTOR: "Khusus Dosen",
};

export function formatAnnouncementHtml(raw: string): string {
  if (!raw || !raw.trim()) return "";
  if (/<(p|div|ul|ol|h[1-6]|blockquote|table|hr)\b/i.test(raw)) {
    return raw;
  }
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

const OFFICIAL_CIRCULAR_TEMPLATE = `<p>Yth. Seluruh Sivitas Akademika Universitas Achmad Yani,</p>

<p>Berdasarkan keputusan pimpinan universitas mengenai agenda akademik dan perkuliahan, dengan ini kami sampaikan ketentuan sebagai berikut:</p>

<h3>1. Ketentuan Pelaksanaan</h3>
<ul>
  <li>Seluruh materi, kontrak perkuliahan, dan modul ajar wajib diakses melalui portal E-Learning UAY.</li>
  <li>Batas waktu akhir pengurusan administrasi akademik disesuaikan dengan kalender resmi universitas.</li>
  <li>Presensi kehadiran divalidasi langsung melalui sistem presensi mandiri pada setiap pertemuan.</li>
</ul>

<blockquote class="callout-box">
  <strong>PERHATIAN:</strong> Keterlambatan dalam penyelesaian administrasi atau tugas terstruktur dapat mempengaruhi evaluasi studi semester berjalan.
</blockquote>

<h3>2. Layanan Informasi &amp; Bantuan</h3>
<p>Apabila terdapat pertanyaan lebih lanjut, silakan menghubungi Biro Administrasi Akademik (BAAK) atau Helpdesk Fakultas masing-masing.</p>`;

export function AnnouncementCard({
  item,
  canManage = false,
  onEdit,
  onDelete,
  isPreview = false,
}: {
  item: SystemAnnouncementItem;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isPreview?: boolean;
}) {
  const cat = CATEGORY_LABELS[item.category] ?? CATEGORY_LABELS.UMUM;
  return (
    <article
      id={isPreview ? undefined : `announcement-${item.id}`}
      className="card announcement-article-card"
      style={{
        padding: "20px 24px",
        borderRadius: 12,
        border: item.isImportant
          ? "2px solid rgba(220, 38, 38, 0.4)"
          : "1px solid var(--border, #e2e8f0)",
        background: item.isImportant
          ? "rgba(254, 242, 242, 0.35)"
          : "var(--card-bg, #ffffff)",
        boxShadow: item.isImportant
          ? "0 2px 8px rgba(220, 38, 38, 0.06)"
          : undefined,
        transition: "all 0.2s ease",
      }}
    >
      {/* Meta header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.74rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: cat.color,
              background: cat.bg,
              padding: "3px 10px",
              borderRadius: 16,
            }}
          >
            {cat.label}
          </span>

          {item.isImportant && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#b91c1c",
                background: "#fee2e2",
                padding: "3px 10px",
                borderRadius: 16,
              }}
            >
              <Pin size={12} />
              Edaran Penting
            </span>
          )}

          {item.referenceNumber && (
            <span
              className="mono"
              style={{
                fontSize: "0.8rem",
                color: "var(--muted, #64748b)",
                background: "var(--muted-soft, #f1f5f9)",
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 500,
              }}
            >
              {item.referenceNumber}
            </span>
          )}

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: "0.78rem",
              color: "var(--muted, #64748b)",
            }}
          >
            <Users size={13} />
            {TARGET_ROLE_LABELS[item.targetRole] ?? item.targetRole}
            {item.departmentCode ? ` · Prodi ${item.departmentCode}` : ""}
          </span>
        </div>

        {canManage && !isPreview && (
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {onEdit && (
              <button
                type="button"
                className="button secondary sm"
                onClick={onEdit}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.8rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Edit3 size={13} /> Ubah
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="button secondary sm"
                onClick={onDelete}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.8rem",
                  color: "#dc2626",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Trash2 size={13} /> Hapus
              </button>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          margin: "0 0 12px",
          color: "var(--foreground, #0f172a)",
          lineHeight: 1.4,
        }}
      >
        {item.title ||
          (isPreview ? "Judul Pengumuman / Edaran..." : "Tanpa Judul")}
      </h2>

      {/* Rich Text Body */}
      <div className="announcement-content-body" style={{ marginBottom: 16 }}>
        {item.content ? (
          <Html text={formatAnnouncementHtml(item.content)} inline={false} />
        ) : isPreview ? (
          <p style={{ color: "var(--muted, #94a3b8)", fontStyle: "italic" }}>
            Isi lengkap surat edaran akan ditampilkan di sini secara real-time
            saat Anda mengetik...
          </p>
        ) : null}
      </div>

      {/* Footer: Author & Attachment */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          borderTop: "1px solid var(--border-subtle, #f1f5f9)",
          paddingTop: 12,
          marginTop: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.82rem",
            color: "var(--muted, #64748b)",
          }}
        >
          <Building2 size={14} />
          <span>
            Diterbitkan oleh:{" "}
            <strong>{item.authorName || "Penerbit Kampus"}</strong> ·{" "}
            {date(
              item.publishedAt || item.createdAt || new Date().toISOString(),
            )}
          </span>
        </div>

        {item.attachmentUrl && (
          <a
            href={item.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button secondary sm"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.82rem",
              color: "var(--primary, #0284c7)",
              borderColor: "rgba(2, 132, 199, 0.3)",
            }}
          >
            <FileText size={14} />
            {item.attachmentName || "Unduh Lampiran Berkas"}
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}

function AnnouncementEditorModal({
  editing,
  user,
  onClose,
  onSaved,
}: {
  editing: Partial<SystemAnnouncementItem>;
  user: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { viewMode, setViewMode, canSplit } = useEditorViewMode();
  const catalogue = useApi<any[]>(
    user.role === "SUPER_ADMIN" ? "/courses" : null,
  );
  const targetDepartments =
    user.role === "DEPARTMENT_ADMIN"
      ? (user.departmentScopes ?? [])
      : [
          ...new Set(
            [
              ...(catalogue.data ?? []).map((course) => course.departmentCode),
              editing.departmentCode,
            ].filter(Boolean),
          ),
        ].sort();

  const [title, setTitle] = useState(editing.title ?? "");
  const [category, setCategory] = useState<SystemAnnouncementItem["category"]>(
    editing.category ?? "SURAT_EDARAN",
  );
  const [referenceNumber, setReferenceNumber] = useState(
    editing.referenceNumber ?? "",
  );
  const [targetRole, setTargetRole] = useState<
    SystemAnnouncementItem["targetRole"]
  >(editing.targetRole ?? "ALL");
  const [departmentCode, setDepartmentCode] = useState(
    editing.departmentCode ??
      (user.role === "DEPARTMENT_ADMIN"
        ? (user.departmentScopes?.[0] ?? "")
        : ""),
  );
  const [isImportant, setIsImportant] = useState(editing.isImportant ?? false);
  const [content, setContent] = useState(editing.content ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState(
    editing.attachmentUrl ?? "",
  );
  const [attachmentName, setAttachmentName] = useState(
    editing.attachmentName ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const savingRef = useRef(false);
  const draft = useLocalDraft(
    "announcement:" + (editing.id ?? "new"),
    {
      title,
      category,
      referenceNumber,
      targetRole,
      departmentCode,
      isImportant,
      content,
      attachmentUrl,
      attachmentName,
    },
    (value) => {
      setTitle(value.title);
      setCategory(value.category);
      setReferenceNumber(value.referenceNumber);
      setTargetRole(value.targetRole);
      setDepartmentCode(value.departmentCode);
      setIsImportant(value.isImportant);
      setContent(value.content);
      setAttachmentUrl(value.attachmentUrl);
      setAttachmentName(value.attachmentName);
    },
  );
  const cancel = async () => {
    if (savingRef.current) return;
    if (
      (draft.dirty || draft.recovery) &&
      !(await confirmAction(
        "Perubahan belum dikirim ke server. Tutup editor dan simpan draf di perangkat ini?",
      ))
    )
      return;
    onClose();
  };

  const insertTag = (before: string, after: string, placeholder = "") => {
    const el = contentRef.current;
    if (!el) {
      setContent((prev) => prev + before + placeholder + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const newContent =
      content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    }, 0);
  };

  const previewItem: SystemAnnouncementItem = {
    id: editing.id ?? "preview",
    title: title || "Judul Pengumuman / Surat Edaran",
    content:
      content ||
      "<p>Tuliskan isi surat edaran di formulir untuk melihat pratinjau...</p>",
    category,
    referenceNumber: referenceNumber || undefined,
    authorId: user.id || "admin",
    authorName: editing.authorName || user.name,
    authorRole: user.role,
    targetRole,
    departmentCode: departmentCode || undefined,
    isImportant,
    isPublished: true,
    attachmentUrl: attachmentUrl || undefined,
    attachmentName:
      attachmentName || (attachmentUrl ? "Lampiran Dokumen PDF" : undefined),
    publishedAt: editing.publishedAt || new Date().toISOString(),
    createdAt: editing.createdAt || new Date().toISOString(),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || draft.recovery) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        category,
        referenceNumber: referenceNumber.trim(),
        targetRole,
        departmentCode: departmentCode || "",
        isImportant,
        isPublished: true,
        content: content.trim(),
        attachmentUrl: attachmentUrl.trim(),
        attachmentName: attachmentName.trim(),
        ...(editing.id && editing.updatedAt
          ? { expectedUpdatedAt: editing.updatedAt }
          : {}),
      };

      if (editing.id) {
        await api(`/system-announcements/${editing.id}`, "PATCH", payload);
      } else {
        await api("/system-announcements", "POST", payload);
      }
      notifyAction(
        editing.id
          ? "Pengumuman berhasil diperbarui."
          : "Pengumuman berhasil diterbitkan.",
      );
      await draft.saved();
      onSaved();
    } catch (err: any) {
      setError(err);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const formFields = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "var(--surface-muted, #f8fafc)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: "0.85rem",
        }}
      >
        <Building2
          size={18}
          style={{ color: "var(--primary, #0284c7)", flexShrink: 0 }}
        />
        <div>
          <div style={{ fontWeight: 600, color: "var(--foreground, #0f172a)" }}>
            Akun Penerbit Resmi:{" "}
            <span style={{ color: "var(--primary, #0284c7)" }}>
              {user.name}
            </span>{" "}
            (
            {user.role === "SUPER_ADMIN"
              ? "Super Admin"
              : user.role === "DEPARTMENT_ADMIN"
                ? `Admin Prodi (${departmentCode || "Universitas"})`
                : user.role}
            )
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--muted, #64748b)",
              marginTop: 2,
            }}
          >
            Surat edaran ini diterbitkan langsung atas nama akun Anda yang
            terautentikasi dan tercatat dalam log audit universitas.
          </div>
        </div>
      </div>

      <div className="form-grid">
        <Field label="Kategori Edaran / Pengumuman">
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
          >
            <option value="SURAT_EDARAN">Surat Edaran Resmi</option>
            <option value="AKADEMIK">Pengumuman Akademik</option>
            <option value="REGISTRASI">Registrasi &amp; KRS</option>
            <option value="LIBUR">Pemberitahuan Libur &amp; Cuti</option>
            <option value="KEGIATAN">Agenda &amp; Kegiatan Kampus</option>
            <option value="UMUM">Pengumuman Umum</option>
          </select>
        </Field>

        <Field label="Nomor Surat / Referensi (Opsional)">
          <input
            name="referenceNumber"
            placeholder="Contoh: SE/028/UAY/REK/2026"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Judul Pengumuman / Perihal Edaran">
        <input
          name="title"
          required
          maxLength={300}
          placeholder="Tuliskan perihal atau judul pengumuman yang jelas..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <div className="form-grid">
        <Field label="Sasaran Pengguna (Target Audience)">
          <select
            name="targetRole"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value as any)}
          >
            <option value="ALL">Semua Sivitas (Mahasiswa &amp; Dosen)</option>
            <option value="STUDENT">Khusus Mahasiswa</option>
            <option value="INSTRUCTOR">Khusus Dosen Pengampu</option>
          </select>
        </Field>

        <Field label="Program Studi Sasaran">
          <select
            name="departmentCode"
            value={departmentCode}
            onChange={(e) => setDepartmentCode(e.target.value)}
            disabled={
              user.role === "DEPARTMENT_ADMIN" &&
              user.departmentScopes?.length === 1
            }
          >
            {user.role === "SUPER_ADMIN" && (
              <option value="">Semua Program Studi (Universitas)</option>
            )}
            {targetDepartments.map((code: string) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          {user.role === "DEPARTMENT_ADMIN" && (
            <small>
              Sasaran hanya tersedia untuk prodi dalam wewenang Anda.
            </small>
          )}
          {catalogue.error && <Notice error={catalogue.error} />}
        </Field>
      </div>

      {/* Rich Text Editor Field */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "block",
            marginBottom: 6,
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Isi Lengkap Pengumuman (Format Rich Text)
        </label>

        {/* Formatting Toolbar */}
        <div className="rich-editor-toolbar">
          <button
            type="button"
            title="Format Teks Tebal"
            onClick={() => insertTag("<strong>", "</strong>", "Teks Tebal")}
          >
            <Bold size={13} /> Tebal
          </button>
          <button
            type="button"
            title="Format Teks Miring"
            onClick={() => insertTag("<em>", "</em>", "Teks Miring")}
          >
            <Italic size={13} /> Miring
          </button>
          <button
            type="button"
            title="Format Garis Bawah"
            onClick={() => insertTag("<u>", "</u>", "Teks Bergaris Bawah")}
          >
            <Underline size={13} /> Garis Bawah
          </button>
          <button
            type="button"
            title="Sisipkan Subjudul (Heading 3)"
            onClick={() => insertTag("<h3>", "</h3>", "Subjudul Poin")}
          >
            <Heading size={13} /> Subjudul
          </button>

          <div className="toolbar-divider" />

          <button
            type="button"
            title="Sisipkan Daftar Poin (Bullet List)"
            onClick={() =>
              insertTag(
                "<ul>\n  <li>",
                "</li>\n  <li>Poin kedua</li>\n</ul>",
                "Poin pertama",
              )
            }
          >
            <List size={13} /> Poin
          </button>
          <button
            type="button"
            title="Sisipkan Daftar Angka (Numbered List)"
            onClick={() =>
              insertTag(
                "<ol>\n  <li>",
                "</li>\n  <li>Langkah kedua</li>\n</ol>",
                "Langkah pertama",
              )
            }
          >
            <ListOrdered size={13} /> Nomor
          </button>
          <button
            type="button"
            title="Sisipkan Kotak Catatan / Sorotan Khusus"
            onClick={() =>
              insertTag(
                '<blockquote class="callout-box">\n  <strong>PERHATIAN:</strong> ',
                "\n</blockquote>",
                "Tulis catatan penting atau instruksi di sini...",
              )
            }
          >
            <Quote size={13} /> Catatan
          </button>
          <button
            type="button"
            title="Sisipkan Tautan Web"
            onClick={() => {
              const url = prompt(
                "Masukkan alamat URL tautan (contoh: https://uay.ac.id/dokumen):",
                "https://",
              );
              if (url) {
                insertTag(
                  `<a href="${url}" target="_blank">`,
                  "</a>",
                  "Tautan Informasi",
                );
              }
            }}
          >
            <LinkIcon size={13} /> Tautan
          </button>
          <button
            type="button"
            title="Sisipkan Garis Pemisah (Divider)"
            onClick={() => insertTag("\n<hr />\n", "")}
          >
            <Minus size={13} /> Pemisah
          </button>

          <div className="toolbar-divider" />

          <button
            type="button"
            title="Muat Struktur Surat Edaran Standar Kampus"
            style={{ color: "var(--primary, #0284c7)", fontWeight: 700 }}
            onClick={async () => {
              if (
                !content ||
                (await confirmAction(
                  "Ganti isi saat ini dengan format standar Surat Edaran Resmi Kampus?",
                ))
              ) {
                setContent(OFFICIAL_CIRCULAR_TEMPLATE);
              }
            }}
          >
            <Sparkles size={13} /> Template Edaran
          </button>
        </div>

        <textarea
          ref={contentRef}
          aria-label="Isi lengkap pengumuman"
          name="content"
          required
          rows={viewMode === "split" ? 12 : 8}
          className="rich-editor-textarea"
          placeholder="Tuliskan isi surat edaran, tanggal penting, atau ketentuan perkuliahan di sini. Gunakan tombol toolbar di atas untuk memperkaya format teks..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.76rem",
            color: "var(--muted, #64748b)",
            marginTop: 4,
          }}
        >
          <span>
            Mendukung format Rich Text (paragraf, tebal, subjudul, daftar poin,
            dan kotak catatan)
          </span>
          <span>{content.length} karakter</span>
        </div>
      </div>

      <div className="form-grid">
        <Field label="Tautan Unduh Berkas / Dokumen PDF (Opsional)">
          <input
            name="attachmentUrl"
            type="url"
            placeholder="https://uay.ac.id/dokumen/surat-edaran.pdf"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
          />
        </Field>
        <Field label="Keterangan Nama Berkas Lampiran">
          <input
            name="attachmentName"
            placeholder="Contoh: Lampiran-Jadwal-UAS.pdf"
            value={attachmentName}
            onChange={(e) => setAttachmentName(e.target.value)}
          />
        </Field>
      </div>

      <div style={{ margin: "14px 0" }}>
        <label
          className="check-row"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="isImportant"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
          />
          <span style={{ fontWeight: 600 }}>
            Sematkan sebagai Edaran Penting (*Pinned Announcement*)
          </span>
        </label>
        <small
          style={{
            color: "var(--muted, #64748b)",
            display: "block",
            marginLeft: 24,
          }}
        >
          Edaran penting akan disematkan di posisi teratas dan dimunculkan pada
          banner peringatan Dashboard mahasiswa &amp; dosen.
        </small>
      </div>

      <div
        className="form-actions"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
        }}
      >
        <button
          type="button"
          className="secondary"
          onClick={cancel}
          disabled={saving}
        >
          Batal
        </button>
        <button
          type="submit"
          className="primary"
          disabled={saving || !!draft.recovery}
        >
          {saving
            ? "Menyimpan..."
            : editing.id
              ? "Simpan Perubahan"
              : "Terbitkan Pengumuman"}
        </button>
      </div>
    </>
  );

  return (
    <Modal
      title={
        editing.id
          ? "Sunting Pengumuman / Edaran"
          : "Terbitkan Pengumuman / Edaran Baru"
      }
      onClose={onClose}
      busy={saving}
      wide={viewMode !== "split"}
      fullScreen={viewMode === "split"}
    >
      {error && <Notice error={error} />}

      {/* View Mode Switcher */}
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
          {canSplit && (
            <button
              type="button"
              className={viewMode === "split" ? "active" : ""}
              onClick={() => setViewMode("split")}
              aria-pressed={viewMode === "split"}
            >
              <Columns size={13} />
              Berdampingan
            </button>
          )}
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
          {viewMode === "split" ? (
            <span>
              Mode <strong>Berdampingan</strong>: formulir dan pratinjau
              langsung.
            </span>
          ) : viewMode === "preview" ? (
            <span>
              Mode <strong>Pratinjau Penuh</strong>: Tampilan nyata bagi
              pembaca.
            </span>
          ) : (
            <span>
              Mode <strong>Tulis</strong>: Fokus pengisian surat edaran.
            </span>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ margin: 0 }}
        data-dirty={draft.dirty || draft.recovery ? "true" : undefined}
        aria-busy={saving}
      >
        {!editing.id && (
          <p className="muted">
            Pengumuman ini belum diterbitkan. Draf tersimpan hanya di perangkat
            ini sampai penerbitan berhasil.
          </p>
        )}
        <SaveStatus draft={draft} busy={saving} />
        <fieldset disabled={saving || !!draft.recovery}>
          {viewMode === "split" ? (
            <div className="announcement-split-container">
              <div className="announcement-editor-left">{formFields}</div>
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
                    <Eye
                      size={15}
                      style={{ color: "var(--primary, #0284c7)" }}
                    />
                    Pratinjau Langsung (Live Preview)
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
                <AnnouncementCard item={previewItem} isPreview />
              </div>
            </div>
          ) : viewMode === "preview" ? (
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "10px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 700,
                    fontSize: "0.95rem",
                  }}
                >
                  <Eye size={16} style={{ color: "var(--primary, #0284c7)" }} />
                  Pratinjau Lengkap Tampilan Pengumuman
                </div>
                <button
                  type="button"
                  className="button secondary sm"
                  onClick={() => setViewMode("edit")}
                >
                  <Edit3 size={14} /> Kembali ke Mode Tulis
                </button>
              </div>
              <AnnouncementCard item={previewItem} isPreview />
              <div
                className="form-actions"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  className="secondary"
                  onClick={cancel}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={saving || !!draft.recovery}
                >
                  {saving
                    ? "Menyimpan..."
                    : editing.id
                      ? "Simpan Perubahan"
                      : "Terbitkan Pengumuman"}
                </button>
              </div>
            </div>
          ) : (
            <div className="announcement-editor-full">{formFields}</div>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}

export function AnnouncementsPage({ user }: { user: any; config?: any }) {
  const announcements = useApi<SystemAnnouncementItem[]>(
    "/system-announcements",
  );
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [editing, setEditing] =
    useState<Partial<SystemAnnouncementItem> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const canManage =
    hasPermission(user.role, "PUBLISH_GLOBAL_ANNOUNCEMENTS") ||
    (hasPermission(user.role, "PUBLISH_DEPT_ANNOUNCEMENTS") &&
      !!user.departmentScopes?.length);
  const [deleting, setDeleting] = useState<string | null>(null);
  const deletingRef = useRef(false);

  const filteredItems = useMemo(() => {
    const list = announcements.data ?? [];
    return list.filter((item) => {
      const matchCat =
        categoryFilter === "ALL" || item.category === categoryFilter;
      const q = search.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.referenceNumber &&
          item.referenceNumber.toLowerCase().includes(q)) ||
        item.authorName.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [announcements.data, categoryFilter, search]);

  const handleDelete = async (item: SystemAnnouncementItem) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    if (
      !(await confirmAction(
        `Hapus pengumuman "${item.title}"? Tindakan ini tidak dapat dibatalkan.`,
      ))
    ) {
      deletingRef.current = false;
      return;
    }
    setDeleting(item.id);
    setError(null);
    try {
      await api(`/system-announcements/${item.id}`, "DELETE");
      announcements.reload();
      notifyAction("Pengumuman berhasil dihapus.");
      window.dispatchEvent(new Event("notifications-changed"));
    } catch (e: any) {
      setError(e);
    } finally {
      setDeleting(null);
      deletingRef.current = false;
    }
  };

  return (
    <div
      className="announcements-container"
      style={{ maxWidth: 960, margin: "0 auto", padding: "16px 8px" }}
    >
      {/* Page Heading */}
      <div
        className="page-heading heading-with-action"
        style={{ marginBottom: 20 }}
      >
        <div>
          <div
            className="eyebrow"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Megaphone size={14} />
            Pusat Informasi &amp; Edaran Kampus
          </div>
          <h1 style={{ margin: "4px 0 0" }}>Pengumuman &amp; Surat Edaran</h1>
          <p
            style={{
              margin: "6px 0 0",
              color: "var(--muted, #64748b)",
              fontSize: "0.95rem",
            }}
          >
            Informasi resmi, surat edaran rektorat, dan jadwal akademik
            Universitas Achmad Yani.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="primary"
            onClick={() => setEditing({})}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Plus size={16} />
            Terbitkan Edaran
          </button>
        )}
      </div>

      {error && <Notice error={error} />}

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid var(--border, #e2e8f0)",
          background: "var(--card-bg, #ffffff)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div
            className="search-field"
            style={{
              flex: 1,
              minWidth: 260,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              border: "1px solid var(--border, #cbd5e1)",
              borderRadius: 8,
              background: "var(--input-bg, #f8fafc)",
            }}
          >
            <Search
              size={18}
              style={{ color: "var(--muted, #94a3b8)", flexShrink: 0 }}
            />
            <input
              type="search"
              aria-label="Cari pengumuman"
              placeholder="Cari judul, nomor surat edaran, atau isi pengumuman..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: "0.92rem",
                color: "var(--foreground, #0f172a)",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--muted, #64748b)",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            ["ALL", "Semua Kategori"],
            ["SURAT_EDARAN", "Surat Edaran"],
            ["AKADEMIK", "Akademik"],
            ["REGISTRASI", "Registrasi & KRS"],
            ["LIBUR", "Libur & Cuti"],
            ["KEGIATAN", "Agenda Kampus"],
            ["UMUM", "Umum"],
          ].map(([id, label]) => {
            const active = categoryFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategoryFilter(id)}
                style={{
                  border: "none",
                  borderRadius: 20,
                  padding: "5px 14px",
                  fontSize: "0.82rem",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  background: active
                    ? "var(--primary, #0284c7)"
                    : "var(--chip-bg, #f1f5f9)",
                  color: active ? "#ffffff" : "var(--foreground, #334155)",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Announcements List */}
      {announcements.loading && !announcements.data ? (
        <Loading />
      ) : announcements.error ? (
        <Notice error={announcements.error} />
      ) : filteredItems.length > 0 ? (
        <div style={{ display: "grid", gap: 16 }}>
          {filteredItems.map((item) => (
            <AnnouncementCard
              key={item.id}
              item={item}
              canManage={!deleting && canManageAnnouncement(user, item)}
              onEdit={() => setEditing(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      ) : (
        <Empty>
          <h3>Tidak ada pengumuman</h3>
          <p>
            {search
              ? `Tidak ditemukan pengumuman dengan kata kunci "${search}".`
              : "Belum ada pengumuman atau surat edaran pada kategori yang dipilih."}
          </p>
        </Empty>
      )}

      {/* Modal Terbitkan / Sunting Edaran dengan Rich Text & Side-by-Side Preview */}
      {editing && (
        <AnnouncementEditorModal
          editing={editing}
          user={user}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            announcements.reload();
            window.dispatchEvent(new Event("notifications-changed"));
          }}
        />
      )}
    </div>
  );
}

export default AnnouncementsPage;
