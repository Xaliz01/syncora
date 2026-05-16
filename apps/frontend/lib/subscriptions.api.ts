import type {
  CreateAddonCheckoutSessionGatewayBody,
  CreateBillingPortalGatewayBody,
  CreateBillingPortalResponse,
  CreateCheckoutSessionGatewayBody,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse,
} from "@syncora/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function subscriptionsRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

export function getSubscriptionCurrent() {
  return subscriptionsRequest<OrganizationSubscriptionResponse>("GET", "/subscriptions/current");
}

export function createCheckoutSession(payload: CreateCheckoutSessionGatewayBody) {
  return subscriptionsRequest<CreateCheckoutSessionResponse>(
    "POST",
    "/subscriptions/checkout-session",
    payload,
  );
}

export function createAddonCheckoutSession(payload: CreateAddonCheckoutSessionGatewayBody) {
  return subscriptionsRequest<CreateCheckoutSessionResponse>(
    "POST",
    "/subscriptions/addon-checkout-session",
    payload,
  );
}

export function createBillingPortalSession(payload: CreateBillingPortalGatewayBody) {
  return subscriptionsRequest<CreateBillingPortalResponse>(
    "POST",
    "/subscriptions/billing-portal",
    payload,
  );
}
