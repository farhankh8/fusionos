/**
 * FusionOS Email Provider Interface
 *
 * Abstraction for email delivery. Implementations:
 *   - ConsoleEmailProvider: logs to console (development)
 *   - HttpEmailProvider: sends via HTTP API (production)
 *
 * SECURITY: Providers must never log tokens, API keys, or credentials.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(params: SendEmailParams): Promise<boolean>;
}
