/**
 * ============================================================================
 * E-LEARNING UNIVERSITAS ACHMAD YANI (UAY) - CORE UTILITIES & DATABASE LAYER
 * ============================================================================
 * @module apps/api/src/core.ts
 *
 * Lapisan fondasi backend: koneksi database Prisma, caching Redis, utilitas
 * transaksi, penegakan integritas hak akses, audit logging, dan notifikasi.
 *
 * Fungsi & Primitif Kunci:
 * - `db`: PrismaClient singleton untuk transaksi database PostgreSQL.
 * - `ensure(condition, status, code, extra)`: Guard assertion pemutus request dengan HttpError.
 * - `mutate(req, callback)`: Wrapper mutasi ACID dengan audit logging otomatis.
 * - `classAccess(tx, user, classId, write, studentWrite)`: Pengendali otorisasi akses kelas
 *    terpusat untuk INSTRUCTOR, DEPARTMENT_ADMIN (dalam scope prodi), dan STUDENT.
 * - `audit(tx, context, action, entityType, ...)`: Pencatat jejak audit permanen.
 * - `notify(tx, classId, type, title, ...)`: Pengirim notifikasi in-app kepada mahasiswa/dosen.
 * ============================================================================
 */

import { classPath } from "../../../packages/shared/src/urls.js";
import {
  canManageDepartmentScope,
  hasPermission,
} from "../../../packages/shared/src/permissions.js";
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
export const production = process.env.NODE_ENV === "production";
export const isDemo = process.env.DEMO_MODE === "true";
const originFrom = (value: string | undefined, fallback: string) =>
  (value ?? fallback).split(",")[0].trim().replace(/\/$/, "");
const appOrigin = originFrom(
  process.env.APP_ORIGIN,
  production ? "https://elearning.uay.ac.id" : "http://127.0.0.1:5173",
);
const apiOrigin = originFrom(process.env.API_ORIGIN, appOrigin);
const accountUrlFromEnv = process.env.SSO_ACCOUNT_URL?.trim() ?? "";
function accountManagementUrl() {
  if (!accountUrlFromEnv) return "";
  try {
    const url = new URL(accountUrlFromEnv);
    if (
      url.protocol === "https:" ||
      (!production &&
        url.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(url.hostname))
    )
      return url.href;
  } catch {}
  return "";
}
let _fileUrlOverride: string | null = null;
let _fileKeyOverride: string | null = null;
let _fileRepoIdOverride: string | null = null;
let _fileClientIdOverride: string | null = null;

export const config = {
  port: Number(process.env.PORT ?? 3001),
  // The browser application can live on Vercel while this API lives on Railway.
  // API_ORIGIN falls back to APP_ORIGIN for local and single-origin deployments.
  origin: appOrigin,
  apiOrigin: originFrom(process.env.API_ORIGIN, appOrigin),
  allowedOrigins: [
    ...(process.env.APP_ORIGIN
      ? process.env.APP_ORIGIN.split(",")
      : ["http://127.0.0.1:5173"]),
    ...(process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : []),
    "https://e-learning.uay.ac.id",
    "https://elearning.uay.ac.id",
  ]
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  authMode: process.env.AUTH_MODE ?? (isDemo ? "development" : "oidc"),
  issuer: process.env.SSO_ISSUER ?? "",
  ssoApiBaseUrl:
    process.env.SSO_API_BASE_URL?.trim() ||
    process.env.SSO_BACKEND_URL?.trim() ||
    "",
  accountUrl: accountManagementUrl(),
  clientId: process.env.SSO_CLIENT_ID ?? "elearning-uay",
  audience: process.env.SSO_AUDIENCE ?? "elearning-uay",
  clientSecret: process.env.SSO_CLIENT_SECRET ?? "",
  redirectUri:
    process.env.SSO_REDIRECT_URI ?? `${appOrigin}/api/v1/auth/callback`,
  get fileUrl(): string {
    if (_fileUrlOverride !== null) return _fileUrlOverride;
    if (process.env.FILE_SERVICE_TYPE === "legacy") {
      return (
        process.env.FILE_SERVICE_URL?.trim() ||
        process.env.FILE_SERVICE_API_URL?.trim() ||
        ""
      );
    }
    return (
      process.env.UAY_FILE_SERVICE_URL?.trim() ||
      process.env.FILE_SERVICE_URL?.trim() ||
      process.env.FILE_SERVICE_API_URL?.trim() ||
      ""
    );
  },
  set fileUrl(val: string) {
    _fileUrlOverride = val;
  },
  get fileKey(): string {
    if (_fileKeyOverride !== null) return _fileKeyOverride;
    if (process.env.FILE_SERVICE_TYPE === "legacy") {
      return (
        process.env.FILE_SERVICE_KEY?.trim() ||
        process.env.FILE_SERVICE_API_KEY?.trim() ||
        ""
      );
    }
    return (
      process.env.UAY_FILE_SERVICE_API_KEY?.trim() ||
      process.env.FILE_SERVICE_API_KEY?.trim() ||
      process.env.FILE_SERVICE_KEY?.trim() ||
      ""
    );
  },
  set fileKey(val: string) {
    _fileKeyOverride = val;
  },
  get fileRepoId(): string {
    if (_fileRepoIdOverride !== null) return _fileRepoIdOverride;
    return (
      process.env.UAY_FILE_SERVICE_REPOSITORY_ID?.trim() ||
      process.env.FILE_SERVICE_REPOSITORY_ID?.trim() ||
      process.env.FILE_SERVICE_REPO_ID?.trim() ||
      "00000000-0000-0000-0000-000000000001"
    );
  },
  set fileRepoId(val: string) {
    _fileRepoIdOverride = val;
  },
  get fileClientId(): string {
    if (_fileClientIdOverride !== null) return _fileClientIdOverride;
    return (
      process.env.UAY_FILE_SERVICE_CLIENT_ID?.trim() ||
      process.env.FILE_SERVICE_CLIENT_ID?.trim() ||
      process.env.SSO_CLIENT_ID?.trim() ||
      "elearning-uay"
    );
  },
  set fileClientId(val: string) {
    _fileClientIdOverride = val;
  },
  get fileMode(): "uay" | "legacy" | "local" {
    if (process.env.FILE_SERVICE_TYPE === "legacy") return "legacy";
    if (process.env.FILE_SERVICE_TYPE === "uay") return "uay";
    const url = this.fileUrl;
    const key = this.fileKey;
    if (!url || !key) return "local";
    const isUay = Boolean(
      process.env.UAY_FILE_SERVICE_URL ||
      process.env.UAY_FILE_SERVICE_API_KEY ||
      url.includes("/api/v1") ||
      url.includes("file-service.uay.ac.id"),
    );
    return isUay ? "uay" : "legacy";
  },
  get fileOrigins(): string[] {
    return Array.from(
      new Set([
        ...(process.env.FILE_ALLOWED_ORIGINS ?? "")
          .split(",")
          .map((s) => s.trim().replace(/\/$/, ""))
          .filter(Boolean),
        ...(() => {
          const u =
            process.env.UAY_FILE_SERVICE_URL?.trim() ||
            process.env.FILE_SERVICE_URL?.trim() ||
            process.env.FILE_SERVICE_API_URL?.trim();
          if (!u) return [];
          try {
            return [new URL(u).origin];
          } catch {
            return [];
          }
        })(),
        apiOrigin,
        appOrigin,
      ]),
    );
  },
  embedOrigins: (
    process.env.EMBED_ALLOWED_ORIGINS ??
    "https://www.youtube.com,https://www.youtube-nocookie.com,https://drive.google.com,https://youtu.be"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
const initialAcademicYear =
  process.env.ACADEMIC_YEAR?.trim() || "2026/2027 Ganjil";
const initialAcademicSettings = {
  academicYear: initialAcademicYear,
  semesterLabel:
    process.env.SEMESTER_LABEL?.trim() || "SEMESTER GANJIL 2026/2027",
  academicYears: [
    ...new Set([
      "2025/2026 Ganjil",
      "2025/2026 Genap",
      "2026/2027 Ganjil",
      "2026/2027 Genap",
      "2027/2028 Ganjil",
      "2027/2028 Genap",
      initialAcademicYear,
    ]),
  ],
  defaultGradeScaleVersion: "2026.1",
  minAttendancePercentage: 75,
};

export async function getAcademicSettings(
  client: Prisma.TransactionClient = db,
) {
  return client.academicSettings.upsert({
    where: { id: "global" },
    create: { id: "global", ...initialAcademicSettings },
    update: {},
  });
}

export const resolvedRedisUrl =
  process.env.REDIS_URL?.trim() ||
  process.env.REDIS_PRIVATE_URL?.trim() ||
  (process.env.REDISHOST
    ? `redis://${process.env.REDISUSER ? `${encodeURIComponent(process.env.REDISUSER)}:${encodeURIComponent(process.env.REDISPASSWORD || "")}@` : process.env.REDISPASSWORD ? `:${encodeURIComponent(process.env.REDISPASSWORD)}@` : ""}${process.env.REDISHOST}:${process.env.REDISPORT || 6379}`
    : undefined);

function productionConfigurationErrors() {
  const invalid: string[] = [];

  const required = (name: string, value?: string) => {
    if (!value?.trim()) invalid.push(name);
  };

  required("APP_ORIGIN", process.env.APP_ORIGIN);
  required("DATABASE_URL", process.env.DATABASE_URL);

  // Demo mode boleh berjalan tanpa OIDC, Redis, SSO, File Service, dan HTTPS internal.
  if (isDemo) {
    return [...new Set(invalid)];
  }

  if (config.authMode !== "oidc") {
    invalid.push("AUTH_MODE=oidc");
  }

  // Grace: Redis is optional; missing or unavailable Redis uses memory.
  required("SSO_ISSUER", process.env.SSO_ISSUER);
  required("SSO_CLIENT_ID", process.env.SSO_CLIENT_ID);
  // SSO_CLIENT_SECRET bersifat opsional (tidak diperlukan untuk Client bertipe Public dengan PKCE)
  required("SSO_AUDIENCE", process.env.SSO_AUDIENCE);
  required("SSO_REDIRECT_URI", process.env.SSO_REDIRECT_URI);
  // Grace: an unconfigured revocation webhook remains disabled with HTTP 503.

  const activeFileUrl =
    process.env.UAY_FILE_SERVICE_URL?.trim() ||
    process.env.FILE_SERVICE_URL?.trim() ||
    process.env.FILE_SERVICE_API_URL?.trim();
  const activeFileKey =
    process.env.UAY_FILE_SERVICE_API_KEY?.trim() ||
    process.env.FILE_SERVICE_API_KEY?.trim() ||
    process.env.FILE_SERVICE_KEY?.trim();

  if (!activeFileUrl) {
    invalid.push("FILE_SERVICE_URL or UAY_FILE_SERVICE_URL");
  }
  if (!activeFileKey) {
    invalid.push("FILE_SERVICE_KEY or UAY_FILE_SERVICE_API_KEY");
  }
  if (config.fileMode === "local") {
    invalid.push(
      "FILE_SERVICE_REQUIRED (mode production wajib hanya menerima file service)",
    );
  }
  required("FILE_ALLOWED_ORIGINS", process.env.FILE_ALLOWED_ORIGINS);

  if (accountUrlFromEnv && !config.accountUrl) {
    invalid.push("HTTPS SSO_ACCOUNT_URL");
  }

  const isIntranetOrLocal = (value: string) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "http:" &&
        ["file-service.uay.ac.id", "127.0.0.1", "localhost"].includes(
          url.hostname,
        ) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  };

  if (
    [config.origin, config.apiOrigin, config.issuer, config.redirectUri].some(
      (value) => !value.startsWith("https://"),
    ) ||
    (config.fileUrl &&
      !config.fileUrl.startsWith("https://") &&
      !isIntranetOrLocal(config.fileUrl))
  ) {
    invalid.push(
      "HTTPS APP_ORIGIN, API_ORIGIN, SSO_ISSUER, SSO_REDIRECT_URI, FILE_SERVICE_URL",
    );
  }

  if (
    !config.fileOrigins.length ||
    config.fileOrigins.some(
      (value) => !value.startsWith("https://") && !isIntranetOrLocal(value),
    )
  ) {
    invalid.push("HTTPS FILE_ALLOWED_ORIGINS");
  }

  return [...new Set(invalid)];
}
if (production) {
  const invalid = productionConfigurationErrors();
  if (invalid.length) {
    console.error(
      `[FATAL CONFIG ERROR] Production configuration check failed: ${invalid.join(", ")}`,
    );
    throw new Error(
      `Production requires OIDC and valid configuration. Set or correct: ${invalid.join(", ")}.`,
    );
  }
  if (!isDemo && !process.env.SSO_WEBHOOK_SECRET?.trim()) {
    console.warn(
      "[Auth] SSO_WEBHOOK_SECRET belum diisi: grace aktif; webhook pencabutan akun mengembalikan 503.",
    );
  }
}
export const db = new PrismaClient();
export const redis = resolvedRedisUrl
  ? new Redis(resolvedRedisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    })
  : null;

if (redis) {
  redis.on("connect", () =>
    console.log("[Cache] Redis terhubung: menggunakan Redis cluster/server."),
  );
  redis.on("error", (err) =>
    console.error("[Cache] Redis connection error (fallback ke in-memory):", err.message),
  );
} else {
  console.log(
    "[Cache] REDIS_URL tidak terdeteksi: otomatis menggunakan penyimpanan in-memory.",
  );
}

const memory = new Map<string, { value: string; expires: number }>();
// Preserve grace in all environments; memory is local to this API process.
export const cache = {
  async get(key: string) {
    if (redis) {
      try {
        return await redis.get(key);
      } catch {
        // Grace: use memory while Redis is unavailable.
      }
    }
    const item = memory.get(key);
    if (item && item.expires > Date.now()) return item.value;
    memory.delete(key);
    return null;
  },
  async set(key: string, value: string, seconds: number) {
    if (redis) {
      try {
        await redis.set(key, value, "EX", seconds);
        return;
      } catch {
        // Grace: use memory while Redis is unavailable.
      }
    }
    if (memory.size > 10000)
      for (const [k, v] of memory) if (v.expires < Date.now()) memory.delete(k);
    memory.set(key, { value, expires: Date.now() + seconds * 1000 });
  },
  async del(key: string) {
    if (redis) {
      try {
        await redis.del(key);
        return;
      } catch {
        // Grace: use memory while Redis is unavailable.
      }
    }
    memory.delete(key);
  },
  async take(key: string) {
    if (redis) {
      try {
        return await redis.getdel(key);
      } catch {
        // Grace: use memory while Redis is unavailable.
      }
    }
    const value = await this.get(key);
    memory.delete(key);
    return value;
  },
  async rate(key: string, limit: number, seconds: number) {
    if (redis) {
      try {
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
      } catch {
        // Grace: use memory while Redis is unavailable.
      }
    }
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
/**
 * Outbound call policy required by Technical Design v4.0 section 2.4: a 3 s
 * timeout, up to three attempts with exponential backoff for transient
 * failures, and a circuit breaker so an upstream outage is not amplified.
 *
 * Retries are gated on `idempotent` because replaying a request is only safe
 * when the upstream treats it as repeatable. An authorization-code exchange is
 * not: the code is single-use, and a timed-out attempt may still have consumed
 * it, so those calls get one attempt and surface the failure.
 */
const breakers = new Map<string, { failures: number; openUntil: number }>();

export async function serviceFetch(
  service: string,
  url: string,
  init: RequestInit = {},
  { idempotent = false, timeoutMs = 3000, attempts = 3 } = {},
): Promise<Response> {
  const unavailable = `${service.toUpperCase()}_UNAVAILABLE`;
  const breaker = breakers.get(service) ?? { failures: 0, openUntil: 0 };
  breakers.set(service, breaker);
  ensure(Date.now() > breaker.openUntil, 503, unavailable);
  const limit = idempotent ? attempts : 1;
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      // A 5xx is never the upstream's considered answer, so it is reported as
      // an outage whether or not the call may be replayed.
      if (response.status >= 500) throw new Error("upstream");
      breaker.failures = 0;
      return response;
    } catch {
      if (attempt >= limit - 1) {
        breaker.failures++;
        if (breaker.failures >= 3) breaker.openUntil = Date.now() + 30000;
        throw new HttpError(503, unavailable);
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    }
  }
}

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
      result: "SUCCESS",
      // Request provenance is queryable in its own columns, mirroring the SSO
      // `audit_events` table; metadata stays for anything case-specific.
      reason: reason ?? null,
      ipAddress: context.ip || null,
      userAgent: context.userAgent || null,
      requestId: context.requestId,
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
  canManageDepartmentScope(user.role, user.departmentScopes, department);
export async function classAccess(
  tx: Prisma.TransactionClient,
  user: User,
  classId: string,
  write = false,
  studentWrite = false,
  administrativeWrite = false,
) {
  const item = await tx.courseClass.findFirst({
    where: { OR: [{ id: classId }, { slug: classId }] },
    include: {
      course: true,
      // The class header renders instructor identities, so the relation is
      // resolved here instead of leaving callers with bare join rows.
      instructors: {
        include: { user: { select: { id: true, name: true } } },
      },
      enrollments: { where: { userId: user.id } },
    },
  });
  ensure(item, 404, "NOT_FOUND");
  const manage =
    canManageDepartment(user, item.course.departmentCode) ||
    (user.role === "INSTRUCTOR" &&
      item.instructors.some((i) => i.userId === user.id));
  const activeEnrollment = item.enrollments.find((e) => e.isActive);
  const inactiveEnrollment = item.enrollments.find((e) => !e.isActive);
  const enrolled = Boolean(activeEnrollment);
  const isInactiveParticipant =
    !manage && !enrolled && Boolean(inactiveEnrollment);

  if (isInactiveParticipant) {
    ensure(!write, 403, "PARTICIPATION_DISABLED");
    return { ...item, canManage: false, isInactiveParticipant: true };
  }
  ensure(
    manage ||
      (enrolled && item.status !== "DRAFT" && item.course.status !== "DRAFT"),
    403,
    "CLASS_ACCESS_DENIED",
  );
  if (write) {
    const isDeptAdmin =
      user.role === "DEPARTMENT_ADMIN" &&
      user.departmentScopes.includes(item.course.departmentCode);
    ensure(
      user.role === "INSTRUCTOR" ||
        isDeptAdmin ||
        (administrativeWrite &&
          hasPermission(user.role, "MANAGE_ALL_CLASSES")) ||
        (studentWrite && user.role === "STUDENT"),
      403,
      "CLASS_READ_ONLY",
    );
    ensure(manage || (studentWrite && enrolled), 403, "WRITE_ACCESS_DENIED");
    ensure(
      item.status !== "ARCHIVED" && item.course.status !== "ARCHIVED",
      423,
      "CLASS_ARCHIVED",
    );
  }
  return { ...item, canManage: manage, isInactiveParticipant: false };
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
  ensure(!cls.isInactiveParticipant, 403, "PARTICIPATION_DISABLED");
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
  linkUrl?: string,
  message?: string,
) {
  const members = userId
    ? [{ userId }]
    : await tx.enrollment.findMany({
        where: { classId, isActive: true },
        select: { userId: true },
      });
  const cls = await tx.courseClass.findUniqueOrThrow({
    where: { id: classId },
    include: { course: true },
  });
  await tx.notification.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      type,
      title,
      message: message ?? title,
      eventKey,
      linkUrl: linkUrl ?? classPath(cls),
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
