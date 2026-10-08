/**
 * ============================================================================
 * E-LEARNING UNIVERSITAS ACHMAD YANI (UAY) - CLASSROOM WORKSPACE COMPONENT
 * ============================================================================
 * @module apps/web/src/ClassPage.tsx
 *
 * Komponen utama ruang kelas pembelajaran (Classroom Hub).
 *
 * Tab & Kapabilitas:
 * - `content`: Sesi pertemuan, RPS, modul materi 11 blok, kuis, dan tugas.
 * - `attendance`: Pengelolaan presensi & lembar kehadiran mahasiswa.
 * - `gradebook`: Rekap nilai mahasiswa (hanya-baca bagi Admin Prodi, wewenang penuh bagi Dosen).
 * - `participants`: Daftar mahasiswa terdaftar dan kode enroll.
 * - `banks`: Bank soal kuis tingkat kelas.
 * - `files`: Pengelolaan berkas dan aset pembelajaran kelas.
 * - `audit`: Riwayat jejak audit aktivitas di dalam kelas.
 *
 * Otorisasi:
 * - `canEditClass`: Benar untuk Dosen Pengampu ATAU Admin Prodi (`DEPARTMENT_ADMIN`)
 *   yang memiliki cakupan prodi terkait.
 * - `canGrade`: Wewenang eksklusif Dosen Pengampu (Gradebook hanya dapat dimutasi dosen).
 * ============================================================================
 */

import { formatClock, formatDateTime } from "../../../packages/shared/src/time";
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
import { Gradebook } from "./Gradebook";
import { Attendance } from "./Attendance";
import { classPath, contentPath, itemSlug } from "./router";
import {
  Participants,
  QuestionBanks,
  Files,
  Audit,
  SectionModal,
  AnnouncementModal,
  ClassSettingsModal,
  ClassCloneModal,
} from "./components/class";

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
  const isDeptAdminForClass = user.role === "DEPARTMENT_ADMIN" && cls.canManage;
  const canEditClass = (user.role === "INSTRUCTOR" || isDeptAdminForClass) && cls.canManage;
  const writable =
    canEditClass &&
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
          ["audit", "Riwayat kegiatan"],
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
    try {
      await api(`/course-classes/${cls.id}`, "PATCH", {
        name: cls.name,
        academicYear: cls.academicYear,
        status: "PUBLISHED",
      });
      setMessage("Kelas berhasil dibuka kembali dan sekarang berstatus aktif.");
      info.reload();
    } catch (error: any) {
      setMessage(error?.message || "Kelas belum dapat dibuka kembali. Coba lagi.");
    }
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
          {canEditClass && isArchived && cls.course.status !== "ARCHIVED" && (
            <button
              className="primary"
              onClick={handleReopen}
            >
              <ArchiveRestore size={16} />
              {t.reopenClass || "Buka kembali kelas"}
            </button>
          )}
          {writable && (
            <button
              className="secondary"
              onClick={() => setModal({ kind: "settings" })}
            >
              <Settings2 size={16} />
              {t.settings}
            </button>
          )}
          {canEditClass && cls.course.status !== "ARCHIVED" && (
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
              {canEditClass && cls.course.status !== "ARCHIVED" && (
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
          {user.role === "SUPER_ADMIN" && (
            <div className="callout note">Admin institusi dapat memantau ruang kelas. Pengelolaan pembelajaran dilakukan oleh dosen pengampu atau admin prodi terkait.</div>
          )}
          {user.role === "DEPARTMENT_ADMIN" && !cls.canManage && (
            <div className="callout note">Kelas ini berada di luar cakupan program studi Anda. Ruang kelas ditampilkan dalam mode baca.</div>
          )}
          {isDeptAdminForClass && (
            <div className="callout note">Mode Bantuan Prodi: Anda dapat membantu mengelola materi, bank soal, kuis, tugas, dan presensi. Pengisian dan penerbitan nilai akhir adalah wewenang penuh dosen pengampu.</div>
          )}
          {canEditClass && isArchived && cls.course.status === "ARCHIVED" && (
            <div className="callout note">Mata kuliah ini masih diarsipkan. Minta admin mengaktifkan mata kuliah di katalog sebelum membuka kembali kelas.</div>
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
        <Gradebook
          classId={cls.id}
          writable={user.role === "INSTRUCTOR" && writable}
          user={user}
        />
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
        <SectionModal
          cls={cls}
          section={modal.section}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "announcement" && (
        <AnnouncementModal
          cls={cls}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "settings" && (
        <ClassSettingsModal
          cls={cls}
          onClose={() => setModal(null)}
          onSaved={saved}
        />
      )}
      {modal?.kind === "clone" && (
        <ClassCloneModal
          cls={cls}
          config={config}
          onClose={() => setModal(null)}
        />
      )}
    </DraftRouteContext.Provider>
  );
}

