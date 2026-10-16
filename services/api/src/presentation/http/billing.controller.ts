import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import type {
  AuthUser,
  CreditLocalInvoiceBody,
  SendLocalInvoiceEmailBody,
  SyncCaseInvoiceOptions,
} from "@planwise/shared";
import { parsePaginationQueryParams } from "@planwise/shared";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { AbstractBillingGatewayService } from "../../domain/ports/billing.service.port";

@Controller("billing")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class BillingController {
  constructor(private readonly billingService: AbstractBillingGatewayService) {}

  @Get("invoices/stats")
  @RequirePermissions("billing.invoices.read")
  getStats(
    @CurrentUser() user: AuthUser,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.billingService.getStats(user, { startDate, endDate });
  }

  @Get("invoices")
  @RequirePermissions("billing.invoices.read")
  listInvoices(
    @CurrentUser() user: AuthUser,
    @Query("caseId") caseId?: string,
    @Query("status") status?: string,
    @Query("kind") kind?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("customerId") customerId?: string,
    @Query("orderGiverId") orderGiverId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.billingService.listInvoices(user, {
      caseId,
      status,
      kind,
      startDate,
      endDate,
      customerId,
      orderGiverId,
      ...parsePaginationQueryParams(limit, offset),
    });
  }

  @Get("invoices/:id/pdf")
  @RequirePermissions("billing.invoices.read")
  async getInvoicePdf(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.billingService.getInvoicePdf(user, id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="facture-${id}.pdf"`);
    res.send(pdfBuffer);
  }

  @Get("invoices/:id")
  @RequirePermissions("billing.invoices.read")
  getInvoice(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.billingService.getInvoice(user, id);
  }

  @Post("cases/:caseId/invoices/preview-pdf")
  @RequirePermissions("billing.invoices.create")
  async previewInvoice(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body: SyncCaseInvoiceOptions | undefined,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.billingService.previewInvoice(user, caseId, body ?? {});
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="apercu-facture.pdf"');
    res.send(pdfBuffer);
  }

  @Post("cases/:caseId/invoices")
  @RequirePermissions("billing.invoices.create")
  createInvoice(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body?: SyncCaseInvoiceOptions,
  ) {
    return this.billingService.createInvoice(user, caseId, body ?? {});
  }

  @Post("invoices/:id/finalize")
  @RequirePermissions("billing.invoices.finalize")
  finalizeInvoice(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.billingService.finalizeInvoice(user, id);
  }

  @Post("invoices/:id/paid")
  @RequirePermissions("billing.invoices.finalize")
  markPaid(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.billingService.markPaid(user, id);
  }

  @Post("invoices/:id/cancel")
  @RequirePermissions("billing.invoices.finalize")
  cancelInvoice(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.billingService.cancelInvoice(user, id);
  }

  @Post("invoices/:id/credit")
  @RequirePermissions("billing.invoices.finalize")
  creditInvoice(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body?: CreditLocalInvoiceBody,
  ) {
    return this.billingService.creditInvoice(user, id, body);
  }

  @Post("invoices/:id/send")
  @RequirePermissions("billing.invoices.send")
  sendInvoice(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: Pick<SendLocalInvoiceEmailBody, "to" | "cc" | "subject" | "body">,
  ) {
    return this.billingService.sendInvoice(user, id, body);
  }
}
