/**
 * FusionOS Root Application Module
 *
 * This is the root module of the NestJS modular monolith.
 * Domain modules will be registered here as they are implemented.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Domain Modules ────────────────────────────────────────────────────
    // Phase 2: DatabaseModule
    AuthModule,
    // Phase 4: TenancyModule
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
})
export class AppModule {}
