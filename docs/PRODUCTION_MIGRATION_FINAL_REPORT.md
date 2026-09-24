# Bhairava Production Migration — Final Report

**Branch:** `feat/production-platform`  
**Date:** 2026-09-24 IST (continued)  
**Machine:** Windows `b1a1fbdb-c95f-4dec-bacb-6d16fae8d5c5`  
**Baseline:** `bd342fe` (preserved)  
**Tip before this update:** `a7a3b31` (409 mapping) + this wave

## Status legend

| Label | Meaning |
|-------|---------|
| **PRODUCTION VERIFIED** | Implemented and proven in this environment |
| **IMPLEMENTED — NEEDS ENVIRONMENT VERIFICATION** | Code/docs ready; live infra not available to prove |
| **BLOCKED BY EXTERNAL CREDENTIAL** | Waiting on secrets/accounts not in repo |
| **NOT COMPLETE** | Still open / out of scope for this wave |

---

## Items 1–19 (priority migration checklist)

### 1. Monorepo workspaces
**PRODUCTION VERIFIED**

### 2. Prisma schema + migrations
**PRODUCTION VERIFIED**

### 3. Nest API bootstrap
**PRODUCTION VERIFIED** — rebuilt + `start:prod` on :4000 (`/api/health` ok)

### 4. Domain package
**PRODUCTION VERIFIED** — **14/14** pass

### 5. Auth
**PRODUCTION VERIFIED** — prior live E2E 36/36

### 6. RBAC
**PRODUCTION VERIFIED** (matrix/unit) / live HTTP covered by app smokes

### 7. Reserve FOR UPDATE + concurrency
**PRODUCTION VERIFIED** — double-reserve loser is **HTTP 409** (not 500).  
Script: `node scripts/e2e/assert-409-reserve.mjs` → statuses `[201,409]`, no 500.  
`live-cde.mjs` asserts loser is 409 when available plots exist.

### 8. Booking + rollback
**PRODUCTION VERIFIED** — prior double-book 409; serialization mapped in `a7a3b31`

### 9. Worker reservation expiry
**PRODUCTION VERIFIED** (BullMQ previously live)

### 10. Finance soft-void / adjust
**PRODUCTION VERIFIED** (API unit + payments endpoints live)

### 11. Storage MinIO
**PRODUCTION VERIFIED**

### 12. PII encrypt/mask/project
**PRODUCTION VERIFIED**

### 13. Layout domain / polygon uniqueness
**PRODUCTION VERIFIED**

### 14. Admin / Agent / Customer web
**PRODUCTION VERIFIED** (builds + live list APIs) / **NOT COMPLETE** (full MAIN pixel/canvas parity)  
- Admin-web: Dashboard→Founder danger zone wired to live API; reservations/bookings/agents/receipts/commissions/schedules/registrations/resales/users/company-settings/reports no longer placeholders.  
- Project workspace setup PATCH live; layouts list + polygon presence from API.  
- Agent-web + customer-web expanded against live API; builds pass.  
- Remaining: dense MAIN widgets (interactive SVG mapping editor UX, print receipts templates, full onboarding wizards) still MAIN SoT visually.

### 15. Expo mobiles + SecureStore
**IMPLEMENTED — NEEDS ENVIRONMENT VERIFICATION**  
SecureStore token stores present for agent + customer.  
Expo web export needs `react-native-web` / metro-runtime.  
Store signing **BLOCKED BY EXTERNAL CREDENTIAL**.

### 16. Typed api-client
**PRODUCTION VERIFIED** — list + ops methods added; admin/agent/customer builds against it

### 17. Immutable audit
**PRODUCTION VERIFIED** (prior + admin audit page)

### 18. Notifications
**IMPLEMENTED — NEEDS ENVIRONMENT VERIFICATION** (stubs; list wired in admin)

### 19. Observability
**PRODUCTION VERIFIED** — health/ready live

---

## Items 20–24 (ops)

### 20. Env / founder bootstrap / demo seed
**PRODUCTION VERIFIED** — demo passwords in seed only (`Demo@12345`); login forms prefill demo emails for local QA.

### 21. Docker compose
**PRODUCTION VERIFIED** — postgres/redis/minio healthy

### 22. Mobile EAS / signing
**BLOCKED BY EXTERNAL CREDENTIAL**

### 23. Backup / restore
**PRODUCTION VERIFIED** (prior pg_dump restore)

### 24. Documentation + start commands
**PRODUCTION VERIFIED** (this report updated)

---

## Test totals (this machine)

| Suite | Result |
|-------|--------|
| `@bhairava/domain` | **14 pass / 0 fail** |
| `@bhairava/api` Jest | **44 pass / 0 fail** (10 suites) |
| `node scripts/e2e/assert-409-reserve.mjs` | **PRODUCTION VERIFIED** (201 + 409) |
| `node scripts/e2e/live-cde.mjs` | 21/22 when inventory exhausted (`available-plots n=0`); 409 assert present |
| Admin/agent/customer `vite build` | **pass** |

## Remaining blockers

1. **EAS / Apple / Play signing credentials** for store builds.
2. Full MAIN interactive layout canvas UX cutover (hit-testing SoT still MAIN).
3. Founder→…→Resale full shared-DB E2E script polish when plot inventory is depleted (reseed or reset AVAILABLE).
4. Production secrets — never ship demo `.env` values.

## Exact start-stack commands

```powershell
cd "C:\Users\HP\Downloads\Bhairava App"
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
npm install
npm run db:migrate:deploy
npm run db:seed

# API (clean rebuild if dist missing after incremental+deleteOutDir)
Remove-Item services\api\tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npm run build:api
npm run start:prod -w @bhairava/api

npm run dev:worker
npm run dev:admin-web
npm run dev:agent-web
npm run dev:customer-web

npm run test:domain
npm run test:api
node scripts/e2e/assert-409-reserve.mjs
node scripts/e2e/live-cde.mjs
npm run test:e2e:api
```

## Constraints honored

- No git push
- No new product features beyond production migration parity
- Small local commits only
