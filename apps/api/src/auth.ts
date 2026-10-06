import type { Express, Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  randomBytes,
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { identityClaims, normalizeRole } from "../../../packages/shared/src/sso.js";
import {
  db,
  cache,
  config,
  production,
  isDemo,
  ensure,
  serviceFetch,
  hash,
  audit,
  transaction,
  HttpError,
  getAcademicSettings,
} from "./core.js";

export function isRequestSecure(req?: Request): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (
    process.env.COOKIE_SECURE === "false" ||
    process.env.COOKIE_SECURE_DISABLE === "true"
  )
    return false;
  if (req) {
    if (req.secure) return true;
    const proto = req.headers["x-forwarded-proto"];
    if (typeof proto === "string" && proto.split(",")[0].trim() === "https")
      return true;
    const ssl = req.headers["x-forwarded-ssl"];
    if (typeof ssl === "string" && ssl === "on") return true;
    return req.protocol === "https";
  }
  return (
    config.apiOrigin.startsWith("https://") ||
    config.origin.startsWith("https://")
  );
}

export function getCookieOptions(req?: Request) {
  return {
    httpOnly: true,
    secure: isRequestSecure(req),
    sameSite: (process.env.COOKIE_SAMESITE as any) ?? "lax",
    path: "/",
  };
}

export function getSessionCookieName(req?: Request) {
  if (process.env.COOKIE_NAME) return process.env.COOKIE_NAME;
  return isRequestSecure(req) ? "__Host-uay-session" : "uay-session";
}

export function getSessionId(req: Request): string | undefined {
  if (process.env.COOKIE_NAME && req.cookies[process.env.COOKIE_NAME]) {
    return req.cookies[process.env.COOKIE_NAME];
  }
  return req.cookies["__Host-uay-session"] ?? req.cookies["uay-session"];
}

export function clearAllAuthCookies(res: Response, req?: Request) {
  const cookieOpts = getCookieOptions(req);
  res.clearCookie("__Host-uay-session", cookieOpts);
  res.clearCookie("uay-session", cookieOpts);
  res.clearCookie("uay-oidc-state", cookieOpts);
  res.clearCookie("uay-oidc-payload", cookieOpts);
  if (process.env.COOKIE_NAME) {
    res.clearCookie(process.env.COOKIE_NAME, cookieOpts);
  }

  // Also clear with default path "/" to clear any lingering cookies regardless of options
  res.clearCookie("__Host-uay-session", { path: "/" });
  res.clearCookie("uay-session", { path: "/" });
  res.clearCookie("uay-oidc-state", { path: "/" });
  res.clearCookie("uay-oidc-payload", { path: "/" });
  if (process.env.COOKIE_NAME) {
    res.clearCookie(process.env.COOKIE_NAME, { path: "/" });
  }
}

export function getEffectiveRedirectUri(req?: Request): string {
  if (req) {
    const forwardedHost = (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim();
    const host = forwardedHost || req.headers.host;
    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ||
      (req.secure ? "https" : "http");
    if (host) {
      return `${proto}://${host}/api/v1/auth/callback`;
    }
  }
  return config.redirectUri;
}

export function getEffectiveOrigin(req?: Request): string {
  if (req) {
    const originHeader = req.headers.origin;
    if (typeof originHeader === "string" && originHeader.trim().length > 0) {
      return originHeader.trim().replace(/\/$/, "");
    }
    const forwardedHost = (req.headers["x-forwarded-host"] as string)?.split(",")[0]?.trim();
    const host = forwardedHost || req.headers.host;
    const proto =
      (req.headers["x-forwarded-proto"] as string)?.split(",")[0]?.trim() ||
      (req.secure ? "https" : "http");
    if (host) {
      return `${proto}://${host}`;
    }
  }
  return config.origin;
}

const oidcStateSecret =
  process.env.SSO_CLIENT_SECRET?.trim() ||
  process.env.SSO_WEBHOOK_SECRET?.trim() ||
  process.env.SESSION_SECRET?.trim() ||
  createHash("sha256")
    .update(
      config.clientId + ":" + (process.env.DATABASE_URL ?? "uay-oidc-fallback"),
    )
    .digest("hex");

type OidcStatePayload = {
  state: string;
  nonce: string;
  verifier: string;
  redirectUri?: string;
  demoSubject?: string;
  exp: number;
};

function signOidcPayload(data: OidcStatePayload): string {
  const jsonStr = JSON.stringify(data);
  const b64 = Buffer.from(jsonStr, "utf8").toString("base64url");
  const sig = createHmac("sha256", oidcStateSecret)
    .update(b64)
    .digest("base64url");
  return `${b64}.${sig}`;
}

function verifyOidcPayload(raw: string | undefined): OidcStatePayload | null {
  if (!raw || typeof raw !== "string") return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = createHmac("sha256", oidcStateSecret)
    .update(b64)
    .digest("base64url");
  if (
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null;
  }
  try {
    const data: OidcStatePayload = JSON.parse(
      Buffer.from(b64, "base64url").toString("utf8"),
    );
    if (typeof data.exp !== "number" || Date.now() > data.exp) {
      console.warn("[Auth OIDC] State payload expired:", {
        exp: data.exp,
        now: Date.now(),
      });
      return null;
    }
    return {
      state: data.state,
      nonce: data.nonce,
      verifier: data.verifier,
      redirectUri: data.redirectUri,
      demoSubject: data.demoSubject,
      exp: data.exp,
    };
  } catch {
    return null;
  }
}

const oidcEncryptionKey = createHash("sha256")
  .update(oidcStateSecret + ":uay-oidc-encryption-key")
  .digest();

function encodeOidcState(payload: {
  nonce: string;
  verifier: string;
  redirectUri?: string;
  demoSubject?: string;
  exp: number;
}): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", oidcEncryptionKey, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decodeOidcState(stateStr: string): {
  nonce: string;
  verifier: string;
  redirectUri?: string;
  demoSubject?: string;
} | null {
  try {
    const raw = Buffer.from(stateStr, "base64url");
    if (raw.length < 28) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", oidcEncryptionKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const data = JSON.parse(decrypted);
    if (typeof data.exp !== "number" || Date.now() > data.exp) {
      console.warn("[Auth OIDC] Encrypted state expired:", {
        exp: data.exp,
        now: Date.now(),
      });
      return null;
    }
    return {
      nonce: data.nonce,
      verifier: data.verifier,
      redirectUri: data.redirectUri,
      demoSubject: data.demoSubject,
    };
  } catch {
    return null;
  }
}

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
function oidcServerEndpoint(endpoint: string) {
  const fixture = process.env.DEMO_INTERNAL_SSO_URL;
  if (!isDemo || !fixture) return endpoint;
  const publicUrl = new URL(endpoint);
  const publicIssuer = new URL(config.issuer);
  if (publicUrl.origin !== publicIssuer.origin) return endpoint;
  const local = new URL(fixture);
  const issuerPath = publicIssuer.pathname.replace(/\/$/, "");
  const path = publicUrl.pathname.startsWith(issuerPath)
    ? publicUrl.pathname.slice(issuerPath.length) || "/"
    : publicUrl.pathname;
  return new URL(`${path}${publicUrl.search}`, local).href;
}
function demoQuickLoginEnabled() {
  return (
    isDemo &&
    (["127.0.0.1", "localhost"].includes(new URL(config.issuer).hostname) ||
      new URL(config.issuer).origin === config.apiOrigin)
  );
}
export async function oidcMetadata() {
  if (!discovery) {
    const response = await serviceFetch(
      "sso",
      oidcServerEndpoint(`${config.issuer}/.well-known/openid-configuration`),
      {},
      { idempotent: true },
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
    jwks = createRemoteJWKSet(new URL(oidcServerEndpoint(data.jwks_uri)), {
      timeoutDuration: 3000,
    });
  }
  return discovery;
}
async function verifyAccess(token: string) {
  await oidcMetadata();
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.issuer,
    ...(config.audience ? { audience: config.audience } : {}),
    algorithms: ["RS256", "ES256"],
    requiredClaims: ["sub", "exp", "iat"],
    maxTokenAge: "15m",
    clockTolerance: 5,
  });
  const accountStatus = (payload.account_status ?? payload.status) as
    string | undefined;
  if (accountStatus) {
    ensure(accountStatus === "ACTIVE", 403, "ACCOUNT_DISABLED");
  }
  ensure(
    typeof payload.sub === "string" && payload.sub.trim().length > 0,
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
export async function fetchSsoMeProfile(
  accessToken: string,
): Promise<Record<string, any> | null> {
  if (!config.ssoApiBaseUrl) return null;
  try {
    const url = `${config.ssoApiBaseUrl.replace(/\/+$/, "")}/auth/me`;
    const res = await serviceFetch(
      "sso-api",
      url,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      { idempotent: true, attempts: 2, timeoutMs: 3500 },
    );
    if (!res.ok) return null;
    const body: any = await res.json();
    const data = body?.data ?? body;
    if (!data || typeof data !== "object") return null;
    return {
      ...(Array.isArray(data.roles) && data.roles.length > 0
        ? { roles: data.roles }
        : {}),
      ...(data.user_type ? { user_type: data.user_type } : {}),
      ...(data.status ? { account_status: data.status } : {}),
      ...(data.username
        ? { preferred_username: data.username, identifier_value: data.username }
        : {}),
    };
  } catch {
    return null;
  }
}
async function syncUser(rawClaims: JWTPayload, successfulLogin = false) {
  const claims: any = { ...rawClaims };

  // 1. Gather all possible role strings from token
  const candidateRoles: string[] = [
    ...(Array.isArray(claims.roles) ? claims.roles : []),
    ...(typeof claims.roles === "string" ? claims.roles.split(/[,\s]+/) : []),
    ...(typeof claims.role === "string" ? [claims.role] : []),
    ...(Array.isArray((rawClaims as any).realm_access?.roles)
      ? (rawClaims as any).realm_access.roles
      : []),
    ...Object.values((rawClaims as any).resource_access ?? {}).flatMap(
      (client: any) => (Array.isArray(client?.roles) ? client.roles : []),
    ),
    ...(Array.isArray((rawClaims as any).groups)
      ? (rawClaims as any).groups
      : []),
    ...(rawClaims.user_type === "ADMIN"
      ? ["SUPER_ADMIN"]
      : rawClaims.user_type === "LECTURER"
        ? ["INSTRUCTOR"]
        : rawClaims.user_type === "STAFF"
          ? ["DEPARTMENT_ADMIN"]
          : []),
    ...(Array.isArray((rawClaims as any).attributes?.roles)
      ? (rawClaims as any).attributes.roles
      : []),
    ...(typeof (rawClaims as any).attributes?.role === "string"
      ? [(rawClaims as any).attributes.role]
      : []),
  ];

  // 2. Identify candidate keys for finding the user in db.user
  const ssoUserId = String(rawClaims.sub || "");
  const username =
    (rawClaims.preferred_username as string) ||
    (rawClaims.username as string) ||
    null;
  const rawEmail = (rawClaims.email as string) || null;
  const identifierVal =
    (rawClaims.identifier_value as string) ||
    (rawClaims.student_staff_number as string) ||
    username ||
    ssoUserId;

  // Check known super-admin identifiers / emails
  const adminIdentifiers = (
    process.env.SUPER_ADMIN_IDENTIFIERS ??
    process.env.SUPER_ADMIN_USERS ??
    "admin,superadmin,admin@uay.ac.id"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAdminIdentifier =
    (username && adminIdentifiers.includes(username.toLowerCase())) ||
    (rawEmail && adminIdentifiers.includes(rawEmail.toLowerCase())) ||
    (ssoUserId && adminIdentifiers.includes(ssoUserId.toLowerCase())) ||
    (username && ["admin", "superadmin", "administrator"].includes(username.toLowerCase())) ||
    (rawEmail && ["admin@uay.ac.id", "superadmin@uay.ac.id"].includes(rawEmail.toLowerCase()));

  if (isAdminIdentifier) {
    candidateRoles.push("SUPER_ADMIN");
  }

  const validRoles = candidateRoles
    .map((r) => normalizeRole(String(r)))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const existingUser = await db.user.findFirst({
    where: {
      OR: [
        { ssoUserId },
        ...(username ? [{ username }, { identifierValue: username }] : []),
        ...(identifierVal ? [{ identifierValue: identifierVal }] : []),
        ...(rawEmail ? [{ email: rawEmail }] : []),
      ],
    },
  });

  console.log("[Auth OIDC] syncUser identity details:", {
    ssoUserId,
    username,
    email: rawEmail,
    candidateCount: candidateRoles.length,
    validRoles,
    existingUserFound: !!existingUser,
    existingUserRole: existingUser?.role,
    realmRoles: (rawClaims as any).realm_access?.roles,
    groups: (rawClaims as any).groups,
    userType: rawClaims.user_type,
  });

  // 3. Populate missing/fallback claims
  if (validRoles.length > 0) {
    claims.roles = validRoles;
    claims.role = validRoles[0];
  } else if (existingUser) {
    claims.roles = [existingUser.role];
    claims.role = existingUser.role;
    if (!claims.user_type) claims.user_type = existingUser.userType;
    if (!claims.name) claims.name = existingUser.name;
    if (!claims.email) claims.email = existingUser.email;
    if (!claims.identifier_value) claims.identifier_value = existingUser.identifierValue;
    if (!claims.department_scopes) claims.department_scopes = existingUser.departmentScopes;
  } else {
    claims.roles = ["STUDENT"];
    claims.role = "STUDENT";
  }

  if (
    !claims.name &&
    ((rawClaims as any).given_name || (rawClaims as any).family_name)
  ) {
    claims.name = [
      (rawClaims as any).given_name,
      (rawClaims as any).family_name,
    ]
      .filter(Boolean)
      .join(" ");
  }
  if (!claims.name && claims.preferred_username) {
    claims.name = claims.preferred_username;
  }
  if (!claims.name && existingUser?.name) {
    claims.name = existingUser.name;
  }
  if (!claims.name) {
    claims.name = "Pengguna UAY";
  }

  if (!claims.email || !claims.email.includes("@")) {
    claims.email =
      existingUser?.email ||
      `${String(username || ssoUserId).replace(/[^a-zA-Z0-9._-]/g, "")}@uay.ac.id`;
  }

  if (!claims.identifier_value) {
    claims.identifier_value =
      existingUser?.identifierValue ||
      claims.student_staff_number ||
      username ||
      ssoUserId;
  }

  if (!claims.department_scopes) {
    claims.department_scopes = existingUser?.departmentScopes || [];
  }

  const parsed = identityClaims.safeParse(claims);
  if (!parsed.success) {
    console.error("[Auth OIDC] Identity claims validation failed:", {
      issues: parsed.error.issues,
      claimKeys: Object.keys(rawClaims),
      sub: rawClaims.sub,
    });
  }
  ensure(parsed.success, 403, "INVALID_IDENTITY");
  const { ssoUserId: _ignoredSsoUserId, ...profile } = parsed.data;

  const data = {
    ...profile,
    // Tokens only reach this point once account_status is ACTIVE, so a
    // successful sync also re-activates a previously revoked cache row.
    status: "ACTIVE" as const,
    ...(successfulLogin ? { lastLoginAt: new Date() } : {}),
    lastActiveAt: new Date(),
  };

  return transaction(async (tx) => {
    let user;
    if (existingUser) {
      const finalRole = validRoles.length > 0 ? data.role : existingUser.role;
      const finalUserType =
        finalRole === "SUPER_ADMIN"
          ? ("ADMIN" as const)
          : rawClaims.user_type
            ? data.userType
            : existingUser.userType;
      const finalDeptScopes =
        Array.isArray(data.departmentScopes) && data.departmentScopes.length > 0
          ? data.departmentScopes
          : existingUser.departmentScopes;

      user = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          ssoUserId,
          name: data.name || existingUser.name,
          username: data.username || existingUser.username,
          email: existingUser.email || data.email,
          role: finalRole,
          userType: finalUserType,
          departmentScopes: finalDeptScopes,
          status: "ACTIVE",
          ...(successfulLogin ? { lastLoginAt: new Date() } : {}),
          lastActiveAt: new Date(),
        },
      });

      if (
        existingUser.role !== user.role ||
        existingUser.userType !== user.userType ||
        JSON.stringify(existingUser.departmentScopes) !==
          JSON.stringify(user.departmentScopes) ||
        existingUser.status !== "ACTIVE"
      ) {
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
          existingUser,
          user,
        );
      }
    } else {
      user = await tx.user.create({
        data: {
          ssoUserId,
          ...data,
          status: "ACTIVE",
          ...(successfulLogin ? { lastLoginAt: new Date() } : {}),
          lastActiveAt: new Date(),
        },
      });
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
        null,
        user,
      );
    }
    return user;
  });
}
async function tokenRequest(values: Record<string, string>) {
  const metadata = await oidcMetadata();
  const tokenEndpoint = oidcServerEndpoint(metadata.token_endpoint);
  const response = await serviceFetch(
    "sso",
    tokenEndpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        ...values,
        client_id: config.clientId,
        ...(config.clientSecret ? { client_secret: config.clientSecret } : {}),
      }),
    },
  );
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error("[Auth OIDC] Token request failed at token_endpoint:", {
      status: response.status,
      statusText: response.statusText,
      errorBody,
      sentRedirectUri: values.redirect_uri,
      clientId: config.clientId,
      hasClientSecret: Boolean(config.clientSecret),
    });
    ensure(false, 401, "SESSION_EXPIRED");
  }
  const data: any = await response.json();
  ensure(typeof data.access_token === "string", 401, "INVALID_TOKEN");
  return data;
}
async function issue(res: Response, session: Session, req?: Request) {
  const id = randomBytes(32).toString("base64url");
  await cache.set(`session:${hash(id)}`, JSON.stringify(session), 8 * 3600);
  const cookieOpts = getCookieOptions(req);
  const primaryName = getSessionCookieName(req);
  res.cookie(primaryName, id, { ...cookieOpts, maxAge: 8 * 3600000 });
  if (primaryName === "__Host-uay-session") {
    res.cookie("uay-session", id, { ...cookieOpts, maxAge: 8 * 3600000 });
  }
}
async function authorizationUrl(
  res: Response,
  demoSubject?: string,
  req?: Request,
) {
  const metadata = await oidcMetadata();
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const exp = Date.now() + 15 * 60 * 1000;
  const effectiveRedirectUri = getEffectiveRedirectUri(req);
  const state = encodeOidcState({
    nonce,
    verifier,
    redirectUri: effectiveRedirectUri,
    demoSubject,
    exp,
  });

  await cache.set(
    `oidc:${hash(state)}`,
    JSON.stringify({
      nonce,
      verifier,
      redirectUri: effectiveRedirectUri,
      demoSubject,
    }),
    900,
  );

  const cookieOpts = getCookieOptions(req);
  res.cookie("uay-oidc-state", state, { ...cookieOpts, maxAge: 900000 });

  const signedPayload = signOidcPayload({
    state,
    nonce,
    verifier,
    redirectUri: effectiveRedirectUri,
    demoSubject,
    exp,
  });
  res.cookie("uay-oidc-payload", signedPayload, {
    ...cookieOpts,
    maxAge: 900000,
  });

  const url = new URL(metadata.authorization_endpoint);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: effectiveRedirectUri,
    response_type: "code",
    scope: "openid profile email offline_access",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  if (demoSubject) url.searchParams.set("login_hint", demoSubject);
  return url.href;
}
export function registerAuth(app: Express) {
  app.get("/api/v1/auth/config", async (_req, res) => {
    const systemAcademicSettings = await getAcademicSettings();
    res.json({
      mode: config.authMode,
      demoEnabled: process.env.DEMO_MODE === "true" || isDemo,
      issuer: config.issuer,
      clientId: config.clientId,
      redirectUri: `${config.origin}/auth/callback`,
      accountUrl: config.accountUrl || undefined,
      embedOrigins: config.embedOrigins,
      academicYear: systemAcademicSettings.academicYear,
      semesterLabel: systemAcademicSettings.semesterLabel,
      academicYears: systemAcademicSettings.academicYears,
      defaultGradeScaleVersion: systemAcademicSettings.defaultGradeScaleVersion,
      minAttendancePercentage: systemAcademicSettings.minAttendancePercentage,
    });
  });
  app.get("/api/v1/auth/development-users", async (_req, res) => {
    ensure(
      (!production && config.authMode === "development") || isDemo,
      404,
      "NOT_FOUND",
    );
    res.json(
      await db.user.findMany({
        select: {
          id: true,
          name: true,
          role: true,
          identifierValue: true,
        },
        orderBy: [{ role: "asc" }, { identifierValue: "asc" }],
      }),
    );
  });
  app.post("/api/v1/auth/development-login", async (req, res) => {
    ensure(
      !production && config.authMode === "development",
      404,
      "NOT_FOUND",
    );
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);
    const user = await db.user.findUnique({ where: { id: userId } });
    ensure(user && user.status === "ACTIVE", 403, "ACCOUNT_DISABLED");
    const now = new Date();
    await db.user
      .update({
        where: { id: userId },
        data: { lastLoginAt: now, lastActiveAt: now },
      })
      .catch(() => {});
    await issue(
      res,
      {
        userId,
        expires: Date.now() + 900000,
        createdAt: Date.now(),
      },
      req,
    );
    res.json({ ok: true });
  });
  app.post("/api/v1/auth/session", async (req, res) => {
    ensure(config.authMode === "oidc" || isDemo, 503, "SSO_CONFIGURATION");
    const { accessToken, idToken, refreshToken } = z
      .object({
        accessToken: z.string().min(1),
        idToken: z.string().optional(),
        refreshToken: z.string().optional(),
      })
      .parse(req.body);

    const access = await verifyAccess(accessToken);
    let idClaims: any = {};
    if (idToken) {
      try {
        await oidcMetadata();
        const { payload } = await jwtVerify(idToken, jwks, {
          issuer: config.issuer,
          audience: config.clientId,
          algorithms: ["RS256", "ES256"],
        });
        idClaims = payload;
      } catch (e) {
        console.warn("[Auth OIDC] id_token verification skipped or failed:", e);
      }
    }

    const ssoMe = await fetchSsoMeProfile(accessToken);
    if (ssoMe?.account_status) {
      ensure(ssoMe.account_status === "ACTIVE", 403, "ACCOUNT_DISABLED");
    }

    const user = await syncUser(
      { ...idClaims, ...access, ...(ssoMe ?? {}) },
      true,
    );

    await issue(
      res,
      {
        userId: user.id,
        accessToken,
        idToken,
        refreshToken,
        expires: Number(access.exp) * 1000,
        createdAt: Date.now(),
      },
      req,
    );

    res.json({
      ok: true,
      user: {
        id: user.id,
        ssoUserId: user.ssoUserId,
        name: user.name,
        email: user.email,
        role: user.role,
        userType: user.userType,
        identifierValue: user.identifierValue,
      },
    });
  });
  app.post("/api/v1/auth/authorization", async (req, res) => {
    ensure(config.authMode === "oidc", 503, "SSO_CONFIGURATION");
    const { demoUserId } = z
      .object({ demoUserId: z.string().uuid().optional() })
      .parse(req.body);
    let demoSubject: string | undefined;
    if (demoUserId) {
      ensure(demoQuickLoginEnabled(), 404, "NOT_FOUND");
      const user = await db.user.findUnique({
        where: { id: z.string().uuid().parse(demoUserId) },
      });
      ensure(user?.status === "ACTIVE", 403, "ACCOUNT_DISABLED");
      demoSubject = user.ssoUserId;
    }
    res.json({
      authorizationUrl: await authorizationUrl(res, demoSubject, req),
    });
  });
  // Direct navigation remains available for non-JavaScript clients and legacy
  // links. The React UI uses the authorization endpoint above, so this path is
  // never left visible in the browser address bar.
  app.get("/api/v1/auth/login", async (req, res) => {
    ensure(config.authMode === "oidc", 503, "SSO_CONFIGURATION");
    const demoUserId = req.query.demoUserId;
    let demoSubject: string | undefined;
    if (demoUserId) {
      ensure(demoQuickLoginEnabled(), 404, "NOT_FOUND");
      const user = await db.user.findUnique({
        where: { id: z.string().uuid().parse(demoUserId) },
      });
      ensure(user?.status === "ACTIVE", 403, "ACCOUNT_DISABLED");
      demoSubject = user.ssoUserId;
    }
    res.redirect(await authorizationUrl(res, demoSubject, req));
  });
  app.get("/api/v1/auth/callback", async (req, res) => {
    try {
      if (req.query.error) {
        console.warn("[Auth OIDC] Callback received error from SSO provider:", {
          error: req.query.error,
          error_description: req.query.error_description,
        });
        clearAllAuthCookies(res, req);
        const errParam =
          typeof req.query.error === "string" ? req.query.error : "SSO_ERROR";
        return res.redirect(`/?auth_error=${encodeURIComponent(errParam)}`);
      }

      const { state, code } = z
        .object({ state: z.string().min(20), code: z.string().min(1) })
        .parse(req.query);

      const cookieState = req.cookies["uay-oidc-state"];
      const payloadCookie = req.cookies["uay-oidc-payload"];
      const verifiedPayload = verifyOidcPayload(payloadCookie);

      let nonce: string | undefined;
      let verifier: string | undefined;
      let redirectUri: string | undefined;
      let demoSubject: string | undefined;

      // 1. Primary path: Self-contained AES-256-GCM encrypted state
      const decodedState = decodeOidcState(state);
      if (decodedState) {
        nonce = decodedState.nonce;
        verifier = decodedState.verifier;
        redirectUri = decodedState.redirectUri;
        demoSubject = decodedState.demoSubject;
      }

      // 2. Secondary path: Server cache (Redis or in-memory)
      if (!verifier) {
        const saved = await cache.take(`oidc:${hash(state)}`);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            nonce = parsed.nonce;
            verifier = parsed.verifier;
            redirectUri = parsed.redirectUri;
            demoSubject = parsed.demoSubject;
          } catch {}
        }
      }

      // 3. Tertiary path: Signed companion cookie
      if (!verifier && verifiedPayload && verifiedPayload.state === state) {
        console.log(
          "[Auth OIDC] Cache missed; successfully recovered OIDC verification from signed payload cookie.",
        );
        nonce = verifiedPayload.nonce;
        verifier = verifiedPayload.verifier;
        redirectUri = verifiedPayload.redirectUri;
        demoSubject = verifiedPayload.demoSubject;
      }

      const stateValid = Boolean(nonce && verifier);

      if (!stateValid) {
        console.error("[Auth OIDC] Callback state verification failed:", {
          queryStatePrefix: state ? `${state.slice(0, 10)}...` : undefined,
          cookieStatePrefix: cookieState
            ? `${cookieState.slice(0, 10)}...`
            : undefined,
          hasCookieState: Boolean(cookieState),
          hasPayloadCookie: Boolean(payloadCookie),
          isDecodedState: Boolean(decodedState),
          protocol: req.protocol,
          secure: req.secure,
          xForwardedProto: req.headers["x-forwarded-proto"],
        });
      }

      const cookieOpts = getCookieOptions(req);
      res.clearCookie("uay-oidc-state", cookieOpts);
      res.clearCookie("uay-oidc-payload", cookieOpts);

      ensure(stateValid && nonce && verifier, 401, "INVALID_STATE");

      const effectiveRedirectUri =
        redirectUri || getEffectiveRedirectUri(req);

      const tokens = await tokenRequest({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        redirect_uri: effectiveRedirectUri,
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
      const ssoMe = await fetchSsoMeProfile(tokens.access_token);
      if (ssoMe?.account_status) {
        ensure(ssoMe.account_status === "ACTIVE", 403, "ACCOUNT_DISABLED");
      }
      const user = await syncUser({ ...id, ...access, ...(ssoMe ?? {}) }, true);
      await issue(
        res,
        {
          userId: user.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          idToken: tokens.id_token,
          expires: Number(access.exp) * 1000,
          createdAt: Date.now(),
        },
        req,
      );
      res.redirect(user.role === "RECTOR" ? "/rector" : "/dashboard");
    } catch (err: any) {
      console.error("[Auth OIDC] Callback processing failed:", err);
      clearAllAuthCookies(res, req);
      const code =
        err?.code ||
        (err?.name === "ZodError" ? "INVALID_CALLBACK_PARAMS" : "SESSION_EXPIRED");
      return res.redirect(`/?auth_error=${encodeURIComponent(code)}`);
    }
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
        where: { ssoUserId: subject },
      });
      if (user) {
        const after = await tx.user.update({
          where: { id: user.id },
          data: { status: "DISABLED" },
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
    const id = getSessionId(req);
    let logoutUrl: string | null = null;
    let backchannelLoggedOut = false;
    if (id) {
      const stored = await cache.take(`session:${hash(id)}`);
      if (stored && config.authMode === "oidc") {
        const session: Session = JSON.parse(stored);
        const metadata = await oidcMetadata().catch(() => null);
        if (metadata?.end_session_endpoint) {
          // 1. Attempt backchannel logout using refresh_token if available
          if (session.refreshToken) {
            try {
              const bcRes = await fetch(metadata.end_session_endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  client_id: config.clientId,
                  refresh_token: session.refreshToken,
                  ...(config.clientSecret
                    ? { client_secret: config.clientSecret }
                    : {}),
                }),
              });
              if (bcRes.ok) {
                backchannelLoggedOut = true;
              }
            } catch (err) {
              console.warn("[Auth OIDC] Backchannel logout request failed:", err);
            }
          }

          // 2. If backchannel logout didn't succeed, fallback to RP-initiated frontchannel redirect
          if (!backchannelLoggedOut) {
            const url = new URL(metadata.end_session_endpoint);
            const effectiveOrigin = getEffectiveOrigin(req);
            url.search = new URLSearchParams({
              id_token_hint: session.idToken ?? "",
              post_logout_redirect_uri: effectiveOrigin,
              client_id: config.clientId,
            }).toString();
            logoutUrl = url.href;
          }
        }
      }
    }
    clearAllAuthCookies(res, req);
    res.json({ ok: true, logoutUrl, backchannel: backchannelLoggedOut });
  });
}
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const authStarted = performance.now();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const claims = await verifyAccess(token);
        let user = await db.user.findUnique({
          where: { ssoUserId: claims.sub },
        });
        if (!user) {
          const ssoMe = await fetchSsoMeProfile(token);
          user = await syncUser({ ...claims, ...(ssoMe ?? {}) }, true);
        }
        ensure(user && user.status === "ACTIVE", 403, "ACCOUNT_DISABLED");
        (req as any).user = user;
        const now = new Date();
        if (
          !user.lastActiveAt ||
          now.getTime() - user.lastActiveAt.getTime() > 60000
        ) {
          db.user
            .update({
              where: { id: user.id },
              data: { lastActiveAt: now },
            })
            .catch(() => {});
        }
        return next();
      } catch (err: any) {
        if (err?.code === "ACCOUNT_DISABLED" || err?.status === 403) {
          return next(err);
        }
      }
    }
  }

  const id = getSessionId(req);
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
        ensure(existing?.ssoUserId === claims.sub, 401, "INVALID_IDENTITY");
        const ssoMe = await fetchSsoMeProfile(tokens.access_token);
        if (ssoMe?.account_status) {
          ensure(ssoMe.account_status === "ACTIVE", 403, "ACCOUNT_DISABLED");
        }
        await syncUser({
          ...(existing
            ? {
                name: existing.name,
                email: existing.email,
                role: existing.role,
                identifier_value: existing.identifierValue,
                user_type: existing.userType,
              }
            : {}),
          ...claims,
          ...(ssoMe ?? {}),
        });
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
  } else
    ensure(
      !production &&
        config.authMode === "development" &&
        session.expires > Date.now(),
      401,
      "SESSION_EXPIRED",
    );
  const [user] = await Promise.all([
    db.user.findUnique({ where: { id: session.userId } }),
    session.accessToken ? verifyAccess(session.accessToken) : Promise.resolve(),
  ]);
  ensure(
    user?.status === "ACTIVE" &&
      !(await cache.get(`revoked:${user?.ssoUserId}`)),
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
  const activeKey = `active:${user.id}`;
  cache.get(activeKey).then((recent) => {
    if (!recent) {
      cache.set(activeKey, "1", 60).catch(() => {});
      db.user
        .update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        })
        .catch(() => {});
    }
  }).catch(() => {});
  _res.setHeader(
    "Server-Timing",
    `auth;dur=${(performance.now() - authStarted).toFixed(1)}`,
  );
  next();
}
