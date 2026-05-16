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

/** Codes des addons disponibles à l'achat. */
export const ADDON_CODES = ["team_suggestion"] as const;
export type AddonCode = (typeof ADDON_CODES)[number];

export const ADDON_LABELS: Record<AddonCode, string> = {
  team_suggestion: "Suggestion intelligente d'équipe",
};

export const ADDON_PRICES: Record<AddonCode, string> = {
  team_suggestion: "4,99 € / mois",
};

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
