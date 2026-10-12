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
import { useEffect, useState, useMemo } from "react";
import { usePhoneLayout } from "./usePhoneLayout";
import { hasPermission } from "../../../packages/shared/src/permissions";
import { notifyAction } from "./feedback";
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
import { formatContentHtml } from "./components/ui/RichTextEditor";
import { ResourceEditor, ResourceViewer, Html } from "./Content";
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
  const phone = usePhoneLayout();
  const [modal, setModal] = useState<any>(null),
    [message, setMessage] = useState("");
  const cls = info.data;
  const [sectionTypeFilter, setSectionTypeFilter] = useState<string>("ALL");

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: cls?.sections?.length || 0 };
    for (const sec of cls?.sections || []) {
      const type = sec.type || "LECTURE";
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [cls?.sections]);

  const sectionFilterOptions = useMemo(() => {
    const allTypes = [
      { key: "ALL", label: "Semua", count: sectionCounts.ALL || 0 },
      { key: "LECTURE", label: (t.sectionTypes as any)?.LECTURE || "Perkuliahan", count: sectionCounts.LECTURE || 0 },
      { key: "LAB_PRACTICUM", label: (t.sectionTypes as any)?.LAB_PRACTICUM || "Praktikum", count: sectionCounts.LAB_PRACTICUM || 0 },
      { key: "SEMINAR", label: (t.sectionTypes as any)?.SEMINAR || "Seminar", count: sectionCounts.SEMINAR || 0 },
      { key: "WORKSHOP", label: (t.sectionTypes as any)?.WORKSHOP || "Lokakarya", count: sectionCounts.WORKSHOP || 0 },
      { key: "EXAM", label: (t.sectionTypes as any)?.EXAM || "Ujian", count: sectionCounts.EXAM || 0 },
      { key: "OTHER", label: (t.sectionTypes as any)?.OTHER || "Lainnya", count: sectionCounts.OTHER || 0 },
    ];
    return allTypes.filter(
      (opt) => opt.key === "ALL" || opt.key === "LECTURE" || opt.key === "LAB_PRACTICUM" || opt.count > 0,
    );
  }, [sectionCounts]);

  const filteredSections = useMemo(() => {
    if (sectionTypeFilter === "ALL") return cls?.sections || [];
    return (cls?.sections || []).filter((s: any) => s.type === sectionTypeFilter);
  }, [cls?.sections, sectionTypeFilter]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(t);
  }, [message]);
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
  const canEditClass =
    (user.role === "INSTRUCTOR" || user.role === "ASSISTANT" || isDeptAdminForClass) && cls.canManage;
  const canAdministerClass =
    cls.canManage &&
    (canEditClass || hasPermission(user.role, "MANAGE_ALL_CLASSES"));
  const administrativeWritable =
    canAdministerClass &&
    cls.status !== "ARCHIVED" &&
    cls.course.status !== "ARCHIVED";
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
    const msg = visible
      ? t.contentPublished
      : "Publikasi ditarik. Konten tidak ditampilkan kepada mahasiswa.";
    setMessage(msg);
    notifyAction(msg);
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
    notifyAction(t.saved);
    info.reload();
  };
  const handleReopen = async () => {
    if (
      !(await confirmAction(
        t.confirmReopenClass ||
          "Buka kembali kelas ini? Status kelas akan diubah menjadi Terbit (aktif) sehingga perkuliahan dan aktivitas dapat dilanjutkan kembali.",
      ))
    ) {
      return false;
    }
    await api(`/course-classes/${cls.id}`, "PATCH", {
      name: cls.name,
      academicYear: cls.academicYear,
      status: "PUBLISHED",
    });
    const msg = "Kelas berhasil dibuka kembali dan sekarang berstatus aktif.";
    setMessage(msg);
    notifyAction(msg);
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
  if (resourceSlug && !resource && !cls.isInactiveParticipant)
    return <Empty>Materi tidak ditemukan.</Empty>;
  const getResourceProgress = (r: any): number => {
    if (!cls?.progress) return 0;
    if (r.resourceType === "VIDEO_MEDIA") {
      return (
        cls.progress.video?.find((p: any) => p.resourceItemId === r.id)
          ?.percent ?? 0
      );
    }
    if (r.resourceType === "DOCUMENT") {
      const slidePercent =
        cls.progress.slides?.find((p: any) => p.resourceItemId === r.id)
          ?.percent ?? 0;
      const downloadDone = cls.progress.downloads?.some(
        (p: any) => p.resourceItemId === r.id,
      );
      return Math.max(slidePercent, downloadDone ? 100 : 0);
    }
    const isDone = [
      ...(cls.progress.text ?? []),
      ...(cls.progress.downloads ?? []),
    ].some((p: any) => p.resourceItemId === r.id);
    return isDone ? 100 : 0;
  };

  const isResourceDone = (r: any) => {
    if (!cls?.progress) return false;
    if (r.resourceType === "VIDEO_MEDIA") {
      const minPercent = r.dynamicPayload?.minWatchPercent ?? 85;
      return getResourceProgress(r) >= minPercent;
    }
    if (r.resourceType === "DOCUMENT") {
      const minPercent = r.dynamicPayload?.minSlidePercent ?? 80;
      return getResourceProgress(r) >= minPercent;
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
                  .map((i: any) => {
                    const shortName = i.user?.name?.split(",")[0] ?? "—";
                    const isAsst =
                      i.role === "ASSISTANT" ||
                      i.user?.role === "ASSISTANT" ||
                      (!i.isPrimary && i.user?.role === "STUDENT");
                    return isAsst ? `${shortName} (Asdos)` : shortName;
                  })
                  .join(", ")}
              </span>
            )}
          </div>
        </div>
        <div className="class-heading-actions">
          {cls.isInactiveParticipant ? (
            <span className="badge danger">{t.participationDisabled}</span>
          ) : (
            <Badge value={cls.status} />
          )}
          {canAdministerClass && (
            <details className="class-management" open={!phone}>
              <summary>
                Kelola kelas <Settings2 size={16} />
              </summary>
              <div className="toolbar">
                {canAdministerClass &&
                  isArchived &&
                  cls.course.status !== "ARCHIVED" && (
                    <Action
                      className="primary"
                      run={handleReopen}
                      busyLabel="Membuka kembali…"
                    >
                      <ArchiveRestore size={16} />
                      {t.reopenClass || "Buka kembali kelas"}
                    </Action>
                  )}
                {administrativeWritable && (
                  <button
                    className="secondary"
                    onClick={() => setModal({ kind: "settings" })}
                  >
                    <Settings2 size={16} />
                    {t.settings}
                  </button>
                )}
                {canAdministerClass && cls.course.status !== "ARCHIVED" && (
                  <button
                    className="secondary"
                    onClick={() => setModal({ kind: "clone" })}
                  >
                    <Copy size={16} />
                    {t.cloneClass}
                  </button>
                )}
              </div>
            </details>
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
              {canAdministerClass && cls.course.status !== "ARCHIVED" && (
                <Action
                  className="primary compact"
                  run={handleReopen}
                  busyLabel="Membuka kembali…"
                >
                  <ArchiveRestore size={15} />
                  {t.reopenClass || "Buka kembali kelas"}
                </Action>
              )}
            </div>
          )}
          {user.role === "SUPER_ADMIN" && (
            <div className="callout note">
              Admin institusi dapat memantau ruang kelas. Pengelolaan
              pembelajaran dilakukan oleh dosen pengampu atau admin prodi
              terkait.
            </div>
          )}
          {user.role === "DEPARTMENT_ADMIN" && !cls.canManage && (
            <div className="callout note">
              Kelas ini berada di luar cakupan program studi Anda. Ruang kelas
              ditampilkan dalam mode baca.
            </div>
          )}
          {isDeptAdminForClass && (
            <div className="callout note">
              Mode Bantuan Prodi: Anda dapat membantu mengelola materi, bank
              soal, kuis, tugas, dan presensi. Pengisian dan penerbitan nilai
              akhir adalah wewenang penuh dosen pengampu.
            </div>
          )}
          {canAdministerClass &&
            isArchived &&
            cls.course.status === "ARCHIVED" && (
              <div className="callout note">
                Mata kuliah ini masih diarsipkan. Minta admin mengaktifkan mata
                kuliah di katalog sebelum membuka kembali kelas.
              </div>
            )}
          {message && <Notice onClose={() => setMessage("")}>{message}</Notice>}
          {phone ? (
            <Field label="Buka bagian kelas">
              <select
                value={tab}
                onChange={(event) =>
                  navigate(
                    event.target.value === "content"
                      ? classUrl
                      : `${classUrl}/${event.target.value}`,
                  )
                }
              >
                {tabs.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
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
          )}
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
              {cls.sections.length > 0 && (
                <div
                  className="section-filter-bar"
                  role="tablist"
                  aria-label="Filter tipe pertemuan"
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap",
                    margin: "12px 0 20px",
                  }}
                >
                  {sectionFilterOptions.map((opt) => {
                    const isActive = sectionTypeFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSectionTypeFilter(opt.key)}
                        className={`badge-tab-pill ${isActive ? "active" : ""}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: isActive ? 600 : 500,
                          border: isActive
                            ? "1px solid var(--primary, #0284c7)"
                            : "1px solid var(--border, #e2e8f0)",
                          background: isActive
                            ? "var(--primary-soft, #f0f9ff)"
                            : "var(--card-bg, #ffffff)",
                          color: isActive
                            ? "var(--primary, #0284c7)"
                            : "var(--foreground, #334155)",
                          cursor: "pointer",
                          boxShadow: isActive ? "0 1px 3px rgba(2, 132, 199, 0.15)" : "none",
                          transition: "all 0.15s ease-in-out",
                        }}
                      >
                        <span>{opt.label}</span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: "18px",
                            height: "18px",
                            padding: "0 6px",
                            borderRadius: "10px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: isActive
                              ? "var(--primary, #0284c7)"
                              : "var(--muted-soft, #f1f5f9)",
                            color: isActive ? "#ffffff" : "var(--muted, #64748b)",
                          }}
                        >
                          {opt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {!cls.sections.length ? (
                <Empty>{t.emptySections}</Empty>
              ) : !filteredSections.length ? (
                <Empty>
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <p style={{ margin: "0 0 10px", color: "var(--muted)" }}>
                      Belum ada pertemuan bertipe "{(t.sectionTypes as any)?.[sectionTypeFilter] || sectionTypeFilter}".
                    </p>
                    <button
                      type="button"
                      className="secondary sm"
                      onClick={() => setSectionTypeFilter("ALL")}
                    >
                      Tampilkan Semua Pertemuan
                    </button>
                  </div>
                </Empty>
              ) : (
                <div className="section-list">
                  {filteredSections.map((section: any) => {
                    const originalIndex = cls.sections.findIndex((s: any) => s.id === section.id);
                    const index = originalIndex >= 0 ? originalIndex : 0;
                    return (
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
                              published(
                                "sections",
                                section.id,
                                !section.isVisible,
                              )
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
                            onClick={() =>
                              setModal({ kind: "section", section })
                            }
                          >
                            {t.edit}
                          </button>
                        </div>
                      )}
                    </div>
                    {section.description && (
                      <div className="meeting-description formatted-content">
                        <Html text={formatContentHtml(section.description)} />
                      </div>
                    )}
                    {(() => {
                      const allItems = [
                        ...section.resources.map((r: any) => ({
                          ...r,
                          _kind: "resource" as const,
                        })),
                        ...section.quizzes.map((q: any) => ({
                          ...q,
                          _kind: "quiz" as const,
                        })),
                        ...section.assignments.map((a: any) => ({
                          ...a,
                          _kind: "assignment" as const,
                        })),
                      ].sort((a, b) => {
                        const orderA = a.contentOrder ?? 0;
                        const orderB = b.contentOrder ?? 0;
                        if (orderA !== orderB) return orderA - orderB;
                        const rank: Record<string, number> = {
                          resource: 0,
                          quiz: 1,
                          assignment: 2,
                        };
                        const rankDiff =
                          (rank[a._kind] ?? 0) - (rank[b._kind] ?? 0);
                        if (rankDiff !== 0) return rankDiff;
                        const dateA = new Date(a.createdAt ?? 0).getTime();
                        const dateB = new Date(b.createdAt ?? 0).getTime();
                        if (dateA !== dateB) return dateA - dateB;
                        return String(a.id).localeCompare(String(b.id));
                      });

                      const moveItem = async (index: number, delta: number) => {
                        const target = index + delta;
                        if (target < 0 || target >= allItems.length) return;
                        const copy = [...allItems];
                        [copy[index], copy[target]] = [
                          copy[target],
                          copy[index],
                        ];
                        await api(`/sections/${section.id}/item-order`, "PUT", {
                          items: copy.map((it) => ({
                            id: it.id,
                            kind: it._kind,
                          })),
                        });
                        info.reload();
                      };

                      return (
                        <div className="learning-items">
                          {allItems.map((item: any, itemIndex: number) => {
                            if (item._kind === "resource") {
                              const r = item;
                              const done = !cls.canManage && isResourceDone(r);
                              const progressPct = !cls.canManage
                                ? Math.round(getResourceProgress(r))
                                : 0;
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
                                        {(t.resourceTypes as any)[
                                          r.resourceType
                                        ]}
                                      </small>
                                    </div>
                                    {!cls.canManage &&
                                      (done ? (
                                        <span className="status-pill completed">
                                          <CheckCircle2 size={13} />
                                          {t.completed}
                                        </span>
                                      ) : progressPct > 0 ? (
                                        <span
                                          className="status-pill in-progress"
                                          style={{
                                            fontWeight: 700,
                                            fontSize: "0.78rem",
                                            padding: "2px 8px",
                                            borderRadius: "12px",
                                            background:
                                              "var(--adaptive-info-soft, #f0f9ff)",
                                            color: "var(--primary, #0284c7)",
                                            border:
                                              "1px solid var(--primary-light, #bae6fd)",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                          }}
                                        >
                                          {progressPct}%
                                        </span>
                                      ) : null)}
                                    <ChevronRight size={16} />
                                  </a>
                                  {!r.isVisible && <Badge value="DRAFT" />}
                                  {writable && (
                                    <PublishButton
                                      path={`/resources/${r.id}`}
                                      title={r.title}
                                      published={r.isVisible}
                                      onPublished={() =>
                                        published(
                                          "resources",
                                          r.id,
                                          !r.isVisible,
                                        )
                                      }
                                    />
                                  )}
                                  {writable && (
                                    <>
                                      <Action
                                        className="icon-button"
                                        disabled={itemIndex === 0}
                                        run={() => moveItem(itemIndex, -1)}
                                      >
                                        <ArrowUp size={16} />
                                        <span className="sr-only">
                                          {t.moveUp}
                                        </span>
                                      </Action>
                                      <Action
                                        className="icon-button"
                                        disabled={
                                          itemIndex === allItems.length - 1
                                        }
                                        run={() => moveItem(itemIndex, 1)}
                                      >
                                        <ArrowDown size={16} />
                                        <span className="sr-only">
                                          {t.moveDown}
                                        </span>
                                      </Action>
                                    </>
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
                            }
                            if (item._kind === "quiz") {
                              const q = item;
                              return (
                                <div className="learning-item" key={q.id}>
                                  <a
                                    href={contentPath(
                                      cls,
                                      "quizzes",
                                      q,
                                      section.quizzes,
                                    )}
                                  >
                                    <span className="activity-icon quiz">
                                      <ClipboardCheck size={19} />
                                    </span>
                                    <div>
                                      <h3>{q.title}</h3>
                                      <small>
                                        {t.quiz} · {q.timeLimitMinutes} min{" "}
                                        {q.availableUntil &&
                                          ` · ${date(q.availableUntil)}`}
                                      </small>
                                    </div>
                                    <ChevronRight size={16} />
                                  </a>
                                  {cls.canManage ? (
                                    <Badge
                                      value={
                                        q.isVisible ? q.status : "DRAFT"
                                      }
                                    />
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
                                      published={
                                        q.status === "PUBLISHED" && q.isVisible
                                      }
                                      onPublished={() =>
                                        published(
                                          "quizzes",
                                          q.id,
                                          !(
                                            q.status === "PUBLISHED" &&
                                            q.isVisible
                                          ),
                                        )
                                      }
                                    />
                                  )}
                                  {writable && (
                                    <>
                                      <Action
                                        className="icon-button"
                                        disabled={itemIndex === 0}
                                        run={() => moveItem(itemIndex, -1)}
                                      >
                                        <ArrowUp size={16} />
                                        <span className="sr-only">
                                          {t.moveUp}
                                        </span>
                                      </Action>
                                      <Action
                                        className="icon-button"
                                        disabled={
                                          itemIndex === allItems.length - 1
                                        }
                                        run={() => moveItem(itemIndex, 1)}
                                      >
                                        <ArrowDown size={16} />
                                        <span className="sr-only">
                                          {t.moveDown}
                                        </span>
                                      </Action>
                                    </>
                                  )}
                                </div>
                              );
                            }
                            if (item._kind === "assignment") {
                              const a = item;
                              return (
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
                                        {a.deadline
                                          ? date(a.deadline)
                                          : t.noDeadline}
                                      </small>
                                    </div>
                                    <ChevronRight size={16} />
                                  </a>
                                  {cls.canManage
                                    ? !a.isVisible && <Badge value="DRAFT" />
                                    : a.userStatus && (
                                        <Badge value={a.userStatus} />
                                      )}
                                  {writable && (
                                    <PublishButton
                                      path={`/assignments/${a.id}`}
                                      title={a.title}
                                      published={a.isVisible}
                                      onPublished={() =>
                                        published(
                                          "assignments",
                                          a.id,
                                          !a.isVisible,
                                        )
                                      }
                                    />
                                  )}
                                  {writable && (
                                    <>
                                      <Action
                                        className="icon-button"
                                        disabled={itemIndex === 0}
                                        run={() => moveItem(itemIndex, -1)}
                                      >
                                        <ArrowUp size={16} />
                                        <span className="sr-only">
                                          {t.moveUp}
                                        </span>
                                      </Action>
                                      <Action
                                        className="icon-button"
                                        disabled={
                                          itemIndex === allItems.length - 1
                                        }
                                        run={() => moveItem(itemIndex, 1)}
                                      >
                                        <ArrowDown size={16} />
                                        <span className="sr-only">
                                          {t.moveDown}
                                        </span>
                                      </Action>
                                    </>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })}
                          {!allItems.length && (
                            <p className="empty-inline">{t.emptyContent}</p>
                          )}
                        </div>
                      );
                    })()}
                    {writable && (
                      <div className="meeting-actions">
                        <button
                          className="text-button"
                          onClick={() =>
                            setModal({
                              kind: "resource",
                              sectionId: section.id,
                            })
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
                            setModal({
                              kind: "assignment",
                              sectionId: section.id,
                            })
                          }
                        >
                          <Plus size={14} />
                          {t.assignment}
                        </button>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
              {writable && cls.sections.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    margin: "24px 0 16px",
                  }}
                >
                  <button
                    className="primary"
                    onClick={() => setModal({ kind: "section" })}
                    style={{
                      padding: "10px 24px",
                      borderRadius: 24,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Plus size={16} />
                    {t.newSection}
                  </button>
                </div>
              )}
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
              writable={(user.role === "INSTRUCTOR" || user.role === "ASSISTANT") && writable}
              user={user}
            />
          )}
          {tab === "participants" && cls.canManage && (
            <Participants
              classId={cls.id}
              writable={administrativeWritable}
              instructors={cls.instructors}
              user={user}
              onInstructorsUpdated={() => info.reload()}
            />
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
                  <article
                    className="card announcement-card"
                    id={`announcement-${a.id}`}
                    key={a.id}
                  >
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
                    <div className="announcement-content formatted-content preserve-lines">
                      <Html text={formatContentHtml(a.content)} />
                    </div>
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
