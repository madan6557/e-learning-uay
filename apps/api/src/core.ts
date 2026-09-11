import { Prisma, PrismaClient, type User } from "@prisma/client";
import { Redis } from "ioredis";
import { createHash, randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import type { Request } from "express";
try {
  loadEnvFile();
} catch (error: any) {
  if (error.code !== "ENOENT") throw error;
}
export const isDemo =
  process.env.DEMO_MODE === "true" || process.env.AUTH_MODE === "development";
export const production = process.env.NODE_ENV === "production" && !isDemo;
export const config = {
  port: Number(process.env.PORT ?? 3000),
  origin: (process.env.APP_ORIGIN ?? "http://127.0.0.1:5173")
    .split(",")[0]
    .trim()
    .replace(/\/$/, ""),
  allowedOrigins: [
    ...(process.env.APP_ORIGIN
      ? process.env.APP_ORIGIN.split(",")
      : ["http://127.0.0.1:5173"]),
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : []),
  ]
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  authMode: process.env.AUTH_MODE ?? (isDemo ? "development" : "oidc"),
  issuer: process.env.SSO_ISSUER ?? "",
  clientId: process.env.SSO_CLIENT_ID ?? "elearning-uay",
  audience: process.env.SSO_AUDIENCE ?? "elearning-uay",
  clientSecret: process.env.SSO_CLIENT_SECRET ?? "",
  redirectUri:
    process.env.SSO_REDIRECT_URI ??
    "http://127.0.0.1:5173/api/v1/auth/callback",
  fileUrl: process.env.FILE_SERVICE_URL ?? "",
  fileKey: process.env.FILE_SERVICE_KEY ?? "",
  fileOrigins: (process.env.FILE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  embedOrigins: (
    process.env.EMBED_ALLOWED_ORIGINS ??
    "https://www.youtube.com,https://www.youtube-nocookie.com,https://drive.google.com"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
if (
  production &&
  (config.authMode !== "oidc" ||
    !process.env.REDIS_URL ||
    !process.env.DATABASE_URL ||
    !config.fileKey ||
    !config.fileOrigins.length ||
    !process.env.SSO_WEBHOOK_SECRET ||
    ![config.origin, config.issuer, config.redirectUri, config.fileUrl].every(
      (v) => v.startsWith("https://"),
    ))
)
  throw new Error(
    "Production requires OIDC, HTTPS origins, database, Redis, File Service and webhook credentials.",
  );
export const db = new PrismaClient();
export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    })
  : null;
redis?.on("error", () => console.error("Redis connection unavailable"));
const memory = new Map<string, { value: string; expires: number }>();
// Development fallback only; production always uses Redis and fails closed.
export const cache = {
  async get(key: string) {
    if (redis) return redis.get(key);
    const item = memory.get(key);
    if (item && item.expires > Date.now()) return item.value;
    memory.delete(key);
    return null;
  },
  async set(key: string, value: string, seconds: number) {
    if (redis) {
      await redis.set(key, value, "EX", seconds);
      return;
    }
    if (memory.size > 10000)
      for (const [k, v] of memory) if (v.expires < Date.now()) memory.delete(k);
    memory.set(key, { value, expires: Date.now() + seconds * 1000 });
  },
  async del(key: string) {
    if (redis) await redis.del(key);
    else memory.delete(key);
  },
  async take(key: string) {
    if (redis) return redis.getdel(key);
    const value = await this.get(key);
    memory.delete(key);
    return value;
  },
  async rate(key: string, limit: number, seconds: number) {
    if (redis)
      return (
        Number(
          await redis.eval(
            "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
            1,
            key,
            seconds,
          ),
        ) <= limit
      );
    const item = memory.get(key);
    const current =
      item && item.expires > Date.now()
        ? item
        : { value: "0", expires: Date.now() + seconds * 1000 };
    current.value = String(Number(current.value) + 1);
    memory.set(key, current);
    return Number(current.value) <= limit;
  },
};
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: unknown,
  ) {
    super(code);
  }
}
export function ensure(
  condition: unknown,
  status: number,
  code: string,
  details?: unknown,
): asserts condition {
  if (!condition) throw new HttpError(status, code, details);
}
export type Context = {
  user: User;
  requestId: string;
  ip: string;
  userAgent: string;
};
declare global {
  namespace Express {
    interface Request {
      context: Context;
      rawBody?: string;
    }
  }
}
export const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function transaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
  isolationLevel: Prisma.TransactionIsolationLevel = "Serializable",
): Promise<T> {
  for (let attempt = 0; ; attempt++)
    try {
      return await db.$transaction(run, { isolationLevel, timeout: 15000 });
    } catch (error: any) {
      if (!["P2034", "P2002"].includes(error.code) || attempt >= 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
}
export async function audit(
  tx: Prisma.TransactionClient,
  context: Context,
  action: string,
  entity: string,
  entityId: string,
  classId: string | null,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  return tx.auditLog.create({
    data: {
      actorId: context.user.id,
      actorRole: context.user.role,
      action,
      entity,
      entityId,
      classId,
      beforeState: before == null ? Prisma.JsonNull : json(before),
      afterState: after == null ? Prisma.JsonNull : json(after),
      metadata: json({
        requestId: context.requestId,
        clientIp: context.ip,
        userAgent: context.userAgent,
        reason,
      }),
    },
  });
}
export async function mutate<T>(
  req: Request,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
  isolation: Prisma.TransactionIsolationLevel = "Serializable",
) {
  const key = req.get("Idempotency-Key");
  ensure(
    key && key.length >= 16 && key.length <= 100,
    400,
    "IDEMPOTENCY_REQUIRED",
  );
  const requestHash = hash(
    `${req.context.user.role}:${req.context.user.departmentScopes.join(",")}:${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`,
  );
  return transaction(async (tx) => {
    const previous = await tx.idempotencyRecord.findUnique({
      where: { userId_key: { userId: req.context.user.id, key } },
    });
    if (previous) {
      ensure(previous.requestHash === requestHash, 409, "IDEMPOTENCY_CONFLICT");
      return previous.result as T;
    }
    const result = await run(tx);
    await tx.idempotencyRecord.create({
      data: {
        userId: req.context.user.id,
        key,
        requestHash,
        result: json(result),
      },
    });
    return result;
  }, isolation);
}
export const canManageDepartment = (user: User, department: string) =>
  user.role === "SUPER_ADMIN" ||
  (user.role === "DEPARTMENT_ADMIN" &&
    user.departmentScopes.includes(department));
export async function classAccess(
  tx: Prisma.TransactionClient,
  user: User,
  classId: string,
  write = false,
  studentWrite = false,
) {
  const item = await tx.courseClass.findUnique({
    where: { id: classId },
    include: {
      course: true,
      instructors: true,
      enrollments: { where: { userId: user.id, isActive: true } },
    },
  });
  ensure(item, 404, "NOT_FOUND");
  const manage =
    canManageDepartment(user, item.course.departmentCode) ||
    item.instructors.some((i) => i.userId === user.id);
  const enrolled = item.enrollments.length > 0;
  ensure(
    manage ||
      (enrolled && item.status !== "DRAFT" && item.course.status !== "DRAFT"),
    403,
    "CLASS_ACCESS_DENIED",
  );
  if (write) {
    ensure(manage || (studentWrite && enrolled), 403, "WRITE_ACCESS_DENIED");
    ensure(
      item.status !== "ARCHIVED" && item.course.status !== "ARCHIVED",
      423,
      "CLASS_ARCHIVED",
    );
  }
  return { ...item, canManage: manage };
}
export function available(
  item: {
    isVisible?: boolean;
    availableFrom?: Date | null;
    availableUntil?: Date | null;
    startDate?: Date | null;
    endDate?: Date | null;
  },
  now = new Date(),
) {
  ensure(item.isVisible !== false, 403, "CONTENT_HIDDEN");
  const start = item.availableFrom ?? item.startDate;
  const end = item.availableUntil ?? item.endDate;
  ensure(!start || now >= start, 403, "NOT_OPEN_YET", { at: start });
  ensure(!end || now <= end, 403, "CONTENT_CLOSED", { at: end });
}
export async function itemAccess(
  tx: Prisma.TransactionClient,
  user: User,
  sectionId: string,
  write = false,
  studentWrite = false,
) {
  const section = await tx.section.findUnique({ where: { id: sectionId } });
  ensure(section, 404, "NOT_FOUND");
  const cls = await classAccess(tx, user, section.classId, write, studentWrite);
  if (!cls.canManage) available(section);
  return cls;
}
export async function notify(
  tx: Prisma.TransactionClient,
  classId: string,
  type: string,
  title: string,
  eventKey: string,
  userId?: string,
) {
  const members = userId
    ? [{ userId }]
    : await tx.enrollment.findMany({
        where: { classId, isActive: true },
        select: { userId: true },
      });
  await tx.notification.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      type,
      title,
      message: title,
      eventKey,
      linkUrl: `#/classes/${classId}`,
    })),
    skipDuplicates: true,
  });
}
export const systemContext = (user: User): Context => ({
  user,
  requestId: randomUUID(),
  ip: "system",
  userAgent: "expiry-worker",
});
