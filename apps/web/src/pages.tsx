import {
  GRADE_SCALE_PRESETS,
  gradeScaleLabel,
  getAllGradeScalePolicies,
  type GradeScalePolicy,
  type GradeBand,
} from "../../../packages/shared/src/domain";
import { confirmAction } from "./confirm";
import { ThemePreferenceControl } from "./components/layout/ThemeToggle";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Users,
  ClipboardCheck,
  Search,
  Plus,
  ChevronRight,
  Bell,
  Database,
  FileText,
  CheckCheck,
  Sliders,
  Scale,
  GraduationCap,
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle,
  Check,
  Camera,
  Clock,
  ExternalLink,
  Megaphone,
  ArrowRight,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  History,
} from "lucide-react";

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return "Selamat Pagi";
  if (hour >= 11 && hour < 15) return "Selamat Siang";
  if (hour >= 15 && hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}
import {
  t,
  api,
  useApi,
  Loading,
  Notice,
  Empty,
  Badge,
  Field,
  Modal,
  Form,
  Action,
  date,
  textValue,
  numberValue,
} from "./lib";
import { countDrafts, removeDraft } from "./drafts";
import { Avatar, Tabs } from "./ui";
import { classPath, contentPath } from "./router";
import { parseCsv } from "./csv";
export interface ClassCardData {
  id: string;
  slug?: string;
  name: string;
  academicYear: string;
  status: string;
  isInactiveParticipant?: boolean;
  course: { code: string; title: string; credits: number };
  enrollments?: { isActive: boolean }[];
  instructors: { user?: { name: string } | null }[];
  _count: { enrollments: number; sections: number };
}
type UserSearchResult = {
  id: string;
  name: string;
  identifierValue: string | null;
  role:
    | "SUPER_ADMIN"
    | "DEPARTMENT_ADMIN"
    | "RECTOR"
    | "INSTRUCTOR"
    | "ASSISTANT"
    | "STUDENT";
};
type CourseOption = {
  id: string;
  code: string;
  title: string;
  status: string;
  departmentCode?: string;
};
export interface AcademicPolicySettings {
  academicYear: string;
  academicYears: string[];
  semesterLabel: string;
  defaultGradeScaleVersion: string;
  minAttendancePercentage: number;
  customGradeScales?: Record<string, GradeScalePolicy>;
}
export function ClassCard({
  item,
  index = 0,
}: {
  item: ClassCardData;
  index?: number;
}) {
  const isInactive =
    Boolean(item.isInactiveParticipant) ||
    item.enrollments?.[0]?.isActive === false;
  const isArchived = item.status === "ARCHIVED";
  return (
    <a
      className={`course-card course-tone-${index % 3} ${isInactive ? "inactive-participant" : ""} ${isArchived ? "archived-class" : ""}`}
      href={classPath(item)}
    >
      <div className="course-top">
        <span className="course-icon">
          <BookOpen size={27} aria-hidden="true" />
        </span>
        <span className="course-code">{item.course.code}</span>
        <ArrowUpRight size={18} />
      </div>
      <div className="course-body">
        <div className="course-meta">
          <span>
            {item.course.credits} {t.credits}
          </span>
          {isInactive ? (
            <span className="badge danger">{t.participationDisabled}</span>
          ) : isArchived ? (
            <span className="badge muted">{t.archived}</span>
          ) : (
            <Badge value={item.status} />
          )}
        </div>
        <h3>{item.name}</h3>
        <p>
          {item.course.title} · {item.academicYear}
        </p>
        <div className="instructor-line">
          <span className="mini-avatar">
            {item.instructors[0]?.user?.name?.[0] ?? "U"}
          </span>
          {item.instructors
            .map((i) => i.user?.name?.split(",")[0] ?? "—")
            .join(", ")}
        </div>
        <div className="course-footer">
          <span>
            <Users size={14} />
            {item._count.enrollments} {t.participants.toLowerCase()}
          </span>
          <span>
            <BookOpen size={14} />
            {item._count.sections} {t.meetings.toLowerCase()}
          </span>
        </div>
      </div>
    </a>
  );
}
export function Dashboard({
  page,
  user,
  config,
  onConfigChange,
}: {
  page: string;
  user: any;
  config?: any;
  onConfigChange?: () => void;
}) {
  const admin = ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role);
  const needsSummary = (page === "dashboard" && !admin) || page === "agenda";
  const classes = useApi<any[]>(
    page === "notifications"
      ? null
      : `/course-classes${needsSummary ? "?summary=true" : ""}`,
  );
  const notifications = useApi<any[]>(
    page === "notifications" ? "/notifications" : null,
  );
  const courses = useApi<any[]>(
    admin && page === "dashboard" ? "/courses" : null,
  );
  const systemAnnouncements = useApi<any[]>(
    page === "dashboard" ? "/system-announcements" : null,
  );
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [departmentFilter, setDepartmentFilter] = useState(""),
    [modal, setModal] = useState(false);
  const teacher = user.role === "INSTRUCTOR" || user.role === "ASSISTANT";
  if (classes.loading && !classes.data) return <Loading />;
  const canCreateClass = ["DEPARTMENT_ADMIN", "INSTRUCTOR"].includes(user.role);
  const departments = [
    ...new Set(
      [
        ...Object.keys(DEPARTMENT_NAMES),
        ...(classes.data ?? []).map((c) => c.course.departmentCode as string),
      ].filter(Boolean),
    ),
  ].sort();
  const scopedClasses = (classes.data ?? []).filter(
    (c) =>
      user.role !== "SUPER_ADMIN" ||
      !departmentFilter ||
      c.course.departmentCode === departmentFilter,
  );
  const details = needsSummary ? scopedClasses : [];
  const items = scopedClasses.filter(
    (c) =>
      (filter === "ALL" || c.status === filter) &&
      `${c.course.title} ${c.course.code} ${c.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  if (admin && page === "dashboard")
    return (
      <AdminOverview
        user={user}
        classes={scopedClasses}
        courses={courses}
        reload={classes.reload}
        config={config}
        onConfigChange={onConfigChange}
        departmentFilter={departmentFilter}
        onDepartmentFilter={setDepartmentFilter}
        departments={departments}
      />
    );
  const activities = details
    .filter((c) => c.status === "PUBLISHED")
    .flatMap((c) =>
      c.sections.flatMap((s: any) => [
        ...s.assignments.map((a: any) => ({
          ...a,
          kind: "assignment",
          classTitle: c.course.title,
          classId: c.id,
          classInfo: c,
          siblings: s.assignments,
          date: a.deadline,
        })),
        ...s.quizzes
          .filter((q: any) => q.status === "PUBLISHED")
          .map((q: any) => ({
            ...q,
            kind: "quiz",
            classTitle: c.course.title,
            classId: c.id,
            classInfo: c,
            siblings: s.quizzes,
            date: q.availableUntil,
          })),
      ]),
    )
    .sort(
      (a: any, b: any) =>
        (a.date ? Date.parse(a.date) : Infinity) -
        (b.date ? Date.parse(b.date) : Infinity),
    );
  const gradingQueue = details.flatMap((c) =>
    (c.gradingQueue ?? []).map((item: any) => {
      const kind = item.kind === "quiz" ? "quizzes" : "assignments";
      const section = c.sections.find((s: any) =>
        s[kind].some((content: any) => content.id === item.id),
      );
      const siblings = section?.[kind] ?? [];
      const content = siblings.find(
        (candidate: any) => candidate.id === item.id,
      );
      return {
        ...item,
        title: content?.title,
        classTitle: c.course.title,
        classInfo: c,
        siblings,
      };
    }),
  );
  const materialProgress = details.flatMap((c) =>
    c.sections.flatMap((s: any) =>
      s.resources.map((r: any) => {
        if (r.resourceType === "VIDEO_MEDIA")
          return (
            c.progress.video.find((p: any) => p.resourceItemId === r.id)
              ?.percent ?? 0
          );
        if (r.resourceType === "DOCUMENT")
          return (
            c.progress.slides.find((p: any) => p.resourceItemId === r.id)
              ?.percent ?? 0
          );
        return [...c.progress.text, ...c.progress.downloads].some(
          (p: any) => p.resourceItemId === r.id,
        )
          ? 100
          : 0;
      }),
    ),
  );
  if (page === "notifications")
    return (
      <>
        <div className="page-heading heading-with-action">
          <div>
            <div className="eyebrow">{t.eyebrow}</div>
            <h1>{t.notifications}</h1>
          </div>
          {notifications.data?.some((n) => !n.isRead) && (
            <Action
              label={t.markAllRead}
              run={async () => {
                await api("/notifications/read-all", "POST", {});
                window.dispatchEvent(new Event("notifications-changed"));
                notifications.reload();
              }}
            >
              <CheckCheck size={16} />
              {t.markAllRead}
            </Action>
          )}
        </div>
        {notifications.loading && !notifications.data ? (
          <Loading />
        ) : notifications.error ? (
          <Notice error={notifications.error} />
        ) : notifications.data?.length ? (
          <div className="card notification-list">
            {notifications.data.map((n) => (
              <article key={n.id} className={n.isRead ? "" : "unread"}>
                <span className="activity-icon">
                  <Bell size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={n.linkUrl ?? "/"}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                    }}
                    onClick={() => {
                      if (!n.isRead) {
                        api(`/notifications/${n.id}/read`, "POST", {})
                          .then(() => {
                            window.dispatchEvent(
                              new Event("notifications-changed"),
                            );
                          })
                          .catch(() => {});
                      }
                    }}
                  >
                    <h3 style={{ margin: 0 }}>{n.title}</h3>
                    {n.message && n.message !== n.title && (
                      <p style={{ margin: "4px 0 6px", color: "var(--muted)" }}>
                        {n.message}
                      </p>
                    )}
                    <small>{date(n.createdAt)}</small>
                  </a>
                </div>
                {!n.isRead ? (
                  <Action
                    run={async () => {
                      await api(`/notifications/${n.id}/read`, "POST", {});
                      window.dispatchEvent(new Event("notifications-changed"));
                      notifications.reload();
                    }}
                  >
                    <Check size={14} style={{ marginRight: 4 }} />
                    {t.markRead}
                  </Action>
                ) : (
                  <span
                    className="read-status-badge"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--success, #16a34a)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      background:
                        "var(--adaptive-success-soft, rgba(22, 163, 74, 0.08))",
                      padding: "4px 10px",
                      borderRadius: 16,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <CheckCircle size={14} />
                    Sudah dibaca
                  </span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty>{t.noNotifications}</Empty>
        )}
      </>
    );
  if (page === "grades")
    return (
      <>
        <div className="page-heading">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{admin ? t.gradeOverview : t.grades}</h1>
        </div>
        {user.role === "SUPER_ADMIN" && departments.length > 0 && (
          <div className="toolbar" style={{ marginBottom: 16 }}>
            <label className="department-filter">
              Program studi
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">Semua prodi</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {formatDepartmentScope(department)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="cards">
          {items.map((c) => (
            <a key={c.id} href={`${classPath(c)}/gradebook`} className="card">
              <span className="eyebrow">{c.course.code}</span>
              <h3>{c.name}</h3>
              <p>{c.course.title}</p>
              <span className="text-link">
                {t.gradebook}
                <ChevronRight size={16} />
              </span>
            </a>
          ))}
        </div>
        {!items.length && <Empty>{t.emptyClasses}</Empty>}
      </>
    );
  return (
    <>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow-row">
            <span className="eyebrow">{t.eyebrow}</span>
            <span className="user-role-badge">
              {(t.roles as Record<string, string>)[user.role] ?? user.role}
            </span>
          </div>
          <h1>
            {page === "dashboard"
              ? `${getTimeGreeting()}, ${user.name.split(" ")[teacher ? 1 : 0] ?? user.name}.`
              : page === "agenda"
                ? admin
                  ? t.academicAgenda
                  : t.agenda
                : admin
                  ? t.manageClasses
                  : t.myClasses}
          </h1>
        </div>
        {page === "classes" && (canCreateClass || user.role === "STUDENT") && (
          <button className="secondary" onClick={() => setModal(true)}>
            <Plus size={16} />
            {canCreateClass ? t.newClass : t.joinClass}
          </button>
        )}
      </div>
      {page === "dashboard" && (
        <>
          <section className="welcome-panel compact">
            <div>
              <span className="pill">{config?.academicYear || t.semester}</span>
              <h2>{teacher ? t.manageLearning : t.continueLearning}</h2>
              {(() => {
                const activeOpenClass = items.find(
                  (c) =>
                    c.status === "PUBLISHED" &&
                    !c.isInactiveParticipant &&
                    !(c.enrollments?.length > 0 && !c.enrollments[0].isActive),
                );
                return activeOpenClass ? (
                  <a className="button light" href={classPath(activeOpenClass)}>
                    <span>
                      {t.openClass} · {activeOpenClass.course.code}
                    </span>
                    <ArrowUpRight size={18} />
                  </a>
                ) : null;
              })()}
            </div>
            <div className="welcome-emblem">
              <BookOpen size={80} strokeWidth={1} />
              <span>{t.appName || "E-Learning UAY"}</span>
            </div>
          </section>
          <div
            className="dashboard-quick-bar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              margin: "12px 0 16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.86rem",
                color: "var(--muted, #64748b)",
              }}
            >
              <Clock size={16} />
              <span>
                {new Intl.DateTimeFormat("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date())}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <a
                href="https://uay.ac.id"
                target="_blank"
                rel="noopener noreferrer"
                className="button secondary sm"
                style={{
                  fontSize: "0.82rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <BookOpen size={15} />
                Website Utama UAY
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
          {(() => {
            if (user.role !== "STUDENT") return null;
            const now = Date.now();
            const urgentAssignments = activities.filter((act: any) => {
              if (act.kind !== "assignment" || !act.date) return false;
              const diff = Date.parse(act.date) - now;
              return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000;
            });
            if (!urgentAssignments.length) return null;
            return (
              <div
                className="card deadline-reminder-card"
                style={{
                  marginBottom: 16,
                  padding: "12px 18px",
                  borderRadius: 10,
                  background:
                    "var(--adaptive-warning-soft, rgba(245, 158, 11, 0.08))",
                  border:
                    "1px solid var(--adaptive-warning-border, rgba(245, 158, 11, 0.3))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background:
                        "var(--adaptive-warning-soft, rgba(245, 158, 11, 0.15))",
                      color: "var(--adaptive-warning-text, #d97706)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={18} />
                  </span>
                  <div>
                    <strong
                      style={{
                        fontSize: "0.92rem",
                        color: "var(--adaptive-warning-text, #92400e)",
                      }}
                    >
                      Pengingat Batas Waktu Tugas ({urgentAssignments.length}{" "}
                      tugas mendekati deadline)
                    </strong>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.82rem",
                        color: "var(--adaptive-warning-text, #78350f)",
                      }}
                    >
                      {urgentAssignments[0].classTitle}:{" "}
                      <strong>{urgentAssignments[0].title}</strong> (Batas:{" "}
                      {date(urgentAssignments[0].date)})
                    </p>
                  </div>
                </div>
                <a
                  href="/agenda"
                  className="button secondary sm"
                  style={{
                    borderColor: "var(--adaptive-warning-border, #d97706)",
                    color: "var(--adaptive-warning-text, #b45309)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  Buka Agenda &rarr;
                </a>
              </div>
            );
          })()}
          {(() => {
            const latestNotice =
              systemAnnouncements.data?.find((a: any) => a.isImportant) ??
              systemAnnouncements.data?.[0];
            if (!latestNotice) return null;
            return (
              <div
                className="card system-announcement-banner"
                style={{
                  marginBottom: 16,
                  padding: "14px 20px",
                  borderRadius: 10,
                  background: latestNotice.isImportant
                    ? "linear-gradient(135deg, var(--adaptive-danger-soft, rgba(220, 38, 38, 0.06)), var(--adaptive-danger-soft, rgba(239, 68, 68, 0.02)))"
                    : "var(--adaptive-info-soft, rgba(2, 132, 199, 0.05))",
                  border: latestNotice.isImportant
                    ? "1px solid var(--adaptive-danger-border, rgba(220, 38, 38, 0.25))"
                    : "1px solid var(--adaptive-info-border, rgba(2, 132, 199, 0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div
                  className="dashboard-announcement-summary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flex: 1,
                    minWidth: 260,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: latestNotice.isImportant
                        ? "var(--adaptive-danger-soft, rgba(220, 38, 38, 0.12))"
                        : "var(--adaptive-info-soft, rgba(2, 132, 199, 0.12))",
                      color: latestNotice.isImportant
                        ? "var(--adaptive-danger-text, #dc2626)"
                        : "var(--adaptive-info-text, #0284c7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Megaphone size={19} />
                  </div>
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          color: latestNotice.isImportant
                            ? "var(--adaptive-danger-text, #b91c1c)"
                            : "var(--adaptive-info-text, #0369a1)",
                        }}
                      >
                        {latestNotice.isImportant
                          ? "Surat Edaran Penting"
                          : "Pengumuman Resmi"}
                      </span>
                      {latestNotice.referenceNumber && (
                        <span
                          className="mono"
                          style={{
                            fontSize: "0.74rem",
                            color: "var(--muted, #64748b)",
                          }}
                        >
                          {latestNotice.referenceNumber}
                        </span>
                      )}
                    </div>
                    <strong
                      className="dashboard-announcement-title"
                      style={{
                        fontSize: "0.93rem",
                        color: "var(--foreground, #0f172a)",
                      }}
                    >
                      {latestNotice.title}
                    </strong>
                    <p
                      className="dashboard-announcement-preview"
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.83rem",
                        color: "var(--muted, #475569)",
                        lineHeight: 1.4,
                      }}
                    >
                      {(latestNotice.content || "")
                        .replace(/<[^>]+>/g, " ")
                        .replace(/\s+/g, " ")
                        .trim()
                        .slice(0, 120)}
                      ...
                    </p>
                  </div>
                </div>
                <a
                  href={`/announcements#announcement-${latestNotice.id}`}
                  className="button secondary sm"
                  style={{
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Baca Edaran <ArrowRight size={14} />
                </a>
              </div>
            );
          })()}
          <div className="stats-grid">
            {[
              [
                BookOpen,
                t.activeClasses,
                items.filter((c) => c.status === "PUBLISHED").length,
                "/classes",
              ],
              [
                Users,
                teacher ? t.participants : t.learningProgress,
                teacher
                  ? items.reduce((sum, c) => sum + c._count.enrollments, 0)
                  : `${Math.round(materialProgress.reduce((sum, p) => sum + p, 0) / (materialProgress.length || 1))}%`,
                teacher ? "/classes" : "/grades",
              ],
              [
                CalendarDays,
                t.meetings,
                items.reduce((sum, c) => sum + c._count.sections, 0),
                "/classes",
              ],
              [
                ClipboardCheck,
                teacher ? t.pendingGrading : t.activity,
                teacher
                  ? gradingQueue.reduce((sum, item) => sum + item.count, 0)
                  : activities.length,
                teacher ? "/agenda" : "/agenda",
              ],
            ].map(([Icon, label, value, href]: any) => (
              <a
                href={href}
                className="stat stat-clickable"
                key={label}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                }}
                title={`Buka menu ${label}`}
              >
                <span className="stat-icon">
                  <Icon size={19} />
                </span>
                <div>
                  <span>{label}</span>
                  <strong>{value.toString().padStart(2, "0")}</strong>
                </div>
              </a>
            ))}
          </div>
          {teacher && gradingQueue.length > 0 && (
            <>
              <div className="section-heading">
                <h2>{t.pendingGrading}</h2>
              </div>
              <div className="card activity-list">
                {gradingQueue.map((item) => (
                  <a
                    className="activity-row"
                    href={contentPath(
                      item.classInfo,
                      item.kind === "quiz" ? "quizzes" : "assignments",
                      item,
                      item.siblings,
                    )}
                    key={item.id}
                  >
                    <span className="activity-icon">
                      <ClipboardCheck size={18} />
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.classTitle}</p>
                    </div>
                    <span className="badge">
                      {item.count} {t.pendingGrading.toLowerCase()}
                    </span>
                  </a>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {page !== "agenda" && (
        <>
          <div className="section-heading">
            <h2>
              {admin ? t.manageClasses : t.myClasses}{" "}
              <span className="count">{items.length}</span>
            </h2>
            {page === "dashboard" ? (
              <a className="text-link" href="/classes">
                {t.viewAll}
                <ArrowUpRight size={15} />
              </a>
            ) : (
              <div className="search-field">
                <Search size={17} />
                <input
                  aria-label={t.searchLabel}
                  placeholder={t.search}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          {page === "classes" && (
            <>
              {user.role === "SUPER_ADMIN" && departments.length > 0 && (
                <label className="department-filter">
                  Program studi
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="">Semua prodi</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {formatDepartmentScope(department)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <Tabs
                value={filter}
                onChange={setFilter}
                items={[
                  ["ALL", t.all],
                  ["PUBLISHED", t.active],
                  ["DRAFT", t.draft],
                  ["ARCHIVED", t.archived],
                ].map(([id, label]) => ({ id, label }))}
              />
            </>
          )}
          <div className="cards">
            {items.map((item, index) => (
              <ClassCard key={item.id} item={item} index={index} />
            ))}
          </div>
          {!items.length && (
            <Empty>
              <h3>{t.emptyClasses}</h3>
              <p>
                {admin
                  ? "Belum ada kelas pada cakupan yang dipilih."
                  : t.emptyDescription}
              </p>
            </Empty>
          )}
        </>
      )}
      {page !== "classes" && (
        <>
          <div className="section-heading">
            <h2>{t.upcoming}</h2>
            {page === "dashboard" && (
              <a className="text-link" href="/agenda">
                {t.viewAll}
                <ArrowUpRight size={15} />
              </a>
            )}
          </div>
          {page === "agenda" &&
            user.role === "SUPER_ADMIN" &&
            departments.length > 0 && (
              <div className="toolbar" style={{ marginBottom: 16 }}>
                <label className="department-filter">
                  Program studi
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="">Semua prodi</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {formatDepartmentScope(department)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          <div className="agenda-list card">
            {activities.length ? (
              activities
                .slice(0, page === "dashboard" ? 5 : 100)
                .map((item: any) => (
                  <a
                    key={item.id}
                    href={contentPath(
                      item.classInfo,
                      item.kind === "quiz" ? "quizzes" : "assignments",
                      item,
                      item.siblings,
                    )}
                    className="agenda-row"
                  >
                    <span className={`activity-icon ${item.kind}`}>
                      {item.kind === "quiz" ? (
                        <ClipboardCheck size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </span>
                    <div>
                      <small>
                        {item.classTitle} ·{" "}
                        {item.kind === "quiz" ? t.quiz : t.assignment}
                      </small>
                      <h3>{item.title}</h3>
                    </div>
                    <div className="agenda-date">
                      <CalendarDays size={15} />
                      {item.date ? date(item.date) : t.noDeadline}
                    </div>
                    {!teacher &&
                      item.userStatus &&
                      item.userStatus !== "OPEN" && (
                        <Badge value={item.userStatus} />
                      )}
                    <ChevronRight size={18} />
                  </a>
                ))
            ) : (
              <Empty>{t.noAgenda}</Empty>
            )}
          </div>
        </>
      )}
      {modal &&
        (canCreateClass ? (
          <ClassForm
            user={user}
            defaultAcademicYear={config?.academicYear}
            onClose={() => setModal(false)}
            onSaved={() => {
              setModal(false);
              classes.reload();
            }}
          />
        ) : (
          <JoinClassModal
            onClose={() => setModal(false)}
            onJoined={() => {
              setModal(false);
              classes.reload();
            }}
          />
        ))}
    </>
  );
}
const DEPARTMENT_NAMES: Record<string, string> = {
  IF: "Program Studi Informatika",
  TI: "Program Studi Teknik Industri",
  TS: "Program Studi Teknik Sipil",
  TE: "Program Studi Teknik Elektro",
  SI: "Program Studi Sistem Informasi",
  HK: "Program Studi Ilmu Hukum",
  IH: "Program Studi Ilmu Hukum",
  MIH: "Program Studi Magister Ilmu Hukum",
  MH: "Program Studi Magister Ilmu Hukum",
  MAN: "Program Studi Manajemen",
  MN: "Program Studi Manajemen",
  AK: "Program Studi Akuntansi",
  AP: "Program Studi Administrasi Publik",
  AB: "Program Studi Administrasi Bisnis",
  FAR: "Program Studi Farmasi",
  FARM: "Program Studi Farmasi",
};

export function formatDepartmentScope(code: string): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  const name = DEPARTMENT_NAMES[upper];
  if (name) return `${upper} (${name})`;
  return code;
}

function AdminOverview({
  user,
  classes,
  courses,
  reload,
  config,
  onConfigChange,
  departmentFilter,
  onDepartmentFilter,
  departments,
}: {
  user: any;
  classes: any[];
  courses: { data: any[] | null; loading: boolean; error: Error | null };
  reload: () => void;
  config?: any;
  onConfigChange?: () => void;
  departmentFilter: string;
  onDepartmentFilter: (value: string) => void;
  departments: string[];
}) {
  const [governanceModal, setGovernanceModal] = useState(false);
  const departmentAdmin = user.role === "DEPARTMENT_ADMIN";
  const drafts = classes.filter((c) => c.status === "DRAFT");
  const scope = departmentAdmin
    ? user.departmentScopes && user.departmentScopes.length > 0
      ? user.departmentScopes
          .map((c: string) => formatDepartmentScope(c))
          .join(", ")
      : t.noDepartmentScope
    : departmentFilter
      ? formatDepartmentScope(departmentFilter)
      : t.allDepartments;
  return (
    <>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow-row">
            <span className="eyebrow">{t.academicSpace}</span>
            <span className="user-role-badge">
              {(t.roles as Record<string, string>)[user.role]}
            </span>
          </div>
          <h1>{t.adminDashboard}</h1>
          <p>
            {user.name} · {t.managementScope}: {scope}
          </p>
        </div>
        <div
          className="toolbar"
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button
            className="secondary"
            onClick={() => setGovernanceModal(true)}
          >
            <Sliders size={16} />
            Kebijakan &amp; Tahun Ajaran
          </button>
        </div>
      </div>
      {user.role === "SUPER_ADMIN" && departments.length > 1 && (
        <label className="department-filter">
          Program studi
          <select
            value={departmentFilter}
            onChange={(e) => onDepartmentFilter(e.target.value)}
          >
            <option value="">Semua prodi</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {formatDepartmentScope(department)}
              </option>
            ))}
          </select>
        </label>
      )}
      <section className="welcome-panel compact">
        <div>
          <span className="pill">{t.semester}</span>
          <h2>
            {departmentAdmin ? t.departmentManagement : t.academicManagement}
          </h2>
          <p>
            Lihat kondisi kelas dan aktivitas akademik. Pengelolaan isi kelas
            dilakukan oleh dosen pengampu.
          </p>
          <a className="button light" href="/catalog">
            {t.catalog}
            <ArrowUpRight size={18} />
          </a>
        </div>
        <div className="welcome-emblem">
          <BookOpen size={80} strokeWidth={1} />
          <span>{t.appName || "E-Learning UAY"}</span>
        </div>
      </section>
      {courses.error && <Notice error={courses.error} />}
      <div className="stats-grid">
        {[
          [
            Database,
            t.courses,
            (courses.loading && !courses.data) || courses.error
              ? "—"
              : (courses.data?.filter(
                  (course) =>
                    !departmentFilter ||
                    course.departmentCode === departmentFilter,
                ).length ?? 0),
            "/catalog",
          ],
          [
            BookOpen,
            t.activeClasses,
            classes.filter((c) => c.status === "PUBLISHED").length,
            "/classes",
          ],
          [FileText, t.draftClasses, drafts.length, "/classes"],
          [
            Users,
            t.activeEnrollments,
            classes.reduce((sum, c) => sum + c._count.enrollments, 0),
            "/classes",
          ],
        ].map(([Icon, label, value, href]: any) => (
          <a
            href={href}
            className="stat stat-clickable"
            key={label}
            style={{
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
            }}
            title={`Buka menu ${label}`}
          >
            <span className="stat-icon">
              <Icon size={19} />
            </span>
            <div>
              <span>{label}</span>
              <strong>{String(value).padStart(2, "0")}</strong>
            </div>
          </a>
        ))}
      </div>
      <div className="section-heading">
        <h2>{t.academicAdministration}</h2>
      </div>
      <div className="cards">
        {[
          ["/catalog", Database, t.catalog, t.manageCatalogDescription],
          ["/classes", BookOpen, t.manageClasses, t.manageClassesDescription],
          [
            "/grades",
            ClipboardCheck,
            t.gradeOverview,
            t.gradeOverviewDescription,
          ],
          [
            "/audit",
            History,
            "Rekaman Jejak Aktivitas",
            "Pantau rekam jejak aktivitas tata kelola sistem, perubahan wewenang, dan operasional akademik.",
          ],
        ].map(([href, Icon, title, description]: any) => (
          <a className="card" href={href} key={href}>
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{description}</p>
            <span className="text-link">
              {t.open}
              <ChevronRight size={16} />
            </span>
          </a>
        ))}
        <button
          type="button"
          className="card governance-card"
          onClick={() => setGovernanceModal(true)}
        >
          <Sliders size={24} aria-hidden="true" />
          <h3>Kebijakan &amp; Tahun Ajaran</h3>
          <p>
            Lihat tahun akademik aktif (
            {config?.academicYear || "2026/2027 Ganjil"}), daftar semester, dan
            standar kebijakan bobot huruf mutu.
          </p>
          <span className="text-link">
            {user.role === "SUPER_ADMIN"
              ? "Kelola Kebijakan"
              : "Lihat Kebijakan"}
            <ChevronRight size={16} />
          </span>
        </button>
      </div>
      {governanceModal && (
        <AcademicGovernanceModal
          config={config}
          readOnly={user.role !== "SUPER_ADMIN"}
          onClose={() => setGovernanceModal(false)}
          onSaved={() => {
            onConfigChange?.();
            reload();
          }}
        />
      )}
    </>
  );
}
function JoinClassModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: () => void;
}) {
  const openClasses = useApi<any[]>("/course-classes?open=true");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const filtered = (openClasses.data ?? []).filter((c) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      c.course?.code?.toLowerCase().includes(term) ||
      c.course?.title?.toLowerCase().includes(term) ||
      c.name?.toLowerCase().includes(term) ||
      c.instructors?.some((i: any) =>
        i.user?.name?.toLowerCase().includes(term),
      )
    );
  });

  return (
    <Modal title={t.joinClass} onClose={onClose}>
      <Form
        draftKey="join-class"
        submitLabel={t.joinClass}
        onSubmit={async (f) => {
          const classTarget = manualMode
            ? textValue(f, "manualClassId")
            : selectedClassId || textValue(f, "classId");
          if (!classTarget)
            throw new Error("Pilih kelas yang ingin diikuti terlebih dahulu.");
          await api(
            `/course-classes/${encodeURIComponent(classTarget)}/enroll`,
            "POST",
            { enrollmentKey: textValue(f, "key") },
          );
          onJoined();
        }}
      >
        {!manualMode ? (
          <>
            <Field label={t.chooseClass}>
              {openClasses.loading && !openClasses.data ? (
                <Loading />
              ) : openClasses.data && openClasses.data.length > 0 ? (
                <>
                  <input
                    type="text"
                    placeholder={t.searchClass}
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{ marginBottom: 8 }}
                  />
                  <select
                    name="classId"
                    required
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                  >
                    <option value="">-- {t.chooseClass} --</option>
                    {filtered.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course?.code} · {c.course?.title} ({c.name} -{" "}
                        {c.academicYear})
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <p className="empty-inline" style={{ marginBottom: 8 }}>
                  Tidak ada kelas yang membuka pendaftaran mandiri saat ini.
                </p>
              )}
            </Field>
            <div
              style={{ textAlign: "right", marginTop: -6, marginBottom: 12 }}
            >
              <button
                type="button"
                className="text-button"
                style={{ fontSize: "0.82rem" }}
                onClick={() => setManualMode(true)}
              >
                Gunakan ID / Kode Kelas manual
              </button>
            </div>
          </>
        ) : (
          <>
            <Field label="Kode / ID Kelas">
              <input
                name="manualClassId"
                required
                placeholder="Masukkan kode MK (mis. IF202) atau slug kelas"
              />
            </Field>
            <div
              style={{ textAlign: "right", marginTop: -6, marginBottom: 12 }}
            >
              <button
                type="button"
                className="text-button"
                style={{ fontSize: "0.82rem" }}
                onClick={() => setManualMode(false)}
              >
                Pilih dari daftar kelas terbuka
              </button>
            </div>
          </>
        )}
        <Field label={t.enrollmentKey}>
          <input
            name="key"
            required
            minLength={6}
            placeholder="Masukkan kunci pendaftaran dari dosen"
            onInvalid={(e) =>
              (e.target as HTMLInputElement).setCustomValidity(
                (e.target as HTMLInputElement).validity.valueMissing
                  ? "Kunci pendaftaran mandiri wajib diisi."
                  : "Kunci pendaftaran mandiri minimal 6 karakter.",
              )
            }
            onInput={(e) =>
              (e.target as HTMLInputElement).setCustomValidity("")
            }
          />
        </Field>
      </Form>
    </Modal>
  );
}

function generateEnrollmentKey(length = 6): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

export function ClassForm({
  user,
  onClose,
  onSaved,
  defaultAcademicYear,
}: {
  user?: any;
  onClose: () => void;
  onSaved: () => void;
  defaultAcademicYear?: string;
}) {
  const courses = useApi<CourseOption[]>("/courses");
  const isInstructor = user?.role === "INSTRUCTOR";
  const isAssistant = user?.role === "ASSISTANT";
  const [search, setSearch] = useState(""),
    [users, setUsers] = useState<UserSearchResult[]>([]),
    [selected, setSelected] = useState<string[]>(
      isInstructor && user?.id ? [user.id] : [],
    ),
    [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>(
      isInstructor && user?.id
        ? [
            {
              id: user.id,
              name: user.name,
              identifierValue: user.identifierValue ?? "Dosen Pengampu",
              role: "INSTRUCTOR",
            },
          ]
        : [],
    ),
    [enrollmentKey, setEnrollmentKey] = useState(() => generateEnrollmentKey()),
    [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await api<UserSearchResult[]>(
          `/users?q=${encodeURIComponent(trimmed)}&role=INSTRUCTOR`,
        );
        setUsers(results);
        setError(null);
      } catch (e) {
        setError(e as Error);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <Modal title={t.newClass} onClose={onClose}>
      <Form
        draftKey="new-class"
        draftValue={{ selected, selectedUsers, users, search, enrollmentKey }}
        onRestoreDraft={(v) => {
          setSelected(v?.selected ?? []);
          setSelectedUsers(v?.selectedUsers ?? []);
          setUsers(v?.users ?? []);
          setSearch(v?.search ?? "");
          if (v?.enrollmentKey) setEnrollmentKey(v.enrollmentKey);
        }}
        onCancel={onClose}
        onSubmit={async (f) => {
          if (!selected.length) {
            setError(
              Error("Pilih minimal satu dosen pengampu untuk kelas baru ini."),
            );
            return false;
          }
          await api("/course-classes", "POST", {
            courseId: textValue(f, "courseId"),
            name: textValue(f, "name"),
            academicYear: textValue(f, "academicYear"),
            status: textValue(f, "status"),
            instructorIds: selected,
            ...(textValue(f, "key")
              ? { enrollmentKey: textValue(f, "key") }
              : {}),
          });
          onSaved();
        }}
      >
        {error && <Notice error={error} onClose={() => setError(null)} />}
        <Field label={t.course}>
          <select required name="courseId">
            <option value="">{t.choose}</option>
            {courses.data
              ?.filter((c) => c.status !== "ARCHIVED")
              .map((c) => (
                <option value={c.id} key={c.id}>
                  {c.departmentCode ? `[${c.departmentCode}] ` : ""}
                  {c.code} · {c.title}
                </option>
              ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label={t.className}>
            <input name="name" required maxLength={200} />
          </Field>
          <Field label={t.academicYear}>
            <input
              name="academicYear"
              defaultValue={defaultAcademicYear || "2026/2027 Ganjil"}
              required
            />
          </Field>
        </div>
        <Field label={t.status}>
          <select name="status">
            <option value="DRAFT">{t.draft}</option>
            <option value="PUBLISHED">{t.published}</option>
          </select>
        </Field>
        <Field label={t.enrollmentKey}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              name="key"
              value={enrollmentKey}
              onChange={(e) => setEnrollmentKey(e.target.value.toUpperCase())}
              minLength={6}
              maxLength={20}
              placeholder="6 karakter huruf kapital"
              style={{
                fontFamily: "monospace",
                fontWeight: 600,
                letterSpacing: "2px",
                textTransform: "uppercase",
                flex: 1,
              }}
              onInvalid={(e) =>
                (e.target as HTMLInputElement).setCustomValidity(
                  "Kunci pendaftaran mandiri minimal 6 karakter.",
                )
              }
              onInput={(e) =>
                (e.target as HTMLInputElement).setCustomValidity("")
              }
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setEnrollmentKey(generateEnrollmentKey())}
              title="Acak ulang kunci pendaftaran"
              style={{ whiteSpace: "nowrap" }}
            >
              Acak Ulang
            </button>
          </div>
          <small
            style={{
              color: "var(--muted, #64748b)",
              marginTop: 4,
              display: "block",
              fontSize: "0.82rem",
            }}
          >
            Kunci pendaftaran otomatis terisi 6 huruf kapital. Mahasiswa dapat
            menggunakan kunci ini untuk bergabung secara mandiri.
          </small>
        </Field>
        <Field label={t.instructors}>
          {isAssistant && (
            <small className="form-hint">
              Anda akan otomatis ditugaskan sebagai asisten dosen pada kelas
              ini. Setelah kelas dibuat, Anda dapat menambahkan pertemuan
              praktikum.
            </small>
          )}
          <div className="instructor-picker">
            <div className="inline-form">
              <input
                value={search}
                aria-label={t.instructors}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = search.trim();
                    if (trimmed.length >= 2) {
                      api<UserSearchResult[]>(
                        `/users?q=${encodeURIComponent(trimmed)}&role=INSTRUCTOR`,
                      )
                        .then((res) => {
                          setUsers(res);
                          setError(null);
                        })
                        .catch((err) => setError(err as Error));
                    }
                  }
                }}
                placeholder="Ketik nama atau NIDN dosen..."
              />
              <button
                type="button"
                className="secondary"
                disabled={search.trim().length < 2}
                onClick={async () => {
                  const trimmed = search.trim();
                  if (trimmed.length < 2) return;
                  try {
                    setUsers(
                      await api(
                        `/users?q=${encodeURIComponent(trimmed)}&role=INSTRUCTOR`,
                      ),
                    );
                    setError(null);
                  } catch (e) {
                    setError(e as Error);
                  }
                }}
              >
                {t.searchLabel}
              </button>
            </div>
            {search.trim().length > 0 && search.trim().length < 2 && (
              <small
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "var(--adaptive-text-muted, #64748b)",
                }}
              >
                Ketik minimal 2 karakter untuk mencari dosen...
              </small>
            )}
            {search.trim().length >= 2 &&
              users.filter((u) => u.role === "INSTRUCTOR").length === 0 && (
                <small
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "var(--adaptive-text-muted, #64748b)",
                  }}
                >
                  Tidak ada dosen yang cocok dengan pencarian "{search.trim()}".
                </small>
              )}
            {search.trim().length >= 2 &&
              users.filter((u) => u.role === "INSTRUCTOR").length > 0 && (
                <div
                  className="instructor-results"
                  aria-label="Hasil pencarian dosen"
                >
                  {users
                    .filter((u) => u.role === "INSTRUCTOR")
                    .map((u) => {
                      const isPicked = selected.includes(u.id);
                      return (
                        <button
                          type="button"
                          className="instructor-result"
                          key={u.id}
                          aria-pressed={isPicked}
                          onClick={() => {
                            if (!isPicked) {
                              setSelected((prev) => [...prev, u.id]);
                              setSelectedUsers((prev) => [
                                ...prev.filter((x) => x.id !== u.id),
                                u,
                              ]);
                            } else {
                              setSelected((prev) =>
                                prev.filter((id) => id !== u.id),
                              );
                              setSelectedUsers((prev) =>
                                prev.filter((x) => x.id !== u.id),
                              );
                            }
                            setSearch("");
                          }}
                        >
                          <span>
                            <strong>{u.name}</strong>
                            <small>{u.identifierValue ?? "Dosen"}</small>
                          </span>
                          <span className="instructor-result-action">
                            {isPicked ? "Terpilih ✓" : "+ Tambah"}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
          </div>
        </Field>
        {selectedUsers.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              margin: "6px 0 12px",
            }}
          >
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 16,
                  background:
                    isInstructor && u.id === user?.id
                      ? "var(--adaptive-success-soft, #dcfce7)"
                      : "var(--adaptive-info-soft, #e0f2fe)",
                  color:
                    isInstructor && u.id === user?.id
                      ? "var(--adaptive-success-text, #166534)"
                      : "var(--adaptive-info-text, #0369a1)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                <span>
                  {u.name}{" "}
                  <small style={{ opacity: 0.85 }}>
                    (
                    {isInstructor && u.id === user?.id
                      ? "Pengampu Utama"
                      : "Kolaborator"}
                    )
                  </small>
                </span>
                {!(isInstructor && u.id === user?.id) && (
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "1rem",
                      lineHeight: 1,
                      color: "inherit",
                    }}
                    onClick={() => {
                      setSelected((prev) => prev.filter((id) => id !== u.id));
                      setSelectedUsers((prev) =>
                        prev.filter((x) => x.id !== u.id),
                      );
                    }}
                    aria-label={`Hapus ${u.name}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {users
          .filter(
            (u) =>
              u.role === "INSTRUCTOR" &&
              !selectedUsers.some((su) => su.id === u.id),
          )
          .map((u) => (
            <label className="check-row" key={u.id}>
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelected((prev) => [...prev, u.id]);
                    setSelectedUsers((prev) => [
                      ...prev.filter((x) => x.id !== u.id),
                      u,
                    ]);
                  } else {
                    setSelected((prev) => prev.filter((id) => id !== u.id));
                    setSelectedUsers((prev) =>
                      prev.filter((x) => x.id !== u.id),
                    );
                  }
                }}
              />
              {u.name}
            </label>
          ))}
        {error && <Notice error={error} onClose={() => setError(null)} />}
      </Form>
    </Modal>
  );
}
export function AcademicGovernanceModal({
  config,
  readOnly = true,
  onClose,
  onSaved,
}: {
  config?: AcademicPolicySettings;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<"YEAR" | "POLICY">("YEAR");
  const [academicYear, setAcademicYear] = useState(
    config?.academicYear || "2026/2027 Ganjil",
  );
  const [semesterLabel, setSemesterLabel] = useState(
    config?.semesterLabel || "SEMESTER GANJIL 2026/2027",
  );
  const defaultYears = [
    "2025/2026 Ganjil",
    "2025/2026 Genap",
    "2026/2027 Ganjil",
    "2026/2027 Genap",
    "2027/2028 Ganjil",
    "2027/2028 Genap",
  ];
  const [years, setYears] = useState<string[]>(
    config?.academicYears && config.academicYears.length > 0
      ? config.academicYears
      : defaultYears,
  );
  const [newYearInput, setNewYearInput] = useState("");
  const [scaleVersion, setScaleVersion] = useState(
    config?.defaultGradeScaleVersion || "2026.1",
  );
  const [scales, setScales] = useState<Record<string, GradeScalePolicy>>(() => {
    return getAllGradeScalePolicies(config?.customGradeScales);
  });
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [newVersionCode, setNewVersionCode] = useState("");
  const [newVersionName, setNewVersionName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const [minAttendance, setMinAttendance] = useState(
    config?.minAttendancePercentage ?? 75,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const currentScale: GradeScalePolicy =
    scales[scaleVersion] ||
    GRADE_SCALE_PRESETS[scaleVersion as keyof typeof GRADE_SCALE_PRESETS] ||
    GRADE_SCALE_PRESETS["2026.1"];

  const handleUpdateBand = (index: number, patch: Partial<GradeBand>) => {
    setValidationError(null);
    const updatedBands = [...currentScale.bands];
    updatedBands[index] = { ...updatedBands[index], ...patch };
    setScales({
      ...scales,
      [scaleVersion]: {
        ...currentScale,
        bands: updatedBands,
      },
    });
  };

  const handleAddBand = () => {
    setValidationError(null);
    const existingLetters = new Set(
      currentScale.bands.map((b) => b.letter.trim().toUpperCase()),
    );
    let suggestedLetter = "A+";
    if (existingLetters.has(suggestedLetter)) suggestedLetter = "AB";
    if (existingLetters.has(suggestedLetter)) suggestedLetter = "BC";
    if (existingLetters.has(suggestedLetter)) suggestedLetter = "CD";
    if (existingLetters.has(suggestedLetter)) suggestedLetter = "X";

    const newBand: GradeBand = {
      letter: suggestedLetter,
      minScore: 88,
      point: 4.0,
    };
    const updatedBands = [...currentScale.bands, newBand].sort(
      (a, b) => b.minScore - a.minScore,
    );
    setScales({
      ...scales,
      [scaleVersion]: {
        ...currentScale,
        bands: updatedBands,
      },
    });
  };

  const handleRemoveBand = (index: number) => {
    if (currentScale.bands.length <= 1) return;
    setValidationError(null);
    const updatedBands = currentScale.bands.filter((_, i) => i !== index);
    setScales({
      ...scales,
      [scaleVersion]: {
        ...currentScale,
        bands: updatedBands,
      },
    });
  };

  const handleSortBands = () => {
    const sorted = [...currentScale.bands].sort(
      (a, b) => b.minScore - a.minScore,
    );
    setScales({
      ...scales,
      [scaleVersion]: {
        ...currentScale,
        bands: sorted,
      },
    });
  };

  const handleResetPreset = () => {
    if (GRADE_SCALE_PRESETS[scaleVersion]) {
      setScales({
        ...scales,
        [scaleVersion]: JSON.parse(
          JSON.stringify(GRADE_SCALE_PRESETS[scaleVersion]),
        ),
      });
      setValidationError(null);
    }
  };

  const handleCreateNewPolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const ver = newVersionCode.trim();
    const name = newVersionName.trim() || `Standar Nilai ${ver}`;
    if (!ver) {
      setValidationError("Kode versi kebijakan tidak boleh kosong.");
      return;
    }
    if (scales[ver]) {
      setValidationError(`Versi kebijakan "${ver}" sudah ada.`);
      return;
    }
    const newPolicy: GradeScalePolicy = {
      version: ver,
      name,
      description: `Kebijakan kustom ${name}`,
      bands: JSON.parse(JSON.stringify(currentScale.bands)),
    };
    setScales({
      ...scales,
      [ver]: newPolicy,
    });
    setScaleVersion(ver);
    setIsAddingVersion(false);
    setNewVersionCode("");
    setNewVersionName("");
    setValidationError(null);
  };

  const handleAddYear = () => {
    const val = newYearInput.trim();
    if (!val) return;
    if (!years.includes(val)) {
      setYears([...years, val]);
      if (!academicYear) setAcademicYear(val);
    }
    setNewYearInput("");
  };

  const handleRemoveYear = (y: string) => {
    if (years.length <= 1) return;
    const next = years.filter((item) => item !== y);
    setYears(next);
    if (academicYear === y) {
      setAcademicYear(next[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setSaveError(null);
    setMessage(null);
    setValidationError(null);

    // Validate bands across all policies
    for (const [key, pol] of Object.entries(scales)) {
      if (!pol.bands || pol.bands.length === 0) {
        setValidationError(
          `Kebijakan "${pol.name}" harus memiliki minimal 1 bobot huruf.`,
        );
        return;
      }
      const seenLetters = new Set<string>();
      for (const b of pol.bands) {
        const letter = (b.letter || "").trim();
        if (!letter) {
          setValidationError(
            `Terdapat huruf mutu yang kosong pada kebijakan "${pol.name}".`,
          );
          return;
        }
        if (seenLetters.has(letter.toUpperCase())) {
          setValidationError(
            `Huruf mutu ganda "${letter}" ditemukan pada kebijakan "${pol.name}". Setiap huruf mutu harus unik.`,
          );
          return;
        }
        seenLetters.add(letter.toUpperCase());
        if (isNaN(b.minScore) || b.minScore < 0 || b.minScore > 100) {
          setValidationError(
            `Batas nilai riil untuk "${letter}" harus berada di antara 0 dan 100.`,
          );
          return;
        }
        if (isNaN(b.point) || b.point < 0 || b.point > 10) {
          setValidationError(
            `Bobot IP untuk "${letter}" harus berupa angka valid (≥ 0).`,
          );
          return;
        }
      }
    }

    const preparedScales: Record<string, GradeScalePolicy> = {};
    for (const [key, pol] of Object.entries(scales)) {
      preparedScales[key] = {
        ...pol,
        bands: [...pol.bands].sort((a, b) => b.minScore - a.minScore),
      };
    }

    setSaving(true);
    try {
      await api("/system/settings", "PUT", {
        academicYear,
        semesterLabel,
        academicYears: years,
        defaultGradeScaleVersion: scaleVersion,
        minAttendancePercentage: Number(minAttendance),
        customGradeScales: preparedScales,
      });
      setMessage(
        "Pengaturan tata kelola akademik dan bobot huruf mutu berhasil disimpan.",
      );
      onSaved();
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      setSaveError(error as Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Pengaturan & Tata Kelola Akademik" wide onClose={onClose}>
      <form onSubmit={handleSave}>
        <div
          style={{
            display: "flex",
            gap: 8,
            borderBottom: "1px solid var(--border, #e2e8f0)",
            paddingBottom: 12,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            className={tab === "YEAR" ? "button primary" : "button secondary"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.88rem",
            }}
            onClick={() => setTab("YEAR")}
          >
            <CalendarDays size={16} />
            <span>Tahun Ajaran &amp; Semester</span>
          </button>
          <button
            type="button"
            className={tab === "POLICY" ? "button primary" : "button secondary"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.88rem",
            }}
            onClick={() => setTab("POLICY")}
          >
            <GraduationCap size={16} />
            <span>Kebijakan Bobot Huruf Mutu</span>
          </button>
        </div>

        {message && (
          <div
            style={{
              background: "var(--adaptive-success-soft, #ecfdf5)",
              color: "var(--adaptive-success-text, #065f46)",
              border: "1px solid var(--adaptive-success-border, #a7f3d0)",
              padding: "10px 14px",
              borderRadius: 8,
              marginBottom: 16,
              fontSize: "0.88rem",
            }}
          >
            {message}
          </div>
        )}

        {readOnly && (
          <p>Pengaturan global hanya dapat diubah oleh Super Admin.</p>
        )}
        {saveError && (
          <Notice error={saveError} onClose={() => setSaveError(null)} />
        )}
        <fieldset
          disabled={readOnly || saving}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          {tab === "YEAR" ? (
            <div>
              <div style={{ marginBottom: 18 }}>
                <Field
                  label="Tahun Akademik Aktif Berjalan"
                  hint="Tahun akademik ini terpilih sebagai default saat pengelola membuat kelas baru dan ditampilkan di beranda portal."
                >
                  <select
                    value={academicYear}
                    onChange={(e) => {
                      setAcademicYear(e.target.value);
                      setSemesterLabel(
                        `SEMESTER ${e.target.value.toUpperCase()}`,
                      );
                    }}
                    required
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ marginBottom: 20 }}>
                <Field
                  label="Label Banner Portal Landing"
                  hint="Teks semester yang terpampang di halaman portal publik & login (contoh: SEMESTER GANJIL 2026/2027)."
                >
                  <input
                    required
                    value={semesterLabel}
                    onChange={(e) => setSemesterLabel(e.target.value)}
                  />
                </Field>
              </div>

              <div
                style={{
                  background: "var(--adaptive-surface, #f8fafc)",
                  border: "1px solid var(--adaptive-border, #e2e8f0)",
                  borderRadius: 10,
                  padding: "16px 18px",
                  marginBottom: 20,
                }}
              >
                <h4
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                  }}
                >
                  Daftar Semester &amp; Tahun Ajaran Tersedia
                </h4>
                <p
                  style={{
                    margin: "0 0 14px 0",
                    fontSize: "0.84rem",
                    color: "var(--adaptive-text-muted, #64748b)",
                  }}
                >
                  Daftar tahun akademik yang dapat dipilih dosen/admin saat
                  menduplikasi kelas (clone) atau menyelenggarakan kelas baru.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {years.map((y) => {
                    const isActive = y === academicYear;
                    return (
                      <span
                        key={y}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: isActive
                            ? "var(--adaptive-info-fill, #0284c7)"
                            : "var(--adaptive-surface, #ffffff)",
                          color: isActive
                            ? "#ffffff"
                            : "var(--adaptive-text, #1e293b)",
                          border: isActive
                            ? "1px solid var(--adaptive-info-border, #0284c7)"
                            : "1px solid var(--adaptive-border, #cbd5e1)",
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: "0.84rem",
                          fontWeight: 600,
                        }}
                      >
                        <span>{y}</span>
                        {isActive && (
                          <span
                            style={{
                              background: "rgba(255,255,255,0.25)",
                              padding: "1px 6px",
                              borderRadius: 10,
                              fontSize: "0.72rem",
                            }}
                          >
                            Aktif
                          </span>
                        )}
                        {!readOnly && !isActive && (
                          <button
                            type="button"
                            onClick={() => handleRemoveYear(y)}
                            title="Hapus semester dari daftar"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--adaptive-text-muted, #94a3b8)",
                              padding: 0,
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>

                {!readOnly && (
                  <div style={{ display: "flex", gap: 8, maxWidth: 440 }}>
                    <input
                      type="text"
                      placeholder="Tambah tahun ajaran (cth: 2027/2028 Ganjil)"
                      value={newYearInput}
                      onChange={(e) => setNewYearInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddYear();
                        }
                      }}
                      style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                    />
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleAddYear}
                      style={{ fontSize: "0.85rem", whiteSpace: "nowrap" }}
                    >
                      + Tambah Semester
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              {validationError && (
                <div
                  style={{
                    background: "var(--adaptive-danger-soft, #fef2f2)",
                    color: "var(--adaptive-danger-text, #b91c1c)",
                    border: "1px solid var(--adaptive-danger-border, #fecaca)",
                    padding: "10px 14px",
                    borderRadius: 8,
                    marginBottom: 16,
                    fontSize: "0.85rem",
                  }}
                >
                  {validationError}
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <Field
                  label="Kebijakan Konversi Huruf Mutu Aktif (Grade Scale Policy)"
                  hint="Menentukan pemetaan skor nilai akhir (0-100) ke huruf mutu dan bobot huruf mutu."
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={scaleVersion}
                      onChange={(e) => setScaleVersion(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {Object.values(scales).map((policy) => (
                        <option key={policy.version} value={policy.version}>
                          {gradeScaleLabel(policy)}
                        </option>
                      ))}
                    </select>
                    {!readOnly && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setIsAddingVersion(true)}
                        style={{
                          whiteSpace: "nowrap",
                          fontSize: "0.85rem",
                        }}
                      >
                        + Buat Versi Baru
                      </button>
                    )}
                  </div>
                </Field>
              </div>

              {!readOnly && isAddingVersion && (
                <div
                  style={{
                    background: "var(--adaptive-surface, #f8fafc)",
                    border: "1px solid var(--adaptive-border, #e2e8f0)",
                    borderRadius: 8,
                    padding: "14px 16px",
                    marginBottom: 18,
                  }}
                >
                  <strong
                    style={{
                      fontSize: "0.88rem",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Buat Versi Kebijakan Huruf Mutu Baru
                  </strong>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Kode Versi
                      </label>
                      <input
                        type="text"
                        placeholder="cth: 2027.1"
                        value={newVersionCode}
                        onChange={(e) => setNewVersionCode(e.target.value)}
                        style={{ fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Nama Standar Kebijakan
                      </label>
                      <input
                        type="text"
                        placeholder="cth: Standar Akademik UAY 2027/2028"
                        value={newVersionName}
                        onChange={(e) => setNewVersionName(e.target.value)}
                        style={{ fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        setIsAddingVersion(false);
                        setNewVersionCode("");
                        setNewVersionName("");
                      }}
                      style={{ fontSize: "0.82rem" }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      className="button primary"
                      onClick={handleCreateNewPolicy}
                      style={{ fontSize: "0.82rem" }}
                    >
                      Simpan &amp; Pilih Versi
                    </button>
                  </div>
                </div>
              )}

              {!readOnly && (
                <div style={{ marginBottom: 18 }}>
                  <Field
                    label="Nama Standar Kebijakan"
                    hint="Nama deskriptif untuk kebijakan huruf mutu yang sedang dipilih."
                  >
                    <input
                      type="text"
                      value={currentScale.name}
                      onChange={(e) =>
                        setScales({
                          ...scales,
                          [scaleVersion]: {
                            ...currentScale,
                            name: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </Field>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <Field
                  label="Ambang Batas Kehadiran Mengikuti Ujian (%)"
                  hint="Ambang penanda kelayakan pada rekap kehadiran. Akses kuis dan tugas tetap mengikuti jadwal aktivitas."
                >
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    required
                    value={minAttendance}
                    onChange={(e) => setMinAttendance(Number(e.target.value))}
                    style={{ maxWidth: 160 }}
                  />
                </Field>
              </div>

              <div
                style={{
                  border: "1px solid var(--adaptive-border, #e2e8f0)",
                  borderRadius: 10,
                  overflow: "hidden",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    background: "var(--adaptive-surface, #f8fafc)",
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--adaptive-border, #e2e8f0)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ fontSize: "0.9rem" }}>
                    Tabel Konversi Skala Nilai: {currentScale.name}
                  </strong>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      background: "var(--adaptive-info-soft, #e0f2fe)",
                      color: "var(--adaptive-info-text, #0369a1)",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontWeight: 600,
                    }}
                  >
                    Versi {currentScale.version}
                  </span>
                </div>

                <table
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    width: "100%",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--adaptive-surface, #f1f5f9)",
                      }}
                    >
                      <th style={{ padding: "8px 12px" }}>Huruf Mutu</th>
                      <th style={{ padding: "8px 12px" }}>
                        Batas Nilai Riil (≥ Nilai Min)
                      </th>
                      <th style={{ padding: "8px 12px" }}>
                        Bobot IP (0.00–4.00)
                      </th>
                      {!readOnly && (
                        <th
                          style={{
                            padding: "8px 12px",
                            width: 50,
                            textAlign: "center",
                          }}
                        >
                          Aksi
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {currentScale.bands.map((b: any, index: number) => (
                      <tr key={index}>
                        <td style={{ padding: "8px 12px" }}>
                          {readOnly ? (
                            <span className="letter-badge">{b.letter}</span>
                          ) : (
                            <input
                              type="text"
                              maxLength={6}
                              value={b.letter}
                              onChange={(e) =>
                                handleUpdateBand(index, {
                                  letter: e.target.value.toUpperCase(),
                                })
                              }
                              style={{
                                width: 68,
                                fontWeight: 700,
                                textAlign: "center",
                                textTransform: "uppercase",
                                padding: "4px 8px",
                              }}
                              required
                            />
                          )}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            fontWeight: 600,
                          }}
                        >
                          {readOnly ? (
                            <span>&ge; {b.minScore}.00</span>
                          ) : (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>&ge;</span>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.5}
                                value={b.minScore}
                                onChange={(e) =>
                                  handleUpdateBand(index, {
                                    minScore: parseFloat(e.target.value) || 0,
                                  })
                                }
                                style={{
                                  width: 84,
                                  padding: "4px 8px",
                                }}
                                required
                              />
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: "var(--adaptive-text-muted, #64748b)",
                                }}
                              >
                                (skor 0–100)
                              </span>
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            fontWeight: 700,
                            color: "var(--adaptive-info-text, #0284c7)",
                          }}
                        >
                          {readOnly ? (
                            <span>{Number(b.point).toFixed(2)}</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.01}
                              value={b.point}
                              onChange={(e) =>
                                handleUpdateBand(index, {
                                  point: parseFloat(e.target.value) || 0,
                                })
                              }
                              style={{
                                width: 76,
                                fontWeight: 700,
                                color: "var(--adaptive-info-text, #0284c7)",
                                padding: "4px 8px",
                              }}
                              required
                            />
                          )}
                        </td>
                        {!readOnly && (
                          <td
                            style={{
                              padding: "8px 12px",
                              textAlign: "center",
                            }}
                          >
                            <button
                              type="button"
                              className="button secondary"
                              onClick={() => handleRemoveBand(index)}
                              disabled={currentScale.bands.length <= 1}
                              title="Hapus bobot huruf ini"
                              style={{
                                padding: "4px 8px",
                                color: "var(--danger, #ef4444)",
                                opacity:
                                  currentScale.bands.length <= 1 ? 0.4 : 1,
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!readOnly && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "var(--adaptive-surface, #f8fafc)",
                      borderTop: "1px solid var(--adaptive-border, #e2e8f0)",
                    }}
                  >
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleAddBand}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.82rem",
                      }}
                    >
                      <Plus size={14} />
                      <span>Tambah Bobot Huruf</span>
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={handleSortBands}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "0.82rem",
                      }}
                    >
                      <ArrowUpDown size={14} />
                      <span>Urutkan Nilai (Tinggi ke Rendah)</span>
                    </button>
                    {GRADE_SCALE_PRESETS[scaleVersion] && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={handleResetPreset}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.82rem",
                          marginLeft: "auto",
                          color: "var(--adaptive-text-muted, #64748b)",
                        }}
                      >
                        <RotateCcw size={14} />
                        <span>Reset ke Standar Preset</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div
                style={{
                  background:
                    "var(--adaptive-info-soft, rgba(2, 132, 199, 0.05))",
                  border:
                    "1px solid var(--adaptive-info-border, rgba(2, 132, 199, 0.2))",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontSize: "0.84rem",
                  lineHeight: 1.5,
                  color: "var(--foreground, #1e293b)",
                  marginBottom: 20,
                }}
              >
                <strong>Pengaruh perubahan skala:</strong>
                <p style={{ margin: "4px 0 0 0" }}>
                  Pengaturan skala ini menjadi default untuk kelas baru,
                  termasuk hasil duplikasi. Skala kelas yang sudah ada dan nilai
                  yang telah diterbitkan tidak dihitung ulang. Revisi nilai
                  terbit mengikuti alur koreksi nilai pada kelas.
                </p>
              </div>
            </div>
          )}
        </fieldset>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid var(--adaptive-border, #e2e8f0)",
            paddingTop: 16,
          }}
        >
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={saving}
          >
            {readOnly ? "Tutup" : "Batal"}
          </button>
          {!readOnly && (
            <button type="submit" className="button primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan Kebijakan"}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

export function Catalog({
  user,
  config,
  onConfigChange,
}: {
  user: any;
  config?: any;
  onConfigChange?: () => void;
}) {
  const courses = useApi<any[]>("/courses");
  const [editing, setEditing] = useState<any>(null),
    [governanceModal, setGovernanceModal] = useState(false),
    [importModal, setImportModal] = useState(false),
    [departmentFilter, setDepartmentFilter] = useState("");
  const superAdmin = user.role === "SUPER_ADMIN";
  const canCreateCatalog =
    superAdmin ||
    (user.role === "DEPARTMENT_ADMIN" && user.departmentScopes?.length > 0);
  const departments = [
    ...new Set((courses.data ?? []).map((c) => c.departmentCode)),
  ].sort();
  const visibleCourses = (courses.data ?? []).filter(
    (c) =>
      !superAdmin || !departmentFilter || c.departmentCode === departmentFilter,
  );
  const deleteCourse = async (course: any) => {
    if (
      !(await confirmAction(
        `Hapus mata kuliah ${course.code} · ${course.title}? Tindakan ini tidak dapat dibatalkan.`,
      ))
    )
      return false;
    await api(`/courses/${course.id}`, "DELETE");
    courses.reload();
  };
  return (
    <>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">{t.academicSpace}</div>
          <h1>{t.catalog}</h1>
        </div>
        <div className="toolbar">
          {["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role) && (
            <button
              className="secondary"
              onClick={() => setGovernanceModal(true)}
            >
              <CalendarDays size={16} />
              Tahun Ajaran: {config?.academicYear || "2026/2027 Ganjil"}
            </button>
          )}
          {["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role) && (
            <button
              className="secondary"
              onClick={() => setImportModal(true)}
              disabled={!canCreateCatalog}
            >
              <UploadCloud size={16} />
              Impor Katalog
            </button>
          )}
          {["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role) && (
            <button
              className="primary"
              onClick={() => setEditing({})}
              disabled={!canCreateCatalog}
            >
              <Plus size={16} />
              {t.newCourse}
            </button>
          )}
        </div>
      </div>
      {superAdmin && departments.length > 0 && (
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <label>
            Program studi
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">Semua prodi</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {formatDepartmentScope(department)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {courses.error ? (
        <Notice error={courses.error} />
      ) : courses.loading && !courses.data ? (
        <Loading />
      ) : (
        <div className="table-wrap card phone-record-table catalog-table">
          <table>
            <thead>
              <tr>
                {[t.code, t.title, t.department, t.credits, t.status, ""].map(
                  (label, i) => (
                    <th key={i}>{label}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {visibleCourses.map((c) => (
                <tr key={c.id}>
                  <td data-label={t.code}>{c.code}</td>
                  <td className="record-title">
                    <strong>{c.title}</strong>
                    <small className="block">{c.description}</small>
                  </td>
                  <td data-label={t.department}>
                    {formatDepartmentScope(c.departmentCode)}
                  </td>
                  <td data-label={t.credits}>{c.credits}</td>
                  <td data-label={t.status}>
                    <Badge value={c.status} />
                  </td>
                  <td className="record-actions">
                    {(() => {
                      const canManageCourse =
                        superAdmin ||
                        (user.role === "DEPARTMENT_ADMIN" &&
                          user.departmentScopes?.includes(c.departmentCode));
                      if (!canManageCourse) {
                        return (
                          <span
                            className="text-muted"
                            style={{
                              fontSize: "0.82rem",
                              color: "var(--muted, #64748b)",
                            }}
                          >
                            Hanya-baca
                          </span>
                        );
                      }
                      return (
                        <div className="catalog-actions">
                          <div className="catalog-action-buttons">
                            <button
                              className="secondary"
                              onClick={() => setEditing(c)}
                            >
                              {c.status === "ARCHIVED"
                                ? "Aktifkan atau ubah"
                                : t.edit}
                            </button>
                            {c._count?.classes === 0 &&
                            c._count?.questionBanks === 0 ? (
                              <Action
                                className="danger"
                                label={`Hapus ${c.code} · ${c.title}`}
                                busyLabel="Menghapus…"
                                successMessage="Mata kuliah dihapus."
                                run={() => deleteCourse(c)}
                              >
                                Hapus
                              </Action>
                            ) : null}
                          </div>
                          {!(
                            c._count?.classes === 0 &&
                            c._count?.questionBanks === 0
                          ) && (
                            <small>
                              Kelas atau bank soal terkait; gunakan status
                              Arsip.
                            </small>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <Modal
          title={editing.id ? t.edit : t.newCourse}
          onClose={() => setEditing(null)}
        >
          <Form
            draftKey={`course:${editing?.id ?? "new"}`}
            draftVersion={editing.updatedAt}
            onSubmit={async (f) => {
              await api(
                `/courses${editing.id ? `/${editing.id}` : ""}`,
                editing.id ? "PATCH" : "POST",
                {
                  code: textValue(f, "code"),
                  title: textValue(f, "title"),
                  description: textValue(f, "description"),
                  departmentCode: textValue(f, "departmentCode"),
                  credits: numberValue(f, "credits"),
                  status: textValue(f, "status"),
                },
              );
              setEditing(null);
              courses.reload();
            }}
          >
            <div className="form-grid">
              <Field label={t.code}>
                <input name="code" required defaultValue={editing.code} />
              </Field>
              <Field label={t.department}>
                {superAdmin ? (
                  <select
                    name="departmentCode"
                    required
                    defaultValue={editing.departmentCode ?? "IF"}
                  >
                    {[
                      ...new Set([
                        ...departments,
                        ...Object.keys(DEPARTMENT_NAMES),
                      ]),
                    ]
                      .filter((c) => !["IH", "MH", "MN", "FARM"].includes(c))
                      .sort()
                      .map((dept) => (
                        <option key={dept} value={dept}>
                          {formatDepartmentScope(dept)}
                        </option>
                      ))}
                  </select>
                ) : (
                  <select
                    name="departmentCode"
                    required
                    defaultValue={
                      editing.departmentCode ?? user.departmentScopes?.[0] ?? ""
                    }
                  >
                    {(user.departmentScopes ?? []).map((department: string) => (
                      <option key={department} value={department}>
                        {formatDepartmentScope(department)}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Field label={t.title}>
              <input name="title" required defaultValue={editing.title} />
            </Field>
            <Field label={t.description}>
              <textarea name="description" defaultValue={editing.description} />
            </Field>
            <div className="form-grid">
              <Field label={t.credits}>
                <input
                  type="number"
                  name="credits"
                  min={1}
                  max={12}
                  required
                  defaultValue={editing.credits ?? 3}
                />
              </Field>
              <Field label={t.status}>
                <select name="status" defaultValue={editing.status ?? "DRAFT"}>
                  {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
                    <option key={s} value={s}>
                      {(t.statuses as any)[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Form>
        </Modal>
      )}
      {governanceModal && (
        <AcademicGovernanceModal
          config={config}
          readOnly={user.role !== "SUPER_ADMIN"}
          onClose={() => setGovernanceModal(false)}
          onSaved={() => {
            onConfigChange?.();
            courses.reload();
          }}
        />
      )}
      {importModal && (
        <CourseImportModal
          user={user}
          onClose={() => setImportModal(false)}
          onSuccess={() => {
            courses.reload();
          }}
        />
      )}
    </>
  );
}
export function CourseImportModal({
  user,
  onClose,
  onSuccess,
}: {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [overrideAll, setOverrideAll] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const defaultDept = user.departmentScopes?.[0] || "IF";

  const handleParse = (text: string, forceOverride = overrideAll) => {
    try {
      if (!text.trim()) {
        setRows([]);
        setReview(null);
        setError(null);
        return;
      }
      const parsed = parseCsv(text.trim());
      if (parsed.length < 2) {
        setRows([]);
        setReview(null);
        setError(
          "Format CSV minimal harus memiliki 1 baris judul kolom (header) dan 1 baris data.",
        );
        return;
      }
      const headerRow = parsed[0].map((h) => h.trim().toLowerCase());
      const codeIdx = headerRow.findIndex((h) =>
        ["code", "kode", "kodemk", "kode_mk"].includes(h),
      );
      const titleIdx = headerRow.findIndex((h) =>
        [
          "title",
          "nama",
          "namamk",
          "nama_mk",
          "matakuliah",
          "mata_kuliah",
        ].includes(h),
      );
      const creditsIdx = headerRow.findIndex((h) =>
        ["credits", "sks", "bobot"].includes(h),
      );
      const deptIdx = headerRow.findIndex((h) =>
        ["departmentcode", "department", "prodi", "jurusan", "dept"].includes(
          h,
        ),
      );
      const descIdx = headerRow.findIndex((h) =>
        ["description", "deskripsi", "keterangan"].includes(h),
      );
      const statusIdx = headerRow.findIndex((h) => ["status"].includes(h));

      if (codeIdx === -1 || titleIdx === -1) {
        setError(
          "Kolom header 'kode' (atau 'code') dan 'nama' (atau 'title') wajib ada pada baris pertama CSV.",
        );
        return;
      }

      const parsedRows = parsed.slice(1).map((r) => {
        const code = codeIdx !== -1 ? String(r[codeIdx] ?? "").trim() : "";
        const title = titleIdx !== -1 ? String(r[titleIdx] ?? "").trim() : "";
        const credits = creditsIdx !== -1 ? Number(r[creditsIdx] || 3) : 3;
        const departmentCode =
          deptIdx !== -1 && r[deptIdx]
            ? String(r[deptIdx]).trim().toUpperCase()
            : defaultDept;
        const description =
          descIdx !== -1 ? String(r[descIdx] ?? "").trim() : "";
        const status =
          statusIdx !== -1 && r[statusIdx]
            ? String(r[statusIdx]).trim().toUpperCase()
            : "PUBLISHED";

        return {
          values: {
            code,
            title,
            credits: isNaN(credits) ? 3 : credits,
            departmentCode,
            description,
            status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)
              ? status
              : "PUBLISHED",
          },
          exclude: false,
          override: forceOverride,
        };
      });

      setRows(parsedRows);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Gagal memproses berkas/format CSV.");
    }
  };

  useEffect(() => {
    if (!rows.length) {
      setReview(null);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api("/courses/imports/preview", "POST", { rows })
        .then((res: any) => {
          if (active) {
            setReview(res);
            setError(null);
          }
        })
        .catch((e: any) => {
          if (active) setError(e.message || "Gagal memvalidasi data impor.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [rows]);

  const toggleExclude = (index: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, exclude: !r.exclude } : r)),
    );
  };

  const handleOverrideToggle = (checked: boolean) => {
    setOverrideAll(checked);
    setRows((prev) => prev.map((r) => ({ ...r, override: checked })));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? "");
      setCsvText(content);
      handleParse(content, overrideAll);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    const sample = `kode,nama,sks,prodi,deskripsi,status\nIF101,Algoritma dan Pemrograman I,3,${defaultDept},Konsep dasar pemrograman dan algoritma komputasi,PUBLISHED\nIF102,Struktur Data,3,${defaultDept},Array linked-list stack queue tree dan graf,PUBLISHED\nIF201,Basis Data,3,${defaultDept},Perancangan sistem basis data relasional dan SQL,PUBLISHED\nIF202,Pemrograman Berorientasi Objek,3,${defaultDept},Konsep OOP pewarisan polimorfisme dan enkapsulasi,PUBLISHED\nIF301,Jaringan Komputer,3,${defaultDept},Arsitektur protokol jaringan TCP/IP dan keamanan,PUBLISHED`;
    setCsvText(sample);
    handleParse(sample, overrideAll);
  };

  const handleDownloadTemplate = () => {
    const template = `kode,nama,sks,prodi,deskripsi,status\nIF101,Nama Mata Kuliah Contoh,3,${defaultDept},Deskripsi ringkas mata kuliah,PUBLISHED`;
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-katalog-matakuliah.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCommit = async () => {
    if (!review || review.ready === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res: any = await api("/courses/imports/commit", "POST", { rows });
      setSuccessInfo(res);
      onSuccess();
    } catch (e: any) {
      setError(e.message || "Gagal menyimpan data impor.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Impor Massal Katalog Mata Kuliah" wide onClose={onClose}>
      <p style={{ marginTop: 0, color: "var(--muted-foreground)" }}>
        Tambahkan banyak mata kuliah sekaligus ke kurikulum program studi
        menggunakan format CSV. Sistem memverifikasi kode mata kuliah unik,
        kewenangan prodi, dan bobot SKS.
      </p>

      {successInfo ? (
        <div style={{ padding: "24px 0", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              padding: 12,
              borderRadius: "50%",
              background:
                "var(--adaptive-success-soft, rgba(34, 197, 94, 0.1))",
              color: "var(--adaptive-success-text, #16a34a)",
              marginBottom: 12,
            }}
          >
            <CheckCircle size={36} />
          </div>
          <h3 style={{ margin: "0 0 8px" }}>Impor Katalog Berhasil!</h3>
          <p style={{ color: "var(--muted-foreground)", margin: "0 0 20px" }}>
            Total <strong>{successInfo.imported}</strong> mata kuliah diproses (
            {successInfo.created} dibuat baru, {successInfo.updated}{" "}
            diperbarui).
          </p>
          <button className="primary" onClick={onClose}>
            Selesai
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <label
              className="button secondary"
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                margin: 0,
              }}
            >
              <UploadCloud size={15} />
              Pilih Berkas CSV
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
            <button
              type="button"
              className="secondary"
              onClick={handleDownloadTemplate}
            >
              <Download size={15} />
              Unduh Template CSV
            </button>
            <button
              type="button"
              className="secondary"
              onClick={handleLoadSample}
            >
              Isi Contoh Data
            </button>
          </div>

          <Field label="Data CSV (atau tempel teks di sini)">
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                handleParse(e.target.value);
              }}
              placeholder={
                "kode,nama,sks,prodi,deskripsi,status\nIF101,Algoritma dan Pemrograman I,3,IF,Dasar pemrograman,PUBLISHED\n..."
              }
              style={{ fontFamily: "monospace", fontSize: "0.82rem" }}
            />
          </Field>

          {rows.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                margin: "10px 0 16px",
              }}
            >
              <input
                type="checkbox"
                id="override-all"
                checked={overrideAll}
                onChange={(e) => handleOverrideToggle(e.target.checked)}
              />
              <label
                htmlFor="override-all"
                style={{ fontSize: "0.88rem", cursor: "pointer" }}
              >
                Perbarui (timpa) data jika kode mata kuliah sudah terdaftar di
                database
              </label>
            </div>
          )}

          {error && <Notice error={error} onClose={() => setError(null)} />}

          {loading && <Loading />}

          {review && !loading && (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                  Pratinjau Impor:{" "}
                  <span
                    style={{ color: "var(--adaptive-success-text, #16a34a)" }}
                  >
                    {review.ready} Siap
                  </span>
                  {review.issues > 0 && (
                    <span
                      style={{
                        color: "var(--adaptive-danger-text, #dc2626)",
                        marginLeft: 8,
                      }}
                    >
                      • {review.issues} Perlu Diperiksa
                    </span>
                  )}{" "}
                  dari {review.rows.length} Baris
                </div>
              </div>

              <div
                className="table-wrap card phone-record-table"
                style={{ maxHeight: 280, overflowY: "auto" }}
              >
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 45 }}>No</th>
                      <th>Kode</th>
                      <th>Nama Mata Kuliah</th>
                      <th style={{ width: 60 }}>SKS</th>
                      <th style={{ width: 70 }}>Prodi</th>
                      <th>Status / Catatan</th>
                      <th style={{ width: 80 }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.rows.map((row: any, idx: number) => {
                      const isReady = row.status === "READY";
                      const isExcluded = row.status === "EXCLUDED";
                      const hasConflict =
                        row.issues?.includes("DATABASE_CONFLICT");
                      const issuesList = row.issues ?? [];

                      return (
                        <tr
                          key={idx}
                          style={{
                            opacity: isExcluded ? 0.45 : 1,
                            background: isExcluded
                              ? "var(--muted-soft)"
                              : !isReady && !hasConflict
                                ? "var(--adaptive-danger-soft, rgba(239, 68, 68, 0.05))"
                                : hasConflict
                                  ? "var(--adaptive-warning-soft, rgba(245, 158, 11, 0.05))"
                                  : undefined,
                          }}
                        >
                          <td data-label="Baris">{row.rowNumber}</td>
                          <td data-label="Kode">
                            <strong>{row.values?.code || "—"}</strong>
                          </td>
                          <td className="record-title">
                            {row.values?.title || "—"}
                          </td>
                          <td data-label="SKS">{row.values?.credits}</td>
                          <td data-label="Prodi">
                            {row.values?.departmentCode}
                          </td>
                          <td data-label="Status / catatan">
                            {isExcluded ? (
                              <span
                                style={{ color: "var(--muted-foreground)" }}
                              >
                                Diabaikan
                              </span>
                            ) : isReady ? (
                              <span
                                style={{
                                  color:
                                    "var(--adaptive-success-text, #16a34a)",
                                  fontWeight: 600,
                                }}
                              >
                                {row.existingId
                                  ? "Siap Ditimpa"
                                  : "Siap Dibuat"}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "var(--adaptive-danger-text, #dc2626)",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {issuesList
                                  .map((issue: string) => {
                                    if (issue === "DATABASE_CONFLICT")
                                      return "Sudah terdaftar di DB (centang timpa untuk update)";
                                    if (issue === "DUPLICATE_FILE")
                                      return "Duplikat di berkas";
                                    if (issue === "WRITE_ACCESS_DENIED")
                                      return "Bukan prodi wewenang Anda";
                                    if (issue === "INVALID_CREDITS")
                                      return "SKS tidak valid (1-12)";
                                    if (issue === "MISSING_CODE")
                                      return "Kode wajib diisi";
                                    if (issue === "MISSING_TITLE")
                                      return "Nama MK wajib diisi";
                                    return issue;
                                  })
                                  .join("; ")}
                              </span>
                            )}
                          </td>
                          <td className="record-actions">
                            <button
                              type="button"
                              className="secondary"
                              style={{
                                padding: "3px 8px",
                                fontSize: "0.78rem",
                              }}
                              onClick={() => toggleExclude(idx)}
                            >
                              {isExcluded ? "Sertakan" : "Abaikan"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="button"
              className="primary"
              disabled={
                !review || review.ready === 0 || review.issues > 0 || submitting
              }
              onClick={handleCommit}
            >
              {submitting
                ? "Menyimpan..."
                : `Impor ${review?.ready ?? 0} Mata Kuliah`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
export function Profile({
  user,
  accountUrl,
}: {
  user: any;
  accountUrl?: string;
}) {
  const [count, setCount] = useState<number | null>(null),
    [cleared, setCleared] = useState(false),
    [failure, setFailure] = useState<Error | null>(null);
  useEffect(() => {
    countDrafts(user.id)
      .then(setCount)
      .catch(() =>
        setFailure(new Error("Jumlah draft lokal belum dapat dibaca.")),
      );
  }, [user.id]);
  return (
    <>
      <div className="page-heading">
        <h1>Profil akun</h1>
        <p>Identitas akademik dan pengaturan data pada perangkat ini.</p>
      </div>
      <div className="profile-layout">
        <section className="card" aria-label="Identitas akun">
          <div className="profile-identity">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Avatar name={user.name} userId={user.id} large />
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <label
                  className="button secondary sm"
                  style={{
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    padding: "4px 8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Camera size={13} />
                  Ubah Foto
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Ukuran foto maksimal 5 MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = String(ev.target?.result ?? "");
                        try {
                          localStorage.setItem(
                            `user_photo_${user.id}`,
                            dataUrl,
                          );
                          window.dispatchEvent(new Event("user-photo-changed"));
                        } catch {
                          alert(
                            "Gagal menyimpan foto ke penyimpanan peramban.",
                          );
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="button secondary sm"
                  style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                  onClick={() => {
                    localStorage.removeItem(`user_photo_${user.id}`);
                    window.dispatchEvent(new Event("user-photo-changed"));
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
            <div>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <span className="badge">{(t.roles as any)[user.role]}</span>
            </div>
          </div>
          <dl className="profile-fields">
            <div>
              <dt>Nama lengkap</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Alamat email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Nama pengguna SSO</dt>
              <dd>{user.username || "Belum tersedia"}</dd>
            </div>
            <div>
              <dt>
                {(() => {
                  const effectiveType =
                    user.userType === "ADMIN" || user.userType === "STAFF"
                      ? "NIP"
                      : user.userType === "STUDENT"
                        ? "NIM"
                        : user.userType === "LECTURER"
                          ? user.identifierType === "NIP"
                            ? "NIP"
                            : "NIDN"
                          : user.identifierType || "OTHER";
                  return (
                    (t.identifierTypes as any)[effectiveType] ??
                    "Nomor identitas"
                  );
                })()}
              </dt>
              <dd>
                {(() => {
                  if (!user.identifierValue) return "Belum tersedia";
                  if (
                    typeof user.identifierValue === "string" &&
                    user.identifierValue.includes("@")
                  ) {
                    return user.identifierValue.split("@")[0];
                  }
                  return user.identifierValue;
                })()}
              </dd>
            </div>
            <div>
              <dt>Jenis pengguna</dt>
              <dd>{(t.userTypes as any)[user.userType] ?? user.userType}</dd>
            </div>
            <div>
              <dt>Status akun</dt>
              <dd>
                <span
                  className={
                    user.status === "DISABLED"
                      ? "badge badge-archived"
                      : "badge badge-published"
                  }
                >
                  {user.status === "DISABLED" ? "Tidak aktif" : "Aktif"}
                </span>
              </dd>
            </div>
            <div>
              <dt>Peran akademik</dt>
              <dd>{(t.roles as any)[user.role]}</dd>
            </div>
            <div>
              <dt>Sumber identitas</dt>
              <dd>
                SSO UAY
                <small className="block mono">{user.ssoUserId}</small>
              </dd>
            </div>
          </dl>
        </section>
        <div className="profile-side">
          <section className="card">
            <h2>Tampilan</h2>
            <ThemePreferenceControl />
          </section>
          <section className="card">
            <h2>Kelola identitas</h2>
            <p>
              Informasi profil mengikuti akun SSO UAY. Jika ada data yang
              keliru, hubungi pengelola akun akademik.
            </p>
            {accountUrl ? (
              <a
                className="secondary"
                href={accountUrl}
                target="_blank"
                rel="noreferrer"
              >
                Kelola akun SSO <ArrowUpRight size={16} />
                <span className="sr-only">(tab baru)</span>
              </a>
            ) : (
              <p>Tautan pengelolaan akun SSO belum tersedia.</p>
            )}
          </section>
          <section className="card">
            <h2>Draft pada perangkat</h2>
            <p>
              {count === null
                ? "Memeriksa draft lokal…"
                : count + " draft tersimpan pada perangkat ini."}{" "}
              Draft membantu memulihkan perubahan yang belum dikirim ke server.
            </p>
            <Action
              disabled={count === 0 || count === null}
              run={async () => {
                if (
                  !(await confirmAction(
                    "Hapus " +
                      count +
                      " draft lokal akun ini? Perubahan yang belum dikirim ke server akan hilang dari perangkat ini.",
                  ))
                )
                  return;
                await removeDraft(user.id);
                setCount(0);
                setCleared(true);
                setFailure(null);
              }}
            >
              Hapus draft lokal
            </Action>
            {cleared && (
              <Notice onClose={() => setCleared(false)}>
                Draft lokal berhasil dihapus.
              </Notice>
            )}
            {failure && (
              <Notice error={failure} onClose={() => setFailure(null)} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
