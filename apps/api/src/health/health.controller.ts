import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import type { HealthCheckResult } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    return this.healthService.getHealth();
  }
}
