-- Reconcile schema to canonical Prisma datamodel (audited, Phase 27).
-- Closes the remaining intentional deviations between the applied migration
-- history and packages/database/prisma/schema.prisma. Generated from
--   prisma migrate diff --from-url <db> --to-schema-datamodel schema.prisma
-- and reviewed statement-by-statement. All changes are benign and safe on an
-- empty/fresh database; none alters security or data semantics:
--
--   * project_activities: employeeId is nullable in canonical (FK ON DELETE
--     SET NULL); the phase-11 migration created it NOT NULL with CASCADE.
--   * Drop 5 extra indexes that the handwritten phase-10 CRM migration added
--     but canonical does not define.
--   * asset_* / notification_* columns created TIMESTAMP(6) by handwritten
--     migrations; canonical is TIMESTAMP(3) (matches other modules).
--   * asset_categories.defaultDepreciationMethod default reset to canonical.
--   * id DROP DEFAULT: Prisma @default(uuid()) is client-side; the DB-level
--     DEFAULT gen_random_uuid() added by early migrations is not in canonical.
--   * Create 3 unique indexes present in canonical but missing from the
--     migrations that created their tables.
--   * Add 2 FKs present in canonical but missing from the source migrations.
--   * RenameIndex: PostgreSQL truncates identifiers over 63 chars; Prisma
--     computed the truncated "_key" names, so the deployed indexes are renamed
--     to match Prisma's expectation exactly.

-- DropForeignKey
ALTER TABLE "project_activities" DROP CONSTRAINT "project_activities_employeeId_fkey";

-- DropIndex
DROP INDEX "crm_activities_contactId_idx";

-- DropIndex
DROP INDEX "crm_activities_leadId_idx";

-- DropIndex
DROP INDEX "crm_activities_opportunityId_idx";

-- DropIndex
DROP INDEX "customer_profiles_customerId_idx";

-- DropIndex
DROP INDEX "customer_profiles_customerType_idx";

-- AlterTable
ALTER TABLE "asset_activities" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_assignments" ALTER COLUMN "assignedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "returnedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_categories" ALTER COLUMN "defaultDepreciationMethod" SET DEFAULT 'STRAIGHT_LINE',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_depreciations" ALTER COLUMN "calculatedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_inspections" ALTER COLUMN "completedDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_locations" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_maintenance_records" ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_transfers" ALTER COLUMN "transferDate" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "asset_warranties" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "assets" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_activities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_contacts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_leads" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_notes" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_opportunities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm_tasks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customer_profiles" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_activities" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_categories" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_entity_links" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_folders" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_permissions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "document_versions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "holidays" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_balance_transactions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_balances" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_policies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_policy_assignments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "leave_types" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notification_channel_configs" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notification_deliveries" ALTER COLUMN "lastAttemptAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "deliveredAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "failedAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notification_preferences" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notification_template_versions" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notification_templates" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "readAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project_activities" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "employeeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "project_budgets" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_members" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_milestones" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_task_dependencies" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_tasks" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_time_entries" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "working_calendars" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "asset_assignments_assetId_employeeId_status_key" ON "asset_assignments"("assetId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profiles_customerId_key" ON "customer_profiles"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "project_budgets_projectId_key" ON "project_budgets"("projectId");

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "automation_executions_tenantId_workflowVersionId_triggerEventId" RENAME TO "automation_executions_tenantId_workflowVersionId_triggerEve_key";

-- RenameIndex
ALTER INDEX "document_entity_links_tenantId_documentId_entityType_entityId_k" RENAME TO "document_entity_links_tenantId_documentId_entityType_entity_key";

-- RenameIndex
ALTER INDEX "notification_preferences_tenantId_userId_notificationType_chann" RENAME TO "notification_preferences_tenantId_userId_notificationType_c_key";

-- RenameIndex
ALTER INDEX "notification_templates_tenantId_notificationType_channel_versio" RENAME TO "notification_templates_tenantId_notificationType_channel_ve_key";