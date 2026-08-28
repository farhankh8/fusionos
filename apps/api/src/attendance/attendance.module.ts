/**
 * FusionOS Attendance Module
 *
 * Provides attendance management: clock-in/out, breaks, corrections.
 */

import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './services/attendance.service';

@Module({
  controllers: [AttendanceController],
  providers: [PrismaClient, AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
