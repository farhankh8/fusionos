/**
 * FusionOS Leave Service
 *
 * The leave management engine handling types, policies, balances, requests, and holidays.
 *
 * Design:
 * - Balance is ledger-based (never silently mutated)
 * - Duration is calculated server-side (never trusted from client)
 * - Overlaps are prevented
 * - State transitions are explicit and enforced
 * - Approved leave integrates with attendance (ON_LEAVE status)
 * - All operations are tenant-scoped
 * - Uses integer days for all calculations (never floats)
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma, LeaveRequestStatus } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { EventPublisherService } from '../../common/services/event-publisher.service';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  CreateLeavePolicyDto,
  UpdateLeavePolicyDto,
  CreateLeaveRequestDto,
  ReviewLeaveRequestDto,
  CancelLeaveRequestDto,
  CreateHolidayDto,
  UpdateHolidayDto,
  AdjustBalanceDto,
} from '../dto/leave.dto';

// Valid state transitions for LeaveRequest
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING'],
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
};

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE TYPES
  // ═══════════════════════════════════════════════════════════════════════════

  async createLeaveType(ctx: TenantContext, dto: CreateLeaveTypeDto) {
    // Check duplicate code
    const existing = await this.prisma.leaveType.findFirst({
      where: { tenantId: ctx.tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Leave type with code "${dto.code}" already exists.`);
    }

    return this.prisma.leaveType.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        description: dto.description,
        isPaid: dto.isPaid,
        requiresApproval: dto.requiresApproval,
        requiresDocument: dto.requiresDocument,
        allowHalfDay: dto.allowHalfDay,
        allowHourly: dto.allowHourly,
        maxAccrualDays: dto.maxAccrualDays,
      },
    });
  }

  async findAllLeaveTypes(ctx: TenantContext) {
    return this.prisma.leaveType.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOneLeaveType(ctx: TenantContext, id: string) {
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!leaveType) throw new NotFoundException('Leave type not found');
    if (leaveType.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: leave type belongs to another tenant');
    }
    return leaveType;
  }

  async updateLeaveType(ctx: TenantContext, id: string, dto: UpdateLeaveTypeDto) {
    const leaveType = await this.findOneLeaveType(ctx, id);
    const data: Prisma.LeaveTypeUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isPaid !== undefined) data.isPaid = dto.isPaid;
    if (dto.requiresApproval !== undefined) data.requiresApproval = dto.requiresApproval;
    if (dto.requiresDocument !== undefined) data.requiresDocument = dto.requiresDocument;
    if (dto.allowHalfDay !== undefined) data.allowHalfDay = dto.allowHalfDay;
    if (dto.allowHourly !== undefined) data.allowHourly = dto.allowHourly;
    if (dto.maxAccrualDays !== undefined) data.maxAccrualDays = dto.maxAccrualDays;
    if (dto.status !== undefined) data.status = dto.status as any;
    return this.prisma.leaveType.update({ where: { id: leaveType.id }, data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE POLICIES
  // ═══════════════════════════════════════════════════════════════════════════

  async createLeavePolicy(ctx: TenantContext, dto: CreateLeavePolicyDto) {
    // Validate leave type exists in tenant
    await this.findOneLeaveType(ctx, dto.leaveTypeId);

    return this.prisma.leavePolicy.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        leaveTypeId: dto.leaveTypeId,
        entitlementDays: dto.entitlementDays,
        accrualFrequency: dto.accrualFrequency as any,
        accrualAmount: dto.accrualAmount,
        carryForward: dto.carryForward,
        carryForwardLimit: dto.carryForwardLimit,
        minNoticeDays: dto.minNoticeDays,
        maxConsecutiveDays: dto.maxConsecutiveDays,
      },
      include: { leaveType: true },
    });
  }

  async findAllLeavePolicies(ctx: TenantContext) {
    return this.prisma.leavePolicy.findMany({
      where: { tenantId: ctx.tenantId },
      include: { leaveType: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOneLeavePolicy(ctx: TenantContext, id: string) {
    const policy = await this.prisma.leavePolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Leave policy not found');
    if (policy.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: policy belongs to another tenant');
    }
    return policy;
  }

  async updateLeavePolicy(ctx: TenantContext, id: string, dto: UpdateLeavePolicyDto) {
    const policy = await this.findOneLeavePolicy(ctx, id);
    const data: Prisma.LeavePolicyUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.entitlementDays !== undefined) data.entitlementDays = dto.entitlementDays;
    if (dto.accrualFrequency !== undefined) data.accrualFrequency = dto.accrualFrequency as any;
    if (dto.accrualAmount !== undefined) data.accrualAmount = dto.accrualAmount;
    if (dto.carryForward !== undefined) data.carryForward = dto.carryForward;
    if (dto.carryForwardLimit !== undefined) data.carryForwardLimit = dto.carryForwardLimit;
    if (dto.minNoticeDays !== undefined) data.minNoticeDays = dto.minNoticeDays;
    if (dto.maxConsecutiveDays !== undefined) data.maxConsecutiveDays = dto.maxConsecutiveDays;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.leavePolicy.update({ where: { id: policy.id }, data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE BALANCES
  // ═══════════════════════════════════════════════════════════════════════════

  async getBalances(ctx: TenantContext, employeeId?: string) {
    const where: Prisma.LeaveBalanceWhereInput = {
      tenantId: ctx.tenantId,
      ...(employeeId && { employeeId }),
    };

    return this.prisma.leaveBalance.findMany({
      where,
      include: {
        leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { year: 'desc' },
    });
  }

  async adjustBalance(ctx: TenantContext, dto: AdjustBalanceDto) {
    // Find or create balance for current year
    const currentYear = new Date().getFullYear();
    const balance = await this.prisma.leaveBalance.upsert({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId: ctx.tenantId,
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: currentYear,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: currentYear,
        opening: 0,
        accrued: 0,
        used: 0,
        pending: 0,
        adjustments: dto.amount,
        carryForward: 0,
        remaining: dto.amount,
      },
      update: {
        adjustments: { increment: dto.amount },
        remaining: { increment: dto.amount },
      },
    });

    // Create ledger transaction
    await this.prisma.leaveBalanceTransaction.create({
      data: {
        tenantId: ctx.tenantId,
        balanceId: balance.id,
        employeeId: dto.employeeId,
        transactionType: 'ADJUSTMENT',
        amount: dto.amount,
        reason: dto.reason,
        actorId: ctx.userId,
      },
    });

    this.logger.log(`Balance adjusted: employee=${dto.employeeId} amount=${dto.amount} by=${ctx.userId}`);
    return balance;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createLeaveRequest(ctx: TenantContext, dto: CreateLeaveRequestDto) {
    const employee = await this.resolveEmployee(ctx, ctx.userId);

    // Validate leave type
    await this.findOneLeaveType(ctx, dto.leaveTypeId);

    // Calculate duration server-side (never trust client)
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date.');
    }

    const duration = await this.calculateDuration(ctx, startDate, endDate, dto.unit, employee.timezone ?? 'UTC');

    // Check for overlapping requests
    await this.checkOverlap(ctx, employee.id, startDate, endDate);

    // Check balance if paid leave
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
    if (leaveType?.isPaid) {
      await this.validateBalance(ctx, employee.id, dto.leaveTypeId, duration);
    }

    return this.prisma.leaveRequest.create({
      data: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        leaveTypeId: dto.leaveTypeId,
        startDate,
        endDate,
        duration,
        unit: dto.unit as any,
        reason: dto.reason,
        attachmentUrl: dto.attachmentUrl,
        status: 'DRAFT',
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
  }

  async findAllLeaveRequests(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      employeeId?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      leaveTypeId?: string;
    } = {},
  ) {
    const { page = 1, limit = 20, employeeId, status, startDate, endDate, leaveTypeId } = params;

    const where: Prisma.LeaveRequestWhereInput = {
      tenantId: ctx.tenantId,
      ...(employeeId && { employeeId }),
      ...(status && { status: status as LeaveRequestStatus }),
      ...(leaveTypeId && { leaveTypeId }),
      ...(startDate && endDate && {
        startDate: { gte: new Date(startDate) },
        endDate: { lte: new Date(endDate) },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
      }),
      this.prisma.leaveRequest.count({ where }),
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

  async findOneLeaveRequest(ctx: TenantContext, id: string) {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
    });
    if (!request) throw new NotFoundException('Leave request not found');
    if (request.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: request belongs to another tenant');
    }
    return request;
  }

  async submitLeaveRequest(ctx: TenantContext, id: string) {
    const request = await this.findOneLeaveRequest(ctx, id);
    const employee = await this.resolveEmployee(ctx, ctx.userId);

    // Only the employee who created the request (or HR) can submit
    if (request.employeeId !== employee.id) {
      // Check if user has HR permissions
      const isHR = await this.isHRManager(ctx);
      if (!isHR) {
        throw new ForbiddenException('You can only submit your own leave requests.');
      }
    }

    // Validate state transition
    this.validateTransition(request.status, 'PENDING');

    return this.prisma.leaveRequest.update({
      where: { id: request.id },
      data: {
        status: 'PENDING',
        submittedAt: new Date(),
      },
    });
  }

  async approveLeaveRequest(ctx: TenantContext, id: string, _dto: ReviewLeaveRequestDto) {
    const request = await this.findOneLeaveRequest(ctx, id);

    // Validate state transition
    this.validateTransition(request.status, 'APPROVED');

    // Cannot approve own request
    const employee = await this.resolveEmployee(ctx, ctx.userId);
    if (request.employeeId === employee.id) {
      throw new ForbiddenException('You cannot approve your own leave request.');
    }

    // Validate balance before approval
    const leaveType = await this.prisma.leaveType.findUnique({ where: { id: request.leaveTypeId } });
    if (leaveType?.isPaid) {
      await this.validateBalance(ctx, request.employeeId, request.leaveTypeId, request.duration);
    }

    return this.prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedBy: ctx.userId,
        },
      });

      // Consume balance if paid leave
      if (leaveType?.isPaid) {
        await this.consumeBalance(tx, ctx, request.employeeId, request.leaveTypeId, request.duration, request.id);
      }

      // Publish domain event
      await this.eventPublisher.publish(ctx, {
        eventType: 'leave.approved',
        aggregateType: 'leaveRequest',
        aggregateId: request.id,
        payload: {
          requestId: request.id,
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          duration: request.duration,
          startDate: request.startDate,
          endDate: request.endDate,
          isPaid: leaveType?.isPaid,
        },
      });

      this.logger.log(`Leave approved: id=${request.id} by=${ctx.userId}`);
      return updated;
    });
  }

  async rejectLeaveRequest(ctx: TenantContext, id: string, dto: ReviewLeaveRequestDto) {
    const request = await this.findOneLeaveRequest(ctx, id);

    // Validate state transition
    this.validateTransition(request.status, 'REJECTED');

    // Cannot reject own request
    const employee = await this.resolveEmployee(ctx, ctx.userId);
    if (request.employeeId === employee.id) {
      throw new ForbiddenException('You cannot reject your own leave request.');
    }

    return this.prisma.leaveRequest.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: ctx.userId,
        rejectionReason: dto.rejectionReason,
      },
    });
  }

  async cancelLeaveRequest(ctx: TenantContext, id: string, dto: CancelLeaveRequestDto) {
    const request = await this.findOneLeaveRequest(ctx, id);

    // Validate state transition
    this.validateTransition(request.status, 'CANCELLED');

    // Only the employee who created the request can cancel (or HR)
    const employee = await this.resolveEmployee(ctx, ctx.userId);
    if (request.employeeId !== employee.id) {
      const isHR = await this.isHRManager(ctx);
      if (!isHR) {
        throw new ForbiddenException('You can only cancel your own leave requests.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: ctx.userId,
          cancellationReason: dto.cancellationReason,
        },
      });

      // Reverse balance if request was APPROVED and leave type is paid
      if (request.status === 'APPROVED') {
        const leaveType = await tx.leaveType.findUnique({ where: { id: request.leaveTypeId } });
        if (leaveType?.isPaid) {
          await this.reverseBalance(tx, ctx, request.employeeId, request.leaveTypeId, request.duration, request.id);
        }
      }

      this.logger.log(`Leave cancelled: id=${request.id} by=${ctx.userId}`);
      return updated;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAYS
  // ═══════════════════════════════════════════════════════════════════════════

  async createHoliday(ctx: TenantContext, dto: CreateHolidayDto) {
    return this.prisma.holiday.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        name: dto.name,
        date: new Date(dto.date),
        description: dto.description,
      },
    });
  }

  async findAllHolidays(ctx: TenantContext, year?: number) {
    const where: Prisma.HolidayWhereInput = {
      tenantId: ctx.tenantId,
      isActive: true,
      ...(year && {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      }),
    };

    return this.prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async updateHoliday(ctx: TenantContext, id: string, dto: UpdateHolidayDto) {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    if (holiday.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: holiday belongs to another tenant');
    }

    return this.prisma.holiday.update({
      where: { id },
      data: dto,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE CALENDAR
  // ═══════════════════════════════════════════════════════════════════════════

  async getLeaveCalendar(ctx: TenantContext, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get approved leave requests in this month
    const requests = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: {
        leaveType: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    // Get holidays in this month
    const holidays = await this.prisma.holiday.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    return { requests, holidays };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DURATION CALCULATION (Deterministic, server-side)
  // ═══════════════════════════════════════════════════════════════════════════

  private async calculateDuration(
    ctx: TenantContext,
    startDate: Date,
    endDate: Date,
    unit: string,
    _timezone: string,
  ): Promise<number> {
    if (unit === 'HALF_DAY') return 0.5; // Half day = 0.5 working days
    if (unit === 'HOURS') return 1; // Hours-based = 1 day-unit per request (hours tracked separately)

    // Fetch the working calendar for this tenant
    const calendar = await this.prisma.workingCalendar.findFirst({
      where: { tenantId: ctx.tenantId, isDefault: true },
    });

    // Parse weekend days from calendar (e.g., "SATURDAY,SUNDAY" → [6, 0])
    const weekendDayNames = calendar
      ? calendar.weekendDays.split(',').map((d) => d.trim().toUpperCase())
      : ['SATURDAY', 'SUNDAY'];

    const DAY_MAP: Record<string, number> = {
      SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
      THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
    };

    const weekendDayNumbers = new Set(
      weekendDayNames.map((name) => DAY_MAP[name]).filter((v) => v !== undefined),
    );

    // Default to [0, 6] (Sun, Sat) if parsing failed
    if (weekendDayNumbers.size === 0) {
      weekendDayNumbers.add(0);
      weekendDayNumbers.add(6);
    }

    // Fetch holidays in the range
    const holidays = await this.prisma.holiday.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
        date: { gte: startDate, lte: endDate },
      },
      select: { date: true },
    });

    const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split('T')[0]));

    let workingDays = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay(); // 0=Sunday, 6=Saturday
      const dateStr = current.toISOString().split('T')[0];

      // Exclude configured weekend days and holidays
      if (!weekendDayNumbers.has(dayOfWeek) && !holidayDates.has(dateStr)) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERLAP DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  private async checkOverlap(ctx: TenantContext, employeeId: string, startDate: Date, endDate: Date) {
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId,
        status: { in: ['PENDING', 'APPROVED'] }, // Exclude CANCELLED and REJECTED
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });

    if (overlapping) {
      throw new ConflictException(
        `Leave request overlaps with existing ${overlapping.status.toLowerCase()} request from ${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]}.`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BALANCE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  private async validateBalance(ctx: TenantContext, employeeId: string, leaveTypeId: string, duration: number) {
    const currentYear = new Date().getFullYear();
    const balance = await this.prisma.leaveBalance.findUnique({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId: ctx.tenantId,
          employeeId,
          leaveTypeId,
          year: currentYear,
        },
      },
    });

    const available = balance ? balance.remaining + balance.accrued - balance.pending : 0;

    if (available < duration) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${available} days, Requested: ${duration} days.`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE ACCRUAL ENGINE (Idempotent, ledger-based)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Run accrual for all employees on a given leave policy.
   * Idempotent: running twice for the same tenant/employee/type/year does NOT double-credit.
   * Uses a unique constraint on the ledger transaction reference to prevent duplicates.
   */
  async runAccrual(
    ctx: TenantContext,
    leavePolicyId: string,
    accrualYear?: number,
  ) {
    const year = accrualYear ?? new Date().getFullYear();
    const policy = await this.findOneLeavePolicy(ctx, leavePolicyId);

    if (!policy.accrualFrequency || !policy.accrualAmount) {
      throw new BadRequestException('Policy does not have accrual configured.');
    }

    // Get all active employees in the tenant
    const employees = await this.prisma.employee.findMany({
      where: { tenantId: ctx.tenantId, deletedAt: null, employmentStatus: 'ACTIVE' },
      select: { id: true },
    });

    let accruedCount = 0;
    let skippedCount = 0;

    for (const employee of employees) {
      // Check idempotency: has an ACCRUAL already been recorded for this employee/type/year/policy?
      const alreadyAccrued = await this.prisma.leaveBalanceTransaction.findFirst({
        where: {
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          transactionType: 'ACCRUAL',
          reason: { contains: `policy:${policy.id}:year:${year}` },
        },
      });

      if (alreadyAccrued) {
        skippedCount++;
        continue;
      }

      // Upsert balance
      const balance = await this.prisma.leaveBalance.upsert({
        where: {
          tenantId_employeeId_leaveTypeId_year: {
            tenantId: ctx.tenantId,
            employeeId: employee.id,
            leaveTypeId: policy.leaveTypeId,
            year,
          },
        },
        create: {
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          leaveTypeId: policy.leaveTypeId,
          year,
          opening: 0,
          accrued: policy.accrualAmount,
          used: 0,
          pending: 0,
          adjustments: 0,
          carryForward: 0,
          remaining: policy.accrualAmount,
        },
        update: {
          accrued: { increment: policy.accrualAmount },
          remaining: { increment: policy.accrualAmount },
        },
      });

      // Create ledger transaction (audit trail)
      await this.prisma.leaveBalanceTransaction.create({
        data: {
          tenantId: ctx.tenantId,
          balanceId: balance.id,
          employeeId: employee.id,
          transactionType: 'ACCRUAL',
          amount: policy.accrualAmount,
          referenceId: policy.id,
          referenceType: 'LeavePolicy',
          reason: `Accrual: ${policy.accrualFrequency} accrual of ${policy.accrualAmount} days — policy:${policy.id}:year:${year}`,
          actorId: ctx.userId,
        },
      });

      accruedCount++;
    }

    this.logger.log(`Leave accrual completed: policy=${leavePolicyId} year=${year} accrued=${accruedCount} skipped=${skippedCount}`);
    return { accruedCount, skippedCount, total: employees.length };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BALANCE CONSUMPTION (Ledger-based)
  // ═══════════════════════════════════════════════════════════════════════════

  private async consumeBalance(
    tx: Prisma.TransactionClient,
    ctx: TenantContext,
    employeeId: string,
    leaveTypeId: string,
    duration: number,
    requestId: string,
  ) {
    const currentYear = new Date().getFullYear();
    const balance = await tx.leaveBalance.upsert({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId: ctx.tenantId,
          employeeId,
          leaveTypeId,
          year: currentYear,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        employeeId,
        leaveTypeId,
        year: currentYear,
        opening: 0,
        accrued: 0,
        used: duration,
        pending: 0,
        adjustments: 0,
        carryForward: 0,
        remaining: -duration,
      },
      update: {
        used: { increment: duration },
        remaining: { decrement: duration },
      },
    });

    // Create ledger transaction
    await tx.leaveBalanceTransaction.create({
      data: {
        tenantId: ctx.tenantId,
        balanceId: balance.id,
        employeeId,
        transactionType: 'CONSUMPTION',
        amount: -duration,
        referenceId: requestId,
        referenceType: 'LeaveRequest',
        reason: 'Leave request approved',
        actorId: ctx.userId,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BALANCE REVERSAL (Ledger-based)
  // ═══════════════════════════════════════════════════════════════════════════

  private async reverseBalance(
    tx: Prisma.TransactionClient,
    ctx: TenantContext,
    employeeId: string,
    leaveTypeId: string,
    duration: number,
    requestId: string,
  ) {
    const currentYear = new Date().getFullYear();
    const balance = await tx.leaveBalance.upsert({
      where: {
        tenantId_employeeId_leaveTypeId_year: {
          tenantId: ctx.tenantId,
          employeeId,
          leaveTypeId,
          year: currentYear,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        employeeId,
        leaveTypeId,
        year: currentYear,
        opening: 0,
        accrued: 0,
        used: 0,
        pending: 0,
        adjustments: duration,
        carryForward: 0,
        remaining: duration,
      },
      update: {
        used: { decrement: duration },
        remaining: { increment: duration },
      },
    });

    // Create ledger transaction
    await tx.leaveBalanceTransaction.create({
      data: {
        tenantId: ctx.tenantId,
        balanceId: balance.id,
        employeeId,
        transactionType: 'REVERSAL',
        amount: duration,
        referenceId: requestId,
        referenceType: 'LeaveRequest',
        reason: 'Leave request cancelled',
        actorId: ctx.userId,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private validateTransition(currentStatus: string, targetStatus: string) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${targetStatus}.`,
      );
    }
  }

  private async resolveEmployee(ctx: TenantContext, userId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId, tenantId: ctx.tenantId, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found for this user.');
    }
    return employee;
  }

  private async isHRManager(ctx: TenantContext): Promise<boolean> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId: ctx.userId,
        tenantId: ctx.tenantId,
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    return userRoles.some((ur) =>
      ur.role.rolePermissions.some((rp) => rp.permission.name === 'leave:manage'),
    );
  }
}