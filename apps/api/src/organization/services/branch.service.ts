/**
 * FusionOS Branch Service
 *
 * Business logic for Branch CRUD operations.
 * All operations are tenant-scoped and company-scoped.
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
import { CreateBranchDto, UpdateBranchDto } from '../dto';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(private readonly prisma: PrismaClient) {}

  async create(ctx: TenantContext, dto: CreateBranchDto) {
    // Validate company belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this tenant');
    }

    // Check duplicate code within company
    const existing = await this.prisma.branch.findFirst({
      where: { companyId: dto.companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Branch with code '${dto.code}' already exists in this company`);
    }

    const branch = await this.prisma.branch.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        name: dto.name,
        code: dto.code,
        address: (dto.address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone,
      },
    });

    this.logger.log(`Branch created: ${branch.id} (${branch.code}) by ${ctx.userId}`);
    return branch;
  }

  async findAll(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      companyId?: string;
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.BranchWhereInput = {
      tenantId: ctx.tenantId,
      ...(companyId && { companyId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status: status as 'ACTIVE' | 'INACTIVE' }),
    };

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: { select: { id: true, name: true, code: true } },
          _count: { select: { departments: true, employees: true } },
        },
      }),
      this.prisma.branch.count({ where }),
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
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        departments: { select: { id: true, name: true, code: true, status: true } },
        _count: { select: { employees: true } },
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    if (branch.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: branch belongs to another tenant');
    }

    return branch;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    if (branch.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: branch belongs to another tenant');
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.address !== undefined && { address: (dto.address as unknown as Prisma.InputJsonValue) ?? Prisma.JsonNull }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });

    this.logger.log(`Branch updated: ${id} by ${ctx.userId}`);
    return updated;
  }
}
