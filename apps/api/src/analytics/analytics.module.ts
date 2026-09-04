/**
 * FusionOS Analytics Module
 *
 * Enterprise Analytics & Business Intelligence.
 * READ-ONLY with respect to operational data.
 */

import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { AuditLogService } from '../common/services/audit-log.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AuditLogService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
