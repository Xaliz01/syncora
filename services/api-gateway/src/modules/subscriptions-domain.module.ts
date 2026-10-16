import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OrganizationSubscriptionSchema } from "../persistence/subscriptions/organization-subscription.schema";
import { ProcessedStripeEventSchema } from "../persistence/subscriptions/processed-stripe-event.schema";
import { SubscriptionsService } from "../domain/subscriptions/subscriptions.service";
import { OrganizationsDomainModule } from "./organizations-domain.module";
import { NotificationsDomainModule } from "./notifications-domain.module";

@Module({
  imports: [
    OrganizationsDomainModule,
    NotificationsDomainModule,
    MongooseModule.forFeature(
      [
        { name: "OrganizationSubscription", schema: OrganizationSubscriptionSchema },
        { name: "ProcessedStripeEvent", schema: ProcessedStripeEventSchema },
      ],
      "subscriptions",
    ),
  ],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsDomainModule {}
