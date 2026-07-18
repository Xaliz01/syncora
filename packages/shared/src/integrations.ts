/** Contrats API intégrations compta (Pennylane, etc.) — Phase 3.3 */

export const INTEGRATION_PROVIDERS = ["pennylane"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export type PennylaneAuthMethod = "oauth" | "api_token";

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
