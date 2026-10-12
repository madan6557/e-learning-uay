import React from "react";
import { CheckCircle2, ArrowRight, HelpCircle } from "lucide-react";
import DOMPurify from "dompurify";
import { formatContentHtml, stripHtmlTags } from "./textUtils";

export interface AnswerKeyProps {
  question: {
    id?: string;
    text: string;
    type: string;
    points?: number;
    options?: Array<{ id: string; text: string; rightText?: string }>;
    answerKey?: any;
    rubric?: Array<{ title: string; points: number }>;
    maxWords?: number;
    explanation?: string;
  };
}

export function AnswerKeyDisplay({ question: q }: AnswerKeyProps) {
  const type = q.type || "SINGLE_CHOICE";
  const key = q.answerKey || {};
  const options = q.options || [];

  const correctIds: string[] = Array.isArray(key.correct)
    ? key.correct.map(String)
    : key.correct !== undefined && key.correct !== null
      ? [String(key.correct)]
      : [];

  // 1. TRUE_FALSE
  if (type === "TRUE_FALSE") {
    const isTrue = correctIds.includes("true") || correctIds.includes("1") || key.correct === true;
    const isFalse = correctIds.includes("false") || correctIds.includes("0") || key.correct === false;
    const label = isTrue ? "BENAR (True)" : isFalse ? "SALAH (False)" : correctIds.join(", ") || "—";

    return (
      <div className="answer-key-container">
        <div className="bank-options-list">
          {[
            { id: "true", label: "Benar (True)" },
            { id: "false", label: "Salah (False)" },
          ].map((item) => {
            const isMatch = (item.id === "true" && isTrue) || (item.id === "false" && isFalse);
            return (
              <div
                key={item.id}
                className={`bank-option-row ${isMatch ? "is-correct" : ""}`}
              >
                <span className="bank-option-badge">
                  {isMatch ? <CheckCircle2 size={16} /> : <span className="circle-dot" />}
                </span>
                <span className="bank-option-text">{item.label}</span>
                {isMatch && <span className="correct-tag">Kunci Jawaban</span>}
              </div>
            );
          })}
        </div>

        <div className="bank-key-summary">
          <strong>Kunci Jawaban:</strong>{" "}
          <span className="key-highlight">{label}</span>
        </div>

        {q.explanation && <ExplanationBox text={q.explanation} />}
      </div>
    );
  }

  // 2. SINGLE_CHOICE or MULTIPLE_SELECT
  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_SELECT") {
    const isSingle = type === "SINGLE_CHOICE";
    const correctOptions = options.filter((o) => correctIds.includes(String(o.id)));

    return (
      <div className="answer-key-container">
        <div className="bank-options-list">
          {options.map((o) => {
            const isCorrect = correctIds.includes(String(o.id));
            return (
              <div
                key={o.id}
                className={`bank-option-row ${isCorrect ? "is-correct" : ""}`}
              >
                <span className="bank-option-badge">
                  {isCorrect ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <span className="option-letter">{o.id.toUpperCase()}</span>
                  )}
                </span>
                <span className="bank-option-text">
                  <strong>{o.id.toUpperCase()}.</strong> {o.text || "—"}
                </span>
                {isCorrect && <span className="correct-tag">Kunci Jawaban</span>}
              </div>
            );
          })}
        </div>

        <div className="bank-key-summary">
          <strong>Kunci Jawaban:</strong>{" "}
          {correctOptions.length > 0 ? (
            <span className="key-highlight">
              {correctOptions
                .map((o) => `Pilihan ${o.id.toUpperCase()} (${o.text})`)
                .join(" dan ")}
            </span>
          ) : correctIds.length > 0 ? (
            <span className="key-highlight">
              {correctIds.map((id) => `Pilihan ${id.toUpperCase()}`).join(", ")}
            </span>
          ) : (
            <span className="muted-text">Belum ditentukan</span>
          )}

          {!isSingle && key.partialCredit !== undefined && (
            <div className="key-subinfo">
              <span>Penilaian parsial (partial credit): </span>
              <strong>{key.partialCredit ? "Diizinkan" : "Tidak diizinkan"}</strong>
            </div>
          )}
        </div>

        {q.explanation && <ExplanationBox text={q.explanation} />}
      </div>
    );
  }

  // 3. SHORT_ANSWER
  if (type === "SHORT_ANSWER") {
    const isNumeric = key.numericValue !== undefined && key.numericValue !== null;
    return (
      <div className="answer-key-container">
        <div className="bank-key-summary">
          {isNumeric ? (
            <div>
              <strong>Kunci Jawaban (Nilai Numerik):</strong>{" "}
              <span className="key-highlight">{key.numericValue}</span>
              {Number(key.tolerance) > 0 && (
                <span className="key-subinfo"> (Toleransi: ±{key.tolerance})</span>
              )}
            </div>
          ) : (
            <div>
              <strong>Kunci Jawaban yang Diterima:</strong>{" "}
              {correctIds.length > 0 ? (
                <span className="key-highlight">
                  {correctIds.map((c) => `"${c}"`).join(" atau ")}
                </span>
              ) : (
                <span className="muted-text">Belum ada kata kunci jawaban yang diisi</span>
              )}
            </div>
          )}

          {key.caseSensitive !== undefined && (
            <div className="key-subinfo">
              <span>Memperhatikan huruf kapital (Case Sensitive): </span>
              <strong>{key.caseSensitive ? "Ya" : "Tidak"}</strong>
            </div>
          )}
        </div>

        {q.explanation && <ExplanationBox text={q.explanation} />}
      </div>
    );
  }

  // 4. MATCHING
  if (type === "MATCHING") {
    const pairs: Record<string, string> = key.pairs || {};
    const pairEntries = Object.entries(pairs);

    const getRightText = (rightId: string) => {
      const match = options.find((o) => String(o.id) === String(rightId));
      return match ? match.rightText || match.text || match.id : rightId;
    };

    return (
      <div className="answer-key-container">
        <div className="bank-key-summary">
          <strong>Pasangan Jawaban yang Benar:</strong>
          {pairEntries.length > 0 ? (
            <div className="matching-grid">
              {pairEntries.map(([leftId, rightId]) => {
                const leftOpt = options.find((o) => String(o.id) === String(leftId));
                const leftText = leftOpt ? leftOpt.text || leftId : leftId;
                const rightText = getRightText(rightId);
                return (
                  <div key={leftId} className="matching-row">
                    <span className="matching-left">{leftText}</span>
                    <ArrowRight size={15} className="matching-arrow" />
                    <span className="matching-right">{rightText}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted-text">Belum ada pasangan yang diatur</p>
          )}
        </div>

        {q.explanation && <ExplanationBox text={q.explanation} />}
      </div>
    );
  }

  // 5. ORDERING
  if (type === "ORDERING") {
    const orderedIds: string[] = correctIds;
    return (
      <div className="answer-key-container">
        <div className="bank-key-summary">
          <strong>Urutan Jawaban yang Benar:</strong>
          {orderedIds.length > 0 ? (
            <ol className="ordering-list">
              {orderedIds.map((id, index) => {
                const opt = options.find((o) => String(o.id) === String(id));
                return (
                  <li key={id} className="ordering-item">
                    <span className="ordering-badge">{index + 1}</span>
                    <span className="ordering-text">{opt ? opt.text : id}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="muted-text">Belum ada urutan yang diatur</p>
          )}
        </div>

        {q.explanation && <ExplanationBox text={q.explanation} />}
      </div>
    );
  }

  // 6. ESSAY or FILE_UPLOAD
  if (type === "ESSAY" || type === "FILE_UPLOAD") {
    const rubrics = q.rubric || [];
    return (
      <div className="answer-key-container">
        <div className="bank-key-summary">
          <strong>Pedoman Penilaian &amp; Rubrik:</strong>
          {q.maxWords && (
            <p className="key-subinfo">
              Batas Maksimal Kata: <strong>{q.maxWords} kata</strong>
            </p>
          )}

          {rubrics.length > 0 ? (
            <table className="rubric-summary-table">
              <thead>
                <tr>
                  <th>Kriteria Penilaian</th>
                  <th style={{ width: 100, textAlign: "right" }}>Bobot Poin</th>
                </tr>
              </thead>
              <tbody>
                {rubrics.map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.title}</td>
                    <td style={{ textAlign: "right", fontWeight: "bold" }}>
                      {r.points} poin
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted-text">
              {type === "ESSAY"
                ? "Penilaian esai diperiksa langsung secara kualitatif oleh dosen pengampu."
                : "Penilaian berkas unggahan diperiksa secara manual oleh dosen pengampu."}
            </p>
          )}
        </div>

        {q.explanation && <ExplanationBox text={q.explanation} />}
      </div>
    );
  }

  // Fallback for custom/unknown type
  return (
    <div className="answer-key-container">
      <div className="bank-key-summary">
        <strong>Kunci Jawaban:</strong>
        {correctIds.length > 0 ? (
          <span className="key-highlight">{correctIds.join(", ")}</span>
        ) : typeof key === "object" && Object.keys(key).length > 0 ? (
          <div className="key-fallback-pairs">
            {Object.entries(key).map(([k, v]) => (
              <div key={k} className="fallback-row">
                <strong>{k}:</strong>{" "}
                <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="muted-text">Tidak ada data kunci jawaban</span>
        )}
      </div>
      {q.explanation && <ExplanationBox text={q.explanation} />}
    </div>
  );
}

function ExplanationBox({ text }: { text: string }) {
  if (!text || !stripHtmlTags(text).trim()) return null;
  const formatted = formatContentHtml(text);
  const sanitized =
    typeof window !== "undefined" && (DOMPurify as any)?.sanitize
      ? (DOMPurify as any).sanitize(formatted)
      : formatted;
  return (
    <div className="bank-explanation-box">
      <div className="explanation-header">
        <HelpCircle size={15} />
        <strong>Pembahasan / Pembekalan:</strong>
      </div>
      <div
        className="formatted-content"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  );
}
