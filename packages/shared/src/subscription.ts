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
export const ADDON_CODES = ["team_suggestion", "extra_users", "extra_storage"] as const;
export type AddonCode = (typeof ADDON_CODES)[number];

/** Addons facturés par quantité (vente croisée sur le socle). */
export const QUANTITY_ADDON_CODES = ["extra_users", "extra_storage"] as const;
export type QuantityAddonCode = (typeof QUANTITY_ADDON_CODES)[number];

/** Addons facturés en option on/off (hors quantités). */
export type BooleanAddonCode = Exclude<AddonCode, QuantityAddonCode>;

export type AddonBillingModel = "boolean" | "quantity";

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
  /** `boolean` : option on/off ; `quantity` : quantité cumulable sur l'abonnement socle. */
  billingModel: AddonBillingModel;
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
  /** Stripe Product ID (documentation / configuration). */
  stripeProductEnvVar?: string;
  stripeProductDefault?: string;
  /** Montant récurrent mensuel en centimes (aligné sur le prix Stripe / affichage). */
  monthlyPriceCents: number;
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
    billingModel: "boolean",
    requiresBaseSubscription: true,
    stripePriceEnvVar: "STRIPE_ADDON_TEAM_SUGGESTION_PRICE_ID",
    stripePriceDefault: "price_addon_team_suggestion",
    monthlyPriceCents: 499,
  },
  extra_users: {
    code: "extra_users",
    label: "Utilisateur supplémentaire",
    priceLabel: "2,99 € / mois / utilisateur",
    pitch:
      "Étendez la capacité de votre organisation au-delà des 2 utilisateurs inclus dans l'offre Essentiel.",
    billingModel: "quantity",
    requiresBaseSubscription: true,
    stripePriceEnvVar: "STRIPE_ADDON_EXTRA_USERS_PRICE_ID",
    stripePriceDefault: "price_1TcnSM159m6jcNWDzzApS686",
    stripeProductEnvVar: "STRIPE_ADDON_EXTRA_USERS_PRODUCT_ID",
    stripeProductDefault: "prod_Uc1VLVdYyOkfy7",
    monthlyPriceCents: 299,
  },
  extra_storage: {
    code: "extra_storage",
    label: "Stockage supplémentaire",
    priceLabel: "4,99 € / mois / +50 Go",
    pitch:
      "Étendez l'espace de stockage de votre organisation au-delà des 10 Go inclus dans l'offre Essentiel.",
    billingModel: "quantity",
    requiresBaseSubscription: true,
    stripePriceEnvVar: "STRIPE_ADDON_EXTRA_STORAGE_PRICE_ID",
    stripePriceDefault: "price_1TdFlK159m6jcNWD9jWmXdpD",
    stripeProductEnvVar: "STRIPE_ADDON_EXTRA_STORAGE_PRODUCT_ID",
    stripeProductDefault: "prod_addon_extra_storage",
    monthlyPriceCents: 499,
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

export function isQuantityAddonCode(code: string): code is QuantityAddonCode {
  return (QUANTITY_ADDON_CODES as readonly string[]).includes(code);
}

export function isBooleanAddonCode(code: AddonCode): code is BooleanAddonCode {
  return ADDON_CATALOG[code].billingModel === "boolean";
}

/** Options on/off gérées sur l'abonnement socle (hors quantités). */
export const BOOLEAN_CROSS_SELL_ADDON_CODES: BooleanAddonCode[] = ADDON_CODES.filter(
  (code): code is BooleanAddonCode =>
    addonRequiresBaseSubscription(code) && isBooleanAddonCode(code),
);

/** Options à quantité cumulable sur l'abonnement socle. */
export const QUANTITY_CROSS_SELL_ADDON_CODES: QuantityAddonCode[] = ADDON_CODES.filter(
  (code): code is QuantityAddonCode =>
    addonRequiresBaseSubscription(code) && isQuantityAddonCode(code),
);

export type AddonQuantities = Partial<Record<QuantityAddonCode, number>>;

export function sanitizeAddonQuantities(quantities: AddonQuantities | undefined): AddonQuantities {
  const result: AddonQuantities = {};
  for (const code of QUANTITY_ADDON_CODES) {
    const raw = quantities?.[code];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      result[code] = 0;
      continue;
    }
    result[code] = Math.max(0, Math.floor(raw));
  }
  return result;
}

// ── Abonnement socle ──

export const BASE_SUBSCRIPTION_INCLUDED_USERS = 2;

export const BASE_SUBSCRIPTION_PLAN = {
  name: "Essentiel",
  priceDisplay: "9,99 €",
  monthlyPriceCents: 999,
  periodDisplay: "mois",
  commitmentDisplay: "sans engagement",
  /** Aligné sur STRIPE_TRIAL_DAYS / DEFAULT_TRIAL_DAYS côté subscriptions-service. */
  trialDays: 15,
  includedUsers: BASE_SUBSCRIPTION_INCLUDED_USERS,
} as const;

export function estimateMonthlySubscriptionCents(params: {
  activeAddons: readonly AddonCode[];
  addonQuantities?: AddonQuantities;
  includeBase?: boolean;
}): number {
  let total = params.includeBase !== false ? BASE_SUBSCRIPTION_PLAN.monthlyPriceCents : 0;
  for (const code of params.activeAddons) {
    if (isBooleanAddonCode(code)) {
      total += ADDON_CATALOG[code].monthlyPriceCents;
    }
  }
  const quantities = sanitizeAddonQuantities(params.addonQuantities);
  const extraUsers = quantities.extra_users ?? 0;
  total += extraUsers * ADDON_CATALOG.extra_users.monthlyPriceCents;
  const extraStorage = quantities.extra_storage ?? 0;
  total += extraStorage * ADDON_CATALOG.extra_storage.monthlyPriceCents;
  return total;
}

/** Formate un montant en centimes pour l'affichage (ex. 1298 → « 12,98 € »). */
export function formatMoneyFromCents(cents: number, currency = "eur"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function computeMaxOrganizationUsers(addonQuantities?: AddonQuantities): number {
  const sanitized = sanitizeAddonQuantities(addonQuantities);
  const extraUsers = sanitized.extra_users ?? 0;
  return BASE_SUBSCRIPTION_INCLUDED_USERS + extraUsers;
}

// ── Stockage documents ──

export const STORAGE_GIBIBYTE = 1024 ** 3;

/** Quota inclus dans l'offre socle Essentiel. */
export const BASE_SUBSCRIPTION_STORAGE_BYTES = 10 * STORAGE_GIBIBYTE;

/** Espace ajouté par unité d'addon extra_storage (+50 Go). */
export const EXTRA_STORAGE_PACK_BYTES = 50 * STORAGE_GIBIBYTE;

export const EXTRA_STORAGE_PACK_GB = 50;

/** Seuil d'avertissement (80 % du quota). */
export const STORAGE_QUOTA_WARNING_RATIO = 0.8;

export function computeOrganizationStorageQuotaBytes(addonQuantities?: AddonQuantities): number {
  const sanitized = sanitizeAddonQuantities(addonQuantities);
  const extraPacks = sanitized.extra_storage ?? 0;
  return BASE_SUBSCRIPTION_STORAGE_BYTES + extraPacks * EXTRA_STORAGE_PACK_BYTES;
}

export function isStorageQuotaWarning(usedBytes: number, quotaBytes: number): boolean {
  if (quotaBytes <= 0) return false;
  return usedBytes >= quotaBytes * STORAGE_QUOTA_WARNING_RATIO;
}

export function isStorageQuotaExceeded(
  usedBytes: number,
  additionalBytes: number,
  quotaBytes: number,
): boolean {
  return usedBytes + additionalBytes > quotaBytes;
}

/** Affichage lisible (ex. 3,2 Go, 512 Mo). */
export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 o";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < STORAGE_GIBIBYTE) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  const gib = bytes / STORAGE_GIBIBYTE;
  if (gib >= 10) return `${Math.round(gib)} Go`;
  if (Number.isInteger(gib)) return `${gib} Go`;
  return `${gib.toFixed(1)} Go`;
}

export const BASE_SUBSCRIPTION_TRIAL_LABEL = `${BASE_SUBSCRIPTION_PLAN.trialDays} jours d'essai gratuit`;

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
  /** Codes des addons booléens actifs (ex. team_suggestion). */
  activeAddons: AddonCode[];
  /** Quantités des addons cumulables (ex. extra_users). */
  addonQuantities: AddonQuantities;
  /** Utilisateurs inclus dans l'offre socle. */
  includedUsers: number;
  /** Plafond d'utilisateurs (inclus + supplémentaires achetés). */
  maxUsers: number;
  /** Quota de stockage documents (octets), socle + packs extra_storage. */
  storageQuotaBytes: number;
  /** Espace documentaire actuellement utilisé (octets, hors fichiers supprimés). */
  storageUsedBytes: number;
  /** true si usage ≥ 80 % du quota. */
  storageWarning: boolean;
  /** Stockage inclus dans le socle (octets), pour l'affichage. */
  includedStorageBytes: number;
  /** Total récurrent mensuel en centimes (socle + options), null si non souscrit. */
  monthlyTotalCents: number | null;
  /** Devise ISO du total (ex. eur). */
  monthlyTotalCurrency: string | null;
  /** true si une souscription Stripe est enregistrée (essai Stripe ou abonnement payant). */
  hasStripeSubscription: boolean;
  /** Paiement Stripe Checkout disponible (abonnements ouverts au public). */
  billingOpen: boolean;
  /** Prolongation d'essai locale (phase démo, avant ouverture des abonnements). */
  canExtendTrial: boolean;
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

/** Corps attendu par le microservice (organizationId fourni par la gateway). */
export interface StartTrialBody {
  organizationId: string;
}

export type StartTrialResponse = OrganizationSubscriptionResponse;

/** Corps attendu par le microservice (organizationId fourni par la gateway). */
export interface ExtendTrialBody {
  organizationId: string;
}

export type ExtendTrialResponse = OrganizationSubscriptionResponse;

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
  /** Options booléennes souhaitées sur l'abonnement Essentiel (vente croisée). */
  addonCodes: AddonCode[];
  /** Quantités souhaitées pour les addons cumulables. */
  addonQuantities?: AddonQuantities;
  successUrl: string;
}

export interface UpdateSubscriptionAddonsGatewayBody {
  addonCodes: AddonCode[];
  addonQuantities?: AddonQuantities;
  successUrl: string;
}

export interface UpdateSubscriptionAddonsResponse {
  /** Facture Stripe, URL de succès, ou null si appliqué sans redirection. */
  url: string | null;
}
