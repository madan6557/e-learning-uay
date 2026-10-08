import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { PublicShell, LoginButton } from "../components/layout";
import { Notice } from "../components/ui";

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "SESSION_EXPIRED":
      return "Sesi login Anda telah berakhir atau kode otentikasi kedaluwarsa. Data login telah dibersihkan otomatis. Silakan klik tombol Masuk untuk memulai sesi baru.";
    case "INVALID_STATE":
      return "Verifikasi keamanan sesi tidak valid atau telah kedaluwarsa. Data login lama telah dibersihkan, silakan masuk kembali.";
    case "ACCOUNT_DISABLED":
      return "Akun akademik Anda sedang berstatus non-aktif. Silakan hubungi bagian akademik atau administrator prodi.";
    case "INVALID_IDENTITY":
      return "Identitas akun tidak ditemukan pada sistem SSO. Pastikan Anda menggunakan akun UAY yang terdaftar.";
    case "access_denied":
      return "Proses masuk SSO dibatalkan atau izin ditolak.";
    default:
      return "Terjadi kendala saat autentikasi SSO. Sesi login telah dibersihkan otomatis, silakan coba masuk kembali.";
  }
}

export interface LandingProps {
  config: any;
  error?: Error | null;
  authError?: string | null;
  onClearAuthError?: () => void;
}

export function Landing({
  config,
  error,
  authError,
  onClearAuthError,
}: LandingProps) {
  return (
    <PublicShell config={config}>
      {authError && (
        <div
          role="alert"
          style={{
            maxWidth: 1040,
            margin: "24px auto -8px auto",
            padding: "14px 20px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            color: "#991b1b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden="true">
              ⚠️
            </span>
            <div>
              <strong style={{ fontSize: "0.95rem" }}>Pemberitahuan Masuk</strong>
              <p
                style={{
                  margin: "3px 0 0 0",
                  fontSize: "0.88rem",
                  color: "#b91c1c",
                }}
              >
                {getAuthErrorMessage(authError)}
              </p>
            </div>
          </div>
          {onClearAuthError && (
            <button
              type="button"
              onClick={onClearAuthError}
              aria-label="Tutup pemberitahuan"
              style={{
                background: "transparent",
                border: "none",
                color: "#991b1b",
                fontSize: "1.1rem",
                cursor: "pointer",
                padding: "4px 8px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}
      {error && <Notice error={error} />}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-pill">
            <span className="hero-pill-dot" />
            <span>UNIVERSITAS ACHMAD YANI BANJARMASIN</span>
          </div>
          <h1>E-Learning UAY</h1>
          <p>
            Materi kuliah, tugas, kuis, dan rekap nilai untuk mahasiswa dan
            dosen Universitas Achmad Yani.
          </p>
          <div className="hero-actions">
            <LoginButton
              className="button hero-cta"
              label="Masuk dengan SSO UAY"
              config={config}
            >
              <span>Masuk dengan SSO UAY</span>
              <ArrowRight size={18} />
            </LoginButton>
          </div>
          <div className="landing-caption">
            <ShieldCheck size={16} />
            <span>Gunakan akun akademik UAY Anda.</span>
          </div>
        </div>
        {/* A visitor here has exactly one job: sign in. The panel answers the
            three things that actually confuse people afterwards, instead of
            repeating the feature cards below the hero. */}
        <aside className="landing-preview" aria-label="Sebelum masuk">
          <div className="preview-body">
            <div className="preview-portal-card">
              <div className="portal-badge-row">
                <span className="portal-badge">
                  {config?.semesterLabel ||
                    config?.academicYear ||
                    "SEMESTER GANJIL 2026/2027"}
                </span>
              </div>
              <h4>Sebelum masuk</h4>
              <p>
                Akses diatur oleh program studi dan dosen pengampu, bukan oleh
                aplikasi ini.
              </p>
            </div>
            <dl className="portal-notes">
              <div>
                <dt>Daftar kelas kosong</dt>
                <dd>
                  Program studi belum mendaftarkan Anda pada kelas semester ini.
                </dd>
              </div>
              <div>
                <dt>Kelas terbuka tetapi belum ada isinya</dt>
                <dd>Dosen belum menerbitkan materi atau aktivitas.</dd>
              </div>
              <div>
                <dt>Tidak dapat masuk</dt>
                <dd>Hubungi bagian akademik program studi Anda.</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
      <section className="landing-features" aria-label="Fitur pembelajaran">
        {[
          [
            BookOpen,
            "Kelas",
            "Section, materi, dan pengumuman dari dosen pengampu.",
          ],
          [
            ClipboardCheck,
            "Tugas dan kuis",
            "Kerjakan sebelum tenggat. Setiap versi pengumpulan tersimpan.",
          ],
          [
            GraduationCap,
            "Nilai",
            "Rekap per kategori beserta bobotnya, setelah dosen menerbitkan.",
          ],
        ].map(([Icon, title, text]: any) => (
          <article className="feature-card" key={title}>
            <div className="feature-icon-wrapper">
              <Icon size={22} />
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </PublicShell>
  );
}
