/**
 * FusionOS Employee Service
 *
 * The canonical Employee management service.
 * Every module in FusionOS references this entity — it is never duplicated.
 *
 * Features:
 * - Full CRUD with tenant isolation
 * - Employee lifecycle management (status transitions)
 * - Automatic employee history tracking
 * - Manager relationship validation (same tenant, no self-management)
 * - Employee code uniqueness within tenant
 * - User ↔ Employee relationship management
 * - Search by name, email, employee code, phone
 * - Filtering by department, branch, team, designation, status
 * - Pagination and sorting
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, Prisma, EmploymentStatus } from '@prisma/client';
import type { TenantContext } from '../../auth/services/tenant-context.service';
import { CreateEmployeeDto, UpdateEmployeeDto, UpdateEmployeeStatusDto } from '../dto/employee.dto';

/** Valid status transitions — enforces lifecycle rules */
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ACTIVE', 'INACTIVE'],
  ACTIVE: ['PROBATION', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'RETIRED', 'INACTIVE'],
  PROBATION: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'INACTIVE'],
  ON_LEAVE: ['ACTIVE', 'PROBATION', 'SUSPENDED', 'TERMINATED', 'RESIGNED', 'INACTIVE'],
  SUSPENDED: ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'TERMINATED', 'RESIGNED', 'INACTIVE'],
  TERMINATED: ['ACTIVE'], // Rehire only via ACTIVE
  RESIGNED: ['ACTIVE'],   // Rehire only via ACTIVE
  RETIRED: ['ACTIVE'],    // Rehire only via ACTIVE
  INACTIVE: ['ACTIVE', 'DRAFT'], // Reactivation
};

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(private readonly prisma: PrismaClient) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(ctx: TenantContext, dto: CreateEmployeeDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validate company belongs to tenant
      const company = await tx.company.findFirst({
        where: { id: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!company) {
        throw new NotFoundException('Company not found in this tenant');
      }

      // 2. Check unique employee code within tenant
      const existingCode = await tx.employee.findFirst({
        where: { tenantId: ctx.tenantId, employeeCode: dto.employeeCode },
      });
      if (existingCode) {
        throw new ConflictException(`Employee code '${dto.employeeCode}' already exists`);
      }

      // 3. Check unique email within tenant
      const existingEmail = await tx.employee.findFirst({
        where: { tenantId: ctx.tenantId, email: dto.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new ConflictException(`Employee with email '${dto.email}' already exists`);
      }

      // 4. Validate relationships belong to same tenant/company
      await this.validateRelationships(tx, ctx, dto);

      // 5. Validate manager: same tenant, valid employee, no self-management
      if (dto.managerId) {
        await this.validateManager(tx, ctx, dto.managerId, undefined);
      }

      // 6. Validate user linkage: if userId provided, ensure it's valid
      if (dto.userId) {
        const user = await tx.user.findUnique({ where: { id: dto.userId } });
        if (!user) {
          throw new NotFoundException('User not found');
        }
        // Ensure no other employee is already linked to this user in this tenant
        const existingLink = await tx.employee.findFirst({
          where: { userId: dto.userId, tenantId: ctx.tenantId },
        });
        if (existingLink) {
          throw new ConflictException('This user is already linked to another employee');
        }
      }

      // 7. Create employee
      const employee = await tx.employee.create({
        data: {
          tenantId: ctx.tenantId,
          companyId: dto.companyId,
          employeeCode: dto.employeeCode,
          firstName: dto.firstName,
          middleName: dto.middleName,
          lastName: dto.lastName,
          preferredName: dto.preferredName,
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          maritalStatus: dto.maritalStatus,
          nationality: dto.nationality,
          address: (dto.address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          teamId: dto.teamId,
          designationId: dto.designationId,
          managerId: dto.managerId,
          employmentStatus: 'ACTIVE',
          employmentType: dto.employmentType ?? 'FULL_TIME',
          workLocation: dto.workLocation,
          joiningDate: new Date(dto.joiningDate),
          probationEndDate: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined,
          confirmationDate: dto.confirmationDate ? new Date(dto.confirmationDate) : undefined,
          currency: dto.currency,
          basicSalary: dto.basicSalary,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          emergencyContactRelation: dto.emergencyContactRelation,
          timezone: dto.timezone,
          notes: dto.notes,
          userId: dto.userId,
        },
      });

      // 8. Record employee creation in history
      await tx.employeeHistory.create({
        data: {
          tenantId: ctx.tenantId,
          employeeId: employee.id,
          action: 'hired',
          effectiveDate: new Date(dto.joiningDate),
          companyId: dto.companyId,
          branchId: dto.branchId,
          departmentId: dto.departmentId,
          teamId: dto.teamId,
          designationId: dto.designationId,
          managerId: dto.managerId,
          employmentStatus: 'ACTIVE',
          newValue: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            employeeCode: dto.employeeCode,
          } as unknown as Prisma.InputJsonValue,
          actorId: ctx.userId,
          reason: 'New employee hired',
        },
      });

      this.logger.log(`Employee created: ${employee.id} (${employee.employeeCode}) by ${ctx.userId}`);
      return employee;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST (with search, filter, pagination, sort)
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      departmentId?: string;
      branchId?: string;
      teamId?: string;
      designationId?: string;
      companyId?: string;
      managerId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      departmentId,
      branchId,
      teamId,
      designationId,
      companyId,
      managerId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.EmployeeWhereInput = {
      tenantId: ctx.tenantId,
      deletedAt: null, // Exclude soft-deleted
      ...(search && {
        OR: [
          { employeeCode: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { middleName: { contains: search, mode: 'insensitive' } },
          { preferredName: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { employmentStatus: status as EmploymentStatus }),
      ...(departmentId && { departmentId }),
      ...(branchId && { branchId }),
      ...(teamId && { teamId }),
      ...(designationId && { designationId }),
      ...(companyId && { companyId }),
      ...(managerId && { managerId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          middleName: true,
          lastName: true,
          preferredName: true,
          email: true,
          phone: true,
          gender: true,
          employmentStatus: true,
          employmentType: true,
          joiningDate: true,
          branch: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          designation: { select: { id: true, name: true } },
          manager: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.employee.count({ where }),
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

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ONE (with full profile data)
  // ═══════════════════════════════════════════════════════════════════════════

  async findOne(ctx: TenantContext, id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, code: true } },
        branch: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true, code: true } },
        team: { select: { id: true, name: true, code: true } },
        designation: { select: { id: true, name: true, code: true, level: true } },
        manager: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, status: true },
        },
        directReports: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: { select: { name: true } },
          },
        },
        employmentHistory: {
          orderBy: { effectiveDate: 'desc' },
          take: 50,
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (employee.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: employee belongs to another tenant');
    }

    return employee;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  async update(ctx: TenantContext, id: string, dto: UpdateEmployeeDto) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id } });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
      if (employee.tenantId !== ctx.tenantId) {
        throw new ForbiddenException('Access denied: employee belongs to another tenant');
      }

      // Validate relationships
      const updateData: Prisma.EmployeeUpdateInput = {};
      const historyChanges: { department?: { old: string | null; new: string | null }; branch?: { old: string | null; new: string | null }; team?: { old: string | null; new: string | null }; designation?: { old: string | null; new: string | null }; manager?: { old: string | null; new: string | null }; employmentType?: { old: string | null; new: string | null } } = {};

      // Track relationship changes for history
      if (dto.departmentId !== undefined && dto.departmentId !== employee.departmentId) {
        historyChanges.department = { old: employee.departmentId, new: dto.departmentId };
        updateData.department = dto.departmentId
          ? { connect: { id: dto.departmentId } }
          : { disconnect: true };
      }
      if (dto.branchId !== undefined && dto.branchId !== employee.branchId) {
        historyChanges.branch = { old: employee.branchId, new: dto.branchId };
        updateData.branch = dto.branchId
          ? { connect: { id: dto.branchId } }
          : { disconnect: true };
      }
      if (dto.teamId !== undefined && dto.teamId !== employee.teamId) {
        historyChanges.team = { old: employee.teamId, new: dto.teamId };
        updateData.team = dto.teamId
          ? { connect: { id: dto.teamId } }
          : { disconnect: true };
      }
      if (dto.designationId !== undefined && dto.designationId !== employee.designationId) {
        historyChanges.designation = { old: employee.designationId, new: dto.designationId };
        updateData.designation = dto.designationId
          ? { connect: { id: dto.designationId } }
          : { disconnect: true };
      }
      if (dto.managerId !== undefined && dto.managerId !== employee.managerId) {
        if (dto.managerId) {
          await this.validateManager(tx, ctx, dto.managerId, id);
        }
        historyChanges.manager = { old: employee.managerId, new: dto.managerId };
        updateData.manager = dto.managerId
          ? { connect: { id: dto.managerId } }
          : { disconnect: true };
      }
      if (dto.employmentType !== undefined && dto.employmentType !== employee.employmentType) {
        historyChanges['employmentType'] = { old: employee.employmentType, new: dto.employmentType };
        updateData['employmentType'] = dto.employmentType;
      }

      // Simple field updates
      if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
      if (dto.middleName !== undefined) updateData.middleName = dto.middleName;
      if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
      if (dto.preferredName !== undefined) updateData.preferredName = dto.preferredName;
      if (dto.phone !== undefined) updateData.phone = dto.phone;
      if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
      if (dto.gender !== undefined) updateData.gender = dto.gender;
      if (dto.maritalStatus !== undefined) updateData.maritalStatus = dto.maritalStatus;
      if (dto.nationality !== undefined) updateData.nationality = dto.nationality;
      if (dto.address !== undefined) updateData.address = (dto.address as Prisma.InputJsonValue) ?? Prisma.JsonNull;
      if (dto.workLocation !== undefined) updateData.workLocation = dto.workLocation;
      if (dto.probationEndDate !== undefined) updateData.probationEndDate = dto.probationEndDate ? new Date(dto.probationEndDate) : null;
      if (dto.confirmationDate !== undefined) updateData.confirmationDate = dto.confirmationDate ? new Date(dto.confirmationDate) : null;
      if (dto.currency !== undefined) updateData.currency = dto.currency;
      if (dto.basicSalary !== undefined) updateData.basicSalary = dto.basicSalary;
      if (dto.emergencyContactName !== undefined) updateData.emergencyContactName = dto.emergencyContactName;
      if (dto.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = dto.emergencyContactPhone;
      if (dto.emergencyContactRelation !== undefined) updateData.emergencyContactRelation = dto.emergencyContactRelation;
      if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.userId !== undefined) {
        if (dto.userId) {
          updateData.user = { connect: { id: dto.userId } };
        } else {
          updateData.user = { disconnect: true };
        }
      }

      const updated = await tx.employee.update({ where: { id }, data: updateData });

      // Record history for relationship changes
      if (Object.keys(historyChanges).length > 0) {
        const changeTypes = Object.keys(historyChanges);
        await tx.employeeHistory.create({
          data: {
            tenantId: ctx.tenantId,
            employeeId: id,
            action: `updated_${changeTypes.join('_and_')}`,
            effectiveDate: new Date(),
            companyId: updated.companyId,
            branchId: updated.branchId,
            departmentId: updated.departmentId,
            teamId: updated.teamId,
            designationId: updated.designationId,
            managerId: updated.managerId,
            employmentStatus: updated.employmentStatus,
            previousValue: historyChanges as unknown as Prisma.InputJsonValue,
            actorId: ctx.userId,
            notes: `Updated: ${changeTypes.join(', ')}`,
          },
        });
      }

      this.logger.log(`Employee updated: ${id} by ${ctx.userId}`);
      return updated;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS CHANGE (with lifecycle validation)
  // ═══════════════════════════════════════════════════════════════════════════

  async updateStatus(ctx: TenantContext, id: string, dto: UpdateEmployeeStatusDto) {
    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({ where: { id } });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }
      if (employee.tenantId !== ctx.tenantId) {
        throw new ForbiddenException('Access denied: employee belongs to another tenant');
      }

      // Validate status transition
      const validTransitions = VALID_STATUS_TRANSITIONS[employee.employmentStatus];
      if (!validTransitions || !validTransitions.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from '${employee.employmentStatus}' to '${dto.status}'`,
        );
      }

      const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();

      // Build update data
      const updateData: Prisma.EmployeeUpdateInput = {
        employmentStatus: dto.status,
      };

      // Auto-set termination date if terminating
      if (dto.status === 'TERMINATED' || dto.status === 'RESIGNED') {
        updateData.terminationDate = effectiveDate;
      }

      const updated = await tx.employee.update({ where: { id }, data: updateData });

      // Record status change in history
      await tx.employeeHistory.create({
        data: {
          tenantId: ctx.tenantId,
          employeeId: id,
          action: dto.status.toLowerCase(),
          effectiveDate,
          companyId: updated.companyId,
          branchId: updated.branchId,
          departmentId: updated.departmentId,
          teamId: updated.teamId,
          designationId: updated.designationId,
          managerId: updated.managerId,
          employmentStatus: dto.status as EmploymentStatus,
          previousValue: { employmentStatus: employee.employmentStatus } as unknown as Prisma.InputJsonValue,
          newValue: { employmentStatus: dto.status } as unknown as Prisma.InputJsonValue,
          actorId: ctx.userId,
          reason: dto.reason,
          notes: dto.notes,
        },
      });

      this.logger.log(
        `Employee status changed: ${id} from ${employee.employmentStatus} to ${dto.status} by ${ctx.userId}`,
      );
      return updated;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  async getHistory(ctx: TenantContext, employeeId: string) {
    // Validate employee belongs to tenant
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { tenantId: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: employee belongs to another tenant');
    }

    return this.prisma.employeeHistory.findMany({
      where: { employeeId, tenantId: ctx.tenantId },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  async softDelete(ctx: TenantContext, id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Access denied: employee belongs to another tenant');
    }

    if (employee.deletedAt) {
      throw new BadRequestException('Employee is already deactivated');
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), employmentStatus: 'INACTIVE' },
    });

    this.logger.log(`Employee soft-deleted: ${id} by ${ctx.userId}`);
    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async validateRelationships(
    tx: Prisma.TransactionClient,
    ctx: TenantContext,
    dto: CreateEmployeeDto,
  ) {
    if (dto.branchId) {
      const branch = await tx.branch.findFirst({
        where: { id: dto.branchId, companyId: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!branch) throw new NotFoundException('Branch not found or does not belong to this company');
    }

    if (dto.departmentId) {
      const dept = await tx.department.findFirst({
        where: { id: dto.departmentId, companyId: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!dept) throw new NotFoundException('Department not found or does not belong to this company');
    }

    if (dto.teamId) {
      const team = await tx.team.findFirst({
        where: { id: dto.teamId, companyId: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!team) throw new NotFoundException('Team not found or does not belong to this company');
    }

    if (dto.designationId) {
      const desig = await tx.designation.findFirst({
        where: { id: dto.designationId, companyId: dto.companyId, tenantId: ctx.tenantId },
      });
      if (!desig) throw new NotFoundException('Designation not found or does not belong to this company');
    }
  }

  private async validateManager(
    tx: Prisma.TransactionClient,
    ctx: TenantContext,
    managerId: string,
    employeeId: string | undefined,
  ) {
    // Cannot self-manage
    if (employeeId && managerId === employeeId) {
      throw new BadRequestException('Employee cannot manage themselves');
    }

    // Manager must be a valid employee in the same tenant
    const manager = await tx.employee.findFirst({
      where: { id: managerId, tenantId: ctx.tenantId, deletedAt: null },
    });
    if (!manager) {
      throw new NotFoundException('Manager employee not found in this tenant');
    }
  }
}
