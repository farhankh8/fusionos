/**
 * FusionOS Root Application Module
 *
 * This is the root module of the NestJS modular monolith.
 * Domain modules will be registered here as they are implemented.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { OrganizationModule } from './organization/organization.module';
import { EmployeeModule } from './employee/employee.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { PayrollModule } from './payroll/payroll.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RBACGuard } from './common/guards/rbac.guard';
import { AppThrottlerGuard } from './common/throttler/throttler.guard';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate Limiting ─────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: 5,            // 5 attempts per window
      },
      {
        name: 'general',
        ttl: 15 * 60 * 1000, // 15 minutes
        limit: 100,          // 100 requests per window
      },
    ]),

    // ── Infrastructure ────────────────────────────────────────────────────
    CommonModule, // Global module — exports TenantContextService, RBACGuard, etc.

    // ── Domain Modules ────────────────────────────────────────────────────
    AuthModule,
    OrganizationModule,
    EmployeeModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,

    // ── Infrastructure ────────────────────────────────────────────────────
    HealthModule,
  ],
  providers: [
    // Global guards — executed in order
    // 1. ThrottlerGuard: rate limiting
    // 2. JwtAuthGuard: authenticates the user (checks JWT)
    // 3. RBACGuard: authorizes the action (checks permissions/roles)
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
  ],
})
export class AppModule {}
