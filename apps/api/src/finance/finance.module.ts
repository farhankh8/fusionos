/**
 * FusionOS Finance Module
 * Accounting, reporting, AR/AP, expenses, banking.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FinanceController } from './finance.controller';
import { FinanceService } from './services/finance.service';

@Module({
  controllers: [FinanceController],
  providers: [
    FinanceService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
