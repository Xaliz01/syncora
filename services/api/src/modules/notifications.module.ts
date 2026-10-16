import { httpControllers } from "../process-role";
import { Module } from "@nestjs/common";
import { NotificationsController } from "../presentation/http/notifications.controller";
import { AbstractNotificationsGatewayService } from "../domain/ports/notifications.gateway.service.port";
import { NotificationsGatewayService } from "../domain/notifications.gateway.service";
import { NotificationEventListener } from "../domain/notification-event.listener";
import { SubscriptionsModule } from "./subscriptions.module";
import { NotificationsDomainModule } from "./notifications-domain.module";
import { UsersModule } from "./users.module";

@Module({
  imports: [SubscriptionsModule, NotificationsDomainModule, UsersModule],
  controllers: httpControllers([NotificationsController]),
  providers: [
    {
      provide: AbstractNotificationsGatewayService,
      useClass: NotificationsGatewayService,
    },
    NotificationEventListener,
  ],
})
export class NotificationsModule {}
