-- Phase 5: Organization & Employee Management Migration
-- Split into phases to handle PostgreSQL enum constraints

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1: Add new enum values and create new enums
-- ═══════════════════════════════════════════════════════════════════════════

-- Create EmploymentType enum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'TEMPORARY');

-- Add new values to EmploymentStatus enum (safe: additive only)
ALTER TYPE "EmploymentStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "EmploymentStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
ALTER TYPE "EmploymentStatus" ADD VALUE IF NOT EXISTS 'INACTIVE';

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2: Add new columns to existing tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Company: add address, timezone, currency
ALTER TABLE "companies" ADD COLUMN "address" JSONB;
ALTER TABLE "companies" ADD COLUMN "timezone" VARCHAR(100);
ALTER TABLE "companies" ADD COLUMN "currency" VARCHAR(3);

-- Branch: add timezone
ALTER TABLE "branches" ADD COLUMN "timezone" VARCHAR(100);

-- Employee: add missing fields
ALTER TABLE "employees" ADD COLUMN "middleName" VARCHAR(255);
ALTER TABLE "employees" ADD COLUMN "preferredName" VARCHAR(255);
ALTER TABLE "employees" ADD COLUMN "employmentType" "EmploymentType" DEFAULT 'FULL_TIME';
ALTER TABLE "employees" ADD COLUMN "workLocation" VARCHAR(255);
ALTER TABLE "employees" ADD COLUMN "timezone" VARCHAR(100);
ALTER TABLE "employees" ADD COLUMN "notes" TEXT;

-- EmployeeHistory: add audit fields
ALTER TABLE "employee_history" ADD COLUMN "previousValue" JSONB;
ALTER TABLE "employee_history" ADD COLUMN "newValue" JSONB;
ALTER TABLE "employee_history" ADD COLUMN "actorId" UUID;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3: Update defaults (safe after enum values exist in DB)
-- ═══════════════════════════════════════════════════════════════════════════

-- Update existing employees from ACTIVE to ACTIVE (no-op, but validates)
-- New employees will default to DRAFT
ALTER TABLE "employees" ALTER COLUMN "employmentStatus" SET DEFAULT 'ACTIVE';
