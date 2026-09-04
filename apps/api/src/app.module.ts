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
import { FinanceModule } from './finance/finance.module';
import { CrmModule } from './crm/crm.module';
import { ProjectsModule } from './projects/projects.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AssetsModule } from './assets/assets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AutomationModule } from './automation/automation.module';
import { AIModule } from './ai/ai.module';
import { AgentModule } from './ai/agent/agent.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RBACGuard } from './common/guards/rbac.guard';
import { AppThrottlerGuard } from './common/throttler/throttler.guard';
import { RedisThrottlerStorage } from './common/throttler/redis-throttler.storage';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate Limiting ─────────────────────────────────────────────────────
    // Only the GENERAL limiter is global. Strict brute-force limits (login,
    // register, password reset) are applied per-route on the auth controller
    // via @Throttle — a global 5-request 'auth' limiter would throttle the
    // ENTIRE API after a handful of requests from any IP.
    // General limit is env-tunable (RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX)
    // so load testing and high-traffic deployments can raise the ceiling.
    // Storage is Redis-backed (RedisThrottlerStorage) for consistent limiting
    // across instances, with transparent in-memory fallback when Redis is
    // unavailable — requests never hang and PostgreSQL stays authoritative.
    ThrottlerModule.forRootAsync({
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [
          {
            name: 'general',
            ttl: Number(process.env['RATE_LIMIT_WINDOW_MS'] ?? 15 * 60 * 1000),
            limit: Number(process.env['RATE_LIMIT_MAX'] ?? 100),
          },
        ],
        storage,
      }),
    }),

    // ── Infrastructure ────────────────────────────────────────────────────
    CommonModule, // Global module — exports TenantContextService, RBACGuard, etc.

    // ── Domain Modules ────────────────────────────────────────────────────
    AuthModule,
    OrganizationModule,
    EmployeeModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    FinanceModule,
    CrmModule,
    ProjectsModule,
    DocumentsModule,
    NotificationsModule,
    AssetsModule,
    AnalyticsModule,
    AutomationModule,
    AIModule,
    AgentModule,
    IntelligenceModule,

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
