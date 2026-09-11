import { createRoot } from "react-dom/client";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  GraduationCap,
  Bell,
  ChevronRight,
  CalendarDays,
  CircleHelp,
  LogOut,
  ArrowUpRight,
  LibraryBig,
} from "lucide-react";
import { t, api, useApi, Loading, Notice, navigate, Action } from "./lib";
import { Dashboard, Catalog, Profile } from "./pages";
const ClassPage = lazy(() =>
  import("./ClassPage").then((module) => ({ default: module.ClassPage })),
);
const QuizPage = lazy(() =>
  import("./Assessment").then((module) => ({ default: module.QuizPage })),
);
const AssignmentPage = lazy(() =>
  import("./Assessment").then((module) => ({ default: module.AssignmentPage })),
);
import "./styles.css";
import "./workspace.css";

function App() {
  const config = useApi("/auth/config"),
    identity = useApi("/me");
  const user = identity.data;
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  useEffect(() => {
    const change = () => setRoute(location.hash.slice(1) || "/");
    const expired = () => {
      identity.setData(null);
      change();
    };
    window.addEventListener("hashchange", change);
    window.addEventListener("session-expired", expired);
    return () => {
      window.removeEventListener("hashchange", change);
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  const [pathname, query = ""] = route.split("?");
  const params = new URLSearchParams(query);
  const [, section, id] = pathname.split("/");
  const links = [
    ["/", LayoutDashboard, t.dashboard],
    ["/classes", BookOpen, t.myClasses],
    ["/agenda", CalendarDays, t.agenda],
    ["/grades", GraduationCap, t.grades],
    ["/notifications", Bell, t.notifications],
    ...(user && ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role)
      ? [["/catalog", LibraryBig, t.catalog]]
      : []),
  ] as const;
  const current = String(
    links.find(([href]) => pathname === href)?.[2] ?? t.learningSpace,
  );
  let page;
  if (identity.loading) page = <Loading />;
  else if (!user)
    page = (
      <Login
        mode={config.data?.mode}
        onLogin={() => {
          identity.reload();
          navigate("/");
        }}
        error={
          identity.error &&
          identity.error.message !== t.errors.LOGIN_REQUIRED &&
          identity.error.message !== t.errors.SESSION_EXPIRED
            ? identity.error
            : null
        }
      />
    );
  else if (section === "classes" && id)
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
        </div>
        <div className="card">
          <p>{t.supportText}</p>
          <p>{t.timeZone}</p>
        </div>
      </>
    );
  else
    page = (
      <Dashboard key={pathname} page={section || "dashboard"} user={user} />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t.content}
      </a>
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="brand-mark">
            <GraduationCap size={28} />
          </span>
          <span>
            UAY <small>E-LEARNING</small>
          </span>
        </a>
        <p className="nav-caption">{t.academicSpace.toUpperCase()}</p>
        <nav aria-label={t.menu}>
          {links.map(([href, Icon, label]: any) => (
            <a
              key={href}
              className={
                pathname === href ||
                (href === "/classes" && id && section === "classes")
                  ? "active"
                  : ""
              }
              href={`#${href}`}
            >
              <Icon size={19} />
              {label}
            </a>
          ))}
        </nav>
        <a href="#/help" className="sidebar-bottom">
          <CircleHelp size={18} />
          <span>
            {t.help}
            <br />
            <small>{t.university}</small>
          </span>
        </a>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            {t.learningSpace}
            <ChevronRight size={14} />
            {current}
          </span>
          <div className="topbar-right">
            <span className="term">{t.semester}</span>
            {user && (
              <a href="#/profile" className="user-chip">
                <span className="avatar">
                  {user.fullName
                    .split(" ")
                    .slice(0, 2)
                    .map((s: string) => s[0])
                    .join("")}
                </span>
                <span>
                  {user.fullName.split(",")[0]}
                  <small>{(t.roles as any)[user.role]}</small>
                </span>
              </a>
            )}
          </div>
        </header>
        {config.data?.mode === "development" && (
          <div className="environment-tag">{t.development}</div>
        )}
        <main id="main-content">
          <Suspense fallback={<Loading />}>{page}</Suspense>
        </main>
        <footer>
          © 2026 {t.university}
          <span>{t.timeZone}</span>
          {user && (
            <Action
              className="text-button"
              run={async () => {
                const result = await api("/auth/logout", "POST", {});
                identity.setData(null);
                if (
                  result.logoutUrl &&
                  new URL(result.logoutUrl).origin !== location.origin
                )
                  location.assign(result.logoutUrl);
                else navigate("/");
              }}
            >
              <LogOut size={15} />
              {t.logout}
            </Action>
          )}
        </footer>
      </div>
    </div>
  );
}
function Login({
  mode,
  onLogin,
  error,
}: {
  mode?: string;
  onLogin: () => void;
  error: Error | null;
}) {
  const users = useApi<any[]>(
    mode === "development" ? "/auth/development-users" : null,
  );
  return (
    <>
      <div className="page-heading">
        <div className="eyebrow">{t.eyebrow}</div>
        <h1>{t.welcomeTitle}</h1>
        <p>{t.welcomeDescription}</p>
      </div>
      {error && <Notice error={error} />}
      <section className="welcome-panel">
        <div>
          <span className="pill">{t.semester}</span>
          <h2>{t.welcomePanel}</h2>
          <p>{t.welcomeCopy}</p>
          {mode !== "development" && (
            <a className="button light" href="/api/v1/auth/login">
              {t.loginSso}
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
        <div className="welcome-emblem">
          <GraduationCap size={100} strokeWidth={1} />
          <span>{t.university}</span>
        </div>
      </section>
      {mode === "development" && (
        <>
          <div className="section-heading">
            <div>
              <h2>{t.selectAccount}</h2>
              <p>{t.demoDescription}</p>
            </div>
          </div>
          <div className="login-grid">
            {users.data?.map((u) => (
              <article key={u.id} className="card login-card">
                <span className="avatar">{u.fullName[0]}</span>
                <h3>{u.fullName}</h3>
                <p>{(t.roles as any)[u.role]}</p>
                <small>{u.studentStaffNumber}</small>
                <Action
                  className="primary"
                  run={async () => {
                    await api("/auth/development-login", "POST", {
                      userId: u.id,
                    });
                    onLogin();
                  }}
                >
                  {t.login}
                  <ArrowUpRight size={16} />
                </Action>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
