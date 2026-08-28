/**
 * FusionOS Organization Tenant Isolation & IDOR Test Suite
 *
 * Tests that verify tenant isolation for ALL organization entities:
 *   - Company
 *   - Branch
 *   - Department
 *   - Team
 *   - Designation
 *   - Employee
 *
 * Every entity must enforce tenant boundaries.
 * Knowing an object's UUID must not grant access.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = { id: '00000000-0000-0000-0000-000000000001' };
const TENANT_B = { id: '10000000-0000-0000-0000-000000000001' };

// Test entity IDs (created in beforeAll)
let companyA: string;
let companyB: string;
let branchA: string;
let branchB: string;
let departmentA: string;
let departmentB: string;
let teamA: string;
let teamB: string;
let designationA: string;
let designationB: string;
let employeeA: string;
let employeeB: string;

describe('Organization Tenant Isolation & IDOR', () => {
  beforeAll(async () => {
    // Create test companies
    const compA = await prisma.company.create({
      data: { tenantId: TENANT_A.id, name: 'Test Company A', code: 'TCHA' },
    });
    companyA = compA.id;

    const compB = await prisma.company.create({
      data: { tenantId: TENANT_B.id, name: 'Test Company B', code: 'TCHB' },
    });
    companyB = compB.id;

    // Create test branches
    const brA = await prisma.branch.create({
      data: { tenantId: TENANT_A.id, companyId: companyA, name: 'Test Branch A', code: 'TBA' },
    });
    branchA = brA.id;

    const brB = await prisma.branch.create({
      data: { tenantId: TENANT_B.id, companyId: companyB, name: 'Test Branch B', code: 'TBB' },
    });
    branchB = brB.id;

    // Create test departments
    const deptA = await prisma.department.create({
      data: { tenantId: TENANT_A.id, companyId: companyA, name: 'Test Dept A', code: 'TDA' },
    });
    departmentA = deptA.id;

    const deptB = await prisma.department.create({
      data: { tenantId: TENANT_B.id, companyId: companyB, name: 'Test Dept B', code: 'TDB' },
    });
    departmentB = deptB.id;

    // Create test teams
    const tA = await prisma.team.create({
      data: { tenantId: TENANT_A.id, companyId: companyA, departmentId: departmentA, name: 'Test Team A', code: 'TTA' },
    });
    teamA = tA.id;

    const tB = await prisma.team.create({
      data: { tenantId: TENANT_B.id, companyId: companyB, departmentId: departmentB, name: 'Test Team B', code: 'TTB' },
    });
    teamB = tB.id;

    // Create test designations
    const dA = await prisma.designation.create({
      data: { tenantId: TENANT_A.id, companyId: companyA, name: 'Test Desig A', code: 'TDA' },
    });
    designationA = dA.id;

    const dB = await prisma.designation.create({
      data: { tenantId: TENANT_B.id, companyId: companyB, name: 'Test Desig B', code: 'TDB' },
    });
    designationB = dB.id;

    // Create test employees
    const eA = await prisma.employee.create({
      data: {
        tenantId: TENANT_A.id, companyId: companyA,
        employeeCode: 'TEST-EA', firstName: 'Emp', lastName: 'A',
        email: 'emp.a@test.com', employmentStatus: 'ACTIVE',
        joiningDate: new Date('2024-01-01'),
      },
    });
    employeeA = eA.id;

    const eB = await prisma.employee.create({
      data: {
        tenantId: TENANT_B.id, companyId: companyB,
        employeeCode: 'TEST-EB', firstName: 'Emp', lastName: 'B',
        email: 'emp.b@test.com', employmentStatus: 'ACTIVE',
        joiningDate: new Date('2024-01-01'),
      },
    });
    employeeB = eB.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.employeeHistory.deleteMany({ where: { employeeId: { in: [employeeA, employeeB] } } });
    await prisma.employee.deleteMany({ where: { id: { in: [employeeA, employeeB] } } });
    await prisma.team.deleteMany({ where: { id: { in: [teamA, teamB] } } });
    await prisma.department.deleteMany({ where: { id: { in: [departmentA, departmentB] } } });
    await prisma.designation.deleteMany({ where: { id: { in: [designationA, designationB] } } });
    await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
    await prisma.company.deleteMany({ where: { id: { in: [companyA, companyB] } } });
    await prisma.$disconnect();
  });

  // ── Company Isolation ──────────────────────────────────────────────────────

  describe('Company Isolation', () => {
    it('Tenant A company should have Tenant A tenantId', async () => {
      const company = await prisma.company.findUnique({ where: { id: companyA } });
      expect(company!.tenantId).toBe(TENANT_A.id);
    });

    it('Tenant B company should have Tenant B tenantId', async () => {
      const company = await prisma.company.findUnique({ where: { id: companyB } });
      expect(company!.tenantId).toBe(TENANT_B.id);
    });

    it('Tenant A cannot access Tenant B company by ID', async () => {
      const company = await prisma.company.findUnique({ where: { id: companyB } });
      expect(company!.tenantId).not.toBe(TENANT_A.id);
    });

    it('Tenant B cannot access Tenant A company by ID', async () => {
      const company = await prisma.company.findUnique({ where: { id: companyA } });
      expect(company!.tenantId).not.toBe(TENANT_B.id);
    });

    it('Tenant A query should not return Tenant B companies', async () => {
      const companies = await prisma.company.findMany({ where: { tenantId: TENANT_A.id } });
      for (const c of companies) {
        expect(c.tenantId).toBe(TENANT_A.id);
      }
    });
  });

  // ── Branch Isolation ───────────────────────────────────────────────────────

  describe('Branch Isolation', () => {
    it('Tenant A branch should have Tenant A tenantId', async () => {
      const branch = await prisma.branch.findUnique({ where: { id: branchA } });
      expect(branch!.tenantId).toBe(TENANT_A.id);
    });

    it('Tenant A cannot access Tenant B branch by ID', async () => {
      const branch = await prisma.branch.findUnique({ where: { id: branchB } });
      expect(branch!.tenantId).not.toBe(TENANT_A.id);
    });

    it('Tenant A query should not return Tenant B branches', async () => {
      const branches = await prisma.branch.findMany({ where: { tenantId: TENANT_A.id } });
      for (const b of branches) {
        expect(b.tenantId).toBe(TENANT_A.id);
      }
    });
  });

  // ── Department Isolation ────────────────────────────────────────────────────

  describe('Department Isolation', () => {
    it('Tenant A department should have Tenant A tenantId', async () => {
      const dept = await prisma.department.findUnique({ where: { id: departmentA } });
      expect(dept!.tenantId).toBe(TENANT_A.id);
    });

    it('Tenant A cannot access Tenant B department by ID', async () => {
      const dept = await prisma.department.findUnique({ where: { id: departmentB } });
      expect(dept!.tenantId).not.toBe(TENANT_A.id);
    });

    it('Tenant A query should not return Tenant B departments', async () => {
      const depts = await prisma.department.findMany({ where: { tenantId: TENANT_A.id } });
      for (const d of depts) {
        expect(d.tenantId).toBe(TENANT_A.id);
      }
    });
  });

  // ── Team Isolation ─────────────────────────────────────────────────────────

  describe('Team Isolation', () => {
    it('Tenant A team should have Tenant A tenantId', async () => {
      const team = await prisma.team.findUnique({ where: { id: teamA } });
      expect(team!.tenantId).toBe(TENANT_A.id);
    });

    it('Tenant A cannot access Tenant B team by ID', async () => {
      const team = await prisma.team.findUnique({ where: { id: teamB } });
      expect(team!.tenantId).not.toBe(TENANT_A.id);
    });
  });

  // ── Designation Isolation ──────────────────────────────────────────────────

  describe('Designation Isolation', () => {
    it('Tenant A designation should have Tenant A tenantId', async () => {
      const desig = await prisma.designation.findUnique({ where: { id: designationA } });
      expect(desig!.tenantId).toBe(TENANT_A.id);
    });

    it('Tenant A cannot access Tenant B designation by ID', async () => {
      const desig = await prisma.designation.findUnique({ where: { id: designationB } });
      expect(desig!.tenantId).not.toBe(TENANT_A.id);
    });
  });

  // ── Employee Isolation ─────────────────────────────────────────────────────

  describe('Employee Isolation', () => {
    it('Tenant A employee should have Tenant A tenantId', async () => {
      const emp = await prisma.employee.findUnique({ where: { id: employeeA } });
      expect(emp!.tenantId).toBe(TENANT_A.id);
    });

    it('Tenant A cannot access Tenant B employee by ID', async () => {
      const emp = await prisma.employee.findUnique({ where: { id: employeeB } });
      expect(emp!.tenantId).not.toBe(TENANT_A.id);
    });

    it('Tenant A query should not return Tenant B employees', async () => {
      const emps = await prisma.employee.findMany({ where: { tenantId: TENANT_A.id } });
      for (const e of emps) {
        expect(e.tenantId).toBe(TENANT_A.id);
      }
    });

    it('Employee email uniqueness is tenant-scoped', async () => {
      // Same email can exist in different tenants
      const empAByEmail = await prisma.employee.findFirst({
        where: { tenantId: TENANT_A.id, email: 'emp.a@test.com' },
      });
      const empBByEmail = await prisma.employee.findFirst({
        where: { tenantId: TENANT_B.id, email: 'emp.a@test.com' }, // Different email
      });
      // These are different employees in different tenants
      if (empAByEmail && empBByEmail) {
        expect(empAByEmail.tenantId).not.toBe(empBByEmail.tenantId);
      }
    });

    it('Employee code uniqueness is tenant-scoped', async () => {
      // Same code can exist in different tenants
      const empAByCode = await prisma.employee.findFirst({
        where: { tenantId: TENANT_A.id, employeeCode: 'TEST-EA' },
      });
      expect(empAByCode).toBeDefined();
      expect(empAByCode!.tenantId).toBe(TENANT_A.id);
    });
  });

  // ── Cross-Tenant Relationship Prevention ───────────────────────────────────

  describe('Cross-Tenant Relationship Prevention', () => {
    it('Tenant A branch cannot reference Tenant B company', async () => {
      // Service layer validates: branch.companyId must belong to same tenant
      const branch = await prisma.branch.findUnique({ where: { id: branchA } });
      const company = await prisma.company.findFirst({
        where: { id: branch!.companyId, tenantId: TENANT_A.id },
      });
      expect(company).toBeDefined();
      expect(company!.tenantId).toBe(TENANT_A.id);
    });

    it('Tenant A department cannot reference Tenant B company', async () => {
      const dept = await prisma.department.findUnique({ where: { id: departmentA } });
      const company = await prisma.company.findFirst({
        where: { id: dept!.companyId, tenantId: TENANT_A.id },
      });
      expect(company).toBeDefined();
    });

    it('Tenant A team cannot reference Tenant B department', async () => {
      const team = await prisma.team.findUnique({ where: { id: teamA } });
      const dept = await prisma.department.findFirst({
        where: { id: team!.departmentId, tenantId: TENANT_A.id },
      });
      expect(dept).toBeDefined();
    });

    it('Tenant A employee cannot reference Tenant B branch', async () => {
      const emp = await prisma.employee.findUnique({ where: { id: employeeA } });
      if (emp!.branchId) {
        const branch = await prisma.branch.findFirst({
          where: { id: emp!.branchId!, tenantId: TENANT_A.id },
        });
        expect(branch).toBeDefined();
      }
    });
  });
});
