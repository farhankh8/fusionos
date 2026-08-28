/**
 * FusionOS Database Seed Script (Phase 4)
 *
 * Creates development data for local development AND cross-tenant security testing.
 *
 * Seed data includes:
 *   - Tenant A (FusionOS Development) — primary dev tenant
 *   - Tenant B (Acme Corporation) — for cross-tenant security testing
 *   - System roles and permissions
 *   - Users with different roles in each tenant
 *   - User-role assignments
 *
 * SECURITY: All seed data is DEVELOPMENT-ONLY. Never used in production.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Development Constants ────────────────────────────────────────────────────

// ── Tenant A: FusionOS Development ──────────────────────────────────────────

const TENANT_A = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'FusionOS Development',
  slug: 'fusionos-dev',
};

const COMPANY_A = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'FusionOS Corp',
  legalName: 'FusionOS Corporation Ltd.',
  code: 'FOS',
  email: 'info@fusionos.dev',
};

const USER_A_ADMIN = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'admin@fusionos.dev',
  firstName: 'Admin',
  lastName: 'User',
};

const USER_A_HR = {
  id: '00000000-0000-0000-0000-000000000010',
  email: 'hr@fusionos.dev',
  firstName: 'HR',
  lastName: 'Manager',
};

const USER_A_EMPLOYEE = {
  id: '00000000-0000-0000-0000-000000000011',
  email: 'employee@fusionos.dev',
  firstName: 'Test',
  lastName: 'Employee',
};

// ── Tenant B: Acme Corporation (for cross-tenant testing) ──────────────────

const TENANT_B = {
  id: '10000000-0000-0000-0000-000000000001',
  name: 'Acme Corporation',
  slug: 'acme-corp',
};

const COMPANY_B = {
  id: '10000000-0000-0000-0000-000000000002',
  name: 'Acme Industries',
  legalName: 'Acme Industries Inc.',
  code: 'ACM',
  email: 'info@acme.dev',
};

const USER_B_ADMIN = {
  id: '10000000-0000-0000-0000-000000000003',
  email: 'admin@acme.dev',
  firstName: 'Acme',
  lastName: 'Admin',
};

const USER_B_EMPLOYEE = {
  id: '10000000-0000-0000-0000-000000000010',
  email: 'employee@acme.dev',
  firstName: 'Acme',
  lastName: 'Employee',
};

// ── System Roles ─────────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  { name: 'super_admin', description: 'Platform super administrator — full access across all tenants', isSystem: true },
  { name: 'company_owner', description: 'Company owner — full access within their tenant', isSystem: false },
  { name: 'hr_manager', description: 'HR Manager — manages employees, attendance, leave, payroll', isSystem: false },
  { name: 'finance_manager', description: 'Finance Manager — manages accounts, invoices, payments', isSystem: false },
  { name: 'crm_manager', description: 'CRM Manager — manages clients, leads, opportunities', isSystem: false },
  { name: 'team_manager', description: 'Team Manager — manages team members and tasks', isSystem: false },
  { name: 'employee', description: 'Employee — basic self-service access', isSystem: false },
] as const;

// ── System Permissions ───────────────────────────────────────────────────────

const SYSTEM_PERMISSIONS = [
  // Generic CRUD permissions
  { name: 'read', description: 'Read access', resource: 'global', action: 'read' },
  { name: 'create', description: 'Create access', resource: 'global', action: 'create' },
  { name: 'update', description: 'Update access', resource: 'global', action: 'update' },
  { name: 'delete', description: 'Delete access', resource: 'global', action: 'delete' },
  { name: 'approve', description: 'Approve access', resource: 'global', action: 'approve' },
  { name: 'export', description: 'Export access', resource: 'global', action: 'export' },
  { name: 'manage', description: 'Manage access', resource: 'global', action: 'manage' },
  { name: 'admin', description: 'Admin access', resource: 'global', action: 'admin' },

  // Resource-specific permissions (predefined for Phase 3+)
  // Organization permissions
  { name: 'company:read', description: 'Read companies', resource: 'company', action: 'read' },
  { name: 'company:create', description: 'Create companies', resource: 'company', action: 'create' },
  { name: 'company:update', description: 'Update companies', resource: 'company', action: 'update' },
  { name: 'branch:read', description: 'Read branches', resource: 'branch', action: 'read' },
  { name: 'branch:create', description: 'Create branches', resource: 'branch', action: 'create' },
  { name: 'branch:update', description: 'Update branches', resource: 'branch', action: 'update' },
  { name: 'department:read', description: 'Read departments', resource: 'department', action: 'read' },
  { name: 'department:create', description: 'Create departments', resource: 'department', action: 'create' },
  { name: 'department:update', description: 'Update departments', resource: 'department', action: 'update' },
  { name: 'team:read', description: 'Read teams', resource: 'team', action: 'read' },
  { name: 'team:create', description: 'Create teams', resource: 'team', action: 'create' },
  { name: 'team:update', description: 'Update teams', resource: 'team', action: 'update' },
  { name: 'designation:read', description: 'Read designations', resource: 'designation', action: 'read' },
  { name: 'designation:create', description: 'Create designations', resource: 'designation', action: 'create' },
  { name: 'designation:update', description: 'Update designations', resource: 'designation', action: 'update' },
  // Employee permissions
  { name: 'employee:read', description: 'Read employees', resource: 'employee', action: 'read' },
  { name: 'employee:create', description: 'Create employees', resource: 'employee', action: 'create' },
  { name: 'employee:update', description: 'Update employees', resource: 'employee', action: 'update' },
  { name: 'employee:manage', description: 'Manage employees (status changes, soft-delete)', resource: 'employee', action: 'manage' },
  { name: 'employee:delete', description: 'Delete employees', resource: 'employee', action: 'delete' },
  // Attendance permissions
  { name: 'attendance:read', description: 'Read attendance', resource: 'attendance', action: 'read' },
  { name: 'attendance:create', description: 'Clock in/out, breaks', resource: 'attendance', action: 'create' },
  { name: 'attendance:correct', description: 'Request attendance correction', resource: 'attendance', action: 'correct' },
  { name: 'attendance:approve', description: 'Approve/reject corrections', resource: 'attendance', action: 'approve' },
  { name: 'attendance:manage', description: 'Manage attendance (admin)', resource: 'attendance', action: 'manage' },
  { name: 'leave:read', description: 'Read leave', resource: 'leave', action: 'read' },
  { name: 'leave:approve', description: 'Approve leave', resource: 'leave', action: 'approve' },
  { name: 'payroll:read', description: 'Read payroll', resource: 'payroll', action: 'read' },
  { name: 'payroll:manage', description: 'Manage payroll', resource: 'payroll', action: 'manage' },
  { name: 'payroll:approve', description: 'Approve payroll', resource: 'payroll', action: 'approve' },
  { name: 'finance:read', description: 'Read finance', resource: 'finance', action: 'read' },
  { name: 'finance:manage', description: 'Manage finance', resource: 'finance', action: 'manage' },
  { name: 'crm:read', description: 'Read CRM', resource: 'crm', action: 'read' },
  { name: 'crm:manage', description: 'Manage CRM', resource: 'crm', action: 'manage' },
  { name: 'project:read', description: 'Read projects', resource: 'project', action: 'read' },
  { name: 'project:manage', description: 'Manage projects', resource: 'project', action: 'manage' },
  { name: 'settings:read', description: 'Read settings', resource: 'settings', action: 'read' },
  { name: 'settings:manage', description: 'Manage settings', resource: 'settings', action: 'manage' },
  { name: 'audit:read', description: 'Read audit logs', resource: 'audit', action: 'read' },
  { name: 'user:manage', description: 'Manage users', resource: 'user', action: 'manage' },
  { name: 'role:manage', description: 'Manage roles', resource: 'role', action: 'manage' },
] as const;

// ── Seed Function ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding FusionOS development database (Phase 4)...\n');

  // ── 1. Tenants ───────────────────────────────────────────────────────────
  console.log('  📦 Creating tenants...');
  const tenantA = await prisma.tenant.upsert({
    where: { id: TENANT_A.id },
    update: {},
    create: { id: TENANT_A.id, name: TENANT_A.name, slug: TENANT_A.slug, status: 'ACTIVE' },
  });
  const tenantB = await prisma.tenant.upsert({
    where: { id: TENANT_B.id },
    update: {},
    create: { id: TENANT_B.id, name: TENANT_B.name, slug: TENANT_B.slug, status: 'ACTIVE' },
  });
  console.log(`     ✅ Tenant A: ${tenantA.name}`);
  console.log(`     ✅ Tenant B: ${tenantB.name}`);

  // ── 2. Companies ─────────────────────────────────────────────────────────
  console.log('  🏢 Creating companies...');
  const companyA = await prisma.company.upsert({
    where: { id: COMPANY_A.id },
    update: {},
    create: { id: COMPANY_A.id, tenantId: tenantA.id, name: COMPANY_A.name, legalName: COMPANY_A.legalName, code: COMPANY_A.code, email: COMPANY_A.email, status: 'ACTIVE' },
  });
  const companyB = await prisma.company.upsert({
    where: { id: COMPANY_B.id },
    update: {},
    create: { id: COMPANY_B.id, tenantId: tenantB.id, name: COMPANY_B.name, legalName: COMPANY_B.legalName, code: COMPANY_B.code, email: COMPANY_B.email, status: 'ACTIVE' },
  });
  console.log(`     ✅ Company A: ${companyA.name}`);
  console.log(`     ✅ Company B: ${companyB.name}`);

  // ── 3. System Permissions ────────────────────────────────────────────────
  console.log('  🔑 Creating system permissions...');
  const permissions = [];
  for (const perm of SYSTEM_PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    permissions.push(p);
  }
  console.log(`     ✅ Permissions: ${permissions.length} created`);

  // ── 4. System Roles ──────────────────────────────────────────────────────
  console.log('  👤 Creating system roles...');
  const roles = [];
  for (const roleDef of SYSTEM_ROLES) {
    const roleTenantId = roleDef.isSystem ? null : tenantA.id;
    let r;
    if (roleDef.isSystem) {
      // System roles have null tenantId — can't use upsert with null composite unique
      const existing = await prisma.role.findFirst({
        where: { tenantId: null, name: roleDef.name },
      });
      if (existing) {
        r = existing;
      } else {
        r = await prisma.role.create({
          data: {
            tenantId: null,
            name: roleDef.name,
            description: roleDef.description,
            isSystem: roleDef.isSystem,
          },
        });
      }
    } else {
      r = await prisma.role.upsert({
        where: {
          tenantId_name: {
            tenantId: tenantA.id,
            name: roleDef.name,
          },
        },
        update: {},
        create: {
          tenantId: tenantA.id,
          name: roleDef.name,
          description: roleDef.description,
          isSystem: roleDef.isSystem,
        },
      });
    }
    roles.push(r);
  }
  console.log(`     ✅ Roles: ${roles.length} created`);

  // ── 5. Role-Permission Mappings ──────────────────────────────────────────
  console.log('  🔗 Creating role-permission mappings...');

  // Helper to assign permissions to a role by name pattern
  async function assignPermissions(roleName: string, permPatterns: string[]) {
    const role = roles.find((r) => r.name === roleName);
    if (!role) return;
    const matched = permissions.filter((p) => permPatterns.includes(p.name));
    for (const perm of matched) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    console.log(`     ✅ ${roleName}: ${matched.length} permissions assigned`);
  }

  // Super Admin: ALL permissions
  const superAdminRole = roles.find((r) => r.name === 'super_admin');
  if (superAdminRole) {
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: superAdminRole.id, permissionId: perm.id },
      });
    }
    console.log('     ✅ super_admin: all permissions assigned');
  }

  // Company Owner: ALL permissions
  const companyOwnerRole = roles.find((r) => r.name === 'company_owner');
  if (companyOwnerRole) {
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: companyOwnerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: companyOwnerRole.id, permissionId: perm.id },
      });
    }
    console.log('     ✅ company_owner: all permissions assigned');
  }

  // HR Manager: employee + attendance + leave + payroll (read/manage)
  await assignPermissions('hr_manager', [
    'employee:read', 'employee:create', 'employee:update',
    'attendance:read', 'attendance:create', 'attendance:correct', 'attendance:approve', 'attendance:manage',
    'leave:read', 'leave:approve',
    'payroll:read', 'payroll:manage',
  ]);

  // Finance Manager: finance + payroll
  await assignPermissions('finance_manager', [
    'finance:read', 'finance:manage',
    'payroll:read', 'payroll:approve',
  ]);

  // CRM Manager: CRM
  await assignPermissions('crm_manager', [
    'crm:read', 'crm:manage',
  ]);

  // Team Manager: employee read
  await assignPermissions('team_manager', [
    'employee:read',
  ]);

  // Employee: self-service (read own attendance + clock in/out)
  await assignPermissions('employee', [
    'employee:read',
    'attendance:read', 'attendance:create',
  ]);

  // ── 6. Users ─────────────────────────────────────────────────────────────
  console.log('  👤 Creating users...');
  // Dev password: Admin@123 — only for local development
  const DEV_PASSWORD_HASH = '$argon2id$v=19$m=65536,p=4,t=3$wyIJ2LQvLUxniIOIcBDRZQ$IY8gnp/onjcgYtRba1FonRiHkwyYhFBnWVBqh9pQv/I';

  const allUsers = [USER_A_ADMIN, USER_A_HR, USER_A_EMPLOYEE, USER_B_ADMIN, USER_B_EMPLOYEE];
  for (const u of allUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, passwordHash: DEV_PASSWORD_HASH, status: 'ACTIVE', isEmailVerified: true },
    });
  }
  console.log(`     ✅ Users: ${allUsers.length} created`);

  // ── 7. User-Role Assignments ──────────────────────────────────────────────
  console.log('  🔗 Assigning roles...');
  const hrManagerRole = roles.find((r) => r.name === 'hr_manager');
  const employeeRole = roles.find((r) => r.name === 'employee');
  const companyOwnerRole2 = roles.find((r) => r.name === 'company_owner');

  // Tenant A assignments
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_tenantId: { userId: USER_A_ADMIN.id, roleId: superAdminRole.id, tenantId: tenantA.id } },
      update: {},
      create: { userId: USER_A_ADMIN.id, roleId: superAdminRole.id, tenantId: tenantA.id },
    });
  }
  if (hrManagerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_tenantId: { userId: USER_A_HR.id, roleId: hrManagerRole.id, tenantId: tenantA.id } },
      update: {},
      create: { userId: USER_A_HR.id, roleId: hrManagerRole.id, tenantId: tenantA.id },
    });
  }
  if (employeeRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_tenantId: { userId: USER_A_EMPLOYEE.id, roleId: employeeRole.id, tenantId: tenantA.id } },
      update: {},
      create: { userId: USER_A_EMPLOYEE.id, roleId: employeeRole.id, tenantId: tenantA.id },
    });
  }
  console.log('     ✅ Tenant A: super_admin, hr_manager, employee');

  // Tenant B assignments
  if (companyOwnerRole2) {
    await prisma.userRole.upsert({
      where: { userId_roleId_tenantId: { userId: USER_B_ADMIN.id, roleId: companyOwnerRole2.id, tenantId: tenantB.id } },
      update: {},
      create: { userId: USER_B_ADMIN.id, roleId: companyOwnerRole2.id, tenantId: tenantB.id },
    });
  }
  if (employeeRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_tenantId: { userId: USER_B_EMPLOYEE.id, roleId: employeeRole.id, tenantId: tenantB.id } },
      update: {},
      create: { userId: USER_B_EMPLOYEE.id, roleId: employeeRole.id, tenantId: tenantB.id },
    });
  }
  console.log('     ✅ Tenant B: company_owner, employee');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n📊 Seed Summary:');
  console.log(`   Tenants:     2 (A: ${tenantA.slug}, B: ${tenantB.slug})`);
  console.log(`   Companies:   2`);
  console.log(`   Roles:       ${roles.length}`);
  console.log(`   Permissions: ${permissions.length}`);
  console.log(`   Users:       ${allUsers.length}`);
  console.log(`   UserRoles:   6 (3 per tenant)`);
  console.log('\n✅ Development seed complete.');
  console.log('   ⚠️  This data is for development only — not production.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
