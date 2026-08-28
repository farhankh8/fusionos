/**
 * FusionOS Designation Service
 *
 * Business logic for Designation CRUD operations.
 * All operations are tenant-scoped with company validation.
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
import { CreateDesignationDto, UpdateDesignationDto } from '../dto';

@Injectable()
export class DesignationService {
  private readonly logger = new Logger(DesignationService.name);

  constructor(private readonly prisma: PrismaClient) {}

  async create(ctx: TenantContext, dto: CreateDesignationDto) {
    // Validate company belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this tenant');
    }

    // Check duplicate code within company
    const existing = await this.prisma.designation.findFirst({
      where: { companyId: dto.companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Designation with code '${dto.code}' already exists in this company`);
    }

    const designation = await this.prisma.designation.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        level: dto.level,
      },
    });

    this.logger.log(`Designation created: ${designation.id} (${designation.code}) by ${ctx.userId}`);
    return designation;
  }

  async findAll(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      companyId?: string;
      isActive?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      companyId,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.DesignationWhereInput = {
      tenantId: ctx.tenantId,
      ...(companyId && { companyId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.designation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { employees: true } },
        },
      }),
      this.prisma.designation.count({ where }),
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
    const designation = await this.prisma.designation.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
      },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }
    if (designation.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: designation belongs to another tenant');
    }

    return designation;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateDesignationDto) {
    const designation = await this.prisma.designation.findUnique({ where: { id } });
    if (!designation) {
      throw new NotFoundException('Designation not found');
    }
    if (designation.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: designation belongs to another tenant');
    }

    const updated = await this.prisma.designation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.logger.log(`Designation updated: ${id} by ${ctx.userId}`);
    return updated;
  }
}
