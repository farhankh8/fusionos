/**
 * FusionOS CRM Service
 * Complete CRM operations — Contacts, Leads, Opportunities, Activities, Tasks, Notes.
 * Reuses existing Finance Customer entity via CustomerProfile extension.
 */

import {
  Injectable, BadRequestException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import {
  CreateContactDto, UpdateContactDto,
  CreateLeadDto, UpdateLeadDto, QualifyLeadDto, ConvertLeadDto, DisqualifyLeadDto,
  CreateOpportunityDto, UpdateOpportunityDto,
  CreateActivityDto, CreateTaskDto, UpdateTaskDto,
  CreateNoteDto, UpdateNoteDto,
  CreateCustomerProfileDto, UpdateCustomerProfileDto,
} from '../dto/crm.dto';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaClient) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMER PROFILE
  // ══════════════════════════════════════════════════════════════════════════

  async createCustomerProfile(ctx: TenantContext, dto: CreateCustomerProfileDto) {
    // Verify the customer exists in Finance and belongs to this tenant
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId: ctx.tenantId },
    });
    if (!customer) throw new NotFoundException('Finance Customer not found in this tenant');

    // Check if profile already exists
    const existing = await this.prisma.customerProfile.findUnique({
      where: { tenantId_customerId: { tenantId: ctx.tenantId, customerId: dto.customerId } },
    });
    if (existing) throw new ConflictException('Customer profile already exists');

    return this.prisma.customerProfile.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        customerId: dto.customerId,
        customerType: (dto.customerType as any) || 'BUSINESS',
        customerSegment: (dto.customerSegment as any) || 'STANDARD',
        lifecycleStage: (dto.lifecycleStage as any) || 'CUSTOMER',
        industry: dto.industry,
        website: dto.website,
        description: dto.description,
        ownerId: dto.ownerId,
        annualRevenue: dto.annualRevenue,
        employeeCount: dto.employeeCount,
        rating: dto.rating,
        source: (dto.source as any),
        tags: dto.tags,
      },
      include: { customer: true, owner: true },
    });
  }

  async getCustomerProfile(ctx: TenantContext, id: string) {
    const profile = await this.prisma.customerProfile.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        customer: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        contacts: true,
        opportunities: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!profile) throw new NotFoundException('Customer profile not found');
    return profile;
  }

  async listCustomerProfiles(ctx: TenantContext, companyId: string, opts: {
    status?: string; search?: string; page?: number; limit?: number;
  } = {}) {
    const { status, search, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId };
    if (companyId) where.companyId = companyId;
    if (status) where.lifecycleStage = status;

    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { industry: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customerProfile.findMany({
        where,
        include: {
          customer: true,
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { contacts: true, opportunities: true, activities: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerProfile.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateCustomerProfile(ctx: TenantContext, id: string, dto: UpdateCustomerProfileDto) {
    const profile = await this.prisma.customerProfile.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!profile) throw new NotFoundException('Customer profile not found');

    return this.prisma.customerProfile.update({
      where: { id },
      data: {
        ...(dto.customerType && { customerType: dto.customerType as any }),
        ...(dto.customerSegment && { customerSegment: dto.customerSegment as any }),
        ...(dto.lifecycleStage && { lifecycleStage: dto.lifecycleStage as any }),
        ...(dto.industry !== undefined && { industry: dto.industry }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
        ...(dto.annualRevenue !== undefined && { annualRevenue: dto.annualRevenue }),
        ...(dto.employeeCount !== undefined && { employeeCount: dto.employeeCount }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
      include: { customer: true, owner: true },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════════════

  async createContact(ctx: TenantContext, dto: CreateContactDto) {
    const profile = await this.prisma.customerProfile.findFirst({
      where: { id: dto.customerProfileId, tenantId: ctx.tenantId },
    });
    if (!profile) throw new NotFoundException('Customer profile not found');

    return this.prisma.contact.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        customerProfileId: dto.customerProfileId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        jobTitle: dto.jobTitle,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        department: dto.department,
        isPrimary: dto.isPrimary ?? false,
        notes: dto.notes,
      },
    });
  }

  async getContact(ctx: TenantContext, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: { customerProfile: { include: { customer: true } } },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async listContacts(ctx: TenantContext, customerProfileId: string) {
    return this.prisma.contact.findMany({
      where: { customerProfileId, tenantId: ctx.tenantId },
      orderBy: [{ isPrimary: 'desc' }, { firstName: 'asc' }],
    });
  }

  async updateContact(ctx: TenantContext, id: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.mobile !== undefined && { mobile: dto.mobile }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEADS
  // ══════════════════════════════════════════════════════════════════════════

  async createLead(ctx: TenantContext, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        companyName: dto.companyName,
        source: (dto.source as any) || 'OTHER',
        ownerId: dto.ownerId,
        rating: dto.rating,
        notes: dto.notes,
        status: 'NEW',
      },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getLead(ctx: TenantContext, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        customerProfile: { include: { customer: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        crmNotes: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async listLeads(ctx: TenantContext, companyId: string, opts: {
    status?: string; source?: string; ownerId?: string;
    search?: string; page?: number; limit?: number;
  } = {}) {
    const { status, source, ownerId, search, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId };
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    if (source) where.source = source;
    if (ownerId) where.ownerId = ownerId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { activities: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateLead(ctx: TenantContext, id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === 'CONVERTED') throw new BadRequestException('Cannot edit a converted lead');

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.source && { source: dto.source as any }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId as string | undefined }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { owner: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async qualifyLead(ctx: TenantContext, id: string, _dto: QualifyLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status !== 'NEW' && lead.status !== 'CONTACTED') {
      throw new BadRequestException(`Cannot qualify a lead with status ${lead.status}`);
    }

    return this.prisma.lead.update({
      where: { id },
      data: { status: 'QUALIFIED' },
    });
  }

  async disqualifyLead(ctx: TenantContext, id: string, dto: DisqualifyLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === 'CONVERTED') {
      throw new BadRequestException('Cannot disqualify a converted lead');
    }

    return this.prisma.lead.update({
      where: { id },
      data: { status: 'UNQUALIFIED', notes: `Disqualified: ${dto.reason}` },
    });
  }

  async convertLead(ctx: TenantContext, id: string, dto: ConvertLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === 'CONVERTED') {
      throw new ConflictException('Lead is already converted');
    }
    if (lead.status !== 'QUALIFIED') {
      throw new BadRequestException('Only QUALIFIED leads can be converted');
    }

    // Convert transactionally
    return this.prisma.$transaction(async (tx) => {
      let customerId: string;
      let customerProfileId: string;

      if (dto.existingCustomerId) {
        // Reuse existing customer
        const existingCustomer = await tx.customer.findFirst({
          where: { id: dto.existingCustomerId, tenantId: ctx.tenantId },
        });
        if (!existingCustomer) throw new NotFoundException('Existing customer not found');

        customerId = existingCustomer.id;

        // Check if profile already exists
        const existingProfile = await tx.customerProfile.findUnique({
          where: { tenantId_customerId: { tenantId: ctx.tenantId, customerId } },
        });
        if (existingProfile) {
          customerProfileId = existingProfile.id;
        } else {
          const profile = await tx.customerProfile.create({
            data: {
              tenantId: ctx.tenantId,
              companyId: lead.companyId,
              customerId,
              lifecycleStage: 'CUSTOMER',
              source: lead.source as any,
              ownerId: lead.ownerId,
            },
          });
          customerProfileId = profile.id;
        }
      } else {
        // Create new Finance Customer
        const code = dto.customerCode || `CUST-${Date.now().toString(36).toUpperCase()}`;
        const newCustomer = await tx.customer.create({
          data: {
            tenantId: ctx.tenantId,
            companyId: lead.companyId,
            name: `${lead.firstName} ${lead.lastName || ''}`.trim(),
            code,
            email: dto.customerEmail || lead.email,
            phone: dto.customerPhone || lead.phone,
            currency: 'USD',
          },
        });
        customerId = newCustomer.id;

        const profile = await tx.customerProfile.create({
          data: {
            tenantId: ctx.tenantId,
            companyId: lead.companyId,
            customerId,
            lifecycleStage: 'CUSTOMER',
            source: lead.source as any,
            ownerId: lead.ownerId,
          },
        });
        customerProfileId = profile.id;
      }

      // Update lead
      await tx.lead.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          customerProfileId,
          convertedAt: new Date(),
          convertedById: lead.ownerId,
        },
      });

      // Create initial opportunity
      const opportunity = await tx.opportunity.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: lead.companyId,
          customerProfileId,
          name: `Opportunity from ${lead.firstName} ${lead.lastName || ''}`.trim(),
          stage: 'PROSPECTING',
          status: 'OPEN',
          amount: 0,
          currency: 'USD',
          probability: 10,
          source: lead.source as any,
          ownerId: lead.ownerId,
        },
      });

      return { customerId, customerProfileId, opportunityId: opportunity.id, leadId: id };
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OPPORTUNITIES
  // ══════════════════════════════════════════════════════════════════════════

  async createOpportunity(ctx: TenantContext, dto: CreateOpportunityDto) {
    const profile = await this.prisma.customerProfile.findFirst({
      where: { id: dto.customerProfileId, tenantId: ctx.tenantId },
    });
    if (!profile) throw new NotFoundException('Customer profile not found');

    return this.prisma.opportunity.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        customerProfileId: dto.customerProfileId,
        contactId: dto.contactId,
        ownerId: dto.ownerId,
        name: dto.name,
        stage: (dto.stage as any) || 'PROSPECTING',
        status: 'OPEN',
        amount: dto.amount || 0,
        currency: dto.currency || 'USD',
        probability: dto.probability || 10,
        expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
        description: dto.description,
        source: (dto.source as any),
      },
      include: {
        customerProfile: { include: { customer: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getOpportunity(ctx: TenantContext, id: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        customerProfile: { include: { customer: true } },
        contact: true,
        owner: { select: { id: true, firstName: true, lastName: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async listOpportunities(ctx: TenantContext, companyId: string, opts: {
    stage?: string; status?: string; ownerId?: string;
    page?: number; limit?: number;
  } = {}) {
    const { stage, status, ownerId, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId };
    if (companyId) where.companyId = companyId;
    if (stage) where.stage = stage;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    const [items, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        include: {
          customerProfile: { include: { customer: { select: { id: true, name: true } } } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateOpportunity(ctx: TenantContext, id: string, dto: UpdateOpportunityDto) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    if (opp.status !== 'OPEN') throw new BadRequestException('Can only edit OPEN opportunities');

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.stage && { stage: dto.stage as any }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.probability !== undefined && { probability: dto.probability }),
        ...(dto.expectedCloseDate !== undefined && {
          expectedCloseDate: dto.expectedCloseDate ? new Date(dto.expectedCloseDate) : null,
        }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.contactId !== undefined && { contactId: dto.contactId }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
      },
      include: {
        customerProfile: { include: { customer: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async changeOpportunityStage(ctx: TenantContext, id: string, stage: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const validStages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
    if (!validStages.includes(stage)) throw new BadRequestException('Invalid stage');

    const isClosing = stage === 'CLOSED_WON' || stage === 'CLOSED_LOST';

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        stage: stage as any,
        ...(isClosing && {
          status: stage === 'CLOSED_WON' ? 'WON' : 'LOST',
          actualCloseDate: new Date(),
          probability: stage === 'CLOSED_WON' ? 100 : 0,
        }),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PIPELINE (Aggregated view)
  // ══════════════════════════════════════════════════════════════════════════

  async getPipeline(ctx: TenantContext, companyId: string) {
    const stages = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
    const pipeline: Record<string, { count: number; totalValue: number; weightedValue: number }> = {};

    for (const stage of stages) {
      const where: any = {
        tenantId: ctx.tenantId,
        stage,
        status: stage.startsWith('CLOSED_') ? (stage === 'CLOSED_WON' ? 'WON' : 'LOST') : 'OPEN',
      };
      if (companyId) where.companyId = companyId;

      const opps = await this.prisma.opportunity.findMany({ where, select: { amount: true, probability: true } });
      pipeline[stage] = {
        count: opps.length,
        totalValue: opps.reduce((sum, o) => sum + o.amount, 0),
        weightedValue: opps.reduce((sum, o) => sum + Math.round(o.amount * o.probability / 100), 0),
      };
    }

    return pipeline;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════

  async createActivity(ctx: TenantContext, dto: CreateActivityDto, actorId: string) {
    return this.prisma.activity.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        customerProfileId: dto.customerProfileId,
        contactId: dto.contactId,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        activityType: dto.activityType as any,
        subject: dto.subject,
        description: dto.description,
        actorId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
      },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listActivities(ctx: TenantContext, companyId: string, opts: {
    customerProfileId?: string; leadId?: string; opportunityId?: string;
    activityType?: string; page?: number; limit?: number;
  } = {}) {
    const { customerProfileId, leadId, opportunityId, activityType, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId };
    if (companyId) where.companyId = companyId;
    if (customerProfileId) where.customerProfileId = customerProfileId;
    if (leadId) where.leadId = leadId;
    if (opportunityId) where.opportunityId = opportunityId;
    if (activityType) where.activityType = activityType;

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true } },
          customerProfile: { include: { customer: { select: { id: true, name: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════════════════════════════════════════

  async createTask(ctx: TenantContext, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        customerProfileId: dto.customerProfileId,
        contactId: dto.contactId,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        priority: (dto.priority as any) || 'MEDIUM',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listTasks(ctx: TenantContext, companyId: string, opts: {
    status?: string; assigneeId?: string; customerProfileId?: string;
    page?: number; limit?: number;
  } = {}) {
    const { status, assigneeId, customerProfileId, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId };
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (customerProfileId) where.customerProfileId = customerProfileId;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          customerProfile: { include: { customer: { select: { id: true, name: true } } } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { priority: 'asc' },
          { dueDate: 'asc' },
        ],
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateTask(ctx: TenantContext, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.assigneeId !== undefined) updateData.assigneeId = dto.assigneeId;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'COMPLETED') updateData.completedAt = new Date();
    }
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    return this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NOTES
  // ══════════════════════════════════════════════════════════════════════════

  async createNote(ctx: TenantContext, dto: CreateNoteDto, authorId: string) {
    return this.prisma.crmNote.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        customerProfileId: dto.customerProfileId,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        authorId,
        content: dto.content,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listNotes(ctx: TenantContext, opts: {
    customerProfileId?: string; leadId?: string; opportunityId?: string;
    page?: number; limit?: number;
  } = {}) {
    const { customerProfileId, leadId, opportunityId, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId };
    if (customerProfileId) where.customerProfileId = customerProfileId;
    if (leadId) where.leadId = leadId;
    if (opportunityId) where.opportunityId = opportunityId;

    const [items, total] = await Promise.all([
      this.prisma.crmNote.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.crmNote.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateNote(ctx: TenantContext, id: string, dto: UpdateNoteDto, _authorId: string) {
    const note = await this.prisma.crmNote.findFirst({
      where: { id, tenantId: ctx.tenantId },
    });
    if (!note) throw new NotFoundException('Note not found');

    return this.prisma.crmNote.update({
      where: { id },
      data: { content: dto.content },
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext, companyId: string) {
    const where = companyId ? { tenantId: ctx.tenantId, companyId } : { tenantId: ctx.tenantId };

    const [
      totalCustomers,
      totalLeads,
      openLeads,
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      totalContacts,
      pendingTasks,
      overdueTasks,
    ] = await Promise.all([
      this.prisma.customerProfile.count({ where }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] } } }),
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.opportunity.count({ where: { ...where, status: 'WON' } }),
      this.prisma.opportunity.count({ where: { ...where, status: 'LOST' } }),
      this.prisma.contact.count({ where }),
      this.prisma.task.count({ where: { ...where, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
      this.prisma.task.count({
        where: {
          ...where,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    // Pipeline value
    const pipelineOpps = await this.prisma.opportunity.findMany({
      where: { ...where, status: 'OPEN' },
      select: { amount: true, probability: true, stage: true },
    });

    const totalPipelineValue = pipelineOpps.reduce((sum, o) => sum + o.amount, 0);
    const weightedPipelineValue = pipelineOpps.reduce(
      (sum, o) => sum + Math.round(o.amount * o.probability / 100), 0,
    );

    // Recent activities
    const recentActivities = await this.prisma.activity.findMany({
      where,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true } },
        customerProfile: { include: { customer: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      kpis: {
        totalCustomers,
        totalLeads,
        openLeads,
        totalOpportunities,
        openOpportunities,
        wonOpportunities,
        lostOpportunities,
        totalContacts,
        pendingTasks,
        overdueTasks,
        totalPipelineValue,
        weightedPipelineValue,
      },
      recentActivities,
    };
  }
}
