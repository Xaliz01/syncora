import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import axios from "axios";
import type {
  AuthUser,
  CaseResponse,
  ConnectPennylaneBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QuoteResponse,
  SyncCaseToPennylaneBody,
  SyncCaseToPennylaneResult,
  TvaRate,
} from "@planwise/shared";
import { AbstractIntegrationsGatewayService } from "./ports/integrations.service.port";
import { AbstractCasesGatewayService } from "./ports/cases.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";

const INTEGRATIONS_URL = process.env.INTEGRATIONS_SERVICE_URL ?? "http://localhost:3013";

const TVA_TO_PENNYLANE: Record<TvaRate, string> = {
  0: "FR_0",
  5.5: "FR_55",
  10: "FR_100",
  20: "FR_200",
};

@Injectable()
export class IntegrationsGatewayService extends AbstractIntegrationsGatewayService {
  constructor(
    private readonly httpService: HttpService,
    private readonly casesService: AbstractCasesGatewayService,
    private readonly customersService: AbstractCustomersGatewayService,
  ) {
    super();
  }

  async getPennylaneStatus(user: AuthUser): Promise<PennylaneConnectionStatus> {
    return this.getJson("/integrations/pennylane", {
      organizationId: user.organizationId,
    });
  }

  async startPennylaneOAuth(user: AuthUser): Promise<PennylaneOAuthStartResponse> {
    return this.postJson("/integrations/pennylane/oauth/start", {
      organizationId: user.organizationId,
    });
  }

  async completePennylaneOAuth(
    user: AuthUser,
    body: { code: string; state: string },
  ): Promise<PennylaneConnectionStatus> {
    return this.postJson("/integrations/pennylane/oauth/complete", {
      organizationId: user.organizationId,
      code: body.code,
      state: body.state,
    });
  }

  async connectPennylane(
    user: AuthUser,
    body: Omit<ConnectPennylaneBody, "organizationId">,
  ): Promise<PennylaneConnectionStatus> {
    return this.postJson("/integrations/pennylane/connect", {
      organizationId: user.organizationId,
      apiToken: body.apiToken,
    });
  }

  async disconnectPennylane(user: AuthUser): Promise<PennylaneConnectionStatus> {
    try {
      const res = await firstValueFrom(
        this.httpService.delete<PennylaneConnectionStatus>(
          `${INTEGRATIONS_URL}/integrations/pennylane`,
          { params: { organizationId: user.organizationId } },
        ),
      );
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  async syncCaseToPennylane(
    user: AuthUser,
    caseId: string,
    options?: { quoteId?: string },
  ): Promise<SyncCaseToPennylaneResult> {
    const caseData = await this.casesService.getCase(user, caseId);
    if (caseData.billingStatus !== "to_invoice" && caseData.billingStatus !== "invoiced") {
      throw new BadRequestException(
        "Le dossier doit être au statut « À facturer » (ou déjà facturé pour reconsulter).",
      );
    }

    if (!caseData.customerId) {
      throw new BadRequestException(
        "Le dossier n’a pas de client. Assignez un client avant l’envoi vers Pennylane.",
      );
    }

    const customer = await this.customersService.getCustomer(user, caseData.customerId);
    const lines = await this.buildInvoiceLines(user, caseData, options?.quoteId);

    const today = new Date().toISOString().slice(0, 10);
    const payload: SyncCaseToPennylaneBody = {
      organizationId: user.organizationId,
      caseId: caseData.id,
      caseTitle: caseData.title,
      externalReference: `planwise-case-${caseData.id}`,
      invoiceDate: today,
      draft: true,
      customer: {
        planwiseCustomerId: customer.id,
        name: customer.displayName,
        email: customer.email,
        addressLine1: customer.address?.line1,
        addressLine2: customer.address?.line2,
        postalCode: customer.address?.postalCode,
        city: customer.address?.city,
        country: customer.address?.country || "FR",
      },
      lines,
    };

    const result = await this.postJson<SyncCaseToPennylaneResult>(
      "/integrations/pennylane/sync-case",
      payload,
    );

    if (caseData.billingStatus === "to_invoice") {
      await this.casesService.updateCase(user, caseId, { billingStatus: "invoiced" });
    }

    return result;
  }

  private async buildInvoiceLines(
    user: AuthUser,
    caseData: CaseResponse,
    quoteId?: string,
  ): Promise<SyncCaseToPennylaneBody["lines"]> {
    let quote: QuoteResponse | undefined;
    if (quoteId) {
      quote = await this.casesService.getQuote(user, quoteId);
      if (quote.caseId !== caseData.id) {
        throw new BadRequestException("Le devis ne correspond pas à ce dossier.");
      }
    } else {
      const quotes = await this.casesService.listQuotes(user, { caseId: caseData.id });
      const accepted = quotes.find((q) => q.status === "accepted");
      const preferred = accepted ?? quotes[0];
      if (preferred) {
        quote = await this.casesService.getQuote(user, preferred.id);
      }
    }

    if (quote?.lines?.length) {
      return quote.lines.map((line) => ({
        label: line.description || caseData.title,
        quantity: line.quantity,
        unitPriceHt: line.unitPrice.toFixed(2),
        vatRate: TVA_TO_PENNYLANE[line.tvaRate] ?? "FR_200",
        unit: line.unit,
      }));
    }

    return [
      {
        label: caseData.title,
        quantity: 1,
        unitPriceHt: "0.00",
        vatRate: "FR_200",
      },
    ];
  }

  private async getJson<T>(path: string, params: Record<string, string>): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<T>(`${INTEGRATIONS_URL}${path}`, { params }),
      );
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<T>(`${INTEGRATIONS_URL}${path}`, body),
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
      const message = Array.isArray(raw)
        ? raw.join(", ")
        : (raw ?? "Erreur d’intégration Pennylane");
      if (status === 400) throw new BadRequestException(message);
      if (status === 404) throw new BadRequestException(message);
      throw new ServiceUnavailableException(message);
    }
    throw err;
  }
}
