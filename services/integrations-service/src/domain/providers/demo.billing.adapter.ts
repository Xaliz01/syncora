import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import type {
  CaseInvoiceSyncStatus,
  DemoConnectionStatus,
  IntegrationProvider,
  SyncCaseToDemoBody,
  SyncCaseToDemoResult,
} from "@planwise/shared";
import { organizationScopeFilter, requireOrganizationId } from "@planwise/shared";
import {
  IntegrationCredentialDocument,
  IntegrationSyncDocument,
} from "../../persistence/integration.schema";
import { encryptSecret } from "../secret-crypto";
import type { BillingProviderAdapter } from "./billing-provider.adapter";
import {
  DEMO_PROVIDER,
  invoiceMetaFromBody,
  persistRemoteInvoiceState,
  syncRemoteInvoiceId,
  toCaseInvoiceSyncStatus,
} from "./invoice-sync.helpers";

/** Facturation simulée (essai) : aucun appel distant, tout est local. */
@Injectable()
export class DemoBillingAdapter implements BillingProviderAdapter {
  readonly provider: IntegrationProvider = DEMO_PROVIDER;

  constructor(
    @InjectModel("IntegrationCredential")
    private readonly credentialModel: Model<IntegrationCredentialDocument>,
    @InjectModel("IntegrationSync")
    private readonly syncModel: Model<IntegrationSyncDocument>,
  ) {}

  async getStatus(organizationId: string): Promise<DemoConnectionStatus> {
    const orgId = requireOrganizationId(organizationId);
    const doc = await this.credentialModel
      .findOne({ ...organizationScopeFilter(orgId), provider: DEMO_PROVIDER })
      .exec();
    if (!doc) {
      return { provider: DEMO_PROVIDER, connected: false };
    }
    return {
      provider: DEMO_PROVIDER,
      connected: true,
      companyName: doc.companyName || "Facturation démo",
      connectedAt: doc.connectedAt?.toISOString(),
    };
  }

  async connect(organizationId: string): Promise<void> {
    const orgId = requireOrganizationId(organizationId);
    const now = new Date();
    await this.credentialModel
      .findOneAndUpdate(
        { organizationId: orgId, provider: DEMO_PROVIDER },
        {
          organizationId: orgId,
          provider: DEMO_PROVIDER,
          authMethod: "demo",
          encryptedToken: encryptSecret("demo-local-token"),
          tokenHint: "••••demo",
          encryptedRefreshToken: null,
          accessTokenExpiresAt: null,
          companyId: "demo",
          companyName: "Facturation démo",
          connectedAt: now,
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  async disconnect(organizationId: string): Promise<DemoConnectionStatus> {
    const orgId = requireOrganizationId(organizationId);
    await this.credentialModel
      .deleteOne({ ...organizationScopeFilter(orgId), provider: DEMO_PROVIDER })
      .exec();
    return { provider: DEMO_PROVIDER, connected: false };
  }

  async syncCase(body: SyncCaseToDemoBody): Promise<SyncCaseToDemoResult> {
    const orgId = requireOrganizationId(body.organizationId);
    if (!body.caseId?.trim()) {
      throw new BadRequestException("caseId est requis.");
    }
    if (!body.lines?.length) {
      throw new BadRequestException("Au moins une ligne de facture est requise.");
    }

    const credential = await this.credentialModel
      .findOne({ ...organizationScopeFilter(orgId), provider: DEMO_PROVIDER })
      .exec();
    if (!credential) {
      throw new NotFoundException(
        "La facturation démo n’est pas activée. Activez-la dans Paramètres → Intégrations.",
      );
    }

    const draft = body.draft !== false;
    const invoiceId = randomUUID();
    const customerId = body.customer.planwiseCustomerId?.trim() || randomUUID();
    const invoiceNumber = draft
      ? `BROUILLON-DEMO-${invoiceId.slice(0, 8).toUpperCase()}`
      : `DEMO-${invoiceId.slice(0, 8).toUpperCase()}`;
    const amountHt =
      body.amountHt?.trim() ||
      body.lines
        .reduce((sum, line) => sum + Number(line.unitPriceHt) * Number(line.quantity), 0)
        .toFixed(2);
    const invoiceUrl = this.buildDemoInvoiceUrl({
      invoiceId,
      invoiceNumber,
      caseTitle: body.caseTitle,
      customerName: body.customer.name,
      amountHt,
      draft,
      lines: body.lines.map((line) => ({
        label: line.label,
        quantity: line.quantity,
        unitPriceHt: line.unitPriceHt,
        vatRate: line.vatRate,
      })),
    });

    const createdDoc = await this.syncModel.create({
      organizationId: orgId,
      provider: DEMO_PROVIDER,
      caseId: body.caseId,
      externalReference: body.externalReference,
      providerCustomerId: customerId,
      providerInvoiceId: invoiceId,
      draft,
      remoteStatus: draft ? "draft" : "finalized",
      invoiceUrl,
      invoiceNumber,
      lastSyncedAt: new Date(),
      ...invoiceMetaFromBody(body),
      ...(body.amountHt?.trim() ? {} : { amountHt }),
    });

    return {
      provider: DEMO_PROVIDER,
      caseId: body.caseId,
      syncId: String(createdDoc._id),
      demoCustomerId: customerId,
      demoInvoiceId: invoiceId,
      draft,
      invoiceUrl,
    };
  }

  async finalize(doc: IntegrationSyncDocument): Promise<CaseInvoiceSyncStatus> {
    const invoiceNumber =
      doc.invoiceNumber?.trim() ||
      `DEMO-${syncRemoteInvoiceId(doc).slice(0, 8).toUpperCase() || "FINAL"}`;
    return persistRemoteInvoiceState(doc, {
      remoteStatus: "finalized",
      draft: false,
      invoiceNumber,
      invoiceUrl: this.rewriteDemoInvoiceUrl(doc.invoiceUrl, { draft: false, invoiceNumber }),
    });
  }

  async refresh(doc: IntegrationSyncDocument): Promise<CaseInvoiceSyncStatus> {
    doc.lastSyncedAt = new Date();
    await doc.save();
    return toCaseInvoiceSyncStatus(doc);
  }

  async deleteRemoteDraft(): Promise<void> {
    // Facturation démo : suppression locale uniquement.
  }

  private buildDemoInvoiceUrl(params: {
    invoiceId: string;
    invoiceNumber: string;
    caseTitle: string;
    customerName: string;
    amountHt: string;
    draft: boolean;
    lines: Array<{ label: string; quantity: number; unitPriceHt: string; vatRate: string }>;
  }): string {
    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const qs = new URLSearchParams({
      id: params.invoiceId,
      number: params.invoiceNumber,
      title: params.caseTitle.slice(0, 200),
      customer: params.customerName.slice(0, 200),
      amountHt: params.amountHt,
      draft: params.draft ? "1" : "0",
      lines: JSON.stringify(
        params.lines.slice(0, 40).map((line) => ({
          l: line.label.slice(0, 120),
          q: line.quantity,
          p: line.unitPriceHt,
          v: line.vatRate,
        })),
      ),
    });
    return `${appUrl}/demo-invoice?${qs.toString()}`;
  }

  private rewriteDemoInvoiceUrl(
    currentUrl: string | undefined,
    updates: { draft: boolean; invoiceNumber: string },
  ): string | undefined {
    if (!currentUrl) return currentUrl;
    try {
      const url = new URL(currentUrl);
      url.searchParams.set("draft", updates.draft ? "1" : "0");
      url.searchParams.set("number", updates.invoiceNumber);
      return url.toString();
    } catch {
      return currentUrl;
    }
  }
}
