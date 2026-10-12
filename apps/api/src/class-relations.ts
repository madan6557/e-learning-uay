import type { Prisma } from "@prisma/client";
import { isAssistantClassAssignment } from "./core.js";

export async function syncPracticumFromParent(
  tx: Prisma.TransactionClient,
  parentClassId: string,
) {
  const [child, parentEnrollments, parentInstructors] = await Promise.all([
    tx.courseClass.findUnique({
      where: { parentClassId },
      select: { id: true },
    }),
    tx.enrollment.findMany({
      where: { classId: parentClassId },
      select: { userId: true, isActive: true },
    }),
    tx.classInstructor.findMany({
      where: { classId: parentClassId },
      include: { user: { select: { id: true, role: true } } },
    }),
  ]);
  if (!child) return;

  const parentUserIds = new Set(parentEnrollments.map((item) => item.userId));
  for (const enrollment of parentEnrollments) {
    await tx.enrollment.upsert({
      where: {
        classId_userId: { classId: child.id, userId: enrollment.userId },
      },
      create: {
        classId: child.id,
        userId: enrollment.userId,
        isActive: enrollment.isActive,
      },
      update: { isActive: enrollment.isActive },
    });
  }
  const staleEnrollments = await tx.enrollment.findMany({
    where: {
      classId: child.id,
      ...(parentUserIds.size ? { userId: { notIn: [...parentUserIds] } } : {}),
    },
    select: { userId: true },
  });
  if (staleEnrollments.length) {
    await tx.enrollment.updateMany({
      where: {
        classId: child.id,
        userId: { in: staleEnrollments.map((item) => item.userId) },
        isActive: true,
      },
      data: { isActive: false },
    });
  }

  const assistantIds = parentInstructors
    .filter((item) => isAssistantClassAssignment(item, item.user))
    .map((item) => item.userId);
  await tx.classInstructor.deleteMany({
    where: {
      classId: child.id,
      ...(assistantIds.length ? { userId: { notIn: assistantIds } } : {}),
    },
  });
  for (const userId of assistantIds) {
    await tx.classInstructor.upsert({
      where: { classId_userId: { classId: child.id, userId } },
      create: {
        classId: child.id,
        userId,
        role: "ASSISTANT",
        isPrimary: false,
      },
      update: { role: "ASSISTANT", isPrimary: false },
    });
  }
}
