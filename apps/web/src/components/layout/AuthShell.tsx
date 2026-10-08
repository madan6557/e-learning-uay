import { useState, useEffect, useRef, Suspense, type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Bell,
  CalendarDays,
  CircleHelp,
  LogOut,
  LibraryBig,
  Menu,
  ShieldCheck,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Megaphone,
} from "lucide-react";
import { Action, Loading } from "../ui";
import { Breadcrumbs, IconButton, UserChip } from "../../ui";
import { Brand } from "./Brand";
import { ErrorBoundary } from "../../ErrorBoundary";
import { api } from "../../services/api";
import labels from "../../../../../packages/shared/src/id.json";

const t = labels;

export interface AuthShellProps {
  user: any;
  pathname: string;
  demo: boolean;
  logout: () => Promise<void>;
  children: ReactNode;
}

export function AuthShell({
  user,
  pathname,
  demo,
  logout,
  children,
}: AuthShellProps) {
  const drawerQuery = "(max-width:1024px)";
  const menuTrigger = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false),
    [mobile, setMobile] = useState(() => matchMedia(drawerQuery).matches);
  useEffect(() => {
    const media = matchMedia(drawerQuery);
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setMenuOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [drawerQuery]);
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
          () =>
            (
              menuTrigger.current ?? document.getElementById("open-mobile-menu")
            )?.focus(),
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
    () =>
      user.role !== "RECTOR" &&
      localStorage.getItem("uay-nav-collapsed") === "1",
  );
  useEffect(() => {
    localStorage.setItem("uay-nav-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  const displayCollapsed = collapsed && !mobile;
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (user.role === "RECTOR") return;
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
  const rector = user.role === "RECTOR";
  const links = rector
    ? [
        ["/rector", LayoutDashboard, "Pemantauan Akademik"],
        ["/announcements", Megaphone, "Pengumuman"],
        ["/profile", ShieldCheck, t.profile],
        ["/help", CircleHelp, t.help],
      ]
    : [
        ["/dashboard", LayoutDashboard, t.dashboard],
        ...(user.role === "SUPER_ADMIN"
          ? [["/rector", ClipboardCheck, "Pemantauan Akademik"]]
          : []),
        ...(admin ? [["/catalog", LibraryBig, t.catalog]] : []),
        ["/classes", BookOpen, admin ? t.manageClasses : t.myClasses],
        ["/agenda", CalendarDays, admin ? t.academicAgenda : t.agenda],
        ["/grades", GraduationCap, admin ? t.gradeOverview : t.grades],
        ["/announcements", Megaphone, "Pengumuman"],
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
  const phoneLinks = rector
    ? [
        ["/rector", LayoutDashboard, "Ringkasan"],
        ["/announcements", Megaphone, "Info"],
        ["/profile", ShieldCheck, "Profil"],
        ["/help", CircleHelp, "Panduan"],
      ]
    : [
        ["/dashboard", LayoutDashboard, "Beranda"],
        ["/classes", BookOpen, "Kelas"],
        admin
          ? ["/catalog", LibraryBig, "Katalog"]
          : ["/agenda", CalendarDays, "Agenda"],
        ["/notifications", Bell, "Notifikasi"],
      ];
  return (
    <div
      className={`app-shell ${pathname.startsWith("/rector") ? "rector-workspace" : ""} ${menuOpen ? "menu-open" : ""} ${
        displayCollapsed ? "nav-collapsed" : ""
      }`}
    >
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      {menuOpen && (
        <button
          className="nav-scrim"
          onClick={() => {
            setMenuOpen(false);
            menuTrigger.current?.focus();
          }}
          aria-label="Tutup navigasi"
        />
      )}
      <aside
        className="sidebar"
        id="academic-navigation"
        inert={mobile && !menuOpen}
      >
        <div className="sidebar-brand">
          <Brand
            home={rector ? "/rector" : "/dashboard"}
            collapsed={displayCollapsed}
          />
        </div>
        {!displayCollapsed && <p className="nav-caption">MENU</p>}
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
                title={displayCollapsed ? label : undefined}
              >
                <Icon size={22} />
                {!displayCollapsed && (
                  <span className="nav-label">{label}</span>
                )}
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
              onClick={(event) => {
                menuTrigger.current = event.currentTarget;
                setMenuOpen(true);
              }}
            >
              <Menu size={22} />
            </IconButton>
            <a
              className="phone-brand"
              href={rector ? "/rector" : "/dashboard"}
              aria-label="Beranda E-Learning UAY"
            >
              <img src="/uay-logo.webp" alt="" width="28" height="28" />
              <span>
                E-Learning <strong>UAY</strong>
              </span>
            </a>
            {/* The SSO console shows the same mark once its rail is hidden. */}
            <a
              className="brand-mark topbar-mark"
              href={rector ? "/rector" : "/dashboard"}
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
                  ? [
                      {
                        label:
                          pathname === "/rector"
                            ? "Pemantauan Akademik"
                            : "Beranda",
                      },
                    ]
                  : [
                      {
                        label: rector ? "Pemantauan Akademik" : "Beranda",
                        href: rector ? "/rector" : "/dashboard",
                      },
                      { label: current },
                    ]
              }
            />
          </div>
          <div className="topbar-right">
            {demo && (
              <span className="environment-badge">
                <span className="badge-dot" />
                {pathname.startsWith("/rector")
                  ? "Demo — data simulasi"
                  : "Mode Uji"}
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
        {demo && (
          <div className="phone-environment" role="status">
            Mode uji · Data simulasi
          </div>
        )}
        <main id="main-content">
          <ErrorBoundary key={pathname}>
            <Suspense fallback={<Loading />}>{children}</Suspense>
          </ErrorBoundary>
        </main>
        <footer>
          <span>
            © {new Date().getFullYear()} {t.university}
          </span>
          <a href="/help">{t.help}</a>
        </footer>
      </div>
      <nav
        className="phone-navigation"
        aria-label="Navigasi ponsel"
        inert={mobile && menuOpen}
      >
        {phoneLinks.map(([href, Icon, label]: any) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const badge = href === "/notifications" ? unread : 0;
          return (
            <a
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
            >
              <span className="phone-nav-icon">
                <Icon size={21} />
                {badge > 0 && (
                  <span className="phone-nav-badge">
                    {badge > 99 ? "99+" : badge}
                    <span className="sr-only"> notifikasi belum dibaca</span>
                  </span>
                )}
              </span>
              <span>{label}</span>
            </a>
          );
        })}
        <button
          type="button"
          aria-label="Menu lainnya"
          aria-expanded={menuOpen}
          aria-controls="academic-navigation"
          onClick={(event) => {
            menuTrigger.current = event.currentTarget;
            setMenuOpen(true);
          }}
        >
          <Menu size={21} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
