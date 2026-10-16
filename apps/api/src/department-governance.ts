import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import {
  db,
  ensure,
  audit,
  mutate,
  config,
  transaction,
  hash,
  json,
  serviceFetch,
  isDemo,
} from "./core.js";
import { authenticate } from "./auth.js";
import {
  UAY_DEPARTMENTS,
  normalizeDepartmentCode,
  siakadScopeSyncPayloadSchema,
} from "../../../packages/shared/src/departments.js";
import { normalizeRole, extractSsoUserData } from "../../../packages/shared/src/sso.js";
import { SIAKAD_SCOPE_SYNC_READY } from "../../../packages/shared/src/feature-readiness.js";

const authorityRoles = [
  "SUPER_ADMIN",
  "DEPARTMENT_ADMIN",
  "INSTRUCTOR",
] as const;
const machineRequests = new WeakSet<Request>();
const codeSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .transform(normalizeDepartmentCode)
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{0,19}$/));
async function validateAuthority(
  tx: any,
  scopes: string[],
  role: string,
  before?: any,
) {
  ensure(
    authorityRoles.includes(role as any),
    403,
    "AUTHORITY_ROLE_UNSUPPORTED",
  );
  if (before) {
    ensure(
      authorityRoles.includes(before.role),
      403,
      "AUTHORITY_ROLE_UNSUPPORTED",
    );
    ensure(before.status === "ACTIVE", 403, "ACCOUNT_DISABLED");
    if (before.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      ensure(
        (await tx.user.count({
          where: {
            role: "SUPER_ADMIN",
            status: "ACTIVE",
            id: { not: before.id },
          },
        })) > 0,
        409,
        "LAST_SUPER_ADMIN",
      );
    }
  }
  ensure(
    role !== "DEPARTMENT_ADMIN" || scopes.length > 0,
    400,
    "DEPARTMENT_SCOPE_REQUIRED",
  );
  const departments = await tx.department.findMany({
    where: { code: { in: scopes } },
  });
  for (const code of scopes) {
    const department = departments.find((d: any) => d.code === code);
    ensure(
      department &&
        (department.isActive || before?.departmentScopes.includes(code)),
      400,
      "DEPARTMENT_SCOPE_INVALID",
    );
  }
}
async function referenceCount(tx: any, code: string) {
  const [courses, users, announcements] = await Promise.all([
    tx.course.count({ where: { departmentCode: code } }),
    tx.user.count({ where: { departmentScopes: { has: code } } }),
    tx.systemAnnouncement.count({ where: { departmentCode: code } }),
  ]);
  return courses + users + announcements;
}
function assertVersion(before: any, expected?: string) {
  if (expected)
    ensure(
      before.updatedAt.toISOString() === expected,
      409,
      "GOVERNANCE_CONFLICT",
    );
}
function authorityVersion(user: any) {
  return hash(
    JSON.stringify({
      role: user.role,
      scopes: [...user.departmentScopes].sort(),
      source: user.authoritySource,
      status: user.status,
    }),
  );
}
function assertAuthorityVersion(user: any, expected?: string) {
  if (expected)
    ensure(authorityVersion(user) === expected, 409, "GOVERNANCE_CONFLICT");
}
async function mutateScopes<T>(
  req: Request,
  run: (tx: any) => Promise<T>,
): Promise<T> {
  if (!machineRequests.has(req)) return mutate(req, run);
  const key = req.get("Idempotency-Key");
  ensure(
    key && key.length >= 16 && key.length <= 100,
    400,
    "IDEMPOTENCY_REQUIRED",
  );
  const requestHash = hash(JSON.stringify(req.body));
  return transaction(async (tx) => {
    const identity = { integration: "SIAKAD", key };
    const previous = await tx.integrationMutation.findUnique({
      where: { integration_key: identity },
    });
    if (previous) {
      ensure(previous.requestHash === requestHash, 409, "IDEMPOTENCY_CONFLICT");
      return previous.result as T;
    }
    const result = await run(tx);
    await tx.integrationMutation.create({
      data: { ...identity, requestHash, result: json(result) },
    });
    return result;
  });
}

/**
 * Otomatis mengisi data awal program studi resmi jika tabel departments masih kosong.
 */
export async function ensureDefaultDepartments(client: any = db) {
  const count = await client.department.count();
  if (count === 0) {
    for (const d of UAY_DEPARTMENTS) {
      await client.department.upsert({
        where: { code: normalizeDepartmentCode(d.code) },
        create: {
          code: normalizeDepartmentCode(d.code),
          name: d.name,
          faculty: d.faculty,
          isActive: true,
        },
        update: {},
      });
    }
  }
}

async function authorizeMachineOrSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const secret = process.env.SIAKAD_SYNC_SECRET?.trim();
  const token =
    req.get("X-SIAKAD-Secret")?.trim() ||
    req.get("X-SIAKAD-Token")?.trim() ||
    req
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

  if (secret && token) {
    const isSecretValid =
      token.length === secret.length &&
      timingSafeEqual(
        createHash("sha256").update(token).digest(),
        createHash("sha256").update(secret).digest(),
      );
    if (isSecretValid) {
      machineRequests.add(req);
      req.context = {
        user: {
          id: "integration:siakad",
          ssoUserId: "00000000-0000-0000-0000-000000000001",
          username: "siakad-system",
          name: "Sistem Informasi Akademik (SIAKAD UAY)",
          email: "siakad-integration@uay.ac.id",
          userType: "ADMIN",
          identifierType: "OTHER",
          identifierValue: "SIAKAD_SYSTEM",
          role: "SUPER_ADMIN",
          departmentScopes: [],
          authoritySource: "SIAKAD",
          status: "ACTIVE",
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        requestId: randomBytes(16).toString("hex"),
        ip: req.ip ?? "127.0.0.1",
        userAgent: req.get("User-Agent")?.slice(0, 500) ?? "SIAKAD_WEBHOOK",
      };
      next();
      return;
    }
  }

  // Fallback to active Super Admin session
  return authenticate(req, res, (error) => {
    if (error) return next(error);
    try {
      ensure(req.context?.user?.role === "SUPER_ADMIN", 403, "FORBIDDEN");
      ensure(
        !!req.get("Origin") &&
          config.allowedOrigins.includes(req.get("Origin")!),
        403,
        "INVALID_ORIGIN",
      );
      next();
    } catch (error) {
      next(error);
    }
  });
}

export function registerDepartmentGovernance(app: Express) {
  // =========================================================================
  // CRUD MASTER PROGRAM STUDI (DEPARTMENTS)
  // =========================================================================

  /**
   * READ: Daftar seluruh program studi (dengan opsi filter & pencarian).
   */
  app.get("/api/v1/system/departments", authenticate, async (req, res) => {
    await ensureDefaultDepartments();

    const includeInactive = req.query.includeInactive === "true";
    const search = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const list = await (db as any).department.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
                { faculty: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ code: "asc" }],
    });
    res.json(list);
  });

  /**
   * CREATE: Tambah program studi baru oleh Super Admin.
   */
  app.post("/api/v1/system/departments", authenticate, async (req, res) => {
    ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

    const data = z
      .object({
        code: codeSchema,
        name: z
          .string()
          .trim()
          .min(3, "Nama prodi minimal 3 karakter")
          .max(150),
        faculty: z.string().trim().max(150).optional(),
        isActive: z.boolean().default(true),
      })
      .parse(req.body);

    const normalizedCode = normalizeDepartmentCode(data.code);

    res.json(
      await mutate(req, async (tx) => {
        await ensureDefaultDepartments(tx);

        const existing = await (tx as any).department.findUnique({
          where: { code: normalizedCode },
        });
        ensure(!existing, 409, "DUPLICATE_DEPARTMENT_CODE");

        const created = await (tx as any).department.create({
          data: {
            code: normalizedCode,
            name: data.name,
            faculty: data.faculty || null,
            isActive: data.isActive,
          },
        });

        await audit(
          tx,
          req.context,
          "CREATE_DEPARTMENT",
          "DEPARTMENT",
          created.id,
          null,
          null,
          created,
          `Penambahan program studi baru: ${created.code} (${created.name})`,
        );

        return created;
      }),
    );
  });

  /**
   * UPDATE: Perbarui data program studi (kode, nama, fakultas, status aktif).
   */
  app.put("/api/v1/system/departments/:id", authenticate, async (req, res) => {
    ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

    const data = z
      .object({
        code: codeSchema.optional(),
        name: z.string().trim().min(3).max(150).optional(),
        faculty: z.string().trim().max(150).nullable().optional(),
        isActive: z.boolean().optional(),
        expectedUpdatedAt: z.string().datetime().optional(),
      })
      .parse(req.body);

    res.json(
      await mutate(req, async (tx) => {
        await ensureDefaultDepartments(tx);

        const target = await (tx as any).department.findFirst({
          where: {
            OR: [
              { id: String(req.params.id) },
              { code: String(req.params.id).toUpperCase() },
            ],
          },
        });
        ensure(target, 404, "DEPARTMENT_NOT_FOUND");

        assertVersion(target, data.expectedUpdatedAt);

        const nextCode = data.code
          ? normalizeDepartmentCode(data.code)
          : target.code;

        if (nextCode !== target.code) {
          ensure(
            (await referenceCount(tx, target.code)) === 0,
            409,
            "DEPARTMENT_CODE_IN_USE",
          );
          const duplicate = await (tx as any).department.findUnique({
            where: { code: nextCode },
          });
          ensure(!duplicate, 409, "DUPLICATE_DEPARTMENT_CODE");
        }

        const updated = await (tx as any).department.update({
          where: { id: target.id },
          data: {
            code: nextCode,
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.faculty !== undefined ? { faculty: data.faculty } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          },
        });

        await audit(
          tx,
          req.context,
          "UPDATE_DEPARTMENT",
          "DEPARTMENT",
          target.id,
          null,
          target,
          updated,
          `Pembaruan program studi: ${updated.code} (${updated.name})`,
        );

        return updated;
      }),
    );
  });

  /**
   * DELETE / DEACTIVATE: Hapus permanen jika belum ada referensi, atau nonaktifkan secara aman.
   */
  app.delete(
    "/api/v1/system/departments/:id",
    authenticate,
    async (req, res) => {
      ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

      res.json(
        await mutate(req, async (tx) => {
          await ensureDefaultDepartments(tx);

          const target = await (tx as any).department.findFirst({
            where: {
              OR: [
                { id: String(req.params.id) },
                { code: String(req.params.id).toUpperCase() },
              ],
            },
          });
          ensure(target, 404, "DEPARTMENT_NOT_FOUND");

          // Cek apakah kode prodi masih dipakai oleh mata kuliah atau pengguna
          const courseCount = await tx.course.count({
            where: { departmentCode: target.code },
          });
          const userCount = await tx.user.count({
            where: { departmentScopes: { has: target.code } },
          });

          if (await referenceCount(tx, target.code)) {
            // Soft delete / nonaktifkan agar integritas riwayat akademik tidak rusak
            const deactivated = await (tx as any).department.update({
              where: { id: target.id },
              data: { isActive: false },
            });

            await audit(
              tx,
              req.context,
              "DEACTIVATE_DEPARTMENT",
              "DEPARTMENT",
              target.id,
              null,
              target,
              deactivated,
              `Penonaktifan program studi ${target.code} (${courseCount} mata kuliah, ${userCount} admin terkait)`,
            );

            return {
              ok: true,
              action: "DEACTIVATED",
              message: `Program studi ${target.code} dinonaktifkan karena masih dirujuk kelas, pengguna, atau pengumuman. Riwayat terkait tetap dipertahankan.`,
              department: deactivated,
            };
          }

          // Hard delete jika belum pernah ada mata kuliah / otoritas pengguna yang terhubung
          await (tx as any).department.delete({
            where: { id: target.id },
          });

          await audit(
            tx,
            req.context,
            "DELETE_DEPARTMENT",
            "DEPARTMENT",
            target.id,
            null,
            target,
            null,
            `Penghapusan permanen program studi: ${target.code}`,
          );

          return {
            ok: true,
            action: "DELETED",
            message: `Program studi ${target.code} berhasil dihapus permanen.`,
          };
        }),
      );
    },
  );

  // =========================================================================
  // PENETAPAN OTORITAS PENGGUNA (DEPARTMENT SCOPES)
  // =========================================================================

  /**
   * Super Admin melihat daftar dosen / pengelola program studi beserta departmentScopes.
   */
  app.get(
    "/api/v1/system/department-scopes/users",
    authenticate,
    async (req, res) => {
      ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const roleFilter =
        typeof req.query.role === "string" ? req.query.role.trim() : "";
      const departmentFilter =
        typeof req.query.department === "string"
          ? normalizeDepartmentCode(req.query.department)
          : "";
      const manageableRoles = [
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "INSTRUCTOR",
        "ASSISTANT",
        "STUDENT",
        "RECTOR",
      ] as const;
      if (roleFilter && roleFilter !== "ALL") {
        z.enum(manageableRoles).parse(roleFilter);
      }

      const users = await db.user.findMany({
        where: {
          status: "ACTIVE",
          role: roleFilter
            ? roleFilter === "ALL"
              ? { in: [...manageableRoles] }
              : (roleFilter as any)
            : q
              ? { in: [...manageableRoles] }
              : { in: [...authorityRoles] },
          ...(departmentFilter
            ? { departmentScopes: { has: departmentFilter } }
            : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { identifierValue: { contains: q, mode: "insensitive" } },
                  { username: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          identifierValue: true,
          identifierType: true,
          role: true,
          userType: true,
          departmentScopes: true,
          status: true,
          lastLoginAt: true,
          ssoUserId: true,
          authoritySource: true,
          updatedAt: true,
        },
      });

      res.json(
        users.map((user) => ({
          ...user,
          authorityVersion: authorityVersion(user),
        })),
      );
    },
  );

  /**
   * Super Admin menetapkan atau mengubah departmentScopes seorang pengguna.
   */
  app.put(
    "/api/v1/system/department-scopes/users/:id",
    authenticate,
    async (req, res) => {
      ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

      const data = z
        .object({
          departmentScopes: z.array(z.string().trim().min(1)).max(20),
          role: z.enum(authorityRoles).optional(),
          expectedUpdatedAt: z.string().datetime().optional(),
          expectedAuthorityVersion: z.string().length(64).optional(),
        })
        .parse(req.body);

      res.json(
        await mutate(req, async (tx) => {
          const target = await tx.user.findUnique({
            where: { id: String(req.params.id) },
          });
          ensure(target, 404, "USER_NOT_FOUND");

          assertVersion(target, data.expectedUpdatedAt);
          assertAuthorityVersion(target, data.expectedAuthorityVersion);

          const normalizedScopes = [
            ...new Set(
              data.departmentScopes
                .map(normalizeDepartmentCode)
                .filter(Boolean),
            ),
          ];

          let finalRole = data.role ?? target.role;
          // Promosi otomatis jika diberikan lingkup prodi tetapi perannya masih INSTRUCTOR
          if (
            !data.role &&
            normalizedScopes.length > 0 &&
            target.role === "INSTRUCTOR"
          ) {
            finalRole = "DEPARTMENT_ADMIN";
          }
          // Kembalikan ke INSTRUCTOR jika lingkup prodi dikosongkan dan perannya DEPARTMENT_ADMIN
          if (
            !data.role &&
            normalizedScopes.length === 0 &&
            target.role === "DEPARTMENT_ADMIN"
          ) {
            finalRole = "INSTRUCTOR";
          }

          await validateAuthority(tx, normalizedScopes, finalRole, target);

          const after = await tx.user.update({
            where: { id: target.id },
            data: {
              departmentScopes: normalizedScopes,
              role: finalRole,
              authoritySource: "LOCAL",
            },
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              identifierValue: true,
              role: true,
              userType: true,
              departmentScopes: true,
              status: true,
            },
          });

          await audit(
            tx,
            req.context,
            "UPDATE_DEPARTMENT_SCOPES",
            "USER",
            target.id,
            null,
            { departmentScopes: target.departmentScopes, role: target.role },
            { departmentScopes: after.departmentScopes, role: after.role },
            "Pembaruan cakupan prodi & hak akses oleh Super Admin",
          );

          return after;
        }),
      );
    },
  );

  /**
   * CREATE / PRE-PROVISION: Daftarkan pengguna/dosen baru secara manual oleh Super Admin.
   * Mengizinkan penetapan Kaprodi/Dekan sebelum dosen pernah login via SSO kampus.
   */
  app.post(
    "/api/v1/system/department-scopes/users",
    authenticate,
    async (req, res) => {
      ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

      const data = z
        .object({
          identifierValue: z
            .string()
            .trim()
            .min(3, "NIDN/NIP minimal 3 karakter")
            .max(50),
          identifierType: z
            .enum(["NIDN", "NIP", "NIM", "OTHER"])
            .default("NIDN"),
          name: z.string().trim().min(2, "Nama minimal 2 karakter").max(150),
          email: z.string().trim().email("Format email tidak valid").max(150),
          username: z.string().trim().min(2).max(100).optional(),
          role: z
            .enum(["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT"])
            .default("DEPARTMENT_ADMIN"),
          userType: z
            .enum(["LECTURER", "STAFF", "ADMIN", "STUDENT"])
            .default("LECTURER"),
          departmentScopes: z
            .array(z.string().trim().min(1))
            .max(20)
            .default([]),
        })
        .parse(req.body);

      const normalizedScopes = [
        ...new Set(
          data.departmentScopes.map(normalizeDepartmentCode).filter(Boolean),
        ),
      ];

      res.json(
        await mutate(req, async (tx) => {
          // Cek apakah pengguna dengan identitas ini sudah ada di database
          const matches = await tx.user.findMany({
            where: {
              OR: [
                { identifierValue: data.identifierValue },
                { email: { equals: data.email, mode: "insensitive" as const } },
                ...(data.username
                  ? [
                      {
                        username: {
                          equals: data.username,
                          mode: "insensitive" as const,
                        },
                      },
                    ]
                  : []),
              ],
            },
          });

          ensure(matches.length <= 1, 409, "PREPROVISION_IDENTITY_CONFLICT");
          const existing = matches[0];
          if (existing) {
            ensure(
              existing.identifierValue === data.identifierValue &&
                existing.email.toLowerCase() === data.email.toLowerCase(),
              409,
              "PREPROVISION_IDENTITY_CONFLICT",
            );
            if (data.role !== "STUDENT") {
              await validateAuthority(tx, normalizedScopes, data.role, existing);
            }
            // Jika sudah ada, perbarui data peran & lingkup prodinya
            const updated = await tx.user.update({
              where: { id: existing.id },
              data: {
                name: data.name || existing.name,
                role: data.role,
                departmentScopes: normalizedScopes,
                authoritySource: "LOCAL",
              },
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                identifierValue: true,
                identifierType: true,
                role: true,
                userType: true,
                departmentScopes: true,
                status: true,
                lastLoginAt: true,
              },
            });

            await audit(
              tx,
              req.context,
              "UPDATE_PREPROVISIONED_USER",
              "USER",
              updated.id,
              null,
              existing,
              updated,
              `Memperbarui profil & otoritas pengguna pra-registrasi: ${updated.identifierValue}`,
            );

            return {
              ok: true,
              action: "UPDATED",
              message: `Pengguna ${updated.name} (${updated.identifierValue}) sudah terdaftar dan otoritasnya berhasil diperbarui.`,
              user: updated,
            };
          }

          // Buat record pengguna pra-registrasi baru
          const fallbackUsername =
            data.username ||
            data.email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "");

          if (data.role !== "STUDENT") {
            await validateAuthority(tx, normalizedScopes, data.role);
          }
          ensure(
            !(await tx.user.findUnique({
              where: { username: fallbackUsername },
            })),
            409,
            "PREPROVISION_IDENTITY_CONFLICT",
          );

          const newUser = await tx.user.create({
            data: {
              ssoUserId: `preprovision:${randomUUID()}`,
              identifierValue: data.identifierValue,
              identifierType: data.identifierType,
              name: data.name,
              email: data.email.toLowerCase(),
              username: fallbackUsername,
              role: data.role,
              userType: data.userType,
              departmentScopes: normalizedScopes,
              authoritySource: "LOCAL",
              status: "ACTIVE",
            },
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              identifierValue: true,
              identifierType: true,
              role: true,
              userType: true,
              departmentScopes: true,
              status: true,
              lastLoginAt: true,
            },
          });

          await audit(
            tx,
            req.context,
            "CREATE_PREPROVISIONED_USER",
            "USER",
            newUser.id,
            null,
            null,
            newUser,
            `Mendaftarkan pengguna baru pra-registrasi: ${newUser.name} (${newUser.identifierValue}) dengan lingkup prodi ${normalizedScopes.join(",")}`,
          );

          return {
            ok: true,
            action: "CREATED",
            message: `Dosen/Staf ${newUser.name} (${newUser.identifierValue}) berhasil didaftarkan. Akun akan tersambung otomatis saat login SSO.`,
            user: newUser,
          };
        }),
      );
    },
  );

  /**
   * BATCH IMPORT: Import daftar pengguna secara massal menggunakan templat CSV yang sama dengan SSO.
   * Format: name, email, user_type, identifier_type, identifier_value, status, [role], [department_scopes]
   */
  app.post(
    "/api/v1/system/department-scopes/users/import",
    authenticate,
    async (req, res) => {
      ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

      const payload = z
        .object({
          rows: z
            .array(
              z.object({
                name: z.string().trim().min(1, "Nama wajib diisi"),
                email: z.string().trim().email("Format email tidak valid"),
                user_type: z.string().trim().optional(),
                identifier_type: z.string().trim().optional(),
                identifier_value: z
                  .string()
                  .trim()
                  .min(1, "Nomor identitas wajib diisi"),
                status: z.string().trim().optional(),
                role: z.string().trim().optional(),
                department_scopes: z
                  .union([z.string(), z.array(z.string())])
                  .optional(),
              }),
            )
            .min(1, "Minimal 1 baris data diperlukan"),
        })
        .parse(req.body);

      res.json(
        await mutate(req, async (tx) => {
          const results: Array<{
            rowNumber: number;
            name: string;
            email: string;
            identifierType: string;
            identifierValue: string;
            role: string;
            status: "CREATED" | "UPDATED" | "FAILED";
            message: string;
          }> = [];

          let createdCount = 0;
          let updatedCount = 0;
          let failedCount = 0;

          for (const [index, row] of payload.rows.entries()) {
            const rowNumber = index + 1;
            try {
              const rawIdType = (row.identifier_type || "").toUpperCase();
              const rawUserType = (row.user_type || "").toUpperCase();

              // Deteksi identifierType
              let identifierType: "NIM" | "NIDN" | "NIP" | "OTHER" = "NIDN";
              if (["NIM", "NIDN", "NIP", "OTHER"].includes(rawIdType)) {
                identifierType = rawIdType as any;
              } else if (rawUserType === "STUDENT" || rawUserType === "MAHASISWA") {
                identifierType = "NIM";
              } else if (rawUserType === "LECTURER" || rawUserType === "DOSEN") {
                identifierType = "NIDN";
              } else if (rawUserType === "STAFF") {
                identifierType = "NIP";
              }

              // Deteksi userType
              let userType: "STUDENT" | "LECTURER" | "STAFF" | "ADMIN" = "LECTURER";
              if (["STUDENT", "MAHASISWA"].includes(rawUserType) || identifierType === "NIM") {
                userType = "STUDENT";
              } else if (["LECTURER", "DOSEN"].includes(rawUserType) || identifierType === "NIDN") {
                userType = "LECTURER";
              } else if (["STAFF", "KARYAWAN", "TENDIK"].includes(rawUserType)) {
                userType = "STAFF";
              } else if (["ADMIN", "SUPER_ADMIN"].includes(rawUserType)) {
                userType = "ADMIN";
              }

              // Deteksi role
              let targetRole: "SUPER_ADMIN" | "DEPARTMENT_ADMIN" | "INSTRUCTOR" | "STUDENT" = "INSTRUCTOR";
              const rawRole = (row.role || "").toUpperCase();
              if (["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT"].includes(rawRole)) {
                targetRole = rawRole as any;
              } else if (userType === "STUDENT") {
                targetRole = "STUDENT";
              } else if (userType === "ADMIN") {
                targetRole = "SUPER_ADMIN";
              } else if (userType === "STAFF") {
                targetRole = "DEPARTMENT_ADMIN";
              } else {
                targetRole = "INSTRUCTOR";
              }

              // Normalisasi departmentScopes
              let scopes: string[] = [];
              if (Array.isArray(row.department_scopes)) {
                scopes = row.department_scopes;
              } else if (typeof row.department_scopes === "string") {
                scopes = row.department_scopes.split(/[,;\s]+/);
              }
              const normalizedScopes = [
                ...new Set(scopes.map(normalizeDepartmentCode).filter(Boolean)),
              ];

              const email = row.email.toLowerCase();
              const identifierValue = row.identifier_value;
              const fallbackUsername =
                email.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "") ||
                identifierValue;

              // Cari pengguna yang sudah ada
              const existing = await tx.user.findFirst({
                where: {
                  OR: [
                    { identifierValue },
                    { email: { equals: email, mode: "insensitive" as const } },
                  ],
                },
              });

              if (existing) {
                const isPreprovision = existing.ssoUserId.startsWith("preprovision:");
                await tx.user.update({
                  where: { id: existing.id },
                  data: {
                    name: row.name || existing.name,
                    userType,
                    identifierType,
                    identifierValue,
                    role: targetRole,
                    ...(normalizedScopes.length > 0 ? { departmentScopes: normalizedScopes } : {}),
                    ...(isPreprovision ? { authoritySource: "LOCAL" } : {}),
                  },
                });

                updatedCount++;
                results.push({
                  rowNumber,
                  name: row.name,
                  email,
                  identifierType,
                  identifierValue,
                  role: targetRole,
                  status: "UPDATED",
                  message: `Akun sudah terdaftar, profil dan peran diselaraskan (${targetRole}).`,
                });
              } else {
                const existingUsername = await tx.user.findUnique({
                  where: { username: fallbackUsername },
                });
                const resolvedUsername = existingUsername
                  ? `${fallbackUsername}-${randomBytes(2).toString("hex")}`
                  : fallbackUsername;

                await tx.user.create({
                  data: {
                    ssoUserId: `preprovision:${randomUUID()}`,
                    identifierValue,
                    identifierType,
                    name: row.name,
                    email,
                    username: resolvedUsername,
                    role: targetRole,
                    userType,
                    departmentScopes: normalizedScopes,
                    authoritySource: "LOCAL",
                    status: (row.status || "ACTIVE").toUpperCase() === "DISABLED" ? "DISABLED" : "ACTIVE",
                  },
                });

                createdCount++;
                results.push({
                  rowNumber,
                  name: row.name,
                  email,
                  identifierType,
                  identifierValue,
                  role: targetRole,
                  status: "CREATED",
                  message: `Berhasil didaftarkan sebagai ${targetRole} (pra-registrasi).`,
                });
              }
            } catch (err: any) {
              failedCount++;
              results.push({
                rowNumber,
                name: row.name,
                email: row.email,
                identifierType: row.identifier_type || "NIDN",
                identifierValue: row.identifier_value,
                role: row.role || "INSTRUCTOR",
                status: "FAILED",
                message: err?.message || "Gagal memproses baris akun ini.",
              });
            }
          }

          await audit(
            tx,
            req.context,
            "IMPORT_PREPROVISIONED_USERS",
            "USER",
            req.context.user.id,
            null,
            null,
            { createdCount, updatedCount, failedCount, total: payload.rows.length },
            `Import batch ${payload.rows.length} pengguna: ${createdCount} dibuat, ${updatedCount} diperbarui, ${failedCount} gagal`,
          );

          return {
            ok: true,
            summary: {
              total: payload.rows.length,
              created: createdCount,
              updated: updatedCount,
              failed: failedCount,
            },
            results,
          };
        }),
      );
    },
  );

  /**
   * DELETE: Hapus pengguna pra-registrasi jika belum pernah login atau berkegiatan akademik.
   */
  app.delete(
    "/api/v1/system/department-scopes/users/:id",
    authenticate,
    async (req, res) => {
      ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

      res.json(
        await mutate(req, async (tx) => {
          const target = await tx.user.findUnique({
            where: { id: String(req.params.id) },
          });
          ensure(target, 404, "USER_NOT_FOUND");

          ensure(
            authorityRoles.includes(target.role as any) &&
              target.role !== "SUPER_ADMIN",
            403,
            "AUTHORITY_ROLE_UNSUPPORTED",
          );
          ensure(
            target.ssoUserId.startsWith("preprovision:") && !target.lastLoginAt,
            409,
            "PREPROVISION_ALREADY_LINKED",
          );

          // Cek apakah pengguna sudah memiliki riwayat aktivitas perkuliahan
          const instructorCount = await tx.classInstructor.count({
            where: { userId: target.id },
          });
          const enrollmentCount = await tx.enrollment.count({
            where: { userId: target.id },
          });

          if (instructorCount > 0 || enrollmentCount > 0) {
            // Hanya cabut otoritas jika sudah punya riwayat aktivitas
            const updated = await tx.user.update({
              where: { id: target.id },
              data: {
                departmentScopes: [],
                role: "INSTRUCTOR",
                authoritySource: "LOCAL",
              },
            });
            await audit(
              tx,
              req.context,
              "UPDATE_DEPARTMENT_SCOPES",
              "USER",
              target.id,
              null,
              target,
              updated,
              "Pencabutan otoritas tanpa menghapus riwayat perkuliahan",
            );
            return {
              ok: true,
              action: "SCOPES_CLEARED",
              message: `Otoritas prodi untuk ${target.name} telah dicabut karena akun sudah memiliki riwayat perkuliahan.`,
              user: updated,
            };
          }

          // Hapus permanen jika akun pra-registrasi belum pernah login atau berkegiatan
          await tx.user.delete({ where: { id: target.id } });

          await audit(
            tx,
            req.context,
            "DELETE_PREPROVISIONED_USER",
            "USER",
            target.id,
            null,
            target,
            null,
            `Menghapus akun pra-registrasi: ${target.name} (${target.identifierValue})`,
          );

          return {
            ok: true,
            action: "DELETED",
            message: `Akun pra-registrasi ${target.name} berhasil dihapus.`,
          };
        }),
      );
    },
  );

  // =========================================================================
  // BRIDGE INTEGRASI SIAKAD
  // =========================================================================

  /**
   * Bridge integrasi SIAKAD: sinkronisasi batch penugasan prodi & Kaprodi.
   * Dapat dipanggil langsung oleh Super Admin di UI atau via Webhook SIAKAD (Machine-to-Machine).
   */
  app.post(
    "/api/v1/system/siakad/sync-scopes",
    authorizeMachineOrSuperAdmin,
    async (req, res) => {
      ensure(SIAKAD_SCOPE_SYNC_READY, 503, "INTEGRATION_NOT_READY");
      const payload = siakadScopeSyncPayloadSchema.parse(req.body);

      if (payload.dryRun) {
        const previewResults = [];
        const seenUsers = new Set<string>();
        for (const assignment of payload.assignments) {
          const matches = await db.user.findMany({
            where: {
              OR: [
                { identifierValue: assignment.identifierValue },
                { username: assignment.identifierValue },
                { email: assignment.identifierValue },
              ],
            },
            select: {
              id: true,
              name: true,
              role: true,
              departmentScopes: true,
              status: true,
              updatedAt: true,
              authoritySource: true,
            },
          });
          ensure(matches.length <= 1, 409, "PREPROVISION_IDENTITY_CONFLICT");
          const user = matches[0];
          if (user) {
            ensure(!seenUsers.has(user.id), 400, "SIAKAD_DUPLICATE_USER");
            seenUsers.add(user.id);
            assertVersion(user, assignment.expectedUpdatedAt);
            assertAuthorityVersion(user, assignment.expectedAuthorityVersion);
          }

          const normalizedScopes = [
            ...new Set(
              assignment.departmentScopes
                .map(normalizeDepartmentCode)
                .filter(Boolean),
            ),
          ];
          await validateAuthority(db, normalizedScopes, assignment.role, user);

          previewResults.push({
            identifierValue: assignment.identifierValue,
            userId: user?.id ?? null,
            name: user?.name ?? null,
            currentRole: user?.role ?? null,
            proposedRole: assignment.role,
            currentScopes: user?.departmentScopes ?? [],
            proposedScopes: normalizedScopes,
            status: user ? "READY" : "USER_NOT_FOUND",
            updatedAt: user?.updatedAt.toISOString() ?? null,
            authorityVersion: user ? authorityVersion(user) : null,
          });
        }

        res.json({
          ok: true,
          dryRun: true,
          source: payload.source,
          academicYear: payload.academicYear ?? null,
          total: payload.assignments.length,
          ready: previewResults.filter((r) => r.status === "READY").length,
          notFound: previewResults.filter((r) => r.status === "USER_NOT_FOUND")
            .length,
          results: previewResults,
        });
        return;
      }

      // Mode Eksekusi Nyata
      const executionResults = await mutateScopes(req, async (tx) => {
        const results = [];
        const seenUsers = new Set<string>();
        for (const assignment of payload.assignments) {
          const matches = await tx.user.findMany({
            where: {
              OR: [
                { identifierValue: assignment.identifierValue },
                { username: assignment.identifierValue },
                { email: assignment.identifierValue },
              ],
            },
          });
          ensure(matches.length <= 1, 409, "PREPROVISION_IDENTITY_CONFLICT");
          const user = matches[0];
          if (user) {
            ensure(!seenUsers.has(user.id), 400, "SIAKAD_DUPLICATE_USER");
            seenUsers.add(user.id);
            assertVersion(user, assignment.expectedUpdatedAt);
            assertAuthorityVersion(user, assignment.expectedAuthorityVersion);
          }

          const normalizedScopes = [
            ...new Set(
              assignment.departmentScopes
                .map(normalizeDepartmentCode)
                .filter(Boolean),
            ),
          ];
          await validateAuthority(tx, normalizedScopes, assignment.role, user);

          if (!user) {
            results.push({
              identifierValue: assignment.identifierValue,
              status: "USER_NOT_FOUND",
              departmentScopes: normalizedScopes,
              role: assignment.role,
            });
            continue;
          }

          const before = {
            role: user.role,
            departmentScopes: user.departmentScopes,
          };

          const after = await tx.user.update({
            where: { id: user.id },
            data: {
              departmentScopes: normalizedScopes,
              role: assignment.role,
              authoritySource: "SIAKAD",
            },
          });

          const reason =
            assignment.notes ??
            `Sinkronisasi otoritas prodi dari ${payload.source}`;
          if (machineRequests.has(req)) {
            await tx.auditLog.create({
              data: {
                actorId: null,
                actorRole: "SIAKAD",
                action: "SYNC_SIAKAD_SCOPES",
                entity: "USER",
                entityId: user.id,
                requestId: req.context.requestId,
                ipAddress: req.context.ip,
                userAgent: req.context.userAgent,
                reason,
                beforeState: before,
                afterState: {
                  role: after.role,
                  departmentScopes: after.departmentScopes,
                },
                metadata: {
                  source: payload.source,
                  integration: "SIAKAD",
                  requestId: req.context.requestId,
                },
              },
            });
          } else
            await audit(
              tx,
              req.context,
              "SYNC_SIAKAD_SCOPES",
              "USER",
              user.id,
              null,
              before,
              { role: after.role, departmentScopes: after.departmentScopes },
              reason,
            );

          results.push({
            identifierValue: assignment.identifierValue,
            name: user.name,
            status: "UPDATED",
            departmentScopes: normalizedScopes,
            role: assignment.role,
          });
        }
        return results;
      });

      res.json({
        ok: true,
        dryRun: false,
        source: payload.source,
        academicYear: payload.academicYear ?? null,
        total: payload.assignments.length,
        updated: executionResults.filter((r) => r.status === "UPDATED").length,
        notFound: executionResults.filter((r) => r.status === "USER_NOT_FOUND")
          .length,
        results: executionResults,
      });
    },
  );

  // =========================================================================
  // INTEGRASI PENARIKAN PENGGUNA SSO (UAY SSO APPLICATION USERS)
  // =========================================================================

  const ssoSyncPayloadSchema = z.object({
    dryRun: z.boolean().default(false),
    userType: z
      .enum(["ALL", "LECTURER", "STAFF", "STUDENT", "ADMIN"])
      .default("ALL"),
    search: z.string().trim().max(100).optional(),
  });

  async function fetchUsersFromSso(options: {
    accessToken?: string;
    clientId: string;
    search?: string;
  }): Promise<any[]> {
    let baseUrl = (config.ssoApiBaseUrl || "").trim().replace(/\/+$/, "");
    if (!baseUrl && config.issuer) {
      try {
        const issuerUrl = new URL(config.issuer);
        baseUrl = `${issuerUrl.origin}/api`;
      } catch {}
    }

    if (!baseUrl) {
      if (isDemo) {
        return [
          {
            user_id: "sso-usr-demo-01",
            name: "Dr. Budi Santoso, M.Kom",
            email: "budi.santoso@uay.ac.id",
            user_type: "LECTURER",
            status: "ACTIVE",
            account: {
              keycloak_user_id: "kc-demo-01",
              username: "198501012010121001",
              status: "ACTIVE",
            },
            application_access: [
              {
                role: {
                  role_id: "role-demo-01",
                  name: "dosen",
                  status: "ACTIVE",
                },
              },
            ],
          },
          {
            user_id: "sso-usr-demo-02",
            name: "Siti Rahmawati, M.T",
            email: "siti.rahmawati@uay.ac.id",
            user_type: "LECTURER",
            status: "ACTIVE",
            account: {
              keycloak_user_id: "kc-demo-02",
              username: "199002022015042002",
              status: "ACTIVE",
            },
            application_access: [
              {
                role: {
                  role_id: "role-demo-02",
                  name: "kaprodi",
                  status: "ACTIVE",
                },
              },
            ],
          },
        ];
      }
      ensure(false, 503, "SSO_API_BASE_URL_NOT_CONFIGURED");
    }

    // Pastikan baseUrl mengarah ke API (/api atau /api/v1)
    const apiBase =
      baseUrl.endsWith("/api") || baseUrl.endsWith("/api/v1")
        ? baseUrl
        : `${baseUrl}/api`;

    const allUsers: any[] = [];
    let page = 1;
    const limit = 20;
    let totalPages = 1;
    let activeClientId = options.clientId;

    if (!options.accessToken && !isDemo) {
      ensure(false, 401, "SSO_AUTHENTICATION_REQUIRED");
    }

    const clientCandidates = [
      options.clientId,
      "uay-elearning",
      "elearning-uay",
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

    while (page <= totalPages && page <= 20) {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (options.search) query.set("search", options.search);

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (options.accessToken) {
        headers["Authorization"] = `Bearer ${options.accessToken}`;
      }

      let res: globalThis.Response | null = null;

      for (const candidate of clientCandidates) {
        const targetUrl = `${apiBase}/applications/client/${encodeURIComponent(candidate)}/users?${query}`;
        const attemptRes = await serviceFetch(
          "sso-api",
          targetUrl,
          { headers },
          { idempotent: true, attempts: 2, timeoutMs: 5000 },
        );

        if (attemptRes.ok || (attemptRes.status !== 404 && attemptRes.status !== 400)) {
          res = attemptRes;
          activeClientId = candidate;
          break;
        }

        // Jika 404, coba endpoint tanpa /api jika apiBase mengandung /api
        if (!apiBase.endsWith("/v1")) {
          const fallbackUrl = `${apiBase}/v1/applications/client/${encodeURIComponent(candidate)}/users?${query}`;
          const fallbackRes = await serviceFetch(
            "sso-api",
            fallbackUrl,
            { headers },
            { idempotent: true, attempts: 2, timeoutMs: 5000 },
          );
          if (fallbackRes.ok) {
            res = fallbackRes;
            activeClientId = candidate;
            break;
          }
        }
      }

      ensure(res, 502, "SSO_USERS_FETCH_FAILED");

      if (res.status === 401) {
        ensure(false, 401, "SSO_AUTHENTICATION_REQUIRED");
      }
      if (res.status === 403) {
        ensure(false, 403, "SSO_ACCESS_DENIED");
      }
      ensure(res.ok, 502, "SSO_USERS_FETCH_FAILED");

      const contentType = res.headers.get("content-type") || "";
      ensure(
        contentType.includes("application/json"),
        502,
        "SSO_USERS_FETCH_FAILED",
      );

      const body: any = await res.json();
      const data = Array.isArray(body?.data?.data)
        ? body.data.data
        : Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body)
            ? body
            : [];

      allUsers.push(...data);
      totalPages =
        body?.data?.meta?.total_pages ??
        body?.meta?.total_pages ??
        1;
      page++;
    }

    return allUsers;
  }

  function resolveSsoRole(
    ssoUser: any,
  ): "SUPER_ADMIN" | "DEPARTMENT_ADMIN" | "INSTRUCTOR" | "ASSISTANT" | "STUDENT" {
    // 1. Cek hak akses aplikasi spesifik dari SSO (application_access)
    if (
      Array.isArray(ssoUser.application_access) &&
      ssoUser.application_access.length > 0
    ) {
      for (const access of ssoUser.application_access) {
        const roleName = access?.role?.name || access?.role;
        const normalized = normalizeRole(String(roleName ?? ""));
        if (normalized && normalized !== "RECTOR") return normalized;
      }
    }
    if (Array.isArray(ssoUser.roles) && ssoUser.roles.length > 0) {
      for (const r of ssoUser.roles) {
        const normalized = normalizeRole(String(r));
        if (normalized && normalized !== "RECTOR") return normalized;
      }
    }
    if (typeof ssoUser.role === "string") {
      const normalized = normalizeRole(ssoUser.role);
      if (normalized && normalized !== "RECTOR") return normalized;
    }

    // 2. Berdasarkan tipe pengguna SSO (user_type) sebagai fallback jika tidak ada hak akses aplikasi
    const rawType = String(
      ssoUser.user_type || ssoUser.userType || "",
    ).toUpperCase();
    if (
      rawType === "LECTURER" ||
      rawType === "DOSEN" ||
      rawType === "PENGAJAR" ||
      rawType === "STAFF" ||
      rawType === "TENDIK" ||
      rawType === "KARYAWAN"
    ) {
      return "INSTRUCTOR";
    }
    return "STUDENT";
  }

  /**
   * Menarik daftar pengguna dari SSO untuk aplikasi E-Learning.
   * Super Admin dapat melihat pratinjau (dryRun) atau melakukan sinkronisasi profil/pendaftaran akun.
   */
  app.post(
    "/api/v1/system/sso/sync-users",
    authenticate,
    async (req, res) => {
      ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");
      const payload = ssoSyncPayloadSchema.parse(req.body ?? {});

      const rawUsers = await fetchUsersFromSso({
        accessToken: req.context.accessToken,
        clientId:
          process.env.SSO_APPLICATION_CLIENT_ID ||
          config.clientId ||
          "uay-elearning",
        search: payload.search,
      });

      const filteredUsers = rawUsers.filter((u) => {
        if (!u || typeof u !== "object") return false;
        if (payload.userType === "ALL") return true;
        return u.user_type === payload.userType;
      });

      const processedResults = [];

      if (payload.dryRun) {
        for (const ssoUser of filteredUsers) {
          const {
            username,
            email,
            identifierValue,
            identifierType,
            userType,
            ssoSub,
            ssoUserId,
            name,
          } = extractSsoUserData(ssoUser);

          const matches = await db.user.findMany({
            where: {
              OR: [
                { identifierValue: { equals: identifierValue, mode: "insensitive" } },
                { email: { equals: email, mode: "insensitive" } },
                ...(ssoSub ? [{ ssoUserId: ssoSub }] : []),
                ...(ssoUserId ? [{ ssoUserId }] : []),
                ...(username
                  ? [
                      {
                        username: {
                          equals: username,
                          mode: "insensitive" as const,
                        },
                      },
                    ]
                  : []),
              ],
            },
          });

          const existing = matches[0];
          const targetRole = resolveSsoRole(ssoUser);

          processedResults.push({
            ssoUserId: ssoUserId || ssoSub || ssoUser.user_id,
            name,
            email,
            username: username || identifierValue,
            identifierValue,
            identifierType,
            userType,
            status: existing ? "ALREADY_EXISTS" : "NEW",
            action: existing ? "SYNC_PROFILE" : "CREATE",
            currentRole: existing?.role ?? null,
            proposedRole: targetRole,
            roleMismatch: Boolean(existing && existing.role !== targetRole),
            departmentScopes: existing?.departmentScopes ?? [],
          });
        }

        res.json({
          ok: true,
          dryRun: true,
          total: filteredUsers.length,
          newCount: processedResults.filter((r) => r.status === "NEW").length,
          existingCount: processedResults.filter(
            (r) => r.status === "ALREADY_EXISTS",
          ).length,
          results: processedResults,
        });
        return;
      }

      // Mode Eksekusi Nyata
      const executionResults = await mutate(req, async (tx) => {
        const results = [];
        for (const ssoUser of filteredUsers) {
          try {
            const {
              username,
              email,
              identifierValue,
              identifierType,
              userType,
              ssoSub,
              ssoUserId,
              name,
            } = extractSsoUserData(ssoUser);

            const matches = await tx.user.findMany({
              where: {
                OR: [
                  { identifierValue: { equals: identifierValue, mode: "insensitive" } },
                  { email: { equals: email, mode: "insensitive" } },
                  ...(ssoSub ? [{ ssoUserId: ssoSub }] : []),
                  ...(ssoUserId ? [{ ssoUserId }] : []),
                  ...(username
                    ? [
                        {
                          username: {
                            equals: username,
                            mode: "insensitive" as const,
                          },
                        },
                      ]
                    : []),
                ],
              },
            });

            const existing = matches[0];
            const targetRole = resolveSsoRole(ssoUser);

            if (existing) {
              const updated = await tx.user.update({
                where: { id: existing.id },
                data: {
                  name: name || existing.name,
                  email,
                  username: username || existing.username,
                  userType,
                  identifierType,
                  identifierValue,
                  ...(ssoUserId && existing.ssoUserId.startsWith("preprovision:")
                    ? { ssoUserId }
                    : {}),
                  status: "ACTIVE",
                },
              });

              results.push({
                id: updated.id,
                ssoUserId: updated.ssoUserId,
                name: updated.name,
                email: updated.email,
                username: updated.username,
                identifierValue: updated.identifierValue,
                identifierType: updated.identifierType,
                userType: updated.userType,
                status: "ALREADY_EXISTS",
                action: "SYNC_PROFILE",
                role: updated.role,
                currentRole: updated.role,
                proposedRole: targetRole,
                roleMismatch: updated.role !== targetRole,
                departmentScopes: updated.departmentScopes,
              });
            } else {
              const targetSsoUserId = ssoUserId || ssoSub || `preprovision:${randomUUID()}`;
              const finalUsername = username || identifierValue;

              const existingUsername = await tx.user.findFirst({
                where: { username: { equals: finalUsername, mode: "insensitive" } },
              });
              const resolvedUsername = existingUsername
                ? `${finalUsername}-${randomBytes(2).toString("hex")}`
                : finalUsername;

              const collision = await tx.user.findFirst({
                where: {
                  OR: [
                    { ssoUserId: targetSsoUserId },
                    { identifierValue: { equals: identifierValue, mode: "insensitive" } },
                    { email: { equals: email, mode: "insensitive" } },
                  ],
                },
              });

              if (collision) {
                const updated = await tx.user.update({
                  where: { id: collision.id },
                  data: {
                    name,
                    email,
                    username: resolvedUsername,
                    userType,
                    identifierType,
                    identifierValue,
                    status: "ACTIVE",
                  },
                });
                results.push({
                  id: updated.id,
                  ssoUserId: updated.ssoUserId,
                  name: updated.name,
                  email: updated.email,
                  username: updated.username,
                  identifierValue: updated.identifierValue,
                  identifierType: updated.identifierType,
                  userType: updated.userType,
                  status: "ALREADY_EXISTS",
                  action: "SYNC_PROFILE",
                  role: updated.role,
                  currentRole: updated.role,
                  proposedRole: targetRole,
                  roleMismatch: updated.role !== targetRole,
                  departmentScopes: updated.departmentScopes,
                });
              } else {
                const created = await tx.user.create({
                  data: {
                    ssoUserId: targetSsoUserId,
                    identifierValue,
                    identifierType,
                    name,
                    email,
                    username: resolvedUsername,
                    role: targetRole,
                    userType,
                    departmentScopes: [],
                    authoritySource: "SSO",
                    status: "ACTIVE",
                  },
                });

                results.push({
                  id: created.id,
                  ssoUserId: created.ssoUserId,
                  name: created.name,
                  email: created.email,
                  username: created.username,
                  identifierValue: created.identifierValue,
                  identifierType: created.identifierType,
                  userType: created.userType,
                  status: "NEW",
                  action: "CREATE",
                  role: created.role,
                  currentRole: created.role,
                  proposedRole: targetRole,
                  roleMismatch: false,
                  departmentScopes: created.departmentScopes,
                });
              }
            }
          } catch (itemErr: any) {
            console.error(`[SSO Sync] Error processing user:`, itemErr?.message || itemErr);
          }
        }

        await audit(
          tx,
          req.context,
          "SYNC_SSO_USERS",
          "USER",
          "BATCH_SYNC",
          null,
          null,
          {
            total: filteredUsers.length,
            count: results.length,
            roleMismatchCount: results.filter((r) => r.roleMismatch).length,
          },
          `Sinkronisasi akun pengguna dari SSO: ${results.filter((r) => r.status === "NEW").length} pengguna baru ditambahkan, ${results.filter((r) => r.status === "ALREADY_EXISTS").length} profil diperbarui, dan ${results.filter((r) => r.roleMismatch).length} role berbeda dengan SSO sehingga tetap memakai role E-Learning.`,
        );

        return results;
      });

      res.json({
        ok: true,
        dryRun: false,
        total: filteredUsers.length,
        newCount: executionResults.filter((r) => r.status === "NEW").length,
        existingCount: executionResults.filter(
          (r) => r.status === "ALREADY_EXISTS",
        ).length,
        results: executionResults,
      });
    },
  );

  // =========================================================================
  // REKAMAN JEJAK AKTIVITAS (AUDIT LOGS)
  // =========================================================================

  /**
   * Mengambil rekaman jejak aktivitas tata kelola sistem & akademik.
   * Super Admin dapat melihat riwayat seluruh universitas.
   * Admin Prodi dapat melihat riwayat terlingkup program studi mereka.
   */
  app.get("/api/v1/system/audit-logs", authenticate, async (req, res) => {
    const user = req.context.user;
    ensure(
      ["SUPER_ADMIN", "DEPARTMENT_ADMIN"].includes(user.role),
      403,
      "FORBIDDEN",
    );

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const userScopes = (user.departmentScopes || []).map(normalizeDepartmentCode);

    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize || "25"), 10) || 25),
    );
    const skip = (page - 1) * pageSize;

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const roleFilter = typeof req.query.role === "string" ? req.query.role.trim() : "";
    const actionFilter = typeof req.query.action === "string" ? req.query.action.trim() : "";
    const entityFilter = typeof req.query.entity === "string" ? req.query.entity.trim() : "";
    const departmentFilter = typeof req.query.department === "string" ? req.query.department.trim() : "";
    const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
    const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";

    const where: any = {};

    // Filter lingkup otoritas (Scope restrictions)
    if (!isSuperAdmin) {
      if (userScopes.length === 0) {
        where.actorId = user.id;
      } else {
        const [deptClasses, deptCourses, deptUsers] = await Promise.all([
          db.courseClass.findMany({
            where: { course: { departmentCode: { in: userScopes } } },
            select: { id: true },
          }),
          db.course.findMany({
            where: { departmentCode: { in: userScopes } },
            select: { id: true },
          }),
          db.user.findMany({
            where: { departmentScopes: { hasSome: userScopes } },
            select: { id: true },
          }),
        ]);

        const classIds = deptClasses.map((c) => c.id);
        const courseIds = deptCourses.map((c) => c.id);
        const actorIds = [...new Set([...deptUsers.map((u) => u.id), user.id])];

        where.OR = [
          { classId: { in: classIds } },
          { entity: "COURSE", entityId: { in: courseIds } },
          { entity: "DEPARTMENT", entityId: { in: userScopes } },
          { actorId: { in: actorIds } },
        ];
      }
    } else if (departmentFilter && departmentFilter !== "ALL") {
      const normalizedDept = normalizeDepartmentCode(departmentFilter);
      const [deptClasses, deptCourses] = await Promise.all([
        db.courseClass.findMany({
          where: { course: { departmentCode: normalizedDept } },
          select: { id: true },
        }),
        db.course.findMany({
          where: { departmentCode: normalizedDept },
          select: { id: true },
        }),
      ]);
      const classIds = deptClasses.map((c) => c.id);
      const courseIds = deptCourses.map((c) => c.id);

      where.OR = [
        { classId: { in: classIds } },
        { entity: "COURSE", entityId: { in: courseIds } },
        { entity: "DEPARTMENT", entityId: normalizedDept },
      ];
    }

    if (roleFilter && roleFilter !== "ALL") {
      where.actorRole = roleFilter;
    }

    if (actionFilter && actionFilter !== "ALL") {
      where.action = actionFilter;
    }

    if (entityFilter && entityFilter !== "ALL") {
      where.entity = entityFilter;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    if (q) {
      const searchConditions = [
        { action: { contains: q, mode: "insensitive" } },
        { entity: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { identifierValue: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [total, entries] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              identifierValue: true,
              email: true,
              role: true,
              departmentScopes: true,
            },
          },
        },
      }),
    ]);

    const record = (value: unknown): Record<string, unknown> =>
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    const formatted = entries.map((entry) => {
      const before = record(entry.beforeState);
      const after = record(entry.afterState);

      const allKeys = Array.from(
        new Set([...Object.keys(before), ...Object.keys(after)]),
      ).filter(
        (k) =>
          ![
            "password",
            "passwordHash",
            "token",
            "secret",
            "metadata",
          ].includes(k),
      );

      const changes = allKeys.flatMap((field) => {
        const oldValue = before[field];
        const newValue = after[field];
        if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return [];
        return [{ field, before: oldValue, after: newValue }];
      });

      const title =
        after.title ??
        after.name ??
        after.code ??
        before.title ??
        before.name ??
        before.code ??
        entry.entityId;

      return {
        id: entry.id,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        classId: entry.classId,
        actorRole: entry.actorRole,
        user: entry.user,
        createdAt: entry.createdAt,
        reason: entry.reason,
        ipAddress: entry.ipAddress,
        objectTitle: typeof title === "string" ? title : null,
        changes,
        beforeState: entry.beforeState,
        afterState: entry.afterState,
      };
    });

    res.json({
      data: formatted,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    });
  });
}
