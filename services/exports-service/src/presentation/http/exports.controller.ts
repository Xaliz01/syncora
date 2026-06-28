import { BadRequestException, Controller, Get, Param, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import type { ExportFormat } from "@syncora/shared";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
import { AbstractExportsService } from "../../domain/ports/exports.service.port";
import type { ExportResult } from "../../domain/ports/exports.service.port";

@Controller()
export class ExportsController {
  constructor(private readonly exportsService: AbstractExportsService) {}

  @Get("exports/cases/:caseId/pdf")
  async exportCaseSummary(
    @Query("organizationId") organizationId: string,
    @Param("caseId") caseId: string,
    @Res() res: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const result = await this.exportsService.exportCaseSummaryPdf(orgId, caseId);
    this.sendExport(res, result);
  }

  @Get("exports/cases")
  async exportCasesList(
    @Query("organizationId") organizationId: string,
    @Query("format") format: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("search") search?: string,
    @Res() res?: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportCasesList(orgId, exportFormat, {
      status,
      priority,
      assigneeId,
      search,
    });
    this.sendExport(res!, result);
  }

  @Get("exports/users")
  async exportUsersList(
    @Query("organizationId") organizationId: string,
    @Query("format") format: string,
    @Res() res?: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportUsersList(orgId, exportFormat);
    this.sendExport(res!, result);
  }

  @Get("exports/customers")
  async exportCustomersList(
    @Query("organizationId") organizationId: string,
    @Query("format") format: string,
    @Query("search") search?: string,
    @Query("kind") kind?: string,
    @Res() res?: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportCustomersList(orgId, exportFormat, {
      search,
      kind,
    });
    this.sendExport(res!, result);
  }

  @Get("exports/interventions")
  async exportInterventionsList(
    @Query("organizationId") organizationId: string,
    @Query("format") format: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("teamId") teamId?: string,
    @Query("status") status?: string,
    @Res() res?: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportInterventionsList(orgId, exportFormat, {
      startDate,
      endDate,
      assigneeId,
      teamId,
      status,
    });
    this.sendExport(res!, result);
  }

  @Get("exports/technicians-activity")
  async exportTechniciansActivity(
    @Query("organizationId") organizationId: string,
    @Query("format") format: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("technicianId") technicianId?: string,
    @Res() res?: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportTechniciansActivity(orgId, exportFormat, {
      startDate,
      endDate,
      technicianId,
    });
    this.sendExport(res!, result);
  }

  @Get("exports/mileage-report")
  async exportMileageReport(
    @Query("organizationId") organizationId: string,
    @Query("format") format: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("teamId") teamId?: string,
    @Res() res?: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportMileageReport(orgId, exportFormat, {
      startDate,
      endDate,
      teamId,
    });
    this.sendExport(res!, result);
  }

  @Get("exports/dashboard-todo-cases")
  async exportDashboardTodoCases(
    @Query("organizationId") organizationId: string,
    @Query("format") format: string,
    @Query("userId") userId?: string,
    @Query("userProfileId") userProfileId?: string,
    @Query("templateId") templateId?: string,
    @Query("todoLabel") todoLabel?: string,
    @Res() res?: Response,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    if (!userId) {
      throw new BadRequestException("userId est requis");
    }
    if (!templateId || !todoLabel) {
      throw new BadRequestException("templateId et todoLabel sont requis");
    }
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportDashboardTodoCases(orgId, exportFormat, {
      userId,
      userProfileId,
      templateId,
      todoLabel,
    });
    this.sendExport(res!, result);
  }

  @Get("exports/reporting/stats")
  async getReportingStats(@Query("organizationId") organizationId: string) {
    const orgId = parseOrganizationIdQuery(organizationId);
    return this.exportsService.getReportingStats(orgId);
  }

  private parseFormat(format: string): ExportFormat {
    if (format === "pdf" || format === "xlsx") return format;
    throw new BadRequestException(`Format invalide : ${format}. Utilisez "pdf" ou "xlsx".`);
  }

  private sendExport(res: Response, result: ExportResult): void {
    res.set({
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": result.buffer.length.toString(),
    });
    res.send(result.buffer);
  }
}
