-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'OPEN', 'PROCESSING', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'FINALIZED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('PENDING', 'CALCULATING', 'CALCULATED', 'REVIEWING', 'REVIEWED', 'APPROVED', 'FINALIZED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayrollCalculationMode" AS ENUM ('ATTENDANCE', 'MANUAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "PayrollComponentType" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "PayFrequency" AS ENUM ('MONTHLY', 'BIWEEKLY', 'WEEKLY', 'DAILY');

-- CreateEnum
CREATE TYPE "PayrollLineStatus" AS ENUM ('DRAFT', 'CALCULATED', 'REVIEWED', 'ADJUSTED', 'FINALIZED', 'CORRECTED');

-- CreateEnum
CREATE TYPE "PayrollAdjustmentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('GENERATED', 'FINALIZED', 'CORRECTED');

-- CreateTable
CREATE TABLE "payroll_policies" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "companyId" UUID,
    "workingDaysPerWeek" INTEGER NOT NULL DEFAULT 5,
    "workingDaysPerMonth" INTEGER NOT NULL DEFAULT 22,
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "defaultCalcMode" "PayrollCalculationMode" NOT NULL DEFAULT 'ATTENDANCE',
    "overtimeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "overtimeMultiplier" INTEGER NOT NULL DEFAULT 150,
    "overtimeCapMinutes" INTEGER,
    "absenceDeduct" BOOLEAN NOT NULL DEFAULT true,
    "absenceDivisor" INTEGER NOT NULL DEFAULT 22,
    "roundingPrecision" INTEGER NOT NULL DEFAULT 2,
    "roundingMode" VARCHAR(20) NOT NULL DEFAULT 'HALF_UP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_components" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "type" "PayrollComponentType" NOT NULL,
    "isStatutory" BOOLEAN NOT NULL DEFAULT false,
    "isFixed" BOOLEAN NOT NULL DEFAULT true,
    "defaultValue" INTEGER,
    "calculationBasis" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structures" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "companyId" UUID,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "payFrequency" "PayFrequency" NOT NULL DEFAULT 'MONTHLY',
    "basicSalary" INTEGER NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_structure_components" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "salaryStructureId" UUID NOT NULL,
    "componentId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_structure_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "paymentDate" DATE NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" UUID,
    "approvedBy" UUID,
    "calculatedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "companyId" UUID,
    "calculationMode" "PayrollCalculationMode" NOT NULL DEFAULT 'ATTENDANCE',
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'PENDING',
    "employeeScope" VARCHAR(50),
    "calculatedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdBy" UUID,
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalGross" INTEGER NOT NULL DEFAULT 0,
    "totalDeductions" INTEGER NOT NULL DEFAULT 0,
    "totalNet" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_lines" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "salaryStructureId" UUID,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "calculationMode" "PayrollCalculationMode" NOT NULL DEFAULT 'ATTENDANCE',
    "status" "PayrollLineStatus" NOT NULL DEFAULT 'DRAFT',
    "workingDays" INTEGER NOT NULL DEFAULT 0,
    "workedDays" INTEGER NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL DEFAULT 0,
    "paidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "unpaidLeaveDays" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "grossPay" INTEGER NOT NULL DEFAULT 0,
    "totalDeductions" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "netPay" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_line_items" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "lineId" UUID NOT NULL,
    "componentId" UUID,
    "type" "PayrollComponentType" NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
    "calculationBasis" VARCHAR(100),
    "referenceId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_adjustments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "lineId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "type" "PayrollComponentType" NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "PayrollAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" VARCHAR(500),
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "lineId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "periodId" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "grossPay" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" INTEGER NOT NULL DEFAULT 0,
    "totalDeductions" INTEGER NOT NULL DEFAULT 0,
    "netPay" INTEGER NOT NULL DEFAULT 0,
    "paymentDate" DATE NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'GENERATED',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_policies_tenantId_name_key" ON "payroll_policies"("tenantId", "name");
CREATE INDEX "payroll_policies_tenantId_idx" ON "payroll_policies"("tenantId");
CREATE INDEX "payroll_policies_tenantId_isActive_idx" ON "payroll_policies"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_components_tenantId_code_key" ON "payroll_components"("tenantId", "code");
CREATE INDEX "payroll_components_tenantId_idx" ON "payroll_components"("tenantId");
CREATE INDEX "payroll_components_tenantId_type_idx" ON "payroll_components"("tenantId", "type");
CREATE INDEX "payroll_components_tenantId_isActive_idx" ON "payroll_components"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "salary_structures_tenantId_idx" ON "salary_structures"("tenantId");
CREATE INDEX "salary_structures_employeeId_idx" ON "salary_structures"("employeeId");
CREATE INDEX "salary_structures_employeeId_effectiveFrom_idx" ON "salary_structures"("employeeId", "effectiveFrom");
CREATE INDEX "salary_structures_tenantId_isActive_idx" ON "salary_structures"("tenantId", "isActive");
CREATE INDEX "salary_structures_employeeId_isActive_idx" ON "salary_structures"("employeeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "salary_structure_components_salaryStructureId_componentId_key" ON "salary_structure_components"("salaryStructureId", "componentId");
CREATE INDEX "salary_structure_components_tenantId_idx" ON "salary_structure_components"("tenantId");
CREATE INDEX "salary_structure_components_salaryStructureId_idx" ON "salary_structure_components"("salaryStructureId");
CREATE INDEX "salary_structure_components_componentId_idx" ON "salary_structure_components"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_tenantId_name_key" ON "payroll_periods"("tenantId", "name");
CREATE INDEX "payroll_periods_tenantId_idx" ON "payroll_periods"("tenantId");
CREATE INDEX "payroll_periods_tenantId_status_idx" ON "payroll_periods"("tenantId", "status");
CREATE INDEX "payroll_periods_tenantId_startDate_idx" ON "payroll_periods"("tenantId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_runs_tenantId_periodId_calculationMode_key" ON "payroll_runs"("tenantId", "periodId", "calculationMode");
CREATE INDEX "payroll_runs_tenantId_idx" ON "payroll_runs"("tenantId");
CREATE INDEX "payroll_runs_periodId_idx" ON "payroll_runs"("periodId");
CREATE INDEX "payroll_runs_tenantId_status_idx" ON "payroll_runs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_lines_runId_employeeId_key" ON "payroll_lines"("runId", "employeeId");
CREATE INDEX "payroll_lines_tenantId_idx" ON "payroll_lines"("tenantId");
CREATE INDEX "payroll_lines_runId_idx" ON "payroll_lines"("runId");
CREATE INDEX "payroll_lines_employeeId_idx" ON "payroll_lines"("employeeId");
CREATE INDEX "payroll_lines_tenantId_employeeId_idx" ON "payroll_lines"("tenantId", "employeeId");
CREATE INDEX "payroll_lines_runId_status_idx" ON "payroll_lines"("runId", "status");

-- CreateIndex
CREATE INDEX "payroll_line_items_tenantId_idx" ON "payroll_line_items"("tenantId");
CREATE INDEX "payroll_line_items_lineId_idx" ON "payroll_line_items"("lineId");
CREATE INDEX "payroll_line_items_componentId_idx" ON "payroll_line_items"("componentId");
CREATE INDEX "payroll_line_items_lineId_type_idx" ON "payroll_line_items"("lineId", "type");

-- CreateIndex
CREATE INDEX "payroll_adjustments_tenantId_idx" ON "payroll_adjustments"("tenantId");
CREATE INDEX "payroll_adjustments_lineId_idx" ON "payroll_adjustments"("lineId");
CREATE INDEX "payroll_adjustments_employeeId_idx" ON "payroll_adjustments"("employeeId");
CREATE INDEX "payroll_adjustments_tenantId_status_idx" ON "payroll_adjustments"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_lineId_key" ON "payslips"("lineId");
CREATE UNIQUE INDEX "payslips_tenantId_employeeId_periodId_key" ON "payslips"("tenantId", "employeeId", "periodId");
CREATE INDEX "payslips_tenantId_idx" ON "payslips"("tenantId");
CREATE INDEX "payslips_employeeId_idx" ON "payslips"("employeeId");
CREATE INDEX "payslips_periodId_idx" ON "payslips"("periodId");
CREATE INDEX "payslips_runId_idx" ON "payslips"("runId");

-- AddForeignKey
ALTER TABLE "payroll_policies" ADD CONSTRAINT "payroll_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_components" ADD CONSTRAINT "payroll_components_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "salary_structure_components" ADD CONSTRAINT "salary_structure_components_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "payroll_components"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_periods" ADD CONSTRAINT "payroll_periods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_runId_fkey" FOREIGN KEY ("runId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "payroll_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_line_items" ADD CONSTRAINT "payroll_line_items_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "payroll_components"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "payroll_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_adjustments" ADD CONSTRAINT "payroll_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "payroll_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
