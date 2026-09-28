# Google auth, invites, attribution, Bhairava Direct — honest gaps

Shipped on `feat/production-platform` tip via this PR. Live schema investigated before coding; production path remains Nest + Prisma (no PLATFORM_SEED / mock repos / localStorage business data).

## Implemented

- **Customer Google-only continue** (`POST /api/auth/google/customer`) + profile completion (`POST /api/auth/customer/complete-profile`)
  - Name editable, email from Google (locked), mobile required, city/referral optional, terms required → ACTIVE
  - Returning users with `profileCompletedAt` skip profile
  - Phone normalize (`normalizePhoneIn`); Google `sub` / email → sign-in
  - Mobile-only dup → conflict, **no merge**, generic message (no PII leak)
  - `DIRECT_APP` → sales owner **Bhairava Direct**; invite claim → inviting agent
- **Agent open Google signup** (`POST /api/auth/google/agent`) + profile → ACTIVE + agent code, **no Admin approval**
- **Secure invites** (`POST /api/invites`, `GET /api/invites/:token`) — hashed token, copy/share URL; attribution fields separate (`attributionSource`, `invitedByAgentId` vs sales-owner `agentId`)
- **No steal by phone** on invite create + `customers.create` + assignment audit actions
- **Site visit request** (`POST /api/visits/request`) → primary agent if Active else Bhairava Direct
- **Brand lock**: surfaces/secondary blue-tint → green/neutral; `#006D32` / `#00D166` / white; Space Grotesk + Inter; Google button is the only blue exception
- Staff email/password login **retained** for admin/finance (not customer/agent portal path)

## Gaps / follow-ups (honest)

1. **Live Google Identity Services** — requires real `GOOGLE_CLIENT_ID_*` / `VITE_GOOGLE_CLIENT_ID_*`. Local/dev can use `GOOGLE_AUTH_DEV_BYPASS` + `dev.<payload>` tokens (disabled in production).
2. **Mobile apps** (`apps/customer-mobile`, `apps/agent-mobile`) — web flows updated; Expo Google Sign-In not wired in this PR (same API contracts ready).
3. **Customer preferred project picker** — API accepts `preferredProjectId`; onboarding UI does not yet list projects (optional field).
4. **Invite token on Google continue** is carried to profile complete; if the user closes the tab between Google and profile, they must reopen the invite link (token in query).
5. **Prisma client generate / migrate deploy** must run in each environment before API boot (`passwordHash` nullable + new columns/tables).
6. **Admin password reset for Google-only users** — Google users have `passwordHash: null`; password login correctly rejects; no “set password” path yet (by design for portals).
7. **Bhairava Direct user** is a system AGENT row (`isSystem: true`, code `BHAIRAVA_DIRECT`) — not a human Google account; ensure ops do not delete it.
8. **Unit tests cover rule engines** (signup/dup/invite/attribution/privacy/routing). Full DB integration / Playwright Google GIS tests are still environment-dependent.

## Migration

`packages/database/prisma/migrations/20260928043000_google_auth_invites_attribution/`
