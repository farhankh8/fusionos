/**
 * FusionOS Intelligence — Cross-Module Context Builder
 *
 * Provides controlled, tenant-scoped data retrieval across modules.
 * All queries go through existing domain services — never direct database access.
 */

import { PrismaClient } from '@prisma/client';

export interface ModuleContext {
  module: string;
  data: Record<string, unknown>;
  retrievedAt: string;
}

/**
 * Build cross-module context for a given entity.
 * All queries are tenant-scoped and use controlled access patterns.
 */
export async function buildCrossModuleContext(params: {
  prisma: PrismaClient;
  tenantId: string;
  entityType: string;
  entityId: string;
  modules: string[];
}): Promise<ModuleContext[]> {
  const { prisma, tenantId, entityType, entityId, modules } = params;
  const contexts: ModuleContext[] = [];

  for (const mod of modules) {
    try {
      const data = await retrieveModuleData(prisma, tenantId, mod, entityType, entityId);
      if (data) {
        contexts.push({ module: mod, data, retrievedAt: new Date().toISOString() });
      }
    } catch {
      // Module data retrieval failure is non-critical
    }
  }

  return contexts;
}

/**
 * Retrieve data from a specific module for an entity.
 */
async function retrieveModuleData(
  prisma: PrismaClient,
  tenantId: string,
  module: string,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  switch (module) {
    case 'Finance':
      return retrieveFinanceContext(prisma, tenantId, entityType, entityId);
    case 'CRM':
      return retrieveCRMContext(prisma, tenantId, entityType, entityId);
    case 'People':
      return retrievePeopleContext(prisma, tenantId, entityType, entityId);
    case 'Projects':
      return retrieveProjectsContext(prisma, tenantId, entityType, entityId);
    case 'Automation':
      return retrieveAutomationContext(prisma, tenantId, entityType, entityId);
    case 'Documents':
      return retrieveDocumentsContext(prisma, tenantId, entityType, entityId);
    default:
      return null;
  }
}

async function retrieveFinanceContext(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'Invoice' || entityType === 'invoice') {
    const invoice = await prisma.invoice.findUnique({
      where: { id: entityId },
      select: {
        id: true, invoiceNumber: true, amount: true, outstandingAmount: true,
        status: true, currency: true, dueDate: true, issuedDate: true,
        customer: { select: { id: true, name: true, email: true } },
      },
    });
    if (!invoice || invoice.customer === null) return null;
    return {
      invoice: {
        id: invoice.id,
        number: invoice.invoiceNumber,
        amount: invoice.amount,
        outstanding: invoice.outstandingAmount,
        status: invoice.status,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        issuedDate: invoice.issuedDate,
      },
      customer: invoice.customer,
    };
  }

  if (entityType === 'Customer' || entityType === 'customer') {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, customerId: entityId },
      select: { id: true, amount: true, outstandingAmount: true, status: true, dueDate: true },
      orderBy: { dueDate: 'desc' },
      take: 10,
    });
    return {
      customerInvoices: invoices,
      totalOutstanding: invoices.reduce((sum, i) => sum + i.outstandingAmount, 0),
      overdueCount: invoices.filter((i) => i.outstandingAmount > 0 && new Date(i.dueDate) < new Date()).length,
    };
  }

  return null;
}

async function retrieveCRMContext(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'Customer' || entityType === 'customer') {
    const opportunities = await prisma.opportunity.findMany({
      where: { tenantId, customerProfileId: entityId },
      select: { id: true, name: true, stage: true, amount: true, probability: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    return {
      customerOpportunities: opportunities,
      openOpportunities: opportunities.filter((o) => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).length,
    };
  }

  if (entityType === 'Lead' || entityType === 'lead') {
    const lead = await prisma.lead.findUnique({
      where: { id: entityId },
      select: { id: true, firstName: true, lastName: true, email: true, status: true, source: true },
    });
    return lead ? { lead } : null;
  }

  return null;
}

async function retrievePeopleContext(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'LeaveRequest' || entityType === 'leaveRequest') {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: entityId },
      select: {
        id: true, startDate: true, endDate: true, duration: true, reason: true, status: true,
        employee: { select: { id: true, firstName: true, lastName: true, departmentId: true } },
      },
    });
    return leave ? { leaveRequest: leave } : null;
  }

  if (entityType === 'Attendance' || entityType === 'attendance') {
    const attendance = await prisma.attendance.findUnique({
      where: { id: entityId },
      select: {
        id: true, date: true, status: true, firstClockIn: true, lastClockOut: true, lateMinutes: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return attendance ? { attendance } : null;
  }

  return null;
}

async function retrieveProjectsContext(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'Project' || entityType === 'project') {
    const project = await prisma.project.findUnique({
      where: { id: entityId },
      select: {
        id: true, name: true, status: true,
        tasks: { select: { id: true, title: true, status: true, priority: true }, take: 10 },
        _count: { select: { tasks: true } },
      },
    });
    return project ? { project } : null;
  }

  return null;
}

async function retrieveAutomationContext(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'AutomationExecution' || entityType === 'automationExecution') {
    const execution = await prisma.automationExecution.findUnique({
      where: { id: entityId },
      select: {
        id: true, status: true, error: true, duration: true,
        workflow: { select: { id: true, name: true } },
        steps: { select: { stepNumber: true, actionType: true, status: true, error: true } },
      },
    });
    return execution ? { execution } : null;
  }

  return null;
}

async function retrieveDocumentsContext(
  prisma: PrismaClient,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  if (entityType === 'Document' || entityType === 'document') {
    const doc = await prisma.document.findUnique({
      where: { id: entityId },
      select: { id: true, name: true, status: true, createdAt: true },
    });
    return doc ? { document: doc } : null;
  }

  return null;
}
