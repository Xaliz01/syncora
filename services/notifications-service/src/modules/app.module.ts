import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { HttpModule } from "@nestjs/axios";
import { HealthController, provideHealthServiceName } from "@planwise/shared/nest";
import { NotificationsController } from "../presentation/http/notifications.controller";
import { NotificationPreferencesController } from "../presentation/http/notification-preferences.controller";
import { PushSubscriptionsController } from "../presentation/http/push-subscriptions.controller";
import { EmailController } from "../presentation/http/email.controller";
import { AbstractNotificationsService } from "../domain/ports/notifications.service.port";
import { NotificationsService } from "../domain/notifications.service";
import { AbstractNotificationPreferencesService } from "../domain/ports/notification-preferences.service.port";
import { NotificationPreferencesService } from "../domain/notification-preferences.service";
import { AbstractPushSubscriptionService } from "../domain/ports/push-subscription.service.port";
import { PushSubscriptionService } from "../domain/push-subscription.service";
import { AbstractEmailService } from "../domain/ports/email.service.port";
import { EmailService } from "../domain/email.service";
import { InterventionReminderScheduler } from "../domain/intervention-reminder.scheduler";
import { NotificationSchema } from "../persistence/notification.schema";
import { NotificationPreferencesSchema } from "../persistence/notification-preferences.schema";
import { PushSubscriptionSchema } from "../persistence/push-subscription.schema";
import { SentReminderSchema } from "../persistence/sent-reminder.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-notifications",
    ),
    MongooseModule.forFeature([
      { name: "Notification", schema: NotificationSchema },
      { name: "NotificationPreferences", schema: NotificationPreferencesSchema },
      { name: "PushSubscription", schema: PushSubscriptionSchema },
      { name: "SentReminder", schema: SentReminderSchema },
    ]),
    ScheduleModule.forRoot(),
    HttpModule.register({ timeout: 10000, maxRedirects: 0 }),
  ],
  controllers: [
    NotificationsController,
    NotificationPreferencesController,
    PushSubscriptionsController,
    EmailController,
    HealthController,
  ],
  providers: [
    provideHealthServiceName("planwise-notifications-service"),
    { provide: AbstractNotificationsService, useClass: NotificationsService },
    {
      provide: AbstractNotificationPreferencesService,
      useClass: NotificationPreferencesService,
    },
    { provide: AbstractPushSubscriptionService, useClass: PushSubscriptionService },
    { provide: AbstractEmailService, useClass: EmailService },
    InterventionReminderScheduler,
  ],
})
export class AppModule {}
