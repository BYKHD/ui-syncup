
# SECURITY.md

**Scope:** React (TypeScript) front‑end, Node.js (TypeScript) API, PostgreSQL. 

---

## TL;DR (Developer Checklist)

- [ ] **Zero‑trust client:** Never authorize in the UI; all authorization on the server.
- [ ] **Sessions/JWT:** Use short‑lived tokens, rotate, and store session identifiers in **httpOnly, secure** cookies.
- [ ] **Input validation:** Zod (or equivalent) at **every** boundary (env, request params, query/body, webhooks).
- [ ] **CORS & CSRF:** Closed CORS by default; validate `Origin/Referer` or use anti‑CSRF tokens for cookie‑based auth.
- [ ] **Headers & CSP:** HSTS, X‑Content‑Type‑Options, X‑Frame‑Options, Referrer‑Policy, Permissions‑Policy, strict CSP.
- [ ] **Rate limit & body caps:** Cap request sizes, enable rate limit on login/signup/webhooks/exports.
- [ ] **Secrets:** .env per environment, validated at boot; use a secret manager in staging/prod.
- [ ] **PostgreSQL:** Least‑privilege roles, TLS to DB, parameterized queries, RLS for multi‑tenant data.
- [ ] **DoS hardening:** Reverse proxy/WAF in front; Node timeouts tuned; avoid heavy work on request path.
- [ ] **Logs & errors:** No stack traces or secrets to clients; structured logs with PII scrubbing.
- [ ] **Supply chain:** Lockfile committed; `npm ci --ignore-scripts` in CI; automated dependency scanning.
- [ ] **Backups & migrations:** Tested backups, PITR where possible; migrations reviewed via PR.

---

## 1) Architecture & Threat Model

**Assumptions**
- Public React SPA served via CDN or static host.
- API behind reverse proxy (e.g., Nginx/Cloudflare/ALB).
- PostgreSQL in a private network; connections only from API and admin bastion.
- Attacker can control any request payload and browser state.

**Goals**
- Prevent data leaks, auth bypass, tenant‑isolation breaks, supply‑chain compromise, and DoS.

---

## 2) Authentication & Session Management

- **Session cookies** (recommended for browser apps):
  - `httpOnly`, `secure`, `sameSite=strict` (or `lax` if you need cross‑site flows), `Path=/`.
  - Store only a **random session ID**; map to server‑side session in DB/Redis. Rotate on privilege change/login.
- **JWT (if required)**:
  - Short expiry (≤15m) and refresh tokens in `httpOnly` cookie; rotate refresh tokens on each use.
  - Use asymmetric signing (`RS256/EdDSA`); pin accepted `kid`s; reject unknown algorithms.
- **CSRF** (cookie sessions):
  - Validate **Origin/Referer** on state‑changing requests **and/or** use a CSRF token (double‑submit or synchronizer token).
- **Password hashing**:
  - `argon2id` (preferred) or `scrypt` with strong params; always use per‑user salt and pepper from secret storage.
- **MFA / device bind** (optional but recommended for admins).

---

## 3) Authorization (RBAC/ABAC)

- Centralize roles & permissions (e.g., `src/config/roles.ts`).
- Guard **every** handler on the server; the client can only hide UI affordances.
- For multi‑tenant data, prefer **PostgreSQL Row‑Level Security (RLS)** to prevent cross‑tenant access even on query bugs.

**RLS example (tenant isolation):**
```sql
-- Table has tenant_id column; enable RLS
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.issues
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

At connection time, set `app.tenant_id` based on the verified session and use a dedicated **least‑privilege role**.

---

## 4) Input Validation & Output Encoding

- Validate **all** incoming data with Zod: params, query, JSON, form, files, and third‑party webhooks.
- Prefer `safeParse` and return 400 with machine‑readable error details.
- React safely escapes HTML; avoid `dangerouslySetInnerHTML`. If rendering user HTML, sanitize (e.g., DOMPurify) and allowlist tags/attributes.

---

## 5) API Server (Express/Fastify/Nest)

- **Limits**: request body cap (e.g., 5–10MB), timeouts, and concurrency caps.
- **Rate limiting**: token‑bucket per IP + user + route; stricter on auth endpoints.
- **Security headers**: set via Helmet (Express) or appropriate hooks (Fastify). See **Headers & CSP**.
- **Uploads**: stream to object storage; validate MIME/extension; generate new filenames; virus scan if accepting untrusted files.
- **Errors**: generic messages for clients; map to `4xx/5xx` appropriately; never expose stack traces in prod.
- **Background jobs**: offload heavy work to queues (BullMQ/RSMQ/SQS) to keep request paths fast.

**Fastify baseline (TypeScript):**
```ts
import Fastify from "fastify";
import fastifyHelmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

const app = Fastify({ trustProxy: true, bodyLimit: 10 * 1024 * 1024 });

await app.register(fastifyHelmet, {
  contentSecurityPolicy: false, // manage CSP manually if you need nonces/hashes
  crossOriginEmbedderPolicy: true,
});
await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

app.addHook("onRequest", async (req, res) => {
  // Enforce Origin/Referer on state-changing requests
  if (["POST","PUT","PATCH","DELETE"].includes(req.method)) {
    const origin = req.headers.origin || "";
    const referer = req.headers.referer || "";
    const host = req.headers.host || "";
    const ok = [origin, referer].filter(Boolean).every(u => new URL(u).host === host);
    if (!ok) return res.code(403).send({ error: "CSRF blocked" });
  }
});
```

---

## 6) CORS

- Default **deny**. Allow only known origins (e.g., your SPA and admin).  
- Set `credentials: true` only when needed; never combine `Access-Control-Allow-Origin: *` with cookies.

---

## 7) HTTP Security Headers & CSP

Set globally at the proxy/API and at the static host for the SPA:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**CSP (SPA production baseline):**
```
default-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
img-src 'self' data: https:;
connect-src 'self' https:;
script-src 'self';
style-src 'self' 'unsafe-inline';
```
Use nonces/hashes if you must allow inline scripts; extend `connect-src` for your API/telemetry endpoints.

---

## 8) PostgreSQL Security

- **Network:** private subnet; TLS required (`sslmode=require`) from API.  
- **Roles:** distinct roles per environment and per access pattern (`app_rw`, `app_ro`, `migration`). Deny `SUPERUSER`.  
- **Least privilege:** grant only needed privileges per schema/table; revoke defaults.  
- **RLS:** enable for multi‑tenant tables. Prefer security **barrier views** if needed.  
- **Queries:** parameterized/prepared statements (ORMs like Drizzle/Prisma do this by default).  
- **Timeouts:** set `statement_timeout` (e.g., 5–10s) and `idle_in_transaction_session_timeout` (e.g., 30s).  
- **Pooling:** use PgBouncer in transaction mode; keep Node pool small to avoid exhausting DB.  
- **Backups:** automated daily + PITR; test restore regularly.  
- **Migrations:** stored in `migrations/` or `drizzle/`, peer‑reviewed, and idempotent.  
- **Auditing:** log DDL and failed login attempts; consider pgaudit if available.

**Node PG (ssl + statement timeout):**
```ts
import { Pool } from "pg";
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  statement_timeout: 10_000,
  idle_in_transaction_session_timeout: 30_000,
  max: 10,
});
```

---

## 9) Secrets & Configuration

- Validate env at boot with Zod; crash fast on missing/invalid values.
- Separate `.env.local`, `.env.test`, `.env.production`; never commit real secrets.
- Prefer a secret manager (e.g., AWS SSM/Secrets Manager, GCP Secret Manager, 1Password) for staging/prod.
- Rotate keys periodically; remove unused secrets promptly.

**Env schema (TypeScript + Zod):**
```ts
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development","test","production"]),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url(),
});
export const env = Env.parse(process.env);
```

---

## 10) Files & Uploads

- Validate size and MIME; block executables.  
- Strip metadata for images where privacy matters.  
- Store on object storage (S3/GCS) with short‑lived signed URLs; do **not** proxy raw uploads through the API if avoidable.

---

## 11) Logging, Monitoring, and Errors

- Structured logs (JSON) with correlation IDs.  
- Scrub PII and secrets in logs.  
- Centralize (Datadog, ELK, OpenTelemetry).  
- Client‑facing errors are generic; server logs get the details.  
- Alerts for spikes in 401/403/429/5xx, login failures, and DB errors.

---

## 12) DoS & Operational Hardening

- **Reverse proxy/WAF** in front; basic bot management if available.  
- Tune Node: `requestTimeout`, `headersTimeout`, `keepAliveTimeout`; cap concurrent sockets.  
- Use containers with a non‑root user; read‑only FS if possible; seccomp/apparmor profiles where supported.  
- Resource limits (CPU/mem) and graceful shutdown with health checks.  
- Queue long‑running tasks; avoid synchronous crypto/CPU hot‑paths on requests.

---

## 13) Dependency & Supply‑Chain Security

- Commit lockfile; use `npm ci --ignore-scripts` in CI.  
- Dependabot/Renovate for updates; `npm audit`/OSS Index in CI.  
- Pin transitive risk (e.g., resolutions) when needed; avoid abandoned libs.  
- If publishing packages, use `"files"` allow‑list and `npm publish --dry-run` to verify bundle contents.

---

## 14) Testing & Review

- **Unit & integration** tests for auth, validation, RLS policies.  
- **E2E** tests on preview (Playwright/Cypress).  
- **DAST** on staging for auth flows.  
- **Periodic** reviews against OWASP ASVS and company policy.

---

## 15) Incident Response

- Keep an on‑call rotation and runbooks for: data leak, credential theft, auth bypass, and DoS.  
- Log preservation and legal/notification workflows documented.  
- Post‑mortems with action items and deadlines.

---

## Appendix: Useful Snippets

**Express baseline (TypeScript):**
```ts
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));
```

**Zod route validation helper:**
```ts
import { z } from "zod";
export const schema = z.object({ title: z.string().min(1), priority: z.enum(["low","medium","high","critical"]) });

app.post("/api/issues", (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // ...
});
```

**Cookie flags (session):**
```ts
res.cookie("sid", session.id, {
  httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 1000
});
```

---

### Ownership

- **Security owner:** Tech Lead / Platform Team  
- **Review cadence:** Quarterly and after major upgrades  
- **Change process:** PR + Security Review + Rollout plan
