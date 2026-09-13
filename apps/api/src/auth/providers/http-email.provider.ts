/**
 * FusionOS HTTP Email Provider
 *
 * Production email provider that sends via any HTTP-based email API.
 * Compatible with Resend, SendGrid, Mailgun, Postmark, etc.
 *
 * Configuration via environment:
 *   EMAIL_API_KEY     — API key for the email provider
 *   EMAIL_API_URL     — API endpoint URL (provider-specific)
 *   EMAIL_FROM        — Sender email address
 *   EMAIL_PROVIDER    — Provider name for logging (default: "http")
 *
 * The provider uses a simple HTTP POST with JSON body:
 *   { to, from, subject, html, text }
 *
 * If the provider uses a different payload format, create a
 * provider-specific adapter instead of modifying this class.
 *
 * SECURITY:
 *   - API key is never logged
 *   - Tokens in email content are not logged
 *   - Failures are logged without exposing credentials
 */

import { Logger } from '@nestjs/common';
import type { EmailProvider, SendEmailParams } from './email-provider.interface';

export interface HttpEmailProviderConfig {
  apiKey: string;
  apiUrl: string;
  from: string;
  providerName?: string;
}

export class HttpEmailProvider implements EmailProvider {
  readonly name: string;
  private readonly logger = new Logger('EmailProvider');
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly from: string;
  private readonly timeout: number;

  constructor(config: HttpEmailProviderConfig) {
    this.name = config.providerName ?? 'http';
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
    this.from = config.from;
    this.timeout = parseInt(process.env['EMAIL_TIMEOUT'] ?? '10000', 10);

    if (!this.apiKey) {
      throw new Error('EMAIL_API_KEY is required for HTTP email provider');
    }
    if (!this.apiUrl) {
      throw new Error('EMAIL_API_URL is required for HTTP email provider');
    }
    if (!this.from) {
      throw new Error('EMAIL_FROM is required for HTTP email provider');
    }
  }

  async sendEmail(params: SendEmailParams): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.from,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(
          `Email delivery failed: ${response.status} ${response.statusText} — to: ${params.to}`,
        );
        // Do NOT log response body — it may contain sensitive provider details
        return false;
      }

      this.logger.log(`📧 Email sent successfully to: ${params.to}`);
      return true;
    } catch (error) {
      const err = error as Error;
      if (err.name === 'AbortError') {
        this.logger.error(`Email delivery timed out after ${this.timeout}ms — to: ${params.to}`);
      } else {
        this.logger.error(`Email delivery error: ${err.message} — to: ${params.to}`);
      }
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
