/**
 * FusionOS Session Service
 *
 * Manages authenticated user sessions in the database.
 * Sessions are created on login, invalidated on logout,
 * and can be revoked by the user.
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { TokenService } from './token.service';

export interface CreateSessionParams {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Create a new session for a user.
   * Returns the session ID and token pair.
   */
  async createSession(params: CreateSessionParams): Promise<{
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
  }> {
    // Generate token pair FIRST to get unique hashes
    const tempId = crypto.randomUUID();
    const tokens = await this.tokenService.generateTokenPair(
      params.userId,
      '', // email not needed in refresh token
      tempId,
    );
    const tokenHash = this.tokenService.hashToken(tokens.accessToken);
    const refreshTokenHash = this.tokenService.hashToken(tokens.refreshToken);

    // Create session record with unique token hashes
    const session = await this.prisma.session.create({
      data: {
        userId: params.userId,
        token: tokenHash,
        refreshToken: refreshTokenHash,
        expiresAt: new Date(Date.now() + this.tokenService.getRefreshTokenExpiryMs()),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    this.logger.log(`Session created: ${session.id} for user ${params.userId}`);

    return {
      sessionId: session.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    };
  }

  /**
   * Validate a session by its token.
   * Returns the session if valid, throws if invalid/expired/revoked.
   */
  async validateSession(accessToken: string): Promise<{ sessionId: string; userId: string }> {
    // Verify the JWT
    const payload = await this.tokenService.verifyAccessToken(accessToken);

    // Hash the token and find the session
    const tokenHash = this.tokenService.hashToken(accessToken);
    const session = await this.prisma.session.findFirst({
      where: {
        token: tokenHash,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Update last used timestamp (fire-and-forget)
    this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {
      // Non-critical — don't fail the request
    });

    return { sessionId: session.id, userId: session.userId ?? payload.sub as string };
  }

  /**
   * Refresh a session using a refresh token.
   * Rotates the refresh token (old one is invalidated).
   */
  async refreshSession(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: Date;
  }> {
    // Verify the refresh token JWT
    await this.tokenService.verifyRefreshToken(refreshToken);

    // Find the session by refresh token hash
    const refreshTokenHash = this.tokenService.hashToken(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken: refreshTokenHash,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Get user email for the new access token
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Generate new token pair (rotation)
    const tokens = await this.tokenService.generateTokenPair(
      session.userId,
      user.email,
      session.id,
    );

    // Update session with new token hashes
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        token: this.tokenService.hashToken(tokens.accessToken),
        refreshToken: this.tokenService.hashToken(tokens.refreshToken),
        ipAddress: ipAddress ?? session.ipAddress,
        userAgent: userAgent ?? session.userAgent,
      },
    });

    return tokens;
  }

  /**
   * Revoke a specific session (logout).
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id: sessionId },
    }).catch(() => {
      // Session may already be deleted
    });
  }

  /**
   * Revoke a session by looking up its access token hash.
   */
  async revokeSessionByAccessToken(accessToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(accessToken);
    const session = await this.prisma.session.findFirst({
      where: { token: tokenHash },
      select: { id: true },
    });
    if (session) {
      await this.prisma.session.delete({ where: { id: session.id } });
    }
  }

  /**
   * Revoke all sessions for a user (logout everywhere).
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Get active sessions for a user.
   */
  async getActiveSessions(userId: string): Promise<
    Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      lastUsedAt: Date | null;
      createdAt: Date;
    }>
  > {
    return this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }
}
