/**
 * FusionOS Department Service
 *
 * Business logic for Department CRUD operations.
 * All operations are tenant-scoped with company validation.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(private readonly prisma: PrismaClient) {}

  async create(ctx: TenantContext, dto: CreateDepartmentDto) {
    // Validate company belongs to tenant
    const company = await this.prisma.company.findFirst({
      where: { id: dto.companyId, tenantId: ctx.tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found in this tenant');
    }

    // Validate branch if provided
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, companyId: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found or does not belong to this company');
      }
    }

    // Validate parent department if provided
    if (dto.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, companyId: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Parent department not found or does not belong to this company');
      }
    }

    // Validate head employee if provided
    if (dto.headId) {
      const head = await this.prisma.employee.findFirst({
        where: { id: dto.headId, tenantId: ctx.tenantId, companyId: dto.companyId },
      });
      if (!head) {
        throw new NotFoundException('Department head employee not found in this tenant');
      }
    }

    // Check duplicate code within company
    const existing = await this.prisma.department.findFirst({
      where: { companyId: dto.companyId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Department with code '${dto.code}' already exists in this company`);
    }

    const department = await this.prisma.department.create({
      data: {
        tenantId: ctx.tenantId,
        companyId: dto.companyId,
        branchId: dto.branchId,
        parentId: dto.parentId,
        name: dto.name,
        code: dto.code,
        headId: dto.headId,
      },
    });

    this.logger.log(`Department created: ${department.id} (${department.code}) by ${ctx.userId}`);
    return department;
  }

  async findAll(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      companyId?: string;
      branchId?: string;
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
      branchId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.DepartmentWhereInput = {
      tenantId: ctx.tenantId,
      ...(companyId && { companyId }),
      ...(branchId && { branchId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status: status as 'ACTIVE' | 'INACTIVE' }),
    };

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          _count: { select: { teams: true, employees: true, children: true } },
        },
      }),
      this.prisma.department.count({ where }),
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
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true, status: true } },
        _count: { select: { teams: true, employees: true } },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }
    if (department.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: department belongs to another tenant');
    }

    return department;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) {
      throw new NotFoundException('Department not found');
    }
    if (department.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: department belongs to another tenant');
    }

    // Prevent setting self as parent
    if (dto.parentId === id) {
      throw new BadRequestException('Department cannot be its own parent');
    }

    // Validate parent belongs to same company
    if (dto.parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: dto.parentId, companyId: department.companyId, tenantId: ctx.tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Parent department not found or does not belong to this company');
      }
    }

    // Validate branch belongs to same company
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, companyId: department.companyId, tenantId: ctx.tenantId },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found or does not belong to this company');
      }
    }

    // Validate head employee if provided
    if (dto.headId) {
      const head = await this.prisma.employee.findFirst({
        where: { id: dto.headId, tenantId: ctx.tenantId, companyId: department.companyId },
      });
      if (!head) {
        throw new NotFoundException('Department head employee not found in this tenant');
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.branchId !== undefined && { branchId: dto.branchId }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.headId !== undefined && { headId: dto.headId }),
      },
    });

    this.logger.log(`Department updated: ${id} by ${ctx.userId}`);
    return updated;
  }
}
