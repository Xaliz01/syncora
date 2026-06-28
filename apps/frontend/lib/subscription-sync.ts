import type { AddonCode, AddonQuantities } from "@planwise/shared";
import { sanitizeAddonQuantities } from "@planwise/shared";
import * as subscriptionsApi from "@/lib/subscriptions.api";

const DEFAULT_MAX_MS = 45_000;
const DEFAULT_INTERVAL_MS = 1_000;
const INITIAL_DELAY_MS = 750;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function addonsKey(codes: readonly AddonCode[]): string {
  return [...codes].sort().join(",");
}

function quantitiesKey(quantities: AddonQuantities | undefined): string {
  const sanitized = sanitizeAddonQuantities(quantities);
  return Object.entries(sanitized)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, qty]) => `${code}:${qty}`)
    .join(",");
}

/** URL Stripe (facture hébergée, checkout…) — pas un retour direct dans l’app. */
export function isExternalSubscriptionPaymentUrl(url: string): boolean {
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return true;
  }
}

export interface ExpectedSubscriptionAddons {
  booleanAddons: readonly AddonCode[];
  addonQuantities?: AddonQuantities;
}

/**
 * Attend que `GET /subscriptions/current` reflète les addons attendus
 * (webhook Stripe + persistance Mongo).
 */
export async function waitForSubscriptionAddonsSync(
  expected: ExpectedSubscriptionAddons,
  options?: { maxMs?: number; intervalMs?: number },
): Promise<boolean> {
  const maxMs = options?.maxMs ?? DEFAULT_MAX_MS;
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const expectedBooleanKey = addonsKey(expected.booleanAddons);
  const expectedQuantitiesKey = quantitiesKey(expected.addonQuantities);

  await wait(INITIAL_DELAY_MS);

  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const current = await subscriptionsApi.getSubscriptionCurrent();
    if (
      addonsKey(current.activeAddons) === expectedBooleanKey &&
      quantitiesKey(current.addonQuantities) === expectedQuantitiesKey
    ) {
      return true;
    }
    await wait(intervalMs);
  }

  return false;
}
