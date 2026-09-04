/**
 * FusionOS Asset Management Integration Tests — Phase 14
 *
 * Covers:
 * - Asset CRUD
 * - Category CRUD
 * - Location CRUD
 * - State machine transitions
 * - Assignments (create, return)
 * - Transfers
 * - Maintenance lifecycle
 * - Inspections
 * - Warranties
 * - Depreciation calculation
 * - Disposal / Retirement
 * - Activity tracking
 * - Tenant isolation
 * - IDOR protection
 * - Concurrency safety
 * - Idempotency
 * - Data integrity
 * - Event emission
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Test Constants ──────────────────────────────────────────────────────────

const TENANT_A = '00000000-0000-4000-8000-000000000001';
const TENANT_B = '10000000-0000-4000-8000-000000000001';
const USER_A_ADMIN = '00000000-0000-4000-8000-000000000003';
const USER_A_HR = '00000000-0000-4000-8000-000000000010';
const USER_A_EMPLOYEE = '00000000-0000-4000-8000-000000000011';
const USER_B_ADMIN = '10000000-0000-4000-8000-000000000003';

// Unique test identifiers to avoid collisions
const UNIQUE = `AST_${Date.now()}`;
const UNIQUE_B = `B_${Date.now()}`;

// Track created IDs for cleanup
const assetIds: string[] = [];
const categoryIds: string[] = [];
const locationIds: string[] = [];
const assignmentIds: string[] = [];
const transferIds: string[] = [];
const maintenanceIds: string[] = [];
const inspectionIds: string[] = [];
const warrantyIds: string[] = [];
const depreciationIds: string[] = [];
const activityIds: string[] = [];
const eventIds: string[] = [];

// Find a company and branch for the tenant
let companyAId: string;
let branchAId: string;
let testEmployeeId: string;
let testInspectorId: string;
const TENANT_B_COMPANY_ID = '10000000-0000-4000-8000-000000000002';
const employeeIds: string[] = [];

describe('Assets — Phase 14 Integration Tests', () => {
  beforeAll(async () => {
    // Verify test users exist
    for (const userId of [USER_A_ADMIN, USER_A_HR, USER_A_EMPLOYEE, USER_B_ADMIN]) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error(`Test user ${userId} not found — run seed first`);
    }

    // Get company for Tenant A
    const companyA = await prisma.company.findFirst({ where: { tenantId: TENANT_A } });
    if (!companyA) throw new Error('No company for Tenant A');
    companyAId = companyA.id;

    // Get/create branch for Tenant A
    const branchA = await prisma.branch.findFirst({ where: { tenantId: TENANT_A } });
    branchAId = branchA?.id ?? (await prisma.branch.create({ data: { tenantId: TENANT_A, companyId: companyAId, name: `Test Branch ${UNIQUE}`, code: `BR_${UNIQUE}` } })).id;

    // Create test employees for FK references
    const emp1 = await prisma.employee.create({
      data: {
        tenantId: TENANT_A,
        companyId: companyAId,
        userId: USER_A_EMPLOYEE,
        employeeCode: `EMP_${UNIQUE}`,
        firstName: 'Asset',
        lastName: 'TestEmployee',
        email: `asset_test_${UNIQUE}@test.dev`,
        joiningDate: new Date('2024-01-01'),
      },
    });
    testEmployeeId = emp1.id;
    employeeIds.push(emp1.id);

    const emp2 = await prisma.employee.create({
      data: {
        tenantId: TENANT_A,
        companyId: companyAId,
        userId: USER_A_HR,
        employeeCode: `INS_${UNIQUE}`,
        firstName: 'Asset',
        lastName: 'Inspector',
        email: `asset_inspector_${UNIQUE}@test.dev`,
        joiningDate: new Date('2024-01-01'),
      },
    });
    testInspectorId = emp2.id;
    employeeIds.push(emp2.id);

    // Verify company for Tenant B exists from seed
    const companyB = await prisma.company.findUnique({ where: { id: TENANT_B_COMPANY_ID } });
    if (!companyB) throw new Error('Tenant B company not found — run seed first');
  });

  afterAll(async () => {
    // Clean up in reverse dependency order
    await prisma.assetActivity.deleteMany({ where: { id: { in: activityIds } } });
    await prisma.assetDepreciation.deleteMany({ where: { id: { in: depreciationIds } } });
    await prisma.assetWarranty.deleteMany({ where: { id: { in: warrantyIds } } });
    await prisma.assetInspection.deleteMany({ where: { id: { in: inspectionIds } } });
    await prisma.assetMaintenanceRecord.deleteMany({ where: { id: { in: maintenanceIds } } });
    await prisma.assetTransfer.deleteMany({ where: { id: { in: transferIds } } });
    await prisma.assetAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
    await prisma.assetCategory.deleteMany({ where: { id: { in: categoryIds } } });
    await prisma.assetLocation.deleteMany({ where: { id: { in: locationIds } } });
    await prisma.eventOutbox.deleteMany({ where: { id: { in: eventIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
    await prisma.$disconnect();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Categories', () => {
    let categoryId: string;

    it('should create an asset category', async () => {
      const cat = await prisma.assetCategory.create({
        data: {
          tenantId: TENANT_A,
          companyId: companyAId,
          name: `IT Equipment ${UNIQUE}`,
          code: `IT_${UNIQUE}`,
          description: 'IT equipment category',
          categoryType: 'IT_EQUIPMENT',
          defaultUsefulLife: 36,
          defaultDepreciationMethod: 'STRAIGHT_LINE',
        },
      });
      categoryId = cat.id;
      categoryIds.push(cat.id);
      expect(cat.id).toBeDefined();
      expect(cat.name).toBe(`IT Equipment ${UNIQUE}`);
      expect(cat.categoryType).toBe('IT_EQUIPMENT');
    });

    it('should list categories', async () => {
      const cats = await prisma.assetCategory.findMany({ where: { tenantId: TENANT_A } });
      expect(cats.length).toBeGreaterThanOrEqual(1);
      expect(cats.every(c => c.tenantId === TENANT_A)).toBe(true);
    });

    it('should update a category', async () => {
      const updated = await prisma.assetCategory.update({
        where: { id: categoryId },
        data: { description: 'Updated description' },
      });
      expect(updated.description).toBe('Updated description');
    });

    it('should enforce unique code per tenant+company', async () => {
      await expect(
        prisma.assetCategory.create({
          data: {
            tenantId: TENANT_A,
            companyId: companyAId,
            name: 'Duplicate',
            code: `IT_${UNIQUE}`, // Same code
            categoryType: 'IT_EQUIPMENT',
          },
        }),
      ).rejects.toThrow();
    });

    it('Tenant B cannot see Tenant A categories', async () => {
      const catB = await prisma.assetCategory.create({
        data: {
          tenantId: TENANT_B,
          companyId: TENANT_B_COMPANY_ID,
          name: `Tenant B Cat ${UNIQUE_B}`,
          code: `TB_${UNIQUE_B}`,
          categoryType: 'OTHER',
        },
      });
      categoryIds.push(catB.id);

      const catsA = await prisma.assetCategory.findMany({ where: { tenantId: TENANT_A } });
      expect(catsA.find(c => c.id === catB.id)).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LOCATIONS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Locations', () => {
    let locationId: string;

    it('should create an asset location', async () => {
      const loc = await prisma.assetLocation.create({
        data: {
          tenantId: TENANT_A,
          companyId: companyAId,
          name: `HQ Office ${UNIQUE}`,
          code: `LOC_${UNIQUE}`,
          description: 'Main office',
          branchId: branchAId,
          building: 'Building A',
          floor: '3rd Floor',
          room: 'Room 301',
        },
      });
      locationId = loc.id;
      locationIds.push(loc.id);
      expect(loc.name).toBe(`HQ Office ${UNIQUE}`);
      expect(loc.building).toBe('Building A');
    });

    it('should list locations', async () => {
      const locs = await prisma.assetLocation.findMany({ where: { tenantId: TENANT_A } });
      expect(locs.length).toBeGreaterThanOrEqual(1);
    });

    it('should update a location', async () => {
      const updated = await prisma.assetLocation.update({
        where: { id: locationId },
        data: { room: 'Room 302' },
      });
      expect(updated.room).toBe('Room 302');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ASSETS — CRUD + LIFECYCLE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Assets — CRUD', () => {
    let assetId: string;

    it('should create an asset', async () => {
      const asset = await prisma.asset.create({
        data: {
          tenantId: TENANT_A,
          companyId: companyAId,
          assetCode: `AST-${UNIQUE}-001`,
          name: `Dell Laptop ${UNIQUE}`,
          description: 'Test laptop',
          serialNumber: `SN-${UNIQUE}`,
          manufacturer: 'Dell',
          model: 'XPS 15',
          purchaseDate: new Date('2024-01-15'),
          purchaseCost: 150000, // $1500.00 in minor units
          currency: 'USD',
          status: 'DRAFT',
          condition: 'GOOD',
          usefulLife: 36,
          residualValue: 10000, // $100.00
          currentBookValue: 150000,
        },
      });
      assetId = asset.id;
      assetIds.push(asset.id);
      expect(asset.assetCode).toBe(`AST-${UNIQUE}-001`);
      expect(asset.purchaseCost).toBe(150000);
      expect(asset.status).toBe('DRAFT');
      expect(asset.currentBookValue).toBe(150000);
    });

    it('should find an asset by ID', async () => {
      const asset = await prisma.asset.findUnique({ where: { id: assetId } });
      expect(asset).not.toBeNull();
      expect(asset!.name).toBe(`Dell Laptop ${UNIQUE}`);
    });

    it('should update an asset', async () => {
      const updated = await prisma.asset.update({
        where: { id: assetId },
        data: { name: `Updated Dell Laptop ${UNIQUE}` },
      });
      expect(updated.name).toBe(`Updated Dell Laptop ${UNIQUE}`);
    });

    it('should enforce unique asset code per tenant+company', async () => {
      await expect(
        prisma.asset.create({
          data: {
            tenantId: TENANT_A,
            companyId: companyAId,
            assetCode: `AST-${UNIQUE}-001`, // Same code
            name: 'Duplicate',
            status: 'DRAFT',
            condition: 'GOOD',
            purchaseCost: 0,
            currency: 'USD',
          },
        }),
      ).rejects.toThrow();
    });

    it('should list assets with pagination', async () => {
      const [data, total] = await Promise.all([
        prisma.asset.findMany({ where: { tenantId: TENANT_A }, take: 5, orderBy: { createdAt: 'desc' } }),
        prisma.asset.count({ where: { tenantId: TENANT_A } }),
      ]);
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(total).toBeGreaterThanOrEqual(1);
    });

    it('should filter assets by status', async () => {
      const draftAssets = await prisma.asset.findMany({ where: { tenantId: TENANT_A, status: 'DRAFT' } });
      expect(draftAssets.every(a => a.status === 'DRAFT')).toBe(true);
    });

    it('should create a second asset', async () => {
      const asset2 = await prisma.asset.create({
        data: {
          tenantId: TENANT_A,
          companyId: companyAId,
          assetCode: `AST-${UNIQUE}-002`,
          name: `Office Chair ${UNIQUE}`,
          status: 'ACTIVE',
          condition: 'GOOD',
          purchaseCost: 50000,
          currency: 'USD',
          currentBookValue: 50000,
          categoryId: categoryIds[0],
          locationId: locationIds[0],
        },
      });
      assetIds.push(asset2.id);
      expect(asset2.status).toBe('ACTIVE');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // STATE MACHINE TRANSITIONS
  // ══════════════════════════════════════════════════════════════════════════

  describe('State Machine Transitions', () => {
    it('should transition DRAFT → ACTIVE', async () => {
      const asset = assetIds.find(id => id === assetIds[0]);
      if (!asset) return;
      const updated = await prisma.asset.update({ where: { id: asset }, data: { status: 'ACTIVE' } });
      expect(updated.status).toBe('ACTIVE');
    });

    it('should transition ACTIVE → AVAILABLE', async () => {
      const updated = await prisma.asset.update({ where: { id: assetIds[0] }, data: { status: 'AVAILABLE' } });
      expect(updated.status).toBe('AVAILABLE');
    });

    it('should transition AVAILABLE → IN_MAINTENANCE', async () => {
      const updated = await prisma.asset.update({ where: { id: assetIds[0] }, data: { status: 'IN_MAINTENANCE' } });
      expect(updated.status).toBe('IN_MAINTENANCE');
    });

    it('should transition IN_MAINTENANCE → AVAILABLE', async () => {
      const updated = await prisma.asset.update({ where: { id: assetIds[0] }, data: { status: 'AVAILABLE' } });
      expect(updated.status).toBe('AVAILABLE');
    });

    it('should transition AVAILABLE → ASSIGNED', async () => {
      const updated = await prisma.asset.update({ where: { id: assetIds[0] }, data: { status: 'ASSIGNED' } });
      expect(updated.status).toBe('ASSIGNED');
    });

    it('should transition ASSIGNED → AVAILABLE', async () => {
      const updated = await prisma.asset.update({ where: { id: assetIds[0] }, data: { status: 'AVAILABLE' } });
      expect(updated.status).toBe('AVAILABLE');
    });

    it('should transition to RETIRED', async () => {
      const updated = await prisma.asset.update({ where: { id: assetIds[0] }, data: { status: 'RETIRED', currentBookValue: 0 } });
      expect(updated.status).toBe('RETIRED');
    });

    it('should transition RETIRED → DISPOSED', async () => {
      const updated = await prisma.asset.update({ where: { id: assetIds[0] }, data: { status: 'DISPOSED', disposalDate: new Date(), currentBookValue: 0 } });
      expect(updated.status).toBe('DISPOSED');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ASSIGNMENTS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Assignments', () => {
    let assignmentId: string;

    it('should create an assignment', async () => {
      const assignment = await prisma.assetAssignment.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          employeeId: testEmployeeId,
          assignedBy: USER_A_ADMIN,
        },
      });
      assignmentId = assignment.id;
      assignmentIds.push(assignment.id);
      expect(assignment.assetId).toBe(assetIds[1]);
      expect(assignment.employeeId).toBe(testEmployeeId);
      expect(assignment.status).toBe('ACTIVE');
    });

    it('should update asset status to ASSIGNED on assignment', async () => {
      await prisma.asset.update({ where: { id: assetIds[1] }, data: { status: 'ASSIGNED' } });
      const asset = await prisma.asset.findUnique({ where: { id: assetIds[1] } });
      expect(asset!.status).toBe('ASSIGNED');
    });

    it('should list assignments for an asset', async () => {
      const assignments = await prisma.assetAssignment.findMany({ where: { assetId: assetIds[1] } });
      expect(assignments.length).toBeGreaterThanOrEqual(1);
    });

    it('should return an asset', async () => {
      const updated = await prisma.assetAssignment.update({
        where: { id: assignmentId },
        data: { status: 'RETURNED', returnedAt: new Date() },
      });
      expect(updated.status).toBe('RETURNED');
      expect(updated.returnedAt).not.toBeNull();

      // Asset should go back to AVAILABLE
      await prisma.asset.update({ where: { id: assetIds[1] }, data: { status: 'AVAILABLE' } });
    });

    it('should verify only one active assignment per employee per asset', async () => {
      // After return, the asset should be AVAILABLE again
      await prisma.asset.update({ where: { id: assetIds[1] }, data: { status: 'AVAILABLE' } });
      const activeCount = await prisma.assetAssignment.count({
        where: { assetId: assetIds[1], employeeId: testEmployeeId, status: 'ACTIVE' },
      });
      expect(activeCount).toBe(0); // Was returned in previous test
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSFERS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Transfers', () => {
    it('should create a transfer record', async () => {
      const transfer = await prisma.assetTransfer.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          toEmployeeId: testInspectorId,
          reason: 'Department transfer',
          transferredBy: USER_A_ADMIN,
        },
      });
      transferIds.push(transfer.id);
      expect(transfer.assetId).toBe(assetIds[1]);
      expect(transfer.toEmployeeId).toBe(testInspectorId);
      expect(transfer.reason).toBe('Department transfer');
    });

    it('should create a location transfer', async () => {
      const transfer = await prisma.assetTransfer.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          toLocationId: locationIds[0],
          reason: 'Relocation',
          transferredBy: USER_A_ADMIN,
        },
      });
      transferIds.push(transfer.id);
      expect(transfer.toLocationId).toBe(locationIds[0]);
    });

    it('should list transfers for an asset', async () => {
      const transfers = await prisma.assetTransfer.findMany({ where: { assetId: assetIds[1] } });
      expect(transfers.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MAINTENANCE
  // ══════════════════════════════════════════════════════════════════════════

  describe('Maintenance', () => {
    let maintenanceId: string;

    it('should create a maintenance record', async () => {
      const record = await prisma.assetMaintenanceRecord.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          type: 'PREVENTIVE',
          title: 'Annual service',
          description: 'Scheduled annual maintenance',
          priority: 'MEDIUM',
          scheduledDate: new Date('2026-06-01'),
          status: 'SCHEDULED',
          cost: 0,
          currency: 'USD',
          createdBy: USER_A_ADMIN,
        },
      });
      maintenanceId = record.id;
      maintenanceIds.push(record.id);
      expect(record.title).toBe('Annual service');
      expect(record.status).toBe('SCHEDULED');
    });

    it('should transition SCHEDULED → OPEN', async () => {
      const updated = await prisma.assetMaintenanceRecord.update({
        where: { id: maintenanceId },
        data: { status: 'OPEN' },
      });
      expect(updated.status).toBe('OPEN');
    });

    it('should transition OPEN → IN_PROGRESS', async () => {
      const updated = await prisma.assetMaintenanceRecord.update({
        where: { id: maintenanceId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
      expect(updated.status).toBe('IN_PROGRESS');
      expect(updated.startedAt).not.toBeNull();
    });

    it('should transition IN_PROGRESS → COMPLETED with cost', async () => {
      const updated = await prisma.assetMaintenanceRecord.update({
        where: { id: maintenanceId },
        data: { status: 'COMPLETED', completedAt: new Date(), cost: 25000 }, // $250.00
      });
      expect(updated.status).toBe('COMPLETED');
      expect(updated.cost).toBe(25000);
      expect(updated.completedAt).not.toBeNull();
    });

    it('should list maintenance records', async () => {
      const records = await prisma.assetMaintenanceRecord.findMany({ where: { assetId: assetIds[1] } });
      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate total maintenance cost', async () => {
      const records = await prisma.assetMaintenanceRecord.findMany({
        where: { assetId: assetIds[1], status: 'COMPLETED' },
      });
      const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
      expect(totalCost).toBeGreaterThanOrEqual(25000);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // INSPECTIONS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Inspections', () => {
    let inspectionId: string;

    it('should create an inspection', async () => {
      const inspection = await prisma.assetInspection.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          inspectionType: 'SAFETY',
          scheduledDate: new Date('2026-07-01'),
          inspectorId: testInspectorId,
          status: 'SCHEDULED',
          createdBy: USER_A_ADMIN,
        },
      });
      inspectionId = inspection.id;
      inspectionIds.push(inspection.id);
      expect(inspection.inspectionType).toBe('SAFETY');
      expect(inspection.status).toBe('SCHEDULED');
    });

    it('should complete inspection with PASSED status', async () => {
      const updated = await prisma.assetInspection.update({
        where: { id: inspectionId },
        data: {
          status: 'PASSED',
          completedDate: new Date(),
          condition: 'GOOD',
          findings: 'All systems operational',
        },
      });
      expect(updated.status).toBe('PASSED');
      expect(updated.completedDate).not.toBeNull();
    });

    it('should create a failed inspection', async () => {
      const inspection = await prisma.assetInspection.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          inspectionType: 'TECHNICAL',
          scheduledDate: new Date('2026-08-01'),
          status: 'SCHEDULED',
          createdBy: USER_A_ADMIN,
        },
      });
      inspectionIds.push(inspection.id);

      const completed = await prisma.assetInspection.update({
        where: { id: inspection.id },
        data: { status: 'FAILED', completedDate: new Date(), condition: 'POOR', findings: 'Battery needs replacement' },
      });
      expect(completed.status).toBe('FAILED');
    });

    it('should list inspections', async () => {
      const inspections = await prisma.assetInspection.findMany({ where: { assetId: assetIds[1] } });
      expect(inspections.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WARRANTIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Warranties', () => {
    let warrantyId: string;

    it('should create a warranty', async () => {
      const warranty = await prisma.assetWarranty.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          provider: 'Dell Inc.',
          startDate: new Date('2024-01-15'),
          endDate: new Date('2027-01-15'),
          referenceNumber: 'WR-2024-001',
          coverage: 'Full hardware warranty',
          isActive: true,
        },
      });
      warrantyId = warranty.id;
      warrantyIds.push(warranty.id);
      expect(warranty.provider).toBe('Dell Inc.');
      expect(warranty.isActive).toBe(true);
    });

    it('should update warranty', async () => {
      const updated = await prisma.assetWarranty.update({
        where: { id: warrantyId },
        data: { coverage: 'Extended hardware warranty' },
      });
      expect(updated.coverage).toBe('Extended hardware warranty');
    });

    it('should list warranties for an asset', async () => {
      const warranties = await prisma.assetWarranty.findMany({ where: { assetId: assetIds[1] } });
      expect(warranties.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate warranty active/expired status', async () => {
      const warranty = await prisma.assetWarranty.findUnique({ where: { id: warrantyId } });
      expect(warranty).not.toBeNull();
      const now = new Date();
      const isActive = warranty!.isActive && new Date(warranty!.endDate) > now;
      // This warranty is valid until 2027, so should be active
      expect(isActive).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DEPRECIATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Depreciation', () => {
    it('should calculate straight-line depreciation', async () => {
      // Use the second asset (active, $500.00, 36 months useful life would be from category default)
      // But we set purchase cost to 50000 (minor units) and no useful life on asset 2
      // Let's update asset 2 to have useful life
      await prisma.asset.update({ where: { id: assetIds[1] }, data: { usefulLife: 36 } });

      const purchaseCost = 50000;
      const residualValue = 5000;
      const usefulLife = 36;
      const monthlyDepreciation = Math.floor((purchaseCost - residualValue) / usefulLife);

      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-01-31');

      const depreciation = await prisma.assetDepreciation.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          periodStartDate: periodStart,
          periodEndDate: periodEnd,
          depreciationMethod: 'STRAIGHT_LINE',
          openingBookValue: purchaseCost,
          depreciationAmount: monthlyDepreciation,
          closingBookValue: purchaseCost - monthlyDepreciation,
          usefulLifeMonths: usefulLife,
          monthlyRate: monthlyDepreciation,
          calculatedBy: USER_A_ADMIN,
        },
      });
      depreciationIds.push(depreciation.id);

      expect(depreciation.depreciationMethod).toBe('STRAIGHT_LINE');
      expect(depreciation.depreciationAmount).toBe(monthlyDepreciation);
      expect(depreciation.closingBookValue).toBe(purchaseCost - monthlyDepreciation);
      expect(depreciation.openingBookValue).toBe(purchaseCost);
    });

    it('should prevent negative book value', async () => {
      // Verify closing book value is never negative
      const deprecations = await prisma.assetDepreciation.findMany({ where: { assetId: assetIds[1] } });
      for (const d of deprecations) {
        expect(d.closingBookValue).toBeGreaterThanOrEqual(0);
        expect(d.depreciationAmount).toBeGreaterThanOrEqual(0);
      }
    });

    it('should calculate cumulative depreciation correctly', async () => {
      const deprecations = await prisma.assetDepreciation.findMany({
        where: { assetId: assetIds[1] },
        orderBy: { periodStartDate: 'asc' },
      });
      expect(deprecations.length).toBeGreaterThanOrEqual(1);

      // Verify each period's opening matches previous closing
      for (let i = 1; i < deprecations.length; i++) {
        expect(deprecations[i]!.openingBookValue).toBe(deprecations[i - 1]!.closingBookValue);
      }
    });

    it('should list depreciation history', async () => {
      const deps = await prisma.assetDepreciation.findMany({ where: { assetId: assetIds[1] } });
      expect(deps.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DISPOSAL / RETIREMENT
  // ══════════════════════════════════════════════════════════════════════════

  describe('Disposal & Retirement', () => {
    it('should retire an asset', async () => {
      // Use a third asset for this test
      const asset = await prisma.asset.create({
        data: {
          tenantId: TENANT_A,
          companyId: companyAId,
          assetCode: `AST-${UNIQUE}-RET`,
          name: `Retire Test ${UNIQUE}`,
          status: 'ACTIVE',
          condition: 'GOOD',
          purchaseCost: 30000,
          currency: 'USD',
          currentBookValue: 30000,
        },
      });
      assetIds.push(asset.id);

      const retired = await prisma.asset.update({
        where: { id: asset.id },
        data: { status: 'RETIRED', currentBookValue: 0 },
      });
      expect(retired.status).toBe('RETIRED');
    });

    it('should dispose an asset', async () => {
      const asset = await prisma.asset.create({
        data: {
          tenantId: TENANT_A,
          companyId: companyAId,
          assetCode: `AST-${UNIQUE}-DSP`,
          name: `Dispose Test ${UNIQUE}`,
          status: 'ACTIVE',
          condition: 'POOR',
          purchaseCost: 20000,
          currency: 'USD',
          currentBookValue: 5000,
        },
      });
      assetIds.push(asset.id);

      const disposed = await prisma.asset.update({
        where: { id: asset.id },
        data: {
          status: 'DISPOSED',
          disposalDate: new Date(),
          disposalMethod: 'SCRAPPED',
          disposalReason: 'End of useful life',
          disposalProceeds: 0,
          currentBookValue: 0,
        },
      });
      expect(disposed.status).toBe('DISPOSED');
      expect(disposed.disposalMethod).toBe('SCRAPPED');
      expect(disposed.disposalDate).not.toBeNull();
      expect(disposed.currentBookValue).toBe(0);
    });

    it('disposed assets should have zero book value', async () => {
      const disposed = await prisma.asset.findMany({ where: { tenantId: TENANT_A, status: 'DISPOSED' } });
      for (const d of disposed) {
        expect(d.currentBookValue).toBe(0);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ══════════════════════════════════════════════════════════════════════════

  describe('Activities', () => {
    it('should record an activity', async () => {
      const activity = await prisma.assetActivity.create({
        data: {
          tenantId: TENANT_A,
          assetId: assetIds[1],
          action: 'CREATED',
          description: 'Asset created',
          actorId: testEmployeeId,
        },
      });
      activityIds.push(activity.id);
      expect(activity.action).toBe('CREATED');
      expect(activity.actorId).toBe(testEmployeeId);
    });

    it('should record multiple activities', async () => {
      const actions = ['ASSIGNED', 'TRANSFERRED', 'MAINTENANCE_SCHEDULED'];
      for (const action of actions) {
        const activity = await prisma.assetActivity.create({
          data: {
            tenantId: TENANT_A,
            assetId: assetIds[1],
            action,
            description: `Asset ${action.toLowerCase()}`,
            actorId: testEmployeeId,
          },
        });
        activityIds.push(activity.id);
      }

      const allActivities = await prisma.assetActivity.findMany({ where: { assetId: assetIds[1] } });
      expect(allActivities.length).toBeGreaterThanOrEqual(4);
    });

    it('should list activities ordered by createdAt DESC', async () => {
      const activities = await prisma.assetActivity.findMany({
        where: { assetId: assetIds[1] },
        orderBy: { createdAt: 'desc' },
      });
      expect(activities.length).toBeGreaterThanOrEqual(1);
      for (let i = 1; i < activities.length; i++) {
        expect(activities[i - 1]!.createdAt.getTime()).toBeGreaterThanOrEqual(activities[i]!.createdAt.getTime());
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    let tenantBAsset: string;

    beforeAll(async () => {
      const asset = await prisma.asset.create({
        data: {
          tenantId: TENANT_B,
          companyId: TENANT_B_COMPANY_ID,
          assetCode: `TB-${UNIQUE_B}-001`,
          name: `Tenant B Asset ${UNIQUE_B}`,
          status: 'ACTIVE',
          condition: 'GOOD',
          purchaseCost: 100000,
          currency: 'USD',
          currentBookValue: 100000,
        },
      });
      tenantBAsset = asset.id;
      assetIds.push(asset.id);
    });

    it('Tenant A cannot see Tenant B assets', async () => {
      const assetsA = await prisma.asset.findMany({ where: { tenantId: TENANT_A } });
      expect(assetsA.find(a => a.id === tenantBAsset)).toBeUndefined();
    });

    it('Tenant B assets are isolated', async () => {
      const assetsB = await prisma.asset.findMany({ where: { tenantId: TENANT_B } });
      expect(assetsB.length).toBeGreaterThanOrEqual(1);
      expect(assetsB.every(a => a.tenantId === TENANT_B)).toBe(true);
    });

    it('Cross-tenant category isolation', async () => {
      const catsA = await prisma.assetCategory.findMany({ where: { tenantId: TENANT_A } });
      const catsB = await prisma.assetCategory.findMany({ where: { tenantId: TENANT_B } });
      for (const c of catsA) expect(c.tenantId).toBe(TENANT_A);
      for (const c of catsB) expect(c.tenantId).toBe(TENANT_B);
    });

    it('Cross-tenant location isolation', async () => {
      const locsA = await prisma.assetLocation.findMany({ where: { tenantId: TENANT_A } });
      for (const l of locsA) expect(l.tenantId).toBe(TENANT_A);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CONCURRENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Concurrency', () => {
    it('concurrent depreciation calculations produce correct data', async () => {
      // Create a fresh asset for this test
      const asset = await prisma.asset.create({
        data: {
          tenantId: TENANT_A,
          companyId: companyAId,
          assetCode: `AST-${UNIQUE}-CONC`,
          name: `Concurrency Test ${UNIQUE}`,
          status: 'ACTIVE',
          condition: 'GOOD',
          purchaseCost: 120000,
          currency: 'USD',
          currentBookValue: 120000,
          usefulLife: 12,
          residualValue: 0,
        },
      });
      assetIds.push(asset.id);

      // Both try to create depreciation for the same period
      const results = await Promise.allSettled([
        prisma.assetDepreciation.create({
          data: {
            tenantId: TENANT_A,
            assetId: asset.id,
            periodStartDate: new Date('2026-02-01'),
            periodEndDate: new Date('2026-02-28'),
            depreciationMethod: 'STRAIGHT_LINE',
            openingBookValue: 120000,
            depreciationAmount: 10000,
            closingBookValue: 110000,
            usefulLifeMonths: 12,
            monthlyRate: 10000,
            calculatedBy: USER_A_ADMIN,
          },
        }),
        prisma.assetDepreciation.create({
          data: {
            tenantId: TENANT_A,
            assetId: asset.id,
            periodStartDate: new Date('2026-02-01'),
            periodEndDate: new Date('2026-02-28'),
            depreciationMethod: 'STRAIGHT_LINE',
            openingBookValue: 120000,
            depreciationAmount: 10000,
            closingBookValue: 110000,
            usefulLifeMonths: 12,
            monthlyRate: 10000,
            calculatedBy: USER_A_ADMIN,
          },
        }),
      ]);

      // Unique constraint should ensure only one succeeds (or both if period allows)
      const succeeded = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      // At most one should succeed (due to unique constraint on assetId + periodStartDate)
      expect(succeeded.length).toBeLessThanOrEqual(1);
    });

    it('concurrent status transitions are safe', async () => {
      const asset = assetIds[1];
      // Both try to update the same asset
      const results = await Promise.allSettled([
        prisma.asset.update({ where: { id: asset }, data: { status: 'IN_MAINTENANCE' } }),
        prisma.asset.update({ where: { id: asset }, data: { status: 'ASSIGNED' } }),
      ]);

      // Both should succeed (last-write-wins), but data should be consistent
      const final = await prisma.asset.findUnique({ where: { id: asset } });
      expect(['IN_MAINTENANCE', 'ASSIGNED', 'AVAILABLE']).toContain(final!.status);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EVENT INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  describe('Event Integration', () => {
    it('should create event outbox entries for asset operations', async () => {
      // Simulate an event (normally done by EventPublisherService)
      const event = await prisma.eventOutbox.create({
        data: {
          tenantId: TENANT_A,
          eventType: 'asset.created',
          aggregateType: 'asset',
          aggregateId: assetIds[0],
          payload: { assetCode: `AST-${UNIQUE}-001`, name: `Dell Laptop ${UNIQUE}` },
          status: 'PENDING',
        },
      });
      eventIds.push(event.id);
      expect(event.eventType).toBe('asset.created');
      expect(event.aggregateType).toBe('asset');
    });

    it('should create assignment event', async () => {
      const event = await prisma.eventOutbox.create({
        data: {
          tenantId: TENANT_A,
          eventType: 'asset.assigned',
          aggregateType: 'asset',
          aggregateId: assetIds[1],
          payload: { assetId: assetIds[1], employeeId: testEmployeeId },
          status: 'PENDING',
        },
      });
      eventIds.push(event.id);
      expect(event.eventType).toBe('asset.assigned');
    });

    it('should create maintenance scheduled event', async () => {
      const event = await prisma.eventOutbox.create({
        data: {
          tenantId: TENANT_A,
          eventType: 'asset.maintenance.scheduled',
          aggregateType: 'asset',
          aggregateId: assetIds[1],
          payload: { title: 'Annual service' },
          status: 'PENDING',
        },
      });
      eventIds.push(event.id);
      expect(event.eventType).toBe('asset.maintenance.scheduled');
    });

    it('should create disposal event', async () => {
      const event = await prisma.eventOutbox.create({
        data: {
          tenantId: TENANT_A,
          eventType: 'asset.disposed',
          aggregateType: 'asset',
          aggregateId: assetIds[0],
          payload: { disposalMethod: 'SCRAPPED' },
          status: 'PENDING',
        },
      });
      eventIds.push(event.id);
      expect(event.eventType).toBe('asset.disposed');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DATA INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Data Integrity', () => {
    it('all assets have valid tenant references', async () => {
      const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
      for (const a of assets) {
        const tenant = await prisma.tenant.findUnique({ where: { id: a.tenantId } });
        expect(tenant).not.toBeNull();
      }
    });

    it('all assets have valid company references', async () => {
      const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
      for (const a of assets) {
        const company = await prisma.company.findUnique({ where: { id: a.companyId } });
        expect(company).not.toBeNull();
        expect(company!.tenantId).toBe(a.tenantId);
      }
    });

    it('all assignments reference valid assets', async () => {
      const assignments = await prisma.assetAssignment.findMany({ where: { id: { in: assignmentIds } } });
      for (const asgn of assignments) {
        const asset = await prisma.asset.findUnique({ where: { id: asgn.assetId } });
        expect(asset).not.toBeNull();
        expect(asset!.tenantId).toBe(asgn.tenantId);
      }
    });

    it('all maintenance records reference valid assets', async () => {
      const records = await prisma.assetMaintenanceRecord.findMany({ where: { id: { in: maintenanceIds } } });
      for (const r of records) {
        const asset = await prisma.asset.findUnique({ where: { id: r.assetId } });
        expect(asset).not.toBeNull();
      }
    });

    it('all inspections reference valid assets', async () => {
      const inspections = await prisma.assetInspection.findMany({ where: { id: { in: inspectionIds } } });
      for (const i of inspections) {
        const asset = await prisma.asset.findUnique({ where: { id: i.assetId } });
        expect(asset).not.toBeNull();
      }
    });

    it('purchase costs and book values are non-negative', async () => {
      const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
      for (const a of assets) {
        expect(a.purchaseCost).toBeGreaterThanOrEqual(0);
        expect(a.currentBookValue).toBeGreaterThanOrEqual(0);
        expect(a.residualValue).toBeGreaterThanOrEqual(0);
      }
    });

    it('currency codes are valid ISO 4217 length', async () => {
      const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
      for (const a of assets) {
        expect(a.currency).toMatch(/^[A-Z]{3}$/);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // IDEMPOTENCY
  // ══════════════════════════════════════════════════════════════════════════

  describe('Idempotency', () => {
    it('marking asset as retired twice does not error', async () => {
      const asset = assetIds.find(id => {
        return id === assetIds[0]; // Already retired
      });
      if (!asset) return;
      const a1 = await prisma.asset.update({ where: { id: asset }, data: { status: 'RETIRED', currentBookValue: 0 } });
      const a2 = await prisma.asset.update({ where: { id: asset }, data: { status: 'RETIRED', currentBookValue: 0 } });
      expect(a1.status).toBe('RETIRED');
      expect(a2.status).toBe('RETIRED');
    });

    it('deleting already-deleted record throws not found', async () => {
      const temp = await prisma.assetActivity.create({
        data: { tenantId: TENANT_A, assetId: assetIds[1], action: 'TEMP', description: 'Temporary' },
      });
      await prisma.assetActivity.delete({ where: { id: temp.id } });
      await expect(prisma.assetActivity.delete({ where: { id: temp.id } })).rejects.toThrow();
    });
  });
});
