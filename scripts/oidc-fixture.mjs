// Local identity provider: exercises the same OIDC adapter used in production.
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

export async function startMockSso({
  port = 4402,
  origin = "http://127.0.0.1:5173",
  clientId = "elearning-uay",
  audience = "elearning-uay",
} = {}) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Local SSO is unavailable in production.");
  const db = new PrismaClient();
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = {
    ...(await exportJWK(publicKey)),
    kid: "local-uay",
    alg: "RS256",
    use: "sig",
  };
  const codes = new Map(),
    refreshes = new Map();
  let issuer;
  const redirectUri = `${origin}/api/v1/auth/callback`;
  const escape = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const server = createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    const redirect = (url) => {
      res.writeHead(302, { Location: url, "Cache-Control": "no-store" });
      res.end();
    };
    try {
      const url = new URL(req.url, issuer);
      for (const map of [codes, refreshes])
        for (const [key, value] of map)
          if (value.expires < Date.now()) map.delete(key);
      if (url.pathname === "/.well-known/openid-configuration")
        return send(200, {
          issuer,
          authorization_endpoint: `${issuer}/authorize`,
          token_endpoint: `${issuer}/token`,
          jwks_uri: `${issuer}/jwks`,
          end_session_endpoint: `${issuer}/logout`,
          response_types_supported: ["code"],
          subject_types_supported: ["public"],
          id_token_signing_alg_values_supported: ["RS256"],
          code_challenge_methods_supported: ["S256"],
        });
      if (url.pathname === "/jwks") return send(200, { keys: [jwk] });
      if (url.pathname === "/logout") return redirect(origin);
      if (url.pathname === "/authorize") {
        const p = url.searchParams;
        if (
          p.get("client_id") !== clientId ||
          p.get("redirect_uri") !== redirectUri ||
          p.get("response_type") !== "code" ||
          p.get("code_challenge_method") !== "S256" ||
          !p.get("state") ||
          !p.get("nonce") ||
          !p.get("code_challenge")
        )
          return send(400, { error: "invalid_request" });
        const users = await db.user.findMany({
          where: { isActive: true },
          orderBy: { role: "asc" },
        });
        const user = users.find(
          (u) => u.externalSubjectId === p.get("login_hint"),
        );
        if (!user) {
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          });
          return res.end(
            `<!doctype html><html lang="id"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SSO UAY · Akun uji</title><style>body{font:16px system-ui;background:#f4f7f5;color:#183d32;margin:0;padding:32px}main{max-width:720px;margin:5vh auto}a{display:block;padding:18px;margin:12px 0;background:white;border:1px solid #cbd8d0;border-radius:12px;color:inherit;text-decoration:none}a:hover,a:focus{outline:3px solid #62977b}small{display:block;margin-top:6px;color:#52665a}p{line-height:1.7}</style><main><small>SSO UAY · Lingkungan pengujian lokal</small><h1>Pilih akun untuk masuk</h1><p>Gunakan identitas uji berikut untuk mengakses ruang pembelajaran.</p>${users
              .map((u) => {
                const next = new URL(url);
                next.searchParams.set("login_hint", u.externalSubjectId);
                return `<a href="${escape(next.href)}"><strong>${escape(u.fullName)}</strong><small>${escape(u.studentStaffNumber)} · ${escape({ SUPER_ADMIN: "Admin", DEPARTMENT_ADMIN: "Admin Prodi", INSTRUCTOR: "Dosen", STUDENT: "Mahasiswa" }[u.role])}</small></a>`;
              })
              .join(
                "",
              )}<a href="${escape(origin)}">Kembali ke beranda</a></main></html>`,
          );
        }
        const code = randomBytes(32).toString("base64url");
        codes.set(code, {
          userId: user.id,
          nonce: p.get("nonce"),
          challenge: p.get("code_challenge"),
          expires: Date.now() + 60000,
        });
        const callback = new URL(redirectUri);
        callback.searchParams.set("code", code);
        callback.searchParams.set("state", p.get("state"));
        return redirect(callback.href);
      }
      if (url.pathname === "/token" && req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const p = new URLSearchParams(Buffer.concat(chunks).toString());
        if (p.get("client_id") !== clientId)
          return send(400, { error: "invalid_client" });
        let grant;
        if (p.get("grant_type") === "authorization_code") {
          grant = codes.get(p.get("code"));
          codes.delete(p.get("code"));
          if (
            !grant ||
            p.get("redirect_uri") !== redirectUri ||
            createHash("sha256")
              .update(p.get("code_verifier") ?? "")
              .digest("base64url") !== grant.challenge
          )
            return send(400, { error: "invalid_grant" });
        } else if (p.get("grant_type") === "refresh_token") {
          grant = refreshes.get(p.get("refresh_token"));
          refreshes.delete(p.get("refresh_token"));
        }
        if (!grant) return send(400, { error: "invalid_grant" });
        const user = await db.user.findUnique({ where: { id: grant.userId } });
        if (!user?.isActive) return send(400, { error: "invalid_grant" });
        const claims = {
          name: user.fullName,
          email: user.email,
          student_staff_number: user.studentStaffNumber,
          role: user.role,
          department_scopes: user.departmentScopes,
          account_status: "ACTIVE",
        };
        const sign = (extra, aud) =>
          new SignJWT({ ...claims, ...extra })
            .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
            .setIssuer(issuer)
            .setSubject(user.externalSubjectId)
            .setAudience(aud)
            .setIssuedAt()
            .setExpirationTime("15m")
            .sign(privateKey);
        const refresh = randomBytes(32).toString("base64url");
        refreshes.set(refresh, {
          userId: user.id,
          expires: Date.now() + 8 * 3600000,
        });
        return send(200, {
          access_token: await sign({}, audience),
          id_token: await sign({ nonce: grant.nonce }, clientId),
          refresh_token: refresh,
          token_type: "Bearer",
          expires_in: 900,
        });
      }
      if (url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(
          `<html lang="id"><title>Akun SSO UAY</title><main style="font:18px system-ui;max-width:600px;margin:80px auto;padding:24px"><h1>Akun SSO UAY</h1><p>Identitas pada lingkungan uji dikelola melalui data akun demo.</p><a href="${escape(origin)}/#/profile">Kembali ke profil</a></main></html>`,
        );
      }
      send(404, { error: "not_found" });
    } catch {
      send(500, { error: "sso_unavailable" });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  issuer = `http://127.0.0.1:${server.address().port}`;
  return {
    issuer,
    close: async () => {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
      await db.$disconnect();
    },
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const sso = await startMockSso({
    port: Number(process.env.SSO_MOCK_PORT ?? 4402),
    origin: process.env.APP_ORIGIN,
  });
  console.log(`Local SSO ready at ${sso.issuer}`);
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await sso.close();
      process.exit(0);
    });
}
