/**
 * FusionOS Automation Module
 *
 * Enterprise Automation & Workflow Engine.
 * Provides workflow lifecycle, execution, condition evaluation,
 * action execution, and approval management.
 */

import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { AutomationService } from './services/automation.service';

@Module({
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
