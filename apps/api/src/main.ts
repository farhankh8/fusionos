/**
 * FusionOS API — Application Entry Point
 *
 * NestJS modular monolith serving as the single backend for all FusionOS domains.
 * This is the foundation — domain modules will be added in later phases.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  const allowedOrigins = (process.env['CORS_ORIGIN'] ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Tenant-Id'],
    credentials: true,
    maxAge: 86400,
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

  // ── Swagger / OpenAPI ──────────────────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('FusionOS API')
      .setDescription('FusionOS by ZORVEXA — AI-native Business Operating System API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
        'jwt-auth',
      )
      .addTag('Auth', 'Authentication and token management')
      .addTag('Organization', 'Company, branches, departments, teams')
      .addTag('Employees', 'Employee management')
      .addTag('Attendance', 'Attendance tracking')
      .addTag('Leave', 'Leave management')
      .addTag('Payroll', 'Payroll processing')
      .addTag('Finance', 'Finance and accounting')
      .addTag('CRM', 'Customer relationship management')
      .addTag('Projects', 'Project management')
      .addTag('Documents', 'Document management')
      .addTag('Assets', 'Asset management')
      .addTag('Analytics', 'Business analytics')
      .addTag('Automation', 'Workflow automation')
      .addTag('AI', 'AI Command Center and runtime')
      .addTag('AI Agents', 'AI Agent platform')
      .addTag('Intelligence', 'Cross-module business intelligence')
      .addTag('Health', 'System health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log(`📚 Swagger docs: http://localhost:${process.env['PORT'] ?? 3001}/api/docs`);
  }

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  logger.log(`🚀 FusionOS API running on http://localhost:${port}/api/v1`);
  logger.log(`📋 Health check: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start FusionOS API:', error);
  process.exit(1);
});
