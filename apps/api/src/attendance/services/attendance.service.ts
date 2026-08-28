/**
 * FusionOS Attendance Service
 *
 * The attendance engine that manages raw events and calculated results.
 *
 * Design:
 * - Raw events are immutable evidence (never overwritten)
 * - Calculated attendance is derived deterministically from valid events
 * - Corrections create new events and recalculate; originals are preserved
 * - All operations are tenant-scoped
 * - Uses integer minutes for all time calculations (never floats)
 * - Timezone-aware: attendance dates use employee timezone
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma, AttendanceEventType, AttendanceEventSource, AttendanceStatus } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import {
  ClockInDto,
  ClockOutDto,
  BreakStartDto,
  BreakEndDto,
  CreateCorrectionDto,
  ReviewCorrectionDto,
} from '../dto/attendance.dto';

// Default working hours (8 hours = 480 minutes)
const DEFAULT_WORKING_MINUTES = 480;
const DEFAULT_LATE_THRESHOLD_MINUTES = 15; // Grace period
const DEFAULT_OVERTIME_THRESHOLD_MINUTES = 0; // Minutes after standard hours

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(private readonly prisma: PrismaClient) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOCK IN
  // ═══════════════════════════════════════════════════════════════════════════

  async clockIn(ctx: TenantContext, dto: ClockInDto) {
    // Resolve employee (self or target)
    const employeeId = dto.employeeId ?? ctx.userId;
    const employee = await this.resolveEmployee(ctx, employeeId);

    const eventTime = dto.eventTime ? new Date(dto.eventTime) : new Date();
    const source = (dto.source ?? 'WEB') as AttendanceEventSource;

    // Check idempotency — prevent duplicate clock-in
    if (dto.idempotencyKey) {
      const existing = await this.prisma.attendanceEvent.findFirst({
        where: {
          tenantId: ctx.tenantId,
          idempotencyKey: dto.idempotencyKey,
        },
      });
      if (existing) {
        return existing; // Idempotent return
      }
    }

    // Check if already clocked in today (prevent duplicate)
    const today = this.getLocalDate(eventTime, employee.timezone ?? 'UTC');
    const todayStart = new Date(today);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const existingClockIn = await this.prisma.attendanceEvent.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        eventType: 'CLOCK_IN',
        eventTime: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existingClockIn) {
      throw new ConflictException(
        `Employee is already clocked in today at ${existingClockIn.eventTime.toISOString()}. Use clock-out first.`,
      );
    }

    // Create clock-in event (transaction: event + update/create attendance)
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.attendanceEvent.create({
        data: {
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          eventType: 'CLOCK_IN',
          eventTime,
          source,
          sourceRef: dto.sourceRef,
          idempotencyKey: dto.idempotencyKey,
          notes: dto.notes,
          actorId: ctx.userId,
        },
      });

      // Get or create today's attendance record
      const attendance = await this.getOrCreateAttendance(tx, ctx, employee.id, today);
      await this.recalculateAttendance(tx, employee.id, today, employee.timezone ?? 'UTC');

      this.logger.log(`Clock-in: employee=${employee.employeeCode} time=${eventTime.toISOString()} by=${ctx.userId}`);
      return event;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOCK OUT
  // ═══════════════════════════════════════════════════════════════════════════

  async clockOut(ctx: TenantContext, dto: ClockOutDto) {
    const employeeId = dto.employeeId ?? ctx.userId;
    const employee = await this.resolveEmployee(ctx, employeeId);

    const eventTime = dto.eventTime ? new Date(dto.eventTime) : new Date();
    const source = (dto.source ?? 'WEB') as AttendanceEventSource;

    // Check idempotency
    if (dto.idempotencyKey) {
      const existing = await this.prisma.attendanceEvent.findFirst({
        where: { tenantId: ctx.tenantId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    // Validate: must have clocked in today
    const today = this.getLocalDate(eventTime, employee.timezone ?? 'UTC');
    const todayStart = new Date(today); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setUTCHours(23, 59, 59, 999);

    const clockInEvent = await this.prisma.attendanceEvent.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        eventType: 'CLOCK_IN',
        eventTime: { gte: todayStart, lte: todayEnd },
      },
    });

    if (!clockInEvent) {
      throw new BadRequestException('No clock-in found for today. Clock in first.');
    }

    // Check already clocked out
    const existingClockOut = await this.prisma.attendanceEvent.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        eventType: 'CLOCK_OUT',
        eventTime: { gte: todayStart, lte: todayEnd },
      },
    });

    if (existingClockOut) {
      throw new ConflictException(
        `Employee already clocked out today at ${existingClockOut.eventTime.toISOString()}.`,
      );
    }

    // Validate: clock-out must be after clock-in
    if (eventTime <= clockInEvent.eventTime) {
      throw new BadRequestException('Clock-out time must be after clock-in time.');
    }

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.attendanceEvent.create({
        data: {
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          eventType: 'CLOCK_OUT',
          eventTime,
          source,
          idempotencyKey: dto.idempotencyKey,
          notes: dto.notes,
          actorId: ctx.userId,
        },
      });

      await this.recalculateAttendance(tx, employee.id, today, employee.timezone ?? 'UTC');

      this.logger.log(`Clock-out: employee=${employee.employeeCode} time=${eventTime.toISOString()} by=${ctx.userId}`);
      return event;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BREAKS
  // ═══════════════════════════════════════════════════════════════════════════

  async breakStart(ctx: TenantContext, dto: BreakStartDto) {
    const employeeId = dto.employeeId ?? ctx.userId;
    const employee = await this.resolveEmployee(ctx, employeeId);
    const eventTime = dto.eventTime ? new Date(dto.eventTime) : new Date();
    const source = (dto.source ?? 'WEB') as AttendanceEventSource;

    // Check idempotency
    if (dto.idempotencyKey) {
      const existing = await this.prisma.attendanceEvent.findFirst({
        where: { tenantId: ctx.tenantId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    // Validate: must have clocked in
    const today = this.getLocalDate(eventTime, employee.timezone ?? 'UTC');
    const todayStart = new Date(today); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setUTCHours(23, 59, 59, 999);

    const clockInEvent = await this.prisma.attendanceEvent.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        eventType: 'CLOCK_IN',
        eventTime: { gte: todayStart, lte: todayEnd },
      },
    });
    if (!clockInEvent) {
      throw new BadRequestException('No clock-in found for today.');
    }

    // Check no active break (break-start without break-end)
    const lastBreakEvent = await this.prisma.attendanceEvent.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        eventType: { in: ['BREAK_START', 'BREAK_END'] },
        eventTime: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { eventTime: 'desc' },
    });

    if (lastBreakEvent && lastBreakEvent.eventType === 'BREAK_START') {
      throw new ConflictException('Break already in progress. End current break first.');
    }

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.attendanceEvent.create({
        data: {
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          eventType: 'BREAK_START',
          eventTime,
          source,
          idempotencyKey: dto.idempotencyKey,
          actorId: ctx.userId,
        },
      });

      await this.recalculateAttendance(tx, employee.id, today, employee.timezone ?? 'UTC');
      return event;
    });
  }

  async breakEnd(ctx: TenantContext, dto: BreakEndDto) {
    const employeeId = dto.employeeId ?? ctx.userId;
    const employee = await this.resolveEmployee(ctx, employeeId);
    const eventTime = dto.eventTime ? new Date(dto.eventTime) : new Date();
    const source = (dto.source ?? 'WEB') as AttendanceEventSource;

    if (dto.idempotencyKey) {
      const existing = await this.prisma.attendanceEvent.findFirst({
        where: { tenantId: ctx.tenantId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    // Validate: must have break-start
    const today = this.getLocalDate(eventTime, employee.timezone ?? 'UTC');
    const todayStart = new Date(today); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setUTCHours(23, 59, 59, 999);

    const lastBreakEvent = await this.prisma.attendanceEvent.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        eventType: { in: ['BREAK_START', 'BREAK_END'] },
        eventTime: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { eventTime: 'desc' },
    });

    if (!lastBreakEvent || lastBreakEvent.eventType !== 'BREAK_START') {
      throw new BadRequestException('No active break to end.');
    }

    if (eventTime <= lastBreakEvent.eventTime) {
      throw new BadRequestException('Break end must be after break start.');
    }

    return this.prisma.$transaction(async (tx) => {
      const event = await tx.attendanceEvent.create({
        data: {
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          eventType: 'BREAK_END',
          eventTime,
          source,
          idempotencyKey: dto.idempotencyKey,
          actorId: ctx.userId,
        },
      });

      await this.recalculateAttendance(tx, employee.id, today, employee.timezone ?? 'UTC');
      return event;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TODAY'S ATTENDANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async getToday(ctx: TenantContext, employeeId?: string) {
    const targetId = employeeId ?? ctx.userId;
    const employee = await this.resolveEmployee(ctx, targetId);
    const now = new Date();
    const today = this.getLocalDate(now, employee.timezone ?? 'UTC');
    const todayStart = new Date(today); todayStart.setUTCHours(0, 0, 0, 0);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        date: todayStart,
      },
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            department: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Also get today's events
    const todayEnd = new Date(today); todayEnd.setUTCHours(23, 59, 59, 999);
    const events = await this.prisma.attendanceEvent.findMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        eventTime: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { eventTime: 'asc' },
    });

    return { attendance, events };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST ATTENDANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      employeeId?: string;
      departmentId?: string;
      branchId?: string;
      status?: string;
      recordStatus?: string;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1, limit = 20, employeeId, departmentId, branchId,
      status, recordStatus, startDate, endDate,
      sortBy = 'date', sortOrder = 'desc',
    } = params;

    // Build employee filter (must be in same tenant)
    const employeeFilter: Prisma.EmployeeWhereInput = {
      tenantId: ctx.tenantId,
      deletedAt: null,
      ...(employeeId && { id: employeeId }),
      ...(departmentId && { departmentId }),
      ...(branchId && { branchId }),
    };

    const employeeIds = await this.prisma.employee.findMany({
      where: employeeFilter,
      select: { id: true },
    });
    const ids = employeeIds.map((e) => e.id);

    const where: Prisma.AttendanceWhereInput = {
      tenantId: ctx.tenantId,
      employeeId: { in: ids },
      ...(status && { status: status as AttendanceStatus }),
      ...(recordStatus && { recordStatus: recordStatus as 'DRAFT' | 'CONFIRMED' | 'LOCKED' }),
      ...(startDate && endDate && {
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      }),
      ...(startDate && !endDate && { date: { gte: new Date(startDate) } }),
      ...(!startDate && endDate && { date: { lte: new Date(endDate) } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          employee: {
            select: {
              id: true, employeeCode: true, firstName: true, lastName: true,
              department: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return {
      data,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ONE
  // ═══════════════════════════════════════════════════════════════════════════

  async findOne(ctx: TenantContext, id: string) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true, employeeCode: true, firstName: true, lastName: true,
            department: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
        corrections: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!attendance) throw new NotFoundException('Attendance record not found');
    if (attendance.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: attendance belongs to another tenant');
    }

    // Get events for this attendance date
    const dateStart = new Date(attendance.date); dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(attendance.date); dateEnd.setUTCHours(23, 59, 59, 999);
    const events = await this.prisma.attendanceEvent.findMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: attendance.employeeId,
        eventTime: { gte: dateStart, lte: dateEnd },
      },
      orderBy: { eventTime: 'asc' },
    });

    return { ...attendance, events };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CORRECTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async createCorrection(ctx: TenantContext, dto: CreateCorrectionDto) {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: dto.attendanceId },
      include: { employee: true },
    });

    if (!attendance) throw new NotFoundException('Attendance record not found');
    if (attendance.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: attendance belongs to another tenant');
    }

    // Cannot correct locked records
    if (attendance.recordStatus === 'LOCKED') {
      throw new BadRequestException('Cannot correct locked attendance records.');
    }

    // Employee cannot correct their own attendance (only HR/manager)
    if (ctx.userId === attendance.employee.userId) {
      throw new ForbiddenException('Employees cannot correct their own attendance. Contact your manager.');
    }

    return this.prisma.attendanceCorrection.create({
      data: {
        tenantId: ctx.tenantId,
        attendanceId: dto.attendanceId,
        employeeId: attendance.employeeId,
        requestedBy: ctx.userId,
        correctionType: dto.correctionType,
        originalValue: dto.originalValue as unknown as Prisma.InputJsonValue,
        newValue: dto.newValue as unknown as Prisma.InputJsonValue,
        reason: dto.reason,
      },
    });
  }

  async reviewCorrection(ctx: TenantContext, correctionId: string, dto: ReviewCorrectionDto) {
    const correction = await this.prisma.attendanceCorrection.findUnique({
      where: { id: correctionId },
      include: { attendance: true },
    });

    if (!correction) throw new NotFoundException('Correction not found');
    if (correction.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: correction belongs to another tenant');
    }
    if (correction.status !== 'PENDING') {
      throw new BadRequestException('Correction has already been reviewed.');
    }
    // Cannot approve own correction
    if (correction.requestedBy === ctx.userId) {
      throw new ForbiddenException('Cannot review your own correction request.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.attendanceCorrection.update({
        where: { id: correctionId },
        data: {
          status: dto.status,
          reviewedBy: ctx.userId,
          reviewedAt: new Date(),
          reviewNotes: dto.reviewNotes,
        },
      });

      // If approved, apply the correction by creating a correction event and recalculating
      if (dto.status === 'APPROVED') {
        const attendance = await tx.attendance.findUnique({
          where: { id: correction.attendanceId },
          include: { employee: true },
        });
        if (attendance) {
          // Create a correction event
          await tx.attendanceEvent.create({
            data: {
              tenantId: ctx.tenantId,
              employeeId: correction.employeeId,
              eventType: 'MANUAL_CORRECTION',
              eventTime: new Date(),
              source: 'ADMIN',
              notes: `Correction approved: ${correction.correctionType} — ${correction.reason}`,
              actorId: ctx.userId,
              metadata: {
                correctionId: correction.id,
                correctionType: correction.correctionType,
                originalValue: correction.originalValue,
                newValue: correction.newValue,
              } as unknown as Prisma.InputJsonValue,
            },
          });

          // Recalculate attendance
          const dateStart = new Date(attendance.date); dateStart.setUTCHours(0, 0, 0, 0);
          await this.recalculateAttendance(tx, correction.employeeId, dateStart, attendance.employee.timezone ?? 'UTC');
        }
      }

      return result;
    });

    this.logger.log(`Correction ${dto.status.toLowerCase()}: id=${correctionId} by=${ctx.userId}`);
    return updated;
  }

  async listCorrections(
    ctx: TenantContext,
    params: { page?: number; limit?: number; status?: string; employeeId?: string } = {},
  ) {
    const { page = 1, limit = 20, status, employeeId } = params;

    const where: Prisma.AttendanceCorrectionWhereInput = {
      tenantId: ctx.tenantId,
      ...(status && { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' }),
      ...(employeeId && { employeeId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.attendanceCorrection.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
          attendance: { select: { id: true, date: true, status: true } },
        },
      }),
      this.prisma.attendanceCorrection.count({ where }),
    ]);

    return {
      data,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECALCULATION ENGINE (Deterministic, server-side)
  // ═══════════════════════════════════════════════════════════════════════════

  private async recalculateAttendance(
    tx: Prisma.TransactionClient,
    employeeId: string,
    date: Date,
    timezone: string,
  ) {
    const dateStart = new Date(date); dateStart.setUTCHours(0, 0, 0, 0);
    const dateEnd = new Date(date); dateEnd.setUTCHours(23, 59, 59, 999);

    // Get employee tenant info
    const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { tenantId: true } });
    if (!employee) return;

    // ── LEAVE INTEGRATION: Check for approved leave covering this date ──
    const approvedLeave = await tx.leaveRequest.findFirst({
      where: {
        tenantId: employee.tenantId,
        employeeId,
        status: 'APPROVED',
        startDate: { lte: dateEnd },
        endDate: { gte: dateStart },
      },
      include: { leaveType: { select: { id: true, name: true, isPaid: true } } },
    });

    if (approvedLeave) {
      // Employee has approved leave on this date — mark as ON_LEAVE
      await tx.attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId: employee.tenantId,
            employeeId,
            date: dateStart,
          },
        },
        create: {
          tenantId: employee.tenantId,
          employeeId,
          date: dateStart,
          status: 'ON_LEAVE',
          totalWorkedMinutes: 0,
          source: 'SYSTEM',
          calculatedAt: new Date(),
          notes: `Approved ${approvedLeave.leaveType?.isPaid ? 'paid' : 'unpaid'} leave: ${approvedLeave.leaveType?.name ?? approvedLeave.leaveTypeId}`,
        },
        update: {
          status: 'ON_LEAVE',
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          overtimeMinutes: 0,
          firstClockIn: null,
          lastClockOut: null,
          source: 'SYSTEM',
          calculatedAt: new Date(),
          notes: `Approved ${approvedLeave.leaveType?.isPaid ? 'paid' : 'unpaid'} leave: ${approvedLeave.leaveType?.name ?? approvedLeave.leaveTypeId}`,
        },
      });
      return;
    }

    // ── HOLIDAY INTEGRATION: Check for holidays on this date ──
    const holiday = await tx.holiday.findFirst({
      where: {
        tenantId: employee.tenantId,
        isActive: true,
        date: { gte: dateStart, lte: dateEnd },
      },
    });

    if (holiday) {
      await tx.attendance.upsert({
        where: {
          tenantId_employeeId_date: {
            tenantId: employee.tenantId,
            employeeId,
            date: dateStart,
          },
        },
        create: {
          tenantId: employee.tenantId,
          employeeId,
          date: dateStart,
          status: 'HOLIDAY',
          totalWorkedMinutes: 0,
          source: 'SYSTEM',
          calculatedAt: new Date(),
          notes: `Holiday: ${holiday.name}`,
        },
        update: {
          status: 'HOLIDAY',
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          overtimeMinutes: 0,
          firstClockIn: null,
          lastClockOut: null,
          source: 'SYSTEM',
          calculatedAt: new Date(),
          notes: `Holiday: ${holiday.name}`,
        },
      });
      return;
    }

    // Fetch all events for this employee on this date
    const events = await tx.attendanceEvent.findMany({
      where: {
        employeeId,
        eventTime: { gte: dateStart, lte: dateEnd },
      },
      orderBy: { eventTime: 'asc' },
    });

    // If no clock events, check if this is a working day
    if (events.length === 0) {
      // Check day of week — if weekend, mark as WEEK_OFF
      const dayOfWeek = dateStart.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        await tx.attendance.upsert({
          where: {
            tenantId_employeeId_date: {
              tenantId: employee.tenantId,
              employeeId,
              date: dateStart,
            },
          },
          create: {
            tenantId: employee.tenantId,
            employeeId,
            date: dateStart,
            status: 'WEEK_OFF',
            totalWorkedMinutes: 0,
            source: 'SYSTEM',
            calculatedAt: new Date(),
          },
          update: {
            status: 'WEEK_OFF',
            totalWorkedMinutes: 0,
            source: 'SYSTEM',
            calculatedAt: new Date(),
          },
        });
      }
      return;
    }

    // Extract clock events
    const clockIns = events.filter((e) => e.eventType === 'CLOCK_IN');
    const clockOuts = events.filter((e) => e.eventType === 'CLOCK_OUT');
    const breakStarts = events.filter((e) => e.eventType === 'BREAK_START');
    const breakEnds = events.filter((e) => e.eventType === 'BREAK_END');

    // First clock-in and last clock-out
    const firstClockIn = clockIns.length > 0 ? clockIns[0]!.eventTime : null;
    const lastClockOut = clockOuts.length > 0 ? clockOuts[clockOuts.length - 1]!.eventTime : null;

    // Calculate total break minutes (integer minutes)
    let totalBreakMinutes = 0;
    for (let i = 0; i < breakStarts.length; i++) {
      const start = breakStarts[i]!.eventTime;
      // Find matching break-end
      const matchingEnd = breakEnds.find(
        (e) => e.eventTime > start,
      );
      if (matchingEnd) {
        totalBreakMinutes += this.diffMinutes(start, matchingEnd.eventTime);
      }
    }

    // Calculate total worked minutes
    let totalWorkedMinutes = 0;
    if (firstClockIn && lastClockOut) {
      totalWorkedMinutes = this.diffMinutes(firstClockIn, lastClockOut) - totalBreakMinutes;
      if (totalWorkedMinutes < 0) totalWorkedMinutes = 0;
    }

    // Calculate late minutes (assume 9:00 AM local start)
    let lateMinutes = 0;
    if (firstClockIn) {
      const localClockIn = this.toLocalTime(firstClockIn, timezone);
      const expectedStart = new Date(localClockIn);
      expectedStart.setHours(9, 0, 0, 0); // 9:00 AM local
      if (localClockIn > expectedStart) {
        lateMinutes = this.diffMinutes(expectedStart, localClockIn);
      }
    }

    // Calculate early departure (assume 6:00 PM local end = 540 minutes from 9 AM)
    let earlyDepartureMinutes = 0;
    if (lastClockOut) {
      const localClockOut = this.toLocalTime(lastClockOut, timezone);
      const expectedEnd = new Date(localClockOut);
      expectedEnd.setHours(18, 0, 0, 0); // 6:00 PM local
      if (localClockOut < expectedEnd) {
        earlyDepartureMinutes = this.diffMinutes(localClockOut, expectedEnd);
      }
    }

    // Calculate overtime
    let overtimeMinutes = 0;
    if (totalWorkedMinutes > DEFAULT_WORKING_MINUTES + DEFAULT_OVERTIME_THRESHOLD_MINUTES) {
      overtimeMinutes = totalWorkedMinutes - DEFAULT_WORKING_MINUTES;
    }

    // Determine status
    let status: AttendanceStatus = 'INCOMPLETE';
    if (firstClockIn && lastClockOut) {
      if (totalWorkedMinutes >= DEFAULT_WORKING_MINUTES) {
        status = 'PRESENT';
      } else if (totalWorkedMinutes >= DEFAULT_WORKING_MINUTES / 2) {
        status = 'HALF_DAY';
      } else {
        status = 'PRESENT'; // Partial but clocked in/out
      }
      if (lateMinutes > DEFAULT_LATE_THRESHOLD_MINUTES) status = 'LATE';
      if (earlyDepartureMinutes > DEFAULT_LATE_THRESHOLD_MINUTES && status !== 'LATE') status = 'EARLY_DEPARTURE';
      if (overtimeMinutes > 0 && status === 'PRESENT') status = 'OVERTIME';
    } else if (firstClockIn && !lastClockOut) {
      status = 'INCOMPLETE'; // Clocked in but not out
    }

    // Upsert attendance record
    await tx.attendance.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId: employee.tenantId,
          employeeId,
          date: dateStart,
        },
      },
      create: {
        tenantId: employee.tenantId,
        employeeId,
        date: dateStart,
        status,
        firstClockIn,
        lastClockOut,
        totalWorkedMinutes,
        totalBreakMinutes,
        lateMinutes,
        earlyDepartureMinutes,
        overtimeMinutes,
        source: events[0]?.source ?? 'WEB',
        calculatedAt: new Date(),
      },
      update: {
        status,
        firstClockIn,
        lastClockOut,
        totalWorkedMinutes,
        totalBreakMinutes,
        lateMinutes,
        earlyDepartureMinutes,
        overtimeMinutes,
        source: events[0]?.source ?? 'WEB',
        calculatedAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async resolveEmployee(ctx: TenantContext, identifier: string) {
    // Try to find by userId first (self-service), then by employee ID
    let employee = await this.prisma.employee.findFirst({
      where: { userId: identifier, tenantId: ctx.tenantId, deletedAt: null },
    });

    if (!employee) {
      employee = await this.prisma.employee.findFirst({
        where: { id: identifier, tenantId: ctx.tenantId, deletedAt: null },
      });
    }

    if (!employee) {
      throw new NotFoundException('Employee not found in this tenant');
    }

    return employee;
  }

  private async getOrCreateAttendance(
    tx: Prisma.TransactionClient,
    ctx: TenantContext,
    employeeId: string,
    date: Date,
  ) {
    const dateStart = new Date(date); dateStart.setUTCHours(0, 0, 0, 0);

    return tx.attendance.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId: ctx.tenantId,
          employeeId,
          date: dateStart,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        employeeId,
        date: dateStart,
        status: 'INCOMPLETE',
      },
      update: {},
    });
  }

  /** Get the local date from a UTC timestamp using a timezone string */
  private getLocalDate(utcDate: Date, timezone?: string | null): Date {
    if (!timezone) return utcDate;
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
      });
      const parts = formatter.formatToParts(utcDate);
      const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
      const month = parts.find((p) => p.type === 'month')?.value ?? '01';
      const day = parts.find((p) => p.type === 'day')?.value ?? '01';
      return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    } catch {
      return utcDate;
    }
  }

  /** Convert a UTC timestamp to local time (for display calculations) */
  private toLocalTime(utcDate: Date, timezone?: string | null): Date {
    if (!timezone) return utcDate;
    try {
      const str = utcDate.toLocaleString('en-US', { timeZone: timezone });
      return new Date(str);
    } catch {
      return utcDate;
    }
  }

  /** Difference between two dates in integer minutes */
  private diffMinutes(a: Date, b: Date): number {
    return Math.abs(Math.round((b.getTime() - a.getTime()) / 60000));
  }
}
