/**
 * FusionOS Root Application Module
 *
 * This is the root module of the NestJS modular monolith.
 * Domain modules will be registered here as they are implemented.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RBACGuard } from './common/guards/rbac.guard';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Infrastructure ────────────────────────────────────────────────────
    CommonModule, // Global module — exports TenantContextService, RBACGuard, etc.

    // ── Domain Modules ────────────────────────────────────────────────────
    AuthModule,
    // Phase 5: OrganizationModule
    // Phase 6: EmployeesModule
    // Phase 7: AttendanceModule
    // Phase 8: LeaveModule
    // Phase 9: PayrollModule
    // Phase 10: FinanceModule
    // Phase 11: CrmModule
    // Phase 12: ProjectsModule
    // Phase 13: AssetsModule
    // Phase 14: NotificationsModule
    // Phase 15: AiModule
    // Phase 17: EventsModule
    // Phase 18: AutomationModule
    // Phase 21: AnalyticsModule

    // ── Infrastructure ────────────────────────────────────────────────────
    HealthModule,
  ],
  providers: [
    // Global guards — executed in order
    // 1. JwtAuthGuard: authenticates the user (checks JWT)
    // 2. RBACGuard: authorizes the action (checks permissions/roles)
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
