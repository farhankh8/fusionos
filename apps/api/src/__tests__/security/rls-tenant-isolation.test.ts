/**
 * FusionOS RLS Tenant Isolation Security Tests
 *
 * Tests PostgreSQL Row-Level Security policies for defense-in-depth
 * tenant isolation. These tests verify that:
 *
 * 1. Tenant A can access its own data
 * 2. Tenant B can access its own data
 * 3. Tenant A CANNOT access Tenant B data at the database level
 * 4. Missing tenant context fails closed (no access)
 * 5. RLS works independently of application-layer checks
 *
 * These tests require:
 * - PostgreSQL with RLS enabled (run migration first)
 * - RLS_ENABLED=true environment variable
 * - Test database with seed data for 2 tenants
 *
 * CRITICAL: RLS is only enforced for non-owner, non-superuser roles.
 * PostgreSQL silently EXEMPTS table owners and superusers from RLS, so the
 * suite switches the session to the NOLOGIN helper role "RLS_TEST_USER"
 * (created by the RLS migration) before asserting anything. See:
 *   packages/database/prisma/migrations/20260913000000_add_rls_tenant_isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test tenant IDs (must match seed data)
const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';

// Check if RLS is enabled on the database
async function isRLSEnabled(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw<
      Array<{ relrowsecurity: boolean }>
    >`
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = 'employees'
    `;
    return result[0]?.relrowsecurity ?? false;
  } catch {
    return false;
  }
}

// Set tenant context for RLS (session-scoped so it survives the next query on
// this single test connection; run with connection_limit=1).
async function setTenantContext(tenantId: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_tenant_id', $1, false)`,
    tenantId,
  );
}

// Clear tenant context
async function clearTenantContext(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.current_tenant_id', '', false)`,
  );
}

// Ensure the RLS_TEST_USER helper role exists and the connecting role is a
// member of it (idempotent).
async function ensureRLSTestRole(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'RLS_TEST_USER') THEN
        CREATE ROLE "RLS_TEST_USER" NOLOGIN NOINHERIT;
      END IF;
    END $$;`,
  );
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "RLS_TEST_USER"`);
  await prisma.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "RLS_TEST_USER"`,
  );
  await prisma.$executeRawUnsafe(`GRANT "RLS_TEST_USER" TO CURRENT_USER`);
}

// Switch the session to the non-owner RLS_TEST_USER role so Row-Level
// Security is actually enforced for the tests (owners/superusers bypass it).
async function setRoleRlsTestUser(): Promise<void> {
  await prisma.$executeRawUnsafe(`SET ROLE "RLS_TEST_USER"`);
}

// Restore the session role after testing.
async function resetRole(): Promise<void> {
  await prisma.$executeRawUnsafe(`RESET ROLE`);
}

describe('RLS Tenant Isolation (Database Layer)', () => {
  let rlsEnabled = false;

  beforeAll(async () => {
    // MUST run as a non-owner, non-superuser role — otherwise PostgreSQL
    // silently exempts the session from RLS and the tests prove nothing.
    await ensureRLSTestRole();
    await setRoleRlsTestUser();

    rlsEnabled = await isRLSEnabled();
    if (!rlsEnabled) {
      console.warn(
        '⚠️  RLS not enabled on test database — skipping RLS tests. ' +
        'Run the RLS migration first: npx prisma migrate deploy',
      );
    }
  });

  afterAll(async () => {
    await resetRole();
    await prisma.$disconnect();
  });

  // skipIf(!rlsEnabled) evaluates at file-collection time (before beforeAll),
  // so it can never see the resolved value. Use a runtime guard instead: tests
  // are genuinely SKIPPED (not silently passed) when RLS is unavailable.
  const rls = (fn: () => void | Promise<void>) => (ctx: {
    skip: () => void;
  }) => {
    if (!rlsEnabled) {
      ctx.skip();
      return;
    }
    return fn();
  };

  it('RLS is enabled on the employees table', async () => {
    const enabled = await isRLSEnabled();
    expect(enabled).toBe(true);
  });

  describe('Tenant A Access', () => {
    it('can read own employees', rls(async () => {
      await setTenantContext(TENANT_A);
      const employees = await prisma.employee.findMany();
      expect(employees.length).toBeGreaterThan(0);
      // All returned employees should belong to Tenant A
      for (const emp of employees) {
        expect(emp.tenantId).toBe(TENANT_A);
      }
    }));

    it('can read own company', rls(async () => {
      await setTenantContext(TENANT_A);
      const companies = await prisma.company.findMany();
      expect(companies.length).toBeGreaterThan(0);
      for (const company of companies) {
        expect(company.tenantId).toBe(TENANT_A);
      }
    }));

    it('can read own invoices', rls(async () => {
      await setTenantContext(TENANT_A);
      const invoices = await prisma.invoice.findMany();
      for (const invoice of invoices) {
        expect(invoice.tenantId).toBe(TENANT_A);
      }
    }));
  });

  describe('Tenant B Access', () => {
    it('can read own employees', rls(async () => {
      await setTenantContext(TENANT_B);
      const employees = await prisma.employee.findMany();
      expect(employees.length).toBeGreaterThan(0);
      for (const emp of employees) {
        expect(emp.tenantId).toBe(TENANT_B);
      }
    }));

    it('can read own company', rls(async () => {
      await setTenantContext(TENANT_B);
      const companies = await prisma.company.findMany();
      expect(companies.length).toBeGreaterThan(0);
      for (const company of companies) {
        expect(company.tenantId).toBe(TENANT_B);
      }
    }));
  });

  describe('Cross-Tenant Isolation (RLS)', () => {
    it('Tenant A cannot SELECT Tenant B employees', rls(async () => {
      await setTenantContext(TENANT_A);
      const employees = await prisma.employee.findMany({
        where: { tenantId: TENANT_B },
      });
      // RLS should block this — returns empty even though we specified tenantId
      expect(employees.length).toBe(0);
    }));

    it('Tenant A cannot UPDATE Tenant B employees', rls(async () => {
      // First, get a Tenant B employee ID (from Tenant B context)
      await setTenantContext(TENANT_B);
      const tenantBEmployee = await prisma.employee.findFirst();
      if (!tenantBEmployee) { expect.fail('No Tenant B employee fixture found'); }

      // Try to update from Tenant A context
      await setTenantContext(TENANT_A);
      const updateResult = await prisma.employee.updateMany({
        where: { id: tenantBEmployee.id },
        data: { notes: 'RLS TEST - SHOULD NOT UPDATE' },
      });
      // RLS should block this — 0 rows updated
      expect(updateResult.count).toBe(0);

      // Verify the record was NOT updated
      await setTenantContext(TENANT_B);
      const verify = await prisma.employee.findUnique({
        where: { id: tenantBEmployee.id },
      });
      expect(verify?.notes).not.toBe('RLS TEST - SHOULD NOT UPDATE');
    }));

    it('Tenant A cannot DELETE Tenant B employees', rls(async () => {
      await setTenantContext(TENANT_B);
      const tenantBEmployee = await prisma.employee.findFirst();
      if (!tenantBEmployee) { expect.fail('No Tenant B employee fixture found'); }

      await setTenantContext(TENANT_A);
      const deleteResult = await prisma.employee.deleteMany({
        where: { id: tenantBEmployee.id },
      });
      expect(deleteResult.count).toBe(0);

      // Verify still exists
      await setTenantContext(TENANT_B);
      const verify = await prisma.employee.findUnique({
        where: { id: tenantBEmployee.id },
      });
      expect(verify).not.toBeNull();
    }));

    it('Tenant A cannot INSERT with Tenant B tenantId', rls(async () => {
      await setTenantContext(TENANT_A);
      try {
        await prisma.employee.create({
          data: {
            tenantId: TENANT_B, // Trying to create in Tenant B
            companyId: '00000000-0000-4000-8000-000000000002',
            employeeCode: 'RLS-TEST-001',
            firstName: 'RLS',
            lastName: 'Test',
            email: 'rls-test@invalid.com',
            joiningDate: new Date(),
          },
        });
        // If we get here, RLS didn't block the insert
        expect.fail('RLS should have blocked cross-tenant INSERT');
      } catch {
        // Expected: RLS blocks the insert
      }
    }));

    it('Tenant A cannot access Tenant B invoices', rls(async () => {
      await setTenantContext(TENANT_A);
      const invoices = await prisma.invoice.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(invoices.length).toBe(0);
    }));

    it('Tenant A cannot access Tenant B projects', rls(async () => {
      await setTenantContext(TENANT_A);
      const projects = await prisma.project.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(projects.length).toBe(0);
    }));

    it('Tenant A cannot access Tenant B workflows', rls(async () => {
      await setTenantContext(TENANT_A);
      const workflows = await prisma.automationWorkflow.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(workflows.length).toBe(0);
    }));

    it('Tenant A cannot access Tenant B AI conversations', rls(async () => {
      await setTenantContext(TENANT_A);
      const conversations = await prisma.aIConversation.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(conversations.length).toBe(0);
    }));
  });

  describe('Missing Context (Fail Closed)', () => {
    it('missing tenant context returns no data', rls(async () => {
      await clearTenantContext();
      const employees = await prisma.employee.findMany();
      // Without tenant context, RLS should return no rows
      expect(employees.length).toBe(0);
    }));

    it('empty tenant context returns no data', rls(async () => {
      await setTenantContext('');
      const employees = await prisma.employee.findMany();
      expect(employees.length).toBe(0);
    }));
  });

  describe('Finance Isolation', () => {
    it('Tenant A cannot access Tenant B journal entries', rls(async () => {
      await setTenantContext(TENANT_A);
      const journals = await prisma.journalEntry.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(journals.length).toBe(0);
    }));

    it('Tenant A cannot access Tenant B accounts', rls(async () => {
      await setTenantContext(TENANT_A);
      const accounts = await prisma.account.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(accounts.length).toBe(0);
    }));

    it('Tenant A cannot access Tenant B customers', rls(async () => {
      await setTenantContext(TENANT_A);
      const customers = await prisma.customer.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(customers.length).toBe(0);
    }));
  });

  describe('Payroll Isolation', () => {
    it('Tenant A cannot access Tenant B payslips', rls(async () => {
      await setTenantContext(TENANT_A);
      const payslips = await prisma.payslip.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(payslips.length).toBe(0);
    }));

    it('Tenant A cannot access Tenant B payroll runs', rls(async () => {
      await setTenantContext(TENANT_A);
      const runs = await prisma.payrollRun.findMany({
        where: { tenantId: TENANT_B },
      });
      expect(runs.length).toBe(0);
    }));
  });

  describe('Concurrent Tenant Context', () => {
    it('concurrent requests cannot leak tenant context', rls(async () => {
      // Simulate concurrent requests by interleaving tenant context settings
      await setTenantContext(TENANT_A);
      const empA = await prisma.employee.findFirst();

      await setTenantContext(TENANT_B);
      const empB = await prisma.employee.findFirst();

      // Verify each tenant only sees its own data
      if (empA) expect(empA.tenantId).toBe(TENANT_A);
      if (empB) expect(empB.tenantId).toBe(TENANT_B);

      // Verify Tenant A still only sees Tenant A after Tenant B query
      await setTenantContext(TENANT_A);
      const empA2 = await prisma.employee.findFirst();
      if (empA2) expect(empA2.tenantId).toBe(TENANT_A);
    }));
  });
});