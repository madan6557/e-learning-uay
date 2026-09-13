import { useLocalDraft, SaveStatus } from "./useLocalDraft";
import { useEffect, useState } from "react";
import { Download, Plus, Upload, GraduationCap } from "lucide-react";
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
} from "./lib";

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
    [message, setMessage] = useState("");
  const [changes, setChanges] = useState<
    Record<string, { userId: string; categoryId: string; score: string }>
  >({});
  const changedCount = Object.keys(changes).length;
  const [reason, setReason] = useState("");
  const [unsaved, setUnsaved] = useState(false);
  useEffect(() => { if (!changedCount) setReason(""); }, [changedCount]);
  const data = info.data;
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
                  r.user.studentStaffNumber,
                  r.user.fullName,
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
          const colors = ["#164638", "#2c6e58", "#438e73", "#68b093", "#9bd3b9"];
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
              {data.rows.map((r: any) => (
                <tr key={r.user.id}>
                  <td>
                    <strong>{r.user.fullName}</strong>
                    <small className="block">{r.user.studentStaffNumber}</small>
                  </td>
                  {r.categoryScores.map((c: any) => (
                    <td key={c.categoryId}>
                      {writable && c.source !== "PROGRESS" ? (
                        <input
                          className={
                            "score-input " +
                            (changes[r.user.id + ":" + c.categoryId]
                              ? "changed"
                              : "")
                          }
                          aria-label={r.user.fullName + " · " + c.name}
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          required
                          value={
                            changes[r.user.id + ":" + c.categoryId]?.score ??
                            String(c.score)
                          }
                          onChange={(e) => {
                            const score = e.target.value,
                              key = r.user.id + ":" + c.categoryId;
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
      {modal?.kind === "weights" && (
        <Modal title={t.weights} wide onClose={() => setModal(null)}>
          <Form
            draftKey="weights"
            draftValue={weights}
            onRestoreDraft={setWeights}
            onSubmit={async () => {
              await api(`/course-classes/${classId}/grade-categories`, "PUT", {
                categories: weights,
              });
              setModal(null);
              info.reload();
            }}
          >
            <div className="weight-editor">
              {weights.map((c, i) => (
                <div className="form-grid" key={c.id ?? i}>
                  <Field label={t.category}>
                    <input
                      required
                      value={c.name}
                      onChange={(e) =>
                        setWeights(
                          weights.map((w, j) =>
                            i === j ? { ...w, name: e.target.value } : w,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={t.weight}>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      step="0.01"
                      value={c.weightPercent}
                      onChange={(e) =>
                        setWeights(
                          weights.map((w, j) =>
                            i === j
                              ? { ...w, weightPercent: Number(e.target.value) }
                              : w,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
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
        ? ["studentStaffNumber", "email"]
        : kind === "GRADES"
          ? ["studentStaffNumber", "score"]
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
        <label className="upload-label">
          {t.chooseFile}
          <input
            type="file"
            accept=".csv,.xlsx"
            disabled={busy}
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
                        review?.rows[index]?.issues.map((code: string) => (
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
