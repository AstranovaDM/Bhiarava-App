# MAIN — Project Detail as Portfolio OS

**Status:** Screen map (2026-09-24)  
**Screen ID:** `admin.projects.detail`  
**Route today:** `/projects/$projectId`  
**Companion:** `2026-09-24-bhairava-three-app-architecture.md`, `2026-09-24-main-admin-screen-inventory.md`

---

## 1. Product intent

Project detail is not a CRM record page. It is the **operating system for one plotted development**: configure the product, run inventory, drive sales, collect money, hold documents, and see health — without leaving the project.

**One-liner:** Open a project → run that project.

---

## 2. What exists today (baseline)

Current tabs: **Overview · Plots · Customers · Bookings · Documents**

| Area | Today | Gap vs Portfolio OS |
|------|-------|---------------------|
| Header | Code, name, location, status, approvals, plot/sold/value facts; Edit / Add plot / Site visit / Live layout | Missing phase/block summary, agent assignees, quick status change, publish flags for agent/customer |
| Overview | Absorption chart + activity timeline | Thin: no inventory funnel, collections pulse, config completeness, amenity/pricing snapshot |
| Plots | Table (number, area, facing, price, status) + links | No filters, bulk status, corner/road/premium columns, block/phase grouping, inline edit, map embed |
| Customers | Table of customers who hold plots | No leads for this project, no agent filter |
| Bookings | Table | No reservations / site visits scoped to project |
| Documents | Flat table | No visibility (`ADMIN_ONLY` / `AGENT_VISIBLE` / `CUSTOMER_VISIBLE`), no master layout special slot, no upload |
| Config | `ProjectEditor` + create wizard fields | Phases, blocks, plot types, amenities, pricing rules, media not first-class tabs |
| Sales ops | Global only | No project-scoped visits / reservations / collections / agents |

`project-config.ts` already defines facings, corner types, plot features, amenities catalog, and default pricing rules — the **data model for Portfolio OS exists in config**; the **project shell does not surface it**.

---

## 3. Target information architecture

### Header (always on)

- Identity: name, code, type, status (editable), location line  
- Compliance chips: RERA / approvals  
- KPI strip: Total / Available / Reserved / Booked / Sold|Registered · Absorption % · Pipeline value · Collected · Overdue  
- Primary actions: Edit basics · Add plots · Open layout · Upload master plan  
- Secondary: Assign agents · Change status · Site visit · New reservation · New booking  
- Optional: “Visible to agents” / “Listed for customers” toggles (publish)

### Tabs (target)

```text
Overview
Setup
Layout & Plots
Sales
Finance
Documents
Team
Activity
```

Keep URL stable: `/projects/$projectId` with `?tab=` (or hash) so deep links work.

---

## 4. Tab specs

### 4.1 Overview — project health

**Purpose:** Answer “how is this project doing?” in one glance.

Modules:

1. **Inventory funnel** — counts + % for Available → Reserved → Booked → Registered/Sold (+ On hold / Blocked if used)  
2. **Collections pulse** — collected vs due this month, overdue count, last 5 payments (link out)  
3. **Sales pulse** — visits / reservations / bookings this week; top agents by bookings on this project  
4. **Setup completeness** — checklist: identity, geo, approvals, phases/blocks, plot types, pricing rules, amenities, master layout uploaded, ≥1 agent assigned, ≥1 plot live  
5. **Recent activity** — project-scoped audit (keep today’s timeline; wire to real audit later)  
6. **Absorption chart** — keep; prefer real monthly status transitions when data exists  

Density: desktop two-column; mobile stacked cards.

### 4.2 Setup — product definition (admin-only depth)

**Purpose:** Configure what the project *is* before and while selling. This is the biggest uplift vs today.

Sub-sections (vertical nav or accordion inside the tab):

| Sub-section | Fields / actions | Notes |
|-------------|------------------|-------|
| **Identity** | Name, code, type, status, description, manager | Maps to onboarding step 1 + editor |
| **Location** | Address, village, mandal, district, city, state, pincode, map pin | Onboarding location |
| **Legal & approvals** | RERA, approval authority, legal notes, approval chips | Surfaced in header chips |
| **Phases** | CRUD phases (name, order, status, launch dates) | New first-class |
| **Blocks / sectors** | CRUD blocks tied to phase; plot count target | New |
| **Plot types** | Named types (e.g. 200 / 240 / 300 sq.yd), default dimensions, facing defaults | New; feeds inventory |
| **Dimensions & facing rules** | Default road widths, corner types enabled, feature tags from `PLOT_FEATURES` | From `project-config` |
| **Pricing rules** | Base rate/sq.yd, facing premiums, corner premium, road premiums, feature premiums | `defaultPricing()` / `PricingRules` |
| **Amenities** | Multi-select from `AMENITY_CATALOG` groups | Agent/customer marketing later |
| **Media** | Hero images, gallery, brochure PDF | New; storage later |
| **Publish** | Agent-visible / Customer-listed flags; what marketing fields sync | Aligns three-app privacy |

Rule: Setup never deletes sold/booked plot history; destructive changes need confirm + audit.

### 4.3 Layout & Plots — inventory OS

**Purpose:** Own the plot map and inventory for this project only.

Layout:

- **Left / top:** mini live layout (embed or link-in-place to `/plots/layout?projectId=`)  
- **Right / bottom:** inventory table with filters  

Columns (minimum): Plot # · Phase · Block · Type · Area · Facing · Corner · Road · Features · Price · Status · Customer (if any; admin sees PII) · Agent  

Actions:

- Add plot (wizard prefilled with project)  
- Bulk: change status (only legal transitions), assign type, apply price recalculation from rules  
- Open layout editor (`/plots/editor?projectId=`)  
- Row → plot drawer or `/plots` filtered  

Status model (align globally): `AVAILABLE | RESERVED | BOOKED | REGISTERED | HOLD | BLOCKED` (exact enum = existing store; do not invent a second vocabulary).

### 4.4 Sales — project-scoped pipeline

**Purpose:** Run sales for *this* project without bouncing to global lists first.

Sub-tabs or segmented control:

| Segment | Content |
|---------|---------|
| **Leads** | Leads tagged to this project (empty state until Leads screen exists — still reserve the slot) |
| **Site visits** | Filtered list + “Schedule visit” |
| **Reservations** | Active / expiring / converted / expired for this project |
| **Bookings** | Existing bookings table (enhanced) |
| **Customers** | Customers with interest or holdings here |

Each row links to global detail; create actions pass `projectId` search param (already used by some onboarding routes).

### 4.5 Finance — money for this project

**Purpose:** Collections and schedules without opening global Finance first.

Modules:

- Summary: collected, outstanding, overdue, this-month target  
- Payments table (project filter)  
- Payment schedule rollup by booking  
- Receipts shortcuts  
- **Commissions** rollup for this project (placeholder until Commissions screen exists)  

No double entry: rows deep-link to `/payments/$id`, `/collections`, etc.

### 4.6 Documents — vault with visibility

**Purpose:** Project document vault (Admin owns full vault; agent/customer apps get filtered copies later).

Required:

- Upload + type + visibility: `ADMIN_ONLY | AGENT_VISIBLE | CUSTOMER_VISIBLE`  
- Special slots: **Master layout**, **Brochure**, **Approval docs**  
- Table: name, type, visibility, modified, verified  
- Never imply customer vault here — customer app only gets `CUSTOMER_VISIBLE` copies via My Documents / public marketing assets  

### 4.7 Team — who sells this project

**Purpose:** Assign agents and (later) sales managers to the project.

- Assigned agents list (from onboarding `agents[]`) with performance mini-stats on this project  
- Assign / unassign  
- Optional internal notes for ops  

### 4.8 Activity — audit trail

**Purpose:** Trust and support.

- Filterable project audit: config changes, plot status, bookings, payments, document uploads, publish toggles  
- Reuse `/settings/audit` event shape with `projectId` scope  

---

## 5. Mapping from architecture admin capabilities

| Architecture capability | Lands in |
|-------------------------|----------|
| Create / edit projects | Header + Setup → Identity |
| Phases, blocks, plot types, dimensions, facing, corner, roads | Setup + Layout & Plots |
| Premium features, price rules, amenities | Setup |
| Upload images, documents, master layout | Setup → Media + Documents |
| Map plots; create/edit plots; change status | Layout & Plots |
| Assign agents | Team |
| Manage customers, bookings, payments, registration, resale | Sales + Finance (+ Registrations link from Sales/Bookings) |

Registration & resale stay as **global ops screens** with project filter; Project OS shows counts + deep links, not a second registration engine.

---

## 6. What agents / customers will see later (do not build into MAIN UI)

| Audience | Derived from this OS |
|----------|----------------------|
| MAIN-agent | Read-only project marketing + plot availability + `AGENT_VISIBLE` docs; no Setup edit |
| MAIN-customer | Public project explore + available plot facts; no vault; no other owners |

Publish flags and document visibility on this screen are what make that split possible.

---

## 7. Implementation stance (when we build)

1. **Do not greenfield** the route — deepen `/projects/$projectId`.  
2. Promote Setup sections using existing `project-config.ts` + onboarding fields before inventing new models.  
3. Prefer `?tab=setup` etc. over new nested routes for v1.  
4. Layout embed can deep-link first; inline canvas second.  
5. Leads / Commissions segments can ship as empty states with CTA to backlog items from the Admin inventory.  

---

## 8. Build slices (suggested order)

| Slice | Outcome |
|-------|---------|
| **P0** | Tab IA + Overview health (funnel, completeness, keep chart/activity) |
| **P1** | Setup: Identity / Location / Legal / Amenities / Pricing rules (wire editor) |
| **P2** | Layout & Plots: richer columns, filters, project-scoped layout links |
| **P3** | Documents visibility + master layout slot |
| **P4** | Sales segments (visits / reservations / bookings / customers) scoped |
| **P5** | Finance summary + Team assign + Activity audit filter |
| **P6** | Phases / blocks / plot types CRUD + publish flags |

---

## 9. Open product calls (only if blocking)

1. Exact plot status enum spelling (match store; document once).  
2. Is **Resale** in-project or global-only with filter? (Recommend: global + count on Overview.)  
3. Can Finance role edit Setup, or view-only + Finance tab? (Recommend: Setup = Founder/Admin; Finance tab = Finance+Admin.)  

---

*Next step after approval: either implement P0–P1 in MAIN, or write the matching permission matrix for `admin.projects.detail` actions.*