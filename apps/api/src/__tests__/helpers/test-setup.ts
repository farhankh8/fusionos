/**
 * FusionOS Test Setup Helpers
 *
 * Shared utilities for test file isolation.
 * Provides pre-cleanup to handle leftover data from crashed/interrupted test runs.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Clean up all test-related data for specific employee codes.
 * Safe to call at the start of beforeAll — will not affect non-test data.
 */
export async function cleanupTestEmployees(employeeCodes: string[]) {
  if (employeeCodes.length === 0) return;

  // Find existing test employees
  const employees = await prisma.employee.findMany({
    where: { employeeCode: { in: employeeCodes } },
    select: { id: true },
  });
  const empIds = employees.map((e) => e.id);
  if (empIds.length === 0) return;

  // Clean up dependent records
  await prisma.payslip.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.payrollAdjustment.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.payrollLineItem.deleteMany({ where: { line: { employeeId: { in: empIds } } } });
  await prisma.payrollLine.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.leaveBalanceTransaction.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.attendanceCorrection.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.attendance.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.attendanceEvent.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.employeeHistory.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.salaryStructureComponent.deleteMany({ where: { salaryStructure: { employeeId: { in: empIds } } } });
  await prisma.salaryStructure.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: empIds } } });
}

/**
 * Clean up test data by tenant IDs and employee codes.
 */
export async function cleanupTenantTestData(tenantIds: string[], employeeCodes: string[]) {
  // Clean employees first
  if (employeeCodes.length > 0) {
    await cleanupTestEmployees(employeeCodes);
  }

  for (const tid of tenantIds) {
    await prisma.payslip.deleteMany({ where: { tenantId: tid } });
    await prisma.payrollAdjustment.deleteMany({ where: { tenantId: tid } });
    await prisma.payrollLineItem.deleteMany({ where: { tenantId: tid } });
    await prisma.payrollLine.deleteMany({ where: { tenantId: tid } });
    await prisma.payrollRun.deleteMany({ where: { tenantId: tid } });
    await prisma.payrollPeriod.deleteMany({ where: { tenantId: tid } });
    await prisma.salaryStructureComponent.deleteMany({ where: { tenantId: tid } });
    await prisma.salaryStructure.deleteMany({ where: { tenantId: tid } });
    await prisma.payrollComponent.deleteMany({ where: { tenantId: tid } });
    await prisma.payrollPolicy.deleteMany({ where: { tenantId: tid } });
    await prisma.leaveBalanceTransaction.deleteMany({ where: { tenantId: tid } });
    await prisma.leaveBalance.deleteMany({ where: { tenantId: tid } });
    await prisma.leaveRequest.deleteMany({ where: { tenantId: tid } });
    await prisma.leaveType.deleteMany({ where: { tenantId: tid } });
    await prisma.leavePolicy.deleteMany({ where: { tenantId: tid } });
    await prisma.holiday.deleteMany({ where: { tenantId: tid } });
    await prisma.attendanceCorrection.deleteMany({ where: { tenantId: tid } });
    await prisma.attendance.deleteMany({ where: { tenantId: tid } });
    await prisma.attendanceEvent.deleteMany({ where: { tenantId: tid } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
    await prisma.eventOutbox.deleteMany({ where: { tenantId: tid } });
    await prisma.team.deleteMany({ where: { tenantId: tid } });
    await prisma.department.deleteMany({ where: { tenantId: tid } });
    await prisma.designation.deleteMany({ where: { tenantId: tid } });
    await prisma.branch.deleteMany({ where: { tenantId: tid } });
    await prisma.company.deleteMany({ where: { tenantId: tid } });
  }
}
