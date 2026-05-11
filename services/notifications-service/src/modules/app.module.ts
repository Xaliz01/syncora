import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { NotificationsController } from "../presentation/http/notifications.controller";
import { AbstractNotificationsService } from "../domain/ports/notifications.service.port";
import { NotificationsService } from "../domain/notifications.service";
import { NotificationSchema } from "../persistence/notification.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-notifications"
    ),
    MongooseModule.forFeature([
      { name: "Notification", schema: NotificationSchema }
    ])
  ],
  controllers: [NotificationsController],
  providers: [
    { provide: AbstractNotificationsService, useClass: NotificationsService }
  ]
})
export class AppModule {}
