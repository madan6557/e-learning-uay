# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm ci && npm run db:generate   # first-time setup
npm run dev                     # full local stack (see "Local topology")
npm run check                   # build web + API, then domain tests
npm test                        # domain tests only (fast, no database)
npm run test:integration        # real HTTP + PostgreSQL, separate _test database
npm audit
```

Single test file, and a single test by name:

```bash
npx tsx --test tests/domain.test.ts
npx tsx --test --test-name-pattern "video" tests/domain.test.ts
```

A single integration test needs the same environment the runner sets:

```bash
DATABASE_URL="postgresql://uay:uay_local_only@127.0.0.1:55432/elearning_test?schema=public" \
AUTH_MODE=development APP_ORIGIN=http://127.0.0.1:5173 NODE_ENV=test \
npx tsx --test tests/integration/learning.test.ts
```

Integration tests require PostgreSQL running (`npm run dev` or `npm run db:local` in another
terminal) and refuse any `TEST_DATABASE_URL` whose database name does not end in `_test`.

**On Windows**, `db:generate` and `build` fail with `EPERM ... query_engine-windows.dll.node`
while the API is running. Stop the dev stack first (`taskkill /F /IM node.exe`).

## Local topology

`npm run dev` starts four processes and is the only supported way to run locally:

| Process | Port | Notes |
| --- | --- | --- |
| Vite | 5173 | proxies `/api` → 3000 |
| Express API | 3000 | |
| File Service fixture | 3001 | `scripts/file-service.mjs`, **simulates** virus scanning |
| OIDC provider fixture | 4402 | `scripts/oidc-fixture.mjs`, issues real signed JWTs |
| Embedded PostgreSQL 16 | 55432 | `scripts/database.mjs`, data persists in `.local/postgres` |

The launcher forces `AUTH_MODE=oidc` regardless of `.env`, so the demo account picker goes
through the same authorization-code + PKCE + JWKS path as real SSO. Use `127.0.0.1`
consistently — `localhost` breaks origin, cookie and upload matching.

## Service boundary

Three systems, strictly separated — this drives most design decisions:

- **UAY SSO** owns identity and credentials. E-Learning stores an identity *cache* with no
  passwords and never creates, edits or deletes accounts.
- **File Service** owns every binary. The API stores only verified IDs and metadata
  (zero-binary storage); browsers upload and download directly via signed URLs.
- **E-Learning** owns the academic domain: courses, classes, content, assessment, grades.

## Identity and the SSO contract

`packages/shared/src/sso.ts` is the single source of truth for the claim contract. It accepts
SSO-shaped claim names and legacy aliases (`role`, `student_staff_number`) so the issuer and
this service can migrate independently. Change claim handling there, not in `auth.ts`.

Identity columns are named after their SSO counterparts one-for-one (`sso_user_id`, `name`,
`username`, `user_type`, `identifier_type`, `identifier_value`, `status`), and `UserType`,
`UserStatus` and `IdentifierType` carry the same values as SSO. The full mapping, including
deliberate deviations from the design document, is in `docs/contracts/SSO-DATA-MAPPING.md`.

`User.id` is a local surrogate key, **not** the SSO subject — that is `ssoUserId`. Keep them
distinct so a re-issued directory record cannot rewrite academic foreign keys.

Account revocation is three-tier: the `account_status` claim on every request, a fresh check
at refresh, and a Redis blacklist fed by the `POST /api/v1/auth/revocations` webhook.

## Database naming — two deliberate layers

- Prisma models are `PascalCase` with `camelCase` fields (Technical Design v4.0 §6.3).
- Physical PostgreSQL is `snake_case` with `<entity>_id` keys (the SSO convention).

`@map` / `@@map` bridge them. **Every new field and model needs both**, or the two layers
drift. Verify with:

```bash
npx prisma migrate diff --from-schema-datasource packages/db/prisma/schema.prisma \
  --to-schema-datamodel packages/db/prisma/schema.prisma --script
```

Expected output is only the hand-written foreign keys from `202609110002_invariants`
(`file_class_fk`, `resource_progress_user_fk`, …) — those live outside the Prisma model on
purpose. Anything else is real drift.

Never edit an applied migration; its checksum change breaks `migrate deploy` on deployed
databases. Add a new one.

## Request pipeline

Middleware order in `apps/api/src/index.ts`: helmet → CORS/origin allowlist → JSON body
(raw body kept for webhook HMAC) → cookies → rate limit (5/s auth, 30/s otherwise) →
origin check on every non-GET except the SSO webhook → `registerAuth` → `authenticate`
guards everything under `/api/v1` → feature routers.

All errors become `{ error: { code, details?, requestId } }`; the frontend maps `code` to
Indonesian text via `packages/shared/src/id.json`. Throw `HttpError(status, code)` or use
`ensure(cond, status, code)` rather than crafting responses.

### Writes

Every mutation goes through `mutate(req, fn)` in `core.ts`, which:

- **requires** an `Idempotency-Key` header (16–100 chars) — `api()` in `apps/web/src/lib.tsx`
  generates one and reuses it when a response was lost, so retries cannot double-submit;
- replays the stored result on repeat, and returns 409 if the same key arrives with a
  different request hash;
- runs inside a `Serializable` transaction that retries P2034/P2002 up to three times.

`audit_logs` is append-only, enforced by a database trigger. UPDATE and DELETE raise. The
column vocabulary mirrors SSO `audit_events`.

### Authorization

`classAccess(tx, user, classId, write, studentWrite)` is the gate for anything class-scoped:
it resolves course, instructors and the caller's enrolment, rejects draft classes for
students, blocks writes on archived classes (423), and returns `canManage`. `itemAccess`
layers section lookup plus `available()` on top — `available()` enforces `isVisible` and the
from/until window and is skipped for managers. Department admins are additionally scoped by
`canManageDepartment` against `user.departmentScopes`.

### Cross-service calls

`serviceFetch(service, url, init, { idempotent })` in `core.ts` implements Technical Design
§2.4 for both SSO and File Service: 3 s timeout, three exponential-backoff attempts for
idempotent calls, 30 s circuit breaker after three consecutive failures. Authorization-code
exchange passes `idempotent: false` because the code is single-use. Any 5xx is reported as an
outage, never as the upstream's answer.

### Background work

`runScheduledWork()` runs every 5 s in-process (non-overlapping): expires quiz attempts,
publishes scheduled quiz results, and fans out scheduled announcements.

## Frontend

Hash router in `apps/web/src/main.tsx` — there is no router library; `PublicShell` and
`AuthShell` are separate trees and the sidebar never renders for signed-out visitors.
`ErrorBoundary` wraps page content so a render fault cannot blank the application.

`useLocalDraft` + `drafts.ts` persist editor state to IndexedDB per user, route and entity
(14-day TTL, 15 MiB quota), with navigation guards and explicit recover/discard. Server time
and submission acceptance remain server-authoritative; local drafts never extend a quiz.

Heavy dependencies (PDF.js, ExcelJS, the assessment pages) are lazy-loaded — keep them out of
the main bundle.

## Design system

Tokens in `apps/web/src/styles.css` are copied verbatim from the UAY SSO console
(`UAY-System/SSO`, `apps/admin/src/styles.css`) so both apps render one environment: primary
`oklch(0.44 0.106 250)`, Inter Tight + IBM Plex Mono, `0.5rem` radius. Use the tokens rather
than new literals. `--warning-on-soft` and `--neutral-on-soft` exist because SSO's own text
pairing on soft fills falls just under WCAG AA; use them for text on `*-soft` fills.

Dark mode is intentionally off — the SSO console defines `.dark` tokens but ships no theme
switch, so enabling it here would split the two apps.

Do not set `color` on `h1`–`h4` globally; headings must inherit so they stay legible on dark
surfaces such as the welcome panel.

## Language convention

Code, schema, Zod validators and comments are English (§6.3). Indonesian appears only in
`packages/shared/src/id.json` and in the documents under `docs/`. Add user-facing strings to
`id.json`, never inline.

## Deployment

Vercel serves the web build and proxies `/api/*` through `api/proxy.js` so session cookies
stay same-origin; Railway runs the API container, which applies migrations and (in demo mode)
seeds during the pre-deploy step. `deployment/` holds the VPS Docker/Nginx path. `DEMO_MODE`
gates the OIDC and File Service fixtures; with it off, real SSO, Redis, File Service and
webhook configuration become mandatory and the API refuses to boot without them.

---

An OpenAI Codex config exists at `~/.codex/config.toml`. Reply `/import` to scan and list what
can be imported (MCP servers, slash commands, subagents, skills, instructions), then
`/import --yes=<digest>` using the digest the scan prints. If `/import` is unavailable on this
surface, run `claude import` from a terminal instead.
