/**
 * FusionOS Application-Layer E2E Tests — Phase 24 Final Audit
 *
 * Unlike the raw-Prisma data-integrity suites (which bypass the application),
 * these tests boot the REAL NestJS application and exercise the actual HTTP
 * stack end to end:
 *
 *   HTTP → JwtAuthGuard → RBACGuard → TenantContextService → Controller → Service → Prisma
 *
 * Verified behaviors:
 *   - Authentication: 401 without a token; real login flow issues a working JWT
 *   - RBAC: permission enforcement through the guard stack (403 for missing permission)
 *   - Tenant membership: X-Tenant-Id must be a real membership (403 otherwise)
 *   - Tenant isolation: data created in tenant A is not visible from tenant B
 *   - IDOR: cross-tenant resource access by ID is forbidden
 *   - Domain separation: payroll endpoints require payroll permissions
 *
 * Fully self-contained: creates its own user/roles/memberships (unique per run)
 * and cleans up after itself, so it is deterministic and safe to re-run.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppModule } from '../../app.module';

const prisma = new PrismaClient();

// Same seeded tenant/company IDs used across the FusionOS test suites
const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';

// Unique per run → deterministic, no cross-run collisions
const RUN = `${Date.now()}`.slice(-8);
const ADMIN_EMAIL = `e2e-admin-${RUN}@fusionos.test`;
const VIEWER_EMAIL = `e2e-viewer-${RUN}@fusionos.test`;
const PASSWORD = 'E2E_Pass@123!';
const EMPLOYEE_CODE = `E2EAPP-${RUN}`;
const EMPLOYEE_EMAIL = `e2e-emp-${RUN}@fusionos.test`;

let app: INestApplication;
let baseUrl: string;

let adminToken = '';
let viewerToken = '';

// RFC 4122-compliant UUID (version 4 + variant) — the seeded company IDs
// (…0002 with version/variant bits 0) fail @IsUUID() validation, so the
// API can never reference them; this test creates its own valid company.
const TEST_COMPANY_ID = '11111111-1111-4111-8111-111111111111';

// Tracked IDs for precise cleanup (never tenant-wide deleteMany)
const trackedRoleIds: string[] = [];
const trackedUserRoleIds: string[] = [];
const trackedUserIds: string[] = [];
const trackedEmployeeIds: string[] = [];
const trackedCompanyIds: string[] = [];

async function api(
  path: string,
  options: { method?: string; token?: string; tenantId?: string; body?: unknown } = {},
): Promise<{ status: number; json: any }> {
  const { method = 'GET', token, tenantId, body } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantId ? { 'X-Tenant-Id': tenantId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (res.status >= 400 && process.env['E2E_DEBUG']) {
    console.log(`[E2E] ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return { status: res.status, json };
}

const API_PREFIX = '/api/v1';

async function login(email: string, password: string): Promise<string> {
  const res = await api(`${API_PREFIX}/auth/login`, {
    method: 'POST',
    body: { email, password },
  });
  expect(res.status).toBe(200);
  expect(res.json.session?.accessToken).toBeTruthy();
  return res.json.session.accessToken as string;
}

beforeAll(async () => {
  // ── 1. Ensure required permissions exist (seeded normally) ──────────────
  for (const p of [
    { name: 'employee:read', resource: 'employee', action: 'read' },
    { name: 'employee:create', resource: 'employee', action: 'create' },
    { name: 'employee:manage', resource: 'employee', action: 'manage' },
    { name: 'payroll:read', resource: 'payroll', action: 'read' },
  ]) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  // ── 1b. Company with a valid RFC 4122 UUID for tenant A ────────────────
  const company = await prisma.company.create({
    data: {
      id: TEST_COMPANY_ID,
      tenantId: TENANT_A,
      name: `E2E Company ${RUN}`,
      legalName: `E2E Company ${RUN} Ltd`,
      code: `E2E-${RUN}`,
      email: `e2e-co-${RUN}@fusionos.test`,
      status: 'ACTIVE',
    },
  });
  trackedCompanyIds.push(company.id);

  // ── 2. Roles: admin (full employee perms) and viewer (no perms) ─────────
  const adminRole = await prisma.role.create({
    data: {
      tenantId: TENANT_A,
      name: `E2E_ADMIN_${RUN}`,
      description: 'Phase 24 E2E admin role (test-only)',
      isSystem: false,
      rolePermissions: {
        create: [
          { permission: { connect: { name: 'employee:read' } } },
          { permission: { connect: { name: 'employee:create' } } },
          { permission: { connect: { name: 'employee:manage' } } },
        ],
      },
    },
  });
  trackedRoleIds.push(adminRole.id);

  const viewerRole = await prisma.role.create({
    data: {
      tenantId: TENANT_B,
      name: `E2E_VIEWER_${RUN}`,
      description: 'Phase 24 E2E viewer role (test-only, no permissions)',
      isSystem: false,
    },
  });
  trackedRoleIds.push(viewerRole.id);

  // ── 3. Users ────────────────────────────────────────────────────────────
  const passwordHash = await argon2.hash(PASSWORD);
  const adminUser = await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      firstName: 'E2E',
      lastName: 'Admin',
      passwordHash,
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  });
  trackedUserIds.push(adminUser.id);

  const viewerUser = await prisma.user.create({
    data: {
      email: VIEWER_EMAIL,
      firstName: 'E2E',
      lastName: 'Viewer',
      passwordHash,
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  });
  trackedUserIds.push(viewerUser.id);

  // ── 4. Memberships: admin in A+B, viewer in B only ─────────────────────
  const ur1 = await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: adminRole.id, tenantId: TENANT_A },
  });
  trackedUserRoleIds.push(ur1.id);
  const ur2 = await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: adminRole.id, tenantId: TENANT_B },
  });
  trackedUserRoleIds.push(ur2.id);
  const ur3 = await prisma.userRole.create({
    data: { userId: viewerUser.id, roleId: viewerRole.id, tenantId: TENANT_B },
  });
  trackedUserRoleIds.push(ur3.id);

  // ── 5. Boot the real application (same factory as production main.ts) ───
  app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.listen(0);
  const address = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${(address as { port: number }).port}`;

  // ── 6. Real login flows ─────────────────────────────────────────────────
  adminToken = await login(ADMIN_EMAIL, PASSWORD);
  viewerToken = await login(VIEWER_EMAIL, PASSWORD);
});

afterAll(async () => {
  if (app) await app.close();

  if (trackedEmployeeIds.length > 0) {
    await prisma.employee.deleteMany({ where: { id: { in: trackedEmployeeIds } } });
  }
  if (trackedUserIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: trackedUserIds } } });
    await prisma.authEvent.deleteMany({ where: { userId: { in: trackedUserIds } } });
  }
  await prisma.userRole.deleteMany({ where: { id: { in: trackedUserRoleIds } } });
  await prisma.role.deleteMany({ where: { id: { in: trackedRoleIds } } });
  await prisma.user.deleteMany({ where: { id: { in: trackedUserIds } } });
  if (trackedCompanyIds.length > 0) {
    await prisma.employee.deleteMany({ where: { companyId: { in: trackedCompanyIds } } });
    await prisma.company.deleteMany({ where: { id: { in: trackedCompanyIds } } });
  }

  await prisma.$disconnect();
});

describe('Application-Layer E2E — Phase 24', () => {
  it('health/live is public (no token required)', async () => {
    const res = await api(`${API_PREFIX}/health/live`);
    expect(res.status).toBe(200);
    expect(res.json.status).toBe('ok');
  });

  it('protected endpoint rejects unauthenticated requests with 401', async () => {
    const res = await api(`${API_PREFIX}/employees`);
    expect(res.status).toBe(401);
  });

  it('login rejects invalid credentials with 401', async () => {
    const res = await api(`${API_PREFIX}/auth/login`, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'DefinitelyWrong!' },
    });
    expect(res.status).toBe(401);
  });

  it('RBAC denies a user without the required permission (403)', async () => {
    // viewer has a valid membership in TENANT_B but no employee:read
    const res = await api(`${API_PREFIX}/employees`, { token: viewerToken, tenantId: TENANT_B });
    expect(res.status).toBe(403);
  });

  it('rejects a tenant the user is not a member of (403)', async () => {
    // viewer has no membership in TENANT_A
    const res = await api(`${API_PREFIX}/employees`, { token: viewerToken, tenantId: TENANT_A });
    expect(res.status).toBe(403);
  });

  it('rejects an unknown tenant id (403)', async () => {
    const res = await api(`${API_PREFIX}/employees`, {
      token: viewerToken,
      tenantId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    });
    expect(res.status).toBe(403);
  });

  it('admin can list employees in a tenant they belong to (200)', async () => {
    const res = await api(`${API_PREFIX}/employees`, { token: adminToken, tenantId: TENANT_A });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.data)).toBe(true);
    expect(res.json.meta).toBeDefined();
  });

  it('creates an employee through the API (201)', async () => {
    const res = await api(`${API_PREFIX}/employees`, {
      method: 'POST',
      token: adminToken,
      tenantId: TENANT_A,
      body: {
        companyId: TEST_COMPANY_ID,
        employeeCode: EMPLOYEE_CODE,
        firstName: 'E2E',
        lastName: 'AppTest',
        email: EMPLOYEE_EMAIL,
        joiningDate: '2026-01-15',
        employmentType: 'FULL_TIME',
      },
    });
    expect(res.status).toBe(201);
    expect(res.json.id).toBeTruthy();
    expect(res.json.tenantId).toBe(TENANT_A);
    trackedEmployeeIds.push(res.json.id);
  });

  it('tenant isolation: employee from tenant A is invisible in tenant B lists', async () => {
    const res = await api(`${API_PREFIX}/employees?search=${EMPLOYEE_CODE}`, {
      token: adminToken,
      tenantId: TENANT_B,
    });
    expect(res.status).toBe(200);
    expect(res.json.data.length).toBe(0);
  });

  it('IDOR: cross-tenant read of an employee by id is forbidden (403)', async () => {
    const id = trackedEmployeeIds[0];
    expect(id).toBeTruthy();
    const res = await api(`${API_PREFIX}/employees/${id}`, { token: adminToken, tenantId: TENANT_B });
    expect(res.status).toBe(403);
  });

  it('same-tenant read of the employee by id succeeds (200)', async () => {
    const id = trackedEmployeeIds[0];
    const res = await api(`${API_PREFIX}/employees/${id}`, { token: adminToken, tenantId: TENANT_A });
    expect(res.status).toBe(200);
    expect(res.json.employeeCode).toBe(EMPLOYEE_CODE);
  });

  it('IDOR: cross-tenant delete of an employee is forbidden (403)', async () => {
    const id = trackedEmployeeIds[0];
    const res = await api(`${API_PREFIX}/employees/${id}`, {
      method: 'DELETE',
      token: adminToken,
      tenantId: TENANT_B,
    });
    expect(res.status).toBe(403);
  });

  it('domain separation: admin without payroll permission gets 403 on payroll', async () => {
    const res = await api(`${API_PREFIX}/payroll/dashboard`, { token: adminToken, tenantId: TENANT_A });
    expect(res.status).toBe(403);
  });
});