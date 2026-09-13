/**
 * FusionOS Payroll Service
 *
 * The payroll engine handling periods, runs, salary structures, components,
 * adjustments, and payslip generation.
 *
 * Three calculation modes:
 *   ATTENDANCE — derives values from Attendance records
 *   MANUAL     — user-supplied components
 *   HYBRID     — system-calculated + manual adjustments
 *
 * Money strategy: INTEGER minor units (never floats).
 * Calculation snapshots are preserved for auditability.
 * Finalized payroll is immutable.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { EventPublisherService } from '../../common/services/event-publisher.service';
import { FinanceService } from '../../finance/services/finance.service';
import {
  CreatePayrollPolicyDto,
  UpdatePayrollPolicyDto,
  CreatePayrollComponentDto,
  UpdatePayrollComponentDto,
  CreateSalaryStructureDto,
  UpdateSalaryStructureDto,
  CreatePayrollPeriodDto,
  UpdatePayrollPeriodDto,
  CreatePayrollRunDto,
  CreatePayrollAdjustmentDto,
  ReviewPayrollAdjustmentDto,
} from '../dto/payroll.dto';

// ── Valid state transitions ────────────────────────────────────────────────

const PERIOD_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['OPEN'],
  OPEN: ['PROCESSING'],
  PROCESSING: ['CALCULATED'],
  CALCULATED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED'],
  APPROVED: ['FINALIZED'],
  FINALIZED: ['CLOSED'],
  CLOSED: [],
};

const RUN_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CALCULATING'],
  CALCULATING: ['CALCULATED', 'FAILED'],
  CALCULATED: ['REVIEWING'],
  REVIEWING: ['REVIEWED'],
  REVIEWED: ['APPROVED'],
  APPROVED: ['FINALIZED'],
  FINALIZED: [],
  FAILED: ['PENDING'],
};

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventPublisher: EventPublisherService,
    private readonly financeService: FinanceService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL POLICIES
  // ═══════════════════════════════════════════════════════════════════════════

  async createPolicy(ctx: TenantContext, dto: CreatePayrollPolicyDto) {
    const existing = await this.prisma.payrollPolicy.findFirst({
      where: { tenantId: ctx.tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Payroll policy "${dto.name}" already exists.`);
    }

    return this.prisma.payrollPolicy.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        companyId: dto.companyId,
        workingDaysPerWeek: dto.workingDaysPerWeek,
        workingDaysPerMonth: dto.workingDaysPerMonth,
        payFrequency: dto.payFrequency as any,
        defaultCalcMode: dto.defaultCalcMode as any,
        overtimeEnabled: dto.overtimeEnabled,
        overtimeMultiplier: dto.overtimeMultiplier,
        overtimeCapMinutes: dto.overtimeCapMinutes,
        absenceDeduct: dto.absenceDeduct,
        absenceDivisor: dto.absenceDivisor,
        roundingPrecision: dto.roundingPrecision,
        roundingMode: dto.roundingMode,
      },
    });
  }

  async findAllPolicies(ctx: TenantContext) {
    return this.prisma.payrollPolicy.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: 'asc' },
    });
  }

  async findOnePolicy(ctx: TenantContext, id: string) {
    const policy = await this.prisma.payrollPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Payroll policy not found');
    if (policy.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: policy belongs to another tenant');
    }
    return policy;
  }

  async updatePolicy(ctx: TenantContext, id: string, dto: UpdatePayrollPolicyDto) {
    const policy = await this.findOnePolicy(ctx, id);
    const data: Prisma.PayrollPolicyUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.workingDaysPerWeek !== undefined) data.workingDaysPerWeek = dto.workingDaysPerWeek;
    if (dto.workingDaysPerMonth !== undefined) data.workingDaysPerMonth = dto.workingDaysPerMonth;
    if (dto.payFrequency !== undefined) data.payFrequency = dto.payFrequency as any;
    if (dto.defaultCalcMode !== undefined) data.defaultCalcMode = dto.defaultCalcMode as any;
    if (dto.overtimeEnabled !== undefined) data.overtimeEnabled = dto.overtimeEnabled;
    if (dto.overtimeMultiplier !== undefined) data.overtimeMultiplier = dto.overtimeMultiplier;
    if (dto.overtimeCapMinutes !== undefined) data.overtimeCapMinutes = dto.overtimeCapMinutes;
    if (dto.absenceDeduct !== undefined) data.absenceDeduct = dto.absenceDeduct;
    if (dto.absenceDivisor !== undefined) data.absenceDivisor = dto.absenceDivisor;
    if (dto.roundingPrecision !== undefined) data.roundingPrecision = dto.roundingPrecision;
    if (dto.roundingMode !== undefined) data.roundingMode = dto.roundingMode;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.payrollPolicy.update({ where: { id: policy.id }, data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL COMPONENTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createComponent(ctx: TenantContext, dto: CreatePayrollComponentDto) {
    const existing = await this.prisma.payrollComponent.findFirst({
      where: { tenantId: ctx.tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Payroll component with code "${dto.code}" already exists.`);
    }

    return this.prisma.payrollComponent.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        code: dto.code.toUpperCase(),
        type: dto.type as any,
        isStatutory: dto.isStatutory,
        isFixed: dto.isFixed,
        defaultValue: dto.defaultValue,
        calculationBasis: dto.calculationBasis,
      },
    });
  }

  async findAllComponents(ctx: TenantContext) {
    return this.prisma.payrollComponent.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOneComponent(ctx: TenantContext, id: string) {
    const component = await this.prisma.payrollComponent.findUnique({ where: { id } });
    if (!component) throw new NotFoundException('Payroll component not found');
    if (component.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: component belongs to another tenant');
    }
    return component;
  }

  async updateComponent(ctx: TenantContext, id: string, dto: UpdatePayrollComponentDto) {
    const component = await this.findOneComponent(ctx, id);
    const data: Prisma.PayrollComponentUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isStatutory !== undefined) data.isStatutory = dto.isStatutory;
    if (dto.isFixed !== undefined) data.isFixed = dto.isFixed;
    if (dto.defaultValue !== undefined) data.defaultValue = dto.defaultValue;
    if (dto.calculationBasis !== undefined) data.calculationBasis = dto.calculationBasis;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    return this.prisma.payrollComponent.update({ where: { id: component.id }, data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SALARY STRUCTURES
  // ═══════════════════════════════════════════════════════════════════════════

  async createSalaryStructure(ctx: TenantContext, dto: CreateSalaryStructureDto) {
    // Validate employee belongs to tenant
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId: ctx.tenantId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Deactivate previous active salary structures for this employee
    await this.prisma.salaryStructure.updateMany({
      where: { employeeId: dto.employeeId, isActive: true },
      data: { isActive: false, status: 'SUPERSEDED' },
    });

    const structure = await this.prisma.salaryStructure.create({
      data: {
        tenantId: ctx.tenantId,
        employeeId: dto.employeeId,
        companyId: dto.companyId,
        currency: dto.currency ?? 'USD',
        payFrequency: dto.payFrequency as any,
        basicSalary: dto.basicSalary,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        notes: dto.notes,
        createdBy: ctx.userId,
      },
    });

    // Create salary structure components if provided
    if (dto.components && dto.components.length > 0) {
      for (const comp of dto.components) {
        await this.findOneComponent(ctx, comp.componentId);
        await this.prisma.salaryStructureComponent.create({
          data: {
            tenantId: ctx.tenantId,
            salaryStructureId: structure.id,
            componentId: comp.componentId,
            amount: comp.amount,
          },
        });
      }
    }

    this.logger.log(`Salary structure created: employee=${dto.employeeId} basic=${dto.basicSalary} by=${ctx.userId}`);
    return this.prisma.salaryStructure.findUnique({
      where: { id: structure.id },
      include: { components: { include: { component: true } } },
    });
  }

  async findAllSalaryStructures(ctx: TenantContext, employeeId?: string) {
    return this.prisma.salaryStructure.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(employeeId && { employeeId }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        components: { include: { component: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneSalaryStructure(ctx: TenantContext, id: string) {
    const structure = await this.prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        components: { include: { component: true } },
      },
    });
    if (!structure) throw new NotFoundException('Salary structure not found');
    if (structure.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: salary structure belongs to another tenant');
    }
    return structure;
  }

  async updateSalaryStructure(ctx: TenantContext, id: string, dto: UpdateSalaryStructureDto) {
    const structure = await this.findOneSalaryStructure(ctx, id);
    if (structure.status === 'SUPERSEDED') {
      throw new BadRequestException('Cannot modify a superseded salary structure.');
    }

    const data: Prisma.SalaryStructureUpdateInput = {};
    if (dto.payFrequency !== undefined) data.payFrequency = dto.payFrequency as any;
    if (dto.basicSalary !== undefined) data.basicSalary = dto.basicSalary;
    if (dto.effectiveTo !== undefined) data.effectiveTo = new Date(dto.effectiveTo);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.salaryStructure.update({ where: { id: structure.id }, data });
  }

  async getActiveSalaryStructure(ctx: TenantContext, employeeId: string, asOfDate?: Date) {
    const date = asOfDate ?? new Date();
    return this.prisma.salaryStructure.findFirst({
      where: {
        tenantId: ctx.tenantId,
        employeeId,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: date } },
        ],
      },
      include: { components: { include: { component: true } } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL PERIODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createPeriod(ctx: TenantContext, dto: CreatePayrollPeriodDto) {
    const existing = await this.prisma.payrollPeriod.findFirst({
      where: { tenantId: ctx.tenantId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Payroll period "${dto.name}" already exists.`);
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date.');
    }

    return this.prisma.payrollPeriod.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        startDate,
        endDate,
        paymentDate: new Date(dto.paymentDate),
        createdBy: ctx.userId,
      },
    });
  }

  async findAllPeriods(ctx: TenantContext) {
    return this.prisma.payrollPeriod.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOnePeriod(ctx: TenantContext, id: string) {
    const period = await this.prisma.payrollPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Payroll period not found');
    if (period.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: period belongs to another tenant');
    }
    return period;
  }

  async updatePeriod(ctx: TenantContext, id: string, dto: UpdatePayrollPeriodDto) {
    const period = await this.findOnePeriod(ctx, id);
    if (period.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT periods can be edited.');
    }
    const data: Prisma.PayrollPeriodUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.paymentDate !== undefined) data.paymentDate = new Date(dto.paymentDate);
    return this.prisma.payrollPeriod.update({ where: { id: period.id }, data });
  }

  async transitionPeriod(ctx: TenantContext, id: string, targetStatus: string) {
    const period = await this.findOnePeriod(ctx, id);
    this.validatePeriodTransition(period.status, targetStatus);

    const data: Prisma.PayrollPeriodUpdateInput = { status: targetStatus as any };
    if (targetStatus === 'FINALIZED') data.finalizedAt = new Date();
    if (targetStatus === 'APPROVED') data.approvedBy = ctx.userId;

    return this.prisma.payrollPeriod.update({ where: { id: period.id }, data });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL RUNS
  // ═══════════════════════════════════════════════════════════════════════════

  async createRun(ctx: TenantContext, dto: CreatePayrollRunDto) {
    await this.findOnePeriod(ctx, dto.periodId);

    // Check for existing run with same mode
    const existing = await this.prisma.payrollRun.findFirst({
      where: {
        tenantId: ctx.tenantId,
        periodId: dto.periodId,
        calculationMode: dto.calculationMode as any,
        status: { notIn: ['FAILED'] },
      },
    });
    if (existing) {
      throw new ConflictException(`A ${dto.calculationMode} payroll run already exists for this period.`);
    }

    return this.prisma.payrollRun.create({
      data: {
        tenantId: ctx.tenantId,
        periodId: dto.periodId,
        calculationMode: dto.calculationMode as any,
        employeeScope: dto.employeeScope,
        createdBy: ctx.userId,
        currency: dto.currency ?? 'USD', // Run-level default — resolved per-employee from SalaryStructure during calculation
      },
    });
  }

  async findAllRuns(ctx: TenantContext, periodId?: string) {
    return this.prisma.payrollRun.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(periodId && { periodId }),
      },
      include: {
        period: { select: { id: true, name: true, startDate: true, endDate: true } },
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneRun(ctx: TenantContext, id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        period: true,
        lines: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
            items: true,
            payslip: true,
          },
        },
      },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: payroll run belongs to another tenant');
    }
    return run;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL CALCULATION ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  async calculateRun(ctx: TenantContext, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: payroll run belongs to another tenant');
    }

    this.validateRunTransition(run.status, 'CALCULATING');

    // Transition to CALCULATING
    await this.prisma.payrollRun.update({
      where: { id: runId },
      data: { status: 'CALCULATING' },
    });

    try {
      const period = await this.prisma.payrollPeriod.findUnique({ where: { id: run.periodId } });
      if (!period) throw new BadRequestException('Period not found');

      // Get active policy
      const policy = await this.prisma.payrollPolicy.findFirst({
        where: { tenantId: ctx.tenantId, isActive: true },
      });
      if (!policy) throw new BadRequestException('No active payroll policy found');

      // Get employees to process
      const employees = await this.prisma.employee.findMany({
        where: {
          tenantId: ctx.tenantId,
          employmentStatus: 'ACTIVE',
          deletedAt: null,
        },
      });

      // Clear previous lines for this run (idempotency)
      await this.prisma.payrollLineItem.deleteMany({
        where: { line: { runId: runId } },
      });
      await this.prisma.payrollLine.deleteMany({ where: { runId: runId } });

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const employee of employees) {
        const line = await this.calculateEmployeePayroll(
          ctx,
          run,
          employee,
          period,
          policy,
          run.calculationMode,
        );

        totalGross += line.grossPay;
        totalDeductions += line.totalDeductions;
        totalNet += line.netPay;
      }

      // Update run totals
      const updatedRun = await this.prisma.payrollRun.update({
        where: { id: runId },
        data: {
          status: 'CALCULATED',
          calculatedAt: new Date(),
          totalEmployees: employees.length,
          totalGross,
          totalDeductions,
          totalNet,
        },
      });

      this.logger.log(`Payroll calculated: run=${runId} employees=${employees.length} gross=${totalGross} net=${totalNet}`);
      return updatedRun;
    } catch (error) {
      await this.prisma.payrollRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errors: { error: (error as Error).message },
        },
      });
      throw error;
    }
  }

  private async calculateEmployeePayroll(
    ctx: TenantContext,
    run: any,
    employee: any,
    period: any,
    policy: any,
    calculationMode: any,
  ) {
    const salaryStructure = await this.getActiveSalaryStructure(ctx, employee.id, period.startDate);
    if (!salaryStructure) {
      // Employee has no salary structure — create a draft line with zeros
      return this.prisma.payrollLine.create({
        data: {
          tenantId: ctx.tenantId,
          runId: run.id,
          employeeId: employee.id,
          currency: employee.currency ?? 'USD',
          calculationMode,
          status: 'DRAFT',
          grossPay: 0,
          totalDeductions: 0,
          totalEarnings: 0,
          netPay: 0,
          calculatedAt: new Date(),
        },
      });
    }

    const basicSalary = salaryStructure.basicSalary;
    const perDayRate = Math.floor(basicSalary / policy.absenceDivisor);
    const perHourRate = Math.floor(perDayRate / 8);
    const perMinuteRate = Math.floor(perHourRate / 60);

    // Get attendance data for the period
    const attendance = await this.prisma.attendance.findMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        date: {
          gte: period.startDate,
          lte: period.endDate,
        },
      },
    });

    // Get leave data for the period
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId: ctx.tenantId,
        employeeId: employee.id,
        status: 'APPROVED',
        startDate: { lte: period.endDate },
        endDate: { gte: period.startDate },
      },
      include: { leaveType: true },
    });

    // Calculate working days in the period
    const workingDays = this.countWorkingDays(period.startDate, period.endDate);
    const workedDays = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'OVERTIME' || a.status === 'HALF_DAY').length;
    const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
    const paidLeaveDays = leaves.filter(l => l.leaveType?.isPaid).reduce((sum, l) => sum + l.duration, 0);
    const unpaidLeaveDays = leaves.filter(l => !l.leaveType?.isPaid).reduce((sum, l) => sum + l.duration, 0);
    const totalOvertimeMinutes = attendance.reduce((sum, a) => sum + a.overtimeMinutes, 0);

    const items: Array<{ type: string; code: string; name: string; amount: number; source: string; calculationBasis: string }> = [];

    if (calculationMode === 'ATTENDANCE' || calculationMode === 'HYBRID') {
      // ── ATTENDANCE-BASED CALCULATIONS ──

      // Basic salary (pro-rated for partial periods)
      const earnedBasic = Math.floor(basicSalary * workedDays / policy.workingDaysPerMonth);
      if (earnedBasic > 0) {
        items.push({
          type: 'EARNING', code: 'BASIC', name: 'Basic Salary',
          amount: earnedBasic, source: 'SYSTEM',
          calculationBasis: `${basicSalary} × ${workedDays}/${policy.workingDaysPerMonth} days`,
        });
      }

      // Overtime pay
      if (policy.overtimeEnabled && totalOvertimeMinutes > 0) {
        const otMinutes = policy.overtimeCapMinutes
          ? Math.min(totalOvertimeMinutes, policy.overtimeCapMinutes)
          : totalOvertimeMinutes;
        const overtimePay = Math.floor(otMinutes * perMinuteRate * policy.overtimeMultiplier / 100);
        if (overtimePay > 0) {
          items.push({
            type: 'EARNING', code: 'OVERTIME', name: 'Overtime Pay',
            amount: overtimePay, source: 'SYSTEM',
            calculationBasis: `${otMinutes} min × ${perMinuteRate}/min × ${policy.overtimeMultiplier}%`,
          });
        }
      }

      // Absence deduction
      if (policy.absenceDeduct && absentDays > 0) {
        const absenceDeduction = absentDays * perDayRate;
        if (absenceDeduction > 0) {
          items.push({
            type: 'DEDUCTION', code: 'ABSENCE', name: 'Unpaid Absence',
            amount: absenceDeduction, source: 'SYSTEM',
            calculationBasis: `${absentDays} days × ${perDayRate}/day`,
          });
        }
      }

      // Unpaid leave deduction
      if (unpaidLeaveDays > 0) {
        const unpaidDeduction = unpaidLeaveDays * perDayRate;
        if (unpaidDeduction > 0) {
          items.push({
            type: 'DEDUCTION', code: 'UNPAID_LEAVE', name: 'Unpaid Leave',
            amount: unpaidDeduction, source: 'SYSTEM',
            calculationBasis: `${unpaidLeaveDays} days × ${perDayRate}/day`,
          });
        }
      }
    }

    if (calculationMode === 'MANUAL' || calculationMode === 'HYBRID') {
      // ── For MANUAL and HYBRID: use salary structure components ──
      const salaryComponents = salaryStructure.components || [];
      for (const sc of salaryComponents) {
        const comp = sc.component;
        if (!comp || !comp.isActive) continue;

        if (comp.type === 'EARNING') {
          items.push({
            type: 'EARNING', code: comp.code, name: comp.name,
            amount: sc.amount, source: 'MANUAL',
            calculationBasis: `Salary structure component`,
          });
        } else if (comp.type === 'DEDUCTION') {
          items.push({
            type: 'DEDUCTION', code: comp.code, name: comp.name,
            amount: sc.amount, source: 'MANUAL',
            calculationBasis: `Salary structure component`,
          });
        }
      }
    }

    // Apply rounding using PayrollPolicy rounding configuration
    const roundingMode = (policy.roundingMode as any) ?? 'HALF_UP';
    const roundingPrecision = policy.roundingPrecision ?? 0;

    // Round individual item amounts according to precision
    const roundedItems = items.map((item) => ({
      ...item,
      amount: this.applyRounding(item.amount, roundingPrecision, roundingMode),
    }));

    // Recalculate totals from rounded items
    const roundedEarnings = roundedItems.filter(i => i.type === 'EARNING').reduce((s, i) => s + i.amount, 0);
    const roundedDeductions = roundedItems.filter(i => i.type === 'DEDUCTION').reduce((s, i) => s + i.amount, 0);
    const grossPay = this.applyRounding(roundedEarnings, roundingPrecision, roundingMode);
    const totalDeductionsRounded = this.applyRounding(roundedDeductions, roundingPrecision, roundingMode);
    const netPay = this.applyRounding(grossPay - totalDeductionsRounded, roundingPrecision, roundingMode);

    // Create payroll line
    const line = await this.prisma.payrollLine.create({
      data: {
        tenantId: ctx.tenantId,
        runId: run.id,
        employeeId: employee.id,
        salaryStructureId: salaryStructure.id,
        currency: salaryStructure.currency,
        calculationMode,
        status: 'CALCULATED',
        workingDays,
        workedDays,
        absentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        overtimeMinutes: totalOvertimeMinutes,
        grossPay,
        totalDeductions: totalDeductionsRounded,
        totalEarnings: grossPay,
        netPay,
        calculatedAt: new Date(),
      },
    });

    // Create line items (using rounded amounts)
    for (const item of roundedItems) {
      await this.prisma.payrollLineItem.create({
        data: {
          tenantId: ctx.tenantId,
          lineId: line.id,
          type: item.type as any,
          code: item.code,
          name: item.name,
          amount: item.amount,
          source: item.source,
          calculationBasis: item.calculationBasis,
        },
      });
    }

    return line;
  }

  private countWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  /**
   * Apply rounding to a monetary amount based on PayrollPolicy configuration.
   * @param amount The amount in integer minor units
   * @param precision Number of decimal places for rounding (0 = nearest integer)
   * @param mode Rounding mode: HALF_UP, HALF_DOWN, HALF_EVEN, CEIL, FLOOR
   */
  private applyRounding(amount: number, precision: number, mode: string): number {
    if (precision <= 0) return Math.round(amount);
    const factor = Math.pow(10, precision);
    switch (mode) {
      case 'HALF_UP':
        return Math.round(amount * factor) / factor;
      case 'HALF_DOWN': {
        const val = amount * factor;
        const floor = Math.floor(val);
        if (val - floor === 0.5) return floor / factor;
        return Math.round(val) / factor;
      }
      case 'HALF_EVEN': {
        const val = amount * factor;
        const floor = Math.floor(val);
        if (val - floor === 0.5) return (floor % 2 === 0 ? floor : floor + 1) / factor;
        return Math.round(val) / factor;
      }
      case 'CEIL':
        return Math.ceil(amount * factor) / factor;
      case 'FLOOR':
        return Math.floor(amount * factor) / factor;
      default:
        return Math.round(amount);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL RUN ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async transitionRun(ctx: TenantContext, id: string, targetStatus: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: payroll run belongs to another tenant');
    }

    this.validateRunTransition(run.status, targetStatus);

    const data: Prisma.PayrollRunUpdateInput = { status: targetStatus as any };
    if (targetStatus === 'APPROVED') {
      data.approvedBy = ctx.userId;
      data.approvedAt = new Date();
    }
    if (targetStatus === 'FINALIZED') {
      data.finalizedAt = new Date();
    }

    const updated = await this.prisma.payrollRun.update({ where: { id }, data });

    // When finalized, generate payslips and finalize all lines
    if (targetStatus === 'FINALIZED') {
      await this.finalizeRunLines(ctx, id);
      await this.generatePayslips(ctx, id);

      // Publish domain event for future Finance/Automation integration
      await this.eventPublisher.publish(ctx, {
        eventType: 'payroll.finalized',
        aggregateType: 'payrollRun',
        aggregateId: id,
        payload: {
          runId: id,
          periodId: run.periodId,
          totalEmployees: updated.totalEmployees,
          totalGross: updated.totalGross,
          totalDeductions: updated.totalDeductions,
          totalNet: updated.totalNet,
          currency: run.currency,
          calculatedAt: updated.calculatedAt,
          finalizedAt: updated.finalizedAt,
        },
      });
    }

    // Publish event on approval
    if (targetStatus === 'APPROVED') {
      await this.eventPublisher.publish(ctx, {
        eventType: 'payroll.approved',
        aggregateType: 'payrollRun',
        aggregateId: id,
        payload: {
          runId: id,
          periodId: run.periodId,
          approvedBy: ctx.userId,
        },
      });
    }

    return updated;
  }

  private async finalizeRunLines(ctx: TenantContext, runId: string) {
    const lines = await this.prisma.payrollLine.findMany({
      where: { runId, status: { not: 'FINALIZED' } },
    });

    for (const line of lines) {
      await this.prisma.payrollLine.update({
        where: { id: line.id },
        data: { status: 'FINALIZED' },
      });
    }
  }

  private async generatePayslips(ctx: TenantContext, runId: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) return;

    const period = await this.prisma.payrollPeriod.findUnique({ where: { id: run.periodId } });
    if (!period) return;

    const lines = await this.prisma.payrollLine.findMany({ where: { runId } });

    for (const line of lines) {
      // Check if payslip already exists (idempotency)
      const existing = await this.prisma.payslip.findUnique({ where: { lineId: line.id } });
      if (existing) continue;

      await this.prisma.payslip.create({
        data: {
          tenantId: ctx.tenantId,
          lineId: line.id,
          employeeId: line.employeeId,
          periodId: run.periodId,
          runId: run.id,
          currency: line.currency,
          grossPay: line.grossPay,
          totalEarnings: line.totalEarnings,
          totalDeductions: line.totalDeductions,
          netPay: line.netPay,
          paymentDate: period.paymentDate,
          status: 'FINALIZED',
        },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL LINES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAllLines(ctx: TenantContext, runId?: string, employeeId?: string) {
    return this.prisma.payrollLine.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(runId && { runId }),
        ...(employeeId && { employeeId }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        items: true,
        payslip: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneLine(ctx: TenantContext, id: string) {
    const line = await this.prisma.payrollLine.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        items: true,
        adjustments: true,
        payslip: true,
        run: { include: { period: true } },
      },
    });
    if (!line) throw new NotFoundException('Payroll line not found');
    if (line.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: payroll line belongs to another tenant');
    }
    return line;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createAdjustment(ctx: TenantContext, dto: CreatePayrollAdjustmentDto) {
    const line = await this.prisma.payrollLine.findUnique({ where: { id: dto.lineId } });
    if (!line) throw new NotFoundException('Payroll line not found');
    if (line.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: payroll line belongs to another tenant');
    }
    if (line.status === 'FINALIZED') {
      throw new BadRequestException('Cannot adjust a finalized payroll line. Use correction workflow.');
    }

    return this.prisma.payrollAdjustment.create({
      data: {
        tenantId: ctx.tenantId,
        lineId: dto.lineId,
        employeeId: line.employeeId,
        type: dto.type as any,
        code: dto.code,
        name: dto.name,
        amount: dto.amount,
        reason: dto.reason,
        createdBy: ctx.userId,
      },
    });
  }

  async findAllAdjustments(ctx: TenantContext, lineId?: string) {
    return this.prisma.payrollAdjustment.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(lineId && { lineId }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewAdjustment(ctx: TenantContext, id: string, dto: ReviewPayrollAdjustmentDto) {
    const adjustment = await this.prisma.payrollAdjustment.findUnique({ where: { id } });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: adjustment belongs to another tenant');
    }
    if (adjustment.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING adjustments can be reviewed.');
    }

    const data: Prisma.PayrollAdjustmentUpdateInput = {
      status: dto.status as any,
      approvedBy: ctx.userId,
      approvedAt: new Date(),
    };
    if (dto.rejectionReason) data.rejectionReason = dto.rejectionReason;

    const updated = await this.prisma.payrollAdjustment.update({ where: { id }, data });

    // If approved, apply to payroll line
    if (dto.status === 'APPROVED') {
      await this.applyAdjustment(ctx, adjustment);
    }

    return updated;
  }

  private async applyAdjustment(ctx: TenantContext, adjustment: any) {
    const line = await this.prisma.payrollLine.findUnique({ where: { id: adjustment.lineId } });
    if (!line || line.status === 'FINALIZED') return;

    // Add as a line item
    await this.prisma.payrollLineItem.create({
      data: {
        tenantId: ctx.tenantId,
        lineId: adjustment.lineId,
        type: adjustment.type,
        code: adjustment.code,
        name: adjustment.name,
        amount: adjustment.amount,
        source: 'ADJUSTMENT',
        calculationBasis: adjustment.reason,
        referenceId: adjustment.id,
      },
    });

    // Recalculate line totals
    const items = await this.prisma.payrollLineItem.findMany({ where: { lineId: adjustment.lineId } });
    const totalEarnings = items.filter(i => i.type === 'EARNING').reduce((sum, i) => sum + i.amount, 0);
    const totalDeductions = items.filter(i => i.type === 'DEDUCTION').reduce((sum, i) => sum + i.amount, 0);

    await this.prisma.payrollLine.update({
      where: { id: adjustment.lineId },
      data: {
        totalEarnings,
        totalDeductions,
        grossPay: totalEarnings,
        netPay: totalEarnings - totalDeductions,
        status: 'ADJUSTED',
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYSLIPS
  // ═══════════════════════════════════════════════════════════════════════════

  async findAllPayslips(ctx: TenantContext, employeeId?: string, periodId?: string) {
    // Self-service: if the user is an employee (not HR/payroll), restrict to own payslips
    const hasPayrollManage = await this.hasPermission(ctx, 'payroll:manage');
    let effectiveEmployeeId = employeeId;

    if (!hasPayrollManage && !employeeId) {
      // Non-HR users can only see their own payslips
      const employee = await this.prisma.employee.findFirst({
        where: { userId: ctx.userId, tenantId: ctx.tenantId, deletedAt: null },
      });
      if (employee) {
        effectiveEmployeeId = employee.id;
      }
    }

    return this.prisma.payslip.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(effectiveEmployeeId && { employeeId: effectiveEmployeeId }),
        ...(periodId && { periodId }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        line: { include: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOnePayslip(ctx: TenantContext, id: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, userId: true, firstName: true, lastName: true, employeeCode: true, email: true } },
        line: { include: { items: true, adjustments: true } },
      },
    });
    if (!payslip) throw new NotFoundException('Payslip not found');
    if (payslip.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: payslip belongs to another tenant');
    }

    // Employee self-service: employees can only view their own payslips
    // Check if the requesting user is the employee (self-service) or has payroll:read permission
    const isOwnPayslip = payslip.employee.userId === ctx.userId;
    if (!isOwnPayslip) {
      // For cross-employee access, the RBAC guard already enforces payroll:read
      // But we add an explicit check here for defense-in-depth
      const hasPayrollManage = await this.hasPermission(ctx, 'payroll:manage');
      if (!hasPayrollManage) {
        throw new ForbiddenException('Access denied: you can only view your own payslips.');
      }
    }

    return payslip;
  }

  private async hasPermission(ctx: TenantContext, permissionName: string): Promise<boolean> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: ctx.userId, tenantId: ctx.tenantId },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });
    return userRoles.some((ur) =>
      ur.role.rolePermissions.some((rp) => rp.permission.name === permissionName),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext) {
    const currentPeriod = await this.prisma.payrollPeriod.findFirst({
      where: { tenantId: ctx.tenantId, status: { notIn: ['CLOSED'] } },
      orderBy: { startDate: 'desc' },
    });

    const activeEmployees = await this.prisma.employee.count({
      where: { tenantId: ctx.tenantId, employmentStatus: 'ACTIVE', deletedAt: null },
    });

    const latestRun = currentPeriod
      ? await this.prisma.payrollRun.findFirst({
          where: { tenantId: ctx.tenantId, periodId: currentPeriod.id },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    const pendingRuns = await this.prisma.payrollRun.count({
      where: { tenantId: ctx.tenantId, status: { in: ['PENDING', 'CALCULATING'] } },
    });

    const finalizedRuns = await this.prisma.payrollRun.count({
      where: { tenantId: ctx.tenantId, status: 'FINALIZED' },
    });

    return {
      currentPeriod,
      activeEmployees,
      latestRun,
      pendingRuns,
      finalizedRuns,
      totalGross: latestRun?.totalGross ?? 0,
      totalDeductions: latestRun?.totalDeductions ?? 0,
      totalNet: latestRun?.totalNet ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL → FINANCE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  async postToFinance(ctx: TenantContext, runId: string) {
    return this.financeService.postPayrollToFinance(ctx, runId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private validatePeriodTransition(current: string, target: string) {
    const allowed = PERIOD_TRANSITIONS[current];
    if (!allowed || !allowed.includes(target)) {
      throw new BadRequestException(`Cannot transition payroll period from ${current} to ${target}.`);
    }
  }

  private validateRunTransition(current: string, target: string) {
    const allowed = RUN_TRANSITIONS[current];
    if (!allowed || !allowed.includes(target)) {
      throw new BadRequestException(`Cannot transition payroll run from ${current} to ${target}.`);
    }
  }
}
