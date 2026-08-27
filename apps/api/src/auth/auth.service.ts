/**
 * FusionOS Authentication Service
 *
 * Core business logic for all authentication operations.
 * This service orchestrates password hashing, token generation,
 * session management, email verification, password reset, and MFA.
 */

import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient, UserStatus } from '@prisma/client';
import * as otpauth from 'otpauth';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { EmailService } from './email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
  ) {}

  // ── Registration ─────────────────────────────────────────────────────────

  /**
   * Register a new user account.
   */
  async register(
    dto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      // Don't reveal that the email already exists (enumeration protection)
      return {
        message: 'If this email is available, a verification link has been sent.',
      };
    }

    // Validate password policy
    const passwordError = this.passwordService.validatePasswordPolicy(dto.password);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        status: 'PENDING_VERIFICATION',
        isEmailVerified: false,
      },
    });

    // Generate verification token
    const verificationToken = this.tokenService.generateRandomToken();
    const tokenHash = this.tokenService.hashToken(verificationToken);

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email (dev mode: logs to console)
    const baseUrl = process.env['WEB_BASE_URL'] ?? 'http://localhost:3000';
    await this.emailService.sendVerificationEmail(user.email, verificationToken, baseUrl);

    // Log security event
    await this.logAuthEvent(user.id, 'register', ipAddress, userAgent);

    this.logger.log(`User registered: ${user.email} (${user.id})`);

    return {
      message: 'If this email is available, a verification link has been sent.',
      userId: user.id, // Only returned in dev mode for testing
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────

  /**
   * Authenticate a user with email and password.
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        status: true,
        mfaEnabled: true,
        mfaSecret: true,
      },
    });

    // Use a generic error message to prevent email enumeration
    const invalidCredentials = 'Invalid email or password';

    if (!user) {
      // Log the attempt against a non-existent email (for security monitoring)
      await this.logAuthEvent(null, 'login_failure', ipAddress, userAgent, {
        reason: 'user_not_found',
        email: dto.email,
      });
      throw new UnauthorizedException(invalidCredentials);
    }

    // Check account status
    if (user.status === 'PENDING_VERIFICATION') {
      throw new UnauthorizedException('Please verify your email address before logging in');
    }
    if (user.status === 'LOCKED') {
      throw new UnauthorizedException('Account is locked. Please contact support.');
    }
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Account is inactive. Please contact support.');
    }

    // Verify password
    const passwordValid = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.logAuthEvent(user.id, 'login_failure', ipAddress, userAgent, {
        reason: 'invalid_password',
      });
      throw new UnauthorizedException(invalidCredentials);
    }

    // Check MFA
    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        // Return a partial response indicating MFA is required
        return {
          requiresMfa: true,
          message: 'MFA code required',
        };
      }

      // Verify TOTP code
      const totp = new otpauth.TOTP({
        issuer: 'FusionOS',
        label: user.email,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: otpauth.Secret.fromBase32(user.mfaSecret ?? ''),
      });

      const delta = totp.validate({ token: dto.mfaCode, window: 1 });
      if (delta === null) {
        await this.logAuthEvent(user.id, 'mfa_failure', ipAddress, userAgent);
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Create session
    const session = await this.sessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log success
    await this.logAuthEvent(user.id, 'login_success', ipAddress, userAgent);

    this.logger.log(`User logged in: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      session: {
        sessionId: session.sessionId,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        accessTokenExpiresAt: session.accessTokenExpiresAt,
      },
    };
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  /**
   * Log out a user by revoking their session.
   */
  async logout(sessionId: string, userId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
    await this.logAuthEvent(userId, 'logout');
    this.logger.log(`User logged out: session ${sessionId}`);
  }

  /**
   * Log out by finding the session from the access token hash.
   */
  async logoutByAccessToken(accessToken: string, userId: string): Promise<void> {
    await this.sessionService.revokeSessionByAccessToken(accessToken);
    await this.logAuthEvent(userId, 'logout');
    this.logger.log(`User logged out by access token: ${userId}`);
  }

  /**
   * Log out from all sessions.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAllSessions(userId);
    await this.logAuthEvent(userId, 'logout_all');
    this.logger.log(`User logged out from all sessions: ${userId}`);
  }

  // ── Refresh ──────────────────────────────────────────────────────────────

  /**
   * Refresh an access token using a refresh token.
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.sessionService.refreshSession(refreshToken, ipAddress, userAgent);
  }

  // ── Current User ─────────────────────────────────────────────────────────

  /**
   * Get the current authenticated user's profile.
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        isEmailVerified: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ── Email Verification ───────────────────────────────────────────────────

  /**
   * Verify a user's email address using a verification token.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = this.tokenService.hashToken(dto.token);

    const verificationToken = await this.prisma.verificationToken.findFirst({
      where: {
        token: tokenHash,
        type: 'email_verification',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark token as used
    await this.prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    // Update user
    await this.prisma.user.update({
      where: { id: verificationToken.userId },
      data: {
        isEmailVerified: true,
        status: 'ACTIVE',
      },
    });

    await this.logAuthEvent(verificationToken.userId, 'email_verified');

    this.logger.log(`Email verified: user ${verificationToken.userId}`);

    return { message: 'Email verified successfully' };
  }

  /**
   * Resend email verification.
   */
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent enumeration
    if (!user || user.isEmailVerified) {
      return { message: 'If this email is unverified, a new link has been sent.' };
    }

    // Invalidate old tokens
    await this.prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: 'email_verification',
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Generate new token
    const verificationToken = this.tokenService.generateRandomToken();
    const tokenHash = this.tokenService.hashToken(verificationToken);

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const baseUrl = process.env['WEB_BASE_URL'] ?? 'http://localhost:3000';
    await this.emailService.sendVerificationEmail(user.email, verificationToken, baseUrl);

    return { message: 'If this email is unverified, a new link has been sent.' };
  }

  // ── Password Reset ───────────────────────────────────────────────────────

  /**
   * Request a password reset.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always return success to prevent enumeration
    if (!user) {
      return { message: 'If this email exists, a reset link has been sent.' };
    }

    // Invalidate old reset tokens
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Generate reset token
    const resetToken = this.tokenService.generateRandomToken();
    const tokenHash = this.tokenService.hashToken(resetToken);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const baseUrl = process.env['WEB_BASE_URL'] ?? 'http://localhost:3000';
    await this.emailService.sendPasswordResetEmail(user.email, resetToken, baseUrl);

    await this.logAuthEvent(user.id, 'password_reset_requested');

    this.logger.log(`Password reset requested: ${user.email}`);

    return { message: 'If this email exists, a reset link has been sent.' };
  }

  /**
   * Reset a user's password using a reset token.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.tokenService.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token: tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate new password policy
    const passwordError = this.passwordService.validatePasswordPolicy(dto.newPassword);
    if (passwordError) {
      throw new BadRequestException(passwordError);
    }

    // Hash new password
    const passwordHash = await this.passwordService.hash(dto.newPassword);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all existing sessions (security best practice)
      this.prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    await this.logAuthEvent(resetToken.userId, 'password_reset_completed');

    this.logger.log(`Password reset completed: user ${resetToken.userId}`);

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ── MFA ──────────────────────────────────────────────────────────────────

  /**
   * Initialize MFA setup — returns a TOTP secret and QR code URL.
   */
  async initMfaSetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabled) throw new BadRequestException('MFA is already enabled');

    // Generate TOTP secret
    const totp = new otpauth.TOTP({
      issuer: 'FusionOS',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new otpauth.Secret({ size: 20 }),
    });

    // Store the secret temporarily (will be confirmed on verification)
    // We store it as a base32 string
    const secret = totp.secret.base32;

    return {
      secret,
      otpauthUrl: totp.toString(),
      message: 'Scan the QR code or enter the secret in your authenticator app, then verify with a code.',
    };
  }

  /**
   * Enable MFA after verifying a TOTP code.
   */
  async enableMfa(userId: string, secret: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.mfaEnabled) throw new BadRequestException('MFA is already enabled');

    // Verify the code against the provided secret
    const totp = new otpauth.TOTP({
      issuer: 'FusionOS',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: otpauth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new BadRequestException('Invalid MFA code. Please try again.');
    }

    // Enable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });

    await this.logAuthEvent(userId, 'mfa_enabled');

    this.logger.log(`MFA enabled: user ${userId}`);

    return { message: 'MFA enabled successfully' };
  }

  /**
   * Disable MFA.
   */
  async disableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    // Verify the code
    const totp = new otpauth.TOTP({
      issuer: 'FusionOS',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: otpauth.Secret.fromBase32(user.mfaSecret ?? ''),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      throw new BadRequestException('Invalid MFA code');
    }

    // Disable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    await this.logAuthEvent(userId, 'mfa_disabled');

    this.logger.log(`MFA disabled: user ${userId}`);

    return { message: 'MFA disabled successfully' };
  }

  // ── Sessions ─────────────────────────────────────────────────────────────

  /**
   * Get active sessions for a user.
   */
  async getSessions(userId: string) {
    return this.sessionService.getActiveSessions(userId);
  }

  /**
   * Revoke a specific session.
   */
  async revokeSession(sessionId: string, userId: string) {
    await this.sessionService.revokeSession(sessionId);
    await this.logAuthEvent(userId, 'session_revoked', undefined, undefined, { sessionId });
  }

  // ── Security Events ──────────────────────────────────────────────────────

  private async logAuthEvent(
    userId: string | null,
    eventType: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.authEvent.create({
        data: {
          userId,
          eventType,
          ipAddress,
          userAgent,
          metadata: (metadata as Record<string, string>) ?? undefined,
        },
      });
    } catch (error) {
      // Don't let event logging failure break authentication
      this.logger.warn(`Failed to log auth event: ${eventType}`, error);
    }
  }
}
