import { useState } from "react";
import { Edit3, Trash2 } from "lucide-react";
import { confirmAction } from "../../confirm";
import {
  t,
  api,
  useApi,
  Loading,
  Notice,
  Empty,
  Field,
  Modal,
  Form,
  textValue,
} from "../../lib";
import {
  stripHtmlTags,
  formatContentHtml,
} from "../ui/RichTextEditor";
import { Html } from "../../Content";
import { questionSchema } from "../../../../../packages/shared/src/domain";
import { QuestionEditor } from "../../Assessment";
import { ImportPanel } from "../../Gradebook";
import { AnswerKeyDisplay } from "../ui/AnswerKeyDisplay";

export function QuestionBanks({
  classId,
  writable,
}: {
  classId: string;
  writable: boolean;
}) {
  const banks = useApi<any[]>(`/course-classes/${classId}/question-banks`);
  const [modal, setModal] = useState<any>(null),
    [question, setQuestion] = useState<any>(null),
    [questionErrors, setQuestionErrors] = useState<string[]>([]);

  return (
    <>
      <div className="section-heading">
        <h2>{t.questionBanks}</h2>
        {writable && (
          <div className="toolbar">
            <button
              className="secondary"
              onClick={() => setModal({ kind: "import" })}
            >
              {t.import}
            </button>
            <button
              className="primary"
              onClick={() => setModal({ kind: "bank" })}
            >
              {t.newBank}
            </button>
          </div>
        )}
      </div>
      {banks.error ? (
        <Notice error={banks.error} />
      ) : banks.loading && !banks.data ? (
        <Loading />
      ) : (
        banks.data?.map((bank) => (
          <section className="card bank-card" key={bank.id}>
            <div className="section-heading">
              <h2>
                {bank.title}{" "}
                <span className="count">{bank.questions.length}</span>
              </h2>
              {writable && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="secondary"
                    onClick={() => {
                      setQuestion({
                        text: "",
                        type: "SINGLE_CHOICE",
                        points: 10,
                        options: [
                          { id: "a", text: "" },
                          { id: "b", text: "" },
                        ],
                        answerKey: { correct: ["a"] },
                        rubric: [],
                        maxWords: 1000,
                      });
                      setQuestionErrors([]);
                      setModal({ kind: "question", bankId: bank.id });
                    }}
                  >
                    {t.newQuestion}
                  </button>
                  <button
                    type="button"
                    className="secondary danger"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--danger, #dc2626)",
                    }}
                    onClick={async () => {
                      const confirmed = await confirmAction(
                        `Hapus bank soal "${bank.title}"? Seluruh soal di dalamnya akan dihapus permanen.`,
                      );
                      if (!confirmed) return;
                      await api(
                        `/course-classes/${classId}/question-banks/${bank.id}`,
                        "DELETE",
                      );
                      banks.reload();
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Hapus Bank</span>
                  </button>
                </div>
              )}
            </div>
            {bank.questions.map((q: any, i: number) => (
              <details className="bank-question" key={q.id}>
                <summary>
                  {i + 1}. {stripHtmlTags(q.text) || t.questions}
                  <small>
                    {(t.questionTypes as any)[q.type]} · {q.points}{" "}
                    {t.points.toLowerCase()}
                  </small>
                </summary>
                <div className="bank-answer">
                  <div className="formatted-content" style={{ marginBottom: 12 }}>
                    <Html text={formatContentHtml(q.text)} />
                  </div>
                  <AnswerKeyDisplay question={q} />
                  {writable && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 14,
                        justifyContent: "flex-end",
                        borderTop: "1px solid var(--border, #f1f5f9)",
                        paddingTop: 10,
                      }}
                    >
                      <button
                        type="button"
                        className="secondary sm"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.82rem",
                        }}
                        onClick={() => {
                          setQuestion({
                            id: q.id,
                            text: q.text,
                            type: q.type,
                            points: q.points,
                            options: q.options || [],
                            allowedFileTypes: q.allowedFileTypes || [
                              "PDF",
                              "DOCX",
                              "PNG",
                              "JPG",
                            ],
                            answerKey: q.answerKey || { correct: [] },
                            rubric: q.rubric || [],
                            maxWords: q.maxWords || 1000,
                          });
                          setQuestionErrors([]);
                          setModal({
                            kind: "question",
                            bankId: bank.id,
                            questionId: q.id,
                          });
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Edit Soal</span>
                      </button>
                      <button
                        type="button"
                        className="secondary danger sm"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.82rem",
                          color: "var(--danger, #dc2626)",
                        }}
                        onClick={async () => {
                          const confirmed = await confirmAction(
                            "Hapus soal ini dari bank soal?",
                          );
                          if (!confirmed) return;
                          await api(
                            `/course-classes/${classId}/question-banks/${bank.id}/questions/${q.id}`,
                            "DELETE",
                          );
                          banks.reload();
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Hapus Soal</span>
                      </button>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </section>
        ))
      )}
      {!banks.loading && !banks.data?.length && <Empty>{t.noQuestions}</Empty>}
      {modal?.kind === "bank" && (
        <Modal title={t.newBank} onClose={() => setModal(null)}>
          <Form
            draftKey="bank:new"
            onSubmit={async (f) => {
              await api(`/course-classes/${classId}/question-banks`, "POST", {
                title: textValue(f, "title"),
                questions: [],
              });
              setModal(null);
              banks.reload();
            }}
          >
            <Field label={t.title}>
              <input name="title" required />
            </Field>
          </Form>
        </Modal>
      )}
      {modal?.kind === "question" && (
        <Modal
          title={modal.questionId ? "Edit Soal" : t.newQuestion}
          wide
          onClose={() => setModal(null)}
        >
          <Form
            draftKey={modal.questionId ? undefined : `bank-question:${modal.bankId}`}
            draftValue={question}
            onRestoreDraft={setQuestion}
            onSubmit={async () => {
              const parsed = questionSchema.safeParse({
                ...question,
                points:
                  question.points === "" ? Number.NaN : question.points,
              });
              if (!parsed.success) {
                setQuestionErrors([
                  ...new Set(
                    parsed.error.issues.map((issue) =>
                      String(issue.path[0] ?? "question"),
                    ),
                  ),
                ]);
                throw new Error(
                  "Periksa kolom soal yang ditandai. Lengkapi pertanyaan, poin, pilihan, dan kunci jawaban sesuai jenis soal.",
                );
              }
              setQuestionErrors([]);
              if (modal.questionId) {
                await api(
                  `/course-classes/${classId}/question-banks/${modal.bankId}/questions/${modal.questionId}`,
                  "PUT",
                  parsed.data,
                );
              } else {
                await api(
                  `/course-classes/${classId}/question-banks/${modal.bankId}/questions`,
                  "POST",
                  parsed.data,
                );
              }
              setModal(null);
              banks.reload();
            }}
          >
            <QuestionEditor
              question={question}
              invalidFields={questionErrors}
              onChange={(next) => {
                setQuestion(next);
                if (questionErrors.length) setQuestionErrors([]);
              }}
            />
          </Form>
        </Modal>
      )}
      {modal?.kind === "import" && (
        <ImportPanel
          classId={classId}
          initialKind="QUESTIONS"
          onClose={() => {
            setModal(null);
            banks.reload();
          }}
        />
      )}
    </>
  );
}
