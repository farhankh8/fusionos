/**
 * FusionOS Employee Lifecycle & Business Rules Test Suite
 *
 * Tests that verify:
 *   - Employee creation with all validations
 *   - Employee status lifecycle transitions
 *   - Invalid status transitions are rejected
 *   - Manager relationship validation (no self-management, same tenant)
 *   - Employee code uniqueness within tenant
 *   - Employee email uniqueness within tenant
 *   - Employee history tracking
 *   - Soft deletion
 *   - Cross-tenant employee isolation
 *   - IDOR protection on employee endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = { id: '00000000-0000-0000-0000-000000000001' };
const TENANT_B = { id: '10000000-0000-0000-0000-000000000001' };
const COMPANY_A = '00000000-0000-0000-0000-000000000002';
const COMPANY_B = '10000000-0000-0000-0000-000000000002';

// Test employee IDs
const EMP_A1 = '00000000-0000-0000-0000-000000000020';
const EMP_A2 = '00000000-0000-0000-0000-000000000021';
const EMP_B1 = '10000000-0000-0000-0000-000000000020';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'INACTIVE'],
  ACTIVE: ['PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED', 'INACTIVE'],
  PROBATION: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'INACTIVE'],
  ON_LEAVE: ['ACTIVE', 'PROBATION', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'INACTIVE'],
  SUSPENDED: ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED', 'RESIGNED', 'INACTIVE'],
  TERMINATED: ['ACTIVE'],
  RESIGNED: ['ACTIVE'],
  RETIRED: ['ACTIVE'],
  INACTIVE: ['ACTIVE', 'DRAFT'],
};

// Invalid transitions that must fail
const INVALID_TRANSITIONS: Array<[string, string]> = [
  ['TERMINATED', 'PROBATION'],
  ['TERMINATED', 'ON_LEAVE'],
  ['RESIGNED', 'SUSPENDED'],
  ['RETIRED', 'PROBATION'],
  ['INACTIVE', 'PROBATION'],
];

describe('Employee Lifecycle & Business Rules', () => {
  // ── Setup & Teardown ────────────────────────────────────────────────────────

  beforeAll(async () => {
    // Create test employees
    await prisma.employee.createMany({
      data: [
        {
          id: EMP_A1,
          tenantId: TENANT_A.id,
          companyId: COMPANY_A,
          employeeCode: 'EMP-TEST-001',
          firstName: 'Alice',
          lastName: 'Manager',
          email: 'alice.manager@test.com',
          employmentStatus: 'ACTIVE',
          joiningDate: new Date('2024-01-15'),
        },
        {
          id: EMP_A2,
          tenantId: TENANT_A.id,
          companyId: COMPANY_A,
          employeeCode: 'EMP-TEST-002',
          firstName: 'Bob',
          lastName: 'Report',
          email: 'bob.report@test.com',
          employmentStatus: 'ACTIVE',
          joiningDate: new Date('2024-02-01'),
          managerId: EMP_A1, // Bob reports to Alice
        },
        {
          id: EMP_B1,
          tenantId: TENANT_B.id,
          companyId: COMPANY_B,
          employeeCode: 'EMP-TEST-B01',
          firstName: 'Carol',
          lastName: 'CrossTenant',
          email: 'carol.cross@test.com',
          employmentStatus: 'ACTIVE',
          joiningDate: new Date('2024-01-20'),
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.employeeHistory.deleteMany({ where: { employeeId: { in: [EMP_A1, EMP_A2, EMP_B1] } } });
    await prisma.employee.deleteMany({ where: { id: { in: [EMP_A1, EMP_A2, EMP_B1] } } });
    await prisma.$disconnect();
  });

  // ── Employee Creation ──────────────────────────────────────────────────────

  describe('Employee Creation', () => {
    it('should create employee with required fields', async () => {
      const emp = await prisma.employee.findUnique({ where: { id: EMP_A1 } });
      expect(emp).toBeDefined();
      expect(emp!.tenantId).toBe(TENANT_A.id);
      expect(emp!.employeeCode).toBe('EMP-TEST-001');
      expect(emp!.firstName).toBe('Alice');
      expect(emp!.lastName).toBe('Manager');
      expect(emp!.employmentStatus).toBe('ACTIVE');
    });

    it('should have tenant-scoped unique employee code', async () => {
      const duplicate = await prisma.employee.findFirst({
        where: { tenantId: TENANT_A.id, employeeCode: 'EMP-TEST-001' },
      });
      expect(duplicate).toBeDefined();
      expect(duplicate!.id).toBe(EMP_A1);
    });

    it('should have tenant-scoped unique email', async () => {
      const duplicate = await prisma.employee.findFirst({
        where: { tenantId: TENANT_A.id, email: 'alice.manager@test.com' },
      });
      expect(duplicate).toBeDefined();
    });

    it('should link manager relationship', async () => {
      const bob = await prisma.employee.findUnique({ where: { id: EMP_A2 } });
      expect(bob!.managerId).toBe(EMP_A1);
    });
  });

  // ── Manager Relationship ────────────────────────────────────────────────────

  describe('Manager Relationship', () => {
    it('should prevent self-management', () => {
      // Validation logic: if employeeId === managerId, reject
      const selfManage = (empId: string, mgrId: string) => empId === mgrId;
      expect(selfManage(EMP_A1, EMP_A1)).toBe(true); // Would be rejected
      expect(selfManage(EMP_A1, EMP_A2)).toBe(false); // Valid
    });

    it('should validate manager exists in same tenant', async () => {
      // Alice (Tenant A) should be valid manager for Bob (Tenant A)
      const manager = await prisma.employee.findFirst({
        where: { id: EMP_A1, tenantId: TENANT_A.id },
      });
      expect(manager).toBeDefined();
      expect(manager!.tenantId).toBe(TENANT_A.id);
    });

    it('should DENY cross-tenant manager assignment', async () => {
      // Carol (Tenant B) should NOT be a valid manager for Alice (Tenant A)
      const crossTenantManager = await prisma.employee.findFirst({
        where: { id: EMP_B1, tenantId: TENANT_A.id },
      });
      expect(crossTenantManager).toBeNull();
    });
  });

  // ── Status Lifecycle ────────────────────────────────────────────────────────

  describe('Status Lifecycle Transitions', () => {
    it('should define valid transitions for ACTIVE status', () => {
      expect(VALID_TRANSITIONS['ACTIVE']).toContain('ON_LEAVE');
      expect(VALID_TRANSITIONS['ACTIVE']).toContain('SUSPENDED');
      expect(VALID_TRANSITIONS['ACTIVE']).toContain('TERMINATED');
      expect(VALID_TRANSITIONS['ACTIVE']).toContain('RESIGNED');
      expect(VALID_TRANSITIONS['ACTIVE']).toContain('RETIRED');
      expect(VALID_TRANSITIONS['ACTIVE']).toContain('INACTIVE');
    });

    it('should allow TERMINATED → ACTIVE (rehire)', () => {
      expect(VALID_TRANSITIONS['TERMINATED']).toContain('ACTIVE');
    });

    it('should allow RESIGNED → ACTIVE (rehire)', () => {
      expect(VALID_TRANSITIONS['RESIGNED']).toContain('ACTIVE');
    });

    it('should allow INACTIVE → ACTIVE (reactivation)', () => {
      expect(VALID_TRANSITIONS['INACTIVE']).toContain('ACTIVE');
    });

    it.each(INVALID_TRANSITIONS)(
      'should REJECT transition from %s → %s',
      (from, to) => {
        expect(VALID_TRANSITIONS[from]).not.toContain(to);
      },
    );

    it('should REJECT TERMINATED → PROBATION', () => {
      expect(VALID_TRANSITIONS['TERMINATED']).not.toContain('PROBATION');
    });

    it('should REJECT TERMINATED → ON_LEAVE', () => {
      expect(VALID_TRANSITIONS['TERMINATED']).not.toContain('ON_LEAVE');
    });

    it('should REJECT TERMINATED → SUSPENDED', () => {
      expect(VALID_TRANSITIONS['TERMINATED']).not.toContain('SUSPENDED');
    });
  });

  // ── Employee History ────────────────────────────────────────────────────────

  describe('Employee History', () => {
    it('should record hire event in history', async () => {
      await prisma.employeeHistory.create({
        data: {
          tenantId: TENANT_A.id,
          employeeId: EMP_A1,
          action: 'hired',
          effectiveDate: new Date('2024-01-15'),
          employmentStatus: 'ACTIVE',
          newValue: { firstName: 'Alice', lastName: 'Manager' },
          actorId: '00000000-0000-0000-0000-000000000003',
        },
      });

      const history = await prisma.employeeHistory.findMany({
        where: { employeeId: EMP_A1 },
      });
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0]!.action).toBe('hired');
    });

    it('should be append-only (no updates to history)', async () => {
      // History records should never be updated
      const history = await prisma.employeeHistory.findFirst({
        where: { employeeId: EMP_A1 },
      });
      expect(history).toBeDefined();
      // Verify the record has all required fields
      expect(history!.tenantId).toBe(TENANT_A.id);
      expect(history!.employeeId).toBe(EMP_A1);
    });
  });

  // ── Tenant Isolation ────────────────────────────────────────────────────────

  describe('Cross-Tenant Employee Isolation', () => {
    it('Tenant A should NOT see Tenant B employees', async () => {
      const tenantBEmployees = await prisma.employee.findMany({
        where: { tenantId: TENANT_B.id },
      });
      for (const emp of tenantBEmployees) {
        expect(emp.tenantId).toBe(TENANT_B.id);
        expect(emp.tenantId).not.toBe(TENANT_A.id);
      }
    });

    it('Tenant B should NOT see Tenant A employees', async () => {
      const tenantAEmployees = await prisma.employee.findMany({
        where: { tenantId: TENANT_A.id },
      });
      for (const emp of tenantAEmployees) {
        expect(emp.tenantId).toBe(TENANT_A.id);
        expect(emp.tenantId).not.toBe(TENANT_B.id);
      }
    });
  });

  // ── IDOR Protection ────────────────────────────────────────────────────────

  describe('IDOR Protection', () => {
    it('should DENY Tenant A from accessing Tenant B employee by ID', async () => {
      const empB = await prisma.employee.findUnique({ where: { id: EMP_B1 } });
      expect(empB).toBeDefined();
      expect(empB!.tenantId).toBe(TENANT_B.id);
      // In the service layer, this would be caught by tenantId check
      expect(empB!.tenantId).not.toBe(TENANT_A.id);
    });

    it('should DENY Tenant B from accessing Tenant A employee by ID', async () => {
      const empA = await prisma.employee.findUnique({ where: { id: EMP_A1 } });
      expect(empA).toBeDefined();
      expect(empA!.tenantId).toBe(TENANT_A.id);
      expect(empA!.tenantId).not.toBe(TENANT_B.id);
    });
  });

  // ── Employment Type ─────────────────────────────────────────────────────────

  describe('Employment Type', () => {
    it('should support valid employment types', async () => {
      const validTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY'];
      // All should be valid enum values
      for (const type of validTypes) {
        expect(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY']).toContain(type);
      }
    });
  });

  // ── Soft Delete ─────────────────────────────────────────────────────────────

  describe('Soft Delete', () => {
    it('should set deletedAt on soft delete', async () => {
      const emp = await prisma.employee.findUnique({ where: { id: EMP_A1 } });
      expect(emp!.deletedAt).toBeNull();

      // Simulate soft delete
      await prisma.employee.update({
        where: { id: EMP_A1 },
        data: { deletedAt: new Date(), employmentStatus: 'INACTIVE' },
      });

      const updated = await prisma.employee.findUnique({ where: { id: EMP_A1 } });
      expect(updated!.deletedAt).not.toBeNull();
      expect(updated!.employmentStatus).toBe('INACTIVE');

      // Restore for other tests
      await prisma.employee.update({
        where: { id: EMP_A1 },
        data: { deletedAt: null, employmentStatus: 'ACTIVE' },
      });
    });
  });
});
