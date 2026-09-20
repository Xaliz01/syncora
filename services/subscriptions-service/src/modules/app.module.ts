import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { SubscriptionsService } from "../domain/subscriptions.service";
import { SubscriptionsController } from "../presentation/http/subscriptions.controller";
import { StripeWebhookController } from "../presentation/http/stripe-webhook.controller";
import { OrganizationSubscriptionSchema } from "../persistence/organization-subscription.schema";
import { ProcessedStripeEventSchema } from "../persistence/processed-stripe-event.schema";
import { AiQuotaCounterSchema } from "../persistence/ai-quota-counter.schema";
import { AiQuotaService } from "../domain/ai-quota.service";
import { AiQuotaController } from "../presentation/http/ai-quota.controller";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-subscriptions",
    ),
    MongooseModule.forFeature([
      { name: "OrganizationSubscription", schema: OrganizationSubscriptionSchema },
      { name: "ProcessedStripeEvent", schema: ProcessedStripeEventSchema },
      { name: "AiQuotaCounter", schema: AiQuotaCounterSchema },
    ]),
  ],
  controllers: [
    SubscriptionsController,
    StripeWebhookController,
    AiQuotaController,
    HealthController,
  ],
  providers: [
    provideHealthServiceName("planwise-subscriptions-service"),
    provideHttpAccessLogInterceptor(),
    SubscriptionsService,
    AiQuotaService,
  ],
})
export class AppModule {}
