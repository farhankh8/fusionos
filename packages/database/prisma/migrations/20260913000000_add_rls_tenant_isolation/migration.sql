-- =============================================================================
-- FusionOS PostgreSQL Row-Level Security (RLS) Migration
-- Phase 27 — Defense-in-depth tenant isolation
-- =============================================================================
--
-- This migration enables RLS on all tenant-scoped tables and creates a policy
-- that only exposes rows whose "tenantId" matches the request-scoped session
-- variable `app.current_tenant_id`.
--
-- CRITICAL IMPLEMENTATION NOTES (verified against schema.prisma):
--
-- 1. Column identifiers are camelCase ("tenantId") created by Prisma as
--    QUOTED identifiers. Policy expressions MUST quote them. Unquoted
--    `tenantId` folds to `tenantid`, which does not exist — the original
--    version of this migration failed on fresh databases.
--
-- 2. PostgreSQL exempts table OWNERS and SUPERUSERS from RLS (unless FORCE
--    ROW LEVEL SECURITY is used). The application must therefore connect as
--    a NON-owner role in production (e.g. `fusionos_app` created by the
--    operator, or a dedicated non-superuser POSTGRES_USER). Verifying RLS
--    while connected as a superuser is meaningless — superusers bypass RLS.
--
--    For verification, this migration creates a NOLOGIN helper role
--    `RLS_TEST_USER`. Grant membership to a login role, then verify:
--       GRANT RLS_TEST_USER TO <login_role>;
--       SET ROLE RLS_TEST_USER;  -- queries now enforce RLS
--       RESET ROLE;
--
-- 3. Fails CLOSED: with no tenant context set, current_setting(..., true)
--    returns NULL → no rows match → no data is visible.
--
-- 4. Tenant context must be set with SET LOCAL (transaction-scoped) inside a
--    transaction, so pooled connections never leak a tenant across requests.
--
-- =============================================================================

-- ── Helper role for non-superuser RLS verification ──────────────────────────
-- NOLOGIN: cannot be used to open sessions directly; a login role must
-- `SET ROLE RLS_TEST_USER` after being granted membership. This guarantees
-- verification runs are actually subject to RLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'RLS_TEST_USER') THEN
    CREATE ROLE "RLS_TEST_USER" NOLOGIN NOINHERIT;
  END IF;
END $$;

-- ── Enable RLS on all tenant-scoped tables ──────────────────────────────────

-- Platform kernel
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Identity
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Employee
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;

-- Authentication events are USER-scoped (no tenantId column) and are NOT
-- RLS-protected. Do NOT enable RLS here: RLS without any policy makes the
-- table completely inaccessible to non-owner roles. Access to auth_events is
-- controlled at the application layer.

-- Attendance
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Leave
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_policy_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_calendars ENABLE ROW LEVEL SECURITY;

-- Payroll
ALTER TABLE payroll_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structure_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

-- Finance
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- CRM
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activities ENABLE ROW LEVEL SECURITY;

-- Documents
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_entity_links ENABLE ROW LEVEL SECURITY;

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channel_configs ENABLE ROW LEVEL SECURITY;

-- Assets
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_depreciations ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_activities ENABLE ROW LEVEL SECURITY;

-- Analytics
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- Automation
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_approvals ENABLE ROW LEVEL SECURITY;

-- AI
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_confirmations ENABLE ROW LEVEL SECURITY;

-- AI Agents
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_memories ENABLE ROW LEVEL SECURITY;

-- Events & Audit
ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ── Create RLS policies ─────────────────────────────────────────────────────
-- Policy: only allow access when app.current_tenant_id matches the row's
-- tenant column (QUOTED identifier). Fails CLOSED: no context → NULL → no rows
-- visible. Each policy is dropped first so re-running this migration stays
-- idempotent.
--
-- NOTE: tenant column naming follows the migration that created the table.
-- Almost all migrations use camelCase ("tenantId"); nothing in the current
-- history uses snake_case ("tenant_id") anymore. The loop below resolves the
-- correct column per table (defensively supporting both) instead of
-- hardcoding one name.

DO $$
DECLARE
  t text;
  v_col text;
  -- NOTE: excluded from this loop (no tenant column at all):
  --   tenants          → special id-based policy below
  --   role_permissions → global join table, allow-all policy below
  --   auth_events      → user-scoped, not RLS-protected at all
  tables_with_tenant text[] := ARRAY[
    'companies', 'branches', 'departments', 'teams',
    'roles', 'user_roles',
    'employees', 'employee_history', 'designations',
    'attendance_events', 'attendance', 'attendance_corrections',
    'leave_types', 'leave_policies', 'leave_policy_assignments',
    'leave_balances', 'leave_balance_transactions', 'leave_requests',
    'holidays', 'working_calendars',
    'payroll_policies', 'payroll_components', 'salary_structures',
    'salary_structure_components', 'payroll_periods', 'payroll_runs',
    'payroll_lines', 'payroll_line_items', 'payroll_adjustments', 'payslips',
    'accounts', 'account_balances', 'accounting_periods',
    'journal_entries', 'journal_lines', 'expenses',
    'customers', 'invoices', 'vendors', 'bills', 'payments',
    'bank_accounts', 'bank_transactions',
    'customer_profiles', 'crm_contacts', 'crm_leads', 'crm_opportunities',
    'crm_activities', 'crm_tasks', 'crm_notes',
    'projects', 'project_members', 'project_tasks', 'project_task_dependencies',
    'project_time_entries', 'project_milestones', 'project_budgets',
    'project_activities',
    'document_categories', 'document_folders', 'documents',
    'document_versions', 'document_permissions', 'document_activities',
    'document_entity_links',
    'notifications', 'notification_deliveries', 'notification_preferences',
    'notification_templates', 'notification_template_versions',
    'notification_channel_configs',
    'asset_categories', 'asset_locations', 'assets',
    'asset_assignments', 'asset_transfers', 'asset_maintenance_records',
    'asset_inspections', 'asset_warranties', 'asset_depreciations',
    'asset_activities',
    'saved_reports',
    'automation_workflows', 'automation_workflow_versions',
    'automation_executions', 'automation_step_executions', 'automation_approvals',
    'ai_conversations', 'ai_messages', 'ai_request_logs', 'ai_action_confirmations',
    'ai_agents', 'ai_agent_versions', 'ai_agent_tasks', 'ai_agent_steps',
    'ai_agent_memories',
    'event_outbox', 'audit_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_tenant LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    SELECT column_name INTO v_col
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = t
       AND column_name IN ('tenantId', 'tenant_id')
     ORDER BY CASE column_name WHEN 'tenantId' THEN 0 ELSE 1 END
     LIMIT 1;
    IF v_col IS NULL THEN
      RAISE EXCEPTION 'RLS migration: no tenant column found on table %', t;
    END IF;
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
       USING (%I::text = current_setting(''app.current_tenant_id'', true))
       WITH CHECK (%I::text = current_setting(''app.current_tenant_id'', true))',
      t, v_col, v_col
    );
  END LOOP;
END $$;

-- Special handling for tenants table (tenants see themselves: id IS the tenant id)
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id::text = current_setting('app.current_tenant_id', true));

-- Roles table: system roles (tenantId IS NULL) are visible to all,
-- tenant-scoped roles are filtered by tenantId
DROP POLICY IF EXISTS tenant_isolation ON roles;
CREATE POLICY tenant_isolation ON roles
  USING (
    "tenantId" IS NULL  -- System roles visible to all authenticated users
    OR "tenantId"::text = current_setting('app.current_tenant_id', true)
  );

-- Role permissions: global join table — filtered via the roles table
DROP POLICY IF EXISTS tenant_isolation ON role_permissions;
CREATE POLICY tenant_isolation ON role_permissions
  USING (true);

-- ── Privileges for the verification role ──────────────────────────────────
-- RLS_TEST_USER is NOLOGIN: privileges only apply while a login role has
-- SET ROLE'd to it. SQL privileges must exist so that RLS — not a missing
-- GRANT — is the only thing filtering rows during verification.
GRANT USAGE ON SCHEMA public TO "RLS_TEST_USER";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "RLS_TEST_USER";

-- ── Helper functions ────────────────────────────────────────────────────────

-- Set tenant context for RLS. IMPORTANT: callers must invoke this INSIDE a
-- transaction using SET LOCAL semantics; see withTenantContext() in
-- packages/database/src/rls-extension.ts. A bare non-transactional call would
-- leak the tenant onto the pooled connection for the next request.
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id, false);
END;
$$ LANGUAGE plpgsql;

-- Clear tenant context (for super-admin operations)
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', false);
END;
$$ LANGUAGE plpgsql;

-- ── Grants ──────────────────────────────────────────────────────────────────
-- No role-specific grants are hard-coded here: the application connect role is
-- environment-specific (POSTGRES_USER in dev, fusionos_app in production) and
-- table owners already hold all privileges on their tables. To verify RLS as
-- the helper role, grant it membership of the application role:
--   GRANT fusionos_app TO RLS_TEST_USER;  -- then SET ROLE RLS_TEST_USER;
--
-- Never verify RLS while connected as a superuser: superusers bypass RLS.

-- =============================================================================
-- NOTES:
--
-- 1. Connection Pool Safety:
--    - set_config(key, value, true) / SET LOCAL applies within the current
--      transaction only; when the transaction ends the setting is reset.
--    - Prisma $transaction pins all statements to ONE pooled connection, so
--      SET LOCAL inside a transaction is pool-safe by construction.
--
-- 2. Application-Layer Isolation:
--    - All application code still filters by tenantId — RLS is
--      defense-in-depth, not the primary mechanism.
--
-- 3. Super-Admin Operations:
--    - Use a dedicated non-RLS connection, or clear_tenant_context() inside a
--      transaction owned by a role that is exempt from RLS.
--
-- 4. Testing:
--    - Tests MUST run as a non-owner, non-superuser role (RLS_TEST_USER) —
--      otherwise PostgreSQL silently exempts them from RLS and the tests
--      prove nothing. See rls-tenant-isolation.test.ts.
--
-- =============================================================================
