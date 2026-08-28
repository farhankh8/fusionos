/**
 * FusionOS Company Service
 *
 * Business logic for Company CRUD operations.
 * All operations are tenant-scoped.
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
import { CreateCompanyDto, UpdateCompanyDto } from '../dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new company within the tenant.
   */
  async create(ctx: TenantContext, dto: CreateCompanyDto) {
    // Check for duplicate code within tenant
    const existing = await this.prisma.company.findFirst({
      where: { tenantId: ctx.tenantId, code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Company with code '${dto.code}' already exists in this tenant`,
      );
    }

    const company = await this.prisma.company.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        legalName: dto.legalName,
        code: dto.code,
        registrationNumber: dto.registrationNumber,
        taxId: dto.taxId,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        logo: dto.logo,
        address: (dto.address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        timezone: dto.timezone,
        currency: dto.currency,
      },
    });

    this.logger.log(`Company created: ${company.id} (${company.code}) by ${ctx.userId}`);
    return company;
  }

  /**
   * List all companies in the tenant with pagination.
   */
  async findAll(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.CompanyWhereInput = {
      tenantId: ctx.tenantId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { legalName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }),
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { branches: true, departments: true, employees: true },
          },
        },
      }),
      this.prisma.company.count({ where }),
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

  /**
   * Get a single company by ID (with tenant validation).
   */
  async findOne(ctx: TenantContext, id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        branches: { select: { id: true, name: true, code: true, status: true } },
        departments: { select: { id: true, name: true, code: true, status: true } },
        _count: { select: { employees: true, teams: true } },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Tenant isolation check
    if (company.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: company belongs to another tenant');
    }

    return company;
  }

  /**
   * Update a company.
   */
  async update(ctx: TenantContext, id: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: company belongs to another tenant');
    }



    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.registrationNumber !== undefined && {
          registrationNumber: dto.registrationNumber,
        }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.logo !== undefined && { logo: dto.logo }),
        ...(dto.address !== undefined && {
          address: (dto.address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
      },
    });

    this.logger.log(`Company updated: ${id} by ${ctx.userId}`);
    return updated;
  }
}
