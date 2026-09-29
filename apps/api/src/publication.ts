import type { Express } from "express";
import { z } from "zod";
import {
  classAccess,
  itemAccess,
  mutate,
  ensure,
  audit,
  notify,
} from "./core.js";
import { validateResource, validateWindow } from "./learning.js";
import { quizSchema, assignmentSchema, checkCategory } from "./assessment.js";
import { validateTotal } from "../../../packages/shared/src/domain.js";

// Dedicated publication changes visibility only, preserving content, dates,
// question IDs and existing submissions. All writes remain audited/idempotent.
export function registerPublication(app: Express) {
  for (const kind of [
    "sections",
    "resources",
    "quizzes",
    "assignments",
    "announcements",
  ] as const) {
    app.post(`/api/v1/${kind}/:id/publish`, async (req, res) =>
      res.json(
        await mutate(req, async (tx) => {
          const id = String(req.params.id);
          z.object({})
            .strict()
            .parse(req.body ?? {});
          const before =
            kind === "sections"
              ? await tx.section.findUnique({ where: { id } })
              : kind === "resources"
                ? await tx.resourceItem.findUnique({ where: { id } })
                : kind === "quizzes"
                  ? await tx.quiz.findUnique({
                      where: { id },
                      include: { questions: true },
                    })
                  : kind === "assignments"
                    ? await tx.assignment.findUnique({ where: { id } })
                    : await tx.announcement.findUnique({ where: { id } });
          ensure(before, 404, "NOT_FOUND");
          const cls =
            "classId" in before
              ? await classAccess(tx, req.context.user, before.classId, true)
              : await itemAccess(tx, req.context.user, before.sectionId, true);
          const raw = JSON.parse(JSON.stringify(before));
          let after;
          let entity: string;
          if (kind === "sections") {
            const section = await tx.section.findUniqueOrThrow({
              where: { id },
            });
            validateWindow(section.startDate, section.endDate);
            after = await tx.section.update({
              where: { id },
              data: { isVisible: true },
            });
            entity = "SECTION";
          } else if (kind === "resources") {
            await validateResource({ ...raw, isVisible: true }, tx, cls.id);
            after = await tx.resourceItem.update({
              where: { id },
              data: { isVisible: true },
            });
            entity = "RESOURCE";
          } else if (kind === "quizzes") {
            const quiz = quizSchema.parse({
              ...raw,
              description: raw.description ?? "",
              timeLimitMinutes: raw.timeLimitMinutes ?? undefined,
              questions: raw.questions.map((q: any) => ({
                ...q,
                explanation: q.explanation ?? "",
              })),
              status: "PUBLISHED",
              isVisible: true,
            });
            validateWindow(quiz.availableFrom, quiz.availableUntil);
            ensure(
              quiz.scoreMode === "NORMALIZED" ||
                validateTotal(quiz.questions.map((q) => q.points)),
              400,
              "QUIZ_POINTS_TOTAL",
            );
            ensure(
              quiz.resultReleaseMode !== "SCHEDULED" || quiz.resultReleaseAt,
              400,
              "RELEASE_DATE_REQUIRED",
            );
            if (raw.status !== "PUBLISHED")
              ensure(
                (await tx.quizAttempt.count({ where: { quizId: id } })) === 0,
                409,
                "QUIZ_HAS_ATTEMPTS",
              );
            await checkCategory(tx, quiz.gradeCategoryId, cls.id);
            after = await tx.quiz.update({
              where: { id },
              data: { status: "PUBLISHED", isVisible: true },
            });
            entity = "QUIZ";
          } else if (kind === "assignments") {
            const assignment = assignmentSchema.parse({
              ...raw,
              isVisible: true,
            });
            validateWindow(assignment.availableFrom, assignment.deadline);
            validateWindow(assignment.deadline, assignment.cutoffDate);
            await checkCategory(tx, assignment.gradeCategoryId, cls.id);
            after = await tx.assignment.update({
              where: { id },
              data: { isVisible: true },
            });
            entity = "ASSIGNMENT";
            const section = await tx.section.findUniqueOrThrow({
              where: { id: after.sectionId },
            });
            const now = new Date();
            if (
              cls.status === "PUBLISHED" &&
              cls.course.status === "PUBLISHED" &&
              section.isVisible &&
              (!section.startDate || section.startDate <= now) &&
              (!section.endDate || section.endDate >= now) &&
              (!after.availableFrom || after.availableFrom <= now)
            )
              await notify(
                tx,
                cls.id,
                "NEW_ASSIGNMENT",
                after.title,
                `assignment:${id}`,
              );
          } else {
            after = await tx.announcement.update({
              where: { id },
              data: { isPublished: true },
            });
            entity = "ANNOUNCEMENT";
            if (
              after.publishedAt <= new Date() &&
              cls.status === "PUBLISHED" &&
              cls.course.status === "PUBLISHED"
            )
              await notify(
                tx,
                cls.id,
                "ANNOUNCEMENT",
                after.title,
                `announcement:${id}`,
              );
          }
          await audit(
            tx,
            req.context,
            "PUBLISH",
            entity,
            id,
            cls.id,
            before,
            after,
          );
          return { id, published: true };
        }),
      ),
    );
    app.post(`/api/v1/${kind}/:id/unpublish`, async (req, res) =>
      res.json(
        await mutate(req, async (tx) => {
          const id = String(req.params.id);
          z.object({})
            .strict()
            .parse(req.body ?? {});
          const before =
            kind === "sections"
              ? await tx.section.findUnique({ where: { id } })
              : kind === "resources"
                ? await tx.resourceItem.findUnique({ where: { id } })
                : kind === "quizzes"
                  ? await tx.quiz.findUnique({ where: { id } })
                  : kind === "assignments"
                    ? await tx.assignment.findUnique({ where: { id } })
                    : await tx.announcement.findUnique({ where: { id } });
          ensure(before, 404, "NOT_FOUND");
          const cls =
            "classId" in before
              ? await classAccess(tx, req.context.user, before.classId, true)
              : await itemAccess(tx, req.context.user, before.sectionId, true);
          // Hiding a quiz keeps its published status and question IDs so
          // existing attempts and grades remain intact and can be resumed.
          const after =
            kind === "sections"
              ? await tx.section.update({
                  where: { id },
                  data: { isVisible: false },
                })
              : kind === "resources"
                ? await tx.resourceItem.update({
                    where: { id },
                    data: { isVisible: false },
                  })
                : kind === "quizzes"
                  ? await tx.quiz.update({
                      where: { id },
                      data: { isVisible: false },
                    })
                  : kind === "assignments"
                    ? await tx.assignment.update({
                        where: { id },
                        data: { isVisible: false },
                      })
                    : await tx.announcement.update({
                        where: { id },
                        data: { isPublished: false },
                      });
          await audit(
            tx,
            req.context,
            "UNPUBLISH",
            {
              sections: "SECTION",
              resources: "RESOURCE",
              quizzes: "QUIZ",
              assignments: "ASSIGNMENT",
              announcements: "ANNOUNCEMENT",
            }[kind],
            id,
            cls.id,
            before,
            after,
          );
          return { id, published: false };
        }),
      ),
    );
  }
}
