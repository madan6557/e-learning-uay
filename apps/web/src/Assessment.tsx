import { confirmAction } from "./confirm";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Clock3,
  CheckCircle2,
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
} from "./lib";
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
            step="0.01"
            min="0.01"
            max={1000}
            required
            value={q.points}
            onChange={(e) => change({ points: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label={t.text}>
        <textarea
          required
          value={q.text}
          rows={3}
          onChange={(e) => change({ text: e.target.value })}
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
        <textarea
          value={q.explanation ?? ""}
          onChange={(e) => change({ explanation: e.target.value })}
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
  const total = questions.reduce((s, q) => s + q.points, 0);
  return (
    <Modal wide title={quiz ? t.edit : t.newQuiz} onClose={onClose}>
      <Form
        draftKey={`quiz:${quiz?.id ?? sectionId}`}
        draftValue={{ questions, scoreMode, timerMode, releaseMode }}
        onRestoreDraft={(v) => {
          setQuestions(v.questions);
          setScoreMode(v.scoreMode);
          setTimerMode(v.timerMode);
          setReleaseMode(v.releaseMode);
        }}
        onCancel={onClose}
        onSubmit={async (f) => {
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
            status: textValue(f, "status"),
            isVisible: true,
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
        <Field label={t.description}>
          <textarea name="description" defaultValue={quiz?.description} />
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
              max={240}
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
              step="0.01"
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
              {index + 1}. {q.text || t.newQuestion}
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
                    {q.text}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <Field label={t.status}>
          <select name="status" defaultValue={quiz?.status ?? "DRAFT"}>
            <option value="DRAFT">{t.draft}</option>
            <option value="PUBLISHED">{t.published}</option>
          </select>
        </Field>
      </Form>
    </Modal>
  );
}
export function QuizPage({ id, user }: { id: string; user: any }) {
  const info = useApi(`/quizzes/${id}`);
  const [active, setActive] = useState<any>(null),
    [editing, setEditing] = useState(false),
    [grading, setGrading] = useState<any>(null),
    [byQuestion, setByQuestion] = useState("");
  const quiz = info.data;
  if (info.loading && !quiz) return <Loading />;
  if (info.error) return <Notice error={info.error} />;
  if (!quiz) return null;
  const current =
    active ??
    quiz.attempts.find(
      (a: any) => a.status === "IN_PROGRESS" && !quiz.canManage,
    );
  return (
    <>
      <a className="back-link" href={`#/classes/${quiz.classId}`}>
        <ArrowLeft size={16} />
        {t.back}
      </a>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">{t.quiz}</div>
          <h1>{quiz.title}</h1>
          <p>{quiz.description}</p>
        </div>
        <div className="toolbar">
          <Badge value={quiz.status} />
          {quiz.canManage && (
            <button className="secondary" onClick={() => setEditing(true)}>
              {t.edit}
            </button>
          )}
        </div>
      </div>
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
      <div className="section-heading">
        <h2>{quiz.canManage ? t.gradeAnswer : t.attemptHistory}</h2>
        {quiz.canManage && (
          <div className="toolbar">
            <select
              aria-label={t.gradeByQuestion}
              value={byQuestion}
              onChange={(e) => setByQuestion(e.target.value)}
            >
              <option value="">{t.gradeByStudent}</option>
              {quiz.questions
                .filter((q: any) => ["ESSAY", "FILE_UPLOAD"].includes(q.type))
                .map((q: any) => (
                  <option value={q.id} key={q.id}>
                    {q.text}
                  </option>
                ))}
            </select>
            <Action
              className="primary"
              run={async () => {
                await api(`/quizzes/${id}/publish-grades`, "POST", {});
                info.reload();
              }}
            >
              {t.publishGrades}
            </Action>
          </div>
        )}
      </div>
      <div className="card table-wrap">
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
            {quiz.attempts.map((a: any) => (
              <tr key={a.id}>
                {quiz.canManage && (
                  <td>
                    {a.user.name}
                    <small className="block">{a.user.identifierValue}</small>
                  </td>
                )}
                <td>{a.attemptNum}</td>
                <td>
                  <Badge value={a.status} />
                  {a.forced && <small className="block">{t.timeExpired}</small>}
                </td>
                <td>{date(a.submittedAt)}</td>
                <td>
                  {a.score === undefined ? (
                    <small>{t.unpublishedScore}</small>
                  ) : (
                    a.score.toFixed(2)
                  )}
                </td>
                <td>
                  {quiz.canManage && a.status !== "IN_PROGRESS" && (
                    <button className="secondary" onClick={() => setGrading(a)}>
                      {t.gradeAnswer}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </>
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
    [submitting, setSubmitting] = useState(false);
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
        setError(null);
      } catch (e) {
        setError(e as Error);
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
      onDone();
    } catch (e) {
      setError(e as Error);
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
      {error && <Notice error={error} />}
      <fieldset disabled={submitting || remaining === 0}>
        {attempt.questionSnapshot.map((q: any, index: number) => (
          <article className="card answer-card" key={q.id} id={`q-${q.id}`}>
            <div className="question-label">
              <span>
                {t.questions} {index + 1}
              </span>
              <span>
                {q.points} {t.points}
              </span>
            </div>
            <h3>
              <Html text={q.text} />
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
    </section>
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
  if (type === "ORDERING") {
    const order = Array.isArray(value)
      ? value
      : q.options.map((o: any) => o.id);
    return (
      <div className="order-answers">
        {order.map((id: string, index: number) => (
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
              if (!Number.isInteger(from) || from < 0 || from >= order.length)
                return;
              const next = [...order];
              next.splice(index, 0, next.splice(from, 1)[0]);
              onChange(next);
            }}
          >
            <span>
              {index + 1}. {q.options.find((o: any) => o.id === id)?.text}
            </span>
            <select
              aria-label={`${t.questions} ${index + 1}`}
              value={index}
              onChange={(e) => {
                const next = [...order];
                next.splice(
                  Number(e.target.value),
                  0,
                  next.splice(index, 1)[0],
                );
                onChange(next);
              }}
            >
              {order.map((_: any, i: number) => (
                <option value={i} key={i}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button className="secondary" onClick={() => onChange(order)}>
          {t.confirm}
        </button>
      </div>
    );
  }
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
  return (
    <Field
      label={
        type === "ESSAY" ? `${t.maxWords}: ${q.maxWords}` : t.correctAnswer
      }
    >
      {type === "ESSAY" ? (
        <textarea
          rows={8}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
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
            grades: questions.map((q: any) => ({
              questionId: q.id,
              score: Number(values[q.id].score),
              feedback: values[q.id].feedback,
            })),
            ...(reason ? { reason } : {}),
          });
          onSaved();
        }}
      >
        <p>Nilai seluruh jawaban, lalu simpan penilaian dalam satu langkah.</p>
        {questions.map((q: any, index: number) => (
          <section className="grading-question" key={q.id}>
            <h3>
              {index + 1}. {q.text}
            </h3>
            <div className="student-answer">
              {q.type === "FILE_UPLOAD" ? (
                attempt.answersJson[q.id] ? (
                  <DownloadButton fileId={attempt.answersJson[q.id]} />
                ) : (
                  t.noSubmissions
                )
              ) : (
                <p className="preserve-lines">
                  {attempt.answersJson[q.id] ?? "—"}
                </p>
              )}
            </div>
            {q.rubric?.length > 0 && (
              <details className="rubric">
                <summary>Panduan rubrik</summary>
                {q.rubric.map((r: any, i: number) => (
                  <p key={i}>
                    {r.title} · {r.points} poin
                  </p>
                ))}
              </details>
            )}
            <div className="form-grid">
              <Field label={t.score + " (0–" + q.points + ")"}>
                <input
                  type="number"
                  required
                  min={0}
                  max={q.points}
                  step="0.01"
                  value={values[q.id]?.score ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [q.id]: { ...v[q.id], score: e.target.value },
                    }))
                  }
                />
              </Field>
              <Field label={t.feedback}>
                <textarea
                  value={values[q.id]?.feedback ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [q.id]: { ...v[q.id], feedback: e.target.value },
                    }))
                  }
                />
              </Field>
            </div>
          </section>
        ))}
        {correction && (
          <Field label={t.reason} hint={t.reasonHint}>
            <textarea name="reason" minLength={5} required />
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
  return (
    <Modal title={assignment ? t.edit : t.newAssignment} wide onClose={onClose}>
      <Form
        draftKey={`assignment-editor:${assignment?.id ?? sectionId}`}
        onCancel={onClose}
        onSubmit={async (f) => {
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
              isVisible: f.has("visible"),
            },
          );
          onSaved();
        }}
      >
        <Field label={t.title}>
          <input name="title" required defaultValue={assignment?.title} />
        </Field>
        <Field label={t.instructions}>
          <textarea
            name="instructions"
            required
            rows={6}
            defaultValue={assignment?.instructions}
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
        <label className="check-row">
          <input
            name="visible"
            type="checkbox"
            defaultChecked={assignment?.isVisible ?? false}
          />
          {t.visible}
        </label>
      </Form>
    </Modal>
  );
}
export function AssignmentPage({ id, user }: { id: string; user: any }) {
  const info = useApi(`/assignments/${id}`);
  const [editing, setEditing] = useState(false),
    [grading, setGrading] = useState<any>(null),
    [file, setFile] = useState<any>(null),
    [body, setBody] = useState(""),
    [link, setLink] = useState(""),
    [receipt, setReceipt] = useState<any>(null);
  const a = info.data;
  if (info.loading && !a) return <Loading />;
  if (info.error) return <Notice error={info.error} />;
  if (!a) return null;
  return (
    <>
      <a className="back-link" href={`#/classes/${a.classId}`}>
        <ArrowLeft size={16} />
        {t.back}
      </a>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">{t.assignment}</div>
          <h1>{a.title}</h1>
        </div>
        {a.canManage && (
          <button className="secondary" onClick={() => setEditing(true)}>
            {t.edit}
          </button>
        )}
      </div>
      <div className="assessment-layout">
        <article className="card">
          <h2>{t.instructions}</h2>
          <p className="preserve-lines">{a.instructions}</p>
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
      {!a.canManage && (
        <section className="card submission-form">
          <h2>{t.submitAssignment}</h2>
          {receipt && (
            <Notice>
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
            submitLabel={t.submitAssignment}
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
              info.reload();
            }}
          >
            {a.allowedFormats.includes("TEXT") && (
              <Field label={t.submissionText}>
                <textarea
                  rows={7}
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                  }}
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
            {file && <p>{file.name}</p>}
          </Form>
        </section>
      )}
      <div className="section-heading">
        <h2>{t.submissionHistory}</h2>
        {a.canManage && (
          <Action
            className="primary"
            run={async () => {
              await api(`/assignments/${id}/publish-grades`, "POST", {});
              info.reload();
            }}
          >
            {t.publishGrades}
          </Action>
        )}
      </div>
      <div className="submission-list">
        {a.submissions.map((s: any) => (
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
            {s.textContent && <p className="preserve-lines">{s.textContent}</p>}
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
                    : `${s.score} / ${a.maxScore}`}
                </strong>
                {!a.canManage && s.score === undefined && (
                  <small className="block">{t.unpublishedScore}</small>
                )}
              </span>
              {a.canManage && s.status !== "SUPERSEDED" && (
                <button className="secondary" onClick={() => setGrading(s)}>
                  {t.gradeSubmission}
                </button>
              )}
            </div>
            {s.feedback && (
              <div className="callout note">
                <strong>{t.feedback}</strong>
                <p>{s.feedback}</p>
              </div>
            )}
          </article>
        ))}
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
              await api(`/submissions/${grading.id}/grade`, "POST", {
                score: numberValue(f, "score"),
                feedback: textValue(f, "feedback"),
                ...(textValue(f, "reason")
                  ? { reason: textValue(f, "reason") }
                  : {}),
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
                step="0.01"
                name="score"
                required
                defaultValue={grading.score ?? ""}
              />
            </Field>
            <Field label={t.feedback}>
              <textarea name="feedback" defaultValue={grading.feedback} />
            </Field>
            {grading.score !== null && (
              <Field label={t.reason} hint={t.reasonHint}>
                <textarea name="reason" required minLength={5} />
              </Field>
            )}
          </Form>
        </Modal>
      )}
    </>
  );
}
