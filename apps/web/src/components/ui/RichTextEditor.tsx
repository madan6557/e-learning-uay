import { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Code,
  Eye,
  Edit3,
  Sparkles,
  Copy,
  Check,
  Download,
  FileText,
  X,
} from "lucide-react";
import { Html } from "../../Content";

export function formatContentHtml(raw?: string | null): string {
  if (!raw || !raw.trim()) return "";
  if (/<(p|div|ul|ol|h[1-6]|blockquote|table|hr)\b/i.test(raw)) {
    return raw;
  }
  return raw
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function stripHtmlTags(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface AiPromptTemplate {
  id: string;
  title: string;
  subtitle: string;
  downloadUrl: string;
  downloadFileName: string;
  promptText: string;
  sampleHtml: string;
}

export const AI_PROMPT_TEMPLATES: Record<string, AiPromptTemplate> = {
  assignment: {
    id: "assignment",
    title: "Tugas Kuliah & Studi Kasus",
    subtitle: "Instruksi tugas terstruktur dengan studi kasus, rubrik, dan ketentuan pengumpulan",
    downloadUrl: "/authoring/prompt-tugas-kuliah-ai.txt",
    downloadFileName: "prompt-tugas-kuliah-ai.txt",
    promptText: `Bertindaklah sebagai Dosen Pengampu Perguruan Tinggi di Universitas Achmad Yani (UAY). Buatlah instruksi tugas kuliah terstruktur dan komprehensif berbahasa Indonesia dengan format Rich Text HTML siap pakai untuk E-Learning UAY.

Mata Kuliah: [isi mata kuliah]
Program Studi / Semester: [misalnya: Teknik Informatika / Semester 4]
Topik Tugas: [isi topik tugas atau materi bab]
Bentuk Tugas: [Individu / Kelompok 3-4 orang]
Format Pengumpulan: [File PDF / Teks Jawaban / Tautan Repository GitHub / Berkas ZIP]
Estimasi Waktu: [misalnya: 1 Minggu]

KETENTUAN KELUARAN:
Gunakan format tag HTML yang rapi (<p>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <code>, <blockquote class="callout-box">) dengan struktur berikut:
1. Deskripsi & Latar Belakang Studi Kasus (jelaskan skenario kontekstual yang jelas).
2. Instruksi Pengerjaan (langkah 1, 2, 3 secara bertahap dan terukur).
3. Ketentuan Pengumpulan Berkas (batas waktu, format file, dan tata cara penamaan).
4. Kriteria Penilaian / Rubrik (rincian pembobotan nilai dari total 100 poin).
5. Kotak Catatan Penting (<blockquote class="callout-box"><strong>PERHATIAN:</strong> Larangan plagiarisme dan etika akademik universitas</blockquote>).`,
    sampleHtml: `<h3>1. Deskripsi &amp; Latar Belakang Studi Kasus</h3>
<p>Dalam proyek pengembangan sistem pada era transformasi digital, mahasiswa diminta untuk merancang dan menganalisis kebutuhan solusi teknologi yang adaptif dan teruji.</p>

<h3>2. Instruksi Pengerjaan</h3>
<ol>
  <li>Lakukan identifikasi masalah dan analisis kebutuhan pengguna berdasarkan skenario kasus yang ditentukan.</li>
  <li>Susun diagram rancangan arsitektur sistem dan model data yang terstruktur.</li>
  <li>Berikan kesimpulan, rekomendasi pengujian, dan rencana implementasi modul.</li>
</ol>

<blockquote class="callout-box">
  <strong>PERHATIAN:</strong> Tugas harus merupakan karya orisinal. Segala bentuk plagiarisme atau duplikasi antar-kelompok akan mengakibatkan pembatalan nilai tugas.
</blockquote>

<h3>3. Ketentuan Pengumpulan</h3>
<ul>
  <li>Format berkas yang diterima: Dokumen PDF (maksimal 20 MB).</li>
  <li>Batas waktu pengumpulan sesuai dengan tenggat waktu pada sistem E-Learning UAY.</li>
</ul>

<h3>4. Kriteria Penilaian</h3>
<ul>
  <li>Analisis Kebutuhan &amp; Masalah: <strong>30%</strong></li>
  <li>Rancangan Model &amp; Diagram Arsitektur: <strong>40%</strong></li>
  <li>Dokumentasi &amp; Kerapian Laporan: <strong>30%</strong></li>
</ul>`,
  },
  quiz: {
    id: "quiz",
    title: "Soal Kuis & Ujian",
    subtitle: "Paket soal pilihan ganda, benar/salah, menjodohkan, esai, beserta kunci dan rubrik",
    downloadUrl: "/authoring/prompt-soal-ujian-ai.txt",
    downloadFileName: "prompt-soal-ujian-ai.txt",
    promptText: `Bertindaklah sebagai Dosen dan Pembuat Soal Ujian Perguruan Tinggi di Universitas Achmad Yani (UAY). Buatlah paket soal kuis/ujian akademik berbahasa Indonesia untuk E-Learning UAY.

Mata Kuliah: [isi mata kuliah]
Topik / Pokok Bahasan: [isi materi yang diuji]
Tingkat Kesulitan: [Campuran: 40% Mudah/C2, 40% Sedang/C3, 20% Analisis/C4]
Jumlah Soal: [misalnya: 5 Pilihan Ganda, 2 Menjodohkan, 1 Esai Analisis]

PETUNJUK FORMAT TIAP SOAL:
1. Pilihan Ganda:
   - Teks butir soal (jelas, tidak ambigu, gunakan <code> untuk kode/istilah).
   - Opsi A, B, C, D (distraktor ilmiah).
   - Kunci jawaban yang benar.
   - Pembahasan singkat mengapa jawaban tersebut benar.
2. Soal Esai:
   - Pertanyaan analisis / studi kasus terstruktur.
   - Rubrik penilaian (kriteria penilaian dan bobot poin, misal: Pemahaman [30], Analisis [40], Solusi [30]).`,
    sampleHtml: `<p><strong>Pertanyaan Soal:</strong> Analisislah skenario berikut dan tentukan pendekatan yang paling tepat untuk menangani latensi tinggi pada transaksi basis data terdistribusi!</p>
<blockquote class="callout-box">
  <strong>Studi Kasus:</strong> Sistem mengalami lonjakan beban transaksi bersamaan pada jam sibuk, menyebabkan waktu respons meningkat di atas 5 detik.
</blockquote>
<p>Jelaskan langkah optimasi meliputi: (1) Indeksasi, (2) Partisi data, dan (3) Mekanisme caching.</p>`,
  },
  announcement: {
    id: "announcement",
    title: "Surat Edaran & Pengumuman Resmi",
    subtitle: "Draf surat edaran resmi universitas dengan gaya formal akademik dan kontak helpdesk",
    downloadUrl: "/authoring/prompt-pengumuman-edaran-ai.txt",
    downloadFileName: "prompt-pengumuman-edaran-ai.txt",
    promptText: `Bertindaklah sebagai Bagian Administrasi Akademik / Pimpinan Universitas Achmad Yani (UAY). Buatlah surat edaran atau pengumuman resmi akademik berbahasa Indonesia dengan gaya formal dan format Rich Text HTML siap pakai untuk E-Learning UAY.

Perihal / Judul Surat: [isi perihal atau judul pengumuman]
Penerbit: [Rektor / Wakil Rektor I / BAAK / Dekan Fakultas]
Nomor Referensi: [misalnya: SE/030/UAY/REK/2026]
Sasaran Audiens: [Seluruh Sivitas Akademika / Seluruh Mahasiswa / Seluruh Dosen]
Poin-Poin Utama: [tuliskan agenda atau ketentuan yang diberlakukan]

KETENTUAN KELUARAN:
Gunakan tag HTML formal (<p>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote class="callout-box">) dengan salam pembuka resmi, poin ketentuan bernomor, kotak catatan penting, narahubung helpdesk, dan salam penutup.`,
    sampleHtml: `<p>Yth. Seluruh Sivitas Akademika Universitas Achmad Yani,</p>
<p>Berdasarkan keputusan pimpinan universitas mengenai kalender akademik berjalan, dengan ini kami sampaikan ketentuan resmi sebagai berikut:</p>
<h3>1. Ketentuan Pokok</h3>
<ol>
  <li>Seluruh aktivitas pembelajaran dan administrasi perkuliahan berpusat pada portal resmi E-Learning UAY.</li>
  <li>Presensi kehadiran divalidasi langsung melalui sistem presensi mandiri pada setiap sesi pertemuan.</li>
</ol>
<blockquote class="callout-box">
  <strong>PERHATIAN:</strong> Harap memperhatikan seluruh tenggat waktu akademik resmi. Keterlambatan dapat mempengaruhi kelancaran evaluasi studi semester berjalan.
</blockquote>
<p>Untuk kendala dan informasi lebih lanjut, silakan menghubungi narahubung BAAK atau Helpdesk Fakultas masing-masing.</p>`,
  },
  article: {
    id: "article",
    title: "Materi Pembelajaran & Artikel",
    subtitle: "Panduan penyusunan modul materi ajar lengkap dengan contoh kode, tabel, dan formula",
    downloadUrl: "/authoring/prompt-artikel-ai.txt",
    downloadFileName: "prompt-artikel-ai.txt",
    promptText: `Bertindaklah sebagai Dosen Ahli dalam pembuatan materi kuliah di Universitas Achmad Yani (UAY). Buatlah artikel pembelajaran komprehensif berbahasa Indonesia untuk E-Learning UAY.

Topik: [isi topik materi]
Mata Kuliah: [isi mata kuliah]
Sasaran: [misalnya: Mahasiswa Semester 2]
Tujuan Pembelajaran: [isi kompetensi yang diharapkan]
Panjang: [misalnya: 800–1.200 kata]
Gaya: [jelas, bertahap, aplikatif]

Sajikan dengan pengantar konsep, subjudul bertahap, contoh kasus, dan rangkuman penting.`,
    sampleHtml: `<h3>Pendahuluan</h3>
<p>Materi ini membahas konsep fundamental dan aplikasi praktis dalam bidang studi yang relevan.</p>
<h3>Konsep Pokok</h3>
<ul>
  <li><strong>Prinsip Utama:</strong> Penjelasan konsep dasar secara sistematis.</li>
  <li><strong>Penerapan:</strong> Contoh implementasi pada studi kasus nyata.</li>
</ul>
<blockquote class="callout-box">
  <strong>Poin Kunci:</strong> Pemahaman menyeluruh terhadap dasar teori menjadi prasyarat sebelum melanjutkan ke tahap implementasi.
</blockquote>`,
  },
};

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  rows?: number;
  minHeight?: number | string;
  required?: boolean;
  compact?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  defaultAiTemplate?: "assignment" | "quiz" | "announcement" | "article";
}

export function RichTextEditor({
  value,
  onChange,
  name,
  placeholder,
  rows = 5,
  minHeight,
  required,
  compact = false,
  disabled = false,
  id,
  className = "",
  defaultAiTemplate,
}: RichTextEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedAiTemplate, setSelectedAiTemplate] = useState<string>(
    defaultAiTemplate ?? "assignment",
  );
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!showAiModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowAiModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAiModal]);

  const insertTag = (before: string, after: string, placeholderText = "") => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) {
      onChange(value + before + placeholderText + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const newValue =
      value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    }, 0);
  };

  return (
    <div className={`rich-editor-container ${className}`}>
      {/* Hidden textarea to guarantee FormData captures value even if in preview mode */}
      {name && (
        <textarea
          name={name}
          value={value}
          readOnly
          required={required && !value.trim()}
          style={{ display: "none" }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Formatting Toolbar */}
      <div className="rich-editor-toolbar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          <button
            type="button"
            title="Teks Tebal"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<strong>", "</strong>", "Teks Tebal")}
          >
            <Bold size={13} /> {!compact && "Tebal"}
          </button>
          <button
            type="button"
            title="Teks Miring"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<em>", "</em>", "Teks Miring")}
          >
            <Italic size={13} /> {!compact && "Miring"}
          </button>
          <button
            type="button"
            title="Garis Bawah"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<u>", "</u>", "Garis Bawah")}
          >
            <Underline size={13} /> {!compact && "Garis Bawah"}
          </button>

          {!compact && (
            <button
              type="button"
              title="Subjudul"
              disabled={disabled || mode === "preview"}
              onClick={() => insertTag("<h3>", "</h3>", "Subjudul Poin")}
            >
              <Heading size={13} /> Subjudul
            </button>
          )}

          <div className="toolbar-divider" />

          <button
            type="button"
            title="Daftar Poin (Bullet)"
            disabled={disabled || mode === "preview"}
            onClick={() =>
              insertTag(
                "<ul>\n  <li>",
                "</li>\n  <li>Poin berikutnya</li>\n</ul>",
                "Poin pertama",
              )
            }
          >
            <List size={13} /> {!compact && "Poin"}
          </button>
          <button
            type="button"
            title="Daftar Nomor"
            disabled={disabled || mode === "preview"}
            onClick={() =>
              insertTag(
                "<ol>\n  <li>",
                "</li>\n  <li>Langkah berikutnya</li>\n</ol>",
                "Langkah pertama",
              )
            }
          >
            <ListOrdered size={13} /> {!compact && "Nomor"}
          </button>
          <button
            type="button"
            title="Kotak Catatan / Sorotan"
            disabled={disabled || mode === "preview"}
            onClick={() =>
              insertTag(
                '<blockquote class="callout-box">\n  <strong>Catatan:</strong> ',
                "\n</blockquote>",
                "Tuliskan instruksi atau catatan penting di sini...",
              )
            }
          >
            <Quote size={13} /> {!compact && "Catatan"}
          </button>

          <button
            type="button"
            title="Sisipkan Tautan Web"
            disabled={disabled || mode === "preview"}
            onClick={() => {
              const url = prompt(
                "Masukkan URL tautan (contoh: https://uay.ac.id):",
                "https://",
              );
              if (url) {
                insertTag(
                  `<a href="${url}" target="_blank" rel="noopener noreferrer">`,
                  "</a>",
                  "Teks Tautan",
                );
              }
            }}
          >
            <LinkIcon size={13} /> {!compact && "Tautan"}
          </button>

          <button
            type="button"
            title="Kode / Monospace"
            disabled={disabled || mode === "preview"}
            onClick={() => insertTag("<code>", "</code>", "kode")}
          >
            <Code size={13} /> {!compact && "Kode"}
          </button>
        </div>

        {/* Mode Toggle & AI Prompt */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            type="button"
            style={{
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.09), rgba(2, 132, 199, 0.09))",
              color: "#7c3aed",
              borderColor: "rgba(124, 58, 237, 0.35)",
              fontWeight: 600,
            }}
            onClick={() => {
              setSelectedAiTemplate(defaultAiTemplate ?? "assignment");
              setShowAiModal(true);
            }}
            title="Buka Template Prompt AI"
          >
            <Sparkles size={13} /> {!compact && "Prompt AI"}
          </button>

          <button
            type="button"
            style={{
              background: mode === "edit" ? "var(--primary, #0284c7)" : "#ffffff",
              color: mode === "edit" ? "#ffffff" : "var(--foreground, #334155)",
              borderColor: mode === "edit" ? "var(--primary, #0284c7)" : undefined,
            }}
            onClick={() => setMode("edit")}
            title="Mode Editor Teks"
          >
            <Edit3 size={13} /> Tulis
          </button>
          <button
            type="button"
            style={{
              background: mode === "preview" ? "var(--primary, #0284c7)" : "#ffffff",
              color: mode === "preview" ? "#ffffff" : "var(--foreground, #334155)",
              borderColor: mode === "preview" ? "var(--primary, #0284c7)" : undefined,
            }}
            onClick={() => setMode("preview")}
            title="Pratinjau Hasil Format"
          >
            <Eye size={13} /> Pratinjau
          </button>
        </div>
      </div>

      {/* Editor Body or Preview Body */}
      {mode === "edit" ? (
        <textarea
          ref={textareaRef}
          id={id}
          className="rich-editor-textarea"
          rows={rows}
          style={{ minHeight }}
          placeholder={placeholder || "Tuliskan konten dengan format teks rapi di sini..."}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div
          className="rich-editor-textarea formatted-content announcement-content-body"
          style={{
            minHeight: minHeight ?? (rows ? rows * 28 : 120),
            maxHeight: 480,
            overflowY: "auto",
            background: "var(--surface-subtle, #fafafa)",
            padding: "14px 16px",
          }}
        >
          {value.trim() ? (
            <Html text={formatContentHtml(value)} inline={false} />
          ) : (
            <span style={{ color: "var(--muted, #94a3b8)", fontStyle: "italic" }}>
              (Belum ada teks untuk dipratinjau. Ketik pada mode Tulis terlebih dahulu.)
            </span>
          )}
        </div>
      )}

      {/* AI Prompt Templates Modal */}
      {showAiModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAiModal(false);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--line, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(2, 132, 199, 0.05))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={18} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Template Prompt AI — E-Learning UAY
                </h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowAiModal(false)}
                title="Tutup"
                style={{ background: "transparent", border: 0, cursor: "pointer", color: "#64748b" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Selector Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--line, #e2e8f0)",
                background: "var(--surface-muted, #f8fafc)",
                padding: "4px 8px 0",
                gap: 4,
                overflowX: "auto",
              }}
            >
              {Object.values(AI_PROMPT_TEMPLATES).map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedAiTemplate(tmpl.id);
                    setCopied(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    border: "none",
                    borderBottom: selectedAiTemplate === tmpl.id ? "2px solid #7c3aed" : "2px solid transparent",
                    background: "transparent",
                    fontWeight: selectedAiTemplate === tmpl.id ? 700 : 500,
                    color: selectedAiTemplate === tmpl.id ? "#7c3aed" : "#64748b",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tmpl.title}
                </button>
              ))}
            </div>

            {/* Content Body */}
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              {(() => {
                const currentTmpl =
                  AI_PROMPT_TEMPLATES[selectedAiTemplate] ??
                  AI_PROMPT_TEMPLATES.assignment;
                return (
                  <div>
                    <p style={{ margin: "0 0 10px", fontSize: "0.88rem", color: "#475569" }}>
                      {currentTmpl.subtitle}
                    </p>
                    <div
                      style={{
                        background: "rgba(2, 132, 199, 0.08)",
                        border: "1px solid rgba(2, 132, 199, 0.2)",
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: "0.82rem",
                        color: "#0369a1",
                        marginBottom: 12,
                      }}
                    >
                      💡 <strong>Cara Pakai:</strong> Klik tombol <strong>Salin Prompt</strong> di bawah, tempelkan ke AI (ChatGPT, Claude, Gemini, dll.), sesuaikan variabel di dalam tanda <code>[kurung siku]</code>, lalu salin hasil teksnya kembali ke editor ini.
                    </div>
                    <pre
                      style={{
                        background: "#0f172a",
                        color: "#f8fafc",
                        padding: 14,
                        borderRadius: 8,
                        fontSize: "0.82rem",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxHeight: 280,
                        overflowY: "auto",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {currentTmpl.promptText}
                    </pre>
                  </div>
                );
              })()}
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--line, #e2e8f0)",
                background: "var(--surface-muted, #f8fafc)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={
                    (AI_PROMPT_TEMPLATES[selectedAiTemplate] ??
                      AI_PROMPT_TEMPLATES.assignment).downloadUrl
                  }
                  download={
                    (AI_PROMPT_TEMPLATES[selectedAiTemplate] ??
                      AI_PROMPT_TEMPLATES.assignment).downloadFileName
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.82rem",
                    color: "var(--foreground, #334155)",
                    textDecoration: "none",
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--line, #cbd5e1)",
                    background: "#ffffff",
                    fontWeight: 500,
                  }}
                >
                  <Download size={14} /> Unduh .txt
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const currentTmpl =
                      AI_PROMPT_TEMPLATES[selectedAiTemplate] ??
                      AI_PROMPT_TEMPLATES.assignment;
                    onChange(currentTmpl.sampleHtml);
                    setShowAiModal(false);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.82rem",
                    color: "#0284c7",
                    border: "1px solid rgba(2, 132, 199, 0.3)",
                    background: "rgba(2, 132, 199, 0.08)",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title="Isi editor dengan contoh format langsung"
                >
                  <FileText size={14} /> Sisipkan Contoh Format
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowAiModal(false)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="primary"
                  style={{
                    background: copied ? "#16a34a" : "#7c3aed",
                    borderColor: copied ? "#16a34a" : "#7c3aed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={async () => {
                    const currentTmpl =
                      AI_PROMPT_TEMPLATES[selectedAiTemplate] ??
                      AI_PROMPT_TEMPLATES.assignment;
                    await navigator.clipboard.writeText(currentTmpl.promptText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Berhasil Disalin!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Salin Prompt AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
