import type { AuthUser } from "@planwise/shared";
import type {
  CreateAddonCheckoutSessionGatewayBody,
  CreateBillingPortalGatewayBody,
  CreateBillingPortalResponse,
  CreateCheckoutSessionGatewayBody,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse,
  StartTrialResponse,
  UpdateSubscriptionAddonsGatewayBody,
  UpdateSubscriptionAddonsResponse,
} from "@planwise/shared";

export abstract class AbstractSubscriptionsGatewayService {
  abstract getCurrentSubscription(user: AuthUser): Promise<OrganizationSubscriptionResponse>;

  abstract createCheckoutSession(
    user: AuthUser,
    body: CreateCheckoutSessionGatewayBody,
  ): Promise<CreateCheckoutSessionResponse>;

  abstract startTrial(user: AuthUser): Promise<StartTrialResponse>;

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
