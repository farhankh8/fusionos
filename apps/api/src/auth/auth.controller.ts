/**
 * FusionOS Authentication Controller
 *
 * All authentication endpoints under /api/v1/auth.
 * Protected endpoints use the JwtAuthGuard.
 * Public endpoints are marked with @Public().
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CurrentUser, type AuthenticatedUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MfaEnableDto, MfaDisableDto } from './dto/mfa.dto';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Public Endpoints ─────────────────────────────────────────────────────

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }, @Req() req: Request) {
    return this.authService.refreshTokens(
      body.refreshToken,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── Protected Endpoints ──────────────────────────────────────────────────

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getCurrentUser(user.userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    // Find session by access token hash from the Authorization header
    const authHeader = req.headers['authorization'] as string | undefined;
    const accessToken = authHeader?.replace('Bearer ', '');
    if (accessToken) {
      await this.authService.logoutByAccessToken(accessToken, user.userId);
    }
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logoutAll(user.userId);
    return { message: 'Logged out from all sessions' };
  }

  @Get('sessions')
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getSessions(user.userId);
  }

  @Post('sessions/:sessionId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const sessionId = req.params['sessionId'];
    if (typeof sessionId === 'string') {
      await this.authService.revokeSession(sessionId, user.userId);
    }
    return { message: 'Session revoked' };
  }

  // ── MFA Endpoints ────────────────────────────────────────────────────────

  @Post('mfa/setup')
  async initMfaSetup(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.initMfaSetup(user.userId);
  }

  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  async enableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaEnableDto) {
    return this.authService.enableMfa(user.userId, dto.secret, dto.code);
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.OK)
  async disableMfa(@CurrentUser() user: AuthenticatedUser, @Body() dto: MfaDisableDto) {
    return this.authService.disableMfa(user.userId, dto.code);
  }
}
