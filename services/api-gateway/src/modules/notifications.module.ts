import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { NotificationsController } from "../presentation/http/notifications.controller";
import { AbstractNotificationsGatewayService } from "../domain/ports/notifications.gateway.service.port";
import { NotificationsGatewayService } from "../domain/notifications.gateway.service";
import { NotificationEventListener } from "../domain/notification-event.listener";
import { SubscriptionsModule } from "./subscriptions.module";

@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 }), SubscriptionsModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: AbstractNotificationsGatewayService,
      useClass: NotificationsGatewayService,
    },
    NotificationEventListener,
  ],
})
export class NotificationsModule {}
