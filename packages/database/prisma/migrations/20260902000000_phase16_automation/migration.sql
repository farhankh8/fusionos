-- CreateEnum
CREATE TYPE "AutomationWorkflowStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutomationVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AutomationStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AutomationApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('DOMAIN_EVENT');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('SEND_NOTIFICATION', 'CREATE_TASK', 'REQUEST_APPROVAL', 'UPDATE_ENTITY', 'CREATE_AUDIT_EVENT');

-- CreateTable
CREATE TABLE "automation_workflows" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1000),
    "status" "AutomationWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflow_versions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "AutomationVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "triggerConfig" JSONB NOT NULL,
    "conditionConfig" JSONB,
    "actionsConfig" JSONB NOT NULL,
    "validationErrors" JSONB,
    "publishedById" UUID,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "workflowVersionId" UUID NOT NULL,
    "triggerEventId" UUID,
    "triggerEventType" VARCHAR(255) NOT NULL,
    "triggerEntityType" VARCHAR(100),
    "triggerEntityId" UUID,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "error" TEXT,
    "correlationId" VARCHAR(255),
    "actorId" UUID,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_step_executions" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "executionId" UUID NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "actionType" "AutomationActionType" NOT NULL,
    "actionConfig" JSONB NOT NULL,
    "status" "AutomationStepStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "error" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "idempotencyKey" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_approvals" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "executionId" UUID,
    "stepExecutionId" UUID,
    "requestedById" UUID NOT NULL,
    "approverUserId" UUID NOT NULL,
    "entityType" VARCHAR(100),
    "entityId" UUID,
    "status" "AutomationApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(1000),
    "decisionAt" TIMESTAMP(3),
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "automation_workflows_tenantId_name_key" ON "automation_workflows"("tenantId", "name");

-- CreateIndex
CREATE INDEX "automation_workflows_tenantId_idx" ON "automation_workflows"("tenantId");

-- CreateIndex
CREATE INDEX "automation_workflows_tenantId_status_idx" ON "automation_workflows"("tenantId", "status");

-- CreateIndex
CREATE INDEX "automation_workflows_tenantId_createdById_idx" ON "automation_workflows"("tenantId", "createdById");

-- CreateIndex
CREATE INDEX "automation_workflows_tenantId_createdAt_idx" ON "automation_workflows"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "automation_workflows_companyId_idx" ON "automation_workflows"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_workflow_versions_workflowId_versionNumber_key" ON "automation_workflow_versions"("workflowId", "versionNumber");

-- CreateIndex
CREATE INDEX "automation_workflow_versions_tenantId_idx" ON "automation_workflow_versions"("tenantId");

-- CreateIndex
CREATE INDEX "automation_workflow_versions_workflowId_idx" ON "automation_workflow_versions"("workflowId");

-- CreateIndex
CREATE INDEX "automation_workflow_versions_tenantId_status_idx" ON "automation_workflow_versions"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_tenantId_workflowVersionId_triggerEventId_key" ON "automation_executions"("tenantId", "workflowVersionId", "triggerEventId");

-- CreateIndex
CREATE INDEX "automation_executions_tenantId_idx" ON "automation_executions"("tenantId");

-- CreateIndex
CREATE INDEX "automation_executions_workflowId_idx" ON "automation_executions"("workflowId");

-- CreateIndex
CREATE INDEX "automation_executions_workflowVersionId_idx" ON "automation_executions"("workflowVersionId");

-- CreateIndex
CREATE INDEX "automation_executions_tenantId_status_idx" ON "automation_executions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "automation_executions_tenantId_workflowId_idx" ON "automation_executions"("tenantId", "workflowId");

-- CreateIndex
CREATE INDEX "automation_executions_tenantId_createdAt_idx" ON "automation_executions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "automation_executions_status_nextRetryAt_idx" ON "automation_executions"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "automation_executions_triggerEventId_idx" ON "automation_executions"("triggerEventId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_step_executions_executionId_stepNumber_key" ON "automation_step_executions"("executionId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "automation_step_executions_tenantId_idempotencyKey_key" ON "automation_step_executions"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "automation_step_executions_tenantId_idx" ON "automation_step_executions"("tenantId");

-- CreateIndex
CREATE INDEX "automation_step_executions_executionId_idx" ON "automation_step_executions"("executionId");

-- CreateIndex
CREATE INDEX "automation_step_executions_tenantId_executionId_idx" ON "automation_step_executions"("tenantId", "executionId");

-- CreateIndex
CREATE INDEX "automation_step_executions_status_idx" ON "automation_step_executions"("status");

-- CreateIndex
CREATE INDEX "automation_approvals_tenantId_idx" ON "automation_approvals"("tenantId");

-- CreateIndex
CREATE INDEX "automation_approvals_workflowId_idx" ON "automation_approvals"("workflowId");

-- CreateIndex
CREATE INDEX "automation_approvals_executionId_idx" ON "automation_approvals"("executionId");

-- CreateIndex
CREATE INDEX "automation_approvals_approverUserId_idx" ON "automation_approvals"("approverUserId");

-- CreateIndex
CREATE INDEX "automation_approvals_tenantId_status_idx" ON "automation_approvals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "automation_approvals_tenantId_approverUserId_idx" ON "automation_approvals"("tenantId", "approverUserId");

-- CreateIndex
CREATE INDEX "automation_approvals_approverUserId_status_idx" ON "automation_approvals"("approverUserId", "status");

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "automation_workflow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflow_versions" ADD CONSTRAINT "automation_workflow_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflow_versions" ADD CONSTRAINT "automation_workflow_versions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflow_versions" ADD CONSTRAINT "automation_workflow_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_workflowVersionId_fkey" FOREIGN KEY ("workflowVersionId") REFERENCES "automation_workflow_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_step_executions" ADD CONSTRAINT "automation_step_executions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_step_executions" ADD CONSTRAINT "automation_step_executions_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_approvals" ADD CONSTRAINT "automation_approvals_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
