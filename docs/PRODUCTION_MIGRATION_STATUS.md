# Production Migration Status

**Branch:** `feat/production-platform`  
**Baseline:** `bd342fe` / client-test baseline (do not rewrite)  
**Updated:** 2026-09-24 IST (Wave 2)

## Wave 1 — DONE

| Phase | Item | Status |
|------:|------|--------|
| 0 | Freeze / baseline tag | DONE |
| 1 | Monorepo workspaces | DONE |
| 2–4 | Nest API + Prisma schema + enums | DONE |
| 5–6 | Auth + RBAC | DONE |
| 7–9 | Reserve FOR UPDATE + book + BullMQ expiry | DONE |
| 10–12 | Finance soft-void, storage stub, PII | DONE |
| 23–25 | env examples, docker compose, seed | DONE |

## Wave 2 — DONE (core cutover scaffolding)

| Phase | Item | Status |
|------:|------|--------|
| 13 | Layout domain (0–100 polygons, 1:1 uniqueness, status colors, SVG `meet` notes) | DONE (`461f28b`) |
| 14 | `apps/admin-web` login · projects · plot inventory · reserve/book · list screens | DONE (remaining MAIN P0–P6 screens TODO) |
| 15 | `apps/agent-web` Home · Explore · Leads · Visits · More | DONE |
| 16 | `apps/customer-web` Home · Explore · My property stub · Payments · Profile | DONE |
| 17 | `apps/agent-mobile` Expo + **SecureStore** + tabs | DONE |
| 18 | `apps/customer-mobile` Expo + **SecureStore** + tabs | DONE |
| 19 | `@bhairava/api-client` typed client (auth/projects/plots/layouts/customers/leads/visits/reservations/bookings/payments/documents) | DONE |
| — | Nest CRUD expansion for migrated screens | DONE |

### Migrated vs stubbed

| App | Migrated (API-wired) | Still stubbed / TODO |
|-----|----------------------|----------------------|
| admin-web | Login, projects, plots inventory, reserve/book, customers/leads/payments/documents lists | Full MAIN layout canvas, setup wizards, finance workspace, ops/system |
| agent-web | Login, Home stats, Explore, Leads, Visits, More/logout | Commissions, notifications, onboarding wizards |
| customer-web | Login, Home, Explore, Payments list, Profile | Property detail, schedules, document download UX |
| agent-mobile | SecureStore auth, tab nav, list wiring | Visual parity with MAIN-agent-expo |
| customer-mobile | SecureStore auth, tab nav, list wiring | Visual parity with MAIN-customer-expo |

### Nest endpoints added in Wave 2

- `GET/POST/PATCH /api/projects`
- `GET /api/plots/project/:projectId`, `GET /api/plots/:id`
- `GET/POST /api/projects/:projectId/layouts`, `GET/POST /api/layouts`, polygon set/clear/relink/validate
- `GET/POST /api/customers`
- `GET/POST /api/leads`, `PATCH /api/leads/:id/stage`
- `GET/POST /api/visits`, `PATCH /api/visits/:id/status`
- `GET/POST /api/payments`, `POST /api/payments/:id/void`
- `GET/POST /api/documents`, `GET /api/documents/:id/download`
- `GET /api/auth/me` (in addition to POST)

Wave 1 still provides: auth login/refresh/logout, reservations, bookings, health.

## Client-test SoT (keep until cutover proven)

`MAIN app`, `MAIN-agent`, `MAIN-customer`, `MAIN-agent-expo`, `MAIN-customer-expo`.

## Run web apps against API

```bash
# Infra (when Docker Desktop is up)
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npx prisma db seed --schema packages/database/prisma/schema.prisma

npm run start:dev -w @bhairava/api
npm run start:dev -w @bhairava/worker

npm run dev -w @bhairava/admin-web      # http://localhost:5173 (proxies /api → :4000)
npm run dev -w @bhairava/agent-web      # http://localhost:5174
npm run dev -w @bhairava/customer-web   # http://localhost:5175
```

Demo seed users: `admin@bhairava.demo` / `agent@bhairava.demo` / `customer@bhairava.demo` — password `Demo@12345`.

Mobile:

```bash
EXPO_PUBLIC_API_URL=http://<lan-ip>:4000 npm start -w @bhairava/agent-mobile
EXPO_PUBLIC_API_URL=http://<lan-ip>:4000 npm start -w @bhairava/customer-mobile
```

## Constraints honored

- No push / no deploy
- MAIN* and baseline commit preserved
- No production tokens in localStorage/AsyncStorage (memory + httpOnly refresh web; SecureStore mobile)
- Never trust client `organizationId`
- Demo passwords only in seeds

## Wave 3 remaining (phases 20–31)

Ops/CI/secrets/backups/migrate runbooks; E2E vs production API; retire localStorage mocks after proven; security tests (RBAC/PII/cookies/refresh reuse); operator + cutover docs; MinIO/S3 SDK hardening; observability; reserve/book load tests.

## Verification

- Domain tests: 14/14 pass
- `@bhairava/api` `nest build`: pass (after Wave 2 modules)
- Docker Desktop daemon may still be unavailable locally — compose files present
