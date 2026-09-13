/**
 * FusionOS Console Email Provider
 *
 * Development-only email provider that logs emails to the console.
 * NEVER used in production — production must use a real provider.
 *
 * SECURITY: This provider does not send actual emails.
 * Tokens are visible in console output for development convenience only.
 */

import { Logger } from '@nestjs/common';
import type { EmailProvider, SendEmailParams } from './email-provider.interface';

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  private readonly logger = new Logger('EmailProvider');

  async sendEmail(params: SendEmailParams): Promise<boolean> {
    this.logger.log(`📧 [DEV EMAIL] To: ${params.to}`);
    this.logger.log(`   Subject: ${params.subject}`);
    this.logger.log(`   Text: ${params.text ?? '(no text version)'}`);
    // Do NOT log HTML body — it may contain tokens in URLs
    return true;
  }
}
