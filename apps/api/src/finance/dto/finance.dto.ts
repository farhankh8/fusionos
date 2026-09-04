/**
 * FusionOS Finance DTOs
 * Validation schemas for all finance operations.
 */

import {
  IsString, IsOptional, IsEnum, IsUUID, IsInt, IsDateString,
  IsBoolean, IsEmail, MaxLength, Min, ValidateNested, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Account DTOs ──────────────────────────────────────────────────────────

export class CreateAccountDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() parentId?: string;
  @IsString() @MaxLength(20) code!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const) accountType!: string;
  @IsOptional() @IsEnum(['CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'PAYROLL_PAYABLE', 'TAX_PAYABLE', 'FIXED_ASSET', 'INVENTORY', 'REVENUE', 'OPERATING_EXPENSE', 'OTHER'] as const) accountSubtype?: string;
  @IsEnum(['DEBIT', 'CREDIT'] as const) normalBalance!: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsOptional() @IsBoolean() allowManualPosting?: boolean;
}

export class UpdateAccountDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() allowManualPosting?: boolean;
}

// ── Accounting Period DTOs ────────────────────────────────────────────────

export class CreatePeriodDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(100) name!: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsBoolean() isFiscalYearEnd?: boolean;
}

export class ClosePeriodDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

// ── Journal DTOs ──────────────────────────────────────────────────────────

export class JournalLineDto {
  @IsUUID() accountId!: string;
  @IsInt() @Min(0) debit!: number;
  @IsInt() @Min(0) credit!: number;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsString() @MaxLength(255) reference?: string;
}

export class CreateJournalDto {
  @IsUUID() companyId!: string;
  @IsDateString() postingDate!: string;
  @IsDateString() documentDate!: string;
  @IsOptional() @IsEnum(['STANDARD', 'PAYROLL', 'EXPENSE', 'PAYMENT', 'ADJUSTMENT', 'REVERSAL', 'OPENING_BALANCE'] as const) entryType?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => JournalLineDto) lines!: JournalLineDto[];
}

export class ApproveJournalDto {
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class ReverseJournalDto {
  @IsString() @MaxLength(500) reason!: string;
  @IsDateString() reversalDate!: string;
}

// ── Expense DTOs ──────────────────────────────────────────────────────────

export class CreateExpenseDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsUUID() employeeId?: string;
  @IsString() @MaxLength(500) description!: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsDateString() expenseDate!: string;
  @IsString() @MaxLength(100) category!: string;
  @IsOptional() @IsUUID() accountId?: string;
}

export class ReviewExpenseDto {
  @IsEnum(['APPROVED', 'REJECTED'] as const) action!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

// ── Customer DTOs ─────────────────────────────────────────────────────────

export class CreateCustomerDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsString() @MaxLength(50) code!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsUUID() receivableAccountId?: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
}

// ── Invoice DTOs ──────────────────────────────────────────────────────────

export class CreateInvoiceDto {
  @IsUUID() companyId!: string;
  @IsUUID() customerId!: string;
  @IsString() @MaxLength(500) description?: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsDateString() issuedDate!: string;
  @IsDateString() dueDate!: string;
}

// ── Vendor DTOs ───────────────────────────────────────────────────────────

export class CreateVendorDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(255) name!: string;
  @IsString() @MaxLength(50) code!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) taxIdentifier?: string;
  @IsOptional() @IsUUID() payableAccountId?: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
}

// ── Bill DTOs ─────────────────────────────────────────────────────────────

export class CreateBillDto {
  @IsUUID() companyId!: string;
  @IsUUID() vendorId!: string;
  @IsString() @MaxLength(500) description?: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsDateString() receivedDate!: string;
  @IsDateString() dueDate!: string;
}

// ── Payment DTOs ──────────────────────────────────────────────────────────

export class CreatePaymentDto {
  @IsUUID() companyId!: string;
  @IsDateString() paymentDate!: string;
  @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsEnum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'] as const) paymentMethod!: string;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsString() @MaxLength(255) reference?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() vendorId?: string;
  @IsOptional() @IsUUID() billId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() invoiceId?: string;
}

// ── Bank Account DTOs ─────────────────────────────────────────────────────

export class CreateBankAccountDto {
  @IsUUID() companyId!: string;
  @IsString() @MaxLength(255) bankName!: string;
  @IsString() @MaxLength(255) accountName!: string;
  @IsString() @MaxLength(50) accountNumber!: string;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
  @IsUUID() glAccountId!: string;
}

// ── Report Query DTOs ─────────────────────────────────────────────────────

export class ReportQueryDto {
  @IsUUID() companyId!: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() periodId?: string;
}
