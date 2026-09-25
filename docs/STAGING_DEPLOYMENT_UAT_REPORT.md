# BHAIRAVA Staging Deployment + UAT Report

**Date (IST):** 2026-09-25 15:43:49 Asia/Calcutta (original local UAT)  
**Follow-up (cloud agent):** 2026-09-25 — BigInt serialization + agent booking attribution fixes  
**Branch tip:** `bad50c6` (`feat/production-platform`) — BigInt JSON + agent booking attribution fixes  
**PR:** https://github.com/BadhulaVijaybhaskar/bhairava-App/pull/10 — **OPEN / NOT MERGED**  
**RC tag:** `bhairava-production-rc1` @ `e29ec71`  
**Machine:** Windows (Vijay) — local isolated staging; cloud agent verified unit/API tests only  

## Executive verdict

| Gate | Result |
|------|--------|
| Staging stack green for UAT (local isolated) | **YES** (prior run) |
| Full checklist executed | **YES** (47/47 automated UAT steps pass after signed-URL + resale retries) |
| Documents list BigInt 500 (code fix) | **FIXED IN CODE** — staging re-verify still required on isolated stack |
| Agent booking attribution (code fix) | **FIXED IN CODE** — staging re-verify still required |
| Public DNS / managed hosting | **BLOCKED BY EXTERNAL CREDENTIAL / DNS** |
| Production promotion from this staging | **CONDITIONAL NO** — technically healthy as *local* staging; **not** approved as internet-facing staging, and PR must stay unmerged until explicit production authorization |
| Staging promotion readiness (local UAT evidence) | **CONDITIONAL YES (local-only)** — re-run UAT after pulling tip with BigInt/attribution fixes |

**Do not merge PR #10. Do not deploy production. Do not publish stores.**

---

## A. Staging architecture (isolated from DEV)

| Resource | Staging | Dev (untouched) |
|----------|---------|-----------------|
| Compose project | `bhairava-staging` | `infrastructure` |
| Network | `bhairava_staging_net` | default compose network |
| Volumes | `bhairava_staging_{pg,redis,minio}` | `bhairava_{pg,minio}` |
| Postgres | `127.0.0.1:15432` / DB `bhairava_staging` / user `bhairava_stg` | `:5432` / `bhairava` |
| Redis | `127.0.0.1:16379` (password-protected) | `:6379` |
| MinIO | `127.0.0.1:19000` API / `:19001` console / bucket `bhairava-staging` | `:9000/:9001` / `bhairava` |
| API | `http://127.0.0.1:14000/api` (host Node process + staging env) | existing host/dev ports |
| Worker | host Node process → staging Redis/DB | n/a / separate |
| Admin / Agent / Customer web targets | `14173` / `14174` / `14175` (CORS allowlist; builds verified) | `5173/5174/5175` |

**Compose file (committed):** `infrastructure/docker-compose.staging.yml`  
**Secrets (gitignored):** `.env.staging.local`, `artifacts/staging/credentials.md`  
**Harness:** `scripts/staging/`

API/Worker ran as **host processes** bound to staging infra containers (profile `full` Docker image build deferred). Secrets are unique staging values — **not** `minioadmin`, **not** `Demo@12345`, **not** shared JWT/PII with `.env.development`.

---

## URLs

| Surface | URL | Notes |
|---------|-----|-------|
| API | http://127.0.0.1:14000/api | Local staging |
| Health | http://127.0.0.1:14000/api/health | `status=ok` |
| Ready | http://127.0.0.1:14000/api/ready | DB+Redis up |
| MinIO API | http://127.0.0.1:19000 | Bucket `bhairava-staging` |
| MinIO console | http://127.0.0.1:19001 | |
| Admin web | http://127.0.0.1:14173 | CORS allowlisted; production build OK |
| Agent web | http://127.0.0.1:14174 | CORS allowlisted; production build OK |
| Customer web | http://127.0.0.1:14175 | CORS allowlisted; production build OK |
| Public admin/agent/customer/api hostnames | — | **BLOCKED BY EXTERNAL CREDENTIAL / DNS** |

---

## B. Database

- `prisma migrate deploy` → applied `20260924120000_init`; status **up to date**
- DB name `bhairava_staging` isolated
- Seed approach: **founder bootstrap + synthetic UAT fixtures** (no demo seed password)

## C. Founder bootstrap

- `ALLOW_FOUNDER_BOOTSTRAP=yes` + strong staging-only password
- `Demo@12345` / `Demo@12345` rejected by bootstrap guard — **PASS**
- Org `BHAIRAVA-STG` + FOUNDER user created; company settings include `mustRotateFounderPassword`
- Audit trail present (`audit_logs` ≥ 1 after fixtures)

## D. Domains / cookies / CORS

- Public DNS: **BLOCKED BY EXTERNAL CREDENTIAL / DNS**
- CORS allowlist = localhost staging web origins only; unknown origin `evil.example.com` → no ACAO — **PASS**
- `COOKIE_SECURE=false` + `COOKIE_SAMESITE=lax` via **staging-specific env** for HTTP localhost only (documented limitation; production path still requires Secure cookies / HTTPS)

## E. Object storage

- Staging bucket `bhairava-staging` created
- Document create **201**
- Signed download `GET /api/documents/:id/download` → MinIO presigned URL — **PASS**
- ~~Note: `GET /api/documents` list currently can 500 with `Do not know how to serialize a BigInt`~~ → **FIXED IN CODE** (see §O). Staging re-verification of `GET /api/documents` still pending on the isolated stack.

## F. Worker / reservation expiry

- Worker running (60s sweep)
- Flow: AVAILABLE → RESERVED → force `expiresAt` past → worker → AVAILABLE + `EXPIRED` — **PASS** (~20s)
- `plot_status_history` rows written — **PASS**

## G. Security negatives (all server-side fails)

| Case | Result |
|------|--------|
| Unauthenticated protected route | 401 |
| Invalid refresh | 401 |
| Viewer mutation | 403 |
| Finance → project setup | 403 |
| Agent → plot master create | 403 |
| Agent1 ↔ Agent2 customer isolation | PASS (no overlap; cross-id 404) |
| Customer → INTERNAL document | 404 |
| Customer1 → Customer2 booking | 404 |
| Agent → other agent booking | 404 |
| Receipt PDF unauth | 401 |
| Receipt PDF other customer | 404 |

## H. Full UAT Founder→Resale

Automated path exercised: lead → reserve → book → pay → receipt PDF → registration → resale (**201** on corrected payload).  
Agent/customer booking list visibility: customer sees own booking; agent list previously returned 0 (missing `booking.agentId` on create). **Code fix:** agent create auto-sets `agentId`; list matches `booking.agentId` OR `customer.agentId`; PII projected server-side. Staging re-verify of agent list count / Agent1↔Agent2 isolation still pending.

## I. Mobile against staging

- `apps/*-mobile/.env.staging` → `EXPO_PUBLIC_API_URL=http://127.0.0.1:14000/api` (gitignored pattern)
- `tsc --noEmit` agent-mobile + customer-mobile — **exit 0**
- No store signing / EAS — **BLOCKED BY EXTERNAL CREDENTIAL** (by design)

## J. Receipt PDF

- `GET /api/receipts/:id/pdf` authenticated finance — **200**, PDF bytes ~2268, `%PDF` magic
- Unauthorized / other customer blocked — **PASS**

## K. Observability

- `/health` ok, `/ready` db+redis up, worker queue note present
- Request correlation / timestamps present; secrets not echoed in health payloads

## L. Backup / restore

- `pg_dump -Fc` staging → `artifacts/staging/bhairava_staging.dump` (gitignored)
- Restore into `bhairava_staging_restore` → **8 users** verified
- Object storage recovery: re-point `S3_*` to staging MinIO + restore bucket objects from MinIO versioning/backup (bucket isolated; document recovery procedure remains ops runbook)

## M. Final gates (tip `5bf7eee` / staging where applicable; code fixes land on later tip)

| Gate | Result |
|------|--------|
| Secret scan | `ok: true`, `blockedCount: 0` (informational findings only) |
| Domain tests | 14/14 pass (re-verified cloud) |
| API tests | **66/66 pass** (13 suites) — was 49/49; added BigInt serializer + booking attribution suites |
| Admin/Agent/Customer web production builds | all **green** (prior local UAT) |
| Expo/agent+customer `tsc --noEmit` | **green** (prior) |
| Automated staging UAT | **47 pass / 0 fail** (prior tip); **re-run required** after BigInt/attribution tip |
| API `nest build` | **green** (cloud, this tip) |

## N. Test identities (names only — passwords in gitignored credentials file)

Founder, Admin, Finance, Viewer, Agent1, Agent2, Customer1, Customer2 — emails `*@staging.bhairava.local`.  
Credentials path (local only): `artifacts/staging/credentials.md` and `.env.staging.local`.

## Blockers

1. **Public DNS / TLS / hosting credentials** — local HTTP staging only  
2. **Email / SMS / WhatsApp / Push providers** — BLOCKED BY EXTERNAL CREDENTIAL  
3. **Mobile store signing / EAS** — BLOCKED BY EXTERNAL CREDENTIAL  
4. ~~Documents list BigInt serialization 500~~ — **fixed in code**; **local staging re-verify still required**  
5. ~~Agent booking list attribution~~ — **fixed in code**; **local staging re-verify still required**  

## O. Post-UAT defect fixes (cloud agent — unit/API tests only)

### O.1 Documents list BigInt HTTP 500 — root cause

- **Exact cause:** Prisma maps PostgreSQL `BigInt` columns to JavaScript `bigint`. `DocumentsService.list()` returned rows including `sizeBytes` as raw `bigint`. Nest/Express `JSON.stringify` then threw `TypeError: Do not know how to serialize a BigInt` → HTTP 500.
- **Create/replace** paths already coerced `sizeBytes` (previously via `Number(...)`); **list** and **verify** did not.
- **Fix approach:** API-wide response boundary — `BigIntJsonInterceptor` (`APP_INTERCEPTOR`) recursively converts every `bigint` to a **decimal string** (preserves precision beyond `Number.MAX_SAFE_INTEGER`). Plus explicit service-level `toString()` on document/booking/reservation/payment/finance responses (defense in depth). Representation is **string in JSON** for all DB BigInt values.

### O.2 Endpoints audited / fixed

| Area | Risk | Mitigation |
|------|------|------------|
| `GET /documents` list | `sizeBytes` bigint → 500 | list maps to string + global interceptor |
| `POST /documents`, replace, verify | sizeBytes | string at DTO boundary |
| `GET/POST /bookings` | `agreementValuePaise`, `advancePaise` | already stringified; interceptor backup |
| `GET/POST /reservations` | `amountPaise` | stringify + interceptor; agent filter added |
| `GET/POST /payments`, void/adjust | `amountPaise` | stringify + interceptor |
| Ops receipts / commissions / schedules / resales / reports | paise BigInts | pre-existing `toString()` + interceptor |
| Registrations | no BigInt columns | interceptor only |

### O.3 Agent booking attribution

- **Create:** when actor role is `AGENT`, `agentId` is forced to the actor’s `AgentProfile.id` (mirrors leads/visits). Staff may pass `agentId` or inherit `customer.agentId` / reservation agent. Unassigned customers get `agentId` set on book.
- **List filter (server-side):** agents without `allAgentsAccess` see bookings where `booking.agentId = me` **OR** `customer.agentId = me`.
- **Projection:** `projectCustomerPii` — agents get customer name/phone only when they own the relationship; otherwise redacted. `responsibleAgent` / `agent` `{ id, code, name }` always included when present.
- **UI:** agent-web Bookings table shows Customer, Agent (code), Agreement (paise) aligned with API projection.

### O.4 What was verified in cloud vs still needs local staging

| Check | Cloud agent | Local staging (Vijay) |
|-------|-------------|------------------------|
| Domain + API unit/regression tests | **Run here** (see tip commit) | Re-run optional |
| `GET /api/documents` against live staging DB/MinIO | **Not run** (no staging stack in cloud) | **Required** |
| Agent1 list shows own bookings after book | **Unit coverage** | **Required** on isolated compose |
| Agent2 cannot see Agent1 booking PII | **Unit coverage** | **Required** |
| Full 47-step UAT harness | **Not re-run** | **Required** after pull |

## Promotion decision

- **Local isolated staging UAT:** technically successful (CONDITIONAL YES).  
- **Internet-facing staging / production promotion:** **NO** until DNS/TLS, external notification credentials, **local re-verify of document list + agent attribution**, and explicit merge/production authorization.  
- **PR #10 remains OPEN and unmerged.**
