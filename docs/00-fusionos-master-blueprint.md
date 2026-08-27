# FusionOS by ZORVEXA — Master Blueprint & Phase 0 Analysis

| | |
|---|---|
| **Document** | 00 — Master Blueprint (What We Are Building) |
| **Status** | `ASSESSMENT` + synthesis of `AUTHORITATIVE` product direction |
| **Phase** | 0 — Understand Only. **No implementation has occurred.** |
| **Date** | 2026-08-23 |
| **Rule** | Nothing here is implemented until verified against running code and tests. |

---

# PART A — PROJECT UNDERSTANDING

## A.1 The One-Line Definition

**FusionOS is an AI-native Business Operating System**: a true multi-tenant enterprise ERP SaaS that unifies HR, Attendance, Leave, Payroll, Finance/Accounting, CRM, Projects, Assets, Documents, Communication, Automation, AI, Analytics, and Audit into **ONE system with ONE data model**.

## A.2 What FusionOS Is NOT

It is NOT:

> HR app + Payroll app + Finance app + CRM + AI chatbot bolted together.

Those are unrelated applications. FusionOS is:

```
ONE BUSINESS DATA MODEL
+ ONE IDENTITY
+ ONE AUTHORIZATION SYSTEM
+ ONE EVENT SYSTEM
+ ONE AUTOMATION ENGINE
+ ONE AI PLATFORM
+ ONE ANALYTICS LAYER
+ ONE AUDIT SYSTEM
= ONE BUSINESS OPERATING SYSTEM
```

## A.3 The Fundamental Principle

> ENTER DATA ONCE.
> CONNECT EVERYTHING.
> UNDERSTAND EVERYTHING.
> AUTOMATE WHAT CAN SAFELY BE AUTOMATED.
> KEEP HUMANS IN CONTROL OF SENSITIVE DECISIONS.
> RECORD EVERYTHING.

Practical consequences:

- One employee master record — reused by attendance, leave, payroll, finance, reports, AI, analytics, equipment, documents. Never a second employee table inside any module.
- One client master record — CRM leads become clients; clients own projects; projects generate invoices; invoices live in finance.
- One financial source of truth — double-entry ledger. Payroll posts journal entries. Invoices post receivables. No module invents its own money math.
- One audit trail — every sensitive action across every module is recorded once, immutably, per tenant.

## A.4 The Canonical Data Flow (The Spine of the Product)

```
Employee
  → HR (master record)
  → Attendance (clock in/out, biometric/desktop verification)
  → Leave (requests, balances, approvals)
  → Payroll (deterministic engine over attendance + leave + salary)
  → Finance (journal entries, GL, payments)
  → Reports & Analytics
  → AI (reasoning over authorized data via controlled tools)
  → Automation (event-driven workflows)
  → Audit (everything above is recorded)
```

Every domain hangs off this spine. Example chains that MUST work end-to-end:

- Employee created → onboarding tasks → assets assigned → enrollment in biometrics → salary structure → first payroll run → journal entry → payslip notification.
- Lead won → client created → contract signed → project opened → employees staffed → time tracked → invoice raised → payment received → revenue recognized → executive dashboard updates.
- Employee late (attendance event) → policy evaluation → deduction component in payroll → notification → analytics aggregation → AI anomaly insight if pattern emerges.

## A.5 Unified Capability Map

HR · Employees · Attendance · Leave · Payroll · Finance · Accounting · CRM · Client Management · Projects · Tasks · Equipment/Assets · Documents · Communication · Notifications · Analytics · BI · AI · AI Agents · AI Automation · Workflow Automation · Reporting · Executive Intelligence · SaaS Administration · Integrations.

These are **modules of one operating system**, sharing identity, authorization, events, audit, notifications, and AI — never independent CRUD islands.

## A.6 Non-Negotiable Integrity Rules

No duplicate business records. No silent data inconsistencies. No cross-tenant access. No unrestricted AI database access. No fake business logic. No fake integrations. No fake AI results. No fake financial transactions. No fake biometric verification. No false completion claims. If an external capability is unavailable, it is abstracted behind a provider interface and clearly marked unavailable — never simulated.

---

# PART B — CURRENT REPOSITORY STATE

Everything below is `CONFIRMED` by direct inspection on 2026-08-23 unless tagged otherwise.

## B.1 Facts

| # | Question | Answer | Status |
|---|---|---|---|
| 1 | Repository empty? | Effectively yes — no code exists | CONFIRMED |
| 2 | Git initialized? | Yes — branch `main`, **zero commits**, no remote | CONFIRMED |
| 3 | Files present? | Exactly **one**: `docs/README.md` (2,771 bytes) | CONFIRMED |
| 4 | Folders present? | `docs/`, `.git/` only | CONFIRMED |
| 5 | package.json? | Absent | CONFIRMED |
| 6 | Existing application? | None — nothing to preserve | CONFIRMED |
| 7 | Dependencies installed? | None — no node_modules, no lockfile | CONFIRMED |
| 8 | Frontend? | None | CONFIRMED |
| 9 | Backend? | None | CONFIRMED |
| 10 | Database config? | None | CONFIRMED |
| 11 | Prisma present? | No | CONFIRMED |
| 12 | PostgreSQL configured? | No evidence anywhere | UNKNOWN (local install may exist outside repo) |
| 13 | Redis configured? | No evidence | UNKNOWN |
| 14 | Docker configured? | No files; **docker binary NOT in PATH** | CONFIRMED absent |
| 15 | Environment files? | None (.env*, .env.example all absent) | CONFIRMED |
| 16 | Existing scripts? | None | CONFIRMED |
| 17 | Tests? | None | CONFIRMED |
| 18 | Docs? | Only `docs/README.md` — an index describing an intended 16-document suite (01–16) of which **none of the referenced documents exist yet** | CONFIRMED |
| 19 | Source code to preserve? | None | CONFIRMED |
| 20 | Conflicts with FusionOS spec? | None possible — repo is empty | CONFIRMED |

## B.2 Documentation Suite Status

`docs/README.md` promises documents 01–16 (product overview, architecture, domain model, dependency graph, database/security/event foundations, automation/AI/desktop/analytics/audit systems, roadmap, MVP DoD, repo layout, current-state assessment).

**Reality:** only the index exists. This blueprint (`00`) is now the first substantive document. Documents 01–16 remain `PLANNED` and should be authored progressively in early phases rather than mass-generated now.

## B.3 Environment (CONFIRMED)

| Component | Value |
|---|---|
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Git | 2.47.1.windows.2 |
| Git identity (global) | farhankh8 / mohammadfarhankh.8@gmail.com — first commit will work |
| Git LFS | Installed globally |
| Docker | **NOT available in PATH** |
| Disk free (C:) | ~276 GB |
| Project path | `C:\Users\KHfar\OneDrive\Desktop\FusionOS` (⚠ inside OneDrive sync scope) |

---

# PART C — TECHNOLOGY DETECTION

**Actually detected in environment/repo:** Node.js v24.14.0, npm 11.9.0, Git 2.47.1 + LFS, PowerShell 5.1, Windows. That is the complete list.

**Intended by specification but NOT yet present anywhere:** Next.js, React, TypeScript, Tailwind CSS, NestJS, PostgreSQL, Prisma, Redis, Electron, Docker, Jest/Vitest (testing stack TBD), CI tooling.

No technology is claimed as "installed" or "working" until it runs and is verified.

---

# PART D — ARCHITECTURE ASSESSMENT & TARGET ARCHITECTURE

## D.1 Current vs Target

Current repository state (empty + doc index) versus intended target:

```
fusionos/
├── apps/
│   ├── web/          # Next.js + React + TS + Tailwind
│   ├── api/          # NestJS modular monolith (all domain modules)
│   └── desktop/      # Electron + React + TS (Windows agent)
├── packages/
│   ├── ui/           # shared design-system components
│   ├── config/       # shared eslint/ts/tsconfig configs
│   ├── types/        # shared DTOs & domain types
│   ├── validation/   # zod/class-validator schemas (single source of validation truth)
│   ├── database/     # Prisma schema, migrations, seed, client
│   └── shared/       # utils, constants, event contracts
├── infrastructure/
│   ├── docker/       # dockerfiles, compose
│   ├── deployment/   # cloud deployment manifests
│   └── monitoring/   # logs/metrics/traces config
├── docs/
│   ├── architecture/  api/  database/  workflows/  security/
├── tests/
├── .env.example
├── docker-compose.yml
├── package.json       # workspace root (npm workspaces)
└── README.md
```

## D.2 Architectural Style: Modular Monolith

One deployable NestJS API composed of strictly bounded domain modules (auth, tenancy, employees, payroll, …). Rules:

- Each domain module owns its tables; no cross-module direct table access — only through the owning module's service interface.
- Cross-module communication via domain events (in-process bus initially; Redis-backed when needed).
- Module boundaries drawn so that extraction into services later is mechanical, not surgical.
- Microservices are explicitly rejected until real scale demands them.

## D.3 Layering

```
apps/web  ──HTTP──▶  apps/api (NestJS modules)
                        │  guards (authn, tenant, RBAC)
                        │  controllers → services (business logic)
                        │  Prisma (packages/database)
                        ▼
                   PostgreSQL (+ Redis for cache/queue/session)
apps/desktop ──HTTPS+device auth──▶ same API (untrusted client)
```

The frontend and desktop client are NEVER security boundaries.

---

# PART E — DOMAIN MAP

21 domains, grouped by responsibility:

**Platform kernel:** `auth` · `tenancy` · `organization` · `users`
**People:** `employees` · `attendance` · `leave` · `payroll`
**Business:** `finance` · `crm` · `projects` · `assets` · `documents`
**Delivery:** `notifications` · `communication` · `reports`
**Intelligence:** `ai` · `automation`
**Governance:** `audit` · `billing` · `integrations`

Connection summary:

| Domain | Consumes from | Feeds |
|---|---|---|
| auth/tenancy/users | — | everything (identity, tenant scoping) |
| organization | tenancy | employees, attendance shifts, finance (branches/depts as dimensions) |
| employees | org, users, documents | attendance, leave, payroll, assets, projects, AI context |
| attendance | employees, shifts/holidays | leave, payroll, notifications, analytics, automation events |
| leave | employees, policies, holidays | attendance, payroll, notifications |
| payroll | attendance, leave, salary structures, statutory config | finance (GL postings), documents (payslips), notifications, audit |
| finance | payroll, crm→invoices, expenses, payments | reports, executive intelligence, automation triggers |
| crm | communication, documents | clients→projects, invoices→finance, follow-ups→tasks |
| projects | clients(crm), employees, tasks, documents, time | invoicing, resource analytics |
| assets | employees, organization | maintenance schedules, warranty alerts (events) |
| documents | every domain (polymorphic attachment), permission model | AI Company Knowledge (permission-filtered) |
| notifications/communication | events from all domains | email/in-app/(future WhatsApp) channels |
| ai | tools over all domains (authorized) | insights, drafts, agent actions (human-approved where sensitive) |
| automation | event bus | actions across all domains |
| audit | all domains | compliance reporting |
| billing | usage/tenants | SaaS plan enforcement |
| integrations | external providers (abstracted) | domain data ingestion |

---

# PART F — DEPENDENCY GRAPH (Allowed Directions)

```
                    ┌───────────────┐
                    │    tenancy    │◄──────────────┐
                    └──────┬────────┘               │
              ┌────────────┼────────────┐           │
              ▼            ▼            ▼           │
           ┌──────┐   ┌──────────┐  ┌────────┐     │
           │ auth │──▶│  users   │  │  org   │     │
           └──────┘   └────┬─────┘  └───┬────┘     │
                           ▼            ▼          │
                     ┌──────────────────────┐       │
                     │      employees       │───────┤ (every people-module depends here;
                     └──────────┬───────────┘       │  never sideways duplicates)
              ┌─────────┬───────┼────────┬───┐     │
              ▼         ▼       ▼        ▼   ▼     │
        ┌──────────┐ ┌──────┐ ┌─────────┐ ┌─────┐ │
        │attendance│ │leave │ │ payroll │ │assets│ │
        └────┬─────┘ └──┬───┘ └────┬────┘ └─────┘ │
             │          │          ▼              │
             │          │     ┌─────────┐        │
             └──────────┴────▶│ finance │        │
                              └────┬────┘        │
                                   ▼             │
                          ┌────────────────┐     │
                          │ reports/analytics│    │
                          └────────────────┘     │
        crm ─▶ projects ─▶ finance/invoices      │
        ai ──tools-over──▶ [any domain, guarded]─┤
        automation ──listens-events-from-all──▶ acts via domain services ─┘
        audit ◀── records from ALL domains (one-way; nobody writes audit except audit)
```

Hard rules:

1. Kernel (tenancy/auth/users/org) depends on nobody below it.
2. People domains depend on kernel + employees master — never re-implement employee data.
3. Payroll depends on attendance+leave outputs; never reads their tables directly (service contracts only).
4. Finance is downstream of all money-producing domains.
5. AI and Automation depend on domain **service/tool interfaces**, never bypass them.
6. Nobody mutates audit; audit subscribes to everything.

---

# PART G — DATABASE FOUNDATION REQUIREMENTS (PostgreSQL + Prisma)

To be designed in Phase 2 — listed here as requirements only, **not created**.

Entity groups (from spec §31): Tenants · Companies · Branches · Departments · Teams · Users · Roles · Permissions · Sessions · Devices · Employees (+ employment history, salary structures) · Attendance (+ shifts, holidays) · Leave types/balances/requests · Payroll periods/records/components · Accounts · Journal entries + lines · Customers · Leads · Opportunities · Contracts · Invoices · Payments · Vendors · Expenses · Projects/Milestones/Tasks · Assets + assignments + maintenance · Documents · Notifications · Messages · Automation workflows/executions · AI agents/tools/executions · Reports · Audit logs · Subscriptions/Plans/Usage.

Design mandates:

1. **Tenancy strategy decided up front** (shared-schema with mandatory `tenantId` + Postgres RLS as defense-in-depth is the leading candidate; decision documented in Phase 2).
2. Every tenant-sensitive table carries `tenantId`; every query passes through tenant-scoped Prisma extensions/guards — isolation enforced server-side, never by UI filtering.
3. Money = integer minor units + currency code + explicit decimal strategy. No floats, ever.
4. Double-entry integrity enforced at DB level (journal entry sums to zero across lines; transactional posting).
5. Soft-delete vs hard-delete policy per entity; biometric templates are encrypted, consent-flagged, deletable (GDPR-style lifecycle).
6. Audit log is append-only (DB-level protection; app users can never update/delete).
7. Event outbox table for reliable event publication (transactional consistency between DB write and event emit).
8. Idempotency keys for attendance sync, payments, webhook receivers, automation actions.
9. Conventions: UUID PKs, createdAt/updatedAt, optimistic locking where concurrent edits occur, named constraints, indexes on every tenant-scoped hot path.

---

# PART H — SECURITY FOUNDATION REQUIREMENTS

Boundaries and controls (Phases 3–4 establish core; Phase 23 hardens):

- **Authentication:** Argon2id password hashing, MFA (TOTP first), secure session/JWT strategy with rotation and revocation, device sessions for desktop agent.
- **Authorization:** centralized RBAC (role→permission→scope incl. branch/department dimensions); enforced in backend guards on EVERY endpoint; frontend hiding is cosmetic only.
- **Tenant isolation:** tenant claim extracted server-side; repository layer injects tenant filter automatically; integration tests prove cross-tenant denial.
- **Input validation:** strict schema validation (shared `packages/validation`) at every boundary; no raw body trusted.
- **File handling:** type/size checks, virus scanning hook, private storage with signed short-lived URLs, filename sanitization.
- **Rate limiting & headers:** per-route and per-tenant limits; Helmet-class secure headers; CORS allow-list.
- **Secrets:** `.env` never committed; `.env.example` only; secret manager path defined before production.
- **Encryption:** TLS everywhere; at-rest encryption for biometric templates and sensitive PII fields; key management plan.
- **Audit:** actor, tenant, action, entity, entity id, timestamp, before/after where appropriate, source/device/IP metadata, result, correlation id — immutable.
- **AI security:** prompt-injection hardening, tool allow-lists per agent, output validation, no arbitrary SQL, rate/cost limits, human approval gates for sensitive actions, per-scope memory isolation.
- **Biometrics:** liveness + anti-spoofing treated as UNSOLVED until proven; secure enrollment with consent; templates stored as protected irreversible encodings; device authentication; retention/deletion/re-enrollment lifecycle; full audit trail.
- **Backup/DR & monitoring:** backup schedule, restore testing, security event alerting.

---

# PART I — AI ARCHITECTURE

AI in FusionOS is a governed capability layer, not a chatbot bolted onto the side.

**Components:** AI Command Center · Agents · Tool System · Company Knowledge (RAG over permissioned documents) · Scoped Memory · Anomaly Detection · Predictive Analytics · NL Automation authoring · Executive Intelligence narratives.

**Agents (planned):** HR · Payroll · Finance · CRM · Recruitment · Operations · Project · Support · Executive/CEO. Every agent ships with: purpose statement, tool allow-list, permission ceiling ≤ its operator's, context boundaries, input/output validation, audit logging, approval requirements, rate limits, cost budgets.

**Tool system (the ONLY way AI touches business data):** typed functions like `getEmployee()`, `getAttendance()`, `getLeaveBalance()`, `getPayrollSummary()`, `getInvoice()`, `getClient()`, `getProject()`, `getAsset()`, `createHRTask()`, `createTask()`, `sendNotification()`, `draftEmail()`, `createReport()`, `createFollowUp()`, `getBusinessKPI()`, `getFinancialSummary()` — each internally tenant-scoped and permission-checked. **Never raw SQL access. Never unrestricted DB access.**

**The Iron Rule — AI reasons, services decide:**

| AI does | Deterministic services do |
|---|---|
| explain, summarize, recommend, draft, detect anomalies, answer questions | payroll math, tax math, accounting postings, permission checks, attendance rules, leave balance math, billing |

Correct pattern: *configured tax rules + validated employee data + deterministic calculation engine* → then *AI explains the payslip*. Wrong pattern: *"ask AI what the tax should be."*

**Human approval gate:** AI recommendation → human review → approval → business service executes → audit. Mandatory for payroll payment, bank transfer, salary change, termination, financial adjustments, sensitive HR actions.

**Memory scopes:** platform / company / department / user / conversation / workflow / agent — hard-isolated; company A's data can never enter company B's context.

---

# PART J — AUTOMATION & EVENT ARCHITECTURE

**Event backbone:** modules publish domain events (`EmployeeCreated`, `EmployeeUpdated`, `EmployeeTerminated`, `AttendanceRecorded`, `EmployeeLate`, `EmployeeAbsent`, `LeaveRequested/Approved/Rejected`, `PayrollGenerated/Approved`, `PaymentCompleted`, `InvoiceCreated/Overdue/Paid`, `TaskCreated/Overdue`, `ContractExpiring`, `AssetWarrantyExpiring`, `DocumentMissing`, `ClientCreated`, `OpportunityCreated`, …) via an outbox-backed dispatcher → in-process consumers first, Redis stream/queue when durability at scale requires.

**Automation engine model:**

```
TRIGGER → CONDITION(S) → RULE / AI DECISION (optional, bounded)
       → ACTION(S) → WAIT state → RECHECK → BRANCH
       → ESCALATION → AUDIT
```

Execution guarantees required: durable persisted state machines, restartable after crash, retryable with exponential backoff, idempotent actions, tenant-safe by construction, full execution history observable per step, dead-letter + failure alerting. Action types: webhooks, API calls, email, WhatsApp (provider-abstracted), notifications, task creation, report generation, approval requests.

**Sequencing note:** event infrastructure (Phase 17) precedes the Automation Engine (Phase 18), which precedes AI agents (19) and Automation Studio (20) — automations consume events; agents may trigger automations through approved tools only.

---

# PART K — DESKTOP ARCHITECTURE (Electron Windows Agent)

Future Windows desktop client providing: secure login, clock in/out with face verification, fingerprint-device capture, notifications, employee self-service actions, background attendance helpers, offline queue, auto-update, low footprint.

Non-negotiables:

- **Untrusted client principle:** desktop holds no authority; every request authenticated (user + registered device identity), validated, and authorized server-side.
- Biometric capture happens locally (camera/fingerprint reader); matching/liveness decisioning is server-side against encrypted templates — client never self-certifies "verified".
- Enrollment requires consent + audit; templates encrypted at rest; deletion/re-enrollment honored.
- **Offline pipeline:** action → signed local queue (with captured device timestamps + monotonic counters) → connectivity restored → sync handshake → **server-side validation & conflict resolution** (server time sanity windows, duplicate/idempotency rejection) → final attendance. Client timestamps are evidence, never truth.
- Auto-updates signature-verified; graceful degradation when backend unreachable.

---

# PART L — IMPLEMENTATION ORDER (Why This Sequence)

Roadmap phases 1–27 (spec §33) form a dependency chain; each phase unlocks the next:

| Phase | Deliverable | Why here |
|---|---|---|
| 1 | Repo/architecture/env foundation | Everything else builds in this skeleton |
| 2 | Database foundation | Schema is the product's skeleton; tenancy columns precede features |
| 3 | Authentication | No identity → no authorization → nothing is safe |
| 4 | Multi-tenancy | Must exist BEFORE business data, or retrofit = catastrophic migration |
| 5 | Organization | Branches/departments dimension every later record |
| 6 | Employee master | Central entity consumed by 9 other domains |
| 7 | Attendance foundation | First major workflow atop employee master |
| 8 | Leave | Depends on attendance semantics + policies |
| 9 | Payroll | Consumes attendance + leave + salaries; deterministic engine |
| 10 | Finance | Receives postings from payroll + future invoices |
| 11–13 | CRM, Projects, Assets | Business surface atop stable kernel |
| 14 | Notifications | Fan-out layer mature enough to serve all modules |
| 15–16 | AI foundation → Command Center | Needs real data + tools to govern |
| 17 | Event infrastructure | Backbone for automation |
| 18–20 | Automation Engine → Agents → Studio | Ordered: engine → governed agents → user-facing studio |
| 21 | Analytics/BI | Aggregates a populated system |
| 22 | Desktop app | Extends verified APIs; biometrics last among its concerns |
| 23–27 | Security hardening, Testing, CI/CD, Cloud, Production | Industrialization of what already works |

**MVP discipline (first serious integrated version):**
Company → Users → Employees → Attendance → Leave → Payroll → Finance → AI → Automation → Analytics. Nothing beyond, however tempting.

**Definition of Done (per feature):** requirement → business workflow → database → backend → authorization → business logic → API → frontend → integration → error handling → tests → audit → documentation — implemented AND verified. An HTTP 200 is not a feature. A dashboard is not a feature. Evidence is the only completion proof.

**Development rules (permanent):** inspect before modify · preserve working code · plan first · vertical slices · strong types · validate inputs · authorize server-side · maintain tenant isolation · proper constraints · tests · lint · typecheck · build · run · verify · fix · document · update project state · report exactly what was completed — no invented status, ever.

Status vocabulary used across the project: `CONFIRMED · INFERRED · UNKNOWN · PLANNED · IMPLEMENTED · VERIFIED · BLOCKED`.

---

# PART M — RISKS REGISTER

| # | Risk | Class | Mitigation |
|---|---|---|---|
| R1 | **Docker absent** — cannot run PostgreSQL/Redis containers yet | Blocked env | Phase 1 resolves: install Docker Desktop OR native PostgreSQL+Redis; decision pending user choice |
| R2 | **Repo lives inside OneDrive sync** — node_modules/file-watchers/git under sync cause locks, CPU churn, corruption risk | Environmental | Strongly recommend relocating dev clone outside OneDrive (e.g., `C:\dev\fusionos`) with OneDrive folder for docs only; needs user decision |
| R3 | Multi-tenancy retrofitted late = data leakage | Architectural | Tenant columns + guards from Phase 2/4, proven by adversarial tests |
| R4 | Authorization drift (frontend-only checks) | Security | Backend guard layer + deny-by-default + tests |
| R5 | Payroll/statutory correctness invented by AI or hardcoded guesses | Financial/Legal | Deterministic configurable engine; jurisdiction packs; chartered-accountant validation before any real run; AI never computes money |
| R6 | Fake biometric trust | Security | Liveness/anti-spoofing explicitly unsolved until vendor/proven implementation; provider abstraction + clear "unavailable" states |
| R7 | Prompt injection / AI overreach | AI Security | Tool allow-lists, scoped memory, output validation, human approval gates, cost caps |
| R8 | Event loss / duplication breaking automations | Data | Outbox pattern, idempotency keys, delivery reconciliation |
| R9 | Money as floats / rounding drift | Data | Integer minor units + documented rounding rules from day one |
| R10 | Premature microservices / infra sprawl | Architectural | Modular monolith discipline; extraction deferred to real scale signals |
| R11 | Scope explosion before MVP | Delivery | Phase gates; MVP chain frozen; new ideas go to backlog |
| R12 | Docs suite (01–16) promised but missing → confusion about source of truth | Process | Author progressively alongside phases; this blueprint (00) is interim master reference |
| R13 | Single-machine dev (no CI yet) hides integration breakage | Process | Phases 24–25 add test suite + CI; until then, disciplined local verification |
| R14 | Node v24 very fresh — occasional ecosystem friction | Minor | Pin exact versions in Phase 1; LTS fallback documented |

---

# PART N — UNKNOWN / BLOCKED ITEMS

| Item | State |
|---|---|
| Local PostgreSQL availability (outside repo) | UNKNOWN — not probed; Phase 1 verifies or provisions |
| Local Redis availability | UNKNOWN — same |
| Docker installation | BLOCKED by current absence; user must approve install method |
| Cloud target / hosting account | UNKNOWN — irrelevant until Phase 26 |
| AI model provider(s) & keys | UNKNOWN — Phase 15 decision; nothing assumed |
| Payment provider (for real money movement) | UNKNOWN — abstraction-first; clearly marked unavailable until contracted |
| Biometric hardware/fingerprint device models to support | UNKNOWN — Phase 7/22 discovery |
| WhatsApp Business provider account | UNKNOWN — Phase 14+ |
| Statutory jurisdictions for payroll/tax launch | UNKNOWN — user must specify target country/jurisdiction pack(s) before Phase 9 |
| Whether documents 01–16 should be fully authored upfront | OPEN — recommendation: progressive authoring tied to phases |

---

# PART O — PHASE 1 PLAN (PROPOSED ONLY — AWAITING EXPLICIT APPROVAL)

**Nothing below has been executed.** On approval, Phase 1 delivers the working skeleton — still no business features:

1. **Environment decisions (user inputs required):**
   - Docker Desktop install vs native PostgreSQL 16 + Redis (Windows) — recommend Docker Desktop if permissible, else native installs.
   - Repo location: keep in OneDrive vs move active clone to `C:\dev\fusionos` (recommend moving; OneDrive stays for docs mirror).
2. **Monorepo scaffold:** npm workspaces root (`package.json`, `tsconfig.base.json`, `.gitignore`, `.editorconfig`, `.env.example` placeholder names only, `README.md`), creating `apps/web`, `apps/api`, `apps/desktop` (placeholder-free minimal bootstrap), `packages/{ui,config,types,validation,database,shared}`, `infrastructure/docker`, `tests`.
3. **API bootstrap:** NestJS (strict TS) with Config module, health controller, helmet, validation pipe global, structured logging — runs and answers `/health`.
4. **Web bootstrap:** Next.js (App Router, TS, Tailwind) — runs, renders shell.
5. **Shared packages wired:** `types`, `validation`, `config` imported by both apps proving workspace graph compiles.
6. **Quality gates:** ESLint + Prettier + typecheck scripts at root; `npm run lint && npm run typecheck && npm run build` green.
7. **Infrastructure-as-config:** docker-compose for postgres+redis (used only once runtime available); `.env.example` documenting every variable; secrets stay out of git.
8. **Git baseline:** initial commit on `main` (identity confirmed present); remote optional/pending.
9. **Docs:** author `02-architecture-overview.md`, `04-dependency-graph.md`, `15-repository-layout.md` from this blueprint; update `16-current-state-assessment.md` with verified results.
10. **Verification evidence:** commands run + outputs recorded; definition: `lint/typecheck/build/dev-run` all pass on a clean machine path.

Explicitly OUT of Phase 1: database schema, auth, tenants, any business module, any AI, any UI page beyond health/shell, Docker installation itself (if chosen, performed with your oversight).

---

## APPROVAL GATE

Phase 0 ends here. Per the standing commandment — **UNDERSTAND FIRST. BUILD LATER.** — implementation begins only after you explicitly approve the Phase 1 plan above (including the two environment decisions in O.1).
