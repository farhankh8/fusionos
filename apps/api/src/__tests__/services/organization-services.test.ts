/**
 * Organization Services Unit Tests — Phase 25 Coverage Engineering
 *
 * Covers CompanyService, BranchService, DepartmentService, TeamService, DesignationService
 * Exercises: CRUD, validation, conflict detection, tenant scoping, error paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { TenantContext } from '../../auth/services/tenant-context.service';

// ── Test helpers ──────────────────────────────────────────────────────────

const CTX: TenantContext = {
  userId: 'u1', employeeId: 'emp1', sessionId: null, email: 'a@b.com',
  tenantId: 't1', tenantName: 'T', tenantSlug: 't', roleId: 'r1',
  roleName: 'admin', roleIsSystem: false, userRoleId: 'ur1', scope: null,
  permissions: ['*'],
};

function mockPrisma(overrides: Record<string, any> = {}) {
  const company = {
    findFirst: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1', name: 'Co' }),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1', name: 'Co' }),
    create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-id', ...data })),
    update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
    count: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue({}),
    ...(overrides['company'] ?? {}),
  };
  const branch = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'br-new', ...data })),
    update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
    count: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue({}),
    ...(overrides['branch'] ?? {}),
  };
  const department = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'dep-new', ...data })),
    update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
    count: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue({}),
    ...(overrides['department'] ?? {}),
  };
  const team = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'team-new', ...data })),
    update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
    count: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue({}),
    ...(overrides['team'] ?? {}),
  };
  const designation = {
    findFirst: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'des-new', ...data })),
    update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve(data)),
    count: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue({}),
    ...(overrides['designation'] ?? {}),
  };
  const employee = {
    count: vi.fn().mockResolvedValue(0),
    findFirst: vi.fn().mockResolvedValue({ id: 'emp1' }),
    ...(overrides['employee'] ?? {}),
  };
  return { company, branch, department, team, designation, employee } as any;
}

// ── CompanyService ────────────────────────────────────────────────────────

describe('CompanyService', () => {
  let CompanyService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../organization/services/company.service');
    CompanyService = mod.CompanyService;
  });

  it('creates a company successfully', async () => {
    const prisma = mockPrisma({
      company: {
        findFirst: vi.fn().mockResolvedValue(null), // no duplicate
        create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-id', ...data })),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new CompanyService(prisma);
    const result = await svc.create(CTX, {
      name: 'Acme', legalName: 'Acme Inc', code: 'ACM', email: 'a@b.com',
    } as any);
    expect(result).toBeDefined();
    expect(prisma.company.create).toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate company code', async () => {
    const prisma = mockPrisma({
      company: {
        findFirst: vi.fn().mockResolvedValue({ id: 'existing' }),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new CompanyService(prisma);
    await expect(
      svc.create(CTX, { name: 'X', legalName: 'X', code: 'DUP' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('returns paginated companies list', async () => {
    const prisma = mockPrisma({
      company: {
        findFirst: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' }),
        findMany: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Co1', _count: { branches: 0, departments: 0, employees: 0 } }]),
        count: vi.fn().mockResolvedValue(1),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new CompanyService(prisma);
    const result = await svc.findAll(CTX, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('finds a company by id', async () => {
    const prisma = mockPrisma({
      company: {
        findFirst: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1', name: 'Acme', branches: [], departments: [], _count: { employees: 0, teams: 0 } }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new CompanyService(prisma);
    const result = await svc.findOne(CTX, 'c1');
    expect(result.id).toBe('c1');
  });

  it('throws NotFoundException when company not found', async () => {
    const prisma = mockPrisma({
      company: {
        findFirst: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' }),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new CompanyService(prisma);
    await expect(svc.findOne(CTX, 'missing')).rejects.toThrow(NotFoundException);
  });

  it('updates a company', async () => {
    const prisma = mockPrisma({
      company: {
        findFirst: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'c1', tenantId: 't1', name: 'Old' }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data })),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new CompanyService(prisma);
    const result = await svc.update(CTX, 'c1', { name: 'Updated' } as any);
    expect(result.name).toBe('Updated');
  });
});

// ── BranchService ─────────────────────────────────────────────────────────

describe('BranchService', () => {
  let BranchService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../organization/services/branch.service');
    BranchService = mod.BranchService;
  });

  it('creates a branch successfully', async () => {
    const prisma = mockPrisma();
    const svc = new BranchService(prisma);
    const result = await svc.create(CTX, { name: 'HQ', code: 'HQ', companyId: 'c1' } as any);
    expect(result).toBeDefined();
    expect(prisma.branch.create).toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate branch code within company', async () => {
    const prisma = mockPrisma({
      branch: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
    });
    const svc = new BranchService(prisma);
    await expect(
      svc.create(CTX, { name: 'X', code: 'DUP', companyId: 'c1' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('lists branches for a company', async () => {
    const prisma = mockPrisma({
      branch: {
        findMany: vi.fn().mockResolvedValue([{ id: 'b1', name: 'HQ', _count: { employees: 0 } }]),
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new BranchService(prisma);
    const result = await svc.findAll(CTX, 'c1', { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
  });
});

// ── DepartmentService ─────────────────────────────────────────────────────

describe('DepartmentService', () => {
  let DepartmentService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../organization/services/department.service');
    DepartmentService = mod.DepartmentService;
  });

  it('creates a department successfully', async () => {
    const prisma = mockPrisma();
    const svc = new DepartmentService(prisma);
    const result = await svc.create(CTX, { name: 'Engineering', code: 'ENG', companyId: 'c1' } as any);
    expect(result).toBeDefined();
    expect(prisma.department.create).toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate department code', async () => {
    const prisma = mockPrisma({
      department: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
    });
    const svc = new DepartmentService(prisma);
    await expect(
      svc.create(CTX, { name: 'X', code: 'DUP', companyId: 'c1' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('lists departments', async () => {
    const prisma = mockPrisma({
      department: {
        findMany: vi.fn().mockResolvedValue([{ id: 'd1', name: 'Eng', _count: { employees: 0, teams: 0 } }]),
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new DepartmentService(prisma);
    const result = await svc.findAll(CTX, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
  });
});

// ── DesignationService ────────────────────────────────────────────────────

describe('DesignationService', () => {
  let DesignationService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../organization/services/designation.service');
    DesignationService = mod.DesignationService;
  });

  it('creates a designation', async () => {
    const prisma = mockPrisma();
    const svc = new DesignationService(prisma);
    const result = await svc.create(CTX, { name: 'Senior Dev', code: 'SRDEV', companyId: 'c1' } as any);
    expect(result).toBeDefined();
    expect(prisma.designation.create).toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate code', async () => {
    const prisma = mockPrisma({
      designation: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
    });
    const svc = new DesignationService(prisma);
    await expect(
      svc.create(CTX, { name: 'X', code: 'DUP', companyId: 'c1' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('lists designations', async () => {
    const prisma = mockPrisma({
      designation: {
        findMany: vi.fn().mockResolvedValue([{ id: 'des1', name: 'Dev', _count: { employees: 0 } }]),
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new DesignationService(prisma);
    const result = await svc.findAll(CTX, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
  });
});

// ── TeamService ───────────────────────────────────────────────────────────

describe('TeamService', () => {
  let TeamService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../../organization/services/team.service');
    TeamService = mod.TeamService;
  });

  it('creates a team', async () => {
    const prisma = mockPrisma({
      // Team needs company + department + optionally manager validation
      department: {
        findFirst: vi.fn().mockResolvedValue({ id: 'dep1', tenantId: 't1' }),
      },
    });
    const svc = new TeamService(prisma);
    const result = await svc.create(CTX, { name: 'Alpha', code: 'ALPHA', companyId: 'c1', departmentId: 'dep1' } as any);
    expect(result).toBeDefined();
    expect(prisma.team.create).toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate team code', async () => {
    const prisma = mockPrisma({
      department: { findFirst: vi.fn().mockResolvedValue({ id: 'dep1' }) },
      team: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
    });
    const svc = new TeamService(prisma);
    await expect(
      svc.create(CTX, { name: 'X', code: 'DUP', companyId: 'c1', departmentId: 'dep1' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('lists teams', async () => {
    const prisma = mockPrisma({
      team: {
        findMany: vi.fn().mockResolvedValue([{ id: 't1', name: 'Alpha', _count: { members: 0 } }]),
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
      },
    });
    const svc = new TeamService(prisma);
    const result = await svc.findAll(CTX, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
  });
});
