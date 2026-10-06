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
  publicIssuer,
  redirectUri: configuredRedirectUri,
} = {}) {
  if (process.env.NODE_ENV === "production" && process.env.DEMO_MODE !== "true")
    throw new Error(
      "Local SSO is unavailable outside demo mode in production.",
    );
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
  const redirectUri =
    configuredRedirectUri ?? `${origin}/api/v1/auth/callback`;
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
      // Routing uses the path this server actually received. When the fixture
      // is mounted behind a proxy prefix (hosted demo serves it at
      // `${origin}/demo-sso`), `issuer` carries that prefix but `req.url` does
      // not, so a self-referencing link has to be rebuilt from `issuer` rather
      // than from `url` — `new URL("/authorize", ".../demo-sso")` drops the
      // mount path and lands on the SPA instead of the provider.
      const url = new URL(req.url, issuer);
      const publicHref = () => `${issuer}${url.pathname}${url.search}`;
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
          where: { status: "ACTIVE" },
          orderBy: [{ role: "asc" }, { identifierValue: "asc" }],
        });
        const user = users.find(
          (u) => u.ssoUserId === p.get("login_hint"),
        );
        if (!user) {
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          });
          const roleLabels = {
            RECTOR: "Rektor",
            SUPER_ADMIN: "Admin",
            DEPARTMENT_ADMIN: "Admin Prodi",
            INSTRUCTOR: "Dosen",
            STUDENT: "Mahasiswa",
          };
          const badgeClasses = {
            RECTOR: "badge-rector",
            SUPER_ADMIN: "badge-admin",
            DEPARTMENT_ADMIN: "badge-dept",
            INSTRUCTOR: "badge-instructor",
            STUDENT: "badge-student",
          };

          return res.end(
            `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SSO UAY · Akun Uji</title><style>
:root{--primary:#183d32;--primary-light:#235445;--primary-accent:#348e6c;--bg:#f3f6f4;--card-bg:#ffffff;--border:#d4e0d9;--text-muted:#576b61}
*{box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--primary);margin:0;padding:24px 16px 48px;line-height:1.5}
main{max-width:1280px;margin:0 auto}
.header-badge{display:inline-flex;align-items:center;font-size:13px;font-weight:600;color:var(--primary-light);background:#e1ece5;padding:4px 12px;border-radius:999px;margin-bottom:8px}
h1{font-size:26px;font-weight:700;margin:0 0 6px;color:#123027}
.subtitle{font-size:14px;color:var(--text-muted);margin:0 0 20px}
.controls-bar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:20px;background:white;padding:12px 16px;border-radius:14px;border:1px solid var(--border);box-shadow:0 1px 3px rgba(0,0,0,0.03)}
.search-wrapper{flex:1;min-width:240px;position:relative}
.search-input{width:100%;padding:10px 14px 10px 38px;font-size:14px;border:1px solid var(--border);border-radius:10px;background:#f8faf9;color:#123027;outline:none;transition:all .15s ease}
.search-input:focus{border-color:var(--primary-accent);background:#fff;box-shadow:0 0 0 3px rgba(52,142,108,0.15)}
.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;color:#83978c;pointer-events:none}
.filter-tabs{display:flex;flex-wrap:wrap;gap:6px}
.tab-btn{border:none;background:#eef3f0;color:#3b5046;padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s ease}
.tab-btn:hover{background:#e2ede6;color:#183d32}
.tab-btn.active{background:var(--primary);color:white}
.account-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:14px}
.account-card{display:flex;flex-direction:column;justify-content:space-between;padding:16px;background:var(--card-bg);border:1px solid var(--border);border-radius:12px;color:inherit;text-decoration:none;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
.account-card:hover,.account-card:focus-visible{transform:translateY(-2px);border-color:var(--primary-accent);box-shadow:0 6px 16px rgba(24,61,50,0.08);outline:none}
.card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px}
.user-name{font-size:15px;font-weight:700;color:#112c24;line-height:1.35}
.role-badge{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;padding:3px 8px;border-radius:6px;white-space:nowrap}
.badge-rector{background:#f3e8ff;color:#6b21a8;border:1px solid #d8b4fe}
.badge-admin{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5}
.badge-dept{background:#ffedd5;color:#9a3412;border:1px solid #fdba74}
.badge-instructor{background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe}
.badge-student{background:#dcfce7;color:#166534;border:1px solid #bbf7d0}
.card-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid #eef3f0;font-size:12px;color:var(--text-muted)}
.identifier{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:600;color:#3b5046}
.dept-scope{font-size:12px;color:#4b6156;background:#f1f5f2;padding:2px 6px;border-radius:4px}
.footer-links{margin-top:32px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding-top:16px;border-top:1px solid var(--border)}
.back-btn{display:inline-flex;align-items:center;gap:6px;color:var(--primary);text-decoration:none;font-weight:600;font-size:14px;padding:8px 14px;border-radius:8px;background:white;border:1px solid var(--border);transition:all .15s ease}
.back-btn:hover{background:#f1f6f3}
.count-info{font-size:13px;color:var(--text-muted)}
.empty-state{grid-column:1 / -1;text-align:center;padding:48px 16px;color:var(--text-muted);font-size:15px;display:none}
</style></head><body>
<main>
  <span class="header-badge">SSO UAY · Lingkungan Pengujian</span>
  <h1>Pilih akun untuk masuk</h1>
  <p class="subtitle">Tersedia ${users.length} akun pengujian lintas 4 Program Studi (Informatika, Teknik Sipil, Akuntansi, Manajemen).</p>
  
  <div class="controls-bar">
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input type="text" id="search-input" class="search-input" placeholder="Cari nama akun, NIM/NIP/NIDN, peran, atau prodi..." autocomplete="off">
    </div>
    <div class="filter-tabs">
      <button type="button" class="tab-btn active" data-filter="ALL">Semua (<span id="visible-count">${users.length}</span>)</button>
      <button type="button" class="tab-btn" data-filter="ADMIN">Pimpinan & Admin</button>
      <button type="button" class="tab-btn" data-filter="INSTRUCTOR">Dosen</button>
      <button type="button" class="tab-btn" data-filter="STUDENT">Mahasiswa</button>
    </div>
  </div>

  <div class="account-grid">
    ${users
      .map((u) => {
        const next = new URL(publicHref());
        next.searchParams.set("login_hint", u.ssoUserId);
        const roleLabel = roleLabels[u.role] || u.role;
        const badgeClass = badgeClasses[u.role] || "badge-student";
        const dept = u.departmentScopes?.[0] || "";
        const searchTerms = `${u.name} ${u.identifierValue} ${roleLabel} ${dept}`.toLowerCase();
        return `<a href="${escape(next.href)}" class="account-card" data-role="${escape(u.role)}" data-search="${escape(searchTerms)}"><div class="card-top"><span class="user-name">${escape(u.name)}</span><span class="role-badge ${badgeClass}">${escape(roleLabel)}</span></div><div class="card-bottom"><span class="identifier">${escape(u.identifierValue)}</span>${dept ? `<span class="dept-scope">${escape(dept)}</span>` : ""}</div></a>`;
      })
      .join("")}
    <div id="empty-state" class="empty-state">Tidak ada akun uji yang sesuai dengan pencarian.</div>
  </div>

  <div class="footer-links">
    <a href="${escape(origin)}" class="back-btn">← Kembali ke Beranda</a>
    <span class="count-info">Total ${users.length} identitas uji terdaftar di database</span>
  </div>
</main>
<script>
  const searchInput = document.getElementById('search-input');
  const tabs = document.querySelectorAll('.tab-btn');
  const cards = document.querySelectorAll('.account-card');
  const emptyState = document.getElementById('empty-state');
  const countEl = document.getElementById('visible-count');
  let activeTab = 'ALL';
  let searchTerm = '';

  function filterCards() {
    let count = 0;
    cards.forEach(card => {
      const role = card.getAttribute('data-role');
      const search = card.getAttribute('data-search') || '';
      let matchTab = true;
      if (activeTab === 'ADMIN') {
        matchTab = ['RECTOR', 'SUPER_ADMIN', 'DEPARTMENT_ADMIN'].includes(role);
      } else if (activeTab === 'INSTRUCTOR') {
        matchTab = role === 'INSTRUCTOR';
      } else if (activeTab === 'STUDENT') {
        matchTab = role === 'STUDENT';
      }
      const matchSearch = !searchTerm || search.includes(searchTerm);
      if (matchTab && matchSearch) {
        card.style.display = 'flex';
        count++;
      } else {
        card.style.display = 'none';
      }
    });
    if (emptyState) emptyState.style.display = count === 0 ? 'block' : 'none';
    if (countEl) countEl.textContent = count;
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      filterCards();
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-filter');
      filterCards();
    });
  });
</script>
</body></html>`,
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
        if (user?.status !== "ACTIVE") return send(400, { error: "invalid_grant" });
        const claims = {
          name: user.name,
          email: user.email,
          preferred_username: user.username ?? user.identifierValue,
          user_type: user.userType,
          identifier_type: user.identifierType,
          identifier_value: user.identifierValue,
          roles: [user.role],
          department_scopes: user.departmentScopes,
          account_status: user.status,
        };
        const sign = (extra, aud) =>
          new SignJWT({ ...claims, ...extra })
            .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
            .setIssuer(issuer)
            .setSubject(user.ssoUserId)
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
          `<html lang="id"><title>Akun SSO UAY</title><main style="font:18px system-ui;max-width:600px;margin:80px auto;padding:24px"><h1>Akun SSO UAY</h1><p>Identitas pada lingkungan uji dikelola melalui data akun demo.</p><a href="${escape(origin)}/profile">Kembali ke profil</a></main></html>`,
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
  const internalIssuer = `http://127.0.0.1:${server.address().port}`;
  issuer = publicIssuer?.replace(/\/$/, "") ?? internalIssuer;
  return {
    issuer,
    internalIssuer,
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
    clientId: process.env.SSO_CLIENT_ID ?? "elearning-uay",
    audience: process.env.SSO_AUDIENCE ?? "elearning-uay",
    publicIssuer: process.env.SSO_PUBLIC_ISSUER,
    redirectUri: process.env.SSO_REDIRECT_URI,
  });
  console.log(`Local SSO ready at ${sso.issuer}`);
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await sso.close();
      process.exit(0);
    });
}
