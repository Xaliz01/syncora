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
   * Si true, l'addon n'est pas souscriptible en checkout séparé : il est ajouté
   * uniquement en vente croisée sur l'abonnement socle (ex. Essentiel) via le portail Stripe.
   */
  requiresBaseSubscription: boolean;
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
 * 3. Créer un prix récurrent dans Stripe (vente croisée sur le socle ou checkout dédié selon `requiresBaseSubscription`)
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
    requiresBaseSubscription: true,
    stripePriceEnvVar: "STRIPE_ADDON_TEAM_SUGGESTION_PRICE_ID",
    stripePriceDefault: "price_addon_team_suggestion",
  },
};

export function addonRequiresBaseSubscription(code: AddonCode): boolean {
  return ADDON_CATALOG[code].requiresBaseSubscription;
}

export function addonAllowsStandaloneCheckout(code: AddonCode): boolean {
  return !addonRequiresBaseSubscription(code);
}

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

// ── Abonnement socle ──

export const BASE_SUBSCRIPTION_PLAN = {
  name: "Essentiel",
  priceDisplay: "9,99 €",
  periodDisplay: "mois",
  commitmentDisplay: "sans engagement",
} as const;

export const BASE_SUBSCRIPTION_PLAN_LABEL = `${BASE_SUBSCRIPTION_PLAN.priceDisplay} / ${BASE_SUBSCRIPTION_PLAN.periodDisplay}, ${BASE_SUBSCRIPTION_PLAN.commitmentDisplay}`;

// ── Subscription response ──

export interface OrganizationSubscriptionResponse {
  organizationId: string;
  status: OrganizationSubscriptionStatus;
  /** Indique si l'organisation peut utiliser l'app (essai ou abonnement actif). */
  hasAccess: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Nom commercial du socle (ex. Essentiel). */
  planName: string;
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

/** Flux du portail Stripe : accueil facturation ou modification d'abonnement (vente croisée addons). */
export type BillingPortalFlow = "default" | "subscription_update";

export interface CreateBillingPortalBody {
  organizationId: string;
  returnUrl: string;
  /** `subscription_update` : écran d'ajout/retrait d'options sur l'abonnement socle (ex. Essentiel). */
  flow?: BillingPortalFlow;
}

export interface CreateBillingPortalGatewayBody {
  returnUrl: string;
  flow?: BillingPortalFlow;
}

export interface CreateBillingPortalResponse {
  url: string;
}

/** Corps attendu par le microservice pour un checkout addon. */
export interface CreateAddonCheckoutSessionBody {
  organizationId: string;
  addonCode: AddonCode;
  /** E-mail Stripe si création client (checkout socle + addon). */
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/** Corps côté client → API gateway (sans organizationId). */
export interface CreateAddonCheckoutSessionGatewayBody {
  addonCode: AddonCode;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/** Mise à jour des options sur l'abonnement socle (ajout / retrait). */
export interface UpdateSubscriptionAddonsBody {
  organizationId: string;
  /** Codes d'addons souhaités sur l'abonnement Essentiel (vente croisée). */
  addonCodes: AddonCode[];
  successUrl: string;
}

export interface UpdateSubscriptionAddonsGatewayBody {
  addonCodes: AddonCode[];
  successUrl: string;
}

export interface UpdateSubscriptionAddonsResponse {
  /** Facture Stripe, URL de succès, ou null si appliqué sans redirection. */
  url: string | null;
}
