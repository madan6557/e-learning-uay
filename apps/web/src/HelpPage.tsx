import { useState, useMemo, useEffect, useRef } from "react";
import {
  BookOpen,
  Search,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  ListOrdered,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { helpArticlesForRole, type HelpArticle, type HelpRole } from "./data/helpArticles.js";
import { Pagination, usePagination, Modal } from "./lib";
import { GRADE_SCALE_PRESETS } from "../../../packages/shared/src/domain";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const roleLabels: Record<HelpRole, string> = {
  STUDENT: "Mahasiswa",
  INSTRUCTOR: "Dosen Pengampu",
  DEPARTMENT_ADMIN: "Admin Program Studi",
  SUPER_ADMIN: "Super Admin",
};

function articleText(article: HelpArticle): string {
  return normalize(
    [
      article.title,
      article.summary,
      article.category,
      article.content,
      article.id,
      article.location,
      article.preparation,
      article.result,
      ...article.keywords,
      ...(article.steps || []),
      ...(article.notes || []),
      ...(article.controls || []).flatMap(control => [control.label, control.value, control.effect]),
    ].join(" "),
  );
}

export function HelpPage({ user }: { user: { role?: unknown } | null }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [zoomedArticleId, setZoomedArticleId] = useState<string | null>(null);
  const articleHeading = useRef<HTMLHeadingElement>(null);
  const articleButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnArticleId = useRef<string | null>(null);

  const userRole = typeof user?.role === "string" && Object.hasOwn(roleLabels, user.role)
    ? user.role as HelpRole : undefined;

  const allowedArticles = useMemo(() => {
    return helpArticlesForRole(userRole);
  }, [userRole]);

  useEffect(() => {
    setSelectedArticleId(null);
    setZoomedArticleId(null);
    setCategory("Semua");
    setQuery("");
  }, [userRole]);

  const categories = useMemo(() => {
    const set = new Set(allowedArticles.map((a) => a.category));
    return ["Semua", ...Array.from(set)];
  }, [allowedArticles]);

  const filteredArticles = useMemo(() => {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return allowedArticles.filter((article) => {
      const matchCategory = category === "Semua" || article.category === category;
      const matchQuery =
        terms.length === 0 || terms.every((t) => articleText(article).includes(t));
      return matchCategory && matchQuery;
    });
  }, [allowedArticles, category, query]);

  const pagination = usePagination(filteredArticles, 8);

  const selectedArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    return allowedArticles.find((a) => a.id === selectedArticleId) || null;
  }, [allowedArticles, selectedArticleId]);

  useEffect(() => {
    if (selectedArticle) {
      returnArticleId.current = selectedArticle.id;
      articleHeading.current?.focus();
    } else if (returnArticleId.current) {
      articleButtons.current.get(returnArticleId.current)?.focus();
      returnArticleId.current = null;
    }
  }, [selectedArticle?.id]);

  const relatedArticles = useMemo(() => {
    if (!selectedArticle?.related) return [];
    return selectedArticle.related
      .map((id) => allowedArticles.find((a) => a.id === id))
      .filter((a): a is HelpArticle => Boolean(a));
  }, [selectedArticle, allowedArticles]);

  return (
    <div className="help-container" style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div className="page-heading" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HelpCircle size={28} className="text-primary" />
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700 }}>
            Pusat Bantuan &amp; Panduan Pengguna
          </h1>
        </div>
        <p style={{ color: "var(--muted, #64748b)", marginTop: 6, fontSize: "0.95rem" }}>
          Temukan panduan lengkap pengoperasian fitur E-Learning UAY, tutorial langkah demi langkah, dan solusi kendala belajar.
        </p>
      </div>

      {selectedArticle ? (
        /* Article Detail View */
        <div className="card" style={{ padding: 24, borderRadius: 12, border: "1px solid var(--border, #e2e8f0)", background: "var(--card-bg, #ffffff)" }}>
          <button
            type="button"
            className="button secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, cursor: "pointer" }}
            onClick={() => setSelectedArticleId(null)}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Daftar Panduan</span>
          </button>

          <div style={{ marginBottom: 12 }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: "var(--primary, #0284c7)",
                background: "rgba(2, 132, 199, 0.1)",
                padding: "3px 10px",
                borderRadius: 20,
              }}
            >
              {selectedArticle.category}
            </span>
          </div>

          <h2 ref={articleHeading} tabIndex={-1} style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground, #0f172a)", marginBottom: 8 }}>
            {selectedArticle.title}
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--muted, #475569)", marginBottom: 24, fontStyle: "italic" }}>
            {selectedArticle.summary}
          </p>

          {(selectedArticle.location || selectedArticle.preparation) && (
            <div className="help-guide-context">
              {selectedArticle.location && <p><strong>Buka:</strong> {userRole === "INSTRUCTOR" ? selectedArticle.location.replace("Kelola kelas", "Kelas saya") : selectedArticle.location}</p>}
              {selectedArticle.preparation && <p><strong>Sebelum mulai:</strong> {selectedArticle.preparation}</p>}
            </div>
          )}

          {/* Steps Section */}
          {selectedArticle.steps && selectedArticle.steps.length > 0 && (
            <div
              style={{
                background: "rgba(2, 132, 199, 0.05)",
                border: "1px solid rgba(2, 132, 199, 0.2)",
                borderRadius: 10,
                padding: "16px 20px",
                marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--primary, #0369a1)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <ListOrdered size={18} />
                Langkah-Langkah Penggunaan:
              </h3>
              <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 1.7, color: "var(--foreground, #1e293b)", fontSize: "0.95rem" }}>
                {selectedArticle.steps.map((s, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {selectedArticle.result && <p className="help-guide-result"><strong>Periksa hasil:</strong> {selectedArticle.result}</p>}

          {selectedArticle.figure && (
            <figure className="help-guide-figure">
              <button type="button" className="help-guide-image" aria-label={`Perbesar gambar ${selectedArticle.title}`} onClick={() => setZoomedArticleId(selectedArticle.id)}>
                <img src={selectedArticle.figure.src} alt={selectedArticle.figure.alt} loading="lazy" />
              </button>
              <figcaption>{selectedArticle.figure.caption} Klik gambar untuk memperbesar.</figcaption>
            </figure>
          )}

          {selectedArticle.controls && selectedArticle.controls.length > 0 && (
            <section className="help-guide-section">
              <h3>Input, pilihan, dan tombol</h3>
              <div className="help-guide-table">
                <table>
                  <thead><tr><th>Kontrol di layar</th><th>Nilai atau contoh</th><th>Fungsi dan akibat</th></tr></thead>
                  <tbody>{selectedArticle.controls.map((control, index) => (
                    <tr key={index}><th scope="row">{control.label}</th><td>{control.value}</td><td>{control.effect}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          )}

          {selectedArticle.notes && selectedArticle.notes.length > 0 && (
            <section className="help-guide-section">
              <h3>Catatan penggunaan</h3>
              {selectedArticle.notes.map((note, index) => <p key={index}>{note}</p>)}
            </section>
          )}

          {/* Main Content */}
          {selectedArticle.content && <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 8, color: "var(--foreground, #0f172a)" }}>
              Penjelasan Lengkap
            </h3>
            <p style={{ lineHeight: 1.7, color: "var(--foreground, #334155)", fontSize: "0.95rem", whiteSpace: "pre-line" }}>
              {selectedArticle.content}
            </p>
          </div>}

          {selectedArticle.gradeScales && Object.values(GRADE_SCALE_PRESETS).map(scale => (
            <section className="help-guide-section" key={scale.version}>
              <h3>Skala {scale.version}</h3>
              <div className="help-guide-table">
                <table>
                  <thead><tr><th>Skor minimum</th><th>Huruf mutu</th><th>Indeks mutu</th></tr></thead>
                  <tbody>{scale.bands.map(band => <tr key={band.letter}><td>≥ {band.minScore}</td><td>{band.letter}</td><td>{band.point.toFixed(2).replace(".", ",")}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          ))}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border, #e2e8f0)", paddingTop: 16, marginTop: 24 }}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 10 }}>
                Panduan Terkait:
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {relatedArticles.map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    className="button secondary"
                    style={{ fontSize: "0.85rem", padding: "6px 12px", cursor: "pointer" }}
                    onClick={() => setSelectedArticleId(rel.id)}
                  >
                    {rel.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Articles List View */
        <div>
          {/* Search bar & Role Badge */}
          <div
            className="card"
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--card-bg, #ffffff)",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 12px",
                border: "1px solid var(--border, #cbd5e1)",
                borderRadius: 8,
                background: "var(--input-bg, #f8fafc)",
                marginBottom: 14,
              }}
            >
              <Search size={20} style={{ color: "var(--muted, #94a3b8)", flexShrink: 0 }} />
              <input
                type="search"
                aria-label="Cari panduan"
                placeholder="Cari panduan (misal: presensi, duplikasi kelas, tugas, kuis, video, program studi)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  width: "100%",
                  fontSize: "0.95rem",
                  color: "var(--foreground, #0f172a)",
                }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--muted, #64748b)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {categories.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    style={{
                      border: "none",
                      borderRadius: 20,
                      padding: "6px 14px",
                      fontSize: "0.82rem",
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                      background: active ? "var(--primary, #0284c7)" : "var(--chip-bg, #f1f5f9)",
                      color: active ? "#ffffff" : "var(--foreground, #334155)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--muted, #64748b)" }}>
              <ShieldCheck size={16} style={{ color: "#10b981" }} />
              <span>
                Menampilkan {filteredArticles.length} panduan untuk peran: <strong>{userRole && roleLabels[userRole] || "Role belum dikenali"}</strong>. Nama, angka, dan tanggal pada gambar adalah contoh.
              </span>
            </div>
          </div>

          {/* List of Articles */}
          <div style={{ display: "grid", gap: 12 }}>
            {filteredArticles.length > 0 ? (
              pagination.paginatedItems.map((article) => (
                <button
                  key={article.id}
                  ref={node => {
                    if (node) articleButtons.current.set(article.id, node);
                    else articleButtons.current.delete(article.id);
                  }}
                  type="button"
                  onClick={() => setSelectedArticleId(article.id)}
                  className="card article-item help-guide-link"
                  style={{
                    padding: "16px 20px",
                    borderRadius: 10,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "var(--card-bg, #ffffff)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    cursor: "pointer",
                    transition: "transform 0.1s ease, box-shadow 0.1s ease",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "rgba(2, 132, 199, 0.1)",
                      color: "var(--primary, #0284c7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <BookOpen size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: "var(--primary, #0284c7)",
                          letterSpacing: 0.4,
                        }}
                      >
                        {article.category}
                      </span>
                    </div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--foreground, #0f172a)", margin: "0 0 4px 0" }}>
                      {article.title}
                    </h3>
                    <p style={{ fontSize: "0.88rem", color: "var(--muted, #64748b)", margin: 0, lineHeight: 1.5 }}>
                      {article.summary}
                    </p>
                  </div>
                  <ChevronRight size={18} style={{ color: "var(--muted, #94a3b8)", alignSelf: "center", flexShrink: 0 }} />
                </button>
              ))
            ) : (
              <div
                className="card"
                style={{
                  padding: 32,
                  textAlign: "center",
                  borderRadius: 10,
                  border: "1px dashed var(--border, #cbd5e1)",
                  color: "var(--muted, #64748b)",
                }}
              >
                <AlertCircle size={32} style={{ margin: "0 auto 8px auto", opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: "0.95rem" }}>
                  Tidak ada panduan yang sesuai dengan pencarian &quot;{query}&quot;. Coba gunakan kata kunci lain atau pilih kategori &quot;Semua&quot;.
                </p>
              </div>
            )}
          </div>

          {filteredArticles.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                pageSizeOptions={[6, 8, 12, 24]}
              />
            </div>
          )}
        </div>
      )}
      {selectedArticle?.figure && zoomedArticleId === selectedArticle.id && (
        <Modal title={selectedArticle.title} onClose={() => setZoomedArticleId(null)} wide>
          <img className="help-guide-zoom" src={selectedArticle.figure.src} alt={selectedArticle.figure.alt} />
          <p>{selectedArticle.figure.caption}</p>
        </Modal>
      )}
    </div>
  );
}

export default HelpPage;
