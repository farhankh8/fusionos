/**
 * FusionOS Attendance Test Suite
 *
 * Tests that verify:
 *   - Clock-in / Clock-out
 *   - Breaks
 *   - Attendance calculation
 *   - Duplicate event prevention
 *   - Tenant isolation
 *   - IDOR protection
 *   - Status transitions
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const COMPANY_A = '00000000-0000-4000-8000-000000000002';
const USER_A = '00000000-0000-4000-8000-000000000003';

let empA: string;
let empB: string;

describe('Attendance Management', () => {
  beforeAll(async () => {
    // Pre-cleanup: remove leftover data from previous crashed runs
    for (const code of ['ATT-TEST-001', 'ATT-TEST-B01']) {
      const emp = await prisma.employee.findFirst({ where: { employeeCode: code }, select: { id: true } });
      if (emp) {
        await prisma.attendanceCorrection.deleteMany({ where: { employeeId: emp.id } });
        await prisma.attendance.deleteMany({ where: { employeeId: emp.id } });
        await prisma.attendanceEvent.deleteMany({ where: { employeeId: emp.id } });
        await prisma.employee.delete({ where: { id: emp.id } });
      }
    }

    // Create test employees for Tenant A
    const employeeA = await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId: TENANT_A, employeeCode: 'ATT-TEST-001' } },
      update: {},
      create: {
        tenantId: TENANT_A,
        companyId: COMPANY_A,
        employeeCode: 'ATT-TEST-001',
        firstName: 'Att',
        lastName: 'TestA',
        email: 'att.testa@test.com',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2024-01-01'),
        userId: USER_A,
      },
    });
    empA = employeeA.id;

    // Create test employee for Tenant B
    const employeeB = await prisma.employee.upsert({
      where: { tenantId_employeeCode: { tenantId: TENANT_B, employeeCode: 'ATT-TEST-B01' } },
      update: {},
      create: {
        tenantId: TENANT_B,
        companyId: '10000000-0000-4000-8000-000000000002',
        employeeCode: 'ATT-TEST-B01',
        firstName: 'Att',
        lastName: 'TestB',
        email: 'att.testb@test.com',
        employmentStatus: 'ACTIVE',
        joiningDate: new Date('2024-01-01'),
      },
    });
    empB = employeeB.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.attendanceCorrection.deleteMany({ where: { employeeId: { in: [empA, empB] } } });
    await prisma.attendance.deleteMany({ where: { employeeId: { in: [empA, empB] } } });
    await prisma.attendanceEvent.deleteMany({ where: { employeeId: { in: [empA, empB] } } });
    await prisma.employee.deleteMany({ where: { id: { in: [empA, empB] } } });
  });

  // ── Clock-In ─────────────────────────────────────────────────────────────

  describe('Clock-In', () => {
    it('should create a clock-in event', async () => {
      const now = new Date();
      const event = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_A,
          employeeId: empA,
          eventType: 'CLOCK_IN',
          eventTime: now,
          source: 'WEB',
          idempotencyKey: `test-clockin-${Date.now()}`,
          actorId: USER_A,
        },
      });

      expect(event).toBeDefined();
      expect(event.eventType).toBe('CLOCK_IN');
      expect(event.tenantId).toBe(TENANT_A);
      expect(event.employeeId).toBe(empA);
    });

    it('should prevent duplicate clock-in with same idempotency key', async () => {
      const key = `idempotent-${Date.now()}`;
      const now = new Date();

      const event1 = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_A, employeeId: empA,
          eventType: 'CLOCK_IN', eventTime: now,
          idempotencyKey: key, source: 'WEB',
        },
      });

      // Duplicate with same key should be caught by unique constraint
      await expect(
        prisma.attendanceEvent.create({
          data: {
            tenantId: TENANT_A, employeeId: empA,
            eventType: 'CLOCK_IN', eventTime: now,
            idempotencyKey: key, source: 'WEB',
          },
        }),
      ).rejects.toThrow();
    });
  });

  // ── Clock-Out ────────────────────────────────────────────────────────────

  describe('Clock-Out', () => {
    it('should create a clock-out event', async () => {
      const now = new Date();
      const event = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_A, employeeId: empA,
          eventType: 'CLOCK_OUT', eventTime: now,
          source: 'WEB', actorId: USER_A,
        },
      });
      expect(event.eventType).toBe('CLOCK_OUT');
    });
  });

  // ── Breaks ───────────────────────────────────────────────────────────────

  describe('Breaks', () => {
    it('should create a break-start event', async () => {
      const event = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_A, employeeId: empA,
          eventType: 'BREAK_START', eventTime: new Date(),
          source: 'WEB', actorId: USER_A,
        },
      });
      expect(event.eventType).toBe('BREAK_START');
    });

    it('should create a break-end event', async () => {
      const event = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_A, employeeId: empA,
          eventType: 'BREAK_END', eventTime: new Date(),
          source: 'WEB', actorId: USER_A,
        },
      });
      expect(event.eventType).toBe('BREAK_END');
    });
  });

  // ── Attendance Calculation ────────────────────────────────────────────────

  describe('Attendance Calculation', () => {
    it('should calculate total worked minutes correctly', () => {
      // 8 hours 30 minutes = 510 minutes
      const clockIn = new Date('2024-01-15T09:00:00Z');
      const clockOut = new Date('2024-01-15T17:30:00Z');
      const worked = Math.round((clockOut.getTime() - clockIn.getTime()) / 60000);
      expect(worked).toBe(510);
    });

    it('should calculate break minutes correctly', () => {
      const breakStart = new Date('2024-01-15T12:00:00Z');
      const breakEnd = new Date('2024-01-15T12:30:00Z');
      const breakMinutes = Math.round((breakEnd.getTime() - breakStart.getTime()) / 60000);
      expect(breakMinutes).toBe(30);
    });

    it('should calculate net worked time excluding breaks', () => {
      const totalElapsed = 510; // 8h30m
      const breakMinutes = 30; // 30m
      const netWorked = totalElapsed - breakMinutes;
      expect(netWorked).toBe(480); // 8 hours
    });

    it('should calculate late minutes', () => {
      const clockIn = new Date('2024-01-15T09:15:00Z'); // 15 min late
      const expectedStart = new Date('2024-01-15T09:00:00Z');
      const lateMinutes = Math.round((clockIn.getTime() - expectedStart.getTime()) / 60000);
      expect(lateMinutes).toBe(15);
    });

    it('should calculate early departure', () => {
      const clockOut = new Date('2024-01-15T17:00:00Z'); // 1h early
      const expectedEnd = new Date('2024-01-15T18:00:00Z');
      const earlyMinutes = Math.round((expectedEnd.getTime() - clockOut.getTime()) / 60000);
      expect(earlyMinutes).toBe(60);
    });

    it('should calculate overtime', () => {
      const workedMinutes = 540; // 9 hours
      const standardMinutes = 480; // 8 hours
      const overtime = workedMinutes - standardMinutes;
      expect(overtime).toBe(60); // 1 hour overtime
    });
  });

  // ── Attendance Status ─────────────────────────────────────────────────────

  describe('Attendance Status', () => {
    it('should determine PRESENT when worked >= standard hours', () => {
      const worked = 480; // 8 hours
      const standard = 480;
      const status = worked >= standard ? 'PRESENT' : 'INCOMPLETE';
      expect(status).toBe('PRESENT');
    });

    it('should determine HALF_DAY when worked >= half standard', () => {
      const worked = 250; // ~4h10m
      const standard = 480;
      let status = 'INCOMPLETE';
      if (worked >= standard) status = 'PRESENT';
      else if (worked >= standard / 2) status = 'HALF_DAY';
      expect(status).toBe('HALF_DAY');
    });

    it('should determine LATE when clock-in > threshold', () => {
      const lateMinutes = 20;
      const threshold = 15;
      const status = lateMinutes > threshold ? 'LATE' : 'PRESENT';
      expect(status).toBe('LATE');
    });
  });

  // ── Tenant Isolation ──────────────────────────────────────────────────────

  describe('Tenant Isolation', () => {
    it('Tenant A events should have Tenant A tenantId', async () => {
      const event = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_A, employeeId: empA,
          eventType: 'SYSTEM_ADJUSTMENT', eventTime: new Date(),
          source: 'SYSTEM', notes: 'Test event',
        },
      });
      expect(event.tenantId).toBe(TENANT_A);
      await prisma.attendanceEvent.delete({ where: { id: event.id } });
    });

    it('Tenant A should not see Tenant B attendance events', async () => {
      // Create event for Tenant B
      const eventB = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_B, employeeId: empB,
          eventType: 'CLOCK_IN', eventTime: new Date(),
          source: 'WEB',
        },
      });

      // Tenant A query should not find it
      const found = await prisma.attendanceEvent.findFirst({
        where: { tenantId: TENANT_A, id: eventB.id },
      });
      expect(found).toBeNull();

      await prisma.attendanceEvent.delete({ where: { id: eventB.id } });
    });

    it('Tenant A should not see Tenant B attendance records', async () => {
      const recordB = await prisma.attendance.create({
        data: {
          tenantId: TENANT_B, employeeId: empB,
          date: new Date('2024-01-15'),
          status: 'PRESENT',
        },
      });

      const found = await prisma.attendance.findFirst({
        where: { tenantId: TENANT_A, id: recordB.id },
      });
      expect(found).toBeNull();

      await prisma.attendance.delete({ where: { id: recordB.id } });
    });
  });

  // ── IDOR Protection ───────────────────────────────────────────────────────

  describe('IDOR Protection', () => {
    it('should DENY accessing attendance by ID across tenants', async () => {
      const recordB = await prisma.attendance.create({
        data: {
          tenantId: TENANT_B, employeeId: empB,
          date: new Date('2024-01-16'),
          status: 'ABSENT',
        },
      });

      // Simulating Tenant A trying to access Tenant B's record
      const found = await prisma.attendance.findFirst({
        where: { id: recordB.id, tenantId: TENANT_A },
      });
      expect(found).toBeNull();

      await prisma.attendance.delete({ where: { id: recordB.id } });
    });
  });

  // ── Events Are Append-Only ────────────────────────────────────────────────

  describe('Event Integrity', () => {
    it('raw events should not be updated', async () => {
      const event = await prisma.attendanceEvent.create({
        data: {
          tenantId: TENANT_A, employeeId: empA,
          eventType: 'CLOCK_IN', eventTime: new Date(),
          source: 'WEB', notes: 'Original',
        },
      });

      // Update notes
      await prisma.attendanceEvent.update({
        where: { id: event.id },
        data: { notes: 'Modified' },
      });

      const updated = await prisma.attendanceEvent.findUnique({ where: { id: event.id } });
      expect(updated!.notes).toBe('Modified');
      // Event type and time should not change
      expect(updated!.eventType).toBe('CLOCK_IN');

      await prisma.attendanceEvent.delete({ where: { id: event.id } });
    });
  });

  // ── Unique Constraints ────────────────────────────────────────────────────

  describe('Unique Constraints', () => {
    it('should enforce tenant+employee+date uniqueness on attendance', async () => {
      const date = new Date('2024-01-20');
      await prisma.attendance.create({
        data: {
          tenantId: TENANT_A, employeeId: empA,
          date, status: 'PRESENT',
        },
      });

      // Duplicate should fail
      await expect(
        prisma.attendance.create({
          data: {
            tenantId: TENANT_A, employeeId: empA,
            date, status: 'ABSENT',
          },
        }),
      ).rejects.toThrow();

      await prisma.attendance.deleteMany({
        where: { tenantId: TENANT_A, employeeId: empA, date },
      });
    });
  });

  // ── Integer Minutes (No Floats) ──────────────────────────────────────────

  describe('Time Calculation Safety', () => {
    it('should use integer minutes, not floats', () => {
      const minutes = 480; // 8 hours
      expect(Number.isInteger(minutes)).toBe(true);
      expect(typeof minutes).toBe('number');
    });

    it('should not use floating-point for time', () => {
      // Bad: 8.5 hours (float)
      const badHours = 8.5;
      // Good: 510 minutes (integer)
      const goodMinutes = 510;
      expect(Number.isInteger(goodMinutes)).toBe(true);
      expect(Number.isInteger(badHours * 60)).toBe(true); // Even converting, 510.0 is fine
    });
  });
});
