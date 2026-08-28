-- Phase 7: Leave Management

-- Create Enums
CREATE TYPE "LeaveTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "LeaveRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "LeaveRequestUnit" AS ENUM ('FULL_DAY', 'HALF_DAY', 'HOURS');
CREATE TYPE "LeaveBalanceTransactionType" AS ENUM ('OPENING', 'ACCRUAL', 'CONSUMPTION', 'REVERSAL', 'CARRY_FORWARD', 'ADJUSTMENT', 'EXPIRY');
CREATE TYPE "AccrualFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME');

-- Create LeaveType table
CREATE TABLE "leave_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" VARCHAR(500),
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "status" "LeaveTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "allowHalfDay" BOOLEAN NOT NULL DEFAULT true,
    "allowHourly" BOOLEAN NOT NULL DEFAULT false,
    "maxAccrualDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leave_types_tenantId_code_key" UNIQUE ("tenantId", "code")
);
CREATE INDEX "leave_types_tenantId_idx" ON "leave_types"("tenantId");
CREATE INDEX "leave_types_companyId_idx" ON "leave_types"("companyId");

-- Create LeavePolicy table
CREATE TABLE "leave_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "entitlementDays" INTEGER NOT NULL DEFAULT 0,
    "accrualFrequency" "AccrualFrequency" NOT NULL DEFAULT 'YEARLY',
    "accrualAmount" INTEGER NOT NULL DEFAULT 0,
    "carryForward" BOOLEAN NOT NULL DEFAULT false,
    "carryForwardLimit" INTEGER,
    "minNoticeDays" INTEGER NOT NULL DEFAULT 0,
    "maxConsecutiveDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leave_policies_tenantId_leaveTypeId_name_key" UNIQUE ("tenantId", "leaveTypeId", "name")
);
CREATE INDEX "leave_policies_tenantId_idx" ON "leave_policies"("tenantId");
CREATE INDEX "leave_policies_leaveTypeId_idx" ON "leave_policies"("leaveTypeId");

-- Create LeavePolicyAssignment table
CREATE TABLE "leave_policy_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_policy_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leave_policy_assignments_policyId_employeeId_key" UNIQUE ("policyId", "employeeId")
);
CREATE INDEX "leave_policy_assignments_tenantId_idx" ON "leave_policy_assignments"("tenantId");
CREATE INDEX "leave_policy_assignments_employeeId_idx" ON "leave_policy_assignments"("employeeId");
CREATE INDEX "leave_policy_assignments_policyId_idx" ON "leave_policy_assignments"("policyId");

-- Create LeaveBalance table
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "policyId" UUID,
    "year" INTEGER NOT NULL,
    "opening" INTEGER NOT NULL DEFAULT 0,
    "accrued" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "pending" INTEGER NOT NULL DEFAULT 0,
    "adjustments" INTEGER NOT NULL DEFAULT 0,
    "carryForward" INTEGER NOT NULL DEFAULT 0,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leave_balances_tenantId_employeeId_leaveTypeId_year_key" UNIQUE ("tenantId", "employeeId", "leaveTypeId", "year")
);
CREATE INDEX "leave_balances_tenantId_idx" ON "leave_balances"("tenantId");
CREATE INDEX "leave_balances_employeeId_idx" ON "leave_balances"("employeeId");
CREATE INDEX "leave_balances_leaveTypeId_idx" ON "leave_balances"("leaveTypeId");
CREATE INDEX "leave_balances_employeeId_year_idx" ON "leave_balances"("employeeId", "year");

-- Create LeaveBalanceTransaction table
CREATE TABLE "leave_balance_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "balanceId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "transactionType" "LeaveBalanceTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "referenceId" UUID,
    "referenceType" VARCHAR(50),
    "reason" VARCHAR(500),
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_balance_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leave_balance_transactions_tenantId_idx" ON "leave_balance_transactions"("tenantId");
CREATE INDEX "leave_balance_transactions_balanceId_idx" ON "leave_balance_transactions"("balanceId");
CREATE INDEX "leave_balance_transactions_employeeId_idx" ON "leave_balance_transactions"("employeeId");
CREATE INDEX "leave_balance_transactions_referenceId_idx" ON "leave_balance_transactions"("referenceId");

-- Create LeaveRequest table
CREATE TABLE "leave_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "leaveTypeId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "unit" "LeaveRequestUnit" NOT NULL DEFAULT 'FULL_DAY',
    "reason" VARCHAR(1000),
    "attachmentUrl" VARCHAR(500),
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" UUID,
    "rejectionReason" VARCHAR(500),
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" UUID,
    "cancellationReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "leave_requests_tenantId_idx" ON "leave_requests"("tenantId");
CREATE INDEX "leave_requests_employeeId_idx" ON "leave_requests"("employeeId");
CREATE INDEX "leave_requests_leaveTypeId_idx" ON "leave_requests"("leaveTypeId");
CREATE INDEX "leave_requests_tenantId_status_idx" ON "leave_requests"("tenantId", "status");
CREATE INDEX "leave_requests_employeeId_startDate_idx" ON "leave_requests"("employeeId", "startDate");

-- Create Holiday table
CREATE TABLE "holidays" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "branchId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "holidays_tenantId_date_name_key" UNIQUE ("tenantId", "date", "name")
);
CREATE INDEX "holidays_tenantId_idx" ON "holidays"("tenantId");
CREATE INDEX "holidays_companyId_idx" ON "holidays"("companyId");
CREATE INDEX "holidays_date_idx" ON "holidays"("date");

-- Create WorkingCalendar table
CREATE TABLE "working_calendars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "weekendDays" VARCHAR(100) NOT NULL DEFAULT 'SATURDAY,SUNDAY',
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'UTC',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "working_calendars_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "working_calendars_tenantId_name_key" UNIQUE ("tenantId", "name")
);
CREATE INDEX "working_calendars_tenantId_idx" ON "working_calendars"("tenantId");

-- Add foreign key constraints
ALTER TABLE "leave_policies" ADD CONSTRAINT "leave_policies_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_policy_assignments" ADD CONSTRAINT "leave_policy_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "leave_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "leave_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_balance_transactions" ADD CONSTRAINT "leave_balance_transactions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;