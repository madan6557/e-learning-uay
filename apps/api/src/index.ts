import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";
import {
  config,
  production,
  isDemo,
  cache,
  db,
  redis,
  ensure,
  HttpError,
  transaction,
  notify,
  audit,
  systemContext,
} from "./core.js";
import { registerAuth, authenticate } from "./auth.js";
import { registerLearning } from "./learning.js";
import { registerAssessment, expireAttempts } from "./assessment.js";
import { registerGrades } from "./grades.js";
import { registerFiles } from "./files.js";
import { registerImports } from "./imports.js";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { join, resolve } from "node:path";

function registerLocalFixtureProxy(
  app: express.Express,
  prefix: string,
  target?: string,
) {
  if (!target) return;
  const upstream = new URL(target);
  if (!["127.0.0.1", "localhost"].includes(upstream.hostname))
    throw new Error("Demo fixture proxy must target loopback.");
  app.use(prefix, (req, res, next) => {
    const path = req.originalUrl.slice(prefix.length) || "/";
    const headers = { ...req.headers, host: upstream.host };
    const body = req.is("application/json")
      ? JSON.stringify(req.body ?? {})
      : null;
    if (body !== null)
      headers["content-length"] = String(Buffer.byteLength(body));
    const proxy = httpRequest(
      {
        hostname: upstream.hostname,
        port: upstream.port,
        path,
        method: req.method,
        headers,
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      },
    );
    proxy.once("error", next);
    if (body !== null) proxy.end(body);
    else req.pipe(proxy);
  });
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (production || isDemo || process.env.TRUST_PROXY)
    app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use((req, res, next) => {
    const origin = req.get("Origin");
    const isAllowed =
      !origin ||
      config.allowedOrigins.includes(origin) ||
      config.allowedOrigins.includes("*");
    if (origin && isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Idempotency-Key, Origin, X-Requested-With, Accept",
      );
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buffer) => {
        (req as express.Request).rawBody = buffer.toString("utf8");
      },
    }),
  );
  app.use(cookieParser());
  registerLocalFixtureProxy(
    app,
    "/demo-sso",
    process.env.DEMO_INTERNAL_SSO_URL,
  );
  registerLocalFixtureProxy(
    app,
    "/demo-files",
    process.env.DEMO_INTERNAL_FILE_URL,
  );
  app.get("/api/health", async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    if (redis) await redis.ping();
    res.json({ status: "ok", service: "elearning-uay", version: "0.1.0" });
  });
  app.use("/api", async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const isAuth = req.path.startsWith("/v1/auth/");
    ensure(
      await cache.rate(
        `rate:${isAuth ? "auth" : "api"}:${req.ip}`,
        isAuth ? 5 : 30,
        1,
      ),
      429,
      "RATE_LIMITED",
    );
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.path !== "/v1/auth/revocations"
    ) {
      const origin = req.get("Origin");
      const isAllowed = !!origin && config.allowedOrigins.includes(origin);
      ensure(isAllowed, 403, "INVALID_ORIGIN");
    }
    next();
  });
  registerAuth(app);
  app.use("/api/v1", authenticate);
  registerLearning(app);
  registerAssessment(app);
  registerGrades(app);
  registerFiles(app);
  registerImports(app);
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: { code: "NOT_FOUND" } }),
  );
  const webDist = resolve(process.env.WEB_DIST_DIR ?? "apps/web/dist");
  if (production && existsSync(join(webDist, "index.html"))) {
    app.use(express.static(webDist, { index: false, maxAge: "1h" }));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(join(webDist, "index.html")),
    );
  }
  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            details: error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
            requestId: req.context?.requestId,
          },
        });
        return;
      }
      const tokenError = /^ERR_(JWT|JWS|JOSE)/.test(error.code ?? "");
      const status =
        error instanceof HttpError
          ? error.status
          : tokenError
            ? 401
            : error.code === "ERR_JWKS_TIMEOUT"
              ? 503
              : error.code === "P2002"
                ? 409
                : error.type === "entity.too.large"
                  ? 413
                  : typeof error.status === "number" &&
                      error.status >= 400 &&
                      error.status < 500
                    ? error.status
                    : 500;
      const code =
        error instanceof HttpError
          ? error.code
          : tokenError
            ? "INVALID_TOKEN"
            : error.code === "P2002"
              ? "DUPLICATE_RECORD"
              : status === 413
                ? "REQUEST_TOO_LARGE"
                : status < 500
                  ? "INVALID_REQUEST"
                  : "INTERNAL_ERROR";
      if (status >= 500)
        console.error(
          JSON.stringify({
            event: "request_failed",
            code: error.code ?? error.name,
            requestId: req.context?.requestId,
            path: req.path,
          }),
        );
      res.status(status).json({
        error: {
          code,
          details: error instanceof HttpError ? error.details : undefined,
          requestId: req.context?.requestId,
        },
      });
    },
  );
  return app;
}
export async function runScheduledWork() {
  await expireAttempts();
  const scheduled = await db.quizAttempt.findMany({
    where: {
      publishedAt: null,
      status: "GRADED_COMPLETE",
      quiz: {
        resultReleaseMode: "SCHEDULED",
        resultReleaseAt: { lte: new Date() },
      },
    },
    include: { quiz: { include: { section: true } }, user: true },
    take: 100,
  });
  for (const attempt of scheduled)
    await transaction(async (tx) => {
      const updated = await tx.quizAttempt.updateMany({
        where: { id: attempt.id, publishedAt: null },
        data: { publishedAt: new Date() },
      });
      if (updated.count) {
        await notify(
          tx,
          attempt.quiz.section.classId,
          "GRADE_PUBLISHED",
          attempt.quiz.title,
          `quiz-grade:${attempt.id}`,
          attempt.userId,
        );
        await audit(
          tx,
          systemContext(attempt.user),
          "SCHEDULED_PUBLISH_GRADE",
          "ATTEMPT",
          attempt.id,
          attempt.quiz.section.classId,
          { publishedAt: null },
          { publishedAt: new Date() },
        );
      }
    });
  const announcements = await db.announcement.findMany({
    where: {
      isPublished: true,
      publishedAt: { lte: new Date() },
      class: { status: "PUBLISHED", course: { status: "PUBLISHED" } },
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  for (const item of announcements)
    await transaction((tx) =>
      notify(
        tx,
        item.classId,
        "ANNOUNCEMENT",
        item.title,
        `announcement:${item.id}`,
      ),
    );
  const now = new Date();
  const visibleSection = {
    isVisible: true,
    class: {
      status: "PUBLISHED" as const,
      course: { status: "PUBLISHED" as const },
    },
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] },
    ],
  };
  const publishedAssignments = await db.assignment.findMany({
    where: {
      isVisible: true,
      section: visibleSection,
      OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
    },
    include: { section: true },
    take: 500,
  });
  for (const item of publishedAssignments)
    await transaction((tx) =>
      notify(
        tx,
        item.section.classId,
        "NEW_ASSIGNMENT",
        item.title,
        `assignment:${item.id}`,
      ),
    );
  const deadline = new Date(Date.now() + 86400000);
  const assignments = await db.assignment.findMany({
    where: {
      isVisible: true,
      deadline: { gt: new Date(), lte: deadline },
      OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
      section: visibleSection,
    },
    include: { section: true },
    take: 100,
  });
  for (const item of assignments)
    await transaction((tx) =>
      notify(
        tx,
        item.section.classId,
        "DEADLINE_REMINDER",
        item.title,
        `deadline:${item.id}:${item.deadline!.toISOString()}`,
      ),
    );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const host =
    process.env.API_HOST ??
    (process.env.PORT || production || isDemo ? "0.0.0.0" : "127.0.0.1");
  const server = createApp().listen(config.port, host, () =>
    console.log(
      `E-Learning UAY API listening on http://${host}:${config.port}`,
    ),
  );
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      await runScheduledWork();
    } catch (error: any) {
      console.error(
        "Scheduled work failed; will retry:",
        error?.message || error,
      );
    } finally {
      busy = false;
    }
  }, 5000);
  const shutdown = () => {
    clearInterval(timer);
    server.close(async () => {
      await db.$disconnect();
      await redis?.quit();
      process.exit();
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
