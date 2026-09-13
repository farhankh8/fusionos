/**
 * FusionOS Notifications Module
 *
 * Enterprise notification and communication infrastructure.
 * Extends the existing EventOutbox pattern with notification processing,
 * delivery tracking, templates, and user preferences.
 *
 * Architecture:
 *   EventOutbox → EventNotificationProcessor → NotificationService → Delivery
 */

import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { EventNotificationProcessor } from './processors/event-notification.processor';
import { NotificationsController } from './notifications.controller';
import { AuditLogService } from '../common/services/audit-log.service';
import { ChannelDispatcher } from './channels/channel-provider';
import { InAppChannelProvider, EmailChannelProvider } from './channels/channel-provider';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    EventNotificationProcessor,
    AuditLogService,
    {
      provide: ChannelDispatcher,
      useFactory: () => {
        const dispatcher = new ChannelDispatcher();
        dispatcher.registerProvider(new InAppChannelProvider());
        dispatcher.registerProvider(
          new EmailChannelProvider({
            provider: process.env['EMAIL_PROVIDER'] ?? 'console',
            smtpHost: process.env['SMTP_HOST'],
            smtpPort: process.env['SMTP_PORT'] ? parseInt(process.env['SMTP_PORT'], 10) : undefined,
          }),
        );
        return dispatcher;
      },
    },
  ],
  exports: [NotificationService, EventNotificationProcessor],
})
export class NotificationsModule {}
