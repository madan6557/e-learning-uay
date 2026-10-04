import { useLocalDraft, SaveStatus } from "./useLocalDraft";
import { useEffect, useState } from "react";
import {
  Download,
  Plus,
  Upload,
  GraduationCap,
  Calculator,
  Trash2,
  Sparkles,
  Info,
} from "lucide-react";
import {
  t,
  api,
  useApi,
  Loading,
  Notice,
  Empty,
  Badge,
  Field,
  Modal,
  Form,
  Action,
  date,
  textValue,
  numberValue,
  Pagination,
  usePagination,
} from "./lib";
import { confirmAction } from "./confirm";
import { GRADE_SCALE_PRESETS } from "../../../packages/shared/src/domain";

export function GradeScoreInput({
  value,
  onChange,
  disabled,
  className = "",
  ariaLabel,
}: {
  value: string | number;
  onChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      className={`score-input ${className}`.trim()}
      aria-label={ariaLabel}
      type="number"
      min={0}
      max={100}
      step="1"
      disabled={disabled}
      value={value}
      onKeyDown={(e) => {
        if (e.key === "-" || e.key === "e" || e.key === "E") {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onChange("");
          return;
        }
        const num = parseFloat(raw);
        if (isNaN(num)) {
          onChange("0");
        } else if (num > 100) {
          onChange("100");
        } else if (num < 0) {
          onChange("0");
        } else {
          onChange(raw);
        }
      }}
      onBlur={(e) => {
        const raw = e.target.value;
        if (raw !== "") {
          const num = Math.max(0, Math.min(100, parseFloat(raw) || 0));
          onChange(String(Math.round(num * 100) / 100));
        }
      }}
    />
  );
}

async function workbook() {
  const module = await import("exceljs");
  return new module.default.Workbook();
}
async function exportSheet(name: string, headers: string[], rows: unknown[][]) {
  const book = await workbook(),
    sheet = book.addWorksheet("UAY");
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF183D32" },
  };
  sheet.columns.forEach((column) => (column.width = 24));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const output = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([output as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function StudentGradeReviewModal({
  classId,
  userId,
  onClose,
  onSaved,
}: {
  classId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const breakdownApi = useApi<any>(
    `/course-classes/${classId}/students/${userId}/grade-breakdown`,
  );
  const [editedScores, setEditedScores] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (breakdownApi.data) {
      const initial: Record<string, string> = {};
      for (const cat of breakdownApi.data.categories) {
        initial[cat.categoryId] = String(cat.currentScore);
      }
      setEditedScores(initial);
    }
  }, [breakdownApi.data]);

  if (breakdownApi.loading && !breakdownApi.data) return <Loading />;
  if (breakdownApi.error) return <Notice error={breakdownApi.error} />;
  if (!breakdownApi.data) return null;

  const data = breakdownApi.data;
  const categories = data.categories;

  // Calculate simulated final score in real-time
  const simulatedFinal = categories.reduce((sum: number, cat: any) => {
    const s = parseFloat(editedScores[cat.categoryId] ?? "0") || 0;
    return sum + (s * cat.weightPercent) / 100;
  }, 0);
  const roundedSimulated = Math.round(simulatedFinal * 100) / 100;

  const handleUseSuggestion = (categoryId: string, suggestedScore: number) => {
    setEditedScores((prev) => ({
      ...prev,
      [categoryId]: String(suggestedScore),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changes = categories.map((cat: any) => ({
        userId,
        categoryId: cat.categoryId,
        score: parseFloat(editedScores[cat.categoryId] ?? "0") || 0,
      }));

      await api(`/course-classes/${classId}/manual-grades/batch`, "POST", {
        changes,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Tinjau & Kalkulasi Nilai: ${data.student.name}`}
      wide
      onClose={onClose}
    >
      <div
        style={{
          padding: "16px 24px 28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 18px",
              background: "var(--chip-bg, #f8fafc)",
              borderRadius: 10,
              border: "1px solid var(--border, #e2e8f0)",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: "1.08rem" }}>
                {data.student.name}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>
                NIM: {data.student.identifierValue} · {data.student.email}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
                  Simulasi Nilai Akhir
                </div>
                <div
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 800,
                    color: "var(--primary, #0284c7)",
                  }}
                >
                  {roundedSimulated.toFixed(2)}
                </div>
              </div>
              <div
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                Skala {data.class.gradeScaleVersion}
              </div>
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: "0.88rem",
            color: "var(--muted, #64748b)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Berikut adalah rincian aktivitas capaian mahasiswa per bagian bobot penilaian.
          Hasil kalkulasi sistem disajikan sebagai <strong>rekomendasi/saran</strong>. Anda dapat
          mengecek dan mengoreksi nilai section sesuai evaluasi akademik Anda sebelum menekan tombol simpan draf.
        </p>

        <div
          style={{
            display: "grid",
            gap: 16,
            marginBottom: 8,
          }}
        >
          {categories.map((cat: any) => {
            const currentVal =
              editedScores[cat.categoryId] ?? String(cat.currentScore);
            return (
              <div
                key={cat.categoryId}
                className="card"
                style={{
                  padding: 16,
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 8,
                  background: "var(--card-bg, #ffffff)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                      {cat.name}
                    </h3>
                    <span
                      style={{
                        background: "rgba(2, 132, 199, 0.1)",
                        color: "#0284c7",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 12,
                      }}
                    >
                      Bobot {cat.weightPercent}%
                    </span>
                    {cat.isMandatory && (
                      <span
                        style={{
                          background: "#fef3c7",
                          color: "#92400e",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: 12,
                        }}
                      >
                        Wajib
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted, #64748b)",
                        background: "#f1f5f9",
                        padding: "2px 8px",
                        borderRadius: 12,
                      }}
                    >
                      Sumber: {cat.sourceType}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {cat.sourceType !== "MANUAL" && (
                      <div
                        style={{
                          fontSize: "0.82rem",
                          background: "#dcfce7",
                          color: "#15803d",
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        Saran Sistem: <strong>{cat.suggestedScore.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {cat.activities && cat.activities.length > 0 ? (
                  <div
                    style={{
                      marginBottom: 12,
                      background: "#f8fafc",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <table style={{ margin: 0, fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9" }}>
                          <th style={{ padding: "6px 10px" }}>Aktivitas</th>
                          <th style={{ padding: "6px 10px", textAlign: "center" }}>
                            Nilai Riil
                          </th>
                          <th style={{ padding: "6px 10px", textAlign: "center" }}>
                            Skala 100
                          </th>
                          <th style={{ padding: "6px 10px", textAlign: "right" }}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.activities.map((act: any, idx: number) => (
                          <tr key={act.id || idx}>
                            <td style={{ padding: "6px 10px" }}>
                              <strong>{act.title}</strong>
                              <small
                                style={{
                                 display: "block",
                                  color: "var(--muted, #64748b)",
                                }}
                              >
                                {act.type}
                              </small>
                            </td>
                            <td
                              style={{
                                padding: "6px 10px",
                                textAlign: "center",
                              }}
                            >
                              {act.rawScore !== null
                                ? `${act.rawScore} / ${act.maxScore}`
                                : "—"}
                            </td>
                            <td
                              style={{
                                padding: "6px 10px",
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              {act.normalizedScore.toFixed(2)}
                            </td>
                            <td
                              style={{ padding: "6px 10px", textAlign: "right" }}
                            >
                              <span
                                style={{ fontSize: "0.75rem", color: "#64748b" }}
                              >
                                {act.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#f8fafc",
                      borderRadius: 6,
                      fontSize: "0.82rem",
                      color: "var(--muted, #64748b)",
                      marginBottom: 12,
                    }}
                  >
                    {cat.sourceType === "MANUAL"
                      ? "Kategori manual murni — nilai diinput langsung oleh dosen tanpa kalkulasi otomatis."
                      : "Belum ada aktivitas yang dikerjakan mahasiswa untuk kategori ini."}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#ffffff",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Nilai Akhir Bagian ({cat.name}):
                    </label>
                    <GradeScoreInput
                      ariaLabel={`Nilai ${cat.name}`}
                      value={currentVal}
                      onChange={(val) =>
                        setEditedScores((prev) => ({
                          ...prev,
                          [cat.categoryId]: val,
                        }))
                      }
                    />
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--muted, #64748b)",
                      }}
                    >
                      / 100
                    </span>
                  </div>

                  {cat.sourceType !== "MANUAL" && (
                    <button
                      type="button"
                      className="button secondary sm"
                      style={{
                        fontSize: "0.8rem",
                        padding: "4px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onClick={() =>
                        handleUseSuggestion(cat.categoryId, cat.suggestedScore)
                      }
                    >
                      <span>
                        Gunakan Nilai Saran ({cat.suggestedScore.toFixed(2)})
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Alasan Perubahan / Catatan (Opsional)
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Catatan penyesuaian nilai atau hasil evaluasi..."
            style={{
              width: "100%",
              fontSize: "0.85rem",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border, #cbd5e1)",
            }}
          />
        </div>

        <div
          style={{
            position: "sticky",
            bottom: -28,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(8px)",
            padding: "16px 0 8px 0",
            borderTop: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={saving}
          >
            Batal
          </button>
          <button
            type="button"
            className="button primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan ke Draf"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function Gradebook({
  classId,
  writable,
}: {
  classId: string;
  writable: boolean;
}) {
  const info = useApi(`/course-classes/${classId}/gradebook`);
  const [modal, setModal] = useState<any>(null),
    [weights, setWeights] = useState<any[]>([]),
    [acknowledge, setAcknowledge] = useState(false),
    [message, setMessage] = useState(""),
    [gradeScaleVersion, setGradeScaleVersion] = useState("2026.1");
  const [changes, setChanges] = useState<
    Record<string, { userId: string; categoryId: string; score: string }>
  >({});
  const changedCount = Object.keys(changes).length;
  const [reason, setReason] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  useEffect(() => { if (!changedCount) setReason(""); }, [changedCount]);
  const data = info.data;

  useEffect(() => {
    if (data?.class?.gradeScaleVersion) {
      setGradeScaleVersion(data.class.gradeScaleVersion);
    }
  }, [data?.class?.gradeScaleVersion]);

  const pagination = usePagination(data?.rows ?? [], 25);

  if (info.loading && !data) return <Loading />;
  if (info.error) return <Notice error={info.error} />;
  if (!data) return null;
  if (!data.canManage) {
    const record = data.record;
    return record ? (
      <div className="grade-result">
        <div className="final-grade-card">
          <GraduationCap size={32} />
          <p>{t.finalScore}</p>
          <strong>{record.finalScore.toFixed(2)}</strong>
          <span>
            {record.gradeLetter} · {t.gradePoint} {record.gradePoint.toFixed(2)}
          </span>
          <small>
            {t.publishedAt} {date(record.publishedAt)}
          </small>
        </div>
        <div className="card">
          <h2>{t.grades}</h2>
          {record.categoryScoresJson.map((c: any) => (
            <div className="category-result" key={c.categoryId}>
              <span>
                {c.name}
                <small className="block">{c.weight}%</small>
              </span>
              <strong>{c.score.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <Empty>
        <GraduationCap size={35} />
        <h3>{t.noPublishedGrade}</h3>
        <p>{t.unpublishedScore}</p>
      </Empty>
    );
  }
  const locked = data.rows.some((r: any) => r.record?.isLocked),
    pending = data.rows.some((r: any) => r.pending.length),
    missing = data.rows.some((r: any) => r.missing.length);
  return (
    <>
      <div className="section-heading">
        <h2>{t.gradebook}</h2>
        <div className="toolbar">
          <Action
            run={async () =>
              exportSheet(
                `gradebook-${classId}.xlsx`,
                [
                  t.studentNumber,
                  t.name,
                  ...data.categories.map((c: any) => c.name),
                  t.progress,
                  t.finalScore,
                  t.letter,
                  t.status,
                ],
                data.rows.map((r: any) => [
                  r.user.identifierValue,
                  r.user.name,
                  ...r.categoryScores.map((c: any) => c.score),
                  r.progress,
                  r.finalScore,
                  r.gradeLetter,
                  r.record?.publishedAt ? t.published : t.draft,
                ]),
              )
            }
          >
            <Download size={16} />
            {t.export}
          </Action>
          {writable && (
            <>
              <button
                className="secondary"
                disabled={unsaved}
                onClick={() => setModal({ kind: "import" })}
              >
                <Upload size={16} />
                {t.import}
              </button>
              <button
                className="secondary"
                disabled={locked || unsaved}
                onClick={() => {
                  setWeights(structuredClone(data.categories));
                  setModal({ kind: "weights" });
                }}
              >
                {t.weights}
              </button>
              <Action
                className="secondary"
                disabled={locked || unsaved}
                run={async () => {
                  if (
                    !(await confirmAction(
                      "Terapkan nilai saran kalkulasi otomatis ke seluruh mahasiswa sebagai draf? Nilai saran dari aktivitas riil mahasiswa akan disimpan ke draf untuk dapat ditinjau lebih lanjut.",
                    ))
                  )
                    return;
                  const batchChanges: any[] = [];
                  for (const r of data.rows) {
                    for (const c of r.categoryScores) {
                      if (
                        c.sourceType !== "MANUAL" &&
                        c.suggestedScore !== undefined
                      ) {
                        batchChanges.push({
                          userId: r.user.id,
                          categoryId: c.categoryId,
                          score: c.suggestedScore,
                        });
                      }
                    }
                  }
                  if (!batchChanges.length) {
                    setMessage(
                      "Tidak ada nilai kalkulasi otomatis yang tersedia untuk diterapkan.",
                    );
                    return;
                  }
                  await api(
                    `/course-classes/${classId}/manual-grades/batch`,
                    "POST",
                    {
                      changes: batchChanges,
                      reason:
                        "Penerapan kalkulasi otomatis sistem ke draf rekap nilai",
                    },
                  );
                  setMessage(
                    `${batchChanges.length} nilai saran otomatis berhasil diterapkan ke draf.`,
                  );
                  info.reload();
                }}
              >
                <Calculator size={16} />
                Terapkan Kalkulasi Otomatis ke Draf
              </Action>
            </>
          )}
        </div>
      </div>
      {message && <Notice>{message}</Notice>}
      {!data.weightsValid && (
        <div className="error">{t.errors.WEIGHTS_TOTAL}</div>
      )}
      {pending && (
        <div className="callout warning">{t.pendingGradingWarning}</div>
      )}
      {locked && <div className="callout note">{t.publishedGradeWarning}</div>}
      <div className="weight-distribution-bar">
        {data.categories.map((c: any, i: number) => {
          // Shared categorical ramp: the chart tokens of the UAY design system.
          const colors = [
            "var(--chart-1)",
            "var(--chart-2)",
            "var(--chart-3)",
            "var(--chart-4)",
            "var(--chart-5)",
          ];
          return (
            <div
              key={c.id}
              className="weight-bar-segment"
              style={{
                width: `${c.weightPercent}%`,
                backgroundColor: colors[i % colors.length],
              }}
              title={`${c.name}: ${c.weightPercent}%`}
            />
          );
        })}
      </div>
      <div className="weight-strip">
        {data.categories.map((c: any) => (
          <span key={c.id}>
            <strong>{c.weightPercent}%</strong>
            {c.name}
          </span>
        ))}
      </div>
      <Form
        draftKey={"gradebook:" + classId}
        draftValue={{ changes, reason }}
        captureFields={false}
        onDirtyChange={setUnsaved}
        onRestoreDraft={value => { setChanges(value.changes ?? value); setReason(value.reason ?? ""); }}
        disabled={!writable}
        submitDisabled={!changedCount}
        submitLabel={"Simpan semua perubahan (" + changedCount + ")"}
        onSubmit={async (f) => {
          if (!changedCount) return false;
          const reason = textValue(f, "reason");
          await api(
            "/course-classes/" + classId + "/manual-grades/batch",
            "POST",
            {
              changes: Object.values(changes).map((c) => ({
                ...c,
                score: Number(c.score),
              })),
              ...(reason ? { reason } : {}),
            },
          );
          setChanges({});
          setReason("");
          setMessage(changedCount + " nilai berhasil disimpan.");
          info.reload();
        }}
      >
        <div
          className="card table-wrap grade-table"
          role="region"
          aria-label="Daftar nilai peserta"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>{t.name}</th>
                {data.categories.map((c: any) => (
                  <th key={c.id}>
                    {c.name}
                    <small className="block">{c.weightPercent}%</small>
                  </th>
                ))}
                <th>{t.progress}</th>
                <th>{t.finalScore}</th>
                <th>{t.letter}</th>
                <th>{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {pagination.paginatedItems.map((r: any) => (
                <tr
                  key={r.user.id}
                  className={writable ? "clickable-grade-row" : ""}
                  onClick={(e) => {
                    if (!writable) return;
                    const target = e.target as HTMLElement;
                    if (
                      target.tagName === "INPUT" ||
                      target.tagName === "TEXTAREA" ||
                      target.closest("button") ||
                      target.closest("input") ||
                      target.closest("textarea")
                    ) {
                      return;
                    }
                    setModal({ kind: "student_review", userId: r.user.id });
                  }}
                  title={
                    writable
                      ? "Klik baris untuk meninjau rincian capaian & kalkulasi nilai mahasiswa"
                      : undefined
                  }
                >
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong>{r.user.name}</strong>
                      {writable && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            background: "rgba(2, 132, 199, 0.1)",
                            color: "#0284c7",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          Tinjau
                        </span>
                      )}
                    </div>
                    <small className="block">{r.user.identifierValue}</small>
                  </td>
                  {r.categoryScores.map((c: any) => (
                    <td key={c.categoryId}>
                      {writable && c.source !== "PROGRESS" ? (
                        <GradeScoreInput
                          className={
                            changes[r.user.id + ":" + c.categoryId]
                              ? "changed"
                              : ""
                          }
                          ariaLabel={r.user.name + " · " + c.name}
                          value={
                            changes[r.user.id + ":" + c.categoryId]?.score ??
                            String(c.score)
                          }
                          onChange={(score) => {
                            const key = r.user.id + ":" + c.categoryId;
                            setChanges((previous) => {
                              const next = { ...previous };
                              if (score !== "" && Number(score) === c.score)
                                delete next[key];
                              else
                                next[key] = {
                                  userId: r.user.id,
                                  categoryId: c.categoryId,
                                  score,
                                };
                              return next;
                            });
                          }}
                        />
                      ) : (
                        c.score.toFixed(2)
                      )}
                    </td>
                  ))}
                  <td>
                    <span>{r.progress}%</span>
                    <progress value={r.progress} max={100} />
                  </td>
                  <td>
                    <strong>{r.finalScore.toFixed(2)}</strong>
                  </td>
                  <td>
                    <span className="letter-badge">{r.gradeLetter}</span>
                  </td>
                  <td>
                    <Badge
                      value={r.record?.publishedAt ? "PUBLISHED" : "DRAFT"}
                    />
                    {r.pending.length > 0 && (
                      <small className="block">{t.pendingGrading}</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.rows.length && <Empty>{t.noParticipants}</Empty>}
        </div>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          pageSizeOptions={[10, 25, 50, -1]}
        />
        {changedCount > 0 && (
          <Field
            label="Alasan perubahan / koreksi"
            hint="Wajib untuk mengganti nilai manual sebelumnya atau nilai yang sudah diterbitkan."
          >
            <textarea
              name="reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              minLength={5}
              required={Object.values(changes).some((change) => {
                const row = data.rows.find(
                  (r: any) => r.user.id === change.userId,
                );
                return (
                  row?.record?.publishedAt ||
                  row?.categoryScores.find(
                    (c: any) => c.categoryId === change.categoryId,
                  )?.source === "MANUAL"
                );
              })}
            />
          </Field>
        )}
      </Form>
      {writable && (
        <>
          <div className="publish-panel">
            <div>
              <h3>{t.publishFinal}</h3>
              {missing && (
                <>
                  <p>{t.missingScoresWarning}</p>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={acknowledge}
                      onChange={(e) => setAcknowledge(e.target.checked)}
                    />
                    {t.acknowledgeMissing}
                  </label>
                </>
              )}
            </div>
            <div className="toolbar">
              <Action
                disabled={!data.weightsValid || unsaved}
                run={async () => {
                  await api(
                    `/course-classes/${classId}/gradebook/calculate`,
                    "POST",
                    {},
                  );
                  setMessage(t.saved);
                  info.reload();
                }}
              >
                {t.calculate}
              </Action>
              <Action
                className="primary"
                disabled={
                  !data.weightsValid ||
                  unsaved ||
                  pending ||
                  (missing && !acknowledge)
                }
                run={async () => {
                  await api(
                    `/course-classes/${classId}/gradebook/publish`,
                    "POST",
                    { acknowledgeMissing: acknowledge },
                  );
                  setMessage(t.saved);
                  info.reload();
                }}
              >
                {t.publishFinal}
              </Action>
            </div>
          </div>
        </>
      )}
      {modal?.kind === "student_review" && (
        <StudentGradeReviewModal
          classId={classId}
          userId={modal.userId}
          onClose={() => setModal(null)}
          onSaved={() => {
            setMessage("Nilai draf berhasil disimpan.");
            info.reload();
          }}
        />
      )}
      {modal?.kind === "weights" && (
        <Modal title={t.weights} wide onClose={() => setModal(null)}>
          <Form
            draftKey="weights"
            draftValue={weights}
            onRestoreDraft={setWeights}
            onSubmit={async () => {
              await api(`/course-classes/${classId}/grade-categories`, "PUT", {
                categories: weights,
                gradeScaleVersion,
              });
              setModal(null);
              info.reload();
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <Field
                label="Kebijakan Konversi Huruf Mutu (Grade Scale Policy)"
                hint="Versi skala nilai mengontrol pemetaan skor ke huruf mutu (A, B, C, D, E). Nilai semester lampau yang telah dikunci/diterbitkan tidak akan terpengaruh jika versi baru dipilih."
              >
                <select
                  value={gradeScaleVersion}
                  onChange={(e) => setGradeScaleVersion(e.target.value)}
                >
                  <option value="2026.1">
                    2026.1 - Standar Baru UAY 2026 (A &ge; 85, B+ &ge; 80, B &ge; 75, dst.)
                  </option>
                  <option value="2024.1">
                    2024.1 - Kurikulum Transisi 2024 (A &ge; 80, B+ &ge; 75, B &ge; 70, dst.)
                  </option>
                </select>
              </Field>
            </div>
            <div className="weight-editor">
              {weights.map((c, i) => {
                const isMandatory =
                  c.isMandatory ||
                  ["uts", "uas"].includes((c.name || "").trim().toLowerCase());
                return (
                  <div
                    key={c.id ?? i}
                    style={{
                      border: "1px solid var(--border, #e2e8f0)",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      background: isMandatory ? "rgba(2, 132, 199, 0.03)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 130px 1.5fr auto",
                        gap: 12,
                        alignItems: "end",
                      }}
                    >
                      <Field label={t.category}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            required
                            disabled={isMandatory}
                            value={c.name}
                            onChange={(e) =>
                              setWeights(
                                weights.map((w, j) =>
                                  i === j ? { ...w, name: e.target.value } : w,
                                ),
                              )
                            }
                          />
                          {isMandatory && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                background: "#0284c7",
                                color: "#fff",
                                padding: "2px 6px",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                                fontWeight: 600,
                              }}
                            >
                              Wajib
                            </span>
                          )}
                        </div>
                      </Field>
                      <Field label={`${t.weight} (%)`}>
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          step="0.1"
                          value={c.weightPercent}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                            setWeights(
                              weights.map((w, j) =>
                                i === j ? { ...w, weightPercent: val } : w,
                              ),
                            );
                          }}
                        />
                      </Field>
                      <Field
                        label="Sumber Kalkulasi Otomatis"
                        hint="Pilih sumber aktivitas untuk saran nilai"
                      >
                        <select
                          value={c.sourceType || (c.kind === "PROGRESS" ? "PROGRESS" : "MANUAL")}
                          onChange={(e) =>
                            setWeights(
                              weights.map((w, j) =>
                                i === j ? { ...w, sourceType: e.target.value } : w,
                              ),
                            )
                          }
                        >
                          <option value="MANUAL">Input Manual (Tanpa Kalkulator)</option>
                          <option value="ASSIGNMENT">Tugas Terstruktur</option>
                          <option value="QUIZ">Kuis</option>
                          <option value="ASSIGNMENT_AND_QUIZ">Gabungan Tugas &amp; Kuis</option>
                          <option value="PROGRESS">Progres Belajar Materi</option>
                          <option value="ATTENDANCE">Presensi Kehadiran</option>
                        </select>
                      </Field>
                      <div style={{ paddingBottom: 4 }}>
                        {!isMandatory ? (
                          <button
                            type="button"
                            className="secondary danger"
                            style={{ padding: "8px 10px" }}
                            title="Hapus Kategori"
                            onClick={() =>
                              setWeights(weights.filter((_, j) => i !== j))
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--muted, #64748b)",
                              display: "block",
                              padding: "8px 4px",
                            }}
                            title="Kategori UTS & UAS wajib ada dan tidak dapat dihapus"
                          >
                            Terkunci
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="points-counter">
              <strong>
                {t.weight}:{" "}
                {weights.reduce((s, c) => s + c.weightPercent, 0).toFixed(2)} /
                100%
              </strong>
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() =>
                setWeights([
                  ...weights,
                  {
                    name: "",
                    weightPercent: 0,
                    kind: "ASSESSMENT",
                    aggregationMethod: "SIMPLE_AVERAGE",
                    dropLowest: 0,
                    isMandatory: false,
                    sourceType: "MANUAL",
                  },
                ])
              }
            >
              <Plus size={15} />
              {t.category}
            </button>
          </Form>
        </Modal>
      )}
      {modal?.kind === "import" && (
        <ImportPanel
          classId={classId}
          initialKind="GRADES"
          onClose={() => {
            setModal(null);
            info.reload();
          }}
        />
      )}
    </>
  );
}
export function parseCsv(source: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error(t.errors.VALIDATION_ERROR);
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
function normalizeRow(headers: string[], row: any[]) {
  return Object.fromEntries(
    headers.map((key, index) => {
      let value = row[index] ?? "";
      if (["options", "answerKey", "rubric"].includes(key)) {
        try {
          value = JSON.parse(value);
        } catch {}
      }
      if (["points", "maxWords"].includes(key) && value !== "")
        value = Number(value);
      return [key, value];
    }),
  );
}
export function ImportPanel({
  classId,
  initialKind,
  onClose,
}: {
  classId: string;
  initialKind: string;
  onClose: () => void;
}) {
  const categories = useApi<any[]>(
      `/course-classes/${classId}/grade-categories`,
    ),
    banks = useApi<any[]>(`/course-classes/${classId}/question-banks`);
  const [kind, setKind] = useState(initialKind),
    [target, setTarget] = useState(""),
    [rows, setRows] = useState<any[]>([]),
    [headers, setHeaders] = useState<string[]>([]),
    [review, setReview] = useState<any>(null),
    [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState("");
  const draft = useLocalDraft(
    "import:" + classId + ":" + initialKind,
    { kind, target, rows, headers, reason },
    (v) => {
      setKind(v.kind);
      setTarget(v.target);
      setRows(v.rows);
      setHeaders(v.headers);
      setReason(v.reason);
    },
  );
  const batch = () => ({
    kind,
    rows,
    ...(kind === "GRADES"
      ? { categoryId: target }
      : kind === "QUESTIONS"
        ? { bankId: target }
        : {}),
    ...(reason.trim() ? { reason } : {}),
  });
  useEffect(() => {
    setReview(null);
    if (!rows.length || (kind !== "ENROLLMENT" && !target)) return;
    let active = true;
    const timer = setTimeout(() => {
      api(`/course-classes/${classId}/imports/preview`, "POST", batch())
        .then((value) => {
          if (active) {
            setReview(value);
            setError(null);
          }
        })
        .catch((e) => {
          if (active) setError(e);
        });
    }, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [rows, kind, target, reason]);
  const template = async () => {
    const cols =
      kind === "ENROLLMENT"
        ? ["identifierValue", "email"]
        : kind === "GRADES"
          ? ["identifierValue", "score"]
          : ["text", "type", "points", "options", "answerKey", "rubric"];
    const example =
      kind === "ENROLLMENT"
        ? ["202601001", "202601001@example.test"]
        : kind === "GRADES"
          ? ["202601001", 85]
          : [
              "HTTP method for reading data",
              "SINGLE_CHOICE",
              10,
              JSON.stringify([
                { id: "a", text: "GET" },
                { id: "b", text: "POST" },
              ]),
              JSON.stringify({ correct: ["a"] }),
              "[]",
            ];
    await exportSheet(`template-${kind.toLowerCase()}.xlsx`, cols, [example]);
  };
  return (
    <Modal title={t.importTitle} wide onClose={onClose}>
      <div
        className="import-draft"
        data-dirty={draft.dirty ? "true" : undefined}
      >
        <SaveStatus draft={draft} />
      </div>
      <p>{t.importDescription}</p>
      <div className="form-grid">
        <Field label={t.importKind}>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setRows([]);
              setReview(null);
              setTarget("");
            }}
          >
            {["ENROLLMENT", "GRADES", "QUESTIONS"].map((value) => (
              <option value={value} key={value}>
                {(t as any)[value]}
              </option>
            ))}
          </select>
        </Field>
        {kind !== "ENROLLMENT" && (
          <Field label={kind === "GRADES" ? t.category : t.questionBanks}>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">{t.choose}</option>
              {(kind === "GRADES"
                ? categories.data?.filter((c) => c.kind !== "PROGRESS")
                : banks.data
              )?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name ?? item.title}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <div className="toolbar">
        <Action run={template}>
          <Download size={16} />
          {t.template}
        </Action>
        <label
          className="button secondary"
          style={{
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Upload size={16} />
          <span>{busy ? t.uploading : t.chooseFile}</span>
          <input
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setError(null);
              setBusy(true);
              try {
                if (file.size === 0 || file.size > 10 * 1024 * 1024)
                  throw new Error(t.errors.FILE_TYPE_OR_SIZE);
                let matrix: any[][];
                if (file.name.toLowerCase().endsWith(".csv"))
                  matrix = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
                else {
                  const book = await workbook();
                  await book.xlsx.load(await file.arrayBuffer());
                  const sheet = book.worksheets[0];
                  if (!sheet) throw new Error(t.errors.IMPORT_EMPTY);
                  matrix = [];
                  sheet.eachRow((row) => {
                    matrix.push(
                      (row.values as any[])
                        .slice(1)
                        .map((v) =>
                          v && typeof v === "object"
                            ? (v.text ?? v.result ?? "")
                            : v,
                        ),
                    );
                  });
                }
                if (matrix.length < 2 || matrix.length > 501)
                  throw new Error(t.errors.IMPORT_EMPTY);
                const cols = matrix[0].map((v) => String(v).trim());
                if (new Set(cols).size !== cols.length)
                  throw new Error(t.errors.VALIDATION_ERROR);
                setHeaders(cols);
                setRows(
                  matrix.slice(1).map((row) => ({
                    values: normalizeRow(cols, row),
                    exclude: false,
                    override: false,
                  })),
                );
                setReview(null);
              } catch (e) {
                setError(e as Error);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
      {kind === "GRADES" && (
        <Field label={t.reason} hint={t.reasonHint}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      )}
      {error && <Notice error={error} />}{" "}
      {busy ? (
        <Loading />
      ) : !rows.length ? (
        <Empty>{t.emptyImport}</Empty>
      ) : (
        <>
          <div className="import-summary">
            <strong>
              {rows.length} {t.row.toLowerCase()}
            </strong>
            <span>
              {review?.ready ?? 0} {t.ready}
            </span>
            <span>
              {review?.issues ?? 0} {t.issues}
            </span>
          </div>
          <div className="table-wrap import-table">
            <table>
              <thead>
                <tr>
                  <th>{t.row}</th>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                  <th>{t.status}</th>
                  <th>{t.oldValue}</th>
                  <th>{t.exclude}</th>
                  <th>{t.override}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className={row.exclude ? "excluded-row" : ""}>
                    <td>{index + 2}</td>
                    {headers.map((header) => (
                      <td key={header}>
                        <input
                          aria-label={`${header} ${index + 2}`}
                          disabled={row.exclude}
                          value={
                            typeof row.values[header] === "object"
                              ? JSON.stringify(row.values[header])
                              : (row.values[header] ?? "")
                          }
                          onChange={(e) => {
                            let value: any = e.target.value;
                            if (["points", "maxWords"].includes(header))
                              value = Number(value);
                            if (
                              ["options", "answerKey", "rubric"].includes(
                                header,
                              )
                            ) {
                              try {
                                value = JSON.parse(value);
                              } catch {}
                            }
                            setReview(null);
                            setRows(
                              rows.map((r, i) =>
                                i === index
                                  ? {
                                      ...r,
                                      values: { ...r.values, [header]: value },
                                    }
                                  : r,
                              ),
                            );
                          }}
                        />
                      </td>
                    ))}
                    <td>
                      {review?.rows[index]?.status === "READY" ? (
                        <Badge value="READY" />
                      ) : (
                        review?.rows[index]?.issues?.map((code: string) => (
                          <small className="block danger-text" key={code}>
                            {(t.errors as any)[code] ?? code}
                          </small>
                        ))
                      )}
                    </td>
                    <td>
                      <small>
                        {review?.rows[index]?.existing
                          ? JSON.stringify(
                              kind === "GRADES"
                                ? { score: review.rows[index].existing.score }
                                : { id: review.rows[index].existing.id },
                            )
                          : "—"}
                      </small>
                    </td>
                    <td>
                      <input
                        aria-label={`${t.exclude} ${index + 2}`}
                        type="checkbox"
                        checked={row.exclude}
                        onChange={(e) => {
                          setReview(null);
                          setRows(
                            rows.map((r, i) =>
                              i === index
                                ? { ...r, exclude: e.target.checked }
                                : r,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${t.override} ${index + 2}`}
                        type="checkbox"
                        checked={row.override}
                        onChange={(e) => {
                          setReview(null);
                          setRows(
                            rows.map((r, i) =>
                              i === index
                                ? { ...r, override: e.target.checked }
                                : r,
                            ),
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <Action
              run={async () =>
                setReview(
                  await api(
                    `/course-classes/${classId}/imports/preview`,
                    "POST",
                    batch(),
                  ),
                )
              }
            >
              {t.preview}
            </Action>
            <Action
              className="primary"
              disabled={
                !!draft.recovery ||
                !review ||
                review.issues > 0 ||
                review.ready === 0
              }
              run={async () => {
                await api(
                  `/course-classes/${classId}/imports/commit`,
                  "POST",
                  batch(),
                );
                await draft.saved();
                onClose();
              }}
            >
              {t.commitImport} ({review?.ready ?? 0})
            </Action>
          </div>
        </>
      )}
    </Modal>
  );
}
