/** Contrats API intégrations compta / banque (Pennylane, Qonto, etc.) — Phase 3.3 */

export const INTEGRATION_PROVIDERS = ["pennylane", "qonto"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type PennylaneAuthMethod = "oauth" | "api_token";
export type QontoAuthMethod = "oauth" | "api_token";

export interface PennylaneConnectionStatus {
  provider: "pennylane";
  connected: boolean;
  /** Identifiant entreprise côté Pennylane (si disponible). */
  companyId?: string;
  companyName?: string;
  connectedAt?: string;
  /** Masque du token, ex. "••••abcd" */
  tokenHint?: string;
  /** Mode d’auth utilisé pour la connexion active. */
  authMethod?: PennylaneAuthMethod;
  /**
   * True si la plateforme a configuré Client ID/Secret OAuth
   * (bouton « Connecter avec Pennylane » disponible).
   */
  oauthAvailable?: boolean;
}

export interface ConnectPennylaneBody {
  organizationId: string;
  /** Token API entreprise Pennylane (Company API token) — secours hors OAuth. */
  apiToken: string;
}

export interface DisconnectPennylaneBody {
  organizationId: string;
}

export interface PennylaneOAuthStartResponse {
  authorizationUrl: string;
}

export interface CompletePennylaneOAuthBody {
  organizationId: string;
  /** Authorization code renvoyé par Pennylane. */
  code: string;
  /** State CSRF signé émis au démarrage du flux. */
  state: string;
}

export interface PennylaneInvoiceLinePayload {
  label: string;
  quantity: number;
  /** Prix unitaire HT en euros (string décimale pour Pennylane). */
  unitPriceHt: string;
  /** Code TVA Pennylane, ex. FR_200 */
  vatRate: string;
  unit?: string;
}

export interface PennylaneCustomerPayload {
  /** ID client Planwise (external_reference). */
  planwiseCustomerId: string;
  name: string;
  email?: string;
  vatNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface SyncCaseToPennylaneBody {
  organizationId: string;
  caseId: string;
  caseTitle: string;
  /** Référence externe unique (idempotence). */
  externalReference: string;
  invoiceDate: string;
  deadline?: string;
  customer: PennylaneCustomerPayload;
  lines: PennylaneInvoiceLinePayload[];
  /** Si true, crée une facture brouillon (recommandé). */
  draft?: boolean;
}

export interface SyncCaseToPennylaneResult {
  provider: "pennylane";
  caseId: string;
  pennylaneCustomerId: string;
  pennylaneInvoiceId: string;
  draft: boolean;
  invoiceUrl?: string;
}

/* ── Qonto (connexion organisation — v1) ─────────────────────── */

export interface QontoConnectionStatus {
  provider: "qonto";
  connected: boolean;
  companyId?: string;
  companyName?: string;
  connectedAt?: string;
  tokenHint?: string;
  authMethod?: QontoAuthMethod;
  /** True si Client ID/Secret OAuth Qonto sont configurés sur la plateforme. */
  oauthAvailable?: boolean;
}

export interface ConnectQontoBody {
  organizationId: string;
  /** Identifiant de connexion Qonto (login / sign-in). */
  login: string;
  /** Clé secrète API Qonto. */
  secretKey: string;
}

export interface DisconnectQontoBody {
  organizationId: string;
}

export interface QontoOAuthStartResponse {
  authorizationUrl: string;
}

export interface CompleteQontoOAuthBody {
  organizationId: string;
  code: string;
  state: string;
}

export interface QontoInvoiceLinePayload {
  label: string;
  quantity: number;
  /** Prix unitaire HT en euros (string décimale). */
  unitPriceHt: string;
  /** Taux TVA décimal Qonto, ex. "0.20" pour 20 %. */
  vatRate: string;
  unit?: string;
}

export interface QontoCustomerPayload {
  planwiseCustomerId: string;
  kind: "individual" | "company";
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  /** SIREN / SIRET / identifiant fiscal. */
  legalIdentifier?: string;
  vatNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface SyncCaseToQontoBody {
  organizationId: string;
  caseId: string;
  caseTitle: string;
  externalReference: string;
  invoiceDate: string;
  deadline?: string;
  customer: QontoCustomerPayload;
  lines: QontoInvoiceLinePayload[];
  /** Si true (défaut), crée une facture brouillon. */
  draft?: boolean;
  /**
   * Numéro de facture Qonto.
   * Omit pour laisser Qonto auto-numéroter ; requis si la numérotation auto est désactivée.
   */
  invoiceNumber?: string;
}

/** Message renvoyé quand Qonto exige un numéro de facture (numérotation auto absente). */
export const QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE =
  "La numérotation automatique des factures n’est pas activée sur Qonto. Activez-la dans Qonto → Facturation → Paramètres → Numérotation, ou saisissez un numéro de facture manuellement.";

export interface SyncCaseToQontoResult {
  provider: "qonto";
  caseId: string;
  qontoCustomerId: string;
  qontoInvoiceId: string;
  draft: boolean;
  invoiceUrl?: string;
}
