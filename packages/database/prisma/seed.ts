/**
 * FusionOS Database Seed Script
 *
 * This script creates legitimate foundational data for local development.
 * It does NOT create fake business transactions, fake payroll, fake attendance,
 * fake invoices, or fake financial statements.
 *
 * Seed data is DEVELOPMENT-ONLY and must never be used in production.
 *
 * What this seed creates:
 *   - Development tenant
 *   - Development company
 *   - System roles (Super Admin, Company Owner, etc.)
 *   - System permissions (read, create, update, delete, approve, etc.)
 *   - Role-permission mappings
 *   - Development user (admin@fusionos.dev)
 *   - User-role assignment
 *
 * What this seed does NOT create:
 *   - Fake employees (those belong in the Employee module)
 *   - Fake attendance records
 *   - Fake payroll data
 *   - Fake financial transactions
 *   - Fake CRM data
 *   - Any data that would misrepresent implemented features
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Development Constants ────────────────────────────────────────────────────

const DEV_TENANT = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'FusionOS Development',
  slug: 'fusionos-dev',
};

const DEV_COMPANY = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'FusionOS Corp',
  legalName: 'FusionOS Corporation Ltd.',
  code: 'FOS',
  email: 'info@fusionos.dev',
};

const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'admin@fusionos.dev',
  firstName: 'Admin',
  lastName: 'User',
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
  { name: 'employee:read', description: 'Read employees', resource: 'employee', action: 'read' },
  { name: 'employee:create', description: 'Create employees', resource: 'employee', action: 'create' },
  { name: 'employee:update', description: 'Update employees', resource: 'employee', action: 'update' },
  { name: 'employee:delete', description: 'Delete employees', resource: 'employee', action: 'delete' },
  { name: 'attendance:read', description: 'Read attendance', resource: 'attendance', action: 'read' },
  { name: 'attendance:manage', description: 'Manage attendance', resource: 'attendance', action: 'manage' },
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
  console.log('🌱 Seeding FusionOS development database...\n');

  // ── 1. Tenant ────────────────────────────────────────────────────────────
  console.log('  📦 Creating development tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { id: DEV_TENANT.id },
    update: {},
    create: {
      id: DEV_TENANT.id,
      name: DEV_TENANT.name,
      slug: DEV_TENANT.slug,
      status: 'ACTIVE',
    },
  });
  console.log(`     ✅ Tenant: ${tenant.name} (${tenant.id})`);

  // ── 2. Company ───────────────────────────────────────────────────────────
  console.log('  🏢 Creating development company...');
  const company = await prisma.company.upsert({
    where: { id: DEV_COMPANY.id },
    update: {},
    create: {
      id: DEV_COMPANY.id,
      tenantId: tenant.id,
      name: DEV_COMPANY.name,
      legalName: DEV_COMPANY.legalName,
      code: DEV_COMPANY.code,
      email: DEV_COMPANY.email,
      status: 'ACTIVE',
    },
  });
  console.log(`     ✅ Company: ${company.name} (${company.id})`);

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
    const r = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId: roleDef.isSystem ? null : tenant.id,
          name: roleDef.name,
        },
      },
      update: {},
      create: {
        tenantId: roleDef.isSystem ? null : tenant.id,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: roleDef.isSystem,
      },
    });
    roles.push(r);
  }
  console.log(`     ✅ Roles: ${roles.length} created`);

  // ── 5. Role-Permission Mappings ──────────────────────────────────────────
  console.log('  🔗 Creating role-permission mappings...');

  // Super Admin gets all permissions
  const superAdminRole = roles.find((r) => r.name === 'super_admin');
  if (superAdminRole) {
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      });
    }
    console.log('     ✅ Super Admin: all permissions assigned');
  }

  // Company Owner gets all permissions
  const companyOwnerRole = roles.find((r) => r.name === 'company_owner');
  if (companyOwnerRole) {
    for (const perm of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: companyOwnerRole.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: companyOwnerRole.id,
          permissionId: perm.id,
        },
      });
    }
    console.log('     ✅ Company Owner: all permissions assigned');
  }

  // ── 6. Development User ──────────────────────────────────────────────────
  console.log('  👤 Creating development user...');
  const user = await prisma.user.upsert({
    where: { id: DEV_USER.id },
    update: {},
    create: {
      id: DEV_USER.id,
      email: DEV_USER.email,
      firstName: DEV_USER.firstName,
      lastName: DEV_USER.lastName,
      status: 'ACTIVE',
      isEmailVerified: true,
    },
  });
  console.log(`     ✅ User: ${user.email} (${user.id})`);

  // ── 7. User-Role Assignment ──────────────────────────────────────────────
  console.log('  🔗 Assigning roles to development user...');
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId_tenantId: {
          userId: user.id,
          roleId: superAdminRole.id,
          tenantId: tenant.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: superAdminRole.id,
        tenantId: tenant.id,
      },
    });
    console.log('     ✅ User assigned: super_admin in fusionos-dev tenant');
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n📊 Seed Summary:');
  console.log(`   Tenants:    1`);
  console.log(`   Companies:  1`);
  console.log(`   Roles:      ${roles.length}`);
  console.log(`   Permissions: ${permissions.length}`);
  console.log(`   Users:      1`);
  console.log(`   UserRoles:  1`);
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
