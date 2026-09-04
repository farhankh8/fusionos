/**
 * FusionOS Finance Service
 *
 * Core accounting engine implementing double-entry bookkeeping.
 * Every posted transaction satisfies: TOTAL DEBITS = TOTAL CREDITS.
 *
 * Layers:
 *   Account → Journal Entry → Journal Lines → General Ledger → Reports
 */

import {
  Injectable, Logger, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { PrismaClient, Prisma, JournalEntryStatus, AccountingPeriodStatus } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import {
  CreateAccountDto, UpdateAccountDto, CreatePeriodDto, ClosePeriodDto,
  CreateJournalDto, ApproveJournalDto, ReverseJournalDto,
  ReportQueryDto, CreateExpenseDto, ReviewExpenseDto,
  CreateCustomerDto, CreateInvoiceDto, CreateVendorDto, CreateBillDto,
  CreatePaymentDto, CreateBankAccountDto,
} from '../dto/finance.dto';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaClient) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART OF ACCOUNTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createAccount(ctx: TenantContext, dto: CreateAccountDto) {
    // Validate company belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Check unique code within tenant+company
    const existing = await this.prisma.account.findFirst({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Account code '${dto.code}' already exists`);

    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.prisma.account.findFirst({
        where: { id: dto.parentId, tenantId: ctx.tenantId, companyId: dto.companyId },
      });
      if (!parent) throw new NotFoundException('Parent account not found');
    }

    const account = await this.prisma.account.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        parentId: dto.parentId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        accountType: dto.accountType as any,
        accountSubtype: (dto.accountSubtype as any) || 'OTHER',
        normalBalance: dto.normalBalance as any,
        currency: dto.currency || 'USD',
        allowManualPosting: dto.allowManualPosting ?? true,
      },
    });

    this.logger.log(`Account created: ${account.code} (${account.name}) by ${ctx.userId}`);
    return account;
  }

  async listAccounts(ctx: TenantContext, companyId: string) {
    return this.prisma.account.findMany({
      where: { tenantId: ctx.tenantId, companyId },
      include: { children: true, parent: { select: { id: true, code: true, name: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async getAccount(ctx: TenantContext, id: string) {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: { children: true, parent: { select: { id: true, code: true, name: true } } },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    return account;
  }

  async updateAccount(ctx: TenantContext, id: string, dto: UpdateAccountDto) {
    const account = await this.getAccount(ctx, id);
    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.allowManualPosting !== undefined && { allowManualPosting: dto.allowManualPosting }),
      },
    });
  }

  async seedDefaultChartOfAccounts(ctx: TenantContext, companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, tenantId: ctx.tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Check if accounts already exist
    const existing = await this.prisma.account.count({
      where: { tenantId: ctx.tenantId, companyId },
    });
    if (existing > 0) throw new ConflictException('Chart of accounts already exists for this company');

    const defaults = [
      // Assets
      { code: '1000', name: 'Assets', type: 'ASSET', balance: 'DEBIT', isGroup: true },
      { code: '1100', name: 'Cash', type: 'ASSET', balance: 'DEBIT', subtype: 'CASH', parent: '1000' },
      { code: '1200', name: 'Bank', type: 'ASSET', balance: 'DEBIT', subtype: 'BANK', parent: '1000' },
      { code: '1300', name: 'Accounts Receivable', type: 'ASSET', balance: 'DEBIT', subtype: 'ACCOUNTS_RECEIVABLE', parent: '1000' },
      { code: '1400', name: 'Inventory', type: 'ASSET', balance: 'DEBIT', subtype: 'INVENTORY', parent: '1000' },
      { code: '1500', name: 'Fixed Assets', type: 'ASSET', balance: 'DEBIT', subtype: 'FIXED_ASSET', parent: '1000' },
      // Liabilities
      { code: '2000', name: 'Liabilities', type: 'LIABILITY', balance: 'CREDIT', isGroup: true },
      { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', balance: 'CREDIT', subtype: 'ACCOUNTS_PAYABLE', parent: '2000' },
      { code: '2200', name: 'Payroll Payable', type: 'LIABILITY', balance: 'CREDIT', subtype: 'PAYROLL_PAYABLE', parent: '2000' },
      { code: '2300', name: 'Tax Payable', type: 'LIABILITY', balance: 'CREDIT', subtype: 'TAX_PAYABLE', parent: '2000' },
      // Equity
      { code: '3000', name: 'Equity', type: 'EQUITY', balance: 'CREDIT', isGroup: true },
      { code: '3100', name: 'Capital', type: 'EQUITY', balance: 'CREDIT', parent: '3000' },
      { code: '3200', name: 'Retained Earnings', type: 'EQUITY', balance: 'CREDIT', parent: '3000' },
      // Income
      { code: '4000', name: 'Income', type: 'INCOME', balance: 'CREDIT', isGroup: true },
      { code: '4100', name: 'Sales Revenue', type: 'INCOME', balance: 'CREDIT', subtype: 'REVENUE', parent: '4000' },
      { code: '4200', name: 'Other Income', type: 'INCOME', balance: 'CREDIT', parent: '4000' },
      // Expenses
      { code: '5000', name: 'Expenses', type: 'EXPENSE', balance: 'DEBIT', isGroup: true },
      { code: '5100', name: 'Salaries Expense', type: 'EXPENSE', balance: 'DEBIT', subtype: 'OPERATING_EXPENSE', parent: '5000' },
      { code: '5200', name: 'Rent Expense', type: 'EXPENSE', balance: 'DEBIT', subtype: 'OPERATING_EXPENSE', parent: '5000' },
      { code: '5300', name: 'Utilities', type: 'EXPENSE', balance: 'DEBIT', subtype: 'OPERATING_EXPENSE', parent: '5000' },
      { code: '5400', name: 'Office Expenses', type: 'EXPENSE', balance: 'DEBIT', subtype: 'OPERATING_EXPENSE', parent: '5000' },
      { code: '5500', name: 'Depreciation', type: 'EXPENSE', balance: 'DEBIT', subtype: 'OPERATING_EXPENSE', parent: '5000' },
    ];

    const accountIds: Record<string, string> = {};

    await this.prisma.$transaction(async (tx) => {
      for (const acct of defaults) {
        const created = await tx.account.create({
          data: {
            tenantId: ctx.tenantId,
            companyId,
            parentId: acct.parent ? accountIds[acct.parent] : null,
            code: acct.code,
            name: acct.name,
            accountType: acct.type as any,
            accountSubtype: (acct.subtype as any) || 'OTHER',
            normalBalance: acct.balance as any,
            isSystemAccount: false,
            allowManualPosting: !(acct as any).isGroup,
          },
        });
        accountIds[acct.code] = created.id;
      }
    });

    this.logger.log(`Default chart of accounts seeded for company ${companyId}`);
    return { message: 'Default chart of accounts created', count: defaults.length };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNTING PERIODS
  // ═══════════════════════════════════════════════════════════════════════════

  async createPeriod(ctx: TenantContext, dto: CreatePeriodDto) {
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start) throw new BadRequestException('End date must be after start date');

    // Check overlapping periods
    const overlap = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) throw new ConflictException('Period overlaps with existing period');

    return this.prisma.accountingPeriod.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        name: dto.name,
        startDate: start,
        endDate: end,
        isFiscalYearEnd: dto.isFiscalYearEnd || false,
      },
    });
  }

  async listPeriods(ctx: TenantContext, companyId: string) {
    return this.prisma.accountingPeriod.findMany({
      where: { tenantId: ctx.tenantId, companyId },
      orderBy: { startDate: 'desc' },
    });
  }

  async closePeriod(ctx: TenantContext, id: string, dto: ClosePeriodDto) {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Period not found');
    if (period.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (period.status === 'CLOSED') throw new BadRequestException('Period is already closed');
    if (period.status === 'CLOSING') throw new BadRequestException('Period is already being closed');

    return this.prisma.accountingPeriod.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedBy: ctx.userId,
        closedAt: new Date(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JOURNAL ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  async createJournal(ctx: TenantContext, dto: CreateJournalDto) {
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) throw new NotFoundException('Company not found');

    // Validate lines
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('Journal must have at least 2 lines');
    }

    // Validate each line
    for (const line of dto.lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException('A line cannot have both debit and credit');
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException('A line must have either debit or credit');
      }
      // Validate account exists and belongs to tenant
      const account = await this.prisma.account.findFirst({
        where: { id: line.accountId, tenantId: ctx.tenantId, companyId: dto.companyId },
      });
      if (!account) throw new NotFoundException(`Account ${line.accountId} not found`);
      if (!account.isActive) throw new BadRequestException(`Account ${account.code} is inactive`);
      if (!account.allowManualPosting) throw new BadRequestException(`Account ${account.code} does not allow manual posting`);
    }

    // Calculate totals
    const totalDebit = dto.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = dto.lines.reduce((sum, l) => sum + l.credit, 0);

    // Validate balanced
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(`Journal is unbalanced: Debits ${totalDebit} ≠ Credits ${totalCredit}`);
    }

    // Generate journal number
    const count = await this.prisma.journalEntry.count({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId },
    });
    const journalNumber = `JE-${String(count + 1).padStart(6, '0')}`;

    // Find open period for posting date
    const postingDate = new Date(dto.postingDate);
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        startDate: { lte: postingDate },
        endDate: { gte: postingDate },
        status: 'OPEN',
      },
    });
    if (!period) throw new BadRequestException('No open accounting period for the posting date');

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: dto.companyId,
          journalNumber,
          postingDate,
          documentDate: new Date(dto.documentDate),
          entryType: (dto.entryType as any) || 'STANDARD',
          description: dto.description || '',
          status: 'DRAFT',
          currency: dto.currency || 'USD',
          totalDebit,
          totalCredit,
          createdBy: ctx.userId,
          periodId: period.id,
        },
      });

      await tx.journalLine.createMany({
        data: dto.lines.map((line, idx) => ({
          tenantId: ctx.tenantId,
          companyId: dto.companyId,
          journalEntryId: entry.id,
          accountId: line.accountId,
          lineNumber: idx + 1,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency: dto.currency || 'USD',
          employeeId: line.employeeId,
          branchId: line.branchId,
          departmentId: line.departmentId,
          reference: line.reference,
        })),
      });

      return tx.journalEntry.findUnique({
        where: { id: entry.id },
        include: { lines: { include: { account: { select: { code: true, name: true } } }, orderBy: { lineNumber: 'asc' } } },
      });
    });
  }

  async approveJournal(ctx: TenantContext, id: string, dto: ApproveJournalDto) {
    const entry = await this.prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (entry.status !== 'DRAFT' && entry.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(`Cannot approve journal in status '${entry.status}'`);
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: ctx.userId },
    });
  }

  async postJournal(ctx: TenantContext, id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (entry.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot post journal in status '${entry.status}' — must be APPROVED`);
    }

    // Verify period is open
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId: ctx.tenantId, companyId: entry.companyId,
        startDate: { lte: entry.postingDate },
        endDate: { gte: entry.postingDate },
        status: 'OPEN',
      },
    });
    if (!period) throw new BadRequestException('Accounting period is closed — cannot post');

    // Verify balanced
    const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new BadRequestException('Journal is unbalanced — cannot post');
    }

    // Post transactionally
    return this.prisma.$transaction(async (tx) => {
      // Update entry status
      const posted = await tx.journalEntry.update({
        where: { id },
        data: { status: 'POSTED', postedBy: ctx.userId, postedAt: new Date() },
      });

      // Update account balances for each line
      for (const line of entry.lines) {
        const balance = await tx.accountBalance.findFirst({
          where: {
            tenantId: ctx.tenantId, companyId: entry.companyId,
            accountId: line.accountId, periodId: period.id,
          },
        });

        if (balance) {
          await tx.accountBalance.update({
            where: { id: balance.id },
            data: {
              periodDebit: balance.periodDebit + line.debit,
              periodCredit: balance.periodCredit + line.credit,
              closingDebit: balance.closingDebit + line.debit,
              closingCredit: balance.closingCredit + line.credit,
            },
          });
        } else {
          await tx.accountBalance.create({
            data: {
              tenantId: ctx.tenantId,
              companyId: entry.companyId,
              accountId: line.accountId,
              periodId: period.id,
              periodDebit: line.debit,
              periodCredit: line.credit,
              closingDebit: line.debit,
              closingCredit: line.credit,
              currency: entry.currency,
            },
          });
        }
      }

      this.logger.log(`Journal posted: ${entry.journalNumber} by ${ctx.userId}`);
      return posted;
    });
  }

  async reverseJournal(ctx: TenantContext, id: string, dto: ReverseJournalDto) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (entry.status !== 'POSTED') {
      throw new BadRequestException('Can only reverse posted entries');
    }
    if (entry.reversedBy) {
      throw new BadRequestException('This entry has already been reversed');
    }

    const reversalDate = new Date(dto.reversalDate);
    const count = await this.prisma.journalEntry.count({
      where: { tenantId: ctx.tenantId, companyId: entry.companyId },
    });

    return this.prisma.$transaction(async (tx) => {
      // Create reversal entry (swap debits and credits)
      const reversal = await tx.journalEntry.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: entry.companyId,
          journalNumber: `REV-${String(count + 1).padStart(6, '0')}`,
          postingDate: reversalDate,
          documentDate: reversalDate,
          entryType: 'REVERSAL',
          description: `Reversal of ${entry.journalNumber}: ${dto.reason}`,
          status: 'POSTED',
          currency: entry.currency,
          totalDebit: entry.totalCredit,
          totalCredit: entry.totalDebit,
          reversalOf: entry.id,
          periodId: entry.periodId,
          createdBy: ctx.userId,
          approvedBy: ctx.userId,
          postedBy: ctx.userId,
          postedAt: new Date(),
        },
      });

      // Create reversed lines (swap debits/credits)
      await tx.journalLine.createMany({
        data: entry.lines.map((line, idx) => ({
          tenantId: ctx.tenantId,
          companyId: entry.companyId,
          journalEntryId: reversal.id,
          accountId: line.accountId,
          lineNumber: idx + 1,
          description: line.description,
          debit: line.credit,
          credit: line.debit,
          currency: line.currency,
          employeeId: line.employeeId,
          branchId: line.branchId,
          departmentId: line.departmentId,
        })),
      });

      // Mark original as reversed
      await tx.journalEntry.update({
        where: { id: entry.id },
        data: { status: 'REVERSED', reversedBy: reversal.id },
      });

      // Update account balances
      const period = await tx.accountingPeriod.findFirst({
        where: {
          tenantId: ctx.tenantId, companyId: entry.companyId,
          startDate: { lte: reversalDate },
          endDate: { gte: reversalDate },
          status: 'OPEN',
        },
      });

      if (period) {
        for (const line of entry.lines) {
          const balance = await tx.accountBalance.findFirst({
            where: {
              tenantId: ctx.tenantId, companyId: entry.companyId,
              accountId: line.accountId, periodId: period.id,
            },
          });
          if (balance) {
            await tx.accountBalance.update({
              where: { id: balance.id },
              data: {
                periodDebit: balance.periodDebit + line.credit,
                periodCredit: balance.periodCredit + line.debit,
                closingDebit: balance.closingDebit + line.credit,
                closingCredit: balance.closingCredit + line.debit,
              },
            });
          }
        }
      }

      this.logger.log(`Journal reversed: ${entry.journalNumber} → ${reversal.journalNumber} by ${ctx.userId}`);
      return reversal;
    });
  }

  async listJournals(ctx: TenantContext, companyId: string, params?: { status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const { status, startDate, endDate, page = 1, limit = 20 } = params || {};
    const where: Prisma.JournalEntryWhereInput = {
      tenantId: ctx.tenantId, companyId,
      ...(status && { status: status as JournalEntryStatus }),
      ...(startDate && { postingDate: { gte: new Date(startDate) } }),
      ...(endDate && { postingDate: { lte: new Date(endDate) } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: { include: { account: { select: { code: true, name: true } } }, orderBy: { lineNumber: 'asc' } },
        },
        orderBy: { postingDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getJournal(ctx: TenantContext, id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        lines: { include: { account: { select: { code: true, name: true } } }, orderBy: { lineNumber: 'asc' } },
      },
    });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    return entry;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL LEDGER
  // ═══════════════════════════════════════════════════════════════════════════

  async getGeneralLedger(ctx: TenantContext, companyId: string, params?: { accountId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const { accountId, startDate, endDate, page = 1, limit = 50 } = params || {};

    // Build journalEntry filter separately to avoid nested conflicts
    const journalEntryFilter: Prisma.JournalEntryWhereInput = {
      status: 'POSTED',
      tenantId: ctx.tenantId,
      companyId,
      ...(startDate && { postingDate: { gte: new Date(startDate) } }),
      ...(endDate && { postingDate: { lte: new Date(endDate) } }),
    };

    const where: Prisma.JournalLineWhereInput = {
      tenantId: ctx.tenantId, companyId,
      journalEntry: journalEntryFilter,
      ...(accountId && { accountId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.journalLine.findMany({
        where,
        include: {
          account: { select: { code: true, name: true, accountType: true } },
          journalEntry: { select: { journalNumber: true, postingDate: true, description: true } },
        },
        orderBy: [{ journalEntry: { postingDate: 'asc' } }, { lineNumber: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journalLine.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCIAL REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getTrialBalance(ctx: TenantContext, dto: ReportQueryDto) {
    // Get all posted journal lines for the period
    const where: Prisma.JournalLineWhereInput = {
      tenantId: ctx.tenantId, companyId: dto.companyId,
      journalEntry: {
        status: 'POSTED',
        ...(dto.startDate && { postingDate: { gte: new Date(dto.startDate) } }),
        ...(dto.endDate && { postingDate: { lte: new Date(dto.endDate) } }),
      },
    };

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { account: { select: { code: true, name: true, accountType: true } } },
    });

    // Aggregate by account
    const accountTotals = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>();
    for (const line of lines) {
      const key = line.accountId;
      const existing = accountTotals.get(key);
      if (existing) {
        existing.debit += line.debit;
        existing.credit += line.credit;
      } else {
        accountTotals.set(key, {
          code: line.account.code,
          name: line.account.name,
          type: line.account.accountType,
          debit: line.debit,
          credit: line.credit,
        });
      }
    }

    const accounts = Array.from(accountTotals.values()).sort((a, b) => a.code.localeCompare(b.code));
    const totalDebit = accounts.reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = accounts.reduce((sum, a) => sum + a.credit, 0);

    return {
      accounts,
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
      currency: 'USD',
    };
  }

  async getBalanceSheet(ctx: TenantContext, dto: ReportQueryDto) {
    const where: Prisma.JournalLineWhereInput = {
      tenantId: ctx.tenantId, companyId: dto.companyId,
      journalEntry: {
        status: 'POSTED',
        ...(dto.startDate && { postingDate: { gte: new Date(dto.startDate) } }),
        ...(dto.endDate && { postingDate: { lte: new Date(dto.endDate) } }),
      },
    };

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { account: { select: { code: true, name: true, accountType: true, normalBalance: true } } },
    });

    const assetLines = lines.filter(l => l.account.accountType === 'ASSET');
    const liabilityLines = lines.filter(l => l.account.accountType === 'LIABILITY');
    const equityLines = lines.filter(l => l.account.accountType === 'EQUITY');

    const totalAssets = assetLines.reduce((sum, l) => sum + l.debit - l.credit, 0);
    const totalLiabilities = liabilityLines.reduce((sum, l) => sum + l.credit - l.debit, 0);
    const totalEquity = equityLines.reduce((sum, l) => sum + l.credit - l.debit, 0);

    return {
      assets: { total: totalAssets },
      liabilities: { total: totalLiabilities },
      equity: { total: totalEquity },
      isBalanced: totalAssets === (totalLiabilities + totalEquity),
    };
  }

  async getProfitAndLoss(ctx: TenantContext, dto: ReportQueryDto) {
    const where: Prisma.JournalLineWhereInput = {
      tenantId: ctx.tenantId, companyId: dto.companyId,
      journalEntry: {
        status: 'POSTED',
        ...(dto.startDate && { postingDate: { gte: new Date(dto.startDate) } }),
        ...(dto.endDate && { postingDate: { lte: new Date(dto.endDate) } }),
      },
    };

    const lines = await this.prisma.journalLine.findMany({
      where,
      include: { account: { select: { code: true, name: true, accountType: true } } },
    });

    const incomeLines = lines.filter(l => l.account.accountType === 'INCOME');
    const expenseLines = lines.filter(l => l.account.accountType === 'EXPENSE');

    const totalRevenue = incomeLines.reduce((sum, l) => sum + l.credit - l.debit, 0);
    const totalExpenses = expenseLines.reduce((sum, l) => sum + l.debit - l.credit, 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      revenue: { total: totalRevenue },
      expenses: { total: totalExpenses },
      netProfit,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPENSES
  // ═══════════════════════════════════════════════════════════════════════════

  async createExpense(ctx: TenantContext, dto: CreateExpenseDto) {
    const count = await this.prisma.expense.count({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId },
    });
    const expenseNumber = `EXP-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.expense.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        expenseNumber,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        expenseDate: new Date(dto.expenseDate),
        category: dto.category,
        accountId: dto.accountId,
        status: 'DRAFT',
        createdBy: ctx.userId,
      },
    });
  }

  async listExpenses(ctx: TenantContext, companyId: string, params?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params || {};
    const where: Prisma.ExpenseWhereInput = {
      tenantId: ctx.tenantId, companyId,
      ...(status && { status: status as any }),
    };
    const [data, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async submitExpense(ctx: TenantContext, id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (expense.status !== 'DRAFT') throw new BadRequestException('Only DRAFT expenses can be submitted');

    return this.prisma.expense.update({
      where: { id },
      data: { status: 'SUBMITTED' },
    });
  }

  async reviewExpense(ctx: TenantContext, id: string, dto: ReviewExpenseDto) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (expense.status !== 'SUBMITTED') throw new BadRequestException('Expense is not submitted');

    return this.prisma.expense.update({
      where: { id },
      data: {
        status: dto.action as any,
        approvedBy: ctx.userId,
        approvedAt: new Date(),
        rejectReason: dto.reason,
      },
    });
  }

  async postExpenseToFinance(ctx: TenantContext, id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (expense.status !== 'APPROVED') throw new BadRequestException('Only APPROVED expenses can be posted to finance');
    if (expense.journalEntryId) throw new ConflictException('Expense already posted to finance');

    const companyId = expense.companyId;

    // Find expense account (default: 5400 Office Expenses)
    const accounts = await this.prisma.account.findMany({
      where: { tenantId: ctx.tenantId, companyId, isActive: true },
    });
    const expenseAccount = accounts.find(a => a.code === '5400' || a.accountSubtype === 'OPERATING_EXPENSE');
    if (!expenseAccount) throw new BadRequestException('No expense account found — seed chart of accounts first');

    // Find cash/bank account for the credit
    const cashAccount = accounts.find(a => a.accountSubtype === 'CASH' || a.accountSubtype === 'BANK');
    if (!cashAccount) throw new BadRequestException('No cash/bank account found — seed chart of accounts first');

    // Find open period
    const postingDate = expense.expenseDate;
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId: ctx.tenantId, companyId,
        startDate: { lte: postingDate },
        endDate: { gte: postingDate },
        status: 'OPEN',
      },
    });
    if (!period) throw new BadRequestException('No open accounting period for expense date');

    const jeCount = await this.prisma.journalEntry.count({
      where: { tenantId: ctx.tenantId, companyId },
    });

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenantId: ctx.tenantId,
          companyId,
          journalNumber: `JE-${String(jeCount + 1).padStart(6, '0')}`,
          postingDate,
          documentDate: postingDate,
          entryType: 'EXPENSE',
          referenceType: 'EXPENSE' as any,
          referenceId: id,
          description: `Expense ${expense.expenseNumber}: ${expense.description}`,
          status: 'POSTED',
          currency: expense.currency,
          totalDebit: expense.amount,
          totalCredit: expense.amount,
          createdBy: ctx.userId,
          approvedBy: ctx.userId,
          postedBy: ctx.userId,
          postedAt: new Date(),
          periodId: period.id,
        },
      });

      await tx.journalLine.createMany({
        data: [
          {
            tenantId: ctx.tenantId, companyId,
            journalEntryId: entry.id, accountId: expenseAccount.id,
            lineNumber: 1, description: expense.description,
            debit: expense.amount, credit: 0, currency: expense.currency,
          },
          {
            tenantId: ctx.tenantId, companyId,
            journalEntryId: entry.id, accountId: cashAccount.id,
            lineNumber: 2, description: expense.description,
            debit: 0, credit: expense.amount, currency: expense.currency,
          },
        ],
      });

      // Update expense status and link journal
      await tx.expense.update({
        where: { id },
        data: { status: 'POSTED', journalEntryId: entry.id },
      });

      this.logger.log(`Expense posted to finance: ${expense.expenseNumber} → ${entry.journalNumber}`);
      return entry;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMERS & INVOICES (AR)
  // ═══════════════════════════════════════════════════════════════════════════

  async createCustomer(ctx: TenantContext, dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Customer code '${dto.code}' already exists`);

    return this.prisma.customer.create({
      data: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        name: dto.name, code: dto.code, email: dto.email, phone: dto.phone,
        receivableAccountId: dto.receivableAccountId, currency: dto.currency || 'USD',
      },
    });
  }

  async listCustomers(ctx: TenantContext, companyId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId: ctx.tenantId, companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createInvoice(ctx: TenantContext, dto: CreateInvoiceDto) {
    const count = await this.prisma.invoice.count({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId },
    });
    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.invoice.create({
      data: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        customerId: dto.customerId, invoiceNumber,
        description: dto.description, amount: dto.amount,
        currency: dto.currency || 'USD',
        issuedDate: new Date(dto.issuedDate), dueDate: new Date(dto.dueDate),
        outstandingAmount: dto.amount, createdBy: ctx.userId,
      },
    });
  }

  async listInvoices(ctx: TenantContext, companyId: string, params?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params || {};
    const where: Prisma.InvoiceWhereInput = {
      tenantId: ctx.tenantId, companyId, ...(status && { status: status as any }),
    };
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: { select: { name: true, code: true } } },
        orderBy: { issuedDate: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VENDORS & BILLS (AP)
  // ═══════════════════════════════════════════════════════════════════════════

  async createVendor(ctx: TenantContext, dto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findFirst({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Vendor code '${dto.code}' already exists`);

    return this.prisma.vendor.create({
      data: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        name: dto.name, code: dto.code, email: dto.email, phone: dto.phone,
        taxIdentifier: dto.taxIdentifier, payableAccountId: dto.payableAccountId,
        currency: dto.currency || 'USD',
      },
    });
  }

  async listVendors(ctx: TenantContext, companyId: string) {
    return this.prisma.vendor.findMany({
      where: { tenantId: ctx.tenantId, companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createBill(ctx: TenantContext, dto: CreateBillDto) {
    const count = await this.prisma.bill.count({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId },
    });
    const billNumber = `BILL-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.bill.create({
      data: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        vendorId: dto.vendorId, billNumber,
        description: dto.description, amount: dto.amount,
        currency: dto.currency || 'USD',
        receivedDate: new Date(dto.receivedDate), dueDate: new Date(dto.dueDate),
        outstandingAmount: dto.amount, createdBy: ctx.userId,
      },
    });
  }

  async listBills(ctx: TenantContext, companyId: string, params?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params || {};
    const where: Prisma.BillWhereInput = {
      tenantId: ctx.tenantId, companyId, ...(status && { status: status as any }),
    };
    const [data, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: { vendor: { select: { name: true, code: true } } },
        orderBy: { receivedDate: 'desc' },
        skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.bill.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  async createPayment(ctx: TenantContext, dto: CreatePaymentDto) {
    const count = await this.prisma.payment.count({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId },
    });
    const paymentNumber = `PAY-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.payment.create({
      data: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        paymentNumber, paymentDate: new Date(dto.paymentDate),
        amount: dto.amount, currency: dto.currency || 'USD',
        paymentMethod: dto.paymentMethod as any,
        bankAccountId: dto.bankAccountId, reference: dto.reference,
        description: dto.description, vendorId: dto.vendorId,
        billId: dto.billId, customerId: dto.customerId,
        invoiceId: dto.invoiceId, createdBy: ctx.userId,
      },
    });
  }

  async postPaymentToFinance(ctx: TenantContext, id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (payment.status !== 'PENDING') throw new BadRequestException('Only PENDING payments can be posted');
    if (payment.journalEntryId) throw new ConflictException('Payment already posted to finance');

    const companyId = payment.companyId;

    // Determine if this is a vendor payment (AP) or customer receipt (AR)
    const isVendorPayment = !!payment.vendorId;
    const isCustomerReceipt = !!payment.customerId;

    // Find required accounts
    const accounts = await this.prisma.account.findMany({
      where: { tenantId: ctx.tenantId, companyId, isActive: true },
    });

    const bankAccount = accounts.find(a => a.accountSubtype === 'BANK' || a.accountSubtype === 'CASH');
    if (!bankAccount) throw new BadRequestException('No bank/cash account found — seed chart of accounts first');

    let offsetAccount;
    if (isVendorPayment) {
      offsetAccount = accounts.find(a => a.accountSubtype === 'ACCOUNTS_PAYABLE');
      if (!offsetAccount) throw new BadRequestException('No Accounts Payable account found');
    } else if (isCustomerReceipt) {
      offsetAccount = accounts.find(a => a.accountSubtype === 'ACCOUNTS_RECEIVABLE');
      if (!offsetAccount) throw new BadRequestException('No Accounts Receivable account found');
    } else {
      throw new BadRequestException('Payment must be linked to a vendor or customer');
    }

    // Find open period
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId: ctx.tenantId, companyId,
        startDate: { lte: payment.paymentDate },
        endDate: { gte: payment.paymentDate },
        status: 'OPEN',
      },
    });
    if (!period) throw new BadRequestException('No open accounting period for payment date');

    const jeCount = await this.prisma.journalEntry.count({
      where: { tenantId: ctx.tenantId, companyId },
    });

    return this.prisma.$transaction(async (tx) => {
      // For vendor payments: DR AP, CR Bank
      // For customer receipts: DR Bank, CR AR
      const debitAccount = isVendorPayment ? offsetAccount.id : bankAccount.id;
      const creditAccount = isVendorPayment ? bankAccount.id : offsetAccount.id;

      const entry = await tx.journalEntry.create({
        data: {
          tenantId: ctx.tenantId,
          companyId,
          journalNumber: `JE-${String(jeCount + 1).padStart(6, '0')}`,
          postingDate: payment.paymentDate,
          documentDate: payment.paymentDate,
          entryType: 'PAYMENT',
          referenceType: 'PAYMENT' as any,
          referenceId: id,
          description: payment.description || `Payment ${payment.paymentNumber}`,
          status: 'POSTED',
          currency: payment.currency,
          totalDebit: payment.amount,
          totalCredit: payment.amount,
          createdBy: ctx.userId,
          approvedBy: ctx.userId,
          postedBy: ctx.userId,
          postedAt: new Date(),
          periodId: period.id,
        },
      });

      await tx.journalLine.createMany({
        data: [
          {
            tenantId: ctx.tenantId, companyId,
            journalEntryId: entry.id, accountId: debitAccount,
            lineNumber: 1, description: payment.description || payment.paymentNumber,
            debit: payment.amount, credit: 0, currency: payment.currency,
          },
          {
            tenantId: ctx.tenantId, companyId,
            journalEntryId: entry.id, accountId: creditAccount,
            lineNumber: 2, description: payment.description || payment.paymentNumber,
            debit: 0, credit: payment.amount, currency: payment.currency,
          },
        ],
      });

      // Update payment status and link journal
      await tx.payment.update({
        where: { id },
        data: { status: 'COMPLETED', journalEntryId: entry.id },
      });

      // Update invoice outstanding if linked
      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
        if (invoice) {
          const newPaid = invoice.paidAmount + payment.amount;
          const newOutstanding = Math.max(0, invoice.amount - newPaid);
          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              status: newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID',
            },
          });
        }
      }

      // Update bill outstanding if linked
      if (payment.billId) {
        const bill = await tx.bill.findUnique({ where: { id: payment.billId } });
        if (bill) {
          const newPaid = bill.paidAmount + payment.amount;
          const newOutstanding = Math.max(0, bill.amount - newPaid);
          await tx.bill.update({
            where: { id: payment.billId },
            data: {
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              status: newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID',
            },
          });
        }
      }

      this.logger.log(`Payment posted to finance: ${payment.paymentNumber} → ${entry.journalNumber}`);
      return entry;
    });
  }

  async listPayments(ctx: TenantContext, companyId: string, params?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params || {};
    const where: Prisma.PaymentWhereInput = {
      tenantId: ctx.tenantId, companyId, ...(status && { status: status as any }),
    };
    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({ where, orderBy: { paymentDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BANKING
  // ═══════════════════════════════════════════════════════════════════════════

  async createBankAccount(ctx: TenantContext, dto: CreateBankAccountDto) {
    const existing = await this.prisma.bankAccount.findFirst({
      where: { tenantId: ctx.tenantId, companyId: dto.companyId, accountNumber: dto.accountNumber },
    });
    if (existing) throw new ConflictException('Bank account number already exists');

    return this.prisma.bankAccount.create({
      data: {
        tenantId: ctx.tenantId, companyId: dto.companyId,
        bankName: dto.bankName, accountName: dto.accountName,
        accountNumber: dto.accountNumber, currency: dto.currency || 'USD',
        glAccountId: dto.glAccountId,
      },
    });
  }

  async listBankAccounts(ctx: TenantContext, companyId: string) {
    return this.prisma.bankAccount.findMany({
      where: { tenantId: ctx.tenantId, companyId },
      include: { glAccount: { select: { code: true, name: true } } },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL → FINANCE INTEGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  async postPayrollToFinance(ctx: TenantContext, runId: string) {
    // Load the payroll run with lines
    const run = await this.prisma.payrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    if (run.tenantId !== ctx.tenantId) throw new ForbiddenException('Access denied');
    if (run.status !== 'FINALIZED' && run.status !== 'APPROVED') {
      throw new BadRequestException('Payroll run must be finalized before posting to finance');
    }

    const companyId = run.companyId as string;

    // Check idempotency — prevent duplicate posting
    const existingJournal = await this.prisma.journalEntry.findFirst({
      where: {
        tenantId: ctx.tenantId,
        companyId,
        referenceType: 'PAYROLL_RUN' as any,
        referenceId: runId,
      },
    });
    if (existingJournal) {
      throw new ConflictException(`Payroll run already posted to finance as journal ${existingJournal.journalNumber}`);
    }

    // Get payroll lines
    const lines = await this.prisma.payrollLine.findMany({ where: { runId } });
    if (lines.length === 0) throw new BadRequestException('No payroll lines found');

    // Aggregate totals
    const totalGross = lines.reduce((s, l) => s + l.grossPay, 0);
    const totalDeductions = lines.reduce((s, l) => s + l.totalDeductions, 0);
    const totalNet = lines.reduce((s, l) => s + l.netPay, 0);
    const currency = run.currency || 'USD';

    // Find the required accounts (default chart)
    const accounts = await this.prisma.account.findMany({
      where: { tenantId: ctx.tenantId, companyId, isActive: true },
    });

    const salaryExpense = accounts.find(a => a.accountSubtype === 'OPERATING_EXPENSE' && a.code === '5100');
    const payrollPayable = accounts.find(a => a.accountSubtype === 'PAYROLL_PAYABLE');
    const taxPayable = accounts.find(a => a.accountSubtype === 'TAX_PAYABLE');

    if (!salaryExpense) throw new BadRequestException('Salary Expense account (5100) not found — seed chart of accounts first');
    if (!payrollPayable) throw new BadRequestException('Payroll Payable account (2200) not found — seed chart of accounts first');
    if (!taxPayable) throw new BadRequestException('Tax Payable account (2300) not found — seed chart of accounts first');

    // Find open period
    const postingDate = new Date();
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId: ctx.tenantId, companyId,
        startDate: { lte: postingDate },
        endDate: { gte: postingDate },
        status: 'OPEN',
      },
    });
    if (!period) throw new BadRequestException('No open accounting period for current date');

    // Generate journal number
    const jeCount = await this.prisma.journalEntry.count({
      where: { tenantId: ctx.tenantId, companyId },
    });

    // Build journal lines:
    //   Salary Expense        DR  totalGross
    //   Payroll Payable       CR  totalNet
    //   Tax Payable           CR  totalDeductions
    const journalLines = [
      {
        accountId: salaryExpense.id,
        debit: totalGross,
        credit: 0,
        description: `Salary expense for payroll run ${runId}`,
      },
      {
        accountId: payrollPayable.id,
        debit: 0,
        credit: totalNet,
        description: `Net pay payable for payroll run ${runId}`,
      },
      {
        accountId: taxPayable.id,
        debit: 0,
        credit: totalDeductions,
        description: `Tax/deductions payable for payroll run ${runId}`,
      },
    ];

    const totalDebit = journalLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = journalLines.reduce((s, l) => s + l.credit, 0);

    if (totalDebit !== totalCredit) {
      throw new BadRequestException(`Payroll posting is unbalanced: DR ${totalDebit} ≠ CR ${totalCredit}`);
    }

    // Create journal entry
    return this.prisma.$transaction(async (tx) => {
      const journalNumber = `JE-${String(jeCount + 1).padStart(6, '0')}`;

      const entry = await tx.journalEntry.create({
        data: {
          tenantId: ctx.tenantId,
          companyId,
          journalNumber,
          postingDate,
          documentDate: postingDate,
          entryType: 'PAYROLL',
          description: `Payroll run ${runId} — ${lines.length} employees`,
          status: 'POSTED',
          currency,
          totalDebit,
          totalCredit,
          referenceType: 'PAYROLL_RUN' as any,
          referenceId: runId,
          createdBy: ctx.userId,
          approvedBy: ctx.userId,
          postedBy: ctx.userId,
          postedAt: new Date(),
          periodId: period.id,
        },
      });

      await tx.journalLine.createMany({
        data: journalLines.map((line, idx) => ({
          tenantId: ctx.tenantId,
          companyId,
          journalEntryId: entry.id,
          accountId: line.accountId,
          lineNumber: idx + 1,
          description: line.description,
          debit: line.debit,
          credit: line.credit,
          currency,
          reference: `PAYROLL_RUN:${runId}`,
        })),
      });

      this.logger.log(`Payroll → Finance posted: ${journalNumber} for run ${runId} (${totalDebit} ${currency})`);

      return entry;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext, companyId: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get account balances
    const accounts = await this.prisma.account.findMany({
      where: { tenantId: ctx.tenantId, companyId, isActive: true },
    });

    // Get posted journals for current period
    const journals = await this.prisma.journalEntry.findMany({
      where: {
        tenantId: ctx.tenantId, companyId, status: 'POSTED',
        postingDate: { gte: periodStart, lte: periodEnd },
      },
      include: { lines: true },
    });

    let cashBank = 0;
    let receivables = 0;
    let payables = 0;
    let revenue = 0;
    let expenses = 0;

    for (const journal of journals) {
      for (const line of journal.lines) {
        const account = accounts.find(a => a.id === line.accountId);
        if (!account) continue;
        if (account.accountSubtype === 'CASH' || account.accountSubtype === 'BANK') {
          cashBank += line.debit - line.credit;
        }
        if (account.accountSubtype === 'ACCOUNTS_RECEIVABLE') {
          receivables += line.debit - line.credit;
        }
        if (account.accountSubtype === 'ACCOUNTS_PAYABLE') {
          payables += line.credit - line.debit;
        }
        if (account.accountType === 'INCOME') {
          revenue += line.credit - line.debit;
        }
        if (account.accountType === 'EXPENSE') {
          expenses += line.debit - line.credit;
        }
      }
    }

    const pendingJournals = await this.prisma.journalEntry.count({
      where: { tenantId: ctx.tenantId, companyId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
    });

    return {
      cashBank,
      receivables,
      payables,
      revenue,
      expenses,
      netProfit: revenue - expenses,
      pendingApprovals: pendingJournals,
      periodStart,
      periodEnd,
    };
  }
}
