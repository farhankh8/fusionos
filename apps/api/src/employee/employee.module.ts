/**
 * FusionOS Employee Module
 *
 * Provides the canonical Employee management functionality.
 * Every future module references this entity.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './services/employee.service';

@Module({
  controllers: [EmployeeController],
  providers: [PrismaClient, EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
