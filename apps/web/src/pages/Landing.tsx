import {
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { PublicShell, LoginButton } from "../components/layout";
import { Notice } from "../components/ui";

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "SESSION_EXPIRED":
      return "Sesi login Anda telah berakhir. Silakan masuk kembali.";
    case "INVALID_STATE":
      return "Sesi tidak valid atau telah kedaluwarsa. Silakan masuk kembali.";
    case "ACCOUNT_DISABLED":
      return "Akun akademik Anda sedang berstatus non-aktif. Silakan hubungi bagian akademik atau administrator prodi.";
    case "INVALID_IDENTITY":
      return "Identitas akun tidak ditemukan pada sistem SSO. Pastikan Anda menggunakan akun UAY yang terdaftar.";
    case "NO_APPLICATION_ACCESS":
      return "Akun SSO Anda belum memiliki izin akses ke layanan E-Learning UAY. Silakan hubungi Administrator atau Helpdesk IT UAY untuk aktivasi akses akun Anda.";
    case "access_denied":
      return "Proses masuk SSO dibatalkan atau izin ditolak.";
    default:
      return "Terjadi kendala saat autentikasi SSO. Silakan coba masuk kembali.";
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
            backgroundColor: "var(--adaptive-danger-soft, #fef2f2)",
            border: "1px solid var(--adaptive-danger-border, #fecaca)",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            color: "var(--adaptive-danger-text, #991b1b)",
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
                  color: "var(--adaptive-danger-text, #b91c1c)",
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
                color: "var(--adaptive-danger-text, #991b1b)",
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
      <section
        className="landing-hero"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minHeight: "60vh",
          padding: "48px 16px 64px",
        }}
      >
        <div
          className="hero-content"
          style={{
            alignItems: "center",
            maxWidth: 620,
            width: "100%",
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <picture>
              <source srcSet="/uay-logo.webp" type="image/webp" />
              <img
                src="/uay-logo.png"
                alt="Logo UAY"
                width="84"
                height="84"
                style={{ objectFit: "contain" }}
                loading="eager"
                decoding="async"
              />
            </picture>
          </div>
          <div className="hero-pill" style={{ marginBottom: 16 }}>
            <span className="hero-pill-dot" />
            <span>UNIVERSITAS ACHMAD YANI BANJARMASIN</span>
          </div>
          <h1 style={{ margin: "0 0 16px 0" }}>E-Learning UAY</h1>
          <p style={{ margin: "0 0 28px 0" }}>
            Materi kuliah, tugas, kuis, dan rekap nilai untuk mahasiswa dan
            dosen Universitas Achmad Yani.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <LoginButton
              className="button hero-cta"
              label="Masuk dengan SSO UAY"
              config={config}
            >
              <span>Login / Masuk Aplikasi</span>
              <ArrowRight size={18} />
            </LoginButton>
          </div>
          <div
            className="landing-caption"
            style={{ justifyContent: "center", marginTop: 20 }}
          >
            <ShieldCheck size={16} />
            <span>Gunakan akun akademik UAY Anda.</span>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
