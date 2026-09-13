# PHASE 28 — FINAL RELEASE HARDENING

**Date:** September 13, 2026
**Baseline:** Phase 27 GREEN
**Status:** 🟢 GREEN

---

## EXECUTIVE SUMMARY

Phase 28 is the final release-hardening pass that closes the three open findings from the Phase 27 certification report. All three were addressed with real, executed verification — no report-only claims.

**F-1 (MEDIUM) — CI RLS gap, RESOLVED.** CI now applies migrations with `prisma migrate deploy` (which runs the RLS migration) instead of `prisma db push`. Two new CI steps enforce the fix: the *Verify RLS policies present* step checks that 100 tables report `relrowsecurity = true` in the CI test DB, and the *RLS tests must EXECUTE* step greps the RLS run output for `Tests\s+22 passed` and fails the job if the suite skipped. Locally verified end-to-end against the scratch DB `fusionos_ci_eq`: 18 migrations applied, **100 RLS-enabled tables**, RLS suite **22/22 executed (0 skipped)**, full API suite **1034/1034**. Scratch DB removed after verification.

**F-3 (LOW) — `npm run lint` broken repo-wide, RESOLVED.** Root cause: ESLint 9 flat config (`eslint.config.js`) did not exist, so ESLint silently processed no files and `npm run lint` produced no output but a non-zero exit. Added a repository-wide flat config and wired the `lint` script in both `apps/api` and `apps/web` to `eslint "src/**/*.{ts,tsx}"`. Baseline was **197 errors + 372 warnings**; the errors were genuinely fixed (unused imports, unused destructured members, dead variable assignments, bare-`await` fixture creation in tests, unused `catch`/params) rather than suppressed. Final: **0 errors, 369 warnings** — the residual 369 are all `no-explicit-any` at the intentional `warn` level (pre-existing `any` usage, visible but non-blocking, documented below). `tsc` clean in both apps.

**F-2 (LOW) — health `latencyMs` overstated, RESOLVED.** The health check previously constructed a fresh `PrismaClient` inside the check (~250ms) per probe, dominating the reported `latencyMs`. `HealthService` now receives the application's injected `PrismaClient` (provided globally by `CommonModule`) and measures only the `SELECT 1` round trip. `@SkipThrottle({ general: true })` retained. Unit suite for health updated with a `createPrismaMock()`: **7/7 passed**, `tsc` clean.

**Regression:** full API suite re-run against a freshly reset, migrated, and seeded `fusionos_test` DB: **1034/1034 passed (34/34 files)**. Three transient finance failures observed mid-session were traced to leftover fixture rows in the long-lived dev DB colliding on unique constraints — NOT a regression (see §3).

**CI/CD integrity:** re-verified — no `continue-on-error`, `|| true`, or `set +e` anywhere in the workflow; all steps fail the job on error.

---

## PHASE 27 → PHASE 28 FINDING STATUS

| ID | Severity | Phase 27 description | Phase 28 status |
|----|----------|----------------------|-----------------|
| F-1 | MEDIUM | CI uses `db push` ⇒ RLS policies absent ⇒ RLS tests skip in CI | **RESOLVED** — `migrate deploy` + 2 enforcement steps; verified 100 RLS tables + 22/22 executed on scratch DB |
| F-2 | LOW | Health `latencyMs` includes PrismaClient init (~250ms), not raw DB time | **RESOLVED** — injected shared `PrismaClient`; `latencyMs` = `SELECT 1` round trip; 7/7 unit tests |
| F-3 | LOW | `npm run lint` broken repo-wide (no ESLint 9 flat config); CI unaffected | **RESOLVED** — flat config added; 197 errors fixed; 0 errors / 369 warnings; wired into api+web lint scripts |
| F-4 | INFO | Ollama not running — AI degraded by design; app healthy | **UNCHANGED** (environment; graceful degradation covered by passing tests) |
| F-5 | INFO | `20260913000001_reconcile_schema_drift` deliberately contains no RLS SQL | **UNCHANGED** (documented) |

---

## VERIFICATION MATRIX (all executed)

| Category | Result | Evidence |
|----------|--------|----------|
| Full API suite (fresh migrated test DB) | ✅ PASS | **1034/1034 passed, 34/34 files** — `npx vitest run --no-file-parallelism src/__tests__/` after `DROP SCHEMA` + `migrate deploy` (18 migrations) + seed on `fusionos_test` |
| RLS tests | ✅ PASS | **22/22 executed (0 skipped)** — RLS_ENABLED=true |
| RLS policy presence | ✅ PASS | 100 tables with `relrowsecurity = true` verified via `pg_class` on scratch DB `fusionos_ci_eq` |
| Health unit tests (F-2) | ✅ PASS | **7/7 passed** — `src/__tests__/services/health-unit.test.ts` |
| Lint — API (F-3) | ✅ PASS | `npx eslint "apps/api/src/**/*.{ts,tsx}"` → **0 errors, 283 warnings** |
| Lint — Web (F-3) | ✅ PASS | `npx eslint "apps/web/src/**/*.{ts,tsx}"` → **0 errors, 86 warnings** |
| Lint exit codes | ✅ PASS | Both exit 0 (warnings do not fail) |
| TypeScript — API | ✅ PASS | `npx tsc --noEmit --project apps/api/tsconfig.build.json` — exit 0 |
| TypeScript — Web | ✅ PASS | `npx tsc --noEmit --project apps/web/tsconfig.json` — exit 0 |
| CI integrity | ✅ VERIFIED | No `continue-on-error`, `|| true`, or `set +e` in `.github/workflows/ci.yml` |
| Seed | ✅ PASS | Dev seed completes against test DB |
| Scratch DB cleanup | ✅ PASS | `fusionos_ci_eq` dropped after verification |

---

## FINDING FIX DETAILS

### F-1 — CI RLS execution (`.github/workflows/ci.yml`)

Replaced the test-job DB initialization with `migrate deploy` and added two guard steps:

- **Apply migrations to test DB (migrate deploy — includes RLS):** `npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma`
- **Verify RLS policies present (migrated, not db push):** queries `pg_class` for `relrowsecurity = true` tables (expects 100) via `prisma db execute`.
- **RLS tests must EXECUTE (not skip):** dedicated run of `rls-tenant-isolation.test.ts`; fails the job unless the output matches `Tests\s+22 passed`.

Local verification mirrored the CI sequence against scratch DB `fusionos_ci_eq` (`migrate deploy` → RLS-policy count → seed → full suite). Result: 18 migrations applied, 100 RLS tables, RLS 22/22 executed, full suite 1034/1034; scratch DB dropped.

### F-3 — Repository-wide lint (`eslint.config.js`, `apps/api/package.json`, `apps/web/package.json`)

- Added flat config: parser for TS, `@typescript-eslint` recommended, `no-explicit-any: 'warn'` (pre-existing `any` is surfaced as visible, non-blocking warnings — consistent with the reported baseline), `no-empty` with `allowEmptyCatch: true` (intentional loader `catch {}` in the web app), and `@typescript-eslint/no-unused-vars` with `argsIgnorePattern`/`varsIgnorePattern: '^_'` (the standard convention for intentionally-unused parameters; the same convention already used across the codebase).
- Wired lint scripts: `apps/api/package.json` and `apps/web/package.json` → `lint: eslint "src/**/*.{ts,tsx}"`.
- **Fixed 197 errors** across the API sources, test suite, and web app instead of suppressing them: removed genuinely-unused imports and destructured members (agent/ai/attendance/auth/documents/notifications/finance/leave/projects/payroll/intelligence/scenario-orchestrator/automation), converted dead bindings of validation- and side-effect-bearing calls to awaited calls (analytics deleteReport, asset getAssignments, attendance clock-in, session refresh verify, finance updateAccount/postedEntry accounting, payroll createRun/period lookups), removed dead queries/lookups (notification template dedupe check, leave accrual idempotency re-check, payroll unused earnings accumulation), and renamed intentionally-unused parameters to the `_param` convention (`_dto`, `_timeout`, `_notes`, `_timezone`, etc.). `tsc` clean after every restoration of genuinely-used symbols (Prisma types in `agent.service.ts`, `getToolByName`, `afterAll` import in security-regression tests).

### F-2 — True DB latency in health checks (`health.service.ts`, `health-unit.test.ts`)

- `HealthService` constructor now injects `PrismaClient` (provided globally by the `@Global()` `CommonModule`) alongside the existing `RedisThrottlerStorage`.
- `checkDatabase()` measures only the round trip of `SELECT 1` and no longer constructs/per-disconnects a client per probe.
- Behavior unchanged: no `DATABASE_URL` → `unknown`; query failure → `down` with message; `@SkipThrottle({ general: true })` retained on the controller (the Phase 27 fix).
- `health-unit.test.ts` updated with `createPrismaMock()` (default `$queryRaw` resolves; degraded case overrides to reject); all constructions pass the injected mock. 7/7 passed.

---

## REGRESSION NOTE (3 observed failures — non-regression)

During the first full-suite attempt, three finance tests failed with `Unique constraint failed on (tenantId,companyId,expenseNumber)` / `(tenantId,companyId,code)`. Root cause was **leftover fixture rows in the long-lived dev database** from earlier runs colliding with the tests' deterministic codes/numbers — not a behavior change. The three changed `finance.service.ts` lines are import/parameter cleanup only and cannot affect uniqueness.

The correct methodology (identical to CI and the Phase 27 certification) is to run the suite against a **freshly migrated + seeded** test DB. That is exactly what was executed for the certified run:

```
DROP SCHEMA public CASCADE; CREATE SCHEMA public;   -- fusionos_test
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma   # 18 migrations
npx tsx packages/database/prisma/seed.ts
npx vitest run --no-file-parallelism src/__tests__/   → 1034 passed (34 files)
```

Result: **1034/1034 passed**, 0 skipped, 0 failures.

---

## REMAINING FINDINGS

| ID | Severity | Status | Detail |
|----|----------|--------|--------|
| F-4 | INFO | OPEN | Ollama not available in the dev environment; AI features degrade gracefully and the suite covers the degradation path. Requires staging/live Ollama for a full AI verification. |
| F-5 | INFO | OPEN | `20260913000001_reconcile_schema_drift` contains no RLS SQL by design; RLS lives wholly in `20260913000000_add_rls_tenant_isolation`. |
| RES | INFO | NEW | 369 `no-explicit-any` warnings remain at the intentional warn level (283 API / 86 web). They are visible and non-blocking; tightening them is a future refactor, outside this phase's scope. |

---

## EXACT NEXT ACTIONS

1. Stand up Ollama in staging and re-run the AI integration suite (F-4).
2. Optional: begin reducing `no-explicit-any` warnings in a dedicated refactor phase (RES).
3. Deploy through the normal release pipeline; CI now runs lint? (Note: CI currently gates typecheck/build/tests. A lint step is intentionally not added here to avoid gate changes late in release; recommended as a follow-up in the next phase.) 

---

## FINAL VERDICT

**Status: 🟢 GREEN**

Phase 28 closed all three Phase 27 follow-ups with executed verification: CI now runs `migrate deploy` and enforces RLS presence + RLS suite execution (F-1); repository lint is functional with 197 real errors fixed and 0 remaining (F-3); and health `latencyMs` now measures the true DB round trip (F-2). Full API regression on a freshly migrated/seeded test DB: **1034/1034 passed**. No error suppression introduced; no test disabled; no silent behavior change.

---

*Phase 28 completed — stack: API :3001, Web :3000, PostgreSQL :5432 (test DB: fusionos_test; scratch fusionos_ci_eq removed), Redis :6379.*
*Completion time: September 13, 2026, ~18:10 local.*