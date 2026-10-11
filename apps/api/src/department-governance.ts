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
} from "./core.js";
import { authenticate } from "./auth.js";
import {
  UAY_DEPARTMENTS,
  normalizeDepartmentCode,
  siakadScopeSyncPayloadSchema,
} from "../../../packages/shared/src/departments.js";

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
      if (roleFilter) z.enum(authorityRoles).parse(roleFilter);

      const users = await db.user.findMany({
        where: {
          status: "ACTIVE",
          role: roleFilter ? (roleFilter as any) : { in: [...authorityRoles] },
          ...(departmentFilter
            ? { departmentScopes: { has: departmentFilter } }
            : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { identifierValue: { contains: q } },
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
            .enum(["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR"])
            .default("DEPARTMENT_ADMIN"),
          userType: z.enum(["LECTURER", "STAFF", "ADMIN"]).default("LECTURER"),
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
            await validateAuthority(tx, normalizedScopes, data.role, existing);
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

          await validateAuthority(tx, normalizedScopes, data.role);
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
}
