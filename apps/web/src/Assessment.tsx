import { DraftRouteContext } from "./useLocalDraft";
import { navigate } from "./router";
import { confirmAction } from "./confirm";
import { notifyAction } from "./feedback";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock3,
  CheckCircle2,
  Lock,
  Save,
  Send,
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
  FileUpload,
  date,
  localInput,
  isoInput,
  textValue,
  numberValue,
  Pagination,
  usePagination,
} from "./lib";
import {
  RichTextEditor,
  formatContentHtml,
  stripHtmlTags,
} from "./components/ui/RichTextEditor";
import { DownloadButton, Html } from "./Content";
import {
  questionTypes,
  questionSchema,
  distributePoints,
  type QuestionData,
} from "../../../packages/shared/src/domain";
import { saveDraft, getDraft, removeDraft } from "./drafts";
const freshQuestion = () => ({
  text: "",
  type: "SINGLE_CHOICE",
  points: 10,
  options: [
    { id: "a", text: "" },
    { id: "b", text: "" },
  ],
  answerKey: { correct: ["a"], partialCredit: false },
  rubric: [],
  maxWords: 1000,
  explanation: "",
});
export function QuestionEditor({
  question: q,
  onChange,
}: {
  question: any;
  onChange: (q: any) => void;
}) {
  const change = (data: any) => onChange({ ...q, ...data });
  const key = (data: any) => change({ answerKey: { ...q.answerKey, ...data } });
  const type = q.type;
  return (
    <div className="question-editor">
      <div className="form-grid">
        <Field label={t.questionType}>
          <select
            value={type}
            onChange={(e) => {
              const type = e.target.value;
              change({
                type,
                options:
                  type === "TRUE_FALSE"
                    ? [
                        { id: "true", text: "True" },
                        { id: "false", text: "False" },
                      ]
                    : q.options,
                answerKey: {
                  correct: type === "TRUE_FALSE" ? ["true"] : [],
                  pairs:
                    type === "MATCHING"
                      ? Object.fromEntries(
                          q.options.map((o: any) => [o.id, o.id]),
                        )
                      : undefined,
                },
              });
            }}
          >
            {questionTypes.map((type) => (
              <option value={type} key={type}>
                {t.questionTypes[type]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.points}>
          <input
            type="number"
            step="1"
            min="1"
            max={1000}
            required
            value={q.points}
            onChange={(e) => change({ points: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label={t.text}>
        <RichTextEditor
          compact
          required
          rows={3}
          value={q.text}
          onChange={(val) => change({ text: val })}
          placeholder="Tuliskan pertanyaan butir soal (bisa diformat tebal, miring, poin, atau kode)..."
          defaultAiTemplate="quiz"
        />
      </Field>
      {[
        "SINGLE_CHOICE",
        "MULTIPLE_SELECT",
        "TRUE_FALSE",
        "MATCHING",
        "ORDERING",
      ].includes(type) && (
        <div className="question-options">
          <span className="field-title">{t.options}</span>
          {q.options.map((option: any, index: number) => (
            <div className="option-editor" key={option.id}>
              <span>{option.id.toUpperCase()}</span>
              <input
                required
                aria-label={`${t.options} ${index + 1}`}
                value={option.text}
                onChange={(e) =>
                  change({
                    options: q.options.map((o: any, i: number) =>
                      i === index ? { ...o, text: e.target.value } : o,
                    ),
                  })
                }
              />
              {type === "MATCHING" && (
                <input
                  aria-label={`${t.description} ${index + 1}`}
                  placeholder={t.description}
                  value={option.rightText ?? ""}
                  onChange={(e) =>
                    change({
                      options: q.options.map((o: any, i: number) =>
                        i === index ? { ...o, rightText: e.target.value } : o,
                      ),
                    })
                  }
                />
              )}
              <button
                type="button"
                className="icon-button"
                aria-label={t.delete}
                onClick={() =>
                  change({
                    options: q.options.filter(
                      (_: any, i: number) => i !== index,
                    ),
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-button"
            onClick={() =>
              change({
                options: [
                  ...q.options,
                  { id: crypto.randomUUID().slice(0, 6), text: "" },
                ],
              })
            }
          >
            <Plus size={15} />
            {t.add}
          </button>
        </div>
      )}
      {["SINGLE_CHOICE", "TRUE_FALSE"].includes(type) && (
        <Field label={t.correctAnswer}>
          <select
            required
            value={q.answerKey.correct?.[0] ?? ""}
            onChange={(e) => key({ correct: [e.target.value] })}
          >
            <option value="">{t.choose}</option>
            {q.options.map((o: any) => (
              <option value={o.id} key={o.id}>
                {o.id.toUpperCase()}. {o.text}
              </option>
            ))}
          </select>
        </Field>
      )}
      {type === "MULTIPLE_SELECT" && (
        <>
          <span className="field-title">{t.correctAnswer}</span>
          {q.options.map((o: any) => (
            <label key={o.id} className="check-row">
              <input
                type="checkbox"
                checked={q.answerKey.correct?.includes(o.id)}
                onChange={(e) =>
                  key({
                    correct: e.target.checked
                      ? [...(q.answerKey.correct ?? []), o.id]
                      : q.answerKey.correct.filter((id: string) => id !== o.id),
                  })
                }
              />
              {o.text || o.id}
            </label>
          ))}
          <label className="check-row">
            <input
              type="checkbox"
              checked={!!q.answerKey.partialCredit}
              onChange={(e) => key({ partialCredit: e.target.checked })}
            />
            {t.partialCredit}
          </label>
        </>
      )}
      {type === "SHORT_ANSWER" && (
        <>
          <Field label={t.correctAnswer}>
            <input
              value={q.answerKey.correct?.join(" | ") ?? ""}
              onChange={(e) =>
                key({ correct: e.target.value.split("|").map((v) => v.trim()) })
              }
            />
          </Field>
          <div className="form-grid">
            <Field label={t.numericValue}>
              <input
                type="number"
                step="any"
                value={q.answerKey.numericValue ?? ""}
                onChange={(e) =>
                  key({
                    numericValue:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label={t.tolerance}>
              <input
                type="number"
                min={0}
                step="any"
                value={q.answerKey.tolerance ?? 0}
                onChange={(e) => key({ tolerance: Number(e.target.value) })}
              />
            </Field>
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={!!q.answerKey.caseSensitive}
              onChange={(e) => key({ caseSensitive: e.target.checked })}
            />
            {t.caseSensitive}
          </label>
        </>
      )}
      {type === "MATCHING" && (
        <>
          <span className="field-title">{t.answerKey}</span>
          {q.options.map((o: any) => (
            <Field key={o.id} label={o.text || o.id}>
              <select
                required
                value={q.answerKey.pairs?.[o.id] ?? ""}
                onChange={(e) =>
                  key({
                    pairs: { ...q.answerKey.pairs, [o.id]: e.target.value },
                  })
                }
              >
                <option value="">{t.choose}</option>
                {q.options.map((right: any) => (
                  <option value={right.id} key={right.id}>
                    {right.rightText || right.text || right.id}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </>
      )}
      {type === "ORDERING" && (
        <Field label={t.answerKey}>
          <select value="" onChange={() => {}} hidden />
          <div className="ordering-key">
            {q.options.map((_: any, index: number) => (
              <select
                key={index}
                required
                aria-label={`${t.answerKey} ${index + 1}`}
                value={q.answerKey.correct?.[index] ?? ""}
                onChange={(e) => {
                  const values = [...(q.answerKey.correct ?? [])];
                  values[index] = e.target.value;
                  key({ correct: values });
                }}
              >
                <option value="">
                  {index + 1}. {t.choose}
                </option>
                {q.options.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.text}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </Field>
      )}
      {["ESSAY", "FILE_UPLOAD"].includes(type) && (
        <>
          <Field label={t.maxWords}>
            <input
              type="number"
              min={1}
              max={10000}
              value={q.maxWords ?? 1000}
              onChange={(e) => change({ maxWords: Number(e.target.value) })}
            />
          </Field>
          <Field label={t.rubric} hint={t.rubricHint}>
            <textarea
              defaultValue={(q.rubric ?? [])
                .map((r: any) => `${r.title} | ${r.points}`)
                .join("\n")}
              onChange={(e) =>
                change({
                  rubric: e.target.value.trim()
                    ? e.target.value.split("\n").map((line) => {
                        const [title, points] = line.split("|");
                        return { title: title.trim(), points: Number(points) };
                      })
                    : [],
                })
              }
            />
          </Field>
        </>
      )}
      <Field label={t.explanation}>
        <RichTextEditor
          compact
          rows={3}
          value={q.explanation ?? ""}
          onChange={(val) => change({ explanation: val })}
          placeholder="Tuliskan pembahasan atau penjelasan jawaban..."
          defaultAiTemplate="quiz"
        />
      </Field>
    </div>
  );
}
export function QuizEditor({
  classId,
  sectionId,
  quiz,
  onClose,
  onSaved,
}: {
  classId: string;
  sectionId: string;
  quiz?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = useApi<any[]>(
      `/course-classes/${classId}/grade-categories`,
    ),
    banks = useApi<any[]>(`/course-classes/${classId}/question-banks`);
  const [questions, setQuestions] = useState<any[]>(
    quiz?.questions ?? [freshQuestion()],
  );
  const [scoreMode, setScoreMode] = useState(quiz?.scoreMode ?? "STRICT");
  const [timerMode, setTimerMode] = useState(quiz?.timerMode ?? "INDEPENDENT");
  const [releaseMode, setReleaseMode] = useState(
    quiz?.resultReleaseMode ?? "MANUAL",
  );
  const [description, setDescription] = useState(quiz?.description ?? "");
  const total = questions.reduce((s, q) => s + q.points, 0);
  return (
    <Modal wide title={quiz ? t.edit : t.newQuiz} onClose={onClose}>
      <Form
        draftKey={`quiz:${quiz?.id ?? sectionId}`}
        publication={{
          published: quiz?.status === "PUBLISHED" && quiz?.isVisible,
          onUnpublish: quiz
            ? async () => {
                await api(`/quizzes/${quiz.id}/unpublish`, "POST", {});
                onSaved();
              }
            : undefined,
        }}
        draftValue={{ questions, scoreMode, timerMode, releaseMode, description }}
        onRestoreDraft={(v) => {
          setQuestions(v.questions);
          setScoreMode(v.scoreMode);
          setTimerMode(v.timerMode);
          setReleaseMode(v.releaseMode);
          if (v.description !== undefined) setDescription(v.description);
        }}
        onCancel={onClose}
        onSubmit={async (f, intent) => {
          const data = {
            title: textValue(f, "title"),
            description: textValue(f, "description"),
            gradeCategoryId: textValue(f, "category") || null,
            timeLimitMinutes: numberValue(f, "timeLimit"),
            timerMode,
            passingScore: numberValue(f, "passingScore"),
            attemptLimit: numberValue(f, "attemptLimit"),
            randomizeQuestions: f.has("shuffleQuestions"),
            randomizeOptions: f.has("shuffleOptions"),
            scoreMode,
            resultReleaseMode: releaseMode,
            resultReleaseAt: isoInput(f.get("releaseAt")),
            availableFrom: isoInput(f.get("opens")),
            availableUntil: isoInput(f.get("closes")),
            status: intent === "publish" ? "PUBLISHED" : "DRAFT",
            isVisible: intent === "publish",
            questions: questions.map((q) => questionSchema.parse(q)),
          };
          await api(
            quiz ? `/quizzes/${quiz.id}` : `/sections/${sectionId}/quizzes`,
            quiz ? "PATCH" : "POST",
            data,
          );
          onSaved();
        }}
      >
        <Field label={t.title}>
          <input name="title" required defaultValue={quiz?.title} />
        </Field>
        <Field label={`${t.description} (Format Teks Rapi)`}>
          <RichTextEditor
            name="description"
            rows={4}
            value={description}
            onChange={setDescription}
            placeholder="Tuliskan petunjuk atau deskripsi kuis..."
            defaultAiTemplate="quiz"
          />
        </Field>
        <div className="form-grid">
          <Field label={t.category}>
            <select name="category" defaultValue={quiz?.gradeCategoryId ?? ""}>
              <option value="">{t.choose}</option>
              {categories.data
                ?.filter((c) => c.kind !== "PROGRESS")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t.scoreMode}>
            <select
              value={scoreMode}
              onChange={(e) => setScoreMode(e.target.value)}
            >
              <option value="STRICT">{t.STRICT}</option>
              <option value="NORMALIZED">{t.NORMALIZED}</option>
            </select>
          </Field>
          <Field label={t.timeLimit}>
            <input
              name="timeLimit"
              type="number"
              min={1}
              max={300}
              required
              defaultValue={quiz?.timeLimitMinutes ?? 30}
            />
          </Field>
          <Field label={t.attemptLimit}>
            <input
              name="attemptLimit"
              type="number"
              min={1}
              max={10}
              required
              defaultValue={quiz?.attemptLimit ?? 1}
            />
          </Field>
          <Field label={t.timerMode}>
            <select
              value={timerMode}
              onChange={(e) => setTimerMode(e.target.value)}
            >
              <option value="INDEPENDENT">{t.timerIndependent}</option>
              <option value="GLOBAL">{t.timerGlobal}</option>
            </select>
          </Field>
          <Field label={t.passingScore}>
            <input
              name="passingScore"
              type="number"
              min={0}
              max={100}
              step="1"
              required
              defaultValue={quiz?.passingScore ?? 60}
            />
          </Field>
          <Field label={t.opens}>
            <input
              type="datetime-local"
              name="opens"
              defaultValue={localInput(quiz?.availableFrom)}
            />
          </Field>
          <Field label={t.closes}>
            <input
              type="datetime-local"
              name="closes"
              required={timerMode === "GLOBAL"}
              defaultValue={localInput(quiz?.availableUntil)}
            />
          </Field>
          <Field label={t.releaseMode}>
            <select
              value={releaseMode}
              onChange={(e) => setReleaseMode(e.target.value)}
            >
              {["MANUAL", "AUTO", "SCHEDULED", "HIDDEN"].map((v) => (
                <option key={v} value={v}>
                  {(t as any)[v]}
                </option>
              ))}
            </select>
          </Field>
          {releaseMode === "SCHEDULED" && (
            <Field label={t.releaseAt}>
              <input
                name="releaseAt"
                type="datetime-local"
                required
                defaultValue={localInput(quiz?.resultReleaseAt)}
              />
            </Field>
          )}
        </div>
        <div className="toolbar">
          <label className="check-row">
            <input
              name="shuffleQuestions"
              type="checkbox"
              defaultChecked={quiz?.randomizeQuestions ?? true}
            />
            {t.shuffleQuestions}
          </label>
          <label className="check-row">
            <input
              name="shuffleOptions"
              type="checkbox"
              defaultChecked={quiz?.randomizeOptions ?? true}
            />
            {t.shuffleOptions}
          </label>
        </div>
        <div
          className={`points-counter ${scoreMode === "STRICT" && Math.abs(total - 100) > 0.001 ? "warning" : ""}`}
        >
          <strong>
            {t.totalPoints}: {total.toFixed(2)} / 100
          </strong>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const points = distributePoints(questions.map((q) => q.points));
              setQuestions(
                questions.map((q, i) => ({
                  ...q,
                  points: points[i],
                  rubric: [],
                })),
              );
            }}
          >
            {t.distributePoints}
          </button>
        </div>
        {questions.map((q, index) => (
          <details
            open={index === questions.length - 1}
            className="question-edit-card"
            key={index}
          >
            <summary>
              {index + 1}. {stripHtmlTags(q.text) || t.newQuestion}
              <span>
                {q.points} {t.points}
              </span>
            </summary>
            <QuestionEditor
              question={q}
              onChange={(next) =>
                setQuestions(
                  questions.map((old, i) => (i === index ? next : old)),
                )
              }
            />
            <button
              type="button"
              className="text-button danger-text"
              onClick={() =>
                setQuestions(questions.filter((_, i) => i !== index))
              }
            >
              <Trash2 size={15} />
              {t.delete}
            </button>
          </details>
        ))}
        <div className="toolbar">
          <button
            type="button"
            className="secondary"
            onClick={() => setQuestions([...questions, freshQuestion()])}
          >
            <Plus size={15} />
            {t.newQuestion}
          </button>
          <select
            aria-label={t.selectBankQuestion}
            value=""
            onChange={(e) => {
              const q = banks.data
                ?.flatMap((b) => b.questions)
                .find((q) => q.id === e.target.value);
              if (q) setQuestions([...questions, structuredClone(q)]);
            }}
          >
            <option value="">{t.selectBankQuestion}</option>
            {banks.data?.map((b) => (
              <optgroup label={b.title} key={b.id}>
                {b.questions.map((q: any) => (
                  <option value={q.id} key={q.id}>
                    {stripHtmlTags(q.text) || `${t.questions} ${q.id}`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </Form>
    </Modal>
  );
}
export function QuizPage({
  id,
  user,
  backHref = "/classes",
}: {
  id: string;
  user: any;
  backHref?: string;
}) {
  const info = useApi(`/quizzes/${id}`);
  const [active, setActive] = useState<any>(null),
    [editing, setEditing] = useState(false),
    [grading, setGrading] = useState<any>(null),
    [byQuestion, setByQuestion] = useState("");
  const quiz = info.data;
  const pagination = usePagination(quiz?.attempts ?? [], 15);
  useEffect(() => {
    if (quiz?.path && location.pathname.startsWith("/quizzes/"))
      navigate(quiz.path, true);
  }, [quiz?.path]);
  if (info.loading && !quiz) return <Loading />;
  if (info.error) return <Notice error={info.error} />;
  const isDeptAdminForClass = user.role === "DEPARTMENT_ADMIN" && quiz.canManage;
  const canEdit =
    (user.role === "INSTRUCTOR" || isDeptAdminForClass) &&
    quiz.canManage &&
    !quiz.isClassArchived;
  const canGrade =
    user.role === "INSTRUCTOR" && quiz.canManage && !quiz.isClassArchived;
  const current =
    active ??
    quiz.attempts.find(
      (a: any) => a.status === "IN_PROGRESS" && !quiz.canManage,
    );
  const isStudent = !quiz.canManage;
  const isClosed = Boolean(
    quiz.isClosed ||
      quiz.isGradeLocked ||
      quiz.isTimeClosed ||
      quiz.isClassArchived ||
      quiz.isAttemptLimitReached,
  );
  return (
    <DraftRouteContext.Provider value={`#/quizzes/${id}`}>
      <a className="back-link" href={quiz.classPath ?? backHref}>
        <ArrowLeft size={16} />
        {t.back}
      </a>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">{t.quiz}</div>
          <h1>{quiz.title}</h1>
          {quiz.description && (
            <div className="formatted-content" style={{ marginTop: 8 }}>
              <Html text={formatContentHtml(quiz.description)} inline={false} />
            </div>
          )}
        </div>
        <div className="toolbar">
          {isStudent ? (
            <Badge
              value={
                quiz.isCompleted
                  ? "COMPLETED"
                  : isClosed
                    ? "CLOSED"
                    : quiz.isVisible
                      ? quiz.status
                      : "DRAFT"
              }
            />
          ) : (
            <Badge value={quiz.isVisible ? quiz.status : "DRAFT"} />
          )}
          {canEdit && (
            <button className="secondary" onClick={() => setEditing(true)}>
              {t.edit}
            </button>
          )}
        </div>
      </div>
      {quiz.isClassArchived && quiz.canManage && (
        <div className="callout note">Kelas diarsipkan. Kuis dapat dilihat, tetapi tidak dapat diubah atau dinilai.</div>
      )}
      <div className="assessment-meta">
        <span>
          <Clock3 size={17} />
          {quiz.timerMode === "GLOBAL"
            ? t.timerGlobal
            : `${quiz.timeLimitMinutes} min`}
        </span>
        <span>
          {t.attemptLimit}: {quiz.attemptLimit}
        </span>
        {quiz.availableUntil && (
          <span>
            {t.closes}: {date(quiz.availableUntil)}
          </span>
        )}
      </div>
      {!quiz.canManage && quiz.attempts?.length > 0 && !current && (() => {
        const latestAttempt = quiz.attempts[0];
        const hasScore = latestAttempt.score !== undefined && latestAttempt.score !== null;
        return (
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(2, 132, 199, 0.02))",
              border: "1px solid rgba(2, 132, 199, 0.25)",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="eyebrow" style={{ color: "#0284c7", fontWeight: 700 }}>
                  HASIL &amp; NILAI KUIS
                </span>
                <Badge value={latestAttempt.status} />
              </div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                {hasScore ? (
                  <>Nilai Anda: <span style={{ color: "#0284c7" }}>{Number.isInteger(latestAttempt.score) ? latestAttempt.score : latestAttempt.score.toFixed(1)}</span> / 100</>
                ) : (
                  "Nilai Sedang Dalam Proses Penilaian / Belum Dipublikasikan"
                )}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "var(--muted, #64748b)" }}>
                Dikerjakan pada: {date(latestAttempt.submittedAt || latestAttempt.startedAt)} · Percobaan ke-{latestAttempt.attemptNum} dari {quiz.attemptLimit}
              </p>
            </div>
            <div>
              {hasScore ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    background: "rgba(22, 163, 74, 0.12)",
                    color: "#16a34a",
                  }}
                >
                  <CheckCircle2 size={16} /> Nilai Resmi Terbit
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    background: "rgba(234, 179, 8, 0.12)",
                    color: "#ca8a04",
                  }}
                >
                  <Clock3 size={16} /> Menunggu Publikasi Nilai
                </span>
              )}
            </div>
          </div>
        );
      })()}
      {!quiz.canManage &&
        (current ? (
          <AttemptRunner
            key={current.id}
            attempt={current}
            user={user}
            classId={quiz.classId}
            onDone={() => {
              setActive(null);
              info.reload();
            }}
          />
        ) : isClosed ? (
          <div className="card quiz-closed-card">
            <span
              className={`closed-icon-wrap ${
                quiz.isCompleted
                  ? "is-completed"
                  : quiz.isGradeLocked
                    ? "is-locked"
                    : ""
              }`}
            >
              {quiz.isCompleted ? (
                <CheckCircle2 size={28} />
              ) : quiz.isGradeLocked ? (
                <Lock size={28} />
              ) : quiz.isTimeClosed ? (
                <Clock3 size={28} />
              ) : (
                <Lock size={28} />
              )}
            </span>
            <h2>
              {quiz.isCompleted
                ? t.quizCompleted
                : quiz.isGradeLocked
                  ? t.quizClosed
                  : quiz.isTimeClosed
                    ? t.quizClosed
                    : quiz.isAttemptLimitReached
                      ? t.quizAttemptLimitReached
                      : t.quizClosed}
            </h2>
            <p className="closed-description">
              {quiz.isGradeLocked
                ? t.quizClosedGradeLocked
                : quiz.isTimeClosed
                  ? `${t.quizClosedTime} (${date(quiz.availableUntil)})`
                  : quiz.isAttemptLimitReached
                    ? t.quizAttemptLimitReached
                    : quiz.isClassArchived
                      ? t.quizArchived
                      : t.quizClosed}
            </p>
            <div className="closed-actions">
              <button className="secondary" disabled>
                {t.quizClosedAction}
              </button>
              {quiz.classPath && (
                <a className="secondary" href={quiz.classPath}>
                  {t.back}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="card quiz-start">
            <ClipboardCheckIcon />
            <h2>{t.startQuiz}</h2>
            <p>
              {quiz.timerMode === "GLOBAL"
                ? t.timerGlobal
                : `${t.timeLimit}: ${quiz.timeLimitMinutes}`}{" "}
              · {t.attemptLimit}: {quiz.attemptLimit}
            </p>
            <Action
              className="primary"
              disabled={quiz.attempts.length >= quiz.attemptLimit}
              run={async () =>
                setActive(await api(`/quizzes/${id}/attempts`, "POST", {}))
              }
            >
              {t.startQuiz}
            </Action>
          </div>
        ))}
      <div className="section-heading" style={{ flexWrap: "wrap", gap: 12 }}>
        <h2>{quiz.canManage ? t.gradeAnswer : t.attemptHistory}</h2>
        {canGrade && (
          <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            {quiz.questions.some((q: any) => ["ESSAY", "FILE_UPLOAD"].includes(q.type)) && (
              <label className="grading-mode-field">
                <span>{t.gradingMode}</span>
                <select
                  aria-label={t.gradeByQuestion}
                  value={byQuestion}
                  onChange={(e) => setByQuestion(e.target.value)}
                >
                  <option value="">{t.allQuestions}</option>
                  {quiz.questions
                    .filter((q: any) => ["ESSAY", "FILE_UPLOAD"].includes(q.type))
                    .map((q: any) => {
                      const idx = quiz.questions.findIndex((item: any) => item.id === q.id) + 1;
                      const clean = stripHtmlTags(q.text);
                      const preview = clean ? (clean.length > 30 ? clean.slice(0, 30) + "..." : clean) : "";
                      return (
                        <option value={q.id} key={q.id}>
                          Soal {idx}: {preview}
                        </option>
                      );
                    })}
                </select>
              </label>
            )}
            <Action
              className="primary"
              disabled={!quiz.attempts.some((a: any) => a.status === "GRADED_COMPLETE" && !a.publishedAt)}
              run={async () => {
                await api(`/quizzes/${id}/publish-grades`, "POST", {});
                info.reload();
              }}
            >
              {t.publishAllGrades}
            </Action>
          </div>
        )}
      </div>
      <div className="card table-wrap phone-record-table">
        <table>
          <thead>
            <tr>
              {quiz.canManage && <th>{t.name}</th>}
              <th>{t.attempt}</th>
              <th>{t.status}</th>
              <th>{t.submittedAt}</th>
              <th>{t.score}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.map((a: any) => (
              <tr key={a.id}>
                {quiz.canManage && (
                  <td className="record-title">
                    {a.user.name}
                    <small className="block">{a.user.identifierValue}</small>
                  </td>
                )}
                <td data-label={t.attempt}>{a.attemptNum}</td>
                <td data-label={t.status}>
                  <Badge value={a.status} />
                  {a.forced && <small className="block">{t.timeExpired}</small>}
                </td>
                <td data-label={t.submittedAt}>{date(a.submittedAt)}</td>
                <td data-label={t.score}>
                  {a.score === undefined ? (
                    <small>{t.unpublishedScore}</small>
                  ) : (
                    <div>
                      <strong>
                        {Number.isInteger(a.score) ? a.score : a.score.toFixed(1)}
                      </strong>
                      {quiz.canManage && (
                        <small
                          className="block"
                          style={{
                            color: a.publishedAt ? "var(--success, #16a34a)" : "var(--muted)",
                            fontWeight: 500,
                          }}
                        >
                          {a.publishedAt ? `✓ ${t.published}` : t.unpublished}
                        </small>
                      )}
                    </div>
                  )}
                </td>
                <td className="record-actions">
                  <div className="record-action-buttons">
                    {canGrade && a.status !== "IN_PROGRESS" && (
                      <button className="secondary" onClick={() => setGrading(a)}>
                        {t.gradeAnswer}
                      </button>
                    )}
                    {canGrade && a.status === "GRADED_COMPLETE" && !a.publishedAt && (
                      <Action
                        className="primary"
                        run={async () => {
                          await api(`/quizzes/${id}/publish-grades`, "POST", { attemptId: a.id });
                          info.reload();
                        }}
                      >
                        {t.publishGrades}
                      </Action>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quiz.attempts.length > 0 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            pageSizeOptions={[10, 15, 25, 50]}
          />
        )}
        {!quiz.attempts.length && <Empty>{t.noAttempts}</Empty>}
      </div>
      {editing && (
        <QuizEditor
          quiz={quiz}
          sectionId={quiz.sectionId}
          classId={quiz.classId}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            info.reload();
          }}
        />
      )}
      {grading && (
        <ManualQuizGrading
          attempt={grading}
          questionId={byQuestion}
          onClose={() => setGrading(null)}
          onSaved={() => {
            setGrading(null);
            info.reload();
          }}
        />
      )}
    </DraftRouteContext.Provider>
  );
}
function ClipboardCheckIcon() {
  return <CheckCircle2 className="hero-icon" size={38} />;
}
function AttemptRunner({
  attempt,
  user,
  classId,
  onDone,
}: {
  attempt: any;
  user: any;
  classId: string;
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, any>>(
      attempt.answersJson,
    ),
    [time, setTime] = useState(Date.now()),
    [status, setStatus] = useState(t.answerSaved),
    [error, setError] = useState<Error | null>(null),
    [recovery, setRecovery] = useState<any>(null),
    [submitting, setSubmitting] = useState(false),
    [successSubmitted, setSuccessSubmitted] = useState(false);
  const answerRef = useRef(answers),
    revision = useRef(attempt.revision),
    dirty = useRef(false),
    busy = useRef<Promise<any> | null>(null),
    closed = useRef(false);
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = (id: string, value: unknown) => {
    const next = { ...answerRef.current, [id]: value };
    answerRef.current = next;
    dirty.current = true;
    setAnswers(next);
    setStatus(t.savingAnswer);
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => {
      if (!closed.current)
        saveDraft(user.id, attempt.id, {
          answers: answerRef.current,
          revision: revision.current,
        }).catch(() => setError(new Error(t.draftStorageError)));
    }, 2000);
  };
  const save = async () => {
    if (busy.current) await busy.current;
    if (!dirty.current || closed.current) return;
    const snapshot = answerRef.current;
    busy.current = (async () => {
      try {
        const result = await api(`/attempts/${attempt.id}/answers`, "PUT", {
          answers: snapshot,
          revision: revision.current,
        });
        revision.current = result.revision;
        if (result.status !== "IN_PROGRESS") {
          closed.current = true;
          await removeDraft(user.id, attempt.id);
          onDone();
          return;
        }
        if (snapshot === answerRef.current) dirty.current = false;
        setStatus(t.answerSaved);
      } catch (e) {
        setStatus(t.answerSaveFailed);
        throw e;
      } finally {
        busy.current = null;
      }
    })();
    await busy.current;
  };
  const submit = async (forced = false) => {
    if (submitting || closed.current) return;
    if (!forced && !(await confirmAction(t.confirmSubmitQuiz))) return;
    setSubmitting(true);
    try {
      if (!forced) await save();
      if (closed.current) return;
      await api(`/attempts/${attempt.id}/submit`, "POST", {});
      closed.current = true;
      if (localTimer.current) clearTimeout(localTimer.current);
      await removeDraft(user.id, attempt.id);
      if (forced) {
        onDone();
      } else {
        setSuccessSubmitted(true);
      }
    } catch (e) {
      const err = e as Error;
      setError(err);
      notifyAction(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };
  useEffect(() => {
    getDraft(user.id, attempt.id)
      .then((d) => {
        if (d && (d.value as any).revision >= attempt.revision) setRecovery(d);
      })
      .catch(() => {});
    const clock = setInterval(() => setTime(Date.now()), 1000);
    const autosave = setInterval(() => {
      void save().catch(() => {});
    }, 3000);
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      clearInterval(clock);
      clearInterval(autosave);
      if (localTimer.current) clearTimeout(localTimer.current);
      if (dirty.current && !closed.current)
        void saveDraft(user.id, attempt.id, {
          answers: answerRef.current,
          revision: revision.current,
        });
      window.removeEventListener("beforeunload", warn);
    };
  }, []);
  const remaining = Math.max(
    0,
    Math.ceil((Date.parse(attempt.expiresAt) - time) / 1000),
  );
  useEffect(() => {
    if (!remaining) void submit(true);
  }, [remaining]);
  const isAnswered = (q: any) => {
    const val = answers[q.id];
    if (val === undefined || val === null || val === "") return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return true;
  };
  const totalQuestions = attempt.questionSnapshot.length;
  const answeredCount = attempt.questionSnapshot.filter(isAnswered).length;
  const isTimeWarning = remaining > 0 && remaining <= 300;
  return (
    <section className="quiz-runner">
      <div className={`quiz-sticky ${isTimeWarning ? "time-warning" : ""}`}>
        <div className="quiz-sticky-top">
          <span className="quiz-timer">
            <Clock3 size={18} />
            {t.remaining}{" "}
            <strong>
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </strong>
          </span>
          <span className="quiz-progress-text">
            <strong>{answeredCount}</strong> / {totalQuestions} terjawab
          </span>
          <span className="quiz-save-status" role="status">
            <Save size={15} />
            {status}
          </span>
        </div>
        <div className="quiz-progress-track">
          <div
            className="quiz-progress-bar"
            style={{
              width: `${(answeredCount / (totalQuestions || 1)) * 100}%`,
            }}
          />
        </div>
        <div className="question-nav-pills" aria-label="Navigasi nomor soal">
          {attempt.questionSnapshot.map((q: any, idx: number) => {
            const answered = isAnswered(q);
            return (
              <button
                key={q.id}
                type="button"
                className={`q-pill ${answered ? "answered" : "unanswered"}`}
                onClick={() => {
                  document.getElementById(`q-${q.id}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }}
                title={`Soal ${idx + 1}: ${answered ? "Sudah dijawab" : "Belum dijawab"}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
      {recovery && (
        <div className="recovery-banner">
          {t.draftFound}
          <button
            className="secondary"
            onClick={() => {
              answerRef.current = recovery.value.answers;
              setAnswers(recovery.value.answers);
              dirty.current = true;
              setRecovery(null);
            }}
          >
            {t.restoreDraft}
          </button>
        </div>
      )}
      {error && <Notice error={error} onClose={() => setError(null)} />}
      <fieldset disabled={submitting || remaining === 0}>
        {attempt.questionSnapshot.map((q: any, index: number) => (
          <article className="card answer-card" key={q.id} id={`q-${q.id}`}>
            <div className="question-label">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t.questions} {index + 1}
                {isAnswered(q) && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "#dcfce7",
                      color: "#15803d",
                      fontWeight: 500,
                    }}
                  >
                    ✓ Terjawab
                  </span>
                )}
              </span>
              <span>
                {q.points} {t.points}
              </span>
            </div>
            <h3>
              <Html text={formatContentHtml(q.text)} />
            </h3>
            <AnswerInput
              question={q}
              value={answers[q.id]}
              onChange={(value) => change(q.id, value)}
              classId={classId}
              attemptId={attempt.id}
            />
          </article>
        ))}
      </fieldset>
      <div className="form-actions">
        <Action run={save}>{t.save}</Action>
        <button
          className="primary"
          disabled={submitting || remaining === 0}
          onClick={() => void submit()}
        >
          <Send size={16} />
          {t.submitQuiz}
        </button>
      </div>
      {successSubmitted && (
        <Modal title="Kuis Berhasil Dikumpulkan" onClose={onDone}>
          <div className="modal-body submission-success">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(22, 163, 74, 0.12)",
                color: "#16a34a",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>
              Jawaban Kuis Berhasil Disimpan!
            </h3>
            <p style={{ color: "var(--muted, #64748b)", margin: "0 0 24px", lineHeight: 1.5 }}>
              Seluruh lembar jawaban Anda telah diterima oleh sistem E-Learning UAY. Anda dapat memeriksa riwayat pengerjaan dan status penilaian pada halaman kuis.
            </p>
            <button
              type="button"
              className="button primary"
              onClick={onDone}
              style={{ minWidth: 160 }}
            >
              Selesai &amp; Lihat Ringkasan
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
function OrderingAnswer({
  question: q,
  value,
  onChange,
}: {
  question: any;
  value: any;
  onChange: (value: any) => void;
}) {
  const initialOrder = q.options.map((o: any) => o.id);
  const [currentOrder, setCurrentOrder] = useState<string[]>(
    Array.isArray(value) && value.length > 0 ? value : initialOrder,
  );
  const [confirmed, setConfirmed] = useState(
    Array.isArray(value) && value.length > 0,
  );

  const handleReorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...currentOrder];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setCurrentOrder(next);
    setConfirmed(false);
  };

  const handleConfirm = () => {
    onChange(currentOrder);
    setConfirmed(true);
  };

  const isSaved = Array.isArray(value) && value.length > 0 && confirmed;

  return (
    <div className="order-answers">
      {currentOrder.map((id: string, index: number) => (
        <div
          key={id}
          draggable
          onDragStart={(e) =>
            e.dataTransfer.setData("text/plain", String(index))
          }
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            if (!Number.isInteger(from) || from < 0 || from >= currentOrder.length)
              return;
            handleReorder(from, index);
          }}
        >
          <span>
            {index + 1}. {q.options.find((o: any) => o.id === id)?.text}
          </span>
          <select
            aria-label={`${t.questions} ${index + 1}`}
            value={index}
            onChange={(e) => {
              handleReorder(index, Number(e.target.value));
            }}
          >
            {currentOrder.map((_: any, i: number) => (
              <option value={i} key={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className={isSaved ? "secondary" : "primary"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            ...(isSaved ? { borderColor: "#16a34a", color: "#16a34a" } : {}),
          }}
          onClick={handleConfirm}
        >
          {isSaved ? (
            <>
              <CheckCircle2 size={16} />
              Konfirmasi ulang urutan
            </>
          ) : (
            t.confirm
          )}
        </button>
        {isSaved ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#16a34a",
              fontWeight: 500,
              fontSize: "0.88rem",
            }}
          >
            <CheckCircle2 size={16} />
            Urutan sudah dikonfirmasi & tersimpan
          </span>
        ) : (
          <span style={{ color: "#d97706", fontSize: "0.85rem" }}>
            ⚠ Tekan tombol "Konfirmasi" untuk menyimpan urutan jawaban Anda.
          </span>
        )}
      </div>
    </div>
  );
}

function AnswerInput({
  question: q,
  value,
  onChange,
  classId,
  attemptId,
}: {
  question: any;
  value: any;
  onChange: (value: any) => void;
  classId: string;
  attemptId: string;
}) {
  const type = q.type;
  if (type === "SINGLE_CHOICE" || type === "TRUE_FALSE")
    return (
      <div className="answer-options">
        {q.options.map((o: any) => (
          <label key={o.id} className={value === o.id ? "selected" : ""}>
            <input
              type="radio"
              name={q.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
            />
            <Html text={o.text} />
          </label>
        ))}
      </div>
    );
  if (type === "MULTIPLE_SELECT")
    return (
      <div className="answer-options">
        {q.options.map((o: any) => (
          <label
            key={o.id}
            className={
              Array.isArray(value) && value.includes(o.id) ? "selected" : ""
            }
          >
            <input
              type="checkbox"
              checked={Array.isArray(value) && value.includes(o.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...(value ?? []), o.id]
                    : (value ?? []).filter((v: string) => v !== o.id),
                )
              }
            />
            <Html text={o.text} />
          </label>
        ))}
      </div>
    );
  if (type === "MATCHING")
    return (
      <div>
        {q.options.map((o: any) => (
          <Field key={o.id} label={o.text}>
            <select
              value={value?.[o.id] ?? ""}
              onChange={(e) => onChange({ ...value, [o.id]: e.target.value })}
            >
              <option value="">{t.choose}</option>
              {q.options.map((r: any) => (
                <option value={r.id} key={r.id}>
                  {r.rightText || r.text}
                </option>
              ))}
            </select>
          </Field>
        ))}
      </div>
    );
  if (type === "ORDERING")
    return <OrderingAnswer question={q} value={value} onChange={onChange} />;
  if (type === "FILE_UPLOAD")
    return (
      <>
        <FileUpload
          classId={classId}
          purpose="QUIZ_ANSWER"
          contextId={attemptId}
          onUploaded={(f) => onChange(f.id)}
        />
        {value && <span className="badge">{t.saved}</span>}
      </>
    );
  if (type === "ESSAY") {
    return (
      <div className="space-y-3">
        {q.rubric && q.rubric.length > 0 && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(2, 132, 199, 0.08)",
              border: "1px solid rgba(2, 132, 199, 0.25)",
              borderRadius: 8,
              marginBottom: 10,
              fontSize: "0.88rem",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 6,
                color: "var(--primary, #0284c7)",
              }}
            >
              📋 Panduan Penilaian / Rubrik:
            </strong>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {q.rubric.map((r: any, i: number) => (
                <li key={i} style={{ marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{r.title}</span> ({r.points} poin)
                  {r.description ? ` — ${r.description}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Field
          label={
            q.maxWords
              ? `${t.maxWords}: ${q.maxWords} · Jawaban Esai (Format Teks & AI Prompt)`
              : `Jawaban Esai (Format Teks & AI Prompt)`
          }
        >
          <RichTextEditor
            compact
            rows={8}
            minHeight="220px"
            value={value ?? ""}
            onChange={onChange}
            placeholder="Tuliskan jawaban esai Anda secara terstruktur di sini..."
            defaultAiTemplate="quiz"
          />
        </Field>
      </div>
    );
  }

  return (
    <Field label={t.correctAnswer}>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}
function ManualQuizGrading({
  attempt,
  questionId,
  onClose,
  onSaved,
}: {
  attempt: any;
  questionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const questions = attempt.questionSnapshot.filter((q: any) =>
    ["ESSAY", "FILE_UPLOAD"].includes(q.type),
  );
  const [values, setValues] = useState<
    Record<string, { score: string; feedback: string }>
  >(() =>
    Object.fromEntries(
      questions.map((q: any) => {
        const existing = attempt.answerGrades?.find(
          (g: any) => g.questionId === q.id,
        );
        return [
          q.id,
          {
            score: existing ? String(existing.score) : "",
            feedback: existing?.feedback ?? "",
          },
        ];
      }),
    ),
  );
  const correction = !!attempt.publishedAt || !!attempt.answerGrades?.length;
  return (
    <Modal
      title={"Penilaian kuis · " + attempt.user.name}
      wide
      onClose={onClose}
    >
      <Form
        draftKey={"quiz-grading:" + attempt.id}
        draftValue={values}
        onRestoreDraft={setValues}
        submitLabel="Simpan semua penilaian"
        onCancel={onClose}
        onSubmit={async (f) => {
          const reason = textValue(f, "reason");
          await api("/attempts/" + attempt.id + "/grades/batch", "POST", {
            grades: questions.map((q: any) => {
              const fb = values[q.id]?.feedback?.trim() ?? "";
              const itemReason = reason || (fb.length >= 5 ? fb : undefined);
              return {
                questionId: q.id,
                score: Number(values[q.id].score),
                feedback: values[q.id].feedback,
                ...(itemReason ? { reason: itemReason } : {}),
              };
            }),
            ...(reason ? { reason } : {}),
          });
          onSaved();
        }}
      >
        <p>Nilai seluruh jawaban, lalu simpan penilaian dalam satu langkah.</p>
        {questions.map((q: any, index: number) => (
          <section className="grading-question" key={q.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{index + 1}.</span>
              <div style={{ flex: 1, fontSize: "1.05rem", fontWeight: 600 }}>
                <Html text={formatContentHtml(q.text)} />
              </div>
            </div>
            <div className="student-answer">
              {q.type === "FILE_UPLOAD" ? (
                attempt.answersJson[q.id] ? (
                  <DownloadButton fileId={attempt.answersJson[q.id]} />
                ) : (
                  t.noSubmissions
                )
              ) : (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--surface, #fff)",
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 8,
                  }}
                  className="formatted-content"
                >
                  <Html text={formatContentHtml(attempt.answersJson[q.id] ?? "—")} />
                </div>
              )}
            </div>
            {q.rubric?.length > 0 && (
              <details className="rubric" style={{ marginTop: 8 }}>
                <summary>Panduan rubrik ({q.rubric.length} kriteria)</summary>
                {q.rubric.map((r: any, i: number) => (
                  <p key={i}>
                    <strong>{r.title}</strong> · {r.points} poin
                  </p>
                ))}
              </details>
            )}
            <div className="form-grid" style={{ marginTop: 12 }}>
              <Field label={t.score + " (0–" + q.points + ")"}>
                <input
                  type="number"
                  required
                  min={0}
                  max={q.points}
                  step="1"
                  value={values[q.id]?.score ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [q.id]: { ...v[q.id], score: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label={`${t.feedback} (Format Teks Rapi)`}>
                <RichTextEditor
                  compact
                  rows={3}
                  value={values[q.id]?.feedback ?? ""}
                  onChange={(val) =>
                    setValues((v) => ({
                      ...v,
                      [q.id]: { ...v[q.id], feedback: val },
                    }))
                  }
                  placeholder="Berikan umpan balik atau apresiasi pengerjaan esai mahasiswa..."
                  defaultAiTemplate="quiz"
                />
              </Field>
            </div>
          </section>
        ))}
        {correction && (
          <Field
            label={t.reason}
            hint={
              t.reasonHint +
              " (opsional jika umpan balik soal sudah diisi minimal 5 karakter)"
            }
          >
            <textarea
              name="reason"
              placeholder="Contoh: Koreksi penilaian jawaban essay / Banding nilai mahasiswa"
            />
          </Field>
        )}
      </Form>
    </Modal>
  );
}
export function AssignmentEditor({
  classId,
  sectionId,
  assignment,
  onClose,
  onSaved,
}: {
  classId: string;
  sectionId: string;
  assignment?: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = useApi<any[]>(
    `/course-classes/${classId}/grade-categories`,
  );
  const [instructions, setInstructions] = useState(
    assignment?.instructions ?? "",
  );
  return (
    <Modal title={assignment ? t.edit : t.newAssignment} wide onClose={onClose}>
      <Form
        draftKey={`assignment-editor:${assignment?.id ?? sectionId}`}
        draftValue={{ instructions }}
        onRestoreDraft={(v) => {
          if (v.instructions !== undefined) setInstructions(v.instructions);
        }}
        onCancel={onClose}
        publication={{
          published: assignment?.isVisible ?? false,
          onUnpublish: assignment
            ? async () => {
                await api(
                  `/assignments/${assignment.id}/unpublish`,
                  "POST",
                  {},
                );
                onSaved();
              }
            : undefined,
        }}
        onSubmit={async (f, intent) => {
          await api(
            assignment
              ? `/assignments/${assignment.id}`
              : `/sections/${sectionId}/assignments`,
            assignment ? "PATCH" : "POST",
            {
              title: textValue(f, "title"),
              instructions: textValue(f, "instructions"),
              gradeCategoryId: textValue(f, "category") || null,
              maxScore: numberValue(f, "maxScore"),
              allowedFormats: f.getAll("formats"),
              availableFrom: isoInput(f.get("opens")),
              deadline: isoInput(f.get("deadline")),
              cutoffDate: isoInput(f.get("cutoff")),
              allowLate: f.has("late"),
              maxAttempts: numberValue(f, "maxAttempts"),
              isVisible: intent === "publish",
            },
          );
          onSaved();
        }}
      >
        <Field label={t.title}>
          <input name="title" required defaultValue={assignment?.title} />
        </Field>
        <Field label={`${t.instructions} (Format Teks Rapi)`}>
          <RichTextEditor
            name="instructions"
            required
            rows={7}
            value={instructions}
            onChange={setInstructions}
            placeholder="Tuliskan petunjuk dan instruksi pengerjaan tugas dengan format teks rapi di sini..."
            defaultAiTemplate="assignment"
          />
        </Field>
        <div className="form-grid">
          <Field label={t.category}>
            <select
              name="category"
              defaultValue={assignment?.gradeCategoryId ?? ""}
            >
              <option value="">{t.choose}</option>
              {categories.data
                ?.filter((c) => c.kind !== "PROGRESS")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={t.maxScore}>
            <input
              name="maxScore"
              type="number"
              min={1}
              max={1000}
              required
              defaultValue={assignment?.maxScore ?? 100}
            />
          </Field>
          <Field label={t.opens}>
            <input
              name="opens"
              type="datetime-local"
              defaultValue={localInput(assignment?.availableFrom)}
            />
          </Field>
          <Field label={t.deadline}>
            <input
              name="deadline"
              type="datetime-local"
              defaultValue={localInput(assignment?.deadline)}
            />
          </Field>
          <Field label={t.cutoff}>
            <input
              name="cutoff"
              type="datetime-local"
              defaultValue={localInput(assignment?.cutoffDate)}
            />
          </Field>
          <Field label={t.maxSubmissions}>
            <input
              name="maxAttempts"
              type="number"
              min={1}
              max={20}
              required
              defaultValue={assignment?.maxAttempts ?? 3}
            />
          </Field>
        </div>
        <div className="field-title">{t.allowedFormats}</div>
        <div className="format-list">
          {[
            "TEXT",
            "LINK",
            "PDF",
            "ZIP",
            "PNG",
            "JPG",
            "PY",
            "CPP",
            "DOCX",
            "CSV",
          ].map((format) => (
            <label className="check-row" key={format}>
              <input
                name="formats"
                type="checkbox"
                value={format}
                defaultChecked={(
                  assignment?.allowedFormats ?? ["TEXT", "LINK", "PDF", "ZIP"]
                ).includes(format)}
              />
              {format}
            </label>
          ))}
        </div>
        <label className="check-row">
          <input
            name="late"
            type="checkbox"
            defaultChecked={assignment?.allowLate ?? true}
          />
          {t.allowLate}
        </label>
      </Form>
    </Modal>
  );
}
export function AssignmentPage({
  id,
  user,
  backHref = "/classes",
}: {
  id: string;
  user: any;
  backHref?: string;
}) {
  const info = useApi(`/assignments/${id}`);
  const [editing, setEditing] = useState(false),
    [grading, setGrading] = useState<any>(null),
    [gradingFeedback, setGradingFeedback] = useState(""),
    [file, setFile] = useState<any>(null),
    [body, setBody] = useState(""),
    [link, setLink] = useState(""),
    [receipt, setReceipt] = useState<any>(null),
    [showSuccessModal, setShowSuccessModal] = useState(false);
  const a = info.data;
  const pagination = usePagination(a?.submissions ?? [], 10);
  useEffect(() => {
    if (a?.path && location.pathname.startsWith("/assignments/"))
      navigate(a.path, true);
  }, [a?.path]);
  if (info.loading && !a) return <Loading />;
  if (info.error) return <Notice error={info.error} />;
  if (!a) return null;
  const isDeptAdminForClass = user.role === "DEPARTMENT_ADMIN" && a.canManage;
  const canEdit =
    (user.role === "INSTRUCTOR" || isDeptAdminForClass) &&
    a.canManage &&
    !a.isClassArchived;
  const canGrade =
    user.role === "INSTRUCTOR" && a.canManage && !a.isClassArchived;
  return (
    <DraftRouteContext.Provider value={`#/assignments/${id}`}>
      <a className="back-link" href={a.classPath ?? backHref}>
        <ArrowLeft size={16} />
        {t.back}
      </a>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">{t.assignment}</div>
          <h1>{a.title}</h1>
        </div>
        <div className="toolbar">
          {!a.canManage ? (
            <Badge
              value={
                a.hasSubmitted
                  ? "SUBMITTED"
                  : a.isClosed
                    ? "CLOSED"
                    : "OPEN"
              }
            />
          ) : (
            <Badge value={a.isVisible ? "PUBLISHED" : "DRAFT"} />
          )}
          {canEdit && (
            <button className="secondary" onClick={() => setEditing(true)}>
              {t.edit}
            </button>
          )}
        </div>
      </div>
      {a.isClassArchived && a.canManage && (
        <div className="callout note">Kelas diarsipkan. Tugas dapat dilihat, tetapi tidak dapat diubah atau dinilai.</div>
      )}
      <div className="assessment-layout">
        <article className="card">
          <h2>{t.instructions}</h2>
          <div className="formatted-content" style={{ marginTop: 8 }}>
            <Html text={formatContentHtml(a.instructions)} inline={false} />
          </div>
        </article>
        <aside className="card deadline-card">
          <Field label={t.deadline}>
            <strong>{a.deadline ? date(a.deadline) : t.noDeadline}</strong>
          </Field>
          <Field label={t.cutoff}>
            <span>{date(a.cutoffDate)}</span>
          </Field>
          <Field label={t.maxScore}>
            <span>{a.maxScore}</span>
          </Field>
          <Field label={t.allowedFormats}>
            <span>{a.allowedFormats.join(", ")}</span>
          </Field>
          <Field label={t.maxSubmissions}>
            <span>{a.maxAttempts}</span>
          </Field>
        </aside>
      </div>
      {!a.canManage && a.submissions?.length > 0 && (() => {
        const latestSubmission = a.submissions.find((s: any) => s.status !== "SUPERSEDED") || a.submissions[0];
        const hasScore = latestSubmission.score !== undefined && latestSubmission.score !== null;
        return (
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(2, 132, 199, 0.02))",
              border: "1px solid rgba(2, 132, 199, 0.25)",
              borderRadius: 12,
              padding: "20px 24px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span className="eyebrow" style={{ color: "#0284c7", fontWeight: 700 }}>
                  HASIL PENILAIAN TUGAS
                </span>
                <Badge value={latestSubmission.status} />
                {latestSubmission.status === "LATE" && (
                  <span style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 600 }}>Terlambat</span>
                )}
              </div>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                {hasScore ? (
                  <>Nilai Anda: <span style={{ color: "#0284c7" }}>{Number.isInteger(latestSubmission.score) ? latestSubmission.score : latestSubmission.score.toFixed(1)}</span> / {a.maxScore}</>
                ) : (
                  "Tugas Terkirim · Menunggu Penilaian / Publikasi Dosen"
                )}
              </h3>
              {latestSubmission.feedback && (
                <p style={{ margin: "6px 0 0", fontSize: "0.9rem", color: "var(--foreground, #1e293b)", fontStyle: "italic" }}>
                  Catatan Dosen: &ldquo;{latestSubmission.feedback}&rdquo;
                </p>
              )}
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--muted, #64748b)" }}>
                Dikumpulkan pada: {date(latestSubmission.submittedAt)} (Versi {latestSubmission.version})
              </p>
            </div>
            <div>
              {hasScore ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    background: "rgba(22, 163, 74, 0.12)",
                    color: "#16a34a",
                  }}
                >
                  <CheckCircle2 size={16} /> Sudah Dinilai &amp; Terbit
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    background: "rgba(234, 179, 8, 0.12)",
                    color: "#ca8a04",
                  }}
                >
                  <Clock3 size={16} /> Menunggu Nilai Dosen
                </span>
              )}
            </div>
          </div>
        );
      })()}
      {!a.canManage &&
        (() => {
          const currentAttemptCount = a.submissions?.length ?? 0;
          const isAttemptLimitReached = currentAttemptCount >= a.maxAttempts;

          if (a.isClosed) {
            return (
              <div className="card assignment-closed-card">
                <span
                  className={`closed-icon-wrap ${
                    a.hasSubmitted
                      ? "is-completed"
                      : a.isGradeLocked
                        ? "is-locked"
                        : ""
                  }`}
                >
                  {a.hasSubmitted ? (
                    <CheckCircle2 size={28} />
                  ) : a.isGradeLocked ? (
                    <Lock size={28} />
                  ) : a.isCutoffPassed || a.isLateForbidden ? (
                    <Clock3 size={28} />
                  ) : (
                    <Lock size={28} />
                  )}
                </span>
                <h2>{t.assignmentClosed}</h2>
                <p className="closed-description">
                  {a.isGradeLocked
                    ? t.assignmentClosedGradeLocked
                    : a.isCutoffPassed
                      ? `${t.assignmentClosedCutoff} (${date(a.cutoffDate)})`
                      : a.isLateForbidden
                        ? `${t.assignmentClosedDeadline} (${date(a.deadline)})`
                        : a.isClassArchived
                          ? t.assignmentClosedArchived
                          : t.assignmentClosed}
                </p>
                <div className="closed-actions">
                  <button className="secondary" disabled>
                    {t.quizClosedAction}
                  </button>
                  {a.classPath && (
                    <a className="secondary" href={a.classPath}>
                      {t.back}
                    </a>
                  )}
                </div>
              </div>
            );
          }

          if (isAttemptLimitReached) {
            return (
              <div className="card assignment-closed-card">
                <span className="closed-icon-wrap is-completed">
                  <CheckCircle2 size={28} />
                </span>
                <h2>Batas Maksimal Pengumpulan Tercapai</h2>
                <p className="closed-description">
                  Anda telah mengumpulkan tugas ini sebanyak {a.maxAttempts} kali percobaan (batas maksimal pengerjaan). Pengumpulan Anda telah disimpan dengan aman dan sedang/telah dinilai oleh dosen pengampu.
                </p>
                {a.classPath && (
                  <div className="closed-actions">
                    <a className="secondary" href={a.classPath}>
                      {t.back}
                    </a>
                  </div>
                )}
              </div>
            );
          }

          return (
            <section className="card submission-form">
              <div style={{ marginBottom: 12 }}>
                <h2>
                  {a.hasSubmitted
                    ? `Kumpulkan Ulang Tugas (Percobaan ${currentAttemptCount + 1} dari ${a.maxAttempts})`
                    : t.submitAssignment}
                </h2>
                {a.hasSubmitted && (
                  <div
                    className="callout note"
                    style={{
                      margin: "8px 0 16px",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "rgba(2, 132, 199, 0.08)",
                      border: "1px solid rgba(2, 132, 199, 0.2)",
                      color: "var(--foreground, #0f172a)",
                      fontSize: "0.88rem",
                    }}
                  >
                    💡 <strong>Pengumpulan Ulang Tugas:</strong> Anda sudah mengumpulkan tugas ini sebelumnya (Versi {currentAttemptCount}). Selagi waktu pengumpulan masih dibuka sebelum batas akhir, Anda dapat mengumpulkan revisi atau perbaikan tugas. Versi terbaru (Versi {currentAttemptCount + 1}) akan menggantikan versi sebelumnya untuk dinilai dosen. Tersisa <strong>{a.maxAttempts - currentAttemptCount}</strong> kesempatan percobaan lagi.
                  </div>
                )}
              </div>
              {receipt && (
                <Notice onClose={() => setReceipt(null)}>
                  {t.submissionSuccess} · {date(receipt.submittedAt)} · {t.version}{" "}
                  {receipt.version} ·{" "}
                  {receipt.status === "LATE" ? t.late : t.onTime}
                </Notice>
              )}
              <Form
                draftKey={`submission:${id}`}
                draftValue={{ body, link, file }}
                onRestoreDraft={(v) => {
                  setBody(v.body);
                  setLink(v.link);
                  setFile(v.file);
                }}
                submitLabel={
                  a.hasSubmitted
                    ? `Kumpulkan Ulang (Versi ${currentAttemptCount + 1})`
                    : t.submitAssignment
                }
                onSubmit={async () => {
                  const result = await api(
                    `/assignments/${id}/submissions`,
                    "POST",
                    {
                      ...(body.trim() ? { textContent: body } : {}),
                      ...(link.trim() ? { externalUrl: link } : {}),
                      ...(file ? { fileObjectId: file.id } : {}),
                    },
                  );
                  setReceipt(result);
                  setShowSuccessModal(true);
                  notifyAction(t.submissionSuccess);
                  info.reload();
                }}
              >
                {a.allowedFormats.includes("TEXT") && (
                  <Field label={`${t.submissionText} (Format Teks Rapi)`}>
                    <RichTextEditor
                      value={body}
                      onChange={setBody}
                      rows={8}
                      placeholder="Tuliskan jawaban atau laporan tugas Anda di sini dengan format teks yang rapi..."
                      defaultAiTemplate="assignment"
                    />
                  </Field>
                )}
                {a.allowedFormats.includes("LINK") && (
                  <Field label={t.submissionLink}>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => {
                        setLink(e.target.value);
                      }}
                    />
                  </Field>
                )}
                {a.allowedFormats.some(
                  (f: string) => !["TEXT", "LINK"].includes(f),
                ) && (
                  <FileUpload
                    classId={a.classId}
                    purpose="SUBMISSION"
                    contextId={id}
                    accept={a.allowedFormats
                      .filter((f: string) => !["TEXT", "LINK"].includes(f))
                      .map((f: string) => `.${f.toLowerCase()}`)
                      .join(",")}
                    onUploaded={(f) => {
                      setFile(f);
                    }}
                  />
                )}
              </Form>
            </section>
          );
        })()}
      <div className="section-heading" style={{ flexWrap: "wrap", gap: 12 }}>
        <h2>{t.submissionHistory}</h2>
        {canGrade && (
          <Action
            className="primary"
            disabled={!a.submissions.some((s: any) => s.status !== "SUPERSEDED" && s.score !== null && !s.isPublished)}
            run={async () => {
              await api(`/assignments/${id}/publish-grades`, "POST", {});
              info.reload();
            }}
          >
            {t.publishAllGrades}
          </Action>
        )}
      </div>
      <div className="submission-list">
        {pagination.paginatedItems.map((s: any) => (
          <article key={s.id} className="card submission-card">
            <div className="section-heading">
              <div>
                <h3>
                  {a.canManage ? s.user.name : `${t.version} ${s.version}`}
                </h3>
                <small>
                  {t.version} {s.version} · {date(s.submittedAt)}
                </small>
              </div>
              <Badge value={s.status} />
            </div>
            {s.textContent && (
              <div className="formatted-content" style={{ marginTop: 8 }}>
                <Html text={formatContentHtml(s.textContent)} inline={false} />
              </div>
            )}
            {s.externalUrl && (
              <a
                className="text-link"
                href={s.externalUrl}
                target="_blank"
                rel="noreferrer"
              >
                {s.externalUrl}
              </a>
            )}
            {s.fileObjectId && (
              <DownloadButton
                fileId={s.fileObjectId}
                label={s.fileName ?? t.download}
              />
            )}
            <div className="submission-grade">
              <span>
                {t.score}:{" "}
                <strong>
                  {s.score === undefined || s.score === null
                    ? "—"
                    : `${Number.isInteger(s.score) ? s.score : s.score.toFixed(1)} / ${a.maxScore}`}
                </strong>
                {!a.canManage && s.score === undefined && (
                  <small className="block">{t.unpublishedScore}</small>
                )}
                {a.canManage && s.score !== null && s.score !== undefined && (
                  <small
                    className="block"
                    style={{
                      color: s.isPublished ? "var(--success, #16a34a)" : "var(--muted)",
                      fontWeight: 500,
                    }}
                  >
                    {s.isPublished ? `✓ ${t.published}` : t.unpublished}
                  </small>
                )}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {canGrade && s.status !== "SUPERSEDED" && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setGrading(s);
                      setGradingFeedback(s.feedback ?? "");
                    }}
                  >
                    {t.gradeSubmission}
                  </button>
                )}
                {canGrade && s.status !== "SUPERSEDED" && s.score !== null && !s.isPublished && (
                  <Action
                    className="primary"
                    run={async () => {
                      await api(`/assignments/${id}/publish-grades`, "POST", { submissionId: s.id });
                      info.reload();
                    }}
                  >
                    {t.publishGrades}
                  </Action>
                )}
              </div>
            </div>
            {s.feedback && (
              <div className="callout note">
                <strong>{t.feedback}</strong>
                <div className="formatted-content" style={{ marginTop: 4 }}>
                  <Html text={formatContentHtml(s.feedback)} inline={false} />
                </div>
              </div>
            )}
          </article>
        ))}
        {a.submissions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>
        )}
        {!a.submissions.length && <Empty>{t.noSubmissions}</Empty>}
      </div>
      {editing && (
        <AssignmentEditor
          assignment={a}
          classId={a.classId}
          sectionId={a.sectionId}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            info.reload();
          }}
        />
      )}
      {grading && (
        <Modal title={t.gradeSubmission} onClose={() => setGrading(null)}>
          <h3>{grading.user.name}</h3>
          <Form
            draftKey={`submission-grading:${grading.id}`}
            submitLabel="Simpan semua penilaian"
            onSubmit={async (f) => {
              const reason = textValue(f, "reason");
              const feedback = textValue(f, "feedback");
              const autoReason =
                reason ||
                (feedback.trim().length >= 5 ? feedback.trim() : undefined);
              await api(`/submissions/${grading.id}/grade`, "POST", {
                score: numberValue(f, "score"),
                feedback,
                ...(autoReason ? { reason: autoReason } : {}),
              });
              setGrading(null);
              info.reload();
            }}
          >
            <Field label={`${t.score} (0–${a.maxScore})`}>
              <input
                type="number"
                min={0}
                max={a.maxScore}
                step="1"
                name="score"
                required
                defaultValue={grading.score ?? ""}
              />
            </Field>
            <Field label={`${t.feedback} (Format Teks Rapi)`}>
              <RichTextEditor
                compact
                name="feedback"
                rows={3}
                value={gradingFeedback}
                onChange={setGradingFeedback}
                placeholder="Tuliskan catatan atau masukan penilaian untuk mahasiswa..."
                defaultAiTemplate="assignment"
              />
            </Field>
            {grading.score !== null && (
              <Field label={t.reason} hint={t.reasonHint}>
                <textarea name="reason" required minLength={5} />
              </Field>
            )}
          </Form>
        </Modal>
      )}
      {showSuccessModal && (
        <Modal title="Tugas Berhasil Dikumpulkan" onClose={() => setShowSuccessModal(false)}>
          <div className="modal-body submission-success">
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(22, 163, 74, 0.12)",
                color: "#16a34a",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem" }}>
              Tugas Anda Telah Berhasil Dikumpulkan!
            </h3>
            <p style={{ color: "var(--muted, #64748b)", margin: "0 0 24px", lineHeight: 1.5 }}>
              Berkas / jawaban tugas Anda telah tercatat dengan aman pada sistem E-Learning UAY. Dosen pengampu dapat memeriksa dan mempublikasikan nilai tugas Anda.
            </p>
            <button
              type="button"
              className="button primary"
              onClick={() => setShowSuccessModal(false)}
              style={{ minWidth: 160 }}
            >
              Tutup &amp; Lihat Ringkasan
            </button>
          </div>
        </Modal>
      )}
    </DraftRouteContext.Provider>
  );
}
