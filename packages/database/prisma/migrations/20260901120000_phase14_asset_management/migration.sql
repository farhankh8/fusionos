-- Phase 14: Enterprise Asset & Equipment Management

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ASSIGNED', 'IN_MAINTENANCE', 'IN_REPAIR', 'AVAILABLE', 'LOST', 'DAMAGED', 'DISPOSED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetCategoryType" AS ENUM ('IT_EQUIPMENT', 'OFFICE_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'MACHINERY', 'TOOLS', 'SOFTWARE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetMaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'CALIBRATION');

-- CreateEnum
CREATE TYPE "AssetMaintenanceStatus" AS ENUM ('SCHEDULED', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetInspectionStatus" AS ENUM ('SCHEDULED', 'PASSED', 'FAILED', 'REQUIRES_ACTION');

-- CreateEnum
CREATE TYPE "AssetDisposalMethod" AS ENUM ('SOLD', 'SCRAPPED', 'DONATED', 'LOST', 'RETURNED', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetDepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION');

-- Add ASSET to DocumentEntityType
ALTER TYPE "DocumentEntityType" ADD VALUE 'ASSET';

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "categoryType" "AssetCategoryType" NOT NULL DEFAULT 'OTHER',
    "defaultUsefulLife" INTEGER,
    "defaultDepreciationMethod" "AssetDepreciationMethod",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_locations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "building" VARCHAR(255),
    "floor" VARCHAR(100),
    "room" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asset_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "categoryId" UUID,
    "locationId" UUID,
    "assetCode" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "serialNumber" VARCHAR(255),
    "manufacturer" VARCHAR(255),
    "model" VARCHAR(255),
    "purchaseDate" DATE,
    "purchaseCost" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "condition" "AssetCondition" NOT NULL DEFAULT 'NEW',
    "currentBookValue" INTEGER NOT NULL DEFAULT 0,
    "usefulLife" INTEGER,
    "residualValue" INTEGER NOT NULL DEFAULT 0,
    "inServiceDate" DATE,
    "disposalDate" DATE,
    "disposalMethod" "AssetDisposalMethod",
    "disposalReason" VARCHAR(500),
    "disposalProceeds" INTEGER NOT NULL DEFAULT 0,
    "vendorId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "employeeId" UUID,
    "projectId" UUID,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(500),
    "assignedBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_transfers" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "fromEmployeeId" UUID,
    "toEmployeeId" UUID,
    "fromBranchId" UUID,
    "toBranchId" UUID,
    "fromLocationId" UUID,
    "toLocationId" UUID,
    "fromProjectId" UUID,
    "toProjectId" UUID,
    "transferDate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" VARCHAR(500),
    "notes" TEXT,
    "transferredBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance_records" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "type" "AssetMaintenanceType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "scheduledDate" DATE,
    "startedAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "status" "AssetMaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "vendor" VARCHAR(255),
    "cost" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "assignedToId" UUID,
    "createdBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asset_maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_inspections" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "inspectionType" VARCHAR(100) NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "completedDate" DATE,
    "inspectorId" UUID,
    "status" "AssetInspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "condition" "AssetCondition",
    "findings" TEXT,
    "notes" TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asset_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_warranties" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "provider" VARCHAR(255) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "referenceNumber" VARCHAR(255),
    "coverage" VARCHAR(500),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "asset_warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciations" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "periodStartDate" DATE NOT NULL,
    "periodEndDate" DATE NOT NULL,
    "depreciationMethod" "AssetDepreciationMethod" NOT NULL,
    "openingBookValue" INTEGER NOT NULL,
    "depreciationAmount" INTEGER NOT NULL,
    "closingBookValue" INTEGER NOT NULL,
    "usefulLifeMonths" INTEGER NOT NULL,
    "monthlyRate" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedBy" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_activities" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "actorId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_tenantId_companyId_code_key" ON "asset_categories"("tenantId", "companyId", "code");

-- CreateIndex
CREATE INDEX "asset_categories_tenantId_idx" ON "asset_categories"("tenantId");

-- CreateIndex
CREATE INDEX "asset_categories_companyId_idx" ON "asset_categories"("companyId");

-- CreateIndex
CREATE INDEX "asset_categories_categoryType_idx" ON "asset_categories"("categoryType");

-- CreateIndex
CREATE UNIQUE INDEX "asset_locations_tenantId_companyId_code_key" ON "asset_locations"("tenantId", "companyId", "code");

-- CreateIndex
CREATE INDEX "asset_locations_tenantId_idx" ON "asset_locations"("tenantId");

-- CreateIndex
CREATE INDEX "asset_locations_companyId_idx" ON "asset_locations"("companyId");

-- CreateIndex
CREATE INDEX "asset_locations_branchId_idx" ON "asset_locations"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenantId_companyId_assetCode_key" ON "assets"("tenantId", "companyId", "assetCode");

-- CreateIndex
CREATE INDEX "assets_tenantId_idx" ON "assets"("tenantId");

-- CreateIndex
CREATE INDEX "assets_companyId_idx" ON "assets"("companyId");

-- CreateIndex
CREATE INDEX "assets_categoryId_idx" ON "assets"("categoryId");

-- CreateIndex
CREATE INDEX "assets_locationId_idx" ON "assets"("locationId");

-- CreateIndex
CREATE INDEX "assets_vendorId_idx" ON "assets"("vendorId");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_tenantId_companyId_status_idx" ON "assets"("tenantId", "companyId", "status");

-- CreateIndex
CREATE INDEX "assets_tenantId_companyId_categoryId_idx" ON "assets"("tenantId", "companyId", "categoryId");

-- CreateIndex
CREATE INDEX "asset_assignments_tenantId_idx" ON "asset_assignments"("tenantId");

-- CreateIndex
CREATE INDEX "asset_assignments_assetId_idx" ON "asset_assignments"("assetId");

-- CreateIndex
CREATE INDEX "asset_assignments_employeeId_idx" ON "asset_assignments"("employeeId");

-- CreateIndex
CREATE INDEX "asset_assignments_projectId_idx" ON "asset_assignments"("projectId");

-- CreateIndex
CREATE INDEX "asset_assignments_status_idx" ON "asset_assignments"("status");

-- CreateIndex
CREATE INDEX "asset_transfers_tenantId_idx" ON "asset_transfers"("tenantId");

-- CreateIndex
CREATE INDEX "asset_transfers_assetId_idx" ON "asset_transfers"("assetId");

-- CreateIndex
CREATE INDEX "asset_transfers_fromEmployeeId_idx" ON "asset_transfers"("fromEmployeeId");

-- CreateIndex
CREATE INDEX "asset_transfers_toEmployeeId_idx" ON "asset_transfers"("toEmployeeId");

-- CreateIndex
CREATE INDEX "asset_transfers_transferDate_idx" ON "asset_transfers"("transferDate");

-- CreateIndex
CREATE INDEX "asset_maintenance_records_tenantId_idx" ON "asset_maintenance_records"("tenantId");

-- CreateIndex
CREATE INDEX "asset_maintenance_records_assetId_idx" ON "asset_maintenance_records"("assetId");

-- CreateIndex
CREATE INDEX "asset_maintenance_records_status_idx" ON "asset_maintenance_records"("status");

-- CreateIndex
CREATE INDEX "asset_maintenance_records_scheduledDate_idx" ON "asset_maintenance_records"("scheduledDate");

-- CreateIndex
CREATE INDEX "asset_maintenance_records_tenantId_assetId_idx" ON "asset_maintenance_records"("tenantId", "assetId");

-- CreateIndex
CREATE INDEX "asset_inspections_tenantId_idx" ON "asset_inspections"("tenantId");

-- CreateIndex
CREATE INDEX "asset_inspections_assetId_idx" ON "asset_inspections"("assetId");

-- CreateIndex
CREATE INDEX "asset_inspections_status_idx" ON "asset_inspections"("status");

-- CreateIndex
CREATE INDEX "asset_inspections_scheduledDate_idx" ON "asset_inspections"("scheduledDate");

-- CreateIndex
CREATE INDEX "asset_warranties_tenantId_idx" ON "asset_warranties"("tenantId");

-- CreateIndex
CREATE INDEX "asset_warranties_assetId_idx" ON "asset_warranties"("assetId");

-- CreateIndex
CREATE INDEX "asset_warranties_endDate_idx" ON "asset_warranties"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "asset_depreciations_assetId_periodStartDate_key" ON "asset_depreciations"("assetId", "periodStartDate");

-- CreateIndex
CREATE INDEX "asset_depreciations_tenantId_idx" ON "asset_depreciations"("tenantId");

-- CreateIndex
CREATE INDEX "asset_depreciations_assetId_idx" ON "asset_depreciations"("assetId");

-- CreateIndex
CREATE INDEX "asset_depreciations_periodStartDate_idx" ON "asset_depreciations"("periodStartDate");

-- CreateIndex
CREATE INDEX "asset_activities_tenantId_idx" ON "asset_activities"("tenantId");

-- CreateIndex
CREATE INDEX "asset_activities_assetId_idx" ON "asset_activities"("assetId");

-- CreateIndex
CREATE INDEX "asset_activities_createdAt_idx" ON "asset_activities"("createdAt");

-- CreateIndex
CREATE INDEX "asset_activities_tenantId_assetId_idx" ON "asset_activities"("tenantId", "assetId");

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_locations" ADD CONSTRAINT "asset_locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_locations" ADD CONSTRAINT "asset_locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_locations" ADD CONSTRAINT "asset_locations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "asset_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromEmployeeId_fkey" FOREIGN KEY ("fromEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "asset_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "asset_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_fromProjectId_fkey" FOREIGN KEY ("fromProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_transfers" ADD CONSTRAINT "asset_transfers_toProjectId_fkey" FOREIGN KEY ("toProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_inspections" ADD CONSTRAINT "asset_inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_warranties" ADD CONSTRAINT "asset_warranties_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciations" ADD CONSTRAINT "asset_depreciations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_activities" ADD CONSTRAINT "asset_activities_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_activities" ADD CONSTRAINT "asset_activities_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
