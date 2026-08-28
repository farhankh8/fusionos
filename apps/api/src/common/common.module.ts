/**
 * FusionOS Common Module
 *
 * Provides shared infrastructure for authorization, guards, audit logging,
 * and event publishing.
 */

import { Module, Global } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RBACGuard } from './guards/rbac.guard';
import { SecurityAuditService } from './services/security-audit.service';
import { EventPublisherService } from './services/event-publisher.service';
import { TenantContextService } from '../auth/services/tenant-context.service';

@Global()
@Module({
  providers: [
    PrismaClient,
    TenantContextService,
    RBACGuard,
    SecurityAuditService,
    EventPublisherService,
  ],
  exports: [
    TenantContextService,
    RBACGuard,
    SecurityAuditService,
    EventPublisherService,
  ],
})
export class CommonModule {}
