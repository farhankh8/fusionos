/**
 * FusionOS Leave Management Tests
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_A_ID = '00000000-0000-0000-0000-000000000001';
const TENANT_B_ID = 'b0000000-0000-0000-0000-000000000001';
const COMPANY_A_ID = '00000000-0000-0000-0000-000000000002';

describe('Leave Management', () => {
  let leaveTypeIdA: string;
  let leaveTypeIdB: string;
  let employeeIdA: string;

  beforeAll(async () => {
    // Get or create employee (use upsert with unique code to avoid race conditions)
    const emp = await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId: TENANT_A_ID, employeeCode: 'TEST-LV-001' } },
      update: {},
      create: {
        tenantId: TENANT_A_ID, companyId: COMPANY_A_ID,
        employeeCode: 'TEST-LV-001', firstName: 'Leave', lastName: 'Test',
        email: 'leave-test@fusionos.dev', joiningDate: new Date('2026-01-01'),
      },
    });
    employeeIdA = emp.id;

    // Create leave types
    const ltA = await prisma.leaveType.create({
      data: { tenantId: TENANT_A_ID, name: 'Annual Leave', code: 'LV-ANNUAL', isPaid: true, requiresApproval: true },
    });
    leaveTypeIdA = ltA.id;

    const ltB = await prisma.leaveType.create({
      data: { tenantId: TENANT_B_ID, name: 'Annual Leave', code: 'LV-ANNUAL', isPaid: true, requiresApproval: true },
    });
    leaveTypeIdB = ltB.id;
  });

  it('should create a leave type', async () => {
    const lt = await prisma.leaveType.findUnique({ where: { id: leaveTypeIdA } });
    expect(lt).toBeTruthy();
    expect(lt?.name).toBe('Annual Leave');
    expect(lt?.isPaid).toBe(true);
  });

  it('should enforce unique code per tenant', async () => {
    await expect(
      prisma.leaveType.create({
        data: { tenantId: TENANT_A_ID, name: 'Annual 2', code: 'LV-ANNUAL', isPaid: true },
      })
    ).rejects.toThrow();
  });

  it('should allow same code in different tenants', async () => {
    const existing = await prisma.leaveType.findFirst({ where: { tenantId: TENANT_B_ID, code: 'LV-ANNUAL' } });
    expect(existing).toBeTruthy();
  });

  it('should create a leave request', async () => {
    const req = await prisma.leaveRequest.create({
      data: {
        tenantId: TENANT_A_ID, employeeId: employeeIdA, leaveTypeId: leaveTypeIdA,
        startDate: new Date('2026-09-01'), endDate: new Date('2026-09-05'),
        duration: 5, unit: 'FULL_DAY', reason: 'Vacation',
      },
    });
    expect(req.status).toBe('DRAFT');
  });

  it('should track status transitions', async () => {
    const req = await prisma.leaveRequest.findFirst({ where: { tenantId: TENANT_A_ID, employeeId: employeeIdA } });
    expect(req).toBeTruthy();
    await prisma.leaveRequest.update({ where: { id: req!.id }, data: { status: 'PENDING', submittedAt: new Date() } });
    const updated = await prisma.leaveRequest.findUnique({ where: { id: req!.id } });
    expect(updated?.status).toBe('PENDING');
  });

  it('should isolate data by tenant', async () => {
    const aTypes = await prisma.leaveType.findMany({ where: { tenantId: TENANT_A_ID } });
    const bTypes = await prisma.leaveType.findMany({ where: { tenantId: TENANT_B_ID } });
    expect(aTypes.length).toBeGreaterThan(0);
    expect(bTypes.length).toBeGreaterThan(0);
    for (const t of aTypes) expect(t.tenantId).toBe(TENANT_A_ID);
    for (const t of bTypes) expect(t.tenantId).toBe(TENANT_B_ID);
  });

  it('should create balance with ledger transaction', async () => {
    const balance = await prisma.leaveBalance.create({
      data: {
        tenantId: TENANT_A_ID, employeeId: employeeIdA, leaveTypeId: leaveTypeIdA,
        year: 2026, opening: 0, accrued: 20, used: 0, pending: 0,
        adjustments: 0, carryForward: 0, remaining: 20,
      },
    });
    const tx = await prisma.leaveBalanceTransaction.create({
      data: {
        tenantId: TENANT_A_ID, balanceId: balance.id, employeeId: employeeIdA,
        transactionType: 'ACCRUAL', amount: 20, reason: 'Annual accrual',
      },
    });
    expect(tx.amount).toBe(20);
    expect(tx.transactionType).toBe('ACCRUAL');
  });

  it('should enforce unique balance per employee per type per year', async () => {
    await expect(
      prisma.leaveBalance.create({
        data: {
          tenantId: TENANT_A_ID, employeeId: employeeIdA, leaveTypeId: leaveTypeIdA,
          year: 2026, opening: 0, accrued: 0, used: 0, pending: 0,
          adjustments: 0, carryForward: 0, remaining: 0,
        },
      })
    ).rejects.toThrow();
  });

  it('should create a holiday', async () => {
    const h = await prisma.holiday.create({
      data: { tenantId: TENANT_A_ID, name: 'Test Holiday', date: new Date('2026-12-25') },
    });
    expect(h.name).toBe('Test Holiday');
    expect(h.isActive).toBe(true);
  });

  it('should enforce unique holiday per tenant per date per name', async () => {
    await expect(
      prisma.holiday.create({
        data: { tenantId: TENANT_A_ID, name: 'Test Holiday', date: new Date('2026-12-25') },
      })
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await prisma.leaveBalanceTransaction.deleteMany({ where: { employeeId: employeeIdA } });
    await prisma.leaveBalance.deleteMany({ where: { employeeId: employeeIdA } });
    await prisma.leaveRequest.deleteMany({ where: { employeeId: employeeIdA } });
    await prisma.holiday.deleteMany({ where: { tenantId: TENANT_A_ID, name: 'Test Holiday' } });
    await prisma.leaveType.deleteMany({ where: { code: 'LV-ANNUAL' } });
    await prisma.employee.deleteMany({ where: { email: 'leave-test@fusionos.dev' } });
    await prisma.$disconnect();
  });
});
