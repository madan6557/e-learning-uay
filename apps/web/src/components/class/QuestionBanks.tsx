import { useState } from "react";
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

export function QuestionBanks({
  classId,
  writable,
}: {
  classId: string;
  writable: boolean;
}) {
  const banks = useApi<any[]>(`/course-classes/${classId}/question-banks`);
  const [modal, setModal] = useState<any>(null),
    [question, setQuestion] = useState<any>(null);

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
                    setModal({ kind: "question", bankId: bank.id });
                  }}
                >
                  {t.newQuestion}
                </button>
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
                  {q.options?.map((o: any) => (
                    <p key={o.id}>
                      {o.id.toUpperCase()}. {o.text}
                    </p>
                  ))}
                  <strong>{t.answerKey}</strong>
                  <pre>{JSON.stringify(q.answerKey, null, 2)}</pre>
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
        <Modal title={t.newQuestion} wide onClose={() => setModal(null)}>
          <Form
            draftKey={`bank-question:${modal.bankId}`}
            draftValue={question}
            onRestoreDraft={setQuestion}
            onSubmit={async () => {
              await api(
                `/course-classes/${classId}/question-banks/${modal.bankId}/questions`,
                "POST",
                questionSchema.parse(question),
              );
              setModal(null);
              banks.reload();
            }}
          >
            <QuestionEditor question={question} onChange={setQuestion} />
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
