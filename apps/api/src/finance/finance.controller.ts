/**
 * FusionOS Finance Controller
 * REST endpoints for the complete accounting system.
 */

import {
  Controller, Get, Post, Patch, Param, Body, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { CurrentTenant, RequirePermission } from '../common/decorators';
import type { TenantContext } from '../auth/services/tenant-context.service';
import { FinanceService } from './services/finance.service';
import {
  CreateAccountDto, UpdateAccountDto, CreatePeriodDto, ClosePeriodDto,
  CreateJournalDto, ApproveJournalDto, ReverseJournalDto,
  ReportQueryDto, CreateExpenseDto, ReviewExpenseDto,
  CreateCustomerDto, CreateInvoiceDto, CreateVendorDto, CreateBillDto,
  CreatePaymentDto, CreateBankAccountDto,
} from './dto/finance.dto';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── Payroll → Finance ────────────────────────────────────────────────────

  @Post('post-payroll/:runId')
  @RequirePermission('finance.journal:create')
  @HttpCode(HttpStatus.CREATED)
  async postPayrollToFinance(@CurrentTenant() ctx: TenantContext, @Param('runId', ParseUUIDPipe) runId: string) {
    return this.financeService.postPayrollToFinance(ctx, runId);
  }

  // ── Dashboard ───────────────────────────────────────────────────────────

  @Get('dashboard')
  @RequirePermission('finance:read')
  async getDashboard(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.financeService.getDashboard(ctx, companyId);
  }

  // ── Chart of Accounts ───────────────────────────────────────────────────

  @Post('accounts')
  @RequirePermission('finance.account:create')
  @HttpCode(HttpStatus.CREATED)
  async createAccount(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateAccountDto) {
    return this.financeService.createAccount(ctx, dto);
  }

  @Get('accounts')
  @RequirePermission('finance.account:read')
  async listAccounts(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.financeService.listAccounts(ctx, companyId);
  }

  @Get('accounts/:id')
  @RequirePermission('finance.account:read')
  async getAccount(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.getAccount(ctx, id);
  }

  @Patch('accounts/:id')
  @RequirePermission('finance.account:update')
  async updateAccount(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountDto) {
    return this.financeService.updateAccount(ctx, id, dto);
  }

  @Post('accounts/seed')
  @RequirePermission('finance.account:create')
  @HttpCode(HttpStatus.CREATED)
  async seedDefaultAccounts(@CurrentTenant() ctx: TenantContext, @Body('companyId') companyId: string) {
    return this.financeService.seedDefaultChartOfAccounts(ctx, companyId);
  }

  // ── Accounting Periods ──────────────────────────────────────────────────

  @Post('periods')
  @RequirePermission('finance.period:manage')
  @HttpCode(HttpStatus.CREATED)
  async createPeriod(@CurrentTenant() ctx: TenantContext, @Body() dto: CreatePeriodDto) {
    return this.financeService.createPeriod(ctx, dto);
  }

  @Get('periods')
  @RequirePermission('finance.period:read')
  async listPeriods(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.financeService.listPeriods(ctx, companyId);
  }

  @Patch('periods/:id/close')
  @RequirePermission('finance.period:close')
  async closePeriod(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ClosePeriodDto) {
    return this.financeService.closePeriod(ctx, id, dto);
  }

  // ── Journal Entries ─────────────────────────────────────────────────────

  @Post('journals')
  @RequirePermission('finance.journal:create')
  @HttpCode(HttpStatus.CREATED)
  async createJournal(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateJournalDto) {
    return this.financeService.createJournal(ctx, dto);
  }

  @Get('journals')
  @RequirePermission('finance.journal:read')
  async listJournals(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.listJournals(ctx, companyId, {
      status, startDate, endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('journals/:id')
  @RequirePermission('finance.journal:read')
  async getJournal(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.getJournal(ctx, id);
  }

  @Patch('journals/:id/approve')
  @RequirePermission('finance.journal:approve')
  async approveJournal(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveJournalDto) {
    return this.financeService.approveJournal(ctx, id, dto);
  }

  @Patch('journals/:id/post')
  @RequirePermission('finance.journal:post')
  async postJournal(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.postJournal(ctx, id);
  }

  @Patch('journals/:id/reverse')
  @RequirePermission('finance.journal:reverse')
  async reverseJournal(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReverseJournalDto) {
    return this.financeService.reverseJournal(ctx, id, dto);
  }

  // ── General Ledger ──────────────────────────────────────────────────────

  @Get('ledger')
  @RequirePermission('finance.ledger:read')
  async getGeneralLedger(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.getGeneralLedger(ctx, companyId, {
      accountId, startDate, endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  // ── Reports ─────────────────────────────────────────────────────────────

  @Get('reports/trial-balance')
  @RequirePermission('finance.report:read')
  async getTrialBalance(@CurrentTenant() ctx: TenantContext, @Query() query: ReportQueryDto) {
    return this.financeService.getTrialBalance(ctx, query);
  }

  @Get('reports/balance-sheet')
  @RequirePermission('finance.report:read')
  async getBalanceSheet(@CurrentTenant() ctx: TenantContext, @Query() query: ReportQueryDto) {
    return this.financeService.getBalanceSheet(ctx, query);
  }

  @Get('reports/profit-loss')
  @RequirePermission('finance.report:read')
  async getProfitAndLoss(@CurrentTenant() ctx: TenantContext, @Query() query: ReportQueryDto) {
    return this.financeService.getProfitAndLoss(ctx, query);
  }

  // ── Expenses ────────────────────────────────────────────────────────────

  @Post('expenses')
  @RequirePermission('finance.expense:create')
  @HttpCode(HttpStatus.CREATED)
  async createExpense(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateExpenseDto) {
    return this.financeService.createExpense(ctx, dto);
  }

  @Get('expenses')
  @RequirePermission('finance.expense:read')
  async listExpenses(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.listExpenses(ctx, companyId, {
      status, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  @Patch('expenses/:id/submit')
  @RequirePermission('finance.expense:create')
  async submitExpense(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.submitExpense(ctx, id);
  }

  @Patch('expenses/:id/review')
  @RequirePermission('finance.expense:approve')
  async reviewExpense(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewExpenseDto) {
    return this.financeService.reviewExpense(ctx, id, dto);
  }

  @Patch('expenses/:id/post')
  @RequirePermission('finance.journal:create')
  async postExpenseToFinance(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.postExpenseToFinance(ctx, id);
  }

  // ── Customers & Invoices (AR) ──────────────────────────────────────────

  @Post('customers')
  @RequirePermission('finance.ar:manage')
  @HttpCode(HttpStatus.CREATED)
  async createCustomer(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateCustomerDto) {
    return this.financeService.createCustomer(ctx, dto);
  }

  @Get('customers')
  @RequirePermission('finance.ar:read')
  async listCustomers(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.financeService.listCustomers(ctx, companyId);
  }

  @Post('invoices')
  @RequirePermission('finance.ar:manage')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateInvoiceDto) {
    return this.financeService.createInvoice(ctx, dto);
  }

  @Get('invoices')
  @RequirePermission('finance.ar:read')
  async listInvoices(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.listInvoices(ctx, companyId, {
      status, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  // ── Vendors & Bills (AP) ───────────────────────────────────────────────

  @Post('vendors')
  @RequirePermission('finance.ap:manage')
  @HttpCode(HttpStatus.CREATED)
  async createVendor(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateVendorDto) {
    return this.financeService.createVendor(ctx, dto);
  }

  @Get('vendors')
  @RequirePermission('finance.ap:read')
  async listVendors(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.financeService.listVendors(ctx, companyId);
  }

  @Post('bills')
  @RequirePermission('finance.ap:manage')
  @HttpCode(HttpStatus.CREATED)
  async createBill(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateBillDto) {
    return this.financeService.createBill(ctx, dto);
  }

  @Get('bills')
  @RequirePermission('finance.ap:read')
  async listBills(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.listBills(ctx, companyId, {
      status, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  // ── Payments ────────────────────────────────────────────────────────────

  @Post('payments')
  @RequirePermission('finance.payment:create')
  @HttpCode(HttpStatus.CREATED)
  async createPayment(@CurrentTenant() ctx: TenantContext, @Body() dto: CreatePaymentDto) {
    return this.financeService.createPayment(ctx, dto);
  }

  @Patch('payments/:id/post')
  @RequirePermission('finance.payment:create')
  async postPaymentToFinance(@CurrentTenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.financeService.postPaymentToFinance(ctx, id);
  }

  @Get('payments')
  @RequirePermission('finance.payment:read')
  async listPayments(
    @CurrentTenant() ctx: TenantContext,
    @Query('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeService.listPayments(ctx, companyId, {
      status, page: page ? parseInt(page) : 1, limit: limit ? parseInt(limit) : 20,
    });
  }

  // ── Banking ─────────────────────────────────────────────────────────────

  @Post('bank-accounts')
  @RequirePermission('finance:manage')
  @HttpCode(HttpStatus.CREATED)
  async createBankAccount(@CurrentTenant() ctx: TenantContext, @Body() dto: CreateBankAccountDto) {
    return this.financeService.createBankAccount(ctx, dto);
  }

  @Get('bank-accounts')
  @RequirePermission('finance:read')
  async listBankAccounts(@CurrentTenant() ctx: TenantContext, @Query('companyId') companyId: string) {
    return this.financeService.listBankAccounts(ctx, companyId);
  }
}
