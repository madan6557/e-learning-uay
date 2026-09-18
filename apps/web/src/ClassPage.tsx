import { confirmAction } from "./confirm";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  BookOpen,
  FileText,
  ClipboardCheck,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Settings2,
  Pin,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
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
  localInput,
  isoInput,
  textValue,
  navigate,
} from "./lib";
import { ResourceEditor, ResourceViewer } from "./Content";
import { QuizEditor, AssignmentEditor, QuestionEditor } from "./Assessment";
import { Gradebook, ImportPanel } from "./Gradebook";
import { questionSchema } from "../../../packages/shared/src/domain";

export function ClassPage({
  id,
  tab: requestedTab,
  user,
  resourceId,
}: {
  id: string;
  tab: string;
  user: any;
  resourceId: string | null;
}) {
  const info = useApi(`/course-classes/${id}`);
  const [modal, setModal] = useState<any>(null),
    [message, setMessage] = useState("");
  const cls = info.data;
  if (info.loading && !cls) return <Loading />;
  if (info.error) return <Notice error={info.error} />;
  if (!cls) return null;
  const writable =
    cls.canManage &&
    cls.status !== "ARCHIVED" &&
    cls.course.status !== "ARCHIVED";
  const tabs = [
    ["content", t.content],
    ["gradebook", t.gradebook],
    ["announcements", t.announcements],
    ...(cls.canManage
      ? [
          ["participants", t.participants],
          ["banks", t.questionBanks],
          ["files", t.files],
          ["audit", t.audit],
        ]
      : []),
  ];
  // A bookmarked or hand-typed tab that this role cannot see would otherwise
  // render an empty page with no explanation.
  const tab = tabs.some(([value]) => value === requestedTab)
    ? requestedTab
    : "content";
  const saved = () => {
    setModal(null);
    setMessage(t.saved);
    info.reload();
  };
  const resource = cls.sections
    .flatMap((s: any) => s.resources)
    .find((r: any) => r.id === resourceId);
  const isResourceDone = (r: any) => {
    if (!cls?.progress) return false;
    if (r.resourceType === "VIDEO_MEDIA") {
      return (
        (cls.progress.video?.find((p: any) => p.resourceItemId === r.id)
          ?.percent ?? 0) >= 80
      );
    }
    if (r.resourceType === "DOCUMENT") {
      return (
        (cls.progress.slides?.find((p: any) => p.resourceItemId === r.id)
          ?.percent ?? 0) >= 80
      );
    }
    return [
      ...(cls.progress.text ?? []),
      ...(cls.progress.downloads ?? []),
    ].some((p: any) => p.resourceItemId === r.id);
  };
  return (
    <>
      <a className="back-link" href="#/classes">
        <ArrowLeft size={16} />
        {t.myClasses}
      </a>
      <div className="class-heading">
        <div>
          <div className="eyebrow">
            {cls.course.code} · {cls.course.credits} {t.credits}
          </div>
          <h1>{cls.course.title}</h1>
          <div className="class-submeta">
            <p>
              {cls.name} <span>·</span> {cls.academicYear}
            </p>
            {cls.instructors?.length > 0 && (
              <span className="class-instructor-chip">
                <span className="mini-avatar">
                  {cls.instructors[0]?.user?.name?.[0] ?? "U"}
                </span>
                {cls.instructors
                  .map((i: any) => i.user?.name?.split(",")[0] ?? "—")
                  .join(", ")}
              </span>
            )}
          </div>
        </div>
        <div className="toolbar">
          <Badge value={cls.status} />
          {writable && (
            <button
              className="secondary"
              onClick={() => setModal({ kind: "settings" })}
            >
              <Settings2 size={16} />
              {t.settings}
            </button>
          )}
          {cls.canManage && (
            <button
              className="secondary"
              onClick={() => setModal({ kind: "clone" })}
            >
              {t.cloneClass}
            </button>
          )}
        </div>
      </div>
      {!writable && cls.status === "ARCHIVED" && (
        <div className="callout note">{t.readOnly}</div>
      )}
      {message && <Notice>{message}</Notice>}
      <nav className="class-tabs" aria-label={t.menu}>
        {tabs.map(([value, label]) => (
          <a
            key={value}
            className={tab === value ? "selected" : ""}
            aria-current={tab === value ? "page" : undefined}
            href={`#/classes/${id}?tab=${value}`}
          >
            {label}
          </a>
        ))}
      </nav>
      {tab === "content" && (
        <>
          <div className="section-heading">
            <div>
              <h2>
                {t.meetings}{" "}
                <span className="count">{cls.sections.length}</span>
              </h2>
            </div>
            {writable && (
              <button
                className="primary"
                onClick={() => setModal({ kind: "section" })}
              >
                <Plus size={16} />
                {t.newSection}
              </button>
            )}
          </div>
          {!cls.sections.length && <Empty>{t.emptySections}</Empty>}
          <div className="section-list">
            {cls.sections.map((section: any, index: number) => (
              <section className="meeting-card" key={section.id}>
                <div className="meeting-heading">
                  <span className="meeting-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="meeting-info">
                    <div className="meeting-tags">
                      <span className={`meeting-type-tag type-${section.type.toLowerCase()}`}>
                        {(t.sectionTypes as any)[section.type]}
                      </span>
                      {section.startDate && (
                        <span className="meeting-date">
                          <CalendarDays size={13} />
                          {date(section.startDate)}
                        </span>
                      )}
                    </div>
                    <h2>{section.title}</h2>
                  </div>
                  {!section.isVisible && <Badge value="DRAFT" />}
                  {writable && (
                    <div className="toolbar">
                      <Action
                        className="icon-button"
                        disabled={index === 0}
                        run={async () => {
                          const ids = cls.sections.map((s: any) => s.id);
                          [ids[index], ids[index - 1]] = [
                            ids[index - 1],
                            ids[index],
                          ];
                          await api(
                            `/course-classes/${id}/section-order`,
                            "PUT",
                            { ids },
                          );
                          info.reload();
                        }}
                      >
                        <ArrowUp size={16} />
                        <span className="sr-only">{t.moveUp}</span>
                      </Action>
                      <Action
                        className="icon-button"
                        disabled={index === cls.sections.length - 1}
                        run={async () => {
                          const ids = cls.sections.map((s: any) => s.id);
                          [ids[index], ids[index + 1]] = [
                            ids[index + 1],
                            ids[index],
                          ];
                          await api(
                            `/course-classes/${id}/section-order`,
                            "PUT",
                            { ids },
                          );
                          info.reload();
                        }}
                      >
                        <ArrowDown size={16} />
                        <span className="sr-only">{t.moveDown}</span>
                      </Action>
                      <button
                        className="text-button"
                        onClick={() => setModal({ kind: "section", section })}
                      >
                        {t.edit}
                      </button>
                    </div>
                  )}
                </div>
                {section.description && (
                  <p className="meeting-description">{section.description}</p>
                )}
                <div className="learning-items">
                  {section.resources.map((r: any) => {
                    const done = !cls.canManage && isResourceDone(r);
                    return (
                      <div
                        className={`learning-item ${done ? "item-completed" : ""}`}
                        key={r.id}
                      >
                        <a href={`#/classes/${id}?resource=${r.id}`}>
                          <span className="activity-icon material">
                            <BookOpen size={19} />
                          </span>
                          <div>
                            <h3>{r.title}</h3>
                            <small>
                              {(t.resourceTypes as any)[r.resourceType]}
                            </small>
                          </div>
                          {done && (
                            <span className="status-pill completed">
                              <CheckCircle2 size={13} />
                              {t.completed}
                            </span>
                          )}
                          <ChevronRight size={16} />
                        </a>
                        {!r.isVisible && <Badge value="DRAFT" />}
                      {writable && (
                        <button
                          className="text-button"
                          onClick={() =>
                            setModal({
                              kind: "resource",
                              sectionId: section.id,
                              resource: r,
                            })
                          }
                        >
                          {t.edit}
                        </button>
                      )}
                    </div>
                  );
                })}
                  {section.quizzes.map((q: any) => (
                    <div className="learning-item" key={q.id}>
                      <a href={`#/quizzes/${q.id}`}>
                        <span className="activity-icon quiz">
                          <ClipboardCheck size={19} />
                        </span>
                        <div>
                          <h3>{q.title}</h3>
                          <small>
                            {t.quiz} · {q.timeLimitMinutes} min{" "}
                            {q.availableUntil && ` · ${date(q.availableUntil)}`}
                          </small>
                        </div>
                        <ChevronRight size={16} />
                      </a>
                      <Badge value={q.status} />
                    </div>
                  ))}
                  {section.assignments.map((a: any) => (
                    <div className="learning-item" key={a.id}>
                      <a href={`#/assignments/${a.id}`}>
                        <span className="activity-icon assignment">
                          <FileText size={19} />
                        </span>
                        <div>
                          <h3>{a.title}</h3>
                          <small>
                            {t.assignment} ·{" "}
                            {a.deadline ? date(a.deadline) : t.noDeadline}
                          </small>
                        </div>
                        <ChevronRight size={16} />
                      </a>
                      {!a.isVisible && <Badge value="DRAFT" />}
                    </div>
                  ))}
                  {!section.resources.length &&
                    !section.quizzes.length &&
                    !section.assignments.length && (
                      <p className="empty-inline">{t.emptyContent}</p>
                    )}
                </div>
                {writable && (
                  <div className="meeting-actions">
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({ kind: "resource", sectionId: section.id })
                      }
                    >
                      <Plus size={14} />
                      {t.material}
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({ kind: "quiz", sectionId: section.id })
                      }
                    >
                      <Plus size={14} />
                      {t.quiz}
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        setModal({ kind: "assignment", sectionId: section.id })
                      }
                    >
                      <Plus size={14} />
                      {t.assignment}
                    </button>
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
      {tab === "gradebook" && <Gradebook classId={id} writable={writable} />}
      {tab === "participants" && cls.canManage && (
        <Participants classId={id} writable={writable} />
      )}
      {tab === "banks" && cls.canManage && (
        <QuestionBanks classId={id} writable={writable} />
      )}
      {tab === "files" && cls.canManage && (
        <Files classId={id} writable={writable} />
      )}
      {tab === "audit" && cls.canManage && <Audit classId={id} />}
      {tab === "announcements" && (
        <>
          <div className="section-heading">
            <h2>{t.announcements}</h2>
            {writable && (
              <button
                className="primary"
                onClick={() => setModal({ kind: "announcement" })}
              >
                <Plus size={16} />
                {t.newAnnouncement}
              </button>
            )}
          </div>
          {cls.announcements.length ? (
            cls.announcements.map((a: any) => (
              <article className="card announcement-card" key={a.id}>
                <div className="toolbar">
                  {a.isImportant && (
                    <span className="badge">
                      <Pin size={12} />
                      {t.important}
                    </span>
                  )}
                  {!a.isPublished && <Badge value="DRAFT" />}
                  <small>{date(a.publishedAt)}</small>
                </div>
                <h2>{a.title}</h2>
                <p className="preserve-lines">{a.content}</p>
              </article>
            ))
          ) : (
            <Empty>{t.noAnnouncements}</Empty>
          )}
        </>
      )}
      {resource && (
        <ResourceViewer
          resource={resource}
          cls={cls}
          user={user}
          reload={info.reload}
          onClose={() => navigate(`/classes/${id}`)}
        />
      )}
      {modal?.kind === "resource" && (
        <ResourceEditor
          user={user}
          classId={id}
          sectionId={modal.sectionId}
          resource={modal.resource}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "quiz" && (
        <QuizEditor
          classId={id}
          sectionId={modal.sectionId}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "assignment" && (
        <AssignmentEditor
          classId={id}
          sectionId={modal.sectionId}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "section" && (
        <Modal
          title={modal.section ? t.edit : t.newSection}
          onClose={() => setModal(null)}
        >
          <Form
            draftKey={`section:${modal.section?.id ?? "new"}`}
            onSubmit={async (f) => {
              await api(
                modal.section
                  ? `/sections/${modal.section.id}`
                  : `/course-classes/${id}/sections`,
                modal.section ? "PATCH" : "POST",
                {
                  title: textValue(f, "title"),
                  description: textValue(f, "description"),
                  type: textValue(f, "type"),
                  isVisible: f.has("isVisible"),
                  startDate: isoInput(f.get("startDate")),
                  endDate: isoInput(f.get("endDate")),
                },
              );
              saved();
            }}
          >
            <Field label={t.sectionTitle}>
              <input
                name="title"
                required
                defaultValue={modal.section?.title}
              />
            </Field>
            <Field label={t.description}>
              <textarea
                name="description"
                defaultValue={modal.section?.description}
              />
            </Field>
            <Field label={t.sectionType}>
              <select
                name="type"
                defaultValue={modal.section?.type ?? "LECTURE"}
              >
                {Object.entries(t.sectionTypes).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label={t.opens}>
                <input
                  type="datetime-local"
                  name="startDate"
                  defaultValue={localInput(modal.section?.startDate)}
                />
              </Field>
              <Field label={t.closes}>
                <input
                  type="datetime-local"
                  name="endDate"
                  defaultValue={localInput(modal.section?.endDate)}
                />
              </Field>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                name="isVisible"
                defaultChecked={modal.section?.isVisible ?? false}
              />
              {t.visible}
            </label>
          </Form>
        </Modal>
      )}
      {modal?.kind === "announcement" && (
        <Modal title={t.newAnnouncement} onClose={() => setModal(null)}>
          <Form
            draftKey="announcement:new"
            onSubmit={async (f) => {
              await api(`/course-classes/${id}/announcements`, "POST", {
                title: textValue(f, "title"),
                content: textValue(f, "content"),
                isImportant: f.has("important"),
                isPublished: f.has("published"),
                publishedAt: isoInput(f.get("publishedAt")),
              });
              saved();
            }}
          >
            <Field label={t.title}>
              <input name="title" required />
            </Field>
            <Field label={t.announcementContent}>
              <textarea name="content" required rows={7} />
            </Field>
            <Field label={t.publishedAt}>
              <input name="publishedAt" type="datetime-local" />
            </Field>
            <label className="check-row">
              <input name="important" type="checkbox" />
              {t.important}
            </label>
            <label className="check-row">
              <input name="published" type="checkbox" defaultChecked />
              {t.publish}
            </label>
          </Form>
        </Modal>
      )}
      {modal?.kind === "settings" && (
        <Modal title={t.settings} onClose={() => setModal(null)}>
          <Form
            draftKey="class-settings"
            onSubmit={async (f) => {
              const status = textValue(f, "status");
              if (
                status === "ARCHIVED" &&
                !(await confirmAction(t.confirmArchive))
              )
                return false;
              await api(`/course-classes/${id}`, "PATCH", {
                name: textValue(f, "name"),
                academicYear: textValue(f, "academicYear"),
                status,
                ...(textValue(f, "key")
                  ? { enrollmentKey: textValue(f, "key") }
                  : {}),
              });
              saved();
            }}
          >
            <Field label={t.className}>
              <input required name="name" defaultValue={cls.name} />
            </Field>
            <Field label={t.academicYear}>
              <input
                required
                name="academicYear"
                defaultValue={cls.academicYear}
              />
            </Field>
            <Field label={t.status}>
              <select name="status" defaultValue={cls.status}>
                {["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => (
                  <option key={s} value={s}>
                    {(t.statuses as any)[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.enrollmentKey}>
              <input name="key" minLength={6} />
            </Field>
          </Form>
        </Modal>
      )}
      {modal?.kind === "clone" && (
        <Modal title={t.cloneClass} onClose={() => setModal(null)}>
          <p>{t.cloneDescription}</p>
          <Form
            draftKey="clone-class"
            onSubmit={async (f) => {
              const result = await api(`/course-classes/${id}/clone`, "POST", {
                name: textValue(f, "name"),
                academicYear: textValue(f, "academicYear"),
              });
              setModal(null);
              navigate(`/classes/${result.id}`);
            }}
          >
            <Field label={t.className}>
              <input name="name" required defaultValue={cls.name} />
            </Field>
            <Field label={t.academicYear}>
              <input name="academicYear" required />
            </Field>
          </Form>
        </Modal>
      )}
    </>
  );
}
function Participants({
  classId,
  writable,
}: {
  classId: string;
  writable: boolean;
}) {
  const members = useApi<any[]>(`/course-classes/${classId}/participants`);
  const [modal, setModal] = useState(""),
    [query, setQuery] = useState(""),
    [users, setUsers] = useState<any[]>([]),
    [selected, setSelected] = useState<any[]>([]);
  return (
    <>
      <div className="section-heading">
        <h2>{t.participants}</h2>
        {writable && (
          <div className="toolbar">
            <button className="secondary" onClick={() => setModal("import")}>
              {t.import}
            </button>
            <button className="primary" onClick={() => setModal("add")}>
              <Plus size={16} />
              {t.enroll}
            </button>
          </div>
        )}
      </div>
      {members.error ? (
        <Notice error={members.error} />
      ) : members.loading ? (
        <Loading />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.studentNumber}</th>
                <th>{t.email}</th>
                <th>{t.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.data?.map((m) => (
                <tr key={m.id}>
                  <td>{m.user.name}</td>
                  <td>{m.user.identifierValue}</td>
                  <td>{m.user.email}</td>
                  <td>
                    <Badge value={m.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td>
                    {writable && (
                      <Action
                        className={m.isActive ? "danger" : "secondary"}
                        run={async () => {
                          if (
                            m.isActive &&
                            !(await confirmAction(
                              "Nonaktifkan kepesertaan " +
                                m.user.name +
                                "?",
                            ))
                          )
                            return;
                          await api(
                            `/course-classes/${classId}/participants`,
                            "POST",
                            { userId: m.userId, isActive: !m.isActive },
                          );
                          members.reload();
                        }}
                      >
                        {m.isActive ? t.removeEnrollment : t.activateEnrollment}
                      </Action>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!members.data?.length && <Empty>{t.noParticipants}</Empty>}
        </div>
      )}
      {modal === "import" && (
        <ImportPanel
          classId={classId}
          initialKind="ENROLLMENT"
          onClose={() => {
            setModal("");
            members.reload();
          }}
        />
      )}
      {modal === "add" && (
        <Modal title={t.enroll} onClose={() => setModal("")}>
          <Form
            draftKey="participants"
            submitDisabled={!selected.length}
            draftValue={{ selected, users, query }}
            onRestoreDraft={(v) => {
              setSelected(v.selected);
              setUsers(v.users);
              setQuery(v.query);
            }}
            submitLabel={"Tambahkan peserta (" + selected.length + ")"}
            onSubmit={async () => {
              if (!selected.length)
                throw new Error("Pilih setidaknya satu mahasiswa.");
              await api(`/course-classes/${classId}/imports/commit`, "POST", {
                kind: "ENROLLMENT",
                rows: selected.map((u) => ({
                  values: {
                    identifierValue: u.identifierValue,
                    email: u.email,
                  },
                  override: true,
                })),
              });
              setSelected([]);
              members.reload();
              setModal("");
            }}
          >
            <div className="inline-form">
              <input
                aria-label={t.searchUsers}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.searchUsers}
              />
              <Action
                run={async () =>
                  setUsers(await api(`/users?q=${encodeURIComponent(query)}`))
                }
              >
                {t.searchLabel}
              </Action>
            </div>
            {users
              .filter(
                (u) =>
                  u.role === "STUDENT" &&
                  !members.data?.some((m) => m.userId === u.id && m.isActive),
              )
              .map((u) => (
                <div className="user-result" key={u.id}>
                  <span>
                    {u.name}
                    <small className="block">{u.identifierValue}</small>
                  </span>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      aria-label={"Pilih " + u.name}
                      checked={selected.some((v) => v.id === u.id)}
                      onChange={(e) =>
                        setSelected((v) =>
                          e.target.checked
                            ? [...v, u]
                            : v.filter((x) => x.id !== u.id),
                        )
                      }
                    />
                    Pilih
                  </label>
                </div>
              ))}
            {!users.length && (
              <p>
                Cari mahasiswa melalui nama, nomor mahasiswa, atau email, lalu
                pilih peserta yang akan ditambahkan.
              </p>
            )}
            {selected.length > 0 && <p>{selected.length} mahasiswa dipilih.</p>}
          </Form>
        </Modal>
      )}
    </>
  );
}
function QuestionBanks({
  classId,
  writable,
}: {
  classId: string;
  writable: boolean;
}) {
  const banks = useApi<any[]>(`/course-classes/${classId}/question-banks`);
  const [modal, setModal] = useState<any>(null),
    [question, setQuestion] = useState<any>(null);
  return (
    <>
      <div className="section-heading">
        <h2>{t.questionBanks}</h2>
        {writable && (
          <div className="toolbar">
            <button
              className="secondary"
              onClick={() => setModal({ kind: "import" })}
            >
              {t.import}
            </button>
            <button
              className="primary"
              onClick={() => setModal({ kind: "bank" })}
            >
              {t.newBank}
            </button>
          </div>
        )}
      </div>
      {banks.error ? (
        <Notice error={banks.error} />
      ) : banks.loading ? (
        <Loading />
      ) : (
        banks.data?.map((bank) => (
          <section className="card bank-card" key={bank.id}>
            <div className="section-heading">
              <h2>
                {bank.title}{" "}
                <span className="count">{bank.questions.length}</span>
              </h2>
              {writable && (
                <button
                  className="secondary"
                  onClick={() => {
                    setQuestion({
                      text: "",
                      type: "SINGLE_CHOICE",
                      points: 10,
                      options: [
                        { id: "a", text: "" },
                        { id: "b", text: "" },
                      ],
                      answerKey: { correct: ["a"] },
                      rubric: [],
                      maxWords: 1000,
                    });
                    setModal({ kind: "question", bankId: bank.id });
                  }}
                >
                  {t.newQuestion}
                </button>
              )}
            </div>
            {bank.questions.map((q: any, i: number) => (
              <details className="bank-question" key={q.id}>
                <summary>
                  {i + 1}. {q.text}
                  <small>
                    {(t.questionTypes as any)[q.type]} · {q.points}{" "}
                    {t.points.toLowerCase()}
                  </small>
                </summary>
                <div className="bank-answer">
                  {q.options.map((o: any) => (
                    <p key={o.id}>
                      {o.id.toUpperCase()}. {o.text}
                    </p>
                  ))}
                  <strong>{t.answerKey}</strong>
                  <pre>{JSON.stringify(q.answerKey, null, 2)}</pre>
                </div>
              </details>
            ))}
          </section>
        ))
      )}
      {!banks.loading && !banks.data?.length && <Empty>{t.noQuestions}</Empty>}
      {modal?.kind === "bank" && (
        <Modal title={t.newBank} onClose={() => setModal(null)}>
          <Form
            draftKey="bank:new"
            onSubmit={async (f) => {
              await api(`/course-classes/${classId}/question-banks`, "POST", {
                title: textValue(f, "title"),
                questions: [],
              });
              setModal(null);
              banks.reload();
            }}
          >
            <Field label={t.title}>
              <input name="title" required />
            </Field>
          </Form>
        </Modal>
      )}
      {modal?.kind === "question" && (
        <Modal title={t.newQuestion} wide onClose={() => setModal(null)}>
          <Form
            draftKey={`bank-question:${modal.bankId}`}
            draftValue={question}
            onRestoreDraft={setQuestion}
            onSubmit={async () => {
              await api(
                `/course-classes/${classId}/question-banks/${modal.bankId}/questions`,
                "POST",
                questionSchema.parse(question),
              );
              setModal(null);
              banks.reload();
            }}
          >
            <QuestionEditor question={question} onChange={setQuestion} />
          </Form>
        </Modal>
      )}
      {modal?.kind === "import" && (
        <ImportPanel
          classId={classId}
          initialKind="QUESTIONS"
          onClose={() => {
            setModal(null);
            banks.reload();
          }}
        />
      )}
    </>
  );
}
function Files({ classId, writable }: { classId: string; writable: boolean }) {
  const files = useApi<any[]>(`/course-classes/${classId}/files`);
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{t.files}</h2>
          <p>{t.fileRetention}</p>
        </div>
      </div>
      {files.error ? (
        <Notice error={files.error} />
      ) : files.loading ? (
        <Loading />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.filename}</th>
                <th>{t.fileStatus}</th>
                <th>{t.timestamp}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {files.data?.map((file) => (
                <tr key={file.id}>
                  <td>
                    {file.name}
                    <small className="block">
                      {(file.sizeBytes / 1024).toFixed(1)} KB
                    </small>
                  </td>
                  <td>
                    <Badge value={file.status} />
                  </td>
                  <td>{date(file.createdAt)}</td>
                  <td>
                    {writable && ["READY", "TRASH"].includes(file.status) && (
                      <Action
                        run={async () => {
                          if (
                            file.status === "READY" &&
                            !(await confirmAction(t.confirmTrash))
                          )
                            return;
                          await api(
                            `/files/${file.id}/${file.status === "TRASH" ? "restore" : "trash"}`,
                            "POST",
                            {},
                          );
                          files.reload();
                        }}
                      >
                        {file.status === "TRASH" ? t.restore : t.trash}
                      </Action>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!files.data?.length && <Empty>{t.noFiles}</Empty>}
        </div>
      )}
    </>
  );
}
function Audit({ classId }: { classId: string }) {
  const entries = useApi<any[]>(`/course-classes/${classId}/audit`);
  const [hasMore, setHasMore] = useState(true);
  return (
    <>
      <div className="section-heading">
        <h2>{t.audit}</h2>
      </div>
      {entries.error ? (
        <Notice error={entries.error} />
      ) : entries.loading ? (
        <Loading />
      ) : (
        <div className="audit-list">
          {entries.data?.map((entry) => (
            <details key={entry.id} className="card audit-entry">
              <summary>
                <span>
                  <strong>{entry.action}</strong>
                  <small className="block">
                    {entry.user?.name ?? entry.actorRole} · {entry.entity}
                  </small>
                </span>
                <time>{date(entry.createdAt)}</time>
              </summary>
              <div className="audit-diff">
                <div>
                  <h3>{t.before}</h3>
                  <pre>{JSON.stringify(entry.beforeState, null, 2)}</pre>
                </div>
                <div>
                  <h3>{t.after}</h3>
                  <pre>{JSON.stringify(entry.afterState, null, 2)}</pre>
                </div>
              </div>
              <p>{entry.metadata.reason}</p>
              <small>
                {t.requestId}: {entry.metadata.requestId}
              </small>
            </details>
          ))}
          {hasMore && (entries.data?.length ?? 0) >= 50 && (
            <Action
              run={async () => {
                const next = await api(
                  `/course-classes/${classId}/audit?cursor=${entries.data!.at(-1).id}`,
                );
                entries.setData([...entries.data!, ...next]);
                setHasMore(next.length === 50);
              }}
            >
              {t.more}
            </Action>
          )}
          {!entries.data?.length && <Empty>{t.noAudit}</Empty>}
        </div>
      )}
    </>
  );
}
