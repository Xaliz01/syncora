import { Injectable, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import axios from "axios";
import type {
  AuthUser,
  ExportFormat,
  ExportInvoicesListParams,
  ReportingStatsResponse,
  UserPermissionAssignmentResponse,
} from "@planwise/shared";
import { AbstractExportsGatewayService, type ExportResult } from "./ports/exports.service.port";

const EXPORTS_URL = process.env.EXPORTS_SERVICE_URL ?? "http://localhost:3012";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";

@Injectable()
export class ExportsGatewayService extends AbstractExportsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async exportCaseSummaryPdf(user: AuthUser, caseId: string): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/cases/${caseId}/pdf`, {
      organizationId: user.organizationId,
    });
  }

  async exportCasesList(
    user: AuthUser,
    format: ExportFormat,
    filters?: {
      status?: string;
      billingStatus?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/cases`, {
      organizationId: user.organizationId,
      format,
      ...this.cleanFilters(filters),
    });
  }

  async exportUsersList(user: AuthUser, format: ExportFormat): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/users`, {
      organizationId: user.organizationId,
      format,
    });
  }

  async exportCustomersList(
    user: AuthUser,
    format: ExportFormat,
    filters?: { search?: string; kind?: string },
  ): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/customers`, {
      organizationId: user.organizationId,
      format,
      ...this.cleanFilters(filters),
    });
  }

  async exportInterventionsList(
    user: AuthUser,
    format: ExportFormat,
    filters?: {
      startDate?: string;
      endDate?: string;
      assigneeId?: string;
      teamId?: string;
      status?: string;
    },
  ): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/interventions`, {
      organizationId: user.organizationId,
      format,
      ...this.cleanFilters(filters),
    });
  }

  async exportTechniciansActivity(
    user: AuthUser,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; technicianId?: string },
  ): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/technicians-activity`, {
      organizationId: user.organizationId,
      format,
      ...this.cleanFilters(filters),
    });
  }

  async exportMileageReport(
    user: AuthUser,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; teamId?: string },
  ): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/mileage-report`, {
      organizationId: user.organizationId,
      format,
      ...this.cleanFilters(filters),
    });
  }

  async exportDashboardTodoCases(
    user: AuthUser,
    format: ExportFormat,
    params: { templateId: string; todoLabel: string },
  ): Promise<ExportResult> {
    const userProfileId = await this.resolveUserProfileId(user);
    return this.proxyExport(`${EXPORTS_URL}/exports/dashboard-todo-cases`, {
      organizationId: user.organizationId,
      format,
      userId: user.id,
      userProfileId,
      templateId: params.templateId,
      todoLabel: params.todoLabel,
    });
  }

  async exportInvoicesList(
    user: AuthUser,
    format: ExportFormat,
    filters?: ExportInvoicesListParams,
  ): Promise<ExportResult> {
    return this.proxyExport(`${EXPORTS_URL}/exports/invoices`, {
      organizationId: user.organizationId,
      format,
      ...this.cleanFilters(filters as Record<string, string | undefined>),
    });
  }

  private async resolveUserProfileId(user: AuthUser): Promise<string | undefined> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<UserPermissionAssignmentResponse>(
          `${PERMISSIONS_URL}/assignments/${user.id}`,
          { params: { organizationId: user.organizationId } },
        ),
      );
      return res.data.profileId;
    } catch {
      return undefined;
    }
  }

  async getReportingStats(
    user: AuthUser,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<ReportingStatsResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ReportingStatsResponse>(`${EXPORTS_URL}/exports/reporting/stats`, {
          params: {
            organizationId: user.organizationId,
            ...this.cleanFilters(filters),
          },
        }),
      );
      return response.data;
    } catch (err) {
      this.rethrowAsHttpException(err);
    }
  }

  private async proxyExport(
    url: string,
    params: Record<string, string | undefined>,
  ): Promise<ExportResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          params: this.cleanFilters(params),
          responseType: "arraybuffer",
          timeout: 60000,
        }),
      );

      const contentType =
        (response.headers["content-type"] as string) ?? "application/octet-stream";
      const disposition = (response.headers["content-disposition"] as string) ?? "";
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch?.[1] ?? "export";

      return {
        buffer: Buffer.from(response.data),
        contentType,
        filename,
      };
    } catch (err) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        throw new ServiceUnavailableException(
          "Service d’exports indisponible. Réessayez dans un instant.",
        );
      }
      const status = err.response.status;
      const data = this.parseAxiosErrorData(err.response.data);
      const raw = data?.message;
      const message = Array.isArray(raw)
        ? raw.join(", ")
        : (raw ?? "Erreur lors de la génération de l'export");
      if (status === 400) throw new BadRequestException(message);
      throw new ServiceUnavailableException(message);
    }
    throw err;
  }

  private parseAxiosErrorData(data: unknown): { message?: string | string[] } | undefined {
    if (!data) return undefined;
    if (typeof data === "object" && !(data instanceof ArrayBuffer) && !Buffer.isBuffer(data)) {
      return data as { message?: string | string[] };
    }
    try {
      const text =
        typeof data === "string"
          ? data
          : Buffer.isBuffer(data)
            ? data.toString("utf8")
            : Buffer.from(data as ArrayBuffer).toString("utf8");
      return JSON.parse(text) as { message?: string | string[] };
    } catch {
      return undefined;
    }
  }

  private cleanFilters(filters?: Record<string, string | undefined>): Record<string, string> {
    if (!filters) return {};
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") clean[key] = value;
    }
    return clean;
  }
}
