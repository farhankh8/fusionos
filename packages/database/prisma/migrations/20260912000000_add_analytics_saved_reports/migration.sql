-- Add canonical Analytics saved-reports table (was missing from the migration history)
--
-- Generated from canonical Prisma schema via `prisma migrate diff`, cross-checked so the
-- final schema exactly matches the Prisma datamodel.

CREATE TABLE "saved_reports" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "domain" VARCHAR(50) NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "saved_reports_tenantId_idx" ON "saved_reports"("tenantId");
CREATE INDEX "saved_reports_tenantId_domain_idx" ON "saved_reports"("tenantId", "domain");
CREATE INDEX "saved_reports_createdBy_idx" ON "saved_reports"("createdBy");
CREATE UNIQUE INDEX "saved_reports_tenantId_name_key" ON "saved_reports"("tenantId", "name");
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
