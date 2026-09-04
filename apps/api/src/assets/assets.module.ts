/**
 * FusionOS Assets Module
 */

import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetService } from './services/asset.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { EventPublisherService } from '../common/services/event-publisher.service';

@Module({
  controllers: [AssetsController],
  providers: [AssetService, AuditLogService, EventPublisherService],
  exports: [AssetService],
})
export class AssetsModule {}
