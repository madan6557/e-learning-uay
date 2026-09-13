import type { Express, Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import {
  db,
  cache,
  config,
  production,
  isDemo,
  ensure,
  hash,
  audit,
  transaction,
  HttpError,
} from "./core.js";

const isSecure = Boolean(
  process.env.COOKIE_SECURE === "true" ||
  (process.env.NODE_ENV === "production" && !process.env.COOKIE_SECURE_DISABLE),
);
const cookieName =
  process.env.COOKIE_NAME ??
  (production && !isDemo ? "__Host-uay-session" : "uay-session");
const cookie = {
  httpOnly: true,
  secure: isSecure,
  sameSite:
    (process.env.COOKIE_SAMESITE as any) ??
    (isSecure && isDemo ? "none" : "lax"),
  path: "/",
};
type Session = {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expires: number;
  createdAt: number;
};
let discovery: any;
let jwks: ReturnType<typeof createRemoteJWKSet>;
export async function oidcMetadata() {
  if (!discovery) {
    const response = await fetch(
      `${config.issuer}/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(3000) },
    );
    ensure(response.ok, 503, "SSO_UNAVAILABLE");
    const data: any = await response.json();
    ensure(data.issuer === config.issuer, 503, "SSO_CONFIGURATION");
    for (const key of ["authorization_endpoint", "token_endpoint", "jwks_uri"])
      ensure(
        typeof data[key] === "string" &&
          new URL(data[key]).origin === new URL(config.issuer).origin,
        503,
        "SSO_CONFIGURATION",
      );
    if (data.end_session_endpoint)
      ensure(
        new URL(data.end_session_endpoint).origin ===
          new URL(config.issuer).origin,
        503,
        "SSO_CONFIGURATION",
      );
    discovery = data;
    jwks = createRemoteJWKSet(new URL(data.jwks_uri), {
      timeoutDuration: 3000,
    });
  }
  return discovery;
}
async function verifyAccess(token: string) {
  await oidcMetadata();
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    audience: config.audience,
    algorithms: ["RS256", "ES256"],
    requiredClaims: ["sub", "exp", "iat", "account_status"],
    maxTokenAge: "15m",
    clockTolerance: 5,
  });
  ensure(payload.account_status === "ACTIVE", 403, "ACCOUNT_DISABLED");
  ensure(
    z.string().uuid().safeParse(payload.sub).success,
    403,
    "INVALID_IDENTITY",
  );
  ensure(
    typeof payload.exp === "number" &&
      typeof payload.iat === "number" &&
      payload.exp - payload.iat <= 900,
    403,
    "TOKEN_LIFETIME",
  );
  ensure(!(await cache.get(`revoked:${payload.sub}`)), 403, "ACCOUNT_DISABLED");
  return payload;
}
async function syncUser(claims: JWTPayload) {
  const profile = z
    .object({
      sub: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email(),
      student_staff_number: z.string().min(1),
      role: z.enum([
        "SUPER_ADMIN",
        "DEPARTMENT_ADMIN",
        "INSTRUCTOR",
        "STUDENT",
      ]),
      department_scopes: z.array(z.string()).default([]),
    })
    .parse(claims);
  const data = {
    fullName: profile.name,
    email: profile.email,
    studentStaffNumber: profile.student_staff_number,
    role: profile.role,
    departmentScopes: profile.department_scopes,
    isActive: true,
    lastLoginAt: new Date(),
  };
  return transaction(async (tx) => {
    const before = await tx.user.findUnique({
      where: { externalSubjectId: profile.sub },
    });
    const user = await tx.user.upsert({
      where: { externalSubjectId: profile.sub },
      create: { externalSubjectId: profile.sub, ...data },
      update: data,
    });
    if (
      !before ||
      before.role !== user.role ||
      JSON.stringify(before.departmentScopes) !==
        JSON.stringify(user.departmentScopes) ||
      !before.isActive
    )
      await audit(
        tx,
        {
          user,
          requestId: randomBytes(16).toString("hex"),
          ip: "sso",
          userAgent: "oidc",
        },
        "SYNC_IDENTITY",
        "USER",
        user.id,
        null,
        before,
        user,
      );
    return user;
  });
}
async function tokenRequest(values: Record<string, string>) {
  const metadata = await oidcMetadata();
  const response = await fetch(metadata.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...values,
      client_id: config.clientId,
      ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
    }),
    signal: AbortSignal.timeout(3000),
  });
  ensure(response.ok, 401, "SESSION_EXPIRED");
  const data: any = await response.json();
  ensure(typeof data.access_token === "string", 401, "INVALID_TOKEN");
  return data;
}
async function issue(res: Response, session: Session) {
  const id = randomBytes(32).toString("base64url");
  await cache.set(`session:${hash(id)}`, JSON.stringify(session), 8 * 3600);
  res.cookie(cookieName, id, { ...cookie, maxAge: 8 * 3600000 });
}
export function registerAuth(app: Express) {
  app.get("/api/v1/auth/config", (_req, res) =>
    res.json({
      mode: config.authMode,
      demoEnabled: isDemo && config.authMode === "oidc",
      issuer: config.issuer,
      embedOrigins: config.embedOrigins,
    }),
  );
  app.get("/api/v1/auth/development-users", async (_req, res) => {
    ensure(
      !production && (config.authMode === "development" || isDemo),
      404,
      "NOT_FOUND",
    );
    res.json(
      await db.user.findMany({
        select: {
          id: true,
          fullName: true,
          role: true,
          studentStaffNumber: true,
        },
        orderBy: { role: "asc" },
      }),
    );
  });
  app.post("/api/v1/auth/development-login", async (req, res) => {
    ensure(!production && config.authMode === "development", 404, "NOT_FOUND");
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    const user = await db.user.findUnique({ where: { id: userId } });
    ensure(user && user.isActive, 403, "ACCOUNT_DISABLED");
    await issue(res, {
      userId,
      expires: Date.now() + 900000,
      createdAt: Date.now(),
    });
    res.json({ ok: true });
  });
  app.get("/api/v1/auth/login", async (req, res) => {
    ensure(config.authMode === "oidc", 503, "SSO_CONFIGURATION");
    const demoUserId = req.query.demoUserId;
    let demoSubject: string | undefined;
    if (demoUserId) {
      ensure(
        isDemo &&
          ["127.0.0.1", "localhost"].includes(new URL(config.issuer).hostname),
        404,
        "NOT_FOUND",
      );
      const user = await db.user.findUnique({
        where: { id: z.string().uuid().parse(demoUserId) },
      });
      ensure(user?.isActive, 403, "ACCOUNT_DISABLED");
      demoSubject = user.externalSubjectId;
    }
    const metadata = await oidcMetadata();
    const state = randomBytes(32).toString("base64url");
    const nonce = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    await cache.set(
      `oidc:${hash(state)}`,
      JSON.stringify({ nonce, verifier, demoSubject }),
      300,
    );
    res.cookie("uay-oidc-state", state, { ...cookie, maxAge: 300000 });
    const url = new URL(metadata.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: "openid profile email offline_access",
      state,
      nonce,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    if (demoSubject) url.searchParams.set("login_hint", demoSubject);
    res.redirect(url.href);
  });
  app.get("/api/v1/auth/callback", async (req, res) => {
    const { state, code } = z
      .object({ state: z.string().min(20), code: z.string().min(1) })
      .parse(req.query);
    ensure(req.cookies["uay-oidc-state"] === state, 401, "INVALID_STATE");
    const saved = await cache.take(`oidc:${hash(state)}`);
    res.clearCookie("uay-oidc-state", cookie);
    ensure(saved, 401, "INVALID_STATE");
    const { nonce, verifier, demoSubject } = JSON.parse(saved);
    const tokens = await tokenRequest({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: config.redirectUri,
    });
    const { payload: id } = await jwtVerify(tokens.id_token, jwks, {
      issuer: config.issuer,
      audience: config.clientId,
      algorithms: ["RS256", "ES256"],
      requiredClaims: ["sub", "exp", "iat", "nonce"],
    });
    ensure(id.nonce === nonce, 401, "INVALID_NONCE");
    const access = await verifyAccess(tokens.access_token);
    ensure(access.sub === id.sub, 401, "INVALID_IDENTITY");
    if (demoSubject)
      ensure(access.sub === demoSubject, 401, "INVALID_IDENTITY");
    const user = await syncUser({ ...id, ...access });
    await issue(res, {
      userId: user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token,
      expires: Number(access.exp) * 1000,
      createdAt: Date.now(),
    });
    res.redirect("/#/dashboard");
  });
  app.post("/api/v1/auth/revocations", async (req, res) => {
    const secret = process.env.SSO_WEBHOOK_SECRET;
    ensure(secret, 503, "SSO_CONFIGURATION");
    const timestamp = req.get("X-SSO-Timestamp") ?? "";
    const signature = req.get("X-SSO-Signature") ?? "";
    ensure(
      /^\d+$/.test(timestamp) &&
        Math.abs(Date.now() - Number(timestamp) * 1000) < 300000,
      401,
      "INVALID_WEBHOOK",
    );
    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${req.rawBody ?? ""}`)
      .digest("hex");
    ensure(
      signature.length === expected.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected)),
      401,
      "INVALID_WEBHOOK",
    );
    const { subject } = z
      .object({ subject: z.string().uuid() })
      .parse(req.body);
    await cache.set(`revoked:${subject}`, "1", 900);
    await transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { externalSubjectId: subject },
      });
      if (user) {
        const after = await tx.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });
        await audit(
          tx,
          {
            user,
            requestId: randomBytes(16).toString("hex"),
            ip: req.ip ?? "",
            userAgent: "sso-webhook",
          },
          "ACCOUNT_REVOKED",
          "USER",
          user.id,
          null,
          user,
          after,
        );
      }
    });
    res.json({ ok: true });
  });
  app.post("/api/v1/auth/logout", async (req, res) => {
    const id = req.cookies[cookieName];
    let logoutUrl = config.origin;
    if (id) {
      const stored = await cache.take(`session:${hash(id)}`);
      if (stored && config.authMode === "oidc") {
        const session: Session = JSON.parse(stored);
        const metadata = await oidcMetadata().catch(() => null);
        if (metadata?.end_session_endpoint) {
          const url = new URL(metadata.end_session_endpoint);
          url.search = new URLSearchParams({
            id_token_hint: session.idToken ?? "",
            post_logout_redirect_uri: config.origin,
            client_id: config.clientId,
          }).toString();
          logoutUrl = url.href;
        }
      }
    }
    res.clearCookie(cookieName, cookie);
    res.json({ logoutUrl });
  });
}
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const id = req.cookies[cookieName];
  ensure(typeof id === "string", 401, "LOGIN_REQUIRED");
  const key = `session:${hash(id)}`;
  const stored = await cache.get(key);
  ensure(stored, 401, "SESSION_EXPIRED");
  let session: Session = JSON.parse(stored);
  ensure(Date.now() - session.createdAt < 8 * 3600000, 401, "SESSION_EXPIRED");
  if (session.accessToken) {
    if (Date.now() >= session.expires) {
      ensure(session.refreshToken, 401, "SESSION_EXPIRED");
      // Serialize refresh-token rotation across requests; peers retry with the new session.
      const allowed = await cache.rate(`refresh:${hash(id)}`, 1, 5);
      ensure(allowed, 409, "SESSION_REFRESHING");
      try {
        const tokens = await tokenRequest({
          grant_type: "refresh_token",
          refresh_token: session.refreshToken,
        });
        const claims = await verifyAccess(tokens.access_token);
        const existing = await db.user.findUnique({
          where: { id: session.userId },
        });
        ensure(
          existing?.externalSubjectId === claims.sub,
          401,
          "INVALID_IDENTITY",
        );
        await syncUser(claims);
        session = {
          ...session,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? session.refreshToken,
          expires: Number(claims.exp) * 1000,
        };
        await cache.set(
          key,
          JSON.stringify(session),
          Math.max(
            1,
            Math.floor((session.createdAt + 8 * 3600000 - Date.now()) / 1000),
          ),
        );
      } catch (error) {
        await cache.del(key);
        throw error;
      }
    }
    await verifyAccess(session.accessToken!);
  } else
    ensure(
      !production &&
        config.authMode === "development" &&
        session.expires > Date.now(),
      401,
      "SESSION_EXPIRED",
    );
  const user = await db.user.findUnique({ where: { id: session.userId } });
  ensure(
    user?.isActive && !(await cache.get(`revoked:${user?.externalSubjectId}`)),
    403,
    "ACCOUNT_DISABLED",
  );
  req.context = {
    user,
    requestId:
      req.get("X-Request-ID")?.slice(0, 100) ?? randomBytes(16).toString("hex"),
    ip: req.ip ?? "",
    userAgent: req.get("User-Agent")?.slice(0, 500) ?? "",
  };
  next();
}
