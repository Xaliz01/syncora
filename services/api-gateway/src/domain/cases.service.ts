import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  CaseAssignee,
  CaseCustomerRef,
  CaseHistoryChange,
  CaseHistoryAction,
  CaseHistoryEntryResponse,
  CompleteInterventionBody,
  CompleteInterventionResponse,
  CreateCaseBody,
  CreateCaseHistoryBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  CaseDashboardResponse,
  CaseResponse,
  CasesListResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  CustomerResponse,
  DashboardStatFilter,
  DashboardTodoCaseItem,
  DocumentResponse,
  InterventionResponse,
  InterventionsListResponse,
  SignInterventionBody,
  SignInterventionResponse,
  StartInterventionBody,
  StartInterventionResponse,
  TeamResponse,
  TechnicianResponse,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody,
  UserPermissionAssignmentResponse,
  UserResponse,
  OrganizationResponse,
  QuoteResponse,
  QuoteSummaryResponse,
} from "@planwise/shared";
import type {
  CommentEntityType,
  CommentResponse,
  CreateCommentBody,
  UpdateCommentBody,
} from "@planwise/shared";
import { shouldSetToInvoiceOnQuoteAccepted } from "@planwise/shared";
import PDFDocument from "pdfkit";
import { assertAnyAssignablePermission } from "../infrastructure/permission-checks";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import {
  AbstractCasesGatewayService,
  type CreateCaseForOrgBody,
  type UpdateCaseForOrgBody,
  type CreateTemplateForOrgBody,
  type UpdateTemplateForOrgBody,
  type CompleteInterventionForOrgBody,
  type CreateInterventionForOrgBody,
  type SignInterventionForOrgBody,
  type StartInterventionForOrgBody,
  type UpdateInterventionForOrgBody,
  type UpdateTodoForOrgBody,
  type CreateQuoteForOrgBody,
  type UpdateQuoteForOrgBody,
  type CreateCommentForOrgBody,
  type UpdateCommentForOrgBody,
} from "./ports/cases.service.port";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";
const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const DOCUMENTS_URL = process.env.DOCUMENTS_SERVICE_URL ?? "http://localhost:3011";
const ORGANIZATIONS_URL = process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";

@Injectable()
export class CasesGatewayService extends AbstractCasesGatewayService {
  constructor(
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly customersGateway: AbstractCustomersGatewayService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  // ── Templates ──

  async createTemplate(user: AuthUser, body: CreateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>(user.organizationId, {
      method: "post",
      path: "/templates",
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies CreateCaseTemplateBody,
    });
  }

  async listTemplates(user: AuthUser) {
    return this.callCasesService<CaseTemplateResponse[]>(user.organizationId, {
      method: "get",
      path: "/templates",
      query: { organizationId: user.organizationId },
    });
  }

  async getTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<CaseTemplateResponse>(user.organizationId, {
      method: "get",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateTemplate(user: AuthUser, templateId: string, body: UpdateTemplateForOrgBody) {
    return this.callCasesService<CaseTemplateResponse>(user.organizationId, {
      method: "patch",
      path: `/templates/${templateId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies UpdateCaseTemplateBody,
    });
  }

  async deleteTemplate(user: AuthUser, templateId: string) {
    return this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/templates/${templateId}`,
      query: { organizationId: user.organizationId },
    });
  }

  // ── Cases ──

  async createCase(user: AuthUser, body: CreateCaseForOrgBody) {
    const { assigneeIds, customerId, ...rest } = body;
    if (customerId?.trim()) {
      await this.customersGateway.getCustomer(user, customerId.trim());
    }
    let assignees: CaseAssignee[] | undefined;
    if (assigneeIds !== undefined) {
      assignees = await this.resolveCaseAssigneesForWrite(user.organizationId, assigneeIds);
    }

    const created = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "post",
      path: "/cases",
      body: {
        organizationId: user.organizationId,
        ...rest,
        ...(customerId?.trim() ? { customerId: customerId.trim() } : {}),
        ...(assignees !== undefined ? { assignees } : {}),
      } as CreateCaseBody,
    });
    this.recordHistory(
      user.organizationId,
      created.id,
      user.id,
      user.name ?? user.email,
      "case_created",
      created.title,
    );
    return this.enrichCaseResponse(user, created);
  }

  async listCases(
    user: AuthUser,
    filters?: {
      status?: string;
      billingStatus?: string;
      assigneeId?: string;
      priority?: string;
      search?: string;
      customerId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<CasesListResponse> {
    const response = await this.callCasesService<CasesListResponse>(user.organizationId, {
      method: "get",
      path: "/cases",
      query: {
        organizationId: user.organizationId,
        ...filters,
      },
    });
    const cases = await this.enrichCaseSummaries(user, response.cases);
    return { cases, total: response.total };
  }

  async getCase(user: AuthUser, caseId: string) {
    const row = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "get",
      path: `/cases/${caseId}`,
      query: { organizationId: user.organizationId },
    });
    return this.enrichCaseResponse(user, row);
  }

  async updateCase(user: AuthUser, caseId: string, body: UpdateCaseForOrgBody) {
    if (body.customerId !== undefined && body.customerId !== null && body.customerId.trim()) {
      await this.customersGateway.getCustomer(user, body.customerId.trim());
    }

    let previousCase: CaseResponse | undefined;
    try {
      previousCase = await this.callCasesService<CaseResponse>(user.organizationId, {
        method: "get",
        path: `/cases/${caseId}`,
        query: { organizationId: user.organizationId },
      });
    } catch {
      /* proceed without previous state */
    }

    const casesBody = {
      organizationId: user.organizationId,
      ...body,
    } as UpdateCaseBody;

    if (body.billingStatus !== undefined) {
      assertAnyAssignablePermission(user, ["cases.manage_billing", "cases.update"]);
    }

    if (Object.prototype.hasOwnProperty.call(body, "assigneeIds")) {
      assertAnyAssignablePermission(user, ["cases.assign", "cases.update"]);
      casesBody.assignees = await this.resolveCaseAssigneesForWrite(
        user.organizationId,
        body.assigneeIds ?? [],
      );
    }

    const updated = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "patch",
      path: `/cases/${caseId}`,
      body: casesBody,
    });

    this.emitCaseUpdateHistory(user, caseId, body, previousCase, updated);

    return this.enrichCaseResponse(user, updated);
  }

  async deleteCase(user: AuthUser, caseId: string) {
    const result = await this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/cases/${caseId}`,
      query: { organizationId: user.organizationId },
    });
    this.recordHistory(
      user.organizationId,
      caseId,
      user.id,
      user.name ?? user.email,
      "case_deleted",
    );
    return result;
  }

  async updateTodo(user: AuthUser, caseId: string, body: UpdateTodoForOrgBody) {
    const row = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "put",
      path: `/cases/${caseId}/todos`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as UpdateTodoBody,
    });
    const todoLabel = row.steps.flatMap((s) => s.todos).find((t) => t.id === body.todoId)?.label;
    this.recordHistory(
      user.organizationId,
      caseId,
      user.id,
      user.name ?? user.email,
      "todo_updated",
      todoLabel,
      [{ field: "status", newValue: body.status }],
    );
    return this.enrichCaseResponse(user, row);
  }

  // ── Interventions ──

  async createIntervention(user: AuthUser, body: CreateInterventionForOrgBody) {
    const result = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "post",
      path: "/interventions",
      body: {
        organizationId: user.organizationId,
        ...body,
      } as CreateInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      body.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_created",
      result.title,
    );
    return result;
  }

  async listInterventions(
    user: AuthUser,
    filters?: {
      caseId?: string;
      assigneeId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      unscheduled?: string;
      includeTeamAssignments?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<InterventionsListResponse> {
    let assignedTeamIds: string[] | undefined;
    if (
      filters?.includeTeamAssignments === "true" &&
      filters.assigneeId &&
      filters.assigneeId === user.id
    ) {
      assignedTeamIds = await this.resolveTeamIdsForAssignee(user, filters.assigneeId);
    }

    return this.callCasesService<InterventionsListResponse>(user.organizationId, {
      method: "get",
      path: "/interventions",
      query: {
        organizationId: user.organizationId,
        caseId: filters?.caseId,
        assigneeId: filters?.assigneeId,
        assignedTeamIds: assignedTeamIds?.length ? assignedTeamIds.join(",") : undefined,
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        status: filters?.status,
        unscheduled: filters?.unscheduled,
        search: filters?.search,
        limit: filters?.limit,
        offset: filters?.offset,
      },
    });
  }

  private async resolveTeamIdsForAssignee(user: AuthUser, assigneeId: string): Promise<string[]> {
    const technicianId =
      user.id === assigneeId
        ? (user.technicianId ??
          (await this.findTechnicianIdByUserId(user.organizationId, assigneeId)))
        : await this.findTechnicianIdByUserId(user.organizationId, assigneeId);
    if (!technicianId) return [];

    try {
      const teams = await this.scopedHttp.request<TeamResponse[]>({
        baseUrl: TECHNICIANS_URL,
        organizationId: user.organizationId,
        method: "get",
        path: "/teams",
        errorLabel: "Technicians service error",
      });
      return teams
        .filter((team) => team.technicianIds.includes(technicianId))
        .map((team) => team.id);
    } catch {
      return [];
    }
  }

  private async findTechnicianIdByUserId(
    organizationId: string,
    userId: string,
  ): Promise<string | undefined> {
    try {
      const technician = await this.scopedHttp.request<TechnicianResponse | null>({
        baseUrl: TECHNICIANS_URL,
        organizationId,
        method: "get",
        path: `/technicians/by-user/${userId}`,
        validateResponseScope: false,
        errorLabel: "Technicians service error",
      });
      return technician?.id;
    } catch {
      return undefined;
    }
  }

  async getIntervention(user: AuthUser, interventionId: string) {
    return this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateIntervention(
    user: AuthUser,
    interventionId: string,
    body: UpdateInterventionForOrgBody,
  ) {
    if (body.billingStatus !== undefined) {
      assertAnyAssignablePermission(user, ["cases.manage_billing", "interventions.update"]);
    }

    const result = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "patch",
      path: `/interventions/${interventionId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as UpdateInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      result.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_updated",
      result.title,
    );
    return result;
  }

  async deleteIntervention(user: AuthUser, interventionId: string) {
    let intervention: InterventionResponse | undefined;
    try {
      intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
        method: "get",
        path: `/interventions/${interventionId}`,
        query: { organizationId: user.organizationId },
      });
    } catch {
      /* proceed without intervention info */
    }
    const result = await this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    if (intervention) {
      this.recordHistory(
        user.organizationId,
        intervention.caseId,
        user.id,
        user.name ?? user.email,
        "intervention_deleted",
        intervention.title,
      );
    }
    return result;
  }

  async startIntervention(
    user: AuthUser,
    interventionId: string,
    body: StartInterventionForOrgBody,
  ) {
    const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    const result = await this.callCasesService<StartInterventionResponse>(user.organizationId, {
      method: "post",
      path: `/interventions/${interventionId}/start`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as StartInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      intervention.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_started",
      intervention.title,
    );
    return {
      ...result,
      title: intervention.title,
      caseId: intervention.caseId,
      caseTitle: intervention.caseTitle,
    };
  }

  async completeIntervention(
    user: AuthUser,
    interventionId: string,
    body: CompleteInterventionForOrgBody,
  ) {
    const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    const result = await this.callCasesService<CompleteInterventionResponse>(user.organizationId, {
      method: "post",
      path: `/interventions/${interventionId}/complete`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as CompleteInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      intervention.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_completed",
      intervention.title,
    );
    return {
      ...result,
      title: intervention.title,
      caseId: intervention.caseId,
      caseTitle: intervention.caseTitle,
    };
  }

  // ── Signature ──

  async signIntervention(user: AuthUser, interventionId: string, body: SignInterventionForOrgBody) {
    const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
      method: "get",
      path: `/interventions/${interventionId}`,
      query: { organizationId: user.organizationId },
    });
    const result = await this.callCasesService<SignInterventionResponse>(user.organizationId, {
      method: "post",
      path: `/interventions/${interventionId}/sign`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as SignInterventionBody,
    });
    this.recordHistory(
      user.organizationId,
      intervention.caseId,
      user.id,
      user.name ?? user.email,
      "intervention_signed",
      `Signé par ${body.signatoryName}`,
    );
    return result;
  }

  // ── Quotes ──

  async createQuote(user: AuthUser, body: CreateQuoteForOrgBody) {
    const result = await this.callCasesService<QuoteResponse>(user.organizationId, {
      method: "post",
      path: "/quotes",
      body: { organizationId: user.organizationId, ...body },
    });
    this.recordHistory(
      user.organizationId,
      body.caseId,
      user.id,
      user.name ?? user.email,
      "quote_created",
      result.quoteNumber,
    );
    return result;
  }

  async listQuotes(user: AuthUser, filters?: { caseId?: string; status?: string }) {
    return this.callCasesService<QuoteSummaryResponse[]>(user.organizationId, {
      method: "get",
      path: "/quotes",
      query: { organizationId: user.organizationId, ...filters },
    });
  }

  async getQuote(user: AuthUser, quoteId: string) {
    return this.callCasesService<QuoteResponse>(user.organizationId, {
      method: "get",
      path: `/quotes/${quoteId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateQuote(user: AuthUser, quoteId: string, body: UpdateQuoteForOrgBody) {
    const result = await this.callCasesService<QuoteResponse>(user.organizationId, {
      method: "patch",
      path: `/quotes/${quoteId}`,
      body: { organizationId: user.organizationId, ...body },
    });
    this.recordHistory(
      user.organizationId,
      result.caseId,
      user.id,
      user.name ?? user.email,
      "quote_updated",
      result.quoteNumber,
    );

    if (body.status === "accepted") {
      try {
        const caseData = await this.callCasesService<CaseResponse>(user.organizationId, {
          method: "get",
          path: `/cases/${result.caseId}`,
          query: { organizationId: user.organizationId },
        });
        if (shouldSetToInvoiceOnQuoteAccepted(caseData.billingStatus)) {
          await this.updateCase(user, result.caseId, { billingStatus: "to_invoice" });
        }
      } catch {
        /* Ne bloque pas l’acceptation du devis si le passage « À facturer » échoue. */
      }
    }

    return result;
  }

  async deleteQuote(user: AuthUser, quoteId: string) {
    let quote: QuoteResponse | undefined;
    try {
      quote = await this.getQuote(user, quoteId);
    } catch {
      /* proceed */
    }
    const result = await this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/quotes/${quoteId}`,
      query: { organizationId: user.organizationId },
    });
    if (quote) {
      this.recordHistory(
        user.organizationId,
        quote.caseId,
        user.id,
        user.name ?? user.email,
        "quote_deleted",
        quote.quoteNumber,
      );
    }
    return result;
  }

  async generateQuotePdf(user: AuthUser, quoteId: string): Promise<Buffer> {
    const quote = await this.getQuote(user, quoteId);
    const caseData = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "get",
      path: `/cases/${quote.caseId}`,
      query: { organizationId: user.organizationId },
    }).then((c) => this.enrichCaseResponse(user, c));

    const org = await this.fetchOrganization(user.organizationId);
    const logo = org?.logoDocumentId
      ? await this.fetchDocumentImageBuffer(user.organizationId, org.logoDocumentId)
      : null;

    return this.buildQuotePdf(quote, caseData, { logo, organizationName: org?.name });
  }

  async previewQuotePdf(user: AuthUser, body: CreateQuoteForOrgBody): Promise<Buffer> {
    if (!body.caseId?.trim()) {
      throw new BadRequestException("caseId est requis.");
    }
    if (!body.lines?.length) {
      throw new BadRequestException("Au moins une ligne est requise pour la prévisualisation.");
    }
    const caseData = await this.callCasesService<CaseResponse>(user.organizationId, {
      method: "get",
      path: `/cases/${body.caseId}`,
      query: { organizationId: user.organizationId },
    }).then((c) => this.enrichCaseResponse(user, c));

    const quote = this.buildPreviewQuote(user.organizationId, body);
    const org = await this.fetchOrganization(user.organizationId);
    const logo = org?.logoDocumentId
      ? await this.fetchDocumentImageBuffer(user.organizationId, org.logoDocumentId)
      : null;

    return this.buildQuotePdf(quote, caseData, { logo, organizationName: org?.name });
  }

  private buildPreviewQuote(organizationId: string, body: CreateQuoteForOrgBody): QuoteResponse {
    const lines = body.lines
      .filter((l) => l.description?.trim())
      .map((l, index) => {
        const quantity = Number(l.quantity) || 0;
        const unitPrice = Number(l.unitPrice) || 0;
        const tvaRate = Number(l.tvaRate) as QuoteResponse["lines"][0]["tvaRate"];
        const totalHt = Math.round(quantity * unitPrice * 100) / 100;
        const totalTtc = Math.round(totalHt * (1 + tvaRate / 100) * 100) / 100;
        return {
          id: `preview-${index}`,
          articleId: l.articleId,
          description: l.description.trim(),
          quantity,
          unitPrice,
          tvaRate,
          unit: l.unit,
          totalHt,
          totalTtc,
        };
      });
    const totalHt = Math.round(lines.reduce((s, l) => s + l.totalHt, 0) * 100) / 100;
    const totalTtc = Math.round(lines.reduce((s, l) => s + l.totalTtc, 0) * 100) / 100;
    const totalTva = Math.round((totalTtc - totalHt) * 100) / 100;
    return {
      id: "preview",
      organizationId,
      caseId: body.caseId,
      quoteNumber: "BROUILLON",
      subject: body.subject?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      status: "draft",
      validUntil: body.validUntil || undefined,
      lines,
      totalHt,
      totalTva,
      totalTtc,
      createdAt: new Date().toISOString(),
    };
  }

  private buildQuotePdf(
    quote: QuoteResponse,
    caseData: CaseResponse,
    options?: { logo?: Buffer | null; organizationName?: string },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const brandColor = "#6d28d9";
      const textColor = "#1e293b";
      const mutedColor = "#64748b";
      const customer = caseData.customer;
      const contentBottom = () => doc.page.height - 80;
      const logo = options?.logo;

      // Header — logo org en haut à gauche, titre Devis à droite / en dessous
      let headerBottom = 72;
      if (logo) {
        try {
          doc.image(logo, 50, 28, { fit: [120, 48] });
          doc.fontSize(20).fillColor(brandColor).text("Devis", 185, 36, { width: 310 });
          if (options?.organizationName) {
            doc
              .fontSize(9)
              .fillColor(mutedColor)
              .text(options.organizationName, 185, 58, { width: 310 });
          }
          headerBottom = 88;
        } catch {
          doc.fontSize(22).fillColor(brandColor).text("Devis", 50, 40);
          headerBottom = 72;
        }
      } else {
        doc.fontSize(22).fillColor(brandColor).text(`Devis ${quote.quoteNumber}`, 50, 40);
        if (options?.organizationName) {
          doc
            .fontSize(9)
            .fillColor(mutedColor)
            .text(options.organizationName, 50, 64, { width: 495 });
          headerBottom = 82;
        }
      }

      doc
        .moveTo(50, headerBottom)
        .lineTo(545, headerBottom)
        .strokeColor("#e2e8f0")
        .lineWidth(1)
        .stroke();
      doc.y = headerBottom + 18;

      if (quote.subject) {
        doc
          .fontSize(11)
          .fillColor(textColor)
          .text(quote.subject, 50, doc.y + 5, { width: 495 });
        doc.y += 5;
      }
      doc.y += 10;

      // Customer info
      if (customer) {
        this.pdfSection(doc, "Client");
        this.pdfField(doc, "Nom", customer.displayName);
        if (customer.email) this.pdfField(doc, "Email", customer.email);
        if (customer.phone) this.pdfField(doc, "Téléphone", customer.phone);
        if (customer.mobile) this.pdfField(doc, "Mobile", customer.mobile);
        if (customer.address) {
          const addr = [
            customer.address.line1,
            customer.address.line2,
            [customer.address.postalCode, customer.address.city].filter(Boolean).join(" "),
            customer.address.country,
          ]
            .filter(Boolean)
            .join(", ");
          this.pdfField(doc, "Adresse", addr);
        }
      }

      // Case reference
      this.pdfSection(doc, "Dossier");
      this.pdfField(doc, "Référence", caseData.title);

      // Quote metadata
      this.pdfSection(doc, "Informations du devis");
      if (quote.createdAt) {
        this.pdfField(doc, "Date", this.formatDateFr(quote.createdAt));
      }
      if (quote.validUntil) {
        this.pdfField(doc, "Valable jusqu'au", this.formatDateFr(quote.validUntil));
      }

      // Lines table
      this.pdfSection(doc, "Détail des prestations");

      const colX = { desc: 50, qty: 310, unit: 355, price: 405, tva: 460, total: 500 };
      const headerY = doc.y;
      doc
        .fontSize(8)
        .fillColor(mutedColor)
        .text("Description", colX.desc, headerY)
        .text("Qté", colX.qty, headerY)
        .text("Unité", colX.unit, headerY)
        .text("P.U. HT", colX.price, headerY)
        .text("TVA", colX.tva, headerY)
        .text("Total HT", colX.total, headerY);
      doc.y = headerY + 14;
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      doc.y += 6;

      for (const line of quote.lines) {
        if (doc.y > contentBottom()) {
          doc.addPage();
          doc.y = 50;
        }
        const lineY = doc.y;
        doc
          .fontSize(9)
          .fillColor(textColor)
          .text(line.description, colX.desc, lineY, { width: 255 });
        const descHeight = doc.heightOfString(line.description, { width: 255 });
        doc
          .text(String(line.quantity), colX.qty, lineY, { width: 40 })
          .text(line.unit ?? "unité", colX.unit, lineY, { width: 45 })
          .text(this.formatNumber(line.unitPrice), colX.price, lineY, { width: 50 })
          .text(`${line.tvaRate}%`, colX.tva, lineY, { width: 35 })
          .text(this.formatNumber(line.totalHt), colX.total, lineY, { width: 45 });
        doc.y = lineY + Math.max(descHeight, 14) + 4;
      }

      // Totals
      if (doc.y + 80 > contentBottom()) {
        doc.addPage();
        doc.y = 50;
      }
      doc.y += 6;
      doc.moveTo(380, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      doc.y += 8;

      doc
        .fontSize(9)
        .fillColor(mutedColor)
        .text("Total HT :", 380, doc.y, { width: 80 })
        .fillColor(textColor)
        .text(this.formatCurrencyPdf(quote.totalHt), 460, doc.y, { width: 85, align: "right" });
      doc.y += 14;
      doc
        .fillColor(mutedColor)
        .text("TVA :", 380, doc.y, { width: 80 })
        .fillColor(textColor)
        .text(this.formatCurrencyPdf(quote.totalTva), 460, doc.y, { width: 85, align: "right" });
      doc.y += 14;
      doc
        .fontSize(10)
        .fillColor(brandColor)
        .text("Total TTC :", 380, doc.y, { width: 80 })
        .text(this.formatCurrencyPdf(quote.totalTtc), 460, doc.y, { width: 85, align: "right" });
      doc.y += 20;

      // Notes
      if (quote.notes) {
        if (doc.y + 60 > contentBottom()) {
          doc.addPage();
          doc.y = 50;
        }
        this.pdfSection(doc, "Conditions");
        doc.fontSize(9).fillColor(textColor).text(quote.notes, 50, doc.y, { width: 495 });
        doc.y += 10;
      }

      this.stampGeneratedByFooter(doc);
      doc.end();
    });
  }

  private formatDateFr(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  private formatNumber(value: number): string {
    return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private formatCurrencyPdf(value: number): string {
    return value.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
  }

  // ── Report PDF ──

  async generateInterventionReport(user: AuthUser, interventionId: string): Promise<Buffer> {
    const [intervention, caseData, signatureResult] = await Promise.all([
      this.callCasesService<InterventionResponse>(user.organizationId, {
        method: "get",
        path: `/interventions/${interventionId}`,
        query: { organizationId: user.organizationId },
      }),
      this.fetchCaseForReport(user, interventionId),
      this.fetchSignatureData(user.organizationId, interventionId),
    ]);

    const customer = caseData?.customer;
    const photos = await this.fetchInterventionPhotos(user, interventionId);

    return this.buildReportPdf(intervention, caseData, customer, photos, signatureResult);
  }

  private async fetchCaseForReport(
    user: AuthUser,
    interventionId: string,
  ): Promise<CaseResponse | undefined> {
    try {
      const intervention = await this.callCasesService<InterventionResponse>(user.organizationId, {
        method: "get",
        path: `/interventions/${interventionId}`,
        query: { organizationId: user.organizationId },
      });
      return await this.callCasesService<CaseResponse>(user.organizationId, {
        method: "get",
        path: `/cases/${intervention.caseId}`,
        query: { organizationId: user.organizationId },
      }).then((c) => this.enrichCaseResponse(user, c));
    } catch {
      return undefined;
    }
  }

  private async fetchSignatureData(
    organizationId: string,
    interventionId: string,
  ): Promise<{ signatureData?: string; signatoryName?: string }> {
    try {
      return await this.callCasesService<{ signatureData?: string; signatoryName?: string }>(
        organizationId,
        {
          method: "get",
          path: `/interventions/${interventionId}/signature-image`,
          query: { organizationId },
        },
      );
    } catch {
      return {};
    }
  }

  private async fetchOrganization(organizationId: string): Promise<OrganizationResponse | null> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<OrganizationResponse>(
          `${ORGANIZATIONS_URL}/organizations/${organizationId}`,
        ),
      );
      return res.data;
    } catch {
      return null;
    }
  }

  private async fetchDocumentImageBuffer(
    organizationId: string,
    documentId: string,
  ): Promise<Buffer | null> {
    try {
      const urlRes = await firstValueFrom(
        this.httpService.get<{ url: string }>(
          `${DOCUMENTS_URL}/documents/${documentId}/download-url`,
          { params: { organizationId } },
        ),
      );
      let downloadUrl = urlRes.data.url;
      if (downloadUrl.startsWith("/documents/download/")) {
        downloadUrl = `${DOCUMENTS_URL}${downloadUrl}`;
      }
      const fileRes = await firstValueFrom(
        this.httpService.get(downloadUrl, { responseType: "arraybuffer", timeout: 15000 }),
      );
      return Buffer.from(fileRes.data);
    } catch {
      return null;
    }
  }

  private async fetchInterventionPhotos(
    user: AuthUser,
    interventionId: string,
  ): Promise<{ data: Buffer; mimeType: string }[]> {
    try {
      const docs = await firstValueFrom(
        this.httpService.get<DocumentResponse[]>(`${DOCUMENTS_URL}/documents`, {
          params: {
            organizationId: user.organizationId,
            entityType: "intervention",
            entityId: interventionId,
          },
        }),
      ).then((r) => r.data);

      const images = docs.filter((d) => d.mimeType.startsWith("image/"));
      const results: { data: Buffer; mimeType: string }[] = [];

      for (const img of images.slice(0, 6)) {
        try {
          const urlRes = await firstValueFrom(
            this.httpService.get<{ url: string }>(
              `${DOCUMENTS_URL}/documents/${img.id}/download-url`,
              { params: { organizationId: user.organizationId } },
            ),
          );
          let downloadUrl = urlRes.data.url;
          if (downloadUrl.startsWith("/documents/download/")) {
            downloadUrl = `${DOCUMENTS_URL}${downloadUrl}`;
          }
          const fileRes = await firstValueFrom(
            this.httpService.get(downloadUrl, { responseType: "arraybuffer" }),
          );
          results.push({ data: Buffer.from(fileRes.data), mimeType: img.mimeType });
        } catch {
          /* skip photos that fail to download */
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  private buildReportPdf(
    intervention: InterventionResponse,
    caseData: CaseResponse | undefined,
    customer: CaseCustomerRef | undefined,
    photos: { data: Buffer; mimeType: string }[],
    signatureResult: { signatureData?: string; signatoryName?: string },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const brandColor = "#6d28d9";
      const textColor = "#1e293b";
      const mutedColor = "#64748b";
      const contentBottom = () => doc.page.height - 70;

      // Header
      doc
        .fontSize(22)
        .fillColor(brandColor)
        .text("Planwise", 50, 40)
        .fontSize(10)
        .fillColor(mutedColor)
        .text("Rapport d'intervention", 50, 65);

      doc.moveTo(50, 85).lineTo(545, 85).strokeColor("#e2e8f0").lineWidth(1).stroke();

      doc.y = 100;

      // Intervention title & status
      doc.fontSize(16).fillColor(textColor).text(intervention.title, 50, doc.y, { width: 495 });

      const statusLabels: Record<string, string> = {
        planned: "Planifiée",
        in_progress: "En cours",
        completed: "Terminée",
        cancelled: "Annulée",
      };
      doc
        .fontSize(10)
        .fillColor(mutedColor)
        .text(
          `Statut : ${statusLabels[intervention.status] ?? intervention.status}`,
          50,
          doc.y + 5,
        );

      doc.y += 15;

      // Case & customer info
      if (caseData) {
        this.pdfSection(doc, "Dossier");
        this.pdfField(doc, "Titre", caseData.title);
        if (caseData.description) this.pdfField(doc, "Description", caseData.description);
      }

      if (customer) {
        this.pdfSection(doc, "Client");
        this.pdfField(doc, "Nom", customer.displayName);
        if (customer.email) this.pdfField(doc, "Email", customer.email);
        if (customer.phone) this.pdfField(doc, "Téléphone", customer.phone);
        if (customer.mobile) this.pdfField(doc, "Mobile", customer.mobile);
        if (customer.address) {
          const addr = [
            customer.address.line1,
            customer.address.line2,
            [customer.address.postalCode, customer.address.city].filter(Boolean).join(" "),
            customer.address.country,
          ]
            .filter(Boolean)
            .join(", ");
          this.pdfField(doc, "Adresse", addr);
        }
      }

      // Intervention details
      this.pdfSection(doc, "Détails de l'intervention");
      if (intervention.description) {
        this.pdfField(doc, "Description", intervention.description);
      }
      if (intervention.assigneeName) {
        this.pdfField(doc, "Technicien", intervention.assigneeName);
      }
      if (intervention.assignedTeamName) {
        this.pdfField(doc, "Équipe", intervention.assignedTeamName);
      }
      if (intervention.scheduledStart) {
        this.pdfField(
          doc,
          "Planifié",
          this.formatDateTimeFr(intervention.scheduledStart) +
            (intervention.scheduledEnd
              ? ` → ${this.formatDateTimeFr(intervention.scheduledEnd)}`
              : ""),
        );
      }
      if (intervention.startedAt) {
        this.pdfField(doc, "Démarré", this.formatDateTimeFr(intervention.startedAt));
      }
      if (intervention.completedAt) {
        this.pdfField(doc, "Terminé", this.formatDateTimeFr(intervention.completedAt));
      }
      if (intervention.startedAt && intervention.completedAt) {
        const ms =
          new Date(intervention.completedAt).getTime() - new Date(intervention.startedAt).getTime();
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        this.pdfField(
          doc,
          "Durée",
          hours > 0 ? `${hours}h${String(minutes).padStart(2, "0")}` : `${minutes}min`,
        );
      }
      if (intervention.notes) {
        this.pdfField(doc, "Notes", intervention.notes);
      }

      // Photos
      if (photos.length > 0) {
        this.pdfSection(doc, "Photos terrain");
        const photoWidth = 150;
        const photoHeight = 112;
        const gap = 15;
        let x = 50;

        for (const photo of photos) {
          if (doc.y + photoHeight > contentBottom()) {
            doc.addPage();
            x = 50;
            doc.y = 50;
          }
          try {
            doc.image(photo.data, x, doc.y, {
              fit: [photoWidth, photoHeight],
            });
          } catch {
            /* skip invalid images */
          }
          x += photoWidth + gap;
          if (x + photoWidth > 545) {
            x = 50;
            doc.y += photoHeight + gap;
          }
        }
        if (x > 50) {
          doc.y += photoHeight + gap;
        }
      }

      // Signature
      if (signatureResult.signatureData) {
        if (doc.y + 120 > contentBottom()) doc.addPage();
        this.pdfSection(doc, "Signature client");
        if (signatureResult.signatoryName) {
          this.pdfField(doc, "Nom", signatureResult.signatoryName);
        }
        if (intervention.signedAt) {
          this.pdfField(doc, "Date", this.formatDateTimeFr(intervention.signedAt));
        }
        try {
          const sigBuffer = this.dataUrlToBuffer(signatureResult.signatureData);
          if (sigBuffer) {
            doc.image(sigBuffer, 50, doc.y + 5, { fit: [200, 80] });
            doc.y += 90;
          }
        } catch {
          /* skip invalid signature */
        }
      }

      this.stampGeneratedByFooter(doc);
      doc.end();
    });
  }

  /** Pied de page sur chaque page, sans créer de page blanche. */
  private stampGeneratedByFooter(doc: PDFKit.PDFDocument): void {
    const label = `Généré le ${this.formatDateTimeFr(new Date().toISOString())} — Planwise`;
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // PDFKit déclenche un addPage si on écrit sous margin.bottom — on le désactive le temps du tampon.
      const margins = doc.page.margins;
      const prevBottom = margins.bottom;
      margins.bottom = 0;
      try {
        const lineY = doc.page.height - 44;
        const textY = doc.page.height - 36;
        doc
          .moveTo(50, lineY)
          .lineTo(doc.page.width - 50, lineY)
          .strokeColor("#e2e8f0")
          .lineWidth(0.5)
          .stroke();
        doc
          .fontSize(7)
          .fillColor("#94a3b8")
          .text(label, 50, textY, {
            align: "center",
            width: doc.page.width - 100,
            lineBreak: false,
          });
      } finally {
        margins.bottom = prevBottom;
      }
    }
  }

  private pdfSection(doc: PDFKit.PDFDocument, title: string): void {
    doc.y += 10;
    doc.fontSize(12).fillColor("#6d28d9").text(title, 50, doc.y, { width: 495 });
    doc.y += 3;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
    doc.y += 8;
  }

  private pdfField(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc
      .fontSize(9)
      .fillColor("#64748b")
      .text(`${label} :`, 50, doc.y, { continued: true, width: 100 })
      .fillColor("#1e293b")
      .text(` ${value}`, { width: 395 });
    doc.y += 3;
  }

  private formatDateTimeFr(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  private dataUrlToBuffer(dataUrl: string): Buffer | null {
    const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return null;
    return Buffer.from(match[1], "base64");
  }

  // ── Dashboard ──

  async getDashboard(user: AuthUser) {
    const userProfileId = await this.resolveUserProfileId(user);
    const dash = await this.callCasesService<CaseDashboardResponse>(user.organizationId, {
      method: "get",
      path: "/dashboard",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userProfileId,
      },
    });
    const [assignedCases, overdueCases] = await Promise.all([
      this.enrichCaseSummaries(user, dash.assignedCases),
      this.enrichCaseSummaries(user, dash.overdueCases),
    ]);
    return { ...dash, assignedCases, overdueCases };
  }

  async getDashboardTodoCases(
    user: AuthUser,
    templateId: string,
    todoLabel: string,
  ): Promise<DashboardTodoCaseItem[]> {
    const userProfileId = await this.resolveUserProfileId(user);
    const rows = await this.callCasesService<DashboardTodoCaseItem[]>(user.organizationId, {
      method: "get",
      path: "/dashboard/todo-cases",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userProfileId,
        templateId,
        todoLabel,
      },
    });
    return this.enrichDashboardCaseListItems(user, rows);
  }

  async getDashboardStatCases(
    user: AuthUser,
    filter: DashboardStatFilter,
  ): Promise<DashboardTodoCaseItem[]> {
    const userProfileId = await this.resolveUserProfileId(user);
    const rows = await this.callCasesService<DashboardTodoCaseItem[]>(user.organizationId, {
      method: "get",
      path: "/dashboard/stat-cases",
      query: {
        organizationId: user.organizationId,
        userId: user.id,
        userProfileId,
        filter,
      },
    });
    return this.enrichDashboardCaseListItems(user, rows);
  }

  private async enrichDashboardCaseListItems(
    user: AuthUser,
    rows: DashboardTodoCaseItem[],
  ): Promise<DashboardTodoCaseItem[]> {
    const summaries: CaseSummaryResponse[] = rows.map((r) => ({
      id: r.caseId,
      organizationId: user.organizationId,
      title: r.caseTitle,
      status: r.status,
      billingStatus: "none" as const,
      priority: r.priority,
      assignees: [],
      tags: [],
      progress: 0,
      interventionCount: 0,
      customerId: r.customerId,
      createdAt: r.createdAt,
      dueDate: r.dueDate,
    }));
    const enriched = await this.enrichCaseSummaries(user, summaries);
    return rows.map((r, i) => ({
      ...r,
      customerName: enriched[i]?.customer?.displayName,
    }));
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

  // ── History ──

  async listCaseHistory(user: AuthUser, caseId: string) {
    return this.callCasesService<CaseHistoryEntryResponse[]>(user.organizationId, {
      method: "get",
      path: `/cases/${caseId}/history`,
      query: { organizationId: user.organizationId },
    });
  }

  // ── Comments ──

  async createComment(user: AuthUser, body: CreateCommentForOrgBody): Promise<CommentResponse> {
    const payload: CreateCommentBody = {
      organizationId: user.organizationId,
      entityType: body.entityType,
      entityId: body.entityId,
      body: body.body,
      authorId: user.id,
      authorName: user.name ?? user.email,
    };
    const created = await this.callCasesService<CommentResponse>(user.organizationId, {
      method: "post",
      path: "/comments",
      body: payload,
    });
    const detail =
      created.entityType === "intervention"
        ? `Commentaire sur intervention`
        : `Commentaire sur le dossier`;
    this.recordHistory(
      user.organizationId,
      created.caseId,
      user.id,
      user.name ?? user.email,
      "comment_added",
      detail,
    );
    return created;
  }

  async listComments(
    user: AuthUser,
    entityType: CommentEntityType,
    entityId: string,
  ): Promise<CommentResponse[]> {
    return this.callCasesService<CommentResponse[]>(user.organizationId, {
      method: "get",
      path: "/comments",
      query: {
        organizationId: user.organizationId,
        entityType,
        entityId,
      },
    });
  }

  async updateComment(
    user: AuthUser,
    commentId: string,
    body: UpdateCommentForOrgBody,
  ): Promise<CommentResponse> {
    const existing = await this.callCasesService<CommentResponse>(user.organizationId, {
      method: "get",
      path: `/comments/${commentId}`,
      query: { organizationId: user.organizationId },
    });
    this.assertCanModifyComment(user, existing);
    const payload: UpdateCommentBody = {
      organizationId: user.organizationId,
      body: body.body,
    };
    const updated = await this.callCasesService<CommentResponse>(user.organizationId, {
      method: "patch",
      path: `/comments/${commentId}`,
      body: payload,
    });
    this.recordHistory(
      user.organizationId,
      updated.caseId,
      user.id,
      user.name ?? user.email,
      "comment_updated",
    );
    return updated;
  }

  async deleteComment(user: AuthUser, commentId: string): Promise<{ deleted: true }> {
    const existing = await this.callCasesService<CommentResponse>(user.organizationId, {
      method: "get",
      path: `/comments/${commentId}`,
      query: { organizationId: user.organizationId },
    });
    this.assertCanModifyComment(user, existing);
    const result = await this.callCasesService<{ deleted: true }>(user.organizationId, {
      method: "delete",
      path: `/comments/${commentId}`,
      query: { organizationId: user.organizationId },
    });
    this.recordHistory(
      user.organizationId,
      existing.caseId,
      user.id,
      user.name ?? user.email,
      "comment_deleted",
    );
    return result;
  }

  private assertCanModifyComment(user: AuthUser, comment: CommentResponse): void {
    if (user.role === "admin") return;
    if (comment.authorId === user.id) return;
    throw new ForbiddenException("You can only modify your own comments");
  }

  private emitCaseUpdateHistory(
    user: AuthUser,
    caseId: string,
    body: UpdateCaseForOrgBody,
    prev: CaseResponse | undefined,
    updated: CaseResponse,
  ): void {
    const actorName = user.name ?? user.email;

    if (body.status !== undefined && prev && body.status !== prev.status) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "status_changed",
        undefined,
        [{ field: "status", oldValue: prev.status, newValue: body.status }],
      );
      return;
    }

    if (body.billingStatus !== undefined && prev && body.billingStatus !== prev.billingStatus) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "billing_status_changed",
        undefined,
        [{ field: "billingStatus", oldValue: prev.billingStatus, newValue: body.billingStatus }],
      );
      return;
    }

    if (body.priority !== undefined && prev && body.priority !== prev.priority) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "priority_changed",
        undefined,
        [{ field: "priority", oldValue: prev.priority, newValue: body.priority }],
      );
      return;
    }

    if (Object.prototype.hasOwnProperty.call(body, "assigneeIds")) {
      const oldNames = (prev?.assignees ?? []).map((a) => a.name).join(", ") || "aucun";
      const newNames = (updated.assignees ?? []).map((a) => a.name).join(", ") || "aucun";
      if (oldNames !== newNames) {
        this.recordHistory(
          user.organizationId,
          caseId,
          user.id,
          actorName,
          "assignees_changed",
          undefined,
          [{ field: "assignees", oldValue: oldNames, newValue: newNames }],
        );
        return;
      }
    }

    if (body.customerId !== undefined && prev && body.customerId !== prev.customerId) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "customer_changed",
        undefined,
        [
          {
            field: "customer",
            oldValue: prev.customerId ?? "aucun",
            newValue: body.customerId ?? "aucun",
          },
        ],
      );
      return;
    }

    const changes: CaseHistoryChange[] = [];
    if (body.title !== undefined && prev && body.title !== prev.title) {
      changes.push({ field: "title", oldValue: prev.title, newValue: body.title });
    }
    if (body.description !== undefined && prev && body.description !== prev.description) {
      changes.push({
        field: "description",
        oldValue: prev.description ?? "",
        newValue: body.description ?? "",
      });
    }
    if (body.dueDate !== undefined && prev) {
      const oldDue = prev.dueDate?.split("T")[0] ?? "";
      const newDue = body.dueDate === null ? "" : (body.dueDate?.split("T")[0] ?? "");
      if (oldDue !== newDue) {
        changes.push({ field: "dueDate", oldValue: oldDue, newValue: newDue });
      }
    }

    if (changes.length > 0) {
      this.recordHistory(
        user.organizationId,
        caseId,
        user.id,
        actorName,
        "case_updated",
        undefined,
        changes,
      );
    }
  }

  private recordHistory(
    organizationId: string,
    caseId: string,
    actorId: string,
    actorName: string,
    action: CaseHistoryAction,
    details?: string,
    changes?: CaseHistoryChange[],
  ): void {
    const body: CreateCaseHistoryBody = {
      organizationId,
      caseId,
      actorId,
      actorName,
      action,
      details,
      changes,
    };
    this.callCasesService<CaseHistoryEntryResponse>(organizationId, {
      method: "post",
      path: `/cases/${caseId}/history`,
      body,
    }).catch(() => {
      /* best-effort: don't fail the main operation if history recording fails */
    });
  }

  private toCaseCustomerRef(c: CustomerResponse): CaseCustomerRef {
    return {
      id: c.id,
      displayName: c.displayName,
      kind: c.kind,
      email: c.email,
      phone: c.phone,
      mobile: c.mobile,
      address: c.address,
      sites: c.sites,
    };
  }

  private resolveInterventionAddress(
    customer: CustomerResponse | undefined,
    interventionSiteId: string | undefined,
  ) {
    if (!customer || !interventionSiteId) return undefined;
    const site = customer.sites?.find((s) => s.id === interventionSiteId);
    return site?.address;
  }

  private async enrichCaseSummaries(
    user: AuthUser,
    rows: CaseSummaryResponse[],
  ): Promise<CaseSummaryResponse[]> {
    const ids = [...new Set(rows.map((r) => r.customerId).filter(Boolean))] as string[];
    if (ids.length === 0) return rows;
    const customers = await this.customersGateway.listCustomersByIds(user, ids);
    const map = new Map(customers.map((c) => [c.id, c]));
    return rows.map((r) => {
      const c = r.customerId ? map.get(r.customerId) : undefined;
      const interventionAddress = this.resolveInterventionAddress(c, r.interventionSiteId);
      return {
        ...r,
        customer: c ? this.toCaseCustomerRef(c) : undefined,
        interventionAddress,
      };
    });
  }

  private async enrichCaseResponse(user: AuthUser, row: CaseResponse): Promise<CaseResponse> {
    if (!row.customerId) return { ...row, customer: undefined };
    try {
      const c = await this.customersGateway.getCustomer(user, row.customerId);
      const interventionAddress = this.resolveInterventionAddress(c, row.interventionSiteId);
      return {
        ...row,
        customer: this.toCaseCustomerRef(c),
        interventionAddress,
      };
    } catch {
      return { ...row, customer: undefined };
    }
  }

  private async resolveCaseAssigneesForWrite(
    organizationId: string,
    assigneeIds: string[],
  ): Promise<CaseAssignee[]> {
    const ids = [...new Set(assigneeIds.map((id) => id.trim()).filter(Boolean))];
    const assignees: CaseAssignee[] = [];
    for (const id of ids) {
      const user = await this.callUsersService<UserResponse>(organizationId, {
        method: "get",
        path: `/users/${id}`,
      });
      if (user.organizationId !== organizationId) {
        throw new ForbiddenException(
          "Un utilisateur assigné n'appartient pas à cette organisation",
        );
      }
      assignees.push({ userId: id, name: user.name?.trim() || user.email });
    }
    return assignees;
  }

  private callUsersService<T>(
    organizationId: string,
    params: {
      method: "get" | "post" | "patch" | "put" | "delete";
      path: string;
      body?: object;
      query?: Record<string, unknown>;
      validateResponseScope?: boolean;
    },
  ): Promise<T> {
    return this.scopedHttp.request<T>({
      baseUrl: USERS_URL,
      organizationId,
      errorLabel: "Users service error",
      method: params.method,
      path: params.path,
      body: params.body,
      query: params.query,
      validateResponseScope: params.validateResponseScope,
    });
  }

  private callCasesService<T>(
    organizationId: string,
    params: {
      method: "get" | "post" | "patch" | "put" | "delete";
      path: string;
      body?: object;
      query?: Record<string, unknown>;
      validateResponseScope?: boolean;
    },
  ): Promise<T> {
    return this.scopedHttp.request<T>({
      baseUrl: CASES_URL,
      organizationId,
      errorLabel: "Cases service error",
      method: params.method,
      path: params.path,
      body: params.body,
      query: params.query,
      validateResponseScope: params.validateResponseScope,
    });
  }
}
