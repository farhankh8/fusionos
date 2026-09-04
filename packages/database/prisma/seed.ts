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
  id: '00000000-0000-4000-8000-000000000001',
  name: 'FusionOS Development',
  slug: 'fusionos-dev',
};

const COMPANY_A = {
  id: '00000000-0000-4000-8000-000000000002',
  name: 'FusionOS Corp',
  legalName: 'FusionOS Corporation Ltd.',
  code: 'FOS',
  email: 'info@fusionos.dev',
};

const USER_A_ADMIN = {
  id: '00000000-0000-4000-8000-000000000003',
  email: 'admin@fusionos.dev',
  firstName: 'Admin',
  lastName: 'User',
};

const USER_A_HR = {
  id: '00000000-0000-4000-8000-000000000010',
  email: 'hr@fusionos.dev',
  firstName: 'HR',
  lastName: 'Manager',
};

const USER_A_EMPLOYEE = {
  id: '00000000-0000-4000-8000-000000000011',
  email: 'employee@fusionos.dev',
  firstName: 'Test',
  lastName: 'Employee',
};

// ── Tenant B: Acme Corporation (for cross-tenant testing) ──────────────────

const TENANT_B = {
  id: '10000000-0000-4000-8000-000000000001',
  name: 'Acme Corporation',
  slug: 'acme-corp',
};

const COMPANY_B = {
  id: '10000000-0000-4000-8000-000000000002',
  name: 'Acme Industries',
  legalName: 'Acme Industries Inc.',
  code: 'ACM',
  email: 'info@acme.dev',
};

const USER_B_ADMIN = {
  id: '10000000-0000-4000-8000-000000000003',
  email: 'admin@acme.dev',
  firstName: 'Acme',
  lastName: 'Admin',
};

const USER_B_EMPLOYEE = {
  id: '10000000-0000-4000-8000-000000000010',
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
  { name: 'leave:create', description: 'Create leave request', resource: 'leave', action: 'create' },
  { name: 'leave:submit', description: 'Submit leave request', resource: 'leave', action: 'submit' },
  { name: 'leave:approve', description: 'Approve leave', resource: 'leave', action: 'approve' },
  { name: 'leave:reject', description: 'Reject leave', resource: 'leave', action: 'reject' },
  { name: 'leave:cancel', description: 'Cancel leave', resource: 'leave', action: 'cancel' },
  { name: 'leave:manage', description: 'Manage leave (admin)', resource: 'leave', action: 'manage' },
  { name: 'leave.balance:read', description: 'Read leave balance', resource: 'leave.balance', action: 'read' },
  { name: 'leave.balance:adjust', description: 'Adjust leave balance', resource: 'leave.balance', action: 'adjust' },
  { name: 'leave.policy:read', description: 'Read leave policy', resource: 'leave.policy', action: 'read' },
  { name: 'leave.policy:manage', description: 'Manage leave policy', resource: 'leave.policy', action: 'manage' },
  { name: 'leave.type:read', description: 'Read leave type', resource: 'leave.type', action: 'read' },
  { name: 'leave.type:manage', description: 'Manage leave type', resource: 'leave.type', action: 'manage' },
  { name: 'payroll:read', description: 'Read payroll', resource: 'payroll', action: 'read' },
  { name: 'payroll:manage', description: 'Manage payroll', resource: 'payroll', action: 'manage' },
  { name: 'payroll:approve', description: 'Approve payroll', resource: 'payroll', action: 'approve' },
  { name: 'payroll:calculate', description: 'Calculate payroll', resource: 'payroll', action: 'calculate' },
  { name: 'payroll:finalize', description: 'Finalize payroll', resource: 'payroll', action: 'finalize' },
  { name: 'payroll.salary:read', description: 'Read salary structures', resource: 'payroll.salary', action: 'read' },
  { name: 'payroll.salary:manage', description: 'Manage salary structures', resource: 'payroll.salary', action: 'manage' },
  { name: 'payroll.component:read', description: 'Read payroll components', resource: 'payroll.component', action: 'read' },
  { name: 'payroll.component:manage', description: 'Manage payroll components', resource: 'payroll.component', action: 'manage' },
  { name: 'payroll.adjustment:read', description: 'Read payroll adjustments', resource: 'payroll.adjustment', action: 'read' },
  { name: 'payroll.adjustment:create', description: 'Create payroll adjustments', resource: 'payroll.adjustment', action: 'create' },
  { name: 'payroll.adjustment:approve', description: 'Approve payroll adjustments', resource: 'payroll.adjustment', action: 'approve' },
  { name: 'payroll.payslip:read', description: 'Read payslips', resource: 'payroll.payslip', action: 'read' },
  { name: 'finance:read', description: 'Read finance', resource: 'finance', action: 'read' },
  { name: 'finance:manage', description: 'Manage finance', resource: 'finance', action: 'manage' },
  // Finance granular permissions
  { name: 'finance.account:read', description: 'Read chart of accounts', resource: 'finance.account', action: 'read' },
  { name: 'finance.account:create', description: 'Create accounts', resource: 'finance.account', action: 'create' },
  { name: 'finance.account:update', description: 'Update accounts', resource: 'finance.account', action: 'update' },
  { name: 'finance.journal:read', description: 'Read journal entries', resource: 'finance.journal', action: 'read' },
  { name: 'finance.journal:create', description: 'Create journal entries', resource: 'finance.journal', action: 'create' },
  { name: 'finance.journal:approve', description: 'Approve journal entries', resource: 'finance.journal', action: 'approve' },
  { name: 'finance.journal:post', description: 'Post journal entries', resource: 'finance.journal', action: 'post' },
  { name: 'finance.journal:reverse', description: 'Reverse journal entries', resource: 'finance.journal', action: 'reverse' },
  { name: 'finance.ledger:read', description: 'Read general ledger', resource: 'finance.ledger', action: 'read' },
  { name: 'finance.report:read', description: 'Read financial reports', resource: 'finance.report', action: 'read' },
  { name: 'finance.expense:read', description: 'Read expenses', resource: 'finance.expense', action: 'read' },
  { name: 'finance.expense:create', description: 'Create expenses', resource: 'finance.expense', action: 'create' },
  { name: 'finance.expense:approve', description: 'Approve expenses', resource: 'finance.expense', action: 'approve' },
  { name: 'finance.ar:read', description: 'Read accounts receivable', resource: 'finance.ar', action: 'read' },
  { name: 'finance.ar:manage', description: 'Manage accounts receivable', resource: 'finance.ar', action: 'manage' },
  { name: 'finance.ap:read', description: 'Read accounts payable', resource: 'finance.ap', action: 'read' },
  { name: 'finance.ap:manage', description: 'Manage accounts payable', resource: 'finance.ap', action: 'manage' },
  { name: 'finance.payment:read', description: 'Read payments', resource: 'finance.payment', action: 'read' },
  { name: 'finance.payment:create', description: 'Create payments', resource: 'finance.payment', action: 'create' },
  { name: 'finance.payment:approve', description: 'Approve payments', resource: 'finance.payment', action: 'approve' },
  { name: 'finance.period:read', description: 'Read accounting periods', resource: 'finance.period', action: 'read' },
  { name: 'finance.period:manage', description: 'Manage accounting periods', resource: 'finance.period', action: 'manage' },
  { name: 'finance.period:close', description: 'Close accounting periods', resource: 'finance.period', action: 'close' },
  { name: 'crm:read', description: 'Read CRM', resource: 'crm', action: 'read' },
  { name: 'crm:manage', description: 'Manage CRM', resource: 'crm', action: 'manage' },
  { name: 'project:read', description: 'Read projects', resource: 'project', action: 'read' },
  { name: 'project:create', description: 'Create projects', resource: 'project', action: 'create' },
  { name: 'project:update', description: 'Update projects', resource: 'project', action: 'update' },
  { name: 'project:manage', description: 'Manage projects', resource: 'project', action: 'manage' },
  { name: 'project:archive', description: 'Archive projects', resource: 'project', action: 'archive' },
  { name: 'project:delete', description: 'Delete projects', resource: 'project', action: 'delete' },
  { name: 'project.member:read', description: 'Read project members', resource: 'project.member', action: 'read' },
  { name: 'project.member:create', description: 'Add project members', resource: 'project.member', action: 'create' },
  { name: 'project.member:update', description: 'Update project member roles', resource: 'project.member', action: 'update' },
  { name: 'project.member:remove', description: 'Remove project members', resource: 'project.member', action: 'remove' },
  { name: 'project.task:read', description: 'Read project tasks', resource: 'project.task', action: 'read' },
  { name: 'project.task:create', description: 'Create project tasks', resource: 'project.task', action: 'create' },
  { name: 'project.task:update', description: 'Update project tasks', resource: 'project.task', action: 'update' },
  { name: 'project.task:assign', description: 'Assign project tasks', resource: 'project.task', action: 'assign' },
  { name: 'project.task:complete', description: 'Complete project tasks', resource: 'project.task', action: 'complete' },
  { name: 'project.milestone:read', description: 'Read project milestones', resource: 'project.milestone', action: 'read' },
  { name: 'project.milestone:create', description: 'Create project milestones', resource: 'project.milestone', action: 'create' },
  { name: 'project.milestone:update', description: 'Update project milestones', resource: 'project.milestone', action: 'update' },
  { name: 'project.time:read', description: 'Read project time entries', resource: 'project.time', action: 'read' },
  { name: 'project.time:create', description: 'Log project time', resource: 'project.time', action: 'create' },
  { name: 'project.time:update', description: 'Update project time entries', resource: 'project.time', action: 'update' },
  { name: 'project.time:approve', description: 'Approve project time entries', resource: 'project.time', action: 'approve' },
  { name: 'project.budget:read', description: 'Read project budgets', resource: 'project.budget', action: 'read' },
  { name: 'project.budget:create', description: 'Create project budgets', resource: 'project.budget', action: 'create' },
  { name: 'project.budget:update', description: 'Update project budgets', resource: 'project.budget', action: 'update' },
  // Document permissions
  { name: 'document:read', description: 'Read documents', resource: 'document', action: 'read' },
  { name: 'document:create', description: 'Create/upload documents', resource: 'document', action: 'create' },
  { name: 'document:update', description: 'Update document metadata', resource: 'document', action: 'update' },
  { name: 'document:delete', description: 'Delete/trash documents', resource: 'document', action: 'delete' },
  { name: 'document:restore', description: 'Restore trashed documents', resource: 'document', action: 'restore' },
  { name: 'document:download', description: 'Download documents', resource: 'document', action: 'download' },
  { name: 'document:manage', description: 'Manage all document operations', resource: 'document', action: 'manage' },
  { name: 'document.folder:read', description: 'Read folders', resource: 'document.folder', action: 'read' },
  { name: 'document.folder:create', description: 'Create folders', resource: 'document.folder', action: 'create' },
  { name: 'document.folder:update', description: 'Update folders', resource: 'document.folder', action: 'update' },
  { name: 'document.folder:delete', description: 'Delete folders', resource: 'document.folder', action: 'delete' },
  { name: 'document.category:read', description: 'Read categories', resource: 'document.category', action: 'read' },
  { name: 'document.category:create', description: 'Create categories', resource: 'document.category', action: 'create' },
  { name: 'document.category:update', description: 'Update categories', resource: 'document.category', action: 'update' },
  { name: 'document.category:delete', description: 'Delete categories', resource: 'document.category', action: 'delete' },
  { name: 'document.version:read', description: 'Read document versions', resource: 'document.version', action: 'read' },
  { name: 'document.version:create', description: 'Create document versions', resource: 'document.version', action: 'create' },
  { name: 'document.permission:read', description: 'Read document permissions', resource: 'document.permission', action: 'read' },
  { name: 'document.permission:manage', description: 'Manage document permissions', resource: 'document.permission', action: 'manage' },
  { name: 'settings:read', description: 'Read settings', resource: 'settings', action: 'read' },
  { name: 'settings:manage', description: 'Manage settings', resource: 'settings', action: 'manage' },
  { name: 'audit:read', description: 'Read audit logs', resource: 'audit', action: 'read' },
  { name: 'user:manage', description: 'Manage users', resource: 'user', action: 'manage' },
  { name: 'role:manage', description: 'Manage roles', resource: 'role', action: 'manage' },
  // Notification permissions (Phase 13)
  { name: 'notification:read', description: 'Read notifications', resource: 'notification', action: 'read' },
  { name: 'notification:manage', description: 'Manage notifications (admin)', resource: 'notification', action: 'manage' },
  { name: 'notification:send', description: 'Send manual notifications', resource: 'notification', action: 'send' },
  { name: 'notification:template:read', description: 'Read notification templates', resource: 'notification.template', action: 'read' },
  { name: 'notification:template:create', description: 'Create notification templates', resource: 'notification.template', action: 'create' },
  { name: 'notification:template:update', description: 'Update notification templates', resource: 'notification.template', action: 'update' },
  { name: 'notification:template:delete', description: 'Delete notification templates', resource: 'notification.template', action: 'delete' },
  { name: 'notification:preference:read', description: 'Read notification preferences', resource: 'notification.preference', action: 'read' },
  { name: 'notification:preference:update', description: 'Update notification preferences', resource: 'notification.preference', action: 'update' },
  { name: 'notification:delivery:read', description: 'Read notification delivery records', resource: 'notification.delivery', action: 'read' },
  // Asset permissions (Phase 14)
  { name: 'asset:read', description: 'Read assets', resource: 'asset', action: 'read' },
  { name: 'asset:create', description: 'Create assets', resource: 'asset', action: 'create' },
  { name: 'asset:update', description: 'Update assets', resource: 'asset', action: 'update' },
  { name: 'asset:manage', description: 'Manage assets (status transitions)', resource: 'asset', action: 'manage' },
  { name: 'asset:assign', description: 'Assign assets to employees/projects', resource: 'asset', action: 'assign' },
  { name: 'asset:transfer', description: 'Transfer assets between locations/employees', resource: 'asset', action: 'transfer' },
  { name: 'asset:retire', description: 'Retire assets', resource: 'asset', action: 'retire' },
  { name: 'asset:dispose', description: 'Dispose assets', resource: 'asset', action: 'dispose' },
  { name: 'asset.category:read', description: 'Read asset categories', resource: 'asset.category', action: 'read' },
  { name: 'asset.category:create', description: 'Create asset categories', resource: 'asset.category', action: 'create' },
  { name: 'asset.category:update', description: 'Update asset categories', resource: 'asset.category', action: 'update' },
  { name: 'asset.category:delete', description: 'Delete asset categories', resource: 'asset.category', action: 'delete' },
  { name: 'asset.location:read', description: 'Read asset locations', resource: 'asset.location', action: 'read' },
  { name: 'asset.location:create', description: 'Create asset locations', resource: 'asset.location', action: 'create' },
  { name: 'asset.location:update', description: 'Update asset locations', resource: 'asset.location', action: 'update' },
  { name: 'asset.location:delete', description: 'Delete asset locations', resource: 'asset.location', action: 'delete' },
  { name: 'asset.maintenance:read', description: 'Read asset maintenance records', resource: 'asset.maintenance', action: 'read' },
  { name: 'asset.maintenance:create', description: 'Create asset maintenance records', resource: 'asset.maintenance', action: 'create' },
  { name: 'asset.maintenance:update', description: 'Update asset maintenance records', resource: 'asset.maintenance', action: 'update' },
  { name: 'asset.inspection:read', description: 'Read asset inspections', resource: 'asset.inspection', action: 'read' },
  { name: 'asset.inspection:create', description: 'Create asset inspections', resource: 'asset.inspection', action: 'create' },
  { name: 'asset.inspection:update', description: 'Update asset inspections', resource: 'asset.inspection', action: 'update' },
  { name: 'asset.warranty:read', description: 'Read asset warranties', resource: 'asset.warranty', action: 'read' },
  { name: 'asset.warranty:create', description: 'Create asset warranties', resource: 'asset.warranty', action: 'create' },
  { name: 'asset.warranty:update', description: 'Update asset warranties', resource: 'asset.warranty', action: 'update' },
  { name: 'asset.depreciation:read', description: 'Read asset depreciation records', resource: 'asset.depreciation', action: 'read' },
  { name: 'asset.depreciation:calculate', description: 'Calculate asset depreciation', resource: 'asset.depreciation', action: 'calculate' },
  // Analytics permissions (Phase 15)
  { name: 'analytics:read', description: 'Read analytics dashboard', resource: 'analytics', action: 'read' },
  { name: 'analytics:dashboard:read', description: 'Read analytics dashboard', resource: 'analytics.dashboard', action: 'read' },
  { name: 'analytics:report:read', description: 'Read analytics reports', resource: 'analytics.report', action: 'read' },
  { name: 'analytics:report:create', description: 'Create analytics reports', resource: 'analytics.report', action: 'create' },
  { name: 'analytics:report:update', description: 'Update analytics reports', resource: 'analytics.report', action: 'update' },
  { name: 'analytics:report:delete', description: 'Delete analytics reports', resource: 'analytics.report', action: 'delete' },
  { name: 'analytics:export', description: 'Export analytics data', resource: 'analytics', action: 'export' },
  { name: 'analytics:finance:read', description: 'Read finance analytics', resource: 'analytics.finance', action: 'read' },
  { name: 'analytics:workforce:read', description: 'Read workforce analytics', resource: 'analytics.workforce', action: 'read' },
  { name: 'analytics:attendance:read', description: 'Read attendance analytics', resource: 'analytics.attendance', action: 'read' },
  { name: 'analytics:leave:read', description: 'Read leave analytics', resource: 'analytics.leave', action: 'read' },
  { name: 'analytics:payroll:read', description: 'Read payroll analytics', resource: 'analytics.payroll', action: 'read' },
  { name: 'analytics:crm:read', description: 'Read CRM analytics', resource: 'analytics.crm', action: 'read' },
  { name: 'analytics:project:read', description: 'Read project analytics', resource: 'analytics.project', action: 'read' },
  { name: 'analytics:asset:read', description: 'Read asset analytics', resource: 'analytics.asset', action: 'read' },
  // CRM permissions (Phase 10) — required by the CRM controllers
  { name: 'crm.customer:read', description: 'Read CRM customers', resource: 'crm.customer', action: 'read' },
  { name: 'crm.customer:create', description: 'Create CRM customers', resource: 'crm.customer', action: 'create' },
  { name: 'crm.customer:update', description: 'Update CRM customers', resource: 'crm.customer', action: 'update' },
  { name: 'crm.contact:read', description: 'Read CRM contacts', resource: 'crm.contact', action: 'read' },
  { name: 'crm.contact:create', description: 'Create CRM contacts', resource: 'crm.contact', action: 'create' },
  { name: 'crm.contact:update', description: 'Update CRM contacts', resource: 'crm.contact', action: 'update' },
  { name: 'crm.lead:read', description: 'Read CRM leads', resource: 'crm.lead', action: 'read' },
  { name: 'crm.lead:create', description: 'Create CRM leads', resource: 'crm.lead', action: 'create' },
  { name: 'crm.lead:update', description: 'Update CRM leads', resource: 'crm.lead', action: 'update' },
  { name: 'crm.lead:convert', description: 'Convert CRM leads to customers', resource: 'crm.lead', action: 'convert' },
  { name: 'crm.opportunity:read', description: 'Read CRM opportunities', resource: 'crm.opportunity', action: 'read' },
  { name: 'crm.opportunity:create', description: 'Create CRM opportunities', resource: 'crm.opportunity', action: 'create' },
  { name: 'crm.opportunity:update', description: 'Update CRM opportunities', resource: 'crm.opportunity', action: 'update' },
  { name: 'crm.task:read', description: 'Read CRM tasks', resource: 'crm.task', action: 'read' },
  { name: 'crm.task:create', description: 'Create CRM tasks', resource: 'crm.task', action: 'create' },
  { name: 'crm.task:update', description: 'Update CRM tasks', resource: 'crm.task', action: 'update' },
  { name: 'crm.activity:read', description: 'Read CRM activities', resource: 'crm.activity', action: 'read' },
  { name: 'crm.activity:create', description: 'Create CRM activities', resource: 'crm.activity', action: 'create' },
  // Automation permissions (Phase 16) — required by the automation controllers
  { name: 'automation:read', description: 'Read automation workflows', resource: 'automation', action: 'read' },
  { name: 'automation:create', description: 'Create automation workflows', resource: 'automation', action: 'create' },
  { name: 'automation:update', description: 'Update automation workflows', resource: 'automation', action: 'update' },
  { name: 'automation:delete', description: 'Delete automation workflows', resource: 'automation', action: 'delete' },
  { name: 'automation:publish', description: 'Publish automation workflows', resource: 'automation', action: 'publish' },
  { name: 'automation:pause', description: 'Pause automation workflows', resource: 'automation', action: 'pause' },
  { name: 'automation:execute', description: 'Execute automation workflows', resource: 'automation', action: 'execute' },
  { name: 'automation:execution:read', description: 'Read automation executions', resource: 'automation.execution', action: 'read' },
  { name: 'automation:execution:retry', description: 'Retry automation executions', resource: 'automation.execution', action: 'retry' },
  { name: 'automation:execution:cancel', description: 'Cancel automation executions', resource: 'automation.execution', action: 'cancel' },
  // AI permissions (Phase 17-18) — required by the AI controllers
  { name: 'ai:read', description: 'Read AI runtime status and models', resource: 'ai', action: 'read' },
  { name: 'ai:admin', description: 'Administer AI runtime configuration', resource: 'ai', action: 'admin' },
  { name: 'ai:chat', description: 'Use AI chat and command center', resource: 'ai', action: 'chat' },
  { name: 'ai:tools:use', description: 'Use AI tools', resource: 'ai.tools', action: 'use' },
  { name: 'ai:insights:read', description: 'Read AI insights', resource: 'ai.insights', action: 'read' },
  { name: 'ai:conversation:read', description: 'Read AI conversations', resource: 'ai.conversation', action: 'read' },
  { name: 'ai:conversation:delete', description: 'Delete AI conversations', resource: 'ai.conversation', action: 'delete' },
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

  // HR Manager: employee + attendance + leave + payroll + notifications (read/manage)
  await assignPermissions('hr_manager', [
    'employee:read', 'employee:create', 'employee:update',
    'attendance:read', 'attendance:create', 'attendance:correct', 'attendance:approve', 'attendance:manage',
    'leave:read', 'leave:create', 'leave:submit', 'leave:approve', 'leave:reject', 'leave:cancel', 'leave:manage',
    'leave.balance:read', 'leave.balance:adjust',
    'leave.policy:read', 'leave.policy:manage',
    'leave.type:read', 'leave.type:manage',
    'payroll:read', 'payroll:manage', 'payroll:calculate', 'payroll:finalize',
    'payroll.salary:read', 'payroll.salary:manage',
    'payroll.component:read', 'payroll.component:manage',
    'payroll.adjustment:read', 'payroll.adjustment:create', 'payroll.adjustment:approve',
    'payroll.payslip:read',
    'notification:read', 'notification:manage', 'notification:send',
    'notification:template:read', 'notification:template:create', 'notification:template:update',
    'notification:preference:read', 'notification:preference:update',
    'notification:delivery:read',
    'asset:read', 'asset:create', 'asset:update', 'asset:manage', 'asset:assign', 'asset:transfer', 'asset:retire', 'asset:dispose',
    'asset.category:read', 'asset.category:create', 'asset.category:update',
    'asset.location:read', 'asset.location:create', 'asset.location:update',
    'asset.maintenance:read', 'asset.maintenance:create', 'asset.maintenance:update',
    'asset.inspection:read', 'asset.inspection:create', 'asset.inspection:update',
    'asset.warranty:read', 'asset.warranty:create', 'asset.warranty:update',
    'asset.depreciation:read', 'asset.depreciation:calculate',
    'analytics:read', 'analytics:dashboard:read', 'analytics:report:read', 'analytics:report:create', 'analytics:report:update',
    'analytics:export', 'analytics:finance:read', 'analytics:workforce:read', 'analytics:attendance:read',
    'analytics:leave:read', 'analytics:payroll:read', 'analytics:crm:read', 'analytics:project:read', 'analytics:asset:read',
  ]);

  // Finance Manager: finance + payroll
  await assignPermissions('finance_manager', [
    'finance:read', 'finance:manage',
    'payroll:read', 'payroll:approve', 'payroll:finalize',
    'payroll.salary:read',
    'payroll.component:read',
    'payroll.adjustment:read', 'payroll.adjustment:approve',
    'payroll.payslip:read',
  ]);

  // CRM Manager: CRM
  await assignPermissions('crm_manager', [
    'crm:read', 'crm:manage',
  ]);

  // Team Manager: employee read
  await assignPermissions('team_manager', [
    'employee:read',
  ]);  // Employee: self-service (read own attendance + clock in/out + leave self-service + notifications)
  await assignPermissions('employee', [
    'employee:read', 'attendance:read', 'attendance:create',
    'leave:read', 'leave:create', 'leave:submit', 'leave:cancel',
    'leave.balance:read',
    'notification:read', 'notification:preference:read', 'notification:preference:update',
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
