/**
 * FusionOS Email Service
 *
 * Provider-agnostic email abstraction.
 * In development, emails are logged to the console.
 * In production, a real email provider (SMTP, SendGrid, etc.) should be configured.
 *
 * IMPORTANT: Never pretend an email was sent if it was not.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isDev: boolean;

  constructor() {
    this.isDev = process.env['NODE_ENV'] !== 'production';
  }

  /**
   * Send an email. In development, logs to console.
   */
  async sendEmail(params: SendEmailParams): Promise<boolean> {
    if (this.isDev) {
      this.logger.log(`📧 [DEV] Email to: ${params.to}`);
      this.logger.log(`   Subject: ${params.subject}`);
      this.logger.log(`   Body: ${params.text ?? params.html}`);
      return true;
    }

    // TODO: Integrate real email provider (Phase 14)
    // For now, log and return false to indicate no real delivery
    this.logger.warn(`📧 Email delivery not configured — email to ${params.to} was NOT sent`);
    return false;
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
}
