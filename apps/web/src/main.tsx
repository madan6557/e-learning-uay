import { ConfirmationHost } from "./confirm";
import { ErrorBoundary } from "./ErrorBoundary";
import { createRoot } from "react-dom/client";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
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
  X,
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
import { Dashboard, Catalog, Profile } from "./pages";
import { Avatar, Breadcrumbs, IconButton, UserChip } from "./ui";
import {
  DraftUserContext,
  confirmUnsaved,
  useNavigationGuard,
} from "./useLocalDraft";
const ClassPage = lazy(() =>
  import("./ClassPage").then((m) => ({ default: m.ClassPage })),
);
const QuizPage = lazy(() =>
  import("./Assessment").then((m) => ({ default: m.QuizPage })),
);
const AssignmentPage = lazy(() =>
  import("./Assessment").then((m) => ({ default: m.AssignmentPage })),
);
import "./styles.css";
import "./workspace.css";
import "./experience.css";
// The square mark and product-name lockup is shared with the UAY SSO console
// so the two applications read as one environment.
function Brand({ home = "#/" }: { home?: string }) {
  return (
    <a className="brand" href={home} aria-label="UAY E-Learning beranda">
      <span className="brand-mark" aria-hidden="true">
        UAY
      </span>
      <span className="brand-name">E-Learning UAY</span>
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
        const { authorizationUrl } = await api<{ authorizationUrl: string }>(
          "/auth/authorization",
          "POST",
          demoUserId ? { demoUserId } : {},
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
        <span>© 2026 {t.university}</span>
        <span>{t.timeZone}</span>
      </footer>
    </div>
  );
}
function Landing({ config, error }: { config: any; error?: Error | null }) {
  const users = useApi<any[]>(
    config?.demoEnabled ? "/auth/development-users" : null,
  );
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
            <LoginButton className="button hero-cta" label="Masuk dengan SSO UAY">
              <span>Masuk dengan SSO UAY</span>
              <ArrowRight size={18} />
            </LoginButton>
          </div>
          <div className="landing-caption">
            <ShieldCheck size={16} />
            <span>Gunakan akun akademik UAY Anda.</span>
          </div>
        </div>
        <div className="landing-preview" aria-hidden="true">
          <div className="preview-body">
            <div className="preview-portal-card">
              <div className="portal-badge-row">
                <span className="portal-badge">SEMESTER GANJIL 2026/2027</span>
              </div>
              <h4>Semester berjalan</h4>
              <p>
                Kelas dibuka oleh program studi. Materi dan tugas muncul setelah
                dosen menerbitkannya.
              </p>
            </div>
            <div className="portal-capabilities">
              <div className="capability-row">
                <span className="capability-icon">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <strong>Masuk dengan akun SSO</strong>
                  <small>Tidak ada kata sandi terpisah untuk E-Learning</small>
                </div>
              </div>
              <div className="capability-row">
                <span className="capability-icon">
                  <BookOpen size={16} />
                </span>
                <div>
                  <strong>Materi dan praktikum</strong>
                  <small>Teks, slide PDF, video, dan berkas dataset</small>
                </div>
              </div>
              <div className="capability-row">
                <span className="capability-icon">
                  <ClipboardCheck size={16} />
                </span>
                <div>
                  <strong>Tugas dan kuis</strong>
                  <small>Pengumpulan berversi dan delapan tipe soal</small>
                </div>
              </div>
            </div>
            <div className="portal-roles-footer">
              <span>Peran:</span>
              <div className="role-tags">
                <span>Mahasiswa</span>
                <span>Dosen</span>
                <span>Admin prodi</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="landing-features" aria-label="Fitur pembelajaran">
        {[
          [
            BookOpen,
            "Kelas",
            "Pertemuan, materi, dan pengumuman dari dosen pengampu.",
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
      {config?.demoEnabled && (
        <section className="demo-section">
          <div className="section-heading">
            <div>
              <span className="environment-badge">
                <span className="badge-dot" />
                LINGKUNGAN UJI
              </span>
              <h2>Akun demonstrasi</h2>
              <p>Masuk sebagai salah satu peran. Semua data di sini contoh.</p>
            </div>
          </div>
          {users.loading ? (
            <Loading />
          ) : users.error ? (
            <Notice error={users.error} />
          ) : (
            <div className="demo-grid">
              {users.data?.map((u) => (
                <article className="demo-card" key={u.id}>
                  <Avatar name={u.name} />
                  <div>
                    <strong>{u.name}</strong>
                    <small>
                      {(t.roles as any)[u.role]} · {u.identifierValue}
                    </small>
                  </div>
                  <LoginButton
                    className="demo-login-btn"
                    label={`Masuk sebagai ${u.name}`}
                    demoUserId={u.id}
                  >
                    <span>Gunakan</span>
                    <ArrowRight size={14} />
                  </LoginButton>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
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
    const update = () => { setMobile(media.matches); if (!media.matches) setMenuOpen(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    document.getElementById("close-mobile-menu")?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const items = [...document.querySelectorAll<HTMLElement>("#academic-navigation a, #academic-navigation button")].filter(el => el.offsetParent !== null);
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
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
    () => localStorage.getItem("uay-nav-collapsed") === "1",
  );
  useEffect(() => {
    localStorage.setItem("uay-nav-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
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
  }, [pathname]);
  const links = [
    ["/dashboard", LayoutDashboard, t.dashboard],
    ["/classes", BookOpen, t.myClasses],
    ["/agenda", CalendarDays, t.agenda],
    ["/grades", GraduationCap, t.grades],
    ["/notifications", Bell, t.notifications],
    ...(["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role)
      ? [["/catalog", LibraryBig, t.catalog]]
      : []),
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
          <Brand home="#/dashboard" />
          <IconButton
            id="close-mobile-menu"
            label="Tutup menu"
            className="mobile-menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </IconButton>
        </div>
        <p className="nav-caption">MENU</p>
        <nav aria-label="Navigasi utama">
          {links.map(([href, Icon, label]: any) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const badge = href === "/notifications" ? unread : 0;
            return (
              <a
                key={href}
                href={`#${href}`}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size={19} />
                <span className="nav-label">{label}</span>
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
        <div className="sidebar-bottom">
          <ShieldCheck size={18} />
          <span>
            Akun SSO UAY
            <small className="block">Identitas dikelola oleh SSO</small>
          </span>
        </div>
        <button
          type="button"
          className="nav-collapse-toggle"
          onClick={() => setCollapsed((value) => !value)}
          aria-pressed={collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
          <span className="nav-label">{t.collapseNav}</span>
        </button>
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
              href="#/dashboard"
              aria-label="UAY E-Learning beranda"
            >
              UAY
            </a>
            <Breadcrumbs
              items={
                pathname === "/dashboard"
                  ? [{ label: "Beranda" }]
                  : [
                      { label: "Beranda", href: "#/dashboard" },
                      { label: current },
                    ]
              }
            />
          </div>
          <div className="topbar-right">
            {demo && (
              <span className="environment-badge">
                <span className="badge-dot" />
                Mode Uji
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
          <span>© 2026 {t.university}</span>
          <a href="#/help">{t.help}</a>
        </footer>
      </div>
    </div>
  );
}
function App() {
  const config = useApi("/auth/config"),
    identity = useApi("/me");
  const user = identity.data;
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  useNavigationGuard();
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(1) || "/");
    const expired = () => {
      identity.setData(null);
      navigate("/");
    };
    window.addEventListener("hashchange", change);
    window.addEventListener("session-expired", expired);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (user && ["/", "/login"].includes(route)) navigate("/dashboard");
  }, [user, route]);
  const logout = async () => {
    if (!(await confirmUnsaved())) return;
    const result = await api("/auth/logout", "POST", {});
    identity.setData(null);
    if (
      result.logoutUrl &&
      new URL(result.logoutUrl).origin !== location.origin
    )
      location.assign(result.logoutUrl);
    else navigate("/");
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
  const [pathname, query = ""] = route.split("?");
  const params = new URLSearchParams(query);
  const [, section, id] = pathname.split("/");
  let page;
  if (section === "classes" && id)
    page = (
      <ClassPage
        key={id}
        id={id}
        tab={params.get("tab") ?? "content"}
        user={user}
        resourceId={params.get("resource")}
      />
    );
  else if (section === "quizzes" && id)
    page = <QuizPage key={id} id={id} user={user} />;
  else if (section === "assignments" && id)
    page = <AssignmentPage key={id} id={id} user={user} />;
  else if (section === "catalog") page = <Catalog user={user} />;
  else if (section === "profile")
    page = <Profile user={user} issuer={config.data?.issuer} />;
  else if (section === "help")
    page = (
      <>
        <div className="page-heading">
          <h1>{t.help}</h1>
          <p>Hal yang paling sering ditanyakan.</p>
        </div>
        <div className="help-grid">
          {[
            [
              "Akun & akses",
              "Data akun mengikuti SSO UAY. Buka Profil untuk melihat identitas dan mengakses pengelolaan akun.",
            ],
            [
              "Kelas & pembelajaran",
              "Buka menu Kelas untuk melihat materi, tugas, kuis, dan pengumuman dari pengajar.",
            ],
            [
              "Draft & penyimpanan",
              "Perubahan editor tersimpan otomatis di perangkat. Gunakan Simpan semua perubahan untuk mengirimnya ke server.",
            ],
            ["Jadwal & bantuan", t.supportText + " " + t.timeZone],
          ].map(([title, text]) => (
            <article className="card" key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </>
    );
  else if (
    ["", "dashboard", "classes", "agenda", "grades", "notifications"].includes(
      section,
    )
  )
    page = (
      <Dashboard key={pathname} page={section || "dashboard"} user={user} />
    );
  else
    page = (
      <Empty>
        <h1>Halaman tidak ditemukan</h1>
        <p>Gunakan navigasi untuk membuka ruang pembelajaran.</p>
        <a className="button" href="#/dashboard">
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
  </>,
);
