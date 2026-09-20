import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { RequirePermissionGuard } from "../../infrastructure/require-permission.guard";
import { RequirePermissions } from "../../infrastructure/require-permission.guard";
import { AbstractAiFieldReportService } from "../../domain/ports/ai-field-report.service.port";

@Controller("ai/field-report")
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class AiFieldReportController {
  constructor(private readonly fieldReportService: AbstractAiFieldReportService) {}

  @Post("generate")
  @RequirePermissions("interventions.read", "ai.field_report")
  async generate(@CurrentUser() user: AuthUser, @Body() body: { interventionId?: string }) {
    if (!body.interventionId?.trim()) {
      throw new BadRequestException("interventionId is required");
    }
    return this.fieldReportService.generate(user, body.interventionId.trim());
  }

  @Post("confirm")
  @RequirePermissions("interventions.update", "ai.field_report")
  async confirm(
    @CurrentUser() user: AuthUser,
    @Body() body: { interventionId?: string; report?: string },
  ) {
    if (!body.interventionId?.trim()) {
      throw new BadRequestException("interventionId is required");
    }
    if (!body.report?.trim()) {
      throw new BadRequestException("report is required");
    }
    return this.fieldReportService.confirm(user, body.interventionId.trim(), body.report.trim());
  }

  @Get("quota")
  @RequirePermissions("ai.field_report")
  async getQuota(@CurrentUser() user: AuthUser) {
    return this.fieldReportService.getQuotaStatus(user);
  }
}
