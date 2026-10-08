import { PrismaClient } from "@prisma/client";
import { generateAllDemoFiles } from "../packages/db/demo-media.ts";
const db = new PrismaClient();
try {
  if (
    process.env.DEMO_MODE !== "true" ||
    !new URL(process.env.DATABASE_URL!).pathname.endsWith("_test")
  ) {
    throw new Error(
      "Demo preparation requires an isolated _test database and DEMO_MODE=true.",
    );
  }
  // Repair the previous fixture ID collision between a student and Dr. Damar
  // without altering student work or immutable audit history.
  const oldId = "00000000-0000-4000-8000-000000000013";
  const damarId = "00000000-0000-4000-8000-000000000020";
  const collided = await db.user.findUnique({ where: { id: oldId } });
  if (
    collided?.identifierValue === "202601004" &&
    collided.role === "STUDENT"
  ) {
    await db.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: damarId },
        create: {
          id: damarId,
          ssoUserId: damarId,
          name: "Dr. Damar Wicaksana",
          role: "INSTRUCTOR",
          userType: "LECTURER",
          identifierType: "NIDN",
          identifierValue: "1112089004",
          username: "1112089004",
          email: "1112089004@example.test",
          status: "ACTIVE",
          departmentScopes: ["Teknik Sipil", "TS"],
        },
        update: {},
      });
      const invalid = await tx.classInstructor.findMany({
        where: {
          userId: oldId,
          class: { course: { departmentCode: { in: ["Teknik Sipil", "TS"] } } },
        },
      });
      for (const row of invalid) {
        await tx.classInstructor.upsert({
          where: { classId_userId: { classId: row.classId, userId: damarId } },
          create: { classId: row.classId, userId: damarId },
          update: {},
        });
        await tx.classInstructor.delete({ where: { id: row.id } });
      }
    });
  }
  for (const file of generateAllDemoFiles()) {
    await db.fileReference.updateMany({
      where: { id: file.id },
      data: { sizeBytes: file.sizeBytes, checksum: file.checksum },
    });
  }
} finally {
  await db.$disconnect();
}
