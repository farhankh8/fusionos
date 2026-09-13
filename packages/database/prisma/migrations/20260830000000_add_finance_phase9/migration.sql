-- Add canonical Finance canonical tables (accounts, customers, invoices, vendors, bills, payments, journaling, expenses, banking)
--
-- Generated from canonical Prisma schema using `prisma migrate diff` and
-- cross-checked so the final schema exactly matches the Prisma datamodel.

CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
CREATE TYPE "AccountSubtype" AS ENUM ('CASH', 'BANK', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'PAYROLL_PAYABLE', 'TAX_PAYABLE', 'FIXED_ASSET', 'INVENTORY', 'REVENUE', 'OPERATING_EXPENSE', 'OTHER');
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "AccountingPeriodStatus" AS ENUM ('OPEN', 'CLOSING', 'CLOSED');
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REVERSED', 'VOIDED');
CREATE TYPE "JournalEntryType" AS ENUM ('STANDARD', 'PAYROLL', 'EXPENSE', 'PAYMENT', 'ADJUSTMENT', 'REVERSAL', 'OPENING_BALANCE');
CREATE TYPE "SourceDocumentType" AS ENUM ('MANUAL_JOURNAL', 'PAYROLL_RUN', 'PAYROLL_LINE', 'PAYSLIP', 'EXPENSE', 'INVOICE', 'BILL', 'PAYMENT', 'BANK_ADJUSTMENT');
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'PAID');
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');
CREATE TYPE "BillStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'VOID');
CREATE TYPE "BankReconciliationStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'RECONCILED');
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "parentId" UUID,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "accountType" "AccountType" NOT NULL,
    "accountSubtype" "AccountSubtype" DEFAULT 'OTHER',
    "normalBalance" "NormalBalance" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
    "allowManualPosting" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account_balances" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "openingDebit" INTEGER NOT NULL DEFAULT 0,
    "openingCredit" INTEGER NOT NULL DEFAULT 0,
    "periodDebit" INTEGER NOT NULL DEFAULT 0,
    "periodCredit" INTEGER NOT NULL DEFAULT 0,
    "closingDebit" INTEGER NOT NULL DEFAULT 0,
    "closingCredit" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounting_periods" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AccountingPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "isFiscalYearEnd" BOOLEAN NOT NULL DEFAULT false,
    "closedBy" UUID,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journal_entries" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "journalNumber" VARCHAR(50) NOT NULL,
    "postingDate" DATE NOT NULL,
    "documentDate" DATE NOT NULL,
    "entryType" "JournalEntryType" NOT NULL DEFAULT 'STANDARD',
    "referenceType" "SourceDocumentType",
    "referenceId" UUID,
    "description" VARCHAR(500) NOT NULL,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "totalDebit" INTEGER NOT NULL DEFAULT 0,
    "totalCredit" INTEGER NOT NULL DEFAULT 0,
    "periodId" UUID,
    "reversalOf" UUID,
    "reversedBy" UUID,
    "createdBy" UUID NOT NULL,
    "approvedBy" UUID,
    "postedBy" UUID,
    "postedAt" TIMESTAMP(3),
    "voidedBy" UUID,
    "voidedAt" TIMESTAMP(3),
    "voidReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "journal_lines" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "journalEntryId" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "description" VARCHAR(500),
    "debit" INTEGER NOT NULL DEFAULT 0,
    "credit" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "employeeId" UUID,
    "branchId" UUID,
    "departmentId" UUID,
    "reference" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "employeeId" UUID,
    "expenseNumber" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "expenseDate" DATE NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "accountId" UUID,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "journalEntryId" UUID,
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectReason" VARCHAR(500),
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "receivableAccountId" UUID,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "issuedDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "outstandingAmount" INTEGER NOT NULL DEFAULT 0,
    "journalEntryId" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "taxIdentifier" VARCHAR(100),
    "payableAccountId" UUID,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bills" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "billNumber" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "receivedDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'DRAFT',
    "paidAmount" INTEGER NOT NULL DEFAULT 0,
    "outstandingAmount" INTEGER NOT NULL DEFAULT 0,
    "journalEntryId" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "paymentNumber" VARCHAR(50) NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "bankAccountId" UUID,
    "reference" VARCHAR(255),
    "description" VARCHAR(500),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "journalEntryId" UUID,
    "vendorId" UUID,
    "billId" UUID,
    "customerId" UUID,
    "invoiceId" UUID,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "bankName" VARCHAR(255) NOT NULL,
    "accountName" VARCHAR(255) NOT NULL,
    "accountNumber" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "glAccountId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "bankAccountId" UUID NOT NULL,
    "transactionDate" DATE NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "reference" VARCHAR(255),
    "journalEntryId" UUID,
    "reconciliationStatus" "BankReconciliationStatus" NOT NULL DEFAULT 'UNMATCHED',
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accounts_tenantId_idx" ON "accounts"("tenantId");
CREATE INDEX "accounts_companyId_idx" ON "accounts"("companyId");
CREATE INDEX "accounts_parentId_idx" ON "accounts"("parentId");
CREATE INDEX "accounts_accountType_idx" ON "accounts"("accountType");
CREATE INDEX "accounts_tenantId_companyId_accountType_idx" ON "accounts"("tenantId", "companyId", "accountType");
CREATE UNIQUE INDEX "accounts_tenantId_companyId_code_key" ON "accounts"("tenantId", "companyId", "code");
CREATE INDEX "account_balances_tenantId_idx" ON "account_balances"("tenantId");
CREATE INDEX "account_balances_companyId_idx" ON "account_balances"("companyId");
CREATE INDEX "account_balances_accountId_idx" ON "account_balances"("accountId");
CREATE INDEX "account_balances_periodId_idx" ON "account_balances"("periodId");
CREATE UNIQUE INDEX "account_balances_tenantId_companyId_accountId_periodId_key" ON "account_balances"("tenantId", "companyId", "accountId", "periodId");
CREATE INDEX "accounting_periods_tenantId_idx" ON "accounting_periods"("tenantId");
CREATE INDEX "accounting_periods_companyId_idx" ON "accounting_periods"("companyId");
CREATE INDEX "accounting_periods_tenantId_companyId_status_idx" ON "accounting_periods"("tenantId", "companyId", "status");
CREATE UNIQUE INDEX "accounting_periods_tenantId_companyId_startDate_key" ON "accounting_periods"("tenantId", "companyId", "startDate");
CREATE INDEX "journal_entries_tenantId_idx" ON "journal_entries"("tenantId");
CREATE INDEX "journal_entries_companyId_idx" ON "journal_entries"("companyId");
CREATE INDEX "journal_entries_status_idx" ON "journal_entries"("status");
CREATE INDEX "journal_entries_postingDate_idx" ON "journal_entries"("postingDate");
CREATE INDEX "journal_entries_referenceType_referenceId_idx" ON "journal_entries"("referenceType", "referenceId");
CREATE INDEX "journal_entries_tenantId_companyId_status_idx" ON "journal_entries"("tenantId", "companyId", "status");
CREATE INDEX "journal_entries_tenantId_companyId_postingDate_idx" ON "journal_entries"("tenantId", "companyId", "postingDate");
CREATE INDEX "journal_entries_periodId_idx" ON "journal_entries"("periodId");
CREATE UNIQUE INDEX "journal_entries_tenantId_companyId_journalNumber_key" ON "journal_entries"("tenantId", "companyId", "journalNumber");
CREATE INDEX "journal_lines_tenantId_idx" ON "journal_lines"("tenantId");
CREATE INDEX "journal_lines_companyId_idx" ON "journal_lines"("companyId");
CREATE INDEX "journal_lines_journalEntryId_idx" ON "journal_lines"("journalEntryId");
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");
CREATE INDEX "journal_lines_employeeId_idx" ON "journal_lines"("employeeId");
CREATE INDEX "journal_lines_tenantId_companyId_accountId_idx" ON "journal_lines"("tenantId", "companyId", "accountId");
CREATE INDEX "expenses_tenantId_idx" ON "expenses"("tenantId");
CREATE INDEX "expenses_companyId_idx" ON "expenses"("companyId");
CREATE INDEX "expenses_employeeId_idx" ON "expenses"("employeeId");
CREATE INDEX "expenses_status_idx" ON "expenses"("status");
CREATE INDEX "expenses_tenantId_companyId_status_idx" ON "expenses"("tenantId", "companyId", "status");
CREATE UNIQUE INDEX "expenses_tenantId_companyId_expenseNumber_key" ON "expenses"("tenantId", "companyId", "expenseNumber");
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");
CREATE INDEX "customers_companyId_idx" ON "customers"("companyId");
CREATE UNIQUE INDEX "customers_tenantId_companyId_code_key" ON "customers"("tenantId", "companyId", "code");
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");
CREATE INDEX "invoices_companyId_idx" ON "invoices"("companyId");
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_tenantId_companyId_status_idx" ON "invoices"("tenantId", "companyId", "status");
CREATE UNIQUE INDEX "invoices_tenantId_companyId_invoiceNumber_key" ON "invoices"("tenantId", "companyId", "invoiceNumber");
CREATE INDEX "vendors_tenantId_idx" ON "vendors"("tenantId");
CREATE INDEX "vendors_companyId_idx" ON "vendors"("companyId");
CREATE UNIQUE INDEX "vendors_tenantId_companyId_code_key" ON "vendors"("tenantId", "companyId", "code");
CREATE INDEX "bills_tenantId_idx" ON "bills"("tenantId");
CREATE INDEX "bills_companyId_idx" ON "bills"("companyId");
CREATE INDEX "bills_vendorId_idx" ON "bills"("vendorId");
CREATE INDEX "bills_status_idx" ON "bills"("status");
CREATE INDEX "bills_tenantId_companyId_status_idx" ON "bills"("tenantId", "companyId", "status");
CREATE UNIQUE INDEX "bills_tenantId_companyId_billNumber_key" ON "bills"("tenantId", "companyId", "billNumber");
CREATE INDEX "payments_tenantId_idx" ON "payments"("tenantId");
CREATE INDEX "payments_companyId_idx" ON "payments"("companyId");
CREATE INDEX "payments_status_idx" ON "payments"("status");
CREATE INDEX "payments_tenantId_companyId_status_idx" ON "payments"("tenantId", "companyId", "status");
CREATE UNIQUE INDEX "payments_tenantId_companyId_paymentNumber_key" ON "payments"("tenantId", "companyId", "paymentNumber");
CREATE INDEX "bank_accounts_tenantId_idx" ON "bank_accounts"("tenantId");
CREATE INDEX "bank_accounts_companyId_idx" ON "bank_accounts"("companyId");
CREATE UNIQUE INDEX "bank_accounts_tenantId_companyId_accountNumber_key" ON "bank_accounts"("tenantId", "companyId", "accountNumber");
CREATE INDEX "bank_transactions_tenantId_idx" ON "bank_transactions"("tenantId");
CREATE INDEX "bank_transactions_companyId_idx" ON "bank_transactions"("companyId");
CREATE INDEX "bank_transactions_bankAccountId_idx" ON "bank_transactions"("bankAccountId");
CREATE INDEX "bank_transactions_reconciliationStatus_idx" ON "bank_transactions"("reconciliationStatus");
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversalOf_fkey" FOREIGN KEY ("reversalOf") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bills" ADD CONSTRAINT "bills_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "account_balances" ADD CONSTRAINT "account_balances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bills" ADD CONSTRAINT "bills_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bills" ADD CONSTRAINT "bills_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
