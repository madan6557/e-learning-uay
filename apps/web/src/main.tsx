import { ConfirmationHost } from "./confirm";
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
function Brand({ home = "#/" }: { home?: string }) {
  return (
    <a className="brand" href={home} aria-label="UAY E-Learning beranda">
      <span className="brand-mark">
        <GraduationCap size={27} />
      </span>
      <span>
        UAY <small>E-LEARNING</small>
      </span>
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
          <LoginButton className="secondary" label="Masuk dengan SSO UAY">
            Masuk dengan SSO UAY <ArrowRight size={16} />
          </LoginButton>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer>
        <span>© 2026 {t.university}</span>
        <span>Ruang belajar, tumbuh, dan berkolaborasi.</span>
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
        <div>
          <span className="eyebrow">UNIVERSITAS ACHMAD YANI BANJARMASIN</span>
          <h1>
            Belajar terarah.
            <br />
            Berkembang bersama.
          </h1>
          <p>
            Akses materi perkuliahan, kerjakan tugas, dan ikuti perkembangan
            belajar dalam satu ruang akademik.
          </p>
          <LoginButton className="button" label="Masuk dengan SSO UAY">
            Masuk dengan SSO UAY <ArrowRight size={18} />
          </LoginButton>
          <small className="landing-caption">
            <ShieldCheck size={16} /> Gunakan akun akademik UAY Anda.
          </small>
        </div>
        <div className="landing-illustration" aria-hidden="true">
          <div className="illustration-circle">
            <GraduationCap size={92} strokeWidth={1.3} />
          </div>
          <div className="illustration-card">
            <BookOpen />
            <span>
              Materi perkuliahan<small>Terstruktur dan mudah diakses</small>
            </span>
          </div>
          <div className="illustration-card">
            <ClipboardCheck />
            <span>
              Tugas & evaluasi<small>Perkembangan belajar yang jelas</small>
            </span>
          </div>
        </div>
      </section>
      <section className="landing-features" aria-label="Fitur pembelajaran">
        {[
          [
            BookOpen,
            "Ruang kelas digital",
            "Materi, diskusi, dan pengumuman tersusun per kelas.",
          ],
          [
            ClipboardCheck,
            "Pembelajaran terarah",
            "Jadwal, tugas, dan kuis membantu Anda tetap pada jalur.",
          ],
          [
            GraduationCap,
            "Perkembangan yang terlihat",
            "Pantau hasil belajar dan umpan balik dari pengajar.",
          ],
        ].map(([Icon, title, text]: any) => (
          <article key={title}>
            <Icon size={24} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      {config?.demoEnabled && (
        <section className="demo-section">
          <div className="section-heading">
            <div>
              <span className="environment-badge">LINGKUNGAN UJI</span>
              <h2>Mode uji cepat</h2>
              <p>Pilih akun untuk mencoba pengalaman setiap peran.</p>
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
                  <Avatar name={u.fullName} />
                  <div>
                    <strong>{u.fullName}</strong>
                    <small>
                      {(t.roles as any)[u.role]} · {u.studentStaffNumber}
                    </small>
                  </div>
                  <LoginButton
                    className="secondary"
                    label={`Masuk sebagai ${u.fullName}`}
                    demoUserId={u.id}
                  >
                    Gunakan akun <ArrowRight size={15} />
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
    <div className={`app-shell ${menuOpen ? "menu-open" : ""}`}>
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
        <p className="nav-caption">RUANG AKADEMIK</p>
        <nav aria-label="Navigasi utama">
          {links.map(([href, Icon, label]: any) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <a
                key={href}
                href={`#${href}`}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={19} />
                {label}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={18} />
          <span>
            Akun akademik UAY
            <small className="block">Terhubung melalui SSO</small>
          </span>
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
            <Breadcrumbs
              items={[
                { label: "Beranda", href: "#/dashboard" },
                { label: current },
              ]}
            />
          </div>
          <div className="topbar-right">
            {demo && <span className="environment-badge">Mode uji</span>}
            <UserChip user={user} role={(t.roles as any)[user.role]} />
            <Action
              label="Keluar"
              className="text-button logout-button"
              run={logout}
            >
              <LogOut size={17} />
              <span>Keluar</span>
            </Action>
          </div>
        </header>
        <main id="main-content">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </main>
        <footer>
          <span>© 2026 {t.university}</span>
          <a href="#/help">Bantuan pembelajaran</a>
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
          <p>Panduan singkat untuk ruang pembelajaran Anda.</p>
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
