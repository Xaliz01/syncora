import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SubscriptionsService } from "../domain/subscriptions.service";
import { SubscriptionsController } from "../presentation/http/subscriptions.controller";
import { StripeWebhookController } from "../presentation/http/stripe-webhook.controller";
import { OrganizationSubscriptionSchema } from "../persistence/organization-subscription.schema";
import { ProcessedStripeEventSchema } from "../persistence/processed-stripe-event.schema";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-subscriptions"
    ),
    MongooseModule.forFeature([
      { name: "OrganizationSubscription", schema: OrganizationSubscriptionSchema },
      { name: "ProcessedStripeEvent", schema: ProcessedStripeEventSchema }
    ])
  ],
  controllers: [SubscriptionsController, StripeWebhookController],
  providers: [SubscriptionsService]
})
export class AppModule {}
