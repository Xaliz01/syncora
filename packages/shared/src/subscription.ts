/** État métier côté app (hors statuts Stripe bruts). */
export type OrganizationSubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

// ── Addon catalog ──

/** Codes des addons disponibles à l'achat. Pour ajouter un addon : ajouter une entrée ici + dans ADDON_CATALOG. */
export const ADDON_CODES = ["team_suggestion"] as const;
export type AddonCode = (typeof ADDON_CODES)[number];

/**
 * Descripteur complet d'un addon.
 * Sert de source unique de vérité pour le backend (prix) et le frontend (UI teaser).
 */
export interface AddonDescriptor {
  code: AddonCode;
  label: string;
  /** Prix affiché (pour l'UI, pas pour Stripe). */
  priceLabel: string;
  /** Description courte pour le teaser verrouillé. */
  pitch: string;
  /**
   * Nom de la variable d'environnement qui porte le Stripe Price ID.
   * Convention : STRIPE_ADDON_<CODE_UPPER>_PRICE_ID
   */
  stripePriceEnvVar: string;
  /** Fallback dev si la variable n'est pas définie. */
  stripePriceDefault: string;
}

/**
 * Catalogue centralisé des addons.
 *
 * Pour ajouter un nouvel addon :
 * 1. Ajouter son code dans ADDON_CODES
 * 2. Ajouter son descripteur ici
 * 3. Créer un prix récurrent dans Stripe et renseigner la variable d'environnement correspondante
 * 4. Côté frontend, créer un composant gate spécifique utilisant <AddonLockedOverlay>
 */
export const ADDON_CATALOG: Record<AddonCode, AddonDescriptor> = {
  team_suggestion: {
    code: "team_suggestion",
    label: "Suggestion intelligente d'équipe",
    priceLabel: "4,99 € / mois",
    pitch:
      "Optimisez vos tournées en assignant automatiquement l'équipe la plus proche. " +
      "Estimez la distance, le temps de trajet, la consommation de carburant et " +
      "l'empreinte CO₂ pour chaque intervention.",
    stripePriceEnvVar: "STRIPE_ADDON_TEAM_SUGGESTION_PRICE_ID",
    stripePriceDefault: "price_addon_team_suggestion",
  },
};

/** Raccourcis rétro-compatibles. */
export const ADDON_LABELS: Record<AddonCode, string> = Object.fromEntries(
  Object.values(ADDON_CATALOG).map((d) => [d.code, d.label]),
) as Record<AddonCode, string>;

export const ADDON_PRICES: Record<AddonCode, string> = Object.fromEntries(
  Object.values(ADDON_CATALOG).map((d) => [d.code, d.priceLabel]),
) as Record<AddonCode, string>;

export function isValidAddonCode(code: string): code is AddonCode {
  return (ADDON_CODES as readonly string[]).includes(code);
}

// ── Subscription response ──

export interface OrganizationSubscriptionResponse {
  organizationId: string;
  status: OrganizationSubscriptionStatus;
  /** Indique si l'organisation peut utiliser l'app (essai ou abonnement actif). */
  hasAccess: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Montant / période affichables (ex. abonnement mensuel). */
  planLabel: string;
  /** Codes des addons actifs pour cette organisation. */
  activeAddons: AddonCode[];
}

// ── Checkout / billing DTOs ──

/** Corps attendu par le microservice (organizationId fourni par la gateway). */
export interface CreateCheckoutSessionBody {
  organizationId: string;
  /** Email Stripe (nouveau client) ; ignoré si un client Stripe existe déjà. */
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/** Corps côté client → API gateway (sans organizationId). */
export interface CreateCheckoutSessionGatewayBody {
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface CreateBillingPortalBody {
  organizationId: string;
  returnUrl: string;
}

export interface CreateBillingPortalGatewayBody {
  returnUrl: string;
}

export interface CreateBillingPortalResponse {
  url: string;
}

/** Corps attendu par le microservice pour un checkout addon. */
export interface CreateAddonCheckoutSessionBody {
  organizationId: string;
  addonCode: AddonCode;
  successUrl: string;
  cancelUrl: string;
}

/** Corps côté client → API gateway (sans organizationId). */
export interface CreateAddonCheckoutSessionGatewayBody {
  addonCode: AddonCode;
  successUrl: string;
  cancelUrl: string;
}
