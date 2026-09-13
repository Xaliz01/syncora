/** Mentions réglementaires de facture (droit français) — textes types, pas un conseil juridique. */

export const INVOICE_MENTION_KEYS = [
  "paymentTerms",
  "latePenalties",
  "recoveryIndemnity",
  "discount",
  "vatFranchise",
] as const;

export type InvoiceMentionKey = (typeof INVOICE_MENTION_KEYS)[number];

export type InvoiceMentions = {
  paymentTerms?: string;
  latePenalties?: string;
  recoveryIndemnity?: string;
  discount?: string;
  vatFranchise?: string;
};

export const INVOICE_MENTION_MAX_LENGTH = 800;
export const ORG_LEGAL_IDENTITY_MAX_LENGTH = 200;

export const DEFAULT_INVOICE_MENTIONS_FR: Required<InvoiceMentions> = {
  paymentTerms: "Paiement à 30 jours fin de mois, sauf accord contraire.",
  latePenalties:
    "En cas de retard de paiement, des pénalités égales à trois fois le taux d’intérêt légal sont exigibles (art. L441-10 du Code de commerce).",
  recoveryIndemnity:
    "Indemnité forfaitaire de 40 € pour frais de recouvrement, due de plein droit en cas de retard de paiement (art. L441-10 du Code de commerce).",
  discount: "Aucun escompte n’est accordé pour paiement anticipé.",
  vatFranchise: "TVA non applicable, art. 293 B du CGI.",
};

export const INVOICE_MENTION_LABELS_FR: Record<InvoiceMentionKey, string> = {
  paymentTerms: "Conditions de paiement",
  latePenalties: "Pénalités de retard",
  recoveryIndemnity: "Indemnité forfaitaire de recouvrement",
  discount: "Escompte",
  vatFranchise: "Franchise en base de TVA",
};

function clipMention(value: string): string {
  return value.trim().slice(0, INVOICE_MENTION_MAX_LENGTH);
}

/** Vide / absent → défaut FR. `vatFranchise` n’est inclus que s’il est renseigné. */
export function resolveInvoiceMentions(custom?: InvoiceMentions | null): InvoiceMentions {
  const resolved: InvoiceMentions = {
    paymentTerms: custom?.paymentTerms?.trim() || DEFAULT_INVOICE_MENTIONS_FR.paymentTerms,
    latePenalties: custom?.latePenalties?.trim() || DEFAULT_INVOICE_MENTIONS_FR.latePenalties,
    recoveryIndemnity:
      custom?.recoveryIndemnity?.trim() || DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity,
    discount: custom?.discount?.trim() || DEFAULT_INVOICE_MENTIONS_FR.discount,
  };
  const vatFranchise = custom?.vatFranchise?.trim();
  if (vatFranchise) {
    resolved.vatFranchise = vatFranchise;
  }
  return resolved;
}

export function sanitizeInvoiceMentions(raw?: InvoiceMentions | null): InvoiceMentions | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: InvoiceMentions = {};
  for (const key of INVOICE_MENTION_KEYS) {
    const value = raw[key];
    if (typeof value !== "string") continue;
    const clipped = clipMention(value);
    if (clipped) out[key] = clipped;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function clipLegalIdentityField(value: string | null | undefined): string | undefined {
  const clipped = value?.trim().slice(0, ORG_LEGAL_IDENTITY_MAX_LENGTH);
  return clipped || undefined;
}
