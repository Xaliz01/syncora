import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type {
  CaseInvoiceKind,
  CaseInvoiceSyncListResponse,
  CaseInvoiceSyncStatus,
  CompletePennylaneOAuthBody,
  CompleteQontoOAuthBody,
  ConnectPennylaneBody,
  ConnectQontoBody,
  DemoConnectionStatus,
  OrganizationInvoiceSyncStatsResponse,
  OrganizationInvoiceSyncsListResponse,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  RefreshPendingInvoiceSyncsResult,
  RemoteInvoiceLifecycle,
  SyncCaseToDemoBody,
  SyncCaseToDemoResult,
  SyncCaseToPennylaneBody,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoBody,
  SyncCaseToQontoResult,
} from "@planwise/shared";
import {
  CASE_INVOICE_KINDS,
  clampPagination,
  organizationScopeFilter,
  requireOrganizationId,
  sumInvoiceAmountsHt,
} from "@planwise/shared";
import { AbstractIntegrationsService } from "./ports/integrations.service.port";
import {
  IntegrationCredentialDocument,
  IntegrationSyncDocument,
} from "../persistence/integration.schema";
import {
  BILLING_PROVIDER_ADAPTERS,
  type BillingProviderAdapter,
} from "./providers/billing-provider.adapter";
import { DemoBillingAdapter } from "./providers/demo.billing.adapter";
import { PennylaneBillingAdapter } from "./providers/pennylane.billing.adapter";
import { QontoBillingAdapter } from "./providers/qonto.billing.adapter";
import {
  BILLING_PROVIDERS,
  type BillingProvider,
  DEMO_PROVIDER,
  PENNYLANE_PROVIDER,
  QONTO_PROVIDER,
  resolveInvoiceSyncBatchSize,
  resolveRemoteLifecycle,
  syncRemoteInvoiceId,
  toCaseInvoiceSyncStatus,
} from "./providers/invoice-sync.helpers";

@Injectable()
export class IntegrationsService extends AbstractIntegrationsService {
  constructor(
    @InjectModel("IntegrationCredential")
    private readonly credentialModel: Model<IntegrationCredentialDocument>,
    @InjectModel("IntegrationSync")
    private readonly syncModel: Model<IntegrationSyncDocument>,
    private readonly pennylane: PennylaneBillingAdapter,
    private readonly qonto: QontoBillingAdapter,
    private readonly demo: DemoBillingAdapter,
    @Inject(BILLING_PROVIDER_ADAPTERS)
    private readonly adapters: Map<string, BillingProviderAdapter>,
  ) {
    super();
  }

  // ── Pennylane ──────────────────────────────────────────────────────

  async getPennylaneStatus(organizationId: string): Promise<PennylaneConnectionStatus> {
    return this.pennylane.getStatus(organizationId);
  }

  async startPennylaneOAuth(organizationId: string): Promise<PennylaneOAuthStartResponse> {
    return this.pennylane.startOAuth(organizationId);
  }

  async completePennylaneOAuth(
    body: CompletePennylaneOAuthBody,
  ): Promise<PennylaneConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    await this.pennylane.completeOAuth(body);
    await this.clearOtherBillingIntegration(orgId, PENNYLANE_PROVIDER);
    return this.pennylane.getStatus(orgId);
  }

  async connectPennylane(body: ConnectPennylaneBody): Promise<PennylaneConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    await this.pennylane.connect(body);
    await this.clearOtherBillingIntegration(orgId, PENNYLANE_PROVIDER);
    return this.pennylane.getStatus(orgId);
  }

  async disconnectPennylane(organizationId: string): Promise<PennylaneConnectionStatus> {
    return this.pennylane.disconnect(organizationId);
  }

  async syncCaseToPennylane(body: SyncCaseToPennylaneBody): Promise<SyncCaseToPennylaneResult> {
    return this.pennylane.syncCase(body);
  }

  // ── Qonto ──────────────────────────────────────────────────────────

  async getQontoStatus(organizationId: string): Promise<QontoConnectionStatus> {
    return this.qonto.getStatus(organizationId);
  }

  async startQontoOAuth(organizationId: string): Promise<QontoOAuthStartResponse> {
    return this.qonto.startOAuth(organizationId);
  }

  async completeQontoOAuth(body: CompleteQontoOAuthBody): Promise<QontoConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    await this.qonto.completeOAuth(body);
    await this.clearOtherBillingIntegration(orgId, QONTO_PROVIDER);
    return this.qonto.getStatus(orgId);
  }

  async connectQonto(body: ConnectQontoBody): Promise<QontoConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    await this.qonto.connect(body);
    await this.clearOtherBillingIntegration(orgId, QONTO_PROVIDER);
    return this.qonto.getStatus(orgId);
  }

  async disconnectQonto(organizationId: string): Promise<QontoConnectionStatus> {
    return this.qonto.disconnect(organizationId);
  }

  async syncCaseToQonto(body: SyncCaseToQontoBody): Promise<SyncCaseToQontoResult> {
    return this.qonto.syncCase(body);
  }

  // ── Demo (facturation simulée, essai) ──

  async getDemoStatus(organizationId: string): Promise<DemoConnectionStatus> {
    return this.demo.getStatus(organizationId);
  }

  async connectDemo(organizationId: string): Promise<DemoConnectionStatus> {
    const orgId = requireOrganizationId(organizationId);
    await this.demo.connect(orgId);
    await this.clearOtherBillingIntegration(orgId, DEMO_PROVIDER);
    return this.demo.getStatus(orgId);
  }

  async disconnectDemo(organizationId: string): Promise<DemoConnectionStatus> {
    return this.demo.disconnect(organizationId);
  }

  async syncCaseToDemo(body: SyncCaseToDemoBody): Promise<SyncCaseToDemoResult> {
    return this.demo.syncCase(body);
  }

  // ── Suivi des factures synchronisées ───────────────────────────────

  async getCaseInvoiceSync(
    organizationId: string,
    caseId: string,
  ): Promise<CaseInvoiceSyncListResponse> {
    const orgId = requireOrganizationId(organizationId);
    if (!caseId?.trim()) {
      throw new BadRequestException("caseId est requis.");
    }
    const docs = await this.syncModel
      .find({
        ...organizationScopeFilter(orgId),
        caseId: caseId.trim(),
        detachedAt: { $exists: false },
      })
      .sort({ createdAt: -1 })
      .exec();
    return { invoices: docs.map((doc) => toCaseInvoiceSyncStatus(doc)) };
  }

  async listOrganizationInvoiceSyncs(
    organizationId: string,
    filters?: {
      remoteStatus?: string;
      provider?: string;
      invoiceKind?: string;
      startDate?: string;
      endDate?: string;
      caseIds?: string[];
      limit?: number;
      offset?: number;
    },
  ): Promise<OrganizationInvoiceSyncsListResponse> {
    const orgId = requireOrganizationId(organizationId);
    if (filters?.caseIds !== undefined && filters.caseIds.length === 0) {
      return { invoices: [], total: 0 };
    }
    const query = this.buildInvoiceSyncListQuery(orgId, filters);
    const { limit, offset } = clampPagination({
      limit: filters?.limit,
      offset: filters?.offset,
    });

    const [total, docs] = await Promise.all([
      this.syncModel.countDocuments(query).exec(),
      this.syncModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
    ]);

    return {
      invoices: docs.map((doc) => toCaseInvoiceSyncStatus(doc)),
      total,
    };
  }

  async getOrganizationInvoiceSyncStats(
    organizationId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      provider?: string;
    },
  ): Promise<OrganizationInvoiceSyncStatsResponse> {
    const orgId = requireOrganizationId(organizationId);
    const query = this.buildInvoiceSyncListQuery(orgId, filters);
    const docs = await this.syncModel
      .find(query)
      .select({ remoteStatus: 1, invoiceKind: 1, amountHt: 1, draft: 1 })
      .lean()
      .exec();

    const byKind: Partial<Record<CaseInvoiceKind, number>> = {};
    let draftCount = 0;
    let finalizedCount = 0;
    let paidCount = 0;
    let cancelledCount = 0;
    let unknownCount = 0;
    const draftInvoices: Array<{ amountHt?: string; remoteStatus?: RemoteInvoiceLifecycle }> = [];
    const finalizedInvoices: Array<{ amountHt?: string; remoteStatus?: RemoteInvoiceLifecycle }> =
      [];
    const paidInvoices: Array<{ amountHt?: string; remoteStatus?: RemoteInvoiceLifecycle }> = [];
    const activeInvoices: Array<{ amountHt?: string; remoteStatus?: RemoteInvoiceLifecycle }> = [];

    for (const doc of docs) {
      const status =
        (doc.remoteStatus as RemoteInvoiceLifecycle | undefined) ??
        (doc.draft === false ? "finalized" : "draft");
      const kind = (doc.invoiceKind as CaseInvoiceKind | undefined) ?? "full";
      if (CASE_INVOICE_KINDS.includes(kind)) {
        byKind[kind] = (byKind[kind] ?? 0) + 1;
      }
      const row = { amountHt: doc.amountHt, remoteStatus: status };
      if (status !== "cancelled") activeInvoices.push(row);
      switch (status) {
        case "draft":
          draftCount += 1;
          draftInvoices.push(row);
          break;
        case "finalized":
          finalizedCount += 1;
          finalizedInvoices.push(row);
          break;
        case "paid":
          paidCount += 1;
          paidInvoices.push(row);
          break;
        case "cancelled":
          cancelledCount += 1;
          break;
        default:
          unknownCount += 1;
          break;
      }
    }

    return {
      total: docs.length,
      draftCount,
      finalizedCount,
      paidCount,
      cancelledCount,
      unknownCount,
      amountHtDraft: sumInvoiceAmountsHt(draftInvoices).toFixed(2),
      amountHtFinalized: sumInvoiceAmountsHt(finalizedInvoices).toFixed(2),
      amountHtPaid: sumInvoiceAmountsHt(paidInvoices).toFixed(2),
      amountHtTotal: sumInvoiceAmountsHt(activeInvoices).toFixed(2),
      byKind,
    };
  }

  private buildInvoiceSyncListQuery(
    organizationId: string,
    filters?: {
      remoteStatus?: string;
      provider?: string;
      invoiceKind?: string;
      startDate?: string;
      endDate?: string;
      caseIds?: string[];
    },
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {
      ...organizationScopeFilter(organizationId),
      detachedAt: { $exists: false },
    };
    if (filters?.caseIds?.length) {
      const ids = [...new Set(filters.caseIds.map((id) => id.trim()).filter(Boolean))].slice(
        0,
        1000,
      );
      if (ids.length > 0) query.caseId = { $in: ids };
    }
    if (filters?.provider?.trim()) query.provider = filters.provider.trim();
    if (filters?.invoiceKind?.trim()) query.invoiceKind = filters.invoiceKind.trim();
    if (filters?.remoteStatus?.trim()) {
      const status = filters.remoteStatus.trim();
      if (status === "draft") {
        query.$or = [{ remoteStatus: "draft" }, { remoteStatus: { $exists: false }, draft: true }];
      } else {
        query.remoteStatus = status;
      }
    }
    if (filters?.startDate || filters?.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) {
        createdAt.$gte = new Date(
          filters.startDate.includes("T") ? filters.startDate : `${filters.startDate}T00:00:00.000`,
        );
      }
      if (filters.endDate) {
        createdAt.$lte = new Date(
          filters.endDate.includes("T") ? filters.endDate : `${filters.endDate}T23:59:59.999`,
        );
      }
      query.createdAt = createdAt;
    }
    return query;
  }

  async finalizeCaseInvoice(
    organizationId: string,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus> {
    const orgId = requireOrganizationId(organizationId);
    const doc = await this.requireCaseSync(orgId, caseId, syncId);
    if (!doc.draft && doc.remoteStatus && doc.remoteStatus !== "draft") {
      return toCaseInvoiceSyncStatus(doc);
    }
    return this.requireAdapter(doc.provider).finalize(doc);
  }

  async refreshCaseInvoiceSync(
    organizationId: string,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus> {
    const orgId = requireOrganizationId(organizationId);
    const doc = await this.requireCaseSync(orgId, caseId, syncId);
    return this.refreshSyncDocument(doc);
  }

  async refreshAllCaseInvoiceSyncs(
    organizationId: string,
    caseId: string,
  ): Promise<CaseInvoiceSyncListResponse> {
    const orgId = requireOrganizationId(organizationId);
    if (!caseId?.trim()) {
      throw new BadRequestException("caseId est requis.");
    }
    const docs = await this.syncModel
      .find({ ...organizationScopeFilter(orgId), caseId: caseId.trim() })
      .exec();
    for (const doc of docs) {
      try {
        await this.refreshSyncDocument(doc);
      } catch {
        // Une facture en erreur n’empêche pas le rafraîchissement des autres.
      }
    }
    return this.getCaseInvoiceSync(orgId, caseId);
  }

  async deleteCaseInvoiceSync(
    organizationId: string,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncListResponse> {
    const orgId = requireOrganizationId(organizationId);
    const doc = await this.requireCaseSync(orgId, caseId, syncId);
    const status = resolveRemoteLifecycle(doc);
    const isDraft = status === "draft" || doc.draft === true;
    const isDetachOnly = status === "cancelled" || status === "unknown";

    if (!isDraft && !isDetachOnly) {
      throw new BadRequestException(
        "Seuls les brouillons (suppression provider) ou les factures annulées/introuvables (détachement) peuvent être retirés.",
      );
    }

    if (isDraft) {
      if (!syncRemoteInvoiceId(doc)) {
        throw new BadRequestException(
          "Identifiant de facture distant manquant — impossible de supprimer le brouillon.",
        );
      }
      const adapter = this.requireAdapter(doc.provider);
      try {
        await adapter.deleteRemoteDraft(doc);
      } catch (err) {
        // Déjà absent côté provider : on nettoie quand même le lien local.
        if (!(err instanceof NotFoundException)) {
          throw err;
        }
      }
    }

    await this.syncModel
      .updateOne(
        { _id: doc._id, ...organizationScopeFilter(orgId) },
        { $set: { detachedAt: new Date() } },
      )
      .exec();
    return this.getCaseInvoiceSync(orgId, caseId);
  }

  async refreshPendingInvoiceSyncs(): Promise<RefreshPendingInvoiceSyncsResult> {
    const batchSize = resolveInvoiceSyncBatchSize();
    // Les plus anciennes d’abord (null / jamais syncés en tête) pour éviter la famine
    // quand le volume dépasse la taille du batch.
    const pending = await this.syncModel
      .find({
        caseMissingAt: { $exists: false },
        detachedAt: { $exists: false },
        $or: [
          { draft: true },
          { remoteStatus: { $in: ["draft", "finalized", "unknown", null] } },
          { remoteStatus: { $exists: false } },
        ],
      })
      .sort({ lastSyncedAt: 1, _id: 1 })
      .limit(batchSize)
      .exec();

    const updated: CaseInvoiceSyncStatus[] = [];
    const errors: RefreshPendingInvoiceSyncsResult["errors"] = [];
    let skipped = 0;

    // Orgs encore connectées — les syncs orphelines (provider déconnecté) ne sont pas des erreurs.
    const credentialKeys = new Set(
      (
        await this.credentialModel.find({}).select({ organizationId: 1, provider: 1 }).lean().exec()
      ).map((c) => `${c.organizationId}:${c.provider}`),
    );

    for (const doc of pending) {
      const key = `${doc.organizationId}:${doc.provider}`;
      if (!credentialKeys.has(key)) {
        skipped += 1;
        // Reculer dans la file pour ne pas monopoliser le batch à chaque cron.
        doc.lastSyncedAt = new Date();
        await doc.save();
        continue;
      }

      try {
        const status = await this.refreshSyncDocument(doc);
        updated.push(status);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de synchronisation";
        // Filet de sécurité si le credential a disparu entre le check et le refresh.
        if (/n’est pas connecté/i.test(message)) {
          skipped += 1;
          doc.lastSyncedAt = new Date();
          await doc.save();
          continue;
        }
        errors.push({
          organizationId: doc.organizationId,
          caseId: doc.caseId,
          syncId: String(doc._id),
          message,
        });
      }
    }

    return { refreshed: pending.length, skipped, updated, errors };
  }

  async markInvoiceSyncsCaseMissing(organizationId: string, caseId: string): Promise<number> {
    const orgId = organizationId.trim();
    const cid = caseId.trim();
    if (!orgId || !cid) return 0;
    const result = await this.syncModel
      .updateMany(
        {
          ...organizationScopeFilter(orgId),
          caseId: cid,
          caseMissingAt: { $exists: false },
          detachedAt: { $exists: false },
        },
        { $set: { caseMissingAt: new Date(), lastSyncedAt: new Date() } },
      )
      .exec();
    return result.modifiedCount ?? 0;
  }

  async purgeTestData(organizationId: string): Promise<{ purged: true }> {
    const orgId = organizationId.trim();
    if (!orgId) return { purged: true };
    const scope = organizationScopeFilter(orgId);
    // Mode démo uniquement : ne pas toucher aux syncs / credentials Pennylane ou Qonto réels.
    await Promise.all([
      this.syncModel.deleteMany({ ...scope, provider: "demo" }).exec(),
      this.credentialModel.deleteMany({ ...scope, authMethod: "demo" }).exec(),
      this.credentialModel.deleteMany({ ...scope, provider: "demo" }).exec(),
    ]);
    return { purged: true };
  }

  async listPlatformIntegrations(filters?: {
    provider?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    integrations: Array<{
      organizationId: string;
      provider: string;
      connected: boolean;
      authMethod?: "oauth" | "api_token" | "demo";
      companyName?: string;
      companyId?: string;
      tokenHint?: string;
      connectedAt?: string;
    }>;
    total: number;
  }> {
    const limit = Math.min(Math.max(filters?.limit ?? 100, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const query: Record<string, unknown> = {};
    if (filters?.provider?.trim()) query.provider = filters.provider.trim();
    if (filters?.organizationId?.trim()) query.organizationId = filters.organizationId.trim();

    const [total, docs] = await Promise.all([
      this.credentialModel.countDocuments(query).exec(),
      this.credentialModel.find(query).sort({ connectedAt: -1 }).skip(offset).limit(limit).exec(),
    ]);

    return {
      total,
      integrations: docs.map((doc) => ({
        organizationId: doc.organizationId,
        provider: doc.provider,
        connected: true,
        authMethod:
          doc.authMethod === "oauth" ? "oauth" : doc.authMethod === "demo" ? "demo" : "api_token",
        companyName: doc.companyName,
        companyId: doc.companyId,
        tokenHint: doc.tokenHint,
        connectedAt: doc.connectedAt?.toISOString(),
      })),
    };
  }

  private requireAdapter(provider: string): BillingProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new BadRequestException(`Provider d’intégration inconnu : ${provider}`);
    }
    return adapter;
  }

  private async requireCaseSync(
    organizationId: string,
    caseId: string,
    syncId: string,
  ): Promise<IntegrationSyncDocument> {
    if (!caseId?.trim()) {
      throw new BadRequestException("caseId est requis.");
    }
    if (!syncId?.trim()) {
      throw new BadRequestException("syncId est requis.");
    }
    const doc = await this.syncModel
      .findOne({
        ...organizationScopeFilter(organizationId),
        caseId: caseId.trim(),
        _id: syncId.trim(),
        detachedAt: { $exists: false },
      })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        "Facture d’intégration introuvable pour ce dossier. Actualisez la liste puis réessayez.",
      );
    }
    return doc;
  }

  private async refreshSyncDocument(doc: IntegrationSyncDocument): Promise<CaseInvoiceSyncStatus> {
    return this.requireAdapter(doc.provider).refresh(doc);
  }

  /** Une seule intégration de facturation active à la fois (Pennylane XOR Qonto XOR démo). */
  private async clearOtherBillingIntegration(
    organizationId: string,
    keepProvider: BillingProvider,
  ): Promise<void> {
    for (const otherProvider of BILLING_PROVIDERS) {
      if (otherProvider === keepProvider) continue;
      const adapter = this.adapters.get(otherProvider);
      if (adapter?.beforeDisconnect) {
        const doc = await this.credentialModel
          .findOne({ ...organizationScopeFilter(organizationId), provider: otherProvider })
          .exec();
        if (doc) {
          await adapter.beforeDisconnect(doc);
        }
      }
      await this.credentialModel
        .deleteOne({ ...organizationScopeFilter(organizationId), provider: otherProvider })
        .exec();
    }
  }
}
