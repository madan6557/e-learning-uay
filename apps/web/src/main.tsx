/**
 * ============================================================================
 * E-LEARNING UNIVERSITAS ACHMAD YANI (UAY) - FRONTEND APPLICATION ROOT
 * ============================================================================
 * @module apps/web/src/main.tsx
 *
 * Titik masuk utama (SPA Entrypoint) aplikasi frontend React.
 *
 * Tanggung Jawab & Arsitektur:
 * 1. Otentikasi sesi Keycloak SSO OIDC dan verifikasi state identitas (`/api/v1/me`).
 * 2. Routing sisi-klien (client-side routing) dan layout shell (`AuthShell`, `PublicShell`).
 * 3. Navigasi peran (Super Admin, Rektor, Admin Prodi, Dosen, Mahasiswa).
 * 4. Pemilih rute cerdas (route dispatcher) ke modul: ClassPage, QuizPage,
 *    AssignmentPage, Catalog, AnnouncementsPage, Profile, Help, dan RectorDashboard.
 * ============================================================================
 */

import { ConfirmationHost } from "./confirm";
import { FeedbackHost } from "./feedback";
import { createRoot } from "react-dom/client";
import { lazy, Suspense, useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { t, api, useApi, Loading, navigate, Empty, setAuthToken } from "./lib";
import { handleOidcCallback, logoutOidc } from "./oidc";
import { readCache } from "./readCache";
import {
  DraftUserContext,
  confirmUnsaved,
  useNavigationGuard,
} from "./useLocalDraft";
import { routeFromLocation } from "./router";
import "./guide.css";
import { useSessionExpiry } from "./useSessionExpiry";
import "./styles.css";
import "./workspace.css";
import "./experience.css";
import "./phone.css";
import "./theme.css";
import { ThemeProvider } from "./contexts/ThemeContext";

import { PublicShell, AuthShell } from "./components/layout";
import { Landing } from "./pages/Landing";

const Dashboard = lazy(() =>
  import("./pages").then((m) => ({ default: m.Dashboard })),
);
const Catalog = lazy(() =>
  import("./pages").then((m) => ({ default: m.Catalog })),
);
const Profile = lazy(() =>
  import("./pages").then((m) => ({ default: m.Profile })),
);
const AnnouncementsPage = lazy(() =>
  import("./AnnouncementsPage").then((m) => ({ default: m.AnnouncementsPage })),
);
const HelpPage = lazy(() =>
  import("./HelpPage").then((m) => ({ default: m.HelpPage })),
);
const GuidePage = lazy(() =>
  import("./GuidePage").then((m) => ({ default: m.GuidePage })),
);
const ClassPage = lazy(() =>
  import("./ClassPage").then((m) => ({ default: m.ClassPage })),
);
const RectorDashboard = lazy(() =>
  import("./rector/RectorDashboard").then((m) => ({
    default: m.RectorDashboard,
  })),
);
const QuizPage = lazy(() =>
  import("./Assessment").then((m) => ({ default: m.QuizPage })),
);
const AssignmentPage = lazy(() =>
  import("./Assessment").then((m) => ({ default: m.AssignmentPage })),
);
const DepartmentGovernancePage = lazy(() =>
  import("./DepartmentGovernancePage").then((m) => ({
    default: m.DepartmentGovernancePage,
  })),
);

function AuthCallbackPage({
  config,
  configError,
  onSuccess,
}: {
  config?: any;
  configError?: Error | null;
  onSuccess: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config) return;
    let active = true;
    async function processCallback() {
      try {
        const oidcUser = await handleOidcCallback({
          issuer: config?.issuer,
          clientId: config?.clientId,
          redirectUri: config?.redirectUri,
        });
        if (!oidcUser || !oidcUser.access_token) {
          throw new Error("Gagal memperoleh token autentikasi dari SSO.");
        }
        setAuthToken(oidcUser.access_token);

        // Sync with backend session & user database
        await api("/auth/session", "POST", {
          accessToken: oidcUser.access_token,
          idToken: oidcUser.id_token,
          refreshToken: oidcUser.refresh_token,
        });
        if (active) {
          readCache.clear();
          onSuccess();
        }
      } catch (err: any) {
        console.error("[Auth] OIDC callback error:", err);
        if (active) {
          setAuthToken(null);
          sessionStorage.removeItem("uay-return-path");
          try {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
              const k = sessionStorage.key(i);
              if (k && (k.startsWith("oidc.") || k.startsWith("authority."))) {
                sessionStorage.removeItem(k);
              }
            }
          } catch {}
          setError(
            err?.message ||
              "Terjadi kesalahan saat memproses callback autentikasi SSO.",
          );
        }
      }
    }
    processCallback();
    return () => {
      active = false;
    };
  }, [config]);

  if (error || configError) {
    return (
      <PublicShell config={config}>
        <div
          className="card"
          style={{
            maxWidth: 480,
            margin: "60px auto",
            padding: 28,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              marginBottom: 12,
              color: "var(--destructive, #ef4444)",
            }}
          >
            Gagal Masuk SSO
          </h2>
          <p
            style={{
              color: "var(--muted-foreground, #6b7280)",
              marginBottom: 24,
              fontSize: "0.95rem",
            }}
          >
            {error ?? configError?.message}
          </p>
          <button
            type="button"
            className="button hero-cta"
            onClick={() => {
              setAuthToken(null);
              sessionStorage.clear();
              window.location.replace("/");
            }}
          >
            Kembali ke Halaman Masuk
          </button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell config={config}>
      <div style={{ padding: "100px 20px", textAlign: "center" }}>
        <Loading />
        <p
          style={{
            marginTop: 20,
            color: "var(--muted-foreground, #6b7280)",
            fontWeight: 500,
          }}
        >
          Memverifikasi autentikasi SSO UAY...
        </p>
      </div>
    </PublicShell>
  );
}

function App() {
  const [route, setRoute] = useState(routeFromLocation);
  const config = useApi("/auth/config"),
    identity = useApi(route.startsWith("/auth/callback") ? null : "/me");
  const user = identity.data;
  useNavigationGuard();
  useEffect(() => {
    if (route.split("?")[0] !== "/Panduan/panduan.html") return;
    // A new tab uses the shared campus cookie. Recheck the account when the
    // reader returns after logging out or switching accounts in another tab.
    const refreshIdentity = () => identity.reload();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshIdentity();
    };
    window.addEventListener("focus", refreshIdentity);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refreshIdentity);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [route]);

  const [authErrorNotice, setAuthErrorNotice] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const err = urlParams.get("auth_error");
      if (err) {
        urlParams.delete("auth_error");
        const newSearch = urlParams.toString();
        const newUrl =
          window.location.pathname +
          (newSearch ? `?${newSearch}` : "") +
          window.location.hash;
        window.history.replaceState({}, "", newUrl);
        setAuthToken(null);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("uay-return-path");
          try {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
              const k = sessionStorage.key(i);
              if (k && (k.startsWith("oidc.") || k.startsWith("authority."))) {
                sessionStorage.removeItem(k);
              }
            }
          } catch {}
        }
        return err;
      }
    } catch {}
    return null;
  });

  useSessionExpiry(() => {
    setAuthToken(null);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("uay-return-path");
    }
    if (identity.data) {
      identity.setData(null);
      setAuthErrorNotice("SESSION_EXPIRED");
      navigate("/");
    }
  });
  useEffect(() => {
    const change = () => setRoute(location.pathname + location.search || "/");
    window.addEventListener("routechange", change);
    return () => {
      window.removeEventListener("routechange", change);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    if (user.role === "RECTOR" && route.split("?")[0] === "/dashboard") {
      navigate("/rector", true);
      return;
    }
    const pending = sessionStorage.getItem("uay-return-path");
    if (pending) {
      sessionStorage.removeItem("uay-return-path");
      if (
        pending.startsWith("/") &&
        !pending.startsWith("//") &&
        !pending.startsWith("/auth/") &&
        !pending.startsWith("/api/") &&
        !["/", "/login", "/dashboard", "/auth/callback"].includes(pending)
      ) {
        navigate(pending, true);
        return;
      }
    }
    if (["/", "/login"].includes(route))
      navigate(user.role === "RECTOR" ? "/rector" : "/dashboard", true);
  }, [user, route]);

  const logout = async () => {
    if (!(await confirmUnsaved())) return;
    setAuthToken(null);
    const result = await api("/auth/logout", "POST", {}).catch(() => ({}));
    readCache.clear();
    identity.setData(null);
    try {
      await logoutOidc();
    } catch {}
    const isExternalIdp = (urlStr?: string | null) => {
      if (!urlStr) return false;
      try {
        const target = new URL(urlStr);
        if (target.origin === location.origin) return false;
        const localAliases = ["localhost", "127.0.0.1", "[::1]"];
        if (
          localAliases.includes(target.hostname) &&
          localAliases.includes(location.hostname)
        ) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    };
    if (result?.logoutUrl && isExternalIdp(result.logoutUrl)) {
      location.assign(result.logoutUrl);
    } else {
      navigate("/", true);
    }
  };
  if (route.startsWith("/auth/callback")) {
    return (
      <AuthCallbackPage
        config={config.data}
        configError={config.error}
        onSuccess={() => {
          identity.reload();
          const pending = sessionStorage.getItem("uay-return-path");
          sessionStorage.removeItem("uay-return-path");
          if (
            pending &&
            pending.startsWith("/") &&
            !pending.startsWith("//") &&
            !pending.startsWith("/auth/") &&
            !pending.startsWith("/api/") &&
            !["/", "/login", "/auth/callback"].includes(pending)
          ) {
            navigate(pending, true);
          } else {
            navigate("/dashboard", true);
          }
        }}
      />
    );
  }
  if (identity.loading && !user)
    return (
      <PublicShell config={config.data}>
        <Loading />
      </PublicShell>
    );
  if (!user)
    return (
      <Landing
        config={config.data}
        authError={authErrorNotice}
        onClearAuthError={() => setAuthErrorNotice(null)}
        error={
          config.error ??
          (identity.error &&
          ![t.errors.LOGIN_REQUIRED, t.errors.SESSION_EXPIRED].includes(
            identity.error.message,
          )
            ? identity.error
            : null)
        }
      />
    );
  const parsedRoute = new URL(route, location.origin);
  const pathname = parsedRoute.pathname;
  const params = parsedRoute.searchParams;
  if (pathname === "/Panduan/panduan.html")
    return (
      <Suspense fallback={<Loading />}>
        <GuidePage user={user} />
      </Suspense>
    );
  const [, section, id, itemKind, itemSlug] = pathname.split("/");
  let page;
  if (section === "rector" && ["RECTOR", "SUPER_ADMIN"].includes(user.role))
    page = <RectorDashboard demo={!!config.data?.demoEnabled} />;
  else if (
    user.role === "RECTOR" &&
    !["profile", "help", "announcements"].includes(section)
  )
    page = (
      <Empty>
        <h1>Pemantauan akademik</h1>
        <p>
          Akun rektor dapat melihat laporan kegiatan dosen dan penyelesaian
          penilaian.
        </p>
        <a className="button" href="/rector">
          Buka laporan akademik
        </a>
      </Empty>
    );
  else if (section === "classes" && id)
    page = (
      <ClassPage
        key={id}
        id={id}
        tab={
          itemKind &&
          !["resources", "quizzes", "assignments"].includes(itemKind)
            ? itemKind
            : (params.get("tab") ?? "content")
        }
        user={user}
        resourceSlug={itemKind === "resources" ? (itemSlug ?? null) : null}
        selectedKind={
          itemKind === "quizzes" || itemKind === "assignments" ? itemKind : null
        }
        selectedSlug={
          itemKind === "quizzes" || itemKind === "assignments"
            ? (itemSlug ?? null)
            : null
        }
        config={config.data}
      />
    );
  else if (section === "quizzes" && id)
    page = <QuizPage key={id} id={id} user={user} />;
  else if (section === "assignments" && id)
    page = <AssignmentPage key={id} id={id} user={user} />;
  else if (section === "catalog")
    page = ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role) ? (
      <Catalog
        user={user}
        config={config.data}
        onConfigChange={() => config.reload()}
      />
    ) : (
      <Empty>
        <h1>Katalog tidak tersedia</h1>
        <p>Pengelolaan katalog hanya tersedia untuk administrator.</p>
        <a className="button" href="/classes">
          Buka kelas saya
        </a>
      </Empty>
    );
  else if (section === "departments")
    page =
      user.role === "SUPER_ADMIN" ? (
        <DepartmentGovernancePage user={user} config={config.data} />
      ) : (
        <Empty>
          <h1>Akses Dibatasi</h1>
          <p>
            Pengelolaan program studi dan otoritas akademik hanya dapat diakses
            oleh Super Administrator.
          </p>
          <a className="button" href="/dashboard">
            Kembali ke beranda
          </a>
        </Empty>
      );
  else if (section === "announcements")
    page = <AnnouncementsPage user={user} config={config.data} />;
  else if (section === "profile")
    page = <Profile user={user} accountUrl={config.data?.accountUrl} />;
  else if (section === "help") page = <HelpPage user={user} />;
  else if (
    ["", "dashboard", "classes", "agenda", "grades", "notifications"].includes(
      section,
    )
  )
    page = (
      <Dashboard
        key={pathname}
        page={section || "dashboard"}
        user={user}
        config={config.data}
        onConfigChange={() => config.reload()}
      />
    );
  else
    page = (
      <Empty>
        <h1>Halaman tidak ditemukan</h1>
        <p>Gunakan navigasi untuk membuka ruang pembelajaran.</p>
        <a className="button" href="/dashboard">
          Kembali ke beranda
        </a>
      </Empty>
    );
  return (
    <DraftUserContext.Provider value={user.id}>
      <AuthShell
        user={user}
        pathname={pathname}
        demo={!!config.data?.demoEnabled}
        logout={logout}
      >
        {page}
      </AuthShell>
    </DraftUserContext.Provider>
  );
}
const hot = (import.meta as any).hot;
const root = hot?.data.root ?? createRoot(document.getElementById("root")!);
if (hot) hot.data.root = root;

// Vercel Analytics hanya diaktifkan jika aplikasi berjalan di domain Vercel
const isVercel =
  typeof window !== "undefined" &&
  (window.location.hostname.endsWith(".vercel.app") ||
    window.location.hostname === "vercel.app" ||
    Boolean((import.meta.env as any).VITE_VERCEL_ENV));

root.render(
  <ThemeProvider>
    <ConfirmationHost />
    <FeedbackHost />
    <App />
    {isVercel && <Analytics />}
  </ThemeProvider>,
);
