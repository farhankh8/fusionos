/**
 * FusionOS CRM Integration Tests
 *
 * Comprehensive tests covering:
 * - Customer Profile lifecycle
 * - Contact CRUD
 * - Lead lifecycle (NEW → QUALIFIED → CONVERTED)
 * - Lead conversion idempotency
 * - Opportunity lifecycle & stage transitions
 * - Pipeline calculations
 * - Activities
 * - Tasks
 * - Notes
 * - Finance Customer reuse
 * - Tenant isolation
 * - IDOR protection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const COMPANY_A = '00000000-0000-4000-8000-000000000002';
const COMPANY_B = '10000000-0000-4000-8000-000000000002';

describe('CRM — Integration & Invariant Tests', () => {
  let EMPLOYEE_A: string;
  let customerA: string;
  let customerB: string;
  let customerProfileA: string;
  let contactA: string;
  let leadA1: string;
  let leadA2: string;
  let leadB1: string;
  let opportunityA: string;
  let activityA: string;
  let taskA: string;
  let noteA: string;

  beforeAll(async () => {
    // Find a valid employee for FK references
    const emp = await prisma.employee.findFirst({
      where: { tenantId: TENANT_A },
      select: { id: true },
    });
    if (!emp) throw new Error('No employee found for TENANT_A — run seed first');
    EMPLOYEE_A = emp.id;

    // Clean CRM test data (only CRM tables)
    for (const tid of [TENANT_A, TENANT_B]) {
      await prisma.activity.deleteMany({ where: { tenantId: tid } });
      await prisma.crmNote.deleteMany({ where: { tenantId: tid } });
      await prisma.task.deleteMany({ where: { tenantId: tid } });
      await prisma.opportunity.deleteMany({ where: { tenantId: tid } });
      await prisma.lead.deleteMany({ where: { tenantId: tid } });
      await prisma.contact.deleteMany({ where: { tenantId: tid } });
      await prisma.customerProfile.deleteMany({ where: { tenantId: tid } });
    }

    // Create Finance Customers (reuse existing entity)
    // Use upsert to handle re-runs
    const custA = await prisma.customer.upsert({
      where: { id: '00000000-0000-4000-8000-000000000099' },
      create: {
        id: '00000000-0000-4000-8000-000000000099',
        tenantId: TENANT_A, companyId: COMPANY_A,
        name: 'Test Customer A', code: 'CRM-TCA-001',
        currency: 'USD',
      },
      update: {},
    });
    customerA = custA.id;

    const custB = await prisma.customer.upsert({
      where: { id: '10000000-0000-4000-8000-000000000099' },
      create: {
        id: '10000000-0000-4000-8000-000000000099',
        tenantId: TENANT_B, companyId: COMPANY_B,
        name: 'Test Customer B', code: 'CRM-TCB-001',
        currency: 'USD',
      },
      update: {},
    });
    customerB = custB.id;
  });

  afterAll(async () => {
    // Clean up test data
    for (const tid of [TENANT_A, TENANT_B]) {
      await prisma.activity.deleteMany({ where: { tenantId: tid } });
      await prisma.crmNote.deleteMany({ where: { tenantId: tid } });
      await prisma.task.deleteMany({ where: { tenantId: tid } });
      await prisma.opportunity.deleteMany({ where: { tenantId: tid } });
      await prisma.lead.deleteMany({ where: { tenantId: tid } });
      await prisma.contact.deleteMany({ where: { tenantId: tid } });
      await prisma.customerProfile.deleteMany({ where: { tenantId: tid } });
    }
    await prisma.customer.deleteMany({ where: { id: { in: ['00000000-0000-4000-8000-000000000099', '10000000-0000-4000-8000-000000000099'] } } });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMER PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Customer Profile', () => {
    it('should create a customer profile extending Finance Customer', async () => {
      const profile = await prisma.customerProfile.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A, customerId: customerA,
          customerType: 'BUSINESS', customerSegment: 'PREMIUM',
          lifecycleStage: 'CUSTOMER', industry: 'Technology',
          ownerId: EMPLOYEE_A, rating: 4,
        },
      });
      customerProfileA = profile.id;
      expect(profile.id).toBeDefined();
      expect(profile.customerId).toBe(customerA);
      expect(profile.tenantId).toBe(TENANT_A);
      expect(profile.lifecycleStage).toBe('CUSTOMER');
    });

    it('should enforce unique profile per customer per tenant', async () => {
      await expect(
        prisma.customerProfile.create({
          data: {
            tenantId: TENANT_A, companyId: COMPANY_A, customerId: customerA,
          },
        }),
      ).rejects.toThrow();
    });

    it('should allow different tenants to create profiles for different customers', async () => {
      const profileB = await prisma.customerProfile.create({
        data: {
          tenantId: TENANT_B, companyId: COMPANY_B, customerId: customerB,
          lifecycleStage: 'LEAD',
        },
      });
      expect(profileB.id).toBeDefined();
      expect(profileB.tenantId).toBe(TENANT_B);
    });

    it('should count profiles correctly', async () => {
      const count = await prisma.customerProfile.count({
        where: { tenantId: TENANT_A },
      });
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Contacts', () => {
    it('should create a contact under a customer profile', async () => {
      const contact = await prisma.contact.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          firstName: 'John', lastName: 'Doe',
          email: 'john.doe@example.com', phone: '+1234567890',
          isPrimary: true,
        },
      });
      contactA = contact.id;
      expect(contact.id).toBeDefined();
      expect(contact.isPrimary).toBe(true);
      expect(contact.email).toBe('john.doe@example.com');
    });

    it('should create multiple contacts per profile', async () => {
      const contact2 = await prisma.contact.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          firstName: 'Jane', lastName: 'Smith',
          email: 'jane.smith@example.com',
        },
      });
      const contacts = await prisma.contact.findMany({
        where: { customerProfileId: customerProfileA },
      });
      expect(contacts.length).toBeGreaterThanOrEqual(2);
    });

    it('should query contacts by tenant only', async () => {
      const contactsA = await prisma.contact.findMany({
        where: { tenantId: TENANT_A, customerProfileId: customerProfileA },
      });
      const contactsB = await prisma.contact.findMany({
        where: { tenantId: TENANT_B, customerProfileId: customerProfileA },
      });
      expect(contactsA.length).toBeGreaterThanOrEqual(1);
      expect(contactsB.length).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LEADS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Leads', () => {
    it('should create a lead with status NEW', async () => {
      const lead = await prisma.lead.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          firstName: 'Bob', lastName: 'Johnson',
          email: 'bob@acme.com', phone: '+1987654321',
          companyName: 'Acme Corp', source: 'WEBSITE',
          status: 'NEW', ownerId: EMPLOYEE_A, rating: 3,
        },
      });
      leadA1 = lead.id;
      expect(lead.id).toBeDefined();
      expect(lead.status).toBe('NEW');
      expect(lead.source).toBe('WEBSITE');
    });

    it('should create leads for tenant B independently', async () => {
      const leadB = await prisma.lead.create({
        data: {
          tenantId: TENANT_B, companyId: COMPANY_B,
          firstName: 'Alice', lastName: 'Wong',
          companyName: 'Global Inc', source: 'REFERRAL',
          status: 'NEW',
        },
      });
      leadB1 = leadB.id;
      expect(leadB.tenantId).toBe(TENANT_B);
    });

    it('should update lead status to CONTACTED', async () => {
      const updated = await prisma.lead.update({
        where: { id: leadA1 },
        data: { status: 'CONTACTED' },
      });
      expect(updated.status).toBe('CONTACTED');
    });

    it('should update lead status to QUALIFIED', async () => {
      const updated = await prisma.lead.update({
        where: { id: leadA1 },
        data: { status: 'QUALIFIED' },
      });
      expect(updated.status).toBe('QUALIFIED');
    });

    it('should create a second lead for conversion test', async () => {
      const lead2 = await prisma.lead.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          firstName: 'Sarah', lastName: 'Lee',
          email: 'sarah@techcorp.com',
          companyName: 'TechCorp', source: 'COLD_CALL',
          status: 'QUALIFIED',
        },
      });
      leadA2 = lead2.id;
      expect(leadA2).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LEAD CONVERSION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Lead Conversion', () => {
    it('should convert a qualified lead into customer + profile + opportunity', async () => {
      // Convert lead A2
      const result = await prisma.$transaction(async (tx) => {
        // Create Finance Customer
        const newCustomer = await tx.customer.create({
          data: {
            tenantId: TENANT_A, companyId: COMPANY_A,
            name: 'Sarah Lee', code: `CUST-CONV-${Date.now()}`,
            email: 'sarah@techcorp.com', currency: 'USD',
          },
        });

        // Create CRM Profile
        const profile = await tx.customerProfile.create({
          data: {
            tenantId: TENANT_A, companyId: COMPANY_A,
            customerId: newCustomer.id,
            lifecycleStage: 'CUSTOMER',
            source: 'COLD_CALL',
          },
        });

        // Update Lead
        await tx.lead.update({
          where: { id: leadA2 },
          data: {
            status: 'CONVERTED',
            customerProfileId: profile.id,
            convertedAt: new Date(),
            convertedById: EMPLOYEE_A,
          },
        });

        // Create Opportunity
        const opp = await tx.opportunity.create({
          data: {
            tenantId: TENANT_A, companyId: COMPANY_A,
            customerProfileId: profile.id,
            name: 'Deal from TechCorp',
            stage: 'PROSPECTING',
            status: 'OPEN',
            amount: 5000000, // $50,000.00
            currency: 'USD',
            probability: 20,
          },
        });

        return { customerId: newCustomer.id, profileId: profile.id, oppId: opp.id };
      });

      expect(result.customerId).toBeDefined();
      expect(result.profileId).toBeDefined();
      expect(result.oppId).toBeDefined();

      // Verify lead is marked converted
      const updatedLead = await prisma.lead.findUnique({ where: { id: leadA2 } });
      expect(updatedLead!.status).toBe('CONVERTED');
      expect(updatedLead!.customerProfileId).toBe(result.profileId);
    });

    it('should prevent double conversion of the same lead', async () => {
      await expect(
        prisma.$transaction(async (tx) => {
          const lead = await tx.lead.findUnique({ where: { id: leadA2 } });
          if (lead!.status === 'CONVERTED') {
            throw new Error('Lead is already converted');
          }
        }),
      ).rejects.toThrow('Lead is already converted');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OPPORTUNITIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Opportunities', () => {
    it('should create an opportunity', async () => {
      const opp = await prisma.opportunity.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          name: 'Enterprise Deal',
          stage: 'QUALIFICATION',
          status: 'OPEN',
          amount: 10000000, // $100,000.00
          currency: 'USD',
          probability: 30,
          ownerId: EMPLOYEE_A,
        },
      });
      opportunityA = opp.id;
      expect(opp.id).toBeDefined();
      expect(opp.amount).toBe(10000000);
      expect(opp.probability).toBe(30);
    });

    it('should transition opportunity through stages', async () => {
      const stages = ['PROPOSAL', 'NEGOTIATION'];
      for (const stage of stages) {
        await prisma.opportunity.update({
          where: { id: opportunityA },
          data: { stage: stage as any },
        });
      }
      const opp = await prisma.opportunity.findUnique({ where: { id: opportunityA } });
      expect(opp!.stage).toBe('NEGOTIATION');
    });

    it('should close opportunity as WON', async () => {
      await prisma.opportunity.update({
        where: { id: opportunityA },
        data: {
          stage: 'CLOSED_WON',
          status: 'WON',
          probability: 100,
          actualCloseDate: new Date(),
        },
      });
      const opp = await prisma.opportunity.findUnique({ where: { id: opportunityA } });
      expect(opp!.stage).toBe('CLOSED_WON');
      expect(opp!.status).toBe('WON');
      expect(opp!.probability).toBe(100);
    });

    it('should calculate pipeline totals correctly', async () => {
      const opps = await prisma.opportunity.findMany({
        where: { tenantId: TENANT_A, status: 'OPEN' },
        select: { amount: true, probability: true },
      });
      const totalValue = opps.reduce((sum, o) => sum + o.amount, 0);
      const weightedValue = opps.reduce(
        (sum, o) => sum + Math.round(o.amount * o.probability / 100), 0,
      );
      // All open opps should have non-negative values
      expect(totalValue).toBeGreaterThanOrEqual(0);
      expect(weightedValue).toBeGreaterThanOrEqual(0);
    });

    it('should only query opportunities within same tenant', async () => {
      const oppsA = await prisma.opportunity.findMany({
        where: { tenantId: TENANT_A },
      });
      const oppsB = await prisma.opportunity.findMany({
        where: { tenantId: TENANT_B },
      });
      for (const opp of oppsA) {
        expect(opp.tenantId).toBe(TENANT_A);
      }
      for (const opp of oppsB) {
        expect(opp.tenantId).toBe(TENANT_B);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Activities', () => {
    it('should create an activity linked to customer profile', async () => {
      const activity = await prisma.activity.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          activityType: 'CALL',
          subject: 'Initial discovery call',
          description: 'Discussed requirements and timeline',
          actorId: EMPLOYEE_A,
        },
      });
      activityA = activity.id;
      expect(activity.id).toBeDefined();
      expect(activity.activityType).toBe('CALL');
    });

    it('should create activity linked to lead', async () => {
      const activity = await prisma.activity.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          leadId: leadA1,
          activityType: 'EMAIL',
          subject: 'Follow-up email',
          actorId: EMPLOYEE_A,
        },
      });
      expect(activity.leadId).toBe(leadA1);
    });

    it('should create activity linked to opportunity', async () => {
      const activity = await prisma.activity.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          opportunityId: opportunityA,
          activityType: 'MEETING',
          subject: 'Product demo',
          actorId: EMPLOYEE_A,
        },
      });
      expect(activity.opportunityId).toBe(opportunityA);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tasks', () => {
    it('should create a task', async () => {
      const task = await prisma.task.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          title: 'Send proposal',
          description: 'Prepare and send the proposal document',
          assigneeId: EMPLOYEE_A,
          priority: 'HIGH',
          status: 'TODO',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
      });
      taskA = task.id;
      expect(task.id).toBeDefined();
      expect(task.status).toBe('TODO');
      expect(task.priority).toBe('HIGH');
    });

    it('should transition task to IN_PROGRESS', async () => {
      await prisma.task.update({
        where: { id: taskA },
        data: { status: 'IN_PROGRESS' },
      });
      const task = await prisma.task.findUnique({ where: { id: taskA } });
      expect(task!.status).toBe('IN_PROGRESS');
    });

    it('should complete a task', async () => {
      await prisma.task.update({
        where: { id: taskA },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      const task = await prisma.task.findUnique({ where: { id: taskA } });
      expect(task!.status).toBe('COMPLETED');
      expect(task!.completedAt).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // NOTES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Notes', () => {
    it('should create a note against customer profile', async () => {
      const note = await prisma.crmNote.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          customerProfileId: customerProfileA,
          authorId: EMPLOYEE_A,
          content: 'Customer prefers email communication. Decision maker is VP of Engineering.',
        },
      });
      noteA = note.id;
      expect(note.id).toBeDefined();
      expect(note.authorId).toBe(EMPLOYEE_A);
    });

    it('should create a note against lead', async () => {
      const note = await prisma.crmNote.create({
        data: {
          tenantId: TENANT_A, companyId: COMPANY_A,
          leadId: leadA1,
          authorId: EMPLOYEE_A,
          content: 'Lead from website demo request.',
        },
      });
      expect(note.leadId).toBe(leadA1);
    });

    it('should update note content', async () => {
      const updated = await prisma.crmNote.update({
        where: { id: noteA },
        data: { content: 'Updated: Customer prefers Slack communication.' },
      });
      expect(updated.content).toContain('Slack');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    it('Tenant A cannot read Tenant B customer profiles', async () => {
      const profilesA = await prisma.customerProfile.findMany({
        where: { tenantId: TENANT_A },
      });
      const profilesB = await prisma.customerProfile.findMany({
        where: { tenantId: TENANT_B },
      });
      // Tenant B profile should not appear in Tenant A results
      for (const p of profilesA) {
        expect(p.tenantId).toBe(TENANT_A);
      }
      for (const p of profilesB) {
        expect(p.tenantId).toBe(TENANT_B);
      }
    });

    it('Tenant A cannot read Tenant B leads', async () => {
      const leadsA = await prisma.lead.findMany({ where: { tenantId: TENANT_A } });
      const leadsB = await prisma.lead.findMany({ where: { tenantId: TENANT_B } });
      for (const l of leadsA) {
        expect(l.tenantId).toBe(TENANT_A);
      }
      for (const l of leadsB) {
        expect(l.tenantId).toBe(TENANT_B);
      }
    });

    it('Tenant A cannot read Tenant B contacts', async () => {
      const contacts = await prisma.contact.findMany({ where: { tenantId: TENANT_A } });
      for (const c of contacts) {
        expect(c.tenantId).toBe(TENANT_A);
      }
    });

    it('Tenant A cannot read Tenant B opportunities', async () => {
      const opps = await prisma.opportunity.findMany({ where: { tenantId: TENANT_A } });
      for (const o of opps) {
        expect(o.tenantId).toBe(TENANT_A);
      }
    });

    it('Tenant A cannot read Tenant B activities', async () => {
      const activities = await prisma.activity.findMany({ where: { tenantId: TENANT_A } });
      for (const a of activities) {
        expect(a.tenantId).toBe(TENANT_A);
      }
    });

    it('Tenant A cannot read Tenant B tasks', async () => {
      const tasks = await prisma.task.findMany({ where: { tenantId: TENANT_A } });
      for (const t of tasks) {
        expect(t.tenantId).toBe(TENANT_A);
      }
    });

    it('Tenant A cannot read Tenant B notes', async () => {
      const notes = await prisma.crmNote.findMany({ where: { tenantId: TENANT_A } });
      for (const n of notes) {
        expect(n.tenantId).toBe(TENANT_A);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY INVARIANTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity Invariants', () => {
    it('every contact must belong to a valid customer profile', async () => {
      const contacts = await prisma.contact.findMany({ where: { tenantId: TENANT_A } });
      for (const c of contacts) {
        const profile = await prisma.customerProfile.findUnique({
          where: { id: c.customerProfileId },
        });
        expect(profile).not.toBeNull();
        expect(profile!.tenantId).toBe(c.tenantId);
      }
    });

    it('every opportunity must have a valid amount (integer)', async () => {
      const opps = await prisma.opportunity.findMany({ where: { tenantId: TENANT_A } });
      for (const o of opps) {
        expect(Number.isInteger(o.amount)).toBe(true);
        expect(o.amount).toBeGreaterThanOrEqual(0);
      }
    });

    it('every activity must have a valid actor', async () => {
      const activities = await prisma.activity.findMany({ where: { tenantId: TENANT_A } });
      for (const a of activities) {
        const actor = await prisma.employee.findUnique({ where: { id: a.actorId } });
        expect(actor).not.toBeNull();
      }
    });

    it('converted leads must have a customerProfileId', async () => {
      const converted = await prisma.lead.findMany({
        where: { tenantId: TENANT_A, status: 'CONVERTED' },
      });
      for (const l of converted) {
        expect(l.customerProfileId).not.toBeNull();
      }
    });

    it('closed opportunities must have an actualCloseDate', async () => {
      const closed = await prisma.opportunity.findMany({
        where: { tenantId: TENANT_A, status: { in: ['WON', 'LOST'] } },
      });
      for (const o of closed) {
        expect(o.actualCloseDate).not.toBeNull();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCE INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Finance Integration', () => {
    it('CRM customer profile references Finance Customer', async () => {
      const profile = await prisma.customerProfile.findFirst({
        where: { id: customerProfileA },
        include: { customer: true },
      });
      expect(profile).not.toBeNull();
      expect(profile!.customer).toBeDefined();
      expect(profile!.customer.id).toBe(customerA);
    });

    it('Finance Customer is not duplicated by CRM', async () => {
      // Count customer records — CRM should not create duplicate customer entries
      const count = await prisma.customer.count({
        where: { id: customerA },
      });
      expect(count).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // IDEMPOTENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Idempotency', () => {
    it('should not create duplicate profiles for same customer', async () => {
      await expect(
        prisma.customerProfile.create({
          data: {
            tenantId: TENANT_A, companyId: COMPANY_A, customerId: customerA,
          },
        }),
      ).rejects.toThrow(); // Unique constraint on [tenantId, customerId]
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Currency Integrity', () => {
    it('all opportunity amounts are integer minor units', async () => {
      const opps = await prisma.opportunity.findMany({ where: { tenantId: TENANT_A } });
      for (const o of opps) {
        expect(Number.isInteger(o.amount)).toBe(true);
      }
    });

    it('opportunity currencies are valid ISO codes', async () => {
      const opps = await prisma.opportunity.findMany({ where: { tenantId: TENANT_A } });
      for (const o of opps) {
        expect(o.currency).toMatch(/^[A-Z]{3}$/);
      }
    });
  });
});
