import { DraftRouteContext } from "./useLocalDraft";
import { confirmAction } from "./confirm";
import { PublishButton } from "./PublishButton";
import { useEffect, useState } from "react";
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
  UserX,
  Archive,
  ArchiveRestore,
  Copy,
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
  Pagination,
  usePagination,
} from "./lib";
import { ResourceEditor, ResourceViewer } from "./Content";
import {
  QuizEditor,
  AssignmentEditor,
  QuestionEditor,
  QuizPage,
  AssignmentPage,
} from "./Assessment";
import { Gradebook, ImportPanel } from "./Gradebook";
import { Attendance } from "./Attendance";
import { questionSchema } from "../../../packages/shared/src/domain";
import { classPath, contentPath, itemSlug } from "./router";

export function ClassPage({
  id,
  tab: requestedTab,
  user,
  resourceSlug,
  selectedKind,
  selectedSlug,
  config,
}: {
  id: string;
  tab: string;
  user: any;
  config?: any;
  resourceSlug: string | null;
  selectedKind: "quizzes" | "assignments" | null;
  selectedSlug: string | null;
}) {
  const info = useApi(`/course-classes/${id}`);
  const [modal, setModal] = useState<any>(null),
    [message, setMessage] = useState("");
  const cls = info.data;
  useEffect(() => {
    if (!cls) return;
    const query = new URLSearchParams(location.search);
    let destination = classPath(cls);
    if (selectedKind && selectedSlug)
      destination += `/${selectedKind}/${selectedSlug}`;
    else if (resourceSlug) destination += `/resources/${resourceSlug}`;
    else if (query.get("resource")) {
      const items = cls.sections.flatMap((s: any) => s.resources);
      const item = items.find((r: any) => r.id === query.get("resource"));
      if (item) destination = contentPath(cls, "resources", item, items);
    } else if (requestedTab !== "content") destination += `/${requestedTab}`;
    if (location.pathname + location.search !== destination)
      navigate(destination, true);
  }, [cls, resourceSlug, selectedKind, selectedSlug, requestedTab]);
  if (info.loading && !cls) return <Loading />;
  if (info.error) return <Notice error={info.error} />;
  if (!cls) return null;
  const writable =
    cls.canManage &&
    cls.status !== "ARCHIVED" &&
    cls.course.status !== "ARCHIVED";
  const published = (kind: string, itemId: string, visible = true) => {
    info.setData((current: any) => ({
      ...current,
      announcements: current.announcements.map((a: any) =>
        kind === "announcements" && a.id === itemId
          ? { ...a, isPublished: visible }
          : a,
      ),
      sections: current.sections.map((s: any) => ({
        ...s,
        ...(kind === "sections" && s.id === itemId
          ? { isVisible: visible }
          : {}),
        resources: s.resources.map((r: any) =>
          kind === "resources" && r.id === itemId
            ? { ...r, isVisible: visible }
            : r,
        ),
        quizzes: s.quizzes.map((q: any) =>
          kind === "quizzes" && q.id === itemId
            ? {
                ...q,
                ...(visible ? { status: "PUBLISHED" } : {}),
                isVisible: visible,
              }
            : q,
        ),
        assignments: s.assignments.map((a: any) =>
          kind === "assignments" && a.id === itemId
            ? { ...a, isVisible: visible }
            : a,
        ),
      })),
    }));
    setMessage(
      visible
        ? t.contentPublished
        : "Publikasi ditarik. Konten tidak ditampilkan kepada mahasiswa.",
    );
  };
  const isArchived = cls.status === "ARCHIVED";
  const tabs = [
    ["content", t.content],
    ["attendance", "Presensi"],
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
  const handleReopen = async () => {
    if (
      !(await confirmAction(
        t.confirmReopenClass ||
          "Buka kembali kelas ini? Status kelas akan diubah menjadi Terbit (aktif) sehingga perkuliahan dan aktivitas dapat dilanjutkan kembali.",
      ))
    ) {
      return;
    }
    await api(`/course-classes/${cls.id}`, "PATCH", {
      name: cls.name,
      academicYear: cls.academicYear,
      status: "PUBLISHED",
    });
    setMessage("Kelas berhasil dibuka kembali dan sekarang berstatus aktif.");
    info.reload();
  };
  const classUrl = classPath(cls);
  const resource = cls.sections
    .flatMap((s: any) => s.resources.map((r: any) => ({ section: s, item: r })))
    .find(
      ({ section, item }: any) =>
        itemSlug(section.resources, item) === resourceSlug,
    )?.item;
  if (selectedKind && selectedSlug && !cls.isInactiveParticipant) {
    for (const section of cls.sections) {
      const item = section[selectedKind].find(
        (candidate: any) =>
          itemSlug(section[selectedKind], candidate) === selectedSlug,
      );
      if (item)
        return selectedKind === "quizzes" ? (
          <QuizPage
            key={item.id}
            id={item.id}
            user={user}
            backHref={classUrl}
          />
        ) : (
          <AssignmentPage
            key={item.id}
            id={item.id}
            user={user}
            backHref={classUrl}
          />
        );
    }
    return <Empty>Konten tidak ditemukan.</Empty>;
  }
  if (resourceSlug && !resource && !cls.isInactiveParticipant) return <Empty>Materi tidak ditemukan.</Empty>;
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
    <DraftRouteContext.Provider
      value={`#/classes/${cls.id}${tab !== "content" ? `?tab=${tab}` : ""}`}
    >
      <a className="back-link" href="/classes">
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
          {cls.isInactiveParticipant ? (
            <span className="badge danger">{t.participationDisabled}</span>
          ) : (
            <Badge value={cls.status} />
          )}
          {cls.canManage && isArchived && (
            <button
              className="primary"
              onClick={handleReopen}
            >
              <ArchiveRestore size={16} />
              {t.reopenClass || "Buka kembali kelas"}
            </button>
          )}
          {cls.canManage && (
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
              <Copy size={16} />
              {t.cloneClass}
            </button>
          )}
        </div>
      </div>
      {cls.isInactiveParticipant ? (
        <div className="card empty-access-card">
          <div className="empty-access-icon">
            <UserX size={36} strokeWidth={1.75} />
          </div>
          <h2>{t.participationDisabledTitle}</h2>
          <p>{t.participationDisabledDescription}</p>
        </div>
      ) : (
        <>
          {isArchived && (
            <div className="callout note archived-banner">
              <div className="archived-banner-text">
                <Archive size={20} strokeWidth={1.75} />
                <span>
                  <strong>{t.classArchived || "Kelas diarsipkan"}:</strong>{" "}
                  {t.classArchivedNotice ||
                    "Kelas ini diarsipkan oleh dosen pengampu. Konten pembelajaran ditampilkan dalam mode hanya-baca."}
                </span>
              </div>
              {cls.canManage && (
                <button
                  className="primary compact"
                  onClick={handleReopen}
                >
                  <ArchiveRestore size={15} />
                  {t.reopenClass || "Buka kembali kelas"}
                </button>
              )}
            </div>
          )}
          {message && <Notice>{message}</Notice>}
          <nav className="class-tabs" aria-label={t.menu}>
            {tabs.map(([value, label]) => (
              <a
                key={value}
                className={tab === value ? "selected" : ""}
                aria-current={tab === value ? "page" : undefined}
                href={value === "content" ? classUrl : `${classUrl}/${value}`}
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
                      <span
                        className={`meeting-type-tag type-${section.type.toLowerCase()}`}
                      >
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
                      <PublishButton
                        path={`/sections/${section.id}`}
                        title={section.title}
                        published={section.isVisible}
                        onPublished={() =>
                          published("sections", section.id, !section.isVisible)
                        }
                      />
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
                            `/course-classes/${cls.id}/section-order`,
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
                            `/course-classes/${cls.id}/section-order`,
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
                        <a
                          href={contentPath(
                            cls,
                            "resources",
                            r,
                            section.resources,
                          )}
                        >
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
                          <PublishButton
                            path={`/resources/${r.id}`}
                            title={r.title}
                            published={r.isVisible}
                            onPublished={() =>
                              published("resources", r.id, !r.isVisible)
                            }
                          />
                        )}
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
                      <a href={contentPath(cls, "quizzes", q, section.quizzes)}>
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
                      {cls.canManage ? (
                        <Badge value={q.isVisible ? q.status : "DRAFT"} />
                      ) : (
                        <Badge
                          value={
                            q.userStatus ??
                            (q.isVisible ? q.status : "DRAFT")
                          }
                        />
                      )}
                      {writable && (
                        <PublishButton
                          path={`/quizzes/${q.id}`}
                          title={q.title}
                          published={q.status === "PUBLISHED" && q.isVisible}
                          onPublished={() =>
                            published(
                              "quizzes",
                              q.id,
                              !(q.status === "PUBLISHED" && q.isVisible),
                            )
                          }
                        />
                      )}
                    </div>
                  ))}
                  {section.assignments.map((a: any) => (
                    <div className="learning-item" key={a.id}>
                      <a
                        href={contentPath(
                          cls,
                          "assignments",
                          a,
                          section.assignments,
                        )}
                      >
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
                      {cls.canManage ? (
                        !a.isVisible && <Badge value="DRAFT" />
                      ) : (
                        a.userStatus && <Badge value={a.userStatus} />
                      )}
                      {writable && (
                        <PublishButton
                          path={`/assignments/${a.id}`}
                          title={a.title}
                          published={a.isVisible}
                          onPublished={() =>
                            published("assignments", a.id, !a.isVisible)
                          }
                        />
                      )}
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
      {tab === "attendance" && (
        <Attendance
          classId={cls.id}
          writable={writable}
          canManage={cls.canManage}
          user={user}
        />
      )}
      {tab === "gradebook" && (
        <Gradebook classId={cls.id} writable={writable} />
      )}
      {tab === "participants" && cls.canManage && (
        <Participants classId={cls.id} writable={writable} />
      )}
      {tab === "banks" && cls.canManage && (
        <QuestionBanks classId={cls.id} writable={writable} />
      )}
      {tab === "files" && cls.canManage && (
        <Files classId={cls.id} writable={writable} />
      )}
      {tab === "audit" && cls.canManage && <Audit classId={cls.id} />}
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
              <article className="card announcement-card" id={`announcement-${a.id}`} key={a.id}>
                <div className="toolbar">
                  {a.isImportant && (
                    <span className="badge">
                      <Pin size={12} />
                      {t.important}
                    </span>
                  )}
                  {!a.isPublished && <Badge value="DRAFT" />}
                  {writable && (
                    <PublishButton
                      path={`/announcements/${a.id}`}
                      title={a.title}
                      published={a.isPublished}
                      onPublished={() =>
                        published("announcements", a.id, !a.isPublished)
                      }
                    />
                  )}
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
          onClose={() => navigate(classUrl)}
        />
      )}
        </>
      )}
      {modal?.kind === "resource" && (
        <ResourceEditor
          user={user}
          classId={cls.id}
          sectionId={modal.sectionId}
          resource={modal.resource}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "quiz" && (
        <QuizEditor
          classId={cls.id}
          sectionId={modal.sectionId}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "assignment" && (
        <AssignmentEditor
          classId={cls.id}
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
            onCancel={() => setModal(null)}
            publication={{
              published: modal.section?.isVisible ?? false,
              onUnpublish: modal.section
                ? async () => {
                    await api(
                      `/sections/${modal.section.id}/unpublish`,
                      "POST",
                      {},
                    );
                    saved();
                  }
                : undefined,
            }}
            onSubmit={async (f, intent) => {
              await api(
                modal.section
                  ? `/sections/${modal.section.id}`
                  : `/course-classes/${cls.id}/sections`,
                modal.section ? "PATCH" : "POST",
                {
                  title: textValue(f, "title"),
                  description: textValue(f, "description"),
                  type: textValue(f, "type"),
                  isVisible: intent === "publish",
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
          </Form>
        </Modal>
      )}
      {modal?.kind === "announcement" && (
        <Modal title={t.newAnnouncement} onClose={() => setModal(null)}>
          <Form
            draftKey="announcement:new"
            onCancel={() => setModal(null)}
            publication={{ published: false }}
            onSubmit={async (f, intent) => {
              await api(`/course-classes/${cls.id}/announcements`, "POST", {
                title: textValue(f, "title"),
                content: textValue(f, "content"),
                isImportant: f.has("important"),
                isPublished: intent === "publish",
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
              await api(`/course-classes/${cls.id}`, "PATCH", {
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
          <div
            style={{
              background: "rgba(2, 132, 199, 0.06)",
              border: "1px solid rgba(2, 132, 199, 0.2)",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: "0.85rem",
              lineHeight: 1.5,
              color: "var(--foreground, #1e293b)",
            }}
          >
            <strong>Informasi Penanganan Jadwal &amp; Peserta:</strong>
            <ul style={{ paddingLeft: 16, margin: "6px 0 0 0" }}>
              <li>Seluruh jadwal rilis dan deadline periode lama otomatis di-reset ke draf bersih agar tidak mengunci di semester baru.</li>
              <li>Peserta (mahasiswa) lama tidak diikutsertakan. Kelas baru akan dimulai dengan 0 peserta siap untuk pendaftaran angkatan baru.</li>
            </ul>
          </div>
          <Form
            draftKey="clone-class"
            onSubmit={async (f) => {
              const result = await api(
                `/course-classes/${cls.id}/clone`,
                "POST",
                {
                  name: textValue(f, "name"),
                  academicYear: textValue(f, "academicYear"),
                },
              );
              setModal(null);
              navigate(result.path);
            }}
          >
            <Field label={t.className}>
              <input name="name" required defaultValue={cls.name} />
            </Field>
            <Field
              label={`${t.academicYear} & Semester Baru`}
              hint="Pilih semester tujuan duplikasi materi perkuliahan."
            >
              <select
                name="academicYear"
                required
                defaultValue={
                  cls.academicYear.includes("Ganjil")
                    ? cls.academicYear.replace("Ganjil", "Genap")
                    : config?.academicYear || "2026/2027 Genap"
                }
              >
                {(
                  config?.academicYears || [
                    "2025/2026 Ganjil",
                    "2025/2026 Genap",
                    "2026/2027 Ganjil",
                    "2026/2027 Genap",
                    "2027/2028 Ganjil",
                    "2027/2028 Genap",
                  ]
                ).map((year: string) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Field>
          </Form>
        </Modal>
      )}
    </DraftRouteContext.Provider>
  );
}
function formatLastActive(isoString?: string | null, isOnline?: boolean) {
  if (isOnline) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "#ecfdf5",
          color: "#15803d",
          border: "1px solid #bbf7d0",
          fontSize: "0.75rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 12,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e",
          }}
        />
        Online Sekarang
      </span>
    );
  }

  if (!isoString) {
    return (
      <span style={{ fontSize: "0.82rem", color: "var(--muted, #94a3b8)", fontStyle: "italic" }}>
        Belum pernah aktif
      </span>
    );
  }

  const d = new Date(isoString);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);

  if (diffSec < 60) return <span style={{ color: "#15803d", fontWeight: 600 }}>Baru saja</span>;
  if (diffSec < 3600) return <span>{Math.floor(diffSec / 60)} menit yang lalu</span>;
  if (diffSec < 86400) return <span>{Math.floor(diffSec / 3600)} jam yang lalu</span>;
  if (diffSec < 172800) {
    return (
      <span>
        Kemarin, {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
      </span>
    );
  }

  return (
    <span title={d.toLocaleString("id-ID")}>
      {d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })},{" "}
      {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
    </span>
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

  const pagination = usePagination(members.data ?? [], 25);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await api(`/users?q=${encodeURIComponent(trimmed)}`);
        setUsers(results);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
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
      ) : members.loading && !members.data ? (
        <Loading />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.studentNumber}</th>
                <th>{t.email}</th>
                <th>Terakhir Online</th>
                <th>{t.status}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pagination.paginatedItems.map((m) => (
                <tr key={m.id}>
                  <td>{m.user.name}</td>
                  <td>{m.user.identifierValue}</td>
                  <td>{m.user.email}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {formatLastActive(m.user.lastActiveAt, m.user.isOnline)}
                  </td>
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
                              "Nonaktifkan kepesertaan " + m.user.name + "?",
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
          {members.data && members.data.length > 0 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          )}
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
      ) : banks.loading && !banks.data ? (
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
  const pagination = usePagination(files.data ?? [], 15);
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
      ) : files.loading && !files.data ? (
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
              {pagination.paginatedItems.map((file) => (
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
          {files.data && files.data.length > 0 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              pageSizeOptions={[10, 15, 25, 50]}
            />
          )}
          {!files.data?.length && <Empty>{t.noFiles}</Empty>}
        </div>
      )}
    </>
  );
}
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Admin Utama",
  DEPARTMENT_ADMIN: "Admin Program Studi",
  INSTRUCTOR: "Dosen Pengampu",
  STUDENT: "Mahasiswa",
};

const ENTITY_LABELS: Record<string, string> = {
  SECTION: "Pertemuan",
  ClassSection: "Pertemuan",
  RESOURCE: "Materi Pembelajaran",
  ResourceItem: "Materi Pembelajaran",
  ANNOUNCEMENT: "Pengumuman",
  Announcement: "Pengumuman",
  ASSIGNMENT: "Tugas",
  Assignment: "Tugas",
  SUBMISSION: "Pengumpulan Tugas",
  AssignmentSubmission: "Pengumpulan Tugas",
  QUIZ: "Kuis",
  Quiz: "Kuis",
  ATTEMPT: "Pengerjaan Kuis",
  QuizAttempt: "Pengerjaan Kuis",
  ANSWER_GRADE: "Penilaian Jawaban Kuis",
  QUESTION_BANK: "Bank Soal",
  QuestionBank: "Bank Soal",
  QUESTION: "Butir Soal",
  Question: "Butir Soal",
  ENROLLMENT: "Kepesertaan",
  Enrollment: "Kepesertaan",
  FINAL_GRADE: "Nilai Akhir",
  FinalGrade: "Nilai Akhir",
  CLASS: "Kelas",
  CourseClass: "Kelas",
  COURSE: "Mata Kuliah",
  Course: "Mata Kuliah",
  FILE: "Berkas",
  FileRecord: "Berkas",
  MANUAL_GRADE: "Nilai Manual",
};

const ACTION_DESCRIPTIONS: Record<
  string,
  { label: string; tone: "primary" | "success" | "warning" | "info" }
> = {
  ENROLL: { label: "Pendaftaran Mahasiswa", tone: "info" },
  UPDATE_ENROLLMENT: { label: "Pembaruan Status Kepesertaan", tone: "warning" },
  ASSIGN_INSTRUCTORS: { label: "Penetapan Dosen Pengampu", tone: "info" },

  CREATE_SECTION: { label: "Penambahan Pertemuan Baru", tone: "success" },
  UPDATE_SECTION: { label: "Pembaruan Informasi Pertemuan", tone: "info" },
  DELETE_SECTION: { label: "Penghapusan Pertemuan", tone: "warning" },
  REORDER_CLASS: { label: "Penyusunan Ulang Urutan Pertemuan", tone: "info" },
  REORDER: { label: "Penyusunan Ulang Urutan Pertemuan", tone: "info" },

  CREATE_RESOURCE: { label: "Penambahan Materi Pembelajaran", tone: "success" },
  UPDATE_RESOURCE: { label: "Pembaruan Materi Pembelajaran", tone: "info" },

  CREATE_ANNOUNCEMENT: { label: "Pembuatan Pengumuman", tone: "info" },
  UPDATE_ANNOUNCEMENT: { label: "Pembaruan Pengumuman", tone: "info" },

  CREATE_ASSIGNMENT: { label: "Pembuatan Tugas Baru", tone: "success" },
  UPDATE_ASSIGNMENT: { label: "Pembaruan Pengaturan Tugas", tone: "info" },
  SUBMIT_ASSIGNMENT: { label: "Pengumpulan Tugas", tone: "info" },
  RESUBMIT_ASSIGNMENT: { label: "Pengumpulan Ulang Tugas", tone: "info" },
  GRADE_SUBMISSION: { label: "Penilaian Tugas Mahasiswa", tone: "success" },

  CREATE_QUIZ: { label: "Pembuatan Kuis Baru", tone: "success" },
  UPDATE_QUIZ: { label: "Pembaruan Pengaturan Kuis", tone: "info" },
  START_QUIZ: { label: "Pengerjaan Kuis Dimulai", tone: "info" },
  SUBMIT_QUIZ: { label: "Pengumpulan Jawaban Kuis", tone: "info" },
  QUIZ_AUTO_EXPIRE: {
    label: "Pengerjaan Kuis Selesai (Waktu Habis)",
    tone: "warning",
  },
  GRADE_ANSWER: { label: "Penilaian Jawaban Kuis", tone: "info" },
  CREATE_QUESTION_BANK: { label: "Pembuatan Bank Soal", tone: "info" },
  CREATE_QUESTION: { label: "Penambahan Butir Soal", tone: "info" },

  PUBLISH_GRADE: { label: "Publikasi Nilai", tone: "success" },
  PUBLISH_GRADES: { label: "Publikasi Nilai", tone: "success" },
  PUBLISH_GRADEBOOK: { label: "Publikasi Nilai Akhir Kelas", tone: "success" },
  SAVE_GRADE_DRAFT: { label: "Penyimpanan Draf Nilai Akhir", tone: "info" },
  UPDATE_WEIGHTS: { label: "Pembaruan Bobot Nilai", tone: "warning" },
  CORRECT_FINAL_GRADE: { label: "Koreksi Nilai Akhir", tone: "warning" },
  MANUAL_GRADE: { label: "Penginputan Nilai Komponen", tone: "info" },

  PUBLISH: { label: "Publikasi Konten", tone: "success" },
  UNPUBLISH: { label: "Pembatalan Publikasi Konten", tone: "warning" },
  UPDATE_CLASS: { label: "Pembaruan Informasi Kelas", tone: "info" },
  CREATE_CLASS: { label: "Pembuatan Kelas", tone: "success" },
  CLONE_CLASS: { label: "Duplikasi Kelas ke Semester Baru", tone: "info" },
  CLONE: { label: "Duplikasi Kelas", tone: "info" },
  ARCHIVE_CLASS: { label: "Pengarsipan Kelas", tone: "warning" },

  REQUEST_UPLOAD: { label: "Permintaan Unggah Berkas", tone: "info" },
  CONFIRM_UPLOAD: { label: "Konfirmasi Unggah Berkas", tone: "info" },
  TRASH: { label: "Pemindahan Berkas ke Tempat Sampah", tone: "warning" },
  RESTORE: { label: "Pemulihan Berkas dari Tempat Sampah", tone: "info" },
};

const FIELD_LABELS: Record<string, string> = {
  isActive: "Status Partisipasi",
  status: "Status",
  score: "Nilai",
  finalScore: "Nilai Akhir",
  gradeLetter: "Nilai Huruf",
  gradePoint: "Indeks Mutu",
  feedback: "Catatan / Umpan Balik",
  title: "Judul",
  name: "Nama",
  description: "Deskripsi",
  deadline: "Tenggat Waktu",
  availableFrom: "Waktu Mulai Akses",
  availableUntil: "Batas Waktu Akses",
  startDate: "Tanggal Mulai",
  endDate: "Tanggal Selesai",
  maxScore: "Nilai Maksimum",
  passingGrade: "Nilai Kelulusan",
  passingScore: "Nilai Minimum Kelulusan",
  maxAttempts: "Maksimal Percobaan",
  attemptLimit: "Batas Percobaan",
  timeLimit: "Batas Waktu (Menit)",
  weight: "Bobot Penilaian (%)",
  weights: "Bobot Penilaian",
  isVisible: "Ditampilkan ke Mahasiswa",
  isPublished: "Status Publikasi",
  isLocked: "Status Kunci Nilai",
  type: "Jenis",
  academicYear: "Tahun Akademik",
  departmentCode: "Program Studi",
  credits: "SKS",
  fileName: "Nama Berkas",
  fileSizeBytes: "Ukuran Berkas",
  allowLate: "Izinkan Pengumpulan Terlambat",
  maxSubmissions: "Batas Pengumpulan",
};

function formatFieldValue(key: string, val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") {
    if (key === "isActive") return val ? "Aktif" : "Dinonaktifkan";
    if (key === "isVisible") return val ? "Ditampilkan" : "Disembunyikan";
    if (key === "isPublished") return val ? "Terbit" : "Draf";
    if (key === "isLocked") return val ? "Terkunci" : "Terbuka";
    return val ? "Ya" : "Tidak";
  }
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
      return date(val);
    }
    if ((t.statuses as any)?.[val]) {
      return (t.statuses as any)[val];
    }
    if ((t.sectionTypes as any)?.[val]) {
      return (t.sectionTypes as any)[val];
    }
  }
  if (typeof val === "object") {
    return Array.isArray(val) ? `${val.length} item` : "Data tersimpan";
  }
  return String(val);
}

function getAuditChanges(entry: any) {
  const { beforeState: before, afterState: after } = entry;
  if (!before && after) {
    const title = after.title || after.name || "";
    return [
      {
        field: "Keterangan",
        after: title ? `Dibuat baru: "${title}"` : "Data baru berhasil dibuat",
      },
    ];
  }
  if (before && !after) {
    const title = before.title || before.name || "";
    return [
      {
        field: "Keterangan",
        after: title ? `Dihapus: "${title}"` : "Data dihapus",
      },
    ];
  }
  if (!before && !after) {
    return [];
  }

  const ignored = new Set([
    "id",
    "classId",
    "updatedAt",
    "createdAt",
    "userId",
    "actorId",
    "sectionId",
    "assignmentId",
    "quizId",
    "resourceItemId",
    "enrollmentKeyHash",
    "passwordHash",
    "hash",
  ]);

  const changes: { field: string; before?: string; after: string }[] = [];
  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const k of keys) {
    if (ignored.has(k)) continue;
    const bVal = before?.[k];
    const aVal = after?.[k];
    if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
      const fieldLabel =
        FIELD_LABELS[k] ||
        k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      changes.push({
        field: fieldLabel,
        before: formatFieldValue(k, bVal),
        after: formatFieldValue(k, aVal),
      });
    }
  }

  return changes;
}

function getAuditAction(entry: any) {
  const combined = `${entry.action}_${entry.entity}`;
  if (ACTION_DESCRIPTIONS[combined]) return ACTION_DESCRIPTIONS[combined];
  if (ACTION_DESCRIPTIONS[entry.action]) return ACTION_DESCRIPTIONS[entry.action];
  const entityLabel = ENTITY_LABELS[entry.entity] ?? entry.entity;
  if (entry.action === "CREATE")
    return { label: `Pembuatan ${entityLabel}`, tone: "success" as const };
  if (entry.action === "UPDATE")
    return { label: `Pembaruan ${entityLabel}`, tone: "info" as const };
  if (entry.action === "DELETE")
    return { label: `Penghapusan ${entityLabel}`, tone: "warning" as const };
  return { label: entry.action.replace(/_/g, " "), tone: "info" as const };
}

function getAuditActor(entry: any) {
  const roleName =
    ROLE_LABELS[entry.actorRole] ??
    (t.roles as Record<string, string>)[entry.actorRole] ??
    entry.actorRole;
  if (entry.user?.name) {
    return `${entry.user.name} (${roleName})`;
  }
  return roleName;
}

function getAuditTargetTitle(entry: any) {
  if (entry.afterState?.title || entry.beforeState?.title) {
    return entry.afterState?.title || entry.beforeState?.title;
  }
  if (entry.afterState?.name || entry.beforeState?.name) {
    return entry.afterState?.name || entry.beforeState?.name;
  }
  if (entry.entity === "ENROLLMENT") {
    if (entry.afterState?.user?.name || entry.beforeState?.user?.name) {
      return `Mahasiswa: ${entry.afterState?.user?.name || entry.beforeState?.user?.name}`;
    }
  }
  return ENTITY_LABELS[entry.entity] ?? entry.entity;
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
      ) : entries.loading && !entries.data ? (
        <Loading />
      ) : (
        <div className="audit-list">
          {entries.data?.map((entry) => {
            const actionInfo = getAuditAction(entry);
            const actor = getAuditActor(entry);
            const targetTitle = getAuditTargetTitle(entry);
            const diffs = getAuditChanges(entry);
            const reason =
              entry.reason ||
              entry.metadata?.reason ||
              entry.afterState?.reason;
            const requestId =
              entry.requestId || entry.metadata?.requestId;

            return (
              <article key={entry.id} className="card audit-entry">
                <div className="audit-header">
                  <div className="audit-header-main">
                    <span className={`badge ${actionInfo.tone}`}>
                      {actionInfo.label}
                    </span>
                    <h3 className="audit-target-title">{targetTitle}</h3>
                    <div className="audit-meta">
                      <span className="audit-actor">{actor}</span>
                      <span className="audit-dot">·</span>
                      <time className="audit-time">{date(entry.createdAt)}</time>
                    </div>
                  </div>
                </div>

                {reason && (
                  <div className="audit-reason-box">
                    <strong>{t.reason || "Alasan"}:</strong> {reason}
                  </div>
                )}

                {diffs.length > 0 && (
                  <div className="audit-changes-box">
                    <div className="audit-changes-heading">
                      {t.auditChangedFields || "Rincian perubahan data:"}
                    </div>
                    <div className="audit-changes-list">
                      {diffs.map((diff, i) => (
                        <div key={i} className="audit-change-row">
                          <span className="audit-field-name">
                            {diff.field}:
                          </span>
                          {diff.before !== undefined && (
                            <>
                              <span className="audit-value-before">
                                {diff.before}
                              </span>
                              <span className="audit-arrow">➔</span>
                            </>
                          )}
                          <span className="audit-value-after">
                            {diff.after}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <details className="audit-tech-details">
                  <summary className="audit-tech-summary">
                    <Settings2 size={13} />
                    <span>
                      {t.auditTechnicalDetails ||
                        "Detail teknis (JSON & Request ID)"}
                    </span>
                  </summary>
                  <div className="audit-tech-content">
                    <div className="audit-tech-meta">
                      {requestId && (
                        <div>
                          <strong>{t.requestId}:</strong>{" "}
                          <code>{requestId}</code>
                        </div>
                      )}
                      {entry.entityId && (
                        <div>
                          <strong>Target ID:</strong>{" "}
                          <code>{entry.entityId}</code>
                        </div>
                      )}
                      {entry.ipAddress && (
                        <div>
                          <strong>IP:</strong> <code>{entry.ipAddress}</code>
                        </div>
                      )}
                    </div>
                    <div className="audit-diff">
                      <div>
                        <h4>{t.before} (JSON)</h4>
                        <pre>
                          {JSON.stringify(entry.beforeState, null, 2) || "null"}
                        </pre>
                      </div>
                      <div>
                        <h4>{t.after} (JSON)</h4>
                        <pre>
                          {JSON.stringify(entry.afterState, null, 2) || "null"}
                        </pre>
                      </div>
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
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
