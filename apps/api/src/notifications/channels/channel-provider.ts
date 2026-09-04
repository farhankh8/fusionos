/**
 * FusionOS Notification Channel Provider Interface
 *
 * Abstract interface for notification delivery channels.
 * Current implementations: InApp (always succeeds), Email (console/log in dev).
 * Future: SMS, Push, Webhook, Slack, Teams.
 *
 * Design: Clean abstraction that allows swapping providers without changing
 * notification business logic. Provider configuration is environment-based.
 */

import { Logger } from '@nestjs/common';

export interface SendNotificationParams {
  tenantId: string;
  notificationId: string;
  recipientUserId: string;
  recipientEmail?: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationResult {
  success: boolean;
  providerMessageId?: string;
  provider?: string;
  failureReason?: string;
}

/**
 * Channel provider interface.
 * Each channel (IN_APP, EMAIL, SMS, etc.) implements this interface.
 */
export interface NotificationChannelProvider {
  readonly channel: string;
  readonly providerName: string;
  send(params: SendNotificationParams): Promise<SendNotificationResult>;
}

/**
 * In-App channel provider.
 * Always succeeds — notifications are already stored in the database.
 * This is a no-op provider since IN_APP delivery is handled by the notification table.
 */
export class InAppChannelProvider implements NotificationChannelProvider {
  readonly channel = 'IN_APP';
  readonly providerName = 'internal';

  private readonly logger = new Logger(InAppChannelProvider.name);

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    // IN_APP delivery is already handled by the notification creation.
    // This provider exists for the abstraction layer.
    this.logger.debug(`IN_APP notification delivered: ${params.notificationId}`);
    return {
      success: true,
      provider: 'internal',
      providerMessageId: params.notificationId,
    };
  }
}

/**
 * Email channel provider.
 * In development: logs to console (safe dev provider).
 * In production: configured email provider (SMTP, SendGrid, etc.).
 * Never exposes credentials in logs.
 */
export class EmailChannelProvider implements NotificationChannelProvider {
  readonly channel = 'EMAIL';
  readonly providerName: string;

  private readonly logger = new Logger(EmailChannelProvider.name);

  constructor(config?: { provider?: string; smtpHost?: string; smtpPort?: number }) {
    this.providerName = config?.provider ?? 'console';
  }

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    if (!params.recipientEmail) {
      return {
        success: false,
        provider: this.providerName,
        failureReason: 'Recipient email not available',
      };
    }

    // Development: log the email content
    if (this.providerName === 'console' || !process.env['SMTP_HOST']) {
      this.logger.log(
        `[EMAIL DEV] To: ${params.recipientEmail} | Subject: ${params.subject ?? '(no subject)'} | Body: ${params.body.substring(0, 200)}`,
      );
      return {
        success: true,
        provider: 'console',
        providerMessageId: `dev-${Date.now()}-${params.notificationId}`,
      };
    }

    // Production: would use configured email provider here
    // For now, this is a safe placeholder that won't pretend delivery happened
    this.logger.warn(
      `Email provider "${this.providerName}" not configured. Email NOT sent to ${params.recipientEmail}`,
    );
    return {
      success: false,
      provider: this.providerName,
      failureReason: `Email provider "${this.providerName}" is not configured in this environment`,
    };
  }
}

/**
 * Channel dispatcher — routes notifications to the appropriate channel provider.
 */
export class ChannelDispatcher {
  private readonly providers = new Map<string, NotificationChannelProvider>();
  private readonly logger = new Logger(ChannelDispatcher.name);

  registerProvider(provider: NotificationChannelProvider) {
    this.providers.set(provider.channel, provider);
    this.logger.log(`Channel provider registered: ${provider.channel} → ${provider.providerName}`);
  }

  async dispatch(
    channel: string,
    params: SendNotificationParams,
  ): Promise<SendNotificationResult> {
    const provider = this.providers.get(channel);
    if (!provider) {
      return {
        success: false,
        failureReason: `No provider registered for channel: ${channel}`,
      };
    }

    try {
      return await provider.send(params);
    } catch (error) {
      this.logger.error(`Channel dispatch failed: ${channel}`, error);
      return {
        success: false,
        provider: provider.providerName,
        failureReason: (error as Error).message ?? 'Unknown channel dispatch error',
      };
    }
  }
}
