import { ConfirmationHost } from "./confirm";
import { ErrorBoundary } from "./ErrorBoundary";
import { createRoot } from "react-dom/client";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Bell,
  CalendarDays,
  CircleHelp,
  LogOut,
  ArrowRight,
  LibraryBig,
  Menu,
  ShieldCheck,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  t,
  api,
  useApi,
  Loading,
  Notice,
  navigate,
  Action,
  Empty,
} from "./lib";
import { readCache } from "./readCache";
import { Dashboard, Catalog, Profile } from "./pages";
import { Avatar, Breadcrumbs, IconButton, UserChip } from "./ui";
import {
  DraftUserContext,
  confirmUnsaved,
  useNavigationGuard,
} from "./useLocalDraft";
import { routeFromLocation } from "./router";
const ClassPage = lazy(() =>
  import("./ClassPage").then((m) => ({ default: m.ClassPage })),
);
const RectorDashboard = lazy(() => import('./rector/RectorDashboard').then(m=>({default:m.RectorDashboard})));
const QuizPage = lazy(() =>
  import("./Assessment").then((m) => ({ default: m.QuizPage })),
);
const AssignmentPage = lazy(() =>
  import("./Assessment").then((m) => ({ default: m.AssignmentPage })),
);
import { HelpPage } from "./HelpPage";
import "./styles.css";
import "./workspace.css";
import "./experience.css";
// The square mark and product-name lockup is shared with the UAY SSO console
// so the two applications read as one environment.
function Brand({
  home = "/",
  collapsed = false,
}: {
  home?: string;
  collapsed?: boolean;
}) {
  return (
    <a className="brand" href={home} aria-label="UAY E-Learning beranda">
      <span className="brand-mark" aria-hidden="true">
        <picture>
          <source srcSet="/uay-logo.webp" type="image/webp" />
          <img
            src="/uay-logo.png"
            alt="Logo UAY"
            className="brand-logo-img"
            width="26"
            height="26"
            loading="eager"
            decoding="async"
          />
        </picture>
      </span>
      {!collapsed && <span className="brand-name">E-Learning UAY</span>}
    </a>
  );
}
function LoginButton({
  children,
  className,
  demoUserId,
  label,
}: {
  children: ReactNode;
  className: string;
  demoUserId?: string;
  label: string;
}) {
  return (
    <Action
      className={className}
      label={label}
      run={async () => {
        sessionStorage.setItem(
          "uay-return-path",
          location.pathname + location.search,
        );

        if (demoUserId) {
          await api("/auth/development-login", "POST", {
            userId: demoUserId,
          });
          location.assign("/");
          return;
        }

        const { authorizationUrl } = await api<{ authorizationUrl: string }>(
          "/auth/authorization",
          "POST",
        );

        location.assign(authorizationUrl);
      }}
    >
      {children}
    </Action>
  );
}
function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="public-shell">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header className="public-header">
        <Brand />
        <nav aria-label="Menu publik">
          <LoginButton className="header-sso-btn" label="Masuk dengan SSO UAY">
            <span>Masuk SSO</span>
            <ArrowRight size={15} />
          </LoginButton>
        </nav>
      </header>
      <main id="main-content">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <footer>
        <span>© {new Date().getFullYear()} {t.university}</span>
        <span>{t.timeZone}</span>
      </footer>
    </div>
  );
}
function Landing({ config, error }: { config: any; error?: Error | null }) {
  return (
    <PublicShell>
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
function AuthShell({
  user,
  pathname,
  demo,
  logout,
  children,
}: {
  user: any;
  pathname: string;
  demo: boolean;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false),
    [mobile, setMobile] = useState(
      () => matchMedia("(max-width:760px)").matches,
    );
  useEffect(() => {
    const media = matchMedia("(max-width:760px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const activeItem = document.querySelector<HTMLElement>(
      "#academic-navigation a.active, #academic-navigation a",
    );
    activeItem?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const items = [
          ...document.querySelectorAll<HTMLElement>(
            "#academic-navigation a, #academic-navigation button",
          ),
        ].filter((el) => el.offsetParent !== null);
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (e.key === "Escape") {
        setMenuOpen(false);
        setTimeout(
          () => document.getElementById("open-mobile-menu")?.focus(),
          0,
        );
      }
    };
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  useEffect(() => setMenuOpen(false), [pathname]);
  // Sidebar width preference is per-device, like the SSO console's.
  const [collapsed, setCollapsed] = useState(
    () => user.role !== 'RECTOR' && localStorage.getItem("uay-nav-collapsed") === "1",
  );
  useEffect(() => {
    localStorage.setItem("uay-nav-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (user.role === 'RECTOR') return;
    let active = true;
    const load = () =>
      api<{ count: number }>("/notifications/unread-count")
        .then((r) => {
          if (active) setUnread(r.count);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener("notifications-changed", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("notifications-changed", load);
    };
  }, []);
  const admin = ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role);
  const rector = user.role === 'RECTOR';
  const links = rector ? [
    ['/rector', LayoutDashboard, 'Pemantauan Akademik'],
    ['/profile', ShieldCheck, t.profile],
    ['/help', CircleHelp, t.help],
  ] : [
    ["/dashboard", LayoutDashboard, t.dashboard],
    ...(user.role === 'SUPER_ADMIN' ? [['/rector', ClipboardCheck, 'Pemantauan Akademik']] : []),
    ...(admin ? [["/catalog", LibraryBig, t.catalog]] : []),
    ["/classes", BookOpen, admin ? t.manageClasses : t.myClasses],
    ["/agenda", CalendarDays, admin ? t.academicAgenda : t.agenda],
    ["/grades", GraduationCap, admin ? t.gradeOverview : t.grades],
    ["/notifications", Bell, t.notifications],
    ["/profile", ShieldCheck, t.profile],
    ["/help", CircleHelp, t.help],
  ];
  const current = String(
    links.find(
      ([href]) => pathname === href || pathname.startsWith(`${href}/`),
    )?.[2] ??
      (pathname.startsWith("/quizzes")
        ? "Kuis"
        : pathname.startsWith("/assignments")
          ? "Tugas"
          : t.learningSpace),
  );
  return (
    <div
      className={`app-shell ${menuOpen ? "menu-open" : ""} ${
        collapsed ? "nav-collapsed" : ""
      }`}
    >
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      {menuOpen && (
        <button
          className="nav-scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Tutup navigasi"
        />
      )}
      <aside
        className="sidebar"
        id="academic-navigation"
        inert={mobile && !menuOpen}
      >
        <div className="sidebar-brand">
        <Brand home={rector ? '/rector' : '/dashboard'} collapsed={collapsed} />
        </div>
        {!collapsed && <p className="nav-caption">MENU</p>}
        <nav aria-label="Navigasi utama">
          {links.map(([href, Icon, label]: any) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const badge = href === "/notifications" ? unread : 0;
            return (
              <a
                key={href}
                href={href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size={22} />
                {!collapsed && <span className="nav-label">{label}</span>}
                {badge > 0 && (
                  <span className="nav-badge">
                    {badge > 99 ? "99+" : badge}
                    <span className="sr-only"> {t.unreadNotifications}</span>
                  </span>
                )}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-collapse-section">
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed((value) => !value)}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Perluas navigasi" : t.collapseNav}
            title={collapsed ? "Perluas navigasi" : undefined}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <>
                <PanelLeftClose size={16} />
                <span className="collapse-label">Ciutkan sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <div className="workspace" inert={mobile && menuOpen}>
        <header className="topbar">
          <div className="topbar-left">
            <IconButton
              id="open-mobile-menu"
              label="Buka menu"
              className="mobile-menu"
              aria-expanded={menuOpen}
              aria-controls="academic-navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </IconButton>
            {/* The SSO console shows the same mark once its rail is hidden. */}
            <a
              className="brand-mark topbar-mark"
              href={rector ? '/rector' : '/dashboard'}
              aria-label="UAY E-Learning beranda"
            >
              <picture>
                <source srcSet="/uay-logo.webp" type="image/webp" />
                <img
                  src="/uay-logo.png"
                  alt="Logo UAY"
                  className="brand-logo-img"
                  width="24"
                  height="24"
                  loading="eager"
                  decoding="async"
                />
              </picture>
            </a>
            <Breadcrumbs
              items={
                pathname === "/dashboard" || pathname === "/rector"
                  ? [{ label: pathname === "/rector" ? "Pemantauan Akademik" : "Beranda" }]
                  : [
                      { label: rector ? "Pemantauan Akademik" : "Beranda", href: rector ? '/rector' : '/dashboard' },
                      { label: current },
                    ]
              }
            />
          </div>
          <div className="topbar-right">
            {demo && (
              <span className="environment-badge">
                <span className="badge-dot" />
                {pathname.startsWith('/rector') ? 'Demo — data simulasi' : 'Mode Uji'}
              </span>
            )}
            <div className="user-nav-group">
              <UserChip user={user} role={(t.roles as any)[user.role]} />
              <span className="topbar-divider" aria-hidden="true" />
              <Action
                label="Keluar dari sesi"
                className="minimal-logout-btn"
                run={logout}
              >
                <LogOut size={15} />
                <span className="logout-text">Keluar</span>
              </Action>
            </div>
          </div>
        </header>
        <main id="main-content">
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<Loading />}>{children}</Suspense>
          </ErrorBoundary>
        </main>
        <footer>
          <span>© {new Date().getFullYear()} {t.university}</span>
          <a href="/help">{t.help}</a>
        </footer>
      </div>
    </div>
  );
}
function App() {
  const config = useApi("/auth/config"),
    identity = useApi("/me");
  const user = identity.data;
  const [route, setRoute] = useState(routeFromLocation);
  useNavigationGuard();
  useEffect(() => {
    const change = () => setRoute(location.pathname + location.search || "/");
    const expired = () => {
      identity.setData(null);
      navigate("/");
    };
    window.addEventListener("routechange", change);
    window.addEventListener("session-expired", expired);
    return () => {
      window.removeEventListener("routechange", change);
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    if(user.role === 'RECTOR' && route.split('?')[0] === '/dashboard') {
      navigate('/rector', true);
      return;
    }
    if(user.role === 'RECTOR' && route.split('?')[0] === '/help') {
      navigate('/rector?view=definitions', true);
      return;
    }
    const pending = sessionStorage.getItem("uay-return-path");
    if (pending) {
      sessionStorage.removeItem("uay-return-path");
      if (
        pending.startsWith("/") &&
        !pending.startsWith("//") &&
        !["/", "/login", "/dashboard"].includes(pending)
      ) {
        navigate(pending, true);
        return;
      }
    }
    if (["/", "/login"].includes(route)) navigate(user.role === 'RECTOR' ? '/rector' : '/dashboard', true);
  }, [user, route]);
  const logout = async () => {
    if (!(await confirmUnsaved())) return;
    const result = await api("/auth/logout", "POST", {}).catch(() => ({}));
    readCache.clear();
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
      identity.setData(null);
      navigate("/", true);
    }
  };
  if (identity.loading && !user)
    return (
      <PublicShell>
        <Loading />
      </PublicShell>
    );
  if (!user)
    return (
      <Landing
        config={config.data}
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
  const [, section, id, itemKind, itemSlug] = pathname.split("/");
  let page;
  if (section === 'rector' && ['RECTOR','SUPER_ADMIN'].includes(user.role))
    page = <RectorDashboard demo={!!config.data?.demoEnabled} />;
  else if (user.role === 'RECTOR' && !['profile','help'].includes(section))
    page = <Empty><h1>Pemantauan akademik</h1><p>Akun rektor dapat melihat laporan kegiatan dosen dan penyelesaian penilaian.</p><a className="button" href="/rector">Buka laporan akademik</a></Empty>;
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
  else if (section === "profile")
    page = <Profile user={user} accountUrl={config.data?.accountUrl} />;
  else if (section === "help")
    page = user.role === 'RECTOR' ? <Loading /> : <HelpPage user={user} />;
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
root.render(
  <>
    <ConfirmationHost />
    <App />
    <Analytics />
  </>,
);
