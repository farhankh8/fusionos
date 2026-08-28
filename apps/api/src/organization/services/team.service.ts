/**
 * FusionOS Team Service
 *
 * Business logic for Team CRUD operations.
 * All operations are tenant-scoped with department validation.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { CreateTeamDto, UpdateTeamDto } from '../dto';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly prisma: PrismaClient) {}

  async create(ctx: TenantContext, dto: CreateTeamDto) {
    // Validate company belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this tenant');
    }

    // Validate department belongs to company
    const department = await this.prisma.department.findFirst({
      where: { id: dto.departmentId, companyId: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!department) {
      throw new NotFoundException('Department not found or does not belong to this company');
    }

    // Validate manager employee if provided
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: { id: dto.managerId, tenantId: ctx.tenantId, companyId: dto.companyId },
      });
      if (!manager) {
        throw new NotFoundException('Team manager employee not found in this tenant');
      }
    }

    // Check duplicate code within department
    const existing = await this.prisma.team.findFirst({
      where: { departmentId: dto.departmentId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Team with code '${dto.code}' already exists in this department`);
    }

    const team = await this.prisma.team.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        departmentId: dto.departmentId,
        name: dto.name,
        code: dto.code,
        managerId: dto.managerId,
      },
    });

    this.logger.log(`Team created: ${team.id} (${team.code}) by ${ctx.userId}`);
    return team;
  }

  async findAll(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      companyId?: string;
      departmentId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      companyId,
      departmentId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.TeamWhereInput = {
      tenantId: ctx.tenantId,
      ...(companyId && { companyId }),
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status: status as 'ACTIVE' | 'INACTIVE' }),
    };

    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.team.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(ctx: TenantContext, id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { employees: true } },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: team belongs to another tenant');
    }

    return team;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    if (team.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: team belongs to another tenant');
    }

    // Validate manager if provided
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: { id: dto.managerId, tenantId: ctx.tenantId, companyId: team.companyId },
      });
      if (!manager) {
        throw new NotFoundException('Team manager employee not found in this tenant');
      }
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId }),
      },
    });

    this.logger.log(`Team updated: ${id} by ${ctx.userId}`);
    return updated;
  }
}
