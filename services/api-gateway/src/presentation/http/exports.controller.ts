import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import type { AuthUser, ExportFormat } from "@syncora/shared";
import { AbstractExportsGatewayService } from "../../domain/ports/exports.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequirePermissionGuard,
  RequireAnyPermissions,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";

@Controller("exports")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class ExportsController {
  constructor(private readonly exportsService: AbstractExportsGatewayService) {}

  @Get("cases/:caseId/pdf")
  @RequirePermissions("exports.cases")
  async exportCaseSummary(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Res() res: Response,
  ) {
    const result = await this.exportsService.exportCaseSummaryPdf(user, caseId);
    this.sendExport(res, result);
  }

  @Get("cases")
  @RequirePermissions("exports.cases")
  async exportCasesList(
    @CurrentUser() user: AuthUser,
    @Query("format") format: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("search") search?: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportCasesList(user, exportFormat, {
      status,
      priority,
      assigneeId,
      search,
    });
    this.sendExport(res!, result);
  }

  @Get("users")
  @RequirePermissions("exports.users")
  async exportUsersList(
    @CurrentUser() user: AuthUser,
    @Query("format") format: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportUsersList(user, exportFormat);
    this.sendExport(res!, result);
  }

  @Get("customers")
  @RequirePermissions("exports.customers")
  async exportCustomersList(
    @CurrentUser() user: AuthUser,
    @Query("format") format: string,
    @Query("search") search?: string,
    @Query("kind") kind?: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportCustomersList(user, exportFormat, {
      search,
      kind,
    });
    this.sendExport(res!, result);
  }

  @Get("interventions")
  @RequirePermissions("exports.interventions")
  async exportInterventionsList(
    @CurrentUser() user: AuthUser,
    @Query("format") format: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("teamId") teamId?: string,
    @Query("status") status?: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportInterventionsList(user, exportFormat, {
      startDate,
      endDate,
      assigneeId,
      teamId,
      status,
    });
    this.sendExport(res!, result);
  }

  @Get("technicians-activity")
  @RequirePermissions("exports.reporting")
  async exportTechniciansActivity(
    @CurrentUser() user: AuthUser,
    @Query("format") format: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("technicianId") technicianId?: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportTechniciansActivity(user, exportFormat, {
      startDate,
      endDate,
      technicianId,
    });
    this.sendExport(res!, result);
  }

  @Get("mileage-report")
  @RequirePermissions("exports.reporting")
  async exportMileageReport(
    @CurrentUser() user: AuthUser,
    @Query("format") format: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("teamId") teamId?: string,
    @Res() res?: Response,
  ) {
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportMileageReport(user, exportFormat, {
      startDate,
      endDate,
      teamId,
    });
    this.sendExport(res!, result);
  }

  @Get("dashboard-todo-cases")
  @RequirePermissions("exports.cases")
  async exportDashboardTodoCases(
    @CurrentUser() user: AuthUser,
    @Query("format") format: string,
    @Query("templateId") templateId?: string,
    @Query("todoLabel") todoLabel?: string,
    @Res() res?: Response,
  ) {
    if (!templateId || !todoLabel) {
      throw new BadRequestException("templateId et todoLabel sont requis");
    }
    const exportFormat = this.parseFormat(format);
    const result = await this.exportsService.exportDashboardTodoCases(user, exportFormat, {
      templateId,
      todoLabel,
    });
    this.sendExport(res!, result);
  }

  @Get("reporting/stats")
  @RequireAnyPermissions("exports.reporting", "exports.cases")
  async getReportingStats(@CurrentUser() user: AuthUser) {
    return this.exportsService.getReportingStats(user);
  }

  private parseFormat(format: string): ExportFormat {
    if (format === "pdf" || format === "xlsx") return format;
    throw new BadRequestException(`Format invalide : ${format}. Utilisez "pdf" ou "xlsx".`);
  }

  private sendExport(
    res: Response,
    result: { buffer: Buffer; contentType: string; filename: string },
  ): void {
    res.set({
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": result.buffer.length.toString(),
    });
    res.send(result.buffer);
  }
}
