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

  /** oauth | api_token — défaut historique = api_token. */
  @Prop({ default: "api_token" })
  authMethod?: "oauth" | "api_token";

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

  @Prop({ required: true })
  externalReference!: string;

  /** ID client distant (Pennylane ou Qonto selon `provider`). */
  @Prop({ required: true })
  pennylaneCustomerId!: string;

  /** ID facture distante (Pennylane ou Qonto selon `provider`). */
  @Prop({ required: true })
  pennylaneInvoiceId!: string;

  @Prop({ default: true })
  draft!: boolean;

  @Prop()
  invoiceUrl?: string;
}

export const IntegrationSyncSchema = SchemaFactory.createForClass(IntegrationSyncDocument);
IntegrationSyncSchema.index({ organizationId: 1, caseId: 1, provider: 1 }, { unique: true });
