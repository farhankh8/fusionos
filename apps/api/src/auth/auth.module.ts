/**
 * FusionOS Authentication Module
 *
 * Provides complete authentication infrastructure:
 * - Registration with email verification
 * - Login with session management
 * - JWT access/refresh token architecture
 * - Password reset flow
 * - TOTP MFA
 * - Security event logging
 * - Rate limiting
 */

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaClient } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { EmailService } from './email.service';
import { LoginAttemptService } from './login-attempt.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaClient,
    AuthService,
    PasswordService,
    TokenService,
    SessionService,
    EmailService,
    LoginAttemptService,
    JwtStrategy,
  ],
  exports: [AuthService, TokenService, SessionService],
})
export class AuthModule {}
