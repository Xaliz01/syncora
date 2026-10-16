import { Module } from "@nestjs/common";
import { InterventionReminderScheduler } from "../domain/notifications/intervention-reminder.scheduler";
import { MaintenanceVisitReminderScheduler } from "../domain/notifications/maintenance-visit-reminder.scheduler";
import { NotificationsDomainModule } from "./notifications-domain.module";
import { CasesModule } from "./cases.module";
import { TechniciansDomainModule } from "./technicians-domain.module";
import { UsersModule } from "./users.module";
import { SubscriptionsDomainModule } from "./subscriptions-domain.module";

/** Schedulers isolés de NotificationsDomainModule pour éviter un cycle avec CasesModule. */
@Module({
  imports: [
    NotificationsDomainModule,
    CasesModule,
    TechniciansDomainModule,
    UsersModule,
    SubscriptionsDomainModule,
  ],
  providers: [InterventionReminderScheduler, MaintenanceVisitReminderScheduler],
})
export class NotificationSchedulersModule {}
