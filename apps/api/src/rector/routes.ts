import express from "express";

import { z, ZodError } from "zod";
import type {
  ReportingDataSource,
  ReportFilters,
  SnapshotMeta,
} from "../../../../packages/shared/src/rector.js";
import { authenticate } from "../auth.js";
import { ensure, HttpError } from "../core.js";
import {
  classDetail,
  lecturerDetail,
  lecturerRows,
  loginSessions,
  options,
  selectReport,
  summary,
} from "./reporting.js";
import { csvReport, pdfReport } from "./exports.js";
import { localTimeZone, validTimeZone } from "../../../../packages/shared/src/time.js";
const prefix = "/api/rector/v1";

function failure(
  res: express.Response,
  statusCode: number,
  code: string,
  message?: string,
) {
  res.status(statusCode).json({
    statusCode,
    success: false,
    error: code,
    message: message ?? code,
    timestamp: new Date().toISOString(),
  });
}
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Tanggal tidak valid",
  );
const querySchema = z.object({
  timeZone: z.string().min(1).max(100).refine(validTimeZone, "Zona waktu tidak valid").optional(),
  semester: z.string().max(60).optional(),
  from: date.optional(),
  to: date.optional(),
  department: z.string().max(60).optional(),
  lecturer: z.string().max(60).optional(),
  classId: z.string().max(60).optional(),
  sessionId: z.string().max(100).optional(),
  search: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z
    .enum([
      "name",
      "department",
      "classCount",
      "logins",
      "accesses",
      "academicActions",
      "gradingActions",
      "pending",
      "lastLoginAt",
      "lastAcademicAt",
      "materialActions",
      "activeDays",
    ])
    .default("name"),
  order: z.enum(["asc", "desc"]).default("asc"),
  category: z
    .enum([
      "LOGIN",
      "LOGOUT",
      "AKSES",
      "MATERI",
      "ASESMEN",
      "PENILAIAN",
      "PUBLIKASI",
      "KOREKSI",
      "PENGUMUMAN",
      "KELAS",
    ])
    .optional(),
  actorKind: z.enum(["DOSEN", "ADMIN", "SISTEM"]).optional(),
  view: z
    .enum(["overview", "lecturers", "lecturer", "class", "activities"])
    .default("overview"),
  id: z.string().max(60).optional(),
  _session: z.string().max(100).optional(),
});
export function rectorReporting(source: ReportingDataSource, demo: boolean) {
  const app = express.Router();
  app.use(prefix, authenticate, (req, res, next) => {
    res.set("Cache-Control", "no-store");
    ensure(
      ["RECTOR", "SUPER_ADMIN"].includes(req.context.user.role),
      403,
      "FORBIDDEN",
    );
    ensure(["GET", "HEAD", "OPTIONS"].includes(req.method), 405, "READ_ONLY");
    next();
  });
  app.get(prefix + "/auth/config", (_req, res) =>
    res.json({ demoEnabled: false, demo, integrated: true }),
  );
  app.get(prefix + "/auth/session", (req, res) =>
    res.json({
      name: req.context.user.name,
      role: req.context.user.role,
      demo,
    }),
  );
  app.get(`${prefix}/{*resource}`, async (req, res) => {
    const s = await source.readSnapshot();
    const q = querySchema.parse(req.query);
    const timeZone = q.timeZone ?? localTimeZone();
    const defaults = options(s, timeZone).defaultFilters;
    const f: ReportFilters = {
      timeZone,
      semester:
        q.semester === "all" ? undefined : (q.semester ?? defaults.semester),
      from: q.from ?? defaults.from,
      to: q.to ?? defaults.to,
      department: q.department,
      lecturer: q.lecturer,
      classId: q.classId,
      search: q.search,
      category: q.category,
      actorKind: q.actorKind,
      sessionId: q.sessionId,
    };
    if (
      Date.parse(f.from!) > Date.parse(f.to!) ||
      Date.parse(f.to!) - Date.parse(f.from!) > 730 * 86400000
    ) {
      failure(res, 400, "INVALID_DATE_RANGE");
      return;
    }
    const valid = options(s, timeZone);
    if (
      (f.semester && !valid.semesters.includes(f.semester)) ||
      (f.department && !valid.departments.includes(f.department)) ||
      (f.lecturer && !s.lecturers.some((l) => l.id === f.lecturer)) ||
      (f.classId && !s.classes.some((c) => c.id === f.classId))
    ) {
      failure(res, 400, "INVALID_FILTER");
      return;
    }
    const meta: SnapshotMeta = {
      timeZone,
      demo,
      snapshotAt: s.snapshotAt,
      responseAt: new Date().toISOString(),
      refreshSeconds: 300,
    };
    const json = (data: unknown) => res.json({ data, meta });
    const resource = req.path.slice(prefix.length + 1);
    if (resource === "filters") {
      json(valid);
      return;
    }
    if (resource === "summary") {
      json(summary(s, f));
      return;
    }
    if (resource === "sessions") {
      const rows = loginSessions(s, f);
      json({
        items: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
        total: rows.length,
        page: q.page,
        pageSize: q.pageSize,
      });
      return;
    }
    if (resource === "lecturers") {
      const rows = lecturerRows(s, f).sort((a, b) => {
        const av = a[q.sort];
        const bv = b[q.sort];
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av ?? "").localeCompare(String(bv ?? ""), "id");
        return (q.order === "desc" ? -cmp : cmp) || a.id.localeCompare(b.id);
      });
      json({
        items: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
        total: rows.length,
        page: q.page,
        pageSize: q.pageSize,
      });
      return;
    }
    if (resource.startsWith("lecturers/")) {
      const d = lecturerDetail(s, f, resource.slice(10));
      if (!d) {
        failure(res, 404, "NOT_FOUND");
        return;
      }
      json(d);
      return;
    }
    if (resource.startsWith("classes/")) {
      const d = classDetail(s, f, resource.slice(8));
      if (!d) {
        failure(res, 404, "NOT_FOUND");
        return;
      }
      json(d);
      return;
    }
    if (resource === "activities") {
      const rows = selectReport(s, f)
        .activities.filter(
          (a) =>
            (!q.category || a.category === q.category) &&
            (!q.actorKind || a.actorKind === q.actorKind),
        )
        .sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
      json({
        items: rows.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
        total: rows.length,
        page: q.page,
        pageSize: q.pageSize,
      });
      return;
    }
    if (resource === "exports/csv" || resource === "exports/pdf") {
      if (
        (q.view === "lecturer" && (!q.id || !lecturerDetail(s, f, q.id))) ||
        (q.view === "class" && (!q.id || !classDetail(s, f, q.id)))
      ) {
        failure(res, 404, "NOT_FOUND");
        return;
      }
      const exportFilters = {
        ...f,
        ...(q.view === "lecturer"
          ? { lecturer: q.id }
          : q.view === "class"
            ? { classId: q.id }
            : {}),
      };
      res.set(
        "Content-Disposition",
        `attachment; filename="uay-rektor-${q.view}-${s.snapshotAt.slice(0, 10)}.${resource.endsWith("csv") ? "csv" : "pdf"}"`,
      );
      if (resource.endsWith("csv"))
        res
          .type("text/csv; charset=utf-8")
          .send(csvReport(s, exportFilters, q.view, q.id, demo));
      else
        res
          .type("application/pdf")
          .send(
            await pdfReport(s, exportFilters, q.view, q.id, q._session, demo),
          );
      return;
    }
    failure(res, 404, "NOT_FOUND");
  });
  app.use(prefix, (_req, res) => failure(res, 404, "NOT_FOUND"));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof HttpError) {
        _next(err);
        return;
      }
      if (err instanceof ZodError) {
        failure(res, 400, "INVALID_QUERY");
        return;
      }
      if (err instanceof SyntaxError) {
        failure(res, 400, "INVALID_JSON");
        return;
      }
      console.error("Rector reporting request failed");
      failure(res, 500, "REPORT_UNAVAILABLE");
    },
  );
  return app;
}
