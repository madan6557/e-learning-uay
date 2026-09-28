import type { User } from "@prisma/client";
import { available, canManageDepartment, db } from "./core.js";

type DashboardClass = {
  id: string;
  course: { departmentCode: string };
  instructors: { userId: string }[];
};

// Load only dashboard fields, in batches across the already-authorized classes.
// No material bodies, assignment instructions, questions or answers are returned.
export async function dashboardClasses<T extends DashboardClass>(
  classes: T[],
  user: User,
) {
  if (!classes.length) return [];
  const classIds = classes.map((c) => c.id);
  const managed = new Set(
    classes
      .filter(
        (c) =>
          canManageDepartment(user, c.course.departmentCode) ||
          c.instructors.some((i) => i.userId === user.id),
      )
      .map((c) => c.id),
  );
  const progressWhere = {
    userId: user.id,
    resourceItem: { section: { classId: { in: classIds } } },
  };
  const sectionsPromise = db.section.findMany({
    where: { classId: { in: classIds } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      classId: true,
      isVisible: true,
      startDate: true,
      endDate: true,
      resources: {
        orderBy: { contentOrder: "asc" },
        select: {
          id: true,
          resourceType: true,
          isVisible: true,
          availableFrom: true,
          availableUntil: true,
        },
      },
      assignments: {
        orderBy: { contentOrder: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          deadline: true,
          isVisible: true,
        },
      },
      quizzes: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          availableUntil: true,
          isVisible: true,
        },
      },
    },
  });
  const [sections, video, slides, downloads, text, assignments, quizzes] =
    await Promise.all([
      sectionsPromise,
      db.videoProgress.findMany({
        where: progressWhere,
        select: { resourceItemId: true, percent: true },
      }),
      db.slideProgress.findMany({
        where: progressWhere,
        select: { resourceItemId: true, percent: true },
      }),
      db.materialDownload.findMany({
        where: progressWhere,
        select: { resourceItemId: true },
      }),
      // Text progress has no resource relation; restrict it to authorized IDs.
      sectionsPromise.then((sections) =>
        db.resourceProgress.findMany({
          where: {
            userId: user.id,
            resourceItemId: {
              in: sections.flatMap((s) => s.resources.map((r) => r.id)),
            },
          },
          select: { resourceItemId: true },
        }),
      ),
      managed.size
        ? db.assignmentSubmission.groupBy({
            by: ["assignmentId"],
            where: {
              assignment: { section: { classId: { in: [...managed] } } },
              status: { in: ["SUBMITTED", "LATE"] },
            },
            _count: true,
          })
        : [],
      managed.size
        ? db.quizAttempt.groupBy({
            by: ["quizId"],
            where: {
              quiz: { section: { classId: { in: [...managed] } } },
              status: "NEEDS_GRADING",
            },
            _count: true,
          })
        : [],
    ]);
  const now = new Date();
  const visible = (item: Parameters<typeof available>[0]) => {
    try {
      available(item, now);
      return true;
    } catch {
      return false;
    }
  };
  const byClass = new Map<string, typeof sections>();
  for (const section of sections) {
    const list = byClass.get(section.classId) ?? [];
    list.push(section);
    byClass.set(section.classId, list);
  }
  const videoById = new Map(video.map((p) => [p.resourceItemId, p]));
  const slidesById = new Map(slides.map((p) => [p.resourceItemId, p]));
  const downloadsById = new Map(downloads.map((p) => [p.resourceItemId, p]));
  const textById = new Map(text.map((p) => [p.resourceItemId, p]));
  const assignmentCounts = new Map(
    assignments.map((a) => [a.assignmentId, a._count]),
  );
  const quizCounts = new Map(quizzes.map((q) => [q.quizId, q._count]));
  return classes.map((cls) => {
    const canManage = managed.has(cls.id);
    const sections = (byClass.get(cls.id) ?? [])
      .filter((s) => canManage || visible(s))
      .map((s) => ({
        id: s.id,
        resources: s.resources
          .filter((r) => canManage || visible(r))
          .map(({ id, resourceType }) => ({ id, resourceType })),
        assignments: s.assignments.filter((a) => canManage || a.isVisible),
        quizzes: s.quizzes.filter(
          (q) => canManage || (q.isVisible && q.status === "PUBLISHED"),
        ),
      }));
    const ids = sections.flatMap((s) => s.resources.map((r) => r.id));
    const collect = <P>(map: Map<string, P>) =>
      ids.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
    return {
      ...cls,
      sections,
      progress: {
        video: collect(videoById),
        slides: collect(slidesById),
        downloads: collect(downloadsById),
        text: collect(textById),
      },
      gradingQueue: canManage
        ? sections.flatMap((s) => [
            ...s.assignments.flatMap((a) =>
              assignmentCounts.has(a.id)
                ? [
                    {
                      id: a.id,
                      kind: "assignment",
                      count: assignmentCounts.get(a.id)!,
                    },
                  ]
                : [],
            ),
            ...s.quizzes.flatMap((q) =>
              quizCounts.has(q.id)
                ? [{ id: q.id, kind: "quiz", count: quizCounts.get(q.id)! }]
                : [],
            ),
          ])
        : [],
    };
  });
}
