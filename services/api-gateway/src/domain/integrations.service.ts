import {
  BadRequestException,
  GoneException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import axios from "axios";
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
import { AbstractCasesGatewayService } from "./ports/cases.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "./ports/order-givers.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class IntegrationsGatewayService extends AbstractIntegrationsGatewayService {
  constructor(
    private readonly httpService: HttpService,
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
    const params: Record<string, string> = { organizationId: user.organizationId };
    if (filters?.remoteStatus) params.remoteStatus = filters.remoteStatus;
    if (filters?.provider) params.provider = filters.provider;
    if (filters?.invoiceKind) params.invoiceKind = filters.invoiceKind;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.limit != null) params.limit = String(filters.limit);
    if (filters?.offset != null) params.offset = String(filters.offset);

    const customerId = filters?.customerId?.trim();
    const orderGiverId = filters?.orderGiverId?.trim();
    if (customerId || orderGiverId) {
      const caseIds = await this.casesService.listCaseIdsForParty(user, {
        customerId,
        orderGiverId,
      });
      if (caseIds.length === 0) {
        return { invoices: [], total: 0 };
      }
      params.caseIds = caseIds.join(",");
    }

    const raw = await this.getJson<OrganizationInvoiceSyncsListResponse>(
      "/integrations/invoice-syncs",
      params,
    );
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
    const params: Record<string, string> = { organizationId: user.organizationId };
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.provider) params.provider = filters.provider;
    return this.getJson<OrganizationInvoiceSyncStatsResponse>(
      "/integrations/invoice-syncs/stats",
      params,
    );
  }

  async getCaseInvoiceSync(user: AuthUser, caseId: string): Promise<CaseInvoiceSyncListResponse> {
    return this.getJson<CaseInvoiceSyncListResponse>(`/integrations/cases/${caseId}/invoice-sync`, {
      organizationId: user.organizationId,
    });
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

  private async getJson<T>(path: string, params: Record<string, string>): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<T>(`${SERVICE_URLS.integrations}${path}`, { params }),
      );
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  private rethrow(err: unknown): never {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        throw new ServiceUnavailableException(
          "Service d’intégrations indisponible. Réessayez dans un instant.",
        );
      }
      const status = err.response.status;
      const data = err.response.data as { message?: string | string[] } | undefined;
      const raw = data?.message;
      const message = Array.isArray(raw) ? raw.join(", ") : (raw ?? "Erreur d’intégration");
      if (status === 400) throw new BadRequestException(message);
      if (status === 404) throw new BadRequestException(message);
      throw new ServiceUnavailableException(message);
    }
    throw err;
  }
}
