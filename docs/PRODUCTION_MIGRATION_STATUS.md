# Production Migration Status

**Branch:** `feat/production-platform`  
**Baseline:** `bd342fe` / `client-test-baseline-bd342fe` (do not rewrite)  
**Updated:** 2026-09-24

## Wave 1 checklist

| Phase | Item | Status |
|------:|------|--------|
| 0 | Freeze / baseline tag | DONE |
| 1 | Monorepo workspaces (`apps/*`, `services/*`, `packages/*`) | DONE |
| 2–3 | NestJS API + Prisma schema (org-scoped models) | DONE (schema + modules) |
| 4 | Canonical enums in Prisma | DONE |
| 5 | Auth (argon2, JWT access + rotating refresh, reuse detection, reset stubs) | DONE (code) |
| 6 | RBAC permission matrix + guard chain | DONE (code) |
| 7–9 | Reservation FOR UPDATE + booking atomicity + BullMQ expiry worker | DONE (code + concurrency unit test) |
| 10–12 | Finance soft-void, S3/MinIO abstraction, PII encrypt/mask | DONE (stubs/working helpers) |
| 23 | `.env.example` files | DONE |
| 24 | Docker compose (postgres, redis, minio, api, worker) | DONE |
| 25 | Seed skeleton (demo users + sample plots) | DONE |

## Client-test apps (behavioral SoT — keep)

- `MAIN app` (3000), `MAIN-agent` (5174), `MAIN-customer` (5175)
- `MAIN-agent-expo`, `MAIN-customer-expo`
- `CLIENT_TEST_GUIDE.md`, screenshots, tests preserved

## Start commands

```bash
# Infra
docker compose -f infrastructure/docker-compose.yml up -d postgres redis minio

# DB
cp packages/database/.env.example packages/database/.env
cp services/api/.env.example services/api/.env
npm install
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npx prisma db seed --schema packages/database/prisma/schema.prisma

# API + worker
npm run start:dev -w @bhairava/api
npm run start:dev -w @bhairava/worker
```

Health: `GET http://localhost:4000/api/health`

## Verification notes

- Docker Desktop daemon was **not running** during Wave 1 verification (`dockerDesktopLinuxEngine` pipe missing). Compose file + Dockerfiles are present. Mark: **NEEDS ENVIRONMENT VERIFICATION**.
- Do not push; local commits only.
- Wave 2: migrate MAIN* UIs into `apps/*` (phases 13–18).

## Wave 2 remaining

- 13–15: Admin / Agent / Customer web cutover from MAIN*
- 16–17: Expo agent/customer apps → `apps/*-mobile`
- 18: E2E against production API; retire localStorage mock after proven

