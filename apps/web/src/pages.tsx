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
export function ClassCard({ item, index = 0 }: { item: any; index?: number }) {
  const icons = [Code2, Database, Terminal];
  const Icon = icons[index % 3];
  return (
    <a
      className={`course-card course-tone-${index % 3}`}
      href={`#/classes/${item.id}`}
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
          <Badge value={item.status} />
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
  const classes = useApi<any[]>("/course-classes");
  const notifications = useApi<any[]>(
    page === "notifications" ? "/notifications" : null,
  );
  const [details, setDetails] = useState<any[]>([]),
    [detailError, setDetailError] = useState<Error | null>(null);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("ALL"),
    [modal, setModal] = useState(false);
  const teacher = user.role !== "STUDENT";
  useEffect(() => {
    let active = true;
    if (classes.data)
      Promise.all(classes.data.map((c) => api(`/course-classes/${c.id}`)))
        .then((data) => {
          if (active) setDetails(data);
        })
        .catch((e) => {
          if (active) setDetailError(e);
        });
    return () => {
      active = false;
    };
  }, [classes.data]);
  if (classes.loading) return <Loading />;
  if (classes.error) return <Notice error={classes.error} />;
  const items = (classes.data ?? []).filter(
    (c) =>
      (filter === "ALL" || c.status === filter) &&
      `${c.course.title} ${c.course.code} ${c.name}`
        .toLowerCase()
        .includes(search.toLowerCase()),
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
          date: a.deadline,
        })),
        ...s.quizzes
          .filter((q: any) => q.status === "PUBLISHED")
          .map((q: any) => ({
            ...q,
            kind: "quiz",
            classTitle: c.course.title,
            classId: c.id,
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
    (c.gradingQueue ?? []).map((item: any) => ({
      ...item,
      title: c.sections
        .flatMap((s: any) => [...s.assignments, ...s.quizzes])
        .find((a: any) => a.id === item.id)?.title,
      classTitle: c.course.title,
    })),
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
                <div>
                  <a href={n.linkUrl ?? "#/"}>
                    <h3>{n.title}</h3>
                  </a>
                  {/* Several events carry the same text in both fields. */}
                  {n.message && n.message !== n.title && <p>{n.message}</p>}
                  <small>{date(n.createdAt)}</small>
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
          <h1>{t.grades}</h1>
        </div>
        <div className="cards">
          {items.map((c) => (
            <a
              key={c.id}
              href={`#/classes/${c.id}?tab=gradebook`}
              className="card"
            >
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
            <span className="eyebrow">
              {t.eyebrow}
            </span>
            <span className="user-role-badge">
              {user.role === "ADMIN"
                ? "Administrator"
                : teacher
                  ? "Dosen Pengampu"
                  : "Mahasiswa"}
            </span>
          </div>
          <h1>
            {page === "dashboard"
              ? `${getTimeGreeting()}, ${user.name.split(" ")[teacher ? 1 : 0] ?? user.name}.`
              : page === "agenda"
                ? t.agenda
                : t.myClasses}
          </h1>
        </div>
        {page === "classes" && user.role !== "INSTRUCTOR" && (
          <button className="secondary" onClick={() => setModal(true)}>
            <Plus size={16} />
            {teacher ? t.newClass : t.joinClass}
          </button>
        )}
      </div>
      {detailError && <Notice error={detailError} />}
      {page === "dashboard" && (
        <>
          <section className="welcome-panel compact">
            <div>
              <span className="pill">{t.semester}</span>
              <h2>{teacher ? t.manageLearning : t.continueLearning}</h2>
              {items[0] && (
                <a className="button light" href={`#/classes/${items[0].id}`}>
                  <span>{t.openClass} · {items[0].course.code}</span>
                  <ArrowUpRight size={18} />
                </a>
              )}
            </div>
            <div className="welcome-emblem">
              <BookOpen size={80} strokeWidth={1} />
              <span>{t.university}</span>
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
            <section className="card">
              <div className="section-heading">
                <h2>{t.pendingGrading}</h2>
              </div>
              <div className="activity-list">
                {gradingQueue.map((item) => (
                  <a
                    className="activity-row"
                    href={`#/${item.kind === "quiz" ? "quizzes" : "assignments"}/${item.id}`}
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
            </section>
          )}
        </>
      )}
      {page !== "agenda" && (
        <>
          <div className="section-heading">
            <h2>
              {t.myClasses} <span className="count">{items.length}</span>
            </h2>
            {page === "dashboard" ? (
              <a className="text-link" href="#/classes">
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
              <p>{t.emptyDescription}</p>
            </Empty>
          )}
        </>
      )}
      {page !== "classes" && (
        <>
          <div className="section-heading">
            <h2>{t.upcoming}</h2>
            {page === "dashboard" && (
              <a className="text-link" href="#/agenda">
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
                    href={`#/${item.kind === "quiz" ? "quizzes" : "assignments"}/${item.id}`}
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
        (teacher ? (
          <ClassForm
            onClose={() => setModal(false)}
            onSaved={() => {
              setModal(false);
              classes.reload();
            }}
          />
        ) : (
          <Modal title={t.joinClass} onClose={() => setModal(false)}>
            <Form
              draftKey="join-class"
              onSubmit={async (f) => {
                await api(
                  `/course-classes/${textValue(f, "classId")}/enroll`,
                  "POST",
                  { enrollmentKey: textValue(f, "key") },
                );
                setModal(false);
                classes.reload();
              }}
            >
              <Field label={t.classId}>
                <input name="classId" required />
              </Field>
              <Field label={t.enrollmentKey}>
                <input name="key" required minLength={6} />
              </Field>
            </Form>
          </Modal>
        ))}
    </>
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
    [error, setError] = useState<Error | null>(null);
  return (
    <Modal title={t.newClass} onClose={onClose}>
      <Form
        draftKey="new-class"
        draftValue={{ selected, users, search }}
        onRestoreDraft={(v) => {
          setSelected(v?.selected ?? []);
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
          <input name="key" minLength={6} />
        </Field>
        <Field label={t.instructors}>
          <div className="inline-form">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchUsers}
            />
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                try {
                  setUsers(await api(`/users?q=${encodeURIComponent(search)}`));
                  setError(null);
                } catch (e) {
                  setError(e as Error);
                }
              }}
            >
              {t.searchLabel}
            </button>
          </div>
        </Field>
        {users
          .filter((u) => u.role !== "STUDENT")
          .map((u) => (
            <label className="check-row" key={u.id}>
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, u.id]
                      : selected.filter((id) => id !== u.id),
                  )
                }
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
export function Profile({ user, issuer }: { user: any; issuer?: string }) {
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
              <dt>{(t.identifierTypes as any)[user.identifierType] ?? "Nomor identitas"}</dt>
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
              Informasi profil mengikuti akun SSO UAY. Perbarui identitas
              melalui layanan akun akademik.
            </p>
            {issuer ? (
              <a
                className="secondary"
                href={issuer}
                target="_blank"
                rel="noreferrer"
              >
                Kelola akun SSO <ArrowUpRight size={16} />
                <span className="sr-only">(tab baru)</span>
              </a>
            ) : (
              <p>Pengelolaan SSO belum tersedia.</p>
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
