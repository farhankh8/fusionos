import { Module } from '@nestjs/common';
import { LeaveController } from './leave.controller';
import { LeaveService } from './services/leave.service';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}