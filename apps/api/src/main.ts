/**
 * FusionOS API — Application Entry Point
 *
 * NestJS modular monolith serving as the single backend for all FusionOS domains.
 * This is the foundation — domain modules will be added in later phases.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── Security Headers ─────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Global Prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Global Validation Pipe ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global Exception Filter ──────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ── Global Request ID Interceptor ─────────────────────────────────────────
  app.useGlobalInterceptors(new RequestIdInterceptor());

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  app.enableShutdownHooks();

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  logger.log(`🚀 FusionOS API running on http://localhost:${port}/api/v1`);
  logger.log(`📋 Health check: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start FusionOS API:', error);
  process.exit(1);
});
