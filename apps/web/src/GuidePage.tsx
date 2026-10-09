import { useEffect, useMemo, useState } from "react";
import { BookOpen, Printer, Search, ArrowLeft } from "lucide-react";
import { helpArticlesForRole, type HelpRole } from "./data/helpArticles";
import { GRADE_SCALE_PRESETS } from "../../../packages/shared/src/domain";

const labels: Record<HelpRole, string> = {
  STUDENT: "Mahasiswa",
  INSTRUCTOR: "Dosen",
  DEPARTMENT_ADMIN: "Admin Prodi",
  SUPER_ADMIN: "Super Admin",
  RECTOR: "Rektor",
};
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/** The session role is the only authority. URL parameters never select a role. */
export function GuidePage({ user }: { user: { role?: unknown } | null }) {
  const [query, setQuery] = useState("");
  const role =
    typeof user?.role === "string" && Object.hasOwn(labels, user.role)
      ? (user.role as HelpRole)
      : undefined;
  useEffect(() => {
    setQuery("");
  }, [role]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Panduan Penggunaan — E-Learning UAY";
    return () => { document.title = previousTitle; };
  }, []);
  const articles = useMemo(() => helpArticlesForRole(role), [role]);
  const filtered = articles.filter((article) =>
    searchable(
      [
        article.id,
        article.title,
        article.summary,
        article.content,
        ...article.keywords,
        ...(article.steps ?? []),
      ].join(" "),
    ).includes(searchable(query.trim())),
  );
  return (
    <div className="standalone-guide">
      <header className="guide-banner">
        <a href="/help" className="guide-brand">
          <BookOpen size={26} />
          <span>
            E-Learning UAY<small>Panduan penggunaan</small>
          </span>
        </a>
        <span className="guide-role">
          Panduan {role ? labels[role] : "tidak tersedia"}
        </span>
        <button
          className="button secondary"
          onClick={() => window.print()}
          disabled={!role}
        >
          <Printer size={18} /> Cetak panduan
        </button>
      </header>
      <div className="guide-layout">
        <aside className="guide-navigation" aria-label="Daftar isi panduan">
          <a href="/help" className="guide-back">
            <ArrowLeft size={17} /> Kembali ke Bantuan
          </a>
          <label htmlFor="guide-search">
            <Search size={17} /> Cari dalam panduan
          </label>
          <input
            id="guide-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Misalnya: nilai, kelas"
          />
          <p>{filtered.length} bagian tersedia</p>
          <nav>
            {filtered.map((article) => (
              <a key={article.id} href={`#panduan-${article.id}`}>
                {article.title}
              </a>
            ))}
          </nav>
        </aside>
        <main className="guide-main">
          <div className="guide-intro">
            <h1>Panduan penggunaan</h1>
            <p>
              Petunjuk untuk {role ? labels[role].toLowerCase() : "akun Anda"}.
              Bagian yang tampil mengikuti peran akun yang sedang masuk.
            </p>
            <p className="guide-date">
              Diperbarui 7 Oktober 2026. Tanggal dan jam pada aplikasi mengikuti
              zona waktu perangkat. Angka dan nama pada gambar merupakan contoh.
            </p>
          </div>
          {!role && (
            <p role="alert">
              Peran akun belum dikenali. Kembali ke Bantuan atau masuk dengan
              akun kampus.
            </p>
          )}
          {role && !filtered.length && (
            <p role="status">
              Tidak ada bagian yang cocok. Coba kata lain atau kosongkan
              pencarian.
            </p>
          )}
          {filtered.map((article) => (
            <article
              key={article.id}
              id={`panduan-${article.id}`}
              className="guide-article"
            >
              <p className="guide-category">{article.category}</p>
              <h2>{article.title}</h2>
              <p className="guide-summary">{article.summary}</p>
              {article.location && (
                <p>
                  <strong>Buka:</strong>{" "}
                  {role === "INSTRUCTOR"
                    ? article.location.replace("Kelola kelas", "Kelas saya")
                    : article.location}
                </p>
              )}
              {article.preparation && (
                <p>
                  <strong>Sebelum mulai:</strong> {article.preparation}
                </p>
              )}
              {article.content && article.content !== article.summary && (
                <p>{article.content}</p>
              )}
              {article.steps?.length && (
                <>
                  <h3>Langkah penggunaan</h3>
                  <ol>
                    {article.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </>
              )}
              {article.result && (
                <p className="guide-result">
                  <strong>Periksa hasil:</strong> {article.result}
                </p>
              )}
              {article.figure && (
                <figure>
                  <img
                    loading="lazy"
                    src={article.figure.src}
                    alt={article.figure.alt}
                  />
                  <figcaption>{article.figure.caption}</figcaption>
                </figure>
              )}
              {article.controls?.length && (
                <>
                  <h3>Pilihan dan tombol</h3>
                  <div className="guide-table-scroll phone-record-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Pilihan</th>
                          <th>Contoh</th>
                          <th>Kegunaan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {article.controls.map((control, index) => (
                          <tr key={index}>
                            <th scope="row">{control.label}</th>
                            <td data-label="Contoh">{control.value}</td>
                            <td data-label="Kegunaan">{control.effect}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {article.notes?.length && (
                <div className="guide-notes">
                  <h3>Perlu diketahui</h3>
                  {article.notes.map((note, index) => (
                    <p key={index}>{note}</p>
                  ))}
                </div>
              )}
              {article.gradeScales &&
                Object.values(GRADE_SCALE_PRESETS).map((scale) => (
                  <div className="phone-record-table" key={scale.version}>
                    <h3>Skala {scale.version}</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Skor minimum</th>
                          <th>Huruf mutu</th>
                          <th>Indeks mutu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scale.bands.map((band) => (
                          <tr key={band.letter}>
                            <td data-label="Skor minimum">≥ {band.minScore}</td>
                            <td data-label="Huruf mutu">{band.letter}</td>
                            <td data-label="Indeks mutu">{band.point.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </article>
          ))}
        </main>
      </div>
      <footer className="guide-footer">
        E-Learning UAY · Panduan sesuai peran akun · Untuk kembali ke aplikasi,
        buka tab sebelumnya atau pilih Kembali ke Bantuan.
      </footer>
    </div>
  );
}
