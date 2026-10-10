import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  db,
  ensure,
  audit,
  mutate,
  transaction,
} from "./core.js";
import { authenticate } from "./auth.js";
import {
  UAY_DEPARTMENTS,
  normalizeDepartmentCode,
  siakadScopeSyncPayloadSchema,
} from "../../../packages/shared/src/departments.js";

/**
 * Otomatis mengisi data awal program studi resmi jika tabel departments masih kosong.
 */
export async function ensureDefaultDepartments(client: any = db) {
  try {
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
  } catch {
    // Graceful fallback jika tabel belum selesai dimigrasi pada lingkungan tertentu
  }
}

function authorizeMachineOrSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.SIAKAD_SYNC_SECRET?.trim();
  const token =
    req.get("X-SIAKAD-Secret")?.trim() ||
    req.get("X-SIAKAD-Token")?.trim() ||
    req.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (secret && token) {
    const isSecretValid =
      token.length === secret.length &&
      timingSafeEqual(
        createHash("sha256").update(token).digest(),
        createHash("sha256").update(secret).digest(),
      );
    if (isSecretValid) {
      req.context = {
        user: {
          id: "00000000-0000-0000-0000-000000000001",
          ssoUserId: "00000000-0000-0000-0000-000000000001",
          username: "siakad-system",
          name: "Sistem Informasi Akademik (SIAKAD UAY)",
          email: "siakad-integration@uay.ac.id",
          userType: "ADMIN",
          identifierType: "OTHER",
          identifierValue: "SIAKAD_SYSTEM",
          role: "SUPER_ADMIN",
          departmentScopes: [],
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
  authenticate(req, res, () => {
    ensure(req.context?.user?.role === "SUPER_ADMIN", 403, "FORBIDDEN");
    next();
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

    try {
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
    } catch {
      // Fallback data statis jika akses tabel tertunda
      res.json(
        UAY_DEPARTMENTS.map((d) => ({
          id: d.code,
          code: d.code,
          name: d.name,
          faculty: d.faculty,
          isActive: true,
        })),
      );
    }
  });

  /**
   * CREATE: Tambah program studi baru oleh Super Admin.
   */
  app.post("/api/v1/system/departments", authenticate, async (req, res) => {
    ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

    const data = z
      .object({
        code: z.string().trim().min(1, "Kode prodi wajib diisi").max(20),
        name: z.string().trim().min(3, "Nama prodi minimal 3 karakter").max(150),
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
        code: z.string().trim().min(1).max(20).optional(),
        name: z.string().trim().min(3).max(150).optional(),
        faculty: z.string().trim().max(150).nullable().optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    res.json(
      await mutate(req, async (tx) => {
        await ensureDefaultDepartments(tx);

        const target = await (tx as any).department.findFirst({
          where: {
            OR: [{ id: String(req.params.id) }, { code: String(req.params.id).toUpperCase() }],
          },
        });
        ensure(target, 404, "DEPARTMENT_NOT_FOUND");

        const nextCode = data.code ? normalizeDepartmentCode(data.code) : target.code;

        if (nextCode !== target.code) {
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
  app.delete("/api/v1/system/departments/:id", authenticate, async (req, res) => {
    ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

    res.json(
      await mutate(req, async (tx) => {
        await ensureDefaultDepartments(tx);

        const target = await (tx as any).department.findFirst({
          where: {
            OR: [{ id: String(req.params.id) }, { code: String(req.params.id).toUpperCase() }],
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

        if (courseCount > 0 || userCount > 0) {
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
            message: `Program studi dinonaktifkan karena masih terdapat ${courseCount} mata kuliah atau ${userCount} otoritas pengguna terkait.`,
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
  });

  // =========================================================================
  // PENETAPAN OTORITAS PENGGUNA (DEPARTMENT SCOPES)
  // =========================================================================

  /**
   * Super Admin melihat daftar dosen / pengelola program studi beserta departmentScopes.
   */
  app.get("/api/v1/system/department-scopes/users", authenticate, async (req, res) => {
    ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const roleFilter = typeof req.query.role === "string" ? req.query.role.trim() : "";
    const departmentFilter =
      typeof req.query.department === "string" ? req.query.department.trim() : "";

    const users = await db.user.findMany({
      where: {
        status: "ACTIVE",
        ...(roleFilter ? { role: roleFilter as any } : {}),
        ...(departmentFilter ? { departmentScopes: { has: departmentFilter } } : {}),
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
      },
      take: 100,
    });

    res.json(users);
  });

  /**
   * Super Admin menetapkan atau mengubah departmentScopes seorang pengguna.
   */
  app.put("/api/v1/system/department-scopes/users/:id", authenticate, async (req, res) => {
    ensure(req.context.user.role === "SUPER_ADMIN", 403, "FORBIDDEN");

    const data = z
      .object({
        departmentScopes: z.array(z.string().trim().min(1)).max(20),
        role: z
          .enum(["SUPER_ADMIN", "DEPARTMENT_ADMIN", "INSTRUCTOR", "STUDENT"])
          .optional(),
      })
      .parse(req.body);

    res.json(
      await mutate(req, async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: String(req.params.id) },
        });
        ensure(target, 404, "USER_NOT_FOUND");

        const normalizedScopes = [
          ...new Set(
            data.departmentScopes.map(normalizeDepartmentCode).filter(Boolean),
          ),
        ];

        let finalRole = data.role ?? target.role;
        // Promosi otomatis jika diberikan lingkup prodi tetapi perannya masih INSTRUCTOR
        if (!data.role && normalizedScopes.length > 0 && target.role === "INSTRUCTOR") {
          finalRole = "DEPARTMENT_ADMIN";
        }
        // Kembalikan ke INSTRUCTOR jika lingkup prodi dikosongkan dan perannya DEPARTMENT_ADMIN
        if (!data.role && normalizedScopes.length === 0 && target.role === "DEPARTMENT_ADMIN") {
          finalRole = "INSTRUCTOR";
        }

        const after = await tx.user.update({
          where: { id: target.id },
          data: {
            departmentScopes: normalizedScopes,
            role: finalRole,
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
  });

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
        for (const assignment of payload.assignments) {
          const user = await db.user.findFirst({
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
            },
          });

          const normalizedScopes = [
            ...new Set(
              assignment.departmentScopes
                .map(normalizeDepartmentCode)
                .filter(Boolean),
            ),
          ];

          previewResults.push({
            identifierValue: assignment.identifierValue,
            userId: user?.id ?? null,
            name: user?.name ?? null,
            currentRole: user?.role ?? null,
            proposedRole: assignment.role,
            currentScopes: user?.departmentScopes ?? [],
            proposedScopes: normalizedScopes,
            status: user ? "READY" : "USER_NOT_FOUND",
          });
        }

        res.json({
          ok: true,
          dryRun: true,
          source: payload.source,
          academicYear: payload.academicYear ?? null,
          total: payload.assignments.length,
          ready: previewResults.filter((r) => r.status === "READY").length,
          notFound: previewResults.filter((r) => r.status === "USER_NOT_FOUND").length,
          results: previewResults,
        });
        return;
      }

      // Mode Eksekusi Nyata
      const executionResults = await transaction(async (tx) => {
        const results = [];
        for (const assignment of payload.assignments) {
          const user = await tx.user.findFirst({
            where: {
              OR: [
                { identifierValue: assignment.identifierValue },
                { username: assignment.identifierValue },
                { email: assignment.identifierValue },
              ],
            },
          });

          const normalizedScopes = [
            ...new Set(
              assignment.departmentScopes
                .map(normalizeDepartmentCode)
                .filter(Boolean),
            ),
          ];

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
            },
          });

          await audit(
            tx,
            req.context,
            "SYNC_SIAKAD_SCOPES",
            "USER",
            user.id,
            null,
            before,
            { role: after.role, departmentScopes: after.departmentScopes },
            assignment.notes ?? `Sinkronisasi otoritas prodi dari ${payload.source}`,
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
        notFound: executionResults.filter((r) => r.status === "USER_NOT_FOUND").length,
        results: executionResults,
      });
    },
  );
}
