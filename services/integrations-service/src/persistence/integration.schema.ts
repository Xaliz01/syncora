import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ collection: "integration_credentials", timestamps: true })
export class IntegrationCredentialDocument extends Document {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  provider!: string;

  /** Access token (OAuth) ou Company API token — chiffré AES-256-GCM. */
  @Prop({ required: true })
  encryptedToken!: string;

  @Prop()
  tokenHint?: string;

  /** oauth | api_token | demo — défaut historique = api_token. */
  @Prop({ default: "api_token" })
  authMethod?: "oauth" | "api_token" | "demo";

  /** Refresh token OAuth chiffré (rotation RTR Pennylane). */
  @Prop()
  encryptedRefreshToken?: string;

  /** Expiration de l’access token OAuth. */
  @Prop()
  accessTokenExpiresAt?: Date;

  @Prop()
  companyId?: string;

  @Prop()
  companyName?: string;

  @Prop()
  connectedAt?: Date;
}

export const IntegrationCredentialSchema = SchemaFactory.createForClass(
  IntegrationCredentialDocument,
);
IntegrationCredentialSchema.index({ organizationId: 1, provider: 1 }, { unique: true });

@Schema({ collection: "integration_syncs", timestamps: true })
export class IntegrationSyncDocument extends Document {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true })
  provider!: string;

  @Prop({ required: true, index: true })
  caseId!: string;

  /** Devis source (optionnel). */
  @Prop({ index: true })
  quoteId?: string;

  /** full | situation | deposit | balance */
  @Prop({ default: "full" })
  invoiceKind?: string;

  @Prop()
  situationNumber?: number;

  @Prop()
  situationPercent?: number;

  /** Montant HT de la facture (string décimale). */
  @Prop()
  amountHt?: string;

  @Prop({ required: true })
  externalReference!: string;

  /** ID client distant (Pennylane, Qonto, … selon `provider`). */
  @Prop({ required: true })
  providerCustomerId!: string;

  /** ID facture distante (Pennylane, Qonto, … selon `provider`). */
  @Prop({ required: true })
  providerInvoiceId!: string;

  /**
   * Anciens noms (prod pré-générique). Conservés en optionnel pour la lecture
   * pendant / juste après la migration au boot ; plus écrits.
   * @deprecated
   */
  @Prop()
  pennylaneCustomerId?: string;

  /** @deprecated */
  @Prop()
  pennylaneInvoiceId?: string;

  @Prop({ default: true })
  draft!: boolean;

  /** Cycle de vie distant normalisé (draft | finalized | paid | …). */
  @Prop()
  remoteStatus?: string;

  @Prop()
  invoiceUrl?: string;

  @Prop()
  invoiceNumber?: string;

  @Prop()
  lastSyncedAt?: Date;

  /**
   * Dossier introuvable (ex. purge essai) : on conserve la sync pour l’historique,
   * mais le cron ne la retraite plus (évite les GET /cases 404).
   */
  @Prop()
  caseMissingAt?: Date;

  /**
   * Facture détachée du dossier (brouillon distant supprimé ou annulée retirée de l’UI).
   * Conservée pour l’historique ; exclue des listes actives et du cron.
   */
  @Prop()
  detachedAt?: Date;
}

export const IntegrationSyncSchema = SchemaFactory.createForClass(IntegrationSyncDocument);
IntegrationSyncSchema.index(
  { organizationId: 1, provider: 1, providerInvoiceId: 1 },
  { unique: true, partialFilterExpression: { detachedAt: null } },
);
IntegrationSyncSchema.index({ organizationId: 1, caseId: 1 });
/** File d’attente du cron de rafraîchissement (plus anciennes d’abord). */
IntegrationSyncSchema.index({ lastSyncedAt: 1, _id: 1 });
