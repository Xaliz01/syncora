import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  ExportFormat,
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
    filters?: { status?: string; priority?: string; assigneeId?: string; search?: string },
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

  async getReportingStats(user: AuthUser): Promise<ReportingStatsResponse> {
    const response = await firstValueFrom(
      this.httpService.get<ReportingStatsResponse>(`${EXPORTS_URL}/exports/reporting/stats`, {
        params: { organizationId: user.organizationId },
      }),
    );
    return response.data;
  }

  private async proxyExport(
    url: string,
    params: Record<string, string | undefined>,
  ): Promise<ExportResult> {
    const response = await firstValueFrom(
      this.httpService.get(url, {
        params: this.cleanFilters(params),
        responseType: "arraybuffer",
        timeout: 60000,
      }),
    );

    const contentType = (response.headers["content-type"] as string) ?? "application/octet-stream";
    const disposition = (response.headers["content-disposition"] as string) ?? "";
    const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
    const filename = filenameMatch?.[1] ?? "export";

    return {
      buffer: Buffer.from(response.data),
      contentType,
      filename,
    };
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
