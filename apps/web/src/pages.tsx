import { confirmAction } from "./confirm";
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
  Code2,
  Database,
  Terminal,
  FileText,
  CheckCheck,
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
export function ClassCard({ item, index = 0 }: { item: any; index?: number }) {
  const icons = [Code2, Database, Terminal];
  const Icon = icons[index % 3];
  const isInactive =
    Boolean(item.isInactiveParticipant) ||
    (item.enrollments?.length > 0 && !item.enrollments[0].isActive);
  const isArchived = item.status === "ARCHIVED";
  return (
    <a
      className={`course-card course-tone-${index % 3} ${isInactive ? "inactive-participant" : ""} ${isArchived ? "archived-class" : ""}`}
      href={classPath(item)}
    >
      <div className="course-top">
        <span className="course-icon">
          <Icon size={27} />
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
        <h3>{item.course.title}</h3>
        <p>
          {item.name} · {item.academicYear}
        </p>
        <div className="instructor-line">
          <span className="mini-avatar">
            {item.instructors[0]?.user?.name?.[0] ?? "U"}
          </span>
          {item.instructors
            .map((i: any) => i.user?.name?.split(",")[0] ?? "—")
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
export function Dashboard({ page, user }: { page: string; user: any }) {
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
  const details = needsSummary ? (classes.data ?? []) : [];
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [modal, setModal] = useState(false);
  const teacher = user.role === "INSTRUCTOR";
  if (classes.loading) return <Loading />;
  if (classes.error) return <Notice error={classes.error} />;
  const items = (classes.data ?? []).filter(
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
        classes={classes.data ?? []}
        courses={courses}
        reload={classes.reload}
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
        {notifications.loading ? (
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
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    onClick={() => {
                      if (!n.isRead) {
                        api(`/notifications/${n.id}/read`, "POST", {})
                          .then(() => {
                            window.dispatchEvent(new Event("notifications-changed"));
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
                {!n.isRead && (
                  <Action
                    run={async () => {
                      await api(`/notifications/${n.id}/read`, "POST", {});
                      window.dispatchEvent(new Event("notifications-changed"));
                      notifications.reload();
                    }}
                  >
                    {t.markRead}
                  </Action>
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
        <div className="cards">
          {items.map((c) => (
            <a key={c.id} href={`${classPath(c)}/gradebook`} className="card">
              <span className="eyebrow">{c.course.code}</span>
              <h3>{c.course.title}</h3>
              <p>{c.name}</p>
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
        {page === "classes" && (admin || user.role === "STUDENT") && (
          <button className="secondary" onClick={() => setModal(true)}>
            <Plus size={16} />
            {admin ? t.newClass : t.joinClass}
          </button>
        )}
      </div>
      {page === "dashboard" && (
        <>
          <section className="welcome-panel compact">
            <div>
              <span className="pill">{t.semester}</span>
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
          <div className="stats-grid">
            {[
              [
                BookOpen,
                t.activeClasses,
                items.filter((c) => c.status === "PUBLISHED").length,
              ],
              [
                Users,
                teacher ? t.participants : t.learningProgress,
                teacher
                  ? items.reduce((sum, c) => sum + c._count.enrollments, 0)
                  : `${Math.round(materialProgress.reduce((sum, p) => sum + p, 0) / (materialProgress.length || 1))}%`,
              ],
              [
                CalendarDays,
                t.meetings,
                items.reduce((sum, c) => sum + c._count.sections, 0),
              ],
              [
                ClipboardCheck,
                teacher ? t.pendingGrading : t.activity,
                teacher
                  ? gradingQueue.reduce((sum, item) => sum + item.count, 0)
                  : activities.length,
              ],
            ].map(([Icon, label, value]: any) => (
              <div className="stat" key={label}>
                <span className="stat-icon">
                  <Icon size={19} />
                </span>
                <div>
                  <span>{label}</span>
                  <strong>{value.toString().padStart(2, "0")}</strong>
                </div>
              </div>
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
          )}
          <div className="cards">
            {items.map((item, index) => (
              <ClassCard key={item.id} item={item} index={index} />
            ))}
          </div>
          {!items.length && (
            <Empty>
              <h3>{t.emptyClasses}</h3>
              <p>{admin ? t.adminEmptyClasses : t.emptyDescription}</p>
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
        (admin ? (
          <ClassForm
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
}: {
  user: any;
  classes: any[];
  courses: { data: any[] | null; loading: boolean; error: Error | null };
  reload: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const departmentAdmin = user.role === "DEPARTMENT_ADMIN";
  const drafts = classes.filter((c) => c.status === "DRAFT");
  const scope = departmentAdmin
    ? user.departmentScopes && user.departmentScopes.length > 0
      ? user.departmentScopes
          .map((c: string) => formatDepartmentScope(c))
          .join(", ")
      : t.noDepartmentScope
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
        <button className="secondary" onClick={() => setCreating(true)}>
          <Plus size={16} />
          {t.newClass}
        </button>
      </div>
      <section className="welcome-panel compact">
        <div>
          <span className="pill">{t.semester}</span>
          <h2>
            {departmentAdmin ? t.departmentManagement : t.academicManagement}
          </h2>
          <p>{t.adminDashboardDescription}</p>
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
            courses.loading || courses.error
              ? "—"
              : (courses.data?.length ?? 0),
          ],
          [
            BookOpen,
            t.activeClasses,
            classes.filter((c) => c.status === "PUBLISHED").length,
          ],
          [FileText, t.draftClasses, drafts.length],
          [
            Users,
            t.activeEnrollments,
            classes.reduce((sum, c) => sum + c._count.enrollments, 0),
          ],
        ].map(([Icon, label, value]: any) => (
          <div className="stat" key={label}>
            <span className="stat-icon">
              <Icon size={19} />
            </span>
            <div>
              <span>{label}</span>
              <strong>{String(value).padStart(2, "0")}</strong>
            </div>
          </div>
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
      </div>
      <div className="section-heading">
        <h2>
          {t.draftClasses} <span className="count">{drafts.length}</span>
        </h2>
        <a className="text-link" href="/classes">
          {t.manageClasses}
          <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="card activity-list">
        {drafts.length ? (
          drafts.slice(0, 5).map((cls) => (
            <a className="activity-row" key={cls.id} href={classPath(cls)}>
              <span className="activity-icon">
                <FileText size={18} />
              </span>
              <div>
                <h3>{cls.course.title}</h3>
                <p>
                  {cls.name} · {cls.academicYear}
                </p>
              </div>
              <Badge value={cls.status} />
              <ChevronRight size={18} />
            </a>
          ))
        ) : (
          <Empty>{t.noDraftClasses}</Empty>
        )}
      </div>
      {creating && (
        <ClassForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
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
            : (selectedClassId || textValue(f, "classId"));
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
              {openClasses.loading ? (
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
            <div style={{ textAlign: "right", marginTop: -6, marginBottom: 12 }}>
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
            <div style={{ textAlign: "right", marginTop: -6, marginBottom: 12 }}>
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

export function ClassForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const courses = useApi<any[]>("/courses");
  const [search, setSearch] = useState(""),
    [users, setUsers] = useState<any[]>([]),
    [selected, setSelected] = useState<string[]>([]),
    [selectedUsers, setSelectedUsers] = useState<any[]>([]),
    [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await api(`/users?q=${encodeURIComponent(trimmed)}`);
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
        draftValue={{ selected, selectedUsers, users, search }}
        onRestoreDraft={(v) => {
          setSelected(v?.selected ?? []);
          setSelectedUsers(v?.selectedUsers ?? []);
          setUsers(v?.users ?? []);
          setSearch(v?.search ?? "");
        }}
        onCancel={onClose}
        onSubmit={async (f) => {
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
        <Field label={t.course}>
          <select required name="courseId">
            <option value="">{t.choose}</option>
            {courses.data
              ?.filter((c) => c.status !== "ARCHIVED")
              .map((c) => (
                <option value={c.id} key={c.id}>
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
              defaultValue="2026/2027 Ganjil"
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
          <input
            name="key"
            minLength={6}
            placeholder="Minimal 6 karakter (opsional)"
            onInvalid={(e) =>
              (e.target as HTMLInputElement).setCustomValidity(
                "Kunci pendaftaran mandiri minimal 6 karakter.",
              )
            }
            onInput={(e) =>
              (e.target as HTMLInputElement).setCustomValidity("")
            }
          />
        </Field>
        <Field label={t.instructors}>
          <div style={{ position: "relative" }}>
            <div className="inline-form">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama atau NIDN dosen..."
              />
              <button
                type="button"
                className="secondary"
                disabled={search.trim().length < 2}
                onClick={async () => {
                  if (search.trim().length < 2) return;
                  try {
                    setUsers(await api(`/users?q=${encodeURIComponent(search.trim())}`));
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
              <small style={{ display: "block", marginTop: 4, color: "#64748b" }}>
                Ketik minimal 2 karakter untuk mencari dosen...
              </small>
            )}
            {search.trim().length >= 2 && users.filter((u) => u.role !== "STUDENT").length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  maxHeight: 200,
                  overflowY: "auto",
                  marginTop: 4,
                }}
              >
                {users
                  .filter((u) => u.role !== "STUDENT")
                  .map((u) => {
                    const isPicked = selected.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => {
                          if (!isPicked) {
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
                          setSearch("");
                        }}
                        style={{
                          padding: "8px 12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: isPicked ? "#f0fdf4" : "transparent",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", fontSize: "0.88rem" }}>
                            {u.name}
                          </strong>
                          <small style={{ color: "#64748b" }}>
                            {u.identifierValue ?? "Dosen"}
                          </small>
                        </div>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: isPicked ? "#15803d" : "#0284c7",
                          }}
                        >
                          {isPicked ? "Terpilih ✓" : "+ Tambah"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </Field>
        {selectedUsers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 12px" }}>
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 16,
                  background: "#e0f2fe",
                  color: "#0369a1",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                <span>{u.name}</span>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "1rem",
                    lineHeight: 1,
                    color: "#0284c7",
                  }}
                  onClick={() => {
                    setSelected((prev) => prev.filter((id) => id !== u.id));
                    setSelectedUsers((prev) => prev.filter((x) => x.id !== u.id));
                  }}
                  aria-label={`Hapus ${u.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {users
          .filter(
            (u) =>
              u.role !== "STUDENT" &&
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
        {error && <Notice error={error} />}
      </Form>
    </Modal>
  );
}
export function Catalog({ user }: { user: any }) {
  const courses = useApi<any[]>("/courses");
  const [editing, setEditing] = useState<any>(null),
    [classModal, setClassModal] = useState(false);
  return (
    <>
      <div className="page-heading heading-with-action">
        <div>
          <div className="eyebrow">{t.academicSpace}</div>
          <h1>{t.catalog}</h1>
        </div>
        <div className="toolbar">
          <button className="secondary" onClick={() => setClassModal(true)}>
            {t.newClass}
          </button>
          <button className="primary" onClick={() => setEditing({})}>
            <Plus size={16} />
            {t.newCourse}
          </button>
        </div>
      </div>
      {courses.error ? (
        <Notice error={courses.error} />
      ) : courses.loading ? (
        <Loading />
      ) : (
        <div className="table-wrap card">
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
              {courses.data?.map((c) => (
                <tr key={c.id}>
                  <td>{c.code}</td>
                  <td>
                    <strong>{c.title}</strong>
                    <small className="block">{c.description}</small>
                  </td>
                  <td>{c.departmentCode}</td>
                  <td>{c.credits}</td>
                  <td>
                    <Badge value={c.status} />
                  </td>
                  <td>
                    <button
                      disabled={c.status === "ARCHIVED"}
                      className="secondary"
                      onClick={() => setEditing(c)}
                    >
                      {t.edit}
                    </button>
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
                <input
                  name="departmentCode"
                  required
                  defaultValue={
                    editing.departmentCode ?? user.departmentScopes[0] ?? "IF"
                  }
                />
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
      {classModal && (
        <ClassForm
          onClose={() => setClassModal(false)}
          onSaved={() => setClassModal(false)}
        />
      )}
    </>
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
            <Avatar name={user.name} large />
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
                {(t.identifierTypes as any)[user.identifierType] ??
                  "Nomor identitas"}
              </dt>
              <dd>{user.identifierValue || "Belum tersedia"}</dd>
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
            {cleared && <Notice>Draft lokal berhasil dihapus.</Notice>}
            {failure && <Notice error={failure} />}
          </section>
        </div>
      </div>
    </>
  );
}
