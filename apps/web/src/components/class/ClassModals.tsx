import { useState } from "react";
import { Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";
import {
  t,
  api,
  Field,
  Modal,
  Form,
  localInput,
  isoInput,
  textValue,
  navigate,
} from "../../lib";
import { RichTextEditor } from "../ui/RichTextEditor";
import { confirmAction } from "../../confirm";
import { generateEnrollmentKey } from "../../../../../packages/shared/src/domain";

export interface SectionModalProps {
  cls: any;
  section?: any;
  onClose: () => void;
  onSaved: () => void;
}

export function SectionModal({
  cls,
  section,
  onClose,
  onSaved,
}: SectionModalProps) {
  const [description, setDescription] = useState(section?.description ?? "");
  return (
    <Modal title={section ? t.edit : t.newSection} onClose={onClose}>
      <Form
        draftKey={`section:${section?.id ?? "new"}`}
        draftVersion={section?.updatedAt}
        draftValue={{ description }}
        onRestoreDraft={(v) => {
          if (v.description !== undefined) setDescription(v.description);
        }}
        onCancel={onClose}
        submitLabel={t.publish}
        publication={{
          published: section?.isVisible ?? false,
          onUnpublish: section
            ? async () => {
                await api(`/sections/${section.id}/unpublish`, "POST", {});
                onSaved();
              }
            : undefined,
        }}

        onSubmit={async (f, intent) => {
          await api(
            section
              ? `/sections/${section.id}`
              : `/course-classes/${cls.id}/sections`,
            section ? "PATCH" : "POST",
            {
              title: textValue(f, "title"),
              description: textValue(f, "description"),
              type: textValue(f, "type"),
              isVisible: intent === "publish",
              startDate: isoInput(f.get("startDate")),
              endDate: isoInput(f.get("endDate")),
            },
          );
          onSaved();
        }}
      >
        <Field label={t.sectionTitle}>
          <input name="title" required defaultValue={section?.title} />
        </Field>
        <Field label={`${t.description} (Format Teks Rapi)`}>
          <RichTextEditor
            compact
            name="description"
            rows={4}
            value={description}
            onChange={setDescription}
            placeholder="Tuliskan capaian atau deskripsi sesi pertemuan..."
            defaultAiTemplate="article"
          />
        </Field>
        <Field label={t.sectionType}>
          <select name="type" defaultValue={section?.type ?? "LECTURE"}>
            {Object.entries(t.sectionTypes).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label={t.opens}>
            <input
              type="datetime-local"
              name="startDate"
              defaultValue={localInput(section?.startDate)}
            />
          </Field>
          <Field label={t.closes}>
            <input
              type="datetime-local"
              name="endDate"
              defaultValue={localInput(section?.endDate)}
            />
          </Field>
        </div>
      </Form>
    </Modal>
  );
}

export interface AnnouncementModalProps {
  cls: any;
  onClose: () => void;
  onSaved: () => void;
}

export function AnnouncementModal({
  cls,
  onClose,
  onSaved,
}: AnnouncementModalProps) {
  const [content, setContent] = useState("");
  return (
    <Modal title={t.newAnnouncement} onClose={onClose}>
      <Form
        draftKey="announcement:new"
        draftValue={{ content }}
        onRestoreDraft={(v) => {
          if (v.content !== undefined) setContent(v.content);
        }}
        onCancel={onClose}
        publication={{ published: false }}
        onSubmit={async (f, intent) => {
          await api(`/course-classes/${cls.id}/announcements`, "POST", {
            title: textValue(f, "title"),
            content: textValue(f, "content"),
            isImportant: f.has("important"),
            isPublished: intent === "publish",
            publishedAt: isoInput(f.get("publishedAt")),
          });
          onSaved();
        }}
      >
        <Field label={t.title}>
          <input name="title" required />
        </Field>
        <Field label={`${t.announcementContent} (Format Teks Rapi)`}>
          <RichTextEditor
            name="content"
            required
            rows={6}
            value={content}
            onChange={setContent}
            placeholder="Tuliskan pengumuman kelas dengan format teks rapi di sini..."
            defaultAiTemplate="announcement"
          />
        </Field>
        <Field label={t.publishedAt}>
          <input name="publishedAt" type="datetime-local" />
        </Field>
        <label className="check-row">
          <input name="important" type="checkbox" />
          {t.important}
        </label>
      </Form>
    </Modal>
  );
}

export interface ClassSettingsModalProps {
  cls: any;
  onClose: () => void;
  onSaved: () => void;
}

export function ClassSettingsModal({
  cls,
  onClose,
  onSaved,
}: ClassSettingsModalProps) {
  const [key, setKey] = useState<string>(cls.enrollmentKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    const fresh = generateEnrollmentKey(6);
    setKey(fresh);
    setShowKey(true);
  };

  return (
    <Modal title={t.settings} onClose={onClose}>
      <Form
        draftKey="class-settings"
        draftVersion={cls.updatedAt}
        onSubmit={async (f) => {
          const status = textValue(f, "status");
          if (status === "ARCHIVED" && !(await confirmAction(t.confirmArchive)))
            return false;
          await api(`/course-classes/${cls.id}`, "PATCH", {
            name: textValue(f, "name"),
            academicYear: textValue(f, "academicYear"),
            status,
            enrollmentKey: key.trim(),
          });
          onSaved();
        }}
      >
        <Field label={t.className}>
          <input required name="name" defaultValue={cls.name} />
        </Field>
        <Field label={t.academicYear}>
          <input required name="academicYear" defaultValue={cls.academicYear} />
        </Field>
        <Field label={t.status}>
          <select name="status" defaultValue={cls.status}>
            {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
              <option key={s} value={s}>
                {(t.statuses as any)[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.enrollmentKey}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              name="key"
              type={showKey ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              minLength={6}
              maxLength={20}
              placeholder={
                cls.hasEnrollmentKey && !cls.enrollmentKey
                  ? "Kunci aktif — buat baru untuk melihat"
                  : "Kosongkan jika pendaftaran mandiri ditutup"
              }
              style={{
                fontFamily: "monospace",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                flex: 1,
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? "Sembunyikan kode" : "Tampilkan kode"}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0 10px" }}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRegenerate}
              title="Acak ulang kunci pendaftaran baru"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
            >
              <RefreshCw size={15} />
              Acak Kode Baru
            </button>
            {key && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopy}
                title="Salin kunci pendaftaran"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
              >
                {copied ? <Check size={16} color="var(--adaptive-success-fill, #22c55e)" /> : <Copy size={16} />}
                {copied ? "Disalin!" : "Salin"}
              </button>
            )}
            {key && (
              <button
                type="button"
                className="text-button"
                style={{ color: "var(--destructive, #ef4444)", fontSize: "0.82rem" }}
                onClick={() => setKey("")}
                title="Tutup pendaftaran mandiri"
              >
                Hapus
              </button>
            )}
          </div>
          <small style={{ display: "block", marginTop: 6, color: "var(--muted)" }}>
            {key
              ? "Mahasiswa dapat bergabung mandiri ke kelas menggunakan kode 6 karakter ini."
              : cls.hasEnrollmentKey && !cls.enrollmentKey
                ? "Kunci pendaftaran aktif. Klik 'Acak Kode Baru' untuk melihat dan menyalin kode baru."
                : "Kosongkan jika mahasiswa hanya didaftarkan langsung oleh dosen."}
          </small>
        </Field>
      </Form>
    </Modal>
  );
}

export interface ClassCloneModalProps {
  cls: any;
  config?: any;
  onClose: () => void;
}

export function ClassCloneModal({
  cls,
  config,
  onClose,
}: ClassCloneModalProps) {
  return (
    <Modal title={t.cloneClass} onClose={onClose}>
      <p>{t.cloneDescription}</p>
      {cls.practicumClass && (
        <p className="callout note">
          Kelas praktikum tertaut juga akan disalin ke kelas semester baru,
          termasuk materi, kategori, dan pemetaan nilainya. Peserta, riwayat
          nilai, dan presensi tidak ikut disalin.
        </p>
      )}
      <div
        style={{
          background: "var(--adaptive-info-soft, rgba(2, 132, 199, 0.06))",
          border:
            "1px solid var(--adaptive-info-border, rgba(2, 132, 199, 0.2))",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: "0.85rem",
          lineHeight: 1.5,
          color: "var(--foreground, #1e293b)",
        }}
      >
        <strong>Informasi Penanganan Jadwal &amp; Peserta:</strong>
        <ul style={{ paddingLeft: 16, margin: "6px 0 0 0" }}>
          <li>
            Seluruh jadwal rilis dan deadline periode lama otomatis di-reset ke
            draf bersih agar tidak mengunci di semester baru.
          </li>
          <li>
            Peserta (mahasiswa) lama tidak diikutsertakan. Kelas baru akan
            dimulai dengan 0 peserta siap untuk pendaftaran angkatan baru.
          </li>
        </ul>
      </div>
      <Form
        draftKey="clone-class"
        onSubmit={async (f) => {
          const result = await api(`/course-classes/${cls.id}/clone`, "POST", {
            name: textValue(f, "name"),
            academicYear: textValue(f, "academicYear"),
          });
          onClose();
          navigate(result.path);
        }}
      >
        <Field label={t.className}>
          <input name="name" required defaultValue={cls.name} />
        </Field>
        <Field
          label={`${t.academicYear} & Semester Baru`}
          hint="Pilih semester tujuan duplikasi materi perkuliahan."
        >
          <select
            name="academicYear"
            required
            defaultValue={
              cls.academicYear.includes("Ganjil")
                ? cls.academicYear.replace("Ganjil", "Genap")
                : config?.academicYear || "2026/2027 Genap"
            }
          >
            {(
              config?.academicYears || [
                "2025/2026 Ganjil",
                "2025/2026 Genap",
                "2026/2027 Ganjil",
                "2026/2027 Genap",
                "2027/2028 Ganjil",
                "2027/2028 Genap",
              ]
            ).map((year: string) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>
      </Form>
    </Modal>
  );
}
