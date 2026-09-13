/**
 * FusionOS Projects Service
 * Complete project management operations — Projects, Members, Tasks, Milestones, Time, Budget, Activities.
 * Reuses existing Employee, Customer, Company entities.
 */

import {
  Injectable, BadRequestException, NotFoundException, ConflictException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { EventPublisherService } from '../../common/services/event-publisher.service';
import {
  CreateProjectDto, UpdateProjectDto, TransitionProjectDto,
  AddProjectMemberDto, UpdateProjectMemberDto,
  CreateProjectTaskDto, UpdateProjectTaskDto,
  CreateMilestoneDto, UpdateMilestoneDto,
  CreateTimeEntryDto, UpdateTimeEntryDto,
  CreateBudgetDto,
} from '../dto/projects.dto';

// ── Valid lifecycle transitions ────────────────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PLANNED', 'CANCELLED'],
  PLANNED: ['ACTIVE', 'ON_HOLD', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  COMPLETED: ['ARCHIVED'],
  CANCELLED: ['ARCHIVED'],
  ARCHIVED: [],
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly auditLog: AuditLogService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT CRUD
  // ══════════════════════════════════════════════════════════════════════════

  async createProject(ctx: TenantContext, dto: CreateProjectDto) {
    // Validate code uniqueness within tenant
    const existing = await this.prisma.project.findFirst({
      where: { tenantId: ctx.tenantId, code: dto.code },
    });
    if (existing) throw new ConflictException(`Project code "${dto.code}" already exists`);

    // Validate project manager if provided
    if (dto.projectManagerId) {
      const pm = await this.prisma.employee.findFirst({
        where: { id: dto.projectManagerId, tenantId: ctx.tenantId },
      });
      if (!pm) throw new NotFoundException('Project manager employee not found');
    }

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId: ctx.tenantId },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: dto.companyId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          projectManagerId: dto.projectManagerId,
          createdById: ctx.employeeId ?? undefined,
          customerId: dto.customerId,
          opportunityId: dto.opportunityId,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : null,
          plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null,
          currency: dto.currency || 'USD',
          budgetAmount: dto.budgetAmount || null,
          progress: dto.progress || 0,
          status: 'DRAFT',
        },
        include: {
          projectManager: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      });

      // Record activity
      await tx.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: p.id,
          employeeId: ctx.employeeId ?? undefined,
          activityType: 'PROJECT_CREATED',
          title: `Project "${p.name}" created`,
        },
      });

      return p;
    });

    // Audit
    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project.id,
      newValue: { code: project.code, name: project.name, status: project.status },
    });

    // Event
    await this.eventPublisher.publish(ctx, {
      eventType: 'project.created',
      aggregateType: 'project',
      aggregateId: project.id,
      payload: { projectId: project.id, code: project.code, name: project.name },
    });

    return project;
  }

  async listProjects(ctx: TenantContext, companyId: string, opts: {
    status?: string; search?: string; projectManagerId?: string;
    customerId?: string; page?: number; limit?: number;
  } = {}) {
    const { status, search, projectManagerId, customerId, page = 1, limit = 20 } = opts;
    const where: any = { tenantId: ctx.tenantId };
    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    if (projectManagerId) where.projectManagerId = projectManagerId;
    if (customerId) where.customerId = customerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          projectManager: { select: { id: true, firstName: true, lastName: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { members: true, tasks: true, milestones: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProject(ctx: TenantContext, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: {
        projectManager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        customer: { select: { id: true, name: true, code: true } },
        opportunity: { select: { id: true, name: true, stage: true } },
        company: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        members: {
          include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
        },
        _count: { select: { tasks: true, milestones: true, timeEntries: true } },
        budget: true,
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async updateProject(ctx: TenantContext, id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!project) throw new NotFoundException('Project not found');
    if (project.status === 'ARCHIVED') throw new BadRequestException('Cannot edit an archived project');

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.projectManagerId !== undefined && { projectManagerId: dto.projectManagerId }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.plannedStartDate !== undefined && { plannedStartDate: dto.plannedStartDate ? new Date(dto.plannedStartDate) : null }),
        ...(dto.plannedEndDate !== undefined && { plannedEndDate: dto.plannedEndDate ? new Date(dto.plannedEndDate) : null }),
        ...(dto.actualStartDate !== undefined && { actualStartDate: dto.actualStartDate ? new Date(dto.actualStartDate) : null }),
        ...(dto.actualEndDate !== undefined && { actualEndDate: dto.actualEndDate ? new Date(dto.actualEndDate) : null }),
        ...(dto.budgetAmount !== undefined && { budgetAmount: dto.budgetAmount }),
        ...(dto.progress !== undefined && { progress: dto.progress }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
      include: {
        projectManager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async transitionProject(ctx: TenantContext, id: string, dto: TransitionProjectDto) {
    const project = await this.prisma.project.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!project) throw new NotFoundException('Project not found');

    const allowed = VALID_TRANSITIONS[project.status] || [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${project.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`);
    }

    const updateData: any = { status: dto.status };
    if (dto.status === 'ACTIVE' && !project.actualStartDate) {
      updateData.actualStartDate = new Date();
    }
    if (dto.status === 'COMPLETED' || dto.status === 'CANCELLED') {
      updateData.actualEndDate = new Date();
      if (dto.status === 'COMPLETED') updateData.progress = 100;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.project.update({ where: { id }, data: updateData });

      await tx.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId: id,
          employeeId: ctx.employeeId ?? undefined,
          activityType: 'PROJECT_STATUS_CHANGED',
          title: `Status changed from ${project.status} to ${dto.status}`,
        },
      });

      return p;
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'PROJECT_STATUS_CHANGED',
      entityType: 'Project',
      entityId: id,
      previousValue: { status: project.status },
      newValue: { status: dto.status },
    });

    return updated;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT MEMBERS
  // ══════════════════════════════════════════════════════════════════════════

  async listMembers(ctx: TenantContext, projectId: string) {
    await this.ensureProjectExists(projectId, ctx.tenantId);
    return this.prisma.projectMember.findMany({
      where: { projectId, tenantId: ctx.tenantId },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(ctx: TenantContext, projectId: string, dto: AddProjectMemberDto) {
    await this.ensureProjectExists(projectId, ctx.tenantId);

    // Validate employee
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, tenantId: ctx.tenantId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Check duplicate
    const existing = await this.prisma.projectMember.findFirst({
      where: { projectId, employeeId: dto.employeeId, tenantId: ctx.tenantId },
    });
    if (existing) throw new ConflictException('Employee is already a member of this project');

    const member = await this.prisma.$transaction(async (tx) => {
      const m = await tx.projectMember.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          employeeId: dto.employeeId,
          role: (dto.role as any) || 'DEVELOPER',
          allocatedPct: dto.allocatedPct,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await tx.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          employeeId: ctx.employeeId ?? undefined,
          activityType: 'MEMBER_ADDED',
          title: `${employee.firstName} ${employee.lastName} added as ${m.role}`,
        },
      });

      return m;
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'PROJECT_MEMBER_ADDED',
      entityType: 'ProjectMember',
      entityId: member.id,
      newValue: { projectId, employeeId: dto.employeeId, role: member.role },
    });

    return member;
  }

  async updateMember(ctx: TenantContext, projectId: string, memberId: string, dto: UpdateProjectMemberDto) {
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId, tenantId: ctx.tenantId },
    });
    if (!member) throw new NotFoundException('Project member not found');

    return this.prisma.projectMember.update({
      where: { id: memberId },
      data: {
        ...(dto.role !== undefined && { role: dto.role as any }),
        ...(dto.allocatedPct !== undefined && { allocatedPct: dto.allocatedPct }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeMember(ctx: TenantContext, projectId: string, memberId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: { id: memberId, projectId, tenantId: ctx.tenantId },
    });
    if (!member) throw new NotFoundException('Project member not found');

    await this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id: member.employeeId }, select: { firstName: true, lastName: true } });

      await tx.projectMember.delete({ where: { id: memberId } });

      await tx.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          employeeId: ctx.employeeId ?? undefined,
          activityType: 'MEMBER_REMOVED',
          title: `${employee?.firstName} ${employee?.lastName} removed from project`,
        },
      });
    });

    await this.auditLog.record({
      tenantId: ctx.tenantId,
      actorId: ctx.userId,
      action: 'PROJECT_MEMBER_REMOVED',
      entityType: 'ProjectMember',
      entityId: memberId,
      previousValue: { projectId, employeeId: member.employeeId, role: member.role },
    });

    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PROJECT TASKS
  // ══════════════════════════════════════════════════════════════════════════

  async listTasks(ctx: TenantContext, projectId: string, opts: {
    status?: string; priority?: string; assigneeId?: string; page?: number; limit?: number;
  } = {}) {
    await this.ensureProjectExists(projectId, ctx.tenantId);
    const { status, priority, assigneeId, page = 1, limit = 50 } = opts;
    const where: any = { projectId, tenantId: ctx.tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;

    const [items, total] = await Promise.all([
      this.prisma.projectTask.findMany({
        where,
        include: {
          assignee: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
          reporter: { select: { id: true, firstName: true, lastName: true } },
          childTasks: { select: { id: true, title: true, status: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.projectTask.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createTask(ctx: TenantContext, projectId: string, dto: CreateProjectTaskDto) {
    await this.ensureProjectExists(projectId, ctx.tenantId);

    // Validate parent task if provided
    if (dto.parentTaskId) {
      const parent = await this.prisma.projectTask.findFirst({
        where: { id: dto.parentTaskId, projectId, tenantId: ctx.tenantId },
      });
      if (!parent) throw new NotFoundException('Parent task not found in this project');
    }

    // Validate assignee if provided (must be a project member)
    if (dto.assigneeId) {
      const member = await this.prisma.projectMember.findFirst({
        where: { id: dto.assigneeId, projectId, tenantId: ctx.tenantId },
      });
      if (!member) throw new NotFoundException('Assignee must be a project member');
    }

    const task = await this.prisma.$transaction(async (tx) => {
      const t = await tx.projectTask.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          parentTaskId: dto.parentTaskId,
          title: dto.title,
          description: dto.description,
          assigneeId: dto.assigneeId,
          reporterId: ctx.employeeId ?? undefined,
          priority: (dto.priority as any) || 'MEDIUM',
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          estimatedMinutes: dto.estimatedMinutes,
        },
        include: {
          assignee: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
          reporter: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await tx.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          taskId: t.id,
          employeeId: ctx.employeeId ?? undefined,
          activityType: 'TASK_CREATED',
          title: `Task "${t.title}" created`,
        },
      });

      return t;
    });

    return task;
  }

  async updateTask(ctx: TenantContext, projectId: string, taskId: string, dto: UpdateProjectTaskDto) {
    const task = await this.prisma.projectTask.findFirst({
      where: { id: taskId, projectId, tenantId: ctx.tenantId },
    });
    if (!task) throw new NotFoundException('Task not found');

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.progress !== undefined) updateData.progress = dto.progress;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined) updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.estimatedMinutes !== undefined) updateData.estimatedMinutes = dto.estimatedMinutes;
    if (dto.actualMinutes !== undefined) updateData.actualMinutes = dto.actualMinutes;
    if (dto.assigneeId !== undefined) updateData.assigneeId = dto.assigneeId;

    if (dto.status !== undefined) {
      const prevStatus = task.status;
      updateData.status = dto.status;
      if (dto.status === 'COMPLETED') {
        updateData.completedDate = new Date();
        updateData.progress = 100;
      }

      // Record status change activity
      await this.prisma.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          taskId,
          employeeId: ctx.employeeId ?? undefined,
          activityType: dto.status === 'COMPLETED' ? 'TASK_COMPLETED' : 'TASK_ASSIGNED',
          title: dto.status === 'COMPLETED'
            ? `Task "${task.title}" completed`
            : `Task "${task.title}" status: ${prevStatus} → ${dto.status}`,
        },
      });
    }

    return this.prisma.projectTask.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MILESTONES
  // ══════════════════════════════════════════════════════════════════════════

  async listMilestones(ctx: TenantContext, projectId: string) {
    await this.ensureProjectExists(projectId, ctx.tenantId);
    return this.prisma.projectMilestone.findMany({
      where: { projectId, tenantId: ctx.tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createMilestone(ctx: TenantContext, projectId: string, dto: CreateMilestoneDto) {
    await this.ensureProjectExists(projectId, ctx.tenantId);
    return this.prisma.projectMilestone.create({
      data: {
        tenantId: ctx.tenantId,
        projectId,
        name: dto.name,
        description: dto.description,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        progress: dto.progress || 0,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateMilestone(ctx: TenantContext, projectId: string, milestoneId: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.projectMilestone.findFirst({
      where: { id: milestoneId, projectId, tenantId: ctx.tenantId },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.targetDate !== undefined) updateData.targetDate = dto.targetDate ? new Date(dto.targetDate) : null;
    if (dto.completedDate !== undefined) updateData.completedDate = dto.completedDate ? new Date(dto.completedDate) : null;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'COMPLETED' && !dto.completedDate) {
        updateData.completedDate = new Date();
        updateData.progress = 100;
      }
    }
    if (dto.progress !== undefined) updateData.progress = dto.progress;
    if (dto.sortOrder !== undefined) updateData.sortOrder = dto.sortOrder;

    const updated = await this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    if (dto.status === 'COMPLETED') {
      await this.prisma.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          employeeId: ctx.employeeId ?? undefined,
          activityType: 'MILESTONE_COMPLETED',
          title: `Milestone "${milestone.name}" completed`,
        },
      });
    }

    return updated;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIME ENTRIES
  // ══════════════════════════════════════════════════════════════════════════

  async listTimeEntries(ctx: TenantContext, projectId: string, opts: {
    employeeId?: string; taskId?: string; page?: number; limit?: number;
  } = {}) {
    await this.ensureProjectExists(projectId, ctx.tenantId);
    const { employeeId, taskId, page = 1, limit = 50 } = opts;
    const where: any = { projectId, tenantId: ctx.tenantId };
    if (employeeId) where.employeeId = employeeId;
    if (taskId) where.taskId = taskId;

    const [items, total] = await Promise.all([
      this.prisma.projectTimeEntry.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.projectTimeEntry.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createTimeEntry(ctx: TenantContext, projectId: string, dto: CreateTimeEntryDto) {
    await this.ensureProjectExists(projectId, ctx.tenantId);

    if (dto.taskId) {
      const task = await this.prisma.projectTask.findFirst({
        where: { id: dto.taskId, projectId, tenantId: ctx.tenantId },
      });
      if (!task) throw new NotFoundException('Task not found in this project');
    }

    const entry = await this.prisma.$transaction(async (tx) => {
      const e = await tx.projectTimeEntry.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          taskId: dto.taskId,
          employeeId: dto.employeeId,
          date: new Date(dto.date),
          durationMinutes: dto.durationMinutes,
          description: dto.description,
          isBillable: dto.isBillable ?? true,
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      await tx.projectActivity.create({
        data: {
          tenantId: ctx.tenantId,
          projectId,
          taskId: dto.taskId,
          employeeId: ctx.employeeId ?? undefined,
          activityType: 'TIME_LOGGED',
          title: `${dto.durationMinutes} minutes logged`,
        },
      });

      return e;
    });

    return entry;
  }

  async updateTimeEntry(ctx: TenantContext, projectId: string, entryId: string, dto: UpdateTimeEntryDto) {
    const entry = await this.prisma.projectTimeEntry.findFirst({
      where: { id: entryId, projectId, tenantId: ctx.tenantId },
    });
    if (!entry) throw new NotFoundException('Time entry not found');

    return this.prisma.projectTimeEntry.update({
      where: { id: entryId },
      data: {
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isBillable !== undefined && { isBillable: dto.isBillable }),
        ...(dto.status !== undefined && { status: dto.status as any }),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════

  async listActivities(ctx: TenantContext, projectId: string, opts: { page?: number; limit?: number } = {}) {
    await this.ensureProjectExists(projectId, ctx.tenantId);
    const { page = 1, limit = 50 } = opts;

    const [items, total] = await Promise.all([
      this.prisma.projectActivity.findMany({
        where: { projectId, tenantId: ctx.tenantId },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          task: { select: { id: true, title: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.projectActivity.count({ where: { projectId, tenantId: ctx.tenantId } }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BUDGET
  // ══════════════════════════════════════════════════════════════════════════

  async getBudget(ctx: TenantContext, projectId: string) {
    await this.ensureProjectExists(projectId, ctx.tenantId);
    return this.prisma.projectBudget.findFirst({
      where: { projectId, tenantId: ctx.tenantId },
    });
  }

  async upsertBudget(ctx: TenantContext, projectId: string, dto: CreateBudgetDto) {
    await this.ensureProjectExists(projectId, ctx.tenantId);

    return this.prisma.projectBudget.upsert({
      where: { projectId },
      create: {
        tenantId: ctx.tenantId,
        projectId,
        budgetAmount: dto.budgetAmount,
        currency: dto.currency || 'USD',
      },
      update: {
        budgetAmount: dto.budgetAmount,
        ...(dto.currency && { currency: dto.currency }),
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  async getDashboard(ctx: TenantContext, companyId: string) {
    const where = companyId ? { tenantId: ctx.tenantId, companyId } : { tenantId: ctx.tenantId };

    const [totalProjects, activeProjects, completedProjects, onHoldProjects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.project.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.project.count({ where: { ...where, status: 'ON_HOLD' } }),
    ]);

    // Task stats
    const projectIds = (await this.prisma.project.findMany({
      where: { ...where },
      select: { id: true },
    })).map(p => p.id);

    const [totalTasks, openTasks, completedTasks, overdueTasks] = await Promise.all([
      this.prisma.projectTask.count({ where: { projectId: { in: projectIds }, tenantId: ctx.tenantId } }),
      this.prisma.projectTask.count({ where: { projectId: { in: projectIds }, tenantId: ctx.tenantId, status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'IN_REVIEW'] } } }),
      this.prisma.projectTask.count({ where: { projectId: { in: projectIds }, tenantId: ctx.tenantId, status: 'COMPLETED' } }),
      projectIds.length > 0 ? this.prisma.projectTask.count({
        where: { projectId: { in: projectIds }, tenantId: ctx.tenantId, status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] }, dueDate: { lt: new Date() } },
      }) : Promise.resolve(0),
    ]);

    // Time stats
    const timeEntries = await this.prisma.projectTimeEntry.findMany({
      where: { projectId: { in: projectIds }, tenantId: ctx.tenantId },
      select: { durationMinutes: true, isBillable: true },
    });
    const totalHours = Math.round(timeEntries.reduce((sum, e) => sum + e.durationMinutes, 0) / 60);
    const billableHours = Math.round(timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.durationMinutes, 0) / 60);

    // Recent projects
    const recentProjects = await this.prisma.project.findMany({
      where,
      include: {
        projectManager: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    return {
      kpis: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        totalTasks,
        openTasks,
        completedTasks,
        overdueTasks,
        totalHours,
        billableHours,
      },
      recentProjects,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private async ensureProjectExists(projectId: string, tenantId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
