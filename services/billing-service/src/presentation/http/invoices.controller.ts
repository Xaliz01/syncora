import { Body, Controller, Get, Header, Param, Post, Query, StreamableFile } from "@nestjs/common";
import { parsePaginationQueryParams } from "@planwise/shared";
import { parseOrganizationIdBody, parseOrganizationIdQuery } from "@planwise/shared/nest";
import type {
  CreateLocalInvoiceBody,
  CreditLocalInvoiceBody,
  LocalInvoiceResponse,
  SendLocalInvoiceEmailBody,
} from "@planwise/shared";
import { AbstractInvoicesService } from "../../domain/ports/invoices.service.port";

@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: AbstractInvoicesService) {}

  @Post()
  create(@Body() body: CreateLocalInvoiceBody) {
    return this.invoicesService.createInvoice(body);
  }

  @Get()
  list(
    @Query("organizationId") organizationId: string,
    @Query("caseId") caseId?: string,
    @Query("status") status?: string,
    @Query("kind") kind?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("customerId") customerId?: string,
    @Query("orderGiverId") orderGiverId?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.invoicesService.listInvoices(organizationId, {
      caseId,
      status,
      kind,
      startDate,
      endDate,
      customerId,
      orderGiverId,
      search,
      ...parsePaginationQueryParams(limit, offset),
    });
  }

  @Get("stats")
  stats(
    @Query("organizationId") organizationId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.invoicesService.getStats(organizationId, { startDate, endDate });
  }

  @Post("render-pdf")
  @Header("Content-Type", "application/pdf")
  async renderPdf(
    @Body()
    body: {
      organizationId?: string;
      invoice: LocalInvoiceResponse;
      logoBase64?: string;
    },
  ) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const buffer = await this.invoicesService.renderInvoicePdf(organizationId, body);
    return new StreamableFile(buffer);
  }

  @Get(":id/pdf")
  @Header("Content-Type", "application/pdf")
  async pdf(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const buffer = await this.invoicesService.getInvoicePdf(id, organizationId);
    return new StreamableFile(buffer);
  }

  @Get(":id")
  get(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.invoicesService.getInvoice(id, organizationId);
  }

  @Post(":id/finalize")
  finalize(@Param("id") id: string, @Body() body: { organizationId?: string }) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.invoicesService.finalizeInvoice(id, organizationId);
  }

  @Post(":id/paid")
  markPaid(@Param("id") id: string, @Body() body: { organizationId?: string }) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.invoicesService.markPaid(id, organizationId);
  }

  @Post(":id/cancel")
  cancel(@Param("id") id: string, @Body() body: { organizationId?: string }) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.invoicesService.cancelInvoice(id, organizationId);
  }

  @Post(":id/credit")
  credit(@Param("id") id: string, @Body() body: CreditLocalInvoiceBody) {
    return this.invoicesService.creditInvoice(id, body);
  }

  @Post(":id/send")
  send(@Param("id") id: string, @Body() body: SendLocalInvoiceEmailBody) {
    return this.invoicesService.sendInvoice(id, body);
  }
}
