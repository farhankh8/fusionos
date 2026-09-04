/**
 * FusionOS CRM Module
 * Customer Relationship Management — extends existing Finance Customer entity.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CrmController } from './crm.controller';
import { CrmService } from './services/crm.service';

@Module({
  controllers: [CrmController],
  providers: [
    CrmService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [CrmService],
})
export class CrmModule {}
