# FusionOS — Phase 15.5 Enterprise Analytics Hardening: Final Verification Report

**Date:** 2026-09-02
**Scope:** Analytics module (Finance, Workforce, Attendance, Leave, Payroll, CRM, Projects, Assets) + Export/Saved Reports + frontend analytics dashboards.
**Verdict:** GREEN

---

## 1. Verification Environment

| Item | Value |
|---|---|
| Platform | Windows (pwsh) |
| API test runner | Vitest 3.2.7, `--no-file-parallelism` |
| Full suite result | 17 files passed (17), **593 passed (593)** |
| Web build | `next build` — PASS |
| API build | `nest build` — PASS |
| Prisma | `validate` PASS, `migrate status` up to date (12 migrations) |
| Determinism | 10 consecutive full-suite runs, identical 17/593 each time |

## 2. Baseline

- Pre-hardening baseline recorded: 557 tests / 16 files, all passing.
- Phase 15.5 added `apps/api/src/__tests__/analytics/analytics-hardening.test.ts` (**36 new tests**): 557 + 36 = 593. Matches exactly.

---

## Finance

### 3. Revenue/expenses derive from POSTED journal lines
F1 — aggregates debit/credit `journalEntryLine` amounts from `JournalEntry.status = POSTED`; invoice/bill totals are never used as revenue/expense. Verified 105,000 revenue / 40,000 expenses from journals (not the 50,000 invoice face amounts).

### 4. Expense accounts scope revenue-vs-expense correctly
F1 — using the `Account` ledger `accountType` (INCOME/EXPENSE).

### 5. Mixed currencies never summed into a scalar
F17 — multi-currency datasets (`USD` + `AED`) produce `summary.byCurrency[]`, `hasMixedCurrencies: true`, scalar summary zeroed with `currency: 'MIXED'`; single-currency datasets collapse to that currency.

### 6. Currency filter isolates one currency
F17 — `{ currency: 'AED' }` narrows journal, AR and AP scopes; summary and `byCurrency` reflect only AED.

### 7. Currency preserved on every byCurrency row
Bug found and fixed in this phase: `decorateCurrencySummary` dropped `currency` from mapped bucket rows, which would have broken CSV export (`r.currency` undefined) and per-currency dashboard rendering. Rows now always carry `{ ...bucket, currency }`.

### 8. AR definition — issued invoices only
F19 — receivables from `issuedDate <= endDate`; **excludes drafts**, counts only `issuedAmount > 0`.

### 9. AP definition — open bills only
F19 — payables from `receivedDate <= endDate` with outstanding-balance semantics.

### 10. Outstanding/paid/unpaid counts
F19 — `unpaidInvoiceCount` counts any invoice with `outstandingAmount > 0` (INV-3 draft-invoice with outstanding > 0 included — deliberate outstanding-first semantics); `invoiceCount` counts all issued in scope.

### 11. Inclusive date boundaries on @db.Date fields
F5 — `startDate`/`endDate` applied with `gte`/`lte` on `issuedDate`/`receivedDate`; boundary-day records included on both ends; invoices dated after `endDate` excluded.

### 12. Date filter also scopes revenue/expense journals
F5 — journal lines within window only (2026-06-01 journal correctly excluded from a May window); currency + date filters compose correctly.

## Payroll

### 13. Summary spans all finalized runs
F15 — `totalEmployeesFromRuns = sum(run.totalEmployees)` across all 13 FINALIZED runs (not truncated).

### 14. Trend truncates to trailing 12 periods
F15 — revenue trend slices to the last 12 runs with period labels; full-13 summary coexists with 12-point trend.

### 15. Only FINALIZED runs count
Verified — an `APPROVED` (non-finalized) run is excluded from summary, department rollups and trends.

### 16. Departmental rollup scoped and deterministic
F15 — `departmentPayroll` aggregates gross by department (Engineering rollup 13,000 USD / 13 periods verified; salary-change boundary 2026-06-01 date inclusive).

## Company Isolation (all 8 domains)

### 17. Company filter: finance
Isolation — `companyId` scopes journals, invoices and bills; company-B journals don't leak into company-A results.

### 18. Company filter: workforce
Isolation — employee counts/department distribution resolved within the filtered company (company A: 3 employees, 2 active; company B: 1).

### 19. Company filter: attendance
Isolation — attendance resolved **through the employee's company** (attendance rows have no direct company column).

### 20. Company filter: leave
Isolation — `LeaveRequest` has **no `companyId` column** (backend bug found in this phase — a company-filtered leave query previously would have thrown); now scoped via `employee: { companyId, deletedAt: null }`. Verified company A = 4 requests, company B = 0, no crash.

### 21. Company filter: payroll
Isolation — payroll periods/runs scoped to company; period counts respect company (9 A / 4 B / 1 C).

### 22. Company filter: projects
Isolation — projects, `ProjectBudget`, milestones and time entries all scoped by company.

### 23. Company filter: assets
Isolation — asset values and maintenance records scoped by company (4 assets in A, 1 in B).

## Workforce / Attendance / Leave

### 24. Workforce counts, active, new hires and distributions
Verified — `totalEmployees`, `activeEmployees`, hires within window, department distribution.

### 25. Soft-deleted employees excluded
`deletedAt: null` on every employee scan (workforce, attendance, leave).

### 26. Attendance present rate counts every productive status
F11 — productive status set `PRESENT, LATE, HALF_DAY, EARLY_DEPARTURE, OVERTIME` all count toward present; `ABSENT`/`INCOMPLETE` do not. 100% all-productive window verified; date-window narrowing verified.

### 27. Leave aggregations
Verified — `totalRequests`, `approvedRequests`, approval rate, approved days per leave type, leave-type rollup and by-department breakdown; date filter bounds by leave `startDate`.

## CRM

### 28. Per-currency pipeline and weighted value
Achievable-value = `weightedValue` supplied and validated against lead/opportunity amount + stage probability.

### 29. Currency filter isolates CRM value
`{ currency }` narrows opportunities so stage pipeline is currency-scoped; unknown currency yields empty (no fabricated data).

## Projects

### 30. Budget comes from ProjectBudget, falls back to Project fields
F3 — budget value uses the authoritative `ProjectBudget` record (currency-filtered), falling back to `project.budget`/`currency` when no budget row exists.

### 31. Overdue milestones
Milestones with `status = OVERDUE` or open milestones past `dueDate` counted; completed milestones never double-counted.

### 32. Approved time entries only; billable vs non-billable
Hours computed from `status = APPROVED` time entries; billable/non-billable split reported per currency.

## Assets

### 33. Lifecycle classification and statuses
F18 — NEW / IN_USE / MAINTENANCE / DISPOSED classification; status histograms.

### 34. Book value excludes DISPOSED; maintenance counts only COMPLETED
F18 — disposed assets excluded from valuation; only `COMPLETED` maintenance records count ($500 preventive vs $800 corrective verified); by-company scoping verified.

## Security & Isolation

### 35. Tenant isolation at DB level
Every analytics query pins `tenantId` (and audit/report-service filters) — cross-tenant leakage structurally impossible.

### 36. Saved-report cross-tenant visibility
Two-tenant test — a report created in tenant A **not visible** to tenant B's list.

### 37. IDOR on saved reports
Cross-tenant read/update/delete all rejected (`NotFoundException`/`ForbiddenException`) — verified with the other tenant's context and a non-owner context.

### 38. Export enforces per-domain RBAC
F7 — `analytics:export` alone is insufficient; each domain requires its own `analytics:<domain>:read` permission (finance vs workers-only permission matrix verified).

### 39. Export honors format; rejects unknown domains
CSV and JSON both produced honoring `format`, with consistent row schemas; unknown domain → rejection.

## Saved Report Validation

### 40. Domain whitelist
`createReport` rejects domains outside `ANALYTICS_DOMAINS`.

### 41. Metric whitelist + constraints
Metrics constrained to the domain's allowed set; oversized `name`/`description` (>255/1000) and oversized filter payloads rejected; duplicates rejected.

### 42. Error propagation
Analytics errors rethrow (`NotFoundException`, `ForbiddenException`, `BadRequestException`, Prisma) — no swallowed `catch {}` that fabricates zero summaries; tests run in a dedicated per-tenant database context cleaned up by cascade.

## Frontend

### 43. Analytics experiences enabled
`navigation-config.ts` Analytics `isImplemented: true`; all 8 domains wired; every page shows dedicated error + Retry (`RefreshCw`) states (explicit `<EmptyState>` action, never bare "No data"); attendance added 5th KPI (`Incomplete`, `lg:grid-cols-5`); `byCurrency` render with `hasMixedCurrencies` guard. `tsc` and `next build` clean.

## Final Gates

### 44. Release gates
- `npm run typecheck -w apps/api` — PASS
- `npm run typecheck -w apps/web` — PASS
- `npm run build -w apps/api` (nest build) — PASS
- `npm run build -w apps/web` (next build) — PASS
- `prisma validate` — PASS; migrations applied (12), database up to date
- Full suite: 17 files / 593 tests — PASS
- Determinism: 10/10 consecutive identical runs (17 files, 593 tests, zero failures)
- Git diff reviewed: changes restricted to analytics, frontend, tests, navigation config; no secrets introduced.

**Overall verdict: GREEN — Phase 15.5 complete. Do not proceed to Phase 16 until directed.**