import type {
  AddonCode,
  AddonQuantities,
  OrganizationSubscriptionResponse,
  OrganizationSubscriptionStatus,
} from "@planwise/shared";
import {
  BASE_SUBSCRIPTION_INCLUDED_USERS,
  BASE_SUBSCRIPTION_PLAN,
  BASE_SUBSCRIPTION_PLAN_LABEL,
  BASE_SUBSCRIPTION_STORAGE_BYTES,
  computeMaxOrganizationUsers,
  computeOrganizationStorageQuotaBytes,
  isBooleanAddonCode,
  isValidAddonCode,
  MAX_TRIAL_EXTENSIONS,
} from "@planwise/shared";
import type { OrganizationSubscriptionDocument } from "../../persistence/organization-subscription.schema";

function mapStripeStatus(stripeStatus: string | undefined): OrganizationSubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":
    case "active":
    case "past_due":
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return stripeStatus;
    default:
      return "none";
  }
}

function computeHasAccess(
  status: OrganizationSubscriptionStatus,
  currentPeriodEnd?: Date,
  trialEndsAt?: Date | null,
): boolean {
  const now = Date.now();
  if (status === "active" || status === "past_due") {
    return true;
  }
  if (status === "trialing") {
    if (trialEndsAt) {
      return trialEndsAt.getTime() > now;
    }
    return true;
  }
  if (status === "canceled" && currentPeriodEnd && currentPeriodEnd.getTime() > now) {
    return true;
  }
  return false;
}

function hasActiveBaseSubscription(doc: OrganizationSubscriptionDocument | null): boolean {
  if (!doc?.stripeSubscriptionId?.trim()) {
    return false;
  }
  const status = mapStripeStatus(doc.stripeStatus);
  if (status === "trialing" || status === "active" || status === "past_due") {
    return true;
  }
  if (
    status === "canceled" &&
    doc.currentPeriodEnd &&
    doc.currentPeriodEnd.getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

function isStripeCheckoutConfigured(): boolean {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return false;
  }

  const configuredPriceId = process.env.STRIPE_PRICE_ID?.trim();
  if (configuredPriceId) {
    return true;
  }

  return process.env.NODE_ENV !== "production" && process.env.STRIPE_PRICE_ID === undefined;
}

function computeSubscriptionMeta(
  doc: OrganizationSubscriptionDocument | null,
  status: OrganizationSubscriptionStatus,
  hasAccess: boolean,
): { billingOpen: boolean; canExtendTrial: boolean; trialExtensionCount: number } {
  const billingOpen = isStripeCheckoutConfigured();
  const trialExtensionCount = Math.max(0, Number(doc?.trialExtensionCount ?? 0) || 0);
  const canExtendTrial =
    !billingOpen &&
    !!doc?.trialEndsAt &&
    !hasAccess &&
    !hasActiveBaseSubscription(doc) &&
    (status === "trialing" || status === "none") &&
    trialExtensionCount < MAX_TRIAL_EXTENSIONS;
  return { billingOpen, canExtendTrial, trialExtensionCount };
}

export function toSubscriptionResponse(
  doc: OrganizationSubscriptionDocument,
  addonQuantities: AddonQuantities,
  monthly: { monthlyTotalCents: number | null; monthlyTotalCurrency: string | null },
): OrganizationSubscriptionResponse {
  const status = mapStripeStatus(doc.stripeStatus);
  const trialEndsAt = doc.trialEndsAt ?? null;
  const currentPeriodEnd = doc.currentPeriodEnd ?? null;
  const activeAddons = (doc.activeAddons ?? []).filter(
    (code): code is AddonCode => isValidAddonCode(code) && isBooleanAddonCode(code),
  );
  const includedUsers = BASE_SUBSCRIPTION_INCLUDED_USERS;
  const maxUsers = computeMaxOrganizationUsers(addonQuantities);
  const storageQuotaBytes = computeOrganizationStorageQuotaBytes(addonQuantities);
  const hasAccess = computeHasAccess(status, doc.currentPeriodEnd, trialEndsAt);
  const { billingOpen, canExtendTrial, trialExtensionCount } = computeSubscriptionMeta(
    doc,
    status,
    hasAccess,
  );
  return {
    organizationId: doc.organizationId,
    status,
    hasAccess,
    hasStripeSubscription: !!doc.stripeSubscriptionId?.trim(),
    billingOpen,
    canExtendTrial,
    trialExtensionCount,
    maxTrialExtensions: MAX_TRIAL_EXTENSIONS,
    trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
    currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
    cancelAtPeriodEnd: doc.cancelAtPeriodEnd ?? false,
    planName: BASE_SUBSCRIPTION_PLAN.name,
    planLabel: BASE_SUBSCRIPTION_PLAN_LABEL,
    activeAddons,
    addonQuantities,
    includedUsers,
    maxUsers,
    storageQuotaBytes,
    storageUsedBytes: 0,
    storageWarning: false,
    includedStorageBytes: BASE_SUBSCRIPTION_STORAGE_BYTES,
    monthlyTotalCents: monthly.monthlyTotalCents,
    monthlyTotalCurrency: monthly.monthlyTotalCurrency,
  };
}
