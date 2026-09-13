-- Phase 18: AI Agent Platform
-- Creates: AIAgent, AIAgentVersion, AIAgentTask, AIAgentStep, AIAgentMemory
-- Generated from the canonical Prisma datamodel (camelCase columns as Prisma emits
-- them); verified with `prisma migrate diff` so the deployed schema matches the
-- schema.prisma exactly.

-- Enums
CREATE TYPE "AIAgentType" AS ENUM ('HR', 'FINANCE', 'CRM', 'PROJECTS', 'OPERATIONS');
CREATE TYPE "AIAgentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "AIAgentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SUPERSEDED');
CREATE TYPE "AIAgentTaskStatus" AS ENUM ('PENDING', 'ANALYZING', 'PLANNING', 'WAITING_APPROVAL', 'EXECUTING', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "AIAgentStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');
CREATE TYPE "AIAgentRiskLevel" AS ENUM ('READ_ONLY', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AIAgentApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- Agent definitions
CREATE TABLE "ai_agents" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "agentType" "AIAgentType" NOT NULL,
    "status" "AIAgentStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "createdById" UUID NOT NULL,
    "currentVersionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_agents_tenantId_idx" ON "ai_agents"("tenantId");
CREATE INDEX "ai_agents_companyId_idx" ON "ai_agents"("companyId");
CREATE INDEX "ai_agents_tenantId_status_idx" ON "ai_agents"("tenantId", "status");
CREATE INDEX "ai_agents_createdById_idx" ON "ai_agents"("createdById");
CREATE UNIQUE INDEX "ai_agents_tenantId_name_key" ON "ai_agents"("tenantId", "name");

-- Agent versions
CREATE TABLE "ai_agent_versions" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "AIAgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB NOT NULL,
    "publishedById" UUID,
    "publishedAt" TIMESTAMP(3),
    "validationErrors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_versions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_agent_versions_agentId_idx" ON "ai_agent_versions"("agentId");
CREATE INDEX "ai_agent_versions_tenantId_idx" ON "ai_agent_versions"("tenantId");
CREATE INDEX "ai_agent_versions_status_idx" ON "ai_agent_versions"("status");
CREATE UNIQUE INDEX "ai_agent_versions_agentId_versionNumber_key" ON "ai_agent_versions"("agentId", "versionNumber");

-- Agent tasks
CREATE TABLE "ai_agent_tasks" (
    "id" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "agentVersionId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "AIAgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "plan" JSONB,
    "riskAssessment" JSONB,
    "result" JSONB,
    "error" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "toolCallCount" INTEGER NOT NULL DEFAULT 0,
    "maxToolCalls" INTEGER NOT NULL DEFAULT 10,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "correlationId" UUID,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_agent_tasks_agentId_idx" ON "ai_agent_tasks"("agentId");
CREATE INDEX "ai_agent_tasks_agentVersionId_idx" ON "ai_agent_tasks"("agentVersionId");
CREATE INDEX "ai_agent_tasks_tenantId_idx" ON "ai_agent_tasks"("tenantId");
CREATE INDEX "ai_agent_tasks_tenantId_status_idx" ON "ai_agent_tasks"("tenantId", "status");
CREATE INDEX "ai_agent_tasks_userId_idx" ON "ai_agent_tasks"("userId");
CREATE INDEX "ai_agent_tasks_status_idx" ON "ai_agent_tasks"("status");
CREATE INDEX "ai_agent_tasks_createdAt_idx" ON "ai_agent_tasks"("createdAt");
CREATE UNIQUE INDEX "ai_agent_tasks_tenantId_agentVersionId_goal_key" ON "ai_agent_tasks"("tenantId", "agentVersionId", "goal");

-- Agent steps
CREATE TABLE "ai_agent_steps" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "toolName" VARCHAR(100) NOT NULL,
    "purpose" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "status" "AIAgentStepStatus" NOT NULL DEFAULT 'PENDING',
    "riskLevel" "AIAgentRiskLevel" NOT NULL DEFAULT 'READ_ONLY',
    "approvalStatus" "AIAgentApprovalStatus",
    "error" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_agent_steps_taskId_idx" ON "ai_agent_steps"("taskId");
CREATE INDEX "ai_agent_steps_tenantId_idx" ON "ai_agent_steps"("tenantId");
CREATE INDEX "ai_agent_steps_status_idx" ON "ai_agent_steps"("status");
CREATE UNIQUE INDEX "ai_agent_steps_taskId_stepNumber_key" ON "ai_agent_steps"("taskId", "stepNumber");
CREATE UNIQUE INDEX "ai_agent_steps_tenantId_idempotencyKey_key" ON "ai_agent_steps"("tenantId", "idempotencyKey");

-- Agent memories
CREATE TABLE "ai_agent_memories" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "agentId" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_memories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_agent_memories_taskId_idx" ON "ai_agent_memories"("taskId");
CREATE INDEX "ai_agent_memories_tenantId_idx" ON "ai_agent_memories"("tenantId");
CREATE INDEX "ai_agent_memories_agentId_idx" ON "ai_agent_memories"("agentId");
CREATE INDEX "ai_agent_memories_tenantId_agentId_idx" ON "ai_agent_memories"("tenantId", "agentId");
CREATE INDEX "ai_agent_memories_expiresAt_idx" ON "ai_agent_memories"("expiresAt");

-- Foreign keys (agents <-> versions is circular, so constraints are added last)
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_agent_versions" ADD CONSTRAINT "ai_agent_versions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_versions" ADD CONSTRAINT "ai_agent_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_versions" ADD CONSTRAINT "ai_agent_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_agent_tasks" ADD CONSTRAINT "ai_agent_tasks_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ai_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_tasks" ADD CONSTRAINT "ai_agent_tasks_agentVersionId_fkey" FOREIGN KEY ("agentVersionId") REFERENCES "ai_agent_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_tasks" ADD CONSTRAINT "ai_agent_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_tasks" ADD CONSTRAINT "ai_agent_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_steps" ADD CONSTRAINT "ai_agent_steps_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ai_agent_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_steps" ADD CONSTRAINT "ai_agent_steps_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_memories" ADD CONSTRAINT "ai_agent_memories_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ai_agent_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_agent_memories" ADD CONSTRAINT "ai_agent_memories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;