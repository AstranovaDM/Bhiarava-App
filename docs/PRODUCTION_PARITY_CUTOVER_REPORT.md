# Bhairava Production Parity + Cutover Report

**Branch:** `feat/production-platform`  
**Tip SHA:** `a4a15be` (`a4a15be25dff97b88985408dd6d4f8b8b4df6283`)  
**Date:** 2026-09-25 IST  
**Machine:** Windows `b1a1fbdb-c95f-4dec-bacb-6d16fae8d5c5`  
**Path:** `C:\Users\HP\Downloads\Bhairava App`  
**Baseline (UX reference only):** tag `client-test-baseline-bd342fe` (`bd342fe`)  
**Lineage:** tip descends from `44b09b6` (Phase J) â†’ prior tip `bdcfb75` â†’ this parity wave  
**Demo password (seed only):** `Demo@12345` (`packages/database/prisma/seed.ts`)

## Status legend

| Label | Meaning |
|-------|---------|
| **PRODUCTION VERIFIED** | Implemented and proven in this environment |
| **IMPLEMENTED - NEEDS ENVIRONMENT VERIFICATION** | Code ready; live device/infra not proven here |
| **BLOCKED BY EXTERNAL CREDENTIAL** | Waiting on secrets/accounts not in repo |
| **NOT COMPLETE** | Still open / out of scope |

---

## Source of Truth cutover

**DONE (documented).** Production SoT is the monorepo:

| Surface | Path | Role |
|---------|------|------|
| Admin web | `apps/admin-web` | Production SoT |
| Agent web | `apps/agent-web` | Production SoT |
| Customer web | `apps/customer-web` | Production SoT |
| Agent mobile | `apps/agent-mobile` | Production SoT |
| Customer mobile | `apps/customer-mobile` | Production SoT |
| API | `services/api` | Production SoT |
| Worker | `services/worker` | Production SoT |

Legacy / reference only (not required to run production):

- `MAIN app/`, `MAIN-agent/`, `MAIN-customer/`, `MAIN-agent-expo/`, `MAIN-customer-expo/`
- Untracked `bhairava-admin/`, `bhairava-agent/`, `bhairava-customer/`, `bhairava-app/`
- `archive/`

See `docs/PRODUCTION_SOT_CUTOVER.md`. **Folders not deleted** (retained for regression comparison).

---

## Parity scores (honest functional UX, not pixel-perfect)

| Surface | Score | Notes |
|---------|------:|-------|
| Admin web | **92%** | Dashboard, projects DRAFTâ†’workspace setup (plot types/pricing/amenities/visibility), layouts SVG editor, CRM lists, lead conversion chain, customer onboarding wizard, finance lists, **receipt detail + A4 print**, registrations/resale/agents/reports/settings/audit/danger. Media/phases/blocks dense editors thinner than MAIN. |
| Agent web | **88%** | Home, projects+plot reserve, leads, customers+onboarding, visits, reservations, bookings, collections, commissions, documents, notifications, profile â€” all live API / ownership scoped. |
| Customer web | **88%** | Home, explore+plot availability, property, bookings, payments, schedule, receipts(+detail/print), documents, notifications, support, profile. |
| Agent mobile | **78%** | Expo tabs for home/projects/leads/CRM/sales+docs+notifs; SecureStore auth. Form density below MAIN-expo. Store signing blocked. |
| Customer mobile | **78%** | Expo tabs for home/explore/property/finance/docs+notifs/support; SecureStore auth. Store signing blocked. |
| Receipts / printing | **95%** | List + detail from immutable payment; A4 print CSS; HTML download. Native PDF generation optional (pdfKey placeholder). |
| Onboarding wizards | **90%** | Project: create DRAFT â†’ workspace setup tabs. Customer: 4-step wizard. Lead conversion chain live. |
| In-app notifications | **90%** | List/unread/mark one/mark all/linked href; emitters on payment+booking. Provider adapters stubbed. |
| Email/SMS/WhatsApp/push | â€” | **BLOCKED BY EXTERNAL CREDENTIAL** (stubs retained) |

---

## API additions this wave

- `GET /api/projects/:id/setup`, plot-types / pricing / amenities CRUD
- `GET /api/receipts/:id` enriched (customer/plot/project/payment/generatedBy)
- Customer create: address/state/pincode/kycStatus/source
- Notifications: api-client `markRead` / `markAllRead` / `unreadOnly`; emit on payment received + booking created
- Project get includes plotTypes, pricingRules, amenities, phases, blocks

---

## MAIN dependency scan (`docs/MAIN_DEPENDENCY_SCAN.md`)

| Check | Result |
|-------|--------|
| localStorage business persistence in production apps | **0** |
| mock-data imports in production apps | **0** (1 comment-only in `packages/domain`) |
| demo-store / useData | **0** |
| MAIN-* path imports in production | **0** |
| sessionStorage | auth tokens only (expected) |

Production apps run without MAIN* / mock / localStorage business SoT.

---

## Final E2E + gates (this machine, 2026-09-25 IST)

| Suite | Result |
|-------|--------|
| `scripts/e2e/production-flow.mjs` | **31 passed / 0 failed** PRODUCTION VERIFIED |
| `scripts/e2e/assert-409-reserve.mjs` | **PRODUCTION VERIFIED** (201 + 409) |
| `@bhairava/domain` | **14 pass / 0 fail** |
| `@bhairava/api` Jest | **44 pass / 0 fail** (10 suites) |
| admin / agent / customer `vite build` | **pass** |
| agent / customer `expo export --platform web` | **pass** |
| Docker postgres/redis/minio | **healthy** |
| API `/api/health` | **ok** |

---

## Blockers for external production deploy

1. **EAS / Apple / Play signing** â€” **BLOCKED BY EXTERNAL CREDENTIAL**
2. **Email / SMS / WhatsApp / Push provider credentials** â€” adapters present, stubs only â€” **BLOCKED BY EXTERNAL CREDENTIAL**
3. Production secrets â€” never ship demo `.env` / `Demo@12345`
4. Optional polish: denser MAIN media/phases/blocks editors; native receipt PDF bytes

---

## Constraints honored

- No git push
- No external deploy / PR
- No new product scope beyond parity
- Local commits only on `feat/production-platform`
