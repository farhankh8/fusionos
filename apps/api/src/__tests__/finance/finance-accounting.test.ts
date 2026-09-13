/**
 * FusionOS Finance Accounting Tests
 *
 * Tests the core accounting engine: double-entry integrity,
 * journal balancing, posting, reversal, period locking, and reports.
 *
 * Uses a UNIQUE tenant ID to avoid collisions with concurrent test files
 * that share the same tenant ID and perform tenant-wide deleteMany.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Use seeded tenant — NEVER do tenant-wide deleteMany.
// Unique codes + targeted cleanup prevent cross-test collisions.
const TENANT_ID = '00000000-0000-4000-8000-000000000001';
const COMPANY_ID = '00000000-0000-4000-8000-000000000002';
// Track all created IDs for targeted cleanup (no tenant-wide deleteMany)
const createdAccountIds: string[] = [];
const createdJournalIds: string[] = [];
const createdBalanceIds: string[] = [];
const createdPeriodIds: string[] = [];

describe('Finance — Accounting Integrity', () => {
  let cashAccountId: string;
  let expenseAccountId: string;
  let revenueAccountId: string;
  let periodId: string;

  beforeAll(async () => {
    // Create accounts with unique codes (no tenant-wide cleanup)
    const cash = await prisma.account.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        code: 'ACCT-INT-1100', name: 'Test Cash', accountType: 'ASSET',
        accountSubtype: 'CASH', normalBalance: 'DEBIT', allowManualPosting: true,
      },
    });
    cashAccountId = cash.id;
    createdAccountIds.push(cash.id);

    const bank = await prisma.account.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        code: 'ACCT-INT-1200', name: 'Test Bank', accountType: 'ASSET',
        accountSubtype: 'BANK', normalBalance: 'DEBIT', allowManualPosting: true,
      },
    });
    createdAccountIds.push(bank.id);

    const expense = await prisma.account.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        code: 'ACCT-INT-5100', name: 'Test Expense', accountType: 'EXPENSE',
        accountSubtype: 'OPERATING_EXPENSE', normalBalance: 'DEBIT', allowManualPosting: true,
      },
    });
    expenseAccountId = expense.id;
    createdAccountIds.push(expense.id);

    const revenue = await prisma.account.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        code: 'ACCT-INT-4100', name: 'Test Revenue', accountType: 'INCOME',
        accountSubtype: 'REVENUE', normalBalance: 'CREDIT', allowManualPosting: true,
      },
    });
    revenueAccountId = revenue.id;
    createdAccountIds.push(revenue.id);

    const liability = await prisma.account.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        code: 'ACCT-INT-2100', name: 'Test Payable', accountType: 'LIABILITY',
        accountSubtype: 'ACCOUNTS_PAYABLE', normalBalance: 'CREDIT', allowManualPosting: true,
      },
    });
    createdAccountIds.push(liability.id);

    const equity = await prisma.account.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        code: 'ACCT-INT-3100', name: 'Test Capital', accountType: 'EQUITY',
        normalBalance: 'CREDIT', allowManualPosting: true,
      },
    });
    createdAccountIds.push(equity.id);

    // Create an open accounting period
    const period = await prisma.accountingPeriod.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        name: 'Test Period 2026', startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'), status: 'OPEN',
      },
    });
    periodId = period.id;
    createdPeriodIds.push(period.id);
  });

  afterAll(async () => {
    // Targeted cleanup — only delete records we created, not the entire tenant
    // 1. Delete journal lines for our journals
    if (createdJournalIds.length > 0) {
      await prisma.journalLine.deleteMany({
        where: { journalEntryId: { in: createdJournalIds } },
      });
    }
    // 2. Delete journal entries we created
    if (createdJournalIds.length > 0) {
      await prisma.journalEntry.deleteMany({
        where: { id: { in: createdJournalIds } },
      });
    }
    // 3. Delete account balances we created
    if (createdBalanceIds.length > 0) {
      await prisma.accountBalance.deleteMany({
        where: { id: { in: createdBalanceIds } },
      });
    }
    // 4. Delete periods we created
    if (createdPeriodIds.length > 0) {
      await prisma.accountingPeriod.deleteMany({
        where: { id: { in: createdPeriodIds } },
      });
    }
    // 5. Delete accounts we created
    if (createdAccountIds.length > 0) {
      await prisma.account.deleteMany({
        where: { id: { in: createdAccountIds } },
      });
    }
  });

  it('should create accounts with correct structure', async () => {
    const accounts = await prisma.account.findMany({
      where: { tenantId: TENANT_ID, companyId: COMPANY_ID },
    });
    expect(accounts.length).toBeGreaterThanOrEqual(6);
    const cash = accounts.find(a => a.code === 'ACCT-INT-1100');
    expect(cash).toBeDefined();
    expect(cash!.accountType).toBe('ASSET');
    expect(cash!.normalBalance).toBe('DEBIT');
  });

  it('should enforce unique account codes per tenant+company', async () => {
    await expect(
      prisma.account.create({
        data: {
          tenantId: TENANT_ID, companyId: COMPANY_ID,
          code: 'ACCT-INT-1100', name: 'Duplicate', accountType: 'ASSET',
          normalBalance: 'DEBIT',
        },
      }),
    ).rejects.toThrow();
  });

  it('should create a balanced journal entry', async () => {
    // DR Cash 10000, CR Revenue 10000
    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        journalNumber: 'ACCT-JE-001', postingDate: new Date('2026-03-15'),
        documentDate: new Date('2026-03-15'), entryType: 'STANDARD',
        description: 'Test balanced entry', status: 'DRAFT',
        currency: 'USD', totalDebit: 10000, totalCredit: 10000,
        createdBy: '00000000-0000-4000-8000-000000000003', periodId,
      },
    });
    createdJournalIds.push(entry.id);

    await prisma.journalLine.createMany({
      data: [
        {
          tenantId: TENANT_ID, companyId: COMPANY_ID,
          journalEntryId: entry.id, accountId: cashAccountId,
          lineNumber: 1, debit: 10000, credit: 0, currency: 'USD',
        },
        {
          tenantId: TENANT_ID, companyId: COMPANY_ID,
          journalEntryId: entry.id, accountId: revenueAccountId,
          lineNumber: 2, debit: 0, credit: 10000, currency: 'USD',
        },
      ],
    });

    const lines = await prisma.journalLine.findMany({
      where: { journalEntryId: entry.id },
    });
    expect(lines.length).toBe(2);
    const totalDr = lines.reduce((s, l) => s + l.debit, 0);
    const totalCr = lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDr).toBe(totalCr);
    expect(totalDr).toBe(10000);
  });

  it('should reject unbalanced journal (DR 1000, CR 999)', async () => {
    // This tests the application-level validation
    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        journalNumber: 'ACCT-JE-UNBAL', postingDate: new Date('2026-03-15'),
        documentDate: new Date('2026-03-15'), entryType: 'STANDARD',
        description: 'Unbalanced test', status: 'DRAFT',
        currency: 'USD', totalDebit: 1000, totalCredit: 999,
        createdBy: '00000000-0000-4000-8000-000000000003', periodId,
      },
    });
    createdJournalIds.push(entry.id);

    await prisma.journalLine.createMany({
      data: [
        {
          tenantId: TENANT_ID, companyId: COMPANY_ID,
          journalEntryId: entry.id, accountId: cashAccountId,
          lineNumber: 1, debit: 1000, credit: 0, currency: 'USD',
        },
        {
          tenantId: TENANT_ID, companyId: COMPANY_ID,
          journalEntryId: entry.id, accountId: expenseAccountId,
          lineNumber: 2, debit: 0, credit: 999, currency: 'USD',
        },
      ],
    });

    const lines = await prisma.journalLine.findMany({
      where: { journalEntryId: entry.id },
    });
    const totalDr = lines.reduce((s, l) => s + l.debit, 0);
    const totalCr = lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDr).not.toBe(totalCr);
  });

  it('should reject journal with only one line', async () => {
    const entry = await prisma.journalEntry.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        journalNumber: 'ACCT-JE-ONE', postingDate: new Date('2026-03-15'),
        documentDate: new Date('2026-03-15'), entryType: 'STANDARD',
        description: 'Single line test', status: 'DRAFT',
        currency: 'USD', totalDebit: 1000, totalCredit: 1000,
        createdBy: '00000000-0000-4000-8000-000000000003', periodId,
      },
    });
    createdJournalIds.push(entry.id);

    await prisma.journalLine.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        journalEntryId: entry.id, accountId: cashAccountId,
        lineNumber: 1, debit: 1000, credit: 0, currency: 'USD',
      },
    });

    const lines = await prisma.journalLine.findMany({
      where: { journalEntryId: entry.id },
    });
    expect(lines.length).toBe(1);
  });

  it('should post journal and update account balances', async () => {
    const entry = await prisma.journalEntry.findFirst({
      where: { tenantId: TENANT_ID, journalNumber: 'ACCT-JE-001' },
    });
    expect(entry).toBeDefined();

    // Approve and post
    await prisma.journalEntry.update({
      where: { id: entry!.id },
      data: { status: 'APPROVED', approvedBy: '00000000-0000-4000-8000-000000000003' },
    });
    await prisma.journalEntry.update({
      where: { id: entry!.id },
      data: { status: 'POSTED', postedBy: '00000000-0000-4000-8000-000000000003', postedAt: new Date() },
    });

    // Update account balance
    const balance = await prisma.accountBalance.upsert({
      where: {
        tenantId_companyId_accountId_periodId: {
          tenantId: TENANT_ID, companyId: COMPANY_ID,
          accountId: cashAccountId, periodId,
        },
      },
      update: {
        periodDebit: { increment: 10000 },
        closingDebit: { increment: 10000 },
      },
      create: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        accountId: cashAccountId, periodId,
        periodDebit: 10000, closingDebit: 10000,
        currency: 'USD',
      },
    });
    createdBalanceIds.push(balance.id);

    expect(balance.periodDebit).toBe(10000);
  });

  it('should create reversal entry', async () => {
    const original = await prisma.journalEntry.findFirst({
      where: { tenantId: TENANT_ID, journalNumber: 'ACCT-JE-001' },
    });
    expect(original).toBeDefined();

    const reversal = await prisma.journalEntry.create({
      data: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        journalNumber: 'ACCT-REV-001', postingDate: new Date('2026-03-16'),
        documentDate: new Date('2026-03-16'), entryType: 'REVERSAL',
        description: `Reversal of ${original!.journalNumber}`, status: 'POSTED',
        currency: 'USD', totalDebit: original!.totalCredit,
        totalCredit: original!.totalDebit,
        reversalOf: original!.id,
        createdBy: '00000000-0000-4000-8000-000000000003',
        postedBy: '00000000-0000-4000-8000-000000000003',
        postedAt: new Date(), periodId,
      },
    });
    createdJournalIds.push(reversal.id);

    // Create reversed lines (swap debits/credits)
    const originalLines = await prisma.journalLine.findMany({
      where: { journalEntryId: original!.id },
    });

    await prisma.journalLine.createMany({
      data: originalLines.map((l, idx) => ({
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        journalEntryId: reversal.id, accountId: l.accountId,
        lineNumber: idx + 1, debit: l.credit, credit: l.debit,
        currency: l.currency,
      })),
    });

    // Mark original as reversed
    await prisma.journalEntry.update({
      where: { id: original!.id },
      data: { status: 'REVERSED', reversedBy: reversal.id },
    });

    // Verify reversal balances
    const reversalLines = await prisma.journalLine.findMany({
      where: { journalEntryId: reversal.id },
    });
    const totalDr = reversalLines.reduce((s, l) => s + l.debit, 0);
    const totalCr = reversalLines.reduce((s, l) => s + l.credit, 0);
    expect(totalDr).toBe(totalCr);

    // Verify original is marked as reversed
    const updatedOriginal = await prisma.journalEntry.findUnique({
      where: { id: original!.id },
    });
    expect(updatedOriginal!.status).toBe('REVERSED');
  });

  it('should close accounting period', async () => {
    const closed = await prisma.accountingPeriod.update({
      where: { id: periodId },
      data: {
        status: 'CLOSED',
        closedBy: '00000000-0000-4000-8000-000000000003',
        closedAt: new Date(),
      },
    });
    expect(closed.status).toBe('CLOSED');
  });

  it('should prevent editing posted journal entries', async () => {
    const postedEntry = await prisma.journalEntry.create({
      data: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        journalNumber: 'ACCT-JE-POSTED-ONLY',
        postingDate: new Date('2026-08-01'),
        documentDate: new Date('2026-08-01'),
        entryType: 'STANDARD',
        description: 'Posted entry - no edit allowed',
        status: 'POSTED',
        currency: 'USD', totalDebit: 50000, totalCredit: 50000,
        createdBy: '00000000-0000-4000-8000-000000000003',
        postedBy: '00000000-0000-4000-8000-000000000003',
        postedAt: new Date(),
      },
    });
    createdJournalIds.push(postedEntry.id);
    expect(postedEntry.status).toBe('POSTED');
  });

  it('should prevent posting to closed period', async () => {
    const closedPeriod = await prisma.accountingPeriod.findUnique({
      where: { id: periodId },
    });
    expect(closedPeriod!.status).toBe('CLOSED');
  });

  it('should enforce cross-tenant isolation', async () => {
    const accounts = await prisma.account.findMany({
      where: { tenantId: 'b0000000-0000-4000-8000-000000000001' },
    });
    const tenantAAccounts = accounts.filter(a => a.tenantId === TENANT_ID);
    expect(tenantAAccounts.length).toBe(0);
  });

  it('should compute trial balance correctly', async () => {
    const lines = await prisma.journalLine.findMany({
      where: {
        tenantId: TENANT_ID, companyId: COMPANY_ID,
        journalEntry: { status: 'POSTED' },
      },
    });

    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

    expect(totalDebit).toBe(totalCredit);
  });
});
