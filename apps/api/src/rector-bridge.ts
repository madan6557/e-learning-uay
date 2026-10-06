import type { Express, RequestHandler } from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { ensure } from "./core.js";
import { UniversityReportingDataSource } from "./rector/source.js";
import { authenticate } from "./auth.js";

const authorizeRectorBridge: RequestHandler = async (req, res, next) => {
  const token =
    req.get("X-Rector-Bridge-Token") ||
    req.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const secret = process.env.RECTOR_BRIDGE_TOKEN;
    ensure(
      secret &&
        timingSafeEqual(
          createHash("sha256").update(token).digest(),
          createHash("sha256").update(secret).digest(),
        ),
      401,
      "RECTOR_BRIDGE_UNAUTHORIZED",
    );
    next();
    return;
  }
  await authenticate(req, res, () => {
    ensure(
      req.context.user.role === "SUPER_ADMIN",
      401,
      "RECTOR_BRIDGE_UNAUTHORIZED",
    );
    next();
  });
};

export function registerRectorBridgeRoutes(app: Express) {
  app.get(
    "/api/v1/integrations/rector/snapshot",
    authorizeRectorBridge,
    async (_req, res) => {
      res.json(await new UniversityReportingDataSource().readSnapshot());
    },
  );
}
