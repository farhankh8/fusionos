/**
 * FusionOS Email Service
 *
 * Provider-agnostic email abstraction.
 * Uses a pluggable EmailProvider for actual delivery.
 *
 * Configuration:
 *   EMAIL_PROVIDER=console|http      — Provider type (default: console in dev, http in prod)
 *   EMAIL_API_KEY                    — API key for HTTP provider
 *   EMAIL_API_URL                    — API endpoint for HTTP provider
 *   EMAIL_FROM                       — Sender email address
 *
 * Development mode: emails logged to console (ConsoleEmailProvider).
 * Production mode: emails sent via HTTP API (HttpEmailProvider).
 *
 * IMPORTANT: Never pretend an email was sent if it was not.
 * SECURITY: Never log tokens, API keys, or credentials.
 */

import { Injectable, Logger } from '@nestjs/common';
import type { EmailProvider, SendEmailParams } from './providers/email-provider.interface';
import { ConsoleEmailProvider } from './providers/console-email.provider';
import { HttpEmailProvider } from './providers/http-email.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;

  constructor() {
    this.provider = this.createProvider();
    this.logger.log(`Email provider initialized: ${this.provider.name}`);
  }

  /**
   * Send an email using the configured provider.
   */
  async sendEmail(params: SendEmailParams): Promise<boolean> {
    try {
      return await this.provider.sendEmail(params);
    } catch (error) {
      this.logger.error(`Email send failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Send email verification email.
   */
  async sendVerificationEmail(email: string, token: string, baseUrl: string): Promise<boolean> {
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Verify your FusionOS account',
      html: `
        <h1>Welcome to FusionOS</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create this account, please ignore this email.</p>
      `,
      text: `Verify your email: ${verifyUrl}`,
    });
  }

  /**
   * Send password reset email.
   */
  async sendPasswordResetEmail(email: string, token: string, baseUrl: string): Promise<boolean> {
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Reset your FusionOS password',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}`,
    });
  }

  /**
   * Create the appropriate email provider based on environment.
   */
  private createProvider(): EmailProvider {
    const providerType = process.env['EMAIL_PROVIDER'] ?? (process.env['NODE_ENV'] === 'production' ? 'http' : 'console');

    if (providerType === 'http') {
      const apiKey = process.env['EMAIL_API_KEY'];
      const apiUrl = process.env['EMAIL_API_URL'];
      const from = process.env['EMAIL_FROM'];

      if (!apiKey || !apiUrl || !from) {
        this.logger.warn(
          'EMAIL_PROVIDER=http but EMAIL_API_KEY, EMAIL_API_URL, or EMAIL_FROM not set. ' +
          'Falling back to console provider. Emails will NOT be delivered.',
        );
        return new ConsoleEmailProvider();
      }

      return new HttpEmailProvider({
        apiKey,
        apiUrl,
        from,
        providerName: process.env['EMAIL_PROVIDER_NAME'] ?? 'http',
      });
    }

    // Default: console provider (development)
    return new ConsoleEmailProvider();
  }
}
