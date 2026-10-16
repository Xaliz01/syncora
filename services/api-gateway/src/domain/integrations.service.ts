import { GoneException, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  BillingIntegrationAvailability,
  CaseInvoiceSyncListResponse,
  CaseInvoiceSyncStatus,
  CaseResponse,
  OrganizationInvoiceSyncItem,
  OrganizationInvoiceSyncStatsResponse,
  OrganizationInvoiceSyncsListResponse,
  ConnectPennylaneBody,
  ConnectQontoBody,
  DemoConnectionStatus,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  SyncCaseInvoiceOptions,
  SyncCaseToDemoResult,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoResult,
} from "@planwise/shared";
import { BILLING_CONNECTORS_UNAVAILABLE_MESSAGE } from "@planwise/shared";
import { AbstractIntegrationsGatewayService } from "./ports/integrations.service.port";
import { AbstractIntegrationsService } from "./integrations/ports/integrations.service.port";
import { AbstractCasesGatewayService } from "./ports/cases.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "./ports/order-givers.service.port";

@Injectable()
export class IntegrationsGatewayService extends AbstractIntegrationsGatewayService {
  constructor(
    private readonly integrations: AbstractIntegrationsService,
    private readonly casesService: AbstractCasesGatewayService,
    private readonly customersService: AbstractCustomersGatewayService,
    private readonly orderGiversService: AbstractOrderGiversGatewayService,
  ) {
    super();
  }

  private throwConnectorsUnavailable(): never {
    throw new GoneException(BILLING_CONNECTORS_UNAVAILABLE_MESSAGE);
  }

  async getPennylaneStatus(_user: AuthUser): Promise<PennylaneConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async startPennylaneOAuth(_user: AuthUser): Promise<PennylaneOAuthStartResponse> {
    this.throwConnectorsUnavailable();
  }

  async completePennylaneOAuth(
    _user: AuthUser,
    _body: { code: string; state: string },
  ): Promise<PennylaneConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async connectPennylane(
    _user: AuthUser,
    _body: Omit<ConnectPennylaneBody, "organizationId">,
  ): Promise<PennylaneConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async disconnectPennylane(_user: AuthUser): Promise<PennylaneConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async getQontoStatus(_user: AuthUser): Promise<QontoConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async getBillingIntegrationAvailability(
    _user: AuthUser,
  ): Promise<BillingIntegrationAvailability> {
    return {
      connected: false,
      pennylane: false,
      qonto: false,
      demo: false,
      demoAvailable: false,
    };
  }

  async getDemoStatus(_user: AuthUser): Promise<DemoConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async connectDemo(_user: AuthUser): Promise<DemoConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async disconnectDemo(_user: AuthUser): Promise<DemoConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async syncCaseToDemo(
    _user: AuthUser,
    _caseId: string,
    _options: SyncCaseInvoiceOptions,
  ): Promise<SyncCaseToDemoResult> {
    this.throwConnectorsUnavailable();
  }

  async startQontoOAuth(_user: AuthUser): Promise<QontoOAuthStartResponse> {
    this.throwConnectorsUnavailable();
  }

  async completeQontoOAuth(
    _user: AuthUser,
    _body: { code: string; state: string },
  ): Promise<QontoConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async connectQonto(
    _user: AuthUser,
    _body: Omit<ConnectQontoBody, "organizationId">,
  ): Promise<QontoConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async disconnectQonto(_user: AuthUser): Promise<QontoConnectionStatus> {
    this.throwConnectorsUnavailable();
  }

  async syncCaseToPennylane(
    _user: AuthUser,
    _caseId: string,
    _options: SyncCaseInvoiceOptions,
  ): Promise<SyncCaseToPennylaneResult> {
    this.throwConnectorsUnavailable();
  }

  async syncCaseToQonto(
    _user: AuthUser,
    _caseId: string,
    _options: SyncCaseInvoiceOptions,
  ): Promise<SyncCaseToQontoResult> {
    this.throwConnectorsUnavailable();
  }

  async listOrganizationInvoiceSyncs(
    user: AuthUser,
    filters?: {
      remoteStatus?: string;
      provider?: string;
      invoiceKind?: string;
      startDate?: string;
      endDate?: string;
      customerId?: string;
      orderGiverId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<OrganizationInvoiceSyncsListResponse> {
    const customerId = filters?.customerId?.trim();
    const orderGiverId = filters?.orderGiverId?.trim();
    let partyCaseIds: string[] | undefined;
    if (customerId || orderGiverId) {
      partyCaseIds = await this.casesService.listCaseIdsForParty(user, {
        customerId,
        orderGiverId,
      });
      if (partyCaseIds.length === 0) {
        return { invoices: [], total: 0 };
      }
    }

    const raw = await this.integrations.listOrganizationInvoiceSyncs(user.organizationId, {
      remoteStatus: filters?.remoteStatus,
      provider: filters?.provider,
      invoiceKind: filters?.invoiceKind,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      caseIds: partyCaseIds,
      limit: filters?.limit,
      offset: filters?.offset,
    });
    if (raw.invoices.length === 0) {
      return raw;
    }

    const caseIds = [...new Set(raw.invoices.map((i) => i.caseId).filter(Boolean))];
    const caseResults = await Promise.allSettled(
      caseIds.map((caseId) => this.casesService.getCase(user, caseId)),
    );

    const caseById = new Map<string, CaseResponse>();
    const customerIds: string[] = [];
    const orderGiverIds: string[] = [];
    caseResults.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const caseData = result.value;
      caseById.set(caseIds[index]!, caseData);
      if (caseData.orderGiverId) orderGiverIds.push(caseData.orderGiverId);
      else if (caseData.customerId) customerIds.push(caseData.customerId);
    });

    const [customers, orderGivers] = await Promise.all([
      this.customersService.listCustomersByIds(user, customerIds),
      this.orderGiversService.listOrderGiversByIds(user, orderGiverIds),
    ]);
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const orderGiverById = new Map(orderGivers.map((o) => [o.id, o]));

    const invoices: OrganizationInvoiceSyncItem[] = raw.invoices.map((invoice) => {
      const caseData = caseById.get(invoice.caseId);
      const billedParty = caseData?.orderGiverId
        ? orderGiverById.get(caseData.orderGiverId)
        : caseData?.customerId
          ? customerById.get(caseData.customerId)
          : undefined;
      return {
        ...invoice,
        caseTitle: caseData?.title,
        customerDisplayName: billedParty?.displayName,
      };
    });

    return { invoices, total: raw.total };
  }

  async getOrganizationInvoiceSyncStats(
    user: AuthUser,
    filters?: { startDate?: string; endDate?: string; provider?: string },
  ): Promise<OrganizationInvoiceSyncStatsResponse> {
    return this.integrations.getOrganizationInvoiceSyncStats(user.organizationId, filters);
  }

  async getCaseInvoiceSync(user: AuthUser, caseId: string): Promise<CaseInvoiceSyncListResponse> {
    return this.integrations.getCaseInvoiceSync(user.organizationId, caseId);
  }

  async finalizeCaseInvoice(
    _user: AuthUser,
    _caseId: string,
    _syncId: string,
  ): Promise<CaseInvoiceSyncStatus> {
    this.throwConnectorsUnavailable();
  }

  async refreshCaseInvoiceSync(
    _user: AuthUser,
    _caseId: string,
    _syncId: string,
  ): Promise<CaseInvoiceSyncStatus> {
    this.throwConnectorsUnavailable();
  }

  async refreshAllCaseInvoiceSyncs(
    _user: AuthUser,
    _caseId: string,
  ): Promise<CaseInvoiceSyncListResponse> {
    this.throwConnectorsUnavailable();
  }

  async deleteCaseInvoiceSync(
    _user: AuthUser,
    _caseId: string,
    _syncId: string,
  ): Promise<CaseInvoiceSyncListResponse> {
    this.throwConnectorsUnavailable();
  }
}
