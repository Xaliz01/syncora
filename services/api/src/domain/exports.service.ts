import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  ExportFormat,
  ExportInvoicesListParams,
  ReportPreviewQuery,
  ReportPreviewResponse,
  ReportingStatsResponse,
} from "@planwise/shared";
import { isReportPreviewType } from "@planwise/shared";
import { AbstractExportsGatewayService, type ExportResult } from "./ports/exports.service.port";
import { ExportsService } from "./exports/exports.service";
import { AbstractPermissionsService } from "./permissions/ports/permissions.service.port";

@Injectable()
export class ExportsGatewayService extends AbstractExportsGatewayService {
  constructor(
    private readonly exportsService: ExportsService,
    private readonly permissions: AbstractPermissionsService,
  ) {
    super();
  }

  exportCaseSummaryPdf(user: AuthUser, caseId: string): Promise<ExportResult> {
    return this.exportsService.exportCaseSummaryPdf(user.organizationId, caseId);
  }

  exportCasesList(
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
      customerId?: string;
      orderGiverId?: string;
    },
  ): Promise<ExportResult> {
    return this.exportsService.exportCasesList(user.organizationId, format, filters);
  }

  exportUsersList(user: AuthUser, format: ExportFormat): Promise<ExportResult> {
    return this.exportsService.exportUsersList(user.organizationId, format);
  }

  exportCustomersList(
    user: AuthUser,
    format: ExportFormat,
    filters?: { search?: string; kind?: string },
  ): Promise<ExportResult> {
    return this.exportsService.exportCustomersList(user.organizationId, format, filters);
  }

  exportInterventionsList(
    user: AuthUser,
    format: ExportFormat,
    filters?: {
      startDate?: string;
      endDate?: string;
      assigneeId?: string;
      teamId?: string;
      status?: string;
      typeId?: string;
    },
  ): Promise<ExportResult> {
    return this.exportsService.exportInterventionsList(user.organizationId, format, filters);
  }

  exportTechniciansActivity(
    user: AuthUser,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; technicianId?: string },
  ): Promise<ExportResult> {
    return this.exportsService.exportTechniciansActivity(user.organizationId, format, filters);
  }

  exportMileageReport(
    user: AuthUser,
    format: ExportFormat,
    filters?: {
      startDate?: string;
      endDate?: string;
      teamId?: string;
      technicianId?: string;
      groupBy?: "team" | "technician";
    },
  ): Promise<ExportResult> {
    return this.exportsService.exportMileageReport(user.organizationId, format, filters);
  }

  async exportDashboardTodoCases(
    user: AuthUser,
    format: ExportFormat,
    params: { templateId: string; todoLabel: string },
  ): Promise<ExportResult> {
    const userProfileId = await this.resolveUserProfileId(user);
    return this.exportsService.exportDashboardTodoCases(user.organizationId, format, {
      userId: user.id,
      userProfileId,
      templateId: params.templateId,
      todoLabel: params.todoLabel,
    });
  }

  exportInvoicesList(
    user: AuthUser,
    format: ExportFormat,
    filters?: ExportInvoicesListParams,
  ): Promise<ExportResult> {
    return this.exportsService.exportInvoicesList(user.organizationId, format, filters);
  }

  async previewReport(
    user: AuthUser,
    reportType: string,
    filters?: ReportPreviewQuery,
  ): Promise<ReportPreviewResponse> {
    if (!isReportPreviewType(reportType)) {
      throw new BadRequestException(`Type de rapport inconnu : ${reportType}`);
    }
    return this.exportsService.previewReport(user.organizationId, reportType, filters);
  }

  getReportingStats(
    user: AuthUser,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<ReportingStatsResponse> {
    return this.exportsService.getReportingStats(user.organizationId, filters);
  }

  private async resolveUserProfileId(user: AuthUser): Promise<string | undefined> {
    try {
      const assignment = await this.permissions.getUserAssignment(user.organizationId, user.id);
      return assignment.profileId;
    } catch {
      return undefined;
    }
  }
}
