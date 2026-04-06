import type { AuthUser } from "@syncora/shared";
import type {
  CreateBillingPortalGatewayBody,
  CreateBillingPortalResponse,
  CreateCheckoutSessionGatewayBody,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse
} from "@syncora/shared";

export abstract class AbstractSubscriptionsGatewayService {
  abstract getCurrentSubscription(user: AuthUser): Promise<OrganizationSubscriptionResponse>;

  abstract createCheckoutSession(
    user: AuthUser,
    body: CreateCheckoutSessionGatewayBody
  ): Promise<CreateCheckoutSessionResponse>;

  abstract createBillingPortalSession(
    user: AuthUser,
    body: CreateBillingPortalGatewayBody
  ): Promise<CreateBillingPortalResponse>;
}
