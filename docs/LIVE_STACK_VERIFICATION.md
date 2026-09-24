# Live Stack Verification

**Date:** 2026-09-24 IST  
**Branch:** `feat/production-platform`  
**Machine:** Windows `b1a1fbdb-c95f-4dec-bacb-6d16fae8d5c5`

## Infrastructure

| Component | Endpoint | Status |
|-----------|----------|--------|
| Postgres | `localhost:5432` / db `bhairava` | UP (`infrastructure-postgres-1`) |
| Redis | `localhost:6379` | UP |
| MinIO | `http://127.0.0.1:9000` bucket `bhairava` | UP |
| API | `http://127.0.0.1:4000` | UP — `/api/health` + `/api/ready` |
| Worker | BullMQ reservation-expiry (60s) | UP |

## Start commands

```powershell
docker compose -f infrastructure/docker-compose.yml up -d
cd services/api
Remove-Item tsconfig.tsbuildinfo -ErrorAction SilentlyContinue
npx tsc -p tsconfig.json
npm run start:prod
# other terminal
cd services/worker
npm run start
```

MinIO (dev only): `minioadmin` / `minioadmin`.

## Phase A

Worker package.json UTF-8; BullMQ running. StorageService is real S3/MinIO (presigned PUT/GET), bucket auto-created.

## Phase B — Auth E2E

`node scripts/e2e/auth-live.mjs` → **PRODUCTION VERIFIED (36/36)**

## Phases C–E

`node scripts/e2e/live-cde.mjs` → **PRODUCTION VERIFIED (25/25)**  
Concurrency, MinIO object lifecycle, PII encrypt/mask/reveal + isolation.

## Demo personas

Password: `Demo@12345`  
`founder@bhairava.demo`, `admin@bhairava.demo`, `finance@bhairava.demo`, `viewer@bhairava.demo`, `agent@bhairava.demo`, `agent2@bhairava.demo`, `customer@bhairava.demo`, `customer2@bhairava.demo`

## Rough edge

Losing concurrent reserve may return HTTP 500 instead of 409; uniqueness still holds.
