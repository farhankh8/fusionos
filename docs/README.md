# FusionOS Documentation Suite

Authoritative product and engineering documentation for **FusionOS by ZORVEXA**.

Every document carries a status tag:

| Tag | Meaning |
|---|---|
| `AUTHORITATIVE` | Governs all implementation decisions |
| `PLANNED` | Agreed direction, not yet built |
| `ASSESSMENT` | Verified snapshot of reality at a point in time |

Nothing in this suite may be treated as *implemented* until verified against
running code and tests. See [Definition of Done](14-mvp-definition-of-done.md).

---

## Index

### Product

| # | Document | Status |
|---|---|---|
| 01 | [Product Overview](01-product-overview.md) — vision, principles, what FusionOS is and is not | AUTHORITATIVE |
| 02 | [Architecture Overview](02-architecture-overview.md) — modular monolith, tech stack, boundaries | AUTHORITATIVE |
| 03 | [Domain Model](03-domain-model.md) — domains, entities, end-to-end data flows | AUTHORITATIVE |
| 04 | [Dependency Graph](04-dependency-graph.md) — allowed module dependencies & rules | AUTHORITATIVE |

### Foundations

| # | Document | Status |
|---|---|---|
| 00 | [Master Blueprint](00-fusionos-master-blueprint.md) — complete project specification & Phase 0 analysis | ASSESSMENT |
| 05 | [Database Architecture](database-architecture.md) — schema, tenancy, money, indexing, constraints | AUTHORITATIVE |
| 06 | [Database Foundation](05-database-foundation.md) — eventual schema requirements, tenancy strategy | PLANNED |
| 06 | [Security Foundation](06-security-foundation.md) — authn/z, isolation, AI security, secrets | PLANNED |
| 07 | [Event-Driven Architecture](07-event-driven-architecture.md) — domain event catalog & infra | PLANNED |

### Platform Systems

| # | Document | Status |
|---|---|---|
| 08 | [Automation Engine](08-automation-engine.md) — triggers, conditions, actions, durability | PLANNED |
| 09 | [AI Platform](09-ai-platform.md) — agents, tools, memory, guardrails, human approval | PLANNED |
| 10 | [Desktop Application](10-desktop-application.md) — Windows agent, biometrics, offline sync | PLANNED |
| 11 | [Analytics & Executive Intelligence](11-analytics-executive-intelligence.md) | PLANNED |
| 12 | [Audit & Compliance](12-audit-compliance.md) | PLANNED |

### Delivery

| # | Document | Status |
|---|---|---|
| 13 | [Roadmap — Phases 1–27](13-roadmap-phases.md) | AUTHORITATIVE |
| 14 | [MVP & Definition of Done](14-mvp-definition-of-done.md) | AUTHORITATIVE |
| 15 | [Repository Layout](15-repository-layout.md) — target monorepo structure | PLANNED |
| 16 | [Current State Assessment](16-current-state-assessment.md) — Phase 0 findings + Phase 1 plan | ASSESSMENT |

---

## Reading Order (New Contributor)

1. `01-product-overview` → understand the product philosophy
2. `02-architecture-overview` → understand the system shape
3. `03-domain-model` → understand how data connects
4. `13-roadmap-phases` → understand where we are and where we go next
5. `16-current-state-assessment` → understand today's reality
