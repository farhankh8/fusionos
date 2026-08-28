-- Phase 6: Attendance Management Migration

-- ═══════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE "AttendanceEventSource" AS ENUM ('WEB', 'DESKTOP', 'MOBILE', 'BIOMETRIC', 'ADMIN', 'IMPORT', 'API', 'SYSTEM');
CREATE TYPE "AttendanceEventType" AS ENUM ('CLOCK_IN', 'CLOCK_OUT', 'BREAK_START', 'BREAK_END', 'MANUAL_CORRECTION', 'SYSTEM_ADJUSTMENT');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'EARLY_DEPARTURE', 'OVERTIME', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF', 'INCOMPLETE');
CREATE TYPE "AttendanceRecordStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'LOCKED');
CREATE TYPE "CorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Raw attendance events (immutable evidence)
CREATE TABLE "attendance_events" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "eventType" "AttendanceEventType" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "source" "AttendanceEventSource" NOT NULL DEFAULT 'WEB',
    "sourceRef" VARCHAR(255),
    "idempotencyKey" VARCHAR(255),
    "notes" TEXT,
    "actorId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- Calculated daily attendance records
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "recordStatus" "AttendanceRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "firstClockIn" TIMESTAMP(3),
    "lastClockOut" TIMESTAMP(3),
    "totalWorkedMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalBreakMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyDepartureMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "source" "AttendanceEventSource" NOT NULL DEFAULT 'WEB',
    "notes" TEXT,
    "calculatedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- Attendance correction requests
CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "attendanceId" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "requestedBy" UUID NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'PENDING',
    "correctionType" VARCHAR(50) NOT NULL,
    "originalValue" JSONB,
    "newValue" JSONB,
    "reason" VARCHAR(500) NOT NULL,
    "reviewedBy" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

-- ═══════════════════════════════════════════════════════════════════════════
-- UNIQUE CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX "attendance_events_tenantId_idempotencyKey_key" ON "attendance_events"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX "attendance_tenantId_employeeId_date_key" ON "attendance"("tenantId", "employeeId", "date");

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX "attendance_events_tenantId_idx" ON "attendance_events"("tenantId");
CREATE INDEX "attendance_events_employeeId_idx" ON "attendance_events"("employeeId");
CREATE INDEX "attendance_events_employeeId_eventTime_idx" ON "attendance_events"("employeeId", "eventTime");
CREATE INDEX "attendance_events_tenantId_eventTime_idx" ON "attendance_events"("tenantId", "eventTime");
CREATE INDEX "attendance_events_idempotencyKey_idx" ON "attendance_events"("idempotencyKey");

CREATE INDEX "attendance_tenantId_idx" ON "attendance"("tenantId");
CREATE INDEX "attendance_employeeId_idx" ON "attendance"("employeeId");
CREATE INDEX "attendance_tenantId_date_idx" ON "attendance"("tenantId", "date");
CREATE INDEX "attendance_employeeId_date_idx" ON "attendance"("employeeId", "date");
CREATE INDEX "attendance_tenantId_status_idx" ON "attendance"("tenantId", "status");
CREATE INDEX "attendance_tenantId_recordStatus_idx" ON "attendance"("tenantId", "recordStatus");

CREATE INDEX "attendance_corrections_tenantId_idx" ON "attendance_corrections"("tenantId");
CREATE INDEX "attendance_corrections_attendanceId_idx" ON "attendance_corrections"("attendanceId");
CREATE INDEX "attendance_corrections_employeeId_idx" ON "attendance_corrections"("employeeId");
CREATE INDEX "attendance_corrections_status_idx" ON "attendance_corrections"("status");

-- ═══════════════════════════════════════════════════════════════════════════
-- FOREIGN KEYS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendanceId_fkey"
    FOREIGN KEY ("attendanceId") REFERENCES "attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
