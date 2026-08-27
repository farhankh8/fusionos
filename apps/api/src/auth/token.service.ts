/**
 * FusionOS Token Service
 *
 * JWT access/refresh token architecture using the jose library.
 *
 * Strategy:
 * - Access token: short-lived (15 min), contains userId + email
 * - Refresh token: longer-lived (7 days), stored as hash in database
 * - Both signed with HMAC SHA-256 (HS256)
 * - Refresh tokens are rotated on each use
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { randomBytes, createHash } from 'node:crypto';

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // userId
  email: string;
  type: 'access';
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // userId
  sessionId: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly jwtSecret: Uint8Array;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly refreshTokenExpiryMs: number;

  constructor(private readonly config: ConfigService) {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.jwtSecret = new TextEncoder().encode(secret);
    this.accessTokenExpiry = this.config.get<string>('JWT_EXPIRES_IN', '15m');
    this.refreshTokenExpiry = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    this.refreshTokenExpiryMs = this.parseExpiryToMs(this.refreshTokenExpiry);
  }

  /**
   * Generate an access token for a user.
   */
  async generateAccessToken(userId: string, email: string): Promise<string> {
    return new SignJWT({
      sub: userId,
      email,
      type: 'access',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.accessTokenExpiry)
      .setIssuer('fusionos')
      .setAudience('fusionos-api')
      .sign(this.jwtSecret);
  }

  /**
   * Generate a refresh token for a session.
   */
  async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({
      sub: userId,
      sessionId,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.refreshTokenExpiry)
      .setIssuer('fusionos')
      .setAudience('fusionos-api')
      .sign(this.jwtSecret);
  }

  /**
   * Generate a complete token pair (access + refresh).
   */
  async generateTokenPair(userId: string, email: string, sessionId: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email),
      this.generateRefreshToken(userId, sessionId),
    ]);

    // Calculate access token expiry
    const now = new Date();
    const [, expiresIn] = this.accessTokenExpiry.match(/(\d+)([smhd])/) ?? ['15', '15', 'm'];
    const unit = this.accessTokenExpiry.slice(-1);
    const value = parseInt(expiresIn, 10);
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const accessTokenExpiresAt = new Date(now.getTime() + value * (multipliers[unit] ?? 60000));

    return { accessToken, refreshToken, accessTokenExpiresAt };
  }

  /**
   * Verify and decode an access token.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        issuer: 'fusionos',
        audience: 'fusionos-api',
      });

      if (payload['type'] !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload as AccessTokenPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify and decode a refresh token.
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        issuer: 'fusionos',
        audience: 'fusionos-api',
      });

      if (payload['type'] !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload as RefreshTokenPayload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Generate a cryptographically secure random token.
   * Used for email verification, password reset, etc.
   */
  generateRandomToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for storage in the database.
   * Tokens are never stored in plaintext.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get the refresh token expiry in milliseconds.
   */
  getRefreshTokenExpiryMs(): number {
    return this.refreshTokenExpiryMs;
  }

  /**
   * Parse an expiry string like "7d" or "15m" to milliseconds.
   */
  private parseExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days
      return 7 * 24 * 60 * 60 * 1000;
    }
    const value = parseInt(match[1], 10);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[match[2]] ?? 60000);
  }
}
