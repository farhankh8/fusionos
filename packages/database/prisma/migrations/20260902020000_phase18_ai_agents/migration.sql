-- Phase 18: AI Agent Platform
-- Creates: AIAgent, AIAgentVersion, AIAgentTask, AIAgentStep, AIAgentMemory

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
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "company_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "agent_type" "AIAgentType" NOT NULL,
    "status" "AIAgentStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID NOT NULL,
    "current_version_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_agents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL,
    CONSTRAINT "ai_agents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agents_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL,
    CONSTRAINT "ai_agents_tenant_id_name_key" UNIQUE ("tenant_id", "name")
);

CREATE INDEX "ai_agents_tenant_id_idx" ON "ai_agents"("tenant_id");
CREATE INDEX "ai_agents_company_id_idx" ON "ai_agents"("company_id");
CREATE INDEX "ai_agents_tenant_id_status_idx" ON "ai_agents"("tenant_id", "status");
CREATE INDEX "ai_agents_created_by_id_idx" ON "ai_agents"("created_by_id");

-- Agent versions
CREATE TABLE "ai_agent_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "AIAgentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "configuration" JSONB NOT NULL,
    "published_by_id" UUID,
    "published_at" TIMESTAMP(3),
    "validation_errors" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_agent_versions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "ai_agent_versions_agent_id_version_number_key" UNIQUE ("agent_id", "version_number")
);

CREATE INDEX "ai_agent_versions_agent_id_idx" ON "ai_agent_versions"("agent_id");
CREATE INDEX "ai_agent_versions_tenant_id_idx" ON "ai_agent_versions"("tenant_id");
CREATE INDEX "ai_agent_versions_status_idx" ON "ai_agent_versions"("status");

-- Now add FK from agents to versions (since versions table now exists)
ALTER TABLE "ai_agents" ADD CONSTRAINT "ai_agents_current_version_id_fkey"
    FOREIGN KEY ("current_version_id") REFERENCES "ai_agent_versions"("id") ON DELETE SET NULL;

-- Agent tasks
CREATE TABLE "ai_agent_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "agent_version_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "AIAgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "plan" JSONB,
    "risk_assessment" JSONB,
    "result" JSONB,
    "error" TEXT,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL DEFAULT 0,
    "tool_call_count" INTEGER NOT NULL DEFAULT 0,
    "max_tool_calls" INTEGER NOT NULL DEFAULT 10,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "correlation_id" UUID,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_agent_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_agent_tasks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_tasks_agent_version_id_fkey" FOREIGN KEY ("agent_version_id") REFERENCES "ai_agent_versions"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_tasks_tenant_id_agent_version_id_goal_key" UNIQUE ("tenant_id", "agent_version_id", "goal")
);

CREATE INDEX "ai_agent_tasks_agent_id_idx" ON "ai_agent_tasks"("agent_id");
CREATE INDEX "ai_agent_tasks_agent_version_id_idx" ON "ai_agent_tasks"("agent_version_id");
CREATE INDEX "ai_agent_tasks_tenant_id_idx" ON "ai_agent_tasks"("tenant_id");
CREATE INDEX "ai_agent_tasks_tenant_id_status_idx" ON "ai_agent_tasks"("tenant_id", "status");
CREATE INDEX "ai_agent_tasks_user_id_idx" ON "ai_agent_tasks"("user_id");
CREATE INDEX "ai_agent_tasks_status_idx" ON "ai_agent_tasks"("status");
CREATE INDEX "ai_agent_tasks_created_at_idx" ON "ai_agent_tasks"("created_at");

-- Agent steps
CREATE TABLE "ai_agent_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "tool_name" VARCHAR(100) NOT NULL,
    "purpose" TEXT NOT NULL,
    "input" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "status" "AIAgentStepStatus" NOT NULL DEFAULT 'PENDING',
    "risk_level" "AIAgentRiskLevel" NOT NULL DEFAULT 'READ_ONLY',
    "approval_status" "AIAgentApprovalStatus",
    "error" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 1,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "duration" INTEGER,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_agent_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "ai_agent_tasks"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_steps_task_id_step_number_key" UNIQUE ("task_id", "step_number"),
    CONSTRAINT "ai_agent_steps_tenant_id_idempotency_key_key" UNIQUE ("tenant_id", "idempotency_key")
);

CREATE INDEX "ai_agent_steps_task_id_idx" ON "ai_agent_steps"("task_id");
CREATE INDEX "ai_agent_steps_tenant_id_idx" ON "ai_agent_steps"("tenant_id");
CREATE INDEX "ai_agent_steps_status_idx" ON "ai_agent_steps"("status");

-- Agent memories
CREATE TABLE "ai_agent_memories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "retention_days" INTEGER NOT NULL DEFAULT 30,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_agent_memories_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_agent_memories_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "ai_agent_tasks"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_memories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "ai_agent_memories_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "ai_agents"("id") ON DELETE CASCADE
);

CREATE INDEX "ai_agent_memories_task_id_idx" ON "ai_agent_memories"("task_id");
CREATE INDEX "ai_agent_memories_tenant_id_idx" ON "ai_agent_memories"("tenant_id");
CREATE INDEX "ai_agent_memories_agent_id_idx" ON "ai_agent_memories"("agent_id");
CREATE INDEX "ai_agent_memories_tenant_id_agent_id_idx" ON "ai_agent_memories"("tenant_id", "agent_id");
CREATE INDEX "ai_agent_memories_expires_at_idx" ON "ai_agent_memories"("expires_at");
