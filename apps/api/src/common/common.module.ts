/**
 * FusionOS Common Module
 *
 * Provides shared infrastructure for authorization, guards, and audit logging.
 * Import this module in any feature module that needs authorization.
 */

import { Module, Global } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RBACGuard } from './guards/rbac.guard';
import { SecurityAuditService } from './services/security-audit.service';
import { TenantContextService } from '../auth/services/tenant-context.service';

@Global()
@Module({
  providers: [
    PrismaClient,
    TenantContextService,
    RBACGuard,
    SecurityAuditService,
  ],
  exports: [
    TenantContextService,
    RBACGuard,
    SecurityAuditService,
  ],
})
export class CommonModule {}
