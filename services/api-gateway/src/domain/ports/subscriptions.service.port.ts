import type { AuthUser } from "@syncora/shared";
import type {
  CreateAddonCheckoutSessionGatewayBody,
  CreateBillingPortalGatewayBody,
  CreateBillingPortalResponse,
  CreateCheckoutSessionGatewayBody,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse,
  UpdateSubscriptionAddonsGatewayBody,
  UpdateSubscriptionAddonsResponse,
} from "@syncora/shared";

export abstract class AbstractSubscriptionsGatewayService {
  abstract getCurrentSubscription(user: AuthUser): Promise<OrganizationSubscriptionResponse>;

  abstract createCheckoutSession(
    user: AuthUser,
    body: CreateCheckoutSessionGatewayBody,
  ): Promise<CreateCheckoutSessionResponse>;

  abstract createAddonCheckoutSession(
    user: AuthUser,
    body: CreateAddonCheckoutSessionGatewayBody,
  ): Promise<CreateCheckoutSessionResponse>;

  abstract createBillingPortalSession(
    user: AuthUser,
    body: CreateBillingPortalGatewayBody,
  ): Promise<CreateBillingPortalResponse>;

  abstract updateSubscriptionAddons(
    user: AuthUser,
    body: UpdateSubscriptionAddonsGatewayBody,
  ): Promise<UpdateSubscriptionAddonsResponse>;
}
