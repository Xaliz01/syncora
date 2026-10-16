import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NotificationSchema } from "../persistence/notifications/notification.schema";
import { NotificationPreferencesSchema } from "../persistence/notifications/notification-preferences.schema";
import { PushSubscriptionSchema } from "../persistence/notifications/push-subscription.schema";
import { SentReminderSchema } from "../persistence/notifications/sent-reminder.schema";
import { CronRunSchema } from "../persistence/notifications/cron-run.schema";
import { AbstractNotificationsService } from "../domain/notifications/ports/notifications.service.port";
import { NotificationsService } from "../domain/notifications/notifications.service";
import { AbstractNotificationPreferencesService } from "../domain/notifications/ports/notification-preferences.service.port";
import { NotificationPreferencesService } from "../domain/notifications/notification-preferences.service";
import { AbstractPushSubscriptionService } from "../domain/notifications/ports/push-subscription.service.port";
import { PushSubscriptionService } from "../domain/notifications/push-subscription.service";
import { AbstractEmailService } from "../domain/notifications/ports/email.service.port";
import { EmailService } from "../domain/notifications/email.service";
import { CronRunRecorder } from "../domain/notifications/cron-run.recorder";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "Notification", schema: NotificationSchema },
        { name: "NotificationPreferences", schema: NotificationPreferencesSchema },
        { name: "PushSubscription", schema: PushSubscriptionSchema },
        { name: "SentReminder", schema: SentReminderSchema },
        { name: "CronRun", schema: CronRunSchema },
      ],
      "notifications",
    ),
  ],
  providers: [
    { provide: AbstractNotificationsService, useClass: NotificationsService },
    {
      provide: AbstractNotificationPreferencesService,
      useClass: NotificationPreferencesService,
    },
    { provide: AbstractPushSubscriptionService, useClass: PushSubscriptionService },
    { provide: AbstractEmailService, useClass: EmailService },
    CronRunRecorder,
  ],
  exports: [
    AbstractNotificationsService,
    AbstractNotificationPreferencesService,
    AbstractPushSubscriptionService,
    AbstractEmailService,
    CronRunRecorder,
  ],
})
export class NotificationsDomainModule {}
